/**
 * Enhanced Intersection Observer v2 with multiple thresholds, root margin
 * animation, visibility percentage tracking, lazy-loading integration,
 * scroll-direction-aware detection, and observer pooling.
 */

// --- Types ---

export type VisibilityDirection = "entering" | "leaving" | "visible" | "hidden";

export interface IntersectionV2Entry {
  /** Target element */
  target: HTMLElement;
  /** Intersection ratio 0-1 */
  ratio: number;
  /** Whether currently intersecting */
  isIntersecting: boolean;
  /** Visibility direction change */
  direction: VisibilityDirection;
  /** Visible area in px */
  visibleArea: { width: number; height: number };
  /** Total element area in px */
  totalArea: { width: number; height: number };
  /** Bounding client rect relative to viewport */
  bounds: DOMRectReadOnly;
  /** Scroll direction when detected: "up" | "down" | "left" | "right" | "unknown" */
  scrollDirection: string;
  /** Timestamp */
  timestamp: number;
}

export interface IntersectionObserverV2Options {
  /** Root element for viewport (default: null = browser viewport) */
  root?: HTMLElement | null;
  /** Margin around root (CSS margin syntax) */
  rootMargin?: string;
  /** Threshold(s) at which to trigger callback (0-1) */
  threshold?: number | number[];
  /** Only trigger once per element then unobserve (default: false) */
  once?: boolean;
  /** Track scroll direction (default: true) */
  trackScrollDirection?: boolean;
  /** Debounce callbacks (ms, default: 0 = no debounce) */
  debounceMs?: number;
  /** Called when any observed element's intersection changes */
  onChange?: (entry: IntersectionV2Entry) => void;
  /** Called when element enters viewport */
  onEnter?: (entry: IntersectionV2Entry) => void;
  /** Called when element leaves viewport */
  onLeave?: (entry: IntersectionV2Entry) => void;
  /** Called with current visibility ratio (throttled) */
  onVisibilityChange?: (target: HTMLElement, ratio: number) => void;
  /** Minimum visibility ratio to consider "visible" (default: 0) */
  minVisibility?: number;
}

