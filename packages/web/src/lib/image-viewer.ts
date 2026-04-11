/**
 * Image Viewer: Full-screen lightbox for viewing images with zoom/pan,
 * keyboard navigation, thumbnail strip, rotation, download, fullscreen mode,
 * caption display, and touch gesture support.
 */

// --- Types ---

export interface ImageViewerImage {
  /** Image URL or src */
  src: string;
  /** Alt text */
  alt?: string;
  /** Caption/title */
  title?: string;
  /** Thumbnail URL (optional, falls back to src) */
  thumbSrc?: string;
}

export type ImageViewerTool = "zoom-in" | "zoom-out" | "rotate-left" | "rotate-right" | "reset" | "download" | "fullscreen" | "prev" | "next";

export interface ImageViewerOptions {
  /** Images to display */
  images: ImageViewerImage[];
  /** Starting index (default: 0) */
  startIndex?: number;
  /** Container to append viewer to (default: document.body) */
  container?: HTMLElement | string;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Show thumbnail strip at bottom */
  showThumbnails?: boolean;
  /** Show caption below image */
  showCaption?: boolean;
  /** Show counter (e.g., "3 / 10") */
  showCounter?: boolean;
  /** Background color overlay */
  overlayColor?: string;
  /** Max zoom level (default: 5) */
  maxZoom?: number;
  /** Min zoom level (default: 0.5) */
  minZoom?: number;
  /** Zoom step per click (default: 1.2) */
  zoomStep?: number;
  /** Keyboard navigation enabled */
  keyboardNav?: boolean;
  /** Close on overlay click */
  closeOnOverlayClick?: boolean;
  /** Callback on index change */
  onIndexChange?: (index: number) => void;
  /** Callback when viewer closes */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Z-index */
  zIndex?: number;
}

export interface ImageViewerInstance {
  element: HTMLDivElement;
  open: (index?: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  getCurrentIndex: () => number;
  getZoom: () => number;
  setZoom: (level: number) => void;
  rotate: (degrees: number) => void;
  destroy: () => void;
}

// --- Main Class ---

export class ImageViewerManager {
  create(options: ImageViewerOptions): ImageViewerInstance {
    const opts = {
      startIndex: options.startIndex ?? 0,
      showToolbar: options.showToolbar ?? true,
      showThumbnails: options.showThumbnails ?? true,
      showCaption: options.showCaption ?? true,
      showCounter: options.showCounter ?? true,
      overlayColor: options.overlayColor ?? "rgba(0, 0, 0, 0.9)",
      maxZoom: options.maxZoom ?? 5,
      minZoom: options.minZoom ?? 0.5,
      zoomStep: options.zoomStep ?? 1.2,
      keyboardNav: options.keyboardNav ?? true,
      closeOnOverlayClick: options.closeOnOverlayClick ?? true,
      zIndex: options.zIndex ?? 10000,
      ...options,
    };

    const container = options.container
      ? (typeof options.container === "string"
        ? document.querySelector<HTMLElement>(options.container)!
        : options.container)
      : document.body;

    // Root overlay
    const root = document.createElement("div");
    root.className = `image-viewer ${opts.className ?? ""}`;
    root.style.cssText = `
      position:fixed;inset:0;z-index:${opts.zIndex};
      background:${opts.overlayColor};
      display:none;align-items:center;justify-content:center;
      flex-direction:column;font-family:-apple-system,sans-serif;
      opacity:0;transition:opacity 0.25s ease;
      user-select:none;-webkit-user-select:none;
    `;
    container.appendChild(root);

    // State
    let currentIndex = opts.startIndex;
    let isOpen = false;
    let destroyed = false;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let rotation = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartPanX = 0;
    let dragStartPanY = 0;

    // --- Toolbar ---
    const toolbar = document.createElement("div");
    toolbar.className = "iv-toolbar";
    toolbar.style.cssText = `
      position:absolute;top:16px;left:50%;transform:translateX(-50%);
      display:flex;gap:6px;padding:8px 12px;background:rgba(0,0,0,0.6);
      border-radius:10px;backdrop-filter:blur(8px);
      z-index:2;${!opts.showToolbar ? "display:none;" : ""}
    `;
    root.appendChild(toolbar);

    const tools: Array<{ id: ImageViewerTool; label: string; icon: string }> = [
      { id: "zoom-out", label: "Zoom out", icon: "\u2212" },
      { id: "zoom-in", label: "Zoom in", icon: "+" },
      { id: "reset", label: "Reset", icon: "\u21BB" },
      { id: "rotate-left", label: "Rotate left", icon: "\u21BA" },
      { id: "rotate-right", label: "Rotate right", icon: "\u27F3" },
      { id: "download", label: "Download", icon: "\u2193" },
      { id: "fullscreen", label: "Fullscreen", icon: "\u26F6" },
    ];

    const toolBtns = new Map<ImageViewerTool, HTMLButtonElement>();

    for (const tool of tools) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = tool.label;
      btn.dataset.tool = tool.id;
      btn.style.cssText = `
        width:32px;height:32px;border:none;border-radius:6px;
        background:rgba(255,255,255,0.15);color:#fff;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        font-size:15px;transition:background 0.15s;
      `;
      btn.textContent = tool.icon;
      btn.addEventListener("click", () => handleTool(tool.id));
      btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(255,255,255,0.28)"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "rgba(255,255,255,0.15)"; });
      toolbar.appendChild(btn);
      toolBtns.set(tool.id, btn);
    }

