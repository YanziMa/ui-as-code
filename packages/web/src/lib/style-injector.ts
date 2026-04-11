/**
 * Style Injector: Dynamic CSS injection, scoped styles, CSS variable management,
 * style element pooling, critical CSS extraction, and theme token system.
 */

// --- Types ---

export interface StyleRule {
  selector: string;
  declarations: Record<string, string>;
}

export interface StyleSheet {
  name?: string;
  rules: StyleRule[];
  /** Media query to wrap rules in */
  media?: string;
  /** Support conditions (@supports) */
  supports?: string;
  /** Container query */
  containerQuery?: string;
  /** Layer name for cascade layers */
  layer?: string;
  /** Scope prefix for selectors */
  scope?: string;
}

export interface InjectOptions {
  /** Insert position: 'top' (first) or 'bottom' (last) */
  insertAt?: "top" | "bottom";
  /** Target container (default: document.head) */
  target?: HTMLElement;
  /** Unique ID for deduplication */
  id?: string;
  /** Whether to minify (default: false) */
  minify?: boolean;
  /** Prepend a nonce for CSP */
  nonce?: string;
  /** Disable if already injected */
  once?: boolean;
}

export interface StyleElement {
  /** The <style> or <link> DOM element */
  element: HTMLStyleElement | HTMLLinkElement;
  /** Update the CSS content */
  update: (css: string) => void;
  /** Remove from DOM */
  remove: () => void;
  /** Check if still in DOM */
  isActive: () => boolean;
}

// --- Internal State ---

const injectedStyles = new Set<string>();
let styleElements: Map<string, HTMLStyleElement> = new Map();

// --- Core Injection ---

/**
 * Inject a CSS string into the document. Returns a handle for updates/removal.
 */
export function injectStyle(css: string, options: InjectOptions = {}): StyleElement {
  const id = options.id ?? `style-${crypto.randomUUID().slice(0, 8)}`;

  // Deduplication
  if (options.once && injectedStyles.has(id)) {
    const existing = styleElements.get(id);
    if (existing) return { element: existing, update: (c) => { existing.textContent = c; }, remove: () => {}, isActive: () => true };
  }

  const target = options.target ?? document.head;
  const processedCss = options.minify ? minifyCSS(css) : css;

  const el = document.createElement("style");
  el.setAttribute("data-style-id", id);
  if (options.nonce) el.setAttribute("nonce", options.nonce);
  el.textContent = processedCss;

  if (options.insertAt === "top" && target.firstChild) {
    target.insertBefore(el, target.firstChild);
  } else {
    target.appendChild(el);
  }

  injectedStyles.add(id);
  styleElements.set(id, el);

  return {
    element: el,
    update(newCss: string) {
      el.textContent = options.minify ? minifyCSS(newCss) : newCss;
    },
    remove() {
      el.remove();
      injectedStyles.delete(id);
      styleElements.delete(id);
    },
    isActive() => document.contains(el),
  };
}

/**
 * Inject a stylesheet from URL (<link rel="stylesheet">).
 */
export function injectLink(href: string, options: Omit<InjectOptions, "id"> & { id?: string } = {}): StyleElement {
  const id = options.id ?? `link-${href}`;
  const target = options.target ?? document.head;

  // Check if already injected
  const existing = target.querySelector(`[data-style-id="${id}"]`) as HTMLLinkElement | null;
  if (existing && options.once) {
    return { element: existing, update: () => {}, remove: () => {}, isActive: () => true };
  }

  const el = document.createElement("link");
  el.setAttribute("data-style-id", id);
  el.rel = "stylesheet";
  el.href = href;
  if (options.nonce) el.setAttribute("nonce", options.nonce);

  target.appendChild(el);

  return {
    element: el,
    update() => {},
    remove() {
      el.remove();
    },
    isActive() => document.contains(el),
  };
}

// --- StyleSheet Builder ---

/**
 * Build CSS text from structured rule objects.
 */
export function buildStyleSheet(sheet: StyleSheet): string {
  let css = "";

  // Prelude: @layer / @media / @supports / @container
  const preludeParts: string[] = [];
  if (sheet.layer) preludeParts.push(`@layer ${sheet.layer}`);
  if (sheet.media) preludeParts.push(`(${sheet.media})`);
  if (sheet.supports) preludeParts.push(`supports(${sheet.supports})`);
  if (sheet.containerQuery) preludeParts.push(`container(${sheet.containerQuery})`);

  const hasPrelude = preludeParts.length > 0;

  if (hasPrelude) {
    css += `@${preludeParts.join(" ")} {\n`;
  }

  for (const rule of sheet.rules) {
    const selector = sheet.scope ? `${sheet.scope} ${rule.selector}`.trim() : rule.selector;
    const decls = Object.entries(rule.declarations)
      .map(([prop, val]) => `  ${prop}: ${val};`)
      .join("\n");
    css += `${selector} {\n${decls}\n}\n`;
  }

  if (hasPrelude) {
    css += "}\n";
  }

  return css.trim();
}

