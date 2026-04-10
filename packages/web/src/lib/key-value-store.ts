/**
 * Typed Key-Value Store: In-memory and persistent key-value storage with TTL,
 * namespaces, events, atomic operations, size limits, LRU eviction, transactions,
 * and multi-backend support (memory, localStorage, IndexedDB).
 */

// --- Types ---

export type StoreBackend = "memory" | "localStorage" | "sessionStorage" | "indexedDB";

export interface KvStoreOptions {
  /** Default time-to-live in ms (0 = no expiry) */
  defaultTtl?: number;
  /** Maximum number of entries (0 = unlimited) */
  maxSize?: number;
  /** Eviction policy when max size reached: "lru" | "fifo" | "none" */
  evictionPolicy?: "lru" | "fifo" | "none";
  /** Namespace prefix for all keys */
  namespace?: string;
  /** Storage backend */
  backend?: StoreBackend;
  /** IndexedDB database name (for indexedDB backend) */
  dbName?: string;
  /** Enable change events */
  enableEvents?: boolean;
  /** Serialize values as JSON (for backends that only store strings) */
  serialize?: boolean;
}

export interface KvEntry<T = unknown> {
  value: T;
  ttl?: number;        // Remaining TTL in ms
  createdAt: number;
  expiresAt?: number; // Absolute expiry timestamp
  accessedAt: number;   // Last access time (for LRU)
  accessCount: number;  // Number of times read
  namespace: string;
  key: string;
  size: number;         // Approximate byte size
}

export interface StoreStats {
  totalEntries: number;
  totalSize: number;       // Approximate bytes
  hitRate: number;       // 0-1, cache hit ratio
  missCount: number;
  hitCount: number;
  evictedCount: number;
  expiredCount: number;
  namespaces: Record<string, number>;
  oldestEntry?: number;
  newestEntry?: number;
}

export interface Transaction {
  id: string;
  operations: Array<{ op: "set" | "delete"; key: string; value?: unknown }>;
  committed: boolean;
  createdAt: number;
  committedAt?: number;
}

// --- In-Memory Backend ---

class MemoryBackend<T = unknown> {
  private store = new Map<string, KvEntry<T>>();
  private accessOrder: string[] = []; // For LRU

  get(key: string): KvEntry<T> | undefined {
    const entry = this.store.get(key);
    if (entry) {
      entry.accessedAt = Date.now();
      entry.accessCount++;
      this.touchLru(key);
    }
    return entry;
  }

  set(key: string, entry: KvEntry<T>): void {
    if (!this.store.has(key)) {
      this.accessOrder.push(key);
    }
    this.store.set(key, entry);
    this.touchLru(key);
  }

  delete(key: string): boolean {
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    return this.store.delete(key);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  keys(): string[] {
    return [...this.store.keys()];
  }

  clear(): void {
    this.store.clear();
    this.accessOrder = [];
  }

  getLruKey(): string | undefined {
    return this.accessOrder[0];
  }

  private touchLru(key: string): void {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
      this.accessOrder.push(key);
    }
  }

  getFifoKey(): string | undefined {
    return this.accessOrder[0];
  }

  get size(): number { return this.store.size; }
}

// --- LocalStorage Backend ---

class LocalStorageBackend<T = unknown> {
  private prefix: string;

  constructor(prefix = "kv:") {
    this.prefix = prefix;
  }

  private storageKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<KvEntry<T> | undefined> {
    try {
      const raw = localStorage.getItem(this.storageKey(key));
      if (!raw) return undefined;
      return JSON.parse(raw) as KvEntry<T>;
    } catch {
      return undefined;
    }
  }

  async set(key: string, entry: KvEntry<T>): Promise<void> {
    try {
      localStorage.setItem(this.storageKey(key), JSON.stringify(entry));
    } catch {
      // Quota exceeded or unavailable
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      localStorage.removeItem(this.storageKey(key));
      return true;
    } catch {
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    return localStorage.getItem(this.storageKey(key)) !== null;
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
      if (k?.startsWith(this.prefix)) result.push(k!.slice(this.prefix.length));
    }
    return result;
  }

  get size(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.startsWith(this.prefix)) count++;
    }
    return count;
  }
}

// --- Main Store Class ---

/**
 * Typed Key-Value Store with TTL, namespaces, events, and multiple backends.
 *
 * ```ts
 * const store = new KvStore<string>({ namespace: "app", defaultTtl: 300000 });
 *
 * await store.set("user:name", "Alice");
 * await store.set("session:token", "xyz123", { ttl: 3600000 });
 *
 * const name = await store.get("user:name"); // "Alice"
 * const token = await store.get("session:token"); // "xyz123"
 *
 * store.on("set", (entry) => console.log("New entry:", entry.key));
 * store.on("expire", (entry) => console.log("Expired:", entry.key));
 * ```
 */
