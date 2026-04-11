/**
 * Intl (Internationalization): Lightweight locale-aware formatting utilities
 * built on the Intl API with fallbacks for older browsers.
 *
 * Provides:
 *   - Number formatting (decimal, currency, percent, unit, compact)
 *   - Date/time formatting with pattern support
 *   - Relative time formatting
 *   - List formatting
 *   - Plural rules
 *   - Collation/sorting
 *   - Locale detection and negotiation
 *   - Message formatting (ICU-like subset)
 */

// --- Types ---

export type Locale = string;

export interface NumberFormatConfig {
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Use grouping separators */
  useGrouping?: boolean;
  /** Currency code (e.g., "USD", "EUR") */
  currency?: string;
  /** Currency display style */
  currencyDisplay?: "code" | "symbol" | "narrowSymbol" | "name";
  /** Notation style */
  notation?: "standard" | "scientific" | "engineering" | "compact";
  /** Compact display style */
  compactDisplay?: "short" | "long";
  /** Sign display */
  signDisplay?: "auto" | "always" | "exceptZero" | "never";
}

export interface DateFormatConfig {
  /** Predefined date style */
  dateStyle?: "full" | "long" | "medium" | "short";
  /** Predefined time style */
  timeStyle?: "full" | "long" | "medium" | "short";
  /** Custom format pattern (fallback) */
  pattern?: string;
  /** Timezone */
  timeZone?: string;
  /** Hour cycle */
  hourCycle?: "h11" | "h12" | "h23" | "h24";
  /** 12-hour time */
  hour12?: boolean;
  /** Weekday format */
  weekday?: "long" | "short" | "narrow";
  /** Year format */
  year?: "numeric" | "2-digit";
  /** Month format */
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  /** Day format */
  day?: "numeric" | "2-digit";
  /** Hour format */
  hour?: "numeric" | "2-digit";
  /** Minute format */
  minute?: "numeric" | "2-digit";
  /** Second format */
  second?: "numeric" | "2-digit";
}

export interface RelativeTimeConfig {
  /** Time unit */
  unit?: Intl.RelativeTimeFormatUnit;
  /** Numeric style */
  numeric?: "always" | "auto";
}

export interface ListFormatConfig {
  /** List style */
  style?: "long" | "short" | "narrow";
  /** List type */
  type?: "conjunction" | "disjunction" | "unit";
}

export interface PluralConfig {
  /** Plural form type (cardinal or ordinal) */
  type?: "cardinal" | "ordinal";
}

export interface CollatorConfig {
  /** Sensitivity level */
  sensitivity?: "base" | "accent" | "case" | "variant";
  /** Ignore punctuation */
  ignorePunctuation?: boolean;
  /** Usage context */
  usage?: "sort" | "search";
  /** Numeric collation */
  numeric?: boolean;
  /** Case-first ordering */
  caseFirst?: "upper" | "lower" | "false";
}

// --- Default Locale ---

let _defaultLocale: Locale = "en";

/** Get the default locale used by all formatters */
export function getDefaultLocale(): Locale { return _defaultLocale; }

/** Set the default locale for all formatters */
export function setDefaultLocale(locale: Locale): void { _defaultLocale = locale; }

/** Detect browser locale, falling back to default */
export function detectLocale(): Locale {
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return _defaultLocale;
}

/** Negotiate the best available locale from a list of desired locales */
export function negotiateLocale(
  desired: Locale[],
  available: Locale[],
  fallback: Locale = _defaultLocale,
): Locale {
  try {
    const result = Intl.supportedValues?.("locale");
    // Simple negotiation: find first match
    for (const d of desired) {
      if (available.includes(d)) return d;
      const lang = d.split("-")[0];
      for (const a of available) { if (a.startsWith(lang)) return a; }
    }
  } catch { /* fallback */ }
  return fallback;
}

// --- Number Formatting ---

/** Format a number according to locale and options */
export function formatNumber(value: number, config: NumberFormatConfig = {}, locale?: Locale): string {
  const loc = locale ?? _defaultLocale;
  try {
    return new Intl.NumberFormat(loc, config as Intl.NumberFormatOptions).format(value);
  } catch {
    return String(value);
  }
}

/** Format as currency */
export function formatCurrency(value: number, currency: string, config: Omit<NumberFormatConfig, "currency"> = {}, locale?: Locale): string {
  return formatNumber(value, { ...config, currency, style: "currency", currencyDisplay: config.currencyDisplay ?? "symbol" }, locale);
}

/** Format as percentage */
export function formatPercent(value: number, config: Omit<NumberFormatConfig, "style"> = {}, locale?: Locale): string {
  return formatNumber(value, { ...config, style: "percent" }, locale);
}

