/**
 * Masked Input: Text input with format masking for phone numbers, dates,
 * credit cards, SSN, custom patterns, auto-formatting on input, paste handling,
 * cursor position management, and validation.
 */

// --- Types ---

export type MaskType =
  | "phone"
  | "date"
  | "datetime"
  | "time"
  | "credit-card"
  | "ssn"
  | "zip-code"
  | "currency"
  | "percentage"
  | "custom";

export interface MaskOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Mask type */
  type: MaskType;
  /** Custom mask pattern (e.g., "(000) 000-0000") */
  pattern?: string;
  /** Placeholder character in pattern (default: "0" for digits, "A" for letters, "*" for alphanumeric) */
  placeholder?: string;
  /** Initial value */
  value?: string;
  /** Placeholder text when empty */
  placeholderText?: string;
  /** Show clear button? */
  showClear?: boolean;
  /** Prefix (e.g., "$", "+1 ") */
  prefix?: string;
  /** Suffix (e.g., "%", "/yr") */
  suffix?: string;
  /** Thousands separator for currency/numbers */
  thousandsSeparator?: string;
  /** Decimal separator */
  decimalSeparator?: string;
  /** Min decimal places for currency */
  minDecimals?: number;
  /** Max decimal places for currency */
  maxDecimals?: number;
  /** Callback on value change */
  onChange?: (raw: string, formatted: string) => void;
  /** Callback on complete entry */
  onComplete?: (value: string) => void;
  /** Validate function */
  validate?: (value: string) => boolean | string;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface MaskedInputInstance {
  element: HTMLElement;
  inputEl: HTMLInputElement;
  /** Get raw (unformatted) value */
  getRawValue: () => string;
  /** Get formatted display value */
  getFormattedValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Clear input */
  clear: () => void;
  /** Focus input */
  focus: () => void;
  /** Check if valid */
  isValid: () => boolean;
  /** Destroy instance */
  destroy: () => void;
}

// --- Built-in Patterns ---

const MASK_PATTERNS: Record<MaskType, { pattern: string; rawPattern: RegExp }> = {
  phone:     { pattern: "(000) 000-0000", rawPattern: /^\d{10}$/ },
  date:      { pattern: "00/00/0000", rawPattern: /^\d{8}$/ },
  datetime:  { pattern: "00/00/0000 00:00", rawPattern: /^\d{12}$/ },
  time:      { pattern: "00:00", rawPattern: /^\d{4}$/ },
  "credit-card": { pattern: "0000 0000 0000 0000", rawPattern: /^\d{16}$/ },
  ssn:       { pattern: "000-00-0000", rawPattern: /^\d{9}$/ },
  "zip-code": { pattern: "00000", rawPattern: /^\d{5}$/ },
  currency:  { pattern: "", rawPattern: /^\d+\.?\d*$/ },
  percentage:{ pattern: "00%", rawPattern: /^\d+\.?\d*$/ },
  custom:    { pattern: "", rawPattern: /.*/ },
};

// --- Main Factory ---

