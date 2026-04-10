/**
 * database-utils.ts — Comprehensive Database Utility Library for Browser/Edge Environments
 *
 * Provides:
 *   1. IndexedDB Wrapper (typed, migration, CRUD, indexes, bulk ops)
 *   2. LocalStorage Enhanced (TTL, namespace, batch, cross-tab events)
 *   3. SessionStorage Enhanced (typed, tab-aware isolation)
 *   4. In-Memory Database (SQLite-like SQL engine with parser)
 *   5. Cache Storage API Wrapper (strategies, versioning, prefetch)
 *   6. Data Synchronization (offline-first sync queue, conflict resolution)
 *   7. Data Migration Tools (schema diff, backup/restore, integrity checks)
 *
 * @module database-utils
 */

// ─── Type Definitions ───────────────────────────────────────────────────────

/** Schema definition for a single IndexedDB object store */
export interface IDBSchema {
  name: string;
  keyPath?: string;
  autoIncrement?: boolean;
  indexes?: Array<{
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }>;
}

/** Configuration for opening/creating an IndexedDB database */
export interface IDBConfig {
  name: string;
  version: number;
  stores: IDBSchema[];
  onUpgrade?: (db: IDBDatabase, oldVersion: number) => void;
  onBlocked?: () => void;
}

/** Options for index-based queries on an object store */
export interface IndexQueryOptions<T = unknown> {
  indexName: string;
  range?: IDBKeyRange | [unknown, unknown] | { only: unknown };
  direction?: IDBCursorDirection;
  limit?: number;
  offset?: number;
  filter?: (value: T) => boolean;
}

/** Result from a query against the in-memory database */
export interface QueryResult {
  rows: Record<string, unknown>[];
  affectedRows: number;
  insertId?: number;
  lastInsertRowid?: number;
  changes?: number;
}

/** Cache strategy configuration */
export interface CacheStrategy {
  name: string;
  maxAge?: number;       // milliseconds
  maxSize?: number;      // bytes (approximate)
  version?: string;
}

/** A single item in the offline synchronization queue */
export interface SyncItem {
  id: string;
  table: string;
  action: "create" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
  retryCount: number;
}

/** Sync queue status summary */
export interface SyncStatus {
  pending: number;
  synced: number;
  failed: number;
  lastSyncTime?: number;
  isSyncing: boolean;
}

/** Conflict resolution strategy type */
export type ConflictResolver = (
  local: Record<string, unknown>,
  remote: Record<string, unknown>
) => Record<string, unknown>;

/** Options for the LocalStorage enhanced wrapper */
export interface StorageOptions {
  namespace?: string;
  prefix?: string;
  defaultTTL?: number; // milliseconds
  enableCompression?: boolean;
}

/** In-memory table schema column definition */
export interface ColumnDef {
  name: string;
  type: "text" | "integer" | "real" | "blob";
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
}

/** In-memory table definition */
export interface TableDef {
  name: string;
  columns: ColumnDef[];
  primaryKey?: string;
}

/** Data migration pipeline step */
export interface MigrationStep {
  name: string;
  transform: (row: Record<string, unknown>) => Record<string, unknown> | null;
  filter?: (row: Record<string, unknown>) => boolean;
}

/** Backup/export metadata */
export interface BackupMetadata {
  version: string;
  timestamp: number;
  source: string;
  tables: string[];
  rowCount: number;
  checksum?: string;
}

/** Cache entry metadata for size tracking */
interface CacheEntryMeta {
  url: string;
  size: number;
  timestamp: number;
  strategy: string;
}

// ─── Section 1: IndexedDB Wrapper ───────────────────────────────────────────

/**
 * Typed IndexedDB manager class providing CRUD operations, index queries,
 * bulk operations, transaction management, and lifecycle control.
 *
 * @example
 * ```ts
 * const db = new IndexedDBManager({
 *   name: 'myapp',
 *   version: 1,
 *   stores: [{ name: 'users', keyPath: 'id', indexes: [{ name: 'by_email', keyPath: 'email' }] }]
 * });
 * await db.open();
 * await db.put('users', { id: 1, name: 'Alice', email: 'a@b.com' });
 * ```
 */
export class IndexedDBManager {
  private _db: IDBDatabase | null = null;
  private readonly config: IDBConfig;
  private readonly pendingRequests: Map<number, {
    resolve: (value: unknown) => void;
    reject: (reason: Error) => void;
  }> = new Map();
  private requestIdCounter = 0;

  constructor(config: IDBConfig) {
    this.config = config;
  }

  /** Open (or create) the database, running migrations if needed */
  async open(): Promise<IDBDatabase> {
    if (this._db) return this._db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.name, this.config.version);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;

        this.runMigration(db, oldVersion);

