/**
 * Tween Engine: High-performance property tweening library with timeline support,
 * sequencing, yoyo, easing, chaining, progress control, and plugin architecture.
 * Zero dependencies, requestAnimationFrame-driven.
 */

// --- Types ---

export type TweenProp = string;
export type TweenValue = number | string;

export interface Tweenable {
  [key: string]: TweenValue;
}

export interface TweenProps {
  /** Target object to tween (element or plain object) */
  target: HTMLElement | Tweenable;
  /** Properties to animate with target values */
  to: Record<string, TweenValue>;
  /** Starting values (auto-read from target if omitted) */
  from?: Record<string, TweenValue>;
  /** Duration in milliseconds */
  duration?: number;
  /** Delay before start in ms */
  delay?: number;
  /** Easing function name or custom function */
  easing?: string | ((t: number) => number);
  /** Number of iterations (default: 1, Infinity for loop) */
  repeat?: number;
  /** Yoyo back and forth on repeat? */
  yoyo?: boolean;
  /** Play direction for alternate iterations */
  direction?: "forward" | "reverse" | "alternate";
  /** Fill mode after completion */
  fill?: "none" | "forwards" | "backwards" | "both";
  /** Callback each frame with progress and values */
  onUpdate?: (values: Record<string, TweenValue>, progress: number) => void;
  /** Callback on complete */
  onComplete?: () => void;
  /** Callback on start */
  onStart?: () => void;
  /** Callback when tween is interrupted/stopped */
  onStop?: () => void;
  /** String interpolation for non-numeric properties (e.g., colors) */
  interpolators?: Record<string, (from: TweenValue, to: TweenValue, t: number) => TweenValue>;
  /** Auto-start? (default: true) */
  autoStart?: boolean;
  /** Time scale (1 = normal, 0.5 = half speed, 2 = double speed) */
  timeScale?: number;
}

export interface TweenInstance {
  /** Current tweened values */
  currentValues: Record<string, TweenValue>;
  /** Progress 0-1 */
  progress: number;
  /** Is playing? */
  isPlaying: () => boolean;
  /** Is reversed? */
  isReversed: () => boolean;
  /** Play from current state */
  play: () => TweenInstance;
  /** Pause at current position */
  pause: () => TweenInstance;
  /** Stop and reset to start */
  stop: () => TweenInstance;
  /** Reverse playback direction */
  reverse: () => TweenInstance;
  /** Seek to specific progress (0-1) */
  seek: (progress: number) => TweenInstance;
  /** Seek to specific time in ms */
  seekToTime: (timeMs: number) => TweenInstance;
  /** Restart from beginning */
  restart: () => TweenInstance;
  /** Chain another tween after this completes */
  then: (props: TweenProps) => TweenInstance;
  /** Set new target values mid-animation */
  updateTo: (newTo: Partial<Record<string, TweenValue>>, duration?: number) => TweenInstance;
  /** Get elapsed time in ms */
  getElapsedTime: () => number;
  /** Get total duration including delay and repeats */
  getTotalDuration: () => number;
  /** Get remaining time in ms */
  getRemainingTime: () => number;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Easing Functions ---

const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,

  // Quad
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Quint
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t),

  // Sine
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Expo
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // Circ
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t) => (t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2),

  // Elastic
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1.075) * 2 * Math.PI) / 3);
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * 2 * Math.PI) / 3) + 1;
  },
  easeInOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const s = 0.45;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin(((20 * t - 11.125) * Math.PI) / (4 * s))) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin(((20 * t - 11.125) * Math.PI) / (4 * s))) / 2 + 1;
  },

  // Back
  easeInBack: (t) => { const c = 1.70158; return (c + 1) * t * t * t - c * t * t; },
  easeOutBack: (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  easeInOutBack: (t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },

  // Bounce
  easeOutBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInBounce: (t) => 1 - EASINGS.easeOutBounce(1 - t),
  easeInOutBounce: (t) => (t < 0.5 ? (1 - EASINGS.easeOutBounce(1 - 2 * t)) / 2 : (1 + EASINGS.easeOutBounce(2 * t - 1)) / 2),
};

// --- Built-in Interpolators ---

const INTERPOLATORS: Record<string, (a: TweenValue, b: TweenValue, t: number) => TweenValue> = {
  color(from, to, t) {
    return interpolateColor(String(from), String(to), t);
  },
};

function parseColor(hex: string): { r: number; g: number; b: number } {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    return {
      r: parseInt(hex[0]! + hex[0]!, 16),
      g: parseInt(hex[1]! + hex[1]!, 16),
      b: parseInt(hex[2]! + hex[2]!, 16),
    };
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16),
  };
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

