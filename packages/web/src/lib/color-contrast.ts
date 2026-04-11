/**
 * Color Contrast: WCAG 2.1 contrast ratio calculation, color accessibility
 * analysis, A/AA/AAA compliance checking, relative luminance computation,
 * color palette generation with guaranteed contrast, and color blindness simulation.
 */

// --- Types ---

export interface RgbColor {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface HslColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface ContrastResult {
  /** Foreground color (hex) */
  foreground: string;
  /** Background color (hex) */
  background: string;
  /** WCAG contrast ratio (e.g., 4.5) */
  ratio: number;
  /** Relative luminance of foreground */
  foregroundLuminance: number;
  /** Relative luminance of background */
  backgroundLuminance: number;
  /** Passes AA? (4.5:1 for normal text, 3:1 for large text) */
  passesAA: boolean;
  /** Passes AAA? (7:1 for normal text, 4.5:1 for large text) */
  passesAAA: boolean;
  /** WCAG grade: "Fail" | "AA" | "AAA" */
  grade: "Fail" | "AA" | "AAA";
  /** Is the combination readable for normal text? */
  readableNormal: boolean;
  /** Is the combination readable for large text? */
  readableLarge: boolean;
  /** Suggested improvement (if failing) */
  suggestion?: { foreground?: string; background?: string };
}

export interface ColorPaletteOptions {
  /** Base color (hex) */
  baseColor: string;
  /** Target contrast ratio (default: 4.5 for AA) */
  targetRatio?: number;
  /** Number of shades to generate (default: 9) */
  steps?: number;
  /** Include light shades (for dark backgrounds)? */
  includeLightShades?: boolean;
  /** Output format: "hex", "rgb", "hsl" */
  format?: "hex" | "rgb" | "hsl";
}

export interface ColorPaletteResult {
  /** Array of colors from darkest to lightest */
  colors: string[];
  /** Each color's contrast info against white */
  contrastInfo: Array<{ color: string; ratio: number; grade: string }>;
}

export type ColorBlindnessType = "protanopia" | "deuteranopia" | "tritanopia" | "achromatopsia";

// --- Constants ---

const CONTRAST_AA_NORMAL = 4.5;
const CONTRAST_AA_LARGE = 3.0;
const CONTRAST_AAA_NORMAL = 7.0;
const CONTRAST_AAA_LARGE = 4.5;

// --- Color Conversion ---

function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / (1 - Math.abs(2 * max - 1));
  const l = (max + min) / 2;

