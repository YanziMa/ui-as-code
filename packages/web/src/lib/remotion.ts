/**
 * Remotion-style Animation Utilities: Frame-based animation timeline,
 * keyframe interpolation, spring physics, sequencing, composition,
 * and video-like rendering concepts for web animations.
 */

// --- Types ---

export type EasingFn = (t: number) => number;

export interface Keyframe<T = number> {
  /** Time in frames (0-based) */
  frame: number;
  /** Value at this keyframe */
  value: T;
  /** Optional easing to next keyframe */
  easing?: EasingFn;
}

export interface TimelineOptions {
  /** Frames per second */
  fps?: number;
  /** Total duration in frames */
  durationInFrames?: number;
  /** Loop the timeline? */
  loop?: boolean;
  /** Direction ("normal" | "reverse" | "alternate") */
  direction?: "normal" | "reverse" | "alternate";
}

export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  overshootClamping?: boolean;
}

// --- Built-in Easings ---

export const easings: Record<string, EasingFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => (--t) * t * t + 1,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInBack: (t) => {
    const s = 1.70158; return t * t * ((s + 1) * t - s);
  },
  easeOutBack: (t) => {
    const s = 1.70158; return 1 + (--t) * t * ((s + 1) * t + s);
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  },
  steps: (n: number) => (t: number) => Math.ceil(t * n) / n,
};

// --- Interpolation ---

/** Interpolate between two values given progress 0-1 */
export function interpolate(
  from: number,
  to: number,
  progress: number,
  easing: EasingFn = easings.linear,
): number {
  const t = easing(Math.max(0, Math.min(1, progress)));
  return from + (to - from) * t;
}

/** Interpolate between multiple values using keyframes */
export function interpolateKeyframes(
  keyframes: Array<{ frame: number; value: number }>,
  currentFrame: number,
): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0]!.value;

  // Find surrounding keyframes
  let prev = keyframes[0]!;
  let next = keyframes[keyframes.length - 1]!;

  for (let i = 0; i < keyframes.length; i++) {
    if (keyframes[i]!.frame <= currentFrame) prev = keyframes[i]!;
    if (keyframes[i]!.frame >= currentFrame && keyframes[i]!.frame <= next.frame) next = keyframes[i]!;
  }

  if (prev.frame === next.frame) return prev.value;

  const range = next.frame - prev.frame;
  const progress = (currentFrame - prev.frame) / range;
  return interpolate(prev.value, next.value, progress);
}

// --- Timeline ---

/**
 * Create a frame-based animation timeline.
 *
 * @example
 * const tl = createTimeline({
 *   fps: 30,
 *   durationInFrames: 90,
 * });
 *
 * tl.addKeyframes("opacity", [
 *   { frame: 0, value: 0 },
 *   { frame: 15, value: 1 },
 *   { frame: 75, value: 1 },
 *   { frame: 90, value: 0 },
 * ]);
 *
 * // Get value at frame 45:
 * tl.getValue("opacity", 45); // → ~1
 */
export class Timeline {
  private tracks = new Map<string, Keyframe[]>();
  private _fps: number;
  private _durationInFrames: number;
  private _loop: boolean;
  private _direction: "normal" | "reverse" | "alternate";

  constructor(options: TimelineOptions = {}) {
    this._fps = options.fps ?? 30;
    this._durationInFrames = options.durationInFrames ?? 300;
    this._loop = options.loop ?? false;
    this._direction = options.direction ?? "normal";
  }

  get fps(): number { return this._fps; }
  get durationInFrames(): number { return this._durationInFrames; }
  get durationMs(): number { return (this._durationInFrames / this._fps) * 1000; }

  /** Add or replace a track's keyframes */
  addTrack(name: string, keyframes: Keyframe[]): this {
    const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
    this.tracks.set(name, sorted);
    return this;
  }

  /** Add keyframes to an existing track */
  addKeyframes(name: string, keyframes: Keyframe[]): this {
    const existing = this.tracks.get(name) ?? [];
    return this.addTrack(name, [...existing, ...keyframes]);
  }

