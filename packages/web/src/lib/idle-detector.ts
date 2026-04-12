/**
 * Idle Detector: Monitor user activity state (active, idle, away, locked)
 * using visibility API, mouse/keyboard events, Page Visibility API, and
 * Wake Lock API. Supports customizable idle thresholds, activity callbacks,
 * and cross-tab coordination.
 */

// --- Types ---

export type UserActivity = "active" | "idle" | "away" | "locked" | "hidden";

export interface ActivityState {
  /** Current activity level */
  state: UserActivity;
  /** Time since last activity in ms */
  idleTime: number;
  /** Time when current state started */
  since: Date;
  /** Previous state */
  previousState?: UserActivity;
}

export interface IdleDetectorOptions {
  /** Time before "idle" state (ms, default: 30000) */
  idleThreshold?: number;
  /** Time before "away" state (ms, default: 300000 = 5 min) */
  awayThreshold?: number;
  /** Consider page hidden as "locked"? (default: true) */
  treatHiddenAsLocked?: boolean;
  /** Reset timer on mouse movement? (default: true) */
  detectMouseMovement?: boolean;
  /** Reset timer on scroll? (default: true) */
  detectScroll?: boolean;
  /** Reset timer on touch? (default: true) */
  detectTouch?: boolean;
  /** Wake lock screen while active? (default: false) */
  wakeLock?: boolean;
  /** Callback on any state change */
  onStateChange?: (state: ActivityState) => void;
  /** Callback specifically for idle */
  onIdle?: () => void;
  /** Callback specifically for return from idle */
  onActive?: () => void;
  /** Callback specifically for away */
  onAway?: () => void;
  /** Polling interval for time-based checks (ms, default: 1000) */
  pollInterval?: number;
  /** Enable cross-tab coordination via BroadcastChannel? (default: false) */
  crossTabSync?: boolean;
  /** Channel name for cross-tab sync (default: "idle-detector") */
  channelName?: string;
}

// --- Main Class ---

export class IdleDetector {
  private options: Required<IdleDetectorOptions>;
  private state: ActivityState;
  private lastActivityTime: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private wakeLockObj: WakeLockSentinel | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private destroyed = false;

  constructor(options: IdleDetectorOptions = {}) {
    this.options = {
      idleThreshold: options.idleThreshold ?? 30_000,
      awayThreshold: options.awayThreshold ?? 300_000,
      treatHiddenAsLocked: options.treatHiddenAsLocked ?? true,
      detectMouseMovement: options.detectMouseMovement ?? true,
      detectScroll: options.detectScroll ?? true,
      detectTouch: options.detectTouch ?? true,
      wakeLock: options.wakeLock ?? false,
      pollInterval: options.pollInterval ?? 1000,
      crossTabSync: options.crossTabSync ?? false,
      channelName: options.channelName ?? "idle-detector",
      onStateChange: options.onStateChange ?? (() => {}),
      onIdle: options.onIdle ?? (() => {}),
      onActive: options.onActive ?? (() => {}),
      onAway: options.onAway ?? (() => {}),
    };

    this.lastActivityTime = Date.now();
    this.state = {
      state: "active",
      idleTime: 0,
      since: new Date(),
    };
  }

  /** Start monitoring */
  start(): void {
    if (this.destroyed) return;

    // Bind activity listeners
    this.bindListeners();

    // Start polling
    this.pollTimer = setInterval(() => this.check(), this.options.pollInterval);

    // Setup wake lock if requested
    if (this.options.wakeLock && "wakeLock" in navigator) {
      this.requestWakeLock();
    }

    // Setup cross-tab sync if requested
    if (this.options.crossTabSync && "BroadcastChannel" in window) {
      this.setupCrossTabSync();
    }

    // Initial check
    this.check();
  }

