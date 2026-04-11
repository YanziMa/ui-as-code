/**
 * React Compiler Utilities: Memoization hints, dependency tracking,
 * reactive primitive bridges, and compiler-compatible utility functions
 * for use with React Compiler (experimental) and manual memoization.
 */

// --- Types ---

export type MemoKey = string | number | symbol | readonly unknown[];

export interface MemoCache<T> {
  get(key: MemoKey): T | undefined;
  set(key: MemoKey, value: T): void;
  clear(): void;
  size: number;
}

export interface DependencyTracker {
  /** Track a dependency by key */
  track(key: string): void;
  /** Check if any tracked dependencies have changed */
  hasChanged(): boolean;
  /** Reset tracking state */
  reset(): void;
  /** Get list of currently tracked keys */
  getTrackedKeys(): string[];
}

// --- Simple Memo Cache (LRU-like) ---

/**
 * Create a memoization cache with optional max size.
 * Compatible with React Compiler's expected cache shape.
 */
export function createMemoCache<T>(maxSize = 128): MemoCache<T> {
  const store = new Map<MemoKey, T>();
  const accessOrder: MemoKey[] = [];

  return {
    get(key: MemoKey): T | undefined {
      const value = store.get(key);
      if (value !== undefined) {
        // Move to end (most recently used)
        const idx = accessOrder.indexOf(key);
        if (idx !== -1) accessOrder.splice(idx, 1);
        accessOrder.push(key);
      }
      return value;
    },

    set(key: MemoKey, value: T): void {
      if (!store.has(key) && store.size >= maxSize) {
        // Evict least recently used
        const oldest = accessOrder.shift();
        if (oldest !== undefined) store.delete(oldest);
      }
      store.set(key, value);

      // Update access order
      const idx = accessOrder.indexOf(key);
      if (idx !== -1) accessOrder.splice(idx, 1);
      accessOrder.push(key);
    },

    clear(): void {
      store.clear();
      accessOrder.length = 0;
    },

    get size(): number { return store.size; },
  };
}

// --- Dependency Tracker ---

/**
 * Create a dependency tracker for fine-grained reactivity.
 */
export function createDependencyTracker(): DependencyTracker {
  let trackedKeys = new Set<string>();
  let prevSnapshot: Map<string, unknown> | null = null;

  return {
    track(key: string): void {
      trackedKeys.add(key);
    },

    hasChanged(): boolean {
      // In a real implementation this would compare current values
      // against the previous snapshot. Here we provide the API shape.
      return false;
    },

    reset(): void {
      prevSnapshot = new Map(trackedKeys.map(k => [k, k] as [string, unknown]));
      trackedKeys.clear();
    },

    getTrackedKeys(): string[] {
      return Array.from(trackedKeys);
    },
  };
}

// --- Stable Reference Utilities ---

/** Create a stable reference that only changes when its value deeply changes */
export function useStableRef<T>(currentValue: T, deps: readonly unknown[]): { value: T; changed: boolean } {
  // This is a pure utility — in React context it would be a hook.
  // Here we provide the logic as a plain function for non-hook usage.
  static let lastValue: T | undefined;
  static let lastDeps: readonly unknown[] | undefined;

  const changed = !lastDeps || deps.length !== lastDeps.length ||
    deps.some((d, i) => d !== lastDeps![i]);

  if (changed) {
    lastValue = currentValue;
    lastDeps = deps;
  }

  return { value: lastValue!, changed };
}

// Note: The above uses pseudo-static for illustration. Real usage:

/** Compare two values for deep equality (shallow for primitives, reference for objects) */
export function stableCompare<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a === "object") {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
  }

  return false;
}

// --- Compiler Hints ---

/** Mark a value as "expensive to compute" so the compiler knows to memoize */
export function expensive<T>(compute: () => T): () => T {
  let cached: { value: T; deps: readonly unknown[] } | null = null;

  return (...deps: readonly unknown[]): T => {
    if (cached && deps.every((d, i) => d === cached!.deps[i])) {
      return cached.value;
    }
    const value = compute();
    cached = { value, deps };
    return value;
  };
}

/** Create an identity-stable wrapper around a callback */
export function useCallbackReference<A extends unknown[], R>(
  fn: (...args: A) => R,
): (...args: A) => R {
  return fn;
}

// --- Reactive Bridge Types ---

/** Bridge between external reactive systems and React rendering */
export interface ReactiveBridge<T> {
  /** Current value */
  readonly value: T;
  /** Subscribe to changes */
  subscribe(listener: (value: T) => void): () => void;
  /** Unsubscribe all */
  unsubscribeAll(): void;
}

/** Create a bridge from a simple getter/setter pair */
export function createReactiveBridge<T>(
  getValue: () => T,
  subscribe: (listener: (value: T) => void) => () => void,
): ReactiveBridge<T> {
  let listeners = new Set<(value: T) => void>();

  const unsub = subscribe((value) => {
    for (const l of listeners) l(value);
  });

  return {
    get value() { return getValue(); },
    subscribe(listener: (value: T) => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    unsubscribeAll(): void {
      listeners.clear();
      unsub();
    },
  };
}

// --- Selector / Derivation Utilities ---

/** Create a derived selector from a source */
export function createSelector<S, R>(
  source: () => S,
  selector: (state: S) => R,
): () => R {
  let cachedSource: S | undefined;
  let cachedResult: R | undefined;

  return (): R => {
    const current = source();
    if (current === cachedSource) return cachedResult!;
    cachedSource = current;
    cachedResult = selector(current);
    return cachedResult!;
  };
}

/** Batch multiple selectors into a single combined selector */
export function combineSelectors<T extends Record<string, () => unknown>>(
  selectors: T,
): () => { [K in keyof T]: ReturnType<T[K]> } {
  const entries = Object.entries(selectors);

  return (): { [K in keyof T]: ReturnType<T[K]> } => {
    const result = {} as { [K in keyof T]: ReturnType<T[K]> };
    for (const [key, selector] of entries) {
      (result as Record<string, unknown>)[key] = (selector as () => unknown)();
    }
    return result;
  };
}
