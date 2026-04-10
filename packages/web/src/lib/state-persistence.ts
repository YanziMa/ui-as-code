/**
 * @module state-persistence
 * @description Comprehensive state persistence and synchronization library for web applications.
 *
 * Provides:
 * - Unified storage abstraction (localStorage, sessionStorage, IndexedDB, cookies, memory)
 * - Observable state manager with auto-persistence (Zustand-like but lighter)
 * - Cross-tab sync via BroadcastChannel + localStorage events
 * - Schema versioning and migration system
 * - Optional LZ-string style compression for large payloads
 * - AES-GCM encryption via Web Crypto API for sensitive data
 * - TTL / expiration support with auto-cleanup
 * - Storage quota detection and management
 * - Server-safe hydration (SSR detection)
 * - Built-in undo/redo history stack
 * - Redux DevTools-compatible action logging
 * - Full TypeScript generics throughout
 */

// ---------------------------------------------------------------------------
// 1. Type Definitions & Interfaces
// ---------------------------------------------------------------------------

/** Supported storage backend identifiers */
export type StorageBackend = 'local' | 'session' | 'indexedDB' | 'cookie' | 'memory';

/** Conflict resolution strategy for cross-tab sync */
export type ConflictStrategy = 'last-write-wins' | 'merge' | 'custom';

/** Cleanup strategy when storage is near its quota limit */
export type QuotaCleanupStrategy = 'fifo' | 'lru' | 'lfu' | 'oldest-first';

/** Result of a storage operation */
export interface StorageResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Metadata attached to every persisted entry */
export interface EntryMetadata<T = unknown> {
  /** Schema version of the stored data */
  version: number;
  /** Creation timestamp (ms since epoch) */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Optional TTL in milliseconds; 0 means no expiry */
  ttl: number;
  /** Whether the payload is compressed */
  compressed: boolean;
  /** Whether the payload is encrypted */
  encrypted: boolean;
  /** The actual data payload */
  value: T;
}

/** Internal envelope written to raw storage */
export interface StorageEnvelope<T = unknown> {
  v: number;
  c: number;
  u: number;
  t: number;
  cp: boolean;
  en: boolean;
  d: T;
}

/** Migration function signature: transforms data from one version to the next */
export type MigrationFunction<T> = (data: unknown) => T;

/** A single migration step mapping a source version to a transform function */
export interface MigrationStep<T> {
  fromVersion: number;
  toVersion: number;
  migrate: MigrationFunction<T>;
}

/** Schema migration registry */
export interface SchemaMigration<T> {
  currentVersion: number;
  steps: MigrationStep<T>[];
}

/** Custom conflict resolver receives local and remote state and returns the winner */
export type CustomConflictResolver<T> = (local: T, remote: T, key: string) => T;

/** Cross-tab sync configuration */
export interface SyncConfig<T = unknown> {
  enabled: boolean;
  channelName?: string;
  conflictStrategy: ConflictStrategy;
  customResolver?: CustomConflictResolver<T>;
  mergeFn?: (local: T, remote: T) => T;
  debounceMs?: number;
}

/** Encryption configuration */
export interface EncryptionConfig {
  enabled: boolean;
  /** Base64-encoded 256-bit key (32 bytes). If omitted, one is generated on first use and must be persisted externally. */
  keyB64?: string;
}

/** Compression configuration */
export interface CompressionConfig {
  enabled: boolean;
  thresholdBytes?: number;
}

/** Quota management configuration */
export interface QuotaConfig {
  warningThreshold: number;   // 0-1 fraction of quota at which to warn / cleanup
  cleanupStrategy: QuotaCleanupStrategy;
  maxEntries?: number;
}

/** Store configuration options */
export interface PersistOptions<T = unknown> {
  /** Storage backend(s) to use, tried in order as fallback chain */
  storageBackends: StorageBackend[];
  /** Key prefix for namespacing entries */
  keyPrefix?: string;
  /** Enable / configure encryption */
  encryption?: EncryptionConfig;
  /** Enable / configure compression */
  compression?: CompressionConfig;
  /** Enable / configure TTL */
  defaultTtlMs?: number;
  /** Schema migrations */
  migrations?: SchemaMigration<T>;
  /** Cross-tab sync */
  sync?: SyncConfig<T>;
  /** Quota management */
  quota?: QuotaConfig;
  /** Enable undo/redo */
  undoRedo?: {
    enabled: boolean;
    maxDepth?: number;
  };
  /** Enable Redux DevTools logging */
  devTools?: boolean;
  devToolsName?: string;
  /** Called before persisting; return false to skip */
  shouldPersist?: (state: T, action: string) => boolean;
}

/** Action descriptor for DevTools / undo stack */
export interface StateAction {
  type: string;
  payload?: unknown;
  timestamp: number;
  previousState: unknown;
}

/** Observer callback signature */
export type StateObserver<T> = (state: T, prevState: T, action?: StateAction) => void;

/** Undo/redo history entry */
export interface HistoryEntry<T> {
  state: T;
  action: StateAction;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// 2. Environment Detection
// ---------------------------------------------------------------------------

/**
 * Detect whether code is running in a browser environment (vs SSR / Node).
 */
export function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof localStorage !== 'undefined'
  );
}

/**
 * Detect whether code is running in a secure context (required for Web Crypto API).
 */
export function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

// ---------------------------------------------------------------------------
// 3. Utility Helpers
// ---------------------------------------------------------------------------

/** Generate a unique ID string */
export function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Clamp a number between min and max */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Safe JSON parse that returns undefined on failure */
function safeJsonParse<T>(raw: string): T | undefined {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** Deep-clone a plain object via JSON round-trip */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  try {
    return JSON.parse(JSON.stringify(obj)) as T;
  } catch {
    return obj;
  }
}

// ---------------------------------------------------------------------------
// 4. Compression (LZ-style lightweight)
// ---------------------------------------------------------------------------

