/**
 * Extended Either monad — error handling with rich combinators,
 * validation accumulation, async support, and pattern matching.
 */

// --- Types ---

interface Either<L, R> {
  isLeft(): boolean;
  isRight(): boolean;
  map<U>(fn: (r: R) => U): Either<L, U>;
  mapLeft<U>(fn: (l: L) => U): Either<U, R>;
  flatMap<U>(fn: (r: R) => Either<L, U>): Either<L, U>;
  flatMapLeft<U>(fn: (l: L) => Either<U, R>): Either<U, R>;
  bimap<L2, R2>(onLeft: (l: L) => L2, onRight: (r: R) => R2): Either<L2, R2>;
  fold<U>(onLeft: (l: L) => U, onRight: (r: R) => U): U;
  getOrElse(defaultValue: R): R;
  getOrThrow(errorFn?: (l: L) => Error): R;
  swap(): Either<R, L>;
  orElse(alternative: Either<L, R>): Either<L, R>;
  filter(predicate: (r: R) => boolean | string): Either<L | string, R>;
  caseOf<U>(patterns: { left?: (l: L) => U; right?: (r: R) => U }): U;
  toJSON(): { tag: "left" | "right"; value: L | R };
  match<U>(patterns: { Left: (l: L) => U; Right: (r: R) => U }): U;
  toString(): string;
}

// --- Constructors ---

class LeftImpl<L, R> implements Either<L, R> {
  constructor(private value: L) {}

  isLeft(): boolean { return true; }
  isRight(): boolean { return false; }

  map<U>(_fn: (r: R) => U): Either<L, U> { return this as unknown as Either<L, U>; }
  mapLeft<U>(fn: (l: L) => U): Either<U, R> { return new LeftImpl(fn(this.value)); }

  flatMap<U>(_fn: (r: R) => Either<L, U>): Either<L, U> { return this as unknown as Either<L, U>; }
  flatMapLeft<U>(fn: (l: L) => Either<U, R>): Either<U, R> { return fn(this.value); }

  bimap<L2, R2>(onLeft: (l: L) => L2): Either<L2, R2> { return new LeftImpl(onLeft(this.value)); }

  fold<U>(onLeft: (l: L) => U): U { return onLeft(this.value); }
  getOrElse(defaultValue: R): R { return defaultValue; }
  getOrThrow(errorFn?: (l: L) => Error): R { throw errorFn?.(this.value) ?? new Error(String(this.value)); }
  swap(): Either<R, L> { return new RightImpl(this.value); }
  orElse(_alternative: Either<L, R>): Either<L, R> { return this; }
  filter(_predicate: (r: R) => boolean | string): Either<L | string, R> { return this as unknown as Either<L | string, R>; }

  caseOf<U>(patterns: { left?: (l: L) => U }): U {
    return patterns.left?.(this.value) ?? undefined as U;
  }

  toJSON(): { tag: "left" | "right"; value: L | R } { return { tag: "left", value: this.value }; }
  match<U>(patterns: { Left: (l: L) => U }): U { return patterns.Left(this.value); }
  toString(): string { return `Left(${JSON.stringify(this.value)})`; }
}

class RightImpl<L, R> implements Either<L, R> {
  constructor(private value: R) {}

  isLeft(): boolean { return false; }
  isRight(): boolean { return true; }

  map<U>(fn: (r: R) => U): Either<L, U> { return new RightImpl(fn(this.value)); }
  mapLeft<U>(_fn: (l: L) => U): Either<U, R> { return this as unknown as Either<U, R>; }

  flatMap<U>(fn: (r: R) => Either<L, U>): Either<L, U> { return fn(this.value); }
  flatMapLeft<U>(_fn: (l: L) => Either<U, R>): Either<U, R> { return this as unknown as Either<U, R>; }

  bimap<R2>(onRight: (r: R) => R2): Either<L, R2> { return new RightImpl(onRight(this.value)); }

