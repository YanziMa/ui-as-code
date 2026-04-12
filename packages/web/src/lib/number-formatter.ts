/**
 * Number Formatter: Comprehensive number formatting, localization, and
 * unit conversion library. Supports compact notation (K/M/B/T),
 * currency formatting with symbol placement, percentage formatting,
 * unit conversion (length/weight/volume/data), ordinal suffixes,
 * numeral systems (Roman, scientific), and Intl.NumberFormat wrappers.
 */

// --- Types ---

export type CompactStyle = "short" | "long";
export type CurrencyDisplay = "symbol" | "code" | "name" | "narrowSymbol";
export type NotationStyle = "standard" | "scientific" | "engineering" | "compact";
export type RoundingMode = "ceil" | "floor" | "round" | "trunc";

export interface FormatNumberOptions {
  /** Locale(s) to use (default: browser locale) */
  locale?: string | string[];
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Minimum integer digits */
  minimumIntegerDigits?: number;
  /** Use grouping separators? (default: true) */
  useGrouping?: boolean;
  /** Notation style */
  notation?: NotationStyle;
  /** Compact display style (for compact notation) */
  compactDisplay?: CompactStyle;
  /** Sign display */
  signDisplay?: "auto" | "always" | "exceptZero" | "never";
  /** Rounding mode */
  roundingMode?: RoundingMode;
  /** Custom prefix string */
  prefix?: string;
  /** Custom suffix string */
  suffix?: string;
  /** Show as currency? */
  currency?: string;
  /** How to display currency */
  currencyDisplay?: CurrencyDisplay;
  /** Show as percentage? */
  style?: "decimal" | "currency" | "percent" | "unit";
  /** Unit for unit style */
  unit?: string;
  /** Unit display mode */
  unitDisplay?: "long" | "short" | "narrow";
}

export interface CurrencyFormatOptions extends Omit<FormatNumberOptions, "style" | "currency"> {
  /** ISO 4217 currency code (e.g., "USD", "CNY") */
  currency: string;
  /** Symbol position: "before" or "after" (overrides currencyDisplay for manual control) */
  symbolPosition?: "before" | "after";
}

export interface UnitConversion {
  value: number;
  unit: string;
  /** Original value before conversion */
  originalValue: number;
  /** Original unit */
  originalUnit: string;
}

// --- Core Formatter ---

export class NumberFormatter {
  private defaultLocale: string;
  private cache = new Map<string, Intl.NumberFormat>();

  constructor(defaultLocale?: string) {
    this.defaultLocale = defaultLocale ??
      (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : "en-US");
  }

  /** Format a number with full options */
  format(value: number | bigint, options: FormatNumberOptions = {}): string {
    const opts = this.resolveOptions(options);
    const cacheKey = JSON.stringify({ locale: opts.locale, ...opts });
    let formatter = this.cache.get(cacheKey);

    if (!formatter) {
      try {
        formatter = new Intl.NumberFormat(opts.locale, opts as Intl.NumberFormatOptions);
      } catch {
        formatter = new Intl.NumberFormat("en-US");
      }
      this.cache.set(cacheKey, formatter);
    }

    let result = formatter.format(value);

    if (options.prefix) result = options.prefix + result;
    if (options.suffix) result = result + options.suffix;

    return result;
  }

  /** Format as currency */
  formatCurrency(value: number, options: CurrencyFormatOptions): string {
    if (options.symbolPosition) {
      // Manual symbol positioning
      const numPart = this.format(value, {
        ...options,
        style: "decimal",
        currency: undefined,
        currencyDisplay: undefined,
      });
      const symbol = getCurrencySymbol(options.currency);
      return options.symbolPosition === "after"
        ? `${numPart} ${symbol}`
        : `${symbol}${numPart}`;
    }

    return this.format(value, {
      ...options,
      style: "currency",
    });
  }

  /** Format as percentage */
  formatPercent(value: number, options: Omit<FormatNumberOptions, "style"> = {}): string {
    return this.format(value, { ...options, style: "percent" });
  }

  /** Format with compact notation (1.2K, 3.5M, etc.) */
  formatCompact(value: number, options: Omit<FormatNumberOptions, "notation"> = {}): string {
    return this.format(value, { ...options, notation: "compact" });
  }

  /** Format with custom compact suffixes (beyond what Intl supports) */
  formatCompactCustom(
    value: number,
    suffixes: [string, string, string, string, string] = ["", "K", "M", "B", "T"],
    decimals: number = 1,
  ): string {
    if (Math.abs(value) < 1000) return this.roundTo(value, decimals).toString();

    const tier = Math.floor(Math.log10(Math.abs(value)) / 3);
    if (tier >= suffixes.length) return this.formatScientific(value);

    const scaled = value / Math.pow(1000, tier);
    return `${this.roundTo(scaled, decimals)}${suffixes[tier]!}`;
  }

