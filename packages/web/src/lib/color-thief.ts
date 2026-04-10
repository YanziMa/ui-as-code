/**
 * Color Thief: Extract dominant colors, palettes, and color statistics
 * from images using canvas-based pixel analysis (no external dependencies).
 *
 * Supports:
 * - Dominant color extraction
 * - Palette generation (N colors)
 * - Color quantization via modified median cut
 * - Image source: URL, HTMLImageElement, Canvas, or Blob
 */

// --- Types ---

export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface ColorWithCount extends Color {
  count: number;
}

export interface ColorThiefOptions {
  /** Number of colors for palette (default: 6) */
  colorCount?: number;
  /** Quality factor for sampling (0-1, lower = faster, default: 0.5) */
  quality?: number;
  /** Ignore pixels below this alpha threshold (default: 10) */
  ignoreAlphaBelow?: number;
  /** Minimum color distance to merge similar colors (default: 8) */
  minColorDistance?: number;
}

// --- Helpers ---

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function colorDistance(c1: Color, c2: Color): number {
  return Math.sqrt(
    (c1.r - c2.r) ** 2 +
    (c1.g - c2.g) ** 2 +
    (c1.b - c2.b) ** 2
  );
}

function colorToString(color: Color): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function colorToHex(color: Color): string {
  const r = color.r.toString(16).padStart(2, "0");
  const g = color.g.toString(16).padStart(2, "0");
  const b = color.b.toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

/** Load image from source and return HTMLImageElement */
function loadImage(source: string | HTMLImageElement | HTMLCanvasElement | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (source instanceof HTMLImageElement && source.complete) {
      resolve(source);
      return;
    }
    if (source instanceof HTMLCanvasElement) {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = source.toDataURL();
      return;
    }
    if (source instanceof Blob) {
      const url = URL.createObjectURL(source);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image from Blob")); };
      img.src = url;
      return;
    }
    if (typeof source === "string") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image from ${source}`));
      img.src = source;
      return;
    }
    // HTMLImageElement not complete yet
    const img = source as HTMLImageElement;
    if (img.complete) {
      resolve(img);
    } else {
      img.onload = () => resolve(img);
      img.onerror = reject;
    }
  });
}

/** Get pixel data from image */
function getPixelData(img: HTMLImageElement, quality: number, ignoreAlpha: number): Uint8ClampedArray[] {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const pixels: Uint8ClampedArray[] = [];
  const step = Math.max(1, Math.round(1 / quality));

  for (let i = 0; i < data.length; i += 4 * step) {
    if (data[i + 3] >= ignoreAlpha) {
      pixels.push(new Uint8ClampedArray([data[i], data[i + 1], data[i + 2]]));
    }
  }
  return pixels;
}

// --- Quantization (Modified Median Cut) ---

interface ColorBox {
  colors: Color[];
  count: number;
  rMin: number; rMax: number;
  gMin: number; gMax: number;
  bMin: number; bMax: number;
  volume: number;
}

function createBox(colors: Color[]): ColorBox {
  let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
  for (const c of colors) {
    rMin = Math.min(rMin, c.r); rMax = Math.max(rMax, c.r);
    gMin = Math.min(gMin, c.g); gMax = Math.max(gMax, c.g);
    bMin = Math.min(bMin, c.b); bMax = Math.max(bMax, c.b);
  }
  return {
    colors,
    count: colors.length,
    rMin, rMax, gMin, gMax, bMin, bMax,
    volume: (rMax - rMin + 1) * (gMax - gMin + 1) * (bMax - bMin + 1),
  };
}

function splitBox(box: ColorBox): [ColorBox, ColorBox] | null {
  // Find the channel with the greatest range
  const rRange = box.rMax - box.rMin;
  const gRange = box.gMax - box.gMin;
  const bRange = box.bMax - box.bMin;

  let sortChannel: "r" | "g" | "b";
  if (rRange >= gRange && rRange >= bRange) sortChannel = "r";
  else if (gRange >= rRange && gRange >= bRange) sortChannel = "g";
  else sortChannel = "b";

  // Sort by that channel
  const sorted = [...box.colors].sort((a, b) => a[sortChannel] - b[sortChannel]);
  const mid = Math.floor(sorted.length / 2);

  if (mid === 0 || mid === sorted.length) return null;

  return [createBox(sorted.slice(0, mid)), createBox(sorted.slice(mid))];
}

function quantize(pixels: Color[], colorCount: number): Color[] {
  if (pixels.length === 0) return [{ r: 0, g: 0, b: 0 }];
  if (pixels.length <= colorCount) return [...new Set(pixels.map(c => `${c.r},${c.g},${c.b}`))].map(s => {
    const [r, g, b] = s.split(",").map(Number);
    return { r, g, b };
  });

  // Build initial box
  let boxes: ColorBox[] = [createBox(pixels)];

  while (boxes.length < colorCount) {
    // Find the box with the largest volume
    let maxVolIdx = 0;
    let maxVol = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i]!.volume > maxVol) {
        maxVol = boxes[i]!.volume;
        maxVolIdx = i;
      }
    }

    if (maxVol === 0) break;

    const result = splitBox(boxes[maxVolIdx]!);
    if (!result) break;

    boxes.splice(maxVolIdx, 1, result[0], result[1]);
  }

  // Average each box to get representative color
  return boxes.map(box => {
    let r = 0, g = 0, b = 0;
    for (const c of box.colors) {
      r += c.r; g += c.g; b += c.b;
    }
    const n = box.colors.length;
    return {
      r: Math.round(r / n),
      g: Math.round(g / n),
      b: Math.round(b / n),
    };
  });
}

// --- Main API ---

/**
 * Extract the dominant color from an image.
 */
export async function getDominantColor(
  source: string | HTMLImageElement | HTMLCanvasElement | Blob,
  options?: ColorThiefOptions,
): Promise<Color> {
  const opts = { colorCount: 6, quality: 0.5, ignoreAlphaBelow: 10, ...options };
  const img = await loadImage(source);
  const rawPixels = getPixelData(img, opts.quality!, opts.ignoreAlphaBelow!);
  const pixels: Color[] = rawPixels.map(p => ({ r: p[0], g: p[1], b: p[2] }));
  const palette = quantize(pixels, 1);
  return palette[0]!;
}

/**
 * Extract a color palette from an image.
 * Returns N most representative colors.
 */
export async function getPalette(
  source: string | HTMLImageElement | HTMLCanvasElement | Blob,
  colorCount?: number,
  options?: Omit<ColorThiefOptions, "colorCount">,
): Promise<Color[]> {
  const opts = { colorCount: colorCount ?? 6, quality: 0.5, ignoreAlphaBelow: 10, ...options };
  const img = await loadImage(source);
  const rawPixels = getPixelData(img, opts.quality!, opts.ignoreAlphaBelow!);
  const pixels: Color[] = rawPixels.map(p => ({ r: p[0], g: p[1], b: p[2] }));
  return quantize(pixels, opts.colorCount!);
}

/**
 * Extract a palette with frequency counts.
 */
export async function getPaletteWithCounts(
  source: string | HTMLImageElement | HTMLCanvasElement | Blob,
  colorCount?: number,
  options?: Omit<ColorThiefOptions, "colorCount">,
): Promise<ColorWithCount[]> {
  const opts = { colorCount: colorCount ?? 6, quality: 0.5, ignoreAlphaBelow: 10, ...options };
  const img = await loadImage(source);
  const rawPixels = getPixelData(img, opts.quality!, opts.ignoreAlphaBelow!);
  const pixels: Color[] = rawPixels.map(p => ({ r: p[0], g: p[1], b: p[2] }));

  // Count frequencies before quantization
  const freqMap = new Map<string, number>();
  for (const p of pixels) {
    const key = `${p.r},${p.g},${p.b}`;
    freqMap.set(key, (freqMap.get(key) ?? 0) + 1);
  }

  const palette = quantize(pixels, opts.colorCount!);

  // Assign each palette color its nearest pixel's total count
  return palette.map(pc => {
    let bestDist = Infinity;
    let bestKey = "";
    for (const [key] of freqMap) {
      const [r, g, b] = key.split(",").map(Number);
      const d = colorDistance(pc, { r, g, b });
      if (d < bestDist) { bestDist = d; bestKey = key; }
    }
    return { ...pc, count: freqMap.get(bestKey) ?? 0 };
  });
}

/**
 * Get detailed color analysis of an image.
 */
export async function getColorAnalysis(
  source: string | HTMLImageElement | HTMLCanvasElement | Blob,
  options?: ColorThiefOptions,
): Promise<{
  dominant: Color;
  palette: Color[];
  averageBrightness: number;
  isDark: boolean;
  contrastRatio: number;
}> {
  const opts = { colorCount: 6, quality: 0.3, ignoreAlphaBelow: 10, ...options };
  const img = await loadImage(source);
  const rawPixels = getPixelData(img, opts.quality!, opts.ignoreAlphaBelow!);
  const pixels: Color[] = rawPixels.map(p => ({ r: p[0], g: p[1], b: p[2] }));

  const dominant = (await getDominantColor(img, opts))!;
  const palette = quantize(pixels, opts.colorCount!);

  // Average brightness
  let totalLum = 0;
  for (const p of pixels) {
    totalLum += (p.r * 299 + p.g * 587 + p.b * 114) / 1000;
  }
  const avgBrightness = pixels.length > 0 ? totalLum / pixels.length : 128;
  const isDark = avgBrightness < 128;

  // Contrast ratio between dominant and white/black
  const lumD = (dominant.r * 299 + dominant.g * 587 + dominant.b * 114) / 1000 / 255;
  const lighter = Math.max(lumD, 1 - lumD);
  const darker = Math.min(lumD, 1 - lumD);
  const contrastRatio = (lighter + 0.05) / (darker + 0.05);

  return { dominant, palette, averageBrightness: avgBrightness, isDark, contrastRatio };
}

/**
 * Generate a complementary color scheme from a base color.
 */
export function generateScheme(base: Color, type: "complementary" | "analogous" | "triadic" | "split" | "tetradic" = "analogous"): Color[] {
  const [h, s, l] = rgbToHsl(base.r, base.g, base.b);

  function hslToRgb(hue: number, sat: number, light: number): Color {
    const hNorm = hue / 360;
    const sNorm = sat / 100;
    const lNorm = light / 100;

    let r: number, g: number, b: number;
    if (sNorm === 0) {
      r = g = b = lNorm;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
      const p = 2 * lNorm - q;
      r = hue2rgb(p, q, hNorm + 1/3);
      g = hue2rgb(p, q, hNorm);
      b = hue2rgb(p, q, hNorm - 1/3);
    }

    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  switch (type) {
    case "complementary":
      return [base, hslToRgb(h + 180, s, l)];
    case "analogous":
      return [
        base,
        hslToRgb(h - 30, s, l),
        hslToRgb(h + 30, s, l),
      ];
    case "triadic":
      return [
        base,
        hslToRgb(h + 120, s, l),
        hslToRgb(h + 240, s, l),
      ];
    case "split":
      return [
        base,
        hslToRgb(h + 150, s, l),
        hslToRgb(h + 210, s, l),
      ];
    case "tetradic":
      return [
        base,
        hslToRgb(h + 90, s, l),
        hslToRgb(h + 180, s, l),
        hslToRgb(h + 270, s, l),
      ];
  }
}

/** Convert a Color to CSS string */
export { colorToString as colorToCss, colorToHex };

/** Parse a CSS color string into a Color object */
export function parseColor(cssColor: string): Color | null {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = cssColor;
  const match = ctx.fillStyle.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
}
