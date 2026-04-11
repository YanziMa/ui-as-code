/**
 * Easing Functions: Comprehensive library of easing functions for animations.
 * Includes standard CSS easings, cubic beziers, elastic, bounce, back,
 * step functions, custom curves, and CSS-compatible output generation.
 */

// --- Types ---

export type EasingName =
  | "linear"
  | "easeIn" | "easeOut" | "easeInOut"
  | "easeInQuad" | "easeOutQuad" | "easeInOutQuad"
  | "easeInCubic" | "easeOutCubic" | "easeInOutCubic"
  | "easeInQuart" | "easeOutQuart" | "easeInOutQuart"
  | "easeInQuint" | "easeOutQuint" | "easeInOutQuint"
  | "easeInSine" | "easeOutSine" | "easeInOutSine"
  | "easeInExpo" | "easeOutExpo" | "easeInOutExpo"
  | "easeInCirc" | "easeOutCirc" | "easeInOutCirc"
  | "easeInBack" | "easeOutBack" | "easeInOutBack"
  | "easeInElastic" | "easeOutElastic" | "easeInOutElastic"
  | "easeInBounce" | "easeOutBounce" | "easeInOutBounce";

export type EasingFunction = (t: number) => number;

export interface CubicBezierOptions {
  /** First control point x */
  x1: number;
  /** First control point y */
  y1: number;
  /** Second control point x */
  x2: number;
  /** Second control point y */
  y2: number;
}

export interface ElasticOptions {
  /** Amplitude of oscillation (default: 1) */
  amplitude?: number;
  /** Period of oscillation in terms of t (default: 0.3) */
  period?: number;
}

export interface BackOptions {
  /** Overshoot amount (default: 1.70158) */
  overshoot?: number;
}

export interface BounceOptions {
  /** Number of bounces (default: 3) */
  bounces?: number;
}

// --- Standard Easings ---

export const linear: EasingFunction = (t) => t;

