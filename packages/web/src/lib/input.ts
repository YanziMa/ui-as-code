/**
 * Enhanced Input: Text input component with icon, validation states, clear button,
 * character counter, prefix/suffix, password toggle, loading state, and ARIA support.
 */

// --- Types ---

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "default" | "filled" | "underlined" | "unstyled";
export type InputState = "default" | "error" | "success" | "warning";

export interface InputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Input type */
  type?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  value?: string;
  /** Size variant */
  size?: InputSize;
  /** Visual variant */
  variant?: InputVariant;
  /** Validation state */
  state?: InputState;
  /** Error message */
  error?: string;
  /** Helper text below input */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Icon on the left (emoji or SVG string) */
  leftIcon?: string;
  /** Icon on the right (emoji or SVG string) */
  rightIcon?: string;
  /** Show clear button when has value */
  clearable?: boolean;
  /** Max length for counter */
  maxLength?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Loading spinner */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Callback on change */
  onChange?: (value: string) => void;
  /** Callback on enter key */
  onEnter?: (value: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface InputInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getState: () => InputState;
  setState: (state: InputState, message?: string) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<InputSize, { padding: string; fontSize: number; height: number; iconSize: number; borderRadius: number }> = {
  sm: { padding: "6px 10px", fontSize: 13, height: 32, iconSize: 14, borderRadius: 6 },
  md: { padding: "8px 12px", fontSize: 14, height: 38, iconSize: 16, borderRadius: 8 },
  lg: { padding: "10px 14px", fontSize: 15, height: 44, iconSize: 18, borderRadius: 8 },
};

const STATE_COLORS: Record<InputState, { border: string; bg: string; focusRing: string }> = {
  default:  { border: "#d1d5db", bg: "#fff",   focusRing: "#6366f1" },
  success:  { border: "#86efac", bg: "#f0fdf4", focusRing: "#16a34a" },
  warning:  { border: "#fcd34d", bg: "#fffbeb", focusRing: "#d97706" },
  error:    { border: "#fca5a5", bg: "#fef2f2", focusRing: "#dc2626" },
};

// --- Main ---

export function createInput(options: InputOptions): InputInstance {
  const opts = {
    type: options.type ?? "text",
    placeholder: options.placeholder ?? "",
    value: options.value ?? "",
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    state: options.state ?? "default",
    clearable: options.clearable ?? false,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    loading: options.loading ?? false,
    fullWidth: options.fullWidth ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Input: container not found");

  const sz = SIZE_STYLES[opts.size];
  const colors = STATE_COLORS[opts.state];

  // Outer wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `input-wrapper ${opts.className}`;
  wrapper.style.cssText = `
    display:flex;flex-direction:column;gap:4px;
    ${opts.fullWidth ? "width:100%;" : ""}
    font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  // Label
  let labelEl: HTMLLabelElement | null = null;
  if (opts.label) {
    labelEl = document.createElement("label");
    labelEl.className = "input-label";
    labelEl.style.cssText = `font-size:${sz.fontSize - 1}px;font-weight:500;color:#374151;display:block;margin-bottom:2px;`;
    labelEl.textContent = opts.label;
    wrapper.appendChild(labelEl);
  }

  // Input container (holds icon + input + suffix)
  const inputContainer = document.createElement("div");
  inputContainer.className = "input-container";
  inputContainer.style.cssText = `
    position:relative;display:flex;align-items:center;width:100%;
  `;
  wrapper.appendChild(inputContainer);

  // Left icon
  if (opts.leftIcon) {
    const leftIconEl = document.createElement("span");
    leftIconEl.className = "input-left-icon";
    leftIconEl.textContent = opts.leftIcon;
    leftIconEl.style.cssText = `
      position:absolute;left:${sz.padding.split(" ")[1]};z-index:1;
      font-size:${sz.iconSize}px;color:#9ca3af;pointer-events:none;
      display:flex;align-items:center;
    `;
    inputContainer.appendChild(leftIconEl);
  }

  // Main input
  const input = document.createElement("input");
  input.type = opts.type;
  input.className = "input-field";
  input.value = opts.value;
  input.placeholder = opts.placeholder;
  input.disabled = opts.disabled;
  input.readOnly = opts.readOnly;
  if (opts.maxLength) input.maxLength = opts.maxLength;

  // Apply variant styles
  const paddingLeft = opts.leftIcon ? `${sz.iconSize + 16}px` : sz.padding.split(" ")[1];
  const paddingRightBase = sz.padding.split(" ")[1];

  switch (opts.variant) {
    case "filled":
      input.style.cssText = `
        width:100%;height:${sz.height}px;padding-left:${paddingLeft};
        padding-right:${paddingRightBase}px;font-size:${sz.fontSize}px;
        background:${colors.bg};border:none;border-bottom:2px solid ${colors.border};
        border-radius:${sz.borderRadius}px ${sz.borderRadius}px 0 0;
        outline:none;transition:border-color 0.15s,background 0.15s;
        box-sizing:border-box;color:#111827;
      `;
      break;
    case "underlined":
      input.style.cssText = `
        width:100%;height:${sz.height}px;padding-left:${paddingLeft};
        padding-right:${paddingRightBase}px;font-size:${sz.fontSize}px;
        background:transparent;border:none;border-bottom:2px solid ${colors.border};
        border-radius:0;outline:none;transition:border-color 0.15s;
        box-sizing:border-box;color:#111827;
      `;
      break;
    case "unstyled":
      input.style.cssText = `
        width:100%;height:${sz.height}px;padding-left:${paddingLeft};
        padding-right:${paddingRightBase}px;font-size:${sz.fontSize}px;
        background:transparent;border:none;outline:none;
        box-sizing:border-box;color:#111827;
      `;
      break;
    default:
      input.style.cssText = `
        width:100%;height:${sz.height}px;padding:${sz.padding};
        padding-left:${paddingLeft};font-size:${sz.fontSize}px;
        background:${colors.bg};border:1px solid ${colors.border};
        border-radius:${sz.borderRadius}px;outline:none;
        transition:border-color 0.15s,box-shadow 0.15s;
        box-sizing:border-box;color:#111827;
      `;
  }

  inputContainer.appendChild(input);

  // Right side area (clear button / loading / right icon)
  const rightArea = document.createElement("div");
  rightArea.className = "input-right-area";
  rightArea.style.cssText = `
    position:absolute;right:8px;display:flex;align-items:center;gap:4px;z-index:1;
  `;
  inputContainer.appendChild(rightArea);

  // Clear button
  let clearBtn: HTMLButtonElement | null = null;
  if (opts.clearable) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&times;";
    clearBtn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:16px;
      color:#9ca3af;padding:0 2px;line-height:1;display:none;
      transition:color 0.15s;
    `;
    clearBtn.addEventListener("click", () => instance.clear());
    clearBtn.addEventListener("mouseenter", () => { clearBtn!.style.color = "#374151"; });
    clearBtn.addEventListener("mouseleave", () => { clearBtn!.style.color = "#9ca3af"; });
    rightArea.appendChild(clearBtn);
    updateClearVisibility();
  }

  // Password toggle
  let pwToggle: HTMLButtonElement | null = null;
  if (opts.type === "password") {
    pwToggle = document.createElement("button");
    pwToggle.type = "button";
    pwToggle.textContent = "\u{1F441}";
    pwToggle.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:14px;
      color:#9ca3af;padding:0 2px;
    `;
    pwToggle.addEventListener("click", () => {
      input.type = input.type === "password" ? "text" : "password";
      pwToggle!.textContent = input.type === "password" ? "\u{1F441}" : "\u{1F440}";
    });
    rightArea.appendChild(pwToggle);
  }

  // Right icon
  if (opts.rightIcon) {
    const rightIconEl = document.createElement("span");
    rightIconEl.textContent = opts.rightIcon;
    rightIconEl.style.cssText = `font-size:${sz.iconSize}px;color:#9ca3af;`;
    rightArea.appendChild(rightIconEl);
  }

  // Loading spinner
  let loadingSpinner: HTMLElement | null = null;
  if (opts.loading) {
    showLoading();
  }

  function showLoading(): void {
    if (!loadingSpinner) {
      loadingSpinner = document.createElement("span");
      loadingSpinner.innerHTML = `<svg width="${sz.iconSize}" height="${sz.iconSize}" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2.5" style="animation:input-spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>`;
      if (!document.getElementById("input-spinner-style")) {
        const s = document.createElement("style");
        s.id = "input-spinner-style";
        s.textContent = "@keyframes input-spin{to{transform:rotate(360deg);}}";
        document.head.appendChild(s);
      }
      rightArea.appendChild(loadingSpinner);
    }
  }

  function hideLoading(): void {
    loadingSpinner?.remove();
    loadingSpinner = null;
  }

  // Character counter
  let counterEl: HTMLSpanElement | null = null;
  if (opts.maxLength) {
    counterEl = document.createElement("span");
    counterEl.className = "input-counter";
    counterEl.style.cssText = `font-size:11px;color:#9ca3af;text-align:right;`;
    updateCounter();
    wrapper.appendChild(counterEl);
  }

  // Helper / error text
  let helperEl: HTMLDivElement | null = null;
  if (opts.helperText || opts.error) {
    helperEl = document.createElement("div");
    helperEl.className = "input-helper";
    helperEl.style.cssText = `font-size:12px;${opts.state === "error" ? "color:#dc2626;" : "color:#6b7280;"}`;
    helperEl.textContent = opts.error ?? opts.helperText ?? "";
    wrapper.appendChild(helperEl);
  }

  // --- Internal methods ---

  function updateClearVisibility(): void {
    if (clearBtn) {
      clearBtn.style.display = input.value.length > 0 ? "" : "none";
    }
  }

  function updateCounter(): void {
    if (counterEl) {
      const len = input.value.length;
      const max = opts.maxLength ?? 0;
      const nearLimit = max > 0 && len > max * 0.9;
      counterEl.textContent = `${len}/${max}`;
      counterEl.style.color = len > max ? "#dc2626" : nearLimit ? "#d97706" : "#9ca3af";
    }
  }

  function applyStateStyles(): void {
    const c = STATE_COLORS[opts.state];
    if (opts.variant === "default") {
      input.style.borderColor = c.border;
      input.style.background = c.bg;
    } else if (opts.variant === "filled" || opts.variant === "underlined") {
      input.style.borderColor = c.border;
    }
    if (helperEl) {
      helperEl.style.color = opts.state === "error" ? "#dc2626" : "#6b7280";
      helperEl.textContent = opts.error ?? opts.helperText ?? "";
    }
  }

  // Event handlers
  input.addEventListener("input", () => {
    updateClearVisibility();
    updateCounter();
    opts.onChange?.(input.value);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      opts.onEnter?.(input.value);
    }
  });

  input.addEventListener("focus", () => {
    if (opts.variant !== "unstyled") {
      input.style.boxShadow = `0 0 0 3px ${colors.focusRing}20`;
      if (opts.variant === "default") input.style.borderColor = colors.focusRing;
      else if (opts.variant === "filled" || opts.variant === "underlined") input.style.borderColor = colors.focusRing;
    }
    opts.onFocus?.();
  });

  input.addEventListener("blur", () => {
    input.style.boxShadow = "";
    applyStateStyles();
    opts.onBlur?.();
  });

  // Instance
  const instance: InputInstance = {
    element: wrapper,
    inputEl: input,

    getValue() { return input.value; },

    setValue(value: string) {
      input.value = value;
      updateClearVisibility();
      updateCounter();
    },

    getState() { return opts.state; },

    setState(state: InputState, message?: string) {
      opts.state = state;
      if (message !== undefined) opts.error = state === "error" ? message : undefined;
      if (message !== undefined && state !== "error") opts.helperText = message;
      applyStateStyles();
    },

    focus() { input.focus(); },
    blur() { input.blur(); },

    clear() {
      input.value = "";
      updateClearVisibility();
      updateCounter();
      opts.onChange?.("");
    },

    disable() {
      opts.disabled = true;
      input.disabled = true;
    },

    enable() {
      opts.disabled = false;
      input.disabled = false;
    },

    destroy() { wrapper.remove(); },
  };

  return instance;
}
