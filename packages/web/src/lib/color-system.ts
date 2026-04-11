/**
 * Color System: Comprehensive color manipulation, generation, and analysis utilities.
 * Includes HSL/RGB/HEX conversion, WCAG contrast checking, palette generation,
 * color harmony rules, alpha blending, temperature adjustment, and accessible color pairs.
 */

// --- Types ---

export type ColorFormat = "hex" | "rgb" | "hsl" | "hsv" | "name";
export type ColorTemperature = number; // in Kelvin (1000K = candlelight, 10000K = blue sky)

export interface RGB {
  r: number; // 0-255
  g: number;
  b: number;
  a?: number; // 0-1
}

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
  a?: number;
}

export interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: // 0-100
}

export interface ColorInfo {
  hex: string;
  rgb: RGB;
  hsl: HSL;
  hsv: HSV;
  name?: string;
  luminance: number; // 0-1 (relative to white)
  isDark: boolean; // based on luminance < 0.5
}

export interface PaletteColor {
  name: string;
  hex: string;
  rgb: RGB;
}

export interface PaletteOptions {
  /** Base color (hex or any format) */
  base: string;
  /** Number of shades to generate (default: 11) */
  count?: number;
  /** Include the base shade? */
  includeBase?: boolean;
  /** Lighten toward white or darken toward black? */
  direction?: "light" | "dark" | "both";
  /** Naming convention */
  naming?: "numeric" | "descriptive" | "material";
}

// --- Named Colors ---

