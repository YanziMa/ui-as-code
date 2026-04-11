/**
 * Reactive State Store: Lightweight state management with typed state,
 * computed values (derived state), middleware/actions, subscriptions,
 * devtools integration points, persistence, and undo/redo support.
 */

// --- Types ---

export type StateListener<T> = (state: T, prevState: T) => void;
export type KeyListener<T, K extends keyof T> = (value: T[K], prevValue: T[K], key: K) => void;
export type Middleware<T> = (
  state: T,
  patch: Partial<T>,
  next: (patch: Partial<T>) => void,
) => void;
export type Selector<T, R> = (state: T) => R;

export interface StoreOptions<T> {
  /** Initial state */
  initial: T;
  /** Middleware pipeline */
  middleware?: Middleware<T>[];
  /** Auto-persist to localStorage? */
  persist?: {
    key: string;
    /** Whitelist of keys to persist (undefined = all) */
    whitelist?: (keyof T)[];
    /** Debounce writes in ms (default: 0 = immediate) */
    debounceMs?: number;
  };
  /** Enable undo/redo history */
  undoable?: {
    maxHistory?: number; // default: 50
  };
  /** Devtools hook name for Redux DevTools integration */
  devtoolsName?: string;
}

export interface StoreInstance<T> {
  /** Get current state snapshot */
  getState(): T;
  /** Update state (shallow merge) */
  setState(patch: Partial<T>): void;
  /** Replace entire state */
  replaceState(state: T): void;
  /** Reset to initial state */
  reset(): void;
  /** Subscribe to all state changes */
  subscribe(listener: StateListener<T>): () => void;
  /** Subscribe to changes on a specific key */
  subscribeKey<K extends keyof T>(key: K, listener: KeyListener<T, K>): () => void;
  /** Subscribe to a derived/computed value */
  subscribeSelector<R>(selector: Selector<T, R>, listener: (value: R) => void): () => void;
  /** Create a derived/computed value getter */
  compute<R>(selector: Selector<T, R>): () => R;
  /** Register an action (named state mutation) */
  action(name: string, fn: (state: T, ...args: unknown[]) => Partial<T>): (...args: unknown[]) => void;
  /** Undo last change */
  undo(): boolean;
  /** Redo undone change */
  redo(): boolean;
  /** Check if can undo */
  canUndo(): boolean;
  /** Check if can redo */
  canRedo(): boolean;
  /** Clear history */
  clearHistory(): void;
  /** Destroy store and cleanup */
  destroy(): void;
}

// --- Main Class ---

