/**
 * Theme Engine: Design token system with CSS variable management,
 * theme switching (light/dark/system), custom theme creation,
 * token resolution, and persistence.
 */

// --- Types ---

export type ThemeMode = "light" | "dark" | "system";

export interface DesignToken {
  /** Token name (e.g., "color-primary") */
  name: string;
  /** CSS custom property name (e.g., "--color-primary") */
  varName: string;
  /** Light mode value */
  light: string;
  /** Dark mode value */
  dark: string;
  /** Token category for grouping */
  category?: TokenCategory;
  /** Human-readable label */
  label?: string;
  /** Description */
  description?: string;
}

export type TokenCategory =
  | "color"
  | "typography"
  | "spacing"
  | "radius"
  | "shadow"
  | "elevation"
  | "transition"
  | "breakpoint"
  | "z-index"
  | "opacity";

export interface ThemeDefinition {
  id: string;
  name: string;
  mode?: ThemeMode;
  tokens: Record<string, string>;
  /** Base theme to extend from */
  extends?: string;
  /** Custom CSS to inject */
  css?: string;
}

export interface ThemeEngineOptions {
  /** Root element for CSS variables (default: document.documentElement) */
  rootElement?: HTMLElement;
  /** Storage key for persisting theme preference */
  storageKey?: string;
  /** Default theme mode */
  defaultMode?: ThemeMode;
  /** Callback when theme changes */
  onThemeChange?: (mode: ThemeMode, tokens: Record<string, string>) => void;
  /** Respect system preference? (default: true) */
  respectSystemPreference?: boolean;
  /** Transition duration for theme switch (ms) */
  transitionDuration?: number;
}

// --- Built-in Tokens ---

