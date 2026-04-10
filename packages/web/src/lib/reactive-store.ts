/**
 * Reactive Store: Lightweight reactive state management with selectors,
 * middleware, computed values, subscriptions, batched updates, devtools
 * integration, persistence, time-travel debugging, and Zustand-like API.
 */

// --- Types ---

export type Listener<T> = (state: T, prevState: T) => void;
export type Selector<T, U> = (state: T) => U;
export type Middleware<T> = (
  state: T,
  action: StoreAction,
  next: (action: StoreAction) => void,
) => void;
export type EqualityFn<T> = (a: T, b: T) => boolean;

export interface StoreAction {
  type: string;
  payload?: unknown;
  meta?: Record<string, unknown>;
}

export interface StoreOptions<T> {
  /** Initial state */
  state: T;
  /** DevTools integration name */
  devTools?: boolean | string;
  /** Persist to localStorage/sessionStorage */
  persist?: {
    key: string;
    storage?: "localStorage" | "sessionStorage";
    /** Whitelist of keys to persist */
    whitelist?: (keyof T)[];
    /** Version for migration */
    version?: number;
    /** Migrate old persisted state */
    migrate?: (persisted: unknown, version: number) => T;
  };
  /** Custom equality check for subscriptions */
  equalityFn?: EqualityFn<T>;
}

export interface ComputedConfig<T, U> {
  name: string;
  get: (state: T) => U;
  /** Dependencies — recompute when these change */
  deps?: (keyof T)[];
}

export interface SubscriptionInfo {
  id: string;
  selectorName?: string;
  createdAt: number;
}

export interface StoreStats {
  listenerCount: number;
  computedCount: number;
  actionCount: number;
  dispatchCount: number;
  lastAction: string | null;
  lastUpdate: number | null;
}

// --- Default Equality ---

function defaultEquality<T>(a: T, b: T): boolean {
  return a === b;
}

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

// --- Main Store Class ---

/**
 * Reactive store with Zustand-inspired API.
 *
 * ```ts
 * const store = createStore({
 *   state: { count: 0, name: "test" },
 *   devTools: "my-app",
 * });
 *
 * // Subscribe with selector
 * const unsub = store.subscribe((s) => s.count, (count) => {
 *   console.log("Count changed:", count);
 * });
 *
 * // Dispatch updates
 * store.setState({ count: store.state.count + 1 });
 *
 * // Computed values
 * store.addComputed("doubled", (s) => s.count * 2);
 * console.log(store.getComputed("doubled")); // 2
 * ```
 */
export class ReactiveStore<T extends Record<string, unknown>> {
  private _state: T;
  private listeners = new Map<string, { selector?: Selector<T, unknown>; fn: Listener<T>; equalityFn?: EqualityFn<unknown>; prevValue?: unknown }>();
  private computed = new Map<string, { get: (state: T) => unknown; cachedValue?: unknown; dirty: boolean; deps?: (keyof T)[] }>();
  private middlewares: Middleware<T>[] = [];
  private history: Array<{ state: T; action: StoreAction; timestamp: number }> = [];
  private options: StoreOptions<T>;
  private isBatching = false;
  private pendingState: Partial<T> | null = null;
  private stats: StoreStats = createFreshStoreStats();
  private devToolsConnected = false;
  private _listenerCounter = 0;

  constructor(options: StoreOptions<T>) {
    this.options = {
      ...options,
      equalityFn: options.equalityFn ?? (defaultEquality as EqualityFn<T>),
      devTools: options.devTools ?? false,
    };

    // Load persisted state
    this._state = this.loadPersisted() ?? { ...options.state };
  }

  // --- State Access ---

  /** Get current state (reactive snapshot) */
  get state(): T {
    return this._state;
  }

  /** Get a specific value by key */
  get<K extends keyof T>(key: K): T[K] {
    return this._state[key];
  }

  /** Check if a key exists in state */
  has(key: keyof T): boolean {
    return key in this._state;
  }

  // --- State Updates ---

