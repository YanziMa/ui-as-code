/**
 * Rate limiting utilities for API and client-side usage.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number | null;
}

/** In-memory sliding window rate limiter */
export class SlidingWindowRateLimiter {
  private windows = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /** Check if a request is allowed for the given key */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Clean old entries
    let timestamps = this.windows.get(key) ?? [];
    timestamps = timestamps.filter((t) => t > windowStart);

    const remaining = Math.max(0, this.maxRequests - timestamps.length);
    const allowed = remaining > 0;

    if (allowed) {
      timestamps.push(now);
      this.windows.set(key, timestamps);
    }

    const oldestInWindow = timestamps.length > 0 ? timestamps[0] : now;
    const resetAt = oldestInWindow + this.windowMs;

    return {
      allowed,
      remaining,
      resetAt,
      retryAfterMs: allowed ? null : resetAt - now,
    };
  }

  /** Reset limits for a key */
  reset(key: string): void {
    this.windows.delete(key);
  }

  /** Get current status without consuming a limit */
  peek(key: string): { used: number; remaining: number; resetAt: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.windows.get(key) ?? []).filter((t) => t > windowStart);
    return {
      used: timestamps.length,
      remaining: Math.max(0, this.maxRequests - timestamps.length),
      resetAt: timestamps.length > 0
        ? timestamps[0] + this.windowMs
        : now + this.windowMs,
    };
  }

  /** Clean up expired windows (call periodically) */
  cleanup(): void {
    const now = Date.now();
    const threshold = now - this.windowMs * 2; // Keep a bit of buffer

    for (const [key, timestamps] of this.windows) {
      const filtered = timestamps.filter((t) => t > threshold);
      if (filtered.length === 0) {
        this.windows.delete(key);
      } else {
        this.windows.set(key, filtered);
      }
    }
  }
}

/** Token bucket rate limiter — allows burst traffic */
export class TokenBucketRateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per ms
  private readonly refillInterval: number;

  constructor(
    capacity: number = 10,
    refillPerSecond: number = 1,
  ) {
    this.capacity = capacity;
    this.refillRate = refillPerSecond / 1000; // per ms
    this.refillInterval = 1000 / refillPerSecond; // ms between refills
  }

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

  reset(key: string): void {
    this.buckets.delete(key);
  }
}

/** Fixed window rate limiter — simpler but can allow bursts at boundaries */
export class FixedWindowRateLimiter {
  private counters = new Map<string, { count: number; windowStart: number }>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    let entry = this.counters.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      entry = { count: 0, windowStart: now };
      this.counters.set(key, entry);
    }

    const allowed = entry.count < this.maxRequests;

    if (allowed) {
      entry.count++;
    }

    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: entry.windowStart + this.windowMs,
      retryAfterMs: allowed ? null : entry.windowStart + this.windowMs - now,
    };
  }

  reset(key: string): void {
    this.counters.delete(key);
  }
}
