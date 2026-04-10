/**
 * Advanced Rate Limiter: Multi-algorithm rate limiting with sliding window log,
 * token bucket, leaky bucket, adaptive (AIMD) rate limiting, multi-dimensional
 * limiting, distributed coordination interface, and comprehensive metrics.
 */

// --- Types ---

export type LimitAlgorithm = "sliding-window" | "token-bucket" | "leaky-bucket" | "fixed-window" | "adaptive";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // ms timestamp when the limit resets
  retryAfter?: number; // ms until next allowed request
  limit: number;
  used: number;
  algorithm: LimitAlgorithm;
}

export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Algorithm to use */
  algorithm?: LimitAlgorithm;
  /** For token-bucket: burst size (default: same as limit) */
  burst?: number;
  /** For token-bucket: refill rate per second (default: limit/windowMs*1000) */
  refillRatePerSec?: number;
  /** For leaky-bucket: processing rate per second */
  processingRatePerSec?: number;
  /** For adaptive: initial limit, min limit, max limit */
  adaptiveLimits?: { initial: number; min: number; max: number };
  /** Key prefix for multi-key scenarios */
  keyPrefix?: string;
}

export interface MultiDimensionalLimit {
  dimensions: Record<string, string>; // e.g., { userId: "123", action: "upload" }
  config: RateLimitConfig;
}

export interface RateLimiterMetrics {
  totalRequests: number;
  totalAllowed: number;
  totalRejected: number;
  currentUsage: number;
  peakUsage: number;
  averageRate: number; // requests/sec over last minute
  hitRate: number; // allowed / total
  windowStart: number;
  algorithm: LimitAlgorithm;
}

export interface DistributedCoordinator {
  /** Atomically increment and check a counter */
  increment(key: string, amount: number, windowMs: number): Promise<{ count: number; ttl: number }>;
  /** Get current counter value */
  get(key: string): Promise<number>;
  /** Reset a counter */
  reset(key: string): Promise<void>;
  /** Acquire tokens from bucket */
  acquireTokens(key: string, tokens: number, capacity: number, refillRate: number): Promise<{ acquired: number; remaining: number }>;
}

// --- Sliding Window Log ---

class SlidingWindowLog {
  private timestamps: number[] = [];
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Evict old entries
    while (this.timestamps.length > 0 && this.timestamps[0] < windowStart) {
      this.timestamps.shift();
    }

    const used = this.timestamps.length;
    const remaining = Math.max(0, this.limit - used);
    const allowed = remaining > 0;

    if (allowed) {
      this.timestamps.push(now);
    }

    return {
      allowed,
      remaining: remaining - (allowed ? 1 : 0),
      resetAt: this.timestamps.length > 0 ? this.timestamps[0] + this.windowMs : now + this.windowMs,
      retryAfter: !allowed && this.timestamps.length > 0
        ? this.timestamps[0] + this.windowMs - now : undefined,
      limit: this.limit,
      used: used + (allowed ? 1 : 0),
      algorithm: "sliding-window",
    };
  }
}

// --- Token Bucket ---

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per ms

  constructor(capacity: number, refillRatePerSec: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRatePerSec / 1000; // convert to per-ms
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  check(tokensRequested: number = 1): RateLimitResult {
    this.refill();

    const allowed = this.tokens >= tokensRequested;
    if (allowed) {
      this.tokens -= tokensRequested;
    }

    // Time to refill one token
    const timeToRefill = this.refillRate > 0 ? (tokensRequested - (allowed ? 0 : this.tokens)) / this.refillRate : Infinity;

    return {
      allowed,
      remaining: Math.floor(this.tokens),
      resetAt: Date.now() + timeToRefill,
      retryAfter: !allowed ? timeToRefill : undefined,
      limit: this.capacity,
      used: this.capacity - Math.floor(this.tokens),
      algorithm: "token-bucket",
    };
  }
}

// --- Leaky Bucket ---

