/**
 * Framer Motion: CSS animation engine inspired by Framer Motion.
 * Provides spring, tween, keyframe, stagger, orchestration, and
 * gesture-driven animations for DOM elements. No dependencies.
 */

// --- Types ---

export type EasingFunction = (t: number) => number;

export type AnimationType = "spring" | "tween" | "keyframes" | "none";

export interface SpringConfig {
  /** Stiffness: higher = more bouncy (default: 170) */
  stiffness?: number;
  /** Damping: friction (default: 26) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Rest threshold velocity (default: 0.01) */
  restSpeed?: number;
}

export interface TweenConfig {
  /** Duration in ms (default: 300) */
  duration?: number;
  /** Delay before start in ms */
  delay?: number;
  /** Easing function or preset name */
  ease?: EasingFunction | string;
  /** From value (0) */
  from?: number;
  /** To value (1) */
  to?: number;
  /** Loop? */
  loop?: boolean;
  /** Alternate direction on loop? */
  yoyo?: boolean;
  /** Number of iterations (Infinity if omitted with loop) */
  repeat?: number;
}

export interface Keyframe {
  /** Offset 0-1 */
  offset: number;
  /** Value at this offset */
  value: number | string;
  /** Easing between this and next keyframe */
  easing?: EasingFunction | string;
}

export interface StaggerOptions {
  /** Stagger delay between items (ms) */
  stagger?: number;
  /** Start direction: "forward" | "reverse" | "from-center" | "to-center" */
  from?: "forward" | "reverse" | "from-center" | "to-center";
  /** Start index offset */
  startFrom?: number;
}

export interface AnimateOptions {
  /** Target element(s) */
  elements: HTMLElement | HTMLElement[] | NodeList;
  /** Properties to animate (CSS property names) */
  properties: string | string[];
  /** Animation type */
  type?: AnimationType;
  /** Spring config (for type="spring") */
  spring?: SpringConfig;
  /** Tween config (for type="tween") */
  tween?: TweenConfig;
  /** Keyframes (for type="keyframes") */
  keyframes?: Keyframe[];
  /** Initial values map (property → value) */
  initial?: Record<string, number | string>;
  /** Final values map (property → value) */
  target?: Record<string, number | string>;
  /** On complete callback */
  onComplete?: () => void;
  /** On update callback (called every frame) */
  onUpdate?: (progress: number) => void;
  /** Play state control */
  playState?: "playing" | "paused" | "finished";
}

// --- Easing Presets ---

