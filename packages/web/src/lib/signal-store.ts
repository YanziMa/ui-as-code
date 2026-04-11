/**
 * Signal Store — centralized reactive state management with signals as stores,
 * selector-based subscriptions, derived stores, devtools integration,
 * and persistence adapters.
 *
 * Combines the reactive signals pattern with a Redux-like store API.
 */

// --- Types ---

export type StateKey = string;
export type SelectorFn<TState, TSelected> = (state: TState) => TSelected;
export type Listener<T> = (value: T, prevValue: T | undefined) => void;

export interface StoreOptions<T> {
  /** Initial state */
  initialState: T;
  /** Store name for debugging */
  name?: string;
  /** Enable persistence (default: false) */
  persist?: boolean;
  /** Persistence key for localStorage (default: "store-{name}") */
  persistKey?: string;
  /** Custom serializer */
  serialize?: (state: T) => string;
  /** Custom deserializer */
  deserialize?: (raw: string) => T;
  /** Equality check for state comparisons (default: shallow) */
  equals?: (a: T, b: T) => boolean;
  /** Enable devtools integration (default: false) */
  devtools?: boolean;
  /** Called before every state update */
  middleware?: (state: T, next: T) => T;
}

export interface StoreInstance<T> {
  /** Current state snapshot */
  readonly state: T;
  /** Get current state (same as .state for compatibility) */
  getState: () => T;
  /** Update state (replace or merge) */
  setState: (updater: Partial<T> | ((prev: T) => T), label?: string) => T;
  /** Subscribe to specific slices of state */
  subscribe: <S>(selector: SelectorFn<T, S>, listener: Listener<S>, options?: { equalityFn?: (a: S, b: S) => boolean }) => () => void;
  /** Subscribe to entire state changes */
  subscribeAll: (listener: Listener<T>) => () => void;
  /** Create a derived/computed store from selectors */
  derive: <S>(selector: SelectorFn<T, S>, options?: { name?: string; equalityFn?: (a: S, b: S) => boolean }) => {
    getValue: () => S;
    subscribe: (listener: Listener<S>) => () => void;
    destroy: () => void;
  };
  /** Reset to initial state */
  reset: () => T;
  /** Replace state entirely */
  replace: (newState: T) => void;
  /** Get number of active subscribers */
  readonly subscriberCount: number;
  /** Persist current state to storage */
  persist: () => void;
  /** Restore state from storage */
  restore: () => boolean;
  /** Destroy store and all subscriptions */
  destroy: () => void;
}

// --- Default serialization ---

function defaultSerialize(state: unknown): string {
  return JSON.stringify(state);
}

function defaultDeserialize<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

// --- Main ---

