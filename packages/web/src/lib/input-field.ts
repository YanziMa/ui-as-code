/**
 * Input Field: Enhanced text input with validation states, prefixes/suffixes,
 * clear button, character counter, password toggle, textarea mode,
 * auto-resize, and accessible error messages.
 */

// --- Types ---

export type InputVariant = "default" | "filled" | "underlined" | "unstyled";
export type InputSize = "sm" | "md" | "lg";
export type InputState = "default" | "error" | "success" | "warning";

export interface InputFieldOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Input type */
  type?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  defaultValue?: string;
  /** Visual variant */
  variant?: InputVariant;
  /** Size variant */
  size?: InputSize;
  /** Label text */
  label?: string;
  /** Hint text below input */
  hint?: string;
  /** Error message (shows in error state) */
  error?: string;
  /** Success message */
  successMsg?: string;
  /** Prefix element or text */
  prefix?: string | HTMLElement;
  /** Suffix element or text */
  suffix?: string | HTMLElement;
  /** Show clear button? */
  clearable?: boolean;
  /** Max length for character counter */
  maxLength?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Textarea mode (multiline) */
  textarea?: boolean;
  /** Textarea rows (default: 3) */
  rows?: number;
  /** Auto-resize textarea? */
  autoResize?: boolean;
  /** Max height for auto-resize (px) */
  maxResizeHeight?: number;
  /** Callback on value change */
  onChange?: (value: string) => void;
  /** Callback on Enter key */
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
  inputEl: HTMLInputElement | HTMLTextAreaElement;
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
  setState: (state: InputState, message?: string) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<InputSize, { padding: string; fontSize: number; borderRadius: number }> = {
  sm: { padding: "6px 10px", fontSize: 12, borderRadius: 6 },
  md: { padding: "8px 12px", fontSize: 13, borderRadius: 8 },
  lg: { padding: "10px 14px", fontSize: 15, borderRadius: 8 },
};

const STATE_COLORS: Record<InputState, { border: string; bg: string; focusBorder: string; iconColor: string }> = {
  default: { border: "#d1d5db", bg: "#fff", focusBorder: "#6366f1", iconColor: "#9ca3af" },
  error:   { border: "#fca5a5", bg: "#fef2f2", focusBorder: "#ef4444", iconColor: "#ef4444" },
  success: { border: "#86efac", bg: "#f0fdf4", focusBorder: "#22c55e", iconColor: "#22c55e" },
  warning: { border: "#fcd34d", bg: "#fffbeb", focusBorder: "#f59e0b", iconColor: "#f59e0b" },
};

// --- Main Factory ---

