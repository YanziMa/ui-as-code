/**
 * Advanced browser detection and capability utilities.
 */

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  os: string;
  platform: string;
  mobile: boolean;
  tablet: boolean;
  touchSupport: boolean;
  webgl: boolean;
  webgpu: boolean;
  serviceWorker: boolean;
  cookiesEnabled: boolean;
  doNotTrack: boolean;
}

/** Detect browser information */
export function detectBrowser(): BrowserInfo {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const platform = typeof navigator !== "undefined" ? navigator.platform : "";

  // Browser name
  let name = "Unknown";
  if (ua.includes("Firefox/")) name = "Firefox";
  else if (ua.includes("Edg/")) name = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) name = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) name = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR/")) name = "Opera";

  // Version
  const versionMatch = ua.match(/(?:Firefox|Chrome|Safari|Edge|Opera|OPR)\/([\d.]+)/);
  const version = versionMatch?.[1] ?? "Unknown";

  // Engine
  let engine = "Unknown";
  if (ua.includes("Gecko/")) engine = "Gecko";
  else if (ua.includes("AppleWebKit/")) engine = "WebKit";
  else if (ua.includes("Presto/")) engine = "Presto";

  // OS
  let os = "Unknown";
  if (ua.includes("Windows NT 10")) os = "Windows 10/11";
  else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
  else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
  else if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iOS") || ua.includes("iPhone OS")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  // Device type
  const mobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const tablet = /iPad|Android(?!.*Mobile)/i.test(ua) || (mobile && screen.width >= 768);

  return {
    name,
    version,
    engine,
    os,
    platform,
    mobile,
    tablet,
    touchSupport: typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0),
    webgl: checkWebGL(),
    webgpu: checkWebGPU(),
    serviceWorker: "serviceWorker" in navigator,
    cookiesEnabled: navigator.cookieEnabled ?? true,
    doNotTrack: navigator.doNotTrack === "1" || navigator.globalPrivacyControl === "1",
  };
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

function checkWebGPU(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/** Check if a specific browser feature is supported */
export function supportsFeature(feature: string): boolean {
  const features: Record<string, () => boolean> = {
    "intersection-observer": () => "IntersectionObserver" in window,
    "resize-observer": () => "ResizeObserver" in window,
    "mutation-observer": () => "MutationObserver" in window,
    "clipboard-api": () => "clipboard" in navigator && "writeText" in (navigator as ClipboardNavigator).clipboard,
    "notification": () => "Notification" in window && "permission" in Notification,
    "service-worker": () => "serviceWorker" in navigator,
    "web-share": () => "share" in navigator,
    "web-bluetooth": () => "bluetooth" in navigator,
    "web-usb": () => "usb" in navigator,
    "geolocation": () => "geolocation" in navigator,
    "vibration": () => "vibrate" in navigator,
    "fullscreen": () => document.fullscreenEnabled ?? false,
    "pointer-events": () => "PointerEvent" in window,
    "passive-listeners": () => {
      let opts: AddEventListenerOptions | undefined;
      document.addEventListener("test", null, { get passive() { opts = { passive: true }; } } as unknown as EventListener);
      document.removeEventListener("test", null);
      return opts?.passive === true;
    },
    "css-grid": () => CSS.supports("display", "grid"),
    "css-flexbox": () => CSS.supports("display", "flex"),
    "css-custom-properties": () => CSS.supports("--test", "0"),
    "css-scroll-snap": () => CSS.supports("scroll-snap-type", "mandatory"),
    "css-container-queries": () => CSS.supports("container-type", "inline-size"),
    "es-modules": () => "noModule" in HTMLScriptElement.prototype,
    "import-maps": () => JSON.parse(JSON.stringify({ type: "module" })).type === "module",
    "view-transitions": () => "startViewTransition" in document,
    "offscreen-canvas": () => "OffscreenCanvas" in window,
    "webcodecs": () => "VideoEncoder" in window,
    "web-animations": () => "animate" in Element.prototype,
    "request-idle-callback": () => "requestIdleCallback" in window,
  };

  const checker = features[feature];
  return checker ? checker() : false;
}

/** Get viewport dimensions */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

/** Get device pixel ratio for retina displays */
export function getDevicePixelRatio(): number {
  return window.devicePixelRatio ?? 1;
}

/** Check if the user prefers dark mode */
export function isDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Check if the user prefers light mode */
export function isLightMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: light)").matches;
}

/** Subscribe to color scheme changes */
export function onColorSchemeChange(callback: (isDark: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const query = window.matchMedia("(prefers-color-scheme: dark)");
  callback(query.matches);

  const handler = (e: MediaQueryListEvent) => callback(e.matches);
  query.addEventListener("change", handler);

  return () => query.removeEventListener("change", handler);
}

/** Check if page is visible (not in background tab) */
export function isPageVisible(): boolean {
  return typeof document === "undefined" ? true : !document.hidden;
}

/** Subscribe to visibility changes */
export function onVisibilityChange(callback: (visible: boolean) => void): () => void {
  if (typeof document === "undefined") return () => {};

  document.addEventListener("visibilitychange", () => callback(!document.hidden));

  return () => document.removeEventListener("visibilitychange", () => callback(!document.hidden));
}

/** Get connection information (Network Information API) */
export function getConnectionInfo(): {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
} | null {
  if (typeof navigator === "undefined" || !(navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean } }).connection) {
    return null;
  }

  const conn = (navigator as Navigator & { connection: { effectiveType: string; downlink: number; rtt: number; saveData: boolean } }).connection;

  return {
    effectiveType: conn.effectiveType ?? "unknown",
    downlink: conn.downlink ?? 0,
    rtt: conn.rtt ?? 0,
    saveData: conn.saveData ?? false,
  };
}

/** Check if user is on a slow connection (2G or save-data mode) */
export function isSlowConnection(): boolean {
  const info = getConnectionInfo();
  if (!info) return false;

  return (
    info.effectiveType === "2g" ||
    info.effectiveType === "slow-2g" ||
    info.saveData
  );
}

/** Get memory info (if available) */
export function getMemoryInfo(): {
  deviceMemory: number;
  jsHeapSizeLimit: number;
} | null {
  if (typeof navigator === "undefined") return null;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    jsHeapSizeLimit?: number;
  };

  if (!nav.deviceMemory) return null;

  return {
    deviceMemory: nav.deviceMemory,
    jsHeapSizeLimit: nav.jsHeapSizeLimit ?? 0,
  };
}
