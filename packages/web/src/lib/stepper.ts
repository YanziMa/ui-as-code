/**
 * Stepper / Wizard Component: Multi-step form wizard with horizontal/vertical layouts,
 * step status tracking (pending/active/completed/error), validation, step descriptions,
 * keyboard navigation, animated transitions, and accessibility.
 */

// --- Types ---

export type StepStatus = "pending" | "active" | "completed" | "error" | "skipped";

export interface StepConfig {
  /** Step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Whether this step can be skipped */
  optional?: boolean;
  /** Validation function — returns true if valid */
  validate?: () => boolean | Promise<boolean>;
}

export interface StepperOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Step configurations */
  steps: StepConfig[];
  /** Initial active step index (0-based) */
  initialStep?: number;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Allow clicking on completed steps to go back */
  allowClickBack?: boolean;
  /** Allow skipping optional steps */
  allowSkip?: boolean;
  /** Show step numbers */
  showStepNumbers?: boolean;
  /** Show step descriptions */
  showDescriptions?: boolean;
  /** Callback when step changes */
  onStepChange?: (stepIndex: number, stepId: string, direction: "next" | "prev" | "jump") => void;
  /** Callback before step change (return false to prevent) */
  beforeChange?: (from: number, to: number) => boolean | Promise<boolean>;
  /** Callback when all steps completed */
  onComplete?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface StepperInstance {
  element: HTMLElement;
  getCurrentStep: () => number;
  getSteps: () => StepStatus[];
  goToStep: (index: number) => Promise<boolean>;
  next: () => Promise<boolean>;
  prev: () => Promise<boolean>;
  markComplete: (index: number) => void;
  markError: (index: number) => void;
  reset: () => void;
  destroy: () => void;
}

// --- Main Class ---

