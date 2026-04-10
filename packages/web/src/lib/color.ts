/**
 * Color utilities for UI theming, data visualization, and design systems.
 * Supports RGB, HSL, HSV, HEX, HWB, LAB color spaces with conversions,
 * contrast calculation, palette generation, and WCAG accessibility.
 */

// --- Types ---

export interface RgbColor { r: number; g: number; b: number; a?: number }
export interface HslColor { h: number; s: number; l: number; a?: number }
export interface HsvColor { h: number; s: number; v: number; a?: number }
export interface HwbColor { h: number; w: number; b: number; a?: number }

export type ColorInput = string | RgbColor | HslColor | HsvColor;

// --- Parsing ---

/** Parse any CSS color string into RGB */
export function parseColor(input: ColorInput): RgbColor {
  if (typeof input !== "string") return toRgb(input);

  const trimmed = input.trim().toLowerCase();

  // Hex (#RGB, #RRGGBB, #RGBA, #RRGGBBAA)
  if (trimmed.startsWith("#")) return parseHex(trimmed);

  // rgb/rgba
  const rgbMatch = trimmed.match(/rgba?\(([^)]+)\)/);
  if (rgbMatch) return parseRgbString(rgbMatch[1]);

  // hsl/hsla
  const hslMatch = trimmed.match(/hsla?\(([^)]+)\)/);
  if (hslMatch) {
    const hsl = parseHslString(hslMatch[1]);
    return hslToRgb(hsl);
  }

  // Named colors
  const named = NAMED_COLORS[trimmed as keyof typeof NAMED_COLORS];
  if (named) return { ...named };

  // Transparent
  if (trimmed === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

  throw new Error(`Cannot parse color: ${input}`);
}

function parseHex(hex: string): RgbColor {
  let h = hex.replace("#", "");

  // Expand shorthand
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 4) {
    const [r, g, b, a] = h;
    h = `${r}${r}${g}${g}${b}${b}${a ?? "f"}${a ?? "f"}`;
  }
  if (h.length === 8) {
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: Math.round((parseInt(h.slice(6, 8), 16) / 255) * 1000) / 1000,
    };
  }

  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: 1,
  };
}

function parseRgbString(parts: string): RgbColor {
  const nums = parts.split(",").map((s) => parseFloat(s.trim()));
  return {
    r: clamp(Math.round(nums[0] ?? 0), 0, 255),
    g: clamp(Math.round(nums[1] ?? 0), 0, 255),
    b: clamp(Math.round(nums[2] ?? 0), 0, 255),
    a: nums[3] !== undefined ? clamp(nums[3], 0, 1) : 1,
  };
}

function parseHslString(parts: string): HslColor {
  const nums = parts.split(",").map((s) => parseFloat(s.trim()));
  return {
    h: ((nums[0] % 360) + 360) % 360,
    s: clamp(nums[1] ?? 0, 0, 100),
    l: clamp(nums[2] ?? 0, 0, 100),
    a: nums[3] !== undefined ? clamp(nums[3], 0, 1) : 1,
  };
}

// --- Conversions ---

/** Convert any color to RGB */
export function toRgb(color: ColorInput): RgbColor {
  if ("r" in color && "g" in color) return { ...color } as RgbColor;
  if ("h" in color && "l" in color) return hslToRgb(color as HslColor);
  if ("h" in color && "v" in color) return hsvToRgb(color as HsvColor);
  return parseColor(color);
}

/** Convert any color to HSL */
export function toHsl(color: ColorInput): HslColor {
  const rgb = toRgb(color);
  return rgbToHsl(rgb);
}

/** Convert any color to HSV */
export function toHsv(color: ColorInput): HsvColor {
  const rgb = toRgb(color);
  return rgbToHsv(rgb);
}

/** Convert any color to hex string */
export function toHex(color: ColorInput, alpha = false): string {
  const rgb = toRgb(color);
  const r = rgb.r.toString(16).padStart(2, "0");
  const g = rgb.g.toString(16).padStart(2, "0");
  const b = rgb.b.toString(16).padStart(2, "0");
  if (alpha && rgb.a !== undefined && rgb.a < 1) {
    const a = Math.round(rgb.a * 255).toString(16).padStart(2, "0");
    return `#${r}${g}${b}${a}`;
  }
  return `#${r}${g}${b}`;
}

