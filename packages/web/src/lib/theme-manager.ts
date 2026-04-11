/**
 * Theme Manager: CSS custom property-based theming with light/dark/system
 * mode, custom theme creation, token management, transition animations,
 * persistence, and media query sync.
 */

// --- Types ---

export type ThemeMode = "light" | "dark" | "system";

export interface DesignToken {
  name: string;
  value: string;
  /** CSS variable name (auto-generated from name) */
  variable?: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  mode: "light" | "dark";
  tokens: Record<string, string>;
  /** Base theme to inherit from */
  extends?: string;
}

export interface ThemeManagerInstance {
  /** Current active mode */
  getMode(): ThemeMode;
  /** Set theme mode (light/dark/system) */
  setMode(mode: ThemeMode): void;
  /** Get resolved effective mode (system → actual) */
  getResolvedMode(): "light" | "dark";
  /** Get current theme ID */
  getTheme(): string;
  /** Register a custom theme definition */
  registerTheme(theme: ThemeDefinition): void;
  /** Activate a registered theme by ID */
  activateTheme(themeId: string): void;
  /** Get all registered themes */
  getThemes(): ThemeDefinition[];
  /** Set a single design token value */
  setToken(name: string, value: string): void;
  /** Get a design token's current computed value */
  getToken(name: string): string;
  /** Get all current tokens as key-value map */
  getAllTokens(): Record<string, string>;
  /** Subscribe to mode changes */
  onModeChange(callback: (mode: ThemeMode, resolved: "light" | "dark") => void): () => void;
  /** Subscribe to theme changes */
  onThemeChange(callback: (themeId: string) => void): () => void;
  /** Check if prefers color scheme is dark */
  prefersDark(): boolean;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Default Tokens ---

const DEFAULT_LIGHT_TOKENS: Record<string, string> = {
  // Backgrounds
  "--bg-primary": "#ffffff",
  "--bg-secondary": "#f9fafb",
  "--bg-tertiary": "#f3f4f6",
  "--bg-muted": "#e5e7eb",

  // Text
  "--text-primary": "#111827",
  "--text-secondary": "#4b5563",
  "--text-muted": "#9ca3af",
  "--text-inverse": "#ffffff",

  // Borders
  "--border-default": "#e5e7eb",
  "--border-strong": "#d1d5db",
  "--border-focus": "#6366f1",

  // Accent / brand
  "--accent": "#6366f1",
  "--accent-hover": "#4f46e5",
  "--accent-light": "#e0e7ff",
  "--accent-text": "#ffffff",

  // Status
  "--success": "#10b981",
  "--warning": "#f59e0b",
  "--error": "#ef4444",
  "--info": "#3b82f6",

  // Shadows
  "--shadow-sm": "0 1px 2px rgba(0,0,0,0.05)",
  "--shadow-md": "0 4px 6px -1px rgba(0,0,0,0.1)",
  "--shadow-lg": "0 10px 15px -3px rgba(0,0,0,0.1)",

  // Radius
  "--radius-sm": "4px",
  "--radius-md": "8px",
  "--radius-lg": "12px",
  "--radius-full": "9999px",

  // Transitions
  "--transition-fast": "150ms ease",
  "--transition-normal": "300ms ease",
};

const DEFAULT_DARK_TOKENS: Record<string, string> = {
  "--bg-primary": "#0f172a",
  "--bg-secondary": "#1e293b",
  "--bg-tertiary": "#334155",
  "--bg-muted": "#475569",

  "--text-primary": "#f1f5f9",
  "--text-secondary": "#94a3b8",
  "--text-muted": "#64748b",
  "--text-inverse": "#0f172a",

  "--border-default": "#334155",
  "--border-strong": "#475569",
  "--border-focus": "#818cf8",

  "--accent": "#818cf8",
  "--accent-hover": "#6366f1",
  "--accent-light": "#1e1b4b",
  "--accent-text": "#ffffff",

  "--success": "#34d399",
  "--warning": "#fbbf24",
  "--error": "#f87171",
  "--info": "#60a5fa",

  "--shadow-sm": "0 1px 2px rgba(0,0,0,0.3)",
  "--shadow-md": "0 4px 6px -1px rgba(0,0,0,0.4)",
  "--shadow-lg": "0 10px 15px -3px rgba(0,0,0,0.5)",

  "--radius-sm": "4px",
  "--radius-md": "8px",
  "--radius-lg": "12px",
  "--radius-full": "9999px",

  "--transition-fast": "150ms ease",
  "--transition-normal": "300ms ease",
};

// --- Storage ---

const MODE_STORAGE_KEY = "uac-theme-mode";
const THEME_STORAGE_KEY = "uac-theme-id";

// --- Main Class ---

export class ThemeManager {
  create(defaultMode: ThemeMode = "system"): ThemeManagerInstance {
    const themes = new Map<string, ThemeDefinition>();
    let currentMode: ThemeMode = this.loadMode() ?? defaultMode;
    let currentThemeId = this.loadThemeId() ?? "default";
    let resolvedMode: "light" | "dark" = this.resolveSystem(currentMode);
    let destroyed = false;

    const modeListeners = new Set<(mode: ThemeMode, resolved: "light" | "dark") => void>();
    const themeListeners = new Set<(themeId: string) => void>();

    // Register default themes
    themes.set("default-light", { id: "default-light", name: "Default Light", mode: "light", tokens: { ...DEFAULT_LIGHT_TOKENS } });
    themes.set("default-dark", { id: "default-dark", name: "Default Dark", mode: "dark", tokens: { ...DEFAULT_DARK_TOKENS } });

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent | MediaQueryList): void => {
      if (destroyed || currentMode !== "system") return;
      const newResolved = e.matches ? "dark" : "light";
      if (newResolved !== resolvedMode) {
        resolvedMode = newResolved;
        this.applyTokens(resolvedMode === "dark" ? DEFAULT_DARK_TOKENS : DEFAULT_LIGHT_TOKENS);
        for (const cb of modeListeners) cb(currentMode, resolvedMode);
      }
    };
    mediaQuery.addEventListener("change", handleSystemChange);

