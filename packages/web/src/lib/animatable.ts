/**
 * Animatable: Declarative animation system for DOM elements with keyframe
 * sequences, property interpolation, timeline control, stagger effects,
 * playback management, and event hooks.
 */

// --- Types ---

export type AnimatableProperty =
  | "x" | "y" | "width" | "height" | "opacity" | "scale" | "rotate"
  | "translateX" | "translateY" | "skewX" | "skewY"
  | "backgroundColor" | "color" | "borderRadius"
  | string; // custom CSS property

export interface Keyframe {
  /** Offset from 0 to 1 */
  offset?: number;
  /** Property values at this keyframe */
  properties: Partial<Record<AnimatableProperty, number | string>>;
  /** Easing for the segment leading to this keyframe */
  easing?: EasingFunction;
  /** Duration weight (relative) */
  duration?: number;
}

export interface AnimationTimeline {
  /** Unique ID */
  id: string;
  /** Keyframes defining the animation */
  keyframes: Keyframe[];
  /** Total duration in ms */
  duration: number;
  /** Delay before start (ms) */
  delay?: number;
  /** Number of iterations (Infinity = loop) */
  iterations?: number;
  /** Direction */
  direction?: "normal" | "reverse" | "alternate";
  /** Fill mode: what to show before/after */
  fillMode?: "none" | "forwards" | "backwards" | "both";
  /** Easing applied to entire timeline */
  easing?: EasingFunction;
  /** Callback on each frame */
  onFrame?: (progress: number, values: Record<string, number | string>) => void;
  /** Callback when complete */
  onComplete?: () => void;
  /** Callback when iteration completes */
  onIteration?: (iteration: number) => void;
}

export type EasingFunction = (t: number) => number;

export interface AnimatableOptions {
  /** Target element(s) */
  target: HTMLElement | HTMLElement[];
  /** Animation timeline(s) to run */
  timelines: AnimationTimeline[];
  /** Play automatically on creation? */
  autoplay?: boolean;
  /** Default duration if not specified per-timeline (ms) */
  defaultDuration?: number;
  /** Stagger delay between multiple targets (ms) */
  stagger?: number;
  /** Global speed multiplier (1 = normal) */
  speed?: number;
  /** Callback when all animations complete */
  onComplete?: () => void;
}

