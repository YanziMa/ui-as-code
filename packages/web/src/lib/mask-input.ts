/**
 * Input Masking: Format user input in real-time with pattern-based masks,
 * support for dates, phone numbers, credit cards, currency, custom patterns,
 * paste handling, cursor position management, and validation.
 */

// --- Types ---

export interface MaskConfig {
  /** Mask pattern string (e.g., "000-000-0000", "99/99/9999") */
  pattern?: string;
  /** Mask format characters */
  maskChar?: string;       // Character shown for unfilled positions (default "_")
  placeholderChar?: string; // Character used in placeholder display
  /** Allow partial input? (default: true) */
  allowPartial?: boolean;
  /** Strip mask characters when getting value? (default: true) */
  stripMask?: boolean;
  /** Auto-correct common mistakes? */
  autoCorrect?: boolean;
  /** Transform input (e.g., uppercase) */
  transform?: "uppercase" | "lowercase" | "capitalize" | ((value: string) => string);
  /** Validate the complete value */
  validate?: (raw: string, masked: string) => boolean | string;
  /** Custom formatter function (overrides pattern) */
  formatter?: (value: string, previousValue: string, options: { selectionStart: number; selectionEnd: number }) => { value: string; cursorPos: number };
  /** Callback on each change */
  onChange?: (masked: string, raw: string) => void;
  /** Callback when fully filled */
  onComplete?: (masked: string, raw: string) => void;
  /** Callback on validation error */
  onError?: (error: string) => void;
}