export function createStore<T extends Record<string, unknown>>(options: StoreOptions<T>): StoreInstance<T> {
  const {
    initialState,
    name = "store",
    persist = false,
    persistKey = `store-${name}`,
    serialize = defaultSerialize,
    deserialize = defaultDeserialize<T>,
    equals,
    devtools = false,
    middleware,
  } = options;

  let currentState: T = { ...initialState };
  let destroyed = false;
  const allListeners = new Set<Listener<T>>();
  const sliceListeners = new Map<string, Set<{ selector: SelectorFn<T, unknown>; listener: Listener<unknown>; eq?: (a: unknown, b: unknown) => boolean }>>();
  const derivedStores = new Set<{ destroy: () => void }>();

  function doSetState(
    updater: Partial<T> | ((prev: T) => T),
    label?: string,
  ): T {
    if (destroyed) throw new Error("Store is destroyed");

    const prevState = currentState;
    let nextState: T;

    if (typeof updater === "function") {
      nextState = (updater as (prev: T) => T)(prevState);
    } else {
      nextState = { ...prevState, ...updater };
    }

    // Apply middleware
    if (middleware) {
      nextState = middleware(prevState, nextState);
    }

    // Check equality
    const changed = !equals ? true : prevState !== nextState;
    // For objects, do a simple reference check first
    const actuallyChanged = equals ? !equals(prevState, nextState) : JSON.stringify(prevState) !== JSON.stringify(nextState);

    if (!actuallyChanged) return currentState;

    currentState = nextState;

    // Notify all listeners
    for (const listener of allListeners) {
      try { listener(currentState, prevState); } catch { /* ignore */ }
    }
    // Notify slice listeners
    for (const [, listeners] of sliceListeners) {
      for (const { selector, listener: sl, eq } of listeners) {
        try {
          const prevSlice = selector(prevState);
          const nextSlice = selector(currentState);
          const equal = eq ?? ((a: unknown, b: unknown) =>
            JSON.stringify(a) === JSON.stringify(b));
          if (!equal(prevSlice, nextSlice)) sl(currentState as unknown, prevState as unknown);
        } catch { /* ignore */ }
      }
    }

    // Auto-persist
    if (persist) doPersist();

    // Devtools hook
    if (devtools && typeof window !== "undefined" && (window as unknown as Record<string, unknown>).__REDUX_DEVTOOLS__) {
      (window as unknown as { __REDUX_DEVTOOLS__?: (action: string, state: unknown) => void }).__REDUX_DEVTOOLS__?.({
        action: label ?? "setState",
        state: currentState,
      });
    }

    // Invalidate derived stores
    for (const derived of derivedStores) {
      derived.destroy();
    }

    return currentState;
  }

  function doSubscribe<S>(
    selector: SelectorFn<T, S>,
    listener: Listener<S>,
    options?: { equalityFn?: (a: S, b: S) => boolean },
  ): () => void {
    const key = options?.name ?? String(selector);
    if (!sliceListeners.has(key)) sliceListeners.set(key, new Set());
    const entry = { selector, listener: listener as Listener<unknown>, eq: options?.equalityFn };
    sliceListeners.get(key)!.add(entry);

    // Emit initial value
    try { listener(selector(currentState) as S, undefined); } catch { /* ignore */ }

    return () => {
      const set = sliceListeners.get(key);
      if (set) {
        set.delete(entry);
      }
    };
  }

  function doSubscribeAll(listener: Listener<T>): () => void {
    allListeners.add(listener);
    try { listener(currentState, undefined); } catch { /* ignore */ }
    return () => { allListeners.delete(listener); };
  }

  function doDerive<S>(
    selector: SelectorFn<T, S>,
    options?: { name?: string; equalityFn?: (a: S, b: S) => boolean },
  ) {
    let currentValue = selector(currentState);
    let currentValueVersion = -1;
    const subListeners = new Set<Listener<S>>();
    const eq = options?.equalityFn ?? ((a: S, b: S) =>
      JSON.stringify(a) === JSON.stringify(b));

    const notify = (): void => {
      const newValue = selector(currentState);
      if (!eq(currentValue, newValue)) {
        const prev = currentValue;
        currentValue = newValue;
        for (const l of subListeners) {
          try { l(newValue, prev); } catch { /* ignore */ }
        }
      }
    };

    // Re-evaluate on any state change
    const unsub = doSubscribeAll(() => notify());

    return {
      getValue: () => currentValue,
      subscribe: (l: Listener<S>) => {
        subListeners.add(l);
        l(currentValue, undefined);
        return () => { subListeners.delete(l); };
      },
      destroy: () => { unsub(); subListeners.clear(); },
    };
  }

  function doPersist(): void {
    try {
      localStorage.setItem(persistKey, serialize(currentState));
    } catch { /* storage unavailable */ }
  }

  function doRestore(): boolean {
    try {
      const raw = localStorage.getItem(persistKey);
      if (!raw) return false;
      const restored = deserialize(raw);
      if (restored) {
        currentState = restored;
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  // Try restore on creation
  if (persist) doRestore();

  const instance: StoreInstance<T> = {
    get state() { return { ...currentState }; },
    getState: () => ({ ...currentState }),
    setState: doSetState,
    subscribe: doSubscribe as typeof instance.subscribe,
    subscribeAll: doSubscribeAll,
    derive: doDerive,
    reset() { return doSetState({ ...initialState }, "reset"); },
    replace(newState: T) { currentState = newState; doPersist(); },
    get subscriberCount() { return allListeners.size + sliceListeners.size; },
    persist: doPersist,
    restore: doRestore,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      allListeners.clear();
      sliceListeners.clear();
      for (const d of derivedStores) d.destroy();
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Create a simple counter store with increment/decrement/reset */
export function createCounterStore(initial = 0, options?: Partial<StoreOptions<number>>): StoreInstance<{
  count: number;
  lastAction?: string;
}> & { increment: (by?: number) => void; decrement: (by?: number) => void } {
  const store = createStore<number>({
    initialState: { count: initial },
    ...options,
  });

  return {
    ...store,
    increment(by = 1) {
      store.setState((prev) => ({ count: prev.count + by, lastAction: "increment" }));
    },
    decrement(by = 1) {
      store.setState((prev) => ({ count: Math.max(0, prev.count - by), lastAction: "decrement" }));
    },
  } as StoreInstance<{
    count: number;
    lastAction?: string;
  }>;
}
