/**
 * React Promise Utilities: Promise management, async state tracking,
 * race conditions, cancellation, retry logic, and promise composition
 * for React applications.
 */

// --- Types ---

export type PromiseStatus = "pending" | "fulfilled" | "rejected";

export interface PromiseState<T> {
  status: PromiseStatus;
  data: T | null;
  error: Error | null;
}

export interface PromiseOptions<T> {
  /** The promise to track */
  promise: Promise<T>;
  /** Called on success */
  onSuccess?: (data: T) => void;
  /** Called on failure */
  onError?: (error: Error) => void;
  /** Called regardless of outcome */
  onSettled?: (state: PromiseState<T>) => void;
}

export interface RetryOptions {
  /** Maximum number of attempts */
  maxAttempts?: number;
  /** Delay between retries in ms (or function) */
  delayMs?: number | ((attempt: number) => number);
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Should retry predicate */
  shouldRetry?: (error: Error) => boolean;
  /** Called before each retry */
  onRetry?: (attempt: number, error: Error) => void;
}

// --- Promise State Tracker ---

/** Track the state of a promise over time */
export class PromiseTracker<T> {
  private _state: PromiseState<T> = { status: "pending", data: null, error: null };
  private listeners = new Set<(state: PromiseState<T>) => void>();

  get state(): PromiseState<T> { return this._state; }
  get isPending(): boolean { return this._state.status === "pending"; }
  get isFulfilled(): boolean { return this._state.status === "fulfilled"; }
  get isRejected(): boolean { return this._state.status === "rejected"; }
  get data(): T | null { return this._state.data; }
  get error(): Error | null { return this._state.error; }

  constructor(promise?: Promise<T>) {
    if (promise) this.track(promise);
  }

  /** Start tracking a new promise */
  track(promise: Promise<T>): this {
    this._state = { status: "pending", data: null, error: null };
    this.notify();

    promise
      .then((data) => {
        this._state = { status: "fulfilled", data, error: null };
        this.notify();
      })
      .catch((error) => {
        this._state = { status: "rejected", data: null, error: error instanceof Error ? error : new Error(String(error)) };
        this.notify();
      });

    return this;
  }

  /** Subscribe to state changes */
  subscribe(listener: (state: PromiseState<T>) => void): () => void {
    listener(this._state);
    this.listeners.add(listener);
    return (): void => { this.listeners.delete(listener); };
  }

  /** Reset to initial pending state */
  reset(): void {
    this._state = { status: "pending", data: null, error: null };
    this.notify();
  }

  private notify(): void {
    for (const fn of this.listeners) fn(this._state);
  }
}

/** Create a promise tracker */
export function createPromiseTracker<T>(promise?: Promise<T>): PromiseTracker<T> {
  return new PromiseTracker(promise);
}

// --- Retry Logic ---

/**
 * Retry a promise-returning function with configurable retry strategy.
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetchData(),
 *   { maxAttempts: 3, delayMs: 1000, backoffMultiplier: 2 },
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = (): boolean => true,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts && shouldRetry(lastError)) {
        const delay = typeof delayMs === "function" ? delayMs(attempt) : delayMs * Math.pow(backoffMultiplier, attempt - 1);
        onRetry?.(attempt, lastError);
        await sleep(delay);
      } else {
        throw lastError;
      }
    }
  }

  throw lastError!;
}

// --- Cancellation ---

/** Create a cancellable promise wrapper */
export function createCancellable<T>(promise: Promise<T>): {
  promise: Promise<T>;
  cancel: (reason?: string) => void;
  isCancelled: () => boolean;
} {
  let cancelled = false;
  let cancelReason: string | undefined;

  const wrapped = new Promise<T>((resolve, reject) => {
    promise.then(
      (data) => { if (!cancelled) resolve(data); else reject(new DOMException(cancelReason ?? "Cancelled")); },
      (error) => { if (!cancelled) reject(error); },
    );
  });

  return {
    promise: wrapped,
    cancel(reason?: string): void { cancelled = true; cancelReason = reason; },
    isCancelled: () => cancelled,
  };
}

// --- Timeout ---

/** Add a timeout to a promise */
export function withTimeout<T>(promise: Promise<T>, ms: number, message = "Operation timed out"): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// --- Race Conditions ---

/** Only use the result from the most recent call (ignores stale results) */
export function createLatestResolver<T>(): {
  run: (id: string, promise: Promise<T>) => Promise<T>;
  cancelAll: () => void;
} {
  let latestId = "";
  const activePromises = new Map<string, { cancelled: boolean }>();

  async function run(id: string, promise: Promise<T>): Promise<T> {
    latestId = id;
    const meta = { cancelled: false };
    activePromises.set(id, meta);

    try {
      const result = await promise;
      // Only return if still the latest
      if (latestId !== id || meta.cancelled) throw new StaleResultError();
      return result;
    } finally {
      activePromises.delete(id);
    }
  }

  function cancelAll(): void {
    for (const [, meta] of activePromises) meta.cancelled = true;
    activePromises.clear();
  }

  return { run, cancelAll };
}

class StaleResultError extends Error {
  constructor() { super("Stale result ignored"); this.name = "StaleResultError"; }
}

// --- Promise Composition ---

/** Run promises in sequence, collecting all results */
export async function sequence<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i++) {
    results.push(await fn(items[i]!, i));
  }
  return results;
}

/** Run promises with limited concurrency */
export async function parallelLimit<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency = 5,
): Promise<R[]> {
  const results: (R | undefined)[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx]!, idx);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return results as R[];
}

/** Resolve a value that might be a promise or not */
export function maybePromise<T>(value: T | Promise<T>): Promise<T> {
  return value instanceof Promise ? value : Promise.resolve(value);
}

// --- Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
