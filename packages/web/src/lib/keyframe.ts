/**
 * Keyframe: CSS keyframe animation definition and management utilities.
 *
 * Provides:
 *   - Declarative keyframe definition with typed keyframe objects
 *   - CSS @keyframes rule injection and management
 *   - Keyframe interpolation (lerp between keyframes)
 *   - Prebuilt animation presets (bounce, shake, pulse, etc.)
 *   - Keyframe sequence composition (chaining, parallel, stagger)
 *   - WAAPI (Web Animations API) integration
 *   - Animation lifecycle hooks
 */

// --- Types ---

export interface KeyframeDefinition {
  /** CSS offset (0-1) */
  offset?: number;
  /** CSS properties at this keyframe */
  styles: CssProperties;
  /** Easing between this and next keyframe */
  easing?: string;
}

export interface CssProperties {
  [property: string]: string | number;
}

export interface KeyframeAnimation {
  /** Unique name for the animation */
  name: string;
  /** Array of keyframe definitions */
  keyframes: KeyframeDefinition[];
  /** Total duration in ms */
  duration: number;
  /** Timing function (default: "ease") */
  timingFunction?: string;
  /** Iteration count (default: 1, "infinite" for loop) */
  iterationCount?: number | "infinite";
  /** Fill mode: "none", "forwards", "backwards", "both" */
  fillMode?: string;
  /** Direction: "normal", "reverse", "alternate", "alternate-reverse" */
  direction?: string;
  /** Delay before start in ms */
  delay?: number;
  /** Play state: "running" or "paused" */
  playState?: "running" | "paused";
}

export interface KeyframeSequence {
  animations: KeyframeAnimation[];
  /** How to play multiple animations: "sequence" | "parallel" | "stagger" */
  mode?: "sequence" | "parallel" | "stagger";
  /** Stagger delay between items in stagger mode (ms) */
  staggerDelay?: number;
}

// --- Keyframe Builder ---

/** Create a new keyframe animation builder */
export function createKeyframe(name: string): KeyframeBuilder {
  return new KeyframeBuilder(name);
}

class KeyframeBuilder {
  private _animation: Partial<KeyframeAnimation> = { name, keyframes: [] };

  /** Add a keyframe to the animation */
  add(offset: number, styles: CssProperties, easing?: string): this {
    this._animation.keyframes!.push({ offset, styles, easing });
    return this;
  }

  /** Add a 'from' keyframe (offset = 0) */
  from(styles: CssProperties): this { to(styles: CssProperties, easing?: string): this } {
    return {
      to: (toStyles: CssProperties, easing?: string) => {
        this._animation.keyframes!.push({ offset: 0, styles });
        this._animation.keyframes!.push({ offset: 1, styles: toStyles, easing });
        return this;
      },
    };
  }

  /** Set duration */
  duration(ms: number): this { this: KeyframeBuilder; build: () => KeyframeAnimation } {
    this._animation.duration = ms;
    const self = this;
    return {
      get this() { return self; },
      build: () => self.build(),
    };
  }

  /** Set timing function */
  ease(fn: string): this {
    this._animation.timingFunction = fn;
    return this;
  }

  /** Set iteration count */
  iterations(n: number | "infinite"): this {
    this._animation.iterationCount = n;
    return this;
  }

  /** Set fill mode */
  fill(mode: string): this {
    this._animation.fillMode = mode;
    return this;
  }

  /** Set direction */
  dir(direction: string): this {
    this._animation.direction = direction;
    return this;
  }

  /** Set delay */
  delay(ms: number): this {
    this._animation.delay = ms;
    return this;
  }

  /** Build the final animation object */
  build(): KeyframeAnimation {
    return {
      name: this._animation.name!,
      keyframes: this._animation.keyframes!,
      duration: this._animation.duration ?? 300,
      timingFunction: this._animation.timingFunction ?? "ease",
      iterationCount: this._animation.iterationCount ?? 1,
      fillMode: this._animation.fillMode ?? "forwards",
      direction: this._animation.direction ?? "normal",
      delay: this._animation.delay,
    };
  }
}

// --- CSS Injection ---

