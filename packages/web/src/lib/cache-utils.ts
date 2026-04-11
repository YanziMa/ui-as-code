/**
 * Cache Utilities: In-memory LRU cache, TTL-based cache, async cache,
 * cache invalidation strategies, cache size management, and browser
 * Cache API integration.
 */

// --- Types ---

export interface CacheEntry<T> {
  value: T;
  expiry?: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  size?: number; // Estimated byte size
}

export interface CacheOptions<T = unknown> {
  /** Maximum number of entries. Default 100 */
  maxSize?: number;
  /** Default TTL in ms for all entries. Default 0 (no expiry) */
  defaultTTL?: number;
  /** Called when an entry is evicted */
  onEvict?: (key: string, value: T) => void;
  /** Called on cache hit */
  onHit?: (key: string, value: T) => void;
  /** Called on cache miss */
  onMiss?: (key: string) => void;
  /** Custom key hash function (for non-string keys) */
  hashFn?: (key: string) => string;
  /** Estimate size of a value in bytes */
  sizeEstimator?: (value: T) => number;
}

export interface AsyncCacheOptions<T = unknown> extends CacheOptions<T> {
  /** Max concurrent pending requests for same key. Default 1 */
  maxPending?: number;
  /** Stale-while-revalidate: return stale data while refreshing? */
  staleWhileRevalidate?: boolean;
  /** Max age before considering stale (ms) */
  maxStaleAge?: number;
}

// --- Core LRU Cache ---

/**
 * LRU (Least Recently Used) cache with TTL support.
 *
 * @example
 * ```ts
 * const cache = new LRUCache<string, { name: string }>({ maxSize: 50, defaultTTL: 60000 });
 * cache.set("user1", { name: "Alice" });
 * const user = cache.get("user1");
 * ```
 */
export class LRUCache<T = unknown> {
  private store = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private options: Required<CacheOptions<T>>;

  constructor(options: CacheOptions<T> = {}) {
    this.options = {
      maxSize: options.maxSize ?? 100,
      defaultTTL: options.defaultTTL ?? 0,
      onEvict: options.onEvict ?? (() => {}),
      onHit: options.onHit ?? (() => {}),
      onMiss: options.onMiss ?? (() => {}),
      hashFn: options.hashFn ?? ((k) => k),
      sizeEstimator: options.sizeEstimator ?? (() => 256),
    };
  }

  /** Get a value by key. Returns null if not found or expired. */
  get(key: string): T | null {
    const hashed = this.options.hashFn(key);
    const entry = this.store.get(hashed);

    if (!entry) {
      this.options.onMiss(key);
      return null;
    }

    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      this._evict(hashed);
      this.options.onMiss(key);
      return null;
    }

    // Update access metadata
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this._promote(hashed);
    this.options.onHit(key, entry.value);

    return entry.value;
  }

  /** Set a value with optional per-entry TTL override. */
  set(key: string, value: T, ttlMs?: number): void {
    const hashed = this.options.hashFn(key);
    const now = Date.now();
    const ttl = ttlMs ?? this.options.defaultTTL;

    // If already exists, remove from order to re-insert
    if (this.store.has(hashed)) {
      const idx = this.accessOrder.indexOf(hashed);
      if (idx >= 0) this.accessOrder.splice(idx, 1);
    }

    const entry: CacheEntry<T> = {
      value,
      expiry: ttl > 0 ? now + ttl : undefined,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      size: this.options.sizeEstimator(value),
    };

    this.store.set(hashed, entry);
    this.accessOrder.push(hashed);

    // Evict if over capacity
    this._enforceMaxSize();
  }

  /** Check if a key exists and is not expired. */
  has(key: string): boolean { return this.get(key) !== null; }

  /** Remove a specific key. Returns true if it existed. */
  delete(key: string): boolean {
    const hashed = this.options.hashFn(key);
    const existed = this.store.has(hashed);
    if (existed) {
      this.store.delete(hashed);
      const idx = this.accessOrder.indexOf(hashed);
      if (idx >= 0) this.accessOrder.splice(idx, 1);
    }
    return existed;
  }

  /** Get all keys (in LRU order, most recent last). */
  keys(): string[] { return [...this.accessOrder]; }

  /** Get current entry count. */
  get size(): number { return this.store.size; }

  /** Check if cache is empty. */
  get isEmpty(): boolean { return this.store.size === 0; }

  /** Clear all entries. */
  clear(): void {
    this.store.clear();
    this.accessOrder = [];
  }

  /** Get or set: returns existing value or computes, stores, and returns new one. */
  getOrSet(key: string, factory: () => T, ttlMs?: number): T {
    const existing = this.get(key);
    if (existing !== null) return existing;

    const value = factory();
    this.set(key, value, ttlMs);
    return value;
  }

  /** Get remaining TTL for a key in ms (-1 if no expiry, -2 if not found/expired). */
  getTTL(key: string): number {
    const hashed = this.options.hashFn(key);
    const entry = this.store.get(hashed);
    if (!entry || !entry.expiry) return entry ? -1 : -2;
    return Math.max(0, entry.expiry - Date.now());
  }

  /** Peek at a value without updating LRU order. */
  peek(key: string): T | null {
    const hashed = this.options.hashFn(key);
    const entry = this.store.get(hashed);
    if (!entry) return null;
    if (entry.expiry && Date.now() > entry.expiry) return null;
    return entry.value;
  }

  /** Get cache statistics. */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    let hits = 0, misses = 0;
    for (const entry of this.store.values()) {
      if (entry.accessCount > 0) hits++;
    }
    misses = this.accessOrder.length - hits + (this.store.size - this.accessOrder.length); // Approximate
    return {
      size: this.store.size,
      maxSize: this.options.maxSize,
      hitRate: this.store.size > 0 ? hits / this.store.size : 0,
    };
  }

  // --- Private ---

  private _promote(hashedKey: string): void {
    const idx = this.accessOrder.indexOf(hashedKey);
    if (idx >= 0) {
      this.accessOrder.splice(idx, 1);
      this.accessOrder.push(hashedKey);
    }
  }

  private _evict(hashedKey: string): void {
    const entry = this.store.get(hashedKey);
    this.store.delete(hashedKey);
    const idx = this.accessOrder.indexOf(hashedKey);
    if (idx >= 0) this.accessOrder.splice(idx, 1);
    if (entry) this.options.onEvict(hashedKey, entry.value);
  }

  private _enforceMaxSize(): void {
    while (this.store.size > this.options.maxSize && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder[0]!;
      this._evict(lruKey);
    }
  }
}

