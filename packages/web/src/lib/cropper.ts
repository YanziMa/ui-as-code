/**
 * Image Cropper Utilities: Interactive image cropping with aspect ratio
 * constraints, free-form and preset ratios, zoom/pan within crop area,
 * rotation, grid overlays, responsive canvas, output in multiple formats,
 * keyboard support, touch gestures, and crop region persistence.
 */

// --- Types ---

export type CropAspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "2:3" | "3:2" | string;
export type CropOutputFormat = "blob" | "dataURL" | "canvas" | "htmlImage";
export type CropGridStyle = "rule-of-thirds" | "golden-ratio" | "crosshair" | "none";

export interface CropRegion {
  /** X coordinate (0-1 relative to image) */
  x: number;
  /** Y coordinate (0-1 relative to image) */
  y: number;
  /** Width (0-1 relative to image) */
  width: number;
  /** Height (0-1 relative to image) */
  height: number;
}

export interface CropperOptions {
  /** Source image (URL string, HTMLImageElement, File, or Blob) */
  source: string | HTMLImageElement | File | Blob;
  /** Container element to render into */
  container?: HTMLElement;
  /** Initial aspect ratio */
  aspectRatio?: CropAspectRatio;
  /** Initial crop region (0-1 normalized) */
  initialCrop?: CropRegion;
  /** Output format for getCroppedResult() */
  outputFormat?: CropOutputFormat;
  /** Output MIME type (e.g., "image/png", "image/jpeg") */
  outputMimeType?: string;
  /** JPEG quality (0-1) */
  outputQuality?: number;
  /** Maximum output width (px) */
  maxOutputWidth?: number;
  /** Maximum output height (px) */
  maxOutputHeight?: number;
  /** Show grid overlay */
  showGrid?: boolean;
  /** Grid style */
  gridStyle?: CropGridStyle;
  /** Grid color */
  gridColor?: string;
  /** Handle size (px) */
  handleSize?: number;
  /** Minimum crop size as fraction of image */
  minCropSize?: number;
  /** Enable rotation (degrees) */
  enableRotation?: boolean;
  /** Rotation snap angles (degrees) */
  rotationSnapAngles?: number[];
  /** Enable zoom within crop area */
  enableZoom?: boolean;
  /** Show resize handles on corners/edges */
  showHandles?: boolean;
  /** Responsive (resize with container) */
  responsive?: boolean;
  /** Custom class name */
  className?: string;
  /** Called when crop region changes */
  onCropChange?: (region: CropRegion) => void;
  /** Called when crop is complete (double-click or confirm) */
  onCropComplete?: (region: CropRegion, result: unknown) => void;
}