// Quadratic
export const easeInQuad: EasingFunction = (t) => t * t;
export const easeOutQuad: EasingFunction = (t) => 1 - (1 - t) * (1 - t);
export const easeInOutQuad: EasingFunction = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// Cubic
export const easeInCubic: EasingFunction = (t) => t * t * t;
export const easeOutCubic: EasingFunction = (t) => {
  const v = 1 - t;
  return 1 - v * v * v;
};
export const easeInOutCubic: EasingFunction = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Quartic
export const easeInQuart: EasingFunction = (t) => t * t * t * t;
export const easeOutQuart: EasingFunction = (t) => {
  const v = 1 - t;
  return 1 - v * v * v * v;
};
export const easeInOutQuart: EasingFunction = (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

// Quintic
export const easeInQuint: EasingFunction = (t) => t * t * t * t * t;
export const easeOutQuint: EasingFunction = (t) => {
  const v = 1 - t;
  return 1 - v * v * v * v * v;
};
export const easeInOutQuint: EasingFunction = (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

// Sinusoidal
export const easeInSine: EasingFunction = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFunction = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFunction = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// Exponential
export const easeInExpo: EasingFunction = (t) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
export const easeOutExpo: EasingFunction = (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
export const easeInOutExpo: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;
  if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
  return (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// Circular
export const easeInCirc: EasingFunction = (t) => 1 - Math.sqrt(1 - t * t);
export const easeOutCirc: EasingFunction = (t) => Math.sqrt(1 - (t - 1) * (t - 1));
export const easeInOutCirc: EasingFunction = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// Back (overshoot)
export function easeInBack(s?: number): EasingFunction {
  const o = s ?? 1.70158;
  return (t) => (o + 1) * t * t * t - o;
}
export function easeOutBack(s?: number): EasingFunction {
  const o = s ?? 1.70158;
  return (t) => 1 + (o + 1) * Math.pow(t - 1, 3) + o * Math.pow(t - 1, 2);
}
export function easeInOutBack(s?: number): EasingFunction {
  const o = s ?? 1.70158;
  return (t) => t < 0.5
    ? (Math.pow(2 * t, 2) * ((o + 1) * 2 * t - o)) / 2
    : (Math.pow(2 * t - 2, 2) * ((o + 1) * 2 * (t - 2) + o + 2)) / 2;
}

// Elastic
export function easeInElastic(a?: number, p?: number): EasingFunction {
  const amp = a ?? 1;
  const per = p ?? 0.3;
  return (t) => t === 0 ? 0 : -amp * Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1 - (per / 4)) * (2 * Math.PI)) / per);
}
export function easeOutElastic(a?: number, p?: number): EasingFunction {
  const amp = a ?? 1;
  const per = p ?? 0.3;
  return (t) => t === 1 ? 1 : amp * Math.pow(2, -10 * t) * Math.sin(((t - (per / 4)) * (2 * Math.PI)) / per) + 1;
}
export function easeInOutElastic(a?: number, p?: number): EasingFunction {
  const amp = a ?? 1;
  const per = p ?? 0.45;
  return (t) => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return -(amp * Math.pow(2, 20 * t - 10) * Math.sin(((20 * t - 11.125) * (2 * Math.PI)) / per) / 2;
    return amp * Math.pow(2, -20 * t + 10) * Math.sin(((20 * t - 11.125) * (2 * Math.PI)) / per) / 2 + 1;
  };
}

// Bounce
export const easeInBounce: EasingFunction = (t) => 1 - easeOutBounce(1 - t);

export function easeOutBounce(n?: number): EasingFunction {
  const bounces = n ?? 3;
  return (t) => {
    let sum = 0;
    const c = 7.5625;
    const d = 2.75;

    for (let i = 0; i < bounces; i++) {
      const duration = d / Math.pow(2, i);
      const offset = c * Math.pow(2, -i * 2);
      const peak = offset + duration;
      if (t < peak - duration / 2) {
        return c * t * t;
      }
      if (t < peak) {
        sum += (c * Math.pow(t - (peak - duration / 2), 2) + (duration * (t - peak + duration / 2))) * 2;
        break;
      }
    }
    return sum;
  };
}

export function easeInOutBounce(n?: number): EasingFunction {
  const bounces = n ?? 3;
  return (t) => t < 0.5
    ? (1 - easeOutBounce(1 - t * 2)) / 2
    : (1 + easeOutBounce(t * 2 - 1)) / 2;
}

// --- Cubic Bezier ---

/**
 * Create an easing function from a cubic bezier curve.
 * Uses Newton-Raphson iteration to solve for t given x.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  // Pre-compute coefficients
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number): number {
    return ((ax * t + bx) * t + cx) * t;
  }

  function solveForX(x: number): number {
    // Initial guess: linear approximation
    let t = x;
    // Newton-Raphson iterations
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCurveX(t) - x;
      if (Math.abs(currentX) < 1e-7) break;
      const dx = (3 * ax * t + 2 * bx) * t + cx;
      if (dx > 1e-10) t -= currentX / dx;
    }
    return t;
  }

  return (x: number) => {
    const t = solveForX(x);
    return ((ay * t + by) * t + cy) * t;
  };
}

/** Create easing from options object */
export function cubicBezierFromOpts(opts: CubicBezierOptions): EasingFunction {
  return cubicBezier(opts.x1, opts.y1, opts.x2, opts.y2);
}

// --- Step Functions ---

export function steps(n: number, jumpStart = false): EasingFunction {
  if (jumpStart) {
    return (t) => Math.ceil(t * n) / n;
  }
  return (t) => Math.floor(t * n) / n;
}

// --- Registry & Lookup ---

const easingRegistry: Record<string, EasingFunction> = {
  linear,
  easeIn: easeInQuad,
  easeOut: easeOutQuad,
  easeInOut: easeInOutQuad,
  easeInQuad,
  easeOutQuad,
  easeInOutQuad,
  easeInCubic,
  easeOutCubic,
  easeInOutCubic,
  easeInQuart,
  easeOutQuart,
  easeInOutQuart,
  easeInQuint,
  easeOutQuint,
  easeInOutQuint,
  easeInSine,
  easeOutSine,
  easeInOutSine,
  easeInExpo,
  easeOutExpo,
  easeInOutExpo,
  easeInCirc,
  easeOutCirc,
  easeInOutCirc,
};

/** Get an easing function by name */
export function getEasing(name: string | EasingFunction): EasingFunction {
  if (typeof name === "function") return name;
  if (easingRegistry[name]) return easingRegistry[name];

  // Try parsing as CSS cubic-bezier()
  const match = name.match(/cubic-bezier\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)/);
  if (match) {
    return cubicBezier(
      parseFloat(match[1]!),
      parseFloat(match[2]!),
      parseFloat(match[3]!),
      parseFloat(match[4]!),
    );
  }

  // Fallback to linear
  console.warn(`[Easing] Unknown easing "${name}", falling back to linear`);
  return linear;
}

