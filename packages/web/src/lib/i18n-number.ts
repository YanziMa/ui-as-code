/**
 * i18n Number: Internationalized number, currency, date/time, percent,
 * relative-time, list, unit, and measurement formatting with locale
 * awareness, compact notation, custom patterns, plural rules, and
 * measurement system (metric/imperial) support.
 */

// --- Types ---

export type NumberFormatStyle = "decimal" | "currency" | "percent" | "unit" | "compact"
  | "scientific" | "engineering";

export type CurrencyDisplay = "symbol" | "code" | "narrowSymbol" | "name";

export type CompactDisplay = "short" | "long";

export type Notation = "standard" | "scientific" | "engineering" | "compact";

export type SignDisplay = "auto" | "always" | "exceptZero" | "never";

export type RoundingMode = "ceil" | "floor" | "expand" | "trunc" | "halfCeil"
  | "halfFloor" | "halfEven" | "halfExpand" | "halfTrunc";

export type RelativeTimeUnit = "year" | "quarter" | "month" | "week" | "day"
  | "hour" | "minute" | "second";

export type ListType = "conjunction" | "disjunction" | "unit";

export type MeasurementSystem = "metric" | "imperial" | "us";

export interface NumberFormatOptions {
  /** Locale string(s), e.g. "en-US", "zh-CN", ["en-US", "zh"] */
  locale?: string | string[];
  /** Format style */
  style?: NumberFormatStyle;
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Minimum significant digits */
  minimumSignificantDigits?: number;
  /** Maximum significant digits */
  maximumSignificantDigits?: number;
  /** Use grouping separators */
  useGrouping?: boolean;
  /** Currency code for currency style (e.g. "USD", "CNY") */
  currency?: string;
  /** How to display the currency symbol */
  currencyDisplay?: CurrencyDisplay;
  /** Compact display mode */
  compactDisplay?: CompactDisplay;
  /** Notation style */
  notation?: Notation;
  /** When to show sign */
  signDisplay?: SignDisplay;
  /** Rounding mode */
  roundingMode?: RoundingMode;
  /** Custom pattern override (e.g. "#,##0.00") */
  pattern?: string;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  decimalDigits: number;
  symbolPosition: "before" | "after";
  spaceBetween?: boolean;
}

export interface RelativeTimeOptions {
  locale?: string | string[];
  /** Numeric vs string style ("always", "auto") */
  numeric?: "always" | "auto";
  /** Unit to use if value < threshold */
  style?: "long" | "short" | "narrow";
}

export interface ListFormatOptions {
  locale?: string | string[];
  type?: ListType;
  style?: "long" | "short" | "narrow";
}

export interface UnitConversion {
  from: string;   // e.g. "km"
  to: string;     // e.g. "mi"
  factor: number; // multiplier
  offset?: number; // additive offset (for temperature)
}

export interface MeasurementFormatOptions {
  system?: MeasurementSystem;
  locale?: string | string[];
  /** Target unit (auto-converts if needed) */
  targetUnit?: string;
}

// --- Currency Data ---

