/**
 * Style Runtime: Dynamic CSS runtime for runtime style manipulation, theme
 * switching, CSS custom properties management, style injection/extraction,
 * computed style reading, responsive breakpoint detection, stylesheet
 * ordering, and atomic batched updates.
 */

// --- Types ---

export type StyleProperty = string;
export type StyleValue = string | number;
export type Selector = string;

export interface StyleDeclaration {
  property: StyleProperty;
  value: StyleValue;
  important?: boolean;
}

export interface StyleRule {
  selector: Selector;
  declarations: StyleDeclaration[];
  order?: number; // insertion order for specificity ties
  mediaQuery?: string;
  supports?: string; // @supports condition
}

export interface ThemeVariable {
  name: string; // --my-var
  value: string;
  fallback?: string;
  selector?: ScopeSelector; // :root or specific scope
}

export type ScopeSelector = ":root" | "body" | Selector;

export interface ThemeDefinition {
  name: string;
  variables: ThemeVariable[];
  baseStyles?: StyleRule[];
  darkModeStyles?: StyleRule[];
  /** Inherit from another theme */
  extends?: string;
}

export interface RuntimeStyleOptions {
  /** Prefix for generated class names / IDs */
  prefix?: string;
  /** Use <style> elements vs inline styles (default: inline) */
  useStyleElements?: boolean;
  /** Container element for scoped styles */
  container?: Element;
  /** Auto-prefix CSS properties (default: true) */
  autoPrefix?: boolean;
  /** Log style operations (default: false) */
  debug?: boolean;
}

export interface BreakpointInfo {
  name: string;
  minWidth: number;
  maxWidth?: number;
  matches: boolean;
}

export interface ComputedStyle {
  property: string;
  value: string;
  specified: string; // original CSS value
  computed: string; // resolved by browser
  unit: string; // px, em, rem, %, vw, vh
  numericValue?: number; // converted to px where possible
}

// --- Vendor Prefixing ---

const VENDOR_PREFIXES: Record<string, string[]> = {
  display: ["-webkit-display", "-moz-display", "-o-display"],
  transform: ["-webkit-transform", "-moz-transform", "-o-transform", "-ms-transform"],
  transition: ["-webkit-transition", "-moz-transition", "-o-transition"],
  animation: ["-webkit-animation", "-moz-animation", "-o-animation"],
  flex: ["-webkit-flex", "-moz-flex", "-ms-flexbox"],
  "flex-basis": ["-webkit-flex-basis"],
  "flex-grow": ["-webkit-flex-grow", "-ms-flex-positive"],
  "flex-shrink": ["-webkit-flex-shrink", "-ms-flex-negative"],
  "align-items": ["-webkit-align-items", "-ms-flex-align"],
  "justify-content": ["-webkit-justify-content", "-ms-flex-pack"],
  "backdrop-filter": ["-webkit-backdrop-filter"],
  "text-size-adjust": ["-webkit-text-size-adjust", "-moz-text-size-adjust"],
  "scroll-snap-type": ["-webkit-scroll-snap-type", "-ms-scroll-snap-type"],
};

function needsPrefix(prop: string): boolean {
  return prop.toLowerCase() in VENDOR_PREFIXES;
}

function getPrefixedDeclarations(decl: StyleDeclaration): StyleDeclaration[] {
  const propLower = decl.property.toLowerCase();
  if (!(propLower in VENDOR_PREFIXES)) return [decl];

  return VENDOR_PREFIXES[propLower].map((prefixed) => ({
    property: prefixed,
    value: decl.value,
    important: decl.important,
  }));
}

// --- StyleRuntime Implementation ---

export class StyleRuntime {
  private options: Required<Pick<RuntimeStyleOptions, "prefix" | "useStyleElements" | "autoPrefix" | "debug">> & Omit<RuntimeStyleOptions, "prefix" | "useStyleElements" | "autoPrefix" | "debug">>;
  private container: HTMLElement | ShadowRoot | null;
  private injectedStylesheets: Map<number, HTMLStyleElement> = new Map();
  private sheetCounter = 0;
  private ruleOrderCounter = 0;
  private themes = new Map<string, ThemeDefinition>();
  private activeTheme: string | null = null;
  private breakpoints: BreakpointInfo[] = [];
  private mqlListeners: MediaQueryListListener[] = [];
  private destroyed = false;

