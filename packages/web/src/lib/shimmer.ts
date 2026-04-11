/**
 * Shimmer Effect: Low-level shimmer animation utility for any DOM element.
 * Supports directional gradients, custom easing curves, wave patterns,
 * mask-based clipping, per-element control, and CSS variable integration.
 */

// --- Types ---

export type ShimmerDirection = "left" | "right" | "top" | "bottom" | "diagonal-tl-br" | "diagonal-tr-bl";
export type ShimmerEasing = "linear" | "ease-in" | "ease-out" | "ease-in-out" | "cubic-bezier";

export interface ShimmerOptions {
  /** Target element(s) */
  target: HTMLElement | HTMLElement[] | string;
  /** Direction of shimmer sweep */
  direction?: ShimmerDirection;
  /** Base color (default: #f0f0f0) */
  baseColor?: string;
  /** Highlight/peak color (default: #e8e8e8) */
  highlightColor?: string;
  /** Animation duration in ms (default: 1500) */
  duration?: number;
  /** Easing function */
  easing?: ShimmerEasing;
  /** Custom cubic-bezier values (when easing="cubic-bezier") */
  cubicBezier?: string;
  /** Number of gradient stops for smoother effect */
  gradientStops?: number;
  /** Width of the highlight band (0-1, default: 0.5) */
  highlightWidth?: number;
  /** Delay before starting (ms) */
  delay?: number;
  /** Loop infinitely? (default: true) */
  infinite?: boolean;
  /** Pause on hover? */
  pauseOnHover?: boolean;
  /** Apply to children recursively? */
  recursive?: boolean;
  /** Selector filter for which children get shimmer (when recursive=true) */
  childSelector?: string;
  /** Custom CSS class added to shimmering elements */
  className?: string;
  /** Use CSS custom properties instead of inline styles */
  useCSSVars?: boolean;
  /** Callback when animation starts */
  onStart?: () => void;
  /** Callback when animation ends (single iteration) */
  onIteration?: () => void;
}

export interface ShimmerInstance {
  /** Start the shimmer animation */
  start: () => void;
  /** Stop and clean up */
  stop: () => void;
  /** Pause the animation */
  pause: () => void;
  /** Resume after pause */
  resume: () => void;
  /** Check if running */
  isRunning: () => boolean;
  /** Update options dynamically */
  update: (options: Partial<ShimmerOptions>) => void;
  /** Get all managed elements */
  getElements: () => HTMLElement[];
  /** Destroy completely */
  destroy: () => void;
}

// --- Style Injection ---

let shimmerKeyframesId = 0;

function generateKeyframes(
  id: number,
  direction: ShimmerDirection,
): { name: string; css: string } {
  const name = `shimmer-sweep-${id}`;

  // Calculate background-position keyframes based on direction
  let fromPos: string;
  let toPos: string;

  switch (direction) {
    case "left":
    case "right":
      fromPos = "-200% 0";
      toPos = "200% 0";
      break;
    case "top":
    case "bottom":
      fromPos = "0 -200%";
      toPos = "0 200%";
      break;
    case "diagonal-tl-br":
      fromPos = "-200% -200%";
      toPos = "200% 200%";
      break;
    case "diagonal-tr-bl":
      fromPos = "200% -200%";
      toPos = "-200% 200%";
      break;
  }

  const css = `
    @keyframes ${name} {
      0% { background-position: ${fromPos}; }
      100% { background-position: ${toPos}; }
    }
  `;

  return { name, css };
}

function buildGradient(
  baseColor: string,
  highlightColor: string,
  direction: ShimmerDirection,
  stops: number,
  highlightWidth: number,
): string {
  const angle = getGradientAngle(direction);
  const step = 100 / (stops - 1);
  const hw = highlightWidth * 50; // half-width percentage

  const parts: string[] = [];
  for (let i = 0; i < stops; i++) {
    const pos = i * step;
    // Create a bell-curve-like intensity around the center
    const distFromCenter = Math.abs(pos - 50) / 50; // 0 at center, 1 at edges
    const intensity = Math.max(0, 1 - distFromCenter / hw);

    if (intensity > 0.95) {
      parts.push(`${highlightColor} ${pos}%`);
    } else if (intensity > 0.05) {
      // Interpolate
      parts.push(`${interpolateColor(baseColor, highlightColor, intensity)} ${pos}%`);
    } else {
      parts.push(`${baseColor} ${pos}%`);
    }
  }

  return `linear-gradient(${angle}, ${parts.join(", ")})`;
}

