/**
 * Input Utilities: Text input, textarea, search, password, number,
 * and specialized input components with validation states, icons,
 * clear buttons, character counters, and ARIA attributes.
 */

// --- Types ---

export type InputSize = "sm" | "md" | "lg";
export type InputVariant = "default" | "filled" | "outlined" | "underlined";
export type InputState = "default" | "error" | "success" | "warning" | "disabled";

export interface InputOptions {
  /** Input name */
  name?: string;
  /** Initial value */
  value?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Helper text (below input) */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Size variant */
  size?: InputSize;
  /** Visual variant */
  variant?: InputVariant;
  /** Validation state */
  state?: InputState;
  /** Type */
  type?: "text" | "email" | "password" | "number" | "tel" | "url" | "search" | "hidden";
  /** Max length */
  maxLength?: number;
  /** Show character count? */
  showCount?: boolean;
  /** Left icon (HTML string) */
  leftIcon?: string;
  /** Right icon (HTML string) */
  rightIcon?: string;
  /** Show clear button when has value */
  clearable?: boolean;
  /** Auto-focus on mount? */
  autoFocus?: boolean;
  /** Disabled? */
  disabled?: boolean;
  /** Read-only? */
  readOnly?: boolean;
  /** Required indicator */
  required?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** On change callback */
  onChange?: (value: string) => void;
  /** On focus callback */
  onFocus?: () => void;
  /** On blur callback */
  onBlur?: () => void;
  /** On enter key press */
  onEnter?: (value: string) => void;
  /** On escape key press */
  onEscape?: () => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface InputInstance {
  /** The root wrapper element */
  el: HTMLElement;
  /** The actual <input> or <textarea> element */
  inputEl: HTMLInputElement | HTMLTextAreaElement;
  /** Get current value */
  getValue(): string;
  /** Set value programmatically */
  setValue(value: string): void;
  /** Focus the input */
  focus(): void;
  /** Blur the input */
  blur(): void;
  /** Select all text */
  select(): void;
  /** Clear the input */
  clear(): void;
  /** Set error state */
  setError(message?: string): void;
  /** Clear error state */
  clearError(): void;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Size Config ---

const INPUT_SIZES: Record<InputSize, { padding: string; fontSize: string; iconSize: string; borderRadius: string }> = {
  "sm": { padding: "6px 10px", fontSize: "12px", iconSize: "14px", borderRadius: "6px" },
  "md": { padding: "8px 12px", fontSize: "14px", iconSize: "16px", borderRadius: "8px" },
  "lg": { padding: "10px 14px", fontSize: "15px", iconSize: "18px", borderRadius: "8px" },
};

// --- State Colors ---

const STATE_STYLES: Record<InputState, { border: string; bg: string; ring: string; textColor: string; helperColor: string }> = {
  "default": { border: "#d1d5db", bg: "#fff", ring: "#3b82f6", textColor: "#111827", helperColor: "#6b7280" },
  "error": { border: "#ef4444", bg: "#fff", ring: "#ef4444", textColor: "#111827", helperColor: "#dc2626" },
  "success": { border: "#22c55e", bg: "#fff", ring: "#22c55e", textColor: "#111827", helperColor: "#16a34a" },
  "warning": { border: "#f59e0b", bg: "#fff", ring: "#f59e0b", textColor: "#111827", helperColor: "#d97706" },
  "disabled": { border: "#e5e7eb", bg: "#f9fafb", ring: "transparent", textColor: "#9ca3af", helperColor: "#9ca3af" },
};

// --- Core Factory ---

/**
 * Create a styled input component.
 *
 * @example
 * ```ts
 * const input = createInput({
 *   label: "Email",
 *   type: "email",
 *   placeholder: "you@example.com",
 *   leftIcon: "&#9993;",
 *   clearable: true,
 *   onChange: (v) => console.log(v),
 * });
 * ```
 */
export function createInput(options: InputOptions = {}): InputInstance {
  const {
    name,
    value = "",
    placeholder,
    label,
    helperText,
    error,
    size = "md",
    variant = "default",
    state: initialState = "default",
    type = "text",
    maxLength,
    showCount = false,
    leftIcon,
    rightIcon,
    clearable = false,
    autoFocus = false,
    disabled = false,
    readOnly = false,
    required = false,
    fullWidth = true,
    onChange,
    onFocus,
    onBlur,
    onEnter,
    onEscape,
    className,
    container,
  } = options;

  let _state = initialState;
  let _error = error ?? "";

  const sc = INPUT_SIZES[size];

  // Root wrapper
  const root = document.createElement("div");
  root.className = `input-wrapper ${variant} ${size} ${className ?? ""}`.trim();
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "4px";
  root.style.width = fullWidth ? "100%" : "fit-content";

  // Label
  if (label) {
    const labelEl = document.createElement("label");
    labelEl.className = "input-label";
    labelEl.htmlFor = name || `input-${Math.random().toString(36).slice(2)}`;
    labelEl.style.cssText =
      `font-size:${sc.fontSize};font-weight:500;color:#374151;display:flex;align-items:center;gap:4px;`;
    labelEl.textContent = label;
    if (required) {
      const reqMark = document.createElement("span");
      reqMark.textContent = "*";
      reqMark.style.color = "#ef4444";
      labelEl.appendChild(reqMark);
    }
    root.appendChild(labelEl);
  }

  // Input container (holds icons + input)
  const inputContainer = document.createElement("div");
  inputContainer.className = "input-container";
  inputContainer.style.cssText =
    "display:flex;align-items:center;position:relative;" +
    `border-radius:${sc.borderRadius};`;

  // Left icon
  if (leftIcon) {
    const iconEl = document.createElement("span");
    iconEl.className = "input-left-icon";
    iconEl.innerHTML = leftIcon;
    iconEl.style.cssText =
      `display:flex;align-items:center;padding-left:${sc.padding.split(" ")[0]};` +
      `font-size:${sc.iconSize};color:#9ca3af;pointer-events:none;flex-shrink:0;`;
    inputContainer.appendChild(iconEl);
  }

  // Input element
  const isTextarea = type === "text" && (maxLength && maxLength > 200);
  const inputEl = isTextarea
    ? document.createElement("textarea")
    : document.createElement("input");

  inputEl.type = type === "search" ? "text" : type;
  inputEl.name = name ?? "";
  inputEl.value = value;
  inputEl.placeholder = placeholder ?? "";
  if (maxLength) inputEl.maxLength = maxLength;
  inputEl.disabled = disabled;
  inputEl.readOnly = readOnly;
  if (required) inputEl.required = true;
  if (autoFocus) inputEl.autofocus = true;

  inputEl.className = "input-element";
  inputEl.style.cssText =
    `padding:${sc.padding};font-size:${sc.fontSize};color:${STATE_STYLES[_state].textColor};` +
    "outline:none;border:none;background:transparent;width:100%;min-width:0;" +
    "font-family:inherit;line-height:1.4;resize:none;" +
    (leftIcon ? "padding-left:0;" : "") +
    ((rightIcon || clearable) ? "padding-right:0;" : "");

  if (isTextarea) {
    (inputEl as HTMLTextAreaElement).rows = 3;
  }

  inputContainer.appendChild(inputEl);

  // Right area (icon + clear button + count)
  const rightArea = document.createElement("div");
  rightArea.className = "input-right-area";
  rightArea.style.cssText =
    `display:flex;align-items:center;gap:4px;padding-right:${sc.padding.split(" ")[1]};` +
    "position:absolute;right:0;top:50%;transform:translateY(-50%);";

  // Clear button
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.innerHTML = "&times;";
  clearBtn.className = "input-clear-btn";
  clearBtn.style.cssText =
    "display:none;background:none;border:none;cursor:pointer;color:#9ca3af;" +
    `font-size:${sc.fontSize};line-height:1;padding:2px;border-radius:4px;` +
    "transition:color 0.12s;";
  clearBtn.addEventListener("mouseenter", () => { clearBtn.style.color = "#6b7280"; });
  clearBtn.addEventListener("mouseleave", () => { clearBtn.style.color = "#9ca3af"; });
  clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    instance.clear();
    inputEl.focus();
  });

