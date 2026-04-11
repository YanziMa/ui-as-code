/**
 * CSS-in-JS Utilities: Runtime CSS injection, keyframe generation, theme
 * variables, style scoping, media query builders, pseudo-class utilities,
 * and dynamic stylesheet management.
 */

// --- Types ---

export interface StyleRule {
  /** CSS selector */
  selector: string;
  /** Style declarations */
  styles: Record<string, string>;
  /** Media query to wrap this rule in (optional) */
  media?: string;
  /** Support condition (@supports) */
  supports?: string;
}

export interface KeyframeConfig {
  /** Animation name */
  name: string;
  /** Keyframe steps: { "0%": {...}, "50%": {...}, "100%": {...} } */
  keyframes: Record<string, Record<string, string>>;
  /** Animation properties to include in the shorthand class */
  animationProps?: {
    duration?: string;
    timingFunction?: string;
    delay?: string;
    iterationCount?: string;
    direction?: string;
    fillMode?: string;
  };
}

export interface ThemeVars {
  [key: string]: string | number;
}

export interface CssInJsOptions {
  /** Unique prefix for generated class names / IDs */
  prefix?: string;
  /** Container for injected <style> elements (default document.head) */
  container?: HTMLElement;
  /** Auto-scope all rules with a unique attribute? */
  autoScope?: boolean;
  /** Minify output? */
  minify?: boolean;
  /** Enable source map comments? */
  sourceMap?: boolean;
  /** Called when new styles are injected */
  onInject?: (css: string) => void;
}

export interface StyleSheetInstance {
  /** The underlying <style> element */
  el: HTMLStyleElement;
  /** Add a CSS rule */
  addRule: (selector: string, styles: Record<string, string>, options?: { media?: string; supports?: string }) => void;
  /** Add multiple rules at once */
  addRules: (rules: StyleRule[]) => void;
  /** Remove a rule by selector */
  removeRule: (selector: string) => void;
  /** Clear all rules */
  clear: () => void;
  /** Get all CSS text */
  getCssText: () => string;
  /** Generate a unique scoped class name */
  generateClassName: (hint?: string) => string;
  /** Create a @keyframes animation */
  addKeyframes: (config: KeyframeConfig) => string;
  /** Set CSS custom properties (variables) on an element */
  setVariables: (el: HTMLElement, vars: ThemeVars) => void;
  /** Get CSS custom properties from an element */
  getVariables: (el: HTMLElement, ...names: string[]) => Record<string, string>;
  /** Build a media query string */
  mediaQuery: (conditions: MediaQueryConditions) => string;
  /** Destroy and remove the style element */
  destroy: () => void;
}

export interface MediaQueryConditions {
  minWidth?: number | string;
  maxWidth?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  orientation?: "portrait" | "landscape";
  prefersColorScheme?: "light" | "dark";
  prefersReducedMotion?: "reduce" | "no-preference";
  /** Custom raw condition appended with "and" */
  raw?: string;
}

// --- Helpers ---

let _globalCounter = 0;

function camelToKebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function serializeStyles(styles: Record<string, string>, minify = false): string {
  const sep = minify ? "" : "\n  ";
  return Object.entries(styles)
    .map(([prop, val]) => `${camelToKebab(prop)}:${val};`)
    .join(sep);
}

