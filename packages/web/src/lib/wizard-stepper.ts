/**
 * Wizard Stepper: Multi-step form wizard with step navigation,
 * validation per step, progress indicator, conditional branching,
 * step persistence (localStorage), animation transitions, and accessibility.
 */

// --- Types ---

export type StepStatus = "pending" | "active" | "completed" | "error" | "skipped";
export type StepLayout = "vertical" | "horizontal" | "compact";

export interface WizardStep {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional icon/emoji */
  icon?: string;
  /** Step content (HTML element or render function) */
  content: HTMLElement | (() => HTMLElement);
  /** Optional validation function returning error message or null */
  validate?: () => string | null;
  /** Skip this step? (conditional branching) */
  skip?: () => boolean;
  /** Disable next button until valid? */
  requireValid?: boolean;
  /** Is this step optional? */
  optional?: boolean;
}

export interface WizardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Steps definition */
  steps: WizardStep[];
  /** Initial step index (default: 0) */
  startAt?: number;
  /** Layout variant */
  layout?: StepLayout;
  /** Show step numbers? */
  showNumbers?: boolean;
  /** Show step descriptions? */
  showDescriptions?: boolean;
  /** Animation duration in ms (default: 300) */
  animationDuration?: number;
  /** Allow skipping steps? */
  allowSkip?: boolean;
  /** Allow going back? */
  allowBack?: boolean;
  /** Confirm before leaving a step with unsaved changes? */
  confirmLeave?: boolean;
  /** Next button label */
  nextLabel?: string;
  /** Back button label */
  backLabel?: string;
  /** Submit button label (last step) */
  submitLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Callback on step change */
  onStepChange?: (stepIndex: number, direction: "next" | "back" | "jump") => void;
  /** Callback when all steps complete */
  onComplete?: (data: Record<string, unknown>) => void;
  /** Callback on cancel */
  onCancel?: () => void;
  /** Persist state to localStorage? */
  persistKey?: string;
  /** Custom CSS class */
  className?: string;
}

