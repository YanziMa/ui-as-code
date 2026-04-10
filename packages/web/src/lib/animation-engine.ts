/**
 * Animation engine: keyframe animation builder, spring physics, easing functions,
 * timeline orchestration, scroll-driven animations, gesture-linked animations.
 */

// --- Easing Functions ---

export interface EasingFunction {
  (t: number): number; // t: 0..1 → output: 0..1 (usually)
}

export const easings: Record<string, EasingFunction> = {
  linear: (t) => t,

  // Quadratic
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quartic
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Quintic
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t),

  // Sinusoidal
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Exponential
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // Circular
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t) => (t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2),

  // Elastic
  easeInElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin(((t - 1.1) * 5 * Math.PI) / 4);
  },
  easeOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin(((t - 0.1) * 5 * Math.PI) / 4) + 1;
  },
  easeInOutElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin(((20 * t - 11.125) * 2 * Math.PI) / 12.5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin(((20 * t - 11.125) * 2 * Math.PI) / 12.5)) / 2 + 1;
  },

  // Back
  easeInBack: (t) => {
    const c = 1.70158;
    return (c + 1) * t * t * t - c * t * t;
  },
  easeOutBack: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },

  // Bounce
  easeInBounce: (t) => 1 - easings.easeOutBounce(1 - t),
  easeOutBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInOutBounce: (t) => (t < 0.5 ? (1 - easings.easeOutBounce(1 - 2 * t)) / 2 : (1 + easings.easeOutBounce(2 * t - 1)) / 2),

  // Steps
  steps: (steps: number): EasingFunction => (t) => Math.round(t * steps) / steps,
};

/** Get easing by name with fallback */
export function getEasing(name: string): EasingFunction {
  return easings[name] ?? easings.linear;
}

// --- Spring Physics ---

export interface SpringConfig {
  stiffness: number;   // Default 170
  damping: number;     // Default 26
  mass: number;        // Default 1
  velocity?: number;   // Initial velocity
  precision?: number;  // Stop threshold (default 0.01)
}

export interface SpringState {
  value: number;
  velocity: number;
  isResting: boolean;
}

/** Animate using spring physics */
export function springAnimate(
  from: number,
  to: number,
  config: Partial<SpringConfig> = {},
  onUpdate: (state: SpringState) => void,
  onComplete?: () => void,
): () => void {
  const { stiffness = 170, damping = 26, mass = 1, velocity = 0, precision = 0.01 } = config;

  let currentValue = from;
  let currentVelocity = velocity;
  let cancelled = false;
  let animFrameId: number;

  function step(): void {
    if (cancelled) return;

    const springForce = -stiffness * (currentValue - to);
    const dampingForce = -damping * currentVelocity;
    const acceleration = (springForce + dampingForce) / mass;

    currentVelocity += acceleration / 60; // Assuming ~60fps
    currentValue += currentVelocity / 60;

    const isResting =
      Math.abs(currentVelocity) < precision &&
      Math.abs(currentValue - to) < precision;

    onUpdate({ value: currentValue, velocity: currentVelocity, isResting });

    if (isResting) {
      onUpdate({ value: to, velocity: 0, isResting: true });
      onComplete?.();
      return;
    }

    animFrameId = requestAnimationFrame(step);
  }

  animFrameId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(animFrameId);
  };
}

// --- Animation Timeline ---

export interface Keyframe {
  offset: number;           // 0..1
  properties: Record<string, number | string>;
  easing?: EasingFunction;
}

export interface AnimationTrack {
  target: HTMLElement;
  keyframes: Keyframe[];
  duration: number;         // ms
  delay?: number;
  iterations?: number;      // Infinity for loop
  direction?: "normal" | "reverse" | "alternate" | "alternate-reverse";
  fillMode?: "none" | "forwards" | "backwards" | "both";
}

export class AnimationTimeline {
  private tracks: AnimationTrack[] = [];
  private currentTime = 0;
  private playing = false;
  private animFrameId: number | null = null;
  private startTime = 0;
  private onTrackComplete?: (trackIndex: number) => void;
  private onComplete?: () => void;

