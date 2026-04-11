/**
 * Smooth Scroll Utilities: Advanced smooth scrolling with easing functions,
 * parallax layers, scroll-to-anchor, scroll-linked animations, momentum, and
 * programmatic control.
 */

// --- Types ---

export type EasingFn = (t: number) => number;
export type EasingName = "linear" | "quadIn" | "quadOut" | "quadInOut"
  | "cubicIn" | "cubicOut" | "cubicInOut"
  | "quartIn" | "quartOut" | "quartInOut"
  | "expoIn" | "expoOut" | "expoInOut"
  | "sineIn" | "sineOut" | "sineInOut"
  | "elastic" | "bounce";

export interface ScrollToOptions {
  /** Target Y position or element */
  target: number | HTMLElement | string;
  /** Duration in ms (default 500) */
  duration?: number;
  /** Easing function or name */
  easing?: EasingName | EasingFn;
  /** Offset from target (px) */
  offset?: number;
  /** Container to scroll (default window) */
  container?: HTMLElement | Window;
  /** Called when scroll starts */
  onStart?: () => void;
  /** Called on each frame with current position */
  onProgress?: (current: number, target: number) => void;
  /** Called when complete */
  onComplete?: () => void;
  /** Cancel any existing scroll before starting? */
  cancelExisting?: boolean;
}

export interface ParallaxLayer {
  /** Element to apply parallax to */
  el: HTMLElement;
  /** Speed multiplier: 0 = static, 1 = scrolls with page, -1 = opposite direction */
  speed: number;
  /** Direction: "vertical" or "horizontal" */
  direction?: "vertical" | "horizontal";
  /** Only apply within this range [0-1] of viewport */
  range?: [number, number];
  /** Disable on mobile? */
  disableOnMobile?: boolean;
}

export interface ParallaxOptions {
  /** Parallax layers */
  layers: ParallaxLayer[];
  /** Container to observe (default document) */
  container?: HTMLElement | Window;
  /** Use requestAnimationFrame for smooth updates (default true) */
  useRAF?: boolean;
  /** Throttle interval in ms for non-RAF mode (default 16) */
  throttleMs?: number;
  /** Custom class name */
  className?: string;
}

export interface ParallaxInstance {
  /** Root reference (no DOM element — manages layers in place) */
  el: null;
  /** Add a layer dynamically */
  addLayer: (layer: ParallaxLayer) => void;
  /** Remove a layer by element */
  removeLayer: (el: HTMLElement) => void;
  /** Update layer speed */
  setSpeed: (el: HTMLElement, speed: number) => void;
  /** Destroy and reset all layers */
  destroy: () => void;
}

export interface SmoothScrollOptions {
  /** Default duration for scrollTo calls */
  defaultDuration?: number;
  /** Default easing */
  defaultEasing?: EasingName | EasingFn;
  /** Default offset */
  defaultOffset?: number;
  /** Enable keyboard navigation (PageUp/Down, Space, etc.) */
  keyboardNav?: boolean;
  /** Keyboard step size in px */
  keyboardStep?: number;
  /** Smooth anchor link handling? */
  handleAnchors?: boolean;
  /** Scroll behavior for native CSS scroll-behavior override */
  nativeBehavior?: "auto" | "smooth";
  /** Custom class name */
  className?: string;
}

export interface SmoothScrollInstance {
  /** Scroll to a target */
  scrollTo: (opts: ScrollToOptions) => Promise<void>;
  /** Scroll to an anchor by ID */
  scrollToAnchor: (anchorId: string, opts?: Partial<ScrollToOptions>) => Promise<void>;
  /** Scroll to top */
  scrollToTop: (duration?: number) => Promise<void>;
  /** Scroll to bottom */
  scrollToBottom: (duration?: number) => Promise<void>;
  /** Scroll by a relative amount */
  scrollBy: (amount: number, duration?: number) => Promise<void>;
  /** Check if currently scrolling programmatically */
  isScrolling: () => boolean;
  /** Cancel current scroll animation */
  cancel: () => void;
  /** Create a parallax manager */
  createParallax: (opts: ParallaxOptions) => ParallaxInstance;
  /** Destroy everything */
  destroy: () => void;
}

// --- Easing Functions ---

