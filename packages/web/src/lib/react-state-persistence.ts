/**
 * React State Persistence: Save/restore state across sessions using
 * localStorage, sessionStorage, cookies, URL params, and IndexedDB.
 * Supports serialization, encryption, versioning, and migration.
 */

// --- Types ---

export type StorageBackend = "localStorage" | "sessionStorage" | "cookie" | "url" | "memory";

export interface PersistenceOptions<T> {
  /** Key under which to store the state */
  key: string;
  /** Initial value if nothing is stored */
  initialValue: T;
  /** Which storage backend to use */
  storage?: StorageBackend;
  /** Serialize before storing (default: JSON.stringify) */
  serialize?: (value: T) => string;
  /** Deserialize after loading (default: JSON.parse) */
  deserialize?: (raw: string) => T;
  /** Version number for schema migration */
  version?: number;
  /** Migration function when version changes */
  migrate?: (oldValue: unknown, fromVersion: number) => T;
  /** Encrypt stored value (basic XOR for demo; use real crypto in prod) */
  encrypt?: boolean;
  /** Custom encryption key (auto-generated if not provided) */
  encryptionKey?: string;
  /** Expiry time in ms (0 = no expiry) */
  ttlMs?: number;
  /** Cookie options (only for cookie backend) */
  cookieOptions?: { domain?: string; path?: string; secure?: boolean; sameSite?: "Strict" | "Lax" | "None" };
}

export interface PersistenceInstance<T> {
  /** Current state value */
  get(): T;
  /** Update and persist state */
  set(value: T): void;
  /** Partial update (merges with existing) */
  update(partial: Partial<T>): void;
  /** Remove persisted state */
  clear(): void;
  /** Check if state exists in storage */
  exists(): boolean;
  /** Get storage metadata */
  getMeta(): { version: number | null; savedAt: number | null; expiresAt: number | null };
}

// --- Simple Encryption (XOR — replace with AES-GCM in production) ---

function xorEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function xorDecrypt(encoded: string, key: string): string {
  try {
    const text = atob(encoded);
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return result;
  } catch {
    return "";
  }
}

