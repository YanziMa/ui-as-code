/**
 * Style Utilities: Inline style manipulation, computed style access,
 * style object serialization/deserialization, CSS unit conversion,
 * shorthand expansion, style inheritance detection, responsive style
 * helpers, and dynamic style injection utilities.
 */

// --- Types ---

export interface StyleMap {
  [property: string]: string | number;
}

export interface StyleDiff {
  property: string;
  oldValue: string | null;
  newValue: string;
}

export interface ShorthandExpansion {
  /** The shorthand property name */
  shorthand: string;
  /** Expanded longhand properties */
  longhands: string[];
}

// --- Computed Style Access ---

/** Get the computed value of a CSS property for an element */
export function getComputedStyleValue(
  el: HTMLElement,
  property: string,
): string {
  return window.getComputedStyle(el).getPropertyValue(property).trim();
}

/** Get multiple computed styles as a record */
export function getComputedStyles(
  el: HTMLElement,
  properties?: string[],
): Record<string, string> {
  const cs = window.getComputedStyle(el);
  if (!properties) {
    // Return all computed styles as a map
    const result: Record<string, string> = {};
    for (let i = 0; i < cs.length; i++) {
      const prop = cs[i];
      result[prop] = cs.getPropertyValue(prop);
    }
    return result;
  }
  const result: Record<string, string> = {};
  for (const prop of properties) {
    result[prop] = cs.getPropertyValue(prop).trim();
  }
  return result;
}

/** Check if a computed style value matches the specified value */
export function hasComputedStyle(
  el: HTMLElement,
  property: string,
  value: string,
): boolean {
  return getComputedStyleValue(el, property) === value;
}

// --- Inline Style Manipulation ---

/** Set one or more inline styles on an element */
export function setStyles(
  el: HTMLElement,
  styles: StyleMap,
): void {
  for (const [prop, val] of Object.entries(styles)) {
    el.style.setProperty(prop, typeof val === "number" ? `${val}px` : String(val));
  }
}

/** Get all inline styles as a plain object */
export function getInlineStyles(el: HTMLElement): StyleMap {
  const result: StyleMap = {};
  const style = el.style;
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    result[prop] = style.getPropertyValue(prop);
  }
  return result;
}

/** Remove one or more inline styles from an element */
export function removeStyles(el: HTMLElement, ...properties: string[]): void {
  for (const prop of properties) {
    el.style.removeProperty(prop);
  }
}

/** Apply inline styles temporarily, returning a restore function */
export function withTemporaryStyles(
  el: HTMLElement,
  styles: StyleMap,
): () => void {
  const previous = getInlineStyles(el);
  setStyles(el, styles);
  return () => {
    // Remove all current inline styles
    removeStyles(el, ...Object.keys(getInlineStyles(el)));
    // Restore previous ones
    setStyles(el, previous);
  };
}

/** Diff two style maps and return changed properties */
export function diffStyles(
  oldStyles: StyleMap,
  newStyles: StyleMap,
): StyleDiff[] {
  const diffs: StyleDiff[] = [];
  const allKeys = new Set([...Object.keys(oldStyles), ...Object.keys(newKeys)]);
  for (const key of allKeys) {
    const oldVal = oldStyles[key] ?? null;
    const newVal = newStyles[key] ?? null;
    const oldStr = oldVal !== null ? String(oldVal) : null;
    const newStr = newVal !== null ? String(newVal) : null;
    if (oldStr !== newStr) {
      diffs.push({ property: key, oldValue: oldStr, newValue: newStr! });
    }
  }
  return diffs;
}

// --- Style Object <-> CSS String ---

/** Convert a StyleMap to a CSS declaration string */
export function styleToCSS(styles: StyleMap): string {
  const parts: string[] = [];
  for (const [prop, val] of Object.entries(styles)) {
    parts.push(`${prop}: ${typeof val === "number" ? `${val}px` : val};`);
  }
  return parts.join(" ");
}

/** Parse a CSS declaration string into a StyleMap */
export function cssToStyle(cssString: string): StyleMap {
  const result: StyleMap = {};
  const declarations = cssString.split(";").filter((d) => d.trim());
  for (const decl of declarations) {
    const colonIdx = decl.indexOf(":");
    if (colonIdx === -1) continue;
    const prop = decl.slice(0, colonIdx).trim();
    const val = decl.slice(colonIdx + 1).trim();
    if (prop && val) result[prop] = val;
  }
  return result;
}

