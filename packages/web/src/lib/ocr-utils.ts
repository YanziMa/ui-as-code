/**
 * OCR (Optical Character Recognition) utilities and text extraction from images.
 * Uses Canvas API for basic pixel analysis and Tesseract.js integration pattern.
 */

export interface OCRResult {
  text: string;
  confidence: number;
  words: OCRWord[];
  lines: OCRLine[];
  language: string;
}

export interface OCRWord {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface OCRLine {
  text: string;
  words: OCRWord[];
  boundingBox: BoundingBox;
}

export interface BoundingBox {
  x0: number; y0: number;
  x1: number; y1: number;
}

export interface OCREngineConfig {
  language?: string;
  oem?: "default" | "lstm_only" | "legacy";
  psm?: number;
  whitelist?: string; // Allowed characters
  blacklist?: string; // Disallowed characters
}

// --- Basic canvas-based text detection (no external dependency) ---

/** Detect if an image region likely contains text using pixel analysis */
export async function detectTextRegion(
  source: string | HTMLCanvasElement | File | Blob,
): Promise<{ hasText: boolean; confidence: number; regions: Array<{ x: number; y: number; w: number; h: number }> }> {
  const canvas = typeof source === "string"
    ? await imageToCanvas(source)
    : source instanceof HTMLCanvasElement
      ? source
      : await imageToCanvas(source);

  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;

  // Downsample for performance
  const scale = Math.min(1, Math.max(width, height) / 500);
  const sw = Math.round(width * scale);
  const sh = Math.round(height * scale);

  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = sw;
  tmpCanvas.height = sh;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  tmpCtx.drawImage(canvas, 0, 0, sw, sh);

  const imageData = tmpCtx.getImageData(0, 0, sw, sh);
  const data = imageData.data;

  // Convert to grayscale and calculate edge density
  const edges = new Uint8Array(sw * sh);
  let totalEdges = 0;

  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      const idx = (y * sw + x) * 4;
      const gray = (data[idx]! * 0.299 + data[idx + 1]! * 0.587 + data[idx + 2]! * 0.114);

      // Sobel edge detection
      const gx =
        -data[((y - 1) * sw + x - 1) * 4]! * 0.299 +
        data[((y - 1) * sw + x + 1) * 4]! * 0.299 +
        -2 * data[(y * sw + x - 1) * 4]! * 0.299 +
        2 * data[(y * sw + x + 1) * 4]! * 0.299 +
        -data[((y + 1) * sw + x - 1) * 4]! * 0.299 +
        data[((y + 1) * sw + x + 1) * 4]! * 0.299;

      const gy =
        -data[((y - 1) * sw + x - 1) * 4]! * 0.299 +
        -2 * data[((y - 1) * sw + x) * 4]! * 0.299 +
        -data[((y - 1) * sw + x + 1) * 4]! * 0.299 +
        data[((y + 1) * sw + x - 1) * 4]! * 0.299 +
        2 * data[((y + 1) * sw + x) * 4]! * 0.299 +
        data[((y + 1) * sw + x + 1) * 4]! * 0.299;

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      if (magnitude > 30) {
        edges[y * sw + x] = 1;
        totalEdges++;
      }
    }
  }

  const edgeDensity = totalEdges / (sw * sh);

  // Text typically has moderate-to-high edge density
  // Too low = blank/gradient, too high = photo/texture
  const hasText = edgeDensity > 0.02 && edgeDensity < 0.35;
  const confidence = hasText ? Math.min(1, edgeDensity * 5) : Math.max(0, 1 - edgeDensity * 3);

  // Find connected components as potential text regions
  const regions = findTextRegions(edges, sw, sh, scale);

  return { hasText, confidence, regions };
}

function imageToCanvas(src: string | File | Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d")!.drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = reject;
    if (typeof src === "string") { img.src = src; }
    else { img.src = URL.createObjectURL(src); }
  });
}

