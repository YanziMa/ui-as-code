/**
 * Intersection Observer: Viewport visibility detection with threshold control,
 * root margin, multiple observation modes (once/continuous/repeat), lazy loading,
 * infinite scroll triggers, scroll-direction detection, and performance optimizations.
 */

// --- Types ---

export type VisibilityState = "visible" | "hidden" | "partial";
export type ObserveMode = "once" | "continuous" | "repeat";

export interface IntersectionOptions {
  /** Element(s) to observe */
  target: HTMLElement | HTMLElement[];
  /** Root element for intersection (default: viewport) */
  root?: HTMLElement | null;
  /** Margin around the root (CSS format) */
  rootMargin?: string;
  /** Threshold(s) at which to trigger callback */
  threshold?: number | number[];
  /** Observation mode */
  mode?: ObserveMode;
  /** Callback when visibility changes */
  onIntersect?: (entry: IntersectionEntryEx) => void;
  /** Callback when element becomes visible */
  onVisible?: (entry: IntersectionEntryEx) => void;
  /** Callback when element becomes hidden */
  onHidden?: (entry: IntersectionEntryEx) => void;
  /** Initial check without waiting for scroll? */
  initialCheck?: boolean;
  /** Delay before reporting visible (ms, for animations) */
  visibleDelay?: number;
  /** Minimum time visible before triggering (ms) */
  minVisibleTime?: number;
  /** Unobserve after first visibility? (alias for mode="once") */
  unobserveOnVisible?: boolean;
  /** Track scroll direction? */
  trackScrollDirection?: boolean;
}

export interface IntersectionEntryEx extends Omit<IntersectionEntry, "target"> {
  target: HTMLElement;
  /** Simplified visibility state */
  state: VisibilityState;
  /** Whether this is the first observation */
  isFirstObservation: boolean;
  /** Scroll direction at time of intersection ("up", "down", "none") */
  scrollDirection?: "up" | "down" | "none";
  /** Time spent visible in ms (cumulative) */
  timeVisible: number;
  /** Ratio of time visible vs total observed */
  visibilityRatio: number;
  /** Timestamp of this entry */
  timestamp: number;
}

export interface IntersectionInstance {
  /** The raw browser IntersectionObserver */
  observer: IntersectionObserver;
  /** Get current state of all targets */
  getStates: () => Map<HTMLElement, IntersectionEntryEx>;
  /** Get state for a specific target */
  getState: (target: HTMLElement) => IntersectionEntryEx | undefined;
  /** Check if a target is currently visible */
  isVisible: (target: HTMLElement) => boolean;
  /** Manually trigger a check */
  check: () => void;
  /** Add more targets to observe */
  observe: (target: HTMLElement | HTMLElement[]) => void;
  /** Stop observing specific targets */
  unobserve: (target: HTMLElement | HTMLElement[]) => void;
  /** Disconnect all observations */
  disconnect: () => void;
  /** Destroy completely */
  destroy: () => void;
}

// --- Internal State ---

interface TargetState {
  wasVisible: boolean;
  firstSeenAt: number | null;
  totalVisibleTime: number;
  lastVisibleAt: number | null;
  lastHiddenAt: number | null;
  visibleTimer: ReturnType<typeof setTimeout> | null;
  entryCount: number;
}

// --- Helpers ---

function resolveThreshold(threshold: number | number[] | undefined): number[] {
  if (threshold === undefined) return [0];
  if (typeof threshold === "number") return [threshold];
  return threshold;
}

let lastScrollY = -1;

function getScrollDirection(): "up" | "down" | "none" {
  const y = window.scrollY;
  if (lastScrollY === -1) { lastScrollY = y; return "none"; }
  const dir = y > lastScrollY ? "down" : y < lastScrollY ? "up" : "none";
  lastScrollY = y;
  return dir;
}

// --- Main Class ---

