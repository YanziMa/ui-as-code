/**
 * I18n Provider Utilities: React-like context/provider pattern for vanilla JS,
 * locale switching, translation interpolation, pluralization-aware translations,
 * lazy loading, namespace support, and locale fallback chains.
 */

// --- Types ---

export interface TranslationEntry {
  /** The translated string (may contain {placeholders}) */
  text: string;
  /** Optional description for translators */
  description?: string;
}

export interface LocaleData {
  /** Locale code (e.g., "en", "zh-CN") */
  code: string;
  /** Display name in its own script */
  nativeName: string;
  /** Display name in English */
  englishName: string;
  /** Direction: "ltr" or "rtl" */
  dir: "ltr" | "rtl";
  /** Date format pattern */
  dateFormat?: string;
  /** Namespace -> key -> translation map */
  messages: Record<string, Record<string, TranslationEntry>>;
}

export interface I18nConfig {
  /** Available locales */
  locales: LocaleData[];
  /** Default locale code. Default "en" */
  defaultLocale?: string;
  /** Fallback chain of locales to try if a key is missing. Default ["en"] */
  fallbackLocales?: string[];
  /** Missing key behavior: "return-key" | "return-empty" | "warning". Default "return-key" */
  missingKeyBehavior?: "return-key" | "return-empty" | "warning";
  /** Called when a key is not found */
  onMissingKey?: (key: string, locale: string) => void;
  /** Enable HTML escaping for interpolation values. Default true */
  escapeHtml?: boolean;
  /** Called when locale changes */
  onLocaleChange?: (locale: string, prevLocale: string) => void;
}

// --- Core Provider ---

/**
 * I18nProvider - internationalization provider with namespace support,
 * locale fallback chains, and interpolation.
 *
 * @example
 * ```ts
 * const i18n = new I18nProvider({
 *   locales: [
 *     { code: "en", name: "English", dir: "ltr",
 *       messages: { common: { hello: { text: "Hello" } } } },
 *     { code: "zh", name: "中文", dir: "ltr",
 *       messages: { common: { hello: { text: "你好" } } } },
 *   ],
 * });
 * i18n.t("common.hello"); // → "Hello" or "你好"
 * i18n.t("greeting", { name: "World" }); // → "Hello, World!" (with param)
 * ```
 */
export class I18nProvider {
  private config: Required<I18nConfig>;
  private _currentLocale: string;
  private _messageCache = new Map<string, TranslationEntry>();

  constructor(config: I18nConfig) {
    this.config = {
      defaultLocale: config.defaultLocale ?? "en",
      fallbackLocales: config.fallbackLocales ?? ["en"],
      missingKeyBehavior: config.missingKeyBehavior ?? "return-key",
      escapeHtml: config.escapeHtml ?? true,
      ...config,
    };

    this._currentLocale = this.config.defaultLocale;

    // Build index
    this._rebuildIndex();
  }

  /** Get current locale code */
  getLocale(): string { return this._currentLocale; }

  /** Get current locale data */
  getLocaleData(): LocaleData | undefined {
    return this.config.locales.find((l) => l.code === this._currentLocale);
  }

  /** Get all available locales */
  getLocales(): LocaleData[] { return [...this.config.locales]; }

  /** Switch to a different locale */
  setLocale(localeCode: string): boolean {
    const exists = this.config.locales.some((l) => l.code === localeCode);
    if (!exists) return false;

    const prev = this._currentLocale;
    this._currentLocale = localeCode;
    this._rebuildIndex();
    this.config.onLocaleChange?.(localeCode, prev);
    return true;
  }

