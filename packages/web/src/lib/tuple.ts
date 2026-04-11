/**
 * Tuple utilities — creation, pattern matching, mapping, concatenation,
 * splitting, and type-safe operations on fixed-length arrays.
 */

// --- Types ---

export type TupleOf<T, N extends number> = N extends N
  ? number extends N ? T[]
  : _TupleOf<T, N, []>
  : never;

type _TupleOf<T, N extends number, R extends unknown[]> =
  R["length"] extends N ? R
  : _TupleOf<T, N, [...R, T]>;

// --- Creation ---

/** Create a tuple of length 2 */
export function tuple2<A, B>(a: A, b: B): [A, B] { return [a, b]; }

/** Create a tuple of length 3 */
export function tuple3<A, B, C>(a: A, b: B, c: C): [A, B, C] { return [a, b, c]; }

/** Create a tuple of length 4 */
export function tuple4<A, B, C, D>(a: A, b: B, c: C, d: D): [A, B, C, D] { return [a, b, c, d]; }

/** Create a tuple from an array (type-safe wrapper) */
export function fromArray<T>(arr: T[]): T[] { return arr; }

/** Create a singleton tuple */
export function singleton<T>(value: T): [T] { return [value]; }

/** Create an empty tuple */
export function empty(): [] { return []; }

// --- Accessors ---

/** Get first element of a tuple */
export function first<T extends unknown[]>(t: T): T[0] { return t[0]; }

/** Get last element of a tuple */
export function last<T extends unknown[]>(t: T): T[Extract<keyof T, `${number}`>] {
  return t[t.length - 1] as T[Extract<keyof T, `${number}`>];
}

/** Get head (all but last) */
export function head<T extends unknown[]>(t: T): T extends [infer _, ...infer Rest] ? Rest : never {
  return t.slice(0, -1) as T extends [infer _, ...infer Rest] ? Rest : never;
}

/** Get tail (all but first) */
export function tail<T extends unknown[]>(t: T): T extends [...infer _, infer Last] ? [Last] : never {
  return t.slice(1) as T extends [...infer _, infer Last] ? [Last] : never;
}

/** Get element at index (negative indices from end) */
export function at<T extends unknown[]>(t: T, idx: number): T[number] {
  const i = idx < 0 ? t.length + idx : idx;
  return t[i] as T[number];
}

// --- Pattern Matching ---

/** Match a tuple by length and extract elements */
export function match<T extends unknown[], R>(
  t: T,
  cases: {
    0?: () => R;
    1?: (a: T[0]) => R;
    2?: (a: T[0], b: T[1]) => R;
    3?: (a: T[0], b: T[1], c: T[2]) => R;
    4?: (a: T[0], b: T[1], c: T[2], d: T[3]) => R;
    _:? () => R;
  },
): R {
  switch (t.length) {
    case 0: return cases[0]?.() ?? cases._?.() ?? undefined as R;
    case 1: return cases[1]?.(t[0]) ?? cases._?.() ?? undefined as R;
    case 2: return cases[2]?.(t[0], t[1]) ?? cases._?.() ?? undefined as R;
    case 3: return cases[3]?.(t[0], t[1], t[2]) ?? cases._?.() ?? undefined as R;
    case 4: return cases[4]?.(t[0], t[1], t[2], t[3]) ?? cases._?.() ?? undefined as R;
    default: return cases._?.() ?? undefined as R;
  }
}

// --- Transformation ---

/** Map over all elements of a tuple */
export function mapTuple<T extends unknown[], U>(
  t: T,
  fn: (v: T[number], idx: number) => U,
): U[] {
  return t.map(fn) as U[];
}

/** Map each element with a separate mapper per position */
export function zipMap<
  T extends unknown[],
  Fns extends { [K in keyof T]: (v: T[K]) => unknown },
>(t: T, fns: Fns): { [K in keyof T]: ReturnType<Fns[K & keyof Fns]> } {
  const result = {} as { [K in keyof T]: ReturnType<Fns[K & keyof Fns]> };
  const entries = Object.entries(fns) as Array<[string, (v: unknown) => unknown]>;
  for (let i = 0; i < entries.length; i++) {
    const [k, fn] = entries[i]!;
    (result as Record<string, unknown>)[k] = fn(t[i as keyof T & number]);
  }
  return result;
}