  /** Get interpolated value for a track at a specific frame */
  getValue(name: string, frame: number): number {
    const kfs = this.tracks.get(name);
    if (!kfs || kfs.length === 0) return 0;
    return interpolateKeyframes(kfs.map((k) => ({ frame: k.frame, value: k.value as number })), frame);
  }

  /** Get all track values at a specific frame as a record */
  getFrameState(frame: number): Record<string, number> {
    const state: Record<string, number> = {};
    for (const [name] of this.tracks) {
      state[name] = this.getValue(name, frame);
    }
    return state;
  }

  /** Play the timeline with a callback per frame */
  play(onFrame: (frame: number, state: Record<string, number>) => void, onComplete?: () => void): { stop: () => void; pause: () => void; resume: () => void } {
    let currentFrame = this._direction === "reverse" ? this._durationInFrames : 0;
    let direction = this._direction === "reverse" ? -1 : 1;
    let playing = true;
    let paused = false;
    let rafId: number | null = null;
    let lastTime = performance.now();
    let alternateCount = 0;

    const frameInterval = 1000 / this._fps;

    function tick(now: number): void {
      if (!playing || paused) return;

      const delta = now - lastTime;
      if (delta < frameInterval) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastTime = now;

      const framesToAdvance = Math.floor(delta / frameInterval);
      currentFrame += direction * framesToAdvance;

      // Handle boundaries
      if (currentFrame >= this._durationInFrames || currentFrame < 0) {
        if (this._loop) {
          if (this._direction === "alternate") {
            alternateCount++;
            direction *= -1;
            currentFrame = direction > 0 ? 0 : this._durationInFrames;
          } else {
            currentFrame = currentFrame < 0 ? this._durationInFrames : 0;
          }
        } else {
          currentFrame = Math.max(0, Math.min(currentFrame, this._durationInFrames));
          onFrame(currentFrame, this.getFrameState(currentFrame));
          onComplete?.();
          rafId = null;
          return;
        }
      }

      onFrame(currentFrame, this.getFrameState(currentFrame));
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return {
      stop(): void { playing = false; if (rafId) cancelAnimationFrame(rafId); },
      pause(): void { paused = true; },
      resume(): void { paused = false; lastTime = performance.now(); if (!rafId) rafId = requestAnimationFrame(tick); },
    };
  }

  /** Clear all tracks */
  clear(): void { this.tracks.clear(); }

  /** Get all track names */
  getTracks(): string[] { return Array.from(this.tracks.keys()); }
}

/** Convenience factory */
export function createTimeline(options?: TimelineOptions): Timeline {
  return new Timeline(options);
}

// --- Spring Physics ---

/** Simulate spring physics and return value over time */
export function simulateSpring(
  from: number,
  to: number,
  config: SpringConfig = {},
  fps = 60,
): number[] {
  const { stiffness = 170, damping = 26, mass = 1 } = config;
  const values: number[] = [];
  let position = from;
  let velocity = 0;
  const dt = 1 / fps;
  const precision = 0.01;

  for (let i = 0; i < 10000; i++) {
    values.push(position);

    const displacement = position - to;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * dt;
    position += velocity * dt;

    if (Math.abs(position - to) < precision && Math.abs(velocity) < precision) {
      values.push(to);
      break;
    }
  }

  return values;
}

// --- Sequencing ---

/** Run animations in sequence (one after another) */
export function sequence(
  animations: Array<() => Promise<void>>,
  gapMs = 0,
): { start: () => Promise<void>; cancel: () => void } {
  let cancelled = false;

  async function run(): Promise<void> {
    for (const anim of animations) {
      if (cancelled) break;
      await anim();
      if (gapMs > 0 && !cancelled) await sleep(gapMs);
    }
  }

  return {
    start: run,
    cancel(): void { cancelled = true; },
  };
}

/** Run animations in parallel */
export function parallel(
  animations: Array<() => Promise<void>>,
): { start: () => Promise<void>; cancel: () => void } {
  let cancelled = false;

  async function run(): Promise<void> {
    await Promise.all(animations.map(async (anim) => {
      if (!cancelled) await anim();
    }));
  }

  return {
    start: run,
    cancel(): void { cancelled = true; },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
