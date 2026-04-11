/**
 * Internationalization (i18n) utilities: translation management,
 * interpolation, pluralization, locale detection, RTL support,
 * lazy loading, fallback chains, and message formatting.
 */

// --- Types ---

export interface I18nConfig {
  /** Default locale */
  defaultLocale: string;
  /** Supported locales */
  locales: string[];
  /** Fallback locale chain */
  fallbacks?: Record<string, string[]>;
  /** Enable debug mode (logs missing keys) */
  debug?: boolean;
}

export interface TranslationEntry {
  key: string;
  value: string;
  locale: string;
  namespace?: string;
}

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

// --- Locale Detection ---

/** Get the user's preferred language from the browser */
export function getUserLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  return navigator.language ?? "en";
}

/** Get all user-preferred languages in order of preference */
export function getUserLanguages(): string[] {
  if (typeof navigator === "undefined") return ["en"];
  return [...(navigator.languages ?? [navigator.language ?? "en"])];
}

/** Match a language against a list of supported locales with fallback logic */
export function matchLocale(
  preferred: string,
  supported: readonly string[],
): string | null {
  // Exact match
  if (supported.includes(preferred)) return preferred;

  // Language-only match (e.g., "en-US" → "en")
  const base = preferred.split("-")[0];
  if (supported.includes(base)) return base;

  // Try to find any supported locale that starts with the same base
  for (const locale of supported) {
    if (locale.startsWith(base + "-")) return locale;
  }

  return null;
}

/** Resolve the best available locale from user preferences and supported list */
export function resolveLocale(
  supportedLocales: readonly string[],
  defaultLocale = "en",
): string {
  const languages = getUserLanguages();
  for (const lang of languages) {
    const matched = matchLocale(lang, supportedLocales);
    if (matched) return matched;
  }
  return defaultLocale;
}

// --- Translation Manager ---

/**
 * I18nManager - manages translations across multiple locales
 * with interpolation, pluralization, and fallback support.
 */
export class I18nManager {
  private store: Map<string, Map<string, TranslationEntry>>;
  private config: I18nConfig;
  private currentLocale: string;
  private missingKeys: Set<string>;
  private onMissingKey?: (key: string, locale: string) => void;

  constructor(config: I18nConfig) {
    this.config = {
      debug: false,
      ...config,
      fallbacks: {},
    };
    this.store = new Map();
    this.currentLocale = config.defaultLocale;
    this.missingKeys = new Set();

    // Initialize default locale store
    for (const locale of config.locales) {
      if (!this.store.has(locale)) this.store.set(locale, new Map());
    }
  }

  /** Add translations for a specific locale */
  addTranslations(locale: string, entries: Record<string, string>, namespace?: string): void {
    let dict = this.store.get(locale);
    if (!dict) {
      dict = new Map();
      this.store.set(locale, dict);
    }
    for (const [key, value] of Object.entries(entries)) {
      dict.set(key, { key, value, locale, namespace });
    }
  }

  /** Translate a key with optional interpolation parameters */
  t(key: string, params?: Record<string, unknown>, locale?: string): string {
    const loc = locale ?? this.currentLocale;

    // Try direct lookup
    let entry = this.lookup(key, loc);

    // Try fallback chain
    if (!entry && this.config.fallbacks[loc]) {
      for (const fallback of this.config.fallbacks[loc]!) {
        entry = this.lookup(key, fallback);
        if (entry) break;
      }
    }

    // Fall back to default locale
    if (!entry && loc !== this.config.defaultLocale) {
      entry = this.lookup(key, this.config.defaultLocale);
    }

    // Return key itself if not found
    if (!entry) {
      if (this.config.debug || !this.missingKeys.has(key)) {
        this.missingKeys.add(key);
        this.onMissingKey?.(key, loc);
      }
      return key;
    }

    return this.interpolate(entry.value, params);
  }

  /** Translate with plural forms */
  tn(key: string, count: number, params?: Record<string, unknown>, locale?: string): string {
    const loc = locale ?? this.currentLocale;
    const form = getPluralForm(count, loc);

    // Try plural-specific keys first
    const pluralKey = `${key}.${form}`;
    let result = this.t(pluralKey, { ...params, count }, loc);

    // If not found, try generic key with count param
    if (result === pluralKey) {
      result = this.t(key, { ...params, count }, loc);
    }

    return result;
  }

  /** Check if a translation exists */
  has(key: string, locale?: string): boolean {
    return this.lookup(key, locale ?? this.currentLocale) !== undefined;
  }

  /** Get the current locale */
  get locale(): string { return this.currentLocale; }

  /** Set the current locale */
  set locale(loc: string): void {
    if (this.config.locales.includes(loc)) {
      this.currentLocale = loc;
    } else if (this.config.debug) {
      console.warn(`[i18n] Unsupported locale: ${loc}`);
    }
  }

  /** Get all missing keys since last reset */
  getMissingKeys(): string[] { return [...this.missingKeys]; }

  /** Clear missing keys tracking */
  clearMissingKeys(): void { this.missingKeys.clear(); }

  /** Set callback for when a translation key is missing */
  onMissing(callback: (key: string, locale: string) => void): void {
    this.onMissingKey = callback;
  }

  /** Get all registered locales */
  getLocales(): string[] { return [...this.config.locales]; }

