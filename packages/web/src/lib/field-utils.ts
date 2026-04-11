/**
 * Field Utilities: Form field components with labels, error messages,
 * help text, character counters, password toggles, clear buttons,
 * field groups, and field layout helpers.
 */

// --- Types ---

export type FieldVariant = "default" | "filled" | "outlined" | "underlined" | "unstyled";
export type FieldSize = "sm" | "md" | "lg";
export type FieldState = "default" | "error" | "success" | "warning" | "disabled";

export interface FieldOptions {
  /** Input type */
  type?: string;
  /** Field name */
  name?: string;
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Initial value */
  value?: string;
  /** Default value */
  defaultValue?: string;
  /** Help text below input */
  helpText?: string;
  /** Error message */
  error?: string;
  /** Success message */
  successMsg?: string;
  /** Warning message */
  warningMsg?: string;
  /** Visual variant */
  variant?: FieldVariant;
  /** Size */
  size?: FieldSize;
  /** State override */
  state?: FieldState;
  /** Required indicator */
  required?: boolean;
  /** Disabled */
  disabled?: boolean;
  /** Read-only */
  readOnly?: boolean;
  /** Max length */
  maxLength?: number;
  /** Show character counter */
  showCharCount?: boolean;
  /** Show clear button */
  clearable?: boolean;
  /** Show password toggle (for password fields) */
  passwordToggle?: boolean;
  /** Prefix element/icon */
  prefix?: HTMLElement | string;
  /** Suffix element/icon */
  suffix?: HTMLElement | string;
  /** Left icon HTML */
  leftIcon?: string;
  /** Right icon HTML */
  rightIcon?: string;
  /** Full width */
  fullWidth?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called on value change */
  onChange?: (value: string) => void;
  /** Called on focus */
  onFocus?: () => void;
  /** Called on blur */
  onBlur?: () => void;
  /** Called when Enter pressed */
  onEnter?: () => void;
  /** Called when Escape pressed */
  onEscape?: () => void;
}

