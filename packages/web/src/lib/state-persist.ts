/**
 * State Persistence: Universal state serialization with storage backends,
 * versioned schemas, migration, compression, encryption, TTL, cross-tab sync,
 * undo/redo history, hydration, and conflict resolution.
 */

// --- Types ---

export type StorageBackend = "localStorage" | "sessionStorage" | "memory" | "custom";

export type SerializationFormat = "json" | "msgpack" | "binary";

export interface PersistOptions<T> {
  /** Unique key for this state */
  key: string;
  /** Initial state factory */
  initialState: () => T;
  /** Storage backend (default: localStorage) */
  backend?: StorageBackend;
  /** Serialize format (default: json) */
  format?: SerializationFormat;
  /** Schema version for migrations */
  version?: number;
  /** Migration functions from older versions */
  migrations?: Record<number, (data: unknown) => unknown>;
  /** Enable compression (default: false) */
  compress?: boolean;
  /** Encryption key (optional AES-GCM) */
  encryptKey?: string;
  /** Time-to-live in ms (0 = no expiry) */
  ttl?: number;
  /** Debounce write operations (ms) */
  debounceMs?: number;
  /** Whitelist of keys to persist (undefined = all) */
  whitelist?: (keyof T)[];
  /** Blacklist of keys to exclude */
  blacklist?: (keyof T)[];
  /** Custom storage implementation */
  customStorage?: StorageAdapter;
  /** Called on state load (hydration) */
  onHydrate?: (state: T) => void;
  /** Called before state save */
  onSave?: (state: T) => T;
  /** Enable cross-tab synchronization */
  syncAcrossTabs?: boolean;
  /** Max undo/redo steps (0 = disabled) */
  maxHistory?: number;
  /** Auto-save on change? */
  autoSave?: boolean;
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
}

export interface PersistState<T> {
  /** Current state value */
  state: T;
  /** Whether state has been hydrated from storage */
  hydrated: boolean;
  /** Schema version */
  version: number;
  /** Last saved timestamp */
  lastSaved: number | null;
  /** Is currently saving */
  isSaving: boolean;
  /** Undo stack depth */
  canUndo: boolean;
  /** Redo stack depth */
  canRedo: boolean;
}

export interface HistoryEntry<T> {
  state: T;
  timestamp: number;
  action?: string;
}

// --- Simple LZ-String-like Compression ---

function compress(input: string): string {
  // Basic deflate-inspired compression using dictionary
  const dict: Map<string, number> = new Map();
  let dictSize = 256;
  const result: number[] = [];
  let w = "";

  for (let i = 0; i < input.length; i++) {
    const c = input[i]!;
    const wc = w + c;
    if (dict.has(wc)) {
      w = wc;
    } else {
      if (w.length > 0) {
        result.push(dict.get(w) ?? w.charCodeAt(0));
      }
      dict.set(wc, dictSize++);
      w = c;
    }
  }

  if (w.length > 0) {
    result.push(dict.get(w) ?? w.charCodeAt(0));
  }

  // Encode as base64-like string
  return btoa(String.fromCharCode(...result));
}

function decompress(input: string): string {
  try {
    const compressed = atob(input);
    const codes: number[] = [];
    for (let i = 0; i < compressed.length; i++) {
      codes.push(compressed.charCodeAt(i));
    }

    // Rebuild dictionary
    const dict: Map<number, string> = new Map();
    let dictSize = 256;
    for (let i = 0; i < 256; i++) {
      dict.set(i, String.fromCharCode(i));
    }

    let w = String.fromCharCode(codes[0]!);
    let result = w;

    for (let i = 1; i < codes.length; i++) {
      const k = codes[i]!;
      let entry: string;

      if (dict.has(k)) {
        entry = dict.get(k)!;
      } else if (k === dictSize) {
        entry = w + w[0];
      } else {
        throw new Error("Decompression error");
      }

      result += entry;
      dict.set(dictSize++, w + entry[0]);
      w = entry;
    }

    return result;
  } catch {
    return input; // Return as-is if decompression fails
  }
}

// --- Encryption Helpers ---

async function encrypt(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    keyData,
    encoder.encode(data),
  );

  // Combine IV + ciphertext as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