  /** Export all translations for a locale as a plain object */
  exportLocale(locale: string): Record<string, string> {
    const dict = this.store.get(locale);
    if (!dict) return {};
    const result: Record<string, string> = {};
    for (const [, entry] of dict) {
      result[entry.key] = entry.value;
    }
    return result;
  }

  private lookup(key: string, locale: string): TranslationEntry | undefined {
    return this.store.get(locale)?.get(key);
  }

  private interpolate(template: string, params?: Record<string, unknown>): string {
    if (!params) return template;

    return template.replace(/\{(\w+)\}/g, (_, name) => {
      const value = params[name];
      return value !== undefined ? String(value) : `{${name}}`;
    });
  }
}

// --- Pluralization Rules ---

/** Get the CLDR plural form for a given count and locale */
export function getPluralForm(count: number, locale: string): "zero" | "one" | "two" | "few" | "many" | "other" {
  const n = Math.abs(count);
  const base = locale.split("-")[0];

  // Locales with no plural distinction
  if (["zh", "ja", "ko", "th", "vi"].includes(base)) {
    return n === 0 ? "zero" : "other";
  }

  // Arabic (complex rules)
  if (base === "ar") {
    if (n === 0) return "zero";
    if (n === 1) return "one";
    if (n === 2) return "two";
    const mod100 = n % 100;
    if (mod100 >= 3 && mod100 <= 10) return "few";
    if (mod100 >= 11 && mod100 <= 99) return "many";
    return "other";
  }

  // Slavic (Russian, Ukrainian, etc.)
  if (["ru", "uk", "be", "sr"].includes(base)) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "one";
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "few";
    if (mod10 === 0 || mod10 >= 5 && mod10 <= 9 || (mod100 >= 11 && mod100 <= 14)) return "many";
    return "other";
  }

  // Polish
  if (base === "pl") {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (n === 1) return "one";
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "few";
    if (
      (mod10 !== 1 && mod10 >= 2 && mod10 <= 4) ||
      (mod10 >= 12 && mod100 <= 14) ||
      (mod10 >= 22 && mod100 <= 24)
    ) return "many";
    return "other";
  }

  // Celtic (Irish, Scottish Gaelic)
  if (["ga", "gd"].includes(base)) {
    if (n === 1) return "one";
    if (n === 2) return "two";
    if (n >= 3 && n <= 6) return "few";
    if (n >= 7 && n <= 10) return "many";
    return "other";
  }

  // Default (English-style)
  if (n === 1) return "one";
  if (n === 0) return "zero";
  return "other";
}

// --- RTL Utilities ---

/** Check if a locale uses right-to-left text direction */
export function isRTL(locale: string): boolean {
  const rtlLocales = ["ar", "he", "fa", "ur", "yi", "ps", "sd", "ckb"];
  return rtlLocales.includes(locale.split("-")[0]);
}

/** Get the text direction for a locale */
export function getDirection(locale: string): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}

/** Apply dir attribute to an element based on locale */
export function applyDirection(element: HTMLElement, locale: string): void {
  element.dir = getDirection(locale);
  element.style.textAlign = isRTL(locale) ? "right" : "";
}

// --- Number/Currency Formatting ---

/** Format a number according to locale conventions */
export function formatNumber(
  value: number,
  locale: string = "en",
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}

/** Format as currency */
export function formatCurrency(
  value: number,
  currencyCode: string = "USD",
  locale: string = "en",
): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode }).format(value);
  } catch {
    return `${currencyCode} ${value.toFixed(2)}`;
  }
}

/** Format a percentage */
export function formatPercent(
  value: number,
  locale: string = "en",
  digits = 1,
): string {
  return formatNumber(value * 100, locale, {
    style: "decimal",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }) + "%";
}

/** Format compact/short number (e.g., 1.2K, 3.4M) */
export function formatCompactNumber(value: number, locale: string = "en"): string {
  try {
    return new Intl.NumberFormat(locale, { notation: "compact", compactDisplay: "short" }).format(value);
  } catch {
    return String(value);
  }
}

// --- Date/Time Formatting ---

/** Format date according to locale conventions */
export function formatDateI18n(
  date: Date | number,
  locale: string = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString(locale);
  }
}

/** Format relative time (e.g., "2 hours ago") */
export function formatRelativeTime(
  date: Date | number,
  locale: string = "en",
): string {
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const now = Date.now();
    const target = typeof date === "number" ? date : date.getTime();
    const diffSec = Math.floor((now - target) / 1000);

    if (Math.abs(diffSec) < 60) return rtf.format(-diffSec, "second");
    const diffMin = Math.floor(diffSec / 60);
    if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, "minute");
    const diffHour = Math.floor(diffMin / 60);
    if (Math.abs(diffHour) < 24) return rtf.format(-diffHour, "hour");
    const diffDay = Math.floor(diffHour / 24);
    if (Math.abs(diffDay) < 30) return rtf.format(-diffDay, "day");
    const diffMonth = Math.floor(diffDay / 30);
    if (Math.abs(diffMonth) < 12) return rtf.format(-diffMonth, "month");
    return rtf.format(Math.floor(diffMonth / 12), "year");
  } catch {
    return "";
  }
}

// --- List Formatting ---

/** Format a list of items with locale-appropriate conjunctions */
export function formatList(items: string[], locale: string = "en"): string {
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}
