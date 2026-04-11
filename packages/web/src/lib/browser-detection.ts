/**
 * Browser and feature detection utilities.
 * Detects browser name/version, OS, device type, screen info,
 * feature support, user preferences, and more — all client-side only.
 */

// --- Types ---

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  engineVersion: string;
  os: string;
  osVersion: string;
  platform: string;
  mobile: boolean;
  tablet: boolean;
  touchDevice: boolean;
}

export interface ScreenInfo {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelDepth: number;
  devicePixelRatio: number;
  orientation?: "portrait" | "landscape";
  screenWidthCm: number;
  screenHeightCm: number;
}

export interface FeatureSupport {
  /** Service Worker support */
  serviceWorker: boolean;
  /** Web Workers */
  webWorker: boolean;
  /** SharedArrayBuffer / Atomics */
  sharedArrayBuffer: boolean;
  /** WebGL */
  webgl: boolean;
  /** WebGL2 */
  webgl2: boolean;
  /** WebGPU */
  webgpu: boolean;
  /** WebRTC */
  webrtc: boolean;
  /** Notification API */
  notifications: boolean;
  /** Push API */
  push: boolean;
  /** Geolocation */
  geolocation: boolean;
  /** Vibration API */
  vibration: boolean;
  /** Battery Status API */
  battery: boolean;
  /** Clipboard API (async) */
  clipboard: boolean;
  /** Fullscreen API */
  fullscreen: boolean;
  /** Pointer Events API */
  pointerEvents: boolean;
  /** Intersection Observer */
  intersectionObserver: boolean;
  /** Resize Observer */
  resizeObserver: boolean;
  /** Mutation Observer */
  mutationObserver: boolean;
  /** Performance Observer */
  performanceObserver: boolean;
  /** Passive event listeners */
  passiveEvents: boolean;
  /** CSS Grid */
  cssGrid: boolean;
  CSS Flexbox */
  cssFlexbox: boolean;
  CSS Custom Properties */
  cssCustomProperties: boolean;
  CSS Container Queries */
  containerQueries: boolean;
  View Transitions API */
  viewTransitions: boolean;
  IndexedDB */
  indexedDb: boolean;
  LocalStorage */
  localStorage: boolean;
  SessionStorage */
  sessionStorage: boolean;
  Cookies enabled */
  cookies: boolean;
}

export interface UserPreferences {
  colorScheme: "light" | "dark" | "no-preference";
  reducedMotion: "reduce" | "no-preference";
  contrast: "more" | "less" | "no-preference";
  forcedColors: "active" | "none";
}

// --- Browser Detection ---

/** Parse user agent to extract browser info */
export function detectBrowser(): BrowserInfo | null {
  if (typeof navigator === "undefined") return null;

  const ua = navigator.userAgent;
  const platform = navigator.platform ?? "";
  const uaData = (navigator as unknown as { userAgentData?: { brands?: Array<{ brand: string; version: string }>; mobile?: boolean; platform?: string } }).userAgentData;

  let name = "Unknown";
  let version = "0";
  let engine = "Unknown";
  let engineVersion = "0";

  // Try Client Hints first
  if (uaData?.brands) {
    const brands = uaData.brands.filter((b) => !b.brand.includes("Google") && !b.brand.includes("Chromium"));
    if (brands.length > 0) {
      name = brands[0]!.brand;
      version = brands[0]!.version ?? "0";
    }
  }

  // Fallback to UA parsing
  if (name === "Unknown") {
    if (/Edg\/(\d[\.\d]*)/.test(ua)) { name = "Edge"; version = RegExp.$1; }
    else if (/OPR\/(\d[\.\d]*)/.test(ua)) { name = "Opera"; version = RegExp.$1; }
    else if (/Firefox\/(\d[\.\d]*)/.test(ua)) { name = "Firefox"; version = RegExp.$1; }
    else if (/Chrome\/(\d[\.\d]*)/.test(ua)) { name = "Chrome"; version = RegExp.$1; }
    else if (/Safari\/(\d[\.\d]*)/.test(ua) && !/Chrome/.test(ua)) { name = "Safari"; version = RegExp.$1; }
    else if (/MSIE (\d)/.test(ua)) { name = "IE"; version = RegExp.$1; }
    else if (/Trident.*rv:(\d[\.\d]*)/.test(ua)) { name = "IE"; version = RegExp.$1; }
  }

  // Engine detection
  if (/AppleWebKit\/(\S+)/.test(ua)) { engine = "WebKit"; engineVersion = RegExp.$1.split(" ")[0]; }
  else if (/Gecko\/(\S+)/.test(ua)) { engine = "Gecko"; engineVersion = RegExp.$1.split(" ")[0]; }
  else if (/Presto\/(\S+)/.test(ua)) { engine = "Presto"; engineVersion = RegExp.$1.split(" ")[0]; }

  // OS detection
  let os = "Unknown", osVersion = "0";
  if (/Windows NT (\d[\.\d]*)/.test(ua)) { os = "Windows"; osVersion = RegExp.$1; }
  else if (/Mac OS X (\d[_\.\d]*)/.test(ua)) { os = "macOS"; osVersion = RegExp.$1.replace(/_/g, "."); }
  else if (/Android (\d[\.\d]*)/.test(ua)) { os = "Android"; osVersion = RegExp.$1; }
  else if (/iPhone OS (\d[_\.\d]*)/.test(ua)) { os = "iOS"; osVersion = RegExp.$1.replace(/_/g, "."); }
  else if (/Linux/.test(ua)) { os = "Linux"; }
  else if (/CrOS/.test(ua)) { os = "Chrome OS"; }
  else if (/(iPad|iPhone|iPod)/.test(ua)) { os = "iOS"; }

  return {
    name,
    version,
    engine,
    engineVersion,
    os,
    osVersion,
    platform: uaData?.platform ?? platform,
    mobile: uaData?.mobile ?? /Mobi|Android|iPhone/i.test(ua),
    tablet: /iPad|Android(?!.*Mobile)/i.test(ua),
    touchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
  };
}

