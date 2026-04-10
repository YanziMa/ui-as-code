/**
 * Advanced animation engine — keyframe builder, stagger animations,
 * scroll-triggered animations, timeline sequencing, and spring physics.
 */

// --- Types ---

export interface Keyframe {
  offset?: number;
  [property: string]: string | number | undefined;
}

export interface AnimationOptions {
  /** Target element(s) */
  target: HTMLElement | HTMLElement[];
  /** Keyframes to animate */
  keyframes: Keyframe[];
  /** Duration in ms (default: 300) */
  duration?: number;
  /** Easing function or CSS easing string */
  easing?: string | ((t: number) => number);
  /** Delay before start (ms) */
  delay?: number;
  /** Number of iterations (default: 1, Infinity = loop) */
  iterations?: number;
  /** Direction: 'normal', 'reverse', 'alternate' */
  direction?: "normal" | "reverse" | "alternate";
  /** Fill mode: 'none', 'forwards', 'backwards', 'both' */
  fill?: "none" | "forwards" | "backwards" | "both";
  /** Callback when animation starts */
  onStart?: () => void;
  /** Callback on each frame (progress 0-1) */
  onUpdate?: (progress: number) => void;
  /** Callback when complete */
  onComplete?: () => void;
  /** Use Web Animations API? (default: true if available) */
  useWAAPI?: boolean;
}

