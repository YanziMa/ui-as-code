/**
 * Locale Utilities: Locale data registry, locale metadata,
 * timezone handling, calendar system helpers, and
 * locale-aware string comparison.
 */

// --- Types ---

export interface LocaleInfo {
  /** ISO 639-1 language code */
  code: string;
  /** English name */
  name: string;
  /** Native/localized name */
  nativeName: string;
  /** Script (Latin, Cyrillic, Arabic, etc.) */
  script?: string;
  /** Region/territory code */
  region?: string;
  /** Text direction */
  direction: "ltr" | "rtl";
  /** Calendar system */
  calendar?: "gregorian" | "buddhist" | "chinese" | "hebrew" | "islamic" | "japanese" | "persian";
  /** First day of week (0=Sunday, 1=Monday) */
  firstDayOfWeek?: number;
}

// --- Locale Registry ---

/** Comprehensive locale database with common locales */
export const LOCALES: Record<string, LocaleInfo> = {
  "en": { code: "en", name: "English", nativeName: "English", direction: "ltr", firstDayOfWeek: 0 },
  "en-US": { code: "en-US", name: "English (US)", nativeName: "English", direction: "ltr", region: "US", firstDayOfWeek: 0 },
  "en-GB": { code: "en-GB", name: "English (UK)", nativeName: "British English", direction: "ltr", region: "GB", firstDayOfWeek: 1 },
  "zh": { code: "zh", name: "Chinese", nativeName: "中文", direction: "ltr", script: "Hans", calendar: "gregorian" },
  "zh-CN": { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", direction: "ltr", script: "Hans", region: "CN", calendar: "gregorian" },
  "zh-TW": { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", direction: "ltr", script: "Hant", region: "TW", calendar: "gregorian" },
  "ja": { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr", script: "Jpan", calendar: "japanese" },
  "ko": { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr", script: "Kore", calendar: "gregorian" },
  "de": { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr", region: "DE", firstDayOfWeek: 1 },
  "de-AT": { code: "de-AT", name: "German (Austria)", nativeName: "Deutsch", direction: "ltr", region: "AT", firstDayOfWeek: 1 },
  "fr": { code: "fr", name: "French", nativeName: "Français", direction: "ltr", region: "FR", firstDayOfWeek: 1 },
  "es": { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr", region: "ES", firstDayOfWeek: 1 },
  "pt": { code: "pt", name: "Portuguese", nativeName: "Português", direction: "ltr", region: "PT", firstDayOfWeek: 0 },
  "pt-BR": { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português", direction: "ltr", region: "BR", firstDayOfWeek: 0 },
  "it": { code: "it", name: "Italian", nativeName: "Italiano", direction: "ltr", region: "IT", firstDayOfWeek: 1 },
  "nl": { code: "nl", name: "Dutch", nativeName: "Nederlands", direction: "ltr", region: "NL", firstDayOfWeek: 1 },
  "pl": { code: "pl", name: "Polish", nativeName: "Polski", direction: "ltr", region: "PL", firstDayOfWeek: 1 },
  "ru": { code: "ru", name: "Russian", nativeName: "Русский", direction: "ltr", script: "Cyrl", firstDayOfWeek: 1 },
  "ar": { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", script: "Arab", calendar: "gregorian" },
  "he": { code: "he", name: "Hebrew", nativeName: "עברית", direction: "rtl", script: "Hebr", calendar: "hebrew" },
  "fa": { code: "fa", name: "Persian", nativeName: "فارسی", direction: "rtl", script: "Arab", calendar: "persian" },
  "hi": { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", script: "Deva" },
  "th": { code: "th", name: "Thai", nativeName: "ไทย", direction: "ltr", script: "Thai", calendar: "buddhist" },
  "vi": { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", direction: "ltr", script: "Latn" },
  "id": { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", direction: "ltr", script: "Latn" },
  "ms": { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", direction: "ltr", script: "Latn" },
  "tr": { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr", script: "Latn" },
  "sv": { code: "sv", name: "Swedish", nativeName: "Svenska", direction: "ltr", region: "SE", firstDayOfWeek: 1 },
  "da": { code: "da", name: "Danish", nativeName: "Dansk", direction: "ltr", region: "DK", firstDayOfWeek: 1 },
  "no": { code: "no", name: "Norwegian", nativeName: "Norsk", direction: "ltr", region: "NO", firstDayOfWeek: 1 },
  "fi": { code: "fi", name: "Finnish", nativeName: "Suomi", direction: "ltr", region: "FI", firstDayOfWeek: 1 },
  "cs": { code: "cs", name: "Czech", nativeName: "Čeština", direction: "ltr", region: "CZ", firstDayOfWeek: 1 },
  "ro": { code: "ro", name: "Romanian", nativeName: "Română", direction: "ltr", region: "RO", firstDayOfWeek: 1 },
  "hu": { code: "hu", name: "Hungarian", nativeName: "Magyar", direction: "ltr", region: "HU", firstDayOfWeek: 1 },
  "uk": { code: "uk", name: "Ukrainian", nativeName: "Українська", direction: "ltr", script: "Cyrl", firstDayOfWeek: 1 },
  "el": { code: "el", name: "Greek", nativeName: "Ελληνικά", direction: "ltr", script: "Grek", firstDayOfWeek: 1 },
};

/** Get locale info by code */
export function getLocale(code: string): LocaleInfo | undefined {
  return LOCALES[code];
}

/** Get all available locale codes */
export function getLocaleCodes(): string[] {
  return Object.keys(LOCALES);
}

/** Get all RTL locale codes */
export function getRTLLocales(): string[] {
  return Object.entries(LOCALES)
    .filter(([, info]) => info.direction === "rtl")
    .map(([code]) => code);
}

/** Check if a locale is RTL */
export function isLocaleRTL(localeCode: string): boolean {
  const info = LOCALES[localeCode];
  return info?.direction === "rtl";
}

/** Get the display name for a locale in a given display locale */
export function getLocaleDisplayName(
  localeCode: string,
  displayLocale = "en",
): string {
  const info = LOCALES[localeCode];
  if (!info) return localeCode;

  // Use native name for self-display, otherwise use English name
  if (localeCode === displayLocale || localeCode.startsWith(displayLocale)) {
    return info.nativeName;
  }

  try {
    return new Intl.DisplayNames([displayLocale], { type: "language" }).of(localeCode) ?? info.name;
  } catch {
    return info.name;
  }
}

// --- Timezone Helpers ---

/** Get the user's timezone identifier */
export function getTimezoneId(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

/** Get the user's timezone offset in minutes from UTC */
export function getTimezoneOffsetMinutes(): number {
  try {
    return -new Date().getTimezoneOffset();
  } catch {
    return 0;
  }
}

/** Get IANA timezone abbreviation (best effort) */
export function getTimezoneAbbreviation(): string {
  const tz = getTimezoneId();
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { timeZoneName: "short", timeZone: tz });
    const parts = fmt.formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? tz;
  } catch {
    return tz;
  }
}

/** Check if the local timezone observes daylight saving time */
export function observesDST(): boolean {
  const jan = new Date(new Date().getFullYear(), 0, 1);
  const jul = new Date(new Date().getFullYear(), 6, 1);
  return jan.getTimezoneOffset() !== jul.getTimezoneOffset();
}

/** List of common timezone identifiers with offsets */
export const COMMON_TIMEZONES = [
  { id: "Pacific/Auckland", offset: 12, abbr: "NZST", name: "Auckland" },
  { id: "Asia/Tokyo", offset: 9, abbr: "JST", name: "Tokyo" },
  { id: "Asia/Shanghai", offset: 8, abbr: "CST", name: "Shanghai" },
  { id: "Asia/Singapore", offset: 8, abbr: "SGT", name: "Singapore" },
  { id: "Asia/Kolkata", offset: 5.5, abbr: "IST", name: "Kolkata" },
  { id: "Asia/Dubai", offset: 4, abbr: "GST", name: "Dubai" },
  { id: "Europe/Moscow", offset: 3, abbr: "MSK", name: "Moscow" },
  { id: "Europe/Paris", offset: 1, abbr: "CEST", name: "Paris" },
  { id: Europe/London: { id: "Europe/London", offset: 0, abbr: "GMT", name: "London" },
  { id: "America/Sao_Paulo", offset: -3, abbr: "BRT", name: "São Paulo" },
  { id: "America/New_York", offset: -5, abbr: "EST", name: "New York" },
  { id: "America/Chicago", offset: -6, abbr: "CST", name: "Chicago" },
  { id: "America/Denver", offset: -7, abbr: "MST", name: "Denver" },
  { id: "America/Los_Angeles", offset: -8, abbr: "PST", name: "Los Angeles" },
  { id: "Pacific/Honolulu", offset: -10, abbr: "HST", name: "Honolulu" },
];

// --- Collation ---

/** Compare two strings according to locale-specific collation rules */
export function compareStrings(a: string, b: string, locale = "en"): number {
  try {
    return a.localeCompare(b, locale);
  } catch {
    return a < b ? -1 : a > b ? 1 : 0;
  }
}

/** Sort an array of strings using locale-aware comparison */
export function sortLocale(arr: string[], locale = "en"): string[] {
  return [...arr].sort((a, b) => compareStrings(a, b, locale));
}

/** Search for a string in an array using locale-aware matching */
export function searchLocale(
  arr: string[],
  query: string,
  locale = "en",
): number[] {
  const results: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]!.localeCompare(query, locale, { sensitivity: "base" }) === 0) {
      results.push(i);
    }
  }
  return results;
}
