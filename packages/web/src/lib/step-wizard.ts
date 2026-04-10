/**
 * Step Wizard: Multi-step form wizard with validation per step, progress indicators,
 * step navigation (next/prev/jump), animations, optional steps, summary/review step,
 * and persistence support.
 */

// --- Types ---

export interface WizardStep {
  /** Unique key */
  key: string;
  /** Step title */
  title: string;
  /** Step description/subtitle */
  description?: string;
  /** Step icon/emoji */
  icon?: string;
  /** Optional - can be skipped? */
  optional?: boolean;
  /** Validation function: returns error message or null if valid */
  validate?: () => string | Promise<string>;
  /** Content render function or HTML string */
  content: string | HTMLElement | (() => HTMLElement);
  /** Called when entering this step */
  onEnter?: () => void | Promise<void>;
  /** Called when leaving this step */
  onLeave?: () => void | Promise<void>;
}

export interface WizardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Wizard steps in order */
  steps: WizardStep[];
  /** Initial step index (default: 0) */
  initialStep?: number;
  /** Show step numbers? */
  showStepNumbers?: boolean;
  /** Show step titles in nav? */
  showTitles?: boolean;
  /** Vertical or horizontal stepper orientation */
  orientation?: "horizontal" | "vertical";
  /** Allow jumping to any completed step? */
  allowJumpToCompleted?: boolean;
  /** Allow jumping to next unvisited step? */
  allowJumpForward?: boolean;
  /** Show "Finish" button on last step vs "Next" */
  finishButtonLabel?: string;
  /** Next button label */
  nextButtonLabel?: string;
  /** Prev button label */
  prevButtonLabel?: string;
  /** Cancel button label */
  cancelButtonLabel?: string;
  /** Show cancel button? */
  showCancel?: boolean;
  /** Callback when wizard completes (all steps validated) */
  onComplete?: (data: Record<string, unknown>) => void | Promise<void>;
  /** Callback when wizard is cancelled */
  onCancel?: () => void;
  /** Callback on step change */
  onStepChange?: (stepIndex: number, step: WizardStep) => void;
  /** Callback on validation error */
  onValidationError?: (stepIndex: number, error: string) => void;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
  /** Persist current step in localStorage? */
  persistKey?: string;
  /** Summary step at the end? */
  showSummary?: boolean;
  /** Summary render function */
  renderSummary?: (data: Record<string, unknown>) => string | HTMLElement;
}