  if (clearable) rightArea.appendChild(clearBtn);

  // Right icon
  if (rightIcon) {
    const iconEl = document.createElement("span");
    iconEl.className = "input-right-icon";
    iconEl.innerHTML = rightIcon;
    iconEl.style.cssText = `font-size:${sc.iconSize};color:#9ca3af;pointer-events:none;`;
    rightArea.appendChild(iconEl);
  }

  // Character count
  const countEl = document.createElement("span");
  countEl.className = "input-count";
  countEl.style.cssText =
    `font-size:11px;color:#9ca3af;white-space:nowrap;user-select:none;`;
  countEl.textContent = maxLength ? `${value.length}/${maxLength}` : String(value.length);
  if (showCount) rightArea.appendChild(countEl);

  if (clearable || rightIcon || showCount) {
    inputContainer.appendChild(rightArea);
  }

  root.appendChild(inputContainer);

  // Helper / Error text
  const helperEl = document.createElement("div");
  helperEl.className = "input-helper";
  helperEl.style.cssText =
    `font-size:12px;color:${STATE_STYLES[_state].helperColor};min-height:18px;`;
  helperEl.textContent = _error || helperText || "";
  if (_error || helperText) root.appendChild(helperEl);

  // --- Apply Variant Styles ---

  function applyVariantStyles(): void {
    const s = STATE_STYLES[disabled ? "disabled" : _state];

    switch (variant) {
      case "filled":
        inputContainer.style.background = s.bg;
        inputContainer.style.borderBottom = `2px solid ${s.border}`;
        inputContainer.style.borderRadius = `${sc.borderRadius} ${sc.borderRadius} 0 0`;
        break;
      case "underlined":
        inputContainer.style.background = "transparent";
        inputContainer.style.borderBottom = `2px solid ${s.border}`;
        inputContainer.style.borderRadius = "0";
        break;
      case "outlined":
        inputContainer.style.background = s.bg;
        inputContainer.style.border = `1.5px solid ${s.border}`;
        inputContainer.style.borderRadius = sc.borderRadius;
        break;
      default:
        inputContainer.style.background = s.bg;
        inputContainer.style.border = `1px solid ${s.border}`;
        inputContainer.style.borderRadius = sc.borderRadius;
    }

    // Focus ring
    inputContainer.style.transition = "border-color 0.15s, box-shadow 0.15s";

    inputEl.style.color = s.textColor;
    helperEl.style.color = _error ? STATE_STYLES.error.helperColor : (s.helperColor);
  }

