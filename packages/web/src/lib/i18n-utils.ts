/**
 * Internationalization utilities for client-side i18n.
 */

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
  dateFormat: string;
}

export const LOCALES: Record<string, LocaleConfig> = {
  en: { code: "en", name: "English", nativeName: "English", dir: "ltr", dateFormat: "MM/dd/yyyy" },
  zh: { code: "zh", name: "Chinese", nativeName: "中文", dir: "ltr", dateFormat: "yyyy年MM月dd日" },
  ja: { code: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr", dateFormat: "yyyy/MM/dd" },
  ko: { code: "ko", name: "Korean", nativeName: "한국어", dir: "ltr", dateFormat: "yyyy.MM.dd" },
  de: { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr", dateFormat: "dd.MM.yyyy" },
  fr: { code: "fr", name: "French", nativeName: "Français", dir: "ltr", dateFormat: "dd/MM/yyyy" },
  es: { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr", dateFormat: "dd/MM/yyyy" },
  pt: { code: "pt", name: "Portuguese", nativeName: "Português", dir: "ltr", dateFormat: "dd/MM/yyyy" },
  ar: { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl", dateFormat: "dd/MM/yyyy" },
};

export type LocaleCode = keyof typeof LOCALES;

/** Plural rule types */
export type PluralRule = "zero" | "one" | "two" | "few" | "many" | "other";

/** Get the plural form for a count in a given locale */
export function getPluralForm(count: number, locale: string): PluralRule {
  // Simplified plural rules (covers most common locales)
  const n = Math.abs(count);
  const localeBase = locale.split("-")[0];

  switch (localeBase) {
    case "zh":
    case "ja":
    case "ko":
      return "other";

    case "ar": {
      if (n === 0) return "zero";
      if (n === 1) return "one";
      if (n === 2) return "two";
      if (n % 100 >= 3 && n % 100 <= 10) return "few";
      if (n % 100 >= 11 && n % 100 <= 99) return "many";
      return "other";
    }

    case "ru":
    case "uk": {
      const mod10 = n % 10;
      const mod100 = n % 100;
      if (mod10 === 1 && mod100 !== 11) return "one";
      if (mod10 >= 2 && mod10 <= 4 && !(mod12 >= 12 && mod100 <= 14)) return "few";
      if (mod10 === 0 || (mod10 >= 5 && mod10 <= 9) || (mod100 >= 11 && mod100 <= 14)) return "many";
      return "other";
    }

    default: {
      // English-style: one / other
      if (n === 1) return "one";
      if (n === 0) return "zero";
      return "other";
    }
  }
}

/** Format number according to locale conventions */
export function formatLocaleNumber(
  value: number,
  locale: string = "en",
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return value.toLocaleString("en", options);
  }
}

/** Format currency */
export function formatCurrency(
  value: number,
  currency: string = "USD",
  locale: string = "en",
): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Format relative time with locale awareness */
export function formatRelativeTimeLocale(
  date: Date | number,
  locale: string = "en",
): string {
  const now = Date.now();
  const target = typeof date === "number" ? date : date.getTime();
  const diffMs = now - target;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffSec < 60) return rtf.format(-diffSec, "second");
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  if (diffHour < 24) return rtf.format(-diffHour, "hour");
  if (diffDay < 30) return rtf.format(-diffDay, "day");
  if (diffDay < 365) return rtf.format(Math.floor(diffDay / 30), "month");
  return rtf.format(Math.floor(diffDay / 365), "year");
}

/** Format list of items with locale-appropriate conjunctions */
export function formatList(items: string[], locale: string = "en"): string {
  try {
    return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}

/** Detect browser language and map to supported locale */
export function detectLocale(supportedLocales: readonly string[]): string {
  if (typeof navigator === "undefined") return "en";

  const languages = navigator.languages ?? [navigator.language ?? "en"];

  for (const lang of languages) {
    const base = lang.split("-")[0];
    if (supportedLocales.includes(lang)) return lang;
    if (supportedLocales.includes(base)) return base;
  }

  return "en";
}

/** Simple translation dictionary class */
export class TranslationDict {
  private translations: Map<string, Record<string, string>>;

  constructor(initial?: Map<string, Record<string, string>>) {
    this.translations = initial ?? new Map();
  }

  /** Add translations for a locale */
  add(locale: string, entries: Record<string, string>): void {
    const existing = this.translations.get(locale) ?? {};
    this.translations.set(locale, { ...existing, ...entries });
  }

  /** Translate a key */
  t(key: string, locale: string = "en", params?: Record<string, string | number>): string {
    const dict = this.translations.get(locale);
    let text = dict?.[key] ?? this.translations.get("en")?.[key] ?? key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }

    return text;
  }

  /** Check if a locale has translations */
  hasLocale(locale: string): boolean {
    return this.translations.has(locale);
  }

  /** Get all available locales */
  getLocales(): string[] {
    return [...this.translations.keys()];
  }
}