/** Convert camelCase property name to kebab-case */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

/** Convert kebab-case property name to camelCase */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
}

// --- Shorthand Expansion ---

/** Known CSS shorthand properties and their longhand equivalents */
const SHORTHAND_MAP: Record<string, string[]> = {
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  border: ["border-width", "border-style", "border-color"],
  "border-width": ["border-top-width", "border-right-width", "border-bottom-width", "border-left-width"],
  "border-style": ["border-top-style", "border-right-style", "border-bottom-style", "border-left-style"],
  "border-color": ["border-top-color", "border-right-color", "border-bottom-color", "border-left-color"],
  background: [
    "background-image", "background-position", "background-size",
    "background-repeat", "background-origin", "background-clip",
    "background-attachment", "background-color",
  ],
  font: [
    "font-style", "font-variant", "font-weight", "font-stretch",
    "font-size", "line-height", "font-family",
  ],
  "list-style": ["list-style-type", "list-style-position", "list-style-image"],
  outline: ["outline-width", "outline-style", "outline-color"],
  overflow: ["overflow-x", "overflow-y"],
  inset: ["top", "right", "bottom", "left"],
  gap: ["row-gap", "column-gap"],
  borderRadius: ["border-top-left-radius", "border-top-right-radius", "border-bottom-right-radius", "border-bottom-left-radius"],
};

/** Expand a shorthand CSS value into its longhand components */
export function expandShorthand(
  property: string,
  value: string,
): StyleMap | null {
  const longhands = SHORTHAND_MAP[property];
  if (!longhands) return null;

  const values = parseQuadValue(value);
  const result: StyleMap = {};

  if (values.length === 1) {
    // Single value applies to all
    for (const lh of longhands) {
      result[lh] = values[0];
    }
  } else if (values.length === 2) {
    // vertical horizontal
    for (let i = 0; i < longhands.length; i++) {
      result[longhands[i]] = i % 2 === 0 ? values[0] : values[1];
    }
  } else if (values.length === 3) {
    // top horizontal bottom
    result[longhands[0]] = values[0]; // top
    result[longhands[1]] = values[1]; // right
    result[longhands[2]] = values[2]; // bottom
    result[longhands[3]] = values[1]; // left (= right)
  } else if (values.length >= 4) {
    // top right bottom left
    for (let i = 0; i < Math.min(4, longhands.length); i++) {
      result[longhands[i]] = values[i];
    }
  }

  return result;
}

