/**
 * Functional programming utilities — composition, currying, partial application,
 * monads (Maybe/Either), lazy evaluation, and more.
 */

// --- Composition ---

/** Compose functions right-to-left: compose(f, g)(x) = f(g(x)) */
export function compose<A, B, C>(f: (b: B) => C, g: (a: A) => B): (a: A) => C;
export function compose<A, B, C, D>(f: (c: C) => D, g: (b: B) => C, h: (a: A) => B): (a: A) => D;
export function compose(...fns: Array<(arg: unknown) => unknown>): (arg: unknown) => unknown {
  return fns.reduceRight((acc, fn) => (x: unknown) => fn(acc(x)));
}

/** Pipe functions left-to-right: pipe(f, g)(x) = g(f(x)) */
export function pipe<A, B, C>(f: (a: A) => B, g: (b: B) => C): (a: A) => C;
export function pipe<A, B, C, D>(f: (a: A) => B, g: (b: B) => C, h: (c: C) => D): (a: A) => D;
export function pipe(...fns: Array<(arg: unknown) => unknown>): (arg: unknown) => unknown {
  return fns.reduce((acc, fn) => (x: unknown) => fn(acc(x)));
}

// --- Currying & Partial Application ---

/** Curry a binary function */
export function curry2<A, B, C>(fn: (a: A, b: B) => C): (a: A) => (b: B) => C {
  return (a: A) => (b: B) => fn(a, b);
}

/** Curry a ternary function */
export function curry3<A, B, C, D>(fn: (a: A, b: B, c: C) => D): (a: A) => (b: B) => (c: C) => D {
  return (a: A) => (b: B) => (c: C) => fn(a, b, c);
}

/** Partially apply a function from the left */
export function partial<A extends unknown[], R>(fn: (...args: A) => R, ...fixed: A): (...rest: Drop<A, typeof fixed.length>) => R {
  return (...rest) => fn(...(fixed as unknown[]), ...rest);
}

/** Partially apply a function from the right */
export function partialRight<A extends unknown[], R>(fn: (...args: A) => R, ...fixed: A): (...rest: Take<A, typeof fixed.length>) => R {
  const fixedCount = fixed.length;
  return (...rest) => {
    const args = new Array(fixed.length + rest.length);
    let fi = 0, ri = 0;
    for (let i = 0; i < args.length; i++) {
      if (i < rest.length && ri < rest.length && !isFixedSlot(i, fixedCount, args.length)) {
        args[i] = rest[ri++] as unknown;
      } else {
        args[i] = fixed[fi++] as unknown;
      }
    }
    return fn(...(args as A));
  };
}

function isFixedSlot(index: number, fixedCount: number, totalArgs: number): boolean {
  // Fixed args fill from the right
  return index >= totalArgs - fixedCount;
}

type Drop<T extends unknown[], N extends number> = T extends [...infer _Head, ...infer Tail]
  ? N extends 0 ? T : Tail["length"] extends N ? [] : Drop<Tail, SubtractOne<N>>
  : never;

type Take<T extends unknown[], N extends number> = N extends 0 ? []
  : T extends [infer Head, ...infer Tail] ? [Head, ...Take<Tail, SubtractOne<N>>]
  : never;

type SubtractOne<N extends number> = N extends 0 ? 0 : Exclude<N, 0> extends infer M ? (M extends number ? M : 0) : 0;

// --- Maybe Monad ---

interface Maybe<T> {
  map<U>(fn: (value: T) => U): Maybe<U>;
  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U>;
  orElse(defaultValue: () => T): T;
  getOrElse(defaultValue: T): T;
  isPresent(): boolean;
  filter(predicate: (value: T) => boolean): Maybe<T>;
  caseOf<R>(patterns: { just?: (value: T) => R; nothing?: () => R }): R;
}

class Just<T> implements Maybe<T> {
  constructor(private value: T) {}

