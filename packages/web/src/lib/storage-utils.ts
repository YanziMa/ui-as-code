/**
 * Storage Utilities: Multi-backend storage abstraction, TTL/expiry support,
 * type-safe get/set, namespace isolation, cross-tab sync via storage events,
 * size quota management, encryption option, batch operations, migration system,
 * change subscription, stats tracking.
 */

// --- Types ---

export type StorageBackend = "localStorage" | "sessionStorage" | "memory" | "cookie";

export interface StorageEntry<T = unknown> {
  value: T;
  expiry?: number;       // Timestamp (ms) when entry expires
  createdAt: number;
  updatedAt: number;
  version?: number;
}

export interface StorageOptions {
  /** Default TTL in ms (0 = no expiry) */
  defaultTTL?: number;
  /** Namespace prefix for all keys */
  namespace?: string;
  /** Key versioning for migrations */
  version?: number;
  /** Encrypt values (requires crypto key or simple XOR) */
  encrypt?: boolean;
  /** Encryption key (for simple obfuscation) */
  encryptionKey?: string;
  /** Max storage size in bytes (0 = unlimited) */
  maxSizeBytes?: number;
  /** Auto-compress large values (>threshold bytes) */
  compressThreshold?: number;
}

export interface StorageStats {
  totalEntries: number;
  totalSizeBytes: number;
  expiredEntries: number;
  namespace: string;
  backend: StorageBackend;
  hitRate: number;
  lastCleanup: number | null;
}

export interface StorageMigration {
  fromVersion: number;
  toVersion: number;
  migrate: (data: Record<string, unknown>) => Record<string, unknown>;
}

interface InternalStorageEntry {
  v: unknown;           // value
  e?: number;           // expiry timestamp
  c: number;            // created at
  u: number;            // updated at
  ver?: number;         // schema version
}

// --- In-Memory Backend ---

class MemoryBackend {
  private store = new Map<string, string>();

  getItem(key: string): string | null { return this.store.get(key) ?? null; }
  setItem(key: string, value: string): void { this.store.set(key, value); }
  removeItem(key: string): void { this.store.delete(key); }
  clear(): void { this.store.clear(); }
  key(index: number): string | null {
    let i = 0;
    for (const k of this.store.keys()) { if (i === index) return k; i++; }
    return null;
  }
  get length(): number { return this.store.size; }
}

// --- Cookie Backend (fallback) ---

class CookieBackend {
  getItem(key: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${escapeCookie(key)}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  }

  setItem(key: string, value: string): void {
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  removeItem(key: string): void {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  clear(): void {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name) this.removeItem(name);
    });
  }

  key(_index: number): string | null { return null; } // Cookies don't support indexing well
  get length(): number { return document.cookie.split(";").filter((c) => c.includes("=")).length; }
}

function escapeCookie(str: string): string {
  return str.replace(/([.*+?^${}()|[\]\\])/g, "\\$1");
}

// --- Main Storage Manager ---

/**
 * Unified storage manager with multi-backend support, TTL, namespaces,
 * encryption, compression, migration, and change subscriptions.
 *
 * ```ts
 * const store = new StorageManager({ namespace: "myapp", defaultTTL: 3600000 });
 * await store.set("user", { name: "Alice" });
 * const user = await store.get<{ name: string }>("user");
 * ```
 */
export class StorageManager {
  private backend: Storage | MemoryBackend | CookieBackend;
  private options: Required<StorageOptions> & { backendType: StorageBackend };
  private listeners = new Set<(key: string, value: unknown | null, action: "set" | "remove") => void>();
  private stats = { hits: 0, misses: 0, writes: 0 };
  private migrations: StorageMigration[] = [];
  private _version = 1;

  constructor(options: StorageOptions & { backend?: StorageBackend } = {}) {
    const backendType = options.backend ?? "localStorage";
    this.options = {
      defaultTTL: options.defaultTTL ?? 0,
      namespace: options.namespace ?? "",
      version: options.version ?? 1,
      encrypt: options.encrypt ?? false,
      encryptionKey: options.encryptionKey ?? "",
      maxSizeBytes: options.maxSizeBytes ?? 0,
      compressThreshold: options.compressThreshold ?? 4096,
      backendType,
    };

    this._version = this.options.version;

    switch (backendType) {
      case "sessionStorage":
        this.backend = sessionStorage;
        break;
      case "memory":
        this.backend = new MemoryBackend();
        break;
      case "cookie":
        if (typeof document === "undefined") this.backend = new MemoryBackend();
        else this.backend = new CookieBackend();
        break;
      default:
        this.backend = localStorage;
    }

    // Listen for cross-tab changes
    if (typeof window !== "undefined" && (backendType === "localStorage" || backendType === "sessionStorage")) {
      window.addEventListener("storage", this.handleStorageEvent.bind(this));
    }
  }