        if (this.config.onUpgrade) {
          this.config.onUpgrade(db, oldVersion);
        }
      };

      request.onsuccess = () => {
        this._db = request.result;
        this._db.onclose = () => { this._db = null; };
        this._db.onversionchange = () => {
          this._db?.close();
          this._db = null;
        };
        resolve(this._db);
      };

      request.onerror = () => {
        reject(new Error(`IndexedDB open failed: ${request.error?.message}`));
      };

      if (this.config.onBlocked) {
        request.onblocked = this.config.onBlocked;
      }
    });
  }

  /** Run schema migration based on store definitions */
  private runMigration(db: IDBDatabase, oldVersion: number): void {
    for (const store of this.config.stores) {
      if (!db.objectStoreNames.contains(store.name)) {
        const objectStore = db.createObjectStore(store.name, {
          keyPath: store.keyPath,
          autoIncrement: store.autoIncrement ?? !!store.keyPath,
        });

        if (store.indexes) {
          for (const idx of store.indexes) {
            objectStore.createIndex(idx.name, idx.keyPath, idx.options || {});
          }
        }
      } else if (oldVersion < this.config.version) {
        // Incremental migration: add new indexes to existing store
        const tx = db.transaction(store.name, "readonly");
        const existingStore = tx.objectStore(store.name);
        const existingIndexes = Array.from(existingStore.indexNames);

        if (store.indexes) {
          for (const idx of store.indexes) {
            if (!existingIndexes.includes(idx.name)) {
              // Need a versionchange transaction to modify schema
              // This is handled by the upgradeneeded callback's implicit transaction
              const upgradeTx = db.transaction(store.name, "versionchange");
              const os = upgradeTx.objectStore(store.name);
              os.createIndex(idx.name, idx.keyPath, idx.options || {});
            }
          }
        }
      }
    }
  }

  /** Get the underlying IDBDatabase instance (must call open() first) */
  get db(): IDBDatabase {
    if (!this._db) throw new Error("Database is not open. Call open() first.");
    return this._db;
  }

  /** Check whether the database is currently open */
  get isOpen(): boolean {
    return this._db !== null;
  }

  // ── CRUD Operations ──────────────────────────────────────────────

  /** Retrieve a single record by its primary key */
  async get<T = unknown>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    return this.withTransaction<T | undefined>(storeName, "readonly", (store) => {
      return promisifyRequest(store.get(key));
    });
  }

  /** Store or update a record. Returns the key of the stored record. */
  async put<T = unknown>(storeName: string, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    return this.withTransaction<IDBValidKey>(storeName, "readwrite", (store) => {
      return promisifyRequest(store.put(value, key));
    });
  }

  /** Delete a record by its primary key */
  async delete(storeName: string, key: IDBValidKey): Promise<void> {
    return this.withTransaction<void>(storeName, "readwrite", (store) => {
      return promisifyRequest(store.delete(key));
    });
  }

  /** Retrieve all records from an object store */
  async getAll<T = unknown>(storeName: string, query?: IDBValidKey | IDBKeyRange, count?: number): Promise<T[]> {
    return this.withTransaction<T[]>(storeName, "readonly", (store) => {
      return promisifyRequest(store.getAll(query, count));
    });
  }

  /** Get all records with pagination support */
  async getPage<T = unknown>(
    storeName: string,
    page: number,
    pageSize: number
  ): Promise<{ data: T[]; total: number; page: number; pageSize: number }> {
    const [total, data] = await Promise.all([
      this.count(storeName),
      this.getAll<T>(storeName, undefined, page * pageSize).then((all) =>
        all.slice((page - 1) * pageSize, page * pageSize)
      ),
    ]);
    return { data, total, page, pageSize };
  }

  /** Remove all records from an object store */
  async clear(storeName: string): Promise<void> {
    return this.withTransaction<void>(storeName, "readwrite", (store) => {
      return promisifyRequest(store.clear());
    });
  }

  /** Count records in an object store (optionally within a range) */
  async count(storeName: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    return this.withTransaction<number>(storeName, "readonly", (store) => {
      return promisifyRequest(store.count(query));
    });
  }

  // ── Index-based Queries ─────────────────────────────────────────

  /** Query records using an index with optional range and cursor options */
  async getByIndex<T = unknown>(storeName: string, options: IndexQueryOptions<T>): Promise<T[]> {
    return this.withTransaction<T[]>(storeName, "readonly", (store) => {
      const index = store.index(options.indexName);
      const range = normalizeKeyRange(options.range);
      const results: T[] = [];
      let skipped = 0;

      return new Promise((resolve, reject) => {
        const request = index.openCursor(range, options.direction);
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve(results);
            return;
          }
          if (options.offset && skipped < options.offset) {
            skipped++;
            cursor.continue();
            return;
          }
          if (options.limit !== undefined && results.length >= options.limit) {
            resolve(results);
            return;
          }
          const value = cursor.value as T;
          if (!options.filter || options.filter(value)) {
            results.push(value);
          }
          cursor.continue();
        };
        request.onerror = () => reject(new Error(`Index query failed: ${request.error?.message}`));
      });
    });
  }

  /** Count records matching an index range */
  async countByIndex(
    storeName: string,
    indexName: string,
    range?: IDBKeyRange | [unknown, unknown] | { only: unknown }
  ): Promise<number> {
    return this.withTransaction<number>(storeName, "readonly", (store) => {
      const index = store.index(indexName);
      const normalized = normalizeKeyRange(range);
      return promisifyRequest(index.count(normalized));
    });
  }

  // ── Bulk Operations ─────────────────────────────────────────────

  /** Insert or update multiple records in a single transaction */
  async putMany<T = unknown>(storeName: string, values: T[]): Promise<IDBValidKey[]> {
    return this.withTransaction<IDBValidKey[]>(storeName, "readwrite", (store) => {
      return Promise.all(values.map((v) => promisifyRequest(store.put(v))));
    });
  }

  /** Delete multiple records by their keys in a single transaction */
  async deleteMany(storeName: string, keys: IDBValidKey[]): Promise<void> {
    return this.withTransaction<void>(storeName, "readwrite", (store) => {
      return Promise.all(keys.map((k) => promisifyRequest(store.delete(k)))).then(() => {});
    });
  }

  // ── Transaction Management ──────────────────────────────────────

  /**
   * Execute a callback within a transaction. The transaction auto-commits
   * when the returned promise resolves.
   */
  async withTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => T | Promise<T>
  ): Promise<T> {
    const db = this.db;
    const names = typeof storeNames === "string" ? [storeNames] : storeNames;
    const tx = db.transaction(names, mode);
    // Use the first store for single-store callbacks
    const store = tx.objectStore(names[0]);

    try {
      const result = await callback(store);
      await transactionComplete(tx);
      return result;
    } catch (error) {
      tx.abort();
      throw error;
    }
  }

  /** Execute a multi-store transaction with access to all requested stores */
  async withStores<T>(
    storeNames: string[],
    mode: IDBTransactionMode,
    callback: (stores: Map<string, IDBObjectStore>) => T | Promise<T>
  ): Promise<T> {
    const db = this.db;
    const tx = db.transaction(storeNames, mode);
    const stores = new Map<string, IDBObjectStore>();
    for (const name of storeNames) {
      stores.set(name, tx.objectStore(name));
    }

    try {
      const result = await callback(stores);
      await transactionComplete(tx);
      return result;
    } catch (error) {
      tx.abort();
      throw error;
    }
  }

  // ── Lifecycle ───────────────────────────────────────────────────

  /** Close the database connection */
  close(): void {
    if (this._db) {
      this._db.close();
      this._db = null;
    }
  }

  /** Destroy the database entirely (delete all data and the database file) */
  async destroy(): Promise<void> {
    this.close();
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.name);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(new Error(`Failed to destroy database: ${request.error?.message}`));
      request.onblocked = () => {
        console.warn("[IndexedDB] Destroy blocked — other connections are open.");
      };
    });
  }
}

