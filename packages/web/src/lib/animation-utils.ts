/**
 * Animation utilities: spring physics, tween engine, staggered animations,
 * scroll-triggered animations, parallax helpers, gesture-driven animation,
 * animation state machine, and WAAPI (Web Animations API) wrappers.
 */

// --- Types ---

export interface TweenOptions {
  from: number;
  to: number;
  duration: number;        // ms
  easing?: (t: number) => number;
  onUpdate?: (value: number) => void;
  onComplete?: () => void;
  delay?: number;           // ms
  yoyo?: boolean;          // Reverse on complete
  repeat?: number | false;  // Number of repeats (false = no repeat)
}

export interface SpringConfig {
  stiffness: number;       // Spring stiffness (N/m)
  damping: number;         // Damping ratio (0-1)
  mass: number;            // Mass (kg)
  velocity?: number;       // Initial velocity
  precision?: number;      // Stop threshold
}

export interface AnimationFrame {
  value: number;
  velocity: number;
  progress: number;        // 0-1 for tweens
  completed: boolean;
}

// --- Easing Functions ---

export const easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t ** 3,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t ** 3 : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInQuart: (t: number) => t ** 4,
  easeOutQuart: (t: number) => 1 - (--t) ** 4,
  easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - 8 * (--t) ** 4),
  easeInExpo: (t: number) => t === 0 ? 0 : 10 ** (10 * (t - 1)),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - 10 ** (-10 * t),
  easeInOutExpo: (t: number) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? 0.5 * 10 ** (20 * t - 10) : 1 - 0.5 * 10 ** (-20 * t + 10);
  },
  easeInBack: (t: number) => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  easeOutBack: (t: number) => {
    const s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
  },
  easeInOutBack: (t: number) => {
    const s = 1.70158 * 1.525;
    return ((t *= 2) < 1 ? t * t * ((s + 1) * t - s) * 0.5 :
      ((t -= 2) * t * ((s + 1) * t + s) + 2) * 0.5);
  },
  easeInElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return -(2 ** (10 * (t - 1))) * Math.sin((t - 1.075) * (2 * Math.PI) / 3);
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return 2 ** (-10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 3) + 1;
  },
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) { return 7.5625 * t * t; }
    if (t < 2 / 2.75) { return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75; }
    if (t < 2.5 / 2.75) { return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375; }
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  // Step functions
  stepStart: (_t: number) => 1,
  stepEnd: (t: number) => t >= 1 ? 1 : 0,
  steps(n: number): (t: number) => number {
    return (t: number) => Math.floor(t * n) / n;
  },
} as const;

export type EasingName = keyof typeof easings;

// --- Tween Engine ---

/**
 * Simple tween engine using requestAnimationFrame.
 */
export class Tween {
  private startTime: number = 0;
  private pausedTime: number = 0;
  private _paused = false;
  private _cancelled = false;
  private rafId: number | null = null;
  private currentRepeat = 0;

  constructor(private options: TweenOptions) {}

  /** Start or resume the tween */
  start(): this {
    if (this._cancelled) return this;
    if (!this._paused) {
      this.startTime = performance.now() + (this.options.delay ?? 0);
      this.currentRepeat = 0;
    } else {
      // Resume: adjust start time
      this.startTime = performance.now() - this.pausedTime;
      this._paused = false;
    }
    this.tick();
    return this;
  }

  /** Pause the tween */
  pause(): this {
    this._paused = true;
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.pausedTime = performance.now() - this.startTime;
    return this;
  }

  /** Cancel/stop the tween */
  cancel(): this {
    this._cancelled = true;
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    return this;
  }

  get paused(): boolean { return this._paused; }
  get cancelled(): boolean { return this._cancelled; }
  get running(): boolean { return !this._paused && !this._cancelled && this.rafId !== null; }

  private tick(): void {
    if (this._cancelled) return;

    this.rafId = requestAnimationFrame(() => {
      if (this._paused || this._cancelled) return;

      const elapsed = performance.now() - this.startTime;
      const duration = this.options.duration;
      let progress = Math.min(elapsed / duration, 1);
      const easingFn = this.options.easing ?? easings.linear;
      let easedProgress = easingFn(progress);

      // Handle yoyo
      if (this.options.yoyo && this.currentRepeat % 2 === 1) {
        easedProgress = 1 - easedProgress;
      }

      const value = this.options.from + (this.options.to - this.options.from) * easedProgress;

      this.options.onUpdate?.(value);

      if (progress >= 1) {
        const repeat = this.options.repeat ?? false;
        if (repeat !== false && this.currentRepeat < repeat) {
          this.currentRepeat++;
          this.startTime = performance.now();
          this.tick();
        } else {
          this.options.onComplete?.();
        }
      } else {
        this.tick();
      }
    });
  }
}

