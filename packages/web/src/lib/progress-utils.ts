/**
 * Progress Utilities: Progress bars, step progress, circular progress,
 * indeterminate states, animated transitions, and ARIA attributes.
 */

// --- Types ---

export type ProgressBarVariant = "default" | "success" | "warning" | "error" | "info";
export type ProgressBarSize = "sm" | "md" | "lg";

export interface ProgressBarOptions {
  /** Current value (0-100) */
  value: number;
  /** Visual variant */
  variant?: ProgressBarVariant;
  /** Size */
  size?: ProgressBarSize;
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom label format */
  labelFormat?: (value: number) => string;
  /** Animated transition */
  animated?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Strip pattern */
  striped?: boolean;
  /** Animate stripes */
  animateStripes?: boolean;
  /** Height override (px) */
  height?: number;
  /** Max value (default 100) */
  max?: number;
  /** Indeterminate mode */
  indeterminate?: boolean;
  /** Custom class name */
  className?: string;
}

export interface CircularProgressOptions {
  /** Current value (0-100) */
  value: number;
  /** Size in px */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color for the progress arc */
  color?: string;
  /** Track/background color */
  trackColor?: string;
  /** Show center text */
  showValue?: boolean;
  /** Value formatter */
  valueFormat?: (value: number) => string;
  /** Line cap style */
  lineCap?: "round" | "butt" | "square";
  /** Custom class name */
  className?: string;
}

export interface StepProgressOptions {
  /** Total steps */
  steps: number;
  /** Current step (1-based) */
  currentStep?: number;
  /** Step labels */
  labels?: string[];
  /** Show step numbers */
  showNumbers?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Color for completed steps */
  completedColor?: string;
  /** Color for active step */
  activeColor?: string;
  /** Color for pending steps */
  pendingColor?: string;
  /** Custom class name */
  className?: string;
}

// --- Variant Colors ---

const PROGRESS_VARIANTS: Record<ProgressBarVariant, { bg: string; bar: string }> = {
  "default": { bg: "#e5e7eb", bar: "#3b82f6" },
  "success": { bg: "#d1fae5", bar: "#22c55e" },
  "warning": { bg: "#fef3c7", bar: "#f59e0b" },
  "error": { bg: "#fee2e2", bar: "#ef4444" },
  "info": { bg: "#dbeafe", bar: "#0ea5e9" },
};

const SIZE_HEIGHTS: Record<ProgressBarSize, number> = {
  "sm": 6,
  "md": 10,
  "lg": 16,
};

// --- Progress Bar ---

/**
 * Create a linear progress bar.
 *
 * @example
 * ```ts
 * const bar = createProgressBar({ value: 65, variant: "primary", showLabel: true });
 * ```
 */
export function createProgressBar(options: ProgressBarOptions): HTMLElement {
  const {
    value,
    variant = "default",
    size = "md",
    showLabel = false,
    labelFormat,
    animated = true,
    animationDuration = 500,
    striped = false,
    animateStripes = false,
    height,
    max = 100,
    indeterminate = false,
    className,
  } = options;

  const colors = PROGRESS_VARIANTS[variant];
  const h = height ?? SIZE_HEIGHTS[size];
  const clampedValue = Math.max(0, Math.min(value, max));
  const percent = (clampedValue / max) * 100;

  // Root
  const root = document.createElement("div");
  root.className = `progress-bar ${variant} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    "position:relative;width:100%;overflow:hidden;" +
    `background:${colors.bg};border-radius:${h / 2}px;height:${h}px;` +
    "role=progressbar aria-valuenow=" + String(Math.round(percent)) +
    ' aria-valuemin="0" aria-valuemax="100"';
  if (indeterminate) root.setAttribute("aria-busy", "true");

  // Fill
  const fill = document.createElement("div");
  fill.className = "progress-fill";

  if (indeterminate) {
    fill.style.cssText =
      `height:100%;background:${colors.bar};border-radius:${h / 2}px;` +
      "width:40%;animation:indeterminate-progress 1.5s ease-in-out infinite;" +
      (striped ? "background-image:linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%);background-size:20px 20px;" : "");
  } else {
    fill.style.cssText =
      `height:100%;width:${percent}%;background:${colors.bar};border-radius:${h / 2}px;` +
      (animated ? `transition:width ${animationDuration}ms ease;` : "") +
      (striped
        ? "background-image:linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%);background-size:20px 20px;"
        : "") +
      (animateStripes && striped ? "animation:stripe-slide 1s linear infinite;" : "");
  }

  root.appendChild(fill);

  // Label
  if (showLabel && !indeterminate) {
    const labelEl = document.createElement("span");
    labelEl.className = "progress-label";
    labelEl.textContent = labelFormat ? labelFormat(clampedValue) : `${Math.round(percent)}%`;
    labelEl.style.cssText =
      "position:absolute;right:8px;top:50%;transform:translateY(-50%);" +
      `font-size:${Math.max(h - 4, 10)}px;font-weight:600;color:#374151;line-height:1;`;
    root.appendChild(labelEl);
  }

  return root;
}

/** Update a progress bar's value */
export function updateProgressBar(el: HTMLElement, newValue: number, max = 100): void {
  const fill = el.querySelector(".progress-fill") as HTMLElement | null;
  if (!fill) return;

  const clamped = Math.max(0, Math.min(newValue, max));
  const percent = (clamped / max) * 100;
  fill.style.width = `${percent}%`;
  el.setAttribute("aria-valuenow", String(Math.round(percent)));

  const label = el.querySelector(".progress-label") as HTMLElement | null;
  if (label) label.textContent = `${Math.round(percent)}%`;
}