export class StepperManager {
  create(options: StepperOptions): StepperInstance {
    const opts = {
      initialStep: options.initialStep ?? 0,
      orientation: options.orientation ?? "horizontal",
      size: options.size ?? "md",
      allowClickBack: options.allowClickBack ?? true,
      allowSkip: options.allowSkip ?? true,
      showStepNumbers: options.showStepNumbers ?? true,
      showDescriptions: options.showDescriptions ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Stepper: container element not found");

    container.className = `stepper stepper-${opts.orientation} stepper-${opts.size} ${opts.className ?? ""}`;

    // Size config
    const sizeMap = {
      sm: { circle: 24, fontSize: 11, gap: 16, lineWidth: 2 },
      md: { circle: 32, fontSize: 13, gap: 24, lineWidth: 2 },
      lg: { circle: 40, fontSize: 14, gap: 32, lineWidth: 3 },
    };
    const sz = sizeMap[opts.size];

    // State
    let currentStep = opts.initialStep;
    let statuses: StepStatus[] = options.steps.map((_, i) =>
      i === opts.initialStep ? "active" : "pending"
    );
    let destroyed = false;

    function render(): void {
      container.innerHTML = "";

      const isHorizontal = opts.orientation === "horizontal";
      container.style.cssText = isHorizontal
        ? `display:flex;align-items:flex-start;width:100%;`
        : `display:flex;flex-direction:column;width:100%;`;

      for (let i = 0; i < options.steps.length; i++) {
        const step = options.steps[i]!;
        const status = statuses[i]!;
        const isActive = i === currentStep;

        // Step wrapper
        const stepEl = document.createElement("div");
        stepEl.className = "stepper-step";
        stepEl.dataset.step = String(i);
        stepEl.style.cssText = isHorizontal
          ? `display:flex;flex-direction:column;align-items:center;flex:1;position:relative;${i > 0 ? "margin-left:" + (i === options.steps.length - 1 ? 0 : sz.gap) + "px;" : ""}`
          : `display:flex;align-items:flex-start;gap:12px;position:relative;${i > 0 ? "margin-top:" + sz.gap + "px;" : ""}`;

        // Connector line (before this step)
        if (i > 0) {
          const connector = document.createElement("div");
          connector.className = "stepper-connector";
          const prevCompleted = statuses[i - 1] === "completed" || statuses[i - 1] === "skipped";
          connector.style.cssText = isHorizontal
            ? `position:absolute;height:${sz.lineWidth}px;background:${prevCompleted ? "#6366f1" : "#e5e7eb"};top:${sz.circle / 2}px;right:50%;width:100%;transition:background 0.3s;`
            : `position:absolute;width:${sz.lineWidth}px;background:${prevCompleted ? "#6366f1" : "#e5e7eb"};left:${sz.circle / 2}px;bottom:100%;height:100%;transition:background 0.3s;`;
          stepEl.appendChild(connector);
        }

        // Circle indicator
        const circle = document.createElement("div");
        circle.className = "stepper-circle";
        const circleStyle = getCircleStyle(status, isActive);
        circle.style.cssText = `
          width:${sz.circle}px;height:${sz.circle}px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:${sz.fontSize}px;font-weight:600;
          border:2px solid ${circleStyle.borderColor};background:${circleStyle.bg};
          color:${circleStyle.color};flex-shrink:0;
          transition:all 0.3s ease;z-index:1;
          cursor:${opts.allowClickBack && (status === "completed" || status === "skipped") ? "pointer" : "default"};
        `;

        // Circle content
        if (status === "completed") {
          circle.innerHTML = `<svg width="${sz.circle * 0.5}" height="${sz.circle * 0.5}" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
        } else if (status === "error") {
          circle.innerHTML = `<svg width="${sz.circle * 0.5}" height="${sz.circle * 0.5}" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
        } else if (step.icon && !opts.showStepNumbers) {
          circle.textContent = step.icon;
        } else if (opts.showStepNumbers) {
          circle.textContent = String(i + 1);
        }
        stepEl.appendChild(circle);

        // Label
        const labelContainer = document.createElement("div");
        labelContainer.className = "stepper-label-container";
        labelContainer.style.cssText = isHorizontal
          ? `margin-top:6px;text-align:center;max-width:120px;`
          : ""; // vertical: just flows naturally

        const title = document.createElement("div");
        title.className = "stepper-title";
        title.style.cssText = `
          font-weight:${isActive ? "600" : "400"};font-size:${sz.fontSize}px;
          color:${isActive ? "#111827" : status === "error" ? "#dc2626" : status === "completed" ? "#6366f1" : "#9ca3af"};
          transition:color 0.3s;line-height:1.3;
        `;
        title.textContent = step.title;
        labelContainer.appendChild(title);

        if (step.description && opts.showDescriptions) {
          const desc = document.createElement("div");
          desc.className = "stepper-description";
          desc.style.cssText = `font-size:${Math.max(sz.fontSize - 2, 10)}px;color:#9ca3af;margin-top:2px;line-height:1.3;`;
          desc.textContent = step.description;
          labelContainer.appendChild(desc);
        }

        // Optional badge
        if (step.optional) {
          const badge = document.createElement("span");
          badge.style.cssText = `font-size:10px;color:#9ca3af;border:1px solid #e5e7eb;border-radius:3px;padding:0 3px;margin-left:4px;`;
          badge.textContent = "Optional";
          title.appendChild(badge);
        }

        stepEl.appendChild(labelContainer);
        container.appendChild(stepEl);

        // Click handler for navigating back
        if (opts.allowClickBack && (status === "completed" || status === "skipped")) {
          circle.style.cursor = "pointer";
          circle.addEventListener("click", () => instance.goToStep(i));
        }
      }
    }

    function getCircleStyle(status: StepStatus, isActive: boolean): {
      borderColor: string; bg: string; color: string;
    } {
      switch (status) {
        case "completed":
          return { borderColor: "#6366f1", bg: "#eef2ff", color: "#4338ca" };
        case "active":
          return { borderColor: "#4338ca", bg: "#4338ca", color: "#fff" };
        case "error":
          return { borderColor: "#dc2626", bg: "#fef2f2", color: "#dc2626" };
        case "skipped":
          return { borderColor: "#d1d5db", bg: "#f9fafb", color: "#9ca3af" };
        default:
          return { borderColor: "#d1d5db", bg: "#fff", color: "#9ca3af" };
      }
    }

    async function goToStep(index: number): Promise<boolean> {
      if (index < 0 || index >= options.steps.length) return false;
      if (index === currentStep) return true;

      // Check beforeChange hook
      if (opts.beforeChange) {
        const allowed = await opts.beforeChange(currentStep, index);
        if (!allowed) return false;
      }

      // Validate current step if moving forward
      if (index > currentStep) {
        const currentStepConfig = options.steps[currentStep];
        if (currentStepConfig?.validate) {
          const valid = await currentStepConfig.validate();
          if (!valid) {
            statuses[currentStep] = "error";
            render();
            return false;
          }
        }
        statuses[currentStep] = "completed";
      }

      const direction = index > currentStep ? "next" : index < currentStep ? "prev" : "jump";
      currentStep = index;
      if (statuses[currentStep] !== "completed" && statuses[currentStep] !== "error") {
        statuses[currentStep] = "active";
      }

      render();
      opts.onStepChange?.(currentStep, options.steps[currentStep].id, direction);

      // Check completion
      if (currentStep === options.steps.length - 1 && statuses[currentStep] === "completed") {
        opts.onComplete?.();
      }

      return true;
    }

    async function next(): Promise<boolean> {
      if (currentStep < options.steps.length - 1) {
        return goToStep(currentStep + 1);
      }
      // Mark final step as complete
      statuses[currentStep] = "completed";
      render();
      opts.onComplete?.();
      return true;
    }

    async function prev(): Promise<boolean> {
      if (currentStep > 0) {
        return goToStep(currentStep - 1);
      }
      return false;
    }

    // Initial render
    render();

    const instance: StepperInstance = {
      element: container,

      getCurrentStep() { return currentStep; },

      getSteps() { return [...statuses]; },

      goToStep,

      async next(): Promise<boolean> { return next(); },

      async prev(): Promise<boolean> { return prev(); },

      markComplete(index: number) {
        if (index >= 0 && index < statuses.length) {
          statuses[index] = "completed";
          render();
        }
      },

      markError(index: number) {
        if (index >= 0 && index < statuses.length) {
          statuses[index] = "error";
          render();
        }
      },

      reset() {
        currentStep = opts.initialStep;
        statuses = options.steps.map((_, i) =>
          i === opts.initialStep ? "active" : "pending"
        );
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a stepper/wizard */
export function createStepper(options: StepperOptions): StepperInstance {
  return new StepperManager().create(options);
}
