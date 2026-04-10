/**
 * Lazy Loading: Image/component lazy loading with Intersection Observer,
 * placeholder support, error handling, retry logic, progressive loading,
 * blur-up effect, and batch loading control.
 */

// --- Types ---

export interface LazyLoadOptions {
  /** Target element (img or container) */
  element: HTMLElement | string;
  /** Data source URL (for images) */
  src?: string;
  /** Placeholder while loading (URL, color, or element) */
  placeholder?: string | HTMLElement;
  /** Error fallback URL or element */
  errorFallback?: string | HTMLElement;
  /** Root margin for observer */
  rootMargin?: string;
  /** Threshold (0-1) */
  threshold?: number;
  /** Callback when load starts */
  onLoadStart?: () => void;
  /** Callback on load success */
  onLoad?: (el: HTMLElement) => void;
  /** Callback on load error */
  onError?: (error: Error) => void;
  /** Retry count on failure (default: 2) */
  maxRetries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
  /** Apply blur-up / fade-in effect? */
  fadeIn?: boolean;
  /** Fade-in duration (ms) */
  fadeDuration?: number;
  /** Unload when out of viewport? */
  unload?: boolean;
  /** Custom attribute to read src from */
  srcAttribute?: string;
  /** Preload nearby items? */
  preload?: boolean;
}

export interface LazyLoadInstance {
  element: HTMLElement;
  load: () => Promise<void>;
  reload: () => Promise<void>;
  destroy: () => void;
  isLoaded: () => boolean;
  isLoading: () => boolean;
}

// --- Helpers ---

function isElement(obj: unknown): obj is HTMLElement {
  return obj instanceof HTMLElement;
}

function injectFadeStyles(): void {
  if (document.getElementById("ll-styles")) return;
  const style = document.createElement("style");
  style.id = "ll-styles";
  style.textContent = `
    @keyframes ll-fadeIn{from{opacity:0;filter:blur(8px);}to{opacity:1;filter:blur(0);}}
    .ll-lazy.ll-loading{animation:ll-pulse 1.5s ease-in-out infinite;}
    @keyframes ll-pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
  `;
  document.head.appendChild(style);
}

// --- Main Factory ---

