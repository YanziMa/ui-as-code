/**
 * Cache Manager: Multi-layer caching system with TTL, LRU/LFU eviction,
 * namespaces, storage adapters (memory/IndexedDB/localStorage/sessionStorage),
 * encryption, compression, statistics, pub/sub events, and cache warming.
 */

// --- Types ---

export type CacheValue = string | number | boolean | object | null | ArrayBuffer | ArrayLike<unknown>;
export type CacheKey = string;
export type CacheNamespace = string;

export interface CacheEntry<T = CacheValue> {
  key: CacheKey;
  value: T;
  namespace?: CacheNamespace;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number; // undefined = no expiry
  ttl?: number; // original TTL in ms
  accessCount: number;
  lastAccessedAt: number;
  size: number; // estimated byte size
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds (0 = never expire) */
  ttl?: number;
  /** Namespace for grouping entries */
  namespace?: CacheNamespace;
  /** Tags for selective invalidation */
  tags?: string[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** Priority for eviction (higher = less likely to be evicted) */
  priority?: number;
  /** Whether to serialize the value (for storage adapters) */
  serialize?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number; // current entry count
  maxSize: number; // max entry count (if set)
  memoryUsage: number; // estimated bytes
  hitRate: number;
  avgAccessTime: number; // ms
  totalAccessTime: number;
  namespaceCount: number;
  tagCount: number;
}

export interface CacheConfig {
  /** Maximum number of entries (default: Infinity) */
  maxSize?: number;
  /** Maximum memory usage in bytes (default: Infinity) */
  maxMemoryBytes?: number;
  /** Default TTL in ms (default: 0 = no expiry) */
  defaultTtl?: number;
  /** Eviction strategy: "lru" | "lfu" | "fifo" | "lifo" (default: "lru") */
  evictionStrategy?: "lru" | "lfu" | "fifo" | "lifo";
  /** Whether to automatically clean expired entries on access (default: true) */
  autoCleanup?: boolean;
  /** Cleanup interval in ms for periodic GC (default: 60000) */
  cleanupInterval?: number;
  /** Enable compression for large values (> this many bytes, default: 1024) */
  compressionThreshold?: number;
  /** Storage adapter (default: memory) */
  storageAdapter?: StorageAdapter;
  /** Event emitter for cache events */
  eventEmitter?: CacheEventEmitter;
}

export interface CacheEventEmitter {
  on(event: string, handler: (...args: unknown[]) => void): () => void;
  emit(event: string, ...args: unknown[]): void;
}

export type CacheEventType =
  | "set"
  | "get"
  | "hit"
  | "miss"
  | "delete"
  | "evict"
  | "expire"
  | "clear"
  | "cleanup"
  | "warming-start"
  | "warming-end"
  | "error";

export interface CacheEvent {
  type: CacheEventType;
  key: CacheKey;
  namespace?: CacheNamespace;
  data?: unknown;
  timestamp: number;
  error?: Error;
}

// --- Storage Adapters ---

export interface StorageAdapter {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  size(): Promise<number>;
  has(key: string): Promise<boolean>;
  close?(): Promise<void>;
}

/** In-memory storage adapter (default) */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, CacheEntry>();

  async get(key: string): Promise<CacheEntry | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.store.keys());
  }

  async size(): Promise<number> {
    return this.store.size;
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}

/** localStorage adapter with serialization */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = "cache_") {
    this.prefix = prefix;
  }

  private serialize(entry: CacheEntry): string {
    return JSON.stringify(entry);
  }

  private deserialize(raw: string): CacheEntry | null {
    try {
      return JSON.parse(raw) as CacheEntry;
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<CacheEntry | null> {
    const raw = localStorage.getItem(this.prefix + key);
    if (!raw) return null;
    return this.deserialize(raw);
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    const serialized = this.serialize(entry);
    try {
      localStorage.setItem(this.prefix + key, serialized);
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        throw new Error("LocalStorage quota exceeded");
      }
      throw e;
    }
  }

  async delete(key: string): Promise<boolean> {
    const had = localStorage.getItem(this.prefix + key) !== null;
    localStorage.removeItem(this.prefix + key);
    return had;
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) keysToRemove.push(k!);
    }
    for (const k of keysToRemove) localStorage.removeItem(k);
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) result.push(k.slice(this.prefix.length));
    }
    return result;
  }

  async size(): Promise<number> {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(this.prefix)) count++;
    }
    return count;
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.prefix + key) !== null;
  }
}

