/**
 * Pull to Refresh: Mobile-style pull-down-to-refresh gesture with
 * threshold detection, animation states (pulling → ready → refreshing → done),
 * custom icons, distance indicator, momentum physics, and callback.
 */

// --- Types ---

export interface PullToRefreshOptions {
  /** Container element (scrollable area) */
  container: HTMLElement | string;
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void> | void;
  /** Pull distance threshold to trigger refresh (px) */
  threshold?: number;
  /** Maximum pull distance (px) */
  maxPullDistance?: number;
  /** Head area height for the indicator (px) */
  headHeight?: number;
  /** Show distance text/indicator? */
  showDistance?: boolean;
  /** Custom loading spinner renderer */
  renderSpinner?: () => HTMLElement;
  /** Custom "ready" state icon */
  renderReadyIcon?: () => HTMLElement;
  /** Custom "pulling" state indicator */
  renderPullIndicator?: (distance: number, threshold: number) => HTMLElement;
  /** Color of the indicator */
  color?: string;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Enable resistance (slowing down as you pull further) */
  resistance?: boolean;
  /** Resistance factor (0-1, lower = more resistance) */
  resistanceFactor?: number;
  /** Custom CSS class */
  className?: string;
}

export interface PullToRefreshInstance {
  element: HTMLElement;
  destroy: () => void;
}

// --- Main Factory ---