/** Check if running in a specific browser */
export function isBrowser(name: string): boolean {
  const info = detectBrowser();
  return info?.name.toLowerCase() === name.toLowerCase();
}

/** Check if mobile device */
export function isMobile(): boolean {
  return detectBrowser()?.mobile ?? false;
}

/** Check if tablet device */
export function isTablet(): boolean {
  return detectBrowser()?.tablet ?? false;
}

/** Check if touch-capable device */
export function isTouchDevice(): boolean {
  return detectBrowser()?.touchDevice ?? false;
}

/** Check if running in an iframe */
export function isInIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

/** Check if running in a cross-origin iframe */
export function isCrossOriginIframe(): boolean {
  try { void window.top?.document; return false; } catch { return true; }
}

// --- Screen Info ---

/** Get detailed screen information */
export function getScreenInfo(): ScreenInfo | null {
  if (typeof window === "undefined" || typeof screen === "undefined") return null;

  const dpi = window.devicePixelRatio ?? 1;
  const cmPerInch = 2.54;

  return {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    devicePixelRatio: dpi,
    orientation: matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait",
    screenWidthCm: (screen.width / dpi) / (96 / cmPerInch),
    screenHeightCm: (screen.height / dpi) / (96 / cmPerInch),
  };
}

/** Get viewport dimensions */
export function getViewportSize(): { width: number; height: number } | null {
  if (typeof window === "undefined") return null;
  return { width: window.innerWidth, height: window.innerHeight };
}

/** Breakpoint names based on common conventions */
export type BreakpointName = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINTS: Record<BreakpointName, number> = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  2xl: 1536,
};

/** Get current breakpoint name */
export function getCurrentBreakpoint(): BreakpointName | null {
  const size = getViewportSize();
  if (!size) return null;

  const bpNames = Object.keys(BREAKPOINTS) as BreakpointName[];
  let current: BreakpointName = "xs";

  for (const name of bpNames) {
    if (size.width >= BREAKPOINTS[name]) current = name;
  }

  return current;
}

/** Check if viewport matches a breakpoint or above */
export function isAtLeast(breakpoint: BreakpointName): boolean {
  const size = getViewportSize();
  return size ? size.width >= BREAKPOINTS[breakpoint] : false;
}

/** Subscribe to viewport resize events with debounce */
export function onResize(callback: (size: { width: number; height: number }) => void, debounceMs = 150): () => void {
  if (typeof window === "undefined") return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  const handler = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      callback(getViewportSize()!);
    }, debounceMs);
  };

  window.addEventListener("resize", handler);
  // Call immediately with current size
  callback(getViewportSize()!);

  return () => {
    window.removeEventListener("resize", handler);
    if (timer) clearTimeout(timer);
  };
}

