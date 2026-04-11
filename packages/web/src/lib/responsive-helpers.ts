/**
 * Responsive Helpers: High-level reactive utilities for building
 * responsive UIs. Includes useMedia-like hooks pattern (callback-based),
 * responsive image sources, lazy component loading by breakpoint,
 * print styles, orientation handling, and safe-area insets.
 */

// --- Types ---

export interface MediaListenerOptions {
  /** Media query string */
  query: string;
  /** Callback when match state changes */
  onChange: (matches: boolean) => void;
  /** Call callback immediately with initial state? (default: true) */
  immediate?: boolean;
}

export interface MediaQueryResult {
  /** Current match status */
  matches: boolean;
  /** The media query string */
  query: string;
  /** Unsubscribe */
  unsubscribe: () => void;
}

export interface ResponsiveImageSource {
  src: string;
  /** Minimum viewport width for this source */
  minWidth?: number;
  /** Maximum viewport width for this source */
  maxWidth?: number;
  /** Image width descriptor */
  width?: number;
  /** Pixel density descriptor (1x, 2x, 3x) */
  density?: string;
  /** MIME type */
  type?: string;
}

export interface ResponsiveImageOptions {
  /** Fallback/Default image URL */
  defaultSrc: string;
  /** Alt text */
  alt?: string;
  /** Loading strategy */
  loading?: "eager" | "lazy";
  /** Sizes attribute for srcset */
  sizes?: string;
}

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PrintOptions {
  /** Callback before printing */
  onBeforePrint?: () => void;
  /** Callback after printing */
  onAfterPrint?: () => void;
  /** Add print-specific styles? */
  injectStyles?: string;
}

// --- Media Query Listener ---

/**
 * Subscribe to a media query match change.
 * Returns an unsubscribe function.
 */
export function listenToMedia(options: MediaListenerOptions): () => void {
  if (typeof window === "undefined") return () => {};

  const mql = window.matchMedia(options.query);

  const handler = (): void => {
    options.onChange(mql.matches);
  };

  if (mql.addEventListener) {
    mql.addEventListener("change", handler);
  } else {
    mql.addListener(handler);
  }

  // Fire immediately if requested
  if (options.immediate !== false) {
    options.onChange(mql.matches);
  }

  return () => {
    if (mql.removeEventListener) {
      mql.removeEventListener("change", handler);
    } else {
      mql.removeListener(handler);
    }
  };
}

/**
 * Create a media query watcher that returns current state + unsubscribe.
 */
export function watchMedia(query: string): MediaQueryResult {
  let matches = false;
  let unsubscribed = false;

  const unsub = listenToMedia({
    query,
    immediate: true,
    onChange(m) { matches = m; },
  });

  return {
    get matches() { return matches; },
    query,
    unsubscribe() {
      if (!unsubscribed) {
        unsub();
        unsubscribed = true;
      }
    },
  };
}

// --- Common Query Shortcuts ---

/** Watch for hover capability (not touch) */
export function watchHover(): MediaQueryResult {
  return watchMedia("(hover: hover) and (pointer: fine)");
}

/** Watch for touch device */
export function watchTouch(): MediaQueryResult {
  return watchMedia("(hover: none) and (pointer: coarse)");
}

/** Watch for prefers-reduced-motion */
export function watchReducedMotion(): MediaQueryResult {
  return watchMedia("(prefers-reduced-motion: reduce)");
}

/** Watch for prefers-color-scheme dark */
export function watchDarkMode(): MediaQueryResult {
  return watchMedia("(prefers-color-scheme: dark)");
}

/** Watch for portrait orientation */
export function watchPortrait(): MediaQueryResult {
  return watchMedia("(orientation: portrait)");
}

/** Watch for landscape orientation */
export function watchLandscape(): MediaQueryResult {
  return watchMedia("(orientation: landscape)");
}

/** Watch for high-contrast mode */
export function watchHighContrast(): MediaQueryResult {
  return watchMedia("(forced-colors: active) || (-ms-high-contrast: active)");
}

/** Watch for print media */
export function watchPrint(): MediaQueryResult {
  return watchMedia("print");
}

// --- Responsive Images ---

/**
 * Build a `srcset` attribute string from responsive image sources.
 */
export function buildSrcset(sources: ResponsiveImageSource[]): string {
  return sources
    .filter((s) => s.src)
    .map((s) => {
      if (s.width) return `${s.src} ${s.width}w`;
      if (s.density) return `${s.src} ${s.density}`;
      return s.src;
    })
    .join(", ");
}

/**
 * Build a `<picture>` element's inner HTML with sources + fallback img.
 */
export function buildPictureHtml(
  sources: ResponsiveImageSource[],
  options: ResponsiveImageOptions,
): string {
  const sourceTags = sources
    .filter((s) => s.type || s.minWidth !== undefined || s.maxWidth !== undefined)
    .map((s) => {
      const attrs: string[] = [];
      if (s.type) attrs.push(`type="${s.type}"`);
      if (s.minWidth !== undefined) attrs.push(`media="(min-width: ${s.minWidth}px)"`);
      if (s.srcset) attrs.push(`srcset="${s.srcset}"`);
      else attrs.push(`srcset="${s.src}"`);
      return `  <source ${attrs.join(" ")} />`;
    })
    .join("\n");

  const imgAttrs: string[] = [
    `src="${options.defaultSrc}"`,
    ...(options.alt ? [`alt="${options.alt}"`] : []),
    ...(options.loading ? [`loading="${options.loading}"`] : []),
    ...(options.sizes ? [`sizes="${options.sizes}"`] : []),
  ];

  return `<picture>\n${sourceTags}\n  <img ${imgAttrs.join(" ")} />\n</picture>`;
}