class LeakyBucket {
  private queue: number[] = [];
  private readonly rate: number; // items per ms
  private readonly capacity: number;
  private lastLeak: number;

  constructor(capacity: number, processingRatePerSec: number) {
    this.capacity = capacity;
    this.rate = processingRatePerSec / 1000;
    this.lastLeak = Date.now();
  }

  private leak(): void {
    const now = Date.now();
    const elapsed = now - this.lastLeak;
    const leaked = Math.floor(elapsed * this.rate);
    if (leaked > 0) {
      this.queue.splice(0, Math.min(leaked, this.queue.length));
      this.lastLeak = now;
    }
  }

  check(): RateLimitResult {
    this.leak();

    const allowed = this.queue.length < this.capacity;
    if (allowed) {
      this.queue.push(Date.now());
    }

    // Estimate when next slot opens
    let retryAfter: number | undefined;
    if (!allowed && this.queue.length > 0 && this.rate > 0) {
      retryAfter = (this.queue.length - this.capacity + 1) / this.rate;
    }

    return {
      allowed,
      remaining: Math.max(0, this.capacity - this.queue.length - (allowed ? 1 : 0)),
      resetAt: retryAfter ? Date.now() + retryAfter : Date.now() + 1000,
      retryAfter,
      limit: this.capacity,
      used: this.queue.length,
      algorithm: "leaky-bucket",
    };
  }
}

// --- Fixed Window Counter ---

class FixedWindowCounter {
  private count = 0;
  private windowStart: number;
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.windowStart = Date.now();
  }

  check(): RateLimitResult {
    const now = Date.now();
    const elapsed = now - this.windowStart;

    if (elapsed >= this.windowMs) {
      this.count = 0;
      this.windowStart = now;
    }

    const allowed = this.count < this.limit;
    if (allowed) this.count++;

    return {
      allowed,
      remaining: Math.max(0, this.limit - this.count),
      resetAt: this.windowStart + this.windowMs,
      retryAfter: !allowed ? this.windowStart + this.windowMs - now : undefined,
      limit: this.limit,
      used: this.count,
      algorithm: "fixed-window",
    };
  }
}

// --- Adaptive (AIMD) Rate Limiter ---

class AdaptiveRateLimiter {
  private currentLimit: number;
  private successCount = 0;
  private failureCount = 0;
  private readonly limits: { min: number; max: number };
  private readonly increaseFactor: number;
  private readonly decreaseFactor: number;
  private readonly sampleSize: number;

  constructor(config: { initial: number; min: number; max: number }) {
    this.currentLimit = config.initial;
    this.limits = { min: config.min, max: config.max };
    this.increaseFactor = 1.1; // Additive increase
    this.decreaseFactor = 0.5; // Multiplicative decrease
    this.sampleSize = 10;
  }

  reportSuccess(): void {
    this.successCount++;
    this.adjust();
  }

  reportFailure(): void {
    this.failureCount++;
    this.adjust();
  }

  private adjust(): void {
    const total = this.successCount + this.failureCount;
    if (total < this.sampleSize) return;

    const failureRate = this.failureCount / total;

    if (failureRate > 0.5) {
      // High failure rate — decrease significantly
      this.currentLimit = Math.max(this.limits.min, Math.floor(this.currentLimit * this.decreaseFactor));
    } else if (failureRate < 0.1) {
      // Low failure rate — increase gradually
      this.currentLimit = Math.min(this.limits.max, Math.ceil(this.currentLimit * this.increaseFactor));
    }

    // Reset counters after adjustment
    this.successCount = 0;
    this.failureCount = 0;
  }

  check(): RateLimitResult {
    const now = Date.now();
    // Always allow but track for adjustment
    return {
      allowed: true,
      remaining: Math.floor(this.currentLimit),
      resetAt: now + 60000, // Re-evaluate every minute
      limit: Math.floor(this.currentLimit),
      used: 0,
      algorithm: "adaptive",
    };
  }

  getCurrentLimit(): number { return Math.floor(this.currentLimit); }
}

