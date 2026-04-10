/**
 * Intersection Manager: Advanced IntersectionObserver wrapper supporting
 * multiple targets, entry/exit/visibility-change callbacks, once semantics,
 * root margin/threshold config, visibility ratio tracking, and lifecycle management.
 */

// --- Types ---

export interface IntersectionTarget {
  /** The element being observed */
  element: HTMLElement;
  /** Custom data attached to this target */
  data?: unknown;
  /** Whether this target has been seen at least once */
  seen: boolean;
  /** Last known intersection ratio (0-1) */
  lastRatio: number;
  /** Last known isIntersecting state */
  lastVisible: boolean;
  /** Timestamp of first intersection (ms since epoch) */
  firstSeenAt: number | null;
  /** Timestamp of most recent intersection */
  lastSeenAt: number | null;
  /** Total time visible (accumulated, ms) */
  totalVisibleTime: number;
  /** Timer for accumulating visible time */
  _visibleStart: number | null;
}

export interface IntersectionManagerOptions {
  /** Root element for intersection (null = viewport) */
  root?: HTMLElement | null;
  /** Root margin (CSS margin syntax, e.g. "0px 0px -100px 0px") */
  rootMargin?: string;
  /** Threshold(s) at which to trigger (0-1, e.g. [0, 0.25, 0.5, 0.75, 1]) */
  threshold?: number | number[];
  /** Callback when any target enters viewport */
  onEnter?: (target: IntersectionTarget, entry: IntersectionObserverEntry) => void;
  /** Callback when any target leaves viewport */
  onExit?: (target: IntersectionTarget, entry: IntersectionObserverEntry) => void;
  /** Callback when visibility ratio changes */
  onVisibilityChange?: (target: IntersectionTarget, entry: IntersectionObserverEntry) => void;
  /** Callback when a target becomes fully visible (ratio >= 1) */
  onFullyVisible?: (target: IntersectionTarget, entry: IntersectionObserverEntry) => void;
  /** Only fire once per target, then auto-unobserve? */
  once?: boolean;
  /** Delay before firing onEnter (ms, default: 0) */
  enterDelay?: number;
  /** Delay before firing onExit (ms, default: 0) */
  exitDelay?: number;
  /** Minimum time target must be visible to count as "seen" (ms, default: 0) */
  minVisibleTime?: number;
  /** Auto-start observing on creation (default: true) */
  autoStart?: boolean;
}

export interface IntersectionManagerInstance {
  /** Observe one or more elements */
  observe: (element: HTMLElement | HTMLElement[], data?: unknown) => void;
  /** Unobserve one or more elements */
  unobserve: (element: HTMLElement | HTMLElement[]) => void;
  /** Check if an element is currently being observed */
  isObserving: (element: HTMLElement) => boolean;
  /** Get target data for an element */
  getTarget: (element: HTMLElement) => IntersectionTarget | undefined;
  /** Get all targets */
  getTargets: () => IntersectionTarget[];
  /** Get all currently visible targets */
  getVisibleTargets: () => IntersectionTarget[];
  /** Get visibility ratio for a specific element */
  getVisibilityRatio: (element: HTMLElement) => number;
  /** Check if element has been seen at least once */
  hasBeenSeen: (element: HTMLElement) => boolean;
  /** Force a check of all targets */
  check: () => void;
  /** Pause observations (keeps targets registered) */
  pause: () => void;
  /** Resume observations */
  resume: () => void;
  /** Disconnect and clear all targets */
  disconnect: () => void;
  /** Destroy completely */
  destroy: () => void;
}

// --- Internal ---

interface DelayedAction {
  timer: ReturnType<typeof setTimeout>;
  target: IntersectionTarget;
  type: "enter" | "exit";
}

// --- Main Class ---

