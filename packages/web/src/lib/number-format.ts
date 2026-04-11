/**
 * Number Formatting: Advanced number formatting with custom patterns,
 * unit suffixes, ordinal numbers, roman numerals, number words,
 * and locale-independent formatting utilities.
 */

// --- Types ---

export interface NumberPatternOptions {
  /** Minimum integer digits */
  minIntDigits?: number;
  /** Maximum integer digits */
  maxIntDigits?: number;
  /** Min/max fraction digits */
  minFracDigits?: number;
  maxFracDigits?: number;
  /** Grouping separator (default: ",") */
  groupingSeparator?: string;
  /** Decimal separator (default: ".") */
  decimalSeparator?: string;
  /** Prefix string */
  prefix?: string;
  /** Suffix string */
  suffix?: string;
  /** Show sign? */
  signDisplay?: "auto" | "always" | "never" | "exceptZero" | "accounting";
  /** Rounding mode */
  rounding?: "ceil" | "floor" | "round" | "trunc";
  /** Pad with zeros? */
  padZeros?: boolean;
}

// --- Core Formatter ---

/**
 * Format a number using a customizable pattern.
 */
export function formatNumberCustom(value: number, options: NumberPatternOptions = {}): string {
  if (!isFinite(value)) return String(value);

  const {
    minIntDigits = 1,
    maxFracDigits = 0,
    minFracDigits = 0,
    groupingSeparator = ",",
    decimalSeparator = ".",
    prefix = "",
    suffix = "",
    signDisplay = "auto",
    rounding = "round",
    padZeros = false,
  } = options;

  // Apply rounding
  let rounded: number;
  const multiplier = Math.pow(10, maxFracDigits);

  switch (rounding) {
    case "ceil": rounded = Math.ceil(value * multiplier) / multiplier; break;
    case "floor": rounded = Math.floor(value * multiplier) / multiplier; break;
    case "trunc": rounded = Math.trunc(value * multiplier) / multiplier; break;
    default: rounded = Math.round(value * multiplier) / multiplier;
  }

  // Determine sign
  let signStr = "";
  const isNegative = rounded < 0;
  const absValue = Math.abs(rounded);

  switch (signDisplay) {
    case "always":
      signStr = isNegative ? "-" : "+";
      break;
    case "never":
      signStr = "";
      break;
    case "exceptZero":
      signStr = absValue === 0 ? "" : isNegative ? "-" : "+";
      break;
    case "accounting":
      signStr = isNegative ? "(" : "";
      break;
    default:
      signStr = isNegative ? "-" : "";
  }

  // Split into integer and fractional parts
  const [intPart, fracPart] = absValue.toFixed(maxFracDigits).split(".");

  // Pad integer part
  let formattedInt = intPart!;
  if (padZeros && formattedInt.length < minIntDigits) {
    formattedInt = formattedInt.padStart(minIntDigits, "0");
  }

  // Add grouping separators
  if (groupingSeparator) {
    formattedInt = formattedInt.replace(/\B(?=(\d{3})+(?!\d))/g, groupingSeparator);
  }

  // Build result
  let result = `${prefix}${signStr}${formattedInt}`;

  if (maxFracDigits > 0 || minFracDigits > 0) {
    let frac = fracPart ?? "";
    if (frac.length < minFracDigits) {
      frac = frac.padEnd(minFracDigits, "0");
    }
    if (frac.length > 0) {
      result += `${decimalSeparator}${frac}`;
    }
  }

  result += suffix;

  // Accounting style closing paren
  if (signDisplay === "accounting" && isNegative) {
    result += ")";
  }

  return result;
}

// --- Unit Suffixes ---

/** Format with SI unit suffixes (K, M, B, T) */
export function formatWithUnits(
  value: number,
  options: { decimals?: number; space?: boolean; units?: string[] } = {},
): string {
  const { decimals = 1, space = true, units = ["", "K", "M", "B", "T"] } = options;
  if (!isFinite(value)) return String(value);

  const abs = Math.abs(value);
  if (abs < 1000) return formatNumberCustom(value, { decimals });

  const exp = Math.min(Math.floor(Math.log10(abs) / 3), units.length - 1);
  const scaled = value / Math.pow(1000, exp);
  const sp = space ? " " : "";

  return `${formatNumberCustom(scaled, { decimals })}${sp}${units[exp]}`;
}

/** Format file size with binary or decimal units */
export function formatFileSize(
  bytes: number,
  options: { system?: "binary" | "decimal"; decimals?: number } = {},
): string {
  const { system = "binary", decimals = 2 } = options;
  if (!isFinite(bytes) || bytes < 0) return "0 B";

  const base = system === "binary" ? 1024 : 1000;
  const units = system === "binary"
    ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
    : ["B", "KB", "MB", "GB", "TB", "PB"];

  if (bytes === 0) return `0 ${units[0]}`;

  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / Math.pow(base, exp);

  return `${formatNumberCustom(value, { decimals })} ${units[exp]}`;
}

