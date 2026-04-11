/**
 * Stepper Utilities: Step wizard/progress indicator with vertical/horizontal
 * orientation, step validation, navigation controls, ARIA attributes,
 * animated transitions, and optional step descriptions.
 */

// --- Types ---

export type StepperOrientation = "horizontal" | "vertical";
export type StepStatus = "pending" | "active" | "completed" | "error" | "skipped";

export interface StepItem {
  /** Unique key */
  id: string;
  /** Step title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon (HTML string) */
  icon?: string;
  /** Optional step content (HTMLElement or HTML) */
  content?: HTMLElement | string;
  /** Whether this step can be skipped */
  optional?: boolean;
}

export interface StepperOptions {
  /** Steps in order */
  steps: StepItem[];
  /** Orientation */
  orientation?: StepperOrientation;
  /** Initial active step index */
  initialStep?: number;
  /** Show step numbers */
  showStepNumbers?: boolean;
  /** Show step content panels */
  showContent?: boolean;
  /** Allow clicking on completed steps to go back */
  clickableCompleted?: boolean;
  /** Allow skipping optional steps */
  allowSkip?: boolean;
  /** Animation duration for transitions (ms) */
  animationDuration?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when step changes */
  onStepChange?: (stepIndex: number, step: StepItem) => void;
  /** Called before step change — return false to prevent */
  beforeStepChange?: (from: number, to: number) => boolean | Promise<boolean>;
  /** Validate current step before proceeding */
  validateStep?: (stepIndex: number) => boolean | Promise<boolean>;
}