const CURRENCY_DATA: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar", decimalDigits: 2, symbolPosition: "before" },
  EUR: { code: "EUR", symbol: "\u20AC", name: "Euro", decimalDigits: 2, symbolPosition: "before" },
  GBP: { code: "GBP", symbol: "\u00A3", name: "British Pound", decimalDigits: 2, symbolPosition: "before" },
  JPY: { code: "JPY", symbol: "\u00A5", name: "Japanese Yen", decimalDigits: 0, symbolPosition: "before" },
  CNY: { code: "CNY", symbol: "\u00A5", name: "Chinese Yuan", decimalDigits: 2, symbolPosition: "before" },
  KRW: { code: "KRW", symbol: "\u20A9", name: "South Korean Won", decimalDigits: 0, symbolPosition: "before" },
  INR: { code: "INR", symbol: "\u20B9", name: "Indian Rupee", decimalDigits: 2, symbolPosition: "before" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real", decimalDigits: 2, symbolPosition: "before" },
  CAD: { code: "CAD", symbol: "$", name: "Canadian Dollar", decimalDigits: 2, symbolPosition: "before" },
  AUD: { code: "AUD", symbol: "$", name: "Australian Dollar", decimalDigits: 2, symbolPosition: "before" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", decimalDigits: 2, symbolPosition: "after", spaceBetween: true },
  SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona", decimalDigits: 2, symbolPosition: "after", spaceBetween: true },
  NOK: { code: "NOK", symbol: "kr", name: "Norwegian Krone", decimalDigits: 2, symbolPosition: "after", spaceBetween: true },
  DKK: { code: "DKK", symbol: "kr", name: "Danish Krone", decimalDigits: 2, symbolPosition: "after", spaceBetween: true },
  TWD: { code: "TWD", symbol: "NT$", name: "Taiwan Dollar", decimalDigits: 2, symbolPosition: "before" },
  HKD: { code: "HKD", symbol: "$", name: "Hong Kong Dollar", decimalDigits: 2, symbolPosition: "before" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar", decimalDigits: 2, symbolPosition: "before" },
  MXN: { code: "MXN", symbol: "$", name: "Mexican Peso", decimalDigits: 2, symbolPosition: "before" },
  RUB: { code: "RUB", symbol: "\u20BD", name: "Russian Ruble", decimalDigits: 2, symbolPosition: "before" },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand", decimalDigits: 2, symbolPosition: "before" },
  TRY: { code: "TRY", symbol: "\u20BA", name: "Turkish Lira", decimalDigits: 2, symbolPosition: "before" },
};

// --- Unit Conversion Table ---

const UNIT_CONVERSIONS: UnitConversion[] = [
  // Length
  { from: "km", to: "mi", factor: 0.621371 },
  { from: "mi", to: "km", factor: 1.609344 },
  { from: "m", to: "ft", factor: 3.28084 },
  { from: "ft", to: "m", factor: 0.3048 },
  { from: "cm", to: "in", factor: 0.393701 },
  { from: "in", to: "cm", factor: 2.54 },
  // Weight
  { from: "kg", to: "lb", factor: 2.20462 },
  { from: "lb", to: "kg", factor: 0.453592 },
  { from: "g", to: "oz", factor: 0.035274 },
  { from: "oz", to: "g", factor: 28.3495 },
  // Temperature
  { from: "celsius", to: "fahrenheit", factor: 1.8, offset: 32 },
  { from: "fahrenheit", to: "celsius", factor: 5 / 9, offset: -32 * 5 / 9 },
  // Volume
  { from: "l", to: "gal", factor: 0.264172 },
  { from: "gal", to: "l", factor: 3.78541 },
  { from: "ml", to: "fl oz", factor: 0.033814 },
  { from: "fl oz", to: "ml", factor: 29.5735 },
  // Speed
  { from: "km/h", to: "mph", factor: 0.621371 },
  { from: "mph", to: "km/h", factor: 1.609344 },
  // Area
  { from: "sq km", to: "sq mi", factor: 0.386102 },
  { from: "sq mi", to: "sq km", factor: 2.58999 },
];

// --- Relative Time Templates ---

const RELATIVE_TIME_TEMPLATES: Record<string, Record<RelativeTimeUnit, Record<number, string>>> = {
  en: {
    year:   { [-1]: "{value} year ago",  [-2]: "{value} years ago", 1: "in {value} year",  2: "in {value} years" },
    quarter:{ [-1]: "{value} quarter ago",[-2]: "{value} quarters ago",1:"in {value} quarter",2:"in {value} quarters"},
    month:  { [-1]: "{value} month ago",  [-2]: "{value} months ago", 1: "in {value} month",  2: "in {value} months" },
    week:   { [-1]: "{value} week ago",   [-2]: "{value} weeks ago",   1: "in {value} week",   2: "in {value} weeks" },
    day:    { [-1]: "{value} day ago",    [-2]: "{value} days ago",    1: "in {value} day",    2: "in {value} days" },
    hour:   { [-1]: "{value} hour ago",   [-2]: "{value} hours ago",   1: "in {value} hour",   2: "in {value} hours" },
    minute: { [-1]: "{value} minute ago",[-2]: "{value} minutes ago", 1:"in {value} minute",2:"in {value} minutes"},
    second: { [-1]: "{value} second ago",[-2]: "{value} seconds ago", 1:"in {value} second",2:"in {value} seconds"},
  },
  zh: {
    year:   { [-1]: "{value}\u5E74\u524D",    [-2]: "{value}\u5E74\u524D",     1: "{value}\u5E74\u540E",      2: "{value}\u5E74\u540E" },
    quarter:{ [-1]: "{value}\u5B63\u5EA6\u524D",[-2]: "{value}\u5B63\u5EA6\u524D", 1: "{value}\u5B63\u5EA6\u540E", 2: "{value}\u5B63\u5EA6\u540E" },
    month:  { [-1]: "{value}\u4E2A\u6708\u524D",[-2]: "{value}\u4E2A\u6708\u524D", 1: "{value}\u4E2A\u6708\u540E", 2: "{value}\u4E2A\u6708\u540E" },
    week:   { [-1]: "{value}\u5468\u524D",    [-2]: "{value}\u5468\u524D",     1: "{value}\u5468\u540E",      2: "{value}\u5468\u540E" },
    day:    { [-1]: "{value}\u5929\u524D",    [-2]: "{value}\u5929\u524D",     1: "{value}\u5929\u540E",      2: "{value}\u5929\u540E" },
    hour:   { [-1]: "{value}\u5C0F\u65F6\u524D",[-2]: "{value}\u5C0F\u65F6\u524D", 1: "{value}\u5C0F\u65F6\u540E", 2: "{value}\u5C0F\u65F6\u540E" },
    minute: { [-1]: "{value}\u5206\u949F\u524D",[-2]: "{value}\u5206\u949F\u524D", 1: "{value}\u5206\u949F\u540E", 2: "{value}\u5206\u949F\u540E" },
    second: { [-1]: "{value}\u79D2\u524D",    [-2]: "{value}\u79D2\u524D",     1: "{value}\u79D2\u540E",      2: "{value}\u79D2\u540E" },
  },
};

// --- Main Formatter Class ---

/**
 * Internationalized formatter for numbers, currencies, dates, percents,
 * relative times, lists, units, and measurements.
 *
 * ```ts
 * const fmt = new I18nNumber({ locale: "zh-CN" });
 *
 * fmt.format(1234.5678);           // "1,234.57"
 * fmt.currency(99.99, "USD");      // "$99.99"
 * fmt.percent(0.856);              // "85.6%"
 * fmt.compact(1500000);            // "1.5M"
 * fmt.relativeTime(-30, "minute");  // "30分钟前"
 * fmt.list(["a", "b", "c"]);       // "a、b 和 c"
 * ```
 */
export class I18nNumber {
  private defaultLocale: string;
  private fallbackLocale = "en";
  private numberCache = new Map<string, Intl.NumberFormat>();
  private dateCache = new Map<string, Intl.DateTimeFormat>();

  constructor(options: NumberFormatOptions = {}) {
    this.defaultLocale = Array.isArray(options.locale)
      ? options.locale[0] ?? "en"
      : options.locale ?? "en";
  }

  // --- Number Formatting ---

  /**
   * Format a number with locale-aware grouping and decimals.
   */
  format(value: number, options?: Partial<NumberFormatOptions>): string {
    const opts = { ...{ locale: this.defaultLocale }, ...options };
    const key = JSON.stringify(opts);

    let nf = this.numberCache.get(key);
    if (!nf) {
      nf = new Intl.NumberFormat(opts.locale ?? this.defaultLocale, {
        minimumFractionDigits: opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits,
        useGrouping: opts.useGrouping ?? true,
        notation: opts.notation,
        compactDisplay: opts.compactDisplay,
        signDisplay: opts.signDisplay,
      });
      this.numberCache.set(key, nf);
    }

    return nf.format(value);
  }

  /**
   * Format as currency with automatic symbol placement.
   */
  currency(value: number, code: string, options?: Partial<NumberFormatOptions>): string {
    const info = CURRENCY_DATA[code];
    if (!info) {
      // Fallback to Intl
      try {
        return new Intl.NumberFormat(options?.locale ?? this.defaultLocale, {
          style: "currency",
          currency: code,
          currencyDisplay: options?.currencyDisplay ?? "symbol",
        }).format(value);
      } catch {
        return `${code} ${value}`;
      }
    }

    const formatted = this.format(value, {
      ...options,
      minimumFractionDigits: options?.minimumFractionDigits ?? info.decimalDigits,
      maximumFractionDigits: options?.maximumFractionDigits ?? info.decimalDigits,
    });

    if (info.symbolPosition === "before") {
      return `${info.symbol}${info.spaceBetween ? " " : ""}${formatted}`;
    } else {
      return `${formatted}${info.spaceBetween ? " " : ""}${info.symbol}`;
    }
  }

  /**
   * Format as percentage.
   */
  percent(value: number, decimals = 1): string {
    return this.format(value * 100, {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }) + "%";
  }

  /**
   * Format in compact notation (1.2K, 3.4M, etc.)
   */
  compact(value: number, display: CompactDisplay = "short"): string {
    return this.format(value, {
      notation: "compact",
      compactDisplay: display,
    });
  }

  /**
   * Format in scientific notation.
   */
  scientific(value: number, digits = 3): string {
    return this.format(value, {
      notation: "scientific",
      maximumSignificantDigits: digits,
    });
  }

  /**
   * Format in engineering notation (exponent multiple of 3).
   */
  engineering(value: number, digits = 3): string {
    if (value === 0) return "0";
    const exp = Math.floor(Math.log10(Math.abs(value)) / 3) * 3;
    const mantissa = value / Math.pow(10, exp);
    return this.format(mantissa, {
      maximumSignificantDigits: digits,
    }) + "e" + exp;
  }

  /**
   * Parse a localized number string back to a number.
   */
  parse(input: string): number | null {
    // Remove grouping separators and replace decimal separator
    const cleaned = input
      .replace(/\s/g, "")
      .replace(/,/g, "")
      .replace(/\./g, ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // --- Date/Time Formatting ---

  /**
   * Format a date with locale-aware output.
   */
  formatDate(date: Date | number | string, formatType: "full" | "long" | "medium" | "short" | "custom" = "medium", customPattern?: string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid Date";

    if (formatType === "custom" && customPattern) {
      return this.applyDatePattern(d, customPattern);
    }

    const formats: Record<string, Intl.DateTimeFormatOptions> = {
      full: { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric" },
      medium: { year: "numeric", month: "short", day: "numeric" },
      short: { year: "2-digit", month: "2-digit", day: "2-digit" },
    };

    return new Intl.DateTimeFormat(this.defaultLocale, formats[formatType]).format(d);
  }

  /**
   * Format time portion only.
   */
  formatTime(date: Date | number | string, includeSeconds = false): string {
    const d = new Date(date);
    const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "numeric" };
    if (includeSeconds) opts.second = "numeric";
    return new Intl.DateTimeFormat(this.defaultLocale, opts).format(d);
  }

  /**
   * Format as relative time (e.g., "3 days ago").
   */
  relativeTime(diffMs: number, unit: RelativeTimeUnit = "second", options?: RelativeTimeOptions): string {
    const locale = (Array.isArray(options?.locale) ? options?.locale[0] : options?.locale) ?? this.defaultLocale;

    // Try Intl.RelativeTimeFormat first (modern browsers)
    if (typeof Intl !== "undefined" && "RelativeTimeFormat" in Intl) {
      try {
        const rtf = new Intl.RelativeTimeFormat(locale, {
          numeric: options?.numeric ?? "auto",
          style: options?.style ?? "long",
        });

        // Convert ms to appropriate unit
        const conversions: Record<RelativeTimeUnit, number> = {
          year: 365.25 * 24 * 60 * 60 * 1000,
          quarter: 91.3125 * 24 * 60 * 60 * 1000,
          month: 30.44 * 24 * 60 * 60 * 1000,
          week: 7 * 24 * 60 * 60 * 1000,
          day: 24 * 60 * 60 * 1000,
          hour: 60 * 60 * 1000,
          minute: 60 * 1000,
          second: 1000,
        };

        const value = diffMs / conversions[unit];
        return rtf.format(Math.round(value), unit);
      } catch {
        // Fall through to template-based
      }
    }

    // Template-based fallback
    return this.formatRelativeTemplate(diffMs, unit, locale);
  }

  /**
   * Get human-readable time difference between two dates.
   */
  timeAgo(date: Date | number | string, now?: Date): string {
    const d = new Date(date);
    const n = now ?? new Date();
    const diffMs = d.getTime() - n.getTime();
    const absDiff = Math.abs(diffMs);

    // Pick best unit
    const thresholds: [number, RelativeTimeUnit][] = [
      [365.25 * 24 * 60 * 60 * 1000, "year"],
      [30.44 * 24 * 60 * 60 * 1000, "month"],
      [7 * 24 * 60 * 60 * 1000, "week"],
      [24 * 60 * 60 * 1000, "day"],
      [60 * 60 * 1000, "hour"],
      [60 * 1000, "minute"],
      [1000, "second"],
    ];

    for (const [threshold, unit] of thresholds) {
      if (absDiff >= threshold || unit === "second") {
        const value = Math.round(absDiff / threshold);
        return this.relativeTime(diffMs > 0 ? value : -value, unit);
      }
    }

    return this.relativeTime(0, "second");
  }

  // --- List Formatting ---

  /**
   * Format an array as a natural language list ("A, B, and C").
   */
  list(items: string[], options?: ListFormatOptions): string {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0]!;
    if (items.length === 2) {
      const locale = options?.locale ?? this.defaultLocale;
      if (locale.startsWith("zh")) return `${items[0]}${items[1]}`;
      return `${items[0]} and ${items[1]}`;
    }

    // Try Intl.ListFormat
    if (typeof Intl !== "undefined" && "ListFormat" in Intl) {
      try {
        return new Intl.ListFormat(options?.locale ?? this.defaultLocale, {
          type: options?.type ?? "conjunction",
          style: options?.style ?? "long",
        }).format(items);
      } catch { /* fall through */ }
    }

    // Manual fallback
    const last = items[items.length - 1]!;
    const rest = items.slice(0, -1);
    return `${rest.join(", ")} and ${last}`;
  }

  // --- Unit & Measurement ---

  /**
   * Convert a value between units.
   */
  convertUnit(value: number, from: string, to: string): number | null {
    if (from === to) return value;

    const conv = UNIT_CONVERSIONS.find((c) => c.from === from && c.to === to);
    if (!conv) return null;

    const result = value * conv.factor + (conv.offset ?? 0);
    return result;
  }

  /**
   * Format a measurement with optional unit conversion.
   */
  measurement(value: number, unit: string, options?: MeasurementFormatOptions): string {
    let finalValue = value;
    let finalUnit = unit;

    if (options?.targetUnit && options.targetUnit !== unit) {
      const converted = this.convertUnit(value, unit, options.targetUnit);
      if (converted != null) {
        finalValue = converted;
        finalUnit = options.targetUnit;
      }
    }

    return `${this.format(finalValue)} ${finalUnit}`;
  }

  /**
   * Format file size with auto unit selection.
   */
  fileSize(bytes: number, binary = false): string {
    const units = binary
      ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
      : ["B", "KB", "MB", "GB", "TB", "PB"];
    const base = binary ? 1024 : 1000;

    if (bytes === 0) return `0 ${units[0]}`;

    const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
    const value = bytes / Math.pow(base, exp);
    return `${this.format(value, { maximumFractionDigits: exp > 0 ? 1 : 0 })} ${units[exp]}`;
  }

  /**
   * Format duration in human-readable form.
   */
  duration(ms: number, precision = "seconds"): string {
    if (ms < 0) ms = 0;

    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000) % 24;
    const days = Math.floor(ms / 86400000);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

    if (precision === "milliseconds" && ms < 1000 && parts.length <= 1) {
      return `${ms.toFixed(0)}ms`;
    }

    return parts.join(" ");
  }

  // --- Pluralization ---

  /**
   * Get the plural form index for a count in the current locale.
   */
  plural(count: number, forms?: { one?: string; other?: string; zero?: string }): string {
    if (!forms) return String(count);

    if (count === 0 && forms.zero) return forms.zero.replace("{n}", String(count));
    if (count === 1 && forms.one) return forms.one.replace("{n}", String(count));
    if (forms.other) return forms.other.replace("{n}", String(count));

    return String(count);
  }

  /**
   * Select ordinal suffix (1st, 2nd, 3rd, 4th...).
   */
  ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
  }

  // --- Utilities ---

  /**
   * Get currency info by code.
   */
  getCurrencyInfo(code: string): CurrencyInfo | undefined {
    return CURRENCY_DATA[code];
  }

  /**
   * List all supported currency codes.
   */
  listCurrencies(): string[] {
    return Object.keys(CURRENCY_DATA);
  }

  /**
   * Change the default locale.
   */
  setLocale(locale: string): void {
    this.defaultLocale = locale;
    this.numberCache.clear();
    this.dateCache.clear();
  }

  /**
   * Clear all cached formatters.
   */
  clearCache(): void {
    this.numberCache.clear();
    this.dateCache.clear();
  }

  // --- Internal ---

  private applyDatePattern(date: Date, pattern: string): string {
    const replacements: Record<string, string> = {
      YYYY: date.getFullYear().toString(),
      YY: date.getFullYear().toString().slice(-2),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      M: String(date.getMonth() + 1),
      DD: String(date.getDate()).padStart(2, "0"),
      D: String(date.getDate()),
      HH: String(date.getHours()).padStart(2, "0"),
      H: String(date.getHours()),
      hh: String(date.getHours() % 12 || 12).padStart(2, "0"),
      mm: String(date.getMinutes()).padStart(2, "0"),
      ss: String(date.getSeconds()).padStart(2, "0"),
    };

    let result = pattern;
    for (const [token, val] of Object.entries(replacements)) {
      result = result.replaceAll(token, val);
    }
    return result;
  }

  private formatRelativeTemplate(diffMs: number, unit: RelativeTimeUnit, locale: string): string {
    const templates = RELATIVE_TIME_TEMPLATES[locale] ?? RELATIVE_TIME_TEMPLATES["en"]!;
    const unitTemplates = templates[unit] ?? templates.second!;
    const absValue = Math.abs(Math.round(diffMs / this.unitToMs(unit)));
    const isPast = diffMs < 0;

    const templateKey = isPast ? (absValue === 1 ? -1 : -2) : (absValue === 1 ? 1 : 2);
    const template = unitTemplates[templateKey] ?? unitTemplates[isPast ? -2 : 2]!;

    return template.replace("{value}", String(absValue));
  }

  private unitToMs(unit: RelativeTimeUnit): number {
    switch (unit) {
      case "year": return 365.25 * 24 * 60 * 60 * 1000;
      case "quarter": return 91.3125 * 24 * 60 * 60 * 1000;
      case "month": return 30.44 * 24 * 60 * 60 * 1000;
      case "week": return 7 * 24 * 60 * 60 * 1000;
      case "day": return 24 * 60 * 60 * 1000;
      "case 'hour':": return 60 * 60 * 1000;
      case "minute": return 60 * 1000;
      case "second": return 1000;
    }
    return 1000;
  }
}

// --- Convenience Functions ---

/** Quick-format a number */
export function formatNumber(value: number, locale = "en"): string {
  return new I18nNumber({ locale }).format(value);
}

/** Quick-format currency */
export function formatCurrency(value: number, code = "USD", locale = "en"): string {
  return new I18nNumber({ locale }).currency(value, code);
}

/** Quick-format percentage */
export function formatPercent(value: number, decimals = 1): string {
  return new I18nNumber().percent(value, decimals);
}

/** Quick-format file size */
export function formatFileSize(bytes: number, binary = false): string {
  return new I18nNumber().fileSize(bytes, binary);
}

/** Quick relative time */
export function timeAgo(date: Date | number | string, locale = "en"): string {
  return new I18nNumber({ locale }).timeAgo(date);
}