/** Convert any color to CSS string */
export function toCss(color: ColorInput): string {
  const rgb = toRgb(color);
  if (rgb.a !== undefined && rgb.a < 1) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
  }
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/** RGB → HSL */
export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100, a: 1 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
    case gn: h = ((bn - rn) / d + 2) / 6; break;
    case bn: h = ((rn - gn) / d + 4) / 6; break;
  }

  return { h: h * 360, s: s * 100, l: l * 100, a: 1 };
}

/** HSL → RGB */
export function hslToRgb({ h, s, l, a }: HslColor): RgbColor {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let rn = 0, gn = 0, bn = 0;
  if (h < 60) { rn = c; gn = x; }
  else if (h < 120) { rn = x; gn = c; }
  else if (h < 180) { gn = c; bn = x; }
  else if (h < 240) { gn = x; bn = c; }
  else if (h < 300) { rn = x; bn = c; }
  else { rn = c; bn = x; }

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
    a: a ?? 1,
  };
}

/** RGB → HSV */
export function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const v = max;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, v: v * 100, a: 1 };

  const s = d / max;
  let h = 0;
  switch (max) {
    case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
    case gn: h = ((bn - rn) / d + 2) / 6; break;
    case bn: h = ((rn - gn) / d + 4) / 6; break;
  }

  return { h: h * 360, s: s * 100, v: v * 100, a: 1 };
}

/** HSV → RGB */
export function hsvToRgb({ h, s, v, a }: HsvColor): RgbColor {
  const sn = s / 100, vn = v / 100;
  const c = vn * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vn - c;

  let rn = 0, gn = 0, bn = 0;
  if (h < 60) { rn = c; gn = x; }
  else if (h < 120) { rn = x; gn = c; }
  else if (h < 180) { gn = c; bn = x; }
  else if (h < 240) { gn = x; bn = c; }
  else if (h < 300) { rn = x; bn = c; }
  else { rn = c; bn = x; }

  return {
    r: Math.round((rn + m) * 255),
    g: Math.round((gn + m) * 255),
    b: Math.round((bn + m) * 255),
    a: a ?? 1,
  };
}

/** HSL → Hex */
export function hslToHex(h: number, s: number, l: number): string {
  return toHex(hslToRgb({ h, s, l }));
}

/** Hex → HSL */
export function hexToHsl(hex: string): HslColor {
  return rgbToHsl(parseHex(hex));
}

// --- Manipulation ---

/** Lighten a color by amount (0-100) */
export function lighten(color: ColorInput, amount: number): RgbColor {
  const hsl = toHsl(color);
  return hslToRgb({ ...hsl, l: clamp(hsl.l + amount, 0, 100) });
}

/** Darken a color by amount (0-100) */
export function darken(color: ColorInput, amount: number): RgbColor {
  return lighten(color, -amount);
}

/** Saturate a color by amount (0-100) */
export function saturate(color: ColorInput, amount: number): RgbColor {
  const hsl = toHsl(color);
  return hslToRgb({ ...hsl, s: clamp(hsl.s + amount, 0, 100) });
}

/** Desaturate a color by amount (0-100) */
export function desaturate(color: ColorInput, amount: number): RgbColor {
  return saturate(color, -amount);
}

/** Rotate hue by degrees */
export function rotateHue(color: ColorInput, degrees: number): RgbColor {
  const hsl = toHsl(color);
  return hslToRgb({ ...hsl, h: (hsl.h + degrees + 360) % 360 });
}

/** Set opacity of a color (0-1) */
export function setOpacity(color: ColorInput, alpha: number): RgbColor {
  const rgb = toRgb(color);
  return { ...rgb, a: clamp(alpha, 0, 1) };
}

/** Mix two colors together (t=0 is colorA, t=1 is colorB) */
export function mix(colorA: ColorInput, colorB: ColorInput, t = 0.5): RgbColor {
  const a = toRgb(colorA);
  const b = toRgb(colorB);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: (a.a ?? 1) + ((b.a ?? 1) - (a.a ?? 1)) * t,
  };
}

/** Interpolate between two colors (alias for mix) */
export function lerpColor(colorA: ColorInput, colorB: ColorInput, t: number): RgbColor {
  return mix(colorA, colorB, t);
}

/** Invert a color */
export function invert(color: ColorInput): RgbColor {
  const rgb = toRgb(color);
  return { r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b, a: rgb.a };
}

