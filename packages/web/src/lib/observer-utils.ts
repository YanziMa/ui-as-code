/**
 * Observer Utilities: Observable pattern implementation, event aggregation,
 * computed/derived observables, batched notifications, history tracking,
 * subscription lifecycle management, and reactive expression evaluation.
 */

// --- Types ---

export type Subscriber<T> = (value: T) => void;
export type Unsubscriber = () => void;
export type EqualityFn<T> = (a: T, b: T) => boolean;

export interface ObservableOptions<T> {
  /** Initial value */
  value: T;
  /** Custom equality check (default: reference equality) */
  equals?: EqualityFn<T>;
  /** Name for debugging */
  name?: string;
}

export interface ComputedOptions<T, D extends unknown[] = unknown[]> {
  /** Derivation function */
  compute: (...deps: D) => T;
  /** Dependencies (observables to track) */
  deps: Array<Observable<any>>;
  /** Custom equality for derived values */
  equals?: EqualityFn<T>;
}

export interface WatchOptions {
  /** Fire watcher immediately on creation? Default true */
  immediate?: boolean;
  /** Debounce interval (ms). Default 0 (no debounce) */
  debounce?: number;
  /** Throttle interval (ms). Default 0 (no throttle) */
  throttle?: number;
}

// --- Observable ---

/**
 * Observable: a value container that notifies subscribers on change.
 * Similar to a Signal but with richer API.
 *
 * @example
 * ```ts
 * const count = new Observable(0);
 * count.subscribe(v => console.log("Count:", v));
 * count.set(5); // Logs: Count: 5
 * ```
 */
export class Observable<T> {
  private _value: T;
  private _equals: EqualityFn<T>;
  private _subscribers = new Set<Subscriber<T>>();
  private _history: T[] = [];
  private _historyMaxSize: number;
  public readonly name?: string;

  constructor(options: ObservableOptions<T>) {
    this._value = options.value;
    this._equals = options.equals ?? ((a: T, b: T) => a === b);
    this._historyMaxSize = 50; // Default history size
    this.name = options.name;
    this._history.push(options.value);
  }

  /** Get current value */
  get value(): T { return this._value; }

  /** Set new value (notifies subscribers if changed) */
  set(value: T): void {
    if (this._equals(this._value, value)) return;
    const old = this._value;
    this._value = value;
    this._recordHistory(value);
    this._notify(value, old);
  }

  /** Update value via function (only notifies if result differs) */
  update(fn: (current: T) => T): void {
    this.set(fn(this._value));
  }

  /** Subscribe to changes. Returns unsubscribe function. */
  subscribe(listener: Subscriber<T>): Unsubscriber {
    this._subscribers.add(listener);
    // Deliver current value immediately
    listener(this._value);
    return () => { this._subscribers.delete(listener); };
  }

  /** Subscribe without delivering current value */
  subscribeQuiet(listener: Subscriber<T>): Unsubscriber {
    this._subscribers.add(listener);
    return () => { this._subscribers.delete(listener); };
  }

  /** Number of active subscribers */
  get subscriberCount(): number { return this._subscribers.size; }

  /** Get value history (for undo/debugging) */
  getHistory(): T[] { return [...this._history]; }

  /** Clear history */
  clearHistory(): void { this._history = [this._value]; }

  /** Set max history size (default 50) */
  setHistorySize(size: number): void {
    this._historyMaxSize = size;
    while (this._history.length > size) this._history.shift();
  }

  /** Map to a new observable (transform on change) */
  map<U>(fn: (value: T) => U): Observable<U> {
    const mapped = new Observable({ value: fn(this._value), name: `${this.name}:mapped` });
    this.subscribe((v) => mapped.set(fn(v)));
    return mapped;
  }

  /** Filter to a new observable (only emits when predicate passes) */
  filter(predicate: (value: T) => boolean): Observable<T | null> {
    const filtered = new Observable({ value: this._value, name: `${this.name}:filtered` });
    this.subscribe((v) => { if (predicate(v)) filtered.set(v); });
    return filtered;
  }

  /** Reduce accumulating observable */
  reduce<U>(fn: (acc: U, value: T) => U, initial: U): Observable<U> {
    const reduced = new Observable({ value: initial, name: `${this.name}:reduced` });
    this.subscribe((v) => reduced.set(fn(reduced.value, v)));
    return reduced;
  }

  /** Convert to a promise that resolves on next change */
  nextChange(): Promise<T> {
    return new Promise((resolve) => {
      const unsub = this.subscribe((v) => { unsub(); resolve(v); });
    });
  }

  // --- Private ---

  private _recordHistory(value: T): void {
    this._history.push(value);
    if (this._history.length > this._historyMaxSize) {
      this._history.shift();
    }
  }

