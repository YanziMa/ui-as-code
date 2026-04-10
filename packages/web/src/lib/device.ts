/**
 * Device detection utilities — OS, browser, screen info,
 * touch capability, device type classification, and
 * hardware capability detection.
 */

// --- Types ---

export type OSType = "windows" | "mac" | "linux" | "ios" | "android" | "chromeos" | "unknown";
export type BrowserType = "chrome" | "firefox" | "safari" | "edge" | "opera" | "ie" | "unknown";
export type DeviceType = "mobile" | "tablet" | "desktop";

export interface DeviceInfo {
  /** Device type classification */
  type: DeviceType;
  /** Operating system */
  os: OSType;
  /** Browser */
  browser: BrowserType;
  /** Browser version (major) */
  browserVersion: number;
  /** Touch-capable? */
  touch: boolean;
  /** Pixel ratio (for retina/HiDPI) */
  pixelRatio: number;
  /** Screen dimensions */
  screen: { width: number; height: number; colorDepth: number };
  /** Viewport dimensions */
  viewport: { width: number; height: number };
  /** Device memory in GB (if available) */
  deviceMemory?: number;
  /** Number of logical CPU cores (if available) */
  cpuCores?: number;
  /** Connection info (if available) */
  connection?: { effectiveType: string; downlink: number; rtt: number; saveData: boolean };
  /** User agent string */
  userAgent: string;
}

// --- Detection Functions ---

/** Detect operating system from user agent */
export function detectOS(): OSType {
  const ua = navigator.userAgent.toLowerCase();
  const plat = (navigator.platform || "").toLowerCase();

  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) return "ios";
  if (ua.includes("android")) return "android";
  if (ua.includes("cros") || ua.includes("chromeos")) return "chromeos";
  if (ua.includes("mac")) return "mac";
  if (ua.includes("win") || plat.includes("win")) return "windows";
  if (ua.includes("linux") || plat.includes "linux")) return "linux";

  return "unknown";
}

/** Detect browser from user agent */
export function detectBrowser(): { browser: BrowserType; version: number } {
  const ua = navigator.userAgent;

  // IE
  if ((document as any).documentMode) {
    return { browser: "ie", version: (document as any).documentMode };
  }

  // Edge (Chromium-based)
  if (ua.includes("Edg/")) {
    const match = ua.match(/Edg\/(\d+)/);
    return { browser: "edge", version: match ? parseInt(match[1], 10) : 0 };
  }

  // Opera
  if (ua.includes("OPR/") || ua.includes("Opera/")) {
    const match = ua.match(/(?:OPR|Opera)\/(\d+)/);
    return { browser: "opera", version: match ? parseInt(match[1], 10) : 0 };
  }

  // Chrome
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) {
    const match = ua.match(/Chrome\/(\d+)/);
    return { browser: "chrome", version: match ? parseInt(match[1], 10) : 0 };
  }

  // Safari
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) {
    const match = ua.match(/Version\/(\d+)/);
    return { browser: "safari", version: match ? parseInt(match[1], 10) : 0 };
  }

  // Firefox
  if (ua.includes("Firefox/")) {
    const match = ua.match(/Firefox\/(\d+)/);
    return { browser: "firefox", version: match ? parseInt(match[1], 10) : 0 };
  }

  return { browser: "unknown", version: 0 };
}

/** Check if device supports touch */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;

  // Modern API
  if (navigator.maxTouchPoints > 0) return true;

  // Coarser check
  if ("ontouchstart" in window) return true;

  // Fallback to user agent
  const ua = navigator.userAgent;
  return /(android|iphone|ipad|ipod|mobile)/i.test(ua);
}

/** Classify device as mobile/tablet/desktop */
export function getDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";

  const ua = navigator.userAgent;

  // Check for tablet patterns first
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";

  // Check for mobile patterns
  if (/iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";

  // Fallback to viewport width
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";

  return "desktop";
}

/** Get comprehensive device information */
export function getDeviceInfo(): DeviceInfo {
  const { browser, version } = detectBrowser();
  const nav = navigator as any;

  return {
    type: getDeviceType(),
    os: detectOS(),
    browser,
    browserVersion: version,
    touch: isTouchDevice(),
    pixelRatio: window.devicePixelRatio ?? 1,
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    deviceMemory: nav.deviceMemory,
    cpuCores: nav.hardwareConcurrency,
    connection: nav.connection
      ? {
          effectiveType: nav.connection.effectiveType ?? "",
          downlink: nav.connection.downlink ?? 0,
          rtt: nav.connection.rtt ?? 0,
          saveData: nav.connection.saveData ?? false,
        }
      : undefined,
    userAgent: navigator.userAgent,
  };
}

// --- Quick Checks ---

/** Is this an iOS device? */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.platform)
    || (navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1);
}

/** Is this an Android device? */
export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/** Is this a mobile device (phone)? */
export function isMobileDevice(): boolean {
  return getDeviceType() === "mobile";
}

/** Is this a tablet device? */
export function isTabletDevice(): boolean {
  return getDeviceType() === "tablet";
}

/** Is this a desktop device? */
export function isDesktopDevice(): boolean {
  return getDeviceType() === "desktop";
}

/** Is this a Safari browser (including iOS Safari)? */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/** Is this a Firefox browser? */
export function isFirefox(): boolean {
  return /Firefox/i.test(navigator.userAgent);
}

/** Is this a Chrome browser? */
export function isChrome(): boolean {
  return /Chrome/i.test(navigator.userAgent) && !/Edg/i.test(navigator.userAgent);
}

/** Is this an Edge browser? */
export function isEdge(): boolean {
  return /Edg/i.test(navigator.userAgent);
}

// --- Hardware Info ---

/** Get approximate device memory in GB (if available) */
export function getDeviceMemory(): number | null {
  return (navigator as any)?.deviceMemory ?? null;
}

/** Get number of CPU cores (if available) */
export function getCPUCores(): number | null {
  return (navigator as any)?.hardwareConcurrency ?? null;
}

/** Check if user has data-saver mode enabled */
export function isDataSaver(): boolean {
  const conn = (navigator as any)?.connection;
  return conn?.saveData ?? false;
}

/** Get network connection quality estimate */
export function getConnectionQuality(): "slow" | "medium" | "fast" | "unknown" {
  const conn = (navigator as any)?.connection;
  if (!conn) return "unknown";

  const type = conn.effectiveType;
  if (type === "slow-2g" || type === "2g" || type === "3g") return "slow";
  if (type === "4g") return "medium";
  if (type === "5g" || type === "6g" || conn.downlink >= 10) return "fast";

  return "unknown";
}

// --- Screen Utilities ---

/** Check if screen is HiDPI/Retina */
export function isHiDPI(): boolean {
  return (window.devicePixelRatio ?? 1) >= 2;
}

/** Get safe area insets (notch/home indicator areas on mobile) */
export function getSafeAreaInsets(): { top: number; right: number; bottom: number; left: number } {
  const style = getComputedStyle(document.documentElement);

  return {
    top: parseInt(style.getPropertyValue("env(safe-area-inset-top)") || "0", 10),
    right: parseInt(style.getPropertyValue("env(safe-area-inset-right)") || "0", 10),
    bottom: parseInt(style.getPropertyValue("env(safe-area-inset-bottom)") || "0", 10),
    left: parseInt(style.getPropertyValue("env(safe-area-inset-left)") || "0", 10),
  };
}
