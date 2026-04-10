/**
 * Locale, timezone, and internationalization utilities.
 */

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: "ltr" | "rtl";
  currency?: string;
}

/** Supported locales with full metadata */
export const LOCALES: Record<string, LocaleInfo> = {
  "en": { code: "en", name: "English", nativeName: "English", direction: "ltr" },
  "zh-CN": { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", direction: "ltr" },
  "zh-TW": { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", direction: "ltr" },
  "ja": { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr" },
  "ko": { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr" },
  "de": { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr" },
  "fr": { code: "fr", name: "French", nativeName: "Français", direction: "ltr" },
  "es": { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr" },
  "pt-BR": { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", direction: "ltr" },
  "ru": { code: "ru", name: "Russian", nativeName: "Русский", direction: "ltr" },
  "ar": { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", currency: "SAR" },
  "hi": { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", currency: "INR" },
  "it": { code: "it", name: "Italian", nativeName: "Italiano", direction: "ltr" },
  "nl": { code: "nl", name: "Dutch", nativeName: "Nederlands", direction: "ltr" },
  "pl": { code: "pl", name: "Polish", nativeName: "Polski", direction: "ltr" },
  "sv": { code: "sv", name: "Swedish", nativeName: "Svenska", direction: "ltr" },
  "da": { code: "da", name: "Danish", nativeName: "Dansk", direction: "ltr" },
  "no": { code: "no", name: "Norwegian", nativeName: "Norsk", direction: "ltr" },
  "fi": { code: "fi", name: "Finnish", nativeName: "Suomi", direction: "ltr" },
  "tr": { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr" },
  "id": { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", direction: "ltr" },
  "th": { code: "th", name: "Thai", nativeName: "ไทย", direction: "ltr" },
  "vi": { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", direction: "ltr" },
};

/** Get locale info by code */
export function getLocale(code: string): LocaleInfo | undefined {
  return LOCALES[code] ?? LOCALES[code.split("-")[0]];
}

/** Detect browser locale */
export function detectBrowserLocale(): string {
  if (typeof navigator === "undefined") return "en";

  const languages = navigator.languages ?? [navigator.language ?? "en"];

  // Try exact match first
  for (const lang of languages) {
    if (LOCALES[lang]) return lang;

    // Try base language match
    const base = lang.split("-")[0];
    if (LOCALES[base]) return base;
  }

  return "en";
}

/** Check if a locale is RTL */
export function isRtlLocale(code: string): boolean {
  return getLocale(code)?.direction === "rtl";
}

/** Get text direction for a locale */
export function getDirection(code: string): "ltr" | "rtl" {
  return getLocale(code)?.direction ?? "ltr";
}

/** Format number according to locale conventions */
export function formatNumberLocale(
  value: number,
  locale = "en",
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return value.toLocaleString();
  }
}

/** Format currency */
export function formatCurrencyLocale(
  value: number,
  currency = "USD",
  locale = "en",
): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Format percentage */
export function formatPercentLocale(
  value: number,
  locale = "en",
  maximumFractionDigits = 1,
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits,
    }).format(value / 100);
  } catch {
    return `${value.toFixed(maximumFractionDigits)}%`;
  }
}

/** Format date according to locale */
export function formatDateLocale(
  date: Date | number,
  locale = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleDateString(locale);
  }
}

/** Format time according to locale */
export function formatTimeLocale(
  date: Date | number,
  locale = "en",
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      ...options,
    }).format(new Date(date));
  } catch {
    return new Date(date).toLocaleTimeString(locale);
  }
}

/** Format relative time with locale-aware labels */
export function formatRelativeLocale(
  date: Date | number,
  locale = "en",
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const now = Date.now();
  const target = new Date(date).getTime();
  const diffMs = now - target;
  const diffSec = Math.floor(Math.abs(diffMs) / 1000);

  if (diffSec < 60) return rtf.format(-Math.round(diffMs), "second");
  if (diffSec < 3600) return rtf.format(-Math.round(diffSec / 60), "minute");
  if (diffSec < 86400) return rtf.format(-Math.round(diffSec / 3600), "hour");
  if (diffSec < 2592000) return rtf.format(-Math.round(diffSec / 86400), "day");
  if (diffSec < 7776000) return rtf.format(-Math.round(diffSec / 2592000), "week");

  return formatDateLocale(date, locale);
}

/** Format list of items with locale-appropriate conjunctions */
export function formatListLocale(
  items: string[],
  locale = "en",
  type: "conjunction" | "disjunction" = "conjunction",
): string {
  try {
    return new Intl.ListFormat(locale, { style: type }).format(items);
  } catch {
    return items.join(", ");
  }
}

/** Plural rules for common locales */
export function pluralizeLocale(
  count: number,
  locale = "en",
  forms?: { one: string; other: string; zero?: string; two?: string; few?: string; many?: string },
): string {
  if (forms) {
    const absCount = Math.abs(count);

    // Use CLDR-like rules
    const base = locale.split("-")[0];

    if (base === "zh" || base === "ja" || base === "ko" || base === "th") {
      return forms.other;
    }

    if (base === "ru" || base === "pl" || base === "cs") {
      if (absCount % 10 >= 2 && absCount % 10 <= 4 && absCount % 100 !== 12 && absCount % 100 !== 14) {
        return forms.few ?? forms.other;
      }
      if (absCount % 10 === 1) return forms.one ?? forms.other;
      return forms.many ?? forms.other;
    }

    if (base === "ar") {
      if (absCount === 0) return forms.zero ?? forms.other;
      if (absCount === 1) return forms.one ?? forms.other;
      if (absCount === 2) return forms.two ?? forms.other;
      if (absCount >= 3 && absCount <= 10) return forms.few ?? forms.other;
      return forms.many ?? forms.other;
    }

    // Default English-style
    if (absCount === 1) return forms.one ?? forms.other;
    if (absCount === 0) return forms.zero ?? forms.other;
    return forms.other;
  }

  // Default fallback
  return `${count} items`;
}

/** Timezone utilities */
export interface TimeZoneInfo {
  id: string;
  name: string;
  offset: string;
  offsetMinutes: number;
  abbreviation: string;
}

export const TIMEZONES: TimeZoneInfo[] = [
  { id: "UTC", name: "Coordinated Universal Time", offset: "+00:00", offsetMinutes: 0, abbreviation: "UTC" },
  { id: "America/New_York", name: "Eastern Time", offset: "-05:00/-04:00", offsetMinutes: -300, abbreviation: "EST/EDT" },
  { id: "America/Chicago", name: "Central Time", offset: "-06:00/-05:00", offsetMinutes: -360, abbreviation: "CST/CDT" },
  { id: "America/Denver", name: "Mountain Time", offset: "-07:00/-06:00", offsetMinutes: -420, abbreviation: "MST/MDT" },
  { id: "America/Los_Angeles", name: "Pacific Time", offset: "-08:00/-07:00", offsetMinutes: -480, abbreviation: "PST/PDT" },
  { id: "America/Anchorage", name: "Alaska Time", offset: "-09:00/-08:00", offsetMinutes: -540, abbreviation: "AKST/AKDT" },
  { id: "Pacific/Honolulu", name: "Hawaii Time", offset: "-10:00", offsetMinutes: -600, abbreviation: "HST" },
  { id: "Europe/London", name: "Greenwich Mean Time", offset: "+00:00/+01:00", offsetMinutes: 0, abbreviation: "GMT/BST" },
  { id: "Europe/Paris", name: "Central European Time", offset: "+01:00/+02:00", offsetMinutes: 60, abbreviation: "CET/CEST" },
  { id: Europe/Berlin, name: "Central European Time", offset: "+01:00/+02:00", offsetMinutes: 60, abbreviation: "CET/CEST" },
  { id: "Europe/Athens", name: "Eastern European Time", offset: "+02:00/+03:00", offsetMinutes: 120, abbreviation: "EET/EEST" },
  { id: "Europe/Moscow", name: "Moscow Standard Time", offset: "+03:00", offsetMinutes: 180, abbreviation: "MSK" },
  { id: "Asia/Dubai", name: "Gulf Standard Time", offset: "+04:00", offsetMinutes: 240, abbreviation: "GST" },
  { id: "Asia/Kolkata", name: "India Standard Time", offset: "+05:30", offsetMinutes: 330, abbreviation: "IST" },
  { id: "Asia/Shanghai", name: "China Standard Time", offset: "+08:00", offsetMinutes: 480, abbreviation: "CST" },
  { id: Asia/Tokyo", name: "Japan Standard Time", offset: "+09:00", offsetMinutes: 540, abbreviation: "JST" },
  { id: "Australia/Sydney", name: "Australian Eastern Time", offset: "+10:00/+11:00", offsetMinutes: 600, abbreviation: "AEDT/AEST" },
  { id: "Pacific/Auckland", name: "New Zealand Time", offset: "+12:00/+13:00", offsetMinutes: 720, abbreviation: "NZDT/NZST" },
];

/** Get timezone by ID */
export function getTimezone(id: string): TimeZoneInfo | undefined {
  return TIMEZONES.find((tz) => tz.id === id);
}

/** Get user's local timezone offset */
export function getTimezoneOffset(): number {
  return -new Date().getTimezoneOffset() / 60;
}
