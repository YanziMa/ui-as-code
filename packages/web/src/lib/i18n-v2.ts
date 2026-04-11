/**
 * i18n v2 — Lightweight internationalization layer built on I18nEngine.
 *
 * Provides:
 *   - Translation namespace management
 *   - Lazy-loaded translation bundles
 *   - Locale persistence (localStorage)
 *   - Plural/select helper factories
 *   - RTL layout utilities
 *   - Number/currency/date formatting shortcuts
 *   - Translation key extraction from components
 */

import { I18nEngine, type I18nOptions, type TranslationMap, type TranslateOptions } from "./i18n-engine-v2";

// --- Types ---

export interface I18nV2Config extends I18nOptions {
  /** Persist locale choice in localStorage (default: true) */
  persistLocale?: boolean;
  /** localStorage key for persisted locale (default: "i18n_locale") */
  storageKey?: string;
  /** Auto-detect browser locale on init (default: true) */
  autoDetect?: boolean;
  /** Namespaces to load on init */
  initialNamespaces?: string[];
}

export interface NamespaceBundle {
  namespace: string;
  locale: string;
  translations: TranslationMap;
  loaded: boolean;
  loading?: Promise<void>;
}

export interface FormatShortcuts {
  /** Format currency */
  currency: (value: number, code?: string) => string;
  /** Format percent */
  percent: (value: number) => string;
  /** Format date short */
  date: (value: Date | string) => string;
  /** Format time */
  time: (value: Date | string) => string;
  /** Format relative time */
  relative: (date: Date | string) => string;
  /** Format bytes */
  bytes: (n: number) => string;
}

// --- I18nV2 Class ---

export class I18nV2 {
  private engine: I18nEngine;
  private namespaces: Map<string, NamespaceBundle> = new Map();
  private storageKey: string;
  private persistLocale: boolean;

  constructor(config: I18nV2Config = {}) {
    this.persistLocale = config.persistLocale !== false;
    this.storageKey = config.storageKey ?? "i18n_locale";

    this.engine = new I18nEngine({
      defaultLocale: config.defaultLocale ?? "en",
      fallbackLocale: config.fallbackLocale ?? "en",
      missingKeyFn: config.missingKeyFn,
      escapeHtml: config.escapeHtml,
    });

    // Restore persisted locale
    if (this.persistLocale && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) this.engine.setLocale(saved);
    }

    // Auto-detect if no locale set
    if (config.autoDetect !== false && !this.engine.locale) {
      const detected = this.detectLocale();
      if (detected) this.engine.setLocale(detected);
    }
  }

  get locale(): string { return this.engine.locale; }
  get direction(): "ltr" | "rtl" { return this.engine.direction; }
  get isRTL(): boolean { return this.engine.direction === "rtl"; }

  set locale(value: string) {
    this.engine.setLocale(value);
    if (this.persistLocale && typeof localStorage !== "undefined") {
      localStorage.setItem(this.storageKey, value);
    }
  }

  /** Underlying engine for advanced usage */
  getEngine(): I18nEngine { return this.engine; }

  // --- Translation ---

  t(key: string, params?: Record<string, unknown>, opts?: TranslateOptions): string {
    return this.engine.t(key, params, opts);
  }

  /** Translate within a namespace (key auto-prefixed) */
  ns(namespace: string): (key: string, params?: Record<string, unknown>, opts?: TranslateOptions) => string {
    return (key, params, opts) =>
      this.t(namespace ? `${namespace}.${key}` : key, params, opts);
  }

  exists(key: string): boolean { return this.engine.exists(key); }

  // --- Namespace Management ---

  registerNamespace(name: string, translations: Record<string, TranslationMap> = {}): void {
    for (const [locale, map] of Object.entries(translations)) {
      const namespaced: TranslationMap = { [name]: map };
      this.engine.addTranslations(locale, namespaced);
    }
    this.namespaces.set(name, { namespace: name, locale: this.engine.locale, translations: {}, loaded: true });
  }

  async loadNamespace(name: string, loader: () => Promise<Record<string, TranslationMap>>): Promise<void> {
    const existing = this.namespaces.get(name);
    if (existing?.loading) return existing.loading;

    const bundle: NamespaceBundle = { namespace: name, locale: this.engine.locale, translations: {}, loaded: false };
    this.namespaces.set(name, bundle);

    bundle.loading = loader().then((translations) => {
      for (const [locale, map] of Object.entries(translations)) {
        const namespaced: TranslationMap = { [name]: map };
        this.engine.addTranslations(locale, namespaced);
      }
      bundle.loaded = true;
      bundle.loading = undefined;
    });

    return bundle.loading;
  }

  getLoadedNamespaces(): string[] {
    return Array.from(this.namespaces.entries())
      .filter(([, b]) => b.loaded)
      .map(([n]) => n);
  }

  // --- Formatting Shortcuts ---

  get formats(): FormatShortcuts {
    const eng = this.engine;
    return {
      currency: (value, code = "USD") => eng.formatNumber(value, { style: "currency", currency: code }),
      percent: (value) => eng.formatNumber(value, { style: "percent" }),
      date: (val) => eng.formatDate(val, { dateStyle: "medium" }),
      time: (val) => eng.formatDate(val, { timeStyle: "short" }),
      relative: (val) => eng.formatTimeAgo(val),
      bytes: (n) => eng.formatBytes(n),
    };
  }

  // --- Locale Utilities ---

  onLocaleChange(fn: (newLocale: string, prevLocale: string) => void): () => void {
    return this.engine.onLocaleChange(fn);
  }

  getAvailableLocales(): string[] { return this.engine.getAvailableLocales(); }

  private detectLocale(): string | null {
    if (typeof navigator === "undefined") return null;
    return navigator.language || navigator.languages?.[0] || null;
  }
}

// --- Singleton ---

let _instance: I18nV2 | null = null;

export function getI18n(config?: I18nV2Config): I18nV2 {
  if (!_instance) _instance = new I18nV2(config);
  return _instance;
}

export function resetI18n(): void { _instance = null; }

// --- RTL Helpers ---

/** Apply RTL-appropriate styles to an element based on current locale */
export function applyDirection(el: HTMLElement, dir: "ltr" | "rtl"): void {
  el.dir = dir;
  el.style.textAlign = dir === "rtl" ? "right" : "left";
}

/** Flip margin/padding for RTL layouts */
export function flipProperty(property: "marginLeft" | "marginRight" | "paddingLeft" | "paddingRight", dir: "ltr" | "rtl"): string {
  if (dir === "rtl") {
    const map: Record<string, string> = { marginLeft: "marginRight", marginRight: "marginLeft", paddingLeft: "paddingRight", paddingRight: "paddingLeft" };
    return map[property] ?? property;
  }
  return property;
}

// --- Plural/Select Factories ---

/** Create a plural-aware translation function for a specific key */
export function createPluralTranslator(
  i18n: I18nV2,
  key: string,
): (count: number, params?: Record<string, unknown>) => string {
  return (count, params) => i18n.t(key, { ...params, count });
}

/** Create a gender-aware translation function */
export function createGenderTranslator(
  i18n: I18nV2,
  key: string,
): (gender: string, params?: Record<string, unknown>) => string {
  return (gender, params) => i18n.t(key, { ...params, gender });
}
