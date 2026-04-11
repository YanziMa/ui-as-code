/**
 * Cropper Utilities: Image cropping tool with aspect ratio presets, zoom/pan,
 * free-form and constrained crop regions, grid overlay (rule of thirds),
 * touch support, and output as canvas/blob/data URL.
 */

// --- Types ---

export type CropAspectRatio = "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "2:3" | "3:2";

export interface CropperOptions {
  /** Source image (URL string, File, or HTMLImageElement) */
  image: string | File | HTMLImageElement;
  /** Initial aspect ratio */
  aspectRatio?: CropAspectRatio;
  /** Output width in px */
  outputWidth?: number;
  /** Output height in px */
  outputHeight?: number;
  /** Show aspect ratio selector? */
  showAspectSelector?: boolean;
  /** Show grid overlay (rule of thirds)? */
  showGrid?: boolean;
  /** Grid color */
  gridColor?: string;
  /** Grid opacity (0-1) */
  gridOpacity?: number;
  /** Crop area border color */
  borderColor?: string;
  /** Handle size in px */
  handleSize?: number;
  /** Minimum crop area size in px */
  minCropSize?: number;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
  /** Called when crop area changes */
  onCropChange?: (rect: CropRect) => void;
}

export interface CropRect {
  x: number; y: number; width: number; height: number;
}

export interface CropperInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current crop rectangle (in image coordinates) */
  getCropRect: () => CropRect;
  /** Set crop rectangle programmatically */
  setCropRect: (rect: CropRect) => void;
  /** Set aspect ratio */
  setAspectRatio: (ratio: CropAspectRatio) => void;
  /** Get cropped image as data URL */
  getCroppedDataURL: (type?: string, quality?: number) => Promise<string>;
  /** Get cropped image as Blob */
  getCroppedBlob: (type?: string, quality?: number) => Promise<Blob>;
  /** Reset to full image */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Aspect Ratio Map ---

const ASPECT_RATIOS: Record<CropAspectRatio, number | null> = {
  "free": null,
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "2:3": 2 / 3,
  "3:2": 3 / 2,
};

// --- Core Factory ---

/**
 * Create an image cropper.
 *
 * @example
 * ```ts
 * const cropper = createCropper({
 *   image: "photo.jpg",
 *   aspectRatio: "1:1",
 *   showAspectSelector: true,
 * });
 * // Later:
 * const dataUrl = await cropper.getCroppedDataURL();
 * ```
 */
