/**
 * Avatar Crop Utilities: Circular avatar cropping tool with zoom, pan,
 * aspect ratio lock (1:1), preview, and output as data URL / Blob.
 */

// --- Types ---

export interface AvatarCropOptions {
  /** Source image (URL string, File, or HTMLImageElement) */
  image: string | File | HTMLImageElement;
  /** Output size in px */
  size?: number;
  /** Border radius fraction (0-0.5, default 0.5 for circle) */
  borderRadius?: number;
  /** Show zoom slider? */
  showZoom?: boolean;
  /** Show pan instructions? */
  showInstructions?: boolean;
  /** Initial zoom level (1-3) */
  initialZoom?: number;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
  /** Called when crop changes */
  onChange?: (dataUrl: string) => void;
}

export interface AvatarCropInstance {
  /** Root element */
  el: HTMLElement;
  /** Get cropped avatar as data URL */
  getCroppedDataURL: (type?: string, quality?: number) => string;
  /** Get cropped avatar as Blob */
  getCroppedBlob: (type?: string, quality?: number) => Promise<Blob>;
  /** Set zoom level (1-3) */
  setZoom: (zoom: number) => void;
  /** Get current zoom level */
  getZoom: () => number;
  /** Reset to defaults */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a circular avatar cropper.
 *
 * @example
 * ```ts
 * const cropper = createAvatarCrop({
 *   image: "profile-photo.jpg",
 *   size: 200,
 * });
 * // Later:
 * const avatarUrl = cropper.getCroppedDataURL();
 * ```
 */
export function createAvatarCrop(options: AvatarCropOptions): AvatarCropInstance {
  const {
    image,
    size = 200,
    borderRadius = 0.5,
    showZoom = true,
    showInstructions = true,
    initialZoom = 1,
    container,
    className,
    onChange,
  } = options;

  let _zoom = Math.max(1, Math.min(3, initialZoom));
  let _panX = 50; // percent position of image center
  let _panY = 50;
  let _isDragging = false;
  let _dragStart = { x: 0, y: 0 };
  let _imgEl: HTMLImageElement | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `avatar-crop ${className ?? ""}`.trim();
  root.style.cssText =
    "display:inline-flex;flex-direction:column;align-items:center;gap:12px;" +
    "font-family:-apple-system,sans-serif;";

  // Canvas viewport
  const viewport = document.createElement("div");
  viewport.className = "avatar-crop-viewport";
  viewport.style.cssText =
    `width:${size}px;height:${size}px;border-radius:${borderRadius * 100}%;` +
    "overflow:hidden;position:relative;background:#e5e7eb;" +
    "cursor:grab;box-shadow:inset 0 0 0 9999px rgba(0,0,0,0.15);";

  // Image element
  const imgEl = document.createElement("img");
  imgEl.className = "avatar-crop-image";
  imgEl.style.cssText =
    "position:absolute;pointer-events:none;display:none;will-change:transform;";
  imgEl.draggable = false;
  viewport.appendChild(imgEl);

  // Circular mask overlay
  const maskOverlay = document.createElement("div");
  maskOverlay.style.cssText =
    `position:absolute;inset:0;border-radius:${borderRadius * 100}%;` +
    "box-shadow:inset 0 0 0 9999px rgba(0,0,0,0.4);pointer-events:none;z-index:2;";
  viewport.appendChild(maskOverlay);

  root.appendChild(viewport);

  // Instructions
  if (showInstructions) {
    const instr = document.createElement("p");
    instr.textContent = "Drag to position, use slider to zoom";
    instr.style.cssText = "font-size:12px;color:#9ca3af;text-align:center;margin:0;";
    root.appendChild(instr);
  }

  // Zoom slider
  let zoomSlider: HTMLInputElement | null = null;
  if (showZoom) {
    const sliderRow = document.createElement("div");
    sliderRow.style.display = "flex";
    sliderRow.style.alignItems = "center";
    sliderRow.style.gap = "10px";

    const zoomLabel = document.createElement("span");
    zoomLabel.textContent = "Zoom";
    zoomLabel.style.cssText = "font-size:13px;font-weight:500;color:#374151;width:40px;";

    zoomSlider = document.createElement("input");
    zoomSlider.type = "range";
    zoomSlider.min = "1";
    zoomSlider.max = "3";
    zoomSlider.step = "0.05";
    zoomSlider.value = String(_zoom);
    zoomSlider.style.cssText =
      "flex:1;height:6px;-webkit-appearance:none;appearance:none;" +
      "background:#e5e7eb;border-radius:3px;outline:none;cursor:pointer;" +
      "&::-webkit-slider-thumb{appearance:none;width:16px;height:16px;border-radius:50%;" +
      "background:#3b82f6;border:2px solid #fff;cursor:pointer;}";

    zoomSlider.addEventListener("input", () => {
      setZoom(parseFloat(zoomSlider!.value));
    });

    sliderRow.appendChild(zoomLabel);
    sliderRow.appendChild(zoomSlider);
    root.appendChild(sliderRow);
  }

  // Action buttons
  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.gap = "8px";

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.textContent = "Reset";
  resetBtn.style.cssText =
    "padding:7px 18px;border:1px solid #d1d5db;border-radius:8px;background:#fff;" +
    "cursor:pointer;font-size:13px;font-weight:500;color:#374151;";
  resetBtn.addEventListener("click", () => reset());
  btnRow.appendChild(resetBtn);

  root.appendChild(btnRow);

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
        imgEl.src = img.src;
        imgEl.style.display = "";
        finishLoad();
        resolve();
      };

