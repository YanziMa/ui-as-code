/**
 * Color & Design Token System: Comprehensive design token management with
 * color generation, palette creation, theme definitions, CSS variable output,
 * contrast checking (WCAG), gradient generation, scale systems,
 * token aliases/references, dark mode support, and Figma-style
 * design token interchange format.
 */

// --- Types ---

export type ColorFormat = "hex" | "rgb" | "hsl" | "oklch" | "hwb";
export type ColorSpace = "srgb" | "display-p3" | "oklab" | "oklch";

export interface RGB { r: number; g: number; b: number; a?: number }
export interface HSL { h: number; s: number; l: number; a?: number }
export interface OKLCH { l: number; c: number; h: number; a?: number }

export interface DesignToken<T = unknown> {
  name: string;
  value: T;
  type: "color" | "dimension" | "font-size" | "font-weight" | "spacing"
    | "radius" | "shadow" | "duration" | "cubic-bezier" | "opacity"
    | "custom";
  description?: string;
  /** Reference to another token ($token.name) */
  $ref?: string;
  /** Platform-specific overrides */
  platformOverrides?: Record<string, T>;
  /** Group/category */
  group?: string;
  /** Whether this is a computed/derived token */
  computed?: boolean;
}

export interface TokenGroup {
  name: string;
  tokens: DesignToken[];
  groups?: TokenGroup[];
}

export interface ThemeDefinition {
  name: string;
  id: string;
  mode: "light" | "dark" | "custom";
  tokens: TokenGroup[];
  /** CSS custom property prefix */
  cssPrefix?: string;
  /** Base font size for relative units */
  baseFontSize?: number;
}

export interface ContrastResult {
  ratio: number;
  level: "AAA" | "AA" | "AA-large" | "Fail";
  passesNormal: boolean;
  passesLarge: boolean;
  passesUI: boolean;
}

export interface GradientStop {
  offset: number;        // 0-1
  color: string;
  opacity?: number;
}

export interface GradientDef {
  type: "linear" | "radial" | "conic";
  stops: GradientStop[];
  angle?: number;        // degrees (linear/conic)
  position?: string;     // center position (radial)
  shape?: "circle" | "ellipse"; // radial shape
  repeating?: boolean;
}

export interface ScaleStep {
  step: number;          // e.g., -2, -1, 0, 1, 2
  value: number;
  label: string;
  name: string;
}

export interface PaletteColor {
  name: string;
  hex: string;
  rgb: RGB;
  hsl: HSL;
  oklch?: OKLCH;
  contrastWhite?: ContrastResult;
  contrastBlack?: ContrastResult;
}

export interface ColorPalette {
  name: string;
  colors: PaletteColor[];
  primary?: string;
  secondary?: string;
  accent?: string;
  neutral?: string;
  background?: string;
  foreground?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
}

// --- Color Conversion ---

/** Parse any CSS color string into RGB */
export function parseColor(color: string): RGB | null {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = color;
  const parsed = ctx.fillStyle;
  if (parsed.startsWith("#")) return hexToRgb(parsed);
  if (parsed.startsWith("rgb")) {
    const match = parsed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: match[4] ? parseFloat(match[4]) : undefined };
  }
  return null;
}

/** Convert hex to RGB */
export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

/** Convert RGB to hex */
export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("");
}

/** Convert RGB to HSL */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** Convert HSL to RGB */
export function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360; s /= 100; l /= 100;

  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };

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

/** Convert OKLCH to approximate RGB */
export function oklchToRgb(l: number, c: number, h: number): RGB {
  // Simplified conversion (OKLCH -> OKLab -> linear sRGB -> sRGB)
  const hr = (h || 0) * Math.PI / 180;
  // OKLab approximations
  const a_ = c * Math.cos(hr);
  const b_ = c * Math.sin(hr);

  // OKLab to linear sRGB (approximate)
  const l_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
  const m_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
  const s_ = l - 0.0894841775 * a_ - 1.291485548 * b_;

  const clamped = (v: number): number => Math.max(0, Math.min(1, v));
  return {
    r: Math.round(clamped(+4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_) * 255),
    g: Math.round(clamped(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_) * 255),
    b: Math.round(clamped(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_) * 255),
  };
}

