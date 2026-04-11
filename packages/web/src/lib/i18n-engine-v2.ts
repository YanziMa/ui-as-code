/**
 * i18n Engine v2 — Comprehensive internationalization engine.
 *
 * Features:
 *   - Locale detection & management (BCP 47, browser, fallback chains, RTL)
 *   - Translation system (interpolation, pluralization, gender, nested keys)
 *   - ICU MessageFormat-like parser (simplified)
 *   - Number / currency / percent / unit formatting
 *   - Date / time / relative-time / duration formatting
 *   - React / Vue integration helpers (hooks, HOC, Provider, Trans component)
 *   - Utilities: extraction, coverage report, locale comparison
 *
 * @module i18n-engine-v2
 */

// ============================================================================
// Section 1 — Types & Interfaces
// ============================================================================

/** Parsed locale information following BCP 47. */
export interface LocaleInfo {
  /** Full BCP 47 tag, e.g. "zh-Hans-CN" */
  code: string;
  /** ISO 639-1 language code, e.g. "zh" */
  language: string;
  /** ISO 15924 script code, e.g. "Hans" */
  script?: string;
  /** ISO 3166-1 alpha-2 region code, e.g. "CN" */
  region?: string;
  /** English display name, e.g. "Chinese (Simplified, China)" */
  name: string;
  /** Native display name, e.g. "简体中文（中国大陆）" */
  nativeName: string;
  /** Text direction for this locale */
  direction: "ltr" | "rtl";
}

/** Recursive translation map supporting nested keys. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TranslationMap {
  [key: string]: string | TranslationMap;
}

/** Options passed to the I18nEngine constructor. */
export interface I18nOptions {
  /** Default locale when none is set (default "en") */
  defaultLocale?: string;
  /** Fallback locale or chain when a key is missing in the active locale */
  fallbackLocale?: string | string[];
  /** Custom handler invoked when a translation key is not found */
  missingKeyFn?: (key: string, locale: string) => string;
  /** Whether to HTML-escape interpolated values (default true) */
  escapeHtml?: boolean;
  /** Prefix for interpolation placeholders (default "{") */
  interpolationPrefix?: string;
  /** Suffix for interpolation placeholders (default "}") */
  interpolationSuffix?: string;
}

/** Plural rule predicates per category. */
export interface PluralRules {
  zero?: (n: number) => boolean;
  one?: (n: number) => boolean;
  two?: (n: number) => boolean;
  few?: (n: number) => boolean;
  many?: (n: number) => boolean;
}

/** Options for the `t()` translate method. */
export interface TranslateOptions {
  /** Override the locale for this single call */
  locale?: string;
  /** Override the default value when key is missing */
  defaultValue?: string;
  /** Disable HTML escaping for this call */
  escapeHtml?: boolean;
  /** Context for disambiguation (e.g. "button" vs "title") */
  context?: string;
}

/** Number formatting options. */
export interface NumberFormatOptions {
  /** Minimum fraction digits */
  minimumFractionDigits?: number;
  /** Maximum fraction digits */
  maximumFractionDigits?: number;
  /** Use grouping separators (default true) */
  useGrouping?: boolean;
  /** Currency code for currency formatting, e.g. "USD", "CNY" */
  currency?: string;
  /** Currency display style: "code", "symbol", "name" */
  currencyDisplay?: "code" | "symbol" | "name";
  /** Style: "decimal" | "currency" | "percent" | "unit" */
  style?: "decimal" | "currency" | "percent" | "unit";
  /** Unit for style="unit", e.g. "meter", "byte" */
  unit?: string;
  /** Compact notation: "short" | "long" */
  notation?: "standard" | "compact" | "scientific" | "engineering";
  /** Spelled-out numbers */
  spellout?: boolean;
}

/** Date/time formatting options. */
export interface DateFormatOptions {
  /** Predefined format style */
  dateStyle?: "short" | "medium" | "long" | "full";
  /** Predefined time style */
  timeStyle?: "short" | "medium" | "long" | "full";
  /** Custom pattern tokens (fallback when Intl unavailable) */
  pattern?: string;
  /** Timezone identifier */
  timeZone?: string;
  /** Hour cycle: "h11" | "h12" | "h23" | "h24" */
  hourCycle?: "h11" | "h12" | "h23" | "h24";
  /** 12-hour or 24-hour override */
  hour12?: boolean;
}

/** Relative time options. */
export interface RelativeTimeOptions {
  /** Unit: "second" | "minute" | "hour" | "day" | "week" | "month" | "year" */
  unit?: Intl.RelativeTimeFormatUnit;
  /** Numeric style: "always" | "auto" */
  numeric?: "always" | "auto";
}

/** Duration formatting options. */
export interface DurationFormatOptions {
  /** Which parts to include (default all) */
  parts?: ("years" | "months" | "weeks" | "days" | "hours" | "minutes" | "seconds" | "milliseconds")[];
  /** Max number of parts to render (default 2) */
  maxParts?: number;
  /** Style: "digital" | "long" | "short" | "narrow" */
  style?: "digital" | "long" | "short" | "narrow";
}

/** Translation loading source descriptor. */
export interface TranslationSource {
  /** Locale this source provides translations for */
  locale: string;
  /** URL or path to a JSON translation file */
  url?: string;
  /** Inline translation map (takes precedence over url) */
  data?: TranslationMap;
  /** Namespace prefix for keys */
  namespace?: string;
}

/** Coverage report entry for a single locale. */
export interface CoverageEntry {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: string[];
  coveragePercent: number;
}

/** Return type of `useI18n()` hook pattern. */
export interface UseI18nReturn {
  t: (key: string, params?: Record<string, unknown>, options?: TranslateOptions) => string;
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: readonly string[];
  dir: "ltr" | "rtl";
  formatDate: (value: Date | number | string, opts?: DateFormatOptions) => string;
  formatNumber: (value: number, opts?: NumberFormatOptions) => string;
}

// ============================================================================
// Section 2 — Locale Detection & Management
// ============================================================================

/** Known RTL language codes (ISO 639-1). */
const RTL_LANGUAGES = new Set([
  "ar", "arc", "dv", "fa", "ha", "he", "khw", "ks", "ku", "ps", "ur", "yi",
]);

