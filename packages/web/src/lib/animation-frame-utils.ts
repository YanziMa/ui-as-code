/**
 * Animation Frame Utilities: rAF wrapper, animation loop, easing functions,
 * spring physics, animation scheduler, tween engine, value interpolation,
 * frame rate tracking, and performance-aware rendering.
 */

// --- Types ---

export type EasingFunction = (t: number) => number;

export interface TweenOptions {
  /** Start value */
  from: number;
  /** End value */
  to: number;
  /** Duration in ms. Default 300 */
  duration?: number;
  /** Easing function. Default easeOutCubic */
  easing?: EasingFunction;
  /** Called each frame with current value (0-1 progress, current value) */
  onUpdate?: (value: number, progress: number) => void;
  /** Called when complete */
  onComplete?: (value: number) => void;
  /** Delay before start in ms. Default 0 */
  delay?: number;
  /** Repeat: -1 = infinite, N = N times. Default 1 */
  repeat?: number;
  /** Yoyo: alternate direction on repeat. Default false */
  yoyo?: boolean;
  /** ID for cancellation */
  id?: string;
}

export interface SpringOptions {
  /** Stiffness. Default 170 */
  stiffness?: number;
  /** Damping ratio. Default 26 */
  damping?: number;
  /** Mass. Default 1 */
  mass?: number;
  /** Initial velocity. Default 0 */
  velocity?: number;
  /** Precision threshold for settling. Default 0.01 */
  precision?: number;
  /** Called each frame with value and velocity */
  onUpdate?: (value: number, velocity: number) => void;
  /** Called when spring settles */
  onSettle?: (value: number) => void;
  /** Target value to animate toward */
  target?: number;
  /** Initial value. Default 0 */
  from?: number;
}

export interface AnimationFrame {
  /** Frame timestamp (high-res) */
  timestamp: number;
  /** Time since last frame in ms */
  deltaMs: number;
  /** Total elapsed time since loop start in ms */
  elapsedMs: number;
  /** Current frames per second */
  fps: number;
  /** Frame index (incrementing counter) */
  frameIndex: number;
}

export interface LoopCallbacks {
  /** Called every frame */
  onFrame?: (frame: AnimationFrame) => void;
  /** Called when the loop is started */
  onStart?: () => void;
  /** Called when the loop is stopped */
  onStop?: () => void;
  /** Called when visibility changes (tab hidden/shown) */
  onVisibilityChange?: (hidden: boolean) => void;
}

// --- Easing Functions ---

/** Linear: no acceleration */
export const linear: EasingFunction = (t) => t;

// Quadratic
export const easeInQuad: EasingFunction = (t) => t * t;
export const easeOutQuad: EasingFunction = (t) => t * (2 - t);
export const easeInOutQuad: EasingFunction = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

// Cubic
export const easeInCubic: EasingFunction = (t) => t * t * t;
export const easeOutCubic: EasingFunction = (t) => --t * t * t + 1;
export const easeInOutCubic: EasingFunction = (t) =>
  t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

// Quartic
export const easeInQuart: EasingFunction = (t) => t * t * t * t;
export const easeOutQuart: EasingFunction = (t) => 1 - --t * t * t * t;
export const easeInOutQuart: EasingFunction = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t;

// Quintic / Exponential
export const easeInExpo: EasingFunction = (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1)));
export const easeOutExpo: EasingFunction = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOutExpo: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2;
};

// Sine
export const easeInSine: EasingFunction = (t) => 1 - Math.cos((t * Math.PI) / 2);
export const easeOutSine: EasingFunction = (t) => Math.sin((t * Math.PI) / 2);
export const easeInOutSine: EasingFunction = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

// Circular
export const easeInCirc: EasingFunction = (t) => 1 - Math.sqrt(1 - t * t);
export const easeOutCirc: EasingFunction = (t) => Math.sqrt(1 - --t * t);
export const easeInOutCirc: EasingFunction = (t) =>
  t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;

// Elastic
export const easeInElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;
  return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.075) * (2 * Math.PI) / 3);
};
export const easeOutElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 3) + 1;
};
export const easeInOutElastic: EasingFunction = (t) => {
  if (t === 0 || t === 1) return t;
  return t < 0.5
    ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 12.5)) / 2
    : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 12.5)) / 2 + 1;
};

