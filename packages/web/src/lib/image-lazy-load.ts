/**
 * Image Lazy Loading: IntersectionObserver-based lazy image loader with
 * placeholder support, progressive loading, blur-up effect, error handling,
 * retry logic, preloading, and responsive srcset management.
 */

// --- Types ---

export interface LazyImageOptions {
  /** Image source URL */
  src: string;
  /** Container element or selector */
  container: HTMLElement | string;
  /** Placeholder shown while loading (URL, color, or SVG data URI) */
  placeholder?: string;
  /** Fallback image on error */
  fallback?: string;
  /** CSS class for the image element */
  className?: string;
  /** Alt text */
  alt?: string;
  /** Root margin for IntersectionObserver (default: "200px") */
  rootMargin?: string;
  /** IntersectionObserver threshold (default: 0) */
  threshold?: number;
  /** Blur-up transition duration in ms (default: 300) */
  blurDuration?: number;
  /** Fade-in duration in ms (default: 400) */
  fadeInDuration?: number;
  /** Whether to use native lazy loading as fallback (default: true) */
  useNativeLazy?: boolean;
  /** Number of retry attempts on load failure (default: 1) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Callback when image starts loading */
  onLoadStart?: () => void;
  /** Callback when image finishes loading */
  onLoad?: (img: HTMLImageElement) => void;
  /** Callback on load error */
  onError?: (error: Error) => void;
  /** Custom IntersectionObserver root element */
  root?: Element | null;
  /** Image width attribute */
  width?: number | string;
  /** Image height attribute */
  height?: number | string;
  /** Object-fit CSS value */
  objectFit?: string;
  /** Whether to decode the image asynchronously (default: true) */
  decodeAsync?: boolean;
  /** Crossorigin attribute */
  crossOrigin?: "" | "anonymous" | "use-credentials";
  /** Responsive srcset (array of {src, width} or string) */
  srcset?: Array<{ src: string; width: number }> | string;
  /** Sizes attribute for responsive images */
  sizes?: string;
}

export interface LazyImageInstance {
  /** The img DOM element */
  element: HTMLImageElement;
  /** Current loading state */
  state: "idle" | "loading" | "loaded" | "error";
  /** Manually trigger load (bypasses observer) */
  load: () => void;
  /** Unobserve and cleanup */
  destroy: () => void;
  /** Retry loading after an error */
  retry: () => void;
}

interface InternalState {
  observer: IntersectionObserver | null;
  retryCount: number;
  aborted: boolean;
}

// --- Defaults ---