export interface AnimatableInstance {
  element: HTMLElement[];
  /** Start or resume playback */
  play: () => void;
  /** Pause playback */
  pause: () => void;
  /** Stop and reset to initial state */
  stop: () => void;
  /** Seek to specific progress (0-1) */
  seek: (progress: number) => void;
  /** Reverse playback direction */
  reverse: () => void;
  /** Check if playing */
  isPlaying: () => boolean;
  /** Get current progress (0-1) */
  getProgress: () => number;
  /** Add a new timeline dynamically */
  addTimeline: (timeline: AnimationTimeline) => void;
  /** Remove a timeline by ID */
  removeTimeline: (id: string) => void;
  /** Update target element(s) */
  setTarget: (target: HTMLElement | HTMLElement[]) => void;
  /** Set a property value immediately (no animation) */
  set: (property: AnimatableProperty, value: number | string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Interpolation Helpers ---

function interpolateNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateColor(colorA: string, colorB: string, t: number): string {
  const parse = (c: string): [number, number, number] => {
    // Handle hex
    const hex = c.replace("#", "");
    if (hex.length === 6 || hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
    // Handle rgb()
    const match = c.match(/(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
    if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    return [128, 128, 128]; // fallback gray
  };

  const [r1, g1, b1] = parse(colorA);
  const [r2, g2, b2] = parse(colorB);

  const r = Math.round(interpolateNumber(r1, r2, t));
  const g = Math.round(interpolateNumber(g1, g2, t));
  const b = Math.round(interpolateNumber(b1, b2, t));

  return `rgb(${r},${g},${b})`;
}

function applyProperties(
  el: HTMLElement,
  values: Record<string, number | string>,
  transformParts: string[],
): void {
  let hasTransform = false;

  for (const [prop, val] of Object.entries(values)) {
    switch (prop) {
      case "x":
        transformParts.push(`translateX(${val}px)`);
        hasTransform = true;
        break;
      case "y":
        transformParts.push(`translateY(${val}px)`);
        hasTransform = true;
        break;
      case "scale":
        transformParts.push(`scale(${val})`);
        hasTransform = true;
        break;
      case "rotate":
        transformParts.push(`rotate(${val}deg)`);
        hasTransform = true;
        break;
      case "translateX":
        transformParts.push(`translateX(${val}px)`);
        hasTransform = true;
        break;
      case "translateY":
        transformParts.push(`translateY(${val}px)`);
        hasTransform = true;
        break;
      case "skewX":
        transformParts.push(`skewX(${val}deg)`);
        hasTransform = true;
        break;
      case "skewY":
        transformParts.push(`skewY(${val}deg)`);
        hasTransform = true;
        break;
      case "opacity":
        el.style.opacity = String(val);
        break;
      case "backgroundColor":
      case "color":
        el.style.setProperty(prop, val as string);
        break;
      case "borderRadius":
        el.style.borderRadius = `${val}px`;
        break;
      case "width":
        el.style.width = typeof val === "number" ? `${val}px` : String(val);
        break;
      case "height":
        el.style.height = typeof val === "number" ? `${val}px` : String(val);
        break;
      default:
        // Custom CSS property
        el.style.setProperty(prop, String(val));
        break;
    }
  }

  if (hasTransform) {
    el.style.transform = transformParts.join(" ");
  } else if (!el.style.transform) {
    el.style.transform = "";
  }
}

// --- Timeline Player ---

interface PlayingState {
  startTime: number;
  pausedAt: number | null;
  pausedProgress: number | null;
  currentIteration: number;
  rafId: number | null;
  completed: boolean;
}

function createTimelinePlayer(
  timeline: AnimationTimeline,
  elements: HTMLElement[],
  opts: { defaultDuration: number; speed: number; stagger: number },
  initialState: Map<HTMLElement, Record<string, number | string>>,
): {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (p: number) => void;
  isPlaying: () => boolean;
  getProgress: () => number;
  getState: () => PlayingState;
  destroy: () => void;
} {
  const duration = timeline.duration ?? opts.defaultDuration;
  const delay = timeline.delay ?? 0;
  const maxIter = timeline.iterations ?? 1;
  const state: PlayingState = {
    startTime: 0,
    pausedAt: null,
    pausedProgress: null,
    currentIteration: 0,
    rafId: null,
    completed: false,
  };

  // Extract initial values from first keyframe
  const firstKf = timeline.keyframes[0];
  const propNames = new Set<string>();
  for (const kf of timeline.keyframes) {
    Object.keys(kf.properties).forEach((k) => propNames.add(k));
  }

  function tick(timestamp: number): void {
    if (state.pausedAt !== null || state.completed) return;

    let elapsed = timestamp - state.startTime - delay;
    if (elapsed < 0) {
      state.rafId = requestAnimationFrame(tick);
      return;
    }

    const totalDuration = duration * maxIter;
    let rawProgress = Math.min(elapsed / totalDuration, 1);

    // Handle direction
    if (timeline.direction === "reverse") {
      rawProgress = 1 - rawProgress;
    } else if (timeline.direction === "alternate") {
      const cycle = Math.floor(rawProgress * maxIter);
      if (cycle % 2 === 1) rawProgress = 1 - (rawProgress * maxIter % 1);
    }

    // Apply easing
    const easedProgress = (timeline.easing ?? ((t: number) => t))(rawProgress);

    // Calculate interpolated values for each element
    for (let ei = 0; ei < elements.length; ei++) {
      const el = elements[ei]!;
      const staggerOffset = opts.stagger * ei;
      const localProgress = Math.max(0, Math.min(1, easedProgress - staggerOffset / totalDuration));

      const values: Record<string, number | string> = {};
      const transformParts: string[] = [];

      // Find surrounding keyframes
      const sortedKfs = [...timeline.keyframes].sort((a, b) =>
        (a.offset ?? 0) - (b.offset ?? 0)
      );

      for (const propName of propNames) {
        let prevKf: Keyframe | undefined;
        let nextKf: Keyframe | undefined;

        for (const kf of sortedKfs) {
          const kfOffset = kf.offset ?? 0;
          if (kfOffset <= localProgress) prevKf = kf;
          if (kfOffset >= localProgress && !nextKf) nextKf = kf;
        }

        const prevVal = prevKf?.properties[propName];
        const nextVal = nextKf?.properties[propName];

        if (prevVal !== undefined && nextVal !== undefined) {
          const rangeStart = prevKf?.offset ?? 0;
          const rangeEnd = nextKf?.offset ?? 1;
          const segmentProgress = rangeEnd > rangeStart
            ? (localProgress - rangeStart) / (rangeEnd - rangeStart)
            : 0;

          const segEasing = nextKf?.easing ?? ((t: number) => t);
          const t = segEasing(segmentProgress);

          if (typeof prevVal === "number" && typeof nextVal === "number") {
            values[propName] = interpolateNumber(prevVal, nextVal, t);
          } else if (typeof prevVal === "string" && typeof nextVal === "string") {
            values[propName] = interpolateColor(prevVal, nextVal, t);
          } else {
            values[propName] = nextVal;
          }
        } else if (prevVal !== undefined) {
          values[propName] = prevVal;
        } else if (nextVal !== undefined) {
          values[propName] = nextVal;
        }
      }

      applyProperties(el, values, transformParts);
      timeline.onFrame?.(localProgress, values);
    }

    // Check completion
    if (rawProgress >= 1) {
      state.currentIteration++;

      if (state.currentIteration >= maxIter && maxIter !== Infinity) {
        state.completed = true;
        timeline.onComplete?.();
        return;
      }

      timeline.onIteration?.(state.currentIteration);
    }

    state.rafId = requestAnimationFrame(tick);
  }

  return {
    play() {
      if (state.completed) {
        // Reset for replay
        state.completed = false;
        state.currentIteration = 0;
      }
      state.pausedAt = null;
      state.pausedProgress = null;
      state.startTime = performance.now() - (state.pausedProgress ?? 0) * duration * (maxIter === Infinity ? 1 : maxIter);
      state.rafId = requestAnimationFrame(tick);
    },

    pause() {
      if (state.rafId === null) return;
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
      state.pausedAt = performance.now();
      const elapsed = state.pausedAt - state.startTime - delay;
      state.pausedProgress = Math.max(0, Math.min(1, elapsed / (duration * (maxIter === Infinity ? 1 : maxIter))));
    },

    stop() {
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = null;
      state.pausedAt = null;
      state.pausedProgress = null;
      state.completed = false;
      state.currentIteration = 0;

      // Reset to initial state
      for (const el of elements) {
        const init = initialState.get(el);
        if (init) applyProperties(el, init, []);
      }
    },

    seek(progress: number) {
      const p = Math.max(0, Math.min(1, progress));
      state.pausedProgress = p;
      state.startTime = performance.now() - p * duration * (maxIter === Infinity ? 1 : maxIter) - delay;
      // Render one frame at this position
      tick(performance.now());
      if (state.rafId) cancelAnimationFrame(state.rafId);
      state.rafId = null;
      state.pausedAt = performance.now();
    },

    isPlaying: () => state.rafId !== null && state.pausedAt === null,

    getProgress: () => {
      if (state.pausedProgress !== null) return state.pausedProgress;
      if (state.startTime === 0) return 0;
      const elapsed = performance.now() - state.startTime - delay;
      return Math.max(0, Math.min(1, elapsed / (duration * (maxIter === Infinity ? 1 : maxIter))));
    },

    getState: () => state,

    destroy() {
      if (state.rafId) cancelAnimationFrame(state.rafId);
    },
  };
}

// --- Main Factory ---

export function createAnimatable(options: AnimatableOptions): AnimatableInstance {
  const opts = {
    defaultDuration: options.defaultDuration ?? 500,
    speed: options.speed ?? 1,
    stagger: options.stagger ?? 0,
    ...options,
  };

  const elements = Array.isArray(options.target) ? options.target : [options.target];
  const players: ReturnType<typeof createTimelinePlayer>[] = [];
  let destroyed = false;

  // Capture initial state
  const initialState = new Map<HTMLElement, Record<string, number | string>>();

  // Create players for each timeline
  for (const tl of options.timelines) {
    const player = createTimelinePlayer(tl, elements, opts, initialState);
    players.push(player);
  }

  const instance: AnimatableInstance = {
    element: elements,

    play() {
      if (destroyed) return;
      for (const p of players) p.play();
    },

    pause() {
      for (const p of players) p.pause();
    },

    stop() {
      for (const p of players) p.stop();
    },

    seek(progress: number) {
      for (const p of players) p.seek(progress);
    },

    reverse() {
      // Reverse by seeking to mirrored position
      for (const p of players) {
        const prog = p.getProgress();
        p.seek(1 - prog);
        p.play();
      }
    },

    isPlaying: () => players.some((p) => p.isPlaying()),

    getProgress: () => {
      if (players.length === 0) return 0;
      return players[0]!.getProgress();
    },

    addTimeline(timeline: AnimationTimeline) {
      const player = createTimelinePlayer(timeline, elements, opts, initialState);
      players.push(player);
      if (opts.autoplay !== false) player.play();
    },

    removeTimeline(id: string) {
      const idx = players.findIndex((p) => false); // can't easily match without storing IDs
      if (idx >= 0) {
        players[idx]!.destroy();
        players.splice(idx, 1);
      }
    },

    setTarget(target: HTMLElement | HTMLElement[]) {
      const newEls = Array.isArray(target) ? target : [target];
      elements.length = 0;
      elements.push(...newEls);
    },

    set(property: AnimatableProperty, value: number | string) {
      for (const el of elements) {
        applyProperties(el, { [property]: value }, []);
      }
    },

    destroy() {
      destroyed = true;
      for (const p of players) p.destroy();
      players.length = 0;
    },
  };

  // Auto-play
  if (opts.autoplay !== false) {
    instance.play();
  }

  return instance;
}