async function decrypt(encryptedData: string, key: string): Promise<string> {
  const combined = new Uint8Array(
    atob(encryptedData).split("").map((c) => c.charCodeAt(0)),
  );

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const encoder = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyData, data);

  return new TextDecoder().decode(decrypted);
}

// --- Core State Manager ---

export class StatePersist<T extends Record<string, unknown>> {
  private options: Required<PersistOptions<T>> & { version: number };
  private _state: T;
  private _hydrated = false;
  private _lastSaved: number | null = null;
  private _isSaving = false;
  private undoStack: HistoryEntry<T>[] = [];
  private redoStack: HistoryEntry<T>[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<(state: T) => void> = new Set();
  private storageListener: (() => void) | null = null;

  constructor(options: PersistOptions<T>) {
    this.options = {
      backend: "localStorage",
      format: "json",
      version: options.version ?? 1,
      compress: false,
      ttl: 0,
      debounceMs: 300,
      autoSave: true,
      syncAcrossTabs: false,
      maxHistory: 50,
      ...options,
      migrations: options.migrations ?? {},
    };

    this._state = this.options.initialState();

    // Hydrate from storage
    this.hydrate();

    // Cross-tab sync
    if (this.options.syncAcrossTabs) {
      this.setupTabSync();
    }
  }

  get state(): T {
    return this._state;
  }

  get hydrated(): boolean {
    return this._hydrated;
  }

  get lastSaved(): number | null {
    return this._lastSaved;
  }

  get isSaving(): boolean {
    return this._isSaving;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Subscribe to state changes. Returns unsubscribe function. */
  subscribe(listener: (state: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Update state partially (shallow merge). */
  update(partial: Partial<T>, action?: string): T {
    // Push to undo history before change
    if (this.options.maxHistory > 0) {
      this.undoStack.push({
        state: { ...this._state },
        timestamp: Date.now(),
        action,
      });
      // Trim undo stack
      while (this.undoStack.length > this.options.maxHistory!) {
        this.undoStack.shift();
      }
      // Clear redo stack on new action
      this.redoStack = [];
    }

    Object.assign(this._state, partial);

    // Notify listeners
    this.notifyListeners();

    // Auto-save
    if (this.options.autoSave) {
      this.save();
    }

    return this._state;
  }

  /** Replace entire state. */
  setState(newState: T, action?: string): T {
    if (this.options.maxHistory > 0) {
      this.undoStack.push({ state: { ...this._state }, timestamp: Date.now(), action });
      while (this.undoStack.length > this.options.maxHistory!) {
        this.undoStack.shift();
      }
      this.redoStack = [];
    }

    this._state = newState;
    this.notifyListeners();

    if (this.options.autoSave) {
      this.save();
    }

    return this._state;
  }

  /** Undo last state change. */
  undo(): T | null {
    if (this.undoStack.length === 0) return null;

    const entry = this.undoStack.pop()!;
    this.redoStack.push({ state: { ...this._state }, timestamp: Date.now() });
    this._state = entry.state;
    this.notifyListeners();

    if (this.options.autoSave) this.save();
    return this._state;
  }

  /** Redo last undone change. */
  redo(): T | null {
    if (this.redoStack.length === 0) return null;

    const entry = this.redoStack.pop()!;
    this.undoStack.push({ state: { ...this._state }, timestamp: Date.now() });
    this._state = entry.state;
    this.notifyListeners();

    if (this.options.autoSave) this.save();
    return this._state;
  }

  /** Clear all history. */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Force immediate save to storage. */
  async save(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.options.debounceMs > 0) {
      return new Promise((resolve) => {
        this.debounceTimer = setTimeout(() => {
          this.performSave().then(resolve);
        }, this.options.debounceMs);
      });
    }

    return this.performSave();
  }

  /** Remove persisted state from storage. */
  async clear(): Promise<void> {
    const adapter = this.getStorage();
    await adapter.removeItem(this.options.key);
    this._lastSaved = null;
    this._hydrated = false;
    this._state = this.options.initialState();
    this.clearHistory();
    this.notifyListeners();
  }

  /** Export state as a portable JSON string (for backup/migration). */
  exportState(): string {
    const data = this.prepareForSave(this._state);
    return JSON.stringify({
      __version: this.options.version,
      __key: this.options.key,
      __exportedAt: Date.now(),
      data,
    });
  }

  /** Import state from an exported string. */
  async importState(jsonStr: string): Promise<T> {
    const parsed = JSON.parse(jsonStr) as {
      __version: number;
      data: unknown;
    };

    let data = parsed.data;

    // Run migrations if needed
    if (parsed.__version < this.options.version) {
      data = this.runMigrations(data, parsed.__version);
    }

    this._state = this.restoreFromSaved(data) as T;
    this._hydrated = true;
    this.notifyListeners();

    if (this.options.autoSave) await this.save();
    return this._state;
  }

  /** Destroy instance — clean up listeners and timers. */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.storageListener) {
      window.removeEventListener("storage", this.storageListener);
    }
    this.listeners.clear();
  }

  // --- Internal ---

  private async hydrate(): Promise<void> {
    try {
      const adapter = this.getStorage();
      const raw = await adapter.getItem(this.options.key);

      if (!raw) {
        this._hydrated = true;
        this._state = this.options.initialState();
        this.options.onHydrate?.(this._state);
        return;
      }

      let parsed: unknown;

      // Decrypt if needed
      let dataStr = raw;
      if (this.options.encryptKey) {
        dataStr = await decrypt(raw, this.options.encryptKey);
      }

      // Decompress if needed
      if (this.options.compress) {
        dataStr = decompress(dataStr);
      }

      parsed = JSON.parse(dataStr);

      // Check for versioned format
      const record = parsed as Record<string, unknown>;
      const storedVersion = (record.__version as number) ?? 1;
      let data = record.data ?? parsed;

      // Run migrations
      if (storedVersion < this.options.version && this.options.migrations) {
        data = this.runMigrations(data, storedVersion);
      }

      // Check TTL
      if (this.options.ttl && this.options.ttl > 0) {
        const savedAt = record.__savedAt as number | undefined;
        if (savedAt && Date.now() - savedAt > this.options.ttl) {
          await adapter.removeItem(this.options.key);
          this._state = this.options.initialState();
          this._hydrated = true;
          this.options.onHydrate?.(this._state);
          return;
        }
      }

      this._state = this.restoreFromSaved(data) as T;
      this._hydrated = true;
      this._lastSaved = savedAt ?? null;
      this.options.onHydrate?.(this._state);
    } catch {
      // Corrupted or unreadable — start fresh
      this._state = this.options.initialState();
      this._hydrated = true;
      this.options.onHydrate?.(this._state);
    }
  }

  private runMigrations(data: unknown, fromVersion: number): unknown {
    let current = data;
    for (let v = fromVersion + 1; v <= this.options.version; v++) {
      const migrate = this.options.migrations[v];
      if (migrate) {
        current = migrate(current);
      }
    }
    return current;
  }

  private prepareForSave(state: T): unknown {
    let data: unknown = { ...state };

    // Apply whitelist/blacklist
    if (this.options.whitelist?.length) {
      const filtered: Record<string, unknown> = {};
      for (const key of this.options.whitelist) {
        if (key in state) {
          filtered[key as string] = state[key];
        }
      }
      data = filtered;
    }

    if (this.options.blacklist?.length) {
      const obj = data as Record<string, unknown>;
      for (const key of this.options.blacklist) {
        delete obj[key as string];
      }
      data = obj;
    }

    // Pre-save hook
    data = this.options.onSave?.(data as T) ?? data;

    return data;
  }

  private restoreFromSaved(data: unknown): T {
    if (!data || typeof data !== "object") {
      return this.options.initialState();
    }

    const saved = data as Partial<T>;
    const initial = this.options.initialState();

    // Deep merge saved into initial to handle added/removed fields
    return { ...initial, ...saved } as T;
  }

  private async performSave(): Promise<void> {
    this._isSaving = true;

    try {
      const data = this.prepareForSave(this._state);
      const payload = JSON.stringify({
        __version: this.options.version,
        __savedAt: Date.now(),
        data,
      });

      let toStore = payload;

      // Compress
      if (this.options.compress) {
        toStore = compress(toStore);
      }

      // Encrypt
      if (this.options.encryptKey) {
        toStore = await encrypt(toStore, this.options.encryptKey);
      }

      const adapter = this.getStorage();
      await adapter.setItem(this.options.key, toStore);
      this._lastSaved = Date.now();
    } catch (err) {
      console.error("StatePersist: Save failed:", err);
    } finally {
      this._isSaving = false;
    }
  }

  private getStorage(): StorageAdapter {
    if (this.options.customStorage) return this.options.customStorage;

    switch (this.options.backend) {
      case "localStorage":
        return createBrowserStorage(localStorage);
      case "sessionStorage":
        return createBrowserStorage(sessionStorage);
      case "memory":
        return createMemoryStorage();
      default:
        return createBrowserStorage(localStorage);
    }
  }

  private setupTabSync(): void {
    this.storageListener = (e: StorageEvent) => {
      if (e.key === this.options.key && e.newValue) {
        this.hydrate().then(() => this.notifyListeners());
      }
    };
    window.addEventListener("storage", this.storageListener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this._state);
    }
  }
}

