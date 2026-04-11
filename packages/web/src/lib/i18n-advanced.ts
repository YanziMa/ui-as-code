/**
 * Advanced Internationalization (i18n): CLDR-style pluralization,
 * locale-aware formatting, message catalogs, interpolation,
 * RTL support, lazy loading, and fallback chains.
 */

// --- Types ---

export type LocaleCode = string;

export interface LocaleConfig {
  code: string;
  name: string;
  /** Direction: "ltr" or "rtl" */
  direction: "ltr" | "rtl";
  /** Decimal separator */
  decimal?: string;
  /** Thousands separator */
  group?: string;
  /** Date format pattern */
  dateFormat?: string;
  /** Time format pattern */
  timeFormat?: string;
}

export interface PluralRule {
  zero?: (count: number) => boolean;
  one?: (count: number) => boolean;
  two?: (count: number) => boolean;
  few?: (count: number) => boolean;
  many?: (count: number) => boolean;
  other: (count: number) => boolean;
}

export interface MessageCatalog {
  [key: string]: string | Record<string, string>;
}

export interface I18nOptions {
  /** Default locale */
  defaultLocale?: string;
  /** Fallback locales to try if key missing in current locale */
  fallbackLocales?: string[];
  /** Message catalogs keyed by locale */
  catalogs?: Record<string, MessageCatalog>;
  /** Interpolation delimiter (default: "{{" and "}}") */
  delimiter?: [string, string];
  /** Callback when locale changes */
  onLocaleChange?: (locale: string) => void;
  /** Persist locale choice in localStorage? */
  persistKey?: string;
}

// --- Built-in Locales ---

const LOCALES: Record<string, LocaleConfig> = {
  "en": { code: "en", name: "English", direction: "ltr" },
  "en-US": { code: "en-US", name: "English (US)", direction: "ltr" },
  "zh": { code: "zh", name: "Chinese", direction: "ltr" },
  "zh-CN": { code: "zh-CN", name: "Chinese (Simplified)", direction: "ltr" },
  "zh-TW": { code: "zh-TW", name: "Chinese (Traditional)", direction: "ltr" },
  "ja": { code: "ja", name: "Japanese", direction: "ltr" },
  "ko": { code: "ko", name: "Korean", direction: "ltr" },
  "fr": { code: "fr", name: "French", direction: "ltr" },
  "de": { code: "de", name: "German", direction: "ltr" },
  "es": { code: "es", name: "Spanish", direction: "ltr" },
  "pt": { code: "pt", name: "Portuguese", direction: "ltr" },
  "pt-BR": { code: "pt-BR", name: "Portuguese (Brazilian)", direction: "ltr" },
  "ru": { code: "ru", name: "Russian", direction: "ltr" },
  "ar": { code: "ar", name: "Arabic", direction: "rtl" },
  "he": { code: "he", name: "Hebrew", direction: "rtl" },
  "fa": { code: "fa", name: "Persian (Farsi)", direction: "rtl" },
  "th": { code: "th", name: "Thai", direction: "ltr" },
  "vi": { code: "vi", name: "Vietnamese", direction: "ltr" },
  "nl": { code: "nl", name: "Dutch", direction: "ltr" },
  "it": { code: "it", name: "Italian", direction: "ltr" },
  "pl": { code: "pl", name: "Polish", direction: "ltr" },
  "tr": { code: "tr", name: "Turkish", direction: "ltr" },
  "id": { code: "id", name: "Indonesian", direction: "ltr" },
  "ms": { code: "ms", name: "Malay", direction: "ltr" },
  "uk": { code: "uk", name: "Ukrainian", direction: "ltr" },
  "cs": { code: "cs", name: "Czech", direction: "ltr" },
  "sv": { code: "sv", name: "Swedish", direction: "ltr" },
  "da": { code: "da", name: "Danish", direction: "ltr" },
  "no": { code: "no", name: "Norwegian", direction: "ltr" },
  "fi": { code: "fi", name: "Finnish", direction: "ltr" },
  "hu": { code: "hu", name: "Hungarian", direction: "ltr" },
  "ro": { code: "ro", name: "Romanian", direction: "ltr" },
  "bn": { code: "bn", name: "Bengali", direction: "ltr" },
  "hi": { code: "hi", name: "Hindi", direction: "ltr" },
};

// --- CLDR Plural Rules ---

