/**
 * Onboarding Flow: Multi-step onboarding wizard with progress tracking,
 * conditional steps, user data collection, animation transitions,
 * completion callbacks, and persistent state management.
 */

// --- Types ---

export type OnboardingStepType = "welcome" | "intro" | "form" | "showcase" | "tips" | "completion" | "custom";

export interface OnboardingField {
  /** Field identifier */
  key: string;
  /** Label text */
  label: string;
  /** Input type */
  type: "text" | "email" | "password" | "select" | "checkbox" | "textarea" | "toggle" | "range";
  /** Placeholder */
  placeholder?: string;
  /** Default value */
  defaultValue?: string | boolean | number;
  /** Required? */
  required?: boolean;
  /** Validation regex or function */
  validate?: RegExp | ((value: string) => boolean | string);
  /** Error message */
  errorText?: string;
  /** Options for select/checkbox */
  options?: Array<{ label: string; value: string }>;
  /** Help text below input */
  helpText?: string;
  /** Min/max for range */
  min?: number;
  max?: number;
}

export interface OnboardingStep {
  /** Unique ID */
  id: string;
  /** Step type */
  type: OnboardingStepType;
  /** Title */
  title: string;
  /** Description/subtitle */
  description?: string;
  /** Illustration (SVG string, emoji, or HTML) */
  illustration?: string;
  /** Form fields (for "form" type) */
  fields?: OnboardingField[];
  /** Tips list (for "tips" type) */
  tips?: string[];
  /** Showcase items (for "showcase" type) */
  showcaseItems?: Array<{ icon?: string; title: string; description: string }>;
  /** Custom content renderer */
  customContent?: (step: OnboardingStep, data: Record<string, unknown>) => HTMLElement;
  /** Condition to show this step */
  condition?: (data: Record<string, unknown>) => boolean;
  /** Before entering */
  onEnter?: (data: Record<string, unknown>) => void | Promise<void>;
  /** Before leaving (return false to prevent) */
  onLeave?: (data: Record<string, unknown>) => boolean | Promise<boolean>;
  /** Skip button visible? */
  skippable?: boolean;
  /** Primary button label override */
  primaryLabel?: string;
  /** Secondary button label override */
  secondaryLabel?: string;
}

