/**
 * Photo Editor: Client-side image editing utility using Canvas API.
 * Supports crop, rotate, flip, filters, adjustments, annotations,
 * stickers, text overlay, and export to multiple formats.
 *
 * No external dependencies. All processing done via Canvas 2D API.
 */

// --- Types ---

export type FilterName =
  | "none" | "grayscale" | "sepia" | "invert" | "blur"
  | "sharpen" | "emboss" | "edge-detect" | "vintage" | "cold"
  | "warm" | "dramatic" | "fade" | "contrast" | "brightness"
  | "saturate" | "hue-rotate";

export interface FilterPreset {
  name: FilterName;
  label: string;
  params?: Record<string, number>;
}

export interface AdjustmentValues {
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100
  exposure: number;     // -100 to 100
  temperature: number;  // -100 to 100 (blue to yellow)
  tint: number;         // -100 to 100 (green to magenta)
  highlights: number;   // -100 to 100
  shadows: number;      // -100 to 100
  vibrance: number;     // -100 to 100
  sharpness: number;    // 0 to 100
  clarity: number;      // -100 to 100
  vignette: number;     // 0 to 100
  grain: number;        // 0 to 100
  fade: number;         // 0 to 100
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  rotation: number;
  opacity: number;
}

export interface StickerItem {
  id: string;
  emoji: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

export interface DrawStroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  opacity: number;
}

export interface PhotoEditorOptions {
  /** Source image (URL, HTMLImageElement, File, Blob, or data URI) */
  source: string | HTMLImageElement | File | Blob;
  /** Target container or selector */
  container?: HTMLElement | string;
  /** Canvas width (default: 800) */
  width?: number;
  /** Maximum output dimensions [w, h] (default: [4096, 4096]) */
  maxOutputSize?: [number, number];
  /** Background color for transparent areas (default: transparent) */
  backgroundColor?: string;
  /** Preserve EXIF orientation (default: true) */
  preserveExif?: boolean;
  /** Quality for JPEG export 0-1 (default: 0.92) */
  jpegQuality?: number;
  /** Show grid overlay during crop (default: true) */
  showCropGrid?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Callback when image loads */
  onLoad?: (dimensions: { width: number; height: number }) => void;
  /** Callback on any edit change */
  onChange?: () => void;
}

export interface PhotoEditorInstance {
  element: HTMLCanvasElement;
  /** Get current image dimensions */
  getDimensions: () => { width: number; height: number };
  /** Apply filter preset */
  applyFilter: (filter: FilterName) => void;
  /** Set adjustment value */
  setAdjustment: (key: keyof AdjustmentValues, value: number) => void;
  /** Get all adjustment values */
  getAdjustments: () => AdjustmentValues;
  /** Reset all adjustments */
  resetAdjustments: () => void;
  /** Rotate by degrees */
  rotate: (degrees: number) => void;
  /** Flip horizontally */
  flipH: () => void;
  /** Flip vertically */
  flipV: () => void;
  /** Set crop region */
  setCrop: (region: CropRegion) => void;
  /** Apply crop */
  applyCrop: () => void;
  /** Add text overlay */
  addText: (overlay: Omit<TextOverlay, "id">) => string;
  /** Update text overlay */
  updateText: (id: string, updates: Partial<TextOverlay>) => void;
  /** Remove text overlay */
  removeText: (id: string) => void;
  /** Add sticker */
  addSticker: (sticker: Omit<StickerItem, "id">) => string;
  /** Remove sticker */
  removeSticker: (id: string) => void;
  /** Start freehand drawing mode */
  startDrawing: (color?: string, width?: number) => void;
  /** Stop drawing mode */
  stopDrawing: () => void;
  /** Clear all drawings */
  clearDrawings: () => void;
  /** Undo last action */
  undo: () => void;
  /** Redo last undone action */
  redo: () => void;
  /** Export as data URL */
  exportDataUrl: (format?: "png" | "jpeg" | "webp", quality?: number) => string;
  /** Export as Blob */
  exportBlob: (format?: "png" | "jpeg" | "webp", quality?: number) => Promise<Blob>;
  /** Reset to original image */
  reset: () => void;
  /** Destroy editor */
  destroy: () => void;
}