/**
 * Pick the best image source for the current viewport.
 */
export function pickBestImageSource(
  sources: ResponsiveImageSource[],
): ResponsiveImageSource | null {
  if (sources.length === 0) return null;
  if (sources.length === 1) return sources[0]!;

  const w = typeof window !== "undefined" ? window.innerWidth : 1024;

  // Sort by minWidth descending, pick first that fits
  const sorted = [...sources].sort((a, b) => (b.minWidth ?? 0) - (a.minWidth ?? 0));
  for (const s of sorted) {
    if (s.minWidth === undefined || w >= s.minWidth) {
      if (s.maxWidth === undefined || w <= s.maxWidth) {
        return s;
      }
    }
  }

  // Fallback: first source without constraints
  return sources.find((s) => s.minWidth === undefined && s.maxWidth === undefined) ?? sources[0]!;
}

// --- Safe Area Insets ---

/**
 * Get safe area insets (for notch devices like iPhone).
 * Returns 0 for devices without safe area support.
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === "undefined" || !window.CSS?.supports("padding-top: env(safe-area-inset-top)")) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    top: parseFloat(style.getPropertyValue("env(safe-area-inset-top)") || "0"),
    right: parseFloat(style.getPropertyValue("env(safe-area-inset-right)") || "0"),
    bottom: parseFloat(style.getPropertyValue("env(safe-area-inset-bottom)") || "0"),
    left: parseFloat(style.getPropertyValue("env(safe-area-inset-left)") || "0"),
  };
}

/**
 * Generate CSS custom properties for safe area insets.
 */
export function applySafeAreaVars(target?: HTMLElement): void {
  const el = target ?? document.documentElement;
  const insets = getSafeAreaInsets();

  el.style.setProperty("--safe-area-top", `${insets.top}px`);
  el.style.setProperty("--safe-area-right", `${insets.right}px`);
  el.style.setProperty("--safe-area-bottom", `${insets.bottom}px`);
  el.style.setProperty("--safe-area-left", `${insets.left}px`);
}

// --- Print Utilities ---

/**
 * Listen for print events (beforeprint/afterprint).
 */
export function listenForPrint(options: PrintOptions = {}): () => void {
  if (typeof window === "undefined") return () => {};

  const handleBefore = (): void => {
    options.onBeforePrint?.();
  };

  const handleAfter = (): void => {
    options.onAfterPrint?.();
  };

  window.addEventListener("beforeprint", handleBefore);
  window.addEventListener("afterprint", handleAfter);

  // Inject print styles if provided
  let styleEl: HTMLStyleElement | null = null;
  if (options.injectStyles) {
    styleEl = document.createElement("style");
    styleEl.setAttribute("media", "print");
    styleEl.textContent = options.injectStyles;
    document.head.appendChild(styleEl);
  }

  return () => {
    window.removeEventListener("beforeprint", handleBefore);
    window.removeEventListener("afterprint", handleAfter);
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
  };
}

/**
 * Generate a basic print stylesheet string.
 */
export function generatePrintStyles(options: {
  hideSelectors?: string[];
  fontSize?: string;
  lineHeight?: string;
  color?: string;
  pageMargin?: string;
} = {}): string {
  const hideParts = (options.hideSelectors ?? [
    "nav",
    "footer",
    ".no-print",
    "[role='navigation']",
    ".sidebar",
    ".ad",
  ]).join(", ");

  const rules: string[] = [];

  if (hideParts) {
    rules.push(`${hideParts} { display: none !important; }`);
  }

  rules.push(`body { font-size: ${options.fontSize ?? "12pt"}; line-height: ${options.lineHeight ?? "1.5"}; color: ${options.color ?? "#000"}; background: #fff; }`);
  rules.push(`a[href]::after { content: " (" attr(href) ")"; font-size: 90%; color: #555; }`);
  rules.push(`a[href^="#"]::after, a[href^="javascript:"]::after { content: ""; }`);
  rules.push(`img { max-width: 100% !important; page-break-inside: avoid; }`);
  rules.push(`h1, h2, h3 { page-break-after: avoid; }`);
  rules.push(`table { page-break-inside: auto; }`);
  rules.push(`tr { page-break-inside: avoid; }`);
  rules.push(`td, th { page-break-inside: avoid; }`);

  if (options.pageMargin) {
    rules.push(`@page { margin: ${options.pageMargin}; }`);
  }

  return rules.join("\n");
}

// --- Viewport Utilities ---

/**
 * Get the visual viewport dimensions (accounts for pinch-zoom on mobile).
 */
export function getVisualViewport(): { width: number; height: number; scale: number } | null {
  if (typeof window === "undefined") return null;
  const vv = window.visualViewport;
  if (!vv) return { width: window.innerWidth, height: window.innerHeight, scale: 1 };
  return {
    width: vv.width,
    height: vv.height,
    scale: vv.scale,
  };
}

/**
 * Detect if the device has a notched display (e.g., iPhone X+).
 */
export function hasDisplayNotch(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const insets = getSafeAreaInsets();
    return insets.top > 0 || insets.bottom > 0;
  } catch {
    return false;
  }
}