function findTextRegions(
  edges: Uint8Array, width: number, height: number, scale: number,
): Array<{ x: number; y: number; w: number; h: number }> {
  const visited = new Uint8Array(width * height);
  const regions: Array<{ x: number; y: number; w: number; h: number }> = [];
  const minSize = 20; // Minimum pixels to be considered a region

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] && !visited[y * width + x]) {
        const pixels: number[] = [];
        floodFill(edges, visited, width, height, x, y, pixels);

        if (pixels.length >= minSize) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const idx of pixels) {
            const px = idx % width;
            const py = Math.floor(idx / width);
            minX = Math.min(minX, px); minY = Math.min(minY, py);
            maxX = Math.max(maxX, px); maxY = Math.max(maxY, py);
          }

          const rw = maxX - minX + 1;
          const rh = maxY - minY + 1;
          // Filter by aspect ratio (text is usually wider than tall or roughly square)
          const aspectRatio = rw / rh;
          if (aspectRatio > 0.15 && aspectRatio < 15 && rh > 2) {
            regions.push({
              x: Math.round(minX / scale),
              y: Math.round(minY / scale),
              w: Math.round(rw / scale),
              h: Math.round(rh / scale),
            });
          }
        }
      }
    }
  }

  return mergeOverlappingRegions(regions);
}

function floodFill(
  edges: Uint8Array, visited: Uint8Array,
  w: number, h: number, sx: number, sy: number, result: number[],
): void {
  const stack = [sy * w + sx];
  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (idx < 0 || idx >= w * h) continue;
    if (visited[idx] || !edges[idx]) continue;
    visited[idx] = 1;
    result.push(idx);

    const x = idx % w;
    const y = Math.floor(idx / w);
    if (x > 0) stack.push(idx - 1);
    if (x < w - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - w);
    if (y < h - 1) stack.push(idx + w);
  }
}

function mergeOverlappingRegions(
  regions: Array<{ x: number; y: number; w: number; h: number }>,
): Array<{ x: number; y: number; w: number; h: number }> {
  if (regions.length <= 1) return regions;

  const merged: typeof regions = [];
  const used = new Set<number>();

  for (let i = 0; i < regions.length; i++) {
    if (used.has(i)) continue;
    let r = { ...regions[i]! };

    for (let j = i + 1; j < regions.length; j++) {
      if (used.has(j)) continue;
      const other = regions[j]!;

      // Check overlap with small gap tolerance
      const gap = 10;
      const overlapX = r.x < other.x + other.w + gap && r.x + r.w + gap > other.x;
      const overlapY = r.y < other.y + other.h + gap && r.y + r.h + gap > other.y;

      if (overlapX && overlapY) {
        r.x = Math.min(r.x, other.x);
        r.y = Math.min(r.y, other.y);
        r.w = Math.max(r.x + r.w, other.x + other.w) - r.x;
        r.h = Math.max(r.y + r.h, other.y + other.h) - r.y;
        used.add(j);
      }
    }

    merged.push(r);
  }

  return merged;
}

// --- Image preprocessing for OCR ---

/** Preprocess image for better OCR results */
export async function preprocessForOCR(
  source: string | HTMLCanvasElement | File | Blob,
  options: {
    grayscale?: boolean;
    binarize?: boolean;
    threshold?: number;
    denoise?: boolean;
    scale?: number;
    deskew?: boolean;
  } = {},
): Promise<HTMLCanvasElement> {
  const {
    grayscale = true,
    binarize = true,
    threshold = 128,
    denoise = true,
    scale = 2,
    deskew = false,
  } = options;

  const canvas = typeof source === "string"
    ? await imageToCanvas(source)
    : source instanceof HTMLCanvasElement ? source : await imageToCanvas(source);

  const origW = canvas.width;
  const origH = canvas.height;
  const targetW = Math.round(origW * scale);
  const targetH = Math.round(origH * scale);

  const resultCanvas = document.createElement("canvas");
  resultCanvas.width = targetW;
  resultCanvas.height = targetH;
  const ctx = resultCanvas.getContext("2d")!;

  // Scale up for better resolution
  ctx.drawImage(canvas, 0, 0, targetW, targetH);

  let imageData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imageData.data;

  // Grayscale conversion
  if (grayscale) {
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i]! * 0.299 + data[i + 1]! * 0.587 + data[i + 2]! * 0.114;
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  }

  // Denoise (simple median-like filter)
  if (denoise) {
    imageData = applyDenoise(imageData, targetW, targetH);
  }

  // Binarization (thresholding)
  if (binarize) {
    for (let i = 0; i < data.length; i += 4) {
      const val = data[i]! > threshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return resultCanvas;
}

function applyDenoise(imageData: ImageData, w: number, h: number): ImageData {
  const data = imageData.data;
  const output = new Uint8ClampedArray(data.length);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      // Simple 3x3 average filter
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += data[((y + dy) * w + (x + dx)) * 4]!;
        }
      }
      const avg = sum / 9;
      output[idx] = avg;
      output[idx + 1] = avg;
      output[idx + 2] = avg;
      output[idx + 3] = data[idx + 3]!;
    }
  }

  return new ImageData(output, w, h);
}