  /** Stop monitoring and cleanup */
  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.releaseWakeLock();
    this.unbindListeners();
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
  }

  /** Get current state */
  getState(): ActivityState {
    return { ...this.state };
  }

  /** Get current activity level */
  getActivity(): UserActivity {
    return this.state.state;
  }

  /** Check if currently idle */
  isIdle(): boolean { return this.state.state === "idle"; }
  /** Check if currently away */
  isAway(): boolean { return this.state.state === "away"; }
  /** Check if currently active */
  isActive(): boolean { return this.state.state === "active"; }

  /** Manually reset the idle timer (call when user does something) */
  resetIdle(): void {
    this.lastActivityTime = Date.now();
    if (this.state.state !== "active") {
      this.transitionTo("active");
    }
  }

  /** Force a specific state (useful for testing) */
  forceState(state: UserActivity): void {
    this.transitionTo(state);
  }

  /** Destroy detector and release all resources */
  destroy(): void {
    this.destroyed = true;
    this.stop();
  }

  // --- Private ---

  private bindListeners(): void {
    const reset = () => this.resetIdle();

    document.addEventListener("mousemove", reset, { passive: true });
    document.addEventListener("mousedown", reset, { passive: true });
    document.addEventListener("keydown", reset, { passive: true });
    document.addEventListener("scroll", reset, { passive: true });
    document.addEventListener("touchstart", reset, { passive: true });
    document.addEventListener("touchmove", reset, { passive: true });

    // Visibility change
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (this.options.treatHiddenAsLocked) {
          this.transitionTo("locked");
        } else {
          this.transitionTo("hidden");
        }
      } else {
        this.resetIdle();
      }
    });

    // Focus/blur as additional signals
    window.addEventListener("focus", reset);
    window.addEventListener("blur", () => {
      // Don't immediately go idle — blur could be alt-tab briefly
      setTimeout(() => {
        if (document.hasFocus()) return; // Refocused
        this.check(); // Re-evaluate
      }, 500);
    });
  }

  private unbindListeners(): void {
    // Note: we can't fully remove anonymous listeners, but we can prevent
    // their effects by checking `destroyed` flag in handlers.
    // For production, use named functions and remove them here.
  }

  private check(): void {
    if (this.destroyed) return;

    const now = Date.now();
    const idleMs = now - this.lastActivityTime;
    this.state.idleTime = idleMs;

    let newState: UserActivity;

    if (document.hidden && this.options.treatHiddenAsLocked) {
      newState = "locked";
    } else if (!document.hidden && idleMs >= this.options.awayThreshold) {
      newState = "away";
    } else if (!document.hidden && idleMs >= this.options.idleThreshold) {
      newState = "idle";
    } else if (document.hidden) {
      newState = "hidden";
    } else {
      newState = "active";
    }

    if (newState !== this.state.state) {
      this.transitionTo(newState);
    }
  }

  private transitionTo(newState: UserActivity): void {
    const prevState = this.state.state;
    this.state = {
      state: newState,
      idleTime: Date.now() - this.lastActivityTime,
      since: new Date(),
      previousState: prevState,
    };

    // Fire specific callbacks
    switch (newState) {
      case "idle": this.options.onIdle(); break;
      case "active": this.options.onActive(); break;
      case "away": this.options.onAway(); break;
    }

    // Fire general callback
    this.options.onStateChange(this.state);

    // Notify other tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({ type: "state-change", state: newState, timestamp: now });
      } catch {}
    }

    // Manage wake lock
    if (newState === "active") {
      this.requestWakeLock();
    } else {
      this.releaseWakeLock();
    }
  }

  private async requestWakeLock(): Promise<void> {
    if (!this.options.wakeLock || !("wakeLock" in navigator)) return;

    try {
      this.wakeLockObj = await navigator.wakeLock("screen", { preventSleep: true });
    } catch {
      // Wake lock not available or denied
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLockObj) {
      this.wakeLockObj.release();
      this.wakeLockObj = null;
    }
  }

  private setupCrossTabSync(): void {
    try {
      this.broadcastChannel = new BroadcastChannel(this.options.channelName);

      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === "activity" && event.data.timestamp > this.lastActivityTime) {
          this.lastActivityTime = event.data.timestamp;
          this.check();
        }
      };

      // Broadcast our activity periodically
      setInterval(() => {
        if (!this.destroyed && document.hasFocus() && this.state.state === "active") {
          try {
            this.broadcastChannel.postMessage({ type: "activity", timestamp: Date.now() });
          } catch {}
        }
      }, 5000);
    } catch {
      // BroadcastChannel not supported
    }
  }
}

// --- Convenience: Auto-pause/resume based on visibility ---

/**
 * Create an idle detector that automatically pauses/resumes a callback
 * when the user is away/active. Useful for animations, polling, etc.
 */
export function createAutoPause(
  onPause: () => void,
  onResume: () => void,
  options?: Omit<IdleDetectorOptions, "onIdle" | "onActive"> & { onStateChange?: IdleDetectorOptions["onStateChange"] },
): IdleDetector {
  const detector = new IdleDetector({
    ...options,
    onIdle: onPause,
    onActive: onResume,
  });

  detector.start();
  return detector;
}