export interface FieldInstance {
  /** The root field container element */
  el: HTMLElement;
  /** The input/textarea/select element */
  inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  /** Get current value */
  getValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Focus the input */
  focus: () => void;
  /** Blur the input */
  blur: () => void;
  /** Set error state */
  setError: (message?: string) => void;
  /** Clear error state */
  clearError: () => void;
  /** Set success state */
  setSuccess: (message?: string) => void;
  /** Disable/enable */
  setDisabled: (disabled: boolean) => void;
  /** Check if valid (has no error) */
  isValid: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<FieldSize, {
  inputHeight: string;
  inputFontSize: string;
  labelFontSize: string;
  padding: string;
}> = {
  sm: { inputHeight: "32px", inputFontSize: "13px", labelFontSize: "12px", padding: "6px 10px" },
  md: { inputHeight: "40px", inputFontSize: "14px", labelFontSize: "13px", padding: "8px 12px" },
  lg: { inputHeight: "48px", inputFontSize: "16px", labelFontSize: "14px", padding: "12px 16px" },
};

const STATE_COLORS: Record<FieldState, { border: string; bg: string; text: string; ring: string }> = {
  default: { border: "#d1d5db", bg: "#fff", text: "#111827", ring: "#3b82f6" },
  error:   { border: "#ef4444", bg: "#fff", text: "#111827", ring: "#ef4444" },
  success: { border: "#22c55e", bg: "#fff", text: "#111827", ring: "#22c55e" },
  warning: { border: "#f59e0b", bg: "#fff", text: "#111827", ring: "#f59e0b" },
  disabled:{ border: "#e5e7eb", bg: "#f9fafb", text: "#9ca3af", ring: "transparent" },
};

// --- Core Factory ---

/**
 * Create a form field with label, input, error/help text, and optional extras.
 *
 * @example
 * ```ts
 * const field = createField({
 *   type: "email",
 *   label: "Email address",
 *   placeholder: "you@example.com",
 *   required: true,
 *   clearable: true,
 *   onChange: (v) => console.log(v),
 * });
 * ```
 */
export function createField(options: FieldOptions = {}): FieldInstance {
  const {
    type = "text",
    name,
    label,
    placeholder,
    value,
    defaultValue,
    helpText,
    error: initialError,
    successMsg,
    warningMsg,
    variant = "default",
    size = "md",
    state: initialState,
    required = false,
    disabled = false,
    readOnly = false,
    maxLength,
    showCharCount = false,
    clearable = false,
    passwordToggle = false,
    prefix,
    suffix,
    leftIcon,
    rightIcon,
    fullWidth = true,
    className,
    container,
    onChange,
    onFocus,
    onBlur,
    onEnter,
    onEscape,
  } = options;

  const ss = SIZE_STYLES[size];
  let currentState: FieldState = initialState ?? (disabled ? "disabled" : initialError ? "error" : "default");
  let currentError = initialError ?? "";

  // Root container
  const root = document.createElement("div");
  root.className = `field ${variant} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:flex;flex-direction:column;gap:4px;${fullWidth ? "width:100%;" : ""}`;

  // Label
  if (label) {
    const labelEl = document.createElement("label");
    labelEl.className = "field-label";
    labelEl.htmlFor = name ?? `field-${Math.random().toString(36).slice(2, 8)}`;
    labelEl.style.cssText =
      `font-size:${ss.labelFontSize};font-weight:500;color:#374151;display:flex;align-items:center;gap:4px;`;
    labelEl.textContent = label;

    if (required) {
      const reqMark = document.createElement("span");
      reqMark.textContent = "*";
      reqMark.style.color = "#ef4444";
      labelEl.appendChild(reqMark);
    }

    root.appendChild(labelEl);
  }

  // Input wrapper (for prefix/suffix/icons)
  const wrapper = document.createElement("div");
  wrapper.className = "field-input-wrapper";
  wrapper.style.cssText =
    `position:relative;display:flex;align-items:center;`;

  // Prefix
  if (prefix) {
    const prefixEl = document.createElement("span");
    prefixEl.className = "field-prefix";
    prefixEl.style.cssText =
      "display:flex;align-items:center;padding-left:10px;color:#6b7280;font-size:14px;flex-shrink:0;";
    if (typeof prefix === "string") prefixEl.innerHTML = prefix;
    else prefixEl.appendChild(prefix.cloneNode(true));
    wrapper.appendChild(prefixEl);
  }

  if (leftIcon) {
    const li = document.createElement("span");
    li.className = "field-icon-left";
    li.innerHTML = leftIcon;
    li.style.cssText = "padding-left:10px;color:#9ca3af;display:flex;align-items:center;flex-shrink:0;";
    wrapper.appendChild(li);
  }

  // Input element
  const isTextarea = type === "textarea";
  const isSelect = type === "select";
  const input = document.createElement(isTextarea ? "textarea" : isSelect ? "select" : "input") as HTMLInputElement;

  if (!isSelect && !isTextarea) (input as HTMLInputElement).type = type;
  if (name) input.name = name;
  if (placeholder) input.placeholder = placeholder;
  if (defaultValue !== undefined) input.value = defaultValue;
  else if (value !== undefined) input.value = value;
  if (maxLength) input.maxLength = maxLength;
  if (disabled) input.disabled = true;
  if (readOnly) input.readOnly = true;

  input.className = "field-input";
  _applyInputStyles(input);

  wrapper.appendChild(input);

  // Right side extras container
  const rightExtras = document.createElement("div");
  rightExtras.className = "field-right-extras";
  rightExtras.style.cssText =
    "display:flex;align-items:center;gap:4px;padding-right:8px;color:#9ca3af;";

  // Clear button
  let clearBtn: HTMLElement | null = null;
  if (clearable) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "field-clear-btn";
    clearBtn.innerHTML = "&#10005;";
    clearBtn.style.cssText =
      "background:none;border:none;cursor:pointer;padding:2px;border-radius:4px;" +
      "font-size:14px;line-height:1;display:none;";
    clearBtn.addEventListener("click", () => {
      input.value = "";
      _updateCharCount();
      clearBtn!.style.display = "none";
      onChange?.("");
      input.focus();
    });
    rightExtras.appendChild(clearBtn);

    // Show/hide based on value
    input.addEventListener("input", () => {
      clearBtn!.style.display = input.value.length > 0 ? "flex" : "none";
    });
    if (input.value) clearBtn.style.display = "flex";
  }

