/**
 * Type Utilities: Runtime type checking, type guards, type casting,
 * schema validation, type narrowing, generic helpers, and reflection-like
 * utilities for JavaScript/TypeScript types.
 */

// --- Type Guards ---

/** Check if value is null or undefined */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** Check if value is not null or undefined */
export function isNotNil<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** Check if value is a plain object (not array, not null) */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Check if value is a non-empty string */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** Check if value is a number (excluding NaN) */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value as number);
}

/** Check if value is an integer */
export function isInteger(value: unknown): value is number {
  return Number.isInteger(value as number);
}

/** Check if value is a finite number */
export function isFinite(value: unknown): value is number {
  return typeof value === "value" ? false : Number.isFinite(value as number);
}

/** Check if value is a boolean */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/** Check if value is a function */
export function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

/** Check if value is an array */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Check if value is a Date object */
export function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

/** Check if value is a valid Date (not Invalid Date) */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/** Check if value is a RegExp */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

/** Check if value is an Error or has error-like shape */
export function isError(value: unknown): value is Error {
  return value instanceof Error ||
    (isPlainObject(value) && "message" in (value as Record<string, unknown>) && "stack" in (value as Record<string, unknown>));
}

/** Check if value is a Promise */
export function isPromise(value: unknown): value is Promise<unknown> {
  return value !== null && typeof value === "object" && "then" in (value as Record<string, unknown>) && typeof (value as Promise<unknown>).then === "function";
}

/** Check if value is an async iterable */
export function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return value != null && typeof (value as Record<string, unknown>).[Symbol.asyncIterator] === "function";
}

/** Check if value is iterable (but not string) */
export function isIterable(value: unknown): value is Iterable<unknown> {
  return value != null && typeof value === "object" && (Symbol.iterator in (value as Record<string, unknown>) || Array.isArray(value)) && typeof value !== "string";
}

// --- Type Casting ---

/** Safely cast to string */
export function toString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "toString" in (value as object)) return (value as object).toString();
  return String(value);
}

/** Safely cast to number */
export function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isNaN(num) ? fallback : num;
}

/** Safely cast to integer */
export function toInt(value: unknown, fallback = 0): number {
  const num = parseInt(String(value ?? ""), 10);
  return Number.isNaN(num) ? fallback : num;
}

/** Safely cast to float */
export function toFloat(value: unknown, fallback = 0): number {
  const num = parseFloat(String(value ?? ""));
  return Number.isNaN(num) ? fallback : num;
}

/** Safely cast to boolean */
export function toBoolean(value: unknown): boolean {
  if (value === "false" || value === "0" || value === "" || value === null || value === undefined) return false;
  return Boolean(value);
}

/** Safely cast to array (wraps non-array, flattens nested arrays one level) */
export function toArray<T>(value: T | T[]): T[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

// --- Type Schema Validation ---

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  path: string;
}

export interface TypeSchema {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object" | "null" | "any"
    | "date" | "email" | "url" | "enum";
  required?: boolean;
  items?: TypeSchema;           // For arrays
  properties?: Record<string, TypeSchema>; // For objects
  enum?: unknown[];              // For enum type
  min?: number;
  max?: number;
  pattern?: string;              // Regex pattern for strings
  custom?: (value: unknown) => string | null; // Custom validator
}

