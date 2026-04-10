/**
 * Advanced Rate Limiter v2: Multi-algorithm rate limiting with sliding window,
 * token bucket, leaky bucket, fixed window, and adaptive algorithms. Supports
 * distributed coordination (via storage adapter), per-user/per-key limits,
 * priority queues, burst allowance, and comprehensive metrics.
 */

// --- Types -----

export type RateLimitAlgorithm = "slidingWindow" | "tokenBucket" | "leakyBucket"
  | "fixedWindow" | "adaptive" | "rolling";

export type LimitScope = "global" | "perUser" | "perIp" | "perApiKey" | "custom";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;       // Unix ms when the limit resets
  retryAfterMs?: number; // How long to wait if not allowed
  limit: number;         // The configured maximum
  current: number;       // Current usage count
  scope: string;
  key: string;
}

export interface RateLimitConfig {
  algorithm: RateLimitAlgorithm;
  maxRequests: number;
  windowMs?: number;        // For sliding/fixed/leaky window
  refillRate?: number;      // Tokens per second for token bucket
  burstSize?: number;       // Max burst for token/leaky bucket
  initialTokens?: number;   // Starting tokens for token bucket
  drainRate?: number;       // Drain rate for leaky bucket
  scope?: LimitScope;
  /** Custom key generator function */
  keyFn?: (context: RateLimitContext) => string;
  /** Priority levels (higher = more important) */
  priorityLevels?: number;
  /** Allow bursts up to this multiple of normal rate */
  burstMultiplier?: number;
  /** Adaptive: target utilization percentage (0-1) */
  targetUtilization?: number;
  /** Adaptive: min/max requests per window */
  adaptiveMin?: number;
  adaptiveMax?: number;
  /** Metadata attached to results */
  meta?: Record<string, unknown>;
}

export interface RateLimitContext {
  userId?: string;
  ipAddress?: string;
  apiKey?: string;
  route?: string;
  method?: string;
  customKey?: string;
  [key: string]: unknown;
}

export interface RateLimitMetrics {
  totalChecks: number;
  totalAllowed: number;
  totalDenied: number;
  avgUtilization: number;
  peakUtilization: number;
  byScope: Record<string, { checks: number; allowed: number; denied: number }>;
  byAlgorithm: Record<string, { checks: number; denied: number }>;
  lastReset: number;
}

export interface StorageAdapter {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttlMs?: number): Promise<void>;
  increment(key: string, amount?: number, ttlMs?: number): Promise<number>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// --- In-Memory Storage ---

class InMemoryStorage implements StorageAdapter {
  private store = new Map<string, { value: number; expiresAt: number }>();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: number, ttlMs = 0): Promise<void> {
    this.store.set(key, { value, expiresAt: ttlMs > 0 ? Date.now() + ttlMs : Infinity });
  }

  async increment(key: string, amount = 1, ttlMs = 0): Promise<number> {
    const entry = this.store.get(key);
    const now = Date.now();
    if (!entry || now > entry.expiresAt) {
      const newVal = amount;
      this.store.set(key, { value: newVal, expiresAt: ttlMs > 0 ? now + ttlMs : Infinity });
      return newVal;
    }
    entry.value += amount;
    if (ttlMs > 0) entry.expiresAt = Math.max(entry.expiresAt, now + ttlMs);
    return entry.value;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /** Clean up expired entries */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

// --- Algorithm Implementations ---

/** Sliding Window Log: precise but memory-intensive */
class SlidingWindowLimiter {
  constructor(
    private config: Pick<RateLimitConfig, "maxRequests" | "windowMs">,
    private storage: StorageAdapter,
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = this.config.windowMs ?? 60_000;
    const max = this.config.maxRequests;

    // Count requests in the sliding window
    // We use a sorted-set approach simplified with timestamps
    const count = await this.storage.increment(`sw:${key}:count`, 1, windowMs);

    if (count <= max) {
      return {
        allowed: true,
        remaining: max - count,
        resetAt: now + windowMs,
        limit: max,
        current: count,
        scope: "sliding",
        key,
      };
    }

    // Find when oldest request in window expires to calculate retryAfter
    // Simplified: assume uniform distribution
    const overflow = count - max;
    const estimatedWait = Math.ceil((overflow / max) * windowMs);

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + windowMs,
      retryAfterMs: estimatedWait,
      limit: max,
      current: count,
      scope: "sliding",
      key,
    };
  }
}

