/**
 * Timing utilities: debounce, throttle, delay, rAF wrappers,
 * idle callback, interval management, and performance measurement.
 */

// --- Types ---

export interface DebounceOptions {
  /** Wait time in ms (default: 300) */
  wait?: number;
  /** Invoke on leading edge? (default: false) */
  leading?: boolean;
  /** Invoke on trailing edge? (default: true) */
  trailing?: boolean;
  /** Max wait time before forced invocation */
  maxWait?: number;
}

export interface ThrottleOptions {
  /** Interval between invocations in ms (default: 300) */
  interval?: number;
  /** Invoke on leading edge? (default: true) */
  leading?: boolean;
  /** Invoke on trailing edge? (default: true) */
  trailing?: boolean;
}

export interface DelayOptions {
  /** Signal to cancel the delay */
  signal?: AbortSignal;
}

export interface IntervalHandle {
  /** Clear the interval */
  clear: () => void;
  /** Pause the interval */
  pause: () => void;
  /** Resume the interval */
  resume: () => void;
}

// --- Debounce ---

/**
 * Create a debounced function that delays invocation until after
 * the specified wait time has elapsed since the last call.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: DebounceOptions,
): (...args: Parameters<T>) => void {
  const { wait = 300, leading = false, trailing = true, maxWait } = options ?? {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastInvokeTime = 0;
  let pendingArgs: Parameters<T> | null = null;

  function invoke(thisArg: unknown, args: Parameters<T>) {
    fn.apply(thisArg, args);
    lastInvokeTime = Date.now();
    pendingArgs = null;
  }

  function shouldInvoke(now: number): boolean {
    const timeSinceLastCall = now - lastCallTime;
    const timeSinceLastInvoke = now - lastInvokeTime;

    return (
      timeSinceLastCall >= wait ||
      timeSinceLastInvoke < 0 ||
      (maxWait !== undefined && timeSinceLastCall >= maxWait)
    );
  }

  function remainingWait(now: number): number {
    const timeSinceLastCall = now - lastCallTime;
    const timeSinceLastInvoke = now - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    if (maxWait === undefined) return timeWaiting;
    return Math.min(timeWaiting, maxWait - timeSinceLastInvoke);
  }

  function debounced(this: unknown, ...args: Parameters<T>): void {
    const now = Date.now();
    lastCallTime = now;

    if (shouldInvoke(now)) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (leading && !pendingArgs) {
        invoke(this, args);
      } else {
        pendingArgs = args;
      }
    }

    if (timer) clearTimeout(timer);

    if (trailing || (pendingArgs && !timer)) {
      timer = setTimeout(() => {
        timer = null;
        const currentTime = Date.now();

        if (shouldInvoke(currentTime) || pendingArgs) {
          if (pendingArgs) {
            invoke(this, pendingArgs);
          }
        }
      }, remainingWait(now));
    }
  }

  debounced.cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingArgs = null;
  };

  debounced.flush = function (this: unknown): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pendingArgs) {
      invoke(this, pendingArgs);
    }
  };

  debounced.pending = (): boolean => {
    return timer !== null || pendingArgs !== null;
  };

  return debounced as T & {
    cancel: () => void;
    flush: () => void;
    pending: () => boolean;
  };
}

// --- Throttle ---

/**
 * Create a throttled function that invokes at most once per interval.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: ThrottleOptions,
): (...args: Parameters<T>) => void {
  const { interval = 300, leading = true, trailing = true } = options ?? {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastInvokeTime = 0;
  let pendingArgs: Parameters<T> | null = null;

  function throttled(this: unknown, ...args: Parameters<T>): void {
    const now = Date.now();
    const timeSinceLastInvoke = now - lastInvokeTime;

    const shouldInvokeNow = leading && timeSinceLastInvoke >= interval;

    if (shouldInvokeNow) {
      lastInvokeTime = now;
      fn.apply(this, args);
      pendingArgs = null;
    } else if (trailing) {
      pendingArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          lastInvokeTime = Date.now();
          if (pendingArgs) {
            fn.apply(this, pendingArgs);
            pendingArgs = null;
          }
        }, interval - timeSinceLastInvoke);
      }
    }
  }

  throttled.cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingArgs = null;
  };

  return throttled as T & { cancel: () => void };
}

// --- Delay ---

/**
 * Return a promise that resolves after the given milliseconds.
 * Can be cancelled via AbortSignal.
 */
export function delay(ms: number, options?: DelayOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    if (options?.signal) {
      if (options.signal.aborted) {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      options.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    }
  });
}

