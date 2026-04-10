/**
 * Stream / Observable Pipeline: Lazy, composable data streams with
 * push-based operators (map, filter, reduce, debounce, throttle, etc.),
 * backpressure handling, error recovery, lifecycle hooks, and
 * multicasting support.
 */

// --- Types ---

export type StreamSubscriber<T> = (value: T) => void;
export type StreamErrorHandler = (error: Error) => void;
export type StreamCompleteHandler = () => void;
export type TeardownLogic = () => void;
export type OperatorFunction<T, R> = (source: Stream<T>) => Stream<R>;

export interface Observer<T> {
  next?: StreamSubscriber<T>;
  error?: StreamErrorHandler;
  complete?: StreamCompleteHandler;
}

export interface Subscription {
  /** Unique subscription ID */
  id: string;
  /** Whether this subscription is still active */
  closed: boolean;
  /** Unsubscribe from the stream */
  unsubscribe(): void;
  /** Add a child subscription (auto-unsubscribed when parent unsubscribes) */
  add(child: Subscription): void;
}

// --- Internal Types ---

interface InternalSubscription<T> extends Subscription {
  observer: Partial<Observer<T>>;
  teardowns: Set<TeardownLogic>;
}

// --- Stream Core ---

/**
 * A lazy, push-based stream (similar to RxJS Observable but lighter).
 *
 * Streams are cold by default — the producer function runs for each subscriber.
 * Use `share()` to make a stream hot (shared among subscribers).
 *
 * @example
 * const numbers = new Stream<number>((observer) => {
 *   observer.next(1);
 *   observer.next(2);
 *   observer.complete();
 * });
 *
 * numbers.pipe(
 *   map((x) => x * 2),
 *   filter((x) => x > 2),
 * ).subscribe(console.log); // 4
 */
export class Stream<T = unknown> {
  private _subscribe: (subscriber: InternalSubscription<T>) => TeardownLogic;

  constructor(subscribe: (subscriber: InternalSubscription<T>) => TeardownLogic) {
    this._subscribe = subscribe;
  }

  /**
   * Subscribe to the stream.
   * Returns a Subscription that can be used to unsubscribe.
   */
  subscribe(observer?: Partial<Observer<T>> | StreamSubscriber<T>): Subscription {
    const obs: Partial<Observer<T>> =
      typeof observer === "function" ? { next: observer } : (observer ?? {});

    const sub: InternalSubscription<T> = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      closed: false,
      observer: obs,
      teardowns: new Set(),
      unsubscribe() {
        if (this.closed) return;
        this.closed = true;
        for (const teardown of this.teardowns) {
          try { teardown(); } catch { /* ignore */ }
        }
        this.teardowns.clear();
      },
      add(child: Subscription) {
        this.teardowns.add(() => { if (!child.closed) child.unsubscribe(); });
      },
    };

    tryCatch(() => {
      const teardown = this._subscribe(sub);
      if (teardown) sub.teardowns.add(teardown);
    }, sub);

