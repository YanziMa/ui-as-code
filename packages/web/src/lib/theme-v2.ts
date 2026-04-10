/**
 * Theme management system with light/dark mode, custom themes, CSS variable control, and React hook.
 */

"use client";

import { useState, useEffect, useCallback, useContext, createContext } from "react";

export interface ThemeColors {
  primary: string; secondary: string; accent: string;
  background: string; surface: string;
  text: string; textSecondary: string;
  border: string;
  error: string; warning: string; success: string; info: string;
}

export interface ThemeConfig {
  name: string; label: string; mode: "light" | "dark" | "system";
  colors: ThemeColors; radius?: string; font?: string;
  cssVars?: Record<string, string>;
}

export const LIGHT_THEME: ThemeConfig = {
  name: "light", label: "Light", mode: "light",
  colors: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#f59e0b", background: "#ffffff", surface: "#f8fafc", text: "#0f172a", textSecondary: "#64748b", border: "#e2e8f0", error: "#ef4444", warning: "#f59e0b", success: "#22c55e", info: "#3b82f6" },
};
export const DARK_THEME: ThemeConfig = {
  name: "dark", label: "Dark", mode: "dark",
  colors: { primary: "#818cf8", secondary: "#a78bfa", accent: "#fbbf24", background: "#0f172a", surface: "#1e293b", text: "#f1f5f9", textSecondary: "#94a3b8", border: "#334155", error: "#f87171", warning: "#fbbf24", success: "#4ade80", info: "#60a5fa" },
};
export const BUILT_IN_THEMES: ThemeConfig[] = [LIGHT_THEME, DARK_THEME];

const STORAGE_KEY = "uiac_theme";

class ThemeManager {
  private current: ThemeConfig;
  private listeners = new Set<(t: ThemeConfig) => void>();
  private systemListener: (() => void) | null = null;

  constructor(initial?: ThemeConfig) {
    this.current = initial ?? this.loadSaved() ?? LIGHT_THEME;
    this.applyTheme(this.current);
    this.listenSystemChanges();
  }

  get theme(): ThemeConfig { return { ...this.current }; }
  get mode(): "light" | "dark" { return this.current.mode === "system" ? this.getSystemPref() : this.current.mode; }
  isDark(): boolean { return this.getMode() === "dark"; }

  setTheme(t: ThemeConfig): void {
    this.current = t; this.applyTheme(t); this.saveTheme(t); this.notify();
  }
  setByName(name: string): void {
    const found = BUILT_IN_THEMES.find(t => t.name === name); if (found) this.setTheme(found);
  }
  toggleMode(): void {
    const m = this.getMode(); const base = this.current.colors.primary.startsWith("#8") || this.current.colors.primary.startsWith("#a") ? LIGHT_THEME : DARK_THEME;
    this.setTheme({ ...base, mode: m === "dark" ? "light" : "dark" });
  }
  followSystem(): void {
    const base = this.getSystemPref() === "dark" ? DARK_THEME : LIGHT_THEME;
    this.setTheme({ ...base, mode: "system" });
  }
  setColor(key: keyof ThemeColors, val: string): void {
    this.current = { ...this.current, colors: { ...this.current.colors, [key]: val } };
    this.applyCssVar(key, val); this.notify();
  }
  setColors(partial: Partial<ThemeColors>): void {
    this.current = { ...this.current, colors: { ...this.current.colors, ...partial } };
    for (const [k] of Object.entries(partial)) this.applyCssVar(k as keyof ThemeColors, partial[k as keyof ThemeColors]!);
    this.notify();
  }
  subscribe(listener: (t: ThemeConfig) => void): () => void {
    this.listeners.add(listener); listener(this.current); return () => this.listeners.delete(listener);
  }
  destroy(): void { if (this.systemListener) { this.systemListener(); this.systemListener = null; } this.listeners.clear(); }

  private applyTheme(t: ThemeConfig): void {
    const root = document.documentElement;
    const m = t.mode === "system" ? this.getSystemPref() : t.mode;
    root.classList.toggle("dark", m === "dark"); root.setAttribute("data-theme", t.name); root.setAttribute("data-color-mode", m);
    const vars: Partial<Record<keyof ThemeColors, string>> = {
      primary: "--color-primary", secondary: "--color-secondary", accent: "--color-accent",
      background: "--color-bg", surface: "--color-surface", text: "--color-text",
      textSecondary: "--color-text-secondary", border: "--color-border",
      error: "--color-error", warning: "--color-warning", success: "--color-success", info: "--color-info",
    };
    for (const [k, cssVar] of Object.entries(vars)) root.style.setProperty(cssVar, t.colors[k as keyof ThemeColors]);
    if (t.radius) root.style.setProperty("--radius", t.radius);
    if (t.cssVars) for (const [k, v] of Object.entries(t.cssVars)) root.style.setProperty(k, v);
  }
  private applyCssVar(k: keyof ThemeColors, v: string): void {
    const map: Partial<Record<keyof ThemeColors, string>> = {
      primary: "--color-primary", secondary: "--color-secondary", accent: "--color-accent",
      background: "--color-bg", surface: "--color-surface", text: "--color-text",
      textSecondary: "--color-text-secondary", border: "--color-border",
      error: "--color-error", warning: "--color-warning", success: "--color-success", info: "--color-info",
    };
    if (map[k]) document.documentElement.style.setProperty(map[k]!, v);
  }
  private notify(): void { for (const l of this.listeners) try { l(this.current); } catch {} }
  private getSystemPref(): "light" | "dark" { return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"; }
  private listenSystemChanges(): void {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = () => { if (this.current.mode === "system") { this.applyTheme(this.current); this.notify(); } };
    mq.addEventListener("change", h); this.systemListener = () => { mq.removeEventListener("change", h); };
  }
  private saveTheme(t: ThemeConfig): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: t.name, mode: t.mode })); } catch {} }
  private loadSaved(): ThemeConfig | null {
    try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) { const s = JSON.parse(raw); const base = s.name === "dark" ? DARK_THEME : LIGHT_THEME; return { ...base, mode: (s.mode as ThemeConfig["mode"]) ?? base.mode }; } } catch { return null; }
  }
}

let globalTM: ThemeManager | null = null;
export function getThemeManager(): ThemeManager { if (!globalTM) globalTM = new ThemeManager(); return globalTM; }

/** React hook */
export function useTheme() {
  const mgr = getThemeManager();
  const [theme, setThemeState] = useState(() => mgr.getTheme());
  useEffect(() => mgr.subscribe(setThemeState), [mgr]);
  return { theme, isDark: mgr.isDark(), setTheme: (t: ThemeConfig) => mgr.setTheme(t), toggleMode: () => mgr.toggleMode(), setColor: (k: keyof ThemeColors, v: string) => mgr.setColor(k, v) };
}
