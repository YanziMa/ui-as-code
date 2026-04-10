/**
 * Motion primitives — spring physics, velocity-based animations,
 * gesture-driven motion, inertia, and value interpolation for
 * fluid UI interactions.
 */

// --- Types ---

export interface SpringConfig {
  /** Stiffness (default: 100) */
  stiffness?: number;
  /** Damping ratio (default: 10) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Rest velocity threshold (default: 0.01) */
  restVelocity?: number;
  /** Rest displacement threshold (default: 0.01) */
  restDelta?: number;
}

export interface SpringState {
  current: number;
  velocity: number;
  target: number;
}

export interface MotionValue<T = number> {
  /** Current value */
  get(): T;
  /** Set value immediately */
  set(value: T): void;
  /** Animate to a new value with options */
  to(target: T, options?: MotionTransitionOptions): Promise<void>;
  /** Subscribe to changes */
  subscribe(fn: (value: T) => void): () => void;
  /** Get all subscribers count */
  subscriberCount: number;
}

export interface MotionTransitionOptions {
  /** Duration in ms (default: 300) */
  duration?: number;
  /** Easing function (default: easeOutCubic) */
  easing?: (t: number) => number;
  /** Spring config (overrides duration/easing if provided) */
  spring?: SpringConfig;
  /** Callback on each frame */
  onUpdate?: (value: number, progress: number) => void;
  /** Callback on complete */
  onComplete?: () => void;
}

export interface InertiaOptions {
  /** Initial velocity (px/s or deg/s) */
  velocity: number;
  /** Friction coefficient (default: 0.95) */
  friction?: number;
  /** Minimum velocity before stopping (default: 0.1) */
  minVelocity?: number;
  /** Bounds to constrain within */
  bounds?: { min: number; max: number };
  /** Bounce on boundary hit? (default: false) */
  bounce?: boolean;
  /** Bounce stiffness (default: 500) */
  bounceStiffness?: number;
  /** On update callback */
  onUpdate?: (value: number, velocity: number) => void;
  /** On stop callback */
  onStop?: (finalValue: number) => void;
}

// --- Motion Value ---

/**
 * Reactive value that can be animated between states.
 * Core primitive for building animated UI components.
 */
export class MotionValueImpl<T extends number | string> implements MotionValue<T> {
  private _value: T;
  private listeners = new Set<(value: T) => void>();
  private animating = false;

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get(): T { return this._value; }

  set(value: T): void {
    this._value = value;
    this.notify();
  }

  async to(target: T, options?: MotionTransitionOptions): Promise<void> {
    // For non-numeric values, just set
    if (typeof target !== "number" || typeof this._value !== "number") {
      this._value = target;
      this.notify();
      options?.onComplete?.();
      return;
    }

    return new Promise((resolve) => {
      const from = this._value as unknown as number;
      const to = target as unknown as number;

      if (options?.spring) {
        this.animateSpring(from, to, options.spring, options);
      } else {
        this.animateTween(from, to, options);
      }

      // Resolve after animation completes (simplified)
      const duration = options?.duration ?? 300;
      setTimeout(() => {
        this._value = target;
        this.notify();
        options?.onComplete?.();
        resolve();
      }, duration);
    });
  }

  subscribe(fn: (value: T) => void): () => void {
    this.listeners.add(fn);
    fn(this._value); // Immediate call with current value
    return () => { this.listeners.delete(fn); };
  }

  get subscriberCount(): number { return this.listeners.size; }

  private notify(): void {
    for (const fn of this.listeners) fn(this._value);
  }

  private animateTween(
    from: number,
    to: number,
    options?: MotionTransitionOptions,
  ): void {
    const duration = options?.duration ?? 300;
    const easing = options?.easing ?? ((t: number) => 1 - Math.pow(1 - t, 3)); // easeOutCubic
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(rawProgress);
      const value = from + (to - from) * easedProgress;

      this._value = value as unknown as T;
      this.notify();
      options?.onUpdate?.(value, rawProgress);

      if (rawProgress < 1) {
        requestAnimationFrame(tick);
      } else {
        this._value = to as unknown as T;
        this.notify();
      }
    };