/** Parse a quad-value like "10px 20px" or "1px 2px 3px 4px" into array */
function parseQuadValue(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

/** Collapse longhand values back into a shorthand where possible */
export function collapseShorthand(
  longhands: { [key: string]: string },
  shorthandProp: string,
): string | null {
  const expectedLonghands = SHORTHAND_MAP[shorthandProp];
  if (!expectedLonghands) return null;

  const vals = expectedLonghands.map((lh) => longhands[lh]);
  if (vals.some((v) => v === undefined)) return null;

  // Try to collapse: TRBL → TBH → VH → single
  if (
    vals[0] === vals[1] &&
    vals[1] === vals[2] &&
    vals[2] === vals[3]
  ) {
    return vals[0];
  }
  if (vals[0] === vals[2] && vals[1] === vals[3]) {
    return `${vals[0]} ${vals[1]}`;
  }
  if (vals[1] === vals[3]) {
    return `${vals[0]} ${vals[1]} ${vals[2]}`;
  }
  return `${vals[0]} ${vals[1]} ${vals[2]} ${vals[3]}`;
}

// --- Unit Conversion ---

/** Parse a CSS value with unit into numeric value and unit string */
export function parseCSSValue(
  value: string,
): { value: number; unit: string } | null {
  const match = value.match(/^(-?[\d.]+)(px|em|rem|%|vw|vh|vmin|vmax|deg|rad|turn|s|ms|fr)?$/i);
  if (!match) return null;
  return {
    value: parseFloat(match[1]),
    unit: match[2]?.toLowerCase() ?? "",
  };
}

/** Convert px to rem based on root font size (default 16px) */
export function pxToRem(px: number, rootFontSize = 16): string {
  return `${px / rootFontSize}rem`;
}

/** Convert rem to px based on root font size (default 16px) */
export function remToPx(rem: number, rootFontSize = 16): number {
  return rem * rootFontSize;
}

/** Convert px to em relative to parent font size */
export function pxToEm(px: number, parentFontSize = 16): string {
  return `${px / parentFontSize}em`;
}

/** Add CSS units to a raw number */
export function withUnit(
  value: number,
  unit: string = "px",
): string {
  return `${value}${unit}`;
}

/** Strip units from a CSS value string, returning just the number */
export function stripUnit(value: string): number {
  return parseFloat(value.replace(/[^\d.-]/g, ""));
}

// --- Responsive Style Helpers ---

/** Generate responsive styles that change at breakpoints */
export function responsiveStyle(
  base: StyleMap,
  breakpoints: { minW: number; styles: StyleMap }[],
): StyleMap {
  const result = { ...base };
  // Return base only — actual media query application requires stylesheet injection
  // This is a convenience builder; use injectResponsiveStyles() for real usage
  return result;
}

/** Inject responsive styles via a dynamically created stylesheet */
export function injectResponsiveStyles(
  selector: string,
  base: StyleMap,
  breakpoints: { minWidth: number; styles: StyleMap }[],
): () => void {
  const sheet = createStyleSheet();

  // Base styles
  let baseCSS = "";
  for (const [prop, val] of Object.entries(base)) {
    baseCSS += `  ${prop}: ${typeof val === "number" ? `${val}px` : val};\n`;
  }
  sheet.insertRule(`${selector} {\n${baseCSS}}`, sheet.cssRules.length);

  // Breakpoint styles
  for (const bp of breakpoints) {
    let bpCSS = "";
    for (const [prop, val] of Object.entries(bp.styles)) {
      bpCSS += `  ${prop}: ${typeof val === "number" ? `${val}px` : val};\n`;
    }
    try {
      sheet.insertRule(
        `@media (min-width: ${bp.minWidth}px) {\n  ${selector} {\n${bpCSS}  }\n}`,
        sheet.cssRules.length,
      );
    } catch {}
  }

  return () => sheet.remove();
}

// --- Dynamic Stylesheet Management ---

/** Create a new detached stylesheet element */
export function createStyleSheet(media?: string): CSSStyleSheet {
  const style = document.createElement("style");
  style.type = "text/css";
  if (media) style.media = media;
  document.head.appendChild(style);
  return style.sheet!;
}

/** Insert a CSS rule into a stylesheet, returns the rule index or -1 on failure */
export function insertRule(
  sheet: CSSStyleSheet,
  selector: string,
  declarations: string,
  index?: number,
): number {
  try {
    const rule = `${selector} { ${declarations} }`;
    return sheet.insertRule(rule, index ?? sheet.cssRules.length);
  } catch {
    return -1;
  }
}

/** Remove a CSS rule from a stylesheet by index */
export function removeRule(sheet: CSSStyleSheet, index: number): boolean {
  try {
    sheet.deleteRule(index);
    return true;
  } catch {
    return false;
  }
}

/** Find rules in a stylesheet matching a selector pattern */
export function findRules(
  sheet: CSSStyleSheet,
  selectorPattern: RegExp,
): CSSStyleRule[] {
  const matches: CSSStyleRule[] = [];
  for (let i = 0; i < sheet.cssRules.length; i++) {
    const rule = sheet.cssRules[i];
    if (rule instanceof CSSStyleRule && selectorPattern.test(rule.selectorText)) {
      matches.push(rule);
    }
  }
  return matches;
}

/** Clear all rules from a stylesheet */
export function clearSheet(sheet: CSSStyleSheet): void {
  while (sheet.cssRules.length > 0) {
    sheet.deleteRule(0);
  }
}

// --- Style Inheritance & Cascade ---

/** Check if a style property is inherited by default */
export function isInheritedProperty(property: string): boolean {
  const nonInherited = new Set([
    "display", "position", "width", "height", "min-width", "max-width",
    "min-height", "max-height", "margin", "padding", "border", "background",
    "float", "clear", "overflow", "z-index", "top", "right", "bottom", "left",
    "flex", "flex-basis", "flex-grow", "flex-shrink", "order", "grid-column",
    "grid-row", "gap", "row-gap", "column-gap", "outline", "box-sizing",
    "vertical-align", "animation", "transition", "transform",
  ]);
  return !nonInherited.has(property) && !property.startsWith("--");
}

/** Get the cascade origin of a computed style value (inline / rule / browser default) */
export function getStyleOrigin(
  el: HTMLElement,
  property: string,
): "inline" | "stylesheet" | "default" {
  // Check inline first
  if (el.style.getPropertyValue(property)) return "inline";
  // Check if it differs from default
  const computed = getComputedStyleValue(el, property);
  const tempEl = document.createElement(el.tagName);
  document.body.appendChild(tempEl);
  const defaultVal = window.getComputedStyle(tempEl).getPropertyValue(property);
  document.body.removeChild(tempEl);
  return computed !== defaultVal ? "stylesheet" : "default";
}

// --- Style Transfer Utilities ---

/** Copy all computed styles from one element to another */
export function copyComputedStyles(
  source: HTMLElement,
  target: HTMLElement,
  excludeProperties?: Set<string>,
): void {
  const cs = window.getComputedStyle(source);
  const exclude = excludeProperties ?? new Set([
    "width", "height", "position", "top", "left", "right", "bottom",
    "z-index", "display", "margin", "padding",
  ]);
  for (let i = 0; i < cs.length; i++) {
    const prop = cs[i];
    if (exclude.has(prop)) continue;
    target.style.setProperty(prop, cs.getPropertyValue(prop));
  }
}

/** Extract visual styles from an element (for snapshot/clone purposes) */
export function extractVisualStyles(el: HTMLElement): StyleMap {
  const cs = window.getComputedStyle(el);
  const visualProps = [
    "color", "backgroundColor", "fontSize", "fontWeight", "fontFamily",
    "lineHeight", "letterSpacing", "textAlign", "textTransform",
    "borderColor", "borderWidth", "borderStyle", "borderRadius",
    "boxShadow", "opacity", "transform", "filter", "backdropFilter",
  ];
  const result: StyleMap = {};
  for (const prop of visualProps) {
    const val = cs.getPropertyValue(prop);
    if (val && val !== "none" && val !== "normal" && val !== "initial") {
      result[prop] = val;
    }
  }
  return result;
}

// --- Class-based Style Manager ---

/**
 * StyleManager - manages dynamic stylesheets with scoped selectors,
 * caching, and lifecycle management.
 *
 * @example
 * ```ts
 * const sm = new StyleManager("my-component");
 * sm.set(".btn", { color: "red", fontSize: "14px" });
 * sm.set("@media (min-width: 768px)", ".btn", { fontSize: "16px" });
 * sm.destroy(); // Clean up all injected styles
 * ```
 */
export class StyleManager {
  private sheet: CSSStyleSheet;
  private cache = new Map<string, number>(); // selector -> rule index
  private scope: string;

  constructor(scopeName: string) {
    this.scope = scopeName;
    this.sheet = createStyleSheet();
    (this.sheet.ownerNode as HTMLStyleElement).setAttribute("data-style-manager", scopeName);
  }

  /** Set styles for a selector within this scope */
  set(selector: string, styles: StyleMap): void {
    const fullSelector = this._scoped(selector);
    const cssText = styleToCSS(styles);

    // Update existing rule if present
    const existingIndex = this.cache.get(fullSelector);
    if (existingIndex !== undefined) {
      const rule = this.sheet.cssRules[existingIndex] as CSSStyleRule;
      if (rule) {
        rule.style.cssText = cssText;
        return;
      }
    }

    // Insert new rule
    const idx = insertRule(this.sheet, fullSelector, cssText);
    if (idx >= 0) {
      this.cache.set(fullSelector, idx);
    }
  }

  /** Remove styles for a selector */
  remove(selector: string): void {
    const fullSelector = this._scoped(selector);
    const idx = this.cache.get(fullSelector);
    if (idx !== undefined) {
      removeRule(this.sheet, idx);
      this.cache.delete(fullSelector);
      // Rebuild cache indices after deletion
      this._rebuildCache();
    }
  }

  /** Get currently managed selectors */
  getSelectors(): string[] {
    return Array.from(this.cache.keys());
  }

  /** Check if a selector is being managed */
  has(selector: string): boolean {
    return this.cache.has(this._scoped(selector));
  }

  /** Destroy and remove all injected styles */
  destroy(): void {
    this.sheet.ownerNode?.remove();
    this.cache.clear();
  }

  private _scoped(selector: string): string {
    return `[data-scope="${this.scope}"] ${selector}`.trim();
  }

  private _rebuildCache(): void {
    this.cache.clear();
    for (let i = 0; i < this.sheet.cssRules.length; i++) {
      const rule = this.sheet.cssRules[i];
      if (rule instanceof CSSStyleRule) {
        this.cache.set(rule.selectorText, i);
      }
    }
  }
}
