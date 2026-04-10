/**
 * Viewport utilities — size detection, visibility tracking,
 * intersection observer wrapper, scroll position, and
 * responsive dimension helpers.
 */

// --- Types ---

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ScrollPosition {
  x: number;
  y: number;
  directionX: "left" | "right" | "none";
  directionY: "up" | "down" | "none";
}

export interface VisibilityOptions {
  /** Element to observe */
  element: HTMLElement | string;
  /** Callback when visibility changes */
  onVisible?: (entry: IntersectionObserverEntry) => void;
  /** Callback when hidden */
  onHidden?: (entry: IntersectionObserverEntry) => void;
  /** Callback on every observation */
  onChange?: (entry: IntersectionObserverEntry, isVisible: boolean) => void;
  /** Root margin (CSS margin syntax) */
  rootMargin?: string;
  /** Visibility threshold (0-1) */
  threshold?: number | number[];
  /** Unobserve after first visibility? */
  once?: boolean;
  /** Root element for intersection */
  root?: HTMLElement | null;
}

export interface ViewportObserverInstance {
  /** Current visibility state */
  isVisible: boolean;
  /** Latest entry data */
  entry: IntersectionObserverEntry | null;
  /** Ratio of element visible (0-1) */
  visibilityRatio: number;
  /** Destroy observer */
  destroy: () => void;
  /** Manually check visibility */
  check: () => boolean;
}

export interface ResizeObserverOptions {
  /** Elements to observe */
  elements: HTMLElement[];
  /** Callback on resize */
  onResize: (entries: Array<{ element: HTMLElement; size: ViewportSize }>) => void;
  /** Debounce interval ms (default: 0 = immediate) */
  debounceMs?: number;
  /** Report initial size? */
  reportInitial?: boolean;
}

// --- Viewport Size ---

/** Get current viewport dimensions */
export function getViewportSize(): ViewportSize {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/** Get the visual viewport size (affected by mobile zoom/keyboard) */
export function getVisualViewportSize(): ViewportSize {
  if (window.visualViewport) {
    return {
      width: window.visualViewport.width,
      height: window.visualViewport.height,
    };
  }
  return getViewportSize();
}

/** Get document scroll dimensions */
export function getDocumentSize(): ViewportSize {
  return {
    width: Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
      document.documentElement.clientWidth,
    ),
    height: Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      document.documentElement.clientHeight,
    ),
  };
}

/** Check if viewport is in landscape orientation */
export function isLandscape(): boolean {
  return window.innerWidth > window.innerHeight;
}

/** Check if viewport is in portrait orientation */
export function isPortrait(): boolean {
  return !isLandscape();
}

// --- Scroll Position ---

/** Get current scroll position with direction tracking */
export function createScrollTracker(): {
  getPosition: () => ScrollPosition;
  subscribe: (fn: (pos: ScrollPosition) => void) => () => void;
  destroy: () => void;
} {
  let prevX = window.scrollX;
  let prevY = window.scrollY;
  const listeners = new Set<(pos: ScrollPosition) => void>();
  let destroyed = false;

  function handleScroll(): void {
    if (destroyed) return;

    const currX = window.scrollX;
    const currY = window.scrollY;

    const pos: ScrollPosition = {
      x: currX,
      y: currY,
      directionX: currX > prevX ? "right" : currX < prevX ? "left" : "none",
      directionY: currY > prevY ? "down" : currY < prevY ? "up" : "none",
    };

    prevX = currX;
    prevY = currY;

    for (const fn of listeners) fn(pos);
  }

  window.addEventListener("scroll", handleScroll, { passive: true });

  return {
    getPosition: (): ScrollPosition => ({
      x: window.scrollX,
      y: window.scrollY,
      directionX: "none",
      directionY: "none",
    }),
    subscribe(fn): () => void {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    destroy() {
      destroyed = true;
      window.removeEventListener("scroll", handleScroll);
      listeners.clear();
    },
  };
}

/** Get scroll progress as ratio (0-1) for an axis */
export function getScrollProgress(axis: "x" | "y" = "y"): number {
  const docSize = getDocumentSize();
  const vpSize = getViewportSize();

  if (axis === "x") {
    const maxScroll = docSize.width - vpSize.width;
    return maxScroll > 0 ? window.scrollX / maxScroll : 0;
  }

  const maxScroll = docSize.height - vpSize.height;
  return maxScroll > 0 ? window.scrollY / maxScroll : 0;
}

/** Scroll to an element smoothly */
export function scrollToElement(el: HTMLElement, options?: { offset?: number; behavior?: ScrollBehavior }): void {
  const offset = options?.offset ?? 0;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: options?.behavior ?? "smooth" });
}

