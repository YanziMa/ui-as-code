/**
 * Lightbox / Image Viewer: Full-screen image gallery with zoom, pan, keyboard navigation,
 * touch gestures, captions, thumbnails strip, fullscreen mode, preloading, and accessibility.
 */

// --- Types ---

export interface LightboxImage {
  /** Image URL */
  src: string;
  /** Thumbnail URL */
  thumb?: string;
  /** Caption text */
  caption?: string;
  /** Alt text */
  alt?: string;
  /** Image title */
  title?: string;
}

export interface LightboxOptions {
  /** Images to display */
  images: LightboxImage[];
  /** Starting index (default: 0) */
  startIndex?: number;
  /** Show caption overlay */
  showCaption?: boolean;
  /** Show thumbnail strip at bottom */
  showThumbnails?: boolean;
  /** Show navigation arrows */
  showArrows?: boolean;
  /** Show counter (e.g., "3 / 10") */
  showCounter?: boolean;
  /** Enable zoom (scroll/pinch to zoom) */
  enableZoom?: boolean;
  /** Max zoom level (default: 3) */
  maxZoom?: number;
  /** Zoom step per wheel tick (default: 0.3) */
  zoomStep?: number;
  /** Enable keyboard navigation */
  keyboardNav?: boolean;
  /** Enable touch swipe */
  enableSwipe?: boolean;
  /** Enable fullscreen toggle */
  enableFullscreen?: boolean;
  /** Background color/opacity */
  backdropColor?: string;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Preload adjacent images */
  preload?: boolean;
  /** Callback on image change */
  onImageChange?: (index: number, image: LightboxImage) => void;
  /** Callback when lightbox closes */
  onClose?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface LightboxInstance {
  element: HTMLDivElement;
  open: (index?: number) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  goTo: (index: number) => void;
  getCurrentIndex: () => number;
  destroy: () => void;
}

// --- Main Class ---

export class LightboxManager {
  create(options: LightboxOptions): LightboxInstance {
    const opts = {
      startIndex: options.startIndex ?? 0,
      showCaption: options.showCaption ?? true,
      showThumbnails: options.showThumbnails ?? true,
      showArrows: options.showArrows ?? true,
      showCounter: options.showCounter ?? true,
      enableZoom: options.enableZoom ?? true,
      maxZoom: options.maxZoom ?? 3,
      zoomStep: options.zoomStep ?? 0.3,
      keyboardNav: options.keyboardNav ?? true,
      enableSwipe: options.enableSwipe ?? true,
      enableFullscreen: options.enableFullscreen ?? true,
      backdropColor: options.backdropColor ?? "rgba(0,0,0,0.85)",
      animationDuration: options.animationDuration ?? 300,
      preload: options.preload ?? true,
      ...options,
    };

    const images = [...options.images];
    let currentIndex = Math.min(opts.startIndex, Math.max(0, images.length - 1));
    let isOpen = false;
    let zoomLevel = 1;
    let panX = 0;
    let panY = 0;
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let destroyed = false;

    // Root container
    const root = document.createElement("div");
    root.className = `lightbox ${opts.className ?? ""}`;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Image viewer");
    root.style.cssText = `
      position:fixed;inset:0;z-index:20000;display:none;align-items:center;justify-content:center;
      background:${opts.backdropColor};opacity:0;transition:opacity ${opts.animationDuration}ms ease;
      font-family:-apple-system,sans-serif;
    `;
    document.body.appendChild(root);

    // Main image container
    const imgContainer = document.createElement("div");
    imgContainer.className = "lb-img-container";
    imgContainer.style.cssText = `
      position:relative;max-width:90vw;max-height:85vh;display:flex;align-items:center;justify-content:center;
      overflow:hidden;border-radius:4px;cursor:${opts.enableZoom ? "grab" : "default"};
    `;
    root.appendChild(imgContainer);

    const mainImg = document.createElement("img");
    mainImg.className = "lb-main-image";
    mainImg.alt = images[currentIndex]?.alt ?? "";
    mainImg.draggable = false;
    mainImg.style.cssText = `
      max-width:100%;max-height:85vh;object-fit:contain;transition:transform 0.15s ease;
      user-select:none;-webkit-user-drag:none;
    `;
    if (images[currentIndex]) mainImg.src = images[currentIndex].src;
    imgContainer.appendChild(mainImg);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.setAttribute("aria-label", "Close lightbox");
    closeBtn.style.cssText = `
      position:absolute;top:12px;right:12px;background:none;border:none;color:#fff;font-size:28px;
      cursor:pointer;padding:4px 8px;line-height:1;z-index:10;opacity:0.7;transition:opacity 0.15s;
    `;
    closeBtn.addEventListener("mouseenter", () => { closeBtn.style.opacity = "1"; });
    closeBtn.addEventListener("mouseleave", () => { closeBtn.style.opacity = "0.7"; });
    closeBtn.addEventListener("click", () => instance.close());
    root.appendChild(closeBtn);

    // Arrows
    let prevBtn: HTMLButtonElement | null = null;
    let nextBtn: HTMLButtonElement | null = null;
    if (opts.showArrows && images.length > 1) {
      prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.innerHTML = "&#8249;";
      prevBtn.setAttribute("aria-label", "Previous image");
      prevBtn.style.cssText = `
        position:absolute;top:50%;left:12px;transform:translateY(-50%);background:rgba(255,255,255,0.15);
        border:none;color:#fff;font-size:24px;width:40px;height:40px;border-radius:50%;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(4px);transition:background 0.15s;z-index:10;
      `;
      prevBtn.addEventListener("click", () => instance.prev());
      prevBtn.addEventListener("mouseenter", () => { prevBtn!.style.background = "rgba(255,255,255,0.25)"; });
      prevBtn.addEventListener("mouseleave", () => { prevBtn!.style.background = "rgba(255,255,255,0.15)"; });
      root.appendChild(prevBtn);

      nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.innerHTML = "&#8250;";
      nextBtn.setAttribute("aria-label", "Next image");
      nextBtn.style.cssText = `
        position:absolute;top:50%;right:12px;transform:translateY(-50%);background:rgba(255,255,255,0.15);
        border:none;color:#fff;font-size:24px;width:40px;height:40px;border-radius:50%;
        cursor:pointer;display:flex;align-items:center;justify-content:center;
        backdrop-filter:blur(4px);transition:background 0.15s;z-index:10;
      `;
      nextBtn.addEventListener("click", () => instance.next());
      nextBtn.addEventListener("mouseenter", () => { nextBtn!.style.background = "rgba(255,255,255,0.25)"; });
      nextBtn.addEventListener("mouseleave", () => { nextBtn!.style.background = "rgba(255,255,255,0.15)"; });
      root.appendChild(nextBtn);
    }

    // Counter
    let counterEl: HTMLElement | null = null;
    if (opts.showCounter) {
      counterEl = document.createElement("div");
      counterEl.className = "lb-counter";
      counterEl.style.cssText = `
        position:absolute;top:16px;left:50%;transform:translateX(-50%);color:#fff;font-size:13px;
        background:rgba(0,0,0,0.5);padding:4px 12px;border-radius:12px;z-index:10;
      `;
      updateCounter();
      root.appendChild(counterEl);
    }

    // Caption
    let captionEl: HTMLElement | null = null;
    if (opts.showCaption) {
      captionEl = document.createElement("div");
      captionEl.className = "lb-caption";
      captionEl.style.cssText = `
        position:absolute;bottom:0;left:0;right:0;padding:20px 16px 60px;text-align:center;
        background:linear-gradient(transparent, rgba(0,0,0,0.6));color:#fff;font-size:14px;
        pointer-events:none;z-index:5;
      `;
      updateCaption();
      root.appendChild(captionEl);
    }

    // Thumbnails
    let thumbStrip: HTMLElement | null = null;
    if (opts.showThumbnails && images.length > 1) {
      thumbStrip = document.createElement("div");
      thumbStrip.className = "lb-thumbnails";
      thumbStrip.style.cssText = `
        position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;gap:6px;
        padding:8px;background:linear-gradient(rgba(0,0,0,0.4), transparent);z-index:6;
      `;
      for (let i = 0; i < images.length; i++) {
        const thumb = document.createElement("button");
        thumb.type = "button";
        thumb.setAttribute("aria-label", `Go to image ${i + 1}`);
        const thumbImg = document.createElement("img");
        thumbImg.src = images[i].thumb ?? images[i].src;
        thumbImg.alt = "";
        thumbImg.style.cssText = `
          width:48px;height:36px;object-fit:cover;border-radius:3px;opacity:${i === currentIndex ? "1" : "0.5"};
          border:2px solid ${i === currentIndex ? "#fff" : "transparent"};transition:all 0.2s;
          display:block;
        `;
        thumb.appendChild(thumbImg);
        thumb.style.cssText = "background:none;border:none;cursor:pointer;padding:0;";
        thumb.addEventListener("click", () => instance.goTo(i));
        thumbStrip.appendChild(thumb);
      }
      root.appendChild(thumbStrip);
    }

    // Fullscreen button
    let fsBtn: HTMLButtonElement | null = null;
    if (opts.enableFullscreen) {
      fsBtn = document.createElement("button");
      fsBtn.type = "button";
      fsBtn.innerHTML = "\u26F6";
      fsBtn.setAttribute("aria-label", "Toggle fullscreen");
      fsBtn.style.cssText = `
        position:absolute;top:12px;right:50px;background:none;border:none;color:#fff;font-size:18px;
        cursor:pointer;padding:4px 8px;opacity:0.7;z-index:10;transition:opacity 0.15s;
      `;
      fsBtn.addEventListener("click", toggleFullscreen);
      fsBtn.addEventListener("mouseenter", () => { fsBtn!.style.opacity = "1"; });
      fsBtn.addEventListener("mouseleave", () => { fsBtn!.style.opacity = "0.7"; });
      root.appendChild(fsBtn);
    }

    // --- Internal methods ---

    function updateCounter(): void {
      if (counterEl) counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
    }

    function updateCaption(): void {
      if (!captionEl) return;
      const img = images[currentIndex];
      captionEl.innerHTML = img?.caption || img?.title || "";
      captionEl.style.display = captionEl.innerHTML ? "" : "none";
    }

    function updateThumbs(): void {
      if (!thumbStrip) return;
      const thumbs = thumbStrip.querySelectorAll<HTMLImageElement>("img");
      thumbs.forEach((t, i) => {
        t.style.opacity = i === currentIndex ? "1" : "0.5";
        t.style.borderColor = i === currentIndex ? "#fff" : "transparent";
      });
    }

    function loadImage(index: number): void {
      if (index < 0 || index >= images.length) return;
      const img = images[index];
      mainImg.src = img.src;
      mainImg.alt = img.alt ?? "";
      resetZoom();
    }

    function resetZoom(): void {
      zoomLevel = 1;
      panX = 0;
      panY = 0;
      mainImg.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
      imgContainer.style.cursor = opts.enableZoom ? "grab" : "default";
    }

    function goToImage(index: number): void {
      if (index < 0) index = images.length - 1;
      if (index >= images.length) index = 0;
      if (index === currentIndex) return;
      currentIndex = index;
      loadImage(currentIndex);
      updateCounter();
      updateCaption();
      updateThumbs();
      opts.onImageChange?.(currentIndex, images[currentIndex]!);
      preloadAdjacent();
    }

    function preloadAdjacent(): void {
      if (!opts.preload) return;
      const toPreload = [currentIndex - 1, currentIndex + 1];
      for (const idx of toPreload) {
        if (idx >= 0 && idx < images.length && images[idx]) {
          const preloadImg = new Image();
          preloadImg.src = images[idx]!.src;
        }
      }
    }

    function toggleFullscreen(): void {
      if (!document.fullscreenElement) {
        root.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.();
      }
    }

    // --- Zoom with mouse wheel ---
    if (opts.enableZoom) {
      imgContainer.addEventListener("wheel", (e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -opts.zoomStep : opts.zoomStep;
        zoomLevel = Math.max(1, Math.min(opts.maxZoom, zoomLevel + delta));
        mainImg.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
        imgContainer.style.cursor = zoomLevel > 1 ? "grab" : "default";
      }, { passive: false });

      // Pan by dragging
      imgContainer.addEventListener("mousedown", (e: MouseEvent) => {
        if (zoomLevel <= 1) return;
        isDragging = true;
        dragStart = { x: e.clientX - panX, y: e.clientY - panY };
        imgContainer.style.cursor = "grabbing";
      });

      document.addEventListener("mousemove", (e: MouseEvent) => {
        if (!isDragging) return;
        panX = e.clientX - dragStart.x;
        panY = e.clientY - dragStart.y;
        mainImg.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
      });

      document.addEventListener("mouseup", () => {
        if (isDragging) {
          isDragging = false;
          imgContainer.style.cursor = zoomLevel > 1 ? "grab" : "default";
        }
      });
    }

    // --- Touch swipe ---
    if (opts.enableSwipe) {
      let touchStartX = 0;
      let touchEndX = 0;

      imgContainer.addEventListener("touchstart", (e: TouchEvent) => {
        touchStartX = e.touches[0].clientX;
      }, { passive: true });

      imgContainer.addEventListener("touchend", (e: TouchEvent) => {
        touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) instance.next(); else instance.prev();
        }
      }, { passive: true });
    }

