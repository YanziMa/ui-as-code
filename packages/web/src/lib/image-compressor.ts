/**
 * Image Compressor: Browser-side image compression and resizing utility.
 * Supports multiple formats (JPEG, PNG, WebP), quality control,
 * dimension constraints, EXIF orientation handling, and batch processing.
 */

// --- Types ---

export type ImageFormat = "jpeg" | "png" | "webp";

export interface CompressOptions {
  /** Source image: File, Blob, URL string, or data URI */
  input: File | Blob | string;
  /** Output format (default: same as input, or jpeg) */
  format?: ImageFormat;
  /** Quality 0-1 (default: 0.8 for lossy formats) */
  quality?: number;
  /** Max width in px (default: no limit) */
  maxWidth?: number;
  /** Max height in px (default: no limit) */
  maxHeight?: number;
  /** Target file size in bytes (optional, will iteratively adjust quality) */
  maxSizeBytes?: number;
  /** Whether to preserve EXIF data (default: true) */
  preserveExif?: boolean;
  /** Whether to auto-rotate based on EXIF orientation (default: true) */
  autoRotate?: boolean;
  /** Return as File object instead of Blob? */
  asFile?: boolean;
  /** Filename for output File (when asFile=true) */
  fileName?: string;
  /** Progress callback (0-1) */
  onProgress?: (progress: number) => void;
}

export interface CompressResult {
  /** Compressed output (Blob by default, File if asFile=true) */
  output: Blob | File;
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio (e.g., 0.65 means 35% smaller) */
  ratio: number;
  /** Original dimensions */
  originalDimensions: { width: number; height: number };
  /** New dimensions */
  newDimensions: { width: number; height: number };
  /** Output MIME type */
  mimeType: string;
  /** Compression time in ms */
  elapsedMs: number;
}

export interface BatchCompressOptions {
  /** Array of inputs to compress */
  inputs: (File | Blob | string)[];
  /** Shared compress options (applied to each) */
  options?: Omit<CompressOptions, "input" | "onProgress">;
  /** Overall progress callback */
  onProgress?: (completed: number, total: number) => void;
  /** Process one at a time (true) or parallel (false)? */
  sequential?: boolean;
}

export interface BatchCompressResult {
  results: CompressResult[];
  totalOriginalSize: number;
  totalCompressedSize: number;
  overallRatio: number;
  elapsedMs: number;
}

// --- Constants ---

const DEFAULT_QUALITY = 0.8;
const MAX_ITERATIONS = 10;
const QUALITY_STEP = 0.1;

// --- Main API ---

/**
 * Compress a single image.
 */
export async function compressImage(options: CompressOptions): Promise<CompressResult> {
  const startTime = performance.now();

  const opts: Required<Pick<CompressOptions, "quality" | "preserveExif" | "autoRotate">> & CompressOptions = {
    quality: options.quality ?? DEFAULT_QUALITY,
    preserveExif: options.preserveExif ?? true,
    autoRotate: options.autoRotate ?? true,
    ...options,
  };

  // Load image
  const img = await loadImage(opts.input);
  const originalDimensions = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };

  // Determine output dimensions
  let { width, height } = calculateDimensions(
    originalDimensions.width,
    originalDimensions.height,
    opts.maxWidth,
    opts.maxHeight
  );

  // Determine format
  const format = opts.format ?? detectFormat(opts.input);

  // Create canvas and draw
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Auto-rotate based on EXIF if needed
  if (opts.autoRotate) {
    const orientation = await getExifOrientation(opts.input);
    applyExifOrientation(ctx, img, width, height, orientation);
  } else {
    ctx.drawImage(img, 0, 0, width, height);
  }

  opts.onProgress?.(0.5);

  // If target size specified, iterate to find optimal quality
  let quality = opts.quality;
  let blob: Blob;

  if (opts.maxSizeBytes) {
    const result = await findOptimalQuality(canvas, format, opts.maxSizeBytes, quality);
    blob = result.blob;
    quality = result.quality;
  } else {
    blob = await canvasToBlob(canvas, format, quality);
  }

  opts.onProgress?.(1);

  // Wrap as File if requested
  let output: Blob | File = blob;
  if (opts.asFile) {
    const name = opts.fileName ?? (opts.input instanceof File ? opts.input.name : "image.jpg");
    output = new File([blob], name, { type: getMimeType(format) });
  }

  const originalSize = getInputSize(opts.input);
  const elapsed = performance.now() - startTime;

  return {
    output,
    originalSize,
    compressedSize: blob.size,
    ratio: blob.size / originalSize,
    originalDimensions,
    newDimensions: { width, height },
    mimeType: getMimeType(format),
    elapsedMs: Math.round(elapsed),
  };
}

