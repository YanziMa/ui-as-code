/**
 * Wizard: Multi-step form wizard with step panels, form validation,
 * progress indicator, step transitions with animations, summary review,
 * conditional branching, and accessibility.
 */

// --- Types ---

export type WizardStepStatus = "pending" | "active" | "completed" | "error" | "skipped";

export interface WizardStep {
  /** Step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Optional description */
  description?: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Whether this step is optional/skippable */
  optional?: boolean;
  /** Render function for step content — returns DOM element */
  render: () => HTMLElement | string;
  /** Validation function — return true or error message string */
  validate?: () => boolean | string | Promise<boolean | string>;
  /** Conditional: only show if this returns true */
  condition?: () => boolean;
  /** Called when entering this step */
  onEnter?: () => void;
  /** Called when leaving this step */
  onLeave?: () => void;
}

export interface WizardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Step configurations */
  steps: WizardStep[];
  /** Initial active step index */
  initialStep?: number;
  /** Show progress bar at top */
  showProgress?: boolean;
  /** Show step numbers in header */
  showStepNumbers?: boolean;
  /** Show descriptions in header */
  showDescriptions?: boolean;
  /** Allow skipping optional steps */
  allowSkip?: boolean;
  /** Allow clicking completed steps to go back */
  allowClickBack?: boolean;
  /** Animation duration for step transitions (ms) */
  animationDuration?: number;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Orientation of the step indicator */
  orientation?: "horizontal" | "vertical";
  /** Callback when step changes */
  onStepChange?: (stepIndex: number, stepId: string, direction: "next" | "prev" | "jump") => void;
  /** Callback before step change — return false to prevent */
  beforeChange?: (from: number, to: number) => boolean | Promise<boolean>;
  /** Callback when all steps completed */
  onComplete?: (data: Record<string, unknown>) => void;
  /** Callback on cancellation */
  onCancel?: () => void;
  /** Custom labels */
  labels?: {
    next?: string;
    prev?: string;
    submit?: string;
    cancel?: string;
    skip?: string;
    reviewing?: string;
  };
  /** Custom CSS class */
  className?: string;
}

