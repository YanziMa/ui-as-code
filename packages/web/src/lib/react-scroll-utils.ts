/**
 * React Scroll Utilities: Smooth scrolling, scroll spy, scroll progress,
 * scroll-to-element, parallax helpers, and scroll position persistence.
 */

// --- Types ---

export interface ScrollToOptions {
  /** Target Y position (px from top) */
  top?: number;
  /** Target element to scroll into view */
  target?: HTMLElement | string;
  /** Scroll behavior ("auto" | "smooth" | "instant") */
  behavior?: ScrollBehavior;
  /** Offset from top in px */
  offset?: number;
  /** Duration for custom smooth scroll animation (ms) */
  duration?: number;
  /** Easing function for custom animation */
  easing?: (t: number) => number;
  /** Callback when scroll completes */
  onComplete?: () => void;
}

export interface ScrollSpyOptions {
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Visibility threshold */
  threshold?: number;
  /** Class name to add to active section */
  activeClass?: string;
}

export interface ScrollProgress {
  /** 0-1 representing vertical scroll progress */
  y: number;
  /** 0-1 representing horizontal scroll progress */
  x: number;
  /** Current scroll position in px */
  scrollTop: number;
  scrollLeft: number;
  /** Total scrollable height/width */
  maxScrollTop: number;
  maxScrollLeft: number;
  /** Direction of last scroll */
  direction: "up" | "down" | "left" | "right" | null;
}

// --- Smooth Scroll ---

/** Scroll to a specific position or element with options */
export function scrollTo(options: ScrollToOptions): Promise<void> {
  const {
    top,
    target,
    behavior = "smooth",
    offset = 0,
    duration = 500,
    easing,
    onComplete,
  } = options;

  return new Promise((resolve) => {
    let targetY: number;

    if (target) {
      const el = typeof target === "string" ? document.querySelector(target) : target;
      if (!el) { resolve(); return; }
      const rect = el.getBoundingClientRect();
      targetY = window.scrollY + rect.top - offset;
    } else if (top !== undefined) {
      targetY = top - offset;
    } else {
      resolve();
      return;
    }

    // Use native smooth scroll if no custom duration/easing
    if (behavior === "smooth" && !duration && !easing) {
      window.scrollTo({ top: targetY, behavior: "smooth" });
      // Native smooth scroll doesn't have a completion callback
      setTimeout(resolve, duration + 100);
      onComplete?.();
      return;
    }

    // Custom animated scroll
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();
    const easeFn = easing ?? easeOutCubic;

    function step(now: number): void {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / (duration ?? 500), 1);
      const eased = easeFn(progress);

      window.scrollTo(0, startY + distance * eased);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        onComplete?.();
        resolve();
      }
    }

    requestAnimationFrame(step);
  });
}

/** Scroll to the top of the page */
export function scrollToTop(options?: Partial<ScrollToOptions>): Promise<void> {
  return scrollTo({ top: 0, ...options });
}

/** Scroll to the bottom of the page */
export function scrollToBottom(options?: Partial<ScrollToOptions>): Promise<void> {
  return scrollTo({
    top: document.documentElement.scrollHeight - window.innerHeight,
    ...options,
  });
}

// --- Easing Functions ---

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuad(t: number): number { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

// --- Scroll Spy ---

/** Track which section is currently visible during scroll */
export function createScrollSpy(
  sections: Array<{ id: string; element?: HTMLElement }>,
  options: ScrollSpyOptions = {},
): {
  getActiveId: () => string | null;
  destroy: () => void;
} {
  const {
    rootMargin = "-20% 0px -70% 0px",
    threshold = 0,
    activeClass = "scroll-spy-active",
  } = options;

  let activeId: string | null = null;
  const observers: IntersectionObserver[] = [];

  for (const section of sections) {
    const el = section.element ?? document.getElementById(section.id);
    if (!el) continue;

    el.classList.remove(activeClass);

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        // Deactivate previous
        if (activeId) {
          const prevEl = document.getElementById(activeId);
          prevEl?.classList.remove(activeClass);
        }
        activeId = section.id;
        el.classList.add(activeClass);
      }
    }, { rootMargin, threshold });

    observer.observe(el);
    observers.push(observer);
  }

  return {
    getActiveId: () => activeId,
    destroy(): void => {
      for (const obs of observers) obs.disconnect();
      for (const section of sections) {
        const el = section.element ?? document.getElementById(section.id);
        el?.classList.remove(activeClass);
      }
    },
  };
}

// --- Scroll Progress ---

/** Track overall page scroll progress */
export function createScrollProgressTracker(
  callback: (progress: ScrollProgress) => void,
  options?: { throttleMs?: number },
): () => void {
  const throttleMs = options?.throttleMs ?? 16; // ~60fps
  let lastCall = 0;
  let prevY = 0;
  let direction: "up" | "down" | "left" | "right" | null = null;

  function handler(): void {
    const now = Date.now();
    if (now - lastCall < throttleMs) return;
    lastCall = now;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const maxScrollLeft = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);

    if (scrollTop > prevY + 1) direction = "down";
    else if (scrollTop < prevY - 1) direction = "up";
    else if (scrollLeft > (window.scrollX || 0) + 1) direction = "right";
    else if (scrollLeft < (window.scrollX || 0) - 1) direction = "left";

    prevY = scrollTop;

    callback({
      y: maxScrollTop > 0 ? scrollTop / maxScrollTop : 0,
      x: maxScrollLeft > 0 ? scrollLeft / maxScrollLeft : 0,
      scrollTop,
      scrollLeft,
      maxScrollTop,
      maxScrollLeft,
      direction,
    });
  }

  window.addEventListener("scroll", handler, { passive: true });
  handler(); // Initial call

  return (): void => window.removeEventListener("scroll", handler);
}

// --- Scroll Position Persistence ---

/** Save and restore scroll position (useful for SPA navigation) */
export class ScrollPositionManager {
  private positions = new Map<string, { x: number; y: number }>();

  /** Save current scroll position for a key */
  save(key: string): void {
    this.positions.set(key, { x: window.scrollX, y: window.scrollY });
  }

  /** Restore saved scroll position for a key */
  restore(key: string, immediate = false): boolean {
    const pos = this.positions.get(key);
    if (!pos) return false;

    if (immediate) {
      window.scrollTo(pos.x, pos.y);
    } else {
      scrollTo({ top: pos.y }).catch(() => {});
    }
    return true;
  }

  /** Clear a saved position */
  clear(key: string): void {
    this.positions.delete(key);
  }

  /** Clear all saved positions */
  clearAll(): void {
    this.positions.clear();
  }
}

/** Global singleton instance */
export const scrollPositionManager = new ScrollPositionManager();

// --- Element Scroll Helpers ---

/** Check if an element is scrolled into view */
export function isElementVisible(el: HTMLElement, threshold = 0): boolean {
  const rect = el.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const windowWidth = window.innerWidth || document.documentElement.clientWidth;

  const vertInView = rect.top <= windowHeight - threshold && rect.bottom >= threshold;
  const horizInView = rect.left <= windowWidth - threshold && rect.right >= threshold;

  return vertInView && horizInView;
}

/** Get how far through an element we've scrolled (0-1) */
export function getElementScrollProgress(el: HTMLElement): { x: number; y: number } {
  const maxScrollY = el.scrollHeight - el.clientHeight;
  const maxScrollX = el.scrollWidth - el.clientWidth;
  return {
    y: maxScrollY > 0 ? el.scrollTop / maxScrollY : 0,
    x: maxScrollX > 0 ? el.scrollLeft / maxScrollX : 0,
  };
}
