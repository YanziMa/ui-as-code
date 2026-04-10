/**
 * Image processing, manipulation, format conversion, and optimization utilities.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  format?: "jpeg" | "png" | "webp";
  preserveAspectRatio?: boolean;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FilterOptions {
  brightness?: number;    // -100 to 100
  contrast?: number;      // -100 to 100
  saturation?: number;    // -100 to 100
  hueRotate?: number;     // 0-360 degrees
  blur?: number;          // px
  grayscale?: boolean;
  sepia?: boolean;
  invert?: boolean;
}

/** Get image dimensions from URL or File */
export async function getImageDimensions(source: string | File | Blob): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    if (typeof source === "string") {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
    }
  });
}

/** Load image as HTMLImageElement */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Create canvas from image source */
export async function imageToCanvas(
  source: string | HTMLImageElement | File | Blob,
): Promise<HTMLCanvasElement> {
  const img = typeof source === "string" || source instanceof HTMLImageElement
    ? (typeof source === "string" ? await loadImage(source) : source)
    : await loadImage(URL.createObjectURL(source));

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/** Resize image with options */
export async function resizeImage(
  source: string | File | Blob | HTMLCanvasElement,
  options: ImageProcessingOptions = {},
): Promise<{ blob: Blob; dataUrl: string; dimensions: ImageDimensions }> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    format = "webp",
    preserveAspectRatio = true,
  } = options;

  let canvas: HTMLCanvasElement;

  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    canvas = await imageToCanvas(source);
  }

  const { width: origW, height: origH } = canvas;
  let { width, height } = calculateTargetSize(origW, origH, maxWidth, maxHeight, preserveAspectRatio);

  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = width;
  resizedCanvas.height = height;
  const ctx = resizedCanvas.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, width, height);

  const mimeType = `image/${format}`;
  const blob = await new Promise<Blob>((resolve) => {
    resizedCanvas.toBlob((b) => resolve(b!), mimeType, quality);
  });
  const dataUrl = resizedCanvas.toDataURL(mimeType, quality);

  return { blob, dataUrl, dimensions: { width, height } };
}

function calculateTargetSize(
  w: number, h: number, maxW: number, maxH: number, preserveAspect: boolean,
): { width: number; height: number } {
  if (w <= maxW && h <= maxH) return { width: w, height: h };
  if (!preserveAspect) return { width: Math.min(w, maxW), height: Math.min(h, maxH) };

  const ratio = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

/** Crop image to region */
export async function cropImage(
  source: string | File | Blob | HTMLCanvasElement,
  region: CropRegion,
): Promise<HTMLCanvasElement> {
  const canvas = source instanceof HTMLCanvasElement ? source : await imageToCanvas(source);
  const cropped = document.createElement("canvas");
  cropped.width = region.width;
  cropped.height = region.height;
  const ctx = cropped.getContext("2d")!;
  ctx.drawImage(canvas, region.x, region.y, region.width, region.height, 0, 0, region.width, region.height);
  return cropped;
}

/** Apply CSS-like filters to image */
export async function applyFilters(
  source: string | File | Blob | HTMLCanvasElement,
  filters: FilterOptions,
): Promise<HTMLCanvasElement> {
  const canvas = source instanceof HTMLCanvasElement ? source : await imageToCanvas(source);
  const ctx = canvas.getContext("2d")!;

  const filterParts: string[] = [];
  if (filters.brightness) filterParts.push(`brightness(${1 + filters.brightness / 100})`);
  if (filters.contrast) filterParts.push(`contrast(${1 + filters.contrast / 100})`);
  if (filters.saturation) filterParts.push(`saturate(${1 + filters.saturation / 100})`);
  if (filters.hueRotate) filterParts.push(`hue-rotate(${filters.hueRotate}deg)`);
  if (filters.blur) filterParts.push(`blur(${filters.blur}px)`);
  if (filters.grayscale) filterParts.push("grayscale(100%)");
  if (filters.sepia) filterParts.push("sepia(100%)");
  if (filters.invert) filterParts.push("invert(100%)");

  if (filterParts.length > 0) {
    ctx.filter = filterParts.join(" ");
    // Redraw with filter
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.putImageData(imageData, 0, 0);
    ctx.filter = "none";
  }

  return canvas;
}

/** Convert image to different format */
export async function convertFormat(
  source: string | File | Blob,
  targetFormat: "jpeg" | "png" | "webp",
  quality = 0.9,
): Promise<Blob> {
  const canvas = await imageToCanvas(source);
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b!), `image/${targetFormat}`, quality);
  });
}

/** Generate thumbnail */
export async function generateThumbnail(
  source: string | File | Blob,
  size = 150,
  format: "jpeg" | "png" | "webp" = "webp",
): Promise<string> {
  const result = await resizeImage(source, { maxWidth: size, maxHeight: size, format, quality: 0.8 });
  return result.dataUrl;
}

/** Compress image (optimize file size) */
export async function compressImage(
  source: File | Blob | string,
  maxSizeKB = 200,
  initialQuality = 0.8,
): Promise<{ blob: Blob; dataUrl: string }> {
  const canvas = await imageToCanvas(source);
  let quality = initialQuality;
  let blob: Blob | null = null;
  let dataUrl: string;

  do {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });
    if (!blob) break;
    const sizeKB = blob.size / 1024;
    if (sizeKB <= maxSizeKB) break;
    quality -= 0.1;
    if (quality < 0.1) break;
  } while (blob.size / 1024 > maxSizeKB);

  dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { blob: blob!, dataUrl };
}