export class IntersectionManager {
  create(options: IntersectionManagerOptions = {}): IntersectionManagerInstance {
    const targets = new Map<HTMLElement, IntersectionTarget>();
    let destroyed = false;
    let paused = false;
    const delayedActions: DelayedAction[] = [];

    // Resolve options
    const root = options.root ?? null;
    const rootMargin = options.rootMargin ?? "0px";
    const threshold = options.threshold ?? [0, 0.1, 0.25, 0.5, 0.75, 1];
    const once = options.once ?? false;
    const enterDelay = options.enterDelay ?? 0;
    const exitDelay = options.exitDelay ?? 0;
    const minVisibleTime = options.minVisibleTime ?? 0;
    const autoStart = options.autoStart !== false;

    // Create observer
    let observer: IntersectionObserver | null = null;

    function createObserver(): void {
      if (observer) return;
      observer = new IntersectionObserver(callback, {
        root,
        rootMargin,
        threshold,
      });
    }

    // Observer callback
    const callback = (entries: IntersectionObserverEntry[], _obs: IntersectionObserver) => {
      if (destroyed || paused) return;

      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const target = targets.get(el);
        if (!target) continue;

        const wasVisible = target.lastVisible;
        const isVisible = entry.isIntersecting;
        target.lastRatio = entry.intersectionRatio;
        target.lastVisible = isVisible;

        if (isVisible) {
          target.lastSeenAt = Date.now();

          // Track visible time
          if (target._visibleStart === null) {
            target._visibleStart = Date.now();
          }

          // First time seeing this element
          if (!target.seen) {
            if (minVisibleTime > 0) {
              // Wait for minimum visible time
              setTimeout(() => {
                if (targets.has(el) && target.lastVisible && !target.seen) {
                  target.seen = true;
                  target.firstSeenAt = Date.now();
                  // Accumulate time from when we started tracking
                  if (target._visibleStart !== null) {
                    target.totalVisibleTime += Date.now() - target._visibleStart;
                  }
                }
              }, minVisibleTime);
            } else {
              target.seen = true;
              target.firstSeenAt = Date.now();
            }
          }
        } else {
          // Accumulate visible time
          if (target._visibleStart !== null) {
            target.totalVisibleTime += Date.now() - target._visibleStart;
            target._visibleStart = null;
          }
        }

        // Visibility change callback (fires on every ratio change)
        options.onVisibilityChange?.(target, entry);

        // Fully visible
        if (entry.intersectionRatio >= 1) {
          options.onFullyVisible?.(target, entry);
        }

        // Enter transition
        if (!wasVisible && isVisible) {
          if (enterDelay > 0) {
            // Cancel any pending exit for this target
            cancelDelayed(target, "exit");
            const timer = setTimeout(() => {
              if (destroyed || !targets.has(el)) return;
              fireEnter(target, entry);
              // Once semantics
              if (once) {
                unobserveSingle(el);
              }
            }, enterDelay);
            delayedActions.push({ timer, target, type: "enter" });
          } else {
            fireEnter(target, entry);
            if (once) {
              unobserveSingle(el);
            }
          }
        }

        // Exit transition
        if (wasVisible && !isVisible) {
          if (exitDelay > 0) {
            cancelDelayed(target, "enter");
            const timer = setTimeout(() => {
              if (destroyed || !targets.has(el)) return;
              // Re-check it's still not visible
              const current = targets.get(el);
              if (current?.lastVisible === false) {
                fireExit(target, entry);
              }
            }, exitDelay);
            delayedActions.push({ timer, target, type: "exit" });
          } else {
            fireExit(target, entry);
          }
        }
      }
    };

    function fireEnter(target: IntersectionTarget, entry: IntersectionObserverEntry): void {
      options.onEnter?.(target, entry);
    }

    function fireExit(target: IntersectionTarget, entry: IntersectionObserverEntry): void {
      options.onExit?.(target, entry);
    }

    function cancelDelayed(target: IntersectionTarget, type: "enter" | "exit"): void {
      const idx = delayedActions.findIndex(
        (d) => d.target === target.element && d.type === type
      );
      if (idx >= 0) {
        clearTimeout(delayedActions[idx]!.timer);
        delayedActions.splice(idx, 1);
      }
    }

    function createTarget(el: HTMLElement, data?: unknown): IntersectionTarget {
      return {
        element: el,
        data,
        seen: false,
        lastRatio: 0,
        lastVisible: false,
        firstSeenAt: null,
        lastSeenAt: null,
        totalVisibleTime: 0,
        _visibleStart: null,
      };
    }

    function unobserveSingle(el: HTMLElement): void {
      if (observer) observer.unobserve(el);
      const target = targets.get(el);
      if (target?._visibleStart !== null) {
        target.totalVisibleTime += Date.now() - target._visibleStart;
        target._visibleStart = null;
      }
      targets.delete(el);
    }

