/**
 * Limits: Rate limiting, throttling, debounce, concurrency control,
 * circuit breaking, quota management, and resource budget utilities.
 *
 * Provides:
 *   - Token bucket rate limiter
 *   - Sliding window rate limiter
 *   - Fixed window counter
 *   - Throttle (time-based and last-argument)
 *   - Debounce (leading/trailing edge)
 *   - Concurrency limiter (semaphore)
 *   - Circuit breaker (closed/open/half-open)
 *   - Quota manager (daily/monthly/resetting budgets)
 *   - Retry with budget awareness
 */

// --- Types ---

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Milliseconds until next request is allowed (0 if allowed now) */
  retryAfterMs: number;
  /** Total requests in current window */
  totalRequests: number;
  /** Remaining requests in current window */
  remaining: number;
}

export interface TokenBucketOptions {
  /** Maximum tokens in bucket */
  capacity: number;
  /** Refill rate (tokens per second) */
  refillRate: number;
  /** Initial tokens (default: capacity) */
  initialTokens?: number;
}

export interface SlidingWindowOptions {
  /** Max requests allowed in window */
  maxRequests: number;
  /** Window duration in ms */
  windowMs: number;
}

export interface ConcurrencyOptions {
  /** Maximum concurrent operations */
  maxConcurrent: number;
  /** Queue size limit (Infinity = unlimited) */
  queueSize?: number;
  /** Fairness strategy: "fifo" | "lifo" | "priority" */
  strategy?: "fifo" | "lifo" | "priority";
}

export interface CircuitBreakerOptions {
  /** Failures before opening circuit */
  failureThreshold: number;
  /** Time before attempting half-open (ms) */
  resetTimeoutMs: number;
  /** Successes required in half-open to close */
  halfOpenMaxAttempts: number;
  /** Time window for counting failures (ms) */
  failureWindowMs?: number;
}

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerInstance {
  /** Current state */
  state: CircuitState;
  /** Execute through the breaker */
  execute<T>(fn: () => Promise<T>): Promise<T>;
  /** Manually open the circuit */
  open: () => void;
  /** Manually close the circuit */
  close: () => void;
  /** Get stats */
  getStats: () => { failures: number; successes: number; rejects: number; lastFailure: number | null; state: CircuitState };
  /** Reset all stats */
  reset: () => void;
}

export interface QuotaOptions {
  /** Total quota amount */
  limit: number;
  /** Window duration in ms (e.g., 86400000 for daily) */
  windowMs: number;
  /** Key prefix for storage (for persistence) */
  storageKey?: string;
  /** Use localStorage for persistence across page loads */
  persist?: boolean;
}

// --- Token Bucket ---

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  readonly capacity: number;
  readonly refillRate: number;

  constructor(options: TokenBucketOptions) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.tokens = options.initialTokens ?? options.capacity;
    this.lastRefill = Date.now();
  }

  /** Try to consume tokens. Returns result with retry-after info */
  consume(count = 1): RateLimitResult {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return {
        allowed: true,
        retryAfterMs: 0,
        totalRequests: this.capacity - Math.round(this.tokens),
        remaining: Math.round(this.tokens),
      };
    }

    const deficit = count - this.tokens;
    const retryAfterMs = Math.ceil(deficit / this.refillRate * 1000);

    return {
      allowed: false,
      retryAfterMs,
      totalRequests: this.capacity - Math.round(this.tokens),
      remaining: Math.round(this.tokens),
    };
  }

  /** Check without consuming */
  peek(count = 1): boolean {
    this.refill();
    return this.tokens >= count;
  }

  /** Get current token count */
  get availableTokens(): number {
    this.refill();
    return Math.round(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}

// --- Sliding Window Log ---

export class SlidingWindowLimiter {
  private requests: number[] = [];
  readonly maxRequests: number;
  readonly windowMs: number;

  constructor(options: SlidingWindowOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;
  }

  consume(): RateLimitResult {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    // Prune old entries
    while (this.requests.length > 0 && this.requests[0]! <= cutoff) {
      this.requests.shift();
    }

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return {
        allowed: true,
        retryAfterMs: 0,
        totalRequests: this.requests.length,
        remaining: this.maxRequests - this.requests.length,
      };
    }

    // Calculate when oldest entry expires
    const oldest = this.requests[0]!;
    const retryAfter = oldest + this.windowMs - now;

    return {
      allowed: false,
      retryAfterMs: Math.max(1, retryAfter),
      totalRequests: this.requests.length,
      remaining: 0,
    };
  }
}