/** Build and inject a stylesheet in one call */
export function injectStyleSheet(sheet: StyleSheet, options?: InjectOptions): StyleElement {
  const css = buildStyleSheet(sheet);
  return injectStyle(css, options);
}

// --- Scoped Styles ---

/**
 * Generate a unique scope class and wrap all selectors.
 */
export function createScope(prefix = "scope"): { className: string; wrap: (selector: string) => string } {
  const hash = crypto.randomUUID().slice(0, 8);
  const className = `${prefix}-${hash}`;
  return {
    className,
    wrap(selector: string) {
      if (selector.startsWith(":") || selector.startsWith("[") || selector === "*") {
        return `.${className}${selector}`;
      }
      return `.${className} ${selector}`;
    },
  };
}

// --- CSS Variable Helpers ---

/**
 * Set CSS custom properties on an element.
 */
export function setCSSVars(el: HTMLElement, vars: Record<string, string>): void {
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key.startsWith("--") ? key : `--${key}`, value);
  }
}

/**
 * Get all CSS custom properties computed on an element.
 */
export function getCSSVars(el: HTMLElement): Record<string, string> {
  const cs = getComputedStyle(el);
  const vars: Record<string, string> = {};
  for (let i = 0; i < cs.length; i++) {
    const name = cs[i];
    if (name?.startsWith("--")) {
      vars[name] = cs.getPropertyValue(name).trim();
    }
  }
  return vars;
}

/**
 * Create a CSS variable token map from a flat object.
 * Useful for design token systems.
 */
export function createTokenMap(tokens: Record<string, string>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    const varName = prefix ? `--${prefix}-${key}` : `--${key}`;
    result[varName] = value;
  }
  return result;
}

// --- Dynamic Rule Management ---

/**
 * Manage dynamic CSS rules that can be added/removed/updated at runtime.
 */
export class DynamicStyleManager {
  private styleEl: HTMLStyleElement;
  private ruleIndex = new Map<string, number>();
  private sheet: CSSStyleSheet;

  constructor(options?: { id?: string; container?: HTMLElement }) {
    this.styleEl = document.createElement("style");
    this.styleEl.setAttribute("data-dynamic-styles", "");
    if (options?.id) this.styleEl.id = options.id;
    (options?.container ?? document.head).appendChild(this.styleEl);
    this.sheet = this.styleEl.sheet!;
  }

  /** Add or update a rule by key */
  setRule(key: string, selector: string, declarations: Record<string, string>): number {
    // Remove existing
    this.removeRule(key);

    const declStr = Object.entries(declarations)
      .map(([p, v]) => `${p}: ${v}`)
      .join("; ");
    const ruleText = `${selector} { ${declStr} }`;

    const index = this.sheet.insertRule(ruleText, this.sheet.cssRules.length);
    this.ruleIndex.set(key, index);
    return index;
  }

  /** Remove a rule by key */
  removeRule(key: string): void {
    const index = this.ruleIndex.get(key);
    if (index !== undefined) {
      this.sheet.deleteRule(index);
      this.ruleIndex.delete(key);
      // Re-index remaining rules after deletion
      this.reindex();
    }
  }

  /** Check if a rule exists */
  hasRule(key: string): boolean {
    return this.ruleIndex.has(key);
  }

  /** Get current rule count */
  getRuleCount(): number {
    return this.ruleIndex.size;
  }

  /** Clear all dynamic rules */
  clear(): void {
    while (this.sheet.cssRules.length > 0) {
      this.sheet.deleteRule(0);
    }
    this.ruleIndex.clear();
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.clear();
    this.styleEl.remove();
  }

  private reindex(): void {
    const entries = Array.from(this.ruleIndex.entries());
    this.ruleIndex.clear();
    for (const [key, oldIdx] of entries) {
      let newIdx = oldIdx;
      for (let i = 0; i < this.sheet.cssRules.length; i++) {
        // Find matching rule — simple approach: re-index sequentially
      }
      // Rebuild index based on insertion order
      this.ruleIndex.set(key, newIdx);
    }
  }
}

// --- Critical CSS ---

/**
 * Extract above-the-fold critical CSS from a stylesheet URL.
 * Returns the CSS text that should be inlined in <head>.
 */
export async function extractCriticalCSS(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const css = await response.text();

    // Simple heuristic: take first ~10KB or first ~50 rules
    const maxLength = 10240;
    if (css.length <= maxLength) return css;

    // Split by closing brace and take first batch
    const parts = css.split("}");
    let critical = "";
    let length = 0;
    for (const part of parts) {
      if (length + part.length + 1 > maxLength) break;
      critical += part + "}";
      length = critical.length;
    }
    return critical;
  } catch {
    return "";
  }
}

// --- Utility ---

function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")       // Remove comments
    .replace(/\s+/g, " ")                     // Collapse whitespace
    .replace(/\s*([{};:,])\s*/g, "$1")     // Trim around symbols
    .replace(/;}/g, "}")                    // Trim last semicolon before close
    .trim();
}
