/**
 * Stepper Horizontal: Horizontal step indicator/wizard stepper with
 * step labels, descriptions, status indicators, clickable navigation,
 * progress bar, animations, error states, and responsive design.
 */

// --- Types ---

export type StepStatus = "pending" | "active" | "completed" | "error" | "skipped" | "disabled";

export interface StepConfig {
  /** Step title */
  title: string;
  /** Optional description */
  description?: string;
  /** Icon (emoji, SVG, or HTML) */
  icon?: string | HTMLElement;
  /** Status override (auto-calculated based on currentStep if not set) */
  status?: StepStatus;
  /** Error message for error status */
  error?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Optional click handler */
  onClick?: (step: number) => void;
}

export type StepperVariant = "default" | "dots" | "numbers" | "icons" | "lines";
export type StepperSize = "sm" | "md" | "lg";

export interface StepperHorizontalOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Step configurations */
  steps: StepConfig[];
  /** Current active step index (0-based) */
  currentStep?: number;
  /** Visual variant */
  variant?: StepperVariant;
  /** Size variant */
  size?: StepperSize;
  /** Allow clicking on completed/pending steps to navigate? */
  clickable?: boolean;
  /** Show step numbers? */
  showNumbers?: boolean;
  /** Show descriptions under each step? */
  showDescriptions?: boolean;
  /** Color for active/completed states */
  activeColor?: string;
  /** Color for pending state */
  pendingColor?: string;
  /** Line/connector color */
  lineColor?: string;
  /** Completed line color */
  completedLineColor?: string;
  /** Animation on step change? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Callback when step changes */
  onStepChange?: (step: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface StepperHorizontalInstance {
  element: HTMLElement;
  /** Get current step */
  getCurrentStep: () => number;
  /** Go to a specific step */
  goTo: (step: number) => void;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Update step config */
  updateStep: (index: number, config: Partial<StepConfig>) => void;
  /** Set error on a step */
  setError: (index: number, message: string) => void;
  /** Clear error on a step */
  clearError: (index: number) => void;
  /** Total steps count */
  getTotalSteps: () => number;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_ACTIVE_COLOR = "#6366f1";
const DEFAULT_PENDING_COLOR = "#d1d5db";
const STATUS_COLORS: Record<StepStatus, string> = {
  pending: "#d1d5db",
  active: "#6366f1",
  completed: "#10b981",
  error: "#ef4444",
  skipped: "#9ca3af",
  disabled: "#e5e7eb",
};

// --- Size Config ---

const SIZE_CONFIG: Record<StepperSize, {
  dotSize: number; fontSize: number; descFontSize: number; gap: number; lineHeight: number;
}> = {
  sm: { dotSize: 24, fontSize: 11, descFontSize: 9, gap: 16, lineHeight: 32 },
  md: { dotSize: 32, fontSize: 12, descFontSize: 10, gap: 24, lineHeight: 40 },
  lg: { dotSize: 40, fontSize: 14, descFontSize: 11, gap: 32, lineHeight: 48 },
};

// --- Main Factory ---

export function createStepperHorizontal(options: StepperHorizontalOptions): StepperHorizontalInstance {
  const opts = {
    currentStep: options.currentStep ?? 0,
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    clickable: options.clickable ?? true,
    showNumbers: options.showNumbers ?? false,
    showDescriptions: options.showDescriptions ?? false,
    activeColor: options.activeColor ?? DEFAULT_ACTIVE_COLOR,
    pendingColor: options.pendingColor ?? DEFAULT_PENDING_COLOR,
    lineColor: options.lineColor ?? "#e5e7eb",
    completedLineColor: options.completedLineColor ?? "#10b981",
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 400,
    onStepChange: options.onStepChange,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("StepperHorizontal: container not found");

  let steps = [...options.steps];
  let currentStep = Math.max(0, Math.min(opts.currentStep, steps.length - 1));
  let destroyed = false;

  const sc = SIZE_CONFIG[opts.size];

  // Root element
  const root = document.createElement("div");
  root.className = `stepper-horizontal sh-${opts.variant} sh-${opts.size} ${opts.className}`;
  root.style.cssText = `
    display:flex;align-items:flex-start;width:100%;
    font-family:-apple-system,sans-serif;padding:16px 0;
  `;
  container.appendChild(root);

  // --- Rendering ---

  function render(animate = false): void {
    root.innerHTML = "";

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const status = step.status ?? inferStatus(i);
      const isActive = i === currentStep;
      const isCompleted = i < currentStep;
      const isError = status === "error";
      const isDisabled = step.disabled || status === "disabled";

      // Step item container
      const item = document.createElement("div");
      item.className = `sh-item sh-status-${status} ${isActive ? "sh-active" : ""}`;
      item.dataset.stepIndex = String(i);
      item.style.cssText = `
        display:flex;flex-direction:column;align-items:center;
        flex:1;position:relative;min-width:0;
        opacity:${animate ? 0 : 1};transform:${animate ? "translateY(8px)" : ""};
        transition:opacity ${opts.animationDuration}ms ease,transform ${opts.animationDuration}ms ease;
      `;

      // Connector line (before this step)
      if (i > 0) {
        const connector = document.createElement("div");
        connector.className = "sh-connector";
        const prevCompleted = i - 1 < currentStep;
        connector.style.cssText = `
          position:absolute;top:${sc.dotSize / 2}px;right:50%;left:0;
          height:2px;background:${prevCompleted ? opts.completedLineColor : opts.lineColor};
          transition:background ${opts.animationDuration}ms ease;
          z-index:0;
        `;
        item.appendChild(connector);
      }

      // Dot / Circle / Number
      const marker = document.createElement("div");
      marker.className = "sh-marker";

      const color = isError ? STATUS_COLORS.error :
        isActive ? opts.activeColor :
        isCompleted ? STATUS_COLORS.completed :
        STATUS_COLORS.pending;

      marker.style.cssText = `
        width:${sc.dotSize}px;height:${sc.dotSize}px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        border:2px solid ${color};
        background:${isActive ? color + "18" : isCompleted ? color : "#fff"};
        color:${isActive || isCompleted ? "#fff" : color};
        font-size:${sc.dotSize * 0.38}px;font-weight:700;
        z-index:1;transition:all ${opts.animationDuration}ms ease;
        flex-shrink:0;
      `;

      // Marker content based on variant
      if (opts.variant === "icons" && step.icon) {
        if (typeof step.icon === "string") marker.innerHTML = step.icon;
        else marker.appendChild(step.icon.cloneNode(true));
        marker.style.fontSize = `${sc.dotSize * 0.45}px`;
        marker.style.border = "none";
      } else if (opts.variant === "dots") {
        // Just a dot — no content needed
        marker.innerHTML = "";
      } else if (opts.showNumbers || opts.variant === "numbers") {
        if (isError) marker.innerHTML = "\u2717"; // ✗
        else if (isCompleted) marker.innerHTML = "\u2713"; // ✓
        else marker.textContent = String(i + 1);
      } else if (step.icon) {
        if (typeof step.icon === "string") marker.innerHTML = step.icon;
        else marker.appendChild(step.icon.cloneNode(true));
      } else {
        if (isError) marker.innerHTML = "\u2717";
        else if (isCompleted) marker.innerHTML = "\u2713";
        else marker.textContent = String(i + 1);
      }

      item.appendChild(marker);

      // Label
      const labelArea = document.createElement("div");
      labelArea.className = "sh-label-area";
      labelArea.style.cssText = `
        margin-top:8px;text-align:center;width:100%;
        min-width:0;padding:0 4px;
      `;

      const titleLabel = document.createElement("div");
      titleLabel.className = "sh-title";
      titleLabel.style.cssText = `
        font-size:${sc.fontSize}px;font-weight:${isActive ? "700" : "500"};
        color:${isActive ? "#111827" : isDisabled ? "#d1d5db" : "#6b7280"};
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        max-width:100%;
      `;
      titleLabel.textContent = step.title;
      labelArea.appendChild(titleLabel);

      // Description
      if (opts.showDescriptions && step.description) {
        const descEl = document.createElement("div");
        descEl.className = "sh-description";
        descEl.style.cssText = `
          font-size:${sc.descFontSize}px;color:#9ca3af;margin-top:2px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;
        `;
        descEl.textContent = step.description;
        labelArea.appendChild(descEl);
      }

      // Error message
      if (isError && step.error) {
        const errEl = document.createElement("div");
        errEl.className = "sh-error-msg";
        errEl.style.cssText = `font-size:${sc.descFontSize}px;color:#ef4444;margin-top:2px;`;
        errEl.textContent = step.error;
        labelArea.appendChild(errEl);
      }

      item.appendChild(labelArea);

      // Click handler
      if (opts.clickable && !isDisabled && !isError) {
        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
          if (i !== currentStep) goTo(i);
          step.onClick?.(i);
        });
        item.addEventListener("mouseenter", () => {
          if (!isDisabled) marker.style.transform = "scale(1.15)";
        });
        item.addEventListener("mouseleave", () => {
          marker.style.transform = "";
        });
      }

      root.appendChild(item);

      // Animate in with stagger
      if (animate) {
        setTimeout(() => {
          item.style.opacity = "1";
          item.style.transform = "";
        }, i * 60);
      }
    }
  }

  function inferStatus(index: number): StepStatus {
    if (steps[index]?.status) return steps[index]!.status!;
    if (index < currentStep) return "completed";
    if (index === currentStep) return "active";
    return "pending";
  }

  // Initial render
  render(opts.animate);

  // --- Instance ---

  const instance: StepperHorizontalInstance = {
    element: root,

    getCurrentStep() { return currentStep; },

    getTotalSteps() { return steps.length; },

    goTo(step: number) {
      if (step < 0 || step >= steps.length || step === currentStep) return;
      if (steps[step]?.disabled) return;
      const oldStep = currentStep;
      currentStep = step;
      render(opts.animate);
      if (oldStep !== step) opts.onStepChange?.(currentStep);
    },

    next() {
      if (currentStep < steps.length - 1) goTo(currentStep + 1);
    },

    prev() {
      if (currentStep > 0) goTo(currentStep - 1);
    },

    updateStep(index: number, config: Partial<StepConfig>) {
      if (index >= 0 && index < steps.length) {
        steps[index] = { ...steps[index]!, ...config };
        render(false);
      }
    },

    setError(index: number, message: string) {
      updateStep(index, { status: "error", error: message });
    },

    clearError(index: number) {
      updateStep(index, { status: undefined, error: undefined });
    },

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
