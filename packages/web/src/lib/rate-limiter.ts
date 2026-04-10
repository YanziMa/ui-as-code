/**
 * @module rate-limiter
 * @description Comprehensive rate limiting, throttling, and resilience utilities.
 *
 * Provides multiple rate-limiting algorithms (token bucket, sliding window, fixed window,
 * leaky bucket), throttling primitives (debounce, throttle with leading/trailing edges),
 * resilience patterns (circuit breaker, bulkhead, adaptive limiter), request coalescing,
 * priority queuing, distributed (Redis-compatible) limiting, and statistics monitoring.
 *
 * **Throttle vs Rate Limit distinction:**
 * - **Throttle** delays execution to enforce a maximum call frequency; every call eventually runs.
 * - **Rate Limit** rejects calls that exceed a configured threshold; excess calls are dropped.
 */

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

/** Result of a rate-limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed through. */
  allowed: boolean;
  /** Remaining capacity in the current window / bucket. */
  remaining: number;
  /** Timestamp (ms since epoch) when the next reset occurs. */
  resetAt: number;
  /** If not allowed, how many ms until the caller should retry. */
  retryAfterMs: number | null;
}

/** Configuration shared by most rate limiters. */
export interface BaseRateLimitConfig {
  /** Maximum number of requests allowed per window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

/** Per-key state for token bucket. */
interface TokenBucketState {
  tokens: number;
  lastRefill: number;
}

/** Per-key state for sliding-window log. */
interface SlidingWindowState {
  timestamps: number[];
}

/** Per-key state for fixed-window counter. */
interface FixedWindowState {
  count: number;
  windowStart: number;
}

/** Per-key state for leaky bucket. */
interface LeakyBucketState {
  queue: number[];
  lastLeak: number;
}

/** Circuit breaker states. */
export type CircuitState = 'closed' | 'open' | 'half-open';

/** Statistics snapshot for monitoring. */
export interface RateLimiterStats {
  totalRequests: number;
  allowedRequests: number;
  rejectedRequests: number;
  hitRate: number;
  rejectionRate: number;
  averageWaitTimeMs: number;
  currentUtilization: number;
  activeKeys: number;
}

// ---------------------------------------------------------------------------
// 1. Token Bucket Algorithm
// ---------------------------------------------------------------------------

/**
 * Token Bucket rate limiter.
 *
 * Allows burst traffic up to `capacity`, then refills at a steady `refillRate`.
 * Each key gets its own independent bucket (per-key limiting).
 *
 * @example
 * ```ts
 * const limiter = new TokenBucketRateLimiter({ capacity: 10, refillPerSecond: 5 });
 * const result = limiter.check('user:42');
 * if (!result.allowed) await sleep(result.retryAfterMs!);
 * ```
 */
export class TokenBucketRateLimiter {
  private buckets = new Map<string, TokenBucketState>();
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per millisecond

  constructor(
    public readonly config: { capacity: number; refillPerSecond: number } = {
      capacity: 10,
      refillPerSecond: 1,
    },
  ) {
    this.capacity = config.capacity;
    this.refillRate = config.refillPerSecond / 1000;
  }

  /**
   * Consume one token from the bucket identified by `key`.
   * Returns whether the request is allowed and metadata about remaining capacity.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed * this.refillRate);
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const allowed = bucket.tokens >= 1;

    if (allowed) {
      bucket.tokens -= 1;
    }

    const timeToRefill = allowed ? 0 : Math.ceil((1 - bucket.tokens) / this.refillRate);

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      resetAt: now + timeToRefill,
      retryAfterMs: allowed ? null : timeToRefill,
    };
  }

  /** Try to consume `count` tokens atomically (for batch operations). */
  tryConsume(key: string, count: number): RateLimitResult {
    if (count <= 0) return this.check(key);

    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed * this.refillRate);
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    const allowed = bucket.tokens >= count;

    if (allowed) {
      bucket.tokens -= count;
    }

    const timeToRefill = allowed ? 0 : Math.ceil((count - bucket.tokens) / this.refillRate);

    return {
      allowed,
      remaining: Math.floor(bucket.tokens),
      resetAt: now + timeToRefill,
      retryAfterMs: allowed ? null : timeToRefill,
    };
  }

  /** Reset the bucket for a specific key. */
  reset(key: string): void {
    this.buckets.delete(key);
  }

  /** Remove all buckets. */
  clear(): void {
    this.buckets.clear();
  }
}

// ---------------------------------------------------------------------------
// 2. Sliding Window Log
// ---------------------------------------------------------------------------

/**
 * Sliding Window Log rate limiter.
 *
 * Stores a timestamp for each request within the rolling window. Precise but
 * memory-intensive for high-throughput keys. Includes automatic cleanup of
 * expired entries on every check.
 *
 * @example
 * ```ts
 * const limiter = new SlidingWindowLogRateLimiter({ maxRequests: 100, windowMs: 60_000 });
 * ```
 */
export class SlidingWindowLogRateLimiter implements StatsTrackable {
  private windows = new Map<string, SlidingWindowState>();
  private stats: InternalStats;

  constructor(public readonly config: BaseRateLimitConfig = { maxRequests: 100, windowMs: 60_000 }) {
    this.stats = createInternalStats();
  }