/** Convenience: create and start a tween immediately */
export function tween(options: TweenOptions): Tween {
  return new Tween(options).start();
}

/** Create a tween that returns a promise resolving when complete */
export function tweenPromise(
  from: number,
  to: number,
  duration: number,
  options?: Partial<Omit<TweenOptions, "from" | "to" | "duration">>,
): Promise<number> {
  return new Promise((resolve) => {
    tween({
      from,
      to,
      duration,
      ...options,
      onComplete: () => resolve(to),
    });
  });
}

// --- Spring Physics ---

/**
 * Spring-based animation using Hooke's law with damping.
 * More natural-feeling than linear/eased tweens.
 */
export class SpringAnimation {
  private position: number;
  private velocity: number;
  private target: number;
  private rafId: number | null = null;
  private _running = false;
  private _completed = false;
  private config: Required<SpringConfig>;

  constructor(
    initial: number,
    target: number,
    config: Partial<SpringConfig> = {},
  ) {
    this.position = initial;
    this.target = target;
    this.velocity = config.velocity ?? 0;
    this.config = {
      stiffness: config.stiffness ?? 170,
      damping: config.damping ?? 26,
      mass: config.mass ?? 1,
      precision: config.precision ?? 0.01,
    };
  }

  setTarget(value: number): void { this.target = value; if (!this._running) this.start(); }
  get current(): number { return this.position; }
  get running(): boolean { return this._running; }
  get completed(): boolean { return this._completed; }

  onUpdate?: (frame: AnimationFrame) => void;
  onComplete?: () => void;

  start(): void {
    if (this._running) return;
    this._running = true;
    this._completed = false;
    this.lastTime = performance.now();
    this.simulate();
  }

  stop(): void {
    this._running = false;
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  private lastTime = 0;

  private simulate(): void {
    if (!this._running) return;

    this.rafId = requestAnimationFrame(() => {
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.064); // Cap at ~15fps equivalent to avoid instability
      this.lastTime = now;

      // Spring force: F = -kx - cv
      const springForce = -this.config.stiffness * (this.position - this.target);
      const dampingForce = -this.config.damping * this.velocity;
      const acceleration = (springForce + dampingForce) / this.config.mass;

      this.velocity += acceleration * dt;
      this.position += this.velocity * dt;

      const displacement = Math.abs(this.position - this.target);
      const speed = Math.abs(this.velocity);
      const done = displacement < this.config.precision && speed < this.config.precision;

      const frame: AnimationFrame = {
        value: this.position,
        velocity: this.velocity,
        progress: 1 - Math.min(displacement / Math.abs(this.target - this.position || 1), 1),
        completed: done,
      };

      this.onUpdate?.(frame);

      if (done) {
        this.position = this.target;
        this.velocity = 0;
        this._completed = true;
        this._running = false;
        this.onComplete?.();
      } else {
        this.simulate();
      }
    });
  }
}

/** Animate a CSS property using spring physics */
export function springTo(
  element: HTMLElement,
  property: string,
  targetValue: number,
  config?: Partial<SpringConfig>,
  unit = "px",
): SpringAnimation {
  const current = parseFloat(getComputedStyle(element)[property as any] ?? "0") || 0;
  const spring = new SpringAnimation(current, targetValue, config);

  spring.onUpdate = (frame) => {
    element.style[property as any] = `${frame.value}${unit}`;
  };

  spring.start();
  return spring;
}

// --- Staggered Animations ---