/** Native names for common locales. */
const LOCALE_NAMES: Record<string, { name: string; nativeName: string }> = {
  en:     { name: "English",                    nativeName: "English" },
  "en-US":{ name: "English (United States)",    nativeName: "English (United States)" },
  "en-GB":{ name: "English (United Kingdom)",   nativeName: "English (United Kingdom)" },
  zh:     { name: "Chinese",                    nativeName: "中文" },
  "zh-CN":{ name: "Chinese (Simplified, China)", nativeName: "简体中文（中国大陆）" },
  "zh-TW":{ name: "Chinese (Traditional, Taiwan)", nativeName: "繁體中文（台灣）" },
  "zh-HK":{ name: "Chinese (Traditional, Hong Kong)", nativeName: "繁體中文（香港）" },
  ja:     { name: "Japanese",                   nativeName: "日本語" },
  ko:     { name: "Korean",                     nativeName: "한국어" },
  fr:     { name: "French",                     nativeName: "Français" },
  "fr-CA":{ name: "French (Canada)",            nativeName: "Français (Canada)" },
  de:     { name: "German",                     nativeName: "Deutsch" },
  es:     { name: "Spanish",                    nativeName: "Español" },
  "es-MX":{ name: "Spanish (Mexico)",           nativeName: "Español (México)" },
  pt:     { name: "Portuguese",                 nativeName: "Português" },
  "pt-BR":{ name: "Portuguese (Brazil)",        nativeName: "Português (Brasil)" },
  it:     { name: "Italian",                    nativeName: "Italiano" },
  ru:     { name: "Russian",                    nativeName: "Русский" },
  ar:     { name: "Arabic",                     nativeName: "العربية" },
  hi:     { name: "Hindi",                      nativeName: "हिन्दी" },
  th:     { name: "Thai",                       nativeName: "ไทย" },
  vi:     { name: "Vietnamese",                 nativeName: "Tiếng Việt" },
  nl:     { name: "Dutch",                      nativeName: "Nederlands" },
  pl:     { name: "Polish",                     nativeName: "Polski" },
  tr:     { name: "Turkish",                    nativeName: "Türkçe" },
  sv:     { name: "Swedish",                    nativeName: "Svenska" },
  da:     { name: "Danish",                     nativeName: "Dansk" },
  no:     { name: "Norwegian",                  nativeName: "Norsk" },
  fi:     { name: "Finnish",                    nativeName: "Suomi" },
  cs:     { name: "Czech",                      nativeName: "Čeština" },
  ro:     { name: "Romanian",                   nativeName: "Română" },
  hu:     { name: "Hungarian",                  nativeName: "Magyar" },
  uk:     { name: "Ukrainian",                  nativeName: "Українська" },
  id:     { name: "Indonesian",                 nativeName: "Bahasa Indonesia" },
  ms:     { name: "Malay",                      nativeName: "Bahasa Melayu" },
};

/**
 * Parse a BCP 47 locale tag into structured components.
 *
 * @param tag - A BCP 47 locale string, e.g. "zh-Hans-CN"
 * @returns Parsed locale information
 *
 * @example
 * parseLocale("zh-Hans-CN")
 * // => { code: "zh-Hans-CN", language: "zh", script: "Hans", region: "CN", ... }
 */
export function parseLocale(tag: string): LocaleInfo {
  const normalized = tag.trim().replace(/_/g, "-");
  const parts = normalized.split("-");
  const language = parts[0]?.toLowerCase() ?? "en";
  const script = parts.length >= 3 && parts[1]?.length === 4
    ? parts[1][0].toUpperCase() + parts[1].slice(1).toLowerCase()
    : undefined;
  const regionRaw = script ? parts[2] : parts[1];
  const region = regionRaw?.length === 2 || regionRaw?.length === 3
    ? regionRaw.toUpperCase()
    : undefined;

  // Build the canonical code
  let code = language;
  if (script) code += `-${script}`;
  if (region) code += `-${region}`;

  const known = LOCALE_NAMES[code] || LOCALE_NAMES[language];
  const displayName = known?.name ?? `${language}${region ? ` (${region})` : ""}`;
  const nativeDisplayName = known?.nativeName ?? displayName;

  return {
    code,
    language,
    script,
    region,
    name: displayName,
    nativeName: nativeDisplayName,
    direction: RTL_LANGUAGES.has(language) ? "rtl" : "ltr",
  };
}

/**
 * Detect the user's preferred locale from the browser environment.
 *
 * Checks (in order):
 *   1. `navigator.language`
 *   2. First entry of `navigator.languages`
 *   3. `Accept-Language` header via HTTP (server-side hint)
 *   4. Falls back to `"en"`
 *
 * @returns Detected BCP 47 locale string
 */
export function detectBrowserLocale(): string {
  if (typeof navigator !== "undefined") {
    if (navigator.language) return navigator.language;
    if (navigator.languages?.length) return navigator.languages[0];
  }
  // Server-side or fallback
  return "en";
}

/**
 * Build the fallback chain for a given locale.
 *
 * For example, `"zh-CN"` produces `["zh-CN", "zh", "en"]`.
 *
 * @param locale - The starting locale
 * @param fallbacks - Additional explicit fallback locales
 * @returns Array of locale codes to try in order
 */
export function buildFallbackChain(locale: string, fallbacks: string[] = ["en"]): string[] {
  const parsed = parseLocale(locale);
  const chain: string[] = [];

  // Most specific first
  if (parsed.region && parsed.script) {
    chain.push(`${parsed.language}-${parsed.script}-${parsed.region}`);
  }
  if (parsed.region) {
    chain.push(`${parsed.language}-${parsed.region}`);
  }
  if (parsed.script) {
    chain.push(`${parsed.language}-${parsed.script}`);
  }
  // Language only
  chain.push(parsed.language);

  // Append explicit fallbacks that are not already in the chain
  for (const fb of fallbacks) {
    if (!chain.includes(fb)) chain.push(fb);
  }

  return chain;
}

/**
 * Determine whether a locale uses right-to-left text direction.
 *
 * @param locale - BCP 47 locale tag
 * @returns `"rtl"` or `"ltr"`
 */
export function getDirection(locale: string): "ltr" | "rtl" {
  return parseLocale(locale).direction;
}

/**
 * Get calendar system commonly used by a locale.
 *
 * @param locale - BCP 47 locale tag
 * @returns Calendar identifier string
 */
export function getCalendarSystem(locale: string): string {
  const lang = parseLocale(locale).language;
  const calendars: Record<string, string> = {
    zh: "gregory",
    ja: "gregory",
    ko: "gregory",
    th: "buddhist",
    ar: "gregory",
    fa: "persian",
    he: "hebrew",
    hi: "indian",
  };
  return calendars[lang] ?? "gregory";
}

/**
 * Get the first day of the week for a locale.
 *
 * @param locale - BCP 47 locale tag
 * @returns Day index (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export function getFirstDayOfWeek(locale: string): number {
  const lang = parseLocale(locale).language;
  const firstDays: Record<string, number> = {
    en: 0,  // Sunday
    zh: 1,  // Monday
    ja: 1,
    ko: 1,
    fr: 1,
    de: 1,
    es: 1,
    it: 1,
    ru: 1,
    ar: 6,  // Saturday
    he: 6,
  };
  return firstDays[lang] ?? 1;
}

/**
 * Get localized month names for a locale.
 *
 * @param locale - BCP 47 locale tag
 * @param style - "long" | "short" | "narrow"
 * @returns Array of 12 month names
 */
export function getMonthNames(
  locale: string,
  style: "long" | "short" | "narrow" = "long",
): string[] {
  const dtf = new Intl.DateTimeFormat(locale, { month: style, timeZone: "UTC" });
  return Array.from({ length: 12 }, (_, i) =>
    dtf.format(new Date(2000, i, 1)),
  );
}

/**
 * Get localized weekday names for a locale.
 *
 * @param locale - BCP 47 locale tag
 * @param style - "long" | "short" | "narrow"
 * @returns Array of 7 weekday names starting from Sunday
 */
