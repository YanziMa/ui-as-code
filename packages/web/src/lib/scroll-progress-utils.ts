/**
 * Scroll Progress Utilities: Visual scroll progress indicators including
 * reading progress bars, page-level indicators, section-based progress,
 * circular progress, and custom rendering hooks.
 */

// --- Types ---

export type ProgressShape = "bar" | "circle" | "dots";
export type ProgressPosition = "top" | "bottom" | "fixed-top" | "fixed-bottom";

export interface ScrollProgressOptions {
  /** Container element (default: document.body) */
  container?: HTMLElement;
  /** Shape of the indicator */
  shape?: ProgressShape;
  /** Position of the indicator */
  position?: ProgressPosition;
  /** Bar height in px (bar mode, default 3) */
  barHeight?: number;
  /** Bar color */
  color?: string;
  /** Background/track color */
  backgroundColor?: string;
  /** Border radius */
  borderRadius?: number | string;
  /** Z-index for fixed positioning */
  zIndex?: number;
  /** Easing function name */
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
  /** Target element to track scroll within (null = page) */
  target?: HTMLElement | null;
  /** Custom render function for progress value (0-1) */
  onProgress?: (progress: number) => void;
  /** Called when user reaches bottom */
  onComplete?: () => void;
  /** Show percentage text? */
  showPercentage?: boolean;
  /** Number of dots (dots mode, default 20) */
  dotCount?: number;
  /** Dot size in px (dots mode) */
  dotSize?: number;
  /** Dot spacing in px */
  dotSpacing?: number;
  /** Circle size in px (circle mode) */
  circleSize?: number;
  /** Circle stroke width (circle mode) */
  strokeWidth?: number;
  /** Custom class name */
  className?: string;
}

export interface ScrollProgressInstance {
  /** Root element of the indicator */
  el: HTMLElement;
  /** Current progress value (0-1) */
  getProgress: () => number;
  /** Get current progress as percentage (0-100) */
  getPercentage: () => number;
  /** Force update */
  update: () => void;
  /** Show the indicator */
  show: () => void;
  /** Hide the indicator */
  hide: () => void;
  /** Set color dynamically */
  setColor: (color: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Easing functions ---

const EASING: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

// --- Core Factory ---

/**
 * Create a scroll progress indicator.
 *
 * @example
 * ```ts
 * const progress = createScrollProgress({
 *   shape: "bar",
 *   position: "fixed-top",
 *   color: "#3b82f6",
 *   barHeight: 4,
 * });
 *
 * // Or circular:
 * createScrollProgress({
 *   shape: "circle",
 *   circleSize: 60,
 *   position: "fixed-bottom",
 * });
 * ```
 */
export function createScrollProgress(options: ScrollProgressOptions = {}): ScrollProgressInstance {
  const {
    container = document.body,
    shape = "bar",
    position = "fixed-top",
    barHeight = 3,
    color = "#3b82f6",
    backgroundColor = "#e5e7eb",
    borderRadius = 0,
    zIndex = 9999,
    easing = "linear",
    target = null,
    onProgress,
    onComplete,
    showPercentage = false,
    dotCount = 20,
    dotSize = 6,
    dotSpacing = 8,
    circleSize = 50,
    strokeWidth = 4,
    className,
  } = options;

  let _visible = true;
  let _currentProgress = 0;
  let rafId: number | null = null;
  let isDestroyed = false;
  let _completed = false;

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `scroll-progress ${shape} ${position} ${className ?? ""}`.trim();
  root.setAttribute("role", "progressbar");
  root.setAttribute("aria-valuemin", "0");
  root.setAttribute("aria-valuemax", "100");

  // Position styles
  const posStyles: Record<string, string> = {
    "top": "position:relative;",
    "bottom": "position:relative;",
    "fixed-top": "position:fixed;top:0;left:0;right:0;z-index:" + zIndex + ";",
    "fixed-bottom": "position:fixed;bottom:0;left:0;right:0;z-index:" + zIndex + ";",
  };

  root.style.cssText = posStyles[position] ?? posStyles["fixed-top"];

  if (shape === "bar") {
    buildBar();
  } else if (shape === "circle") {
    buildCircle();
  } else if (shape === "dots") {
    buildDots();
  }

  container.appendChild(root);

  // --- Builders ---

  let fillEl: HTMLElement | null = null;
  let textEl: HTMLElement | SVGSVGElement | null = null;

  function buildBar(): void {
    root.style.overflow = "hidden";

    fillEl = document.createElement("div");
    fillEl.className = "sp-fill";
    fillEl.style.cssText =
      `height:${barHeight}px;width:0%;background:${color};` +
      `border-radius:${typeof borderRadius === "number" ? borderRadius + "px" : borderRadius};` +
      "transition:none;will-change;width;";
    root.appendChild(fillEl);

    if (showPercentage) {
      textEl = document.createElement("span");
      textEl.className = "sp-text";
      textEl.style.cssText =
        "position:absolute;right:12px;top:50%;transform:translateY(-50%);" +
        "font-size:11px;font-weight:600;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,0.3);";
      root.appendChild(textEl);
    }
  }

  function buildCircle(): void {
    root.style.cssText += `width:${circleSize}px;height:${circleSize}px;display:flex;align-items:center;justify-content:center;`;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + circleSize + " " + circleSize);
    svg.style.cssText = `width:${circleSize}px;height:${circleSize}px;transform:rotate(-90deg);`;

    // Background circle
    const bgCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bgCircle.setAttribute("cx", String(circleSize / 2));
    bgCircle.setAttribute("cy", String(circleSize / 2));
    bgCircle.setAttribute("r", String((circleSize - strokeWidth) / 2));
    bgCircle.style.cssText = `fill:none;stroke:${backgroundColor};stroke-width:${strokeWidth};`;
    svg.appendChild(bgCircle);

    // Progress circle
    fillEl = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    fillEl.setAttribute("cx", String(circleSize / 2));
    fillEl.setAttribute("cy", String(circleSize / 2));
    fillEl.setAttribute("r", String((circleSize - strokeWidth) / 2));
    (fillEl as SVGCircleElement).style.cssText =
      `fill:none;stroke:${color};stroke-width:${strokeWidth};` +
      "stroke-linecap:round;transition:none;" +
      `stroke-dasharray:${Math.PI * (circleSize - strokeWidth)};` +
      "stroke-dashoffset:" + Math.PI * (circleSize - strokeWidth) + ";";
    svg.appendChild(svg);

    root.appendChild(svg);

    if (showPercentage) {
      textEl = document.createElement("span");
      textEl.className = "sp-text";
      textEl.style.cssText =
        "font-size:12px;font-weight:700;color:#374151;";
      root.appendChild(textEl);
    }
  }

  function buildDots(): void {
    root.style.cssText +=
      "display:flex;gap:" + dotSpacing + "px;padding:8px 16px;" +
      "background:#f9fafb;border-radius:8px;flex-wrap:wrap;justify-content:center;";

    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement("div");
      dot.className = "sp-dot";
      dot.dataset.index = String(i);
      dot.style.cssText =
        `width:${dotSize}px;height:${dotSize}px;border-radius:50%;` +
        `background:${backgroundColor};transition:background 0.15s;`;
      root.appendChild(dot);
    }
  }