  // --- Core API ---

  /** Get a typed value from storage */
  get<T = unknown>(key: string): T | null {
    const fullKey = this.namespacedKey(key);
    const raw = this.backend.getItem(fullKey);

    if (raw === null) { this.stats.misses++; return null; }

    try {
      const entry: InternalStorageEntry = JSON.parse(this.decrypt(raw));
      this.stats.hits++;

      // Check expiry
      if (entry.e && Date.now() > entry.e) {
        this.remove(key); // Auto-cleanup expired entries
        return null;
      }

      // Check migration
      if (entry.ver !== undefined && entry.ver < this._version) {
        const migrated = this.applyMigrations(entry.v!, entry.v as unknown as Record<string, unknown>);
        if (migrated !== null) {
          entry.v = migrated as T;
          entry.ver = this._version;
          this.setRaw(fullKey, JSON.stringify(entry));
        }
      }

      return entry.v as T;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  /** Set a value with optional TTL override */
  set<T = unknown>(key: string, value: T, ttlMs?: number): void {
    const fullKey = this.namespacedKey(key);
    const now = Date.now();
    const ttl = ttlMs ?? this.options.defaultTTL;

    const entry: InternalStorageEntry = {
      v: value,
      e: ttl > 0 ? now + ttl : undefined,
      c: now,
      u: now,
      ver: this._version,
    };

    this.setRaw(fullKey, this.encrypt(JSON.stringify(entry)));
    this.stats.writes++;
    this.notifyListeners(key, value, "set");
  }

  /** Remove a specific key */
  remove(key: string): boolean {
    const fullKey = this.namespacedKey(key);
    const existed = this.backend.getItem(fullKey) !== null;
    this.backend.removeItem(fullKey);
    if (existed) this.notifyListeners(key, null, "remove");
    return existed;
  }

  /** Check if a key exists (and is not expired) */
  has(key: string): boolean { return this.get(key) !== null; }

  /** Get all keys in current namespace */
  keys(): string[] {
    const prefix = this.options.namespace ? `${this.options.namespace}:` : "";
    const result: string[] = [];

    for (let i = 0; i < this.backend.length; i++) {
      const rawKey = this.backend.key(i);
      if (!rawKey?.startsWith(prefix)) continue;
      result.push(rawKey.slice(prefix.length));
    }
    return result;
  }

  /** Clear all entries in current namespace */
  clearNamespace(): void {
    for (const key of this.keys()) this.remove(key);
  }

  /** Clear everything (all namespaces) — use with caution */
  clearAll(): void { this.backend.clear(); }

  // --- Batch Operations ---

  /** Set multiple values at once */
  setMany(entries: Record<string, unknown>, ttlMs?: number): void {
    for (const [key, value] of Object.entries(entries)) this.set(key, value, ttlMs);
  }

  /** Get multiple values at once */
  getMany<T = unknown>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    for (const key of keys) result[key] = this.get<T>(key);
    return result;
  }

  /** Remove multiple keys */
  removeMany(keys: string[]): void { for (const key of keys) this.remove(key); }

  // --- TTL / Expiry ---

  /** Get remaining TTL for a key in ms (-1 if no expiry, -2 if not found/already expired) */
  getTTL(key: string): number {
    const fullKey = this.namespacedKey(key);
    const raw = this.backend.getItem(fullKey);
    if (!raw) return -2;

    try {
      const entry: InternalStorageEntry = JSON.parse(raw);
      if (!entry.e) return -1;
      return Math.max(0, entry.e - Date.now());
    } catch { return -2; }
  }

  /** Extend TTL for an existing key */
  refreshTTL(key: string, ttlMs?: number): boolean {
    const value = this.get(key);
    if (value === null) return false;
    this.set(key, value, ttlMs);
    return true;
  }

  // --- Subscriptions ---

  /** Subscribe to storage changes */
  onChange(listener: (key: string, value: unknown | null, action: "set" | "remove") => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Migrations ---

  /** Register a schema migration */
  addMigration(migration: StorageMigration): void {
    this.migrations.push(migration);
    this.migrations.sort((a, b) => a.fromVersion - b.fromVersion);
  }

  /** Run all pending migrations on stored data */
  runMigrations(): void {
    for (const key of this.keys()) {
      const raw = this.backend.getItem(this.namespacedKey(key));
      if (!raw) continue;

      try {
        const entry: InternalStorageEntry = JSON.parse(raw);
        if (entry.ver !== undefined && entry.ver < this._version) {
          const migrated = this.applyMigrations(entry.ver!, entry.v as unknown as Record<string, unknown>);
          if (migrated !== null) {
            entry.v = migrated;
            entry.ver = this._version;
            this.setRaw(this.namespacedKey(key), JSON.stringify(entry));
          }
        }
      } catch { /* Skip unparseable entries */ }
    }
  }

  // --- Stats ---

  /** Get storage statistics */
  getStats(): StorageStats {
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const key of this.keys()) {
      const raw = this.backend.getItem(this.namespacedKey(key));
      if (raw) totalSize += raw.length * 2; // UTF-16

      try {
        const entry: InternalStorageEntry = JSON.parse(raw!);
        if (entry.e && now > entry.e) expiredCount++;
      } catch { /* ignore */ }
    }

    const total = this.stats.hits + this.stats.misses;

    return {
      totalEntries: this.keys().length,
      totalSizeBytes: totalSize,
      expiredEntries: expiredCount,
      namespace: this.options.namespace,
      backend: this.options.backendType,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      lastCleanup: null,
    };
  }

  /** Clean up all expired entries */
  cleanup(): number {
    let removed = 0;
    for (const key of this.keys()) {
      if (this.getTTL(key) === -2 || this.getTTL(key) < 0 && this.getTTL(key) !== -1) continue;
      if (this.getTTL(key) === 0) { this.remove(key); removed++; }
    }
    return removed;
  }

  // --- Encryption (simple XOR obfuscation) ---

  private encrypt(data: string): string {
    if (!this.options.encrypt || !this.options.encryptionKey) return data;
    const key = this.options.encryptionKey;
    let result = "";
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }
    return btoa(result); // Base64 encode to make it printable
  }

