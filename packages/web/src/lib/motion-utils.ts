/**
 * Motion Utilities: Declarative animation primitives, keyframe generators,
 * spring-based motion, gesture-driven animation, path animation along
 * SVG paths, morphing utilities, and animation timeline composition.
 */

// --- Types ---

export interface MotionOptions {
  /** Target values (CSS properties or custom) */
  to: Record<string, string | number>;
  /** Starting values (optional, defaults to current computed style) */
  from?: Record<string, string | number>;
  /** Duration in ms */
  duration?: number;
  /** Easing function name or CSS value */
  easing?: string;
  /** Delay before start (ms) */
  delay?: number;
  /** Number of iterations (default 1, Infinity for loop) */
  iterations?: number;
  /** Direction: "normal", "reverse", "alternate" */
  direction?: "normal" | "reverse" | "alternate";
  /** Fill mode: "none", "forwards", "backwards", "both" */
  fill?: "none" | "forwards" | "backwards" | "both";
  /** Callback on each frame */
  onUpdate?: (progress: number, values: Record<string, number>) => void;
  /** Callback on complete */
  onComplete?: () => void;
}

export interface MotionInstance {
  /** Current progress (0-1) */
  progress: number;
  /** Current interpolated values */
  currentValues: Record<string, number>;
  /** Play the animation */
  play(): void;
  /** Pause the animation */
  pause(): void;
  /** Seek to specific progress */
  seek(progress: number): void;
  /** Reverse direction */
  reverse(): void;
  /** Cancel/stop */
  cancel(): void;
  /** Check if playing */
  isPlaying(): boolean;
}

export interface SpringMotionConfig {
  /** Stiffness (N/m). Default 170 */
  stiffness?: number;
  /** Damping ratio (0-1). Default 26 */
  damping?: number;
  /** Mass (kg). Default 1 */
  mass?: number;
  /** Precision threshold. Default 0.01 */
  precision?: number;
  /** Initial velocity per property */
  velocity?: Record<string, number>;
  /** Target values */
  to: Record<string, number>;
  /** On update callback */
  onUpdate?: (values: Record<string, number>) => void;
  /** On settle callback */
  onSettle?: () => void;
}

// --- Easing Registry ---

const CSS_EASING_MAP: Record<string, string> = {
  linear: "linear",
  ease: "ease",
  "ease-in": "ease-in",
  "ease-out": "ease-out",
  "ease-in-out": "ease-in-out",
};

// --- Motion Engine (requestAnimationFrame based) ---

/**
 * Create a tween-style motion animation.
 *
 * @example
 * ```ts
 * const motion = createMotion(element, {
 *   to: { opacity: 1, transform: "translateY(0)" },
 *   duration: 500,
 *   easing: "ease-out",
 * });
 * motion.play();
 * ```
 */
