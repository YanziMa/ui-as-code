/**
 * CSS utilities: dynamic style injection, CSS custom property management,
 * responsive breakpoint detection, media query helpers, BEM-like class generation,
 * style object conversion, dynamic stylesheet management, keyframe generation,
 * CSS-in-JS helpers, and responsive design utilities.
 */

// --- CSS Custom Properties (Variables) ---

/** Generate a CSS var() reference */
export function cssVar(name: string, fallback?: string): string {
  return `var(--${name}${fallback ? `, ${fallback}` : ""})`;
}

/** Set a CSS custom property on an element */
export function setCssVar(element: HTMLElement, name: string, value: string): void {
  element.style.setProperty(`--${name}`, value);
}

/** Get a CSS custom property computed value from an element */
export function getCssVar(element: HTMLElement, name: string): string {
  return getComputedStyle(element).getPropertyValue(`--${name}`).trim();
}

/** Set multiple CSS variables at once */
export function setCssVars(element: HTMLElement, vars: Record<string, string>): void {
  for (const [name, value] of Object.entries(vars)) {
    element.style.setProperty(`--${name}`, value);
  }
}

/** Remove a CSS custom property from an element */
export function removeCssVar(element: HTMLElement, name: string): void {
  element.style.removeProperty(`--${name}`);
}

/** Get all CSS custom properties set on an element */
export function getAllCssVars(element: HTMLElement): Record<string, string> {
  const style = getComputedStyle(element);
  const result: Record<string, string> = {};
  // Iterate over all CSS properties and filter for custom ones
  for (let i = 0; i < style.length; i++) {
    const prop = style[i];
    if (prop?.startsWith("--")) {
      result[prop] = style.getPropertyValue(prop).trim();
    }
  }
  return result;
}

// --- Dynamic Stylesheet Management ---

let dynamicStyleId = 0;

/** Create or reuse a dynamically injected <style> element */
export function createStylesheet(id?: string): HTMLStyleElement {
  const existing = id ? document.getElementById(id) as HTMLStyleElement | null : null;
  if (existing) return existing;

  const style = document.createElement("style");
  if (id) style.id = id;
  else { style.id = `dynamic-style-${++dynamicStyleId}`; }
  document.head.appendChild(style);
  return style;
}

/** Inject CSS rules into the page (creates a <style> tag) */
export function injectCSS(css: string, id?: string): HTMLStyleElement {
  const sheet = createStylesheet(id);
  sheet.textContent = css;
  return sheet;
}

/** Remove an injected stylesheet by ID */
export function removeInjectedCSS(id: string): void {
  const el = document.getElementById(id);
  if (el) el.remove();
}

/** Add a single CSS rule to a stylesheet */
export function addCSSRule(
  selector: string,
  declarations: string,
  sheet?: CSSStyleSheet,
): void {
  const targetSheet = sheet ?? (document.styleSheets[0] as CSSStyleSheet);
  try {
    targetSheet.insertRule(`${selector} { ${declarations} }`, targetSheet.cssRules.length);
  } catch {
    // Selector may be invalid — silently ignore
  }
}

/** Remove all dynamically created stylesheets */
export function clearDynamicStyles(): void {
  document.querySelectorAll("style[id^='dynamic-style-']").forEach((el) => el.remove());
}

// --- Style Object Conversion ---

/** Convert a flat style object to CSS string */
export function styleObjectToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([prop, val]) => `${camelToKebab(prop)}: ${val}`)
    .join("; ");
}

/** Convert a CSS string to a style object */
export function cssStringToObject(css: string): Record<string, string> {
  const obj: Record<string, string> = {};
  const declarations = css.split(";").filter(Boolean);
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(":");
    if (colonIndex === -1) continue;
    const prop = decl.slice(0, colonIndex).trim();
    const val = decl.slice(colonIndex + 1).trim();
    obj[kebabToCamel(prop)] = val;
  }
  return obj;
}

/** Apply a style object to an element */
export function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
  Object.assign(element.style, styles);
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, "-$1").toLowerCase();
}
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// --- Class Name Utilities ---

/** BEM-like class name generator */
export function bem(block: string, element?: string, modifier?: string | Record<string, boolean>): string {
  let cls = block;
  if (element) cls += `__${element}`;
  if (typeof modifier === "string") {
    cls += `--${modifier}`;
  } else if (modifier && typeof modifier === "object") {
    const activeMods = Object.entries(modifier).filter(([, v]) => v).map(([k]) => k);
    if (activeMods.length > 0) cls += `--${activeMods.join("--")}`;
  }
  return cls;
}

