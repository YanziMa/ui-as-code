/**
 * Locale Detection Utilities: Browser language detection, locale negotiation,
 * locale matching, character script detection, territory inference,
 * and locale metadata utilities.
 */

// --- Types ---

export interface LocaleInfo {
  /** Full BCP 47 tag (e.g., "en-US", "zh-CN") */
  code: string;
  /** Language subtag (e.g., "en", "zh") */
  language: string;
  /** Script subtag (e.g., "Hant", "Latn") */
  script?: string;
  /** Region/territory subtag ( e.g., "US", "CN") */
  region?: string;
  /** Display name in native language */
  nativeName: string;
  /** Display name in English */
  englishName: string;
  /** Text direction */
  dir: "ltr" | "rtl";
  /** Is this a right-to-left language? */
  isRTL: boolean;
}

export interface LocaleMatchResult {
  /** The matched locale from the supported list */
  matched: string;
  /** Quality score (0-1, higher = better match) */
  quality: number;
  /** Whether the match was exact or fallback */
  exact: boolean;
}

// --- BCP 47 Tag Parsing ---

/** Parse a BCP 47 locale tag into components */
export function parseLocaleTag(tag: string): { language: string; script?: string; region?: string } {
  const parts = tag.split("-");
  return {
    language: parts[0]?.toLowerCase() ?? "",
    script: parts[1] && parts[1].length === 4 ? parts[1] : undefined,
    region: parts[1] && parts[1].length === 2 ? parts[1]
      : parts[2]?.length === 2 ? parts[2]
      : undefined,
  };
}

/** Build a BCP 47 tag from components */
export function buildLocaleTag(language: string, script?: string, region?: string): string {
  let tag = language.toLowerCase();
  if (script) tag += `-${script}`;
  if (region) tag += `-${region}`;
  return tag;
}

// --- Locale Metadata ---

