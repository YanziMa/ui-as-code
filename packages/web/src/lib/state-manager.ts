/**
 * State Manager: Lightweight reactive state management with computed values,
 * middleware, persistence, batching, devtools integration, and time-travel debugging.
 */

// --- Types ---

export type Listener<T> = (state: T, prevState: T) => void;
export type Middleware<T> = (state: T, action: string, next: () => T) => T;
export type Selector<T, R> = (state: T) => R;

export interface StoreOptions<T> {
  /** Initial state */
  initial: T;
  /** Store name (for devtools/persistence) */
  name?: string;
  /** Middleware pipeline */
  middleware?: Middleware<T>[];
  /** Persist to localStorage? */
  persist?: boolean | { key: string; debounceMs?: number };
  /** Enable devtools logging? */
  devtools?: boolean;
}

export interface StoreInstance<T> {
  /** Current state (reactive getter) */
  getState: () => T;
  /** Update state via merge or replace */
  setState: (partial: Partial<T> | ((prev: T) => T), action?: string) => void;
  /** Replace entire state */
  replaceState: (state: T, action?: string) => void;
  /** Subscribe to changes */
  subscribe: (listener: Listener<T>) => () => void;
  /** Subscribe to a specific slice (selector pattern) */
  subscribeTo: <R>(selector: Selector<T, R>, listener: (value: R) => void) => () => void;
  /** Create a computed/derived value */
  computed: <R>(selector: Selector<T, R>) => ComputedValue<R>;
  /** Dispatch an action (for middleware) */
  dispatch: (action: string, payload?: unknown) => void;
  /** Get action history */
  getHistory: () => Array<{ action: string; timestamp: number; prev: T; next: T }>;
  /** Undo last action */
  undo: () => boolean;
  /** Redo undone action */
  redo: () => boolean;
  /** Clear history */
  clearHistory: () => void;
  /** Destroy store and cleanup */
  destroy: () => void;
}

interface ActionRecord<T> {
  action: string;
  timestamp: number;
  prev: T;
  next: T;
}

export interface ComputedValue<R> {
  getValue: () => R;
  subscribe: (listener: (value: R) => void) => () => void;
  destroy: () => void;
}

// --- Store Factory ---

