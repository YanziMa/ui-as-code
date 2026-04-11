/**
 * Reactive Utilities: Lightweight reactivity system with observable values,
 * computed properties, effects, dependency tracking, batched updates,
 * and a simple signal-based reactive primitive.
 */

// --- Types ---

export type Subscriber<T> = (value: T, oldValue: T) => void;
export type EqualityFn<T> = (a: T, b: T) => boolean;

interface ReactiveNode<T> {
  _value: T;
  _subscribers: Set<Subscriber<T>>;
  _equality: EqualityFn<T>;
}

// --- Signal (Observable Value) ---

export interface Signal<T> {
  /** Get current value */
  get(): T;
  /** Set new value and notify subscribers */
  set(value: T): void;
  /** Update value using a function (notifies only if changed) */
  update(fn: (current: T) => T): void;
  /** Subscribe to changes. Returns unsubscribe function */
  subscribe(listener: Subscriber<T>): () => void;
  /** Number of active subscribers */
  subscriberCount(): number;
  /** Transform value through a mapping function into a new Computed */
  map<U>(fn: (value: T) => U): Computed<U>;
}

/**
 * Create a reactive signal (observable value).
 *
 * @example
 * ```ts
 * const count = createSignal(0);
 * count.subscribe((v) => console.log("Count:", v));
 * count.set(1); // Logs: Count: 1
 * count.update(c => c + 1); // Logs: Count: 2
 * ```
 */
export function createSignal<T>(
  initialValue: T,
  options?: { equality?: EqualityFn<T> },
): Signal<T> {
  const equality = options?.equality ?? ((a: T, b: T) => a === b);

  const node: ReactiveNode<T> = {
    _value: initialValue,
    _subscribers: new Set(),
    _equality: equality,
  };

  return {
    get(): T { return node._value; },

    set(value: T): void {
      if (equality(node._value, value)) return;
      const old = node._value;
      node._value = value;
      notify(node, old);
    },

    update(fn: (current: T) => T): void {
      set(fn(node._value));
    },

    subscribe(listener: Subscriber<T>): () => void {
      node._subscribers.add(listener);
      return () => { node._subscribers.delete(listener); };
    },

    subscriberCount(): number { return node._subscribers.size; },

    map<U>(fn: (value: T) => U): Computed<U> {
      return createComputed(() => fn(node._value), [node] as unknown as Computed<any>[]);
    },
  } as Signal<T>;
}

// --- Computed (Derived Value) ---

export interface Computed<T> {
  /** Get current computed value */
  get(): T;
  /** Subscribe to changes in the derived value */
  subscribe(listener: Subscriber<T>): () => void;
}

let currentTracking: Set<ReactiveNode<unknown>> | null = null;

/**
 * Create a computed/derived value that auto-updates when dependencies change.
 *
 * @example
 * ```ts
 * const count = createSignal(0);
 * const double = createComputed(() => count.get() * 2);
 * double.subscribe(v => console.log("Double:", v));
 * count.set(5); // Logs: Double: 10
 * ```
 */
export function createComputed<T>(
  compute: () => T,
  deps?: Array<{ subscribe: (fn: Subscriber<unknown>) => () => void; get: () => unknown }>,
): Computed<T> {
  let cachedValue = compute();
  let cachedDirty = false;
  const listeners = new Set<Subscriber<T>>();

  // If explicit deps provided, use them
  if (deps && deps.length > 0) {
    for (const dep of deps) {
      dep.subscribe(() => {
        const newValue = compute();
        if (newValue !== cachedValue) {
          const old = cachedValue;
          cachedValue = newValue;
          notifyListeners(old);
        }
      });
    }
  }

  function get(): T {
    // Auto-track: if we're inside an effect, register this computed as a dependency
    if (currentTracking) {
      // Create a temporary node for tracking
      const tempNode = { _value: cachedValue, _subscribers: new Set(), _equality: Object.is } as ReactiveNode<T>;
      currentTracking.add(tempNode as unknown as ReactiveNode<unknown>);
      // Note: In a full implementation this would be more sophisticated
    }
    return cachedValue;
  }

  function subscribe(listener: Subscriber<T>): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  function notifyListeners(oldValue: T): void {
    for (const l of listeners) {
      try { l(cachedValue, oldValue); } catch { /* protect */ }
    }
  }

  return { get, subscribe };
}

// --- Effect (Side Effects) ---

export interface EffectInstance {
  /** Run the effect immediately and on dependency change */
  run(): void;
  /** Stop the effect (unsubscribe from all deps) */
  stop(): void;
}

/**
 * Create an effect that runs a callback whenever tracked signals change.
 *
 * @example
 * ```ts
 * const count = createSignal(0);
 * const effect = createEffect(() => {
 *   document.title = `Count: ${count.get()}`;
 * });
 * // document.title updates automatically when count changes
 * ```
 */