  applyVariantStyles();

  // --- Event Handlers ---

  inputEl.addEventListener("focus", () => {
    const s = STATE_STYLES[disabled ? "disabled" : _state];
    inputContainer.style.boxShadow = `0 0 0 2px ${s.ring}20`;
    if (variant !== "underlined") {
      inputContainer.style.borderColor = s.ring;
    } else {
      inputContainer.style.borderColor = s.ring;
      inputContainer.style.borderWidth = "2px";
    }
    onFocus?.();
  });

  inputEl.addEventListener("blur", () => {
    inputContainer.style.boxShadow = "";
    applyVariantStyles();
    onBlur?.();
  });

  inputEl.addEventListener("input", () => {
    const val = inputEl.value;
    if (showCount) {
      countEl.textContent = maxLength ? `${val.length}/${maxLength}` : String(val.length);
    }
    // Toggle clear button visibility
    if (clearable) {
      clearBtn.style.display = val.length > 0 ? "block" : "none";
    }
    onChange?.(val);
  });

  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEnter?.(inputEl.value);
    } else if (e.key === "Escape") {
      onEscape?.();
    }
  });

  // --- Instance Methods ---

  function getValue(): string { return inputEl.value; }

  function setValue(v: string): void {
    inputEl.value = v;
    if (showCount) {
      countEl.textContent = maxLength ? `${v.length}/${maxLength}` : String(v.length);
    }
    if (clearable) {
      clearBtn.style.display = v.length > 0 ? "block" : "none";
    }
  }

  function focus(): void { inputEl.focus(); }
  function blur(): void { inputEl.blur(); }
  function select(): void { inputEl.select(); }

  function clear(): void {
    setValue("");
    onChange?.("");
  }

  function setError(msg?: string): void {
    _state = "error";
    _error = msg ?? "";
    helperEl.textContent = _error;
    helperEl.style.color = STATE_STYLES.error.helperColor;
    inputEl.setAttribute("aria-invalid", "true");
    applyVariantStyles();
  }

  function clearError(): void {
    _state = "default";
    _error = "";
    helperEl.textContent = helperText || "";
    inputEl.setAttribute("aria-invalid", "false");
    applyVariantStyles();
  }

  function setDisabled(d: boolean): void {
    inputEl.disabled = d;
    _state = d ? "disabled" : "default";
    applyVariantStyles();
  }

  function destroy(): void { root.remove(); }

  const instance: InputInstance = {
    el: root,
    inputEl: inputEl as HTMLInputElement | HTMLTextAreaElement,
    getValue, setValue, focus, blur, select, clear,
    setError, clearError, setDisabled, destroy,
  };

  if (container) container.appendChild(root);

  return instance;
}

// --- Search Input ---

export interface SearchInputOptions extends Omit<InputOptions, "type" | "leftIcon"> {
  /** Debounce delay for search (ms) */
  debounce?: number;
  /** On search (debounced) */
  onSearch?: (query: string) => void;
  /** Loading state */
  loading?: boolean;
  /** Search button text */
  searchButtonText?: string;
}

