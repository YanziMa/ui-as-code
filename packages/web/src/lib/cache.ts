/**
 * In-memory cache with TTL, LRU eviction, and size limits.
 */

export interface CacheOptions<T> {
  /** Time-to-live in milliseconds (0 = no expiry) */
  ttl?: number;
  /** Maximum number of entries */
  maxSize?: number;
  /** Custom serializer for storage */
  serialize?: (value: T) => string;
  /** Custom deserializer */
  deserialize?: (raw: string) => T;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
  accesses: number;
}

export class Cache<K = string, V = unknown> {
  private store = new Map<K, CacheEntry<V>>();
  private readonly options: Required<Pick<CacheOptions<V>, "ttl" | "maxSize">>;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions<V> = {}) {
    this.options = {
      ttl: options.ttl ?? 0,
      maxSize: options.maxSize ?? 1000,
    };
  }

  /** Get a value from cache */
  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (this.options.ttl > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }

    entry.lastAccessed = Date.now();
    entry.accesses++;
    this.hits++;
    return entry.value;
  }

  /** Set a value in cache */
  set(key: K, value: V): void {
    // Evict if at capacity
    if (this.store.size >= this.options.maxSize && !this.store.has(key)) {
      this.evict();
    }

    this.store.set(key, {
      value,
      expiresAt: this.options.ttl > 0 ? Date.now() + this.options.ttl : Infinity,
      lastAccessed: Date.now(),
      accesses: 0,
    });
  }

  /** Check if key exists and is not expired */
  has(key: K): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (this.options.ttl > 0 && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /** Delete a key */
  delete(key: K): boolean {
    return this.store.delete(key);
  }

  /** Clear all entries */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /** Get current size */
  get size(): number {
    return this.store.size;
  }

  /** Get all keys (not expired) */
  keys(): K[] {
    this.purgeExpired();
    return [...this.store.keys()];
  }

  /** Get cache statistics */
  get stats() {
    this.purgeExpired();
    return {
      size: this.store.size,
      maxSize: this.options.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0
        ? Math.round((this.hits / (this.hits + this.misses)) * 10000) / 100
        : 0,
    };
  }

  /** Get or set — returns existing value or computes, caches, and returns new */
  async getOrSet(key: K, factory: () => V | Promise<V>): Promise<V> {
    const existing = this.get(key);
    if (existing !== undefined) return existing;

    const value = await factory();
    this.set(key, value);
    return value;
  }

  /** Synchronous version of getOrSet */
  getOrSetSync(key: K, factory: () => V): V {
    const existing = this.get(key);
    if (existing !== undefined) return existing;

    const value = factory();
    this.set(key, value);
    return value;
  }

  /** Remove expired entries */
  private purgeExpired(): void {
    if (this.options.ttl <= 0) return;
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /** Evict least-recently-used entry */
  private evict(): void {
    let lruKey: K | undefined;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.store) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey !== undefined) {
      this.store.delete(lruKey);
    }
  }
}

/** Global default cache instance */
export const defaultCache = new Cache<string, unknown>({ maxSize: 500 });

/** Memoize a function with automatic cache key generation */
export function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  options?: Omit<CacheOptions<R>, "serialize" | "deserialize">,
): (...args: A) => R {
  const cache = new Cache<string, R>(options);

  return (...args: A): R => {
    const key = JSON.stringify(args);
    return cache.getOrSetSync(key, () => fn(...args));
  };
}