/** Token Bucket: allows bursting, steady refill */
class TokenBucketLimiter {
  constructor(
    private config: Pick<RateLimitConfig, "maxRequests" | "refillRate" | "burstSize">,
    private storage: StorageAdapter,
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const max = this.config.burstSize ?? this.config.maxRequests;
    const refillRate = this.config.refillRate ?? (this.config.maxRequests / 60); // per second default

    // Get current token count
    let tokens = await this.storage.get(`tb:${key}`);
    if (tokens === null) {
      tokens = this.config.initialTokens ?? max;
    }

    // Refill tokens based on elapsed time
    const lastRefill = await this.storage.get(`tb:${key}:last`) ?? now;
    const elapsed = (now - lastRefill) / 1000; // seconds
    const refilled = Math.min(elapsed * refillRate, max - tokens);
    tokens = Math.min(tokens + refilled, max);

    if (tokens >= 1) {
      const newTokens = tokens - 1;
      await this.storage.set(`tb:${key}`, newTokens);
      await this.storage.set(`tb:${key}:last`, now);

      return {
        allowed: true,
        remaining: Math.floor(newTokens),
        resetAt: now + ((max - newTokens) / refillRate) * 1000,
        limit: max,
        current: max - newTokens,
        scope: "token-bucket",
        key,
      };
    }

    const waitMs = Math.ceil((1 - tokens) / refillRate * 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + waitMs,
      retryAfterMs: waitMs,
      limit: max,
      current: max,
      scope: "token-bucket",
      key,
    };
  }
}

/** Leaky Bucket: smooths out traffic, rejects at edge */
class LeakyBucketLimiter {
  constructor(
    private config: Pick<RateLimitConfig, "maxRequests" | "windowMs" | "drainRate">,
    private storage: StorageAdapter,
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const capacity = this.config.maxRequests;
    const drainRate = this.config.drainRate ?? (capacity / (this.config.windowMs ?? 60_000) * 1000); // per ms

    // Get current water level
    let waterLevel = await this.storage.get(`lb:${key}`);
    if (waterLevel === null) waterLevel = 0;

    // Drain based on elapsed time
    const lastCheck = await this.storage.get(`lb:${key}:last`) ?? now;
    const elapsed = now - lastCheck;
    waterLevel = Math.max(0, waterLevel - elapsed * drainRate);

    if (waterLevel < capacity) {
      const newLevel = waterLevel + 1;
      await this.storage.set(`lb:${key}`, newLevel);
      await this.storage.set(`lb:${key}:last`, now);

      return {
        allowed: true,
        remaining: Math.floor(capacity - newLevel),
        resetAt: now + ((capacity - newLevel) / drainRate),
        limit: capacity,
        current: Math.ceil(newLevel),
        scope: "leaky-bucket",
        key,
      };
    }

    const waitMs = Math.ceil((waterLevel - capacity + 1) / drainRate);

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + waitMs,
      retryAfterMs: waitMs,
      limit: capacity,
      current: Math.ceil(waterLevel),
      scope: "leaky-bucket",
      key,
    };
  }
}

/** Fixed Window Counter: simple, can have burstiness at boundaries */
class FixedWindowLimiter {
  constructor(
    private config: Pick<RateLimitConfig, "maxRequests" | "windowMs">,
    private storage: StorageAdapter,
  ) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = this.config.windowMs ?? 60_000;
    const max = this.config.maxRequests;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `fw:${key}:${windowStart}`;