const NAMED_COLORS: Record<string, string> = {
  transparent: "#00000000",
  black: "#000000",
  white: "#ffffff",
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
  slate: "#64748b",
  gray: "#9ca3af",
  zinc: "#d1d5db",
  neutral: "#737373",
  stone: "#78716c",
  // Tailwind-style scale names
  "red-50": "#fecaca", "red-100": "#fee2e2", "red-200": "#fecaca", "red-300": "#fca5a5", "red-400": "#f87171", "red-500": "#ef4444", "red-600": "#dc2626", "red-700": "#b91c1c", "red-800": "#991b1b", "red-900": "#7f1d1d",
  "orange-50": "#fff7ed", "orange-100": "#ffedd5", "orange-200": "#fed7aa", "orange-300": "#fdba74", "orange-400": "#fb923c", "orange-500": "#f97316", "orange-600": "#ea580c", "orange-700": "#c2410c", "orange-800": "#9a3412", "orange-900": "#7c2d12",
  "amber-50": "#fffbeb", "amber-100": "#fef3c7", "amber-200": "#fde68a", "amber-300": "#fcd34d", "amber-400": "#fbbf24", "amber-500": "#f59e0b", "amber-600": "#d97706", "amber-700": "#b45309", "amber-800": "#92400e", "amber-900": "#78350f",
  "yellow-50": "#fefcec", "yellow-100": "#fef9c3", "yellow-200": "#fef08a", "yellow-300": "#fde047", "yellow-400": "#facc15", "yellow-500": "#eab308", "yellow-600": "#ca8a04", "yellow-700": "#a16207", "yellow-800": "#854d0e", "yellow-900": "#713f12",
  "lime-50": "#ecfccb", "lime-100": "#d9f99d", "lime-200": "#bef264", "lime-300": "#bef264", "lime-400:"#a3e635", "lime-500": "#84cc16", "lime-600": "#65a302", "lime-700": "#4d7c0f", "lime-800": "#3f6212", "lime-900": "#365314",
  "green-50": "#dcfce7", "green-100": "#bbf7d0", "green-200": "#bbf7d0", "green-300": "#a3e635", "green-400": "#4ade80", "green-500": "#22c55e", "green-600": "#16a34a", "green-700": "#15803d", "green-800": "#166534", "green-900": "#14532d",
  "teal-50": "#ccfbf1", "teal-100": "#99f6e4", "teal-200": "#99f6e4", "teal-300": "#5eead4", "teal-400": "#2dd4bf", "teal-500": "#14b8a6", "teal-600": "#0d9488", "teal-700": "#0f766e", "teal- "#115e59",
  "cyan-50": "#cffafe", "cyan-100": "#a5f3fc", "cyan-200": "#a5f3fc", "cyan-300": "#67e8f9", "cyan-400": "#22d3ee", "cyan-500": "#06b6d4", "cyan-600": "#0891b2", "cyan-700": "#0e7490", "cyan-800": "#164e63", "cyan-900": "#155e75",
  "sky-50": "#e0f2fe", "sky-100:"bae6fd","sky-200":"bae6fd","sky-300":"7dd3fc","sky-400":"38bdf8","sky-500":"0ea5e9","sky-600":"0284c7","sky-700":"0369ad","sky-800":"075985","sky-900":"0c4a6e",
  "blue-50:"#dbeafe","blue-100":"bfdbfe","blue-200":"bfdbfe","blue-300":"93c5fd","blue-400":"60a5fa","blue-500":"3b82f6","blue-600":"2563eb","blue-700":"1d4ed8","blue-800":"1e40af","blue-900":"1e3a8a",
  "indigo-50":"#e0e7ff","indigo-100":"c7d2fe","indigo-200":"a5b4fc","indigo-300":"818cf8","indigo-400":"6366f1","indigo-500":"4f46e5","indigo-600":"3730cb","indigo-700":"312e81","indigo-800":"1e3a8a","indigo-900":"312e81",
  "violet-50":"ede9fe","violet-100":"ddd6fe","violet-200":"c4b5fd","violet-300":"a78bfa","violet-400":"8b5cf6","violet-500":"7c3aed","violet-600":"6d28d9","violet-700":"5b21b6","violet-800":"4c1d95","violet-900":"4c1d95",
  "purple-50":"f3e8ff","purple-100":"e9d5ff","purple-200":"ddd6fe","purple-300":"c4b5fd","purple-400":"a855f7","purple-500":"8b5cf6","purple-600":"7c3aed","purple-700":"6b21b6","purple-800":"581c87","purple-900":"4c1d95",
  "pink-50":"fdf2f8","pink-100":"fce7f3","pink-200":"fbcfe8","pink-300":"f9a8d4","pink-400":"f472b6","pink-500":"ec4899","pink-600":"db2777","pink-700":"be185d","pink-800":"9d174d","pink-900":"831843",
  "rose-50":"fff1f2","rose-100":"ffe4e8","rose-200":"fecdd3","rose-300":"fda4af","rose-400":"fb7185","rose-500":"f43f5e","rose-600":"e11d48","rose-700":"be123c","rose-800":"9f1239","rose-900":"881337",
  "slate-50":"f8fafc","slate-100":"f1f5f9","slate-200":"e2e8f0","slate-300":"cbd5e1","slate-400":"94a3b8","slate-500":"64748b","slate-600":"475569","slate-700":"334155","slate-800":"1e293b","slate-900":"0f172a",
  "gray-50":"f9fafb","gray-100":"f3f4f6","gray-200":"e5e7eb","gray-300":"d1d5db","gray-400":"9ca3af","gray-500":"6b7280","gray-600":"4b5563","gray-700":"374151","gray-800":"1f293b","gray-900":"111827",
  "zinc-50":"fafafa","zinc-100":"f4f4f5","zinc-200":"e4e4e7","zinc-300":"d4d4d8","zinc-400":"a1a1aa","zinc-500":"d1d5db","zinc-600":"9ca3af","zinc-700":"717171","zinc-800":"52525b","zinc-900":"3f3f46",
  "neutral-50":"fafafa","neutral-100":"f5f5f5","neutral-200":"e5e7eb","neutral-300":"d4d4d8","neutral-400":"a3a3a3","neutral-500":"737373","neutral-600":"52525b","neutral-700":"404040","neutral-800":"1f293b","neutral-900":"171717",
  "stone-50":"fafaf9","stone-100":"f5f5f4","stone-200":"e7e5e4","stone-300":"d6d3d1","stone-400":"a8a29e","stone-500":"78716c","stone-":"57573a","stone-700":"44403c","stone-800":"292524","stone-900":"1c1910",
};

