/**
 * Animation Library: Pre-built animation keyframes, spring physics,
 * staggered animations, timeline sequencing, path animation,
 * and animation utility functions for CSS/JS-driven motion.
 */

// --- Types ---

export type EasingFunction = (t: number) => number;

export interface Keyframe {
  offset: number; // 0-1
  properties: Record<string, string | number>;
}

export interface AnimationOptions {
  /** Duration in ms */
  duration?: number;
  /** Easing function */
  easing?: EasingFunction | string;
  /** Delay before start (ms) */
  delay?: number;
  /** Number of iterations */
  iterations?: number;
  /** Fill mode: "forwards" | "backwards" | "both" | "none" */
  fillMode?: string;
  /** Direction: "normal" | "reverse" | "alternate" */
  direction?: string;
  /** Callback on each frame */
  onFrame?: (progress: number) => void;
  /** Callback when complete */
  onComplete?: () => void;
  /** Target element */
  element?: HTMLElement;
}

export interface SpringConfig {
  /** Stiffness */
  stiffness: number;
  /** Damping ratio */
  damping: number;
  /** Mass */
  mass?: number;
  /** Rest threshold (velocity below this = settled) |
  restThreshold?: number;
  /** Initial velocity */
  velocity?: number;
}

export interface StaggerOptions {
  /** Delay between each item start (ms) */
  staggerMs?: number;
  /** Stagger pattern */
  pattern?: "from-start" | "from-end" | "center" | "reverse" | "random";
  /** Easing for stagger delay itself */
  staggerEasing?: EasingFunction;
  /** Start delay (ms) */
  startDelay?: number;
}

// --- Easing Functions ---

export const easings: Record<string, EasingFunction> = {
  // Linear
  linear: (t) => t,

  // Quad
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t),

  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  // Quart
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) ** 4,
  easeInOutQuart: (t) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) ** 4,

  // Quint
  easeInQuint: (t) => t ** 5,
  easeOutQuint: (t) => 1 - (--t) ** 5,
  easeInOutQuint: (t) => t < 0.5 ? 16 * t ** 5 : 1 + 16 * (--t) ** 5,

  // Sine
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Exponential
  easeInExpo: (t) => t === 0 ? 0 : 2 ** (10 * (t - 1)),
  easeOutExpo: (t) => t === 1 ? 1 : 1 - 2 ** (-10 * t),
  easeInOutExpo: (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5
    ? 0.5 * 2 ** (20 * t - 10)
    : 1 - 0.5 * 2 ** (-20 * t + 10),

  // Circular
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt((2 - t) * t),
  easeInOutCirc: (t) => t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2,

  // Elastic
  easeInElastic: (t, a = 1.70158, p = 0.3) =>
    -(a * 2 ** (10 * (t - 1))) * Math.sin(((t - 1 - p) * (2 * Math.PI)) / p),
  easeOutElastic: (t, a = 1.70158, p = 0.3) =>
    a * 2 ** (-10 * t) * Math.sin(((t + p) * (2 * Math.PI)) / p) + 1,
  easeInOutElastic: (t, a = 1.70158, p = 0.3) =>
    t < 0.5
      ? -(a * 2 ** (20 * t - 10) * Math.sin(((20 * t - 11.125) * (2 * Math.PI)) / p)) / 2
      : (a * 2 ** (-20 * t + 10) * Math.sin(((20 * t + 11.125) * (2 * Math.PI)) / p)) / 2 + 1,

  // Back
  easeInBack: (t, s = 1.70158) => s * t * t * ((s + 1) * t - s),
  easeOutBack: (t, s = 1.70158) => 1 + s * (--t) * t * ((s + 1) * t + s),
  easeInOutBack: (t, s = 1.70158) =>
    t < 0.5
      ? (t * t * ((2 * s + 2) * t - s)) / 2
      : ((t * t * ((2 * s + 2) * t - s) + 2) / 2) + 1,

  // Bounce
  easeInBounce: (t) => 1 - easeOutBounce(1 - t),
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInOutBounce: (t) => t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2,

  // Steps
  step1: (t) => t >= 1 ? 1 : 0,
  step3: (t) => t >= 0.667 ? 1 : t >= 0.333 ? 1 : 0,
  step5: (t) => t >= 0.8 ? 1 : t >= 0.6 ? 1 : t >= 0.4 ? 1 : t >= 0.2 ? 1 : 0,
};