  /**
   * Check if a request is allowed for `key`. Records a timestamp entry if allowed.
   * Automatically prunes expired entries from the log.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let state = this.windows.get(key);
    if (!state) {
      state = { timestamps: [] };
      this.windows.set(key, state);
    }

    // Prune expired entries (memory-efficient cleanup)
    state.timestamps = state.timestamps.filter((t) => t > windowStart);

    const used = state.timestamps.length;
    const remaining = Math.max(0, this.config.maxRequests - used);
    const allowed = remaining > 0;

    this.stats.totalRequests++;
    if (allowed) {
      state.timestamps.push(now);
      this.stats.allowedRequests++;
    } else {
      this.stats.rejectedRequests++;
    }

    const oldestInWindow = state.timestamps.length > 0 ? state.timestamps[0] : now;
    const resetAt = oldestInWindow + this.config.windowMs;

    return {
      allowed,
      remaining,
      resetAt,
      retryAfterMs: allowed ? null : resetAt - now,
    };
  }

  /** Get current usage without consuming a slot. */
  peek(key: string): { used: number; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const timestamps = (this.windows.get(key)?.timestamps ?? []).filter((t) => t > windowStart);
    return {
      used: timestamps.length,
      remaining: Math.max(0, this.config.maxRequests - timestamps.length),
      resetAt: timestamps.length > 0 ? timestamps[0] + this.config.windowMs : now + this.config.windowMs,
    };
  }

  /** Reset limits for a specific key. */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /** Bulk cleanup of all expired entries across all keys. Call periodically. */
  cleanup(): void {
    const now = Date.now();
    const threshold = now - this.config.windowMs * 2;

    for (const [key, state] of this.windows) {
      state.timestamps = state.timestamps.filter((t) => t > threshold);
      if (state.timestamps.length === 0) {
        this.windows.delete(key);
      }
    }
  }

  getStats(): RateLimiterStats {
    return buildStats(this.stats, this.windows.size);
  }

  resetStats(): void {
    this.stats = createInternalStats();
  }
}

// ---------------------------------------------------------------------------
// 3. Sliding Window Counter
// ---------------------------------------------------------------------------

/**
 * Sliding Window Counter rate limiter (hybrid approach).
 *
 * Uses two fixed windows (current and previous) with weighted overlap calculation.
 * More memory-efficient than the log version while avoiding boundary bursts
 * inherent to pure fixed windows.
 *
 * The formula: `currentCount + previousCount * overlapRatio`
 *
 * @example
 * ```ts
 * const limiter = new SlidingWindowCounterRateLimiter({ maxRequests: 100, windowMs: 60_000 });
 * ```
 */
export class SlidingWindowCounterRateLimiter implements StatsTrackable {
  private counters = new Map<string, { current: FixedWindowState; previous: FixedWindowState | null }>();
  private stats: InternalStats;

  constructor(public readonly config: BaseRateLimitConfig = { maxRequests: 100, windowMs: 60_000 }) {
    this.stats = createInternalStats();
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    let entry = this.counters.get(key);

    if (!entry) {
      entry = {
        current: { count: 0, windowStart: now },
        previous: null,
      };
      this.counters.set(key, entry);
    }

    // Advance windows if needed
    const elapsedCurrent = now - entry.current.windowStart;
    if (elapsedCurrent >= this.config.windowMs) {
      // Current window has rolled over — shift it to previous
      entry.previous = { ...entry.current };
      entry.current = { count: 0, windowStart: entry.current.windowStart + this.config.windowMs };

      // Handle case where we've skipped more than one window
      while (now - entry.current.windowStart >= this.config.windowMs) {
        entry.previous = { ...entry.current };
        entry.current = { count: 0, windowStart: entry.current.windowStart + this.config.windowMs };
      }
    }

    // Weighted estimate: current count + fraction of previous window's count
    const elapsedIntoCurrent = now - entry.current.windowStart;
    const overlapRatio = 1 - elapsedIntoCurrent / this.config.windowMs;
    const prevWeighted = entry.previous ? Math.round(entry.previous.count * overlapRatio) : 0;
    const estimatedCount = entry.current.count + prevWeighted;

    const allowed = estimatedCount < this.config.maxRequests;

    this.stats.totalRequests++;
    if (allowed) {
      entry.current.count++;
      this.stats.allowedRequests++;
    } else {
      this.stats.rejectedRequests++;
    }

    const remaining = Math.max(0, this.config.maxRequests - estimatedCount - (allowed ? 1 : 0));

    return {
      allowed,
      remaining,
      resetAt: entry.current.windowStart + this.config.windowMs,
      retryAfterMs: allowed ? null : entry.current.windowStart + this.config.windowMs - now,
    };
  }

  reset(key: string): void {
    this.counters.delete(key);
  }

  getStats(): RateLimiterStats {
    return buildStats(this.stats, this.counters.size);
  }

  resetStats(): void {
    this.stats = createInternalStats();
  }
}

// ---------------------------------------------------------------------------
// 4. Fixed Window Counter
// ---------------------------------------------------------------------------

/**
 * Fixed Window Counter rate limiter.
 *
 * Simple counter that resets at the start of each fixed time interval.
 * Easy to understand and very fast, but can allow up to `2 * maxRequests`
 * bursts at window boundaries.
 *
 * @example
 * ```ts
 * const limiter = new FixedWindowRateLimiter({ maxRequests: 100, windowMs: 60_000 });
 * ```
 */
export class FixedWindowRateLimiter implements StatsTrackable {
  private counters = new Map<string, FixedWindowState>();
  private stats: InternalStats;

  constructor(public readonly config: BaseRateLimitConfig = { maxRequests: 100, windowMs: 60_000 }) {
    this.stats = createInternalStats();
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    let entry = this.counters.get(key);

    // Start a new window if none exists or the current one has expired
    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      entry = { count: 0, windowStart: now };
      this.counters.set(key, entry);
    }

    const allowed = entry.count < this.config.maxRequests;

    this.stats.totalRequests++;
    if (allowed) {
      entry.count++;
      this.stats.allowedRequests++;
    } else {
      this.stats.rejectedRequests++;
    }