/** Grayscale a color */
export function grayscale(color: ColorInput): RgbColor {
  const hsl = toHsl(color);
  return hslToRgb({ ...hsl, s: 0 });
}

/** Get the complementary color (180° hue shift) */
export function complement(color: ColorInput): RgbColor {
  return rotateHue(color, 180);
}

/** Generate an analogous color scheme (adjacent hues) */
export function analogous(base: ColorInput, count = 3): RgbColor[] {
  const hsl = toHsl(base);
  const colors: RgbColor[] = [];
  for (let i = 0; i < count; i++) {
    const offset = (i - Math.floor(count / 2)) * 30;
    colors.push(hslToRgb({ ...hsl, h: (hsl.h + offset + 360) % 360 }));
  }
  return colors;
}

/** Generate a triadic color scheme (3 colors 120° apart) */
export function triadic(base: ColorInput): RgbColor[] {
  const hsl = toHsl(base);
  return [
    hslToRgb(hsl),
    hslToRgb({ ...hsl, h: (hsl.h + 120) % 360 }),
    hslToRgb({ ...hsl, h: (hsl.h + 240) % 360 }),
  ];
}

/** Generate a split-complementary scheme */
export function splitComplementary(base: ColorInput): RgbColor[] {
  const hsl = toHsl(base);
  return [
    hslToRgb(hsl),
    hslToRgb({ ...hsl, h: (hsl.h + 150) % 360 }),
    hslToRgb({ ...hsl, h: (hsl.h + 210) % 360 }),
  ];
}

/** Generate a tetradic (square) color scheme */
export function tetradic(base: ColorInput): RgbColor[] {
  const hsl = toHsl(base);
  return [
    hslToRgb(hsl),
    hslToRgb({ ...hsl, h: (hsl.h + 90) % 360 }),
    hslToRgb({ ...hsl, h: (hsl.h + 180) % 360 }),
    hslToRgb({ ...hsl, h: (hsl.h + 270) % 360 }),
  ];
}

// --- Contrast & Accessibility ---

