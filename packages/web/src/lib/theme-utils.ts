/**
 * Theme Utilities: CSS custom property (variable) management, theme switching,
 * dark/light mode detection, system preference following, design token system,
 * theme persistence, and CSS variable generation.
 */

// --- Types ---

export type ThemeMode = "light" | "dark" | "system";

export interface DesignToken {
  /** CSS variable name (e.g., --color-primary) */
  name: string;
  /** Value (any valid CSS value) */
  value: string;
}

export interface ThemeDefinition {
  /** Theme name/ID */
  name: string;
  /** Display name */
  displayName?: string;
  /** Whether this is a dark mode variant */
  dark?: boolean;
  /** Design tokens / CSS variables for this theme */
  tokens: DesignToken[];
}

export interface ThemeManagerConfig {
  /** Root element to apply variables to. Default document.documentElement */
  root?: HTMLElement;
  /** Available themes */
  themes: ThemeDefinition[];
  /** Initial theme name */
  defaultTheme?: string;
  /** Persist choice in localStorage. Default true */
  persist?: boolean;
  /** Storage key for persistence. Default "theme-preference" */
  storageKey?: string;
  /** Follow system preference when mode is "system". Default true */
  followSystem?: boolean;
  /** Called when theme changes */
  onThemeChange?: (themeName: string, mode: ThemeMode) => void;
  /** Transition duration for theme switch (ms). Default 200 */
  transitionDuration?: number;
  /** Add data-theme attribute to root. Default true */
  setDataAttribute?: boolean;
}

// --- System Preference Detection ---

/** Detect the user's OS-level color scheme preference */
export function getSystemColorScheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

/** Listen for system color scheme changes */
export function onSystemColorSchemeChange(
  callback: (scheme: "light" | "dark") => void,
): () => void {
  if (!window.matchMedia) return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? "dark" : "light");
  };
  mql.addEventListener?.("change", handler);
  return () => {
    mql.removeEventListener?.("change", handler as EventListener);
  };
}

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Check if user prefers high contrast */
export function prefersHighContrast(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-contrast: high)").matches || window.matchMedia("(prefers-contrast: more)").matches;
}

