/**
 * Permission Utilities: Browser permission API wrappers, capability detection,
 * permission state management, feature availability checks, and graceful degradation.
 */

// --- Types ---

export type PermissionName =
  | "geolocation"
  | "notifications"
  | "camera"
  | "microphone"
  | "clipboard-read"
  | "clipboard-write"
  | "background-sync"
  | "persistent-storage"
  | "push"
  | "midi";

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface PermissionResult {
  name: string;
  state: PermissionState;
  supported: boolean;
}

export interface CapabilityCheck {
  name: string;
  available: boolean;
  details?: string;
}

// --- Permission Query ---

/** Check if Permissions API is available */
export function isPermissionsAPIAvailable(): boolean {
  return typeof navigator !== "undefined" &&
    "permissions" in navigator &&
    typeof (navigator as any).permissions?.query === "function";
}

/** Query a single permission state */
export async function queryPermission(name: PermissionName): Promise<PermissionResult> {
  const supported = isPermissionsAPIAvailable();

  if (!supported) {
    // Fallback: infer from related APIs
    return { name, state: inferPermissionState(name), supported: false };
  }

  try {
    const result = await (navigator as any).permissions.query({ name });
    return { name, state: result.state as PermissionState, supported: true };
  } catch {
    return { name, state: "unsupported", supported: true };
  }
}

/** Query multiple permissions at once */
export async function queryPermissions(names: PermissionName[]): Promise<PermissionResult[]> {
  return Promise.all(names.map(queryPermission));
}

/** Request a permission (for those that support prompt) */
export async function requestPermission(
  name: PermissionName,
): Promise<PermissionState> {
  switch (name) {
    case "geolocation":
      return requestGeolocation();
    case "notifications":
      return requestNotification();
    case "camera":
    case "microphone":
      return requestMediaDevices(name);
    case "clipboard-read":
    case "clipboard-write":
      return requestClipboardPermission(name);
    default: {
      const result = await queryPermission(name);
      return result.state;
    }
  }
}

async function requestGeolocation(): Promise<PermissionState> {
  if (!navigator.geolocation) return "unsupported";
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve("granted"),
      () => resolve("denied"),
      { timeout: 3000 },
    );
  });
}

async function requestNotification(): Promise<PermissionState> {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  const result = await Notification.requestPermission();
  return result as PermissionState;
}

async function requestMediaDevices(type: "camera" | "microphone"): Promise<PermissionState> {
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const constraint = type === "camera" ? { video: true } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraint);
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    return "denied";
  }
}

async function requestClipboardPermission(_name: "clipboard-read" | "clipboard-write"): Promise<PermissionState> {
  if (!navigator.clipboard) return "unsupported";
  try {
    await navigator.clipboard.writeText("");
    return "granted";
  } catch {
    return "denied";
  }
}

/** Infer permission state from related APIs when Permissions API unavailable */
function inferPermissionState(name: PermissionName): PermissionState {
  switch (name) {
    case "geolocation":
      return navigator.geolocation ? "prompt" : "unsupported";
    case "notifications":
      if (!("Notification" in window)) return "unsupported";
      return Notification.permission as PermissionState;
    case "camera":
    case "microphone":
      return navigator.mediaDevices?.getUserMedia ? "prompt" : "unsupported";
    case "clipboard-read":
    case "clipboard-write":
      return navigator.clipboard ? "prompt" : "unsupported";
    default:
      return "unsupported";
  }
}

// --- Permission Manager ---

/**
 * Manages multiple permissions with batch operations and change listeners.
 */
export class PermissionManager {
  private cache = new Map<string, PermissionResult>();
  private listeners = new Set<(results: Map<string, PermissionResult>) => void>();

  /** Check and cache a single permission */
  async check(name: PermissionName): Promise<PermissionResult> {
    const result = await queryPermission(name);
    this.cache.set(name, result);
    this.notifyListeners();
    return result;
  }