function escapeSelector(sel: string): string {
  // Basic CSS escaping
  return sel.replace(/([.#\[\]()\\])/g, "\\$1");
}

// --- Core Factory ---

/**
 * Create a runtime CSS-in-JS stylesheet manager.
 *
 * @example
 * ```ts
 * const sheet = createStyleSheet({ prefix: "my-app" });
 *
 * // Add a rule
 * sheet.addRule(".btn", { backgroundColor: "blue", color: "white" });
 *
 * // Scoped class
 * const cls = sheet.generateClassName("button");
 * sheet.addRule(`.${cls}`, { padding: "8px 16px" });
 *
 * // Keyframes
 * const animName = sheet.addKeyframes({
 *   name: "fadeIn",
 *   keyframes: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
 * });
 * ```
 */
export function createStyleSheet(options: CssInJsOptions = {}): StyleSheetInstance {
  const {
    prefix = "css",
    container = document.head,
    autoScope = false,
    minify = false,
    sourceMap = false,
    onInject,
  } = options;

  let _scopeId: string | null = null;
  if (autoScope) {
    _scopeId = `${prefix}-${Math.random().toString(36).slice(2, 7)}`;
  }

  // Create style element
  const styleEl = document.createElement("style");
  styleEl.type = "text/css";
  if (_scopeId) styleEl.setAttribute("data-scope", _scopeId);
  container.appendChild(styleEl);

  // Use CSSStyleSheet API if available (faster than innerHTML manipulation)
  const sheet = styleEl.sheet as CSSStyleSheet;

  // Track inserted rules for removal
  const ruleIndexMap = new Map<string, number>(); // selector -> index in stylesheet

  function addRule(
    selector: string,
    styles: Record<string, string>,
    opts?: { media?: string; supports?: string },
  ): void {
    let cssText = "";

    if (opts?.supports) {
      cssText += `@supports(${opts.supports}){`;
    }
    if (opts?.media) {
      cssText += `@media ${opts.media}{`;
    }

    const scopedSelector = _scopeId ? `[data-${_scopeId}] ${selector}` : selector;
    cssText += `${scopedSelector}{${serializeStyles(styles, minify)}}`;

    if (opts?.media) cssText += "}";
    if (opts?.supports) cssText += "}";

    try {
      const idx = sheet.insertRule(cssText, sheet.cssRules.length);
      ruleIndexMap.set(selector, idx);
    } catch (e) {
      // Fallback: append to text content
      styleEl.textContent += `\n${cssText}`;
    }

    onInject?.(cssText);
  }

  function addRules(rules: StyleRule[]): void {
    for (const rule of rules) {
      addRule(rule.selector, rule.styles, { media: rule.media, supports: rule.supports });
    }
  }

  function removeRule(selector: string): void {
    const idx = ruleIndexMap.get(selector);
    if (idx != null) {
      try { sheet.deleteRule(idx); } catch {}
      ruleIndexMap.delete(selector);
    }
  }

  function clear(): void {
    // Clear via sheet API
    while (sheet.cssRules.length > 0) {
      try { sheet.deleteRule(0); } catch { break; }
    }
    ruleIndexMap.clear();
  }

  function getCssText(): string {
    let css = "";
    for (let i = 0; i < sheet.cssRules.length; i++) {
      css += sheet.cssRules[i]!.cssText + (minify ? "" : "\n");
    }
    return css.trim();
  }

  function generateClassName(hint?: string): string {
    _globalCounter++;
    const hintPart = hint ? `-${hint}` : "";
    return `${prefix}${hintPart}-${_globalCounter.toString(36)}`;
  }

  function addKeyframes(config: KeyframeConfig): string {
    const { name, keyframes, animationProps } = config;

    // Build keyframe CSS
    const kfParts: string[] = [];
    for (const [percent, styles] of Object.entries(keyframes)) {
      kfParts.push(`${percent}{${serializeStyles(styles, minify)}}`);
    }

    const kfName = `${prefix}-${name}`;
    const kfCss = `@keyframes ${kfName}{${kfParts.join(minify ? "" : " ")}}`;

    try {
      sheet.insertRule(kfCss, sheet.cssRules.length);
    } catch {
      styleEl.textContent += `\n${kfCss}`;
    }

    onInject?.(kfCss);

    // If animation props provided, also create a utility class
    if (animationProps) {
      const animShorthand = [
        animationProps.duration ?? "300ms",
        animationProps.timingFunction ?? "ease",
        animationProps.delay ?? "0s",
        animationProps.iterationCount ?? "1",
        animationProps.direction ?? "normal",
        animationProps.fillMode ?? "none",
        kfName,
      ].join(" ");

      const utilClass = `.anim-${name}`;
      addRule(utilClass, { animation: animShorthand });
    }

    return kfName;
  }

  function setVariables(el: HTMLElement, vars: ThemeVars): void {
    for (const [key, value] of Object.entries(vars)) {
      el.style.setProperty(`--${camelToKebab(key)}`, String(value));
    }
  }

  function getVariables(el: HTMLElement, ...names: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    const cs = getComputedStyle(el);
    for (const name of names) {
      result[name] = cs.getPropertyValue(`--${camelToKebab(name)}`).trim();
    }
    return result;
  }

  function mediaQuery(conditions: MediaQueryConditions): string {
    const parts: string[] = [];

    if (conditions.minWidth != null) parts.push(`(min-width:${typeof conditions.minWidth === "number" ? conditions.minWidth + "px" : conditions.minWidth})`);
    if (conditions.maxWidth != null) parts.push(`(max-width:${typeof conditions.maxWidth === "number" ? conditions.maxWidth + "px" : conditions.maxWidth})`);
    if (conditions.minHeight != null) parts.push(`(min-height:${typeof conditions.minHeight === "number" ? conditions.minHeight + "px" : conditions.minHeight})`);
    if (conditions.maxHeight != null) parts.push(`(max-height:${typeof conditions.maxHeight === "number" ? conditions.maxHeight + "px" : conditions.maxHeight})`);
    if (conditions.orientation) parts.push(`(orientation:${conditions.orientation})`);
    if (conditions.prefersColorScheme) parts.push(`(prefers-color-scheme:${conditions.prefersColorScheme})`);
    if (conditions.prefersReducedMotion) parts.push(`(prefers-reduced-motion:${conditions.prefersReducedMotion})`);
    if (conditions.raw) parts.push(conditions.raw);

    return parts.join(" and ");
  }

  function destroy(): void {
    clear();
    styleEl.remove();
  }

  return {
    el: styleEl,
    addRule, addRules, removeRule, clear,
    getCssText, generateClassName, addKeyframes,
    setVariables, getVariables, mediaQuery,
    destroy,
  };
}

// --- Utility Functions ---

/** Inject a single CSS rule into a new or existing style element */
export function injectCSS(css: string, options: { id?: string; container?: HTMLElement; prepend?: boolean } = {}): HTMLStyleElement {
  const { id, container = document.head, prepend = false } = options;

  // Check for existing style by ID
  if (id) {
    const existing = container.querySelector(`style#${id}`);
    if (existing) {
      (existing as HTMLStyleElement).textContent = css;
      return existing as HTMLStyleElement;
    }
  }

  const style = document.createElement("style");
  style.type = "text/css";
  if (id) style.id = id;
  style.textContent = css;

  if (prepend && container.firstChild) {
    container.insertBefore(style, container.firstChild);
  } else {
    container.appendChild(style);
  }

  return style;
}

/** Remove a previously injected style element by ID */
export function removeCSS(id: string, container: HTMLElement = document.head): void {
  const el = container.querySelector(`style#${id}`);
  if (el) el.remove();
}

/** Generate a @font-face declaration */
export function fontFace(config: {
  family: string;
  src: string;
  weight?: string;
  style?: string;
  display?: string;
}): string {
  const { family, src, weight = "400", style = "normal", display = "swap" } = config;
  return `@font-face{font-family:"${family}";src:url("${src}");font-weight:${weight};font-style:${style};font-display:${display};}`;
}

/** Build a responsive breakpoint helper that returns the appropriate class */
export function createBreakpointClasses(
  breakpoints: Record<string, number>,
  prefix = "bp",
): Record<string, string> {
  const classes: Record<string, string> = {};
  for (const [name, width] of Object.entries(breakpoints)) {
    classes[name] = `${prefix}-${name}`;
  }
  return classes;
}

/** Inject responsive breakpoint styles */
export function injectBreakpointStyles(
  breakpoints: Record<string, number>,
  hiddenClass = "hidden",
  styleId = "breakpoint-styles",
): void {
  const rules: string[] = [];

  // Sort breakpoints by width ascending
  const sorted = Object.entries(breakpoints).sort(([, a], [, b]) => a - b);

  for (const [name, width] of sorted) {
    // Show at this breakpoint and up
    rules.push(`@media(min-width:${width}px){.hidden-below-${name}{display:none!important}}`);
    rules.push(`@media(max-width:${width - 1}px){.hidden-above-${name}{display:none!important}}`);
  }

  injectCSS(rules.join(""), { id: styleId });
}

/** Convert a JS object of CSS custom properties to a CSS variable block */
export function varsToCSS(vars: ThemeVars, selector = ":root"): string {
  const declarations = Object.entries(vars)
    .map(([key, val]) => `--${camelToKebab(key)}:${val};`)
    .join("");
  return `${selector}{${declarations}}`;
}
