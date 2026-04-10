/**
 * Config Provider: Global theme/configuration context for UI components.
 * Provides design tokens (colors, spacing, typography, border radius),
 * component-level overrides, direction (RTL/LTR), dark mode,
 * locale/i18n settings, and CSS variable injection.
 */

// --- Types ---

export type Direction = "ltr" | "rtl";
export type ThemeMode = "light" | "dark" | "auto";

export interface DesignTokens {
  /** Primary brand color */
  colorPrimary?: string;
  /** Success color */
  colorSuccess?: string;
  /** Warning color */
  colorWarning?: string;
  /** Error/danger color */
  colorError?: string;
  /** Info color */
  colorInfo?: string;
  /** Text primary color */
  colorText?: string;
  /** Text secondary color */
  colorTextSecondary?: string;
  /** Border color */
  colorBorder?: string
  /** Background color */
  colorBg?: string;
  /** Background surface/elevated */
  colorBgElevated?: string;
  /** Background for hover states */
  colorBgHover?: string;
  /** Font family */
  fontFamily?: string;
  /** Font size base (px) */
  fontSize?: number;
  /** Border radius base (px) */
  borderRadius?: number;
  /** Base spacing unit (px) */
  spacing?: number;
}

export interface ComponentOverrides {
  /** Override any component's default props by component name */
  [componentName: string]: Record<string, unknown>;
}

export interface ConfigProviderOptions {
  /** Root container element or selector (scope of the provider) */
  container?: HTMLElement | string;
  /** Design tokens / theme values */
  tokens?: DesignTokens;
  /** Dark/light/auto mode */
  theme?: ThemeMode;
  /** Text direction */
  direction?: Direction;
  /** Locale code (e.g., "en-US", "zh-CN") */
  locale?: string;
  /** Per-component default prop overrides */
  components?: ComponentOverrides;
  /** Whether to inject CSS variables onto the root element */
  injectCSSVars?: boolean;
  /** Prefix for CSS variables (default: "--ui") */
  cssVarPrefix?: string;
  /** Callback when config changes */
  onChange?: (config: Readonly<ConfigSnapshot>) => void;
  /** Custom CSS class on root */
  className?: string;
}

export interface ConfigSnapshot {
  tokens: Required<DesignTokens>;
  theme: ThemeMode;
  direction: Direction;
  locale: string;
  components: ComponentOverrides;
  resolvedTheme: "light" | "dark";
}

