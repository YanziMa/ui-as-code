/**
 * Promise Utilities: Advanced promise patterns including concurrency control,
 * retry with backoff, timeout, cancellation, race conditions, batching,
 * memoization, and async iteration helpers.
 */

// --- Types ---

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffFactor?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Jitter: add randomness to delay (default: true) */
  jitter?: boolean;
  /** Custom predicate: should we retry on this error? */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Called before each retry */
  onRetry?: (error: unknown, attempt: number) => void;
}

export interface TimeoutOptions {
  /** Timeout duration in ms */
  ms: number;
  /** Custom message or Error factory */
  message?: string | (() => Error);
  /** Whether to abort the operation (if AbortController supported) */
  abortable?: boolean;
}

export interface ConcurrencyOptions {
  /** Maximum concurrent promises (default: 5) */
  concurrency?: number;
  /** Stop on first error? (default: false) */
  stopOnError?: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

export interface BatchOptions<T> {
  /** Maximum items per batch (default: 10) */
  batchSize?: number;
  /** Delay between batches in ms (default: 0) */
  batchDelay?: number;
  /** Concurrency within each batch (default: batchSize) */
  concurrency?: number;
  /** Processor function for each item */
  processor: (item: T, index: number) => Promise<unknown>;
}

export interface MemoizeOptions<T> {
  /** TTL in ms for cache entries (default: 0 = no expiry) */
  ttl?: number;
  /** Maximum cache size (default: 100) */
  maxSize?: number;
  /** Custom cache key generator */
  keyGenerator?: (...args: unknown[]) => string;
  /** Called on cache hit */
  onHit?: (key: string, value: T) => void;
  /** Called on cache miss */
  onMiss?: (key: string) => void;
  /** Whether to cache rejections (default: false) */
  cacheRejections?: boolean;
}

// --- Retry ---

/**
 * Retry an async function with exponential backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = {
    maxAttempts: options.maxAttempts ?? 3,
    initialDelay: options.initialDelay ?? 1000,
    backoffFactor: options.backoffFactor ?? 2,
    maxDelay: options.maxDelay ?? 30000,
    jitter: options.jitter ?? true,
    shouldRetry: options.shouldRetry ?? (() => true),
    ...options,
  };

  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxAttempts || !opts.shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay
      let delay = opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1);
      delay = Math.min(delay, opts.maxDelay);

      // Add jitter
      if (opts.jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }

      opts.onRetry?.(error, attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}

// --- Timeout ---

/**
 * Add a timeout to a promise. Rejects if the promise doesn't resolve within ms.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions,
): Promise<T> {
  const { ms, message, abortable = false } = options;

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    // Set up timeout
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;

      const err = typeof message === "function"
        ? message()
        : new Error(message ?? `Operation timed out after ${ms}ms`);

      (err as Error & { code?: string }).code = "ETIMEDOUT";
      reject(err);
    }, ms);

    // Handle the actual promise
    promise
      .then((value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Create a promise that resolves after a delay.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Concurrency Control ---

/**
 * Run tasks with limited concurrency.
 */
export async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  options: ConcurrencyOptions = {},
): Promise<T[]> {
  const { concurrency = 5, stopOnError = false, onProgress } = options;
  const results: T[] = [];
  let completed = 0;
  let nextIndex = 0;
  let hasError = false;

  return new Promise<T[]>((resolve, reject) => {
    function runNext(): void {
      while (nextIndex < tasks.length && (!stopOnError || !hasError)) {
        const idx = nextIndex++;
        const task = tasks[idx]!;

        task()
          .then((result) => {
            results[idx] = result;
            completed++;
            onProgress?.(completed, tasks.length);

            if (completed === tasks.length) {
              resolve(results);
            } else {
              runNext();
            }
          })
          .catch((error) => {
            completed++;
            if (stopOnError) {
              hasError = true;
              reject(error);
            } else {
              results[idx] = undefined as T;
              onProgress?.(completed, tasks.length);
              if (completed === tasks.length) {
                resolve(results);
              } else {
                runNext();
              }
            }
          });

        // Stop when we've reached concurrency limit
        if ((nextIndex - completed) >= concurrency) break;
      }
    }

    runNext();
  });
}

/**
 * Process items in batches.
 */
export async function processInBatches<T>(
  items: T[],
  options: BatchOptions<T>,
): Promise<unknown[]> {
  const { batchSize = 10, batchDelay = 0, processor } = options;
  const allResults: unknown[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((item, idx) => processor(item, i + idx)),
    );
    allResults.push(...results);

    if (batchDelay > 0 && i + batchSize < items.length) {
      await sleep(batchDelay);
    }
  }

  return allResults;
}

// --- Race Conditions ---

/**
 * Race multiple promises but return the first successful one (ignore failures).
 * Only rejects if all fail.
 */