  // --- Update logic ---

  function calculateProgress(): number {
    let scrollTop: number;
    let scrollHeight: number;
    let clientHeight: number;

    if (target) {
      scrollTop = target.scrollTop;
      scrollHeight = target.scrollHeight;
      clientHeight = target.clientHeight;
    } else {
      scrollTop = window.scrollY || document.documentElement.scrollTop;
      scrollHeight = document.documentElement.scrollHeight;
      clientHeight = window.innerHeight || document.documentElement.clientHeight;
    }

    if (scrollHeight <= clientHeight) return 1;

    const raw = scrollTop / (scrollHeight - clientHeight);
    const eased = EASING[easing] ?? EASING.linear;
    return Math.max(0, Math.min(1, eased(raw)));
  }

  function applyProgress(progress: number): void {
    _currentProgress = progress;
    const pct = Math.round(progress * 100);

    root.setAttribute("aria-valuenow", String(pct));

    if (shape === "bar" && fillEl) {
      fillEl.style.width = `${pct}%`;
    } else if (shape === "circle" && fillEl) {
      const circumference = Math.PI * (circleSize - strokeWidth);
      const offset = circumference * (1 - progress);
      (fillEl as SVGCircleElement).style.strokeDashoffset = String(offset);
    } else if (shape === "dots") {
      const activeCount = Math.round(progress * dotCount);
      const dots = root.querySelectorAll(".sp-dot");
      dots.forEach((dot, i) => {
        (dot as HTMLElement).style.background = i < activeCount ? color : backgroundColor;
      });
    }

    if (showPercentage && textEl) {
      textEl.textContent = `${pct}%`;
    }

    onProgress?.(progress);

    // Complete detection
    if (progress >= 0.99 && !_completed) {
      _completed = true;
      onComplete?.();
    } else if (progress < 0.99) {
      _completed = false;
    }
  }

  // --- Animation loop ---

  function tick(): void {
    if (isDestroyed) return;
    const progress = calculateProgress();
    applyProgress(progress);
    rafId = requestAnimationFrame(tick);
  }

  // Start loop
  rafId = requestAnimationFrame(tick);

  // Event listeners
  const scrollTarget = target ?? window;
  scrollTarget.addEventListener("scroll", () => { /* tick handles it */ }, { passive: true });

  // ResizeObserver for dynamic content
  const resizeObs = new ResizeObserver(() => { /* recalc on next tick */ });
  if (target) resizeObs.observe(target);
  else resizeObs.observe(document.documentElement);

  // --- Public API ---

  function getProgress(): number { return _currentProgress; }
  function getPercentage(): number { return Math.round(_currentProgress * 100); }

  function update(): void {
    const progress = calculateProgress();
    applyProgress(progress);
  }

  function show(): void {
    _visible = true;
    root.style.display = "";
  }

  function hide(): void {
    _visible = false;
    root.style.display = "none";
  }

  function setColor(newColor: string): void {
    if (shape === "bar" && fillEl) {
      fillEl.style.background = newColor;
    } else if (shape === "circle" && fillEl) {
      (fillEl as SVGCircleElement).style.stroke = newColor;
    }
  }

  function destroy(): void {
    isDestroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    resizeObs.disconnect();
    root.remove();
  }

  return {
    el: root,
    getProgress, getPercentage,
    update, show, hide,
    setColor, destroy,
  };
}
