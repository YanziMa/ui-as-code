/**
 * Lazy Image: Progressive image loading with blur-up placeholder,
 * Intersection Observer-based lazy loading, responsive srcset support,
 * error handling with fallback, zoom/lightbox on click, and animations.
 */

// --- Types ---

export type LazyImageFit = "cover" | "contain" | "fill" | "none" | "scale-down";
export type LazyImageLoading = "lazy" | "eager";

export interface LazyImageOptions {
  /** Image source URL */
  src: string;
  /** Low-quality placeholder (blur-up) */
  placeholder?: string;
  /** Fallback image on error */
  fallback?: string;
  /** Alt text */
  alt?: string;
  /** CSS object-fit */
  fit?: LazyImageFit;
  /** Width (px or CSS value) */
  width?: string | number;
  /** Height (px or CSS value) */
  height?: string | number;
  /** Border radius */
  borderRadius?: string | number;
  /** Loading strategy */
  loading?: LazyImageLoading;
  /** Root margin for IntersectionObserver (default: "200px") */
  rootMargin?: string;
  /** IntersectionObserver threshold (default: 0.01) */
  threshold?: number;
  /** Blur amount for placeholder (default: 20px) */
  blurAmount?: number;
  /** Fade-in duration (ms, default: 300) */
  fadeInDuration?: number;
  /** Enable click-to-zoom / lightbox */
  zoomOnClick?: boolean;
  /** Zoom max scale (default: 3) */
  maxZoom?: number;
  /** Show loading spinner? */
  showSpinner?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback when image loads */
  onLoad?: (img: HTMLImageElement) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Container element or selector (if not provided, creates wrapper) */
  container?: HTMLElement | string;
  /** Aspect ratio (e.g., "16/9", "4/3", "1") - maintains aspect ratio box */
  aspectRatio?: string;
  /** Background color while loading */
  bgColor?: string;
}

export interface LazyImageInstance {
  /** Wrapper element */
  element: HTMLDivElement;
  /** The actual <img> element */
  img: HTMLImageElement;
  /** Get current state */
  getState: () => "loading" | "loaded" | "error";
  /** Change source */
  setSrc: (src: string, placeholder?: string) => void;
  /** Force reload */
  reload: () => void;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createLazyImage(options: LazyImageOptions): LazyImageInstance {
  const opts = {
    alt: options.alt ?? "",
    fit: options.fit ?? "cover",
    loading: options.loading ?? "lazy",
    rootMargin: options.rootMargin ?? "200px",
    threshold: options.threshold ?? 0.01,
    blurAmount: options.blurAmount ?? 20,
    fadeInDuration: options.fadeInDuration ?? 300,
    zoomOnClick: options.zoomOnClick ?? false,
    maxZoom: options.maxZoom ?? 3,
    showSpinner: options.showSpinner ?? true,
    aspectRatio: options.aspectRatio ?? "",
    bgColor: options.bgColor ?? "#f3f4f6",
    className: options.className ?? "",
    ...options,
  };

  let destroyed = false;
  let currentState: "loading" | "loaded" | "error" = "loading";
  let observer: IntersectionObserver | null = null;
  let hasIntersected = false;

  // Create wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `lazy-image ${opts.className}`;
  wrapper.style.cssText = `
    position:relative;overflow:hidden;display:inline-block;
    ${opts.width ? `width:${typeof opts.width === "number" ? opts.width + "px" : opts.width};` : ""}
    ${opts.height ? `height:${typeof opts.height === "number" ? opts.height + "px" : opts.height};` : ""}
    ${opts.aspectRatio ? `aspect-ratio:${opts.aspectRatio};` : ""}
    border-radius:${typeof opts.borderRadius === "number" ? opts.borderRadius + "px" : opts.borderRadius ?? "8px"};
    background:${opts.bgColor};
  `;

  // Create image
  const img = document.createElement("img");
  img.alt = opts.alt;
  img.style.cssText = `
    width:100%;height:100%;object-fit:${opts.fit};
    opacity:0;transition:opacity ${opts.fadeInDuration}ms ease;
    display:block;
  `;
  if (opts.placeholder) {
    img.src = opts.placeholder;
    img.style.filter = `blur(${opts.blurAmount}px)`;
    img.style.transform = "scale(1.05)";
  }
  img.dataset.src = opts.src;

  // Loading spinner
  let spinnerEl: HTMLElement | null = null;
  if (opts.showSpinner) {
    spinnerEl = document.createElement("div");
    spinnerEl.className = "li-spinner";
    spinnerEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" style="animation:li-spin 0.8s linear infinite;color:#9ca3af;">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
      </svg>
    `;
    spinnerEl.style.cssText = `
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      z-index:1;pointer-events:none;transition:opacity ${opts.fadeInDuration}ms;
    `;
    wrapper.appendChild(spinnerEl);
  }

  wrapper.appendChild(img);

  // Inject to container or return standalone
  if (options.container) {
    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
    container.appendChild(wrapper);
  }

  // --- Lazy Loading via Intersection Observer ---

  function setupObserver(): void {
    if (opts.loading === "eager") {
      loadImage();
      return;
    }

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !hasIntersected) {
            hasIntersected = true;
            loadImage();
            observer?.disconnect();
            observer = null;
          }
        }
      },
      { rootMargin: opts.rootMargin, threshold: opts.threshold },
    );

    observer.observe(wrapper);
  }

  function loadImage(): void {
    currentState = "loading";

    const realImg = new Image();

    realImg.onload = () => {
      if (destroyed) return;

      // Transition from placeholder to full image
      if (opts.placeholder && img.src === opts.placeholder) {
        img.style.transition = `filter ${opts.fadeInDuration}ms ease, opacity ${opts.fadeInDuration}ms ease, transform ${opts.fadeInDuration}ms ease`;
        img.style.filter = "";
        img.style.transform = "";
      }

      img.src = opts.src;
      img.style.opacity = "1";

      // Hide spinner
      if (spinnerEl) {
        spinnerEl.style.opacity = "0";
        setTimeout(() => { spinnerEl?.remove(); spinnerEl = null; }, opts.fadeInDuration);
      }

      currentState = "loaded";
      opts.onLoad?.(img);
    };

    realImg.onerror = () => {
      if (destroyed) return;

      if (opts.fallback) {
        img.src = opts.fallback;
        img.style.opacity = "1";
        if (spinnerEl) { spinnerEl.remove(); spinnerEl = null; }
      }

      currentState = "error";
      const err = new Error(`Failed to load image: ${opts.src}`);
      opts.onError?.(err);
    };

    realImg.src = opts.src;
  }

  // --- Zoom on Click ---

  let zoomOverlay: HTMLDivElement | null = null;
  let currentZoom = 1;
  let isDragging = false;
  let lastX = 0;
  let lastY = 0;
  let translateX = 0;
  let translateY = 0;

  function openZoom(): void {
    if (!opts.zoomOnClick || currentState !== "loaded") return;

    zoomOverlay = document.createElement("div");
    zoomOverlay.className = "li-zoom-overlay";
    zoomOverlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;
      display:flex;align-items:center;justify-content:center;
      cursor:grab;opacity:0;transition:opacity 200ms ease;
    `;

    const zoomImg = img.cloneNode() as HTMLImageElement;
    zoomImg.style.cssText = `
      max-width:90vw;max-height:90vh;object-fit:contain;
      transform-origin:center center;transition:transform 150ms ease;
      cursor:grab;user-select:none;-webkit-user-drag:none;
    `;
    currentZoom = 1;
    translateX = 0;
    translateY = 0;

    zoomOverlay.appendChild(zoomImg);
    document.body.appendChild(zoomOverlay);

    requestAnimationFrame(() => { zoomOverlay!.style.opacity = "1"; });

    // Wheel zoom
    zoomOverlay.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      currentZoom = Math.max(0.5, Math.min(opts.maxZoom, currentZoom + delta));
      applyZoomTransform(zoomImg);
    }, { passive: false });

