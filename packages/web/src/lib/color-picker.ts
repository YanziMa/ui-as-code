/**
 * Color picker utilities: palette generation, color harmony, contrast checking.
 */

export interface RgbColor { r: number; g: number; b: number; a?: number }
export interface HslColor { h: number; s: number; l: number; a?: number }

/** Convert hex to RGB */
export function hexToRgb(hex: string): RgbColor | null {
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

/** Convert RGB to HSL */
export function rgbToHsl(r: number, g: number, b: number): HslColor {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6; break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** Convert HSL to RGB */
export function hslToRgb(h: number, s: number, l: number): RgbColor {
  h /= 360; s /= 100; l /= 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

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
  };
}

/** Convert HSL to hex string */
export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

/** Parse any color format to RGB */
export function parseColor(color: string): RgbColor | null {
  // Hex
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0], 16);
      const g = parseInt(hex[1]! + hex[1], 16);
      const b = parseInt(hex[2]! + hex[2], 16);
      return { r, g, b };
    }
    return hexToRgb(color);
  }

  // RGB
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]!, 10),
      g: parseInt(rgbMatch[2]!, 10),
      b: parseInt(rgbMatch[3]!, 10),
    };
  }

  // HSL
  const hslMatch = color.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
  if (hslMatch) {
    return hslToRgb(
      parseInt(hslMatch[1]!, 10),
      parseInt(hslMatch[2]!, 10),
      parseInt(hslMatch[3]!, 10),
    );
  }

  // Named colors
  const named = NAMED_COLORS[color.toLowerCase()];
  if (named) return hexToRgb(named);

  return null;
}

/** Calculate relative luminance per WCAG 2.0 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Calculate contrast ratio between two colors */
export function getContrastRatio(color1: RgbColor, color2: RgbColor): number {
  const lum1 = getLuminance(color1.r, color1.g, color1.b);
  const lum2 = getLuminance(color2.r, color2.g, color2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check WCAG compliance level */
export function getWcagLevel(ratio: number): "AAA" | "AA" | "AA-large" | "fail" {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA-large";
  return "fail";
}

/** Get contrasting text color (black or white) */
export function getContrastingText(bgHex: string): string {
  const rgb = parseColor(bgHex);
  if (!rgb) return "#000000";
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const ratioWhite = getContrastRatio(rgb, white);
  const ratioBlack = getContrastRatio(rgb, black);
  return ratioWhite >= ratioBlack ? "#ffffff" : "#000000";
}

// --- Color Harmony ---

/** Generate complementary color */
export function complementary(hex: string): string {
  const hsl = parseToHsl(hex);
  if (!hsl) return hex;
  return hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l);
}

/** Generate analogous colors (adjacent on wheel) */
export function analogous(hex: string, count = 3): string[] {
  const hsl = parseToHsl(hex);
  if (!hsl) return [hex];
  const step = 30;
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(hslToHex((hsl.h + (i - Math.floor(count / 2)) * step + 360) % 360, hsl.s, hsl.l));
  }
  return colors;
}

/** Generate triadic colors (120° apart) */
export function triadic(hex: string): string[] {
  const hsl = parseToHsl(hex);
  if (!hsl) return [hex];
  return [
    hslToHex(hsl.h, hsl.s, hsl.l),
    hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
  ];
}

/** Generate split-complementary colors */
export function splitComplementary(hex: string): string[] {
  const hsl = parseToHsl(hex);
  if (!hsl) return [hex];
  return [
    hslToHex(hsl.h, hsl.s, hsl.l),
    hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l),
  ];
}

/** Generate tetradic (square) colors */
export function tetradic(hex: string): string[] {
  const hsl = parseToHsl(hex);
  if (!hsl) return [hex];
  return [
    hslToHex(hsl.h, hsl.s, hsl.l),
    hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l),
    hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
    hslToHex((hsl270) % 360, hsl.s, hsl.l),
  ];
}

/** Generate monochromatic palette */
export function monochromatic(hex: string, steps = 5): string[] {
  const hsl = parseToHsl(hex);
  if (!hsl) return [hex];
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const l = 10 + (90 / (steps - 1)) * i;
    colors.push(hslToHex(hsl.h, hsl.s, l));
  }
  return colors;
}

