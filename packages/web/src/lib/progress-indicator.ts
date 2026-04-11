/**
 * Progress Indicator: Multi-style progress components including linear progress bars,
 * circular progress (SVG-based), step progress, segmented progress, buffer/loading
 * indicators, indeterminate animations, progress transitions, and accessibility.
 */

// --- Types ---

export type ProgressVariant = "default" | "success" | "warning" | "error" | "info";
export type ProgressSize = "xs" | "sm" | "md" | "lg";

export interface ProgressBarOptions {
  /** Current value (0-100) */
  value?: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Visual variant */
  variant?: ProgressVariant;
  /** Size preset */
  size?: ProgressSize;
  /** Height in px (overrides size) */
  height?: number;
  /** Show label with percentage */
  showLabel?: boolean;
  /** Label position: "inside", "outside-right", "outside-left" */
  labelPosition?: "inside" | "outside-right" | "outside-left";
  /** Custom label formatter */
  labelFormatter?: (value: number, percent: number) => string;
  /** Animated transition between values (ms, default: 300) */
  animationDuration?: number;
  /** Indeterminate mode (loading spinner style) */
  indeterminate?: boolean;
  /** Buffer/secondary progress value (for streaming) */
  bufferValue?: number;
  /** Stripe animation for indeterminate */
  striped?: boolean;
  /** Animate stripes */
  animateStripes?: boolean;
  /** Rounded corners */
  rounded?: boolean;
  /** Custom CSS class */
  className?: string;
  /** ARIA label */
  ariaLabel?: string;
}

export interface CircularProgressOptions {
  /** Value 0-100 */
  value?: number;
  /** Maximum (default: 100) */
  max?: number;
  /** Diameter in px (default: 48) */
  size?: number;
  /** Stroke width in px (default: 4) */
  strokeWidth?: number;
  /** Variant */
  variant?: ProgressVariant;
  /** Show center text */
  showValue?: boolean;
  /** Custom center content (HTMLElement or string) */
  centerContent?: string | HTMLElement;
  /** Counter-clockwise */
  counterClockwise?: boolean;
  /** Line cap style: "butt" | "round" | "square" */
  lineCap?: "butt" | "round" | "square";
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Track color (background circle) */
  trackColor?: string;
  /** Custom CSS class */
  className?: string;
}

export interface StepProgressOptions {
  /** Step labels */
  steps: Array<{ label: string; description?: string; icon?: string }>;
  /** Current active step index (0-based) */
  currentStep?: number;
  /** Completed up to this step (can be different from active) */
  completedStep?: number;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Variant */
  variant?: ProgressVariant;
  /** Size */
  size?: ProgressSize;
  /** Clickable steps */
  clickable?: boolean;
  /** Callback when a step is clicked */
  onStepClick?: (index: number) => void;
  /** Error state per step */
  errorSteps?: Set<number>;
  /** Custom CSS class */
  className?: string;
}

// --- Color Map ---

const VARIANT_COLORS: Record<ProgressVariant, { fg: string; bg: string }> = {
  default:  { fg: "#007aff", bg: "#e7f0ff" },
  success:  { fg: "#16a34a", bg: "#e8faf0" },
  warning:  { fg: "#d48806", bg: "#fff8e1" },
  error:    { fg: "#dc2626", bg: "#fef0f0" },
  info:     { fg: "#0891b2", bg: "#e0f7fa" },
};

const SIZE_HEIGHTS: Record<ProgressSize, number> = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
};

// --- Linear Progress Bar ---

export interface ProgressBarInstance {
  element: HTMLElement;
  setValue: (value: number) => void;
  setBuffer: (value: number) => void;
  setIndeterminate: (on: boolean) => void;
  getValue: () => number;
  destroy: () => void;
}