  /** Check and cache multiple permissions */
  async checkAll(names: PermissionName[]): Promise<Map<string, PermissionResult>> {
    const results = await queryPermissions(names);
    for (const r of results) this.cache.set(r.name, r);
    this.notifyListeners();
    return this.cache;
  /** Request and update a permission */
  async request(name: PermissionName): Promise<PermissionState> {
    const state = await requestPermission(name);
    this.cache.set(name, { name, state, supported: true });
    this.notifyListeners();
    return state;
  }

  /** Get cached result or undefined */
  getCached(name: string): PermissionResult | undefined {
    return this.cache.get(name);
  }

  /** Get all cached results */
  getAllCached(): Map<string, PermissionResult> {
    return new Map(this.cache);
  }

  /** Check if all given permissions are granted */
  async areGranted(names: PermissionName[]): Promise<boolean> {
    const results = await this.checkAll(names);
    for (const name of names) {
      if (this.cache.get(name)?.state !== "granted") return false;
    }
    return true;
  }

  /** Require specific permissions; throw if not granted */
  async require(...names: PermissionName[]): Promise<void> {
    for (const name of names) {
      let state = this.cache.get(name)?.state;
      if (!state || state === "prompt") {
        state = await this.request(name);
      }
      if (state !== "granted") {
        throw new PermissionDeniedError(name, state);
      }
    }
  }

  /** Listen for any permission changes */
  onChange(listener: (results: Map<string, PermissionResult>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Clear all cached data */
  clearCache(): void { this.cache.clear(); }

  private notifyListeners(): void {
    for (const l of this.listeners) {
      try { l(this.cache); } catch {}
    }
  }
}

/** Custom error for denied permissions */
export class PermissionDeniedError extends Error {
  constructor(public readonly permission: string, public readonly state: PermissionState) {
    super(`Permission "${permission}" was ${state}`);
    this.name = "PermissionDeniedError";
  }
}

// --- Capability Detection ---

/** Comprehensive browser capability check */
export function checkCapabilities(): CapabilityCheck[] {
  const checks: CapabilityCheck[] = [
    // Storage
    { name: "localStorage", available: testLocalStorage() },
    { name: "sessionStorage", available: testSessionStorage() },
    { name: "indexedDB", available: typeof indexedDB !== "undefined" },
    { name: "cookie", available: navigator.cookieEnabled },

    // Network
    { name: "online/offline", available: "onLine" in navigator },
    { name: "fetch API", available: typeof fetch !== "undefined" },
    { name: "WebSocket", available: typeof WebSocket !== "undefined" },
    { name: "EventSource (SSE)", available: typeof EventSource !== "undefined" },
    { name: "Beacon API", available: typeof navigator.sendBeacon === "function" },

    // Media
    { name: "Web Audio", available: typeof AudioContext !== "undefined" },
    { name: "MediaRecorder", available: typeof MediaRecorder !== "undefined" },
    { name: "Screen Capture", available: typeof (navigator.mediaDevices?.getDisplayMedia) === "function" },

    // Graphics
    { name: "Canvas 2D", available: testCanvas2D() },
    { name: "WebGL", available: testWebGL() },
    { name: "WebGL2", available: testWebGL2() },
    { name: "OffscreenCanvas", available: typeof OffscreenCanvas !== "undefined" },
    { name: "WebGPU", available: typeof GPU !== "undefined" },

    // Workers
    { name: "Web Worker", available: typeof Worker !== "undefined" },
    { name: "Service Worker", available: typeof (navigator.serviceWorker?.register) === "function" },
    { name: "SharedWorker", available: typeof SharedWorker !== "undefined" },

    // Performance
    { name: "requestAnimationFrame", available: typeof requestAnimationFrame === "function" },
    { name: "requestIdleCallback", available: typeof requestIdleCallback === "function" },
    { name: "Performance Observer", available: typeof PerformanceObserver !== "undefined" },
    { name: "performance.memory", available: !!(typeof performance !== "undefined" && (performance as any).memory) },

    // DOM Features
    { name: "MutationObserver", available: typeof MutationObserver !== "undefined" },
    { name: "IntersectionObserver", available: typeof IntersectionObserver !== "undefined" },
    { name: "ResizeObserver", available: typeof ResizeObserver !== "undefined" },
    { name: "Clipboard API", available: !!navigator.clipboard },
    { name: "Drag & Drop", available: "ondragstart" in document.createElement("div") },
    { name: "Fullscreen API", available: typeof document.documentElement?.requestFullscreen === "function" },
    { name: "Pointer Events", available: "onpointerdown" in window },
    { name: "Touch Events", available: "ontouchstart" in window },
    { name: "Selection API", available: typeof getSelection === "function" },
    { name: "Custom Elements", available: typeof customElements !== "undefined" },
    { name: "Shadow DOM", available: typeof Element.prototype.attachShadow === "function" },

    // Security / Crypto
    { name: "crypto.subtle (WebCrypto)", available: !!(typeof crypto !== "undefined" && crypto.subtle) },
    { name: "Secure Context", available: isSecureContext },

    // Other
    { name: "URLSearchParams", available: typeof URLSearchParams !== "undefined" },
    { name: "Blob", available: typeof Blob !== "undefined" },
    { name: "FileReader", available: typeof FileReader !== "undefined" },
    { name: "FormData", available: typeof FormData !== "undefined" },
    { name: "Visual Viewport", available: typeof visualViewport !== "undefined" },
    { name: "View Transitions", available: !!(document as any).startViewTransition },
    { name: "Share API", available: typeof navigator.share === "function" },
    { name: "Wake Lock", available: typeof (navigator.wakeLock?.request) === "function" },
    { name: "Vibration API", available: typeof navigator.vibrate === "function" },
    { name: "Battery Status", available: typeof (navigator.getBattery) === "function" },
  ];

  return checks;
}

function testLocalStorage(): boolean {
  try {
    const key = "__test__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch { return false; }
}

function testSessionStorage(): boolean {
  try {
    const key = "__test__";
    sessionStorage.setItem(key, "1");
    sessionStorage.removeItem(key);
    return true;
  } catch { return false; }
}

function testCanvas2D(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext && c.getContext("2d"));
  } catch { return false; }
}

function testWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext && c.getContext("webgl"));
  } catch { return false; }
}

