/**
 * I18n Manager: Internationalization engine with message catalogs, interpolation,
 * pluralization, locale detection, RTL support, lazy loading, fallback chains,
 * namespace isolation, number/date/currency formatting, and change detection.
 */

// --- Types ---

export type Locale = string; // e.g., "en-US", "zh-CN"
export type MessageKey = string;
export type Namespace = string;

export interface MessageCatalog {
  [key: string]: string | MessageCatalog;
}

export interface LocaleData {
  /** ISO locale code */
  locale: Locale;
  /** Display name of the locale */
  name: string;
  /** Native name */
  nativeName?: string;
  /** Direction: "ltr" or "rtl" */
  direction?: "ltr" | "rtl";
  /** Messages organized by namespace */
  messages: Record<Namespace, MessageCatalog>;
  /** Plural rules for this locale */
  pluralRules?: PluralRuleSet;
  /** Date/number formatting overrides */
  formats?: LocaleFormats;
}

export interface PluralRuleSet {
  /** Function that returns the plural form index */
  getPluralForm(count: number): number;
  /** Labels for each plural form (e.g., ["one", "other"]) */
  forms: string[];
}

export interface LocaleFormats {
  date?: Record<string, Intl.DateTimeFormatOptions>;
  number?: Record<string, Intl.NumberFormatOptions>;
  currency?: { code: string; options?: Intl.NumberFormatOptions };
}

export interface I18nConfig {
  /** Default locale */
  defaultLocale?: Locale;
  /** Fallback locale chain */
  fallbackLocales?: Locale[];
  /** Enable HTML-safe output (escape interpolation) */
  escapeHtml?: boolean;
  /** Missing key behavior: "warning" | "error" | "return-key" | "throw" */
  onMissingKey?: "warning" | "error" | "return-key" | "throw";
  /** Called when locale changes */
  onLocaleChange?: (locale: Locale) => void;
  /** Auto-detect browser locale */
  autoDetect?: boolean;
  /** Persist locale preference key in localStorage */
  persistKey?: string;
  /** Default namespace for lookups without prefix */
  defaultNamespace?: Namespace;
  /** Separator for nested keys (default: ".") */
  keySeparator?: string;
  /** Separator for namespace:key (default: ":") */
  namespaceSeparator?: string;
}

export interface InterpolationOptions {
  /** Variables to interpolate into the message */
  vars?: Record<string, unknown>;
  /** Plural count for pluralized messages */
  count?: number;
  /** Context variant (e.g., "male"/"female" for gendered languages) */
  context?: string;
  /** Default value if key is missing */
  defaultValue?: string;
  /** Replace newlines with <br> tags */
  htmlNewline?: boolean;
}

export interface I18nStats {
  currentLocale: Locale;
  loadedLocales: Locale[];
  totalMessages: number;
  missingKeys: string[];
  lastChangeAt: number;
}

// --- Built-in Plural Rules ---

const PLURAL_RULES: Record<string, PluralRuleSet> = {
  // English-like: one, other
  "en": {
    getPluralForm: (n) => (n === 1 ? 0 : 1),
    forms: ["one", "other"],
  },
  // French-like: one, other
  "fr": {
    getPluralForm: (n) => (n === 0 || n === 1 ? 0 : 1),
    forms: ["one", "other"],
  },
  // Russian-like: one, few, many, other
  "ru": {
    getPluralForm: (n) => {
      const mod10 = n % 10, mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return 0;
      if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 1;
      return mod10 === 0 || [5, 6, 7, 8, 9].includes(mod10) || [11, 12, 13, 14].includes(mod100) ? 2 : 3;
    },
    forms: ["one", "few", "many", "other"],
  },
  // Chinese/Japanese/Korean: no plural
  "zh": {
    getPluralForm: () => 0,
    forms: ["other"],
  },
  // Arabic: complex (0-5)
  "ar": {
    getPluralForm: (n) => {
      if (n === 0) return 0;
      if (n === 1) return 1;
      if (n === 2) return 2;
      const mod100 = n % 100;
      if (mod100 >= 3 && mod100 <= 10) return 3;
      return mod100 >= 11 && mod100 <= 99 ? 4 : 5;
    },
    forms: ["zero", "one", "two", "few", "many", "other"],
  },
};