    return {
      allowed,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetAt: entry.windowStart + this.config.windowMs,
      retryAfterMs: allowed ? null : entry.windowStart + this.config.windowMs - now,
    };
  }

  reset(key: string): void {
    this.counters.delete(key);
  }

  getStats(): RateLimiterStats {
    return buildStats(this.stats, this.counters.size);
  }

  resetStats(): void {
    this.stats = createInternalStats();
  }
}

// ---------------------------------------------------------------------------
// 5. Leaky Bucket
// ---------------------------------------------------------------------------

/**
 * Leaky Bucket rate limiter (queue-based).
 *
 * Smooths output to a constant rate regardless of input burstiness.
 * Requests are placed in a queue and "leaked" out at a fixed interval.
 * When the queue is full, new requests are rejected.
 *
 * @example
 * ```ts
 * const limiter = new LeakyBucketRateLimiter({ capacity: 10, leakIntervalMs: 100 });
 * ```
 */
export class LeakyBucketRateLimiter implements StatsTrackable {
  private buckets = new Map<string, LeakyBucketState>();
  private stats: InternalStats;

  constructor(
    public readonly config: { capacity: number; leakIntervalMs: number } = {
      capacity: 10,
      leakIntervalMs: 100,
    },
  ) {
    this.stats = createInternalStats();
  }

  /**
   * Attempt to add a request to the bucket queue.
   * Leaks (removes) items based on elapsed time before checking capacity.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { queue: [], lastLeak: now };
      this.buckets.set(key, bucket);
    }

    // Leak items based on elapsed time
    const elapsed = now - bucket.lastLeak;
    const leaks = Math.floor(elapsed / this.config.leakIntervalMs);
    if (leaks > 0) {
      bucket.queue = bucket.queue.slice(leaks);
      bucket.lastLeak += leaks * this.config.leakIntervalMs;
    }

    const currentSize = bucket.queue.length;
    const allowed = currentSize < this.config.capacity;

    this.stats.totalRequests++;
    if (allowed) {
      bucket.queue.push(now);
      this.stats.allowedRequests++;
    } else {
      this.stats.rejectedRequests++;
    }

    const nextLeakTime = bucket.lastLeak + this.config.leakIntervalMs;
    const waitTime = bucket.queue.length > 0
      ? bucket.queue[0] + this.config.leakIntervalMs * (bucket.queue.length) - now
      : 0;

    return {
      allowed,
      remaining: Math.max(0, this.config.capacity - bucket.queue.length),
      resetAt: nextLeakTime,
      retryAfterMs: allowed ? null : Math.max(1, waitTime),
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  getStats(): RateLimiterStats {
    return buildStats(this.stats, this.buckets.size);
  }

  resetStats(): void {
    this.stats = createInternalStats();
  }
}

// ---------------------------------------------------------------------------
// 6. Adaptive Rate Limiter
// ---------------------------------------------------------------------------

/** Response from an adaptive limiter attempt. */
export interface AdaptiveLimitResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  retryAfterMs: number | null;
  adaptedLimit: number;
}

/** Options for the adaptive rate limiter. */
export interface AdaptiveLimiterOptions {
  /** Initial requests-per-second limit. */
  initialRps: number;
  /** Minimum RPS floor (never go below this). */
  minRps: number;
  /** Maximum RPS ceiling. */
  maxRps: number;
  /** Multiplier applied to limit when a 429 is received (e.g., 0.5 halves). */
  backoffMultiplier: number;
  /** Multiplier applied when requests succeed (gradual recovery). */
  recoveryMultiplier: number;
  /** How many consecutive successes before starting to increase limit again. */
  successThreshold: number;
}

/**
 * Adaptive Rate Limiter.
 *
 * Automatically adjusts its rate limit based on server responses. On HTTP 429
 * (Too Many Requests) it backs off using the `Retry-After` header (or a default)
 * and reduces its internal limit. On successful responses it gradually recovers.
 *
 * Wraps an arbitrary async function and handles retries transparently.
 *
 * @example
 * ```ts
 * const adaptive = new AdaptiveRateLimiter(async (url) => fetch(url), {
 *   initialRps: 10,
 *   minRps: 1,
 *   maxRps: 50,
 * });
 * const result = await adaptive.execute('https://api.example.com/data');
 * ```
 */
