/**
 * Function utilities: memoization, composition, currying, partial application,
 * retry, timeout, promisify, once, debounce/throttle wrappers, and more.
 */

// --- Memoization ---

/** Memoize a function with optional cache key resolver and TTL */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: {
    /** Custom cache key resolver */
    keyFn?: (...args: Parameters<T>) => string;
    /** Cache TTL in ms (0 = no expiry) */
    ttl?: number;
    /** Max cache entries (0 = unlimited) */
    maxSize?: number;
  },
): T & { clear: () => void; size: () => number } {
  const cache = new Map<string, { value: unknown; expires: number }>();
  const { keyFn, ttl = 0, maxSize = 0 } = options ?? {};

  const memoized = ((...args: Parameters<T>): unknown => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);

    const cached = cache.get(key);
    if (cached) {
      if (ttl === 0 || Date.now() < cached.expires) return cached.value;
      cache.delete(key);
    }

    const value = fn(...args);

    if (maxSize > 0 && cache.size >= maxSize) {
      // Evict oldest entry
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }

    cache.set(key, {
      value,
      expires: ttl > 0 ? Date.now() + ttl : Infinity,
    });

    return value;
  }) as T & { clear: () => void; size: () => number };

  memoized.clear = () => cache.clear();
  memoized.size = () => cache.size;

  return memoized;
}

/** Simple memoize without options (caches by first argument) */
export function memoizeOne<T extends (...args: unknown[]) => unknown>(fn: T): T & { clear: () => void } {
  let cached: { args: Parameters<T>; value: unknown } | null = null;

  const memoized = ((...args: Parameters<T>): unknown => {
    if (cached && cached.args.length === args.length && cached.args.every((a, i) => a === args[i])) {
      return cached.value;
    }
    const value = fn(...args);
    cached = { args, value };
    return value;
  }) as T & { clear: () => void };

  memoized.clear = () => { cached = null; };
  return memoized;
}

// --- Once ---

/** Ensure a function only executes once. Subsequent calls return the cached result. */
export function once<T extends (...args: unknown[]) => unknown>(fn: T): T & { reset: () => void; called: boolean } {
  let called = false;
  let result: unknown;

  const onceFn = ((...args: Parameters<T>): unknown => {
    if (!called) {
      called = true;
      result = fn(...args);
    }
    return result;
  }) as T & { reset: () => void; called: boolean };

  Object.defineProperty(onceFn, "called", { get: () => called });
  onceFn.reset = () => { called = false; result = undefined; };

  return onceFn;
}

// --- Composition ---

/** Compose functions right-to-left: compose(f, g)(x) === f(g(x)) */
export function compose<A, B>(fn: (a: A) => B): (a: A) => B;
export function compose<A, B, C>(fn2: (b: B) => C, fn1: (a: A) => B): (a: A) => C;
export function compose<A, B, C, D>(
  fn3: (c: C) => D,
  fn2: (b: B) => C,
  fn1: (a: A) => B,
): (a: A) => D;
export function compose<A, B, C, D, E>(
  fn4: (d: D) => E,
  fn3: (c: C) => D,
  fn2: (b: B) => C,
  fn1: (a: A) => B,
): (a: A) => E;
export function compose(...fns: Array<(arg: unknown) => unknown>): (arg: unknown) => unknown {
  return fns.reduceRight(
    (acc, fn) => (arg: unknown) => fn(acc(arg)),
    (x: unknown) => x,
  ) as (arg: unknown) => unknown;
}

/** Pipe functions left-to-right: pipe(f, g)(x) === g(f(x)) */
export function pipe<A, B>(fn: (a: A) => B): (a: A) => B;
export function pipe<A, B, C>(fn1: (a: A) => B, fn2: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
): (a: A) => D;
export function pipe<A, B, C, D, E>(
  fn1: (a: A) => B,
  fn2: (b: B) => C,
  fn3: (c: C) => D,
  fn4: (d: D) => E,
): (a: A) => E;
export function pipe(...fns: Array<(arg: unknown) => unknown>): (arg: unknown) => unknown {
  return fns.reduce(
    (acc, fn) => (arg: unknown) => fn(acc(arg)),
    (x: unknown) => x,
  ) as (arg: unknown) => unknown;
}

// --- Currying ---

/** Curry a function to allow partial application */
export function curry<A, R>(fn: (a: A) => R): (a: A) => R;
export function curry<A, B, R>(fn: (a: A, b: B) => R): (a: A) => (b: B) => R;
export function curry<A, B, C, R>(fn: (a: A, b: B, c: C) => R): (a: A) => (b: B) => (c: C) => R;
export function curry<A, B, C, D, R>(
  fn: (a: A, b: B, c: C, d: D) => R,
): (a: A) => (b: B) => (c: C) => (d: D) => R;
export function curry(fn: (...args: unknown[]) => unknown, arity = fn.length): (...args: unknown[]) => unknown {
  return function curried(this: unknown, ...args: unknown[]): unknown {
    if (args.length >= arity) {
      return fn.apply(this, args);
    }
    return (...nextArgs: unknown[]) => curried.apply(this, [...args, ...nextArgs]);
  };
}

// --- Partial Application ---

/** Pre-fill some arguments of a function from the left */
export function partial<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ...presetArgs: unknown[]
): (...restArgs: unknown[]) => ReturnType<T> {
  return (...restArgs: unknown[]) => fn(...presetArgs, ...restArgs) as ReturnType<T>;
}

/** Pre-fill some arguments of a function from the right */
export function partialRight<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ...presetArgs: unknown[]
): (...restArgs: unknown[]) => ReturnType<T> {
  return (...restArgs: unknown[]) => fn(...restArgs, ...presetArgs) as ReturnType<T>;
}

