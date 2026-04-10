/**
 * Observer pattern implementation.
 */

export type Unsubscribe = () => void;
export type SubscriberFn<T> = (value: T) => void;

/**
 * Simple observable that supports subscription/unsubscription.
 * Values are pushed to subscribers via the `next()` method.
 */
export class Observable<T> {
  private subscribers = new Set<SubscriberFn<T>>();

  /** Subscribe to value changes */
  subscribe(fn: SubscriberFn<T>): Unsubscribe {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  /** Push a new value to all subscribers */
  next(value: T): void {
    for (const fn of this.subscribers) {
      try { fn(value); } catch (err) {
        console.error("[Observable] Subscriber error:", err);
      }
    }
  }

  /** Get current subscriber count */
  get size(): number {
    return this.subscribers.size;
  }

  /** Unsubscribe all */
  complete(): void {
    this.subscribers.clear();
  }
}

/**
 * Computed value that caches its result and notifies observers on change.
 */
export class Computed<T> {
  private _value: T;
  private observable: Observable<T>;
  private _compute: () => T;

  constructor(compute: () => T) {
    this._compute = compute;
    this._value = compute();
    this.observable = new Observable<T>();
  }

  /** Get current cached value */
  get value(): T {
    return this._value;
  }

  /** Subscribe to changes */
  onChange(fn: SubscriberFn<T>): Unsubscribe {
    return this.observable.subscribe(fn);
  }

  /** Recompute and notify if changed */
  invalidate(): void {
    const newValue = this._compute();
    if (newValue !== this._value) {
      this._value = newValue;
      this.observable.next(newValue);
    }
  }

  /** Force-set value and notify */
  set(value: T): void {
    this._value = value;
    this.observable.next(value);
  }
}

/**
 * Store with change notification via observables.
 */
export class ReactiveStore<T> {
  private state: T;
  private readonly observable: Observable<T>;

  constructor(initialState: T) {
    this.state = initialState;
    this.observable = new Observable<T>();
  }

  /** Get current state */
  get(): T {
    return this.state;
  }

  /** Subscribe to any state changes */
  subscribe(fn: SubscriberFn<T>): Unsubscribe {
    return this.observable.subscribe(fn);
  }

  /** Update state and notify subscribers */
  set(partial: Partial<T> | ((prev: T) => T)): void {
    const newState =
      typeof partial === "function"
        ? (partial as (prev: T) => T)(this.state)
        : { ...this.state, ...partial };
    this.state = newState;
    this.observable.next(newState);
  }

  /** Update state via mutator function */
  update(mutator: (state: T) => void): void {
    mutator(this.state);
    this.observable.next(this.state);
  }
}