/** Resolve easing from string name or function */
export function resolveEasing(easing: EasingFunction | string | undefined): EasingFunction {
  if (!easing) return easings.easeInOutCubic;
  if (typeof easing === "function") return easing;
  const resolved = easings[easing];
  if (resolved) return resolved;
  // Try CSS easing names
  const cssMap: Record<string, keyof typeof easings> = {
    "ease-in": "easeInQuad",
    "ease-out": "easeOutQuad",
    "ease-in-out": "easeInOutQuad",
    "ease-in-cubic": "easeInCubic",
    "ease-out-cubic": "easeOutCubic",
    "ease-in-out-cubic": "easeInOutCubic",
    "ease-in-quart": "easeInQuart",
    "ease-out-quart": "easeOutQuart",
    "ease-in-out-quart": "easeInOutQuart",
    "ease-in-quint": "easeInQuint",
    "ease-out-quint": "easeOutQuint",
    "ease-in-out-quint": "easeInOutQuint",
    "ease-in-sine": "easeInSine",
    "ease-out-sine": "easeOutSine",
    "ease-in-out-sine": "easeInOutSine",
    "ease-in-expo": "easeInExpo",
    "ease-out-expo": "easeOutExpo",
    "ease-in-out-expo": "easeInOutExpo",
    "ease-in-circ": "easeInCirc",
    "ease-out-circ": "easeOutCirc",
    "ease-in-out-circ": "easeInOutCirc",
    "ease-in-elastic": "easeInElastic",
    "ease-out-elastic": "easeOutElastic",
    "ease-in-out-elastic": "easeInOutElastic",
    "ease-in-back": "easeInBack",
    "ease-out-back": "easeOutBack",
    "ease-in-out-back": "easeInOutBack",
    "ease-in-bounce": "easeInBounce",
    "ease-out-bounce": "easeOutBounce",
    "ease-in-out-bounce": "easeInOutBounce",
  };
  return easings[cssMap[easing as string] ?? easings.easeInOutCubic];
}

// --- Core Animation Engine ---

/**
 * Run an animation using requestAnimationFrame.
 * Returns a cancel function.
 */