  // Password toggle
  let pwToggle: HTMLElement | null = null;
  if (passwordToggle && type === "password") {
    pwToggle = document.createElement("button");
    pwToggle.type = "button";
    pwToggle.className = "field-pw-toggle";
    pwToggle.innerHTML = "&#128065;";
    pwToggle.style.cssText =
      "background:none;border:none;cursor:pointer;padding:2px;font-size:16px;line-height:1;";
    pwToggle.title = "Show password";
    pwToggle.addEventListener("click", () => {
      const isPassword = (input as HTMLInputElement).type === "password";
      (input as HTMLInputElement).type = isPassword ? "text" : "password";
      pwToggle!.innerHTML = isPassword ? "&#129481;" : "&#128065;";
      pwToggle!.title = isPassword ? "Hide password" : "Show password";
    });
    rightExtras.appendChild(pwToggle);
  }

  // Right icon
  if (rightIcon) {
    const ri = document.createElement("span");
    ri.innerHTML = rightIcon;
    ri.style.cssText = "display:flex;align-items:center;";
    rightExtras.appendChild(ri);
  }

  // Suffix
  if (suffix) {
    const suffixEl = document.createElement("span");
    suffixEl.className = "field-suffix";
    suffixEl.style.cssText =
      "display:flex;align-items:center;padding-right:10px;color:#6b7280;font-size:14px;flex-shrink:0;";
    if (typeof suffix === "string") suffixEl.innerHTML = suffix;
    else suffixEl.appendChild(suffix.cloneNode(true));
    rightExtras.appendChild(suffixEl);
  }

  if (rightExtras.children.length > 0) {
    wrapper.appendChild(rightExtras);
  }

  root.appendChild(wrapper);

  // Character count
  let charCountEl: HTMLElement | null = null;
  if (showCharCount || maxLength) {
    charCountEl = document.createElement("div");
    charCountEl.className = "field-char-count";
    charCountEl.style.cssText =
      `font-size:11px;color:#9ca3af;text-align:right;`;
    _updateCharCount();
    root.appendChild(charCountEl);
  }

  // Help / Error / Success messages area
  const msgArea = document.createElement("div");
  msgArea.className = "field-messages";
  root.appendChild(msgArea);

  // Render messages
  function _renderMessages(): void {
    msgArea.innerHTML = "";
    if (currentError) {
      const errEl = document.createElement("div");
      errEl.className = "field-error-msg";
      errEl.textContent = currentError;
      errEl.style.cssText = "font-size:12px;color:#ef4444;margin-top:2px;";
      msgArea.appendChild(errEl);
    } else if (successMsg) {
      const okEl = document.createElement("div");
      okEl.className = "field-success-msg";
      okEl.textContent = successMsg;
      okEl.style.cssText = "font-size:12px;color:#22c55e;margin-top:2px;";
      msgArea.appendChild(okEl);
    } else if (warningMsg) {
      const warnEl = document.createElement("div");
      warnEl.className = "field-warning-msg";
      warnEl.textContent = warningMsg;
      warnEl.style.cssText = "font-size:12px;color:#f59e0b;margin-top:2px;";
      msgArea.appendChild(warnEl);
    } else if (helpText) {
      const helpEl = document.createElement("div");
      helpEl.className = "field-help-text";
      helpEl.textContent = helpText;
      helpEl.style.cssText = "font-size:12px;color:#6b7280;margin-top:2px;";
      msgArea.appendChild(helpEl);
    }
  }

  _renderMessages();

  // --- Internal ---

  function _applyInputStyles(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): void {
    const sc = STATE_COLORS[currentState];
    el.style.cssText =
      `width:100%;height:${isTextarea ? "auto" : ss.inputHeight};` +
      `${isTextarea ? `min-height:${ss.inputHeight};resize:vertical;` : ""}` +
      `padding:${ss.padding};` +
      `${leftIcon || prefix ? "padding-left:36px;" : ""}` +
      `${rightIcon || suffix || clearable || passwordToggle ? "padding-right:36px;" : ""}` +
      `font-size:${ss.inputFontSize};color:${sc.text};` +
      `background:${variant === "filled" ? "#f3f4f6" : sc.bg};` +
      `border:1px solid ${sc.border};border-radius:6px;` +
      `outline:none;transition:border-color 0.15s,box-shadow 0.15s;` +
      `${disabled ? "opacity:0.5;cursor:not-allowed;" : ""}` +
      `${readOnly ? "background:#f9fafb;" : ""}`;
  }

