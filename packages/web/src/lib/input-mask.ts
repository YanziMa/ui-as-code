/**
 * Input Mask: Character-level input masking for phone numbers, dates, currency,
 * custom patterns, numeric formatting, and paste handling.
 */

// --- Types ---

export type MaskType =
  | "phone"
  | "date"
  | "datetime"
  | "time"
  | "currency"
  | "percentage"
  | "ssn"
  | "credit-card"
  | "postal-code"
  | "ip-address"
  | "custom";

export interface MaskOptions {
  /** Input element or selector */
  input: HTMLInputElement | string;
  /** Mask type or custom pattern */
  mask: MaskType | string;
  /** Placeholder character (default: "_") */
  placeholderChar?: string;
  /** Show placeholder when empty */
  showPlaceholder?: boolean;
  /** Custom mask pattern (e.g., "(000) 000-0000" where 0=digit, A=alpha, *=alphanumeric) */
  pattern?: string;
  /** For currency: symbol prefix */
  prefix?: string;
  /** For currency: suffix */
  suffix?: string;
  /** Decimal places for currency/number */
  decimals?: number;
  /** Thousands separator */
  thousandsSeparator?: string;
  /** Decimal separator */
  decimalSeparator?: string;
  /** Allow negative values */
  allowNegative?: boolean;
  /** Maximum length */
  maxLength?: number;
  /** Minimum value (for numeric) */
  min?: number;
  /** Maximum value (for numeric) */
  max?: number;
  /** Transform output value (e.g., strip formatting) */
  transform?: (raw: string, formatted: string) => string;
  /** Callback on valid value change */
  onValueChange?: (value: string) => void;
  /** Callback on validation state change */
  onValidationChange?: (isValid: boolean) => void;
}

export interface MaskInstance {
  inputEl: HTMLInputElement;
  getRawValue: () => string;
  getFormattedValue: () => string;
  getValue: () => string; // transformed value
  setRawValue: (value: string) => void;
  isValid: () => boolean;
  destroy: () => void;
}

// --- Built-in Patterns ---

