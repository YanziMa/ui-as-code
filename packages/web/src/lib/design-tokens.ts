/**
 * Design Token System — centralized design tokens for colors, spacing,
 * typography, shadows, radii, transitions, and more. Supports token
 * resolution, aliasing, theming overrides, and CSS variable generation.
 */

// --- Types ---

export interface ColorToken {
  value: string;
  /** Reference to another token (alias) */
  alias?: string;
  description?: string;
}

export interface SpacingScale {
  /** Named spacing tokens */
  [name: string]: number | string;
}

export interface TypographyScale {
  fontFamily: { [name: string]: string };
  fontSize: { [name: string]: string };
  fontWeight: { [name: string]: number };
  lineHeight: { [name: string]: number };
  letterSpacing: { [name: string]: string };
}

export interface ShadowToken {
  value: string;
  description?: string;
}

export interface RadiusScale {
  [name: string]: string;
}

export interface TransitionToken {
  duration: string;
  easing: string;
  property?: string;
}

export interface BreakpointDefinition {
  name: string;
  minWidth: number;
  /** Max width for this breakpoint */
  maxWidth?: number;
  columns?: number;
  gutter?: number;
  containerMaxWidth?: number;
}

export interface DesignTokensConfig {
  colors?: Record<string, ColorToken>;
  spacing?: SpacingScale;
  typography?: TypographyScale;
  shadows?: Record<string, ShadowToken>;
  radii?: RadiusScale;
  transitions?: Record<string, TransitionToken>;
  breakpoints?: BreakpointDefinition[];
  zIndex?: Record<string, number>;
  /** Custom arbitrary tokens */
  custom?: Record<string, string>;
}

export interface ResolvedTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: TypographyScale;
  shadows: Record<string, string>;
  radii: Record<string, string>;
  transitions: Record<string, { duration: string; easing: string; property?: string }>;
  breakpoints: BreakpointDefinition[];
  zIndex: Record<string, number>;
  custom: Record<string, string>;
}

// --- Default Tokens ---

const DEFAULT_COLORS: Record<string, ColorToken> = {
  // Primary palette
  "color-primary": { value: "#6366f1", description: "Primary brand color" },
  "color-primary-hover": { value: "#4f46e5" },
  "color-primary-active": { value: "#4338ca" },
  "color-primary-light": { value: "#e0e7ff" },
  "color-primary-dark": { value: "#3730a3" },

  // Secondary palette
  "color-secondary": { value: "#8b5cf6", description: "Secondary accent color" },
  "color-secondary-light": { value: "#ede9fe" },
  "color-secondary-dark": { value: "#5b21b6" },

  // Neutral / Gray scale
  "gray-50": { value: "#f9fafb" },
  "gray-100": { value: "#f3f4f6" },
  "gray-200": { value: "#e5e7eb" },
  "gray-300": { value: "#d1d5db" },
  "gray-400": { value: "#9ca3af" },
  "gray-500": { value: "#6b7280" },
  "gray-600": { value: "#4b5563" },
  "gray-700": { value: "#374151" },
  "gray-800": { value: "#1f2937" },
  "gray-900": { value: "#111827" },

  // Semantic colors
  "color-bg": { value: "#ffffff", description: "Page background" },
  "color-surface": { value: "#f8fafc", description: "Card/surface background" },
  "color-text": { value: "#0f172a", description: "Primary text color" },
  "color-text-secondary": { value: "#64748b", description: "Secondary/muted text" },
  "color-border": { value: "#e2e8f0", description: "Default border color" },

  // Status colors
  "color-error": { value: "#ef4444" },
  "color-error-light": { value: "#fee2e2" },
  "color-warning": { value: "#f59e0b" },
  "color-warning-light": { value: "#fef3c7" },
  "color-success": { value: "#22c55e" },
  "color-success-light": { value: "#dcfce7" },
  "color-info": { value: "#3b82f6" },
  "color-info-light": { value: "#dbeafe" },
};

const DEFAULT_SPACING: SpacingScale = {
  "space-0": "0px",
  "space-0_5": "2px",
  "space-1": "4px",
  "space-1_5": "6px",
  "space-2": "8px",
  "space-2_5": "10px",
  "space-3": "12px",
  "space-4": "16px",
  "space-5": "20px",
  "space-6": "24px",
  "space-8": "32px",
  "space-10": "40px",
  "space-12": "48px",
  "space-16": "64px",
  "space-20": "80px",
  "space-24": "96px",
  "space-32": "128px",
};

