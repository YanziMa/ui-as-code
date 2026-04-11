/**
 * Intersection Helper: IntersectionObserver utilities for viewport detection,
 * lazy loading, scroll-triggered animations, infinite scroll sentinels,
 * visibility tracking with thresholds, and element appearance history.
 */

// --- Types ---

export interface IntersectionOptions {
  /** Element(s) to observe */
  target: HTMLElement | HTMLElement[];
  /** Root element for viewport (default: browser viewport) */
  root?: HTMLElement | null;
  /** Margin around root (CSS margin syntax) */
  rootMargin?: string;
  /** Visibility threshold(s) (0-1) */
  threshold?: number | number[];
  /** Callback when intersection state changes */
  onIntersect?: (entry: IntersectionEntry, observer: IntersectionHelperInstance) => void;
  /** Callback when element enters viewport */
  onEnter?: (entry: IntersectionEntry) => void;
  /** Callback when element leaves viewport */
  onLeave?: (entry: IntersectionEntry) => void;
  /** Only trigger once then auto-disconnect? */
  once?: boolean;
  /** Delay between repeated triggers in ms (throttle) */
  throttleMs?: number;
  /** Initial state to report before first observation */
  initialVisible?: boolean;
}

export interface IntersectionEntry {
  target: HTMLElement;
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRectReadOnly;
  intersectionRect: DOMRectReadOnly;
  rootBounds: DOMRectReadOnly | null;
  /** How long the element has been visible (ms), 0 if not visible */
  visibleDuration: number;
  /** Total times this element has entered the viewport */
  enterCount: number;
  /** Total times this element has left the viewport */
  leaveCount: number;
  /** Timestamp of last state change */
  lastChangeAt: number;
}

export interface IntersectionHelperInstance {
  /** The raw browser IntersectionObserver */
  observer: IntersectionObserver;
  /** Get current visibility state for all targets */
  getStates(): Map<HTMLElement, IntersectionEntry>;
  /** Get state for a specific target */
  getState(target: HTMLElement): IntersectionEntry | undefined;
  /** Check if a target is currently visible */
  isVisible(target: HTMLElement): boolean;
  /** Manually check all targets */
  check(): void;
  /** Observe additional targets */
  observe(targets: HTMLElement | HTMLElement[]): void;
  /** Unobserve specific targets */
  unobserve(targets: HTMLElement | HTMLElement[]): void;
  /** Disconnect all observations */
  disconnect(): void;
  /** Destroy completely */
  destroy(): void;
}

// --- Internal State ---

interface TargetState {
  entry: IntersectionEntry;
  visibleSince: number | null; // timestamp when became visible
  lastThrottleTime: number;
}

// --- Main Class ---