export function animate(options: AnimationOptions): () => void {
  const {
    duration = 400,
    easing = "easeInOutCubic",
    delay = 0,
    iterations = 1,
    fillMode = "forwards",
    direction = "normal",
    onFrame,
    onComplete,
  } = options;

  const easedFn = resolveEasing(easing);
  let startTime: number | null = null;
  let rafId: number | null = null;
  let currentIteration = 0;
  let cancelled = false;

  function tick(timestamp: number): void {
    if (cancelled) return;

    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime - delay;
    if (elapsed < 0) { rafId = requestAnimationFrame(tick); return; }

    const progress = Math.min(elapsed / duration, 1);

    // Handle direction
    let t = progress;
    if (direction === "alternate" && currentIteration % 2 === 1) t = 1 - t;
    if (direction === "reverse") t = 1 - t;

    const value = easedFn(t);
    onFrame?.(value);

    if (progress >= 1) {
      currentIteration++;
      if (currentIteration < iterations && !cancelled) {
        startTime = null;
        rafId = requestAnimationFrame(tick);
      } else {
        onComplete?.();
        return;
      }
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}

// --- Spring Physics ---

/**
 * Animate using spring physics (mass-spring-damper system).
 * Returns a cancel function.
 */
export function animateSpring(
  from: number,
  to: number,
  config: SpringConfig,
  onUpdate: (value: number) => void,
  onComplete?: () => void,
): () => void {
  const { stiffness = 200, damping = 15, mass = 1, restThreshold = 0.01, velocity: velocity ?? 0 } = config;
  let position = from;
  let vel = velocity;
  let lastTime: number | null = null;
  let rafId: number | null = null;
  let cancelled = false;

  function tick(timestamp: number): void {
    if (cancelled) return;

    if (lastTime === null) { lastTime = timestamp; }
    const dt = Math.min((timestamp - lastTime) / 1000, 0.064); // Cap at ~4 frames
    lastTime = timestamp;

    const force = -stiffness * (position - to);
    const dampingForce = -damping * vel;
    const acc = (force + dampingForce) / mass;
    vel += acc * dt;
    position += vel * dt;

    onUpdate(position);

    if (Math.abs(vel) < restThreshold && Math.abs(position - to) < restThreshold) {
      onComplete?.();
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}

// --- Staggered Animations ---

/**
 * Animate multiple items with staggered timing.
 */
export function staggerAnimate<T>(
  items: T[],
  animator: (item: T, index: number) => void,
  options: StaggerOptions & AnimationOptions = {},
): () => void {
  const {
    staggerMs = 100,
    pattern = "from-start",
    startDelay = 0,
    ...animOpts
  } = options;

  const indices = items.map((_, i) => i);

  // Reorder indices based on pattern
  let orderedIndices: number[];
  switch (pattern) {
    case "from-end":
      orderedIndices = [...indices].reverse();
      break;
    case "center":
      const mid = Math.floor(indices.length / 2);
      orderedIndices = [indices[mid]!, ...indices.filter((i) => i !== mid)];
      break;
    case "reverse":
      orderedIndices = [...indices].reverse();
      break;
    case "random":
      orderedIndices = [...indices].sort(() => Math.random() - 0.5);
      break;
    default:
      orderedIndices = indices;
  }

  const cancels: Array<() => void> = [];

  orderedIndices.forEach((originalIdx, i) => {
    const delay = startDelay + i * staggerMs;
    const cancel = animate({
      ...animOpts,
      delay,
      onFrame: (_p) => animator(items[originalIdx]!, originalIdx),
    });
    cancels.push(cancel);
  });

  return () => cancels.forEach((c) => c());
}

// --- Timeline Sequencing ---

export interface TimelineTrack {
  name: string;
  keyframes: Keyframe[];
  options?: Partial<AnimationOptions>;
}

/**
 * Run animations sequentially or in parallel tracks.
 */
export class Timeline {
  private tracks: TimelineTrack[] = [];
  private currentIndex = 0;
  private isPlaying = false;
  private activeCancel: (() => void) | null = null;

  add(track: TimelineTrack): this {
    this.tracks.push(track);
    return this;
  }

  play(onComplete?: () => void): () => void {
    if (this.isPlaying) return () => {};
    this.isPlaying = true;
    this.currentIndex = 0;

    const runTrack = (idx: number): void => {
      if (idx >= this.tracks.length || !this.isPlaying) {
        this.isPlaying = false;
        onComplete?.();
        return;
      }

      const track = this.tracks[idx]!;
      const opts: AnimationOptions = {
        duration: 300,
        easing: "easeInOutCubic",
        ...track.options,
        onFrame: () => {},
        onComplete: () => runTrack(idx + 1),
      };

      this.activeCancel = animate(opts);
    };

    runTrack(0);

    return () => {
      this.isPlaying = false;
      this.activeCancel?.();
    };
  }
}

// --- Path Animation ---

/**
 * Animate along a Bezier/path curve.
 */
export function animatePath(
  points: Array<{ x: number; y: number }>,
  options: AnimationOptions & { element?: HTMLElement },
): () => void {
  const { element, duration = 500, easing = "easeInOutCubic", onFrame } = options;
  const easedFn = resolveEasing(easing);

  return animate({
    duration,
    easing: easedFn,
    onFrame: (t) => {
      if (points.length < 2) return;
      // Simple linear interpolation through path points
      const totalLen = points.length - 1;
      const segT = t * totalLen;
      const segIdx = Math.min(Math.floor(segT), totalLen - 1);
      const localT = segT - segIdx;
      const p0 = points[segIdx]!;
      const p1 = points[Math.min(segIdx + 1, points.length - 1)]!;

      const x = p0.x + (p1.x - p0.x) * localT;
      const y = p0.y + (p1.y - p0.y) * localT;

      onFrame?.(t);

      if (element) {
        element.style.transform = `translate(${x}px, ${y}px)`;
      }
    },
    ...options,
  });
}

// --- Prebuilt CSS Keyframe Animations ---

export const keyframes = {
  fadeIn: [
    { offset: 0, properties: { opacity: 0 } },
    { offset: 1, properties: { opacity: 1 } },
  ],
  fadeOut: [
    { offset: 0, properties: { opacity: 1 } },
    { offset: 1, properties: { opacity: 0 } },
  ],
  slideInUp: [
    { offset: 0, properties: { transform: "translateY(20px)", opacity: 0 } },
    { offset: 1, properties: { transform: "translateY(0)", opacity: 1 } },
  ],
  slideInDown: [
    { offset: 0, properties: { transform: "translateY(-20px)", opacity: 0 } },
    { offset: 1, properties: { transform: "translateY(0)", opacity: 1 } },
  ],
  slideInLeft: [
    { offset: 0, properties: { transform: "translateX(-20px)", opacity: 0 } },
    { offset: 1, properties: { transform: "translateX(0)", opacity: 1 } },
  ],
  slideInRight: [
    { offset: 0, properties: { transform: "translateX(20px)", opacity: 0 } },
    { offset: 1, properties: { transform: "translateX(0)", opacity: 1 } },
  ],
  scaleIn: [
    { offset: 0, properties: { transform: "scale(0.8)", opacity: 0 } },
    { offset: 1, properties: { transform: "scale(1)", opacity: 1 } },
  ],
  scaleOut: [
    { offset: 0, properties: { transform: "scale(1)", opacity: 1 } },
    { offset: 1, properties: { transform: "scale(0.8)", opacity: 0 } },
  ],
  bounceIn: [
    { offset: 0, properties: { transform: "scale(0.3)", opacity: 0 } },
    { offset: 0.225, properties: { transform: "scale(1.1)" } },
    { offset: 0.444, properties: { transform: "scale(0.95)" } },
    { offset: 0.6, properties: { transform: "scale(1.05)" } },
    { offset: 0.775, properties: { transform: "scale(0.97)" } },
    { offset: 1, properties: { transform: "scale(1)", opacity: 1 } },
  ],
  spin: [
    { offset: 0, properties: { transform: "rotate(0deg)" } },
    { offset: 1, properties: { transform: "rotate(360deg)" } },
  ],
  pulse: [
    { offset: 0, properties: { transform: "scale(1)" } },
    { offset: 0.5, properties: { transform: "scale(1.05)" } },
    { offset: 1, properties: { transform: "scale(1)" } },
  ],
  shake: [
    { offset: 0, properties: { transform: "translateX(0)" } },
    { offset: 0.111, properties: { transform: "translateX(-10px)" } },
    { offset: 0.222, properties: { transform: "translateX(10px)" } },
    { offset: 0.333, properties: { transform: "translateX(-10px)" } },
    { offset: 0.444, properties: { transform: "translateX(10px)" } },
    { offset: 0.556, properties: { transform: translateX(-10px) } },
    { offset: 0.667, properties: { transform: "translateX(10px)" } },
    { offset: 0.778, properties: { transform: "translateX(-10px)" } },
    { offset: 0.889, properties: { transform: "translateX(10px)" } },
    { offset: 1, properties: { transform: "translateX(0)" } },
  ],
} as const;

/** Apply prebuilt animation to an element */
export function playAnimation(
  element: HTMLElement,
  name: keyof typeof keyframes,
  options?: Partial<AnimationOptions>,
): () => void {
  const kf = keyframes[name];
  const opts: AnimationOptions = {
    duration: 400,
    easing: "easeOutCubic",
    element,
    onFrame: (t) => {
      // Interpolate between keyframes
      for (let i = 0; i < kf.length - 1; i++) {
        const k0 = kf[i]!;
        const k1 = kf[i + 1]!;
        if (t >= k0.offset && t <= k1.offset) {
          const localT = (t - k0.offset) / (k1.offset - k0.offset);
          for (const [prop, val] of Object.entries(k1.properties)) {
            const prevVal = String(k0.properties[prop as string] ?? "");
            const interpolated = interpolateValue(prevVal, String(val), localT);
            applyStyle(element, prop, interpolated);
          }
          break;
        }
      }
    },
    ...options,
  };
  return animate(opts);
}

function interpolateValue(from: string, to: string, t: number): string {
  // Numeric interpolation
  const fromNum = parseFloat(from);
  const toNum = parseFloat(to);
  if (!isNaN(fromNum) && !isNaN(toNum)) {
    return String(fromNum + (toNum - fromNum) * t);
  }
  // Color interpolation (simple RGB)
  if (from.startsWith("#") && to.startsWith("#")) {
    return interpolateColor(from, to, t);
  }
  return to;
}

function interpolateColor(from: string, to: string, t: number): string {
  const r1 = parseInt(from.slice(1, 3), 16);
  const g1 = parseInt(from.slice(3, 5), 16);
  const b1 = parseInt(from.slice(5, 7), 16);
  const r2 = parseInt(to.slice(1, 3), 16);
  const g2 = parseInt(to.slice(3, 5), 16);
  const b2 = parseInt(to.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function applyStyle(el: HTMLElement, prop: string, value: string): void {
  if (prop === "transform") {
    el.style.transform = value;
  } else if (prop === "opacity") {
    el.style.opacity = value;
  }
}
