/**
 * Shimmer Utilities: CSS shimmer animation effects, gradient shimmer
 * backgrounds, text/content shimmer masks, configurable speed/direction,
 * and shimmer overlay for any element.
 */

// --- Types ---

export type ShimmerDirection = "left" | "right" | "top" | "bottom" | "diagonal";
export type ShimmerSpeed = "slow" | "normal" | "fast";

export interface ShimmerOptions {
  /** Target element to apply shimmer to */
  target: HTMLElement;
  /** Animation direction */
  direction?: ShimmerDirection;
  /** Animation speed */
  speed?: ShimmerSpeed;
  /** Base color (shimmer background) */
  baseColor?: string;
  /** Highlight color (shimmer sweep) */
  highlightColor?: string;
  /** Border radius */
  borderRadius?: string;
  /** Duration in ms (overrides speed) */
  duration?: number;
  /** Auto-start? Default true */
  autoStart?: boolean;
}

export interface ShimmerInstance {
  /** The shimmer overlay element */
  el: HTMLElement;
  /** Start the shimmer animation */
  start(): void;
  /** Stop the shimmer animation */
  stop(): void;
  /** Toggle on/off */
  toggle(): void;
  /** Check if running */
  isRunning(): boolean;
  /** Update options dynamically */
  update(options: Partial<ShimmerOptions>): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Speed Map ---

const SPEED_MAP: Record<ShimmerSpeed, number> = {
  "slow": 2500,
  "normal": 1500,
  "fast": 800,
};

// --- Core Factory ---

/**
 * Create a shimmer effect overlay on a target element.
 *
 * @example
 * ```ts
 * const shimmer = createShimmer({
 *   target: cardElement,
 *   direction: "diagonal",
 *   speed: "normal",
 * });
 * // Later: shimmer.stop();
 * ```
 */
export function createShimmer(options: ShimmerOptions): ShimmerInstance {
  const {
    target,
    direction = "right",
    speed = "normal",
    baseColor = "#f0f0f0",
    highlightColor = "#e0e0e0",
    borderRadius = "4px",
    duration,
    autoStart = true,
  } = options;

  let _running = false;

  // Create overlay
  const el = document.createElement("div");
  el.className = "shimmer-overlay";
  el.style.cssText =
    "position:absolute;inset:0;overflow:hidden;" +
    `border-radius:${borderRadius};` +
    "pointer-events:none;z-index:1;";

  // Shimmer gradient
  const gradient = document.createElement("div");
  gradient.className = "shimmer-gradient";
  gradient.style.cssText =
    "position:absolute;inset:-100%;width:200%;height:200%;" +
    getGradientStyle(direction, baseColor, highlightColor);

  // Set animation
  const animDuration = duration ?? SPEED_MAP[speed];
  gradient.style.animation = `shimmer-sweep ${animDuration}ms ease-in-out infinite`;
  gradient.style.animationPlayState = "paused";

  el.appendChild(gradient);

  // Ensure target has position
  if (getComputedStyle(target).position === "static") {
    target.style.position = "relative";
  }
  target.appendChild(el);

  // Inject keyframes if needed
  injectKeyframes();

  if (autoStart) start();

  // --- Methods ---

  function start(): void {
    _running = true;
    gradient.style.animationPlayState = "running";
  }

  function stop(): void {
    _running = false;
    gradient.style.animationPlayState = "paused";
  }

  function toggle(): void { _running ? stop() : start(); }

  function isRunning(): boolean { return _running; }

  function update(newOpts: Partial<ShimmerOptions>): void {
    if (newOpts.direction !== undefined) {
      gradient.style.cssText += ";" + getGradientStyle(
        newOpts.direction,
        newOpts.baseColor ?? baseColor,
        newOpts.highlightColor ?? highlightColor,
      );
    }
    if (newOpts.speed !== undefined || newOpts.duration !== undefined) {
      const d = newOpts.duration ?? SPEED_MAP[newOpts.speed ?? speed];
      gradient.style.animationDuration = `${d}ms`;
    }
    if (newOpts.baseColor || newOpts.highlightColor) {
      // Rebuild gradient with new colors
      const bc = newOpts.baseColor ?? baseColor;
      const hc = newOpts.highlightColor ?? highlightColor;
      gradient.style.cssText =
        "position:absolute;inset:-100%;width:200%;height:200%;" +
        getGradientStyle(direction, bc, hc);
      gradient.style.animationDuration = `${animDuration}ms`;
      gradient.style.animationPlayState = _running ? "running" : "paused";
    }
    if (newOpts.borderRadius !== undefined) {
      el.style.borderRadius = newOpts.borderRadius;
    }
  }

  function destroy(): void {
    stop();
    el.remove();
  }

  return { el, start, stop, toggle, isRunning, update, destroy };
}

/** Apply a one-shot shimmer effect that plays once and removes itself */
export function shimmerOnce(target: HTMLElement, options?: Partial<Omit<ShimmerOptions, "target" | "autoStart">>): Promise<void> {
  return new Promise((resolve) => {
    const instance = createShimmer({
      target,
      ...options,
      autoStart: true,
      duration: options?.duration ?? 1000,
    });

    setTimeout(() => {
      instance.destroy();
      resolve();
    }, options?.duration ?? 1000);
  });
}

/** Create a shimmer text mask (for placeholder text lines) */
export function createShimmerText(width: string = "100%", height: string = "14px", options?: Partial<ShimmerOptions>): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `width:${width};height:${height};overflow:hidden;border-radius:4px;position:relative;background:#f0f0f0;`;

  const shimmer = document.createElement("div");
  shimmer.className = "shimmer-text-gradient";
  shimmer.style.cssText =
    "position:absolute;inset:0;width:50%;background:linear-gradient(90deg,transparent,#e8e8e8,transparent);" +
    "animation:shimmer-text-slide 1.2s ease-in-out infinite;";
  wrapper.appendChild(shimmer);

  injectKeyframes();
  return wrapper;
}

// --- Internal ---

function getGradientStyle(dir: ShimmerDirection, base: string, highlight: string): string {
  switch (dir) {
    case "left":
    case "right":
      return `background:linear-gradient(90deg,${base} 0%,${highlight} 50%,${base} 100%);transform:translateX(-50%);`;
    case "top":
    case "bottom":
      return `background:linear-gradient(180deg,${base} 0%,${highlight} 50%,${base} 100%);transform:translateY(-50%);`;
    case "diagonal":
      return `background:linear-gradient(135deg,${base} 0%,${highlight} 40%,${base} 60%,${base} 100%);transform:translate(-30%,-30%);`;
    default:
      return `background:linear-gradient(90deg,${base} 0%,${highlight} 50%,${base} 100%);transform:translateX(-50%);`;
  }
}

function injectKeyframes(): void {
  if (document.getElementById("shimmer-keyframes")) return;

  const style = document.createElement("style");
  style.id = "shimmer-keyframes";
  style.textContent = `
    @keyframes shimmer-sweep {
      0% { transform: translateX(-50%) translateY(-50%); }
      100% { transform: translateX(50%) translateY(50%); }
    }
    @keyframes shimmer-text-slide {
      0% { left: -50%; }
      100% { left: 150%; }
    }
  `;
  document.head.appendChild(style);
}
