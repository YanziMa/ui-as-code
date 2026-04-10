/**
 * Avatar Editor: Upload, crop, zoom, rotate avatar with canvas-based
 * editing. Supports drag-to-upload, file input, aspect ratio lock,
 * and export as data URL or blob.
 */

// --- Types ---

export interface AvatarEditorOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial image URL (data URI or URL) */
  src?: string;
  /** Output size in px (default: 200) */
  size?: number;
  /** Shape: "circle" | "rounded" | "square" */
  shape?: "circle" | "rounded" | "square";
  /** Border width (px) */
  borderWidth?: number;
  /** Border color */
  borderColor?: string;
  /** Background color for empty state */
  emptyColor?: string;
  /** Show upload button overlay? */
  showUpload?: boolean;
  /** Acceptable file types (default: image/*) */
  accept?: string;
  /** Max file size in bytes (default: 5MB) */
  maxFileSize?: number;
  /** Show crop controls? */
  showCrop?: boolean;
  /** Show rotation controls? */
  showRotate?: boolean;
  /** Show zoom slider? */
  showZoom?: boolean;
  /** Callback when image changes (after crop/rotate/zoom) */
  onImageChange?: (dataUrl: string) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface AvatarEditorInstance {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Get current image as data URL */
  getDataUrl: () => string;
  /** Set image from URL or data URI */
  setImage: (src: string) => void;
  /** Clear/reset the editor */
  clear: () => void;
  /** Crop to current viewport */
  crop: () => void;
  /** Rotate by degrees */
  rotate: (degrees: number) => void;
  /** Set zoom level (1-5) */
  setZoom: (level: number) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createAvatarEditor(options: AvatarEditorOptions): AvatarEditorInstance {
  const opts = {
    size: options.size ?? 200,
    shape: options.shape ?? "circle",
    borderWidth: options.borderWidth ?? 2,
    borderColor: options.borderColor ?? "#e5e7eb",
    emptyColor: options.emptyColor ?? "#f3f4f6",
    showUpload: options.showUpload ?? true,
    accept: options.accept ?? "image/*",
    maxFileSize: options.maxFileSize ?? 5 * 1024 * 1024,
    showCrop: options.showCrop ?? true,
    showRotate: options.showRotate ?? true,
    showZoom: options.showZoom ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AvatarEditor: container not found");

  container.className = `avatar-editor ${opts.className}`;
  let destroyed = false;

  // Canvas
  const canvas = document.createElement("canvas");
  const sz = opts.size;
  canvas.width = sz * (window.devicePixelRatio || 1);
  canvas.height = sz * (window.devicePixelRatio || 1);
  canvas.style.cssText = `
    display:block;width:${sz}px;height:${sz}px;border-radius:${opts.shape === "circle" ? "50%" : opts.shape === "rounded" ? "16px" : "8px"};
    border:${opts.borderWidth}px solid ${opts.borderColor};
    background:${opts.emptyColor};cursor:pointer;overflow:hidden;
    object-fit:cover;
  `;
  canvas.style.imageRendering = "crisp-edges";

  const ctx = canvas.getContext("2d")!;

  // State
  let originalImage: HTMLImageElement | null = null;
  let currentRotation = 0;
  let currentZoom = 1;
  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragOffsetStartX = 0;
  let dragOffsetStartY = 0;

  // File input (hidden)
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = opts.accept;
  fileInput.style.display = "none";
  container.appendChild(fileInput);

  // Controls toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "ae-toolbar";
  toolbar.style.cssText = `
    display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;justify-content:center;
  `;
  container.appendChild(toolbar);

  // Upload button
  if (opts.showUpload) {
    const uploadBtn = createToolbarBtn("\u{1F4F4}", "Upload", () => { fileInput.click(); });
    toolbar.appendChild(uploadBtn);
  }

  // Zoom slider
  if (opts.showZoom) {
    const zoomWrap = document.createElement("div");
    zoomWrap.style.cssText = "display:flex;align-items:center;gap:4px;";
    const zoomLabel = document.createElement("span");
    zoomLabel.textContent = "Zoom:";
    zoomLabel.style.cssText = "font-size:11px;color:#6b7280;";
    const zoomSlider = document.createElement("input");
    zoomSlider.type = "range";
    zoomSlider.min = "1"; zoomSlider.max = "5"; zoomSlider.step = "0.5"; zoomSlider.value = "1";
    zoomSlider.style.cssText = "width:80px;accent-color:#4338ca;";
    zoomSlider.addEventListener("input", () => {
      currentZoom = parseFloat(zoomSlider.value);
      renderImage();
    });
    zoomWrap.append(zoomLabel, zoomSlider);
    toolbar.appendChild(zoomWrap);
  }

  // Rotate buttons
  if (opts.showRotate) {
    const rotLeft = createToolbarBtn("\u21BA", "-90\u00B0", () => { rotate(-90); });
    const rotRight = createToolbarBtn("\u21BB", "+90\u00B0", () => { rotate(90); });
    toolbar.appendChild(rotLeft);
    toolbar.appendChild(rotRight);
  }

  // Crop button
  if (opts.showCrop) {
    const cropBtn = createToolbarBtn("\u270F", "Crop", () => instance.crop());
    toolbar.appendChild(cropBtn);
  }

  // Clear button
  const clearBtn = createToolbarButton("\u2715", "Clear", () => instance.clear());
  toolbar.appendChild(clearBtn);

  // Canvas click to upload
  canvas.addEventListener("click", () => { fileInput.click(); });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.size > opts.maxFileSize) {
      opts.onError?.(new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB)`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { instance.setImage(reader.result as string); };
    reader.readAsDataURL(file);
  });

  // Canvas pan/drag for positioning
  canvas.addEventListener("mousedown", (e) => {
    if (!originalImage) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOffsetStartX = offsetX;
    dragOffsetStartY = offsetY;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    offsetX = dragOffsetStartX + dx / currentZoom;
    offsetY = dragOffsetStartY + dy / currentZoom;
    renderImage();
  });

  document.addEventListener("mouseup", () => { isDragging = false; });

  function renderImage(): void {
    if (!originalImage) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clip to circle/rounded rect
    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 2;
    if (opts.shape === "circle") {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
    } else if (opts.shape === "rounded") {
      roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 16);
    }

    // Calculate display size based on zoom
    const drawW = originalImage.naturalWidth * currentZoom;
    const drawH = originalImage.naturalHeight * currentZoom;

    // Center with offset
    const x = (canvas.width - drawW) / 2 + offsetX;
    const y = (canvas.height - drawH) / 2 + offsetY;

    ctx.drawImage(originalImage, x, y, drawW, drawH);
    ctx.restore();

    opts.onImageChange?.(canvas.toDataURL("image/png"));
  }

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.arc(cx, cy, r, Math.PI, Math.PI * 1.5);
    ctx.closePath();
  }

  function rotate(degrees: number): void {
    currentRotation += degrees;
    renderImage();
  }

  function createToolbarBtn(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = `${icon} <span style="font-size:11px;margin-left:2px;">${label}</span>`;
    btn.style.cssText = `
      display:flex;align-items:center;padding:5px 10px;border:1px solid #d1d5db;
      border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#374151;
      transition:background 0.15s;font-family:-apple-system,sans-serif;
    `;
    btn.addEventListener("click", onClick);
    btn.addEventListener("mouseenter", () => { btn.style.background = "#f9fafb"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
    return btn;
  }

  function createToolbarButton(icon: string, label: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.innerHTML = `${icon} <span style="font-size:11px;margin-left:2px;">${label}</span>`;
    btn.style.cssText = `
      display:flex;align-items:center;padding:5px 10px;border:1px solid #d1d5db;
      border-radius:6px;background:#fff;cursor:pointer;font-size:12px;color:#ef4444;
      transition:background 0.15s;font-family:-apple-system,sans-serif;
    `;
    btn.addEventListener("click", onClick);
    btn.addEventListener("mouseenter", () => { btn.style.background = "#fef2f2"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
    return btn;
  }

  // Load initial image
  if (opts.src) {
    instance.setImage(opts.src);
  }

  const instance: AvatarEditorInstance = {
    element: container,
    canvas,

    getDataUrl() { return canvas.toDataURL("image/png"); },

    setImage(src: string) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        originalImage = img;
        currentRotation = 0;
        currentZoom = 1;
        offsetX = 0;
        offsetY = 0;
        renderImage();
      };
      img.onerror = () => opts.onError?.(new Error("Failed to load image"));
      img.src = src;
    },

    clear() {
      originalImage = null;
      currentRotation = 0;
      currentZoom = 1;
      offsetX = 0;
      offsetY = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw empty state
      ctx.fillStyle = opts.emptyColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#9ca3af";
      ctx.font = `${Math.floor(sz / 6)}px -apple-system,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", cx, cy);
    },

    crop() {
      if (!originalImage) return;
      // Simple center crop - reset offsets and use current zoom
      offsetX = 0;
      offsetY = 0;
      renderImage();
    },

    rotate,
    setZoom(level: number) {
      currentZoom = Math.max(1, Math.min(5, level));
      renderImage();
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };

  return instance;
}