    // Navigation arrows
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.innerHTML = "&#8249;";
    prevBtn.title = "Previous";
    prevBtn.style.cssText = `
      position:absolute;left:16px;top:50%;transform:translateY(-50%);
      width:44px;height:44px;border-radius:50%;border:none;
      background:rgba(0,0,0,0.4);color:#fff;font-size:22px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:background 0.15s;z-index:2;
    `;
    prevBtn.addEventListener("click", () => instance.prev());
    prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "rgba(0,0,0,0.65)"; });
    prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = "rgba(0,0,0,0.4)"; });
    root.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.innerHTML = "&#8250;";
    nextBtn.title = "Next";
    nextBtn.style.cssText = `
      position:absolute;right:16px;top:50%;transform:translateY(-50%);
      width:44px;height:44px;border-radius:50%;border:none;
      background:rgba(0,0,0,0.4);color:#fff;font-size:22px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:background 0.15s;z-index:2;
    `;
    nextBtn.addEventListener("click", () => instance.next());
    nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "rgba(0,0,0,0.65)"; });
    nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = "rgba(0,0,0,0.4)"; });
    root.appendChild(nextBtn);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.title = "Close (Esc)";
    closeBtn.style.cssText = `
      position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;
      border:none;background:rgba(0,0,0,0.5);color:#fff;font-size:20px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:background 0.15s;z-index:2;
    `;
    closeBtn.addEventListener("click", () => instance.close());
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "rgba(220,38,38,0.7)"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = "rgba(0,0,0,0.5)"; });
    root.appendChild(closeBtn);

    // --- Image container ---
    const imgContainer = document.createElement("div");
    imgContainer.className = "iv-image-container";
    imgContainer.style.cssText = `
      flex:1;display:flex;align-items:center;justify-content:center;
      overflow:hidden;width:100%;position:relative;cursor:grab;
    `;
    root.appendChild(imgContainer);

    const mainImg = document.createElement("img");
    mainImg.className = "iv-main-image";
    mainImg.style.cssText = `
      max-width:85vw;max-height:75vh;object-fit:contain;
      transition:transform 0.2s ease;user-select:none;-webkit-user-drag:none;
      transform-origin:center center;
    `;
    mainImg.draggable = false;
    imgContainer.appendChild(mainImg);

    // Loading indicator
    const loadingEl = document.createElement("div");
    loadingEl.className = "iv-loading";
    loadingEl.style.cssText = `
      position:absolute;display:none;align-items:center;justify-content:center;
      inset:0;background:rgba(0,0,0,0.3);
    `;
    loadingEl.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" style="animation:spin 0.8s linear infinite"><circle cx="12" cy="12" r="10" stroke="white" fill="none" stroke-width="2" stroke-dasharray="31.4 31.4" stroke-linecap="round"/></svg>`;
    imgContainer.appendChild(loadingEl);

    // --- Caption ---
    const captionEl = document.createElement("div");
    captionEl.className = "iv-caption";
    captionEl.style.cssText = `
      padding:12px 20px;text-align:center;color:#ccc;font-size:14px;
      max-width:80vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      ${!opts.showCaption ? "display:none;" : ""}
    `;
    root.appendChild(captionEl);

    // --- Counter ---
    const counterEl = document.createElement("div");
    counterEl.className = "iv-counter";
    counterEl.style.cssText = `
      position:absolute;bottom:16px;right:20px;color:rgba(255,255,255,0.6);
      font-size:13px;font-family:monospace;z-index:2;
      ${!opts.showCounter ? "display:none;" : ""}
    `;
    root.appendChild(counterEl);

    // --- Thumbnail strip ---
    const thumbStrip = document.createElement("div");
    thumbStrip.className = "iv-thumbnails";
    thumbStrip.style.cssText = `
      display:flex;gap:8px;padding:12px 20px;justify-content:center;
      overflow-x:auto;${!opts.showThumbnails ? "display:none;" : ""}
      scrollbar-width:none;-ms-overflow-style:none;
    `;
    root.appendChild(thumbStrip);

    const thumbEls = new Map<number, HTMLImageElement>();

    function buildThumbnails(): void {
      thumbStrip.innerHTML = "";
      thumbEls.clear();

      for (let i = 0; i < opts.images.length; i++) {
        const imgData = opts.images[i]!;
        const thumb = document.createElement("img");
        thumb.src = imgData.thumbSrc ?? imgData.src;
        thumb.alt = imgData.alt ?? "";
        thumb.style.cssText = `
          width:48px;height:48px;object-fit:cover;border-radius:4px;
          cursor:pointer;border:2px solid transparent;
          opacity:${i === currentIndex ? "1" : "0.5"};
          transition:border-color 0.15s,opacity 0.15s;
          flex-shrink:0;
        `;
        if (i === currentIndex) thumb.style.borderColor = "#6366f1";

        thumb.addEventListener("click", () => instance.goTo(i));
        thumbStrip.appendChild(thumb);
        thumbEls.set(i, thumb);
      }
    }

    // --- Core functions ---

    function loadImage(index: number): void {
      if (index < 0 || index >= opts.images.length) return;

      loadingEl.style.display = "flex";
      const imgData = opts.images[index]!;

      mainImg.onload = () => {
        loadingEl.style.display = "none";
        resetTransform();
      };
      mainImg.onerror = () => {
        loadingEl.style.display = "none";
      };
      mainImg.src = imgData.src;
      mainImg.alt = imgData.alt ?? "";

      if (opts.showCaption) {
        captionEl.textContent = imgData.title ?? imgData.alt ?? "";
      }
      if (opts.showCounter) {
        counterEl.textContent = `${index + 1} / ${opts.images.length}`;
      }
    }

    function resetTransform(): void {
      zoom = 1;
      panX = 0;
      panY = 0;
      rotation = 0;
      applyTransform();
    }

    function applyTransform(): void {
      mainImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`;
      imgContainer.style.cursor = zoom > 1 ? "grab" : "default";
    }

    function handleTool(toolId: ImageViewerTool): void {
      switch (toolId) {
        case "zoom-in":
          zoom = Math.min(opts.maxZoom, zoom * opts.zoomStep);
          break;
        case "zoom-out":
          zoom = Math.max(opts.minZoom, zoom / opts.zoomStep);
          break;
        case "reset":
          resetTransform();
          return;
        case "rotate-left":
          rotation -= 90;
          break;
        case "rotate-right":
          rotation += 90;
          break;
        case "download": {
          const a = document.createElement("a");
          a.href = opts.images[currentIndex]!.src;
          a.download = "";
          a.click();
          return;
        }
        case "fullscreen":
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            root.requestFullscreen?.();
          }
          return;
      }
      applyTransform();
    }

    // --- Pointer events for pan/zoom ---

    function getPointerPos(e: PointerEvent): { x: number; y: number } {
      const rect = imgContainer.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    imgContainer.addEventListener("pointerdown", (e: PointerEvent) => {
      if (zoom <= 1) return;
      isDragging = true;
      const pos = getPointerPos(e);
      dragStartX = pos.x;
      dragStartY = pos.y;
      dragStartPanX = panX;
      dragStartPanY = panY;
      imgContainer.setPointerCapture(e.pointerId);
      imgContainer.style.cursor = "grabbing";
    });

    imgContainer.addEventListener("pointermove", (e: PointerEvent) => {
      if (!isDragging) return;
      const pos = getPointerPos(e);
      panX = dragStartPanX + (pos.x - dragStartX);
      panY = dragStartPanY + (pos.y - dragStartY);
      applyTransform();
    });

    imgContainer.addEventListener("pointerup", () => {
      isDragging = false;
      imgContainer.style.cursor = zoom > 1 ? "grab" : "default";
    });

    // Mouse wheel zoom
    imgContainer.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 / opts.zoomStep : opts.zoomStep;
      zoom = Math.max(opts.minZoom, Math.min(opts.maxZoom, zoom * delta));
      applyTransform();
    }, { passive: false });

    // Double-click to toggle zoom
    imgContainer.addEventListener("dblclick", () => {
      if (zoom > 1) {
        resetTransform();
      } else {
        zoom = 2.5;
        applyTransform();
      }
    });

    // Overlay click to close
    root.addEventListener("click", (e: MouseEvent) => {
      if (opts.closeOnOverlayClick && e.target === root) {
        instance.close();
      }
    });

    // Keyboard navigation
    if (opts.keyboardNav) {
      document.addEventListener("keydown", handleKeydown);
    }

    function handleKeydown(e: KeyboardEvent): void {
      if (!isOpen) return;
      switch (e.key) {
        case "Escape":
          e.preventDefault();
          instance.close();
          break;
        case "ArrowLeft":
          e.preventDefault();
          instance.prev();
          break;
        case "ArrowRight":
          e.preventDefault();
          instance.next();
          break;
        case "+":
        case "=":
          e.preventDefault();
          zoom = Math.min(opts.maxZoom, zoom * opts.zoomStep);
          applyTransform();
          break;
        case "-":
        case "_":
          e.preventDefault();
          zoom = Math.max(opts.minZoom, zoom / opts.zoomStep);
          applyTransform();
          break;
        case "0":
          e.preventDefault();
          resetTransform();
          break;
      }
    }

    // Update thumbnail active state
    function updateThumbActive(): void {
      for (const [i, el] of thumbEls) {
        el.style.opacity = i === currentIndex ? "1" : "0.5";
        el.style.borderColor = i === currentIndex ? "#6366f1" : "transparent";
      }
    }

    // --- Instance ---

    const instance: ImageViewerInstance = {
      element: root,

      open(index?: number) {
        if (destroyed || isOpen) return;
        if (index !== undefined) currentIndex = index;
        isOpen = true;
        root.style.display = "flex";
        buildThumbnails();
        loadImage(currentIndex);
        updateThumbActive();
        requestAnimationFrame(() => { root.style.opacity = "1"; });
        document.body.style.overflow = "hidden";
        if (opts.keyboardNav) document.addEventListener("keydown", handleKeydown);
      },

      close() {
        if (!isOpen || destroyed) return;
        root.style.opacity = "0";
        setTimeout(() => {
          root.style.display = "none";
          isOpen = false;
        }, 250);
        document.body.style.overflow = "";
        if (opts.keyboardNav) document.removeEventListener("keydown", handleKeydown);
        opts.onClose?.();
      },

      next() {
        if (currentIndex < opts.images.length - 1) {
          currentIndex++;
          loadImage(currentIndex);
          updateThumbActive();
          scrollToThumbnail(currentIndex);
          opts.onIndexChange?.(currentIndex);
        }
      },

      prev() {
        if (currentIndex > 0) {
          currentIndex--;
          loadImage(currentIndex);
          updateThumbActive();
          scrollToThumbnail(currentIndex);
          opts.onIndexChange?.(currentIndex);
        }
      },

      goTo(index: number) {
        if (index >= 0 && index < opts.images.length && index !== currentIndex) {
          currentIndex = index;
          loadImage(currentIndex);
          updateThumbActive();
          scrollToThumbnail(currentIndex);
          opts.onIndexChange?.(currentIndex);
        }
      },

      getCurrentIndex() { return currentIndex; },

      getZoom() { return zoom; },

      setZoom(level: number) {
        zoom = Math.max(opts.minZoom, Math.min(opts.maxZoom, level));
        applyTransform();
      },

      rotate(degrees: number) {
        rotation += degrees;
        applyTransform();
      },

      destroy() {
        destroyed = true;
        instance.close();
        document.removeEventListener("keydown", handleKeydown);
        root.remove();
      },
    };

    function scrollToThumbnail(index: number): void {
      const el = thumbEls.get(index);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }

    return instance;
  }
}

/** Convenience: create an image viewer */
export function createImageViewer(options: ImageViewerOptions): ImageViewerInstance {
  return new ImageViewerManager().create(options);
}
