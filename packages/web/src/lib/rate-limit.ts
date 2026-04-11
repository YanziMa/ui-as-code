/**
 * Rate limiting utilities: token bucket, sliding window, fixed window,
 * and adaptive rate limiters with configurable limits and callbacks.
 */

// --- Types ---

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // ms timestamp
  retryAfterMs?: number;
}

export interface RateLimitOptions {
  /** Maximum requests per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Called when a request is blocked */
  onBlocked?: (result: RateLimitResult) => void;
}

// --- Token Bucket ---

export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  readonly capacity: number;
  readonly refillRate: number; // tokens per ms

  constructor(capacity: number, refillRatePerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRatePerSecond / 1000;
    this.lastRefill = Date.now();
  }

  /** Try to consume N tokens. Returns true if allowed. */
  tryConsume(count = 1): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  /** Get current available tokens */
  get available(): number {
    this.refill();
    return this.tokens;
  }

  /** Time until next token is available (ms) */
  get nextTokenIn(): number {
    if (this.tokens >= 1) return 0;
    const elapsed = Date.now() - this.lastRefill;
    const needed = (1 - this.tokens) / this.refillRate;
    return Math.max(0, needed - elapsed);
  }

  /** Reset bucket to full capacity */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }
}

// --- Sliding Window Log ---

export class SlidingWindowLimiter {
  private timestamps: number[] = [];
  private readonly options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = { ...options, onBlocked: options.onBlocked ?? (() => {}) };
  }

  check(): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    // Remove expired entries
    this.timestamps = this.timestamps.filter((t) => t > windowStart);

    if (this.timestamps.length < this.options.limit) {
      this.timestamps.push(now);
      return {
        allowed: true,
        remaining: this.options.limit - this.timestamps.length - 1,
        resetAt: windowStart + this.options.windowMs,
      };
    }

    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetAt: this.timestamps[0] + this.options.windowMs,
      retryAfterMs: this.timestamps[0] + this.options.windowMs - now,
    };

    this.options.onBlocked(result);
    return result;
  }

  /** Get current usage count within the window */
  get usage(): number {
    const windowStart = Date.now() - this.options.windowMs;
    return this.timestamps.filter((t) => t > windowStart).length;
  }

  reset(): void {
    this.timestamps = [];
  }
}

// --- Fixed Window Counter ---

export class FixedWindowLimiter {
  private count = 0;
  private windowStart = Date.now();
  private readonly options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = { ...options, onBlocked: options.onBlocked ?? (() => {}) };
  }

  check(): RateLimitResult {
    const now = Date.now();

    // Check if we need to roll to a new window
    if (now - this.windowStart >= this.options.windowMs) {
      this.count = 0;
      this.windowStart = now;
    }

    if (this.count < this.options.limit) {
      this.count++;
      return {
        allowed: true,
        remaining: this.options.limit - this.count,
        resetAt: this.windowStart + this.options.windowMs,
      };
    }

    const result: RateLimitResult = {
      allowed: false,
      remaining: 0,
      resetAt: this.windowStart + this.options.windowMs,
      retryAfterMs: this.windowStart + this.options.windowMs - now,
    };

    this.options.onBlocked(result);
    return result;
  }

  get usage(): number {
    const now = Date.now();
    if (now - this.windowStart >= this.options.windowMs) return 0;
    return this.count;
  }

  reset(): void {
    this.count = 0;
    this.windowStart = Date.now();
  }
}

// --- Adaptive Limiter (auto-adjusts based on server feedback) ---

export interface AdaptiveOptions {
  initialLimit: number;
  minLimit: number;
  maxLimit: number;
  increaseFactor?: number;   // Multiply by this on success (default 1.1)
  decreaseFactor?: number;   // Divide by this on rate-limit hit (default 2)
  cooldownMs?: number;       // Minimum time between adjustments (default 5000)
}

export class AdaptiveLimiter {
  private currentLimit: number;
  private lastAdjustment = 0;
  private readonly opts: Required<Pick<AdaptiveOptions, "increaseFactor" | "decreaseFactor" | "cooldownMs">>;

  constructor(options: AdaptiveOptions) {
    this.currentLimit = options.initialLimit;
    this.opts = {
      increaseFactor: options.increaseFactor ?? 1.1,
      decreaseFactor: options.decreaseFactor ?? 2,
      cooldownMs: options.cooldownMs ?? 5000,
    };
  }

  /** Call when a request succeeds */
  onSuccess(): void {
    this.adjust("up");
  }

  /** Call when a request hits a rate limit */
  onRateLimited(): void {
    this.adjust("down");
  }

  /** Check if a request should be allowed (simple counter-based for the current window) */
  check(requestCount: number): RateLimitResult {
    const allowed = requestCount < Math.floor(this.currentLimit);
    return {
      allowed,
      remaining: Math.max(0, Math.floor(this.currentLimit) - requestCount - 1),
      resetAt: Date.now() + this.opts.cooldownMs,
      retryAfterMs: allowed ? undefined : this.opts.cooldownMs,
    };
  }

  /** Get current adaptive limit */
  get limit(): number {
    return this.currentLimit;
  }

  private adjust(direction: "up" | "down"): void {
    const now = Date.now();
    if (now - this.lastAdjustment < this.opts.cooldownMs) return;

    this.lastAdjustment = now;

    if (direction === "up") {
      this.currentLimit = Math.min(
        this.opts.maxLimit,
        Math.floor(this.currentLimit * this.opts.increaseFactor),
      );
    } else {
      this.currentLimit = Math.max(
        this.opts.minLimit,
        Math.floor(this.currentLimit / this.opts.decreaseFactor),
      );
    }
  }
}

// --- Convenience factory ---

export type RateLimiterType = "token-bucket" | "sliding-window" | "fixed-window";

export interface CreateRateLimiterOptions extends RateLimitOptions {
  type?: RateLimiterType;
  /** For token bucket only: refill rate in tokens/second */
  refillRatePerSecond?: number;
}

/** Create a rate limiter of the specified type */
export function createRateLimiter(options: CreateRateLimiterOptions): TokenBucket | SlidingWindowLimiter | FixedWindowLimiter {
  switch (options.type ?? "sliding-window") {
    case "token-bucket":
      return new TokenBucket(options.limit, options.refillRatePerSecond ?? options.limit / (options.windowMs / 1000));
    case "fixed-window":
      return new FixedWindowLimiter(options);
    case "sliding-window":
    default:
      return new SlidingWindowLimiter(options);
  }
}