/** Stagger animation delays across multiple elements */
export function stagger(
  elements: HTMLElement[],
  animate: (el: HTMLElement, index: number) => void,
  options: {
    staggerDelay?: number;   // Delay between each element (ms)
    startDelay?: number;     // Initial delay before first element (ms)
    reverse?: boolean;       // Animate in reverse order
    from?: "start" | "center" | "end";
  } = {},
): (() => void)[] {
  const {
    staggerDelay = 50,
    startDelay = 0,
    reverse = false,
    from = "start",
  } = options;

  const items = reverse ? [...elements].reverse() : [...elements];
  const cancellers: Array<() => void> = [];

  items.forEach((el, i) => {
    let delay = startDelay + i * staggerDelay;

    if (from === "center") {
      const centerOffset = i - (items.length - 1) / 2;
      delay = startDelay + Math.abs(centerOffset) * staggerDelay;
    } else if (from === "end") {
      delay = startDelay + (items.length - 1 - i) * staggerDelay;
    }

    const id = setTimeout(() => animate(el, i), delay);
    cancellers.push(() => clearTimeout(id));
  });

  return cancellers;
}

/** Stagger fade-in for multiple elements */
export function staggerFadeIn(
  elements: HTMLElement[],
  options?: { duration?: number; staggerDelay?: number; from?: "start" | "center" | "end" },
): (() => void)[] {
  const { duration = 300, staggerDelay = 50, from = "start" } = options ?? {};
  return stagger(elements, (el) => {
    el.style.transition = `opacity ${duration}ms ease-out`;
    el.style.opacity = "1";
  }, { staggerDelay, from });
}

// --- Scroll-Triggered Animations ---

export interface ScrollAnimationOptions {
  /** Element to observe */
  target: HTMLElement;
  /** Animation callback when element enters viewport */
  onEnter?: (entry: IntersectionObserverEntry) => void;
  /** Animation callback when element leaves viewport */
  onLeave?: (entry: IntersectionObserverEntry) => void;
  /** Callback with progress (0-1) based on scroll position */
  onProgress?: (progress: number) => void;
  /** Threshold(s) for intersection observer */
  threshold?: number | number[];
  /** Root margin for observer */
  rootMargin?: string;
  /** Only trigger once? */
  once?: boolean;
  /** Offset range for progress tracking [start, end] as fraction of viewport height */
  progressRange?: [number, number];
}

/** Set up scroll-triggered animation */
export function scrollAnimate(options: ScrollAnimationOptions): () => void {
  const {
    target,
    onEnter,
    onLeave,
    onProgress,
    threshold = 0.1,
    rootMargin = "0px",
    once = false,
  } = options;

  let triggered = false;

  // Intersection Observer for enter/leave
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry) return;

    if (entry.isIntersecting) {
      if (once && triggered) return;
      triggered = true;
      onEnter?.(entry);
    } else {
      onLeave?.(entry);
    }
  }, { threshold, rootMargin });

  observer.observe(target);

  // Scroll listener for progress tracking
  let scrollHandler: (() => void) | null = null;
  if (onProgress) {
    scrollHandler = () => {
      const rect = target.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = clamp(1 - rect.top / (vh + rect.height), 0, 1);
      onProgress(progress);
    };
    window.addEventListener("scroll", scrollHandler, { passive: true });
    scrollHandler(); // Initial call
  }

  return () => {
    observer.disconnect();
    if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
  };
}

// --- Parallax Helpers ---

/** Apply parallax effect based on scroll position */
export function parallax(
  element: HTMLElement,
  options: {
    speed?: number;           // Multiplier (0-1 for slower, >1 for faster)
    direction?: "up" | "down";
    property?: string;         // CSS property to animate (default: 'transform')
    disabledWhenReducedMotion?: boolean;
  } = {},
): () => void {
  const {
    speed = 0.5,
    direction = "up",
    property = "transform",
    disabledWhenReducedMotion = true,
  } = options;

  if (disabledWhenReducedMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return () => {};
  }

  const handler = () => {
    const rect = element.getBoundingClientRect();
    const scrolled = window.scrollY;
    const elementTop = rect.top + scrolled;
    const offset = (scrolled - elementTop) * speed * (direction === "up" ? -1 : 1);

    switch (property) {
      case "transform":
        element.style.transform = `translateY(${offset}px)`;
        break;
      case "opacity":
        element.style.opacity = String(clamp(1 - Math.abs(offset) / 500, 0, 1));
        break;
      default:
        (element.style as any)[property] = `${offset}px`;
    }
  };

  window.addEventListener("scroll", handler, { passive: true });
  handler();

  return () => window.removeEventListener("scroll", handler);
}