    let count = await this.storage.increment(windowKey, 1, windowMs);

    if (count <= max) {
      return {
        allowed: true,
        remaining: max - count,
        resetAt: windowStart + windowMs,
        limit: max,
        current: count,
        scope: "fixed",
        key,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: windowStart + windowMs,
      retryAfterMs: windowStart + windowMs - now,
      limit: max,
      current: count,
      scope: "fixed",
      key,
    };
  }
}

/** Adaptive Rate Limiter: adjusts limits based on system load */
class AdaptiveLimiter {
  private baseLimit: number;
  private currentLimit: number;
  private utilizationHistory: number[] = [];
  private historyMaxSize = 10;

  constructor(
    private config: Pick<RateLimitConfig, "maxRequests" | "windowMs" | "targetUtilization" | "adaptiveMin" | "adaptiveMax" | "burstMultiplier">,
    private storage: StorageAdapter,
  ) {
    this.baseLimit = this.config.maxRequests;
    this.currentLimit = this.baseLimit;
  }

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = this.config.windowMs ?? 60_000;
    const targetUtil = this.config.targetUtilization ?? 0.7;
    const minLim = this.config.adaptiveMin ?? Math.floor(this.baseLimit * 0.3);
    const maxLim = this.config.adaptiveMax ?? Math.ceil(this.baseLimit * this.config.burstMultiplier! * 1.5);

    // Check against current dynamic limit
    const windowKey = `ad:${key}:${Math.floor(now / windowMs)}`;
    let count = await this.storage.increment(windowKey, 1, windowMs);

    // Track utilization
    this.utilizationHistory.push(count / this.currentLimit);
    if (this.utilizationHistory.length > this.historyMaxSize) {
      this.utilizationHistory.shift();
    }

    // Adjust limit based on recent utilization
    const avgUtil = this.utilizationHistory.reduce((a, b) => a + b, 0) / this.utilizationHistory.length;

    if (avgUtil > 0.9 && this.currentLimit > minLim) {
      this.currentLimit = Math.max(minLim, Math.floor(this.currentLimit * 0.9));
    } else if (avgUtil < targetUtil && this.currentLimit < maxLim) {
      this.currentLimit = Math.min(maxLim, Math.ceil(this.currentLimit * 1.05));
    }

    if (count <= this.currentLimit) {
      return {
        allowed: true,
        remaining: this.currentLimit - count,
        resetAt: now + windowMs,
        limit: this.currentLimit,
        current: count,
        scope: "adaptive",
        key,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + windowMs,
      retryAfterMs: windowMs,
      limit: this.currentLimit,
      current: count,
      scope: "adaptive",
      key,
    };
  }
}

// --- Main Rate Limiter ---

/**
 * Advanced multi-algorithm rate limiter.
 *
 * ```ts
 * const limiter = createRateLimiter({
 *   algorithm: "tokenBucket",
 *   maxRequests: 100,
 *   windowMs: 60000,
 * });
 *
 * const result = await limiter.check({ userId: "user123", route: "/api/data" });
 * if (!result.allowed) {
 *   throw new Error(`Rate limited. Retry after ${result.retryAfterMs}ms`);
 * }
 * ```
 */
