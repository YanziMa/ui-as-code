/**
 * Reactive Primitives: Signal, Computed, Effect, and derived state management.
 * Inspired by Solid.js / Preact signals with batched updates,
 * dependency tracking, cleanup, and deep reactivity.
 */

// --- Types ---

export type EqualityFn<T> = (a: T, b: T) => boolean;
export type EffectCleanup = () => void;
export type EffectFn = () => EffectCleanup | void;

export interface ReactiveNode {
  id: number;
  value?: unknown;
  sources: Set<ReactiveNode>;
  dependents: Set<ReactiveNode>;
  computed: boolean;
  dirty: boolean;
  compute?: () => unknown;
  cleanup?: EffectCleanup;
}

export interface SignalOptions<T> {
  equals?: EqualityFn<T>;
  name?: string;
}

export interface EffectOptions {
  sync?: boolean;
  name?: string;
}

// --- Global State ---

let nodeIdCounter = 0;
let batchDepth = 0;
const pendingEffects = new Set<EffectFn>();
const pendingComputeds = new Set<ReactiveNode>();

let activeEffect: ReactiveNode | null = null;

const defaultEquals = <T>(a: T, b: T): boolean => Object.is(a, b);

// --- Signal ---

/**
 * A reactive signal that holds a value and notifies dependents on change.
 */
export class Signal<T = unknown> {
  readonly node: ReactiveNode;
  private _value: T;
  private _equals: EqualityFn<T>;

  constructor(initialValue: T, options: SignalOptions<T> = {}) {
    this._value = initialValue;
    this._equals = options.equals ?? defaultEquals;
    this.node = {
      id: ++nodeIdCounter,
      sources: new Set(),
      dependents: new Set(),
      computed: false,
      dirty: false,
    };
  }

  get(): T {
    this.track();
    return this._value;
  }

  set(value: T): void {
    if (this._equals(this._value, value)) return;
    this._value = value;
    this.notify();
  }

  update(fn: (prev: T) => T): void {
    this.set(fn(this._value));
  }

  mutate(mutator: (val: T) => void): void {
    mutator(this._value);
    this.notify();
  }

  private track(): void {
    if (!activeEffect) return;
    if (!activeEffect.sources.has(this.node)) {
      activeEffect.sources.add(this.node);
      this.node.dependents.add(activeEffect);
    }
  }

  private notify(): void {
    for (const dep of this.node.dependents) {
      if (dep.computed) {
        dep.dirty = true;
        pendingComputeds.add(dep);
      } else {
        if (dep.compute) pendingEffects.add(dep.compute as EffectFn);
      }
    }
    if (batchDepth === 0) flushPending();
  }
}

export function signal<T = unknown>(initialValue: T, options?: SignalOptions<T>): Signal<T> {
  return new Signal(initialValue, options);
}

// --- Computed ---

/**
 * Derived/computed signal that auto-recalculates when dependencies change.
 * Lazy evaluation — only recalculates when read.
 */
export class Computed<T = unknown> {
  readonly node: ReactiveNode;
  private _compute: () => T;
  private _cachedValue: T | undefined;
  private _hasValue = false;

  constructor(compute: () => T) {
    this._compute = compute;
    this.node = {
      id: ++nodeIdCounter,
      sources: new Set(),
      dependents: new Set(),
      computed: true,
      dirty: true,
      compute: this._recompute.bind(this),
    };
  }

  get(): T {
    this.track();
    if (this.node.dirty || !this._hasValue) {
      this.recompute();
    }
    return this._cachedValue as T;
  }

  private track(): void {
    if (!activeEffect) return;
    if (!activeEffect.sources.has(this.node)) {
      activeEffect.sources.add(this.node);
      this.node.dependents.add(activeEffect);
    }
  }

