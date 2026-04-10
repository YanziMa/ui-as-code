/**
 * Theme management system with light/dark mode, custom themes, and CSS variable control.
 */

"use client";

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface ThemeConfig {
  name: string;
  label: string;
  mode: "light" | "dark" | "system";
  colors: ThemeColors;
  radius?: string;
  font?: string;
  /** Custom CSS variable overrides */
  cssVars?: Record<string, string>;
}

// --- Built-in Themes ---

export const LIGHT_THEME: ThemeConfig = {
  name: "light",
  label: "Light",
  mode: "light",
  colors: {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#f59e0b",
    background: "#ffffff",
    surface: "#f8fafc",
    text: "#0f172a",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    error: "#ef4444",
    warning: "#f59e0b",
    success: "#22c55e",
    info: "#3b82f6",
  },
  radius: "8px",
};

export const DARK_THEME: ThemeConfig = {
  name: "dark",
  label: "Dark",
  mode: "dark",
  colors: {
    primary: "#818cf8",
    secondary: "#a78bfa",
    accent: "#fbbf24",
    background: "#0f172a",
    surface: "#1e293b",
    text: "#f1f5f9",
    textSecondary: "#94a3b8",
    border: "#334155",
    error: "#f87171",
    warning: "#fbbf24",
    success: "#4ade80",
    info: "#60a5fa",
  },
  radius: "8px",
};

export const BUILT_IN_THEMES: ThemeConfig[] = [LIGHT_THEME, DARK_THEME];

// --- Theme Manager ---

type ThemeChangeListener = (theme: ThemeConfig) => void;

const STORAGE_KEY = "uiac_theme";

export class ThemeManager {
  private currentTheme: ThemeConfig;
  private listeners = new Set<ThemeChangeListener>();
  private systemListener: (() => void) | null = null;

  constructor(initialTheme?: ThemeConfig) {
    this.currentTheme = initialTheme ?? this.loadSavedTheme() ?? LIGHT_THEME;
    this.applyTheme(this.currentTheme);
    this.listenSystemChanges();
  }

  /** Get current theme */
  getTheme(): ThemeConfig {
    return { ...this.currentTheme };
  }

  /** Get current mode */
  getMode(): "light" | "dark" {
    return this.currentTheme.mode === "system"
      ? this.getSystemPreference()
      : this.currentTheme.mode;
  }

  /** Check if dark mode active */
  isDark(): boolean {
    return this.getMode() === "dark";
  }

  /** Set theme by config */
  setTheme(theme: ThemeConfig): void {
    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveTheme(theme);
    this.notifyListeners();
  }

  /** Set theme by name */
  setThemeByName(name: string): void {
    const found = BUILT_IN_THEMES.find((t) => t.name === name);
    if (found) this.setTheme(found);
  }

  /** Toggle between light and dark */
  toggleMode(): void {
    const currentMode = this.getMode();
    const newMode = currentMode === "dark" ? "light" : "dark";
    const base = this.currentTheme.colors.primary.startsWith("#8") ||
                 this.currentTheme.colors.primary.startsWith("#a")
      ? LIGHT_THEME
      : DARK_THEME;

    this.setTheme({ ...base, mode: newMode });
  }

  /** Follow system preference */
  followSystem(): void {
    const base = this.getSystemPreference() === "dark" ? DARK_THEME : LIGHT_THEME;
    this.setTheme({ ...base, mode: "system" });
  }

  /** Override specific color(s) */
  setColor(key: keyof ThemeColors, value: string): void {
    this.currentTheme = {
      ...this.currentTheme,
      colors: { ...this.currentTheme.colors, [key]: value },
    };
    this.applyColorVariable(key, value);
    this.notifyListeners();
  }

  /** Set multiple colors at once */
  setColors(colors: Partial<ThemeColors>): void {
    this.currentTheme = {
      ...this.currentTheme,
      colors: { ...this.currentTheme.colors, ...colors },
    };
    for (const [key, value] of Object.entries(colors)) {
      this.applyColorVariable(key as keyof ThemeColors, value);
    }
    this.notifyListeners();
  }

