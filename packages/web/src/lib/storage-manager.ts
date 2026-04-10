/**
 * Storage Manager: Unified client-side storage abstraction supporting
 * localStorage, sessionStorage, cookies, IndexedDB, and memory backends.
 * Features TTL/expiration, encryption, cross-tab sync, size monitoring,
 * migration, namespace isolation, and fallback chains.
 */

// --- Types ---

export type StorageBackend = "local" | "session" | "cookie" | "indexedDB" | "memory";

export interface StorageEntry<T = unknown> {
  value: T;
  /** Expiration timestamp (ms), 0 = never expires */
  expiresAt: number;
  /** When the entry was created */
  createdAt: number;
  /** Last updated timestamp */
  updatedAt: number;
  /** Number of times read */
  readCount: number;
  /** Number of times written */
  writeCount: number;
  /** Storage version for migrations */
  version: number;
  /** Namespace/group tag */
  namespace?: string;
  /** Optional tags for filtering */
  tags?: string[];
}

export interface StorageOptions<T = unknown> {
  /** Time-to-live in milliseconds (default: never expire) */
  ttl?: number;
  /** Namespace prefix for key isolation */
  namespace?: string;
  /** Encrypt the stored value */
  encrypt?: boolean;
  /** Custom serializer (default: JSON) */
  serializer?: {
    serialize(data: T): string;
    deserialize(raw: string): T;
  };
  /** Default value when key doesn't exist */
  defaultValue?: T;
  /** Tags for categorization */
  tags?: string[];
  /** Version for schema migrations */
  version?: number;
  /** Sync across tabs via BroadcastChannel */
  crossTabSync?: boolean;
  /** Compression threshold in bytes (compress values larger than this) */
  compressThreshold?: number;
}

export interface StorageStats {
  totalKeys: number;
  totalSizeBytes: number;
  expiredEntries: number;
  namespaces: Record<string, number>;
  byBackend: Record<StorageBackend, number>;
  lastCleanup: number;
}

export interface MigrationPlan {
  fromVersion: number;
  toVersion: number;
  migrate: (value: unknown) => unknown;
}

// --- Encryption Helpers ---

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, ["encrypt", "decrypt"],
  );
}

async function encryptValue(text: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, enc.encode(text),
  );
  // Combine: salt(16) + iv(12) + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  combined.set(salt, 0);
  combined.set(iv, 16);
  combined.set(new Uint8Array(encrypted), 28);
  return btoa(String.fromCharCode(...combined));
}