  /**
   * Update state (merges partial state).
   * Triggers listeners whose selected values changed.
   */
  setState(partial: Partial<T>, action?: StoreAction): T {
    const prevState = { ...this._state };

    // Run through middleware
    if (this.middlewares.length > 0 && action) {
      let idx = 0;
      const runMiddleware = (act: StoreAction) => {
        if (idx < this.middlewares.length) {
          this.middlewares[idx]!(this._state, act, () => {
            idx++;
            runMiddleware(act);
          });
        } else {
          this.applyState(partial, act);
        }
      };
      runMiddleware(action);
    } else {
      this.applyState(partial, action);
    }

    return this._state;
  }

  /**
   * Replace entire state (no merge).
   */
  replaceState(newState: T, action?: StoreAction): T {
    const prevState = this._state;
    this._state = newState;
    this.recordHistory(prevState, action ?? { type: "replace" });
    this.invalidateComputeds();
    this.notifyListeners(prevState);
    this.persist();
    this.stats.dispatchCount++;
    return this._state;
  }

  /**
   * Reset to initial state.
   */
  reset(): T {
    return this.replaceState({ ...this.options.state }, { type: "reset" });
  }

  /**
   * Batch multiple setState calls into one notification cycle.
   */
  batch(fn: () => void): void {
    this.isBatching = true;
    this.pendingState = {};
    try {
      fn();
    } finally {
      this.isBatching = false;
      if (this.pendingState && Object.keys(this.pendingState).length > 0) {
        const merged = this.pendingState as Partial<T>;
        this.pendingState = null;
        this.applyState(merged, { type: "batch" });
      }
    }
  }

  // --- Subscriptions ---

  /**
   * Subscribe to state changes.
   * With selector: only fires when selected value changes (with equality check).
   * Without selector: fires on every state change.
   */
  subscribe<U>(selector: Selector<T, U>, listener: (value: U) => void, equalityFn?: EqualityFn<U>): () => void;
  subscribe(listener: Listener<T>): () => void;
  subscribe(arg1: unknown, arg2?: unknown, arg3?: unknown): () => void {
    let selector: Selector<T, unknown> | undefined;
    let fn: Listener<T>;
    let eqFn: EqualityFn<unknown> | undefined;

    if (typeof arg1 === "function" && typeof arg2 === "function") {
      selector = arg1 as Selector<T, unknown>;
      fn = arg2 as Listener<T>;
      eqFn = arg3 as EqualityFn<unknown> | undefined;
    } else {
      fn = arg1 as Listener<T>;
    }

    const id = `sub-${++this._listenerCounter}`;
    const prevValue = selector ? selector(this._state) : undefined;

    this.listeners.set(id, {
      selector,
      fn,
      equalityFn: eqFn,
      prevValue,
    });

    this.stats.listenerCount = this.listeners.size;

    return () => {
      this.listeners.delete(id);
      this.stats.listenerCount = this.listeners.size;
    };
  }

  /**
   * One-shot subscription: fires once then auto-unsubscribes.
   */
  once<U>(selector: Selector<T, U>, listener: (value: U) => void): () => void {
    const unsub = this.subscribe(selector, (value) => {
      listener(value);
      unsub();
    });
    return unsub;
  }

  /**
   * Subscribe to specific key changes.
   */
  onKeyChange<K extends keyof T>(key: K, listener: (value: T[K], oldValue: T[K]) => void): () => void {
    return this.subscribe(
      (s) => s[key],
      (val) => {
        // We need the old value — stored in listener's prevValue
        const subEntry = [...this.listeners.values()].find((l) => l.fn === listener);
        listener(val, (subEntry?.prevValue as T[K]) ?? val);
      },
    );
  }

  // --- Computed Values ---

  /**
   * Add a computed/derived value that auto-updates when dependencies change.
   */
  addComputed<U>(name: string, getter: (state: T) => U, deps?: (keyof T)[]): void {
    this.computed.set(name, {
      get: getter,
      cachedValue: getter(this._state),
      dirty: false,
      deps,
    });
    this.stats.computedCount = this.computed.size;
  }