const EASINGS: Record<string, EasingFunction> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (t - 2) + 1),
  // Quartic
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) ** 4,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - (--t) ** 4),
  // Elastic
  easeInElastic: (t) => { const c4 = (2 * Math.PI) / 3; return -(Math.cos(t * c4) * Math.sin(t * c4)) + t; },
  easeOutElastic: (t) => { const c4 = (2 * Math.PI) / 3; return Math.sin(t * c4) * Math.cos(t * c4) + t; },
  easeInOutElastic: (t) => { const c5 = (2 * Math.PI) / 3; return t < 0.5 ? -(Math.sin(c5 * (2 * t * Math.PI)) * Math.sin(c5 * (2 * t * Math.PI))) * 2 * t : Math.sin(c5 * (2 * t * Math.PI)) * Math.cos(c5 * (2 * t * Math.PI)) * (2 - 2 * t); },
  // Back
  easeInBack: (s) => { const c = 1.70158; return s * s * ((c + 1) * s - c); },
  easeOutBack: (s) => { const c = 1.70158; return 1 + (++s) * s * ((c + 1) * s + c); },
  easeInOutBack: (s) => { const c = 1.70158; return s < 0.5 ? 4 * s * s * s * ((c + 1) * s - c) : 1 + (-2 * s + 2) * s * s * ((c + 1) * s + c); },
  // Bounce
  bounce: (t) => {
    const n1 = 7.5625; const d1 = 2.75; if (t < 1 / d1) return n1 * t * t; else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75; else return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

function resolveEase(ease: EasingFunction | string | undefined): EasingFunction {
  if (!ease) return EASINGS.easeOut;
  if (typeof ease === "function") return ease;
  return EASINGS[ease] ?? EASINGS.easeOut;
}

// --- Spring Solver (semi-implicit Euler) ---

function solveSpring(
  current: number,
  velocity: number,
  stiffness: number,
  damping: number,
  mass: number,
  dt: number,
): [number, number] {
  const springForce = -stiffness * current;
  const damperForce = -damping * velocity;
  const acceleration = (springForce + damperForce) / mass;
  const newVelocity = velocity + acceleration * dt;
  const newPosition = current + newVelocity * dt;
  return [newPosition, newVelocity];
}

// --- Main Animate Function ---

/**
 * Animate CSS properties on element(s).
 *
 * @example
 * ```ts
 * animate({
 *   elements: document.querySelector(".box"),
 *   properties: ["transform", "opacity"],
 *   type: "spring",
 *   spring: { stiffness: 200, damping: 20 },
 *   target: { transform: "translateX(100px)", opacity: 1 },
 * });
 * ```
 */
export function animate(options: AnimateOptions): {
  const {
    elements,
    properties: props,
    type = "tween",
    spring = {},
    tween = {},
    keyframes: kfs,
    initial = {},
    target = {},
    onComplete,
    onUpdate,
    playState = "playing",
  } = options;

  const els: HTMLElement[] = Array.isArray(elements)
    ? Array.from(elements)
    : elements instanceof NodeList
      ? Array.from(elements as unknown as HTMLElement[])
      : [elements];

  const propList = Array.isArray(props) ? props : [props];
  const startTime = performance.now();
  let animationId: number;

  // Resolve initial values from computed style
  const initialValues: Record<string, number | string> = {};
  for (const prop of propList) {
    initialValues[prop] = initial[prop] ?? getComputedValue(els[0], prop);
  }

  const targetValues: Record<string, number | string> = { ...target };

  // Cancel any existing animation on these elements
  for (const el of els) {
    const prev = (el as any).__fmAnimationId;
    if (prev !== undefined) cancelAnimationFrame(prev);
  }

  let rafId: number;

  function tick(timestamp: void) {
    const elapsed = timestamp - startTime;
    const delay = tween.delay ?? 0;

    switch (type) {
      case "spring": {
        const { stiffness = 170, damping = 26, mass = 1, restSpeed = 0.01 } = spring;
        const dt = 1 / 60; // Fixed timestep

        let allSettled = true;
        const states: Map<string, { pos: number; vel: number }> = new Map();

        for (const prop of propList) {
          const from = Number(initialValues[prop]) || 0;
          const to = Number(targetValues[prop]) || 0;
          let pos = from;
          let vel = 0;

          for (let i = 0; i < 10; i++) { // Max iterations per frame
            [pos, vel] = solveSpring(pos, vel, stiffness, damping, mass, dt);
            if (Math.abs(vel) < restSpeed && Math.abs(pos - to) < 0.01) {
              pos = to; vel = 0;
              break;
            }
          }

          states.set(prop, { pos, vel });
          if (Math.abs(pos - to) > 0.01) allSettled = false;
        }

        applyValues(states);
        onUpdate?.(elapsed);

        if (allSettled || elapsed > 5000) {
          finish();
        } else {
          rafId = requestAnimationFrame(tick);
        }
        break;
      }

      case "keyframes": {
        if (!kfs || kfs.length === 0) { finish(); return; }
        const totalDuration = tween.duration ?? 1000;
        const progress = Math.min((elapsed - delay) / totalDuration, 1);

        if (progress >= 1) {
          // Apply final keyframe
          const lastKf = kfs[kfs.length - 1]!;
          for (const prop of propList) {
            applyProp(els, prop, String(lastKf.value));
          }
          finish();
        } else {
          // Find surrounding keyframes
          for (const prop of propList) {
            let val = Number(initialValues[prop]) || 0;
            for (let i = 0; i < kfs.length - 1; i++) {
              const kf = kfs[i]!;
              const nextKf = kfs[i + 1]!;
              const kfOffset = kf.offset;
              const nextOffset = nextKf.offset;
              if (progress >= kfOffset && progress < nextOffset) {
                const localT = (progress - kfOffset) / (nextOffset - kfOffset);
                const eased = resolveEase(kf.easing)(localT);
                val = Number(kf.value) + (Number(nextKf.value) - Number(kf.value)) * eased;
                break;
              }
            }
            applyProp(els, prop, String(val));
          }
          onUpdate?.(progress);
          rafId = requestAnimationFrame(tick);
        }
        break;
      }

      default: { // tween
        const duration = tween.duration ?? 300;
        const easeFn = resolveEase(tween.ease);
        const totalDuration = duration + delay;
        const progress = Math.min(Math.max((elapsed - delay) / totalDuration, 0), 1);

        if (progress >= 1) {
          for (const prop of propList) {
            applyProp(els, prop, String(targetValues[prop] ?? initialValues[prop]));
          }
          finish();
        } else {
          const eased = easeFn(progress);
          for (const prop of propList) {
            const from = Number(initialValues[prop]) || 0;
            const to = Number(targetValues[prop]);
            const val = from + (to - from) * eased;
            applyProp(els, prop, String(val));
          }
          onUpdate?.(progress);
          rafId = requestAnimationFrame(tick);
        }
        break;
    }
  }

  function finish(): void {
    // Apply final values
    for (const prop of propList) {
      applyProp(els, prop, String(targetValues[prop] ?? initialValues[prop]));
    }
    cancelAnimationFrame(rafId);
    onComplete?.();
  }

  // Store animation ID for cancellation
  animationId = rafId = requestAnimationFrame(tick);
  for (const el of els) {
    (el as any).__fmAnimationId = animationId;
  }

  return {
    pause() { cancelAnimationFrame(rafId); },
    resume() { rafId = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(rafId); for (const el of els) { delete (el as any).__fmAnimationId; } },
    finished: new Promise<void>((resolve) => {
      const origComplete = onComplete;
      onComplete = () => { origComplete?.(); resolve(); };
    }),
  };
}

// --- Stagger ---

/**
 * Apply staggered animations to multiple elements.
 *
 * @example
 * ```ts
 * staggerAnimate(items, {
 *   properties: ["opacity", "transform"],
 *   tween: { duration: 400 },
 *   stagger: 50,
 *   target: { opacity: 1, transform: "translateY(0)" },
 * });
 * ```
 */
export function staggerAnimate(
  elements: HTMLElement[],
  options: Omit<AnimateOptions, "elements"> & { stagger?: number; from?: string },
): Promise<void>[] {
  const { stagger = 50, from = "forward", ...animOpts } = options;
  const results: Promise<void>[] = [];

  for (let i = 0; i < elements.length; i++) {
    const delay = from === "reverse"
      ? (elements.length - 1 - i) * stagger
      : from === "from-center"
        ? Math.abs(i - (elements.length - 1) / 2) * stagger
        : from === "to-center"
          ? Math.abs(i - (elements.length - 1) / 2) * stagger
          : i * stagger + (options.startFrom ?? 0);

    const anim = animate({
      ...animOpts,
      elements: elements[i],
      tween: { ...animOpts.tween, delay: delay + (animOpts.tween?.delay ?? 0) },
    });

    results.push(anim.finished);
  }

  return Promise.all(results);
}

// --- Orchestration ---

/** Run animations sequentially */
export async function sequence(animations: Array<() => Promise<void> | void>): Promise<void> {
  for (const anim of animations) {
    await anim();
  }
}

/** Run animations in parallel */
export async function parallel(animations: Array<() => Promise<void> | void>): Promise<void> {
  await Promise.all(animations.map((a) => a()));
}

// --- Gesture Animations ---

/** While pressed / hover animation (scale down slightly, returns on release) */
export function whilePressed(
  element: HTMLElement,
  options: { scale?: number; opacity?: number; duration?: number; property?: string },
): () => void {
  const { scale = 0.97, opacity = 0.8, duration = 150, property = "transform" } = options;

  const start = () => {
    animate({
      elements,
      properties: [property],
      type: "tween",
      tween: { duration, ease: "easeOut", target: { [property]: `scale(${scale})`, opacity } },
    });
  };

  const end = () => {
    animate({
      elements,
      properties: [property],
      type: "tween",
      tween: { duration, ease: "easeOut", target: { [property]: "scale(1)", opacity: 1 } },
    });
  };

  element.addEventListener("mousedown", start);
  element.addEventListener("mouseup", end);
  element.addEventListener("mouseleave", end);
  element.addEventListener("touchstart", start);
  element.addEventListener("touchend", end);

  return () => {
    element.removeEventListener("mousedown", start);
    element.removeEventListener("mouseup", end);
    element.removeEventListener("mouseleave", end);
    element.removeEventListener("touchstart", start);
    element.removeEventListener("touchend", end);
    end(); // Reset
  };
}

// --- Helpers ---

function getComputedValue(el: HTMLElement, prop: string): string | number {
  if (prop === "opacity") return parseFloat(getComputedStyle(el).opacity);
  if (prop === "transform") return getComputedStyle(el).transform || "none";
  return getComputedStyle(el).getPropertyValue(prop) ?? "";
}

function applyProp(els: HTMLElement[], prop: string, value: string): void {
  for (const el of els) {
    if (prop === "opacity") {
      el.style.opacity = value;
    } else if (prop === "transform") {
      el.style.transform = value;
    } else {
      el.style.setProperty(prop, value);
    }
  }
}
