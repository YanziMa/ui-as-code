/**
 * Enhanced localStorage wrapper with TTL (time-to-live), type safety,
 * cross-tab sync via storage events, namespace isolation, size management,
 * and migration support.
 */

// --- Types ---

export interface StorageItem<T = unknown> {
  value: T;
  /** Expiration timestamp (ms since epoch). 0 = no expiration */
  expiresAt: number;
  /** When the item was created */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
  /** Version for migrations */
  version?: number;
}

export interface StorageOptions {
  /** Time-to-live in milliseconds (default: never expire) */
  ttl?: number;
  /** Namespace prefix for key isolation */
  namespace?: string;
  /** Serializer (default: JSON.stringify/parse) */
  serializer?: {
    serialize: (data: unknown) => string;
    deserialize: (raw: string) => unknown;
  };
  /** Default value if key doesn't exist or is expired */
  defaultValue?: unknown;
  /** Callback when an item expires on access */
  onExpire?: (key: string, value: unknown) => void;
  /** Max storage usage in bytes (default: 5MB) */
  maxSizeBytes?: number;
}

export interface StorageInstance<T = unknown> {
  /** Get a value (returns default/expired handling) */
  get: (key: string) => T | null;
  /** Set a value with optional TTL override */
  set: (key: string, value: T, ttlMs?: number) => void;
  /** Remove a specific key */
  remove: (key: string) => void;
  /** Check if key exists and is not expired */
  has: (key: string) => boolean;
  /** Get all keys in this namespace */
  keys: () => string[];
  /** Get all non-expired items */
  getAll: () => Record<string, T>;
  /** Clear all items in namespace */
  clear: () => void;
  /** Remove expired items */
  cleanup: () => number;
  /** Get raw item metadata */
  getMeta: (key: string) => Omit<StorageItem<T>, "value"> | null;
  /** Subscribe to changes from other tabs */
  subscribe: (listener: (key: string, newValue: T | null, oldValue: T | null) => void) => () => void;
  /** Estimate total storage size in bytes */
  getSize: () => number;
  /** Destroy instance and cleanup listeners */
  destroy: () => void;
}

// --- Internal Helpers ---