function testWebGL2(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext && c.getContext("webgl2"));
  } catch { return false; }
}

/** Quick check: does the browser support a named feature? */
export function hasCapability(name: string): boolean {
  const caps = checkCapabilities();
  const found = caps.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return found?.available ?? false;
}

/** Get capabilities grouped by category */
export function getCapabilitiesByCategory(): Record<string, CapabilityCheck[]> {
  const checks = checkCapabilities();
  const categories: Record<string, CapabilityCheck[]> = {};

  for (const check of checks) {
    const cat = categorizeCapability(check.name);
    if (!categories[cat]) categories[cat] = [];
    categories[cat]!.push(check);
  }

  return categories;
}

function categorizeCapability(name: string): string {
  if (/storage|cookie|indexeddb/i.test(name)) return "Storage";
  if (/network|fetch|websocket|sse|beacon/i.test(name)) return "Network";
  if (/media|audio|screen|recorder/i.test(name)) return "Media";
  if (/canvas|webgl|gpu/i.test(name)) return "Graphics";
  if (/worker/i.test(name)) return "Workers";
  if (/performance|raf|idle/i.test(name)) return "Performance";
  if (/dom|observer|clipboard|drag|fullscreen|pointer|touch|selection|custom|shadow/i.test(name)) return "DOM";
  if (/crypto|secure/i.test(name)) return "Security";
  return "Other";
}

// --- Feature Detection Helpers ---

/** Detect if device is mobile */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/** Detect if device is touch-capable */
export function isTouchDevice(): boolean {
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

/** Detect if running in an iframe */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true; // Cross-origin iframe
  }
}

/** Detect if page is served over HTTPS or localhost */
export function isSecureContextPage(): boolean {
  return isSecureContext ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";
}

/** Get browser info object */
export function getBrowserInfo(): {
  name: string;
  version: string;
  engine: string;
  platform: string;
  mobile: boolean;
} {
  const ua = navigator.userAgent;
  let name = "Unknown";
  let version = "";
  let engine = "Unknown";

  if (/Firefox\//i.test(ua)) {
    name = "Firefox";
    version = ua.match(/Firefox\/(\d+\.?\d*)/)?.[1] ?? "";
    engine = "Gecko";
  } else if (/Edg\//i.test(ua)) {
    name = "Edge";
    version = ua.match(/Edg\/(\d+\.?\d*)/)?.[1] ?? "";
    engine = "Blink";
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) {
    name = "Chrome";
    version = ua.match(/Chrome\/(\d+\.?\d*)/)?.[1] ?? "";
    engine = "Blink";
  } else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) {
    name = "Safari";
    version = ua.match(/Version\/(\d+\.?\d*)/)?.[1] ?? "";
    engine = "WebKit";
  } else if (/MSIE|Trident/i.test(ua)) {
    name = "IE";
    version = ua.match(/(?:MSIE|rv)(\d+\.?\d*)/)?.[1] ?? "";
    engine = "Trident";
  }

  return {
    name,
    version,
    engine,
    platform: navigator.platform ?? "Unknown",
    mobile: isMobile(),
  };
}

/** Detect dark mode preference */
export function prefersDarkMode(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Detect reduced motion preference */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Detect high contrast preference */
export function prefersHighContrast(): boolean {
  return window.matchMedia("(prefers-contrast: more)").matches;
}

/** Watch for media query changes (prefers-color-scheme, etc.) */
export function watchMediaPreference(
  query: string,
  onChange: (matches: boolean) => void,
): () => void {
  const mql = window.matchMedia(query);
  const handler = (e: MediaQueryListEvent) => onChange(e.matches);

  mql.addEventListener("change", handler);
  onChange(mql.matches); // Initial value

  return () => mql.removeEventListener("change", handler);
}