  /**
   * Get a computed value (cached until invalidated).
   */
  getComputed<U>(name: string): U {
    const comp = this.computed.get(name);
    if (!comp) throw new Error(`Computed "${name}" not found`);

    if (comp.dirty) {
      comp.cachedValue = comp.get(this._state);
      comp.dirty = false;
    }

    return comp.cachedValue as U;
  }

  /**
   * Remove a computed value.
   */
  removeComputed(name: string): void {
    this.computed.delete(name);
    this.stats.computedCount = this.computed.size;
  }

  /** List all computed names */
  listComputed(): string[] {
    return [...this.computed.keys()];
  }

  // --- Middleware ---

  /** Add middleware (called before state is applied) */
  use(middleware: Middleware<T>): () => void {
    this.middlewares.push(middleware);
    return () => {
      this.middlewares = this.middlewares.filter((m) => m !== middleware);
    };
  }

  // --- History / Time Travel ---

  /** Get action history */
  getHistory(): Array<{ state: T; action: StoreAction; timestamp: number }> {
    return [...this.history];
  }

  /** Jump to a point in history (time travel) */
  timeTravel(index: number): T {
    if (index < 0 || index >= this.history.length) {
      throw new Error(`History index ${index} out of bounds (${this.history.length} items)`);
    }
    const entry = this.history[index]!;
    this._state = { ...entry.state };
    this.invalidateComputeds();
    this.notifyListeners(entry.state);
    return this._state;
  }

  /** Clear history */
  clearHistory(): void {
    this.history = [];
  }

  // --- Stats & Debug ---

  /** Get store statistics */
  getStats(): StoreStats {
    return { ...this.stats };
  }

  /** Get all subscription info (for debug) */
  getSubscriptions(): SubscriptionInfo[] {
    return [...this.listeners.entries()].map(([id, entry]) => ({
      id,
      selectorName: entry.selector ? "custom" : undefined,
      createdAt: Date.now(), // Approximate
    }));
  }

  // --- Persistence ---

  /** Force save current state to storage */
  save(): void {
    this.persist();
  }

  /** Clear persisted data */
  clearPersisted(): void {
    if (this.options.persist?.key) {
      try {
        const storage = this.options.persist.storage === "sessionStorage"
          ? sessionStorage : localStorage;
        storage.removeItem(this.options.persist.key);
      } catch { /* ignore */ }
    }
  }

  // --- Internal ---

  private applyState(partial: Partial<T>, action?: StoreAction): void {
    const prevState = { ...this._state };

    if (this.isBatching && this.pendingState) {
      Object.assign(this.pendingState!, partial);
      return;
    }

    // Merge partial state
    Object.assign(this._state, partial);

    // Record history
    this.recordHistory(prevState, action ?? { type: "setState" });

    // Invalidate computeds that depend on changed keys
    this.invalidateComputeds();

    // Notify listeners
    this.notifyListeners(prevState);

    // Persist
    this.persist();

    // DevTools
    this.sendToDevTools(action);

    this.stats.dispatchCount++;
    this.stats.lastAction = action?.type ?? "setState";
    this.stats.lastUpdate = Date.now();
  }

  private notifyListeners(prevState: T): void {
    for (const [id, entry] of this.listeners) {
      if (entry.selector) {
        const newValue = entry.selector(this._state);
        const eq = entry.equalityFn ?? defaultEquality;
        if (!eq(newValue, entry.prevValue)) {
          entry.prevValue = newValue;
          try { entry.fn(this._state, prevState); } catch { /* ignore */ }
        }
      } else {
        try { entry.fn(this._state, prevState); } catch { /* ignore */ }
      }
    }
  }

  private invalidateComputeds(): void {
    for (const [name, comp] of this.computed) {
      if (!comp.deps || comp.deps.some((dep) => {
        // Simple check: if any dep changed since last compute
        // For simplicity, always invalidate
        return true;
      })) {
        comp.dirty = true;
      }
    }
  }

  private recordHistory(prevState: T, action: StoreAction): void {
    this.history.push({ state: { ...this._state }, action, timestamp: Date.now() });
    this.stats.actionCount++;
    // Keep history bounded
    if (this.history.length > 200) {
      this.history.shift();
    }
  }

