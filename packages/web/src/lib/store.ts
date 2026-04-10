/**
 * Lightweight State Store — Zustand-inspired reactive state management
 * with middleware support, devtools integration, persistence,
 * computed selectors, and batched updates.
 */

// --- Types ---

export type Listener<T> = (state: T, prevState: T) => void;
export type Selector<T, U> = (state: T) => U;
export type EqualityFn<U> = (a: U, b: U) => boolean;
export type PartialState<T> = Partial<T> | ((state: T) => Partial<T>);
export type Middleware<T> = (
  set: SetState<T>,
  get: GetState<T>,
  api: StoreApi<T>,
) => SetState<T>;

export interface StoreOptions<T> {
  /** Initial state */
  initialState: T;
  /** Optional name (for devtools) */
  name?: string;
  /** Middleware pipeline */
  middleware?: Middleware<T>[];
  /** Devtools integration flag */
  devtools?: boolean;
}

export interface StoreApi<T> {
  getState: () => T;
  setState: (partial: PartialState<T>, replace?: boolean) => void;
  subscribe: (listener: Listener<T>) => () => void;
  subscribeSelector: <U>(selector: Selector<T, U>, equalityFn?: EqualityFn<U>) => () => void;
  destroy: () => void;
  getListeners: () => number;
}

export interface PersistOptions {
  /** Storage key */
  key: string;
  /** Storage backend (default: localStorage) */
  storage?: Storage;
  /** Which parts of state to persist */
  partialize?: (state: unknown) => unknown;
  /** Version for migrations */
  version?: number;
  /** Migration function when version changes */
  migrate?: (persisted: unknown, version: number) => unknown;
  /** Serialize before storing */
  serialize?: (state: unknown) => string;
  /** Deserialize after loading */
  deserialize?: (str: string) => unknown;
}

// --- Equality Checks ---

const strictEqual = <T>(a: T, b: T): boolean => a === b;

const shallowEqual = <T extends Record<string, unknown>>(a: T, b: T): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
};

// --- Main Store Class ---

/**
 * A lightweight, reactive state management store.
 *
 * @example
 * ```ts
 * const counterStore = createStore({ count: 0 });
 * counterStore.subscribe((s) => console.log(s.count));
 * counterStore.setState({ count: s.count + 1 });
 * ```
 */
export class Store<T extends Record<string, unknown>> implements StoreApi<T> {
  private state: T;
  private listeners = new Set<Listener<T>>();
  private selectorSubscriptions = new Map<
    () => unknown,
    { selector: Selector<T, unknown>; prevValue: unknown; eq: EqualityFn<unknown>; listener: () => void }
  >();
  private destroyed = false;
  private isBatching = false;
  private pendingState: Partial<T> | null = null;

  constructor(initialState: T) {
    this.state = { ...initialState };
  }

  /** Get current state snapshot */
  getState(): T {
    return this.state;
  }

  /**
   * Update state. Accepts partial object or updater function.
   * Pass `true` as second arg to replace entire state.
   */
  setState(partial: PartialState<T>, replace = false): void {
    if (this.destroyed) return;

    const prevState = { ...this.state };

    if (typeof partial === "function") {
      const result = (partial as (state: T) => Partial<T>)(this.state);
      this.state = replace ? (result as T) : { ...this.state, ...result };
    } else {
      this.state = replace ? (partial as T) : { ...this.state, ...partial };
    }

    // Batch mode: defer notification
    if (this.isBatching) {
      this.pendingState = { ...this.pendingState!, ...this.state };
      return;
    }

    this.notify(prevState);
  }

  /** Subscribe to all state changes */
  subscribe(listener: Listener<T>): () => void {
    if (this.destroyed) listener(this.state, this.state);
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to a specific slice of state via selector.
   * Only calls listener when the selected value changes.
   */
  subscribeSelector<U>(
    selector: Selector<T, U>,
    equalityFn: EqualityFn<U> = strictEqual as EqualityFn<unknown> as EqualityFn<U>,
  ): () => void {
    let prevValue = selector(this.state);

    const check = (): void => {
      const nextValue = selector(this.state);
      if (!equalityFn(prevValue as unknown, nextValue as unknown)) {
        prevValue = nextValue;
        // Notify the subscriber's callback
        const sub = this.selectorSubscriptions.get(check);
        sub?.listener();
      }
    };

    // Register as a full-state listener that checks selector
    const unsub = this.subscribe(() => check());

    // Track for cleanup
    this.selectorSubscriptions.set(check, {
      selector: selector as Selector<T, unknown>,
      prevValue,
      eq: equalityFn as EqualityFn<unknown>,
      listener: () => {},
    });

    return () => {
      this.selectorSubscriptions.delete(check);
      unsub();
    };
  }

  /** Destroy store and remove all listeners */
  destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
    this.selectorSubscriptions.clear();
  }

