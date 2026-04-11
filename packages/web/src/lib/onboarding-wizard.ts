/**
 * Onboarding Wizard: Multi-step guided onboarding flow with progress bar,
 * step validation, conditional branching, animations, skip optionals,
 * completion celebration, and persistence.
 */

// --- Types ---

export interface OnboardingStep {
  id: string;
  /** Step title */
  title: string;
  /** Step description/subtitle */
  description?: string;
  /** Step content renderer or HTML string */
  content: string | ((step: OnboardingStep, data: Record<string, unknown>) => HTMLElement | string);
  /** Is this step optional/skippable? */
  optional?: boolean;
  /** Validation function: returns error message or null */
  validate?: (data: Record<string, unknown>) => string | null;
  /** Async validation (e.g., API call) */
  validateAsync?: (data: Record<string, unknown>) => Promise<string | null>;
  /** Condition to show this step (based on previous data) */
  condition?: (data: Record<string, unknown>) => boolean;
  /** Custom icon/emoji for progress indicator */
  icon?: string;
  /** Time estimate (e.g., "2 min") */
  duration?: string;
}

export interface OnboardingOptions {
  container: HTMLElement | string;
  /** Steps definition */
  steps: OnboardingStep[];
  /** Starting step index (default: 0) */
  startAt?: number;
  /** Show progress bar/steps? */
  showProgress?: boolean;
  /** Show step numbers? */
  showStepNumbers?: boolean;
  /** Allow skipping optional steps? */
  allowSkip?: boolean;
  /** Allow going back? */
  allowBack?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Width in px (default: 600) */
  width?: number;
  /** Height in px (default: auto) */
  height?: number;
  /** Callback when step changes */
  onStepChange?: (stepIndex: number, step: OnboardingStep) => void;
  /** Callback on complete with collected data */
  onComplete?: (data: Record<string, unknown>) => void;
  /** Callback on skip */
  onSkip?: (stepIndex: number) => void;
  /** Callback on wizard close/exit */
  onClose?: () => void;
  /** Persist state to localStorage key? */
  persistKey?: string;
  /** Custom CSS class */
  className?: string;
}