// --- Ordinal Numbers ---

/**
 * Format a number as an ordinal (1st, 2nd, 3rd, 4th, etc.)
 */
export function formatOrdinal(n: number): string {
  if (!isFinite(n) || n < 0) return String(n);

  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  // Special cases: 11, 12, 13 → th
  if (v >= 11 && v <= 13) return `${n}th`;

  const remainder = v % 10;
  return `${n}${s[remainder] ?? s[0]}`;
}

// --- Number Words ---

/** Convert a number to English words (0-999,999 supported) */
export function numberToWords(n: number): string {
  if (!isFinite(n) || n < 0 || n >= 1_000_000) return String(n);
  if (n === 0) return "zero";

  const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const teens = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

  function underThousand(num: number): string {
    if (num === 0) return "";
    if (num < 10) return ones[num]!;
    if (num < 20) return teens[num - 10]!;
    if (num < 100) {
      const t = Math.floor(num / 10);
      const o = num % 10;
      return tens[t]! + (o ? "-" + ones[o] : "");
    }
    const h = Math.floor(num / 100);
    const rest = num % 100;
    return ones[h]! + " hundred" + (rest ? " " + underThousand(rest) : "");
  }

  if (n < 1000) return underThousand(n);

  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  return underThousand(thousands) + " thousand" + (rest ? " " + underThousand(rest) : "");
}

/** Convert a number to Chinese characters (0-99999 supported) */
export function numberToChinese(n: number): string {
  if (!isFinite(n) || n < 0 || n >= 100_000) return String(n);
  if (n === 0) return "\u96f6";

  const digits = ["\u96f6", "\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d", "\u4e03", "\u516b", "\u4e5d"];
  const units = ["", "\u5341", "\u767e", "\u5343", \u4e07"];

  const str = String(n);
  let result = "";
  const len = str.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(str[i], 10);
    const pos = len - i - 1;

    if (digit !== 0) {
      result += digits[digit] + units[pos];
    } else {
      // Only add zero if not trailing and not already added
      if (i < len - 1 && parseInt(str[i + 1], 10) !== 0) {
        result += digits[0];
      }
    }
  }

  return result;
}

// --- Roman Numerals ---

/**
 * Convert a number to Roman numerals (1-3999).
 */
export function toRomanNumerals(n: number): string {
  if (!isFinite(n) || n < 1 || n > 3999) return String(n);

  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];

  let result = "";
  let remaining = n;

  for (let i = 0; i < values.length; i++) {
    while (remaining >= values[i]!) {
      result += symbols[i];
      remaining -= values[i]!;
    }
  }

  return result;
}

/**
 * Parse Roman numeral back to number.
 */
export function fromRomanNumerals(roman: string): number {
  const map: Record<string, number> = {
    I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
  };

  let result = 0;
  let prev = 0;

  for (let i = roman.length - 1; i >= 0; i--) {
    const current = map[roman[i].toUpperCase()] ?? 0;
    if (current < prev) {
      result -= current;
    } else {
      result += current;
    }
    prev = current;
  }

  return result;
}

// --- Ranges & Spans ---

/** Format a numeric range as a human-readable string */
export function formatRange(
  min: number,
  max: number,
  options: { decimals?: number; separator?: string; inclusive?: boolean } = {},
): string {
  const { decimals = 0, separator = " – ", inclusive = true } = options;
  const a = formatNumberCustom(min, { decimals });
  const b = formatNumberCustom(max, { decimals });
  return `${a}${separator}${b}${inclusive ? "" : " (exclusive)"}`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between two values */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Map a value from one range to another */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clampResult = true,
): number {
  const t = (value - inMin) / (inMax - inMin);
  const result = lerp(outMin, outMax, t);
  return clampResult ? clamp(result, Math.min(outMin, outMax), Math.max(outMin, outMax)) : result;
}

// --- Parsing ---

/** Parse a formatted number string back to a number */
export function parseFormattedNumber(
  str: string,
  options: { thousandsSep?: string; decimalSep?: string } = {},
): number {
  const { thousandsSep = ",", decimalSep = "." } = options;
  const cleaned = str
    .replace(new RegExp(`\\${thousandsSep}`, "g"), "")
    .replace(decimalSep, ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/** Parse a percentage string ("25%" → 0.25 or 25 based on asDecimal param) */
export function parsePercent(str: string, asDecimal = true): number {
  const cleaned = str.replace("%", "").trim();
  const val = parseFloat(cleaned);
  if (isNaN(val)) return 0;
  return asDecimal ? val / 100 : val;
}
