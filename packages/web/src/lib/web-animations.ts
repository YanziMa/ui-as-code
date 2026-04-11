/**
 * Web Animations API (WAAPI) wrapper with timeline control, keyframe sequencing,
 * animation orchestration (parallel, sequential, stagger), playback state management,
 * and CSS transition/animation fallback.
 */

// --- Types ---

export interface KeyframeProps {
  [property: string]: string | number;
}

export interface AnimationKeyframe {
  offset?: number;
  easing?: string;
  composite?: CompositeOperation;
  props: KeyframeProps;
}

export interface AnimationOptions {
  /** Duration in ms */
  duration: number;
  /** Number of iterations (default: 1, Infinity = loop) */
  iterations?: number;
  /** Delay before start in ms (default: 0) */
  delay?: number;
  /** "normal" | "reverse" | "alternate" | "alternate-reverse" */
  direction?: PlaybackDirection;
  /** Easing function (default: "ease") */
  easing?: string;
  /** "none" | "forwards" | "backwards" | "both" */
  fill?: FillMode;
  /** End delay in ms */
  endDelay?: number;
  /** Called when animation finishes all iterations */
  onFinish?: () => void;
  /** Called on each iteration */
  onIteration?: (iteration: number) => void;
  /** Called when animation is cancelled */
  onCancel?: () => void;
}

export interface AnimationInstance {
  /** Current playback state: "idle" | "running" | "paused" | "finished" */
  readonly state: AnimationPlayState;
  /** Current progress 0-1 */
  readonly progress: number;
  /** Whether the animation has finished */
  readonly finished: boolean;
  /** Play from current position */
  play: () => void;
  /** Pause at current position */
  pause: () => void;
  /** Finish (jump to end, apply fill mode) */
  finish: () => void;
  /** Cancel (remove effects) */
  cancel: () => void;
  /** Reverse playback direction */
  reverse: () => void;
  /** Seek to specific progress (0-1) */
  seek: (progress: number) => void;
  /** Update keyframes mid-animation */
  updateKeyframes: (keyframes: AnimationKeyframe[]) => void;
  /** Update timing options */
  updateOptions: (options: Partial<AnimationOptions>) => void;
  /** Get promise that resolves when finished */
  getFinishedPromise: () => Promise<void>;
  /** Destroy and cleanup */
  destroy: () => void;
}

export interface OrchestratorInstance {
  /** Run multiple animations in parallel */
  parallel: (...animations: AnimationInstance[]) => AnimationInstance;
  /** Run animations sequentially */
  sequence: (...animations: AnimationInstance[]) => AnimationInstance;
  /** Run animations with staggered start times */
  stagger: (animations: AnimationInstance[], staggerMs: number) => AnimationInstance;
  /** Destroy all managed animations */
  destroyAll: () => void;
}

// --- Main ---

export function animate(
  element: HTMLElement,
  keyframes: AnimationKeyframe[] | KeyframeProps[],
  options: AnimationOptions,
): AnimationInstance {
  const {
    duration,
    iterations = 1,
    delay = 0,
    direction = "normal",
    easing = "ease",
    fill = "forwards",
    endDelay = 0,
    onFinish,
    onIteration,
    onCancel,
  } = options;

  // Convert simple format to WAAPI format
  const waapiKeyframes: Keyframe[] = keyframes.map((kf) => {
    if ("props" in kf) {
      const result: Keyframe = { ...kf.props };
      if (kf.offset !== undefined) result.offset = kf.offset;
      if (kf.easing) result.easing = kf.easing;
      if (kf.composite) result.composite = kf.composite;
      return result;
    }
    return kf as Keyframe;
  });

  const timing: KeyframeAnimationOptions = {
    duration,
    iterations,
    delay,
    direction,
    easing,
    fill,
    endDelay,
  };

  const anim = element.animate(waapiKeyframes, timing);

  // Event handlers
  if (onFinish) {
    anim.onfinish = () => { onFinish(); };
  }
  if (onCancel) {
    anim.oncancel = () => { onCancel(); };
  }

  let destroyed = false;

  const instance: AnimationInstance = {
    get state() { return destroyed ? "idle" : anim.playState; },
    get progress() {
      if (destroyed || !anim.effect) return 0;
      return anim.currentTime ? Number(anim.currentTime) / duration : 0;
    },
    get finished() { return anim.playState === "finished"; },

    play() { if (!destroyed) anim.play(); },
    pause() { if (!destroyed) anim.pause(); },
    finish() { if (!destroyed) anim.finish(); },
    cancel() { if (!destroyed) anim.cancel(); },
    reverse() { if (!destroyed) anim.reverse(); },

    seek(progress: number) {
      if (destroyed) return;
      const clamped = Math.max(0, Math.min(1, progress));
      anim.currentTime = clamped * duration;
    },

    updateKeyframes(newKeyframes: AnimationKeyframe[]) {
      if (destroyed) return;
      const converted = newKeyframes.map((kf) =>
        "props" in kf ? { ...kf.props, offset: kf.offset, easing: kf.easing } : kf
      );
      // Note: WAAPI doesn't support updating keyframes directly on existing animation
      // We need to recreate
      anim.cancel();
      element.animate(converted as Keyframe[], timing);
    },

    updateOptions(newOpts: Partial<AnimationOptions>) {
      if (destroyed) return;
      const updated = { ...timing };
      if (newOpts.duration !== undefined) updated.duration = newOpts.duration;
      if (newOpts.iterations !== undefined) updated.iterations = newOpts.iterations;
      if (newOpts.delay !== undefined) updated.delay = newOpts.delay;
      if (newOpts.direction !== undefined) updated.direction = newOpts.direction;
      if (newOpts.easing !== undefined) updated.easing = newOpts.easing;
      if (newOpts.fill !== undefined) updated.fill = newOpts.fill;
      // Apply via effect timing
      if (anim.effect) {
        (anim.effect as KeyframeEffect).updateTiming(updated);
      }
    },

    getFinishedPromise(): Promise<void> {
      if (destroyed) return Promise.resolve();
      return anim.finished.then(() => {}).catch(() => {});
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      try { anim.cancel(); } catch { /* ignore */ }
    },
  };

  return instance;
}