// Back
export const easeInBack: EasingFunction = (t) => {
  const s = 1.70158;
  return t * t * ((s + 1) * t - s);
};
export const easeOutBack: EasingFunction = (t) => {
  const s = 1.70158;
  return --t * t * ((s + 1) * t + s) + 1;
};
export const easeInOutBack: EasingFunction = (t) => {
  const s = 1.70158 * 1.525;
  return t < 0.5
    ? (t * t * ((s + 1) * 2 * t - s)) * 2
    : (--t * t * ((s + 1) * 2 * t + s) + 2) / 2;
};

// Bounce
export const easeOutBounce: EasingFunction = (t) => {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
};
export const easeInBounce: EasingFunction = (t) => 1 - easeOutBounce(1 - t);
export const easeInOutBounce: EasingFunction = (t) =>
  t < 0.5 ? (1 - easeOutBounce(1 - 2 * t)) / 2 : (1 + easeOutBounce(2 * t - 1)) / 2;

/** Lookup table of all easing functions by name */
export const EASING_FUNCTIONS: Record<string, EasingFunction> = {
  linear,
  easeInQuad, easeOutQuad, easeInOutQuad,
  easeInCubic, easeOutCubic, easeInOutCubic,
  easeInQuart, easeOutQuart, easeInOutQuart,
  easeInExpo, easeOutExpo, easeInOutExpo,
  easeInSine, easeOutSine, easeInOutSine,
  easeInCirc, easeOutCirc, easeInOutCirc,
  easeInElastic, easeOutElastic, easeInOutElastic,
  easeInBack, easeOutBack, easeInOutBack,
  easeInBounce, easeOutBounce, easeInOutBounce,
};

/** Get an easing function by name string */
export function getEasing(name: string): EasingFunction {
  return EASING_FUNCTIONS[name] ?? linear;
}

// --- Tween Engine ---

/**
 * TweenEngine - manages multiple concurrent tweens on requestAnimationFrame.
 */
export class TweenEngine {
  private tweens: Map<string, _TweenState> = new Map();
  private rafId: number | null = null;
  private running = false;
  private _frameCount = 0;