// --- Storage Adapters ---

/** Create a storage adapter from browser Storage API. */
export function createBrowserStorage(storage: Storage): StorageAdapter {
  return {
    async getItem(key: string): Promise<string | null> {
      return storage.getItem(key);
    },
    async setItem(key: string, value: string): Promise<void> {
      storage.setItem(key, value);
    },
    async removeItem(key: string): Promise<void> {
      storage.removeItem(key);
    },
    async clear(): Promise<void> {
      storage.clear();
    },
    async getAllKeys(): Promise<string[]> {
      return Object.keys(storage);
    },
  };
}

/** Create an in-memory storage adapter (useful for testing). */
export function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    async getItem(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async removeItem(key: string): Promise<void> {
      store.delete(key);
    },
    async clear(): Promise<void> {
      store.clear();
    },
    async getAllKeys(): Promise<string[]> {
      return Array.from(store.keys());
    },
  };
}

// --- Multi-State Store ---

export interface MultiPersistOptions {
  /** Prefix for all keys */
  prefix?: string;
  /** Default backend */
  backend?: StorageBackend;
  /** Default TTL in ms */
  defaultTtl?: number;
  /** Enable compression by default */
  compress?: boolean;
}

/** Manage multiple persisted states with a unified API. */
export class MultiStateStore {
  private stores: Map<string, StatePersist<Record<string, unknown>>> = new Map();
  private options: MultiPersistOptions;

