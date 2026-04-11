/**
 * Number Input: Enhanced numeric input with step buttons, min/max constraints,
 * precision control, formatting (commas, currency prefix/suffix), validation states,
 * keyboard support, and accessibility.
 */

// --- Types ---

export type NumberInputSize = "sm" | "md" | "lg";
export type NumberInputState = "default" | "error" | "success" | "disabled";

export interface NumberInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Placeholder text */
  placeholder?: string;
  /** Initial value */
  value?: number | null;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment (default: 1) */
  step?: number;
  /** Decimal precision (default: 0 for integers) */
  precision?: number;
  /** Size variant */
  size?: NumberInputSize;
  /** Validation state */
  state?: NumberInputState;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Label text */
  label?: string;
  /** Prefix text/icon (e.g., "$", "€") */
  prefix?: string;
  /** Suffix text/icon (e.g., "%", "px") */
  suffix?: string;
  /** Format with thousand separators (e.g., 1,000) */
  formatCommas?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Callback on value change */
  onChange?: (value: number | null) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface NumberInputInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  getValue: () => number | null;
  setValue: (value: number | null) => void;
  getState: () => NumberInputState;
  setState: (state: NumberInputState, message?: string) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<NumberInputSize, { padding: string; fontSize: number; btnSize: number }> = {
  sm: { padding: "5px 8px", fontSize: 12, btnSize: 14 },
  md: { padding: "7px 12px", fontSize: 14, btnSize: 16 },
  lg: { padding: "9px 16px", fontSize: 15, btnSize: 18 },
};

const STATE_COLORS: Record<NumberInputState, { border: string; bg: string; color: string; focusRing: string }> = {
  default:  { border: "#d1d5db", bg: "#fff",   color: "#111827", focusRing: "#6366f1" },
  success:  { border: "#86efac", bg: "#f0fdf4", color: "#166534", focusRing: "#16a34a" },
  error:    { border: "#fca5a5", bg: "#fef2f2", color: "#dc2626", focusRing: "#dc2626" },
  disabled: { border: "#e5e7eb", bg: "#f9fafb", color: "#9ca3af", focusRing: "#d1d5db" },
};

// --- Helpers ---

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function roundToPrecision(v: number, prec: number): number {
  if (prec <= 0) return Math.round(v);
  const factor = Math.pow(10, prec);
  return Math.round(v * factor) / factor;
}

function formatValue(v: number, opts: { precision: number; commas: boolean }): string {
  const rounded = roundToPrecision(v, opts.precision);
  if (opts.commas) return rounded.toLocaleString("en-US");
  return String(rounded);
}

function parseFormatted(s: string): number {
  return parseFloat(s.replace(/,/g, "")) || 0;
}

// --- Main Factory ---