export interface SearchInputInstance extends InputInstance {
  /** Set loading state */
  setLoading(loading: boolean): void;
  /** Trigger search manually */
  triggerSearch(): void;
}

/**
 * Create a search input with debounce and optional loading spinner.
 */
export function createSearchInput(options: SearchInputOptions = {}): SearchInputInstance {
  const {
    debounce = 300,
    onSearch,
    loading = false,
    searchButtonText,
    ...inputOpts
  } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let _loading = loading;

  const base = createInput({
    ...inputOpts,
    type: "search",
    leftIcon: "&#128269;",
    placeholder: inputOpts.placeholder || "Search...",
  });

  // Loading spinner overlay
  const spinner = document.createElement("span");
  spinner.innerHTML = "&#9201;";
  spinner.style.cssText =
    "animation:spin 1s linear infinite;font-size:14px;color:#9ca3af;margin-right:4px;display:none;";
  base.el.querySelector(".input-right-area")?.prepend(spinner);

  if (_loading) spinner.style.display = "inline";

  function doSearch(): void {
    onSearch?.(base.getValue());
  }

  // Override onChange with debounced version
  const origOnChange = inputOpts.onChange;
  base.inputEl.removeEventListener("input", null as unknown as EventListener); // We'll re-wire

  // Re-attach debounced handler
  base.inputEl.addEventListener("input", () => {
    origOnChange?.(base.getValue());

    if (timer) clearTimeout(timer);
    timer = setTimeout(doSearch, debounce);
  });

  // Enter triggers immediate search
  const origOnEnter = inputOpts.onEnter;
  base.inputEl.removeEventListener("keydown", null as unknown as EventListener);

  base.inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (timer) clearTimeout(timer);
      doSearch();
      origOnEnter?.(base.getValue());
    } else if (e.key === "Escape") {
      inputOpts.onEscape?.();
    }
  });

  return {
    ...base,
    setLoading(l: boolean) {
      _loading = l;
      spinner.style.display = l ? "inline" : "none";
    },
    triggerSearch: doSearch,
  };
}

// --- Password Input ---

export interface PasswordInputOptions extends Omit<InputOptions, "type" | "rightIcon"> {
  /** Strength meter? */
  showStrength?: boolean;
  /** On strength change */
  onStrengthChange?: (level: "weak" | "fair" | "good" | "strong", score: number) => void;
}

export interface PasswordInputInstance extends InputInstance {
  /** Get current password strength */
  getStrength(): { level: string; score: number };
  /** Toggle visibility */
  toggleVisibility(): void;
}

/**
 * Create a password input with show/hide toggle and optional strength meter.
 */
export function createPasswordInput(options: PasswordInputOptions = {}): PasswordInputInstance {
  const {
    showStrength = false,
    onStrengthChange,
    ...inputOpts
  } = options;

  let visible = false;

  const base = createInput({
    ...inputOpts,
    type: "password",
    placeholder: inputOpts.placeholder || "Enter password",
  });

  // Visibility toggle button in right area
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.textContent = "Show";
  toggleBtn.className = "password-toggle-btn";
  toggleBtn.style.cssText =
    "background:none;border:none;cursor:pointer;color:#6b7280;font-size:12px;" +
    "padding:2px 6px;border-radius:4px;transition:color 0.12s;";
  toggleBtn.addEventListener("mouseenter", () => { toggleBtn.style.color = "#374151"; });
  toggleBtn.addEventListener("mouseleave", () => { toggleBtn.style.color = "#6b7280"; });

  const rightArea = base.el.querySelector(".input-right-area");
  if (rightArea) {
    rightArea.insertBefore(toggleBtn, rightArea.firstChild);
  }

  toggleBtn.addEventListener("click", () => {
    instance.toggleVisibility();
  });

  // Strength meter
  let strengthMeter: HTMLElement | null = null;
  let strengthFill: HTMLElement | null = null;

  if (showStrength) {
    strengthMeter = document.createElement("div");
    strengthMeter.className = "strength-meter";
    strengthMeter.style.cssText =
      "display:flex;gap:3px;margin-top:4px;";

    for (let i = 0; i < 4; i++) {
      const bar = document.createElement("div");
      bar.className = "strength-bar";
      bar.style.cssText =
        "height:3px;flex:1;border-radius:2px;background:#e5e7eb;transition:background 0.2s;";
      strengthMeter.appendChild(bar);
    }

    base.el.appendChild(strengthMeter);
    strengthFill = strengthMeter.querySelectorAll(".strength-bar") as unknown as HTMLElement[];
  }

  function calcStrength(pwd: string): { level: "weak" | "fair" | "good" | "strong"; score: number } {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const levels: Array<"weak" | "fair" | "good" | "strong"> = ["weak", "fair", "good", "strong"];
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
    const idx = Math.min(Math.floor(score / 1.5), 3);

    if (strengthFill) {
      strengthFill.forEach((bar, i) => {
        (bar as HTMLElement).style.background = i <= idx ? colors[idx] : "#e5e7eb";
      });
    }

    return { level: levels[idx], score };
  }

  // Wire up strength calculation
  base.inputEl.addEventListener("input", () => {
    if (showStrength) {
      const str = calcStrength(base.getValue());
      onStrengthChange?.(str.level, str.score);
    }
  });

  function toggleVisibility(): void {
    visible = !visible;
    base.inputEl.type = visible ? "text" : "password";
    toggleBtn.textContent = visible ? "Hide" : "Show";
  }

  function getStrength() {
    return calcStrength(base.getValue());
  }

  const instance: PasswordInputInstance = {
    ...base,
    getStrength,
    toggleVisibility,
  };

  return instance;
}

