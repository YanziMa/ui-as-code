/**
 * Async utilities: retry with backoff, timeout, polling, concurrency control,
 * memoization, task queue, promise utilities, and async iterators.
 */

// --- Retry ---

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoff?: number;
  /** Max delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Jitter: add randomness to delay (default: true) */
  jitter?: boolean;
  /** Predicate to determine if error is retryable (default: always retry) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback before each retry attempt */
  onRetry?: (error: unknown, attempt: number) => void;
}

/** Retry an async operation with exponential backoff */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    backoff = 2,
    maxDelay = 30000,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay
      let delay = Math.min(initialDelay * Math.pow(backoff, attempt - 1), maxDelay);
      if (jitter) delay = delay * (0.5 + Math.random() * 0.5);

      onRetry?.(error, attempt);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// --- Timeout ---

/** Add a timeout to a promise. Rejects with Error if not resolved in time. */
export function withTimeoutPromise<T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// --- Polling ---

export interface PollOptions {
  /** Interval between polls in ms (default: 1000) */
  interval?: number;
  /** Maximum time to poll in ms (default: 60000) */
  maxDuration?: number;
  /** Stop polling when this returns truthy */
  until: () => boolean | Promise<boolean>;
}

/** Poll until a condition is met or max duration exceeded */
export async function poll(options: PollOptions): Promise<boolean> {
  const { interval = 1000, maxDuration = 60000, until } = options;
  const start = Date.now();

  while (Date.now() - start < maxDuration) {
    try {
      if (await until()) return true;
    } catch { /* ignore errors in predicate */ }
    await new Promise((r) => setTimeout(r, interval));
  }

  return false;
}

// --- Concurrency Control ---

export interface ConcurrencyOptions {
  /** Maximum concurrent tasks (default: 5) */
  concurrency?: number;
}

/** Run tasks with limited concurrency using a queue */
export async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  options: ConcurrencyOptions = {},
): Promise<T[]> {
  const { concurrency = 5 } = options;
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;
  let activeCount = 0;
  let resolvedCount = 0;

  return new Promise((resolve, reject) => {
    function runNext(): void {
      if (nextIndex >= tasks.length && activeCount === 0) {
        resolve(results);
        return;
      }

      while (activeCount < concurrency && nextIndex < tasks.length) {
        const idx = nextIndex++;
        activeCount++;

        tasks[idx]!()
          .then((result) => {
            results[idx] = result;
            activeCount++;
            resolvedCount++;
            runNext();
          })
          .catch((err) => reject(err));
      }
    }

    runNext();
  });
}

// --- Memoization ---

export interface MemoizeOptions {
  /** TTL in ms for cache entries (default: no expiry) */
  ttl?: number;
  /** Max cache size (default: Infinity) */
  maxSize?: number;
  /** Custom cache key resolver (default: JSON.stringify of args) */
  keyResolver?: (...args: unknown[]) => string;
  /** Cache miss callback */
  onMiss?: (key: string) => void;
  /** Cache hit callback */
  onHit?: (key: string) => void;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number | null;
}

/** Memoize an async function with optional TTL and cache size limit */
export function memoizeAsync<F extends (...args: any[]) => any>(
  fn: F,
  options: MemoizeOptions = {},
): F & { clear: (key?: string) => void; getCacheSize: () => number } {
  const cache = new Map<string, CacheEntry<ReturnType<F>>>();
  const { ttl, maxSize = Infinity, keyResolver, onMiss, onHit } = options;

  const memoized = ((...args: Parameters<F>): ReturnType<F> => {
    const key = keyResolver ? keyResolver(...args as unknown[]) : JSON.stringify(args);

    if (cache.has(key)) {
      const entry = cache.get(key)!;
      if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
        cache.delete(key);
      } else {
        onHit?.(key);
        return entry.value;
      }
    }

    onMiss?.(key);
    const result = fn(...args) as ReturnType<F>;

    // Handle promises - cache the result when it resolves
    if (result instanceof Promise) {
      return result.then((resolvedValue) => {
        setCache(key, resolvedValue);
        return resolvedValue;
      }) as ReturnType<F>;
    }

    setCache(key, result);
    return result;
  }) as F & { clear: (key?: string) => void; getCacheSize: () => number };

  function setCache(key: string, value: ReturnType<F>): void {
    // Evict oldest if at capacity
    if (cache.size >= maxSize && !cache.has(key)) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }

    cache.set(key, {
      value,
      expiresAt: ttl !== undefined ? Date.now() + ttl : null,
    });
  }

  memoized.clear = (key?: string) => {
    if (key) cache.delete(key);
    else cache.clear();
  };

  memoized.getCacheSize = () => cache.size;

  return memoized;
}

// --- Synchronous Memoization ---

/** Memoize a synchronous function */
export function memoize<F extends (...args: any[]) => any>(
  fn: F,
  options?: Omit<MemoizeOptions, "onMiss" | "onHit">,
): F & { clear: (key?: string) => void } {
  const asyncMemo = memoizeAsync(fn as (...args: any[]) => any, options);
  const syncFn = ((...args: any[]) => asyncMemo(...args)) as F & { clear: (key?: string) => void };
  syncFn.clear = asyncMemo.clear;
  return syncFn;
}

// --- Deferred ---

/** Create a deferred promise that can be resolved/rejected externally */
export function createDeferred<T = void>(): {
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

// --- Async Iterator Helpers ---

/** Convert an array into an async iterator with configurable delay between items */
export async function* asyncIterate<T>(
  items: T[],
  options?: { delayMs?: number },
): AsyncGenerator<T> {
  const { delayMs = 0 } = options ?? {};
  for (const item of items) {
    yield item;
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }
}

/** Batch process items from an async iterator */
export async function batchProcess<T>(
  iterable: AsyncIterable<T> | Iterable<T>,
  processor: (batch: T[]) => Promise<void>,
  batchSize = 10,
): Promise<void> {
  let batch: T[] = [];

  for await (const item of iterable) {
    batch.push(item);
    if (batch.length >= batchSize) {
      await processor(batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await processor(batch);
  }
}

// --- All Settled Helpers ---

/** Wait for all promises, returning only successful results */
export async function allSuccessful<T>(promises: Array<() => Promise<T>>): Promise<T[]> {
  const results = await Promise.allSettled(promises.map((p) => p()));
  return results
    .filter((r): r is PromiseFulfilledResult<T> => r.status === "fulfilled")
    .map((r) => r.value);
}

/** Wait for all promises, throwing on first failure */
export async function allOrThrow<T>(promises: Array<() => Promise<T>>): Promise<T[]> {
  const results = await Promise.allSettled(promises.map((p) => p()));
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failures.length > 0) throw failures[0]?.reason;
  return results.map((r) => (r as PromiseFulfilledResult<T>).value);
}
