/**
 * Progress Steps / Stepper: Multi-step wizard indicator with numbered steps,
 * connector lines, status states (pending/active/completed/error), descriptions,
 * clickable navigation, vertical/horizontal orientation, and animations.
 */

// --- Types ---

export type StepStatus = "pending" | "active" | "completed" | "error" | "skipped";

export interface StepItem {
  /** Step label */
  label: string;
  /** Optional description */
  description?: string;
  /** Status */
  status?: StepStatus;
  /** Optional icon (SVG string or emoji) */
  icon?: string;
  /** Clickable? */
  clickable?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface ProgressStepsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Step items */
  steps: StepItem[];
  /** Current active step index (0-based) */
  currentStep?: number;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Show step numbers? */
  showNumbers?: boolean;
  /** Show descriptions? */
  showDescriptions?: boolean;
  /** Show connector lines between steps? */
  showConnectors?: boolean;
  /** Allow clicking completed/pending steps to navigate? */
  clickable?: boolean;
  /** Label position for vertical mode ("right" or "bottom") */
  labelPosition?: "right" | "bottom";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Color for completed steps */
  completedColor?: string;
  /** Color for active step */
  activeColor?: string;
  /** Error color */
  errorColor?: string;
  /** Callback on step click */
  onStepClick?: (step: StepItem, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ProgressStepsInstance {
  element: HTMLElement;
  getCurrentStep: () => number;
  setCurrentStep: (index: number) => void;
  next: () => void;
  prev: () => void;
  setStepStatus: (index: number, status: StepStatus) => void;
  getSteps: () => StepItem[];
  destroy: () => void;
}

// --- Config ---

const SIZE_CONFIG: Record<string, { dotSize: number; fontSize: number; lineWidth: number }> = {
  sm: { dotSize: 24, fontSize: 11, lineWidth: 2 },
  md: { dotSize: 32, fontSize: 13, lineWidth: 2 },
  lg: { dotSize: 40, fontSize: 14, lineWidth: 3 },
};

// --- Main Factory ---

export function createProgressSteps(options: ProgressStepsOptions): ProgressStepsInstance {
  const opts = {
    currentStep: options.currentStep ?? 0,
    orientation: options.orientation ?? "horizontal",
    showNumbers: options.showNumbers ?? true,
    showDescriptions: options.showDescriptions ?? false,
    showConnectors: options.showConnectors ?? true,
    clickable: options.clickable ?? false,
    labelPosition: options.labelPosition ?? "bottom",
    size: options.size ?? "md",
    completedColor: options.completedColor ?? "#22c55e",
    activeColor: options.activeColor ?? "#6366f1",
    errorColor: options.errorColor ?? "#ef4444",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ProgressSteps: container not found");

  const sz = SIZE_CONFIG[opts.size];
  let steps = [...opts.steps];
  let destroyed = false;

  container.className = `progress-steps ps-${opts.orientation} ${opts.className}`;
  container.style.cssText = opts.orientation === "horizontal"
    ? `display:flex;align-items:flex-start;gap:0;`
    : `display:flex;flex-direction:column;gap:0;`;

  function getStepStatus(index: number): StepStatus {
    return steps[index]?.status ?? (index < opts.currentStep ? "completed" : index === opts.currentStep ? "active" : "pending");
  }

  function render(): void {
    container.innerHTML = "";

    if (opts.orientation === "horizontal") {
      renderHorizontal();
    } else {
      renderVertical();
    }
  }

  function renderHorizontal(): void {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex;align-items:flex-start;width:100%;";
    container.appendChild(wrapper);

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const status = getStepStatus(i);

      // Step column
      const col = document.createElement("div");
      col.style.cssText = "display:flex;flex-direction:column;align-items:center;flex:1;position:relative;";
      wrapper.appendChild(col);

      // Connector line (before this step, except first)
      if (opts.showConnectors && i > 0) {
        const lineWrapper = document.createElement("div");
        lineWrapper.style.cssText = `position:absolute;left:calc(-50% + ${sz.dotSize / 2}px);top:${sz.dotSize / 2}px;width:calc(100% - ${sz.dotSize}px);height:${sz.lineWidth}px;`;

        const prevStatus = getStepStatus(i - 1);
        const isCompletedLine = prevStatus === "completed" || prevStatus === "skipped";

        const line = document.createElement("div");
        line.style.cssText = `width:100%;height:100%;background:${isCompletedLine ? opts.completedColor : "#e5e7eb"};border-radius:${sz.lineWidth}px;transition:background 0.3s ease;`;
        lineWrapper.appendChild(line);
        col.appendChild(lineWrapper);
      }

      // Dot + content
      const stepEl = createStepElement(step, i, status);
      col.appendChild(stepEl);
    }
  }

  function renderVertical(): void {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const status = getStepStatus(i);

      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:flex-start;position:relative;";
      container.appendChild(row);

      // Left side: dot + connector
      const leftCol = document.createElement("div");
      leftCol.style.cssText = "display:flex;flex-direction:column;align-items:center;flex-shrink:0;";
      row.appendChild(leftCol);

      // Connector above (except first)
      if (opts.showConnectors && i > 0) {
        const vLine = document.createElement("div");
        const prevStatus = getStepStatus(i - 1);
        const isCompleted = prevStatus === "completed" || prevStatus === "skipped";
        vLine.style.cssText = `width:${sz.lineWidth}px;height:16px;background:${isCompleted ? opts.completedColor : "#e5e7eb"};border-radius:${sz.lineWidth}px;margin-bottom:4px;`;
        leftCol.appendChild(vLine);
      }

      // Dot
      const stepEl = createStepElement(step, i, status);
      // For vertical mode with right labels, adjust layout
      if (opts.labelPosition === "right") {
        const dotOnly = stepEl.querySelector(".ps-dot-wrapper");
        if (dotOnly) {
          leftCol.appendChild(dotOnly as HTMLElement);
          const labelPart = stepEl.querySelector(".ps-label-part");
          if (labelPart) row.appendChild(labelPart as HTMLElement);
          return; // skip default append
        }
      }
      leftCol.appendChild(stepEl);

      // Connector below (except last)
      if (opts.showConnectors && i < steps.length - 1) {
        const vLineBelow = document.createElement("div");
        const isCurrentCompleted = status === "completed" || status === "skipped";
        vLineBelow.style.cssText = `width:${sz.lineWidth}px;height:24px;background:${isCurrentCompleted ? opts.completedColor : "#e5e7eb"};border-radius:${sz.lineWidth}px;margin-top:4px;`;
        leftCol.appendChild(vLineBelow);
      }
    }
  }

  function createStepElement(step: StepItem, index: number, status: StepStatus): HTMLElement {
    const isClickable = opts.clickable && (step.clickable !== false);
    const isActive = status === "active";
    const isCompleted = status === "completed" || status === "skipped";
    const isError = status === "error";

    const el = document.createElement("div");
    el.className = "ps-step";
    el.dataset.index = String(index);
    el.style.cssText = `
      display:flex;${opts.orientation === "vertical" && opts.labelPosition === "right" ? "flex-direction:row;gap:12px;align-items:flex-start;" : "flex-direction:column;align-items:center;gap:6px;"}
      flex:1;cursor:${isClickable ? "pointer" : "default"};
      transition:opacity 0.2s;
    `;
    if (!isClickable && status === "pending") el.style.opacity = "0.5";

    // Dot wrapper
    const dotWrapper = document.createElement("div");
    dotWrapper.className = "ps-dot-wrapper";
    dotWrapper.style.cssText = `
      width:${sz.dotSize}px;height:${sz.dotSize}px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:${Math.floor(sz.dotSize * 0.4)}px;
      border:${sz.lineWidth}px solid ${isActive ? opts.activeColor : isCompleted ? opts.completedColor : isError ? opts.errorColor : "#d1d5db"};
      background:${isActive ? `${opts.activeColor}10` : isCompleted ? opts.completedColor : isError ? `${opts.errorColor}10` : "#fff"};
      color:${isActive ? opts.activeColor : isCompleted ? "#fff" : isError ? opts.errorColor : "#9ca3af"};
      transition:all 0.3s ease;flex-shrink:0;position:relative;z-index:1;
    `;

    // Dot content: icon, number, or error mark
    if (step.icon) {
      dotWrapper.innerHTML = step.icon;
      dotWrapper.style.fontSize = `${Math.floor(sz.dotSize * 0.45)}px`;
      dotWrapper.style.border = "none";
      if (isCompleted) dotWrapper.style.background = isCompleted ? opts.completedColor : "";
      if (isActive) dotWrapper.style.background = opts.activeColor;
      if (isError) dotWrapper.style.background = opts.errorColor;
      dotWrapper.style.color = isCompleted || isActive || isError ? "#fff" : "";
    } else if (isError) {
      dotWrapper.innerHTML = "&#10007;"; // ✗
    } else if (isCompleted && opts.showNumbers) {
      dotWrapper.innerHTML = "&#10003;"; // ✓
    } else if (opts.showNumbers) {
      dotWrapper.textContent = String(index + 1);
    }

    el.appendChild(dotWrapper);

    // Label part
    const labelPart = document.createElement("div");
    labelPart.className = "ps-label-part";
    labelPart.style.cssText = `
      text-align:${opts.orientation === "horizontal" ? "center" : "left"};
      max-width:${opts.orientation === "horizontal" ? "120px" : "200px"};
    `;

    // Label text
    const label = document.createElement("span");
    label.className = "ps-label";
    label.style.cssText = `
      font-size:${sz.fontSize}px;font-weight:${isActive ? "600" : "500"};
      color:${isActive ? opts.activeColor : isCompleted ? "#374151" : "#9ca3af"};
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;
      transition:color 0.3s ease;
    `;
    label.textContent = step.label;
    labelPart.appendChild(label);

    // Description
    if (step.description && opts.showDescriptions) {
      const desc = document.createElement("span");
      desc.className = "ps-description";
      desc.style.cssText = `font-size:11px;color:#9ca3af;margin-top:2px;display:block;line-height:1.3;`;
      desc.textContent = step.description;
      labelPart.appendChild(desc);
    }

    el.appendChild(labelPart);

    // Click handler
    if (isClickable) {
      el.addEventListener("click", () => opts.onStepClick?.(step, index));
      el.addEventListener("mouseenter", () => { if (!isActive) dotWrapper.style.borderColor = opts.activeColor; });
      el.addEventListener("mouseleave", () => {
        if (!isActive) dotWrapper.style.borderColor = isError ? opts.errorColor : isCompleted ? opts.completedColor : "#d1d5db";
      });
    }

    return el;
  }

  // Initial render
  render();

  const instance: ProgressStepsInstance = {
    element: container,

    getCurrentStep() { return opts.currentStep; },

    setCurrentStep(index: number) {
      if (index >= 0 && index < steps.length) {
        opts.currentStep = index;
        render();
      }
    },

    next() {
      if (opts.currentStep < steps.length - 1) {
        opts.currentStep++;
        render();
      }
    },

    prev() {
      if (opts.currentStep > 0) {
        opts.currentStep--;
        render();
      }
    },

    setStepStatus(index: number, status: StepStatus) {
      if (index >= 0 && index < steps.length) {
        steps[index] = { ...steps[index]!, status };
        render();
      }
    },

    getSteps() { return [...steps]; },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };

  return instance;
}
