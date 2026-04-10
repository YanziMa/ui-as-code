/**
 * Theme System: Light/dark mode switching, CSS custom properties (design tokens),
 * theme persistence, system preference detection, custom theme registration,
 * and runtime token manipulation.
 */

// --- Types ---

export type ThemeMode = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

export interface DesignToken {
  /** CSS variable name (e.g., "--color-primary") */
  name: string;
  /** Value in light mode */
  light: string;
  /** Value in dark mode */
  dark: string;
}

export interface ThemeTokens {
  colors?: Record<string, { light: string; dark: string }>;
  spacing?: Record<string, string>;
  typography?: Record<string, { light: string; dark: string } | string>;
  radii?: Record<string, string>;
  shadows?: Record<string, { light: string; dark: string }>;
  transitions?: Record<string, string>;
}

export interface ThemeConfig {
  /** Default theme mode */
  defaultMode?: ThemeMode;
  /** Storage key for persistence (default: "theme-mode") */
  storageKey?: string;
  /** Root element to apply CSS vars (default: document.documentElement) */
  root?: HTMLElement;
  /** Custom design tokens */
  tokens?: ThemeTokens;
  /** Callback on theme change */
  onChange?: (mode: ThemeMode, scheme: ColorScheme) => void;
  /** Respect system preference? (default: true) */
  followSystem?: boolean;
  /** Transition duration when switching themes (ms) */
  transitionDuration?: number;
  /** Additional class names for dark mode */
  darkClass?: string;
  /** Use class-based toggling vs media query (default: false = use media query) */
  useClass?: boolean;
}

// --- Default Tokens ---

const DEFAULT_TOKENS: ThemeTokens = {
  colors: {
    "color-primary":     { light: "#4338ca", dark: "#818cf8" },
    "color-secondary":   { light: "#6b7280", dark: "#9ca3af" },
    "color-success":     { light: "#16a34a", dark: "#4ade80" },
    "color-warning":     { light: "#d97706", dark: "#fbbf24" },
    "color-error":       { light: "#dc2626", dark: "#f87171" },
    "color-bg":          { light: "#ffffff", dark: "#0f172a" },
    "color-bg-secondary":{ light: "#f9fafb", dark: "#1e293b" },
    "color-bg-tertiary": { light: "#f3f4f6", dark: "#334155" },
    "color-text":        { light: "#111827", dark: "#e2e8f0" },
    "color-text-muted":  { light: "#6b7280", dark: "#94a3b8" },
    "color-border":      { light: "#e5e7eb", dark: "#334155" },
    "color-surface":     { light: "#ffffff", dark: "#1e293b" },
  },
  spacing: {
    "space-xs": "4px",
    "space-sm": "8px",
    "space-md": "16px",
    "space-lg": "24px",
    "space-xl": "32px",
    "space-2xl": "48px",
  },
  typography: {
    "font-family-base":   { light: "-apple-system, BlinkMacSystemFont, sans-serif", dark: "-apple-system, BlinkMacSystemFont, sans-serif" },
    "font-family-mono":   { light: "'Fira Code', Consolas, monospace", dark: "'Fira Code', Consolas, monospace" },
    "font-size-xs":  "12px",
    "font-size-sm":  "14px",
    "font-size-base":"16px",
    "font-size-lg":  "18px",
    "font-size-xl":  "20px",
    "font-size-2xl": "24px",
  },
  radii: {
    "radius-sm": "4px",
    "radius-md": "8px",
    "radius-lg": "12px",
    "radius-xl": "16px",
    "radius-full": "9999px",
  },
  shadows: {
    "shadow-sm": { light: "0 1px 2px rgba(0,0,0,0.05)", dark: "0 1px 2px rgba(0,0,0,0.3)" },
    "shadow-md": { light: "0 4px 12px rgba(0,0,0,0.08)", dark: "0 4px 12px rgba(0,0,0,0.4)" },
    "shadow-lg": { light: "0 10px 30px rgba(0,0,0,0.12)", dark: "0 10px 30px rgba(0,0,0,0.5)" },
  },
};