export interface OnboardingInstance {
  element: HTMLElement;
  getCurrentStep: () => number;
  getTotalSteps: () => number;
  getData: () => Record<string, unknown>;
  setData: (data: Record<string, unknown>) => void;
  next: () => Promise<void>;
  prev: () => void;
  goTo: (index: number) => void;
  skip: () => void;
  reset: () => void;
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string {
  return `ow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Main Factory ---

export function createOnboarding(options: OnboardingOptions): OnboardingInstance {
  const opts = {
    startAt: options.startAt ?? 0,
    showProgress: options.showProgress ?? true,
    showStepNumbers: options.showStepNumbers ?? true,
    allowSkip: options.allowSkip ?? true,
    allowBack: options.allowBack ?? true,
    animationDuration: options.animationDuration ?? 300,
    width: options.width ?? 600,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Onboarding: container not found");

  let currentStep = opts.startAt;
  let collectedData: Record<string, unknown> = {};
  let destroyed = false;
  let isValidating = false;

  // Load persisted state
  if (opts.persistKey) {
    try {
      const saved = localStorage.getItem(opts.persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.step === "number") currentStep = parsed.step;
        if (parsed.data) collectedData = parsed.data;
      }
    } catch {}
  }

  // Get visible steps (respecting conditions)
  function getVisibleSteps(): OnboardingStep[] {
    return opts.steps.filter((s) => s.condition ? s.condition(collectedData) : true);
  }

  // Root
  const root = document.createElement("div");
  root.className = `onboarding-wizard ${opts.className}`;
  root.style.cssText = `
    width:${opts.width}px;${opts.height ? `height:${opts.height}px;` : ""}
    font-family:-apple-system,sans-serif;color:#374151;background:#fff;
    border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.1);
    border:1px solid #e5e7eb;display:flex;flex-direction:column;
  `;
  container.appendChild(root);

  // Progress / Steps indicator
  let progressEl: HTMLElement | null = null;
  if (opts.showProgress) {
    progressEl = document.createElement("div");
    progressEl.className = "ow-progress";
    progressEl.style.cssText = "padding:20px 24px 16px;border-bottom:1px solid #f0f0f0;flex-shrink:0;";
    root.appendChild(progressEl);
  }

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "ow-content";
  contentArea.style.cssText = "flex:1;padding:32px 24px;overflow-y:auto;position:relative;";
  root.appendChild(contentArea);

  // Footer navigation
  const footer = document.createElement("div");
  footer.className = "ow-footer";
  footer.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-top:1px solid #f0f0f0;flex-shrink:0;background:#fafafa;";
  root.appendChild(footer);

  // Back button
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.innerHTML = "\u2190 Back";
  backBtn.style.cssText = `
    padding:8px 18px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;
    background:#fff;cursor:pointer;color:#4b5563;transition:all 0.15s;
  `;
  backBtn.addEventListener("click", () => instance.prev());
  backBtn.addEventListener("mouseenter", () => { backBtn.style.background = "#f3f4f6"; });
  backBtn.addEventListener("mouseleave", () => { backBtn.style.background = ""; });
  footer.appendChild(backBtn);

  // Step counter
  const stepCounter = document.createElement("span");
  stepCounter.style.cssText = "font-size:13px;color:#6b7280;";
  footer.appendChild(stepCounter);

  // Right side actions
  const rightActions = document.createElement("div");
  rightActions.style.display = "flex";
  rightActions.style.gap = "8px";

  // Skip button
  const skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.textContent = "Skip";
  skipBtn.style.cssText = `
    padding:8px 18px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;
    background:#fff;cursor:pointer;color:#6b7280;transition:all 0.15s;
  `;
  skipBtn.addEventListener("click", () => instance.skip());
  skipBtn.addEventListener("mouseenter", () => { skipBtn.style.background = "#f3f4f6"; });
  skipBtn.addEventListener("mouseleave", () => { skipBtn.style.background = ""; });
  rightActions.appendChild(skipBtn);

  // Next / Complete button
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.style.cssText = `
    padding:8px 24px;border:none;border-radius:8px;font-size:13px;font-weight:600;
    background:#4338ca;color:#fff;cursor:pointer;transition:all 0.15s;
  `;
  nextBtn.addEventListener("click", () => instance.next());
  nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "#3730a3"; });
  nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = "#4338ca"; });
  rightActions.appendChild(nextBtn);
  footer.appendChild(rightActions);

  // Close button (top-right)
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "&times;";
  closeBtn.style.cssText = `
    position:absolute;top:12px;right:12px;background:none;border:none;cursor:pointer;
    font-size:18px;color:#9ca3af;padding:4px;border-radius:4px;z-index:2;
  `;
  closeBtn.addEventListener("click", () => { opts.onClose?.(); instance.destroy(); });
  contentArea.style.position = "relative";
  contentArea.appendChild(closeBtn);

  // --- Save State ---

  function saveState(): void {
    if (opts.persistKey) {
      try { localStorage.setItem(opts.persistKey, JSON.stringify({ step: currentStep, data: collectedData })); } catch {}
    }
  }

  // --- Render ---

  function render(): void {
    const visibleSteps = getVisibleSteps();
    if (visibleSteps.length === 0) {
      contentArea.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;">No steps available</div>`;
      return;
    }

    // Clamp current step
    if (currentStep >= visibleSteps.length) currentStep = visibleSteps.length - 1;
    if (currentStep < 0) currentStep = 0;

    const step = visibleSteps[currentStep]!;
    const isLast = currentStep === visibleSteps.length - 1;
    const isFirst = currentStep === 0;

    // Update progress
    if (progressEl) renderProgress(visibleSteps, currentStep);

    // Update step counter
    stepCounter.textContent = `Step ${currentStep + 1} of ${visibleSteps.length}`;

    // Update buttons
    backBtn.style.visibility = (isFirst || !opts.allowBack) ? "hidden" : "visible";
    skipBtn.style.visibility = (step.optional && opts.allowSkip) && !isLast ? "visible" : "hidden";
    nextBtn.textContent = isLast ? "Complete" : "Next";
    nextBtn.disabled = isValidating;
    nextBtn.style.opacity = isValidating ? "0.6" : "1";

    // Render content with animation
    contentArea.querySelector(".ow-step-content")?.remove();
    const stepContent = document.createElement("div");
    stepContent.className = "ow-step-content";
    stepContent.style.cssText = "animation:fadeIn 0.25s ease-out;";

    // Title
    const titleEl = document.createElement("h2");
    titleEl.style.cssText = "font-size:22px;font-weight:700;color:#111827;margin:0 0 4px;";
    titleEl.textContent = step.title;
    stepContent.appendChild(titleEl);

    if (step.description) {
      const desc = document.createElement("p");
      desc.style.cssText = "font-size:14px;color:#6b7280;margin:0 0 24px;";
      desc.textContent = step.description;
      stepContent.appendChild(desc);
    }

    // Step body
    const body = document.createElement("div");
    body.className = "ow-step-body";
    if (typeof step.content === "function") {
      const rendered = step.content(step, collectedData);
      if (typeof rendered === "string") body.innerHTML = rendered;
      else { body.innerHTML = ""; body.appendChild(rendered); }
    } else {
      body.innerHTML = step.content;
    }
    stepContent.appendChild(body);

    // Duration badge
    if (step.duration) {
      const durBadge = document.createElement("span");
      durBadge.style.cssText = "font-size:11px;color:#9ca3af;margin-left:8px;";
      durBadge.textContent = step.duration;
      titleEl.appendChild(durBadge);
    }

    contentArea.insertBefore(stepContent, closeBtn.nextSibling);

    opts.onStepChange?.(currentStep, step);
  }

  function renderProgress(steps: OnboardingStep[], activeIdx: number): void {
    if (!progressEl) return;
    progressEl.innerHTML = "";

    const track = document.createElement("div");
    track.style.cssText = "display:flex;align-items:center;gap:4px;";

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i]!;
      const isCompleted = i < activeIdx;
      const isActive = i === activeIdx;

      // Connector line
      if (i > 0) {
        const line = document.createElement("div");
        line.style.cssText = `flex:1;height:2px;background:${isCompleted ? "#4338ca" : "#e5e7eb"};border-radius:1px;`;
        track.appendChild(line);
      }

      // Step node
      const node = document.createElement("div");
      node.style.cssText = `
        width:28px;height:28px;border-radius:50%;display:flex;align-items:center;
        justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;
        transition:all 0.3s;border:2px solid;
        ${isActive ? `background:#4338ca;color:#fff;border-color:#4338ca;box-shadow:0 0 0 4px rgba(67,56,202,0.15);` :
         isCompleted ? "background:#4338ca;color:#fff;border-color:#4338ca;" :
         "background:#fff;color:#9ca3af;border-color:#d1d5db;"}
      `;

      if (isCompleted) node.textContent = "\u2713";
      else if (s.icon) node.textContent = s.icon;
      else node.textContent = String(i + 1);

      // Tooltip
      node.title = s.title;
      track.appendChild(node);
    }

    progressEl.appendChild(track);
  }

  // --- Navigation ---

  async function goNext(): Promise<void> {
    const visibleSteps = getVisibleSteps();
    const step = visibleSteps[currentStep];
    if (!step) return;

    // Validate
    if (step.validate) {
      const err = step.validate(collectedData);
      if (err) { alert(err); return; }
    }

    if (step.validateAsync) {
      isValidating = true;
      nextBtn.textContent = "Validating...";
      render();
      const err = await step.validateAsync(collectedData);
      isValidating = false;
      if (err) { alert(err); render(); return; }
    }

    const isLast = currentStep === visibleSteps.length - 1;
    if (isLast) {
      // Complete!
      renderCompletion();
      return;
    }

    currentStep++;
    saveState();
    render();
  }

  function goPrev(): void {
    if (currentStep > 0) { currentStep--; saveState(); render(); }
  }

  function doSkip(): void {
    const visibleSteps = getVisibleSteps();
    const step = visibleSteps[currentStep];
    if (step?.optional) {
      opts.onSkip?.(currentStep);
      if (currentStep < visibleSteps.length - 1) { currentStep++; saveState(); render(); }
    }
  }

  function renderCompletion(): void {
    contentArea.innerHTML = "";
    contentArea.style.textAlign = "center";
    contentArea.style.paddingTop = "60px";

    const confetti = document.createElement("div");
    confetti.innerHTML = `
      <div style="font-size:64px;margin-bottom:16px;">\uD83C\uDF89</div>
      <h2 style="font-size:24px;font-weight:700;color:#111827;margin:0 0 8px;">You're all set!</h2>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">Welcome aboard. Let's get started!</p>
    `;
    contentArea.appendChild(confetti);

    // Hide nav, show only done button
    footer.style.justifyContent = "center";
    backBtn.style.display = "none";
    skipBtn.style.display = "none";
    stepCounter.style.display = "none";
    nextBtn.textContent = "Get Started";
    nextBtn.onclick = () => {
      opts.onComplete?.(collectedData);
      if (opts.persistKey) { try { localStorage.removeItem(opts.persistKey!); } catch {} }
      instance.destroy();
    };
  }

  // Add keyframe animation
  const style = document.createElement("style");
  style.textContent = "@keyframes fadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }";
  document.head.appendChild(style);

  // Initial render
  render();

  const instance: OnboardingInstance = {
    element: root,

    getCurrentStep() { return currentStep; },
    getTotalSteps() { return getVisibleSteps().length; },
    getData() { return { ...collectedData }; },

    setData(data: Record<string, unknown>) {
      collectedData = { ...collectedData, ...data };
      saveState();
    },

    next: goNext,
    prev: goPrev,
    goTo(index: number) { currentStep = Math.max(0, Math.min(index, getVisibleSteps().length - 1)); saveState(); render(); },
    skip: doSkip,

    reset() {
      currentStep = opts.startAt;
      collectedData = {};
      if (opts.persistKey) { try { localStorage.removeItem(opts.persistKey!); } catch {} }
      footer.style.justifyContent = "space-between";
      backBtn.style.display = "";
      skipBtn.style.display = "";
      stepCounter.style.display = "";
      nextBtn.textContent = "Next";
      nextBtn.onclick = null;
      nextBtn.addEventListener("click", () => instance.next());
      contentArea.style.textAlign = "";
      contentArea.style.paddingTop = "32px";
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
      style.remove();
    },
  };

  return instance;
}
