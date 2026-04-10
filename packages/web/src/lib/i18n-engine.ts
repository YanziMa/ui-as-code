/**
 * Internationalization (i18n) engine: locale detection, message catalogs,
 * interpolation, pluralization, number/date/currency formatting,
 * RTL support, lazy loading, namespace isolation.
 */

// --- Types ---

export interface I18nMessage {
  [key: string]: string | I18nMessage;
}

export interface LocaleConfig {
  code: string;           // e.g., "en-US", "zh-CN"
  name: string;           // e.g., "English", "中文"
  dir?: "ltr" | "rtl";    // Text direction
  messages: I18nMessage;
  /** Date format patterns */
  dateFormats?: Partial<Record<"short" | "medium" | "long" | "full", string>>;
  /** Number format config */
  numberFormat?: {
    decimal?: string;
    thousand?: string;
  };
}

export interface I18nOptions {
  fallbackLocale?: string;
  defaultNamespace?: string;
  missingKeyHandler?: (locale: string, namespace: string, key: string) => string;
  interpolationPrefix?: string;
  interpolationSuffix?: string;
}

export type PluralRule = "zero" | "one" | "two" | "few" | "many" | "other";

// --- Pluralization Rules ---

const PLURAL_RULES: Record<string, (count: number) => PluralRule> = {
  // English and similar
  en: (n) => (n === 1 ? "one" : "other"),
  "en-US": (n) => (n === 1 ? "one" : "other"),

  // Chinese, Japanese, Korean, Vietnamese, Thai (no plural)
  zh: () => "other",
  "zh-CN": () => "other",
  "zh-TW": () => "other",
  ja: () => "other",
  ko: () => "other",
  vi: () => "other",
  th: () => "other",

  // French, Portuguese (0-1 singular)
  fr: (n) => (n === 0 || n === 1 ? "one" : "other"),
  pt: (n) => (n === 0 || n === 1 ? "one" : "other"),
  "pt-BR": (n) => (n === 0 || n === 1 ? "one" : "other"),

  // Russian, Ukrainian (complex)
  ru: (n) => {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "one";
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "few";
    if (mod10 === 0 || [5, 6, 7, 8, 9].includes(mod10) || [11, 12, 13, 14].includes(mod100)) return "many";
    return "other";
  },
  uk: (n) => PLURAL_RULES.ru!(n),

  // Arabic (very complex)
  ar: (n) => {
    if (n === 0) return "zero";
    if (n === 1) return "one";
    if (n === 2) return "two";
    if (n % 100 >= 3 && n % 100 <= 10) return "few";
    if (n % 100 >= 11 && n % 100 <= 99) return "many";
    return "other";
  },

  // Polish
  pl: (n) => {
    if (n === 1) return "one";
    if ([2, 3, 4, 22, 23, 24, 32, 33, 34].includes(n)) return "few";
    return "other";
  },

  // Czech, Slovak
  cs: (n) => (n === 1 ? "one" : (n >= 2 && n <= 4 ? "few" : "other")),
  sk: (n) => (n === 1 ? "one" : (n >= 2 && n <= 4 ? "few" : "other")),

  // Germanic with two forms
  de: (n) => (n === 1 ? "one" : "other"),
  nl: (n) => (n === 1 ? "one" : "other"),
  sv: (n) => (n === 1 ? "one" : "other"),
  da: (n) => (n === 1 ? "one" : "other"),
  no: (n) => (n === 1 ? "one" : "other"),
  fi: (n) => (n === 1 ? "one" : "other"),
  es: (n) => (n === 1 ? "one" : "other"),
  it: (n) => (n === 1 ? "one" : "other"),
};

function getPluralRule(locale: string): (count: number) => PluralRule {
  // Try exact match first
  if (PLURAL_RULES[locale]) return PLURAL_RULES[locale]!;
  // Try language-only match
  const lang = locale.split("-")[0]!;
  return PLURAL_RULES[lang] ?? (() => "other");
}

// --- Core Engine ---