/** Get dominant color from image (simplified - samples center region) */
export async function getDominantColor(source: string | File | Blob): Promise<string> {
  const canvas = await imageToCanvas(source);
  const ctx = canvas.getContext("2d")!;
  const sampleSize = 50;
  const sx = Math.max(0, (canvas.width - sampleSize) / 2);
  const sy = Math.max(0, (canvas.height - sampleSize) / 2);
  const imageData = ctx.getImageData(sx, sy, sampleSize, sampleSize).data;

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < imageData.length; i += 16) { // Sample every 4th pixel
    r += imageData[i]!;
    g += imageData[i + 1]!;
    b += imageData[i + 2]!;
    count++;
  }

  count = Math.max(count, 1);
  const toHex = (c: number) => Math.round(c / count).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Calculate average color of an image */
export async function getAverageColor(source: string | File | Blob): Promise<string> {
  const canvas = await imageToCanvas(source);
  const ctx = canvas.getContext("2d")!;
  // Downsample for performance
  const scale = Math.min(1, 100 / Math.max(canvas.width, canvas.height));
  const w = Math.round(canvas.width * scale);
  const h = Math.round(canvas.height * scale);
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = w;
  tmpCanvas.height = h;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  tmpCtx.drawImage(canvas, 0, 0, w, h);
  const data = tmpCtx.getImageData(0, 0, w, h).data;

  let r = 0, g = 0, b = 0;
  const len = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
  }

  const hex = (c: number) => Math.round(c / len).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Create image collage/grid from multiple images */
export async function createCollage(
  sources: Array<string | File | Blob>,
  cols = 3,
  padding = 4,
  bgColor = "#ffffff",
  cellSize = 200,
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  const rows = Math.ceil(sources.length / cols);
  const w = cols * cellSize + (cols + 1) * padding;
  const h = rows * cellSize + (rows + 1) * padding;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < sources.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (cellSize + padding);
    const y = padding + row * (cellSize + padding);

    try {
      const srcCanvas = await imageToCanvas(sources[i]);
      // Cover-fit into cell
      const scale = Math.max(cellSize / srcCanvas.width, cellSize / srcCanvas.height);
      const sw = srcCanvas.width * scale;
      const sh = srcCanvas.height * scale;
      const sx = x + (cellSize - sw) / 2;
      const sy = y + (cellSize - sh) / 2;
      ctx.drawImage(srcCanvas, sx, sy, sw, sh);
    } catch {
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(x, y, cellSize, cellSize);
    }
  }

  return { canvas, dataUrl: canvas.toDataURL("image/png") };
}

/** Add watermark text to image */
export async function addWatermark(
  source: string | File | Blob,
  text: string,
  options: { position?: "center" | "bottom-right" | "bottom-left"; opacity?: number; fontSize?: number; color?: string } = {},
): Promise<HTMLCanvasElement> {
  const {
    position = "bottom-right",
    opacity = 0.5,
    fontSize = 24,
    color = "#ffffff",
  } = options;

  const canvas = await imageToCanvas(source);
  const ctx = canvas.getContext("2d")!;

  ctx.globalAlpha = opacity;
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "bottom";

  const metrics = ctx.measureText(text);
  const textW = metrics.width;
  const textH = fontSize;
  const margin = 16;

  let x: number, y: number;
  switch (position) {
    case "center":
      x = (canvas.width - textW) / 2;
      y = (canvas.height + textH) / 2;
      break;
    case "bottom-left":
      x = margin;
      y = canvas.height - margin;
      break;
    default: // bottom-right
      x = canvas.width - textW - margin;
      y = canvas.height - margin;
  }

  // Text shadow for readability
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  ctx.fillText(text, x, y);

  ctx.globalAlpha = 1;
  return canvas;
}

/** Detect image orientation from dimensions */
export function detectOrientation(dimensions: ImageDimensions): "landscape" | "portrait" | "square" {
  const ratio = dimensions.width / dimensions.height;
  if (ratio > 1.1) return "landscape";
  if (ratio < 0.9) return "portrait";
  return "square";
}

/** Calculate aspect ratio as simplified fraction */
export function getAspectRatio(w: number, h: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

/** Convert File/Blob to data URL */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Convert File/Blob to ArrayBuffer */
export function fileToArrayBuffer(file: File | Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/** Download image from canvas or data URL */
export function downloadImage(dataUrl: string, filename = "image.png"): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Get file size in human-readable format */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Validate image file type */
export function isValidImageType(file: File): boolean {
  return /^image\/(jpeg|png|gif|webp|svg\+xml|avif)$/i.test(file.type);
}

/** Get EXIF orientation hint (basic - reads first bytes) */
export async function getExifOrientation(file: File): Promise<number> {
  try {
    const buffer = await fileToArrayBuffer(file);
    const view = new DataView(buffer);

    // Check for JPEG/EXIF marker
    if (view.getUint8(0) !== 0xFF || view.getUint8(1) !== 0xD8) return 1;

    let offset = 2;
    while (offset < view.byteLength) {
      if (view.getUint8(offset) !== 0xFF) break;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xE1) { // APP1 (EXIF)
        offset += 4;
        if (view.getUint32(offset) !== 0x45786966) return 1; // "Exif"
        offset += 6;
        if (view.getUint16(offset) !== 0) return 1;
        const tags = view.getUint16(offset + 2, false);
        offset += 2;
        for (let i = 0; i < tags; i++) {
          const tag = view.getUint16(offset + i * 12, false);
          if (tag === 0x0112) { // Orientation tag
            return view.getUint16(offset + i * 12 + 8, false);
          }
        }
        return 1;
      }
      const size = view.getUint16(offset + 2);
      offset += 2 + size;
    }
    return 1;
  } catch {
    return 1;
  }
}
