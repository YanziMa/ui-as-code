/**
 * Scroll Into View Utilities: Smooth scrolling, scroll alignment,
 * visibility detection, scroll progress tracking, parallax helpers,
 * scroll-linked animations, and scroll spy.
 */

// --- Types ---

export interface ScrollIntoViewOptions {
  /** Alignment: "start", "center", "end", "nearest". Default "start" */
  block?: "start" | "center" | "end" | "nearest";
  /** Horizontal alignment */
  inline?: "start" | "center" | "end" | "nearest";
  /** Smooth animation. Default false */
  behavior?: "auto" | "smooth" | "instant";
  /** Additional offset in px from the aligned position */
  offsetTop?: number;
  offsetLeft?: number;
  /** Only scroll if not fully visible. Default true */
  onlyIfNeeded?: boolean;
  /** Duration for custom smooth scroll (ms). Default 300 */
  duration?: number;
  /** Easing function for custom smooth scroll (0→1 → 0→1) */
  easing?: (t: number) => number;
}

export interface VisibilityResult {
  /** Whether any part of the element is visible */
  visible: boolean;
  /** Whether the element is fully visible */
  fullyVisible: boolean;
  /** Ratio of element that is visible (0-1) */
  visibilityRatio: number;
  /** Distance from top of viewport to element top (negative = above) */
  distanceFromTop: number;
  /** Distance from bottom of viewport to element bottom */
  distanceFromBottom: number;
}

export interface ScrollProgress {
  /** How far through the container's scroll range (0-1) */
  progress: number;
  /** Current scroll position in px */
  scrollTop: number;
  /** Maximum scroll position in px */
  maxScrollTop: number;
  /** Direction: 1 = down, -1 = up, 0 = stationary */
  direction: 1 | -1 | 0;
}

export interface ScrollSpyConfig {
  /** Container to observe (default = window) */
  container?: HTMLElement | Window;
  /** Elements or selectors to spy on */
  targets: HTMLElement[] | string[];
  /** Offset from top to consider "active" (px). Default 0 */
  offset?: number;
  /** Class name applied to active target. Default "active" */
  activeClass?: string;
  /** Called when active target changes */
  onChange?: (target: HTMLElement, index: number) => void;
  /** Threshold for considering a section as reached (0-1). Default 0 */
  threshold?: number;
}

// --- Scroll Into View ---

/** Enhanced scrollIntoView with offsets and custom animations */
export function scrollToElement(
  target: HTMLElement,
  options: ScrollIntoViewOptions = {},
): void {
  const {
    block = "start",
    behavior = "auto",
    offsetTop = 0,
    offsetLeft = 0,
    onlyIfNeeded = true,
    duration = 300,
    easing,
  } = options;

  // Check if already visible
  if (onlyIfNeeded) {
    const vis = getElementVisibility(target);
    if (vis.fullyVisible) return;
  }

  // Use native smooth scroll if no custom duration
  if ((behavior === "smooth" || behavior === "auto") && !easing && duration <= 400) {
    target.scrollIntoView({
      behavior: behavior === "auto" ? "instant" : "smooth",
      block,
      inline: options.inline ?? "nearest",
    });
    // Apply offset after native scroll
    if (offsetTop !== 0 || offsetLeft !== 0) {
      requestAnimationFrame(() => {
        const container = getScrollContainer(target);
        if (container) {
          container.scrollBy({ top: offsetTop, left: offsetLeft });
        }
      });
    }
    return;
  }

  // Custom animated scroll
  const container = getScrollContainer(target) ?? window;
  const targetRect = target.getBoundingClientRect();
  const containerRect = container === window
    ? { top: 0, left: 0 }
    : container.getBoundingClientRect();

  let targetScrollTop: number;
  switch (block) {
    case "center":
      targetScrollTop = targetRect.top + containerRect.top - container.clientHeight / 2 + targetRect.height / 2;
      break;
    case "end":
      targetScrollTop = targetRect.bottom + containerRect.top - container.clientHeight;
      break;
    case "nearest": {
      if (targetRect.top < containerRect.top) {
        targetScrollTop = targetRect.top + containerRect.top;
      } else if (targetRect.bottom > containerRect.bottom) {
        targetScrollTop = targetRect.bottom + containerRect.top - container.clientHeight;
      } else {
        return; // Already nearest
      }
      break;
    }
    default: // start
      targetScrollTop = targetRect.top + containerRect.top;
  }

  targetScrollTop += offsetTop;

  animateScroll(container, targetScrollTop + (container === window ? window.scrollY : (container as HTMLElement).scrollTop), duration, easing);
}

