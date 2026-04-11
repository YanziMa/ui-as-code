/**
 * Input Mask Utilities: Format user input in real-time with pattern masks,
 * supporting phone numbers, dates, SSN, currency, custom patterns,
 * cursor position management, and validation.
 */

// --- Types ---

export type MaskType = "phone" | "date" | "datetime" | "time" | "ssn" | "currency" |
  "percentage" | "zip" | "credit-card" | "custom" | "numeric" | "alpha" | "alphanumeric";

export interface MaskOptions {
  /** Input element to attach mask to */
  input: HTMLInputElement;
  /** Mask type or custom pattern */
  mask: MaskType | string;
  /** Placeholder character. Default "_" */
  placeholder?: string;
  /** Show placeholder while unfilled? Default false */
  showPlaceholder?: boolean;
  /** Strip formatting on blur? Default true for some types */
  stripOnBlur?: boolean;
  /** Reformat on focus? Default true */
  reformatOnFocus?: boolean;
  /** Maximum length (0 = auto from mask) */
  maxLength?: number;
  /** Custom formatter function (for "custom" type) */
  formatter?: (value: string) => string;
  /** Custom parser/unformatter (raw value extraction) */
  parser?: (formatted: string) => string;
  /** Called when value changes */
  onChange?: (value: string, rawValue: string) => void;
  /** Called when input is fully filled */
  onComplete?: (value: string) => void;
  /** Validation regex for each character position */
  validator?: (char: string, position: number) => boolean;
}

export interface MaskInstance {
  /** The input element */
  el: HTMLInputElement;
  /** Get formatted value */
  getValue: () => string;
  /** Get raw (unformatted) value */
  getRawValue: () => string;
  /** Set value programmatically (formats automatically) */
  setValue: (value: string) => void;
  /** Check if the mask is completely filled */
  isComplete: () => boolean;
  /** Validate current input against the mask */
  validate: () => boolean;
  /** Force re-format */
  format: () => void;
  /** Destroy and remove listeners */
  destroy: () => void;
}

// --- Built-in Mask Patterns ---

const MASK_PATTERNS: Record<string, { pattern: string; definition: Record<string, RegExp> }> = {
  phone: {
    pattern: "(000) 000-0000",
    definition: { "0": /[0-9]/ },
  },
  date: {
    pattern: "00/00/0000",
    definition: { "0": /[0-9]/ },
  },
  datetime: {
    pattern: "00/00/0000 00:00",
    definition: { "0": /[0-9]/ },
  },
  time: {
    pattern: "00:00",
    definition: { "0": /[0-9]/ },
  },
  ssn: {
    pattern: "000-00-0000",
    definition: { "0": /[0-9]/ },
  },
  zip: {
    pattern: "00000",
    definition: { "0": /[0-9]/ },
  },
  "credit-card": {
    pattern: "0000 0000 0000 0000",
    definition: { "0": /[0-9]/ },
  },
};

// --- Core Factory ---

/**
 * Create an input mask that formats user input in real-time.
 *
 * @example
 * ```ts
 * const mask = createInputMask({
 *   input: phoneInput,
 *   mask: "phone",
 *   onChange: (val, raw) => console.log(val, raw),
 * });
 * ```
 *
 * @example
 * ```ts
 * // Custom pattern: A=alpha, 0=digit, *=any
 * const mask = createInputMask({
 *   input: codeInput,
 *   mask: "AA-000-*",
 *   placeholder: "_",
 * });
 * ```
 */