  /** Format as scientific notation */
  formatScientific(value: number, precision: number = 2): string {
    if (value === 0) return "0";
    const exp = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exp);
    return `${this.roundTo(mantissa, precision)}e${exp >= 0 ? "+" : ""}${exp}`;
  }

  /** Format as ordinal (1st, 2nd, 3rd, 4th, ...) */
  formatOrdinal(n: number): string {
    const absN = Math.abs(Math.round(n));
    const suffix = getOrdinalSuffix(absN);
    return `${n}${suffix}`;
  }

  /** Format as Roman numeral (1-3999) */
  formatRoman(num: number): string {
    const n = Math.round(num);
    if (n < 1 || n > 3999) return String(n);

    const ROMAN_MAP: [number, string][] = [
      [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
      [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
      [10, "X"], [9, "IX"], [5, "V"], [4, "IV"],
      [1, "I"],
    ];

    let result = "";
    let remaining = n;
    for (const [val, sym] of ROMAN_MAP) {
      while (remaining >= val) {
        result += sym;
        remaining -= val;
      }
    }
    return result;
  }

  /** Format as file size (bytes → KB/MB/GB/TB) */
  formatFileSize(bytes: number, binary: boolean = false): string {
    if (bytes === 0) return "0 B";

    const base = binary ? 1024 : 1000;
    const units = binary
      ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
      : ["B", "KB", "MB", "GB", "TB", "PB"];

    const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    const size = bytes / Math.pow(base, exp);

    return exp === 0
      ? `${bytes} ${units[0]}`
      : `${this.roundTo(size, exp > 0 ? 1 : 0)} ${units[exp]}`;
  }

  /** Format with significant digits */
  formatSignificant(value: number, sigDigits: number = 3): string {
    if (value === 0) return "0";
    const magnitude = Math.floor(Math.log10(Math.abs(value)));
    const scale = Math.pow(10, sigDigits - 1 - magnitude);
    return String(this.roundTo(value * scale) / scale);
  }

  /** Parse a formatted string back to number */
  parse(formatted: string, locale?: string): number {
    const loc = locale ?? this.defaultLocale;

    // Remove common formatting characters
    const cleaned = formatted
      .replace(new RegExp(`\\${getGroupingSeparator(loc)}`, "g"), "")
      .replace(getDecimalSeparator(loc), ".");

    // Remove currency symbols, percent signs, etc.
    const numeric = cleaned.replace(/[^\d.\-+eE]/g, "");

    const parsed = parseFloat(numeric);
    return isNaN(parsed) ? 0 : parsed;
  }

  /** Clear the formatter cache */
  clearCache(): void {
    this.cache.clear();
  }

  // --- Internal ---

  private resolveOptions(options: FormatNumberOptions): Record<string, unknown> {
    return {
      locale: options.locale ?? this.defaultLocale,
      minimumFractionDigits: options.minimumFractionDigits,
      maximumFractionDigits: options.maximumFractionDigits,
      minimumIntegerDigits: options.minimumIntegerDigits,
      useGrouping: options.useGrouping ?? true,
      notation: options.notation ?? "standard",
      compactDisplay: options.compactDisplay ?? "short",
      signDisplay: options.signDisplay,
      roundingMode: options.roundingMode,
      style: options.style ?? "decimal",
      currency: options.currency,
      currencyDisplay: options.currencyDisplay,
      unit: options.unit,
      unitDisplay: options.unitDisplay,
    };
  }

  private roundTo(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    switch (this.options?.roundingMode ?? "round") {
      case "ceil": return Math.ceil(value * factor) / factor;
      case "floor": return Math.floor(value * factor) / factor;
      case "trunc": return Math.trunc(value * factor) / factor;
      default: return Math.round(value * factor) / factor;
    }
  }

  private options?: { roundingMode?: RoundingMode };
}

// --- Standalone Utilities ---

/** Quick format using browser defaults */
export function formatNumber(value: number, options?: FormatNumberOptions): string {
  return new NumberFormatter().format(value, options);
}

/** Quick compact format (1.2K, 3.5M) */
export function formatCompact(value: number, maxDecimals: number = 1): string {
  return new NumberFormatter().formatCompactCustom(value, undefined, maxDecimals);
}

/** Quick file size format */
export function formatBytes(bytes: number, binary: boolean = false): string {
  return new NumberFormatter().formatFileSize(bytes, binary);
}

/** Quick ordinal format */
export function formatOrdinal(n: number): string {
  return new NumberFormatter().formatOrdinal(n);
}

/** Quick Roman numeral conversion */
export function toRomanNumeral(n: number): string {
  return new NumberFormatter().formatRoman(n);
}

/** Quick scientific notation */
export function toScientific(value: number, precision: number = 2): string {
  return new NumberFormatter().formatScientific(value, precision);
}

// --- Unit Conversion ---

export interface ConversionTable {
  [unit: string]: { factor: number; offset?: number };
}

/** Length conversions */
export const LENGTH_UNITS: ConversionTable = {
  mm: { factor: 0.001 },
  cm: { factor: 0.01 },
  m: { factor: 1 },
  km: { factor: 1000 },
  in: { factor: 0.0254 },
  ft: { factor: 0.3048 },
  yd: { factor: 0.9144 },
  mi: { factor: 1609.344 },
};

/** Weight/mass conversions */
export const WEIGHT_UNITS: ConversionTable = {
  mg: { factor: 0.000001 },
  g: { factor: 0.001 },
  kg: { factor: 1 },
  t: { factor: 1000 },
  oz: { factor: 0.0283495 },
  lb: { factor: 0.453592 },
};

/** Volume conversions */
export const VOLUME_UNITS: ConversionTable = {
  ml: { factor: 0.001 },
  l: { factor: 1 },
  gal: { factor: 3.78541 },
  cup: { factor: 0.236588 },
  fl_oz: { factor: 0.0295735 },
};

/** Data size conversions */
export const DATA_UNITS: ConversionTable = {
  b: { factor: 1 },
  kb: { factor: 1024 },
  mb: { factor: 1024 * 1024 },
  gb: { factor: 1024 * 1024 * 1024 },
  tb: { factor: 1024 * 1024 * 1024 * 1024 },
};

/** Temperature conversions (with offset) */
export const TEMP_UNITS: ConversionTable = {
  C: { factor: 1, offset: 0 },
  F: { factor: 1.8, offset: 32 },
  K: { factor: 1, offset: 273.15 },
};

/** Convert between units within a category */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
  table: ConversionTable,
): UnitConversion {
  const from = table[fromUnit];
  const to = table[toUnit];

  if (!from || !to) {
    throw new Error(`Unknown unit: "${fromUnit}" or "${toUnit}"`);
  }

  // Convert to base unit, then to target
  const baseValue = (value + (from.offset ?? 0)) * from.factor;
  const result = (baseValue / to.factor) - (to.offset ?? 0);

  return {
    value: result,
    unit: toUnit,
    originalValue: value,
    originalUnit: fromUnit,
  };
}

