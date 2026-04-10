/**
 * Color Scheme: Dark mode / light mode detection and management with
 * `prefers-color-scheme` media query, system preference detection,
 * forced colors (high contrast) detection, color scheme change events,
 * CSS custom property synchronization, and theme persistence.
 */

// --- Types ---

export type ColorScheme = "light" | "dark" | "system";

export type ContrastMode = "normal" | "forced" | "more" | "less" | "custom";

export interface ColorSchemeState {
  /** Active color scheme */
  scheme: ColorScheme;
  /** Resolved scheme (actual, never "system") */
  resolved: "light" | "dark";
  /** System preference */
  systemPreference: "light" | "dark";
  /** Whether forced colors are active (Windows high contrast) */
  isForcedColors: boolean;
  /** Contrast preference */
  contrastMode: ContrastMode;
}

export interface ColorSchemeOptions {
  /** Initial color scheme (default: "system") */
  initialScheme?: ColorScheme;
  /** Key for localStorage persistence (default: "color-scheme") */
  storageKey?: string;
  /** Callback on scheme change */
  onChange?: (state: ColorSchemeState) => void;
  /** CSS custom property name for the scheme variable? */
  cssVar?: string;
  /** Class to add to <html> element ("dark", "light", or both?) */
  htmlClass?: {
    dark?: string;   // Class added when dark (default: "dark")
    light?: string;  // Class added when light (default: none)
    target?: HTMLElement; // Default: document.documentElement
  };
  /** Sync with system preference changes? (default: true) */
  followSystem?: boolean;
}

export interface ColorSchemeInstance {
  /** Get current state */
  getState: () => ColorSchemeState;
  /** Get current resolved scheme ("light" or "dark") */
  getScheme: () => "light" | "dark";
  /** Set color scheme explicitly */
  setScheme: (scheme: ColorScheme) => void;
  /** Toggle between light and dark */
  toggle: () => "light" | "dark";
  /** Reset to system preference */
  resetToSystem: () => void;
  /** Check if currently dark */
  isDark: () => boolean;
  /** Check if currently light */
  isLight: () => boolean;
  /** Check if forced colors are active */
  hasForcedColors: () => boolean;
  /** Subscribe to state changes */
  subscribe: (callback: (state: ColorSchemeState) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getForcedColorsStatus(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(forced-colors: active)").matches;
}

function getContrastMode(): ContrastMode {
  if (typeof window === "undefined") return "normal";
  if (window.matchMedia("(prefers-contrast: more)").matches) return "more";
  if (window.matchMedia("(prefers-contrast: less)").matches) return "less";
  if (window.matchMedia("(prefers-contrast: custom)").matches) return "custom";
  if (getForcedColorsStatus()) return "forced";
  return "normal";
}

function readStoredScheme(storageKey: string): ColorScheme | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch { /* localStorage unavailable */ }
  return null;
}

function storeScheme(storageKey: string, scheme: ColorScheme): void {
  try {
    if (scheme === "system") {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, scheme);
    }
  } catch { /* localStorage unavailable */ }
}

// --- Main Class ---