export interface StepperInstance {
  /** The root element */
  el: HTMLElement;
  /** Get current step index */
  getCurrentStep: () => number;
  /** Go to next step */
  next: () => Promise<void>;
  /** Go to previous step */
  prev: () => void;
  /** Go to a specific step */
  goTo: (index: number) => Promise<void>;
  /** Set step status manually */
  setStepStatus: (index: number, status: StepStatus) => void;
  /** Get all step statuses */
  getStepStatuses: () => StepStatus[];
  /** Get total steps count */
  getTotalSteps: () => number;
  /** Check if can go next */
  canNext: () => boolean;
  /** Check if can go prev */
  canPrev: () => void;
  /** Reset to first step */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a step stepper/wizard component.
 *
 * @example
 * ```ts
 * const stepper = createStepper({
 *   steps: [
 *     { id: "s1", title: "Account" },
 *     { id: "s2", title: "Profile" },
 *     { id: "s3", title: "Review" },
 *   ],
 *   onStepChange: (idx) => console.log("Step:", idx),
 * });
 * ```
 */
export function createStepper(options: StepperOptions): StepperInstance {
  const {
    steps,
    orientation = "horizontal",
    initialStep = 0,
    showStepNumbers = true,
    showContent = true,
    clickableCompleted = true,
    allowSkip = false,
    animationDuration = 300,
    className,
    container,
    onStepChange,
    beforeStepChange,
    validateStep,
  } = options;

  let _currentStep = Math.min(initialStep, steps.length - 1);
  const _statuses: StepStatus[] = steps.map((_, i) =>
    i === 0 ? "active" : i < initialStep ? "completed" : "pending",
  );
  let cleanupFns: Array<() => void> = [];

  // Root
  const root = document.createElement("div");
  root.className = `stepper ${orientation} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:flex;${orientation === "horizontal" ? "flex-direction:column;gap:16px;" : "flex-direction:row;gap:24px;"}`;

  // Steps header
  const header = document.createElement("div");
  header.className = "stepper-header";
  header.style.cssText =
    orientation === "horizontal"
      ? "display:flex;align-items:center;"
      : "display:flex;flex-direction:column;";

  // Content area
  let contentArea: HTMLElement | null = null;
  if (showContent) {
    contentArea = document.createElement("div");
    contentArea.className = "stepper-content";
    contentArea.style.cssText =
      "flex:1;padding:16px;border:1px solid #e5e7eb;border-radius:8px;" +
      "background:#fff;min-height:100px;position:relative;";
    root.appendChild(contentArea);
  }

  root.insertBefore(header, contentArea);

  // Navigation
  const nav = document.createElement("div");
  nav.className = "stepper-nav";
  nav.style.cssText =
    "display:flex;justify-content:flex-end;gap:8px;margin-top:8px;";
  root.appendChild(nav);

  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function getCurrentStep(): number { return _currentStep; }
  function getTotalSteps(): number { return steps.length; }

  function canNext(): boolean {
    return _currentStep < steps.length - 1;
  }

  function canPrev(): boolean {
    return _currentStep > 0;
  }

  async function next(): Promise<void> {
    if (!canNext()) return;

    // Validate
    if (validateStep) {
      const valid = await validateStep(_currentStep);
      if (!valid) {
        _statuses[_currentStep] = "error";
        _updateStepVisual(_currentStep);
        return;
      }
    }

    await goTo(_currentStep + 1);
  }

  async function prev(): void {
    if (!canPrev()) return;
    await goTo(_currentStep - 1);
  }

  async function goTo(index: number): Promise<void> {
    if (index < 0 || index >= steps.length || index === _currentStep) return;

    // Can only go to completed or the immediate next step
    if (index > _currentStep + 1 && !clickableCompleted) return;

    // Before hook
    if (beforeStepChange) {
      const canProceed = await beforeStepChange(_currentStep, index);
      if (!canProceed) return;
    }

    const prevStep = _currentStep;
    _currentStep = index;

    // Update statuses
    if (index > prevStep) {
      for (let i = prevStep; i < index; i++) {
        if (_statuses[i] !== "error") _statuses[i] = "completed";
      }
    }
    _statuses[index] = "active";

    _render();
    onStepChange?.(index, steps[index]!);
  }

  function setStepStatus(index: number, status: StepStatus): void {
    if (index >= 0 && index < steps.length) {
      _statuses[index] = status;
      _updateStepVisual(index);
    }
  }

  function getStepStatuses(): StepStatus[] { return [..._statuses]; }

  function reset(): void {
    _currentStep = 0;
    for (let i = 0; i < _statuses.length; i++) {
      _statuses[i] = i === 0 ? "active" : "pending";
    }
    _render();
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Render ---

  function _render(): void {
    header.innerHTML = "";
    nav.innerHTML = "";

    // Render each step
    steps.forEach((step, idx) => {
      const isH = orientation === "horizontal";

      const stepEl = document.createElement("div");
      stepEl.className = "stepper-step";
      stepEl.dataset.stepId = step.id;
      stepEl.style.cssText =
        isH
          ? "display:flex;align-items:center;flex:1;" +
            (idx < steps.length - 1 ? "" : "flex:none;")
          : "display:flex;align-items:flex-start;gap:12px;position:relative;";

      // Connector line (before this step)
      if (idx > 0) {
        const connector = document.createElement("div");
        connector.className = "stepper-connector";
        connector.style.cssText = isH
          ? `width:100%;height:2px;background:${_statuses[idx - 1] === "completed" ? "#3b82f6" : "#e5e7eb"};` +
            "margin:0 4px;flex-shrink:0;transition:background 0.3s;"
          : `position:absolute;left:15px;top:-20px;bottom:-4px;width:2px;` +
            `background:${_statuses[idx - 1] === "completed" ? "#3b82f6" : "#e5e7eb"};` +
            "transition:background 0.3s;";
        if (isH) stepEl.insertBefore(connector, stepEl.firstChild);
        else header.appendChild(connector);
      }

      // Circle indicator
      const circle = document.createElement("div");
      circle.className = "stepper-circle";
      const status = _statuses[idx];
      const isActive = idx === _currentStep;

      circle.style.cssText =
        `width:${isH ? "28px" : "32px"};height:${isH ? "28px" : "32px"};` +
        "border-radius:50%;display:flex;align-items:center;justify-content:center;" +
        "font-size:12px;font-weight:600;transition:all 0.3s ease;" +
        "border:2px solid;flex-shrink:0;";

      switch (status) {
        case "completed":
          circle.style.background = "#3b82f6";
          circle.style.borderColor = "#3b82f6";
          circle.style.color = "#fff";
          circle.innerHTML = "&#10003;";
          break;
        case "active":
          circle.style.background = "#eff6ff";
          circle.style.borderColor = "#3b82f6";
          circle.style.color = "#2563eb";
          circle.textContent = showStepNumbers ? String(idx + 1) : "";
          break;
        case "error":
          circle.style.background = "#fef2f2";
          circle.style.borderColor = "#ef4444";
          circle.style.color = "#dc2626";
          circle.innerHTML = "&#33;";
          break;
        case "skipped":
          circle.style.background = "#f9fafb";
          circle.style.borderColor = "#d1d5db";
          circle.style.color = "#9ca3af";
          circle.innerHTML = "&#8634;"; // skip/dash
          break;
        default:
          circle.style.background = "#fff";
          circle.style.borderColor = "#d1d5db";
          circle.style.color = "#9ca3af";
          circle.textContent = showStepNumbers ? String(idx + 1) : "";
      }

      stepEl.appendChild(circle);

      // Label
      const label = document.createElement("div");
      label.className = "stepper-label";
      label.style.cssText =
        isH
          ? "text-align:center;margin-top:4px;"
          : "padding-top:6px;";

      const titleSpan = document.createElement("span");
      titleSpan.className = "stepper-title";
      titleSpan.textContent = step.title;
      titleSpan.style.cssText =
        `font-size:${isH ? "12px" : "14px"};font-weight:${isActive ? "600" : "400"};` +
        `color:${isActive ? "#111827" : status === "error" ? "#dc2626" : "#6b7280"};` +
        "display:block;line-height:1.3;white-space:nowrap;";
      label.appendChild(titleSpan);

      if (step.description && isH) {
        const descSpan = document.createElement("span");
        descSpan.className = "stepper-description";
        descSpan.textContent = step.description;
        descSpan.style.cssText = "font-size:11px;color:#9ca3af;display:block;margin-top:2px;";
        label.appendChild(descSpan);
      }

      stepEl.appendChild(label);
      header.appendChild(stepEl);

      // Click handler for completed steps
      if ((status === "completed" || status === "skipped") && clickableCompleted) {
        circle.style.cursor = "pointer";
        const clickHandler = () => goTo(idx);
        circle.addEventListener("click", clickHandler);
        label.addEventListener("click", clickHandler);
        cleanupFns.push(() => {
          circle.removeEventListener("click", clickHandler);
          label.removeEventListener("click", clickHandler);
        });
      }
    });

    // Content panel
    if (contentArea && showContent) {
      const step = steps[_currentStep];
      if (step?.content) {
        contentArea.innerHTML = "";
        if (typeof step.content === "string") {
          contentArea.innerHTML = step.content;
        } else {
          contentArea.appendChild(step.content.cloneNode(true));
        }
      } else {
        contentArea.innerHTML = `<p style="color:#9ca3af;text-align:center;">Step ${_currentStep + 1}: ${step?.title || ""}</p>`;
      }
    }

    // Navigation buttons
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "Back";
    prevBtn.disabled = !canPrev();
    prevBtn.style.cssText =
      "padding:6px 16px;border:1px solid #d1d5db;border-radius:6px;" +
      "background:#fff;color:#374151;cursor:pointer;font-size:13px;" +
      "transition:border-color 0.12s,color 0.12s;";
    if (canPrev()) {
      prevBtn.addEventListener("mouseenter", () => { prevBtn.style.borderColor = "#93c5fd"; prevBtn.style.color = "#2563eb"; });
      prevBtn.addEventListener("mouseleave", () => { prevBtn.style.borderColor = "#d1d5db"; prevBtn.style.color = "#374151"; });
    }
    prevBtn.addEventListener("click", () => prev());
    nav.appendChild(prevBtn);

    // Skip button (for optional steps)
    if (allowSkip && steps[_currentStep]?.optional && canNext()) {
      const skipBtn = document.createElement("button");
      skipBtn.type = "button";
      skipBtn.textContent = "Skip";
      skipBtn.style.cssText =
        "padding:6px 16px;border:1px solid #d1d5db;border-radius:6px;" +
        "background:#fff;color:#6b7280;cursor:pointer;font-size:13px;";
      skipBtn.addEventListener("click", () => {
        _statuses[_currentStep] = "skipped";
        next();
      });
      nav.appendChild(skipBtn);
    }

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = _currentStep >= steps.length - 1 ? "Finish" : "Next";
    nextBtn.disabled = !canNext();
    nextBtn.style.cssText =
      "padding:6px 16px;border:1px solid #3b82f6;border-radius:6px;" +
      "background:#3b82f6;color:#fff;cursor:pointer;font-size:13px;" +
      "transition:background 0.12s;";
    if (canNext()) {
      nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "#2563eb"; });
      nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = "#3b82f6"; });
    }
    nextBtn.addEventListener("click", () => next());
    nav.appendChild(nextBtn);
  }

  function _updateStepVisual(index: number): void {
    const stepEl = header.querySelector(`[data-step-id="${steps[index]?.id}"]`);
    if (!stepEl) return;

    const circle = stepEl.querySelector(".stepper-circle") as HTMLElement;
    const status = _statuses[index];

    if (!circle) return;

    switch (status) {
      case "completed":
        circle.style.background = "#3b82f6";
        circle.style.borderColor = "#3b82f6";
        circle.style.color = "#fff";
        circle.innerHTML = "&#10003;";
        break;
      case "error":
        circle.style.background = "#fef2f2";
        circle.style.borderColor = "#ef4444";
        circle.style.color = "#dc2626";
        circle.innerHTML = "&#33;";
        break;
      case "skipped":
        circle.style.background = "#f9fafb";
        circle.style.borderColor = "#d1d5db";
        circle.style.color = "#9ca3af";
        circle.innerHTML = "&#8634;";
        break;
      default:
        circle.style.background = "#fff";
        circle.style.borderColor = "#d1d5db";
        circle.style.color = "#9ca3af";
        circle.textContent = String(index + 1);
    }
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: root, getCurrentStep, next, prev, goTo, setStepStatus, getStepStatuses, getTotalSteps, canNext, canPrev, reset, destroy };
}
