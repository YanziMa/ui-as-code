/**
 * Intersection Utilities: Enhanced IntersectionObserver wrapper, visibility
 * detection, lazy loading, viewport entry/exit animations, scroll-triggered
 * effects, element-in-view utilities, and viewport boundary tracking.
 */

// --- Types ---

export interface IntersectionEntry {
  /** Target element */
  target: HTMLElement;
  /** Is intersecting the root */
  isIntersecting: boolean;
  /** Intersection ratio (0-1) */
  intersectionRatio: number;
  /** Bounding rect relative to viewport */
  boundingClientRect: DOMRectReadOnly;
  /** Root bounds rect */
  rootBounds: DOMRectReadOnly | null;
  /** Whether this is the first observation */
  isFirstObservation: boolean;
  /** Number of times this element has entered view */
  enterCount: number;
  /** Number of times this element has exited view */
  exitCount: number;
}

export interface ObserverConfig {
  /** Margin around root (CSS margin syntax) */
  rootMargin?: string;
  /** Threshold(s) at which to trigger callback */
  threshold?: number | number[];
  /** Root element (default = viewport) */
  root?: HTMLElement | null;
  /** Only fire once per element then unobserve */
  once?: boolean;
  /** Delay between observations (ms) — experimental API */
  delay?: number;
  /** Track visibility state across observations */
  trackVisibility?: boolean;
  /** Throttle callbacks (ms) */
  throttleMs?: number;
}

export interface VisibilityInstance {
  /** The observer instance */
  observer: EnhancedIntersectionObserver;
  /** Check if a specific element is currently visible */
  isVisible: (el: HTMLElement) => boolean;
  /** Get visibility ratio for an element (0-1) */
  getVisibilityRatio: (el: HTMLElement) => number;
  /** Get all visible elements */
  getVisibleElements: () => HTMLElement[];
  /** Manually check all elements */
  checkAll: () => void;
  /** Destroy and disconnect */
  destroy: () => void;
}

export interface LazyLoadOptions {
  /** Elements to lazy load */
  targets: HTMLElement[];
  /** Attribute containing the real src/url */
  dataAttribute?: string;
  /** Root margin for intersection */
  rootMargin?: string;
  /** Threshold */
  threshold?: number;
  /** CSS class to add when loaded */
  loadedClass?: string;
  /** Placeholder while loading */
  placeholder?: string;
  /** Custom load handler */
  onLoad?: (el: HTMLElement, src: string) => void;
  /** Called when all elements are loaded */
  onAllLoaded?: () => void;
}

export interface ScrollTriggerOptions {
  /** Element to animate */
  target: HTMLElement;
  /** Trigger threshold (0-1) */
  threshold?: number;
  /** Root margin offset */
  rootMargin?: string;
  /** Animation class(es) to add on enter */
  enterClass?: string;
  /** Animation class(es) to add on exit */
  exitClass?: string;
  /** CSS class added while in view */
  inViewClass?: string;
  /** Only trigger once */
  once?: boolean;
  /** Delay before adding class (ms) */
  delay?: number;
  /** Minimum time in view before triggering (ms) */
  minVisibleTime?: number;
  /** Callback on enter */
  onEnter?: (entry: IntersectionEntry) => void;
  /** Callback on exit */
  onExit?: (entry: IntersectionEntry) => void;
}

// --- Enhanced IntersectionObserver ---

/**
 * EnhancedIntersectionObserver wraps the native IntersectionObserver with
 * additional features: entry counting, first-observation tracking,
 * throttling, once mode, and enhanced entry data.
 *
 * @example
 * ```ts
 * const observer = new EnhancedIntersectionObserver((entries) => {
 *   for (const entry of entries) {
 *     console.log(entry.target, entry.enterCount);
 *   }
 * }, { once: true });
 * observer.observe(element);
 * ```
 */
export class EnhancedIntersectionObserver {
  private observer: IntersectionObserver | null = null;
  private callback: (entries: IntersectionEntry[]) => void;
  private config: Required<ObserverConfig>;
  private state = new Map<HTMLElement, {
    isFirst: boolean;
    enterCount: number;
    exitCount: number;
    wasIntersecting: boolean;
  }>();
  private lastFireTime = 0;

  constructor(
    callback: (entries: IntersectionEntry[]) => void,
    config: ObserverConfig = {},
  ) {
    this.callback = callback;
    this.config = {
      rootMargin: config.rootMargin ?? "0px",
      threshold: config.threshold ?? 0,
      root: config.root ?? null,
      once: config.once ?? false,
      delay: config.delay ?? 0,
      trackVisibility: config.trackVisibility ?? true,
      throttleMs: config.throttleMs ?? 0,
    };
  }

