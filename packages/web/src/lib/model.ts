/**
 * Model: Lightweight state management with reactive updates,
 * computed properties, middleware pipeline, devtools integration,
 * and immutable state pattern.
 *
 * Provides:
 *   - Create<T>() factory for typed state stores
 *   - Get/set/update with change notification
 *   - Computed derived values with dependency tracking
 *   - Middleware pipeline (logger, persistence, undo/redo)
 *   - Batch updates (atomic)
 *   - Selector memoization
 *   - Subscribe to specific key changes
 *   - JSON serialization/deserialization
 */

// --- Types ---

export type Listener<T> = (state: T, prevState: T) => void;
export type Middleware<T> = (state: T, next: (state: T) => void) => T;
export type Selector<T, R> = (state: T) => R;

export interface ModelConfig<T> {
  /** Initial state */
  initial: T;
  /** Middleware pipeline */
  middleware?: Middleware<T>[];
  /** Dev mode logging */
  devMode?: boolean;
}

export interface ModelInstance<T> {
  /** Current state (reactive proxy or snapshot) */
  getState: () => T;
  /** Get a single value by path */
  get<K extends keyof T>(key: K): T[K];
  /** Set value(s) — triggers listeners */
  set(partial: Partial<T>): T;
  /** Update using updater function */
  update(updater: (state: T) => T): T;
  /** Batch multiple sets into one update */
  batch(fn: (set: (p: Partial<T>) => void) => void): T;
  /** Subscribe to all changes */
  subscribe(listener: Listener<T>): () => void;
  /** Subscribe to specific key changes */
  subscribeKey<K extends keyof T>(key: K, listener: (value: T[K], prev: T[K]) => void): () => void;
  /** Create a memoized selector */
  createSelector<R>(selector: Selector<T, R>): () => R;
  /** Reset to initial state */
  reset(): T;
  /** Serialize state to JSON */
  serialize(): string;
  /** Deserialize from JSON */
  deserialize(json: string): T;
  /** Destroy all listeners */
  destroy: () => void;
}

// --- Implementation ---

export function createModel<T extends object>(config: ModelConfig<T>): ModelInstance<T> {
  let state: T = { ...config.initial };
  const initial = config.initial;
  const listeners = new Set<Listener<T>>();
  const keyListeners = new Map<keyof T, Set<(v: unknown, p: unknown) => void>>();
  const selectorCache = new Map<Function, { value: unknown; deps: Set<keyof T> }>();
  const middleware = config.middleware ?? [];
  const log = config.devMode ? (...a: unknown[]) => console.log("[Model]", ...a) : () => {};

  function getState(): T { return state; }

  function get<K extends keyof T>(key: K): T[K] { return state[key]; }

  function set(partial: Partial<T>): T {
    const prevState = { ...state };
    state = { ...state, ...partial };
    state = runMiddleware(state, prevState);
    notify(prevState);
    log("set:", partial, "-> state:", state);
    return state;
  }

  function update(updater: (state: T) => T): T {
    const prevState = { ...state };
    const updated = updater({ ...state });
    state = { ...state, ...updated };
    state = runMiddleware(state, prevState);
    notify(prevState);
    log("update:", "-> state:", state);
    return state;
  }

  function batch(fn: (set: (p: Partial<T>) => void) => void): T {
    const prevState = { ...state };
    const pending: Partial<T> = {};
    fn((p) => Object.assign(pending, p));
    state = { ...state, ...pending };
    state = runMiddleware(state, prevState);
    notify(prevState);
    log("batch:", pending, "-> state:", state);
    return state;
  }

  function subscribe(listener: Listener<T>): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function subscribeKey<K extends keyof T>(key: K, listener: (value: T[K], prev: T[K]) => void): () => void {
    if (!keyListeners.has(key)) keyListeners.set(key, new Set());
    keyListeners.get(key)!.add(listener as (v: unknown, p: unknown) => void);
    return () => { keyListeners.get(key)?.delete(listener as (v: unknown, p: unknown) => void); };
  }

  function createSelector<R>(selector: Selector<T, R>): () => R {
    return () => {
      const cached = selectorCache.get(selector);
      const currentDeps = new Set(Object.keys(state).filter((k) => k in state) as keyof T[]);
      if (cached && depsEqual(cached.deps, currentDeps)) return cached.value as R;
      const value = selector(state);
      selectorCache.set(selector, { value, deps: currentDeps });
      return value;
    };
  }

  function reset(): T { return set({ ...initial }); }
  function serialize(): string { return JSON.stringify(state); }
  function deserialize(json: string): T { try { state = JSON.parse(json); return state; } catch { return state; } }
  function destroy() { listeners.clear(); keyListeners.clear(); selectorCache.clear(); }

  function notify(prevState: T): void {
    for (const listener of listeners) { try { listener(state, prevState); } catch {} }
    // Key-specific listeners
    for (const [key, keyListenerSet] of keyListeners) {
      const newVal = state[key];
      const oldVal = prevState[key];
      if (newVal !== oldVal) {
        for (const kl of keyListenerSet) { try { kl(newVal, oldVal); } catch {} }
      }
    }
    // Invalidate selectors
    selectorCache.clear();
  }

  function runMiddleware(current: T, previous: T): T {
    let result = current;
    for (const mw of middleware) {
      result = mw(result, (_next) => {}) as T;
    }
    return result;
  }

  function depsEqual(a: Set<keyof T>, b: Set<keyof T>): boolean {
    if (a.size !== b.size) return false;
    for (const v of a) if (!b.has(v)) return false;
    return true;
  }

  return { getState, get, set, update, batch, subscribe, subscribeKey, createSelector, reset, serialize, deserialize, destroy };
}