// --- Throttle ---

/** Throttle: only allow once per interval (trailing-edge fires delayed call) */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  intervalMs: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): (...args: T) => void {
  const { leading = true, trailing = true } = options;
  let lastCall = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;

  return (...args: T) => {
    const now = Date.now();

    if (leading && now - lastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
      return;
    }

    if (trailing) {
      if (trailingTimer) clearTimeout(trailingTimer);
      trailingTimer = setTimeout(() => {
        lastCall = Date.now();
        fn(...args);
        trailingTimer = null;
      }, intervalMs - (now - lastCall));
    }
  };
}

/** Throttle that returns the last-called arguments (useful for scroll handlers) */
export function throttleLast<T extends unknown[]>(
  fn: (...args: T) => void,
  intervalMs: number,
): (...args: T) => void {
  let lastArgs: T | null = null;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;

  return (...args: T) => {
    lastArgs = args;
    if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        if (lastArgs) fn(...lastArgs);
        trailingTimer = null;
      }, intervalMs);
    }
  };
}

// --- Debounce ---

/** Debounce: delay until calls stop for the given duration */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  waitMs: number,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {},
): { (...args: T): void; cancel: () => void; flush: () => void } {
  const { leading = false, trailing = true, maxWait } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: T | null = null;
  let lastThis: unknown;
  let invocations = 0;

  function invoke(): void {
    if (timer) { clearTimeout(timer); timer = null; }
    if (maxWaitTimer) { clearTimeout(maxWaitTimer); maxWaitTimer = null; }
    if (lastArgs !== null) fn.apply(lastThis as ThisParameterType<typeof fn>, lastArgs);
    lastArgs = null;
  }

  function debounced(...args: T): void {
    invocations++;
    lastArgs = args;
    lastThis = this;

    // Leading edge
    if (leading && invocations === 1 && !timer) {
      invoke();
      return;
    }

    // Clear existing timer
    if (timer) clearTimeout(timer);

    // Trailing edge
    timer = setTimeout(() => {
      timer = null;
      if (trailing) invoke();
    }, waitMs);

    // Max wait
    if (maxWait && !maxWaitTimer) {
      maxWaitTimer = setTimeout(() => {
        maxWaitTimer = null;
        invoke();
      }, maxWait);
    }
  }

  debounced.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (maxWaitTimer) { clearTimeout(maxWaitTimer); maxWaitTimer = null; }
    lastArgs = null;
    invocations = 0;
  };

  debounced.flush = () => {
    if (timer || maxWaitTimer) invoke();
  };

  return debounced;
}

// --- Concurrency Limiter (Semaphore) ---

export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void; priority?: number }> = [];
  readonly maxConcurrent: number;

  constructor(options: ConcurrencyOptions) {
    this.maxConcurrent = options.maxConcurrent;
  }

  /** Acquire a slot. Returns a release function. */
  acquire(): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (this.running < this.maxConcurrent) {
        this.running++;
        resolve(this.release.bind(this));
      } else {
        this.queue.push({ resolve: resolve as () => void, reject, priority: undefined });
        if (options?.queueSize !== undefined && this.queue.length > options.queueSize) {
          reject(new Error("Concurrency queue full"));
        }
      }
    });
  }

  /** Run a function with concurrency control */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try { return await fn(); } finally { release(); }
  }

  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next.resolve();
    } else {
      this.running--;
    }
  }

  /** Get current utilization */
  get stats() { return { running: this.running, queued: this.queue.length, available: this.maxConcurrent - this.running }; }
}

// --- Circuit Breaker ---