// --- Retry ---

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Delay between retries in ms or backoff function (default: 1000) */
  delay?: number | ((attempt: number) => number);
  /** Whether to use exponential backoff (default: false) */
  exponentialBackoff?: boolean;
  /** Base delay for exponential backoff (default: 1000) */
  baseDelay?: number;
  /** Max delay cap for exponential backoff (default: 30000) */
  maxDelay?: number;
  /** Jitter: add random variation to delay (default: false) */
  jitter?: boolean;
  /** Predicate to determine if an error is retryable (default: always true) */
  shouldRetry?: (error: Error) => boolean;
  /** Callback before each retry attempt */
  onRetry?: (error: Error, attempt: number) => void;
}

/** Retry an async function with configurable backoff strategy */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay: delayOption = 1000,
    exponentialBackoff = false,
    baseDelay = 1000,
    maxDelay = 30_000,
    jitter = false,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === maxAttempts || !shouldRetry(lastError)) throw lastError;

      onRetry?.(lastError, attempt);

      let waitMs: number;
      if (exponentialBackoff) {
        waitMs = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      } else if (typeof delayOption === "function") {
        waitMs = delayOption(attempt);
      } else {
        waitMs = delayOption;
      }

      if (jitter) waitMs *= 0.5 + Math.random() * 0.5;

      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  throw lastError!;
}

// --- Timeout ---

/** Add a timeout to a promise */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = `Operation timed out after ${ms}ms`,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms),
    ),
  ]);
}

/** Wrap a synchronous function with a timeout using AbortController */
export function timeoutSync<T>(fn: () => T, ms: number): T {
  const start = Date.now();
  const result = fn();
  if (Date.now() - start > ms) {
    throw new Error(`Function execution exceeded ${ms}ms`);
  }
  return result;
}

// --- Promisify ---

/** Convert a callback-style function to return a Promise */
export function promisify<T extends (...args: unknown[]) => unknown>(
  fn: T,
): (...args: Parameters<T>) => Promise<unknown> {
  return (...args: Parameters<T>) =>
    new Promise((resolve, reject) => {
      try {
        const callback = (err: unknown, result: unknown) => {
          if (err) reject(err);
          else resolve(result);
        };
        fn(...args, callback);
      } catch (err) {
        reject(err);
      }
    });
}

// --- Arity Manipulation ---

/** Fix the arity of a function (useful after currying/composition) */
export function ary<T extends (...args: unknown[]) => unknown>(
  fn: T,
  n: number,
): (...args: unknown[]) => ReturnType<T> {
  return (...args: unknown[]) => fn(...args.slice(0, n)) as ReturnType<T>;
}

/** Unary version: force a function to accept only one argument */
export function unary<T extends (...args: unknown[]) => unknown>(fn: T): (arg: unknown) => ReturnType<T> {
  return (arg: unknown) => fn(arg) as ReturnType<T>;
}

/** No-op version: ignore all arguments */
export function noop(): void {}

/** Constant function: always returns the same value */
export function constant<T>(value: T): () => T {
  return () => value;
}

/** Identity function: returns its argument */
export function identity<T>(arg: T): T {
  return arg;
}

/** K-combinator: returns a function that ignores its argument and returns a fixed value */
export function K<T>(value: T): (_: unknown) => T {
  return (_) => value;
}

// --- Argument Flipping ---

/** Flip the first two arguments of a function */
export function flip<A, B, C>(fn: (a: A, b: B) => C): (b: B, a: A) => C {
  return (b: B, a: A) => fn(a, b);
}

// --- Negation ---

/** Return a function that negates the boolean result of the original */
export function not<T extends (...args: unknown[]) => boolean>(fn: T): (...args: Parameters<T>) => boolean {
  return (...args: Parameters<T>) => !fn(...args);
}

// --- Guard ---

/** Create a guard that checks a condition before calling the function */
export function guard<T extends (...args: unknown[]) => unknown>(
  condition: (...args: Parameters<T>) => boolean,
  fn: T,
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return (...args: Parameters<T>) => {
    if (condition(...args)) return fn(...args) as ReturnType<T>;
    return undefined;
  };
}

// --- Spread / Gather ---

/** Convert a function that takes an array argument into one that takes variadic arguments */
export function spread<T extends (args: unknown[]) => unknown>(fn: T): (...args: unknown[]) => ReturnType<T> {
  return (...args: unknown[]) => fn(args) as ReturnType<T>;
}

/** Convert a function that takes variadic arguments into one that takes an array */
export function gather<T extends (...args: unknown[]) => unknown>(fn: T): (args: unknown[]) => ReturnType<T> {
  return (args: unknown[]) => fn(...args) as ReturnType<T>;
}

// --- Tap / Side Effects ---

/** Execute a side-effect function with the value, then return the value */
export function tap<T>(fn: (value: T) => void): (value: T) => T {
  return (value: T) => { fn(value); return value; };
}

/** Execute a side-effect function with the value, then return a transformed value */
export function thru<T, U>(value: T, fn: (value: T) => U): U {
  return fn(value);
}

// --- Timing ---

/** Measure execution time of a sync function */
export function time<T>(fn: () => T): { result: T; elapsedMs: number } {
  const start = performance.now();
  const result = fn();
  return { result, elapsedMs: Math.round((performance.now() - start) * 1000) / 1000 };
}

/** Measure execution time of an async function */
export async function timeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; elapsedMs: number }> {
  const start = performance.now();
  const result = await fn();
  return { result, elapsedMs: Math.round((performance.now() - start) * 1000) / 1000 };
}