/** Check if user prefers light color temperature (warm) */
export function prefersLightColor(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

// --- Core Theme Manager ---

/**
 * ThemeManager - manages CSS custom property themes with dark/light mode support.
 *
 * @example
 * ```ts
 * const themes = new ThemeManager({
 *   themes: [
 *     { name: "light", tokens: [{ name: "--bg", value: "#ffffff" }, { name: "--text", value: "#111827" }] },
 *     { name: "dark", dark: true, tokens: [{ name: "--bg", value: "#111827" }, { name: "--text", value: "#f9fafb" }] },
 *   ],
 *   defaultTheme: "light",
 * });
 * themes.setTheme("dark"); // Switch to dark mode
 * ```
 */
export class ThemeManager {
  private config: Required<ThemeManagerConfig>;
  private _currentTheme: string;
  private _mode: ThemeMode = "system";
  private cleanupFns: Array<() => void> = [];

  constructor(config: ThemeManagerConfig) {
    this.config = {
      root: config.root ?? document.documentElement,
      persist: config.persist ?? true,
      storageKey: config.storageKey ?? "theme-preference",
      followSystem: config.followSystem ?? true,
      transitionDuration: config.transitionDuration ?? 200,
      setDataAttribute: config.setDataAttribute ?? true,
      ...config,
    };

    // Load persisted preference
    let savedMode: ThemeMode = "system";
    if (this.config.persist) {
      try {
        savedMode = localStorage.getItem(this.config.storageKey) as ThemeMode ?? "system";
      } catch {}
    }

    // Determine initial theme
    if (config.defaultTheme) {
      this._currentTheme = config.defaultTheme;
    } else if (savedMode === "dark" || savedMode === "light") {
      const match = this.config.themes.find((t) =>
        savedMode === "dark" ? t.dark : !t.dark,
      );
      this._currentTheme = match?.name ?? this.config.themes[0]?.name ?? "light";
    } else {
      this._currentTheme = this.config.themes[0]?.name ?? "light";
    }

    this._mode = savedMode;

    // Apply initial theme
    this._applyTheme(this._currentTheme);

    // Listen for system changes
    if (this.config.followSystem) {
      const cleanup = onSystemColorSchemeChange((scheme) => {
        if (this._mode === "system") {
          const targetTheme = this._findThemeForScheme(scheme);
          if (targetTheme && targetTheme !== this._currentTheme) {
            this.setTheme(targetTheme.name, "system");
          }
        }
      });
      this.cleanupFns.push(cleanup);
    }
  }

  /** Get current theme name */
  getThemeName(): string { return this._currentTheme; }

  /** Get current mode (light/dark/system) */
  getMode(): ThemeMode { return this._mode; }

  /** Check if currently in dark mode */
  isDark(): boolean {
    const theme = this.config.themes.find((t) => t.name === this._currentTheme);
    return theme?.dark ?? false;
  }

  /** Get all available themes */
  getThemes(): ThemeDefinition[] { return [...this.config.themes]; }

  /** Set theme by name */
  setTheme(themeName: string, mode: ThemeMode = "manual"): void {
    const theme = this.config.themes.find((t) => t.name === themeName);
    if (!theme) return;

    this._currentTheme = themeName;
    this._mode = mode;
    this._applyTheme(themeName);

    // Persist
    if (this.config.persist && mode !== "system") {
      try {
        localStorage.setItem(this.config.storageKey, theme.dark ? "dark" : "light");
      } catch {}
    }

    this.config.onThemeChange?.(themeName, mode);
  }

  /** Toggle between light and dark */
  toggle(): void {
    const currentDark = this.isDark();
    const targetScheme = currentDark ? "light" : "dark";
    const targetTheme = this._findThemeForScheme(targetScheme);
    if (targetTheme) {
      this.setTheme(targetTheme.name, "manual");
    }
  }

  /** Switch to "system" mode (follows OS preference) */
  followSystemMode(): void {
    this._mode = "system";
    const scheme = getSystemColorScheme();
    const targetTheme = this._findThemeForScheme(scheme);
    if (targetTheme) {
      this._applyTheme(targetTheme.name);
      this._currentTheme = targetTheme.name;
      this.config.onThemeChange?.(targetTheme.name, "system");

      if (this.config.persist) {
        try { localStorage.removeItem(this.config.storageKey); } catch {}
      }
    }
  }

  /** Force light mode */
  setLight(): void {
    const target = this.config.themes.find((t) => !t.dark);
    if (target) this.setTheme(target.name, "manual");
  }

  /** Force dark mode */
  setDark(): void {
    const target = this.config.themes.find((t) => t.dark);
    if (target) this.setTheme(target.name, "manual");
  }

  /** Get all CSS variable values for current theme */
  getCSSVariables(): Record<string, string> {
    const theme = this.config.themes.find((t) => t.name === this._currentTheme);
    if (!theme) return {};
    const vars: Record<string, string> = {};
    for (const token of theme.tokens) {
      vars[token.name] = token.value;
    }
    return vars;
  }

  /** Get a specific CSS variable value */
  getCSSValue(varName: string): string | undefined {
    return this.getCSSVariables()[varName];
  }

  /** Update a single CSS variable without switching themes */
  setVariable(name: string, value: string): void {
    this.config.root.style.setProperty(name, value);
  }

  /** Destroy and clean up */
  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
  }

  // --- Private ---

  private _applyTheme(themeName: string): void {
    const theme = this.config.themes.find((t) => t.name === themeName);
    if (!theme) return;

    const root = this.config.root;

    // Add transition for smooth theme change
    if (this.config.transitionDuration > 0) {
      root.style.transition = `background-color ${this.config.transitionDuration}ms ease, color ${this.config.transitionDuration}ms ease`;
    }

    // Apply all tokens as CSS custom properties
    for (const token of theme.tokens) {
      root.style.setProperty(token.name, token.value);
    }

    // Set data attribute
    if (this.config.setDataAttribute) {
      root.setAttribute("data-theme", theme.dark ? "dark" : "light");
    }

    // Remove transition after animation completes
    if (this.config.transitionDuration > 0) {
      setTimeout(() => {
        root.style.transition = "";
      }, this.config.transitionDuration);
    }
  }

  private _findThemeForScheme(scheme: "light" | "dark"): ThemeDefinition | undefined {
    const isDark = scheme === "dark";
    return this.config.themes.find((t) => t.dark === isDark) ??
      this.config.themes.find((t) => !t.dark) ??
      undefined;
  }
}