// --- Async Cache (with deduplication) ---

/**
 * AsyncLRUCache — caches promises, deduplicates concurrent requests
 * for the same key, supports stale-while-revalidate.
 *
 * @example
 * ```ts
 * const cache = new AsyncLRUCache({ maxSize: 30, defaultTTL: 30000 });
 * const data = await cache.get("users", () => fetch("/api/users").then(r => r.json()));
 * ```
 */
export class AsyncLRUCache<T = unknown> {
  private cache: LRUCache<T>;
  private pending = new Map<string, Promise<T>>();
  private options: Required<AsyncCacheOptions<T>>;

  constructor(options: AsyncCacheOptions<T> = {}) {
    this.options = {
      ...options,
      maxPending: options.maxPending ?? 1,
      staleWhileRevalidate: options.staleWhileRevalidate ?? false,
      maxStaleAge: options.maxStaleAge ?? 300000,
    };
    this.cache = new LRUCache<T>(options);
  }

  /**
   * Get a value — either from cache or by calling the factory.
   * Concurrent calls for the same key are deduplicated.
   */
  async get(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
    // Check cache first (including stale)
    const cached = this.cache.peek(key);
    if (cached !== null) {
      // If not stale, return immediately
      if (this.cache.getTTL(key) === -1 || this.cache.getTTL(key) > this.options.maxStaleAge) {
        return cached;
      }
      // Stale but SWR enabled — return stale and refresh in background
      if (this.options.staleWhileRevalidate) {
        this._refresh(key, factory, ttlMs);
        return cached;
      }
    }

    // Check for pending request
    const existing = this.pending.get(key);
    if (existing) return existing;

    // Create new promise
    const promise = factory()
      .then((value) => {
        this.cache.set(key, value, ttlMs);
        this.pending.delete(key);
        return value;
      })
      .catch((err) => {
        this.pending.delete(key);
        throw err;
      });

    // Enforce max pending
    if (this.pending.size < this.options.maxPending) {
      this.pending.set(key, promise);
    }

    return promise;
  }

  /** Invalidate a specific key. */
  invalidate(key: string): boolean { return this.cache.delete(key); }

  /** Clear everything. */
  clear(): void { this.cache.clear(); this.pending.clear(); }

  /** Get underlying cache stats. */
  getStats() { return this.cache.getStats(); }

  private async _refresh(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<void> {
    try {
      const value = await factory();
      this.cache.set(key, value, ttlMs);
    } catch { /* Refresh failed, stale data still available */ }
  }
}

// --- Debounced / Throttled Cache Wrapper ---

/**
 * Create a time-bounded cache that auto-clears after a duration.
 * Useful for rate-limited API responses.
 */
export function createTimedCache<T = unknown>(
  factory: (key: string) => Promise<T>,
  options?: { ttlMs?: number; maxSize?: number },
): (key: string) => Promise<T> {
  const cache = new AsyncLRUCache<T>({
    maxSize: options?.maxSize ?? 50,
    defaultTTL: options?.ttlMs ?? 30000,
  });

  return (key: string) => cache.get(key, factory);
}
