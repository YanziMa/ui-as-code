/**
 * React hooks and components for internationalization (i18n).
 * Works with the i18n-utils.ts locale utilities.
 */

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

// --- Types ---

export interface I18nConfig {
  /** Default locale */
  defaultLocale: string;
  /** Available locales */
  locales: string[];
  /** Translation dictionaries */
  translations: Record<string, Record<string, string>>;
  /** Callback when locale changes */
  onLocaleChange?: (locale: string) => void;
}

export interface I18nContextValue {
  /** Current locale code */
  locale: string;
  /** Change locale */
  setLocale: (locale: string) => void;
  /** Translate a key */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Available locales */
  locales: string[];
  /** Current direction ('ltr' or 'rtl') */
  direction: "ltr" | "rtl";
  /** Whether current locale is RTL */
  isRtl: boolean;
}

// --- Context ---

const I18nContext = createContext<I18nContextValue | null>(null);

// --- Provider ---

interface I18nProviderProps {
  config: I18nConfig;
  children: React.ReactNode;
}

export function I18nProvider({ config, children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState(config.defaultLocale);

  const rtlLocales = useMemo(() => ["ar", "he", "fa", "ur"], []);
  const isRtl = useMemo(() => rtlLocales.includes(locale), [locale, rtlLocales]);
  const direction = useMemo(() => (isRtl ? "rtl" as const : "ltr" as const), [isRtl]);

  const setLocale = useCallback(
    (newLocale: string) => {
      if (!config.locales.includes(newLocale)) return;
      setLocaleState(newLocale);
      config.onLocaleChange?.(newLocale);
    },
    [config],
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = config.translations[locale] ?? config.translations[config.defaultLocale] ?? {};
      let text = dict[key] ?? key;

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }

      return text;
    },
    [locale, config],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, locales: config.locales, direction, isRtl }),
    [locale, setLocale, t, config.locales, direction, isRtl],
  );

  return (
    <I18nContext.Provider value={value}>
      <div dir={direction} lang={locale}>
        {children}
      </div>
    </I18nContext.Provider>
  );
}

// --- Hooks ---

/** Access the i18n context */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

/** Translation hook shorthand */
export function useTranslation() {
  const { t, locale, setLocale, isRtl, direction } = useI18n();
  return { t, locale, setLocale, isRtl, direction };
}

/** Hook to get formatted date/time based on current locale */
export function useFormattedDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const { locale } = useI18n();

  const d = typeof date === "string" ? new Date(date) : date;
  return useMemo(() => {
    try {
      return d.toLocaleDateString(locale, options);
    } catch {
      return d.toLocaleDateString();
    }
  }, [d, locale, options]);
}

/** Hook to get formatted number based on current locale */
export function useFormattedNumber(value: number, options?: Intl.NumberFormatOptions): string {
  const { locale } = useI18n();

  return useMemo(() => {
    try {
      return value.toLocaleString(locale, options);
    } catch {
      return value.toLocaleString();
    }
  }, [value, locale, options]);
}

/** Hook to get relative time based on current locale */
export function useRelativeTime(date: Date | string): string {
  const { locale } = useI18n();
  const d = typeof date === "string" ? new Date(date) : date;

  const rtf = useMemo(() => {
    try {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    } catch {
      return null;
    }
  }, [locale]);

  const result = useMemo(() => {
    if (!rtf) return "";
    const now = Date.now();
    const diff = d.getTime() - now;
    const absDiff = Math.abs(diff);

    const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
      [60, "second"],
      [60, "minute"],
      [24, "hour"],
      [30, "day"],
      [12, "month"],
      [Infinity, "year"],
    ];

    let value = absDiff / 1000; // Start with seconds
    for (const [threshold, unit] of units) {
      if (value < threshold) {
        return rtf.format(Math.round(diff > 0 ? value : -value), unit);
      }
      value /= threshold;
    }

    return "";
  }, [d, rtf]);

  return result;
}

// --- Components ---

/** Locale switcher dropdown component */
export function LocaleSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, locales } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const localeNames: Record<string, string> = {
    en: "English",
    zh: "\u4E2D\u6587",
    ja: "\u65E5\u672C\u8A9E",
    ko: "\uD55C\uAD6D\uC5B4",
    de: "Deutsch",
    fr: "Fran\u00E7ais",
    es: "Espa\u00F1ol",
    pt: "Portugu\u00EAs",
    ru: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    ar: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629",
  };

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
      >
        <span>{localeNames[locale] ?? locale}</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px]">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => { setLocale(loc); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg ${
                loc === locale ? "bg-indigo-50 text-indigo-600 font-medium" : ""
              }`}
            >
              {localeNames[loc] ?? loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Translated text component */
export function Trans({
  i18nKey,
  values,
  components,
}: {
  i18nKey: string;
  values?: Record<string, string | number>;
  components?: Record<string, React.ReactNode>;
}) {
  const { t } = useI18n();
  const translated = t(i18nKey, values);

  if (!components) return <>{translated}</>;

  // Simple component interpolation: {componentName}
  const parts = translated.split(/(\{[^}]+\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\{(.+)\}$/);
        if (match && components?.[match[1]!]) {
          return <React.Fragment key={i}>{components[match[1]!]}</React.Fragment>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

/** RTL-aware wrapper component */
export function RtlWrapper({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isRtl, direction } = useI18n();
  return (
    <div dir={direction} className={isRtl ? `rtl ${className ?? ""}` : className}>
      {children</div>
  );
}
