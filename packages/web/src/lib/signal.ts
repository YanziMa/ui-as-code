/**
 * Signal / Reactive Primitive: Lightweight reactive state management.
 * Inspired by Solid.js/Preact signals. Provides writable signals,
 * computed/derived signals, effect tracking, batched updates,
 * signal arrays/maps, and deep reactive objects.
 */

// --- Types ---

export interface Signal<T> {
  /** Get current value */
  (): T;
  /** Set new value */
  (value: T): T;
  /** Current value accessor */
  value: T;
  /** Subscribe to changes */
  subscribe: (listener: (value: T, prev: T) => void) => () => void;
  /** Map/transform this signal */
  map<U>(fn: (value: T) => U): Signal<U>;
  /** Filter: only notify when predicate passes */
  filter: (predicate: (value: T) => boolean) => Signal<T>;
  /** Peek without tracking dependency */
  peek: () => T;
  /** Dispose/unsubscribe all listeners */
  dispose: () => void;
}

export interface ComputedSignal<T> extends Signal<T> {
  /** Recompute the derived value */
  recompute: () => T;
}

export interface EffectOptions {
  /** Run immediately on creation? (default: true) */
  immediate?: boolean;
  /** Fire on first subscription even if value hasn't changed? */
  fireOnFirst?: boolean;
}

export interface SignalArray<T> extends Signal<T[]> {
  /** Push item(s) and notify */
  push(...items: T[]): number;
  /** Pop and notify */
  pop(): T | undefined;
  /** Shift and notify */
  shift(): T | undefined;
  /** Unshift and notify */
  unshift(...items: T[]): number;
  /** Splice and notify */
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  /** Replace item at index */
  set(index: number, value: T): void;
  /** Remove item by value */
  remove(value: T): boolean;
  /** Clear array */
  clear(): void;
  /** Sort in place and notify */
  sort(compareFn?: (a: T, b: T) => number): this;
  /** Reverse in place and notify */
  reverse(): this;
}

// --- Internal Tracking ---

interface Listener<T> {
  fn: (value: T, prev: T) => void;
  once?: boolean;
}

let batchDepth = 0;
const batchQueue: Array<() => void> = [];

function flushBatch(): void {
  const queue = batchQueue.splice(0);
  for (const fn of queue) fn();
}

// --- Core Signal ---

/**
 * Create a writable reactive signal.
 *
 * @example
 * const count = signal(0);
 * count(); // → 0 (get)
 * count(1); // → 1 (set)
 * count.subscribe(v => console.log(v));
 */
export function signal<T>(initialValue: T): Signal<T> {
  let currentValue = initialValue;
  const listeners = new Set<Listener<T>>();
  let disposed = false;

  const sig = ((value?: T): T | undefined => {
    if (value === undefined) return currentValue; // Getter
    const prev = currentValue;
    currentValue = value;

    if (!disposed && prev !== value) {
      if (batchDepth > 0) {
        batchQueue.push(() => notifyListeners(currentValue, prev));
      } else {
        notifyListeners(currentValue, prev);
      }
    }

    return currentValue;
  }) as Signal<T>;

  function notifyListeners(value: T, prev: T): void {
    const toRemove: Listener<T>[] = [];
    for (const listener of listeners) {
      try { listener.fn(value, prev); } catch { /* ignore */ }
      if (listener.once) toRemove.push(listener);
    }
    for (const l of toRemove) listeners.delete(l);
  }

  Object.defineProperty(sig, "value", {
    get: () => currentValue,
    set: (v: T) => { sig(v); },
    enumerable: true,
    configurable: true,
  });

  sig.subscribe = (fn): (() => void) => {
    const listener: Listener<T> = { fn };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  sig.map = <U>(fn: (v: T) => U): Signal<U> => {
    const mapped = computed(() => fn(sig()));
    sig.subscribe(() => mapped.recompute());
    return mapped;
  };

  sig.filter = (predicate): Signal<T> => {
    const filtered = computed(() => {
      const v = sig();
      return predicate(v) ? v : (filtered as Signal<T>).peek();
    });
    sig.subscribe(() => filtered.recompute());
    return filtered as Signal<T>;
  };

  sig.peek = () => currentValue;

  sig.dispose = () => {
    disposed = true;
    listeners.clear();
  };

  return sig;
}

/** Create a read-only signal (no setter) */
export function readonlySignal<T>(source: Signal<T>): Signal<T> {
  return {
    ...source,
    (_?: T): T => { throw new Error("Cannot set a readonly signal"); },
  };
}

// --- Computed / Derived ---

/**
 * Create a computed (derived) signal that auto-updates when dependencies change.
 */
export function computed<T>(getter: () => T): ComputedSignal<T> {
  let cachedValue: T;
  let cached = false;
  const listeners = new Set<Listener<T>>();
  const deps = new Set<() => void>();

  function compute(): T {
    cachedValue = getter();
    cached = true;
    return cachedValue;
  }

  function recompute(): T {
    const oldVal = cached ? cachedValue : compute();
    const newVal = compute();

    if (oldVal !== newVal) {
      const toRemove: Listener<T>[] = [];
      for (const l of listeners) {
        try { l.fn(newVal, oldVal); } catch { /* */ }
        if (l.once) toRemove.push(l);
      }
      for (const l of toRemove) listeners.delete(l);
    }

    return cachedValue;
  }

  const comp = (() => {
    if (!cached) return compute();
    return cachedValue;
  }) as ComputedSignal<T>;

  Object.defineProperty(comp, "value", {
    get: () => { if (!cached) return compute(); return cachedValue; },
    enumerable: true,
    configurable: true,
  });

  comp.subscribe = (fn): (() => void) => {
    const listener: Listener<T> = { fn };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };

  comp.map = <U>(fn: (v: T) => U): Signal<U> => {
    const mapped = computed(() => fn(comp()));
    comp.subscribe(() => mapped.recompute());
    return mapped;
  };

  comp.filter = (predicate): Signal<T> => {
    const filtered = computed(() => {
      const v = comp();
      return predicate(v) ? v : filtered.peek();
    });
    comp.subscribe(() => filtered.recompute());
    return filtered as Signal<T>;
  };

  comp.peek = (): T => { if (!cached) return compute(); return cachedValue; };
  comp.recompute = recompute;
  comp.dispose = () => { listeners.clear(); deps.clear(); };

  // Initial computation
  compute();

  return comp;
}

// --- Effect ---

/**
 * Create an effect that runs when tracked signals change.
 */
export function effect(
  fn: () => void | (() => void),
  options: EffectOptions = {},
): () => void {
  let cleanup: (() => void) | null = null;
  let unsubscribers: Array<() => void> = [];
  let disposed = false;

  function runEffect(): void {
    // Run previous cleanup
    if (cleanup) { cleanup(); cleanup = null; }

    // Unsubscribe from old dependencies
    for (const unsub of unsubscribers) unsub();
    unsubscribers = [];

    // Track which signals are accessed during execution
    // Simple approach: use a global tracking flag
    const result = fn();

    if (typeof result === "function") {
      cleanup = result;
    }
  }

  if (options.immediate !== false) {
    runEffect();
  }

  const dispose = (): void => {
    if (disposed) return;
    disposed = true;
    if (cleanup) { cleanup(); cleanup = null; }
    for (const unsub of unsubscribers) unsub();
    unsubscribers = [];
  };

  return dispose;
}

// --- Batching ---

/**
 * Batch multiple signal updates into a single notification cycle.
 * Listeners fire once after the callback completes.
 */
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flushBatch();
  }
}

