/**
 * Idle / User Activity Detection: Detects when a user becomes inactive or returns,
 * with configurable timeout, activity events (mouse, keyboard, touch, scroll),
 * visibility change handling, and multiple callback support.
 */

// --- Types ---

export type IdleState = "active" | "idle" | "locked";

export interface IdleOptions {
  /** Time in ms before user is considered idle (default: 300000 = 5 min) */
  timeout?: number;
  /** Events that reset the idle timer */
  events?: string[];
  /** Immediately consider user idle on page hide? */
  idleOnHide?: boolean;
  /** Start in idle state? (default: false) */
  startIdle?: boolean;
  /** Enable console logging for debugging */
  debug?: boolean;
  /** Callback when state changes to idle */
  onIdle?: () => void;
  /** Callback when user becomes active again */
  onActive?: () => void;
  /** Callback on every state change */
  onStateChange?: (state: IdleState) => void;
  /** Target element to listen for events on (default: document) */
  target?: HTMLElement | Document | Window;
}

export interface IdleInstance {
  /** Current idle state */
  getState: () => IdleState;
  /** Remaining time until idle (ms), or 0 if already idle */
  getRemainingTime: () => number;
  /** Total time the user has been idle (ms), or 0 if active */
  getIdleTime: () => number;
  /** Manually reset the timer (treat as user activity) */
  reset: () => void;
  /** Pause detection (stop counting down) */
  pause: () => void;
  /** Resume detection from where it left off */
  resume: () => void;
  /** Destroy and cleanup all listeners */
  destroy: () => void;
}

// --- Main Factory ---

export function createIdleDetector(options: IdleOptions = {}): IdleInstance {
  const opts = {
    timeout: options.timeout ?? 300000, // 5 minutes
    events: options.events ?? [
      "mousedown", "mousemove", "keydown",
      "scroll", "touchstart", "wheel",
    ],
    idleOnHide: options.idleOnHide ?? true,
    startIdle: options.startIdle ?? false,
    debug: options.debug ?? false,
    ...options,
  };

  const target = options.target ?? document;

  // State
  let currentState: IdleState = opts.startIdle ? "idle" : "active";
  let lastActivity = Date.now();
  let idleStartTime: number | null = opts.startIdle ? Date.now() : null;
  let paused = false;
  let pausedAt: number | null = null;
  let accumulatedIdleTime = 0; // time accumulated while paused
  let destroyed = false;

  // Timer reference
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  function log(msg: string): void {
    if (opts.debug) console.log(`[Idle] ${msg}`);
  }

  function setState(newState: IdleState): void {
    if (newState === currentState || destroyed) return;

    log(`State change: ${currentState} -> ${newState}`);
    const previous = currentState;
    currentState = newState;

    if (newState === "idle") {
      idleStartTime = Date.now() - accumulatedIdleTime;
      opts.onIdle?.();
    } else if (previous === "idle") {
      // Was idle, now active — record how long we were idle
      if (idleStartTime !== null) {
        accumulatedIdleTime = 0;
        idleStartTime = null;
      }
      opts.onActive?.();
    }

    opts.onStateChange?.(currentState);
  }

  function handleActivity(): void {
    if (destroyed || paused) return;

    lastActivity = Date.now();

    // If currently idle, switch back to active
    if (currentState === "idle" || currentState === "locked") {
      setState("active");
    }

    // Reset the countdown timer
    scheduleIdleCheck();
  }

  function scheduleIdleCheck(): void {
    if (idleTimer) clearTimeout(idleTimer);

    const elapsed = Date.now() - lastActivity;
    const remaining = Math.max(0, opts.timeout! - elapsed);

    if (remaining <= 0) {
      // Already should be idle
      setState("idle");
      return;
    }

    idleTimer = setTimeout(() => {
      if (!paused && !destroyed) {
        setState("idle");
      }
    }, remaining);
  }

  // Visibility change handler
  function handleVisibilityChange(): void {
    if (destroyed) return;

    if (document.hidden) {
      if (opts.idleOnHide && currentState === "active") {
        log("Page hidden — marking as idle");
        setState("idle");
      }
    } else {
      // Page visible again — treat as activity
      handleActivity();
    }
  }

  // Attach event listeners
  for (const eventName of opts.events!) {
    target.addEventListener(eventName, handleActivity, { passive: true });
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Initial timer setup
  if (currentState === "active") {
    scheduleIdleCheck();
  }

  return {
    getState(): IdleState { return currentState; },

    getRemainingTime(): number {
      if (currentState !== "active") return 0;
      const elapsed = Date.now() - lastActivity;
      return Math.max(0, opts.timeout! - elapsed);
    },

    getIdleTime(): number {
      if (idleStartTime === null) return 0;
      return Date.now() - idleStartTime;
    },

    reset(): void {
      log("Manual reset");
      handleActivity();
    },

    pause(): void {
      if (paused) return;
      paused = true;
      pausedAt = Date.now();

      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }

      log("Paused");
    },

    resume(): void {
      if (!paused) return;
      paused = false;

      if (pausedAt !== null) {
        const pausedDuration = Date.now() - pausedAt;
        // Adjust lastActivity so the remaining time is preserved
        lastActivity += pausedDuration;
        pausedAt = null;
      }

      log("Resumed");

      if (currentState === "active") {
        scheduleIdleCheck();
      }
    },

    destroy(): void {
      destroyed = true;

      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }

      for (const eventName of opts.events!) {
        target.removeEventListener(eventName, handleActivity);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      log("Destroyed");
    },
  };
}