  constructor(options: RuntimeStyleOptions = {}) {
    this.options = {
      prefix: options.prefix ?? "sr",
      useStyleElements: options.useStyleElements ?? false,
      autoPrefix: options.autoPrefix ?? true,
      debug: options.debug ?? false,
      container: options.container ?? null,
    };

    if (typeof document !== "undefined") {
      this.container = options.container ?? document.head;
    }
  }

  // --- Inline Style Operations ---

  /**
   * Set one or more styles on an element.
   */
  setStyle(el: Element, styles: Record<StyleProperty, StyleValue>, important?: boolean): void {
    if (this.destroyed || !el) return;

    for (const [prop, value] of Object.entries(styles)) {
      const strVal = typeof value === "number" && !CSS.supports?.(prop, String(value))
        ? `${value}px` : String(value);

      if (important) {
        el.style.setProperty(prop, strVal, "important");
      } else {
        (el as HTMLElement).style[prop as any] = strVal;
      }

      if (this.options.debug) console.log("[StyleRuntime] set:", prop, "=", strVal, "on", el);
    }
  }

  /**
   * Get the computed/resolved value of a style property.
   */
  getComputedStyle(el: Element, property: StyleProperty): ComputedStyle | null {
    if (this.destroyed || !el || typeof window === "undefined") return null;

    const cs = window.getComputedStyle(el);
    const rawValue = cs.getPropertyValue(property);
    const resolved = cs[property as any];

    return {
      property,
      value: resolved ?? rawValue,
      specified: rawValue,
      computed: resolved ?? "",
      unit: this.extractUnit(rawValue),
      numericValue: this.toPixels(el, property),
    };
  }

  /**
   * Get all computed styles for an element.
   */
  getAllComputedStyles(el: Element): ComputedStyle[] {
    if (this.destroyed || !el || typeof window === "undefined") return [];

    const cs = window.getComputedStyle(el);
    const results: ComputedStyle[] = [];

    for (let i = 0; i < cs.length; i++) {
      const prop = cs[i];
      const value = cs.getPropertyValue(prop);
      results.push({
        property: prop,
        value: value ?? "",
        specified: value ?? "",
        computed: cs[prop as any] ?? "",
        unit: this.extractUnit(value ?? ""),
        numericValue: this.toPixels(el, prop),
      });
    }

    return results;
  }

  /**
   * Remove inline styles from an element.
   */
  clearStyle(el: Element, ...properties: StyleProperty[]): void {
    if (this.destroyed || !el) return;
    if (properties.length === 0) {
      el.removeAttribute("style");
    } else {
      for (const prop of properties) (el as HTMLElement).style.removeProperty(prop);
    }
  }

  // --- Stylesheet Injection ---

  /**
   * Inject a CSS rule into the page.
   * Returns a handle that can be used to remove/update the rule.
   */
  injectRule(rule: StyleRule): { id: number; update: (rule: StyleRule) => void; remove: () => void } {
    if (this.destroyed || !this.container) {
      return { id: -1, update: () => {}, remove: () => {} };
    }

    const id = ++this.sheetCounter;
    let cssText = this.buildRuleCss(rule);

    if (this.options.useStyleElements) {
      const styleEl = document.createElement("style");
      styleEl.textContent = cssText;
      styleEl.dataset.srId = String(id);
      this.container.appendChild(styleEl);
      this.injectedStylesheets.set(id, styleEl);
    } else {
      const styleEl = document.createElement("style");
      styleEl.textContent = cssText;
      this.container.appendChild(styleEl);
      this.injectedStylesheets.set(id, styleEl);
    }

    if (this.options.debug) console.log("[StyleRuntime] injected rule:", cssText.substring(0, 100) + "...");

    return {
      id,
      update: (newRule: StyleRule) => {
        const el = this.injectedStylesheets.get(id);
        if (el) el.textContent = this.buildRuleCss(newRule);
      },
      remove: () => {
        const el = this.injectedStylesheets.get(id);
        if (el) { el.remove(); this.injectedStylesheets.delete(id); }
      },
    };
  }