export class AdaptiveRateLimiter<TArgs extends unknown[] = any[], TReturn = any> {
  private currentRps: number;
  private consecutiveSuccesses = 0;
  private lastRequestTime = 0;
  private pendingRetryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private fn: (...args: TArgs) => Promise<TReturn>,
    public readonly options: AdaptiveLimiterOptions = {
      initialRps: 10,
      minRps: 1,
      maxRps: 100,
      backoffMultiplier: 0.5,
      recoveryMultiplier: 1.05,
      successThreshold: 5,
    },
  ) {
    this.currentRps = options.initialRps;
  }

  /** Execute the wrapped function with adaptive rate limiting. */
  async execute(...args: TArgs): Promise<AdaptiveLimitResult<TReturn>> {
    // Enforce minimum inter-request delay based on current RPS
    const minDelay = 1000 / this.currentRps;
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < minDelay) {
      await sleep(minDelay - elapsed);
    }

    this.lastRequestTime = Date.now();

    try {
      const data = await this.fn(...args);
      this.onSuccess();
      return {
        success: true,
        data,
        retryAfterMs: null,
        adaptedLimit: this.currentRps,
      };
    } catch (error) {
      const result = this.onError(error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        retryAfterMs: result.retryAfterMs,
        adaptedLimit: this.currentRps,
      };
    }
  }

  /** Handle a successful response — gradually recover the limit. */
  private onSuccess(): void {
    this.consecutiveSuccesses++;
    if (
      this.consecutiveSuccesses >= this.options.successThreshold &&
      this.currentRps < this.options.maxRps
    ) {
      this.currentRps = Math.min(
        this.options.maxRps,
        Math.round(this.currentRps * this.options.recoveryMultiplier * 100) / 100,
      );
      this.consecutiveSuccesses = 0;
    }
  }

  /** Handle an error — detect 429 and back off. */
  private onError(error: unknown): { retryAfterMs: number } {
    this.consecutiveSuccesses = 0;
    let retryAfterMs = 1000; // default 1 second

    // Try to extract Retry-After from HTTP errors
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;
      const status = err.status ?? err.statusCode;
      if (status === 429) {
        // Check for Retry-After header in common shapes
        const headers = err.headers as Record<string, string> | undefined;
        if (headers?.['retry-after']) {
          const retryVal = parseInt(headers['retry-after'], 10);
          if (!isNaN(retryVal)) retryAfterMs = retryVal * 1000;
        }

        // Reduce limit
        this.currentRps = Math.max(
          this.options.minRps,
          Math.round(this.currentRps * this.options.backoffMultiplier * 100) / 100,
        );
      }
    }

    return { retryAfterMs };
  }

  /** Get the current adapted RPS limit. */
  getCurrentLimit(): number {
    return this.currentRps;
  }

  /** Manually set the RPS limit (e.g., from server-provided headers). */
  setLimit(rps: number): void {
    this.currentRps = Math.max(this.options.minRps, Math.min(this.options.maxRps, rps));
  }

  /** Reset to initial state. */
  reset(): void {
    this.currentRps = this.options.initialRps;
    this.consecutiveSuccesses = 0;
    this.lastRequestTime = 0;
    if (this.pendingRetryTimer) {
      clearTimeout(this.pendingRetryTimer);
      this.pendingRetryTimer = null;
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Circuit Breaker Pattern
// ---------------------------------------------------------------------------

/** Circuit breaker configuration. */
export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit. */
  failureThreshold: number;
  /** How long (ms) to stay open before trying half-open. */
  recoveryTimeoutMs: number;
  /** Number of successes in half-open needed to close the circuit again. */
  halfOpenMaxAttempts: number;
  /** Optional function to determine if an error counts as a failure. */
  isFailure?: (error: unknown) => boolean;
}

/** Result of executing through the circuit breaker. */
export interface CircuitBreakerResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  state: CircuitState;
  rejectedByCircuit: boolean;
}

/**
 * Circuit Breaker.
 *
 * Protects against cascading failures by tripping "open" after too many
 * consecutive failures. In the open state, calls fail immediately without
 * executing the underlying function. After a timeout, enters half-open state
 * to test whether the downstream service has recovered.
 *
 * @example
 * ```ts
 * const cb = new CircuitBreaker(fetchData, {
 *   failureThreshold: 5,
 *   recoveryTimeoutMs: 30_000,
 * });
 * const result = await cb.execute('https://api.example.com');
 * if (result.rejectedByCircuit) console.log('Circuit is open — skipping');
 * ```
 */
export class CircuitBreaker<TArgs extends unknown[] = any[], TReturn = any> {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private halfOpenSuccesses = 0;
  private lastFailureTime = 0;
  private totalExecutions = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(
    private fn: (...args: TArgs) => Promise<TReturn>,
    public readonly config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeoutMs: 30_000,
      halfOpenMaxAttempts: 1,
    },
  ) {}

  /** Execute through the circuit breaker. */
  async execute(...args: TArgs): Promise<CircuitBreakerResult<TReturn>> {
    this.totalExecutions++;

    // Open → fail fast
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeoutMs) {
        return {
          success: false,
          error: new Error('Circuit breaker is open'),
          state: 'open',
          rejectedByCircuit: true,
        };
      }
      // Timeout elapsed → transition to half-open
      this.state = 'half-open';
      this.halfOpenSuccesses = 0;
    }

    try {
      const data = await this.fn(...args);
      this.onSuccess();
      return { success: true, data, state: this.state, rejectedByCircuit: false };
    } catch (error) {
      this.onFailure(error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        state: this.state,
        rejectedByCircuit: false,
      };
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    this.failureCount = 0;

    if (this.state === 'half-open') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenMaxAttempts) {
        this.state = 'closed';
      }
    }
  }

  private onFailure(error: unknown): void {
    const isFailure = this.config.isFailure ?? ((e: unknown) => e !== null && e !== undefined);
    if (!isFailure(error)) {
      // Non-failure error (e.g., validation) doesn't trip the breaker
      return;
    }

    this.totalFailures++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open'; // Go back to open immediately on any failure in half-open
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  /** Get the current circuit state. */
  getState(): CircuitState {
    // Auto-check transition from open → half-open
    if (this.state === 'open' && Date.now() - this.lastFailureTime >= this.config.recoveryTimeoutMs) {
      this.state = 'half-open';
      this.halfOpenSuccesses = 0;
    }
    return this.state;
  }

  /** Force the circuit into a specific state (useful for testing or admin). */
  setState(state: CircuitState): void {
    this.state = state;
    if (state === 'closed') {
      this.failureCount = 0;
      this.halfOpenSuccesses = 0;
    }
  }

  /** Get execution statistics. */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    totalExecutions: number;
    totalSuccesses: number;
    totalFailures: number;
    successRate: number;
  } {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      totalExecutions: this.totalExecutions,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      successRate: this.totalExecutions > 0 ? this.totalSuccesses / this.totalExecutions : 1,
    };
  }

  /** Reset the breaker to its initial closed state. */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailureTime = 0;
    this.totalExecutions = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
  }
}

// ---------------------------------------------------------------------------
// 8. Bulkhead Pattern
// ---------------------------------------------------------------------------

/** Bulkhead configuration. */
export interface BulkheadConfig {
  /** Max concurrent executions allowed. */
  maxConcurrent: number;
  /** Max number of queued waiting requests (beyond this, reject). */
  maxQueueSize: number;
}

/** Result of a bulkhead execution. */
export interface BulkheadResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  rejected: boolean; // true if queue was full
}