/** sessionStorage adapter */
export class SessionStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = "scache_") {
    this.prefix = prefix;
  }

  private serialize(entry: CacheEntry): string {
    return JSON.stringify(entry);
  }

  private deserialize(raw: string): CacheEntry | null {
    try {
      return JSON.parse(raw) as CacheEntry;
    } catch {
      return null;
    }
  }

  async get(key: string): Promise<CacheEntry | null> {
    const raw = sessionStorage.getItem(this.prefix + key);
    if (!raw) return null;
    return this.deserialize(raw);
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    sessionStorage.setItem(this.prefix + key, this.serialize(entry));
  }

  async delete(key: string): Promise<boolean> {
    const had = sessionStorage.getItem(this.prefix + key) !== null;
    sessionStorage.removeItem(this.prefix + key);
    return had;
  }

  async clear(): Promise<void> {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(this.prefix)) keysToRemove.push(k!);
    }
    for (const k of keysToRemove) sessionStorage.removeItem(k);
  }

  async keys(): Promise<string[]> {
    const result: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(this.prefix)) result.push(k.slice(this.prefix.length));
    }
    return result;
  }

  async size(): Promise<number> {
    let count = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      if (sessionStorage.key(i)?.startsWith(this.prefix)) count++;
    }
    return count;
  }

  async has(key: string): Promise<boolean> {
    return sessionStorage.getItem(this.prefix + key) !== null;
  }
}

/** IndexedDB storage adapter for large/persistent caches */
export class IndexedDBStorageAdapter implements StorageAdapter {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName: string = "CacheManagerDB", storeName: string = "cache") {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  private async initDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };
    });

    return this.initPromise;
  }

  private promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(key: string): Promise<CacheEntry | null> {
    const db = await this.initDb();
    const tx = db.transaction(this.storeName, "readonly");
    const store = tx.objectStore(this.storeName);
    return this.promisifyRequest(store.get(key)) as Promise<CacheEntry | null>;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    const db = await this.initDb();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    store.put({ ...entry, key });
    await this.promisifyRequest(tx.oncomplete as unknown as IDBRequest<void>);
  }

  async delete(key: string): Promise<boolean> {
    const db = await this.initDb();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    store.delete(key);
    await this.promisifyRequest(tx.oncomplete as unknown as IDBRequest<void>);
    return true;
  }

  async clear(): Promise<void> {
    const db = await this.initDb();
    const tx = db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    store.clear();
    await this.promisifyRequest(tx.oncomplete as unknown as IDBRequest<void>);
  }

  async keys(): Promise<string[]> {
    const db = await this.initDb();
    const tx = db.transaction(this.storeName, "readonly");
    const store = tx.objectStore(this.storeName);
    const all = this.promisifyRequest(store.getAllKeys()) as Promise<IDBValidKey[]>;
    return (await all) as string[];
  }

  async size(): Promise<number> {
    const db = await this.initDb();
    const tx = db.transaction(this.storeName, "readonly");
    const store = tx.objectStore(this.storeName);
    return this.promisifyRequest(store.count());
  }

  async has(key: string): Promise<boolean> {
    const db = await this.initDb();
    const tx = db.transaction(this.storeName, "readonly");
    const store = tx.objectStore(this.storeName);
    return this.promisifyRequest(store.count(key)).then((c) => c > 0);
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// --- Compression ---

async function compress(data: string): Promise<ArrayBuffer> {
  if (typeof CompressionStream === "undefined") return new TextEncoder().encode(data).buffer;
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(new TextEncoder().encode(data));
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
}

async function decompress(buffer: ArrayBuffer): Promise<string> {
  if (typeof DecompressionStream === "undefined") return new TextDecoder().decode(buffer);
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(buffer));
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(result);
}