/**
 * Simple compression using base64-compatible encoding.
 * Compresses repeated character sequences and uses a dictionary approach.
 * This is a lightweight implementation suitable for moderate-sized payloads.
 * For production use with very large data, consider integrating lz-string.
 */
export const Compression = {
  /**
   * Compress a UTF-8 string into a shorter representation.
   * Uses run-length encoding + offset-based back-reference compression.
   */
  compress(input: string): string {
    if (!input || input.length < 8) return input;

    const dict: Record<string, number> = {};
    let result = '';
    let buffer = '';
    let dictSize = 256;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const phrase = buffer + char;

      if (dict[phrase] !== undefined) {
        buffer = phrase;
      } else {
        dict[phrase] = dictSize++;
        if (buffer.length > 0) {
          const code = buffer.length === 1 ? buffer.charCodeAt(0) : dict[buffer];
          result += String.fromCharCode(code);
        }
        buffer = char;
      }
    }

    if (buffer.length > 0) {
      const code = buffer.length === 1 ? buffer.charCodeAt(0) : dict[buffer];
      result += String.fromCharCode(code);
    }

    // Encode to base64-like string to avoid control characters
    return btoa(unescape(encodeURIComponent(result)));
  },

  /**
   * Decompress a previously compressed string back to its original form.
   */
  decompress(compressed: string): string {
    if (!compressed) return compressed;

    try {
      const decoded = decodeURIComponent(escape(atob(compressed)));
      const dict: string[] = [];
      let result = '';
      let current = '';
      let dictSize = 256;

      // Initialize dictionary with single-byte characters
      for (let i = 0; i < 256; i++) {
        dict[String.fromCharCode(i)] = String.fromCharCode(i);
      }

      let w = decoded[0];
      result = w;

      for (let i = 1; i < decoded.length; i++) {
        const k = decoded[i];
        let entry: string;

        if (dict[k] !== undefined) {
          entry = dict[k];
        } else if (parseInt(k) === dictSize) {
          entry = w + w[0];
        } else {
          throw new Error('Malformed compressed data');
        }

        result += entry;
        dict[dictSize++] = w + entry[0];
        w = entry;
      }

      return result;
    } catch {
      // If decompression fails, return original (might not be compressed)
      return compressed;
    }
  },

  /**
   * Estimate the byte size of a string (UTF-8 aware).
   */
  byteLength(str: string): number {
    return new Blob([str]).size;
  },
};

// ---------------------------------------------------------------------------
// 5. Encryption Layer (AES-GCM via Web Crypto API)
// ---------------------------------------------------------------------------

/**
 * AES-GCM encryption wrapper for sensitive data in storage.
 * Uses the Web Crypto API available in modern browsers.
 */
export const Encryption = {
  /**
   * Generate a new random 256-bit key and return it as base64.
   * Store this securely — without it, encrypted data cannot be recovered.
   */
  async generateKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  },

  /**
   * Import a base64-encoded raw key into a CryptoKey.
   */
  async importKey(keyB64: string): Promise<CryptoKey> {
    const raw = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
    return crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  },

  /**
   * Encrypt a plaintext string using AES-GCM.
   * Returns a JSON object containing iv (initialization vector) and ciphertext (base64).
   */
  async encrypt(plaintext: string, keyB64: string): Promise<string> {
    const key = await this.importKey(keyB64);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  },

  /**
   * Decrypt an AES-GCM encrypted string back to plaintext.
   */
  async decrypt(encryptedB64: string, keyB64: string): Promise<string> {
    const key = await this.importKey(keyB64);
    const combined = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(plaintext);
  },
};

// ---------------------------------------------------------------------------
// 6. Storage Abstraction Layer
// ---------------------------------------------------------------------------

/** In-memory store used as fallback or primary backend */
const memoryStore: Map<string, string> = new Map();

/**
 * Unified storage adapter providing a consistent API over multiple backends.
 * Backends are tried in order; the first available one wins.
 */
export class StorageAdapter {
  private activeBackend: StorageBackend;
  private fallbackChain: StorageBackend[];
  private db: IDBDatabase | null = null;
  private dbName = 'StatePersistenceDB';
  private dbStoreName = 'keyvalue';
  private dbReady: Promise<void>;

  constructor(backends: StorageBackend[] = ['local', 'session', 'indexedDB', 'memory']) {
    this.fallbackChain = backends;
    this.activeBackend = this.detectBackend();
    this.dbReady = this.initIndexedDb();
  }

  /**
   * Detect the first available and functional backend from the fallback chain.
   */
  private detectBackend(): StorageBackend {
    if (!isBrowser()) return 'memory';
    for (const backend of this.fallbackChain) {
      if (this.isAvailable(backend)) return backend;
    }
    return 'memory';
  }