export async function raceSuccess<T>(promises: Array<Promise<T>>): Promise<T> {
  let rejectedCount = 0;
  const errors: unknown[] = [];

  return new Promise<T>((resolve, reject) => {
    if (promises.length === 0) {
      reject(new Error("raceSuccess: no promises provided"));
      return;
    }

    for (const p of promises) {
      p.then(resolve).catch((err) => {
        errors.push(err);
        rejectedCount++;
        if (rejectedCount === promises.length) {
          reject(new AggregateError(errors, "All promises were rejected"));
        }
      });
    }
  });
}

/**
 * Resolve only the first N promises that complete successfully.
 */
export async function firstN<T>(
  promises: Array<Promise<T>>,
  n: number,
): Promise<T[]> {
  const results: T[] = [];

  return new Promise<T[]>((resolve, reject) => {
    let settledCount = 0;

    for (const p of promises) {
      p
        .then((value) => {
          results.push(value);
          if (results.length >= n) {
            resolve(results.slice(0, n));
          }
        })
        .catch(() => {})
        .finally(() => {
          settledCount++;
          if (settledCount === promises.length && results.length < n) {
            resolve(results); // Return whatever we got
          }
        });
    }

    if (promises.length === 0) resolve([]);
  });
}

// --- Cancellation ---

/**
 * Create a cancellable promise wrapper.
 */
export function makeCancellable<T>(promise: Promise<T>): {
  promise: Promise<T>;
  cancel: () => void;
  isCancelled: () => boolean;
} {
  let cancelled = false;

  const wrapped = new Promise<T>((resolve, reject) => {
    promise
      .then((value) => {
        if (cancelled) reject(new Error("Cancelled"));
        else resolve(value);
      })
      .catch((error) => {
        if (cancelled) reject(new Error("Cancelled"));
        else reject(error);
      });
  });

  return {
    promise: wrapped,
    cancel: () => { cancelled = true; },
    isCancelled: () => cancelled,
  };
}

// --- Async Iteration ---

/**
 * Convert an async iterable into an array.
 */
export async function collectAsync<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const results: T[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
}

/**
 * Map over an async iterable with concurrency limit.
 */
export async function* mapAsyncIterable<T, R>(
  iterable: AsyncIterable<T>,
  mapper: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): AsyncGenerator<R> {
  const queue: Promise<R>[] = [];
  let index = 0;

  for await (const item of iterable) {
    queue.push(mapper(item, index++));

    while (queue.length >= concurrency) {
      yield queue.shift()!;
    }
  }

  // Drain remaining
  while (queue.length > 0) {
    yield queue.shift()!;
  }
}

/**
 * Filter an async iterable.
 */
export async function* filterAsyncIterable<T>(
  iterable: AsyncIterable<T>,
  predicate: (item: T) => Promise<boolean> | boolean,
): AsyncGenerator<T> {
  for await (const item of iterable) {
    if (await predicate(item)) yield item;
  }
}

/**
 * Reduce an async iterable.
 */
export async function reduceAsyncIterable<T, R>(
  iterable: AsyncIterable<T>,
  reducer: (acc: R, item: T) => Promise<R> | R,
  initialValue: R,
): Promise<R> {
  let acc = initialValue;
  for await (const item of iterable) {
    acc = await reducer(acc, item);
  }
  return acc;
}

// --- Memoization ---

/**
 * Memoize an async function with optional TTL and size limits.
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: MemoizeOptions<Awaited<ReturnType<T>>> = {},
): T & { clear: () => void; getCacheSize: () => number } {
  const cache = new Map<string, { value: Awaited<ReturnType<T>>; timestamp: number }>();
  const rejectionCache = new Map<string, { error: unknown; timestamp: number }>();

  const {
    ttl = 0,
    maxSize = 100,
    keyGenerator,
    onHit,
    onMiss,
    cacheRejections = false,
  } = options;

  function generateKey(args: Parameters<T>): string {
    if (keyGenerator) return keyGenerator(...(args as unknown[]));
    try {
      return JSON.stringify(args);
    } catch {
      return args.map((a) => String(a)).join("|");
    }
  }

  function isExpired(entry: { timestamp: number }): boolean {
    return ttl > 0 && Date.now() - entry.timestamp > ttl;
  }

  function evictIfNeeded(): void {
    if (cache.size <= maxSize) return;
    // Evict oldest entry
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }

  const memoized = (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = generateKey(args);

    // Check cache
    const cached = cache.get(key);
    if (cached && !isExpired(cached)) {
      onHit?.(key, cached.value);
      return Promise.resolve(cached.value);
    }

    // Check rejection cache
    if (cacheRejections) {
      const rejCached = rejectionCache.get(key);
      if (rejCached && !isExpired(rejCached)) {
        return Promise.reject(rejCached.error);
      }
    }

    onMiss?.(key);

    const promise = fn(...args)
      .then((result) => {
        evictIfNeeded();
        cache.set(key, { value: result as Awaited<ReturnType<T>>, timestamp: Date.now() });
        return result;
      })
      .catch((error) => {
        if (cacheRejections) {
          rejectionCache.set(key, { error, timestamp: Date.now() });
        }
        throw error;
      }) as Promise<Awaited<ReturnType<T>>>;

    return promise;
  };

  (memoized as any).clear = (): void => {
    cache.clear();
    rejectionCache.clear();
  };
  (memoized as any).getCacheSize = (): number => cache.size;

  return memoized as T & { clear: () => void; getCacheSize: () => number };
}

// --- Deferred / One-time Event ---

/** Create a deferred promise (resolve/reject from outside) */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
  isSettled: () => boolean;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  let settled = false;

  const promise = new Promise<T>((res, rej) => {
    resolve = (value: T) => { settled = true; res(value); };
    reject = (error: unknown) => { settled = true; rej(error); };
  });

  return { promise, resolve, reject, isSettled: () => settled };
}