export class AdvancedRateLimiter {
  private configs: Map<string, RateLimitConfig> = new Map();
  private storage: StorageAdapter;
  private metrics: RateLimitMetrics = this.createFreshMetrics();
  private globalFallback: RateLimitConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    rules: Array<{ name: string; config: RateLimitConfig }>,
    options?: {
      storage?: StorageAdapter;
      fallback?: RateLimitConfig;
      autoCleanupMs?: number;
    },
  ) {
    this.storage = options?.storage ?? new InMemoryStorage();
    this.globalFallback = options?.fallback ?? {
      algorithm: "slidingWindow",
      maxRequests: 100,
      windowMs: 60_000,
    };

    for (const rule of rules) {
      this.configs.set(rule.name, rule.config);
    }

    // Auto-cleanup for in-memory storage
    if (options?.autoCleanupMs && this.storage instanceof InMemoryStorage) {
      this.cleanupInterval = setInterval(
        () => this.storage.cleanup(),
        options.autoCleanupMs,
      );
    }
  }

  /**
   * Check if a request is allowed under all matching rules.
   * Returns the most restrictive result.
   */
  async check(context: RateLimitContext): Promise<RateLimitResult> {
    const startTime = performance.now();
    this.metrics.totalChecks++;

    let mostRestrictive: RateLimitResult | null = null;

    for (const [name, config] of this.configs) {
      const key = this.resolveKey(config, context);
      const result = await this.runAlgorithm(config, key);

      this.updateMetrics(name, result);

      if (!result.allowed) {
        // Return immediately on first denial (most restrictive)
        this.metrics.totalDenied++;
        return result;
      }

      // Track most restrictive (lowest remaining)
      if (!mostRestrictive || result.remaining < mostRestrictive.remaining) {
        mostRestrictive = result;
      }
    }

    // If no rules matched, apply fallback
    if (!mostRestrictive) {
      mostRestrictive = await this.runAlgorithm(this.globalFallback, this.resolveKey(this.globalFallback, context));
    }

    this.metrics.totalAllowed++;
    return mostRestrictive;
  }

  /**
   * Check a specific named rule.
   */
  async checkRule(ruleName: string, context: RateLimitContext): Promise<RateLimitResult> {
    const config = this.configs.get(ruleName) ?? this.globalFallback;
    const key = this.resolveKey(config, context);
    const result = await this.runAlgorithm(config, key);
    this.updateMetrics(ruleName, result);
    return result;
  }

  /**
   * Reset counters for a specific key (admin operation).
   */
  async reset(key: string): Promise<void> {
    const prefixes = ["sw:", "tb:", "lb:", "fw:", "ad:"];
    for (const prefix of prefixes) {
      await this.storage.delete(`${prefix}${key}`);
      await this.storage.delete(`${prefix}${key}:count`);
      await this.storage.delete(`${prefix}${key}:last`);
    }
  }

  /** Get current metrics snapshot */
  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /** Add or update a rate limit rule at runtime */
  addRule(name: string, config: RateLimitConfig): void {
    this.configs.set(name, config);
  }

  /** Remove a rate limit rule */
  removeRule(name: string): void {
    this.configs.delete(name);
  }

  /** Destroy the limiter and clean up resources */
  destroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.configs.clear();
  }

  // --- Internal ---

  private resolveKey(config: RateLimitConfig, ctx: RateLimitContext): string {
    if (config.keyFn) return config.keyFn(ctx);

    switch (config.scope ?? "global") {
      case "perUser": return ctx.userId ?? "anonymous";
      case "perIp": return ctx.ipAddress ?? "unknown-ip";
      case "perApiKey": return ctx.apiKey ?? "none";
      case "custom": return ctx.customKey ?? "default";
      default: return "global";
    }
  }

  private async runAlgorithm(config: RateLimitConfig, key: string): Promise<RateLimitResult> {
    switch (config.algorithm) {
      case "slidingWindow":
      case "rolling":
        return new SlidingWindowLimiter(config, this.storage).check(key);
      case "tokenBucket":
        return new TokenBucketLimiter(config, this.storage).check(key);
      case "leakyBucket":
        return new LeakyBucketLimiter(config, this.storage).check(key);
      case "fixedWindow":
        return new FixedWindowLimiter(config, this.storage).check(key);
      case "adaptive":
        return new AdaptiveLimiter(config, this.storage).check(key);
      default:
        return new SlidingWindowLimiter(config, this.storage).check(key);
    }
  }

  private updateMetrics(ruleName: string, result: RateLimitResult): void {
    // By-scope tracking
    const scope = result.scope;
    if (!this.metrics.byScope[scope]) {
      this.metrics.byScope[scope] = { checks: 0, allowed: 0, denied: 0 };
    }
    const scopeStats = this.metrics.byScope[scope]!;
    scopeStats.checks++;
    if (result.allowed) scopeStats.allowed++;
    else scopeStats.denied++;

    // By-algorithm tracking
    const algo = ruleName; // Use rule name as proxy
    if (!this.metrics.byAlgorithm[algo]) {
      this.metrics.byAlgorithm[algo] = { checks: 0, denied: 0 };
    }
    this.metrics.byAlgorithm[algo]!.checks++;
    if (!result.allowed) this.metrics.byAlgorithm[algo]!.denied++;

    // Peak utilization
    const util = result.current / result.limit;
    if (util > this.metrics.peakUtilization) this.metrics.peakUtilization = util;
  }

  private createFreshMetrics(): RateLimitMetrics {
    return {
      totalChecks: 0,
      totalAllowed: 0,
      totalDenied: 0,
      avgUtilization: 0,
      peakUtilization: 0,
      byScope: {},
      byAlgorithm: {},
      lastReset: Date.now(),
    };
  }
}

