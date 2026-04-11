/**
 * Float Label / Floating Label Input: Material Design-style floating label that
 * animates from placeholder position to label above the input on focus.
 * Supports text, textarea, select, and custom inputs, with validation states,
 * character counter, prefix/suffix slots, and accessibility.
 */

// --- Types ---

export type FloatLabelVariant = "standard" | "filled" | "outlined";
export type FloatLabelSize = "sm" | "md" | "lg";

export interface FloatLabelOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Input type (default: "text") */
  inputType?: string;
  /** Label text */
  label: string;
  /** Placeholder text */
  placeholder?: string;
  /** Initial value */
  value?: string;
  /** Error message */
  error?: string;
  /** Helper text below input */
  helperText?: string;
  /** Visual variant */
  variant?: FloatLabelVariant;
  /** Size */
  size?: FloatLabelSize;
  /** Required indicator? */
  required?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Read-only state */
  readOnly?: boolean;
  /** Max length for char counter */
  maxLength?: number;
  /** Prefix content (e.g., icon, currency symbol) */
  prefix?: string;
  /** Suffix content (e.g., unit, icon) */
  suffix?: string;
  /** Multiline (textarea mode)? */
  multiline?: boolean;
  /** Rows for textarea */
  rows?: number;
  /** Callback on value change */
  onChange?: (value: string) => void;
  /** Callback on focus */
  onFocus?: () => void;
  /** Callback on blur */
  onBlur?: () => void;
  /** Callback when Enter pressed */
  onSubmit?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface FloatLabelInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  getValue: () => string;
  setValue: (value: string) => void;
  setError: (error: string | null) => void;
  focus: () => void;
  blur: () => void;
  disable: () => void;
  enable: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_CONFIG: Record<FloatLabelSize, { height: number; fontSize: number; labelSize: number; padding: number }> = {
  sm:   { height: 36, fontSize: 13, labelSize: 11, padding: 8 },
  md:   { height: 48, fontSize: 14, labelSize: 12, padding: 12 },
  lg:   { height: 56, fontSize: 16, labelSize: 13, padding: 16 },
};

// --- Main Factory ---