export function createMaskedInput(options: MaskOptions): MaskedInputInstance {
  const opts = {
    pattern: options.pattern ?? MASK_PATTERNS[options.type].pattern,
    placeholder: options.placeholder ?? "_",
    value: options.value ?? "",
    placeholderText: options.placeholderText ?? "",
    showClear: options.showClear ?? false,
    prefix: options.prefix ?? "",
    suffix: options.suffix ?? "",
    thousandsSeparator: options.thousandsSeparator ?? ",",
    decimalSeparator: options.decimalSeparator ?? ".",
    minDecimals: options.minDecimals ?? 2,
    maxDecimals: options.maxDecimals ?? 2,
    disabled: options.disabled ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("MaskedInput: container not found");

  container.className = `masked-input ${opts.className ?? ""}`;
  container.style.cssText = `
    display:inline-flex;align-items:center;position:relative;font-family:-apple-system,sans-serif;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;

  // Prefix
  let prefixEl: HTMLElement | null = null;
  if (opts.prefix) {
    prefixEl = document.createElement("span");
    prefixEl.textContent = opts.prefix;
    prefixEl.style.cssText = "color:#6b7280;font-size:14px;pointer-events:none;";
    container.appendChild(prefixEl);
  }

  // Input element
  const inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.value = opts.value;
  inputEl.placeholder = opts.placeholderText;
  inputEl.spellcheck = false;
  inputEl.autocomplete = "off";
  inputEl.style.cssText = `
    border:1px solid #d1d5db;border-radius:8px;padding:8px 12px;font-size:14px;
    outline:none;color:#111827;background:#fff;width:100%;box-sizing:border-box;
    transition:border-color 0.15s;
  `;
  inputEl.addEventListener("focus", () => { inputEl.style.borderColor = "#6366f1"; });
  inputEl.addEventListener("blur", () => { inputEl.style.borderColor = "#d1d5db"; });
  container.appendChild(inputEl);

  // Suffix
  let suffixEl: HTMLElement | null = null;
  if (opts.suffix) {
    suffixEl = document.createElement("span");
    suffixEl.textContent = opts.suffix;
    suffixEl.style.cssText = "color:#6b7280;font-size:14px;pointer-events:none;margin-left:4px;";
    container.appendChild(suffixEl);
  }

  // Clear button
  let clearBtn: HTMLButtonElement | null = null;
  if (opts.showClear) {
    clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.innerHTML = "&times;";
    clearBtn.title = "Clear";
    clearBtn.style.cssText = `
      position:absolute;right:8px;top:50%;transform:translateY(-50%);
      background:none;border:none;font-size:16px;color:#9ca3af;cursor:pointer;
      padding:0;display:none;line-height:1;
    `;
    clearBtn.addEventListener("click", () => { instance.clear(); inputEl.focus(); });
    container.appendChild(clearBtn);
  }

  // State
  let destroyed = false;

  // --- Formatting Logic ---

  function getRawValue(): string {
    if (opts.type === "currency") return stripNonNumeric(inputEl.value.replace(opts.prefix, ""));
    if (opts.type === "percentage") return stripNonNumeric(inputEl.value.replace("%", ""));
    return stripMaskChars(inputEl.value, opts.pattern);
  }

  function getFormattedValue(): string {
    return inputEl.value;
  }

  function stripMaskChars(value: string, mask: string): string {
    const maskChars = new Set(mask.replace(/[0-9A-Za-z*]/g, "").split(""));
    return value.split("").filter((c) => !maskChars.has(c)).join("");
  }

  function stripNonNumeric(value: string): string {
    return value.replace(new RegExp(`[^0-9\\${opts.decimalSeparator}]`, g), "");
  }

  function applyPhoneMask(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  function applyDateMask(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  function applyTimeMask(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  function applyCreditCardMask(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    const groups: string[] = [];
    for (let i = 0; i < digits.length; i += 4) {
      groups.push(digits.slice(i, i + 4));
    }
    return groups.join(" ");
  }

  function applySsnMask(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  function applyCurrencyMask(raw: string): string {
    const numStr = stripNonNumeric(raw);
    if (!numStr) return "";

    const parts = numStr.split(opts.decimalSeparator);
    let intPart = parts[0] || "0";
    let decPart = parts.length > 1 ? parts[1] : "";

    // Format integer part with thousands separator
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, opts.thousandsSeparator);

    // Limit decimals
    decPart = decPart.slice(0, opts.maxDecimals);

    if (decPart) return `${intPart}${opts.decimalSeparator}${decPart}`;
    return intPart;
  }

  function applyPercentageMask(raw: string): string {
    const numStr = stripNonNumeric(raw).slice(0, 6);
    if (!numStr) return "";
    return numStr + "%";
  }

  function applyCustomMask(raw: string): string {
    if (!opts.pattern) return raw;

    let result = "";
    let rawIdx = 0;
    for (const ch of opts.pattern) {
      if (rawIdx >= raw.length) break;

      if (ch === "0" && /\d/.test(raw[rawIdx]!)) {
        result += raw[rawIdx]!;
        rawIdx++;
      } else if (ch === "A" && /[a-zA-Z]/.test(raw[rawIdx]!)) {
        result += raw[rawIdx]!;
        rawIdx++;
      } else if (ch === "*" && /[a-zA-Z0-9]/.test(raw[rawIdx]!)) {
        result += raw[rawIdx]!;
        rawIdx++;
      } else {
        result += ch;
      }
    }
    return result;
  }

  function formatValue(raw: string): string {
    switch (opts.type) {
      case "phone":       return applyPhoneMask(raw);
      case "date":        return applyDateMask(raw);
      case "datetime":    return applyDateMask(raw) + (raw.length > 8 ? " " + applyTimeMask(raw.slice(8)) : "");
      case "time":        return applyTimeMask(raw);
      case "credit-card": return applyCreditCardMask(raw);
      case "ssn":         return applySsnMask(raw);
      case "zip-code":    return raw.replace(/\D/g, "").slice(0, 5);
      case "currency":    return applyCurrencyMask(raw);
      case "percentage":  return applyPercentageMask(raw);
      case "custom":      return applyCustomMask(raw);
      default:            return raw;
    }
  }

  // --- Event Handlers ---

  function handleInput(): void {
    const raw = inputEl.value;
    const formatted = formatValue(raw);

    // Preserve cursor position
    const cursorPos = inputEl.selectionStart;
    const oldLength = inputEl.value.length;

    inputEl.value = formatted;

    // Adjust cursor
    const newLength = formatted.length;
    const diff = newLength - oldLength;
    if (cursorPos !== null) {
      inputEl.setSelectionRange(Math.max(0, cursorPos + diff), Math.max(0, cursorPos + diff));
    }

    updateClearButton();
    opts.onChange?.(getRawValue(), formatted);

    // Check completion
    if (isComplete()) {
      opts.onComplete?.(getRawValue());
    }
  }

  function handlePaste(e: ClipboardEvent): void {
    e.preventDefault();
    const pasted = e.clipboardData?.getData("text") ?? "";
    const raw = getRawValue() + pasted;
    inputEl.value = formatValue(raw);
    updateClearButton();
    opts.onChange?.(getRawValue(), inputEl.value);
  }

  function isComplete(): boolean {
    const raw = getRawValue();
    switch (opts.type) {
      case "phone":       return raw.length === 10;
      case "date":        return raw.length === 8;
      case "credit-card": return raw.length === 16;
      case "ssn":         return raw.length === 9;
      case "zip-code":    return raw.length === 5;
      case "time":        return raw.length === 4;
      default:            return raw.length > 0;
    }
  }

  function isValidFn(): boolean {
    if (opts.validate) {
      const result = opts.validate(getRawValue());
      if (typeof result === "string") return false;
      return result;
    }
    return isComplete();
  }

  function updateClearButton(): void {
    if (clearBtn) {
      clearBtn.style.display = inputEl.value ? "" : "none";
    }
  }

  // Bind events
  inputEl.addEventListener("input", handleInput);
  inputEl.addEventListener("paste", handlePaste);

  // Initial format
  if (opts.value) {
    inputEl.value = formatValue(opts.value);
  }
  updateClearButton();

  // --- Public API ---

  const instance: MaskedInputInstance = {
    element: container,
    inputEl,

    getRawValue,
    getFormattedValue,

    setValue(value: string) {
      inputEl.value = formatValue(value);
      updateClearButton();
      opts.onChange?.(getRawValue(), inputEl.value);
    },

    clear() {
      inputEl.value = "";
      updateClearButton();
      opts.onChange?.("", "");
    },

    focus() { inputEl.focus(); },

    isValid: isValidFn,

    destroy() {
      destroyed = true;
      inputEl.removeEventListener("input", handleInput);
      inputEl.removeEventListener("paste", handlePaste);
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