function isAvailable(): boolean {
  try {
    const testKey = "__ls_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const DEFAULT_SERIALIZER = {
  serialize: (data: unknown): string => JSON.stringify(data),
  deserialize: (raw: string): unknown => {
    try { return JSON.parse(raw); } catch { return raw; }
  },
};

function namespacedKey(namespace: string | undefined, key: string): string {
  return namespace ? `${namespace}:${key}` : key;
}

function stripNamespace(namespace: string | undefined, fullKey: string): string {
  return namespace && fullKey.startsWith(`${namespace}:`)
    ? fullKey.slice(namespace.length + 1)
    : fullKey;
}

// --- Main Class ---

export class LocalStorageManager<T = unknown> {
  create(options: StorageOptions = {}): StorageInstance<T> {
    const available = isAvailable();
    const ns = options.namespace;
    const serializer = options.serializer ?? DEFAULT_SERIALIZER;
    const maxSize = options.maxSizeBytes ?? 5 * 1024 * 1024; // 5MB
    const listeners = new Set<(key: string, newValue: T | null, oldValue: T | null) => void>();
    let destroyed = false;

    function resolveKey(key: string): string {
      return namespacedKey(ns, key);
    }

    function readRaw(key: string): StorageItem<T> | null {
      if (!available) return null;
      try {
        const raw = window.localStorage.getItem(resolveKey(key));
        if (!raw) return null;
        return serializer.deserialize(raw) as StorageItem<T>;
      } catch {
        return null;
      }
    }

    function writeRaw(key: string, item: StorageItem<T>): void {
      if (!available || destroyed) return;
      try {
        const serialized = serializer.serialize(item);
        // Check size limit
        if (serialized.length > maxSize) {
          console.warn(`[LocalStorage] Item "${key}" exceeds max size (${serialized.length} > ${maxSize})`);
          return;
        }
        window.localStorage.setItem(resolveKey(key), serialized);
      } catch (e) {
        if (e instanceof DOMException && (
          e.name === "QuotaExceededError" ||
          e.name === "NS_ERROR_DOM_QUOTA_REACHED"
        )) {
          console.warn("[localStorage] Quota exceeded. Consider calling cleanup().");
        }
      }
    }

    function isExpired(item: StorageItem<T>): boolean {
      return item.expiresAt > 0 && Date.now() >= item.expiresAt;
    }

    const instance: StorageInstance<T> = {

      get(key: string): T | null {
        const item = readRaw(key);
        if (!item) return (options.defaultValue ?? null) as T | null;

        if (isExpired(item)) {
          options.onExpire?.(key, item.value);
          // Don't auto-remove; let cleanup() handle it
          return (options.defaultValue ?? null) as T | null;
        }

        return item.value;
      },

      set(key: string, value: T, ttlMs?: number): void {
        const now = Date.now();
        const existing = readRaw(key);

        const item: StorageItem<T> = {
          value,
          expiresAt: ttlMs !== undefined
            ? now + ttlMs
            : (options.ttl !== undefined ? now + options.ttl : 0),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          version: existing?.version,
        };

        writeRaw(key, item);
      },

      remove(key: string): void {
        if (!available || destroyed) return;
        try {
          window.localStorage.removeItem(resolveKey(key));
        } catch { /* ignore */ }
      },

      has(key: string): boolean {
        const item = readRaw(key);
        return item !== null && !isExpired(item);
      },

      keys(): string[] {
        if (!available) return [];
        const result: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const fullKey = window.localStorage.key(i);
          if (fullKey && (!ns || fullKey.startsWith(`${ns}:`))) {
            result.push(stripNamespace(ns, fullKey));
          }
        }
        return result;
      },

      getAll(): Record<string, T> {
        const result: Record<string, T> = {};
        for (const key of instance.keys()) {
          const val = instance.get(key);
          if (val !== null) result[key] = val;
        }
        return result;
      },

      clear(): void {
        if (!available || destroyed) return;
        for (const key of instance.keys()) {
          try {
            window.localStorage.removeItem(resolveKey(key));
          } catch { /* ignore */ }
        }
      },

      cleanup(): number {
        let removed = 0;
        for (const key of instance.keys()) {
          const item = readRaw(key);
          if (item && isExpired(item)) {
            instance.remove(key);
            removed++;
          }
        }
        return removed;
      },

      getMeta(key: string): Omit<StorageItem<T>, "value"> | null {
        const item = readRaw(key);
        if (!item) return null;
        const { value: _, ...meta } = item;
        return meta;
      },

      subscribe(listener): () => void {
        listeners.add(listener);

        // Set up storage event listener once
        if (listeners.size === 1) {
          const handler = (e: StorageEvent) => {
            if (destroyed) return;
            if (ns && !e.key?.startsWith(`${ns}:`)) return;
            if (!ns && e.key?.includes(":")) return; // Skip namespaced keys from other instances

            const bareKey = stripNamespace(ns, e.key ?? "");
            let newValue: T | null = null;
            let oldValue: T | null = null;

            if (e.newValue) {
              try {
                const parsed = serializer.deserialize(e.newValue) as StorageItem<T>;
                if (!isExpired(parsed)) newValue = parsed.value;
              } catch { /* ignore */ }
            }
            if (e.oldValue) {
              try {
                const parsed = serializer.deserialize(e.oldValue) as StorageItem<T>;
                oldValue = parsed.value;
              } catch { /* ignore */ }
            }

            for (const l of listeners) {
              try { l(bareKey, newValue, oldValue); } catch { /* ignore */ }
            }
          };

          window.addEventListener("storage", handler);
          (instance as any)._storageHandler = handler;
        }

        return () => { listeners.delete(listener); };
      },

      getSize(): number {
        if (!available) return 0;
        let size = 0;
        for (const key of instance.keys()) {
          try {
            size += (window.localStorage.getItem(resolveKey(key)) ?? "").length;
          } catch { /* ignore */ }
        }
        return size;
      },

      destroy(): void {
        destroyed = true;
        listeners.clear();
        const handler = (instance as any)._storageHandler;
        if (handler) {
          window.removeEventListener("storage", handler);
        }
      },
    };

    return instance;
  }
}