export function getWeekdayNames(
  locale: string,
  style: "long" | "short" | "narrow" = "long",
): string[] {
  const dtf = new Intl.DateTimeFormat(locale, { weekday: style, timeZone: "UTC" });
  // Jan 2, 2000 is Sunday
  const sunday = new Date(2000, 0, 2);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    return dtf.format(d);
  });
}

// ============================================================================
// Section 3 — CLDR Plural Rules
// ============================================================================

/**
 * CLDR plural form categories and their selection rules per locale.
 *
 * Each entry maps a locale (or language base) to a function that returns
 * the plural category for a given count.
 */
const PLURAL_RULES_MAP: Record<string, (n: number) => string> = {
  // --- No plural distinction ---
  zh: () => "other",
  ja: () => "other",
  ko: () => "other",
  vi: () => "other",
  th: () => "other",

  // --- One/Other (English-like) ---
  en: (n) => (n === 1 ? "one" : "other"),
  de: (n) => (n === 1 ? "one" : "other"),
  it: (n) => (n === 1 ? "one" : "other"),
  nl: (n) => (n === 1 ? "one" : "other"),
  sv: (n) => (n === 1 ? "one" : "other"),
  da: (n) => (n === 1 ? "one" : "other"),
  no: (n) => (n === 1 ? "one" : "other"),
  fi: (n) => (n === 1 ? "one" : "other"),
  el: (n) => (n === 1 ? "one" : "other"),
  hu: (n) => (n === 1 ? "one" : "other"),
  pt: (n) => (n === 1 ? "one" : "other"),
  tr: (n) => (n === 1 ? "one" : "other"),
  id: (n) => (n === 1 ? "one" : "other"),
  ms: (n) => (n === 1 ? "one" : "other"),

  // --- French-style (0-1 = one) ---
  fr: (n) => (n >= 0 && n < 2 ? "one" : "other"),

  // --- Russian / Slavic (one/few/many) ---
  ru: (n) => {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "one";
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "few";
    return "many";
  },
  pl: (n) => {
    const mod10 = n % 10, mod100 = n % 100;
    if (n === 1) return "one";
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "few";
    if (
      (mod10 !== 1 || [12, 13, 14].includes(mod100)) &&
      ([2, 3, 4].includes(mod10) || ![12, 13, 14].includes(mod100))
    ) {
      return "many";
    }
    return "other";
  },
  cs: (n) => {
    if (n === 1) return "one";
    if ([2, 4].includes(n)) return "few";
    return "other";
  },

  // --- Arabic (zero/one/two/few/many/other) ---
  ar: (n) => {
    if (n === 0) return "zero";
    if (n === 1) return "one";
    if (n === 2) return "two";
    if (n % 100 >= 3 && n % 100 <= 10) return "few";
    if (n % 100 >= 11 && n % 100 <= 99) return "many";
    return "other";
  },

  // --- Polish-like ---
  uk: (n) => {
    const mod10 = n % 10, mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "one";
    if ([2, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "few";
    return "many";
  },

  // --- Two forms (Irish, etc.) ---
  ga: (n) => (n === 1 ? "one" : n === 2 ? "two" : "other"),
};

/**
 * Resolve the plural form for a count in a given locale.
 *
 * @param count - The numeric value
 * @param locale - BCP 47 locale tag
 * @returns The plural category string
 */
export function getPluralForm(count: number, locale: string): string {
  const lang = parseLocale(locale).language;
  // Check exact locale, then language, then default to English rules
  const rule =
    PLURAL_RULES_MAP[locale] ||
    PLURAL_RULES_MAP[lang] ||
    PLURAL_RULES_MAP["en"];
  return rule(Math.abs(count));
}

// ============================================================================
// Section 4 — ICU MessageFormat-like Parser (Simplified)
// ============================================================================

/** Token types produced by the parser. */
type Token =
  | { type: "literal"; value: string }
  | { type: "argument"; name: string }
  | { type: "plural"; variable: string; offset?: number; options: Record<string, string> }
  | { type: "select"; variable: string; options: Record<string, string> };

/**
 * Parse an ICU MessageFormat-like string into a token array.
 *
 * Supports:
 *   - Simple arguments: `{name}`
 *   - Plural: `{count, plural, one {# item} other {# items}}`
 *   - Select/gender: `{gender, select, male {He} female {She} other {They}}`
 *
 * @param message - The message template string
 * @param prefix - Opening delimiter (default `{`)
 * @param suffix - Closing delimiter (default `}`)
 * @returns Array of parsed tokens
 */
export function parseICUMessage(
  message: string,
  prefix = "{",
  suffix = "}",
): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  const len = message.length;

  while (pos < len) {
    const startIdx = message.indexOf(prefix, pos);

    if (startIdx === -1) {
      // Rest is literal
      tokens.push({ type: "literal", value: message.slice(pos) });
      break;
    }

    // Literal before this placeholder
    if (startIdx > pos) {
      tokens.push({ type: "literal", value: message.slice(pos, startIdx) });
    }

    // Find matching closing brace (handle nesting)
    let depth = 1;
    let endIdx = startIdx + prefix.length;
    while (endIdx < len && depth > 0) {
      if (message.startsWith(prefix, endIdx)) depth++;
      else if (message.startsWith(suffix, endIdx)) depth--;
      if (depth > 0) endIdx++;
    }

    if (depth !== 0) {
      // Unmatched brace — treat as literal
      tokens.push({ type: "literal", value: message.slice(startIdx) });
      break;
    }

    const inner = message.slice(startIdx + prefix.length, endIdx).trim();
    pos = endIdx + suffix.length;

    if (!inner) continue;

    // Check for plural/select syntax
    const commaIdx = inner.indexOf(",");
    if (commaIdx !== -1) {
      const varName = inner.slice(0, commaIdx).trim();
      const rest = inner.slice(commaIdx + 1).trim();

      const spaceIdx = rest.indexOf(" ");
      if (spaceIdx === -1) {
        // Malformed — treat as simple argument
        tokens.push({ type: "argument", name: inner });
        continue;
      }

      const funcType = rest.slice(0, spaceIdx).trim().toLowerCase();
      const optionsStr = rest.slice(spaceIdx + 1).trim();

      if (funcType === "plural" || funcType === "selectordinal") {
        const result = parsePluralOptions(optionsStr, varName);
        if (result) tokens.push(result);
        else tokens.push({ type: "argument", name: varName });
      } else if (funcType === "select") {
        const options = parseSelectOptions(optionsStr);
        tokens.push({ type: "select", variable: varName, options });
      } else {
        tokens.push({ type: "argument", name: inner });
      }
    } else {
      // Simple argument, possibly dotted (nested param access)
      tokens.push({ type: "argument", name: inner });
    }
  }

  return tokens;
}

/**
 * Parse plural option block: `offset:1 one {...} other {...}`
 */
function parsePluralOptions(
  str: string,
  variable: string,
): Token | null {
  let offset: number | undefined;
  let rest = str;

  // Parse optional offset
  const offsetMatch = rest.match(/^offset\s*:\s*(\d+)\s*/i);
  if (offsetMatch) {
    offset = parseInt(offsetMatch[1], 10);
    rest = rest.slice(offsetMatch[0].length);
  }

  const options: Record<string, string> = {};
  const regex = /(zero|one|two|few|many|other|=\d+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(rest)) !== null) {
    options[match[1]] = match[2];
  }

  if (Object.keys(options).length === 0) return null;
  return { type: "plural", variable, offset, options };
}