  fold<U>(_onLeft: (l: L) => U, onRight: (r: R) => U): U { return onRight(this.value); }
  getOrElse(_defaultValue: R): R { return this.value; }
  getOrThrow(): R { return this.value; }
  swap(): Either<R, L> { return new LeftImpl(this.value); }
  orElse(_alternative: Either<L, R>): Either<L, R> { return this; }

  filter(predicate: (r: R) => boolean | string): Either<L | string, R> {
    const result = predicate(this.value);
    if (result === true || result === undefined) return this as unknown as Either<L | string, R>;
    if (typeof result === "string") return new LeftImpl(result as unknown as L | string);
    return new LeftImpl(this.value as unknown as L);
  }

  caseOf<U>(patterns: { right?: (r: R) => U }): U {
    return patterns.right?.(this.value) ?? undefined as U;
  }

  toJSON(): { tag: "left" | "right"; value: L | R } { return { tag: "right", value: this.value }; }
  match<U>(patterns: { Right: (r: R) => U }): U { return patterns.Right(this.value); }
  toString(): string { return `Right(${JSON.stringify(this.value)})`; }
}

// --- Public API ---

/** Create a Left (error/failure) value */
export function Left<L, R>(value: L): Either<L, R> { return new LeftImpl(value); }

/** Create a Right (success) value */
export function Right<L, R>(value: R): Either<L, R> { return new RightImpl(value); }

/** Wrap a value that may be null/undefined into an Either */
export function fromNullable<L, R>(value: R | null | undefined, leftValue: L): Either<L, R> {
  return value == null ? Left(leftValue) : Right(value);
}

/** Try a function and wrap result in Either */
export function tryEither<L, R>(fn: () => R, onError: (e: unknown) => L): Either<L, R> {
  try { return Right(fn()); } catch (e) { return Left(onError(e)); }
}

/** Try an async function and wrap result in Either */
export async function tryEitherAsync<L, R>(
  fn: () => Promise<R>,
  onError: (e: unknown) => L,
): Promise<Either<L, R>> {
  try { return Right(await fn()); } catch (e) { return Left(onError(e)); }
}

/** Validate a value against multiple rules, accumulating errors */
export function validate<T, E>(
  value: T,
  rules: Array<{ check: (v: T) => boolean; error: E }>,
): Either<E[], T> {
  const errors: E[] = [];
  for (const rule of rules) {
    if (!rule.check(value)) errors.push(rule.error);
  }
  return errors.length > 0 ? Left(errors) : Right(value);
}

/** Run multiple Eithers and collect results */
export function sequence<L, R>(eithers: Either<L, R>[]): Either<L, R[]> {
  const results: R[] = [];
  for (const e of eithers) {
    if (e.isLeft()) return e as unknown as Either<L, R[]>;
    results.push(e as unknown as RightImpl<L, R>).value);
  }
  return Right(results);
}

/** Run multiple Eithers in parallel (keeps first success) */
export function race<L, R>(eithers: Either<L, R>[]): Either<L[], R> {
  const errors: L[] = [];
  for (const e of eithers) {
    if (e.isRight()) return e as unknown as Either<L[], R>;
    errors.push((e as unknown as LeftImpl<L, R>).value);
  }
  return Left(errors);
}

/** Chain operations through multiple transformation steps */
export function chain<L, R>(initial: Either<L, R>, ...fns: Array<(r: R) => Either<L, R>>): Either<L, R> {
  let current = initial;
  for (const fn of fns) {
    if (current.isLeft()) break;
    current = current.flatMap(fn);
  }
  return current;
}

/** Create an Either from a condition */
export function cond<L, R>(condition: boolean, onTrue: R, onFalse: L): Either<L, R> {
  return condition ? Right(onTrue) : Left(onFalse);
}

/** Check if value is an Either */
export function isEither(value: unknown): value is Either<unknown, unknown> {
  return typeof value === "object" && value !== null &&
    ("isLeft" in value) && ("isRight" in value);
}
