/**
 * Count-Up Animation: Animated number counter with easing functions,
 * prefix/suffix, decimal precision, scroll-triggered start, duration control,
 * callback on complete, and comma formatting.
 */

// --- Types ---

export type EasingFn = (t: number) => number;

export interface CountUpOptions {
  /** Target element or selector */
  target: HTMLElement | string;
  /** End value */
  endValue: number;
  /** Start value (default: 0) */
  startValue?: number;
  /** Duration in ms (default: 2000) */
  duration?: number;
  /** Decimal places (default: 0) */
  decimals?: number;
  /** Prefix text */
  prefix?: string;
  /** Suffix text */
  suffix?: string;
  /** Separator for thousands (default: ",") */
  separator?: string;
  /** Easing function name or custom function */
  easing?: "linear" | "easeOut" | "easeInOut" | "bounce" | EasingFn;
  /** Start automatically? (default: true) */
  autostart?: boolean;
  /** Callback when animation completes */
  onComplete?: (finalValue: string) => void;
  /** Callback on each frame with current value */
  onUpdate?: (value: number) => void;
  /** Scroll-triggered: element or threshold to observe */
  triggerOnScroll?: HTMLElement | string | number;
  /** Custom formatter (overrides built-in) */
  formatter?: (value: number) => string;
  /** Custom CSS class */
  className?: string;
}

export interface CountUpInstance {
  element: HTMLElement;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  update: (newEndValue: number) => void;
  getValue: () => number;
  destroy: () => void;
}

// --- Easing Functions ---

const easings: Record<string, EasingFn> = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  bounce: (t) => {
    const n1 = 7.5625; const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// --- Formatters ---

function formatNumber(value: number, decimals: number, separator: string): string {
  const fixed = value.toFixed(decimals);
  const parts = fixed.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return parts.join(".");
}

// --- Main Class ---

export class CountUpManager {
  create(options: CountUpOptions): CountUpInstance {
    const opts = {
      startValue: options.startValue ?? 0,
      duration: options.duration ?? 2000,
      decimals: options.decimals ?? 0,
      prefix: options.prefix ?? "",
      suffix: options.suffix ?? ",",
      separator: options.separator ?? ",",
      easing: options.easing ?? "easeOut",
      autostart: options.autostart ?? true,
      ...options,
    };

    const el = typeof options.target === "string"
      ? document.querySelector<HTMLElement>(options.target)!
      : options.target;

    if (!el) throw new Error("CountUp: target not found");

    let currentValue = opts.startValue;
    let targetValue = opts.endValue;
    let animationFrame: number | null = null;
    let startTime: number | null = null;
    let paused = false;
    let pausedAt = 0;
    let destroyed = false;
    let observer: IntersectionObserver | null = null;

    const easingFn: EasingFn = typeof opts.easing === "string"
      ? (easings[opts.easing] ?? easings.easeOut)
      : opts.easing;

    function render(value: number): void {
      const formatted = opts.formatter
        ? opts.formatter(value)
        : `${opts.prefix}${formatNumber(value, opts.decimals, opts.separator)}${opts.suffix}`;
      el.textContent = formatted;
      if (opts.className) el.className = opts.className;
    }

    function animate(timestamp: number): void {
      if (destroyed || paused) { if (!paused) return; }

      if (!startTime) startTime = timestamp - pausedAt;

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / opts.duration, 1);
      const easedProgress = easingFn(progress);

      currentValue = opts.startValue + (targetValue - opts.startValue) * easedProgress;
      render(currentValue);
      opts.onUpdate?.(currentValue);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        currentValue = targetValue;
        render(targetValue);
        opts.onComplete?.(el.textContent);
        animationFrame = null;
      }
    }

    function start(): void {
      if (destroyed) return;
      stop();
      paused = false;
      pausedAt = 0;
      startTime = null;
      animationFrame = requestAnimationFrame(animate);
    }

    function stop(): void {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }

    // Scroll trigger
    if (opts.triggerOnScroll !== undefined) {
      observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting && !destroyed) start(); },
        { threshold: typeof opts.triggerOnScroll === "number" ? opts.triggerOnScroll : 0.3 }
      );

      const triggerEl = typeof opts.triggerOnScroll === "string"
        ? document.querySelector(opts.triggerOnScroll)!
        : typeof opts.triggerOnScroll === "number" ? el : opts.triggerOnScroll as HTMLElement;

      if (triggerEl) observer.observe(triggerEl);
    } else if (opts.autostart) {
      start();
    }

    const instance: CountUpInstance = {
      element: el,

      start,
      pause() { paused = true; stop(); },
      resume() { if (paused) { paused = false; animate(performance.now()); } },
      reset() {
        stop();
        currentValue = opts.startValue;
        pausedAt = 0;
        startTime = null;
        render(currentValue);
      },
      update(newEndValue: number) {
        targetValue = newEndValue;
        start();
      },
      getValue() { return currentValue; },
      destroy() {
        destroyed = true;
        stop();
        observer?.disconnect();
      },
    };

    return instance;
  }
}

/** Convenience: create a count-up animation */
export function createCountUp(options: CountUpOptions): CountUpInstance {
  return new CountUpManager().create(options);
}