  add(track: AnimationTrack): this {
    this.tracks.push(track);
    return this;
  }

  setOnTrackComplete(fn: (trackIndex: number) => void): this {
    this.onTrackComplete = fn;
    return this;
  }

  setOnComplete(fn: () => void): this {
    this.onComplete = fn;
    return this;
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.startTime = performance.now() - this.currentTime;
    this.tick();
  }

  pause(): void {
    this.playing = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  stop(): void {
    this.pause();
    this.currentTime = 0;
    this.applyFrame(0);
  }

  seek(time: number): void {
    this.currentTime = Math.max(0, time);
    this.applyFrame(this.currentTime);
  }

  getCurrentTime(): number { return this.currentTime; }

  getDuration(): number {
    let maxEnd = 0;
    for (const track of this.tracks) {
      const end = (track.delay ?? 0) + track.duration;
      if (end > maxEnd) maxEnd = end;
    }
    return maxEnd;
  }

  clear(): void {
    this.stop();
    this.tracks = [];
  }

  private tick(): void {
    if (!this.playing) return;

    this.currentTime = performance.now() - this.startTime;
    this.applyFrame(this.currentTime);

    // Check if all tracks complete
    const totalDuration = this.getDuration();
    if (this.currentTime >= totalDuration) {
      this.onComplete?.();
      this.pause();
      return;
    }

    this.animFrameId = requestAnimationFrame(() => this.tick());
  }

  private applyFrame(globalTime: number): void {
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i]!;
      const localTime = globalTime - (track.delay ?? 0);

      if (localTime < 0 || localTime > track.duration) continue;

      const progress = localTime / track.duration;
      this.interpolateKeyframes(track.target, track.keyframes, progress);
    }
  }

  private interpolateKeyframes(el: HTMLElement, keyframes: Keyframe[], progress: number): void {
    if (keyframes.length === 0) return;

    // Find surrounding keyframes
    let prevIdx = 0;
    for (let i = 0; i < keyframes.length; i++) {
      if (keyframes[i]!.offset <= progress) prevIdx = i;
      else break;
    }

    const prev = keyframes[prevIdx]!;
    const next = keyframes[Math.min(prevIdx + 1, keyframes.length - 1)]!;

    if (prev.offset === next.offset) {
      this.applyProperties(el, prev.properties);
      return;
    }

    const range = next.offset - prev.offset;
    const localProgress = range > 0 ? (progress - prev.offset) / range : 0;
    const easedProgress = (next.easing ?? easings.easeInOutQuad)(localProgress);

    for (const [prop, endVal] of Object.entries(next.properties)) {
      const startVal = prev.properties[prop];
      if (typeof startVal === "number" && typeof endVal === "number") {
        const interpolated = startVal + (endVal - startVal) * easedProgress;
        this.setProperty(el, prop, interpolated);
      } else {
        this.setProperty(el, prop, localProgress > 0.5 ? endVal : startVal);
      }
    }
  }

  private applyProperties(el: HTMLElement, props: Record<string, number | string>): void {
    for (const [prop, val] of Object.entries(props)) {
      this.setProperty(el, prop, val);
    }
  }

  private setProperty(el: HTMLElement, prop: string, value: number | string): void {
    // Map CSS property names
    const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();

    if (cssProp.startsWith("transform")) {
      // Handle transform sub-properties
      el.style.transform = `${el.style.transform} ${cssProp.replace("transform-", "")}(${value})`.trim();
    } else if (typeof value === "number") {
      (el.style as unknown as Record<string, string>)[cssProp] = String(value);
    } else {
      (el.style as unknown as Record<string, string>)[cssProp] = value;
    }
  }
}

// --- Scroll-Driven Animations ---

export interface ScrollAnimationConfig {
  trigger: HTMLElement;
  target?: HTMLElement;
  start?: string;   // e.g., "top 80%"
  end?: string;     // e.g., "bottom 20%"
  scrub?: boolean;  // Link animation progress directly to scroll
  properties: Record<string, [number, number]>; // [from, to] per property
  easing?: EasingFunction;
}