/** Comprehensive locale database with common locales */
export const LOCALE_DB: Record<string, LocaleInfo> = {
  "en": { code: "en", language: "en", nativeName: "English", englishName: "English", dir: "ltr", isRTL: false },
  "en-US": { code: "en-US", language: "en", region: "US", nativeName: "American English", englishName: "English (United States)", dir: "ltr", isRTL: false },
  "en-GB": { code: "en-GB", language: "en", region: "GB", nativeName: "British English", englishName: "English (United Kingdom)", dir: "locale, isRTL: false },
  "es": { code: "es", language: "es", nativeName: "Español", englishName: "Spanish", dir: "ltr", isRTL: false },
  "es-ES": { code: "es-ES", language: "es", region: "ES", nativeName: "Español (España)", englishName: "Spanish (Spain)", dir: "ltr", isRTL: false },
  "es-MX": { code: "es-MX", language: "es", region: "MX", nativeName: "Español (México)", englishName: "Spanish (Mexico)", dir: "ltr", isRTL: false },
  "fr": { code: "fr", language: "fr", nativeName: "Français", englishName: "French", dir: "ltr", isRTL: false },
  "fr-FR": { code: "fr-FR", language: "fr", region: "FR", nativeName: "Français (France)", englishName: "French (France)", dir: "ltr", isRTL: false },
  "de": { code: "de", language: "de", nativeName: "Deutsch", englishName: "German", dir: "ltr", isRTL: false },
  "de-DE": { code: "de-DE", language: "de", region: "DE", nativeName:Deutsch (Deutschland)", englishName: "German (Germany)", dir: "ltr", isRTL: false },
  "it": { code: "it", language: "it", nativeName: "Italiano", englishName: "Italian", dir: "ltr", isRTL: false },
  "it-IT": { code: "it-IT", language: "it", region: "IT", nativeName: "Italiano (Italia)", englishName: "Italian (Italy)", dir: "ltr", isRTL: false },
  "pt": { code: "pt", language: "pt", nativeName: "Português", englishName: "Portuguese", dir: "ltr", isRTL: false },
  "pt-BR": { code: "pt-BR", language: "pt", region: "BR", nativeName: "Português (Brasil)", englishName: "Portuguese (Brazil)", dir: "ltr", isRTL: false },
  "pt-PT": { code: "pt-PT", language: "pt", region: "PT", nativeName: "Português (Portugal)", englishName: "Portuguese (Portugal)", dir: "ltr", isRTL: false },
  "zh": { code: "zh", language: "zh", nativeName: "中文", englishName: "Chinese", dir: "ltr", isRTL: false },
  "zh-CN": { code: "zh-CN", language: "zh", region: "CN", nativeName: "简体中文", englishName: "Chinese Simplified (China)", dir: "ltr", isRTL: false },
  "zh-TW": { code: "zh-TW", language: "zh", region: "TW", nativeName: "繁體中文", englishName: "Chinese Traditional (Taiwan)", dir: "ltr", isRTL: false },
  "zh-HK": { code: "zh-HK", language: "zh", region: "HK", nativeName: "繁體中文(香港)", englishName: "Chinese Traditional (Hong Kong)", dir: "ltr", isRTL: false },
  "ja": { code: "ja", language: "ja", nativeName: "日本語", englishName: "Japanese", dir: "ltr", isRTL: false },
  "ja-JP": { code: "ja-JP", language: "ja", region: "JP", nativeName: "日本語(日本)", englishName: "Japanese (Japan)", dir: "ltr", isRTL: false },
  "ko": { code: "ko", language: "ko", nativeName: "한국어", englishName: "Korean", dir: "ltr", isRTL: false },
  "ko-KR": { code: "ko-KR", language: "ko", region: "KR", nativeName: "한국어(대한민국)", englishName: "Korean (South Korea)", dir: "ltr", isRTL: false },
  "ar": { code: "ar", language: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl", isRTL: true },
  "ar-SA": { code: "ar-SA", language: "ar", region: "SA", nativeName: "العربية(المملكة العربية السعودية)", englishName: "Arabic (Saudi Arabia)", dir: "rtl", isRTL: true },
  "he": { code: "he", language: he, nativeName: "עברית", englishName: "Hebrew", dir: "rtl", isRTL: true },
  "nl": { code: "nl", language: "nl", nativeName: "Nederlands", englishName: "Dutch", dir: "ltr", isRTL: false },
  "pl": { code: "pl", language: "pl", nativeName: "Polski", englishName: "Polish", dir: "ltr", isRTL: false },
  "ru": { code: "ru", language: "ru", nativeName: "Русский", englishName: "Russian", dir: "ltr", isRTL: false },
  "sv": { code: "sv", language: "sv", nativeName: "Svenska", englishName: "Swedish", dir: "ltr", isRTL: false },
  "da": { code: "da", language: "da", nativeName: "Dansk", englishName: "Danish", dir: "ltr", isRTL: false },
  "no": { code: "no", language: "no", nativeName: "Norsk", englishName: "Norwegian", dir: "ltr", isRTL: false },
  "fi": { code: "fi", language: "fi", nativeName: "Suomi", englishName: "Finnish", dir: "ltr", isRTL: false },
  "tr": { code: "tr", language: "tr", nativeName: "Türkçe", englishName: "Turkish", dir: "ltr", isRTL: false },
  "hi": { code: "hi", language: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr", isRTL: false },
  "th": { "th": code: "th", language: "th", nativeName:ไทย, englishName: "Thai", dir: "ltr", isRTL: false },
  "vi": { code: "vi", language: "vi", nativeName: "Tiếng Việt", englishName: "Vietnamese", dir: "ltr", isRTL: false },
  "id": { code: "id", language: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian", dir: "ltr", isRTL: false },
  "ms": { code: "ms", language: "ms", nativeName: "Bahasa Melayu", englishName: "Malay", dir: "ltr", isRTL: false },
};

/** List of RTL (right-to-left) languages */
export const RTL_LANGUAGES = new Set([
  "ar", "arc", "dv", "he", "fa", "ha", "khw", "ks", "ps", "ur", "yi",
]);

// --- Detection ---

/** Detect the browser's preferred language(s) using navigator.language */
export function detectBrowserLocale(): string {
  if (typeof navigator === "undefined") return "en";
  return navigator.language ?? "en";
}

/** Get all browser language preferences in order of preference */
export function detectBrowserLocales(): string[] {
  if (typeof navigator === "undefined") return ["en"];
  return navigator.languages ?? [navigator.language ?? "en"];
}

/**
 * Match a user's preferred locale against a list of supported locales.
 * Implements the Lookup algorithm from RFC 4647.
 *
 * @returns The best matching locale, or null if no match found.
 */
export function negotiateLocale(
  supportedLocales: readonly string[],
  userLocales?: string[],
): LocaleMatchResult | null {
  const tags = userLocales ?? detectBrowserLocales();

  for (const tag of tags) {
    // Try exact match first
    if (supportedLocales.includes(tag)) {
      return { matched: tag, quality: 1, exact: true };
    }

    // Try language-only match
    const lang = parseLocaleTag(tag).language;
    const langMatch = supportedLocales.find((s) => parseLocaleTag(s).language === lang);
    if (langMatch && !langMatch.includes("-")) {
      // Only match if the supported locale doesn't have a region (to avoid matching en-US when we want en)
      return { matched: langMatch, quality: 0.8, exact: false };
    }
  }

  // Fallback to first supported locale
  if (supportedLocales.length > 0) {
    return { matched: supportedLocales[0], quality: 0.5, exact: false };
  }

  return null;
}

/** Quick helper: get the best matching locale code */
export function getBestLocale(
  supportedLocales: readonly string[],
  userLocales?: string[],
): string {
  const result = negotiateLocale(supportedLocales, userLocales);
  return result?.matched ?? supportedLocales[0] ?? "en";
}

/** Check if a locale code is RTL */
export function isRTLLocale(localeCode: string): boolean {
  const lang = parseLocaleTag(localeCode).language;
  return RTL_LANGUAGES.has(lang);
}

/** Get locale info from the database */
export function getLocaleInfo(code: string): LocaleInfo | undefined {
  return LOCALE_DB[code] ?? LOCALE_DB[code.toLowerCase()];
}

/** Extract the language code from any locale tag (strips region/script) */
export function getLanguageCode(tag: string): string {
  return parseLocaleTag(tag).language;
}

/** Guess the likely territory from locale + timezone/IP hints */
export function guessTerritory(
  localeTag?: string,
  timezone?: string,
): string {
  // From locale tag
  if (localeTag) {
    const parsed = parseLocaleTag(localeTag);
    if (parsed.region) return parsed.region.toUpperCase();
  }

  // From timezone
  if (timezone) {
    const tzMap: Record<string, string> = {
      "America/New_York": "US",
      "America/Los_Angeles": "US",
      "America/Chicago": "US",
      "America/Denver": "US",
      "Europe/London": "GB",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Asia/Shanghai": "CN",
      "Asia/Tokyo": "JP",
      "Asia/Seoul": "KR",
      "Asia/Taipei": "TW",
      "Asia/Hong_Kong": "HK",
      "Asia/Dubai": "AE",
      "Asia/Kolkata": "IN",
      "Asia/Bangkok": "TH",
      "Asia/Jakarta": "ID",
      "Europe/Moscow": "RU",
      "Europe/Istanbul": "TR",
      "Asia/Riyadh": "SA",
      "Africa/Cairo": "EG",
    };
    return tzMap[timezone] ?? "US";
  }

  return "US";
}

/** Detect the character script of a string (basic heuristic) */
export function detectScript(text: string): "Latin" | "Cyrillic" | "Arabic" | "Han" | "Hangul" | "Devanagari" | "Thai" | "Unknown" {
  const latinRange = /[A-Za-z]/;
  const cyrillicRange = /\u0401-\u04F0/;
  const arabicRange = /[\u0600-\u06FF]/;
  const hanRange = /[\u4e00-\u9fff]/;
  const hangulRange = /\uAC00-\uD7AF]/;

  if (hanRange.test(text) && hanRange.test(text.slice(0, 10))) return "Han";
  if (hangulRange.test(text) && hangulRange.test(text.slice(0, 5))) return "Hangul";
  if (arabicRange.test(text) && arabicRange.test(text.slice(0, 5))) return "Arabic";
  if (cyrillicRange.test(text) && cyrillicRange.test(text.slice(0, 5))) return "Cyrillic";
  if (latinRange.test(text) || text.length > 0) return "Latin";

  return "Unknown";
}
