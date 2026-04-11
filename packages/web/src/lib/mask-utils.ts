/**
 * Input Mask Utilities: Format user input in real-time with pattern masks
 * for phone numbers, dates, currency, percentages, SSN, custom patterns,
 * with cursor position management and validation.
 */

// --- Types ---

export type MaskType = "phone" | "date" | "currency" | "percent" | "ssn" | "zip" | "custom" | "numeric" | "alphanumeric" | "email" | "time" | "ip" | "hex" | "credit-card";

export interface MaskOptions {
  /** Input element to attach mask to */
  input: HTMLInputElement | HTMLTextAreaElement;
  /** Mask type or custom pattern */
  mask?: MaskType | string;
  /** Placeholder character */
  placeholder?: string;
  /** Show placeholder characters */
  showPlaceholder?: boolean;
  /** Format for currency */
  currencySymbol?: string;
  /** Decimal places for currency/percent */
  decimals?: number;
  /** Thousands separator */
  thousandsSeparator?: string;
  /** Decimal separator */
  decimalSeparator?: string;
  /** Prefix (e.g., "$", "+") */
  prefix?: string;
  /** Suffix (e.g., "%") */
  suffix?: string;
  /** Maximum length */
  maxLength?: number;
  /** Minimum length */
  minLength?: number;
  /** Allow negative values */
  allowNegative?: boolean;
  /** Date format (for date masks) */
  dateFormat?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "MM-DD-YYYY";
  /** Phone format */
  phoneFormat?: "(XXX) XXX-XXXX" | "XXX-XXX-XXXX" | "+X XXX XXX XXXX";
  /** Regex to allow only certain characters */
  allowedChars?: RegExp;
  /** Transform function on raw value before formatting */
  transform?: (value: string) => string;
  /** Validation function */
  validate?: (rawValue: string) => boolean;
  /** Called when value changes */
  onChange?: (formattedValue: string, rawValue: string) => void;
  /** Called when validation state changes */
  onValidationChange?: (isValid: boolean) => void;
}

export interface MaskInstance {
  /** The input element */
  el: HTMLInputElement | HTMLTextAreaElement;
  /** Get formatted display value */
  getValue: () => string;
  /** Get raw (unformatted) value */
  getRawValue: () => string;
  /** Set value programmatically */
  setValue: (value: string) => void;
  /** Check if current value is valid */
  isValid: () => boolean;
  /** Clear the input */
  clear: () => void;
  /** Focus the input */
  focus: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Built-in Formatters ---

function formatPhone(raw: string, format: string): string {
  const digits = raw.replace(/\D/g, "");
  let result = "";
  let digitIdx = 0;

  for (const ch of format) {
    if (digitIdx >= digits.length) break;
    if (ch === "X") {
      result += digits[digitIdx]!;
      digitIdx++;
    } else {
      result += ch;
    }
  }

  return result;
}

function formatDate(raw: string, format: string): string {
  const digits = raw.replace(/\D/g, "");
  const parts = format.split(/[/\-]/);
  let result = "";
  let digitIdx = 0;

  for (let i = 0; i < format.length; i++) {
    if (digitIdx >= digits.length) break;
    const ch = format[i]!;
    if (/[MDY]/.test(ch)) {
      result += digits[digitIdx]!;
      digitIdx++;
    } else {
      result += ch;
    }
  }

  return result;
}

function formatCurrency(
  raw: string,
  symbol: string,
  decSep: string,
  thouSep: string,
  decimalPlaces: number,
  prefix: string,
  suffix: string,
  allowNegative: boolean,
): string {
  // Clean the raw value — keep digits, decimal, minus
  let cleaned = raw.replace(/[^\d.\-]/g, "");

  // Handle negative
  const isNegative = allowNegative && cleaned.startsWith("-");
  if (isNegative) cleaned = cleaned.slice(1);

  // Parse as number
  const num = parseFloat(cleaned) || 0;
  const fixed = num.toFixed(decimalPlaces);

  // Split into integer and decimal parts
  const [intPart, decPart] = fixed.split(".");

  // Add thousand separators
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thouSep);

  const formattedDec = decPart ? `${decSep}${decPart}` : "";

  return `${isNegative ? "-" : ""}${prefix}${symbol}${formattedInt}${formattedDec}${suffix}`;
}

function formatPercent(raw: string, decimals: number): string {
  const num = parseFloat(raw.replace(/[^\d.]/g, "")) || 0;
  return `${num.toFixed(decimals)}%`;
}

function formatSSN(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5, 9)}`;
}

function formatZip(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 9)}`;
}

function formatTime(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  return `${digits.slice(0, 2)}:${digits.slice(2, 4)}${digits.length > 4 ? ":" + digits.slice(4, 6) : ""}`;
}