export function createFloatLabel(options: FloatLabelOptions): FloatLabelInstance {
  const opts = {
    inputType: options.inputType ?? "text",
    placeholder: options.placeholder ?? "",
    required: options.required ?? false,
    disabled: options.disabled ?? false,
    readOnly: options.readOnly ?? false,
    multiline: options.multiline ?? false,
    rows: options.rows ?? 3,
    size: options.size ?? "md",
    variant: options.variant ?? "outlined",
    className: options.className ?? "",
    ...options,
  };

  const sz = SIZE_CONFIG[opts.size];
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("FloatLabel: container not found");

  container.className = `float-label fl-${opts.variant} fl-${opts.size} ${opts.className}`;
  container.style.cssText = `position:relative;font-family:-apple-system,sans-serif;`;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "fl-wrapper";
  wrapper.style.cssText = `
    position:relative;width:100%;
    ${opts.variant === "filled" ? "background:#f3f4f6;border-radius:8px;" : ""}
  `;
  container.appendChild(wrapper);

  // Label
  const labelEl = document.createElement("label");
  labelEl.className = "fl-label";
  labelEl.textContent = opts.label;
  if (opts.required) labelEl.textContent += " *";
  labelEl.htmlFor = "fl-input";
  labelEl.style.cssText = `
    position:absolute;left:${sz.padding}px;pointer-events:none;z-index:1;
    font-size:${sz.labelSize}px;font-weight:500;color:#9ca3af;
    background:transparent;padding:0 4px;transition:all 0.2s ease;
    transform-origin:left top;
  `;
  wrapper.appendChild(labelEl);

  // Input area
  let inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

  if (opts.multiline) {
    inputEl = document.createElement("textarea");
    (inputEl as HTMLTextAreaElement).rows = opts.rows;
    inputEl.style.cssText = getAreaStyles(sz, opts);
  } else if (opts.inputType === "select") {
    inputEl = document.createElement("select");
    // Add a default option
    const defOpt = document.createElement("option");
    defOpt.value = "";
    defOpt.textContent = opts.placeholder || "";
    defOpt.disabled = true;
    defOpt.selected = true;
    inputEl.appendChild(defOpt);
    inputEl.style.cssText = getInputStyles(sz, opts);
  } else {
    inputEl = document.createElement("input");
    (inputEl as HTMLInputElement).type = opts.inputType;
    inputEl.style.cssText = getInputStyles(sz, opts);
  }

  inputEl.id = "fl-input";
  inputEl.placeholder = opts.placeholder;
  if (opts.value !== undefined) inputEl.value = opts.value;
  if (opts.maxLength) (inputEl as HTMLInputElement).maxLength = opts.maxLength;
  if (opts.disabled) inputEl.disabled = true;
  if (opts.readOnly) inputEl.readOnly = true;

  wrapper.appendChild(inputEl);

  // Prefix / Suffix
  if (opts.prefix || opts.suffix) {
    const affixRow = document.createElement("div");
    affixRow.className = "fl-affix-row";
    affixRow.style.cssText = `display:flex;align-items:center;position:absolute;top:0;height:100%;`;

    if (opts.prefix) {
      const pre = document.createElement("span");
      pre.className = "fl-prefix";
      pre.textContent = opts.prefix;
      pre.style.cssText = `padding-left:${sz.padding}px;color:#9ca3af;font-size:${sz.fontSize}px;pointer-events:none;`;
      affixRow.appendChild(pre);
    }

    if (opts.suffix) {
      const suf = document.createElement("span");
      suf.className = "fl-suffix";
      suf.textContent = opts.suffix;
      suf.style.cssText = `padding-right:${sz.padding}px;color:#9ca3af;font-size:${sz.fontSize}px;pointer-events:none;`;
      affixRow.appendChild(suf);
    }

    wrapper.appendChild(affixRow);

    // Adjust input padding for affixes
    const padL = opts.prefix ? sz.padding + opts.prefix.length * 8 + 8 : sz.padding;
    const padR = opts.suffix ? sz.padding + opts.suffix.length * 8 + 8 : sz.padding;
    inputEl.style.paddingLeft = `${padL}px`;
    inputEl.style.paddingRight = `${padR}px`;
  }

  // Helper / error text
  let helperEl: HTMLElement | null = null;
  let errorEl: HTMLElement | null = null;

  if (opts.helperText || opts.error) {
    const msgContainer = document.createElement("div");
    msgContainer.style.cssText = `margin-top:4px;min-height:18px;font-size:11px;display:flex;justify-content:space-between;`;

    if (opts.helperText) {
      helperEl = document.createElement("span");
      helperEl.className = "fl-helper";
      helperEl.textContent = opts.helperText;
      helperEl.style.color = "#9ca3af";
      msgContainer.appendChild(helperEl);
    }

    if (opts.error) {
      errorEl = document.createElement("span");
      errorEl.className = "fl-error";
      errorEl.textContent = opts.error;
      errorEl.style.color = "#dc2626";
      msgContainer.appendChild(errorEl);
    }

    // Char counter
    if (opts.maxLength) {
      const counter = document.createElement("span");
      counter.className = "fl-counter";
      counter.style.color = "#9ca3af";
      counter.style.marginLeft = "auto";
      const updateCounter = () => {
        const len = inputEl.value.length;
        counter.textContent = `${len}/${opts.maxLength}`;
        counter.style.color = len >= opts.maxLength ? "#dc2626" : "#9ca3af";
      };
      inputEl.addEventListener("input", updateCounter);
      updateCounter();
      msgContainer.appendChild(counter);
    }

    container.appendChild(msgContainer);
  }

  // State tracking
  let isFocused = false;
  let hasValue = (inputEl.value?.length ?? 0) > 0;

  function updateLabelState(): void {
    const shouldFloat = isFocused || hasValue || opts.multiline;

    if (shouldFloat) {
      labelEl.style.transform = "translateY(-60%) scale(0.85)";
      labelEl.style.color = opts.error ? "#dc2626" : "#6366f1";
    } else {
      labelEl.style.transform = "translateY(0) scale(1)";
      labelEl.style.color = "#9ca3af";
    }
  }

  function getInputStyles(sz: typeof SIZE_CONFIG[string], o: typeof opts): string {
    switch (o.variant) {
      case "filled":
        return `width:100%;height:${sz.height}px;padding:${sz.padding}px;border:none;background:transparent;font-size:${sz.fontSizepx;color:#111827;outline:none;border-radius:8px;box-sizing:border-box;`;
      case "standard":
        return `width:100%;height:${sz.height}px;padding:0 ${sz.padding}px;border:none;border-bottom:2px solid #9ca3af;background:transparent;font-size:${sz.fontSize}px;color:#111827;outline:none;box-sizing:border-box;transition:border-color 0.2s;`;
      default: // outlined
        return `width:100%;height:${sz.height}px;padding:0 ${sz.padding}px;border:1.5px solid #9ca3af;border-radius:8px;background:#fff;font-size:${sz.fontSize}px;color:#111827;outline:none;box-sizing:border-box;transition:border-color 0.2s,box-shadow 0.2s;`;
    }
  }

  function getAreaStyles(sz: typeof SIZE_CONFIG[string], o: typeof opts): string {
    switch (o.variant) {
      case "filled":
        return `width:100%;min-height:${sz.height * 2}px;padding:${sz.padding}px;border:none;background:transparent;font-size:${sz.fontSize}px;color:#111827;outline:none;border-radius:8px;box-sizing:border-box;resize:vertical;`;
      case "standard":
        return `width:100%;min-height:${sz.height * 2}px;padding:${sz.padding / 2}px ${sz.padding}px;border:none;border-bottom:2px solid #9ca3af;background:transparent;font-size:${sz.fontSize}px;color:#111827;outline:none;box-sizing:border-box;resize:vertical;transition:border-color 0.2s;`;
      default:
        return `width:100%;min-height:${sz.height * 2}px;padding:${sz.padding / 2}px ${sz.padding}px;border:1.5px solid #9ca3af;border-radius:8px;background:#fff;font-size:${sz.fontSize}px;color:#111827;outline:none;box-sizing:border-box;resize:vertical;transition:border-color 0.2s,box-shadow 0.2s;`;
    }
  }

  // Event handlers
  inputEl.addEventListener("focus", () => {
    isFocused = true;
    updateLabelState();
    applyFocusStyle(true);
    opts.onFocus?.();
  });

  inputEl.addEventListener("blur", () => {
    isFocused = false;
    hasValue = (inputEl.value?.length ?? 0) > 0;
    updateLabelState();
    applyFocusStyle(false);
    opts.onBlur?.();
  });

  inputEl.addEventListener("input", () => {
    hasValue = (inputEl.value?.length ?? 0) > 0;
    updateLabelState();
    opts.onChange?.(inputEl.value);
  });

  inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !opts.multiline && opts.inputType !== "select") {
      e.preventDefault();
      opts.onSubmit?.();
    }
  });

  function applyFocusStyle(focused: boolean): void {
    if (opts.variant === "outlined") {
      inputEl.style.borderColor = focused ? "#6366f1" : opts.error ? "#dc2626" : "#9ca3af";
      inputEl.style.boxShadow = focused ? "0 0 0 3px rgba(99,102,241,0.15)" : "none";
    } else if (opts.variant === "standard") {
      inputEl.style.borderBottomColor = focused ? "#6366f1" : opts.error ? "#dc2626" : "#9ca3af";
    }
  }

  // Initial state
  updateLabelState();

  const instance: FloatLabelInstance = {
    element: container,
    inputEl,

    getValue() { return inputEl.value; },

    setValue(val: string) {
      inputEl.value = val;
      hasValue = val.length > 0;
      updateLabelState();
      opts.onChange?.(val);
    },

    setError(err: string | null) {
      opts.error = err ?? undefined;
      if (errorEl) {
        errorEl.textContent = err ?? "";
        errorEl.style.display = err ? "inline" : "none";
      }
      applyFocusStyle(isFocused);
      updateLabelState();
    },

    focus() { inputEl.focus(); },
    blur() { inputEl.blur(); },

    disable() {
      opts.disabled = true;
      inputEl.disabled = true;
    },

    enable() {
      opts.disabled = false;
      inputEl.disabled = false;
    },

    destroy() {
      container.innerHTML = "";
    },
  };

  return instance;
}
