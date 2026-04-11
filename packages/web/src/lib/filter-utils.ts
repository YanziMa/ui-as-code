/**
 * Filter Utilities: Collection filtering, predicate composition,
 * unique extraction, grouping, sorting, pagination helpers, and
 * data transformation pipelines.
 */

// --- Types ---

export type Predicate<T> = (item: T) => boolean;
export type Comparator<T> = (a: T, b: T) => number;
export type Mapper<T, R> = (item: T) => R;
export type Reducer<T, A> = (acc: A, item: T) => A;

// --- Basic Filters ---

/** Filter array by predicate */
export function filter<T>(items: T[], pred: Predicate<T>): T[] {
  return items.filter(pred);
}

/** Reject items matching predicate (inverse of filter) */
export function reject<T>(items: T[], pred: Predicate<T>): T[] {
  return items.filter((item) => !pred(item));
}

/** Find first item matching predicate */
export function find<T>(items: T[], pred: Predicate<T>): T | undefined {
  return items.find(pred);
}

/** Find last item matching predicate */
export function findLast<T>(items: T[], pred: Predicate<T>): T | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (pred(items[i]!)) return items[i];
  }
  return undefined;
}

/** Check if any item matches predicate */
export function some<T>(items: T[], pred: Predicate<T>): boolean {
  return items.some(pred);
}

/** Check if all items match predicate */
export function every<T>(items: T[], pred: Predicate<T>): boolean {
  return items.every(pred);
}

/** Get index of first match */
export function findIndex<T>(items: T[], pred: Predicate<T>): number {
  return items.findIndex(pred);
}

// --- Composition ---

/** Combine predicates with AND logic */
export function and<T>(...preds: Predicate<T>[]): Predicate<T> {
  return (item) => preds.every((p) => p(item));
}

/** Combine predicates with OR logic */
export function or<T>(...preds: Predicate<T>[]): Predicate<T> {
  return (item) => preds.some((p) => p(item));
}

/** Negate a predicate */
export function not<T>(pred: Predicate<T>): Predicate<T> {
  return (item) => !pred(item);
}

/** Create a predicate that always returns true */
export const alwaysTrue = <T>() => (_item: T): true => true;

/** Create a predicate that always returns false */
export const alwaysFalse = <T>() => (_item: T): false => false;

// --- Value-Based Predicates ---

/** Equality check for a field path */
export function eq<T>(field: keyof T | string, value: unknown): Predicate<T> {
  return (item) => getVal(item, field) === value;
}

/** Not-equal check */
export function neq<T>(field: keyof T | string, value: unknown): Predicate<T> {
  return (item) => getVal(item, field) !== value;
}

/** Greater than */
export function gt<T>(field: keyof T | string, value: number): Predicate<T> {
  return (item) => Number(getVal(item, field)) > value;
}

/** Less than */
export function lt<T>(field: keyof T | string, value: number): Predicate<T> {
  return (item) => Number(getVal(item, field)) < value;
}

/** Greater or equal */
export function gte<T>(field: keyof T | string, value: number): Predicate<T> {
  return (item) => Number(getVal(item, field)) >= value;
}

/** Less or equal */
export function lte<T>(field: keyof T | string, value: number): Predicate<T> {
  return (item) => Number(getVal(item, field)) <= value;
}

/** String contains (case-insensitive) */
export function contains<T>(field: keyof T | string, substring: string): Predicate<T> {
  const lower = substring.toLowerCase();
  return (item) => String(getVal(item, field) ?? "").toLowerCase().includes(lower);
}

/** String starts with */
export function startsWith<T>(field: keyof T | string, prefix: string): Predicate<T> {
  const lower = prefix.toLowerCase();
  return (item) => String(getVal(item, field) ?? "").toLowerCase().startsWith(lower);
}

/** String ends with */
export function endsWith<T>(field: keyof T | string, suffix: string): Predicate<T> {
  const lower = suffix.toLowerCase();
  return (item) => String(getVal(item, field) ?? "").toLowerCase().endsWith(lower);
}

/** Matches regex */
export function matches<T>(field: keyof T | string, pattern: RegExp): Predicate<T> {
  return (item) => pattern.test(String(getVal(item, field) ?? ""));
}

/** Value is in array */
export function inList<T>(field: keyof T | string, values: unknown[]): Predicate<T> {
  return (item) => values.includes(getVal(item, field));
}

/** Value is not in array */
export function notInList<T>(field: keyof T | string, values: unknown[]): Predicate<T> {
  return (item) => !values.includes(getVal(item, field));
}

/** Value is null/undefined/empty string */
export function isEmpty<T>(field: keyof T | string): Predicate<T> {
  const v = (item: T) => {
    const val = getVal(item, field);
    return val === null || val === undefined || val === "";
  };
  return v;
}

/** Value exists (not null/undefined/empty) */
export function isNotEmpty<T>(field: keyof T | string): Predicate<T> {
  return not(isEmpty(field));
}

/** Value is between two numbers (inclusive) */
export function between<T>(field: keyof T | string, lo: number, hi: number): Predicate<T> {
  return (item) => {
    const val = Number(getVal(item, field));
    return !isNaN(val) && val >= lo && val <= hi;
  };
}

/** Type guard: value is a string */
export function isString<T>(field: keyof T | string): Predicate<T> {
  return (item) => typeof getVal(item, field) === "string";
}

