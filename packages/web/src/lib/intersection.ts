/**
 * Intersection Observer: Viewport/element visibility detection with threshold config,
 * one-time observation, multiple targets, root margin, and convenience methods.
 */

// --- Types ---

export interface IntersectionObserverOptions {
  /** Element(s) to observe */
  target: HTMLElement | HTMLElement[];
  /** Root element for viewport (default: viewport) */
  root?: HTMLElement | null;
  /** Margin around root (CSS format: "10px 20px") */
  rootMargin?: string;
  /** Visibility threshold(s): 0-1 (0%=hidden, 1=fully visible) or array */
  threshold?: number | number[];
  /** Callback on visibility change */
  onIntersect?: (entry: IntersectionObserverEntry, observer: IntersectionObserverInstance) => void;
  /** Callback when element becomes visible */
  onVisible?: (entry: IntersectionObserverEntry) => void;
  /** Callback when element becomes hidden */
  onHidden?: (entry: IntersectionObserverEntry) => void;
  /** Only fire once, then auto-unobserve? */
  once?: boolean;
  /** Initial check without waiting for scroll? */
  initialCheck?: boolean;
}

export interface IntersectionObserverEntry {
  target: HTMLElement;
  isIntersecting: boolean;
  intersectionRatio: number;
  boundingClientRect: DOMRect;
  intersectionRect: DOMRect;
  rootBounds: DOMRect | null;
  time: number;
  isVisible: boolean;
  visibilityPercent: number; // 0-100
}

export interface IntersectionObserverInstance {
  /** The raw browser IntersectionObserver */
  observer: IntersectionObserver;
  /** Currently observed elements */
  getTargets: () => HTMLElement[];
  /** Check if a specific target is currently visible */
  isVisible: (target: HTMLElement) => boolean;
  /** Get current visibility ratio for a target */
  getVisibilityRatio: (target: HTMLElement) => number;
  /** Manually trigger a check */
  check: () => void;
  /** Observe additional targets */
  observe: (target: HTMLElement | HTMLElement[]) => void;
  /** Unobserve specific targets */
  unobserve: (target: HTMLElement | HTMLElement[]) => void;
  /** Unobserve all and disconnect */
  disconnect: () => void;
  /** Destroy completely */
  destroy: () => void;
}

// --- Helpers ---

function normalizeThresholds(threshold: number | number[]): number[] {
  if (Array.isArray(threshold)) return threshold;
  return [threshold];
}

function entryToPublic(entry: IntersectionObserverEntry): IntersectionObserverEntry {
  return {
    target: entry.target as HTMLElement,
    isIntersecting: entry.isIntersecting,
    intersectionRatio: entry.intersectionRatio,
    boundingClientRect: entry.boundingClientRect,
    intersectionRect: entry.intersectionRect,
    rootBounds: entry.rootBounds ? entry.rootBounds : null,
    time: entry.time,
    isVisible: entry.isIntersecting && entry.intersectionRatio > 0,
    visibilityPercent: Math.round(entry.intersectionRatio * 100),
  };
}

// --- Main Class ---

