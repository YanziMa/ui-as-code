/**
 * Polling Utility: Configurable interval-based data fetching with
 * adaptive backoff, exponential backoff on errors, stop/resume,
 * poll-on-window-focus, conditional polling, deduplication,
 * and comprehensive state tracking.
 */

// --- Types ---

export interface PollingConfig {
  /** The function to call on each poll */
  fn: () => Promise<unknown>;
  /** Initial interval in ms (default: 30000) */
  interval?: number;
  /** Minimum interval in ms (default: 1000) */
  minInterval?: number;
  /** Maximum interval in ms (default: 300000 = 5 min) */
  maxInterval?: number;
  /** Enable adaptive polling (back off when data unchanged) */
  adaptive?: boolean;
  /** Adaptive config */
  adaptiveConfig?: {
    /** Number of unchanged polls before backing off (default: 3) */
    unchangedThreshold?: number;
    /** Multiplier for interval when unchanged (default: 2) */
    backoffMultiplier?: number;
    /** Max multiplier cap (default: 8) */
    maxMultiplier?: number;
    /** Reset to base interval on change (default: true) */
    resetOnChange?: boolean;
  };
  /** Exponential backoff on error */
  errorBackoff?: {
    enabled?: boolean;
    /** Initial delay after error (default: 1000) */
    initialDelayMs?: number;
    /** Max delay (default: 60000) */
    maxDelayMs?: number;
    /** Backoff factor (default: 2) */
    factor?: number;
  };
  /** Poll immediately on window focus? */
  pollOnFocus?: boolean;
  /** Poll when tab becomes visible? */
  pollOnVisibilityChange?: boolean;
  /** Stop polling when tab is hidden? */
  stopWhenHidden?: boolean;
  /** Only poll if this condition returns true */
  condition?: () => boolean;
  /** Maximum number of polls (-1 = infinite, default: -1) */
  maxPolls?: number;
  /** Timeout per poll request (default: 15000) */
  pollTimeout?: number;
  /** Enable leading edge poll (poll immediately on start) */
  immediate?: boolean;
  /** Enable trailing edge poll (poll one last time on stop) */
  trailing?: boolean;
  /** Custom equality checker for adaptive mode */
  isEqual?: (prev: unknown, curr: unknown) => boolean;
  /** Called with each poll result */
  onData?: (data: unknown) => void;
  /** Called on each poll error */
  onError?: (error: Error) => void;
  /** Called when polling stops */
  onStop?: (reason: string) => void;
}

export interface PollingState {
  status: "idle" | "running" | "paused" | "stopped" | "error";
  currentInterval: number;
  baseInterval: number;
  pollCount: number;
  successCount: number;
  errorCount: number;
  consecutiveErrors: number;
  consecutiveUnchanged: number;
  lastPollAt: number | null;
  nextPollAt: number | null;
  lastData: unknown;
  lastError: Error | null;
  currentBackoffMultiplier: number;
  errorBackoffDelay: number;
}

export type PollingStatusHandler = (state: PollingState) => void;

// --- Main Class ---

export class Poller {
  private config: {
    fn: () => Promise<unknown>;
    interval: number;
    minInterval: number;
    maxInterval: number;
    adaptive: boolean;
    adaptiveConfig: Required<NonNullable<PollingConfig["adaptiveConfig"]>>;
    errorBackoff: NonNullable<PollingConfig["errorBackoff"]>;
    pollOnFocus: boolean;
    pollOnVisibilityChange: boolean;
    stopWhenHidden: boolean;
    condition: (() => boolean) | undefined;
    maxPolls: number;
    pollTimeout: number;
    immediate: boolean;
    trailing: boolean;
    isEqual: ((a: unknown, b: unknown) => boolean) | undefined;
    onData: ((data: unknown) => void) | undefined;
    onError: ((error: Error) => void) | undefined;
    onStop: ((reason: string) => void) | undefined;
  };

  private timerId: ReturnType<typeof setInterval> | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private focusCleanup: (() => void) | null = null;
  private visibilityCleanup: (() => void) | null = null;

  private state: PollingState = {
    status: "idle",
    currentInterval: 0,
    baseInterval: 0,
    pollCount: 0,
    successCount: 0,
    errorCount: 0,
    consecutiveErrors: 0,
    consecutiveUnchanged: 0,
    lastPollAt: null,
    nextPollAt: null,
    lastData: null,
    lastError: null,
    currentBackoffMultiplier: 1,
    errorBackoffDelay: 0,
  };

  private statusListeners = new Set<PollingStatusHandler>();
  private destroyed = false;

