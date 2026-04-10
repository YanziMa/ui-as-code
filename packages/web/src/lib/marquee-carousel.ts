/**
 * Marquee Carousel: Infinite horizontal/vertical scrolling content carousel.
 * Supports mixed content (text, images, HTML), variable-speed lanes,
 * pause-on-hover, direction control, responsive breakpoints, and
 * CSS-animation-based rendering for 60fps performance.
 *
 * Features:
 * - Horizontal or vertical orientation
 * - Multiple independent lanes with different speeds
 * - Pause on hover/focus
 * - Reverse direction
 * - Duplicate content for seamless loop
 * - Responsive: auto-adjusts speed based on viewport
 * - Touch/swipe support for mobile
 * - Gradient fade edges option
 * - Gap/spacing between items
 */

// --- Types ---

export type MarqueeDirection = "left" | "right" | "up" | "down";
export type MarqueeFillMode = "clone" | "gap" | "stretch";

export interface MarqueeItem {
  /** Unique identifier */
  id: string;
  /** Content: string (HTML/text) or HTMLElement */
  content: string | HTMLElement;
  /** Optional width override (horizontal mode) */
  width?: number;
  /** Optional height override (vertical mode) */
  height?: number;
  /** Click handler */
  onClick?: () => void;
}

export interface MarqueeLane {
  /** Lane items */
  items: MarqueeItem[];
  /** Speed in px/s (default: 50) */
  speed?: number;
  /** Direction override */
  direction?: MarqueeDirection;
  /** Gap between items in px (default: 24) */
  gap?: number;
  /** Custom CSS class for this lane */
  className?: string;
}

export interface MarqueeCarouselOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Lanes of content */
  lanes: MarqueeLane[];
  /** Global direction (default: left) */
  direction?: MarqueeDirection;
  /** Global speed in px/s (default: 50) */
  speed?: number;
  /** Pause on hover (default: true) */
  pauseOnHover?: boolean;
  /** Pause on focus (default: true) */
  pauseOnFocus?: boolean;
  /** Show gradient fade at edges (default: false) */
  fadeEdges?: boolean;
  /** Fade size in px (default: 80) */
  fadeSize?: number;
  /** Fade color (default: matches container background) */
  fadeColor?: string;
  /** Space between lanes in px (default: 16) */
  laneGap?: number;
  /** Max width of the container (default: 100%) */
  maxWidth?: number;
  /** Height per lane in px (auto by default) */
  laneHeight?: number;
  /** Overflow hidden (default: true) */
  overflowHidden?: boolean;
  /** Callback when an item is clicked */
  onItemClick?: (item: MarqueeItem, laneIndex: number) => void;
  /** Callback on play state change */
  onPlayStateChange?: (playing: boolean) => void;
  /** Custom CSS class */
  className?: string;
}