// ─── IndexedDB Helpers ───────────────────────────────────────────────────────

/** Promisify an IDBRequest */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`IDBRequest error: ${request.error?.message}`));
  });
}

/** Wait for an IDBTransaction to complete */
function transactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(`Transaction error: ${tx.error?.message}`));
    tx.onabort = () => reject(new Error("Transaction aborted"));
  });
}

/** Normalize various range formats into an IDBKeyRange */
function normalizeKeyRange(
  range?: IDBKeyRange | [unknown, unknown] | { only: unknown }
): IDBKeyRange | undefined {
  if (!range) return undefined;
  if (range instanceof IDBKeyRange) return range;
  if ("only" in range) return IDBKeyRange.only(range.only as IDBValidKey);
  if (Array.isArray(range)) {
    return IDBKeyRange.bound(range[0] as IDBValidKey, range[1] as IDBValidKey);
  }
  return undefined;
}

// ─── Section 2: LocalStorage Enhanced ────────────────────────────────────────

/**
 * Enhanced localStorage wrapper with TTL support, namespacing, batch operations,
 * size monitoring, cross-tab change events, and JSON serialization.
 *
 * @example
 * ```ts
 * const storage = new EnhancedLocalStorage({ namespace: 'myapp', defaultTTL: 3600000 });
 * storage.set('user', { name: 'Alice' }, { ttl: 7200000 });
 * storage.get('user'); // { name: 'Alice' } (auto-cleans expired entries)
 * ```
 */
export class EnhancedLocalStorage {
  private readonly namespace: string;
  private readonly defaultTTL: number;
  private readonly compressionEnabled: boolean;
  private listeners: Array<(key: string, newValue: unknown | null, oldValue: unknown | null) => void> =
    [];

  constructor(options: StorageOptions = {}) {
    this.namespace = options.namespace ?? options.prefix ?? "";
    this.defaultTTL = options.defaultTTL ?? 0;
    this.compressionEnabled = options.enableCompression ?? false;
    this.listenForCrossTabChanges();
  }

  /** Build the full storage key with namespace prefix */
  private fullKey(key: string): string {
    return this.namespace ? `${this.namespace}:${key}` : key;
  }

  /** Serialize a value for storage, optionally compressing */
  private serialize(value: unknown): string {
    const payload = JSON.stringify({ v: value, t: Date.now() });
    if (this.compressionEnabled && payload.length > 512) {
      try {
        // Simple base64 encoding as lightweight "compression" indicator
        return btoa(unescape(encodeURIComponent(payload)));
      } catch {
        /* fall through to plain JSON */
      }
    }
    return payload;
  }