/**
 * Bulkhead (semaphore-style concurrency limiter).
 *
 * Isolates resource consumption by limiting concurrent executions and capping
 * the wait queue. Prevents one slow/failing subsystem from exhausting all
 * resources (threads, connections, etc.).
 *
 * @example
 * ```ts
 * const bulkhead = new Bulkhead(fetchFromExternalService, {
 *   maxConcurrent: 5,
 *   maxQueueSize: 20,
 * });
 * const result = await bulkhead.execute('https://slow-api.example.com');
 * ```
 */
export class Bulkhead<TArgs extends unknown[] = any[], TReturn = any> {
  private running = 0;
  private queue: Array<{
    resolve: (result: BulkheadResult<TReturn>) => void;
    args: TArgs;
  }> = [];
  private totalExecuted = 0;
  totalRejected = 0;

  constructor(
    private fn: (...args: TArgs) => Promise<TReturn>,
    public readonly config: BulkheadConfig = { maxConcurrent: 10, maxQueueSize: 50 },
  ) {}

  /** Execute with bulkhead protection. Resolves when the function completes or is rejected. */
  async execute(...args: TArgs): Promise<BulkheadResult<TReturn>> {
    // Fast path: room to run immediately
    if (this.running < this.config.maxConcurrent) {
      return this.run(args);
    }

    // Queue path
    if (this.queue.length >= this.config.maxQueueSize) {
      this.totalRejected++;
      return {
        success: false,
        error: new Error('Bulkhead queue full — request rejected'),
        rejected: true,
      };
    }

    return new Promise<BulkheadResult<TReturn>>((resolve) => {
      this.queue.push({ resolve, args });
    });
  }

  private async run(args: TArgs): Promise<BulkheadResult<TReturn>> {
    this.running++;
    this.totalExecuted++;

    try {
      const data = await this.fn(...args);
      return { success: true, data, rejected: false };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        rejected: false,
      };
    } finally {
      this.running--;
      this.drainQueue();
    }
  }

  private drainQueue(): void {
    while (this.queue.length > 0 && this.running < this.config.maxConcurrent) {
      const next = this.queue.shift()!;
      this.run(next.args).then(next.resolve);
    }
  }

  /** Get current utilization info. */
  getStatus(): { running: number; queued: number; totalExecuted: number; totalRejected: number } {
    return {
      running: this.running,
      queued: this.queue.length,
      totalExecuted: this.totalExecuted,
      totalRejected: this.totalRejected,
    };
  }

  /** Reset counters (does not cancel in-flight work). */
  reset(): void {
    // Reject all queued items
    for (const item of this.queue) {
      item.resolve({
        success: false,
        error: new Error('Bulkhead reset'),
        rejected: true,
      });
    }
    this.queue = [];
    this.totalRejected = 0;
    this.totalExecuted = 0;
  }
}

// ---------------------------------------------------------------------------
// 9 & 10. Throttle vs Rate Limit + Debounce + Throttle (function-level)
// ---------------------------------------------------------------------------

/** Options for throttle/debounce utilities. */
export interface ThrottleOptions {
  /** Leading edge: invoke on the leading edge of the timeout. Default true. */
  leading?: boolean;
  /** Trailing edge: invoke on the trailing edge. Default true for debounce, false for throttle. */
  trailing?: boolean;
}

/**
 * Creates a debounced function that delays invoking `fn` until after `waitMs`
 * milliseconds have elapsed since the last call.
 *
 * Supports leading/trailing edge invocation, cancellation, and flushing.
 *
 * @example
 * ```ts
 * const debouncedSearch = debounce((query) => searchAPI(query), 300);
 * debouncedSearch('hello'); // cancelled after 300ms of no calls
 * debouncedSearch.cancel(); // cancel pending invocation
 * debouncedSearch.flush(); // invoke immediately if pending
 * ```
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number,
  options: ThrottleOptions = {},
): ((...args: TArgs) => void) & { cancel: () => void; flush: () => void } {
  const { leading = false, trailing = true } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let invokedLeading = false;
  let lastArgs: TArgs | null = null;

  function debounced(...args: TArgs): void {
    lastArgs = args;
    invokedLeading = false;

    if (timer !== null) {
      clearTimeout(timer);
    }

    if (leading && timer === null) {
      fn(...args);
      invokedLeading = true;
    }

    if (trailing) {
      timer = setTimeout(() => {
        timer = null;
        if ((!invokedLeading || trailing) && lastArgs) {
          fn(...lastArgs);
        }
        lastArgs = null;
      }, waitMs);
    }
  }

  debounced.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
    invokedLeading = false;
  };

  debounced.flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return debounced;
}

/**
 * Creates a throttled function that only invokes `fn` at most once per
 * `intervalMs` milliseconds.
 *
 * **Throttle** = delay/shape execution so it runs at most N times per period.
 * Every call will eventually result in an execution (on trailing edge if needed).
 * This is distinct from **rate limiting**, which drops excess calls entirely.
 *
 * @example
 * ```ts
 * const throttledScroll = throttle(handleScroll, 100, { leading: true, trailing: true });
 * window.addEventListener('scroll', throttledScroll);
 * ```
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  intervalMs: number,
  options: ThrottleOptions = {},
): ((...args: TArgs) => void) & { cancel: () => void; flush: () => void } {
  const { leading = true, trailing = false } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;
  let lastArgs: TArgs | null = null;

  function throttled(...args: TArgs): void {
    const now = Date.now();
    lastArgs = args;

    if (leading && now - lastCallTime >= intervalMs) {
      lastCallTime = now;
      fn(...args);
      return;
    }

    if (trailing && timer === null) {
      const remaining = intervalMs - (now - lastCallTime);
      timer = setTimeout(() => {
        timer = null;
        lastCallTime = Date.now();
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, remaining);
    }
  }

  throttled.cancel = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  throttled.flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
      lastCallTime = Date.now();
    }
  };

  return throttled;
}

// ---------------------------------------------------------------------------
// 11. Request Coalescing
// ---------------------------------------------------------------------------

/** Entry for an in-flight coalesced request. */
interface CoalescedEntry<T> {
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

/**
 * Request Coalescer.
 *
 * Merges identical in-flight requests into a single actual execution. All callers
 * that request the same key while a request is already in flight share the same
 * promise — the response is fanned out to all waiters.
 *
 * Useful for preventing duplicate API calls for the same resource (e.g., multiple
 * components fetching the same user profile simultaneously).
 *
 * @example
 * ```ts
 * const coalescer = new RequestCoalescer<string, UserProfile>();
 * // Both callers share a single fetch:
 * const [p1, p2] = [
 *   coalescer.execute('user:42', () => fetchProfile('42')),
 *   coalescer.execute('user:42', () => fetchProfile('42')), // deduplicated!
 * ];
 * ```
 */
export class RequestCoalescer<TKey = string, TResult = any> {
  private inflight = new Map<TKey, CoalescedEntry<TResult>[]>();

