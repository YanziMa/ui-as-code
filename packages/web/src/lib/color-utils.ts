/**
 * Color Utilities: Comprehensive color manipulation library with HSL/RGB/HEX/HSLA/RGBA
 * conversion, contrast checking (WCAG AA/AAA), palette generation, gradient builders,
 * color mixing, temperature analysis, accessibility helpers, and CSS variable generation.
 */

// --- Types ---

export interface RGB { r: number; g: number; b: number; a?: number }
export interface HSL { h: number; s: number; l: number; a?: number }
export interface HSV { h: number; s: number; v: number }
export interface ColorStop { offset: number; color: string }
export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

// --- Parsing ---

/** Parse any color format to RGB */
export function parseColor(color: string): RGB | null {
  color = color.trim();

  // HEX
  const hexMatch = color.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexMatch) return hexToRgb(hexMatch[1]);

  // rgb/rgba
  const rgbMatch = color.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]!, 10),
      g: parseInt(rgbMatch[2]!, 10),
      b: parseInt(rgbMatch[3]!, 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : undefined,
    };
  }

  // hsl/hsla
  const hslMatch = color.match(/^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (hslMatch) {
    return hslToRgb({
      h: parseInt(hslMatch[1], 10),
      s: parseInt(hslMatch[2], 10),
      l: parseInt(hslMatch[3], 10),
      a: hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : undefined,
    });
  }

  // Named colors
  const named = NAMED_COLORS[color.toLowerCase()];
  if (named) return hexToRgb(named);

  return null;
}

/** Parse and validate, throwing on invalid input */
export function requireColor(color: string): RGB {
  const result = parseColor(color);
  if (!result) throw new Error(`Invalid color: "${color}"`);
  return result;
}

// --- Conversion ---

export function rgbToHex(rgb: RGB): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0");
  let hex = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  if (rgb.a !== undefined && rgb.a < 1) {
    hex += toHex(Math.round(rgb.a * 255));
  }
  return hex;
}

export function hexToRgb(hex: string): RGB {
  let h = hex;
  if (h.length === 3) {
    h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  } else if (h.length === 4) {
    h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]! + h[3]! + h[3]!;
  }

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : undefined;

  return { r, g, b, a };
}

export function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100), a: rgb.a };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
    case g: h = ((b - r) / d + 2); break;
    case b: h = ((r - g) / d + 4); break;
  }

  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100), a: rgb.a };
}

export function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360, s = hsl.s / 100, l = hsl.l / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v, a: hsl.a };
  }

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    a: hsl.a,
  };
}

export function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case r: h = (((g - b) / d) + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d) + 2; break;
      case b: h = ((r - g) / d) + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

export function hsvToHsl(hsv: HSV): HSL {
  const h = hsv.h, s = hsv.s / 100, v = hsv.v / 100;
  const l = v * (1 - s / 2);
  const ss = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s: Math.round(ss * 100), l: Math.round(l * 100) };
}

// --- String Formatting ---

export function toHexString(color: string | RGB): string {
  const rgb = typeof color === "string" ? parseColor(color)! : color;
  return rgbToHex(rgb);
}