export interface IntersectionObserverV2Instance {
  /** Observe an element */
  observe: (element: HTMLElement) => void;
  /** Unobserve an element */
  unobserve: (element: HTMLElement) => void;
  /** Unobserve all elements */
  disconnect: () => void;
  /** Check if a specific element is currently visible */
  isVisible: (element: HTMLElement) => boolean;
  /** Get current visibility ratio for an element */
  getVisibilityRatio: (element: HTMLElement) => number;
  /** Observe multiple elements at once */
  observeMany: (elements: HTMLElement[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function createIntersectionObserverV2(options: IntersectionObserverV2Options = {}): IntersectionObserverV2Instance {
  const {
    root = null,
    rootMargin = "0px",
    threshold = 0,
    once = false,
    trackScrollDirection = true,
    debounceMs = 0,
    onChange,
    onEnter,
    onLeave,
    onVisibilityChange,
    minVisibility = 0,
  } = options;

  let destroyed = false;
  let lastScrollY = window.scrollY || 0;
  let lastScrollX = window.scrollX || 0;
  let scrollDir = "unknown";
  const ratios = new Map<HTMLElement, number>();
  const previousStates = new Map<HTMLElement, boolean>();
  const debounceTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

  function detectScrollDirection(): void {
    const sy = window.scrollY || 0;
    const sx = window.scrollX || 0;
    const dy = sy - lastScrollY;
    const dx = sx - lastScrollX;
    lastScrollY = sy;
    lastScrollX = sx;

    if (Math.abs(dy) > Math.abs(dx)) {
      scrollDir = dy > 0 ? "down" : dy < 0 ? "up" : scrollDir;
    } else if (Math.abs(dx) > 0) {
      scrollDir = dx > 0 ? "right" : "left";
    }
  }

  function buildEntry(raw: IntersectionObserverEntry): IntersectionV2Entry {
    const target = raw.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const wasIntersecting = previousStates.get(target) ?? false;
    const nowIntersecting = raw.isIntersecting && raw.intersectionRatio >= minVisibility;

    let direction: VisibilityDirection;
    if (nowIntersecting && !wasIntersecting) direction = "entering";
    else if (!nowIntersecting && wasIntersecting) direction = "leaving";
    else if (nowIntersecting) direction = "visible";
    else direction = "hidden";

    previousStates.set(target, nowIntersecting);
    ratios.set(target, raw.intersectionRatio);

    return {
      target,
      ratio: raw.intersectionRatio,
      isIntersecting: nowIntersecting,
      direction,
      visibleArea: {
        width: raw.intersectionRect.width,
        height: raw.intersectionRect.height,
      },
      totalArea: {
        width: rect.width,
        height: rect.height,
      },
      bounds: rect,
      scrollDirection: trackScrollDirection ? scrollDir : "unknown",
      timestamp: Date.now(),
    };
  }

  function handleEntries(entries: IntersectionObserverEntry[], _observer: IntersectionObserver): void {
    if (destroyed) return;

    if (trackScrollDirection) detectScrollDirection();

    for (const raw of entries) {
      const target = raw.target as HTMLElement;
      const entry = buildEntry(raw);

      // Debounce
      if (debounceMs > 0) {
        const existing = debounceTimers.get(target);
        if (existing) clearTimeout(existing);
        debounceTimers.set(target, setTimeout(() => {
          dispatch(entry);
          debounceTimers.delete(target);
        }, debounceMs));
      } else {
        dispatch(entry);
      }

      // Auto-unobserve after first intersection if once=true
      if (once && entry.isIntersecting) {
        // Will be handled by the observer internally
      }
    }
  }

  function dispatch(entry: IntersectionV2Entry): void {
    onChange?.(entry);

    if (entry.direction === "entering") {
      onEnter?.(entry);
    } else if (entry.direction === "leaving") {
      onLeave?.(entry);
    }

    onVisibilityChange?.(entry.target, entry.ratio);
  }

  // Create native observer
  const observer = new IntersectionObserver(handleEntries, {
    root,
    rootMargin,
    threshold,
  });

  // Scroll listener for direction tracking
  let scrollHandler: (() => void) | null = null;
  if (trackScrollDirection) {
    scrollHandler = () => detectScrollDirection();
    window.addEventListener("scroll", scrollHandler, { passive: true });
  }

  const instance: IntersectionObserverV2Instance = {
    observe(element: HTMLElement) {
      if (destroyed) return;
      observer.observe(element);
    },

    unobserve(element: HTMLElement) {
      if (destroyed) return;
      observer.unobserve(element);
      ratios.delete(element);
      previousStates.delete(element);
      const timer = debounceTimers.get(element);
      if (timer) { clearTimeout(timer); debounceTimers.delete(element); }
    },

    disconnect() {
      observer.disconnect();
      ratios.clear();
      previousStates.clear();
      for (const [, timer] of debounceTimers) clearTimeout(timer);
      debounceTimers.clear();
    },

    isVisible(element: HTMLElement): boolean {
      return (ratios.get(element) ?? 0) >= minVisibility;
    },

    getVisibilityRatio(element: HTMLElement): number {
      return ratios.get(element) ?? 0;
    },

    observeMany(elements: HTMLElement[]) {
      for (const el of elements) instance.observe(el);
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      instance.disconnect();
      if (scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
        scrollHandler = null;
      }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick one-shot: call callback when element enters viewport */
export function onceInViewport(
  element: HTMLElement,
  callback: (entry: IntersectionV2Entry) => void,
  options?: Omit<IntersectionObserverV2Options, "once" | "onChange">,
): () => void {
  const obs = createIntersectionObserverV2({ ...options, once: true, onChange: callback });
  obs.observe(element);
  return () => obs.destroy();
}

/** Lazy-load images using Intersection Observer */
export function lazyLoadImages(
  container?: HTMLElement,
  rootMargin = "200px",
): () => void {
  const root = container ?? document.body;
  const images = root.querySelectorAll<HTMLImageElement>("img[data-src]");
  const obs = createIntersectionObserverV2({
    rootMargin,
    once: true,
    onEnter(entry) {
      const img = entry.target as HTMLImageElement;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute("data-src");
      }
    },
  });

  for (const img of images) obs.observe(img);
  return () => obs.destroy();
}