export interface WizardInstance {
  element: HTMLElement;
  /** Get current step index */
  getCurrentStep: () => number;
  /** Go to specific step */
  goToStep: (index: number) => void;
  /** Next step */
  next: () => Promise<boolean>;
  /** Previous step */
  prev: () => void;
  /** Get all step statuses */
  getStepStatuses: () => StepStatus[];
  /** Get step data collector */
  getData: () => Record<string, unknown>;
  /** Set data for a step */
  setStepData: (stepId: string, data: unknown) => void;
  /** Reset to first step */
  reset: () => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Main Factory ---

export function createWizard(options: WizardOptions): WizardInstance {
  const opts = {
    startAt: options.startAt ?? 0,
    layout: options.layout ?? "vertical",
    showNumbers: options.showNumbers ?? true,
    showDescriptions: options.showDescriptions ?? false,
    animationDuration: options.animationDuration ?? 300,
    allowSkip: options.allowSkip ?? true,
    allowBack: options.allowBack ?? true,
    confirmLeave: options.confirmLeave ?? false,
    nextLabel: options.nextLabel ?? "Next",
    backLabel: options.backLabel ?? "Back",
    submitLabel: options.submitLabel ?? "Submit",
    cancelLabel: options.cancelLabel ?? "Cancel",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("WizardStepper: container not found");

  // State
  let currentStep = opts.startAt;
  const statuses: StepStatus[] = opts.steps.map((_, i) =>
    i < opts.startAt ? "completed" : i === opts.startAt ? "active" : "pending"
  );
  const stepData = new Map<string, unknown>();
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `wizard ${opts.className ?? ""}`;
  root.style.cssText = `
    display:flex;flex-direction:column;height:100%;font-family:-apple-system,sans-serif;color:#374151;
  `;
  container.appendChild(root);

  // Header: step indicators
  const header = document.createElement("div");
  header.className = "wizard-header";
  header.style.cssText = `
    padding:16px 20px;display:flex;align-items:center;justify-content:center;gap:4px;
    flex-shrink:0;border-bottom:1px solid #e5e7eb;background:#fafbfc;
  `;
  root.appendChild(header);

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "wizard-content";
  contentArea.style.cssText = `
    flex:1;padding:24px;position:relative;overflow:hidden;min-height:200px;
  `;
  root.appendChild(contentArea);

  // Footer: navigation buttons
  const footer = document.createElement("div");
  footer.className = "wizard-footer";
  footer.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;padding:12px 20px;
    border-top:1px solid #e5e7eb;background:#fafbfc;gap:8px;flex-shrink:0;
  `;
  root.appendChild(footer);

  // Buttons
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.textContent = opts.cancelLabel;
  cancelBtn.style.cssText =
    "padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;color:#6b7280;";
  cancelBtn.addEventListener("click", () => { opts.onCancel?.(); });
  footer.appendChild(cancelBtn);

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = opts.backLabel;
  backBtn.style.cssText =
    "padding:8px 16px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font-size:13px;color:#374151;";
  backBtn.addEventListener("click", () => prev());
  footer.appendChild(backBtn);

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.style.cssText =
    "padding:8px 24px;border:none;border-radius:6px;background:#4f46e5;color:#fff;cursor:pointer;font-size:13px;font-weight:500;transition:opacity 0.15s;";
  nextBtn.addEventListener("click", () => handleNext());
  footer.appendChild(nextBtn);

  // --- Rendering ---

  function renderHeader(): void {
    header.innerHTML = "";

    if (opts.layout === "horizontal") {
      for (let i = 0; i < opts.steps.length; i++) {
        const stepEl = renderStepIndicator(i);
        header.appendChild(stepEl);
        if (i < opts.steps.length - 1) {
          const connector = document.createElement("div");
          connector.className = "wizard-connector";
          connector.style.cssText = `width:40px;height:2px;background:${statuses[i] === "completed" ? "#22c55e" : "#e5e7eb"};`;
          header.appendChild(connector);
        }
      }
    } else {
      // Vertical / compact
      for (let i = 0; i < opts.steps.length; i++) {
        const stepEl = renderStepIndicator(i);
        header.appendChild(stepEl);
      }
    }
  }

  function renderStepIndicator(index: number): HTMLElement {
    const step = opts.steps[index]!;
    const status = statuses[index];
    const el = document.createElement("div");
    el.dataset.stepIndex = String(index);

    const isActive = index === currentStep;
    const isDone = status === "completed";
    const isError = status === "error";

    el.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;
      cursor:${opts.allowSkip && !isActive ? "pointer" : "default"};transition:all ${opts.animationDuration}ms ease;
      background:${isActive ? "#eef2ff" : isDone ? "#f0fdf4" : isError ? "#fef2f2" : "transparent"};
      border:1px solid ${isActive ? "#93c5fd" : isDone ? "#86efac" : isError ? "#fca5a5" : "transparent"};
    `;

    // Icon / number
    const badge = document.createElement("span");
    badge.style.cssText = `
      width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:12px;font-weight:600;flex-shrink:0;
      background:${isDone ? "#22c55e" : isActive ? "#4f46e5" : "#d1d5db"};
      color:${isDone || isActive ? "#fff" : "#6b7280"};
      border:2px solid ${isDone ? "#22c55e" : isActive ? "#4f46e5" : "#fff"};
    `;
    if (opts.showNumbers) badge.textContent = String(index + 1);
    else if (step.icon) badge.textContent = step.icon;
    else badge.textContent = String(index + 1);
    el.appendChild(badge);

    // Title
    const label = document.createElement("span");
    label.style.cssText = `
      font-size:13px;font-weight:${isActive ? "700" : "400"};color:${isActive || isDone ? "#111827" : "#9ca3af"};
      white-space:nowrap;
    `;
    label.textContent = step.title;
    el.appendChild(label);

    // Description
    if (opts.showDescriptions && step.description) {
      const desc = document.createElement("span");
      desc.style.cssText = "font-size:11px;color:#9ca3af;margin-left:4px;";
      desc.textContent = step.description;
      el.appendChild(desc);
    }

    // Click to jump (if allowed)
    if (opts.allowSkip && !isActive) {
      el.addEventListener("click", () => goToStep(index));
    }

    return el;
  }

  function renderContent(): void {
    contentArea.innerHTML = "";
    const step = opts.steps[currentStep];

    // Get or create content
    let el: HTMLElement;
    if (step.content instanceof HTMLElement) {
      el = step.content;
    } else {
      el = step.content();
    }

    el.style.cssText += ";animation:wizardFadeIn 0.2s ease-out;";
    contentArea.appendChild(el);

    // Inject animation keyframes if needed
    if (!document.getElementById("wizard-styles")) {
      const style = document.createElement("style");
      style.id = "wizard-styles";
      style.textContent = `
        @keyframes wizardFadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      `;
      document.head.appendChild(style);
    }

    // Update buttons
    updateButtons();
  }

  function updateButtons(): void {
    const isLast = currentStep >= opts.steps.length - 1;
    const isFirst = currentStep <= 0;

    nextBtn.textContent = isLast ? opts.submitLabel : opts.nextLabel;
    nextBtn.style.background = isLast ? "#16a34a" : "#4f46e5";

    backBtn.style.display = opts.allowBack && !isFirst ? "" : "none";
    backBtn.disabled = !opts.allowBack && isFirst;

    cancelBtn.style.display = opts.onCancel ? "" : "none";
  }

  // --- Navigation ---

  async function handleNext(): Promise<boolean> {
    const step = opts.steps[currentStep];

    // Check skip
    if (step.skip?.()) {
      statuses[currentStep] = "skipped";
      return advance();
    }

    // Validate
    if (step.requireValid && step.validate) {
      const error = step.validate();
      if (error) {
        statuses[currentStep] = "error";
        renderHeader();
        return false;
      }
    }

    return advance();
  }

  function advance(): boolean {
    if (currentStep >= opts.steps.length - 1) {
      // Complete
      statuses[currentStep] = "completed";
      renderHeader();
      opts.onComplete?.(Object.fromEntries(stepData));
      return true;
    }

    statuses[currentStep] = "completed";
    currentStep++;
    statuses[currentStep] = "active";

    opts.onStepChange?.(currentStep, "next");
    saveState();
    renderHeader();
    renderContent();
    return true;
  }

  function prev(): void {
    if (currentStep <= 0 || !opts.allowBack) return;

    statuses[currentStep] = "completed";
    currentStep--;
    statuses[currentStep] = "active";

    opts.onStepChange?.(currentStep, "back");
    saveState();
    renderHeader();
    renderContent();
  }

  function goToStep(index: number): void {
    if (index < 0 || index >= opts.steps.length || index === currentStep) return;

    // Validate leaving current step
    if (opts.confirmLeave) {
      const step = opts.steps[currentStep];
      if (step.validate?.()) {
        // Don't allow leaving invalid step
        return;
      }
    }

    // Mark intermediate steps
    const dir = index > currentStep ? "next" : "back";
    for (let i = Math.min(currentStep, index); i < Math.max(currentStep, index); i++) {
      statuses[i] = i < index ? "completed" : i > index ? "completed" : "active";
    }

    currentStep = index;
    statuses[currentStep] = "active";

    opts.onStepChange?.(currentStep, "jump" as any);
    saveState();
    renderHeader();
    renderContent();
  }

  // --- Persistence ---

  function saveState(): void {
    if (opts.persistKey) {
      try {
        localStorage.setItem(opts.persistKey, JSON.stringify({ currentStep, statuses, data: Object.fromEntries(stepData) }));
      } catch {}
    }
  }

  function loadState(): void {
    if (!opts.persistKey) return;
    try {
      const saved = localStorage.getItem(opts.persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        currentStep = parsed.currentStep ?? opts.startFor;
        if (parsed.statuses) parsed.statuses.forEach((s: string, i: number) => statuses[i] = s as StepStatus);
        if (parsed.data) Object.entries(parsed.data).forEach(([k, v]) => stepData.set(k, v));
      }
    } catch {}
  }

  // --- Instance ---

  loadState();
  renderHeader();
  renderContent();

  const instance: WizardInstance = {
    element: root,

    getCurrentStep() { return currentStep; },

    goToStep,

    async next() { return handleNext(); },

    prev,

    getStepStatuses() { return [...statuses]; },

    getData() { return Object.fromEntries(stepData); },

    setStepData(stepId: string, data: unknown) { stepData.set(stepId, data); },

    reset() {
      currentStep = opts.startAt;
      statuses.fill("pending");
      statuses[opts.startAt] = "active";
      stepData.clear();
      saveState();
      renderHeader();
      renderContent();
    },

    destroy() {
      destroyed = true;
      root.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