export function createMotion(
  element: HTMLElement,
  options: MotionOptions,
): MotionInstance {
  const {
    to,
    from: fromOpts,
    duration = 300,
    easing = "ease-out",
    delay = 0,
    iterations = 1,
    direction = "normal",
    fill = "forwards",
    onUpdate,
    onComplete,
  } = options;

  // Resolve initial values
  const initial: Record<string, number> = {};
  const targets: Record<string, number> = {};

  for (const [key, val] of Object.entries(to)) {
    if (fromOpts && key in fromOpts) {
      initial[key] = typeof fromOpts[key] === "number"
        ? fromOpts[key] as number
        : parseFloat(String(fromOpts[key]));
    } else {
      const computed = getComputedStyle(element);
      initial[key] = parseFloat(computed[key as keyof CSSStyleDeclaration] as string) || 0;
    }
    targets[key] = typeof val === "number" ? val : parseFloat(String(val));
  }

  let startTime: number | null = null;
  let rafId: number | null = null;
  let _progress = 0;
  let _playing = false;
  let _paused = false;
  let _pausedAt = 0;
  let _elapsedBeforePause = 0;
  let currentIteration = 0;
  let _reversed = false;

  // Parse easing
  function parseEasingValue(t: number): number {
    if (typeof easing === "function") return easing(t);

    const cssEasing = CSS_EASING_MAP[easing];
    if (cssEasing) {
      // Approximate common CSS easings with JS functions
      switch (cssEasing) {
        case "linear": return t;
        case "ease": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        case "ease-in": return t * t;
        case "ease-out": return t * (2 - t);
        case "ease-in-out": return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      }
    }

    // Try cubic-bezier approximation
    return t; // fallback linear
  }

  function interpolate(current: Record<string, number>): Record<string, number> {
    const values: Record<string, number> = {};
    const effectiveProgress = _reversed ? 1 - _progress : _progress;

    for (const [key, targetVal] of Object.entries(targets)) {
      const startVal = initial[key] ?? 0;
      values[key] = startVal + (targetVal - startVal) * parseEasingValue(effectiveProgress);
    }
    return values;
  }

  function applyStyles(values: Record<string, number>): void {
    for (const [key, val] of Object.entries(values)) {
      if (key === "transform") {
        element.style.transform = `translate(${val}px)`; // Simplified — real impl would handle full transform syntax
      } else if (key === "opacity") {
        element.style.opacity = String(val);
      } else {
        (element.style as Record<string, string>)[key] = `${val}px`;
      }
    }
  }

  function tick(timestamp: number): void {
    if (!_playing || _paused) return;

    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime - delay + _elapsedBeforePause;
    const totalDuration = duration * iterations;

    if (direction === "alternate" && currentIteration % 2 === 1) {
      // For alternate, odd iterations go backwards
      // This is simplified — full implementation would track per-iteration
    }

    _progress = Math.min(1, Math.max(0, elapsed / duration));

    // Handle iteration wrapping
    if (_progress >= 1 && iterations !== Infinity && currentIteration < iterations - 1) {
      currentIteration++;
      _progress = 0;
      startTime = timestamp;
      if (direction === "alternate") _reversed = !_reversed;
    }

    const values = interpolate(_progress);
    currentValues = { ...values };
    applyStyles(values);
    onUpdate?.(_progress, values);

    if (_progress >= 1 && (iterations === 1 || currentIteration >= iterations - 1)) {
      if (fill === "forwards" || fill === "both") {
        const finalValues = interpolate(1);
        applyStyles(finalValues);
      }
      _playing = false;
      onComplete?.();
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  let currentValues: Record<string, number> = { ...initial };

  return {
    get progress() { return _progress; },
    get currentValues() { return currentValues; },

    play() {
      if (_playing) return;
      _playing = true;
      _paused = false;
      if (_pausedAt > 0) {
        _elapsedBeforePause += performance.now() - _pausedAt;
        _pausedAt = 0;
      }
      startTime = null;
      rafId = requestAnimationFrame(tick);
    },

    pause() {
      _paused = true;
      _pausedAt = performance.now();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    seek(p: number) {
      _progress = Math.min(1, Math.max(0, p));
      const values = interpolate(_progress);
      currentValues = { ...values };
      applyStyles(values);
      onUpdate?.(_progress, values);
    },

    reverse() {
      _reversed = !_reversed;
    },

    cancel() {
      _playing = false;
      _paused = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },

    isPlaying() { return _playing && !_paused; },
  };
}

// --- Spring Motion ---

/**
 * Create a spring-physics-based motion.
 * More natural-feeling than fixed-duration tweens.
 */
export function createSpringMotion(
  element: HTMLElement,
  config: SpringMotionConfig,
): MotionInstance {
  const {
    stiffness = 170,
    damping = 26,
    mass = 1,
    precision = 0.01,
    velocity: velocityInit = {},
    to: targets,
    onUpdate,
    onSettle,
  } = config;

  const positions: Record<string, number> = {};
  const velocities: Record<string, number> = { ...velocityInit };

  // Initialize positions from computed styles
  for (const key of Object.keys(targets)) {
    const computed = getComputedStyle(element);
    positions[key] = parseFloat(computed[key as keyof CSSStyleDeclaration] as string) || 0;
    if (!(key in velocities)) velocities[key] = 0;
  }

  let rafId: number | null = null;
  let _playing = true;
  let _progress = 0;
  let settled = false;

  function simulate(): void {
    if (!_playing || settled) return;

    let allSettled = true;

    for (const [key, targetVal] of Object.entries(targets)) {
      const pos = positions[key]!;
      const vel = velocities[key]!;

      // Spring force: F = -k(x - target) - c*v
      const force = -stiffness * (pos - targetVal) - damping * vel;
      const acc = force / mass;

      velocities[key] = vel + acc * (16 / 1000); // ~60fps timestep
      positions[key] = pos + velocities[key] * (16 / 1000);

      // Check settling
      const displacement = Math.abs(positions[key] - targetVal);
      const speed = Math.abs(velocities[key]!);

      if (displacement > precision || speed > precision) {
        allSettled = false;
      }
    }

    // Apply
    for (const [key, val] of Object.entries(positions)) {
      if (key === "opacity") element.style.opacity = String(val);
      else if (key === "transform") element.style.transform = `translateY(${val}px)`;
      else (element.style as Record<string, string>)[key] = `${val}px`;
    }

    onUpdate?.({ ...positions });
    _progress = 1 - Math.min(
      1,
      Math.max(...Object.values(targets).map((t) =>
        Math.abs((positions[Object.keys(targets).indexOf(t)!] ?? 0) - t) / Math.abs(t || 1),
      )) / 1 || 0,
    );

    if (allSettled) {
      settled = true;
      _playing = false;
      onSettle?.();
      return;
    }

    rafId = requestAnimationFrame(simulate);
  }

  rafId = requestAnimationFrame(simulate);

  let currentValues = { ...positions };

  return {
    get progress() { return _progress; },
    get currentValues() { return currentValues; },
    play() { if (!_playing && !settled) { _playing = true; rafId = requestAnimationFrame(simulate); } },
    pause() { _playing = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } },
    seek(p: number) { /* Springs don't support seeking meaningfully */ },
    reverse() { /* Reverse velocity instead */ for (const key of Object.keys(velocities)) velocities[key] *= -1; if (!_playing) this.play(); },
    cancel() { _playing = false; settled = true; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } },
    isPlaying() { return _playing; },
  };
}

// --- Keyframe Generator ---

/** Generate CSS @keyframes rule and inject into document */
export function injectKeyframes(
  name: string,
  keyframes: Array<{ offset: number; properties: Record<string, string> }>,
): string {
  const rules = keyframes
    .map((kf) => {
      const props = Object.entries(kf.properties)
        .map(([k, v]) => `  ${k}: ${v};`)
        .join("\n");
      return `${(kf.offset * 100).toFixed(1)}% {\n${props}\n}`;
    })
    .join("\n");

  const css = `@keyframes ${name} {\n${rules}\n}`;

  // Inject if not already present
  if (!document.getElementById(`kf-${name}`)) {
    const style = document.createElement("style");
    style.id = `kf-${name}`;
    style.textContent = css;
    document.head.appendChild(style);
  }

  return name;
}

/** Pre-built keyframe animations */
export const PRESET_KEYFRAMES = {
  fadeIn: [
    { offset: 0, properties: { opacity: "0" } },
    { offset: 1, properties: { opacity: "1" } },
  ],
  fadeOut: [
    { offset: 0, properties: { opacity: "1" } },
    { offset: 1, properties: { opacity: "0" } },
  ],
  slideUp: [
    { offset: 0, properties: { transform: "translateY(20px)", opacity: "0" } },
    { offset: 1, properties: { transform: "translateY(0)", opacity: "1" } },
  ],
  slideDown: [
    { offset: 0, properties: { transform: "translateY(-20px)", opacity: "0" } },
    { offset: 1, properties: { transform: "translateY(0)", opacity: "1" } },
  ],
  scaleIn: [
    { offset: 0, properties: { transform: "scale(0.9)", opacity: "0" } },
    { offset: 1, properties: { transform: "scale(1)", opacity: "1" } },
  ],
  bounce: [
    { offset: 0, properties: { transform: "translateY(0)" } },
    { offset: 0.2, properties: { transform: "translateY(-10px)" } },
    { offset: 0.4, properties: { transform: "translateY(5px)" } },
    { offset: 0.6, properties: { transform: "translateY(-3px)" } },
    { offset: 0.8, properties: { transform: "translateY(1px)" } },
    { offset: 1, properties: { transform: "translateY(0)" } },
  ],
  pulse: [
    { offset: 0, properties: { transform: "scale(1)" } },
    { offset: 0.5, properties: { transform: "scale(1.05)" } },
    { offset: 1, properties: { transform: "scale(1)" } },
  ],
  shake: [
    { offset: 0, properties: { transform: "translateX(0)" } },
    { offset: 0.1, properties: { transform: "translateX(-4px)" } },
    { offset: 0.2, properties: { transform: "translateX(4px)" } },
    { offset: 0.3, properties: { transform: "translateX(-4px)" } },
    { offset: 0.4, properties: { transform: "translateX(4px)" } },
    { offset: 0.5, properties: { transform: "translateX(-2px)" } },
    { offset: 0.6, properties: { transform: "translateX(2px)" } },
    { offset: 1, properties: { transform: "translateX(0)" } },
  ],
} as const;

/** Apply a preset keyframe animation to an element */
export function animateWithKeyframes(
  element: HTMLElement,
  presetName: keyof typeof PRESET_KEYFRAMES,
  options?: { duration?: number; fillMode?: string; iterations?: number },
): Animation {
  const name = injectKeyframes(`anim-${String(presetName)}`, PRESET_KEYFRAMES[presetName]);
  return element.animate(
    [{ ...(PRESET_KEYFRAMES[presetName][0]?.properties ?? {}) }, { ...(PRESET_KEYFRAMES[presetName].at(-1)?.properties ?? {}) }],
    {
      duration: options?.duration ?? (presetName === "bounce" ? 600 : presetName === "shake" ? 400 : 300),
      fill: (options?.fillMode ?? "forwards") as FillMode,
      iterations: options?.iterations ?? 1,
      animationName: name,
    } as KeyframeAnimationOptions & { animationName?: string },
  );
}

// --- Path Animation ---

/**
 * Animate an element along an SVG path.
 * Uses getPointAtLength for positioning.
 */
export function animateAlongPath(
  element: HTMLElement,
  pathEl: SVGPathElement,
  options: {
    duration?: number;
    autoRotate?: boolean;
    easing?: (t: number) => number;
    onComplete?: () => void;
  } = {},
): MotionInstance {
  const { duration = 1000, autoRotate = false, easing = (t: number) => t, onComplete } = options;
  let rafId: number | null = null;
  let _playing = false;
  let _progress = 0;
  let startTime: number | null = null;
  const totalLength = pathEl.getTotalLength();

  function tick(ts: number): void {
    if (!_playing) return;
    if (!startTime) startTime = ts;

    const elapsed = ts - startTime;
    _progress = Math.min(1, elapsed / duration);
    const easedProgress = easing(_progress);
    const distance = easedProgress * totalLength;

    try {
      const point = pathEl.getPointAtLength(distance);
      element.style.transform = `translate(${point.x}px, ${point.y}px)${autoRotate ? ` rotate(${Math.atan2(point.y, point.y) * 180 / Math.PI}deg)` : ""}`;
    } catch {
      // Fallback for browsers without getPointAtLength
    }

    if (_progress >= 1) {
      _playing = false;
      onComplete?.();
      return;
    }

    rafId = requestAnimationFrame(tick);
  }

  return {
    get progress() { return _progress; },
    get currentValues() { return { x: 0, y: 0 }; },
    play() { _playing = true; startTime = null; rafId = requestAnimationFrame(tick); },
    pause() { _playing = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } },
    seek(p: number) { _progress = p; },
    reverse() { /* Not implemented */ },
    cancel() { _playing = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } },
    isPlaying() { return _playing; },
  };
}