// --- CSS Output ---

/** Convert easing function to CSS timing-function value */
export function toCSS(easing: string | EasingFunction): string {
  if (typeof easing === "string") {
    // Check if it's already a valid CSS value
    if (/^(linear|ease|cubic-bezier|steps)/.test(easing)) return easing;
    if (easingRegistry[easing]) {
      // Map back to CSS names where possible
      const cssMap: Record<string, string> = {
        easeInQuad: "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
        easeOutQuad: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        easeInOutQuad: "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
        easeInCubic: "cubic-bezier(0.55, 0.055, 0.675, 0.19)",
        easeOutCubic: "cubic-bezier(0.215, 0.61, 0.355, 1)",
        easeInOutCubic: "cubic-bezier(0.645, 0.045, 0.355, 1)",
        easeInQuart: "cubic-bezier(0.895, 0.03, 0.685, 0.22)",
        easeOutQuart: "cubic-bezier(0.165, 0.84, 0.44, 1)",
        easeInOutQuart: "cubic-bezier(0.77, 0, 0.175, 1)",
        easeInQuint: "cubic-bezier(0.755, 0.05, 0.855, 0.06)",
        easeOutQuint: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        easeInOutQuint: "cubic-bezier(0.86, 0, 0.07, 1)",
        easeInSine: "cubic-bezier(0.47, 0, 0.745, 0.715)",
        easeOutSine: "cubic-bezier(0.39, 0.575, 0.565, 1)",
        easeInOutSine: "cubic-bezier(0.445, 0.05, 0.55, 0.95)",
        easeInExpo: "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
        easeOutExpo: "cubic-bezier(0.19, 1, 0.22, 1)",
        easeInOutExpo: "cubic-bezier(1, 0, 0, 1)",
        easeInCirc: "cubic-bezier(0.6, 0.04, 0.98, 0.335)",
        easeOutCirc: "cubic-bezier(0.075, 0.82, 0.165, 1)",
        easeInOutCirc: "cubic-bezier(0.785, 0.135, 0.15, 0.86)",
      };
      return cssMap[easing] ?? easing;
    }
    return easing;
  }

  return "ease";
}

/** Generate all standard CSS keyframe timing functions as a map */
export function getCSSEasingMap(): Record<string, string> {
  return {
    linear: "linear",
    ease: "ease",
    "ease-in": "ease-in",
    "ease-out": "ease-out",
    "ease-in-out": "ease-in-out",
    "ease-in-quad": "cubic-bezier(0.55, 0.085, 0.68, 0.53)",
    "ease-out-quad": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    "ease-in-out-quad": "cubic-bezier(0.455, 0.03, 0.515, 0.955)",
    "ease-in-cubic": "cubic-bezier(0.55, 0.055, 0.675, 0.19)",
    "ease-out-cubic": "cubic-bezier(0.215, 0.61, 0.355, 1)",
    "ease-in-out-cubic": "cubic-bezier(0.645, 0.045, 0.355, 1)",
    "ease-in-quart": "cubic-bezier(0.895, 0.03, 0.685, 0.22)",
    "ease-out-quart": "cubic-bezier(0.165, 0.84, 0.44, 1)",
    "ease-in-out-quart": "cubic-bezier(0.77, 0, 0.175, 1)",
    "ease-in-quint": "cubic-bezier(0.755, 0.05, 0.855, 0.06)",
    "ease-out-quint": "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    "ease-in-out-quint": "cubic-bezier(0.86, 0, 0.07, 1)",
    "ease-in-sine": "cubic-bezier(0.47, 0, 0.745, 0.715)",
    "ease-out-sine": "cubic-bezier(0.39, 0.575, 0.565, 1)",
    "ease-in-out-sine": "cubic-bezier(0.445, 0.05, 0.55, 0.95)",
    "ease-in-expo": "cubic-bezier(0.95, 0.05, 0.795, 0.035)",
    "ease-out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
    "ease-in-out-expo": "cubic-bezier(1, 0, 0, 1)",
    "ease-in-circ": "cubic-bezier(0.6, 0.04, 0.98, 0.335)",
    "ease-out-circ": "cubic-bezier(0.075, 0.82, 0.165, 1)",
    "ease-in-out-circ": "cubic-bezier(0.785, 0.135, 0.15, 0.86)",
  };
}
