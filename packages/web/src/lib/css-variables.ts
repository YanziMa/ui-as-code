/**
 * CSS Custom Properties (CSS Variables) Runtime Management:
 * Get/set/remove CSS variables on any element, batch operations,
 * variable inheritance tracking, computed value resolution, and
 * CSS-in-JS style object generation.
 */

// --- Types ---

export interface CssVarOptions {
  /** Target element (default: document.documentElement) */
  target?: HTMLElement | string;
  /** Variable name prefix (e.g., "--my-app-") */
  prefix?: string;
}

export interface CssVarInstance {
  /** Set a single CSS variable */
  set: (name: string, value: string) => void;
  /** Get a computed CSS variable value */
  get: (name: string) => string;
  /** Remove a CSS variable (reverts to inherited/default) */
  remove: (name: string) => void;
  /** Check if a variable is explicitly set on this element */
  has: (name: string) => boolean;
  /** Set multiple variables at once */
  setMany: (vars: Record<string, string>) => void;
  /** Get all custom properties set on this element */
  getAll: () => Record<string, string>;
  /** Remove all custom properties set by this instance */
  clear: () => void;
  /** Generate a CSS style object from current variables (for React inline styles) */
  toStyleObject: () => Record<string, string>;
  /** Export as a CSS :root block string */
  toCssString: () => string;
  /** The target element */
  element: HTMLElement;
}

// --- Helpers ---

function resolveTarget(target?: HTMLElement | string): HTMLElement {
  if (!target || typeof target === "string") {
    const el = typeof target === "string"
      ? document.querySelector<HTMLElement>(target)
      : null;
    return el ?? document.documentElement;
  }
  return target;
}

function normalizeVarName(name: string, prefix?: string): string {
  if (name.startsWith("--")) return name;
  return `${prefix ?? ""}${name}`;
}

// --- Main Factory ---

export function createCssVars(options: CssVarOptions = {}): CssVarInstance {
  const prefix = options.prefix ?? "";
  const el = resolveTarget(options.target);

  // Track which variables we've set (for clear())
  const managedVars = new Set<string>();

  function set(name: string, value: string): void {
    const fullName = normalizeVarName(name, prefix);
    el.style.setProperty(fullName, value);
    managedVars.add(fullName);
  }

  function get(name: string): string {
    const fullName = normalizeVarName(name, prefix);
    // Use getComputedStyle for resolved value (includes inheritance)
    const computed = window.getComputedStyle(el);
    return computed.getPropertyValue(fullName).trim();
  }

  function remove(name: string): void {
    const fullName = normalizeVarName(name, prefix);
    el.style.removeProperty(fullName);
    managedVars.delete(fullName);
  }

  function has(name: string): boolean {
    const fullName = normalizeVarName(name, prefix);
    return el.style.getPropertyValue(fullName) !== "";
  }

  function setMany(vars: Record<string, string>): void {
    for (const [key, value] of Object.entries(vars)) {
      set(key, value);
    }
  }

  function getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    const style = el.style;

    for (let i = 0; i < style.length; i++) {
      const prop = style[i]!;
      if (prop.startsWith("--")) {
        result[prop] = style.getPropertyValue(prop).trim();
      }
    }

    return result;
  }

  function clear(): void {
    for (const varName of managedVars) {
      el.style.removeProperty(varName);
    }
    managedVars.clear();
  }

  function toStyleObject(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const varName of managedVars) {
      const value = el.style.getPropertyValue(varName).trim();
      if (value) {
        obj[varName] = value;
      }
    }
    return obj;
  }

  function toCssString(): string {
    const lines: string[] = [":root {"];
    for (const varName of managedVars) {
      const value = el.style.getPropertyValue(varName).trim();
      if (value) {
        lines.push(`  ${varName}: ${value};`);
      }
    }
    lines.push("}");
    return lines.join("\n");
  }

  return { set, get, remove, has, setMany, getAll, clear, toStyleObject, toCssString, element: el };
}

// --- Utility Functions ---

/** Parse a CSS variable value into components (number + unit) */
export function parseCssValue(value: string): { number: number; unit: string } | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^(-?[\d.]+)(px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|rad|turn)?$/);
  if (!match) return null;
  return {
    number: parseFloat(match[1]),
    unit: match[2] ?? "",
  };
}

/** Convert a px value to rem based on root font size */
export function pxToRem(px: number, baseFontSize?: number): string {
  const base = baseFontSize ?? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return `${px / base}rem`;
}

/** Convert a rem value to px based on root font size */
export function remToPx(rem: number, baseFontSize?: number): number {
  const base = baseFontSize ?? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  return rem * base;
}

/** Resolve a CSS variable reference chain (e.g., "var(--x)" → actual value) */
export function resolveCssVarChain(
  el: HTMLElement,
  value: string,
  maxDepth = 10,
): string {
  let current = value.trim();
  let depth = 0;

  while (current.startsWith("var(") && depth < maxDepth) {
    depth++;
    const match = current.match(/^var\(\s*--([\w-]+)/);
    if (!match) break;

    const varName = `--${match[1]}`;
    const computed = window.getComputedStyle(el).getPropertyValue(varName).trim();

    if (!computed) break; // Can't resolve further
    current = computed;
  }

  return current;
}
