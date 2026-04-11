/**
 * Number Format Utilities: Comprehensive number formatting, localization,
 * currency, percentage, byte units, ordinal suffixes, compact notation,
 * and number parsing utilities.
 */

// --- Types ---

export type NumberFormatStyle = "decimal" | "currency" | "percent" | "unit";
export type CompactDisplay = "short" | "long";
export type ByteUnit = "B" | "KB" | "MB" | "GB" | "TB" | "PB" | "EB";

export interface FormatNumberOptions {
  /** Locale string(s), default "en-US" */
  locale?: string | string[];
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Use grouping separators? Default true */
  useGrouping?: boolean;
  /** Currency code for "currency" style */
  currency?: string;
  /** Currency display format */
  currencyDisplay?: "symbol" | "narrowSymbol" | "code" | "name";
  /** Unit for "unit" style */
  unit?: string;
  /** Unit display format */
  unitDisplay?: "short" | "narrow" | "long";
  /** Sign display */
  signDisplay?: "auto" | "always" | "never" | "exceptZero";
  /** Notation style */
  notation?: "standard" | "scientific" | "engineering" | "compact";
  /** Compact display mode (for compact notation) */
  compactDisplay?: CompactDisplay;
  /** Prefix string (applied after Intl formatting) */
  prefix?: string;
  /** Suffix string (applied after Intl formatting) */
  suffix?: string;
  /** Fallback if Intl.NumberFormat fails */
  fallback?: string;
}

export interface FormatCurrencyOptions extends Omit<FormatNumberOptions, "style" | "currency"> {
  /** ISO 4217 currency code, default "USD" */
  currency?: string;
  /** Show currency symbol before or after value */
  symbolPosition?: "before" | "after";
  /** Custom symbol override */
  customSymbol?: string;
  /** Round to nearest integer? */
  round?: boolean;
}

export interface FormatBytesOptions {
  /** Target unit, auto-detected by default */
  targetUnit?: ByteUnit;
  /** Decimal places, default 2 */
  decimals?: number;
  /** Include space between value and unit? Default true */
  space?: boolean;
  /** Use binary (1024) or decimal (1000) base? Default binary */
  base?: 1024 | 1000;
  /** Pad small values with leading zero? Default true */
  pad?: boolean;
}

export interface FormatCompactOptions {
  /** Maximum precision, default 1 */
  maxPrecision?: number;
  /** Use K/M/B/T suffixes (short) or full words (long)? Default short */
  display?: CompactDisplay;
  /** Locale for number part, default "en-US" */
  locale?: string;
  /** Custom suffixes for each magnitude */
  customSuffixes?: Record<number, string>;
}

export interface ParseNumberOptions {
  /** Locale-aware parsing, default true */
  localeAware?: boolean;
  /** Locale string, default "en-US" */
  locale?: string;
  /** Return NaN on failure instead of throwing? Default false */
  returnNaN?: boolean;
  /** Allow trailing characters? Default false */
  allowTrailing?: boolean;
}

// --- Core Formatter ---

/**
 * Format a number using Intl.NumberFormat with extended options.
 *
 * @example
 * ```ts
 * formatNumber(1234567.89);                    // "1,234,567.89"
 * formatNumber(0.555, { style: "percent" });   // "55.5%"
 * formatNumber(99.99, { currency: "JPY", style: "currency", currencyDisplay: "code" }); // "99.99 JPY"
 * ```
 */
export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  const {
    locale = "en-US",
    minimumFractionDigits,
    maximumFractionDigits,
    useGrouping = true,
    currency,
    currencyDisplay = "symbol",
    unit,
    unitDisplay = "short",
    signDisplay = "auto",
    notation = "standard",
    compactDisplay = "short",
    prefix = "",
    suffix = "",
    fallback,
  } = options;

  try {
    const intlOpts: Intl.NumberFormatOptions = {
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
      signDisplay,
      notation,
      ...(compactDisplay !== undefined && notation === "compact" ? { compactDisplay } : {}),
    };

    if (options.style === "currency" && currency) {
      Object.assign(intlOpts, { style: "currency", currency, currencyDisplay });
    } else if (options.style === "percent") {
      Object.assign(intlOpts, { style: "percent" });
    } else if (options.style === "unit" && unit) {
      Object.assign(intlOpts, { style: "unit", unit, unitDisplay });
    }

    const formatted = new Intl.NumberFormat(locale, intlOpts).format(value);
    return `${prefix}${formatted}${suffix}`;
  } catch {
    if (fallback !== undefined) return fallback;
    return `${prefix}${value.toLocaleString(locale)}${suffix}`;
  }
}