/** Simplified CLDR plural rules for common locales */
const PLURAL_RULES: Record<string, PluralRule> = {
  // English and similar: one, other
  "en": { one: (n) => n === 1, other: () => true },
  "en-US": { one: (n) => n === 1, other: () => true },

  // French: zero/one, other
  "fr": { one: (n) => Math.abs(n) < 2 && n !== 0, other: () => true },

  // Russian: one (1,21,31...), few (2-4,22-24...), many (5-20,25-30...), other
  "ru": {
    one: (n) => {
      const m = Math.abs(n) % 100;
      const t = m % 10;
      return (m === 1 || (t >= 2 && t <= 4 && (m < 10 || m >= 20))) && m % 1 === 0;
    },
    few: (n) => {
      const m = Math.abs(n) % 100;
      return (m >= 5 && m <= 20 || tIsBetween(m, 2, 4)) && m % 1 === 0;
    },
    many: (n) => {
      const m = Math.abs(n) % 100;
      return ((m >= 5 && m <= 20) || m === 0) && m % 1 === 0;
    },
    other: () => true,
  },

  // Arabic: zero, one, two, few, many, other
  "ar": {
    zero: (n) => n === 0,
    one: (n) => n === 1,
    two: (n) => n === 2,
    few: (n) => {
      const m = Math.abs(n) % 100;
      return m >= 3 && m <= 10;
    },
    many: (n) => {
      const m = Math.abs(n) % 100;
      return m >= 11 && m <= 99;
    },
    other: () => true,
  },

  // Chinese/Japanese/Korean/Vietnamese: always "other"
  "zh": { other: () => true },
  "zh-CN": { other: () => true },
  "zh-TW": { other: () => true },
  "ja": { other: () => true },
  "ko": { other: () => true },
  "th": { other: () => true },
  "vi": { other: () => true },

  // Polish: one, few, many, other
  "pl": {
    one: (n) => Math.abs(n) === 1,
    few: (n) => {
      const m = Math.abs(n) % 100;
      const rem = m % 10;
      return (rem >= 2 && rem <= 4) && (m < 12 || m > 14) && m !== 0 && m % 1 === 0;
    },
    many: (n) => {
      const m = Math.abs(n);
      return (m !== 1 && (m % 10 === 1 || m % 10 === 5)) && m % 1 === 0;
    },
    other: () => true,
  },

  // Czech/Slovak: one, few, many, other
  "cs": {
    one: (n) => Math.abs(n) === 1,
    few: (n) => {
      const m = Math.abs(n) % 100;
      return (m >= 2 && m <= 4) && m % 1 === 0;
    },
    many: () => false,
    other: () => true,
  },

  // Default: simple one/other
};

function tIsBetween(m: number, lo: number, hi: number): boolean {
  return m >= lo && m <= hi;
}

// --- Main I18n Class ---

export class I18nManager {
  private locale: string;
  private catalogs: Record<string, MessageCatalog> = {};
  private fallbackLocales: string[];
  private delimiter: [string, string];
  private onLocaleChangeCb?: (locale: string) => void;
  private persistKey: string | null;