export function createProgressBar(options: ProgressBarOptions = {}): ProgressBarInstance {
  const opts = {
    value: options.value ?? 0,
    max: options.max ?? 100,
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    showLabel: options.showLabel ?? false,
    labelPosition: options.labelPosition ?? "inside",
    animationDuration: options.animationDuration ?? 300,
    indeterminate: options.indeterminate ?? false,
    striped: options.striped ?? false,
    animateStripes: options.animateStripes ?? false,
    rounded: options.rounded ?? true,
    ...options,
  };

  const colors = VARIANT_COLORS[opts.variant];
  const barHeight = opts.height ?? SIZE_HEIGHTS[opts.size];

  // Container
  const el = document.createElement("div");
  el.className = `pbar ${opts.className ?? ""}`;
  el.setAttribute("role", "progressbar");
  el.setAttribute("aria-valuenow", String(opts.value));
  el.setAttribute("aria-valuemin", "0");
  el.setAttribute("aria-valuemax", String(opts.max));
  if (opts.ariaLabel) el.setAttribute("aria-label", opts.ariaLabel);

  el.style.cssText = `
    position: relative; width: 100%; overflow: hidden;
    background: ${colors.bg}; border-radius: ${opts.rounded ? Math.max(barHeight / 2, 2) : 0}px;
    height: ${barHeight}px;
  `;

  // Buffer track (behind main bar)
  const bufferEl = document.createElement("div");
  bufferEl.className = "pbar-buffer";
  bufferEl.style.cssText = `
    position: absolute; inset: 0; background: rgba(0,0,0,0.06);
    width: ${((options.bufferValue ?? 0) / opts.max) * 100}%;
    transition: width ${opts.animationDuration}ms ease;
  `;

  // Main fill
  const fillEl = document.createElement("div");
  fillEl.className = "pbar-fill";
  fillEl.style.cssText = `
    position: absolute; inset: 0; left: 0; top: 0;
    background: ${colors.fg};
    width: ${(opts.value / opts.max) * 100}%;
    transition: width ${opts.animationDuration}ms ease;
    ${opts.striped ? `background-image: repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 16px);` : ""}
    ${opts.animateStripes ? `animation: pbar-stripes 1s linear infinite;` : ""}
  `;

  // Label
  let labelEl: HTMLElement | null = null;
  if (opts.showLabel) {
    labelEl = document.createElement("span");
    labelEl.className = "pbar-label";
    const pct = Math.round((opts.value / opts.max) * 100);
    labelEl.textContent = opts.labelFormatter?.(opts.value, pct) ?? `${pct}%`;
    labelEl.style.cssText = opts.labelPosition === "inside"
      ? `position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:${Math.max(10, barHeight - 3)}px;color:#fff;font-weight:600;text-shadow:0 1px 1px rgba(0,0,0,0.2);`
      : `margin-left:8px;font-size:12px;color:#666;font-weight:500;white-space:nowrap;`;

    if (opts.labelPosition === "inside") {
      fillEl.appendChild(labelEl);
    } else {
      el.appendChild(labelEl);
    }
  }

  // Assemble
  if (options.bufferValue !== undefined && options.bufferValue > 0) {
    el.appendChild(bufferEl);
  }
  el.appendChild(fillEl);

  // Indeterminate animation
  if (opts.indeterminate) {
    fillEl.style.width = "40%";
    fillEl.style.animation = "pbar-indeterminate 1.5s ease-in-out infinite";
  }

  // Inject keyframes if needed
  injectProgressStyles();

  return {
    element: el,

    setValue(value: number) {
      const clamped = Math.max(0, Math.min(value, opts.max));
      opts.value = clamped;
      el.setAttribute("aria-valuenow", String(clamped));
      fillEl.style.width = `${(clamped / opts.max) * 100}%`;
      if (labelEl) {
        const pct = Math.round((clamped / opts.max) * 100);
        labelEl.textContent = opts.labelFormatter?.(clamped, pct) ?? `${pct}%`;
      }
    },

    setBuffer(value: number) {
      bufferEl.style.width = `${Math.max(0, Math.min(value, opts.max) / opts.max * 100}%`;
    },

    setIndeterminate(on: boolean) {
      opts.indeterminate = on;
      if (on) {
        fillEl.style.width = "40%";
        fillEl.style.animation = "pbar-indeterminate 1.5s ease-in-out infinite";
      } else {
        fillEl.style.animation = "";
        fillEl.style.width = `${(opts.value / opts.max) * 100}%`;
      }
    },

    getValue() { return opts.value; },

    destroy() { el.remove(); },
  };
}

