/**
 * Platform/OS detection and environment utilities.
 */

// --- Types ---

export interface PlatformInfo {
  os: string;
  osVersion: string;
  architecture: string;
  deviceType: "desktop" | "mobile" | "tablet";
  isNative: boolean;
  isWebView: boolean;
  language: string;
  timezone: string;
  isOnline: boolean;
  isSecureContext: boolean;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  hardwareConcurrency: number;
  deviceMemory: number | null;
  maxTouchPoints: number;
}

export type OSType =
  | "windows"
  | "macos"
  | "linux"
  | "android"
  | "ios"
  | "chromeos"
  | "unknown";

// --- Detection ---

/** Get detailed platform information */
export function getPlatform(): PlatformInfo {
  if (typeof navigator === "undefined") {
    return {
      os: "unknown",
      osVersion: "",
      architecture: "",
      deviceType: "desktop",
      isNative: false,
      isWebView: false,
      language: "en",
      timezone: "UTC",
      isOnline: true,
      isSecureContext: false,
      cookieEnabled: false,
      doNotTrack: false,
      hardwareConcurrency: 0,
      deviceMemory: null,
      maxTouchPoints: 0,
    };
  }

  const ua = navigator.userAgent || "";
  const uaData = (navigator as any).userAgentData;
  const platform = navigator.platform || "";
  const osInfo = detectOS(ua, platform);
  const deviceType = detectDeviceType(ua, navigator.maxTouchPoints);

  return {
    os: osInfo.name,
    osVersion: osInfo.version,
    architecture: detectArchitecture(platform),
    deviceType,
    isNative: detectNative(ua),
    isWebView: detectWebView(ua),
    language: navigator.language || "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    isOnline: navigator.onLine ?? true,
    isSecureContext: typeof window !== "undefined" ? window.isSecureContext ?? false : false,
    cookieEnabled: navigator.cookieEnabled ?? false,
    doNotTrack: navigator.doNotTrack === "1" || navigator.doNotTrack === "yes",
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    // @ts-expect-error - deviceMemory not in all browsers
    deviceMemory: navigator.deviceMemory ?? null,
    maxTouchPoints: navigator.maxTouchPoints || 0,
  };
}

/** Get OS type enum */
export function getOSType(): OSType {
  const platform = getPlatform();
  return platform.os as OSType;
}

/** Check if running on mobile device */
export function isMobile(): boolean {
  return getPlatform().deviceType === "mobile";
}

/** Check if running on tablet device */
export function isTablet(): boolean {
  return getPlatform().deviceType === "tablet";
}

/** Check if running on desktop */
export function isDesktop(): boolean {
  return getPlatform().deviceType === "desktop";
}

/** Get user's language with fallbacks */
export function getUserLanguage(): string[] {
  if (typeof navigator === "undefined") return ["en"];
  return [...(navigator.languages || [navigator.language || "en"])];
}

/** Get timezone offset in minutes */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/** Get timezone name (e.g., "Asia/Shanghai") */
export function getTimezoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Check if right-to-left language */
export function isRTL(): boolean {
  if (typeof document === "undefined") return false;
  const dir = document.documentElement.dir;
  if (dir) return dir.toLowerCase() === "rtl";
  // Auto-detect from language
  const rtlLanguages = ["ar", "he", "fa", "ur"];
  return rtlLanguages.some((lang) =>
    navigator.language.startsWith(lang),
  );
}

/** Check if app is running in standalone/PWA mode */
export function isStandalone(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    (window.matchMedia?.("(display-mode: standalone)")?.matches) ||
    // @ts-expect-error - standalone mode
    navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/** Check if browser is in fullscreen mode */
export function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.fullscreenElement;
}

/** Request fullscreen for an element */
export async function requestFullscreen(el: Element): Promise<void> {
  if (el.requestFullscreen) {
    await el.requestFullscreen();
  }
}

/** Exit fullscreen */
export async function exitFullscreen(): Promise<void> {
  if (typeof document !== "undefined" && document.exitFullscreen) {
    await document.exitFullscreen();
  }
}

/** Get screen orientation info */
export function getScreenOrientation():
  | "portrait-primary"
  | "portrait-secondary"
  | "landscape-primary"
  | "landscape-secondary"
  | "none" {
  if (typeof screen === "undefined") return "none";
  // @ts-expect-error - orientation API
  const orientation = screen.orientation?.type;
  if (orientation) return orientation;
  // Fallback
  return window.innerHeight > window.innerWidth
    ? "portrait-primary"
    : "landscape-primary";
}

