/**
 * Observer pattern and reactive utilities: observable values, computed values,
 * dependency tracking, batched updates, deep watching.
 */

// --- Observable ---

export type Unsubscribe = () => void;
export type Subscriber<T> = (value: T, oldValue?: T) => void;

interface ObservableInternal<T> {
  value: T;
  subscribers: Set<Subscriber<T>>;
}

/** Simple observable value that notifies subscribers on change */
export class Observable<T> {
  private _value: T;
  private subscribers = new Set<Subscriber<T>>();

  constructor(initialValue: T) { this._value = initialValue; }

  get value(): T { return this._value; }

  set value(newValue: T) {
    if (this._value === newValue) return;
    const oldValue = this._value;
    this._value = newValue;
    this.notify(newValue, oldValue);
  }

  /** Subscribe to changes */
  subscribe(fn: Subscriber<T>): Unsubscribe {
    this.subscribers.add(fn);
    fn(this._value);
    return () => { this.subscribers.delete(fn); };
  }

  /** Subscribe but only fire on next change (not immediately) */
  subscribeNext(fn: Subscriber<T>): Unsubscribe {
    let fired = false;
    const unsub = this.subscribe((val, old) => {
      if (!fired) { fired = true; return; }
      fn(val, old);
    });
    return () => { unsub(); fired = false; };
  }

  /** Map observable to new type */
  map<U>(fn: (value: T) => U): Observable<U> {
    const obs = new Observable(fn(this._value));
    this.subscribe((v) => obs.value = fn(v));
    return obs;
  }

  /** Filter observable */
  filter(predicate: (value: T) => boolean): Observable<T | undefined> {
    const obs = new Observable(this._value);
    this.subscribe((v) => { if (predicate(v)) obs.value = v; });
    return predicate(this._value) ? obs : undefined;
  }

  /** Reduce over changes */
  reduce<U>(fn: (acc: U, value: T) => U, initial: U): Observable<U> {
    const obs = new Observable(initial);
    this.subscribe((v) => obs.value = fn(obs.value, v));
    return obs;
  }

  private notify(value: T, oldValue?: T): void {
    for (const fn of this.subscribers) {
      try { fn(value, oldValue); } catch {}
    }
  }

  get subscriberCount(): number { return this.subscribers.size; }
  destroy(): void { this.subscribers.clear(); }
}

// --- Computed Value ---

/** Value derived from dependencies, auto-updates when deps change */
export class ComputedValue<T> {
  private _value: T;
  private computeFn: () => T;
  private deps: Observable<unknown>[];
  private subscriptions: Unsubscribe[] = [];
  private dirty = true;
  private subscribers = new Set<Subscriber<T>>();

  constructor(computeFn: () => T, deps: Array<Observable<unknown>>) {
    this.computeFn = computeFn;
    this.deps = deps;
    this._value = computeFn();
    // Subscribe to all dependencies
    for (const dep of deps) {
      this.subscriptions.push(
        dep.subscribe(() => { this.dirty = true; this.recompute(); }),
      );
    }
  }

  private recompute(): void {
    const newValue = this.computeFn();
    if (newValue !== this._value) {
      const old = this._value;
      this._value = newValue;
      this.notify(newValue, old);
    }
  }

  get value(): T {
    if (this.dirty) { this.recompute(); this.dirty = false; }
    return this._value;
  }

  subscribe(fn: Subscriber<T>): Unsubscribe {
    this.subscribers.add(fn);
    fn(this._value);
    return () => { this.subscribers.delete(fn); };
  }

  private notify(value: T, oldValue?: T): void {
    for (const fn of this.subscribers) {
      try { fn(value, oldValue); } catch {}
    }
  }

  destroy(): void {
    for (const sub of this.subscriptions) sub();
    this.subscriptions = [];
    this.subscribers.clear();
  }
}

// --- Reactive Store ---

export interface StoreState<T> { state: T; version: number }

export interface StoreOptions {
  batchSize?: number;       // Batch updates within Nms
  batchMax?: number;        // Max items per batch
  historyLimit?: number;     // Keep last N states
  persistKey?: string;     // localStorage key
}

/** Simple reactive store with batching and optional persistence */
export class ReactiveStore<T extends Record<string, unknown>> {
  private _state: T;
  private version = 0;
  private listeners = new Set<(state: T, patch: Partial<T>, version: number) => void>();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private batchedPatch: Partial<T> = {};
  private options: Required<StoreOptions>;
  private history: Array<StoreState<T>> = [];

