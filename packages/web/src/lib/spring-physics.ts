/**
 * Spring Physics: Natural motion animation engine based on spring dynamics.
 * Configurable stiffness, damping, mass, velocity, and precision.
 * Supports spring chains, to/from animations, and real-time parameter updates.
 */

// --- Types ---

export interface SpringConfig {
  /** Spring stiffness (higher = tighter, default: 170) */
  stiffness?: number;
  /** Damping ratio (0 = oscillate forever, 1 = critically damped, default: 26) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Initial velocity (px/s or unit/s) */
  velocity?: number;
  /** Rest position / target value */
  restValue?: number;
  /** Precision threshold for settling (default: 0.01) */
  precision?: number;
  /** Maximum duration before force-settling (ms, default: 10000) */
  maxDuration?: number;
}

export interface SpringOptions {
  /** Target element(s) */
  target: HTMLElement | HTMLElement[];
  /** CSS property to animate (or "transform" for x/y) */
  property: string;
  /** From value */
  from: number;
  /** To value */
  to: number;
  /** Spring configuration */
  spring?: SpringConfig;
  /** Callback each frame with current value */
  onUpdate?: (value: number, velocity: number, settled: boolean) => void;
  /** Callback when settled */
  onSettle?: (value: number) => void;
  /** Callback on start */
  onStart?: () => void;
  /** Unit suffix (e.g., "px", "%", "deg") */
  unit?: string;
  /** Use transform instead of style property? */
  useTransform?: boolean;
  /** Transform function name when useTransform=true (default: translateX) */
  transformFn?: string;
}

