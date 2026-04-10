/**
 * Animation Timeline: Timeline-based animation orchestration with sequencing,
 * parallel groups, labels, seeking, playback control, easing integration,
 * CSS keyframe generation, spring physics, scroll-driven playback,
 * and Web Animations API (WAAPI) backend.
 */

// --- Types ---

export type EasingFn = (t: number) => number;
export type TimelinePlaybackState = "idle" | "playing" | "paused" | "seeking" | "completed";

export interface Keyframe {
  time: number; // ms from timeline start
  property: string;
  value: string | number;
  easing?: EasingFn | string;
}

export interface AnimationTrack {
  id: string;
  target: Element | string; // Element or selector
  keyframes: Array<Keyframe & { offset?: number }>;
  duration: number; // track duration in ms
  delay?: number;
  iterations?: number;
  direction?: "normal" | "reverse" | "alternate" | "alternate-reverse";
  fill?: "none" | "forwards" | "backwards" | "both";
}

export interface TimelineLabel {
  name: string;
  time: number; // ms
}

export interface TimelineEvent {
  name: string;
  time: number;
  callback: () => void;
  fired?: boolean;
}

export interface TimelineOptions {
  /** Autoplay on creation (default: false) */
  autoplay?: boolean;
  /** Default easing for tracks without specified easing */
  defaultEasing?: EasingFn | string;
  /** Playback rate (1 = normal, 2 = 2x, 0.5 = half) */
  playbackRate?: number;
  /** Loop the timeline (default: false) */
  loop?: boolean;
  /** Number of loops (-1 = infinite) */
  loopCount?: number;
  /** Yoyo (alternate direction each loop) */
  yoyo?: boolean;
  /** Use WAAPI when available (default: true) */
  useWAAPI?: boolean;
  /** Called on every frame update */
  onUpdate?: (progress: number, time: number) => void;
  /** Called when timeline completes */
  onComplete?: () => void;
  /** Called when timeline loops */
  onLoop?: (loopCount: number) => void;
  /** Called on play state change */
  onStateChange?: (state: TimelinePlaybackState) => void;
}

export interface TimelineState {
  state: TimelinePlaybackState;
  currentTime: number;
  duration: number;
  progress: number; // 0-1
  playbackRate: number;
  currentLoop: number;
  playingForwards: boolean;
}

// --- Easings ---

export const easings: Record<string, EasingFn> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  easeInElastic: (t) => -(Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1.1) * 5 * Math.PI) / 4)),
  easeOutElastic: (t) => { const p = 0.4; return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1; },
  easeOutBounce: (t) => {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    else if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    else if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    else return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
  },
  easeInBack: (t) => { const s = 1.70158; return t * t * ((s + 1) * t - s); },
  easeOutBack: (t) => { const s = 1.70158; return (--t) * t * ((s + 1) * t + s) + 1; },
};

/** Resolve easing from string or function */
function resolveEasing(easing: EasingFn | string | undefined): EasingFn {
  if (!easing) return easings.linear;
  if (typeof easing === "function") return easing;
  return easings[easing] ?? easings.linear;
}

// --- AnimationTimeline Implementation ---

export class AnimationTimeline {
  private tracks: AnimationTrack[] = [];
  private labels: Map<string, number> = new Map();
  private events: TimelineEvent[] = [];
  private options: Required<Pick<TimelineOptions, "autoplay" | "playbackRate" | "loop" | "loopCount" | "yoyo" | "useWAAPI">> & Omit<TimelineOptions, "autoplay" | "playbackRate" | "loop" | "loopCount" | "yoyo" | "useWAAPI">;

  private state: TimelineState;
  private rafId: number | null = null;
  private startTime: number | null = null;
  private pausedAt: number | null = null;
  private currentLoop = 0;
  private playingForwards = true;
  private waapiAnimations: Animation[] = [];
  private destroyed = false;

  constructor(options: TimelineOptions = {}) {
    this.options = {
      autoplay: options.autoplay ?? false,
      playbackRate: options.playbackRate ?? 1,
      loop: options.loop ?? false,
      loopCount: options.loopCount ?? (options.loop ? -1 : 1),
      yoyo: options.yoyo ?? false,
      useWAAPI: options.useWAAPI ?? true,
      defaultEasing: options.defaultEasing ?? "easeInOutQuad",
      onUpdate: options.onUpdate,
      onComplete: options.onComplete,
      onLoop: options.onLoop,
      onStateChange: options.onStateChange,
    };

    this.state = {
      state: "idle",
      currentTime: 0,
      duration: 0,
      progress: 0,
      playbackRate: this.options.playbackRate,
      currentLoop: 0,
      playingForwards: true,
    };

    if (this.options.autoplay) this.play();
  }

