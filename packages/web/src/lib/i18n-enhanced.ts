/**
 * Enhanced Internationalization (i18n) — message catalogs, pluralization,
 * locale detection, number/date formatting per locale, RTL support,
 * and interpolation.
 */

// --- Types ---

export type LocaleCode = string;
export type LocaleDirection = "ltr" | "rtl";

export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  nativeName?: string;
  direction: LocaleDirection;
  /** CLDR date format pattern */
  dateFormat?: string;
  /** Number decimal separator */
  decimal?: string;
  /** Number thousands separator */
  groupSeparator?: string;
}

export interface MessageCatalog {
  [locale: string]: Record<string, string>;
}

export interface I18nOptions {
  /** Default locale (default: "en") */
  defaultLocale?: LocaleCode;
  /** Fallback locale when translation missing (default: "en") */
  fallbackLocale?: LocaleCode;
  /** Message catalogs to load */
  catalogs?: MessageCatalog;
  /** Pluralization rules per locale */
  pluralRules?: Record<string, (n: number) => number>;
  /** Number formatter options */
  numberFormat?: Intl.NumberFormatOptions;
  /** Date formatter options */
  dateFormat?: Intl.DateTimeFormatOptions;
}

export interface PluralForm {
  zero: string;
  one: string;
  two: string;
  few: string;
  many: string;
  other: string;
}

// --- Built-in Locales ---

