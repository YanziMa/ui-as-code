/**
 * Scroll Utilities: Smooth scrolling, scroll progress tracking, scroll spy,
 * parallax effects, sticky element management, infinite scroll anchors,
 * and scroll-linked animations.
 */

// --- Types ---

export interface ScrollPosition {
  x: number;
  y: number;
  direction: "up" | "down" | "none";
  /** Scroll progress as ratio (0-1) */
  progress: number;
}

export interface ScrollToOptions {
  /** Target element or pixel Y position */
  target?: HTMLElement | number;
  /** Duration in ms (default: 500) */
  duration?: number;
  /** Easing function name */
  easing?: "linear" | "easeInQuad" | "easeOutQuad" | "easeInOutCubic" | "easeOutExpo";
  /** Offset from top in px (default: 0) */
  offset?: number;
  /** Callback when complete */
  onComplete?: () => void;
  /** Callback on each frame with current position */
  onProgress?: (y: number) => void;
}

export interface ScrollSpyOptions {
  /** Elements to spy on */
  targets: HTMLElement[];
  /** Offset from top to trigger (px) */
  offset?: number;
  /** Class added to active target */
  activeClass?: string;
  /** Callback when active section changes */
  onChange?: (activeEl: HTMLElement, index: number) => void;
}

export interface ParallaxConfig {
  /** Element to apply parallax effect to */
  element: HTMLElement;
  /** Speed multiplier (0-1 for slower, >1 for faster) */
  speed: number;
  /** Direction of movement ("up" | "down") */
  direction?: "up" | "down";
  /** Only apply within viewport range? */
  clamp?: boolean;
}