// --- Circular Progress ---

export interface CircularProgressInstance {
  element: SVGElement;
  setValue: (value: number) => void;
  getValue: () => number;
  destroy: () => void;
}

export function createCircularProgress(options: CircularProgressOptions = {}): CircularProgressInstance {
  const opts = {
    value: options.value ?? 0,
    max: options.max ?? 100,
    size: options.size ?? 48,
    strokeWidth: options.strokeWidth ?? 4,
    variant: options.variant ?? "default",
    showValue: options.showValue ?? false,
    lineCap: options.lineCap ?? "round",
    animationDuration: options.animationDuration ?? 300,
    trackColor: options.trackColor ?? "#f0f0f0",
    counterClockwise: options.counterClockwise ?? false,
    ...options,
  };

  const colors = VARIANT_COLORS[opts.variant];
  const radius = (opts.size - opts.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.size} ${opts.size}`);
  svg.setAttribute("width", String(opts.size));
  svg.setAttribute("height", String(opts.size));
  svg.setAttribute("role", "progressbar");
  svg.setAttribute("aria-valuenow", String(opts.value));
  svg.setAttribute("aria-valuemin", "0");
  svg.setAttribute("aria-valuemax", String(opts.max));
  svg.classList.add("pcirc", opts.className ?? "");

  // Track (background circle)
  const track = document.createElementNS(ns, "circle");
  track.setAttribute("cx", String(opts.size / 2));
  track.setAttribute("cy", String(opts.size / 2));
  track.setAttribute("r", String(radius));
  track.setAttribute("fill", "none");
  track.setAttribute("stroke", opts.trackColor);
  track.setAttribute("stroke-width", String(opts.strokeWidth));

  // Fill (progress arc)
  const fill = document.createElementNS(ns, "circle");
  fill.setAttribute("cx", String(opts.size / 2));
  fill.setAttribute("cy", String(opts.size / 2));
  fill.setAttribute("r", String(radius));
  fill.setAttribute("fill", "none");
  fill.setAttribute("stroke", colors.fg);
  fill.setAttribute("stroke-width", String(opts.strokeWidth));
  fill.setAttribute("stroke-linecap", opts.lineCap);
  fill.style.transition = `stroke-dashoffset ${opts.animationDuration}ms ease`;
  fill.style.transformOrigin = "center";
  if (opts.counterClockwise) {
    fill.style.transform = "scale(-1, 1)";
  }
  fill.style.transformBox = "fill-box";

  // Calculate initial dash
  const pct = Math.max(0, Math.min(opts.value / opts.max, 1));
  fill.setAttribute("stroke-dasharray", String(circumference));
  fill.setAttribute("stroke-dashoffset", String(circumference * (1 - pct)));

  svg.appendChild(track);
  svg.appendChild(fill);

  // Center text
  let centerEl: SVGTextElement | HTMLDivElement | null = null;
  if (opts.showValue || opts.centerContent) {
    if (typeof opts.centerContent === "string") {
      const foreignObj = document.createElementNS(ns, "foreignObject");
      foreignObj.setAttribute("x", "0");
      foreignObj.setAttribute("y", "0");
      foreignObj.setAttribute("width", String(opts.size));
      foreignObj.setAttribute("height", String(opts.size));
      foreignObj.style.cssText = "display:flex;align-items:center;justify-content:center;";
      const div = document.createElement("div");
      div.style.cssText = `text-align:center;font-size:${opts.size * 0.22}px;font-weight:600;color:#333;width:100%;height:100%;display:flex;align-items:center;justify-content:center;`;
      div.textContent = opts.centerContent;
      foreignObj.appendChild(div);
      svg.appendChild(foreignObject);
      centerEl = div as unknown as HTMLDivElement;
    } else if (opts.centerContent instanceof HTMLElement) {
      const foreignObj = document.createElementNS(ns, "foreignObject");
      foreignObj.setAttribute("x", "0");
      foreignObj.setAttribute("y", "0");
      foreignObj.setAttribute("width", String(opts.size));
      foreignObj.setAttribute("height", String(opts.size));
      foreignObj.style.cssText = "display:flex;align-items:center;justify-content:center;";
      foreignObj.appendChild(opts.centerContent);
      svg.appendChild(foreignObject);
    } else if (opts.showValue) {
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(opts.size / 2));
      text.setAttribute("y", String(opts.size / 2));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.style.fontSize = `${opts.size * 0.24}px`;
      text.style.fontWeight = "600";
      text.style.fill = "#333";
      text.textContent = `${Math.round(pct * 100)}%`;
      svg.appendChild(text);
      centerEl = text;
    }
  }

  return {
    element: svg,

    setValue(value: number) {
      const clamped = Math.max(0, Math.min(value, opts.max));
      opts.value = clamped;
      svg.setAttribute("aria-valuenow", String(clamped));
      const pct = Math.max(0, Math.min(clamped / opts.max, 1));
      fill.setAttribute("stroke-dashoffset", String(circumference * (1 - pct)));
      if (centerEl && centerEl instanceof SVGTextElement) {
        centerEl.textContent = `${Math.round(pct * 100)}%`;
      }
    },

    getValue() { return opts.value; },

    destroy() { svg.remove(); },
  };
}