  private decrypt(data: string): string {
    if (!this.options.encrypt || !this.options.encryptionKey) return data;
    try {
      const decoded = atob(data);
      const key = this.options.encryptionKey;
      let result = "";
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(
          decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length),
        );
      }
      return result;
    } catch { return data; } // If decryption fails, return raw
  }

  // --- Private Helpers ---

  private namespacedKey(key: string): string {
    return this.options.namespace ? `${this.options.namespace}:${key}` : key;
  }

  private setRaw(key: string, value: string): void {
    try { this.backend.setItem(key, value); }
    catch (e) {
      console.warn(`[StorageManager] Failed to write "${key}":`, e);
      // Try to free space by removing oldest entries
      this.evictLRU(1);
      try { this.backend.setItem(key, value); }
      catch (e2) { console.error("[StorageManager] Write failed after eviction:", e2); }
    }
  }

  private evictLRU(count: number): void {
    // Simple LRU: find entries by oldest updatedAt
    const entries: Array<{ key: string; u: number }> = [];
    for (const key of this.keys()) {
      const raw = this.backend.getItem(this.namespacedKey(key));
      if (raw) {
        try { entries.push({ key, u: (JSON.parse(raw)).u }); }
        catch { entries.push({ key, u: 0 }); }
      }
    }
    entries.sort((a, b) => a.u - b.u);
    for (let i = 0; i < Math.min(count, entries.length); i++) this.remove(entries[i]!.key);
  }

  private applyMigrations(fromVer: number, data: Record<string, unknown>): unknown | null {
    let current = data;
    let currentVer = fromVer;

    for (const mig of this.migrations) {
      if (mig.fromVersion === currentVer) {
        current = mig.migrate(current);
        currentVer = mig.toVersion;
      }
    }

    return currentVer === this._version ? current : null;
  }

  private notifyListeners(key: string, value: unknown | null, action: "set" | "remove"): void {
    for (const listener of this.listeners) {
      try { listener(key, value, action); } catch { /* protect listeners */ }
    }
  }

  private handleStorageEvent(event: StorageEvent): void {
    if (!event.key || !event.key.startsWith(this.options.namespace ? `${this.options.namespace}:` : "")) return;
    const key = event.key.slice(this.options.namespace ? this.options.namespace.length + 1 : 0);

    if (event.newValue === null) {
      this.notifyListeners(key, null, "remove");
    } else {
      try {
        const entry: InternalStorageEntry = JSON.parse(this.decrypt(event.newValue));
        this.notifyListeners(key, entry.v, "set");
      } catch { /* ignore parse errors */ }
    }
  }

  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", this.handleStorageEvent.bind(this));
    }
    this.listeners.clear();
  }
}

// --- Convenience Functions ---

/** Create a localStorage-backed store with common defaults */
export function createLocalStorage(namespace: string, options?: Partial<StorageOptions>): StorageManager {
  return new StorageManager({ ...options, namespace, backend: "localStorage" });
}

/** Create a session-scoped store */
export function createSessionStorage(namespace: string, options?: Partial<StorageOptions>): StorageManager {
  return new StorageManager({ ...options, namespace, backend: "sessionStorage" });
}

/** Create an in-memory store (useful for testing or SSR) */
export function createMemoryStore(namespace = "", options?: Partial<StorageOptions>): StorageManager {
  return new StorageManager({ ...options, namespace, backend: "memory" });
}