export class IntersectionHelper {
  create(options: IntersectionOptions): IntersectionHelperInstance {
    const states = new Map<HTMLElement, TargetState>();
    let destroyed = false;

    // Resolve options
    const threshold = options.threshold ?? 0;
    const throttleMs = options.throttleMs ?? 0;
    const triggerOnce = options.once ?? false;

    // Build callback
    const callback = (
      entries: IntersectionObserverEntry[],
      _obs: IntersectionObserver,
    ): void => {
      if (destroyed) return;

      for (const raw of entries) {
        const el = raw.target as HTMLElement;
        let state = states.get(el);

        // Initialize state on first observation
        if (!state) {
          state = {
            entry: buildEntry(el, raw, options.initialVisible),
            visibleSince: raw.isIntersecting ? Date.now() : null,
            lastThrottleTime: 0,
          };
          states.set(el, state);
        }

        const wasIntersecting = state.entry.isIntersecting;
        const now = Date.now();

        // Throttle check
        if (throttleMs > 0 && now - state.lastThrottleTime < throttleMs) {
          continue;
        }
        state.lastThrottleTime = now;

        // Update entry
        const newEntry = buildEntry(el, raw, wasIntersecting);

        // Track visibility duration
        if (raw.isIntersecting && !wasIntersecting) {
          // Entering viewport
          state.visibleSince = now;
          newEntry.enterCount = state.entry.enterCount + 1;
          newEntry.visibleDuration = 0;
          options.onEnter?.(newEntry);
        } else if (!raw.isIntersecting && wasIntersecting) {
          // Leaving viewport
          if (state.visibleSince) {
            newEntry.visibleDuration = now - state.visibleSince;
          }
          state.visibleSince = null;
          newEntry.leaveCount = state.entry.leaveCount + 1;
          options.onLeave?.(newEntry);
        } else if (raw.isIntersecting) {
          // Still visible — update duration
          if (state.visibleSince) {
            newEntry.visibleDuration = now - state.visibleSince;
          }
        }

        newEntry.lastChangeAt = now;
        state.entry = newEntry;

        // General callback
        options.onIntersect?.(newEntry, instance);

        // Once mode
        if (triggerOnce && raw.isIntersecting) {
          instance.unobserve(el);
        }
      }
    };

    // Create the actual observer
    const observer = new IntersectionObserver(callback, {
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? "0px",
      threshold: threshold,
    });

    // Add initial targets
    const initialTargets = Array.isArray(options.target) ? options.target : [options.target];
    for (const t of initialTargets) {
      if (t) observer.observe(t);
    }

    const instance: IntersectionHelperInstance = {
      observer,

      getStates(): Map<HTMLElement, IntersectionEntry> {
        const result = new Map<HTMLElement, IntersectionEntry>();
        for (const [el, s] of states) {
          result.set(el, { ...s.entry });
        }
        return result;
      },

      getState(target: HTMLElement): IntersectionEntry | undefined {
        return states.get(target)?.entry;
      },

      isVisible(target: HTMLElement): boolean {
        return states.get(target)?.entry.isIntersecting ?? false;
      },

      check(): void {
        // Force re-check by disconnecting and reconnecting
        // (or use takeRecords + re-trigger)
        for (const [el] of states) {
          observer.unobserve(el);
          observer.observe(el);
        }
      },

      observe(newTargets: HTMLElement | HTMLElement[]): void {
        const arr = Array.isArray(newTargets) ? newTargets : [newTargets];
        for (const t of arr) {
          if (t && !states.has(t)) {
            observer.observe(t);
            states.set(t, {
              entry: buildEntry(t, { isIntersecting: false } as IntersectionObserverEntry, false),
              visibleSince: null,
              lastThrottleTime: 0,
            });
          }
        }
      },

      unobserve(targetsToRemove: HTMLElement | HTMLElement[]): void {
        const arr = Array.isArray(targetsToRemove) ? targetsToRemove : [targetsToRemove];
        for (const t of arr) {
          if (states.has(t)) {
            observer.unobserve(t);
            states.delete(t);
          }
        }
      },

      disconnect(): void {
        observer.disconnect();
        states.clear();
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        instance.disconnect();
      },
    };

    return instance;
  }

  // Private helper kept for type consistency
  private buildEntry(_el: HTMLElement, _raw: IntersectionObserverEntry, _wasIntersecting: boolean): IntersectionEntry {
    return {} as IntersectionEntry; // Overridden by closure in create()
  }
}

function buildEntry(
  el: HTMLElement,
  raw: IntersectionObserverEntry,
  wasIntersecting: boolean,
): IntersectionEntry {
  return {
    target: el,
    isIntersecting: raw.isIntersecting,
    intersectionRatio: raw.intersectionRatio,
    boundingClientRect: raw.boundingClientRect,
    intersectionRect: raw.intersectionRect,
    rootBounds: raw.rootBounds,
    visibleDuration: 0,
    enterCount: raw.isIntersecting && !wasIntersecting ? 1 : 0,
    leaveCount: !raw.isIntersecting && wasIntersecting ? 1 : 0,
    lastChangeAt: Date.now(),
  };
}

/** Convenience: create an intersection helper */
export function createIntersectionHelper(options: IntersectionOptions): IntersectionHelperInstance {
  return new IntersectionHelper().create(options);
}

// --- Lazy Loading ---

/**
 * Lazy-load images by setting their src/data-src when they enter the viewport.
 *
 * @example
 * createLazyLoader({ selector: "img[data-src]", rootMargin: "200px" })
 */