    // Drag to pan
    zoomOverlay.addEventListener("mousedown", (e: MouseEvent) => {
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      zoomOverlay.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e: MouseEvent) => {
      if (!isDragging || !zoomOverlay) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      translateX += dx;
      translateY += dy;
      lastX = e.clientX;
      lastY = e.clientY;
      applyZoomTransform(zoomImg);
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
      if (zoomOverlay) zoomOverlay.style.cursor = "grab";
    });

    // Close on click background
    zoomOverlay.addEventListener("click", (e: MouseEvent) => {
      if (e.target === zoomOverlay) closeZoom();
    });

    // Close on Escape
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeZoom();
    };
    document.addEventListener("keydown", escHandler);
    (zoomOverlay as any)._escHandler = escHandler;
  }

  function applyZoomTransform(el: HTMLImageElement): void {
    el.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
  }

  function closeZoom(): void {
    if (!zoomOverlay) return;
    const escH = (zoomOverlay as any)._escHandler;
    if (escH) document.removeEventListener("keydown", escH);

    zoomOverlay.style.opacity = "0";
    setTimeout(() => {
      zoomOverlay?.remove();
      zoomOverlay = null;
      currentZoom = 1;
      translateX = 0;
      translateY = 0;
    }, 200);
  }

  if (opts.zoomOnClick) {
    wrapper.style.cursor = "zoom-in";
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      openZoom();
    });
  }

  // --- Initialize ---

  setupObserver();

  // Inject spinner keyframes
  injectLazyImageStyles();

  // --- Instance ---

  const instance: LazyImageInstance = {
    element: wrapper,
    img,

    getState() { return currentState; },

    setSrc(src: string, placeholder?: string) {
      opts.src = src;
      if (placeholder) opts.placeholder = placeholder;
      currentState = "loading";
      img.style.opacity = "0";
      if (placeholder) {
        img.src = placeholder;
        img.style.filter = `blur(${opts.blurAmount}px)`;
      } else {
        img.removeAttribute("src");
      }
      img.dataset.src = src;
      hasIntersected = false;
      setupObserver();
    },

    reload() {
      currentState = "loading";
      img.style.opacity = "0";
      if (opts.placeholder) {
        img.src = opts.placeholder;
        img.style.filter = `blur(${opts.blurAmount}px)`;
      }
      loadImage();
    },

    destroy() {
      destroyed = true;
      closeZoom();
      observer?.disconnect();
      observer = null;
      wrapper.remove();
    },
  };

  return instance;
}

// --- Styles ---

function injectLazyImageStyles(): void {
  if (document.getElementById("li-styles")) return;
  const style = document.createElement("style");
  style.id = "li-styles";
  style.textContent = `
    @keyframes li-spin { to { transform: rotate(360deg); } }
  `;
  document.head.appendChild(style);
}
