/**
 * Scroll utilities: smooth scrolling, scroll position tracking, scroll spy,
 * infinite scroll, parallax, sticky positioning helpers, and scroll lock.
 */

// --- Types ---

export interface ScrollPosition {
  x: number;
  y: number;
  directionX: "left" | "right" | "none";
  directionY: "up" | "down" | "none";
  velocity: number; // pixels per second
  progress: number; // 0-1 for the scroll container
}

export interface ScrollSpyOptions {
  /** Elements to spy on */
  targets: HTMLElement[];
  /** Container to observe (default: window) */
  container?: HTMLElement | Window;
  /** Offset from top before marking as "active" */
  offset?: number;
  /** Class to add to active section */
  activeClass?: string;
  /** Callback when active section changes */
  onChange?: (target: HTMLElement | null, index: number) => void;
  /** Throttle interval ms (default: 100) */
  throttleMs?: number;
}

export interface InfiniteScrollOptions {
  /** Container element */
  container: HTMLElement;
  /** Callback to load more items */
  loadMore: () => Promise<void>;
  /** Distance from bottom to trigger load (px, default: 200) */
  threshold?: number;
  /** Whether loading is in progress (prevent duplicate triggers) */
  isLoading?: () => boolean;
  /** Whether there are more items to load */
  hasMore?: () => boolean;
  /** Root margin for intersection observer */
  rootMargin?: string;
}

export interface ParallaxOptions {
  /** Element to apply parallax effect to */
  element: HTMLElement;
  /** Speed factor: negative = moves opposite, positive = same direction (default: 0.5) */
  speed?: number;
  /** Container to measure scroll against (default: window) */
  container?: HTMLElement | Window;
  /** Only apply effect within viewport range? */
  disabled?: boolean;
}

export interface ScrollLockOptions {
  /** Lock horizontal scroll too? */
  lockHorizontal?: boolean;
  /** Reserve scrollbar width to prevent layout shift */
  reserveScrollBarGap?: boolean;
  /** Allow scroll within specific element(s) */
  allowScrollIn?: HTMLElement[];
}

// --- Basic Scroll Operations ---

/** Get current scroll position of an element or window */
export function getScrollPosition(target?: HTMLElement | Window): { x: number; y: number } {
  const el = target ?? window;
  if (el === window) {
    return { x: window.scrollX || window.pageXOffset, y: window.scrollY || window.pageYOffset };
  }
  const elem = el as HTMLElement;
  return { x: elem.scrollLeft, y: elem.scrollTop };
}

/** Set scroll position */
export function setScrollPosition(
  target: HTMLElement | Window,
  x: number,
  y: number,
  behavior: "auto" | "smooth" = "auto",
): void {
  if (target === window) {
    window.scrollTo({ left: x, top: y, behavior });
  } else {
    (target as HTMLElement).scrollTo({ left: x, top: y, behavior });
  }
}

/** Smooth scroll to a specific Y position */
export function scrollTo(
  y: number,
  options?: { target?: HTMLElement | Window; duration?: number },
): void {
  const target = options?.target ?? window;
  const duration = options?.duration ?? 500;

  if (duration === 0) {
    setScrollPosition(target, getScrollPosition(target).x, y);
    return;
  }

  const start = getScrollPosition(target);
  const startTime = performance.now();

  function step(currentTime: number): void {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);

    const currentY = start.y + (y - start.y) * eased;
    setScrollPosition(target, start.x, currentY);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/** Smooth scroll to an element */
export function scrollToElement(
  element: HTMLElement,
  options?: { offset?: number; target?: HTMLElement | Window; duration?: number; behavior?: "auto" | "smooth" },
): void {
  const offset = options?.offset ?? 0;
  const rect = element.getBoundingClientRect();
  const target = options?.target ?? window;

  let scrollTop: number;
  if (target === window) {
    scrollTop = rect.top + window.scrollY - offset;
  } else {
    const containerRect = (target as HTMLElement).getBoundingClientRect();
    scrollTop = (target as HTMLElement).scrollTop + rect.top - containerRect.top - offset;
  }

  if (options?.behavior === "smooth" || (!("behavior" in (options ?? {})) && !options?.duration)) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    scrollTo(scrollTop, { target, duration: options?.duration });
  }
}

/** Scroll to top of page/container */
export function scrollToTop(options?: { target?: HTMLElement | Window; duration?: number }): void {
  scrollTo(0, options);
}

