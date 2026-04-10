/**
 * CSS utility functions for dynamic style generation.
 */

/** Generate CSS custom property value */
export function cssVar(name: string, fallback?: string): string {
  return fallback ? `var(--${name}, ${fallback})` : `var(--${name})`;
}

/** Set a CSS custom property on an element */
export function setCssVar(el: HTMLElement, name: string, value: string): void {
  el.style.setProperty(`--${name}`, value);
}

/** Generate responsive breakpoint media query string */
export function breakpoint(min?: string, max?: string): string {
  const parts: string[] = [];
  if (min) parts.push(`(min-width: ${min})`);
  if (max) parts.push(`(max-width: ${max})`);
  return parts.join(" and ");
}

/** Common breakpoints */
export const BREAKPOINTS = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

/** Convert hex to RGB components */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

/** Convert RGB to hex */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Parse CSS color to RGB (supports named colors, hex, rgb(), hsl()) */
export function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  // Hex
  const hexMatch = color.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})?$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
      a: hexMatch[4] ? parseInt(hexMatch[4], 16) / 255 : 1,
    };
  }

  // Short hex
  const shortHex = color.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i);
  if (shortHex) {
    return {
      r: parseInt(shortHex[1] + shortHex[1], 16),
      g: parseInt(shortHex[2] + shortHex[2], 16),
      b: parseInt(shortHex[3] + shortHex[3], 16),
      a: 1,
    };
  }

  // rgb()/rgba()
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  return null;
}

/** Mix two colors by ratio (0 = colorA, 1 = colorB) */
export function mixColors(colorA: string, colorB: string, ratio: number = 0.5): string {
  const a = parseColor(colorA);
  const b = parseColor(colorB);
  if (!a || !b) return colorA;

  const r = Math.round(a.r + (b.r - a.r) * ratio);
  const g = Math.round(a.g + (b.g - a.g) * ratio);
  const bl = Math.round(a.b + (b.b - a.b) * ratio);
  const al = a.a + (b.a - a.a) * ratio;

  return al < 1 ? `rgba(${r}, ${g}, ${bl}, ${al.toFixed(2)})` : `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

/** Make a color transparent (for overlays etc.) */
export function transparentize(color: string, alpha: number): string {
  const parsed = parseColor(color);
  if (!parsed) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha.toFixed(2)})`;
}
