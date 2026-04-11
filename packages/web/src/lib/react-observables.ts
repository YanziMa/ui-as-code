/**
 * React Observables: Observable pattern implementation, subject,
 * operators (map, filter, debounce, throttle), React hooks bridge,
 * and event stream utilities for reactive data flow.
 */

// --- Types ---

export type UnsubscribeFn = () => void;
export type Observer<T> = (value: T) => void;
export type CompletionFn = () => void;
export type ErrorFn = (error: unknown) => void;

export interface SubscriptionObserver<T> {
  next: Observer<T>;
  error?: ErrorFn;
  complete?: CompletionFn;
}

// --- Observable Core ---

export class Observable<T> {
  private _subscribe: (observer: SubscriptionObserver<T>) => UnsubscribeFn | void;

  constructor(subscribe: (observer: SubscriptionObserver<T>) => UnsubscribeFn | void) {
    this._subscribe = subscribe;
  }

  /** Subscribe to the observable */
  subscribe(observer: SubscriptionObserver<T>): UnsubscribeFn {
    let unsubscribed = false;
    const cleanup = this._subscribe({
      next: (value) => { if (!unsubscribed) observer.next(value); },
      error: (err) => { if (!unsubscribed) observer.error?.(err); },
      complete: () => { if (!unsubscribed) observer.complete?.(); },
    });

    return (): void => {
      unsubscribed = true;
      cleanup?.();
    };
  }

  /** Map each emitted value through a function */
  map<U>(fn: (value: T) => U): Observable<U> {
    return new Observable<U>((obs) =>
      this.subscribe({ next: (v) => obs.next(fn(v)), error: obs.error, complete: obs.complete }),
    );
  }

  /** Filter values that don't pass the predicate */
  filter(predicate: (value: T) => boolean): Observable<T> {
    return new Observable<T>((obs) =>
      this.subscribe({
        next: (v) => { if (predicate(v)) obs.next(v); },
        error: obs.error,
        complete: obs.complete,
      }),
    );
  }

  /** Take only N values then complete */
  take(count: number): Observable<T> {
    let remaining = count;
    let unsub: UnsubscribeFn | null = null;
    return new Observable<T>((obs) => {
      unsub = this.subscribe({
        next: (v) => {
          if (remaining > 0) {
            remaining--;
            obs.next(v);
            if (remaining === 0) {
              obs.complete?.();
              unsub?.();
            }
          }
        },
        error: obs.error,
        complete: obs.complete,
      });
      return unsub!;
    });
  }

  /** Skip first N values */
  skip(count: number): Observable<T> {
    let skipped = 0;
    return new Observable<T>((obs) =>
      this.subscribe({
        next: (v) => {
          if (skipped >= count) obs.next(v);
          else skipped++;
        },
        error: obs.error,
        complete: obs.complete,
      }),
    );
  }

  /** Debounce emissions by delay ms */
  debounce(delayMs: number): Observable<T> {
    return new Observable<T>((obs) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let latestValue: T | undefined;

      const sub = this.subscribe({
        next: (v) => {
          latestValue = v;
          if (timer !== null) clearTimeout(timer);
          timer = setTimeout(() => {
            if (latestValue !== undefined) obs.next(latestValue);
            timer = null;
          }, delayMs);
        },
        error: obs.error,
        complete: () => {
          if (timer !== null) {
            clearTimeout(timer);
            if (latestValue !== undefined) obs.next(latestValue);
          }
          obs.complete?.();
        },
      });

      return (): void => {
        if (timer !== null) clearTimeout(timer);
        sub();
      };
    });
  }

  /** Throttle emissions to at most once per interval */
  throttle(intervalMs: number): Observable<T> {
    return new Observable<T>((obs) => {
      let lastEmit = 0;
      let pendingValue: T | undefined;
      let trailingTimer: ReturnType<typeof setTimeout> | null = null;

      const sub = this.subscribe({
        next: (v) => {
          const now = Date.now();
          if (now - lastEmit >= intervalMs) {
            lastEmit = now;
            obs.next(v);
          } else {
            pendingValue = v;
            if (!trailingTimer) {
              trailingTimer = setTimeout(() => {
                if (pendingValue !== undefined) {
                  lastEmit = Date.now();
                  obs.next(pendingValue);
                  pendingValue = undefined;
                }
                trailingTimer = null;
              }, intervalMs - (now - lastEmit));
            }
          }
        },
        error: obs.error,
        complete: obs.complete,
      });

      return (): void => {
        if (trailingTimer) clearTimeout(trailingTimer);
        sub();
      };
    });
  }

  /** Transform to a Promise of the next value */
  toPromise(): Promise<T> {
    return new Promise((resolve, reject) => {
      let done = false;
      this.subscribe({
        next: (v) => { if (!done) { done = true; resolve(v); } },
        error: (e) => { if (!done) { done = true; reject(e); } },
        complete: () => { if (!done) reject(new Error("Observable completed without value")); },
      });
    });
  }

  /** Collect all values into an array (for observables that complete) */
  toArray(): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const arr: T[] = [];
      this.subscribe({
        next: (v) => arr.push(v),
        error: reject,
        complete: () => resolve(arr),
      });
    });
  }

  // --- Static Creators ---

  /** Create an observable from a single value */
  static of<U>(...values: U[]): Observable<U> {
    return new Observable<U>((obs) => {
      for (const v of values) obs.next(v);
      obs.complete?.();
    });
  }

  /** Create an observable from an iterable/async-iterable */
  static from<U>(iterable: Iterable<U> | AsyncIterable<U>): Observable<U> {
    return new Observable<U>(async (obs) => {
      try {
        for await (const v of iterable) obs.next(v);
        obs.complete?.();
      } catch (e) {
        obs.error?.(e);
      }
    });
  }

  /** Create an observable that never emits */
  static never<U>(): Observable<U> {
    return new Observable<U>(() => {});
  }

  /** Create an observable that errors immediately */
  static throw<U>(error: unknown): Observable<U> {
    return new Observable<U>((obs) => obs.error?.(error));
  }
}