const LOCALES: Record<string, LocaleInfo> = {
  en: { code: "en", name: "English", direction: "ltr" },
  zh: { code: "zh", name: "中文", nativeName: "中文", direction: "ltr" },
  "zh-CN": { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", direction: "ltr" },
  "zh-TW": { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", direction: "ltr" },
  ja: { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr" },
  ko: { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr" },
  ar: { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl" },
  de: { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" },
  fr: { code: "fr", name: "French", nativeName: "Français", direction: "ltr" },
  es: { code: "es", name: Spanish", nativeName: "Español", direction: "ltr" },
  pt: { code: "pt", name: "Portuguese", nativeName: "Português", direction: "ltr" },
  ru: { code: "ru", name: Russian", nativeName: "Русский", direction: "ltr" },
  hi: { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr" };
};

/** RTL locales */
const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

// --- Plural Rules ---

/** Default English-like plural rules (1 = one, otherwise other) */
function defaultPluralRule(n: number): number {
  return n === 1 ? 0 : 1; // index into [one, other]
}

/** Get plural form index for a locale and count */
function getPluralIndex(locale: string, n: number): number {
  // English-like default
  const rules: Record<string, (n: number) => number> = {
    en: defaultPluralRule,
    zh: defaultPluralRule,
    ja: defaultPluralRule,
    ko: defaultPluralRule,
    ru: (n: number) => getRussianPlural(n),
    ar: (n: number) => getArabicPlural(n),
  };

  const rule = rules[locale] ?? rules["en"] ?? defaultPluralRule;
  return rule(n);
}

function getRussianPlural(n: number): number {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 0; // 1
  if (mod10 >= 2 && mod10 <= 4 && !(mod20 >= 12 && mod20 <= 14)) return 1; // 2-4
  return 2; // 5+
}

function getArabicPlural(n: number): number {
  if (n === 0) return 0; // zero
  if (n === 1) return 0; // one
  if (n === 2) return 1; // two
  const mod100 = n % 100;
  if (mod100 >= 3 && mod100 <= 10) return 2; // 3-10
  return 3; // 11+
}

// --- Main I18n Class ---

/**
 * Internationalization manager for multi-language applications.
 * Supports message catalogs, pluralization, number/date formatting,
 * and RTL detection.
 */
export class I18nManager {
  private locale: LocaleCode;
  private fallbackLocale: LocaleCode;
  private catalogs: MessageCatalog;
  private pluralRules: Record<string, (n: number) => number>;

  constructor(options: I18nOptions = {}) {
    this.locale = options.defaultLocale ?? "en";
    this.fallbackLocale = options.fallbackLocale ?? "en";
    this.catalogs = options.catalogs ?? {};
    this.pluralRules = options.pluralRules ?? {};
  }

  /** Get current locale */
  get currentLocale(): LocaleCode { return this.locale; }

  /** Set current locale */
  setLocale(locale: LocaleCode): void {
    this.locale = locale;
    document.documentElement.lang = locale;
    document.documentElement.dir = this.getDirection(locale);
  }

  /** Get text direction for a locale */
  getDirection(locale?: LocaleCode): LocaleDirection {
    const info = LOCALES[locale ?? this.locale];
    return info?.direction ?? "ltr";
  }

  /** Check if current locale is RTL */
  isRTL(): boolean {
    return RTL_LOCALES.has(this.locale);
  }

  /** Get locale info */
  getLocaleInfo(locale?: LocaleCode): LocaleInfo | undefined {
    return LOCALES[locale ?? this.locale];
  }

  // --- Message Translation ---

  /**
   * Translate a message key with optional interpolation.
   * Supports {var} interpolation and plural forms.
   *
   * @example
   * ```ts
   * t("greeting", { name: "World" }) // "Hello, World"
   * t("items_count", { count: 5 }) // "5 items"
   * ```
   */
  t(key: string, params?: Record<string, unknown>, count?: number): string {
    const catalog = this.catalogs[this.locale] ?? this.catalogs[this.fallbackLocale];

    let template = catalog[key];
    if (!template) {
      // Try fallback locale
      const fallbackCatalog = this.catalogs[this.fallbackLocale];
      template = fallbackCatalog?.[key];
    }
    if (!template) return key; // Return key as fallback

    // Handle plurals
    if (count !== undefined && /{(\w+)}/.test(template)) {
      const forms = this.getPluralForms(key);
      if (forms) {
        const idx = this.getPluralIndex(this.locale, count);
        const form = ["zero", "one", "two", "few", "many", "other"][idx] ?? "other";
        template = forms[form] ?? template;
      } else {
        // Simple replacement
        template = template.replace(/{\w+}/, String(count));
      }
    }

    // Interpolate params
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        template = template.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
    }

    return template;
  }

  /**
   * Check if a translation exists for a key in the current locale
   */
  has(key: string): boolean {
    const catalog = this.catalogs[this.locale];
    return !!catalog?.[key];
  }

  /**
   * Add or update message catalog for a locale
   */
  addCatalog(locale: LocaleCode, messages: Record<string, string>): void {
    this.catalogs[locale] = { ...(this.catalogs[locale] ?? {}), ...messages };
  }

  /**
   * Get all keys available in current locale's catalog
   */
  getAvailableKeys(): string[] {
    const catalog = this.catalogs[this.locale] ?? {};
    return Object.keys(catalog);
  }

  // --- Number Formatting ---

  /** Format a number according to current locale conventions */
  formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
    try {
      return new Intl.NumberFormat(this.locale, options).format(num);
    } catch {
      return num.toLocaleString();
    }
  }

  /** Format currency value */
  formatCurrency(amount: number, currency = "USD"): string {
    try {
      return new Intl.NumberFormat(this.locale, { style: "currency", currency }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  /** Format percentage */
  formatPercent(value: number, total = 100, decimals = 1): string {
    const pct = total > 0 ? (value / total) * 100 : value;
    try {
      return new Intl.NumberFormat(this_locale, { style: "percent", minimumFractionDigits: decimals }).format(pct);
    } catch {
      return `${pct.toFixed(decimals)}%`;
    }
  }

  // --- Date Formatting ---

  /** Format date according to locale */
  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === "string" ? new Date(date) : date;
    try {
      return d.toLocaleDateString(this.locale, options);
    } catch {
      return d.toLocaleDateString();
    }
  }

  /** Format relative time (e.g., "2 hours ago") */
  formatRelative(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: "auto" });
    try {
      return rtf.format(d, { unit: "second" });
    } catch {
      // Fallback manual implementation
      if (diffSec < 60) return `${diffSec}s ago`;
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return d.toLocaleDateString();
    }
  }

  /** Format date as time only */
  formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === "string" ? new Date(date) : date;
    try {
      return d.toLocaleTimeString(this.locale, { ...options, hour: "2-digit", minute: "2-digit" });
    } catch {
      return d.toLocaleTimeString();
    }
  }

  // --- Plural Forms ---

  /** Get plural forms for a message key (or generate defaults) */
  private getPluralForms(key: string): PluralForm | null {
    const catalog = this.catalogs[this.locale];
    const template = catalog?.[key];
    if (!template || !/{\w+)/.test(template)) return null;

    // Look for plural forms in catalog
    const formsKey = `${key}_plural`;
    if (catalog[formsKey]) {
      return catalog[formsKey] as unknown as PluralForm;
    }

    // Generate default forms from template
    return {
      zero: template.replace(/{\w+}/, "0"),
      one: template.replace(/{\w+}/, "1"),
      two: template.replace(/{\w+}/, "2"),
      few: template.replace(/{\w+}/, "{count}"),
      many: template.replace(/{\w+}/, "{count}"),
      other: template,
    };
  }

  private getPluralIndex(locale: string, n: number): number {
    const customRule = this.pluralRules[locale];
    if (customRule) return customRule(n);
    return getPluralIndex(locale, n);
  }
}

// --- Singleton ---

let defaultI18n: I18nManager | null = null;

/** Create/get the default i18n manager */
export function createI18n(options?: I18nOptions): I18nManager {
  defaultI18n = new I18nManager(options);
  return defaultI18n;
}

/** Get the default i18n instance */
export function getI18n(): I18nManager | null {
  return defaultI18n;
}