  /** Deserialize a value from storage */
  private deserialize(raw: string): { v: unknown; t: number } | null {
    let parsed: string;
    try {
      // Try decoding if it looks base64-encoded
      parsed = decodeURIComponent(escape(atob(raw)));
    } catch {
      parsed = raw;
    }
    try {
      return JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  /** Set a value with optional TTL (time-to-live in milliseconds) */
  set(key: string, value: unknown, ttl?: number): void {
    const full = this.fullKey(key);
    const expiry = ttl ?? this.defaultTTL;
    const wrapper = expiry > 0
      ? { _data: value, _expiresAt: Date.now() + expiry }
      : { _data: value };
    localStorage.setItem(full, this.serialize(wrapper));
  }

  /** Get a value, automatically cleaning up expired entries */
  get<T = unknown>(key: string): T | null {
    const full = this.fullKey(key);
    const raw = localStorage.getItem(full);
    if (raw === null) return null;

    const deserialized = this.deserialize(raw);
    if (!deserialized) {
      this.remove(key);
      return null;
    }

    const wrapped = deserialized.v as Record<string, unknown>;
    if (wrapped && "_expiresAt" in wrapped && typeof wrapped._expiresAt === "number") {
      if (Date.now() > (wrapped._expiresAt as number)) {
        this.remove(key);
        return null;
      }
      return (wrapped._data as T) ?? null;
    }

    return (deserialized.v as T) ?? null;
  }

  /** Remove a specific key */
  remove(key: string): void {
    localStorage.removeItem(this.fullKey(key));
  }

  /** Check if a key exists (and is not expired) */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** Clear all keys under this namespace */
  clear(): void {
    if (!this.namespace) {
      localStorage.clear();
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`${this.namespace}:`)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  }

  /** Get multiple keys at once */
  multiGet<T = unknown>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  /** Set multiple key-value pairs at once */
  multiSet(entries: Record<string, unknown>, ttl?: number): void {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, ttl);
    }
  }

  /** Delete multiple keys at once */
  multiDelete(keys: string[]): void {
    for (const key of keys) {
      this.remove(key);
    }
  }

  /** Estimate total quota usage as a percentage (0–100) */
  estimateQuotaUsage(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalSize += key.length + (localStorage.getItem(key)?.length ?? 0);
      }
    }
    // Typical localStorage limit is ~5MB (5,242,880 bytes); each char is 2 bytes in UTF-16
    const estimatedLimit = 5_242_880;
    return Math.min(100, Math.round((totalSize * 2 / estimatedLimit) * 100));
  }

  /** Get the size in bytes of a specific key's stored data */
  getKeySize(key: string): number {
    const raw = localStorage.getItem(this.fullKey(key));
    if (!raw) return 0;
    return (this.fullKey(key).length + raw.length) * 2; // UTF-16
  }

  /** List all keys under this namespace (excluding internal metadata) */
  keys(): string[] {
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (!this.namespace || k.startsWith(`${this.namespace}:`))) {
        result.push(this.namespace ? k.slice(this.namespace.length + 1) : k);
      }
    }
    return result;
  }

  /** Register a listener for local changes (same-tab) */
  onChange(
    callback: (key: string, newValue: unknown | null, oldValue: unknown | null) => void
  ): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /** Listen for cross-tab storage events */
  private listenForCrossTabChanges(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("storage", (event: StorageEvent) => {
      if (!event.key) return;
      if (this.namespace && !event.key.startsWith(`${this.namespace}:`)) return;

      const localKey = this.namespace
        ? event.key.slice(this.namespace.length + 1)
        : event.key;

      const newValue = event.newValue
        ? this.deserialize(event.newValue)?.v ?? null
        : null;
      const oldValue = event.oldValue
        ? this.deserialize(event.oldValue)?.v ?? null
        : null;

      for (const listener of this.listeners) {
        try {
          listener(localKey, newValue, oldValue);
        } catch {
          /* ignore listener errors */
        }
      }
    });
  }

  /** Clean up all expired entries in this namespace */
  cleanupExpired(): number {
    let removed = 0;
    const allKeys = this.keys();
    for (const key of allKeys) {
      const full = this.fullKey(key);
      const raw = localStorage.getItem(full);
      if (!raw) continue;

      const deserialized = this.deserialize(raw);
      if (!deserialized) {
        localStorage.removeItem(full);
        removed++;
        continue;
      }

      const wrapped = deserialized.v as Record<string, unknown>;
      if (
        wrapped &&
        "_expiresAt" in wrapped &&
        typeof wrapped._expiresAt === "number" &&
        Date.now() > (wrapped._expiresAt as number)
      ) {
        localStorage.removeItem(full);
        removed++;
      }
    }
    return removed;
  }
}

// ─── Section 3: SessionStorage Enhanced ──────────────────────────────────────

/**
 * Enhanced sessionStorage wrapper with typed access, optional per-tab isolation,
 * and similar API surface to EnhancedLocalStorage but scoped to the session.
 *
 * @example
 * ```ts
 * const session = new EnhancedSessionStorage({ namespace: 'myapp', tabIsolation: true });
 * session.set('tempData', { foo: 'bar' });
 * ```
 */
export class EnhancedSessionStorage {
  private readonly namespace: string;
  private readonly tabIsolation: boolean;
  private tabId: string;

  constructor(options: StorageOptions & { tabIsolation?: boolean } = {}) {
    this.namespace = options.namespace ?? options.prefix ?? "";
    this.tabIsolation = options.tabIsolation ?? false;
    this.tabId = this.tabIsolation ? `tab_${Date.now()}_${Math.random().toString(36).slice(2)}` : "";
  }

  private fullKey(key: string): string {
    const parts = [this.namespace, this.tabId, key].filter(Boolean);
    return parts.join(":");
  }