async function decryptValue(encoded: string, password: string): Promise<string> {
  const combined = new Uint8Array(atob(encoded).split("").map((c) => c.charCodeAt(0)));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// --- Simple LZ-style compression ---

function compress(str: string): string {
  // Simple run-length + dictionary compression for strings
  const dict: Record<string, number> = {};
  let dictSize = 128;
  let result = "";
  let buffer = "";

  for (let i = 0; i < str.length; i++) {
    const char = str[i]!;
    buffer += char;

    // Check if buffer + next char exists in dictionary
    const lookAhead = i + 1 < str.length ? buffer + str[i + 1] : null;
    if (lookAhead && lookAhead in dict) {
      continue;
    }

    if (buffer.length === 1 && buffer.charCodeAt(0) < 128) {
      result += buffer;
    } else if (buffer in dict) {
      result += String.fromCharCode(dict[buffer] + 128);
    } else {
      if (dictSize < 65535) {
        dict[buffer] = dictSize++;
      }
      // Output as escaped sequence
      result += `\x01${buffer}`;
    }
    buffer = "";
  }
  result += buffer;
  return result;
}

function decompress(str: string): string {
  // Reverse of compress
  const dict: Record<number, string> = {};
  let dictSize = 128;
  let result = "";
  let i = 0;

  while (i < str.length) {
    const code = str.charCodeAt(i);
    if (code === 1) {
      // Escaped sequence
      i++;
      let token = "";
      while (i < str.length && str.charCodeAt(i) !== 1) {
        token += str[i]!;
        i++;
      }
      dict[dictSize++] = token;
      result += token;
    } else if (code >= 128) {
      result += dict[code - 128] ?? "";
      i++;
    } else {
      result += str[i]!;
      // Add single-char entries to dict
      const prev = result.slice(-1);
      if (!(dictSize - 1 in dict || Object.values(dict).includes(prev))) {
        dict[dictSize++] = prev;
      }
      i++;
    }
  }
  return result;
}

// --- In-Memory Backend ---

class MemoryBackend {
  private store = new Map<string, StorageEntry>();

  get<T>(key: string): StorageEntry<T> | null {
    return (this.store.get(key) as StorageEntry<T>) ?? null;
  }

  set<T>(key: string, entry: StorageEntry<T>): void {
    this.store.set(key, entry as StorageEntry);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  keys(): string[] {
    return Array.from(this.store.keys());
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number { return this.store.size; }
}

// --- Cookie Backend ---

class CookieBackend {
  get<T>(key: string): StorageEntry<T> | null {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
      const [k, v] = cookie.split("=");
      if (k === key) {
        try {
          return JSON.parse(decodeURIComponent(v)) as StorageEntry<T>;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  set<T>(key: string, entry: StorageEntry<T>, options?: { maxAge?: number; domain?: string; secure?: boolean }): void {
    let cookie = `${key}=${encodeURIComponent(JSON.stringify(entry))}`;
    if (options?.maxAge) cookie += `; max-age=${options.maxAge}`;
    if (options?.domain) cookie += `; domain=${options.domain}`;
    if (options?.secure) cookie += "; secure";
    cookie += "; path=/; SameSite=Lax";
    document.cookie = cookie;
  }

  delete(key: string): boolean {
    document.cookie = `${key}=; max-age=0; path=/`;
    return true;
  }

  keys(): string[] {
    return document.cookie.split("; ").map((c) => c.split("=")[0]!).filter(Boolean);
  }

  clear(): void {
    for (const key of this.keys()) this.delete(key);
  }
}

// --- LocalStorage Backend ---

class LocalStorageBackend {
  private prefix: string;

  constructor(prefix = "") {
    this.prefix = prefix;
  }

  get<T>(key: string): StorageEntry<T> | null {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      if (!raw) return null;
      return JSON.parse(raw) as StorageEntry<T>;
    } catch {
      return null;
    }
  }

  set<T>(key: string, entry: StorageEntry<T>): void {
    localStorage.setItem(this.prefix + key, JSON.stringify(entry));
  }

  delete(key: string): boolean {
    localStorage.removeItem(this.prefix + key);
    return true;
  }

  keys(): string[] {
    const result: string[] = for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(this.prefix)) result.push(k.slice(this.prefix.length));
    }
    return result;
  }

  clear(): void {
    const keys = this.keys();
    for (const key of keys) this.delete(key);
  }
}

// --- SessionStorage Backend ---

class SessionStorageBackend extends LocalStorageBackend {
  constructor() {
    super("");
  }

  override get<T>(key: string): StorageEntry<T> | null {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as StorageEntry<T>;
    } catch {
      return null;
    }
  }

  override set<T>(key: string, entry: StorageEntry<T>): void {
    sessionStorage.setItem(key, JSON.stringify(entry));
  }

  override delete(key: string): boolean {
    sessionStorage.removeItem(key);
    return true;
  }

  override keys(): string[] {
    const result: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k) result.push(k);
    }
    return result;
  }

  override clear(): void {
    sessionStorage.clear();
  }
}

// --- IndexedDB Backend ---

class IndexedDBBackend {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;
  private ready: Promise<IDBDatabase>;

  constructor(dbName = "storage-manager", storeName = "kv-store") {
    this.dbName = dbName;
    this.storeName = storeName;
    this.ready = this.openDb();
  }