function interpolateColor(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  return `#${toHex(a.r + (b.r - a.r) * t)}${toHex(a.g + (b.g - a.g) * t)}${toHex(a.b + (b.b - a.b) * t)}`;
}

// --- Global Ticker ---

let tickerActive = false;
const activeTweens = new Set<TweenInternal>();

function startTicker(): void {
  if (tickerActive) return;
  tickerActive = true;
  tick();
}

function stopTicker(): void {
  tickerActive = false;
}

function tick(): void {
  if (!tickerActive) return;

  for (const tween of activeTweens) {
    if (!tween._playing) continue;
    tween._update(performance.now());
  }

  // Cleanup destroyed tweens
  for (const tween of activeTweens) {
    if (tween._destroyed) activeTweens.delete(tween);
  }

  if (activeTweens.size > 0) {
    requestAnimationFrame(tick);
  } else {
    tickerActive = false;
  }
}

// --- Internal Interface ---

interface TweenInternal extends TweenInstance {
  _playing: boolean;
  _reversed: boolean;
  _destroyed: boolean;
  _startTime: number | null;
  _pausedAt: number | null;
  _pausedElapsed: number;
  _repeatCount: number;
  _chainNext: TweenProps | null;
  _update: (now: number) => void;
}

// --- Main Factory ---