    // Apply initial theme
    this.applyInitialTheme();

    function loadMode(): ThemeMode | null {
      try {
        const stored = localStorage.getItem(MODE_STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") return stored;
      } catch { /* ignore */ }
      return null;
    }

    function loadThemeId(): string | null {
      try { return localStorage.getItem(THEME_STORAGE_KEY); } catch { return null; }
    }

    function resolveSystem(mode: ThemeMode): "light" | "dark" {
      if (mode === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      }
      return mode;
    }

    function applyTokens(tokens: Record<string, string>): void {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(tokens)) {
        root.style.setProperty(key, value);
      }
    }

    function applyInitialTheme(): void {
      // Apply base tokens for resolved mode
      applyTokens(resolvedMode === "dark" ? DEFAULT_DARK_TOKENS : DEFAULT_LIGHT_TOKENS);

      // Apply custom theme overrides if any
      const customTheme = themes.get(currentThemeId);
      if (customTheme && customTheme.id !== "default-light" && customTheme.id !== "default-dark") {
        applyTokens(customTheme.tokens);
      }

      // Set data attribute
      document.documentElement.setAttribute("data-theme", resolvedMode);
      document.documentElement.classList.toggle("dark", resolvedMode === "dark");
    }

    const instance: ThemeManagerInstance = {

      getMode() { return currentMode; },

      setMode(mode: ThemeMode): void {
        if (destroyed) return;
        currentMode = mode;
        resolvedMode = resolveSystem(mode);

        try { localStorage.setItem(MODE_STORAGE_KEY, mode); } catch { /* ignore */ }

        applyInitialTheme();
        for (const cb of modeListeners) cb(mode, resolvedMode);
      },

      getResolvedMode() { return resolvedMode; },

      getTheme() { return currentThemeId; },

      registerTheme(theme: ThemeDefinition): void {
        themes.set(theme.id, theme);
      },

      activateTheme(themeId: string): void {
        const theme = themes.get(themeId);
        if (!theme) return;

        currentThemeId = themeId;
        try { localStorage.setItem(THEME_STORAGE_KEY, themeId); } catch { /* ignore */ }

        // Start from base tokens for the resolved mode
        const baseTokens = resolvedMode === "dark" ? { ...DEFAULT_DARK_TOKENS } : { ...DEFAULT_LIGHT_TOKENS };

        // Inherit from parent theme if specified
        if (theme.extends) {
          const parent = themes.get(theme.extends);
          if (parent) Object.assign(baseTokens, parent.tokens);
        }

        // Apply this theme's tokens on top
        Object.assign(baseTokens, theme.tokens);
        applyTokens(baseTokens);

        for (const cb of themeListeners) cb(themeId);
      },

      getThemes(): ThemeDefinition[] {
        return Array.from(themes.values());
      },

      setToken(name: string, value: string): void {
        document.documentElement.style.setProperty(name, value);
      },

      getToken(name: string): string {
        return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      },

      getAllTokens(): Record<string, string> {
        const result: Record<string, string> = {};
        const styles = getComputedStyle(document.documentElement);
        const allKeys = [...Object.keys(DEFAULT_LIGHT_TOKENS), ...themes.get(currentThemeId)?.tokens ? Object.keys(themes.get(currentThemeId)!.tokens) : []];
        for (const key of new Set(allKeys)) {
          result[key] = styles.getPropertyValue(key).trim();
        }
        return result;
      },

      onModeChange(callback): () => void {
        modeListeners.add(callback);
        return () => modeListeners.delete(callback);
      },

      onThemeChange(callback): () => void {
        themeListeners.add(callback);
        return () => themeListeners.delete(callback);
      },

      prefersDark(): boolean {
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
      },

      destroy(): void {
        destroyed = true;
        modeListeners.clear();
        themeListeners.clear();
        mediaQuery.removeEventListener("change", handleSystemChange);
      },
    };

    return instance;
  }

  // --- Private helpers ---

  private applyTokens(tokens: Record<string, string>): void {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(key, value);
    }
  }

  private resolveSystem(mode: ThemeMode): "light" | "dark" {
    if (mode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return mode;
  }

  private loadMode(): ThemeMode | null {
    try {
      const stored = localStorage.getItem(MODE_STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") return stored;
    } catch { /* ignore */ }
    return null;
  }

  private loadThemeId(): string | null {
    try { return localStorage.getItem(THEME_STORAGE_KEY); } catch { return null; }
  }

  private applyInitialTheme(): void {
    // This is overridden in create() closure — kept here for type safety
  }
}

/** Convenience: create a theme manager instance */
export function createThemeManager(defaultMode?: ThemeMode): ThemeManagerInstance {
  return new ThemeManager().create(defaultMode);
}

// --- Standalone Utilities ---

/** Quick toggle between light and dark */
export function toggleTheme(): void {
  const mgr = createThemeManager();
  const current = mgr.getMode();
  mgr.setMode(current === "dark" ? "light" : "dark");
  mgr.destroy(); // Cleanup since we created a throwaway instance
}

/** Check if current page is in dark mode */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") === "dark" ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;
}