export function createCropper(options: CropperOptions): CropperInstance {
  const {
    image,
    aspectRatio = "free",
    outputWidth = 400,
    outputHeight = 400,
    showAspectSelector = true,
    showGrid = true,
    gridColor = "#ffffff",
    gridOpacity = 0.35,
    borderColor = "#fff",
    handleSize = 10,
    minCropSize = 40,
    container,
    className,
    onCropChange,
  } = options;

  let _aspectRatio = aspectRatio;
  let _cropRect: CropRect = { x: 0, y: 0, width: 100, height: 100 };
  let _imgEl: HTMLImageElement | null = null;
  let _isDragging = false;
  let _dragType: "" | "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" = "";
  let _dragStart: { x: number; y: number } = { x: 0, y: 0 };
  let _cropStart: CropRect = { ..._cropRect };

  // Root wrapper
  const root = document.createElement("div");
  root.className = `cropper ${className ?? ""}`.trim();
  root.style.cssText =
    "display:inline-flex;flex-direction:column;align-items:center;gap:8px;" +
    "font-family:-apple-system,sans-serif;";

  // Aspect ratio selector
  let aspectEl: HTMLElement | null = null;
  if (showAspectSelector) {
    aspectEl = document.createElement("div");
    aspectEl.className = "cropper-aspects";
    aspectEl.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;justify-content:center;";

    const ratios: CropAspectRatio[] = ["free", "1:1", "4:3", "3:4", "16:9"];
    for (const r of ratios) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = r === "free" ? "Free" : r;
      btn.dataset.ratio = r;
      btn.style.cssText =
        "padding:5px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;" +
        "cursor:pointer;font-size:12px;font-weight:500;color:#374151;transition:all 0.12s;" +
        (r === _aspectRatio ? "border-color:#3b82f6;color:#3b82f6;" : "");
      btn.addEventListener("click", () => {
        setAspectRatio(r);
        aspectEl!.querySelectorAll("button").forEach((b) => {
          const bb = b as HTMLElement;
          const isActive = bb.dataset.ratio === r;
          bb.style.borderColor = isActive ? "#3b82f6" : "#d1d5db";
          bb.style.color = isActive ? "#3b82f6" : "#374151";
        });
      });
      aspectEl.appendChild(btn);
    }
    root.appendChild(aspectEl);
  }

  // Canvas viewport
  const viewport = document.createElement("div");
  viewport.className = "cropper-viewport";
  viewport.style.cssText =
    `width:${outputWidth}px;height:${outputHeight}px;position:relative;overflow:hidden;` +
    "background:#000;border-radius:8px;cursor:crosshair;";
  root.appendChild(viewport);

  // Image element
  const imgContainer = document.createElement("div");
  imgContainer.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;";
  viewport.appendChild(imgContainer);

  const displayImg = document.createElement("img");
  displayImg.className = "cropper-image";
  displayImg.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;display:none;";
  imgContainer.appendChild(displayImg);

  // Crop overlay
  const overlay = document.createElement("div");
  overlay.className = "cropper-overlay";
  overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:1;";
  viewport.appendChild(overlay);

  // Crop box
  const cropBox = document.createElement("div");
  cropBox.className = "crop-box";
  cropBox.style.cssText =
    `position:absolute;border:2px solid ${borderColor};z-index:2;` +
    "box-shadow:0 0 0 9999px rgba(0,0,0,0.55);cursor:move;";
  viewport.appendChild(cropBox);

  // Grid lines inside crop box
  if (showGrid) {
    for (let i = 1; i <= 2; i++) {
      // Vertical
      const vLine = document.createElement("div");
      vLine.style.cssText =
        `position:absolute;left:${i * 33.33}%;top:0;bottom:0;width:1px;` +
        `background:${gridColor};opacity:${gridOpacity};`;
      cropBox.appendChild(vLine);
      // Horizontal
      const hLine = document.createElement("div");
      hLine.style.cssText =
        `position:absolute;top:${i * 33.33}%;left:0;right:0;height:1px;` +
        `background:${gridColor};opacity:${gridOpacity};`;
      cropBox.appendChild(hLine);
    }
  }

  // Handles
  const handles: Record<string, HTMLElement> = {};
  const positions: Array<[string, string]> = [
    ["nw", "top:0;left:0;cursor:nw-resize;"],
    ["n", "top:0;left:50%;transform:translateX(-50%);cursor:n-resize;"],
    ["ne", "top:0;right:0;cursor:ne-resize;"],
    ["e", "top:50%;right:0;transform:translateY(-50%);cursor:e-resize;"],
    ["se", "bottom:0;right:0;cursor:se-resize;"],
    ["s", "bottom:0;left:50%;transform:translateX(-50%);cursor:s-resize;"],
    ["sw", "bottom:0;left:0;cursor:sw-resize;"],
    ["w", "top:50%;left:0;transform:translateY(-50%);cursor:w-resize;"],
  ];

  for (const [pos, style] of positions) {
    const h = document.createElement("div");
    h.className = `crop-handle crop-handle-${pos}`;
    h.style.cssText =
      `position:absolute;width:${handleSize}px;height:${handleSize}px;` +
      `background:${borderColor};border-radius:2px;z-index:3;${style}` +
      "transition:background 0.1s;";
    h.addEventListener("mouseenter", () => { h.style.background = "#93c5fd"; });
    h.addEventListener("mouseleave", () => { h.style.background = borderColor; });
    cropBox.appendChild(h);
    handles[pos] = h;
  }

  (container ?? document.body).appendChild(root);

  // --- Load Image ---

  function loadImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (image instanceof HTMLImageElement) {
        _imgEl = image;
        finishLoad();
        resolve();
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        _imgEl = img;
        displayImg.src = img.src;
        displayImg.style.display = "";
        finishLoad();
        resolve();
      };

      img.onerror = () => reject(new Error("Failed to load image"));

      if (typeof image === "string") {
        img.src = image;
      } else {
        img.src = URL.createObjectURL(image);
      }
    });
  }

  function finishLoad(): void {
    if (!_imgEl) return;

    // Initialize crop rect to cover the visible portion of the image
    const vpW = outputWidth;
    const vpH = outputHeight;
    const imgR = _imgEl.width / _imgEl.height;
    const vpR = vpW / vpH;

    if (imgR > vpR) {
      // Image is wider — fit by width
      const scale = vpW / _imgEl.width;
      const drawH = _imgEl.height * scale;
      const offsetY = (vpH - drawH) / 2;
      _cropRect = { x: 0, y: offsetY / vpH * 100, width: 100, height: drawH / vpH * 100 };
    } else {
      // Image is taller — fit by height
      const scale = vpH / _imgEl.height;
      const drawW = _imgEl.width * scale;
      const offsetX = (vpW - drawW) / 2;
      _cropRect = { x: offsetX / vpW * 100, y: 0, width: drawW / vpW * 100, height: 100 };
    }

    updateCropBoxVisuals();
  }

  // --- Positioning ---

  function updateCropBoxVisuals(): void {
    cropBox.style.left = `${_cropRect.x}%`;
    cropBox.style.top = `${_cropRect.y}%`;
    cropBox.style.width = `${_cropRect.width}%`;
    cropBox.style.height = `${_cropRect.height}%`;

    // Update darkened overlay areas using clip-path approach
    // The box-shadow: 0 0 0 9999px rgba(0,0,0,0.55) already creates the darkened effect
    // outside the crop box

    onCropChange?.(getImageCoords(_cropRect));
  }

  function getImageCoords(rect: CropRect): CropRect {
    if (!_imgEl) return rect;
    const vpW = outputWidth;
    const vpH = outputHeight;

    // Calculate actual displayed image dimensions
    const imgR = _imgEl.width / _imgEl.height;
    const vpR = vpW / vpH;
    let drawW: number, drawH: number, offX: number, offY: number;

    if (imgR > vpR) {
      drawW = vpW;
      drawH = vpW / imgR;
      offX = 0;
      offY = (vpH - drawH) / 2;
    } else {
      drawH = vpH;
      drawW = vpH * imgR;
      offX = (vpW - drawW) / 2;
      offY = 0;
    }

    return {
      x: (rect.x / 100) * drawW + offX,
      y: (rect.y / 100) * drawH + offY,
      width: (rect.width / 100) * drawW,
      height: (rect.height / 100) * drawH,
    };
  }

  // --- Drag Handling ---

  function getEventPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = viewport.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: ((cx - rect.left) / rect.width) * 100, y: ((cy - rect.top) / rect.height) * 100 };
  }

  function startDrag(e: MouseEvent | TouchEvent, type: string): void {
    e.preventDefault();
    e.stopPropagation();
    _isDragging = true;
    _dragType = type;
    _dragStart = getEventPos(e);
    _cropStart = { ..._cropRect };

    const onMove = (me: MouseEvent | TouchEvent): void => {
      if (!_isDragging) return;
      me.preventDefault();
      const pos = getEventPos(me);
      const dx = pos.x - _dragStart.x;
      const dy = pos.y - _dragStart.y;

      let nr = { ..._cropStart };

      switch (_dragType) {
        case "move":
          nr.x = Math.max(0, Math.min(100 - _cropStart.width, _cropStart.x + dx));
          nr.y = Math.max(0, Math.min(100 - _cropStart.height, _cropStart.y + dy));
          break;
        case "nw":
          nr.x = Math.max(0, _cropStart.x + dx); nr.y = Math.max(0, _cropStart.y + dy);
          nr.width = _cropStart.x + _cropStart.width - nr.x; nr.height = _cropStart.y + _cropStart.height - nr.y;
          break;
        case "ne":
          nr.y = Math.max(0, _cropStart.y + dy);
          nr.width = _cropStart.width + dx; nr.height = _cropStart.y + _cropStart.height - nr.y;
          break;
        case "sw":
          nr.x = Math.max(0, _cropStart.x + dx);
          nr.width = _cropStart.x + _cropStart.width - nr.x; nr.height = _cropStart.height + dy;
          break;
        case "se":
          nr.width = _cropStart.width + dx; nr.height = _cropStart.height + dy;
          break;
        case "n":
          nr.y = Math.max(0, _cropStart.y + dy); nr.height = _cropStart.y + _cropStart.height - nr.y;
          break;
        case "s":
          nr.height = _cropStart.height + dy;
          break;
        case "e":
          nr.width = _cropStart.width + dx;
          break;
        case "w":
          nr.x = Math.max(0, _cropStart.x + dx); nr.width = _cropStart.x + _cropStart.width - nr.x;
          break;
      }

      // Enforce minimum size
      const minPct = (minCropSize / outputWidth) * 100;
      if (nr.width < minPct) nr.width = minPct;
      if (nr.height < minPct) nr.height = minPct;

      // Enforce bounds
      if (nr.x < 0) { nr.x = 0; }
      if (nr.y < 0) { nr.y = 0; }
      if (nr.x + nr.width > 100) { nr.width = 100 - nr.x; }
      if (nr.y + nr.height > 100) { nr.height = 100 - nr.y; }

      // Enforce aspect ratio
      const ratio = ASPECT_RATIOS[_aspectRatio];
      if (ratio !== null) {
        const centeredW = nr.width;
        const centeredH = nr.width / ratio;
        if (centeredH <= 100 && nr.y + centeredH <= 100) {
          nr.height = centeredH;
        } else {
          nr.height = Math.min(100 - nr.y, 100);
          nr.width = nr.height * ratio;
        }
      }

      _cropRect = nr;
      updateCropBoxVisuals();
    };

    const onEnd = (): void => {
      _isDragging = false;
      _dragType = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);
    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
  }

  // Attach drag handlers
  cropBox.addEventListener("mousedown", (e) => startDrag(e, "move"));
  cropBox.addEventListener("touchstart", (e) => startDrag(e as unknown as TouchEvent, "move"), { passive: false });

  for (const [pos, handle] of Object.entries(handles)) {
    handle.addEventListener("mousedown", (e) => startDrag(e, pos));
    handle.addEventListener("touchstart", (e) => startDrag(e as unknown as TouchEvent, pos), { passive: false });
  }

  // --- Methods ---

  function getCropRect(): CropRect { return getImageCoords(_cropRect); }

  function setCropRect(rect: CropRect): void {
    // Convert from image coords back to percentage coords
    if (!_imgEl) { _cropRect = rect; updateCropBoxVisuals(); return; }
    const vpW = outputWidth;
    const vpH = outputHeight;
    const imgR = _imgEl.width / _imgEl.height;
    const vpR = vpW / vpH;
    let drawW: number, drawH: number, offX: number, offY: number;

    if (imgR > vpR) {
      drawW = vpW; drawH = vpW / imgR; offX = 0; offY = (vpH - drawH) / 2;
    } else {
      drawH = vpH; drawW = vpH * imgR; offX = (vpW - drawW) / 2; offY = 0;
    }

    _cropRect = {
      x: ((rect.x - offX) / drawW) * 100,
      y: ((rect.y - offY) / drawH) * 100,
      width: (rect.width / drawW) * 100,
      height: (rect.height / drawH) * 100,
    };
    updateCropBoxVisuals();
  }

  function setAspectRatio(ratio: CropAspectRatio): void {
    _aspectRatio = ratio;
    // Recalculate to maintain aspect ratio
    const r = ASPECT_RATIOS[ratio];
    if (r !== null) {
      const newH = _cropRect.width / r;
      if (_cropRect.y + newH <= 100) {
        _cropRect.height = newH;
      } else {
        _cropRect.height = 100 - _cropRect.y;
        _cropRect.width = _cropRect.height * r;
      }
      updateCropBoxVisuals();
    }
  }

  async function getCroppedDataURL(type = "image/png", quality = 1): Promise<string> {
    if (!_imgEl) throw new Error("No image loaded");

    const coords = getImageCoords(_cropRect);
    const canvas = document.createElement("canvas");
    canvas.width = coords.width;
    canvas.height = coords.height;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(
      _imgEl,
      coords.x, coords.y, coords.width, coords.height,
      0, 0, coords.width, coords.height,
    );

    return canvas.toDataURL(type, quality);
  }

  async function getCroppedBlob(type = "image/png", quality = 1): Promise<Blob> {
    if (!_imgEl) throw new Error("No image loaded");

    const coords = getImageCoords(_cropRect);
    const canvas = document.createElement("canvas");
    canvas.width = coords.width;
    canvas.height = coords.height;
    const ctx = canvas.getContext("2d")!;

    ctx.drawImage(
      _imgEl,
      coords.x, coords.y, coords.width, coords.height,
      0, 0, coords.width, coords.height,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Failed to create blob")), type, quality);
    });
  }

  function reset(): void {
    if (_imgEl) finishLoad();
  }

  function destroy(): void { root.remove(); }

  // Init
  loadImage();

  return {
    el: root,
    getCropRect, setCropRect, setAspectRatio,
    getCroppedDataURL, getCroppedBlob, reset, destroy,
  };
}