const DEFAULT_TYPOGRAPHY: TypographyScale = {
  fontFamily: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    mono: "'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace",
    serif: "'Georgia', 'Cambria', 'Times New Roman', Times, serif",
    display: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  fontSize: {
    "text-xs": "0.75rem",     // 12px
    "text-sm": "0.875rem",    // 14px
    "text-base": "1rem",      // 16px
    "text-lg": "1.125rem",    // 18px
    "text-xl": "1.25rem",     // 20px
    "text-2xl": "1.5rem",     // 24px
    "text-3xl": "1.875rem",   // 30px
    "text-4xl": "2.25rem",    // 36px
    "text-5xl": "3rem",       // 48px
    "text-6xl": "3.75rem",    // 60px
  },
  fontWeight: {
    thin: 100,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
};

const DEFAULT_SHADOWS: Record<string, ShadowToken> = {
  "shadow-xs": { value: "0 1px 2px rgba(0,0,0,0.05)" },
  "shadow-sm": { value: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" },
  "shadow-md": { value: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)" },
  "shadow-lg": { value: "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)" },
  "shadow-xl": { value: "0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)" },
  "shadow-2xl": { value: "0 25px 50px rgba(0,0,0,0.15)" },
  "shadow-inner": { value: "inset 0 2px 4px rgba(0,0,0,0.06)" },
  "shadow-glow": { value: "0 0 20px rgba(99,102,241,0.3)", description: "Primary glow effect" },
};

const DEFAULT_RADII: RadiusScale = {
  "radius-none": "0px",
  "radius-sm": "4px",
  "radius-md": "6px",
  "radius-lg": "8px",
  "radius-xl": "12px",
  "radius-2xl": "16px",
  "radius-3xl": "24px",
  "radius-full": "9999px",
};

const DEFAULT_TRANSITIONS: Record<string, TransitionToken> = {
  "transition-fast": { duration: "100ms", easing: "ease-out" },
  "transition-normal": { duration: "200ms", easing: "ease-out" },
  "transition-slow": { duration: "300ms", easing: "ease-in-out" },
  "transition-spring": { duration: "400ms", easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
  "transition-bounce": { duration: "500ms", easing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)" },
  "transition-colors": { duration: "150ms", easing: "ease", property: "color, background-color, border-color" },
  "transition-transform": { duration: "200ms", easing: "ease-out", property: "transform" },
  "transition-opacity": { duration: "150ms", easing: "linear", property: "opacity" },
};

const DEFAULT_BREAKPOINTS: BreakpointDefinition[] = [
  { name: "xs", minWidth: 0, columns: 4, gutter: 16 },
  { name: "sm", minWidth: 576, columns: 4, gutter: 16, containerMaxWidth: 540 },
  { name: "md", minWidth: 768, columns: 8, gutter: 24, containerMaxWidth: 720 },
  { name: "lg", minWidth: 992, columns: 12, gutter: 24, containerMaxWidth: 960 },
  { name: "xl", minWidth: 1280, columns: 12, gutter: 32, containerMaxWidth: 1140 },
  { name: "xxl", minWidth: 1536, columns: 12, gutter: 32, containerMaxWidth: 1320 },
];

const DEFAULT_Z_INDEX: Record<string, number> = {
  hide: -1,
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
  max: 9999,
};

// --- Main Token Manager ---

/**
 * Manages design tokens with resolution, aliasing, overrides, and CSS generation.
 *
 * @example
 * ```ts
 * const tokens = new DesignTokenManager();
 * tokens.resolve("color-primary"); // "#6366f1"
 * tokens.applyToDocument(); // Sets all as CSS variables on :root
 * ```
 */
export class DesignTokenManager {
  private config: Required<DesignTokensConfig>;
  private overrides: Record<string, string> = {};
  private resolvedCache = new Map<string, string>();

  constructor(config: DesignTokensConfig = {}) {
    this.config = {
      colors: config.colors ?? { ...DEFAULT_COLORS },
      spacing: config.spacing ?? { ...DEFAULT_SPACING },
      typography: config.typography ?? { ...DEFAULT_TYPOGRAPHY },
      shadows: config.shadows ?? { ...DEFAULT_SHADOWS },
      radii: config.radii ?? { ...DEFAULT_RADII },
      transitions: config.transitions ?? { ...DEFAULT_TRANSITIONS },
      breakpoints: config.breakpoints ?? [...DEFAULT_BREAKPOINTS],
      zIndex: config.zIndex ?? { ...DEFAULT_Z_INDEX },
      custom: config.custom ?? {},
    };
  }

  // --- Resolution ---

  /**
   * Resolve a token key to its final CSS value.
   * Handles aliases and cached lookups.
   */
  resolve(tokenKey: string): string {
    if (this.resolvedCache.has(tokenKey)) {
      return this.resolvedCache.get(tokenKey)!;
    }

    // Check overrides first
    if (this.overrides[tokenKey]) {
      const val = this.overrides[tokenKey]!;
      this.resolvedCache.set(tokenKey, val);
      return val;
    }

    // Check each category
    const colorVal = this.resolveColor(tokenKey);
    if (colorVal !== null) return colorVal;

    const spacingVal = this.config.spacing[tokenKey];
    if (spacingVal !== undefined) {
      const resolved = typeof spacingVal === "number" ? `${spacingVal}px` : spacingVal;
      this.resolvedCache.set(tokenKey, resolved);
      return resolved;
    }

    const shadowVal = this.config.shadows[tokenKey]?.value;
    if (shadowVal) {
      this.resolvedCache.set(tokenKey, shadowVal);
      return shadowVal;
    }

    const radiusVal = this.config.radii[tokenKey];
    if (radiusVal) {
      this.resolvedCache.set(tokenKey, radiusVal);
      return radiusVal;
    }

    const customVal = this.config.custom[tokenKey];
    if (customVal) {
      this.resolvedCache.set(tokenKey, customVal);
      return customVal;
    }

    return tokenKey; // Fallback: return raw key
  }

  private resolveColor(key: string): string | null {
    const token = this.config.colors[key];
    if (!token) return null;

    // Follow alias chain
    if (token.alias) {
      return this.resolve(token.alias);
    }

    this.resolvedCache.set(key, token.value);
    return token.value;
  }

  /**
   * Resolve multiple tokens at once.
   */
  resolveMany(...keys: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      result[key] = this.resolve(key);
    }
    return result;
  }

  // --- Overrides ---

  /**
   * Override a token's value at runtime.
   */
  setOverride(key: string, value: string): void {
    this.overrides[key] = value;
    this.invalidateCache();
  }

  /**
   * Remove an override.
   */
  removeOverride(key: string): void {
    delete this.overrides[key];
    this.invalidateCache();
  }

  /**
   * Set multiple overrides at once.
   */
  setOverrides(overrides: Record<string, string>): void {
    Object.assign(this.overrides, overrides);
    this.invalidateCache();
  }

  /** Clear all runtime overrides */
  clearOverrides(): void {
    this.overrides = {};
    this.invalidateCache();
  }

  private invalidateCache(): void {
    this.resolvedCache.clear();
  }

  // --- Category Accessors ---

  get colors(): Record<string, ColorToken> { return this.config.colors; }
  get spacing(): SpacingScale { return this.config.spacing; }
  get typography(): TypographyScale { return this.config.typography; }
  get shadows(): Record<string, ShadowToken> { return this.config.shadows; }
  get radii(): RadiusScale { return this.config.radii; }
  get transitions(): Record<string, TransitionToken> { return this.config.transitions; }
  get breakpoints(): BreakpointDefinition[] { return this.config.breakpoints; }
  get zIndex(): Record<string, number> { return this.config.zIndex; }

  // --- CSS Generation ---

  /**
   * Generate all tokens as CSS custom properties (variables).
   * Returns a complete :root { } block.
   */
  generateCSS(): string {
    const lines: string[] = [":root {"];

    // Colors
    for (const [key, token] of Object.entries(this.config.colors)) {
      const value = this.resolve(key);
      lines.push(`  --${key}: ${value};`);
    }

    // Spacing
    for (const [key, value] of Object.entries(this.config.spacing)) {
      const resolved = typeof value === "number" ? `${value}px` : value;
      lines.push(`  --${key}: ${resolved};`);
    }

    // Shadows
    for (const [key, token] of Object.entries(this.config.shadows)) {
      lines.push(`  --${key}: ${token.value};`);
    }

    // Radii
    for (const [key, value] of Object.entries(this.config.radii)) {
      lines.push(`  --${key}: ${value};`);
    }

    // Transitions (as shorthand)
    for (const [key, t] of Object.entries(this.config.transitions)) {
      const prop = t.property ?? "all";
      lines.push(`  --${key}: ${prop} ${t.duration} ${t.easing};`);
    }

    // Z-index
    for (const [key, value] of Object.entries(this.config.zIndex)) {
      lines.push(`  --z-${key}: ${value};`);
    }

    // Custom
    for (const [key, value] of Object.entries(this.config.custom)) {
      lines.push(`  --${key}: ${value};`);
    }

    // Override values
    for (const [key, value] of Object.entries(this.overrides)) {
      lines.push(`  --${key}: ${value}; /* override */`);
    }

    lines.push("}");
    return lines.join("\n");
  }

  /**
   * Apply all tokens as CSS variables on document.documentElement.
   */
  applyToDocument(): void {
    if (typeof document === "undefined") return;

    const root = document.documentElement;

    // Colors
    for (const key of Object.keys(this.config.colors)) {
      root.style.setProperty(`--${key}`, this.resolve(key));
    }

    // Spacing
    for (const [key, value] of Object.entries(this.config.spacing)) {
      const resolved = typeof value === "number" ? `${value}px` : value;
      root.style.setProperty(`--${key}`, resolved);
    }

    // Shadows
    for (const [key, token] of Object.entries(this.config.shadows)) {
      root.style.setProperty(`--${key}`, token.value);
    }

    // Radii
    for (const [key, value] of Object.entries(this.config.radii)) {
      root.style.setProperty(`--${key}`, value);
    }

    // Z-index
    for (const [key, value] of Object.entries(this.config.zIndex)) {
      root.style.setProperty(`--z-${key}`, String(value));
    }
  }

  /**
   * Inject all tokens as a <style> element in document head.
   */
  injectStylesheet(): HTMLStyleElement {
    const css = this.generateCSS();
    const style = document.createElement("style");
    style.id = "design-tokens";
    style.textContent = css;
    document.head.appendChild(style);
    return style;
  }

  // --- Utility Getters ---

  /** Get a color by name (shorthand) */
  color(name: string): string { return this.resolve(`color-${name}`); }

  /** Get spacing by name (shorthand) */
  space(name: string): string { return this.resolve(`space-${name}`); }

  /** Get shadow by name */
  shadow(name: string): string { return this.resolve(`shadow-${name}`); }

  /** Get radius by name */
  radius(name: string): string { return this.resolve(`radius-${name}`); }

  /** Get z-index layer by name */
  z(name: string): number { return this.config.zIndex[name] ?? 0; }

  /** Get font family by name */
  fontFamily(name: string): string { return this.config.typography.fontFamily[name] ?? ""; }

  /** Get font size by name */
  fontSize(name: string): string { return this.config.typography.fontSize[name] ?? ""; }

  /** Get transition shorthand by name */
  transition(name: string): string {
    const t = this.config.transitions[name];
    if (!t) return "";
    return `${t.property ?? "all"} ${t.duration} ${t.easing}`;
  }

  /** Get breakpoint definition by name */
  breakpoint(name: string): BreakpointDefinition | undefined {
    return this.config.breakpoints.find((bp) => bp.name === name);
  }

  /** Get all resolved tokens as a flat object */
  getAllResolved(): ResolvedTokens {
    return {
      colors: Object.fromEntries(
        Object.keys(this.config.colors).map((k) => [k, this.resolve(k)])
      ),
      spacing: Object.fromEntries(
        Object.keys(this.config.spacing).map((k) => [k, this.resolve(k)])
      ),
      typography: { ...this.config.typography },
      shadows: Object.fromEntries(
        Object.keys(this.config.shadows).map((k) => [k, this.config.shadows[k]!.value])
      ),
      radii: { ...this.config.radii },
      transitions: { ...this.config.transitions },
      breakpoints: [...this.config.breakpoints],
      zIndex: { ...this.config.zIndex },
      custom: { ...this.config.custom },
    };
  }
}