const DEFAULT_TOKENS: DesignToken[] = [
  // Colors - Primary
  { name: "color-primary", varName: "--color-primary", light: "#6366f1", dark: "#818cf8", category: "color", label: "Primary" },
  { name: "color-primary-foreground", varName: "--color-primary-fg", light: "#ffffff", dark: "#1e1b4b", category: "color", label: "Primary Foreground" },
  { name: "color-secondary", varName: "--color-secondary", light: "#64748b", dark: "#94a3b8", category: "color", label: "Secondary" },
  { name: "color-secondary-foreground", varName: "--color-secondary-fg", light: "#ffffff", dark: "#0f172a", category: "color", label: "Secondary FG" },
  { name: "color-accent", varName: "--color-accent", light: "#f59e0b", dark: "#fbbf24", category: "color", label: "Accent" },

  // Colors - Background / Surface
  { name: "color-background", varName: "--color-bg", light: "#ffffff", dark: "#0f172a", category: "color", label: "Background" },
  { name: "color-surface", varName: "--color-surface", light: "#f8fafc", dark: "#1e293b", category: "color", label: "Surface" },
  { name: "color-surface-elevated", varName: "--color-surface-raised", light: "#ffffff", dark: "#334155", category: "color", label: "Elevated Surface" },
  { name: "color-overlay", varName: "--color-overlay", light: "rgba(0,0,0,0.5)", dark: "rgba(0,0,0,0.7)", category: "color", label: "Overlay" },

  // Colors - Text
  { name: "color-text", varName: "--color-text", light: "#1e293b", dark: "#e2e8f0", category: "color", label: "Text" },
  { name: "color-text-muted", varName: "--color-text-muted", light: "#64748b", dark: "#94a3b8", category: "color", label: "Muted Text" },
  { name: "color-text-inverse", varName: "--color-text-inverse", light: "#ffffff", dark: "#0f172a", category: "color", label: "Inverse Text" },
  { name: "color-link", varName: "--color-link", light: "#3b82f6", dark: "#60a5fa", category: "color", label: "Link" },

  // Colors - Border / Divider
  { name: "color-border", varName: "--color-border", light: "#e2e8f0", dark: "#334155", category: "color", label: "Border" },
  { name: "color-divider", varName: "--color-divider", light: "#f1f5f9", dark: "#1e293b", category: "color", label: "Divider" },

  // Colors - Status
  { name: "color-success", varName: "--color-success", light: "#22c55e", dark: "#4ade80", category: "color", label: "Success" },
  { name: "color-warning", varName: "--color-warning", light: "#f59e0b", dark: "#fbbf24", category: "color", label: "Warning" },
  { name: "color-error", varName: "--color-error", light: "#ef4444", dark: "#f87171", category: "color", label: "Error" },
  { name: "color-info", varName: "--color-info", light: "#3b82f6", dark: "#60a5fa", category: "color", label: "Info" },

  // Typography
  { name: "font-family-sans", varName: "--font-sans", light: "Inter, system-ui, sans-serif", dark: "Inter, system-ui, sans-serif", category: "typography", label: "Sans Font" },
  { name: "font-family-mono", varName: "--font-mono", light: "'SF Mono', Consolas, monospace", dark: "'SF Mono', Consolas, monospace", category: "typography", label: "Mono Font" },
  { name: "font-size-xs", varName: "--text-xs", light: "0.75rem", dark: "0.75rem", category: "typography", label: "XS Text" },
  { name: "font-size-sm", varName: "--text-sm", light: "0.875rem", dark: "0.875rem", category: "typography", label: "SM Text" },
  { name: "font-size-base", varName: "--text-base", light: "1rem", dark: "1rem", category: "typography", label: "Base Text" },
  { name: "font-size-lg", varName: "--text-lg", light: "1.125rem", dark: "1.125rem", category: "typography", label: "LG Text" },
  { name: "font-size-xl", varName: "--text-xl", light: "1.25rem", dark: "1.25rem", category: "typography", label: "XL Text" },
  { name: "line-height-tight", varName: "--leading-tight", light: "1.25", dark: "1.25", category: "typography", label: "Tight Leading" },
  { name: "line-height-normal", varName: "--leading-normal", light: "1.5", dark: "1.5", category: "typography", label: "Normal Leading" },
  { name: "font-weight-normal", varName: "--weight-normal", light: "400", dark: "400", category: "typography", label: "Normal Weight" },
  { name: "font-weight-medium", varName: "--weight-medium", light: "500", dark: "500", category: "typography", label: "Medium Weight" },
  { name: "font-weight-semibold", varName: "--weight-semibold", light: "600", dark: "600", category: "typography", label: "Semibold Weight" },

  // Spacing
  { name: "space-1", varName: "--space-1", light: "0.25rem", dark: "0.25rem", category: "spacing", label: "Space 1" },
  { name: "space-2", varName: "--space-2", light: "0.5rem", dark: "0.5rem", category: "spacing", label: "Space 2" },
  { name: "space-3", varName: "--space-3", light: "0.75rem", dark: "0.75rem", category: "spacing", label: "Space 3" },
  { name: "space-4", varName: "--space-4", light: "1rem", dark: "1rem", category: "spacing", label: "Space 4" },
  { name: "space-5", varName: "--space-5", light: "1.5rem", dark: "1.5rem", category: "spacing", label: "Space 5" },
  { name: "space-6", varName: "--space-6", light: "2rem", dark: "2rem", category: "spacing", label: "Space 6" },
  { name: "space-8", varName: "--space-8", light: "3rem", dark: "3rem", category: "spacing", label: "Space 8" },

  // Radius
  { name: "radius-sm", varName: "--radius-sm", light: "0.25rem", dark: "0.25rem", category: "radius", label: "Small Radius" },
  { name: "radius-md", varName: "--radius-md", light: "0.375rem", dark: "0.375rem", category: "radius", label: "Medium Radius" },
  { name: "radius-lg", varName: "--radius-lg", light: "0.5rem", dark: "0.5rem", category: "radius", label: "Large Radius" },
  { name: "radius-xl", varName: "--radius-xl", light: "0.75rem", dark: "0.75rem", category: "radius", label: "XL Radius" },
  { name: "radius-full", varName: "--radius-full", light: "9999px", dark: "9999px", category: "radius", label: "Full Radius" },

  // Shadow
  { name: "shadow-sm", varName: "--shadow-sm", light: "0 1px 2px rgba(0,0,0,0.05)", dark: "0 1px 2px rgba(0,0,0,0.3)", category: "shadow", label: "Shadow SM" },
  { name: "shadow-md", varName: "--shadow-md", light: "0 4px 6px -1px rgba(0,0,0,0.1)", dark: "0 4px 6px -1px rgba(0,0,0,0.4)", category: "shadow", label: "Shadow MD" },
  { name: "shadow-lg", varName: "--shadow-lg", light: "0 10px 15px -3px rgba(0,0,0,0.1)", dark: "0 10px 15px -3px rgba(0,0,0,0.5)", category: "shadow", label: "Shadow LG" },
  { name: "shadow-xl", varName: "--shadow-xl", light: "0 20px 25px -5px rgba(0,0,0,0.1)", dark: "0 20px 25px -5px rgba(0,0,0,0.6)", category: "shadow", label: "Shadow XL" },

  // Transitions
  { name: "transition-fast", varName: "--transition-fast", light: "150ms ease", dark: "150ms ease", category: "transition", label: "Fast Transition" },
  { name: "transition-normal", varName: "--transition-normal", light: "200ms ease", dark: "200ms ease", category: "transition", label: "Normal Transition" },
  { name: "transition-slow", varName: "--transition-slow", light: "300ms ease", dark: "300ms ease", category: "transition", label: "Slow Transition" },

  // Z-index
  { name: "z-dropdown", varName: "--z-dropdown", light: "1000", dark: "1000", category: "z-index", label: "Dropdown Z" },
  { name: "z-sticky", varName: "--z-sticky", light: "1020", dark: "1020", category: "z-index", label: "Sticky Z" },
  { name: "z-modal", varName: "--z-modal", light: "1040", dark: "1040", category: "z-index", label: "Modal Z" },
  { name: "z-tooltip", varName: "--z-tooltip", light: "1060", dark: "1060", category: "z-index", label: "Tooltip Z" },
  { name: "z-toast", varName: "--z-toast", light: "1080", dark: "1080", category: "z-index", label: "Toast Z" },
];