// --- Theme Manager ---

export class ThemeManager {
  private config: Required<ThemeConfig> & ThemeConfig;
  private currentMode: ThemeMode;
  private resolvedScheme: ColorScheme = "light";
  private listeners = new Set<(mode: ThemeMode, scheme: ColorScheme) => void>();
  private mediaQuery: MediaQueryList | null = null;

  constructor(config: ThemeConfig = {}) {
    this.config = {
      defaultMode: config.defaultMode ?? "system",
      storageKey: config.storageKey ?? "theme-mode",
      root: config.root ?? (typeof document !== "undefined" ? document.documentElement : null as unknown as HTMLElement),
      followSystem: config.followSystem ?? true,
      transitionDuration: config.transitionDuration ?? 200,
      darkClass: config.darkClass ?? "dark",
      useClass: config.useClass ?? false,
      tokens: { ...DEFAULT_TOKENS, ...config.tokens },
      ...config,
    };

    // Load saved preference
    this.currentMode = this.loadMode();

    // Apply initial
    if (typeof window !== "undefined") {
      this.applyTheme(this.resolveScheme(this.currentMode));
      this.listenForSystemChanges();
    }
  }

  // --- Public API ---

  /** Get current mode ("light", "dark", or "system") */
  getMode(): ThemeMode { return this.currentMode; }

  /** Get resolved color scheme ("light" or "dark") */
  getScheme(): ColorScheme { return this.resolvedScheme; }

  /** Set theme mode */
  setMode(mode: ThemeMode): void {
    this.currentMode = mode;
    const scheme = this.resolveScheme(mode);
    this.applyTheme(scheme);
    this.saveMode(mode);
    this.config.onChange?.(mode, scheme);
    for (const fn of this.listeners) { try { fn(mode, scheme); } catch {} }
  }

  /** Toggle between light and dark */
  toggle(): void {
    if (this.resolvedScheme === "light") this.setMode("dark");
    else this.setMode("light");
  }

