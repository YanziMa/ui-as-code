/**
 * I18n Framework: Complete internationalization framework with message catalogs,
 * ICU-style message formatting, CLDR plural rules, number/date/relative-time formatting,
 * RTL detection and layout switching, locale negotiation, lazy loading,
 * namespace isolation, interpolation, and fallback chains.
 */

// --- Types ---

export type LocaleCode = string; // e.g., "en", "zh-CN", "de", "ar"

export interface LocaleInfo {
  code: LocaleCode;
  /** Display name in its own language */
  name: string;
  /** English name */
  englishName: string;
  /** Direction: "ltr" or "rtl" */
  direction: "ltr" | "rtl";
  /** Parent locale (for fallbacks) */
  parent?: LocaleCode;
}

export interface MessageParams {
  [key: string]: string | number | boolean | Date | undefined;
}

export interface MessageEntry {
  key: string;
  /** Localized message string (may contain {placeholders}) */
  message: string;
  /** Description for translators */
  description?: string;
  /** Context where this message appears */
  context?: string;
  /** Whether message has been reviewed by a translator */
  reviewed?: boolean;
  /** Last updated timestamp */
  updatedAt?: number;
}

export interface PluralRule {
  /** Determine which form to use based on count */
  forms: (n: number) => string;
  /** Ordered form names for this locale */
  formNames: string[];
  /** Example counts for each form */
  examples?: Record<string, number>;
}

export interface I18nConfig {
  /** Default locale (default: "en") */
  defaultLocale?: LocaleCode;
  /** Fallback locales tried in order (default: ["en"]) */
  fallbackLocales?: LocaleCode[];
  /** Enable debug logging */
  debug?: boolean;
  /** Cache size for compiled messages (default: 500) */
  cacheSize?: number;
  /** Auto-detect browser language (default: true) */
  autoDetect?: boolean;
  /** Called when locale changes */
  onLocaleChange?: (locale: LocaleCode) => void;
}

export interface NumberFormatOptions {
  style?: "decimal" | "currency" | "percent" | "unit";
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  useGrouping?: boolean;
}

export interface DateFormatOptions {
  style?: "full" | "long" | "short" | "medium";
  dateStyle?: "full" | "long" | "short" | "medium";
  timeStyle?: "full" | "long" | "short" | "medium";
  hour12?: boolean;
}

// --- Built-in Locale Data ---