export function createStore<T extends Record<string, unknown>>(options: StoreOptions<T>): StoreInstance<T> {
  let state = { ...options.initial };
  const listeners = new Set<Listener<T>>();
  const computedValues = new Set<ComputedValue<unknown>>();
  const history: ActionRecord<T>[] = [];
  let historyIndex = -1;
  let maxHistory = 50;
  let destroyed = false;

  // Load persisted state
  if (options.persist) {
    try {
      const key = typeof options.persist === "object" ? options.persist.key : `store:${options.name ?? "default"}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...options.initial, ...parsed };
      }
    } catch {}
  }

  function persistState(): void {
    if (!options.persist || typeof window === "undefined") return;
    try {
      const key = typeof options.persist === "object" ? options.persist.key : `store:${options.name ?? "default"}`;
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }

  function notify(prev: T): void {
    for (const fn of listeners) {
      try { fn(state, prev); } catch {}
    }
    // Notify computed values
    for (const cv of computedValues) {
      try { (cv as ComputedValue<T>).notify?.(state); } catch {}
    }
    if (options.devtools && !destroyed) {
      console.log(`[Store${options.name ? ` ${options.name}` : ""}]`, state);
    }
  }

  function runMiddleware(action: string, nextState: T): T {
    if (!options.middleware || options.middleware.length === 0) return nextState;
    let result = nextState;
    let idx = 0;
    const execute = (): T => {
      if (idx >= options.middleware!.length) return result;
      const mw = options.middleware![idx++]!;
      result = mw(result, action, execute);
      return result;
    };
    return execute();
  }

  function recordAction(action: string, prev: T, next: T): void {
    // Truncate future if we're not at the end
    if (historyIndex < history.length - 1) {
      history.length = historyIndex + 1;
    }
    history.push({ action, timestamp: Date.now(), prev: { ...prev }, next: { ...next } });
    if (history.length > maxHistory) history.shift();
    else historyIndex = history.length - 1;
  }

  const instance: StoreInstance<T> = {
    getState() { return state; },

    setState(partial, action = "setState") {
      if (destroyed) return;
      const prev = { ...state };
      const nextVal = typeof partial === "function"
        ? (partial as (prev: T) => T)(state)
        : { ...state, ...partial };
      const final = runMiddleware(action, nextVal);
      state = final;
      recordAction(action, prev, state);
      notify(prev);
      persistState();
    },

    replaceState(newState, action = "replaceState") {
      if (destroyed) return;
      const prev = { ...state };
      state = runMiddleware(action, { ...newState });
      recordAction(action, prev, state);
      notify(prev);
      persistState();
    },

    subscribe(listener: Listener<T>): () => void {
      listeners.add(listener);
      listener(state, state); // Initial call
      return () => listeners.delete(listener);
    },

    subscribeTo<R>(selector: Selector<T, R>, listener: (value: R) => void): () => void {
      let lastValue = selector(state);
      listener(lastValue);
      const unsub = this.subscribe((_s, _p) => {
        const newValue = selector(state);
        if (newValue !== lastValue) {
          lastValue = newValue;
          listener(newValue);
        }
      });
      return unsub;
    },

    computed<R>(selector: Selector<T, R>): ComputedValue<R> {
      let currentValue = selector(state);
      const subs = new Set<(value: R) => void>();
      const cv: ComputedValue<R> & { notify: (s: T) => void } = {
        getValue() { return currentValue; },
        subscribe(listener: (value: R) => void): () => void {
          subs.add(listener);
          listener(currentValue);
          return () => subs.delete(listener);
        },
        notify(s: T) {
          const newVal = selector(s);
          if (newVal !== currentValue) {
            currentValue = newVal;
            for (const fn of subs) { try { fn(currentValue); } catch {} }
          }
        },
        destroy() { computedValues.delete(cv as unknown as ComputedValue<unknown>); },
      };
      computedValues.add(cv as unknown as ComputedValue<unknown>);
      return cv;
    },

    dispatch(action, _payload) {
      this.setState({} as Partial<T>, action);
    },

    getHistory() { return [...history]; },

    undo(): boolean {
      if (historyIndex <= 0) return false;
      historyIndex--;
      const record = history[historyIndex]!;
      state = { ...record.prev };
      notify(state);
      persistState();
      return true;
    },

    redo(): boolean {
      if (historyIndex >= history.length - 1) return false;
      historyIndex++;
      const record = history[historyIndex]!;
      state = { ...record.next };
      notify(state);
      persistState();
      return true;
    },

    clearHistory() { history.length = 0; historyIndex = -1; },

    destroy() {
      destroyed = true;
      listeners.clear();
      computedValues.clear();
    },
  };

  return instance;
}

// --- Utility: Combine Stores ---

/** Merge multiple stores into a combined state view */
export function combineStores<T extends Record<string, StoreInstance<Record<string, unknown>>>>(
  stores: T,
): StoreInstance<{ [K in keyof T]: ReturnType<T[K]["getState"]> }> {
  const keys = Object.keys(stores) as (keyof T)[];
  const getCombined = () => {
    const result = {} as { [K in keyof T]: ReturnType<T[K]["getState"]> };
    for (const k of keys) result[k] = stores[k]!.getState();
    return result;
  };

  let current = getCombined();

  const unsubs = keys.map((k) =>
    stores[k]!.subscribe(() => {
      const prev = current;
      current = getCombined();
      for (const fn of combinedListeners) { try { fn(current, prev); } catch {} }
    })
  );

  const combinedListeners = new Set<Listener<{ [K in keyof T]: ReturnType<T[K]["getState"]> }>>();

  return {
    getState: () => current,
    setState: (_p, _a) => {},
    replaceState: (_s, _a) => {},
    subscribe: (listener) => { combinedListeners.add(listener); listener(current, current); return () => combinedListeners.delete(listener); },
    subscribeTo: (sel, listener) => {
      let last = sel(current);
      listener(last);
      return this.subscribe((_s, _p) => {
        const val = sel(current);
        if (val !== last) { last = val; listener(val); }
      });
    },
    computed: (sel) => {
      let val = sel(current);
      const subs = new Set<(v: unknown) => void>();
      const unsub = this.subscribe((s) => {
        const v = sel(s);
        if (v !== val) { val = v; for (const fn of subs) { try { fn(v); } catch {} } }
      });
      return { getValue: () => val, subscribe: (l) => { subs.add(l); l(val); return () => subs.delete(l); }, destroy: unsub };
    },
    dispatch: () => {},
    getHistory: () => [],
    undo: () => false,
    redo: () => false,
    clearHistory: () => {},
    destroy: () => { for (const u of unsubs) u(); },
  } as StoreInstance<{ [K in keyof T]: ReturnType<T[K]["getState"]> }>;
}