export function createInputField(options: InputFieldOptions): InputInstance {
  const opts = {
    type: options.type ?? "text",
    placeholder: options.placeholder ?? "",
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    clearable: options.clearable ?? false,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    textarea: options.textarea ?? false,
    rows: options.rows ?? 3,
    autoResize: options.autoResize ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("InputField: container not found");

  const sz = SIZE_STYLES[opts.size];
  let currentState: InputState = opts.error ? "error" : opts.successMsg ? "success" : "default";

  // Outer wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `input-field if-${opts.variant} if-${opts.size} ${opts.className}`;
  wrapper.style.cssText = "display:flex;flex-direction:column;gap:4px;width:100%;font-family:-apple-system,sans-serif;";

  // Label
  let labelEl: HTMLLabelElement | null = null;
  if (opts.label) {
    labelEl = document.createElement("label");
    labelEl.className = "if-label";
    labelEl.style.cssText = `font-size:${sz.fontSize}px;font-weight:500;color:#374151;display:block;`;
    labelEl.textContent = opts.label;
    // Associate with input
    wrapper.appendChild(labelEl);
  }

  // Input wrapper (for prefix/input/suffix layout)
  const inputWrapper = document.createElement("div");
  inputWrapper.className = "if-input-wrapper";
  inputWrapper.style.cssText = `
    position:relative;display:flex;align-items:center;
  `;

  // Prefix
  if (opts.prefix) {
    const prefixEl = typeof opts.prefix === "string"
      ? document.createTextNode(opts.prefix)
      : opts.prefix;
    const prefixWrap = document.createElement("span");
    prefixWrap.className = "if-prefix";
    prefixWrap.style.cssText = `
      display:flex;align-items:center;padding-left:${sz.padding.split(" ")[1] ?? "12px"};
      color:#6b7280;font-size:${sz.fontSize}px;pointer-events:none;flex-shrink:0;
    `;
    if (typeof prefixEl === "string") prefixWrap.textContent = prefixEl;
    else prefixWrap.appendChild(prefixEl as HTMLElement);
    inputWrapper.appendChild(prefixWrap);
  }

  // Create input or textarea
  const inputEl = opts.textarea
    ? document.createElement("textarea")
    : document.createElement("input") as HTMLInputElement | HTMLTextAreaElement;

  inputEl.className = "if-input";
  inputEl.type = opts.type;
  inputEl.placeholder = opts.placeholder;
  inputEl.value = opts.defaultValue ?? "";
  inputEl.disabled = opts.disabled;
  inputEl.readOnly = opts.readOnly;
  if (opts.maxLength) inputEl.maxLength = opts.maxLength;

  if (opts.textarea) {
    (inputEl as HTMLTextAreaElement).rows = opts.rows;
    (inputEl as HTMLTextAreaElement).style.resize = opts.autoResize ? "none" : "vertical";
  }

  applyInputStyles();
  inputWrapper.appendChild(inputEl);

  // Suffix
  if (opts.suffix) {
    const suffixEl = typeof opts.suffix === "string"
      ? document.createTextNode(opts.suffix)
      : opts.suffix;
    const suffixWrap = document.createElement("span");
    suffixWrap.className = "if-suffix";
    suffixWrap.style.cssText = `
      display:flex;align-items:center;padding-right:${sz.padding.split(" ")[1] ?? "12px"};
      color:#6b7280;font-size:${sz.fontSize}px;pointer-events:none;flex-shrink:0;
    `;
    if (typeof suffixEl === "string") suffixWrap.textContent = suffixEl;
    else suffixWrap.appendChild(suffixEl as HTMLElement);
    inputWrapper.appendChild(suffixWrap);
  }

  // Clear button
  let clearBtn: HTMLButtonElement | null = null;
  if (opts.clearable) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "if-clear";
    clearBtn.setAttribute("aria-label", "Clear");
    clearBtn.innerHTML = "&times;";
    clearBtn.style.cssText = `
      position:absolute;right:8px;top:50%;transform:translateY(-50%);
      background:none;border:none;cursor:pointer;font-size:16px;line-height:1;
      color:#9ca3af;padding:2px;border-radius:4px;opacity:0;
      transition:opacity 0.15s;
      display:none;
    `;
    clearBtn.addEventListener("click", () => instance.clear());
    clearBtn.addEventListener("mouseenter", () => { clearBtn!.style.color = "#374151"; });
    clearBtn.addEventListener("mouseleave", () => { clearBtn!.style.color = "#9ca3af"; });
    inputWrapper.appendChild(clearBtn);

    // Show/hide based on value
    updateClearVisibility();
  }

  // Password toggle
  let passwordToggle: HTMLButtonElement | null = null;
  if (opts.type === "password") {
    passwordToggle = document.createElement("button");
    passwordToggle.type = "button";
    passwordToggle.className = "if-password-toggle";
    passwordToggle.setAttribute("aria-label", "Toggle password visibility");
    passwordToggle.style.cssText = `
      position:absolute;right:${opts.clearable ? "32px" : "8"}px;top:50%;transform:translateY(-50%);
      background:none;border:none;cursor:pointer;padding:2px 4px;color:#9ca3af;
      font-size:13px;transition:color 0.15s;
    `;
    passwordToggle.textContent = "Show";
    passwordToggle.addEventListener("click", () => {
      const isPassword = inputEl.getAttribute("type") === "password";
      inputEl.setAttribute("type", isPassword ? "text" : "password");
      passwordToggle!.textContent = isPassword ? "Hide" : "Show";
    });
    inputWrapper.appendChild(passwordToggle);
  }

  // Character counter
  let charCounter: HTMLSpanElement | null = null;
  if (opts.maxLength) {
    charCounter = document.createElement("span");
    charCounter.className = "if-char-counter";
    charCounter.style.cssText = `
      font-size:11px;color:#9ca3af;text-align:right;user-select:none;
    `;
    updateCharCount();
  }

  // Message area (error/success/hint)
  let msgEl: HTMLDivElement | null = null;
  if (opts.error || opts.successMsg || opts.hint) {
    msgEl = document.createElement("div");
    msgEl.className = "if-message";
    msgEl.style.cssText = `font-size:${sz.fontSize - 1}px;display:flex;align-items:center;gap:4px;`;
    setStateMessage(currentState, opts.error ?? opts.successMsg ?? opts.hint);
  }

  // Assemble
  wrapper.appendChild(inputWrapper);
  if (charCounter) wrapper.appendChild(charCounter);
  if (msgEl) wrapper.appendChild(msgEl);
  container.appendChild(wrapper);

  // --- Helper functions ---

  function applyInputStyles(): void {
    const colors = STATE_COLORS[currentState];
    const baseStyles = `
      flex:1;padding:${sz.padding};font-size:${sz.fontSize}px;
      font-family:inherit;color:#111827;background:${colors.bg};
      border:1.5px solid ${colors.border};border-radius:${sz.borderRadius}px;
      outline:none;transition:border-color 0.15s,box-shadow 0.15s;
      width:100%;box-sizing:border-box;
    `;

    switch (opts.variant) {
      case "filled":
        inputEl.style.cssText = baseStyles + `border-color:transparent;border-bottom-color:${colors.border};border-radius:${sz.borderRadius}px ${sz.borderRadius}px 0 0;`;
        break;
      case "underlined":
        inputEl.style.cssText = baseStyles + `border-color:transparent;border-bottom:2px solid ${colors.border};border-radius:0;padding-left:0;padding-right:0;background:transparent;`;
        break;
      case "unstyled":
        inputEl.style.cssText = baseStyles + `border:none;background:transparent;padding:0;`;
        break;
      default:
        inputEl.style.cssText = baseStyles;
    }
  }

  function setStateMessage(state: InputState, message?: string): void {
    if (!msgEl) return;
    const colorMap: Record<string, string> = {
      default: "#6b7280",
      error: "#ef4444",
      success: "#16a34a",
      warning: "#d97706",
    };
    msgEl.style.color = colorMap[state] ?? colorMap.default;
    msgEl.textContent = message ?? "";
  }

  function updateClearVisibility(): void {
    if (!clearBtn) return;
    const hasValue = inputEl.value.length > 0;
    clearBtn.style.display = hasValue ? "" : "none";
  }

  function updateCharCount(): void {
    if (!charCounter || !opts.maxLength) return;
    const count = inputEl.value.length;
    const isOver = count > opts.maxLength;
    charCounter.textContent = `${count}/${opts.maxLength}`;
    charCounter.style.color = isOver ? "#ef4444" : count > opts.maxLength * 0.9 ? "#d97706" : "#9ca3af";
  }

  function autoResizeTextarea(): void {
    if (!opts.autoResize || !opts.textarea) return;
    const ta = inputEl as HTMLTextAreaElement;
    ta.style.height = "auto";
    const newHeight = Math.min(ta.scrollHeight, opts.maxResizeHeight ?? 400);
    ta.style.height = `${newHeight}px`;
  }

  // --- Event handlers ---

  inputEl.addEventListener("focus", () => {
    const colors = STATE_COLORS[currentState];
    if (opts.variant === "default") {
      inputEl.style.borderColor = colors.focusBorder;
      inputEl.style.boxShadow = `0 0 0 3px ${colors.focusBorder}20`;
    } else if (opts.variant === "underlined") {
      inputEl.style.borderBottomColor = colors.focusBorder;
    }
    if (clearBtn) clearBtn.style.opacity = "1";
    opts.onFocus?.();
  });

  inputEl.addEventListener("blur", () => {
    applyInputStyles();
    if (clearBtn) clearBtn.style.opacity = "0";
    opts.onBlur?.();
  });

  inputEl.addEventListener("input", () => {
    opts.onChange?.(inputEl.value);
    updateClearVisibility();
    updateCharCount();
    if (opts.autoResize && opts.textarea) autoResizeTextarea();
  });

  inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !opts.textarea) {
      e.preventDefault();
      opts.onEnter?.(inputEl.value);
    }
  });

  // Instance
  const instance: InputInstance = {
    element: wrapper,
    inputEl,

    getValue() { return inputEl.value; },

    setValue(value: string) {
      inputEl.value = value;
      updateClearVisibility();
      updateCharCount();
      if (opts.autoResize && opts.textarea) autoResizeTextarea();
    },

    focus() { inputEl.focus(); },
    blur() { inputEl.blur(); },

    clear() {
      inputEl.value = "";
      updateClearVisibility();
      updateCharCount();
      opts.onChange?.("");
      inputEl.focus();
    },

    setState(state: InputState, message?: string) {
      currentState = state;
      applyInputStyles();
      if (msgEl) setStateMessage(state, message);
    },

    disable() {
      opts.disabled = true;
      inputEl.disabled = true;
      wrapper.style.opacity = "0.6";
    },

    enable() {
      opts.disabled = false;
      inputEl.disabled = false;
      wrapper.style.opacity = "";
    },

    destroy() { wrapper.remove(); },
  };

  return instance;
}