      img.onerror = () => reject(new Error("Failed to load image"));

      if (typeof image === "string") img.src = image;
      else img.src = URL.createObjectURL(image);
    });
  }

  function finishLoad(): void {
    if (!_imgEl) return;
    updateImageTransform();
  }

  function updateImageTransform(): void {
    if (!_imgEl) return;
    const s = _zoom;
    imgEl.style.transform = `translate(-50%, -50%) translate(${_panX - 50}%, ${_panY - 50}%) scale(${s})`;
    imgEl.style.left = "50%";
    imgEl.style.top = "50%";
    onChange?.(getCroppedDataURL());
  }

  // --- Pan handling ---

  function getEventPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = viewport.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  }

  viewport.addEventListener("mousedown", (e) => {
    e.preventDefault();
    _isDragging = true;
    _dragStart = getEventPos(e);
    viewport.style.cursor = "grabbing";
  });

  viewport.addEventListener("touchstart", (e) => {
    e.preventDefault();
    _isDragging = true;
    _dragStart = getEventPos(e as unknown as TouchEvent);
  }, { passive: false });

  const onMove = (e: MouseEvent | TouchEvent): void => {
    if (!_isDragging || !_imgEl) return;
    e.preventDefault();
    const pos = getEventPos(e);
    const dx = pos.x - _dragStart.x;
    const dy = pos.y - _dragStart.y;
    const sens = 100 / (_zoom * size);
    _panX += dx * sens;
    _panY += dy * sens;
    _panX = Math.max(0, Math.min(100, _panX));
    _panY = Math.max(0, Math.min(100, _panY));
    _dragStart = pos;
    updateImageTransform();
  };

  const onEnd = (): void => {
    _isDragging = false;
    viewport.style.cursor = "grab";
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onEnd);
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd);

  // --- Methods ---

  function getCroppedDataURL(type = "image/png", quality = 1): string {
    if (!_imgEl) return "";
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const drawW = size * _zoom;
    const drawH = size * _zoom;
    const sx = (drawW / 2) - ((_panX / 100) * drawW);
    const sy = (drawH / 2) - ((_panY / 100) * drawH);
    ctx.drawImage(_imgEl, sx, sy, drawW, drawH, 0, 0, size, size);
    ctx.restore();
    return canvas.toDataURL(type, quality);
  }

  async function getCroppedBlob(type = "image/png", quality = 1): Promise<Blob> {
    if (!_imgEl) throw new Error("No image loaded");
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    const drawW = size * _zoom;
    const drawH = size * _zoom;
    const sx = (drawW / 2) - ((_panX / 100) * drawW);
    const sy = (drawH / 2) - ((_panY / 100) * drawH);
    ctx.drawImage(_imgEl, sx, sy, drawW, drawH, 0, 0, size, size);
    ctx.restore();
    return new Promise((res, rej) => {
      canvas.toBlob((b) => b ? res(b) : rej(new Error("Failed")), type, quality);
    });
  }

  function setZoom(zoom: number): void {
    _zoom = Math.max(1, Math.min(3, zoom));
    if (zoomSlider) zoomSlider.value = String(_zoom);
    updateImageTransform();
  }

  function getZoom(): number { return _zoom; }

  function reset(): void {
    _zoom = 1; _panX = 50; _panY = 50;
    if (zoomSlider) zoomSlider.value = "1";
    updateImageTransform();
  }

  function destroy(): void { root.remove(); }

  loadImage();

  return { el: root, getCroppedDataURL, getCroppedBlob, setZoom, getZoom, reset, destroy };
}
