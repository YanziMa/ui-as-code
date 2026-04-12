/**
 * Image Processor: Browser-based image manipulation pipeline with
 * resize, crop, rotate, filter effects, format conversion, EXIF handling,
 * color adjustments, watermarking, histogram analysis, compression,
 * canvas operations, and blob output.
 */

// --- Types ---

export type ImageFormat = "jpeg" | "png" | "webp" | "avif" | "bmp";

export type ResizeMode = "contain" | "cover" | "fill" | "stretch" | "auto";

export type CropMode = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "entropy";

export type FilterType =
  | "grayscale"
  | "sepia"
  | "invert"
  | "blur"
  | "sharpen"
  | "emboss"
  | "brightness"
  | "contrast"
  | "saturate"
  | "hue-rotate"
  | "opacity"
  | "sepia-vintage"
  | "cold"
  | "warm"
  | "vignette";

export interface ImageProcessorOptions {
  /** Output format (default: same as input, fallback png) */
  format?: ImageFormat;
  /** Output quality (0-1, default: 0.92) */
  quality?: number;
  /** Max width in px (0 = no limit) */
  maxWidth?: number;
  /** Max height in px (0 = no limit) */
  maxHeight?: number;
  /** Resize mode when both dimensions specified */
  resizeMode?: ResizeMode;
  /** Maintain aspect ratio? */
  maintainAspectRatio?: boolean;
  /** Background color for letterboxing (default: transparent) */
  backgroundColor?: string;
  /** Enable smoothing? */
  smoothing?: boolean;
  /** Output as Blob? (false = returns data URL) */
  asBlob?: boolean;
}

export interface CropOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FilterOptions {
  type: FilterType;
  intensity?: number; // 0-1 for most filters
  radius?: number; // For blur/sharpen (px)
  angle?: number; // For hue-rotate (deg)
  amount?: number; // For brightness/contrast/saturate (-1 to 1)
}

export interface WatermarkOptions {
  /** Image source (URL, data URL, HTMLImageElement) */
  source: string | HTMLImageElement;
  /** Position: "center", "top-left", "top-right", "bottom-left", "bottom-right", "tile" */
  position?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "tile";
  /** Opacity (0-1) */
  opacity?: number;
  /** Size ratio relative to image (0-1) */
  sizeRatio?: number;
  /** Padding from edge (px) */
  padding?: number;
  /** Margin between watermarks when tiling (px) */
  tileMargin?: number;
}

export interface HistogramData {
  r: number[]; // 256 bins
  g: number[];
  b: number[];
  a?: number[];
  luminance: number[];
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number; // bytes
  orientation?: number; // EXIF rotation
  colorSpace?: string;
  hasAlpha: boolean;
}