/** Mouse-follow parallax (tilt effect) */
export function mouseParallax(
  container: HTMLElement,
  options: {
    maxTilt?: number;         // Max rotation in degrees
    perspective?: number;     // CSS perspective value
    scale?: number;           // Scale on hover
    speed?: number;           // Smoothing factor (0-1)
  } = {},
): () => void {
  const { maxTilt = 10, perspective = 1000, scale = 1.02, speed = 0.3 } = options;
  let currentX = 0, currentY = 0;
  let targetX = 0, targetY = 0;
  let rafId: number | null = null;

  container.style.perspective = `${perspective}px`;

  const onMouseMove = (e: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    targetX = ((e.clientX - centerX) / (rect.width / 2)) * maxTilt;
    targetY = ((e.clientY - centerY) / (rect.height / 2)) * -maxTilt;
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  const onMouseLeave = () => {
    targetX = 0;
    targetY = 0;
    if (!rafId) rafId = requestAnimationFrame(tick);
  };

  const tick = () => {
    currentX += (targetX - currentX) * speed;
    currentY += (targetY - currentY) * speed;

    container.style.transform = `rotateY(${currentX}deg) rotateX(${currentY}deg) scale(${scale})`;

    if (Math.abs(targetX - currentX) < 0.01 && Math.abs(targetY - currentY) < 0.01) {
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  };

  container.addEventListener("mousemove", onMouseMove);
  container.addEventListener("mouseleave", onMouseLeave);

  return () => {
    container.removeEventListener("mousemove", onMouseMove);
    container.removeEventListener("mouseleave", onMouseLeave);
    if (rafId) cancelAnimationFrame(rafId);
    container.style.transform = "";
    container.style.perspective = "";
  };
}

// --- WAAPI (Web Animations API) Wrappers ---

/** Animate an element using Web Animations API with a cleaner interface */
export function animate(
  element: HTMLElement,
  keyframes: PropertyIndexedKeyframes | Keyframe[],
  options?: KeyframeAnimationOptions,
): Animation {
  return element.animate(keyframes, {
    duration: 300,
    easing: "ease-out",
    fill: "forwards",
    ...options,
  });
}

/** Fade in an element */
export function fadeIn(element: HTMLElement, duration = 300): Animation {
  return animate(element, [
    { opacity: 0 },
    { opacity: 1 },
  ], { duration, easing: "ease-out", fill: "forwards" });
}

/** Fade out an element */
export function fadeOut(element: HTMLElement, duration = 300): Animation {
  return animate(element, [
    { opacity: 1 },
    { opacity: 0 },
  ], { duration, easing: "ease-in", fill: "forwards" });
}

/** Slide up into view */
export function slideUp(element: HTMLElement, distance = 20, duration = 300): Animation {
  return animate(element, [
    { transform: `translateY(${distance}px)`, opacity: 0 },
    { transform: "translateY(0)", opacity: 1 },
  ], { duration, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" });
}

/** Slide down out of view */
export function slideDown(element: HTMLElement, distance = 20, duration = 300): Animation {
  return animate(element, [
    { transform: "translateY(0)", opacity: 1 },
    { transform: `translateY(${distance}px)`, opacity: 0 },
  ], { duration, easing: "ease-in", fill: "forwards" });
}

/** Scale pop-in effect */
export function scaleIn(element: HTMLElement, fromScale = 0.9, duration = 200): Animation {
  return animate(element, [
    { transform: `scale(${fromScale})`, opacity: 0 },
    { transform: "scale(1)", opacity: 1 },
  ], { duration, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" });
}

/** Shake/shiver animation */
export function shake(element: HTMLElement, intensity = 6, duration = 400): Animation {
  return animate(element, [
    { transform: "translateX(0)" },
    { transform: `translateX(-${intensity}px)` },
    { transform: `translateX(${intensity}px)` },
    { transform: `translateX(-${intensity}px)` },
    { transform: `translateX(${intensity}px)` },
    { transform: `translateX(-${intensity / 2}px)` },
    { transform: `translateX(${intensity / 2}px)` },
    { transform: "translateX(0)" },
  ], { duration, easing: "ease-in-out", fill: "forwards" });
}

/** Pulse/breathe animation */
export function pulse(element: HTMLElement, scale = 1.05, duration = 600): Animation {
  return animate(element, [
    { transform: "scale(1)" },
    { transform: `scale(${scale})` },
    { transform: "scale(1)" },
  ], { duration, easing: "ease-in-out" });
}

// --- Utility ---

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}