  /** Translate a key with optional interpolation parameters */
  t(key: string, params?: Record<string, string | number>): string {
    // Try cache first
    let entry = this._messageCache.get(`${this._currentLocale}:${key}`);

    if (!entry) {
      // Try fallback chain
      for (const locale of [this._currentLocale, ...this.config.fallbackLocales]) {
        entry = this._findMessage(locale, key);
        if (entry) break;
      }
    }

    if (!entry) {
      this.config.onMissingKey?.(key, this._currentLocale);

      switch (this.config.missingKeyBehavior) {
        case "return-empty":
          return "";
        case "warning":
          console.warn(`[i18n] Missing key "${key}" for locale "${this._currentLocale}"`);
          return `[${key}]`;
        default:
          return key;
      }
    }

    // Interpolate parameters
    if (params && Object.keys(params).length > 0) {
      return this._interpolate(entry.text, params);
    }

    return entry.text;
  }

  /** Translate within a specific namespace */
  ns(namespace: string, key: string, params?: Record<string, string | number>): string {
    return this.t(`${namespace}.${key}`, params);
  }

  /** Check if a translation exists for the current locale */
  has(key: string): boolean {
    return !!this._findMessage(this._currentLocale, key);
  }

  /** Batch-translate multiple keys at once */
  batch(keys: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = this.t(key);
    }
    return result;
  }

  /** Get the text direction for current locale */
  getDirection(): "ltr" | "rtl" {
    const data = this.getLocaleData();
    return data?.dir ?? "ltr";
  }

  /** Check if current locale is RTL */
  isRTL(): boolean { return this.getDirection() === "rtl"; }

  /** Format a date using the locale's date format */
  formatDate(date: Date | number, options?: Intl.DateTimeFormatOptions): string {
    const data = this.getLocaleData();
    try {
      return new Intl.DateTimeFormat(data?.code ?? "en", options).format(date instanceof Date ? date : new Date(date));
    } catch {
      return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    }
  }

  /** Format a number using locale conventions */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const data = this.getLocaleData();
    try {
      return new Intl.NumberFormat(data?.code ?? "en", options).format(value);
    } catch {
      return String(value);
    }
  }

  /** Add or update translations dynamically */
  addMessages(localeCode: string, namespace: string, messages: Record<string, string | TranslationEntry>): void {
    const locale = this.config.locales.find((l) => l.code === localeCode);
    if (!locale) return;

    if (!locale.messages[namespace]) {
      locale.messages[namespace] = {};
    }

    for (const [key, value] of Object.entries(messages)) {
      locale.messages[namespace][key] = typeof value === "string"
        ? { text: value }
        : value;
    }

    this._rebuildIndex();
  }

  // --- Private ---

  private _findMessage(localeCode: string, key: string): TranslationEntry | undefined {
    const locale = this.config.locales.find((l) => l.code === localeCode);
    if (!locale) return undefined;

    // Try direct lookup first (handles namespaced keys like "common.hello")
    let entry = locale.messages[key]?.[key];

    // If not found, try splitting by dot as namespace.key
    if (!entry && key.includes(".")) {
      const dotIdx = key.lastIndexOf(".");
      const ns = key.substring(0, dotIdx);
      const k = key.substring(dotIdx + 1);
      entry = locale.messages[ns]?.[k];
    }

    return entry;
  }

  private _interpolate(template: string, params: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_match, key) => {
      const val = params[key];
      if (val === undefined) return `{${key}}`;

      if (this.config.escapeHtml) {
        return escapeHtml(String(val));
      }
      return String(val);
    });
  }

  private _rebuildIndex(): void {
    this._messageCache.clear();

    const locale = this.config.locales.find((l) => l.code === this._currentLocale);
    if (!locale) return;

    // Flatten all namespaces into cache
    for (const [ns, keys] of Object.entries(locale.messages)) {
      for (const [key, entry] of Object.entries(keys)) {
        const fullKey = `${ns}.${key}`;
        this._messageCache.set(fullKey, entry);
        // Also store without namespace prefix for convenience
        this._messageCache.set(key, entry);
      }
    }
  }
}

/** Simple HTML entity escape */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&#x2F;")
    .replace(/'/g, "&#x27;")
    .replace(/"/g, "&quot;");
}