/** Create a BEM helper bound to a specific block */
export function createBem(block: string): (element?: string, modifier?: string | Record<string, boolean>) => string {
  return (element?, modifier?) => bem(block, element, modifier);
}

/** Conditional class names (like clsx/cn) */
export function cn(...inputs: Array<string | undefined | null | false | Record<string, boolean>>): string {
  const classes: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      classes.push(input);
    } else if (typeof input === "object") {
      for (const [cls, condition] of Object.entries(input)) {
        if (condition) classes.push(cls);
      }
    }
  }
  return classes.join(" ");
}

/** Merge class strings, deduplicating */
export function mergeClasses(...classes: (string | undefined | null | false)[]): string {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const cls of classes) {
    if (!cls) continue;
    for (const part of cls.split(/\s+/).filter(Boolean)) {
      if (!seen.has(part)) { seen.add(part); result.push(part); }
    }
  }
  return result.join(" ");
}

// --- Responsive / Media Queries ---

/** Tailwind-compatible breakpoint definitions */
export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

/** Generate a media query string */
export function mediaQuery(breakpoint: BreakpointName, direction: "min" | "max" = "min"): string {
  return `(${direction}-width: ${BREAKPOINTS[breakpoint]})`;
}

/** Check if a media query matches */
export function matchesMedia(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

/** Check if viewport is at least a given breakpoint */
export function isAtLeast(breakpoint: BreakpointName): boolean {
  return matchesMedia(mediaQuery(breakpoint));
}

/** Check if viewport is below a given breakpoint */
export function isBelow(breakpoint: BreakpointName): boolean {
  return matchesMedia(mediaQuery(breakpoint, "max"));
}

/** Subscribe to media query changes */
export function subscribeMedia(
  query: string,
  callback: (matches: boolean) => void,
): () => void {
  const mql = window.matchMedia(query);
  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  mql.addEventListener("change", handler);
  callback(mql.matches); // Initial call
  return () => mql.removeEventListener("change", handler);
}

/** Subscribe to breakpoint changes */
export function subscribeBreakpoint(
  breakpoint: BreakpointName,
  callback: (matches: boolean) => void,
): () => void {
  return subscribeMedia(mediaQuery(breakpoint), callback);
}

/** Detect current breakpoint name */
export function getCurrentBreakpoint(): BreakpointName {
  const bps = Object.entries(BREAKPOINTS) as [BreakpointName, string][];
  for (let i = bps.length - 1; i >= 0; i--) {
    const [name, width] = bps[i]!;
    if (isAtLeast(name)) return name;
  }
  return "sm";
}

/** Common media query shortcuts */
export const media = {
  /** Prefer reduced motion */
  prefersReducedMotion: () => matchesMedia("(prefers-reduced-motion: reduce)"),
  /** Dark mode */
  prefersDark: () => matchesMedia("(prefers-color-scheme: dark)"),
  /** Light mode */
  prefersLight: () => matchesMedia("(prefers-color-scheme: light)"),
  /** High contrast */
  prefersHighContrast: () => matchesMedia("(prefers-contrast: high)"),
  /** Touch device */
  isTouch: () => matchesMedia("(pointer: coarse)"),
  /** Hover-capable device */
  canHover: () => matchesMedia("(hover: hover)"),
  /** Landscape orientation */
  isLandscape: () => matchesMedia("(orientation: landscape)"),
  /** Portrait orientation */
  isPortrait: () => matchesMedia("(orientation: portrait)"),
  /** High DPI / retina */
  isRetina: () => matchesMedia("(-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)"),
  /** Print mode */
  isPrint: () => matchesMedia("print"),
};

// --- CSS Transitions & Animations ---

/** Generate CSS transition shorthand */
export function cssTransition(
  properties: string | string[],
  duration = "200ms",
  easing = "ease",
  delay = "0ms",
): string {
  const props = Array.isArray(properties) ? properties.join(", ") : properties;
  return `${props} ${duration} ${easing} ${delay}`;
}

/** Common CSS easing functions */
export const EASING_CSS = {
  linear: "linear",
  ease: "ease",
  easeIn: "ease-in",
  easeOut: "ease-out",
  easeInOut: "ease-in-out",
  easeInSine: "cubic-bezier(0.12, 0, 0.39, 0)",
  easeOutSine: "cubic-bezier(0.61, 1, 0.88, 1)",
  easeInOutSine: "cubic-bezier(0.37, 0, 0.63, 1)",
  easeInQuad: "cubic-bezier(0.11, 0, 0.5, 0)",
  easeOutQuad: "cubic-bezier(0.5, 1, 0.89, 1)",
  easeInOutQuad: "cubic-bezier(0.45, 0, 0.55, 1)",
  easeInCubic: "cubic-bezier(0.32, 0, 0.67, 0)",
  easeOutCubic: "cubic-bezier(0.33, 1, 0.68, 1)",
  easeInOutCubic: "cubic-bezier(0.65, 0, 0.35, 1)",
  easeInBack: "cubic-bezier(0.36, 0, 0.66, -0.56)",
  easeOutBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
} as const;

/** Generate @keyframes CSS rule */
export function keyframes(
  name: string,
  frames: Array<{ percent: number; styles: string }>,
): string {
  const frameStrs = frames
    .sort((a, b) => a.percent - b.percent)
    .map((f) => `${f.percent}% { ${f.styles} }`)
    .join("\n  ");
  return `@keyframes ${name} {\n  ${frameStrs}\n}`;
}

/** Generate common animation keyframes */
export const ANIMATIONS = {
  fadeIn: keyframes("fadeIn", [
    { percent: 0, styles: "opacity: 0" },
    { percent: 100, styles: "opacity: 1" },
  ]),
  fadeOut: keyframes("fadeOut", [
    { percent: 0, styles: "opacity: 1" },
    { percent: 100, styles: "opacity: 0" },
  ]),
  slideUp: keyframes("slideUp", [
    { percent: 0, styles: "transform: translateY(10px); opacity: 0" },
    { percent: 100, styles: "transform: translateY(0); opacity: 1" },
  ]),
  slideDown: keyframes("slideDown", [
    { percent: 0, styles: "transform: translateY(-10px); opacity: 0" },
    { percent: 100, styles: "transform: translateY(0); opacity: 1" },
  ]),
  slideLeft: keyframes("slideLeft", [
    { percent: 0, styles: "transform: translateX(10px); opacity: 0" },
    { percent: 100, styles: "transform: translateX(0); opacity: 1" },
  ]),
  slideRight: keyframes("slideRight", [
    { percent: 0, styles: "transform: translateX(-10px); opacity: 0" },
    { percent: 100, styles: "transform: translateX(0); opacity: 1" },
  ]),
  scaleIn: keyframes("scaleIn", [
    { percent: 0, styles: "transform: scale(0.95); opacity: 0" },
    { percent: 100, styles: "transform: scale(1); opacity: 1" },
  ]),
  spin: keyframes("spin", [
    { percent: 0, styles: "transform: rotate(0deg)" },
    { percent: 100, styles: "transform: rotate(360deg)" },
  ]),
  pulse: keyframes("pulse", [
    { percent: 0, styles: "opacity: 1" },
    { percent: 50, styles: "opacity: 0.5" },
    { percent: 100, styles: "opacity: 1" },
  ]),
  bounce: keyframes("bounce", [
    { percent: 0, styles: "transform: translateY(0)" },
    { percent: 20, styles: "transform: translateY(-8px)" },
    { percent: 40, styles: "transform: translateY(0)" },
    { percent: 60, styles: "transform: translateY(-4px)" },
    { percent: 80, styles: "transform: translateY(0)" },
    { percent: 100, styles: "transform: translateY(0)" },
  ]),
  shake: keyframes("shake", [
    { percent: 0, styles: "transform: translateX(0)" },
    { percent: 25, styles: "transform: translateX(-4px)" },
    { percent: 50, styles: "transform: translateX(4px)" },
    { percent: 75, styles: "transform: translateX(-4px)" },
    { percent: 100, styles: "transform: translateX(0)" },
  ]),
} as const;

/** Apply animation to element with auto-cleanup on end */
export function animateOnce(
  element: HTMLElement,
  animationName: string,
  duration = "300ms",
  options?: { fillMode?: string; onEnd?: () => void },
): () => void {
  element.style.animation = `${animationName} ${duration} forwards ${options?.fillMode ?? "forwards"}`;

  const handleEnd = () => {
    element.removeEventListener("animationend", handleEnd);
    element.style.animation = "";
    options?.onEnd?.();
  };
  element.addEventListener("animationend", handleEnd);

  return () => {
    element.removeEventListener("animationend", handleEnd);
    element.style.animation = "";
  };
}

// --- Color Utilities (CSS-specific) ---

/** Parse hex color to RGB components */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

/** Convert RGB values to hex color string */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
}