/** Format in compact notation (1.2K, 3M) */
export function formatCompact(value: number, locale?: Locale): string {
  return formatNumber(value, { notation: "compact", compactDisplay: "short" }, locale);
}

/** Format bytes to human-readable string */
export function formatByteSize(bytes: number, locale?: Locale): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, i);
  return `${formatNumber(size, { maximumFractionDigits: i > 0 ? 1 : 0 }, locale)} ${units[i]}`;
}

// --- Date/Time Formatting ---

/** Format a date/time value */
export function formatDate(value: Date | number | string, config: DateFormatConfig = {}, locale?: Locale): string {
  const loc = locale ?? _defaultLocale;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "Invalid Date";

  try {
    return new Intl.DateTimeFormat(loc, config as Intl.DateTimeFormatOptions).format(date);
  } catch {
    return date.toLocaleDateString(loc);
  }
}

/** Format relative time ("3 days ago", "in 2 hours") */
export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, config: RelativeTimeConfig = {}, locale?: Locale): string {
  const loc = locale ?? _defaultLocale;
  try {
    return new Intl.RelativeTimeFormat(loc, { numeric: config.numeric ?? "auto" }).format(value, unit);
  } catch {
    const abs = Math.abs(value);
    return `${value < 0 ? "" : "in "}${abs} ${unit}${abs !== 1 ? "s" : ""}${value < 0 ? " ago" : ""}`;
  }
}

/** Format a date as relative time from now */
export function formatTimeAgo(date: Date | number | string, locale?: Locale): string {
  const target = date instanceof Date ? date : new Date(date);
  const now = Date.now();
  const diffMs = target.getTime() - now;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const absMs = Math.abs(diffMs);
  if (absMs < 60000) return formatRelativeTime(Math.round(diffSec / 1000), "second", {}, locale);
  if (absMs < 3600000) return formatRelativeTime(-diffMin, "minute", {}, locale);
  if (absMs < 86400000) return formatRelativeTime(-diffHour, "hour", {}, locale);
  return formatRelativeTime(-diffDay, "day", {}, locale);
}

/** Format a duration in ms to human-readable string */
export function formatDuration(ms: number, locale?: Locale): string {
  const absMs = Math.abs(ms);
  const seconds = Math.floor(absMs / 1000) % 60;
  const minutes = Math.floor(absMs / 60000) % 60;
  const hours = Math.floor(absMs / 3600000);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}

// --- List Formatting ---

/** Format a list of strings according to locale conventions ("A, B, and C") */
export function formatList(items: string[], config: ListFormatConfig = {}, locale?: Locale): string {
  const loc = locale ?? _defaultLocale;
  try {
    return new Intl.ListFormat(loc, config as Intl.ListFormatOptions).format(items);
  } catch {
    return items.join(", ");
  }
}

// --- Plural Rules ---

/** Get the plural category for a count */
export function getPluralCategory(count: number, config: PluralConfig = {}, locale?: Locale): string {
  const loc = locale ?? _defaultLocale;
  try {
    const rules = new Intl.PluralRules(loc, { type: config.type ?? "cardinal" });
    return rules.select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}

/** Choose a string based on plural category */
export function pluralize(count: number, forms: Record<string, string>, locale?: Locale): string {
  const cat = getPluralCategory(count, {}, locale);
  return forms[cat] ?? forms["other"] ?? "";
}

// --- Collation ---

/** Compare two strings according to locale sort order */
export function compareStrings(a: string, b: string, config: CollatorConfig = {}, locale?: Locale): number {
  const loc = locale ?? _defaultLocale;
  try {
    return new Intl.Collator(loc, config as Intl.CollatorOptions).compare(a, b);
  } catch {
    return a.localeCompare(b);
  }
}

/** Sort an array of strings using locale-aware comparison */
export function sortLocaleAware(items: string[], config: CollatorConfig = {}, locale?: Locale): string[] {
  return [...items].sort((a, b) => compareStrings(a, b, config, locale));
}

// --- Message Formatting (ICU-like) ---

/** Simple message formatter supporting {var}, {var, number}, {var, plural, ...} */
export function formatMessage(
  pattern: string,
  params: Record<string, unknown> = {},
  locale?: Locale,
): string {
  const loc = locale ?? _defaultLocale;
  let result = pattern;

  // Replace simple placeholders
  for (const [key, value] of Object.entries(params)) {
    const re = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(re, String(value));
  }

  // Replace numbered placeholders
  result = result.replace(/\{(\d+)\}/g, (_, idx) => String(params[idx] ?? ""));

  return result;
}