// --- Advanced Rate Limiter (Main Class) ---

export class AdvancedRateLimiter {
  private limiters = new Map<string, SlidingWindowLog | TokenBucket | LeakyBucket | FixedWindowCounter>();
  private adaptiveLimiter?: AdaptiveRateLimiter;
  private metrics: RateLimiterMetrics;
  private coordinator?: DistributedCoordinator;
  private defaultAlgorithm: LimitAlgorithm;
  private destroyed = false;

  constructor(options?: {
    defaultAlgorithm?: LimitAlgorithm;
    coordinator?: DistributedCoordinator;
  }) {
    this.defaultAlgorithm = options?.defaultAlgorithm ?? "sliding-window";
    this.coordinator = options?.coordinator;
    this.metrics = {
      totalRequests: 0, totalAllowed: 0, totalRejected: 0,
      currentUsage: 0, peakUsage: 0, averageRate: 0, hitRate: 0,
      windowStart: Date.now(), algorithm: this.defaultAlgorithm,
    };
  }

  /**
   * Check if a request is allowed under the given limit configuration.
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    if (this.destroyed) return this.rejectedResult(config);

    const effectiveKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
    this.metrics.totalRequests++;
    this.metrics.currentUsage++;

    // Use distributed coordinator if available
    if (this.coordinator) {
      return this.checkDistributed(effectiveKey, config);
    }

    // Local check
    const result = this.checkLocal(effectiveKey, config);

    if (result.allowed) this.metrics.totalAllowed++;
    else this.metrics.totalRejected++;

    this.updateMetrics();
    return result;
  }

  /**
   * Check multiple limits at once (all must pass).
   */
  async checkMultiple(
    key: string,
    configs: Array<{ name: string; config: RateLimitConfig }>,
  ): Promise<{ results: Array<{ name: string; result: RateLimitResult }>; allowed: boolean }> {
    const results: Array<{ name: string; result: RateLimitResult }> = [];

    for (const { name, config } of configs) {
      const result = await this.check(`${key}:${name}`, config);
      results.push({ name, result });
      if (!result.allowed) break;
    }

    return {
      results,
      allowed: results.every((r) => r.result.allowed),
    };
  }

  /**
   * Check multi-dimensional limits.
   */
  async checkMultiDimensional(limit: MultiDimensionalLimit): Promise<RateLimitResult> {
    const dimKey = Object.entries(limit.dimensions)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(":");
    return this.check(dimKey, limit.config);
  }

  /**
   * Report success/failure for adaptive rate limiter.
   */
  reportSuccess(): void { this.adaptiveLimiter?.reportSuccess(); }
  reportFailure(): void { this.adaptiveLimiter?.reportFailure(); }

  /** Get current metrics */
  getMetrics(): RateLimiterMetrics { return { ...this.metrics }; }

  /** Reset all limiters */
  reset(): void {
    this.limiters.clear();
    this.adaptiveLimiter = undefined;
    this.metrics = {
      ...this.metrics,
      totalRequests: 0, totalAllowed: 0, totalRejected: 0,
      currentUsage: 0, peakUsage: 0,
    };
  }

  /** Get or create a limiter for a specific key */
  getLimiter(key: string, config: RateLimitConfig): SlidingWindowLog | TokenBucket | LeakyBucket | FixedWindowCounter {
    const algo = config.algorithm ?? this.defaultAlgorithm;
    const cacheKey = `${key}:${algo}:${config.limit}:${config.windowMs}`;

    let limiter = this.limiters.get(cacheKey);
    if (!limiter) {
      switch (algo) {
        case "token-bucket":
          limiter = new TokenBucket(
            config.burst ?? config.limit,
            config.refillRatePerSec ?? (config.limit / (config.windowMs / 1000)),
          );
          break;
        case "leaky-bucket":
          limiter = new LeakyBucket(
            config.limit,
            config.processingRatePerSec ?? (config.limit / (config.windowMs / 1000)),
          );
          break;
        case "fixed-window":
          limiter = new FixedWindowCounter(config.limit, config.windowMs);
          break;
        case "adaptive":
          if (!this.adaptiveLimiter || !this.limiters.has(cacheKey)) {
            this.adaptiveLimiter = new AdaptiveRateLimiter(
              config.adaptiveLimits ?? { initial: config.limit, min: 1, max: config.limit * 10 },
            );
          }
          limiter = this.adaptiveLimiter as unknown as SlidingWindowLog;
          break;
        case "sliding-window":
        default:
          limiter = new SlidingWindowLog(config.limit, config.windowMs);
          break;
      }
      this.limiters.set(cacheKey, limiter);
    }
    return limiter;
  }