/** Scroll to bottom of page/container */
export function scrollToBottom(options?: { target?: HTMLElement | Window; duration?: number }): void {
  const target = options?.target ?? window;
  if (target === window) {
    scrollTo(document.documentElement.scrollHeight - window.innerHeight, options);
  } else {
    const el = target as HTMLElement;
    scrollTo(el.scrollHeight - el.clientHeight, { target: el, ...options });
  }
}

// --- Scroll Position Tracking ---

/**
 * Track scroll position with direction, velocity, and progress.
 * Returns cleanup function.
 */
export function trackScroll(
  callback: (position: ScrollPosition) => void,
  options?: { target?: HTMLElement | Window; throttleMs?: number },
): () => void {
  const target = options?.target ?? window;
  const throttleMs = options?.throttleMs ?? 16;

  let lastPos = getScrollPosition(target);
  let lastTime = performance.now();
  let lastY = lastPos.y;
  let destroyed = false;

  function handleScroll(): void {
    if (destroyed) return;

    const now = performance.now();
    if (now - lastTime < throttleMs) return;
    lastTime = now;

    const pos = getScrollPosition(target);
    const dt = (now - lastTime) / 1000; // seconds

    // Calculate total scrollable height
    let scrollHeight: number;
    let clientHeight: number;
    if (target === window) {
      scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      clientHeight = window.innerHeight;
    } else {
      const el = target as HTMLElement;
      scrollHeight = el.scrollHeight - el.clientHeight;
      clientHeight = el.clientHeight;
    }

    const position: ScrollPosition = {
      x: pos.x,
      y: pos.y,
      directionX: pos.x > lastPos.x ? "right" : pos.x < lastPos.x ? "left" : "none",
      directionY: pos.y > lastY ? "down" : pos.y < lastY ? "up" : "none",
      velocity: dt > 0 ? Math.abs(pos.y - lastY) / dt : 0,
      progress: scrollHeight > 0 ? pos.y / scrollHeight : 0,
    };

    lastPos = pos;
    lastY = pos.y;

    callback(position);
  }

  target.addEventListener("scroll", handleScroll, { passive: true });

  return () => {
    destroyed = true;
    target.removeEventListener("scroll", handleScroll);
  };
}

// --- Scroll Spy ---

/**
 * Track which section is currently visible/active based on scroll position.
 * Highlights the section that is scrolled into view.
 */
export function createScrollSpy(options: ScrollSpyOptions): () => void {
  const {
    targets,
    container = window,
    offset = 100,
    activeClass = "scroll-spy-active",
    onChange,
    throttleMs = 100,
  } = options;

  let destroyed = false;
  let activeIndex = -1;
  let lastTrigger = 0;

  function update(): void {
    if (destroyed) return;

    const now = performance.now();
    if (now - lastTrigger < throttleMs) return;
    lastTrigger = now;

    const scrollY = getScrollPosition(container).y;
    let newActiveIndex = -1;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      if (!target) continue;
      const rect = target.getBoundingClientRect();
      const top = rect.top + scrollY;

      if (scrollY >= top - offset) {
        newActiveIndex = i;
      }
    }

    if (newActiveIndex !== activeIndex) {
      // Remove old active class
      if (activeIndex >= 0 && targets[activeIndex]) {
        targets[activeIndex]!.classList.remove(activeClass);
      }

      activeIndex = newActiveIndex;

      // Add new active class
      if (activeIndex >= 0 && targets[activeIndex]) {
        targets[activeIndex]!.classList.add(activeClass);
      }

      onChange?.(activeIndex >= 0 ? targets[activeIndex]! : null, activeIndex);
    }
  }

  container.addEventListener("scroll", update, { passive: true });
  update(); // Initial check

  return () => {
    destroyed = true;
    container.removeEventListener("scroll", update);
    for (const t of targets) t?.classList.remove(activeClass);
  };
}

// --- Infinite Scroll ---

/**
 * Set up infinite scroll that triggers loadMore when user scrolls near bottom.
 * Returns cleanup function.
 */
export function createInfiniteScroll(options: InfiniteScrollOptions): () => void {
  const {
    container,
    loadMore,
    threshold = 200,
    isLoading = () => false,
    hasMore = () => true,
    rootMargin = `${threshold}px`,
  } = options;

  let destroyed = false;

  // Use sentinel element approach with IntersectionObserver
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "width:100%;height:1px;pointer-events:none;";
  container.appendChild(sentinel);

  const observer = new IntersectionObserver(
    async (entries) => {
      if (destroyed) return;
      for (const entry of entries) {
        if (entry.isIntersecting && !isLoading() && hasMore()) {
          await loadMore();
        }
      }
    },
    { root: container, rootMargin },
  );

  observer.observe(sentinel);

  return () => {
    destroyed = true;
    observer.disconnect();
    sentinel.remove();
  };
}