// --- Number Input ---

export interface NumberInputOptions extends Omit<InputOptions, "type"> {
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Allow decimal? */
  allowDecimal?: boolean;
  /** Format display value (e.g., currency) */
  format?: (value: number) => string;
  /** Parse input back to number */
  parse?: (display: string) => number;
  /** On value change (number) */
  onValueChange?: (value: number) => void;
}

export interface NumberInputInstance extends InputInstance {
  /** Increment by step */
  increment(): void;
  /** Decrement by step */
  decrement(): void;
  /** Get numeric value */
  getNumberValue(): number;
  /** Set numeric value */
  setNumberValue(value: number): void;
}

/**
 * Create a number input with stepper buttons.
 */
export function createNumberInput(options: NumberInputOptions = {}): NumberInputInstance {
  const {
    min = -Infinity,
    max = Infinity,
    step = 1,
    allowDecimal = false,
    format,
    parse,
    onValueChange,
    ...inputOpts
  } = options;

  const base = createInput({
    ...inputOpts,
    type: "number",
    value: inputOpts.value != null ? String(inputOpts.value) : "",
    placeholder: inputOpts.placeholder || "0",
  });

  // Stepper buttons
  const stepper = document.createElement("div");
  stepper.className = "number-stepper";
  stepper.style.cssText =
    "display:flex;flex-direction:column;position:absolute;right:4px;top:50%;" +
    "transform:translateY(-50%);gap:1px;";

  const incBtn = document.createElement("button");
  incBtn.type = "button";
  incBtn.textContent = "\u25B2";
  incBtn.style.cssText =
    "background:#f3f4f6;border:none;cursor:pointer;font-size:8px;padding:1px 4px;" +
    "color:#6b7280;line-height:1;border-radius:2px;";
  incBtn.addEventListener("click", (e) => {
    e.preventDefault();
    instance.increment();
  });

  const decBtn = document.createElement("button");
  decBtn.type = "button";
  decBtn.textContent = "\u25BC";
  decBtn.style.cssText = incBtn.style.cssText;
  decBtn.addEventListener("click", (e) => {
    e.preventDefault();
    instance.decrement();
  });

  stepper.appendChild(incBtn);
  stepper.appendChild(decBtn);

  const inputContainer = base.el.querySelector(".input-container");
  if (inputContainer) inputContainer.appendChild(stepper);

  function clamp(n: number): number {
    return Math.max(min, Math.min(max, n));
  }

  function toDisplay(n: number): string {
    return format ? format(n) : allowDecimal ? String(n) : String(Math.round(n));
  }

  function fromDisplay(s: string): number {
    if (parse) return parse(s);
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function getNumberValue(): number {
    return clamp(fromDisplay(base.getValue()));
  }

  function setNumberValue(v: number): void {
    base.setValue(toDisplay(clamp(v)));
  }

  function increment(): void {
    const val = getNumberValue() + step;
    setNumberValue(val);
    onValueChange?.(getNumberValue());
  }

  function decrement(): void {
    const val = getNumberValue() - step;
    setNumberValue(val);
    onValueChange?.(getNumberValue());
  }

  // Validate on blur
  base.inputEl.addEventListener("blur", () => {
    const num = getNumberValue();
    setNumberValue(num);
    onValueChange?.(num);
  });

  // Arrow key support
  base.inputEl.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") { e.preventDefault(); increment(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); decrement(); }
  });

  const instance: NumberInputInstance = {
    ...base,
    increment, decrement, getNumberValue, setNumberValue,
  };

  return instance;
}