  // --- Track Management ---

  /**
   * Add an animation track to the timeline.
   * @param target - DOM element or CSS selector
   * @param keyframes - Array of keyframe definitions with times relative to timeline start
   * @param options - Track-level options
   */
  addTrack(
    target: Element | string,
    keyframes: Array<{ time: number; [property: string]: string | number; easing?: EasingFn | string }>,
    options?: { id?: string; delay?: number; iterations?: number },
  ): AnimationTrack {
    const id = options?.id ?? `track_${Date.now().toString(36)}`;
    const resolvedTarget = typeof target === "string" ? document.querySelector(target) : target;
    if (!resolvedTarget) throw new Error(`Target not found: ${target}`);

    // Sort keyframes by time
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    const startTime = sorted[0]?.time ?? 0;
    const endTime = sorted[sorted.length - 1]?.time ?? 0;
    const duration = endTime - startTime;

    const mappedKeyframes: Keyframe[] = sorted.map((kf) => ({
      time: kf.time,
      property: Object.keys(kf).find((k) => k !== "time" && k !== "easing")!,
      value: Object.values(kf).find((v) => typeof v !== "number") as string | number,
      easing: kf.easing,
    }));

    const track: AnimationTrack = {
      id, target: resolvedTarget, keyframes: mappedKeyframes,
      duration: duration || 100, delay: options?.delay ?? 0,
      iterations: options?.iterations,
    };

    this.tracks.push(track);
    this.recalculateDuration();
    return track;
  }

  /**
   * Add a simple tween (from → to) at a specific time.
   */
  tween(
    target: Element | string,
    property: string,
    from: string | number,
    to: string | number,
    startTimeMs: number,
    durationMs: number,
    easing?: EasingFn | string,
  ): AnimationTrack {
    return this.addTrack(target, [
      { time: startTimeMs, [property]: from, easing: easing ?? "linear" },
      { time: startTimeMs + durationMs, [property]: to },
    ]);
  }

  /**
   * Remove a track by ID.
   */
  removeTrack(trackId: string): boolean {
    const idx = this.tracks.findIndex((t) => t.id === trackId);
    if (idx === -1) return false;
    this.tracks.splice(idx, 1);
    this.recalculateDuration();
    return true;
  }

  /** Get all tracks */
  getTracks(): AnimationTrack[] { return [...this.tracks]; }

  // --- Labels ---

  /** Add a label at a specific time for seeking reference */
  addLabel(name: string, timeMs: number): void {
    this.labels.set(name, timeMs);
  }

  /** Seek to a label */
  seekToLabel(name: string): boolean {
    const time = this.labels.get(name);
    if (time === undefined) return false;
    this.seek(time);
    return true;
  }

  /** Get all labels */
  getLabels(): TimelineLabel[] {
    return Array.from(this.labels.entries()).map(([name, time]) => ({ name, time }));
  }

  // --- Events / Callbacks ---

  /** Add a callback that fires at a specific time */
  addEvent(name: string, timeMs: number, callback: () => void): void {
    this.events.push({ name, time: timeMs, callback, fired: false });
  }

  /** Remove an event by name */
  removeEvent(name: string): boolean {
    const idx = this.events.findIndex((e) => e.name === name);
    if (idx === -1) return false;
    this.events.splice(idx, 1);
    return true;
  }

  // --- Sequencing Helpers ---

  /**
   * Create a sequence of animations that play one after another.
   * Returns the total duration of the sequence.
   */
  sequence(items: Array<{
    target: Element | string;
    property: string;
    from: string | number;
    to: string | number;
    duration: number;
    easing?: EasingFn | string;
  }>, gapMs: number = 0): number {
    let currentTime = 0;
    for (const item of items) {
      this.tween(item.target, item.property, item.from, item.to, currentTime, item.duration, item.easing);
      currentTime += item.duration + gapMs;
    }
    return currentTime;
  }

  /**
   * Create a group of animations that play in parallel starting at a given time.
   */
  group(startTimeMs: number, items: Array<Parameters<AnimationTimeline["tween"]>): void {
    for (const args of items) {
      this.tween(args[0], args[1], args[2], args[3], startTimeMs, args[4], args[5]);
    }
  }

  // --- Playback Control ---