  function _updateCharCount(): void {
    if (!charCountEl) return;
    const len = input.value.length;
    const max = maxLength ?? 0;
    charCountEl.textContent = max > 0 ? `${len}/${max}` : String(len);
    if (max > 0 && len >= max) {
      charCountEl.style.color = "#ef4444";
    } else {
      charCountEl.style.color = "#9ca3af";
    }
  }

  function _setState(newState: FieldState): void {
    currentState = newState;
    _applyInputStyles(input);
  }

  // Event listeners
  input.addEventListener("input", () => {
    _updateCharCount();
    onChange?.(input.value);
  });

  input.addEventListener("focus", () => {
    _setState(disabled ? "disabled" : "default");
    onFocus?.();
  });

  input.addEventListener("blur", () => {
    onBlur?.();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); onEnter?.(); }
    if (e.key === "Escape") { e.preventDefault(); onEscape?.(); }
  });

  (container ?? document.body).appendChild(root);

  return {
    el: root,
    inputEl: input,
    getValue: () => input.value,
    setValue: (v: string) => { input.value = v; _updateCharCount(); },
    focus: () => input.focus(),
    blur: () => input.blur(),
    setError: (msg?: string) => { currentError = msg ?? ""; _setState("error"); _renderMessages(); },
    clearError: () => { currentError = ""; _setState(defaultState); _renderMessages(); },
    setSuccess: (msg?: string) => { /* update successMsg display */ _renderMessages(); },
    setDisabled: (d: boolean) => { input.disabled = d; _applyInputStyles(input); },
    isValid: () => !currentError,
    destroy: () => root.remove(),
  };
}

// --- Field Group ---

export interface FieldGroupOptions {
  /** Group label */
  label?: string;
  /** Description under label */
  description?: string;
  /** Error for entire group */
  groupError?: string;
  /** Fields inside the group */
  children: HTMLElement[];
  /** Orientation */
  orientation?: "horizontal" | "vertical" | "inline";
  /** Gap between fields */
  gap?: number | string;
  /** Full width */
  fullWidth?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

/**
 * Create a grouped set of form fields with shared label.
 *
 * @example
 * ```ts
 * const group = createFieldGroup({
 *   label: "Date Range",
 *   children: [startDateField.el, endDateField.el],
 *   orientation: "horizontal",
 * });
 * ```
 */
export function createFieldGroup(options: FieldGroupOptions): HTMLElement {
  const {
    label,
    description,
    groupError,
    children,
    orientation = "vertical",
    gap = 12,
    fullWidth = true,
    className,
    container,
  } = options;

  const root = document.createElement("fieldset");
  root.className = `field-group ${orientation} ${className ?? ""}`.trim();
  root.style.cssText =
    `display:flex;flex-direction:${orientation === "horizontal" ? "row" : "column"};` +
    `gap:${typeof gap === "number" ? `${gap}px` : gap};` +
    `${fullWidth ? "width:100%;" : ""}` +
    "border:1px solid #e5e7eb;border-radius:8px;padding:16px;";

  if (label) {
    const legend = document.createElement("legend");
    legend.className = "field-group-label";
    legend.textContent = label;
    legend.style.cssText = "font-size:14px;font-weight:600;color:#111827;padding:0 8px;";
    root.appendChild(legend);
  }

  if (description) {
    const desc = document.createElement("p");
    desc.className = "field-group-desc";
    desc.textContent = description;
    desc.style.cssText = "font-size:12px;color:#6b7280;margin:0 0 8px 0;";
    root.appendChild(desc);
  }

  const content = document.createElement("div");
  content.className = "field-group-content";
  content.style.cssText =
    `display:flex;flex-direction:${orientation === "horizontal" ? "row" : "column"};` +
    `gap:${typeof gap === "number" ? `${gap}px` : gap};` +
    "flex:1;width:100%;";

  for (const child of children) {
    content.appendChild(child);
  }

  root.appendChild(content);

  if (groupError) {
    const errEl = document.createElement("div");
    errEl.className = "field-group-error";
    errEl.textContent = groupError;
    errEl.style.cssText = "font-size:12px;color:#ef4444;margin-top:4px;";
    root.appendChild(errEl);
  }

  (container ?? document.body).appendChild(root);
  return root;
}