// --- Text layout analysis ---

/** Analyze text line structure from binary image */
export function analyzeTextLayout(
  canvas: HTMLCanvasElement,
): { lines: Array<{ y: number; height: number; estimatedChars: number }>; columnCount: number } {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Project horizontal histogram (count black pixels per row)
  const rowHist = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx]! < 128) rowHist[y]++;
    }
  }

  // Find text lines (rows with significant pixel count)
  const lines: Array<{ y: number; height: number; estimatedChars: number }> = [];
  let inLine = false;
  let lineStart = 0;
  let linePixels = 0;
  const threshold = width * 0.01; // At least 1% of row should have text

  for (let y = 0; y < height; y++) {
    if (rowHist[y]! > threshold) {
      if (!inLine) { lineStart = y; inLine = true; }
      linePixels += rowHist[y]!;
    } else if (inLine) {
      const lineHeight = y - lineStart;
      // Estimate character count from average stroke width
      const avgStrokeWidth = linePixels / (lineHeight * width);
      const estChars = Math.round(linePixels / (lineHeight * 6)); // Rough estimate
      lines.push({ y: lineStart, height: lineHeight, estimatedChars: Math.max(estChars, 1) });
      inLine = false;
      linePixels = 0;
    }
  }

  // Handle last line
  if (inLine) {
    const lineHeight = height - lineStart;
    lines.push({ y: lineStart, height: lineHeight, estimatedChars: Math.round(linePixels / (lineHeight * 6)) });
  }

  // Estimate columns from vertical projection of first few lines
  let columnCount = 1;
  if (lines.length >= 2) {
    const sampleLines = lines.slice(0, Math.min(lines.length, 5));
    const colGaps: number[] = [];

    for (const line of sampleLines) {
      const colHist = new Uint32Array(width);
      for (let y = line.y; y < line.y + line.height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (data[idx]! < 128) colHist[x]++;
        }
      }

      // Find gaps (columns with very low pixel count)
      let inGap = false;
      for (let x = width * 0.1; x < width * 0.9; x++) {
        if (colHist[x]! < line.height * 0.1) {
          if (!inGap) { colGaps.push(x); inGap = true; }
        } else {
          inGap = false;
        }
      }
    }

    // If we found consistent gaps, it's multi-column
    if (colGaps.length >= 2) columnCount = Math.min(colGaps.length + 1, 4);
  }

  return { lines, columnCount };
}

// --- PDF text extraction placeholder ---

/** Extract text from a PDF file (requires pdf.js integration) */
export async function extractTextFromPDF(file: File): Promise<string> {
  // This would integrate with pdf.js in production
  // For now, return a placeholder that indicates integration point
  console.warn("[OCR] PDF text extraction requires pdf.js integration");
  return `PDF: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
}

// --- Utility functions ---

/** Calculate OCR accuracy metrics */
export function calculateAccuracy(expected: string, actual: string): {
  characterAccuracy: number;
  wordAccuracy: number;
  levenshteinDistance: number;
} {
  const charAcc = characterLevelAccuracy(expected, actual);
  const wordAcc = wordLevelAccuracy(expected, actual);
  const dist = levenshtein(expected, actual);

  return {
    characterAccuracy: charAcc,
    wordAccuracy: wordAcc,
    levenshteinDistance: dist,
  };
}

function characterLevelAccuracy(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  let matches = 0;
  for (let i = 0; i < maxLen; i++) {
    if (a[i]?.toLowerCase() === b[i]?.toLowerCase()) matches++;
  }
  return matches / maxLen;
}

function wordLevelAccuracy(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(Boolean);
  const wordsB = b.toLowerCase().split(/\s+/).filter(Boolean);
  if (wordsA.length === 0 && wordsB.length === 0) return 1;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  let matches = 0;
  for (const wa of wordsA) {
    if (wordsB.includes(wa)) matches++;
  }
  return matches / Math.max(wordsA.length, wordsB.length);
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0]![j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  return matrix[b.length]![a.length]!;
}