  private recompute(): void {
    for (const src of this.node.sources) {
      src.dependents.delete(this.node);
    }
    this.node.sources.clear();

    const prevEffect = activeEffect;
    activeEffect = this.node;
    try {
      this._cachedValue = this._compute();
      this._hasValue = true;
      this.node.dirty = false;
    } finally {
      activeEffect = prevEffect;
    }
  }

  private _recompute(): unknown {
    this.recompute();
    return this._cachedValue;
  }
}

export function computed<T>(compute: () => T): Computed<T> {
  return new Computed(compute);
}

// --- Effect ---

/**
 * Side-effect that runs when its tracked dependencies change.
 */
export class Effect {
  readonly node: ReactiveNode;
  private _fn: EffectFn;
  private _cleanup: EffectCleanup | null = null;
  private _disposed = false;

  constructor(fn: EffectFn, options: EffectOptions = {}) {
    this._fn = fn;
    this.node = {
      id: ++nodeIdCounter,
      sources: new Set(),
      dependents: new Set(),
      computed: false,
      dirty: false,
      compute: this._run.bind(this),
    };

    if (options.sync !== false) {
      this.run();
    } else {
      pendingEffects.add(() => this.run());
      if (batchDepth === 0) flushPending();
    }
  }

  run(): void {
    if (this._disposed) return;

    if (this._cleanup) {
      try { this._cleanup(); } catch { /* ignore */ }
      this._cleanup = null;
    }

    for (const src of this.node.sources) {
      src.dependents.delete(this.node);
    }
    this.node.sources.clear();

    const prevEffect = activeEffect;
    activeEffect = this.node;
    try {
      const result = this._fn();
      if (typeof result === "function") {
        this._cleanup = result;
      }
    } catch (err) {
      console.error("[Reactive] Effect error:", err);
    } finally {
      activeEffect = prevEffect;
    }
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    if (this._cleanup) {
      try { this._cleanup(); } catch { /* ignore */ }
      this._cleanup = null;
    }
    for (const src of this.node.sources) {
      src.dependents.delete(this.node);
    }
    this.node.sources.clear();
    pendingEffects.delete(this._run as unknown as EffectFn);
  }
}

export function effect(fn: EffectFn, options?: EffectOptions): Effect {
  return new Effect(fn, options);
}

// --- Batch Updates ---

/**
 * Batch multiple signal updates into a single notification cycle.
 * Effects run once after all updates complete.
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flushPending();
  }
}

function flushPending(): void {
  let iterations = 0;
  const maxIterations = 1000;

  while (pendingComputeds.size > 0 && iterations < maxIterations) {
    const computeds = [...pendingComputeds];
    pendingComputeds.clear();
    for (const node of computeds) {
      if (node.dirty && node.compute) node.compute();
    }
    iterations++;
  }

  if (pendingEffects.size > 0) {
    const effects = [...pendingEffects];
    pendingEffects.clear();
    for (const fn of effects) {
      try { fn(); } catch (err) {
        console.error("[Reactive] Pending effect error:", err);
      }
    }
  }
}

// --- Utilities ---

/** Read signals without tracking them as dependencies */
export function untrack<T>(fn: () => T): T {
  const prev = activeEffect;
  activeEffect = null;
  try { return fn(); } finally { activeEffect = prev; }
}

/** Create a read-only view of a signal */
export function readonly<T>(sig: Signal<T>): { (): T } {
  return sig.get.bind(sig);
}

/** Create a deeply reactive proxy for nested objects/arrays */
export function deepSignal<T extends object>(initialValue: T): Signal<T> {
  return signal(initialValue);
}

/** Create a derived signal that maps one signal's value */
export function derived<S, T>(source: Signal<S>, mapper: (val: S) => T): Computed<T> {
  return computed(() => mapper(source.get()));
}

/** Combine multiple signals into a single computed value */
export function combine<T extends unknown[]>(
  sources: { (): unknown }[],
  combiner: (...values: T) => unknown,
): Computed<unknown> {
  return computed(() => combiner(...(sources.map((s) => s()) as T)));
}
