/**
 * Cookie consent management utilities.
 */

export type CookieCategory = "essential" | "analytics" | "functional" | "advertising";

export interface CookiePreferences {
  [category in CookieCategory]?: boolean;
}

export interface ConsentState {
  preferences: CookiePreferences;
  consentedAt: number | null;
  version: string;
  method: "banner" | "settings" | "api" | null;
}

const DEFAULT_PREFERENCES: Required<CookiePreferences> = {
  essential: true, // Cannot be disabled
  analytics: false,
  functional: false,
  advertising: false,
};

const CONSENT_STORAGE_KEY = "uiac_cookie_consent";
const CONSENT_VERSION = "1.0.0";

/** Get current consent state */
export function getConsentState(): ConsentState {
  if (typeof document === "undefined") {
    return { ...DEFAULT_PREFERENCES, consentedAt: null, version: CONSENT_VERSION, method: null };
  }

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES, consentedAt: null, version: CONSENT_VERSION, method: null };

    const parsed = JSON.parse(raw) as ConsentState;

    // Check version — reset if outdated
    if (parsed.version !== CONSENT_VERSION) {
      return { ...DEFAULT_PREFERENCES, consentedAt: null, version: CONSENT_VERSION, method: null };
    }

    return {
      ...DEFAULT_PREFERENCES,
      ...parsed.preferences,
      consentedAt: parsed.consentedAt,
      version: parsed.version,
      method: parsed.method,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, consentedAt: null, version: CONSENT_VERSION, method: null };
  }
}

/** Save consent state */
export function saveConsent(
  preferences: Partial<CookiePreferences>,
  method: ConsentState["method"] = "banner",
): ConsentState {
  const current = getConsentState();
  const merged: Required<CookiePreferences> = {
    ...current.preferences,
    ...preferences,
    essential: true, // Always true
  };

  const state: ConsentState = {
    preferences: merged,
    consentedAt: Date.now(),
    version: CONSENT_VERSION,
    method,
  };

  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
    } catch { /* quota */ }
  }

  // Dispatch custom event for other listeners
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cookieConsentChanged", { detail: state }));
  }

  return state;
}

/** Check if a specific cookie category is allowed */
export function isCategoryAllowed(category: CookieCategory): boolean {
  const state = getConsentState();
  return state.preferences[category] ?? false;
}

/** Accept all cookies */
export function acceptAllCookies(): ConsentState {
  return saveConsent({
    analytics: true,
    functional: true,
    advertising: true,
  }, "banner");
}

/** Reject all non-essential cookies */
export function rejectNonEssentialCookies(): ConsentState {
  return saveConsent({
    analytics: false,
    functional: false,
    advertising: false,
  }, "banner");
}

/** Reset consent (show banner again) */
export function resetConsent(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  }
}

/** Check if user has made a consent decision */
export function hasConsented(): boolean {
  const state = getConsentState();
  return state.consentedAt !== null;
}

/** Get consent as string for server-side headers */
export function getConsentHeader(): string {
  const state = getConsentState();
  const parts: string[] = [];

  if (state.preferences.analytics) parts.push("analytics");
  if (state.preferences.functional) parts.push("functional");
  if (state.preferences.advertising) parts.push("advertising");

  return parts.join(",");
}