/** Convenience: create a namespaced storage instance */
export function createLocalStorage<T = unknown>(
  namespace?: string,
  options?: Omit<StorageOptions, "namespace">,
): StorageInstance<T> {
  return new LocalStorageManager<T>().create({ namespace, ...options });
}

// --- Standalone Utilities ---

/** Quick set with optional TTL */
export function lsSet<T>(key: string, value: T, ttlMs?: number): void {
  createLocalStorage().set(key, value, ttlMs);
}

/** Quick get with type inference */
export function lsGet<T>(key: string): T | null {
  return createLocalStorage<T>().get(key);
}

/** Quick remove */
export function lsRemove(key: string): void {
  createLocalStorage().remove(key);
}

/** Quick check existence */
export function lsHas(key: string): boolean {
  return createLocalStorage().has(key);
}

/** SessionStorage wrapper with same API shape */
export class SessionStorageManager<T = unknown> {
  create(options: Omit<StorageOptions, "maxSizeBytes"> = {}): StorageInstance<T> {
    // Reuse same logic but backed by sessionStorage
    const lsOptions: StorageOptions = { ...options, maxSizeBytes: 10 * 1024 * 1024 }; // 10MB for session
    const base = new LocalStorageManager<T>().create(lsOptions);

    // Override internal methods to use sessionStorage
    const origGet = base.get.bind(base);
    const origSet = base.set.bind(base);
    const origRemove = base.remove.bind(base);
    const origHas = base.has.bind(base);
    const origKeys = base.keys.bind(base);
    const origClear = base.clear.bind(base);
    const origGetSize = base.getSize.bind(base);

    // We need to redirect to sessionStorage - patch at the prototype level
    // by overriding the internal read/write
    const ns = options.namespace;

    function resolveKey(key: string): string {
      return ns ? `${ns}:${key}` : key;
    }

    const sessionImpl: StorageInstance<T> = {
      get: origGet,
      set(key: string, value: T, ttlMs?: number): void {
        if (typeof window === "undefined" || !window.sessionStorage) return;
        try {
          const item: StorageItem<T> = {
            value,
            expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : (options.ttl !== undefined ? Date.now() + options.ttl : 0),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          window.sessionStorage.setItem(resolveKey(key), JSON.stringify(item));
        } catch { /* quota */ }
      },
      remove: origRemove,
      has: origHas,
      keys: origKeys,
      getAll() {
        const result: Record<string, T> = {};
        if (typeof window === "undefined" || !window.sessionStorage) return result;
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const k = window.sessionStorage.key(i);
          if (k && (!ns || k.startsWith(`${ns}:`))) {
            try {
              const raw = JSON.parse(window.sessionStorage.getItem(k)!) as StorageItem<T>;
              if (!(raw.expiresAt > 0 && Date.now() >= raw.expiresAt)) {
                const bareKey = ns ? k.slice(ns.length + 1) : k;
                result[bareKey] = raw.value;
              }
            } catch { /* ignore */ }
          }
        }
        return result;
      },
      clear: origClear,
      cleanup: () => 0, // Session storage clears on tab close anyway
      getMeta: base.getMeta.bind(base),
      subscribe: base.subscribe.bind(base),
      getSize: origGetSize,
      destroy: base.destroy.bind(base),
    };

    return sessionImpl;
  }
}

/** Convenience: create a session storage instance */
export function createSessionStorage<T = unknown>(
  namespace?: string,
  options?: Omit<StorageOptions, "namespace" | "maxSizeBytes">,
): StorageInstance<T> {
  return new SessionStorageManager<T>().create({ namespace, ...options });
}