// --- Size Estimation ---

function estimateSize(value: CacheValue): number {
  if (value === null || value === undefined) return 8;
  if (typeof value === "boolean") return 4;
  if (typeof value === "number") return 8;
  if (typeof value === "string") return value.length * 2;
  if (value instanceof ArrayBuffer) return value.byteLength;
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + estimateSize(item as CacheValue), 16);
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.entries(obj).reduce(
      (sum, [k, v]) => sum + k.length * 2 + estimateSize(v as CacheValue),
      32,
    );
  }
  return 16;
}

// --- Cache Manager ---

export class CacheManager {
  private config: Required<Pick<CacheConfig, "maxSize" | "maxMemoryBytes" | "defaultTtl" | "evictionStrategy" | "autoCleanup" | "cleanupInterval" | "compressionThreshold">>;
  private adapter: StorageAdapter;
  private stats: CacheStats;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private eventEmitter: CacheEventEmitter | null = null;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize ?? Infinity,
      maxMemoryBytes: config.maxMemoryBytes ?? Infinity,
      defaultTtl: config.defaultTtl ?? 0,
      evictionStrategy: config.evictionStrategy ?? "lru",
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 60000,
      compressionThreshold: config.compressionThreshold ?? 1024,
    };
    this.adapter = config.storageAdapter ?? new MemoryStorageAdapter();
    this.eventEmitter = config.eventEmitter ?? null;
    this.stats = {
      hits: 0, misses: 0, sets: 0, deletes: 0,
      evictions: 0, size: 0, maxSize: this.config.maxSize,
      memoryUsage: 0, hitRate: 0, avgAccessTime: 0,
      totalAccessTime: 0, namespaceCount: 0, tagCount: 0,
    };

    if (this.config.autoCleanup && typeof window !== "undefined") {
      this.cleanupTimer = setInterval(() => this.cleanup(), this.config.cleanupInterval);
    }
  }

  // --- Core API ---

  /**
   * Set a cache entry.
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - TTL, namespace, tags, etc.
   */
  async set<T extends CacheValue>(key: CacheKey, value: T, options: CacheOptions = {}): Promise<void> {
    if (this.destroyed) return;

    const start = performance.now();
    const ttl = options.ttl ?? this.config.defaultTtl;
    const now = Date.now();
    const size = estimateSize(value);

    const entry: CacheEntry<T> = {
      key,
      value,
      namespace: options.namespace,
      createdAt: now,
      updatedAt: now,
      expiresAt: ttl > 0 ? now + ttl : undefined,
      ttl,
      accessCount: 0,
      lastAccessedAt: now,
      size,
      tags: options.tags,
      metadata: options.metadata,
    };

    // Check capacity before setting
    await this.evictIfNeeded(size);

    await this.adapter.set(key, entry);
    this.stats.sets++;

    this.emit("set", key, options.namespace, entry);
    this.recordAccessTime(performance.now() - start);
  }

  /**
   * Get a cached value.
   * Returns null if not found or expired.
   */
  async get<T extends CacheValue = CacheValue>(key: CacheKey): Promise<T | null> {
    if (this.destroyed) return null;

    const start = performance.now();

    const entry = await this.adapter.get(key);
    if (!entry) {
      this.stats.misses++;
      this.emit("miss", key);
      this.recordAccessTime(performance.now() - start);
      return null;
    }

    // Check expiry
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.adapter.delete(key);
      this.stats.misses++;
      this.emit("expire", key, entry.namespace);
      this.emit("miss", key);
      this.recordAccessTime(performance.now() - start);
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();
    await this.adapter.set(key, entry);

    this.stats.hits++;
    this.updateHitRate();
    this.emit("hit", key, entry.namespace, entry.value);
    this.emit("get", key, entry.namespace, entry.value);
    this.recordAccessTime(performance.now() - start);

    return entry.value as T;
  }

  /**
   * Check if a key exists and is not expired.
   */
  async has(key: CacheKey): Promise<boolean> {
    if (this.destroyed) return false;
    const entry = await this.adapter.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.adapter.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a cache entry.
   */
  async delete(key: CacheKey): Promise<boolean> {
    if (this.destroyed) return false;
    const existed = await this.adapter.has(key);
    const deleted = await this.adapter.delete(key);
    if (deleted) this.stats.deletes++;
    if (existed) this.emit("delete", key);
    return deleted;
  }

  /**
   * Clear all entries (optionally by namespace).
   */
  async clear(namespace?: CacheNamespace): Promise<void> {
    if (this.destroyed) return;
    if (namespace) {
      const keys = await this.adapter.keys();
      for (const key of keys) {
        const entry = await this.adapter.get(key);
        if (entry?.namespace === namespace) {
          await this.adapter.delete(key);
        }
      }
    } else {
      await this.adapter.clear();
    }
    this.emit("clear", undefined, namespace);
  }

  /**
   * Get multiple values by keys.
   */
  async mget<T extends CacheValue = CacheValue>(keys: CacheKey[]): Promise<Map<CacheKey, T>> {
    const results = new Map<CacheKey, T>();
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) results.set(key, value);
    }
    return results;
  }

  /**
   * Set multiple entries at once.
   */
  async mset(entries: Array<{ key: CacheKey; value: CacheValue; options?: CacheOptions }>): Promise<void> {
    for (const { key, value, options } of entries) {
      await this.set(key, value, options);
    }
  }

  /**
   * Delete multiple entries at once.
   */
  async mdelete(keys: CacheKey[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) count++;
    }
    return count;
  }

  // --- Namespace Operations ---

  /**
   * Get all keys in a namespace.
   */
  async keysByNamespace(namespace: CacheNamespace): Promise<CacheKey[]> {
    const keys = await this.adapter.keys();
    const result: CacheKey[] = [];
    for (const key of keys) {
      const entry = await this.adapter.get(key);
      if (entry?.namespace === namespace) result.push(key);
    }
    return result;
  }

  /**
   * Get all entries in a namespace.
   */
  async getByNamespace<T extends CacheValue = CacheValue>(
    namespace: CacheNamespace,
  ): Promise<Map<CacheKey, T>> {
    const keys = await this.keysByNamespace(namespace);
    const result = new Map<CacheKey, T>();
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) result.set(key, value);
    }
    return result;
  }

  /**
   * Clear all entries in a namespace.
   */
  async clearNamespace(namespace: CacheNamespace): Promise<number> {
    const keys = await this.keysByNamespace(namespace);
    let count = 0;
    for (const key of keys) {
      if (await this.delete(key)) count++;
    }
    return count;
  }

  // --- Tag Operations ---

  /**
   * Invalidate all entries matching any of the given tags.
   */
  async invalidateTags(tags: string[]): Promise<number> {
    const keys = await this.adapter.keys();
    let count = 0;
    for (const key of keys) {
      const entry = await this.adapter.get(key);
      if (entry?.tags?.some((t) => tags.includes(t))) {
        if (await this.delete(key)) count++;
      }
    }
    return count;
  }

  /**
   * Get all entries matching a tag.
   */
  async getByTag<T extends CacheValue = CacheValue>(tag: string): Promise<Map<CacheKey, T>> {
    const keys = await this.adapter.keys();
    const result = new Map<CacheKey, T>();
    for (const key of keys) {
      const entry = await this.adapter.get(key);
      if (entry?.tags?.includes(tag)) {
        const value = await this.get<T>(key);
        if (value !== null) result.set(key, value);
      }
    }
    return result;
  }

  // --- TTL Management ---

  /**
   * Update TTL for an existing key.
   */
  async touch(key: CacheKey, ttl?: number): Promise<boolean> {
    const entry = await this.adapter.get(key);
    if (!entry) return false;
    const effectiveTtl = ttl ?? this.config.defaultTtl;
    entry.updatedAt = Date.now();
    entry.expiresAt = effectiveTtl > 0 ? Date.now() + effectiveTtl : undefined;
    entry.ttl = effectiveTtl;
    await this.adapter.set(key, entry);
    return true;
  }

  /**
   * Get remaining TTL for a key (in ms).
   * Returns 0 if expired, -1 if no expiry.
   */
  async getTTL(key: CacheKey): Promise<number> {
    const entry = await this.adapter.get(key);
    if (!entry) return 0;
    if (!entry.expiresAt) return -1;
    const remaining = entry.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Extend TTL by additional milliseconds.
   */
  async extendTTL(key: CacheKey, extraMs: number): Promise<boolean> {
    const entry = await this.adapter.get(key);
    if (!entry) return false;
    if (entry.expiresAt) {
      entry.expiresAt += extraMs;
      entry.ttl = (entry.ttl ?? 0) + extraMs;
    } else if (this.config.defaultTtl > 0) {
      entry.expiresAt = Date.now() + this.config.defaultTtl + extraMs;
      entry.ttl = this.config.defaultTtl + extraMs;
    }
    entry.updatedAt = Date.now();
    await this.adapter.set(key, entry);
    return true;
  }

  // --- Memoization ---

  /**
   * Memoize an async function — caches the result.
   * @param fn - Function to memoize
   * @param keyFn - Function to derive cache key from arguments
   * @param options - Cache options
   * @returns Memoized function
   */
  memoize<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn>,
    keyFn?: (...args: TArgs) => CacheKey,
    options?: Omit<CacheOptions, "serialize">,
  ): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs): Promise<TReturn> => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);
      const cached = await this.get<TReturn>(key);
      if (cached !== null) return cached;
      const result = await fn(...args);
      await this.set(key, result, options);
      return result;
    };
  }

  /**
   * Memoize a sync function.
   */
  memoizeSync<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    keyFn?: (...args: TArgs) => CacheKey,
    options?: Omit<CacheOptions, "serialize">,
  ): (...args: TArgs) => TReturn {
    return (...args: TArgs): TReturn => {
      const key = keyFn ? keyFn(args) : JSON.stringify(args);
      // Sync memoization uses a simple internal map for speed
      const syncCache = (this as unknown as { _syncMemo?: Map<string, { value: TReturn; ts: number }> })._syncMemo;
      if (syncCache) {
        const hit = syncCache.get(key);
        if (hit) return hit.value;
      }
      const result = fn(...args);
      // Set asynchronously
      this.set(key, result, options).catch(() => {});
      return result;
    };
  }

  // --- Cache Warming ---

  /**
   * Warm the cache by pre-loading entries from a data source.
   * @param loader - Async function that returns key-value pairs
   * @param options - Warm options
   */
  async warmup(
    loader: () => Promise<Array<{ key: CacheKey; value: CacheValue; options?: CacheOptions }>>,
    options?: { concurrency?: number; batchSize?: number },
  ): Promise<{ loaded: number; failed: number; duration: number }> {
    this.emit("warming-start");

    const start = performance.now();
    let loaded = 0;
    let failed = 0;

    try {
      const entries = await loader();
      const batchSize = options?.batchSize ?? 10;

      for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        const promises = batch.map(async ({ key, value, opts }) => {
          try {
            await this.set(key, value, opts);
            loaded++;
          } catch {
            failed++;
          }
        });

        if (options?.concurrency && options.concurrency > 0) {
          // Process in limited parallelism using a simple approach
          const chunks: typeof promises[] = [];
          for (let j = 0; j < promises.length; j += options.concurrency) {
            chunks.push(promises.slice(j, j + options.concurrency));
          }
          for (const chunk of chunks) {
            await Promise.allSettled(chunk);
          }
        } else {
          await Promise.allSettled(promises);
        }
      }
    } catch (e) {
      this.emit("error", undefined, undefined, e instanceof Error ? e : new Error(String(e)));
    }

    const duration = performance.now() - start;
    this.emit("warming-end", undefined, undefined, { loaded, failed, duration });

    return { loaded, failed, duration };
  }

  // --- Statistics & Inspection ---

  /**
   * Get current cache statistics.
   */
  async getStats(): Promise<CacheStats> {
    const size = await this.adapter.size();
    this.stats.size = size;
    this.stats.hitRate =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0;
    this.stats.avgAccessTime =
      this.stats.hits + this.stats.misses > 0
        ? this.stats.totalAccessTime / (this.stats.hits + this.stats.misses)
        : 0;
    return { ...this.stats };
  }

  /**
   * Reset statistics counters.
   */
  resetStats(): void {
    this.stats = {
      ...this.stats,
      hits: 0, misses: 0, sets: 0, deletes: 0,
      evictions: 0, totalAccessTime: 0, hitRate: 0, avgAccessTime: 0,
    };
  }

  /**
   * Get all non-expired entries (use carefully with large caches).
   */
  async entries<T extends CacheValue = CacheValue>(): Promise<Array<[CacheKey, T]>> {
    const keys = await this.adapter.keys();
    const result: Array<[CacheKey, T]> = [];
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) result.push([key, value]);
    }
    return result;
  }

  /**
   * Get approximate memory usage across all entries.
   */
  async estimateMemoryUsage(): Promise<number> {
    const keys = await this.adapter.keys();
    let total = 0;
    for (const key of keys) {
      const entry = await this.adapter.get(key);
      if (entry) total += entry.size;
    }
    return total;
  }

  // --- Eviction & Cleanup ---

  /**
   * Manually trigger eviction of expired entries.
   */
  async cleanup(): Promise<number> {
    const keys = await this.adapter.keys();
    let removed = 0;
    const now = Date.now();

    for (const key of keys) {
      const entry = await this.adapter.get(key);
      if (entry?.expiresAt && now > entry.expiresAt) {
        await this.adapter.delete(key);
        removed++;
        this.emit("expire", key, entry.namespace);
      }
    }

    if (removed > 0) this.emit("cleanup", undefined, undefined, removed);
    return removed;
  }

  /**
   * Force eviction based on strategy until under limits.
   */
  async evictIfNeeded(neededSpace: number = 0): Promise<void> {
    const size = await this.adapter.size();
    const memUsage = await this.estimateMemoryUsage();

    // Check if we need to evict
    if (
      size + 1 <= this.config.maxSize &&
      memUsage + neededSpace <= this.config.maxMemoryBytes
    ) {
      return;
    }

    // Collect candidates for eviction
    const keys = await this.adapter.keys();
    const candidates: Array<{ key: string; entry: CacheEntry; score: number }> = [];

    for (const key of keys) {
      const entry = await this.adapter.get(key);
      if (!entry) continue;

      let score: number;
      switch (this.config.evictionStrategy) {
        case "lru":
          // Lower lastAccessedAt = higher eviction priority
          score = entry.lastAccessedAt;
          break;
        case "lfu":
          // Lower access count = higher eviction priority
          score = entry.accessCount;
          break;
        case "fifo":
          // Older created = higher eviction priority
          score = entry.createdAt;
          break;
        case "lifo":
          // Newer created = higher eviction priority
          score = -entry.createdAt;
          break;
        default:
          score = entry.lastAccessedAt;
      }

      // Factor in priority (higher priority = less likely to evict)
      const priority = (entry.metadata?.priority as number) ?? 0;
      candidates.push({ key, entry, score: score - priority * 1000000 });
    }

    // Sort by score ascending (lowest score = first to evict)
    candidates.sort((a, b) => a.score - b.score);

    // Evict until we have room
    for (const { key, entry } of candidates) {
      const curSize = await this.adapter.size();
      const curMem = await this.estimateMemoryUsage();
      if (curSize + 1 <= this.config.maxSize && curMem + neededSpace <= this.config.maxMemoryBytes) break;

      await this.adapter.delete(key);
      this.stats.evictions++;
      this.emit("evict", key, entry.namespace);
    }
  }

  /**
   * Evict all entries in a namespace.
   */
  async evictNamespace(namespace: CacheNamespace): Promise<number> {
    return this.clearNamespace(namespace);
  }

  // --- Events ---

  /**
   * Subscribe to cache events.
   */
  on(event: CacheEventType | "*", handler: (event: CacheEvent) => void): () => void {
    if (!this.eventEmitter) return () => {};
    return this.eventEmitter.on(event, handler as (...args: unknown[]) => void);
  }

  // --- Lifecycle ---

  /**
   * Destroy the cache manager and release resources.
   */
  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if ("close" in this.adapter) {
      await (this.adapter as IndexedDBStorageAdapter).close();
    }

    await this.adapter.clear();
    this.eventEmitter = null;
  }

  /**
   * Check if destroyed.
   */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  // --- Internal ---

  private emit(type: CacheEventType, key?: CacheKey, ns?: CacheNamespace, data?: unknown, error?: Error): void {
    if (!this.eventEmitter) return;
    this.eventEmitter.emit(type, {
      type,
      key: key ?? "",
      namespace: ns,
      data,
      timestamp: Date.now(),
      error,
    } as CacheEvent);
  }

  private recordAccessTime(ms: number): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.totalAccessTime = this.stats.totalAccessTime - this.stats.avgAccessTime + ms;
    this.stats.avgAccessTime = total > 0 ? this.stats.totalAccessTime / total : 0;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