  /**
   * Execute `fn` for `key`, coalescing with any existing in-flight request
   * for the same key.
   */
  execute(key: TKey, fn: () => Promise<TResult>): Promise<TResult> {
    const existing = this.inflight.get(key);

    if (existing) {
      // Join the existing in-flight request
      return new Promise<TResult>((resolve, reject) => {
        existing!.push({ resolve, reject });
      });
    }

    // First caller — initiate the request
    const waiters: CoalescedEntry<TResult>[] = [];
    this.inflight.set(key, waiters);

    const promise = fn();

    promise
      .then((result) => {
        for (const waiter of waiters) {
          waiter.resolve(result);
        }
      })
      .catch((error) => {
        for (const waiter of waiters) {
          waiter.reject(error);
        }
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    return promise;
  }

  /** Check if a request is currently in flight for the given key. */
  isInFlight(key: TKey): boolean {
    return this.inflight.has(key);
  }

  /** Get the number of currently in-flight unique keys. */
  getInFlightCount(): number {
    return this.inflight.size;
  }

  /** Cancel all in-flight requests (rejects all waiters). */
  cancelAll(reason = new Error('Request coalescer cancelled')): void {
    for (const [, waiters] of this.inflight) {
      for (const waiter of waiters) {
        waiter.reject(reason);
      }
    }
    this.inflight.clear();
  }
}

// ---------------------------------------------------------------------------
// 12. Priority Queue
// ---------------------------------------------------------------------------

/** Priority levels (lower number = higher priority). */
export enum Priority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4,
}

/** A prioritized request waiting in the queue. */
interface PriorityEntry<T> {
  priority: Priority;
  data: T;
  resolve: (result: any) => void;
  reject: (error: unknown) => void;
  timestamp: number;
}

/** Priority queue configuration. */
export interface PriorityQueueOptions {
  /** Maximum number of entries in the queue. Default Infinity. */
  maxSize?: number;
  /** When true, lower-priority entries are evicted to make room for higher-priority ones. */
  evictLowerPriority?: boolean;
}

/**
 * Priority-aware rate-limited queue.
 *
 * Higher-priority requests are dispatched first. When the queue is near capacity,
 * lower-priority requests may be rejected or evicted to make room for critical ones.
 *
 * @example
 * ```ts
 * const pq = new PriorityQueue<string>({ maxSize: 100, evictLowerPriority: true });
 * pq.enqueue(Priority.HIGH, 'important-task', async () => { ... });
 * pq.enqueue(Priority.LOW, 'cleanup-task', async () => { ... }); // may be evicted
 * ```
 */
export class PriorityQueue<T = any> {
  private queue: PriorityEntry<T>[] = [];
  private readonly maxSize: number;
  private readonly evictLowerPriority: boolean;

  constructor(options: PriorityQueueOptions = {}) {
    this.maxSize = options.maxSize ?? Infinity;
    this.evictLowerPriority = options.evictLowerPriority ?? false;
  }

  /**
   * Enqueue a prioritized task. Returns a promise that resolves with the
   * handler's return value once the task is processed.
   */
  enqueue(priority: Priority, data: T, handler: (data: T) => Promise<any>): Promise<any> {
    // Check capacity
    if (this.queue.length >= this.maxSize) {
      if (this.evictLowerPriority) {
        // Try to evict the lowest-priority entry
        this.evictLowestPriority(priority);
      }
      if (this.queue.length >= this.maxSize) {
        return Promise.reject(new Error(`Priority queue full (max=${this.maxSize})`));
      }
    }

    return new Promise<any>((resolve, reject) => {
      this.queue.push({
        priority,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
      });
      // Keep sorted: lowest priority number first (highest urgency)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.timestamp - b.timestamp; // FIFO within same priority
      });
    });
  }

  /** Process the highest-priority entry using the given handler. */
  async processNext(handler: (data: T) => Promise<any>): Promise<{ processed: boolean; data?: T }> {
    if (this.queue.length === 0) return { processed: false };

    const entry = this.queue.shift()!;
    try {
      const result = await handler(entry.data);
      entry.resolve(result);
      return { processed: true, data: entry.data };
    } catch (error) {
      entry.reject(error);
      return { processed: true, data: entry.data };
    }
  }

  /** Process all entries in priority order. */
  async processAll(handler: (data: T) => Promise<any>): Promise<void> {
    while (this.queue.length > 0) {
      await this.processNext(handler);
    }
  }