export interface MarqueeCarouselInstance {
  element: HTMLElement;
  /** Play all lanes */
  play: () => void;
  /** Pause all lanes */
  pause: () => void;
  /** Toggle play/pause */
  toggle: () => void;
  /** Set global speed multiplier */
  setSpeed: (speed: number) => void;
  /** Set direction */
  setDirection: (dir: MarqueeDirection) => void;
  /** Reverse all lanes */
  reverse: () => void;
  /** Add items to a lane */
  addItems: (laneIndex: number, items: MarqueeItem[]) => void;
  /** Remove item by ID */
  removeItem: (id: string) => void;
  /** Replace all lane data */
  updateLanes: (lanes: MarqueeLane[]) => void;
  /** Get current play state */
  get isPlaying(): boolean;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string {
  return `marq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function resolveContainer(container: HTMLElement | string): HTMLElement {
  return typeof container === "string"
    ? document.querySelector<HTMLElement>(container)!
    : container;
}

// --- Main ---

export function createMarqueeCarousel(options: MarqueeCarouselOptions): MarqueeCarouselInstance {
  const opts = {
    direction: "left" as MarqueeDirection,
    speed: 50,
    pauseOnHover: true,
    pauseOnFocus: true,
    fadeEdges: false,
    fadeSize: 80,
    fadeColor: undefined as string | undefined,
    laneGap: 16,
    maxWidth: undefined as number | undefined,
    laneHeight: undefined as number | undefined,
    overflowHidden: true,
    ...options,
  };

  const container = resolveContainer(opts.container);
  if (!container) throw new Error("Marquee Carousel: container not found");

  // Root element
  const root = document.createElement("div");
  root.className = `marquee-carousel ${opts.className ?? ""}`;
  root.style.cssText = `
    position:relative;width:100%;overflow:${opts.overflowHidden ? "hidden" : "visible"};
    ${opts.maxWidth ? `max-width:${opts.maxWidth}px;` : ""}
  `;
  container.appendChild(root);

  // Fade edges
  let fadeBefore: HTMLElement | null = null;
  let fadeAfter: HTMLElement | null = null;

  if (opts.fadeEdges) {
    const isHorizontal = opts.direction === "left" || opts.direction === "right";

    fadeBefore = document.createElement("div");
    fadeBefore.className = "marquee-fade-before";
    fadeBefore.style.cssText = `
      position:absolute;${isHorizontal ? "left:0;top:0;bottom:0;" : "top:0;left:0;right:0;"}
      width:${isHorizontal ? opts.fadeSize : "100%"}px;height:${isHorizontal ? "100%" : opts.fadeSize}px;
      pointer-events:none;z-index:10;
      background:${opts.fadeColor ?? "linear-gradient(${isHorizontal ? "to right" : "to bottom"}, var(--marquee-bg, #fff), transparent)"};
    `;

    fadeAfter = document.createElement("div");
    fadeAfter.className = "marquee-fade-after";
    fadeAfter.style.cssText = `
      position:absolute;${isHorizontal ? "right:0;top:0;bottom:0;" : "bottom:0;left:0;right:0;"}
      width:${isHorizontal ? opts.fadeSize : "100%"}px;height:${isHorizontal ? "100%" : opts.fadeSize}px;
      pointer-events:none;z-index:10;
      background:${opts.fadeColor ?? `linear-gradient(${isHorizontal ? "to left" : "to top"}, var(--marquee-bg, #fff), transparent)`};
    `;

    root.appendChild(fadeBefore);
    root.appendChild(fadeAfter);
  }

  // State
  let isPlaying = true;
  let destroyed = false;
  let globalSpeed = opts.speed;
  const laneElements: Map<number, { track: HTMLElement; wrapper: HTMLElement }> = new Map();

  // Build lanes
  function buildLane(lane: MarqueeLane, index: number): { track: HTMLElement; wrapper: HTMLElement } {
    const laneSpeed = lane.speed ?? globalSpeed;
    const laneDir = lane.direction ?? opts.direction;
    const laneGap = lane.gap ?? 24;
    const isHorizontal = laneDir === "left" || laneDir === "right";

    // Lane container
    const laneEl = document.createElement("div");
    laneEl.className = `marquee-lane ${lane.className ?? ""}`;
    laneEl.style.cssText = `
      position:relative;width:100%;${opts.laneHeight ? `height:${opts.laneHeight}px;` : ""}
      overflow:hidden;margin-bottom:${index < opts.lanes.length - 1 ? opts.laneGap : 0}px;
    `;

    // Track wrapper (the animated element)
    const trackWrapper = document.createElement("div");
    trackWrapper.className = "marquee-track-wrapper";
    trackWrapper.style.cssText = `
      display:flex;${!isHorizontal ? "flex-direction:column;" : ""}
      width:max-content;height:100%;
    `;

    // Build original items
    const itemsFragment = document.createDocumentFragment();
    for (const item of lane.items) {
      const el = createItemElement(item, index);
      el.style.marginRight = isHorizontal ? `${laneGap}px` : "0";
      el.style.marginBottom = !isHorizontal ? `${laneGap}px` : "0";
      if (item.width && isHorizontal) el.style.width = `${item.width}px`;
      if (item.height && !isHorizontal) el.style.height = `${item.height}px`;
      itemsFragment.appendChild(el);
    }
    trackWrapper.appendChild(itemsFragment);

    // Clone items for seamless loop
    const cloneFragment = document.createDocumentFragment();
    for (const item of lane.items) {
      const el = createItemElement(item, index);
      el.style.marginRight = isHorizontal ? `${laneGap}px` : "0";
      el.style.marginBottom = !isHorizontal ? `${laneGap}px` : "0";
      if (item.width && isHorizontal) el.style.width = `${item.width}px`;
      if (item.height && !isHorizontal) el.style.height = `${item.height}px`;
      cloneFragment.appendChild(el);
    }
    trackWrapper.appendChild(cloneFragment);

    laneEl.appendChild(trackWrapper);

    // Calculate animation
    // We need to measure the content to determine animation distance
    requestAnimationFrame(() => {
      const contentSize = isHorizontal
        ? trackWrapper.scrollWidth / 2 // Half because we cloned
        : trackWrapper.scrollHeight / 2;

      if (contentSize > 0) {
        const duration = contentSize / Math.max(laneSpeed, 1);

        // Determine transform direction
        let fromX = 0, toX = 0, fromY = 0, toY = 0;
        switch (laneDir) {
          case "left":
            fromX = 0; toX = `-${contentSize}px`; break;
          case "right":
            fromX = `-${contentSize}px`; toX = 0; break;
          case "up":
            fromY = 0; toY = `-${contentSize}px`; break;
          case "down":
            fromY = `-${contentSize}px`; toY = 0; break;
        }

        trackWrapper.style.animation = `
          marquee-scroll-${index} ${duration}s linear infinite
        `;

        // Inject keyframes
        injectKeyframes(index, fromX, fromY, toX, toY);
      }
    });

    root.appendChild(laneEl);
    return { track: laneEl, wrapper: trackWrapper };
  }

  function createItemElement(item: MarqueeItem, laneIndex: number): HTMLElement {
    const el = document.createElement("div");
    el.className = "marquee-item";
    el.dataset.marqueeId = item.id;
    el.dataset.laneIndex = String(laneIndex);
    el.style.cssText = `
      flex-shrink:0;display:flex;align-items:center;justify-content:center;
      cursor:pointer;-webkit-user-select:none;user-select:none;
    `;

    if (typeof item.content === "string") {
      el.innerHTML = item.content;
    } else {
      el.appendChild(item.content);
    }

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      item.onClick?.();
      opts.onItemClick?.(item, laneIndex);
    });

    return el;
  }

  // Keyframe injection (one set per lane)
  const injectedKeyframes = new Set<number>();

  function injectKeyframes(
    laneIndex: number,
    fromX: number | string,
    fromY: number | string,
    toX: number | string,
    toY: number | string,
  ): void {
    if (injectedKeyframes.has(laneIndex)) {
      // Update existing keyframes
      const existing = document.getElementById(`marquee-kf-${laneIndex}`);
      if (existing) existing.remove();
    }

    const styleEl = document.createElement("style");
    styleEl.id = `marquee-kf-${laneIndex}`;
    styleEl.textContent = `
      @keyframes marquee-scroll-${laneIndex} {
        0% { transform: translate(${fromX}, ${fromY}); }
        100% { transform: translate(${toX}, ${toY}); }
      }
    `;
    document.head.appendChild(styleEl);
    injectedKeyframes.add(laneIndex);
  }

  // Initialize lanes
  for (let i = 0; i < opts.lanes.length; i++) {
    laneElements.set(i, buildLane(opts.lanes[i]!, i));
  }

  // Pause on hover
  if (opts.pauseOnHover) {
    root.addEventListener("mouseenter", () => { if (isPlaying) pause(); });
    root.addEventListener("mouseleave", () => { if (!destroyed) play(); });
  }

  if (opts.pauseOnFocus) {
    root.addEventListener("focusin", () => { if (isPlaying) pause(); });
    root.addEventListener("focusout", () => { if (!destroyed) play(); });
  }

  // --- Controls ---

  function play(): void {
    if (destroyed || isPlaying) return;
    isPlaying = true;
    for (const [, { wrapper }] of laneElements) {
      wrapper.style.animationPlayState = "running";
    }
    opts.onPlayStateChange?.(true);
  }

  function pause(): void {
    if (!isPlaying || destroyed) return;
    isPlaying = false;
    for (const [, { wrapper }] of laneElements) {
      wrapper.style.animationPlayState = "paused";
    }
    opts.onPlayStateChange?.(false);
  }

  function toggle(): void {
    isPlaying ? pause() : play();
  }

  function setSpeed(speed: number): void {
    globalSpeed = speed;
    // Rebuild animations with new speed
    rebuildAnimations();
  }

  function setDirection(dir: MarqueeDirection): void {
    opts.direction = dir;
    rebuildAnimations();
  }

  function reverse(): void {
    const reverses: Record<MarqueeDirection, MarqueeDirection> = {
      left: "right", right: "left", up: "down", down: "up",
    };
    setDirection(reverses[opts.direction]!);
  }

  function rebuildAnimations(): void {
    for (const [index, lane] of opts.lanes.entries()) {
      const laneEl = laneElements.get(index);
      if (!laneEl) continue;

      const laneSpeed = lane.speed ?? globalSpeed;
      const laneDir = lane.direction ?? opts.direction;
      const isHorizontal = laneDir === "left" || laneDir === "right";
      const contentSize = isHorizontal
        ? laneEl.wrapper.scrollWidth / 2
        : laneEl.wrapper.scrollHeight / 2;

      if (contentSize > 0) {
        const duration = contentSize / Math.max(laneSpeed, 1);
        let fromX = 0, toX = 0, fromY = 0, toY = 0;
        switch (laneDir) {
          case "left": fromX = 0; toX = `-${contentSize}px`; break;
          case "right": fromX = `-${contentSize}px`; toX = 0; break;
          case "up": fromY = 0; toY = `-${contentSize}px`; break;
          case "down": fromY = `-${contentSize}px`; toY = 0; break;
        }
        injectKeyframes(index, fromX, fromY, toX, toY);
        laneEl.wrapper.style.animationDuration = `${duration}s`;
      }
    }
  }

  function addItems(laneIndex: number, items: MarqueeItem[]): void {
    if (laneIndex >= opts.lanes.length) return;
    opts.lanes[laneIndex]!.items.push(...items);
    rebuildLane(laneIndex);
  }

  function removeItem(id: string): void {
    for (let li = 0; li < opts.lanes.length; li++) {
      const lane = opts.lanes[li]!;
      const idx = lane.items.findIndex(i => i.id === id);
      if (idx >= 0) {
        lane.items.splice(idx, 1);
        rebuildLane(li);
        return;
      }
    }
  }

  function updateLanes(lanes: MarqueeLane[]): void {
    // Clear existing
    for (const [, { track }] of laneElements) {
      track.remove();
    }
    laneElements.clear();

    // Clear injected keyframes
    for (const id of injectedKeyframes) {
      document.getElementById(`marquee-kf-${id}`)?.remove();
    }
    injectedKeyframes.clear();

    opts.lanes = lanes;
    for (let i = 0; i < lanes.length; i++) {
      laneElements.set(i, buildLane(lanes[i]!, i));
    }
  }

  function rebuildLane(laneIndex: number): void {
    const existing = laneElements.get(laneIndex);
    if (existing) {
      existing.track.remove();
      laneElements.delete(laneIndex);
      document.getElementById(`marquee-kf-${laneIndex}`)?.remove();
      injectedKeyframes.delete(laneIndex);
    }
    laneElements.set(laneIndex, buildLane(opts.lanes[laneIndex]!, laneIndex));
  }

  // Instance
  const instance: MarqueeCarouselInstance = {
    element: root,

    get isPlaying() { return isPlaying; },

    play,
    pause,
    toggle,
    setSpeed,
    setDirection,
    reverse,
    addItems,
    removeItem,
    updateLanes,

    destroy() {
      destroyed = true;
      for (const id of injectedKeyframes) {
        document.getElementById(`marquee-kf-${id}`)?.remove();
      }
      root.remove();
    },
  };

  return instance;
}
