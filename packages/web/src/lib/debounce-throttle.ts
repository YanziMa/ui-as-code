/**
 * Debounce & Throttle: Advanced rate-limiting utilities with leading/trailing
 * edge control, cancel, flush, stats tracking, maxWait, and Promise support.
 */

// --- Types ---

export interface DebounceOptions {
  /** Wait time in ms before invoking (default: 300) */
  wait?: number;
  /** Invoke on leading edge (default: false) */
  leading?: boolean;
  /** Invoke on trailing edge (default: true) */
  trailing?: boolean;
  /** Max wait time before forced invocation (default: 0 = no max) */
  maxWait?: number;
  /** Callback for debounced function */
  onInvoke?: (...args: unknown[]) => void;
  /** Callback when invocation is cancelled */
  onCancel?: () => void;
}

export interface ThrottleOptions {
  /** Minimum ms between invocations (default: 300) */
  interval?: number;
  /** Invoke on leading edge (default: true) */
  leading?: boolean;
  /** Invoke on trailing edge (default: false) */
  trailing?: boolean;
  /** No trailing invocation if only leading fired (default: true) */
  noTrailingOnLeading?: boolean;
}

export interface RateLimitStats {
  callCount: number;
  invokeCount: number;
  cancelledCount: number;
  flushedCount: number;
  pendingCount: number;
  lastCallAt: number | null;
  lastInvokeAt: number | null;
  createdAt: number;
}

// --- Debounced Function ---

export class Debounced<T extends (...args: any[]) => any> {
  private fn: T;
  private waitMs: number;
  private leading: boolean;
  private trailing: boolean;
  private maxWaitMs: number;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private maxTimerId: ReturnType<typeof setTimeout> | null = null;
  private lastInvokeTime = 0;
  private lastCallTime = 0;
  private pendingArgs: Parameters<T> | null = null;
  private _cancelled = false;
  private _flushed = false;

  public stats: RateLimitStats = {
    callCount: 0, invokeCount: 0, cancelledCount: 0,
    flushedCount: 0, pendingCount: 0,
    lastCallAt: null, lastInvokeAt: null, createdAt: Date.now(),
  };

  constructor(fn: T, options: DebounceOptions = {}) {
    this.fn = fn;
    this.waitMs = options.wait ?? 300;
    this.leading = options.leading ?? false;
    this.trailing = options.trailing ?? true;
    this.maxWaitMs = options.maxWait ?? 0;
  }

  /** Execute the debounced function */
  execute(...args: Parameters<T>): void {
    if (this._cancelled) return;

    this.stats.callCount++;
    this.stats.lastCallAt = Date.now();
    this.pendingArgs = args;
    this.stats.pendingCount = 1;

    const now = Date.now();
    const timeSinceLastInvoke = now - this.lastInvokeTime;

    // Leading edge
    if (this.leading && !this.timerId) {
      if (timeSinceLastInvoke >= this.waitMs || this.lastInvokeTime === 0) {
        this.invoke(args);
        return;
      }
    }

    // Reset trailing timer
    if (this.timerId) clearTimeout(this.timerId);

    // Set up trailing timer
    if (this.trailing) {
      this.timerId = setTimeout(() => {
        this.timerId = null;
        if (this.pendingArgs) {
          this.invoke(this.pendingArgs);
          this.pendingArgs = null;
          this.stats.pendingCount = 0;
        }
      }, this.timeRemaining());
    } else {
      // Even without trailing, we need to track timing
      this.timerId = setTimeout(() => {
        this.timerId = null;
      }, this.timeRemaining());
    }

    // Max wait timer
    if (this.maxWaitMs > 0 && !this.maxTimerId) {
      const remainingMax = Math.max(0, this.maxWaitMs - (now - this.stats.createdAt));
      this.maxTimerId = setTimeout(() => {
        this.maxTimerId = null;
        if (this.pendingArgs) {
          this.invoke(this.pendingArgs);
          this.pendingArgs = null;
          this.stats.pendingCount = 0;
        }
      }, remainingMax);
    }
  }