export class ColorSchemeManager {
  create(options: ColorSchemeOptions = {}): ColorSchemeInstance {
    let destroyed = false;

    // Options
    const storageKey = options.storageKey ?? "color-scheme";
    const followSystem = options.followSystem ?? true;
    const cssVar = options.cssVar;
    const htmlConfig = options.htmlClass ?? {};

    // State
    let currentScheme: ColorScheme = options.initialScheme ??
      readStoredScheme(storageKey) ?? "system";
    let systemPref = getSystemPreference();

    const subscribers = new Set<(state: ColorSchemeState) => void>();
    let mediaQueryListener: ((ev: MediaQueryListEvent) => void) | null = null;

    function resolveScheme(scheme: ColorScheme): "light" | "dark" {
      return scheme === "system" ? systemPref : scheme;
    }

    function buildState(): ColorSchemeState {
      return {
        scheme: currentScheme,
        resolved: resolveScheme(currentScheme),
        systemPreference: systemPref,
        isForcedColors: getForcedColorsStatus(),
        contrastMode: getContrastMode(),
      };
    }

    function applyScheme(resolved: "light" | "dark"): void {
      // CSS custom property
      if (cssVar && typeof document !== "undefined") {
        document.documentElement.style.setProperty(cssVar, resolved);
      }

      // HTML class
      const target = htmlConfig.target ?? document.documentElement;
      const darkCls = htmlConfig.dark ?? "dark";
      const lightCls = htmlConfig.light;

      if (resolved === "dark") {
        target.classList.add(darkCls);
        if (lightCls) target.classList.remove(lightCls);
      } else {
        target.classList.remove(darkCls);
        if (lightCls) target.classList.add(lightCls);
      }

      // Meta theme-color (for mobile browser chrome)
      updateMetaThemeColor(resolved);
    }

    function updateMetaThemeColor(scheme: "light" | "dark"): void {
      const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
      if (meta) {
        meta.content = scheme === "dark" ? "#000000" : "#ffffff";
      }
    }

    function notifyChange(): void {
      const state = buildState();
      options.onChange?.(state);
      for (const cb of subscribers) cb(state);
    }

    function setAndApply(scheme: ColorScheme): void {
      currentScheme = scheme;
      storeScheme(storageKey, scheme);
      const resolved = resolveScheme(scheme);
      applyScheme(resolved);
      notifyChange();
    }

    // Listen for system preference changes
    if (followSystem && typeof window !== "undefined") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQueryListener = (ev: MediaQueryListEvent): void => {
        if (destroyed) return;
        systemPref = ev.matches ? "dark" : "light";
        if (currentScheme === "system") {
          applyScheme(systemPref);
          notifyChange();
        }
      };

      if (typeof mql.addEventListener === "function") {
        mql.addEventListener("change", mediaQueryListener);
      } else {
        mql.addListener(mediaQueryListener as () => void);
      }
    }

    // Apply initial scheme
    applyScheme(resolveScheme(currentScheme));

    const instance: ColorSchemeInstance = {

      getState: buildState,

      getScheme: () => resolveScheme(currentScheme),

      setScheme(scheme: ColorScheme): void {
        if (destroyed) return;
        setAndApply(scheme);
      },

      toggle(): "light" | "dark" {
        const next = instance.isDark() ? "light" : "dark";
        setAndApply(next);
        return next;
      },

      resetToSystem(): void {
        setAndApply("system");
      },

      isDark: () => resolveScheme(currentScheme) === "dark",

      isLight: () => resolveScheme(currentScheme) === "light",

      hasForcedColors: () => getForcedColorsStatus(),

      subscribe(callback): () => void {
        subscribers.add(callback);
        callback(buildState()); // Immediate call
        return () => { subscribers.delete(callback); };
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;

        if (mediaQueryListener && typeof window !== "undefined") {
          const mql = window.matchMedia("(prefers-color-scheme: dark)");
          if (typeof mql.removeEventListener === "function") {
            mql.removeEventListener("change", mediaQueryListener);
          } else {
            mql.removeListener(mediaQueryListener as () => void);
          }
        }

        subscribers.clear();

        // Clean up classes
        const target = htmlConfig.target ?? document.documentElement;
        const darkCls = htmlConfig.dark ?? "dark";
        const lightCls = htmlConfig.light;
        target.classList.remove(darkCls);
        if (lightCls) target.classList.remove(lightCls);

        if (cssVar) {
          document.documentElement.style.removeProperty(cssVar);
        }
      },
    };

    return instance;
  }
}

/** Convenience: create a color scheme manager */
export function createColorScheme(options?: ColorSchemeOptions): ColorSchemeInstance {
  return new ColorSchemeManager().create(options);
}

// --- Standalone utilities ---

/** Quick check: does user prefer dark mode? */
export function prefersDarkMode(): boolean {
  return getSystemPreference() === "dark";
}

/** Quick check: are forced colors (high contrast) active? */
export function hasForcedColors(): boolean {
  return getForcedColorsStatus();
}