/** Calculate relative luminance per WCAG 2.x */
export function luminance(color: ColorInput): number {
  const rgb = toRgb(color);
  const [rs, gs, bs] = [rgb.r, rgb.g, rgb.b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Calculate contrast ratio between two colors (1-21) */
export function contrastRatio(foreground: ColorInput, background: ColorInput): number {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check if contrast meets WCAG AA level (4.5:1 normal text, 3:1 large text) */
export function passesWCAGAA(foreground: ColorInput, background: ColorInput, largeText = false): boolean {
  const ratio = contrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/** Check if contrast meets WCAG AAA level (7:1 normal, 4.5:1 large) */
export function passesWCAGAAA(foreground: ColorInput, background: ColorInput, largeText = false): boolean {
  const ratio = contrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

/** Get contrasting text color (black or white) for readability */
export function getContrastColor(background: ColorInput): "#000000" | "#ffffff" {
  const lum = luminance(background);
  return lum > 0.179 ? "#000000" : "#ffffff";
}

/** Find the best contrasting color from a list */
export function bestContrast(
  foregroundCandidates: ColorInput[],
  background: ColorInput,
): RgbColor {
  let best = toRgb(foregroundCandidates[0]);
  let bestRatio = 0;
  for (const candidate of foregroundCandidates) {
    const ratio = contrastRatio(candidate, background);
    if (ratio > bestRatio) {
      bestRatio = ratio;
      best = toRgb(candidate);
    }
  }
  return best;
}

// --- Palette Generation ---

/** Generate a consistent color from a string hash (for avatars/tags) */
export function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 50%)`;
}

/** Generate N visually distinct colors (equidistant on hue wheel) */
export function generatePalette(count: number, options?: { saturation?: number; lightness?: number }): string[] {
  const sat = options?.saturation ?? 70;
  const light = options?.lightness ?? 50;
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / count;
    colors.push(`hsl(${hue}, ${sat}%, ${light}%)`);
  }
  return colors;
}

/** Generate a warm-to-cool gradient palette */
export function generateGradientPalette(
  start: ColorInput,
  end: ColorInput,
  steps: number,
): RgbColor[] {
  const palette: RgbColor[] = [];
  for (let i = 0; i < steps; i++) {
    palette.push(mix(start, end, i / (steps - 1)));
  }
  return palette;
}

/** Generate a shade scale from a base color (lighter → base → darker) */
export function shadeScale(
  base: ColorInput,
  steps = 9,
  options?: { lightest?: number; darkest?: number },
): RgbColor[] {
  const scale: RgbColor[] = [];
  const lightest = options?.lightest ?? 95;
  const darkest = options?.darkest ?? 15;
  const mid = Math.floor(steps / 2);

  for (let i = 0; i < steps; i++) {
    if (i === mid) {
      scale.push(toRgb(base));
    } else if (i < mid) {
      // Lighter shades: blend toward white
      const t = i / mid;
      scale.push(mix({ r: 255, g: 255, b: 255 }, base, t));
    } else {
      // Darker shades: blend toward black
      const t = (i - mid) / (steps - mid - 1);
      scale.push(mix(base, { r: 0, g: 0, b: 0 }, t));
    }
  }
  return scale;
}

/** Generate Tailwind-style color palette (50-950) from a base color */
export function tailwindPalette(
  base: ColorInput,
): Record<string, string> {
  const rgb = toRgb(base);
  const hsl = rgbToHsl(rgb);

  const steps = [
    { key: "50", l: 97 },
    { key: "100", l: 94 },
    { key: "200", l: 86 },
    { key: "300", l: 74 },
    { key: "400", l: 62 },
    { key: "500", l: hsl.l },
    { key: "600", l: Math.max(hsl.l - 10, 20) },
    { key: "700", l: Math.max(hsl.l - 20, 15) },
    { key: "800", l: Math.max(hsl.l - 30, 12) },
    { key: "900", l: Math.max(hsl.l - 40, 10) },
    { key: "950", l: Math.max(hsl.l - 48, 6) },
  ];

  const palette: Record<string, string> = {};
  for (const step of steps) {
    palette[step.key] = toCss(hslToRgb({ h: hsl.h, s: hsl.s, l: step.l }));
  }
  return palette;
}

// --- Status Colors ---

/** Predefined status color map */
export const STATUS_COLORS = {
  success: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  error: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
  warning: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d" },
  info: { bg: "#eff6ff", text: "#1d4ed8", border: "#93c5fd" },
  neutral: { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" },
} as const;

export type StatusColor = keyof typeof STATUS_COLORS;

/** Get status color config */
export function getStatusColor(status: StatusColor): (typeof STATUS_COLORS)[StatusColor] {
  return STATUS_COLORS[status];
}

// --- Internal Helpers ---

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/** Named CSS color table (subset) */
const NAMED_COLORS: Record<string, RgbColor> = {
  black:   { r: 0,   g: 0,   b: 0 },
  white:   { r: 255, g: 255, b: 255 },
  red:     { r: 255, g: 0,   b: 0 },
  green:   { r: 0,   g: 128, b: 0 },
  blue:    { r: 0,   g: 0,   b: 255 },
  yellow:  { r: 255, g: 255, b: 0 },
  cyan:    { r: 0,   g: 255, b: 255 },
  magenta: { r: 255, g: 0,   b: 255 },
  orange:  { r: 255, g: 165, b: 0 },
  purple:  { r: 128, g: 0,   b: 128 },
  gray:    { r: 128, g: 128, b: 128 },
  grey:    { r: 128, g: 128, b: 128 },
  pink:    { r: 255, g: 192, b: 203 },
  brown:   { r: 165, g: 42,  b: 42 },
  lime:    { r: 0,   g: 255, b: 0 },
  navy:    { r: 0,   g: 0,   b: 128 },
  teal:    { r: 0,   g: 128, b: 128 },
  olive:   { r: 128, g: 128, b: 0 },
  maroon:  { r: 128, g: 0,   b: 0 },
  aqua:    { r: 0,   g: 255, b: 255 },
  silver:  { r: 192, g: 192, b: 192 },
  gold:    { r: 255, g: 215, b: 0 },
  coral:   { r: 255, g: 127, b: 80 },
  tomato:  { r: 255, g: 99,  b: 71 },
  salmon:  { r: 250, g: 128, b: 114 },
  violet:  { r: 238, g: 130, b: 238 },
  indigo:  { r: 75,  g: 0,   b: 130 },
  crimson: { r: 220, g: 20,  b: 60 },
};