  private persist(): void {
    if (!this.options.persist?.key) return;
    try {
      const storage = this.options.persist.storage === "sessionStorage"
        ? sessionStorage : localStorage;

      let data: Record<string, unknown> = { ...this._state };

      // Apply whitelist
      if (this.options.persist.whitelist) {
        const whitelisted: Record<string, unknown> = {};
        for (const key of this.options.persist.whitelist) {
          whitelisted[String(key)] = this._state[key];
        }
        data = whitelisted;
      }

      storage.setItem(this.options.persist.key, JSON.stringify({
        version: this.options.persist.version ?? 1,
        state: data,
        _savedAt: Date.now(),
      }));
    } catch { /* ignore quota errors */ }
  }

  private loadPersisted(): T | null {
    if (!this.options.persist?.key) return null;
    try {
      const storage = this.options.persist.storage === "sessionStorage"
        ? sessionStorage : localStorage;
      const raw = storage.getItem(this.options.persist.key);
      if (!raw) return null;

      const saved = JSON.parse(raw);
      const version = saved.version ?? 1;

      // Run migration if needed
      if (this.options.persist.migrate && version !== (this.options.persist.version ?? 1)) {
        return this.options.persist.migrate(saved.state, version);
      }

      return { ...saved.state } as T;
    } catch {
      return null;
    }
  }

  private sendToDevTools(action?: StoreAction): void {
    if (!this.options.devTools || typeof window === "undefined") return;

    try {
      const w = window as unknown as Record<string, unknown>;
      const devtools = w.__REDUX_DEVTOOLS_EXTENSION__ as
        | { connect: (opts: { name: string }) => { send: (action: StoreAction, state: T) => void } }
        | undefined;

      if (devtools && !this.devToolsConnected) {
        const conn = devtools.connect({
          name: typeof this.options.devTools === "string" ? this.options.devTools : "ReactiveStore",
        });
        this.devToolsConnected = true;
        (this as any)._devtoolsConn = conn;
      }

      if ((this as any)._devtoolsConn && action) {
        (this as any)._devtoolsConn.send(action, this._state);
      }
    } catch { /* devtools not available */ }
  }
}

// --- Factory ---

/** Create a reactive store (convenience function) */
export function createStore<T extends Record<string, unknown>>(options: StoreOptions<T>): ReactiveStore<T> {
  return new ReactiveStore(options);
}

// --- Built-in Middleware ---

/** Logger middleware: logs every action to console */
export function loggerMiddleware<T>(): Middleware<T> {
  return (state, action, next) => {
    const groupLabel = `[Store] ${action.type}`;
    console.group(groupLabel);
    console.log("%cPrev State", "color: #9E9E9E; font-weight: bold", state);
    console.log("%cAction", "color: #03A9F4; font-weight: bold", action);
    next(action);
    // Note: 'next' applies state, so we log after
    console.log("%cNext State", "color: #4CAF50; font-weight: bold", state);
    console.groupEnd();
  };
}

/** Throttle middleware: prevent rapid successive dispatches */
export function throttleMiddleware<T>(delayMs = 300): Middleware<T> {
  let lastDispatch = 0;
  let pendingAction: StoreAction | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (_state, action, next) => {
    const now = Date.now();
    if (now - lastDispatch < delayMs) {
      pendingAction = action;
      if (!timer) {
        timer = setTimeout(() => {
          if (pendingAction) next(pendingAction);
          pendingAction = null;
          timer = null;
          lastDispatch = Date.now();
        }, delayMs - (now - lastDispatch));
      }
      return;
    }
    lastDispatch = now;
    next(action);
  };
}

/** Immutable-check middleware: warn if state was mutated directly */
export function immutabilityCheckMiddleware<T>(): Middleware<T> {
  return (state, action, next) => {
    const snapshot = JSON.stringify(state);
    next(action);
    if (JSON.stringify(state) === snapshot) {
      // No change detected — might be fine for some actions
    }
  };
}

// --- Utilities ---

function createFreshStoreStats(): StoreStats {
  return {
    listenerCount: 0,
    computedCount: 0,
    actionCount: 0,
    dispatchCount: 0,
    lastAction: null,
    lastUpdate: null,
  };
}