export function createTween(props: TweenProps): TweenInstance {
  const DURATION = props.duration ?? 500;
  const DELAY = props.delay ?? 0;
  const REPEAT = props.repeat ?? 1;
  const YOYO = props.yoyo ?? false;
  const TIME_SCALE = props.timeScale ?? 1;
  const FILL = props.fill ?? "none";
  const AUTO_START = props.autoStart !== false;

  let easingFn: (t: number) => number;
  if (typeof props.easing === "function") {
    easingFn = props.easing;
  } else {
    easingFn = EASINGS[(props.easing as string) ?? "easeOutQuad"] ?? EASINGS.linear;
  }

  // Resolve initial values
  const initialFrom: Record<string, TweenValue> = {};
  const targetTo: Record<string, TweenValue> = {};
  const interpolatorMap: Map<string, (a: TweenValue, b: TweenValue, t: number) => TweenValue> = new Map();

  for (const [key, endVal] of Object.entries(props.to)) {
    const startVal = props.from?.[key] ?? readInitialValue(props.target, key);
    initialFrom[key] = startVal;
    targetTo[key] = endVal;

    // Check for custom interpolator
    if (props.interpolators?.[key]) {
      interpolatorMap.set(key, props.interpolators[key]!);
    } else if (typeof startVal === "string" && typeof endVal === "string") {
      // Try color interpolation for strings that look like colors
      if (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(startVal) &&
          /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(endVal)) {
        interpolatorMap.set(key, INTERPOLATORS.color);
      }
    }
  }

  let currentProgress = 0;
  let currentValues: Record<string, TweenValue> = { ...initialFrom };
  let playing = false;
  let reversed = false;
  let destroyed = false;
  let startTime: number | null = null;
  let pausedAt: number | null = null;
  let pausedElapsed = 0;
  let repeatCount = 0;
  let chainNext: TweenProps | null = null;

  const instance: TweenInternal = {
    currentValues,
    progress: 0,

    isPlaying: () => playing && !destroyed,
    isReversed: () => reversed,

    play() {
      if (destroyed) return instance;
      if (!startTime) {
        startTime = performance.now() - pausedElapsed;
      } else if (pausedAt) {
        startTime += performance.now() - pausedAt!;
        pausedAt = null;
      }

      playing = true;
      activeTweens.add(instance);
      startTicker();
      props.onStart?.();
      return instance;
    },

    pause() {
      if (!playing || destroyed) return instance;
      playing = false;
      pausedAt = performance.now();
      props.onStop?.();
      return instance;
    },

    stop() {
      playing = false;
      pausedAt = null;
      pausedElapsed = 0;
      currentProgress = 0;
      repeatCount = 0;
      applyValues(0);
      if (FILL === "none" || FILL === "backwards") {
        applyValues(FILL === "backwards" ? 1 : 0);
      }
      activeTweens.delete(instance);
      return instance;
    },

    reverse() {
      reversed = !reversed;
      return instance;
    },

    seek(p: number) {
      const clamped = Math.max(0, Math.min(1, p));
      currentProgress = clamped;
      applyValues(clamped);
      return instance;
    },

    seekToTime(timeMs: number) {
      const effectiveDuration = DURATION / TIME_SCALE;
      const p = timeMs / effectiveDuration;
      return instance.seek(Math.max(0, Math.min(1, p)));
    },

    restart() {
      instance.stop();
      pausedElapsed = 0;
      repeatCount = 0;
      return instance.play();
    },

    then(nextProps: TweenProps) {
      chainNext = nextProps;
      return instance;
    },

    updateTo(newTo, newDuration) {
      for (const [key, val] of Object.entries(newTo)) {
        targetTo[key] = val;
        initialFrom[key] = currentValues[key]!;
      }
      if (newDuration != null) {
        // Adjust progress proportionally
        const ratio = newDuration / DURATION;
        pausedElapsed *= ratio;
      }
      return instance;
    },

    getElapsedTime() {
      if (!startTime) return 0;
      const base = pausedAt ? pausedAt! : performance.now();
      return ((base - startTime) * TIME_SCALE - pausedElapsed);
    },

    getTotalDuration() {
      const totalRepeats = REPEAT === Infinity ? 1 : REPEAT;
      return (DELAY + DURATION) * totalRepeats;
    },

    getRemainingTime() {
      return Math.max(0, instance.getTotalDuration() - instance.getElapsedTime());
    },

    destroy() {
      destroyed = true;
      playing = false;
      activeTweens.delete(instance);
      chainNext = null;
    },

    _playing: playing,
    _reversed: reversed,
    _destroyed: destroyed,
    _startTime: startTime,
    _pausedAt: pausedAt,
    _pausedElapsed: pausedElapsed,
    _repeatCount: repeatCount,
    _chainNext: chainNext,

    _update(now: number) {
      if (!playing || destroyed) return;

      const elapsed = ((now - startTime!) * TIME_SCALE - pausedElapsed);

      if (elapsed < 0) return; // Still in delay

      // Calculate raw progress
      let rawProgress = Math.min(elapsed / DURATION, 1);

      // Handle direction
      let p = rawProgress;
      if (reversed) p = 1 - rawProgress;

      // Apply easing
      let easedProgress = easingFn(p);

      // Handle yoyo
      if (YOYO && repeatCount % 2 === 1) {
        easedProgress = 1 - easedProgress;
      }

      currentProgress = easedProgress;
      applyValues(easedProgress);
      props.onUpdate?.(currentValues, easedProgress);

      // Check completion
      if (rawProgress >= 1) {
        repeatCount++;

        if (REPEAT === Infinity || repeatCount < REPEAT) {
          // Reset for next iteration
          startTime = now;
          pausedElapsed = 0;
          if (YOYO) {
            // Values will be handled by the yoyo logic above
          }
        } else {
          // Complete
          playing = false;
          if (FILL === "forwards" || FILL === "both") {
            applyValues(reversed ? 0 : 1);
          }
          activeTweens.delete(instance);
          props.onComplete?.();

          // Chain
          if (chainNext) {
            const next = chainNext;
            chainNext = null;
            createTween({ ...next, target: props.target });
          }
        }
      }
    },
  };

  function applyValues(progress: number): void {
    for (const key of Object.keys(targetTo)) {
      const fromVal = initialFrom[key]!;
      const toVal = targetTo[key]!;
      const interp = interpolatorMap.get(key);

      if (interp) {
        currentValues[key] = interp(fromVal, toVal, progress);
      } else if (typeof fromVal === "number" && typeof toVal === "number") {
        currentValues[key] = fromVal + (toVal - fromVal) * progress;
      } else {
        currentValues[key] = progress > 0.5 ? toVal : fromVal;
      }
    }

    // Apply to target
    applyToTarget(props.target, currentValues);
  }

  // Auto-start
  if (AUTO_START) {
    instance.play();
  }

  return instance;
}

// --- Helper Functions ---

function readInitialValue(target: HTMLElement | Tweenable, prop: string): TweenValue {
  if (target instanceof HTMLElement) {
    const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();

    // Special cases
    switch (prop) {
      case "x":
      case "translateX": {
        const transform = getComputedStyle(target).transform;
        if (transform === "none") return 0;
        const match = transform.match(/matrix\(([^)]+)\)/);
        if (match) {
          const vals = match[1]!.split(/,\s*/).map(Number);
          return vals[4] ?? 0;
        }
        return 0;
      }
      case "y":
      case "translateY": {
        const transform = getComputedStyle(target).transform;
        if (transform === "none") return 0;
        const match = transform.match(/matrix\(([^)]+)\)/);
        if (match) {
          const vals = match[1]!.split(/,\s*/).map(Number);
          return vals[5] ?? 0;
        }
        return 0;
      }
      case "opacity":
        return parseFloat(getComputedStyle(target).opacity) || 0;
      case "scale":
      case "scaleX":
      case "scaleY": {
        const transform = getComputedStyle(target).transform;
        if (transform === "none") return 1;
        // Simplified — just return 1 as default
        return 1;
      }
      case "rotate": {
        const transform = getComputedStyle(target).transform;
        if (transform === "none") return 0;
        // Parse rotation from matrix (simplified)
        return 0;
      }
      default:
        const styleVal = getComputedStyle(target).getPropertyValue(cssProp);
        if (styleVal) {
          const num = parseFloat(styleVal);
          if (!isNaN(num)) return num;
        }
        return styleVal || 0;
    }
  }

  // Plain object
  return (target as Tweenable)[prop] ?? 0;
}

