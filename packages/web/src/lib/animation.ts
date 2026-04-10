/**
 * Animation utilities and CSS animation helpers.
 */

/** Common easing functions */
export const EASING = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutElastic: (t: number) => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
  },
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
} as const;

export type EasingName = keyof typeof EASING;

/** Animate a numeric value from start to end over duration */
export function animateValue(
  start: number,
  end: number,
  duration: number,
  callback: (value: number) => void,
  easing: ((t: number) => number) = EASING.easeOutQuad,
): { cancel: () => void } {
  const startTime = performance.now();

  let cancelled = false;

  function tick(now: number) {
    if (cancelled) return;

    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(progress);
    const value = start + (end - start) * easedProgress;

    callback(value);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);

  return { cancel: () => { cancelled = true; } };
}

/** Spring physics parameters */
export interface SpringConfig {
  /** Stiffness (default: 100) */
  stiffness?: number;
  /** Damping ratio (default: 10) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Velocity threshold to stop (default: 0.01) */
  velocityThreshold?: number;
}

const DEFAULT_SPRING: Required<SpringConfig> = {
  stiffness: 100,
  damping: 10,
  mass: 1,
  velocityThreshold: 0.01,
};

/** Spring-based animation */
export function springAnimate(
  from: number,
  to: number,
  callback: (value: number) => void,
  config?: SpringConfig,
): { cancel: () => void } {
  const { stiffness, damping, mass, velocityThreshold } = { ...DEFAULT_SPRING, ...config };

  let position = from;
  let velocity = 0;
  let cancelled = false;
  let lastTime: number | null = null;

  function tick(time: number) {
    if (cancelled) return;

    if (lastTime === null) {
      lastTime = time;
      requestAnimationFrame(tick);
      return;
    }

    // Cap delta to avoid huge jumps on tab switch
    const dt = Math.min((time - lastTime) / 1000, 0.064); // Max ~64ms
    lastTime = time;

    // Spring force: F = -k(x - target)
    const springForce = -stiffness * (position - to);
    // Damping force: F = -c*v
    const dampingForce = -damping * velocity;
    // Acceleration: a = F/m
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    position += velocity * dt;

    callback(position);

    // Check if settled
    const displacement = Math.abs(position - to);
    if (displacement < 0.001 && Math.abs(velocity) < velocityThreshold) {
      callback(to); // Snap to target
      return;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  return { cancel: () => { cancelled = true; } };
}

/** Generate CSS keyframe string */
export function cssKeyframes(
  name: string,
  frames: Record<string, string>,
): string {
  const frameEntries = Object.entries(frames)
    .map(([percent, styles]) => `  ${percent} { ${styles} }`)
    .join("\n");
  return `@keyframes ${name} {\n${frameEntries}\n}`;
}

/** Pre-built keyframe definitions */
export const KEYFRAMES = {
  fadeIn: cssKeyframes("fadeIn", {
    "0%": "opacity: 0",
    "100%": "opacity: 1",
  }),
  fadeOut: cssKeyframes("fadeOut", {
    "0%": "opacity: 1",
    "100%": "opacity: 0",
  }),
  slideUp: cssKeyframes("slideUp", {
    "0%": "transform: translateY(10px); opacity: 0",
    "100%": "transform: translateY(0); opacity: 1",
  }),
  slideDown: cssKeyframes("slideDown", {
    "0%": "transform: translateY(-10px); opacity: 0",
    "100%": "transform: translateY(0); opacity: 1",
  }),
  scaleIn: cssKeyframes("scaleIn", {
    "0%": "transform: scale(0.95); opacity: 0",
    "100%": "transform: scale(1); opacity: 1",
  }),
  spin: cssKeyframes("spin", {
    "0%": "transform: rotate(0deg)",
    "100%": "transform: rotate(360deg)",
  }),
  pulse: cssKeyframes("pulse", {
    "0%, 100%": "opacity: 1",
    "50%": "opacity: 0.5",
  }),
  bounce: cssKeyframes("bounce", {
    "0%, 100%": "transform: translateY(-5%)",
    "50%": "transform: translateY(0)",
  }),
  shake: cssKeyframes("shake", {
    "0%, 100%": "transform: translateX(0)",
    "10%, 30%, 50%, 70%, 90%": "transform: translateX(-2px)",
    "20%, 40%, 60%, 80%": "transform: translateX(2px)",
  }),
} as const;

/** Animation duration presets */
export const DURATION = {
  instant: "75ms",
  fast: "150ms",
  normal: "300ms",
  slow: "500ms",
  slower: "700ms",
  verySlow: "1000ms",
} as const;

/** Transition shorthand builder */
export function transition(
  properties: string | string[],
  duration: keyof typeof DURATION = "normal",
  easing = "ease-out",
): string {
  const props = Array.isArray(properties) ? properties.join(", ") : properties;
  return `${props} ${DURATION[duration]} ${easing}`;
}