/** Scroll to top of page */
export function scrollToTop(behavior: ScrollBehavior = "smooth"): void {
  window.scrollTo({ top: 0, behavior });
}

/** Scroll to bottom of page */
export function scrollToBottom(behavior: ScrollBehavior = "smooth"): void {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior,
  });
}

// --- Intersection Observer ---

/**
 * Observe element visibility in viewport.
 * Returns instance with current state and cleanup.
 */
export function observeVisibility(options: VisibilityOptions): ViewportObserverInstance {
  const el = typeof options.element === "string"
    ? document.querySelector<HTMLElement>(options.element)!
    : options.element;

  if (!el) throw new Error("Viewport: element not found");

  let isVisible = false;
  let latestEntry: IntersectionObserverEntry | null = null;
  let destroyed = false;

  const observer = new IntersectionObserver(
    (entries) => {
      if (destroyed) return;

      const entry = entries[0]!;
      latestEntry = entry;
      const wasVisible = isVisible;
      isVisible = entry.isIntersecting;

      options.onChange?.(entry, isVisible);

      if (isVisible && !wasVisible) {
        options.onVisible?.(entry);
        if (options.once) {
          observer.unobserve(el);
          return;
        }
      }

      if (!isVisible && wasVisible) {
        options.onHidden?.(entry);
      }
    },
    {
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? "0px",
      threshold: options.threshold ?? 0,
    },
  );

  observer.observe(el);

  return {
    get isVisible() { return isVisible; },
    get entry() { return latestEntry; },
    get visibilityRatio() { return latestEntry?.intersectionRatio ?? 0; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
    },
    check() {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0;
    },
  };
}

/** One-shot: wait until element enters viewport, then resolve */
export function whenVisible(element: HTMLElement | string, timeoutMs?: number): Promise<boolean> {
  return new Promise((resolve) => {
    const el = typeof element === "string"
      ? document.querySelector<HTMLElement>(element)
      : element;

    if (!el) { resolve(false); return; }

    // Already visible?
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      resolve(true);
      return;
    }

    const obs = observeVisibility({
      element: el!,
      once: true,
      onVisible() { resolve(true); },
    });

    if (timeoutMs) {
      setTimeout(() => { obs.destroy(); resolve(false); }, timeoutMs);
    }
  });
}

// --- Resize Observer ---

/** Observe element resize events */
export function observeResize(options: ResizeObserverOptions): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const observer = new ResizeObserver((entries) => {
    const results = entries.map((entry) => ({
      element: entry.target as HTMLElement,
      size: { width: entry.contentRect.width, height: entry.contentRect.height },
    }));

    if (options.debounceMs && options.debounceMs > 0) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { options.onResize(results); }, options.debounceMs);
    } else {
      options.onResize(results);
    }
  });

  for (const el of options.elements) {
    observer.observe(el);
  }

  if (options.reportInitial) {
    const initial = options.elements.map((el) => ({
      element: el,
      size: { width: el.clientWidth, height: el.clientHeight },
    }));
    options.onResize(initial);
  }

  return () => {
    if (timer) clearTimeout(timer);
    observer.disconnect();
  };
}

// --- Fullscreen ---

/** Request fullscreen on an element */
export async function requestFullscreen(el: HTMLElement = document.documentElement): Promise<void> {
  try {
    await el.requestFullscreen();
  } catch {
    // Browser may not support or user denied
  }
}

/** Exit fullscreen mode */
export async function exitFullscreen(): Promise<void> {
  try {
    await document.exitFullscreen();
  } catch {
    // Not in fullscreen or not supported
  }
}

/** Check if currently in fullscreen mode */
export function isFullscreen(): boolean {
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
}

/** Subscribe to fullscreen change events */
export function onFullscreenChange(fn: (isFs: boolean) => void): () => void {
  const handler = () => fn(isFullscreen());
  document.addEventListener("fullscreenchange", handler);
  return () => document.removeEventListener("fullscreenchange", handler);
}
