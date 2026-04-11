/**
 * Lightbox Utilities: Image viewer/lightbox with zoom, pan, navigation,
 * keyboard controls, caption display, thumbnail strip, fullscreen mode,
 * and lazy loading support.
 */

// --- Types ---

export interface LightboxImage {
  /** Image source URL */
  src: string;
  /** Thumbnail URL (optional, falls back to src) */
  thumb?: string;
  /** Alt text */
  alt?: string;
  /** Caption text */
  caption?: string;
  /** Subtitle/description */
  description?: string;
  /** Custom width hint (px) */
  width?: number;
  /** Custom height hint (px) */
  height?: number;
}

export type LightboxZoomMode = "fit" | "fill" | "custom";

export interface LightboxOptions {
  /** Array of images to display */
  images: LightboxImage[];
  /** Starting index (default 0) */
  startIndex?: number;
  /** Show navigation arrows */
  showNav?: boolean;
  /** Show thumbnail strip at bottom */
  showThumbs?: boolean;
  /** Show caption overlay */
  showCaption?: boolean;
  /** Show counter (e.g., "3/12") */
  showCounter?: boolean;
  /** Enable zoom on click/wheel */
  enableZoom?: boolean;
  /** Max zoom level (e.g., 3 = 300%) */
  maxZoom?: number;
  /** Zoom step per wheel notch */
  zoomStep?: number;
  /** Enable panning when zoomed */
  enablePan?: boolean;
  /** Background color */
  background?: string;
  /** Animation duration (ms) */
  duration?: number;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Keyboard navigation enabled */
  keyboardNav?: boolean;
  /** Loop navigation (wrap around) */
  loop?: boolean;
  /** Preload adjacent images */
  preload?: boolean;
  /** Z-index */
  zIndex?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when lightbox opens */
  onOpen?: () => void;
  /** Called when lightbox closes */
  onClose?: () => void;
  /** Called when image changes */
  onChange?: (index: number, image: LightboxImage) => void;
  /** Called when zoom changes */
  onZoom?: (zoom: number) => void;
}