/** Inject a @keyframes rule into the document stylesheet */
export function injectKeyframes(animation: KeyframeAnimation): HTMLStyleElement {
  const css = generateKeyframesCSS(animation);
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

/** Generate the CSS text for a @keyframes rule */
export function generateKeyframesCSS(animation: KeyframeAnimation): string {
  const rules = animation.keyframes
    .map((kf) => {
      const props = Object.entries(kf.styles)
        .map(([prop, val]) => `  ${camelToKebab(prop)}: ${val}`)
        .join(";\n");
      const offsetStr = kf.offset !== undefined ? `${(kf.offset * 100).toFixed(1)}%` : "";
      const easingStr = kf.easing ? ` /* ${kf.easing} */` : "";
      return `${offsetStr} {\n${props}\n  }${easingStr}`;
    })
    .join("\n\n");

  return `@keyframes ${animation.name} {\n${rules}\n}`;
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** Remove an injected keyframes style element */
export function removeKeyframes(styleEl: HTMLStyleElement): void {
  styleEl.remove();
}

// --- Apply Animation ---

/** Apply a keyframe animation to an element via CSS animation property */
export function applyAnimation(element: HTMLElement, animation: KeyframeAnimation): () => void {
  // Inject if not already present
  let styleEl: HTMLStyleElement | null = null;
  if (!document.querySelector(`style[data-kf-name="${animation.name}"]`)) {
    styleEl = injectKeyframes(animation);
    styleEl.setAttribute("data-kf-name", animation.name);
  }

  // Build animation shorthand
  const parts: string[] = [
    animation.name,
    `${animation.duration}ms`,
    animation.timingFunction ?? "ease",
    String(animation.iterationCount ?? 1),
    animation.direction ?? "normal",
    animation.fillMode ?? "forwards",
  ];
  if (animation.delay) parts.push(`${animation.delay}ms`);

  element.style.animation = parts.join(" ");
  element.style.playState = animation.playState ?? "running";

  // Return cleanup function
  return () => {
    element.style.animation = "";
    if (styleEl) removeKeyframes(styleEl);
  };
}

/** Apply animation using WAAPI (returns Animation object for control) */
export function animateWAAPI(
  element: HTMLElement,
  animation: KeyframeAnimation,
): Animation {
  const kfOptions: Keyframe[] = animation.keyframes.map((kf) => ({
    ...kf.styles,
    offset: kf.offset,
    easing: kf.easing,
  }));

  return element.animate(kfOptions, {
    duration: animation.duration,
    easing: animation.timingFunction ?? "ease",
    iterations: animation.iterationCount ?? 1,
    fill: animation.fillMode as FillMode ?? "forwards",
    direction: animation.direction as PlaybackDirection ?? "normal",
    delay: animation.delay ?? 0,
  });
}

// --- Sequences ---

/** Play a sequence of animations on one or more elements */
export function playSequence(
  elements: HTMLElement | HTMLElement[],
  sequence: KeyframeSequence,
): { cancel: () => void; finished: Promise<void> } {
  const elArray = Array.isArray(elements) ? elements : [elements];
  const cleanups: (() => void)[] = [];
  const animations: Animation[] = [];

  switch (sequence.mode ?? "sequence") {
    case "parallel": {
      for (const anim of sequence.animations) {
        for (const el of elArray) {
          const waapiAnim = animateWAAPI(el, anim);
          animations.push(waapiAnim);
        }
      }
      break;
    }
    case "stagger": {
      const delay = sequence.staggerDelay ?? 100;
      for (let i = 0; i < elArray.length; i++) {
        for (const anim of sequence.animations) {
          const staggered = { ...anim, delay: (anim.delay ?? 0) + i * delay };
          const waapiAnim = animateWAAPI(elArray[i]!, staggered);
          animations.push(waapiAnim);
        }
      }
      break;
    }
    case "sequence":
    default: {
      let cumulativeDelay = 0;
      for (const anim of sequence.animations) {
        const delayed = { ...anim, delay: (anim.delay ?? 0) + cumulativeDelay };
        for (const el of elArray) {
          const waapiAnim = animateWAAPI(el, delayed);
          animations.push(waapiAnim);
        }
        cumulativeDelay += anim.duration + (anim.delay ?? 0);
      }
      break;
  }

  return {
    cancel: () => animations.forEach((a) => a.cancel()),
    finished: Promise.all(animations.map((a) => a.finished)).then(() => {}),
  };
}

// --- Interpolation ---

/** Interpolate between two sets of CSS properties at a given progress (0-1) */
export function interpolateKeyframes(
  from: CssProperties,
  to: CssProperties,
  progress: number,
  easingFn?: (t: number) => number,
): CssProperties {
  const t = easingFn ? easingFn(progress) : progress;
  const result: CssProperties = {};
  const allKeys = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const key of allKeys) {
    const fromVal = from[key];
    const toVal = to[key];

    if (fromVal === undefined) result[key] = toVal!;
    else if (toVal === undefined) result[key] = fromVal;
    else if (typeof fromVal === "number" && typeof toVal === "number") {
      result[key] = fromVal + (toVal - fromVal) * t;
    } else if (typeof fromVal === "string" && typeof toVal === "string") {
      // Try numeric interpolation for strings that look like values with units
      const fromNum = parseFloat(fromVal);
      const toNum = parseFloat(toVal);
      if (!isNaN(fromNum) && !isNaN(toNum)) {
        const unit = fromVal.slice(String(fromNum).length);
        result[key] = String(fromNum + (toNum - fromNum) * t) + unit;
      } else {
        result[key] = t < 0.5 ? fromVal : toVal;
      }
    } else {
      result[key] = t < 0.5 ? fromVal : toVal;
    }
  }

  return result;
}

// --- Presets ---

/** Common animation preset definitions */
export const keyframePresets = {
  fadeIn: createKeyframe("fadeIn")
    .from({ opacity: 0 }).to({ opacity: 1 })
    .duration(300).build(),

  fadeOut: createKeyframe("fadeOut")
    .from({ opacity: 1 }).to({ opacity: 0 })
    .duration(300).build(),

  slideUp: createKeyframe("slideUp")
    .add(0, { transform: "translateY(20px)", opacity: 0 })
    .add(1, { transform: "translateY(0)", opacity: 1 })
    .duration(300).build(),

  slideDown: createKeyframe("slideDown")
    .add(0, { transform: "translateY(-20px)", opacity: 0 })
    .add(1, { transform: "translateY(0)", opacity: 1 })
    .duration(300).build()

  ,
  slideLeft: createKeyframe("slideLeft")
    .add(0, { transform: "translateX(20px)", opacity: 0 })
    .add(1, { transform: "translateX(0)", opacity: 1 })
    .duration(300).build(),

  slideRight: createKeyframe("slideRight")
    .add(0, { transform: "translateX(-20px)", opacity: 0 })
    .add(1, { transform: "translateX(0)", opacity: 1 })
    .duration(300).build(),

  scaleIn: createKeyframe("scaleIn")
    .add(0, { transform: "scale(0.9)", opacity: 0 })
    .add(1, { transform: "scale(1)", opacity: 1 })
    .duration(200).build(),

  bounce: createKeyframe("bounce")
    .add(0, { transform: "translateY(0)" })
    .add(0.2, { transform: "translateY(-10px)" })
    .add(0.4, { transform: "translateY(0)" }, "ease-in-out")
    .add(0.6, { transform: "translateY(-6px)" })
    .add(0.8, { transform: "translateY(0)" }, "ease-in-out")
    .add(1, { transform: "translateY(-2px)" })
    .add(1, { transform: "translateY(0)" })
    .duration(600).iterations(1).build(),

  shake: createKeyframe("shake")
    .add(0, { transform: "translateX(0)" })
    .add(0.15, { transform: "translateX(-6px)" })
    .add(0.3, { transform: "translateX(6px)" })
    .add(0.45, { transform: "translateX(-4px)" })
    .add(0.6, { transform: "translateX(4px)" })
    .add(0.75, { transform: "translateX(-2px)" })
    .add(0.9, { transform: "translateX(2px)" })
    .add(1, { transform: "translateX(0)" })
    .duration(500).build(),

  pulse: createKeyframe("pulse")
    .add(0, { transform: "scale(1)" })
    .add(0.5, { transform: "scale(1.05)" })
    .add(1, { transform: "scale(1)" })
    .duration(600).iterations("infinite").build(),

  spin: createKeyframe("spin")
    .from({ transform: "rotate(0deg)" }).to({ transform: "rotate(360deg)" })
    .duration(1000).iterations("infinite").ease("linear").build(),

  ping: createKeyframe("ping")
    .add(0, { transform: "scale(1)", opacity: "1" })
    .add(0.75, { transform: "scale(1.5)", opacity: "0" })
    .duration(1000).iterations("infinite").build(),
} as const;

export type PresetName = keyof typeof keyframePresets;

/** Quick-apply a preset animation to an element */
export function playPreset(
  element: HTMLElement,
  preset: PresetName,
  options?: Partial<Pick<KeyframeAnimation, "duration" | "delay" | "iterationCount">>,
): () => void {
  const base = keyframePresets[preset];
  const merged: KeyframeAnimation = { ...base, ...options };
  return applyAnimation(element, merged);
}