/** Mix two colors by weight (0 = fully color2, 1 = fully color1) */
export function mixColors(color1: string, color2: string, weight = 0.5): string | null {
  const c1 = parseCssColor(color1);
  const c2 = parseCssColor(color2);
  if (!c1 || !c2) return null;

  const r = Math.round(c1.r * weight + c2.r * (1 - weight));
  const g = Math.round(c1.g * weight + c2.g * (1 - weight));
  const b = Math.round(c1.b * weight + c2.b * (1 - weight));
  return rgbToHex(r, g, b);
}

/** Make a color transparent by reducing alpha */
export function transparentize(color: string, amount: number): string | null {
  const parsed = parseCssColor(color);
  if (!parsed) return null;
  const alpha = Math.max(0, Math.min(1, 1 - amount));
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
}

/** Lighten a color by amount (0-1) */
export function lightenColor(color: string, amount: number): string | null {
  const parsed = parseCssColor(color);
  if (!parsed) return null;
  return rgbToHex(
    Math.min(255, parsed.r + (255 - parsed.r) * amount),
    Math.min(255, parsed.g + (255 - parsed.g) * amount),
    Math.min(255, parsed.b + (255 - parsed.b) * amount),
  );
}

/** Darken a color by amount (0-1) */
export function darkenColor(color: string, amount: number): string | null {
  const parsed = parseCssColor(color);
  if (!parsed) return null;
  return rgbToHex(
    Math.max(0, parsed.r * (1 - amount)),
    Math.max(0, parsed.g * (1 - amount)),
    Math.max(0, parsed.b * (1 - amount)),
  );
}