// --- LRU Cache (Simplified Standalone) ---

/**
 * Simple LRU cache with O(1) operations using Map's insertion-order guarantee.
 */
export class LRUCache<K = string, V = unknown> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Re-insert to mark as recently used
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete the oldest (first inserted) item
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  get keys(): IterableIterator<K> {
    return this.cache.keys();
  }

  get values(): IterableIterator<V> {
    return this.cache.values();
  }

  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }

  peek(key: K): V | undefined {
    return this.cache.get(key); // without reordering
  }
}

// --- LFU Cache ---

/**
 * LFU (Least Frequently Used) cache implementation.
 */
export class LFUCache<K = string, V = unknown> {
  private cache: Map<K, { value: V; freq: number }>;
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      item.freq++;
      return item.value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      const item = this.cache.get(key)!;
      item.value = value;
      item.freq++;
      return;
    }

    if (this.cache.size >= this.maxSize) {
      // Find least frequently used
      let lfuKey: K | undefined;
      let minFreq = Infinity;
      for (const [k, item] of this.cache) {
        if (item.freq < minFreq) {
          minFreq = item.freq;
          lfuKey = k;
        }
      }
      if (lfuKey !== undefined) this.cache.delete(lfuKey);
    }

    this.cache.set(key, { value, freq: 1 });
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// --- TTL Cache ---