  map<U>(fn: (value: T) => U): Maybe<U> { return new Just(fn(this.value)); }
  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> { return fn(this.value); }
  orElse(): T { return this.value; }
  getOrElse(_defaultValue: T): T { return this.value; }
  isPresent(): boolean { return true; }
  filter(predicate: (value: T) => boolean): Maybe<T> {
    return predicate(this.value) ? this : nothing();
  }
  caseOf<R>(patterns: { just?: (value: T) => R; nothing?: () => R }): R {
    return patterns.just ? patterns.just(this.value) : (patterns.nothing?.() ?? undefined as unknown as R);
  }
}

class Nothing<T> implements Maybe<T> {
  map<U>(_fn: (value: T) => U): Maybe<U> { return this as unknown as Maybe<U>; }
  flatMap<U>(_fn: (value: T) => Maybe<U>): Maybe<U> { return this as unknown as Maybe<U>; }
  orElse(defaultValue: () => T): T { return defaultValue(); }
  getOrElse(defaultValue: T): T { return defaultValue; }
  isPresent(): boolean { return false; }
  filter(_predicate: (value: T) => boolean): Maybe<T> { return this; }
  caseOf<R>(patterns: { just?: (value: T) => R; nothing?: () => R }): R {
    return patterns.nothing?.() ?? undefined as unknown as R;
  }
}

/** Create a Just (Some) value */
export function just<T>(value: T): Maybe<T> { return new Just(value); }

/** Create a Nothing value */
export function nothing<T = never>(): Maybe<T> { return new Nothing<T>(); }

/** Wrap a nullable value into Maybe */
export function fromNullable<T>(value: T | null | undefined): Maybe<NonNullable<T>> {
  return value == null ? nothing() : just(value as NonNullable<T>);
}

// --- Either Monad ---

interface Either<L, R> {
  isLeft(): boolean;
  isRight(): boolean;
  map<U>(fn: (value: R) => U): Either<L, U>;
  flatMap<U>(fn: (value: R) => Either<L, U>): Either<L, U>;
  leftMap<U>(fn: (error: L) => U): Either<U, R>;
  getOrElse(defaultValue: R): R;
  getOrThrow(errorFn?: (l: L) => Error): R;
  fold<U>(onLeft: (l: L) => U, onRight: (r: R) => U): U;
  swap(): Either<R, L>;
  caseOf<U>(patterns: { left?: (l: L) => U; right?: (r: R) => U }): U;
}

class Left<L, R> implements Either<L, R> {
  constructor(private value: L) {}
  isLeft(): boolean { return true; }
  isRight(): boolean { return false; }
  map<U>(_fn: (value: R) => U): Either<L, U> { return this as unknown as Either<L, U>; }
  flatMap<U>(_fn: (value: R) => Either<L, U>): Either<L, U> { return this as unknown as Either<L, U>; }
  leftMap<U>(fn: (error: L) => U): Either<U, R> { return new Left(fn(this.value)); }
  getOrElse(defaultValue: R): R { return defaultValue; }
  getOrThrow(errorFn?: (l: L) => Error): R { throw errorFn?.(this.value) ?? new Error(String(this.value)); }
  fold<U>(onLeft: (l: L) => U, _onRight: (r: R) => U): U { return onLeft(this.value); }
  swap(): Either<R, L> { return new Right(this.value); }
  caseOf<U>(patterns: { left?: (l: L) => U; right?: (r: R) => U }): U {
    return patterns.left?.(this.value) ?? undefined as unknown as U;
  }
}

class Right<L, R> implements Either<L, R> {
  constructor(private value: R) {}
  isLeft(): boolean { return false; }
  isRight(): boolean { return true; }
  map<U>(fn: (value: R) => U): Either<L, U> { return new Right(fn(this.value)); }
  flatMap<U>(fn: (value: R) => Either<L, U>): Either<L, U> { return fn(this.value); }
  leftMap<U>(_fn: (error: L) => U): Either<U, R> { return this as unknown as Either<U, R>; }
  getOrElse(_defaultValue: R): R { return this.value; }
  getOrThrow(): R { return this.value; }
  fold<U>(_onLeft: (l: L) => U, onRight: (r: R) => U): U { return onRight(this.value); }
  swap(): Either<R, L> { return new Left(this.value); }
  caseOf<U>(patterns: { left?: (l: L) => U; right?: (r: R) => U }): U {
    return patterns.right?.(this.value) ?? undefined as unknown as U;
  }
}