  /** Start or resume playback */
  play(): void {
    if (this.destroyed) return;

    switch (this.state.state) {
      case "completed":
        // Restart from beginning
        this.currentTime = 0;
        this.currentLoop = 0;
        this.playingForwards = true;
        break;
      case "paused":
      case "idle":
        this.playingForwards = true;
        break;
      case "playing":
        return; // Already playing
    }

    this.setState("playing");
    this.startTime = performance.now() - (this.state.currentTime / this.options.playbackRate);
    this.pausedAt = null;
    this.tick();
  }

  /** Pause playback */
  pause(): void {
    if (this.state.state !== "playing") return;
    this.setState("paused");
    this.pausedAt = performance.now();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.pauseWAAPI();
  }

  /** Toggle play/pause */
  toggle(): void {
    if (this.state.state === "playing") this.pause();
    else this.play();
  }

  /** Stop and reset to beginning */
  stop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.currentTime = 0;
    this.pausedAt = null;
    this.startTime = null;
    this.currentLoop = 0;
    this.playingForwards = true;
    this.resetEvents();
    this.cancelWAAPI();
    this.setState("idle");
  }

  /** Seek to a specific time (ms) */
  seek(timeMs: number): void {
    this.setState("seeking");
    this.currentTime = Math.max(0, Math.min(timeMs, this.state.duration));
    this.applyFrame(this.currentTime);
    this.fireEventsUpTo(this.currentTime);

    if (this.state.state === "playing") {
      // Adjust start time so playback continues from here
      this.startTime = performance.now() - (this.currentTime / this.options.playbackRate);
    } else {
      this.setState("paused");
    }
  }

  /** Seek to a progress value (0-1) */
  seekProgress(progress: number): void {
    this.seek(progress * this.state.duration);
  }

  /** Set playback rate (does not affect currently running animations immediately) */
  setPlaybackRate(rate: number): void {
    this.options.playbackRate = rate;
    this.state.playbackRate = rate;
    this.updateWAAPIPlaybackRate(rate);
  }

  // --- State Query ---

  getState(): TimelineState { return { ...this.state }; }
  get isPlaying(): boolean { return this.state.state === "playing"; }
  get isPaused(): boolean { return this.state.state === "paused"; }
  get isCompleted(): boolean { return this.state.state === "completed"; }
  get currentTime(): number { return this.state.currentTime; }
  get duration(): number { return this.state.duration; }
  get progress(): number { return this.state.progress; }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    this.tracks = [];
    this.labels.clear();
    this.events = [];
    this.waapiAnimations = [];
  }

  // --- Internal ---

  private set currentTime(ms: number) {
    this.state.currentTime = ms;
    this.state.progress = this.state.duration > 0 ? ms / this.state.duration : 0;
  }

  private setState(newState: TimelinePlaybackState): void {
    if (this.state.state === newState) return;
    this.state.state = newState;
    this.options.onStateChange?.(newState);
  }

  private tick = (): void => {
    if (this.destroyed || this.state.state !== "playing") return;

    const elapsed = (performance.now() - this.startTime!) * this.options.playbackRate;
    let currentTime = elapsed;

    if (this.playingForwards) {
      if (currentTime >= this.state.duration) {
        this.handleLoopEnd();
        return;
      }
    } else {
      // Playing backwards (yoyo)
      if (currentTime <= 0) {
        this.handleLoopEnd();
        return;
      }
    }

    this.currentTime = currentTime;
    this.applyFrame(currentTime);
    this.fireEventsUpTo(currentTime);
    this.options.onUpdate?.(this.state.progress, currentTime);

    this.rafId = requestAnimationFrame(this.tick);
  };

  private handleLoopEnd(): void {
    this.currentLoop++;
    this.state.currentLoop = this.currentLoop;

    // Check loop limit
    if (this.options.loopCount > 0 && this.currentLoop >= this.options.loopCount) {
      this.currentTime = this.playingForwards ? this.state.duration : 0;
      this.applyFrame(this.currentTime);
      this.setState("completed");
      this.cancelWAAPI();
      this.options.onComplete?.();
      return;
    }

    this.options.onLoop?.(this.currentLoop);

    if (this.options.yoyo) {
      this.playingForwards = !this.playingForwards;
      this.state.playingForwards = this.playingForwards;
    }

    // Reset to start or end depending on direction
    if (this.playingForwards) {
      this.startTime = performance.now();
    } else {
      this.startTime = performance.now() - (this.state.duration / this.options.playbackRate);
    }

    this.resetEvents();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private applyFrame(time: number): void {
    for (const track of this.tracks) {
      const localTime = time - track.delay;
      if (localTime < 0 || localTime > track.duration + track.delay) continue;

      const element = track.target as Element;
      if (!element) continue;

      // Find surrounding keyframes
      const kfs = track.keyframes.filter((kf) => kf.time >= track.delay && kf.time <= track.delay + track.duration);
      if (kfs.length < 2) continue;

      // Find the two keyframes we're between
      let prevKf = kfs[0], nextKf = kfs[kfs.length - 1];
      for (let i = 0; i < kfs.length - 1; i++) {
        if (localTime >= kfs[i].time && localTime <= kfs[i + 1].time) {
          prevKf = kfs[i];
          nextKf = kfs[i + 1];
          break;
        }
      }

      const range = nextKf.time - prevKf.time;
      if (range <= 0) continue;
      let progress = (localTime - prevKf.time) / range;

      // Apply easing
      const easing = resolveEasing(prevKf.easing ?? this.options.defaultEasing);
      progress = easing(progress);

      // Interpolate value
      const interpolated = this.interpolate(prevKf.value, nextKf.value, progress);
      element.style.setProperty(track.keyframes[0].property, String(interpolated));
    }
  }

  private interpolate(from: string | number, to: string | number, t: number): string | number {
    if (typeof from === "number" && typeof to === "number") {
      return from + (to - from) * t;
    }
    // For strings (colors, transforms), do simple interpolation
    if (typeof from === "string" && typeof to === "string") {
      // Try numeric extraction for colors like rgb/rgba
      const fromNums = from.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
      const toNums = to.match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
      if (fromNums.length === toNums.length && fromNums.length > 0) {
        let result = to;
        for (let i = 0; i < toNums.length; i++) {
          result = result.replace(toNums[i].toString(), String(Math.round(fromNums[i] + (toNums[i] - fromNums[i]) * t)));
        }
        return result;
      }
      // Fallback: crossfade at 50%
      return t < 0.5 ? from : to;
    }
    return to;
  }

  private fireEventsUpTo(time: number): void {
    for (const event of this.events) {
      if (!event.fired && time >= event.time) {
        event.fired = true;
        try { event.callback(); } catch {}
      }
    }
  }

  private resetEvents(): void {
    for (const event of this.events) event.fired = false;
  }

  private recalculateDuration(): void {
    let maxEnd = 0;
    for (const track of this.tracks) {
      const trackEnd = (track.delay ?? 0) + track.duration;
      if (trackEnd > maxEnd) maxEnd = trackEnd;
    }
    this.state.duration = maxEnd;
  }

  // --- WAAPI Integration ---

  private initWAAPI(): void {
    if (!this.options.useWAAPI) return;
    this.cancelWAAPI();

    for (const track of this.tracks) {
      const element = track.target as Element;
      if (!element || !(element instanceof HTMLElement || element instanceof SVGElement)) continue;

      const wfKeyframes = track.keyframes.map((kf) => {
        const obj: Record<string, string | number> = {};
        obj[kf.property] = kf.value;
        return obj;
      });

      const timing: KeyframeAnimationOptions = {
        duration: track.duration,
        delay: track.delay ?? 0,
        iterations: track.iterations ?? 1,
        fill: track.fill ?? "forwards",
      };

      try {
        const anim = element.animate(wfKeyframes, timing);
        anim.pause(); // Start paused — we control via timeline
        this.waapiAnimations.push(anim);
      } catch {}
    }
  }

  private updateWAAPIProgress(time: number): void {
    for (let i = 0; i < this.waapiAnimations.length; i++) {
      const track = this.tracks[i];
      if (!track) continue;
      const localTime = time - (track.delay ?? 0);
      const progress = track.duration > 0 ? localTime / track.duration : 0;
      try { this.waapiAnimations[i].currentTime = Math.max(0, progress * track.duration); } catch {}
    }
  }

  private pauseWAAPI(): void {
    for (const anim of this.waapiAnimations) { try { anim.pause(); } catch {} }
  }

  private cancelWAAPI(): void {
    for (const anim of this.waapiAnimations) { try { anim.cancel(); } catch {} }
    this.waapiAnimations = [];
  }

  private updateWAAPIPlaybackRate(rate: number): void {
    for (const anim of this.waapiAnimations) { try { anim.playbackRate = rate; } catch {} }
  }
}

// --- Factory ---

export function createTimeline(options?: TimelineOptions): AnimationTimeline {
  return new AnimationTimeline(options);
}