// --- Subject (Multicast Observable) ---

/** An observable you can push values into manually */
export class Subject<T> extends Observable<T> {
  private observers = new Set<SubscriptionObserver<T>>();
  private _closed = false;

  constructor() {
    super((observer) => {
      this.observers.add(observer);
      return (): void => { this.observers.delete(observer); };
    });
  }

  /** Push a new value to all subscribers */
  next(value: T): void {
    if (this._closed) return;
    for (const obs of this.observers) obs.next(value);
  }

  /** Push an error to all subscribers */
  error(err: unknown): void {
    if (this._closed) return;
    for (const obs of this.observers) obs.error?.(err);
    this.close();
  }

  /** Complete the subject */
  complete(): void {
    if (this._closed) return;
    for (const obs of this.observers) obs.complete?.();
    this.close();
  }

  get closed(): boolean { return this._closed; }

  get observerCount(): number { return this.observers.size; }

  private close(): void {
    this._closed = true;
    this.observers.clear();
  }
}

/** BehaviorSubject: always has a current value */
export class BehaviorSubject<T> extends Subject<T> {
  private _value: T;

  constructor(initialValue: T) {
    super();
    this._value = initialValue;
  }

  override next(value: T): void {
    this._value = value;
    super.next(value);
  }

  get value(): T { return this._value; }
}

/** ReplaySubject: replays last N values to new subscribers */
export class ReplaySubject<T> extends Subject<T> {
  private buffer: T[] = [];
  private readonly bufferSize: number;

  constructor(bufferSize = 10) {
    super();
    this.bufferSize = bufferSize;
  }

  override subscribe(observer: SubscriptionObserver<T>): UnsubscribeFn {
    // Replay buffered values
    for (const v of this.buffer) observer.next(v);
    return super.subscribe(observer);
  }

  override next(value: T): void {
    this.buffer.push(value);
    if (this.buffer.length > this.bufferSize) this.buffer.shift();
    super.next(value);
  }
}

// --- Utility Functions ---

/** Create an observable from DOM events */
export function fromEvent<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  eventType: K,
): Observable<HTMLElementEventMap[K]> {
  return new Observable<HTMLElementEventMap[K]>((obs) => {
    const handler = (e: Event) => obs.next(e as HTMLElementEventMap[K]);
    target.addEventListener(eventType, handler as EventListener);
    return (): void => target.removeEventListener(eventType, handler as EventListener);
  });
}

/** Create an observable from a Promise */
export function fromPromise<T>(promise: Promise<T>): Observable<T> {
  return new Observable<T>((obs) => {
    let settled = false;
    promise.then(
      (v) => { if (!settled) { settled = true; obs.next(v); obs.complete?.(); } },
      (e) => { if (!settled) { settled = true; obs.error?.(e); } },
    );
  });
}

/** Create an observable from an interval */
export function interval(ms: number): Observable<number> {
  let counter = 0;
  return new Observable<number>((obs) => {
    const id = setInterval(() => obs.next(counter++), ms);
    return (): void => clearInterval(id);
  });
}

/** Create an observable that emits after a delay */
export function timer(delayMs: number, value?: number): Observable<number> {
  return new Observable<number>((obs) => {
    const id = setTimeout(() => {
      obs.next(value ?? 0);
      obs.complete?.();
    }, delayMs);
    return (): void => clearTimeout(id);
  });
}

/** Combine multiple observables — emit when any emits (merge) */
export function merge<T>(...observables: Observable<T>[]): Observable<T> {
  return new Observable<T>((obs) => {
    const subs = observables.map((o) => o.subscribe(obs));
    return (): void => subs.forEach((s) => s());
  });
}

/** Combine latest values from multiple observables */
export function combineLatest<T extends readonly unknown[]>(
  ...observables: { [K in keyof T]: Observable<T[K]> }
): Observable<T> {
  return new Observable<T>((obs) => {
    const values = new Array(observables.length).fill(undefined) as unknown as T;
    const completed = new Array(observables.length).fill(false);
    let hasAllInitial = false;

    const subs = observables.map((o, i) =>
      o.subscribe({
        next: (v) => {
          values[i] = v as T[keyof T & number];
          if (values.every((val) => val !== undefined)) {
            hasAllInitial = true;
            obs.next([...values] as T);
          }
        },
        complete: () => {
          completed[i] = true;
          if (completed.every(Boolean)) obs.complete?.();
        },
      }),
    );

    return (): void => subs.forEach((s) => s());
  });
}