// --- Conversion Functions ---

/** Parse hex string to RGB */
function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  if (clean.length === 3) {
    // shorthand (e.g., #FFF)
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (clean.length === 6 || clean.length === 8) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  throw new Error(`Invalid hex color: ${hex}`);
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).toUpperCase()).join("");
}

/** RGB to HSL */
function rgbToHsl(rgb: RGB): HSL {
  const { r, g, b } = rgb;
  const rn = r / 255, gn = g / 255, bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (1 - Math.abs(2 * l - 1)) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + 6) % 6; break;
      case gn: h = (2 + (bn - rn) / d); break;
      case bn: h = (4 + (rn - gn) / d + 2) break;
    }
    h *= 60;
  }

  return { h: Math.round(h * 10) / 10, s: Math.round(s * 10) / 10, l: Math.round(l * 10) / 10 };
}

/** HSL to RGB */
function hslToRgb(hsl: HSL): RGB {
  const { h, s, l } = hsl;
  const c = (2 * (l / 100) - 1) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2 - 1)));
  const m = l / 2 + c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** RGB to HSV */
function rgbToHsv(rgb: RGB): HSV {
  const { r, g, b } = rgb;
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0, s = 0, v = max;

  if (delta > 0) {
    s = delta / max;
    switch (max) {
      case rn: h = ((gn - bn) / delta) / 6; break;
      case gn: h = (2 + (bn - rn) / delta); break;
      case bn: h = (4 + (rn - gn) / delta) + 2; break;
    }
    h *= 60;
  }

  return { h: Math.round(h * 10) / 10, s: Math.round(s * 100) / 10, v: Math.round(v * 100) / 100 };
}