/** Create a Left value (error/failure) */
export function left<L, R>(value: L): Either<L, R> { return new Left(value); }

/** Create a Right value (success) */
export function right<L, R>(value: R): Either<L, R> { return new Right(value); }

/** Try a function that may throw, returning an Either */
export function tryCatch<T>(fn: () => T): Either<Error, T> {
  try { return right(fn()); } catch (e) { return left(e instanceof Error ? e : new Error(String(e))); }
}

/** Try an async function that may throw, returning a Promise of Either */
export async function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Either<Error, T>> {
  try { return right(await fn()); } catch (e) { return left(e instanceof Error ? e : new Error(String(e))); }
}

// --- Lazy Evaluation ---

/** Create a lazy value (computed once, cached) */
export class Lazy<T> {
  private computed = false;
  private value!: T;
  private factory: () => T;

  constructor(factory: () => T) {
    this.factory = factory;
  }

  get(): T {
    if (!this.computed) {
      this.value = this.factory();
      this.computed = true;
    }
    return this.value;
  }

  isComputed(): boolean { return this.computed; }

  map<U>(fn: (value: T) => U): Lazy<U> {
    return new Lazy(() => fn(this.get()));
  }

  reset(): void {
    this.computed = false;
  }
}

/** Create a lazy value */
export function lazy<T>(factory: () => T): Lazy<T> { return new Lazy(factory); }

// --- Trampoline (Tail Call Optimization) ---

/** Trampoline result — either done with a value, or need to continue */
type TrampolineResult<T> = { tag: "done"; value: T } | { tag: "cont"; thunk: () => TrampolineResult<T> };

/** Run a trampolined computation (prevents stack overflow for deep recursion) */
export function trampoline<T>(result: TrampolineResult<T>): T {
  while (result.tag === "cont") {
    result = result.thunk();
  }
  return result.value;
}

/** Helper to create a continuation step */
export function cont<T>(thunk: () => TrampolineResult<T>): TrampolineResult<T> {
  return { tag: "cont", thunk };
}

/** Helper to create a final result */
export function done<T>(value: T): TrampolineResult<T> {
  return { tag: "done", value };
}

// --- Utility Functions ---

/** Identity function */
export const identity = <T>(x: T): T => x;

/** Constant function (returns same value regardless of input) */
export function constant<T>(value: T): (_: unknown) => T {
  return () => value;
}

/** No-op function */
export const noop = (): void => {};

/** Tap into a pipeline without changing the value */
export function tap<T>(fn: (value: T) => void): (value: T) => T {
  return (value) => { fn(value); return value; };
}

/** Execute side effect, return original value */
export function also<T>(value: T, fn: (v: T) => void): T {
  fn(value);
  return value;
}

/** Apply a function only if condition is met */
export function when<T>(condition: boolean | (() => boolean), fn: (value: T) => T): (value: T) => T {
  const check = typeof condition === "function" ? condition : () => condition;
  return (value) => check() ? fn(value) : value;
}

/** Default value if nullish */
export function defaultTo<T>(defaultValue: T, value: T | null | undefined): T {
  return value != null ? value : defaultValue;
}

/** Predicate combinators */
export const alwaysTrue = (): boolean => true;
export const alwaysFalse = (): boolean => false;
export const not = <T>(predicate: (x: T) => boolean) => (x: T) => !predicate(x);

/** Flip argument order of a binary function */
export function flip<A, B, C>(fn: (a: A, b: B) => C): (b: B, a: A) => C {
  return (b, a) => fn(a, b);
}