    return sub;
  }

  /**
   * Pipe operators together.
   * Each operator transforms the stream and returns a new one.
   */
  pipe<R>(...operators: OperatorFunction<any, any>[]): Stream<R> {
    let result: Stream<any> = this as Stream<any>;
    for (const op of operators) {
      result = op(result);
    }
    return result as Stream<R>;
  }

  // --- Static Creators ---

  /** Create a stream that emits a single value then completes */
  static of<T>(...values: T[]): Stream<T> {
    return new Stream<T>((sub) => {
      for (const v of values) {
        if (sub.closed) break;
        sub.observer.next?.(v);
      }
      sub.observer.complete?.();
      return () => {};
    });
  }

  /** Create a stream from an array/iterable */
  static from<T>(iterable: Iterable<T> | AsyncIterable<T>): Stream<T> {
    return new Stream<T>((sub) => {
      (async () => {
        try {
          for await (const value of iterable) {
            if (sub.closed) break;
            sub.observer.next?.(value);
          }
          sub.observer.complete?.();
        } catch (err) {
          sub.observer.error?.(err as Error);
        }
      })();
      return () => {};
    });
  }

  /** Create a stream that never emits (useful for testing) */
  static never(): Stream<never> {
    return new Stream(() => () => {});
  }

  /** Create a stream that errors immediately */
  static throw(error: Error): Stream<never> {
    return new Stream((sub) => {
      sub.observer.error?.(error);
      return () => {};
    });
  }

  /** Create a stream that completes immediately with no values */
  static empty(): Stream<never> {
    return new Stream((sub) => {
      sub.observer.complete?.();
      return () => {};
    });
  }

  /** Create a stream from a Promise */
  static fromPromise<T>(promise: Promise<T>): Stream<T> {
    return new Stream<T>((sub) => {
      promise.then(
        (value) => { if (!sub.closed) { sub.observer.next?.(value); sub.observer.complete?.(); } },
        (error) => { if (!sub.closed) sub.observer.error?.(error); },
      );
      return () => {};
    });
  }

  /** Create a stream that emits values at intervals */
  static interval(ms: number): Stream<number> {
    let count = 0;
    return new Stream<number>((sub) => {
      const id = setInterval(() => {
        sub.observer.next?.(count++);
      }, ms);
      return () => clearInterval(id);
    });
  }

  /** Create a stream that emits once after a delay */
  static timer(delayMs: number): Stream<number> {
    return new Stream<number>((sub) => {
      const id = setTimeout(() => {
        sub.observer.next?.(0);
        sub.observer.complete?.();
      }, delayMs);
      return () => clearTimeout(id);
    });
  }

  /** Combine multiple streams — emit when ALL emit latest value */
  static combineLatest<A, B>(a: Stream<A>, b: Stream<B>): Stream<[A, B]> {
    return new Stream<[A, B]>((sub) => {
      let valA: A | undefined;
      let valB: B | undefined;
      let doneA = false;
      let doneB = false;

      const checkEmit = () => {
        if (valA !== undefined && valB !== undefined) {
          sub.observer.next?.([valA!, valB!]);
        }
        if (doneA && doneB) sub.observer.complete?.();
      };

      const subA = a.subscribe({
        next: (v) => { valA = v; checkEmit(); },
        error: (e) => sub.observer.error?.(e),
        complete: () => { doneA = true; checkEmit(); },
      });

      const subB = b.subscribe({
        next: (v) => { valB = v; checkEmit(); },
        error: (e) => sub.observer.error?.(e),
        complete: () => { doneB = true; checkEmit(); },
      });

      sub.add(subA);
      sub.add(subB);

      return () => {};
    });
  }

  /** Merge multiple streams into one (interleaved) */
  static merge<T>(...streams: Stream<T>[]): Stream<T> {
    return new Stream<T>((sub) => {
      const subs = streams.map((s) =>
        s.subscribe({
          next: (v) => sub.observer.next?.(v),
          error: (e) => sub.observer.error?.(e),
          complete: () => {}, // Don't complete until all are done
        }),
      );

      let completedCount = 0;
      streams.forEach((s, i) => {
        s.subscribe({
          complete: () => {
            completedCount++;
            if (completedCount === streams.length) sub.observer.complete?.();
          },
        });
      });

      subs.forEach((s) => sub.add(s));

      return () => {};
    });
  }

  // --- Operators (as methods + exported functions) ---

  /** Transform each emitted value */
  map<R>(project: (value: T, index: number) => R): Stream<R> {
    let index = 0;
    return new Stream<R>((sub) => {
      return this.subscribe({
        next: (v) => sub.observer.next?.(project(v, index++)),
        error: (e) => sub.observer.error?.(e),
        complete: () => sub.observer.complete?.(),
      });
    });
  }

  /** Filter values that don't match predicate */
  filter(predicate: (value: T, index: number) => boolean): Stream<T> {
    let index = 0;
    return new Stream<T>((sub) => {
      return this.subscribe({
        next: (v) => { if (predicate(v, index++)) sub.observer.next?.(v); },
        error: (e) => sub.observer.error?.(e),
        complete: () => sub.observer.complete?.(),
      });
    });
  }

  /** Reduce all values to a single accumulated result */
  reduce<R>(accumulator: (acc: R, value: T, index: number) => R, initial: R): Stream<R> {
    let acc = initial;
    let index = 0;
    let hasValue = false;
    return new Stream<R>((sub) => {
      return this.subscribe({
        next: (v) => { acc = accumulator(acc, v, index++); hasValue = true; },
        error: (e) => sub.observer.error?.(e),
        complete: () => {
          if (hasValue) sub.observer.next?.(acc);
          sub.observer.complete?.();
        },
      });
    });
  }

  /** Emit only distinct consecutive values */
  distinctUntilChanged(comparator?: (a: T, b: T) => boolean): Stream<T> {
    let prev: T | undefined;
    const cmp = comparator ?? ((a: T, b: T) => a === b);
    return new Stream<T>((sub) => {
      return this.subscribe({
        next: (v) => {
          if (prev === undefined || !cmp(prev, v)) {
            prev = v;
            sub.observer.next?.(v);
          }
        },
        error: (e) => sub.observer.error?.(e),
        complete: () => sub.observer.complete?.(),
      });
    });
  }

  /** Take only the first N values */
  take(count: number): Stream<T> {
    return new Stream<T>((sub) => {
      let taken = 0;
      const sourceSub = this.subscribe({
        next: (v) => {
          if (taken < count) {
            taken++;
            sub.observer.next?.(v);
            if (taken >= count) {
              sub.observer.complete?.();
              sourceSub.unsubscribe();
            }
          }
        },
        error: (e) => sub.observer.error?.(e),
        complete: () => sub.observer.complete?.(),
      });
      return () => sourceSub.unsubscribe();
    });
  }

  /** Skip the first N values */
  skip(count: number): Stream<T> {
    let skipped = 0;
    return new Stream<T>((sub) => {
      return this.subscribe({
        next: (v) => {
          if (skipped >= count) sub.observer.next?.(v);
          else skipped++;
        },
        error: (e) => sub.observer.error?.(e),
        complete: () => sub.observer.complete?.(),
      });
    });
  }

  /** Debounce — emit only after silence period */
  debounce(ms: number): Stream<T> {
    return new Stream<T>((sub) => {
      let timerId: ReturnType<typeof setTimeout> | null = null;
      let latestValue: T | undefined;
      let hasValue = false;

      const sourceSub = this.subscribe({
        next: (v) => {
          latestValue = v;
          hasValue = true;
          if (timerId !== null) clearTimeout(timerId);
          timerId = setTimeout(() => {
            if (hasValue && latestValue !== undefined) {
              sub.observer.next?.(latestValue);
              hasValue = false;
            }
          }, ms);
        },
        error: (e) => sub.observer.error?.(e),
        complete: () => {
          // Flush pending value on completion
          if (timerId !== null) clearTimeout(timerId);
          if (hasValue && latestValue !== undefined) {
            sub.observer.next?.(latestValue);
          }
          sub.observer.complete?.();
        },
      });

      return () => {
        if (timerId !== null) clearTimeout(timerId);
        sourceSub.unsubscribe();
      };
    });
  }

  /** Throttle — emit at most once per interval */
  throttle(ms: number): Stream<T> {
    return new Stream<T>((sub) => {
      let lastEmit = 0;
      let trailingTimer: ReturnType<typeof setTimeout> | null = null;
      let trailingValue: T | undefined;
      let hasTrailing = false;

      const sourceSub = this.subscribe({
        next: (v) => {
          const now = Date.now();
          if (now - lastEmit >= ms) {
            lastEmit = now;
            sub.observer.next?.(v);
          } else {
            trailingValue = v;
            hasTrailing = true;
            if (trailingTimer === null) {
              trailingTimer = setTimeout(() => {
                if (hasTrailing) {
                  lastEmit = Date.now();
                  sub.observer.next?.(trailingValue!);
                  hasTrailing = false;
                }
                trailingTimer = null;
              }, ms - (now - lastEmit));
            }
          }
        },
        error: (e) => sub.observer.error?.(e),
        complete: () => {
          if (trailingTimer !== null) clearTimeout(trailingTimer);
          if (hasTrailing) sub.observer.next?.(trailingValue!);
          sub.observer.complete?.();
        },
      });

      return () => {
        if (trailingTimer !== null) clearTimeout(trailingTimer);
        sourceSub.unsubscribe();
      };
    });
  }

  /** Catch errors and switch to a fallback stream */
  catchError<R>(fallback: (error: Error) => Stream<R>): Stream<T | R> {
    return new Stream<T | R>((sub) => {
      return this.subscribe({
        next: (v) => sub.observer.next?.(v),
        error: (e) => {
          const fallbackStream = fallback(e);
          fallbackStream.subscribe({
            next: (v) => sub.observer.next?.(v as T | R),
            error: (err) => sub.observer.error?.(err),
            complete: () => sub.observer.complete?.(),
          });
        },
        complete: () => sub.observer.complete?.(),
      });
    });
  }

  /** Retry the source stream up to N times on error */
  retry(count: number): Stream<T> {
    return new Stream<T>((sub) => {
      let attempts = 0;
      let currentSub: Subscription | null = null;

      const subscribeToSource = () => {
        attempts++;
        currentSub = this.subscribe({
          next: (v) => sub.observer.next?.(v),
          error: (e) => {
            if (attempts < count) subscribeToSource();
            else sub.observer.error?.(e);
          },
          complete: () => sub.observer.complete?.(),
        });
        sub.add(currentSub!);
      };

      subscribeToSource();

      return () => {};
    });
  }

  /** Execute a side effect for each value without modifying it */
  tap(observer?: Partial<Observer<T>>): Stream<T> {
    return new Stream<T>((sub) => {
      return this.subscribe({
        next: (v) => { observer?.next?.(v); sub.observer.next?.(v); },
        error: (e) => { observer?.error?.(e); sub.observer.error?.(e); },
        complete: () => { observer?.complete?.(); sub.observer.complete?.(); },
      });
    });
  }

  /** Delay each value by a given number of milliseconds */
  delay(ms: number): Stream<T> {
    return new Stream<T>((sub) => {
      return this.subscribe({
        next: (v) => {
          setTimeout(() => { if (!sub.closed) sub.observer.next?.(v); }, ms);
        },
        error: (e) => sub.observer.error?.(e),
        complete: () => setTimeout(() => sub.observer.complete?.(), ms),
      });
    });
  }

  /** Share a single execution among multiple subscribers (multicast) */
  share(): Stream<T> {
    let refCount = 0;
    let sourceSub: Subscription | null = null;
    let subject: Subject<T> | null = null;

    return new Stream<T>((sub) => {
      if (!subject) subject = new Subject<T>();
      refCount++;

      if (refCount === 1) {
        sourceSub = this.subscribe({
          next: (v) => subject!.next(v),
          error: (e) => subject!.error(e),
          complete: () => subject!.complete(),
        });
      }

      const innerSub = subject.subscribe(sub.observer);

      return () => {
        refCount--;
        innerSub.unsubscribe();
        if (refCount === 0) {
          sourceSub?.unsubscribe();
          sourceSub = null;
          subject = null;
        }
      };
    });
  }

  /** Start with given values before source emissions */
  startWith(...values: T[]): Stream<T> {
    return new Stream<T>((sub) => {
      for (const v of values) {
        if (sub.closed) return;
        sub.observer.next?.(v);
      }
      return this.subscribe(sub.observer);
    });
  }

  /** End with given values after source completes */
  endWith(...values: T[]): Stream<T> {
    return new Stream<T>((sub) => {
      return this.subscribe({
        next: (v) => sub.observer.next?.(v),
        error: (e) => sub.observer.error?.(e),
        complete: () => {
          for (const v of values) {
            if (sub.closed) return;
            sub.observer.next?.(v);
          }
          sub.observer.complete?.();
        },
      });
    });
  }

  /** Buffer values until the notifier emits, then emit buffered array */
  buffer(notifier: Stream<unknown>): Stream<T[]> {
    return new Stream<T[]>((sub) => {
      const buffer: T[] = [];

      const sourceSub = this.subscribe({
        next: (v) => buffer.push(v),
        error: (e) => sub.observer.error?.(e),
        complete: () => {
          if (buffer.length > 0) sub.observer.next?.([...buffer]);
          sub.observer.complete?.();
        },
      });

      const notifierSub = notifier.subscribe({
        next: () => {
          if (buffer.length > 0) {
            sub.observer.next?.([...buffer]);
            buffer.length = 0;
          }
        },
        error: (e) => sub.observer.error?.(e),
      });

      sub.add(sourceSub);
      sub.add(notifierSub);

      return () => {};
    });
  }

  /** Scan — like reduce but emits each intermediate value */
  scan<R>(accumulator: (acc: R, value: T, index: number) => R, initial: R): Stream<R> {
    let acc = initial;
    let index = 0;
    return new Stream<R>((sub) => {
      return this.subscribe({
        next: (v) => {
          acc = accumulator(acc, v, index++);
          sub.observer.next?.(acc);
        },
        error: (e) => sub.observer.error?.(e),
        complete: () => sub.observer.complete?.(),
      });
    });
  }
}

