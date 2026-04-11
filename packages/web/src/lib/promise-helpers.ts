/**
 * Promise Helpers: Advanced promise composition utilities.
 * Race conditions, cancellation, chaining patterns, promise pools,
 * waterfall execution, conditionals, and resource management.
 */

// --- Types ---

export interface PromiseOptions {
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Timeout in ms (rejects if exceeded) */
  timeout?: number;
  /** Timeout error message */
  timeoutMessage?: string;
}

export interface RaceResult<T> {
  /** The winning promise index */
  winner: number;
  /** The resolved value */
  value: T;
}

// --- Cancellation ---

/**
 * Create an abortable promise that respects an AbortSignal.
 */
export function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const cleanup = (): void => {
      signal.removeEventListener("abort", onAbort);
    };

    signal.addEventListener("abort", onAbort);

    promise.then(
      (value) => { cleanup(); resolve(value); },
      (err) => { cleanup(); reject(err); },
    );
  });
}

/** Create a new AbortController with convenience methods */
export function createCancellable(): {
  controller: AbortController;
  isAborted: () => boolean;
  abort: () => void;
} {
  const controller = new AbortController();
  return {
    controller,
    isAborted: () => controller.signal.aborted,
    abort: () => controller.abort(),
  };
}

// --- Timeout ---

/**
 * Wrap a promise with a timeout. Rejects after ms milliseconds.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Operation timed out",
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// --- Race / Any ---

/**
 * Race multiple promises and return which one won along with its value.
 * Unlike Promise.race, this tells you which promise resolved first.
 */
export async function raceWithIndex<T>(promises: Array<Promise<T>>): Promise<RaceResult<T>> {
  let settled = false;

  return new Promise((resolve, reject) => {
    promises.forEach((promise, index) => {
      promise
        .then((value) => {
          if (!settled) {
            settled = true;
            resolve({ winner: index, value });
          }
        })
        .catch((err) => {
          if (!settled && index === promises.length - 1) {
            // Only reject if ALL have rejected
            // Actually, we should track rejections properly
          }
        });
    });

    // If all promises rejected
    Promise.allSettled(promises).then((results) => {
      if (!settled) {
        const errors = results.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );
        if (errors.length === results.length) {
          settled = true;
          reject(errors[0]?.reason ?? new Error("All promises rejected"));
        }
      }
    });
  });
}

/**
 * Return the first resolved promise, ignoring rejections until all fail.
 */
export function anyResolved<T>(promises: Array<Promise<T>>): Promise<T> {
  let rejectionCount = 0;
  let settled = false;

  return new Promise((resolve, reject) => {
    if (promises.length === 0) {
      reject(new Error("No promises provided"));
      return;
    }

    promises.forEach((promise) => {
      promise.then((value) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      }).catch(() => {
        rejectionCount++;
        if (!settled && rejectionCount >= promises.length) {
          settled = true;
          reject(new Error(`All ${promises.length} promises rejected`));
        }
      });
    });
  });
}

// --- Composition Patterns ---

/**
 * Execute tasks sequentially (waterfall), passing each result to the next.
 */
export async function waterfall<T>(
  tasks: Array<(prev?: T) => Promise<T>>,
  initialValue?: T,
): Promise<T> {
  let result = initialValue as T;
  for (const task of tasks) {
    result = await task(result);
  }
  return result;
}

/**
 * Execute tasks in parallel but limit concurrent executions.
 * Returns results in original order.
 */
export async function parallelPool<T>(
  tasks: Array<() => Promise<T>>,
  concurrency = 5,
): Promise<T[]> {
  const results: (T | Error)[] = new Array(tasks.length);
  let nextIndex = 0;
  let activeCount = 0;

  return new Promise((resolve, reject) => {
    let hasError = false;

    function runNext(): void {
      while (activeCount < concurrency && nextIndex < tasks.length && !hasError) {
        const idx = nextIndex++;
        activeCount++;

        tasks[idx]!()
          .then((value) => {
            results[idx] = value;
            activeCount--;
            runNext();
          })
          .catch((err) => {
            results[idx] = err;
            activeCount--;
            hasError = true;
            reject(err);
          });
      }

      if (nextIndex >= tasks.length && activeCount === 0) {
        resolve(results.filter((r): r is T => !(r instanceof Error)));
      }
    }

    runNext();
  });
}