/**
 * Compress multiple images in batch.
 */
export async function batchCompressImages(options: BatchCompressOptions): Promise<BatchCompressResult> {
  const startTime = performance.now();
  const results: CompressResult[] = [];

  if (options.sequential) {
    for (let i = 0; i < options.inputs.length; i++) {
      const result = await compressImage({
        input: options.inputs[i]!,
        ...options.options,
        onProgress: undefined,
      });
      results.push(result);
      options.onProgress?.(i + 1, options.inputs.length);
    }
  } else {
    const promises = options.inputs.map((input, i) =>
      compressImage({ input, ...options.options }).then((r) => {
        options.onProgress?.(i + 1, options.inputs.length);
        return r;
      })
    );
    const resolved = await Promise.all(promises);
    results.push(...resolved);
  }

  const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
  const totalCompressedSize = results.reduce((sum, r) => sum + r.compressedSize, 0);
  const elapsed = performance.now() - startTime;

  return {
    results,
    totalOriginalSize,
    totalCompressedSize,
    overallRatio: totalCompressedSize / totalOriginalSize,
    elapsedMs: Math.round(elapsed),
  };
}

/**
 * Quick resize without compression (returns canvas).
 */
export async function resizeImage(
  input: File | Blob | string,
  maxWidth?: number,
  maxHeight?: number
): Promise<HTMLCanvasElement> {
  const img = await loadImage(input);
  const { width, height } = calculateDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    maxWidth,
    maxHeight
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const orientation = await getExifOrientation(input);
  applyExifOrientation(ctx, img, width, height, orientation);

  return canvas;
}

/**
 * Convert image to base64 data URI.
 */
export async function imageToDataUri(
  input: File | Blob | string,
  format: ImageFormat = "jpeg",
  quality: number = 0.8
): Promise<string> {
  const result = await compressImage({ input, format, quality });
  return URL.createObjectURL(result.output);
}

/**
 * Get image info without loading fully into memory.
 */
export async function getImageInfo(input: File | Blob | string): Promise<{
  width: number;
  height: number;
  format: ImageFormat;
  size: number;
}> {
  const img = await loadImage(input);
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    format: detectFormat(input),
    size: getInputSize(input),
  };
}

// --- Internal Helpers ---