// --- Main Engine ---

export class ThemeEngine {
  private root: HTMLElement;
  private storageKey: string;
  private currentMode: ThemeMode;
  private listeners = new Set<(mode: ThemeMode) => void>();
  private tokens: DesignToken[];
  private customTokens: Map<string, DesignToken> = new Map();
  private respectSystem: boolean;
  private transitionDuration: number;
  private mediaQueryListener: (() => void) | null = null;

  constructor(options: ThemeEngineOptions = {}) {
    this.root = options.rootElement ?? (typeof document !== "undefined" ? document.documentElement : null as unknown as HTMLElement);
    this.storageKey = options.storageKey ?? "uac-theme-mode";
    this.currentMode = options.defaultMode ?? "system";
    this.tokens = [...DEFAULT_TOKENS];
    this.respectSystem = options.respectSystemPreference ?? true;
    this.transitionDuration = options.transitionDuration ?? 200;

    // Load persisted preference
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(this.storageKey);
      if (stored === "light" || stored === "dark" || stored === "system") {
        this.currentMode = stored;
      }
    }

    // Apply initial theme
    this.applyTheme(this.resolveMode(this.currentMode));

    // Listen for system preference changes
    if (typeof window !== "undefined" && this.respectSystem) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        if (this.currentMode === "system") {
          this.applyTheme(mq.matches ? "dark" : "light");
        }
      };
      mq.addEventListener("change", handler);
      this.mediaQueryListener = () => mq.removeEventListener("change", handler);
    }
  }

  /** Get the effective resolved mode ("light" or "dark", never "system") */
  getResolvedMode(): "light" | "dark" {
    return this.resolveMode(this.currentMode);
  }

  /** Get the raw mode setting (may be "system") */
  getMode(): ThemeMode {
    return this.currentMode;
  }

  /** Set theme mode */
  setMode(mode: ThemeMode): void {
    this.currentMode = mode;
    this.persist();
    this.applyTheme(this.resolveMode(mode));
    this.notify(mode);
  }

  /** Toggle between light and dark */
  toggle(): void {
    const resolved = this.getResolvedMode();
    this.setMode(resolved === "light" ? "dark" : "light");
  }

  /** Subscribe to theme changes */
  subscribe(listener: (mode: ThemeMode) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentMode);
    return () => this.listeners.delete(listener);
  }

  /** Get all registered tokens */
  getTokens(): DesignToken[] {
    return [...this.tokens, ...this.customTokens.values()];
  }

  /** Get tokens filtered by category */
  getTokensByCategory(category: TokenCategory): DesignToken[] {
    return this.getTokens().filter((t) => t.category === category);
  }

  /** Resolve a token's value for the current mode */
  getTokenValue(name: string): string | undefined {
    const token = this.customTokens.get(name) ?? this.tokens.find((t) => t.name === name);
    if (!token) return undefined;
    const mode = this.getResolvedMode();
    return mode === "dark" ? token.dark : token.light;
  }

  /** Get a CSS variable value directly from the DOM */
  getCssVar(varName: string): string {
    if (!this.root) return "";
    return getComputedStyle(this.root).getPropertyValue(varName).trim();
  }

  /** Set a single CSS variable override */
  setCssVar(varName: string, value: string): void {
    if (this.root) {
      this.root.style.setProperty(varName, value);
    }
  }

  /** Register a custom design token */
  registerToken(token: DesignToken): void {
    this.customTokens.set(token.name, token);
    // Apply immediately
    const mode = this.getResolvedMode();
    if (this.root) {
      this.root.style.setProperty(token.varName, mode === "dark" ? token.dark : token.light);
    }
  }

  /** Unregister a custom token */
  unregisterToken(name: string): void {
    const token = this.customTokens.get(name);
    if (token && this.root) {
      this.root.style.removeProperty(token.varName);
    }
    this.customTokens.delete(name);
  }

  /** Apply a complete set of token overrides (for custom themes) */
  applyOverrides(overrides: Record<string, string>): void {
    if (!this.root) return;
    for (const [varName, value] of Object.entries(overrides)) {
      this.root.style.setProperty(varName.startsWith("--") ? varName : `--${varName}`, value);
    }
  }

  /** Clear all custom overrides */
  clearOverrides(): void {
    if (!this.root) return;
    // Re-apply base tokens only
    const mode = this.getResolvedMode();
    for (const token of this.tokens) {
      this.root.style.setProperty(token.varName, mode === "dark" ? token.dark : token.light);
    }
    // Remove any extra vars not in base tokens
    const customVarNames = new Set(this.tokens.map((t) => t.varName));
    for (const token of this.customTokens.values()) {
      customVarNames.add(token.varName);
    }
  }

  /** Export current theme as CSS text */
  exportCss(): string {
    const mode = this.getResolvedMode();
    const lines: string[] = [":root {"];
    for (const token of this.getTokens()) {
      const value = mode === "dark" ? token.dark : token.light;
      lines.push(`  ${token.varName}: ${value}; /* ${token.label ?? token.name} */`);
    }
    lines.push("}");
    return lines.join("\n");
  }

  /** Export current theme as JSON */
  exportJson(): { mode: ThemeMode; tokens: Array<{ name: string; varName: string; value: string }> } {
    const mode = this.getResolvedMode();
    return {
      mode: this.currentMode,
      tokens: this.getTokens().map((t) => ({
        name: t.name,
        varName: t.varName,
        value: mode === "dark" ? t.dark : t.light,
      })),
    };
  }

  /** Destroy and cleanup */
  destroy(): void {
    if (this.mediaQueryListener) this.mediaQueryListener();
    this.listeners.clear();
    this.customTokens.clear();
  }

  // --- Private ---

  private resolveMode(mode: ThemeMode): "light" | "dark" {
    if (mode !== "system") return mode;
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  private applyTheme(mode: "light" | "dark"): void {
    if (!this.root) return;

    // Add transition class for smooth switching
    if (this.transitionDuration > 0) {
      this.root.style.transition = `background-color ${this.transitionDuration}ms ease, color ${this.transitionDuration}ms ease`;
    }

    // Set data attribute
    this.root.setAttribute("data-theme", mode);

    // Apply all tokens
    for (const token of this.tokens) {
      this.root.style.setProperty(token.varName, mode === "dark" ? token.dark : token.light);
    }

    // Apply custom tokens
    for (const token of this.customTokens.values()) {
      this.root.style.setProperty(token.varName, mode === "dark" ? token.dark : token.light);
    }

    // Remove transition after applying (prevents transitions on dynamic changes)
    if (this.transitionDuration > 0) {
      setTimeout(() => {
        if (this.root) this.root.style.transition = "";
      }, this.transitionDuration + 50);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey, this.currentMode);
    } catch { /* ignore */ }
  }

  private notify(mode: ThemeMode): void {
    for (const fn of this.listeners) {
      try { fn(mode); } catch { /* ignore */ }
    }
  }
}

// --- Singleton ---

let globalEngine: ThemeEngine | null = null;

/** Get or create the global theme engine instance */
export function getThemeEngine(options?: ThemeEngineOptions): ThemeEngine {
  if (!globalEngine) {
    globalEngine = new ThemeEngine(options);
  }
  return globalEngine;
}

/** Convenience: set theme mode globally */
export function setTheme(mode: ThemeMode): void {
  getThemeEngine().setMode(mode);
}

/** Convenience: toggle between light/dark */
export function toggleTheme(): void {
  getThemeEngine().toggle();
}

/** Convenience: get current resolved mode */
export function getCurrentTheme(): "light" | "dark" {
  return getThemeEngine().getResolvedMode();
}

/** Check if currently in dark mode */
export function isDarkMode(): boolean {
  return getCurrentTheme() === "dark";
}
