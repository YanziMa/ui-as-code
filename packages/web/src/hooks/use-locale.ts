"use client";

import { useState, useEffect, useCallback } from "react";
import { t as translate, getLocale, setLocale as persistLocale, type Locale, LOCALE_CHANGE_EVENT } from "../lib/i18n";

/**
 * Hook: Reactive locale state with a bound translation function.
 *
 * Returns `[locale, setLocale, t]` where:
 * - `locale` is the current locale string (`"en"` | `"zh"`)
 * - `setLocale(locale)` persists the new locale and triggers re-renders everywhere
 * - `t(key)` translates `key` using the **current** locale (no need to pass it)
 *
 * Every hook instance listens for the same `"locale-change"` custom event,
 * so changing the locale in one component updates them all.
 */
export function useLocale(): [Locale, (locale: Locale) => void, (key: string) => string] {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  useEffect(() => {
    function handleLocaleChange(e: Event) {
      const detail = (e as CustomEvent<Locale>).detail;
      if (detail) {
        setLocaleState(detail);
      }
    }

    window.addEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
    return () => window.removeEventListener(LOCALE_CHANGE_EVENT, handleLocaleChange);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    persistLocale(newLocale);
    // The event listener above will call setLocaleState, but we also
    // set it here synchronously so the caller sees the update immediately.
    setLocaleState(newLocale);
  }, []);

  // Bind `t` to the current locale so callers don't need to pass it.
  const boundT = useCallback(
    (key: string): string => translate(key, locale),
    [locale],
  );

  return [locale, setLocale, boundT];
}
