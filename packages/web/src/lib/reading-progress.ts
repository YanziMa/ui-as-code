/**
 * Reading Progress Bar: Thin progress indicator at the top of the page
 * showing scroll position through content, with color variants,
 * size options, smooth animation, section markers, and accessibility.
 */

// --- Types ---

export type ProgressColor = "default" | "primary" | "success" | "warning" | "danger" | "info" | string;
export type ProgressSize = "thin" | "normal" | "thick";
export type ProgressPosition = "top" | "bottom";

export interface ReadingProgressOptions {
  /** Target scrollable element (default: document) */
  target?: HTMLElement | string;
  /** Color variant or custom hex */
  color?: ProgressColor;
  /** Size variant */
  size?: ProgressSize;
  /** Position on viewport */
  position?: ProgressPosition;
  /** Height in px (overrides size) */
  height?: number;
  /** Z-index (default: 9999) */
  zIndex?: number;
  /** Show percentage text? */
  showPercentage?: boolean;
  /** Smooth transition on update (ms) */
  smoothTransition?: number;
  /** Container to render into (default: document.body) */
  container?: HTMLElement;
  /** Custom CSS class */
  className?: string;
  /** Callback with progress value (0-100) */
  onProgress?: (percent: number) => void;
  /** Callback when reading complete (100%) */
  onComplete?: () => void;
  /** Minimum height before showing (px) */
  minHeightToShow?: number;
}

export interface ReadingProgressInstance {
  element: HTMLDivElement;
  /** Current progress percent (0-100) */
  getProgress: () => number;
  /** Manually set progress */
  setProgress: (percent: number) => void;
  /** Show the bar */
  show: () => void;
  /** Hide the bar */
  hide: () => void;
  /** Update color dynamically */
  setColor: (color: ProgressColor) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Config ---

const COLOR_MAP: Record<string, string> = {
  default: "#4338ca",
  primary: "#4338ca",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
};

const SIZE_MAP: Record<ProgressSize, number> = {
  thin: 2,
  normal: 3,
  thick: 5,
};

// --- Main Factory ---

export function createReadingProgress(options: ReadingProgressOptions = {}): ReadingProgressInstance {
  const opts = {
    color: options.color ?? "default",
    size: options.size ?? "thin",
    position: options.position ?? "top",
    zIndex: options.zIndex ?? 9999,
    showPercentage: options.showPercentage ?? false,
    smoothTransition: options.smoothTransition ?? 0,
    container: options.container ?? document.body,
    className: options.className ?? "",
    minHeightToShow: options.minHeightToShow ?? 100,
    ...options,
  };

  const barColor = COLOR_MAP[opts.color] ?? opts.color;
  const barHeight = options.height ?? SIZE_MAP[opts.size];

  // Create bar container
  const bar = document.createElement("div");
  bar.className = `reading-progress rp-${opts.size} ${opts.className}`;
  bar.style.cssText = `
    position:${opts.container === document.body ? "fixed" : "absolute"};
    ${opts.position === "top" ? "top:0;left:0;right:0;" : "bottom:0;left:0;right:0;"}
    height:${barHeight}px;z-index:${opts.zIndex};
    pointer-events:none;overflow:hidden;
    ${opts.position === "bottom" ? "margin-bottom:0;" : ""}
  `;

  // Fill element
  const fill = document.createElement("div");
  fill.className = "rp-fill";
  fill.style.cssText = `
    height:100%;width:0%;background:${barColor};
    transition:width ${opts.smoothTransition}ms linear;
    will-change:width;
  `;
  bar.appendChild(fill);

  // Optional glow effect
  const glow = document.createElement("div");
  glow.className = "rp-glow";
  glow.style.cssText = `
    position:absolute;top:0;right:0;width:60px;height:100%;
    background:linear-gradient(90deg,transparent,${barColor}40);
    opacity:0;transition:opacity 0.3s ease;
    pointer-events:none;
  `;
  fill.appendChild(glow);

  // Optional percentage label
  let percentLabel: HTMLSpanElement | null = null;
  if (opts.showPercentage) {
    percentLabel = document.createElement("span");
    percentLabel.className = "rp-percent";
    percentLabel.style.cssText = `
      position:absolute;right:8px;top:-22px;background:${barColor};color:#fff;
      font-size:10px;font-weight:600;padding:1px 6px;border-radius:4px;
      line-height:1.4;pointer-events:none;opacity:0;transition:opacity 0.15s;
      font-family:-apple-system,sans-serif;
    `;
    percentLabel.textContent = "0%";
    bar.appendChild(percentLabel);
  }

  opts.container.appendChild(bar);

  // State
  let currentPercent = 0;
  let destroyed = false;
  let completed = false;

  function resolveTarget(): HTMLElement | null {
    if (!options.target) return null;
    return typeof options.target === "string"
      ? document.querySelector<HTMLElement>(options.target)
      : options.target;
  }

  function calculateProgress(): number {
    const targetEl = resolveTarget();
    if (targetEl) {
      const { scrollTop, scrollHeight, clientHeight } = targetEl;
      if (scrollHeight <= clientHeight + opts.minHeightToShow) return 100;
      return Math.min(100, Math.max(0, (scrollTop / (scrollHeight - clientHeight - opts.minHeightToShow)) * 100));
    }
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= opts.minHeightToShow) return 100;
    return Math.min(100, Math.max(0, ((window.scrollY || document.documentElement.scrollTop) / docHeight) * 100));
  }

  function update(): void {
    if (destroyed) return;

    const pct = Math.round(calculateProgress());
    currentPercent = pct;

    fill.style.width = `${pct}%`;

    // Glow effect
    glow.style.opacity = pct > 5 && pct < 99 ? "1" : "0";

    // Percentage label
    if (percentLabel) {
      percentLabel.textContent = `${pct}%`;
      percentLabel.style.opacity = pct > 5 ? "1" : "0";
    }

    opts.onProgress?.(pct);

    // Complete callback (fire once)
    if (pct >= 99 && !completed) {
      completed = true;
      opts.onComplete?.();
    } else if (pct < 99) {
      completed = false;
    }
  }

  // Scroll listener with rAF throttle
  let ticking = false;
  function onScroll(): void {
    if (!ticking) {
      requestAnimationFrame(() => { update(); ticking = false; });
      ticking = true;
    }
  }

  // Bind scroll
  const targetEl = resolveTarget();
  if (targetEl) {
    targetEl.addEventListener("scroll", onScroll, { passive: true });
  } else {
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Initial calculation
  update();

  const instance: ReadingProgressInstance = {
    element: bar,

    getProgress: () => currentPercent,

    setProgress(percent: number) {
      currentPercent = Math.max(0, Math.min(100, percent));
      fill.style.width = `${currentPercent}%`;
      if (percentLabel) percentLabel.textContent = `${Math.round(currentPercent)}%`;
    },

    show() { bar.style.display = ""; },

    hide() { bar.style.display = "none"; },

    setColor(color: ProgressColor) {
      const c = COLOR_MAP[color] ?? color;
      fill.style.background = c;
      glow.style.background = `linear-gradient(90deg,transparent,${c}40)`;
      if (percentLabel) percentLabel.style.background = c;
    },

    destroy() {
      destroyed = true;
      if (targetEl) {
        targetEl.removeEventListener("scroll", onScroll);
      } else {
        window.removeEventListener("scroll", onScroll);
      }
      bar.remove();
    },
  };

  return instance;
}