async function loadImage(input: File | Blob | string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  return new Promise((resolve, reject) => {
    const cleanup = (url?: string) => { if (url) URL.revokeObjectURL(url); };

    if (typeof input === "string") {
      if (input.startsWith("data:") || input.startsWith("blob:")) {
        img.src = input;
      } else {
        img.src = input;
      }
    } else {
      const url = URL.createObjectURL(input);
      img.onload = () => { cleanup(url); resolve(img); };
      img.onerror = () => { cleanup(url); reject(new Error("Failed to load image")); };
      img.src = url;
      return; // wait for onload
    }

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image`));
  });
}

function calculateDimensions(
  origW: number,
  origH: number,
  maxW?: number,
  maxH?: number
): { width: number; height: number } {
  let w = origW;
  let h = origH;

  if (maxW && w > maxW) {
    h = Math.round(h * (maxW / w));
    w = maxW;
  }
  if (maxH && h > maxH) {
    w = Math.round(w * (maxH / h));
    h = maxH;
  }

  return { width: Math.max(1, w), height: Math.max(1, h) };
}

function detectFormat(input: File | Blob | string): ImageFormat {
  if (input instanceof File) {
    const ext = input.name.split(".").pop()?.toLowerCase();
    if (ext === "png") return "png";
    if (ext === "webp") return "webp";
    return "jpeg";
  }
  if (input instanceof Blob) {
    if (input.type === "image/png") return "png";
    if (input.type === "image/webp") return "webp";
    return "jpeg";
  }
  if (typeof input === "string") {
    if (input.includes("image/png")) return "png";
    if (input.includes("image/webp")) return "webp";
    return "jpeg";
  }
  return "jpeg";
}

function getMimeType(format: ImageFormat): string {
  switch (format) {
    case "png": return "image/png";
    case "webp": return "image/webp";
    default: return "image/jpeg";
  }
}

function getInputSize(input: File | Blob | string): number {
  if (input instanceof File || input instanceof Blob) return input.size;
  return 0; // Can't determine size for URLs
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error("Canvas toBlob failed")),
      getMimeType(format),
      quality
    );
  });
}

async function findOptimalQuality(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  targetSize: number,
  initialQuality: number
): Promise<{ blob: Blob; quality: number }> {
  let quality = initialQuality;
  let blob = await canvasToBlob(canvas, format, quality);

  if (blob.size <= targetSize) return { blob, quality };

  // Binary search for optimal quality
  let lo = 0;
  let hi = quality;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    quality = (lo + hi) / 2;
    blob = await canvasToBlob(canvas, format, quality);

    if (blob.size <= targetSize) {
      lo = quality; // Try higher quality
    } else {
      hi = quality; // Need lower quality
    }
  }

  return { blob, quality };
}

// --- EXIF Orientation ---

async function getExifOrientation(input: File | Blob | string): Promise<number> {
  // Try to read EXIF orientation tag
  try {
    if (input instanceof File || input instanceof Blob) {
      const buffer = await input.slice(0, 65536).arrayBuffer();
      const view = new DataView(buffer);

      // Check for JPEG marker
      if (view.getUint16(0, false) !== 0xFFD8) return 1;

      let offset = 2;
      while (offset < view.byteLength) {
        if (view.getUint8(offset) !== 0xFF) break;
        const marker = view.getUint8(offset + 1);
        if (marker === 0xE1) { // APP1 (EXIF)
          const segmentLength = view.getUint16(offset + 2, false);
          const tiffOffset = offset + 10;

          // Check byte order
          const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;
          if (view.getUint32(tiffOffset + 4, littleEndian) !== 0x45786966) break; // "Exif"

          const ifdOffset = view.getUint32(tiffOffset + 8, littleEndian);
          const numEntries = view.getUint16(tiffOffset + ifdOffset, littleEndian);

          for (let i = 0; i < numEntries; i++) {
            const entryOffset = tiffOffset + ifdOffset + 2 + i * 12;
            const tag = view.getUint16(entryOffset, littleEndian);
            if (tag === 0x0112) { // Orientation tag
              return view.getUint16(entryOffset + 8, littleEndian);
            }
          }
          break;
        }
        offset += 2 + view.getUint16(offset + 2, false);
      }
    }
  } catch {
    // Silently fall back
  }

  return 1; // No rotation needed
}

function applyExifOrientation(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  orientation: number
): void {
  switch (orientation) {
    case 2: // Flip horizontal
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // Rotate 180
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4: // Flip vertical
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5: // Transpose (flip + rotate 90 CW)
      ctx.translate(0, width);
      ctx.scale(1, -1);
      ctx.rotate(-Math.PI / 2);
      [width, height] = [height, width]; // Swap for drawImage
      break;
    case 6: // Rotate 90 CW
      ctx.translate(height, 0);
      ctx.rotate(Math.PI / 2);
      break;
    case 7: // Transverse (flip + rotate 90 CCW)
      ctx.translate(height, width);
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 8: // Rotate 90 CCW
      ctx.translate(0, width);
      ctx.rotate(-Math.PI / 2);
      break;
    default:
      break;
  }

  ctx.drawImage(img, 0, 0, width, height);
}