export interface WizardInstance {
  element: HTMLElement;
  /** Current step index (0-based) */
  getCurrentStep: () => number;
  /** Total steps */
  getTotalSteps: () => number;
  /** Go to specific step */
  goTo: (index: number) => Promise<boolean>;
  /** Go to next step */
  next: () => Promise<boolean>;
  /** Go to previous step */
  prev: () => void;
  /** Get all collected data */
  getData: () => Record<string, unknown>;
  /** Set data for a step */
  setData: (key: string, value: unknown) => void;
  /** Validate current step */
  validateCurrent: () => Promise<string | null>;
  /** Check if on last step */
  isLastStep: () => boolean;
  /** Check if on first step */
  isFirstStep: () => number;
  /** Reset wizard */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class StepWizardManager {
  create(options: WizardOptions): WizardInstance {
    const opts = {
      initialStep: options.initialStep ?? 0,
      showStepNumbers: options.showStepNumbers ?? true,
      showTitles: options.showTitles ?? true,
      orientation: options.orientation ?? "horizontal",
      allowJumpToCompleted: options.allowJumpToCompleted ?? true,
      allowJumpForward: options.allowJumpForward ?? false,
      finishButtonLabel: options.finishButtonLabel ?? "Finish",
      nextButtonLabel: options.nextButtonLabel ?? "Next",
      prevButtonLabel: options.prevButtonLabel ?? "Back",
      cancelButtonLabel: options.cancelButtonLabel ?? "Cancel",
      showCancel: options.showCancel ?? true,
      animationDuration: options.animationDuration ?? 300,
      persistKey: options.persistKey,
      showSummary: options.showSummary ?? false,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("StepWizard: container not found");

    container.className = `wizard ${opts.className ?? ""}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;color:#374151;display:flex;flex-direction:column;height:100%;
    `;

    const steps = [...options.steps];
    let currentIndex = opts.initialStep;
    let visitedSteps = new Set<number>([currentIndex]);
    let stepData: Record<string, unknown> = {};
    let destroyed = false;

    // Restore persisted state
    if (opts.persistKey) {
      try {
        const saved = localStorage.getItem(`wizard:${opts.persistKey}`);
        if (saved) currentIndex = parseInt(saved, 10) || currentIndex;
        const savedData = localStorage.getItem(`wizard:${opts.persistKey}:data`);
        if (savedData) stepData = JSON.parse(savedData);
      } catch {}
    }

    // --- Build UI ---

    // Stepper navigation
    const stepper = document.createElement("div");
    stepper.className = "wizard-stepper";
    stepper.style.cssText = `
      display:flex;${opts.orientation === "horizontal" ? "" : "flex-direction:column;"}
      gap:0;padding:20px 0;margin-bottom:auto;
    `;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const isVisited = visitedSteps.has(i);
      const isActive = i === currentIndex;
      const isLast = i === steps.length - 1;

      const stepEl = document.createElement("div");
      stepEl.className = "wiz-step";
      stepEl.dataset.index = String(i);
      stepEl.style.cssText = `
        display:flex;${opts.orientation === "horizontal"
          ? "flex:1;align-items:center;"
          : "align-items:flex-start;padding:8px 0;"}
        cursor:${this.canNavigateTo(i) ? "pointer" : "not-allowed"};
        opacity:${isActive ? "1" : isVisited ? "0.7" : "0.4"};
        transition:opacity 0.2s;
      `;

      // Connector line
      if (!isLast && opts.orientation === "horizontal") {
        const connector = document.createElement("div");
        connector.style.cssText = `
          flex:1;height:2px;background:${i < currentIndex ? "#6366f1" : "#e5e7eb"};
          margin:0 8px;border-radius:1px;transition:background 0.3s;
        `;
        stepEl.appendChild(connector);
      } else if (!isLast && opts.orientation === "vertical") {
        const connector = document.createElement("div");
        connector.style.cssText = `
          width:2px;flex:1;background:${i < currentIndex ? "#6366f1" : "#e5e7eb"};
          margin:8px 0;border-radius:1px;transition:background 0.3s;
        `;
        stepEl.appendChild(connector);
      }

      // Step circle/number
      const circle = document.createElement("div");
      circle.style.cssText = `
        width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
        justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;
        background:${isActive ? "#4338ca" : isVisited ? "#e0e7ff" : "#f3f4f6"};
        color:${isActive || isVisited ? "#fff" : "#9ca3af"};
        border:2px solid ${isActive ? "#4338ca" : isVisited ? "#a5b4fc" : "transparent"};
        transition:all 0.2s;z-index:1;
      `;
      if (opts.showStepNumbers) {
        circle.textContent = String(i + 1);
      } else if (step.icon) {
        circle.textContent = step.icon;
        circle.style.fontSize = "16px";
      }
      stepEl.appendChild(circle);

      // Step info
      if (opts.showTitles) {
        const info = document.createElement("div");
        info.style.cssText = `${opts.orientation === "horizontal" ? "margin-left:12px;" : "margin-top:8px;margin-left:0;"}`;
        const title = document.createElement("div");
        title.textContent = step.title;
        title.style.cssText = `font-weight:${isActive ? "700" : "500"};font-size:13px;color:${isActive ? "#111827" : "#6b7280"};`;
        info.appendChild(title);
        if (step.description) {
          const desc = document.createElement("div");
          desc.textContent = step.description;
          desc.style.cssText = "font-size:11px;color:#9ca3af;margin-top:2px;";
          info.appendChild(desc);
        }
        stepEl.appendChild(info);
      }

      // Click handler
      if (this.canNavigateTo(i)) {
        stepEl.addEventListener("click", () => instance.goTo(i));
      }

      stepper.appendChild(stepEl);
    }

    container.appendChild(stepper);

    // Content area
    const contentArea = document.createElement("div");
    contentArea.className = "wizard-content";
    contentArea.style.cssText = "flex:1;overflow:auto;padding:16px 0;position:relative;";
    container.appendChild(contentArea);

    // Footer with buttons
    const footer = document.createElement("div");
    footer.className = "wizard-footer";
    footer.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:16px 0;border-top:1px solid #e5e7eb;margin-top:auto;
    `;
    container.appendChild(footer);

    // Buttons
    const btnGroup = document.createElement("div");
    btnGroup.style.cssText = "display:flex;gap:8px;";

    if (opts.showCancel) {
      const cancelBtn = createBtn(opts.cancelButtonLabel, "secondary", () => { opts.onCancel?.(); });
      btnGroup.appendChild(cancelBtn);
    }

    const prevBtn = createBtn(opts.prevButtonLabel, "secondary", () => instance.prev(), false);
    btnGroup.appendChild(prevBtn);

    const nextBtn = createBtn(
      currentIndex >= steps.length - 1 ? opts.finishButtonLabel : opts.nextButtonLabel,
      "primary", () => instance.next(), true
    );
    btnGroup.appendChild(nextBtn);

    footer.appendChild(btnGroup);

    // Step counter
    const counter = document.createElement("span");
    counter.style.cssText = "font-size:12px;color:#9ca3af;";
    footer.appendChild(counter);

    // --- Helper methods ---

    function canNavigateTo(index: number): boolean {
      if (index < 0 || index >= steps.length) return false;
      if (index === currentIndex) return false;
      if (index < currentIndex) return true; // Always go back
      if (opts.allowJumpForward) return true;
      return opts.allowJumpToCompleted && visitedSteps.has(index);
    }

    function updateStepper(): void {
      const stepEls = stepper.querySelectorAll(".wiz-step");
      stepEls.forEach((el, i) => {
        const isVisited = visitedSteps.has(i);
        const isActive = i === currentIndex;
        el.style.opacity = isActive ? "1" : isVisited ? "0.7" : "0.4";

        const circle = el.querySelector("div:first-child") as HTMLElement;
        if (circle) {
          circle.style.background = isActive ? "#4338ca" : isVisited ? "#e0e7ff" : "#f3f4f6";
          circle.style.color = isActive || isVisited ? "#fff" : "#9ca3af";
          circle.style.borderColor = isActive ? "#4338ca" : isVisited ? "#a5b4fc" : "transparent";
        }
      });

      // Update connectors
      const connectors = stepper.querySelectorAll("div[style*='background']");
      connectors.forEach((c, i) => {
        if (i < currentIndex) c.style.background = "#6366f1";
        else c.style.background = "#e5e7eb";
      });

      // Update buttons
      const isLast = currentIndex >= steps.length - 1;
      nextBtn.textContent = isLast ? opts.finishButtonLabel : opts.nextButtonLabel;
      prevBtn.disabled = currentIndex <= 0;
      prevBtn.style.opacity = currentIndex <= 0 ? "0.4" : "1";

      counter.textContent = `Step ${currentIndex + 1} of ${steps.length}`;
    }

    async function renderContent(): Promise<void> {
      contentArea.innerHTML = "";
      contentArea.style.opacity = "0";

      const step = steps[currentIndex];

      // Summary step
      if (opts.showSummary && currentIndex >= steps.length) {
        if (opts.renderSummary) {
          const summary = opts.renderSummary(stepData);
          if (typeof summary === "string") contentArea.innerHTML = summary;
          else contentArea.appendChild(summary);
        } else {
          contentArea.innerHTML = `
            <div style="text-align:center;padding:32px;">
              <h3 style="color:#111827;">Complete!</h3>
              <p style="color:#6b7280;margin-top:8px;">Review your information below and click Finish to submit.</p>
            </div>
          `;
        }
      } else if (typeof step.content === "function") {
        contentArea.appendChild(step.content());
      } else if (typeof step.content === "string") {
        contentArea.innerHTML = step.content;
      } else {
        contentArea.appendChild(step.content);
      }

      requestAnimationFrame(() => { contentArea.style.opacity = "1"; });
    }

    function createBtn(label: string, variant: "primary" | "secondary", onClick: () => void, isPrimary = true): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText = `
        padding:8px 20px;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;
        border:1px solid transparent;transition:all 0.15s;
        ${variant === "primary"
          ? "background:#4338ca;color:#fff;"
          : "background:#fff;color:#374151;border-color:#d1d5db;"}
        ${isPrimary ? "" : ""}
      `;
      btn.addEventListener("click", onClick);
      btn.addEventListener("mouseenter", () => {
        if (variant === "primary") btn.style.background = "#3730a3";
        else { btn.style.background="#f9fafb"; btn.style.borderColor="#c6c6c6"; }
      });
      btn.addEventListener("mouseleave", () => {
        if (variant === "primary") btn.style.background = "#4338ca";
        else { btn.style.background="#fff"; btn.style.borderColor="#d1d5db"; }
      });
      return btn;
    }

    // --- Instance ---

    const instance: WizardInstance = {
      element: container,

      getCurrentStep: () => currentIndex,
      getTotalSteps: () => steps.length,

      async goTo(index: number): Promise<boolean> {
        if (!canNavigateTo(index)) return false;

        // Validate current step before leaving
        if (currentIndex !== index && currentIndex < steps.length) {
          const leaveError = await instance.validateCurrent();
          if (leaveError) {
            opts.onValidationError?.(currentIndex, leaveError);
            return false;
          }
          await steps[currentIndex].onLeave?.();
        }

        const oldIndex = currentIndex;
        currentIndex = index;
        visitedSteps.add(currentIndex);

        // Animate
        contentArea.style.opacity = "0";
        await new Promise((r) => setTimeout(r, opts.animationDuration / 2));

        await steps[currentIndex].onEnter?.();
        await renderContent();
        updateStepper();

        opts.onStepChange?.(currentIndex, steps[currentIndex]);

        // Persist
        if (opts.persistKey) {
          try {
            localStorage.setItem(`wizard:${opts.persistKey}`, String(currentIndex));
            localStorage.setItem(`wizard:${opts.persistKey}:data`, JSON.stringify(stepData));
          } catch {}
        }

        return true;
      },

      async next(): Promise<boolean> {
        if (currentIndex >= steps.length - 1) {
          // Finish
          const allValid = await instance.validateCurrent();
          if (!allValid) return false;

          if (opts.showSummary) {
            return instance.goTo(steps.length); // Go to summary
          }

          await opts.onComplete?.(stepData);
          return true;
        }
        return instance.goTo(currentIndex + 1);
      },

      prev() {
        if (currentIndex > 0) instance.goTo(currentIndex - 1);
      },

      getData: () => ({ ...stepData }),
      setData(key: string, value: unknown) { stepData[key] = value; },

      async validateCurrent(): Promise<string | null> {
        const step = steps[currentIndex];
        if (step?.validate) {
          const error = await step.validate();
          if (error) return error;
        }
        return null;
      },

      isLastStep: () => currentIndex >= steps.length - 1,
      isFirstStep: () => currentIndex,

      reset() {
        currentIndex = 0;
        visitedSteps = new Set([0]);
        stepData = {};
        updateStepper();
        renderContent();
        if (opts.persistKey) {
          try { localStorage.removeItem(`wizard:${opts.persistKey}`); } catch {}
        }
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    // Initial render
    updateStepper();
    renderContent();

    return instance;
  }
}

/** Convenience: create a step wizard */
export function createStepWizard(options: WizardOptions): WizardInstance {
  return new StepWizardManager().create(options);
}