function getGradientAngle(dir: ShimmerDirection): string {
  switch (dir) {
    case "right": return "90deg";
    case "left": return "270deg";
    case "bottom": return "180deg";
    case "top": return "0deg";
    case "diagonal-tl-br": return "45deg";
    case "diagonal-tr-bl": return "135deg";
  }
}

/** Simple hex color interpolation */
function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// --- Main Factory ---

export function createShimmer(options: ShimmerOptions): ShimmerInstance {
  const opts = {
    direction: options.direction ?? "right",
    baseColor: options.baseColor ?? "#f0f0f0",
    highlightColor: options.highlightColor ?? "#e8e8e8",
    duration: options.duration ?? 1500,
    easing: options.easing ?? "ease-in-out",
    cubicBezier: options.cubicBezier ?? "0.4, 0, 0.2, 1",
    gradientStops: options.gradientStops ?? 7,
    highlightWidth: options.highlightWidth ?? 0.5,
    delay: options.delay ?? 0,
    infinite: options.infinite ?? true,
    pauseOnHover: options.pauseOnHover ?? false,
    recursive: options.recursive ?? false,
    childSelector: options.childSelector ?? "*",
    className: options.className ?? "",
    useCSSVars: options.useCSSVars ?? false,
    ...options,
  };

  // Resolve target elements
  function resolveTargets(): HTMLElement[] {
    const raw = opts.target;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      return Array.from(document.querySelectorAll<HTMLElement>(raw));
    }
    return [raw];
  }

  let elements: HTMLElement[] = [];
  let running = false;
  let paused = false;
  let destroyed = false;
  let styleEl: HTMLStyleElement | null = null;
  let keyframeName = "";
  let hoverListeners: Array<{ el: HTMLElement; handler: () => void }> = [];

  function resolveElements(): void {
    elements = resolveTargets();

    if (opts.recursive && elements.length > 0) {
      const allChildren: HTMLElement[] = [];
      for (const root of elements) {
        const children = Array.from(root.querySelectorAll<HTMLElement>(opts.childSelector));
        allChildren.push(...children);
      }
      elements = [...elements, ...allChildren];
    }
  }

  function applyShimmer(el: HTMLElement): void {
    const gradient = buildGradient(
      opts.baseColor,
      opts.highlightColor,
      opts.direction,
      opts.gradientStops,
      opts.highlightWidth,
    );

    const timingFn = opts.easing === "cubic-bezier"
      ? `cubic-bezier(${opts.cubicBezier})`
      : opts.easing;

    if (opts.useCSSVars) {
      el.style.setProperty("--shimmer-gradient", gradient);
      el.style.setProperty("--shimmer-duration", `${opts.duration}ms`);
      el.style.setProperty("--shimmer-name", keyframeName);
      el.style.cssText += `
        background-image:var(--shimmer-gradient);
        background-size:200% 100%;
        animation:var(--shimmer-name) var(--shimmer-duration) ${timingFn} ${opts.infinite ? "infinite" : ""};
      `;
    } else {
      el.style.backgroundImage = gradient;
      el.style.backgroundSize = "200% 100%";
      el.style.animation = `${keyframeName} ${opts.duration}ms ${timingFn} ${opts.infinite ? "infinite" : ""}`;
    }

    if (opts.className) {
      el.classList.add(opts.className);
    }

    // Store original styles for cleanup
    if (!(el as Record<string, unknown>).__shimmerOriginal) {
      (el as Record<string, unknown>).__shimmerOriginal = {
        backgroundImage: el.style.backgroundImage,
        backgroundSize: el.style.backgroundSize,
        animation: el.style.animation,
      };
    }
  }

  function removeShimmer(el: HTMLElement): void {
    const orig = (el as Record<string, unknown>).__shimmerOriginal as Record<string, string> | undefined;
    if (orig) {
      el.style.backgroundImage = orig.backgroundImage || "";
      el.style.backgroundSize = orig.backgroundSize || "";
      el.style.animation = orig.animation || "";
      delete (el as Record<string, unknown>).__shimmerOriginal;
    } else {
      el.style.backgroundImage = "";
      el.style.backgroundSize = "";
      el.style.animation = "";
    }

    if (opts.className) {
      el.classList.remove(opts.className);
    }

    if (opts.useCSSVars) {
      el.style.removeProperty("--shimmer-gradient");
      el.style.removeProperty("--shimmer-duration");
      el.style.removeProperty("--shimmer-name");
    }
  }

  function setupPauseOnHover(): void {
    teardownPauseOnHover();
    if (!opts.pauseOnHover) return;

    for (const el of elements) {
      const enterHandler = (): void => {
        if (running && !paused) {
          paused = true;
          el.style.animationPlayState = "paused";
        }
      };

      const leaveHandler = (): void => {
        if (running && paused) {
          paused = false;
          el.style.animationPlayState = "running";
        }
      };

      el.addEventListener("mouseenter", enterHandler);
      el.addEventListener("mouseleave", leaveHandler);
      hoverListeners.push({ el, handler: leaveHandler });
      // Store enter handler too for cleanup
      (leaveHandler as Record<string, unknown>).__enterHandler = enterHandler;
    }
  }

  function teardownPauseOnHover(): void {
    for (const { el, handler } of hoverListeners) {
      const enterHandler = (handler as Record<string, unknown>).__enterHandler as (() => void) | undefined;
      if (enterHandler) el.removeEventListener("mouseenter", enterHandler);
      el.removeEventListener("mouseleave", handler);
    }
    hoverListeners = [];
  }

  function injectKeyframes(): void {
    // Remove old style if updating
    if (styleEl) {
      styleEl.remove();
    }

    shimmerKeyframesId++;
    const kf = generateKeyframes(shimmerKeyframesId, opts.direction);
    keyframeName = kf.name;

    styleEl = document.createElement("style");
    styleEl.setAttribute("data-shimmer-id", String(shimmerKeyframesId));
    styleEl.textContent = kf.css;
    document.head.appendChild(styleEl);
  }

  function start(): void {
    if (destroyed || running) return;

    resolveElements();
    injectKeyframes();

    // Apply delay
    const startDelay = setTimeout(() => {
      if (destroyed) return;

      for (const el of elements) {
        applyShimmer(el);
      }

      setupPauseOnHover();
      running = true;
      opts.onStart?.();

      // Listen for single iteration end
      if (!opts.infinite && elements.length > 0) {
        const firstEl = elements[0]!;
        firstEl.addEventListener("animationend", function handler() {
          firstEl.removeEventListener("animationend", handler);
          if (!destroyed) {
            opts.onIteration?.();
            running = false;
          }
        });
      }
    }, opts.delay);

    (instance as Record<string, unknown>).__startTimer = startDelay;
  }

  function stop(): void {
    const timer = (instance as Record<string, unknown>).__startTimer as ReturnType<typeof setTimeout> | undefined;
    if (timer) clearTimeout(timer);

    for (const el of elements) {
      removeShimmer(el);
    }

    teardownPauseOnHover();
    running = false;
    paused = false;

    if (styleEl) {
      styleEl.remove();
      styleEl = null;
    }
  }

  const instance: ShimmerInstance = {
    start,

    stop,

    pause() {
      if (!running || paused) return;
      paused = true;
      for (const el of elements) {
        el.style.animationPlayState = "paused";
      }
    },

    resume() {
      if (!running || !paused) return;
      paused = false;
      for (const el of elements) {
        el.style.animationPlayState = "running";
      }
    },

    isRunning: () => running,

    update(newOpts: Partial<ShimmerOptions>) {
      Object.assign(opts, newOpts);
      if (running) {
        stop();
        start();
      }
    },

    getElements: () => [...elements],

    destroy() {
      destroyed = true;
      stop();
      elements = [];
    },
  };

  return instance;
}