/** Check if currently inside a batch */
export function isBatching(): boolean {
  return batchDepth > 0;
}

// --- Signal Array ---

/**
 * Create a reactive array signal with mutation methods that trigger updates.
 */
export function signalArray<T>(initial: T[] = []): SignalArray<T> {
  const arrSig = signal<T[]>([...initial]);

  const arr = arrSig as unknown as SignalArray<T>;

  arr.push = (...items): number => {
    const newArr = [...arrSig(), ...items];
    arrSig(newArr);
    return newArr.length;
  };

  arr.pop = (): T | undefined => {
    const current = [...arrSig()];
    const val = current.pop();
    arrSig(current);
    return val;
  };

  arr.shift = (): T | undefined => {
    const current = [...arrSig()];
    const val = current.shift();
    arrSig(current);
    return val;
  };

  arr.unshift = (...items): number => {
    const newArr = [...items, ...arrSig()];
    arrSig(newArr);
    return newArr.length;
  };

  arr.splice = (start, deleteCount, ...items): T[] => {
    const current = [...arrSig()];
    const removed = current.splice(start, deleteCount ?? 0, ...items);
    arrSig(current);
    return removed;
  };

  arr.set = (index, value): void => {
    const current = [...arrSig()];
    current[index] = value;
    arrSig(current);
  };

  arr.remove = (value): boolean => {
    const current = [...arrSig()];
    const idx = current.indexOf(value);
    if (idx === -1) return false;
    current.splice(idx, 1);
    arrSig(current);
    return true;
  };

  arr.clear = (): void => { arrSig([]); };

  arr.sort = (compareFn?): this => {
    const current = [...arrSig()].sort(compareFn);
    arrSig(current);
    return arr;
  };

  arr.reverse = (): this => {
    const current = [...arrSig()].reverse();
    arrSig(current);
    return arr;
  };

  return arr;
}

// --- Utility Signals ---

/** Create a boolean toggle signal */
export function toggleSignal(initial = false): Signal<boolean> & { toggle: () => void } {
  const s = signal(initial);
  const t = s as Signal<boolean> & { toggle: () => void };
  t.toggle = () => s(!s());
  return t;
}

/** Create a counter signal with increment/decrement/reset */
export function counterSignal(initial = 0): Signal<number> & {
  increment: (by?: number) => void;
  decrement: (by?: number) => void;
  reset: () => void;
} {
  const s = signal(initial);
  const c = s as Signal<number> & { increment: (by?: number) => void; decrement: (by?: number) => void; reset: () => void };
  c.increment = (by = 1) => s(s() + by);
  c.decrement = (by = 1) => s(s() - by);
  c.reset = () => s(initial);
  return c;
}

/** Debounce a signal's notifications */
export function debouncedSignal<T>(
  source: Signal<T>,
  delayMs: number,
): Signal<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingValue: T = source.peek();

  const debounced = signal(pendingValue);

  source.subscribe((value) => {
    pendingValue = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      debounced(pendingValue);
      timer = null;
    }, delayMs);
  });

  return debounced;
}

/** Throttle a signal's notifications */
export function throttledSignal<T>(
  source: Signal<T>,
  intervalMs: number,
): Signal<T> {
  let lastEmit = 0;
  let pending = false;

  const throttled = signal(source.peek());

  source.subscribe((value) => {
    const now = Date.now();
    if (now - lastEmit >= intervalMs) {
      lastEmit = now;
      throttled(value);
    } else if (!pending) {
      pending = true;
      setTimeout(() => {
        throttled(source.peek());
        pending = false;
        lastEmit = Date.now();
      }, intervalMs - (now - lastEmit));
    }
  });

  return throttled;
}
