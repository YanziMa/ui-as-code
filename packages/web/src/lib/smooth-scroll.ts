/**
 * Smooth Scroll: Programmatic smooth scrolling with easing functions,
 * duration control, cancellation, progress callbacks, and
 * both window and element-level scrolling.
 */

// --- Types ---

export type EasingFn = (t: number) => number;

export interface SmoothScrollOptions {
  /** Target X position */
  x?: number;
  /** Target Y position */
  y?: number;
  /** Duration in ms (default: 400) */
  duration?: number;
  /** Easing function (default: easeOutCubic) */
  easing?: EasingFn;
  /** Container to scroll (default: window) */
  container?: HTMLElement | Window;
  /** Callback on each frame with progress (0-1) */
  onProgress?: (progress: number, x: number, y: number) => void;
  /** Callback when scroll completes */
  onComplete?: () => void;
  /** Callback when scroll is cancelled */
  onCancel?: () => void;
}

export interface SmoothScrollInstance {
  /** Start or restart the scroll animation */
  start: (x?: number, y?: number) => Promise<void>;
  /** Cancel the current animation */
  cancel: () => void;
  /** Check if currently animating */
  isAnimating: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Easing Functions ---

export const easings: Record<string, EasingFn> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => 1 - (1 - t) * (1 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  easeOutExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t) * Math.cos(t * ((2 * Math.PI) / 3)),
  easeInExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)) * Math.cos((t * (2 * Math.PI)) / 3) + 1),
  easeInOutExpo: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) * Math.cos((20 * t - 11) * (Math.PI * 12) / 12) / 2
      : (2 - Math.pow(2, -20 * t + 10) * Math.cos((20 * t - 11) * (Math.PI * 12) / 12)) / 2 + 1;
  },
};

// --- Main Class ---

export class SmoothScroller {
  create(options?: Partial<SmoothScrollOptions>): SmoothScrollInstance {
    const opts = {
      x: options?.x ?? 0,
      y: options?.y ?? 0,
      duration: options?.duration ?? 400,
      easing: options?.easing ?? easings.easeOutCubic,
      container: options?.container ?? window,
      ...options,
    };

    let rafId: number | null = null;
    let cancelled = false;
    let destroyed = false;

    function doScroll(targetX?: number, targetY?: number): Promise<void> {
      // Cancel any existing animation
      cancel();

      const tx = targetX ?? opts.x;
      const ty = targetY ?? opts.y;

      cancelled = false;

      // Get current position
      let startX: number, startY: number;
      if (opts.container instanceof Window) {
        startX = window.scrollX;
        startY = window.scrollY;
      } else if (opts.container instanceof HTMLElement) {
        startX = opts.container.scrollLeft;
        startY = opts.container.scrollTop;
      } else {
        startX = 0; startY = 0;
      }

      const startTime = performance.now();
      const dur = opts.duration;

      return new Promise((resolve) => {
        function step(now: number) {
          if (cancelled || destroyed) {
            opts.onCancel?.();
            resolve();
            return;
          }

          const elapsed = now - startTime;
          const progress = Math.min(elapsed / dur, 1);
          const eased = opts.easing(progress);

          const currentX = startX + (tx - startX) * eased;
          const currentY = startY + (ty - startY) * eased;

          opts.onProgress?.(progress, currentX, currentY);

          if (opts.container instanceof Window) {
            window.scrollTo(currentX, currentY);
          } else if (opts.container instanceof HTMLElement) {
            opts.container.scrollTo(currentX, currentY);
          }

          if (progress < 1) {
            rafId = requestAnimationFrame(step);
          } else {
            rafId = null;
            opts.onComplete?.();
            resolve();
          }
        }

        rafId = requestAnimationFrame(step);
      });
    }

    function cancel(): void {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    const instance: SmoothScrollInstance = {
      start: doScroll,
      cancel,
      isAnimating: () => rafId !== null && !destroyed,
      destroy() {
        destroyed = true;
        cancel();
      },
    };

    return instance;
  }
}

/** Convenience: create a smooth scroller */
export function createSmoothScroller(options?: Partial<SmoothScrollOptions>): SmoothScroller {
  return new SmoothScroller().create(options);
}

// --- Quick Helpers ---

/** Smooth scroll to top of page */
export function scrollToTop(duration = 400): Promise<void> {
  return createSmoothScroller({ x: 0, y: 0, duration }).start();
}

/** Smooth scroll to bottom of page */
export function scrollToBottom(duration = 400): Promise<void> {
  return createSmoothScroller({ y: document.documentElement.scrollHeight, duration }).start();
}

/** Smooth scroll to a specific Y position */
export function scrollToY(y: number, duration = 400): Promise<void> {
  return createSmoothScroller({ y, duration }).start();
}

/** Smooth scroll an element into view center */
export function scrollToElementCenter(
  el: HTMLElement,
  duration = 400,
): Promise<void> {
  const rect = el.getBoundingClientRect();
  const targetY = rect.top + rect.height / 2 - window.innerHeight / 2;
  return createSmoothScroller({ y: targetY + window.scrollY, duration }).start();
}