  /** Create and start a tween. Returns the tween ID for cancellation. */
  tween(options: TweenOptions): string {
    const id = options.id ?? `tween_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const state: _TweenState = {
      id,
      from: options.from,
      to: options.to,
      duration: options.duration ?? 300,
      easing: options.easing ?? easeOutCubic,
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      delay: options.delay ?? 0,
      repeat: options.repeat ?? 1,
      yoyo: options.yoyo ?? false,
      startTime: 0,
      started: false,
      completed: false,
      iteration: 0,
      direction: 1,
    };

    this.tweens.set(id, state);
    this._ensureRunning();
    return id;
  }

  /** Cancel a tween by ID */
  cancel(id: string): boolean {
    return this.tweens.delete(id);
  }

  /** Cancel all active tweens */
  cancelAll(): void {
    this.tweens.clear();
  }

  /** Pause all tweens (keeps state, stops rAF) */
  pause(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.running = false;
  }

  /** Resume paused tweens */
  resume(): void {
    this._ensureRunning();
  }

  /** Check if any tweens are active */
  isActive(): boolean {
    return this.tweens.size > 0 && this.running;
  }

  /** Get count of active tweens */
  getActiveCount(): number {
    return this.tweens.size;
  }

  // --- Internal ---

  private _ensureRunning(): void {
    if (!this.running && this.tweens.size > 0) {
      this.running = true;
      this.rafId = requestAnimationFrame(this._tick.bind(this));
    }
  }

  private _tick(timestamp: number): void {
    let hasActive = false;

    for (const [id, state] of this.tweens) {
      if (state.completed) continue;

      // Initialize start time (accounts for delay)
      if (!state.started) {
        state.startTime = timestamp + state.delay;
        state.started = true;
        hasActive = true;
        continue; // Skip this frame, waiting for delay
      }

      if (timestamp < state.startTime) {
        hasActive = true;
        continue;
      }

      const elapsed = timestamp - state.startTime;
      const iterDuration = state.duration;
      let rawProgress = Math.min(elapsed / iterDuration, 1);

      // Apply yoyo direction
      let progress = state.direction > 0 ? rawProgress : 1 - rawProgress;

      const eased = state.easing(progress);
      const value = state.from + (state.to - state.from) * eased;

      state.onUpdate?.(value, rawProgress);

      if (rawProgress >= 1) {
        state.iteration++;

        const totalIterations = state.repeat < 0 ? Infinity : state.repeat;
        if (state.iteration >= totalIterations) {
          state.completed = true;
          state.onComplete?.(state.direction > 0 ? state.to : state.from);
          this.tweens.delete(id);
        } else {
          // Prepare next iteration
          state.startTime = timestamp;
          if (state.yoyo) state.direction *= -1;
          hasActive = true;
        }
      } else {
        hasActive = true;
      }
    }

    this._frameCount++;

    if (hasActive) {
      this.rafId = requestAnimationFrame(this._tick.bind(this));
    } else {
      this.running = false;
      this.rafId = null;
    }
  }
}

interface _TweenState {
  id: string;
  from: number;
  to: number;
  duration: number;
  easing: EasingFunction;
  onUpdate?: (value: number, progress: number) => void;
  onComplete?: (value: number) => void;
  delay: number;
  repeat: number;
  yoyo: boolean;
  startTime: number;
  started: boolean;
  completed: boolean;
  iteration: number;
  direction: number;
}

// --- Spring Physics ---

/**
 * Animate a value using spring physics (damped harmonic oscillator).
 * Uses implicit Euler integration for stability.
 *
 * @returns A cancel function.
 */
export function animateSpring(options: SpringOptions): () => void {
  const {
    stiffness = 170,
    damping = 26,
    mass = 1,
    velocity: initialVelocity = 0,
    precision = 0.01,
    onUpdate,
    onSettle,
    target = 1,
    from = 0,
  } = options;

  let position = from;
  let vel = initialVelocity;
  let cancelled = false;
  let rafId: number | null = null;

  const step = () => {
    if (cancelled) return;

    // Spring force: F = -k * (x - target)
    const force = -stiffness * (position - target);
    // Damping force: F = -c * v
    const dampingForce = -damping * vel;
    // Acceleration: a = F / m
    const acc = (force + dampingForce) / mass;

    // Semi-implicit Euler integration
    vel += acc * (1 / 60); // Assume ~60fps timestep
    position += vel * (1 / 60);

    onUpdate?.(position, vel);

    // Check for settling
    const displacement = Math.abs(position - target);
    if (displacement < precision && Math.abs(vel) < precision) {
      position = target;
      vel = 0;
      onUpdate?.(position, 0);
      onSettle?.(position);
      return; // Settled — don't schedule another frame
    }

    rafId = requestAnimationFrame(step);
  };

  rafId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}

// --- Animation Loop ---

/**
 * AnimationLoop - high-performance animation loop with FPS tracking,
 * visibility awareness, and frame budget management.
 */
export class AnimationLoop {
  private callbacks: LoopCallbacks;
  private rafId: number | null = null;
  private running = false;
  private startTime = 0;
  private lastTimestamp = 0;
  private frameIndex = 0;
  private fpsSamples: number[] = [];
  private maxFpsSamples = 60;
  private paused = false;
  private pauseTime = 0;
  private cleanupVisibility: (() => void) | null = null;

  constructor(callbacks: LoopCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /** Start the animation loop */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.startTime = performance.now();
    this.lastTimestamp = this.startTime;
    this.frameIndex = 0;
    this.callbacks.onStart?.();
    this._bindVisibility();
    this.rafId = requestAnimationFrame(this._tick.bind(this));
  }

  /** Stop the loop completely */
  stop(): void {
    this._cancelRaf();
    this.running = false;
    this.callbacks.onStop?.();
    this._unbindVisibility();
  }

  /** Pause (preserves state, can resume) */
  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    this.pauseTime = performance.now();
    this._cancelRaf();
  }

  /** Resume from pause */
  resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    // Adjust timing to account for pause duration
    const pauseDuration = performance.now() - this.pauseTime;
    this.startTime += pauseDuration;
    this.lastTimestamp += pauseDuration;
    this.rafId = requestAnimationFrame(this._tick.bind(this));
  }

  /** Check if running */
  isRunning(): boolean { return this.running && !this.paused; }

  /** Get current estimated FPS */
  getFPS(): number {
    if (this.fpsSamples.length === 0) return 0;
    return (
      this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length
    );
  }

  /** Get smoothed FPS (exponential moving average) */
  getSmoothedFPS(alpha = 0.1): number {
    if (this.fpsSamples.length === 0) return 0;
    let smoothed = this.fpsSamples[0]!;
    for (let i = 1; i < this.fpsSamples.length; i++) {
      smoothed = alpha * this.fpsSamples[i]! + (1 - alpha) * smoothed;
    }
    return smoothed;
  }

  /** Get frame statistics */
  getStats(): { avgFps: number; minFps: number; maxFps: number; totalFrames: number } {
    if (this.fpsSamples.length === 0) {
      return { avgFps: 0, minFps: 0, maxFps: 0, totalFrames: this.frameIndex };
    }
    return {
      avgFps: this.getFPS(),
      minFps: Math.min(...this.fpsSamples),
      maxFps: Math.max(...this.fpsSamples),
      totalFrames: this.frameIndex,
    };
  }

  // --- Private ---

  private _tick(timestamp: number): void {
    if (!this.running || this.paused) return;

    const deltaMs = timestamp - this.lastTimestamp;
    const elapsedMs = timestamp - this.startTime;
    const instantFps = deltaMs > 0 ? 1000 / deltaMs : 0;

    // Track FPS samples
    this.fpsSamples.push(instantFps);
    if (this.fpsSamples.length > this.maxFpsSamples) {
      this.fpsSamples.shift();
    }

    const frame: AnimationFrame = {
      timestamp,
      deltaMs,
      elapsedMs,
      fps: instantFps,
      frameIndex: this.frameIndex++,
    };

    this.lastTimestamp = timestamp;
    this.callbacks.onFrame?.(frame);

    this.rafId = requestAnimationFrame(this._tick.bind(this));
  }

  private _cancelRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private _bindVisibility(): void {
    const handler = () => {
      this.callbacks.onVisibilityChange?.(document.hidden);
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    };
    document.addEventListener("visibilitychange", handler);
    this.cleanupVisibility = () =>
      document.removeEventListener("visibilitychange", handler);
  }

  private _unbindVisibility(): void {
    if (this.cleanupVisibility) {
      this.cleanupVisibility();
      this.cleanupVisibility = null;
    }
  }
}

// --- Value Interpolation ---

/** Interpolate between two numbers by factor t (0-1) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate between two colors (hex) by factor t */
export function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = hexToRgbComponents(colorA);
  const b = hexToRgbComponents(colorB);
  if (!a || !b) return colorB;

  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));

  return rgbToHexStr(r, g, bl);
}

/** Interpolate between two coordinate points */
export function lerpPoint(
  x1: number, y1: number,
  x2: number, y2: number,
  t: number,
): { x: number; y: number } {
  return { x: lerp(x1, x2, t), y: lerp(y1, y2, t) };
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Map a value from one range to another */
export function mapRange(
  value: number,
  inMin: number, inMax: number,
  outMin: number, outMax: number,
  clampResult = true,
): number {
  const result = ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  return clampResult ? clamp(result, Math.min(outMin, outMax), Math.max(outMin, outMax)) : result;
}

// --- Color Helpers (internal) ---

function hexToRgbComponents(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1]!, 16), g: parseInt(result[2]!, 16), b: parseInt(result[3]!, 16) }
    : null;
}

function rgbToHexStr(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

// --- Utility: Simple one-shot tween ---

/** Animate a single value from→to over duration with easing. Returns promise. */
export function tweenValue(
  from: number,
  to: number,
  duration = 300,
  easing: EasingFunction = easeOutCubic,
  onUpdate?: (value: number) => void,
): Promise<number> {
  return new Promise<number>((resolve) => {
    const engine = new TweenEngine();
    engine.tween({
      from,
      to,
      duration,
      easing,
      onUpdate,
      onComplete: (v) => {
        resolve(v);
        engine.cancelAll(); // Clean up
      },
    });
  });
}