const BUILTIN_PATTERNS: Record<string, { pattern: string; regexps?: Record<string, RegExp> }> = {
  phone: {
    pattern: "(000) 000-0000",
    regexps: { "0": /\d/ },
  },
  date: {
    pattern: "00/00/0000",
    regexps: { "0": /[0-3]/, "/": /\// },
  },
  datetime: {
    pattern: "00/00/0000 00:00",
    regexps: { "0": /[0-3]/, "/": /\//, " ": / /, ":": /:/ },
  },
  time: {
    pattern: "00:00",
    regexps: { "0": /[0-5]/, ":": /:/ },
  },
  ssn: {
    pattern: "000-00-0000",
    regexps: { "0": /\d/, "-": /-/ },
  },
  "credit-card": {
    pattern: "0000 0000 0000 0000",
    regexps: { "0": /\d/, " ": / / },
  },
  "postal-code": {
    pattern: "00000",
    regexps: { "0": /\d/ },
  },
  "ip-address": {
    pattern: "000.000.000.000",
    regexps: { "0": /\d/, ".": /\./ },
  },
};

// --- Core Engine ---

function parsePattern(pattern: string): { chars: Array<{ type: "literal" | "input"; char: string; regexp?: RegExp }> } {
  const chars: Array<{ type: "literal" | "input"; char: string; regexp?: RegExp }> = [];
  const charRegexps: Record<string, RegExp> = {
    "0": /\d/,
    "A": /[a-zA-Z]/,
    "*": /[a-zA-Z0-9]/,
  };

  for (const ch of pattern) {
    if (charRegexps[ch]) {
      chars.push({ type: "input", char: ch, regexp: charRegexps[ch] });
    } else {
      chars.push({ type: "literal", char: ch });
    }
  }

  return { chars };
}

function applyMask(
  rawValue: string,
  parsed: ReturnType<typeof parsePattern>,
  placeholderChar: string,
): { formatted: string; raw: string } {
  let rawIndex = 0;
  let formatted = "";
  let raw = "";

  for (const entry of parsed.chars) {
    if (entry.type === "literal") {
      formatted += entry.char;
    } else if (rawIndex < rawValue.length) {
      const ch = rawValue[rawIndex]!;
      if (entry.regexp?.test(ch)) {
        formatted += ch;
        raw += ch;
        rawIndex++;
      } else {
        formatted += placeholderChar;
      }
    } else {
      formatted += placeholderChar;
    }
  }

  return { formatted, raw };
}

// --- Numeric Formatting ---

function formatNumber(
  value: string,
  options: {
    prefix?: string;
    suffix?: string;
    decimals?: number;
    thousandsSep?: string;
    decimalSep?: string;
    allowNegative?: boolean;
    min?: number;
    max?: number;
  },
): { display: string; numeric: string } {
  const {
    prefix = "",
    suffix = "",
    decimals = 2,
    thousandsSep = ",",
    decimalSep = ".",
    allowNegative = false,
    min,
    max,
  } = options;

  // Strip non-numeric characters
  let clean = value.replace(/[^\d]/g, "");

  // Handle negative
  let isNegative = false;
  if (allowNegative && value.startsWith("-")) {
    isNegative = true;
  }

  // Apply decimal limit
  if (decimals === 0) {
    clean = clean.replace(/\d/g, ""); // integer only
  }

  // Build numeric value with decimal
  let numericStr = "";
  if (clean.length > decimals) {
    const intPart = clean.slice(0, -decimals || undefined);
    const decPart = decimals > 0 ? clean.slice(-decimals) : "";
    // Add thousands separators to int part
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
    numericStr = decimals > 0 ? `${formattedInt}${decimalSep}${decPart}` : formattedInt;
  } else if (clean.length > 0) {
    numericStr = `0${decimalSep}${clean.padStart(decimals, "0")}`;
  } else {
    numericStr = "";
  }

  // Min/max constraints
  if (numericStr) {
    const numVal = parseFloat(numericStr.replace(thousandsSep, "").replace(decimalSep, "."));
    if (min !== undefined && numVal < min) return { display: "", numeric: "" };
    if (max !== undefined && numVal > max) {
      // Clamp to max
      const maxStr = String(max);
      return { display: `${prefix}${maxStr}${suffix}`, numeric: maxStr };
    }
  }

  const display = numericStr ? `${isNegative ? "-" : ""}${prefix}${numericStr}${suffix}` : "";

  return { display, numeric };
}

// --- Main Class ---

export class InputMaskManager {
  create(options: MaskOptions): MaskInstance {
    const opts = {
      placeholderChar: options.placeholderChar ?? "_",
      showPlaceholder: options.showPlaceholder ?? true,
      prefix: options.prefix ?? "",
      suffix: options.suffix ?? "",
      decimals: options.decimals ?? 2,
      thousandsSeparator: options.thousandsSeparator ?? ",",
      decimalSeparator: options.decimalSeparator ?? ".",
      allowNegative: options.allowNegative ?? false,
      ...options,
    };

    const inputEl = typeof options.input === "string"
      ? document.querySelector<HTMLInputElement>(options.input)!
      : options.input;

    if (!inputEl) throw new Error("InputMask: input element not found");

    let destroyed = false;
    let lastFormattedValue = "";

    // Determine mask type
    const isNumeric = ["currency", "percentage"].includes(opts.mask as string);
    const isCustomPattern = typeof opts.mask === "string" && !BUILTIN_PATTERNS[opts.mask as string];
    const builtin = typeof opts.mask === "string" ? BUILTIN_PATTERNS[opts.mask as string] : null;
    const patternStr = opts.pattern ?? builtin?.pattern ?? (typeof opts.mask === "string" ? opts.mask : "");
    const parsed = parsePattern(patternStr);

    function processInput(): void {
      const val = inputEl.value;

      if (isNumeric) {
        const result = formatNumber(val, opts);
        if (result.display !== inputEl.value) {
          inputEl.value = result.display;
          // Preserve cursor position after prefix
          const cursorPos = Math.max(
            opts.prefix.length + (val.startsWith("-") ? 1 : 0),
            Math.min(inputEl.value.length, inputEl.selectionStart ?? inputEl.value.length),
          );
          inputEl.setSelectionRange(cursorPos, cursorPos);
        }
        lastFormattedValue = result.display;
        const finalValue = opts.transform ? opts.transform(result.numeric, result.display) : result.numeric;
        opts.onValueChange?.(finalValue);
        opts.onValidationChange?.(result.numeric.length > 0);

        return;
      }

      // Pattern-based masking
      // Extract only valid input characters from current value
      let rawChars = "";
      for (const ch of val) {
        if (parsed.chars.some((c) => c.type === "input" && c.regexp?.test(ch))) {
          rawChars += ch;
        }
      }

      const result = applyMask(rawChars, parsed, opts.placeholderChar);
      inputEl.value = result.formatted;
      lastFormattedValue = result.formatted;

      // Position cursor at next input position
      let nextPos = 0;
      for (let i = 0; i < result.formatted.length; i++) {
        if (parsed.chars[i]?.type === "input" && result.formatted[i] === opts.placeholderChar) {
          nextPos = i;
          break;
        }
        nextPos = i + 1;
      }
      inputEl.setSelectionRange(nextPos, nextPos);

      const finalValue = opts.transform ? opts.transform(result.raw, result.formatted) : result.raw;
      opts.onValueChange?.(finalValue);

      // Check if fully filled
      const isFull = !result.formatted.includes(opts.placeholderChar);
      opts.onValidationChange?.(isFull);
    }

    function handlePaste(e: ClipboardEvent): void {
      e.preventDefault();
      const pastedText = e.clipboardData?.getData("text") ?? "";

      if (isNumeric) {
        // For numeric masks, paste digits only
        const digits = pastedText.replace(/\D/g, "");
        const start = inputEl.selectionStart ?? 0;
        const end = inputEl.selectionEnd ?? inputEl.value.length;
        inputEl.value = inputEl.value.slice(0, start) + digits + inputEl.value.slice(end);
        processInput();
        return;
      }

      // For pattern masks, extract matching characters
      let rawChars = "";
      for (const ch of pastedText) {
        if (parsed.chars.some((c) => c.type === "input" && c.regexp?.test(ch))) {
          rawChars += ch;
        }
      }

      const existingRaw = getRawValue();
      const combined = existingRaw + rawChars;
      const result = applyMask(combined, parsed, opts.placeholderChar);
      inputEl.value = result.formatted;
      processInput();
    }

    function getRawValue(): string {
      if (isNumeric) {
        return inputEl.value
          .replace(new RegExp(`\\${opts.prefix}`, "g"), "")
          .replace(new RegExp(`\\${opts.suffix}`, "g"), "")
          .replace(new RegExp(`\\${opts.thousandsSeparator}`, "g"), "")
          .replace(new RegExp(`\\${opts.decimalSeparator}`, "g"), ".");
      }

      let raw = "";
      for (let i = 0; i < inputEl.value.length && i < parsed.chars.length; i++) {
        const ch = inputEl.value[i];
        if (ch !== opts.placeholderChar && parsed.chars[i]?.type === "input") {
          raw += ch!;
        }
      }
      return raw;
    }

    function setRawValue(value: string): void {
      if (isNumeric) {
        inputEl.value = value;
        processInput();
        return;
      }
      const result = applyMask(value, parsed, opts.placeholderChar);
      inputEl.value = result.formatted;
      processInput();
    }

    // Event listeners
    inputEl.addEventListener("input", processInput);
    inputEl.addEventListener("paste", handlePaste);
    inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
      // Allow backspace/delete through literals
      if (e.key === "Backspace" || e.key === "Delete") {
        // Let it process naturally via input event
        return;
      }
      // Block non-matching characters for pattern masks
      if (!isNumeric && parsed.chars.length > 0) {
        const cursorPos = inputEl.selectionStart ?? 0;
        const nextEntry = parsed.chars.find((c, idx) => idx >= cursorPos && c.type === "input");
        if (nextEntry?.regexp && !nextEntry.regexp.test(e.key) && e.key.length === 1) {
          e.preventDefault();
        }
      }
    });

    // Initialize
    if (opts.showPlaceholder && !isNumeric && patternStr) {
      const initialResult = applyMask("", parsed, opts.placeholderChar);
      inputEl.value = initialResult.formatted;
      inputEl.setAttribute("data-placeholder", initialResult.formatted);
    }

    const instance: MaskInstance = {
      inputEl,

      getRawValue,
      getFormattedValue() { return inputEl.value; },

      getValue() {
        const raw = getRawValue();
        return opts.transform ? opts.transform(raw, inputEl.value) : raw;
      },

      setRawValue,

      isValid() {
        if (isNumeric) {
          return getRawValue().length > 0;
        }
        return !inputEl.value.includes(opts.placeholderChar);
      },

      destroy() {
        destroyed = true;
        inputEl.removeEventListener("input", processInput);
        inputEl.removeEventListener("paste", handlePaste);
      },
    };

    return instance;
  }
}

/** Convenience: create an input mask */
export function createInputMask(options: MaskOptions): MaskInstance {
  return new InputMaskManager().create(options);
}