export function createInputMask(options: MaskOptions): MaskInstance {
  const {
    input,
    mask,
    placeholder = "_",
    showPlaceholder = false,
    stripOnBlur = true,
    reformatOnFocus = true,
    maxLength = 0,
    formatter,
    parser,
    onChange,
    onComplete,
    validator,
  } = options;

  let _rawValue = "";
  let _destroyed = false;

  // Resolve pattern
  let pattern: string;
  let definition: Record<string, RegExp>;

  if (typeof mask === "string" && MASK_PATTERNS[mask]) {
    pattern = MASK_PATTERNS[mask]!.pattern;
    definition = { ...MASK_PATTERNS[mask]!.definition };
  } else if (typeof mask === "string") {
    // Treat as raw pattern string with default definitions
    pattern = mask;
    definition = {
      "0": /[0-9]/,
      "A": /[a-zA-Z]/,
      "*": /./,
      "#": /[0-9a-zA-Z]/,
      "H": /[0-2]/,
      "M": /[0-5]/,
    };
  } else {
    pattern = "";
    definition = {};
  }

  // Count editable positions in pattern
  function getEditablePositions(): number[] {
    const positions: number[] = [];
    for (let i = 0; i < pattern.length; i++) {
      if (definition[pattern[i]!] !== undefined) {
        positions.push(i);
      }
    }
    return positions;
  }

  const editablePositions = getEditablePositions();
  const maxEditableLength = maxLength > 0 ? Math.min(maxLength, editablePositions.length) : editablePositions.length;

  // --- Formatting ---

  function applyMask(value: string): string {
    if (formatter) return formatter(value);

    // For currency type
    if (mask === "currency") return formatCurrency(value);
    if (mask === "percentage") return formatPercentage(value);

    // Pattern-based formatting
    let result = "";
    let valueIndex = 0;

    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i]!;
      const def = definition[char];

      if (def !== undefined) {
        if (valueIndex < value.length) {
          const ch = value[valueIndex]!;
          // Use custom validator if provided, otherwise use definition
          const isValid = validator ? validator(ch, valueIndex) : def.test(ch);
          result += isValid ? ch : (showPlaceholder ? placeholder : "");
          valueIndex++;
        } else {
          result += showPlaceholder ? placeholder : "";
        }
      } else {
        // Literal character from pattern
        result += char;
      }
    }

    return result;
  }

  function extractRaw(formatted: string): string {
    if (parser) return parser(formatted);

    let raw = "";
    for (let i = 0; i < formatted.length && i < pattern.length; i++) {
      const char = pattern[i];
      if (definition[char!] !== undefined) {
        const fc = formatted[i];
        if (fc && fc !== placeholder) raw += fc;
      }
    }
    return raw;
  }

  // --- Special Formatters ---

  function formatCurrency(value: string): string {
    const digits = value.replace(/[^\d.-]/g, "");
    const num = parseFloat(digits);
    if (isNaN(num)) return "";
    const parts = Math.abs(num).toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (num < 0 ? "-" : "") + "$" + parts.join(".");
  }

  function formatPercentage(value: string): string {
    const digits = value.replace(/[^\d.]/g, "");
    const num = parseFloat(digits);
    if (isNaN(num)) return "";
    return `${Math.min(100, Math.max(0, num))}%`;
  }

  // --- Event Handlers ---

  function handleInput(e: Event): void {
    if (_destroyed) return;

    const target = e.target as HTMLInputElement;
    let value = target.value;

    // Extract raw characters (only non-literal)
    const newRaw = extractRaw(value);
    _rawValue = newRaw.slice(0, maxEditableLength);

    // Reapply mask
    const formatted = applyMask(_rawValue);
    target.value = formatted;

    // Fix cursor position
    fixCursorPosition(target, value, formatted);

    onChange?.(formatted, _rawValue);

    // Check completion
    if (_rawValue.length >= maxEditableLength) {
      onComplete?.(formatted);
    }
  }

  function handleKeyDown(e: KeyboardEvent): void {
    // Handle backspace/delete properly
    if (e.key === "Backspace" || e.key === "Delete") {
      // Let browser handle it, then we reformat on input event
      requestAnimationFrame(() => {
        if (!_destroyed) handleInput({ target: input } as Event);
      });
    }
  }

  function handleFocus(): void {
    if (reformatOnFocus && _rawValue) {
      input.value = applyMask(_rawValue);
    }
  }

  function handleBlur(): void {
    if (stripOnBlur) {
      // Keep formatted but could strip here if needed
    }
  }

  // --- Cursor Management ---

  function fixCursorPosition(
    element: HTMLInputElement,
    oldValue: string,
    newValue: string,
  ): void {
    // Simple heuristic: find where the new content diverges
    let newPos = element.selectionStart ?? newValue.length;

    // If a literal was inserted before cursor, advance past it
    if (newValue.length > oldValue.length) {
      // Find first differing position
      for (let i = 0; i < Math.min(oldValue.length, newValue.length); i++) {
        if (oldValue[i] !== newValue[i]) {
          newPos = i + 1;
          break;
        }
      }
    }

    // Ensure new position isn't on a literal
    newPos = clampToEditablePosition(newPos, newValue);

    try {
      element.setSelectionRange(newPos, newPos);
    } catch {
      // Some browsers throw if element isn't focused
    }
  }

  function clampToEditablePosition(pos: number, value: string): number {
    // If position lands on a literal, move forward/backward to nearest editable
    if (pos < value.length && definition[value[pos]] === undefined) {
      // Search forward for next editable
      for (let i = pos; i < value.length; i++) {
        if (definition[value[i]] !== undefined) return i;
      }
      // Search backward
      for (let i = pos - 1; i >= 0; i--) {
        if (definition[value[i]] !== undefined) return i + 1;
      }
    }
    return pos;
  }

  // --- API ---

  function getValue(): string { return input.value; }

  function getRawValue(): string { return _rawValue; }

  function setValue(value: string): void {
    _rawValue = value.replace(/[^0-9a-zA-Z]/g, "").slice(0, maxEditableLength);
    input.value = applyMask(_rawValue);
    onChange?.(input.value, _rawValue);
  }

  function isComplete(): boolean {
    return _rawValue.length >= maxEditableLength;
  }

  function validate(): boolean {
    if (!pattern) return input.value.length > 0;
    const raw = getRawValue();
    return raw.length === maxEditableLength;
  }

  function format(): void {
    input.value = applyMask(_rawValue);
  }

  function destroy(): void {
    _destroyed = true;
    input.removeEventListener("input", handleInput);
    input.removeEventListener("keydown", handleKeyDown);
    input.removeEventListener("focus", handleFocus);
    input.removeEventListener("blur", handleBlur);
  }

  // --- Setup ---

  input.addEventListener("input", handleInput);
  input.addEventListener("keydown", handleKeyDown);
  input.addEventListener("focus", handleFocus);
  input.addEventListener("blur", handleBlur);

  // Set initial aria attributes
  input.setAttribute("aria-describedby", `${input.id || "input"}-mask-hint`);

  // If input already has a value, format it
  if (input.value) {
    _rawValue = extractRaw(input.value);
    input.value = applyMask(_rawValue);
  }

  return { el: input, getValue, getRawValue, setValue, isComplete, validate, format, destroy };
}

// --- Standalone Formatters (no instance needed) ---

/** Format a phone number string */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Format a date string (MM/DD/YYYY) */
export function formatDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Format an SSN */
export function formatSSN(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/** Format a credit card number with spaces */
export function formatCreditCard(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

/** Format as currency string */
export function formatCurrencyStandalone(value: string | number, prefix = "$"): string {
  const num = typeof value === "number" ? value : parseFloat(value.replace(/[^\d.-]/g, ""));
  if (isNaN(num)) return `${prefix}0.00`;
  const parts = Math.abs(num).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (num < 0 ? "-" : "") + prefix + parts.join(".");
}

/** Apply a generic mask pattern to a value */
export function applyPatternMask(value: string, patternStr: string, defs: Record<string, RegExp> = { "0": /[0-9]/, "A": /[a-zA-Z]/, "*": /./ }): string {
  let result = "";
  let vi = 0;
  for (let i = 0; i < patternStr.length; i++) {
    const char = patternStr[i]!;
    const def = defs[char];
    if (def !== undefined) {
      result += vi < value.length && def.test(value[vi]!) ? value[vi++]! : "";
    } else {
      result += char;
    }
  }
  return result;
}