/** Format RGB as CSS string */
export function formatCss(rgb: RGB, format: ColorFormat = "hex"): string {
  switch (format) {
    case "hex": return rgbToHex(rgb.r, rgb.g, rgb.b);
    case "rgb": return rgb.a != null ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})` : `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    case "hsl": { const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b); return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`; }
    default: return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
}

// --- Color Manipulation ---

/** Mix two colors by a given ratio (0 = colorA, 1 = colorB) */
export function mixColors(colorA: string, colorB: string, ratio = 0.5): string {
  const a = parseColor(colorA)!;
  const b = parseColor(colorB)!;
  return rgbToHex(
    a.r + (b.r - a.r) * ratio,
    a.g + (b.g - a.g) * ratio,
    a.b + (b.b - a.b) * ratio,
  );
}

/** Lighten a color by percentage */
export function lighten(color: string, amount = 10): string {
  const hsl = rgbToHsl(...Object.values(parseColor(color)!) as [number, number, number]);
  return formatCss(hslToRgb(hsl.h, hsl.s, Math.min(hsl.l + amount, 100)), "hex");
}

/** Darken a color by percentage */
export function darken(color: string, amount = 10): string {
  const hsl = rgbToHsl(...Object.values(parseColor(color)!) as [number, number, number]);
  return formatCss(hslToRgb(hsl.h, hsl.s, Math.max(hsl.l - amount, 0)), "hex");
}

/** Saturate a color by percentage */
export function saturate(color: string, amount = 10): string {
  const hsl = rgbToHsl(...Object.values(parseColor(color)!) as [number, number, number]);
  return formatCss(hslToRgb(hsl.h, Math.min(hsl.s + amount, 100), hsl.l), "hex");
}

/** Desaturate a color by percentage */
export function desaturate(color: string, amount = 10): string {
  const hsl = rgbToHsl(...Object.values(parseColor(color)!) as [number, number, number]);
  return formatCss(hslToRgb(hsl.h, Math.max(hsl.s - amount, 0), hsl.l), "hex");
}

/** Adjust opacity of a color */
export function setOpacity(color: string, alpha: number): string {
  const rgb = parseColor(color)!;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** Invert a color */
export function invert(color: string): string {
  const rgb = parseColor(color)!;
  return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

// --- WCAG Contrast ---

/** Calculate luminance from RGB (relative luminance per WCAG 2.0) */
function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Calculate the contrast ratio between two colors per WCAG 2.0 */
export function contrastRatio(colorA: string, colorB: string): number {
  const a = parseColor(colorA)!;
  const b = parseColor(colorB)!;
  const la = relativeLuminance(a.r, a.g, a.b);
  const lb = relativeLuminance(b.r, b.g, b.b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Check WCAG compliance for a foreground/background pair */
export function checkContrast(foreground: string, background: string): ContrastResult {
  const ratio = contrastRatio(foreground, background);
  return {
    ratio: Math.round(ratio * 100) / 100,
    level: ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-large" : "Fail",
    passesNormal: ratio >= 4.5,
    passesLarge: ratio >= 3,
    passesUI: ratio >= 3,
    contrastWhite: checkContrast("#ffffff", background),
    contrastBlack: checkContrast("#000000", background),
  } as ContrastResult;
}

/** Find the minimum lightness that achieves AA contrast against a background */
export function findAccessibleColor(baseHue: number, baseSat: number, background: string, targetRatio = 4.5): string {
  for (let lightness = 0; lightness <= 100; lightness += 0.5) {
    const candidate = formatCss(hslToRgb(baseHue, baseSat, lightness), "hex");
    if (contrastRatio(candidate, background) >= targetRatio) return candidate;
  }
  return "#000000";
}

// --- Palette Generation ---

/** Generate a color palette with shades from a base color */
export function generatePalette(
  baseColor: string,
  options: { steps?: number; name?: string; includeNeutral?: boolean } = {},
): ColorPalette {
  const { steps = 10, name = "palette" } = options;
  const base = parseColor(baseColor)!;
  const baseHsl = rgbToHsl(base.r, base.g, base.b);

  const colors: PaletteColor[] = [];
  const stepSize = 100 / (steps - 1);

  for (let i = 0; i < steps; i++) {
    const lightness = i * stepSize;
    const satMultiplier = lightness < 50 ? 1 - (50 - lightness) / 80 : 1 - (lightness - 50) / 120;
    const adjustedSat = Math.max(0, Math.min(baseHsl.s * satMultiplier, 100));
    const rgb = hslToRgb(baseHsl.h, adjustedSat, lightness);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

    colors.push({
      name: `${name}-${i * 100}`,
      hex,
      rgb,
      hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
      contrastWhite: checkContrast("#ffffff", hex),
      contrastBlack: checkContrast("#000000", hex),
    });
  }

  return {
    name,
    colors,
    primary: colors[Math.floor(steps * 0.4)]?.hex ?? baseColor,
    secondary: colors[Math.floor(steps * 0.6)]?.hex ?? baseColor,
    neutral: colors[Math.floor(steps * 0.95)]?.hex ?? "#888888",
    background: colors[steps - 1]?.hex ?? "#ffffff",
    foreground: colors[0]?.hex ?? "#000000",
  };
}

/** Generate complementary palette (base + complement) */
export function generateComplementaryPalette(baseColor: string): ColorPalette {
  const base = parseColor(baseColor)!;
  const baseHsl = rgbToHsl(base.r, base.g, base.b);
  const compHsl = { h: (baseHsl.h + 180) % 360, s: baseHsl.s, l: baseHsl.l };
  const compHex = formatCss(hslToRgb(compHsl.h, compHsl.s, compHsl.l), "hex");

  const basePalette = generatePalette(baseColor, { name: "primary" });
  const compPalette = generatePalette(compHex, { name: "complement" });

  return {
    name: `${basePalette.name}-complementary`,
    colors: [...basePalette.colors, ...compPalette.colors],
    primary: basePalette.primary,
    secondary: compPalette.primary,
    accent: compPalette.colors[Math.floor(compPalette.colors.length * 0.35)]?.hex,
  };
}

/** Generate an analogous palette (base + adjacent hues) */
export function generateAnalogousPalette(baseColor: string, spread = 30): ColorPalette {
  const base = parseColor(baseColor)!;
  const baseHsl = rgbToHsl(base.r, base.g, base.b);

  const palettes = [-spread, 0, spread].map((offset) => {
    const hue = (baseHsl.h + offset + 360) % 360;
    return generatePalette(formatCss(hslToRgb(hue, baseHsl.s, baseHsl.l), "hex"), { name: `hue-${hue}` });
  });

  return {
    name: "analogous",
    colors: palettes.flatMap((p) => p.colors),
    primary: palettes[1]?.primary,
    secondary: palettes[0]?.primary,
    accent: palettes[2]?.primary,
  };
}

/** Generate triadic palette (3 evenly spaced hues) */
export function generateTriadicPalette(baseColor: string): ColorPalette {
  const base = parseColor(baseColor)!;
  const baseHsl = rgbToHsl(base.r, base.g, base.b);

  const palettes = [0, 120, 240].map((offset) => {
    const hue = (baseHsl.h + offset) % 360;
    return generatePalette(formatCss(hslToRgb(hue, baseHsl.s, baseHsl.l), "hex"), { name: `tri-${hue}` });
  });

  return {
    name: "triadic",
    colors: palettes.flatMap((p) => p.colors),
    primary: palettes[0]?.primary,
    secondary: palettes[1]?.primary,
    accent: palettes[2]?.primary,
  };
}

// --- Gradient Generation ---

/** Generate a CSS gradient string from definition */
export function generateGradient(def: GradientDef): string {
  const stopsStr = def.stops
    .sort((a, b) => a.offset - b.offset)
    .map((s) => {
      const color = s.opacity != null ? setOpacity(s.color, s.opacity) : s.color;
      return `${color} ${Math.round(s.offset * 100)}%`;
    })
    .join(", ");

  switch (def.type) {
    case "linear":
      return `linear-gradient(${def.angle ?? 180}deg, ${stopsStr})`;
    case "radial":
      return `radial-gradient(${def.shape ?? "circle"}${def.position ? ` at ${def.position}` : ""}, ${stopsStr})`;
    case "conic":
      return `conic-gradient(from ${def.angle ?? 0}deg${def.position ? ` at ${def.position}` : ""}, ${stopsStr})`;
    default:
      return `linear-gradient(${stopsStr})`;
  }
}

/** Generate common preset gradients */
export const Gradients = {
  sunset: (): GradientDef => ({
    type: "linear", angle: 135,
    stops: [
      { offset: 0, color: "#f093fb" },
      { offset: 0.5, color: "#f5576c" },
      { offset: 1, color: "#4facfe" },
    ],
  }),
  ocean: (): GradientDef => ({
    type: "linear", angle: 180,
    stops: [
      { offset: 0, color: "#667eea" },
      { offset: 1, color: "#764ba2" },
    ],
  }),
  mint: (): GradientDef => ({
    type: "linear", angle: 135,
    stops: [
      { offset: 0, color: "#11998e" },
      { offset: 1, color: "#38ef7d" },
    ],
  }),
  fire: (): GradientDef => ({
    type: "linear", angle: 45,
    stops: [
      { offset: 0, color: "#f12711" },
      { offset: 0.5, color: "#f5af19" },
      { offset: 1, color: "#f093fb" },
    ],
  }),
  midnight: (): GradientDef => ({
    type: "linear", angle: 180,
    stops: [
      { offset: 0, color: "#0f0c29" },
      { offset: 0.5, color: "#302b63" },
      { offset: 1, color: "#24243e" },
    ],
  }),
};

// --- Spacing Scale ---

/** Generate a spacing scale based on a base unit */
export function generateSpacingScale(baseUnit = 4, steps = 20): ScaleStep[] {
  const result: ScaleStep[] = [];
  for (let i = -steps; i <= steps; i++) {
    result.push({
      step: i,
      value: baseUnit * Math.pow(1.25, i),
      label: i === 0 ? "base" : i > 0 ? `up${i}` : `down${Math.abs(i)}`,
      name: `space-${i >= 0 ? i : `n${Math.abs(i)}`}`,
    });
  }
  return result;
}

/** Get a standard spacing scale (4px base, 1.25 ratio) */
export const spacingScale = generateSpacingScale();

/** Common spacing values as a convenience map */
export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48, "3xl": 64, "4xl": 96, "5xl": 128,
};

// --- Typography Scale ---

/** Generate a modular type scale */
export function generateTypeScale(baseSize = 16, ratio = 1.25, steps = 8): ScaleStep[] {
  const result: ScaleStep[] = [];
  const names = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"];
  for (let i = -Math.floor(steps / 2); i <= Math.floor(steps / 2); i++) {
    const nameIdx = i + Math.floor(steps / 2);
    result.push({
      step: i,
      value: baseSize * Math.pow(ratio, i),
      label: names[nameIdx] ?? `step${i}`,
      name: `text-${names[nameIdx] ?? i}`,
    });
  }
  return result;
}

/** Major third type scale (1.25 ratio) */
export const majorThirdScale = generateTypeScale(16, 1.25);

/** Perfect fourth type scale (1.333 ratio) */
export const perfectFourthScale = generateTypeScale(16, 1.333);

// --- Border Radius Scale ---

/** Generate border radius scale */
export function generateRadiusScale(maxRadius = 24, steps = 8): ScaleStep[] {
  const result: ScaleStep[] = [];
  const names = ["none", "sm", "md", "lg", "xl", "2xl", "3xl", "full"];
  for (let i = 0; i < steps; i++) {
    const value = i === 0 ? 0 : i === steps - 1 ? 9999 : Math.round((maxRadius / (steps - 2)) * (i - 1));
    result.push({ step: i, value, label: names[i] ?? `r${i}`, name: `radius-${names[i] ?? i}` });
  }
  return result;
}

export const radiusScale = generateRadiusScale();

// --- Shadow System ---

/** Generate elevation shadows */
export function generateElevationShadows(color = "rgba(0, 0, 0, 0.1)", levels = 5): Record<string, string> {
  const shadows: Record<string, string> = {};
  for (let i = 0; i <= levels; i++) {
    const y = i * 2;
    const blur = i * 4;
    const spread = i > 0 ? -i : 0;
    const opacity = 0.04 + i * 0.06;
    shadows[`elevation-${i}`] = `0 ${y}px ${blur}px ${spreadpx} ${color.replace(/[\d.]+\)$/, `${opacity})`)}`;
  }
  return shadows;
}

export const elevationShadows = generateElevationShadows();

// --- CSS Variable Output ---

/** Generate CSS custom properties from a theme */
export function generateCssVariables(theme: ThemeDefinition, selector = ":root"): string {
  const lines: string[] = [`${selector} {`];
  const prefix = theme.cssPrefix ?? "";

  const flattenTokens = (group: TokenGroup, path = ""): void => {
    for (const token of group.tokens) {
      const varName = `--${prefix}${path}${token.name}`;
      const val = typeof token.value === "number"
        ? `${token.value}px`
        : String(token.value);
      lines.push(`  ${varName}: ${val};`);
    }
    if (group.groups) {
      for (const sub of group.groups) flattenTokens(sub, `${sub.name}-`);
    }
  };

  for (const group of theme.tokens) flattenTokens(group);
  lines.push("}");
  return lines.join("\n");
}

/** Generate CSS variables for a color palette */
export function generatePaletteCssVariables(palette: ColorPalette, prefix = "color"): string {
  const lines: string[] = [`:root {`];
  for (const color of palette.colors) {
    lines.push(`  --${prefix}-${color.name}: ${color.hex};`);
  }
  if (palette.primary) lines.push(`  --${prefix}-primary: ${palette.primary};`);
  if (palette.secondary) lines.push(`  --${prefix}-secondary: ${palette.secondary};`);
  if (palette.accent) lines.push(`  --${prefix}-accent: ${palette.accent};`);
  if (palette.background) lines.push(`  --${prefix}-bg: ${palette.background};`);
  if (palette.foreground) lines.push(`  --${prefix}-fg: ${palette.foreground};`);
  lines.push("}");
  return lines.join("\n");
}

// --- Dark Mode ---

/** Generate a dark mode variant of a theme by inverting light/dark tokens */
export function generateDarkTheme(lightTheme: ThemeDefinition): ThemeDefinition {
  return {
    ...lightTheme,
    id: `${lightTheme.id}-dark`,
    name: `${lightTheme.name} (Dark)`,
    mode: "dark",
    tokens: lightTheme.tokens.map((group) => ({
      ...group,
      tokens: group.tokens.map((token) => {
        if (token.type === "color" && typeof token.value === "string") {
          const parsed = parseColor(token.value);
          if (parsed) {
            const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
            // Invert lightness for dark mode
            const newL = 100 - hsl.l;
            return { ...token, value: formatCss(hslToRgb(hsl.h, hsl.s, newL), "hex") };
          }
        }
        return token;
      }),
      groups: group.groups?.map((g) => ({ ...g })),
    })),
  };
}