  /** Subscribe to theme changes */
  subscribe(listener: ThemeChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.currentTheme); // Emit immediately
    return () => this.listeners.delete(listener);
  }

  /** Destroy cleanup */
  destroy(): void {
    if (this.systemListener) {
      this.systemListener();
      this.systemListener = null;
    }
    this.listeners.clear();
  }

  // --- Private ---

  private applyTheme(theme: ThemeConfig): void {
    const root = document.documentElement;

    // Set mode class
    const mode = theme.mode === "system" ? this.getSystemPreference() : theme.mode;
    root.classList.toggle("dark", mode === "dark");
    root.setAttribute("data-theme", theme.name);
    root.setAttribute("data-color-mode", mode);

    // Apply all color variables
    const varMap: Record<keyof ThemeColors, string> = {
      primary: "--color-primary",
      secondary: "--color-secondary",
      accent: "--color-accent",
      background: "--color-bg",
      surface: "--color-surface",
      text: "--color-text",
      textSecondary: "--color-text-secondary",
      border: "--color-border",
      error: "--color-error",
      warning: "--color-warning",
      success: "--color-success",
      info: "--color-info",
    };

    for (const [key, cssVar] of Object.entries(varMap)) {
      root.style.setProperty(cssVar, theme.colors[key as keyof ThemeColors]);
    }

    // Apply radius
    if (theme.radius) {
      root.style.setProperty("--radius", theme.radius);
    }

    // Apply custom CSS vars
    if (theme.cssVars) {
      for (const [key, value] of Object.entries(theme.cssVars)) {
        root.style.setProperty(key, value);
      }
    }
  }

  private applyColorVariable(key: keyof ThemeColors, value: string): void {
    const varMap: Partial<Record<keyof ThemeColors, string>> = {
      primary: "--color-primary",
      secondary: "--color-secondary",
      accent: "--color-accent",
      background: "--color-bg",
      surface: "--color-surface",
      text: "--color-text",
      textSecondary: "--color-text-secondary",
      border: "--color-border",
      error: "--color-error",
      warning: "--color-warning",
      success: "--color-success",
      info: "--color-info",
    };

    const cssVar = varMap[key];
    if (cssVar) {
      document.documentElement.style.setProperty(cssVar, value);
    }
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentTheme);
      } catch {
        // Ignore
      }
    }
  }

  private getSystemPreference(): "light" | "dark" {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  private listenSystemChanges(): void {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (this.currentTheme.mode === "system") {
        this.applyTheme(this.currentTheme);
        this.notifyListeners();
      }
    };

    mq.addEventListener("change", handler);
    this.systemListener = () => mq.removeEventListener("change", handler);
  }

  private saveTheme(theme: ThemeConfig): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: theme.name, mode: theme.mode }));
    } catch {
      // Storage not available
    }
  }

  private loadSavedTheme(): ThemeConfig | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as { name: string; mode: string };
      const base = saved.name === "dark" ? DARK_THEME : LIGHT_THEME;
      return { ...base, mode: (saved.mode as ThemeConfig["mode"]) ?? base.mode };
    } catch {
      return null;
    }
  }
}

// --- Global singleton ---

let globalThemeManager: ThemeManager | null = null;

/** Get or create the global theme manager */
export function getThemeManager(): ThemeManager {
  if (!globalThemeManager) {
    globalThemeManager = new ThemeManager();
  }
  return globalThemeManager;
}

// --- React Hook ---

import { useState, useEffect, useCallback } from "react";

/** React hook for theme access */
export function useTheme(): {
  theme: ThemeConfig;
  isDark: boolean;
  setTheme: (theme: ThemeConfig) => void;
  toggleMode: () => void;
  setColor: (key: keyof ThemeColors, value: string) => void;
} {
  const manager = getThemeManager();
  const [theme, setThemeState] = useState(() => manager.getTheme());

  useEffect(() => {
    return manager.subscribe((t) => setThemeState(t));
  }, []);

  const setTheme = useCallback((t: ThemeConfig) => manager.setTheme(t), [manager]);
  const toggleMode = useCallback(() => manager.toggleMode(), [manager]);
  const setColor = useCallback((k: keyof ThemeColors, v: string) => manager.setColor(k, v), [manager]);

  return {
    theme,
    isDark: manager.isDark(),
    setTheme,
    toggleMode,
    setColor,
  };
}
