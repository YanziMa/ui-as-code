/**
 * Internationalization (i18n) system for UI-as-Code.
 *
 * Provides locale-aware translation lookup, locale persistence via
 * localStorage, and a shared event bus so all consumers react to
 * locale changes at once.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Locale = "en" | "zh";

/** Storage key used for persisting the user's locale preference. */
const LOCALE_STORAGE_KEY = "uac-locale";

/** Custom event name dispatched on `window` when the locale changes. */
export const LOCALE_CHANGE_EVENT = "locale-change";

// ---------------------------------------------------------------------------
// Translation data
// ---------------------------------------------------------------------------

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.dashboard": "Dashboard",
    "nav.prDashboard": "PR Dashboard",
    "nav.settings": "Settings",
    "nav.webhooks": "Webhooks",

    // Search & actions
    "action.search": "Search...",
    "action.submit": "Submit",
    "action.cancel": "Cancel",
    "action.save": "Save",
    "action.delete": "Delete",
    "action.edit": "Edit",
    "action.copy": "Copy",
    "action.close": "Close",
    "action.refresh": "Refresh",
    "action.back": "Back",
    "action.next": "Next",
    "action.previous": "Previous",

    // Status messages
    "status.loading": "Loading...",
    "status.error": "Error",
    "status.success": "Success",
    "status.noData": "No data",

    // Display toggles
    "display.viewAll": "View All",
    "display.showMore": "Show more",
    "display.notifications": "Notifications",

    // Common labels
    "common.name": "Name",
    "common.description": "Description",
    "common.createdAt": "Created at",
    "common.updatedAt": "Updated at",
    "common.status": "Status",
    "common.actions": "Actions",
    "common.confirm": "Confirm",
    "common.language": "Language",
  },

  zh: {
    // Navigation
    "nav.home": "\u9996\u9875",
    "nav.dashboard": "\u4eea\u8868\u76d8",
    "nav.prDashboard": "PR \u4eea\u8868\u76d8",
    "nav.settings": "\u8bbe\u7f6e",
    "nav.webhooks": "Webhooks",

    // Search & actions
    "action.search": "\u641c\u7d22...",
    "action.submit": "\u63d0\u4ea4",
    "action.cancel": "\u53d6\u6d88",
    "action.save": "\u4fdd\u5b58",
    "action.delete": "\u5220\u9664",
    "action.edit": "\u7f16\u8f91",
    "action.copy": "\u590d\u5236",
    "action.close": "\u5173\u95ed",
    "action.refresh": "\u5237\u65b0",
    "action.back": "\u8fd4\u56de",
    "action.next": "\u4e0b\u4e00\u6b65",
    "action.previous": "\u4e0a\u4e00\u6b65",

    // Status messages
    "status.loading": "\u52a0\u8f7d\u4e2d...",
    "status.error": "\u9519\u8bef",
    "status.success": "\u6210\u529f",
    "status.noData": "\u6682\u65e0\u6570\u636e",

    // Display toggles
    "display.viewAll": "\u67e5\u770b\u5168\u90e8",
    "display.showMore": "\u663e\u793a\u66f4\u591a",
    "display.notifications": "\u901a\u77e5",

    // Common labels
    "common.name": "\u540d\u79f0",
    "common.description": "\u63cf\u8ff0",
    "common.createdAt": "\u521b\u5efa\u65f6\u95f4",
    "common.updatedAt": "\u66f4\u65b0\u65f6\u95f4",
    "common.status": "\u72b6\u6001",
    "common.actions": "\u64cd\u4f5c",
    "common.confirm": "\u786e\u8ba4",
    "common.language": "\u8bed\u8a00",
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Look up a translation string by key for the given (or current) locale.
 *
 * Fallback chain:
 *   1. Requested locale translation
 *   2. English ("en") translation
 *   3. The raw key itself (last resort)
 */
export function t(key: string, locale?: Locale): string {
  const targetLocale = locale ?? getLocale();

  if (translations[targetLocale]?.[key] !== undefined) {
    return translations[targetLocale][key];
  }

  if (targetLocale !== "en" && translations.en?.[key] !== undefined) {
    return translations.en[key];
  }

  return key;
}

/**
 * Read the persisted locale from localStorage.
 * Defaults to `"en"` when no value is stored or when called outside a browser.
 */
export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";

  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === "zh" || stored === "en") return stored;

  return "en";
}

/**
 * Persist the chosen locale and broadcast a `"locale-change"` event so that
 * every `useLocale` hook instance re-renders automatically.
 */
export function setLocale(locale: Locale): void {
  if (typeof window === "undefined") return;

  const previous = getLocale();
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);

  // Only dispatch if the value actually changed – avoids infinite loops.
  if (previous !== locale) {
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: locale }));
  }
}