export class StateStore<T extends Record<string, unknown>> {
  create(options: StoreOptions<T>): StoreInstance<T> {
    let state: T = { ...options.initial };
    const initialState = { ...options.initial };
    const listeners = new Set<StateListener<T>>();
    const keyListeners = new Map<keyof T, Set<KeyListener<T, keyof T>>>();
    const selectorCache = new Map<Selector<T, unknown>, { value: unknown; listeners: Set<(v: unknown) => void> }>();
    let destroyed = false;

    // Undo/redo
    const maxHistory = options.undoable?.maxHistory ?? 0;
    const history: T[] = [];
    let historyIndex = -1;
    let skipHistory = false;

    // Persistence
    let persistTimer: ReturnType<typeof setTimeout> | null = null;

    // DevTools
    let devtoolsConnected = false;

    function saveToHistory(currentState: T): void {
      if (maxHistory <= 0 || skipHistory) return;
      // Remove any future states if we're not at the end
      if (historyIndex < history.length - 1) {
        history.splice(historyIndex + 1);
      }
      history.push({ ...currentState });
      if (history.length > maxHistory) {
        history.shift();
      } else {
        historyIndex = history.length - 1;
      }
    }

    function persistState(currentState: T): void {
      if (!options.persist || destroyed) return;

      const debounceMs = options.persist.debounceMs ?? 0;

      function doPersist(): void {
        try {
          const data = options.persist.whitelist
            ? options.persist.whitelist.reduce((acc, k) => ({ ...acc, [k]: currentState[k] }), {} as Partial<T>)
            : currentState;
          window.localStorage.setItem(options.persist!.key, JSON.stringify(data));
        } catch {
          // Quota exceeded or unavailable
        }
      }

      if (debounceMs > 0) {
        clearTimeout(persistTimer!);
        persistTimer = setTimeout(doPersist, debounceMs);
      } else {
        doPersist();
      }
    }

    function loadPersistedState(): T | null {
      if (!options.persist) return null;
      try {
        const raw = window.localStorage.getItem(options.persist.key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<T>;
        return { ...initialState, ...parsed };
      } catch {
        return null;
      }
    }

    function connectDevTools(): void {
      if (!options.devtoolsName || typeof window === "undefined") return;

      try {
        const w = window as unknown as Record<string, unknown>;
        if (w.__REDUX_DEVTOOLS_EXTENSION__) {
          const ext = w.__REDUX_DEVTOOLS_EXTENSION__ as { connect: (opts: { name: string }) => { init: (s: T) => void; send: (action: string, s: T) => void } };
          const connection = ext.connect({ name: options.devtoolsName });
          connection.init(state);
          devtoolsConnected = true;

          // Override setState to also notify devtools
          const originalEmit = emitChange;
          (instance as any)._devtoolsConnection = connection;
        }
      } catch {
        // DevTools not available
      }
    }

    function emitChange(prevState: T): void {
      // Notify all subscribers
      for (const listener of listeners) {
        try { listener(state, prevState); } catch { /* ignore */ }
      }

      // Notify key-specific subscribers
      const changedKeys = new Set<keyof T>(
        (Object.keys(state) as (keyof T)[]).filter(
          (k) => state[k] !== prevState[k],
        ),
      );

      for (const key of changedKeys) {
        const set = keyListeners.get(key);
        if (set) {
          for (const listener of set) {
            try { listener(state[key]!, prevState[key]!, key); } catch { /* ignore */ }
          }
        }
      }

      // Notify selector subscribers
      for (const [selector, entry] of selectorCache) {
        const newValue = selector(state);
        if (newValue !== entry.value) {
          entry.value = newValue;
          for (const listener of entry.listeners) {
            try { listener(newValue); } catch { /* ignore */ }
          }
        }
      }

      // Persist & devtools
      persistState(state);

      if (devtoolsConnected && (instance as any)._devtoolsConnection) {
        try {
          (instance as any)._devtoolsConnection.send("setState", state);
        } catch { /* ignore */ }
      }
    }

    function applyPatch(patch: Partial<T): void {
      if (destroyed) return;

      const prevState = { ...state };

      // Apply middleware chain
      if (options.middleware && options.middleware.length > 0) {
        let mwIndex = 0;
        const next = (p: Partial<T>) => {
          if (mwIndex < options.middleware!.length) {
            const mw = options.middleware![mwIndex++]!;
            mw(state, p, next);
          } else {
            doApply(p);
          }
        };
        next(patch);
      } else {
        doApply(patch);
      }
    }

    function doApply(patch: Partial<T>): void {
      const prevState = { ...state };
      state = { ...state, ...patch };

      saveToHistory(prevState);
      emitChange(prevState);
    }

    // Load persisted state on creation
    const persisted = loadPersistedState();
    if (persisted) {
      state = persisted;
    }

    // Connect devtools after initial state is set
    connectDevTools();

    const instance: StoreInstance<T> = {

      getState() { return { ...state }; },

      setState(patch: Partial<T>): void {
        applyPatch(patch);
      },

      replaceState(newState: T): void {
        const prevState = { ...state };
        state = { ...newState };
        saveToHistory(prevState);
        emitChange(prevState);
      },

      reset(): void {
        this.replaceState({ ...initialState });
      },

      subscribe(listener: StateListener<T>): () => void {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },

      subscribeKey<K extends keyof T>(key: K, listener: KeyListener<T, K>): () => void {
        let set = keyListeners.get(key);
        if (!set) { set = new Set(); keyListeners.set(key, set); }
        set.add(listener as KeyListener<T, keyof T>);
        return () => set!.delete(listener as KeyListener<T, keyof T>);
      },

      subscribeSelector<R>(selector: Selector<T, R>, listener: (value: R) => void): () => void {
        let entry = selectorCache.get(selector as Selector<T, unknown>);
        if (!entry) {
          entry = { value: selector(state), listeners: new Set() };
          selectorCache.set(selector as Selector<T, unknown>, entry);
        }
        entry.listeners.add(listener as (v: unknown) => void);
        return () => entry!.listeners.delete(listener as (v: unknown) => void);
      },

      compute<R>(selector: Selector<T, R>): () => R {
        return () => selector(state);
      },

      action(name: string, fn: (state: T, ...args: unknown[]) => Partial<T>): (...args: unknown[]) => void {
        return (...args: unknown[]) => {
          const patch = fn(state, ...args);
          if (patch) applyPatch(patch);
        };
      },

      undo(): boolean {
        if (historyIndex < 0) return false;
        skipHistory = true;
        const prevState = { ...state };
        state = { ...history[historyIndex]! };
        historyIndex--;
        emitChange(prevState);
        skipHistory = false;
        return true;
      },

      redo(): boolean {
        if (historyIndex >= history.length - 1) return false;
        skipHistory = true;
        const prevState = { ...state };
        historyIndex++;
        state = { ...history[historyIndex]! };
        emitChange(prevState);
        skipHistory = false;
        return true;
      },

      canUndo(): boolean { return historyIndex >= 0; },
      canRedo(): boolean { return historyIndex < history.length - 1; },

      clearHistory(): void {
        history.length = 0;
        historyIndex = -1;
      },

      destroy(): void {
        destroyed = true;
        listeners.clear();
        keyListeners.clear();
        selectorCache.clear();
        history.length = 0;
        historyIndex = -1;
        if (persistTimer) clearTimeout(persistTimer);
      },
    };

    return instance;
  }
}

/** Convenience: create a typed state store */
export function createStore<T extends Record<string, unknown>>(
  options: StoreOptions<T>,
): StoreInstance<T> {
  return new StateStore<T>().create(options);
}

// --- Standalone Utilities ---

/** Create a simple atomic counter store */
export function createCounter(initial = 0): StoreInstance<{ value: number }> {
  return createStore({
    initial: { value: initial },
    actions: {
      increment: (s) => ({ value: s.value + 1 }),
      decrement: (s) => ({ value: s.value - 1 }),
      set: (_s, v: number) => ({ value: v }),
    },
  } as StoreOptions<{ value: number }>);
}