/** Reverse a tuple */
export function reverse<T extends unknown[]>(t: T): T {
  return [...t].reverse() as T;
}

/** Flatten nested tuples one level */
export function flatten<T extends unknown[]>(t: T): T[number][] {
  return t.flat() as T[number][];
}

/** Sort a tuple (returns array — sorting may change meaning) */
export function sortTuple<T extends number[] | string[]>(t: T, compareFn?: (a: T[number], b: T[number]) => number): T {
  return [...t].sort(compareFn) as T;
}

// --- Combination ---

/** Concatenate two tuples */
export function concat<A extends unknown[], B extends unknown[]>(a: A, b: B): [...A, ...B] {
  return [...a, ...b] as [...A, ...B];
}

/** Prepend element to tuple */
export function prepend<T, A extends unknown[]>(item: T, arr: A): [T, ...A] {
  return [item, ...arr] as [T, ...A];
}

/** Append element to tuple */
export function append<A extends unknown[], T>(arr: A, item: T): [...A, T] {
  return [...arr, item] as [...A, T];
}

/** Zip two tuples together into pairs */
export function zip<A extends unknown[], B extends unknown[]>(a: A, b: B): Array<[A[number], B[number]]> {
  const len = Math.min(a.length, b.length);
  const result: Array<[A[number], B[number]>] = [];
  for (let i = 0; i < len; i++) result.push([a[i]!, b[i]!]);
  return result;
}

/** Unzip pairs into two tuples */
export function unzip<T, U>(pairs: Array<[T, U]>): [T[], U[]] {
  const a: T[] = [], b: U[] = [];
  for (const [x, y] of pairs) { a.push(x); b.push(y); }
  return [a, b];
}

// --- Splitting ---

/** Split at index */
export function splitAt<T extends unknown[]>(t: T, idx: number): [T extends unknown[] ? Slice<T, 0, idx> : never, T extends unknown[] ? Slice<T, idx> : never] {
  return [t.slice(0, idx), t.slice(idx)] as [
    T extends unknown[] ? Slice<T, 0, idx> : never,
    T extends unknown[] ? Slice<T, idx> : never,
  ];
}

// Internal slice helper
type Slice<T, S extends number, E extends number = T["length"]> = T extends readonly (infer A)[]
  ? A[] extends { length: infer L } ? L extends E ? T : T extends { slice(start: S, end: E): infer R } ? R : never : never
  : never;

/** Take first N elements */
export function take<T extends unknown[]>(t: T, n: number): T {
  return t.slice(0, n) as T;
}

/** Drop first N elements */
export function drop<T extends unknown[]>(t: T, n: number): unknown[] {
  return t.slice(n);
}

// --- Predicates ---

/** Check if tuple contains a value */
export function includes<T extends unknown[]>(t: T, value: unknown): boolean {
  return t.includes(value);
}

/** Find index of value in tuple */
export function indexOf<T extends unknown[]>(t: T, value: T[number]): number {
  return t.indexOf(value);
}

/** Check if every element satisfies predicate */
export function every<T extends unknown[]>(t: T, predicate: (v: T[number]) => boolean): boolean {
  return t.every(predicate);
}

/** Check if any element satisfies predicate */
export function some<T extends unknown[]>(t: T, predicate: (v: T[number]) => boolean): boolean {
  return t.some(predicate);
}

/** Find element matching predicate */
export function find<T extends unknown[]>(t: T, predicate: (v: T[number]) => boolean): T[number] | undefined {
  return t.find(predicate);
}

/** Count elements matching predicate */
export function countIf<T extends unknown[]>(t: T, predicate: (v: T[number]) => boolean): number {
  return t.filter(predicate).length;
}

// --- Reduction ---

/** Reduce tuple to single value */
export function reduce<T extends unknown[], R>(
  t: T,
  fn: (acc: R, val: T[number], idx: number) => R,
  initial: R,
): R {
  return t.reduce(fn, initial);
}

/** Reduce from left without initial (uses first element) */
export function reduce1<T extends [unknown, ...unknown[]]>(
  t: T,
  fn: (acc: T[0], val: T[number], idx: number) => T[0],
): T[0] {
  return t.reduce(fn);
}