/** Parse any CSS color format to RGB components */
export function parseCssColor(color: string): { r: number; g: number; b: number; a?: number } | null {
  // Hex
  if (color.startsWith("#")) {
    const hex = hexToRgb(color);
    if (!hex) return null;
    if (color.length === 9) {
      return { ...hex, a: parseInt(color.slice(7), 16) / 255 };
    }
    return hex;
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const result = { r: parseInt(rgbMatch[1]!, 10), g: parseInt(rgbMatch[2]!, 10), b: parseInt(rgbMatch[3]!, 10) };
    if (rgbMatch[4]) return { ...result, a: parseFloat(rgbMatch[4]!) };
    return result;
  }

  // HSL (basic support)
  const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]!) / 360;
    const s = parseInt(hslMatch[2]!) / 100;
    const l = parseInt(hslMatch[3]!) / 100;
    const a = hslMatch[4] ? parseFloat(hslMatch[4]!) : undefined;

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return {
      r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
      a,
    };
  }

  // Named colors (subset)
  const named: Record<string, { r: number; g: number; b: number }> = {
    black: { r: 0, g: 0, b: 0 }, white: { r: 255, g: 255, b: 255 },
    red: { r: 255, g: 0, b: 0 }, green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 }, transparent: { r: 0, g: 0, b: 0 },
  };

  return named[color.toLowerCase()] ?? null;
}

// --- CSS Units & Values ---

/** Convert px to rem based on root font size */
export function pxToRem(px: number, baseFontSize = 16): string {
  return `${px / baseFontSize}rem`;
}

/** Convert rem to px based on root font size */
export function remToPx(rem: number, baseFontSize = 16): number {
  return rem * baseFontSize;
}

/** Ensure a value has units (add 'px' if numeric) */
export function ensureUnit(value: number | string, defaultUnit = "px"): string {
  return typeof value === "number" ? `${value}${defaultUnit}` : String(value);
}

/** Clamp a CSS value between min and max with optional preferred value */
export function cssClamp(min: number | string, preferred?: number | string, max?: number | string): string {
  if (preferred && max) return `clamp(${ensureUnit(min)}, ${ensureUnit(preferred)}, ${ensureUnit(max)})`;
  if (preferred) return `clamp(${ensureUnit(min)}, ${ensureUnit(preferred)}, ${ensureUnit(min)})`;
  return `min(${ensureUnit(max ?? min)}, ${ensureUnit(min)})`;
}

/** Generate a responsive font-size using clamp() */
export function fluidFontSize(
  minSize: number,
  maxSize: number,
  minViewport = 320,
  maxViewport = 1440,
  unit = "rem",
  baseFontSize = 16,
): string {
  const minRem = (minSize / baseFontSize).toFixed(2);
  const maxRem = (maxSize / baseFontSize).toFixed(2);
  const preferred = ((minSize + (maxSize - minSize) * ((100 - (minViewport / maxViewport * 100))) / 100) / baseFontSize).toFixed(2);
  return `clamp(${minRem}${unit}, ${preferred}${unit}, ${maxRem}${unit})`;
}
