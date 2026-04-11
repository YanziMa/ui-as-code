/**
 * Screen Wake Lock API wrapper to prevent the screen from turning off
 * during media playback, presentations, or long-running operations.
 *
 * Gracefully degrades on unsupported browsers.
 */

// --- Types ---

export interface WakeLockOptions {
  /** Called when wake lock is acquired */
  onAcquired?: () => void;
  /** Called when wake lock is released (may be involuntary) */
  onReleased?: () => void;
  /** Called when wake lock fails to acquire */
  onError?: (error: Error) => void;
  /** Auto-reacquire when page becomes visible again (default: true) */
  autoReacquire?: boolean;
  /** Log wake lock events for debugging */
  debug?: boolean;
}

export interface WakeLockInstance {
  /** Whether a wake lock is currently held */
  readonly isLocked: boolean;
  /** Whether Wake Lock API is supported */
  readonly supported: boolean;
  /** Request a wake lock */
  request: () => Promise<boolean>;
  /** Release the wake lock */
  release: () => void;
  /** Subscribe to lock state changes */
  subscribe: (listener: (locked: boolean) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Internal types ---

interface WakeLockSentinelExtended extends EventTarget {
  readonly released: boolean;
  type: "screen";
  release: () => Promise<void>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

// --- Main ---

export function createWakeLock(options: WakeLockOptions = {}): WakeLockInstance {
  const {
    onAcquired,
    onReleased,
    onError,
    autoReacquire = true,
    debug = false,
  } = options;

  let sentinel: WakeLockSentinelExtended | null = null;
  let locked = false;
  let destroyed = false;
  let visibilityHandler: (() => void) | null = null;
  const listeners = new Set<(locked: boolean) => void>();

  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  function log(msg: string): void {
    if (debug) console.log(`[wake-lock] ${msg}`);
  }

  function notify(lockedState: boolean): void {
    locked = lockedState;
    for (const listener of listeners) {
      try { listener(lockedState); } catch { /* ignore */ }
    }
  }

  async function acquire(): Promise<boolean> {
    if (destroyed || !supported) return false;

    try {
      sentinel = await navigator.wakeLock.request("screen") as WakeLockSentinelExtended;

      sentinel.addEventListener("release", () => {
        log("Wake lock released (possibly by system)");
        sentinel = null;
        notify(false);
        onReleased?.();
      });

      notify(true);
      onAcquired?.();
      log("Wake lock acquired");
      return true;
    } catch (err) {
      log(`Failed to acquire wake lock: ${err}`);
      onError?.(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }

  function handleVisibilityChange(): void {
    if (destroyed || !autoReacquire) return;
    // Wake lock is released when page becomes hidden; reacquire when visible again
    if (document.visibilityState === "visible" && !locked) {
      log("Page visible again, reacquiring wake lock...");
      acquire().catch(() => {});
    }
  }

  // Setup visibility listener for auto-reacquire
  if (autoReacquire && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    visibilityHandler = () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }

  const instance: WakeLockInstance = {
    get isLocked() { return locked; },
    get supported() { return supported; },

    request: acquire,

    release() {
      if (sentinel && !sentinel.released) {
        sentinel.release().catch(() => {});
        sentinel = null;
        notify(false);
        log("Wake lock released manually");
      }
    },

    subscribe(listener: (locked: boolean) => void): () => void {
      listeners.add(listener);
      listener(locked);
      return () => listeners.delete(listener);
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      listeners.clear();
      if (visibilityHandler) {
        visibilityHandler();
        visibilityHandler = null;
      }
      if (sentinel && !sentinel.released) {
        sentinel.release().catch(() => {});
        sentinel = null;
      }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Check if Screen Wake Lock API is supported */
export function isWakeLockSupported(): boolean {
  return typeof navigator !== "undefined" && "wakeLock" in navigator;
}

/** Quick one-shot: acquire wake lock, returns release function */
export async function keepScreenAwake(): Promise<() => void> {
  const wl = createWakeLock();
  await wl.request();
  return () => wl.release();
}
