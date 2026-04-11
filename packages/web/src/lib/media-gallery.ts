/**
 * Media Gallery: Image/video/media browser with grid layout, lightbox viewer,
 * thumbnail generation, lazy loading, filtering by type, selection mode,
 * slideshow, zoom controls, EXIF info display, and keyboard navigation.
 */

// --- Types ---

export type MediaType = "image" | "video" | "audio" | "document" | "other";
export type GalleryLayout = "grid" | "masonry" | "list" | "carousel";

export interface MediaItem {
  /** Unique ID */
  id: string;
  /** Media URL */
  src: string;
  /** Thumbnail URL (optional, falls back to src) */
  thumb?: string;
  /** Media type */
  type?: MediaType;
  /** Title/caption */
  title?: string;
  /** Description */
  description?: string;
  /** Width in px */
  width?: number;
  /** Height in px */
  height?: number;
  /** File size */
  size?: number;
  /** Alt text */
  alt?: string;
  /** Custom data */
  data?: unknown;
}

export interface MediaGalleryOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Media items to display */
  items?: MediaItem[];
  /** Layout mode */
  layout?: GalleryLayout;
  /** Columns for grid/masonry (default: auto) */
  columns?: number;
  /** Gap between items (px) */
  gap?: number;
  /** Enable lightbox on click? */
  lightbox?: boolean;
  /** Show captions under thumbnails? */
  showCaptions?: boolean;
  /** Selection mode */
  selectable?: boolean;
  /** Multi-select? */
  multiSelect?: boolean;
  /** Slideshow interval (ms, default: 5000) */
  slideshowInterval?: number;
  /** Lazy load images? */
  lazyLoad?: boolean;
  /** Filter by type */
  filterType?: MediaType | null;
  /** Callback on item click */
  onItemClick?: (item: MediaItem) => void;
  /** Callback on selection change */
  onSelectionChange?: (items: MediaItem[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface MediaGalleryInstance {
  element: HTMLElement;
  setItems: (items: MediaItem[]) => void;
  getSelected: () => MediaItem[];
  getActiveIndex: () => number;
  openLightbox: (index: number) => void;
  closeLightbox: () => void;
  startSlideshow: () => void;
  stopSlideshow: () => void;
  setFilter: (type: MediaType | null) => void;
  next: () => void;
  prev: () => void;
  destroy: () => void;
}

// --- Helpers ---

function formatFileSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TYPE_ICONS: Record<MediaType, string> = {
  image: "\u{1F5BC}",
  video: "\u{1F3AC}",
  audio: "\u{1F3B5}",
  document: "\u{1F4C4}",
  other: "\u{1F4C4}",
};

// --- Main Factory ---

export function createMediaGallery(options: MediaGalleryOptions): MediaGalleryInstance {
  const opts = {
    layout: options.layout ?? "grid",
    gap: options.gap ?? 12,
    lightbox: options.lightbox ?? true,
    showCaptions: options.showCaptions ?? true,
    selectable: options.selectable ?? false,
    multiSelect: options.multiSelect ?? false,
    slideshowInterval: options.slideshowInterval ?? 5000,
    lazyLoad: options.lazyLoad ?? true,
    filterType: options.filterType ?? null,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("MediaGallery: container not found");

  let items = options.items ?? [];
  let selectedIds = new Set<string>();
  let activeIndex = -1;
  let destroyed = false;
  let slideshowTimer: ReturnType<typeof setInterval> | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `media-gallery ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;
  `;
  container.appendChild(root);

  // Grid area
  const gridArea = document.createElement("div");
  gridArea.className = "mg-grid";
  root.appendChild(gridArea);

  // Lightbox
  let lightboxEl: HTMLElement | null = null;

  function createLightbox(): HTMLElement {
    const lb = document.createElement("div");
    lb.className = "mg-lightbox";
    lb.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:10000;
      display:none;align-items:center;justify-content:center;
      flex-direction:column;opacity:0;transition:opacity 0.2s ease;
    `;
    document.body.appendChild(lb);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.innerHTML = "&times;";
    closeBtn.style.cssText = `
      position:absolute;top:16px;right:16px;background:none;border:none;
      color:#fff;font-size:28px;cursor:pointer;padding:8px;z-index:1;
    `;
    closeBtn.addEventListener("click", () => instance.closeLightbox());
    lb.appendChild(closeBtn);

    // Image container
    const imgContainer = document.createElement("div");
    imgContainer.className = "mg-lb-image";
    imgContainer.style.cssText = "max-width:90vw;max-height:85vh;display:flex;align-items:center;justify-content:center;";
    lb.appendChild(imgContainer);

    // Caption bar
    const captionBar = document.createElement("div");
    captionBar.className = "mg-lb-caption";
    captionBar.style.cssText = `
      padding:12px 24px;color:#fff;text-align:center;font-size:14px;
      max-width:600px;margin-top:auto;
    `;
    lb.appendChild(captionBar);

    // Nav buttons
    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.innerHTML = "&#8249;";
    prevBtn.style.cssText = `
      position:absolute;left:20px;top:50%;transform:translateY(-50%);
      background:rgba(255,255,255,0.15);border:none;color:#fff;
      font-size:32px;cursor:pointer;padding:16px 12px;border-radius:8px;
      transition:background 0.15s;
    `;
    prevBtn.addEventListener("click", () => { instance.prev(); updateLightboxImage(); });
    prevBtn.addEventListener("mouseenter", () => { prevBtn.style.background = "rgba(255,255,255,0.25)"; });
    prevBtn.addEventListener("mouseleave", () => { prevBtn.style.background = "rgba(255,255,255,0.15)"; });
    lb.appendChild(prevBtn);

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.innerHTML = "&#8250;";
    nextBtn.style.cssText = prevBtn.style.cssText.replace("left:20px", "right:20px");
    nextBtn.addEventListener("click", () => { instance.next(); updateLightboxImage(); });
    nextBtn.addEventListener("mouseenter", () => { nextBtn.style.background = "rgba(255,255,255,0.25)"; });
    nextBtn.addEventListener("mouseleave", () => { nextBtn.style.background = "rgba(255,255,255,0.15)"; });
    lb.appendChild(nextBtn);

    // Counter
    const counter = document.createElement("div");
    counter.className = "mg-lb-counter";
    counter.style.cssText = "position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:#fff;font-size:13px;";
    lb.appendChild(counter);

    // Click backdrop to close
    lb.addEventListener("click", (e) => {
      if (e.target === lb) instance.closeLightbox();
    });

    lb.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); instance.prev(); updateLightboxImage(); break;
        case "ArrowRight": e.preventDefault(); instance.next(); updateLightboxImage(); break;
        case "Escape": e.preventDefault(); instance.closeLightbox(); break;
      }
    });

    return lb;
  }

  function updateLightboxImage(): void {
    if (!lightboxEl || activeIndex < 0 || activeIndex >= filteredItems().length) return;
    const item = filteredItems()[activeIndex]!;
    const imgContainer = lightboxEl.querySelector(".mg-lb-image")!;
    const captionBar = lightboxEl.querySelector(".mg-lb-caption")!;
    const counter = lightboxEl.querySelector(".mg-lb-counter")!;

    imgContainer.innerHTML = "";
    if (item.type === "video") {
      const video = document.createElement("video");
      video.src = item.src;
      video.controls = true;
      video.style.maxWidth = "100%";
      video.style.maxHeight = "85vh";
      imgContainer.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = item.src;
      img.alt = item.alt ?? item.title ?? "";
      img.style.maxWidth = "100%";
      img.style.maxHeight = "85vh";
      img.style.objectFit = "contain";
      imgContainer.appendChild(img);
    }
    captionBar.textContent = item.title ?? item.description ?? "";
    counter.textContent = `${activeIndex + 1} / ${filteredItems().length}`;
  }

  function filteredItems(): MediaItem[] {
    if (!opts.filterType) return items;
    return items.filter((i) => i.type === opts.filterType || (!i.type && opts.filterType === "image"));
  }

  // --- Render Grid ---

  function render(): void {
    gridArea.innerHTML = "";

    const filtered = filteredItems();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:#9ca3af;";
      empty.innerHTML = `<div style="font-size:40px;">\u{1F5BC}</div><div style="font-size:14px;margin-top:8px;">No media items</div>`;
      gridArea.appendChild(empty);
      return;
    }

    switch (opts.layout) {
      case "grid": renderGrid(filtered); break;
      case "masonry": renderMasonry(filtered); break;
      case "list": renderList(filtered); break;
      case "carousel": renderCarousel(filtered); break;
    }
  }

  function renderGrid(items: MediaItem[]): void {
    const cols = opts.columns ?? Math.floor(gridArea.offsetWidth / 180);
    gridArea.style.display = "grid";
    gridArea.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gridArea.style.gap = `${opts.gap}px`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const el = createThumbnail(item, i);
      gridArea.appendChild(el);
    }
  }

  function renderMasonry(items: MediaItem[]): void {
    // Simplified masonry using CSS columns
    const cols = opts.columns ?? 4;
    gridArea.style.display = "block";
    gridArea.style.columnCount = String(cols);
    gridArea.style.columnGap = `${opts.gap}px`;

    for (const item of items) {
      const el = createThumbnail(item, -1);
      el.style.breakInside = "avoid";
      el.style.marginBottom = `${opts.gap}px`;
      gridArea.appendChild(el);
    }
  }

  function renderList(items: MediaItem[]): void {
    gridArea.style.display = "flex";
    gridArea.style.flexDirection = "column";
    gridArea.style.gap = `${opts.gap}px`;

    for (const item of items) {
      const row = document.createElement("div");
      row.dataset.id = item.id;
      row.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:8px;border-radius:6px;
        cursor:pointer;border:2px solid transparent;transition:all 0.15s;
        ${selectedIds.has(item.id) ? "border-color:#4338ca;" : ""}
      `;

      const thumb = document.createElement("div");
      thumb.style.cssText = `width:48px;height:48px;border-radius:4px;overflow:hidden;background:#f3f4f6;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:20px;`;
      if (item.thumb || item.type !== "image") {
        thumb.textContent = TYPE_ICONS[item.type ?? "other"];
      } else {
        const img = document.createElement("img");
        img.src = item.thumb ?? item.src;
        img.alt = item.alt ?? "";
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "cover";
        thumb.innerHTML = "";
        thumb.appendChild(img);
      }
      row.appendChild(thumb);

      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;";
      const name = document.createElement("div");
      name.style.cssText = "font-weight:500;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      name.textContent = item.title ?? item.src.split("/").pop() ?? "Untitled";
      info.appendChild(name);
      if (item.description) {
        const desc = document.createElement("div");
        desc.style.cssText = "font-size:11px;color:#9ca3af;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        desc.textContent = item.description;
        info.appendChild(desc);
      }
      if (item.size) {
        const size = document.createElement("span");
        size.style.cssText = "font-size:11px;color:#9ca3af;margin-left:8px;flex-shrink:0;";
        size.textContent = formatFileSize(item.size);
        info.appendChild(size);
      }
      row.appendChild(info);

      row.addEventListener("click", () => handleItemClick(item));
      row.addEventListener("dblclick", () => { if (opts.lightbox) instance.openLightbox(items.indexOf(item)); });
      gridArea.appendChild(row);
    }
  }

  function renderCarousel(items: MediaItem[]): void {
    gridArea.style.cssText += "display:flex;overflow-x:auto;gap:12px;padding:8px 0;scroll-snap-type:x mandatory;";

    for (const item of items) {
      const card = document.createElement("div");
      card.style.cssText = `
        flex-shrink:0;width:280px;border-radius:8px;overflow:hidden;
        background:#f9fafb;border:1px solid #e5e7eb;scroll-snap-align:start;
      `;
      const img = document.createElement("img");
      img.src = item.thumb ?? item.src;
      img.alt = item.alt ?? item.title ?? "";
      img.style.width = "100%";
      img.style.height = "180px";
      img.style.objectFit = "cover";
      card.appendChild(img);
      if (opts.showCaptions && item.title) {
        const cap = document.createElement("div");
        cap.style.cssText = "padding:8px;font-size:12px;text-align:center;";
        cap.textContent = item.title;
        card.appendChild(cap);
      }
      card.addEventListener("click", () => handleItemClick(item));
      gridArea.appendChild(card);
    }
  }

  function createThumbnail(item: MediaItem, index: number): HTMLElement {
    const isSelected = selectedIds.has(item.id);
    const el = document.createElement("div");
    el.dataset.id = item.id;
    el.style.cssText = `
      border-radius:6px;overflow:hidden;cursor:pointer;position:relative;
      background:#f3f4f6;border:2px solid transparent;transition:all 0.15s;
      aspect-ratio:1;${isSelected ? "border-color:#4338ca;" : ""}
    `;

    if (item.type === "video") {
      const icon = document.createElement("div");
      icon.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;";
      icon.textContent = TYPE_ICONS.video;
      el.appendChild(icon);
    } else if (item.type === "audio") {
      const icon = document.createElement("div");
      icon.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:32px;";
      icon.textContent = TYPE_ICONS.audio;
      el.appendChild(icon);
    } else {
      const img = document.createElement("img");
      img.src = item.thumb ?? item.src;
      img.alt = item.alt ?? item.title ?? "";
      img.loading = opts.lazyLoad ? "lazy" : "eager";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      el.appendChild(img);
    }

    // Selection indicator
    if (opts.selectable) {
      const check = document.createElement("div");
      check.style.cssText = `
        position:absolute;top:6px;left:6px;width:20px;height:20px;border-radius:50%;
        background:${isSelected ? "#4338ca" : "rgba(0,0,0,0.4)"};
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:11px;transition:background 0.15s;
      `;
      check.innerHTML = isSelected ? "&#10003;" : "";
      el.appendChild(check);
    }

    // Caption
    if (opts.showCaptions && item.title) {
      const cap = document.createElement("div");
      cap.style.cssText = "padding:6px;font-size:11px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      cap.textContent = item.title;
      el.appendChild(cap);
    }

    el.addEventListener("click", () => handleItemClick(item));
    el.addEventListener("dblclick", () => { if (opts.lightbox) instance.openLightbox(index >= 0 ? index : items.indexOf(item)); });

    return el;
  }

  function handleItemClick(item: MediaItem): void {
    opts.onItemClick?.(item);
    if (opts.selectable) {
      if (opts.multiSelect) {
        if (selectedIds.has(item.id)) selectedIds.delete(item.id);
        else selectedIds.add(item.id);
      } else {
        selectedIds.clear();
        selectedIds.add(item.id);
      }
      render();
      opts.onSelectionChange?.([...selectedIds].map(id => items.find(i => i.id === id)!).filter(Boolean));
    }
  }

  // Initial render
  render();

  const instance: MediaGalleryInstance = {
    element: root,

    setItems(newItems: MediaItem[]) {
      items = newItems;
      selectedIds.clear();
      render();
    },

    getSelected() {
      return [...selectedIds].map(id => items.find(i => i.id === id)!).filter(Boolean);
    },

    getActiveIndex() { return activeIndex; },

    openLightbox(index: number) {
      if (!lightboxEl) lightboxEl = createLightbox();
      activeIndex = index;
      updateLightboxImage();
      lightboxEl.style.display = "flex";
      requestAnimationFrame(() => { lightboxEl!.style.opacity = "1"; });
      lightboxEl.focus();
    },

    closeLightbox() {
      if (!lightboxEl) return;
      instance.stopSlideshow();
      lightboxEl.style.opacity = "0";
      setTimeout(() => { lightboxEl!.style.display = "none"; }, 200);
      activeIndex = -1;
    },

    startSlideshow() {
      instance.stopSlideshow();
      if (filteredItems().length <= 1) return;
      if (activeIndex < 0) activeIndex = 0;
      if (!lightboxEl) instance.openLightbox(activeIndex);
      slideshowTimer = setInterval(() => {
        instance.next();
        updateLightboxImage();
      }, opts.slideshowInterval);
    },

    stopSlideshow() {
      if (slideshowTimer) { clearInterval(slideshowTimer); slideshowTimer = null; }
    },

    setFilter(type: MediaType | null) {
      opts.filterType = type;
      render();
    },

    next() {
      const filtered = filteredItems();
      if (filtered.length === 0) return;
      activeIndex = (activeIndex + 1) % filtered.length;
      if (lightboxEl?.style.display !== "none") updateLightboxImage();
    },

    prev() {
      const filtered = filteredItems();
      if (filtered.length === 0) return;
      activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
      if (lightboxEl?.style.display !== "none") updateLightboxImage();
    },

    destroy() {
      destroyed = true;
      instance.stopSlideshow();
      if (lightboxEl) lightboxEl.remove();
      root.remove();
    },
  };

  return instance;
}