  /**
   * Inject raw CSS text.
   */
  injectCss(css: string): { id: number; remove: () => void } {
    const rule: StyleRule = { selector: "__raw__", declarations: [] };
    const handle = this.injectRule(rule);
    const el = this.injectedStylesheets.get(handle.id);
    if (el) el.textContent = css;
    return { id: handle.id, remove: handle.remove };
  }

  /**
   * Batch-inject multiple rules atomically.
   */
  injectRules(rules: StyleRule[]): Map<number, { update: (r: StyleRule) => void; remove: () => void }> {
    const handles = new Map<number, { update: (r: StyleRule) => void; remove: () => void }>();
    for (const rule of rules) {
      handles.set(++this.sheetCounter, this.injectRule(rule));
    }
    return handles;
  }

  // --- Custom Properties (CSS Variables) ---

  /**
   * Set a CSS custom property on an element or root.
   */
  setVariable(el: Element | ScopeSelector = ":root", name: string, value: string, fallback?: string): void {
    if (this.destroyed) return;
    const target = typeof el === "string" ? (document.querySelector(el) ?? document.documentElement) : el;
    if (!target) return;
    target.style.setProperty(name, value, fallback ? "important" : "");
  }

  /**
   * Get a CSS custom property value.
   */
  getVariable(el: Element | ScopeSelector = ":root", name: string): string | null {
    if (this.destroyed || typeof window === "undefined") return null;
    const target = typeof el === "string" ? (document.querySelector(el) ?? document.documentElement) : el;
    if (!target) return null;
    return getComputedStyle(target).getPropertyValue(name)?.trim() ?? null;
  }

  /**
   * Batch-set multiple CSS variables.
   */
  setVariables(el: Element | ScopeSelector, vars: Record<string, string>): void {
    for (const [name, value] of Object.entries(vars)) {
      this.setVariable(el, name, value);
    }
  }

  /**
   * Remove a CSS variable (revert to inherited/default).
   */
  removeVariable(el: Element | ScopeSelector, name: string): void {
    if (typeof el === "string") {
      const target = document.querySelector(el);
      if (target) target.style.removeProperty(name);
    } else {
      (el as HTMLElement).style.removeProperty(name);
    }
  }

  // --- Theme Management ---

  /**
   * Register a theme definition.
   */
  registerTheme(theme: ThemeDefinition): void {
    this.themes.set(theme.name, theme);
  }

  /**
   * Activate a theme by name — applies its variables and styles.
   */
  activateTheme(name: string): boolean {
    const theme = this.themes.get(name);
    if (!theme) return false;

    // Remove previous active theme's styles
    if (this.activeTheme && this.activeTheme !== name) {
      this.deactivateTheme(this.activeTheme);
    }

    // Apply CSS variables
    for (const v of theme.variables) {
      const selector = v.selector ?? ":root";
      this.setVariable(selector, v.name, v.value, v.fallback);
    }

    // Apply base styles
    if (theme.baseStyles?.length) {
      for (const rule of theme.baseStyles) this.injectRule(rule);
    }

    // Apply dark mode styles if applicable
    if (theme.darkModeStyles?.length && this.isDarkMode()) {
      for (const rule of theme.darkModeStyles) this.injectRule(rule);
    }

    this.activeTheme = name;
    return true;
  }

  /**
   * Deactivate a theme (remove its injected styles).
   */
  deactivateTheme(name: string): void {
    // Note: Variable removal would need tracking — for now just note deactivation
    if (this.activeTheme === name) this.activeTheme = null;
  }

  /** Get active theme name */
  getActiveTheme(): string | null { return this.activeTheme; }
  /** Get registered themes */
  getThemes(): ThemeDefinition[] { return Array.from(this.themes.values()); }

  // --- Responsive / Breakpoints ---

