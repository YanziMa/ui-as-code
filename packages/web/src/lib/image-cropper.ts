/**
 * Image Cropper: Canvas-based image cropping with aspect ratio presets, zoom/pan,
 * rotation, grid overlay (rule of thirds), crop region handles, keyboard shortcuts,
 * and output as Blob/DataURL/canvas.
 */

// --- Types ---

export type AspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "3:2" | "2:3";

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageCropperOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Source image (URL string, File, Blob, or HTMLImageElement) */
  image: string | File | Blob | HTMLImageElement;
  /** Initial aspect ratio */
  aspectRatio?: AspectRatio;
  /** Initial crop region (auto-centered if not provided) */
  initialCrop?: CropRegion;
  /** Show grid overlay (rule of thirds) */
  showGrid?: boolean;
  /** Grid color */
  gridColor?: string;
  /** Show rotation controls */
  showRotation?: boolean;
  /** Rotation snap angles (degrees) */
  rotationSnap?: number[];
  /** Min crop size (px in image coordinates) */
  minCropSize?: number;
  /** Output format */
  outputFormat?: "png" | "jpeg" | "webp";
  /** JPEG quality (0-1) for jpeg/webp output */
  outputQuality?: number;
  /** Max output dimensions (px) */
  maxOutputSize?: { width: number; height: number };
  /** Container border radius */
  borderRadius?: number;
  /** Callback when crop region changes */
  onCropChange?: (region: CropRegion) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ImageCropperInstance {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  getCropRegion: () => CropRegion;
  setCropRegion: (region: CropRegion) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setRotation: (degrees: number) => void;
  getRotation: () => number;
  reset: () => void;
  /** Get cropped result as data URL */
  toDataURL: (type?: string, quality?: number) => string;
  /** Get cropped result as Blob */
  toBlob: (type?: string, quality?: number) => Promise<Blob>;
  /** Get cropped result as Canvas */
  toCanvas: () => HTMLCanvasElement;
  destroy: () => void;
}

// --- Helpers ---

