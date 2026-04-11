/**
 * React Motion: Spring physics, gesture-based animations,
 * layout transitions, staggered animations, and animation
 * orchestration utilities for React.
 */

// --- Types ---

export interface SpringConfig {
  /** Stiffness of the spring (default: 170) */
  stiffness?: number;
  /** Damping ratio (default: 26) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Precision threshold (default: 0.01) */
  precision?: number;
}

export interface AnimationOptions {
  /** Duration in ms (for tween animations) */
  duration?: number;
  /** Easing function */
  easing?: (t: number) => number;
  /** Delay before start (ms) */
  delay?: number;
  /** Callback on complete */
  onComplete?: () => void;
}

export type EasingFn = (t: number) => number;

// --- Built-in Easings ---

export const easings: Record<string, EasingFn> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? Math.pow(2, 20 * t - 10) / 2
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  easeOutElastic: (t) => {
    const p = 0.3; // period
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },
  easeOutBack: (t) => {
    const s = 1.70158;
    return (--t) * t * ((s + 1) * t + s) + 1;
  },
  easeOutBounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
    t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
  },
};

// --- Spring Physics Engine ---

/**
 * Simple spring physics simulation.
 *
 * @example
 * const spring = createSpring({ to: 100 });
 * spring.onUpdate((v) => console.log(v));
 */
export function createSpring(
  from: number,
  to: number,
  config: SpringConfig = {},
): {
  start: () => void;
  stop: () => void;
  getCurrent: () => number;
  onUpdate: (fn: (value: number) => void) => () => void;
} {
  const {
    stiffness = 170,
    damping = 26,
    mass = 1,
    precision = 0.01,
  } = config;

  let current = from;
  let velocity = 0;
  let rafId: number | null = null;
  let running = false;
  const listeners = new Set<(value: number) => void>();

  function step(): void {
    // Hooke's law with damping: F = -kx - cv
    const displacement = current - to;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration / 60; // Assuming ~60fps
    current += velocity / 60;

    for (const fn of listeners) fn(current);

    // Check if settled
    if (
      Math.abs(current - to) < precision &&
      Math.abs(velocity) < precision
    ) {
      current = to;
      velocity = 0;
      for (const fn of listeners) fn(current);
      running = false;
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(step);
  }

  function start(): void {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(step);
  }

  function stop(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    running = false;
    rafId = null;
  }

  function onUpdate(fn: (value: number) => void): () => void {
    listeners.add(fn);
    return (): void => { listeners.delete(fn); };
  }

  return { start, stop, getCurrent: () => current, onUpdate };
}

// --- Tween Animation ---

/** Create a simple tween animation from one value to another */
export function createTween(
  from: number,
  to: number,
  options: AnimationOptions & { springConfig?: SpringConfig } = {},
): {
  start: () => void;
  pause: () => void;
  resume: () => void;
  seek: (progress: number) => void;
  getCurrent: () => number;
  onUpdate: (fn: (value: number) => void) => () => void;
} {
  const duration = options.duration ?? 300;
  const easing = options.easing ?? easings.easeOutCubic;
  const delay = options.delay ?? 0;

  let startTime: number | null = null;
  let pausedAt = 0;
  let pausedProgress = 0;
  let rafId: number | null = null;
  let current = from;
  const listeners = new Set<(value: number) => void>();

  function tick(now: number): void {
    if (startTime === null) startTime = now;
    const elapsed = now - startTime - delay;

    if (elapsed < 0) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    current = from + (to - from) * easedProgress;

    for (const fn of listeners) fn(current);

    if (progress >= 1) {
      current = to;
      for (const fn of listeners) fn(current);
      options.onComplete?.();
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  function start(): void {
    startTime = null;
    pausedProgress = 0;
    rafId = requestAnimationFrame(tick);
  }

  function pause(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    pausedProgress = startTime ? (performance.now() - startTime - delay) / duration : 0;
    rafId = null;
  }

  function resume(): void {
    if (pausedProgress > 0 && pausedProgress < 1) {
      startTime = performance.now() - pausedProgress * duration - delay;
      rafId = requestAnimationFrame(tick);
    }
  }

  function seek(progress: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    current = from + (to - from) * easing(clamped);
    for (const fn of listeners) fn(current);
  }

  function onUpdate(fn: (value: number) => void): () => void {
    listeners.add(fn);
    return (): void => { listeners.delete(fn); };
  }

  return { start, pause, resume, seek, getCurrent: () => current, onUpdate };
}

// --- Staggered Animation Orchestrator ---

/** Orchestrate multiple animations with staggered delays */
export function createStagger<T>(
  items: T[],
  animateItem: (item: T, index: number) => { start: () => void },
  options: { staggerDelay?: number; reverse?: boolean } = {},
): { play: () => void; stop: () => void } {
  const { staggerDelay = 50, reverse = false } = options;
  const animators: ReturnType<typeof animateItem>[] = [];
  const order = reverse ? [...items].reverse() : items;

  for (let i = 0; i < order.length; i++) {
    animators.push(animateItem(order[i]!, i));
  }

  let timers: ReturnType<typeof setTimeout>[] = [];

  function play(): void {
    stop();
    for (let i = 0; i < animators.length; i++) {
      const timer = setTimeout(() => animators[i]?.start(), i * staggerDelay);
      timers.push(timer);
    }
  }

  function stop(): void {
    for (const t of timers) clearTimeout(t);
    timers = [];
  }

  return { play, stop };
}

// --- Keyframe Builder ---

/** Build CSS keyframe string from value array */
export function buildKeyframes(
  name: string,
  frames: Array<{ offset: number; [property: string]: string | number }>,
): string {
  const rules = frames.map((f) =>
    `${(f.offset * 100).toFixed(1)}% { ${Object.entries(f)
      .filter(([k]) => k !== "offset")
      .map(([k, v]) => `${k}: ${v}`)
      .join("; ")} }`,
  ).join("\n");

  return `@keyframes ${name} {\n${rules}\n}`;
}

/** Generate unique keyframe name */
let keyframeCounter = 0;
export function generateKeyframeName(prefix = "motion"): string {
  return `${prefix}-${++keyframeCounter}`;
}
