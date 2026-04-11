/**
 * Number Input: Enhanced numeric input with step buttons, min/max constraints,
 * formatting (prefixes, suffixes, separators), validation, keyboard support,
 * spin buttons, and accessible ARIA attributes.
 */

// --- Types ---

export type NumberInputVariant = "default" | "compact" | "filled";

export interface NumberInputOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial value */
  value?: number;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Precision (decimal places) */
  precision?: number;
  /** Prefix text (e.g., "$", "€") */
  prefix?: string;
  /** Suffix text (e.g., "%", "px") */
  suffix?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Visual variant */
  variant?: NumberInputVariant;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Show spin/step buttons? */
  showStepButtons?: boolean;
  /** Custom format function for display */
  formatDisplay?: (value: number) => string;
  /** Parse function for user input */
  parseInput?: (str: string) => number | null;
  /** Validation error message or null if valid */
  validate?: (value: number) => string | null;
  /** Callback on value change */
  onChange?: (value: number) => void;
  /** Callback on blur/commit */
  onCommit?: (value: number) => void;
  /** Width (CSS value) */
  width?: string | number;
  /** Custom CSS class */
  className?: string;
}

export interface NumberInputInstance {
  element: HTMLElement;
  getValue: () => number;
  setValue: (value: number) => void;
  getMin: () => number;
  getMax: () => number;
  setMin: (min: number) => void;
  setMax: (max: number) => void;
  increment: () => void;
  decrement: () => void;
  focus: () => void;
  blur: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Helpers ---

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToPrecision(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number, precision: number): string {
  return roundToPrecision(value, precision).toFixed(precision).replace(/\.0+$/, "");
}

// --- Main Factory ---

export function createNumberInput(options: NumberInputOptions): NumberInputInstance {
  const opts = {
    value: options.value ?? 0,
    min: options.min ?? -Infinity,
    max: options.max ?? Infinity,
    step: options.step ?? 1,
    precision: options.precision ?? 2,
    prefix: options.prefix ?? "",
    suffix: options.suffix ?? "",
    placeholder: options.placeholder ?? "",
    variant: options.variant ?? "default",
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    showStepButtons: options.showStepButtons ?? true,
    formatDisplay: options.formatDisplay ?? ((v: number) => formatNumber(v, opts.precision)),
    parseInput: options.parseInput ?? ((s: string) => {
      const n = parseFloat(s);
      return isNaN(n) ? null : n;
    }),
    width: options.width ?? "100%",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("NumberInput: container not found");

  let currentValue = opts.value;

  // Clamp initial value
  currentValue = clamp(currentValue, opts.min, opts.max);

  // Build DOM
  container.className = `number-input ni-${opts.variant} ${opts.className}`;
  container.style.cssText = `
    display:inline-flex;align-items:center;width:${typeof opts.width === "number" ? opts.width + "px" : opts.width};
    font-family:-apple-system,sans-serif;position:relative;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;

  // Step down button
  let decBtn: HTMLButtonElement | null = null;
  if (opts.showStepButtons) {
    decBtn = document.createElement("button");
    decBtn.type = "button";
    decBtn.innerHTML = "\u2212";
    decBtn.title = "Decrease";
    decBtn.setAttribute("aria-label", "Decrease value");
    decBtn.style.cssText = `
      display:flex;align-items:center;justify-content:center;
      width:28px;height:100%;border:1px solid #d1d5db;border-radius:6px 0 0 6px;
      background:#f9fafb;color:#6b7280;font-size:14px;font-weight:500;
      cursor:pointer;transition:all 0.15s;flex-shrink:0;
    `;
    decBtn.addEventListener("click", () => { instance.decrement(); });
    decBtn.addEventListener("mouseenter", () => { decBtn!.style.background = "#e5e7eb"; decBtn!.style.borderColor = "#9ca3af"; });
    decBtn.addEventListener("mouseleave", () => { decBtn!.style.background = "#f9fafb"; decBtn!.style.borderColor = "#d1d5db"; });
    container.appendChild(decBtn);
  }

  // Input wrapper
  const inputWrapper = document.createElement("div");
  inputWrapper.style.cssText = `
    display:flex;align-items:center;flex:1;position:relative;
    border:1px solid #d1d5db;border-radius:6px;
    background:#fff;transition:border-color 0.15s,box-shadow 0.15s;height:36px;
    ${opts.variant === "filled" ? "background:#f3f4f6;" : ""}
  `;

  // Prefix
  if (opts.prefix) {
    const prefixEl = document.createElement("span");
    prefixEl.textContent = opts.prefix;
    prefixEl.style.cssText = `
      padding-left:10px;color:#6b7280;font-size:13px;font-weight:500;pointer-events:none;
      flex-shrink:0;
    `;
    inputWrapper.appendChild(prefixEl);
  }

  // Main input
  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "decimal";
  input.value = opts.formatDisplay(currentValue);
  input.placeholder = opts.placeholder;
  input.spellcheck = false;
  input.autocomplete = "off";
  input.style.cssText = `
    flex:1;border:none;background:none;outline:none;font-size:14px;color:#111827;
    font-family:inherit;text-align:center;padding:4px 8px;min-width:40px;
    ${opts.readOnly ? "cursor:default;" : ""}
  `;
  input.setAttribute("role", "spinbutton");
  input.setAttribute("aria-valuemin", String(opts.min));
  input.setAttribute("aria-valuemax", String(opts.max));
  input.setAttribute("aria-valuenow", String(currentValue));
  inputWrapper.appendChild(input);

  // Suffix
  if (opts.suffix) {
    const suffixEl = document.createElement("span");
    suffixEl.textContent = opts.suffix;
    suffixEl.style.cssText = `
      padding-right:10px;color:#6b7280;font-size:13px;font-weight:500;pointer-events:none;
      flex-shrink:0;
    `;
    inputWrapper.appendChild(suffixEl);
  }

  container.appendChild(inputWrapper);

  // Step up button
  let incBtn: HTMLButtonElement | null = null;
  if (opts.showStepButtons) {
    incBtn = document.createElement("button");
    incBtn.type = "button";
    incBtn.innerHTML = "\u2212";
    incBtn.title = "Increase";
    incBtn.setAttribute("aria-label", "Increase value");
    incBtn.style.cssText = `
      display:flex;align-items:center;justify-content:center;
      width:28px;height:100%;border:1px solid #d1d5db;border-radius:0 6px 6px 0;
      background:#f9fafb;color:#6b7280;font-size:14px;font-weight:500;
      cursor:pointer;transition:all 0.15s;flex-shrink:0;
    `;
    incBtn.addEventListener("click", () => { instance.increment(); });
    incBtn.addEventListener("mouseenter", () => { incBtn!.style.background = "#e5e7eb"; incBtn!.style.borderColor = "#9ca3af"; });
    incBtn.addEventListener("mouseleave", () => { incBtn!.style.background = "#f9fafb"; incBtn!.style.borderColor = "#d1d5db"; });
    container.appendChild(incBtn);
  }

  // Error message element
  let errorEl: HTMLElement | null = null;

  // --- State Management ---

  function updateDisplay(): void {
    input.value = opts.formatDisplay(currentValue);
    input.setAttribute("aria-valuenow", String(currentValue));
  }

  function setValueInternal(newValue: number, commit = true): void {
    const clamped = clamp(roundToPrecision(newValue, opts.precision), opts.min, opts.max);

    // Validate
    if (opts.validate) {
      const err = opts.validate(clamped);
      if (err) {
        showError(err);
        return;
      }
    }
    hideError();

    if (clamped !== currentValue || !commit) {
      currentValue = clamped;
      updateDisplay();
      if (commit) opts.onChange?.(currentValue);
    }
  }

  function showError(msg: string): void {
    if (!errorEl) {
      errorEl = document.createElement("div");
      errorEl.className = "ni-error";
      errorEl.style.cssText = `
        position:absolute;top:100%;left:0;right:0;margin-top:2px;
        font-size:11px;color:#ef4444;white-space:nowrap;z-index:1;
      `;
      container.appendChild(errorEl);
    }
    errorEl.textContent = msg;
    errorEl.style.display = "block";
    inputWrapper.style.borderColor = "#fecaca";
  }

  function hideError(): void {
    if (errorEl) {
      errorEl.style.display = "none";
      inputWrapper.style.borderColor = "";
    }
  }

  // --- Event Handlers ---

  input.addEventListener("focus", () => {
    inputWrapper.style.borderColor = "#6366f1";
    inputWrapper.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
    // Select all text on focus
    setTimeout(() => input.select(), 0);
  });

  input.addEventListener("blur", () => {
    inputWrapper.style.borderColor = "";
    inputWrapper.style.boxShadow = "";
    hideError();
    // Parse and commit
    const parsed = opts.parseInput(input.value);
    if (parsed !== null) {
      setValueInternal(parsed);
      opts.onCommit?.(currentValue);
    } else {
      // Restore display value if invalid
      updateDisplay();
    }
  });

  input.addEventListener("input", () => {
    // Live preview while typing (don't validate yet)
    const parsed = opts.parseInput(input.value);
    if (parsed !== null) {
      currentValue = clamp(parsed, opts.min, opts.max);
      hideError();
    }
  });

  input.addEventListener("keydown", (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        instance.increment();
        break;
      case "ArrowDown":
        e.preventDefault();
        instance.decrement();
        break;
      case "Home":
        e.preventDefault();
        setValueInternal(opts.min);
        break;
      case "End":
        e.preventDefault();
        setValueInternal(opts.max);
        break;
    }
  });

  // Mouse wheel on input
  input.addEventListener("wheel", (e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) instance.increment();
    else instance.decrement();
  }, { passive: false });

  // Instance
  const instance: NumberInputInstance = {
    element: container,

    getValue() { return currentValue; },

    setValue(value: number) { setValueInternal(value); },

    getMin: () => opts.min,
    getMax: () => opts.max,

    setMin(min: number) { opts.min = min; if (currentValue < min) setValueInternal(min); },
    setMax(max: number) { opts.max = max; if (currentValue > max) setValueInternal(max); },

    increment() { setValueInternal(currentValue + opts.step); },
    decrement() { setValueInternal(currentValue - opts.step); },

    focus() { input.focus(); },
    blur() { input.blur(); },

    disable() {
      opts.disabled = true;
      container.style.opacity = "0.5";
      container.style.pointerEvents = "none";
      input.readOnly = true;
    },

    enable() {
      opts.disabled = false;
      container.style.opacity = "";
      container.style.pointerEvents = "";
      input.readOnly = opts.readOnly;
    },

    destroy() {
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