const LOCALES: Record<LocaleCode, LocaleInfo> = {
  en: { code: "en", name: "English", englishName: "English", direction: "ltr" },
  "en-US": { code: "en-US", name: "English (US)", englishName: "English (US)", direction: "ltr" },
  "en-GB": { code: "en-GB", name: "English (UK)", englishName: "English (UK)", direction: "ltr" },
  zh: { code: "zh", name: "中文", englishName: "Chinese", direction: "ltr" },
  "zh-CN": { code: "zh-CN", name: "简体中文", englishName: "Chinese Simplified", direction: "ltr" },
  "zh-TW": { code: "zh-TW", name: "繁體中文", englishName: "Chinese Traditional", direction: "ltr" },
  ja: { code: "ja", name: "日本語", englishName: "Japanese", direction: "ltr" },
  ko: { code: "ko", name: "한국어", englishName: "Korean", direction: "ltr" },
  de: { code: "de", name: "Deutsch", englishName: "German", direction: "ltr" },
  fr: { code: "fr", name: "Français", englishName: French", direction: "ltr" },
  es: { code: "es", name: "Español", englishName: "Spanish", direction: "ltr" },
  pt: { code: "pt", name: "Português", englishName: "Portuguese", direction: "ltr" },
  ru: { code: "ru", name: "Русский", englishName: "Russian", direction: "ltr" },
  ar: { code: "ar", name: "العربية", englishName: "Arabic", direction: "rtl" },
  he: { code: "he", name: "עברית", englishName: "Hebrew", direction: "rtl" },
  cs: { code: "cs", name: "Čeština", englishName: "Czech", direction: "ltr" },
  pl: { code: "pl", name: "Polski", englishName: "Polish", direction: "ltr" },
  nl: { code: "nl", name: "Nederlands", englishName: "Dutch", direction: "ltr" },
  it: { code: "it", name: "Italiano", englishName: "Italian", direction: "ltr" },
  sv: { code: "sv", name: "Svenska", englishName: "Swedish", direction: "ltr" },
  da: { code: "da", name: "Dansk", englishName: "Danish", direction: "ltr" },
  fi: { code: "fi", name: "Suomi", englishName: "Finnish", direction: "ltr" },
  tr: { code: "tr", name: "Türkçe", englishName: "Turkish", direction: "ltr" },
  vi: { code: "vi", name: "Tiếng Việt", englishName: "Vietnamese", direction: "ltr" },
  th: { code: "th", name: "ไทย", englishName: "Thai", direction: "ltr" },
  id: { code: "id", name: "Bahasa Indonesia", englishName: "Indonesian", direction: "ltr" },
};

// --- Plural Rules (CLDR-inspired) ---

const PLURAL_RULES: Record<LocaleCode, PluralRule[]> = {
  en: [{
    forms: (n) => n === 1 ? "one" : "other",
    formNames: ["one", "other"],
    examples: { one: 1, other: 2 },
  }],
  zh: [{
    forms: () => "other",
    formNames: ["other"],
  }],
  ja: [{
    forms: () => "other",
    formNames: ["other"],
  }],
  ko: [{
    forms: () => "other",
    formNames: ["other"],
  }],
  de: [{
    forms: (n) => n === 1 ? "one" : "other",
    formNames: ["one", "other"],
  }],
  fr: [{
    forms: (n) => (n === 0 || n === 1) ? "one" : n === 2 ? "two" : "other",
    formNames: ["one", "two", "other"],
  }],
  es: [{
    forms: (n) => (n === 1) ? "one" : "other",
    formNames: ["one", "other"],
  }],
  ru: [{
    forms: (n) =>
      n % 10 === 1 && n % 100 !== 11 ? "one"
      : n % 10 >= 2 && n % 20 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? "few"
      : (n % 10 === 0 || n % 100 >= 5 || n === 0) ? "many" : "other",
    formNames: ["one", "few", "many", "other"],
  }],
  ar: [{
    forms: (n) => n === 0 ? "zero" : n === 1 ? "one" : n === 2 ? "two" : (n % 100 >= 3 && n % 100 <= 10) ? "few" : "many",
    formNames: ["zero", "one", "two", "few", "many", "other"],
  }],
  pl: [{
    forms: (n) =>
      n === 1 ? "one" : (n % 10 >= 2 && n % 20 <= 4) ? "few" : (n % 100 >= 5 && n % 100 <= 21) ? "many" : "other",
    formNames: ["one", "few", "many", "other"],
  }],
  cs: [{
    forms: (n) => (n === 1) ? "one" : (n >= 2 && n <= 4) ? "few" : "other",
    formNames: ["one", "few", "other"],
  }],
};

// --- Message Catalog ---

class MessageCatalog {
  private messages = new Map<string, Map<LocaleCode, MessageEntry>>();
  private namespaces = new Set<string>();

  /** Add messages for a locale */
  addMessages(locale: LocaleCode, entries: MessageEntry[], namespace?: string): void {
    const ns = namespace ?? "__global__";
    this.namespaces.add(ns);
    let localeMap = this.messages.get(locale);
    if (!localeMap) {
      localeMap = new Map();
      this.messages.set(locale, localeMap);
    }
    for (const entry of entries) {
      localeMap.set(entry.key, entry);
    }
  }

  /** Get a message by key for a specific locale */
  getMessage(locale: LocaleCode, key: string, namespace?: string): MessageEntry | undefined {
    const ns = namespace ?? "__global__";
    const localeMap = this.messages.get(locale);
    return localeMap?.get(`${ns}:${key}`);
  }

  /** Get all available locales that have messages */
  getAvailableLocales(): LocaleCode[] {
    return Array.from(this.messages.keys());
  }

  /** Get all message keys for a locale */
  getKeys(locale: LocaleCode, namespace?: string): string[] {
    const ns = namespace ?? "__global__";
    const localeMap = this.messages.get(locale);
    if (!localeMap) return [];
    return Array.from(localeMap.keys()).filter((k) => k.startsWith(`${ns}:`)).map((k) => k.split(":")[1]);
  }
}

// --- Main I18n Class ---

export class I18n {
  private catalog: MessageCatalog;
  private currentLocale: LocaleCode;
  private fallbackLocales: LocaleCode[];
  private listeners = new Set<(locale: LocaleCode) => void>();
  private cache = new Map<string, string>(); // Compiled message cache
  private config: Required<I18nConfig>;

  constructor(config: I18nConfig = {}) {
    this.config = {
      defaultLocale: config.defaultLocale ?? "en",
      fallbackLocales: config.fallbackLocales ?? ["en"],
      debug: config.debug ?? false,
      cacheSize: config.cacheSize ?? 500,
      autoDetect: config.autoDetect ?? true,
      onLocaleChange: config.onLocaleChange ?? (() => {}),
    };

    this.catalog = new MessageCatalog();
    this.currentLocale = this.detectLocale();
    this.fallbackLocales = this.config.fallbackLocales;
  }

  // --- Locale Management ---

  /** Get current locale */
  getLocale(): LocaleCode { return this.currentLocale; }

  /** Set locale explicitly */
  async setLocale(locale: LocaleCode): Promise<void> {
    const resolved = this.resolveLocale(locale);
    if (resolved !== this.currentLocale) {
      this.currentLocale = resolved;
      this.clearCache();
      this.config.onLocaleChange(resolved);
      for (const l of this.listeners) l(resolved);
      // Update HTML lang/dir attributes
      this.applyLocaleToDOM(resolved);
    }
  }

  /** Resolve locale to best match (handles aliases like "zh-CN" → "zh-CN") */
  resolveLocale(requested: LocaleCode): LocaleCode {
    // Exact match
    if (LOCALES[requested]) return requested;

    // Case-insensitive match
    const lower = requested.toLowerCase();
    for (const [code] of Object.entries(LOCALES)) {
      if (code.toLowerCase() === lower) return code;
    }

    // Language-only match (e.g., "zh" → "zh")
    const lang = requested.split("-")[0];
    if (LOCALES[lang]) return lang;

    return this.config.defaultLocale;
  }

  /** Detect browser/user locale */
  private detectLocale(): LocaleCode {
    if (this.config.autoDetect && typeof navigator !== "undefined") {
      const langs = navigator.languages ?? [navigator.language ?? "en"];
      if (langs.length > 0) {
        const resolved = this.resolveLocale(langs[0]);
        return resolved;
      }
    }
    return this.config.defaultLocale;
  }

  /** Get locale info */
  getLocaleInfo(code?: LocaleCode): LocaleInfo | undefined {
    return LOCALES[code ?? this.currentLocale] ?? LOCALES[this.currentLocale];
  }

  /** Check if current locale is RTL */
  isRTL(): boolean {
    return this.getLocaleInfo().direction === "rtl";
  }

  /** List supported locales */
  getSupportedLocales(): LocaleInfo[] {
    return Object.values(LOCALES);
  }

  /** Subscribe to locale changes */
  onLocaleChange(listener: (locale: LocaleCode) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Message Management ---

  /** Add translation messages */
  addTranslations(locale: LocaleCode, messages: Record<string, string>, namespace?: string): void {
    const entries: MessageEntry[] = Object.entries(messages).map(([key, message]) => ({
      key,
      message,
    }));
    this.catalog.addMessages(locale, entries, namespace);
    this.clearCache(); // Invalidate cache when new messages added
  }

  /** Bulk load translations (useful for lazy loading) */
  async loadNamespace(namespace: string, loader: (locale: LocaleCode) => Promise<Record<string, string>>): Promise<void> {
    for (const locale of [this.currentLocale, ...this.fallbackLocales]) {
      try {
        const messages = await loader(locale);
        if (messages && Object.keys(messages).length > 0) {
          this.addTranslations(locale, messages, namespace);
        }
      } catch (e) {
        if (this.config.debug) console.error(`[I18n] Failed to load ${namespace} for ${locale}:`, e);
      }
    }
  }

  // --- Translation ---

  /**
   * Translate a message key with optional parameters.
   * Supports ICU-style placeholders: {name}, {name, type}, {name, offset, length}
   */
  t(key: string, params?: MessageParams, options?: { locale?: LocaleCode; fallback?: string }): string {
    const locale = options?.locale ?? this.currentLocale;
    const cacheKey = `${locale}:${key}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Look up message in catalog
    let entry = this.catalog.getMessage(locale, key);
    const triedLocales = new Set([locale]);

    // Try fallback chain
    while (!entry && triedLocales.size < this.fallbackLocales.length + 1) {
      for (const fb of this.fallbackLocales) {
        if (triedLocales.has(fb)) continue;
        triedLocales.add(fb);
        entry = this.catalog.getMessage(fb, key);
        if (entry) break;
      }
    }

    const raw = entry?.message ?? options?.fallback ?? key;

    // Interpolate parameters
    const result = this.interpolate(raw, params ?? {});

    // Cache result
    if (this.cache.size < this.config.cacheSize) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /** Check if a translation exists */
  hasTranslation(key: string, locale?: LocaleCode): boolean {
    const loc = locale ?? this.currentLocale;
    return !!this.catalog.getMessage(loc, key);
  }

  /** Get raw (uninterpolated) message */
  raw(key: string, locale?: LocaleCode): string | undefined {
    return this.catalog.getMessage(locale ?? this.currentLocale, key)?.message;
  }

  // --- Pluralization ---

  /**
   * Get pluralized message.
   * Automatically selects correct form based on count and locale rules.
   */
  plural(key: string, count: number, params?: MessageParams, options?: { locale?: LocaleCode }): string {
    const locale = options?.locale ?? this.currentLocale;
    const rules = PLURAL_RULES[locale] ?? PLURAL_RULES.en;
    const rule = rules[0]; // Use primary rule

    // Determine plural form
    const form = typeof rule.forms === "function" ? rule.forms(count) : rule.forms(count);

    // Try plural-specific key first: "key_one", "key_other", etc.
    const pluralKey = `${key}_${form}`;
    if (this.hasTranslation(pluralKey, locale)) {
      return this.t(pluralKey, { ...params, count, _count: count }, { locale });
    }

    // Fall back to regular key with count param
    return this.t(key, { ...params, count, _count: count }, { locale, fallback: key });
  }

  // --- Number Formatting ---

  formatNumber(value: number, options?: NumberFormatOptions): string {
    const opts = options ?? {};
    const locale = this.currentLocale;

    try {
      return new Intl.NumberFormat(locale.replace("_", "-"), {
        style: opts.style ?? "decimal",
        currency: opts.currency,
        minimumFractionDigits: opts.minimumFractionDigits,
        maximumFractionDigits: opts.maximumFractionDigits ?? (opts.style === "percent" ? 1 : 2),
        useGrouping: opts.useGrouping ?? true,
      }).format(value);
    } catch {
      return String(value);
    }
  }

  formatCurrency(value: number, currency = "USD", locale?: string): string {
    return this.formatNumber(value, { style: "currency", currency, locale: locale ?? this.currentLocale });
  }

  formatPercent(value: number, decimals = 1, locale?: string): string {
    return this.formatNumber(value, { style: "percent", maximumFractionDigits: decimals, locale: locale ?? this.currentLocale });
  }

  // --- Date Formatting ---

  formatDate(date: Date | number, options?: DateFormatOptions): string {
    const opts = options ?? {};
    const locale = this.currentLocale;

    try {
      return new Intl.DateTimeFormat(locale.replace("_", "-"), {
        dateStyle: opts.dateStyle ?? "medium",
        timeStyle: opts.timeStyle ?? "medium",
        hour12: opts.hour12,
      }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleDateString();
    }
  }

  formatRelativeTime(date: Date | number, locale?: string): string {
    const loc = locale ?? this.currentLocale;
    const now = Date.now();
    const target = new Date(date);
    const diffMs = now - target.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    const rtf = new Intl.RelativeTimeFormat(loc.replace("_", "-"), { numeric: "auto" });

    if (diffSec < 60) return rtf.format(-diffSec, "second");
    if (diffMin < 60) return rtf.format(-diffMin, "minute");
    if (diffHour < 24) return rtf.format(-diffHour, "hour");
    return rtf.format(-diffDay, "day");
  }

  formatTime(date: Date | number, options?: DateFormatOptions): string {
    return this.formatDate(date, { ...options, dateStyle: undefined });
  }

  // --- Utilities ---

  private interpolate(template: string, params: MessageParams): string {
    // Match {placeholder}, {placeholder,type}, {placeholder,offset,length}
    return template.replace(/\{(\w+)(?:,(\w+))(?:,(\d+))?(\.\d+)?)\}/g, (_match, name, _type, offset, length) => {
      const value = params[name];
      if (value === undefined) return _match; // Keep unreplaced

      if (typeof value === "number") {
        const num = Number(value);
        if (offset !== undefined && length !== undefined) {
          // Pad/truncate
          const str = String(num);
          const padded = str.padStart(Number(length) ?? str.length).slice(Number(offset) ?? 0, Number(length));
          return padded;
        }
        return this.formatNumber(num);
      }

      if (value instanceof Date) {
        return this.formatDate(value);
      }

      if (typeof value === "boolean") {
        return String(value);
      }

      return String(value);
    });
  }

  private clearCache(): void {
    if (this.cache.size > this.config.cacheSize) {
      // Evict oldest entries
      let count = 0;
      for (const [key] of this.cache) {
        if (count++ >= this.cache.size / 2) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  private applyLocaleToDOM(locale: LocaleCode): void {
    const info = LOCALES[locale];
    if (info) {
      document.documentElement.lang = locale;
      document.documentElement.dir = info.direction;
    }
  }

  // --- Static Factory ---

  /** Create an I18n instance with common defaults */
  static create(options?: I18nConfig): I18n {
    return new I18n(options);
  }
}

// --- Singleton ---

let defaultInstance: I18n | null = null;

/** Get or create the global I18n singleton */
export function getI18n(options?: I18nConfig): I18n {
  if (!defaultInstance) {
    defaultInstance = I18n.create(options);
  }
  return defaultInstance;
}

/** Convenience: translate using the global instance */
export function _(key: string, params?: MessageParams, options?: { locale?: LocaleCode; fallback?: string }): string {
  return getI18n().t(key, params, options);
}