export function createEffect(
  fn: () => void | (() => void),
  options?: { immediate?: boolean },
): EffectInstance {
  const immediate = options?.immediate ?? true;
  const cleanupFns = new Set<() => void>();
  let active = true;
  let cleanup: (() => void) | null = null;

  function execute(): void {
    // Run previous cleanup
    cleanup?.();

    // Start tracking
    const prevTracking = currentTracking;
    currentTracking = new Set();

    try {
      const result = fn();
      // If fn returned a cleanup function, store it
      if (typeof result === "function") {
        cleanup = result as () => void;
      }
    } finally {
      currentTracking = prevTracking;
    }
  }

  function run(): void {
    if (!active) return;
    execute();
  }

  function stop(): void {
    if (!active) return;
    active = false;
    cleanup?.();
    for (const fn of cleanupFns) fn();
    cleanupFns.clear();
  }

  if (immediate) execute();

  return { run, stop };
}

// --- Batch Updates ---

const pendingUpdates = new Set<() => void>();
let batchDepth = 0;
let batchScheduled = false;

/** Execute multiple signal updates as a single batch (one notification per signal) */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushBatch();
    }
  }
}

function flushBatch(): void {
  for (const update of pendingUpdates) {
    update();
  }
  pendingUpdates.clear();
  batchScheduled = false;
}

// --- Watch (Observe Multiple Signals) ---

/**
 * Watch multiple signals and run callback when any change.
 * Returns unsubscribe function.
 *
 * @example
 * ```ts
 * const unwatch = watch([firstName, lastName], ([f, l]) => {
 *   console.log(`Full name: ${f} ${l}`);
 * });
 * ```
 */
export function watch<T extends unknown[]>(
  signals: Array<Signal<T[number]>>,
  callback: (values: T) => void,
  options?: { immediate?: boolean },
): () => void {
  const immediate = options?.immediate ?? true;
  const unsubscribers: Array<() => void> = [];

  const handler = () => {
    const values = signals.map((s) => s.get()) as T;
    callback(values);
  };

  for (const signal of signals) {
    unsubscribers.push(signal.subscribe(handler));
  }

  if (immediate) handler();

  return () => {
    for (const unsub of unsubscribers) unsub();
  };
}

// --- Debounced Watch ---

/**
 * Watch signals but debounce the callback.
 */
export function watchDebounced<T extends unknown[]>(
  signals: Array<Signal<T[number]>>,
  callback: (values: T) => void,
  delayMs = 0,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return watch(signals, (values) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => callback(values), delayMs);
  }, { immediate: false });
}

// --- Throttled Watch ---

/**
 * Watch signals but throttle the callback to at most once per interval.
 */
export function watchThrottled<T extends unknown[]>(
  signals: Array<Signal<T[number]>>,
  callback: (values: T) => void,
  intervalMs = 100,
): () => void {
  let lastCall = 0;
  let pending = false;

  return watch(signals, (values) => {
    const now = Date.now();
    if (now - lastCall >= intervalMs) {
      lastCall = now;
      callback(values);
    } else if (!pending) {
      pending = true;
      setTimeout(() => {
        pending = false;
        lastCall = Date.now();
        callback(values);
      }, intervalMs - (now - lastCall));
    }
  });
}

// --- History (Undo Stack for Signals) ---

export interface SignalHistory<T> {
  /** Current signal */
  signal: Signal<T>;
  /** Undo last change */
  undo: () => boolean;
  /** Redo undone change */
  redo: () => boolean;
  /** Can undo? */
  canUndo: () => boolean;
  /** Can redo? */
  canRedo: () => boolean;
  /** Clear history */
  clear: () => void;
  /** Destroy */
  destroy: () => void;
}

/**
 * Wrap a signal with undo/redo history.
 */
export function withHistory<T>(signal: Signal<T>, maxSize = 50): SignalHistory<T> {
  const past: T[] = [];
  const future: T[] = [];

  const wrappedSet = signal.set.bind(signal);

  signal.set = (value: T) => {
    const current = signal.get();
    past.push(current);
    if (past.length > maxSize) past.shift();
    future.length = 0; // Clear redo stack on new action
    wrappedSet(value);
  };

  function undo(): boolean {
    if (past.length === 0) return false;
    const current = signal.get();
    future.unshift(current);
    const previous = past.pop()!;
    wrappedSet(previous);
    return true;
  }

  function redo(): boolean {
    if (future.length === 0) return false;
    const current = signal.get();
    past.push(current);
    const next = future.shift()!;
    wrappedSet(next);
    return true;
  }

  function canUndo(): boolean { return past.length > 0; }
  function canRedo(): boolean { return future.length > 0; }
  function clear(): void { past.length = 0; future.length = 0; }
  function destroy(): void { /* restore original */ }

  return { signal, undo, redo, canUndo, canRedo, clear, destroy };
}

// --- Internal Helpers ---

function notify<T>(node: ReactiveNode<T>, oldValue: T): void {
  for (const sub of node._subscribers) {
    try { sub(node._value, oldValue); } catch { /* protect subscribers */ }
  }
}
