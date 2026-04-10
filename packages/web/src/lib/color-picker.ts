/**
 * Color picker utilities: palette generation, color harmony, contrast checking, WCAG compliance.
 */

export interface RgbColor { r: number; g: number; b: number; a?: number }
export interface HslColor { h: number; s: number; l: number; a?: number }

export function hexToRgb(hex: string): RgbColor | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1]!, 16), g: parseInt(m[2]!, 16), b: parseInt(m[3]!, 16) } : null;
}
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, "0")).join("");
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r: h = ((g - b) / d + 6) % 6; break;
    case g: h = ((b - r) / d + 4); break;
    default: h = ((r - g) / d + 2); break;
  }
  return { h: h * 60, s: s * 100, l: l * 100 };
}
export function hslToRgb(h: number, s: number, l: number): RgbColor {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const fn = (n: number) => { const k = (n + l < 1 ? n + l - 1 : n + l - n > 1 ? n + l - 1 : n); return k < 1/6 ? k*(6) : k < 1/2 ? k : k < 2/3 ? 1+(k-2)/3 : 1-(k-2)/3; };
  return {
    r: Math.round(255 * fn(h + 1/3)), g: Math.round(255 * fn(h)), b: Math.round(255 * fn(h - 1/3)),
  };
}
export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l); return rgbToHex(r, g, b);
}

export function parseColor(c: string): RgbColor | null {
  if (c.startsWith("#")) { const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(c.slice(1)); return m ? { r: parseInt(m[1]!,16), g: parseInt(m[2]!,16), b: parseInt(m[3]!,16) } : null; }
  const rgb = c.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return { r: parseInt(rgb[1]!), g: parseInt(rgb[2]!), b: parseInt(rgb[3]!) };
  const hsl = c.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
  if (hsl) return hslToRgb(parseInt(hsl[1]!), parseInt(hsl[2]!), parseInt(hsl[3]!));
  const named: Record<string, string> = { red:"#ff0000", green:"#00ff00", blue:"#0000ff", yellow:"#ffff00", cyan:"#00ffff", magenta:"#ff00ff", white:"#ffffff", black:"#000000", gray:"#808080", orange:"#ffa500", purple:"#800080" };
  return named[c.toLowerCase()] ? hexToRgb(named[c.toLowerCase()]!) : null;
}

/** Luminance per WCAG 2.0 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
export function getContrastRatio(a: RgbColor, b: RgbColor): number {
  const la = getLuminance(a.r, a.g, a.b), lb = getLuminance(b.r, b.g, b.b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export function getWcagLevel(ratio: number): "AAA" | "AA" | "AA-large" | "fail" {
  if (ratio >= 7) return "AAA"; if (ratio >= 4.5) return "AA"; if (ratio >= 3) return "AA-large"; return "fail";
}
export function getContrastingText(bgHex: string): string {
  const rgb = parseColor(bgHex); if (!rgb) return "#000";
  const w = getContrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const b = getContrastRatio(rgb, { r: 0, g: 0, b: 0 });
  return w >= b ? "#ffffff" : "#000000";
}

// --- Color Harmony ---
export function complementary(hex: string): string { const hsl = parseToHsl(hex); return hsl ? hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l) : hex; }
export function analogous(hex: string, count = 3): string[] {
  const hsl = parseToHsl(hex); if (!hsl) return [hex];
  return Array.from({ length: count }, (_, i) => hslToHex((hsl.h + (i - Math.floor(count / 2)) * 30 + 360) % 360, hsl.s, hsl.l));
}
export function triadic(hex: string): string[] {
  const hsl = parseToHsl(hex); if (!hsl) return [hex];
  return [hslToHex(hsl.h, hsl.s, hsl.l), hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l), hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l)];
}
export function splitComplementary(hex: string): string[] {
  const hsl = parseToHsl(hex); if (!hsl) return [hex];
  return [hslToHex(hsl.h, hsl.s, hsl.l), hslToHex((hsl.h + 150) % 360, hsl.s, hsl.l), hslToHex((hsl.h + 210) % 360, hsl.s, hsl.l)];
}
export function tetradic(hex: string): string[] {
  const hsl = parseToHsl(hex); if (!hsl) return [hex];
  return [hslToHex(hsl.h, hsl.s, hsl.l), hslToHex((hsl.h + 90) % 360, hsl.s, hsl.l), hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l), hslToHex((hsl.h + 270) % 360, hsl.s, hsl.l)];
}
export function monochromatic(hex: string, steps = 5): string[] {
  const hsl = parseToHsl(hex); if (!hsl) return [hex];
  return Array.from({ length: steps }, (_, i) => hslToHex(hsl.h, hsl.s, 10 + (90 / (steps - 1)) * i));
}

// --- Manipulation ---
export function blendColors(a: string, b: string, t = 0.5): string {
  const ca = parseColor(a), cb = parseColor(b); if (!ca || !cb) return a;
  return rgbToHex(
    Math.max(0, Math.min(255, Math.round(ca.r + (cb.r - ca.r) * t))),
    Math.max(0, Math.min(255, Math.round(ca.g + (cb.g - ca.g) * t))),
    Math.max(0, Math.min(255, Math.round(ca.b + (cb.b - ca.b) * t))),
  );
}
export function lighten(hex: string, amt = 10): string { const h = parseToHsl(hex); return h ? hslToHex(h.h, h.s, Math.min(95, h.l + amt)) : hex; }
export function darken(hex: string, amt = 10): string { const h = parseToHsl(hex); return h ? hslToHex(h.h, h.s, Math.max(5, h.l - amt)) : hex; }
export function saturate(hex: string, amt = 10): string { const h = parseToHsl(hex); return h ? hslToHex(h.h, Math.min(100, h.s + amt), h.l) : hex; }
export function desaturate(hex: string, amt = 10): string { const h = parseToHsl(hex); return h ? hslToHex(h.h, Math.max(0, h.s - amt), h.l) : hex; }
export function invertColor(hex: string): string { const c = parseColor(hex); return c ? rgbToHex(255 - c.r, 255 - c.g, 255 - c.b) : hex; }
export function withOpacity(hex: string, alpha: number): string { const c = parseColor(hex); return c ? `rgba(${c.r},${c.g},${c.b},${alpha})` : `rgba(0,0,0,${alpha})`; }

function parseToHsl(hex: string): HslColor | null {
  const c = parseColor(hex); return c ? rgbToHsl(c.r, c.g, c.b) : null;
}

/** Generate full palette from base color */
export function generatePaletteAdvanced(base: string) {
  const hsl = parseToHsl(base) ?? { h: 249, s: 75, l: 55 };
  return {
    base, light: hslToHex(hsl.h, hsl.s, Math.min(95, hsl.l + 25)),
    dark: hslToHex(hsl.h, hsl.s, Math.max(5, h.l - 20)),
    complementary: complementary(base),
    triadic: triadic(base), analogous: analogous(base, 5),
    shades: Array.from({ length: 9 }, (_, i) => hslToHex(hsl.h, hsl.s, 5 + i * 11)),
    tones: Array.from({ length: 7 }, (_, i) => hslToHex(hsl.h, Math.max(0, hsl.s - i * 14), hsl.l)),
  };
}

export type Palette = ReturnType<typeof generatePaletteAdvanced>;