  constructor(config: PollingConfig) {
    const baseInterval = config.interval ?? 30000;

    this.config = {
      interval: baseInterval,
      minInterval: config.minInterval ?? 1000,
      maxInterval: config.maxInterval ?? 300000,
      adaptive: config.adaptive ?? false,
      adaptiveConfig: {
        unchangedThreshold: 3,
        backoffMultiplier: 2,
        maxMultiplier: 8,
        resetOnChange: true,
        ...config.adaptiveConfig,
      },
      errorBackoff: {
        enabled: true,
        initialDelayMs: 1000,
        maxDelayMs: 60000,
        factor: 2,
        ...config.errorBackoff,
      },
      pollOnFocus: config.pollOnFocus ?? false,
      pollOnVisibilityChange: config.pollOnVisibilityChange ?? false,
      stopWhenHidden: config.stopWhenHidden ?? false,
      condition: config.condition,
      maxPolls: config.maxPolls ?? -1,
      pollTimeout: config.pollTimeout ?? 15000,
      immediate: config.immediate ?? true,
      trailing: config.trailing ?? false,
      isEqual: config.isEqual,
      onData: config.onData,
      onError: config.onError,
      onStop: config.onStop,
      fn: config.fn,
    };

    this.state.baseInterval = baseInterval;
    this.state.currentInterval = baseInterval;
  }

  // --- Control ---

  /** Start polling */
  start(): void {
    if (this.destroyed || this.state.status === "running") return;

    this.state.status = "running";
    this.setupEventListeners();

    if (this.config.immediate) {
      // Poll immediately
      this.scheduleImmediate();
    } else {
      // Schedule first poll after interval
      this.scheduleNext();
    }

    this.notifyStateChange();
  }

  /** Pause polling (can be resumed) */
  pause(): void {
    if (this.state.status !== "running") return;

    this.clearTimers();
    this.state.status = "paused";
    this.notifyStateChange();
  }

  /** Resume paused polling */
  resume(): void {
    if (this.state.status !== "paused") return;

    this.state.status = "running";
    this.scheduleNext();
    this.notifyStateChange();
  }

  /** Stop polling completely */
  stop(reason = "manual"): void {
    if (this.state.status === "stopped") return;

    // Trailing poll
    if (this.config.trailing && this.state.status === "running") {
      this.executePoll().finally(() => {
        this.doStop(reason);
      });
    } else {
      this.doStop(reason);
    }
  }

  /** Destroy the poller (cannot restart) */
  destroy(): void {
    this.destroyed = true;
    this.stop("destroyed");
    this.cleanupEventListeners();
    this.statusListeners.clear();
  }

  // --- Configuration ---

  /** Update the polling interval dynamically */
  setInterval(ms: number): void {
    this.config.interval = ms;
    this.state.baseInterval = ms;

    // If currently running and not in backoff, reschedule
    if (this.state.status === "running" &&
        this.state.currentBackoffMultiplier === 1 &&
        this.state.errorBackoffDelay === 0) {
      this.state.currentInterval = ms;
      this.clearTimers();
      this.scheduleNext();
    }
  }

  /** Get the current effective interval */
  getEffectiveInterval(): number {
    let interval = this.state.currentInterval;

    // Apply adaptive multiplier
    if (this.config.adaptive && this.state.consecutiveUnchanged > 0) {
      interval *= Math.min(
        this.state.currentBackoffMultiplier,
        this.config.adaptiveConfig.maxMultiplier,
      );
    }

    // Apply error backoff
    if (this.state.errorBackoffDelay > 0) {
      interval += this.state.errorBackoffDelay;
    }

    return Math.min(Math.max(interval, this.config.minInterval), this.config.maxInterval);
  }

  // --- State ---

  /** Get current polling state */
  getState(): PollingState {
    return { ...this.state };
  }

  /** Check if currently polling */
  isRunning(): boolean {
    return this.state.status === "running";
  }

  /** Check if paused */
  isPaused(): boolean {
    return this.state.status === "paused";
  }

  // --- Event Handlers ---

  /** Subscribe to state changes */
  onStateChange(handler: PollingStatusHandler): () => void {
    this.statusListeners.add(handler);
    handler(this.getState());
    return () => this.statusListeners.delete(handler);
  }

  /** Manually trigger a poll (outside of schedule) */
  async pollNow(): Promise<unknown> {
    return this.executePoll();
  }

  /** Reset all counters and backoff state */
  reset(): void {
    this.state.pollCount = 0;
    this.state.successCount = 0;
    this.state.errorCount = 0;
    this.state.consecutiveErrors = 0;
    this.state.consecutiveUnchanged = 0;
    this.state.currentBackoffMultiplier = 1;
    this.state.errorBackoffDelay = 0;
    this.state.currentInterval = this.state.baseInterval;
    this.state.lastError = null;
    this.notifyStateChange();
  }

  // --- Private ---

  private doStop(reason: string): void {
    this.clearTimers();
    this.cleanupEventListeners();
    this.state.status = "stopped";

    if (this.config.onStop) {
      try { this.config.onStop(reason); } catch {}
    }

    this.notifyStateChange();
  }

  private scheduleImmediate(): void {
    this.timeoutId = setTimeout(() => {
      this.executePoll().then(() => {
        if (this.state.status === "running") {
          this.scheduleNext();
        }
      });
    }, 0);
  }