/** Type guard: value is a number */
export function isNumber<T>(field: keyof T | string): Predicate<T> {
  return (item) => typeof getVal(item, field) === "number" && !isNaN(Number(getVal(item, field)));
}

/** Type guard: value is truthy */
export function isTruthy<T>(field: keyof T | string): Predicate<T> {
  return (item) => !!getVal(item, field);
}

// --- Unique / Distinct ---

/** Get unique values of a field from an array */
export function distinct<T, K extends keyof T>(items: T[], field?: K): T[] {
  if (!field) {
    const seen = new Set<T>();
    return items.filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  }
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const val = item[field];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

/** Extract unique values of a field as an array */
export function pluckUnique<T, K extends keyof T>(items: T[], field: K): T[K][] {
  const seen = new Set<T[K]>();
  const result: T[K][] = [];
  for (const item of items) {
    const val = item[field];
    if (!seen.has(val)) { seen.add(val); result.push(val); }
  }
  return result;
}

// --- Grouping ---

/** Group items by a field value */
export function groupBy<T, K extends keyof T>(items: T[], field: K): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();
  for (const item of items) {
    const key = item[field];
    let arr = map.get(key);
    if (!arr) { arr = []; map.set(key, arr); }
    arr.push(item);
  }
  return map;
}

/** Group items by the result of a mapper function */
export function groupByFn<T, K>(items: T[], fn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = fn(item);
    let arr = map.get(key);
    if (!arr) { arr = []; map.set(key, arr); }
    arr.push(item);
  }
  return map;
}

/** Count occurrences per group key */
export function countBy<T, K extends keyof T>(items: T[], field: K): Map<T[K], number> {
  const counts = new Map<T[K], number>();
  for (const item of items) {
    const key = item[field];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Partition array into two groups by predicate */
export function partition<T>(items: T[], pred: Predicate<T>): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (const item of items) {
    (pred(item) ? truthy : falsy).push(item);
  }
  return [truthy, falsy];
}

// --- Sorting ---

/** Sort by field (ascending) */
export function sortBy<T>(items: T[], field: keyof T | string): T[] {
  return [...items].sort((a, b) => compareValues(getVal(a, field), getVal(b, field)));
}

/** Sort by field (descending) */
export function sortByDesc<T>(items: T[], field: keyof T | string): T[] {
  return [...items].sort((a, b) => compareValues(getVal(b, field), getVal(a, field)));
}

/** Sort by multiple fields with direction */
export function multiSort<T>(
  items: T[],
  fields: Array<{ field: keyof T | string; order: "asc" | "desc" }>,
): T[] {
  return [...items].sort((a, b) => {
    for (const { field, order } of fields) {
      const cmp = order === "asc"
        ? compareValues(getVal(a, field), getVal(b, field))
        : compareValues(getVal(b, field), getVal(a, field));
      if (cmp !== 0) return cmp;
    }
    return 0;
  });
}

/** Natural sort (handles numbers within strings) */
export function naturalSort(items: string[]): string[] {
  return [...items].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// --- Pagination ---

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Paginate an array */
export function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}

// --- Transformation Pipeline ---

/** Chain multiple transformations over an array */
export function pipeline<T>(
  items: T[],
  ...ops: Array<(arr: T[]) => T[]>
): T[] {
  return ops.reduce((acc, op) => op(acc), items);
}

/** Map then filter in one pass */
export function filterMap<T, R>(items: T[], fn: (item: T) => R | undefined | null): R[] {
  const result: R[] = [];
  for (const item of items) {
    const mapped = fn(item);
    if (mapped != null) result.push(mapped);
  }
  return result;
}

/** Flatten one level */
export function flatten<T>(items: T[][]): T[] {
  return items.flat();
}

/** Flatten recursively */
export function deepFlatten<T>(items: unknown[]): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (Array.isArray(item)) {
      result.push(...deepFlatten(item));
    } else {
      result.push(item as T);
    }
  }
  return result;
}

/** Zip arrays together into tuples */
export function zip<T1, T2>(a: T1[], b: T2[]): [T1, T2][] {
  const len = Math.min(a.length, b.length);
  const result: [T1, T2][] = [];
  for (let i = 0; i < len; i++) result.push([a[i]!, b[i]!]);
  return result;
}

/** Chunk array into sub-arrays of given size */
export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/** Take first N items */
export function take<T>(items: T[], n: number): T[] {
  return items.slice(0, n);
}

/** Take last N items */
export function takeLast<T>(items: T[], n: number): T[] {
  return items.slice(-n);
}

/** Skip first N items */
export function skip<T>(items: T[], n: number): T[] {
  return items.slice(n);
}

/** Take while predicate holds */
export function takeWhile<T>(items: T[], pred: Predicate<T>): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (!pred(item)) break;
    result.push(item);
  }
  return result;
}

/** Drop while predicate holds */
export function dropWhile<T>(items: T[], pred: Predicate<T>): T[] {
  let i = 0;
  while (i < items.length && pred(items[i]!)) i++;
  return items.slice(i);
}

// --- Internal Helpers ---

function getVal<T>(item: T, field: keyof T | string): unknown {
  if (typeof field === "string" && field.includes(".")) {
    const parts = field.split(".");
    let current: unknown = item;
    for (const part of parts) {
      if (current == null) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
  return (item as Record<string, unknown>)[String(field)];
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a).toLowerCase();
  const sb = String(b).toLowerCase();
  return sa.localeCompare(sb);
}