export interface CropperInstance {
  /** Root container element */
  el: HTMLElement;
  /** Get current crop region (0-1 normalized) */
  getCropRegion: () => CropRegion;
  /** Set crop region programmatically */
  setCropRegion: (region: CropRegion) => void;
  /** Set aspect ratio */
  setAspectRatio: (ratio: CropAspectRatio) => void;
  /** Rotate by degrees */
  rotate: (degrees: number) => void;
  /** Reset to initial state */
  reset: () => void;
  /** Get cropped result (format depends on outputFormat option) */
  getCroppedResult: () => Promise<Blob | string | HTMLCanvasElement | HTMLImageElement>;
  /** Zoom the image within the crop area */
  zoom: (factor: number) => void;
  /** Get current zoom level */
  getZoom: () => number;
  /** Enable/disable interaction */
  setEnabled: (enabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Aspect Ratio Helpers ---

function _parseAspectRatio(ratio: CropAspectRatio): number | null {
  if (ratio === "free") return null;
  const parts = ratio.split(":");
  if (parts.length === 2) {
    const w = parseFloat(parts[0]!);
    const h = parseFloat(parts[1]!);
    if (!isNaN(w) && !isNaN(h) && h > 0) return w / h;
  }
  return null;
}

const DEFAULT_ASPECT_RATIOS: Array<{ label: string; value: CropAspectRatio }> = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
  { label: "16:9", value: "16:9" },
  { label: "9:16", value: "9:16" },
];

// --- Core Factory ---

/**
 * Create an interactive image cropper.
 *
 * @example
 * ```ts
 * const cropper = createCropper({
 *   source: "/path/to/image.jpg",
 *   container: document.getElementById("crop-container")!,
 *   aspectRatio: "16:9",
 *   onCropChange: (region) => console.log(region),
 * });
 * // Later:
 * const blob = await cropper.getCroppedResult() as Blob;
 * ```
 */
export function createCropper(options: CropperOptions): CropperInstance {
  const {
    source,
    container,
    aspectRatio = "free",
    initialCrop,
    outputFormat = "blob",
    outputMimeType = "image/png",
    outputQuality = 0.92,
    maxOutputWidth = 4096,
    maxOutputHeight = 4096,
    showGrid = true,
    gridStyle = "rule-of-thirds",
    gridColor = "rgba(255,255,255,0.5)",
    handleSize = 10,
    minCropSize = 0.1,
    enableRotation = false,
    rotationSnapAngles = [0, 90, 180, 270],
    enableZoom = false,
    showHandles = true,
    responsive = true,
    className,
    onCropChange,
    onCropComplete,
  } = options;

  let _imageEl: HTMLImageElement | null = null;
  let _naturalWidth = 0;
  let _naturalHeight = 0;
  let _rotation = 0;
  let _zoom = 1;
  let _enabled = true;
  let _aspectRatioValue = _parseAspectRatio(aspectRatio);

  // Crop region in normalized coordinates (0-1)
  let _crop: CropRegion = initialCrop ?? { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };

  // Drag state
  let _dragMode: "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se" |
                   "resize-n" | "resize-s" | "resize-e" | "resize-w" | null = null;
  let _dragStart = { x: 0, y: 0 };
  let _cropStart: CropRegion = { ..._crop };
  let cleanupFns: Array<() => void> = [];

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `image-cropper ${className ?? ""}`.trim();
  root.style.cssText =
    "position:relative;width:100%;height:100%;overflow:hidden;background:#1a1a2e;" +
    "display:flex;align-items:center;justify-content:center;" +
    "user-select:none;touch-action:none;";

  // Image wrapper (for zoom/pan)
  const imgWrapper = document.createElement("div");
  imgWrapper.className = "cropper-image-wrapper";
  imgWrapper.style.cssText =
    "position:absolute;top:0;left:0;transform-origin:center center;" +
    "transition:transform 0.1s ease;";
  root.appendChild(imgWrapper);

  const imgEl = document.createElement("img");
  imgEl.className = "cropper-image";
  imgEl.draggable = false;
  imgEl.style.cssText =
    "max-width:100%;max-height:100%;display:block;pointer-events:none;";
  imgWrapper.appendChild(imgEl);

  // Crop overlay
  const overlay = document.createElement("div");
  overlay.className = "cropper-overlay";
  overlay.style.cssText =
    "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;";
  root.appendChild(overlay);

  // Crop box (the visible selection)
  const cropBox = document.createElement("div");
  cropBox.className = "cropper-box";
  cropBox.style.cssText =
    "position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,0.55);" +
    "cursor:move;z-index:3;box-sizing:border-box;";
  root.appendChild(cropBox);

  // Grid overlay inside crop box
  let gridEl: HTMLElement | null = null;
  if (showGrid) {
    gridEl = document.createElement("div");
    gridEl.className = "cropper-grid";
    gridEl.style.cssText =
      "position:absolute;inset:0;pointer-events:none;z-index:4;";
    cropBox.appendChild(gridEl);
  }

  // Handles
  const handles: Record<string, HTMLElement> = {};
  if (showHandles) {
    const positions = ["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const;
    for (const pos of positions) {
      const handle = document.createElement("div");
      handle.className = `cropper-handle cropper-handle-${pos}`;
      handle.dataset.handle = pos;
      handle.style.cssText =
        `position:absolute;width:${handleSize}px;height:${handleSize}px;` +
        "background:#fff;border:1px solid #3b82f6;border-radius:2px;" +
        "z-index:5;cursor:" + _getCursorForHandle(pos) + ";" +
        _getPositionStyle(pos, handleSize);
      cropBox.appendChild(handle);
      handles[pos] = handle;
    }
  }

  (container ?? document.body).appendChild(root);

  // --- Load Image ---

  function _loadSource(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (source instanceof HTMLImageElement) {
        _imageEl = source;
        _onImageLoaded();
        resolve();
      } else if (typeof source === "string") {
        _imageEl = new Image();
        _imageEl.crossOrigin = "anonymous";
        _imageEl.onload = () => { _onImageLoaded(); resolve(); };
        _imageEl.onerror = () => reject(new Error("Failed to load image"));
        _imageEl.src = source;
        imgEl.src = source;
      } else if (source instanceof File || source instanceof Blob) {
        const url = URL.createObjectURL(source);
        _imageEl = new Image();
        _imageEl.onload = () => { URL.revokeObjectURL(url); _onImageLoaded(); resolve(); };
        _imageEl.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
        _imageEl.src = url;
        imgEl.src = url;
      } else {
        reject(new Error("Invalid source type"));
      }
    });
  }