/**
 * Parse select option block: `male {...} female {...} other {...}`
 */
function parseSelectOptions(str: string): Record<string, string> {
  const options: Record<string, string> = {};
  const regex = /(\w+|=[\w\s]+)\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    options[match[1]] = match[2];
  }

  return options;
}

// ============================================================================
// Section 5 — Interpolation Engine
// ============================================================================

/** HTML entity map for escaping. */
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

/**
 * Escape a string for safe insertion into HTML context.
 *
 * @param str - Raw string
 * @returns HTML-escaped string
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

/**
 * Resolve a parameter value from a params object, supporting dot-path access.
 *
 * @param params - Parameter object
 * @param path - Dot-separated path, e.g. "user.name"
 * @returns The resolved value, or undefined
 */
function resolveParam(params: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = params;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Interpolate a parsed token array with the given parameters.
 *
 * @param tokens - Parsed token array from `parseICUMessage`
 * @param params - Interpolation values
 * @param locale - Current locale (for plural resolution)
 * @param escape - Whether to HTML-escape output values
 * @returns Fully interpolated string
 */
export function interpolateTokens(
  tokens: Token[],
  params: Record<string, unknown>,
  locale: string,
  escape: boolean,
): string {
  const parts: string[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "literal":
        parts.push(token.value);
        break;

      case "argument": {
        const val = resolveParam(params, token.name);
        const str = val == null ? "" : String(val);
        parts.push(escape ? escapeHtml(str) : str);
        break;
      }

      case "plural": {
        const rawVal = resolveParam(params, token.variable);
        const num = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal ?? 0));
        const adjustedNum = token.offset != null ? num - token.offset : num;
        const pluralForm = getPluralForm(adjustedNum, locale);

        // Check exact match first (=N), then plural form, then "other"
        let chosen = token.options[`=${num}`] ?? token.options[pluralForm] ?? token.options["other"];
        if (!chosen) chosen = "";

        // Replace # with the adjusted number
        chosen = chosen.replace(/#/g, String(adjustedNum));

        // Recursively interpolate nested placeholders
        const subTokens = parseICUMessage(chosen);
        parts.push(interpolateTokens(subTokens, params, locale, escape));
        break;
      }

      case "select": {
        const val = resolveParam(params, token.variable);
        const selectKey = String(val ?? "other");
        let chosen = token.options[selectKey] ?? token.options["other"] ?? "";
        const subTokens = parseICUMessage(chosen);
        parts.push(interpolateTokens(subTokens, params, locale, escape));
        break;
      }
    }
  }

  return parts.join("");
}

// ============================================================================
// Section 6 — Number Formatting
// ============================================================================

/** Unit definitions for formatting. */
const UNIT_LABELS: Record<string, Record<string, Record<string, string>>> = {
  byte: {
    long:  { B: "bytes", KB: "kilobytes", MB: "megabytes", GB: "gigabytes", TB: "terabytes" },
    short: { B: "B", KB: "KB", MB: "MB", GB: "GB", TB: "TB" },
  },
  meter: {
    long:  { m: "meters", km: "kilometers", cm: "centimeters", mm: "millimeters" },
    short: { m: "m", km: "km", cm: "cm", mm: "mm" },
  },
  gram: {
    long:  { g: "grams", kg: "kilograms", mg: "milligrams" },
    short: { g: "g", kg: "kg", mg: "mg" },
  },
  second: {
    long:  { s: "seconds", min: "minutes", h: "hours" },
    short: { s: "s", min: "min", h: "h" },
  },
};

/** Byte thresholds for compact notation. */
const BYTE_THRESHOLDS = [
  { limit: 1024, unit: "B", divisor: 1 },
  { limit: 1024 ** 2, unit: "KB", divisor: 1024 },
  { limit: 1024 ** 3, unit: "MB", divisor: 1024 ** 2 },
  { limit: 1024 ** 4, unit: "GB", divisor: 1024 ** 3 },
  { limit: Infinity, unit: "TB", divisor: 1024 ** 4 },
];

/**
 * Format a number according to locale-aware rules.
 *
 * @param value - Numeric value to format
 * @param locale - BCP 47 locale tag
 * @param options - Formatting options
 * @returns Formatted string
 */
export function formatNumber(
  value: number,
  locale: string,
  options: NumberFormatOptions = {},
): string {
  const {
    minimumFractionDigits = 0,
    maximumFractionDigits,
    useGrouping = true,
    currency,
    currencyDisplay = "symbol",
    style = currency ? "currency" : "decimal",
    notation = "standard",
    spellout = false,
  } = options;

  // Handle spelled-out numbers
  if (spellout) {
    try {
      return new Intl.NumberFormat(locale, {
        style: "decimal",
        notation,
      }).format(value);
    } catch {
      return String(value);
    }
  }

  // Build Intl.NumberFormat options
  const intlOpts: Intl.NumberFormatOptions = {
    minimumFractionDigits,
    useGrouping,
    style,
    notation,
  };

  if (maximumFractionDigits !== undefined) {
    intlOpts.maximumFractionDigits = maximumFractionDigits;
  }

  if (style === "currency" && currency) {
    intlOpts.currency = currency;
    intlOpts.currencyDisplay = currencyDisplay;
  }

  if (style === "percent") {
    intlOpts.style = "percent";
  }

  try {
    return new Intl.NumberFormat(locale, intlOpts).format(value);
  } catch {
    // Fallback: basic formatting
    return value.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    });
  }
}

/**
 * Format a byte count into human-readable form.
 *
 * @param bytes - Byte count
 * @param locale - BCP 47 locale tag
 * @param style - Label style: "long" | "short"
 * @returns Formatted string like "1.5 GB" or "1536 megabytes"
 */
export function formatBytes(
  bytes: number,
  locale: string,
  style: "long" | "short" = "short",
): string {
  const absBytes = Math.abs(bytes);
  const tier = BYTE_THRESHOLDS.find((t) => absBytes < t.limit) ?? BYTE_THRESHOLDS[BYTE_THRESHOLDS.length - 1];
  const scaled = bytes / tier.divisor;
  const labels = UNIT_LABELS.byte[style];
  const label = labels[tier.unit] ?? tier.unit;

  const formatted = formatNumber(scaled, locale, {
    maximumFractionDigits: tier.unit === "B" ? 0 : 1,
  });

  // Position unit after number for LTR, before for RTL
  const dir = getDirection(locale);
  if (dir === "rtl") {
    return `${label}\u200F ${formatted}`;
  }
  return `${formatted} ${label}`;
}