/** Create an orchestrator for managing multiple animations */
export function createOrchestrator(): OrchestratorInstance {
  const managed = new Set<AnimationInstance>();

  function track(anim: AnimationInstance): AnimationInstance {
    managed.add(anim);
    return anim;
  }

  function createComposite(): AnimationInstance {
    // A virtual animation instance that represents a group
    let state: AnimationPlayState = "idle";
    const listeners = new Set<(s: AnimationPlayState) => void>();

    const virtual: AnimationInstance = {
      get state() { return state; },
      get progress() { return state === "finished" ? 1 : 0; },
      get finished() { return state === "finished"; },
      play() { state = "running"; for (const l of listeners) l(state); },
      pause() { state = "paused"; for (const l of listeners) l(state); },
      finish() { state = "finished"; for (const l of listeners) l(state); },
      cancel() { state = "idle"; for (const l of listeners) l(state); },
      reverse() {},
      seek() {},
      updateKeyframes() {},
      updateOptions() {},
      getFinishedPromise() { return Promise.resolve(); },
      destroy() {},
    };

    return virtual;
  }

  return {
    parallel(...animations: AnimationInstance[]): AnimationInstance {
      animations.forEach((a) => { a.play(); track(a); });
      return createComposite();
    },

    sequence(...animations: AnimationInstance[]): AnimationInstance {
      animations.forEach((a) => track(a));
      // Chain with promises
      let chain = Promise.resolve();
      animations.forEach((a) => {
        chain = chain.then(() => {
          a.play();
          return a.getFinishedPromise();
        });
      });
      return createComposite();
    },

    stagger(animations: AnimationInstance[], staggerMs: number): AnimationInstance {
      animations.forEach((a, i) => {
        track(a);
        setTimeout(() => a.play(), i * staggerMs);
      });
      return createComposite();
    },

    destroyAll() {
      for (const anim of managed) {
        anim.destroy();
      }
      managed.clear();
    },
  };
}

// --- Standalone utilities ---

/** Check if Web Animations API is supported */
export function isWebAnimationsSupported(): boolean {
  return typeof Element !== "undefined" && typeof Element.prototype.animate === "function";
}

/** Animate with CSS transition fallback for older browsers */
export function animateOrTransition(
  element: HTMLElement,
  targetStyles: KeyframeProps,
  duration: number,
  easing = "ease",
): AnimationInstance | null {
  if (isWebAnimationsSupported()) {
    const keyframes: KeyframeProps[] = [
      {}, // Start from current styles
      targetStyles,
    ];
    return animate(element, keyframes, { duration, easing, fill: "forwards" });
  }

  // Fallback: CSS transitions
  const prevTransition = element.style.transition;
  element.style.transition = `all ${duration}ms ${easing}`;
  Object.assign(element.style, targetStyles);

  // Return a minimal mock instance
  let finished = false;
  setTimeout(() => { finished = true; element.style.transition = prevTransition; }, duration);

  return {
    get state() { return finished ? "finished" : "running"; },
    get progress() { return finished ? 1 : 0;5; },
    get finished() { return finished; },
    play() {},
    pause() {},
    finish() { Object.assign(element.style, targetStyles); finished = true; },
    cancel() { element.style.transition = prevTransition; },
    reverse() {},
    seek() {},
    updateKeyframes() {},
    updateOptions() {},
    getFinishedPromise() { return new Promise((r) => setTimeout(r, duration)); },
    destroy() { element.style.transition = prevTransition; },
  } as AnimationInstance;
}