/** Animate scroll position with custom easing */
export function animateScroll(
  container: HTMLElement | Window,
  targetY: number,
  duration = 300,
  easing?: (t: number) => number,
): Promise<void> {
  const ease = easing ?? ((t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic

  return new Promise<void>((resolve) => {
    const startY = container === window ? window.scrollY : (container as HTMLElement).scrollTop;
    const distance = targetY - startY;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = ease(progress);

      const currentY = startY + distance * eased;

      if (container === window) {
        window.scrollTo(0, currentY);
      } else {
        (container as HTMLElement).scrollTop = currentY;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(step);
  });
}

// --- Visibility Detection ---

/** Check if an element is visible within its scroll container */
export function getElementVisibility(element: HTMLElement): VisibilityResult {
  const rect = element.getBoundingClientRect();
  const viewHeight = window.innerHeight;
  const viewWidth = window.innerWidth;

  const visible = rect.bottom > 0 && rect.top < viewHeight && rect.right > 0 && rect.left < viewWidth;
  const fullyVisible = rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewHeight && rect.right <= viewWidth;

  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0));
  const visibleWidth = Math.max(0, Math.min(rect.right, viewWidth) - Math.max(rect.left, 0));
  const totalArea = rect.width * rect.height;
  const visibleArea = visibleWidth * visibleHeight;
  const visibilityRatio = totalArea > 0 ? visibleArea / totalArea : 0;

  return {
    visible,
    fullyVisible,
    visibilityRatio,
    distanceFromTop: rect.top,
    distanceFromBottom: viewHeight - rect.bottom,
  };
}

/** Check if an element is visible within a specific container */
export function getElementVisibilityInContainer(
  element: HTMLElement,
  container: HTMLElement,
): VisibilityResult {
  const elRect = element.getBoundingClientRect();
  const contRect = container.getBoundingClientRect();

  const visible =
    elRect.bottom > contRect.top &&
    elRect.top < contRect.bottom &&
    elRect.right > contRect.left &&
    elRect.left < contRect.right;

  const fullyVisible =
    elRect.top >= contRect.top &&
    elRect.left >= contRect.left &&
    elRect.bottom <= contRect.bottom &&
    elRect.right <= contRect.right;

  const visibleH = Math.max(0, Math.min(elRect.bottom, contRect.bottom) - Math.max(elRect.top, contRect.top));
  const visibleW = Math.max(0, Math.min(elRect.right, contRect.right) - Math.max(elRect.left, contRect.left));
  const totalArea = elRect.width * elRect.height;
  const visibleArea = visibleW * visibleH;
  const ratio = totalArea > 0 ? visibleArea / totalArea : 0;

  return {
    visible,
    fullyVisible,
    visibilityRatio: ratio,
    distanceFromTop: elRect.top - contRect.top,
    distanceFromBottom: contRect.bottom - elRect.bottom,
  };
}

// --- Scroll Progress Tracking ---

/**
 * Track scroll progress within a container.
 */
export class ScrollProgressTracker {
  private container: HTMLElement | Window;
  private _progress: ScrollProgress = { progress: 0, scrollTop: 0, maxScrollTop: 0, direction: 0 };
  private lastScrollTop = 0;
  private listeners = new Set<(progress: ScrollProgress) => void>();
  private cleanup: (() => void) | null = null;

  constructor(container: HTMLElement | Window = window) {
    this.container = container;
    this._update();

    const handler = () => this._update();
    if (container === window) {
      window.addEventListener("scroll", handler, { passive: true });
      this.cleanup = () => window.removeEventListener("scroll", handler);
    } else {
      (container as HTMLElement).addEventListener("scroll", handler, { passive: true });
      this.cleanup = () => (container as HTMLElement).removeEventListener("scroll", handler);
    }
  }

  /** Get current progress snapshot */
  getProgress(): ScrollProgress { return { ...this._progress }; }

  /** Get just the 0-1 progress value */
  getValue(): number { return this._progress.progress; }

  /** Check if scrolled to bottom */
  atBottom(threshold = 10): boolean {
    return this._progress.maxScrollTop - this._progress.scrollTop <= threshold;
  }

  /** Check if at top */
  atTop(): boolean { return this._progress.scrollTop <= 0; }

  /** Listen for progress changes */
  onChange(fn: (progress: ScrollProgress) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Destroy */
  destroy(): void {
    this.cleanup?.();
    this.listeners.clear();
  }

  private _update(): void {
    const scrollTop = this.container === window
      ? window.scrollY
      : (this.container as HTMLElement).scrollTop;
    const maxScrollTop = this.container === window
      ? document.documentElement.scrollHeight - window.innerHeight
      : (this.container as HTMLElement).scrollHeight - (this.container as HTMLElement).clientHeight;

    let direction: 1 | -1 | 0;
    if (scrollTop > this.lastScrollTop) direction = 1;
    else if (scrollTop < this.lastScrollTop) direction = -1;
    else direction = 0;

    this.lastScrollTop = scrollTop;

    this._progress = {
      progress: maxScrollTop > 0 ? Math.min(scrollTop / maxScrollTop, 1) : 0,
      scrollTop,
      maxScrollTop: Math.max(0, maxScrollTop),
      direction,
    };

    this.listeners.forEach((fn) => fn(this._progress));
  }
}

// --- Scroll Spy ---

/**
 * ScrollSpy - tracks which section/element is currently in view
 * and applies active class / fires callbacks.
 *
 * @example
 * ```ts
 * const spy = new ScrollSpy({
 *   targets: document.querySelectorAll("section"),
 *   onChange: (el) => console.log("Active:", el.id),
 * });
 * ```
 */
export class ScrollSpy {
  private config: Required<ScrollSpyConfig> & { targets: HTMLElement[] };
  private elements: HTMLElement[] = [];
  private observer: IntersectionObserver | null = null;
  private activeIndex = -1;
  private cleanupFns: Array<() => void> = [];

  constructor(config: ScrollSpyConfig) {
    this.config = {
      offset: config.offset ?? 0,
      activeClass: config.activeClass ?? "active",
      threshold: config.threshold ?? 0,
      container: config.container ?? window,
      ...config,
    };

    // Resolve targets
    if (typeof this.config.targets[0] === "string") {
      this.elements = Array.from(
        document.querySelectorAll(this.config.targets as unknown as string),
      ) as HTMLElement[];
    } else {
      this.elements = [...(this.config.targets as HTMLElement[])];
    }

    this._setupObserver();
    this._setupScrollListener();
  }

  /** Get currently active element index */
  getActiveIndex(): number { return this.activeIndex; }

  /** Get currently active element */
  getActiveElement(): HTMLElement | undefined {
    return this.elements[this.activeIndex];
  }

  /** Get all elements being spied */
  getElements(): HTMLElement[] { return [...this.elements]; }

  /** Manually set active element */
  setActive(index: number): void {
    if (index === this.activeIndex) return;
    this._setActive(index);
  }

  /** Refresh targets (call after DOM changes) */
  refresh(targets?: HTMLElement[] | string[]): void {
    if (targets) {
      if (typeof targets[0] === "string") {
        this.elements = Array.from(document.querySelectorAll(targets as unknown as string)) as HTMLElement[];
      } else {
        this.elements = [...(targets as HTMLElement[])];
      }
    }
    this._teardownObserver();
    this._setupObserver();
  }

  /** Destroy */
  destroy(): void {
    this._teardownObserver();
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
  }

  // --- Private ---

  private _setActive(index: number): void {
    // Remove old active
    if (this.activeIndex >= 0 && this.activeIndex < this.elements.length) {
      this.elements[this.activeIndex]!.classList.remove(this.config.activeClass);
    }

    this.activeIndex = index;

    // Apply new active
    if (index >= 0 && index < this.elements.length) {
      this.elements[index]!.classList.add(this.config.activeClass);
      this.config.onChange?.(this.elements[index]!, index);
    }
  }

  private _setupObserver(): void {
    if (!IntersectionObserver) return;

    const offset = this.config.offset;
    const margins = `-${offset}px 0px -${Math.max(0, window.innerHeight - offset - 100)}px 0px`;

    this.observer = new IntersectionObserver(
      (entries) => {
        // Find the most prominently visible entry
        let bestIdx = -1;
        let bestRatio = 0;

        for (const entry of entries) {
          const idx = this.elements.indexOf(entry.target as HTMLElement);
          if (idx < 0) continue;

          if (entry.isIntersecting) {
            const ratio = entry.intersectionRatio;
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestIdx = idx;
            }
          }
        }

        if (bestIdx >= 0 && bestIdx !== this.activeIndex) {
          this._setActive(bestIdx);
        }
      },
      {
        root: this.config.container === window ? undefined : this.config.container as HTMLElement,
        rootMargin: margins,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const el of this.elements) {
      this.observer.observe(el);
    }
  }

  private _teardownObserver(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private _setupScrollListener(): void {
    // Fallback scroll listener for edge cases
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          ticking = false;
          // Recalculate based on positions
          this._checkFromScrollPosition();
        });
        ticking = true;
      }
    };

    const container = this.config.container;
    if (container === window) {
      window.addEventListener("scroll", onScroll, { passive: true });
      this.cleanupFns.push(() => window.removeEventListener("scroll", onScroll));
    } else {
      (container as HTMLElement).addEventListener("scroll", onScroll, { passive: true });
      this.cleanupFns.push(() => (container as HTMLElement).removeEventListener("scroll", onScroll));
    }
  }

  private _checkFromScrollPosition(): void {
    const scrollTop = this.config.container === window
      ? window.scrollY
      : (this.config.container as HTMLElement).scrollTop;
    const offset = this.config.offset;

    let closest = -1;
    let closestDist = Infinity;

    for (let i = 0; i < this.elements.length; i++) {
      const el = this.elements[i]!;
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top - offset);

      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }

    if (closest >= 0 && closest !== this.activeIndex && closestDist < 100) {
      this._setActive(closest);
    }
  }
}

// --- Helpers ---

/** Find the scroll container for an element */
export function getScrollContainer(element: HTMLElement): HTMLElement | Window | null {
  let el: HTMLElement | null = element;
  while (el) {
    if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
      const style = getComputedStyle(el);
      if (
        style.overflow === "auto" ||
        style.overflow === "scroll" ||
        style.overflowY === "auto" ||
        style.overflowY === "scroll"
      ) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return window;
}

/** Scroll to top of page */
export function scrollToTop(smooth = false): void {
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "instant" });
}

/** Scroll to bottom of page */
export function scrollToBottom(smooth = false): void {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: smooth ? "smooth" : "instant",
  });
}

/** Prevent body scroll (for modals/overlays) */
export function preventBodyScroll(): () => void {
  const scrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";

  return () => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    window.scrollTo(0, scrollY);
  };
}