  /** Observe an element */
  observe(element: HTMLElement): void {
    if (!this.observer) {
      this.observer = new IntersectionObserver(this._handleEntries.bind(this), {
        root: this.config.root,
        rootMargin: this.config.rootMargin,
        threshold: this.config.threshold,
      });
    }

    if (!this.state.has(element)) {
      this.state.set(element, {
        isFirst: true,
        enterCount: 0,
        exitCount: 0,
        wasIntersecting: false,
      });
    }

    this.observer.observe(element);
  }

  /** Unobserve a single element */
  unobserve(element: HTMLElement): void {
    this.observer?.unobserve(element);
    this.state.delete(element);
  }

  /** Disconnect from all elements */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.state.clear();
  }

  // --- Internal ---

  private _handleEntries(entries: IntersectionObserverEntry[]): void {
    // Throttle
    if (this.config.throttleMs > 0) {
      const now = performance.now();
      if (now - this.lastFireTime < this.config.throttleMs) return;
      this.lastFireTime = now;
    }

    const enhanced: IntersectionEntry[] = [];

    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const st = this.state.get(el)!;

      const isEntering = entry.isIntersecting && !st.wasIntersecting;
      const isExiting = !entry.isIntersecting && st.wasIntersecting;

      if (isEntering) st.enterCount++;
      if (isExiting) st.exitCount++;

      const enhancedEntry: IntersectionEntry = {
        target: el,
        isIntersecting: entry.isIntersecting,
        intersectionRatio: entry.intersectionRatio,
        boundingClientRect: entry.boundingClientRect,
        rootBounds: entry.rootBounds,
        isFirstObservation: st.isFirst,
        enterCount: st.enterCount,
        exitCount: st.exitCount,
      };

      st.wasIntersecting = entry.isIntersecting;
      if (st.isFirst) st.isFirst = false;

      // Once mode: unobserve after first intersection
      if (this.config.once && entry.isIntersecting && st.enterCount === 1) {
        this.observer?.unobserve(el);
      }

      enhanced.push(enhancedEntry);
    }

    if (enhanced.length > 0) {
      this.callback(enhanced);
    }
  }
}

// --- Visibility Detection ---

/**
 * Create a visibility tracker that monitors which elements are in the viewport.
 *
 * @example
 * ```ts
 * const vis = createVisibilityTracker([el1, el2, el3], { threshold: 0.5 });
 * console.log(vis.getVisibleElements()); // [el1]
 * vis.destroy();
 * ```
 */
export function createVisibilityTracker(
  targets: HTMLElement[],
  config: ObserverConfig = {},
): VisibilityInstance {
  const visibleSet = new Set<HTMLElement>();
  const ratioMap = new Map<HTMLElement, number>();

  const observer = new EnhancedIntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        visibleSet.add(entry.target);
      } else {
        visibleSet.delete(entry.target);
      }
      ratioMap.set(entry.target, entry.intersectionRatio);
    }
  }, config);

  for (const el of targets) {
    observer.observe(el);
  }

  return {
    observer,
    isVisible: (el: HTMLElement) => visibleSet.has(el),
    getVisibilityRatio: (el: HTMLElement) => ratioMap.get(el) ?? 0,
    getVisibleElements: () => Array.from(visibleSet),
    checkAll: () => {
      // Force re-check by briefly unobserving and reobserving
      for (const el of targets) {
        observer.unobserve(el);
        observer.observe(el);
      }
    },
    destroy: () => observer.disconnect(),
  };
}

// --- Lazy Loading ---

/**
 * Set up lazy loading for images or elements with data attributes.
 *
 * @example
 * ```ts
 * createLazyLoad({
 *   targets: document.querySelectorAll("img[data-src]") as any,
 *   dataAttribute: "data-src",
 *   loadedClass: "loaded",
 * });
 * ```
 */