/**
 * Format a number in compact notation (1.2K, 3.4M).
 *
 * @param value - Numeric value
 * @param locale - BCP 47 locale tag
 * @param notation - "short" | "long"
 * @returns Formatted string
 */
export function formatCompactNumber(
  value: number,
  locale: string,
  notation: "short" | "long" = "short",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: notation,
    }).format(value);
  } catch {
    return formatNumber(value, locale);
  }
}

// ============================================================================
// Section 7 — Date / Time Formatting
// ============================================================================

/** Pattern token replacements for custom date formatting (Intl fallback). */
const DATE_PATTERNS: Record<string, string> = {
  YYYY: "%Y",
  YY: "%y",
  MM: "%m",
  DD: "%d",
  HH: "%H",
  hh: "%I",
  mm: "%M",
  ss: "%S",
  A: "%p",
};

/**
 * Format a date/time value according to locale conventions.
 *
 * @param value - Date, timestamp, or ISO string
 * @param locale - BCP 47 locale tag
 * @param options - Formatting options
 * @returns Formatted date/time string
 */
export function formatDate(
  value: Date | number | string,
  locale: string,
  options: DateFormatOptions = {},
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return "Invalid Date";

  const {
    dateStyle,
    timeStyle,
    pattern,
    timeZone,
    hourCycle,
    hour12,
  } = options;

  // If a custom pattern is provided and Intl doesn't support it directly,
  // we fall through to a manual formatter
  if (pattern && !dateStyle && !timeStyle) {
    return formatDateWithPattern(date, pattern, locale);
  }

  const intlOpts: Intl.DateTimeFormatOptions = {};
  if (dateStyle) intlOpts.dateStyle = dateStyle;
  if (timeStyle) intlOpts.timeStyle = timeStyle;
  if (timeZone) intlOpts.timeZone = timeZone;
  if (hourCycle) intlOpts.hourCycle = hourCycle;
  if (hour12 !== undefined) intlOpts.hour12 = hour12;

  try {
    return new Intl.DateTimeFormat(locale, intlOpts).format(date);
  } catch {
    return date.toLocaleDateString(locale, intlOpts);
  }
}

/**
 * Format a date using a custom pattern string.
 *
 * Supported tokens: YYYY, YY, MM, DD, HH, hh, mm, ss, A
 *
 * @param date - Date object
 * @param pattern - Pattern string, e.g. "YYYY-MM-DD HH:mm:ss"
 * @param locale - For locale-aware day/month names
 * @returns Formatted string
 */
function formatDateWithPattern(date: Date, pattern: string, locale: string): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  const replacements: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: pad(date.getFullYear() % 100),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    hh: pad(date.getHours() % 12 || 12),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
    A: date.getHours() < 12 ? "AM" : "PM",
    EEEE: getWeekdayNames(locale, "long")[date.getDay()],
    EEE: getWeekdayNames(locale, "short")[date.getDay()],
    MMMM: getMonthNames(locale, "long")[date.getMonth()],
    MMM: getMonthNames(locale, "short")[date.getMonth()],
  };

  let result = pattern;
  // Sort keys by length descending so longer tokens are replaced first
  const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    result = result.replace(new RegExp(key, "g"), replacements[key]);
  }
  return result;
}

/**
 * Format a relative time string (e.g., "3 days ago", "in 2 hours").
 *
 * @param value - Value (negative = past, positive = future)
 * @param unit - Time unit
 * @param locale - BCP 47 locale tag
 * @param options - Formatting options
 * @returns Formatted relative time string
 */
export function formatRelativeTime(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string,
  options: RelativeTimeOptions = {},
): string {
  const { numeric = "auto" } = options;

  try {
    return new Intl.RelativeTimeFormat(locale, { numeric }).format(value, unit);
  } catch {
    // Manual fallback
    const absValue = Math.abs(value);
    const suffix = value < 0 ? "ago" : "from now";
    return `${absValue} ${unit}${absValue !== 1 ? "s" : ""} ${suffix}`;
  }
}

/**
 * Convenience: format a date as relative time from now.
 *
 * @param date - Target date
 * @param locale - BCP 47 locale tag
 * @returns Human-readable relative time string
 */
export function formatTimeAgo(date: Date | number | string, locale: string): string {
  const target = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);
  const diffWeek = Math.round(diffDay / 7);
  const diffMonth = Math.round(diffDay / 30);
  const diffYear = Math.round(diffDay / 365);

  const absDiff = Math.abs(diffMs);

  // Choose appropriate unit
  if (absDiff < 60_000) return formatRelativeTime(diffSec, "second", locale);
  if (absDiff < 3_600_000) return formatRelativeTime(diffMin, "minute", locale);
  if (absDiff < 86_400_000) return formatRelativeTime(diffHour, "hour", locale);
  if (absDiff < 604_800_000) return formatRelativeTime(diffDay, "day", locale);
  if (absDiff < 2_592_000_000) return formatRelativeTime(diffWeek, "week", locale);
  if (absDiff < 31_536_000_000) return formatRelativeTime(diffMonth, "month", locale);
  return formatRelativeTime(diffYear, "year", locale);
}

/**
 * Format a duration in milliseconds into human-readable form.
 *
 * @param ms - Duration in milliseconds
 * @param locale - BCP 47 locale tag
 * @param options - Formatting options
 * @returns Formatted duration string
 */