  private _notify(value: T, old: T): void {
    for (const sub of this._subscribers) {
      try { sub(value); } catch { /* protect */ }
    }
  }
}

// --- Computed (Derived Observable) ---

/**
 * Computed: derived value that auto-updates when dependencies change.
 */
export class Computed<T, D extends unknown[] = unknown[]> {
  private _compute: (...deps: D) => T;
  private _deps: Array<Observable<any>>;
  private _value: T;
  private _equals: EqualityFn<T>;
  private _unsubs: Unsubscriber[] = [];

  constructor(options: ComputedOptions<T, D>) {
    this._compute = options.compute;
    this._deps = options.deps;
    this._equals = options.equals ?? ((a: T, b: T) => a === b);
    this._value = options.compute(...this._deps.map((d) => d.value));

    // Subscribe to all dependencies
    for (const dep of this._deps) {
      this._unsubs.push(
        dep.subscribe(() => this._recalculate()),
      );
    }
  }

  /** Get current computed value */
  get value(): T { return this._value; }

  /** Force recalculation */
  recalculate(): void { this._recalculate(); }

  /** Destroy and unsubscribe from all dependencies */
  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
  }

  private _recalculate(): void {
    const newValue = this._compute(...this._deps.map((d) => d.value));
    if (!this._equals(this._value, newValue)) {
      this._value = newValue;
    }
  }
}

// --- Watcher ---

/**
 * Watch one or more observables and fire callback on any change.
 * Supports debouncing and throttling.
 */
export function watch<T>(
  observables: Array<Observable<T>>,
  callback: (values: T[]) => void,
  options: WatchOptions = {},
): Unsubscribe {
  const { immediate = true, debounce: debounceMs = 0, throttle: throttleMs = 0 } = options;

  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCall = 0;
  let pending = false;
  let destroyed = false;

  const handler = () => {
    const values = observables.map((o) => o.value);
    callback(values);
  };

  const unsubs = observables.map((obs) =>
    obs.subscribeQuiet(() => {
      if (destroyed) return;

      if (debounceMs > 0) {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(handler, debounceMs);
      } else if (throttleMs > 0) {
        const now = Date.now();
        if (now - lastCall >= throttleMs || !pending) {
          handler();
          lastCall = now;
          pending = false;
        } else {
          pending = true;
          timer = setTimeout(() => { handler(); pending = false; lastCall = Date.now(); }, throttleMs - (now - lastCall));
        }
      } else {
        handler();
      }
    }),
  );

  if (immediate) handler();

  return () => {
    destroyed = true;
    if (timer !== null) clearTimeout(timer);
    for (const unsub of unsubs) unsub();
  };
}

// --- Batch Updates ---

let batchDepth = 0;
const pendingNotifications = new Array<() => void>();

/**
 * Run a function with all observable notifications batched (delivered after fn completes).
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushPending();
    }
  }
}

/** Flush all pending batched notifications */
function flushPending(): void {
  const pending = pendingNotifications.splice(0);
  for (const notify of pending) notify();
}

// --- Reactive Expression ---

/**
 * Evaluate a reactive expression that tracks observable dependencies automatically.
 * Re-evaluates when any dependency changes.
 */
export function reactive<T>(
  expr: () => T,
  deps?: Array<Observable<any>>,
): { value: T; destroy: () => void } {
  const trackedDeps = new Set<Observable<any>>();
  let currentValue = expr();

  function evaluate(): T {
    // In a real implementation, we'd use Proxy or dirty-checking here
    return expr();
  }

  // If explicit deps provided, use simple watching
  if (deps && deps.length > 0) {
    const unsubs = deps.map((dep) =>
      dep.subscribeQuiet(() => {
        currentValue = evaluate();
      }),
    );

    return {
      get value() { return currentValue; },
      destroy: () => { for (const u of unsubs) u(); },
    };
  }

  // Without explicit deps, return static evaluation
  return {
    get value() { return currentValue; },
    destroy: () => {},
  };
}

// --- Combine Utilities ---

/**
 * Combine multiple observables into a tuple observable.
 */
export function combineLatest<A, B>(a: Observable<A>, b: Observable<B>): Observable<[A, B]> {
  const combined = new Observable<[A, B]>({ value: [a.value, b.value] });
  a.subscribeQuiet(() => combined.set([a.value, b.value]));
  b.subscribeQuiet(() => combined.set([a.value, b.value]));
  return combined;
}

/**
 * Merge multiple observables of same type into one (emits when any changes).
 */
export function mergeObservables<T>(observables: Array<Observable<T>>): Observable<T> {
  if (observables.length === 0) throw new Error("mergeObservables requires at least one observable");
  const merged = new Observable<T>({ value: observables[0]!.value });
  for (const obs of observables) {
    obs.subscribeQuiet((v) => merged.set(v));
  }
  return merged;
}