export function createPullToRefresh(options: PullToRefreshOptions): PullToRefreshInstance {
  const opts = {
    threshold: options.threshold ?? 70,
    maxPullDistance: options.maxPullDistance ?? 120,
    headHeight: options.headHeight ?? 50,
    showDistance: options.showDistance ?? true,
    color: options.color ?? "#4338ca",
    animationDuration: options.animationDuration ?? 300,
    resistance: options.resistance ?? true,
    resistanceFactor: options.resistanceFactor ?? 0.5,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("PullToRefresh: container not found");

  // Ensure container has overflow handling
  const originalOverflow = getComputedStyle(container).overflow;
  if (originalOverflow === "visible") {
    container.style.overflow = "hidden";
  }

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `ptr-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    position:relative;overflow:hidden;width:100%;min-height:100%;
    touch-action:pan-y;-webkit-overflow-scrolling:touch;
  `;

  // Move all children into wrapper
  while (container.firstChild) {
    wrapper.appendChild(container.firstChild);
  }
  container.appendChild(wrapper);

  // Create head (indicator area)
  const head = document.createElement("div");
  head.className = "ptr-head";
  head.style.cssText = `
    position:absolute;top:0;left:0;right:0;height:${opts.headHeight}px;
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;transform:translateY(-100%);
    transition:transform ${opts.animationDuration}ms ease-out;
    z-index:10;pointer-events:none;
  `;

  // Spinner element
  let spinnerEl: HTMLElement | null = null;
  function createSpinner(): HTMLElement {
    if (opts.renderSpinner) return opts.renderSpinner();
    const el = document.createElement("div");
    el.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${opts.color}" stroke-width="2.5"><circle cx="12" cy="12" r="9" opacity="0.25"/><path d="M12 3a9 9 0 0 1 9 9" stroke-linecap="round"/></svg>`;
    el.style.animation = "ptr-spin 0.8s linear infinite";
    return el;
  }

  // Ready arrow
  function createReadyIcon(): HTMLElement {
    if (opts.renderReadyIcon) return opts.renderReadyIcon();
    const el = document.createElement("div");
    el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${opts.color}" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>`;
    el.style.transform = "rotate(180deg)";
    el.style.transition = "transform 0.2s ease";
    return el;
  }

  // Distance label
  let distanceLabel: HTMLSpanElement | null = null;
  if (opts.showDistance) {
    distanceLabel = document.createElement("span");
    distanceLabel.className = "ptr-distance";
    distanceLabel.style.cssText = `
      font-size:11px;color:#888;margin-left:8px;font-weight:500;
      min-width:28px;text-align:center;
    `;
  }

  head.appendChild(createSpinner());
  if (distanceLabel) head.appendChild(distanceLabel);
  wrapper.insertBefore(head, wrapper.firstChild);

  // State
  let startY = 0;
  let currentY = 0;
  let pulling = false;
  let refreshing = false;
  let destroyed = false;
  let touchId: number | null = null;

  function applyResistance(dist: number): number {
    if (!opts.resistance || dist <= opts.threshold) return dist;
    const excess = dist - opts.threshold;
    return opts.threshold + excess * opts.resistanceFactor;
  }

  function updateUI(pullDist: number): void {
    const dist = Math.min(applyResistance(pullDist), opts.maxPullDistance);
    const progress = Math.min(dist / opts.threshold, 1);

    // Transform the head
    if (dist > 0) {
      head.style.transform = `translateY(${Math.min(dist - opts.headHeight, 0)}px)`;
      head.style.opacity = String(Math.min(progress * 1.5, 1));
    } else {
      head.style.transform = "translateY(-100%)";
      head.style.opacity = "0";
    }

    // Update spinner rotation based on progress
    const spinner = head.querySelector(".ptr-spinner")?.parentElement;
    if (spinner && !refreshing) {
      (spinner as HTMLElement).style.transform = `rotate(${Math.min(progress * 270, 270)}deg)`;
    }

    // Distance text
    if (distanceLabel && dist > 5) {
      distanceLabel.textContent = dist > opts.threshold ? "Release" : `${Math.round(dist)}px`;
      distanceLabel.style.color = dist >= opts.threshold ? opts.color : "#888";
    }

    // Swap to ready icon when past threshold
    const spinnerContainer = head.children[0] as HTMLElement;
    if (progress >= 1 && !refreshing) {
      if (!spinnerContainer.dataset.ready) {
        spinnerContainer.dataset.ready = "1";
        spinnerContainer.innerHTML = "";
        spinnerContainer.appendChild(createReadyIcon());
      }
    } else if (progress < 1 && !refreshing) {
      if (spinnerContainer.dataset.ready) {
        delete spinnerContainer.dataset.ready;
        spinnerContainer.innerHTML = "";
        spinnerContainer.appendChild(createSpinner());
      }
    }
  }

  async function doRefresh(): void {
    refreshing = true;
    head.style.transform = `translateY(0)`;
    head.style.opacity = "1";

    // Reset to spinner
    const spinnerContainer = head.children[0] as HTMLElement;
    if (spinnerContainer.dataset.ready) {
      delete spinnerContainer.dataset.ready;
      spinnerContainer.innerHTML = "";
      spinnerContainer.appendChild(createSpinner());
    }
    if (distanceLabel) {
      distanceLabel.textContent = "Loading...";
      distanceLabel.style.color = opts.color;
    }

    try {
      await opts.onRefresh();
    } catch (e) {
      console.error("PullToRefresh: onRefresh error", e);
    }

    // Done animation
    refreshing = false;
    head.style.transition = `transform ${opts.animationDuration}ms ease-in, opacity ${opts.animationDuration}ms ease-in`;
    head.style.transform = "translateY(-100%)";
    head.style.opacity = "0";

    setTimeout(() => {
      head.style.transition = `transform ${opts.animationDuration}ms ease-out`;
    }, opts.animationDuration);
  }

  // Touch handlers
  function handleTouchStart(e: TouchEvent): void {
    if (refreshing || destroyed) return;
    if (wrapper.scrollTop > 0) return; // Only trigger at top

    const touch = e.changedTouches[0];
    if (!touch) return;
    touchId = touch.identifier;
    startY = touch.clientY;
    pulling = true;
    currentY = startY;
  }

  function handleTouchMove(e: TouchEvent): void {
    if (!pulling || destroyed) return;

    const touch = Array.from(e.changedTouches).find((t) => t.identifier === touchId);
    if (!touch) return;

    currentY = touch.clientY;
    const delta = currentY - startY;

    if (delta > 0) {
      e.preventDefault();
      updateUI(delta);
    }
  }

  async function handleTouchEnd(_e: TouchEvent): void {
    if (!pulling || destroyed) return;
    pulling = false;
    touchId = null;

    const dist = applyResistance(currentY - startY);

    if (dist >= opts.threshold && !refreshing) {
      await doRefresh();
    } else {
      // Snap back
      head.style.transition = `transform ${opts.animationDuration}ms ease-out, opacity ${opts.animationDuration}ms ease-out`;
      updateUI(0);
      setTimeout(() => { head.style.transition = `transform ${opts.animationDuration}ms ease-out`; }, opts.animationDuration);
    }

    startY = 0;
    currentY = 0;
  }

  // Mouse fallback (for desktop testing)
  let mouseDown = false;
  let mouseStartY = 0;

  function handleMouseDown(e: MouseEvent): void {
    if (refreshing || destroyed || wrapper.scrollTop > 0) return;
    mouseDown = true;
    mouseStartY = e.clientY;
    startY = e.clientY;
    currentY = e.clientY;
    pulling = true;
  }

  function handleMouseMove(e: MouseEvent): void {
    if (!mouseDown || !pulling) return;
    currentY = e.clientY;
    const delta = currentY - startY;
    if (delta > 0) {
      updateUI(delta);
    }
  }

  async function handleMouseUp(): void {
    if (!mouseDown) return;
    mouseDown = false;
    const dist = applyResistance(currentY - startY);
    if (dist >= opts.threshold && !refreshing) {
      await doRefresh();
    } else {
      head.style.transition = `transform ${opts.animationDuration}ms ease-out, opacity ${opts.animationDuration}ms ease-out`;
      updateUI(0);
    }
    pulling = false;
    startY = 0;
    currentY = 0;
  }

  // Bind events
  wrapper.addEventListener("touchstart", handleTouchStart, { passive: true });
  wrapper.addEventListener("touchmove", handleTouchMove, { passive: false });
  wrapper.addEventListener("touchend", handleTouchEnd);
  wrapper.addEventListener("touchcancel", handleTouchEnd);

  wrapper.addEventListener("mousedown", handleMouseDown);
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);

  // Inject spin keyframe
  if (!document.getElementById("ptr-styles")) {
    const style = document.createElement("style");
    style.id = "ptr-styles";
    style.textContent = "@keyframes ptr-spin{to{transform:rotate(360deg);}}";
    document.head.appendChild(style);
  }

  return {
    element: container,

    destroy() {
      destroyed = true;
      wrapper.removeEventListener("touchstart", handleTouchStart);
      wrapper.removeEventListener("touchmove", handleTouchMove);
      wrapper.removeEventListener("touchend", handleTouchEnd);
      wrapper.removeEventListener("touchcancel", handleTouchEnd);
      wrapper.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      head.remove();
      // Restore children
      while (wrapper.firstChild) {
        container.appendChild(wrapper.firstChild);
      }
      wrapper.remove();
      container.style.overflow = originalOverflow;
    },
  };
}