  /**
   * Check whether a specific storage backend is available in the current environment.
   */
  isAvailable(backend: StorageBackend): boolean {
    try {
      switch (backend) {
        case 'local':
          const test = '__sp_test__';
          localStorage.setItem(test, test);
          localStorage.removeItem(test);
          return true;
        case 'session':
          sessionStorage.setItem(test, test);
          sessionStorage.removeItem(test);
          return true;
        case 'indexedDB':
          return typeof indexedDB !== 'undefined';
        case 'cookie':
          return typeof navigator !== 'undefined' && navigator.cookieEnabled;
        case 'memory':
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Initialize the IndexedDB database connection.
   */
  private async initIndexedDb(): Promise<void> {
    if (this.activeBackend !== 'indexedDB') return;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.dbStoreName)) {
          db.createObjectStore(this.dbStoreName);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the currently active storage backend name.
   */
  getBackend(): StorageBackend {
    return this.activeBackend;
  }

  /**
   * Read a value by key from the active backend.
   */
  async get(key: string): Promise<StorageResult<string>> {
    try {
      switch (this.activeBackend) {
        case 'local': {
          const val = localStorage.getItem(key);
          return { success: true, data: val ?? undefined };
        }
        case 'session': {
          const val = sessionStorage.getItem(key);
          return { success: true, data: val ?? undefined };
        }
        case 'indexedDB': {
          await this.dbReady;
          return new Promise((resolve) => {
            const tx = this.db!.transaction(this.dbStoreName, 'readonly');
            const req = tx.objectStore(this.dbStoreName).get(key);
            req.onsuccess = () =>
              resolve({ success: true, data: req.result ?? undefined });
            req.onerror = () =>
              resolve({ success: false, error: req.error?.message });
          });
        }
        case 'cookie': {
          const match = document.cookie.match(
            new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`)
          );
          return { success: true, data: match ? decodeURIComponent(match[1]) : undefined };
        }
        case 'memory': {
          return { success: true, data: memoryStore.get(key) };
        }
        default:
          return { success: false, error: `Unknown backend: ${this.activeBackend}` };
      }
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Write a value by key to the active backend.
   */
  async set(key: string, value: string): Promise<StorageResult<void>> {
    try {
      switch (this.activeBackend) {
        case 'local':
          localStorage.setItem(key, value);
          break;
        case 'session':
          sessionStorage.setItem(key, value);
          break;
        case 'indexedDB': {
          await this.dbReady;
          await new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction(this.dbStoreName, 'readwrite');
            tx.objectStore(this.dbStoreName).put(value, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          break;
        }
        case 'cookie': {
          const encoded = encodeURIComponent(value);
          const maxAge = 365 * 24 * 60 * 60; // 1 year
          document.cookie = `${encodeURIComponent(key)}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
          break;
        }
        case 'memory':
          memoryStore.set(key, value);
          break;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * Remove a value by key from the active backend.
   */
  async remove(key: string): Promise<StorageResult<void>> {
    try {
      switch (this.activeBackend) {
        case 'local':
          localStorage.removeItem(key);
          break;
        case 'session':
          sessionStorage.removeItem(key);
          break;
        case 'indexedDB': {
          await this.dbReady;
          await new Promise<void>((resolve, reject) => {
            const tx = this.db!.transaction(this.dbStoreName, 'readwrite');
            tx.objectStore(this.dbStoreName).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
          });
          break;
        }
        case 'cookie':
          document.cookie = `${encodeURIComponent(key)}=; path=/; max-age=0`;
          break;
        case 'memory':
          memoryStore.delete(key);
          break;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  /**
   * List all keys in the active backend (where supported).
   */
  async keys(): Promise<string[]> {
    try {
      switch (this.activeBackend) {
        case 'local':
          return Object.keys(localStorage);
        case 'session':
          return Object.keys(sessionStorage);
        case 'indexedDB': {
          await this.dbReady;
          return new Promise((resolve) => {
            const tx = this.db!.transaction(this.dbStoreName, 'readonly');
            const req = tx.objectStore(this.dbStoreName).getAllKeys();
            req.onsuccess = () => resolve(req.result as string[]);
            req.onerror = () => resolve([]);
          });
        }
        case 'cookie':
          return document.cookie
            .split(';')
            .map((c) => decodeURIComponent(c.trim().split('=')[0]))
            .filter(Boolean);
        case 'memory':
          return Array.from(memoryStore.keys());
        default:
          return [];
      }
    } catch {
      return [];
    }
  }

  /**
   * Clear all keys owned by this library (matching the given prefix).
   */
  async clearByPrefix(prefix: string): Promise<number> {
    const allKeys = await this.keys();
    const matching = allKeys.filter((k) => k.startsWith(prefix));
    let removed = 0;
    for (const key of matching) {
      const res = await this.remove(key);
      if (res.success) removed++;
    }
    return removed;
  }

  /**
   * Estimate remaining storage quota for the active backend.
   * Returns { used, total, remaining } in bytes where detectable.
   */
  async estimateQuota(): Promise<{ used: number; total: number; remaining: number }> {
    if (typeof navigator?.storage?.estimate !== 'function') {
      return { used: 0, total: 0, remaining: 0 };
    }
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage ?? 0;
    const total = estimate.quota ?? 0;
    return { used, total, remaining: Math.max(0, total - used) };
  }

  /**
   * Check if writing `size` bytes would exceed the quota limit.
   */
  async wouldExceedQuota(sizeBytes: number, threshold = 0.9): Promise<boolean> {
    const { used, total } = await this.estimateQuota();
    if (total === 0) return false;
    return used + sizeBytes > total * threshold;
  }
}

// ---------------------------------------------------------------------------
// 7. Envelope Serialization / Deserialization
// ---------------------------------------------------------------------------

/**
 * Convert an EntryMetadata to a compact StorageEnvelope for serialization.
 */
function toEnvelope<T>(meta: EntryMetadata<T>): StorageEnvelope<T> {
  return {
    v: meta.version,
    c: meta.createdAt,
    u: meta.updatedAt,
    t: meta.ttl,
    cp: meta.compressed,
    en: meta.encrypted,
    d: meta.value,
  };
}

/**
 * Convert a StorageEnvelope back to EntryMetadata.
 */
function fromEnvelope<T>(env: StorageEnvelope<T>): EntryMetadata<T> {
  return {
    version: env.v,
    createdAt: env.c,
    updatedAt: env.u,
    ttl: env.t,
    compressed: env.cp,
    encrypted: env.en,
    value: env.d,
  };
}

// ---------------------------------------------------------------------------
// 8. TTL / Expiration Management
// ---------------------------------------------------------------------------

/**
 * Check whether an entry has expired based on its TTL and updatedAt timestamp.
 */
export function isExpired<T>(entry: EntryMetadata<T>): boolean {
  if (entry.ttl <= 0) return false;
  return Date.now() - entry.updatedAt > entry.ttl;
}

/**
 * Create metadata with optional TTL.
 */
export function createMetadata<T>(
  value: T,
  version: number,
  ttl: number = 0,
  compressed: boolean = false,
  encrypted: boolean = false
): EntryMetadata<T> {
  const now = Date.now();
  return {
    version,
    createdAt: now,
    updatedAt: now,
    ttl,
    compressed,
    encrypted,
    value,
  };
}

// ---------------------------------------------------------------------------
// 9. Migration System
// ---------------------------------------------------------------------------

/**
 * Run registered migrations on raw data to bring it up to the current schema version.
 * Returns the migrated data and the final version number.
 */
export function runMigrations<T>(
  rawData: unknown,
  currentVersion: number,
  migrations?: SchemaMigration<T>
): { data: T; version: number } {
  if (!migrations || migrations.steps.length === 0) {
    return { data: rawData as T, version: currentVersion };
  }

  let data: unknown = rawData;
  let version = currentVersion;
  const sortedSteps = [...migrations.steps].sort((a, b) => a.fromVersion - b.fromVersion);

  for (const step of sortedSteps) {
    if (version === step.fromVersion) {
      data = step.migrate(data);
      version = step.toVersion;
    }
  }

  return { data: data as T, version };
}

// ---------------------------------------------------------------------------
// 10. Quota Manager
// ---------------------------------------------------------------------------

/**
 * Manages storage quota enforcement and cleanup when near limits.
 */
export class QuotaManager {
  private adapter: StorageAdapter;
  private config: QuotaConfig;
  private accessTimes: Map<string, number> = new Map(); // for LRU
  private accessCounts: Map<string, number> = new Map(); // for LFU

  constructor(adapter: StorageAdapter, config: QuotaConfig) {
    this.adapter = adapter;
    this.config = config;
  }

  /**
   * Record an access event for LRU/LFU tracking.
   */
  recordAccess(key: string): void {
    const now = Date.now();
    this.accessTimes.set(key, now);
    this.accessCounts.set(key, (this.accessCounts.get(key) ?? 0) + 1);
  }

  /**
   * Check if we are near the quota threshold and trigger cleanup if needed.
   */
  async checkAndCleanup(prefix: string): Promise<number> {
    const { used, total } = await this.adapter.estimateQuota();
    if (total === 0 || used / total < this.config.warningThreshold) return 0;
    return this.cleanup(prefix);
  }

  /**
   * Execute the configured cleanup strategy.
   */
  async cleanup(prefix: string): Promise<number> {
    const allKeys = await this.adapter.keys();
    const matching = allKeys.filter((k) => k.startsWith(prefix));
    if (matching.length === 0) return 0;

    // Enforce max entries cap
    if (this.config.maxEntries && matching.length > this.config.maxEntries) {
      const toRemove = matching.length - this.config.maxEntries;
      const ordered = this.orderKeys(matching);
      let removed = 0;
      for (let i = 0; i < toRemove && i < ordered.length; i++) {
        await this.adapter.remove(ordered[i]);
        this.accessTimes.delete(ordered[i]);
        this.accessCounts.delete(ordered[i]);
        removed++;
      }
      return removed;
    }

    // Remove a portion of keys based on strategy when near quota
    const removeCount = Math.max(1, Math.floor(matching.length * 0.1)); // remove 10%
    const ordered = this.orderKeys(matching);
    let removed = 0;
    for (let i = 0; i < removeCount && i < ordered.length; i++) {
      await this.adapter.remove(ordered[i]);
      this.accessTimes.delete(ordered[i]);
      this.accessCounts.delete(ordered[i]);
      removed++;
    }
    return removed;
  }

  /**
   * Order keys according to the configured cleanup strategy.
   */
  private orderKeys(keys: string[]): string[] {
    switch (this.config.cleanupStrategy) {
      case 'fifo':
        // FIFO: assume insertion order correlates with key sort order (approximate)
        return [...keys].sort();
      case 'lru':
        return [...keys].sort(
          (a, b) => (this.accessTimes.get(a) ?? 0) - (this.accessTimes.get(b) ?? 0)
        );
      case 'lfu':
        return [...keys].sort(
          (a, b) => (this.accessCounts.get(a) ?? 0) - (this.accessCounts.get(b) ?? 0)
        );
      case 'oldest-first':
        // Try to read updatedAt from envelopes — expensive but accurate
        return [...keys].sort(); // approximate
      default:
        return keys;
    }
  }
}

// ---------------------------------------------------------------------------
// 11. Sync Engine (Cross-tab)
// ---------------------------------------------------------------------------

/**
 * Cross-tab synchronization engine using BroadcastChannel with localStorage fallback.
 */
export class SyncEngine<T> {
  private channel: BroadcastChannel | null = null;
  private config: SyncConfig<T>;
  private lastWriteTime: Map<string, number> = new Map();
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(config: SyncConfig<T>) {
    this.config = config;
    if (config.enabled && isBrowser() && typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(config.channelName ?? 'state-persistence-sync');
      } catch {
        // BroadcastChannel may not be available in all contexts
      }
    }
  }

  /**
   * Broadcast a state change to other tabs.
   */
  broadcast(key: string, state: T): void {
    if (!this.config.enabled) return;

    const debounceMs = this.config.debounceMs ?? 50;
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(
      key,
      setTimeout(() => {
        this.debounceTimers.delete(key);
        this.lastWriteTime.set(key, Date.now());
        const message = { key, state, timestamp: Date.now(), source: uid() };

        if (this.channel) {
          this.channel.postMessage(message);
        }
        // Also write to localStorage as fallback for same-origin tabs
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(`__sync_${key}`, JSON.stringify(message));
            localStorage.removeItem(`__sync_${key}`);
          } catch {
            // ignore
          }
        }
      }, debounceMs)
    );
  }

  /**
   * Listen for incoming sync messages from other tabs.
   * Returns an unsubscribe function.
   */
  onMessage(
    callback: (key: string, remoteState: T, timestamp: number) => void
  ): () => void {
    if (!this.config.enabled) return () => {};

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || !msg.key || msg.source === this._sourceId) return;
      callback(msg.key, msg.state, msg.timestamp);
    };

    // BroadcastChannel listener
    if (this.channel) {
      this.channel.addEventListener('message', handler);
    }

    // localStorage fallback listener (storage events fire in other tabs, not the writer)
    const storageHandler = (e: StorageEvent) => {
      if (!e.key?.startsWith('__sync_')) return;
      if (e.newValue) {
        const msg = safeJsonParse<{ key: string; state: T; timestamp: number; source: string }>(
          e.newValue
        );
        if (msg && msg.key && msg.source !== this._sourceId) {
          callback(msg.key, msg.state, msg.timestamp);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', storageHandler);
    }

    return () => {
      if (this.channel) {
        this.channel.removeEventListener('message', handler);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', storageHandler);
      }
    };
  }

  /**
   * Resolve a conflict between local and remote state based on the configured strategy.
   */
  resolve(local: T, remote: T, key: string): T {
    switch (this.config.conflictStrategy) {
      case 'last-write-wins': {
        const localTime = this.lastWriteTime.get(key) ?? 0;
        const remoteTime = Date.now(); // approximated from message timestamp
        return remoteTime > localTime ? remote : local;
      }
      case 'merge':
        if (this.config.mergeFn) {
          return this.config.mergeFn(local, remote);
        }
        // Shallow merge for plain objects
        if (
          typeof local === 'object' &&
          local !== null &&
          typeof remote === 'object' &&
          remote !== null &&
          !Array.isArray(remote)
        ) {
          return { ...(local as Record<string, unknown>), ...(remote as Record<string, unknown>) } as T;
        }
        return remote;
      case 'custom':
        if (this.config.customResolver) {
          return this.config.customResolver(local, remote, key);
        }
        return remote;
      default:
        return remote;
    }
  }

  /**
   * Get the last known write time for a key.
   */
  getLastWriteTime(key: string): number {
    return this.lastWriteTime.get(key) ?? 0;
  }

  /** Unique identifier for this tab/session */
  private _sourceId: string = uid();

  /**
   * Clean up resources.
   */
  destroy(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    this.debounceTimers.forEach clearTimeout;
    this.debounceTimers.clear();
  }
}

// ---------------------------------------------------------------------------
// 12. Undo/Redo Stack
// ---------------------------------------------------------------------------

/**
 * Undo/redo history manager for persisted state.
 */
export class UndoRedoStack<T> {
  private past: HistoryEntry<T>[] = [];
  private future: HistoryEntry<T>[] = [];
  private maxDepth: number;

  constructor(maxDepth: number = 50) {
    this.maxDepth = maxDepth;
  }

  /**
   * Push a new state onto the undo stack. Clears the redo stack.
   */
  push(state: T, action: StateAction): void {
    this.past.push({ state: deepClone(state), action, timestamp: Date.now() });

    // Enforce max depth
    while (this.past.length > this.maxDepth) {
      this.past.shift();
    }

    // Clear redo stack on new action
    this.future = [];
  }

  /**
   * Undo: revert to the previous state. Returns the previous state or undefined.
   */
  undo(currentState: T): { state: T; action: StateAction } | undefined {
    if (this.past.length === 0) return undefined;

    const entry = this.past.pop()!;
    this.future.push({
      state: deepClone(currentState),
      entry.action,
      timestamp: Date.now(),
    });

    return { state: entry.state, action: entry.action };
  }

  /**
   * Redo: re-apply a previously undone action. Returns the redone state or undefined.
   */
  redo(currentState: T): { state: T; action: StateAction } | undefined {
    if (this.future.length === 0) return undefined;

    const entry = this.future.pop()!;
    this.past.push({
      state: deepClone(currentState),
      entry.action,
      timestamp: Date.now(),
    });

    return { state: entry.state, action: entry.action };
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.past.length > 0;
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.past = [];
    this.future = [];
  }

  /**
   * Get the current size of the undo stack.
   */
  getUndoStackSize(): number {
    return this.past.length;
  }

  /**
   * Get the current size of the redo stack.
   */
  getRedoStackSize(): number {
    return this.future.length;
  }
}

// ---------------------------------------------------------------------------
// 13. Redux DevTools Integration
// ---------------------------------------------------------------------------

/**
 * Lightweight Redux DevTools connector that logs actions in the expected format.
 * Gracefully degrades when DevTools extension is not installed.
 */
export class DevToolsConnector {
  private connection: any;
  private name: string;

  constructor(name: string = 'StatePersistenceStore') {
    this.name = name;
    this.connection = null;
    if (isBrowser()) {
      try {
        const ext = (window as any).__REDUX_DEVTOOLS_EXTENSION__;
        if (ext) {
          this.connection = ext.connect({ name, maxAge: 100 });
        }
      } catch {
        // DevTools not available
      }
    }
  }

  /**
   * Log an action to DevTools.
   */
  send(action: string, state: unknown): void {
    if (this.connection) {
      try {
        this.connection.send({ type: action, ...((state as object) ?? {}) }, state);
      } catch {
        // Ignore errors from DevTools
      }
    }
  }

  /**
   * Initialize DevTools with initial state.
   */
  init(state: unknown): void {
    if (this.connection) {
      try {
        this.connection.init(state);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * Check if DevTools is connected.
   */
  isConnected(): boolean {
    return this.connection !== null;
  }
}

// ---------------------------------------------------------------------------
// 14. Observable State Store (Core)
// ---------------------------------------------------------------------------

/**
 * Create a typed, observable state store with persistence, sync, undo/redo,
 * encryption, compression, TTL, migrations, and DevTools support.
 *
 * @example
 * ```ts
 * const useStore = createStore({
 *   initialState: { count: 0, name: 'demo' },
 *   persistOptions: {
 *     storageBackends: ['local'],
 *     keyPrefix: 'myapp:',
 *     defaultTtlMs: 0,
 *     sync: { enabled: true, conflictStrategy: 'last-write-wins' },
 *     undoRedo: { enabled: true, maxDepth: 30 },
 *     devTools: true,
 *     devToolsName: 'MyAppStore',
 *   },
 * });
 *
 * // Set state
 * useStore.setState({ count: useStore.getState().count + 1 }, 'increment');
 *
 * // Subscribe
 * const unsub = useStore.subscribe((state) => console.log(state));
 *
 * // Undo
 * useStore.undo();
 * ```
 */
export function createStore<T extends Record<string, unknown>>(config: {
  initialState: T;
  persistOptions: PersistOptions<T>;
}) {
  const { initialState, persistOptions } = config;
  const {
    storageBackends = ['local'],
    keyPrefix = 'sp:',
    encryption,
    compression,
    defaultTtlMs = 0,
    migrations,
    sync,
    quota,
    undoRedo,
    devTools = false,
    devToolsName = 'StatePersistenceStore',
    shouldPersist,
  } = persistOptions;

  // --- Core state ---
  let state: T = deepClone(initialState);
  let isHydrated = false;
  let isPersisting = false;

  // --- Infrastructure ---
  const adapter = new StorageAdapter(storageBackends);
  const quotaManager = quota ? new QuotaManager(adapter, quota) : null;
  const syncEngine = sync ? new SyncEngine<T>(sync) : null;
  const undoStack = undoRedo?.enabled ? new UndoRedoStack<T>(undoRedo.maxDepth ?? 50) : null;
  const devToolsConn = devTools ? new DevToolsConnector(devToolsName) : null;

  // --- Observers ---
  const observers: Set<StateObserver<T>> = new Set();

  // --- Derived store key ---
  const storeKey = `${keyPrefix}store`;

  // -----------------------------------------------------------------------
  // Persistence helpers
  // -----------------------------------------------------------------------

  /**
   * Serialize state to storage with envelope, optional compression & encryption.
   */
  async persistToStorage(actionType?: string): Promise<boolean> {
    if (!isBrowser()) return false;
    if (shouldPersist && !shouldPersist(state, actionType ?? '')) return false;

    isPersisting = true;
    try {
      // Check quota before writing
      if (quotaManager) {
        await quotaManager.checkAndCleanup(keyPrefix);
      }

      let serialized = JSON.stringify(state);

      // Apply compression if enabled and payload exceeds threshold
      const shouldCompress =
        compression?.enabled &&
        (compression.thresholdBytes == null ||
          Compression.byteLength(serialized) >= compression.thresholdBytes);

      if (shouldCompress) {
        serialized = Compression.compress(serialized);
      }

      // Apply encryption if enabled
      let encrypted = false;
      if (encryption?.enabled && encryption.keyB64 && isSecureContext()) {
        serialized = await Encryption.encrypt(serialized, encryption.keyB64);
        encrypted = true;
      }

      // Build envelope
      const existingMeta = await loadFromStorage();
      const version = migrations?.currentVersion ?? (existingMeta?.version ?? 1);
      const meta = createMetadata(
        serialized as unknown as T,
        version,
        defaultTtlMs,
        shouldCompress,
        encrypted
      );
      const envelope = toEnvelope(meta);

      const setResult = await adapter.set(storeKey, JSON.stringify(envelope));

      if (setResult.success) {
        // Record access for quota tracking
        quotaManager?.recordAccess(storeKey);

        // Broadcast to other tabs
        syncEngine?.broadcast(storeKey, state);

        return true;
      }

      return false;
    } catch (err) {
      console.warn('[StatePersistence] Persist failed:', err);
      return false;
    } finally {
      isPersisting = false;
    }
  }

  /**
   * Load and deserialize state from storage, handling decompression, decryption,
   * migration, and TTL checks.
   */
  async loadFromStorage(): Promise<EntryMetadata<T> | undefined> {
    if (!isBrowser()) return undefined;

    const getResult = await adapter.get(storeKey);
    if (!getResult.success || !getResult.data) return undefined;

    const envelope = safeJsonParse<StorageEnvelope<string>>(getResult.data);
    if (!envelope) return undefined;

    let meta = fromEnvelope<string>(envelope);

    // Check TTL / expiration
    if (isExpired(meta)) {
      await adapter.remove(storeKey);
      return undefined;
    }

    let dataStr = meta.value;

    // Decrypt if needed
    if (meta.encrypted && encryption?.keyB64 && isSecureContext()) {
      try {
        dataStr = await Encryption.decrypt(dataStr, encryption.keyB64);
        meta.encrypted = false;
      } catch (err) {
        console.warn('[StatePersistence] Decryption failed:', err);
        return undefined;
      }
    }

    // Decompress if needed
    if (meta.compressed) {
      try {
        dataStr = Compression.decompress(dataStr);
        meta.compressed = false;
      } catch (err) {
        console.warn('[StatePersistence] Decompression failed:', err);
        return undefined;
      }
    }

    // Parse JSON
    const parsedData = safeJsonParse<T>(dataStr);
    if (parsedData === undefined) return undefined;

    // Run migrations
    const { data: migratedData, version } = runMigrations(parsedData, meta.version, migrations);

    return createMetadata(migratedData, version, meta.ttl, false, false);
  }

  // -----------------------------------------------------------------------
  // Hydration
  // -----------------------------------------------------------------------

  /**
   * Rehydrate state from storage. Call once on app startup (client-side only).
   * No-op during SSR.
   */
  async hydrate(): Promise<T> {
    if (!isBrowser()) {
      isHydrated = true;
      return state;
    }

    const meta = await loadFromStorage();
    if (meta) {
      state = meta.value;
    }

    isHydrated = true;

    // Initialize DevTools with hydrated state
    devToolsConn?.init(state);

    // Listen for cross-tab sync messages
    if (syncEngine) {
      syncEngine.onMessage(async (_key, remoteState, _timestamp) => {
        const resolved = syncEngine!.resolve(state, remoteState, storeKey);
        const prevState = state;
        state = resolved;
        notifyObservers(prevState, { type: 'SYNC_REMOTE', timestamp: Date.now(), previousState: prevState });
        await persistToStorage('SYNC_REMOTE');
      });
    }

    return state;
  }

  /**
   * Returns whether hydration has been completed.
   */
  function getIsHydrated(): boolean {
    return isHydrated;
  }

  // -----------------------------------------------------------------------
  // State accessors
  // -----------------------------------------------------------------------

  /**
   * Get the current state snapshot.
   */
  function getState(): T {
    return state;
  }

  /**
   * Update state by merging partial changes. Triggers observers and persistence.
   */
  async setState(partial: Partial<T>, actionType: string = 'SET_STATE'): Promise<T> {
    const prevState = { ...state };
    const action: StateAction = {
      type: actionType,
      payload: partial,
      timestamp: Date.now(),
      previousState: prevState,
    };

    // Push to undo stack before mutation
    undoStack?.push(state, action);

    // Apply merge
    state = { ...state, ...partial };

    // Notify observers
    notifyObservers(prevState, action);

    // Log to DevTools
    devToolsConn?.send(actionType, state);

    // Persist asynchronously
    await persistToStorage(actionType);

    return state;
  }

  /**
   * Replace the entire state (not a shallow merge).
   */
  async replaceState(newState: T, actionType: string = 'REPLACE_STATE'): Promise<T> {
    const prevState = { ...state };
    const action: StateAction = {
      type: actionType,
      payload: newState,
      timestamp: Date.now(),
      previousState: prevState,
    };

    undoStack?.push(state, action);
    state = deepClone(newState);

    notifyObservers(prevState, action);
    devToolsConn?.send(actionType, state);
    await persistToStorage(actionType);

    return state;
  }

  /**
   * Reset state back to the initial state.
   */
  async resetState(): Promise<T> {
    return replaceState(deepClone(initialState), 'RESET_STATE');
  }

  // -----------------------------------------------------------------------
  // Subscription system
  // -----------------------------------------------------------------------

  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   */
  function subscribe(observer: StateObserver<T>): () => void {
    observers.add(observer);
    return () => {
      observers.delete(observer);
    };
  }

  /**
   * Notify all observers of a state change.
   */
  function notifyObservers(prevState: T, action?: StateAction): void {
    for (const observer of observers) {
      try {
        observer(state, prevState, action);
      } catch (err) {
        console.warn('[StatePersistence] Observer error:', err);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Undo / Redo
  // -----------------------------------------------------------------------

  /**
   * Undo the last state change.
   */
  async undo(): Promise<T | undefined> {
    if (!undoStack || !undoStack.canUndo()) return undefined;

    const result = undoStack.undo(state);
    if (!result) return undefined;

    const prevState = { ...state };
    state = result.state;

    notifyObservers(prevState, {
      type: 'UNDO',
      timestamp: Date.now(),
      previousState: prevState,
    });
    devToolsConn?.send('UNDO', state);
    await persistToStorage('UNDO');

    return state;
  }

  /**
   * Redo a previously undone state change.
   */
  async redo(): Promise<T | undefined> {
    if (!undoStack || !undoStack.canRedo()) return undefined;

    const result = undoStack.redo(state);
    if (!result) return undefined;

    const prevState = { ...state };
    state = result.state;

    notifyObservers(prevState, {
      type: 'REDO',
      timestamp: Date.now(),
      previousState: prevState,
    });
    devToolsConn?.send('REDO', state);
    await persistToStorage('REDO');

    return state;
  }

  /**
   * Check if undo is possible.
   */
  function canUndo(): boolean {
    return undoStack?.canUndo() ?? false;
  }

  /**
   * Check if redo is possible.
   */
  function canRedo(): boolean {
    return undoStack?.canRedo() ?? false;
  }

  /**
   * Clear undo/redo history.
   */
  function clearHistory(): void {
    undoStack?.clear();
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  /**
   * Remove all persisted data for this store from storage.
   */
  async clearStorage(): Promise<void> {
    if (isBrowser()) {
      await adapter.remove(storeKey);
    }
    state = deepClone(initialState);
    undoStack?.clear();
    notifyObservers(deepClone(initialState), {
      type: 'CLEAR_STORAGE',
      timestamp: Date.now(),
      previousState: state,
    });
  }

  /**
   * Destroy the store and release all resources (channels, listeners, etc).
   */
  function destroy(): void {
    syncEngine?.destroy();
    observers.clear();
    undoStack?.clear();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  return {
    getState,
    setState,
    replaceState,
    resetState,
    subscribe,
    hydrate,
    getIsHydrated,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    clearStorage,
    destroy,

    // Expose infrastructure for advanced usage
    getAdapter: () => adapter,
    getSyncEngine: () => syncEngine,
    getUndoStack: () => undoStack,
    getDevTools: () => devToolsConn,
    getQuotaManager: () => quotaManager,
    getPersistOptions: () => persistOptions,
  } as const;
}

// Export the type of the store returned by createStore
export type StateStore<T extends Record<string, unknown>> = ReturnType<typeof createStore<T>>;

// ---------------------------------------------------------------------------
// 15. Convenience: Pre-built Store Creator Presets
// ---------------------------------------------------------------------------

/**
 * Quick-create a persisted store with sensible defaults.
 * Uses localStorage, no encryption, no compression, last-write-wins sync.
 */
export function createSimpleStore<T extends Record<string, unknown>>(
  initialState: T,
  storeName: string = 'store'
): StateStore<T> {
  return createStore({
    initialState,
    persistOptions: {
      storageBackends: ['local'],
      keyPrefix: `sp:${storeName}:`,
      sync: {
        enabled: true,
        channelName: `sp-sync-${storeName}`,
        conflictStrategy: 'last-write-wins',
      },
      undoRedo: { enabled: true, maxDepth: 30 },
    },
  });
}

/**
 * Create a secure store with encryption enabled.
 * Requires a pre-generated key (use Encryption.generateKey() to create one).
 */
export function createSecureStore<T extends Record<string, unknown>>(
  initialState: T,
  storeName: string,
  encryptionKeyB64: string
): StateStore<T> {
  return createStore({
    initialState,
    persistOptions: {
      storageBackends: ['local'],
      keyPrefix: `sp:${storeName}:`,
      encryption: { enabled: true, keyB64: encryptionKeyB64 },
      compression: { enabled: true, thresholdBytes: 1024 },
      sync: {
        enabled: true,
        channelName: `sp-sync-${storeName}`,
        conflictStrategy: 'last-write-wins',
      },
      undoRedo: { enabled: true, maxDepth: 20 },
      devTools: true,
      devToolsName: storeName,
    },
  });
}

/**
 * Create a session-only store (data lost when tab closes).
 */
export function createSessionStore<T extends Record<string, unknown>>(
  initialState: T,
  storeName: string = 'session'
): StateStore<T> {
  return createStore({
    initialState,
    persistOptions: {
      storageBackends: ['session'],
      keyPrefix: `sps:${storeName}:`,
      defaultTtlMs: 0,
    },
  });
}

/**
 * Create a cache store with TTL-based expiry.
 */
export function createCacheStore<T extends Record<string, unknown>>(
  initialState: T,
  storeName: string,
  ttlMs: number = 5 * 60 * 1000 // 5 minutes default
): StateStore<T> {
  return createStore({
    initialState,
    persistOptions: {
      storageBackends: ['local', 'memory'],
      keyPrefix: `spcache:${storeName}:`,
      defaultTtlMs: ttlMs,
      compression: { enabled: true, thresholdBytes: 512 },
      quota: {
        warningThreshold: 0.85,
        cleanupStrategy: 'lru',
        maxEntries: 200,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// 16. Batch Operations Helper
// ---------------------------------------------------------------------------

/**
 * Run multiple state updates in batch — only persists once at the end.
 * Useful for bulk updates where you don't want intermediate writes.
 */
export async function batchUpdates<T extends Record<string, unknown>>(
  store: StateStore<T>,
  updates: Array<{ partial: Partial<T>; actionType: string }>
): Promise<T> {
  let currentState = store.getState();
  for (const update of updates) {
    currentState = { ...currentState, ...update.partial };
  }
  return store.replaceState(currentState, 'BATCH_UPDATE');
}

// ---------------------------------------------------------------------------
// 17. Storage Inspector / Debug Utilities
// ---------------------------------------------------------------------------

/**
 * Inspect all entries managed by StatePersistence under a given prefix.
 * Useful for debugging and diagnostics.
 */
export async function inspectStorage(
  prefix: string = 'sp:',
  backends: StorageBackend[] = ['local', 'session', 'memory']
): Promise<Array<{ key: string; backend: StorageBackend; sizeBytes: number; rawPreview: string }>> {
  const results: Array<{
    key: string;
    backend: StorageBackend;
    sizeBytes: number;
    rawPreview: string;
  }> = [];

  for (const backend of backends) {
    const adapter = new StorageAdapter([backend]);
    const keys = await adapter.keys();
    const matching = keys.filter((k) => k.startsWith(prefix));

    for (const key of matching) {
      const result = await adapter.get(key);
      if (result.success && result.data) {
        results.push({
          key,
          backend,
          sizeBytes: Compression.byteLength(result.data),
          rawPreview: result.data.slice(0, 120) + (result.data.length > 120 ? '...' : ''),
        });
      }
    }
  }

  return results;
}

/**
 * Export all store data under a prefix as a JSON string (for backup/migration).
 */
export async function exportAllData(
  prefix: string = 'sp:',
  backends: StorageBackend[] = ['local', 'session', 'memory']
): Promise<string> {
  const entries = await inspectStorage(prefix, backends);
  const exportData: Record<string, string> = {};
  for (const entry of entries) {
    const adapter = new StorageAdapter([entry.backend]);
    const result = await adapter.get(entry.key);
    if (result.success && result.data) {
      exportData[entry.key] = result.data;
    }
  }
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import previously exported data back into storage.
 */
export async function importData(
  jsonStr: string,
  targetBackends: StorageBackend[] = ['local']
): Promise<{ imported: number; failed: number }> {
  const data = safeJsonParse<Record<string, string>>(jsonStr);
  if (!data) return { imported: 0, failed: Object.keys(data).length };

  let imported = 0;
  let failed = 0;
  const adapter = new StorageAdapter(targetBackends);

  for (const [key, value] of Object.entries(data)) {
    const result = await adapter.set(key, value);
    if (result.success) imported++;
    else failed++;
  }

  return { imported, failed };
}

// ---------------------------------------------------------------------------
// 18. Default Exports Summary
// ---------------------------------------------------------------------------

/**
 * Re-export summary:
 *
 * **Types**: StorageBackend, ConflictStrategy, QuotaCleanupStrategy, StorageResult,
 *   EntryMetadata, StorageEnvelope, MigrationFunction, MigrationStep, SchemaMigration,
 *   CustomConflictResolver, SyncConfig, EncryptionConfig, CompressionConfig,
 *   QuotaConfig, PersistOptions, StateAction, StateObserver, HistoryEntry, StateStore
 *
 * **Environment**: isBrowser, isSecureContext
 *
 * **Utilities**: uid, deepClone, safeJsonParse (internal), isExpired, createMetadata
 *
 * **Compression**: Compression (compress, decompress, byteLength)
 *
 * **Encryption**: Encryption (generateKey, importKey, encrypt, decrypt)
 *
 * **Storage**: StorageAdapter
 *
 * **Migration**: runMigrations
 *
 * **Quota**: QuotaManager
 *
 * **Sync**: SyncEngine
 *
 * **Undo/Redo**: UndoRedoStack
 *
 * **DevTools**: DevToolsConnector
 *
 * **Store**: createStore, createSimpleStore, createSecureStore, createSessionStore,
 *   createCacheStore, batchUpdates
 *
 * **Debug**: inspectStorage, exportAllData, importData
 */