/** Subscribe to orientation change events */
export function onOrientationChange(
  callback: (orientation: "portrait" | "landscape") => void,
): () => void {
  if (typeof window === "undefined" || typeof screen === "undefined") return () => {};

  const handler = () => {
    callback(matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait");
  };

  screen.orientation?.addEventListener("change", handler);
  window.addEventListener("orientationchange", handler);

  handler();

  return () => {
    screen.orientation?.removeEventListener("change", handler);
    window.removeEventListener("orientationchange", handler);
  };
}

// --- Feature Detection ---

/** Comprehensive feature support check */
export function detectFeatures(): FeatureSupport | null {
  if (typeof window === "undefined") return null;

  return {
    serviceWorker: "serviceWorker" in navigator,
    webWorker: typeof Worker !== "undefined",
    sharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
    webgl: (() => { try { return !!document.createElement("canvas").getContext("webgl"); } catch { return false; } })(),
    webgl2: (() => { try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; } })(),
    webgpu: "gpu" in navigator,
    webrtc: "RTCPeerConnection" in window,
    notifications: "Notification" in window,
    push: "PushManager" in window,
    geolocation: "geolocation" in navigator,
    vibration: "vibrate" in navigator,
    battery: "getBattery" in navigator,
    clipboard: "clipboard" in navigator,
    fullscreen: document.fullscreenEnabled ?? false,
    pointerEvents: "PointerEvent" in window,
    intersectionObserver: "IntersectionObserver" in window,
    resizeObserver: "ResizeObserver" in window,
    mutationObserver: "MutationObserver" in window,
    performanceObserver: "PerformanceObserver" in window,
    passiveEvents: (() => { let opts = false; try { window.addEventListener("test", null, Object.defineProperty({}, "passive", { get: () => { opts = true; return true; } })); } catch {} return opts; })(),
    cssGrid: CSS.supports("display", "grid"),
    cssFlexbox: CSS.supports("display", "flex"),
    cssCustomProperties: CSS.supports("--test", "0"),
    containerQueries: CSS.supports("container-type", "inline-size"),
    viewTransitions: "startViewTransition" in document,
    indexedDb: "indexedDB" in window,
    localStorage: (() => { try { const key = "__test__"; localStorage.setItem(key, key); localStorage.removeItem(key); return true; } catch { return false; } })(),
    sessionStorage: (() => { try { const key = "__test__"; sessionStorage.setItem(key, key); sessionStorage.removeItem(key); return true; } catch { return false; } })(),
    cookies: navigator.cookieEnabled ?? false,
  };
}

/** Quick check for a single feature */
export function supports(feature: keyof FeatureSupport): boolean {
  return detectFeatures()?.[feature] ?? false;
}

// --- User Preferences ---

/** Detect user preferences via media queries */
export function detectUserPreferences(): UserPreferences | null {
  if (typeof window === "undefined") return null;

  const mq = (query: string) => matchMedia(query).matches;

  return {
    colorScheme: mq("(prefers-color-scheme: dark)") ? "dark"
      : mq("(prefers-color-scheme: light)") ? "light"
      : "no-preference",
    reducedMotion: mq("(prefers-reduced-motion: reduce)") ? "reduce" : "no-preference",
    contrast: mq("(prefers-contrast: more)") ? "more"
      : mq("(prefers-contrast: less)") ? "less"
      : "no-preference",
    forcedColors: mq("(forced-active: active)") ? "active" : "none",
  };
}

/** Subscribe to preference changes */
export function onPreferenceChange(
  preference: keyof UserPreferences,
  callback: (value: string) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const queryMap: Record<keyof UserPreferences, string> = {
    colorScheme: "(prefers-color-scheme: dark)",
    reducedMotion: "(prefers-reduced-motion: reduce)",
    contrast: "(prefers-contrast: more)",
    forcedColors: "(forced-active: active)",
  };

  const mq = matchMedia(queryMap[preference]);
  const handler = (e: MediaQueryListEvent) => callback(e.matches ? queryMap[preference].split(": ")[1].replace(")", "") : "no-preference");

  mq.addEventListener("change", handler);
  callback(mq.matches ? queryMap[preference].split(": ")[1].replace(")", "") : "no-preference");

  return () => mq.removeEventListener("change", handler);
}

// --- Device Info ---

/** Get memory info (if available) */
export function getMemoryInfo(): { deviceMemory?: number; jsHeapSizeLimit?: number } | null {
  if (typeof navigator === "undefined") return null;
  const nav = navigator as unknown as { deviceMemory?: number };
  return {
    deviceMemory: nav.deviceMemory,
    jsHeapSizeLimit: performance?.memory?.jsHeapSizeLimit,
  };
}

/** Get CPU core count (if available) */
export function getCpuCores(): number | null {
  if (typeof navigator === "undefined") return null;
  return navigator.hardwareConcurrency ?? null;
}

/** Get connection concurrency hint (if available) */
export function getMaxConnections(): number | null {
  if (typeof navigator === "undefined") return null;
  return (navigator as unknown as { connection?: { downlink?: number } }).connection?.downlink != null
    ? Math.max(4, Math.round((navigator as unknown as { connection: { downlink: number } }).connection.downlink * 5))
    : null;
}
