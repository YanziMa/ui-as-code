/**
 * Image Gallery / Lightbox: Full-featured image viewer with thumbnail grid,
 * fullscreen lightbox mode, zoom (pinch/double-click/wheel), swipe navigation,
 * keyboard shortcuts, captions, lazy loading, and responsive design.
 */

// --- Types ---

export interface GalleryImage {
  /** Unique key */
  key: string;
  /** Image URL (or srcset for responsive) */
  src: string;
  /** Thumbnail URL (falls back to src) */
  thumb?: string;
  /** Alt text */
  alt?: string;
  /** Caption text */
  caption?: string;
  /** Width hint (for aspect ratio calculation) */
  width?: number;
  /** Height hint */
  height?: number;
}

export interface ImageGalleryOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Images to display */
  images: GalleryImage[];
  /** Columns in grid view (default: auto based on container) */
  columns?: number;
  /** Gap between thumbnails (px) */
  gap?: number;
  /** Border radius on thumbnails */
  radius?: number;
  /** Show captions below thumbnails? */
  showCaptions?: boolean;
  /** Open lightbox on click? */
  lightboxEnabled?: boolean;
  /** Lightbox: show arrows? */
  showArrows?: boolean;
  /** Lightbox: show dots/counter? */
  showCounter?: boolean;
  /** Lightbox: show caption overlay? */
  showCaptionOverlay?: boolean;
  /** Lightbox: enable zoom? */
  zoomEnabled?: boolean;
  /** Max zoom level */
  maxZoom?: number;
  /** Zoom step per wheel tick */
  zoomStep?: number;
  /** Background color when open */
  overlayBg?: string;
  /** Callback on image click (before lightbox) */
  onImageClick?: (image: GalleryImage, index: number) => void | boolean;
  /** Callback on lightbox open */
  onOpen?: (index: number) => void;
  /** Callback on lightbox close */
  onClose?: () => void;
  /** Callback on index change */
  onChange?: (index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ImageGalleryInstance {
  element: HTMLElement;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  getCurrentIndex: () => number;
  setCurrentIndex: (index: number) => void;
  addImage: (image: GalleryImage, index?: number) => void;
  removeImage: (key: string) => void;
  destroy: () => void;
}

// --- Main Class ---

export class ImageGalleryManager {
  create(options: ImageGalleryOptions): ImageGalleryInstance {
    const opts = {
      columns: options.columns ?? 0,
      gap: options.gap ?? 8,
      radius: options.radius ?? 8,
      showCaptions: options.showCaptions ?? true,
      lightboxEnabled: options.lightboxEnabled ?? true,
      showArrows: options.showArrows ?? true,
      showCounter: options.showCounter ?? true,
      showCaptionOverlay: options.showCaptionOverlay ?? true,
      zoomEnabled: options.zoomEnabled ?? true,
      maxZoom: options.maxZoom ?? 4,
      zoomStep: options.zoomStep ?? 0.3,
      overlayBg: options.overlayBg ?? "rgba(0,0,0,0.92)",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ImageGallery: container not found");

    container.className = `image-gallery ${opts.className ?? ""}`;
    let images = [...options.images];
    let currentIndex = 0;
    let isLightboxOpen = false;
    let destroyed = false;

    // Zoom state
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragPanStartX = 0;
    let dragPanStartY = 0;

    // Lightbox elements
    let lightboxEl: HTMLDivElement | null = null;
    let lightboxImg: HTMLImageElement | null = null;

    function renderGrid(): void {
      container.innerHTML = "";

      const cols = opts.columns || calculateColumns();
      container.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:${opts.gap}px;`;

      images.forEach((img, i) => {
        const item = document.createElement("div");
        item.className = "gallery-item";
        item.style.cssText = `
          position:relative;aspect-ratio:${img.width && img.height ? `${img.width}/${img.height}` : "1"};
          overflow:hidden;border-radius:${opts.radius}px;cursor:pointer;
          background:#f3f4f6;
        `;

        const imgEl = document.createElement("img");
        imgEl.src = img.thumb ?? img.src;
        imgEl.alt = img.alt ?? "";
        imgEl.loading = "lazy";
        imgEl.style.cssText = `
          width:100%;height:100%;object-fit:cover;
          transition:transform 0.3s ease,opacity 0.2s ease;
        `;
        imgEl.draggable = false;

        // Hover effect
        item.addEventListener("mouseenter", () => { imgEl.style.transform = "scale(1.03)"; });
        item.addEventListener("mouseleave", () => { imgEl.style.transform = ""; });

        // Click handler
        item.addEventListener("click", () => {
          const shouldProceed = opts.onImageClick?.(img, i);
          if (shouldProceed === false) return;
          if (opts.lightboxEnabled) openLightbox(i);
        });

        item.appendChild(imgEl);

        // Caption
        if (img.caption && opts.showCaptions) {
          const cap = document.createElement("div");
          cap.className = "gallery-caption";
          cap.style.cssText = `
            position:absolute;bottom:0;left:0;right:0;padding:20px 8px 8px;
            background:linear-gradient(transparent, rgba(0,0,0,0.7));
            color:#fff;font-size:12px;text-align:center;
            opacity:0;transition:opacity 0.2s;
          `;
          cap.textContent = img.caption;
          item.appendChild(cap);

          item.addEventListener("mouseenter", () => { cap.style.opacity = "1"; });
          item.addEventListener("mouseleave", () => { cap.style.opacity = ""; });
        }

        container.appendChild(item);
      });
    }

    function calculateColumns(): number {
      const w = container.clientWidth || 800;
      if (w < 400) return 2;
      if (w < 700) return 3;
      if (w < 1000) return 4;
      return Math.min(images.length, 5);
    }

    function openLightbox(index: number): void {
      if (isLightboxOpen || images.length === 0) return;
      currentIndex = Math.max(0, Math.min(index, images.length - 1));
      isLightboxOpen = true;
      zoomLevel = 1;
      panX = 0;
      panY = 0;

      // Create lightbox
      lightboxEl = document.createElement("div");
      lightboxEl.className = "lightbox-overlay";
      lightboxEl.style.cssText = `
        position:fixed;inset:0;z-index:9999;background:${opts.overlayBg};
        display:flex;align-items:center;justify-content:center;
        animation:fadeIn 0.25s ease;
      `;

      // Close button
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.innerHTML = "&times;";
      closeBtn.title = "Close (Esc)";
      closeBtn.style.cssText = `
        position:absolute;top:16px;right:16px;background:none;border:none;
        color:#fff;font-size:28px;cursor:pointer;width:44px;height:44px;
        display:flex;align-items:center;justify-content:center;border-radius:50%;
        transition:background 0.15s;z-index:10;
      `;
      closeBtn.addEventListener("click", closeLightbox);
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "rgba(255,255,255,0.15)"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; });
      lightboxEl.appendChild(closeBtn);

      // Arrows
      if (opts.showArrows && images.length > 1) {
        const prevBtn = createArrowBtn("prev", "&#8249;");
        prevBtn.style.cssText += "left:12px;";
        prevBtn.addEventListener("click", () => navigate(-1));
        lightboxEl.appendChild(prevBtn);

        const nextBtn = createArrowBtn("next", "&#8250;");
        nextBtn.style.cssText += "right:12px;";
        nextBtn.addEventListener("click", () => navigate(1));
        lightboxEl.appendChild(nextBtn);
      }

      // Main image area
      const imgContainer = document.createElement("div");
      imgContainer.className = "lightbox-image-container";
      imgContainer.style.cssText = `
        max-width:90vw;max-height:85vh;overflow:hidden;position:relative;
        cursor:${zoomLevel > 1 ? "grab" : "default"};
        touch-action:none;
      `;

      lightboxImg = document.createElement("img");
      lightboxImg.src = images[currentIndex]!.src;
      lightboxImg.alt = images[currentIndex]?.alt ?? "";
      lightboxImg.style.cssText = `
        max-width:90vw;max-height:85vh;object-fit:contain;display:block;
        transition:transform 0.2s ease;user-select:none;-webkit-user-drag:none;
        transform-origin:center center;
      `;
      imgContainer.appendChild(lightboxImg);
      lightboxEl.appendChild(imgContainer);

      // Counter
      if (opts.showCounter && images.length > 1) {
        const counter = document.createElement("div");
        counter.className = "lightbox-counter";
        counter.style.cssText = `
          position:absolute;bottom:24px;left:50%;transform:translateX(-50%);
          color:rgba(255,255,255,0.7);font-size:13px;font-family:-apple-system,sans-serif;
        `;
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
        lightboxEl.appendChild(counter);
      }

      // Caption overlay
      if (opts.showCaptionOverlay && images[currentIndex]?.caption) {
        const capOverlay = document.createElement("div");
        capOverlay.className = "lightbox-caption";
        capOverlay.style.cssText = `
          position:absolute;bottom:0;left:0;right:0;padding:40px 24px 20px;
          background:linear-gradient(transparent, rgba(0,0,0,0.7));
          color:#fff;font-size:14px;text-align:center;
        `;
        capOverlay.textContent = images[currentIndex]!.caption!;
        lightboxEl.appendChild(capOverlay);
      }

      // Zoom controls
      if (opts.zoomEnabled) {
        const zoomControls = document.createElement("div");
        zoomControls.style.cssText = "position:absolute;bottom:24px;right:24px;display:flex;gap:4px;";

        const zoomInBtn = createSmallBtn("+", () => setZoom(zoomLevel + opts.zoomStep));
        const zoomOutBtn = createSmallBtn("-", () => setZoom(zoomLevel - opts.zoomStep));
        const resetBtn = createSmallBtn("\u21BB", () => setZoom(1));

        zoomControls.append(zoomInBtn, zoomOutBtn, resetBtn);
        lightboxEl.appendChild(zoomControls);
      }

      // Event listeners for lightbox
      setupLightboxEvents(lightboxEl, imgContainer);

      document.body.appendChild(lightboxEl);
      document.body.style.overflow = "hidden";

      opts.onOpen?.(currentIndex);
    }

    function closeLightbox(): void {
      if (!isLightboxOpen || !lightboxEl) return;
      isLightboxOpen = false;

      lightboxEl.style.animation = "fadeOut 0.2s ease forwards";
      setTimeout(() => {
        lightboxEl?.remove();
        lightboxEl = null;
        lightboxImg = null;
        document.body.style.overflow = "";
        opts.onClose?.();
      }, 200);
    }

    function navigate(delta: number): void {
      const newIndex = currentIndex + delta;
      if (newIndex < 0 || newIndex >= images.length) return;
      currentIndex = newIndex;
      zoomLevel = 1;
      panX = 0;
      panY = 0;

      if (lightboxImg) {
        lightboxImg.style.transition = "opacity 0.15s ease";
        lightboxImg.style.opacity = "0";
        setTimeout(() => {
          if (lightboxImg) {
            lightboxImg.src = images[currentIndex]!.src;
            lightboxImg.alt = images[currentIndex]?.alt ?? "";
            lightboxImg.style.opacity = "1";
            updateLightboxUI();
          }
        }, 150);
      } else {
        updateLightboxUI();
      }

      opts.onChange?.(currentIndex);
    }

    function updateLightboxUI(): void {
      if (!lightboxEl) return;

      // Update counter
      const counter = lightboxEl.querySelector(".lightbox-counter") as HTMLElement;
      if (counter) counter.textContent = `${currentIndex + 1} / ${images.length}`;

      // Update caption
      const cap = lightboxEl.querySelector(".lightbox-caption") as HTMLElement;
      if (cap) {
        cap.textContent = images[currentIndex]?.caption ?? "";
        cap.style.display = images[currentIndex]?.caption ? "" : "none";
      }
    }

    function setZoom(level: number): void {
      if (!opts.zoomEnabled || !lightboxImg) return;
      zoomLevel = Math.max(1, Math.min(opts.maxZoom, level));
      applyTransform();
    }

    function applyTransform(): void {
      if (!lightboxImg) return;
      lightboxImg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
      const container = lightboxImg.parentElement;
      if (container) {
        (container as HTMLElement).style.cursor = zoomLevel > 1 ? "grab" : "default";
      }
    }

    function setupLightboxEvents(lb: HTMLDivElement, imgContainer: HTMLDivElement): void {
      // Keyboard
      const keyHandler = (e: KeyboardEvent) => {
        switch (e.key) {
          case "Escape": e.preventDefault(); closeLightbox(); break;
          case "ArrowLeft": e.preventDefault(); navigate(-1); break;
          case "ArrowRight": e.preventDefault(); navigate(1); break;
          case "+": case "=": e.preventDefault(); setZoom(zoomLevel + opts.zoomStep); break;
          case "-": e.preventDefault(); setZoom(zoomLevel - opts.zoomStep); break;
          case "0": e.preventDefault(); setZoom(1); break;
        }
      };
      document.addEventListener("keydown", keyHandler);
      (lb as any)._keyHandler = keyHandler;

      // Click backdrop to close
      lb.addEventListener("click", (e) => {
        if (e.target === lb) closeLightbox();
      });

      // Mouse wheel zoom
      if (opts.zoomEnabled) {
        imgContainer.addEventListener("wheel", (e: WheelEvent) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -opts.zoomStep : opts.zoomStep;
          setZoom(zoomLevel + delta);
        }, { passive: false });

        // Double-click to toggle zoom
        imgContainer.addEventListener("dblclick", () => {
          setZoom(zoomLevel > 1 ? 1 : 2.5);
        });

        // Pan when zoomed
        imgContainer.addEventListener("mousedown", (e: MouseEvent) => {
          if (zoomLevel <= 1) return;
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          dragPanStartX = panX;
          dragPanStartY = panY;
          imgContainer.style.cursor = "grabbing";
          e.preventDefault();
        });

        document.addEventListener("mousemove", (e: MouseEvent) => {
          if (!isDragging) return;
          panX = dragPanStartX + (e.clientX - dragStartX);
          panY = dragPanStartY + (e.clientY - dragStartY);
          applyTransform();
        });

        document.addEventListener("mouseup", () => {
          isDragging = false;
          if (imgContainer) imgContainer.style.cursor = zoomLevel > 1 ? "grab" : "default";
        });
      }

      // Touch swipe
      let touchStartX = 0;
      let touchEndX = 0;

      lb.addEventListener("touchstart", (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      lb.addEventListener("touchend", (e: TouchEvent) => {
        touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 60) {
          navigate(diff > 0 ? 1 : -1);
        }
      }, { passive: true });
    }

    function createArrowBtn(dir: "prev" | "next", label: string): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = label;
      btn.title = dir === "prev" ? "Previous" : "Next";
      btn.style.cssText = `
        position:absolute;top:50%;transform:translateY(-50%);
        background:rgba(255,255,255,0.15);border:none;color:#fff;
        width:44px;height:44px;border-radius:50%;font-size:24px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(4px);transition:background 0.15s;z-index:10;
      `;
      btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(255,255,255,0.25)"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "rgba(255,255,255,0.15)"; });
      return btn;
    }

    function createSmallBtn(label: string, onClick: () => void): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      btn.style.cssText = `
        background:rgba(255,255,255,0.15);border:none;color:#fff;
        width:32px;height:32px;border-radius:50%;font-size:14px;font-weight:bold;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(4px);transition:background 0.15s;
      `;
      btn.addEventListener("click", onClick);
      btn.addEventListener("mouseenter", () => { btn.style.background = "rgba(255,255,255,0.3)"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "rgba(255,255,255,0.15)"; });
      return btn;
    }

    // Add animation styles
    if (!document.getElementById("gallery-styles")) {
      const style = document.createElement("style");
      style.id = "gallery-styles";
      style.textContent = `
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes fadeOut{from{opacity:1;}to{opacity:0;}}
      `;
      document.head.appendChild(style);
    }

    // Initial render
    renderGrid();

    // Resize observer for grid recalculation
    const resizeObserver = new ResizeObserver(() => {
      if (!isLightboxOpen) renderGrid();
    });
    resizeObserver.observe(container);

    const instance: ImageGalleryInstance = {
      element: container,

      openLightbox(index: number) { openLightbox(index); },

      closeLightbox() { closeLightbox(); },

      getCurrentIndex() { return currentIndex; },

      setCurrentIndex(index: number) {
        if (isLightboxOpen) {
          currentIndex = index;
          if (lightboxImg) {
            lightboxImg.src = images[currentIndex]!.src;
            updateLightboxUI();
          }
        }
      },

      addImage(newImg: GalleryImage, index?: number) {
        if (index !== undefined) images.splice(index, 0, newImg);
        else images.push(newImg);
        renderGrid();
      },

      removeImage(key: string) {
        images = images.filter((img) => img.key !== key);
        renderGrid();
      },

      destroy() {
        destroyed = true;
        closeLightbox();
        resizeObserver.disconnect();
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create an image gallery */
export function createImageGallery(options: ImageGalleryOptions): ImageGalleryInstance {
  return new ImageGalleryManager().create(options);
}