export class I18nEngine {
  private locales = new Map<string, LocaleConfig>();
  private currentLocale: string;
  private fallbackLocale: string;
  private namespaces = new Map<string, Set<string>>();
  private listeners = new Set<(locale: string) => void>();
  private missingKeyHandler: (locale: string, ns: string, key: string) => string;
  private prefix = "{{";
  private suffix = "}}";

  constructor(options: I18nOptions = {}) {
    this.currentLocale = options.fallbackLocale ?? "en";
    this.fallbackLocale = options.fallbackLocale ?? "en";
    this.missingKeyHandler = options.missingKeyHandler ?? ((_l, _ns, k) => k);
    if (options.interpolationPrefix) this.prefix = options.interpolationPrefix;
    if (options.interpolationSuffix) this.suffix = options.interpolationSuffix;
  }

  /** Add a locale's message catalog */
  addLocale(config: LocaleConfig): this {
    this.locales.set(config.code, config);

    // Register namespaces
    for (const [key] of Object.entries(config.messages)) {
      let nsSet = this.namespaces.get("default");
      if (!nsSet) { nsSet = new Set(); this.namespaces.set("default", nsSet); }
      nsSet.add(key);
    }

    return this;
  }

  /** Set active locale */
  setLocale(code: string): void {
    if (!this.locales.has(code) && code !== this.fallbackLocale) {
      console.warn(`[i18n] Locale "${code}" not found, keeping current`);
      return;
    }
    this.currentLocale = code;
    document.documentElement.lang = code;

    // Set direction
    const config = this.locales.get(code);
    if (config?.dir) {
      document.documentElement.dir = config.dir;
    }

    this.notifyListeners();
  }

  getLocale(): string { return this.currentLocale; }

  getDirection(): "ltr" | "rtl" {
    return this.locales.get(this.currentLocale)?.dir ?? "ltr";
  }

  isRTL(): boolean { return this.getDirection() === "rtl"; }

