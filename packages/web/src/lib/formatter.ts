/**
 * Formatter: Data formatting utilities for numbers, currencies, dates,
 * strings, bytes, and more with locale support and customizable options.
 */

// --- Number Formatting ---

export interface NumberFormatOptions {
  /** Locale (default: system) */
  locale?: string;
  /** Decimal places */
  decimals?: number;
  /** Thousands separator */
  thousandsSeparator?: string;
  /** Decimal point */
  decimalPoint?: string;
  /** Prefix (e.g., "$") */
  prefix?: string;
  /** Suffix (e.g., "%") */
  suffix?: string;
  /** Show sign for positive numbers? */
  showSign?: boolean;
  /** Minimum integer digits */
  minIntDigits?: number;
}

/** Format a number with options */
export function formatNumber(value: number, options: NumberFormatOptions = {}): string {
  if (!isFinite(value)) return String(value);

  const {
    locale,
    decimals = 0,
    thousandsSeparator: sep,
    decimalPoint: dp,
    prefix = "",
    suffix = "",
    showSign = false,
    minIntDigits = 1,
  } = options;

  if (locale) {
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
        signDisplay: showSign ? "exceptZero" : "auto",
        minimumIntegerDigits: minIntDigits,
      }).format(value);
    } catch {
      // fall through to manual formatting
    }
  }

  const fixed = Math.abs(value).toFixed(decimals);
  const [intPart, fracPart] = fixed.split(".");
  let formatted = intPart!.padStart(minIntDigits, "0");

  if (sep) {
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }

  if (decimals > 0) {
    formatted += (dp ?? ".") + fracPart!;
  }

  const sign = value < 0 ? "-" : showSign && value > 0 ? "+" : "";
  return `${prefix}${sign}${formatted}${suffix}`;
}

/** Format as compact notation (1.2K, 3.4M, etc.) */
export function formatCompact(value: number, locale?: string): string {
  if (!isFinite(value)) return String(value);

  try {
    return new Intl.NumberFormat(locale, { notation: "compact", compactDisplay: "short" }).format(value);
  } catch {
    // Manual fallback
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
    return `${sign}${abs.toFixed(0)}`;
  }
}

// --- Currency Formatting ---

export interface CurrencyFormatOptions {
  /** Currency code (ISO 4217) */
  currency: string;
  /** Locale */
  locale?: string;
  /** Display style: "code", "symbol", "narrowSymbol", "name" */
  display?: "code" | "symbol" | "narrowSymbol" | "name";
  /** Decimal places override */
  decimals?: number;
  /** Hide currency symbol? */
  hideSymbol?: boolean;
}

/** Format as currency */
export function formatCurrency(value: number, options: CurrencyFormatOptions): string {
  const {
    currency,
    locale,
    display = "symbol",
    decimals,
    hideSymbol = false,
  } = options;

  try {
    const fmtOpts: Intl.NumberFormatOptions = {
      style: hideSymbol ? "decimal" : "currency",
      currency,
      currencyDisplay: display,
    };
    if (decimals !== undefined) {
      fmtOpts.minimumFractionDigits = decimals;
      fmtOpts.maximumFractionDigits = decimals;
    }
    return new Intl.NumberFormat(locale, fmtOpts).format(value);
  } catch {
    // Fallback
    const symbols: Record<string, string> = {
      USD: "$", EUR: "\u20AC", GBP: "\u00A3", JPY: "\u00A5",
      CNY: "\u00A5", KRW: "\u20A9", INR: "\u20B9",
    };
    const sym = hideSymbol ? "" : symbols[currency] ?? currency + " ";
    return `${sym}${formatNumber(value, { decimals: decimals ?? 2 })}`;
  }
}

// --- Date & Time Formatting ---

export interface DateFormatOptions {
  /** Locale */
  locale?: string;
  /** Date style: "full", "long", "medium", "short" */
  dateStyle?: "full" | "long" | "medium" | "short";
  /** Time style */
  timeStyle?: "full" | "long" | "medium" | "short";
  /** Custom pattern tokens (fallback when Intl not used) */
  pattern?: string;
  /** Timezone */
  timeZone?: string;
  /** Show relative time ("ago"/"in") */
  relative?: boolean;
  /** 12-hour or 24-hour */
  hour12?: boolean;
}

