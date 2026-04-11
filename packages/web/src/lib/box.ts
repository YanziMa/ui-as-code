/**
 * Box — immutable container for any value with identity-based equality.
 * Useful for wrapping primitive types that need reference semantics.
 */

// --- Types ---

export interface Box<T> {
  /** Unwrap the contained value */
  value: T;
  /** Create a new box with transformed content */
  map<U>(fn: (value: T) => U): Box<U>;
  /** Apply side effect to contents */
  effect(fn: (value: T) => void): Box<T>;
  /** Check equality by reference (or deep equality for primitives) */
  equals(other: Box<T>): boolean;
  /** Convert to string */
  toString(): string;
  /** Convert to JSON */
  toJSON(): T;
  /** Check if boxed value matches predicate */
  satisfies(predicate: (value: T) => boolean): boolean;
  /** Match against value */
  matches(matcher: (value: T) => boolean): Box<T>;
  /** Clone (returns same box since immutable) */
  clone(): Box<T>;
}

// --- Implementation ---

class BoxImpl<T> implements Box<T> {
  constructor(private _value: T) {}

  get value(): T { return this._value; }

  map<U>(fn: (value: T) => U): Box<U> {
    return new BoxImpl(fn(this._value));
  }

  effect(fn: (value: T) => void): Box<T> {
    fn(this._value);
    return this;
  }

  equals(other: Box<T>): boolean {
    if (this._value === other.value) return true;
    if (typeof this._value === "object" && typeof other.value === "object") {
      return Object.is(this._value, other.value);
    }
    return false;
  }

  toString(): string { return `Box(${this._value})`; }
  toJSON(): T { return this._value; }

  satisfies(predicate: (value: T) => boolean): boolean {
    return predicate(this._value);
  }

  matches(matcher: (value: T) => boolean): Box<T> {
    if (!matcher(this._value)) throw new Error("Box.matches: value did not match");
    return this;
  }

  clone(): Box<T> { return this; }
}

// --- Factory ---

/** Wrap a value in an immutable Box */
export function box<T>(value: T): Box<T> { return new BoxImpl(value); }

/** Create a Box from a lazy factory */
export function lazyBox<T>(factory: () => T): Box<T> & { isComputed: () => boolean } {
  let computed = false;
  let cachedValue: T;
  const b = new BoxImpl(cachedValue ?? (undefined as T)) as Box<T> & { isComputed: () => boolean };
  Object.defineProperty(b, "isComputed", {
    get: () => computed,
  });
  Object.defineProperty(b, "value", {
    get: () => {
      if (!computed) { cachedValue = factory(); computed = true; }
      return cachedValue;
    },
  });
  return b;
}

/** Box a value only if it's not already a Box (identity for Box) */
export function ensureBox<T>(value: T | Box<T>): Box<T> {
  return value instanceof Box ? value : box(value);
}

/** Unbox a value, extracting from Box if needed */
export function unbox<T>(value: T | Box<T>): T {
  return value instanceof Box ? value.value : value;
}

// --- Box Combinators ---

/** Apply a function to a boxed value */
export function mapBox<T, U>(fn: (t: T) => U, boxed: Box<T>): Box<U> {
  return boxed.map(fn);
}

/** Chain operations through boxes */
export function chainBox<T>(initial: Box<T>, ...fns: Array<(v: T) => Box<T>>): Box<T> {
  let current = initial;
  for (const fn of fns) {
    current = current.map(fn);
  }
  return current;
}

/** Combine two boxes into a tuple box */
export function tupleBox<A, B>(a: Box<A>, b: Box<B>): Box<[A, B]> {
  return box([a.value, b.value]);
}

/** Flatten a box of arrays */
export function flattenBox<T>(boxed: Box<Box<T>[]> | T[]>): Box<T>[] {
  const val = boxed.value;
  if (Array.isArray(val)) return box(val.flat());
  return box([val].flat());
}

/** N-ary box — combine N boxes */
export function nAry<T>(...boxes: Box<T>[]): Box<T[]> {
  return box(boxes.map((b) => b.value));
}

/** Zip boxes together element-wise */
export function zipBoxes<A, B>(a: Box<A[]>, b: Box<B[]>): Box<Array<[A, B]>> {
  const av = a.value, bv = b.value;
  const len = Math.min(av.length, bv.length);
  const result: Array<[A, B]> = [];
  for (let i = 0; i < len; i++) result.push([av[i]!, bv[i]!]);
  return box(result);
}

/** Unzip a box of pairs back into two boxes */
export function unzipBoxes<T, U>(boxed: Box<Array<[T, U]>>): [Box<T[]>, Box<U[]>] {
  const pairs = boxed.value;
  const a: T[] = [], b: U[] = [];
  for (const [x, y] of pairs) { a.push(x); b.push(y); }
  return [box(a), box(b)];
}

/** Fold/reduce over a box's contents */
export function foldBox<T, A>(boxed: Box<T[]>, initial: A, fn: (acc: A, value: T) => A): A {
  return boxed.value.reduce(fn, initial);
}