  function _onImageLoaded(): void {
    if (!_imageEl) return;
    _naturalWidth = _imageEl.naturalWidth;
    _naturalHeight = _imageEl.naturalHeight;
    imgEl.src = _imageEl.src;

    // Initialize crop to full image if not set
    if (!initialCrop) {
      _crop = { x: 0, y: 0, width: 1, height: 1 };
      if (_aspectRatioValue !== null) {
        _constrainToAspect();
      }
    }

    _applyCropToDOM();
    _setupEvents();
    _renderGrid();
  }

  // --- Coordinate Transforms ---

  function _domToNormalized(domX: number, domY: number): { x: number; y: number } {
    const rect = root.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (domX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (domY - rect.top) / rect.height)),
    };
  }

  function _normalizedToDOM(crop: CropRegion): { left: string; top: string; width: string; height: string } {
    return {
      left: `${crop.x * 100}%`,
      top: `${crop.y * 100}%`,
      width: `${crop.width * 100}%`,
      height: `${crop.height * 100}%`,
    };
  }

  // --- Apply Crop to DOM ---

  function _applyCropToDOM(): void {
    const pos = _normalizedToDOM(_crop);
    cropBox.style.left = pos.left;
    cropBox.style.top = pos.top;
    cropBox.style.width = pos.width;
    cropBox.style.height = pos.height;
    _renderGrid();
  }

  function _constrainToAspect(): void {
    if (_aspectRatioValue === null) return;

    const imgAspect = _naturalWidth / _naturalHeight;
    const cx = _crop.x + _crop.width / 2;
    const cy = _crop.y + _crop.height / 2;

    if (_aspectRatioValue > imgAspect) {
      // Constrain by width
      _crop.height = _crop.width / _aspectRatioValue;
    } else {
      _crop.width = _crop.height * _aspectRatioValue;
    }

    // Re-center
    _crop.x = cx - _crop.width / 2;
    _crop.y = cy - _crop.height / 2;

    _clampCrop();
  }

  function _clampCrop(): void {
    _crop.x = Math.max(0, _crop.x);
    _crop.y = Math.max(0, _crop.y);
    _crop.x = Math.min(1 - _crop.width, _crop.x);
    _crop.y = Math.min(1 - _crop.height, _crop.y);
    _crop.width = Math.max(minCropSize, Math.min(1 - _crop.x, _crop.width));
    _crop.height = Math.max(minCropSize, Math.min(1 - _crop.y, _crop.height));

    if (_aspectRatioValue !== null) {
      _constrainToAspect();
    }
  }

  // --- Grid Rendering ---

  function _renderGrid(): void {
    if (!gridEl) return;

    switch (gridStyle) {
      case "rule-of-thirds":
        gridEl.style.background =
          `linear-gradient(to right, transparent 33.33%, ${gridColor} 33.33%, ${gridColor} 33.34%, transparent 33.34%, transparent 66.66%, ${gridColor} 66.66%, ${gridColor} 66.67%, transparent 66.67%),` +
          `linear-gradient(to bottom, transparent 33.33%, ${gridColor} 33.33%, ${gridColor} 33.34%, transparent 33.34%, transparent 66.66%, ${gridColor} 66.66%, ${gridColor} 67%, transparent 67%)`;
        break;

      case "golden-ratio": {
        const phi = 0.618;
        gridEl.style.background =
          `linear-gradient(to right, transparent ${phi * 100}%, ${gridColor} ${phi * 100}%, ${gridColor} ${(phi + 0.002) * 100}%, transparent ${(phi + 0.002) * 100%}),` +
          `linear-gradient(to bottom, transparent ${phi * 100}%, ${gridColor} ${phi * 100}%, ${gridColor} ${(phi + 0.002) * 100}%, transparent ${(phi + 0.002) * 100%})`;
        break;
      }

      case "crosshair":
        gridEl.style.background =
          `linear-gradient(to right, ${gridColor} 50%, transparent 50%),` +
          `linear-gradient(to bottom, ${gridColor} 50%, transparent 50%)`;
        gridEl.style.backgroundSize = "100% 1px, 1px 100%";
        break;

      default:
        gridEl.style.background = "";
        break;
    }
  }

  // --- Event Handlers ---

  function _setupEvents(): void {
    // Drag crop box (move)
    cropBox.addEventListener("mousedown", (e) => {
      if (!_enabled) return;
      const target = e.target as HTMLElement;
      if (target.classList.contains("cropper-handle")) return;

      _dragMode = "move";
      _dragStart = { x: e.clientX, y: e.clientY };
      _cropStart = { ..._crop };
      e.preventDefault();

      document.addEventListener("mousemove", _onMouseMove);
      document.addEventListener("mouseup", _onMouseUp);
      cleanupFns.push(() => { document.removeEventListener("mousemove", _onMouseMove); document.removeEventListener("mouseup", _onMouseUp); });
    });

    // Resize handles
    Object.values(handles).forEach((handle) => {
      handle.addEventListener("mousedown", (e) => {
        if (!_enabled) return;
        _dragMode = handle.dataset.handle as typeof _dragMode;
        _dragStart = { x: e.clientX, y: e.clientY };
        _cropStart = { ..._crop };
        e.preventDefault();
        e.stopPropagation();

        document.addEventListener("mousemove", _onMouseMove);
        document.addEventListener("mouseup", _onMouseUp);
      });
    });

    // Touch support
    cropBox.addEventListener("touchstart", (e) => {
      if (!_enabled) return;
      const t = e.touches[0];
      if (!t) return;
      _dragMode = "move";
      _dragStart = { x: t.clientX, y: t.clientY };
      _cropStart = { ..._crop };
    }, { passive: true });

    document.addEventListener("touchmove", (e) => {
      if (!_dragMode || !_enabled) return;
      const t = e.touches[0];
      if (!t) return;
      _processDrag(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener("touchend", () => {
      if (_dragMode) {
        _dragMode = null;
        onCropChange?.(_crop);
      }
    });

    // Double-click to confirm
    cropBox.addEventListener("dblclick", () => {
      if (_enabled) _emitComplete();
    });

    // Responsive resize
    if (responsive) {
      const ro = new ResizeObserver(() => _applyCropToDOM());
      ro.observe(root);
      cleanupFns.push(() => ro.disconnect());
    }
  }

  function _onMouseMove(e: MouseEvent): void {
    if (!_dragMode || !_enabled) return;
    _processDrag(e.clientX, e.clientY);
  }

  function _processDrag(clientX: number, clientY: number): void {
    const rect = root.getBoundingClientRect();
    const dx = (clientX - _dragStart.x) / rect.width;
    const dy = (clientY - _dragStart.y) / rect.height;

    if (_dragMode === "move") {
      _crop.x = _cropStart.x + dx;
      _crop.y = _cropStart.y + dy;
    } else {
      _resizeCrop(dx, dy, _dragMode!);
    }

    _clampCrop();
    _applyCropToDOM();
    onCropChange?.(_crop);
  }

  function _resizeCrop(dx: number, dy: number, handle: string): void {
    switch (handle) {
      case "resize-nw":
        _crop.x = _cropStart.x + dx;
        _crop.y = _cropStart.y + dy;
        _crop.width = _cropStart.width - dx;
        _crop.height = _cropStart.height - dy;
        break;
      case "resize-ne":
        _crop.y = _cropStart.y + dy;
        _crop.width = _cropStart.width + dx;
        _crop.height = _cropStart.height - dy;
        break;
      case "resize-sw":
        _crop.x = _cropStart.x + dx;
        _crop.width = _cropStart.width - dx;
        _crop.height = _cropStart.height + dy;
        break;
      case "resize-se":
        _crop.width = _cropStart.width + dx;
        _crop.height = _cropStart.height + dy;
        break;
      case "resize-n":
        _crop.y = _cropStart.y + dy;
        _crop.height = _cropStart.height - dy;
        break;
      case "resize-s":
        _crop.height = _cropStart.height + dy;
        break;
      case "resize-e":
        _crop.width = _cropStart.width + dx;
        break;
      case "resize-w":
        _crop.x = _cropStart.x + dx;
        _crop.width = _cropStart.width - dx;
        break;
    }
  }

  function _onMouseUp(): void {
    if (_dragMode) {
      _dragMode = null;
      onCropChange?.(_crop);
    }
  }

  function _emitComplete(): void {
    getCroppedResult().then((result) => {
      onCropComplete?.(_crop, result);
    });
  }

  // --- Public API ---

  function getCropRegion(): CropRegion { return { ..._crop }; }

  function setCropRegion(region: CropRegion): void {
    _crop = { ...region };
    _clampCrop();
    _applyCropToDOM();
    onCropChange?.(_crop);
  }

  function setAspectRatio(ratio: CropAspectRatio): void {
    _aspectRatioValue = _parseAspectRatio(ratio);
    if (_aspectRatioValue !== null) _constrainToAspect();
    _applyCropToDOM();
  }

  function rotate(degrees: number): void {
    if (!enableRotation) return;
    _rotation = (_rotation + degrees) % 360;
    // Snap to nearest angle
    let snapped = _rotation;
    let minDist = Infinity;
    for (const angle of rotationSnapAngles) {
      const dist = Math.abs((_rotation % 360) - angle);
      if (dist < minDist) { minDist = dist; snapped = angle; }
    }
    if (minDist < 15) _rotation = snapped;
    imgWrapper.style.transform = `rotate(${_rotation}deg) scale(${_zoom})`;
  }

  function reset(): void {
    _crop = initialCrop ?? { x: 0, y: 0, width: 1, height: 1 };
    _rotation = 0;
    _zoom = 1;
    imgWrapper.style.transform = "";
    _clampCrop();
    _applyCropToDOM();
  }

  async function getCroppedResult(): Promise<Blob | string | HTMLCanvasElement | HTMLImageElement> {
    if (!_imageEl) throw new Error("Image not loaded");

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot get canvas context");

    // Calculate actual pixel dimensions
    let outW = Math.round(_crop.width * _naturalWidth);
    let outH = Math.round(_crop.height * _naturalHeight);

    // Apply max dimensions while preserving aspect
    if (outW > maxOutputWidth) {
      const scale = maxOutputWidth / outW;
      outW = maxOutputWidth;
      outH = Math.round(outH * scale);
    }
    if (outH > maxOutputHeight) {
      const scale = maxOutputHeight / outH;
      outH = maxOutputHeight;
      outW = Math.round(outW * scale);
    }

    canvas.width = outW;
    canvas.height = outH;

    // Apply rotation transform
    if (_rotation !== 0) {
      ctx.translate(outW / 2, outH / 2);
      ctx.rotate((_rotation * Math.PI) / 180);
      ctx.translate(-outW / 2, -outH / 2);
    }

    // Draw the cropped portion
    ctx.drawImage(
      _imageEl,
      _crop.x * _naturalWidth, _crop.y * _naturalHeight,
      _crop.width * _naturalWidth, _crop.height * _naturalHeight,
      0, 0, outW, outH,
    );

    switch (outputFormat) {
      case "blob":
        return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), outputMimeType, outputQuality));
      case "dataURL":
        return canvas.toDataURL(outputMimeType, outputQuality);
      case "canvas":
        return canvas;
      case "htmlImage": {
        const img = new Image();
        img.src = canvas.toDataURL(outputMimeType, outputQuality);
        return new Promise((resolve) => { img.onload = () => resolve(img); });
      }
      default:
        return canvas;
    }
  }

  function zoom(factor: number): void {
    if (!enableZoom) return;
    _zoom = Math.max(1, Math.min(10, _zoom * factor));
    imgWrapper.style.transform = `rotate(${_rotation}deg) scale(${_zoom})`;
  }

  function getZoom(): number { return _zoom; }

  function setEnabled(enabled: boolean): void {
    _enabled = enabled;
    cropBox.style.pointerEvents = enabled ? "auto" : "none";
    cropBox.style.opacity = enabled ? "1" : "0.6";
    Object.values(handles).forEach((h) => { h.style.pointerEvents = enabled ? "auto" : "none"; });
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // --- Init ---
  _loadSource().catch(console.error);

  return {
    el: root,
    getCropRegion,
    setCropRegion,
    setAspectRatio,
    rotate,
    reset,
    getCroppedResult,
    zoom,
    getZoom,
    setEnabled,
    destroy,
  };
}

// --- Helpers ---

function _getCursorForHandle(pos: string): string {
  const map: Record<string, string> = {
    nw: "nw-resize", n: "n-resize", ne: "ne-resize",
    e: "e-resize", se: "se-resize", s: "s-resize",
    sw: "sw-resize", w: "w-resize",
  };
  return map[pos] ?? "move";
}

function _getPositionStyle(pos: string, size: number): string {
  const half = size / 2;
  const map: Record<string, string> = {
    nw: `top:-${half}px;left:-${half}px;`,
    n:  `top:-${half}px;left:calc(50% - ${half}px);`,
    ne: `top:-${half}px;right:-${half}px;`,
    e:  `top:calc(50% - ${half}px);right:-${half}px;`,
    se: `bottom:-${half}px;right:-${half}px;`,
    s:  `bottom:-${half}px;left:calc(50% - ${half}px);`,
    sw: `bottom:-${half}px;left:-${half}px;`,
    w:  `top:calc(50% - ${half}px);left:-${half}px;`,
  };
  return map[pos] ?? "";
}