/** Format a date */
export function formatDate(date: Date | string | number, options: DateFormatOptions = {}): string {
  const d = typeof date === "number" ? new Date(date) : typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "Invalid Date";

  const { locale, dateStyle, timeStyle, timeZone, hour12, relative } = options;

  if (relative) {
    return formatRelative(d);
  }

  if (dateStyle || timeStyle) {
    try {
      const opts: Intl.DateTimeFormatOptions = {};
      if (dateStyle) opts.dateStyle = dateStyle;
      if (timeStyle) opts.timeStyle = timeStyle;
      if (timeZone) opts.timeZone = timeZone;
      if (hour12 !== undefined) opts.hour12 = hour12;
      return new Intl.DateTimeFormat(locale, opts).format(d);
    } catch {
      // fall through
    }
  }

  if (options.pattern) {
    return formatWithPattern(d, options.pattern);
  }

  // Default: ISO-like but readable
  return d.toLocaleDateString(locale ?? undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(timeStyle ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

/** Format as relative time ("2 hours ago", "in 3 days") */
export function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const absDiff = Math.abs(diff);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absDiff < 60_000) return rtf.format(Math.round(diff / 1000), "second");
  if (absDiff < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (absDiff < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (absDiff < 604_800_000) return rtf.format(Math.round(diff / 86_400_000), "day");
  if (absDiff < 2_592_000_000) return rtf.format(Math.round(diff / 604_800_000), "week");
  if (absDiff < 31_536_000_000) return rtf.format(Math.round(diff / 2_592_000_000), "month");
  return rtf.format(Math.round(diff / 31_536_000_000), "year");
}

/** Format duration from milliseconds to human-readable string */
export function formatDuration(ms: number, options: { maxUnits?: number; short?: boolean } = {}): string {
  const { maxUnits = 2, short = false } = options;
  if (ms < 0) ms = 0;

  const units = [
    { label: short ? "d" : "day", labelPlural: short ? "d" : "days", ms: 86_400_000 },
    { label: short ? "h" : "hr", labelPlural: short ? "h" : "hrs", ms: 3_600_000 },
    { label: short ? "m" : "min", labelPlural: short ? "m" : "mins", ms: 60_000 },
    { label: short ? "s" : "sec", labelPlural: short ? "s" : "secs", ms: 1000 },
  ];

  const parts: string[] = [];
  let remaining = ms;

  for (const unit of units) {
    if (remaining < unit.ms && parts.length > 0) continue;
    const count = Math.floor(remaining / unit.ms);
    if (count <= 0 && parts.length === 0) continue;
    remaining -= count * unit.ms;
    parts.push(`${count} ${count === 1 ? unit.label : unit.labelPlural}`);
    if (parts.length >= maxUnits) break;
  }

  if (parts.length === 0) return short ? "0s" : "0 secs";
  return parts.join(" ");
}

// --- String Formatting ---

/** Capitalize first letter */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Convert to title case (each word capitalized) */
export function titleCase(str: string): string {
  if (!str) return str;
  return str.replace(/\b\w+/g, (char) => char.toUpperCase());
}

/** Convert to kebab-case */
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

/** Convert to snake_case */
export function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

/** Convert to camelCase */
export function camelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""));
}

/** Truncate with ellipsis */
export function truncate(str: string, maxLength: number, options: { suffix?: string; position?: "start" | "middle" | "end" } = {}): string {
  if (str.length <= maxLength) return str;
  const { suffix = "...", position = "end" } = options;
  const keep = maxLength - suffix.length;
  if (keep <= 0) return suffix;

  switch (position) {
    case "start":
      return suffix + str.slice(-keep);
    case "middle":
      const half = Math.floor(keep / 2);
      return str.slice(0, half) + suffix + str.slice(-half);
    case "end":
    default:
      return str.slice(0, keep) + suffix;
  }
}

/** Pad string to length */
export function pad(str: string, length: number, char = " ", align: "left" | "right" | "center" = "left"): string {
  if (str.length >= length) return str;
  const padLen = length - str.length;
  switch (align) {
    case "right": return char.repeat(padLen) + str;
    case "center": {
      const left = Math.floor(padLen / 2);
      const right = padLen - left;
      return char.repeat(left) + str + char.repeat(right);
    }
    default: return str + char.repeat(padLen);
  }
}

/** Pluralize a word based on count */
export function pluralize(count: number, singular: string, plural?: string, includeCount = true): string {
  const word = count === 1 ? singular : (plural ?? singular + "s");
  return includeCount ? `${count} ${word}` : word;
}

/** Mask sensitive data (e.g., credit card, email) */
export function maskString(str: string, options: { maskChar?: string; visibleStart?: number; visibleEnd?: number; maskAll?: boolean } = {}): string {
  const { maskChar = "*", visibleStart = 0, visibleEnd = 0, maskAll = false } = options;
  if (maskAll) return maskChar.repeat(str.length);
  if (visibleStart + visibleEnd >= str.length) return str;
  const maskedLength = str.length - visibleStart - visibleEnd;
  return str.slice(0, visibleStart) + maskChar.repeat(maskedLength) + str.slice(-visibleEnd);
}