export interface SpringInstance {
  /** Current value */
  getValue: () => number;
  /** Current velocity */
  getVelocity: () => number;
  /** Check if settled */
  isSettled: () => bool;
  /** Set a new target value (springs to it) */
  setTarget: (value: number) => void;
  /** Apply an impulse (instant velocity change) */
  impulse: (velocity: number) => void;
  /** Update spring parameters dynamically */
  updateConfig: (config: Partial<SpringConfig>) => void;
  /** Stop the animation immediately */
  stop: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

export interface ChainableSpring extends SpringInstance {
  /** Chain another spring after this one settles */
  then: (nextOptions: Omit<SpringOptions, "from">) => ChainableSpring;
}

// --- Spring Solver ---

interface SpringState {
  value: number;
  velocity: number;
  restValue: number;
  stiffness: number;
  damping: number;
  mass: number;
  settled: boolean;
  startTime: number;
}

function solveSpring(state: SpringState, dt: number): { value: number; velocity: number; settled: boolean } {
  const { value, velocity, restValue, stiffness, damping, mass } = state;

  // Spring force: F = -k * (x - rest)
  // Damping force: F = -c * v
  // Acceleration: a = F / m
  const springForce = -stiffness * (value - restValue);
  const dampingForce = -damping * velocity;
  const acceleration = (springForce + dampingForce) / mass;

  // Semi-implicit Euler integration
  const newVelocity = velocity + acceleration * dt;
  const newValue = value + newVelocity * dt;

  // Check settling
  const displacement = Math.abs(newValue - restValue);
  const speed = Math.abs(newVelocity);

  const settled = displacement < 0.01 && speed < 0.01;

  return { value: newValue, velocity: newVelocity, settled };
}

/** Run spring simulation until settled or timeout */
function runSpringSimulation(
  initial: SpringState,
  opts: { precision: number; maxDuration: number; onUpdate: (v: number, vel: number, settled: boolean) => void },
): void {
  let state = { ...initial, startTime: performance.now() };

  function step(timestamp: number): void {
    if (state.settled) return;

    const elapsed = timestamp - state.startTime;
    if (elapsed > opts.maxDuration) {
      state.value = state.restValue;
      state.velocity = 0;
      state.settled = true;
      opts.onUpdate(state.value, state.velocity, true);
      return;
    }

    // Sub-stepping for stability
    const subSteps = Math.ceil(elapsed / 16); // ~60fps worth of steps
    const effectiveDt = Math.min(1 / 60, elapsed / Math.max(1, subSteps));

    for (let i = 0; i < Math.max(1, subSteps); i++) {
      const result = solveSpring(state, effectiveDt);
      state.value = result.value;
      state.velocity = result.velocity;
      state.settled = result.settled;

      if (state.settled) break;
    }

    opts.onUpdate(state.value, state.velocity, state.settled);

    if (!state.settled) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

// --- Main Factory ---

export function createSpring(options: SpringOptions): ChainableSpring {
  const elements = Array.isArray(options.target) ? options.target : [options.target];
  const cfg = {
    stiffness: options.spring?.stiffness ?? 170,
    damping: options.spring?.damping ?? 26,
    mass: options.spring?.mass ?? 1,
    velocity: options.spring?.velocity ?? 0,
    restValue: options.to,
    precision: options.spring?.precision ?? 0.01,
    maxDuration: options.spring?.maxDuration ?? 10000,
  };

  let currentValue = options.from;
  let currentVelocity = cfg.velocity;
  let settled = false;
  let destroyed = false;
  let rafId: number | null = null;
  let chainNext: (() => void) | null = null;

  function applyValue(value: number): void {
    const unit = options.unit ?? "px";
    const valStr = `${Math.round(value * 100) / 100}${unit}`;

    for (const el of elements) {
      if (options.useTransform || options.property === "x" || options.property === "y" || options.property === "translateX" || options.property === "translateY") {
        const fn = options.transformFn ??
          (options.property === "y" ? "translateY" : "translateX");
        el.style.transform = `${fn}(${valStr})`;
      } else {
        (el.style as Record<string, string>)[options.property] = valStr;
      }
    }
  }

  function startAnimation(fromVal: number, toVal: number): void {
    settled = false;
    currentValue = fromVal;
    currentVelocity = cfg.velocity;
    cfg.restValue = toVal;

    applyValue(currentValue);
    options.onStart?.();

    const state: SpringState = {
      value: currentValue,
      velocity: currentVelocity,
      restValue: toVal,
      ...cfg,
      settled: false,
      startTime: performance.now(),
    };

    runSpringSimulation(state, {
      precision: cfg.precision,
      maxDuration: cfg.maxDuration,
      onUpdate: (v, vel, s) => {
        currentValue = v;
        currentVelocity = vel;
        settled = s;
        applyValue(v);
        options.onUpdate?.(v, vel, s);

        if (s && !destroyed) {
          options.onSettle?.(v);
          if (chainNext) {
            const next = chainNext;
            chainNext = null;
            next();
          }
        }
      },
    });
  }

  // Start immediately
  startAnimation(options.from, options.to);

  const instance: ChainableSpring = {
    getValue: () => currentValue,
    getVelocity: () => currentVelocity,
    isSettled: () => settled,

    setTarget(value: number) {
      startAnimation(currentValue, value);
    },

    impulse(velocity: number) {
      currentVelocity += velocity;
      // Re-trigger simulation with new velocity
      if (!settled && !destroyed) {
        // Just modify the running state's velocity
        // For simplicity, restart from current position
        startAnimation(currentValue, cfg.restValue);
      }
    },

    updateConfig(newCfg: Partial<SpringConfig>) {
      Object.assign(cfg, newCfg);
    },

    stop() {
      settled = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    },

    destroy() {
      destroyed = true;
      instance.stop();
    },

    then(nextOpts) {
      chainNext = () => createSpring({
        ...nextOpts,
        from: currentValue,
        target: options.target,
        property: options.property,
        unit: options.unit,
        useTransform: options.useTransform,
        transformFn: options.transformFn,
      });
      return instance; // returns self for chaining
    },
  };

  return instance;
}

// --- Preset Spring Configurations ---

export const SpringPresets = {
  /** Gentle, slow spring (good for UI elements appearing) */
  gentle: { stiffness: 120, damping: 20, mass: 1 },
  /** Default snappy spring */
  default: { stiffness: 170, damping: 26, mass: 1 },
  /** Stiff, quick spring (good for responsive feedback) */
  stiff: { stiffness: 300, damping: 30, mass: 1 },
  /** Bouncy, oscillating spring */
  bouncy: { stiffness: 180, damping: 10, mass: 1 },
  /** Very slow, heavy feel */
  slow: { stiffness: 60, damping: 20, mass: 2 },
  /** No oscillation, critically damped */
  noBounce: { stiffness: 200, damping: 28.3, mass: 1 }, // sqrt(4*stiffness*mass)
  /** Wobbly, lots of overshoot */
  wobbly: { stiffness: 100, damping: 5, mass: 1 },
} as const;

/** Create a spring using a named preset */
export function createPresetSpring(
  preset: keyof typeof SpringPresets,
  options: Omit<SpringOptions, "spring">,
): ChainableSpring {
  return createSpring({ ...options, spring: { ...SpringPresets[preset], ...options.spring } });
}