export interface ConfigProviderInstance {
  /** Root element that holds the config scope */
  element: HTMLElement;
  /** Get current config snapshot */
  getConfig: () => ConfigSnapshot;
  /** Update design tokens (partial merge) */
  setTokens: (tokens: Partial<DesignTokens>) => void;
  /** Set theme mode */
  setTheme: (mode: ThemeMode) => void;
  /** Set direction */
  setDirection: (dir: Direction) => void;
  /** Set locale */
  setLocale: (locale: string) => void;
  /** Get a specific token value */
  getToken: <K extends keyof DesignTokens>(key: K) => DesignTokens[K];
  /** Get component override */
  getComponentConfig: (name: string) => Record<string, unknown> | undefined;
  /** Set component override */
  setComponentConfig: (name: string, config: Record<string, unknown>) => void;
  /** Subscribe to config changes */
  subscribe: (listener: (config: ConfigSnapshot) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default Tokens ---

const DEFAULT_TOKENS: Required<DesignTokens> = {
  colorPrimary: "#4338ca",
  colorSuccess: "#16a34a",
  colorWarning: "#d97706",
  colorError: "#dc2626",
  colorInfo: "#2563eb",
  colorText: "#111827",
  colorTextSecondary: "#6b7280",
  colorBorder: "#e5e7eb",
  colorBg: "#ffffff",
  colorBgElevated: "#ffffff",
  colorBgHover: "#f9fafb",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: 14,
  borderRadius: 8,
  spacing: 8,
};

// --- Dark Mode Tokens ---

const DARK_TOKENS: Partial<DesignTokens> = {
  colorText: "#f9fafb",
  colorTextSecondary: "#9ca3af",
  colorBorder: "#374151",
  colorBg: "#111827",
  colorBgElevated: "#1f2937",
  colorBgHover: "#374151",
};

// --- Main Factory ---

let globalInstance: ConfigProviderInstance | null = null;

export function createConfigProvider(options: ConfigProviderOptions = {}): ConfigProviderInstance {
  const opts = {
    container: options.container ?? document.body,
    theme: options.theme ?? "light",
    direction: options.direction ?? "ltr",
    locale: options.locale ?? "en-US",
    injectCSSVars: options.injectCSSVars ?? true,
    cssVarPrefix: options.cssVarPrefix ?? "--ui",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof opts.container === "string"
    ? document.querySelector<HTMLElement>(opts.container)!
    : opts.container;

  if (!container) throw new Error("ConfigProvider: container not found");

  // State
  let tokens: Required<DesignTokens> = { ...DEFAULT_TOKENS, ...opts.tokens };
  let currentTheme = opts.theme;
  let direction = opts.direction;
  let locale = opts.locale;
  let components: ComponentOverrides = { ...opts.components };
  let destroyed = false;
  const listeners = new Set<(config: ConfigSnapshot) => () => void>();

  // Root scope element
  const rootEl = document.createElement("div");
  rootEl.className = `config-provider ${opts.className}`;
  rootEl.setAttribute("data-direction", direction);
  rootEl.setAttribute("data-theme", currentTheme);
  rootEl.style.cssText = "display:contents;";
  container.appendChild(rootEl);

  function resolveTheme(): "light" | "dark" {
    if (currentTheme === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return currentTheme;
  }

  function getSnapshot(): ConfigSnapshot {
    return {
      tokens: { ...tokens },
      theme: currentTheme,
      direction,
      locale,
      components: { ...components },
      resolvedTheme: resolveTheme(),
    };
  }

  function applyToDOM(): void {
    const resolved = resolveTheme();
    rootEl.setAttribute("data-theme", resolved);
    rootEl.setAttribute("data-direction", direction);
    rootEl.setAttribute("lang", locale);

    // Apply dark mode class on container's nearest ancestor
    if (resolved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  function injectCSSVariables(): void {
    if (!opts.injectCSSVars) return;
    const p = opts.cssVarPrefix;
    const resolved = resolveTheme();
    const effectiveTokens = resolved === "dark"
      ? { ...tokens, ...DARK_TOKENS } as Required<DesignTokens>
      : tokens;

    const vars: string[] = [
      `${p}-color-primary: ${effectiveTokens.colorPrimary}`,
      `${p}-color-success: ${effectiveTokens.colorSuccess}`,
      `${p}-color-warning: ${effectiveTokens.colorWarning}`,
      `${p}-color-error: ${effectiveTokens.colorError}`,
      ${p}-color-info: ${effectiveTokens.colorInfo},
      `${p}-color-text: ${effectiveTokens.colorText}`,
      `${p}-color-text-secondary: ${effectiveTokens.colorTextSecondary}`,
      `${p}-color-border: ${effectiveTokens.colorBorder}`,
      `${p}-color-bg: ${effectiveTokens.colorBg}`,
      `${p}-color-bg-elevated: ${effectiveTokens.colorBgElevated}`,
      `${p}-color-bg-hover: ${effectiveTokens.colorBgHover}`,
      `${p}-font-family: ${effectiveTokens.fontFamily}`,
      `${p}-font-size: ${effectiveTokens.fontSize}px`,
      `${p}-border-radius: ${effectiveTokens.borderRadius}px`,
      `${p}-spacing: ${effectiveTokens.spacing}px`,
    ];

    rootEl.style.cssText = vars.join(";") + ";display:contents;";
  }

  function notify(): void {
    const snapshot = getSnapshot();
    for (const fn of listeners) { try { fn(snapshot); } catch {} }
    opts.onChange?.(snapshot);
  }

  // Listen for system dark mode changes
  let mediaQuery: MediaQueryList | null = null;
  if (currentTheme === "auto" || true) {
    mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (currentTheme === "auto") {
        applyToDOM();
        notify();
      }
    });
  }

  // Initial application
  applyToDOM();
  injectCSSVariables();

  const instance: ConfigProviderInstance = {
    element: rootEl,

    getConfig: getSnapshot,

    setTokens(newTokens: Partial<DesignTokens>): void {
      Object.assign(tokens, newTokens);
      injectCSSVariables();
      notify();
    },

    setTheme(mode: ThemeMode): void {
      currentTheme = mode;
      applyToDOM();
      injectCSSVariables();
      notify();
    },

    setDirection(dir: Direction): void {
      direction = dir;
      applyToDOM();
      notify();
    },

    setLocale(loc: string): void {
      locale = loc;
      applyToDOM();
      notify();
    },

    getToken<K extends keyof DesignTokens>(key: K): DesignTokens[K] {
      const resolved = resolveTheme();
      const effectiveTokens = resolved === "dark"
        ? { ...tokens, ...DARK_TOKENS } as Required<DesignTokens>
        : tokens;
      return effectiveTokens[key];
    },

    getComponentConfig(name: string): Record<string, unknown> | undefined {
      return components[name];
    },

    setComponentConfig(name: string, config: Record<string, unknown>): void {
      components[name] = config;
      notify();
    },

    subscribe(listener: (config: ConfigSnapshot) => void): () => void {
      listeners.add(listener);
      listener(getSnapshot());
      return () => listeners.delete(listener);
    },

    destroy(): void {
      destroyed = true;
      listeners.clear();
      if (mediaQuery) mediaQuery.removeEventListener("change", () => {});
      rootEl.remove();
    },
  };

  // Set as global instance
  globalInstance = instance;

  return instance;
}

/** Get the global config provider instance (if created) */
export function getConfig(): ConfigProviderInstance | null {
  return globalInstance;
}

/** Convenience: get a token value from the global config */
export function getToken<K extends keyof DesignTokens>(key: K): DesignTokens[K] | undefined {
  return globalInstance?.getToken(key);
}
