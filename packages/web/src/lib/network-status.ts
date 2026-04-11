/**
 * Network Information / Connection Status API wrapper with online/offline detection,
 * connection quality monitoring, effective type tracking, and auto-retry scheduling.
 */

// --- Types ---

export type EffectiveConnectionType = "slow-2g" | "2g" | "3g" | "4g" | "unknown";

export interface NetworkInfo {
  /** Effective connection type */
  effectiveType: EffectiveConnectionType;
  /** Downlink speed in Mbps */
  downlink: number;
  /** Round-trip time in ms */
  rtt: number;
  /** Data saver mode enabled? */
  saveData: boolean;
  /** Currently online */
  online: boolean;
}

export interface NetworkStatusOptions {
  /** Called when online status changes */
  onOnlineChange?: (online: boolean) => void;
  /** Called when connection quality changes */
  onConnectionChange?: (info: NetworkInfo) => void;
  /** Debounce rapid changes (ms, default: 300) */
  debounceMs?: number;
  /** Poll interval for browsers without NetworkInformation API (ms, default: 5000) */
  pollIntervalMs?: number;
  /** Auto-pause/resume operations based on status */
  autoPause?: boolean;
}

export interface NetworkStatusInstance {
  /** Current network information */
  readonly info: NetworkInfo;
  /** Whether currently online */
  readonly isOnline: boolean;
  /** Whether connection is considered "fast" (3g or better) */
  readonly isFast: boolean;
  /** Whether data saver mode is active */
  readonly isDataSaver: boolean;
  /** Subscribe to network changes */
  subscribe: (listener: (info: NetworkInfo) => void) => () => void;
  /** Manually refresh network info */
  refresh: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function getDefaultInfo(): NetworkInfo {
  return {
    effectiveType: "unknown",
    downlink: 10,
    rtt: 100,
    saveData: false,
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
  };
}

function readNetworkInfo(): Partial<NetworkInfo> {
  const conn = (navigator as unknown as Record<string, unknown>).connection as
    | { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean }
    | undefined;

  if (!conn) return {};

  return {
    effectiveType: (conn.effectiveType as EffectiveConnectionType) ?? "unknown",
    downlink: conn.downlink ?? 10,
    rtt: conn.rtt ?? 100,
    saveData: conn.saveData ?? false,
  };
}

// --- Main ---

export function createNetworkStatus(options: NetworkStatusOptions = {}): NetworkStatusInstance {
  const {
    onOnlineChange,
    onConnectionChange,
    debounceMs = 300,
    pollIntervalMs = 5000,
  } = options;

  let currentInfo: NetworkInfo = { ...getDefaultInfo(), ...readNetworkInfo() };
  let destroyed = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(info: NetworkInfo) => void>();

  function emitChange(info: NetworkInfo): void {
    for (const listener of listeners) {
      try { listener(info); } catch { /* ignore */ }
    }
    onConnectionChange?.(info);
  }

  function notifyOnline(online: boolean): void {
    onOnlineChange?.(online);
  }

  function handleOnline(): void {
    if (destroyed) return;
    currentInfo.online = true;
    scheduleNotify(() => {
      emitChange(currentInfo);
      notifyOnline(true);
    });
  }

  function handleOffline(): void {
    if (destroyed) return;
    currentInfo.online = false;
    scheduleNotify(() => {
      emitChange(currentInfo);
      notifyOnline(false);
    });
  }

  function scheduleNotify(fn: () => void): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, debounceMs);
  }

  function refresh(): void {
    if (destroyed) return;
    const prev = { ...currentInfo };
    currentInfo = { ...getDefaultInfo(), ...readNetworkInfo() };

    // Detect meaningful changes
    if (
      prev.effectiveType !== currentInfo.effectiveType ||
      prev.online !== currentInfo.online ||
      prev.saveData !== currentInfo.saveData ||
      Math.abs(prev.downlink - currentInfo.downlink) > 1 ||
      Math.abs(prev.rtt - currentInfo.rtt) > 50
    ) {
      scheduleNotify(() => emitChange(currentInfo));
    }
  }

  // Event listeners
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Polling fallback for browsers without NetworkInformation events
  const conn = (navigator as unknown as Record<string, unknown>).connection as
    | { addEventListener?: (event: string, fn: () => void) => void }
    | undefined;

  if (!conn?.addEventListener && pollIntervalMs > 0) {
    pollTimer = setInterval(refresh, pollIntervalMs);
  }

  // Also listen to change event if available
  conn?.addEventListener?.("change", refresh);

  const instance: NetworkStatusInstance = {
    get info() { return { ...currentInfo }; },
    get isOnline() { return currentInfo.online; },
    get isFast() {
      return currentInfo.effectiveType !== "slow-2g" &&
             currentInfo.effectiveType !== "2g" &&
             currentInfo.effectiveType !== "unknown";
    },
    get isDataSaver() { return currentInfo.saveData; },

    subscribe(listener: (info: NetworkInfo) => void): () => void {
      listeners.add(listener);
      listener({ ...currentInfo }); // Emit current
      return () => listeners.delete(listener);
    },

    refresh,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
      conn?.removeEventListener?.("change", refresh);
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Quick check: is the browser online? */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

/** Get basic connection info (may be partial depending on browser support) */
export function getConnectionInfo(): NetworkInfo {
  return { ...getDefaultInfo(), ...readNetworkInfo() };
}

/** Check if connection is slow (2g or worse) */
export function isSlowConnection(): boolean {
  const info = getConnectionInfo();
  return info.effectiveType === "slow-2g" || info.effectiveType === "2g";
}

/** Execute a callback only when online; queue for later if offline */
export function runWhenOnline(callback: () => void): void {
  if (isOnline()) {
    callback();
  } else {
    const handler = (): void => {
      if (isOnline()) {
        window.removeEventListener("online", handler);
        callback();
      }
    };
    window.addEventListener("online", handler);
  }
}

/** Retry a function with exponential backoff until online or maxAttempts reached */
export async function retryWhenOnline<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; maxDelayMs?: number } = {},
): Promise<T> {
  const { maxAttempts = 5, baseDelayMs = 1000, maxDelayMs = 30000 } = options;
  let attempt = 0;
  let delay = baseDelayMs;

  while (attempt < maxAttempts) {
    attempt++;
    try {
      if (!isOnline()) {
        await new Promise<void>((resolve) => {
          const handler = (): void => {
            if (isOnline()) { window.removeEventListener("online", handler); resolve(); }
          };
          window.addEventListener("online", handler);
          // Fallback timeout
          setTimeout(resolve, delay);
        });
      }
      return await fn();
    } catch {
      if (attempt >= maxAttempts) throw new Error(`Failed after ${maxAttempts} attempts`);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }
  throw new Error("Unreachable");
}