    requestAnimationFrame(tick);
  }

  private animateSpring(
    from: number,
    to: number,
    config: SpringConfig,
    options?: MotionTransitionOptions,
  ): void {
    const spring = createSpring(config);
    let state: SpringState = { current: from, velocity: 0, target: to };
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.064); // Cap at ~15fps equivalent
      lastTime = now;

      state = spring.step(state, dt);
      this._value = state.current as unknown as T;
      this.notify();
      options?.onUpdate?.(state.current, state.velocity);

      if (!spring.isResting(state)) {
        requestAnimationFrame(tick);
      } else {
        this._value = to as unknown as T;
        this.notify();
      }
    };

    requestAnimationFrame(tick);
  }
}

/** Create a reactive motion value */
export function motionValue<T extends number | string>(initial: T): MotionValue<T> {
  return new MotionValueImpl(initial);
}

// --- Spring Physics ---

/**
 * Spring physics model using implicit Euler integration.
 * Based on the spring-damper system: F = -kx - cv
 */
export class Spring {
  private stiffness: number;
  private damping: number;
  private mass: number;
  private restVelocity: number;
  private restDelta: number;

  constructor(config: SpringConfig = {}) {
    this.stiffness = config.stiffness ?? 100;
    this.damping = config.damping ?? 10;
    this.mass = config.mass ?? 1;
    this.restVelocity = config.restVelocity ?? 0.01;
    this.restDelta = config.restDelta ?? 0.01;
  }

  /** Advance the spring state by dt seconds */
  step(state: SpringState, dt: number): SpringState {
    const { current, velocity, target } = state;

    // Spring force: F = -k(x - target)
    // Damping force: F = -cv
    // Acceleration: a = F/m
    const springForce = -this.stiffness * (current - target);
    const dampingForce = -this.damping * velocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    // Semi-implicit Euler integration
    const newVelocity = velocity + acceleration * dt;
    const newCurrent = current + newVelocity * dt;

    return {
      current: newCurrent,
      velocity: newVelocity,
      target,
    };
  }

  /** Check if spring has come to rest */
  isResting(state: SpringState): boolean {
    return (
      Math.abs(state.velocity) < this.restVelocity &&
      Math.abs(state.current - state.target) < this.restDelta
    );
  }

  /** Get natural frequency of oscillation (rad/s) */
  get frequency(): number {
    return Math.sqrt(this.stiffness / this.mass);
  }

  /** Get damping ratio (zeta). <1 = underdamped, =1 critically damped, >1 overdamped */
  get dampingRatio(): number {
    return this.damping / (2 * Math.sqrt(this.stiffness * this.mass));
  }
}

/** Create a spring with given config */
export function createSpring(config?: SpringConfig): Spring {
  return new Spring(config);
}

// --- Inertia / Momentum ---

/**
 * Simulate inertial scrolling/throwing with friction.
 * Returns cleanup function.
 */
export function inertia(
  initialValue: number,
  options: InertiaOptions,
): { stop: () => void; getValue: () => number } {
  let value = initialValue;
  let velocity = options.velocity;
  const friction = options.friction ?? 0.95;
  const minVelocity = options.minVelocity ?? 0.1;
  let rafId: number | null = null;
  let active = true;

  function tick(): void {
    if (!active) return;

    value += velocity;
    velocity *= friction;

    // Bounds checking
    if (options.bounds) {
      if (value < options.bounds.min) {
        if (options.bounce) {
          value = options.bounds.min;
          velocity = -velocity * 0.5;
        } else {
          value = options.bounds.min;
          velocity = 0;
        }
      }
      if (value > options.bounds.max) {
        if (options.bounce) {
          value = options.bounds.max;
          velocity = -velocity * 0.5;
        } else {
          value = options.bounds.max;
          velocity = 0;
        }
      }
    }

    options.onUpdate?.(value, velocity);

    if (Math.abs(velocity) < minVelocity) {
      active = false;
      options.onStop?.(value);
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
    },
    getValue() { return value; },
  };
}

// --- Value Interpolation ---

/** Interpolate between two values by progress (0-1) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate an array of values by progress */
export function interpolate(values: number[], t: number): number {
  t = Math.max(0, Math.min(1, t));
  const segmentCount = values.length - 1;
  const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
  const localT = (t * segmentCount) - segment;
  return lerp(values[segment]!, values[segment + 1]!, localT);
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Map value from one range to another */
export function mapRange(
  value: number,
  inMin: number, inMax: number,
  outMin: number, outMax: number,
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}