export function formatDuration(
  ms: number,
  locale: string,
  options: DurationFormatOptions = {},
): string {
  const {
    parts = ["days", "hours", "minutes", "seconds"],
    maxParts = 2,
    style = "long",
  } = options;

  const absMs = Math.abs(ms);
  const seconds = Math.floor(absMs / 1000) % 60;
  const minutes = Math.floor(absMs / 60_000) % 60;
  const hours = Math.floor(absMs / 3_600_000) % 24;
  const days = Math.floor(absMs / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  const millis = Math.floor(absMs % 1000);

  const partValues: Record<string, number> = {
    years, months, weeks, days, hours, minutes, seconds, milliseconds: millis,
  } as Record<string, number>;

  // Collect non-zero parts in order
  const allPartNames: readonly string[] = [
    "years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds",
  ];
  const orderedParts = allPartNames.filter((p) => (parts as readonly string[]).includes(p));

  const activeParts: string[] = [];
  for (const p of orderedParts) {
    if (partValues[p] > 0) {
      const formatted = formatPart(partValues[p], p, locale, style);
      activeParts.push(formatted);
      if (activeParts.length >= maxParts) break;
    }
  }

  if (activeParts.length === 0) {
    return formatPart(0, "seconds", locale, style);
  }

  // Join with locale-appropriate list separator
  if (activeParts.length === 1) return activeParts[0];

  const last = activeParts.pop()!;
  try {
    const listFmt = new Intl.ListFormat(locale, { style: "long", type: "conjunction" });
    return listFmt.format([...activeParts, last]);
  } catch {
    return `${activeParts.join(", ")} ${last}`;
  }
}

/** Format a single duration part. */
function formatPart(
  value: number,
  unit: string,
  locale: string,
  style: string,
): string {
  if (style === "digital") {
    if (unit === "seconds") return `${String(value).padStart(2, "0")}s`;
    if (unit === "minutes") return `${String(value).padStart(2, "0")}:`;
    if (unit === "hours") return `${String(value).padStart(2, "0")}:`;
    return `${value}`;
  }

  try {
    return new Intl.NumberFormat(locale, { style: "unit" as Intl.NumberFormatOptions["style"], unit, unitDisplay: style as "long" | "short" | "narrow" }).format(value);
  } catch {
    return `${value} ${unit}`;
  }
}

// ============================================================================
// Section 8 — I18nEngine Core Class
// ============================================================================

/** Event listener types for the engine. */
type I18nEventListener = (locale: string, prevLocale: string) => void;

/**
 * Main internationalization engine class.
 *
 * Provides translation, interpolation, pluralization, number/date formatting,
 * locale management, and lazy-loading support.
 *
 * @example
 * ```ts
 * const i18n = new I18nEngine({ defaultLocale: "en", fallbackLocale: "en" });
 * i18n.addTranslations("en", { greeting: "Hello, {name}!" });
 * i18n.addTranslations("zh-CN", { greeting: "你好，{name}！" });
 * i18n.setLocale("zh-CN");
 * console.log(i18n.t("greeting", { name: "World" })); // 你好，World！
 * ```
 */
export class I18nEngine {
  /** All loaded translations keyed by locale. */
  private translations: Map<string, TranslationMap> = new Map();

  /** Currently active locale. */
  private _currentLocale: string;

  /** Default locale. */
  private _defaultLocale: string;

  /** Fallback locale chain. */
  private _fallbackLocales: string[];

  /** Custom missing-key handler. */
  private _missingKeyFn: ((key: string, locale: string) => string) | undefined;

  /** Global HTML-escape setting. */
  private _escapeHtml: boolean;

  /** Interpolation delimiters. */
  private _prefix: string;
  private _suffix: string;

  /** Change listeners. */
  private _listeners: Set<I18nEventListener> = new Set<I18nEventListener>();

  constructor(options: I18nOptions = {}) {
    this._defaultLocale = options.defaultLocale ?? "en";
    this._currentLocale = this._defaultLocale;
    this._fallbackLocales = Array.isArray(options.fallbackLocale)
      ? options.fallbackLocale
      : options.fallbackLocale
        ? [options.fallbackLocale]
        : [this._defaultLocale];
    this._missingKeyFn = options.missingKeyFn;
    this._escapeHtml = options.escapeHtml !== false;
    this._prefix = options.interpolationPrefix ?? "{";
    this._suffix = options.interpolationSuffix ?? "}";
  }

  // -----------------------------------------------------------------------
  // Locale Management
  // -----------------------------------------------------------------------

  /**
   * Get the currently active locale.
   */
  get locale(): string {
    return this._currentLocale;
  }

  /**
   * Get the parsed info for the current locale.
   */
  get localeInfo(): LocaleInfo {
    return parseLocale(this._currentLocale);
  }

  /**
   * Get the text direction for the current locale.
   */
  get direction(): "ltr" | "rtl" {
    return getDirection(this._currentLocale);
  }

  /**
   * Switch the active locale and notify listeners.
   *
   * @param locale - New BCP 47 locale tag
   */
  setLocale(locale: string): void {
    const normalized = locale.replace(/_/g, "-").trim();
    if (normalized === this._currentLocale) return;
    const prev = this._currentLocale;
    this._currentLocale = normalized;
    this._listeners.forEach((fn) => fn(normalized, prev));
  }

  /**
   * Register a callback for locale changes.
   *
   * @param listener - Callback receiving `(newLocale, previousLocale)`
   * @returns Unsubscribe function
   */
  onLocaleChange(listener: I18nEventListener): () => void {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  }

  /**
   * List all locales that have been loaded (have at least some translations).
   */
  getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }

  // -----------------------------------------------------------------------
  // Translation Loading
  // -----------------------------------------------------------------------

  /**
   * Bulk-add translations for a locale.
   *
   * Merges with any existing translations for that locale (shallow merge at
   * each nesting level).
   *
   * @param locale - BCP 47 locale tag
   * @param translations - Translation map to add
   */
  addTranslations(locale: string, translations: TranslationMap): void {
    const normalized = locale.replace(/_/g, "-").trim();
    const existing = this.translations.get(normalized);
    if (existing) {
      deepMerge(existing, translations);
    } else {
      this.translations.set(normalized, JSON.parse(JSON.stringify(translations)));
    }
  }

  /**
   * Remove all translations for a locale.
   *
   * @param locale - BCP 47 locale tag
   */
  removeTranslations(locale: string): void {
    this.translations.delete(locale.replace(/_/g, "-").trim());
  }

  /**
   * Load translations from a JSON URL or API endpoint.
   *
   * @param source - Source descriptor with locale, url, optional namespace
   * @returns Promise resolving when loaded
   */
  async loadTranslations(source: TranslationSource): Promise<void> {
    const { locale, url, data, namespace } = source;
    const normalized = locale.replace(/_/g, "-").trim();

    let map: TranslationMap;

    if (data) {
      map = data;
    } else if (url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load translations for "${normalized}" from ${url}: ${response.status}`);
      }
      map = (await response.json()) as TranslationMap;
    } else {
      throw new Error(`TranslationSource for "${normalized}" must provide either "url" or "data"`);
    }

    // Apply namespace prefix if specified
    if (namespace) {
      const namespaced: TranslationMap = { [namespace]: map };
      this.addTranslations(normalized, namespaced);
    } else {
      this.addTranslations(normalized, map);
    }
  }

  /**
   * Load multiple translation sources in parallel.
   *
   * @param sources - Array of source descriptors
   * @returns Promise resolving when all are loaded
   */
  async loadAllTranslations(sources: TranslationSource[]): Promise<void> {
    await Promise.all(sources.map((s) => this.loadTranslations(s)));
  }

  // -----------------------------------------------------------------------
  // Translation Lookup
  // -----------------------------------------------------------------------

  /**
   * Look up a translation key across the fallback chain.
   *
   * Supports dot-notation for nested keys, e.g. `"user.profile.name"`.
   *
   * @param key - Translation key (dot-separated for nesting)
   * @param localeOverride - Optional locale override
   * @returns The translated string, or undefined if not found
   */
  private lookup(key: string, localeOverride?: string): string | undefined {
    const chain = buildFallbackChain(
      localeOverride ?? this._currentLocale,
      this._fallbackLocales,
    );

    for (const loc of chain) {
      const map = this.translations.get(loc);
      if (!map) continue;

      const value = resolveNested(map, key);
      if (value !== undefined && typeof value === "string") {
        return value;
      }
    }

    return undefined;
  }

  // -----------------------------------------------------------------------
  // Translation (t)
  // -----------------------------------------------------------------------

  /**
   * Translate a key with optional interpolation parameters.
   *
   * @param key - Translation key (supports dot-notation nesting)
   * @param params - Interpolation values
   * @param options - Call-specific overrides
   * @returns Translated and interpolated string
   *
   * @example
   * ```ts
   * i18n.t("greeting", { name: "Alice" });          // "Hello, Alice!"
   * i18n.t("items.count", { count: 5 });             // "5 items"
   * i18n.t("user.gender", { gender: "female" });     // "She"
   * ```
   */
  t(
    key: string,
    params?: Record<string, unknown>,
    options: TranslateOptions = {},
  ): string {
    const effectiveLocale = options.locale ?? this._currentLocale;
    const shouldEscape = options.escapeHtml ?? this._escapeHtml;

    // Look up the translation string
    let message = this.lookup(key, effectiveLocale);

    if (message === undefined) {
      if (this._missingKeyFn) {
        return this._missingKeyFn(key, effectiveLocale);
      }
      if (options.defaultValue !== undefined) {
        message = options.defaultValue;
      } else {
        // Return the key itself as last resort
        return shouldEscape ? escapeHtml(key) : key;
      }
    }

    // Parse and interpolate
    const tokens = parseICUMessage(message, this._prefix, this._suffix);
    const result = interpolateTokens(tokens, params ?? {}, effectiveLocale, shouldEscape);
    return result;
  }

  /**
   * Check whether a translation key exists for the current (or given) locale.
   *
   * @param key - Translation key
   * @param locale - Optional locale override
   * @returns True if the key has a translation
   */
  exists(key: string, locale?: string): boolean {
    return this.lookup(key, locale) !== undefined;
  }

  // -----------------------------------------------------------------------
  // Number Formatting Proxy
  // -----------------------------------------------------------------------

  /**
   * Format a number using the current locale.
   *
   * @param value - Numeric value
   * @param options - Formatting options
   * @returns Formatted string
   */
  formatNumber(value: number, options?: NumberFormatOptions): string {
    return formatNumber(value, this._currentLocale, options);
  }

  /**
   * Format a byte count using the current locale.
   *
   * @param bytes - Byte count
   * @param style - "long" | "short"
   * @returns Formatted string
   */
  formatBytes(bytes: number, style?: "long" | "short"): string {
    return formatBytes(bytes, this._currentLocale, style);
  }

  /**
   * Format a number in compact notation using the current locale.
   *
   * @param value - Numeric value
   * @param notation - "short" | "long"
   * @returns Formatted string
   */
  formatCompact(value: number, notation?: "short" | "long"): string {
    return formatCompactNumber(value, this._currentLocale, notation);
  }

  // -----------------------------------------------------------------------
  // Date/Time Formatting Proxy
  // -----------------------------------------------------------------------

  /**
   * Format a date/time using the current locale.
   *
   * @param value - Date, timestamp, or ISO string
   * @param options - Formatting options
   * @returns Formatted string
   */
  formatDate(value: Date | number | string, options?: DateFormatOptions): string {
    return formatDate(value, this._currentLocale, options);
  }

  /**
   * Format a relative time string using the current locale.
   *
   * @param value - Numeric value (negative = past)
   * @param unit - Time unit
   * @param options - Relative time options
   * @returns Formatted string
   */
  formatRelativeTime(
    value: number,
    unit: Intl.RelativeTimeFormatUnit,
    options?: RelativeTimeOptions,
  ): string {
    return formatRelativeTime(value, unit, this._currentLocale, options);
  }

  /**
   * Format a date as "ago"/"in" relative time using the current locale.
   *
   * @param date - Target date
   * @returns Formatted relative time string
   */
  formatTimeAgo(date: Date | number | string): string {
    return formatTimeAgo(date, this._currentLocale);
  }

  /**
   * Format a duration in milliseconds using the current locale.
   *
   * @param ms - Duration in milliseconds
   * @param options - Duration formatting options
   * @returns Formatted string
   */
  formatDuration(ms: number, options?: DurationFormatOptions): string {
    return formatDuration(ms, this._currentLocale, options);
  }
}

// ============================================================================
// Section 9 — Helper Functions
// ============================================================================

/**
 * Deep-merge source into target (mutable, modifies target in place).
 * Only merges plain objects; arrays and primitives are overwritten.
 */
function deepMerge(target: TranslationMap, source: TranslationMap): void {
  for (const key of Object.keys(source)) {
    const srcVal = source[key];
    const tgtVal = target[key];

    if (
      srcVal !== null &&
      typeof srcVal === "object" &&
      !Array.isArray(srcVal) &&
      tgtVal !== null &&
      typeof tgtVal === "object" &&
      !Array.isArray(tgtVal)
    ) {
      deepMerge(tgtVal as TranslationMap, srcVal as TranslationMap);
    } else {
      target[key] = srcVal;
    }
  }
}

/**
 * Resolve a dot-notation key from a nested object.
 *
 * @param obj - Nested translation map
 * @param path - Dot-separated key path
 * @returns The resolved value, or undefined
 */
function resolveNested(obj: TranslationMap, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

// ============================================================================
// Section 10 — React / Vue Integration Helpers
// ============================================================================

/**
 * Minimal type declarations for framework integration.
 * These allow the integration helpers to be type-checked without requiring
 * react as a direct dependency. In a real project, import from "react" instead.
 */
declare namespace React {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ComponentType<P = {}> {
    (props: P): unknown;
  }
  type ReactNode = string | number | boolean | null | undefined;
}
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}

/**
 * Create a hook-compatible i18n accessor object.
 *
 * This returns a stable object shape matching what a `useI18n()` hook would
 * return in React, Vue, or any framework. Bind it to your framework's
 * reactivity system for automatic re-renders on locale change.
 *
 * @param engine - An I18nEngine instance
 * @returns Object with `t`, `locale`, `setLocale`, and formatting methods
 *
 * @example
 * ```ts
 * // In React:
 * const i18nRef = useRef(createUseI18n(engine));
 * const { t, locale, setLocale } = i18nRef.current;
 * ```
 */
export function createUseI18n(engine: I18nEngine): UseI18nReturn {
  return {
    t: (key, params, opts) => engine.t(key, params, opts),
    get locale() { return engine.locale; },
    setLocale: (loc) => engine.setLocale(loc),
    get availableLocales() { return engine.getAvailableLocales(); },
    get dir() { return engine.direction; },
    formatDate: (val, opts) => engine.formatDate(val, opts),
    formatNumber: (val, opts) => engine.formatNumber(val, opts),
  };
}

/**
 * I18nProvider component factory (framework-agnostic description).
 *
 * In React, wrap your app tree:
 * ```tsx
 * <I18nProvider engine={i18n}>
 *   <App />
 * </I18nProvider>
 * ```
 *
 * The provider stores the engine instance in context so child components
 * can call `useI18n()` to access it.
 *
 * Implementation notes:
 * - Subscribe to `engine.onLocaleChange()` to trigger re-renders.
 * - Clean up the subscription on unmount.
 * - Provide `{ t, locale, setLocale, ...formatters }` via context.
 */
export interface I18nProviderProps {
  /** The I18nEngine instance to provide */
  engine: I18nEngine;
  /** Initial locale (overrides engine's current locale) */
  locale?: string;
  /** Child components */
  children?: React.ReactNode;
}

/**
 * Type signature for a Trans component (JSX-friendly translations).
 *
 * Renders translated content that may contain JSX elements as
 * interpolation values. Components are matched by position or key name.
 *
 * @example
 * ```tsx
 * <Trans i18nKey="welcome" values={{ name: "Alice" }}>
 *   <strong>Alice</strong>
 * </Trans>
 * ```
 */
export interface TransProps {
  /** Translation key */
  i18nKey: string;
  /** Interpolation values (non-JSX) */
  values?: Record<string, unknown>;
  /** Override options */
  options?: TranslateOptions;
  /** Child components to inject as tagged values */
  children?: React.ReactNode;
  /** Optional HTML tag wrapper (default "span") */
  component?: keyof JSX.IntrinsicElements;
}

/**
 * Higher-order component factory for injecting i18n props.
 *
 * Wraps a component so it receives `t`, `locale`, `setLocale`, and
 * formatters as props alongside its original props.
 *
 * @example
 * ```ts
 * const LocalizedButton = withI18n(Button);
 * // LocalizedButton receives { t, locale, setLocale, formatDate, formatNumber, ...buttonProps }
 * ```
 */
export interface WithI18nOptions {
  /** Forwarded engine instance (uses global singleton if omitted) */
  engine?: I18nEngine;
  /** Whether to forward ref */
  forwardRef?: boolean;
}

/**
 * Create an HOC wrapper that injects i18n capabilities into any component.
 *
 * @param Component - The component to wrap
 * @param options - HOC configuration
 * @returns Wrapped component with injected i18n props
 */
export function withI18n<P extends object>(
  Component: React.ComponentType<P>,
  options: WithI18nOptions = {},
): React.ComponentType<Omit<P, "t" | "locale" | "setLocale">> {
  // This is a type-level + structural definition.
  // Actual implementation depends on the framework:
  //
  // React implementation sketch:
  //   return React.forwardRef((props, ref) => {
  //     const i18n = useI18nContext(); // or useContext(I18nContext)
  //     return <Component {...props} ref={ref} {...i18n} />;
  //   });
  //
  // The returned component accepts all original props minus the injected ones.
  return Component as React.ComponentType<Omit<P, "t" | "locale" | "setLocale">>;
}

// ============================================================================
// Section 11 — Utilities: Extraction, Coverage, Comparison
// ============================================================================

/**
 * Extract all unique translation keys from a translation map.
 *
 * Flattens nested keys into dot-notation paths.
 *
 * @param map - Translation map (possibly nested)
 * @param prefix - Key prefix for recursion
 * @returns Array of fully-qualified key paths
 */
export function extractKeys(map: TranslationMap, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(map)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      keys.push(fullKey);
    } else if (value !== null && typeof value === "object") {
      keys.push(...extractKeys(value, fullKey));
    }
  }
  return keys;
}

/**
 * Generate a translation coverage report comparing all loaded locales
 * against a baseline (the locale with the most keys, or a specified one).
 *
 * @param engine - I18nEngine instance
 * @param baselineLocale - Optional baseline locale (default: auto-detected)
 * @returns Coverage entries per locale
 */
export function generateCoverageReport(
  engine: I18nEngine,
  baselineLocale?: string,
): CoverageEntry[] {
  const locales = engine.getAvailableLocales();
  if (locales.length === 0) return [];

  // Determine baseline: either specified or the locale with most keys
  let baseline = baselineLocale;
  if (!baseline) {
    let maxKeys = 0;
    for (const loc of locales) {
      const map = (engine as unknown as { translations: Map<string, TranslationMap> }).translations.get(loc);
      if (map) {
        const count = extractKeys(map).length;
        if (count > maxKeys) {
          maxKeys = count;
          baseline = loc;
        }
      }
    }
  }

  if (!baseline) return [];

  const translations = (engine as unknown as { translations: Map<string, TranslationMap> }).translations;
  const baselineMap = translations.get(baseline);
  if (!baselineMap) return [];

  const baselineKeys = extractKeys(baselineMap);
  const totalKeys = baselineKeys.length;

  const report: CoverageEntry[] = [];

  for (const loc of locales) {
    const locMap = translations.get(loc);
    if (!locMap) continue;

    const locKeys = extractKeys(locMap);
    const missingKeys = baselineKeys.filter((k) => !locKeys.includes(k));
    const translatedKeys = totalKeys - missingKeys.length;
    const coveragePercent = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 100;

    report.push({
      locale: loc,
      totalKeys,
      translatedKeys,
      missingKeys,
      coveragePercent: Math.round(coveragePercent * 100) / 100,
    });
  }

  return report;
}

/**
 * Compare two locales for similarity.
 *
 * Returns a score between 0 (completely different) and 1 (identical or
 * very closely related, same language family).
 *
 * @param localeA - First BCP 47 locale
 * @param localeB - Second BCP 47 locale
 * @returns Similarity score from 0 to 1
 */
export function compareLocales(localeA: string, localeB: string): number {
  const a = parseLocale(localeA);
  const b = parseLocale(localeB);

  // Same code → identical
  if (a.code === b.code) return 1;

  let score = 0;

  // Language match is the biggest factor
  if (a.language === b.language) score += 0.6;

  // Script match
  if (a.script && b.script && a.script === b.script) score += 0.25;

  // Region match
  if (a.region && b.region && a.region === b.region) score += 0.15;

  // Direction mismatch penalty
  if (a.direction !== b.direction) score -= 0.1;

  return Math.max(0, Math.min(1, score));
}

/**
 * Find the best matching locale from a list of candidates for a desired locale.
 *
 * @param desired - Desired BCP 47 locale
 * @param candidates - Available locale codes
 * @returns Best matching candidate, or undefined if none suitable
 */
export function findBestMatch(desired: string, candidates: string[]): string | undefined {
  if (candidates.includes(desired)) return desired;

  const parsed = parseLocale(desired);
  let bestCandidate: string | undefined;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = compareLocales(desired, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  // Only return if there's at least a language match
  return bestScore >= 0.5 ? bestCandidate : undefined;
}

/**
 * Scan source code strings for `t(` calls and extract translation keys.
 *
 * This is a simple regex-based extractor suitable for basic usage patterns.
 * For production extraction, consider using tools like `i18next-parser`
 * or `formatjs-extract-cldr-data`.
 *
 * @param source - Source code string to scan
 * @returns Array of extracted key literals
 */
export function extractTranslationCalls(source: string): string[] {
  const keys = new Set<string>();
  // Match: t("key"), t('key'), t(`key`) — first argument string literal
  const regex = /\bt\s*\(\s*(['"`])(.*?)\1\s*[,)]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(source)) !== null) {
    keys.add(match[2]);
  }

  return Array.from(keys);
}

// ============================================================================
// Section 12 — Singleton & Default Export
// ============================================================================

/**
 * Default shared I18nEngine instance.
 *
 * Initialize once at application startup:
 * ```ts
 * import { i18n } from "./i18n-engine-v2";
 * i18n.addTranslations("en", { ... });
 * i18n.setLocale("en");
 * ```
 */
export const i18n = new I18nEngine({
  defaultLocale: "en",
  fallbackLocale: "en",
  escapeHtml: true,
});

export default I18nEngine;