  constructor(options: I18nOptions = {}) {
    this.locale = options.defaultLocale ?? this.detectBrowserLocale();
    this.fallbackLocales = options.fallbackLocales ?? ["en"];
    this.catalogs = options.catalogs ?? {};
    this.delimiter = options.delimiter ?? ["{{", "}}"];
    this.onLocaleChangeCb = options.onLocaleChange;
    this.persistKey = options.persistKey ?? null;

    // Restore persisted locale
    if (this.persistKey && typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem(this.persistKey);
        if (saved) this.locale = saved;
      } catch {}
    }
  }

  /** Get the current locale */
  get currentLocale(): string { return this.locale; }

  /** Get config for current locale */
  get localeConfig(): LocaleConfig {
    return LOCALES[this.locale] ?? LOCALES[this.locale.split("-")[0]!] ?? { code: this.locale, name: this.locale, direction: "ltr" };
  }

  /** Check if current locale is RTL */
  get isRTL(): boolean { return this.localeConfig.direction === "rtl"; }

  /** Set the active locale */
  setLocale(locale: string): void {
    if (!LOCALES[locale] && !LOCALES[locale.split("-")[0]!]) {
      console.warn(`[i18n] Unknown locale: "${locale}". Using anyway.`);
    }
    this.locale = locale;
    if (this.persistKey) {
      try { localStorage.setItem(this.persistKey, locale); } catch {}
    }
    this.onLocaleChangeCb?.(locale);
  }

  /** Detect browser locale */
  detectBrowserLocale(): string {
    if (typeof navigator === "undefined") return "en";
    const langs = navigator.languages ?? [navigator.language ?? "en"];
    for (const lang of langs) {
      const base = lang.split("-")[0];
      if (LOCALES[lang]) return lang;
      if (LOCALES[base!]) return base!;
    }
    return "en";
  }

  /** Add or merge a message catalog for a locale */
  addCatalog(locale: string, messages: MessageCatalog): void {
    if (!this.catalogs[locale]) this.catalogs[locale] = {};
    Object.assign(this.catalogs[locale]!, messages);
  }

  /** Translate a message key with optional interpolation */
  t(key: string, params?: Record<string, unknown>, locale?: string): string {
    const loc = locale ?? this.locale;
    let message = this.resolveKey(key, loc);

    if (message && params) {
      message = this.interpolate(message, params);
    }

    return message ?? key;
  }

  /** Check if a translation exists */
  has(key: string, locale?: string): boolean {
    return !!this.resolveKey(key, locale ?? this.locale);
  }

  /** Get pluralized translation */
  pluralize(count: number, key: string, locale?: string): string {
    const loc = locale ?? this.locale;
    const form = this.getPluralForm(count, loc);

    // Try specific form first, then fall back
    const specificKey = `${key}.${form}`;
    let message = this.resolveKey(specificKey, loc) ?? this.resolveKey(key, loc);

    if (message) {
      return this.interpolate(message, { count, _form: form });
    }

    return `${count} ${key}`;
  }

  /** Format a number according to locale conventions */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    try {
      return new Intl.NumberFormat(this.locale, options).format(value);
    } catch {
      return String(value);
    }
  }

  /** Format currency */
  formatCurrency(value: number, currency = "USD"): string {
    try {
      return new Intl.NumberFormat(this.locale, { style: "currency", currency }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }

  /** Format date */
  formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(this.locale, options).format(date instanceof Date ? date : new Date(date));
    } catch {
      return String(date);
    }
  }

  /** Format relative time */
  formatRelative(date: Date | number): string {
    const d = date instanceof Date ? date : new Date(date);
    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" });
    const now = Date.now();
    const diffMs = d.getTime() - now;
    const diffSec = Math.round(diffMs / 1000);
    const absSec = Math.abs(diffSec);

    if (absSec < 60) return rtf.format(Math.round(diffSec), "second");
    if (absSec < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
    if (absSec < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
    if (absSec < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
    return rtf.format(Math.round(diffSec / 2592000), "month");
  }

  /** Format list (e.g., "A, B, and C") */
  formatList(items: string[]): string {
    try {
      return new Intl.ListFormat(this.locale).format(items);
    } catch {
      return items.join(", ");
    }
  }

  /** List all available locales */
  getAvailableLocales(): LocaleConfig[] {
    return Object.values(LOCALES);
  }

  /** Get all registered keys for a locale */
  getKeys(locale?: string): string[] {
    const loc = locale ?? this.locale;
    const catalog = this.catalogs[loc];
    if (!catalog) return [];
    const keys: string[] = [];
    const collect = (obj: MessageCatalog, prefix = "") => {
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string") keys.push(prefix ? `${prefix}.${k}` : k);
        else collect(v as Record<string, string>, prefix ? `${prefix}.${k}` : k);
      }
    };
    collect(catalog);
    return keys;
  }

  // --- Internal ---

  private resolveKey(key: string, locale: string): string | undefined {
    // Try exact locale first
    const catalog = this.catalogs[locale];
    if (catalog) {
      const value = this.getNested(catalog, key);
      if (value !== undefined) return typeof value === "string" ? value : undefined;
    }

    // Try base language (e.g., "zh" for "zh-CN")
    const baseLang = locale.split("-")[0]!;
    const baseCatalog = this.catalogs[baseLang];
    if (baseCatalog) {
      const value = this.getNested(baseCatalog, key);
      if (value !== undefined) return typeof value === "string" ? value : undefined;
    }

    // Try fallback locales
    for (const fb of this.fallbackLocales) {
      const fbCatalog = this.catalogs[fb];
      if (fbCatalog) {
        const value = this.getNested(fbCatalog, key);
        if (value !== undefined) return typeof value === "string" ? value : undefined;
      }
    }

    return undefined;
  }

  private getNested(obj: MessageCatalog, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = obj;
    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  private interpolate(template: string, params: Record<string, unknown>): string {
    const [open, close] = this.delimiter;
    return template.replace(new RegExp(`${escapeRegex(open)}\\s*(\\w+(?:\\.\\w+)*)\\s*${escapeRegex(close)}`, "g"), (_, path) => {
      const value = path.split(".").reduce<unknown>(
        (obj, key) => obj != null && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined,
        params,
      );
      return value != null ? String(value) : "";
    });
  }

  private getPluralForm(count: number, locale: string): string {
    // Find matching rule: check exact locale, then base language, then default
    const rule = PLURAL_RULES[locale]
      ?? PLURAL_RULES[locale.split("-")[0]!]
      ?? PLURAL_RULES["en"];

    if (rule.zero?.(count)) return "zero";
    if (rule.one?.(count)) return "one";
    if (rule.two?.(count)) return "two";
    if (rule.few?.(count)) return "few";
    if (rule.many?.(count)) return "many";
    return "other";
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// --- Convenience ---

/** Create an i18n manager with default options */
export function createI18n(options?: I18nOptions): I18nManager {
  return new I18nManager(options);
}

/** Default singleton instance */
export const i18n = createI18n();

/** Shorthand for translation */
export function t(key: string, params?: Record<string, unknown>): string {
  return i18n.t(key, params);
}