  constructor(initialState: T, options: StoreOptions = {}) {
    this._state = initialState;
    this.options = {
      batchSize: options.batchSize ?? 16,
      batchMax: options.batchMax ?? 50,
      historyLimit: options.historyLimit ?? 50,
      persistKey: options.persistKey,
    };
    this.saveHistory();
    this.loadPersisted();
  }

  get state(): T { return this._state; }

  /** Get a specific key from state */
  get<K extends keyof T>(key: K): T[K] { return this._state[key]; }

  /** Update state (batched automatically) */
  set(patch: Partial<T>): void {
    Object.assign(this.batchedPatch, patch);

    if (Object.keys(this.batchedPatch).length >= this.options.batchMax) {
      this.flush();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flush(), this.options.batchSize);
    }
  }

  /** Force flush all pending updates */
  flush(): void {
    if (this.batchTimer) { clearTimeout(this.batchTimer); this.batchTimer = null; }
    if (Object.keys(this.batchedPatch).length === 0) return;

    const patch = { ...this.batchedPatch };
    this.batchedPatch = {};
    this.version++;

    const prevState = { ...this._state };
    Object.assign(this._state, patch);
    this.saveHistory();

    for (const listener of this.listeners) {
      try { listener(this._state, patch, this.version); } catch {}
    }

    this.persist();
  }

  /** Reset state to initial or provided value */
  reset(newState?: T): void {
    this._state = newState ?? ({} as T);
    this.batchedPatch = {};
    this.version++;
    this.history = [];
    this.saveHistory();
    this.persist();

    for (const listener of this.listeners) {
      try { listener(this._state, {}, this.version); } catch {}
    }
  }

  /** Subscribe to all state changes */
  subscribe(listener: (state: T, patch: Partial<T>, version: number) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this._state, {}, this.version);
    return () => { this.listeners.delete(listener); };
  }

  /** Get state at specific version */
  getVersion(version: number): StoreState<T> | undefined {
    return this.history.find((s) => s.version === version);
  }

  /** Undo to previous state */
  undo(): boolean {
    if (this.history.length <= 1) return false;
    this.history.pop(); // Remove current
    const prev = this.history.pop()!;
    this._state = prev.state;
    this.version = prev.version;
    this.persist();

    for (const listener of this.listeners) {
      try { listener(this._state, {}, this.version); } catch {}
    }
    return true;
  }

  get version(): number { return this.version; }

  destroy(): void {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.listeners.clear();
    this.history = [];
  }

  private saveHistory(): void {
    this.history.push({ state: { ...this._state }, version: this.version });
    if (this.history.length > this.options.historyLimit) {
      this.history.shift();
    }
  }

  private loadPersisted(): void {
    if (!this.options.persistKey) return;
    try {
      const raw = localStorage.getItem(this.options.persistKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          this._state = parsed.state as T;
          this.version = parsed.version ?? 0;
        }
      }
    } catch {}
  }

  private persist(): void {
    if (!this.options.persistKey) return;
    try {
      localStorage.setItem(this.options.persistKey, JSON.stringify({
        state: this._state,
        version: this.version,
      }));
    } catch {}
  }
}

// --- Deep Watcher ---

export interface WatchOptions {
  deep?: boolean;         // Deep comparison
  immediate?: boolean;   // Fire on first subscription
  equals?: (a: unknown, b: unknown) => boolean;
}

/** Watch a value for changes with deep comparison support */
export function watch<T>(
  getValue: () => T,
  onChange: (newVal: T, oldVal: T | undefined) => void,
  options: WatchOptions = {},
): Unsubscribe {
  let oldValue: T | undefined = options.immediate ? undefined : getValue();
  let running = false;

  const check = () => {
    if (running) return;
    const newValue = getValue();
    const equals = options.equals ?? ((a: unknown, b: unknown) => a === b);

    if (!equals(newValue, oldValue)) {
      oldValue = newValue;
      try { onChange(newValue, oldValue); } catch {}
    }
  };

  // Use MutationObserver-like polling for objects, requestAnimationFrame for frequent checks
  const poll = () => {
    check();
    if (typeof window !== "undefined") {
      requestAnimationFrame(poll);
    } else {
      setTimeout(poll, 100);
    }
  };

  if (typeof window !== "undefined") {
    const id = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(id);
  }

  const interval = setInterval(check, 100);
  return () => clearInterval(interval);
}
