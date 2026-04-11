/**
 * Scroll Into View: Smooth scrolling to elements with offset, alignment,
 * duration control, callback support, horizontal/vertical options,
 * and visibility detection.
 */

// --- Types ---

export type ScrollAlignment = "start" | "center" | "end" | "nearest";
export type ScrollBehavior = "auto" | "smooth" | "instant";

export interface ScrollIntoViewOptions {
  /** Target element */
  target: HTMLElement;
  /** Vertical alignment (default: "start") */
  block?: ScrollAlignment;
  /** Horizontal alignment (default: "nearest") */
  inline?: ScrollAlignment;
  /** Scroll behavior (default: "smooth") */
  behavior?: ScrollBehavior;
  /** Duration in ms for smooth scroll (default: 400) */
  duration?: number;
  /** Offset from edge in px */
  offset?: { top?: number; left?: number; right?: number; bottom?: number };
  /** Only scroll if not already visible? */
  onlyIfNotVisible?: boolean;
  /** Callback when scroll completes */
  onFinished?: () => void;
  /** Callback when scroll starts */
  onStart?: () => void;
  /** Container to scroll within (default: nearest scrollable ancestor) */
  container?: HTMLElement | Window;
}

export interface ScrollIntoViewInstance {
  /** Scroll to the target */
  scroll: () => Promise<void>;
  /** Check if target is visible */
  isVisible: () => boolean;
  /** Cancel any in-progress scroll */
  cancel: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class Scroller {
  create(options: ScrollIntoViewOptions): ScrollIntoViewInstance {
    const opts = {
      block: options.block ?? "start",
      inline: options.inline ?? "nearest",
      behavior: options.behavior ?? "smooth",
      duration: options.duration ?? 400,
      onlyIfNotVisible: options.onlyIfNotVisible ?? false,
      ...options,
    };

    let cancelled = false;
    let rafId: number | null = null;

    function findScrollContainer(): HTMLElement | Window {
      if (opts.container) return opts.container;

      let el: HTMLElement | null = opts.target.parentElement;
      while (el) {
        const style = getComputedStyle(el);
        if ((style.overflowY === "auto" || style.overflowY === "scroll" ||
             style.overflow === "auto" || style.overflow === "scroll") &&
            el.clientHeight < el.scrollHeight) {
          return el;
        }
        el = el.parentElement;
      }
      return window;
    }

    function isInViewport(el: HTMLElement, container: HTMLElement | Window): boolean {
      const rect = el.getBoundingClientRect();
      let containerRect: DOMRect;

      if (container instanceof Window) {
        containerRect = { top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight } as DOMRect;
      } else {
        containerRect = container.getBoundingClientRect();
      }

      const margin = 20; // px tolerance
      return (
        rect.top >= containerRect.top - margin &&
        rect.left >= containerRect.left - margin &&
        rect.bottom <= containerRect.bottom + margin &&
        rect.right <= containerRect.right + margin
      );
    }

    async function doScroll(): Promise<void> {
      cancelled = false;
      opts.onStart?.();

      // Check visibility first
      if (opts.onlyIfNotVisible && isInViewport(opts.target, findScrollContainer())) {
        opts.onFinished?.();
        return;
      }

      const container = findScrollContainer();

      if (opts.behavior === "instant" || opts.behavior === "auto") {
        // Use native scrollIntoView
        const nativeOpts: ScrollIntoViewOptions = {
          behavior: "instant",
          block: opts.block,
          inline: opts.inline,
        };

        // Apply offset via CSS scroll-margin if supported
        const offset = opts.offset;
        if (offset) {
          opts.target.style.scrollMarginTop = `${offset.top ?? 0}px`;
          opts.target.style.scrollMarginBottom = `${offset.bottom ?? 0}px`;
          opts.target.style.scrollMarginLeft = `${offset.left ?? 0}px`;
          opts.target.style.scrollMarginRight = `${offset.right ?? 0}px`;
        }

        opts.target.scrollIntoView(nativeOpts);

        // Clean up scroll margins
        if (offset) {
          opts.target.style.scrollMarginTop = "";
          opts.target.style.scrollMarginBottom = "";
          opts.target.style.scrollMarginLeft = "";
          opts.target.style.scrollMarginRight = "";
        }

        opts.onFinished?.();
        return;
      }

      // Custom smooth scroll
      const targetRect = opts.target.getBoundingClientRect();

      let targetX: number, targetY: number;

      switch (opts.block) {
        case "start":
          targetY = targetRect.top - (opts.offset?.top ?? 0);
          break;
        case "center":
          if (container instanceof Window) {
            targetY = targetRect.top + targetRect.height / 2 - window.innerHeight / 2;
          } else {
            const cRect = container.getBoundingClientRect();
            targetY = targetRect.top + targetRect.height / 2 - cRect.height / 2;
          }
          break;
        case "end":
          targetY = targetRect.bottom - (opts.offset?.bottom ?? 0);
          break;
        default: // nearest
          targetY = targetRect.top;
      }

      switch (opts.inline) {
        case "start":
          targetX = targetRect.left - (opts.offset?.left ?? 0);
          break;
        case "center":
          if (container instanceof Window) {
            targetX = targetRect.left + targetRect.width / 2 - window.innerWidth / 2;
          } else {
            const cRect = container.getBoundingClientRect();
            targetX = targetRect.left + targetRect.width / 2 - cRect.width / 2;
          }
          break;
        case "end":
          targetX = targetRect.right - (opts.offset?.right ?? 0);
          break;
        default:
          targetX = targetRect.left;
      }

      // Get current position
      let currentX: number, currentY: number;
      if (container instanceof Window) {
        currentX = window.scrollX;
        currentY = window.scrollY;
      } else {
        currentX = container.scrollLeft;
        currentY = container.scrollTop;
      }

      const startTime = performance.now();
      const dur = opts.duration;

      return new Promise((resolve) => {
        function step(now: number) {
          if (cancelled) { resolve(); return; }

          const elapsed = now - startTime;
          const progress = Math.min(elapsed / dur, 1);
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);

          if (container instanceof Window) {
            window.scrollTo(
              currentX + (targetX - currentX) * eased,
              currentY + (targetY - currentY) * eased,
            );
          } else {
            container.scrollTo(
              currentX + (targetX - currentX) * eased,
              currentY + (targetY - currentY) * eased,
            );
          }

          if (progress < 1) {
            rafId = requestAnimationFrame(step);
          } else {
            opts.onFinished?.();
            resolve();
          }
        }

        rafId = requestAnimationFrame(step);
      });
    }

    const instance: ScrollIntoViewInstance = {
      scroll: doScroll,

      isVisible: () => isInViewport(opts.target, findScrollContainer()),

      cancel() {
        cancelled = true;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },

      destroy() {
        instance.cancel();
      },
    };

    return instance;
  }
}

/** Convenience: scroll an element into view */
export function scrollIntoView(options: ScrollIntoViewOptions): ScrollIntoViewInstance {
  return new Scroller().create(options);
}

/** Quick helper: scroll to element smoothly */
export function scrollToElement(
  element: HTMLElement,
  options?: Partial<Pick<ScrollIntoViewOptions, "target">>,
): ScrollIntoViewInstance {
  return scrollIntoView({ target: element, ...options });
}