// --- Currency ---

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "\u20ac", GBP: "\u00a3", JPY: "\u00a5", CNY: "\u00a5",
  KRW: "\u20a9", INR: "\u20b9", RUB: "\u20bd", BRL: "R$",
  CAD: "C$", AUD: "A$", CHF: "CHF", SEK: "kr", NOK: "kr",
  MXN: "MX$", SGD: "S$", HKD: "HK$", TWD: "NT$", ZAR: "R",
};

/**
 * Format a number as currency.
 *
 * @example
 * ```ts
 * formatCurrency(1234.56);              // "$1,234.56"
 * formatCurrency(1234.56, { currency: "EUR" }); // "\u20ac1,234.56"
 * formatCurrency(-50);                  // "-$50.00"
 * ```
 */
export function formatCurrency(value: number, options: FormatCurrencyOptions = {}): string {
  const {
    currency = "USD",
    symbolPosition = "before",
    customSymbol,
    round = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    signDisplay = "auto",
    ...rest
  } = options;

  const val = round ? Math.round(value) : value;
  const sym = customSymbol ?? CURRENCY_SYMBOLS[currency] ?? currency;

  try {
    const formatted = new Intl.NumberFormat(rest.locale || "en-US", {
      style: "currency",
      currency,
      currencyDisplay: rest.currencyDisplay || "symbol",
      minimumFractionDigits,
      maximumFractionDigits,
      signDisplay,
    }).format(val);

    if (customSymbol) {
      // Replace the default symbol with custom one
      const defaultSym = CURRENCY_SYMBOLS[currency] ?? currency;
      return formatted.replace(defaultSym, customSymbol);
    }

    return formatted;
  } catch {
    const numStr = val.toLocaleString(rest.locale || "en-US", {
      minimumFractionDigits,
      maximumFractionDigits,
    });
    return symbolPosition === "before" ? `${sym}${numStr}` : `${numStr} ${sym}`;
  }
}

// --- Percentage ---

/**
 * Format a number as percentage.
 *
 * @example
 * ```ts
 * formatPercent(0.456);       // "45.6%"
 * formatPercent(1);           // "100%"
 * formatPercent(0.00123, 4);  // "0.12%"
 * ```
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Convert a decimal ratio to a percentage string with optional sign.
 */
export function formatPercentSigned(value: number, decimals = 1): string {
  const pct = (value * 100).toFixed(decimals);
  const num = parseFloat(pct);
  return num > 0 ? `+${pct}%` : `${pct}%`;
}

// --- Bytes ---

const BYTE_UNITS: ByteUnit[] = ["B", "KB", "MB", "GB", "TB", "PB", "EB"];
const BYTE_THRESHOLDS = [1024, 1048576, 1073741824, 1099511627776, 1125899906842624, 1152921504606846976];

/**
 * Format bytes into human-readable string.
 *
 * @example
 * ```ts
 * formatBytes(0);               // "0 B"
 * formatBytes(500);             // "500 B"
 * formatBytes(1536);            // "1.5 KB"
 * formatBytes(1073741824);      // "1 GB"
 * formatBytes(1500000000, { decimals: 2 }); // "1.40 GB"
 * ```
 */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  const {
    targetUnit,
    decimals = 2,
    space = true,
    base = 1024,
    pad = true,
  } = options;

  if (bytes < 0) return `-${formatBytes(-bytes, options)}`;

  if (targetUnit) {
    const idx = BYTE_UNITS.indexOf(targetUnit);
    const divisor = Math.pow(base, idx);
    const val = bytes / divisor;
    const str = pad && val < 10 ? val.toFixed(decimals) : val.toFixed(decimals);
    return `${parseFloat(str)}${space ? " " : ""}${targetUnit}`;
  }

  if (bytes === 0) return `0${space ? " " : ""}B`;

  const idx = Math.floor(Math.log(bytes) / Math.log(base));
  const unitIdx = Math.min(idx, BYTE_UNITS.length - 1);
  const unit = BYTE_UNITS[unitIdx];
  const val = bytes / Math.pow(base, unitIdx);

  const str = val < 10 ? val.toFixed(decimals) : val.toFixed(Math.max(0, decimals - 1));
  return `${parseFloat(str)}${space ? " " : ""}${unit}`;
}

