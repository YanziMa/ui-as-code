/**
 * Scroll Progress Bar: Reading progress indicator at the top (or bottom/side)
 * of the page with smooth animation, color variants, custom target element,
 * scroll direction detection, and callback on milestones.
 */

// --- Types ---

export type ProgressBarPosition = "top" | "bottom" | "left" | "right";
export type ProgressBarVariant = "default" | "gradient" | "rainbow" | "thin";

export interface ScrollProgressOptions {
  /** Target element to track scrolling on (default: document body) */
  target?: HTMLElement | string;
  /** Bar position */
  position?: ProgressBarPosition;
  /** Visual variant */
  variant?: ProgressBarVariant;
  /** Height/thickness in px */
  height?: number;
  /** Color or gradient CSS value */
  color?: string;
  /** Z-index */
  zIndex?: number;
  /** Show percentage text? */
  showPercentage?: boolean;
  /** Easing function: "linear" | "ease" | "ease-in-out" */
  easing?: string;
  /** Container to append bar into (default: document.body) */
  container?: HTMLElement;
  /** Callback on progress change (0-1) */
  onProgress?: (progress: number) => void;
  /** Callback when user reaches specific milestones (e.g., [0.25, 0.5, 0.75, 1.0]) */
  onMilestone?: (milestone: number) => void;
  /** Milestone thresholds (0-1) */
  milestones?: number[];
  /** Custom CSS class */
  className?: string;
}

export interface ScrollProgressInstance {
  element: HTMLElement;
  getProgress: () => number;
  setColor: (color: string) => void;
  setHeight: (height: number) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createScrollProgress(options: ScrollProgressOptions = {}): ScrollProgressInstance {
  const opts = {
    position: options.position ?? "top",
    variant: options.variant ?? "default",
    height: options.height ?? 3,
    zIndex: options.zIndex ?? 9999,
    showPercentage: options.showPercentage ?? false,
    easing: options.easing ?? "linear",
    container: options.container ?? document.body,
    className: options.className ?? "",
    milestones: options.milestones ?? [],
    ...options,
  };

  // Resolve target
  let targetEl: HTMLElement | null = null;
  if (options.target) {
    targetEl = typeof options.target === "string"
      ? document.querySelector<HTMLElement>(options.target)
      : options.target;
  }

  // Create bar element
  const bar = document.createElement("div");
  bar.className = `scroll-progress sp-${opts.position} sp-${opts.variant} ${opts.className}`;

  const isHorizontal = opts.position === "top" || opts.position === "bottom";

  bar.style.cssText = `
    position:${opts.container === document.body ? "fixed" : "absolute"};
    ${isHorizontal
      ? `${opts.position}:0;left:0;height:${opts.height}px;`
      : `${opts.position}:0;top:0;width:${opts.height}px;height:100%;`}
    z-index:${opts.zIndex};
    ${isHorizontal ? "width:100%;" : ""}
    pointer-events:none;overflow:hidden;
    transition: none;
  `;

  // Inner fill
  const fill = document.createElement("div");
  fill.className = "sp-fill";
  fill.style.cssText = `
    ${isHorizontal
      ? `height:100%;width:0%;${getFillStyle(opts)}`
      : `width:100%;height:0%;${getFillStyleVertical(opts)}`}
    transition: width 50ms linear, height 50ms linear;
  `;
  bar.appendChild(fill);

  // Percentage label
  let labelEl: HTMLSpanElement | null = null;
  if (opts.showPercentage) {
    labelEl = document.createElement("span");
    labelEl.className = "sp-label";
    labelEl.style.cssText = `
      position:absolute;${isHorizontal ? "right:8px;top:50%;transform:translateY(-50%);" : "bottom:8px;left:50%;transform:translateX(-50%);"}
      font-size:10px;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);
      pointer-events:none;opacity:0;transition:opacity 0.2s;
      white-space:nowrap;
    `;
    bar.appendChild(labelEl);
  }

  opts.container.appendChild(bar);

  // State
  let lastMilestone = -1;
  let destroyed = false;
  let rafId: number | null = null;

  function getFillStyle(o: typeof opts): string {
    switch (o.variant) {
      case "gradient":
        return `background:linear-gradient(90deg,#4338ca,#818cf8);border-radius:0 ${o.height / 2}px ${o.height / 2}px 0;`;
      case "rainbow":
        return `background:linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6);background-size:200% 100%;animation:sp-rainbow 3s linear infinite;border-radius:0 ${o.height / 2}px ${o.height / 2}px 0;`;
      case "thin":
        return `background:${o.color ?? "#4338ca"};`;
      default:
        return `background:${o.color ?? "#4338ca"};border-radius:0 ${o.height / 2}px ${o.height / 2}px 0;`;
    }
  }

  function getFillStyleVertical(o: typeof opts): string {
    switch (o.variant) {
      case "gradient":
        return `background:linear-gradient(180deg,#4338ca,#818cf8);border-radius:${o.height / 2}px ${o.height / 2}px 0 0;`;
      case "rainbow":
        return `background:linear-gradient(180deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6);background-size:100% 200%;animation:sp-rainbow-v 3s linear infinite;border-radius:${o.height / 2}px ${o.height / 2}px 0 0;`;
      default:
        return `background:${o.color ?? "#4338ca"};border-radius:${o.height / 2}px ${o.height / 2}px 0 0;`;
    }
  }

  function calculateProgress(): number {
    const el = targetEl || document.documentElement;
    if (!el) return 0;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = el.scrollHeight - (targetEl ? el.clientHeight : window.innerHeight);
    if (scrollHeight <= 0) return 0;

    return Math.min(1, Math.max(0, scrollTop / scrollHeight));
  }

  function update(): void {
    if (destroyed) return;
    const progress = calculateProgress();
    const pct = Math.round(progress * 100);

    if (isHorizontal) {
      fill.style.width = `${pct}%`;
    } else {
      fill.style.height = `${pct}%`;
    }

    if (labelEl) {
      labelEl.textContent = `${pct}%`;
      labelEl.style.opacity = pct > 5 && pct < 98 ? "1" : "0";
    }

    opts.onProgress?.(progress);

    // Check milestones
    for (const ms of opts.milestones) {
      if (progress >= ms && ms > lastMilestone) {
        lastMilestone = ms;
        opts.onMilestone?.(ms);
      }
    }
  }

  // Use rAF for smooth updates
  function onScroll(): void {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  // Inject rainbow animation
  if ((opts.variant === "rainbow") && !document.getElementById("sp-styles")) {
    const style = document.createElement("style");
    style.id = "sp-styles";
    style.textContent = `
      @keyframes sp-rainbow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      @keyframes sp-rainbow-v { 0% { background-position: 50% 0%; } 50% { background-position: 50% 100%; } 100% { background-position: 50% 0%; } }
    `;
    document.head.appendChild(style);
  }

  // Initial update
  update();

  return {
    element: bar,

    getProgress() { return calculateProgress(); },

    setColor(color: string) {
      if (opts.variant === "default" || opts.variant === "thin") {
        fill.style.background = color;
      } else {
        // For gradient/rainbow, override
        fill.style.background = color;
        fill.style.animation = "none";
      }
    },

    setHeight(height: number) {
      opts.height = height;
      if (isHorizontal) {
        bar.style.height = `${height}px`;
        fill.style.borderRadius = `0 ${height / 2}px ${height / 2}px 0`;
      } else {
        bar.style.width = `${height}px`;
        fill.style.borderRadius = `${height / 2}px ${height / 2}px 0 0`;
      }
    },

    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      bar.remove();
    },
  };
}