export function createScrollAnimation(config: ScrollAnimationConfig): () => void {
  const {
    trigger,
    target = trigger,
    start = "top 80%",
    end = "bottom 20%",
    scrub = true,
    properties,
    easing = easings.linear,
  } = config;

  let rafId: number | null = null;

  function update(): void {
    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    // Parse start/end positions
    const [startPos, startViewport] = parseScrollPosition(start);
    const [endPos, endViewport] = parseScrollPosition(end);

    const startPixel = startPos === "top" ? 0 : viewportHeight;
    const endPixel = endPos === "bottom" ? viewportHeight : 0;
    const triggerStart = rect.top - (startViewport / 100) * viewportHeight + startPixel;
    const triggerEnd = rect.bottom - (endViewport / 100) * viewportHeight + endPixel;

    const totalRange = triggerEnd - triggerStart;
    let progress = (viewportHeight - triggerStart) / totalRange;
    progress = Math.max(0, Math.min(1, progress));
    progress = easing(progress);

    for (const [prop, [from, to]] of Object.entries(properties)) {
      const value = from + (to - from) * progress;
      applyStyle(target, prop, value);
    }
  }

  function onScroll(): void {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      update();
      rafId = null;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  update(); // Initial

  return () => {
    window.removeEventListener("scroll", onScroll);
    if (rafId !== null) cancelAnimationFrame(rafId);
  };
}

function parseScrollPosition(pos: string): ["top" | "bottom", number] {
  const parts = pos.split(/\s+/);
  const edge = parts[0] as "top" | "bottom";
  const percent = parseFloat(parts[1] ?? "0") || 0;
  return [edge, percent];
}

function applyStyle(el: HTMLElement, prop: string, value: number): void {
  const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
  if (cssProp.includes("transform") || ["x", "y", "scale", "rotate", "opacity"].includes(prop)) {
    switch (prop) {
      case "x": el.style.transform = `translateX(${value}px)`; break;
      case "y": el.style.transform = `translateY(${value}px)`; break;
      case "scale": el.style.transform = `scale(${value})`; break;
      case "rotate": el.style.transform = `rotate(${value}deg)`; break;
      case "opacity": el.style.opacity = String(value); break;
      default:
        (el.style as unknown as Record<string, string>)[cssProp] = String(value);
    }
  } else {
    (el.style as unknown as Record<string, string>)[cssProp] = String(value);
  }
}

// --- Staggered Animation ---

/** Create staggered animations for a list of elements */
export function staggerElements(
  elements: HTMLElement[],
  animateFn: (el: HTMLElement, index: number) => void,
  options: { staggerMs?: number; reverse?: boolean } = {},
): (() => void)[] {
  const { staggerMs = 50, reverse = false } = options;
  const items = reverse ? [...elements].reverse() : elements;
  const cancellers: (() => void)[] = [];

  items.forEach((el, i) => {
    const timer = setTimeout(() => animateFn(el, i), i * staggerMs);
    cancellers.push(() => clearTimeout(timer));
  });

  return cancellers;
}

// --- Number Counter Animation ---

/** Animate a number counting up/down */
export function animateCounter(
  element: HTMLElement,
  from: number,
  to: number,
  duration = 1000,
  easingFn: EasingFunction = easings.easeOutExpo,
  formatter?: (value: number) => string,
): () => void {
  let cancelled = false;
  let startTime: number;

  function tick(timestamp: number): void {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easingFn(progress);
    const value = from + (to - from) * eased;

    element.textContent = formatter ? formatter(Math.round(value)) : String(Math.round(value));

    if (progress < 1 && !cancelled) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);

  return () => { cancelled = true; };
}

// --- Parallax ---

export function createParallax(element: HTMLElement, speed = 0.5): () => void {
  function handler(): void {
    const scrolled = window.scrollY;
    const rate = scrolled * -speed;
    element.style.transform = `translateY(${rate}px)`;
  }

  window.addEventListener("scroll", handler, { passive: true });
  handler();

  return () => window.removeEventListener("scroll", handler);
}