    // Build instance
    const instance: IntersectionManagerInstance = {
      observe(element: HTMLElement | HTMLElement[], data?: unknown): void {
        if (destroyed) return;
        createObserver();
        const elements = Array.isArray(element) ? element : [element];
        for (const el of elements) {
          if (el && !targets.has(el)) {
            const target = createTarget(el, data);
            targets.set(el, target);
            observer!.observe(el);
          }
        }
      },

      unobserve(element: HTMLElement | HTMLElement[]): void {
        const elements = Array.isArray(element) ? element : [element];
        for (const el of elements) {
          unobserveSingle(el);
        }
      },

      isObserving(element: HTMLElement): boolean {
        return targets.has(element);
      },

      getTarget(element: HTMLElement): IntersectionTarget | undefined {
        return targets.get(element);
      },

      getTargets(): IntersectionTarget[] {
        return Array.from(targets.values());
      },

      getVisibleTargets(): IntersectionTarget[] {
        return Array.from(targets.values()).filter((t) => t.lastVisible);
      },

      getVisibilityRatio(element: HTMLElement): number {
        return targets.get(element)?.lastRatio ?? 0;
      },

      hasBeenSeen(element: HTMLElement): boolean {
        return targets.get(element)?.seen ?? false;
      },

      check(): void {
        if (!observer) return;
        // Force observer to re-check by disconnecting/reconnecting
        observer.disconnect();
        for (const el of targets.keys()) {
          observer.observe(el);
        }
      },

      pause(): void {
        paused = true;
        // Flush any pending timers
        for (const da of delayedActions) {
          clearTimeout(da.timer);
        }
        delayedActions.length = 0;
        // Accumulate visible time for currently visible targets
        for (const [, target] of targets) {
          if (target._visibleStart !== null) {
            target.totalVisibleTime += Date.now() - target._visibleStart;
            target._visibleStart = null;
          }
        }
      },

      resume(): void {
        paused = false;
        // Re-check current state
        instance.check();
      },

      disconnect(): void {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        // Clear delayed actions
        for (const da of delayedActions) {
          clearTimeout(da.timer);
        }
        delayedActions.length = 0;
        // Finalize visible times
        for (const [, target] of targets) {
          if (target._visibleStart !== null) {
            target.totalVisibleTime += Date.now() - target._visibleStart;
            target._visibleStart = null;
          }
        }
        targets.clear();
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        instance.disconnect();
      },
    };

    // Auto-start
    if (autoStart) {
      createObserver();
    }

    return instance;
  }
}

// --- Convenience Functions ---

/** Create an intersection manager instance */
export function createIntersectionManager(options?: IntersectionManagerOptions): IntersectionManagerInstance {
  return new IntersectionManager().create(options);
}

/** Observe element(s) and call callback when they enter viewport once */
export function whenInView(
  element: HTMLElement | HTMLElement[],
  options?: {
    rootMargin?: string;
    threshold?: number;
    onEnter?: (target: IntersectionTarget, entry: IntersectionObserverEntry) => void;
    timeout?: number;
  },
): Promise<IntersectionTarget[]> {
  return new Promise((resolve, reject) => {
    const { timeout = 30000 } = options ?? {};
    const seen: IntersectionTarget[] = [];
    const elements = Array.isArray(element) ? element : [element];

    if (elements.length === 0) {
      resolve([]);
      return;
    }

    const mgr = createIntersectionManager({
      rootMargin: options?.rootMargin,
      threshold: options?.threshold ?? 0.1,
      once: true,
      onEnter: (target, entry) => {
        seen.push(target);
        options?.onEnter?.(target, entry);
        if (seen.length >= elements.length) {
          cleanup();
          resolve(seen);
        }
      },
    });

    mgr.observe(elements);

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout: only ${seen.length}/${elements.length} elements entered view`));
    }, timeout);

    function cleanup(): void {
      clearTimeout(timer);
      mgr.destroy();
    }
  });
}

/** Track how long elements are visible (returns a manager you can poll) */
export function trackVisibility(
  element: HTMLElement,
  options?: {
    rootMargin?: string;
    threshold?: number;
  },
): IntersectionManagerInstance {
  return createIntersectionManager({
    rootMargin: options?.rootMargin,
    threshold: options?.threshold ?? 0,
    ...options,
  });
}

/** Lazy-load elements: add class when they enter viewport */
export function lazyLoadElements(
  selector: string,
  options?: {
    root?: HTMLElement;
    rootMargin?: string;
    loadedClass?: string;   // default: "lazy-loaded"
    loadingClass?: string;  // default: "lazy-loading"
    threshold?: number;
  },
): () => void {
  const loadedClass = options?.loadedClass ?? "lazy-loaded";
  const loadingClass = options?.loadingClass ?? "lazy-loading";

  const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  if (elements.length === 0) return () => {};

  // Add loading class immediately
  for (const el of elements) {
    el.classList.add(loadingClass);
  }

  const mgr = createIntersectionManager({
    root: options?.root,
    rootMargin: options?.rootMargin,
    threshold: options?.threshold ?? 0.1,
    once: true,
    onEnter: (target) => {
      target.element.classList.remove(loadingClass);
      target.element.classList.add(loadedClass);
    },
  });

  mgr.observe(elements);

  return () => mgr.destroy();
}