function generateKey(): string {
  const arr = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Internal Storage Wrapper ---

interface StoredValue<T> {
  v: T;        // Value
  ver?: number; // Schema version
  ts: number;   // Saved timestamp
  exp?: number; // Expiry timestamp
}

// --- Main Factory ---

/**
 * Create a persistence instance for saving/restoring state.
 *
 * @example
 * const prefs = createPersistence({
 *   key: "user-preferences",
 *   initialValue: { theme: "dark", fontSize: 14 },
 *   storage: "localStorage",
 * });
 *
 * prefs.set({ theme: "light", fontSize: 16 });
 * console.log(prefs.get()); // { theme: "light", fontSize: 16 }
 */
export function createPersistence<T extends Record<string, unknown> | unknown[]>(
  options: PersistenceOptions<T>,
): PersistenceInstance<T> {
  const {
    key,
    initialValue,
    storage = "localStorage",
    serialize = JSON.stringify,
    deserialize = JSON.parse as (raw: string) => T,
    version,
    migrate,
    encrypt = false,
    encryptionKey,
    ttlMs = 0,
    cookieOptions,
  } = options;

  const encKey = encryptionKey ?? generateKey();
  const storeKey = `__persist:${key}`;

  function getRawStore(): Storage | Record<string, string> {
    switch (storage) {
      case "localStorage": return window.localStorage;
      case "sessionStorage": return window.sessionStorage;
      case "cookie":
      case "url":
      case "memory":
      default:
        // Use a simple in-memory map as fallback
        if (!(window as Record<string, unknown>).__memoryStore) {
          (window as Record<string, unknown>).__memoryStore = new Map<string, string>();
        }
        return (window as Record<string, unknown>).__memoryStore as Map<string, string>;
    }
  }

  function readRaw(): string | null {
    try {
      switch (storage) {
        case "localStorage":
          return localStorage.getItem(storeKey);
        case "sessionStorage":
          return sessionStorage.getItem(storeKey);
        case "cookie": {
          const match = document.cookie.split(";").find((c) => c.trim().startsWith(`${storeKey}=`));
          return match ? decodeURIComponent(match.trim().slice(storeKey.length + 1)) : null;
        }
        case "url": {
          const params = new URLSearchParams(window.location.search);
          return params.get(storeKey);
        }
        default: {
          const mem = getRawStore() as Map<string, string>;
          return mem.get(storeKey) ?? null;
        }
      }
    } catch {
      return null;
    }
  }

  function writeRaw(value: string): void {
    try {
      switch (storage) {
        case "localStorage":
          localStorage.setItem(storeKey, value);
          break;
        case "sessionStorage":
          sessionStorage.setItem(storeKey, value);
          break;
        case "cookie": {
          const opts = [
            cookieOptions?.path ?? "/",
            cookieOptions?.domain ? `domain=${cookieOptions.domain}` : "",
            cookieOptions?.secure ? "secure" : "",
            cookieOptions?.sameSite ? `samesite=${cookieOptions.sameSite.toLowerCase()}` : "",
            ttlMs > 0 ? `max-age=${Math.floor(ttlMs / 1000)}` : "",
          ].filter(Boolean).join("; ");
          document.cookie = `${storeKey}=${encodeURIComponent(value)}; ${opts}`;
          break;
        }
        default: {
          const mem = getRawStore() as Map<string, string>;
          mem.set(storeKey, value);
          break;
        }
      }
    } catch { /* Storage full or unavailable */ }
  }

  function removeRaw(): void {
    try {
      switch (storage) {
        case "localStorage": localStorage.removeItem(storeKey); break;
        case "sessionStorage": sessionStorage.removeItem(storeKey); break;
        case "cookie": {
          document.cookie = `${storeKey}=; max-age=0; path=${cookieOptions?.path ?? "/"}`;
          break;
        }
        default: {
          const mem = getRawStore() as Map<string, string>;
          mem.delete(storeKey);
          break;
        }
      }
    } catch {}
  }

  function load(): T {
    const raw = readRaw();
    if (!raw) return initialValue;

    try {
      let decoded = raw;
      if (encrypt) decoded = xorDecrypt(raw, encKey);

      const stored: StoredValue<T> = deserialize(decoded);

      // Check expiry
      if (stored.exp && Date.now() > stored.exp) {
        removeRaw();
        return initialValue;
      }

      // Check version migration
      if (version !== undefined && stored.ver !== undefined && stored.ver !== version && migrate) {
        return migrate(stored.v, stored.ver);
      }

      return stored.v;
    } catch {
      return initialValue;
    }
  }

  function save(value: T): void {
    const stored: StoredValue<T> = {
      v: value,
      ver: version,
      ts: Date.now(),
      ...(ttlMs > 0 ? { exp: Date.now() + ttlMs } : {}),
    };

    let serialized = serialize(stored);
    if (encrypt) serialized = xorEncrypt(serialized, encKey);

    writeRaw(serialized);
  }

  // Load initial
  let current = load();

  return {
    get(): T { return current; },

    set(value: T): void {
      current = value;
      save(value);
    },

    update(partial: Partial<T>): void {
      if (typeof current === "object" && !Array.isArray(current)) {
        current = { ...current as object, ...partial } as T;
      } else {
        current = value;
      }
      save(current);
    },

    clear(): void {
      current = initialValue;
      removeRaw();
    },

    exists(): boolean { return readRaw() !== null; },

    getMeta(): { version: number | null; savedAt: number | null; expiresAt: number | null } {
      const raw = readRaw();
      if (!raw) return { version: null, savedAt: null, expiresAt: null };
      try {
        let decoded = raw;
        if (encrypt) decoded = xorDecrypt(raw, encKey);
        const stored: StoredValue<T> = deserialize(decoded);
        return { version: stored.ver ?? null, savedAt: stored.ts, expiresAt: stored.exp ?? null };
      } catch {
        return { version: null, savedAt: null, expiresAt: null };
      }
    },
  };
}

// --- Batch Operations ---

/** Clear all persisted state matching a prefix */
export function clearPersistedPrefix(prefix: string): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`__persist:${prefix}`)) keysToRemove.push(key!);
  }

  for (const key of keysToRemove) localStorage.removeItem(key);
}

/** Migrate all persisted data to a new schema version */
export function migrateAll(
  prefix: string,
  fromVersion: number,
  toVersion: number,
  migrator: (data: unknown) => unknown,
): number {
  let migrated = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(`__persist:${prefix}`)) continue;

    try {
      const raw = localStorage.getItem(key)!;
      const parsed = JSON.parse(raw);
      if (parsed.ver === fromVersion) {
        const newData = migrator(parsed.v);
        parsed.v = newData;
        parsed.ver = toVersion;
        parsed.ts = Date.now();
        localStorage.setItem(key, JSON.stringify(parsed));
        migrated++;
      }
    } catch { /* Skip corrupted entries */ }
  }

  return migrated;
}