/** Generate a full palette with shades, tints, and tones */
export function generatePaletteAdvanced(baseColor: string): Palette {
  const hsl = parseToHsl(baseColor);
  if (!hsl) return defaultPalette();

  const shades = Array.from({ length: 9 }, (_, i) =>
    hslToHex(hsl.h, hsl.s, 5 + i * 11)
  );

  const tints = Array.from({ length: 9 }, (_, i) =>
    hslToHex(hsl.h, hsl.s * (1 - i * 0.1), hsl.l + i * 8)
  );

  const tones = Array.from({ length: 7 }, (_, i) =>
    hslToHex(hsl.h, hsl.s * (1 - i * 0.14), hsl.l)
  );

  return {
    base: baseColor,
    light: hslToHex(hsl.h, hsl.s, Math.min(95, hsl.l + 25)),
    dark: hslToHex(hsl.h, hsl.s, Math.max(5, hsl.l - 20)),
    complementary: complementary(baseColor),
    triadic: triadic(baseColor),
    analogous: analogous(baseColor, 5),
    shades,
    tints,
    tones,
  };
}

export interface Palette {
  base: string;
  light: string;
  dark: string;
  complementary: string;
  triadic: string[];
  analogous: string[];
  shades: string[];
  tints: string[];
  tones: string[];
}

function defaultPalette(): Palette {
  return {
    base: "#6366f1",
    light: "#818cf8",
    dark: "#4338ca",
    complementary: "#f59e0b",
    triadic: ["#6366f1", "#10b981", "#f59e0b"],
    analogous: ["#6366f1", "#8b5cf6", "#a78bfa", "#ec4899", "#f43f5e"],
    shades: ["#1e1b4b", "#312e81", "#3730a3", "#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"],
    tints: [],
    tones: [],
  };
}

// --- Color Temperature & Mood ---

/** Estimate color temperature of a hex color */
export function getColorTemperature(hex: string): "warm" | "cool" | "neutral" {
  const rgb = parseColor(hex);
  if (!rgb) return "neutral";

  const { r, g, b } = rgb;
  if (r > b && r > g * 0.95) return "warm";
  if (b > r && b > g * 0.9) return "cool";
  return "neutral";
}

/** Blend two colors by a given ratio (0-1) */
export function blendColors(hex1: string, hex2: string, ratio = 0.5): string {
  const c1 = parseColor(hex1);
  const c2 = parseColor(hex2);
  if (!c1 || !c2) return hex1;

  const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

  return rgbToHex(
    Math.max(0, Math.min(255, r)),
    Math.max(0, Math.min(255, g)),
    Math.max(0, Math.min(255, b)),
  );
}

/** Lighten a color by amount (0-100) */
export function lightenColor(hex: string, amount = 10): string {
  const hsl = parseToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + amount));
}

/** Darken a color by amount (0-100) */
export function darkenColor(hex: string, amount = 10): string {
  const hsl = parseToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - amount));
}

/** Saturate/desaturate a color */
export function saturateColor(hex: string, amount = 10): string {
  const hsl = parseToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, Math.min(100, hsl.s + amount), hsl.l);
}

/** Desaturate a color */
export function desaturateColor(hex: string, amount = 10): string {
  const hsl = parseToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h, Math.max(0, hsl.s - amount), hsl.l);
}

/** Invert a color */
export function invertColor(hex: string): string {
  const rgb = parseColor(hex);
  if (!rgb) return hex;
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

/** Get opacity-adjusted version as rgba string */
export function withOpacity(hex: string, alpha: number): string {
  const rgb = parseColor(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

// --- Helpers ---

function parseToHsl(hex: string): HslColor | null {
  const rgb = parseColor(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/** Common named colors */
const NAMED_COLORS: Record<string, string> = {
  red: "#ff0000", green: "#00ff00", blue: "#0000ff",
  yellow: "#ffff00", cyan: "#00ffff", magenta: "#ff00ff",
  white: "#ffffff", black: "#000000",
  gray: "#808080", grey: "#808080",
  orange: "#ffa500", purple: "#800080", pink: "#ffc0cb",
  brown: "#a52a2a", olive: "#808000", navy: "#000080",
  teal: "#008080", maroon: "#800000", lime: "#00ff00",
  aqua: "#00ffff", fuchsia: "#ff00ff", silver: "#c0c0c0",
  indigo: "#4b0082", violet: "#ee82ee", turquoise: "#40e0d0",
  coral: "#ff7f50", salmon: "#fa8072", khaki: "#f0e68c",
  lavender: "#e6e6fa", plum: "#dda0dd", tan: "#d2b48c",
  skyblue: "#87ceeb", steelblue: "#4682b4", tomato: "#ff6347",
  gold: "#ffd700", ivory: "#fffff0", beige: "#f5f5dc",
};