  private scheduleNext(): void {
    this.clearTimers();

    const interval = this.getEffectiveInterval();
    this.state.nextPollAt = Date.now() + interval;

    this.timerId = setInterval(() => {
      this.executePoll();
    }, interval);

    // Also execute once immediately at the scheduled time
    // (setInterval doesn't fire until after first interval)
    this.timeoutId = setTimeout(() => {
      this.executePoll();
    }, interval);
  }

  private clearTimers(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  private async executePoll(): Promise<unknown> {
    // Check conditions
    if (this.config.condition && !this.config.condition()) {
      return this.state.lastData;
    }

    // Check max polls
    if (this.config.maxPolls !== -1 && this.state.pollCount >= this.config.maxPolls) {
      this.stop("max_polls_reached");
      return this.state.lastData;
    }

    this.state.pollCount++;
    this.state.lastPollAt = Date.now();

    try {
      // Execute with timeout
      const result = await this.withTimeout(
        this.config.fn(),
        this.config.pollTimeout,
      );

      this.handleSuccess(result);
      return result;
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private handleSuccess(data: unknown): void {
    this.state.successCount++;
    this.state.consecutiveErrors = 0;
    this.state.lastError = null;
    this.state.errorBackoffDelay = 0;

    // Adaptive: check if data changed
    if (this.config.adaptive) {
      const changed = this.config.isEqual
        ? !this.config.isEqual(this.state.lastData, data)
        : JSON.stringify(this.state.lastData) !== JSON.stringify(data);

      if (changed) {
        this.state.consecutiveUnchanged = 0;
        if (this.config.adaptiveConfig.resetOnChange) {
          this.state.currentBackoffMultiplier = 1;
          this.state.currentInterval = this.state.baseInterval;
        }
      } else {
        this.state.consecutiveUnchanged++;
        if (this.state.consecutiveUnchanged >= this.config.adaptiveConfig.unchangedThreshold) {
          this.state.currentBackoffMultiplier = Math.min(
            this.state.currentBackoffMultiplier * this.config.adaptiveConfig.backoffMultiplier,
            this.config.adaptiveConfig.maxMultiplier,
          );
        }
      }
    }

    this.state.lastData = data;

    // Notify data handler
    if (this.config.onData) {
      try { this.config.onData(data); } catch {}
    }

    this.notifyStateChange();
  }

  private handleError(error: Error): void {
    this.state.errorCount++;
    this.state.consecutiveErrors++;
    this.state.lastError = error;

    // Error backoff
    if (this.config.errorBackoff.enabled) {
      const { initialDelayMs, maxDelayMs, factor } = this.config.errorBackoff;
      const newDelay = Math.min(
        initialDelayMs * Math.pow(factor, this.state.consecutiveErrors - 1),
        maxDelayMs,
      );
      this.state.errorBackoffDelay = newDelay;
    }

    // Notify error handler
    if (this.config.onError) {
      try { this.config.onError(error); } catch {}
    }

    this.notifyStateChange();
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Poll timed out after ${ms}ms`)), ms)
      ),
    ]);
  }

  // --- Event Listeners ---

  private setupEventListeners(): void {
    this.cleanupEventListeners();

    if (typeof window === "undefined") return;

    if (this.config.pollOnFocus || this.config.pollOnVisibilityChange) {
      const handler = () => {
        if (this.state.status !== "running") return;

        if (document.hidden && this.config.stopWhenHidden) {
          this.pause();
          return;
        }

        if (!document.hidden && this.state.status === "paused") {
          this.resume();
          return;
        }

        // Trigger immediate poll on focus/visibility change
        if ((!document.hidden || document.hasFocus()) &&
            (this.config.pollOnFocus || this.config.pollOnVisibilityChange)) {
          this.executePoll();
        }
      };

      if (this.config.pollOnFocus) {
        window.addEventListener("focus", handler);
      }
      if (this.config.pollOnVisibilityChange) {
        document.addEventListener("visibilitychange", handler);
      }

      this.focusCleanup = () => {
        window.removeEventListener("focus", handler);
        document.removeEventListener("visibilitychange", handler);
      };
    }
  }

  private cleanupEventListeners(): void {
    if (this.focusCleanup) {
      this.focusCleanup();
      this.focusCleanup = null;
    }
    if (this.visibilityCleanup) {
      this.visibilityCleanup();
      this.visibilityCleanup = null;
    }
  }

  private notifyStateChange(): void {
    const state = this.getState();
    for (const listener of this.statusListeners) {
      try { listener(state); } catch {}
    }
  }
}

/** Create a pre-configured poller */
export function createPoller(config: PollingConfig): Poller {
  return new Poller(config);
}

// --- Simple Polling Helper ---

/** Simple polling: repeatedly call a function at a fixed interval */
export function poll(
  fn: () => Promise<unknown>,
  intervalMs: number = 30000,
  options?: Partial<Omit<PollingConfig, "fn" | "interval">>,
): Poller {
  return new Poller({ fn, interval: intervalMs, ...options });
}