/** Create a one-time event emitter (resolves once, then always resolves) */
export function createOnceEvent<T>(): {
  wait: () => Promise<T>;
  emit: (value: T) => void;
  isEmitted: () => boolean;
  reset: () => void;
} {
  let deferred = createDeferred<T>();
  let emitted = false;

  return {
    wait: () => deferred.promise,
    emit: (value: T) => {
      if (!emitted) {
        emitted = true;
        deferred.resolve(value);
      }
    },
    isEmitted: () => emitted,
    reset: () => {
      deferred = createDeferred<T>();
      emitted = false;
    },
  };
}

// --- Polling ---

export interface PollOptions<T> {
  /** Function to poll */
  fn: () => Promise<T>;
  /** Predicate: should we stop polling? */
  shouldStop: (result: T) => boolean;
  /** Interval between polls (ms) */
  interval?: number;
  /** Maximum poll attempts (default: 0 = unlimited) */
  maxAttempts?: number;
  /** Timeout for entire polling operation (ms, default: 0 = unlimited) */
  timeout?: number;
  /** Called before each poll attempt */
  onPoll?: (attempt: number, result?: T) => void;
}

/**
 * Poll a function until a condition is met.
 */
export async function poll<T>(options: PollOptions<T>): Promise<T> {
  const {
    fn,
    shouldStop,
    interval = 1000,
    maxAttempts = 0,
    timeout = 0,
    onPoll,
  } = options;

  let attempts = 0;
  const startTime = Date.now();

  while (true) {
    // Check max attempts
    if (maxAttempts > 0 && attempts >= maxAttempts) {
      throw new Error(`poll: exceeded max attempts (${maxAttempts})`);
    }

    // Check timeout
    if (timeout > 0 && Date.now() - startTime > timeout) {
      throw new Error(`poll: timed out after ${timeout}ms`);
    }

    attempts++;
    const result = await fn();
    onPoll?.(attempts, result);

    if (shouldStop(result)) return result;

    await sleep(interval);
  }
}

// --- Queue ---

export interface TaskQueueOptions {
  /** Max concurrent tasks (default: 1 = serial) */
  concurrency?: number;
  /** Auto-start? (default: true) */
  autoStart?: boolean;
  /** Called when queue becomes empty */
  onDrain?: () => void;
  /** Called when a task completes */
  onComplete?: (result: unknown, index: number) => void;
  /** Called when a task fails */
  onError?: (error: unknown, index: number) => void;
}

/**
 * Task queue with concurrency control.
 */
export class TaskQueue {
  private queue: Array<{ task: () => Promise<unknown>; resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];
  private running = 0;
  private destroyed = false;
  private options: Required<TaskQueueOptions>;

  constructor(options: TaskQueueOptions = {}) {
    this.options = {
      concurrency: options.concurrency ?? 1,
      autoStart: options.autoStart ?? true,
      onDrain: options.onDrain,
      onComplete: options.onComplete,
      onError: options.onError,
    };
  }

  /** Add a task to the queue */
  add<T>(task: () => Promise<T>): Promise<T> {
    if (this.destroyed) return Promise.reject(new Error("Queue destroyed"));

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve: resolve as (v: unknown) => void, reject });
      if (this.options.autoStart) this.processNext();
    });
  }

  /** Get current queue length (waiting + running) */
  get length(): number { return this.queue.length + this.running; }

  /** Check if idle */
  get idle(): boolean { return this.queue.length === 0 && this.running === 0; }

  /** Pause processing (tasks still accepted but not started) */
  pause(): void { this.options.autoStart = false; }

  /** Resume processing */
  resume(): void { this.options.autoStart = true; this.processNext(); }

  /** Clear all pending tasks (running ones continue) */
  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error("Queue cleared"));
    }
    this.queue = [];
  }

  /** Destroy the queue (rejects all pending) */
  destroy(): void {
    this.destroyed = true;
    this.clear();
  }

  private processNext(): void {
    if (this.destroyed || !this.options.autoStart) return;
    while (this.running < this.options.concurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;

      item.task()
        .then((result) => {
          this.running--;
          item.resolve(result);
          this.options.onComplete?.(result, 0);
          this.processNext();
          if (this.idle) this.options.onDrain?.();
        })
        .catch((error) => {
          this.running--;
          item.reject(error);
          this.options.onError?.(error, 0);
          this.processNext();
          if (this.idle) this.options.onDrain?.();
        });
    }
  }
}