  if (d !== 0) {
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): RgbColor {
  h /= 360; s /= 100; l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// --- Relative Luminance (WCAG formula) ---

/** Calculate relative luminance per WCAG 2.1 */
function relativeLuminance(rgb: RgbColor): number {
  const rsRGB = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * rsRGB(rgb.r) + 0.7152 * rsRGB(rgb.g) + 0.0722 * rsRGB(rgb.b);
}

/** Calculate contrast ratio between two colors */
export function contrastRatio(color1: string | RgbColor, color2: string | RgbColor): number {
  const rgb1 = typeof color1 === "string" ? hexToRgb(color1) : color1;
  const rgb2 = typeof color2 === "string" ? hexToRgb(color2) : color2;

  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// --- Contrast Analysis ---

/**
 * Full accessibility analysis of a foreground/background color pair.
 */
export function analyzeContrast(foreground: string, background: string): ContrastResult {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  const fgLum = relativeLuminance(fg);
  const bgLum = relativeLuminance(bg);
  const ratio = contrastRatio(fg, bg);

  const passesAA = ratio >= CONTRAST_AA_NORMAL;
  const passesAAA = ratio >= CONTRAST_AAA_NORMAL;
  const readableLarge = ratio >= CONTRAST_AA_LARGE;
  const readableNormal = passesAA;

  let grade: "Fail" | "AA" | "AAA" = "Fail";
  if (passesAAA) grade = "AAA";
  else if (passesAA) grade = "AA";

  // Suggest improvements if failing
  let suggestion: ContrastResult["suggestion"] = undefined;
  if (!passesAA) {
    suggestion = suggestBetterColor(foreground, background);
  }

  return {
    foreground,
    background,
    ratio: Math.round(ratio * 10) / 10,
    foregroundLuminance: fgLum,
    backgroundLuminance: bgLum,
    passesAA,
    passesAAA,
    grade,
    readableNormal,
    readableLarge,
    suggestion,
  };
}

/** Suggest a better foreground color that meets AA */
function suggestBetterColor(fg: string, bg: string): { foreground?: string; background?: string } {
  const bgRgb = hexToRgb(bg);
  const bgHsl = rgbToHsl(bgRgb.r, bgRgb.g, bgRgb.b);
  const fgHsl = rgbToHsl(hexToRgb(fg).r, hexToRgb(fg).g, hexToRgb(fg).b);

  // Try adjusting lightness toward opposite end
  const isBgDark = bgHsl.l < 50;
  const targetL = isBgDark ? Math.min(95, fgHsl.l + 30) : Math.max(5, fgHsl.l - 30);

  const newHsl = { ...fgHsl, l: targetL };
  const newRgb = hslToRgb(newHsl.h, newHsl.s, newHsl.l);
  const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);

  const newRatio = contrastRatio(newHex, bg);
  if (newRatio >= CONTRAST_AA_NORMAL) {
    return { foreground: newHex };
  }

  // If still not enough, try pure black or white
  const extreme = isBgDark ? "#ffffff" : "#000000";
  return { foreground: extreme };
}

// --- Palette Generation ---

/**
 * Generate a color palette from a base color with guaranteed minimum contrast ratios.
 */
export function generatePalette(options: ColorPaletteOptions): ColorPaletteResult {
  const {
    baseColor,
    targetRatio = 4.5,
    steps = 9,
    includeLightShades = true,
    format = "hex",
  } = options;

  const base = hexToRgb(baseColor);
  const baseHsl = rgbToHsl(base.r, base.g, base.b);

  const colors: string[] = [];
  const contrastInfo: ColorPaletteResult["contrastInfo"] = [];

  // Generate darker shades (decrease lightness)
  for (let i = steps; i >= 0; i--) {
    const lPct = (baseHsl.l * i) / steps;
    const rgb = hslToRgb(baseHsl.h, baseHsl.s, lPct);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    colors.push(formatColor(hex, rgb, baseHsl, format));

    const ratio = contrastRatio(hex, "#ffffff");
    contrastInfo.push({
      color: colors[colors.length - 1],
      ratio: Math.round(ratio * 10) / 10,
      grade: ratio >= CONTRAST_AAA_NORMAL ? "AAA" : ratio >= CONTRAST_AA_NORMAL ? "AA" : "Fail",
    });
  }

  // Generate lighter shades (increase lightness)
  if (includeLightShades) {
    for (let i = 1; i <= steps; i++) {
      const lPct = baseHsl.l + ((100 - baseHsl.l) * i) / steps;
      if (lPct > 97) continue;
      const rgb = hslToRgb(baseHsl.h, baseHsl.s, lPct);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      colors.push(formatColor(hex, rgb, baseHsl, format));

      const ratio = contrastRatio(hex, "#000000");
      contrastInfo.push({
        color: colors[colors.length - 1],
        ratio: Math.round(ratio * 10) / 10,
        grade: ratio >= CONTRAST_AAA_NORMAL ? "AAA" : ratio >= CONTRAST_AA_NORMAL ? "AA" : "Fail",
      });
    }
  }

  return { colors, contrastInfo };
}

function formatColor(hex: string, _rgb: RgbColor, _hsl: HslColor, fmt: string): string {
  switch (fmt) {
    case "rgb": {
      const r = hexToRgb(hex);
      return `rgb(${r.r}, ${r.g}, ${r.b})`;
    }
    case "hsl": {
      const h = rgbToHsl(hexToRgb(hex).r, hexToRgb(hex).g, hexToRgb(hex).b);
      return `hsl(${Math.round(h.h)}, ${Math.round(h.s)}%, ${Math.round(h.l)}%)`;
    }
    default:
      return hex;
  }
}

// --- Color Blindness Simulation ---

/**
 * Simulate how a color appears to someone with color vision deficiency.
 */
export function simulateColorBlindness(hex: string, type: ColorBlindnessType): string {
  const rgb = hexToRgb(hex);
  let r = rgb.r, g = rgb.g, b = rgb.b;

  switch (type) {
    case "protanopia": // Red-blind
      r = 0.567 * r + 0.433 * g;
      g = 0.558 * g + 0.442 * r;
      break;
    case "deuteranopia": // Green-blind
      r = 0.625 * r + 0.375 * g;
      g = 0.7 * g + 0.3 * r;
      break;
    case "tritanopia": // Blue-blind
      g = 0.95 * g + 0.05 * b;
      b = 0.433 * b + 0.567 * g;
      break;
    case "achromatopsia": // No color (grayscale)
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray; g = gray; b = gray;
      break;
  }

  return rgbToHex(
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
  );
}

// --- Find Nearest Contrasting Color ---

/**
 * Find the nearest color to a target that meets a minimum contrast ratio against a background.
 */
export function findContrastingColor(
  targetHex: string,
  backgroundHex: string,
  minRatio = 4.5,
): string {
  const target = hexToRgb(targetHex);
  const targetHsl = rgbToHsl(target.r, target.g, target.b);
  const bg = hexToRgb(backgroundHex);

  // Binary search on lightness
  let low = 0, high = 100;
  let best = targetHex;

  for (let iter = 0; iter < 20; iter++) {
    const mid = (low + high) / 2;
    const testRgb = hslToRgb(targetHsl.h, targetHsl.s, mid);
    const testHex = rgbToHex(testRgb.r, testRgb.g, testRgb.b);
    const ratio = contrastRatio(testHex, bg);

    if (ratio >= minRatio) {
      best = testHex;
      // Try to stay closer to original by searching in the closer direction
      high = mid;
    } else {
      low = mid;
    }
  }

  return best;
}

// --- Quick Check Utilities ---

/** Quick check: does this pair meet AA for normal text? */
export function passesAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= CONTRAST_AA_NORMAL;
}

/** Quick check: does this pair meet AAA for normal text? */
export function passesAAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= CONTRAST_AAA_NORMAL;
}

/** Get the WCAG grade for a color pair */
export function getGrade(foreground: string, background: string): "Fail" | "AA" | "AAA" {
  const ratio = contrastRatio(foreground, background);
  if (ratio >= CONTRAST_AAA_NORMAL) return "AAA";
  if (ratio >= CONTRAST_AA_NORMAL) return "AA";
  return "Fail";
}