function applyToTarget(target: HTMLElement | Tweenable, values: Record<string, TweenValue>): void {
  if (target instanceof HTMLElement) {
    let transformParts: string[] = [];

    for (const [prop, val] of Object.entries(values)) {
      switch (prop) {
        case "x":
        case "translateX":
          transformParts.push(`translateX(${val}px)`);
          break;
        case "y":
        case "translateY":
          transformParts.push(`translateY(${val}px)`);
          break;
        case "scale":
          transformParts.push(`scale(${val})`);
          break;
        case "rotate":
          transformParts.push(`rotate(${val}deg)`);
          break;
        case "opacity":
          target.style.opacity = String(val);
          break;
        default:
          const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
          (target.style as unknown as Record<string, string>)[cssProp] = typeof val === "number"
            ? `${val}${isDimensionalProperty(prop) ? "px" : ""}`
            : String(val);
      }
    }

    if (transformParts.length > 0) {
      target.style.transform = transformParts.join(" ");
    }
  } else {
    for (const [prop, val] of Object.entries(values)) {
      (target as Tweenable)[prop] = val;
    }
  }
}

function isDimensionalProperty(prop: string): boolean {
  const dimensional = new Set([
    "width", "height", "top", "left", "right", "bottom",
    "margin", "padding", "borderwidth", "fontsize", "lineheight",
    "maxwidth", "minwidth", "maxheight", "minheight",
  ]);
  return dimensional.has(prop.toLowerCase());
}

// --- Convenience API ---

/** Create multiple parallel tweens */
export function tweenAll(
  items: Array<{ target: HTMLElement | Tweenable; to: Record<string, TweenValue> }>,
  sharedOptions?: Omit<TweenProps, "target" | "to">
): TweenInstance[] {
  return items.map((item) =>
    createTween({ ...sharedOptions, target: item.target, to: item.to })
  );
}

/** Create sequential tweens (one after another) */
export function tweenSequence(
  items: Array<{ target: HTMLElement | Tweenable; to: Record<string, TweenValue>; duration?: number }>,
  sharedOptions?: Omit<TweenProps, "target" | "to" | "duration">
): TweenInstance[] {
  const instances: TweenInstance[] = [];
  let prev: TweenInstance | null = null;

  for (const item of items) {
    const tw = createTween({
      ...sharedOptions,
      target: item.target,
      to: item.to,
      duration: item.duration ?? sharedOptions?.duration ?? 500,
      autoStart: false,
    });

    if (prev) {
      prev.then({ target: item.target, to: item.to, duration: item.duration });
    }

    instances.push(tw);
    prev = tw;
  }

  // Start first one
  if (instances.length > 0) instances[0]!.play();

  return instances;
}

/** Fade in an element */
export function fadeIn(
  element: HTMLElement,
  duration = 300,
  options?: Partial<TweenProps>
): TweenInstance {
  element.style.opacity = "0";
  return createTween({
    target: element,
    to: { opacity: 1 },
    duration,
    easing: "easeOutCubic",
    ...options,
  });
}

/** Fade out an element */
export function fadeOut(
  element: HTMLElement,
  duration = 300,
  options?: Partial<TweenProps>
): TweenInstance {
  return createTween({
    target: element,
    to: { opacity: 0 },
    duration,
    easing: "easeInCubic",
    ...options,
  });
}

/** Slide an element in from a direction */
export function slideIn(
  element: HTMLElement,
  direction: "left" | "right" | "up" | "down" = "up",
  distance = 30,
  duration = 400,
  options?: Partial<TweenProps>
): TweenInstance {
  const props: Record<string, number> =
    direction === "left" || direction === "right"
      ? { x: 0, opacity: 1 }
      : { y: 0, opacity: 1 };

  const from: Record<string, number> =
    direction === "left" ? { x: -distance, opacity: 0 } :
    direction === "right" ? { x: distance, opacity: 0 } :
    direction === "up" ? { y: -distance, opacity: 0 } :
    { y: distance, opacity: 0 };

  return createTween({
    target: element,
    to: props,
    from,
    duration,
    easing: "easeOutCubic",
    ...options,
  });
}