function formatIP(raw: string): string {
  const chars = raw.replace(/[^0-9.]/g, "");
  // Auto-insert dots after each octet
  const parts = chars.split(".");
  const result: string[] = [];
  for (const part of parts) {
    if (part && part.length > 3) {
      result.push(part.slice(0, 3));
      if (result.length < 4) result.push(part.slice(3));
    } else {
      result.push(part);
    }
  }
  return result.filter(Boolean).slice(0, 4).join(".");
}

function formatCreditCard(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const groups = digits.match(/.{1,4}/g);
  return groups ? groups.join(" ") : digits;
}

function formatHex(raw: string): string {
  const cleaned = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 6)}${cleaned.length > 6 ? " " + cleaned.slice(6, 8) : ""}`;
}

// --- Extract Raw Value ---

function extractRaw(formatted: string, maskType: MaskType | string): string {
  switch (maskType) {
    case "phone":
      return formatted.replace(/\D/g, "");
    case "date":
      return formatted.replace(/[^0-9]/g, "");
    case "currency":
    case "percent":
      return formatted.replace(/[^\d.\-]/g, "");
    case "ssn":
      return formatted.replace(/[^0-9]/g, "");
    case "zip":
      return formatted.replace(/[^0-9]/g, "");
    case "time":
      return formatted.replace(/[^0-9]/g, "");
    case "ip":
      return formatted.replace(/[^0-9.]/g, "");
    case "hex":
      return formatted.replace(/[^0-9a-fA-F]/g, "");
    case "credit-card":
      return formatted.replace(/\s/g, "");
    default:
      // Custom mask — remove placeholders
      return formatted.replace(/[^a-zA-Z0-9]/g, "");
  }
}

// --- Core Factory ---

/**
 * Attach an input mask to an input element.
 *
 * @example
 * ```ts
 * const mask = createMask({
 *   input: phoneInput,
 *   mask: "phone",
 *   phoneFormat: "(XXX) XXX-XXXX",
 * });
 * ```
 */
export function createMask(options: MaskOptions): MaskInstance {
  const {
    input,
    mask = "text",
    placeholder = "_",
    showPlaceholder = false,
    currencySymbol = "$",
    decimals = 2,
    thousandsSeparator = ",",
    decimalSeparator = ".",
    prefix = "",
    suffix = "",
    maxLength,
    minLength,
    allowNegative = false,
    dateFormat = "MM/DD/YYYY",
    phoneFormat = "(XXX) XXX-XXXX",
    allowedChars,
    transform,
    validate,
    onChange,
    onValidationChange,
  } = options;

  let _rawValue = "";
  let _lastFormatted = "";
  let _cursorPos = 0;

  // Store original attributes
  const originalInputMode = input.getAttribute("inputmode");
  const originalAutocomplete = input.getAttribute("autocomplete");
  const originalType = input.type;

  // Set appropriate input mode
  if (mask === "phone" || mask === "numeric") {
    input.setAttribute("inputmode", "numeric");
  } else if (mask === "email") {
    input.setAttribute("inputmode", "email");
    input.setAttribute("type", "email");
  }

  // --- Formatting ---

  function _format(rawValue: string): string {
    let val = transform ? transform(rawValue) : rawValue;

    // Apply allowed chars filter
    if (allowedChars) {
      val = val.split("").filter((c) => allowedChars.test(c)).join("");
    }

    // Enforce max length on raw value
    if (maxLength && val.length > maxLength) {
      val = val.slice(0, maxLength);
    }

    if (!val) return prefix + suffix;

    switch (mask) {
      case "phone":
        return formatPhone(val, phoneFormat);
      case "date":
        return formatDate(val, dateFormat);
      case "currency":
        return formatCurrency(val, currencySymbol, decimalSeparator, thousandsSeparator, decimals, prefix, suffix, allowNegative);
      case "percent":
        return formatPercent(val, decimals);
      case "ssn":
        return formatSSN(val);
      case "zip":
        return formatZip(val);
      case "time":
        return formatTime(val);
      case "ip":
        return formatIP(val);
      case "hex":
        return formatHex(val);
      case "credit-card":
        return formatCreditCard(val);
      case "numeric":
        return val.replace(/\D/g, "");
      case "alphanumeric":
        return val.replace(/[^a-zA-Z0-9]/g, "");
      default:
        if (typeof mask === "string" && mask !== "text" && mask !== "email") {
          // Custom pattern mask
          let result = "";
          let valIdx = 0;
          for (const ch of mask) {
            if (valIdx >= val.length) {
              if (showPlaceholder) result += placeholder;
              continue;
            }
            if (ch === "0" || ch === "9" || ch === "A" || ch === "*") {
              result += val[valIdx]!;
              valIdx++;
            } else {
              result += ch;
              // Skip if mask char matches next input char
              if (val[valIdx] === ch) valIdx++;
            }
          }
          return result + (valIdx < val.length ? val.slice(valIdx) : "");
        }
        return val;
    }
  }

  function _validate(rawValue: string): boolean {
    if (minLength && rawValue.length < minLength) return false;
    if (validate) return validate(rawValue);
    if (maxLength && rawValue.length > maxLength) return false;

    // Built-in validation
    switch (mask) {
      case "email": return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue);
      case "phone": return rawValue.replace(/\D/g, "").length >= 10;
      case "ssn": return rawValue.replace(/\D/g, "").length === 9;
      case "zip": {
        const d = rawValue.replace(/\D/g, "");
        return d.length === 5 || d.length === 9;
      }
      case "ip": {
        const parts = rawValue.split(".");
        return parts.length === 4 && parts.every((p) => {
          const n = parseInt(p, 10);
          return !isNaN(n) && n >= 0 && n <= 255;
        });
      }
      case "credit-card": {
        const d = rawValue.replace(/\D/g, "");
        return d.length >= 13 && d.length <= 19;
      }
      case "hex": {
        const d = rawValue.replace(/[^0-9a-fA-F]/g, "");
        return d.length >= 1;
      }
      default: return true;
    }
  }

  // --- Event Handlers ---

  function handleInput(): void {
    const selStart = input.selectionStart ?? 0;
    const oldLen = (_lastFormatted || input.value).length;

    _rawValue = extractRaw(input.value, mask as MaskType);
    const formatted = _format(_rawValue);
    _lastFormatted = formatted;

    input.value = formatted;

    // Adjust cursor position
    const newLen = formatted.length;
    const diff = newLen - oldLen;
    const newPos = Math.max(prefix.length, Math.min(selStart + diff, newLen - suffix.length));
    input.setSelectionRange(newPos, newPos);

    // Validation
    const valid = _validate(_rawValue);
    onValidationChange?.(valid);

    onChange?.(formatted, _rawValue);
  }

  function handleKeyDown(e: KeyboardEvent): void {
    // Handle backspace — skip over format characters
    if (e.key === "Backspace") {
      const pos = input.selectionStart ?? 0;
      if (pos > prefix.length) {
        const charBefore = input.value[pos - 1];
        if (charBefore && /[^a-zA-Z0-9]/.test(charBefore)) {
          // Find previous non-format character
          let newPos = pos - 1;
          while (newPos > prefix.length && /[^a-zA-Z0-9]/.test(input.value[newPos]!)) {
            newPos--;
          }
          if (newPos > prefix.length) {
            e.preventDefault();
            input.setSelectionRange(newPos, newPos);
            // Delete manually
            const rawBefore = _rawValue;
            _rawValue = _rawValue.slice(0, newPos - prefix.length - 1) + _rawValue.slice(newPos - prefix.length);
            input.value = _format(_rawValue);
            input.setSelectionRange(newPos - 1, newPos - 1);
            onChange?.(input.value, _rawValue);
          }
        }
      }
    }
  }

  // Attach listeners
  input.addEventListener("input", handleInput);
  input.addEventListener("keydown", handleKeyDown);

  // Format initial value if present
  if (input.value) {
    _rawValue = extractRaw(input.value, mask as MaskType);
    input.value = _format(_rawValue);
    _lastFormatted = input.value;
  }

  // --- Methods ---

  function getValue(): string { return input.value; }

  function getRawValue(): string { return _rawValue; }

  function setValue(value: string): void {
    _rawValue = extractRaw(value, mask as MaskType);
    input.value = _format(_rawValue);
    _lastFormatted = input.value;
    onChange?.(input.value, _rawValue);
  }

  function isValid(): boolean { return _validate(_rawValue); }

  function clear(): void {
    _rawValue = "";
    input.value = prefix + suffix;
    _lastFormatted = input.value;
    onChange?.(input.value, _rawValue);
  }

  function focus(): void { input.focus(); }

  function destroy(): void {
    input.removeEventListener("input", handleInput);
    input.removeEventListener("keydown", handleKeyDown);
    // Restore original attributes
    if (originalInputMode !== null) input.setAttribute("inputmode", originalInputMode);
    else input.removeAttribute("inputmode");
    if (originalAutocomplete !== null) input.setAttribute("autocomplete", originalAutocomplete);
    else input.removeAttribute("autocomplete");
    if (originalType) input.type = originalType;
  }

  return { el: input, getValue, getRawValue, setValue, isValid, clear, focus, destroy };
}