  /**
   * Register a breakpoint and optionally listen for changes.
   */
  registerBreakpoint(bp: BreakpointInfo, onChange?: (info: BreakpointInfo) => void): () => void {
    this.breakpoints.push(bp);

    if (onChange && typeof window !== "undefined" && bp.minWidth !== undefined) {
      const mql = window.matchMedia(`(min-width: ${bp.minWidth}px)`);
      const listener: MediaQueryListListener = (e) => {
        bp.matches = e.matches;
        onChange(bp);
      };
      mql.addEventListener("change", listener);
      this.mqlListeners.push(listener);
      bp.matches = mql.matches;
    }

    return () => {
      this.breakpoints = this.breakpoints.filter((b) => b.name !== bp.name);
    };
  }

  /** Get matching breakpoints */
  getMatchingBreakpoints(): BreakpointInfo[] {
    return this.breakpoints.filter((bp) => bp.matches);
  }

  /** Check if a specific breakpoint matches */
  matchesBreakpoint(name: string): boolean {
    const bp = this.breakpoints.find((b) => b.name === name);
    return bp?.matches ?? false;
  }

  // --- Utility Methods ---

  /**
   * Convert any CSS value to pixels relative to an element.
   */
  toPixels(el: Element, value: string | number, property?: string): number | undefined {
    if (typeof value === "number") return value;

    // Handle unit conversion
    const num = parseFloat(value);
    if (isNaN(num)) return undefined;

    const unit = this.extractUnit(value);
    if (!unit || unit === "px") return num;

    if (typeof window === "undefined") return undefined;

    const fontSize = parseFloat(window.getComputedStyle(el).fontSize);

    switch (unit) {
      case "em": return num * fontSize;
      case "rem": return num * parseFloat(getComputedStyle(document.documentElement).fontSize);
      case "%": return (num / 100) * (property
        ? el.getBoundingClientRect()[property.toLowerCase() === "width" ? "width" : "height"]
        : el.clientWidth);
      case "vw": return (num / 100) * window.innerWidth;
      case "vh": return (num / 100) * window.innerHeight;
      case "pt": return num * (96 / 72);
      case "pc": return num * (96 / 12);
      default: return num;
    }
  }

  /**
   * Extract unit from a CSS value string.
   */
  extractUnit(value: string): string {
    const match = String(value).match(/(-?[\d.]+)([a-z%]*)$/i);
    return match?.[2] ?? "";
  }

  /**
   * Check if system prefers dark mode.
   */
  isDarkMode(): boolean {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /**
   * Listen for dark mode changes.
   */
  onDarkModeChange(listener: (isDark: boolean) => void): () => void {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => listener(e.matches);
    mql.addEventListener("change", handler);
    return () => { mql.removeEventListener("change", handler); };
  }

  /**
   * Measure the rendered size of an element.
   */
  measureElement(el: Element): { width: number; height: number; rect: DOMRect } {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height, rect };
  }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Remove all injected styles
    for (const [, el] of this.injectedStylesheets) el.remove();
    this.injectedStylesheets.clear();

    // Remove MQL listeners
    for (const listener of this.mqlListeners) {
      // Can't easily remove MQL listeners without keeping refs
    }
    this.mqlListeners = [];

    this.breakpoints = [];
    this.themes.clear();
    this.activeTheme = null;
  }

  // --- Internal ---

  private buildRuleCss(rule: StyleRule): string {
    const parts: string[] = [];

    if (rule.mediaQuery) parts.push(`@media ${rule.mediaQuery} {`);
    if (rule.supports) parts.push(`@supports(${rule.supports}) {`);

    const decls = rule.declarations.map((d) => {
      const prefixes = this.options.autoPrefix ? getPrefixedDeclarations(d) : [d];
      return prefixes.map((p) => {
        const imp = p.important ? " !important" : "";
        return `  ${p.property}: ${p.value}${imp};`;
      }).join("\n");
    }).join("\n");

    parts.push(`${rule.selector} {\n${decls}\n}`);

    if (rule.supports) parts.push("}");
    if (rule.mediaQuery) parts.push("}");

    return parts.join("\n\n");
  }
}

// --- Factory ---

export function createStyleRuntime(options?: RuntimeStyleOptions): StyleRuntime {
  return new StyleRuntime(options);
}
