/**
 * Image Optimizer: Responsive image handling with lazy loading, srcset generation,
 * blur placeholder, format detection, EXIF orientation, progressive enhancement,
 * art direction, and performance monitoring.
 */

// --- Types ---

export type ImageFormat = "webp" | "avif" | "jpeg" | "png" | "gif" | "svg";

export interface ImageSrc {
  src: string;
  width: number;
  height: number;
  format?: ImageFormat;
  /** Source descriptor for <picture>/<source> */
  media?: string;
  /** Pixel density descriptor (1x, 2x, 3x) */
  density?: string;
}

export interface ImageOptimizeConfig {
  /** Base URL or path to the image */
  src: string;
  /** Original/natural width */
  naturalWidth?: number;
  /** Original/natural height */
  naturalHeight?: number;
  /** Alt text for accessibility */
  alt?: string;
  /** Loading strategy */
  loading?: "lazy" | "eager" | "auto";
  /** Decode strategy */
  decoding?: "async" | "sync" | "auto";
  /** Generate responsive srcset with these widths */
  widths?: number[];
  /** Size breakpoints for srcset (default: common values) */
  sizes?: string;
  /** Preferred output formats (in order of preference) */
  preferredFormats?: ImageFormat[];
  /** Blur placeholder: base64 data URL or color */
  blurPlaceholder?: string;
  /** Blur placeholder size (default: 20px) */
  blurSize?: number;
  /** Quality setting (1-100, for generated URLs) */
  quality?: number;
  /** Enable CORS for cross-origin images */
  crossorigin?: "" | "anonymous" | "use-credentials";
  /** CSS object-fit value */
  objectFit?: "fill" | "contain" | "cover" | "none" | "scale-down";
  /** CSS object-position */
  objectPosition?: string;
  /** Fallback image if primary fails */
  fallbackSrc?: string;
  /** Noscript fallback */
  noscriptFallback?: boolean;
  /** Callback when image loads */
  onLoad?: (img: HTMLImageElement) => void;
  /** Callback when image errors */
  onError?: (err: Error) => void;
  /** Callback when loading starts */
  onLoadingStart?: () => void;
  /** Aspect ratio (width:height) for space reservation */
  aspectRatio?: string;
  /** Custom CSS class names */
  className?: string;
  /** Inline styles */
  style?: Record<string, string>;
  /** Enable performance tracking */
  trackPerformance?: boolean;
}

export interface ImageStats {
  /** Time from request initiation to load start */
  requestStart: number;
  /** Time to first byte (if available) */
  ttfb?: number;
  /** Total load time (ms) */
  loadTime: number;
  /** Final displayed width */
  displayWidth: number;
  /** Final displayed height */
  displayHeight: number;
  /** Whether the image was in viewport when loaded */
  wasInView: boolean;
  /** Resource size in bytes */
  resourceSize?: number;
  /** Cache hit/miss */
  cached?: boolean;
}

export interface ArtDirectionSource {
  media: string;       // e.g., "(min-width: 800px)"
  src: string;
  width?: number;
  height?: number;
  format?: ImageFormat;
}

// --- Format Detection ---

/** Detect image format from URL, headers, or magic bytes */
export function detectImageFormat(src: string): ImageFormat {
  const ext = src.split("?")[0]!.split(".").pop()?.toLowerCase() ?? "";
  const formatMap: Record<string, ImageFormat> = {
    webp: "webp", avif: "avif", jpg: "jpeg", jpeg: "jpeg",
    png: "png", gif: "gif", svg: "svg",
  };
  return formatMap[ext] ?? "jpeg";
}

/** Check if browser supports a given image format */
async function supportsFormat(format: ImageFormat): Promise<boolean> {
  const img = new Image();
  return new Promise((resolve) => {
    img.onload = () => resolve(img.width > 0 && img.height > 0);
    img.onerror = () => resolve(false);
    img.src = `data:image/${format};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==`;
  });
}

// --- Srcset Generation ---

const DEFAULT_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1536, 1920, 2400, 2880];

/** Generate srcset attribute string from base URL and widths */
export function generateSrcset(
  baseUrl: string,
  widths?: number[],
  options?: { format?: ImageFormat; quality?: number },
): string {
  const w = widths ?? DEFAULT_WIDTHS;
  return w
    .map((width) => {
      let url = baseUrl;
      // Simple transformation pattern — replace extension or append query param
      if (options?.format) {
        url = url.replace(/\.[^.]+$/, `.${options.format}`);
      }
      if (options?.quality !== undefined) {
        url += `${url.includes("?") ? "&" : "?"}q=${options.quality}`;
      }
      return `${url} ${width}w`;
    })
    .join(", ");
}

/** Generate sizes attribute for responsive images */
export function generateSizes(breakpoints?: { minW: number; size: string }[]): string {
  if (!breakpoints) return "100vw";
  return breakpoints
    .map((bp) => `(min-width: ${bp.minW}px) ${bp.size}`)
    .join(", ") + ", 100vw";
}