// --- Byte Formatting ---

export interface ByteFormatOptions {
  /** Locale for number formatting */
  locale?: string;
  /** Decimal places */
  decimals?: number;
  /** Unit system: "binary" (KiB/MiB) or "decimal" (KB/MB) */
  system?: "binary" | "decimal";
  /** Include space between number and unit? */
  space?: boolean;
}

/** Format bytes to human-readable size */
export function formatBytes(bytes: number, options: ByteFormatOptions = {}): string {
  const { locale, decimals = 2, system = "binary", space = true } = options;
  if (bytes === 0) return `0${space ? " " : ""}B`;

  const base = system === "binary" ? 1024 : 1000;
  const units = system === "binary"
    ? ["B", "KiB", "MiB", "GiB", "TiB", "PiB"]
    : ["B", "KB", "MB", "GB", "TB", "PB"];

  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(base)), units.length - 1);
  const value = bytes / Math.pow(base, exp);

  const sp = space ? " " : "";
  return `${formatNumber(value, { locale, decimals })}${sp}${units[exp]!}`;
}

// --- Percentage Formatting ---

export interface PercentFormatOptions {
  /** Decimals */
  decimals?: number;
  /** Locale */
  locale?: string;
  /** Multiply by 100 automatically? (input is 0-1 vs 0-100) */
  multiply?: boolean;
  /** Suffix */
  suffix?: string;
  /** Show sign for positive? */
  showSign?: boolean;
}

/** Format as percentage */
export function formatPercent(value: number, options: PercentFormatOptions = {}): string {
  const { decimals = 1, locale, multiply = true, suffix = "%", showSign = false } = options;
  const displayValue = multiply ? value * 100 : value;
  return formatNumber(displayValue, { locale, decimals, suffix, showSign });
}

// --- Phone Formatting ---

/** Format phone number (basic E.164 → readable) */
export function formatPhone(phone: string, options: { format?: "national" | "international"; countryCode?: string } = {}): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return phone;

  const { format = "national", countryCode = "1" } = options;

  if (format === "international") {
    return `+${countryCode} ${digits.slice(0, countryCode.length === 1 ? 3 : digits.length > 6 ? 2 : digits.length)} ${digits.slice(countryCode.length === 1 ? 3 : 2)}`;
  }

  // Basic US/NA formatting
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return phone;
}

// --- ID / Code Formatting ---

/** Generate a formatted ID with optional prefix and padding */
export function formatId(id: string | number, options: { prefix?: string; padLength?: number; padChar?: string; uppercase?: boolean } = {}): string {
  const { prefix = "", padLength, padChar = "0", uppercase = false } = options;
  let result = String(id);
  if (uppercase) result = result.toUpperCase();
  if (padLength) result = result.padStart(padLength, padChar);
  return prefix ? `${prefix}-${result}` : result;
}

// --- Template Literals (safe) ---

/**
 * Simple template engine with {{variable}} syntax.
 * Supports nested properties via dot notation.
 */
export function formatTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
    const value = path.split(".").reduce<unknown>(
      (obj, key) => (obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined),
      data as unknown,
    );
    return value != null ? String(value) : "";
  });
}

// --- List Formatting ---

/** Join list items with Oxford comma support */
export function formatList(items: string[], options: { conjunction?: string; oxford?: boolean } = {}): string {
  const { conjunction = "and", oxford = true } = options;
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  const last = items.pop()!;
  const comma = oxford ? "," : "";
  return `${items.join(", ")}${comma} ${conjunction} ${last}`;
}

// --- Internal Helpers ---

function formatWithPattern(date: Date, pattern: string): string {
  const tokens: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    M: String(date.getMonth() + 1),
    DD: String(date.getDate()).padStart(2, "0"),
    D: String(date.getDate()),
    HH: String(date.getHours()).padStart(2, "0"),
    H: String(date.getHours()),
    hh: String(date.getHours() % 12 || 12).padStart(2, "0"),
    mm: String(date.getMinutes()).padStart(2, "0"),
    ss: String(date.getSeconds()).padStart(2, "0"),
    A: date.getHours() < 12 ? "AM" : "PM",
    a: date.getHours() < 12 ? "am" : "pm",
  };

  let result = pattern;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.replace(new RegExp(token, "g"), value);
  }
  return result;
}
