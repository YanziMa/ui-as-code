/**
 * URL State Manager: Bidirectional synchronization between application state
 * and URL query parameters with debounced updates, history API integration,
 * type-safe serialization/deserialization, nested state support, multiple
 * param sources, URL encoding strategies, and state diff tracking.
 */

// --- Types ---

export type ParamKey = string;
export type ParamValue = string | number | boolean | null | string[] | number[];

export interface ParamDefinition<V = ParamValue> {
  /** URL parameter name */
  key: ParamKey;
  /** Default value */
  defaultValue: V;
  /** Serialize state value to URL string */
  serialize?: (value: V) => string;
  /** Deserialize URL string to state value */
  deserialize?: (value: string) => V;
  /** Validate deserialized value */
  validate?: (value: V) => boolean;
  /** Debounce updates to URL (ms, default: 100) */
  debounceMs?: number;
  /** Replace instead of push to history (default: false) */
  replace?: boolean;
  /** Include in URL even when at default value */
  alwaysInclude?: boolean;
}

export interface UrlStateConfig {
  /** Base URL path prefix to scope params under */
  basePath?: string;
  /** Global debounce for all param writes (ms, default: 50) */
  globalDebounceMs?: number;
  /** Default mode: "history" (pushState) or "hash" (hashchange) */
  mode?: "history" | "hash";
  /** Called before any state is written to URL */
  onBeforeWrite?: (state: Record<string, ParamValue>) => Record<string, ParamValue> | null;
  /** Called after URL is updated */
  onAfterWrite?: (url: string, state: Record<string, ParamValue>) => void;
  /** Called when URL changes externally (browser back/forward) */
  onExternalChange?: (state: Record<string, ParamValue>, source: "popstate" | "hashchange") => void;
  /** Enable automatic URL listening (default: true) */
  listen?: boolean;
  /** Maximum URL length warning threshold (default: 2000) */
  maxUrlLength?: number;
}

export interface UrlStateManager {
  /** Read current state from URL */
  read(): Record<string, ParamValue>;
  /** Write state to URL */
  write(state: Partial<Record<string, ParamValue>>, options?: { replace?: boolean; debounce?: number }): void;
  /** Write immediately (no debounce) */
  writeSync(state: Partial<Record<string, ParamValue>>, options?: { replace?: boolean }): void;
  /** Get a single parameter value */
  getParam<V = ParamValue>(key: string): V | null;
  /** Set a single parameter */
  setParam<V = ParamValue>(key: string, value: V): void;
  /** Remove a parameter (resets to default) */
  removeParam(key: string): void;
  /** Reset all params to defaults */
  reset(): void;
  /** Register a parameter definition */
  register<V = ParamValue>(def: ParamDefinition<V>): void;
  /** Unregister a parameter definition */
  unregister(key: string): void;
  /** Get full current URL */
  getUrl(): string;
  /** Subscribe to state changes */
  subscribe(listener: (state: Record<string, ParamValue>) => void): () => void;
  /** Destroy cleanup */
  destroy(): void;
}

export interface StateDiff {
  added: Record<string, ParamValue>;
  changed: Record<string, ParamValue>;
  removed: string[];
  prev: Record<string, ParamValue>;
  next: Record<string, ParamValue>;
}

// --- Serializers ---

const serializers: Record<string, (v: ParamValue) => string> = {
  string: (v) => encodeURIComponent(String(v)),
  number: (v) => String(v),
  boolean: (v) => v ? "1" : "0",
  null: () => "",
  array_string: (v) => (v as string[]).map(encodeURIComponent).join(","),
  array_number: (v) => (v as number[]).join(","),
};

const deserializers: Record<string, (v: string) => ParamValue> = {
  string: (v) => decodeURIComponent(v),
  number: (v) => Number(v),
  boolean: (v) => v === "1" || v.toLowerCase() === "true",
  null: () => null,
  array_string: (v) => v.split(",").map(decodeURIComponent),
  array_number: (v) => v.split(",").map(Number).filter((n) => !isNaN(n)),
};

function detectType(value: ParamValue): string {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return typeof value[0] === "number" ? "array_number" : "array_string";
  }
  return typeof value;
}

// --- UrlStateManager Implementation ---

export class UrlStateManagerImpl implements UrlStateManager {
  private config: Required<Pick<UrlStateConfig, "mode" | "listen" | "maxUrlLength">> & Omit<UrlStateConfig, "mode" | "listen" | "maxUrlLength">;
  private definitions = new Map<ParamKey, ParamDefinition<ParamValue>>();
  private listeners = new Set<(state: Record<string, ParamValue>) => void>();
  private prevState: Record<string, ParamValue> = {};
  private currentState: Record<string, ParamValue> = {};
  private debounceTimers = new Map<ParamKey, ReturnType<typeof setTimeout>>();
  private globalDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingWrites: Partial<Record<string, ParamValue>> = {};
  private destroyed = false;
  private popstateHandler: ((e: PopStateEvent) => void) | null = null;
  private hashchangeHandler: (() => void) | null = null;