export function createLazyLoad(options: LazyLoadOptions): LazyLoadInstance {
  const opts = {
    rootMargin: options.rootMargin ?? "100px",
    threshold: options.threshold ?? 0.01,
    maxRetries: options.maxRetries ?? 2,
    retryDelay: options.retryDelay ?? 1000,
    fadeIn: options.fadeIn ?? true,
    fadeDuration: options.fadeDuration ?? 400,
    unload: options.unload ?? false,
    srcAttribute: options.srcAttribute ?? "data-src",
    ...options,
  };

  const el = typeof options.element === "string"
    ? document.querySelector<HTMLElement>(options.element)!
    : options.element;

  if (!el) throw new Error("LazyLoad: element not found");

  let loaded = false;
  let loading = false;
  let errorCount = 0;
  let destroyed = false;
  let observer: IntersectionObserver | null = null;

  // Determine if this is an <img> element
  const isImg = el.tagName.toLowerCase() === "img";

  // Get source
  function getSource(): string {
    if (opts.src) return opts.src;
    if (isImg && el.getAttribute(opts.srcAttribute)) return el.getAttribute(opts.srcAttribute)!;
    // Check background-image
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== "none") {
      const match = bg.match(/url\(["']?(.*?)["']?\)/);
      return match?.[1] ?? "";
    }
    return "";
  }

  // Set placeholder
  function applyPlaceholder(): void {
    if (!opts.placeholder) return;

    if (isElement(opts.placeholder)) {
      // It's an element - use as content replacement or overlay
      if (isImg) {
        // For img elements, we can't put children, so set a data URI or style
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = el.offsetWidth || 200;
        tempCanvas.height = el.offsetHeight || 150;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = typeof opts.placeholder === "string" ? opts.placeholder : "#f3f4f6";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        el.src = tempCanvas.toDataURL();
      } else {
        el.appendChild(opts.placeholder);
      }
    } else if (typeof opts.placeholder === "string" && opts.placeholder.startsWith("#")) {
      // Color placeholder
      if (isImg) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = el.offsetWidth || 200;
        tempCanvas.height = el.offsetHeight || 150;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = opts.placeholder;
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        el.src = tempCanvas.toDataURL();
      } else {
        el.style.backgroundColor = opts.placeholder;
      }
    } else if (typeof opts.placeholder === "string") {
      // URL placeholder
      if (isImg) {
        el.src = opts.placeholder;
      } else {
        el.style.backgroundImage = `url(${opts.placeholder})`;
        el.style.backgroundSize = "cover";
      }
    }
  }

  // Set error fallback
  function applyErrorFallback(): void {
    if (!opts.errorFallback) return;

    if (isElement(opts.errorFallback)) {
      if (isImg) {
        // Create canvas from element
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = el.offsetWidth || 200;
        tempCanvas.height = el.offsetHeight || 150;
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#fef2f2";
          ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          ctx.fillStyle = "#dc2626";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("\u274C", tempCanvas.width / 2, tempCanvas.height / 2);
        }
        el.src = tempCanvas.toDataURL();
      } else {
        el.innerHTML = "";
        el.appendChild(opts.errorFallback);
      }
    } else if (typeof opts.errorFallback === "string") {
      if (isImg) el.src = opts.errorFallback;
      else el.style.backgroundImage = `url(${opts.errorFallback})`;
    }
  }

  // Show loading state
  function showLoading(): void {
    if (!isImg) {
      el.classList.add("ll-loading");
    }
  }

  function hideLoading(): void {
    el.classList.remove("ll-loading");
  }

  // Apply fade-in effect
  function applyFadeIn(): void {
    if (!opts.fadeIn) return;
    injectFadeStyles();

    if (isImg) {
      el.style.animation = `ll-fadeIn ${opts.fadeDuration}ms ease forwards`;
      el.addEventListener("animationend", () => {
        el.style.animation = "";
        el.style.filter = "";
        el.style.opacity = "";
      }, { once: true });
    } else {
      el.style.animation = `ll-fadeIn ${opts.fadeDuration}ms ease forwards`;
      el.addEventListener("animationend", () => {
        el.style.animation = "";
        el.style.opacity = "";
      }, { once: true });
    }
  }

  // Core load function
  async function doLoad(retry = false): Promise<void> {
    if (loaded || destroyed) return;
    if (loading && !retry) return;

    const src = getSource();
    if (!src) {
      // Nothing to load
      loaded = true;
      return;
    }

    loading = true;
    showLoading();
    opts.onLoadStart?.();

    try {
      if (isImg) {
        await new Promise<void>((resolve, reject) => {
          el.onload = () => resolve();
          el.onerror = () => reject(new Error(`Failed to load image: ${src}`));
          el.src = src;
        });
      } else {
        // Background image
        el.style.backgroundImage = `url(${src})`;
        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error(`Failed to load bg image: ${src}`));
          img.src = src;
        });
      }

      loaded = true;
      hideLoading();
      applyFadeIn();
      opts.onLoad?.(el);
      errorCount = 0;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (errorCount < opts.maxRetries) {
        errorCount++;
        setTimeout(() => doLoad(true), opts.retryDelay);
        return;
      }

      hideLoading();
      applyErrorFallback();
      opts.onError?.(error);
    } finally {
      loading = false;
    }
  }

  // Setup Intersection Observer
  function setupObserver(): void {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            doLoad();
            if (opts.unload) {
              // Continue observing to detect exit
            } else {
              observer?.unobserve(entry.target);
              break;
            }
          } else if (opts.unload && loaded) {
            // Unload when out of viewport
            if (isImg) {
              el.removeAttribute("src");
              el.src = "";
            } else {
              el.style.backgroundImage = "";
            }
            loaded = false;
          }
        }
      },
      {
        rootMargin: opts.rootMargin,
        threshold: opts.threshold,
      },
    );

    observer.observe(el);
  }

  // Initial setup
  applyPlaceholder();
  setupObserver();

  const instance: LazyLoadInstance = {
    element: el,

    async load() {
      if (observer) observer.disconnect();
      await doLoad();
    },

    async reload() {
      loaded = false;
      errorCount = 0;
      applyPlaceholder();
      await instance.load();
    },

    isLoaded: () => loaded,
    isLoading: () => loading,

    destroy() {
      destroyed = true;
      observer?.disconnect();
      observer = null;
    },
  };

  return instance;
}

// --- Batch lazy loader ---

export interface BatchLazyOptions {
  /** Selector for target elements */
  selector: string;
  /** Root container (default: document) */
  root?: HTMLElement | Document;
  /** Source attribute (default: "data-src") */
  srcAttribute?: string;
  /** Placeholder color */
  placeholderColor?: string;
  /** Fade in effect */
  fadeIn?: boolean;
  /** Callback per element */
  onEachLoad?: (el: HTMLElement) => void;
}

/** Initialize lazy loading on all matching elements in the DOM */
export function initBatchLazy(options: BatchLazyOptions): () => void {
  const root = options.root ?? document;
  const els = root.querySelectorAll<HTMLElement>(options.selector);
  const instances: LazyLoadInstance[] = [];

  for (const el of els) {
    try {
      const inst = createLazyLoad({
        element: el,
        srcAttribute: options.srcAttribute ?? "data-src",
        placeholder: options.placeholderColor ?? "#f3f4f6",
        fadeIn: options.fadeIn ?? true,
        onLoad: options.onEachLoad,
      });
      instances.push(inst);
    } catch {}
  }

  return () => {
    for (const inst of instances) inst.destroy();
  };
}