function resolvePluralRules(locale: Locale): PluralRuleSet {
  const lang = locale.split("-")[0] ?? "en";
  return PLURAL_RULES[lang] ?? PLURAL_RULES["en"]!;
}

// --- I18nManager Implementation ---

export class I18nManager {
  private config: Required<Pick<I18nConfig, "escapeHtml" | "onMissingKey" | "autoDetect" | "defaultNamespace" | "keySeparator" | "namespaceSeparator">> & Omit<I18nConfig, "escapeHtml" | "onMissingKey" | "autoDetect" | "defaultNamespace" | "keySeparator" | "namespaceSeparator">;

  private locales = new Map<Locale, LocaleData>();
  private currentLocale: Locale;
  private listeners = new Set<(locale: Locale) => void>();
  private missingKeys = new Set<string>();
  private destroyed = false;

  constructor(config: I18nConfig = {}) {
    this.config = {
      escapeHtml: config.escapeHtml ?? false,
      onMissingKey: config.onMissingKey ?? "return-key",
      autoDetect: config.autoDetect ?? true,
      defaultNamespace: config.defaultNamespace ?? "common",
      keySeparator: config.keySeparator ?? ".",
      namespaceSeparator: config.namespaceSeparator ?? ":",
      defaultLocale: config.defaultLocale ?? "en-US",
      fallbackLocales: config.fallbackLocales ?? ["en"],
      onLocaleChange: config.onLocaleChange,
      persistKey: config.persistKey,
    };

    let initialLocale = this.config.defaultLocale;

    // Restore from persistence
    if (this.config.persistKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(this.config.persistKey);
        if (saved) initialLocale = saved;
      } catch { /* ignore */ }
    }

    // Auto-detect browser locale
    if (this.config.autoDetect && typeof navigator !== "undefined") {
      const browserLangs = navigator.languages ?? [navigator.language];
      for (const lang of browserLangs) {
        if (lang) { initialLocale = lang; break; }
      }
    }