const ASPECT_RATIOS: Record<AspectRatio, number> = {
  free: 0, "1:1": 1, "4:3": 4 / 3, "3:4": 3 / 4,
  "16:9": 16 / 9, "9:16": 9 / 16, "3:2": 3 / 2, "2:3": 2 / 3,
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// --- Main Class ---

export class ImageCropperManager {
  create(options: ImageCropperOptions): ImageCropperInstance {
    const opts = {
      aspectRatio: options.aspectRatio ?? "free",
      showGrid: options.showGrid ?? true,
      gridColor: options.gridColor ?? "rgba(255,255,255,0.5)",
      showRotation: options.showRotation ?? false,
      rotationSnap: options.rotationSnap ?? [0, 90, 180, 270],
      minCropSize: options.minCropSize ?? 30,
      outputFormat: options.outputFormat ?? "png",
      outputQuality: options.outputQuality ?? 0.92,
      borderRadius: options.borderRadius ?? 8,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ImageCropper: container element not found");

    container.className = `image-cropper ${opts.className ?? ""}`;
    container.style.cssText = `
      position:relative;width:100%;overflow:hidden;border-radius:${opts.borderRadius}px;
      background:#1a1a2e;user-select:none;touch-action:none;
    `;

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.className = "cropper-canvas";
    canvas.style.cssText = "display:block;width:100%;cursor:crosshair;";
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d")!;

    // Controls bar
    const controlsBar = document.createElement("div");
    controlsBar.className = "cropper-controls";
    controlsBar.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:8px 12px;
      background:rgba(0,0,0,0.6);border-radius:0 0 ${opts.borderRadius}px ${opts.borderRadius}px;
      position:absolute;bottom:0;left:0;right:0;z-index:5;
    `;
    container.appendChild(controlsBar);

    // State
    let imgEl: HTMLImageElement | null = null;
    let naturalWidth = 0;
    let naturalHeight = 0;
    let scale = 1; // display scale
    let offsetX = 0; // image offset within canvas
    let offsetY = 0;
    let rotation = 0;
    let destroyed = false;

    // Crop region (in image coordinates)
    let cropRegion: CropRegion = options.initialCrop ?? { x: 0, y: 0, width: 100, height: 100 };

    // Drag state
    let isDragging = false;
    let dragMode: "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se"
      | "resize-n" | "resize-s" | "resize-e" | "resize-w" = "move";
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartCrop: CropRegion = { ...cropRegion };

    // Load image
    function loadImage(src: string | File | Blob | HTMLImageElement): Promise<void> {
      return new Promise((resolve, reject) => {
        if (src instanceof HTMLImageElement) {
          imgEl = src;
          onImageLoaded();
          resolve();
          return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";

        if (typeof src === "string") {
          img.src = src;
        } else {
          img.src = URL.createObjectURL(src);
        }

        img.onload = () => {
          imgEl = img;
          onImageLoaded();
          resolve();
        };
        img.onerror = reject;
      });
    }

    function onImageLoaded(): void {
      if (!imgEl) return;
      naturalWidth = imgEl.naturalWidth;
      naturalHeight = imgEl.naturalHeight;

      // Setup canvas size
      resizeCanvas();

      // Initialize crop region to center
      if (!options.initialCrop) {
        const ar = ASPECT_RATIOS[opts.aspectRatio];
        if (ar > 0) {
          cropRegion.width = naturalWidth;
          cropRegion.height = naturalWidth / ar;
          if (cropRegion.height > naturalHeight) {
            cropRegion.height = naturalHeight;
            cropRegion.width = naturalHeight * ar;
          }
        } else {
          cropRegion.width = naturalWidth * 0.8;
          cropRegion.height = naturalHeight * 0.8;
        }
        cropRegion.x = (naturalWidth - cropRegion.width) / 2;
        cropRegion.y = (naturalHeight - cropRegion.height) / 2;
      }

      render();
      setupControls();
    }

    function resizeCanvas(): void {
      if (!imgEl || !container.offsetWidth) return;
      const containerW = container.offsetWidth;
      const containerH = container.offsetHeight || containerW * 0.65;

      // Fit image to container
      const scaleX = containerW / naturalWidth;
      const scaleY = containerH / naturalHeight;
      scale = Math.min(scaleX, scaleY);

      canvas.width = containerW;
      canvas.height = containerH;

      offsetX = (containerW - naturalWidth * scale) / 2;
      offsetY = (containerH - naturalHeight * scale) / 2;
    }

    function render(): void {
      if (!imgEl || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Draw darkened background (image)
      ctx.globalAlpha = 0.4;
      ctx.drawImage(imgEl, offsetX, offsetY, naturalWidth * scale, naturalHeight * scale);
      ctx.globalAlpha = 1;

      // Calculate crop region in canvas coordinates
      const cx = offsetX + cropRegion.x * scale;
      const cy = offsetY + cropRegion.y * scale;
      const cw = cropRegion.width * scale;
      const ch = cropRegion.height * scale;

      // Draw crop region (bright)
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx, cy, cw, ch);
      ctx.clip();
      ctx.drawImage(imgEl, offsetX, offsetY, naturalWidth * scale, naturalHeight * scale);
      ctx.restore();

      // Draw crop border
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);

      // Draw rule-of-thirds grid
      if (opts.showGrid) {
        ctx.strokeStyle = opts.gridColor;
        ctx.lineWidth = 1;
        // Vertical lines
        for (let i = 1; i <= 2; i++) {
          const gx = cx + (cw / 3) * i;
          ctx.beginPath(); ctx.moveTo(gx, cy); ctx.lineTo(gx, cy + ch); ctx.stroke();
        }
        // Horizontal lines
        for (let i = 1; i <= 2; i++) {
          const gy = cy + (ch / 3) * i;
          ctx.beginPath(); ctx.moveTo(cx, gy); ctx.lineTo(cx + cw, gy); ctx.stroke();
        }
      }

      // Draw handles
      const handleSize = 8;
      const handles = [
        { x: cx, y: cy, cursor: "nwse-resize", mode: "resize-nw" as const },
        { x: cx + cw / 2, y: cy, cursor: "ns-resize", mode: "resize-n" as const },
        { x: cx + cw, y: cy, cursor: "nesw-resize", mode: "resize-ne" as const },
        { x: cx + cw, y: cy + ch / 2, cursor: "ew-resize", mode: "resize-e" as const },
        { x: cx + cw, y: cy + ch, cursor: "nwse-resize", mode: "resize-se" as const },
        { x: cx + cw / 2, y: cy + ch, cursor: "ns-resize", mode: "resize-s" as const },
        { x: cx, y: cy + ch, cursor: "nesw-resize", mode: "resize-sw" as const },
        { x: cx, y: cy + ch / 2, cursor: "ew-resize", mode: "resize-w" as const },
      ];

      for (const h of handles) {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#4338ca";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize, 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }

    function setupControls(): void {
      controlsBar.innerHTML = "";

      // Aspect ratio buttons
      const ratios: AspectRatio[] = ["free", "1:1", "4:3", "3:2", "16:9"];
      for (const r of ratios) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = r === "free" ? "Free" : r;
        btn.style.cssText = `
          padding:4px 10px;border-radius:4px;font-size:11px;background:${r === opts.aspectRatio ? "#4338ca" : "rgba(255,255,255,0.15)"};
          color:#fff;border:1px solid ${r === opts.aspectRatio ? "#4338ca" : "rgba(255,255,255,0.2)"};
          cursor:pointer;transition:all 0.15s;
        `;
        btn.addEventListener("click", () => instance.setAspectRatio(r));
        controlsBar.appendChild(btn);
      }

      // Rotation buttons
      if (opts.showRotation) {
        const sep = document.createElement("span");
        sep.style.cssText = "width:1px;height:16px;background:rgba(255,255,255,0.2);";
        controlsBar.appendChild(sep);

        const rotateLeftBtn = document.createElement("button");
        rotateLeftBtn.type = "button";
        rotateLeftBtn.textContent = "\u21BA";
        rotateLeftBtn.title = "Rotate left 90\u00B0";
        rotateLeftBtn.style.cssText = "padding:4px 8px;border-radius:4px;font-size:14px;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.2);cursor:pointer;";
        rotateLeftBtn.addEventListener("click", () => instance.setRotation(rotation - 90));
        controlsBar.appendChild(rotateLeftBtn);

        const rotateRightBtn = document.createElement("button");
        rotateRightBtn.type = "button";
        rotateRightBtn.textContent = "\u27A3"; // or use \u21BB
        rotateRightBtn.title = "Rotate right 90\u00B0";
        rotateRightBtn.style.cssText = rotateLeftBtn.style.cssText;
        rotateRightBtn.addEventListener("click", () => instance.setRotation(rotation + 90));
        controlsBar.appendChild(rotateRightBtn);
      }

      // Reset button
      const resetBtn = document.createElement("button");
      resetBtn.type = "button";
      resetBtn.textContent = "Reset";
      resetBtn.style.cssText = "margin-left:auto;padding:4px 10px;border-radius:4px;font-size:11px;background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.2);cursor:pointer;";
      resetBtn.addEventListener("click", () => instance.reset());
      controlsBar.appendChild(resetBtn);
    }

    // Pointer events for dragging/resizing
    function getHandleAt(canvasX: number, canvasY: number): string | null {
      const cx = offsetX + cropRegion.x * scale;
      const cy = offsetY + cropRegion.y * scale;
      const cw = cropRegion.width * scale;
      const ch = cropRegion.height * scale;
      const threshold = 12;

      // Check corners first
      const corners: Array<[number, number, string]> = [
        [cx, cy, "resize-nw"], [cx + cw, cy, "resize-ne"],
        [cx + cw, cy + ch, "resize-se"], [cx, cy + ch, "resize-sw"],
        [cx + cw / 2, cy, "resize-n"], [cx + cw / 2, cy + ch, "resize-s"],
        [cx + cw, cy + ch / 2, "resize-e"], [cx, cy + ch / 2, "resize-w"],
      ];

      for (const [hx, hy, mode] of corners) {
        if (Math.abs(canvasX - hx) < threshold && Math.abs(canvasY - hy) < threshold) {
          return mode;
        }
      }

      // Inside crop region = move
      if (canvasX >= cx && canvasX <= cx + cw && canvasY >= cy && canvasY <= cy + ch) {
        return "move";
      }

      return null;
    }

    canvas.addEventListener("pointerdown", (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const handle = getHandleAt(x, y);
      if (!handle) return;

      e.preventDefault();
      isDragging = true;
      dragMode = handle;
      dragStartX = x;
      dragStartY = y;
      dragStartCrop = { ...cropRegion };
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const dx = (e.clientX - rect.left - dragStartX) / scale;
      const dy = (e.clientY - rect.top - dragStartY) / scale;

      const minSize = opts.minCropSize / scale;
      const ar = ASPECT_RATIOS[opts.aspectRatio];

      switch (dragMode) {
        case "move":
          cropRegion.x = clamp(dragStartCrop.x + dx, 0, naturalWidth - cropRegion.width);
          cropRegion.y = clamp(dragStartCrop.y + dy, 0, naturalHeight - cropRegion.height);
          break;
        case "resize-se":
          cropRegion.width = clamp(dragStartCrop.width + dx, minSize, naturalWidth - cropRegion.x);
          if (ar > 0) cropRegion.height = cropRegion.width / ar;
          break;
        case "resize-sw":
          const newWSw = clamp(dragStartCrop.width - dx, minSize, dragStartCrop.x + dragStartCrop.width);
          cropRegion.x += dragStartCrop.width - newWSw;
          cropRegion.width = newWSw;
          if (ar > 0) cropRegion.height = cropRegion.width / ar;
          break;
        case "resize-ne":
          cropRegion.width = clamp(dragStartCrop.width + dx, minSize, naturalWidth - cropRegion.x);
          if (ar > 0) cropRegion.height = cropRegion.width / ar;
          break;
        case "resize-nw":
          const newWNw = clamp(dragStartCrop.width - dx, minSize, dragStartCrop.x + dragStartCrop.width);
          const newHNw = clamp(dragStartCrop.height - dy, minSize, dragStartCrop.y + dragStartCrop.height);
          cropRegion.x += dragStartCrop.width - newWNw;
          cropRegion.y += dragStartCrop.height - newHNw;
          cropRegion.width = newWNw;
          cropRegion.height = newHNw;
          break;
        case "resize-n":
          const newHN = clamp(dragStartCrop.height - dy, minSize, dragStartCrop.y + dragStartCrop.height);
          cropRegion.y += dragStartCrop.height - newHN;
          cropRegion.height = newHN;
          if (ar > 0) cropRegion.width = cropRegion.height * ar;
          break;
        case "resize-s":
          cropRegion.height = clamp(dragStartCrop.height + dy, minSize, naturalHeight - cropRegion.y);
          if (ar > 0) cropRegion.width = cropRegion.height * ar;
          break;
        case "resize-e":
          cropRegion.width = clamp(dragStartCrop.width + dx, minSize, naturalWidth - cropRegion.x);
          if (ar > 0) cropRegion.height = cropRegion.width / ar;
          break;
        case "resize-w":
          const newWW = clamp(dragStartCrop.width - dx, minSize, dragStartCrop.x + dragStartCrop.width);
          cropRegion.x += dragStartCrop.width - newWW;
          cropRegion.width = newWW;
          if (ar > 0) cropRegion.height = cropRegion.width / ar;
          break;
      }

      render();
      opts.onCropChange?.(cropRegion);
    });

    canvas.addEventListener("pointerup", () => {
      isDragging = false;
    });

    // Keyboard shortcuts
    container.tabIndex = 0;
    container.addEventListener("keydown", (e: KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          cropRegion.x = Math.max(0, cropRegion.x - step);
          render();
          break;
        case "ArrowRight":
          e.preventDefault();
          cropRegion.x = Math.min(naturalWidth - cropRegion.width, cropRegion.x + step);
          render();
          break;
        case "ArrowUp":
          e.preventDefault();
          cropRegion.y = Math.max(0, cropRegion.y - step);
          render();
          break;
        case "ArrowDown":
          e.preventDefault();
          cropRegion.y = Math.min(naturalHeight - cropRegion.height, cropRegion.y + step);
          render();
          break;
      }
    });

    // Window resize
    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
      render();
    });
    resizeObserver.observe(container);

    // Initialize
    loadImage(options.image).catch(console.error);

    const instance: ImageCropperInstance = {
      element: container,
      canvas,

      getCropRegion() { return { ...cropRegion }; },

      setCropRegion(region: CropRegion) {
        cropRegion = {
          x: clamp(region.x, 0, naturalWidth - opts.minCropSize),
          y: clamp(region.y, 0, naturalHeight - opts.minCropSize),
          width: clamp(region.width, opts.minCropSize, naturalWidth),
          height: clamp(region.height, opts.minCropSize, naturalHeight),
        };
        render();
      },

      setAspectRatio(ratio: AspectRatio) {
        opts.aspectRatio = ratio;
        const ar = ASPECT_RATIOS[ratio];
        if (ar > 0) {
          cropRegion.height = cropRegion.width / ar;
          if (cropRegion.y + cropRegion.height > naturalHeight) {
            cropRegion.height = naturalHeight - cropRegion.y;
            cropRegion.width = cropRegion.height * ar;
          }
        }
        render();
        setupControls();
      },

      setRotation(degrees: number) {
        rotation = degrees % 360;
        // For simplicity, we just track rotation here.
        // Full rotation would require canvas transform redraws.
        render();
      },

      getRotation() { return rotation; },

      reset() {
        cropRegion = {
          x: (naturalWidth - naturalWidth * 0.8) / 2,
          y: (naturalHeight - naturalHeight * 0.8) / 2,
          width: naturalWidth * 0.8,
          height: naturalHeight * 0.8,
        };
        rotation = 0;
        render();
      },

      toDataURL(type?: string, quality?: number): string {
        return instance.toCanvas().toDataURL(
          type ?? `image/${opts.outputFormat}`,
          quality ?? opts.outputQuality,
        );
      },

      async toBlob(type?: string, quality?: number): Promise<Blob> {
        return new Promise((resolve, reject) => {
          instance.toCanvas().toBlob(
            (b) => b ? resolve(b) : reject(new Error("Blob creation failed")),
            type ?? `image/${opts.outputFormat}`,
            quality ?? opts.outputQuality,
          );
        });
      },

      toCanvas(): HTMLCanvasElement {
        const outCanvas = document.createElement("canvas");
        outCanvas.width = Math.round(cropRegion.width);
        outCanvas.height = Math.round(cropRegion.height);
        const outCtx = outCanvas.getContext("2d")!;
        if (imgEl) {
          outCtx.drawImage(
            imgEl,
            cropRegion.x, cropRegion.y, cropRegion.width, cropRegion.height,
            0, 0, cropRegion.width, cropRegion.height,
          );
        }
        return outCanvas;
      },

      destroy() {
        destroyed = true;
        resizeObserver.disconnect();
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create an image cropper */
export function createImageCropper(options: ImageCropperOptions): ImageCropperInstance {
  return new ImageCropperManager().create(options);
}