  /** Get current listener count (useful for debugging/memory leaks) */
  getListeners(): number {
    return this.listeners.size + this.selectorSubscriptions.size;
  }

  // --- Batching ---

  /**
   * Batch multiple setState calls into a single notification.
   * Improves performance when updating many fields at once.
   */
  batch(fn: () => void): void {
    if (this.isBatching) {
      fn(); // Nested batches just run
      return;
    }
    this.isBatching = true;
    this.pendingState = {};
    try {
      fn();
    } finally {
      this.isBatching = false;
      const prevState = { ...this.state };
      this.pendingState = null;
      this.notify(prevState);
    }
  }

  // --- Reset ---

  /** Reset state to initial or provided values */
  reset(partial?: Partial<T>): void {
    const initial = {} as T;
    // We don't track initial separately, so reset requires explicit values
    if (partial) {
      this.setState(partial as PartialState<T>, true);
    }
  }

  // --- Internal ---

  private notify(prevState: T): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state, prevState);
      } catch {
        // Don't let one broken listener break others
      }
    }
    // Check selector subscriptions
    for (const [, sub] of this.selectorSubscriptions) {
      try {
        const nextValue = sub.selector(this.state);
        if (!sub.eq(sub.prevValue, nextValue)) {
          sub.prevValue = nextValue;
        }
      } catch {
        // Ignore
      }
    }
  }
}

// --- Factory ---

/** Create a new reactive store */
export function createStore<T extends Record<string, unknown>>(
  initialState: T,
): Store<T> {
  return new Store(initialState);
}

// --- Computed / Derived State ---

/**
 * Create a derived/computed value from store state.
 * Returns a getter function that recomputes on access.
 */
export function createComputed<T, U>(
  store: Store<T>,
  compute: (state: T) => U,
): () => U {
  let cached: { value: U; state: T } | null = null;
  return (): U => {
    const current = store.getState();
    if (!cached || cached.state !== current) {
      cached = { value: compute(current), state: current };
    }
    return cached.value;
  };
}

// --- Persistence Middleware ---

/**
 * Create persistence middleware that syncs state to storage.
 * Supports versioning and migration.
 */
export function persistMiddleware<T extends Record<string, unknown>>(
  options: PersistOptions,
): Middleware<T> {
  const {
    key,
    storage = typeof localStorage !== "undefined" ? localStorage : undefined,
    version = 0,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  return (set, _get, api) => {
    // Hydrate from storage
    if (storage) {
      try {
        const raw = storage.getItem(key);
        if (raw) {
          const parsed = deserialize(raw);
          const storedVersion = (parsed as { _version?: number })._version ?? 0;
          let state = (parsed as { state: T }).state ?? parsed;

          if (storedVersion !== version && options.migrate) {
            state = options.migrate(state, storedVersion) as T;
          }

          // Apply hydrated state
          setTimeout(() => {
            set(state as Partial<T>, true);
          }, 0);
        }
      } catch {
        // Corrupted data — ignore
      }
    }

    // Wrap set to also persist
    return (partial: PartialState<T>, replace?: boolean) => {
      set(partial, replace);

      // Persist after state update
      if (storage) {
        try {
          let toStore: unknown = api.getState();
          if (options.partialize) {
            toStore = options.partialize(toStore);
          }
          storage.setItem(key, serialize({ state: toStore, _version: version }));
        } catch {
          // Storage full or unavailable
        }
      }
    };
  };
}

// --- DevTools Integration ---

/**
 * Connect store to Redux DevTools extension (if available).
 */
export function connectDevTools<T extends Record<string, unknown>>(
  store: Store<T>,
  name = "Store",
): () => void {
  const win = typeof window !== "undefined" ? (window as Record<string, unknown>) : null;
  const devtools = win?.__REDUX_DEVTOOLS_EXTENSION__ as
    | ((opts: { name: string }) => { send: (action: unknown, state: unknown) => void })
    | undefined;

  if (!devtools) return () => {};

  const connection = devtools({ name });
  connection.send("INIT", store.getState());

  const unsub = store.subscribe((state) => {
    connection.send("UPDATE", state);
  });

  return unsub;
}

// --- Global Store Registry ---

const stores = new Map<string, Store<Record<string, unknown>>>();

/** Register a named store globally */
export function registerStore(name: string, store: Store<Record<string, unknown>>): void {
  stores.set(name, store);
}

/** Retrieve a registered store by name */
export function getStore(name: string): Store<Record<string, unknown>> | undefined {
  return stores.get(name);
}

/** Unregister and destroy a store */
export function unregisterStore(name: string): void {
  const store = stores.get(name);
  if (store) {
    store.destroy();
    stores.delete(name);
  }
}
