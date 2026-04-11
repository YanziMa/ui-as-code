/**
 * Option type — nullable wrapper with rich combinators for
 * null-safe operations, default values, and pattern matching.
 */

// --- Core Option Type ---

export interface Option<T> {
  /** Check if value is present */
  isSome(): boolean;
  /** Check if value is absent (null) */
  isNone(): boolean;
  /** Get value or throw */
  unwrap(): T;
  /** Get value or return default */
  unwrapOr(defaultValue: T): T;
  /** Get value or call factory */
  unwrapOrElse(factory: () => T): T;
  /** Map over the value if present */
  map<U>(fn: (value: T) => U): Option<U>;
  /** FlatMap — transform value that returns Option */
  flatMap<U>(fn: (value: T) => Option<U>): Option<U>;
  /** Filter — keep only if predicate passes */
  filter(predicate: (value: T) => boolean): Option<T>;
  /** Apply side effect if present */
  ifSome(fn: (value: T) => void): Option<T>;
  /** Execute if absent (no value) */
  ifNone(fn: () => void): Option<T>;
  /** Match with two branches */
  match<U>(some: (value: T) => U, none: () => U): U;
  /** Convert to nullable (null or value) */
  toNullable(): T | null;
  /** Convert to array (empty or single-element) */
  toArray(): T[];
  /** Convert to Either (Right=Some, Left=None) */
  toEither<L = never>(leftValue: L): Either<L, T>;
  /** Equality check */
  equals(other: Option<T>): boolean;
  /** Hash code */
  hashCode(): string;
  /** String representation */
  toString(): string;
  /** JSON representation */
  toJSON(): T | null;
}

// --- Some (present value) ---

class SomeImpl<T> implements Option<T> {
  constructor(private value: T) {}

  isSome(): boolean { return true; }
  isNone(): boolean { return false; }
  unwrap(): T { return this.value; }
  unwrapOr(_defaultValue: T): T { return this.value; }
  unwrapOrElse(_factory: () => T): T { return this.value; }

  map<U>(fn: (value: T) => U): Option<U> {
    try {
      return new SomeImpl(fn(this.value));
    } catch {
      return NoneImpl.instance as Option<U>;
    }
  }

  flatMap<U>(fn: (value: T) => Option<U>): Option<U> {
    return fn(this.value);
  }

  filter(predicate: (value: T) => boolean): Option<T> {
    return predicate(this.value) ? this : NoneImpl.instance as Option<T>;
  }

  ifSome(fn: (value: T) => void): Option<T> {
    fn(this.value);
    return this;
  }

  ifNone(_fn: () => void): Option<T> { return this; }

  match<U>(some: (value: T) => U, _none: () => U): U { return some(this.value); }

  toNullable(): T | null { return this.value; }
  toArray(): T[] { return [this.value]; }

  toEither<L>(): Either<L, T> { return Right<L, T>(this.value); }

  equals(other: Option<T>): boolean {
    return other.isSome() && Object.is(this.value, other.unwrap());
  }

  hashCode(): string {
    return `some:${Object.is(this.value) ? JSON.stringify(this.value) : String(this.value)}`;
  }

  toString(): string { return `Some(${this.value})`; }
  toJSON(): T | null { return this.value; }
}

// --- None (absent value) ---

class NoneImpl<T> implements Option<T> {
  static instance = new NoneImpl<never>();

  isSome(): boolean { return false; }
  isNone(): boolean { return true; }
  unwrap(): T { throw new Error("Option.unwrap() called on None"); }
  unwrapOr(defaultValue: T): T { return defaultValue; }
  unwrapOrElse(factory: () => T): T { return factory(); }

  map<U>(_fn: (value: T) => U): Option<U> { return this as unknown as Option<U>; }
  flatMap<U>(_fn: (value: T) => Option<U>): Option<U> { return this as unknown as Option<U>; }
  filter(_predicate: (value: T) => boolean): Option<T> { return this as unknown as Option<T>; }
  ifSome(_fn: (value: T) => void): Option<T> { return this; }
  ifNone(fn: () => void): Option<T> { fn(); return this; }
  match<U>(_some: (value: T) => U, none: () => U): U { return none(); }
  toNullable(): T | null { return null; }
  toArray(): T[] { return []; }
  toEither<L>(leftValue: L): Either<L, T> { return Left<L, T>(leftValue); }
  equals(other: Option<T>): boolean { return other.isNone(); }
  hashCode(): string { return "none"; }
  toString(): string { return "None"; }
  toJSON(): T | null { return null; }
}

// --- Constructors ---

/** Create a Some (present value) */
export function Some<T>(value: T): Option<T> { return new SomeImpl(value); }

/** The None singleton (absent value) */
export const None: Option<never> = NoneImpl.instance;

/** Wrap a nullable value into Option */
export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value == null ? None as Option<T> : Some(value);
}

/** Create Option from a condition and value factory */
export function fromPredicate<T>(
  condition: boolean,
  valueFactory: () => T,
): Option<T> {
  return condition ? Some(valueFactory()) : None;
}

/** Try a function, returning Some(result) or None on error */
export function tryOption<T>(fn: () => T): Option<T> {
  try { return Some(fn()); } catch { return None; }
}

/** Try an async function, returning Promise of Option */
export async function tryOptionAsync<T>(fn: () => Promise<T>): Promise<Option<T>> {
  try { return Some(await fn()); } catch { return None; }
}

// --- Combinators ---

/** Lift a pure function to work with Options */
export function liftA2<A, B, C>(
  fn: (a: A, b: B) => C,
): (oa: Option<A>, ob: Option<B>) => Option<C> {
  return (oa, ob) => oa.flatMap((a) => ob.map((b) => fn(a, b)));
}

/** Sequence: run multiple Option-returning functions, stop at first None */
export function sequence<T>(options: Array<Option<T>>): Option<T[]> {
  const results: T[] = [];
  for (const opt of options) {
    if (opt.isNone()) return None as Option<T[]>;
    results.push(opt.unwrap());
  }
  return Some(results);
}

/** Find first Some in an array */
export function firstSome<T>(arr: T[], predicate: (v: T) => boolean): Option<T> {
  for (const item of arr) {
    if (predicate(item)) return Some(item);
  }
  return None;
}

/** Find last Some in an array */
export function lastSome<T>(arr: T[], predicate: (v: T) => boolean): Option<T> {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i]!)) return Some(arr[i]!);
  }
  return None;
}

/** Get value at index if in bounds */
export function at<T>(arr: T[], index: number): Option<T> {
  return index >= 0 && index < arr.length ? Some(arr[index]!) : None;
}

/** Get property from object if present */
export function prop<K extends string, V = unknown>(obj: Record<string, V>, key: K): Option<V> {
  return Object.prototype.hasOwnProperty.call(obj, key)
    ? Some(obj[key])
    : None;
}

/** Coalesce — return first Some/defined value */
export function coalesce<T>(...options: Array<Option<T> | undefined | null>): Option<T> {
  for (const opt of options) {
    if (opt && opt.isSome()) return opt;
  }
  return None;
}

// --- Either import (avoid circular dependency) ---

// Inline Either to avoid importing from either.ts
interface Either<L, R> {
  isLeft(): boolean;
  isRight(): boolean;
}
function Right<L, R>(v: R): Either<L, R> {
  // Minimal right implementation
  return { isLeft: () => false, isRight: () => true } as Either<L, R>;
}
function Left<L, R>(v: L): Either<L, R> {
  return { isLeft: () => true, isRight: () => false } as Either<L, R>;
}