  private openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async get<T>(key: string): Promise<StorageEntry<T> | null> {
    const db = await this.ready;
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, "readonly");
      const req = tx.objectStore(this.storeName).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  }

  async set<T>(key: string, entry: StorageEntry<T>): Promise<void> {
    const db = await this.ready;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).put(entry, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(key: string): Promise<boolean> {
    const db = await this.ready;
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async keys(): Promise<string[]> {
    const db = await this.ready;
    return new Promise((resolve) => {
      const tx = db.transaction(this.storeName, "readonly");
      const req = tx.objectStore(this.storeName).getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => resolve([]);
    });
  }

  async clear(): Promise<void> {
    const db = await this.ready;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      tx.objectStore(this.storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// --- Main Storage Manager ---

export class StorageManager {
  private backends: Map<StorageBackend, MemoryBackend | LocalStorageBackend | SessionStorageBackend | CookieBackend | IndexedDBBackend>;
  private defaultBackend: StorageBackend;
  private defaultNamespace: string;
  private migrations: Map<number, MigrationPlan> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private encryptionPassword: string | null = null;
  private listeners = new Set<(event: { key: string; action: "set" | "delete" | "clear" }) => void>();

  constructor(options?: {
    defaultBackend?: StorageBackend;
    namespace?: string;
    idbDatabase?: string;
    idbStore?: string;
    encryptionPassword?: string;
    crossTabSync?: boolean;
  }) {
    this.backends = new Map();
    this.defaultBackend = options?.defaultBackend ?? "local";
    this.defaultNamespace = options?.namespace ?? "";
    this.encryptionPassword = options?.encryptionPassword ?? null;

    // Initialize backends
    this.backends.set("memory", new MemoryBackend());
    this.backends.set("local", new LocalStorageBackend());
    this.backends.set("session", new SessionStorageBackend());
    this.backends.set("cookie", new CookieBackend());
    this.backends.set("indexedDB", new IndexedDBBackend(options?.idbDatabase, options?.idbStore));

    // Cross-tab sync
    if (options?.crossTabSync) {
      try {
        this.broadcastChannel = new BroadcastChannel(`storage-${options.namespace ?? "default"}`);
        this.broadcastChannel.onmessage = (e) => {
          for (const l of this.listeners) l(e.data);
        };
      } catch {
        // BroadcastChannel not supported
      }
    }
  }

  // --- Core CRUD ---

  /** Get a value by key */
  async get<T>(key: string, options?: StorageOptions<T>): Promise<T | null> {
    const backend = this.resolveBackend(options);
    const namespacedKey = this.namespacedKey(key, options?.namespace);
    const entry = await this.getRaw<T>(backend, namespacedKey);

    if (!entry) return options?.defaultValue ?? null;

    // Check expiration
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      await this.remove(namespacedKey, { backend });
      return options?.defaultValue ?? null;
    }

    // Update read count
    entry.readCount++;

    // Run migrations if needed
    if (options?.version && entry.version < options.version) {
      const migrated = await this.runMigrations(entry.value, entry.version, options.version);
      entry.value = migrated as T;
      entry.version = options.version;
      await this.setRaw(backend, namespacedKey, entry);
    }

    return entry.value;
  }

  /** Set a value by key */
  async set<T>(key: string, value: T, options?: StorageOptions<T>): Promise<void> {
    const backend = this.resolveBackend(options);
    const namespacedKey = this.namespacedKey(key, options?.namespace);
    const now = Date.now();

    // Get existing entry to preserve stats
    const existing = await this.getRaw<T>(backend, namespacedKey);

    let serializedValue: string;
    try {
      serializedValue = options?.serializer
        ? options.serializer.serialize(value)
        : JSON.stringify(value);
    } catch {
      serializedValue = String(value);
    }

    // Compress if needed
    if (options?.compressThreshold && serializedValue.length > options.compressThreshold) {
      serializedValue = compress(serializedValue);
    }

    // Encrypt if needed
    if (options?.encrypt || this.encryptionPassword) {
      serializedValue = await encryptValue(serializedValue, this.encryptionPassword ?? "default-key");
    }

    const entry: StorageEntry<T> = {
      value: serializedValue as unknown as T,
      expiresAt: options?.ttl ? now + options.ttl : 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      readCount: existing?.readCount ?? 0,
      writeCount: (existing?.writeCount ?? 0) + 1,
      version: options?.version ?? existing?.version ?? 1,
      namespace: options?.namespace ?? this.defaultNamespace || undefined,
      tags: options?.tags,
    };

    await this.setRaw(backend, namespacedKey, entry);

    // Notify listeners & cross-tab
    this.notify({ key: namespacedKey, action: "set" });
  }

  /** Remove a key */
  async remove(key: string, options?: { backend?: StorageBackend; namespace?: string }): Promise<boolean> {
    const backend = options?.backend ?? this.defaultBackend;
    const namespacedKey = this.namespacedKey(key, options?.namespace);
    const b = this.backends.get(backend);
    if (!b) return false;
    const result = await b.delete(namespacedKey);
    this.notify({ key: namespacedKey, action: "delete" });
    return result;
  }

  /** Check if a key exists */
  async has(key: string, options?: { namespace?: string }): Promise<boolean> {
    const val = await this.get(key, options);
    return val !== null;
  }

  /** Clear all storage (or per-namespace) */
  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      const keys = await this.keys(namespace);
      for (const key of keys) await this.remove(key, { namespace });
    } else {
      for (const [, backend] of this.backends) {
        await backend.clear();
      }
    }
    this.notify({ key: "*", action: "clear" });
  }

  // --- Bulk Operations ---

  /** Get multiple values */
  async getMany<T>(keys: string[], options?: StorageOptions<T>): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    for (const key of keys) {
      const val = await this.get<T>(key, options);
      if (val !== null) result.set(key, val);
    }
    return result;
  }

  /** Set multiple values */
  async setMany<T>(entries: Record<string, T>, options?: StorageOptions<T>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, options);
    }
  }

  // --- Query ---

  /** List all keys (optionally filtered by namespace/tags) */
  async keys(namespace?: string): Promise<string[]> {
    const backend = this.backends.get(this.defaultBackend);
    if (!backend) return [];
    const allKeys = await backend.keys();
    if (!namespace) return allKeys;
    const nsPrefix = `${namespace}:`;
    return allKeys.filter((k) => k.startsWith(nsPrefix)).map((k) => k.slice(nsPrefix.length));
  }

  /** Get storage statistics */
  async getStats(): Promise<StorageStats> {
    const stats: StorageStats = {
      totalKeys: 0,
      totalSizeBytes: 0,
      expiredEntries: 0,
      namespaces: {},
      byBackend: { local: 0, session: 0, cookie: 0, indexedDB: 0, memory: 0 },
      lastCleanup: Date.now(),
    };

    for (const [backendName, backend] of this.backends) {
      try {
        const keys = await backend.keys();
        stats.byBackend[backendName] = keys.length;
        stats.totalKeys += keys.length;

        for (const key of keys) {
          const entry = await this.getRaw(backend, key);
          if (entry) {
            const size = JSON.stringify(entry).length;
            stats.totalSizeBytes += size;
            if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
              stats.expiredEntries++;
            }
            if (entry.namespace) {
              stats.namespaces[entry.namespace] = (stats.namespaces[entry.namespace] ?? 0) + 1;
            }
          }
        }
      } catch {
        // Some backends might not support listing
      }
    }

    return stats;
  }

  // --- Maintenance ---

  /** Remove all expired entries */
  async cleanup(): Promise<number> {
    let removed = 0;
    for (const [_, backend] of this.backends) {
      const keys = await backend.keys();
      for (const key of keys) {
        const entry = await this.getRaw(backend, key);
        if (entry && entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
          await backend.delete(key);
          removed++;
        }
      }
    }
    return removed;
  }

  /** Register a migration plan */
  registerMigration(plan: MigrationPlan): void {
    this.migrations.set(plan.fromVersion, plan);
  }

  // --- Events ---

  /** Subscribe to storage change events */
  onChange(listener: (event: { key: string; action: "set" | "delete" | "clear" }) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Destroy cleanup */
  destroy(): void {
    if (this.broadcastChannel) this.broadcastChannel.close();
    this.listeners.clear();
  }

  // --- Internal ---

  private resolveBackend(options?: StorageOptions<unknown>): StorageBackend {
    // Could be extended to detect from options
    return this.defaultBackend;
  }

  private namespacedKey(key: string, namespace?: string): string {
    const ns = namespace ?? this.defaultNamespace;
    return ns ? `${ns}:${key}` : key;
  }

  private async getRaw<T>(
    backend: StorageBackend,
    key: string,
  ): Promise<StorageEntry<T> | null> {
    const b = this.backends.get(backend);
    if (!b) return null;
    const entry = await b.get<T>(key);

    if (!entry) return null;

    // Decrypt if needed
    if (typeof entry.value === "string" && this.encryptionPassword) {
      try {
        entry.value = await decryptValue(entry.value, this.encryptionPassword) as unknown as T;
      } catch {
        // Not encrypted or wrong key
      }
    }

    // Decompress if needed
    if (typeof entry.value === "string" && entry.value.startsWith("\x01")) {
      try {
        entry.value = decompress(entry.value) as unknown as T;
      } catch {
        // Not compressed
      }
    }

    // Deserialize
    if (typeof entry.value === "string") {
      try {
        entry.value = JSON.parse(entry.value) as T;
      } catch {
        // Keep as-is
      }
    }

    return entry;
  }

  private async setRaw(
    backend: StorageBackend,
    key: string,
    entry: StorageEntry,
  ): Promise<void> {
    const b = this.backends.get(backend);
    if (!b) return;
    await b.set(key, entry);
  }

  private async runMigrations(value: unknown, fromVersion: number, toVersion: number): Promise<unknown> {
    let current = value;
    let version = fromVersion;

    while (version < toVersion) {
      const plan = this.migrations.get(version);
      if (!plan) break;
      current = plan.migrate(current);
      version = plan.toVersion;
    }

    return current;
  }

  private notify(event: { key: string; action: "set" | "delete" | "clear" }): void {
    for (const l of this.listeners) l(event);
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(event);
    }
  }
}
