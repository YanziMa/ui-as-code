/**
 * Media Editor: Browser-side image and video editing toolkit.
 * Supports crop, rotate, flip, resize, filters, adjustments,
 * annotations, text overlay, watermarking, and export to various formats.
 * Uses Canvas API for image editing and CanvasCaptureStream for video.
 */

// --- Types ---

export type FilterType =
  | "none" | "grayscale" | "sepia" | "invert" | "blur"
  | "sharpen" | "emboss" | "edge-detect" | "brightness" | "contrast"
  | "saturate" | "hue-rotate" | "opacity" | "vintage" | "cold" | "warm"
  | "dramatic" | "noir" | "pop" | "fade";

export interface FilterConfig {
  type: FilterType;
  intensity?: number; // 0-1
  params?: Record<string, number>;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: number; // Lock aspect ratio
}

export interface AnnotationPoint {
  x: number;
  y: number;
}

export interface AnnotationLine {
  start: AnnotationPoint;
  end: AnnotationPoint;
  color?: string;
  width?: number;
}

export interface AnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  fillColor?: string;
  borderWidth?: number;
}

export interface TextOverlay {
  text: string;
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  rotation?: number;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface WatermarkOptions {
  image?: HTMLImageElement | string;
  text?: string;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  opacity?: number;
  size?: number; // percentage of image dimension
  margin?: number; // pixels from edge
}

export interface AdjustmentParams {
  brightness?: number;   // -100 to 100
  contrast?: number;     // -100 to 100
  saturation?: number;   // -100 to 100
  hue?: number;          // -180 to 180
  blur?: number;         // 0 to 20 px
  sharpen?: number;      // 0 to 10
  exposure?: number;     // -100 to 100
  temperature?: number;  // -100 to 100 (blue to yellow)
  tint?: number;         // -100 to 100 (green to magenta)
  vignette?: number;     // 0 to 100
  grain?: number;        // 0 to 100
}

export interface ExportOptions {
  format?: "jpeg" | "png" | "webp";
  quality?: number;       // 0-1
  width?: number;
  height?: number;
  scale?: number;         // 0.1-4
  preserveExif?: boolean;
  fileName?: string;
  asFile?: boolean;
}

export interface EditorHistoryEntry {
  action: string;
  timestamp: number;
  snapshot?: ImageData;
}

export interface MediaEditorInstance {
  /** The working canvas element */
  canvas: HTMLCanvasElement;
  /** Original image dimensions */
  originalDimensions: { width: number; height: number };
  /** Current dimensions */
  currentDimensions: { width: number; height: number };
  /** Load an image into the editor */
  loadImage: (source: string | File | Blob | HTMLImageElement) => Promise<void>;
  /** Apply a filter */
  applyFilter: (filter: FilterType | FilterConfig) => void;
  /** Apply adjustment parameters */
  adjust: (params: AdjustmentParams) => void;
  /** Reset all adjustments/filters */
  resetAdjustments: () => void;
  /** Crop to region */
  crop: (region: CropRegion) => void;
  /** Rotate by degrees */
  rotate: (degrees: number) => void;
  /** Flip horizontally */
  flipHorizontal: () => void;
  /** Flip vertically */
  flipVertical: () => void;
  /** Resize to new dimensions */
  resize: (width: number, height: number, fitMode?: "contain" | "cover" | "stretch") => void;
  /** Add annotation line */
  addLine: (line: AnnotationLine) => void;
  /** Add annotation rectangle */
  addRect: (rect: AnnotationRect) => void;
  /** Add text overlay */
  addText: (overlay: TextOverlay) => void;
  /** Add watermark */
  addWatermark: (options: WatermarkOptions) => void;
  /** Undo last action */
  undo: () => boolean;
  /** Redo undone action */
  redo: () => boolean;
  /** Can undo? */
  canUndo: () => boolean;
  /** Can redo? */
  canRedo: () => boolean;
  /** Save state to history */
  saveState: (action: string) => void;
  /** Export edited image */
  exportImage: (options?: ExportOptions) => Promise<Blob | File>;
  /** Export as data URI */
  exportAsDataUri: (options?: ExportOptions) => Promise<string>;
  /** Get preview as data URI (for live preview) */
  getPreviewDataUri: () => string;
  /** Clear all annotations */
  clearAnnotations: () => void;
  /** Destroy editor */
  destroy: () => void;
}

// --- Main Factory ---

export function createMediaEditor(
  canvas: HTMLCanvasElement,
  options: { maxWidth?: number; maxHeight?: number } = {}
): MediaEditorInstance {
  const MAX_WIDTH = options.maxWidth ?? 4096;
  const MAX_HEIGHT = options.maxHeight ?? 4096;

  let originalImage: HTMLImageElement | null = null;
  let originalImageData: ImageData | null = null;
  let currentFilter: FilterConfig = { type: "none" };
  let currentAdjustments: AdjustmentParams = {};
  const annotations: (AnnotationLine | AnnotationRect | TextOverlay)[] = [];

  // History management
  const history: EditorHistoryEntry[] = [];
  let historyIndex = -1;
  const MAX_HISTORY = 50;

  const instance: MediaEditorInstance = {
    canvas,
    originalDimensions: { width: 0, height: 0 },
    currentDimensions: { width: canvas.width, height: canvas.height },

    async loadImage(source): Promise<void> {
      const img = typeof source === "string" || source instanceof File || source instanceof Blob
        ? await loadSourceImage(source)
        : source;

      originalImage = img;
      instance.originalDimensions = { width: img.naturalWidth, height: img.naturalHeight };

      // Fit within max bounds
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_WIDTH) { h *= MAX_WIDTH / w; w = MAX_WIDTH; }
      if (h > MAX_HEIGHT) { w *= MAX_HEIGHT / h; h = MAX_HEIGHT; }

      canvas.width = Math.round(w);
      canvas.height = Math.round(h);
      instance.currentDimensions = { width: canvas.width, height: canvas.height };

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      saveState("load image");
    },

    applyFilter(filter) {
      if (typeof filter === "string") {
        currentFilter = { type: filter };
      } else {
        currentFilter = filter;
      }
      renderWithFiltersAndAdjustments();
      saveState(`filter: ${currentFilter.type}`);
    },

    adjust(params) {
      Object.assign(currentAdjustments, params);
      renderWithFiltersAndAdjustments();
      saveState("adjustment");
    },

    resetAdjustments() {
      currentFilter = { type: "none" };
      currentAdjustments = {};
      if (originalImageData) {
        canvas.getContext("2d")!.putImageData(originalImageData, 0, 0);
      }
      saveState("reset adjustments");
    },

    crop(region) {
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(region.x, region.y, region.width, region.height);
      canvas.width = region.width;
      canvas.height = region.height;
      ctx.putImageData(imageData, 0, 0);
      instance.currentDimensions = { width: region.width, height: region.height };
      saveState("crop");
    },

    rotate(degrees) {
      const radians = (degrees * Math.PI) / 180;
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Calculate new dimensions
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));
      const newWidth = Math.round(canvas.height * sin + canvas.width * cos);
      const newHeight = Math.round(canvas.height * cos + canvas.width * sin);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCanvas.getContext("2d")!.putImageData(imageData, 0, 0);

      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(tempCanvas, -tempCanvas.width / 2, -tempCanvas.height / 2);
      instance.currentDimensions = { width: newWidth, height: newHeight };
      saveState(`rotate ${degrees}\u00B0`);
    },

    flipHorizontal() {
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.putImageData(imageData, -canvas.width, 0);
      ctx.restore();
      saveState("flip horizontal");
    },

    flipVertical() {
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(1, -1);
      ctx.putImageData(imageData, 0, -canvas.height);
      ctx.restore();
      saveState("flip vertical");
    },

    resize(width, height, fitMode = "contain") {
      const ctx = canvas.getContext("2d")!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCanvas.getContext("2d")!.putImageData(imageData, 0, 0);

      canvas.width = width;
      canvas.height = height;

      if (fitMode === "stretch") {
        ctx.drawImage(tempCanvas, 0, 0, width, height);
      } else {
        const srcAspect = tempCanvas.width / tempCanvas.height;
        const dstAspect = width / height;
        let sx = 0, sy = 0, sw = tempCanvas.width, sh = tempCanvas.height;

        if ((srcAspect > dstAspect) !== (fitMode === "cover")) {
          sh = sw / dstAspect;
          sy = (tempCanvas.height - sh) / 2;
        } else {
          sw = sh * dstAspect;
          sx = (tempCanvas.width - sw) / 2;
        }

        ctx.drawImage(tempCanvas, sx, sy, sw, sh, 0, 0, width, height);
      }

      instance.currentDimensions = { width, height };
      saveState(`resize to ${width}x${height}`);
    },

    addLine(line) {
      annotations.push(line);
      renderAnnotations();
      saveState("add line");
    },

    addRect(rect) {
      annotations.push(rect);
      renderAnnotations();
      saveState("add rect");
    },

    addText(overlay) {
      annotations.push(overlay);
      renderAnnotations();
      saveState("add text");
    },

    addWatermark(wmOpts) {
      applyWatermark(wmOpts);
      saveState("add watermark");
    },

    undo() {
      if (historyIndex <= 0) return false;
      historyIndex--;
      restoreFromHistory(history[historyIndex]!);
      return true;
    },

    redo() {
      if (historyIndex >= history.length - 1) return false;
      historyIndex++;
      restoreFromHistory(history[historyIndex]!);
      return true;
    },

    canUndo: () => historyIndex > 0,
    canRedo: () => historyIndex < history.length - 1,

    saveState(action) {
      // Remove any future states if we're not at the end
      if (historyIndex < history.length - 1) {
        history.splice(historyIndex + 1);
      }

      const ctx = canvas.getContext("2d")!;
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

      history.push({ action, timestamp: Date.now(), snapshot });
      historyIndex = history.length - 1;

      // Trim history
      while (history.length > MAX_HISTORY) {
        history.shift();
        historyIndex--;
      }
    },

    async exportImage(expOpts = {}): Promise<Blob | File> {
      const opts = {
        format: expOpts.format ?? "png",
        quality: expOpts.quality ?? 0.92,
        ...expOpts,
      };

      let exportCanvas = canvas;

      // Scale if needed
      if (opts.scale && opts.scale !== 1) {
        exportCanvas = document.createElement("canvas");
        exportCanvas.width = Math.round(canvas.width * opts.scale);
        exportCanvas.height = Math.round(canvas.height * opts.scale);
        exportCanvas.getContext("2d")!.drawImage(canvas, 0, 0, exportCanvas.width, exportCanvas.height);
      }

      // Resize if specific dimensions given
      if (opts.width || opts.height) {
        const ec = document.createElement("canvas");
        ec.width = opts.width ?? Math.round(canvas.width * (opts.scale ?? 1));
        ec.height = opts.height ?? Math.round(canvas.height * (opts.scale ?? 1));
        ec.getContext("2d")!.drawImage(exportCanvas, 0, 0, ec.width, ec.height);
        exportCanvas = ec;
      }

      const mimeType = opts.format === "jpeg" ? "image/jpeg" :
                        opts.format === "webp" ? "image/webp" : "image/png";

      return new Promise((resolve, reject) => {
        exportCanvas.toBlob(
          (b) => b ? resolve(opts.asFile
            ? new File([b], opts.fileName ?? "edited-image.png", { type: mimeType })
            : b)
            : reject(new Error("Export failed")),
          mimeType,
          opts.quality
        );
      });
    },

    async exportAsDataUri(expOpts = {}): Promise<string> {
      const blob = await instance.exportImage(expOpts);
      return URL.createObjectURL(blob);
    },

    getPreviewDataUri() {
      return canvas.toDataURL("image/png");
    },

    clearAnnotations() {
      annotations.length = 0;
      if (originalImageData) {
        canvas.getContext("2d")!.putImageData(originalImageData, 0, 0);
        renderWithFiltersAndAdjustments();
      }
      saveState("clear annotations");
    },

    destroy() {
      history.length = 0;
      historyIndex = -1;
      annotations.length = 0;
      originalImage = null;
      originalImageData = null;
    },
  };

  // --- Internal Rendering ---

  function renderWithFiltersAndAdjustments(): void {
    if (!originalImageData) return;

    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(cloneImageData(originalImageData), 0, 0);

    // Apply CSS-like filters using pixel manipulation
    if (currentFilter.type !== "none" || Object.keys(currentAdjustments).length > 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      applyPixelFilters(data, currentFilter, currentAdjustments);
      ctx.putImageData(imageData, 0, 0);
    }

    // Render annotations on top
    renderAnnotations();
  }

  function applyPixelFilters(
    data: Uint8ClampedArray,
    filter: FilterConfig,
    adjustments: AdjustmentParams
  ): void {
    const len = data.length;
    const intensity = filter.intensity ?? 1;

    for (let i = 0; i < len; i += 4) {
      let r = data[i]!, g = data[i + 1]!, b = data[i + 2]!;

      // Apply preset filter
      switch (filter.type) {
        case "grayscale":
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray + (r - gray) * (1 - intensity);
          break;

        case "sepia":
          const tr = 0.393 * r + 0.769 * g + 0.189 * b;
          const tg = 0.349 * r + 0.686 * g + 0.168 * b;
          const tb = 0.272 * r + 0.534 * g + 0.131 * b;
          r = tr * intensity + r * (1 - intensity);
          g = tg * intensity + g * (1 - intensity);
          b = tb * intensity + b * (1 - intensity);
          break;

        case "invert":
          r = 255 - (255 - 2 * r) * intensity;
          g = 255 - (255 - 2 * g) * intensity;
          b = 255 - (255 - 2 * b) * intensity;
          break;

        case "vintage":
          r = lerp(r, r * 1.1 + 20, intensity);
          g = lerp(g, g * 0.95 + 10, intensity);
          b = lerp(b, b * 0.8, intensity);
          break;

        case "cold":
          r = lerp(r, r * 0.9, intensity);
          b = lerp(b, Math.min(255, b * 1.15 + 15), intensity);
          break;

        case "warm":
          r = lerp(r, Math.min(255, r * 1.15 + 15), intensity);
          b = lerp(b, b * 0.9, intensity);
          break;

        case "noir":
          const nGray = 0.299 * r + 0.587 * g + 0.114 * b;
          const contrasted = ((nGray / 255 - 0.5) * 1.3 + 0.5) * 255;
          r = g = b = lerp(nGray, Math.max(0, Math.min(255, contrasted)), intensity);
          break;

        case "pop":
          r = lerp(r, saturateChannel(r, 1.4), intensity);
          g = lerp(g, saturateChannel(g, 1.3), intensity);
          b = lerp(b, saturateChannel(b, 1.35), intensity);
          break;

        case "fade":
          r = lerp(r, r + (255 - r) * 0.25, intensity);
          g = lerp(g, g + (255 - g) * 0.25, intensity);
          b = lerp(b, b + (255 - b) * 0.25, intensity);
          break;

        case "dramatic":
          const dGray = 0.299 * r + 0.587 * g + 0.114 * b;
          const dContrast = ((dGray / 255 - 0.5) * 1.5 + 0.5) * 255;
          r = lerp(r, Math.min(255, dContrast * 1.05), intensity);
          g = lerp(g, dContrast * 0.95, intensity);
          b = lerp(b, dContrast * 0.85, intensity);
          break;
      }

      // Apply manual adjustments
      if (adjustments.brightness) {
        const adj = adjustments.brightness * 2.55;
        r += adj; g += adj; b += adj;
      }
      if (adjustments.contrast) {
        const factor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }
      if (adjustments.saturation) {
        const satFactor = 1 + adjustments.saturation / 100;
        const avg = (r + g + b) / 3;
        r = avg + (r - avg) * satFactor;
        g = avg + (g - avg) * satFactor;
        b = avg + (b - avg) * satFactor;
      }
      if (adjustments.temperature) {
        const tAdj = adjustments.temperature / 2;
        r += tAdj; b -= tAdj;
      }
      if (adjustments.exposure) {
        const eAdj = Math.pow(2, adjustments.exposure / 50);
        r *= eAdj; g *= eAdj; b *= eAdj;
      }
      if (adjustments.vignette && adjustments.vignette > 0) {
        // Applied separately below (needs coordinates)
      }

      data[i] = clamp(r);
      data[i + 1] = clamp(g);
      data[i + 2] = clamp(b);
    }

    // Vignette effect (needs pixel coordinates)
    if (adjustments.vignette && adjustments.vignette > 0) {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2, cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const vigStrength = adjustments.vignette / 100;

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
          const vig = 1 - dist * dist * vigStrength;
          data[idx] = Math.max(0, data[idx] * vig);
          data[idx + 1] = Math.max(0, data[idx + 1] * vig);
          data[idx + 2] = Math.max(0, data[idx + 2] * vig);
        }
      }
    }

    // Film grain
    if (adjustments.grain && adjustments.grain > 0) {
      const grainAmount = adjustments.grain * 1.27;
      for (let i = 0; i < len; i += 4) {
        const grain = (Math.random() - 0.5) * grainAmount;
        data[i] = clamp(data[i] + grain);
        data[i + 1] = clamp(data[i + 1] + grain);
        data[i + 2] = clamp(data[i + 2] + grain);
      }
    }
  }

  function renderAnnotations(): void {
    const ctx = canvas.getContext("2d")!;

    for (const ann of annotations) {
      if ("start" in ann) {
        // Line
        const line = ann as AnnotationLine;
        ctx.beginPath();
        ctx.moveTo(line.start.x, line.start.y);
        ctx.lineTo(line.end.x, line.end.y);
        ctx.strokeStyle = line.color ?? "#ef4444";
        ctx.lineWidth = line.width ?? 2;
        ctx.lineCap = "round";
        ctx.stroke();
      } else if ("text" in ann) {
        // Text overlay
        const txt = ann as TextOverlay;
        ctx.save();
        if (txt.rotation) {
          ctx.translate(txt.x, txt.y);
          ctx.rotate((txt.rotation * Math.PI) / 180);
          ctx.translate(-txt.x, -txt.y);
        }
        ctx.font = `${txt.fontWeight ?? "normal"} ${txt.fontSize ?? 24}px ${txt.fontFamily ?? "-apple-system, sans-serif"}`;
        ctx.fillStyle = txt.color ?? "#ffffff";
        ctx.globalAlpha = txt.opacity ?? 1;
        if (txt.strokeColor) {
          ctx.strokeStyle = txt.strokeColor;
          ctx.lineWidth = txt.strokeWidth ?? 2;
          ctx.strokeText(txt.text, txt.x, txt.y);
        }
        ctx.fillText(txt.text, txt.x, txt.y);
        ctx.restore();
      } else {
        // Rectangle
        const rect = ann as AnnotationRect;
        if (rect.fillColor) {
          ctx.fillStyle = rect.fillColor;
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
        ctx.strokeStyle = rect.color ?? "#ef4444";
        ctx.lineWidth = rect.borderWidth ?? 2;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
    }
  }

  function applyWatermark(opts: WatermarkOptions): void {
    const ctx = canvas.getContext("2d")!;
    const pos = opts.position ?? "bottom-right";
    const opacity = opts.opacity ?? 0.3;
    const size = opts.size ?? 15;
    const margin = opts.margin ?? 20;

    ctx.globalAlpha = opacity;

    if (opts.image) {
      const wmImg = typeof opts.image === "string"
        ? awaitLoadImageSync(opts.image)
        : opts.image;

      const wmSize = Math.min(canvas.width, canvas.height) * (size / 100);
      const wmRatio = wmImg.naturalWidth / wmImg.naturalHeight;
      const wmW = wmSize;
      const wmH = wmSize / wmRatio;

      const [wx, wy] = getPosition(pos, wmW, wmH, margin);
      ctx.drawImage(wmImg, wx, wy, wmW, wmH);
    } else if (opts.text) {
      const fontSize = Math.round(canvas.width * (size / 100) / opts.text.length * 2);
      ctx.font = `${fontSize}px -apple-system, sans-serif`;
      ctx.fillStyle = "#ffffff";
      const metrics = ctx.measureText(opts.text);
      const [wx, wy] = getPosition(pos, metrics.width, fontSize, margin);
      ctx.fillText(opts.text, wx, wy);
    }

    ctx.globalAlpha = 1;
  }

  function getPosition(
    position: string,
    w: number,
    h: number,
    margin: number
  ): [number, number] {
    switch (position) {
      case "top-left": return [margin, h + margin];
      case "top-right": return [canvas.width - w - margin, h + margin];
      case "bottom-left": return [margin, canvas.height - margin];
      case "bottom-right": return [canvas.width - w - margin, canvas.height - margin];
      case "center": return [(canvas.width - w) / 2, (canvas.height - h) / 2 + h];
      default: return [canvas.width - w - margin, canvas.height - margin];
    }
  }

  function restoreFromHistory(entry: EditorHistoryEntry): void {
    if (entry.snapshot) {
      canvas.getContext("2d")!.putImageData(entry.snapshot, 0, 0);
    }
  }

  return instance;
}

// --- Utility Functions ---

async function loadSourceImage(source: string | File | Blob): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";

  return new Promise((resolve, reject) => {
    if (typeof source === "string") {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
      img.src = url;
    }
  });
}

function awaitLoadImageSync(src: string): HTMLImageElement {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  return img; // Synchronous — caller must ensure loaded or handle incomplete rendering
}

function cloneImageData(imageData: ImageData): ImageData {
  return new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function saturateChannel(value: number, amount: number): number {
  return clamp(((value / 255 - 0.5) * amount + 0.5) * 255);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