// --- Subject (Hot Stream) ---

/**
 * A Subject is both an Observable and an Observer.
 * You can manually push values into it, and subscribers receive them.
 */
export class Subject<T = unknown> extends Stream<T> {
  private observers = new Set<InternalSubscription<T>>();
  private _closed = false;

  constructor() {
    super((sub) => {
      this.observers.add(sub);
      return () => { this.observers.delete(sub); };
    });
  }

  /** Push a value to all subscribers */
  next(value: T): void {
    if (this._closed) return;
    for (const sub of this.observers) {
      try { sub.observer.next?.(value); } catch { /* ignore */ }
    }
  }

  /** Push an error to all subscribers */
  error(err: Error): void {
    if (this._closed) return;
    for (const sub of [...this.observers]) {
      try { sub.observer.error?.(err); } catch { /* ignore */ }
    }
    this._closed = true;
  }

  /** Complete all subscribers */
  complete(): void {
    if (this._closed) return;
    for (const sub of [...this.observers]) {
      try { sub.observer.complete?.(); } catch { /* ignore */ }
    }
    this._closed = true;
    this.observers.clear();
  }

  get closed(): boolean { return this._closed; }
  get observerCount(): number { return this.observers.size; }
}

// --- BehaviorSubject (with current value) ---

/**
 * A Subject that remembers its last emitted value.
 * New subscribers immediately receive the current value.
 */