/** Parse a byte string back to number. e.g., "1.5 MB" → 1572864 */
export function parseBytes(str: string, base = 1024): number {
  const match = String(str).trim().match(/^([\d.]+)\s*([A-Z]*)$/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = (match[2] || "B").toUpperCase() as ByteUnit;
  const idx = BYTE_UNITS.indexOf(unit);
  return val * Math.pow(base, idx);
}

// --- Compact / Abbreviated Numbers ---

const COMPACT_SUFFIXES_SHORT: Record<number, string> = {
  3: "K", 6: "M", 9: "B", 12: "T", 15: "Qa", 18: "Qi",
};

const COMPACT_SUFFIXES_LONG: Record<number, string> = {
  3: "thousand", 6: "million", 9: "billion", 12: "trillion",
  15: "quadrillion", 18: "quintillion",
};

/**
 * Format large numbers in compact/abbreviated form (K, M, B, T).
 *
 * @example
 * ```ts
 * formatCompact(1500);           // "1.5K"
 * formatCompact(2500000);        // "2.5M"
 * formatCompact(999999);         // "1M"
 * formatCompact(850, { display: "long" }); // "850 thousand"
 * ```
 */
export function formatCompact(value: number, options: FormatCompactOptions = {}): string {
  const {
    maxPrecision = 1,
    display = "short",
    locale = "en-US",
    customSuffixes,
  } = options;

  const absVal = Math.abs(value);

  if (absVal < 1000) {
    return formatNumber(value, { locale, maximumFractionDigits: maxPrecision });
  }

  const tier = Math.floor(Math.log10(absVal));
  const magnitude = Math.floor(tier / 3) * 3;

  const suffixes = customSuffixes ?? (display === "short" ? COMPACT_SUFFIXES_SHORT : COMPACT_SUFFIXES_LONG);
  const suffix = suffixes[magnitude] ?? `e+${magnitude}`;

  const scaled = value / Math.pow(10, magnitude);
  const formatted = scaled.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxPrecision,
  });

  return display === "long" ? `${formatted} ${suffix}` : `${formatted}${suffix}`;
}

// --- Ordinal Suffixes ---

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, 4th...).
 *
 * @example
 * ```ts
 * getOrdinalSuffix(1);   // "1st"
 * getOrdinalSuffix(22);  // "22nd"
 * getOrdinalSuffix(113); // "113th"
 * ```
 */
export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/**
 * Format a number with its ordinal suffix.
 */
export function formatOrdinal(n: number): string {
  return getOrdinalSuffix(n);
}

// --- Number Parsing ---

/**
 * Parse a string back to a number, handling locale-specific formats.
 *
 * @example
 * ```ts
 * parseNumber("1,234.56");     // 1234.56
 * parseNumber("1.234,56", { locale: "de-DE" }); // 1234.56
 * parseNumber("$1,234");       // 1234
 * ```
 */
export function parseNumber(str: string, options: ParseNumberOptions = {}): number {
  const {
    localeAware = true,
    locale = "en-US",
    returnNaN = false,
    allowTrailing = false,
  } = options;

  let cleaned = str.trim();

  // Strip currency symbols and whitespace
  cleaned = cleaned.replace(/[$\u20ac\u00a3\u00a5\u20a9\u20b9\u20bd]/g, "");
  cleaned = cleaned.replace(/\s/g, "");

  if (!allowTrailing) {
    cleaned = cleaned.replace(/[^\d.,\-+eE]/g, "");
  }

  if (cleaned === "" || cleaned === "-") {
    if (returnNaN) return NaN;
    throw new Error(`Cannot parse "${str}" as number`);
  }

  if (!localeAware) {
    const result = parseFloat(cleaned.replace(/,/g, ""));
    if (returnNaN || !isNaN(result)) return result;
    throw new Error(`Cannot parse "${str}" as number`);
  }

  // Detect separator style from locale
  const formatted = new Intl.NumberFormat(locale).format(1.1);
  const hasCommaDecimal = formatted.includes(",");

  if (hasCommaDecimal) {
    // European: comma = decimal, dot = thousands (or no thousands sep)
    cleaned = cleaned.replace(/\./g, "");
    cleaned = cleaned.replace(",", ".");
  } else {
    // English: dot = decimal, comma = thousands
    cleaned = cleaned.replace(/,/g, "");
  }

  const result = parseFloat(cleaned);
  if (!isNaN(result)) return result;

  if (returnNaN) return NaN;
  throw new Error(`Cannot parse "${str}" as number`);
}

