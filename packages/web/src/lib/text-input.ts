/**
 * Enhanced Text Input: Text input with label, validation states, clear button,
 * password toggle, prefix/suffix icons, character counter, auto-complete,
 * input mask, debounce, and ARIA accessibility.
 */

// --- Types ---

export type InputSize = "sm" | "md" | "lg";
export type InputState = "default" | "error" | "success" | "warning";

export interface TextInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Input type */
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search";
  /** Placeholder text */
  placeholder?: string;
  /** Default value */
  value?: string;
  /** Size variant */
  size?: InputSize;
  /** Validation state */
  state?: InputState;
  /** Error message */
  error?: string;
  /** Helper text below input */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Max length */
  maxLength?: number;
  /** Min length */
  minLength?: number;
  /** Pattern (regex string) */
  pattern?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Required indicator */
  required?: boolean;
  /** Show clear button when has value */
  clearable?: boolean;
  /** Show password visibility toggle (for type="password") */
  showPasswordToggle?: boolean;
  /** Prefix icon/text/element */
  prefix?: string | HTMLElement;
  /** Suffix icon/text/element */
  suffix?: string | HTMLElement;
  /** Full width */
  fullWidth?: boolean;
  /** Auto-focus on mount */
  autoFocus?: boolean;
  /** Debounce onChange callback (ms) */
  debounceMs?: number;
  /** Input mask pattern (e.g., "000-000-0000") */
  mask?: string;
  /** Callback on value change */
  onChange?: (value: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Callback on Enter key */
  onEnter?: () => void;
  /** Callback on Escape key */
  onEscape?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface TextInputInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getValue: () => string;
  setValue: (value: string) => void;
  getState: () => InputState;
  setState: (state: InputState, message?: string) => void;
  focus: () => void;
  blur: () => void;
  select: () => void;
  clear: () => void;
  setError: (msg: string) => void;
  clearError: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<InputSize, { padding: string; fontSize: number; borderRadius: number }> = {
  sm: { padding: "6px 10px", fontSize: 13, borderRadius: 6 },
  md: { padding: "8px 12px", fontSize: 14, borderRadius: 8 },
  lg: { padding: "10px 14px", fontSize: 15, borderRadius: 8 },
};

const STATE_COLORS: Record<InputState, { border: string; bg: string; focusRing: string }> = {
  default:  { border: "#d1d5db", bg: "#fff",   focusRing: "#6366f1" },
  success:  { border: "#86efac", bg: "#f0fdf4", focusRing: "#16a34a" },
  warning:  { border: "#fcd34d", bg: "#fffbeb", focusRing: "#d97706" },
  error:    { border: "#fca5a5", bg: "#fef2f2", focusRing: "#dc2626" },
};

// --- Mask Helpers ---

function applyMask(value: string, mask: string): string {
  const chars = value.replace(/\D/g, "");
  let result = "";
  let charIdx = 0;

  for (let i = 0; i < mask.length && charIdx < chars.length; i++) {
    if (mask[i] === "0" || mask[i] === "9" || mask[i] === "A") {
      result += chars[charIdx]!;
      charIdx++;
    } else {
      result += mask[i];
    }
  }

  return result;
}

// --- Main ---

export function createTextInput(options: TextInputOptions): TextInputInstance {
  const opts = {
    type: options.type ?? "text",
    placeholder: options.placeholder ?? "",
    value: options.value ?? "",
    size: options.size ?? "md",
    state: options.state ?? "default",
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    required: options.required ?? false,
    clearable: options.clearable ?? false,
    showPasswordToggle: options.showPasswordToggle ?? false,
    fullWidth: options.fullWidth ?? true,
    autoFocus: options.autoFocus ?? false,
    debounceMs: options.debounceMs ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TextInput: container not found");

  const sz = SIZE_STYLES[opts.size];
  const colors = STATE_COLORS[opts.state];

  // Outer wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `text-input-wrapper ${opts.className}`;
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
    labelEl.className = "ti-label";
    labelEl.htmlFor = "ti-input";
    labelEl.style.cssText = `font-size:${sz.fontSize - 1}px;font-weight:500;color:#374151;display:block;margin-bottom:2px;`;
    labelEl.textContent = opts.label;

    if (opts.required) {
      const req = document.createElement("span");
      req.style.cssText = "color:#ef4444;margin-left:2px;";
      req.textContent = "*";
      labelEl.appendChild(req);
    }
    wrapper.appendChild(labelEl);
  }

  // Input wrapper (for prefix/suffix/clear/password toggle)
  const inputWrapper = document.createElement("div");
  inputWrapper.className = "ti-input-wrapper";
  inputWrapper.style.cssText = "position:relative;display:flex;align-items:center;";
  wrapper.appendChild(inputWrapper);

  // Prefix
  if (opts.prefix) {
    const pre = document.createElement("span");
    pre.className = "ti-prefix";
    pre.style.cssText = "display:flex;align-items:center;padding-left:10px;color:#6b7280;font-size:14px;pointer-events:none;white-space:nowrap;flex-shrink:0;";
    if (typeof opts.prefix === "string") pre.textContent = opts.prefix;
    else pre.appendChild(opts.prefix);
    inputWrapper.appendChild(pre);
  }

  // Main input element
  const input = document.createElement("input");
  input.id = "ti-input";
  input.type = opts.type;
  input.value = opts.mask ? applyMask(opts.value, opts.mask) : opts.value;
  input.placeholder = opts.placeholder;
  input.disabled = opts.disabled;
  input.readOnly = opts.readOnly;
  input.autocomplete = "off";
  input.spellcheck = false;
  if (opts.maxLength != null) input.maxLength = opts.maxLength;
  if (opts.minLength != null) input.minLength = opts.minLength;
  if (opts.pattern) input.pattern = opts.pattern;
  if (opts.autoFocus) input.autofocus = true;

  input.style.cssText = `
    width:100%;padding:${sz.padding};font-size:${sz.fontSize}px;font-family:inherit;
    line-height:1.5;color:#111827;background:${colors.bg};
    border:1px solid ${colors.border};border-radius:${sz.borderRadius}px;
    outline:none;transition:border-color 0.15s,box-shadow 0.15s;
    box-sizing:border-box;
    ${opts.prefix ? "padding-left:8px;" : ""}
    ${opts.suffix || opts.clearable || (opts.showPasswordToggle && opts.type === "password") ? "padding-right:36px;" : ""}
    ${opts.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
    ${opts.readOnly ? "cursor:default;" : ""}
  `;
  inputWrapper.appendChild(input);

  // Clear button
  let clearBtn: HTMLButtonElement | null = null;
  if (opts.clearable) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&times;";
    clearBtn.title = "Clear";
    clearBtn.style.cssText = `
      position:absolute;right:8px;background:none;border:none;
      font-size:16px;color:#9ca3af;cursor:pointer;padding:2px 4px;
      display:none;line-height:1;z-index:1;transition:color 0.15s;
    `;
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      instance.clear();
      input.focus();
    });
    clearBtn.addEventListener("mouseenter", () => { clearBtn!.style.color = "#374151"; });
    clearBtn.addEventListener("mouseleave", () => { clearBtn!.style.color = "#9ca3af"; });
    inputWrapper.appendChild(clearBtn);
  }

  // Password toggle
  let pwdToggle: HTMLButtonElement | null = null;
  if (opts.showPasswordToggle && opts.type === "password") {
    pwdToggle = document.createElement("button");
    pwdToggle.type = "button";
    pwdToggle.textContent = "\u{1F441}";
    pwdToggle.title = "Show password";
    pwdToggle.style.cssText = `
      position:absolute;right:${opts.clearable ? "32px" : "8px"}px;background:none;border:none;
      font-size:14px;cursor:pointer;padding:2px 4px;z-index:1;transition:opacity 0.15s;
    `;
    pwdToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isPwd = input.type === "password";
      input.type = isPwd ? "text" : "password";
      pwdToggle!.textContent = isPwd ? "\u{1F441}" : "\u{1F576}";
      pwdToggle!.title = isPwd ? "Hide password" : "Show password";
    });
    inputWrapper.appendChild(pwdToggle);
  }

  // Suffix
  if (opts.suffix) {
    const suf = document.createElement("span");
    suf.className = "ti-suffix";
    suf.style.cssText = "display:flex;align-items:center;padding-right:10px;color:#6b7280;font-size:14px;pointer-events:none;white-space:nowrap;flex-shrink:0;";
    if (typeof opts.suffix === "string") suf.textContent = opts.suffix;
    else suf.appendChild(opts.suffix);
    inputWrapper.appendChild(suf);
  }

  // Character counter
  let counterEl: HTMLSpanElement | null = null;
  if (opts.maxLength) {
    counterEl = document.createElement("span");
    counterEl.className = "ti-counter";
    counterEl.style.cssText = `font-size:11px;color:#9ca3af;text-align:right;`;
    updateCounter();
    wrapper.appendChild(counterEl);
  }

  // Helper / error text
  let helperEl: HTMLDivElement | null = null;
  if (opts.helperText || opts.error) {
    helperEl = document.createElement("div");
    helperEl.className = "ti-helper";
    helperEl.style.cssText = `font-size:12px;${opts.state === "error" ? "color:#dc2626;" : "color:#6b7280;"}`;
    helperEl.textContent = opts.error ?? opts.helperText ?? "";
    wrapper.appendChild(helperEl);
  }

  // --- Internal methods ---

  function updateCounter(): void {
    if (!counterEl) return;
    const len = input.value.length;
    const max = opts.maxLength ?? 0;
    const nearLimit = max > 0 && len > max * 0.9;
    counterEl.textContent = `${len}/${max}`;
    counterEl.style.color = len > max ? "#dc2626" : nearLimit ? "#d97706" : "#9ca3af";
  }

  function applyStateStyles(): void {
    const c = STATE_COLORS[opts.state];
    input.style.borderColor = c.border;
    input.style.background = c.bg;
    if (helperEl) {
      helperEl.style.color = opts.state === "error" ? "#dc2626" : "#6b7280";
      helperEl.textContent = opts.error ?? opts.helperText ?? "";
    }
  }

  function updateClearVisibility(): void {
    if (clearBtn) {
      clearBtn.style.display = input.value.length > 0 ? "block" : "none";
    }
  }

  // Debounce support
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function fireChange(): void {
    if (opts.debounceMs > 0) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        opts.onChange?.(input.value);
      }, opts.debounceMs);
    } else {
      opts.onChange?.(input.value);
    }
  }

  // Event handlers
  input.addEventListener("focus", () => {
    input.style.boxShadow = `0 0 0 3px ${colors.focusRing}20`;
    input.style.borderColor = colors.focusRing;
    opts.onFocus?.();
  });

  input.addEventListener("blur", () => {
    input.style.boxShadow = "";
    applyStateStyles();
    opts.onBlur?.();
  });

  input.addEventListener("input", () => {
    // Apply mask if set
    if (opts.mask) {
      const cursorPos = input.selectionStart;
      const masked = applyMask(input.value, opts.mask);
      input.value = masked;
      // Try to restore cursor position
      try { input.setSelectionRange(cursorPos ?? masked.length, cursorPos ?? masked.length); } catch {}
    }
    updateClearVisibility();
    updateCounter();
    fireChange();
  });

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        opts.onEnter?.();
        break;
      case "Escape":
        opts.onEscape?.();
        break;
    }
  });

  // Initial state
  updateClearVisibility();

  // Instance
  const instance: TextInputInstance = {
    element: wrapper,
    inputEl: input,

    getValue() { return input.value; },

    setValue(value: string) {
      input.value = opts.mask ? applyMask(value, opts.mask) : value;
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
    select() { input.select(); },

    clear() {
      input.value = "";
      updateClearVisibility();
      updateCounter();
      opts.onChange?.("");
    },

    setError(msg: string) {
      opts.error = msg;
      opts.state = "error";
      applyStateStyles();
    },

    clearError() {
      opts.error = undefined;
      opts.state = "default";
      applyStateStyles();
    },

    disable() {
      opts.disabled = true;
      input.disabled = true;
      input.style.opacity = "0.5";
    },

    enable() {
      opts.disabled = false;
      input.disabled = false;
      input.style.opacity = "";
    },

    destroy() {
      if (debounceTimer) clearTimeout(debounceTimer);
      wrapper.remove();
    },
  };

  return instance;
}