// --- Core Processor ---

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private originalImage: HTMLImageElement | null = null;
  private _metadata: ImageMetadata | null = null;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas ?? document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
  }

  get metadata(): ImageMetadata | null {
    return this._metadata;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  /** Load an image from URL, File, Blob, or data URL. */
  async load(source: string | File | Blob): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        this.originalImage = img;
        this.canvas.width = img.naturalWidth;
        this.canvas.height = img.naturalHeight;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(img, 0, 0);

        let size = 0;
        if (typeof source !== "string") {
          size = source.size;
        }

        this._metadata = {
          width: img.naturalWidth,
          height: img.naturalHeight,
          format: this.detectFormat(source),
          size,
          hasAlpha: true, // Assume true unless we check pixel data
        };

        resolve(this._metadata);
      };

      img.onerror = () => reject(new Error("Failed to load image"));

      if (source instanceof File || source instanceof Blob) {
        img.src = URL.createObjectURL(source);
      } else {
        img.src = source;
      }
    });
  }

  /** Resize the image. */
  resize(width: number, height: number, mode: ResizeMode = "contain"): this {
    if (!this.originalImage) throw new Error("No image loaded");

    const origW = this.originalImage.naturalWidth;
    const origH = this.originalImage.naturalHeight;
    const [finalW, finalH] = this.calculateSize(origW, origH, width, height, mode);

    // Create temp canvas for resizing
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = finalW;
    tmpCanvas.height = finalH;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.imageSmoothingEnabled = true;
    tmpCtx.imageSmoothingQuality = "high";
    tmpCtx.drawImage(this.canvas, 0, 0, finalW, finalH);

    this.canvas.width = finalW;
    this.canvas.height = finalH;
    this.ctx.drawImage(tmpCanvas, 0, 0);

    return this;
  }

  /** Crop the image to a rectangle. */
  crop(options: CropOptions): this {
    const { x, y, width, height } = options;

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = width;
    tmpCanvas.height = height;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.drawImage(this.canvas, x, y, width, height, 0, 0, width, height);

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.drawImage(tmpCanvas, 0, 0);

    return this;
  }

  /** Crop to a square from center or specified mode. */
  cropSquare(mode: CropMode = "center"): this {
    if (!this._metadata) throw new Error("No image loaded");
    const { width, height } = this._metadata;
    const size = Math.min(width, height);
    const offsetX = (width - size) / 2;
    const offsetY = (height - size) / 2;

    let cropX = offsetX;
    let cropY = offsetY;

    switch (mode) {
      case "top-left": cropX = 0; cropY = 0; break;
      case "top-right": cropX = width - size; cropY = 0; break;
      case "bottom-left": cropX = 0; cropY = height - size; break;
      case "bottom-right": cropX = width - size; cropY = height - size; break;
    }

    return this.crop({ x: cropX, y: cropY, width: size, height: size });
  }

  /** Rotate the image by degrees. */
  rotate(degrees: number, backgroundColor = "transparent"): this {
    const radians = (degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    const newWidth = this.canvas.width * cos + this.canvas.height * sin;
    const newHeight = this.canvas.width * sin + this.canvas.height * cos;

    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = newWidth;
    tmpCanvas.height = newHeight;
    const tmpCtx = tmpCanvas.getContext("2d")!;

    tmpCtx.translate(newWidth / 2, newHeight / 2);
    tmpCtx.rotate(radians);

    if (backgroundColor && backgroundColor !== "transparent") {
      tmpCtx.fillStyle = backgroundColor;
      tmpCtx.fillRect(-this.canvas.width / 2, -this.canvas.height / 2, this.canvas.width, this.canvas.height);
    }

    tmpCtx.drawImage(this.canvas, -this.canvas.width / 2, -this.canvas.height / 2);

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    this.ctx.drawImage(tmpCanvas, 0, 0);

    return this;
  }

  /** Flip horizontally. */
  flipHorizontal(): this {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = this.canvas.width;
    tmpCanvas.height = this.canvas.height;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.translate(this.canvas.width, 0);
    tmpCtx.scale(-1, 1);
    tmpCtx.drawImage(this.canvas, 0, 0);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(tmpCanvas, 0, 0);
    return this;
  }

  /** Flip vertically. */
  flipVertical(): this {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = this.canvas.width;
    tmpCanvas.height = this.canvas.height;
    const tmpCtx = tmpCanvas.getContext("2d")!;
    tmpCtx.translate(0, this.canvas.height);
    tmpCtx.scale(1, -1);
    tmpCtx.drawImage(this.canvas, 0, 0);

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(tmpCanvas, 0, 0);
    return this;
  }

  /** Apply a filter effect. */
  applyFilter(filter: FilterOptions): this {
    const { type, intensity = 1, radius, angle, amount } = filter;

    switch (type) {
      case "grayscale":
        this.applyCSSFilter(`grayscale(${intensity})`);
        break;
      case "sepia":
        this.applyCSSFilter(`sepia(${intensity})`);
        break;
      case "invert":
        this.applyCSSFilter(`invert(${intensity})`);
        break;
      case "blur":
        this.applyCSSFilter(`blur(${radius ?? 4}px)`);
        break;
      case "brightness":
        this.applyCSSFilter(`brightness(${1 + (amount ?? 0)})`);
        break;
      case "contrast":
        this.applyCSSFilter(`contrast(${1 + (amount ?? 0)})`);
        break;
      case "saturate":
        this.applyCSSFilter(`saturate(${1 + (amount ?? 0)})`);
        break;
      case "hue-rotate":
        this.applyCSSFilter(`hue-rotate(${angle ?? 0}deg)`);
        break;
      case "opacity":
        this.applyCSSFilter(`opacity(${intensity})`);
        break;
      case "sharpen":
        this.applyConvolution([0, -1, 0, -1, 5, -1, 0, -1, 0]);
        break;
      case "emboss":
        this.applyConvolution([-2, -1, 0, -1, 1, 1, 0, 1, 2]);
        break;
      case "sepia-vintage":
        this.applyCSSFilter(`sepia(0.8) contrast(1.1) brightness(0.9) saturate(1.2)`);
        break;
      case "cold":
        this.applyCSSFilter(`saturate(0.8) hue-rotate(20deg) brightness(1.05)`);
        break;
      case "warm":
        this.applyCSSFilter(`saturate(1.3) hue-rotate(-15deg) sepia(0.2)`);
        break;
      case "vignette":
        this.applyVignette(intensity);
        break;
    }

    return this;
  }

  /** Apply multiple filters in sequence. */
  applyFilters(filters: FilterOptions[]): this {
    for (const f of filters) {
      this.applyFilter(f);
    }
    return this;
  }

  /** Add a watermark overlay. */
  addWatermark(options: WatermarkOptions): Promise<this> {
    return new Promise((resolve, reject) => {
      const wmImg = typeof options.source === "string"
        ? new Image()
        : options.source;

      if (typeof options.source === "string") {
        (wmImg as HTMLImageElement).crossOrigin = "anonymous";
        (wmImg as HTMLImageElement).onload = () => {
          this.drawWatermark(wmImg as HTMLImageElement, options);
          resolve(this);
        };
        (wmImg as HTMLImageElement).onerror = () => reject(new Error("Failed to load watermark"));
        (wmImg as HTMLImageElement).src = options.source;
      } else {
        this.drawWatermark(wmImg as HTMLImageElement, options);
        resolve(this);
      }
    });
  }

  /** Get the processed image as data URL. */
  toDataURL(format: ImageFormat = "png", quality = 0.92): string {
    const mimeType = `image/${format}`;
    return this.canvas.toDataURL(mimeType, quality);
  }

  /** Get the processed image as Blob. */
  async toBlob(format: ImageFormat = "png", quality = 0.92): Promise<Blob> {
    const mimeType = `image/${format}`;
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => resolve(blob!),
        mimeType,
        quality,
      );
    });
  }

  /** Download the processed image. */
  download(filename = "image.png", format: ImageFormat = "png", quality = 0.92): void {
    const url = this.toDataURL(format, quality);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  }

  /** Compute color histogram of the current image. */
  computeHistogram(): HistogramData {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;

    const hist: HistogramData = {
      r: new Array(256).fill(0),
      g: new Array(256).fill(0),
      b: new Array(256).fill(0),
      a: new Array(256).fill(0),
      luminance: new Array(256).fill(0),
    };

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

      hist.r[r]++;
      hist.g[g]++;
      hist.b[b]++;
      hist.a![a]++;
      hist.luminance[lum]++;
    }

    return hist;
  }

  /** Get average color of the image. */
  getAverageColor(): { r: number; g: number; b: number; hex: string } {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    const count = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i]!;
      g += data[i + 1]!;
      b += data[i + 2]!;
    }

    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    return {
      r, g, b,
      hex: "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join(""),
    };
  }

  /** Reset to original loaded image. */
  reset(): this {
    if (this.originalImage) {
      this.canvas.width = this.originalImage.naturalWidth;
      this.canvas.height = this.originalImage.naturalHeight;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.originalImage, 0, 0);
    }
    return this;
  }

  /** Get the underlying canvas element. */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // --- Internal ---

  private calculateSize(origW: number, origH: number, targetW: number, targetH: number, mode: ResizeMode): [number, number] {
    switch (mode) {
      case "contain": {
        const ratio = Math.min(targetW / origW, targetH / origH);
        return [Math.round(origW * ratio), Math.round(origH * ratio)];
      }
      case "cover": {
        const ratio = Math.max(targetW / origW, targetH / origH);
        return [Math.round(origW * ratio), Math.round(origH * ratio)];
      }
      case "fill":
        return [targetW, targetH];
      case "stretch":
        return [targetW, targetH];
      case "auto": {
        if (targetW > 0 && targetH > 0) return this.calculateSize(origW, origH, targetW, targetH, "contain");
        if (targetW > 0) return [targetW, Math.round(origH * (targetW / origW))];
        if (targetH > 0) return [Math.round(origW * (targetH / origH)), targetH];
        return [origW, origH];
      }
      default:
        return [origW, origH];
    }
  }

  private applyCSSFilter(filterString: string): void {
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = this.canvas.width;
    tmpCanvas.height = this.canvas.height;
    const tmpCtx = tmpCanvas.getContext("2d")!;

    tmpCtx.filter = filterString;
    tmpCtx.drawImage(this.canvas, 0, 0);
    tmpCtx.filter = "none";

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(tmpCanvas, 0, 0);
  }

  private applyConvolution(kernel: number[]): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const output = new Uint8ClampedArray(data.length);

    const kSize = 3;
    const half = Math.floor(kSize / 2);

    for (let y = half; y < h - half; y++) {
      for (let x = half; x < w - half; x++) {
        let r = 0, g = 0, b = 0;

        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const px = x + kx - half;
            const py = y + ky - half;
            const idx = (py * w + px) * 4;
            const weight = kernel[ky * kSize + kx]!;

            r += data[idx]! * weight;
            g += data[idx + 1]! * weight;
            b += data[idx + 2]! * weight;
          }
        }

        const outIdx = (y * w + x) * 4;
        output[outIdx] = Math.max(0, Math.min(255, r));
        output[outIdx + 1] = Math.max(0, Math.min(255, g));
        output[outIdx + 2] = Math.max(0, Math.min(255, b));
        output[outIdx + 3] = data[(y * w + x) * 4 + 3]!;
      }
    }

    imageData.data.set(output);
    this.ctx.putImageData(imageData, 0, 0);
  }

  private applyVignette(intensity: number): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);
    const gradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDist);
    gradient.addColorStop(0.5, "rgba(0,0,0,0)");
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawWatermark(wmImg: HTMLImageElement, options: WatermarkOptions): void {
    const opacity = options.opacity ?? 0.3;
    const padding = options.padding ?? 10;
    const pos = options.position ?? "bottom-right";

    this.ctx.globalAlpha = opacity;

    if (options.position === "tile") {
      const margin = options.tileMargin ?? 100;
      const wmW = wmImg.naturalWidth * (options.sizeRatio ?? 0.15);
      const wmH = wmImg.naturalHeight * (options.sizeRatio ?? 0.15);

      for (let y = margin; y < this.canvas.height + wmH; y += wmH + margin) {
        for (x = margin; x < this.canvas.width + wmW; x += wmW + margin) {
          this.ctx.drawImage(wmImg, x, y, wmW, wmH);
        }
      }
    } else {
      const maxSize = Math.min(this.canvas.width, this.canvas.height) * (options.sizeRatio ?? 0.15);
      const scale = Math.min(maxSize / wmImg.naturalWidth, maxSize / wmImg.naturalHeight);
      const wmW = wmImg.naturalWidth * scale;
      const wmH = wmImg.naturalHeight * scale;

      let x: number, y: number;
      switch (pos) {
        case "top-left": x = padding; y = padding; break;
        case "top-right": x = this.canvas.width - wmW - padding; y = padding; break;
        case "bottom-left": x = padding; y = this.canvas.height - wmH - padding; break;
        case "bottom-right": x = this.canvas.width - wmW - padding; y = this.canvas.height - wmH - padding; break;
        case "center":
        default:
          x = (this.canvas.width - wmW) / 2;
          y = (this.canvas.height - wmH) / 2;
          break;
      }

      this.ctx.drawImage(wmImg, x, y, wmW, wmH);
    }

    this.ctx.globalAlpha = 1;
  }

  private detectFormat(source: string | File | Blob): string {
    if (typeof source === "string") {
      if (source.startsWith("data:image/png")) return "png";
      if (source.startsWith("data:image/jpeg") || source.startsWith("data:image/jpg")) return "jpeg";
      if (source.startsWith("data:image/webp")) return "webp";
      return "unknown";
    }
    if (source instanceof File) {
      return source.type.replace("image/", "") || "unknown";
    }
    return "unknown";
  }
}

// --- Factory & Convenience ---

/** Create an image processor instance. */
export function createImageProcessor(canvas?: HTMLCanvasElement): ImageProcessor {
  return new ImageProcessor(canvas);
}

/** Quick resize: load + resize + export in one call. */
export async function quickResize(
  source: string | File | Blob,
  maxWidth: number,
  maxHeight: number,
  format: ImageFormat = "jpeg",
  quality = 0.85,
): Promise<Blob> {
  const processor = new ImageProcessor();
  await processor.load(source);
  processor.resize(maxWidth, maxHeight, "contain");
  return processor.toBlob(format, quality);
}

/** Quick thumbnail generation. */
export async function generateThumbnail(
  source: string | File | Blob,
  size = 150,
  format: ImageFormat = "jpeg",
  quality = 0.8,
): Promise<string> {
  const processor = new ImageProcessor();
  await processor.load(source);
  processor.resize(size, size, "cover");
  processor.cropSquare("center");
  return processor.toDataURL(format, quality);
}