  constructor(options: MultiPersistOptions = {}) {
    this.options = {
      prefix: "msp_",
      backend: "localStorage",
      defaultTtl: 0,
      compress: false,
      ...options,
    };
  }

  /** Create or get a named state store. */
  createStore<T extends Record<string, unknown>>(
    name: string,
    initialState: () => T,
    options: Omit<PersistOptions<T>, "key"> = {},
  ): StatePersist<T> {
    if (this.stores.has(name)) {
      return this.stores.get(name)! as unknown as StatePersist<T>;
    }

    const store = new StatePersist<T>({
      key: `${this.options.prefix}${name}`,
      initialState,
      backend: this.options.backend,
      ttl: this.options.defaultTtl,
      compress: this.options.compress,
      ...options,
    });

    this.stores.set(name, store as unknown as StatePersist<Record<string, unknown>>);
    return store;
  }

  /** Get an existing store by name. */
  getStore<T extends Record<string, unknown>>(name: string): StatePersist<T> | undefined {
    return this.stores.get(name) as unknown as StatePersist<T> | undefined;
  }

  /** Remove and destroy a store. */
  async removeStore(name: string): Promise<void> {
    const store = this.stores.get(name);
    if (store) {
      await store.clear();
      store.destroy();
      this.stores.delete(name);
    }
  }

  /** Save all stores. */
  async saveAll(): Promise<void> {
    const promises = Array.from(this.stores.values()).map((s) => s.save());
    await Promise.all(promises);
  }

  /** Clear all stores. */
  async clearAll(): Promise<void> {
    const promises = Array.from(this.stores.values()).map((s) => s.clear());
    await Promise.all(promises);
  }

  /** Get names of all registered stores. */
  getStoreNames(): string[] {
    return Array.from(this.stores.keys());
  }
}