/** Listen for screen orientation changes */
export function onOrientationChange(callback: (orientation: string) => void): () => void {
  if (typeof screen === "undefined") return () => {};

  // @ts-expect-error - orientation API
  const handler = () => callback(getScreenOrientation());

  // @ts-expect-error - orientation change event
  screen.orientation?.addEventListener("change", handler);
  window.addEventListener("resize", handler);

  return () => {
    // @ts-expect-error - orientation change event
    screen.orientation?.removeEventListener("change", handler);
    window.removeEventListener("resize", handler);
  };
}

/** Get device pixel ratio */
export function getDevicePixelRatio(): number {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio || 1;
}

/** Listen for device pixel ratio changes (for HiDPI displays) */
export function onPixelRatioChange(callback: (dpr: number) => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const mediaQuery = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const handler = () => callback(window.devicePixelRatio || 1);

  mediaQuery.addEventListener("change", handler);
  return () => mediaQuery.removeEventListener("change", handler);
}

/** Get connection info (Network Information API) */
export function getConnectionInfo():
  | { effectiveType: string; downlink: number; rtt: number; saveData: boolean }
  | null {
  if (typeof navigator === "undefined") return null;
  // @ts-expect-error - connection API
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return null;
  return {
    effectiveType: conn.effectiveType || "4g",
    downlink: conn.downlink ?? 10,
    rtt: conn.rtt ?? 0,
    saveData: conn.saveData ?? false,
  };
}

/** Listen for connection changes */
export function onConnectionChange(
  callback: (info: NonNullable<ReturnType<typeof getConnectionInfo>>) => void,
): () => void {
  if (typeof navigator === "undefined") return () => {};
  // @ts-expect-error - connection API
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return () => {};
  const handler = () => callback(getConnectionInfo()!);
  conn.addEventListener("change", handler);
  return () => conn.removeEventListener("change", handler);
}

/** Get battery info (Battery Status API) */
export async function getBatteryInfo(): Promise<{
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
} | null> {
  if (typeof navigator === "undefined") return null;
  try {
    // @ts-expect-error - battery API
    const battery = await navigator.getBattery?.();
    if (!battery) return null;
    return {
      charging: battery.charging,
      chargingTime: battery.chargingTime,
      dischargingTime: battery.dischargingTime,
      level: battery.level,
    };
  } catch {
    return null;
  }
}

// --- Internal Helpers ---

interface OSDetectionResult {
  name: string;
  version: string;
}

function detectOS(ua: string, platform: string): OSDetectionResult {
  // Windows
  const winMatch = ua.match(/Windows NT (\d+\.?\d*)/);
  if (winMatch) {
    return { name: "Windows", version: winMatch[1] };
  }

  // macOS
  const macMatch = ua.match(/Mac OS X (\d+[._]\d+)/);
  if (macMatch) {
    return { name: "macOS", version: macMatch[1].replace("_", ".") };
  }

  // iOS
  const iosMatch = ua.match(/(iPhone|iPad).* OS (\d+[._]\d+)/);
  if (iosMatch) {
    return { name: "iOS", version: iosMatch[2].replace("_", ".") };
  }

  // Android
  const androidMatch = ua.match(/Android (\d+\.?\d*)/);
  if (androidMatch) {
    return { name: "Android", version: androidMatch[1] };
  }

  // Chrome OS
  if (/CrOS/.test(ua)) {
    return { name: "ChromeOS", version: "" };
  }

  // Linux
  if (/Linux/.test(platform) && !/Android/.test(ua)) {
    return { name: "Linux", version: "" };
  }

  return { name: "Unknown", version: "" };
}

function detectDeviceType(ua: string, maxTouchPoints: number): "desktop" | "mobile" | "tablet" {
  const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(ua);

  if (isTabletUA || (maxTouchPoints > 1 && /Macintosh/.test(ua))) {
    return "tablet";
  }
  if (isMobileUA && !isTabletUA) {
    return "mobile";
  }
  return "desktop";
}

function detectArchitecture(platform: string): string {
  if (/arm64|aarch64/i.test(platform)) return "arm64";
  if (/arm/i.test(platform)) return "arm";
  if (/x64|x86_64|win64/i.test(platform)) return "x64";
  if (/x86|i386|i686|win32/i.test(platform)) return "x86";
  return "unknown";
}

function detectNative(ua: string): boolean {
  return (
    /ReactNative|NativeScript|Cordova|PhoneGap/i.test(ua) ||
    // Electron detection
    (typeof process !== "undefined" && (process as any).versions?.electron)
  );
}

function detectWebView(ua: string): boolean {
  return /; wv\)|Version\/[\d.]+ Mobile\/|FBAN|FBAV|Instagram/i.test(ua);
}