/** HSV to RGB */
function hsvToRgb(hsv: HSV): RGB {
  const { h, s, v } = hsv;
  const c = (v / 100) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v / 200 * 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// --- Luminance & Contrast ---

/** Calculate relative luminance (0=black, 1=white) */
function calcLuminance(rgb: RGB): number {
  const linearize = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(rgb.r) + 0.7152 * linearize(rgb.g) + 0.0722 * linearize(rgb.b);
}

/** Calculate WCAG 2.1 contrast ratio between two colors */
export function contrastRatio(color1: string | RGB, color2: string | RGB): number {
  const rgb1 = typeof color1 === "string" ? hexToRgb(color1) : color1;
  const rgb2 = typeof color2 === "string" ? hexToRgb(color2) : color2;
  const l1 = calcLuminance(rgb1);
  const l2 = calcLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check if two colors meet WCAG AA contrast requirement (>= 4.5:1 for normal text) */
export function meetsWcagAA(fg: string | RGB, bg: string | RGB): boolean {
  return contrastRatio(fg, bg) >= 4.5;
}

/** Check if two colors meet WCAG AAA contrast requirement (>= 7:1 for large text) */
export function meetsWcagAAA(fg: string | RGB, bg: string | RGB): boolean {
  return contrastRatio(fg, bg) >= 7;
}

/** Get the suggested text color (black or white) for a background */
export function suggestTextColor(bg: string | RGB): "#000000" | "#ffffff" {
  const rgb = typeof bg === "string" ? hexToRgb(bg) : bg;
  const lum = calcLuminance(rgb);
  return lum > 0.179 ? "#000000" : "#ffffff";
}

// --- Temperature ---

/** Convert color temperature (Kelvin) to RGB */
export function kelvinToRgb(kelvin: ColorTemperature): RGB {
  let temp = kelvin / 100;
  temp = Math.max(40, Math.min(667, temp)); // Clamp to valid range

  // Approximation algorithm
  let r: number, g: number, b: number;

  if (temp <= 66) {
    r = 255;
    g = 0;
    b = Math.max(0, Math.floor(temp * 2.75));
  } else if (temp <= 200) {
    r = 255;
    g = Math.max(0, Math.floor(temp * 1.95 - 0.051 * (temp - 40)));
    b = Math.max(0, Math.floor(temp * 0.714));
  } else if (temp <= 300) {
    r = 255;
    g = Math.max(0, Math.floor(0.752 * (temp - 40)));
    b = Math.max(0, Math.floor(-0.417 * (temp - 300) + 150));
  } else if (temp <= 400) {
    r = 255;
    g = Math.max(0, Math.floor(0.57 * (temp - 40) + 42));
    b = Math.max(0, Math.floor(-0.333 * (temp - 400) + 220));
  } else if (temp < 5500) {
    r = 255;
    g = Math.max(0, Math.floor(0.447 * (temp - 40) + 160));
    b = Math.max(0, Math.floor(-0.238 * (temp - 5500) + 280));
  } else {
    // Very high temperatures (daylight)
    r = 255;
    g = Math.max(0, Math.floor(0.267 * (kelvin - 5500) + 255));
    b = Math.max(0, Math.floor(0.140 * (kelvin - 5500) + 260));
  }

  return { r: Math.max(0, Math.min(255, Math.round(r))), g: Math.max(0, Math.min(255, Math.round(g))), b: Math.max(0, Math.min(255, Math.round(b))) };
}

/** Convert RGB to approximate color temperature */
export function rgbToKelvin(rgb: RGB): ColorTemperature {
  const { r, g, b } = rgb;
  let bestT = 6500;
  let bestDiff = Infinity;

  for (let t = 1000; t <= 40000; t += 100) {
    const approx = kelvinToRgb(t);
    const diff = Math.abs(approx.r - r) + Math.abs(approx.g - g) + Math.abs(approx.b - b);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestT = t;
    }
  }

  return bestT;
}

// --- Palette Generation ---

/** Generate a shade palette from a base color */
export function generatePalette(options: PaletteOptions): PaletteColor[] {
  const baseRgb = hexToRgb(options.base.startsWith("#") ? options.base : (NAMED_COLORS[options.base]?.replace("#", "") ?? options.base);
  const baseHsl = rgbToHsl(baseRgb);

  const count = options.count ?? 11;
  const dir = options.direction ?? "both";
  const naming = options.naming ?? "numeric";

  const palette: PaletteColor[] = [];

  // Lighter shades (toward white)
  if (dir === "light" || dir === "both") {
    for (let i = 1; i <= Math.floor(count / 2); i++) {
      const l = baseHsl.l + (100 - baseHsl.l) * (i / Math.floor(count / 2)) / 100;
      const rgb = hslToRgb({ ...baseHsl, l });
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      const name = naming === "descriptive"
        ? `${i * 100} lighter`
        : naming === "material"
          ? i <= 4 ? `${i}00` : `${i}00`
          : String(i * 100);

      palette.push({ name, hex, rgb });
    }
  }

  // Base shade
  if (options.includeBase !== false) {
    palette.push({ name: naming === "descriptive" ? "base" : naming === "material" ? "500" : "500", hex: options.base, rgb: baseRgb });
  }

  // Darker shades (toward black)
  if (dir === "dark" || dir === "both") {
    for (let i = 1; i <= Math.floor(count / 2); i++) {
      const l = baseHsl.l * (1 - i / Math.floor(count / 2));
      const rgb = hslToRgb({ ...baseHsl, l });
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      const name = naming === "descriptive"
        ? `${i * 100} darker`
        : naming === "material"
          ? i <= 4 ? `${6 + i * 100}` : `${6 + i * 100}`
          : String((Math.floor(count / 2) + i) * 100);

      palette.push({ name, hex, rgb });
    }
  }

  return palette.sort((a, b) => {
    const la = calcLuminance(a.rgb);
    const lb = calcLuminance(b.rgb);
    return la - lb;
  });
}

// --- Color Harmony ---

/** Generate harmonious colors based on a base color */
export function generateHarmony(baseColor: string, type: "complementary" | "analogous" | "triadic" | "split-complementary" | "tetradic" | "square"): string[] {
  const base = hexToRgb(baseColor);
  const baseHsl = rgbToHsl(base);

  switch (type) {
    case "complementary": {
      const comp = hslToRgb({ h: (baseHsl.h + 180) % 360, s: baseHsl.s, l: baseHsl.l });
      return [baseColor, rgbToHex(comp.r, comp.g, comp.b)];
    }
    case "analogous": {
      const ana1 = hslToRgb({ h: (baseHsl.h - 30 + 360) % 360, s: baseHsl.s, l: baseHsl.l });
      const ana2 = hslToRgb({ h: (baseHsl.h + 30) % 360, s: baseHsl.s, l: baseHsl.l });
      return [rgbToHex(ana1.r, ana1.g, ana1.b), rgbToHex(ana2.r, ana2.g, ana2.b)];
    }
    case "triadic": {
      const t1 = hslToRgb({ h: (baseHsl.h + 120) % 360, s: baseHsl.s, l: baseHsl.l });
      const t2 = hslToRgb({ h: (baseH.h + 240) % 360, s: baseHsl.s, l: baseHsl.l });
      return [baseColor, rgbToHex(t1.r, t1.g, t1.b), rgbToHex(t2.r, t2.g, t2.b)];
    }
    case "split-complementary": {
      const sc1 = hslToRgb({ h: (baseHsl.h + 180 + 30) % 360, s: baseHsl.s * 0.8, l: baseHsl.l });
      const sc2 = hslToRgb({ h: (baseHsl.h + 180 - 30) % 360, s: baseHsl.s * 0.8, l: baseHsl.l });
      return [baseColor, rgbToHex(sc1.r, sc1.g, sc1.b), rgbToHex(sc2.r, sc2.g, sc2.b)];
    }
    case "tetradic": {
      const t1 = hslToRgb({ h: (baseHsl.h + 90) % 360, s: baseHsl.s, l: baseHsl.l });
      const t2 = hslToRgb({ h: (baseHsl.h + 180) % 360, s: baseHsl.s, l: baseHsl.l });
      const t3 = hslToRgb({ h: (baseH.h + 270) % 360, s: baseHsl.s, l: baseHsl.l });
      return [baseColor, rgbToHex(t1.r, t1.g, t1.b), rgbToHex(t2.r, t2.g, t2.b), rgbToHex(t3.r, t3.g, t3.b)];
    }
    case "square": {
      const sq1 = hslToRgb({ h: (baseHsl.h + 90) % 360, s: baseHsl.s, l: baseHsl.l });
      const sq2 = hslToRgb({ h: (baseHsl.h + 180) % 360, s: baseHsl.s, l: baseHsl.l });
      const sq3 = hslToRgb({ h: (baseHsl.h + 270) % 360, s: baseHsl.s, l: baseHsl.l });
      const sq4 = hslToRgb({ h: (baseHsl.h + 360) % 360, s: baseHsl.s, l: baseHsl.l });
      return [baseColor, rgbToHex(sq1.r, sq1.g, sq1.b), rgbToHex(sq2.r, sq2.g, sq2.b), rgbToHex(sq3.r, sq3.g, sq3.b), rgbToHex(sq4.r, sq4.g, sq4.b)];
    }
  }

  return [];
}

// --- Alpha Blending ---

/** Blend two colors with alpha compositing */
export function blendColors(
  fg: string | RGB,
  bg: string | RGB,
  mode: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "difference" | "exclusion" = "normal",
  alpha: number = 1,
): string {
  const fgRgb = typeof fg === "string" ? hexToRgb(fg) : fg;
  const bgRgb = typeof bg === "string" ? hexToRgb(bg) : bg;

  let r: number, g: number, b: number;
  const a = alpha;

  switch (mode) {
    case "normal":
      r = fgRgb.r * a + bgRgb.r * (1 - a);
      g = fgRgb.g * a + bgRgb.g * (1 - a);
      b = fgRgb.b * a + bgRgb.b * (1 - a);
      break;
    case "multiply":
      r = fgRgb.r * bgRgb.r / 255;
      g = fgRgb.g * bgRgb.g / 255;
      b = fgRgb.b * bgRgb.b / 255;
      break;
    case "screen":
      r = 1 - (1 - fgRgb.r / 255) * (1 - bgRgb.r / 255);
      g = 1 - (1 - fgRgb.g / 255) * (1 - bgRgb.g / 255);
      b = 1 - (1 - fgRgb.b / 255) * (1 - bgRgb.b / 255);
      break;
    case "overlay":
      if (fgRgb.r / 255 > 0.5) r = bgRgb.r + (2 * fgRgb.r / 255 - 1) * (255 - bgRgb.r);
      else r = bgRgb.r * (2 * fgRgb.r / 255);
      if (fgRgb.g / 255 > 0.5) g = bgRgb.g + (2 * fgRgb.g / 255 - 1) * (255 - bgRgb.g);
      else g = bgRgb.g * (2 * fgRgb.g / 255);
      if (fgRgb.b / 255 > 0.5) b = bgRgb.b + (2 * fgRgb.b / 255 - 1) * (255 - bgRgb.b);
      else b = bgRgb.b * (2 * fgRgb.b / 255);
      break;
    case "darken":
      r = bgRgb.r * (1 - a);
      g = bgRgb.g * (1 - a);
      b = bgRgb.b * (1 - a);
      break;
    case "lighten":
      r = bgRgb.r + (255 - bgRgb.r) * a;
      g = bgRgb.g + (255 - bgRgb.g) * a;
      b = bgRgb.b + (255 - bgRgb.b) * a;
      break;
    case "difference":
      r = Math.abs(fgRgb.r - bgRgb.r);
      g = Math.abs(fgRgb.g - bgRgb.g);
      b = Math.abs(fgRgb.b - bgRgb.b);
      break;
    case "exclusion":
      r = bgRgb.r + fgRgb.r - (2 * fgRgb.r * bgRgb.r) / 255;
      g = bgRgb.g + fgRgb.g - (2 * fgRgb.g * bgRgb.g) / 255;
      b = bgRgb.b + fgRgb.b - (2 * fgRgb.b * bgRgb.b) / 255;
      break;
  }

  return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
}

// --- Main API ---

/** Parse any color input into a ColorInfo object */
export function parseColor(input: string | RGB): ColorInfo {
  const rgb = typeof input === "string"
    ? (NAMED_COLORS[input.replace("#", "") ? hexToRgb(NAMED_COLORS[input.replace("#", "")) : hexToRgb(input))
    : input;

  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  const lum = calcLuminance(rgb);

  return {
    hex,
    rgb,
    hsl,
    hsv,
    luminance: lum,
    isDark: lum < 0.179,
  };
}

/** Get a named color by name */
export function getColor(name: string): ColorInfo | undefined {
  const hex = NAMED_COLORS[name];
  if (!hex) return undefined;
  return parseColor(hex);
}

/** Generate random color within constraints */
export function randomColor(opts?: {
  hueRange?: [number, number];
  saturationRange?: [number, number];
  lightnessRange?: [number, number];
  alpha?: [number, number];
}): string {
  const h = opts?.hueRange
    ? Math.random() * (opts.hueRange[1] - opts.hueRange[0]) + opts.hueRange[0]
    : Math.random() * 360;
  const s = opts?.saturationRange
    ? Math.random() * (opts.saturationRange[1] - opts.saturationRange[0]) + opts.saturationRange[0]
    : Math.random() * 100;
  const l = opts?.lightnessRange
    ? Math.random() * (opts.lightnessRange[1] - opts.lightnessRange[0]) + opts.lightnessRange[0]
    : Math.random() * 70 + 20; // avoid too dark/light by default

  const rgb = hslToRgb({ h, s, l });
  const a = opts?.alpha
    ? Math.random() * (opts.alpha[1] - opts.alpha[0]) + opts.alpha[0]
    : 1;

  return rgbToHex(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b));
}