    this.currentLocale = initialLocale;
  }

  // --- Locale Management ---

  /**
   * Register a locale's messages.
   */
  addLocale(data: LocaleData): void {
    this.locales.set(data.locale.toLowerCase(), data);
  }

  /**
   * Add messages to an existing locale/namespace.
   */
  addMessages(locale: Locale, ns: Namespace, messages: MessageCatalog): void {
    const key = locale.toLowerCase();
    const existing = this.locales.get(key);
    if (existing) {
      existing.messages[ns] = { ...existing.messages[ns], ...messages };
    } else {
      this.addLocale({ locale, name: locale, messages: { [ns]: messages } });
    }
  }

  /**
   * Switch active locale.
   */
  setLocale(locale: Locale): void {
    const normalized = locale.toLowerCase();
    if (!this.locales.has(normalized)) {
      console.warn(`[I18n] Locale "${locale}" not registered. Available: ${Array.from(this.locales.keys()).join(", ")}`);
    }

    this.currentLocale = normalized;

    // Persist preference
    if (this.config.persistKey && typeof window !== "undefined") {
      try { localStorage.setItem(this.config.persistKey, normalized); } catch {}
    }

    this.config.onLocaleChange?.(normalized);
    for (const l of this.listeners) l(normalized);
  }

  /** Get current locale */
  getLocale(): Locale { return this.currentLocale; }

  /** Get all registered locales */
  getLocales(): Locale[] { return Array.from(this.locales.keys()); }

  /** Check if current locale is RTL */
  isRtl(): boolean {
    const data = this.getLocaleData(this.currentLocale);
    return data?.direction === "rtl";
  }

  /** Get text direction attribute value */
  getDirection(): "ltr" | "rtl" {
    return this.isRtl() ? "rtl" : "ltr";
  }

  // --- Translation ---

  /**
   * Translate a message key with optional interpolation.
   * Key format: "namespace:key.path" or just "key.path"
   */
  t(key: MessageKey, options?: InterpolationOptions): string {
    const resolved = this.resolveMessage(key, options);
    if (resolved !== null) return resolved;

    // Handle missing key
    const displayValue = options?.defaultValue ?? key;
    this.missingKeys.add(key);

    switch (this.config.onMissingKey) {
      case "warning":
        console.warn(`[I18n] Missing key: "${key}" (locale: ${this.currentLocale})`);
        return displayValue;
      case "error":
        console.error(`[I18n] Missing key: "${key}" (locale: ${this.currentLocale})`);
        return displayValue;
      case "throw":
        throw new Error(`[I18n] Missing translation key: "${key}" for locale "${this.currentLocale}"`);
      case "return-key":
      default:
        return displayValue;
    }
  }

  /**
   * Check if a translation key exists.
   */
  exists(key: MessageKey): boolean {
    return this.resolveMessage(key) !== null;
  }

  /**
   * Get raw message catalog entry (no interpolation).
   */
  raw(key: MessageKey): string | MessageCatalog | null {
    const { ns, path } = this.parseKey(key);
    const catalog = this.getCatalog(this.currentLocale, ns);
    if (!catalog) return null;
    return this.nestedGet(catalog, path);
  }

  // --- Pluralization ---

  /**
   * Get pluralized message.
   */
  plural(
    key: MessageKey,
    count: number,
    options?: Omit<InterpolationOptions, "count">,
  ): string {
    return this.t(key, { ...options, count });
  }

  /**
   * Get the plural form index for a count in the current locale.
   */
  getPluralForm(count: number): number {
    const data = this.getLocaleData(this.currentLocale);
    const rules = data?.pluralRules ?? resolvePluralRules(this.currentLocale);
    return rules.getPluralForm(count);
  }

  // --- Formatting ---

  /**
   * Format a number according to current locale.
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const data = this.getLocaleData(this.currentLocale);
    const fmtOptions = data?.formats?.number?.standard ?? options;
    try {
      return new Intl.NumberFormat(this.currentLocale, fmtOptions).format(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Format currency.
   */
  formatCurrency(value: number, currency?: string, options?: Intl.NumberFormatOptions): string {
    const data = this.getLocaleData(this.currentLocale);
    const curCode = currency ?? data?.formats?.currency?.code ?? "USD";
    const curOpts = data?.formats?.currency?.options ?? options;
    try {
      return new Intl.NumberFormat(this.currentLocale, { style: "currency", currency: curCode, ...curOpts }).format(value);
    } catch {
      return `${curCode} ${value}`;
    }
  }

  /**
   * Format a date.
   */
  formatDate(date: Date | number | string, formatKey?: string): string {
    const d = typeof date === "string" ? new Date(date) : typeof date === "number" ? new Date(date) : date;
    const data = this.getLocaleData(this.currentLocale);

    if (formatKey && data?.formats?.date?.[formatKey]) {
      return new Intl.DateTimeFormat(this.currentLocale, data.formats.date[formatKey]).format(d);
    }

    return new Intl.DateTimeFormat(this.currentLocale).format(d);
  }

  /**
   * Format relative time (e.g., "2 hours ago").
   */
  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
    try {
      return new Intl.RelativeTimeFormat(this.currentLocale).format(value, unit);
    } catch {
      return `${value} ${unit}`;
    }
  }

  /**
   * Format a list (e.g., "A, B, and C").
   */
  formatList(items: string[]): string {
    try {
      return new Intl.ListFormat(this.currentLocale).format(items);
    } catch {
      return items.join(", ");
    }
  }

  // --- Lazy Loading ---

  /**
   * Load a locale asynchronously. Returns a promise resolving when loaded.
   */
  async loadLocale(loader: () => Promise<LocaleData>): Promise<void> {
    const data = await loader();
    this.addLocale(data);
  }

  /**
   * Preload multiple locales.
   */
  async preloadLocales(loaders: Array<{ locale: Locale; loader: () => Promise<LocaleData> }>): Promise<void> {
    await Promise.all(loaders.map(async ({ loader }) => this.loadLocale(loader)));
  }

  // --- Query & Stats ---

  /** Get statistics about the i18n system */
  getStats(): I18nStats {
    let totalMessages = 0;
    for (const [, data] of this.locales) {
      for (const [, catalog] of Object.entries(data.messages)) {
        totalMessages += this.countMessages(catalog);
      }
    }

    return {
      currentLocale: this.currentLocale,
      loadedLocales: Array.from(this.locales.keys()),
      totalMessages,
      missingKeys: Array.from(this.missingKeys),
      lastChangeAt: Date.now(),
    };
  }

  /** Clear missing keys tracking */
  clearMissingKeys(): void { this.missingKeys.clear(); }

  // --- Events ---

  subscribe(listener: (locale: Locale) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.locales.clear();
    this.missingKeys.clear();
    this.listeners.clear();
  }

  // --- Internal ---

  private parseKey(key: MessageKey): { ns: Namespace; path: string } {
    const nsSep = this.config.namespaceSeparator;
    const keySep = this.config.keySeparator;

    const nsIdx = key.indexOf(nsSep);
    if (nsIdx > 0) {
      return {
        ns: key.slice(0, nsIdx),
        path: key.slice(nsIdx + nsSep.length),
      };
    }

    return { ns: this.config.defaultNamespace, path: key };
  }

  private resolveMessage(key: MessageKey, options?: InterpolationOptions): string | null {
    const { ns, path } = this.parseKey(key);

    // Try current locale first
    let msg = this.findMessage(this.currentLocale, ns, path, options?.count);

    // Try fallback chain
    if (msg === null) {
      for (const fb of this.config.fallbackLocales ?? []) {
        msg = this.findMessage(fb, ns, path, options?.count);
        if (msg !== null) break;
      }
    }

    if (msg === null) return null;

    // Handle pluralization in message body
    if (typeof msg === "object" && options?.count !== undefined) {
      const formIndex = this.getPluralForm(options.count);
      const rules = resolvePluralRules(this.currentLocale);
      const formName = rules.forms[formIndex] ?? "other";
      msg = (msg as MessageCatalog)[formName] ?? (msg as MessageCatalog)["other"] ?? String(msg);
    }

    if (typeof msg !== "string") {
      msg = JSON.stringify(msg);
    }

    // Interpolate variables
    return this.interpolate(msg, options);
  }

  private findMessage(
    locale: Locale,
    ns: Namespace,
    path: string,
    count?: number,
  ): string | MessageCatalog | null {
    const catalog = this.getCatalog(locale, ns);
    if (!catalog) return null;

    const value = this.nestedGet(catalog, path);
    if (value === undefined) return null;

    // If it's a plain object and we have a count, treat as plural map
    if (typeof value === "object" && value !== null && !Array.isArray(value) && count !== undefined) {
      const formIndex = this.getPluralForm(count);
      const rules = resolvePluralRules(locale);
      const formName = rules.forms[formIndex] ?? "other";
      return (value as MessageCatalog)[formName] ?? (value as MessageCatalog)["other"];
    }

    return value as string;
  }

  private getCatalog(locale: Locale, ns: Namespace): MessageCatalog | null {
    const data = this.locales.get(locale.toLowerCase());
    return data?.messages[ns] ?? null;
  }

  private getLocaleData(locale: Locale): LocaleData | undefined {
    return this.locales.get(locale.toLowerCase());
  }

  private nestedGet(obj: unknown, path: string): unknown {
    const parts = path.split(this.config.keySeparator);
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private interpolate(message: string, options?: InterpolationOptions): string {
    if (!options?.vars && options?.count === undefined) return message;

    let result = message;

    // Interpolate {{variable}} syntax
    if (options.vars) {
      for (const [key, value] of Object.entries(options.vars)) {
        const placeholder = `{{${key}}}`;
        const replacement = this.config.escapeHtml
          ? this.escapeHtml(String(value))
          : String(value);
        result = result.replaceAll(placeholder, replacement);
      }
    }

    // Interpolate {{count}} for plural
    if (options.count !== undefined) {
      result = result.replaceAll("{{count}}", String(options.count));
    }

    // Interpolate {{context}} for gender/context variants
    if (options.context) {
      result = result.replaceAll("{{context}}", options.context);
    }

    // Handle HTML newlines
    if (options?.htmlNewline) {
      result = result.replace(/\n/g, "<br>");
    }

    return result;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  private countMessages(catalog: MessageCatalog): number {
    let count = 0;
    for (const value of Object.values(catalog)) {
      if (typeof value === "string") count++;
      else if (typeof value === "object" && value !== null) count += this.countMessages(value);
    }
    return count;
  }
}

// --- Factory ---

export function createI18n(config?: I18nConfig): I18nManager {
  return new I18nManager(config);
}