  /** Subscribe to theme changes */
  subscribe(listener: (mode: ThemeMode, scheme: ColorScheme) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentMode, this.resolvedScheme);
    return () => this.listeners.delete(listener);
  }

  /** Get a CSS variable value */
  getToken(name: string): string | null {
    if (!this.config.root) return null;
    return getComputedStyle(this.config.root).getPropertyValue(name).trim() || null;
  }

  /** Set a single CSS variable override */
  setToken(name: string, value: string): void {
    if (!this.config.root) return;
    this.config.root.style.setProperty(name, value);
  }

  /** Register additional tokens and apply them */
  registerTokens(tokens: ThemeTokens): void {
    Object.assign(this.config.tokens!, tokens);
    this.applyTheme(this.resolvedScheme);
  }

  /** Check if currently in dark mode */
  isDark(): boolean { return this.resolvedScheme === "dark"; }

  /** Destroy cleanup */
  destroy(): void {
    this.mediaQuery?.removeEventListener("change", this._systemChangeListener as EventListener);
    this.listeners.clear();
  }

  // --- Internal ---

  private resolveScheme(mode: ThemeMode): ColorScheme {
    if (mode === "light") return "light";
    if (mode === "dark") return "dark";
    // system
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }

  private applyTheme(scheme: ColorScheme): void {
    this.resolvedScheme = scheme;
    const root = this.config.root;
    if (!root) return;

    // Apply color-scheme meta tag
    let metaEl = document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null;
    if (!metaEl) {
      metaEl = document.createElement("meta");
      metaEl.name = "color-scheme";
      document.head.appendChild(metaEl);
    }
    metaEl.content = scheme;

    // Method 1: Class-based toggling
    if (this.config.useClass) {
      root.classList.toggle(this.config.darkClass!, scheme === "dark");
    } else {
      // Method 2: CSS custom properties + color-scheme
      root.setAttribute("data-theme", scheme);
      root.style.colorScheme = scheme;
    }

    // Apply all design tokens as CSS variables
    const tokens = this.config.tokens!;
    if (tokens.colors) {
      for (const [name, val] of Object.entries(tokens.colors)) {
        root.style.setProperty(`--${name}`, scheme === "dark" ? val.dark : val.light);
      }
    }
    if (tokens.spacing) {
      for (const [name, val] of Object.entries(tokens.spacing)) {
        root.style.setProperty(`--${name}`, val);
      }
    }
    if (tokens.typography) {
      for (const [name, val] of Object.entries(tokens.typography)) {
        if (typeof val === "string") root.style.setProperty(`--${name}`, val);
        else root.style.setProperty(`--${name}`, scheme === "dark" ? val.dark : val.light);
      }
    }
    if (tokens.radii) {
      for (const [name, val] of Object.entries(tokens.radii)) {
        root.style.setProperty(`--${name}`, val);
      }
    }
    if (tokens.shadows) {
      for (const [name, val] of Object.entries(tokens.shadows)) {
        root.style.setProperty(`--${name}`, scheme === "dark" ? val.dark : val.light);
      }
    }
    if (tokens.transitions) {
      for (const [name, val] of Object.entries(tokens.transitions)) {
        root.style.setProperty(`--${name}`, val);
      }
    }

    // Add transition effect
    if (this.config.transitionDuration > 0) {
      root.style.transition = `background-color ${this.config.transitionDuration}ms ease, color ${this.config.transitionDuration}ms ease`;
      setTimeout(() => {
        root.style.transition = "";
      }, this.config.transitionDuration);
    }
  }

  private loadMode(): ThemeMode {
    if (typeof localStorage === "undefined") return this.config.defaultMode;
    try {
      const saved = localStorage.getItem(this.config.storageKey);
      if (saved === "light" || saved === "dark" || saved === "system") return saved;
    } catch {}
    return this.config.defaultMode;
  }

  private saveMode(mode: ThemeMode): void {
    try { localStorage.setItem(this.config.storageKey, mode); } catch {}
  }

  private listenForSystemChanges(): void {
    if (!this.config.followSystem || typeof window === "undefined") return;
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this._systemChangeListener = () => {
      if (this.currentMode === "system") {
        this.applyTheme("dark");
        this.resolvedScheme = this.mediaQuery!.matches ? "dark" : "light";
        this.config.onChange?.(this.currentMode, this.resolvedScheme);
        for (const fn of this.listeners) { try { fn(this.currentMode, this.resolvedScheme); } catch {} }
      }
    };
    this.mediaQuery.addEventListener("change", this._systemChangeListener as EventListener);
  }

  private _systemChangeListener: ((e: MediaQueryListEvent) => void) | null = null;
}

// --- Singleton ---

let defaultManager: ThemeManager | null = null;

/** Create/get the global ThemeManager singleton */
export function createThemeManager(config?: ThemeConfig): ThemeManager {
  defaultManager = new ThemeManager(config);
  return defaultManager;
}

/** Get the existing theme manager instance */
export function getThemeManager(): ThemeManager | null { return defaultManager; }

// --- Utility: CSS Variable Helpers ---

/** Read a CSS custom property from an element */
export function readCSSVar(el: HTMLElement, name: string, fallback = ""): string {
  return getComputedStyle(el).getPropertyValue(name).trim() || fallback;
}

/** Convert hex to RGB object */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

/** Calculate relative luminance (for contrast checking) */
export function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Calculate WCAG 2.1 contrast ratio between two colors */
export function contrastRatio(color1: string, color2: string): number {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  if (!c1 || !c2) return 1;
  const l1 = luminance(c1.r, c1.g, c1.b);
  const l2 = luminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