    // --- Keyboard navigation ---
    if (opts.keyboardNav) {
      document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (!isOpen) return;
        switch (e.key) {
          case "ArrowLeft": e.preventDefault(); instance.prev(); break;
          case "ArrowRight": e.preventDefault(); instance.next(); break;
          case "Escape": e.preventDefault(); instance.close(); break;
          case "f": case "F":
            if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleFullscreen(); }
            break;
        }
      });
    }

    // Click on image sides to navigate
    imgContainer.addEventListener("click", (e: MouseEvent) => {
      const rect = imgContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.3) instance.prev();
      else if (x > rect.width * 0.7) instance.next();
    });

    // --- Instance ---
    const instance: LightboxInstance = {
      element: root,

      open(index?: number) {
        if (destroyed || isOpen) return;
        isOpen = true;
        if (index !== undefined) currentIndex = index;
        loadImage(currentIndex);
        updateCounter();
        updateCaption();
        updateThumbs();
        root.style.display = "flex";
        requestAnimationFrame(() => { root.style.opacity = "1"; });
        document.body.style.overflow = "hidden";
        preloadAdjacent();
      },

      close() {
        if (!isOpen || destroyed) return;
        isOpen = false;
        root.style.opacity = "0";
        setTimeout(() => {
          root.style.display = "none";
          document.body.style.overflow = "";
          if (document.fullscreenElement) document.exitFullscreen?.();
        }, opts.animationDuration);
        opts.onClose?.();
      },

      next() { goToImage(currentIndex + 1); },
      prev() { goToImage(currentIndex - 1); },
      goTo: goToImage,
      getCurrentIndex: () => currentIndex,

      destroy() {
        destroyed = true;
        instance.close();
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a lightbox */
export function createLightbox(options: LightboxOptions): LightboxInstance {
  return new LightboxManager().create(options);
}