const DEFAULT_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 1 1 1"><rect fill="#e5e7eb" width="1" height="1"/></svg>'
)}`;

// --- Main Factory ---

export function createLazyImage(options: LazyImageOptions): LazyImageInstance {
  const opts = {
    placeholder: DEFAULT_PLACEHOLDER,
    rootMargin: "200px",
    threshold: 0,
    blurDuration: 300,
    fadeInDuration: 400,
    useNativeLazy: true,
    maxRetries: 1,
    retryDelay: 1000,
    decodeAsync: true,
    objectFit: "cover",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)
    : options.container;

  if (!container) throw new Error("LazyImage: container not found");

  let state: "idle" | "loading" | "loaded" | "error" = "idle";
  const internal: InternalState = { observer: null, retryCount: 0, aborted: false };

  // Create image element
  const img = document.createElement("img");
  img.alt = opts.alt ?? "";
  img.className = opts.className ?? "";
  img.style.cssText = `
    display:block;width:100%;height:100%;object-fit:${opts.objectFit};
    opacity:0;transition:opacity ${opts.fadeInDuration}ms ease-out;
  `;

  if (opts.width !== undefined) img.style.width = typeof opts.width === "number" ? `${opts.width}px` : opts.width;
  if (opts.height !== undefined) img.style.height = typeof opts.height === "number" ? `${opts.height}px` : opts.height;
  if (opts.crossOrigin) img.crossOrigin = opts.crossOrigin;

  // Build srcset
  if (opts.srcset && Array.isArray(opts.srcset)) {
    img.srcset = opts.srcset.map((s) => `${s.src} ${s.width}w`).join(", ");
  } else if (typeof opts.srcset === "string") {
    img.srcset = opts.srcset;
  }
  if (opts.sizes) img.sizes = opts.sizes;

  // Show placeholder
  function showPlaceholder(): void {
    img.src = opts.placeholder!;
    img.style.opacity = "1";
    img.style.filter = `blur(8px)`;
    img.style.transition = `filter ${opts.blurDuration}ms ease-out`;
  }

  // Load the actual image
  function loadImage(): void {
    if (internal.aborted) return;
    state = "loading";
    opts.onLoadStart?.();

    // Set actual source
    img.src = opts.src;

    // Start blur-to-clear transition
    img.style.filter = `blur(8px)`;

    const onComplete = () => {
      if (internal.aborted) return;
      state = "loaded";

      // Decode async for smoother UX
      const apply = () => {
        img.style.filter = `blur(0px)`;
        img.style.opacity = "1";
        img.style.transition = `filter ${opts.blurDuration}ms ease-out, opacity ${opts.fadeInDuration}ms ease-out`;
        opts.onLoad?.(img);
      };

      if (opts.decodeAsync && img.decode) {
        img.decode().then(apply).catch(() => apply());
      } else {
        // Small delay to allow browser to start rendering
        requestAnimationFrame(() => requestAnimationFrame(apply));
      }
    };

    const onError = () => {
      if (internal.aborted) return;

      if (internal.retryCount < opts.maxRetries!) {
        internal.retryCount++;
        img.src = ""; // Cancel current load
        setTimeout(() => loadImage(), opts.retryDelay);
        return;
      }

      state = "error";
      if (opts.fallback) {
        img.src = opts.fallback;
        img.style.filter = "none";
        img.style.opacity = "1";
      }
      opts.onError?.(new Error(`Failed to load image: ${opts.src}`));
    };

    img.addEventListener("load", onComplete, { once: true });
    img.addEventListener("error", onError, { once: true });
  }

  // Set up IntersectionObserver
  function setupObserver(): void {
    if (!("IntersectionObserver" in window)) {
      // No observer support — load immediately
      loadImage();
      return;
    }

    internal.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            internal.observer?.unobserve(img);
            loadImage();
          }
        }
      },
      {
        root: opts.root ?? null,
        rootMargin: opts.rootMargin,
        threshold: opts.threshold,
      },
    );

    internal.observer.observe(img);
  }

  // Initialize
  showPlaceholder();
  container.appendChild(img);
  setupObserver();

  // Native lazy as safety net
  if (opts.useNativeLazy && "loading" in HTMLImageElement.prototype) {
    img.loading = "lazy";
  }

  const instance: LazyImageInstance = {
    get element() { return img; },
    get state() { return state; },

    load() {
      internal.observer?.unobserve(img);
      internal.observer = null;
      loadImage();
    },

    retry() {
      if (state !== "error") return;
      internal.retryCount = 0;
      loadImage();
    },

    destroy() {
      internal.aborted = true;
      internal.observer?.unobserve(img);
      internal.observer = null;
      img.removeEventListener("load", () => {});
      img.removeEventListener("error", () => {});
      img.remove();
    },
  };

  return instance;
}

// --- Batch Lazy Loader ---

export interface BatchLazyOptions {
  /** Default options applied to all images */
  defaults?: Partial<LazyImageOptions>;
  /** Root margin for all observers (default: "200px") */
  rootMargin?: string;
  /** Threshold for all observers (default: 0) */
  threshold?: number;
  /** Concurrent load limit (default: 3) */
  concurrency?: number;
}

export interface BatchLazyInstance {
  /** Add an image to the batch */
  add: (options: LazyImageOptions) => LazyImageInstance;
  /** Load all observed images immediately */
  loadAll: () => void;
  /** Destroy all instances */
  destroyAll: () => void;
  /** Get count of pending/total images */
  getStats: () => { total: number; loaded: number; error: number; pending: number };
}

export function createBatchLazyLoader(batchOpts: BatchLazyOptions = {}): BatchLazyInstance {
  const instances: LazyImageInstance[] = [];
  const concurrency = batchOpts.concurrency ?? 3;
  let loadIndex = 0;

  return {
    add(options) {
      const merged = { ...batchOpts.defaults, ...options };
      const inst = createLazyImage(merged);
      instances.push(inst);
      return inst;
    },

    loadAll() {
      for (const inst of instances) {
        if (inst.state === "idle") inst.load();
      }
    },

    destroyAll() {
      for (const inst of instances) inst.destroy();
      instances.length = 0;
    },

    getStats() {
      let loaded = 0, error = 0, pending = 0;
      for (const inst of instances) {
        switch (inst.state) {
          case "loaded": loaded++; break;
          case "error": error++; break;
          default: pending++;
        }
      }
      return { total: instances.length, loaded, error, pending };
    },
  };
}

// --- Preloader ---

/** Preload an image into browser cache (returns promise that resolves when loaded) */
export function preloadImage(src: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = crossOrigin as HTMLImageElement["crossOrigin"];
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Preload failed: ${src}`));
    img.src = src;
  });
}

/** Preload multiple images in parallel */
export function preloadImages(sources: string[], concurrency = 3): Promise<void[]> {
  const results: Promise<void>[] = [];
  let i = 0;

  function next(): void {
    while (i < sources.length && results.length < i + concurrency) {
      const idx = i++;
      results.push(
        preloadImage(sources[idx]!).then(() => {}).catch(() => {})
      );
    }
  }

  next();
  return Promise.all(results);
}