// --- Constants ---

const DEFAULT_ADJUSTMENTS: AdjustmentValues = {
  brightness: 0, contrast: 0, saturation: 0, exposure: 0,
  temperature: 0, tint: 0, highlights: 0, shadows: 0,
  vibrance: 0, sharpness: 0, clarity: 0, vignette: 0,
  grain: 0, fade: 0,
};

const FILTER_PRESETS: FilterPreset[] = [
  { name: "none", label: "Original" },
  { name: "grayscale", label: "Grayscale" },
  { name: "sepia", label: "Sepia" },
  { name: "invert", label: "Invert" },
  { name: "vintage", label: "Vintage" },
  { name: "cold", label: "Cold" },
  { name: "warm", label: "Warm" },
  { name: "dramatic", label: "Dramatic" },
  { name: "fade", label: "Fade" },
];

// --- Helpers ---

function generateId(): string {
  return `edit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

async function loadSource(source: string | HTMLImageElement | File | Blob): Promise<HTMLImageElement> {
  if (source instanceof HTMLImageElement && source.complete) return source;
  if (source instanceof File || source instanceof Blob) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(source);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
      img.src = url;
    });
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = source as string;
  });
}

// --- Convolution Kernels ---

interface Kernel {
  weights: number[];
  size: number;
  divisor?: number;
}

const KERNELS: Record<string, Kernel> = {
  sharpen: { weights: [0, -1, 0, -1, 5, -1, 0, -1, 0], size: 3 },
  emboss: { weights: [-2, -1, 0, -1, 1, 1, 0, 1, 2], size: 3 },
  "edge-detect": { weights: [-1, -1, -1, -1, 8, -1, -1, -1, -1], size: 3 },
};

function applyConvolution(
  srcData: Uint8ClampedArray,
  w: number, h: number,
  kernel: Kernel,
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(srcData.length);
  const { weights, size, divisor = 1 } = kernel;
  const half = Math.floor(size / 2);

  for (let y = half; y < h - half; y++) {
    for (let x = half; x < w - half; x++) {
      let r = 0, g = 0, b = 0;
      let ky = 0;

      for (let kyOff = -half; kyOff <= half; kyOff++) {
        for (let kxOff = -half; kxOff <= half; kxOff++) {
          const idx = ((y + kyOff) * w + (x + kxOff)) * 4;
          const weight = weights[ky]!;
          r += srcData[idx]! * weight;
          g += srcData[idx + 1]! * weight;
          b += srcData[idx + 2]! * weight;
          ky++;
        }
      }

      const outIdx = (y * w + x) * 4;
      output[outIdx] = clamp(Math.round(r / divisor), 0, 255);
      output[outIdx + 1] = clamp(Math.round(g / divisor), 0, 255);
      output[outIdx + 2] = clamp(Math.round(b / divisor), 0, 255);
      output[outIdx + 3] = srcData[(y * w + x) * 4 + 3]!;
    }
  }

  return output;
}

// --- Main ---

export function createPhotoEditor(options: PhotoEditorOptions): PhotoEditorInstance {
  const opts = {
    width: 800,
    maxOutputSize: [4096, 4096] as [number, number],
    backgroundColor: undefined as string | undefined,
    preserveExif: true,
    jpegQuality: 0.92,
    showCropGrid: true,
    ...options,
  };

  const container = typeof opts.container === "string"
    ? document.querySelector<HTMLElement>(opts.container)!
    : opts.container ?? document.body;

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.className = `photo-editor-canvas ${opts.className ?? ""}`;
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;

  // State
  let originalImage: HTMLImageElement | null = null;
  let currentImage: HTMLImageElement | null = null;
  let adjustments = { ...DEFAULT_ADJUSTMENTS };
  let activeFilter: FilterName = "none";
  let rotation = 0;
  let flipHState = false;
  let flipVState = false;
  let cropRegion: CropRegion | null = null;
  const textOverlays: Map<string, TextOverlay> = new Map();
  const stickers: Map<string, StickerItem> = new Map();
  const drawings: DrawStroke[] = [];
  let isDrawing = false;
  let currentStroke: DrawStroke | null = null;
  let destroyed = false;

  // History for undo/redo
  interface HistoryEntry {
    imageData: ImageData;
  }
  const history: HistoryEntry[] = [];
  let historyIndex = -1;

  function saveHistory(): void {
    const entry: HistoryEntry = { imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) };
    // Remove future entries if we're not at the end
    if (historyIndex < history.length - 1) {
      history.splice(historyIndex + 1);
    }
    history.push(entry);
    historyIndex = history.length - 1;
    // Limit history size
    if (history.length > 30) {
      history.shift();
      historyIndex--;
    }
  }

  function render(): void {
    if (!currentImage) return;

    // Calculate rotated dimensions
    const rad = (rotation * Math.PI) / 180;
    const absCos = Math.abs(Math.cos(rad));
    const sinAbs = Math.abs(Math.sin(rad));
    const newW = currentImage.naturalWidth * absCos + currentImage.naturalHeight * sinAbs;
    const newH = currentImage.naturalWidth * sinAbs + currentImage.naturalHeight * absCos;

    canvas.width = Math.round(newW);
    canvas.height = Math.round(newH);

    // Background
    if (opts.backgroundColor) {
      ctx.fillStyle = opts.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    // Transform
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.scale(flipHState ? -1 : 1, flipVState ? -1 : 1);
    ctx.drawImage(currentImage, -currentImage.naturalWidth / 2, -currentImage.naturalHeight / 2);
    ctx.restore();

    // Apply pixel-level adjustments
    applyAdjustments();

    // Render overlays
    renderOverlays();

    opts.onChange?.();
  }

  function applyAdjustments(): void {
    if (activeFilter === "none" &&
        Object.values(adjustments).every(v => v === 0)) {
      return;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i]!;
      let g = data[i + 1]!;
      let b = data[i + 2]!;

      // Brightness
      if (adjustments.brightness !== 0) {
        const adj = adjustments.brightness * 2.55;
        r += adj; g += adj; b += adj;
      }

      // Contrast
      if (adjustments.contrast !== 0) {
        const factor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast));
        r = factor * (r - 128) + 128;
        g = factor * (g - 128) + 128;
        b = factor * (b - 128) + 128;
      }

      // Saturation
      if (adjustments.saturation !== 0) {
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const s = 1 + adjustments.saturation / 100;
        r = gray + s * (r - gray);
        g = gray + s * (g - gray);
        b = gray + s * (b - gray);
      }

      // Temperature
      if (adjustments.temperature !== 0) {
        r += adjustments.temperature * 0.5;
        b -= adjustments.temperature * 0.5;
      }

      // Tint
      if (adjustments.tint !== 0) {
        g += adjustments.tint * 0.5;
      }

      // Exposure
      if (adjustments.exposure !== 0) {
        const exp = Math.pow(2, adjustments.exposure / 50);
        r *= exp; g *= exp; b *= exp;
      }

      // Vibrance (smart saturation boost for less-saturated pixels)
      if (adjustments.vibrance !== 0) {
        const maxC = Math.max(r, g, b);
        const avgC = (r + g + b) / 3;
        const amt = adjustments.vibrance / 100 * (maxC - avgC) / 255 * 2;
        r += (maxC - r) * amt;
        g += (maxC - g) * amt;
        b += (maxC - b) * amt;
      }

      // Fade
      if (adjustments.fade > 0) {
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const f = adjustments.fade / 200;
        r = r + (gray - r) * f;
        g = g + (gray - g) * f;
        b = b + (gray - b) * f;
      }

      // Filter presets
      switch (activeFilter) {
        case "grayscale": {
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = g = b = gray;
          break;
        }
        case "sepia":
          r = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          g = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          b = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
          break;
        case "invert":
          r = 255 - r; g = 255 - g; b = 255 - b;
          break;
        case "vintage":
          r = Math.min(255, r * 1.1 + 20);
          g = Math.min(255, g * 0.95 + 10);
          b = Math.max(0, b * 0.8 - 10);
          break;
        case "cold":
          b = Math.min(255, b * 1.15 + 15);
          r = Math.max(0, r * 0.92);
          break;
        case "warm":
          r = Math.min(255, r * 1.12 + 18);
          b = Math.max(0, b * 0.88);
          break;
        case "dramatic": {
          const c = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
          const s = 1.35;
          r = c + (r - c) * s;
          g = c + (g - c) * s;
          b = c + (b - c) * s;
          break;
        }
      }

      data[i] = clamp(Math.round(r), 0, 255);
      data[i + 1] = clamp(Math.round(g), 0, 255);
      data[i + 2] = clamp(Math.round(b), 0, 255);
    }

    // Apply convolution filters
    if (KERNELS[activeFilter]) {
      const result = applyConvolution(data, canvas.width, canvas.height, KERNELS[activeFilter]!);
      for (let i = 0; i < data.length; i++) {
        data[i] = result[i]!;
      }
    }

    // Vignette
    if (adjustments.vignette > 0) {
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      const strength = adjustments.vignette / 100;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
          if (dist > 0.4) {
            const factor = 1 - ((dist - 0.4) / 0.6) * strength;
            const i = (y * canvas.width + x) * 4;
            data[i] = Math.round(data[i]! * factor);
            data[i + 1] = Math.round(data[i + 1]! * factor);
            data[i + 2] = Math.round(data[i + 2]! * factor);
          }
        }
      }
    }

    // Grain
    if (adjustments.grain > 0) {
      const amount = adjustments.grain * 2.55;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * amount;
        data[i] = clamp(data[i]! + noise, 0, 255);
        data[i + 1] = clamp(data[i + 1]! + noise, 0, 255);
        data[i + 2] = clamp(data[i + 2]! + noise, 0, 255);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function renderOverlays(): void {
    // Text overlays
    for (const [, overlay] of textOverlays) {
      ctx.save();
      ctx.translate(overlay.x, overlay.y);
      ctx.rotate((overlay.rotation * Math.PI) / 180);
      ctx.globalAlpha = overlay.opacity;
      ctx.font = `${overlay.fontWeight} ${overlay.fontSize}px ${overlay.fontFamily}`;
      ctx.fillStyle = overlay.color;
      ctx.fillText(overlay.text, 0, 0);
      ctx.restore();
    }

    // Stickers
    for (const [, sticker] of stickers) {
      ctx.save();
      ctx.translate(sticker.x, sticker.y);
      ctx.rotate((sticker.rotation * Math.PI) / 180);
      ctx.font = `${sticker.size}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sticker.emoji, 0, 0);
      ctx.restore();
    }

    // Drawings
    for (const stroke of drawings) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Drawing handlers
  function handleDrawStart(e: MouseEvent | TouchEvent): void {
    if (!isDrawing || destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    currentStroke = {
      points: [{ x, y }],
      color: "#000000",
      width: 3,
      opacity: 1,
    };
  }

  function handleDrawMove(e: MouseEvent | TouchEvent): void {
    if (!isDrawing || !currentStroke || destroyed) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    currentStroke.points.push({ x, y });
    render(); // Re-render with current stroke
  }

  function handleDrawEnd(): void {
    if (!currentStroke) return;
    drawings.push(currentStroke);
    currentStroke = null;
    saveHistory();
  }

  // Initialize
  loadSource(opts.source).then(img => {
    originalImage = img;
    currentImage = img;
    opts.onLoad?.({ width: img.naturalWidth, height: img.naturalHeight });
    render();
    saveHistory();
  });

  // Drawing event listeners
  canvas.addEventListener("mousedown", handleDrawStart);
  canvas.addEventListener("mousemove", handleDrawMove);
  canvas.addEventListener("mouseup", handleDrawEnd);
  canvas.addEventListener("mouseleave", handleDrawEnd);
  canvas.addEventListener("touchstart", handleDrawStart, { passive: false });
  canvas.addEventListener("touchmove", handleDrawMove, { passive: false });
  canvas.addEventListener("touchend", handleDrawEnd);

  // Instance
  const instance: PhotoEditorInstance = {
    element: canvas,

    getDimensions() {
      return { width: canvas.width, height: canvas.height };
    },

    applyFilter(filter: FilterName) {
      activeFilter = filter;
      render();
      saveHistory();
    },

    setAdjustment(key, value) {
      (adjustments as Record<string, number>)[key] = value;
      render();
    },

    getAdjustments() { return { ...adjustments }; },

    resetAdjustments() {
      adjustments = { ...DEFAULT_ADJUSTMENTS };
      activeFilter = "none";
      render();
    },

    rotate(degrees) {
      rotation = (rotation + degrees) % 360;
      render();
      saveHistory();
    },

    flipH() {
      flipHState = !flipHState;
      render();
      saveHistory();
    },

    flipV() {
      flipVState = !flipVState;
      render();
      saveHistory();
    },

    setCrop(region) {
      cropRegion = region;
    },

    applyCrop() {
      if (!cropRegion || !currentImage) return;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = cropRegion.width;
      tempCanvas.height = cropRegion.height;
      const tCtx = tempCanvas.getContext("2d")!;
      tCtx.drawImage(
        canvas,
        cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
        0, 0, cropRegion.width, cropRegion.height,
      );
      // Convert back to image
      const cropped = new Image();
      cropped.onload = () => {
        currentImage = cropped;
        cropRegion = null;
        rotation = 0;
        flipHState = false;
        flipVState = false;
        render();
        saveHistory();
      };
      cropped.src = tempCanvas.toDataURL();
    },

    addText(overlay) {
      const id = generateId();
      const full: TextOverlay = { ...overlay, id };
      textOverlays.set(id, full);
      render();
      saveHistory();
      return id;
    },

    updateText(id, updates) {
      const existing = textOverlays.get(id);
      if (existing) {
        Object.assign(existing, updates);
        render();
        saveHistory();
      }
    },

    removeText(id) {
      textOverlays.delete(id);
      render();
      saveHistory();
    },

    addSticker(sticker) {
      const id = generateId();
      const full: StickerItem = { ...sticker, id };
      stickers.set(id, full);
      render();
      saveHistory();
      return id;
    },

    removeSticker(id) {
      stickers.delete(id);
      render();
      saveHistory();
    },

    startDrawing(color = "#000000", width = 3) {
      isDrawing = true;
      canvas.style.cursor = "crosshair";
      if (currentStroke) {
        currentStroke.color = color;
        currentStroke.width = width;
      }
    },

    stopDrawing() {
      isDrawing = false;
      canvas.style.cursor = "default";
    },

    clearDrawings() {
      drawings.length = 0;
      render();
      saveHistory();
    },

    undo() {
      if (historyIndex > 0) {
        historyIndex--;
        const entry = history[historyIndex]!;
        ctx.putImageData(entry.imageData, 0, 0);
      }
    },

    redo() {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        const entry = history[historyIndex]!;
        ctx.putImageData(entry.imageData, 0, 0);
      }
    },

    exportDataUrl(format = "png", quality?: number) {
      return canvas.toDataURL(
        `image/${format}`,
        quality ?? (format === "jpeg" ? opts.jpegQuality : undefined),
      );
    },

    async exportBlob(format = "png", quality?: number): Promise<Blob> {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          blob => blob ? resolve(blob) : reject(new Error("Export failed")),
          `image/${format}`,
          quality ?? (format === "jpeg" ? opts.jpegQuality : undefined),
        );
      });
    },

    reset() {
      if (!originalImage) return;
      currentImage = originalImage;
      adjustments = { ...DEFAULT_ADJUSTMENTS };
      activeFilter = "none";
      rotation = 0;
      flipHState = false;
      flipVState = false;
      cropRegion = null;
      textOverlays.clear();
      stickers.clear();
      drawings.length = 0;
      render();
      saveHistory();
    },

    destroy() {
      destroyed = true;
      canvas.removeEventListener("mousedown", handleDrawStart);
      canvas.removeEventListener("mousemove", handleDrawMove);
      canvas.removeEventListener("mouseup", handleDrawEnd);
      canvas.removeEventListener("mouseleave", handleDrawEnd);
      canvas.remove();
    },
  };

  return instance;
}

/** Get available filter presets */
export function getFilterPresets(): FilterPreset[] {
  return [...FILTER_PRESETS];
}