// --- Circular Progress ---

/**
 * Create a circular/indeterminate progress indicator.
 *
 * @example
 * ```ts
 * const circle = createCircularProgress({ value: 75, size: 80, showValue: true });
 * ```
 */
export function createCircularProgress(options: CircularProgressOptions): HTMLElement {
  const {
    value,
    size = 48,
    strokeWidth = 4,
    color = "#3b82f6",
    trackColor = "#e5e7eb",
    showValue = true,
    valueFormat,
    lineCap = "round",
    className,
  } = options;

  const clamped = Math.max(0, Math.min(value, 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  // SVG wrapper
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("role", "progressbar");
  svg.setAttribute("aria-valuenow", String(Math.round(clamped)));
  svg.className.baseVal = `circular-progress ${className ?? ""}`;

  // Track circle
  const track = document.createElementNS(svgNS, "circle");
  track.setAttribute("cx", String(size / 2));
  track.setAttribute("cy", String(size / 2));
  track.setAttribute("r", String(radius));
  track.setAttribute("fill", "none");
  track.setAttribute("stroke", trackColor);
  track.setAttribute("stroke-width", String(strokeWidth));

  // Progress circle
  const progress = document.createElementNS(svgNS, "circle");
  progress.setAttribute("cx", String(size / 2));
  progress.setAttribute("cy", String(size / 2));
  progress.setAttribute("r", String(radius));
  progress.setAttribute("fill", "none");
  progress.setAttribute("stroke", color);
  progress.setAttribute("stroke-width", String(strokeWidth));
  progress.setAttribute("stroke-linecap", lineCap);
  progress.setAttribute("stroke-dasharray", String(circumference));
  progress.setAttribute("stroke-dashoffset", String(offset));
  progress.style.transition = "stroke-dashoffset 0.5s ease";

  svg.appendChild(track);
  svg.appendChild(progress);

  // Center value text
  if (showValue) {
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", String(size / 2));
    text.setAttribute("y", String(size / 2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-size", String(size * 0.22));
    text.setAttribute("font-weight", "600");
    text.setAttribute("fill", "#374151");
    text.textContent = valueFormat ? valueFormat(clamped) : `${Math.round(clamped)}%`;
    svg.appendChild(text);
  }

  return svg as unknown as HTMLElement;
}

// --- Step Progress ---

/**
 * Create a step/dot progress indicator.
 *
 * @example
 * ```ts
 * const steps = createStepProgress({ steps: 4, currentStep: 2, labels: ["Info", "Details", "Review", "Done"] });
 * ```
 */
export function createStepProgress(options: StepProgressOptions): HTMLElement {
  const {
    steps,
    currentStep = 1,
    labels,
    showNumbers = true,
    size = "md",
    completedColor = "#22c55e",
    activeColor = "#3b82f6",
    pendingColor = "#d1d5db",
    className,
  } = options;

  const dotSize = size === "sm" ? 10 : size === "lg" ? 18 : 14;
  const fontSize = size === "sm" ? 11 : size === "lg" ? 14 : 12;

  const root = document.createElement("div");
  root.className = `step-progress ${size} ${className ?? ""}`.trim();
  root.style.cssText = "display:flex;align-items:center;gap:0;";
  root.setAttribute("role", "progressbar");
  root.setAttribute("aria-valuemax", String(steps));
  root.setAttribute("aria-valuenow", String(currentStep));

  for (let i = 1; i <= steps; i++) {
    // Connector line (before each dot except first)
    if (i > 1) {
      const connector = document.createElement("div");
      connector.className = "step-connector";
      const isCompleted = i <= currentStep;
      connector.style.cssText =
        `width:24px;height:2px;background:${isCompleted ? completedColor : pendingColor};flex-shrink:0;`;
      root.appendChild(connector);
    }

    // Dot container
    const dotWrap = document.createElement("div");
    dotWrap.style.display = "flex";
    dotWrap.style.flexDirection = "column";
    dotWrap.style.alignItems = "center";
    dotWrap.style.gap = "4px";

    // Dot
    const dot = document.createElement("div");
    const isCompleted = i < currentStep;
    const isActive = i === currentStep;
    dot.style.cssText =
      `width:${dotSize}px;height:${dotSize}px;border-radius:50%;` +
      `background:${isCompleted ? completedColor : isActive ? activeColor : pendingColor};` +
      "display:flex;align-items:center;justify-content:center;" +
      `font-size:${Math.max(dotSize * 0.5, 9)}px;font-weight:600;color:#fff;transition:all 0.3s ease;`;

    if (isCompleted) dot.innerHTML = "&#10003;";
    else if (showNumbers) dot.textContent = String(i);

    dotWrap.appendChild(dot);

    // Label
    if (labels && labels[i - 1]) {
      const label = document.createElement("span");
      label.textContent = labels[i - 1]!;
      label.style.cssText =
        `font-size:${fontSize}px;color:${isActive || isCompleted ? "#111827" : "#9ca3af"};` +
        "white-space:nowrap;font-weight:" + (isActive ? "600" : "400") + ";";
      dotWrap.appendChild(label);
    }

    root.appendChild(dotWrap);
  }

  return root;
}