  /** Cancel pending invocation */
  cancel(): void {
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
    if (this.maxTimerId) { clearTimeout(this.maxTimerId); this.maxTimerId = null; }
    this.pendingArgs = null;
    this.stats.pendingCount = 0;
    this.stats.cancelledCount++;
    this._cancelled = true;
  }

  /** Immediately invoke pending (trailing) invocation */
  flush(): ReturnType<T> | undefined {
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
    if (this.maxTimerId) { clearTimeout(this.maxTimerId); this.maxTimerId = null; }

    if (this.pendingArgs !== null) {
      const args = this.pendingArgs;
      this.pendingArgs = null;
      this.stats.pendingCount = 0;
      this.stats.flushedCount++;
      this._flushed = true;
      return this.invoke(args);
    }
    return undefined;
  }

  /** Check if there's a pending invocation */
  hasPending(): boolean { return this.pendingArgs !== null; }

  /** Check if cancelled */
  isCancelled(): boolean { return this._cancelled; }

  /** Get remaining time until next scheduled invocation */
  timeRemaining(): number {
    if (!this.timerId) return 0;
    const elapsed = Date.now() - this.lastCallTime;
    return Math.max(0, this.waitMs - elapsed);
  }

  /** Reset to initial state (useful for reusing instance) */
  reset(): void {
    this.cancel();
    this._cancelled = false;
    this._flushed = false;
    this.lastInvokeTime = 0;
    this.lastCallTime = 0;
    this.stats = {
      callCount: 0, invokeCount: 0, cancelledCount: 0,
      flushedCount: 0, pendingCount: 0,
      lastCallAt: null, lastInvokeAt: null, createdAt: Date.now(),
    };
  }

  /** Get reference to original function */
  getOriginal(): T { return this.fn; }

  private invoke(args: Parameters<T>): ReturnType<T> {
    this.lastInvokeTime = Date.now();
    this.stats.invokeCount++;
    this.stats.lastInvokeAt = new Date(this.lastInvokeTime);
    this._cancelled = false;
    this._flushed = false;
    return this.fn(...args);
  }
}

// --- Throttled Function ---

export class Throttled<T extends (...args: any[]) => any> {
  private fn: T;
  private intervalMs: number;
  private leading: boolean;
  private trailing: boolean;
  private noTrailingOnLeading: boolean;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private lastInvokeTime = 0;
  private trailingArgs: Parameters<T> | null = null;
  private _cancelled = false;

  public stats: RateLimitStats = {
    callCount: 0, invokeCount: 0, cancelledCount: 0,
    flushedCount: 0, pendingCount: 0,
    lastCallAt: null, lastInvokeAt: null, createdAt: Date.now(),
  };

  constructor(fn: T, options: ThrottleOptions = {}) {
    this.fn = fn;
    this.intervalMs = options.interval ?? 300;
    this.leading = options.leading ?? true;
    this.trailing = options.trailing ?? false;
    this.noTrailingOnLeading = options.noTrailingOnLeading ?? true;
  }

  /** Execute the throttled function */
  execute(...args: Parameters<T>): void {
    if (this._cancelled) return;

    this.stats.callCount++;
    this.stats.lastCallAt = Date.now();
    const now = Date.now();
    const timeSinceLastInvoke = now - this.lastInvokeTime;

    // Leading edge
    if (this.leading && timeSinceLastInvoke >= this.intervalMs) {
      this.invoke(args);
      return;
    }

    // Store args for potential trailing invocation
    this.trailingArgs = args;
    this.stats.pendingCount = 1;

    // If no trailing timer, set one up
    if (!this.timerId && this.trailing) {
      const remaining = this.intervalMs - timeSinceLastInvoke;
      this.timerId = setTimeout(() => {
        this.timerId = null;
        if (this.trailingArgs) {
          // Don't invoke trailing if leading was already called and noTrailingOnLeading
          if (!(this.noTrailingOnLeading && this.stats.invokeCount > this.stats.callCount - 1)) {
            this.invoke(this.trailingArgs!);
          }
          this.trailingArgs = null;
          this.stats.pendingCount = 0;
        }
      }, remaining);
    }
  }

