/**
 * Progress Stepper: Multi-step indicator with step labels, status tracking,
 * clickable navigation, animations, vertical/horizontal layout, and
 * step descriptions.
 */

// --- Types ---

export type StepStatus = "pending" | "active" | "completed" | "error" | "skipped";
export type StepperOrientation = "horizontal" | "vertical";
export type StepperVariant = "default" | "dots" | "numbers" | "icons";

export interface StepItem {
  /** Unique identifier */
  id: string;
  /** Step label/title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon (emoji or text) */
  icon?: string;
  /** Override status (auto-calculated from currentStep otherwise) */
  status?: StepStatus;
  /** Whether step is clickable for navigation */
  clickable?: boolean;
  /** Custom data payload */
  data?: Record<string, unknown>;
}

export interface ProgressStepperOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Array of step definitions */
  steps: StepItem[];
  /** Current active step index (0-based) */
  currentStep?: number;
  /** Layout orientation */
  orientation?: StepperOrientation;
  /** Visual variant */
  variant?: StepperVariant;
  /** Show step descriptions? */
  showDescriptions?: boolean;
  /** Show step numbers in circles? */
  showNumbers?: boolean;
  /** Allow clicking completed/active steps to navigate? */
  clickToNavigate?: boolean;
  /** Show error state styling */
  showError?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Color for completed steps */
  completedColor?: string;
  /** Color for active step */
  activeColor?: string;
  /** Color for pending steps */
  pendingColor?: string;
  /** Color for connector lines */
  lineColor?: string;
  /** Callback on step change */
  onStepChange?: (stepIndex: number, stepId: string) => void;
  /** Callback on step click (before navigation) */
  onStepClick?: (stepIndex: number, stepId: string) => boolean | void;
  /** Custom CSS class */
  className?: string;
}

export interface ProgressStepperInstance {
  element: HTMLElement;
  getCurrentStep: () => number;
  setCurrentStep: (index: number) => void;
  next: () => void;
  prev: () => void;
  getSteps: () => StepItem[];
  updateStep: (id: string, updates: Partial<StepItem>) => void;
  setStepStatus: (id: string, status: StepStatus) => void;
  getTotalSteps: () => number;
  destroy: () => void;
}

// --- Main Factory ---