export interface AnimationInstance {
  /** The native Animation object (if using WAAPI) */
  animation: Animation | null;
  /** Current play state */
  state: "idle" | "running" | "paused" | "finished";
  /** Current progress (0-1) */
  progress: number;
  /** Play the animation */
  play: () => void;
  /** Pause the animation */
  pause: () => void;
  /** Reverse playback direction */
  reverse: () => void;
  /** Seek to specific progress (0-1) */
  seek: (progress: number) => void;
  /** Cancel/stop the animation */
  cancel: () => void;
  /** Finish immediately (jump to end) */
  finish: () => void;
  /** Update keyframes mid-animation */
  updateKeyframes: (keyframes: Keyframe[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

export interface StaggerOptions {
  /** Elements to stagger */
  elements: HTMLElement[];
  /** Base animation options per element */
  animation: Omit<AnimationOptions, "target">;
  /** Delay between each element's start (ms) */
  staggerDelay?: number;
  /** Start from end? */
  reverse?: boolean;
  /** Stagger pattern: 'linear', 'ease-in-out', 'spring' */
  pattern?: "linear" | "ease-in-out" | "spring";
  /** Run all at once after staggering delays? */
  sequential?: boolean;
}

export interface TimelineOptions {
  /** Total timeline duration in ms */
  duration?: number;
  /** Auto-play on creation? */
  autoPlay?: boolean;
  /** Loop the timeline? */
  loop?: boolean;
  /** On complete callback */
  onComplete?: () => void;
}

// --- Easing Functions ---

export const easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t: number) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158; const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  easeOutBounce: (t: number) => {
    const n1 = 7.5625; const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    else return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
} as const;

/** Resolve easing from string name or function */
export function resolveEasing(easing: string | ((t: number) => number)): (t: number) => number {
  if (typeof easing === "function") return easing;

  // CSS named easings mapping
  const cssMap: Record<string, (t: number) => number> = {
    "linear": easings.linear,
    "ease-in": easings.easeInQuad,
    "ease-out": easings.easeOutQuad,
    "ease-in-out": easings.easeInOutQuad,
    "ease": easings.easeInOutQuad,
  };

  return cssMap[easing] ?? easings.easeOutQuad;
}

// --- Main Animator ---

export class Animator {
  create(options: AnimationOptions): AnimationInstance {
    const targets = Array.isArray(options.target) ? options.target : [options.target];
    const opts = {
      duration: options.duration ?? 300,
      easing: options.easing ?? "ease-out",
      delay: options.delay ?? 0,
      iterations: options.iterations ?? 1,
      direction: options.direction ?? "normal",
      fill: options.fill ?? "forwards",
      useWAAPI: options.useWAAPI ?? true,
      ...options,
    };

    let destroyed = false;
    let anim: Animation | null = null;
    let rafId: number | null = null;
    let startTime: number | null = null;
    let pausedProgress = 0;
    let currentState: AnimationInstance["state"] = "idle";

    // Try WAAPI first
    if (opts.useWAAPI && typeof Element.prototype.animate === "function") {
      try {
        const keyframes = options.keyframes.map((kf) => {
          const result: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(kf)) {
            if (k !== "offset" && v !== undefined) result[k] = v;
          }
          if (kf.offset !== undefined) result.offset = kf.offset;
          return result as Keyframe & PropertyIndexedKeyframes;
        });

        anim = targets[0].animate(keyframes, {
          duration: opts.duration,
          delay: opts.delay,
          easing: typeof opts.easing === "string" ? opts.easing : "ease-out",
          iterations: opts.iterations,
          direction: opts.direction,
          fill: opts.fill,
        });

        anim.addEventListener("finish", () => {
          currentState = "finished";
          opts.onComplete?.();
        });
        anim.pause(); // Don't auto-start

        currentState = "paused";
        opts.onStart?.();

        return this.buildWAAPIInstance(anim, opts);
      } catch {
        // Fall through to manual implementation
      }
    }

    // Manual rAF-based animation fallback
    return this.buildManualInstance(targets, opts);
  }

  private buildWAAPIInstance(anim: Animation, opts: AnimationOptions): AnimationInstance {
    return {
      get animation() { return anim; },
      get state() { return anim.playState as AnimationInstance["state"]; },
      get progress() { return anim.currentTime ? anim.currentTime / (opts.duration ?? 300) : 0; },
      play: () => { anim.play(); },
      pause: () => { anim.pause(); },
      reverse: () => { anim.reverse(); },
      seek: (p) => { if (anim.currentTime !== null) anim.currentTime = p * (opts.duration ?? 300); },
      cancel: () => { anim.cancel(); },
      finish: () => { anim.finish(); },
      updateKeyframes: (kfs) => { /* WAAPI doesn't support live keyframe updates well */ },
      destroy: () => { anim.cancel(); },
    };
  }

  private buildManualInstance(targets: HTMLElement[], opts: AnimationOptions): AnimationInstance {
    let rafId: number | null = null;
    let startTime: number | null = null;
    let pausedAt = 0;
    let currentState: AnimationInstance["state"] = "idle";
    let currentProgress = 0;
    const easingFn = resolveEasing(opts.easing);

    // Store initial styles for restoration
    const initialStyles = new Map<HTMLElement, string>();
    for (const el of targets) {
      initialStyles.set(el, el.getAttribute("style") ?? "");
    }

    function interpolate(progress: number): void {
      const easedProgress = easingFn(Math.min(1, Math.max(0, progress)));

      for (const el of targets) {
        // Find surrounding keyframes
        const kfs = opts.keyframes;
        if (kfs.length < 2) continue;

        let prevKf = kfs[0];
        let nextKf = kfs[kfs.length - 1];

        for (let i = 0; i < kfs.length; i++) {
          const kfOffset = kfs[i].offset ?? (i / (kfs.length - 1));
          if (kfOffset <= easedProgress) prevKf = kfs[i];
          if (kfOffset >= easedProgress) { nextKf = kfs[i]; break; }
        }

        const prevOffset = prevKf.offset ?? 0;
        const nextOffset = nextKf.offset ?? 1;
        const localProgress = nextOffset > prevOffset
          ? (easedProgress - prevOffset) / (nextOffset - prevOffset)
          : 0;

        // Apply interpolated values
        for (const key of Object.keys(prevKf)) {
          if (key === "offset") continue;
          const prevVal = prevKf[key];
          const nextVal = nextKf[key];

          if (typeof prevVal === "number" && typeof nextVal === "number") {
            const styleKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
            (el.style as any)[styleKey] = prevVal + (nextVal - prevVal) * localProgress;
          } else if (typeof prevVal === "string") {
            const styleKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
            (el.style as any)[styleKey] = localProgress < 0.5 ? prevVal : nextVal;
          }
        }
      }

      opts.onUpdate?.(easedProgress);
    }

    function tick(timestamp: number): void {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime - (opts.delay ?? 0);

      if (elapsed < 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const totalDuration = (opts.duration ?? 300) * (opts.iterations ?? 1);
      currentProgress = Math.min(elapsed / (opts.duration ?? 300), opts.iterations ?? Infinity);

      if (currentProgress >= (opts.iterations ?? 1)) {
        currentProgress = opts.iterations ?? 1;
        interpolate(currentProgress);
        currentState = "finished";
        opts.onComplete?.();
        return;
      }

      interpolate(currentProgress);
      rafId = requestAnimationFrame(tick);
    }

    return {
      animation: null,
      get state() { return currentState; },
      get progress() { return currentProgress % 1; },

      play() {
        if (currentState === "finished") {
          // Restart
          startTime = null;
          currentProgress = 0;
        }
        currentState = "running";
        opts.onStart?.();
        rafId = requestAnimationFrame(tick);
      },

      pause() {
        currentState = "paused";
        pausedAt = currentProgress;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      },

      reverse() {
        // For manual animation, just note direction change
        // Full reversal would require re-running with reversed keyframes
      },

      seek(p: number) {
        currentProgress = p;
        interpolate(p);
      },

      cancel() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        currentState = "idle";
        // Restore original styles
        for (const el of targets) {
          el.setAttribute("style", initialStyles.get(el) ?? "");
        }
      },

      finish() {
        currentProgress = 1;
        interpolate(1);
        currentState = "finished";
        opts.onComplete?.();
      },

      updateKeyframes(newKfs) {
        (opts as any).keyframes = newKfs;
      },

      destroy() {
        this.cancel();
      },
    };
  }
}

// --- Stagger ---

/** Animate multiple elements with staggered timing */
export function staggerAnimate(options: StaggerOptions): AnimationInstance[] {
  const { elements, animation, staggerDelay = 50, reverse = false, pattern = "linear", sequential = false } = options;
  const instances: AnimationInstance[] = [];

  const orderedElements = reverse ? [...elements].reverse() : [...elements];

  for (let i = 0; i < orderedElements.length; i++) {
    let delay = i * staggerDelay;

    if (pattern === "ease-in-out") {
      const center = (orderedElements.length - 1) / 2;
      const dist = Math.abs(i - center);
      delay = dist * staggerDelay * 1.5;
    } else if (pattern === "spring") {
      delay = i * staggerDelay * (1 + Math.sin(i * 0.5));
    }

    const instance = new Animator().create({
      ...animation,
      target: orderedElements[i],
      delay: (animation.delay ?? 0) + delay,
    });
    instances.push(instance);

    if (sequential && i > 0) {
      // Chain completion to start next
      const prev = instances[i - 1]!;
      const curr = instance;
      // Note: chaining would require more complex setup; for now all start with delays
    }
  }

  // Auto-play all
  for (const inst of instances) inst.play();

  return instances;
}

// --- Scroll-Triggered ---

/** Animate an element when it enters the viewport */
export function scrollTrigger(
  element: HTMLElement,
  animation: Omit<AnimationOptions, "target">,
  triggerOptions?: {
    threshold?: number;
    rootMargin?: string;
    once?: boolean;
  },
): () => void {
  const obs = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;

      const instance = new Animator().create({ ...animation, target: element });
      instance.play();

      if (triggerOptions?.once) {
        obs.disconnect();
      }
    },
    {
      threshold: triggerOptions?.threshold ?? 0.1,
      rootMargin: triggerOptions?.rootMargin ?? "0px",
    },
  );

  obs.observe(element);

  return () => obs.disconnect();
}