export interface MaskInstance {
  /** The input element being managed */
  inputEl: HTMLInputElement;
  /** Get current masked value */
  getMaskedValue(): string;
  /** Get raw value (without mask characters) */
  getRawValue(): string;
  /** Check if the mask is completely filled */
  isComplete(): boolean;
  /** Check if current value is valid */
  isValid(): boolean;
  /** Set value programmatically (applies masking) */
  setValue(value: string): void;
  /** Force re-format */
  update(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Built-in Patterns ---

const BUILTIN_PATTERNS: Record<string, { pattern: string; regexps: Record<string, RegExp> }> = {
  phone: {
    pattern: "(000) 000-0000",
    regexps: { "0": /\d/ },
  },
  phoneIntl: {
    pattern: "+00 000 000 0000",
    regexps: { "0": /\d/ },
  },
  date: {
    pattern: "00/00/0000",
    regexps: { "0": /\d/ },
  },
  datetime: {
    pattern: "00/00/0000 00:00",
    regexps: { "0": /\d/ },
  },
  time: {
    pattern: "00:00",
    regexps: { "0": /\d/ },
  },
  time12h: {
    pattern: "00:00 AM",
    regexps: { "0": /[0-1]/, "9": /[0-2]/, "A": /A|P/i, "M": /M/ },
  },
  creditCard: {
    pattern: "0000 0000 0000 0000",
    regexps: { "0": /\d/ },
  },
  cvv: {
    pattern: "000",
    regexps: { "0": /\d/ },
  },
  ssn: {
    pattern: "000-00-0000",
    regexps: { "0": /\d/ },
  },
  zipCode: {
    pattern: "00000",
    regexps: { "0": /\d/ },
  },
  zipCodePlus4: {
    pattern: "00000-0000",
    regexps: { "0": /\d/ },
  },
  postalCodeCA: {
    pattern: "A0A 0A0",
    regexps: { "0": /\d/, "A": /[A-Za-z]/ },
  },
  ip: {
    pattern: "000.000.000.000",
    regexps: { "0": /\d/ },
  },
  mac: {
    pattern: "00:00:00:00:00:00",
    regexps: { "0": /[0-9a-fA-F]/ },
  },
  hexColor: {
    pattern: "#000000",
    regexps: { "0": /[0-9a-fA-F]/ },
  },
  percentage: {
    pattern: "000%",
    regexps: { "0": /\d/ },
  },
  currency: {
    pattern: "$0,000.00",
    regexps: { "0": /\d/, "$": /\$/, ",": /,/, ".": /\./ },
  },
  serialNumber: {
    pattern: "AAAA-0000-AAAA",
    regexps: { "0": /\d/, "A": /[A-Za-z0-9]/ },
  },
};

// --- Main Factory ---

export function createInputMask(inputEl: HTMLInputElement, config: MaskConfig): MaskInstance {
  const opts = {
    maskChar: "_",
    placeholderChar: "_",
    allowPartial: true,
    stripMask: true,
    autoCorrect: false,
    ...config,
  };

  // Resolve pattern
  let pattern = opts.pattern ?? "";
  let charRegexps: Record<string, RegExp> = {};

  if (!pattern && typeof config.pattern !== "string") {
    // Try built-in by data attribute or default
    const preset = (inputEl.dataset.mask as keyof typeof BUILTIN_PATTERNS) || "";
    if (BUILTIN_PATTERNS[preset]) {
      pattern = BUILTIN_PATTERNS[preset].pattern;
      charRegexps = BUILTIN_PATTERNS[preset].regexps;
    }
  }

  // Default regexps for standard mask chars
  const DEFAULT_REGEXPS: Record<string, RegExp> = {
    "0": /\d/,
    "9": /\d/,
    "A": /[A-Za-z]/,
    "S": /[A-Za-z0-9]/,
    "*": /./,
  };

  const regexps = { ...DEFAULT_REGEXPS, ...charRegexps };

  let destroyed = false;
  let previousValue = "";

  // Determine which characters in the pattern are editable vs literal
  function parsePattern(pat: string): { editable: number[]; literals: Set<number>; totalLength: number } {
    const editable: number[] = [];
    const literals = new Set<number>();

    for (let i = 0; i < pat.length; i++) {
      const ch = pat[i]!;
      if (regexps[ch]) {
        editable.push(i);
      } else {
        literals.add(i);
      }
    }

    return { editable, literals, totalLength: pat.length };
  }

  // Apply mask to a raw value string
  function applyMask(rawValue: string, selStart: number): { masked: string; cursorPos: number } {
    // Use custom formatter if provided
    if (opts.formatter) {
      return opts.formatter(rawValue, previousValue, { selectionStart: selStart, selectionEnd: selStart });
    }

    if (!pattern) return { masked: rawValue, cursorPos: rawValue.length };

    const { editable, literals, totalLength } = parsePattern(pattern);

    // Apply transform
    let processed = rawValue;
    if (opts.transform === "uppercase") processed = rawValue.toUpperCase();
    else if (opts.transform === "lowercase") processed = rawValue.toLowerCase();
    else if (opts.transform === "capitalize") processed = rawValue.replace(/\b\w/g, c => c.toUpperCase());
    else if (typeof opts.transform === "function") processed = opts.transform(rawValue);

    // Build masked string
    let result = "";
    let rawIdx = 0;

    for (let i = 0; i < totalLength && rawIdx < processed.length; i++) {
      if (literals.has(i)) {
        result += pattern[i]!;
        // Adjust cursor position past literal
        if (selStart > i) selStart++;
      } else {
        const expectedChar = pattern[i]!;
        const charRegexp = regexps[expectedChar];

        if (charRegexp) {
          // Find next matching character from raw input
          while (rawIdx < processed.length && !charRegexp.test(processed[rawIdx]!)) {
            rawIdx++;
          }

          if (rawIdx < processed.length) {
            result += processed[rawIdx]!;
            rawIdx++;
          } else {
            result += opts.placeholderChar!;
          }
        } else {
          result += expectedChar;
        }
      }
    }

    // Fill remaining with placeholder or truncate
    if (result.length < totalLength) {
      for (let i = result.length; i < totalLength; i++) {
        if (literals.has(i)) {
          result += pattern[i]!;
        } else {
          result += opts.placeholderChar!;
        }
      }
    }

    // Clamp cursor position
    let cursorPos = Math.min(selStart, totalLength);
    if (cursorPos < 0) cursorPos = 0;

    return { masked: result, cursorPos };
  }

  // Extract raw value from masked string
  function extractRaw(masked: string): string {
    if (!pattern || !opts.stripMask) return masked;

    const { editable, literals } = parsePattern(pattern);
    let raw = "";

    for (const idx of editable) {
      if (idx < masked.length) {
        const ch = masked[idx];
        if (ch && ch !== opts.maskChar && ch !== opts.placeholderChar) {
          raw += ch;
        }
      }
    }

    return raw;
  }

  // Handle input event
  function handleInput(): void {
    if (destroyed) return;

    const cursorPos = inputEl.selectionStart ?? inputEl.value.length;
    const maskedResult = applyMask(inputEl.value, cursorPos);

    // Only update if changed (prevent infinite loop)
    if (inputEl.value !== maskedResult.masked) {
      previousValue = maskedResult.masked;
      inputEl.value = maskedResult.masked;

      // Restore cursor position
      try {
        inputEl.setSelectionRange(maskedResult.cursorPos, maskedResult.cursorPos);
      } catch {
        // Some inputs don't support setSelectionRange
      }
    }

    const raw = extractRaw(maskedResult.masked);
    opts.onChange?.(maskedResult.masked, raw);

    // Check completion
    if (isComplete()) {
      opts.onComplete?.(maskedResult.masked, raw);
    }

    // Validate
    if (opts.validate) {
      const result = opts.validate(raw, maskedResult.masked);
      if (result !== true && result !== undefined) {
        opts.onError?.(typeof result === "string" ? result : "Validation failed");
      }
    }
  }

  // Handle paste — extract only valid characters
  function handlePaste(e: ClipboardEvent): void {
    if (destroyed) return;

    e.preventDefault();

    const pastedText = e.clipboardData?.getData("text") ?? "";
    if (!pastedText) return;

    // Filter to only allowed characters based on pattern
    let filtered = "";
    for (const ch of pastedText) {
      if (pattern) {
        // Find first matching regexp in pattern
        let matched = false;
        for (const [key, reg] of Object.entries(regexps)) {
          if (reg.test(ch) && pattern.includes(key)) {
            filtered += ch;
            matched = true;
            break;
          }
        }
        if (!matched && !pattern.includes(ch)) {
          // Literal character that matches
          continue;
        }
      } else {
        filtered += ch;
      }
    }

    // Apply transform
    if (opts.transform === "uppercase") filtered = filtered.toUpperCase();
    else if (opts.transform === "lowercase") filtered = filtered.toLowerCase();

    // Insert at cursor position
    const start = inputEl.selectionStart ?? 0;
    const end = inputEl.selectionEnd ?? inputEl.value.length;
    const newValue = inputEl.value.substring(0, start) + filtered + inputEl.value.substring(end);
    inputEl.value = newValue;
    handleInput();
  }

  // Public API
  const instance: MaskInstance = {
    inputEl,

    getMaskedValue() { return inputEl.value; },

    getRawValue() { return extractRaw(inputEl.value); },

    isComplete(): boolean {
      if (!pattern) return inputEl.value.length > 0;
      const raw = extractRaw(inputEl.value);
      const { editable } = parsePattern(pattern);
      return raw.length >= editable.length &&
        !inputEl.value.includes(opts.maskChar!) &&
        !inputEl.value.includes(opts.placeholderChar!);
    },

    isValid(): boolean {
      if (!opts.validate) return instance.isComplete();
      const raw = extractRaw(inputEl.value);
      return opts.validate(raw, inputEl.value) === true;
    },

    setValue(value: string): void {
      const result = applyMask(value, 0);
      inputEl.value = result.masked;
      previousValue = result.masked;
      handleInput();
    },

    update(): void {
      handleInput();
    },

    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      inputEl.removeEventListener("input", handleInput);
      inputEl.removeEventListener("paste", handlePaste);
    },
  };

  // Bind events
  inputEl.addEventListener("input", handleInput);
  inputEl.addEventListener("paste", handlePaste);

  // Initial format
  if (inputEl.value) {
    instance.update();
  }

  return instance;
}

// --- Quick Setup Helpers ---

/** Apply a built-in mask pattern by name */
export function applyMask(
  inputEl: HTMLInputElement,
  preset: keyof typeof BUILTIN_PATTERNS | string,
  options?: Partial<MaskConfig>,
): MaskInstance {
  return createInputMask(inputEl, {
    ...(typeof preset === "string" && !preset.includes("{") ? {} : {}),
    pattern: typeof preset === "string" ? preset : BUILTIN_PATTERNS[preset]?.pattern,
    ...options,
  });
}

/** Apply a date mask (MM/DD/YYYY) */
export function dateMask(inputEl: HTMLInputElement, options?: Partial<MaskConfig>): MaskInstance {
  return createInputMask(inputEl, { pattern: "00/00/0000", ...options });
}

/** Apply a phone mask ((XXX) XXX-XXXX) */
export function phoneMask(inputEl: HTMLInputElement, options?: Partial<MaskConfig>): MaskInstance {
  return createInputMask(inputEl, { pattern: "(000) 000-0000", ...options });
}

/** Apply a credit card mask (XXXX XXXX XXXX XXXX) */
export function creditCardMask(inputEl: HTMLInputElement, options?: Partial<MaskConfig>): MaskInstance {
  return createInputMask(inputEl, { pattern: "0000 0000 0000 0000", ...options });
}

/** Apply a currency mask ($X,XXX.XX) */
export function currencyMask(inputEl: HTMLInputElement, options?: Partial<MaskConfig>): MaskInstance {
  return createInputMask(inputEl, { pattern: "$0,000.00", ...options });
}

/** Apply a time mask (HH:MM) */
export function timeMask(inputEl: HTMLInputElement, options?: Partial<MaskConfig>): MaskInstance {
  return createInputMask(inputEl, { pattern: "00:00", ...options });
}
