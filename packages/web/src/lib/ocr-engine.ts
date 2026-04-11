/**
 * OCR Engine: Lightweight optical character recognition for browser environments.
 * Supports text extraction from images, PDFs, and canvas elements.
 * Uses Tesseract.js via CDN with fallback to canvas-based detection.
 */

// --- Types ---

export interface OcrRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  confidence?: number;
}

export interface OcrResult {
  /** Full extracted text */
  text: string;
  /** Individual words/lines with positions */
  words: OcrWord[];
  /** Detected language */
  language: string;
  /** Overall confidence (0-1) */
  confidence: number;
  /** Processing time in ms */
  elapsedMs: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  boundingBox: {
    x0: number; y0: number;
    x1: number; y1: number;
  };
  /** Line number (0-indexed) */
  lineIndex: number;
}

export interface OcrOptions {
  /** Image source: URL, File, Blob, HTMLImageElement, HTMLCanvasElement, or ImageBitmap */
  source: string | File | Blob | HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  /** Language(s) for recognition (default: "eng") */
  languages?: string | string[];
  /** Only recognize specific region? */
  region?: OcrRegion;
  /** Enable word-level bounding boxes? */
  enableBoundingBoxes?: boolean;
  /** Worker source URL for Tesseract.js */
  workerSrc?: string;
  /** Callback on progress (0-1) */
  onProgress?: (progress: number, status: string) => void;
  /** Callback when complete */
  onComplete?: (result: OcrResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Use lightweight mode (faster, less accurate)? */
  fastMode?: boolean;
  /** Pre-process image (binarize, denoise)? */
  preprocess?: boolean;
  /** Minimum word confidence threshold (0-1) */
  minConfidence?: number;
}

export interface OcrInstance {
  /** Current result (null if not yet processed) */
  result: OcrResult | null;
  /** Is currently processing? */
  isProcessing: boolean;
  /** Recognize text from the configured source */
  recognize: () => Promise<OcrResult>;
  /** Re-run OCR with new options */
  reconfigure: (options: Partial<OcrOptions>) => void;
  /** Get detected regions of interest */
  getRegions: () => OcrRegion[];
  /** Extract text from a specific region */
  recognizeRegion: (region: OcrRegion) => Promise<string>;
  /** Cancel current processing */
  cancel: () => void;
  /** Destroy and cleanup resources */
  destroy: () => void;
}

// --- Constants ---

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.mjs";
const DEFAULT_LANG = "eng";

// --- Main Factory ---

export function createOcrEngine(options: OcrOptions): OcrInstance {
  const opts = {
    languages: options.languages ?? DEFAULT_LANG,
    enableBoundingBoxes: options.enableBoundingBoxes ?? true,
    fastMode: options.fastMode ?? false,
    preprocess: options.preprocess ?? true,
    minConfidence: options.minConfidence ?? 0.3,
    ...options,
  };

  let result: OcrResult | null = null;
  let isProcessing = false;
  let cancelled = false;
  let workerInstance: unknown = null;

  const instance: OcrInstance = {
    result,
    isProcessing,

    async recognize(): Promise<OcrResult> {
      if (isProcessing) throw new Error("OCR already in progress");
      isProcessing = true;
      cancelled = false;
      const startTime = performance.now();

      try {
        // Get image element
        const imageEl = await resolveImageSource(opts.source);

        // Preprocess image
        let processImage = imageEl;
        if (opts.preprocess && !opts.fastMode) {
          processImage = preprocessImage(imageEl);
        }

        // Try Tesseract.js first
        let ocrResult: OcrResult;
        if (!opts.fastMode) {
          ocrResult = await recognizeWithTesseract(processImage);
        } else {
          ocrResult = await recognizeWithCanvas(processImage);
        }

        result = ocrResult;
        opts.onComplete?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        opts.onError?.(error);
        throw error;
      } finally {
        isProcessing = false;
      }
    },

    reconfigure(newOpts: Partial<OcrOptions>) {
      Object.assign(opts, newOpts);
    },

    getRegions(): OcrRegion[] {
      if (!result || !opts.enableBoundingBoxes) return [];
      // Group words into text blocks/regions
      const regions: OcrRegion[] = [];
      const lines = groupWordsByLine(result.words);

      for (const lineWords of lines) {
        if (lineWords.length === 0) continue;
        const minX = Math.min(...lineWords.map((w) => w.boundingBox.x0));
        const minY = Math.min(...lineWords.map((w) => w.boundingBox.y0));
        const maxX = Math.max(...lineWords.map((w) => w.boundingBox.x1));
        const maxY = Math.max(...lineWords.map((w) => w.boundingBox.y1));

        regions.push({
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          text: lineWords.map((w) => w.text).join(" "),
          confidence: average(lineWords.map((w) => w.confidence)),
        });
      }

      return regions;
    },

    async recognizeRegion(region: OcrRegion): Promise<string> {
      const imageEl = await resolveImageSource(opts.source);
      const cropped = cropToRegion(imageEl, region);

      if (!opts.fastMode) {
        const r = await recognizeWithTesseract(cropped);
        return r.text;
      }
      return recognizeWithCanvas(cropped).then((r) => r.text);
    },

    cancel() {
      cancelled = true;
      if (workerInstance) {
        try { (workerInstance as any).terminate?.(); } catch { /* ignore */ }
        workerInstance = null;
      }
    },

    destroy() {
      instance.cancel();
      result = null;
    },
  };

  return instance;
}

// --- Image Source Resolution ---

async function resolveImageSource(
  source: OcrOptions["source"]
): Promise<HTMLCanvasElement> {
  if (source instanceof HTMLCanvasElement) return source;

  const img = new Image();
  img.crossOrigin = "anonymous";

  if (typeof source === "string") {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${source}`));
      img.src = source;
    });
  } else if (source instanceof File || source instanceof Blob) {
    const url = URL.createObjectURL(source);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => { URL.revokeObjectURL(url); resolve(); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image blob")); };
      img.src = url;
    });
  } else if (source instanceof HTMLImageElement) {
    // Already loaded
  } else if (source instanceof ImageBitmap) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(source, 0, 0);
    return canvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  return canvas;
}

// --- Image Preprocessing ---

function preprocessImage(source: HTMLCanvasElement): HTMLCanvasElement {
  const srcCtx = source.getContext("2d")!;
  const imageData = srcCtx.getImageData(0, 0, source.width, source.height);
  const data = imageData.data;

  // Convert to grayscale + binarize (Otsu-like adaptive threshold)
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    histogram[gray]++;
  }

  // Simple global thresholding (mean-based)
  let sum = 0, count = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
    count += histogram[i];
  }
  const threshold = sum / count;

  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] > threshold ? 255 : 0;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }

  srcCtx.putImageData(imageData, 0, 0);
  return source;
}

function cropToRegion(
  source: HTMLImageElement | HTMLCanvasElement,
  region: OcrRegion
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = region.width;
  canvas.height = region.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
  return canvas;
}

// --- Tesseract.js Integration ---

async function recognizeWithTesseract(canvas: HTMLCanvasElement): Promise<OcrResult> {
  const startTime = performance.now();

  // Dynamically import Tesseract.js
  if (typeof (globalThis as any).Tesseract === "undefined") {
    await injectTesseract();
  }

  const Tesseract = (globalThis as any).Tesseract;
  const langStr = Array.isArray(opts.languages) ? opts.languages.join("+") : opts.languages;

  const worker = await Tesseract.createWorker(langStr, undefined, {
    logger: (m: { status: string; progress: number }) => {
      opts.onProgress?.(m.progress, m.status);
    },
  });

  workerInstance = worker;

  const { data } = await worker.recognize(canvas);
  await worker.terminate();
  workerInstance = null;

  const words: OcrWord[] = (data.words as unknown[]).map((w: any, idx: number) => ({
    text: w.text ?? "",
    confidence: w.confidence ?? 0,
    boundingBox: w.boundingBox ?? { x0: 0, y0: 0, x1: 0, y1: 0 },
    lineIndex: w.lineIndex ?? 0,
  })).filter((w: OcrWord) => w.confidence >= opts.minConfidence);

  const elapsed = performance.now() - startTime;

  return {
    text: data.text ?? "",
    words,
    language: langStr,
    confidence: data.confidence ?? average(words.map((w) => w.confidence)),
    elapsedMs: Math.round(elapsed),
  };
}

async function injectTesseract(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((globalThis as any).Tesseract) { resolve(); return; }

    const script = document.createElement("script");
    script.src = TESSERACT_CDN;
    script.type = "module";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Tesseract.js"));
    document.head.appendChild(script);
  });
}

// --- Canvas-Based Fallback (Lightweight) ---

/**
 * Very basic text detection using connected component analysis.
 * Not a real OCR — provides rough text area detection.
 * For production use, always prefer Tesseract.js.
 */
async function recognizeWithCanvas(canvas: HTMLCanvasElement): Promise<OcrResult> {
  const startTime = performance.now();

  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Detect text-like regions (dark areas on light background)
  const regions = detectTextRegions(data, canvas.width, canvas.height);

  // Build mock result
  const words: OcrWord[] = regions.map((r, idx) => ({
    text: "[detected]",
    confidence: r.confidence,
    boundingBox: { x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h },
    lineIndex: idx,
  }));

  const elapsed = performance.now() - startTime;

  return {
    text: `Detected ${regions.length} text region(s)`,
    words,
    language: "unknown",
    confidence: regions.length > 0 ? 0.5 : 0,
    elapsedMs: Math.round(elapsed),
  };
}

interface TextRegion {
  x: number; y: number; w: number; h: number; confidence: number;
}

function detectTextRegions(data: Uint8ClampedArray, width: number, height: number): TextRegion[] {
  const visited = new Uint8Array(width * height);
  const regions: TextRegion[] = [];
  const threshold = 128;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

      if (brightness < threshold && visited[y * width + x] === 0) {
        // Flood fill to find connected dark region
        const region = floodFill(data, visited, width, height, x, y, threshold);

        // Filter: must be text-sized (not too small, not too large)
        const aspectRatio = region.w / region.h;
        const area = region.w * region.h;
        if (area > 20 && area < width * height * 0.5 &&
            aspectRatio > 0.05 && aspectRatio < 50 &&
            region.h > 5 && region.h < height * 0.8) {
          regions.push(region);
        }
      }
    }
  }

  return regions.sort((a, b) => a.y - b.y || a.x - b.x);
}

function floodFill(
  data: Uint8ClampedArray,
  visited: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
  threshold: number
): TextRegion {
  const stack: [number, number][] = [[startX, startY]];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  let pixelCount = 0;
  let totalBrightness = 0;

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[y * width + x] !== 0) continue;

    const idx = (y * width + x) * 4;
    const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

    if (brightness >= threshold) continue;

    visited[y * width + x] = 1;
    pixelCount++;
    totalBrightness += brightness;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);

    // 4-connectivity
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
  const confidence = Math.max(0, 1 - avgBrightness / threshold);

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// --- Utilities ---

function groupWordsByLine(words: OcrWord[]): OcrWord[][] {
  if (words.length === 0) return [];

  const lines: OcrWord[][] = [[words[0]!]];

  for (let i = 1; i < words.length; i++) {
    const word = words[i]!;
    const prevLine = lines[lines.length - 1]!;
    const lastWord = prevLine[prevLine.length - 1]!;

    // Same line if Y overlap and X after previous word
    const yOverlap = Math.abs(word.boundingBox.y0 - lastWord.boundingBox.y0) <
      (lastWord.boundingBox.y1 - lastWord.boundingBox.y0) * 0.7;

    if (yOverlap && word.boundingBox.x0 > lastWord.boundingBox.x1) {
      prevLine.push(word);
    } else {
      lines.push([word]);
    }
  }

  return lines;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