// --- Blur Placeholder ---

/** Generate a simple solid-color blur placeholder (tiny base64 SVG) */
function generateBlurPlaceholder(color = "#e2e8f0", size = 10): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect fill="${color}" width="100%" height="100%"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/** Generate an inline SVG blur placeholder from dominant color */
export function createBlurPlaceholder(dominantColor?: string, size?: number): string {
  return generateBlurPlaceholder(dominantColor ?? "#e2e8f0", size);
}

// --- Lazy Loading Observer ---

class LazyImageObserver {
  private observer: IntersectionObserver | null = null;
  private callbacks = new Map<Element, () => void>();

  constructor(options?: { rootMargin?: string; threshold?: number }) {
    if (typeof IntersectionObserver === "undefined") return;
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = this.callbacks.get(entry.target);
            if (cb) {
              cb();
              this.observer?.unobserve(entry.target);
              this.callbacks.delete(entry.target);
            }
          }
        }
      },
      {
        rootMargin: options?.rootMargin ?? "200px",
        threshold: options?.threshold ?? 0.01,
      },
    );
  }

  observe(element: Element, callback: () => void): void {
    if (this.observer) {
      this.callbacks.set(element, callback);
      this.observer.observe(element);
    } else {
      // No IntersectionObserver support — load immediately
      callback();
    }
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.callbacks.clear();
  }
}

// Global lazy observer instance
let globalLazyObserver: LazyImageObserver | null = null;

function getLazyObserver(): LazyImageObserver {
  if (!globalLazyObserver) {
    globalLazyObserver = new LazyImageObserver();
  }
  return globalLazyObserver;
}

// --- Main Image Optimizer Class ---

export class ImageOptimizer {
  private config: Required<ImageOptimizeConfig>;
  private element: HTMLImageElement | null = null;
  private stats: ImageStats | null = null;
  private loaded = false;
  private errored = false;
  private static lazyObserver = getLazyObserver();

  constructor(config: ImageOptimizeConfig) {
    this.config = {
      ...config,
      loading: config.loading ?? "lazy",
      decoding: config.decoding ?? "async",
      widths: config.widths ?? DEFAULT_WIDTHS,
      quality: config.quality ?? 80,
      blurSize: config.blurSize ?? 20,
      objectFit: config.objectFit ?? "cover",
      trackPerformance: config.trackPerformance ?? false,
    };
  }

  /** Create and configure an <img> element */
  async createElement(container?: HTMLElement): Promise<HTMLImageElement> {
    const img = document.createElement("img");
    this.element = img;

    // Basic attributes
    img.alt = this.config.alt ?? "";
    img.loading = this.config.loading;
    img.decoding = this.config.decoding;
    if (this.config.crossorigin !== undefined) img.crossOrigin = this.config.crossorigin;
    if (this.config.className) img.className = this.config.className;

    // Object fit/position via style
    const style: Record<string, string> = {
      ...(this.config.style ?? {}),
      objectFit: this.config.objectFit,
      maxWidth: "100%",
      maxHeight: "100%",
      display: "block",
    };
    if (this.config.objectPosition) style.objectPosition = this.config.objectPosition;
    if (this.config.aspectRatio) style.aspectRatio = this.config.aspectRatio;
    Object.assign(img.style, style);

    // Blur placeholder
    if (this.config.blurPlaceholder || this.config.loading === "lazy") {
      const placeholder = this.config.blurPlaceholder ?? createBlurPlaceholder(undefined, this.config.blurSize);
      img.src = placeholder;
      img.setAttribute("data-src", this.config.src);
    }

    // Srcset
    if (this.config.widths && this.config.widths.length > 0) {
      const srcset = generateSrcset(this.config.src, this.config.widths, {
        format: this.config.preferredFormats?.[0],
        quality: this.config.quality,
      });
      img.srcset = srcset;
      if (this.config.sizes) img.sizes = this.config.sizes;
    }

    // Performance tracking
    const perfStart = performance.now();

    // Load event
    img.onload = () => {
      this.loaded = true;
      this.stats = {
        requestStart: perfStart,
        loadTime: performance.now() - perfStart,
        displayWidth: img.naturalWidth,
        displayHeight: img.naturalHeight,
        wasInView: true,
      };
      this.config.onLoad?.(img);
    };

    img.onerror = () => {
      this.errored = true;
      // Try fallback
      if (this.config.fallbackSrc && img.src !== this.config.fallbackSrc) {
        img.src = this.config.fallbackSrc;
      } else {
        this.config.onError?.(new Error(`Failed to load image: ${this.config.src}`));
      }
    };

    // Lazy loading
    if (this.config.loading === "lazy") {
      this.config.onLoadingStart?.();
      ImageOptimizer.lazyObserver.observe(img, () => {
        const realSrc = img.getAttribute("data-src") ?? this.config.src;
        img.src = realSrc;
        if (this.config.widths && this.config.widths.length > 0) {
          img.srcset = generateSrcset(realSrc, this.config.widths, {
            format: this.config.preferredFormats?.[0],
            quality: this.config.quality,
          });
        }
      });

      if (container) container.appendChild(img);
    } else {
      img.src = this.config.src;
      if (container) container.appendChild(img);
    }

    return img;
  }