export interface ScrollSpyInstance {
  /** Get currently active target index */
  getActiveIndex(): number;
  /** Get all target elements */
  getTargets(): HTMLElement[];
  /** Manually set active target */
  setActive(index: number): void;
  /** Refresh target positions (call after DOM changes) */
  refresh(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Easing Functions ---

const easings: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
};

// --- Smooth Scroll ---

/**
 * Smoothly scroll to an element or Y position.
 *
 * @example
 * scrollTo({ target: document.getElementById("section3"), offset: 80 })
 */
export function scrollTo(options: ScrollToOptions): Promise<void> {
  return new Promise((resolve) => {
    const {
      target = 0,
      duration = 500,
      easing = "easeOutQuad",
      offset = 0,
      onComplete,
      onProgress,
    } = options;

    const startY = window.scrollY || window.pageYOffset || 0;
    const targetY = typeof target === "number"
      ? target
      : (target.getBoundingClientRect().top + startY - offset);
    const distance = targetY - startY;

    // If already at target or no movement needed
    if (Math.abs(distance) < 1) {
      onComplete?.();
      resolve();
      return;
    }

    const easingFn = easings[easing] ?? easings.easeOutQuad;
    let startTime: number | null = null;

    function step(timestamp: number): void {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      const currentY = startY + distance * easedProgress;
      window.scrollTo(0, currentY);

      onProgress?.(currentY);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        onComplete?.();
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

/** Shorthand: smooth scroll to top of page */
export function scrollToTop(duration = 300): Promise<void> {
  return scrollTo({ target: 0, duration });
}

/** Shorthand: smooth scroll to bottom of page */
export function scrollToBottom(duration = 500): Promise<void> {
  return scrollTo({
    target: document.documentElement.scrollHeight - window.innerHeight,
    duration,
  });
}

/** Shorthand: smooth scroll to element */
export function scrollIntoView(el: HTMLElement, options?: Partial<ScrollToOptions>): Promise<void> {
  return scrollTo({ target: el, ...options });
}

// --- Scroll Position Tracking ---

let scrollListeners = new Set<(pos: ScrollPosition) => void>();
let lastScrollY = 0;
let rafId: number | null = null;
let scrollTrackingActive = false;

function broadcastScroll(): void {
  const y = window.scrollY || window.pageYOffset || 0;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const direction = y > lastScrollY ? "down" : y < lastScrollY ? "up" : "none";
  lastScrollY = y;

  const pos: ScrollPosition = {
    x: window.scrollX || window.pageXOffset || 0,
    y,
    direction,
    progress: maxScroll > 0 ? y / maxScroll : 0,
  };

  for (const listener of scrollListeners) {
    try { listener(pos); } catch { /* ignore */ }
  }

  rafId = null;
}

/** Subscribe to scroll position changes (throttled via RAF) */
export function onScroll(listener: (pos: ScrollPosition) => void): () => void {
  scrollListeners.add(listener);

  if (!scrollTrackingActive) {
    scrollTrackingActive = true;
    window.addEventListener("scroll", () => {
      if (!rafId) {
        rafId = requestAnimationFrame(broadcastScroll);
      }
    }, { passive: true });
  }

  // Send initial position
  listener({
    x: window.scrollX || 0,
    y: window.scrollY || 0,
    direction: "none",
    progress: 0,
  });

  return () => {
    scrollListeners.delete(listener);
    if (scrollListeners.size === 0) {
      scrollTrackingActive = false;
      window.removeEventListener("scroll", () => {});
    }
  };
}

/** Check if an element is visible in the viewport */
export function isInViewport(el: HTMLElement, margin = 0): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.top <= (window.innerHeight || document.documentElement.clientHeight) - margin &&
    rect.bottom >= margin &&
    rect.left <= (window.innerWidth || document.documentElement.clientWidth) - margin &&
    rect.right >= margin
  );
}

/** Get how much of an element is visible as a ratio (0-1) */
export function getVisibilityRatio(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;

  if (rect.bottom <= 0 || rect.top >= viewHeight) return 0;
  if (rect.top >= 0 && rect.bottom <= viewHeight) return 1;

  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(viewHeight, rect.bottom);
  return (visibleBottom - visibleTop) / rect.height;
}

/** Get the scroll percentage of an element relative to the viewport (0=top just entered, 1=bottom just left) */
export function getScrollProgress(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const viewHeight = window.innerHeight || document.documentElement.clientHeight;

  if (rect.top >= viewHeight) return 0; // Below viewport
  if (rect.bottom <= 0) return 1; // Above viewport

  return 1 - (rect.top + rect.height) / (viewHeight + rect.height);
}

// --- Scroll Spy ---

export function createScrollSpy(options: ScrollSpyOptions): ScrollSpyInstance {
  const {
    targets,
    offset = 100,
    activeClass = "spy-active",
    onChange,
  } = options;

  let activeIndex = -1;
  let destroyed = false;
  const positions: { top: number; bottom: number }[] = [];

  function updatePositions(): void {
    positions.length = 0;
    const scrollTop = window.scrollY || 0;
    for (const t of targets) {
      const rect = t.getBoundingClientRect();
      positions.push({
        top: rect.top + scrollTop,
        bottom: rect.bottom + scrollTop,
      });
    }
  }

  function checkActive(): void {
    const scrollY = window.scrollY || 0;
    let newActive = -1;

    for (let i = positions.length - 1; i >= 0; i--) {
      if (scrollY >= positions[i]!.top - offset - 50) {
        newActive = i;
        break;
      }
    }

    if (newActive !== activeIndex && newActive >= 0) {
      // Remove old active class
      if (activeIndex >= 0 && targets[activeIndex]) {
        targets[activeIndex]!.classList.remove(activeClass);
      }

      activeIndex = newActive;
      targets[activeIndex]!.classList.add(activeClass);
      onChange?.(targets[activeIndex]!, activeIndex);
    }
  }

  // Initial setup
  updatePositions();

  const cleanup = onScroll(() => {
    if (destroyed) return;
    checkActive();
  });

  return {
    getActiveIndex() { return activeIndex; },
    getTargets() { return [...targets]; },
    setActive(index: number): void {
      if (index < 0 || index >= targets.length) return;
      if (activeIndex >= 0 && targets[activeIndex]) {
        targets[activeIndex]!.classList.remove(activeClass);
      }
      activeIndex = index;
      targets[index]!.classList.add(activeClass);
      onChange?.(targets[index]!, index);
    },
    refresh(): void {
      updatePositions();
      checkActive();
    },
    destroy(): void {
      destroyed = true;
      cleanup();
      for (const t of targets) {
        t.classList.remove(activeClass);
      }
    },
  };
}

// --- Parallax ---

const parallaxInstances = new Set<{ element: HTMLElement; config: ParallaxConfig; originalTransform: string }>();

function runParallaxFrame(scrollY: number): void {
  for (const instance of parallaxInstances) {
    const { element, config } = instance;
    const rect = element.getBoundingClientRect();
    const viewHeight = window.innerHeight;

    // Only apply when element is near viewport
    if (rect.bottom < -viewHeight || rect.top > viewHeight * 2) continue;

    const elementCenter = rect.top + rect.height / 2;
    const viewportCenter = viewHeight / 2;
    const offset = (elementCenter - viewportCenter) * config.speed;
    const direction = config.direction === "up" ? -1 : 1;

    let translateY = offset * direction;
    if (config.clamp) {
      translateY = Math.max(-rect.height * 0.5, Math.min(rect.height * 0.5, translateY));
    }

    element.style.transform = `${instance.originalTransform} translateY(${translateY}px)`;
  }
}

let parallaxRafId: number | null = null;

/** Apply a parallax scroll effect to an element */
export function addParallax(config: ParallaxConfig): () => void {
  const instance = {
    element: config.element,
    config,
    originalTransform: config.element.style.transform ?? "",
  };
  parallaxInstances.add(instance);

  if (parallaxInstances.size === 1) {
    window.addEventListener("scroll", () => {
      if (!parallaxRafId) {
        parallaxRafId = requestAnimationFrame(() => {
          runParallaxFrame(window.scrollY || 0);
          parallaxRafId = null;
        });
      }
    }, { passive: true });
  }

  // Apply initial state
  runParallaxFrame(window.scrollY || 0);

  return () => {
    parallaxInstances.delete(instance);
    instance.element.style.transform = instance.originalTransform;
  };
}

// --- Sticky Management ---

interface StickyInstance {
  element: HTMLElement;
  placeholder: HTMLDivElement;
  topOffset: number;
  className: string;
  originalStyles: { position: string; top: string; width: string; zIndex: string };
  isSticky: boolean;
}

const stickyInstances = new Set<StickyInstance>();

function checkStickyPositions(): void {
  const scrollY = window.scrollY || 0;

  for (const inst of stickyInstances) {
    const shouldBeSticky = scrollY >= inst.topOffset;

    if (shouldBeSticky && !inst.isSticky) {
      inst.isSticky = true;
      inst.placeholder.style.display = "block";
      inst.element.style.position = "fixed";
      inst.element.style.top = "0";
      inst.element.style.width = `${inst.placeholder.offsetWidth}px`;
      inst.element.style.zIndex = "1000";
      inst.element.classList.add(inst.className);
    } else if (!shouldBeSticky && inst.isSticky) {
      inst.isSticky = false;
      inst.placeholder.style.display = "none";
      inst.element.style.position = inst.originalStyles.position;
      inst.element.style.top = inst.originalStyles.top;
      inst.element.style.width = inst.originalStyles.width;
      inst.element.style.zIndex = inst.originalStyles.zIndex;
      inst.element.classList.remove(inst.className);
    }
  }
}

let stickyRafId: number | null = null;

/**
 * Make an element stick to the top when scrolled past.
 * Returns an unsubscribe function.
 */
export function makeSticky(
  element: HTMLElement,
  options?: { topOffset?: number; stickyClass?: string },
): () => void {
  const topOffset = options?.topOffset ?? element.getBoundingClientRect().top + (window.scrollY || 0);
  const stickyClass = options?.stickyClass ?? "is-sticky";

  const placeholder = document.createElement("div");
  placeholder.style.display = "none";
  placeholder.style.width = `${element.offsetWidth}px`;
  placeholder.style.height = `${element.offsetHeight}px`;
  element.parentNode?.insertBefore(placeholder, element);

  const inst: StickyInstance = {
    element,
    placeholder,
    topOffset,
    className: stickyClass,
    originalStyles: {
      position: element.style.position,
      top: element.style.top,
      width: element.style.width,
      zIndex: element.style.zIndex,
    },
    isSticky: false,
  };

  stickyInstances.add(inst);

  if (stickyInstances.size === 1) {
    window.addEventListener("scroll", () => {
      if (!stickyRafId) {
        stickyRafId = requestAnimationFrame(() => {
          checkStickyPositions();
          stickyRafId = null;
        });
      }
    }, { passive: true });
  }

  checkStickyPositions(); // Initial check

  return () => {
    stickyInstances.delete(inst);
    inst.element.style.position = inst.originalStyles.position;
    inst.element.style.top = inst.originalStyles.top;
    inst.element.style.width = inst.originalStyles.width;
    inst.element.style.zIndex = inst.originalStyles.zIndex;
    inst.element.classList.remove(inst.className);
    inst.placeholder.remove();
  };
}

// --- Scroll Progress Bar ---

let progressBar: HTMLElement | null = null;

/** Show a thin progress bar at the top of the page indicating scroll position */
export function showScrollProgressBar(options?: {
  color?: string;
  height?: number;
  position?: "top" | "bottom";
  zIndex?: number;
}): HTMLElement {
  if (progressBar) {
    progressBar.remove();
    progressBar = null;
  }

  const bar = document.createElement("div");
  bar.style.cssText = `
    position: fixed;
    ${options?.position ?? "top"}: 0;
    left: 0;
    height: ${(options?.height ?? 3)}px;
    background: ${options?.color ?? "#6366f1"};
    width: 0%;
    z-index: ${options?.zIndex ?? 9999};
    transition: width 0.1s ease-out;
    pointer-events: none;
  `;
  document.body.appendChild(bar);
  progressBar = bar;

  onScroll((pos) => {
    if (progressBar) {
      progressBar.style.width = `${pos.progress * 100}%`;
    }
  });

  return bar;
}

/** Remove the scroll progress bar */
export function hideScrollProgressBar(): void {
  if (progressBar) {
    progressBar.remove();
    progressBar = null;
  }
}