/**
 * Map over items with limited concurrency.
 */
export async function mapConcurrent<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let activeCount = 0;

  return new Promise((resolve) => {
    function runNext(): void {
      while (activeCount < concurrency && nextIndex < items.length) {
        const idx = nextIndex++;
        activeCount++;

        fn(items[idx], idx)
          .then((result) => {
            results[idx] = result;
            activeCount--;
            runNext();
          });
      }

      if (nextIndex >= items.length && activeCount === 0) {
        resolve(results);
      }
    }

    runNext();
  });
}

// --- Conditional Promises ---

/**
 * Conditionally execute one of two async operations.
 */
export async function conditional<T>(
  condition: boolean | (() => boolean | Promise<boolean>),
  thenFn: () => Promise<T>,
  elseFn?: () => Promise<T>,
): Promise<T | undefined> {
  const cond = typeof condition === "function" ? await condition() : condition;
  if (cond) return thenFn();
  return elseFn?.();
}

/**
 * Retry a promise N times before giving up.
 */
export async function retryPromise<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
}

// --- Delay Utilities ---

/** Sleep for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sleep until a specific timestamp */
export function sleepUntil(timestamp: number): Promise<void> {
  const now = Date.now();
  const delay = timestamp - now;
  if (delay <= 0) return Promise.resolve();
  return sleep(delay);
}

/** Debounce a promise-returning function */
export function debounceAsync<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => ReturnType<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: ReturnType<T> | null = null;

  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);

    if (pending) return pending;

    pending = fn(...args) as ReturnType<T];

    timer = setTimeout(() => {
      timer = null;
      pending = null;
    }, delayMs);

    return pending;
  }) as (...args: Parameters<T>) => ReturnType<T>;
}

/** Throttle a promise-returning function */
export function throttleAsync<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastCall = 0;
  let pending: ReturnType<T> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastCall >= intervalMs) {
      lastCall = now;
      return fn(...args) as ReturnType<T>;
    }

    if (pending) return pending;

    pending = fn(...args) as ReturnType<T>;

    setTimeout(() => {
      lastCall = Date.now();
      pending = null;
    }, intervalMs - (now - lastCall));

    return pending;
  }) as (...args: Parameters<T>) => ReturnType<T> | undefined;
}

// --- Resource Management ---

/**
 * Async using pattern: acquire a resource, use it, ensure it's released.
 */
export async function using<T, R>(
  acquire: () => Promise<T>,
  fn: (resource: T) => Promise<R>,
  release?: (resource: T) => void | Promise<void>,
): Promise<R> {
  const resource = await acquire();
  try {
    return await fn(resource);
  } finally {
    await release?.(resource);
  }
}

// --- Promise States ---

/** Check if a value is a thenable (promise-like) */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as PromiseLike<unknown>).then === "function"
  );
}

/** Get the current state of a promise ("pending", "fulfilled", or "rejected") */
export function promiseState(promise: Promise<unknown>): Promise<"pending" | "fulfilled" | "rejected"> {
  // Create a wrapper that never resolves/rejects so we can check the race
  const wrapper = new Promise<{ state: string }>((resolve) => {
    Promise.race([
      promise.then(() => ({ state: "fulfilled" }), () => ({ state: "rejected" })),
      new Promise(() => {}), // Never resolves
    ]).then(resolve);
  });

  // Actually, simpler approach using a sentinel
  let settled = false;
  const sentinel = {};

  return Promise.race([
    promise.then(
      () => { settled = true; return "fulfilled"; },
      () => { settled = true; return "rejected"; },
    ),
    new Promise<string>((resolve) => {
      // Microtask to check if already settled
      queueMicrotask(() => {
        if (!settled) resolve("pending");
      });
    }),
  ]);
}