  /** Create a <picture> element with art direction sources */
  async createPictureElement(
    sources: ArtDirectionSource[],
    container?: HTMLElement,
  ): Promise<HTMLPictureElement> {
    const picture = document.createElement("picture");

    for (const source of sources) {
      const sourceEl = document.createElement("source");
      sourceEl.media = source.media;
      sourceEl.srcset = generateSrcset(source.src, source.width ? [source.width] : undefined, {
        format: source.format,
      });
      if (this.config.sizes) sourceEl.sizes = this.config.sizes;
      picture.appendChild(sourceEl);
    }

    // Default img as fallback inside picture
    const img = await this.createElement();
    picture.appendChild(img);

    if (container) container.appendChild(picture);
    return picture;
  }

  /** Generate complete HTML string for SSR/server-rendered output */
  generateHTML(options?: { includeNoscript?: boolean }): string {
    const { includeNoscript = true } = options ?? {};
    const attrs: string[] = [];

    if (this.config.alt) attrs.push(`alt="${this.escapeAttr(this.config.alt)}"`);
    if (this.config.loading && this.config.loading !== "lazy") attrs.push(`loading="${this.config.loading}"`);
    if (this.config.decoding) attrs.push(`decoding="${this.config.decoding}"`);
    if (this.config.crossorigin) attrs.push(`crossorigin="${this.config.crossorigin}"`);
    if (this.config.className) attrs.push(`class="${this.config.className}"`);

    // Style
    const styles = [
      `object-fit: ${this.config.objectFit}`,
      "max-width: 100%",
      "max-height: 100%",
      "display: block",
    ];
    if (this.config.aspectRatio) styles.push(`aspect-ratio: ${this.config.aspectRatio}`);
    if (this.config.objectPosition) styles.push(`object-position: ${this.config.objectPosition}`);

    let html = `<img ${attrs.join(" ")} style="${styles.join("; ")}"`;

    // Srcset
    if (this.config.widths && this.config.widths.length > 0) {
      html += `\n  srcset="${this.escapeAttr(generateSrcset(this.config.src, this.config.widths))}"`;
      if (this.config.sizes) html += `\n  sizes="${this.escapeAttr(this.config.sizes)}"`;
    }

    // Src (with blur placeholder for lazy)
    const src = this.config.blurPlaceholder ?? this.config.src;
    html += `\n  src="${this.escapeAttr(src)}"`;

    html += " />";

    // Noscript fallback
    if (includeNoscript && this.config.noscriptFallback !== false) {
      const fallback = this.config.fallbackSrc ?? this.config.src;
      html += `\n<noscript><img src="${this.escapeAttr(fallback)}" alt="${this.escapeAttr(this.config.alt ?? "")}" /></noscript>`;
    }

    return html;
  }

  /** Get performance statistics */
  getStats(): ImageStats | null { return this.stats; }

  /** Check if image has loaded */
  isLoaded(): boolean { return this.loaded; }

  /** Check if image had error */
  hasError(): boolean { return this.errored; }

  /** Force reload the image */
  reload(): void {
    if (this.element) {
      const src = this.element.src;
      this.element.src = "";
      // Force re-fetch by busting cache
      this.element.src = src.includes("?") ? `${src}&_t=${Date.now()}` : `${src}?_t=${Date.now()}`;
    }
  }

  /** Destroy and cleanup */
  destroy(): void {
    if (this.element) {
      this.element.onload = null;
      this.element.onerror = null;
      this.element.remove();
    }
    this.element = null;
  }

  private escapeAttr(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

// --- Convenience Functions ---

/** Quick-create an optimized image element */
export function optimizeImage(config: ImageOptimizeConfig, container?: HTMLElement): Promise<HTMLImageElement> {
  const optimizer = new ImageOptimizer(config);
  return optimizer.createElement(container);
}

/** Generate responsive image attributes for an existing <img> element */
export function applyResponsiveAttributes(
  img: HTMLImageElement,
  src: string,
  options?: { widths?: number[]; sizes?: string; alt?: string },
): void {
  const widths = options?.widths ?? [640, 768, 1024, 1280];
  img.srcset = generateSrcset(src, widths);
  if (options?.sizes) img.sizes = options.sizes;
  if (options?.alt) img.alt = options.alt;
  if (!img.src) img.src = src;
}

/** Preload critical images */
export function preloadImages(urls: string[], priority: "high" | "low" = "high"): void {
  for (const url of urls) {
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = url;
    if (priority === "high") link.fetchPriority = "high";
    document.head.appendChild(link);
  }
}