  /** Translate a key */
  t(key: string, params?: Record<string, unknown>, options?: { count?: number }): string {
    const ns = options?.count !== undefined ? this.resolvePlural(key, options.count) : key;

    // Try current locale
    let value = this.resolve(this.currentLocale, ns);
    if (value === undefined) value = this.resolve(this.fallbackLocale, ns);
    if (value === undefined) {
      value = this.missingKeyHandler(this.currentLocale, "", key);
    }

    if (typeof value !== "string") return String(value);

    // Interpolate parameters
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`${this.escapeRegex(this.prefix)}${k}${this.escapeRegex(this.suffix)}`, "g"), String(v));
      }
    }

    return value;
  }

  /** Check if a translation exists */
  exists(key: string): boolean {
    return this.resolve(this.currentLocale, key) !== undefined ||
           this.resolve(this.fallbackLocale, key) !== undefined;
  }

  /** Get all available locales */
  getLocales(): Array<{ code: string; name: string }> {
    return Array.from(this.locales.values()).map((c) => ({ code: c.code, name: c.name }));
  }

  /** Subscribe to locale changes */
  onLocaleChange(fn: (locale: string) => void): () => void {
    this.listeners.add(fn);
    fn(this.currentLocale);
    return () => this.listeners.delete(fn);
  }

  // --- Number Formatting ---

  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    try {
      return new Intl.NumberFormat(this.currentLocale, options).format(value);
    } catch {
      return String(value);
    }
  }

  formatCurrency(value: number, currency = "USD"): string {
    try {
      return new Intl.NumberFormat(this.currentLocale, { style: "currency", currency }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }

  formatPercent(value: number, decimals = 1): string {
    return this.formatNumber(value / 100, { style: "percent", minimumFractionDigits: decimals });
  }

  formatCompactNumber(value: number): string {
    try {
      return new Intl.NumberFormat(this.currentLocale, { notation: "compact" }).format(value);
    } catch {
      return String(value);
    }
  }

  // --- Date Formatting ---

  formatDate(date: Date | string | number, format?: "short" | "medium" | "long" | "full"): string {
    const d = new Date(date);
    const config = this.locales.get(this.currentLocale);
    const customPattern = config?.dateFormats?.[format ?? "medium"];

    if (customPattern) {
      return this.formatDateWithPattern(d, customPattern);
    }

    try {
      return new Intl.DateTimeFormat(this.currentLocale, {
        dateStyle: format ?? "medium",
        timeStyle: undefined,
      }).format(d);
    } catch {
      return d.toLocaleDateString();
    }
  }

  formatTime(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(this.currentLocale, { timeStyle: "short", ...options }).format(new Date(date));
    } catch {
      return new Date(date).toLocaleTimeString();
    }
  }

  formatDateTime(date: Date | string | number): string {
    try {
      return new Intl.DateTimeFormat(this.currentLocale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(date));
    } catch {
      return new Date(date).toString();
    }
  }

  formatRelativeTime(date: Date | string | number): string {
    const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: "auto" });
    const now = Date.now();
    const target = new Date(date).getTime();
    const diffSeconds = Math.round((target - now) / 1000);

    const intervals: Array<[number, string]> = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [30, "day"],
      [12, "month"],
      [Infinity, "year"],
    ];

    let value = Math.abs(diffSeconds);
    let unit: string = "second";

    for (const [threshold, u] of intervals) {
      unit = u;
      if (value < threshold) break;
      value /= threshold;
    }

    return rtf.format(Math.round(value) * (diffSeconds < 0 ? -1 : 1), unit as Intl.RelativeTimeFormatUnit);
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);

    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
    return `${s}s`;
  }

  // --- List Formatting ---

  formatList(items: string[], type?: "conjunction" | "disjunction"): string {
    try {
      return new Intl.ListFormat(this.currentLocale, { type: type ?? "conjunction" }).format(items);
    } catch {
      return items.join(", ");
    }
  }

  // --- Private ---

  private resolve(locale: string, key: string): string | undefined {
    const config = this.locales.get(locale);
    if (!config) return undefined;

    const parts = key.split(".");
    let current: unknown = config.messages;

    for (const part of parts) {
      if (current === null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return typeof current === "string" ? current : undefined;
  }

  private resolvePlural(key: string, count: number): string {
    const rule = getPluralRule(this.currentLocale)(count);
    return `${key}.${rule}`;
  }

  private formatDateWithPattern(date: Date, pattern: string): string {
    const tokens: Record<string, string> = {
      YYYY: String(date.getFullYear()),
      MM: String(date.getMonth() + 1).padStart(2, "0"),
      DD: String(date.getDate()).padStart(2, "0"),
      HH: String(date.getHours()).padStart(2, "0"),
      mm: String(date.getMinutes()).padStart(2, "0"),
      ss: String(date.getSeconds()).padStart(2, "0"),
    };

    let result = pattern;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(token, value);
    }
    return result;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private notifyListeners(): void {
    for (const fn of this.listeners) { try { fn(this.currentLocale); } catch {} }
  }
}

// --- Auto-detect browser locale ---

export function detectBrowserLocale(supportedLocales: string[]): string {
  const languages = navigator.languages ?? [navigator.language];

  for (const lang of languages) {
    // Exact match
    if (supportedLocales.includes(lang)) return lang;
    // Language-only match
    const langOnly = lang.split("-")[0]!;
    const match = supportedLocales.find((l) => l.startsWith(langOnly));
    if (match) return match;
  }

  return supportedLocales[0] ?? "en";
}

// --- Lazy loading support ---

export async function loadLocale(
  url: string,
  engine: I18nEngine,
  code: string,
): Promise<LocaleConfig> {
  const response = await fetch(url);
  const messages = await response.json();
  const config: LocaleConfig = { code, name: code, messages };
  engine.addLocale(config);
  return config;
}

// --- Message catalog builder helper ---

/** Build a typed message catalog */
export function defineMessages<T extends I18nMessage>(messages: T): T {
  return messages;
}
