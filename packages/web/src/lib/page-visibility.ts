/**
 * Page Visibility API wrapper with focus/blur detection, tab state tracking,
 * background activity control, and cross-tab coordination.
 */

// --- Types ---

export type VisibilityState = "visible" | "hidden" | "prerender" | "unloaded" | "unknown";

export interface VisibilityOptions {
  /** Callback when visibility changes */
  onChange?: (state: VisibilityState) => void;
  /** Callback when page becomes visible (tab focused) */
  onVisible?: () => void;
  /** Callback when page becomes hidden (tab blurred/backgrounded) */
  onHidden?: () => void;
  /** Throttle visibility callbacks (ms, default: 0 = no throttle) */
  throttleMs?: number;
  /** Track time spent in each state */
  trackTime?: boolean;
}

export interface VisibilityInstance {
  /** Current visibility state */
  readonly state: VisibilityState;
  /** Whether the page is currently visible */
  readonly isVisible: boolean;
  /** Total time spent hidden since creation (ms, if trackTime enabled) */
  readonly hiddenTimeMs: number;
  /** Total time spent visible since creation (ms, if trackTime enabled) */
  readonly visibleTimeMs: number;
  /** Subscribe to visibility changes */
  subscribe: (listener: (state: VisibilityState) => void) => () => void;
  /** Check if document has focus */
  hasFocus: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main ---

export function createVisibilityTracker(options: VisibilityOptions = {}): VisibilityInstance {
  const { onChange, onVisible, onHidden, throttleMs = 0, trackTime = false } = options;

  let currentState: VisibilityState = "unknown";
  let destroyed = false;
  let lastChangeTime = 0;
  let hiddenAccumulator = 0;
  let visibleAccumulator = 0;
  let stateEntryTime = performance.now();
  const listeners = new Set<(state: VisibilityState) => void>();

  function getState(): VisibilityState {
    if (typeof document === "undefined") return "unknown";
    return (document.visibilityState as VisibilityState) ?? "unknown";
  }

  function updateTimers(newState: VisibilityState): void {
    if (!trackTime) return;
    const now = performance.now();
    const elapsed = now - stateEntryTime;
    if (currentState === "visible") {
      visibleAccumulator += elapsed;
    } else if (currentState === "hidden") {
      hiddenAccumulator += elapsed;
    }
    stateEntryTime = now;
  }

  function handleVisibilityChange(): void {
    if (destroyed) return;

    const newState = getState();
    if (newState === currentState && newState !== "unknown") return;

    // Throttle
    if (throttleMs > 0) {
      const now = Date.now();
      if (now - lastChangeTime < throttleMs) return;
      lastChangeTime = now;
    }

    updateTimers(newState);
    currentState = newState;

    // Notify listeners
    for (const listener of listeners) {
      try { listener(newState); } catch { /* ignore */ }
    }

    onChange?.(newState);

    if (newState === "visible") {
      onVisible?.();
    } else if (newState === "hidden") {
      onHidden?.();
    }
  }

  // Initialize
  currentState = getState();
  stateEntryTime = performance.now();

  // Listen
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  const instance: VisibilityInstance = {
    get state() { return currentState; },
    get isVisible() { return currentState === "visible"; },
    get hiddenTimeMs() { return Math.round(hiddenAccumulator); },
    get visibleTimeMs() { return Math.round(visibleAccumulator); },

    subscribe(listener: (state: VisibilityState) => void): () => void {
      listeners.add(listener);
      listener(currentState); // Emit current
      return () => listeners.delete(listener);
    },

    hasFocus(): boolean {
      if (typeof document === "undefined") return false;
      return document.hasFocus();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      updateTimers(currentState);
      listeners.clear();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Get current visibility state */
export function getPageVisibility(): VisibilityState {
  if (typeof document === "undefined") return "unknown";
  return (document.visibilityState as VisibilityState) ?? "unknown";
}

/** Check if page is currently visible */
export function isPageVisible(): boolean {
  return getPageVisibility() === "visible";
}

/** Run a callback only when page is visible; queue otherwise */
export function runWhenVisible(callback: () => void): void {
  if (isPageVisible()) {
    callback();
  } else {
    const handler = (): void => {
      if (isPageVisible()) {
        document.removeEventListener("visibilitychange", handler);
        callback();
      }
    };
    document.addEventListener("visibilitychange", handler);
  }
}

/** Create a one-shot visibility change promise that resolves when condition is met */
export function waitForVisibility(
  desiredState: "visible" | "hidden",
  timeoutMs = 30000,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (getPageVisibility() === desiredState) {
      resolve(true);
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(false); }
    }, timeoutMs);

    const handler = (): void => {
      if (getPageVisibility() === desiredState && !settled) {
        settled = true;
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", handler);
        resolve(true);
      }
    };

    document.addEventListener("visibilitychange", handler);
  });
}