  /** Evict the lowest-priority entry that is lower than `minPriority`. */
  private evictLowestPriority(minPriority: Priority): void {
    // Find the lowest-priority (highest-numbered) entry
    let worstIdx = -1;
    let worstPriority = -1;

    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > worstPriority) {
        worstPriority = this.queue[i].priority;
        worstIdx = i;
      }
    }

    // Only evict if the victim is strictly lower priority than the newcomer
    if (worstIdx >= 0 && this.queue[worstIdx].priority > minPriority) {
      const evicted = this.queue.splice(worstIdx, 1)[0];
      evicted.reject(new Error('Evicted from priority queue — higher-priority request took precedence'));
    }
  }

  /** Get current queue length. */
  get size(): number {
    return this.queue.length;
  }

  /** Clear all pending entries (rejects them). */
  clear(reason = new Error('Priority queue cleared')): void {
    for (const entry of this.queue) {
      entry.reject(reason);
    }
    this.queue = [];
  }
}

// ---------------------------------------------------------------------------
// 13. Distributed Rate Limiting (Redis-compatible interface)
// ---------------------------------------------------------------------------

/** Interface for a Redis-like store (can be backed by real Redis or local memory). */
export interface RateLimitStore {
  /** Atomically increment a key and return the new value. Set TTL on first creation. */
  incr(key: string, ttlMs: number): Promise<number>;
  /** Get a key's value. */
  get(key: string): Promise<number | null>;
  /** Delete a key. */
  del(key: string): Promise<void>;
  /** Execute a Lua-style script (or approximate it). For sliding window: push to list and trim. */
  eval?(script: string, keys: string[], args: string[]): Promise<string | number | null>;
  /** Push to a list and trim old entries (for sliding window log). */
  lpushAndTrim?(key: string, value: string, maxLength: number, ttlMs: number): Promise<number>;
  /** Get list length. */
  llen?(key: string): Promise<number>;
}

/** In-memory fallback store implementing the RateLimitStore interface. */
class InMemoryStore implements RateLimitStore {
  private data = new Map<string, { value: number; expiry: number }>();
  private lists = new Map<string, { items: string[]; expiry: number }>();

  async incr(key: string, ttlMs: number): Promise<number> {
    const now = Date.now();
    const existing = this.data.get(key);

    if (!existing || now > existing.expiry) {
      this.data.set(key, { value: 1, expiry: now + ttlMs });
      return 1;
    }

    existing.value++;
    return existing.value;
  }

  async get(key: string): Promise<number | null> {
    const entry = this.data.get(key);
    if (!entry || Date.now() > entry.expiry) {
      this.data.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
    this.lists.delete(key);
  }

  async lpushAndTrim(key: string, value: string, maxLength: number, ttlMs: number): Promise<number> {
    const now = Date.now();
    let list = this.lists.get(key);

    if (!list || now > list.expiry) {
      list = { items: [], expiry: now + ttlMs };
      this.lists.set(key, list);
    }

    list.items.unshift(value); // prepend (newest first)
    if (list.items.length > maxLength) {
      list.items = list.items.slice(0, maxLength);
    }
    return list.items.length;
  }

  async llen(key: string): Promise<number> {
    const list = this.lists.get(key);
    if (!list || Date.now() > list.expiry) {
      this.lists.delete(key);
      return 0;
    }
    return list.items.length;
  }
}

/** Distributed rate limiter configuration. */
export interface DistributedRateLimiterConfig {
  /** Store backend (defaults to in-memory). */
  store?: RateLimitStore;
  /** Algorithm to use. */
  algorithm?: 'fixed-window' | 'sliding-window-log';
  /** Max requests per window. */
  maxRequests: number;
  /** Window size in milliseconds. */
  windowMs: number;
  /** Key prefix for namespacing in the store. */
  prefix?: string;
}

/**
 * Distributed Rate Limiter.
 *
 * Provides a Redis-compatible interface for multi-instance rate limiting.
 * Falls back to an in-memory store when no external store is provided.
 * Supports both fixed-window and sliding-window-log algorithms.
 *
 * @example
 * ```ts
 * // With a real Redis store:
 * const limiter = new DistributedRateLimiter({
 *   store: redisStore,
 *   algorithm: 'sliding-window-log',
 *   maxRequests: 100,
 *   windowMs: 60_000,
 *   prefix: 'ratelimit:',
 * });
 *
 * // Without Redis (local fallback):
 * const localLimiter = new DistributedRateLimiter({
 *   maxRequests: 50,
 *   windowMs: 10_000,
 * });
 * ```
 */
export class DistributedRateLimiter {
  private store: RateLimitStore;
  private readonly prefix: string;

  constructor(public readonly config: DistributedRateLimiterConfig) {
    this.store = config.store ?? new InMemoryStore();
    this.prefix = config.prefix ?? 'rl:';
  }

  /** Check (async) whether a request is allowed for the given key. */
  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const prefixedKey = `${this.prefix}${key}`;

    switch (this.config.algorithm ?? 'fixed-window') {
      case 'sliding-window-log':
        return this.checkSlidingWindow(prefixedKey, now);
      case 'fixed-window':
      default:
        return this.checkFixedWindow(prefixedKey, now);
    }
  }

  private async checkFixedWindow(key: string, now: number): Promise<RateLimitResult> {
    const count = await this.store.incr(key, this.config.windowMs);
    const allowed = count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - count);
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;