  set(key: string, value: unknown): void {
    try {
      sessionStorage.setItem(this.fullKey(key), JSON.stringify({ v: value, t: Date.now() }));
    } catch (e) {
      console.warn("[SessionStorage] Quota exceeded:", e);
      this.evictLRU();
      try {
        sessionStorage.setItem(this.fullKey(key), JSON.stringify({ v: value, t: Date.now() }));
      } catch (e2) {
        throw new Error(`SessionStorage is full and eviction failed: ${(e2 as Error).message}`);
      }
    }
  }

  get<T = unknown>(key: string): T | null {
    const raw = sessionStorage.getItem(this.fullKey(key));
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw);
      return (parsed.v as T) ?? null;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    sessionStorage.removeItem(this.fullKey(key));
  }

  has(key: string): boolean {
    return sessionStorage.getItem(this.fullKey(key)) !== null;
  }

  clear(): void {
    if (!this.namespace && !this.tabId) {
      sessionStorage.clear();
      return;
    }
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (!this.namespace || k.startsWith(`${this.namespace}:`))) {
        if (this.tabId && !k.includes(`:${this.tabId}:`)) continue;
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  }

  multiGet<T = unknown>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = this.get<T>(key);
    }
    return result;
  }

  multiSet(entries: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value);
    }
  }

  multiDelete(keys: string[]): void {
    for (const key of keys) {
      this.remove(key);
    }
  }

  keys(): string[] {
    const result: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (!this.namespace || k.startsWith(`${this.namespace}:`))) {
        if (this.tabId && !k.includes(`:${this.tabId}:`)) continue;
        const displayKey = k.split(":").pop() ?? k;
        result.push(displayKey);
      }
    }
    return result;
  }

  /** Evict least-recently-used entries when quota is exceeded */
  private evictLRU(): void {
    const entries: Array<{ key: string; time: number }> = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      if (this.namespace && !k.startsWith(`${this.namespace}:`)) continue;
      if (this.tabId && !k.includes(`:${this.tabId}:`)) continue;
      try {
        const raw = sessionStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          entries.push({ key: k, time: parsed.t ?? 0 });
        }
      } catch {
        entries.push({ key: k, time: 0 });
      }
    }
    entries.sort((a, b) => a.time - b.time);
    // Evict the oldest 20% of entries
    const evictCount = Math.max(1, Math.ceil(entries.length * 0.2));
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      sessionStorage.removeItem(entries[i].key);
    }
  }
}

// ─── Section 4: In-Memory Database (SQLite-like) ─────────────────────────────

/** Token types produced by the SQL tokenizer */
type TokenType =
  | "KEYWORD"
  | "IDENTIFIER"
  | "NUMBER"
  | "STRING"
  | "OPERATOR"
  | "PUNCTUATION"
  | "STAR"
  | "COMMA"
  | "SEMICOLON"
  | "DOT"
  | "QUESTION";

interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/** AST node types for the SQL parser */
type ASTNode =
  | CreateTableNode
  | InsertNode
  | SelectNode
  | UpdateNode
  | DeleteNode
  | JoinClause
  | WhereClause
  | OrderByClause
  | ExpressionNode;

interface CreateTableNode {
  type: "CREATE_TABLE";
  tableName: string;
  columns: ColumnDef[];
  ifNotExists: boolean;
}

interface InsertNode {
  type: "INSERT";
  tableName: string;
  columns: string[];
  values: unknown[][];
}

interface SelectNode {
  type: "SELECT";
  distinct: boolean;
  columns: Array<{ expr: ExpressionNode; alias?: string }>;
  tableName: string;
  alias?: string;
  joins: JoinClause[];
  where?: WhereClause;
  orderBy?: OrderByClause;
  groupBy?: string[];
  limit?: number;
  offset?: number;
}

interface UpdateNode {
  type: "UPDATE";
  tableName: string;
  sets: Array<{ column: string; value: ExpressionNode }>;
  where?: WhereClause;
}

interface DeleteNode {
  type: "DELETE";
  tableName: string;
  where?: WhereClause;
}

interface JoinClause {
  type: "INNER" | "LEFT";
  table: string;
  alias?: string;
  on: WhereClause;
}

interface WhereClause {
  type: "WHERE";
  conditions: Condition[];
}

interface Condition {
  left: ExpressionNode;
  operator: "=" | "!=" | "<>" | ">" | "<" | ">=" | "<=" | "LIKE" | "IN" | "IS" | "IS NOT" | "AND" | "OR";
  right?: ExpressionNode;
  subConditions?: Condition[];
}

interface OrderByClause {
  type: "ORDER_BY";
  columns: Array<{ column: string; direction: "ASC" | "DESC" }>;
}

interface ExpressionNode {
  type: "COLUMN" | "LITERAL" | "FUNCTION" | "SUBQUERY" | "BINARY_OP" | "UNARY_OP";
  value?: unknown;
  name?: string;
  args?: ExpressionNode[];
  left?: ExpressionNode;
  right?: ExpressionNode;
  operator?: string;
  subquery?: SelectNode;
  alias?: string;
}