// --- Rounding Helpers ---

/**
 * Round a number to specified decimal places using banker's rounding (round half to even).
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Round up to nearest increment.
 *
 * @example
 * ```ts
 * roundUpTo(17, 5);   // 20
 * roundUpTo(20, 5);   // 20
 * roundUpTo(0.33, 0.1); // 0.4
 * ```
 */
export function roundUpTo(value: number, increment: number): number {
  return Math.ceil(value / increment) * increment;
}

/**
 * Round down to nearest increment.
 */
export function roundDownTo(value: number, increment: number): number {
  return Math.floor(value / increment) * increment;
}

/**
 * Round to nearest increment.
 */
export function roundNearest(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

// --- Range Formatting ---

/**
 * Format a numeric range as a human-readable string.
 *
 * @example
 * ```ts
 * formatRange(10, 20);          // "10 \u2013 20"
 * formatRange(1000, 2000, { compact: true }); // "1K \u2013 2K"
 * formatRange(10, 20, { prefix: "$", suffix: "/mo" }); // "$10 \u2013 $20/mo"
 * ```
 */
export function formatRange(min: number, max: number, options: { compact?: boolean; prefix?: string; suffix?: string; decimals?: number } = {}): string {
  const { compact = false, prefix = "", suffix = "", decimals = 0 } = options;

  const fmt = (v: number) =>
    compact ? formatCompact(v, { maxPrecision: decimals }) : v.toLocaleString("en-US", { maximumFractionDigits: decimals });

  return `${prefix}${fmt(min)}${suffix} \u2013 ${prefix}${fmt(max)}${suffix}`;
}

// --- Delta / Change Formatting ---

/**
 * Format a change/delta value with sign indicator and optional color hint.
 *
 * @example
 * ```ts
 * formatDelta(0.125);       // "+12.5%"
 * formatDelta(-0.05);       // "-5%"
 * formatDelta(0, 2);        // "0.00%"
 * formatDelta(300, 0, "absolute"); // "+300"
 * ```
 */
export function formatDelta(
  value: number,
  decimals = 1,
  mode: "percent" | "absolute" = "percent",
): string {
  const sign = value > 0 ? "+" : "";
  if (mode === "absolute") {
    return `${sign}${roundTo(value, decimals).toLocaleString()}`;
  }
  return `${sign}${formatPercent(Math.abs(value), decimals)}`;
}

/** Determine direction of a delta: "up", "down", or "neutral". */
export function getDeltaDirection(value: number): "up" | "down" | "neutral" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "neutral";
}

// --- Separator Utilities ---

/**
 * Add thousand separators to a number string.
 *
 * @example
 * ```ts
 * addThousandSeparators("1234567"); // "1,234,567"
 * addThousandSeparators("1234567", "."); // "1.234.567"
 * ```
 */
export function addThousandSeparators(numStr: string, sep = ","): string {
  const parts = numStr.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return parts.join(".");
}

/**
 * Remove all non-numeric characters except decimal point and minus.
 */
export function stripNumberFormat(str: string): string {
  return str.replace(/[^\d.\-]/g, "");
}

// --- Number Classifiers ---

/** Check if a value is a valid finite number. */
export function isNumeric(value: unknown): value is number {
  return typeof value === "number" && isFinite(value) && !isNaN(value);
}

/** Check if an integer is even. */
export function isEven(n: number): boolean {
  return n % 2 === 0;
}

/** Check if an integer is odd. */
export function isOdd(n: number): boolean {
  return n % 2 !== 0;
}

/** Check if a number is within range [min, max]. */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/** Clamp a number to a range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Get the sign of a number: 1, -1, or 0. */
export function sign(value: number): 1 | -1 | 0 {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

// --- Random Number Utilities ---

/**
 * Generate a random integer in [min, max] (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float in [min, max).
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Generate a random ID string of given length using alphanumeric chars.
 */
export function randomId(length = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomInt(0, chars.length - 1));
  }
  return result;
}

// --- Statistics Helpers ---

/** Calculate mean of an array of numbers. */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Calculate median of an array of numbers. */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Calculate standard deviation. */
export function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const squareDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(mean(squareDiffs));
}

/** Calculate percentile of a value within an array. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (idx - lower) * (sorted[upper]! - sorted[lower]!);
}