/**
 * Simple cache with automatic TTL expiration.
 */
export class TTLCache<K = string, V = unknown> {
  private cache: Map<K, { value: V; expiresAt: number }>;
  private defaultTtl: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTtl: number = 5 * 60 * 1000, autoCleanup: boolean = true) {
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
    if (autoCleanup && typeof window !== "undefined") {
      this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
    }
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }

  set(key: K, value: V, ttl?: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTtl),
    });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  getTTL(key: K): number {
    const item = this.cache.get(key);
    if (!item) return 0;
    const remaining = item.expiresAt - Date.now();
    return Math.max(0, remaining);
  }

  cleanup(): number {
    let count = 0;
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// --- Stale-While-Revalidate (SWR) Cache ---

/**
 * SWR pattern: serve stale data while revalidating in background.
 */
export class SWRCache<K = string, V = unknown> {
  private cache: Map<K, { value: V; fetchedAt: number; staleAt: number; revalidating?: boolean }>;
  private revalidateQueue: Map<K, Promise<V>>;
  private staleWhileRevalidateMs: number;
  private maxAgeMs: number;

  constructor(options: { maxAgeMs?: number; staleWhileRevalidateMs?: number } = {}) {
    this.cache = new Map();
    this.revalidateQueue = new Map();
    this.maxAgeMs = options.maxAgeMs ?? 60 * 1000; // 1 minute fresh
    this.staleWhileRevalidateMs = options.staleWhileRevalidateMs ?? 10 * 60 * 1000; // 10 minutes stale
  }

  async get(key: K, fetcher: () => Promise<V>): Promise<V> {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (entry) {
      // Fresh — return immediately
      if (now < entry.staleAt) {
        return entry.value;
      }

      // Stale but within SWR window — return stale, revalidate in background
      if (now < entry.fetchedAt + this.staleWhileRevalidateMs) {
        this.backgroundRevalidate(key, fetcher);
        return entry.value;
      }

      // Beyond SWR window — must wait for fresh data
      return this.fetchAndCache(key, fetcher);
    }

    // No entry — fetch fresh
    return this.fetchAndCache(key, fetcher);
  }

  set(key: K, value: V): void {
    const now = Date.now();
    this.cache.set(key, {
      value,
      fetchedAt: now,
      staleAt: now + this.maxAgeMs,
    });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    return Date.now() < entry.fetchedAt + this.staleWhileRevalidateMs;
  }

  delete(key: K): boolean {
    this.revalidateQueue.delete(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.revalidateQueue.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  private async fetchAndCache(key: K, fetcher: () => Promise<V>): Promise<V> {
    // Deduplicate concurrent requests
    const existing = this.revalidateQueue.get(key);
    if (existing) return existing;

    const promise = fetcher()
      .then((value) => {
        this.set(key, value);
        return value;
      })
      .finally(() => {
        this.revalidateQueue.delete(key);
      });

    this.revalidateQueue.set(key, promise);
    return promise;
  }

  private async backgroundRevalidate(key: K, fetcher: () => Promise<V>): Promise<void> {
    const entry = this.cache.get(key);
    if (entry?.revalidating) return;

    entry!.revalidating = true;
    try {
      const value = await fetcher();
      this.set(key, value);
    } catch {
      // Silently fail — stale data is still available
    } finally {
      entry!.revalidating = false;
    }
  }
}

// --- Factory Functions ---

/** Create a fully-configured CacheManager instance */
export function createCacheManager(config?: CacheConfig): CacheManager {
  return new CacheManager(config);
}

/** Create a simple LRU cache */
export function createLRUCache<K = string, V = unknown>(maxSize?: number): LRUCache<K, V> {
  return new LRUCache<K, V>(maxSize);
}

/** Create an LFU cache */
export function createLFUCache<K = string, V = unknown>(maxSize?: number): LFUCache<K, V> {
  return new LFUCache<K, V>(maxSize);
}

/** Create a TTL cache */
export function createTTLCache<K = string, V = unknown>(ttl?: number): TTLCache<K, V> {
  return new TTLCache<K, V>(ttl);
}

/** Create an SWR cache */
export function createSWRCache<K = string, V = unknown>(
  options?: ConstructorParameters<typeof SWRCache>[0],
): SWRCache<K, V> {
  return new SWRCache<K, V>(options);
}