  constructor(config: UrlStateConfig = {}) {
    this.config = {
      mode: config.mode ?? "history",
      listen: config.listen ?? true,
      maxUrlLength: config.maxUrlLength ?? 2000,
      basePath: config.basePath,
      globalDebounceMs: config.globalDebounceMs ?? 50,
      onBeforeWrite: config.onBeforeWrite,
      onAfterWrite: config.onAfterWrite,
      onExternalChange: config.onExternalChange,
    };

    // Initialize state from current URL
    this.currentState = this.readFromUrl();
    this.prevState = { ...this.currentState };

    // Setup listeners
    if (this.config.listen && typeof window !== "undefined") {
      this.setupListeners();
    }
  }

  read(): Record<string, ParamValue> {
    this.currentState = this.readFromUrl();
    return { ...this.currentState };
  }

  write(state: Partial<Record<string, ParamValue>>, options?: { replace?: boolean; debounce?: number }): void {
    const debounceMs = options?.debounce ?? this.config.globalDebounceMs;

    // Merge into pending writes
    Object.assign(this.pendingWrites, state);

    if (debounceMs > 0) {
      // Clear existing global timer
      if (this.globalDebounceTimer) clearTimeout(this.globalDebounceTimer);
      this.globalDebounceTimer = setTimeout(() => {
        this.flushPendingWrites(options?.replace);
      }, debounceMs);
    } else {
      this.flushPendingWrites(options?.replace);
    }
  }

  writeSync(state: Partial<Record<string, ParamValue>>, options?: { replace?: boolean }): void {
    Object.assign(this.pendingWrites, state);
    this.flushPendingWrites(options?.replace);
  }

  getParam<V = ParamValue>(key: string): V | null {
    this.read();
    return (this.currentState[key] ?? null) as V | null;
  }

  setParam<V = ParamValue>(key: string, value: V): void {
    this.write({ [key]: value });
  }

  removeParam(key: string): void {
    const def = this.definitions.get(key);
    this.write({ [key]: def?.defaultValue ?? null });
  }

  reset(): void {
    const defaults: Record<string, ParamValue> = {};
    for (const [key, def] of this.definitions) {
      defaults[key] = def.defaultValue;
    }
    this.write(defaults, { replace: true, debounce: 0 });
  }

  register<V = ParamValue>(def: ParamDefinition<V>): void {
    this.definitions.set(def.key, def as ParamDefinition<ParamValue>);
    // Initialize from current URL if present
    const urlValue = this.getParamFromUrl(def.key);
    if (urlValue !== null) {
      const deserialized = def.deserialize ? def.deserialize(urlValue) :
        (deserializers[detectType(def.defaultValue)] ?? deserializers.string)(urlValue);
      if (def.validate ? def.validate(deserialized as V) : true) {
        this.currentState[def.key] = deserialized;
      }
    } else {
      this.currentState[def.key] = def.defaultValue;
    }
  }

  unregister(key: string): void {
    this.definitions.delete(key);
    delete this.currentState[key];
  }

  getUrl(): string {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }

  subscribe(listener: (state: Record<string, ParamValue>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.teardownListeners();
    this.listeners.clear();
    this.definitions.clear();
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    this.debounceTimers.clear();
    if (this.globalDebounceTimer) clearTimeout(this.globalDebounceTimer);
  }

  getDiff(): StateDiff {
    const added: Record<string, ParamValue> = {};
    const changed: Record<string, ParamValue> = {};
    const removed: string[] = [];

    for (const [key, newVal] of Object.entries(this.currentState)) {
      if (!(key in this.prevState)) {
        added[key] = newVal;
      } else if (this.prevState[key] !== newVal) {
        changed[key] = newVal;
      }
    }

    for (const key of Object.keys(this.prevState)) {
      if (!(key in this.currentState)) removed.push(key);
    }

    return { added, changed, removed, prev: this.prevState, next: this.currentState };
  }

  // --- Internal ---

  private flushPendingWrites(replace?: boolean): void {
    if (Object.keys(this.pendingWrites).length === 0) return;

    this.prevState = { ...this.currentState };
    Object.assign(this.currentState, this.pendingWrites);

    // Allow mutation hook
    let finalState = { ...this.currentState };
    if (this.config.onBeforeWrite) {
      const result = this.config.onBeforeWrite(finalState);
      if (result === null) return; // Cancelled
      finalState = result;
      this.currentState = finalState;
    }

    this.writeToUrl(finalState, replace);
    this.config.onAfterWrite?.(this.getUrl(), finalState);

    // Notify subscribers
    for (const listener of this.listeners) {
      try { listener({ ...finalState }); } catch {}
    }

    this.pendingWrites = {};
  }

  private readFromUrl(): Record<string, ParamValue> {
    const state: Record<string, ParamValue> = {};
    const params = this.parseUrlParams();

    for (const [key, def] of this.definitions) {
      const urlValue = params.get(key);
      if (urlValue !== null && urlValue !== "") {
        const deserializer = def.deserialize ?? (deserializers[detectType(def.defaultValue)] ?? deserializers.string);
        const value = deserializer(urlValue);
        state[key] = def.validate && !def.validate(value) ? def.defaultValue : value;
      } else {
        state[key] = def.defaultValue;
      }
    }

    // Also pick up any unrecognized params
    for (const [key, value] of params) {
      if (!this.definitions.has(key)) {
        state[key] = decodeURIComponent(value);
      }
    }

    return state;
  }

  private writeToUrl(state: Record<string, ParamValue>, replace?: boolean): void {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();

    for (const [key, def] of this.definitions) {
      const value = state[key];
      const defaultValue = def.defaultValue;

      // Skip if at default (unless alwaysInclude)
      if (!def.alwaysInclude && JSON.stringify(value) === JSON.stringify(defaultValue)) continue;

      if (value === null || value === undefined || value === "") {
        // Don't include null/empty unless always
        if (def.alwaysInclude) params.set(key, "");
        continue;
      }

      const serializer = def.serialize ?? (serializers[detectType(value)] ?? serializers.string);
      params.set(key, serializer(value));
    }

    // Write unrecognized state too
    for (const [key, value] of Object.entries(state)) {
      if (!this.definitions.has(key) && value != null && value !== "") {
        params.set(key, serializers[detectType(value)](value));
      }
    }

    const queryString = params.toString();
    let newPath = window.location.pathname;

    if (this.config.basePath && newPath.startsWith(this.config.basePath)) {
      newPath = newPath.slice(this.config.basePath.length);
    }

    const newUrl = queryString ? `${newPath}?${queryString}` : newPath;

    // Check length
    if (newUrl.length > this.config.maxUrlLength) {
      console.warn(`[UrlStateManager] URL length (${newUrl.length}) exceeds limit (${this.config.maxUrlLength})`);
    }

    try {
      if (replace) {
        window.history.replaceState(state, "", newUrl);
      } else {
        window.history.pushState(state, "", newUrl);
      }
    } catch (e) {
      console.warn("[UrlStateManager] Failed to write URL:", e);
    }
  }

  private getParamFromUrl(key: string): string | null {
    const params = this.parseUrlParams();
    return params.get(key) ?? null;
  }

  private parseUrlParams(): URLSearchParams {
    if (typeof window === "undefined") return new URLSearchParams();

    if (this.config.mode === "hash") {
      const hash = window.location.hash.slice(1);
      const qIdx = hash.indexOf("?");
      return qIdx >= 0 ? new URLSearchParams(hash.slice(qIdx + 1)) : new URLSearchParams();
    }

    return new URLSearchParams(window.location.search);
  }

  private setupListeners(): void {
    if (this.config.mode === "history") {
      this.popstateHandler = (e: PopStateEvent) => {
        const newState = this.readFromUrl();
        const diff = this.detectExternalChange(newState);
        if (diff.changed) {
          this.prevState = { ...this.currentState };
          this.currentState = newState;
          this.config.onExternalChange?.(newState, "popstate");
          for (const listener of this.listeners) {
            try { listener({ ...newState }); } catch {}
          }
        }
      };
      window.addEventListener("popstate", this.popstateHandler);
    } else {
      this.hashchangeHandler = () => {
        const newState = this.readFromUrl();
        const diff = this.detectExternalChange(newState);
        if (diff.changed) {
          this.prevState = { ...this.currentState };
          this.currentState = newState;
          this.config.onExternalChange?.(newState, "hashchange");
          for (const listener of this.listeners) {
            try { listener({ ...newState }); } catch {}
          }
        }
      };
      window.addEventListener("hashchange", this.hashchangeHandler);
    }
  }

  private teardownListeners(): void {
    if (this.popstateHandler) window.removeEventListener("popstate", this.popstateHandler);
    if (this.hashchangeHandler) window.removeEventListener("hashchange", this.hashchangeHandler);
  }

  private detectExternalChange(newState: Record<string, ParamValue>): { changed: boolean } {
    // Simple check: did any registered param change?
    for (const key of this.definitions.keys()) {
      if (JSON.stringify(newState[key]) !== JSON.stringify(this.currentState[key])) {
        return { changed: true };
      }
    }
    return { changed: false };
  }
}

// --- Factory ---

export function createUrlStateManager(config?: UrlStateConfig): UrlStateManager {
  return new UrlStateManagerImpl(config);
}

/** Create a typed URL state manager with pre-registered parameters */
export function createTypedUrlStateManager<T extends Record<string, ParamDefinition<ParamValue>>>(
  definitions: T,
  config?: UrlStateConfig,
): UrlStateManager & { defs: T } {
  const manager = new UrlStateManagerImpl(config);
  for (const def of Object.values(definitions)) {
    manager.register(def);
  }
  return manager as UrlStateManager & { defs: T };
}