// --- Design Token Helpers ---

/** Generate a complete set of design tokens for a theme */
export function generateDesignTokens(options: {
  primary?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  textPrimary?: string;
  textSecondary?: string;
  border?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
  radius?: string;
  shadow?: string;
}): DesignToken[] {
  const {
    primary = "#3b82f6",
    secondary = "#64748b",
    background = "#ffffff",
    surface = "#f9fafb",
    textPrimary = "#111827",
    textSecondary = "#6b7280",
    border = "#e5e7eb",
    success = "#22c55e",
    warning = "#f59e0b",
    error = "#ef4444",
    info = "#3b82f6",
    radius = "8px",
    shadow = "0 4px 12px rgba(0,0,0,0.1)",
  } = options;

  return [
    { name: "--color-primary", value: primary },
    { name: "--color-primary-hover", value: adjustBrightness(primary, -10) },
    { name: "--color-secondary", value: secondary },
    { name: "--color-background", value: background },
    { name: "--color-surface", value: surface },
    { name: "--color-text", value: textPrimary },
    { name: "--color-text-secondary", value: textSecondary },
    { name: "--color-border", value: border },
    { name: "--color-success", value: success },
    { name: "--color-warning", value: warning },
    { name: "--color-error", value: error },
    { name: "--color-info", value: info },
    { name: "--radius", value: radius },
    { name: "--shadow-sm", value: shadow },
    { name: "--shadow-md", value: "0 8px 24px rgba(0,0,0,0.12)" },
    { name: "--shadow-lg", value: "0 16px 48px rgba(0,0,0,0.16)" },
  ];
}

/** Generate dark variants of tokens (auto-inverts colors) */
export function generateDarkTokens(lightTokens: DesignToken[]): DesignToken[] {
  return lightTokens.map((token) => ({
    ...token,
    value: invertForDarkMode(token.value),
  }));
}

/** Create a full light + dark theme pair ready for ThemeManager */
export function createLightDarkTheme(
  name = "app",
  options?: Partial<{ primary: string; background: string; surface: string; text: string }>,
): { light: ThemeDefinition; dark: ThemeDefinition } {
  const lightTokens = generateDesignTokens(options);
  const darkTokens = generateDarkTokens(lightTokens);

  return {
    light: { name: `${name}-light`, tokens: lightTokens },
    dark: { name: `${name}-dark`, dark: true, tokens: darkTokens },
  };
}

// --- Color Utilities ---

/** Adjust brightness of a hex color by percentage (-100 to 100) */
function adjustBrightness(hex: string, percent: number): string {
  hex = hex.replace("#", "");
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + Math.round(2.55 * percent)));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent)));
  const b = Math.max(0, Math.min(255, (num & 0xff) + Math.round(2.55 * percent)));
  return `#${(r.toString(16).padStart(2, "0"))}${(g.toString(16).padStart(2, "0"))}${(b.toString(16).padStart(2, "0"))}`;
}

/** Heuristic inversion for dark mode */
function invertForDarkMode(cssValue: string): string {
  // If it looks like a hex color, invert it
  if (/^#[0-9a-f]{3,6}$/i.test(cssValue)) {
    return adjustBrightness(cssValue, -40);
  }
  // If it's an rgb(a) color, try simple inversion
  if (/^rgb/i.test(cssValue)) {
    return cssValue.replace(/(\d+(\.\d+)?)/g, (_m, val) => {
      const v = parseFloat(val!);
      return String(Math.round(255 - v));
    });
  }
  // Otherwise return as-is (could be a named color, url, etc.)
  return cssValue;
}