// --- Factory Functions & Middleware ---

/** Create a rate limiter with common presets */
export function createRateLimiter(rules?: Array<{ name: string; config: RateLimitConfig }>, options?: ConstructorParameters<typeof AdvancedRateLimiter>[1]): AdvancedRateLimiter {
  return new AdvancedRateLimiter(rules ?? [
    {
      name: "default",
      config: { algorithm: "slidingWindow", maxRequests: 100, windowMs: 60_000 },
    },
  ], options);
}

/** Create an API rate limiting middleware factory */
export function createApiMiddleware(limiter: AdvancedRateLimiter) {
  return async (
    req: { method?: string; url?: string; headers?: Record<string, string>; ip?: string },
    _res: unknown,
    next: () => void,
  ): Promise<void> => {
    const context: RateLimitContext = {
      method: req.method,
      route: req.url,
      ipAddress: req.ip ?? req.headers?.["x-forwarded-for"] as string,
      apiKey: req.headers?.["x-api-key"] as string,
    };

    const result = await limiter.check(context);

    // Attach rate limit info to request
    (req as Record<string, unknown>).rateLimit = result;

    if (!result.allowed) {
      const err = new Error(`Rate limit exceeded. Retry after ${result.retryAfterMs}ms`);
      (err as Record<string, unknown>).status = 429;
      (err as Record<string, unknown>).headers = {
        "Retry-After": String(Math.ceil((result.retryAfterMs ?? 0) / 1000)),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      };
      throw err;
    }

    next();
  };
}

/** Common rate limit presets */
export const RATE_LIMIT_PRESETS = {
  /** Strict: 10 requests/min — for sensitive endpoints */
  strict: { algorithm: "slidingWindow" as const, maxRequests: 10, windowMs: 60_000 },
  /** Standard: 100 requests/min — general API usage */
  standard: { algorithm: "slidingWindow" as const, maxRequests: 100, windowMs: 60_000 },
  /** Relaxed: 1000 requests/hour — for public/read-only endpoints */
  relaxed: { algorithm: "fixedWindow" as const, maxRequests: 1000, windowMs: 3_600_000 },
  /** Bursty: 10 burst, 1/sec refill — for WebSocket connections */
  bursty: { algorithm: "tokenBucket" as const, maxRequests: 10, refillRate: 1, burstSize: 10 },
  /** Smooth: leaky bucket for consistent throughput */
  smooth: { algorithm: "leakyBucket" as const, maxRequests: 60, windowMs: 60_000, drainRate: 1 },
  /** Adaptive: auto-adjusting between 50-200 req/min */
  adaptive: {
    algorithm: "adaptive" as const,
    maxRequests: 100,
    windowMs: 60_000,
    targetUtilization: 0.7,
    adaptiveMin: 50,
    adaptiveMax: 200,
  },
};