  destroy(): void {
    this.destroyed = true;
    this.limiters.clear();
    this.adaptiveLimiter = undefined;
  }

  // --- Internal ---

  private checkLocal(key: string, config: RateLimitConfig): RateLimitResult {
    const limiter = this.getLimiter(key, config);

    if (limiter instanceof AdaptiveRateLimiter) {
      const result = limiter.check();
      if (result.allowed) limiter.reportSuccess();
      else limiter.reportFailure();
      return result;
    }

    return limiter.check();
  }

  private async checkDistributed(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const algo = config.algorithm ?? this.defaultAlgorithm;

    try {
      switch (algo) {
        case "token-bucket": {
          const r = await this.coordinator!.acquireTokens(
            key, 1, config.burst ?? config.limit,
            config.refillRatePerSec ?? (config.limit / (config.windowMs / 1000)),
          );
          return {
            allowed: r.acquired >= 1,
            remaining: r.remaining,
            resetAt: Date.now() + config.windowMs,
            retryAfter: r.acquired < 1 ? config.windowMs : undefined,
            limit: config.burst ?? config.limit,
            used: (config.burst ?? config.limit) - r.remaining,
            algorithm: "token-bucket",
          };
        }
        case "sliding-window":
        case "fixed-window":
        default: {
          const r = await this.coordinator!.increment(key, 1, config.windowMs);
          const allowed = r.count <= config.limit;
          return {
            allowed,
            remaining: Math.max(0, config.limit - r.count),
            resetAt: Date.now() + r.ttl,
            retryAfter: !allowed ? r.ttl : undefined,
            limit: config.limit,
            used: r.count,
            algorithm: algo,
          };
        }
      }
    } catch {
      // Fallback to local on coordinator error
      return this.checkLocal(key, config);
    }
  }

  private rejectedResult(config: RateLimitConfig): RateLimitResult {
    return {
      allowed: false, remaining: 0, resetAt: Date.now(),
      retryAfter: config.windowMs, limit: config.limit,
      used: config.limit, algorithm: config.algorithm ?? this.defaultAlgorithm,
    };
  }

  private updateMetrics(): void {
    if (this.metrics.currentUsage > this.metrics.peakUsage) {
      this.metrics.peakUsage = this.metrics.currentUsage;
    }
    this.metrics.hitRate =
      this.metrics.totalRequests > 0
        ? this.metrics.totalAllowed / this.metrics.totalRequests
        : 0;
  }
}

// --- Middleware Factory ---

/**
 * Create a rate-limiting middleware function for use with HTTP frameworks.
 * Returns a function that takes a key extractor and returns a middleware.
 */
export function createRateLimitMiddleware(limiter: AdvancedRateLimiter, config: RateLimitConfig) {
  return (
    keyExtractor: (request: unknown) => string | Promise<string>,
  ) => {
    return async (request: unknown): Promise<{ allowed: boolean; result: RateLimitResult }> => {
      const key = await keyExtractor(request);
      const result = await limiter.check(key, config);
      return { allowed: result.allowed, result };
    };
  };
}

// --- Factory ---

export function createAdvancedRateLimiter(options?: ConstructorParameters<typeof AdvancedRateLimiter>[0]): AdvancedRateLimiter {
  return new AdvancedRateLimiter(options);
}