export class IntersectionWatcher {
  create(options: IntersectionOptions): IntersectionInstance {
    const targets = new Map<HTMLElement, TargetState>();
    const states = new Map<HTMLElement, IntersectionEntryEx>();
    let destroyed = false;
    let scrollListener: (() => void) | null = null;

    // Resolve options
    const thresholds = resolveThreshold(options.threshold);
    const mode = options.mode ?? "continuous";

    // Build observer callback
    const callback = (entries: IntersectionObserverEntry[]) => {
      if (destroyed) return;

      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        let state = targets.get(el);

        if (!state) {
          state = {
            wasVisible: false,
            firstSeenAt: null,
            totalVisibleTime: 0,
            lastVisibleAt: null,
            lastHiddenAt: null,
            visibleTimer: null,
            entryCount: 0,
          };
          targets.set(el, state);
        }

        state.entryCount++;
        const isNowVisible = entry.isIntersecting && entry.intersectionRatio > 0;
        const prevState = state.wasVisible;
        const now = Date.now();

        // Track visible time
        if (isNowVisible && !prevState) {
          // Just became visible
          state.firstSeenAt ??= now;
          state.lastVisibleAt = now;

          // Min visible time check
          if (options.minVisibleTime && options.minVisibleTime > 0) {
            state.visibleTimer = setTimeout(() => {
              reportVisibility(el, entry, true, now);
            }, options.minVisibleTime);
          } else {
            reportVisibility(el, entry, true, now);
          }
        } else if (!isNowVisible && prevState) {
          // Just became hidden
          if (state.lastVisibleAt) {
            state.totalVisibleTime += now - state.lastVisibleAt;
          }
          state.lastHiddenAt = now;

          if (state.visibleTimer) {
            clearTimeout(state.visibleTimer);
            state.visibleTimer = null;
          }

          reportVisibility(el, entry, false, now);

          // Repeat mode: re-observe after hiding
          if (mode === "repeat") {
            // Will be picked up again naturally by the observer
          }
        } else if (isNowVisible) {
          // Still visible, update tracking
          state.lastVisibleAt = now;
        }

        state.wasVisible = isNowVisible;

        // Store latest state
        const exEntry: IntersectionEntryEx = {
          ...entry,
          target: el,
          state: isNowVisible
            ? (entry.intersectionRatio >= 1 ? "visible" : "partial")
            : "hidden",
          isFirstObservation: state.entryCount <= 1,
          scrollDirection: options.trackScrollDirection ? getScrollDirection() : undefined,
          timeVisible: state.totalVisibleTime + (state.lastVisibleAt ? now - state.lastVisibleAt! : 0),
          visibilityRatio: state.entryCount > 0
            ? (state.totalVisibleTime + (state.lastVisibleAt ? now - state.lastVisibleAt! : 0)) / (now - (state.firstSeenAt ?? now))
            : 0,
          timestamp: now,
        };
        states.set(el, exEntry);
      }
    };

    function reportVisibility(
      el: HTMLElement,
      rawEntry: IntersectionEntry,
      visible: boolean,
      now: number,
    ): void {
      const state = targets.get(el)!;
      const exEntry: IntersectionEntryEx = {
        ...rawEntry,
        target: el,
        state: visible
          ? (rawEntry.intersectionRatio >= 1 ? "visible" : "partial")
          : "hidden",
        isFirstObservation: state.entryCount <= 1,
        scrollDirection: options.trackScrollDirection ? getScrollDirection() : undefined,
        timeVisible: state.totalVisibleTime,
        visibilityRatio: state.totalVisibleTime / Math.max(1, now - (state.firstSeenAt ?? now)),
        timestamp: now,
      };

      if (visible) {
        // Visible delay
        if (options.visibleDelay && options.visibleDelay > 0) {
          setTimeout(() => {
            if (!destroyed) options.onVisible?.(exEntry);
          }, options.visibleDelay);
        } else {
          options.onVisible?.(exEntry);
        }

        // General intersect callback
        options.onIntersect?.(exEntry);

        // Unobserve if configured
        if (options.unobserveOnVisible || mode === "once") {
          obs.unobserve(el);
          targets.delete(el);
        }
      } else {
        options.onHidden?.(exEntry);
        options.onIntersect?.(exEntry);
      }

      states.set(el, exEntry);
    }

    // Create observer
    const observerOptions: IntersectionObserverInit = {
      root: options.root ?? null,
      rootMargin: options.rootMargin ?? "0px",
      threshold: thresholds,
    };

    const observer = new IntersectionObserver(callback, observerOptions);

    // Register targets
    const initialTargets = Array.isArray(options.target) ? options.target : [options.target];
    for (const t of initialTargets) {
      if (t) observer.observe(t);
    }

    // Scroll direction tracking
    if (options.trackScrollDirection) {
      scrollListener = () => { /* direction computed lazily */ };
      window.addEventListener("scroll", scrollListener, { passive: true });
    }

    // Initial check
    if (options.initialCheck !== false) {
      // Force an immediate check via takeRecords + manual invocation
      requestAnimationFrame(() => {
        const records = observer.takeRecords();
        if (records.length > 0) {
          callback(records);
        }
      });
    }