export function createNumberInput(options: NumberInputOptions): NumberInputInstance {
  const opts = {
    placeholder: options.placeholder ?? "",
    value: options.value ?? null,
    min: options.min ?? -Infinity,
    max: options.max ?? Infinity,
    step: options.step ?? 1,
    precision: options.precision ?? 0,
    size: options.size ?? "md",
    state: options.state ?? "default",
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    formatCommas: options.formatCommas ?? false,
    fullWidth: options.fullWidth ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("NumberInput: container not found");

  const sz = SIZE_STYLES[opts.size];
  const colors = STATE_COLORS[opts.state];

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `number-input ${opts.className}`;
  wrapper.style.cssText = `
    display:inline-flex;align-items:center;${opts.fullWidth ? "width:100%;" : ""}
    font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  // Label
  let labelEl: HTMLLabelElement | null = null;
  if (opts.label) {
    labelEl = document.createElement("label");
    labelEl.style.cssText = `font-size:${sz.fontSize - 1}px;font-weight:500;color:#374151;display:block;margin-bottom:4px;`;
    labelEl.textContent = opts.label;
    wrapper.appendChild(labelEl);
  }

  // Input group (prefix + input + suffix)
  const inputGroup = document.createElement("div");
  inputGroup.style.cssText = `
    display:flex;align-items:center;border:1px solid ${colors.border};border-radius:6px;
    background:${colors.bg};overflow:hidden;transition:border-color 0.15s,box-shadow 0.15s;
    ${opts.disabled || opts.readOnly ? "opacity:0.5;" : ""}
  `;

  // Prefix
  if (opts.prefix) {
    const prefixEl = document.createElement("span");
    prefixEl.style.cssText = `
      padding-left:${sz.padding.split(" ")[1]};color:#6b7280;font-size:${sz.fontSize};
      font-weight:500;user-select:none;pointer-events:none;
    `;
    prefixEl.textContent = opts.prefix;
    inputGroup.appendChild(prefixEl);
  }

  // Input
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.value = opts.value !== null ? formatValue(opts.value, opts) : "";
  input.placeholder = opts.placeholder;
  input.disabled = opts.disabled;
  input.readOnly = opts.readOnly;
  input.autocomplete = "off";
  input.style.cssText = `
    flex:1;min-width:60px;padding:${sz.padding};border:none;outline:none;
    font-size:${sz.fontSize}px;font-weight:500;color:${colors.color};
    font-family:inherit;background:transparent;text-align:left;
    -moz-appearance:textfield;-webkit-appearance:none;
  `;
  inputGroup.appendChild(input);

  // Suffix
  if (opts.suffix) {
    const suffixEl = document.createElement("span");
    suffixEl.style.cssText = `
      padding-right:${sz.padding.split(" ")[1]};color:#6b7280;font-size:${sz.fontSize};
      font-weight:500;user-select:none;pointer-events:none;
    `;
    suffixEl.textContent = opts.suffix;
    inputGroup.appendChild(suffixEl);
  }

  // Step buttons
  const btns = document.createElement("div");
  btns.style.cssText = "display:flex;flex-direction:column;margin-left:4px;";
  const incBtn = document.createElement("button");
  incBtn.type = "button";
  incBtn.innerHTML = "+";
  incBtn.style.cssText = `
    display:flex;align-items:center;justify-content:center;width:${sz.btnSize + 4}px;height:calc(50% - 1px);
    border:none;background:#f3f4f6;color:#374151;font-size:${Math.max(sz.fontSize - 2, 10)}px;
    cursor:pointer;line-height:1;transition:background 0.1s;
    ${opts.disabled ? "cursor:not-allowed;" : ""}
  `;
  const decBtn = document.createElement("button");
  decBtn.type = "button";
  decBtn.innerHTML = "&minus;";
  decBtn.style.cssText = `
    display:flex;align-items:center;justify-content:center;width:${sz.btnSize + 4}px;height:calc(50% - 1px);
    border:none;background:#f3f4f6;color:#374151;font-size:${Math.max(sz.fontSize - 2, 10)}px;
    cursor:pointer;line-height:1;transition:background 0.1s;
    ${opts.disabled ? "cursor:not-allowed;" : ""}
  `;
  btns.appendChild(incBtn);
  btns.appendChild(decBtn);
  inputGroup.appendChild(btns);

  wrapper.appendChild(inputGroup);

  // Helper/error text
  let helperEl: HTMLDivElement | null = null;
  if (opts.helperText || opts.error) {
    helperEl = document.createElement("div");
    helperEl.style.cssText = `font-size:11px;margin-top:4px;${opts.state === "error" ? "color:#dc2626;" : "color:#6b7280;"}`;
    helperEl.textContent = opts.error ?? opts.helperText ?? "";
    wrapper.appendChild(helperEl);
  }

  // --- Internal methods ---

  function applyState(): void {
    const c = STATE_COLORS[opts.state];
    inputGroup.style.borderColor = c.border;
    inputGroup.style.background = c.bg;
    input.style.color = c.color;
    if (helperEl) {
      helperEl.style.color = opts.state === "error" ? "#dc2626" : "#6b7280";
      helperEl.textContent = opts.error ?? opts.helperText ?? "";
    }
  }

  function updateDisplay(): void {
    if (opts.value !== null) {
      input.value = formatValue(opts.value, opts);
    } else {
      input.value = "";
    }
  }

  function adjust(delta: number): void {
    const raw = opts.value ?? 0;
    const newVal = roundToPrecision(raw + delta * opts.step, opts.precision);
    const clamped = clamp(newVal, opts.min, opts.max);
    opts.value = clamped;
    updateDisplay();
    opts.onChange?.(clamped);
  }

  // Event handlers
  input.addEventListener("focus", () => {
    inputGroup.style.boxShadow = `0 0 0 3px ${colors.focusRing}20`;
    inputGroup.style.borderColor = colors.focusRing;
    // Select all on focus for easy replacement
    input.select();
    opts.onFocus?.();
  });

  input.addEventListener("blur", () => {
    inputGroup.style.boxShadow = "";
    applyState();

    // Parse and validate on blur
    const parsed = parseFormatted(input.value);
    if (!isNaN(parsed)) {
      const clamped = clamp(parsed, opts.min, opts.max);
      opts.value = clamped;
      updateDisplay();
    }
    opts.onBlur?.();
  });

  input.addEventListener("input", () => {
    const parsed = parseFormatted(input.value);
    if (!isNaN(parsed)) {
      opts.value = parsed;
      opts.onChange?.(parsed);
    }
  });

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        adjust(1);
        break;
      case "ArrowDown":
        e.preventDefault();
        adjust(-1);
        break;
      case "Home":
        e.preventDefault();
        if (isFinite(opts.min)) { opts.value = opts.min; updateDisplay(); opts.onChange?.(opts.min); }
        break;
      case "End":
        e.preventDefault();
        if (isFinite(opts.max)) { opts.value = opts.max; updateDisplay(); opts.onChange?.(opts.max); }
        break;
    }
  });

  incBtn.addEventListener("click", (e) => {
    e.preventDefault();
    adjust(1);
  });
  decBtn.addEventListener("click", (e) => {
    e.preventDefault();
    adjust(-1);
  });
  incBtn.addEventListener("mouseenter", () => { if (!opts.disabled) incBtn.style.background = "#e5e7eb"; });
  incBtn.addEventListener("mouseleave", () => { incBtn.style.background = ""; });
  decBtn.addEventListener("mouseenter", () => { if (!opts.disabled) decBtn.style.background = "#e5e7eb"; });
  decBtn.addEventListener("mouseleave", () => { decBtn.style.background = ""; });

  // Prevent scroll on wheel when focused
  input.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

  // Instance
  const instance: NumberInputInstance = {
    element: wrapper,
    inputEl: input,

    getValue() { return opts.value; },

    setValue(value: number | null) {
      opts.value = value;
      updateDisplay();
    },

    getState() { return opts.state; },

    setState(state: NumberInputState, message?: string) {
      opts.state = state;
      if (message !== undefined) opts.error = state === "error" ? message : undefined;
      if (message !== undefined && state !== "error") opts.helperText = message;
      applyState();
    },

    focus() { input.focus(); },
    blur() { input.blur(); },

    clear() {
      opts.value = null;
      input.value = "";
      opts.onChange?.(null);
    },

    disable() {
      opts.disabled = true;
      input.disabled = true;
      applyState();
    },

    enable() {
      opts.disabled = false;
      input.disabled = false;
      applyState();
    },

    destroy() { wrapper.remove(); },
  };

  return instance;
}