export interface OnboardingOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Steps array */
  steps: OnboardingStep[];
  /** Start at specific step */
  startAt?: number;
  /** Theme color */
  themeColor?: string;
  /** Animation duration (ms) */
  duration?: number;
  /** Show progress bar? */
  showProgress?: boolean;
  /** Show step indicators (dots)? */
  showDots?: boolean;
  /** Allow skip all? */
  allowSkipAll?: boolean;
  /** Persist state in localStorage? */
  persistKey?: string;
  /** Width of the onboarding panel */
  width?: string;
  /** Callback on complete with collected data */
  onComplete?: (data: Record<string, unknown>) => void;
  /** Callback on skip */
  onSkip?: () => void;
  /** Callback on each step change */
  onStepChange?: (step: OnboardingStep, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface OnboardingInstance {
  element: HTMLElement;
  /** Start the flow */
  start: () => void;
  /** Go to next step */
  next: () => void;
  /** Go to previous step */
  prev: () => void;
  /** Go to specific step */
  goTo: (index: number) => void;
  /** Get current step index */
  getCurrentStep: () => number;
  /** Get collected form data */
  getData: () => Record<string, unknown>;
  /** Update data programmatically */
  setData: (data: Partial<Record<string, unknown>>) => void;
  /** Check if active */
  isActive: () => boolean;
  /** Complete the flow */
  complete: () => void;
  /** Skip the entire flow */
  skip: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createOnboarding(options: OnboardingOptions): OnboardingInstance {
  const opts = {
    themeColor: options.themeColor ?? "#4338ca",
    duration: options.duration ?? 300,
    showProgress: options.showProgress ?? true,
    showDots: options.showDots ?? true,
    allowSkipAll: options.allowSkipAll ?? true,
    persistKey: options.persistKey ?? "",
    width: options.width ?? "480px",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Onboarding: container not found");

  let currentIdx = opts.startAt ?? 0;
  let active = false;
  let destroyed = false;
  const formData: Record<string, unknown> = {};

  // Panel element
  const panel = document.createElement("div");
  panel.className = `onboarding ${opts.className ?? ""}`;
  panel.style.cssText = `
    display:none;flex-direction:column;width:${opts.width};max-width:100%;
    margin:0 auto;font-family:-apple-system,sans-serif;color:#374151;
    background:#fff;border-radius:16px;overflow:hidden;
    box-shadow:0 20px 60px rgba(0,0,0,0.15);
  `;
  container.appendChild(panel);

  // Inject transition styles
  if (!document.getElementById("onboarding-styles")) {
    const style = document.createElement("style");
    style.id = "onboarding-styles";
    style.textContent = `
      @keyframes ob-slide-in-right{from{opacity:0;transform:translateX(30px);}to{opacity:1;transform:translateX(0);}}
      @keyframes ob-slide-out-left{from{opacity:1;transform:translateX(0);}to{opacity:0;transform:translateX(-30px);}}
      @keyframes ob-fade-in{from{opacity:0;}to{opacity:1;}}
    `;
    document.head.appendChild(style);
  }

  function render(): void {
    panel.innerHTML = "";

    const step = opts.steps[currentIdx];
    if (!step) return;

    // Progress bar
    if (opts.showProgress && opts.steps.length > 1) {
      const progressWrap = document.createElement("div");
      progressWrap.style.cssText = `width:100%;height:3px;background:#f0f0f0;`;
      const progressBar = document.createElement("div");
      progressBar.style.cssText = `height:100%;background:${opts.themeColor};transition:width ${opts.duration}ms ease;width:${((currentIdx + 1) / opts.steps.length * 100)}%;`;
      progressWrap.appendChild(progressBar);
      panel.appendChild(progressWrap);
    }

    // Content area
    const content = document.createElement("div");
    content.className = "ob-content";
    content.style.cssText = "padding:32px 28px 24px;animation:ob-slide-in-right 0.3s ease both;";
    panel.appendChild(content);

    // Illustration area
    if (step.illustration) {
      const illEl = document.createElement("div");
      illEl.className = "ob-illustration";
      illEl.style.cssText = "text-align:center;margin-bottom:24px;";
      illEl.innerHTML = step.illustration;
      content.appendChild(illEl);
    }

    // Title
    const title = document.createElement("h2");
    title.className = "ob-title";
    title.style.cssText = `font-size:22px;font-weight:700;margin:0 0 8px;text-align:center;color:#111827;`;
    title.textContent = step.title;
    content.appendChild(title);

    // Description
    if (step.description) {
      const desc = document.createElement("p");
      desc.className = "ob-description";
      desc.style.cssText = "font-size:14px;color:#6b7280;text-align:center;margin:0 0 24px;line-height:1.5;max-width:380px;margin-left:auto;margin-right:auto;";
      desc.textContent = step.description;
      content.appendChild(desc);
    }

    // Render based on step type
    switch (step.type) {
      case "form":
        renderForm(content, step);
        break;
      case "tips":
        renderTips(content, step);
        break;
      case "showcase":
        renderShowcase(content, step);
        break;
      case "custom":
        if (step.customContent) {
          const customEl = step.customContent(step, formData);
          content.appendChild(customEl);
        }
        break;
      default:
        // welcome/intro/completion — just use title + description + illustration
        break;
    }

    // Dots indicator
    if (opts.showDots && opts.steps.length > 1) {
      const dotsWrap = document.createElement("div");
      dotsWrap.style.cssText = "display:flex;justify-content:center;gap:6px;padding:12px 0 8px;";
      for (let i = 0; i < opts.steps.length; i++) {
        const dot = document.createElement("div");
        dot.style.cssText = `
          width:8px;height:8px;border-radius:50%;transition:all ${opts.duration}ms ease;
          background:${i === currentIdx ? opts.themeColor : i < currentIdx ? `${opts.themeColor}40` : "#e5e7eb"};
          ${i === currentIdx ? `transform:scale(1.25);box-shadow:0 0 0 3px ${opts.themeColor}20;` : ""}
          cursor:pointer;
        `;
        dot.addEventListener("click", () => { if (i <= currentIdx || step.skippable) instance.goTo(i); });
        dotsWrap.appendChild(dot);
      }
      content.appendChild(dotsWrap);
    }

    // Navigation buttons
    renderButtons(content, step);
  }

  function renderForm(content: HTMLElement, step: OnboardingStep): void {
    if (!step.fields?.length) return;

    const form = document.createElement("div");
    form.className = "ob-form";
    form.style.cssText = "display:flex;flex-direction:column;gap:14px;";

    for (const field of step.fields!) {
      const wrap = document.createElement("div");
      wrap.style.cssText = "display:flex;flex-direction:column;gap:4px;";

      // Label
      const label = document.createElement("label");
      label.style.cssText = "font-size:13px;font-weight:500;color:#374151;";
      label.textContent = field.label + (field.required ? " *" : "");
      wrap.appendChild(label);

      // Error message placeholder
      const errorEl = document.createElement("span");
      errorEl.style.cssText = "font-size:11px;color:#ef4444;display:none;";
      errorEl.textContent = field.errorText ?? "This field is required";
      wrap.appendChild(errorEl);

      // Input element
      let input: HTMLElement;

      switch (field.type) {
        case "select": {
          const sel = document.createElement("select");
          sel.style.cssText = `padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;background:#fff;color:#374151;outline:none;`;
          sel.dataset.fieldKey = field.key;
          const defOpt = document.createElement("option");
          defOpt.value = "";
          defOpt.textContent = field.placeholder ?? "Select...";
          sel.appendChild(defOpt);
          for (const opt of field.options ?? []) {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            sel.appendChild(o);
          }
          if (field.defaultValue) sel.value = String(field.defaultValue);
          sel.addEventListener("change", () => { formData[field.key] = sel.value; hideError(); });
          input = sel;
          break;
        }
        case "checkbox": {
          const cbWrap = document.createElement("label");
          cbWrap.style.cssText = "display:flex;align-items:center;gap:8px;cursor:pointer;";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = !!field.defaultValue;
          cb.style.cssText = `width:16px;height:16px;accent-color:${opts.themeColor};`;
          cb.addEventListener("change", () => { formData[field.key] = cb.checked; hideError(); });
          cbWrap.appendChild(cb);
          const cbLabel = document.createElement("span");
          cbLabel.style.cssText = "font-size:13px;color:#4b5563;";
          cbLabel.textContent = field.label;
          cbWrap.appendChild(cbLabel);
          input = cbWrap;
          wrap.querySelector("label")!.style.display = "none"; // hide main label
          break;
        }
        case "toggle": {
          const toggleWrap = document.createElement("label");
          toggleWrap.style.cssText = "display:flex;align-items:center;gap:10px;cursor:pointer;";
          const toggle = document.createElement("div");
          const isOn = !!field.defaultValue;
          toggle.style.cssText = `width:40px;height:22px;border-radius:11px;background:${isOn ? opts.themeColor : "#d1d5db"};position:relative;transition:background 0.2s;cursor:pointer;`;
          const knob = document.createElement("div");
          knob.style.cssText = `width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;${isOn ? "right:2px" : "left:2px"};transition:left/right 0.2s;`;
          toggle.appendChild(knob);
          toggle.addEventListener("click", () => {
            const currentState = formData[field.key] as boolean ?? false;
            formData[field.key] = !currentState;
            toggle.style.background = !currentState ? opts.themeColor : "#d1d5db";
            knob.style.cssText = `width:18px;height:18px;border-radius:50%;background:#fff;position:absolute;top:2px;${!currentState ? "right:2px" : "left:2px"};transition:all 0.2s;`;
            hideError();
          });
          toggleWrap.appendChild(toggle);
          const tLabel = document.createElement("span");
          tLabel.style.cssText = "font-size:13px;color:#4b5563;";
          tLabel.textContent = field.placeholder ?? field.label;
          toggleWrap.appendChild(tLabel);
          input = toggleWrap;
          wrap.querySelector("label")!.style.display = "none";
          break;
        }
        case "range": {
          const rangeWrap = document.createElement("div");
          rangeWrap.style.cssText = "display:flex;align-items:center;gap:10px;";
          const range = document.createElement("input");
          range.type = "range";
          range.min = String(field.min ?? 0);
          range.max = String(field.max ?? 100);
          range.value = String(field.defaultValue ?? 50);
          range.style.cssText = `flex:1;accent-color:${opts.themeColor};`;
          const rangeVal = document.createElement("span");
          rangeVal.style.cssText = "font-size:13px;font-weight:500;color:#374151;min-width:30px;text-align:right;";
          rangeVal.textContent = range.value;
          range.addEventListener("input", () => {
            formData[field.key] = parseInt(range.value, 10);
            rangeVal.textContent = range.value;
          });
          rangeWrap.appendChild(range);
          rangeWrap.appendChild(rangeVal);
          input = rangeWrap;
          break;
        }
        case "textarea": {
          const ta = document.createElement("textarea");
          ta.style.cssText = `padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;resize:vertical;min-height:72px;outline:none;font-family:inherit;`;
          ta.placeholder = field.placeholder ?? "";
          ta.value = String(field.defaultValue ?? "");
          ta.dataset.fieldKey = field.key;
          ta.addEventListener("input", () => { formData[field.key] = ta.value; hideError(); });
          input = ta;
          break;
        }
        default: {
          // text, email, password
          const inp = document.createElement("input");
          inp.type = field.type === "password" ? "password" : "text";
          inp.style.cssText = `padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;outline:none;`;
          inp.placeholder = field.placeholder ?? "";
          inp.value = String(field.defaultValue ?? "");
          inp.dataset.fieldKey = field.key;
          inp.addEventListener("input", () => { formData[field.key] = inp.value; hideError(); });
          input = inp;
          break;
        }
      }

      wrap.appendChild(input);

      // Help text
      if (field.helpText) {
        const help = document.createElement("span");
        help.style.cssText = "font-size:11px;color:#9ca3af;";
        help.textContent = field.helpText;
        wrap.appendChild(help);
      }

      // Store error ref
      (wrap as Record<string, unknown>).__errorEl = errorEl;

      form.appendChild(wrap);
    }

    content.appendChild(form);
  }

  function renderTips(content: HTMLElement, step: OnboardingStep): void {
    if (!step.tips?.length) return;

    const tipsList = document.createElement("div");
    tipsList.style.cssText = "display:flex;flex-direction:column;gap:12px;";

    for (let i = 0; i < step.tips.length; i++) {
      const tip = document.createElement("div");
      tip.style.cssText = `
        display:flex;align-items:flex-start;gap:12px;padding:12px 14px;
        border-radius:10px;background:${i % 2 === 0 ? "#eef2ff" : "#f0fdf4"};
        animation:ob-fade-in 0.3s ease both;animation-delay:${i * 80}ms;
      `;
      const num = document.createElement("span");
      num.style.cssText = `flex-shrink:0;width:24px;height:24px;border-radius:50%;background:${opts.themeColor};color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;`;
      num.textContent = String(i + 1);
      tip.appendChild(num);
      const text = document.createElement("span");
      text.style.cssText = "font-size:13px;color:#374151;line-height:1.5;";
      text.textContent = step.tips[i]!;
      tip.appendChild(text);
      tipsList.appendChild(tip);
    }

    content.appendChild(tipsList);
  }

  function renderShowcase(content: HTMLElement, step: OnboardingStep): void {
    if (!step.showcaseItems?.length) return;

    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;";

    for (const item of step.showcaseItems) {
      const card = document.createElement("div");
      card.style.cssText = `
        padding:16px;border-radius:12px;border:1px solid #e5e7eb;
        text-align:center;transition:transform 0.2s,box-shadow 0.2s;
      `;
      card.addEventListener("mouseenter", () => { card.style.transform = "translateY(-2px)"; card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; });
      card.addEventListener("mouseleave", () => { card.style.transform = ""; card.style.boxShadow = ""; });

      if (item.icon) {
        const icon = document.createElement("div");
        icon.style.cssText = "font-size:28px;margin-bottom:8px;";
        icon.textContent = item.icon;
        card.appendChild(icon);
      }

      const title = document.createElement("div");
      title.style.cssText = "font-size:13px;font-weight:600;color:#111827;margin-bottom:4px;";
      title.textContent = item.title;
      card.appendChild(title);

      const desc = document.createElement("div");
      desc.style.cssText = "font-size:12px;color:#6b7280;line-height:1.4;";
      desc.textContent = item.description;
      card.appendChild(desc);

      grid.appendChild(card);
    }

    content.appendChild(grid);
  }

  function renderButtons(content: HTMLElement, step: OnboardingStep): void {
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;";

    // Secondary (prev/skip)
    if (currentIdx > 0) {
      const prevBtn = createButton(step.secondaryLabel ?? "Back", false);
      prevBtn.addEventListener("click", () => instance.prev());
      btnRow.appendChild(prevBtn);
    } else if (opts.allowSkipAll && step.skippable !== false) {
      const skipBtn = createButton("Skip", true);
      skipBtn.addEventListener("click", () => instance.skip());
      btnRow.appendChild(skipBtn);
    } else {
      const spacer = document.createElement("span");
      spacer.style.flex = "1";
      btnRow.appendChild(spacer);
    }

    // Primary (next/done)
    const isLast = currentIdx >= opts.steps.length - 1;
    const primaryBtn = createButton(isLast ? (step.primaryLabel ?? "Get Started") : (step.primaryLabel ?? "Next"), !isLast);
    primaryBtn.addEventListener("click", async () => {
      // Validate form fields before proceeding
      if (step.type === "form" && step.fields?.length) {
        if (!validateFields(step.fields)) return;
      }

      // Call onLeave
      if (step.onLeave) {
        const canProceed = await step.onLeave(formData);
        if (canProceed === false) return;
      }

      if (isLast) {
        instance.complete();
      } else {
        instance.next();
      }
    });

    btnRow.appendChild(primaryBtn);
    content.appendChild(btnRow);
  }

  function createButton(label: string, primary: boolean): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.cssText = `
      padding:10px 22px;border-radius:10px;font-size:14px;font-weight:600;
      cursor:pointer;font-family:inherit;border:none;transition:all 0.15s;
      ${primary
        ? `background:${opts.themeColor};color:#fff;box-shadow:0 2px 8px ${opts.themeColor}30;`
        : "background:transparent;color:#6b7280;"}
    `;
    btn.addEventListener("mouseenter", () => {
      if (primary) btn.style.boxShadow = `0 4px 14px ${opts.themeColor}40`;
      else btn.style.color = "#374151";
    });
    btn.addEventListener("mouseleave", () => {
      if (primary) btn.style.boxShadow = `0 2px 8px ${opts.themeColor}30`;
      else btn.style.color = "#6b7280";
    });
    return btn;
  }

  function validateFields(fields: OnboardingField[]): boolean {
    let valid = true;
    const formArea = panel.querySelector(".ob-form");
    if (!formArea) return true;

    for (const field of fields) {
      const val = formData[field.key];
      const wrap = Array.from(formArea.children).find((c) => {
        const input = c.querySelector("[data-field-key]") as HTMLElement | undefined;
        return input?.dataset.fieldKey === field.key;
      }) as HTMLElement | undefined;

      if (field.required && (val === undefined || val === "" || val === null)) {
        valid = false;
        showError(wrap, field.errorText ?? `${field.label} is required`);
      } else if (field.validate && typeof val === "string") {
        const result = field.validate(val);
        if (result === false || typeof result === "string") {
          valid = false;
          showError(wrap, typeof result === "string" ? result : (field.errorText ?? `Invalid ${field.label}`));
        } else {
          hideErrorFor(wrap);
        }
      } else {
        hideErrorFor(wrap);
      }
    }

    return valid;
  }

  function showError(wrap: HTMLElement | undefined, msg: string): void {
    if (!wrap) return;
    const errEl = (wrap as Record<string, unknown>).__errorEl as HTMLElement | undefined;
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = "";
    }
    const input = wrap.querySelector("input, select, textarea") as HTMLElement | undefined;
    if (input) input.style.borderColor = "#ef4444";
  }

  function hideErrorFor(wrap: HTMLElement | undefined): void {
    if (!wrap) return;
    const errEl = (wrap as Record<string, unknown>).__errorEl as HTMLElement | undefined;
    if (errEl) errEl.style.display = "none";
    const input = wrap.querySelector("input, select, textarea") as HTMLElement | undefined;
    if (input) input.style.borderColor = "";
  }

  function hideError(): void {
    const formArea = panel.querySelector(".ob-form");
    if (!formArea) return;
    for (const wrap of Array.from(formArea.children)) {
      hideErrorFor(wrap as HTMLElement);
    }
  }

  const instance: OnboardingInstance = {
    element: panel,

    start() {
      if (destroyed || active) return;
      active = true;
      panel.style.display = "flex";
      requestAnimationFrame(() => { render(); });
    },

    next() {
      if (!active || destroyed || currentIdx >= opts.steps.length - 1) return;
      currentIdx++;
      runStepTransition();
    },

    prev() {
      if (!active || destroyed || currentIdx <= 0) return;
      currentIdx--;
      runStepTransition();
    },

    goTo(index: number) {
      if (!active || destroyed || index < 0 || index >= opts.steps.length) return;
      currentIdx = index;
      runStepTransition();
    },

    getCurrentStep() { return currentIdx; },
    getData() { return { ...formData }; },

    setData(data) {
      Object.assign(formData, data);
      if (active) render();
    },

    isActive() { return active; },

    complete() {
      if (!active) return;
      if (opts.persistKey) {
        try { localStorage.setItem(opts.persistKey, JSON.stringify({ completed: true, data: formData })); } catch {}
      }
      endFlow();
      opts.onComplete?.(formData);
    },

    skip() {
      if (!active) return;
      endFlow();
      opts.onSkip?.();
    },

    destroy() {
      destroyed = true;
      active = false;
      panel.remove();
    },
  };

  function runStepTransition(): void {
    const step = opts.steps[currentIdx];

    // Check condition
    if (step?.condition?.(formData) === false) {
      // Skip this step automatically
      if (currentIdx < opts.steps.length - 1) {
        currentIdx++;
        runStepTransition();
        return;
      }
    }

    // Animate out then in
    const content = panel.querySelector(".ob-content");
    if (content) {
      content.style.animation = "ob-slide-out-left 0.15s ease forwards";
      setTimeout(() => {
        render();
        opts.onStepChange?.(opts.steps[currentIdx]!, currentIdx);
        opts.steps[currentIdx]?.onEnter?.(formData);
      }, 150);
    } else {
      render();
      opts.onStepChange?.(opts.steps[currentIdx]!, currentIdx);
      opts.steps[currentIdx]?.onEnter?.(formData);
    }
  }

  function endFlow(): void {
    active = false;
    panel.style.animation = "ob-slide-out-left 0.25s ease forwards";
    setTimeout(() => {
      panel.style.display = "none";
      panel.style.animation = "";
      panel.innerHTML = "";
    }, 260);
  }

  return instance;
}