/**
 * Simple in-memory relational database with a SQL-like query engine.
 * Supports CREATE TABLE, INSERT, SELECT (with WHERE/ORDER BY/LIMIT/OFFSET/GROUP BY/aggregates),
 * UPDATE, DELETE, JOINs, and basic subqueries.
 *
 * @example
 * ```ts
 * const db = new InMemoryDatabase();
 * db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');
 * db.exec("INSERT INTO users (id, name, age) VALUES (1, 'Alice', 30)");
 * const result = db.exec('SELECT * FROM users WHERE age > 25 ORDER BY name');
 * console.log(result.rows); // [{ id: 1, name: 'Alice', age: 30 }]
 * ```
 */
export class InMemoryDatabase {
  private tables: Map<string, TableDef> = new Map();
  private data: Map<string, Record<string, unknown>[]> = new Map();
  private autoIncrement: Map<string, number> = new Map();
  private inTransaction = false;
  private transactionSnapshot: Map<string, Record<string, unknown>[]> = new Map();

  /** Execute a SQL statement and return a QueryResult */
  exec(sql: string): QueryResult {
    const tokens = this.tokenize(sql.trim());
    const ast = this.parse(tokens);
    return this.execute(ast);
  }

  /** Begin a transaction (snapshots current state for rollback) */
  begin(): void {
    if (this.inTransaction) throw new Error("Nested transactions are not supported.");
    this.inTransaction = true;
    this.transactionSnapshot = new Map();
    for (const [name, rows] of this.data) {
      this.transactionSnapshot.set(name, rows.map((r) => ({ ...r })));
    }
  }

  /** Commit the current transaction (discard snapshot) */
  commit(): void {
    if (!this.inTransaction) throw new Error("No active transaction to commit.");
    this.inTransaction = false;
    this.transactionSnapshot.clear();
  }

  /** Rollback the current transaction (restore snapshot) */
  rollback(): void {
    if (!this.inTransaction) throw new Error("No active transaction to rollback.");
    this.inTransaction = false;
    this.data = this.transactionSnapshot;
    this.transactionSnapshot.clear();
  }

  /** Check if a transaction is currently active */
  get isActiveTransaction(): boolean {
    return this.inTransaction;
  }

  // ── Tokenizer ──────────────────────────────────────────────────

  private tokenize(sql: string): Token[] {
    const tokens: Token[] = [];
    const keywords = new Set([
      "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
      "DELETE", "CREATE", "TABLE", "INTEGER", "TEXT", "REAL", "BLOB", "PRIMARY",
      "KEY", "NOT", "NULL", "UNIQUE", "DEFAULT", "AUTOINCREMENT", "AND", "OR",
      "ORDER", "BY", "ASC", "DESC", "LIMIT", "OFFSET", "JOIN", "INNER", "LEFT",
      "ON", "AS", "DISTINCT", "GROUP", "COUNT", "SUM", "AVG", "MIN", "MAX",
      "LIKE", "IN", "IS", "EXISTS", "BETWEEN", "IF", "NOT", "EXISTS",
    ]);

    let i = 0;
    while (i < sql.length) {
      // Skip whitespace
      if (/\s/.test(sql[i])) { i++; continue; }

      // String literal
      if (sql[i] === "'" || sql[i] === '"') {
        const quote = sql[i];
        let j = i + 1;
        let str = "";
        while (j < sql.length && sql[j] !== quote) {
          if (sql[j] === "\\" && j + 1 < sql.length) {
            str += sql[j + 1];
            j += 2;
          } else {
            str += sql[j];
            j++;
          }
        }
        tokens.push({ type: "STRING", value: str, position: i });
        i = j + 1;
        continue;
      }

      // Number
      if (/\d/.test(sql[i]) || (sql[i] === "." && i + 1 < sql.length && /\d/.test(sql[i + 1]))) {
        let j = i;
        while (j < sql.length && (/[\d.]/.test(sql[j]) || sql[j].toLowerCase() === "e")) {
          if (sql[j].toLowerCase() === "e" && j + 1 < sql.length && /[+-]/.test(sql[j + 1])) j++;
          j++;
        }
        tokens.push({ type: "NUMBER", value: sql.slice(i, j), position: i });
        i = j;
        continue;
      }

      // Identifier or keyword
      if (/[a-zA-Z_]/.test(sql[i])) {
        let j = i;
        while (j < sql.length && /[a-zA-Z0-9_]/.test(sql[j])) j++;
        const word = sql.slice(i, j);
        const upper = word.toUpperCase();
        tokens.push({
          type: keywords.has(upper) ? "KEYWORD" : "IDENTIFIER",
          value: word,
          position: i,
        });
        i = j;
        continue;
      }

      // Operators
      if (["=", "!=", "<>", ">", "<", ">=", "<="].some((op) => sql.startsWith(op, i))) {
        const op = ["!=", "<>", ">=", "<="].find((o) => sql.startsWith(o, i)) || sql[i];
        tokens.push({ type: "OPERATOR", value: op, position: i });
        i += op.length;
        continue;
      }

      // Single-character punctuation
      const punctMap: Record<string, TokenType> = {
        "*": "STAR", ",": "COMMA", ";": "SEMICOLON", ".": "DOT", "?": "QUESTION",
        "(": "PUNCTUATION", ")": "PUNCTUATION",
      };
      if (punctMap[sql[i]]) {
        tokens.push({ type: punctMap[sql[i]], value: sql[i], position: i });
        i++;
        continue;
      }

      i++; // skip unrecognized characters
    }

    return tokens;
  }