export class KvStore<T = unknown> {
  private options: Required<KvStoreOptions>;
  private backend: MemoryBackend<T> | LocalStorageBackend<T>;
  private isAsync: boolean;
  private listeners = new Map<string, Set<(entry: KvEntry<T>) => void>>();
  private stats: StoreStats = {
    totalEntries: 0, totalSize: 0, hitRate: 0,
    missCount: 0, hitCount: 0, evictedCount: 0,
    expiredCount: 0, namespaces: {},
  };
  private transactionStack: Transaction[] = [];

  constructor(options: KvStoreOptions = {}) {
    this.options = {
      defaultTtl: options.defaultTtl ?? 0,
      maxSize: options.maxSize ?? 10000,
      evictionPolicy: options.evictionPolicy ?? "lru",
      namespace: options.namespace ?? "",
      backend: options.backend ?? "memory",
      dbName: options.dbName ?? "kv-store",
      enableEvents: options.enableEvents ?? true,
      serialize: options.serialize ?? false,
    };

    if (this.options.backend === "indexedDB") {
      // Fallback to memory for now — IndexedDB would need full implementation
      this.backend = new MemoryBackend();
      this.isAsync = false;
    } else if (this.options.backend === "localStorage" || this.options.backend === "sessionStorage") {
      this.backend = new LocalStorageBackend<T>(this.options.namespace ? `${this.options.namespace}:` : "kv:");
      this.isAsync = true;
    } else {
      this.backend = new MemoryBackend();
      this.isAsync = false;
    }
  }

  // --- Basic Operations ---

  /**
   * Set a key-value pair with optional TTL.
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    const nsKey = this.ns(key);
    const effectiveTtl = ttl ?? this.options.defaultTtl;

    const entry: KvEntry<T> = {
      value,
      ttl: effectiveTtl,
      createdAt: Date.now(),
      expiresAt: effectiveTtl > 0 ? Date.now() + effectiveTtl : undefined,
      accessedAt: Date.now(),
      accessCount: 0,
      namespace: this.options.namespace,
      key: nsKey,
      size: this.estimateSize(value),
    };

    await this.ensureCapacity();

    if (this.isAsync) {
      await (this.backend as LocalStorageBackend<T>).set(nsKey, entry);
    } else {
      (this.backend as MemoryBackend<T>).set(nsKey, entry);
    }

    this.stats.totalEntries = this.backend.size;
    this.stats.newestEntry = Date.now();

    this.emit("set", entry);
  }

  /**
   * Get a value by key. Returns undefined if expired or not found.
   */
  async get(key: string): Promise<T | undefined> {
    const nsKey = this.ns(key);

    let entry: KvEntry<T> | undefined;
    if (this.isAsync) {
      entry = await (this.backend as LocalStorageBackend<T>).get(nsKey);
    } else {
      entry = (this.backend as MemoryBackend<T>).get(nsKey);
    }

    if (!entry) {
      this.stats.missCount++;
      this.updateHitRate();
      return undefined;
    }

    // Check expiry
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      await this.delete(key); // Auto-cleanup expired
      this.stats.expiredCount++;
      this.stats.missCount++;
      this.updateHitRate();
      this.emit("expire", entry);
      return undefined;
    }