/**
 * Execute a function with a timeout. Rejects if the function doesn't
 * resolve within the time limit.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  errorMessage = "Operation timed out",
): Promise<T> {
  return Promise.race([
    promise,
    delay(ms).then(() => { throw new Error(errorMessage); }),
  ]);
}

/**
 * Retry a function up to n times with exponential backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options?: {
    retries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoff?: number;
    shouldRetry?: (error: unknown) => boolean;
  },
): Promise<T> {
  const {
    retries = 3,
    baseDelay = 200,
    maxDelay = 10000,
    backoff = 2,
    shouldRetry = () => true,
  } = options ?? {};

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < retries && shouldRetry(error)) {
        const delayMs = Math.min(baseDelay * Math.pow(backoff, attempt), maxDelay);
        await delay(delayMs);
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}

// --- rAF / Idle ---

/**
 * Wrap requestAnimationFrame in a promise.
 * Returns a cancel function.
 */
export function raf(callback: (time: number) => void): () => void {
  let id: number | null = null;

  id = requestAnimationFrame((time) => {
    id = null;
    callback(time);
  });

  return () => {
    if (id !== null) {
      cancelAnimationFrame(id);
      id = null;
    }
  };
}

/**
 * Run callback on next animation frame (promise-based).
 */
export function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Run callback when browser is idle (using requestIdleCallback or rAF fallback).
 */
export function whenIdle(callback: (deadline: IdleDeadline) => void, options?: { timeout?: number }): () => void {
  if ("requestIdleCallback" in window) {
    const id = (window as any).requestIdleCallback(callback, options);
    return () => (window as any).cancelIdleCallback(id);
  }

  // Fallback: use rAF
  const id = requestAnimationFrame(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    });
  });

  return () => cancelAnimationFrame(id);
}

// --- Interval ---

/**
 * Create a managed interval that can be paused/resumed.
 */
export function createInterval(
  callback: () => void,
  ms: number,
  options?: { immediate?: boolean },
): IntervalHandle {
  let id: ReturnType<typeof setInterval> | null = null;
  let paused = false;
  let pausedAt = 0;
  let totalPaused = 0;

  function tick(): void {
    if (!paused) callback();
  }

  id = setInterval(tick, ms);

  if (options?.immediate) callback();

  return {
    clear() {
      if (id) {
        clearInterval(id);
        id = null;
      }
    },
    pause() {
      if (!paused) {
        paused = true;
        pausedAt = Date.now();
        if (id) clearInterval(id);
        id = null;
      }
    },
    resume() {
      if (paused) {
        totalPaused += Date.now() - pausedAt;
        paused = false;
        id = setInterval(tick, ms);
      }
    },
  };
}

// --- Performance Measurement ---

/** Simple stopwatch for measuring execution time */
export class Stopwatch {
  private startTimes: Map<string, number> = new Map();
  private durations: Map<string, number> = new Map();

  /** Start timing a named operation */
  start(label = "default"): void {
    this.startTimes.set(label, performance.now());
  }

  /** Stop timing and get duration in ms */
  stop(label = "default"): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) throw new Error(`Stopwatch "${label}" was not started`);
    const duration = performance.now() - startTime;
    this.durations.set(label, duration);
    this.startTimes.delete(label);
    return duration;
  }

  /** Get duration of a completed lap */
  getDuration(label = "default"): number | undefined {
    return this.durations.get(label);
  }

  /** Run a function and measure its execution time */
  async measure<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /** Synchronous version of measure */
  measureSync<T>(fn: () => T): { result: T; duration: number } {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    return { result, duration };
  }

  /** Clear all recorded times */
  reset(): void {
    this.startTimes.clear();
    this.durations.clear();
  }
}

// --- Batch scheduling ---

/**
 * Batch multiple synchronous calls into a single microtask/macrotask.
 * Useful for coalescing DOM writes.
 */
export function createBatchScheduler<T>(
  processor: (items: T[]) => void,
  options?: { maxSize?: number; flushInterval?: number },
): { push: (item: T) => void; flush: () => void; destroy: () => void } {
  const { maxSize = 100, flushInterval = 0 } = options ?? {};

  const queue: T[] = [];
  let scheduled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  function scheduleFlush(): void {
    if (scheduled || destroyed) return;
    scheduled = true;

    if (flushInterval > 0) {
      timer = setTimeout(doFlush, flushInterval);
    } else {
      queueMicrotask(doFlush);
    }
  }

  function doFlush(): void {
    scheduled = false;
    if (timer) { clearTimeout(timer); timer = null; }
    if (queue.length > 0) {
      const batch = queue.splice(0, maxSize);
      processor(batch);
    }
  }

  function push(item: T): void {
    if (destroyed) return;
    queue.push(item);
    if (queue.length >= maxSize) {
      doFlush();
    } else {
      scheduleFlush();
    }
  }

  function flush(): void {
    doFlush();
  }

  function destroy(): void {
    destroyed = true;
    if (timer) clearTimeout(timer);
    queue.length = 0;
  }

  return { push, flush, destroy };
}