export class IntersectionManager {
  create(options: IntersectionObserverOptions): IntersectionObserverInstance {
    const targets = new Set<HTMLElement>();
    const once = options.once ?? false;
    let destroyed = false;

    // Build observer callback
    const callback = (entries: IntersectionObserverV2Entry[], obs: IntersectionObserverV2) => {
      if (destroyed) return;

      for (const entry of entries) {
        const publicEntry = entryToPublic(entry);

        // General callback
        options.onIntersect?.(publicEntry, instance);

        // Specific callbacks
        if (publicEntry.isVisible) {
          options.onVisible?.(publicEntry);
        } else {
          options.onHidden?.(publicEntry);
        }

        // Once mode: auto-unobserve after first visible
        if (once && publicEntry.isVisible) {
          obs.unobserve(entry.target);
          targets.delete(entry.target as HTMLElement);
        }
      }
    };

    // Create the actual observer
    const observerOptions: IntersectionObserverInit = {
      root: options.root ?? undefined,
      rootMargin: options.rootMargin ?? "0px",
      threshold: normalizeThresholds(options.threshold ?? 0),
    };

    const observer = new IntersectionObserver(callback, observerOptions);

    // Add initial targets
    const initialTargets = Array.isArray(options.target) ? options.target : [options.target];
    for (const t of initialTargets) {
      if (t) {
        observer.observe(t);
        targets.add(t);
      }
    }

    // Initial check if requested
    if (options.initialCheck) {
      requestAnimationFrame(() => instance.check());
    }

    const instance: IntersectionObserverInstance = {
      observer,

      getTargets() { return Array.from(targets); },

      isVisible(target: HTMLElement) {
        const ratio = instance.getVisibilityRatio(target);
        return ratio > 0;
      },

      getVisibilityRatio(target: HTMLElement) {
        for (const entry of observer.takeRecords()) {
          // Process pending entries silently
        }
        // Force synchronous check by checking computed styles
        const rect = target.getBoundingClientRect();
        if (!rect.width && !rect.height) return 0;

        const rootRect = options.root
          ? (options.root as HTMLElement).getBoundingClientRect()
          : { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };

        const visibleWidth = Math.min(rect.width, Math.max(0, rootRect.right - rect.left));
        const visibleHeight = Math.min(rect.height, Math.max(0, rootRect.bottom - rect.top));

        return (visibleWidth * visibleHeight) / (rect.width * rect.height || 1);
      },

      check() {
        observer.takeRecords(); // Flush pending entries (triggers callback)
      },

      observe(newTargets: HTMLElement | HTMLElement[]) {
        const arr = Array.isArray(newTargets) ? newTargets : [newTargets];
        for (const t of arr) {
          if (t && !targets.has(t)) {
            observer.observe(t);
            targets.add(t);
          }
        }
      },

      unobserve(targetsToRemove: HTMLElement | HTMLElement[]) {
        const arr = Array.isArray(targetsToRemove) ? targetsToRemove : [targetsToRemove];
        for (const t of arr) {
          if (targets.has(t)) {
            observer.unobserve(t);
            targets.delete(t);
          }
        }
      },

      disconnect() {
        observer.disconnect();
        targets.clear();
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        instance.disconnect();
      },
    };

    return instance;
  }
}

/** Convenience: create an intersection observer */
export function createIntersectionObserver(options: IntersectionObserverOptions): IntersectionObserverInstance {
  return new IntersectionManager().create(options);
}

// --- Convenience functions ---

/** Observe element and return promise that resolves when visible */
export function whenVisible(
  target: HTMLElement,
  options?: Omit<IntersectionObserverOptions, "onIntersect" | "onVisible" | "onHidden">,
): Promise<IntersectionObserverEntry> {
  return new Promise((resolve) => {
    const obs = createIntersectionObserver({
      ...options,
      target,
      once: true,
      onVisible: (entry) => resolve(entry),
    });
  });
}

/** Observe element and return promise that resolves when hidden */
export function whenHidden(
  target: HTMLElement,
  options?: Omit<IntersectionObserverOptions, "onIntersect" | "onVisible" | "onHidden">,
): Promise<IntersectionObserverEntry> {
  return new Promise((resolve) => {
    const obs = createIntersectionObserver({
      ...options,
      target,
      once: true,
      onHidden: (entry) => resolve(entry),
    });
  });
}

/** Check if element is in viewport right now (synchronous) */
export function isInViewport(target: HTMLElement, margin = 0): boolean {
  const rect = target.getBoundingClientRect();
  return (
    rect.top >= -margin &&
    rect.left >= -margin &&
    rect.bottom <= (window.innerHeight + margin) &&
    rect.right <= (window.innerWidth + margin)
  );
}

/** Get how much of an element is visible (0-100 percentage) */
export function getVisibilityPercent(target: HTMLElement): number {
  const rect = target.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return 0;

  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  const visibleWidth = Math.max(0, Math.min(rect.right, viewWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0));

  return Math.round((visibleWidth * visibleHeight) / (rect.width * rect.height) * 100));
}