    return {
      allowed,
      remaining,
      resetAt: windowStart + this.config.windowMs,
      retryAfterMs: allowed ? null : windowStart + this.config.windowMs - now,
    };
  }

  private async checkSlidingWindow(key: string, now: number): Promise<RateLimitResult> {
    const windowStart = now - this.config.windowMs;
    const tsKey = `${key}:ts`;

    // Push current timestamp and trim old ones
    const count = await (this.store.lpushAndTrim?.call(
      this.store,
      tsKey,
      String(now),
      this.config.maxRequests,
      this.config.windowMs * 2, // TTL slightly longer than window
    ) ?? Promise.resolve(1));

    const allowed = count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - count);

    return {
      allowed,
      remaining,
      resetAt: now + this.config.windowMs,
      retryAfterMs: allowed ? null : this.config.windowMs,
    };
  }

  /** Reset the limit for a specific key. */
  async reset(key: string): Promise<void> {
    await this.store.del(`${this.prefix}${key}`);
    // Also clean up timestamp sub-key for sliding window
    await this.store.del(`${this.prefix}${key}:ts`);
  }
}
// Note: the `config` reference above refers to the constructor parameter.

// ---------------------------------------------------------------------------
// 14. Statistics & Monitoring
// ---------------------------------------------------------------------------

/** Internal stats structure shared by stat-tracking limiters. */
interface InternalStats {
  totalRequests: number;
  allowedRequests: number;
  rejectedRequests: number;
  totalWaitTime: number;
}

function createInternalStats(): InternalStats {
  return { totalRequests: 0, allowedRequests: 0, rejectedRequests: 0, totalWaitTime: 0 };
}

function buildStats(stats: InternalStats, activeKeys: number): RateLimiterStats {
  const total = stats.totalRequests || 1;
  return {
    totalRequests: stats.totalRequests,
    allowedRequests: stats.allowedRequests,
    rejectedRequests: stats.rejectedRequests,
    hitRate: stats.allowedRequests / total,
    rejectionRate: stats.rejectedRequests / total,
    averageWaitTimeMs: stats.allowedRequests > 0 ? stats.totalWaitTime / stats.allowedRequests : 0,
    currentUtilization: stats.allowedRequests / total,
    activeKeys,
  };
}

/** Interface for limiters that track their own statistics. */
export interface StatsTrackable {
  getStats(): RateLimiterStats;
  resetStats(): void;
}

/**
 * Aggregated Statistics Collector.
 *
 * Gathers metrics from multiple rate limiters and provides a unified view
 * of system-wide rate limiting health.
 *
 * @example
 * ```ts
 * const collector = new StatsCollector();
 * collector.register('api', apiLimiter);
 * collector.register('auth', authLimiter);
 * console.log(collector.getAggregateStats());
 * ```
 */
export class StatsCollector {
  private limiters = new Map<string, StatsTrackable>();

  /** Register a stats-trackable limiter under a name. */
  register(name: string, limiter: StatsTrackable): void {
    this.limiters.set(name, limiter);
  }

  /** Unregister a limiter. */
  unregister(name: string): void {
    this.limiters.delete(name);
  }

  /** Get aggregated statistics across all registered limiters. */
  getAggregateStats(): Record<string, RateLimiterStats> & { _summary: RateLimiterStats } {
    const result: Record<string, RateLimiterStats> = {};
    let summary: RateLimiterStats = {
      totalRequests: 0,
      allowedRequests: 0,
      rejectedRequests: 0,
      hitRate: 0,
      rejectionRate: 0,
      averageWaitTimeMs: 0,
      currentUtilization: 0,
      activeKeys: 0,
    };

    for (const [name, limiter] of this.limiters) {
      const stats = limiter.getStats();
      result[name] = stats;
      summary.totalRequests += stats.totalRequests;
      summary.allowedRequests += stats.allowedRequests;
      summary.rejectedRequests += stats.rejectedRequests;
      summary.activeKeys += stats.activeKeys;
    }

    const total = summary.totalRequests || 1;
    summary.hitRate = summary.allowedRequests / total;
    summary.rejectionRate = summary.rejectedRequests / total;
    summary.averageWaitTimeMs =
      summary.allowedRequests > 0
        ? Object.values(result).reduce((sum, s) => sum + s.averageWaitTimeMs, 0) /
          Object.keys(result).length
        : 0;
    summary.currentUtilization = summary.allowedRequests / total;

    (result as Record<string, RateLimiterStats> & { _summary: RateLimiterStats })._summary = summary;
    return result as Record<string, RateLimiterStats> & { _summary: RateLimiterStats };
  }

  /** Reset stats for all registered limiters. */
  resetAll(): void {
    for (const [, limiter] of this.limiters) {
      limiter.resetStats();
    }
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/** Simple promise-based sleep. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Convenience Exports
// ---------------------------------------------------------------------------

/**
 * Factory: create a rate limiter by algorithm name.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter('token-bucket', { maxRequests: 10, windowMs: 1000 });
 * ```
 */
export function createRateLimiter(
  algorithm: 'token-bucket' | 'sliding-window-log' | 'sliding-window-counter' | 'fixed-window' | 'leaky-bucket',
  config: BaseRateLimitConfig & { capacity?: number; refillPerSecond?: number; leakIntervalMs?: number },
): TokenBucketRateLimiter | SlidingWindowLogRateLimiter | SlidingWindowCounterRateLimiter | FixedWindowRateLimiter | LeakyBucketRateLimiter {
  switch (algorithm) {
    case 'token-bucket':
      return new TokenBucketRateLimiter({
        capacity: (config as any).capacity ?? config.maxRequests,
        refillPerSecond: (config as any).refillPerSecond ?? (config.maxRequests / (config.windowMs / 1000)),
      });
    case 'sliding-window-log':
      return new SlidingWindowLogRateLimiter(config);
    case 'sliding-window-counter':
      return new SlidingWindowCounterRateLimiter(config);
    case 'fixed-window':
      return new FixedWindowRateLimiter(config);
    case 'leaky-bucket':
      return new LeakyBucketRateLimiter({
        capacity: (config as any).capacity ?? config.maxRequests,
        leakIntervalMs: (config as any).leakIntervalMs ?? Math.floor(config.windowMs / config.maxRequests),
      });
    default:
      throw new Error(`Unknown rate limit algorithm: ${algorithm}`);
  }
}