export interface LightboxInstance {
  /** Root element */
  el: HTMLElement;
  /** Open the lightbox */
  open: (index?: number) => void;
  /** Close the lightbox */
  close: () => void;
  /** Go to next image */
  next: () => void;
  /** Go to previous image */
  prev: () => void;
  /** Go to specific index */
  goTo: (index: number) => void;
  /** Check if open */
  isOpen: () => boolean;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Get current zoom level */
  getZoom: () => number;
  /** Get current image index */
  getIndex: () => number;
  /** Update images list */
  setImages: (images: LightboxImage[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create an image lightbox viewer.
 *
 * @example
 * ```ts
 * const lb = createLightbox({
 *   images: [
 *     { src: "photo1.jpg", caption: "Sunset" },
 *     { src: "photo2.jpg", caption: "Mountains" },
 *   ],
 * });
 * lb.open();
 * ```
 */
export function createLightbox(options: LightboxOptions): LightboxInstance {
  const {
    images,
    startIndex = 0,
    showNav = true,
    showThumbs = false,
    showCaption = true,
    showCounter = true,
    enableZoom = true,
    maxZoom = 4,
    zoomStep = 0.3,
    enablePan = true,
    background = "rgba(0,0,0,0.92)",
    duration = 250,
    closeOnBackdrop = true,
    closeOnEscape = true,
    keyboardNav = true,
    loop = true,
    preload = true,
    zIndex = 9999,
    className,
    container,
    onOpen,
    onClose,
    onChange,
    onZoom,
  } = options;

  let _open = false;
  let _index = Math.min(startIndex, Math.max(0, images.length - 1));
  let _images = [...images];
  let _zoom = 1;
  let _panX = 0;
  let _panY = 0;
  let _isPanning = false;
  let _panStartX = 0;
  let _panStartY = 0;
  let cleanupFns: Array<() => void> = [];
  let unlockScrollFn: (() => void) | null = null;

  // Overlay
  const overlay = document.createElement("div");
  overlay.className = `lightbox-overlay ${className ?? ""}`.trim();
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:auto;display:none;" +
    `z-index:${zIndex};background:${background};` +
    "align-items:center;justify-content:center;" +
    "user-select:none;-webkit-user-select:none;";

  // Main image area
  const viewport = document.createElement("div");
  viewport.className = "lightbox-viewport";
  viewport.style.cssText =
    "position:relative;width:100%;height:100%;display:flex;" +
    "align-items:center;justify-content:center;overflow:hidden;";
  overlay.appendChild(viewport);

  // Image element
  const imgEl = document.createElement("img");
  imgEl.className = "lightbox-image";
  imgEl.style.cssText =
    "max-width:90vw;max-height:85vh;object-fit:contain;" +
    "transition:transform 0.15s ease-out;cursor:" + (enableZoom ? "zoom-in" : "default") + ";";
  imgEl.draggable = false;
  viewport.appendChild(imgEl);

  // Loading spinner
  const loader = document.createElement("div");
  loader.className = "lightbox-loader";
  loader.style.cssText =
    "position:absolute;display:none;pointer-events:none;" +
    "width:40px;height:40px;border:3px solid rgba(255,255,255,0.2);" +
    "border-top-color:#fff;border-radius:50%;animation:lb-spin 0.6s linear infinite;";
  viewport.appendChild(loader);

  // Navigation arrows
  let prevBtn: HTMLElement | null = null;
  let nextBtn: HTMLElement | null = null;

  if (showNav && _images.length > 1) {
    prevBtn = _createNavBtn("prev", "&#10094;");
    nextBtn = _createNavBtn("next", "&#10095;");
    overlay.appendChild(prevBtn);
    overlay.appendChild(nextBtn);
  }

  // Caption bar
  let captionEl: HTMLElement | null = null;
  if (showCaption) {
    captionEl = document.createElement("div");
    captionEl.className = "lightbox-caption";
    captionEl.style.cssText =
      "position:absolute;bottom:0;left:0;right:0;padding:16px 24px;" +
      "background:linear-gradient(transparent,rgba(0,0,0,0.7));" +
      "color:#fff;font-size:14px;text-align:center;pointer-events:none;" +
      "opacity:0;transition:opacity 0.25s ease;";
    overlay.appendChild(captionEl);
  }

  // Counter
  let counterEl: HTMLElement | null = null;
  if (showCounter) {
    counterEl = document.createElement("div");
    counterEl.className = "lightbox-counter";
    counterEl.style.cssText =
      "position:absolute;top:16px;right:20px;color:rgba(255,255,255,0.7);" +
      "font-size:13px;font-weight:500;pointer-events:none;font-variant-numeric:tabular-nums;";
    overlay.appendChild(counterEl);
  }

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.innerHTML = "&times;";
  closeBtn.setAttribute("aria-label", "Close lightbox");
  closeBtn.style.cssText =
    "position:absolute;top:12px;right:12px;z-index:2;border:none;background:none;" +
    "color:#fff;font-size:28px;cursor:pointer;padding:4px 10px;line-height:1;" +
    "border-radius:6px;transition:background 0.15s;";
  closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "rgba(255,255,255,0.15)"; });
  closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
  closeBtn.addEventListener("click", close);
  if (!counterEl || !showCounter) {
    overlay.appendChild(closeBtn);
  } else {
    // Position close button left of counter
    overlay.insertBefore(closeBtn, counterEl);
    closeBtn.style.right = "auto";
    closeBtn.style.left = "12px";
  }

  // Thumbnail strip
  let thumbStrip: HTMLElement | null = null;
  if (showThumbs && _images.length > 1) {
    thumbStrip = document.createElement("div");
    thumbStrip.className = "lightbox-thumbs";
    thumbStrip.style.cssText =
      "position:absolute;bottom:0;left:0;right:0;display:flex;" +
      "gap:6px;padding:8px 16px;justify-content:center;" +
      "background:linear-gradient(transparent,rgba(0,0,0,0.5));" +
      "overflow-x:auto;scrollbar-width:none;" +
      "&::-webkit-scrollbar{display:none;}";
    overlay.appendChild(thumbStrip);
  }

  // Zoom indicator
  let zoomIndicator: HTMLElement | null = null;
  if (enableZoom) {
    zoomIndicator = document.createElement("div");
    zoomIndicator.className = "lightbox-zoom-indicator";
    zoomIndicator.style.cssText =
      "position:absolute;top:16px;left:50%;transform:translateX(-50%);" +
      "color:rgba(255,255,255,0.7);font-size:12px;font-weight:500;" +
      "pointer-events:none;opacity:0;transition:opacity 0.2s;";
    overlay.appendChild(zoomIndicator);
  }

  // Keyframes
  if (!document.getElementById("lb-keyframes")) {
    const ks = document.createElement("style");
    ks.id = "lb-keyframes";
    ks.textContent =
      "@keyframes lb-spin{to{transform:rotate(360deg)}}" +
      "@keyframes lb-fade-in{from{opacity:0}to{opacity:1}}" +
      "@keyframes lb-fade-out{from{opacity:1}to{opacity:0}}";
    document.head.appendChild(ks);
  }

  (container ?? document.body).appendChild(overlay);

  // --- Internal Helpers ---

  function _createNavBtn(dir: "prev" | "next", arrow: string): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `lightbox-nav lightbox-nav-${dir}`;
    btn.innerHTML = arrow;
    btn.setAttribute("aria-label", dir === "prev" ? "Previous" : "Next");
    btn.style.cssText =
      "position:absolute;top:50%;transform:translateY(-50%);z-index:2;" +
      "border:none;background:rgba(255,255,255,0.1);color:#fff;" +
      "font-size:24px;cursor:pointer;padding:12px 16px;border-radius:8px;" +
      "transition:background 0.15s;" +
      (dir === "prev" ? "left:12px;" : "right:12px;");
    btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(255,255,255,0.25)"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = "rgba(255,255,255,0.1)"; });
    btn.addEventListener("click", () => dir === "prev" ? prev() : next());
    return btn;
  }