  // ── Parser ─────────────────────────────────────────────────────

  private parse(tokens: Token[]): ASTNode {
    if (tokens.length === 0) throw new Error("Empty SQL statement");

    const first = tokens[0];
    switch (first.type === "KEYWORD" ? first.value.toUpperCase() : "") {
      case "CREATE":
        return this.parseCreateTable(tokens);
      case "INSERT":
        return this.parseInsert(tokens);
      case "SELECT":
        return this.parseSelect(tokens);
      case "UPDATE":
        return this.parseUpdate(tokens);
      case "DELETE":
        return this.parseDelete(tokens);
      default:
        throw new Error(`Unsupported SQL statement starting with: ${first.value}`);
    }
  }

  private parseCreateTable(tokens: Token[]): CreateTableNode {
    let pos = 0;
    this.expectKeyword(tokens, pos++, "CREATE");
    this.expectKeyword(tokens, pos++, "TABLE");

    let ifNotExists = false;
    if (
      tokens[pos]?.type === "KEYWORD" &&
      tokens[pos].value.toUpperCase() === "IF"
    ) {
      pos++;
      if (
        tokens[pos]?.type === "KEYWORD" &&
        tokens[pos].value.toUpperCase() === "NOT"
      ) {
        pos++;
        if (
          tokens[pos]?.type === "KEYWORD" &&
          tokens[pos].value.toUpperCase() === "EXISTS"
        ) {
          ifNotExists = true;
          pos++;
        }
      }
    }

    const tableName = this.expectIdentifier(tokens, pos++);
    this.expectPunctuation(tokens, pos++, "(");

    const columns: ColumnDef[] = [];
    while (pos < tokens.length && !(tokens[pos].type === "PUNCTUATION" && tokens[pos].value === ")")) {
      const colName = this.expectIdentifier(tokens, pos++);
      let colType: ColumnDef["type"] = "text";
      let isPrimaryKey = false;
      let isNotNull = false;
      let isUnique = false;
      let defaultValue: unknown = undefined;

      // Parse column type
      if (pos < tokens.length && tokens[pos].type === "KEYWORD") {
        const typeUpper = tokens[pos].value.toUpperCase();
        if (["INTEGER", "INT"].includes(typeUpper)) { colType = "integer"; pos++; }
        else if (["REAL", "FLOAT", "DOUBLE"].includes(typeUpper)) { colType = "real"; pos++; }
        else if (typeUpper === "TEXT" || typeUpper === "VARCHAR") { colType = "text"; pos++; }
        else if (typeUpper === "BLOB") { colType = "blob"; pos++; }
      }

      // Parse constraints
      while (pos < tokens.length && !(tokens[pos].type === "PUNCTUATION" && tokens[pos].value === ")") &&
             !(tokens[pos].type === "COMMA")) {
        const kw = tokens[pos].value.toUpperCase();
        if (kw === "PRIMARY") {
          pos++;
          if (pos < tokens.length && tokens[pos].value.toUpperCase() === "KEY") pos++;
          isPrimaryKey = true;
        } else if (kw === "NOT") {
          pos++;
          if (pos < tokens.length && tokens[pos].value.toUpperCase() === "NULL") pos++;
          isNotNull = true;
        } else if (kw === "UNIQUE") {
          isUnique = true;
          pos++;
        } else if (kw === "DEFAULT") {
          pos++;
          if (pos < tokens.length) {
            if (tokens[pos].type === "NUMBER") {
              defaultValue = tokens[pos].value.includes(".")
                ? parseFloat(tokens[pos].value)
                : parseInt(tokens[pos].value, 10);
            } else if (tokens[pos].type === "STRING") {
              defaultValue = tokens[pos].value;
            } else if (tokens[pos].type === "KEYWORD" && tokens[pos].value.toUpperCase() === "NULL") {
              defaultValue = null;
            }
            pos++;
          }
        } else if (kw === "AUTOINCREMENT") {
          pos++;
        } else {
          pos++; // skip unknown
        }
      }

      columns.push({
        name: colName,
        type: colType,
        primaryKey: isPrimaryKey,
        notNull: isNotNull,
        unique: isUnique,
        defaultValue,
      });

      if (pos < tokens.length && tokens[pos].type === "COMMA") pos++;
    }

    this.expectPunctuation(tokens, pos++, ")");

    return { type: "CREATE_TABLE", tableName, columns, ifNotExists };
  }

