/**
 * Input Group: Text input with prefix/suffix icons, validation states,
 * clear button, character counter, password toggle, helper text,
 * loading state, and accessibility.
 */

// --- Types ---

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "default" | "filled" | "underlined";
export type ValidationState = "default" | "success" | "error" | "warning";

export interface InputGroupOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Input type */
  type?: "text" | "password" | "email" | "number" | "tel" | "url" | "search";
  /** Placeholder */
  placeholder?: string;
  /** Initial value */
  value?: string;
  /** Size variant */
  size?: InputSize;
  /** Visual variant */
  variant?: InputVariant;
  /** Label text */
  label?: string;
  /** Helper/description text below input */
  helperText?: string;
  /** Error message (shown when state is 'error') */
  errorText?: string;
  /** Prefix icon/HTML (left side) */
  prefix?: string;
  /** Suffix icon/HTML (right side) */
  suffix?: string;
  /** Show clear button when has value */
  clearable?: boolean;
  /** Show character count */
  showCount?: boolean;
  /** Max character count */
  maxLength?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Required indicator */
  required?: boolean;
  /** Validation state */
  state?: ValidationState;
  /** Loading spinner in suffix */
  loading?: boolean;
  /** Callback on input change */
  onInput?: (value: string) => void;
  /** Callback on Enter key */
  onSubmit?: (value: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface InputGroupInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getValue: () => string;
  setValue: (value: string) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
  setState: (state: ValidationState) => void;
  setError: (message: string) => void;
  setHelper: (text: string) => void;
  setLoading: (loading: boolean) => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<InputSize, { fontSize: number; paddingX: number; paddingY: number; height: number; borderRadius: number }> = {
  sm: { fontSize: 12, paddingX: 8, paddingY: 4, height: 30, borderRadius: 6 },
  md: { fontSize: 13, paddingX: 10, paddingY: 6, height: 38, borderRadius: 8 },
  lg: { fontSize: 14, paddingX: 12, paddingY: 8, height: 46, borderRadius: 10 },
};

const STATE_COLORS: Record<ValidationState, { border: string; bg: string; focusRing: string }> = {
  default:  { border: "#d1d5db", bg: "#fff",   focusRing: "#6366f1" },
  success:  { border: "#22c55e", bg: "#f0fdf4", focusRing: "#22c55e" },
  error:    { border: "#ef4444", bg: "#fef2f2", focusRing: "#ef4444" },
  warning:  { border: "#f59e0b", bg: "#fffbeb", focusRing: "#f59e0b" },
};

// --- Main ---

export function createInputGroup(options: InputGroupOptions): InputGroupInstance {
  const opts = {
    type: options.type ?? "text",
    placeholder: options.placeholder ?? "",
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    required: options.required ?? false,
    clearable: options.clearable ?? false,
    showCount: options.showCount ?? false,
    loading: options.loading ?? false,
    state: options.state ?? "default",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("InputGroup: container not found");

  const sz = SIZE_STYLES[opts.size];
  const colors = STATE_COLORS[opts.state];

  // Outer wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `input-group ig-${opts.variant} ig-${opts.size} ${opts.className}`;
  wrapper.style.cssText = `
    display:flex;flex-direction:column;gap:4px;width:100%;
    font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  // Label
  let labelEl: HTMLElement | null = null;
  if (opts.label) {
    labelEl = document.createElement("label");
    labelEl.className = "input-label";
    labelEl.style.cssText = `font-size:${sz.fontSize}px;font-weight:500;color:#374151;display:flex;align-items:center;gap:2px;`;
    labelEl.textContent = opts.label;
    if (opts.required) {
      const reqMark = document.createElement("span");
      reqMark.style.cssText = "color:#ef4444;";
      reqMark.textContent = "*";
      labelEl.appendChild(reqMark);
    }
    wrapper.appendChild(labelEl);
  }

  // Input row
  const inputRow = document.createElement("div");
  inputRow.className = "input-row";

  if (opts.variant === "underlined") {
    inputRow.style.cssText = `
      display:flex;align-items:center;border-bottom:2px solid ${colors.border};
      transition:border-color 0.15s;padding:${sz.paddingY - 2}px ${sz.paddingX}px 0;
    `;
  } else if (opts.variant === "filled") {
    inputRow.style.cssText = `
      display:flex;align-items:center;background:${colors.bg};
      border:1px solid transparent;border-bottom:2px solid ${colors.border};
      border-radius:${sz.borderRadius}px ${sz.borderRadius}px 0 0;
      padding:${sz.paddingY}px ${sz.paddingX}px;
      transition:border-color 0.15s,background 0.15s;
    `;
  } else {
    inputRow.style.cssText = `
      display:flex;align-items:center;background:${colors.bg};
      border:1px solid ${colors.border};border-radius:${sz.borderRadius}px;
      padding:${sz.paddingY}px ${sz.paddingX}px;
      transition:border-color 0.15s,box-shadow 0.15s;
    `;
  }

  // Prefix
  if (opts.prefix) {
    const prefixEl = document.createElement("span");
    prefixEl.className = "input-prefix";
    prefixEl.innerHTML = opts.prefix;
    prefixEl.style.cssText = "display:flex;align-items:center;color:#9ca3af;font-size:inherit;flex-shrink:0;margin-right:6px;";
    inputRow.appendChild(prefixEl);
  }

  // Input element
  const input = document.createElement("input");
  input.type = opts.type;
  input.value = opts.value ?? "";
  input.placeholder = opts.placeholder;
  input.disabled = opts.disabled;
  input.readOnly = opts.readOnly;
  input.maxLength = opts.maxLength ?? 524288;
  input.autocomplete = "off";
  input.style.cssText = `
    flex:1;border:none;outline:none;background:transparent;
    font-size:${sz.fontSize}px;color:#111827;font-family:inherit;
    min-width:0;line-height:1.4;
    ${opts.disabled ? "cursor:not-allowed;" : ""}
    ${opts.readOnly ? "color:#6b7280;" : ""}
  `;
  inputRow.appendChild(input);

  // Clear button
  let clearBtn: HTMLButtonElement | null = null;
  if (opts.clearable) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "input-clear";
    clearBtn.innerHTML = "&times;";
    clearBtn.style.cssText = `
      background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;
      padding:0 2px;line-height:1;display:none;flex-shrink:0;
      transition:color 0.15s;
    `;
    clearBtn.addEventListener("click", () => {
      input.value = "";
      updateClearVisibility();
      updateCharCount();
      opts.onInput?.("");
      input.focus();
    });
    clearBtn.addEventListener("mouseenter", () => { clearBtn!.style.color = "#374151"; });
    clearBtn.addEventListener("mouseleave", () => { clearBtn!.style.color = "#9ca3af"; });
    inputRow.appendChild(clearBtn);
  }

  // Password toggle
  let pwdToggle: HTMLButtonElement | null = null;
  if (opts.type === "password") {
    pwdToggle = document.createElement("button");
    pwdToggle.type = "button";
    pwdToggle.className = "input-pwd-toggle";
    pwdToggle.setAttribute("aria-label", "Toggle password visibility");
    pwdToggle.style.cssText = `
      background:none;border:none;cursor:pointer;padding:0 4px;
      color:#9ca3af;font-size:14px;flex-shrink:0;display:flex;align-items:center;
    `;
    pwdToggle.textContent = "\u{1F441}";
    pwdToggle.addEventListener("click", () => {
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      pwdToggle!.textContent = isPassword ? "\u{1F576}" : "\u{1F441}";
    });
    inputRow.appendChild(pwdToggle);
  }

  // Loading spinner
  let loadingEl: HTMLSpanElement | null = null;
  if (opts.loading || true) {
    loadingEl = document.createElement("span");
    loadingEl.className = "input-loading";
    loadingEl.style.cssText = `
      display:flex;align-items:center;flex-shrink:0;margin-left:4px;
    `;
    loadingEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5" style="animation:spin 0.8s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
    if (!document.getElementById("ig-spin-style")) {
      const s = document.createElement("style");
      s.id = "ig-spin-style";
      s.textContent = "@keyframes spin{to{transform:rotate(360deg);}}";
      document.head.appendChild(s);
    }
    loadingEl.style.display = opts.loading ? "" : "none";
    inputRow.appendChild(loadingEl);
  }

  // Suffix
  if (opts.suffix) {
    const suffixEl = document.createElement("span");
    suffixEl.className = "input-suffix";
    suffixEl.innerHTML = opts.suffix;
    suffixEl.style.cssText = "display:flex;align-items:center;color:#9ca3af;font-size:inherit;flex-shrink:0;margin-left:6px;";
    inputRow.appendChild(suffixEl);
  }

  wrapper.appendChild(inputRow);

  // Helper / Error text area
  const bottomRow = document.createElement("div");
  bottomRow.className = "input-bottom-row";
  bottomRow.style.cssText = "display:flex;justify-content:space-between;align-items:center;min-height:18px;";

  const msgEl = document.createElement("span");
  msgEl.className = "input-message";
  msgEl.style.cssText = `font-size:11px;${
    opts.state === "error"
      ? "color:#ef4444;"
      : opts.state === "success"
        ? "color:#22c55e;"
        : opts.state === "warning"
          ? "color:#f59e0b;"
          : "color:#6b7280;"
  }`;
  msgEl.textContent = opts.errorText ?? opts.helperText ?? "";
  bottomRow.appendChild(msgEl);

  // Character count
  let countEl: HTMLSpanElement | null = null;
  if (opts.showCount) {
    countEl = document.createElement("span");
    countEl.className = "input-char-count";
    countEl.style.cssText = "font-size:11px;color:#9ca3af;";
    const currentLen = (opts.value ?? "").length;
    countEl.textContent = opts.maxLength ? `${currentLen}/${opts.maxLength}` : String(currentLen);
    bottomRow.appendChild(countEl);
  }

  wrapper.appendChild(bottomRow);

  // --- Helpers ---

  function updateClearVisibility(): void {
    if (clearBtn) {
      clearBtn.style.display = input.value.length > 0 ? "" : "none";
    }
  }

  function updateCharCount(): void {
    if (countEl) {
      const len = input.value.length;
      countEl.textContent = opts.maxLength ? `${len}/${opts.maxLength}` : String(len);
      if (opts.maxLength && len > opts.maxLength * 0.9) {
        countEl.style.color = len >= opts.maxLength ? "#ef4444" : "#f59e0b";
      } else {
        countEl.style.color = "#9ca3af";
      }
    }
  }

  function applyFocusStyle(): void {
    const c = STATE_COLORS[opts.state];
    if (opts.variant === "underlined") {
      inputRow.style.borderColor = c.focusRing;
    } else if (opts.variant === "filled") {
      inputRow.style.background = c.bg;
      inputRow.style.borderBottomColor = c.focusRing;
    } else {
      inputRow.style.borderColor = c.focusRing;
      inputRow.style.boxShadow = `0 0 0 3px ${c.focusRing}20`;
    }
  }

  function removeFocusStyle(): void {
    const c = STATE_COLORS[opts.state];
    if (opts.variant === "underlined") {
      inputRow.style.borderColor = c.border;
    } else if (opts.variant === "filled") {
      inputRow.style.background = c.bg;
      inputRow.style.borderBottomColor = c.border;
    } else {
      inputRow.style.borderColor = c.border;
      inputRow.style.boxShadow = "";
    }
  }

  function updateBorderForState(): void {
    const c = STATE_COLORS[opts.state];
    if (opts.variant === "underlined") {
      inputRow.style.borderBottomColor = c.border;
    } else if (opts.variant === "filled") {
      inputRow.style.background = c.bg;
      inputRow.style.borderBottomColor = c.border;
    } else {
      inputRow.style.borderColor = c.border;
      inputRow.style.background = c.bg;
    }
    msgEl.style.color =
      opts.state === "error" ? "#ef4444"
      : opts.state === "success" ? "#22c55e"
      : opts.state === "warning" ? "#f59e0b"
      : "#6b7280";
  }

  // --- Events ---

  input.addEventListener("focus", () => {
    applyFocusStyle();
    opts.onFocus?.();
  });

  input.addEventListener("blur", () => {
    removeFocusStyle();
    opts.onBlur?.();
  });

  input.addEventListener("input", () => {
    updateClearVisibility();
    updateCharCount();
    opts.onInput?.(input.value);
  });

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      opts.onSubmit?.(input.value);
    }
  });

  // Init
  updateClearVisibility();
  updateCharCount();

  const instance: InputGroupInstance = {
    element: wrapper,
    inputEl: input,

    getValue() { return input.value; },

    setValue(value: string) {
      input.value = value;
      updateClearVisibility();
      updateCharCount();
    },

    focus() { input.focus(); },

    blur() { input.blur(); },

    clear() {
      input.value = "";
      updateClearVisibility();
      updateCharCount();
      opts.onInput?.("");
    },

    setState(state: ValidationState) {
      opts.state = state;
      updateBorderForState();
    },

    setError(message: string) {
      opts.state = "error";
      opts.errorText = message;
      msgEl.textContent = message;
      msgEl.style.color = "#ef4444";
      updateBorderForState();
    },

    setHelper(text: string) {
      opts.helperText = text;
      if (opts.state !== "error") {
        msgEl.textContent = text;
      }
    },

    setLoading(loading: boolean) {
      opts.loading = loading;
      if (loadingEl) loadingEl.style.display = loading ? "" : "none";
    },

    disable() {
      opts.disabled = true;
      input.disabled = true;
      wrapper.style.opacity = "0.55";
    },

    enable() {
      opts.disabled = false;
      input.disabled = false;
      wrapper.style.opacity = "";
    },

    destroy() { wrapper.remove(); },
  };

  return instance;
}
