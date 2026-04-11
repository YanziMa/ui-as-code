/**
 * Form Wizard: Multi-step form with step navigation, validation per step,
 * progress indicator, optional steps, step summaries, keyboard navigation,
 * confirmation screen, and accessibility.
 */

// --- Types ---

export interface WizardStep {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Step description/subtitle */
  description?: string;
  /** Optional icon (emoji, SVG) */
  icon?: string;
  /** Step content (HTML element or render function returning HTMLElement) */
  content: HTMLElement | (() => HTMLElement);
  /** Validation function — return error message or null if valid */
  validate?: () => string | null | Promise<string | null>;
  /** Is this step optional? */
  optional?: boolean;
  /** Disable this step? */
  disabled?: boolean;
  /** Called when entering this step */
  onEnter?: () => void;
  /** Called when leaving this step */
  onLeave?: () => void | Promise<void>;
  /** Custom label for "Next" button on this step */
  nextLabel?: string;
  /** Show summary of data collected so far? */
  showSummary?: boolean;
}

export interface WizardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Steps in order */
  steps: WizardStep[];
  /** Initial step index (0-based) */
  initialStep?: number;
  /** Show step numbers? */
  showStepNumbers?: boolean;
  /** Show progress bar? */
  showProgressBar?: boolean;
  /** Show step indicators/dots? */
  showStepIndicators?: boolean;
  /** Orientation of step indicators ("horizontal" | "vertical") */
  indicatorOrientation?: "horizontal" | "vertical";
  /** Label for Next button */
  nextLabel?: string;
  /** Label for Previous button */
  prevLabel?: string;
  /** Label for Finish/Submit button */
  finishLabel?: string;
  /** Label for Cancel button */
  cancelLabel?: string;
  /** Show cancel button? */
  showCancel?: boolean;
  /** Callback on step change */
  onStepChange?: (stepIndex: number, step: WizardStep) => void;
  /** Callback on finish (all steps complete) */
  onFinish?: (data: Record<string, unknown>) => void | Promise<void>;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Callback on validation error */
  onValidationError?: (stepIndex: number, errorMessage: string) => void;
  /** Confirm before navigating away from a step with unsaved changes? */
  confirmLeave?: () => boolean | Promise<boolean>;
  /** Animation duration for transitions (ms) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
}

export interface WizardInstance {
  element: HTMLElement;
  getCurrentStep: () => number;
  getTotalSteps: () => number;
  goToStep: (index: number) => Promise<boolean>;
  next: () => Promise<boolean>;
  prev: () => void;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
  getStepData: () => Record<string, unknown>;
  setStepData: (key: string, value: unknown) => void;
  destroy: () => void;
}

// --- Main Class ---

export class FormWizardManager {
  create(options: WizardOptions): WizardInstance {
    const opts = {
      initialStep: options.initialStep ?? 0,
      showStepNumbers: options.showStepNumbers ?? true,
      showProgressBar: options.showProgressBar ?? true,
      showStepIndicators: options.showStepIndicators ?? true,
      indicatorOrientation: options.indicatorOrientation ?? "horizontal",
      nextLabel: options.nextLabel ?? "Next",
      prevLabel: options.prevLabel ?? "Previous",
      finishLabel: options.finishLabel ?? "Finish",
      cancelLabel: options.cancelLabel ?? "Cancel",
      showCancel: options.showCancel ?? true,
      animationDuration: options.animationDuration ?? 250,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("FormWizard: container not found");

    let currentStep = opts.initialStep;
    let stepData: Record<string, unknown> = {};
    let destroyed = false;

    container.className = `form-wizard ${opts.className}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;color:#374151;
      display:flex;flex-direction:column;height:100%;
    `;

    // Progress bar
    const progressBarEl = document.createElement("div");
    progressBarEl.className = "fw-progress-bar";
    progressBarEl.style.cssText = `
      width:100%;height:3px;background:#e5e7eb;border-radius:2px;overflow:hidden;
      ${opts.showProgressBar ? "" : "display:none;"}
    `;
    const progressFill = document.createElement("div");
    progressFill.className = "fw-progress-fill";
    progressFill.style.cssText = `
      height:100%;background:#4338ca;transition:width ${opts.animationDuration}ms ease;
      border-radius:2px;width:${((currentStep + 1) / opts.steps.length) * 100}%;
    `;
    progressBarEl.appendChild(progressFill);
    container.appendChild(progressBarEl);

    // Main area: step indicators + content
    const mainArea = document.createElement("div");
    mainArea.style.cssText = `display:flex;flex:1;min-height:0;${opts.indicatorOrientation === "vertical" ? "flex-direction:row;" : "flex-direction:column;"}`;
    container.appendChild(mainArea);

    // Step indicators
    const indicatorsArea = document.createElement("div");
    indicatorsArea.className = "fw-indicators";
    indicatorsArea.style.cssText = `
      display:flex;${opts.indicatorOrientation === "vertical"
        ? "flex-direction:column;gap:4px;padding:16px 12px;border-right:1px solid #e5e7eb;min-width:180px;"
        : "flex-direction:row;gap:0;padding:16px 0;border-bottom:1px solid #e5e7eb;"}
      ${opts.showStepIndicators ? "" : "display:none;"}
    `;
    mainArea.appendChild(indicatorsArea);

    // Content area
    const contentArea = document.createElement("div");
    contentArea.className = "fw-content";
    contentArea.style.cssText = `
      flex:1;padding:20px;overflow-y:auto;position:relative;min-height:200px;
    `;
    mainArea.appendChild(contentArea);

    // Footer with navigation buttons
    const footer = document.createElement("div");
    footer.className = "fw-footer";
    footer.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:14px 20px;border-top:1px solid #e5e7eb;background:#fafafa;
    `;
    container.appendChild(footer);

    // Left side: previous + cancel
    const leftBtns = document.createElement("div");
    leftBtns.style.cssText = "display:flex;gap:8px;";
    footer.appendChild(leftBtns);

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = opts.prevLabel;
    styleNavButton(prevBtn);
    prevBtn.addEventListener("click", () => instance.prev());
    leftBtns.appendChild(prevBtn);

    if (opts.showCancel) {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = opts.cancelLabel;
      cancelBtn.style.cssText = `
        padding:8px 18px;font-size:13px;border-radius:6px;background:none;
        border:1px solid #d1d5db;color:#6b7280;cursor:pointer;font-weight:500;
        transition:all 0.15s;
      `;
      cancelBtn.addEventListener("click", () => { opts.onCancel?.(); });
      cancelBtn.addEventListener("mouseenter", () => { cancelBtn.style.borderColor = "#9ca3af"; cancelBtn.style.color = "#374151"; });
      cancelBtn.addEventListener("mouseleave", () => { cancelBtn.style.borderColor = "#d1d5db"; cancelBtn.style.color = "#6b7280"; });
      leftBtns.appendChild(cancelBtn);
    }

    // Right side: next / finish
    const rightBtns = document.createElement("div");
    rightBtns.style.cssText = "display:flex;gap:8px;";
    footer.appendChild(rightBtns);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = opts.nextLabel;
    stylePrimaryButton(nextBtn);
    rightBtns.appendChild(nextBtn);

    function styleNavButton(btn: HTMLButtonElement): void {
      btn.style.cssText = `
        padding:8px 18px;font-size:13px;border-radius:6px;background:#fff;
        border:1px solid #d1d5db;color:#374151;cursor:pointer;font-weight:500;
        transition:all 0.15s;display:flex;align-items:center;gap:4px;
      `;
      btn.addEventListener("mouseenter", () => { btn.style.background = "#f9fafb"; btn.style.borderColor = "#9ca3af"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "#fff"; btn.style.borderColor = "#d1d5db"; });
    }

    function stylePrimaryButton(btn: HTMLButtonElement): void {
      btn.style.cssText = `
        padding:8px 24px;font-size:13px;border-radius:6px;background:#4338ca;
        border:none;color:#fff;cursor:pointer;font-weight:600;
        transition:all 0.15s;display:flex;align-items:center;gap:4px;
      `;
      btn.addEventListener("mouseenter", () => { btn.style.background="#3730a3"; });
      btn.addEventListener("mouseleave", () => { btn.style.background="#4338ca"; });
    }

    // --- Render Functions ---

    function render(): void {
      renderIndicators();
      renderContent();
      updateButtons();
      updateProgress();
    }

    function renderIndicators(): void {
      indicatorsArea.innerHTML = "";

      for (let i = 0; i < opts.steps.length; i++) {
        const step = opts.steps[i]!;
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const isFuture = i > currentStep;

        const item = document.createElement("div");
        item.style.cssText = opts.indicatorOrientation === "vertical"
          ? `display:flex;align-items:center;gap:10px;padding:8px 6px;cursor:pointer;border-radius:6px;transition:background 0.15s;${isCurrent ? "background:#eef2ff;" : ""}`
          : `flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;`;

        // Connector line (not after last item)
        if (i < opts.steps.length - 1 && opts.indicatorOrientation === "vertical") {
          item.style.borderLeft = isCompleted ? "2px solid #4338ca" : "2px solid #e5e7eb";
          item.style.marginLeft = "11px";
          item.style.paddingBottom = "4px";
        } else if (i < opts.steps.length - 1 && opts.indicatorOrientation === "horizontal") {
          const connector = document.createElement("div");
          connector.style.cssText = `
            position:absolute;top:12px;left:calc(50% + 14px);width:calc(100% - 28px);height:2px;
            background:${isCompleted ? "#4338ca" : "#e5e7eb"};
          `;
          item.style.position = "relative";
          item.appendChild(connector);
        }

        // Circle/number
        const circle = document.createElement("div");
        circle.style.cssText = `
          width:24px;height:24px;border-radius:50%;display:flex;align-items:center;
          justify-content:center;font-size:11px;font-weight:600;flex-shrink:0;z-index:1;
          ${isCompleted ? "background:#4338ca;color:#fff;" :
            isCurrent ? "background:#4338ca;color:#fff;box-shadow:0 0 0 4px rgba(67,56,202,0.2);" :
            isFuture ? "background:#e5e7eb;color:#9ca3af;" : ""}
          ${step.disabled ? "opacity:0.4;cursor:not-allowed;" : "cursor:pointer;"}
        `;
        if (isCompleted) circle.innerHTML = "&#x2713;";
        else if (opts.showStepNumbers) circle.textContent = String(i + 1);
        else if (step.icon) circle.innerHTML = step.icon;
        else circle.textContent = String(i + 1);
        item.appendChild(circle);

        // Label
        const label = document.createElement("span");
        label.textContent = step.title;
        label.style.cssText = `
          font-size:${opts.indicatorOrientation === "vertical" ? "13" : "11"}px;
          font-weight:${isCurrent ? "600" : "400"};
          color:${isCurrent ? "#111827" : isCompleted ? "#4338ca" : "#9ca3af"};
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          ${opts.indicatorOrientation === "vertical" ? "text-align:left;" : "text-align:center;"}
        `;
        item.appendChild(label);

        // Click to navigate to completed or current step
        if (!step.disabled && (isCompleted || isCurrent)) {
          item.addEventListener("click", () => instance.goToStep(i));
        }

        indicatorsArea.appendChild(item);
      }
    }

    function renderContent(): void {
      contentArea.innerHTML = "";

      const step = opts.steps[currentStep];
      if (!step) return;

      // Error message area
      const errorArea = document.createElement("div");
      errorArea.className = "fw-error";
      errorArea.id = "fw-error-area";
      errorArea.style.cssText = "display:none;margin-bottom:12px;padding:8px 12px;background:#fee2e2;color:#991b1b;border-radius:6px;font-size:13px;";
      contentArea.appendChild(errorArea);

      // Step header
      if (step.title || step.description) {
        const header = document.createElement("div");
        header.className = "fw-step-header";
        header.style.cssText = "margin-bottom:20px;";
        if (step.title) {
          const titleEl = document.createElement("h2");
          titleEl.textContent = step.title;
          titleEl.style.cssText = "font-size:18px;font-weight:700;color:#111827;margin:0 0 4px;";
          header.appendChild(titleEl);
        }
        if (step.description) {
          const descEl = document.createElement("p");
          descEl.textContent = step.description;
          descEl.style.cssText = "font-size:13px;color:#6b7280;margin:0;";
          header.appendChild(descEl);
        }
        contentArea.appendChild(header);
      }

      // Step content
      const contentEl = typeof step.content === "function" ? step.content() : step.content;
      contentEl.style.display = "block";
      contentArea.appendChild(contentEl);

      // Summary (if requested)
      if (step.showSummary && Object.keys(stepData).length > 0) {
        const summary = document.createElement("div");
        summary.className = "fw-summary";
        summary.style.cssText = `
          margin-top:20px;padding:16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
        `;
        const summaryTitle = document.createElement("h4");
        summaryTitle.textContent = "Summary so far";
        summaryTitle.style.cssText = "font-size:14px;font-weight:600;margin:0 0 10px;color:#374151;";
        summary.appendChild(summaryTitle);
        for (const [key, value] of Object.entries(stepData)) {
          const row = document.createElement("div");
          row.style.cssText = "display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #f0f0f0;";
          row.innerHTML = `<span style="color:#6b7280;">${key}</span><span style="font-weight:500;">${String(value)}</span>`;
          summary.appendChild(row);
        }
        contentArea.appendChild(summary);
      }

      // Animate entry
      contentArea.style.opacity = "0";
      contentArea.style.transform = "translateY(8px)";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          contentArea.style.transition = `opacity ${opts.animationDuration}ms ease, transform ${opts.animationDuration}ms ease`;
          contentArea.style.opacity = "1";
          contentArea.style.transform = "translateY(0)";
        });
      });

      // Call onEnter
      step.onEnter?.();
    }

    function updateButtons(): void {
      const step = opts.steps[currentStep];
      const isLast = currentStep >= opts.steps.length - 1;

      prevBtn.disabled = currentStep === 0;
      prevBtn.style.opacity = currentStep === 0 ? "0.4" : "";
      prevBtn.style.cursor = currentStep === 0 ? "not-allowed" : "";

      if (isLast) {
        nextBtn.textContent = opts.finishLabel;
      } else {
        nextBtn.textContent = step?.nextLabel ?? opts.nextLabel;
      }
    }

    function updateProgress(): void {
      const pct = ((currentStep + 1) / opts.steps.length) * 100;
      progressFill.style.width = `${pct}%`;
    }

    function showError(message: string): void {
      const errEl = document.getElementById("fw-error-area");
      if (errEl) {
        errEl.textContent = message;
        errEl.style.display = "block";
      }
    }

    function hideError(): void {
      const errEl = document.getElementById("fw-error-area");
      if (errEl) errEl.style.display = "none";
    }

    // --- Navigation ---

    async function goTo(index: number): Promise<boolean> {
      if (index < 0 || index >= opts.steps.length || index === currentStep) return false;
      const targetStep = opts.steps[index];
      if (targetStep?.disabled) return false;

      // Validate current step before leaving
      const currentStepDef = opts.steps[currentStep];
      if (currentStepDef?.validate) {
        hideError();
        const err = await currentStepDef.validate();
        if (err) {
          showError(err);
          opts.onValidationError?.(currentStep, err);
          return false;
        }
      }

      // Confirm leave
      if (opts.confirmLeave) {
        try {
          const canLeave = await opts.confirmLeave();
          if (!canLeave) return false;
        } catch { return false; }
      }

      // Call onLeave
      if (currentStepDef?.onLeave) await currentStepDef.onLeave();

      currentStep = index;
      render();
      opts.onStepChange?.(currentStep, targetStep!);
      return true;
    }

    // Next button handler
    nextBtn.addEventListener("click", async () => {
      if (instance.isLastStep()) {
        // Final validation
        hideError();
        let valid = true;
        for (let i = 0; i < opts.steps.length; i++) {
          const s = opts.steps[i];
          if (s?.validate) {
            const err = await s.validate();
            if (err) {
              valid = false;
              await instance.goToStep(i);
              showError(err);
              opts.onValidationError?.(i, err);
              break;
            }
          }
        }
        if (valid) {
          opts.onFinish?.(stepData);
        }
      } else {
        await instance.next();
      }
    });

    // Keyboard navigation
    container.addEventListener("keydown", async (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          if (instance.isLastStep()) nextBtn.click();
          else await instance.next();
        }
      } else if (e.key === "ArrowLeft") {
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault();
          instance.prev();
        }
      }
    });

    // Initial render
    render();

    const instance: WizardInstance = {
      element: container,

      getCurrentStep() { return currentStep; },
      getTotalSteps() { return opts.steps.length; },

      goToStep: goTo,

      async next(): Promise<boolean> {
        return goTo(currentStep + 1);
      },

      prev() {
        if (currentStep > 0) goTo(currentStep - 1);
      },

      isFirstStep() { return currentStep === 0; },
      isLastStep() { return currentStep >= opts.steps.length - 1; },

      getStepData() { return { ...stepData }; },

      setStepData(key: string, value: unknown) {
        stepData[key] = value;
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a form wizard */
export function createFormWizard(options: WizardOptions): WizardInstance {
  return new FormWizardManager().create(options);
}