/** Auto-detect unit category and convert */
export function smartConvert(
  value: number,
  fromUnit: string,
  toUnit: string,
): UnitConversion {
  const normalizedFrom = fromUnit.toLowerCase();
  const normalizedTo = toUnit.toLowerCase();

  // Try each table
  const tables: [ConversionTable, string][] = [
    [LENGTH_UNITS, "length"],
    [WEIGHT_UNITS, "weight"],
    [VOLUME_UNITS, "volume"],
    [DATA_UNITS, "data"],
    [TEMP_UNITS, "temperature"],
  ];

  for (const [table, name] of tables) {
    if (normalizedFrom in table && normalizedTo in table) {
      return convertUnit(value, normalizedFrom, normalizedTo, table);
    }
  }

  throw new Error(`Cannot convert "${fromUnit}" to "${toUnit}" — incompatible or unknown units`);
}

// --- Helpers ---

function getOrdinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function getCurrencySymbol(code: string): string {
  const symbols: Record<string, string> = {
    USD: "$", EUR: "\u20ac", GBP: "\u00a3", JPY: "\u00a5",
    CNY: "\u00a5", KRW: "\u20a9", INR: "\u20b9", RUB: "\u20bd",
    BRL: "R$", CAD: "$", AUD: "$", CHF: "CHF", SEK: "kr",
    NOK: "kr", DKK: "kr", PLN: "z\u0142", MXN: "$", SGD: "$",
    HKD: "$", TWD: "$", THB: "\u0e3f", ZAR: "R", TRY: "\u20ba",
  };
  return symbols[code.toUpperCase()] ?? code;
}

function getGroupingSeparator(locale: string): string {
  try {
    const n = 1000.1;
    const parts = n.toLocaleString(locale);
    return parts[1] ?? ",";
  } catch {
    return ",";
  }
}

function getDecimalSeparator(locale: string): string {
  try {
    const n = 1.1;
    const parts = n.toLocaleString(locale);
    return parts[1] ?? ".";
  } catch {
    return ".";
  }
}