export function createProgressStepper(options: ProgressStepperOptions): ProgressStepperInstance {
  const opts = {
    currentStep: options.currentStep ?? 0,
    orientation: options.orientation ?? "horizontal",
    variant: options.variant ?? "default",
    showDescriptions: options.showDescriptions ?? true,
    showNumbers: options.showNumbers ?? true,
    clickToNavigate: options.clickToNavigate ?? true,
    showError: options.showError ?? true,
    animationDuration: options.animationDuration ?? 300,
    completedColor: options.completedColor ?? "#4338ca",
    activeColor: options.activeColor ?? "#4338ca",
    pendingColor: options.pendingColor ?? "#d1d5db",
    lineColor: options.lineColor ?? "#e5e7eb",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ProgressStepper: container not found");

  let currentIndex = Math.max(0, Math.min(opts.steps.length - 1, opts.currentStep));
  let destroyed = false;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `progress-stepper ps-${opts.orientation} ${opts.className}`;
  wrapper.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;
    ${opts.orientation === "horizontal"
      ? "display:flex;align-items:flex-start;gap:0;width:100%;"
      : "display:flex;flex-direction:column;gap:0;"
    }
  `;
  container.appendChild(wrapper);

  function render(): void {
    wrapper.innerHTML = "";

    for (let i = 0; i < opts.steps.length; i++) {
      const step = opts.steps[i]!;
      const status = step.status ?? getAutoStatus(i);
      const isLast = i === opts.steps.length - 1;

      // Step item container
      const stepEl = document.createElement("div");
      stepEl.className = `ps-step ps-step-${status}`;
      stepEl.dataset.stepId = step.id;
      stepEl.dataset.stepIndex = String(i);

      if (opts.orientation === "horizontal") {
        stepEl.style.cssText = `
          display:flex;flex:1;align-items:flex-start;position:relative;
          ${isLast ? "" : ""}
        `;
      } else {
        stepEl.style.cssText = `
          display:flex;flex-direction:row;align-items:flex-start;gap:12px;
          position:relative;padding:8px 0;
        `;
      }

      // Connector line (before this step)
      if (i > 0) {
        const connector = createConnector(i, status);
        if (opts.orientation === "horizontal") {
          // Horizontal: line before the circle
          stepEl.style.paddingLeft = "24px";
          connector.style.position = "absolute";
          connector.style.left = "-50%";
          connector.style.top = "16px";
          connector.style.width = "100%";
          stepEl.appendChild(connector);
        } else {
          // Vertical: line above the circle
          connector.style.marginLeft = "15px";
          connector.style.marginTop = "-8px";
          stepEl.appendChild(connector);
        }
      }

      // Step marker (circle/dot/number/icon)
      const marker = createMarker(step, i, status);
      if (opts.orientation === "horizontal") {
        stepEl.appendChild(marker);
      } else {
        stepEl.appendChild(marker);
      }

      // Step content (title + description)
      const content = document.createElement("div");
      content.className = "ps-content";

      if (opts.orientation === "horizontal") {
        content.style.cssText = `
          margin-left:10px;margin-top:2px;min-width:80px;
          flex:1;text-align:${i === 0 ? "left" : isLast ? "right" : "center"};
        `;
      } else {
        content.style.cssText = "flex:1;padding-top:2px;";
      }

      const title = document.createElement("div");
      title.className = "ps-title";
      title.style.cssText = `
        font-size:13px;font-weight:${status === "active" ? "600" : "500"};
        color:${status === "pending" ? "#9ca3af" : status === "error" ? "#ef4444" : "#111827"};
        transition:color ${opts.animationDuration}ms ease;
      `;
      title.textContent = step.title;
      content.appendChild(title);

      if (opts.showDescriptions && step.description && (status === "active" || status === "completed")) {
        const desc = document.createElement("div");
        desc.className = "ps-description";
        desc.style.cssText = "font-size:11px;color:#9ca3af;margin-top:2px;line-height:1.4;";
        desc.textContent = step.description;
        content.appendChild(desc);
      }

      stepEl.appendChild(content);

      // Click handler
      const canClick = opts.clickToNavigate &&
        (step.clickable !== false) &&
        (status === "completed" || status === "active");

      if (canClick) {
        stepEl.style.cursor = "pointer";
        stepEl.addEventListener("click", () => handleStepClick(i));
        stepEl.addEventListener("mouseenter", () => { stepEl.style.opacity = "0.85"; });
        stepEl.addEventListener("mouseleave", () => { stepEl.style.opacity = ""; });
      }

      wrapper.appendChild(stepEl);
    }
  }

  function getAutoStatus(index: number): StepStatus {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "active";
    return "pending";
  }

  function createConnector(index: number, _currentStatus: StepStatus): HTMLElement {
    const el = document.createElement("div");
    el.className = "ps-connector";

    const prevStatus = opts.steps[index - 1]?.status ?? getAutoStatus(index - 1);
    const isCompletedLine = prevStatus === "completed" || prevStatus === "skipped";

    if (opts.orientation === "horizontal") {
      el.style.cssText = `
        height:2px;background:${isCompletedLine ? opts.completedColor : opts.lineColor};
        top:16px;transition:background ${opts.animationDuration}ms ease;
      `;
    } else {
      el.style.cssText = `
        width:2px;height:20px;background:${isCompletedLine ? opts.completedColor : opts.lineColor};
        transition:background ${opts.animationDuration}ms ease;
      `;
    }

    return el;
  }

  function createMarker(step: StepItem, index: number, status: StepStatus): HTMLElement {
    const size = opts.variant === "dots" ? 10 : opts.variant === "numbers" ? 32 : 32;
    const el = document.createElement("div");
    el.className = "ps-marker";

    switch (opts.variant) {
      case "dots":
        el.style.cssText = `
          width:${size}px;height:${size}px;border-radius:50%;
          background:${status === "completed" ? opts.completedColor : status === "active" ? opts.activeColor : opts.pendingColor};
          border:2px solid ${status === "active" ? opts.activeColor : status === "completed" ? opts.completedColor : opts.pendingColor};
          flex-shrink:0;transition:all ${opts.animationDuration}ms ease;
          ${status === "active" ? `box-shadow:0 0 0 4px ${opts.activeColor}20;` : ""}
        `;
        break;

      case "numbers": {
        el.style.cssText = `
          width:${size}px;height:${size}px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:13px;font-weight:600;flex-shrink:0;
          border:2px solid ${status === "error" ? "#ef4444" : status === "completed" || status === "active" ? opts.completedColor : opts.pendingColor};
          color:${status === "completed" || status === "active" ? "#fff" : status === "error" ? "#ef4444" : "#9ca3af"};
          background:${status === "completed" || status === "active" ? opts.completedColor : "transparent"};
          transition:all ${opts.animationDuration}ms ease;
          ${status === "active" ? `box-shadow:0 0 0 4px ${opts.activeColor}20;` : ""}
        `;
        if (status === "completed") {
          el.innerHTML = "&#10003;"; // checkmark
        } else if (status === "error") {
          el.innerHTML = "&#10007;"; // x mark
        } else {
          el.textContent = String(index + 1);
        }
        break;
      }

      case "icons": {
        el.style.cssText = `
          width:${size}px;height:${size}px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;flex-shrink:0;border:2px solid transparent;
          background:${status === "completed" || status === "active"
            ? opts.completedColor
            : status === "error" ? "#fef2f2" : "#f9fafb"};
          color:${status === "completed" || status === "active" ? "#fff" : status === "error" ? "#ef4444" : "#9ca3af"};
          transition:all ${opts.animationDuration}ms ease;
          ${status === "active" ? `box-shadow:0 0 0 4px ${opts.activeColor}20;` : ""}
        `;
        if (status === "completed") {
          el.innerHTML = "&#10003;";
        } else if (status === "error") {
          el.innerHTML = "&#10007;";
        } else if (step.icon) {
          el.textContent = step.icon;
        } else {
          el.textContent = String(index + 1);
        }
        break;
      }

      default: {
        // default variant
        el.style.cssText = `
          width:${size}px;height:${size}px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:13px;font-weight:600;flex-shrink:0;
          border:2px solid ${status === "error" ? "#ef4444" : status === "completed" || status === "active" ? opts.completedColor : opts.pendingColor};
          color:${status === "completed" || status === "active" ? "#fff" : status === "error" ? "#ef4444" : "#9ca3af"};
          background:${status === "completed" || status === "active" ? opts.completedColor : "transparent"};
          transition:all ${opts.animationDuration}ms ease;
          ${status === "active" ? `box-shadow:0 0 0 4px ${opts.activeColor}20;` : ""}
        `;
        if (status === "completed") {
          el.innerHTML = "&#10003;";
        } else if (status === "error") {
          el.innerHTML = "&#10007;";
        } else if (step.icon) {
          el.textContent = step.icon;
        } else if (opts.showNumbers) {
          el.textContent = String(index + 1);
        }
        break;
      }
    }

    return el;
  }

  function handleStepClick(index: number): void {
    const step = opts.steps[index]!;

    // Call callback - if it returns false, cancel navigation
    const result = opts.onStepClick?.(index, step.id);
    if (result === false) return;

    currentIndex = index;
    render();
    opts.onStepChange?.(currentIndex, step.id);
  }

  // Initial render
  render();

  const instance: ProgressStepperInstance = {
    element: wrapper,

    getCurrentStep() { return currentIndex; },

    setCurrentStep(index: number) {
      currentIndex = Math.max(0, Math.min(opts.steps.length - 1, index));
      render();
      opts.onStepChange?.(currentIndex, opts.steps[currentIndex]?.id ?? "");
    },

    next() {
      if (currentIndex < opts.steps.length - 1) {
        instance.setCurrentStep(currentIndex + 1);
      }
    },

    prev() {
      if (currentIndex > 0) {
        instance.setCurrentStep(currentIndex - 1);
      }
    },

    getSteps() { return [...opts.steps]; },

    updateStep(id: string, updates: Partial<StepItem>) {
      const idx = opts.steps.findIndex((s) => s.id === id);
      if (idx >= 0) Object.assign(opts.steps[idx]!, updates);
      render();
    },

    setStepStatus(id: string, status: StepStatus) {
      instance.updateStep(id, { status });
    },

    getTotalSteps() { return opts.steps.length; },

    destroy() {
      destroyed = true;
      wrapper.remove();
    },
  };

  return instance;
}