// --- Parallax ---

/**
 * Apply parallax scroll effect to an element.
 * Returns cleanup function.
 */
export function createParallax(options: ParallaxOptions): () => void {
  const { element, speed = 0.5, container = window } = options;
  let destroyed = false;

  function update(): void {
    if (destroyed || options.disabled) return;

    const scrollY = getScrollPosition(container).y;
    const rect = element.getBoundingClientRect();
    // Only apply when element is near viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    const offset = (rect.top + scrollY) * speed;
    element.style.transform = `translateY(${scrollY * speed - offset}px)`;
  }

  container.addEventListener("scroll", update, { passive: true });
  update();

  return () => {
    destroyed = true;
    container.removeEventListener("scroll", update);
    element.style.transform = "";
  };
}

// --- Scroll Lock ---

/**
 * Lock body scroll (useful for modals, drawers, overlays).
 * Returns unlock function.
 */
export function lockScroll(options: ScrollLockOptions = {}): () => void {
  const {
    lockHorizontal = false,
    reserveScrollBarGap = true,
    allowScrollIn = [],
  } = options;

  const originalOverflow = document.body.style.overflow;
  const originalOverflowX = document.body.style.overflowX;
  const originalOverflowY = document.body.style.overflowY;
  const originalPaddingRight = document.body.style.paddingRight;

  // Calculate scrollbar width
  const scrollbarWidth = reserveScrollBarGap
    ? window.innerWidth - document.documentElement.clientWidth
    : 0;

  document.body.style.overflow = "hidden";
  if (lockHorizontal) document.body.style.overflowX = "hidden";
  document.body.style.overflowY = "hidden";
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }

  // Allow scroll within specified elements
  const handlers: Array<{ el: HTMLElement; fn: (e: WheelEvent) => void }> = [];

  for (const el of allowScrollIn) {
    const handler = (e: WheelEvent): void => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const delta = e.deltaY;

      if (
        (delta < 0 && scrollTop <= 0) ||
        (delta > 0 && scrollTop + clientHeight >= scrollHeight)
      ) {
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    handlers.push({ el, fn: handler });
  }

  return () => {
    document.body.style.overflow = originalOverflow;
    document.body.style.overflowX = originalOverflowX;
    document.body.style.overflowY = originalOverflowY;
    document.body.style.paddingRight = originalPaddingRight;
    for (const { el, fn } of handlers) {
      el.removeEventListener("wheel", fn);
    }
  };
}

// --- Scroll Progress ---

/**
 * Create a visual scroll progress indicator bar at the top of the page.
 * Returns destroy function.
 */
export function createProgressBar(options?: {
  color?: string;
  height?: number;
  zIndex?: number;
  target?: HTMLElement | Window;
}): () => void {
  const color = options?.color ?? "#6366f1";
  const height = options?.height ?? 3;
  const zIndex = options?.zIndex ?? 9999;
  const target = options?.target ?? window;

  const bar = document.createElement("div");
  bar.style.cssText = `
    position:fixed;top:0;left:0;height:${height}px;background:${color};
    z-index:${zIndex};transition:width 100ms linear;width:0%;
    pointer-events:none;transform-origin:left;
  `;
  document.body.appendChild(bar);

  const cleanup = trackScroll((pos) => {
    bar.style.width = `${pos.progress * 100}%`;
  }, { target, throttleMs: 16 });

  return () => {
    cleanup();
    bar.remove();
  };
}

// --- Utility Functions ---

/** Check if element is scrolled to the very top */
export function isAtTop(target?: HTMLElement | Window): boolean {
  return getScrollPosition(target).y <= 0;
}

/** Check if element is scrolled to the very bottom */
export function isAtBottom(target?: HTMLElement | Window): boolean {
  const pos = getScrollPosition(target);
  if (target === window) {
    return pos.y + window.innerHeight >= document.documentElement.scrollHeight - 1;
  }
  const el = target as HTMLElement;
  return pos.y + el.clientHeight >= el.scrollHeight - 1;
}

/** Get scroll percentage (0-100) */
export function getScrollPercent(target?: HTMLElement | Window): number {
  const pos = getScrollPosition(target);
  let maxScroll: number;
  if (target === window) {
    maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  } else {
    const el = target as HTMLElement;
    maxScroll = el.scrollHeight - el.clientHeight;
  }
  if (maxScroll <= 0) return 100;
  return Math.round((pos.y / maxScroll) * 100);
}