  function _loadImage(index: number): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = _images[index]!.src;
    });
  }

  function _showImage(index: number): void {
    if (index < 0 || index >= _images.length) return;
    _index = index;
    const image = _images[index]!;

    // Reset zoom/pan
    _zoom = 1;
    _panX = 0;
    _panY = 0;
    _updateTransform();

    // Show loader
    loader.style.display = "";
    imgEl.style.opacity = "0";

    _loadImage(index)
      .then(() => {
        imgEl.src = image.src;
        imgEl.alt = image.alt ?? image.caption ?? "";
        loader.style.display = "none";
        imgEl.style.opacity = "1";
        imgEl.style.transition = `opacity ${duration}ms ease`;
      })
      .catch(() => {
        loader.style.display = "none";
        imgEl.alt = "Failed to load image";
      });

    // Update caption
    if (captionEl) {
      const cap = image.caption ?? "";
      const desc = image.description ?? "";
      captionEl.innerHTML = cap
        ? `<strong style="font-weight:600;">${_escapeHtml(cap)}</strong>${desc ? `<br><span style="font-size:12px;color:rgba(255,255,255,0.7);">${_escapeHtml(desc)}</span>` : ""}`
        : "";
      captionEl.style.opacity = cap || desc ? "1" : "0";
    }

    // Update counter
    if (counterEl) {
      counterEl.textContent = `${index + 1}/${_images.length}`;
    }

    // Update thumbs
    if (thumbStrip) _renderThumbs();

    // Preload adjacent
    if (preload) {
      if (index > 0) _preloadImg(index - 1);
      if (index < _images.length - 1) _preloadImg(index + 1);
    }

    // Update nav visibility
    _updateNavVisibility();

    onChange?.(index, image);
  }

  function _preloadImg(idx: number): void {
    if (idx >= 0 && idx < _images.length) {
      const i = new Image();
      i.src = _images[idx]!.src;
    }
  }

  function _renderThumbs(): void {
    if (!thumbStrip) return;
    thumbStrip.innerHTML = "";

    for (let i = 0; i < _images.length; i++) {
      const thumb = document.createElement("button");
      thumb.type = "button";
      thumb.className = `lightbox-thumb${i === _index ? " active" : ""}`;
      thumb.setAttribute("aria-label", `Go to image ${i + 1}`);
      const src = _images[i]?.thumb ?? _images[i]?.src ?? "";
      thumb.style.cssText =
        "width:48px;height:36px;border:2px solid transparent;" +
        "border-radius:4px;object-fit:cover;cursor:pointer;" +
        "padding:0;background:none;opacity:0.5;transition:all 0.15s;" +
        (i === _index ? "border-color:#fff;opacity:1;" : "");

      const tImg = document.createElement("img");
      tImg.src = src;
      tImg.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:2px;display:block;";
      tImg.draggable = false;
      thumb.appendChild(tImg);

      thumb.addEventListener("click", () => goTo(i));
      thumbStrip!.appendChild(thumb);
    }
  }

  function _updateNavVisibility(): void {
    if (prevBtn) prevBtn.style.display = loop || _index > 0 ? "" : "none";
    if (nextBtn) nextBtn.style.display = loop || _index < _images.length - 1 ? "" : "none";
  }

  function _updateTransform(): void {
    imgEl.style.transform = `translate(${_panX}px, ${_panY}px) scale(${_zoom})`;
    imgEl.style.cursor = _zoom > 1 ? "grab" : enableZoom ? "zoom-in" : "default";
  }

  function _showZoomIndicator(): void {
    if (!zoomIndicator) return;
    zoomIndicator.textContent = `${Math.round(_zoom * 100)}%`;
    zoomIndicator.style.opacity = "1";
    clearTimeout((zoomIndicator as any)._hideTimer);
    (zoomIndicator as any)._hideTimer = setTimeout(() => {
      zoomIndicator!.style.opacity = "0";
    }, 800);
  }

  function _escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // --- Methods ---

  function open(index?: number): void {
    if (_open) return;
    _open = true;
    overlay.style.display = "flex";
    overlay.style.animation = "lb-fade-in 0.2s ease";

    // Lock scroll
    unlockScrollFn = _lockBody();

    _showImage(index ?? startIndex);
    _setupListeners();
    onOpen?.();
  }

  function close(): void {
    if (!_open) return;
    overlay.style.animation = "lb-fade-out 0.2s ease forwards";

    setTimeout(() => {
      _open = false;
      overlay.style.display = "none";
      overlay.style.animation = "";
      _removeListeners();
      unlockScrollFn?.();
      unlockScrollFn = null;
      onClose?.();
    }, duration);
  }

  function next(): void {
    if (_images.length <= 1) return;
    if (_index < _images.length - 1) {
      _showImage(_index + 1);
    } else if (loop) {
      _showImage(0);
    }
  }

  function prev(): void {
    if (_images.length <= 1) return;
    if (_index > 0) {
      _showImage(_index - 1);
    } else if (loop) {
      _showImage(_images.length - 1);
    }
  }

  function goTo(index: number): void {
    if (index >= 0 && index < _images.length) {
      _showImage(index);
    }
  }

  function isOpen(): boolean { return _open; }

  function setZoom(zoom: number): void {
    _zoom = Math.max(1, Math.min(maxZoom, zoom));
    if (_zoom === 1) { _panX = 0; _panY = 0; }
    _updateTransform();
    _showZoomIndicator();
    onZoom?.(_zoom);
  }

  function getZoom(): number { return _zoom; }
  function getIndex(): number { return _index; }

  function setImages(newImages: LightboxImage[]): void {
    _images = [...newImages];
    if (_open) _showImage(Math.min(_index, _images.length - 1));
  }

  function destroy(): void {
    if (_open) {
      _open = false;
      overlay.style.display = "";
      _removeListeners();
      unlockScrollFn?.();
    }
    overlay.remove();
  }

  // --- Listeners ---

  function _setupListeners(): void {
    _removeListeners();

    // Backdrop click
    if (closeOnBackdrop) {
      const handler = (e: MouseEvent) => {
        if (e.target === overlay || e.target === viewport) close();
      };
      overlay.addEventListener("click", handler);
      cleanupFns.push(() => overlay.removeEventListener("click", handler));
    }

    // Escape
    if (closeOnEscape) {
      const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", h);
      cleanupFns.push(() => document.removeEventListener("keydown", h));
    }

    // Keyboard nav
    if (keyboardNav) {
      const kh = (e: KeyboardEvent) => {
        if (!_open) return;
        switch (e.key) {
          case "ArrowLeft": e.preventDefault(); prev(); break;
          case "ArrowRight": e.preventDefault(); next(); break;
          case "+": case "=": e.preventDefault(); setZoom(_zoom + zoomStep); break;
          case "-": case "_": e.preventDefault(); setZoom(_zoom - zoomStep); break;
          case "0": e.preventDefault(); setZoom(1); break;
        }
      };
      document.addEventListener("keydown", kh);
      cleanupFns.push(() => document.removeEventListener("keydown", kh));
    }

    // Zoom via click
    if (enableZoom) {
      imgEl.addEventListener("click", () => {
        if (_zoom === 1) setZoom(2);
        else setZoom(1);
      });

      // Mouse wheel zoom
      const wheelHandler = (e: WheelEvent): void => {
        if (!_open || !_enableWheelZoom(e)) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
        setZoom(_zoom + delta);
      };
      viewport.addEventListener("wheel", wheelHandler, { passive: false });
      cleanupFns.push(() => viewport.removeEventListener("wheel", wheelHandler));
    }

    // Pan when zoomed
    if (enablePan) {
      const panStart = (e: MouseEvent): void => {
        if (_zoom <= 1) return;
        _isPanning = true;
        _panStartX = e.clientX - _panX;
        _panStartY = e.clientY - _panY;
        imgEl.style.cursor = "grabbing";
        e.preventDefault();
      };

      const panMove = (e: MouseEvent): void => {
        if (!_isPanning) return;
        _panX = e.clientX - _panStartX;
        _panY = e.clientY - _panStartY;
        _updateTransform();
      };

      const panEnd = (): void => {
        _isPanning = false;
        imgEl.style.cursor = _zoom > 1 ? "grab" : enableZoom ? "zoom-in" : "default";
      };

      viewport.addEventListener("mousedown", panStart);
      document.addEventListener("mousemove", panMove);
      document.addEventListener("mouseup", panEnd);
      cleanupFns.push(
        () => viewport.removeEventListener("mousedown", panStart),
        () => document.removeEventListener("mousemove", panMove),
        () => document.removeEventListener("mouseup", panEnd),
      );
    }

    // Touch swipe for navigation
    let touchStartX = 0;
    let touchStartY = 0;
    const touchStart = (e: TouchEvent): void => {
      touchStartX = e.touches[0]!.clientX;
      touchStartY = e.touches[0]!.clientY;
    };
    const touchEnd = (e: TouchEvent): void => {
      if (_zoom > 1) return; // Don't swipe when zoomed
      const dx = e.changedTouches[0]!.clientX - touchStartX;
      const dy = e.changedTouches[0]!.clientY - touchStartY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        dx > 0 ? prev() : next();
      }
    };
    viewport.addEventListener("touchstart", touchStart, { passive: true });
    viewport.addEventListener("touchend", touchEnd, { passive: true });
    cleanupFns.push(
      () => viewport.removeEventListener("touchstart", touchStart),
      () => viewport.removeEventListener("touchend", touchEnd),
    );
  }

  function _enableWheelZoom(e: WheelEvent): boolean {
    // Only zoom with Ctrl/Meta key or when already zoomed
    return e.ctrlKey || e.metaKey || _zoom > 1;
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: overlay, open, close, next, prev, goTo, isOpen, setZoom, getZoom, getIndex, setImages, destroy };
}

/** Simple body scroll lock helper */
function _lockBody(): () => void {
  const body = document.body;
  const origOverflow = body.style.overflow;
  const origPR = body.style.paddingRight;
  const sbW = window.innerWidth - document.documentElement.clientWidth;
  body.style.overflow = "hidden";
  if (sbW > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight || "0") + sbW}px`;
  return () => { body.style.overflow = origOverflow; body.style.paddingRight = origPR; };
}