export function createLazyLoad(options: LazyLoadOptions): { destroy: () => void; reload: () => void } {
  const {
    targets,
    dataAttribute = "data-src",
    rootMargin = "200px",
    threshold = 0,
    loadedClass = "loaded",
    placeholder,
    onLoad,
    onAllLoaded,
  } = options;

  let loadedCount = 0;
  const totalTargets = targets.length;
  let destroyed = false;

  const _loadElement = (el: HTMLElement): void => {
    const src = el.getAttribute(dataAttribute);
    if (!src) return;

    // Set placeholder
    if (placeholder && el instanceof HTMLImageElement) {
      el.src = placeholder;
    }

    // If it's an img, set src
    if (el instanceof HTMLImageElement) {
      el.onload = () => {
        el.classList.add(loadedClass);
        loadedCount++;
        onLoad?.(el, src);
        if (loadedCount >= totalTargets) onAllLoaded?.();
      };
      el.onerror = () => {
        loadedCount++;
        if (loadedCount >= totalTargets) onAllLoaded?.();
      };
      el.src = src;
    } else {
      // For other elements (e.g., background-image)
      el.style.backgroundImage = `url('${src}')`;
      el.classList.add(loadedClass);
      loadedCount++;
      onLoad?.(el, src);
      if (loadedCount >= totalTargets) onAllLoaded?.();
    }
  };

  const observer = new EnhancedIntersectionObserver((entries) => {
    if (destroyed) return;
    for (const entry of entries) {
      if (entry.isIntersecting) {
        _loadElement(entry.target);
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin, threshold, once: true });

  for (const el of targets) {
    observer.observe(el);
  }

  return {
    destroy: () => {
      destroyed = true;
      observer.disconnect();
    },
    reload: () => {
      loadedCount = 0;
      for (const el of targets) {
        observer.observe(el);
      }
    },
  };
}

// --- Scroll Trigger / Animate on Scroll ---

/**
 * Create scroll-triggered animations using IntersectionObserver.
 * Adds/removes CSS classes when elements enter/exit the viewport.
 *
 * @example
 * ```ts
 * createScrollTrigger({
 *   target: section,
 *   enterClass: "animate-fade-in-up",
 *   once: true,
 * });
 * ```
 */
export function createScrollTrigger(options: ScrollTriggerOptions): { destroy: () => void } {
  const {
    target,
    threshold = 0.1,
    rootMargin = "0px",
    enterClass,
    exitClass,
    inViewClass,
    once = false,
    delay = 0,
    minVisibleTime = 0,
    onEnter,
    onExit,
  } = options;

  let destroyed = false;
  let enterTimer: ReturnType<typeof setTimeout> | null = null;
  let visibleStartTime: number | null = null;
  let hasTriggered = false;

  const observer = new EnhancedIntersectionObserver((entries) => {
    if (destroyed) return;

    for (const entry of entries) {
      if (entry.isIntersecting) {
        visibleStartTime = performance.now();

        const doEnter = (): void => {
          if (enterClass) target.classList.add(...enterClass.split(" ").filter(Boolean));
          if (inViewClass) target.classList.add(...inViewClass.split(" ").filter(Boolean));
          if (exitClass) target.classList.remove(...exitClass.split(" ").filter(Boolean));
          hasTriggered = true;
          onEnter?.(entry);

          if (once) {
            observer.unobserve(target);
          }
        };

        if (minVisibleTime > 0) {
          // Wait for minimum visible time
          setTimeout(() => {
            if (!destroyed) doEnter();
          }, minVisibleTime);
        } else if (delay > 0) {
          enterTimer = setTimeout(doEnter, delay);
        } else {
          doEnter();
        }
      } else {
        if (enterTimer !== null) {
          clearTimeout(enterTimer);
          enterTimer = null;
        }
        visibleStartTime = null;

        if (exitClass && !once) {
          target.classList.add(...exitClass.split(" ").filter(Boolean));
        }
        if (inViewClass) {
          target.classList.remove(...inViewClass.split(" ").filter(Boolean));
        }
        if (enterClass && !once && hasTriggered) {
          target.classList.remove(...enterClass.split(" ").filter(Boolean));
        }
        onExit?.(entry);
      }
    }
  }, { threshold, rootMargin });

  observer.observe(target);

  return {
    destroy: () => {
      destroyed = true;
      if (enterTimer !== null) clearTimeout(enterTimer);
      observer.disconnect();
    },
  };
}

// --- Utility Functions ---

/** Check if an element is currently within the viewport */
export function isInViewport(el: HTMLElement, partial = true): boolean {
  const rect = el.getBoundingClientRect();

  if (partial) {
    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

/** Get the percentage of an element that is visible in the viewport (0-100) */
export function getViewportVisibility(el: HTMLElement): number {
  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  const visibleHeight = Math.max(0, Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0));
  const visibleWidth = Math.max(0, Math.min(rect.right, windowWidth) - Math.max(rect.left, 0));

  const elementArea = rect.width * rect.height;
  if (elementArea === 0) return 0;

  return Math.round((visibleHeight * visibleWidth / elementArea) * 100);
}

/** Wait until an element enters the viewport, returns a Promise */
export function whenInViewport(
  el: HTMLElement,
  options?: { timeout?: ms; rootMargin?: string; threshold?: number },
): Promise<boolean> {
  const { timeout = 10000, rootMargin = "0px", threshold = 1 } = options ?? {};

  return new Promise((resolve) => {
    let resolved = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          resolved = true;
          observer.disconnect();
          resolve(true);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(el);

    if (timeout > 0) {
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          resolve(false);
        }
      }, timeout);
    }
  });
}

/** Create a batch of scroll triggers for multiple elements */
export function batchScrollTriggers(
  elements: HTMLElement[],
  baseOptions: Omit<ScrollTriggerOptions, "target">,
): { destroy: () => void } {
  const destroyers: Array<() => void> = [];

  for (const el of elements) {
    const trigger = createScrollTrigger({ ...baseOptions, target: el });
    destroyers.push(trigger.destroy);
  }

  return {
    destroy: () => destroyers.forEach((d) => d()),
  };
}