export function createLazyLoader(options?: {
  selector?: string;
  rootMargin?: string;
  threshold?: number;
  onLoad?: (img: HTMLImageElement) => void;
  onError?: (img: HTMLImageElement) => void;
}): { loadAll: () => void; destroy: () => void } {
  const selector = options?.selector ?? 'img[data-src], img[data-lazy]';
  const images = Array.from(document.querySelectorAll<HTMLImageElement>(selector));

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;

      const img = entry.target as HTMLImageElement;
      observer.unobserve(img);

      const src = img.dataset.src || img.dataset.lazy;
      if (!src) continue;

      img.src = src;
      img.removeAttribute("data-src");
      img.removeAttribute("data-lazy");

      img.onload = () => options?.onLoad?.(img);
      img.onerror = () => options?.onError?.(img);
    }
  }, {
    rootMargin: options?.rootMargin ?? "200px",
    threshold: options?.threshold ?? 0,
  });

  for (const img of images) {
    observer.observe(img);
  }

  return {
    loadAll(): void {
      for (const img of images) {
        const src = img.dataset.src || img.dataset.lazy;
        if (src) {
          img.src = src;
          img.removeAttribute("data-src");
          img.removeAttribute("data-lazy");
        }
      }
      observer.disconnect();
    },
    destroy(): void {
      observer.disconnect();
    },
  };
}

// --- Scroll-Triggered Animation ---

/**
 * Add CSS class to elements when they scroll into view.
 * Useful for reveal-on-scroll animations.
 */
export function createScrollReveal(options?: {
  selector?: string;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  /** Delay in ms before adding class (for stagger effects) */
  delayMs?: number | ((index: number) => number);
  /** Remove class when leaving viewport? */
  resetOnLeave?: boolean;
  /** Only trigger once? */
  once?: boolean;
}): { refresh: () => void; destroy: () => void } {
  const selector = options?.selector ?? "[data-reveal]";
  const className = options?.className ?? "revealed";
  const revealedElements = new Set<HTMLElement>();

  function getTargets(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(selector));
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;

      if (entry.isIntersecting) {
        const delay = typeof options?.delayMs === "function"
          ? options.delayMs(Array.from(revealedElements).length)
          : (options?.delayMs ?? 0);

        setTimeout(() => {
          el.classList.add(className);
          revealedElements.add(el);
        }, delay);

        if (options?.once) {
          observer.unobserve(el);
        }
      } else if (options?.resetOnLeave && !options.once) {
        el.classList.remove(className);
        revealedElements.delete(el);
      }
    }
  }, {
    threshold: options?.threshold ?? 0.1,
    rootMargin: options?.rootMargin ?? "0px",
  });

  // Observe existing and future elements
  function refresh(): void {
    for (const el of getTargets()) {
      if (!revealedElements.has(el)) {
        observer.observe(el);
      }
    }
  }

  refresh();

  return { refresh, destroy: () => observer.disconnect() };
}

// --- Visibility Tracking ---

/**
 * Track how long an element has been visible (useful for analytics).
 */
export function trackVisibility(
  element: HTMLElement,
  callbacks?: {
    onVisible?: (duration: number) => void;
    onHidden?: (totalVisibleMs: number) => void;
  },
): { getTotalVisibleTime: () => number; destroy: () => void } {
  let totalVisibleMs = 0;
  let visibleSince: number | null = null;
  let destroyed = false;

  const observer = new IntersectionObserver((entries) => {
    if (destroyed) return;

    for (const entry of entries) {
      if (entry.isIntersecting && !visibleSince) {
        visibleSince = Date.now();
      } else if (!entry.isIntersecting && visibleSince) {
        const duration = Date.now() - visibleSince;
        totalVisibleMs += duration;
        visibleSince = null;
        callbacks?.onVisible?.(duration);
        callbacks?.onHidden?.(totalVisibleMs);
      }
    }
  });

  observer.observe(element);

  return {
    getTotalVisibleTime(): number {
      // Include current session if still visible
      let total = totalVisibleMs;
      if (visibleSince) {
        total += Date.now() - visibleSince;
      }
      return total;
    },
    destroy(): void {
      destroyed = true;
      // Finalize any ongoing visibility
      if (visibleSince) {
        totalVisibleMs += Date.now() - visibleSince;
        visibleSince = null;
      }
      observer.disconnect();
    },
  };
}