export interface WizardInstance {
  /** Root element */
  element: HTMLElement;
  /** Current step index */
  getCurrentStep: () => number;
  /** All step statuses */
  getStatuses: () => WizardStepStatus[];
  /** Navigate to a specific step */
  goToStep: (index: number) => Promise<boolean>;
  /** Go to next step */
  next: () => Promise<boolean>;
  /** Go to previous step */
  prev: () => Promise<boolean>;
  /** Collect data from all steps */
  getData: () => Record<string, unknown>;
  /** Set data for a specific step */
  setData: (stepId: string, data: unknown) => void;
  /** Mark a step as complete */
  markComplete: (index: number) => void;
  /** Mark a step as error */
  markError: (index: number, message?: string) => void;
  /** Reset wizard to initial state */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class WizardManager {
  create(options: WizardOptions): WizardInstance {
    const opts = {
      initialStep: options.initialStep ?? 0,
      showProgress: options.showProgress ?? true,
      showStepNumbers: options.showStepNumbers ?? true,
      showDescriptions: options.showDescriptions ?? true,
      allowSkip: options.allowSkip ?? true,
      allowClickBack: options.allowClickBack ?? true,
      animationDuration: options.animationDuration ?? 250,
      size: options.size ?? "md",
      orientation: options.orientation ?? "horizontal",
      labels: {
        next: "Next",
        prev: "Previous",
        submit: "Submit",
        cancel: "Cancel",
        skip: "Skip",
        reviewing: "Review",
        ...options.labels,
      },
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Wizard: container not found");

    container.className = `wizard wizard-${opts.size} wizard-${opts.orientation} ${opts.className ?? ""}`;

    // Filter visible steps based on conditions
    function getVisibleSteps(): WizardStep[] {
      return options.steps.filter((s) => s.condition?.() ?? true);
    }

    let visibleSteps = getVisibleSteps();
    let currentStep = opts.initialStep;
    let statuses: WizardStepStatus[] = visibleSteps.map((_, i) =>
      i === Math.min(opts.initialStep, visibleSteps.length - 1) ? "active" : "pending"
    );
    let stepData: Record<string, unknown> = {};
    let destroyed = false;

    // Size config
    const sizeMap = {
      sm: { circle: 24, fontSize: 11, gap: 16, padding: "16px", titleSize: "13px" },
      md: { circle: 32, fontSize: 13, gap: 24, padding: "24px", titleSize: "15px" },
      lg: { circle: 40, fontSize: 14, gap: 32, padding: "32px", titleSize: "17px" },
    };
    const sz = sizeMap[opts.size];

    // --- Render ---

    function render(): void {
      container.innerHTML = "";

      // Re-evaluate conditions
      visibleSteps = getVisibleSteps();
      while (currentStep >= visibleSteps.length && currentStep > 0) currentStep--;

      container.style.cssText = `
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        background: #fff; border-radius: 12px;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        overflow: hidden;
      `;

      // Progress bar
      if (opts.showProgress && visibleSteps.length > 1) {
        const progBar = document.createElement("div");
        progBar.className = "wizard-progress";
        progBar.style.cssText = `
          height: 3px; background: #f3f4f6; width: 100%;
        `;
        const progFill = document.createElement("div");
        progFill.className = "wizard-progress-fill";
        const pct = visibleSteps.length > 1
          ? ((statuses.filter((s) => s === "completed").length) / (visibleSteps.length - 1)) * 100
          : 0;
        progFill.style.cssText = `
          height: 100%; background: linear-gradient(90deg, #4f46e5, #7c3aed);
          transition: width ${opts.animationDuration}ms ease;
          width: ${Math.min(100, pct)}%;
        `;
        progBar.appendChild(progFill);
        container.appendChild(progBar);
      }

      // Header: step indicators
      const header = document.createElement("div");
      header.className = "wizard-header";
      header.style.cssText = `
        display: ${opts.orientation === "horizontal" ? "flex" : "flex"};
        flex-direction: ${opts.orientation === "horizontal" ? "row" : "column"};
        align-items: ${opts.orientation === "horizontal" ? "flex-start" : "flex-start"};
        gap: ${sz.gap}px;
        padding: ${sz.padding};
        border-bottom: 1px solid #f3f4f6;
      `;

      for (let i = 0; i < visibleSteps.length; i++) {
        const step = visibleSteps[i]!;
        const status = statuses[i] ?? "pending";
        const isActive = i === currentStep;

        const stepEl = document.createElement("div");
        stepEl.className = "wizard-step-indicator";
        stepEl.dataset.stepIndex = String(i);

        const isH = opts.orientation === "horizontal";
        stepEl.style.cssText = isH
          ? `display:flex;flex-direction:column;align-items:center;flex:1;position:relative;${i > 0 ? "margin-left:" + sz.gap + "px;" : ""}`
          : `display:flex;align-items:center;gap:12px;position:relative;${i > 0 ? "margin-top:" + sz.gap + "px;" : ""}`;

        // Connector line
        if (i > 0) {
          const conn = document.createElement("div");
          conn.className = "wizard-connector";
          const prevDone = (statuses[i - 1] ?? "pending") === "completed" || (statuses[i - 1] ?? "pending") === "skipped";
          conn.style.cssText = isH
            ? `position:absolute;height:2px;background:${prevDone ? "#6366f1" : "#e5e7eb"};top:${sz.circle / 2}px;right:50%;width:100%;transition:background 0.3s;`
            : `position:absolute;width:2px;background:${prevDone ? "#6366f1" : "#e5e7eb"};left:${sz.circle / 2}px;top:0;height:100%;transition:background 0.3s;`;
          stepEl.appendChild(conn);
        }

        // Circle
        const circle = document.createElement("div");
        circle.className = "wizard-circle";
        const cs = getCircleStyle(status, isActive);
        circle.style.cssText = `
          width:${sz.circle}px;height:${sz.circle}px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:${Math.round(sz.circle * 0.4)}px;font-weight:600;
          border:2px solid ${cs.borderColor};background:${cs.bg};
          color:${cs.color};flex-shrink:0;transition:all 0.3s ease;z-index:1;
          cursor:${opts.allowClickBack && (status === "completed" || status === "skipped") ? "pointer" : "default"};
        `;
        if (status === "completed") {
          circle.innerHTML = `<svg width="${sz.circle * 0.45}" height="${sz.circle * 0.45}" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
        } else if (status === "error") {
          circle.innerHTML = `<svg width="${sz.circle * 0.45}" height="${sz.circle * 0.45}" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
        } else if (step.icon && !opts.showStepNumbers) {
          circle.textContent = step.icon;
        } else if (opts.showStepNumbers) {
          circle.textContent = String(i + 1);
        }
        stepEl.appendChild(circle);

        // Label
        const labelWrap = document.createElement("div");
        labelWrap.style.cssText = isH ? "margin-top:6px;text-align:center;max-width:120px;" : "";
        const title = document.createElement("div");
        title.style.cssText = `
          font-weight:${isActive ? "600" : "400"};font-size:${sz.fontSize}px;
          color:${isActive ? "#111827" : status === "error" ? "#dc2626" : status === "completed" ? "#6366f1" : "#9ca3af"};
          transition:color 0.3s;line-height:1.3;
        `;
        title.textContent = step.title;
        labelWrap.appendChild(title);

        if (step.description && opts.showDescriptions) {
          const desc = document.createElement("div");
          desc.style.cssText = `font-size:${Math.max(sz.fontSize - 2, 10)}px;color:#9ca3af;margin-top:1px;line-height:1.3;`;
          desc.textContent = step.description;
          labelWrap.appendChild(desc);
        }

        if (step.optional) {
          const badge = document.createElement("span");
          badge.style.cssText = `font-size:10px;color:#9ca3af;border:1px solid #e5e7eb;border-radius:3px;padding:0 3px;margin-left:4px;`;
          badge.textContent = "Optional";
          title.appendChild(badge);
        }

        stepEl.appendChild(labelWrap);
        header.appendChild(stepEl);

        // Click handler
        if (opts.allowClickBack && (status === "completed" || status === "skipped")) {
          circle.addEventListener("click", () => instance.goToStep(i));
        }
      }

      container.appendChild(header);

      // Content area
      const contentArea = document.createElement("div");
      contentArea.className = "wizard-content";
      contentArea.style.cssText = `padding:${sz.padding};min-height:200px;`;

      const activeStep = visibleSteps[currentStep];
      if (activeStep) {
        activeStep.onEnter?.();
        const rendered = activeStep.render();
        if (typeof rendered === "string") {
          contentArea.innerHTML = rendered;
        } else {
          contentArea.appendChild(rendered);
        }
      }

      container.appendChild(contentArea);

      // Error message area
      const errorArea = document.createElement("div");
      errorArea.className = "wizard-error-area";
      errorArea.id = "wizard-error";
      errorArea.style.cssText = `padding:0 ${sz.padding} 8px;`;
      if (statuses[currentStep] === "error") {
        const errMsg = document.createElement("div");
        errMsg.style.cssText = "color:#dc2626;font-size:13px;display:flex;align-items:center;gap:6px;";
        errMsg.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1v6m0 4v.01M15 8A7 7 0 111 8a7 7 0 0114 0z" stroke="#dc2626" stroke-width="1.5"/></svg><span>${stepData[`__error_${activeStep?.id}`] ?? "Please fix errors before continuing."}</span>`;
        errorArea.appendChild(errMsg);
      }
      container.appendChild(errorArea);

      // Footer / Navigation
      const footer = document.createElement("div");
      footer.className = "wizard-footer";
      footer.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        padding:12px ${sz.padding};border-top:1px solid #f3f4f6;
        background:#fafbfc;
      `;

      // Left side: cancel + skip
      const leftBtns = document.createElement("div");
      leftBtns.style.cssText = "display:flex;gap:8px;";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "wizard-btn-cancel";
      cancelBtn.textContent = opts.labels.cancel!;
      cancelBtn.style.cssText = `
        padding:7px 16px;font-size:13px;font-weight:500;border-radius:6px;
        border:1px solid #d1d5db;background:#fff;color:#6b7280;cursor:pointer;
        transition:background 0.15s;
      `;
      cancelBtn.addEventListener("click", () => { opts.onCancel?.(); });
      cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.background = "#f9fafb"; });
      cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.background = "#fff"; });
      leftBtns.appendChild(cancelBtn);

      if (visibleSteps[currentStep]?.optional && opts.allowSkip) {
        const skipBtn = document.createElement("button");
        skipBtn.type = "button";
        skipBtn.className = "wizard-btn-skip";
        skipBtn.textContent = opts.labels.skip!;
        skipBtn.style.cssText = `
          padding:7px 16px;font-size:13px;font-weight:500;border-radius:6px;
          border:1px solid #d1d5db;background:#fff;color:#6b7280;cursor:pointer;
          transition:background 0.15s;
        `;
        skipBtn.addEventListener("click", async () => {
          statuses[currentStep] = "skipped";
          if (currentStep < visibleSteps.length - 1) {
            await instance.next();
          }
        });
        skipBtn.addEventListener("mouseenter", () => { skipBtn.style.background = "#f9fafb"; });
        skipBtn.addEventListener("mouseleave", () => { skipBtn.style.background = "#fff"; });
        leftBtns.appendChild(skipBtn);
      }

      footer.appendChild(leftBtns);

      // Right side: prev / next / submit
      const rightBtns = document.createElement("div");
      rightBtns.style.cssText = "display:flex;gap:8px;";

      const isLastStep = currentStep === visibleSteps.length - 1;
      const isFirstStep = currentStep === 0;

      if (!isFirstStep) {
        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.className = "wizard-btn-prev";
        prevBtn.textContent = opts.labels.prev!;
        prevBtn.style.cssText = `
          padding:7px 20px;font-size:13px;font-weight:500;border-radius:6px;
          border:1px solid #d1d5db;background:#fff;color:#374151;cursor:pointer;
          transition:background 0.15s;
        `;
        prevBtn.addEventListener("click", () => { instance.prev(); });
        prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "#f9fafb"; });
        prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = "#fff"; });
        rightBtns.appendChild(prevBtn);
      }

      const actionBtn = document.createElement("button");
      actionBtn.type = "button";
      actionBtn.className = isLastStep ? "wizard-btn-submit" : "wizard-btn-next";
      actionBtn.textContent = isLastStep ? opts.labels.submit! : opts.labels.next!;
      actionBtn.style.cssText = `
        padding:7px 20px;font-size:13px;font-weight:600;border-radius:6px;
        border:none;background:#4f46e5;color:#fff;cursor:pointer;
        transition:background 0.15s;box-shadow:0 1px 2px rgba(79,70,229,0.25);
      `;
      actionBtn.addEventListener("click", async () => {
        if (isLastStep) {
          await handleSubmit();
        } else {
          await instance.next();
        }
      });
      actionBtn.addEventListener("mouseenter", () => { actionBtn.style.background = "#4338ca"; });
      actionBtn.addEventListener("mouseleave", () => { actionBtn.style.background = "#4f46e5"; });
      rightBtns.appendChild(actionBtn);

      footer.appendChild(rightBtns);
      container.appendChild(footer);
    }

    function getCircleStyle(status: WizardStepStatus, isActive: boolean): {
      borderColor: string; bg: string; color: string;
    } {
      switch (status) {
        case "completed": return { borderColor: "#6366f1", bg: "#eef2ff", color: "#4338ca" };
        case "active":   return { borderColor: "#4338ca", bg: "#4338ca", color: "#fff" };
        case "error":    return { borderColor: "#dc2626", bg: "#fef2f2", color: "#dc2626" };
        case "skipped":  return { borderColor: "#d1d5db", bg: "#f9fafb", color: "#9ca3af" };
        default:         return { borderColor: "#d1d5db", bg: "#fff", color: "#9ca3af" };
      }
    }

    async function goToStep(index: number): Promise<boolean> {
      if (destroyed || index < 0 || index >= visibleSteps.length || index === currentStep) {
        return index === currentStep;
      }

      if (opts.beforeChange) {
        const allowed = await opts.beforeChange(currentStep, index);
        if (!allowed) return false;
      }

      // Validate current step if moving forward
      if (index > currentStep) {
        const curStep = visibleSteps[currentStep];
        if (curStep?.validate) {
          try {
            const result = await curStep.validate();
            if (result !== true) {
              statuses[currentStep] = "error";
              if (typeof result === "string") {
                stepData[`__error_${curStep.id}`] = result;
              }
              render();
              return false;
            }
          } catch {
            statuses[currentStep] = "error";
            render();
            return false;
          }
        }
        visibleSteps[currentStep]?.onLeave?.();
        statuses[currentStep] = "completed";
      } else {
        visibleSteps[currentStep]?.onLeave?.();
      }

      const direction = index > currentStep ? "next" : index < currentStep ? "prev" : "jump";
      currentStep = index;
      if (statuses[currentStep] !== "completed" && statuses[currentStep] !== "error") {
        statuses[currentStep] = "active";
      }

      render();
      opts.onStepChange?.(currentStep, visibleSteps[currentStep].id, direction);
      return true;
    }

    async function next(): Promise<boolean> {
      if (currentStep < visibleSteps.length - 1) {
        return goToStep(currentStep + 1);
      }
      return false;
    }

    async function prev(): Promise<boolean> {
      if (currentStep > 0) {
        return goToStep(currentStep - 1);
      }
      return false;
    }

    async function handleSubmit(): Promise<void> {
      // Validate final step
      const lastStep = visibleSteps[currentStep];
      if (lastStep?.validate) {
        const result = await lastStep.validate();
        if (result !== true) {
          statuses[currentStep] = "error";
          if (typeof result === "string") {
            stepData[`__error_${lastStep.id}`] = result;
          }
          render();
          return;
        }
      }
      statuses[currentStep] = "completed";
      lastStep?.onLeave?.();
      opts.onComplete?.(stepData);
    }

    // Initial render
    render();

    const instance: WizardInstance = {
      element: container,

      getCurrentStep() { return currentStep; },

      getStatuses() { return [...statuses]; },

      goToStep,

      async next(): Promise<boolean> { return next(); },

      async prev(): Promise<boolean> { return prev(); },

      getData() { return { ...stepData }; },

      setData(stepId: string, data: unknown) { stepData[stepId] = data; },

      markComplete(index: number) {
        if (index >= 0 && index < statuses.length) {
          statuses[index] = "completed";
          render();
        }
      },

      markError(index: number, message?: string) {
        if (index >= 0 && index < statuses.length) {
          statuses[index] = "error";
          if (message && visibleSteps[index]) {
            stepData[`__error_${visibleSteps[index]!.id}`] = message;
          }
          render();
        }
      },

      reset() {
        visibleSteps = getVisibleSteps();
        currentStep = Math.min(opts.initialStep, visibleSteps.length - 1);
        statuses = visibleSteps.map((_, i) =>
          i === currentStep ? "active" : "pending"
        );
        stepData = {};
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a wizard */
export function createWizard(options: WizardOptions): WizardInstance {
  return new WizardManager().create(options);
}
