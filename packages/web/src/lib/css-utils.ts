/**
 * CSS-in-JS and dynamic style generation utilities.
 */

/** Generate CSS custom property (CSS variable) value */
export function cssVar(name: string, fallback?: string): string {
  return `var(--${name}${fallback ? `, ${fallback}` : ""})`;
}

/** Set a CSS custom property on an element */
export function setCssVar(
  element: HTMLElement,
  name: string,
  value: string,
): void {
  element.style.setProperty(`--${name}`, value);
}

/** Get a CSS custom property value from an element */
export function getCssVar(
  element: HTMLElement,
  name: string,
): string {
  return getComputedStyle(element).getPropertyValue(`--${name}`).trim();
}

/** Generate a CSS transition shorthand */
export function cssTransition(
  properties: string | string[],
  duration = "200ms",
  easing = "ease",
  delay = "0ms",
): string {
  const props = Array.isArray(properties) ? properties.join(", ") : properties;
  return `${props} ${duration} ${easing} ${delay}`;
}

/** Common easing functions as CSS values */
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

/** Breakpoint names matching Tailwind defaults */
export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

/** Generate media query string */
export function mediaQuery(breakpoint: keyof typeof BREAKPOINTS, direction: "min" | "max" = "min"): string {
  return `(${direction}-width: ${BREAKPOINTS[breakpoint]})`;
}

/** Check if a media query matches (client-side only) */
export function matchesMedia(query: string): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

/** Check if we're at or above a breakpoint */
export function isAtLeast(breakpoint: keyof typeof BREAKPOINTS): boolean {
  return matchesMedia(mediaQuery(breakpoint));
}

/** Check if we're below a breakpoint */
export function isBelow(breakpoint: keyof typeof BREAKPOINTS): boolean {
  return matchesMedia(mediaQuery(breakpoint, "max"));
}

/** Convert hex color to RGB */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  return {
    r: parseInt(result[1]!, 16),
    g: parseInt(result[2]!, 16),
    b: parseInt(result[3]!, 16),
  };
}

/** Convert RGB to hex */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Parse any CSS color to RGB components */
export function parseColor(color: string): { r: number; g: number; b: number; a?: number } | null {
  // Hex
  if (color.startsWith("#")) {
    const rgb = hexToRgb(color);
    if (!rgb) return null;

    // Handle #rgba
    if (color.length === 9) {
      const alpha = parseInt(color.slice(7), 16) / 255;
      return { ...rgb, a: alpha };
    }

    return rgb;
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const result = {
      r: parseInt(rgbMatch[1]!, 10),
      g: parseInt(rgbMatch[2]!, 10),
      b: parseInt(rgbMatch[3]!, 10),
    };

    if (rgbMatch[4]) {
      return { ...result, a: parseFloat(rgbMatch[4]!) };
    }

    return result;
  }

  // Named colors — limited set
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    black: { r: 0, g: 0, b: 0 },
    white: { r: 255, g: 255, b: 255 },
    red: { r: 255, g: 0, b: 0 },
    green: { r: 0, g: 128, b: 0 },
    blue: { r: 0, g: 0, b: 255 },
    transparent: { r: 0, g: 0, b: 0 },
  };

  const lowered = color.toLowerCase();
  if (namedColors[lowered]) {
    return namedColors[lowered];
  }

  return null;
}

/** Mix two colors together */
export function mixColors(
  color1: string,
  color2: string,
  weight = 0.5,
): string | null {
  const c1 = parseColor(color1);
  const c2 = parseColor(color2);

  if (!c1 || !c2) return null;

  const w2 = 1 - weight;

  const r = Math.round(c1.r * weight + c2.r * w2);
  const g = Math.round(c1.g * weight + c2.g * w2);
  const b = Math.round(c1.b * weight + c2.b * w2);

  return rgbToHex(r, g, b);
}

/** Make a color transparent by adding alpha */
export function transparentize(color: string, amount: number): string | null {
  const parsed = parseColor(color);
  if (!parsed) return null;

  const alpha = Math.max(0, Math.min(1, 1 - amount));

  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
}

/** Lighten a color by a percentage (0-1) */
export function lightenColor(color: string, amount: number): string | null {
  const parsed = parseColor(color);
  if (!parsed) return null;

  const factor = 1 + amount;

  const r = Math.min(255, Math.round(parsed.r + (255 - parsed.r) * amount));
  const g = Math.min(255, Math.round(parsed.g + (255 - parsed.g) * amount));
  const b = Math.min(255, Math.round(parsed.b + (255 - parsed.b) * amount));

  return rgbToHex(r, g, b);
}

/** Darken a color by a percentage (0-1) */
export function darkenColor(color: string, amount: number): string | null {
  const parsed = parseColor(color);
  if (!parsed) return null;

  const r = Math.max(0, Math.round(parsed.r * (1 - amount)));
  const g = Math.max(0, Math.round(parsed.g * (1 - amount)));
  const b = Math.max(0, Math.round(parsed.b * (1 - amount)));

  return rgbToHex(r, g, b);
}