export class BehaviorSubject<T = unknown> extends Subject<T> {
  private _value: T;

  constructor(initialValue: T) {
    super();
    this._value = initialValue;
  }

  override next(value: T): void {
    this._value = value;
    super.next(value);
  }

  /** Get the current value */
  getValue(): T {
    return this._value;
  }

  override subscribe(observer?: Partial<Observer<T>> | StreamSubscriber<T>): Subscription {
    const sub = super.subscribe(observer);
    // Emit current value to new subscriber
    if (!sub.closed) {
      (observer as Partial<Observer<T>>)?.next?.(this._value);
    }
    return sub;
  }
}

// --- ReplaySubject (replays N last values) ---

/**
 * A Subject that replays the last N values to new subscribers.
 */
export class ReplaySubject<T = unknown> extends Subject<T> {
  private buffer: T[];
  private readonly bufferSize: number;

  constructor(bufferSize = Infinity) {
    super();
    this.bufferSize = bufferSize;
    this.buffer = [];
  }

  override next(value: T): void {
    this.buffer.push(value);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }
    super.next(value);
  }

  override subscribe(observer?: Partial<Observer<T>> | StreamSubscriber<T>): Subscription {
    const sub = super.subscribe(observer);
    // Replay buffered values to new subscriber
    for (const v of this.buffer) {
      if (sub.closed) break;
      (observer as Partial<Observer<T>>)?.next?.(v);
    }
    return sub;
  }
}

// --- Utility ---

/** Wrap a function call in try/catch, forwarding errors to subscriber */
function tryCatch(fn: () => void, sub: InternalSubscription<unknown>): void {
  try {
    fn();
  } catch (err) {
    sub.observer.error?.(err as Error);
  }
}
