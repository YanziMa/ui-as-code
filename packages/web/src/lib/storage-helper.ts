/**
 * Advanced storage utilities: localStorage/sessionStorage wrappers with
 * type safety, TTL expiration, size limits, namespace isolation,
 * cross-tab sync via BroadcastChannel, migration support, and fallback strategies.
 */

// --- Types ---

export interface StorageOptions<T = unknown> {
  /** Key prefix / namespace for isolation */
  namespace?: string;
  /** Time-to-live in ms (0 = no expiry) */
  ttl?: number;
  /** Default value if key not found */
  defaultValue?: T;
  /** Custom serializer (default: JSON.stringify) */
  serializer?: (value: T) => string;
  /** Custom deserializer (default: JSON.parse) */
  deserializer?: (raw: string) => T;
  /** Max storage size in bytes (0 = unlimited) */
  maxSizeBytes?: number;
  /** Callback on write */
  onWrite?: (key: string, value: T) => void;
  /** Callback on read */
  onRead?: (key: string, value: T | undefined) => void;
  /** Callback on delete */
  onDelete?: (key: string) => void;
}

export interface StorageEntry<T = unknown> {
  value: T;
  expiresAt: number | null; // null = never expires
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface StorageStats {
  totalKeys: number;
  totalSizeBytes: number;
  expiredKeys: number;
  namespaceCount: number;
  quotaUsed: number;
  quotaTotal: number;
}

export interface StorageMigration {
  version: number;
  migrate: (data: unknown) => unknown;
}

export interface CrossTabMessage {
  type: "set" | "delete" | "clear" | "sync";
  key: string;
  namespace?: string;
  timestamp: number;
  payload?: unknown;
}

export interface StorageManagerInstance<TStore extends Record<string, unknown> = Record<string, unknown>> {
  /** Get a value by key */
  get<K extends keyof TStore>(key: K): TStore[K] | undefined;
  /** Set a value by key */
  set<K extends keyof TStore>(key: K, value: TStore[K], options?: { ttl?: number }): void;
  /** Check if key exists and is not expired */
  has(key: string): boolean;
  /** Delete a key */
  delete(key: string): boolean;
  /** Clear all keys in this namespace */
  clear(): void;
  /** Get all non-expired entries as object */
  getAll(): Partial<TStore>;
  /** Get entry metadata */
  getMeta(key: string): StorageEntry<unknown> | null;
  /** Get storage stats */
  getStats(): StorageStats;
  /** Remove all expired entries */
  purgeExpired(): number;
  /** Register a data migration */
  registerMigration(migration: StorageMigration): void;
  /** Run pending migrations */
  runMigrations(): void;
  /** Subscribe to cross-tab changes */
  subscribeCrossTab(callback: (msg: CrossTabMessage) => void): () => void;
  /** Broadcast change to other tabs */
  broadcast(type: CrossTabMessage["type"], key: string, payload?: unknown): void;
  /** Export all data (for backup) */
  exportData(): Record<string, StorageEntry<unknown>>;
  /** Import data (from backup) */
  importData(data: Record<string, StorageEntry<unknown>>): void;
  /** Destroy instance and cleanup */
  destroy(): void;
}

// --- Internal Helpers ---

const DEFAULT_OPTIONS: Required<Omit<StorageOptions, "defaultValue" | "onWrite" | "onRead" | "onDelete">> = {
  namespace: "",
  ttl: 0,
  serializer: (v: unknown) => JSON.stringify(v),
  deserializer: (raw: string) => JSON.parse(raw),
  maxSizeBytes: 0,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function buildNamespacedKey(namespace: string, key: string): string {
  return namespace ? `${namespace}:${key}` : key;
}

function estimateSize(value: unknown): number {
  return new Blob([JSON.stringify(value)]).size;
}

function now(): number {
  return Date.now();
}

// --- Main Class ---

export class StorageHelper {
  create<TStore extends Record<string, unknown> = Record<string, unknown>>(
    options: StorageOptions & { storageType?: "local" | "session" } = {},
  ): StorageManagerInstance<TStore> {
    let destroyed = false;

    const {
      namespace = "",
      ttl: defaultTtl = 0,
      defaultValue,
      serializer = (v: unknown) => JSON.stringify(v),
      deserializer = (raw: string) => JSON.parse(raw),
      maxSizeBytes = 0,
      onWrite,
      onRead,
      onDelete,
      storageType = "local",
    } = options;

    const resolvedOpts = { ...DEFAULT_OPTIONS, namespace, ttl: defaultTtl, serializer, deserializer, maxSizeBytes };

    // Pick storage backend
    const getBackend = (): Storage | null => {
      if (!isBrowser()) return null;
      return storageType === "session" ? window.sessionStorage : window.localStorage;
    };

    // Migrations registry
    const migrations: StorageMigration[] = [];
    let currentVersion = 0;

    // Cross-tab channel
    let channel: BroadcastChannel | null = null;
    const crossTabListeners = new Set<(msg: CrossTabMessage) => void>();

    if (isBrowser() && typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(`storage-helper:${namespace || "default"}`);
        channel.onmessage = (event) => {
          if (destroyed) return;
          const msg = event.data as CrossTabMessage;
          for (const cb of crossTabListeners) cb(msg);
        };
      } catch {
        // BroadcastChannel not available (some iframe contexts)
      }
    }

    function readRaw(key: string): string | null {
      const backend = getBackend();
      if (!backend) return null;
      const nsKey = buildNamespacedKey(namespace, key);
      return backend.getItem(nsKey);
    }

    function writeRaw(key: string, raw: string): boolean {
      const backend = getBackend();
      if (!backend) return false;
      const nsKey = buildNamespacedKey(namespace, key);

      if (maxSizeBytes > 0 && new Blob([raw]).size > maxSizeBytes) {
        console.warn(`[StorageHelper] Value exceeds max size (${maxSizeBytes} bytes) for key: ${nsKey}`);
        return false;
      }

      try {
        backend.setItem(nsKey, raw);
        return true;
      } catch (e) {
        if ((e as DOMException).name === "QuotaExceededError") {
          console.warn(`[StorageHelper] Quota exceeded for key: ${nsKey}`);
        }
        return false;
      }
    }

    function removeRaw(key: string): void {
      const backend = getBackend();
      if (!backend) return;
      const nsKey = buildNamespacedKey(namespace, key);
      backend.removeItem(nsKey);
    }

    function parseEntry<T>(raw: string): StorageEntry<T> | null {
      try {
        return deserializer(raw) as StorageEntry<T>;
      } catch {
        return null;
      }
    }

    function serializeEntry<T>(value: T, customTtl?: number): string {
      const effectiveTtl = customTtl ?? defaultTtl;
      const entry: StorageEntry<T> = {
        value,
        expiresAt: effectiveTtl > 0 ? now() + effectiveTtl : null,
        createdAt: now(),
        updatedAt: now(),
        version: currentVersion,
      };
      return serializer(entry as unknown);
    }

    function isExpired(entry: StorageEntry<unknown>): boolean {
      if (entry.expiresAt === null) return false;
      return now() > entry.expiresAt;
    }

    function getAllKeys(): string[] {
      const backend = getBackend();
      if (!backend) return [];
      const prefix = namespace ? `${namespace}:` : "";
      const keys: string[] = [];
      for (let i = 0; i < backend.length; i++) {
        const key = backend.key(i);
        if (key && (prefix === "" || key.startsWith(prefix))) {
          keys.push(key.slice(prefix.length));
        }
      }
      return keys;
    }

    const instance: StorageManagerInstance<TStore> = {

      get<K extends keyof TStore>(key: K): TStore[K] | undefined {
        if (destroyed) return undefined;

        const raw = readRaw(key as string);
        if (raw === null) {
          onRead?.(key as string, defaultValue as TStore[K]);
          return defaultValue as TStore[K];
        }

        const entry = parseEntry<TStore[K]>(raw);
        if (!entry || isExpired(entry)) {
          // Clean up expired entry
          removeRaw(key as string);
          onRead?.(key as string, defaultValue as TStore[K]);
          return defaultValue as TStore[K];
        }

        onRead?.(key as string, entry.value);
        return entry.value;
      },

      set<K extends keyof TStore>(key: K, value: TStore[K], opts?: { ttl?: number }): void {
        if (destroyed) return;

        const raw = serializeEntry(value, opts?.ttl);
        const success = writeRaw(key as string, raw);

        if (success) {
          onWrite?.(key as string, value);
          this.broadcast("set", key as string, value);
        }
      },

      has(key: string): boolean {
        if (destroyed) return false;
        const raw = readRaw(key);
        if (raw === null) return false;
        const entry = parseEntry(raw);
        return entry !== null && !isExpired(entry);
      },

      delete(key: string): boolean {
        if (destroyed) return false;

        const exists = this.has(key);
        if (exists) {
          removeRaw(key);
          onDelete?.(key);
          this.broadcast("delete", key);
        }
        return exists;
      },

      clear(): void {
        if (destroyed) return;
        const keys = getAllKeys();
        for (const key of keys) {
          removeRaw(key);
          onDelete?.(key);
        }
        this.broadcast("clear", "*");
      },

      getAll(): Partial<TStore> {
        if (destroyed) return {};

        const result = {} as Partial<TStore>;
        const keys = getAllKeys();

        for (const key of keys) {
          const raw = readRaw(key);
          if (raw !== null) {
            const entry = parseEntry(raw);
            if (entry && !isExpired(entry)) {
              (result as Record<string, unknown>)[key] = entry.value;
            }
          }
        }
        return result;
      },

      getMeta(key: string): StorageEntry<unknown> | null {
        if (destroyed) return null;
        const raw = readRaw(key);
        if (raw === null) return null;
        return parseEntry(raw);
      },

      getStats(): StorageStats {
        const keys = getAllKeys();
        let totalSize = 0;
        let expiredCount = 0;

        for (const key of keys) {
          const raw = readRaw(key);
          if (raw !== null) {
            totalSize += new Blob([raw]).size;
            const entry = parseEntry(raw);
            if (entry && isExpired(entry)) expiredCount++;
          }
        }

        const backend = getBackend();

        return {
          totalKeys: keys.length - expiredCount,
          totalSizeBytes: totalSize,
          expiredKeys: expiredCount,
          namespaceCount: namespace ? 1 : 0,
          quotaUsed: totalSize,
          quotaTotal: backend ? 5 * 1024 * 1024 : 0, // ~5MB typical localStorage limit
        };
      },

      purgeExpired(): number {
        const keys = getAllKeys();
        let purged = 0;

        for (const key of keys) {
          const raw = readRaw(key);
          if (raw !== null) {
            const entry = parseEntry(raw);
            if (entry && isExpired(entry)) {
              removeRaw(key);
              purged++;
            }
          }
        }
        return purged;
      },

      registerMigration(migration: StorageMigration): void {
        migrations.push(migration);
        migrations.sort((a, b) => a.version - b.version);
      },

      runMigrations(): void {
        if (destroyed || migrations.length === 0) return;

        // Read current version from special key
        const verRaw = readRaw("__storage_version__");
        const storedVersion = verRaw ? parseInt(verRaw, 10) : 0;

        const pendingMigrations = migrations.filter((m) => m.version > storedVersion);

        for (const migration of pendingMigrations) {
          const keys = getAllKeys().filter((k) => k !== "__storage_version__");

          for (const key of keys) {
            const raw = readRaw(key);
            if (raw !== null) {
              const entry = parseEntry(raw);
              if (entry && !isExpired(entry)) {
                const migratedValue = migration.migrate(entry.value);
                if (migratedValue !== entry.value) {
                  const newEntry = {
                    ...entry,
                    value: migratedValue,
                    updatedAt: now(),
                    version: migration.version,
                  };
                  writeRaw(key, serializer(newEntry as unknown));
                }
              }
            }
          }

          currentVersion = migration.version;
        }

        // Store latest version
        if (pendingMigrations.length > 0) {
          writeRaw("__storage_version__", String(currentVersion));
        }
      },

      subscribeCrossTab(callback: (msg: CrossTabMessage) => void): () => void {
        crossTabListeners.add(callback);
        return () => { crossTabListeners.delete(callback); };
      },

      broadcast(type: CrossTabMessage["type"], key: string, payload?: unknown): void {
        if (channel && !destroyed) {
          const msg: CrossTabMessage = { type, key, namespace, timestamp: now(), payload };
          try {
            channel.postMessage(msg);
          } catch {
            // Structured clone may fail for some payloads
          }
        }
      },

      exportData(): Record<string, StorageEntry<unknown>> {
        const result: Record<string, StorageEntry<unknown>> = {};
        const keys = getAllKeys();

        for (const key of keys) {
          if (key === "__storage_version__") continue;
          const raw = readRaw(key);
          if (raw !== null) {
            const entry = parseEntry(raw);
            if (entry) result[key] = entry;
          }
        }
        return result;
      },

      importData(data: Record<string, StorageEntry<unknown>>): void {
        if (destroyed) return;

        for (const [key, entry] of Object.entries(data)) {
          if (!isExpired(entry)) {
            writeRaw(key, serializer(entry as unknown));
          }
        }
        this.broadcast("sync", "*");
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        if (channel) {
          channel.close();
          channel = null;
        }
        crossTabListeners.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a storage helper */
export function createStorageHelper<T extends Record<string, unknown> = Record<string, unknown>>(
  options?: StorageOptions & { storageType?: "local" | "session" },
): StorageManagerInstance<T> {
  return new StorageHelper().create(options);
}

// --- Standalone helpers ---

/** Check if localStorage is available and usable */
export function isLocalStorageAvailable(): boolean {
  if (!isBrowser()) return false;
  try {
    const testKey = "__storage_test__";
    window.localStorage.setItem(testKey, "test");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/** Check if sessionStorage is available and usable */
export function isSessionStorageAvailable(): boolean {
  if (!isBrowser()) return false;
  try {
    const testKey = "__storage_test__";
    window.sessionStorage.setItem(testKey, "test");
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/** Simple typed localStorage getter with fallback */
export function storageGet<T>(key: string, fallback?: T): T | undefined {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Simple typed localStorage setter */
export function storageSet<T>(key: string, value: T): boolean {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Simple typed localStorage remover */
export function storageRemove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/** Estimate remaining localStorage space in bytes */
export function storageRemainingSpace(): number {
  if (!isBrowser()) return 0;
  try {
    const testStr = "x".repeat(1024); // 1KB chunks
    let size = 0;
    const testKey = "__space_test__";
    while (true) {
      try {
        window.localStorage.setItem(testKey, testStr);
        size += 1024;
      } catch {
        break;
      }
    }
    window.localStorage.removeItem(testKey);
    // Subtract what we just measured from typical limit
    return Math.max(0, 5 * 1024 * 1024 - size);
  } catch {
    return 0;
  }
}

/** Cookie helper: set a cookie with options */
export function setCookie(
  name: string,
  value: string,
  options: {
    days?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
  } = {},
): void {
  if (!isBrowser()) return;
  const { days = 365, path = "/", domain, secure, sameSite = "Lax" } = options;
  const expires = days ? `; expires=${new Date(Date.now() + days * 86400000).toUTCString()}` : "";
  const domainPart = domain ? `; domain=${domain}` : "";
  const securePart = secure ? "; secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${expires}; path=${path}${domainPart}${securePart}; samesite=${sameSite}`;
}

/** Cookie helper: get a cookie value */
export function getCookie(name: string): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${encodeURIComponent(name)}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Cookie helper: delete a cookie */
export function deleteCookie(name: string, options: { path?: string; domain?: string } = {}): void {
  setCookie(name "", { days: -1, path: options.path, domain: options.domain });
}
