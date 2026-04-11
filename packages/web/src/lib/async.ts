/**
 * Async/promise utilities: retry, timeout, debounce, throttle,
 * race helpers, concurrency control, and promise composition.
 */

// --- Types ---

export interface RetryOptions {
  /** Max retry attempts (default: 3) */
  maxAttempts?: number;
  /** Base delay in ms (default: 1000) */
  baseDelay?: number;
  /** Exponential backoff multiplier (default: 2) */
  backoffFactor?: number;
  /** Max delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Jitter: add random 0-1 * delay (default: true) */
  jitter?: boolean;
  /** Predicate: should we retry on this error? (default: always) */
  shouldRetry?: (error: unknown) => boolean;
  /** Callback on each attempt */
  onAttempt?: (attempt: number, error: unknown) => void;
}

export interface TimeoutOptions {
  /** Timeout in ms */
  ms: number;
  /** Custom error message or Error instance */
  message?: string;
}

export interface DebounceAsyncOptions {
  /** Debounce delay in ms */
  delay: number;
  /** Use leading edge (fire immediately on first call) */
  leading?: boolean;
  /** Use trailing edge (fire after delay from last call) */
  trailing?: boolean;
}

export interface ThrottleAsyncOptions {
  /** Throttle interval in ms */
  interval: number;
  /** Use leading edge */
  leading?: boolean;
  /** Use trailing edge */
  trailing?: boolean;
}

export interface ConcurrencyOptions {
  /** Max concurrent promises (default: 5) */
  concurrency?: number;
  /** Stop on first error? (default: false) */
  stopOnError?: boolean;
}

// --- Retry ---

/** Retry an async function with exponential backoff */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    backoffFactor = 2,
    maxDelay = 30000,
    jitter = true,
    shouldRetry = () => true,
    onAttempt,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      onAttempt?.(attempt, error);

      if (attempt < maxAttempts && shouldRetry(error)) {
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay,
        );
        const finalDelay = jitter ? delay * Math.random() : delay;
        await sleep(finalDelay);
      }
    }
  }

  throw lastError;
}

// --- Timeout ---

/** Add timeout to a promise; rejects if not resolved within ms */
export function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions | number,
): Promise<T> {
  const opts = typeof options === "number" ? { ms: options } : options;

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        opts.message
          ? new Error(opts.message)
          : new Error(`Operation timed out after ${opts.ms}ms`),
      );
    }, opts.ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// --- Sleep / Delay ---

/** Sleep for N milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolve after next microtask tick */
export function nextTick(): Promise<void> {
  return new Promise((resolve) => queueMicrotask(resolve));
}

/** Resolve after next animation frame */
export function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

// --- Debounce Async ---

/** Create a debounced async function */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: DebounceAsyncOptions,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const { delay, leading = false, trailing = true } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    lastArgs = args;

    if (leading && !timer) {
      // Fire immediately on first call
      const result = fn(...args);
      timer = setTimeout(() => { timer = null; }, delay);
      return result;
    }

    if (timer) clearTimeout(timer);

    if (trailing) {
      // Return existing pending promise if available
      if (pendingPromise) return pendingPromise;

      pendingPromise = new Promise<ReturnType<T>>((resolve, reject) => {
        timer = setTimeout(async () => {
          timer = null;
          pendingPromise = null;
          try {
            resolve(await fn(...(lastArgs!)));
          } catch (e) {
            reject(e);
          }
        }, delay);
      });

      return pendingPromise!;
    }

    // No trailing: just debounce the call
    return new Promise((resolve) => {
      timer = setTimeout(() => {
        timer = null;
        resolve(fn(...args));
      }, delay);
    }) as Promise<ReturnType<T>>;
  };
}

// --- Throttle Async ---

/** Create a throttled async function */
export function throttleAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ThrottleAsyncOptions,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const { interval, leading = true, trailing = false } = options;
  let lastCallTime = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const now = Date.now();
    const elapsed = now - lastCallTime;

    lastArgs = args;

    if (elapsed >= interval || !leading) {
      // Can fire now
      lastCallTime = now;
      return fn(...args);
    }

    if (trailing) {
      // Schedule for end of window
      if (timer) clearTimeout(timer);
      return new Promise<ReturnType<T>>((resolve, reject) => {
        timer = setTimeout(async () => {
          timer = null;
          lastCallTime = Date.now();
          try {
            resolve(await fn(...(lastArgs!)));
          } catch (e) {
            reject(e);
          }
        }, interval - elapsed);
      });
    }

    // Just skip
    return Promise.resolve(undefined as ReturnType<T>);
  };
}

// --- Concurrency Control ---

/** Run tasks with limited concurrency */
export async function concurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  options: ConcurrencyOptions = {},
): Promise<T[]> {
  const { concurrency = 5, stopOnError = false } = options;
  const results: T[] = [];
  const executing = new Set<Promise<number>>();

  let index = 0;

  const enqueue = (): Promise<void> => {
    if (index >= tasks.length && executing.size === 0) return Promise.resolve();

    while (index < tasks.length && executing.size < concurrency) {
      const taskIndex = index++;
      const promise = tasks[taskIndex]()
        .then((result) => {
          results[taskIndex] = result;
          executing.delete(promise as unknown as Promise<number>);
          if (stopOnError) return;
          return enqueue();
        })
        .catch((error) => {
          executing.delete(promise as unknown as Promise<number>);
          if (stopOnError) throw error;
          results[taskIndex] = undefined as T;
          return enqueue();
        });

      executing.add(promise as unknown as Promise<number>);
    }

    return Promise.race(executing).then(() => {});
  };

  await enqueue();
  return results;
}

/** Process array items in parallel batches */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  batchSize = 5,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, j) => processor(item, i + j)),
    );
    results.push(...batchResults);
  }
  return results;
}

// --- Promise Helpers ---

/** Race with a fallback value on timeout */
export function raceWithFallback<T>(
  promise: Promise<T>,
  fallback: T,
  timeoutMs: number,
): Promise<T> {
  return withTimeout(promise, { ms: timeoutMs }).catch(() => fallback);
}

/** Map over an array with concurrency limit (alias for convenience) */
export async function mapConcurrent<T, R>(
  items: T[],
  mapper: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): Promise<R[]> {
  return concurrencyLimit(
    items.map((item, i) => () => mapper(item, i)),
    { concurrency },
  );
}

/** Execute promises sequentially (one after another) */
export async function sequence<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

/** Create a deferred promise (resolve/reject exposed) */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Poll a condition until it's met */
export async function poll<T>(
  condition: () => Promise<T | undefined>,
  options: { interval?: number; timeout?: number } = {},
): Promise<T> {
  const { interval = 200, timeout = 30000 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const result = await condition();
    if (result !== undefined) return result;
    await sleep(interval);
  }

  throw new Error(`Polling timed out after ${timeout}ms`);
}

/** Memoize an async function (cache by serialized args) */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ttlMs = 0,
): T {
  const cache = new Map<string, { value: Awaited<ReturnType<T>>; timestamp: number }>();

  return ((...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    if (cached) {
      if (ttlMs === 0 || Date.now() - cached.timestamp < ttlMs) {
        return Promise.resolve(cached.value);
      }
      cache.delete(key);
    }

    const promise = fn(...args) as Promise<Awaited<ReturnType<T>>>;
    promise.then((value) => {
      cache.set(key, { value, timestamp: Date.now() });
    });
    return promise;
  }) as T;
}
