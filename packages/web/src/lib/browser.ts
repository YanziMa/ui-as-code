/**
 * Browser detection and capability utilities.
 */

export interface BrowserInfo {
  name: string;
  version: string;
  os: string;
  isMobile: boolean;
  isTablet: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
}

/** Detect browser information from user agent */
export function detectBrowser(ua?: string): BrowserInfo {
  const userAgent = ua || (typeof navigator !== "undefined" ? navigator.userAgent : "");

  let name = "Unknown";
  let version = "";
  let os = "Unknown";

  // Browser detection
  if (/Edg\/(\d+)/.test(userAgent)) {
    name = "Edge";
    version = userAgent.match(/Edg\/(\d+)/)?.[1] || "";
  } else if (/Chrome\/(\d+)/.test(userAgent) && !/Chromium|OPR/.test(userAgent)) {
    name = "Chrome";
    version = userAgent.match(/Chrome\/(\d+)/)?.[1] || "";
  } else if (/Firefox\/(\d+)/.test(userAgent)) {
    name = "Firefox";
    version = userAgent.match(/Firefox\/(\d+)/)?.[1] || "";
  } else if (/Safari\/(\d+)/.test(userAgent) && !/Chrome/.test(userAgent)) {
    name = "Safari";
    version = userAgent.match(/Version\/(\d+)/)?.[1] || "";
  }

  // OS detection
  if (/Windows NT/.test(userAgent)) os = "Windows";
  else if (/Mac OS X/.test(userAgent)) os = "macOS";
  else if (/Linux/.test(userAgent)) os = "Linux";
  else if (/Android/.test(userAgent)) os = "Android";
  else if /(iPhone|iPad|iPod)/.test(userAgent)) os = "iOS";

  return {
    name,
    version,
    os,
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/.test(userAgent) &&
           !/(iPad|Android(?!.*Mobile))/.test(userAgent),
    isTablet: /iPad|Android(?!.*Mobile)/.test(userAgent),
    isChrome: name === "Chrome",
    isFirefox: name === "Firefox",
    isSafari: name === "Safari",
    isEdge: name === "Edge",
  };
}

/** Check if browser supports a feature */
export function supports(feature: string): boolean {
  if (typeof window === "undefined") return false;

  const checks: Record<string, () => boolean> = {
    intersectionObserver: () => "IntersectionObserver" in window,
    resizeObserver: () => "ResizeObserver" in window,
    mutationObserver: () => "MutationObserver" in window,
    clipboardApi: () => !!navigator.clipboard,
    serviceWorker: () => "serviceWorker" in navigator,
    webShare: () => "share" in navigator,
    notification: () => "Notification" in window,
    requestIdleCallback: () => "requestIdleCallback" in window,
    cssGrid: () => CSS.supports("display", "grid"),
    cssFlexbox: () => CSS.supports("display", "flex"),
    cssCustomProperties: () => CSS.supports("--test", "0"),
    cssGap: () => CSS.supports("gap", "1px"),
    esModules: () => "noModule" in HTMLScriptElement.prototype,
    fetch: () => "fetch" in window,
    webWorkers: () => typeof Worker !== "undefined",
    webSocket: () => "WebSocket" in window,
    localStorage: () => { try { return !!localStorage.getItem; } catch { return false; } },
    sessionStorage: () => { try { return !!sessionStorage.getItem; } catch { return false; } },
  };

  return checks[feature]?.() ?? false;
}

/** Get viewport dimensions */
export function getViewport(): { width: number; height: number; dpr: number } {
  if (typeof window === "undefined") return { width: 0, height: 0, dpr: 1 };
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
  };
}

/** Check if device has touch support */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints
    navigator.msMaxTouchPoints > 0
  );
}

/** Check if user prefers reduced motion */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Check if user prefers dark mode */
export function prefersDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Check color gamut */
export function getColorGamut(): "srgb" | "p3" | "rec2020" {
  if (typeof window === "undefined") return "srgb";
  if (window.matchMedia("(color-gamut: rec2020)").matches) return "rec2020";
  if (window.matchMedia("(color-gamut: p3)").matches) return "p3";
  return "srgb";
}