// --- Step Progress ---

export interface StepProgressInstance {
  element: HTMLElement;
  setCurrentStep: (index: number) => void;
  setCompletedStep: (index: number) => void;
  getCurrentStep: () => number;
  destroy: () => void;
}

export function createStepProgress(options: StepProgressOptions): StepProgressInstance {
  const opts = {
    currentStep: options.currentStep ?? 0,
    completedStep: options.completedStep ?? -1,
    orientation: options.orientation ?? "horizontal",
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    clickable: options.clickable ?? false,
    errorSteps: options.errorSteps ?? new Set(),
    ...options,
  };

  const colors = VARIANT_COLORS[opts.variant];
  const isHoriz = opts.orientation === "horizontal";

  const el = document.createElement("div");
  el.className = `step-progress step-${opts.orientation} ${opts.className ?? ""}`;
  el.setAttribute("role": "list");
  el.style.cssText = `
    display: flex; ${isHoriz ? "flex-direction: row; align-items: center; gap: 0;" : "flex-direction: column; gap: 16px;"}
    font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px;
  `;

  const stepEls: HTMLElement[] = [];
  const connectorEls: HTMLElement[] = [];

  for (let i = 0; i < options.steps.length; i++) {
    const step = options.steps[i]!;
    const isCompleted = i <= opts.completedStep;
    const isActive = i === opts.currentStep;
    const isError = opts.errorSteps.has(i);

    // Connector line (before each step except first)
    if (i > 0) {
      const connector = document.createElement("div");
      connector.className = "step-connector";
      connector.style.cssText = isHoriz
        ? `width:40px;height:2px;background:${isCompleted ? colors.fg : "#e5e5e5"};transition:background 0.3s ease;flex-shrink:0;border-radius:1px;`
        : `width:2px;height:24px;background:${isCompleted ? colors.fg : "#e5e5e5"};transition:background 0.3s ease;flex-shrink:0;border-radius:1px;`;
      connectorEls.push(connector);
      el.appendChild(connector);
    }

    // Step node
    const stepEl = document.createElement("div");
    stepEl.className = `step-node${isActive ? " step-active" : ""}${isCompleted ? " step-completed" : ""}${isError ? " step-error" : ""}`;
    stepEl.setAttribute("role", "listitem");

    const circleSize = opts.size === "xs" ? 20 : opts.size === "sm" ? 28 : opts.size === "lg" ? 44 : 36;
    const fontSize = circleSize * 0.38;

    stepEl.innerHTML = `
      <div class="step-circle" style="
        width:${circleSize}px;height:${circleSize}px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:${fontSize}px;font-weight:600;border:2px solid;
        transition: all 0.3s ease;cursor:${opts.clickable ? "pointer" : "default"};
        background:${isCompleted ? colors.fg : isActive ? "#fff" : "#f5f5f5"};
        border-color:${isError ? "#dc2626" : isCompleted ? colors.fg : isActive ? colors.fg : "#ddd"};
        color:${isCompleted ? "#fff" : isError ? "#dc2626" : isActive ? colors.fg : "#999"};
        box-shadow:${isActive ? `0 0 0 4px ${colors.bg}` : "none"};
      ">${isCompleted ? "&#10003;" : String(i + 1)}</div>
      <div class="step-info" style="${isHoriz ? "margin-top:6px;" : "margin-left:10px;display:inline-flex;flex-direction:column;"}
        font-size:12px;line-height:1.3;">
        <span class="step-label" style="font-weight:${isActive ? 600 : 400};color:${isActive ? "#333" : "#888"};">${step.label}</span>
        ${step.description ? `<span class="step-desc" style="color:#aaa;font-size:11px;margin-top:1px;">${step.description}</span>` : ""}
      </div>
    `;

    stepEl.style.display = isHoriz ? "flex" : "flex";
    stepEl.style.flexDirection = isHoriz ? "column" : "row";
    stepEl.style.alignItems = isHoriz ? "center" : "flex-start";

    if (opts.clickable) {
      stepEl.addEventListener("click", () => options.onStepClick?.(i));
    }

    stepEls.push(stepEl);
    el.appendChild(stepEl);
  }

  return {
    element: el,

    setCurrentStep(index: number) {
      opts.currentStep = Math.max(0, Math.min(index, options.steps.length - 1));
      render();
    },

    setCompletedStep(index: number) {
      opts.completedStep = Math.max(-1, Math.min(index, options.steps.length - 1));
      render();
    },

    getCurrentStep() { return opts.currentStep; },

    destroy() { el.remove(); },
  };

  function render(): void {
    for (let i = 0; i < options.steps.length; i++) {
      const isCompleted = i <= opts.completedStep;
      const isActive = i === opts.currentStep;
      const isError = opts.errorSteps.has(i);
      const stepEl = stepEls[i]!;
      const circle = stepEl.querySelector(".step-circle") as HTMLElement;
      const label = stepEl.querySelector(".step-label") as HTMLElement;

      if (circle) {
        circle.style.background = isCompleted ? colors.fg : isActive ? "#fff" : "#f5f5f5";
        circle.style.borderColor = isError ? "#dc2626" : isCompleted ? colors.fg : isActive ? colors.fg : "#ddd";
        circle.style.color = isCompleted ? "#fff" : isError ? "#dc2626" : isActive ? colors.fg : "#999";
        circle.style.boxShadow = isActive ? `0 0 0 4px ${colors.bg}` : "none";
        circle.innerHTML = isCompleted ? "&#10003;" : String(i + 1);
      }
      if (label) {
        label.style.fontWeight = isActive ? "600" : "400";
        label.style.color = isActive ? "#333" : "#888";
      }

      // Update connector
      if (i > 0 && connectorEls[i - 1]) {
        connectorEls[i - 1]!.style.background = isCompleted ? colors.fg : "#e5e5e5";
      }
    }
  }
}

// --- Styles ---

function injectProgressStyles(): void {
  if (document.getElementById("progress-styles")) return;
  const style = document.createElement("style");
  style.id = "progress-styles";
  style.textContent = `
    @keyframes pbar-indeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(400%); }
    }
    @keyframes pbar-stripes {
      from { background-position: 0 0; }
      to { background-position: 32px 0; }
    }
  `;
  document.head.appendChild(style);
}