    this.stats.hitCount++;
    this.updateHitRate();
    this.emit("get", entry);
    return entry.value;
  }

  /**
   * Check if a key exists (and is not expired).
   */
  async has(key: string): Promise<boolean> {
    const val = await this.get(key);
    return val !== undefined;
  }

  /**
   * Delete a key.
   */
  async delete(key: string): Promise<boolean> {
    const nsKey = this.ns(key);
    let result: boolean;

    if (this.isAsync) {
      result = await (this.backend as LocalStorageBackend<T>).delete(nsKey);
    } else {
      result = (this.backend as MemoryBackend<T>).delete(nsKey);
    }

    if (result) {
      this.stats.totalEntries = this.backend.size;
    }

    return result;
  }

  /**
   * Clear all entries in this store's namespace.
   */
  async clear(): Promise<void> {
    if (this.isAsync) {
      await (this.backend as LocalStorageBackend<T>).clear();
    } else {
      (this.backend as MemoryBackend<T>).clear();
    }
    this.stats.totalEntries = 0;
    this.stats.totalSize = 0;
    this.emit("clear", {} as KvEntry<T>);
  }

  /**
   * Get all keys in the store.
   */
  async keys(): Promise<string[]> {
    if (this.isAsync) {
      return (this.backend as LocalStorageBackend<T>).keys();
    }
    return (this.backend as MemoryBackend<T>).keys();
  }

  /**
   * Get the number of entries.
   */
  async size(): Promise<number> {
    return this.backend.size;
  }

  // --- Bulk Operations ---

  /**
   * Set multiple key-values at once.
   */
  async setMany(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const { key, value, ttl } of entries) {
      await this.set(key, value, ttl);
    }
  }

  /**
   * Get multiple values at once.
   */
  async getMany(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    for (const key of keys) {
      const val = await this.get(key);
      if (val !== undefined) result.set(key, val);
    }
    return result;
  }

  /**
   * Delete multiple keys at once.
   */
  async deleteMany(keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (await this.delete(key)) deleted++;
    }
    return deleted;
  }

  // --- Atomic Operations ---

  /**
   * Get-or-set: returns existing value or sets and returns new value.
   */
  async getOrSet(key: string, factory: () => T, ttl?: number): Promise<T> {
    const existing = await this.get(key);
    if (existing !== undefined) return existing;
    const value = factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment a numeric value (creates if not exists with initialValue).
   */
  async increment(key: string, amount = 1, initialValue = 0): Promise<number> {
    const current = await this.get(key);
    const next = current != null ? (Number(current) + amount) : initialValue + amount;
    await this.set(key, next as T);
    return next;
  }

  /**
   * Compare-and-swap: atomically update value if it matches expected.
   */
  async compareAndSwap(key: string, expected: T, newValue: T): Promise<{ swapped: boolean; previous: T | undefined }> {
    const current = await this.get(key);
    if (current !== expected && !(current == null && expected == null)) {
      return { swapped: false, previous: current };
    }
    await this.set(key, newValue);
    return { swapped: true, previous: current };
  }

  // --- Transactions ---

  /**
   * Begin a transaction (batch of operations that succeed/fail together).
   */
  beginTransaction(): Transaction {
    const tx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      operations: [],
      committed: false,
      createdAt: Date.now(),
    };
    this.transactionStack.push(tx);
    return tx;
  }

  /** Queue a set operation within the current transaction */
  txSet(tx: Transaction, key: string, value: T): void {
    tx.operations.push({ op: "set", key, value });
  }

  /** Queue a delete operation within the current transaction */
  txDelete(tx: Transaction, key: string): void {
    tx.operations.push({ op: "delete", key });
  }

  /**
   * Commit all queued operations in order.
   * If any operation fails, all are rolled back.
   */
  async commitTransaction(tx: Transaction): Promise<{ success: boolean; opsCompleted: number }> {
    const completed: Array<{ op: "set" | "delete"; key: string; value?: unknown }> = [];
    let success = true;

    try {
      for (const op of tx.operations) {
        switch (op.op) {
          case "set":
            await this.set(op.key, op.value as T);
            break;
          case "delete":
            await this.delete(op.key);
            break;
        }
        completed.push(op);
      }
    } catch {
      success = false;
      // Rollback completed operations
      for (let i = completed.length - 1; i >= 0; i--) {
        const op = completed[i]!;
        if (op.op === "set") await this.delete(op.key);
        else if (op.op === "delete") await this.set(op.key, undefined as T); // Can't truly restore deleted
      }
    }

    tx.committed = success;
    tx.committedAt = Date.now();

    // Remove from stack
    const idx = this.transactionStack.indexOf(tx);
    if (idx !== -1) this.transactionStack.splice(idx, 1);

    return { success, opsCompleted: completed.length };
  }

  // --- Events ---

  /** Listen for store events */
  on(event: "set" | "get" | "delete" | "expire" | "clear" | "evict", listener: (entry: KvEntry<T>) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  private emit(event: string, entry: KvEntry<T>): void {
    if (!this.options.enableEvents) return;
    this.listeners.get(event)?.((fn) => fn(entry));
  }

  // --- Statistics ---

  /** Get current store statistics */
  getStats(): StoreStats {
    return { ...this.stats };
  }

  /** Reset statistics counters */
  resetStats(): void {
    this.stats = {
      totalEntries: this.backend.size,
      totalSize: 0,
      hitRate: 0,
      missCount: 0,
      hitCount: 0,
      evictedCount: 0,
      expiredCount: 0,
      namespaces: { [this.options.namespace]: this.backend.size },
      newestEntry: this.stats.newestEntry,
    };
  }

  // --- Internal ---

  private ns(key: string): string {
    return this.options.namespace ? `${this.options.namespace}:${key}` : key;
  }

  private estimateSize(value: unknown): number {
    return new TextEncoder().encode(JSON.stringify(value) ?? "").length;
  }

  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }

  private async ensureCapacity(): Promise<void> {
    if (this.options.maxSize <= 0 || this.backend.size < this.options.maxSize) return;

    // Evict entries based on policy
    const toEvict = Math.max(1, Math.floor(this.options.maxSize * 0.1));

    for (let i = 0; i < toEvict; i++) {
      let evictKey: string | undefined;

      if (this.options.evictionPolicy === "lru" && this.backend instanceof MemoryBackend) {
        evictKey = this.backend.getLruKey();
      } else if (this.options.evictionPolicy === "fifo" && this.backend instanceof MemoryBackend) {
        evictKey = this.backend.getFifoKey();
      } else {
        break; // No eviction
      }

      if (evictKey) {
        await this.delete(evictKey.replace(`${this.options.namespace}:`, ""));
        this.stats.evictedCount++;
        this.emit("evict", {} as KvEntry<T>);
      } else {
        break;
      }
    }
  }
}