  private parseInsert(tokens: Token[]): InsertNode {
    let pos = 0;
    this.expectKeyword(tokens, pos++, "INSERT");
    this.expectKeyword(tokens, pos++, "INTO");

    const tableName = this.expectIdentifier(tokens, pos++);
    const columns: string[] = [];

    if (tokens[pos]?.type === "PUNCTUATION" && tokens[pos].value === "(") {
      pos++; // skip (
      while (pos < tokens.length && !(tokens[pos].type === "PUNCTUATION" && tokens[pos].value === ")")) {
        columns.push(this.expectIdentifier(tokens, pos++));
        if (tokens[pos]?.type === "COMMA") pos++;
      }
      pos++; // skip )
    }

    this.expectKeyword(tokens, pos++, "VALUES");
    const allValues: unknown[][] = [];

    do {
      this.expectPunctuation(tokens, pos++, "(");
      const rowValues: unknown[] = [];
      while (pos < tokens.length && !(tokens[pos].type === "PUNCTUATION" && tokens[pos].value === ")")) {
        if (tokens[pos].type === "STRING") {
          rowValues.push(tokens[pos].value);
        } else if (tokens[pos].type === "NUMBER") {
          rowValues.push(
            tokens[pos].value.includes(".")
              ? parseFloat(tokens[pos].value)
              : parseInt(tokens[pos].value, 10)
          );
        } else if (
          tokens[pos].type === "KEYWORD" &&
          tokens[pos].value.toUpperCase() === "NULL"
        ) {
          rowValues.push(null);
        } else {
          rowValues.push(null);
        }
        pos++;
        if (tokens[pos]?.type === "COMMA") pos++;
      }
      pos++; // skip )
      allValues.push(rowValues);
      if (tokens[pos]?.type === "COMMA") pos++;
    } while (pos < tokens.length && tokens[pos]?.type === "PUNCTUATION" && tokens[pos].value === "(");

    return { type: "INSERT", tableName, columns, values: allValues };
  }

  private parseSelect(tokens: Token[]): SelectNode {
    let pos = 0;
    this.expectKeyword(tokens, pos++, "SELECT");

    let distinct = false;
    if (tokens[pos]?.type === "KEYWORD" && tokens[pos].value.toUpperCase() === "DISTINCT") {
      distinct = true;
      pos++;
    }

    // Parse select columns
    const columns: Array<{ expr: ExpressionNode; alias?: string }> = [];
    while (
      pos < tokens.length &&
      !(
        (tokens[pos].type === "KEYWORD" && ["FROM", "WHERE", "ORDER", "GROUP", "LIMIT", "OFFSET", "JOIN", "INNER", "LEFT"].includes(tokens[pos].value.toUpperCase())) ||
        (tokens[pos].type === "SEMICOLON")
      )
    ) {
      const expr = this.parseExpression(tokens, pos);
      // Advance past the expression (simple heuristic: advance until comma or FROM)
      let exprEnd = pos;
      let parenDepth = 0;
      while (exprEnd < tokens.length) {
        if (tokens[exprEnd].type === "PUNCTUATION" && tokens[exprEnd].value === "(") parenDepth++;
        if (tokens[exprEnd].type === "PUNCTUATION" && tokens[exprEnd].value === ")") parenDepth--;
        if (
          parenDepth === 0 &&
          (tokens[exprEnd].type === "COMMA" ||
            (tokens[exprEnd].type === "KEYWORD" &&
              ["FROM", "WHERE", "ORDER", "GROUP", "LIMIT", "OFFSET"].includes(
                tokens[exprEnd].value.toUpperCase()
              )))
        ) {
          break;
        }
        exprEnd++;
      }

      // Re-parse expression slice properly
      const exprTokens = tokens.slice(pos, exprEnd);
      const parsedExpr = this.parseExpressionSlice(exprTokens);
      let alias: string | undefined;

      // Check for AS alias
      if (exprEnd < tokens.length && tokens[exprEnd].type === "KEYWORD" && tokens[exprEnd].value.toUpperCase() === "AS") {
        exprEnd++;
        alias = this.expectIdentifier(tokens, exprEnd);
        exprEnd++;
      }

      columns.push({ expr: parsedExpr, alias });
      pos = exprEnd;
      if (tokens[pos]?.type === "COMMA") pos++;
    }

    this.expectKeyword(tokens, pos++, "FROM");
    const tableName = this.expectIdentifier(tokens, pos++);

    let alias: string | undefined;
    if (pos < tokens.length && tokens[pos].type === "KEYWORD" && tokens[pos].value.toUpperCase() === "AS") {
      pos++;
      alias = this.expectIdentifier(tokens, pos++);
    }

    // Parse JOINs
    const joins: JoinClause[] = [];
    while (
      pos < tokens.length &&
      ((tokens[pos].type === "KEYWORD" &&
        ["JOIN", "INNER", "LEFT"].includes(tokens[pos].value.toUpperCase())) ||
       (tokens[pos].type === "IDENTIFIER"))
    ) {
      const join = this.parseJoin(tokens, pos);
      joins.push(join);
      // Advance pos past join (approximate)
      pos = this.advancePastJoin(tokens, pos);
    }

    // Parse WHERE
    let where: WhereClause | undefined;
    if (pos < tokens.length && tokens[pos].type === "KEYWORD" && tokens[pos].value.toUpperCase() === "WHERE") {
      pos++;
      const whereResult = this.parseWhereClause(tokens, pos);
      where = whereResult.clause;
      pos = whereResult.endPos;
    }

    // Parse GROUP BY
    let groupBy: string[] | undefined;
    if (pos < tokens.length && tokens[pos].type === "KEYWORD" && tokens[pos].value.toUpperCase() === "GROUP") {
      pos++;
      this.expectKeyword(tokens, pos++, "BY");
      groupBy = [];
      while (
        pos < tokens.length &&
        !(
          (tokens[pos].type === "KEYWORD" &&
            ["ORDER", "LIMIT", "OFFSET", "HAVING"].includes(tokens[pos].value.toUpperCase())) ||
          tokens[pos].type === "SEMICOLON