export function toRgbString(rgb: RGB): string {
  if (rgb.a !== undefined && rgb.a < 1) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
  }
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function toHslString(hsl: HSL): string {
  if (hsl.a !== undefined && hsl.a < 1) {
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${hsl.a})`;
  }
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

// --- Manipulation ---

/** Lighten a color by amount (0-100) */
export function lighten(color: string | RGB, amount: number): string {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  hsl.l = Math.min(100, hsl.l + amount);
  return toHexString(hslToRgb(hsl));
}

/** Darken a color by amount (0-100) */
export function darken(color: string | RGB, amount: number): string {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  hsl.l = Math.max(0, hsl.l - amount);
  return toHexString(hslToRgb(hsl));
}

/** Saturate a color by amount (0-100) */
export function saturate(color: string | RGB, amount: number): string {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  hsl.s = Math.min(100, hsl.s + amount);
  return toHexString(hslToRgb(hsl));
}

/** Desaturate a color by amount (0-100) */
export function desaturate(color: string | RGB, amount: number): string {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  hsl.s = Math.max(0, hsl.s - amount);
  return toHexString(hslToRgb(hsl));
}

/** Rotate hue by degrees */
export function rotateHue(color: string | RGB, degrees: number): string {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  hsl.h = (hsl.h + degrees) % 360;
  if (hsl.h < 0) hsl.h += 360;
  return toHexString(hslToRgb(hsl));
}

/** Set opacity (alpha) of a color */
export function setOpacity(color: string | RGB, alpha: number): string {
  const rgb = typeof color === "string" ? parseColor(color)! : { ...color };
  rgb.a = Math.max(0, Math.min(1, alpha));
  return toRgbString(rgb);
}

/** Mix two colors together by ratio (0 = color1, 1 = color2) */
export function mix(color1: string | RGB, color2: string | RGB, ratio = 0.5): string {
  const c1 = typeof color1 === "string" ? parseColor(color1)! : color1;
  const c2 = typeof color2 === "string" ? parseColor(color2)! : color2;
  const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio);
  const a = c1.a !== undefined && c2.a !== undefined
    ? +(c1.a + (c2.a - c1.a) * ratio).toFixed(3)
    : undefined;
  return toRgbString({ r, g, b, a });
}

/** Invert a color */
export function invert(color: string | RGB): string {
  const rgb = typeof color === "string" ? parseColor(color)! : color;
  return rgbToHex({ r: 255 - rgb.r, g: 255 - rgb.g, b: 255 - rgb.b, a: rgb.a });
}

// --- Contrast & Accessibility ---

/** Calculate relative luminance per WCAG 2.0 */
export function luminance(rgb: RGB): number {
  const sRGB = [rgb.r, rgb.g, rgb.b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/** Calculate contrast ratio between two colors (1-21) */
export function contrastRatio(color1: string | RGB, color2: string | RGB): number {
  const l1 = luminance(typeof color1 === "string" ? parseColor(color1)! : color1);
  const l2 = luminance(typeof color2 === "string" ? parseColor(color2)! : color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check WCAG AA compliance for text */
export function meetsAA(foreground: string | RGB, background: string | RGB, largeText = false): boolean {
  const ratio = contrastRatio(foreground, background);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}

/** Check WCAG AAA compliance for text */
export function meetsAAA(foreground: string | RGB, background: string | RGB, largeText = false): boolean {
  const ratio = contrastRatio(foreground, background);
  return largeText ? ratio >= 4.5 : ratio >= 7;
}

/** Return best contrasting text color (black or white) against a background */
export function contrastingText(background: string | RGB): string {
  const bg = typeof background === "string" ? parseColor(background)! : background;
  return luminance(bg) > 0.179 ? "#000000" : "#ffffff";
}

/** Find the minimum alpha needed for foreground to meet AA contrast on background */
export function minAlphaForContrast(
  foreground: string,
  background: string | RGB,
  targetRatio = 4.5,
): number {
  const fg = parseColor(foreground)!;
  const bg = typeof background === "string" ? parseColor(background)! : background;

  // Binary search for minimum alpha
  let lo = 0, hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const blended = mix(bg, { ...fg, a: 1 }, mid);
    const ratio = contrastRatio(blended, bg);
    if (ratio >= targetRatio) hi = mid;
    else lo = mid;
  }
  return hi;
}

// --- Palette Generation ---

/** Generate a Tailwind-style color palette from a base color */
export function generatePalette(baseColor: string): ColorPalette {
  const hsl = rgbToHsl(parseColor(baseColor)!);

  // Lightness scale for each shade
  const shades: Record<keyof ColorPalette, number> = {
    50: 97, 100: 93, 200: 85, 300: 75, 400: 62,
    500: hsl.l, // Base
    600: 45, 700: 35, 800: 25, 900: 17, 950: 10,
  };

  const result = {} as ColorPalette;
  for (const [key, lightness] of Object.entries(shades)) {
    const shadeHsl: HSL = { ...hsl, l: lightness as number };
    // Adjust saturation for lighter/darker shades
    if (lightness > hsl.l) {
      shadeHsl.s = Math.round(hsl.s * (lightness / 100));
    } else if (lightness < hsl.l - 10) {
      shadeHsl.s = Math.min(100, hsl.s + Math.round((hsl.l - lightness) * 0.3));
    }
    (result as Record<string, string>)[key] = toHexString(hslToRgb(shadeHsl));
  }

  return result;
}

/** Generate complementary colors */
export function complementary(color: string | RGB): [string, string] {
  const hex = typeof color === "string" ? color : rgbToHex(color);
  return [hex, rotateHue(hex, 180)];
}

/** Generate analogous colors (adjacent on color wheel) */
export function analogous(color: string | RGB, count = 3): string[] {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  const step = 30;
  const colors: string[] = [];
  for (let i = -Math.floor(count / 2); i <= Math.floor(count / 2); i++) {
    colors.push(toHexString(hslToRgb({ ...hsl, h: (hsl.h + i * step + 360) % 360 })));
  }
  return colors;
}

/** Generate triadic colors (120° apart) */
export function triadic(color: string | RGB): [string, string, string] {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  return [
    toHexString(hslToRgb(hsl)),
    toHexString(hslToRgb({ ...hsl, h: (hsl.h + 120) % 360 })),
    toHexString(hslToRgb({ ...hsl, h: (hsl.h + 240) % 360 })),
  ];
}

/** Generate split-complementary colors */
export function splitComplementary(color: string | RGB): [string, string, string] {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  return [
    toHexString(hslToRgb(hsl)),
    toHexString(hslToRgb({ ...hsl, h: (hsl.h + 150) % 360 })),
    toHexString(hslToRgb({ ...hsl, h: (hsl.h + 210) % 360 })),
  ];
}

/** Generate tetradic (square) colors */
export function tetradic(color: string | RGB): [string, string, string, string] {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  return [
    toHexString(hslToRgb(hsl)),
    toHexString(hslToRgb({ ...hsl, h: (hsl.h + 90) % 360 })),
    toHexString(hslToRgb({ ...hsl, h: (hsl.h + 180) % 360 })),
    toHexString(hslToRgb({ ...hsl, h: (hsl.h + 270) % 360 })),
  ];
}

/** Generate a harmonious color scheme from a seed */
export function generateScheme(seed: string, type: "complementary" | "analogous" | "triadic" | "split" | "tetradic" = "analogous"): string[] {
  switch (type) {
    case "complementary": return complementary(seed);
    case "analogous": return analogous(seed);
    case "triadic": return triadic(seed);
    case "split": return splitComplementary(seed);
    case "tetradic": return tetradic(seed);
  }
}

// --- Gradients ---

/** Build a linear gradient CSS string */
export function linearGradient(stops: Array<string | ColorStop>, direction = "to right"): string {
  const stopStr = stops.map((s) =>
    typeof s === "string" ? s : `${s.color} ${s.offset * 100}%`
  ).join(", ");
  return `linear-gradient(${direction}, ${stopStr})`;
}

/** Build a radial gradient CSS string */
export function radialGradient(stops: Array<string | ColorStop>, shape = "circle" as string): string {
  const stopStr = stops.map((s) =>
    typeof s === "string" ? s : `${s.color} ${s.offset * 100}%`
  ).join(", ");
  return `radial-gradient(${shape}, ${stopStr})`;
}

/** Generate a multi-stop gradient between two colors */
export function gradientBetween(from: string, to: string, steps = 5): string[] {
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    colors.push(mix(from, to, i / (steps - 1)));
  }
  return colors;
}

/** Create a shimmer/loading gradient */
export function shimmerGradient(baseColor = "#f0f0f0", highlight = "#ffffff"): string {
  return `linear-gradient(90deg, ${baseColor} 25%, ${highlight} 50%, ${baseColor} 75%)`;
}

// --- Temperature & Analysis ---

/** Estimate color temperature in Kelvin (rough approximation) */
export function colorTemperature(rgb: RGB): number {
  // McCamy's approximation
  const n = (rgb.b === 0 ? 0.0001 : rgb.r / rgb.b);
  let kelvin = 449 * Math.pow(n, 0.6829) + 335.6 * Math.pow(n, -0.8247) + 55.02;
  if (kelvin < 1000) kelvin = 1000;
  if (kelvin > 40000) kelvin = 40000;
  return Math.round(kelvin);
}

/** Check if a color is perceived as "warm" or "cool" */
export function isWarmColor(color: string | RGB): boolean {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  // Warm hues: red-orange-yellow range (~0-60 and ~300-360)
  return (hsl.h >= 0 && hsl.h <= 60) || (hsl.h >= 300 && hsl.h <= 360);
}

/** Get the dominant hue category */
export function hueCategory(color: string | RGB): string {
  const hsl = typeof color === "string" ? rgbToHsl(parseColor(color)!) : rgbToHsl(color);
  if (hsl.s < 10) return "neutral";
  const h = hsl.h;
  if (h < 15 || h >= 345) return "red";
  if (h < 45) return "orange";
  if (h < 70) return "yellow";
  if (h < 150) return "green";
  if (h < 200) return "cyan";
  if (h < 260) return "blue";
  if (h < 290) return "purple";
  if (h < 345) return "magenta";
  return "red";
}

// --- CSS Variable Generation ---

/** Generate CSS custom properties from a color palette */
export function cssVariablesFromPalette(name: string, palette: ColorPalette): string {
  const lines: string[] = [`/* ${name} palette */`];
  for (const [shade, value] of Object.entries(palette)) {
    lines.push(`--color-${name}-${shade}: ${value};`);
  }
  return lines.join("\n");
}

/** Generate complete CSS variable block for a design token system */
export function generateDesignTokens(paletteName: string, baseColor: string): string {
  const palette = generatePalette(baseColor);
  const bg = contrastingText(palette["50"]);
  const fg = contrastingText(palette["900"]);

  return `
${cssVariablesFromPalette(paletteName, palette)}
--color-${paletteName}-fg: ${fg};
--color-${paletteName}-bg: ${palette["50"]};
--color-${paletteName}-border: ${palette["200"]};
--color-${paletteName}-hover: ${palette["100"]};
--color-${paletteName}-active: ${palette["600"]};
--color-${paletteName}-muted: ${palette["400"]};
`.trim();
}

// --- Named Colors Lookup ---

const NAMED_COLORS: Record<string, string> = {
  transparent: "00000000", aliceblue: "f0f8ff", antiquewhite: "faebd7",
  aqua: "00ffff", aquamarine: "7fffd4", azure: "f0ffff", beige: "f5f5dc",
  bisque: "ffe4c4", black: "000000", blanchedalmond: "ffebcd", blue: "0000ff",
  blueviolet: "8a2be2", brown: "a52a2a", burlywood: "deb887", cadetblue: "5f9ea0",
  chartreuse: "7fff00", chocolate: "d2691e", coral: "ff7f50", cornflowerblue: "6495ed",
  cornsilk: "fff8dc", crimson: "dc143c", cyan: "00ffff", darkblue: "00008b",
  darkcyan: "008b8b", darkgoldenrod: "b8860b", darkgray: "404040", darkgreen: "006400",
  darkgrey: "404040", darkkhaki: "bdb76b", darkmagenta: "8b008b", darkolivegreen: "556b2f",
  darkorange: "ff8c00", darkorchid: "9932cc", darkred: "8b0000", darksalmon: "e9967a",
  darkseagreen: "8fbc8f", darkslateblue: "483d8b", darkslategray: "2f4f4f", darkslategrey: "2f4f4f",
  darkturquoise: "00ced1", darkviolet: "9400d3", deeppink: "ff1493", deepskyblue: "00bfff",
  dimgray: "696969", dimgrey: "696969", dodgerblue: "1e90ff", firebrick: "b22222",
  floralwhite: "fffaf0", forestgreen: "228b22", fuchsia: "ff00ff", gainsboro: "dcdcdc",
  ghostwhite: "f8f8ff", gold: "ffd700", goldenrod: "daa520", gray: "808080",
  green: "008000", greenyellow: "adff2f", grey: "808080", honeydew: "f0fff0",
  hotpink: "ff69b4", indianred: "cd5c5c", indigo: "4b0082", ivory: "fffff0",
  khaki: "f0e68c", lavender: "e6e6fa", lavenderblush: "fff0f5", lawngreen: "7cfc00",
  lemonchiffon: "fffacd", lightblue: "add8e6", lightcoral: "f08080", lightcyan: "e0ffff",
  lightgoldenrodyellow: "fafad2", lightgray: "d3d3d3", lightgreen: "90ee90",
  lightgrey: "d3d3d3", lightpink: "ffb6c1", lightsalmon: "ffa07a", lightseagreen: "20b2aa",
  lightskyblue: "87cefa", lightslategray: "778899", lightslategrey: "778899",
  lightsteelcolor: "b0c4de", lightyellow: "ffffe0", lime: "00ff00", limegreen: "32cd32",
  linen: "faf0e6", magenta: "ff00ff", maroon: "800000", mediumaquamarine: "66cdaa",
  mediumblue: "0000cd", mediumorchid: "ba55d3", mediumpurple: "9370db",
  mediumseagreen: "3cb371", mediumslateblue: "7b68ee", mediumspringgreen: "00fa9a",
  mediumturquoise: "48d1cc", mediumvioletred: "c71585", midnightblue: "191970",
  mintcream: "f5fffa", mistyrose: "ffe4e1", moccasin: "ffe4b5", navajowhite: "ffdead",
  navy: "0000ff", oldlace: "fdf5e6", olive: "808000", olivedrab: "6b8e23",
  orange: "ffa500", orangered: "ff4500", orchid: "da70d6", palegoldenroot: "eee8aa",
  palegreen: "98fb98", paleturquoise: "afeeee", palevioletred: "db7093",
  papayawhip: "ffefd5", peachpuff: "ffdab9", peru: "cd853f", pink: "ffc0cb",
  plum: "dda0dd", powderblue: "b0e0e6", purple: "800080", rebeccapurple: "663399",
  red: "ff0000", rosybrown: "bc8f8f", royalblue: "4169e1", saddlebrown: "8b4513",
  salmon: "fa8072", sandybrown: "f4a460", seagreen: "2e8b57", seashell: "fff5ee",
  sienna: "a0522d", silver: "c0c0c0", skyblue: "87ceeb", slateblue: "6a5acd",
  slategray: "708090", slategrey: "708090", snow: "fffafa", springgreen: "00ff7f",
  steelblue: "4682b4", tan: "d2b48c", teal: "008080", thistle: "d8bfd8",
  tomato: "ff6347", turquoise: "40e0d0", violet: "ee82ee", wheat: "f5deb3",
  white: "ffffff", whitesmoke: "f5f5f5", yellow: "ffff00", yellowgreen: "9acd32",
};