/** Validate a value against a type schema */
export function validateType(value: unknown, schema: TypeSchema): SchemaValidationResult {
  const errors: string[] = [];
  const path = "";

  function validate(v: unknown, s: TypeSchema, currentPath: string): void {
    // Null check
    if (v === null || v === undefined) {
      if (s.type !== "null" && s.type !== "any") {
        if (s.required) errors.push(`${currentPath}: Required but got ${v}`);
      }
      return;
    }

    switch (s.type) {
      case "string":
        if (typeof v !== "string") errors.push(`${currentPath}: Expected string, got ${typeof v}`);
        else if (s.min !== undefined && v.length < s.min) errors.push(`${currentPath}: String too short (${v.length} < ${s.min})`);
        else if (s.max !== undefined && v.length > s.max) errors.push(`${currentPath}: String too long (${v.length} > ${s.max})`);
        else if (s.pattern && !new RegExp(s.pattern).test(v)) errors.push(`${currentPath}: Does not match pattern ${s.pattern}`);
        break;

      case "number":
      case "integer":
        if (typeof v !== "number" || Number.isNaN(v as number)) errors.push(`${currentPath}: Expected number, got ${typeof v}`);
        else if (s.type === "integer" && !Number.isInteger(v)) errors.push(`${currentPath}: Expected integer`);
        else if (s.min !== undefined && (v as number) < s.min) errors.push(`${currentPath}: Below minimum (${v} < ${s.min})`);
        else if (s.max !== undefined && (v as number) > s.max) errors.push(`${currentPath}: Above maximum (${v} > ${s.max})`);
        break;

      case "boolean":
        if (typeof v !== "boolean") errors.push(`${currentPath}: Expected boolean, got ${typeof v}`);
        break;

      case "array":
        if (!Array.isArray(v)) errors.push(`${currentPath}: Expected array, got ${typeof v}`);
        else {
          if (s.min !== undefined && (v as unknown[]).length < s.min) errors.push(`${currentPath}: Array too short`);
          if (s.max !== undefined && (v as unknown[]).length > s.max) errors.push(`${currentPath}: Array too long`);
          if (s.items) {
            (v as unknown[]).forEach((item, i) => validate(item, s.items!, `${currentPath}[${i}]`));
          }
        }
        break;

      case "object":
        if (!isPlainObject(v) || Array.isArray(v)) errors.push(`${currentPath}: Expected object, got ${typeof v}`);
        else if (s.properties) {
          for (const [key, propSchema] of Object.entries(s.properties)) {
            validate((v as Record<string, unknown>)[key], propSchema, `${currentPath}.${key}`);
          }
        }
        break;

      case "date":
        if (!(v instanceof Date) || isNaN(v.getTime())) errors.push(`${currentPath}: Expected date, got ${typeof v}`);
        break;

      case "email":
        if (typeof v !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push(`${currentPath}: Invalid email format`);
        break;

      case "url":
        try { new URL(typeof v === "string" ? v : ""); } catch { errors.push(`${currentPath}: Invalid URL`); }
        break;

      case "enum":
        if (!s.enum?.includes(v)) errors.push(`${currentPath}: Not one of allowed values`);
        break;

      case "any":
        break; // Accept anything
    }

    // Custom validator
    if (s.custom) {
      const result = s.custom(v);
      if (result) errors.push(`${currentPath}: ${result}`);
    }
  }

  validate(value, schema, path);

  return {
    valid: errors.length === 0,
    errors,
    path,
  };
}

// --- Generic Helpers ---

/** Get the constructor name of a value */
export function getConstructorName(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  const proto = Object.getPrototypeOf(value);
  return proto?.constructor?.name ?? "Unknown";
}

/** Get the type of a value as a string tag */
export function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  if (type === "object") {
    if (value instanceof Date) return "date";
    if (value instanceof RegExp) return "regexp";
    if (value instanceof Map) return "map";
    if (value instanceof Set) return "set";
    if (value instanceof Error) return "error";
    return "object";
  }
  return type;
}

/** Deep clone a value (handles basic types, dates, arrays, plain objects) */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(deepClone) as unknown as T;
  if (value instanceof Map) return new Map(Array.from(value.entries()).map(([k, v]) => [k, deepClone(v)]));
  if (value instanceof Set) new Set(Array.from(value).map(deepClone));

  const cloned = {} as T;
  for (const key of Object.keys(value)) {
    (cloned as Record<string, unknown>)[key] = deepClone((value as Record<string, unknown>)[key]!);
  }
  return cloned;
}

/** Deep freeze an object (recursively freezes all nested objects) */
export function deepFreeze<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

/** Deep merge two objects (later values win for primitives, arrays are replaced) */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Partial<Record<string, unknown>>,
      );
    } else if (sourceVal !== undefined) {
      (result as Record<string, unknown>)[key] = sourceVal;
    }
  }
  return result;
}