    const instance: IntersectionInstance = {
      observer,

      getStates() { return new Map(states); },

      getState(target: HTMLElement) { return states.get(target); },

      isVisible(target: HTMLElement) {
        const s = states.get(target);
        return s?.state === "visible" || s?.state === "partial";
      },

      check() {
        // Trigger re-evaluation
        const records = observer.takeRecords();
        if (records.length > 0) callback(records);
      },

      observe(newTargets: HTMLElement | HTMLElement[]) {
        const arr = Array.isArray(newTargets) ? newTargets : [newTargets];
        for (const t of arr) {
          if (t && !targets.has(t)) {
            observer.observe(t);
            targets.set(t, {
              wasVisible: false,
              firstSeenAt: null,
              totalVisibleTime: 0,
              lastVisibleAt: null,
              lastHiddenAt: null,
              visibleTimer: null,
              entryCount: 0,
            });
          }
        }
      },

      unobserve(targetsToRemove: HTMLElement | HTMLElement[]) {
        const arr = Array.isArray(targetsToRemove) ? targetsToRemove : [targetsToRemove];
        for (const t of arr) {
          observer.unobserve(t);
          targets.delete(t);
          states.delete(t);
        }
      },

      disconnect() {
        observer.disconnect();
        targets.clear();
        states.clear();
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        instance.disconnect();
        if (scrollListener) {
          window.removeEventListener("scroll", scrollListener);
          scrollListener = null;
        }
      },
    };

    return instance;
  }
}

/** Convenience: create an intersection observer */
export function createIntersectionObserver(options: IntersectionOptions): IntersectionInstance {
  return new IntersectionWatcher().create(options);
}

// --- High-Level Convenience Functions ---

/** Lazy load images when they enter viewport */
export function lazyLoadImages(
  container: HTMLElement | Document = document,
  options?: {
    rootMargin?: string;
    threshold?: number;
    dataAttr?: string; // default: data-src
    onLoad?: (img: HTMLImageElement) => void;
  },
): () => void {
  const attr = options?.dataAttr ?? "data-src";
  const images = Array.from((container as Document | HTMLElement).querySelectorAll<HTMLElement>(`img[${attr}]`));

  if (images.length === 0) return () => {};

  const obs = createIntersectionObserver({
    target: images as HTMLElement[],
    rootMargin: options?.rootMargin ?? "200px",
    threshold: options?.threshold ?? 0,
    mode: "once",
    onVisible(entry) {
      const img = entry.target as HTMLImageElement;
      const src = img.getAttribute(attr);
      if (src) {
        img.src = src;
        img.removeAttribute(attr);
        img.addEventListener("load", () => options?.onLoad?.(img), { once: true });
      }
    },
  });

  return () => obs.destroy();
}

/** Detect when element enters/exits viewport with callbacks */
export function watchVisibility(
  element: HTMLElement,
  callbacks: {
    onEnter?: () => void;
    onExit?: () => void;
    onPartialEnter?: () => void;
    onPartialExit?: () => void;
  },
  options?: { rootMargin?: string; threshold?: number },
): () => void {
  let wasInViewport = false;
  let wasFullyVisible = false;

  const obs = createIntersectionObserver({
    target: element,
    rootMargin: options?.rootMargin ?? "0px",
    threshold: options?.threshold ?? [0, 0.25, 0.5, 0.75, 1],
    mode: "continuous",
    onIntersect(entry) {
      const isFullyVisible = entry.intersectionRatio >= 1;
      const isPartiallyVisible = entry.intersectionRatio > 0;

      if (isPartiallyVisible && !wasInViewport) {
        wasInViewport = true;
        if (isFullyVisible) {
          wasFullyVisible = true;
          callbacks.onEnter?.();
        } else {
          callbacks.onPartialEnter?.();
        }
      } else if (!isPartiallyVisible && wasInViewport) {
        wasInViewport = false;
        if (wasFullyVisible) {
          wasFullyVisible = false;
          callbacks.onExit?.();
        } else {
          callbacks.onPartialExit?.();
        }
      } else if (isPartiallyVisible && wasInViewport) {
        // Transition between partial and full
        if (isFullyVisible && !wasFullyVisible) {
          wasFullyVisible = true;
          callbacks.onEnter?.();
        } else if (!isFullyVisible && wasFullyVisible) {
          wasFullyVisible = false;
          callbacks.onExit?.();
        }
      }
    },
  });

  return () => obs.destroy();
}

/** Create an infinite scroll sentinel that fires when near bottom */
export function createInfiniteScrollSentinel(
  container: HTMLElement,
  onLoadMore: () => void | Promise<void>,
  options?: {
    rootMargin?: string;
    distance?: number; // px from bottom to trigger
    disabled?: boolean;
  },
): { sentinel: HTMLElement; destroy: () => void } {
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "width:100%;height:1px;pointer-events:none;";
  sentinel.setAttribute("data-infinite-scroll-sentinel", "");
  container.appendChild(sentinel);

  let loading = false;

  const obs = createIntersectionObserver({
    target: sentinel,
    rootMargin: options?.rootMargin ?? `${options?.distance ?? 200}px`,
    threshold: 0,
    mode: "continuous",
    async onVisible(entry) {
      if (options?.disabled || loading || !entry.isIntersecting) return;
      loading = true;
      try {
        await onLoadMore();
      } finally {
        loading = false;
        instance.check(); // Re-check in case still in view
      }
    },
  });

  const instance = obs;

  return {
    sentinel,
    destroy: () => {
      sentinel.remove();
      instance.destroy();
    },
  };
}
