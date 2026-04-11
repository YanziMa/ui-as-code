/**
 * Runtime type checking utilities (type guards) for JavaScript/TypeScript values.
 * Provides isXxx() predicates for all primitive and common built-in types,
 * plus compound type guards, narrowing helpers, and schema-like validation.
 */

// --- Primitive Type Guards ---

/** Check if value is null or undefined */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** Check if value is not null and not undefined */
export function isNotNil(value: unknown): value is object | boolean | number | string | symbol | bigint {
  return value !== null && value !== undefined;
}

/** Check if value is a string (including empty string) */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/** Check if value is a non-empty string */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Check if value is a number (excluding NaN) */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value as number);
}

/** Check if value is an integer */
export function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

/** Check if value is a finite number (not Infinity/-Infinity/NaN) */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value as number);
}

/** Check if value is a float (non-integer number) */
export function isFloat(value: unknown): value is number {
  return isNumber(value) && !Number.isInteger(value);
}

/** Check if value is a boolean */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Check if value is a symbol */
export function isSymbol(value: unknown): value is symbol {
  return typeof value === "symbol";
}

/** Check if value is a bigint */
export function isBigInt(value: unknown): value is bigint {
  return typeof value === "bigint";
}

/** Check if value is a function */
export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

// --- Object Type Guards ---

/** Check if value is a plain object (not array, not null, not class instance) */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Check if value is any kind of object (including arrays, dates, etc.) */
export function isObject(value: unknown): value is object {
  return value !== null && typeof value === "object";
}

/** Check if value is an array */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Check if value is a non-empty array */
export function isNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}

/** Check if value is a Date object */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/** Check if value is a valid Date (not Invalid Date) */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/** Check if value is a RegExp */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

/** Check if value is an Error */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/** Check if value is a Map */
export function isMap(value: unknown): value is Map<unknown, unknown> {
  return value instanceof Map;
}

/** Check if value is a Set */
export function isSet(value: unknown): value is Set<unknown> {
  return value instanceof Set;
}

/** Check if value is a WeakMap */
export function isWeakMap(value: unknown): value is WeakMap<object, unknown> {
  return value instanceof WeakMap;
}

/** Check if value is a WeakSet */
export function isWeakSet(value: unknown): value is WeakSet<object> {
  return value instanceof WeakSet;
}

/** Check if value is an ArrayBuffer */
export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

/** Check if value is an ArrayBufferView (TypedArray) */
export function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return value !== null && typeof value === "object" && "buffer" in (value as object);
}

/** Check if value is a Promise */
export function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise || (isObject(value) && typeof (value as Promise<unknown>).then === "function");
}

// --- Numeric Range Guards ---

/** Check if value is a positive number (> 0) */
export function isPositive(value: unknown): value is number {
  return isNumber(value) && (value as number) > 0;
}

/** Check if value is a negative number (< 0) */
export function isNegative(value: unknown): value is number {
  return isNumber(value) && (value as number) < 0;
}

/** Check if value is zero */
export function isZero(value: unknown): value is number {
  return value === 0;

/** Check if value is in range [min, max] inclusive */
export function isInRange(value: unknown, min: number, max: number): boolean {
  return isNumber(value) && (value as number) >= min && (value as number) <= max;
}

/** Check if value is an even integer */
export function isEven(value: unknown): boolean {
  return isInteger(value) && (value as number) % 2 === 0;
}

/** Check if value is an odd integer */
export function isOdd(value: unknown): boolean {
  return isInteger(value) && (value as number) % 2 !== 0;
}

// --- String Pattern Guards ---

/** Check if string looks like an email address */
export function isEmailLike(value: unknown): value is string {
  return isString(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Check if string looks like a URL */
export function isUrlLike(value: unknown): value is string {
  if (!isString(value)) return false;
  try { new URL(value); return true; } catch { return false; }
}

/** Check if string is valid JSON */
export function isJsonString(value: unknown): value is string {
  if (!isString(value)) return false;
  try { JSON.parse(value); return true; } catch { return false; }
}

/** Check if string is all whitespace or empty */
export function isBlankString(value: unknown): boolean {
  return !isString(value) || value.trim().length === 0;
}

/** Check if string looks like a hex color (#RGB, #RRGGBB, #RRGGBBAA) */
export function isHexColor(value: unknown): value is string {
  return isString(value) && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

/** Check if string looks like an RGB/RGBA color string */
export function isRgbColorString(value: unknown): value is string {
  return isString(value) && /^rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0?\.\d+|1|0)\s*)?\)?$/.test(value);
}

// --- Empty / Existence Guards ---

/** Check if value is an empty string, empty array, empty object, or null/undefined */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (isString(value)) return value.length === 0;
  if (isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  if (isMap(value) || isSet(value)) return value.size === 0;
  return false;
}

/** Check if value has any content (inverse of isEmpty) */
export function hasContent(value: unknown): boolean {
  return !isEmpty(value);
}

// --- Instance Type Guards ---

/** Check if value has a specific property (own or inherited) */
export function hasProperty<T extends object>(value: unknown, key: keyof T | string): value is T {
  return isObject(value) && key in (value as object);
}

/** Check if value is an instance of a specific class */
export function isInstanceOf<T>(value: unknown, ctor: new (...args: any[]) => T): value is T {
  return value instanceof ctor;
}

// --- Array Element Type Guards ---

/** Check if array contains only strings */
export function isArrayOfStrings(value: unknown): value is string[] {
  return isArray(value) && (value as string[]).every(isString);
}

/** Check if array contains only numbers */
export function isArrayOfNumbers(value: unknown): value is number[] {
  return isArray(value) && (value as number[]).every(isNumber);
}

/** Check if array contains only objects */
export function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
  return isArray(value) && (value as object[]).every(isPlainObject);
}

/** Check if array contains only non-null values */
export function isCompactArray(value: unknown): value is unknown[] {
  return isArray(value) && (value as unknown[]).every((v) => v != null);
}

// --- Narrowing Helpers ---

/** Assert a type condition at runtime, throwing if it fails */
export function assertType<T>(
  condition: boolean,
  message = "Type assertion failed",
): asserts condition is T {
  if (!condition) throw new TypeError(message);
  return undefined as T;
}

/** Narrow unknown to a specific type if the guard passes, otherwise throw */
export function expectType<T>(
  value: unknown,
  guard: (v: unknown) => v is T,
  message?: string,
): T {
  if (!guard(value)) {
    throw new TypeError(message ?? `Expected ${typeof T}, got ${typeof value}`);
  }
  return value;
}