  /** Cancel pending trailing invocation */
  cancel(): void {
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
    this.trailingArgs = null;
    this.stats.pendingCount = 0;
    this.stats.cancelledCount++;
    this._cancelled = true;
  }

  /** Immediately invoke pending trailing invocation */
  flush(): ReturnType<T> | undefined {
    if (this.timerId) { clearTimeout(this.timerId); this.timerId = null; }
    if (this.trailingArgs !== null) {
      const args = this.trailingArgs;
      this.trailingArgs = null;
      this.stats.pendingCount = 0;
      this.stats.flushedCount++;
      return this.invoke(args);
    }
    return undefined;
  }

  hasPending(): boolean { return this.trailingArgs !== null; }
  isCancelled(): boolean { return this._cancelled; }

  reset(): void {
    this.cancel();
    this._cancelled = false;
    this.lastInvokeTime = 0;
    this.stats = {
      callCount: 0, invokeCount: 0, cancelledCount: 0,
      flushedCount: 0, pendingCount: 0,
      lastCallAt: null, lastInvokeAt: null, createdAt: Date.now(),
    };
  }

  getOriginal(): T { return this.fn; }

  private invoke(args: Parameters<T>): ReturnType<T> {
    this.lastInvokeTime = Date.now();
    this.stats.invokeCount++;
    this.stats.lastInvokeAt = new Date(this.lastInvokeTime);
    this._cancelled = false;
    return this.fn(...args);
  }
}

// --- Convenience Functions ---

/** Create a debounced version of a function */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  waitMs?: number,
  options?: Omit<DebounceOptions, "wait">,
): Debounced<T> & ((...args: Parameters<T>) => void) {
  const d = new Debounced(fn, { wait: waitMs, ...options });
  const wrapper = (...args: Parameters<T>) => d.execute(...args);
  return Object.assign(wrapper, d);
}

/** Create a throttled version of a function */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs?: number,
  options?: Omit<ThrottleOptions, "interval">,
): Throttled<T> & ((...args: Parameters<T>) => void) {
  const t = new Throttled(fn, { interval: intervalMs, ...options });
  const wrapper = (...args: Parameters<T>) => t.execute(...args);
  return Object.assign(wrapper, t);
}

/** Create a promise-based debounce that resolves with the latest arguments */
export function debouncePromise<T extends (...args: any[]) => any>(
  fn: T,
  waitMs = 300,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let resolve: (value: ReturnType<T>) => void;
  let reject: (err: Error) => void;
  let currentPromise: Promise<ReturnType<T>> | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    if (timer) clearTimeout(timer);

    currentPromise = new Promise<ReturnType<T>>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    timer = setTimeout(async () => {
      timer = null;
      try {
        const result = await fn(...args);
        resolve!(result);
      } catch (err) {
        reject!(err as Error);
      }
    }, waitMs);

    return currentPromise!;
  };
}

/** Request animation frame throttle (for scroll/resize handlers) */
export function rafThrottle<T extends (...args: any[]) => void>(fn: T): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): void => {
    lastArgs = args;
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (lastArgs) fn(...lastArgs);
      });
    }
  };
}

/** Idle callback throttle (uses requestIdleCallback or setTimeout fallback) */
export function idleThrottle<T extends (...args: any[]) => void>(fn: T, timeout = 200): (...args: Parameters<T>) => void {
  let pending = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): void => {
    lastArgs = args;
    if (!pending) {
      pending = true;
      const schedule = typeof requestIdleCallback !== "undefined"
        ? (cb: IdleRequestCallback) => requestIdleCallback(cb, { timeout })
        : (cb: IdleRequestCallback) => setTimeout(cb as TimerHandler, timeout);

      schedule(() => {
        pending = false;
        if (lastArgs) fn(...lastArgs);
      });
    }
  };
}