const EASING_FUNCTIONS: Record<EasingName, EasingFn> = {
  linear: (t) => t,
  quadIn: (t) => t * t,
  quadOut: (t) => t * (2 - t),
  quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  cubicIn: (t) => t * t * t,
  cubicOut: (t) => (--t) * t * t + 1,
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  quartIn: (t) => t * t * t * t,
  quartOut: (t) => 1 - (--t) * t * t * t,
  quartInOut: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),
  expoIn: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  expoOut: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  expoInOut: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  sineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),
  sineOut: (t) => Math.sin((t * Math.PI) / 2),
  sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  bounce: (t) => {
    const n1 = 7.5625; const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

function resolveEasing(easing?: EasingName | EasingFn): EasingFn {
  if (typeof easing === "function") return easing;
  return EASING_FUNCTIONS[easing ?? "easeOutCubic"] ?? EASING_FUNCTIONS.cubicOut;
}

// Map our naming to internal
const EASING_ALIASES: Record<string, EasingName> = {
  easeOutCubic: "cubicOut",
  easeInCubic: "cubicIn",
  easeInOutCubic: "cubicInOut",
};

// --- Core Factory ---

/**
 * Create a smooth scrolling controller.
 *
 * @example
 * ```ts
 * const ss = createSmoothScroll({
 *   defaultEasing: "cubicOut",
 *   handleAnchors: true,
 * });
 *
 * // Smooth scroll to element
 * await ss.scrollTo({ target: "#section-3", offset: 80 });
 *
 * // Create parallax
 * const px = ss.createParallax({
 *   layers: [
 *     { el: bgEl, speed: 0.3 },
 *     { el: midEl, speed: 0.6 },
 *   ],
 * });
 * ```
 */
export function createSmoothScroll(options: SmoothScrollOptions = {}): SmoothScrollInstance {
  const {
    defaultDuration = 500,
    defaultEasing = "cubicOut",
    defaultOffset = 0,
    keyboardNav = false,
    keyboardStep = 100,
    handleAnchors = false,
  } = options;

  let _scrolling = false;
  let _cancelCurrent = false;
  let rafId: number | null = null;
  const cleanupFns: Array<() => void> = [];
  const parallaxInstances: ParallaxInstance[] = [];
  let isDestroyed = false;

  // --- ScrollTo ---

  function scrollTo(opts: ScrollToOptions): Promise<void> {
    return new Promise((resolve) => {
      if (_scrolling && opts.cancelExisting !== false) cancel();

      _scrolling = true;
      _cancelCurrent = false;

      const duration = opts.duration ?? defaultDuration;
      const easing = resolveEasing(
        typeof opts.easing === "string" ? (EASING_ALIASES[opts.easing] ?? opts.easing as EasingName) : opts.easing
      ) ?? resolveEasing(defaultEasing as EasingName);
      const offset = opts.offset ?? defaultOffset;
      const container = opts.container ?? window;

      // Resolve target position
      let targetY: number;
      if (typeof opts.target === "number") {
        targetY = opts.target;
      } else if (typeof opts.target === "string") {
        const el = document.querySelector(opts.target);
        if (!el) { _scrolling = false; resolve(); return; }
        targetY = getAbsoluteTop(el as HTMLElement) - offset;
      } else {
        targetY = getAbsoluteTop(opts.target) - offset;
      }

      const startY = getScrollTop(container);
      const distance = targetY - startY;

      // If already there or no distance
      if (Math.abs(distance) < 1) {
        _scrolling = false;
        opts.onComplete?.();
        resolve();
        return;
      }

      opts.onStart?.();
      const startTime = performance.now();

      function step(timestamp: number): void {
        if (_cancelCurrent || isDestroyed) {
          _scrolling = false;
          resolve();
          return;
        }

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easing(progress);
        const current = startY + distance * eased;

        setScrollTop(container, current);
        opts.onProgress?.(current, targetY);

        if (progress < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          _scrolling = false;
          rafId = null;
          opts.onComplete?.();
          resolve();
        }
      }

      rafId = requestAnimationFrame(step);
    });
  }

  async function scrollToAnchor(anchorId: string, opts?: Partial<ScrollToOptions>): Promise<void> {
    return scrollTo({ ...opts, target: `#${anchorId}` });
  }

  async function scrollToTop(duration?: number): Promise<void> {
    return scrollTo({ target: 0, duration: duration ?? defaultDuration });
  }

  async function scrollToBottom(duration?: number): Promise<void> {
    const docHeight = document.documentElement.scrollHeight;
    const viewHeight = window.innerHeight;
    return scrollTo({ target: docHeight - viewHeight, duration: duration ?? defaultDuration });
  }

  async function scrollBy(amount: number, duration?: number): Promise<void> {
    const current = getScrollTop(window);
    return scrollTo({ target: current + amount, duration: duration ?? defaultDuration });
  }

  function isScrolling(): boolean { return _scrolling; }

  function cancel(): void {
    _cancelCurrent = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    _scrolling = false;
  }

  // --- Parallax ---

  function createParallax(parallaxOpts: ParallaxOptions): ParallaxInstance {
    const {
      layers,
      container: pContainer = window,
      useRAF = true,
      throttleMs = 16,
    } = parallaxOpts;

    const activeLayers = new Map<HTMLElement, ParallaxLayer>();
    let lastTick = 0;
    let pRafId: number | null = null;
    let pDestroyed = false;

    for (const layer of layers) {
      activeLayers.set(layer.el, layer);
    }

    function updateParallax(): void {
      if (pDestroyed) return;

      const scrollTop = getScrollTop(pContainer);
      const viewHeight = window.innerHeight;

      for (const [el, config] of activeLayers) {
        if (config.disableOnMobile && window.innerWidth < 768) continue;

        const rect = el.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const viewCenter = viewHeight / 2;
        const offsetFromCenter = elementCenter - viewCenter;
        const range = config.range ?? [0, 1];

        // Check if element is in visible range
        const visibility = rect.bottom > 0 && rect.top < viewHeight ? 1 : 0;

        if (visibility === 0) continue;

        const moveAmount = offsetFromCenter * config.speed;

        if (config.direction === "horizontal") {
          el.style.transform = `translateX(${moveAmount}px)`;
        } else {
          el.style.transform = `translateY(${moveAmount}px)`;
        }
      }
    }

    function tickParallax(timestamp: number): void {
      if (pDestroyed) return;
      updateParallax();
      pRafId = requestAnimationFrame(tickParallax);
    }

    function throttledTick(): void {
      const now = performance.now();
      if (now - lastTick >= throttleMs) {
        lastTick = now;
        updateParallax();
      }
    }

    // Start
    if (useRAF) {
      pRafId = requestAnimationFrame(tickParallax);
    } else {
      window.addEventListener("scroll", throttledTick, { passive: true });
    }

    const instance: ParallaxInstance = {
      el: null,
      addLayer(layer: ParallaxLayer) { activeLayers.set(layer.el, layer); },
      removeLayer(el: HTMLElement) { activeLayers.delete(el); },
      setSpeed(el: HTMLElement, speed: number) {
        const l = activeLayers.get(el);
        if (l) l.speed = speed;
      },
      destroy() {
        pDestroyed = true;
        if (pRafId) cancelAnimationFrame(pRafId);
        else window.removeEventListener("scroll", throttledTick);

        // Reset transforms
        for (const [el] of activeLayers) {
          el.style.transform = "";
        }
        activeLayers.clear();

        const idx = parallaxInstances.indexOf(instance);
        if (idx >= 0) parallaxInstances.splice(idx, 1);
      },
    };

    parallaxInstances.push(instance);
    return instance;
  }

  // --- Anchor handling ---

  if (handleAnchors) {
    const onAnchorClick = (e: Event) => {
      const link = e.target as HTMLAnchorElement;
      if (!link || link.tagName !== "A") return;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      e.preventDefault();
      const id = href.slice(1);
      scrollToAnchor(id).catch(() => {});
    };

    document.addEventListener("click", onAnchorClick);
    cleanupFns.push(() => document.removeEventListener("click", onAnchorClick));
  }

  // --- Keyboard nav ---

  if (keyboardNav) {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "PageDown":
        case "Space":
          e.preventDefault();
          scrollBy(window.innerHeight * 0.8, 300);
          break;
        case "PageUp":
          e.preventDefault();
          scrollBy(-window.innerHeight * 0.8, 300);
          break;
        case "End":
          e.preventDefault();
          scrollToBottom(500);
          break;
        case "Home":
          e.preventDefault();
          scrollToTop(500);
          break;
        case "ArrowDown":
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); scrollBy(keyboardStep, 150); }
          break;
        case "ArrowUp":
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); scrollBy(-keyboardStep, 150); }
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    cleanupFns.push(() => window.removeEventListener("keydown", onKeyDown));
  }

  // --- Helpers ---

  function getScrollTop(container: HTMLElement | Window): number {
    return container === window
      ? (window.scrollY || document.documentElement.scrollTop)
      : (container as HTMLElement).scrollTop;
  }

  function setScrollTop(container: HTMLElement | Window, value: number): void {
    if (container === window) {
      window.scrollTo({ top: value });
    } else {
      (container as HTMLElement).scrollTop = value;
    }
  }

  function getAbsoluteTop(el: HTMLElement): number {
    let top = 0;
    while (el) {
      top += el.offsetTop;
      el = el.offsetParent as HTMLElement;
    }
    return top;
  }

  function destroy(): void {
    isDestroyed = true;
    cancel();
    for (const pi of [...parallaxInstances]) pi.destroy();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return {
    scrollTo, scrollToAnchor, scrollToTop, scrollToBottom, scrollBy,
    isScrolling, cancel,
    createParallax,
    destroy,
  };
}