export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreakerInstance {
  let state: CircuitState = "closed";
  let failures = 0;
  let successes = 0;
  let rejects = 0;
  let lastFailure: number | null = null;
  let halfOpenAttempts = 0;
  let openedAt = 0;
  let failureHistory: number[] = [];

  async function execute<T>(fn: () => Promise<T>): Promise<T> {
    if (state === "open") {
      // Check if we should try half-open
      if (Date.now() - openedAt >= options.resetTimeoutMs) {
        state = "half-open";
        halfOpenAttempts = 0;
      } else {
        rejects++;
        throw new Error("Circuit breaker is open");
      }
    }

    try {
      const result = await fn();
      onSuccess();
      return result;
    } catch (err) {
      onFailure();
      throw err;
    }
  }

  function onSuccess(): void {
    successes++;
    if (state === "half-open") {
      halfOpenAttempts++;
      if (halfOpenAttempts >= options.halfOpenMaxAttempts) {
        state = "closed";
        failures = 0;
        failureHistory = [];
      }
    } else {
      // In closed state, decay failure count
      failures = Math.max(0, failures - 1);
    }
  }

  function onFailure(): void {
    failures++;
    lastFailure = Date.now();
    failureHistory.push(Date.now());

    // Prune old failures outside window
    const window = options.failureWindowMs ?? options.resetTimeoutMs * 2;
    const cutoff = Date.now() - window;
    failureHistory = failureHistory.filter((t) => t > cutoff);

    if (state === "closed" && failureHistory.length >= options.failureThreshold) {
      openCircuit();
    } else if (state === "half-open") {
      openCircuit();
    }
  }

  function openCircuit(): void {
    state = "open";
    openedAt = Date.now();
    halfOpenAttempts = 0;
  }

  function open(): void { openCircuit(); }
  function close(): void { state = "closed"; failures = 0; failureHistory = []; halfOpenAttempts = 0; }

  function getStats() {
    return { failures, successes, rejects, lastFailure, state };
  }

  function reset(): void { failures = 0; successes = 0; rejects = 0; lastFailure = null; state = "closed"; failureHistory = []; halfOpenAttempts = 0; openedAt = 0; }

  return { get state() { return state; }, execute, open, close, getStats, reset };
}

// --- Quota Manager ---

export class QuotaManager {
  private used = 0;
  private windowStart = Date.now();
  readonly limit: number;
  readonly windowMs: number;
  private storageKey?: string;
  private persist: boolean;

  constructor(options: QuotaOptions) {
    this.limit = options.limit;
    this.windowMs = options.windowMs;
    this.persist = options.persist ?? false;
    this.storageKey = options.storageKey;

    if (this.persist && this.storageKey && typeof localStorage !== "undefined") {
      this.loadFromStorage();
    }
  }

  /** Try to consume from quota */
  consume(amount = 1): RateLimitResult {
    this.rotateIfNeeded();

    if (this.used + amount <= this.limit) {
      this.used += amount;
      this.saveToStorage();
      return {
        allowed: true,
        retryAfterMs: 0,
        totalRequests: this.used,
        remaining: this.limit - this.used,
      };
    }

    const remaining = this.limit - this.used;
    const timeLeft = this.windowStart + this.windowMs - Date.now();
    return {
      allowed: false,
      retryAfterMs: Math.max(1, timeLeft),
      totalRequests: this.used,
      remaining: Math.max(0, remaining),
    };
  }

  /** Get current usage info */
  get usage() { this.rotateIfNeeded(); return { used: this.used, limit: this.limit, remaining: this.limit - this.used, percentUsed: Math.round((this.used / this.limit) * 100) }; }

  /** Reset quota manually */
  reset(): void { this.used = 0; this.windowStart = Date.now(); this.saveToStorage(); }

  private rotateIfNeeded(): void {
    if (Date.now() - this.windowStart >= this.windowMs) {
      this.used = 0;
      this.windowStart = Date.now();
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    if (!this.persist || !this.storageKey) return;
    try { localStorage.setItem(this.storageKey, JSON.stringify({ used: this.used, windowStart: this.windowStart })); } catch {}
  }

  private loadFromStorage(): void {
    if (!this.storageKey) return;
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) { const d = JSON.parse(raw); this.used = d.used ?? 0; this.windowStart = d.windowStart ?? Date.now(); }
    } catch {}
  }
}
