/**
 * Color utilities for UI theming and data visualization.
 */

/** Generate a consistent color from a string (hash-based) */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${Math.abs(h)}, 70%, 50%)`;
}

/** Generate a palette of N distinct colors */
export function generatePalette(count: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / count;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
}

/** HSL to Hex conversion */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Lighten a hex color by percentage */
export function lighten(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = clamp((num >> 16) + amt, 0, 255);
  const G = clamp(((num >> 8) & 0x00ff) + amt, 0, 255);
  const B = clamp((num & 0x0000ff) + amt, 0, 255);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/** Darken a hex color by percentage */
export function darken(hex: string, percent: number): string {
  return lighten(hex, -percent);
}

/** Get contrasting text color (black or white) for a background */
export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/** Interpolate between two hex colors (t: 0-1) */
export function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = parseInt(colorA.replace("#", ""), 16);
  const b = parseInt(colorB.replace("#", ""), 16);
  const R = Math.round((a >> 16) * (1 - t) + (b >> 16) * t);
  const G = Math.round((((a >> 8) & 0x00ff) * (1 - t) + ((b >> 8) & 0x00ff) * t));
  const B = Math.round(((a & 0x0000ff) * (1 - t) + (b & 0x0000ff) * t));
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/** Internal clamp helper */
function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/** Predefined status color map */
export const STATUS_COLORS = {
  success: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  error: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
  warning: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d" },
  info: { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  neutral: { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
} as const;

/** Status color type */
export type StatusColor = keyof typeof STATUS_COLORS;
