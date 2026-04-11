/**
 * Data Transform Utilities: Object/array transformation, mapping, filtering,
 * grouping, sorting, flattening, picking/omitting, deep merge,
 * path-based access, and data normalization.
 */

// --- Types ---

export type Primitive = string | number | boolean | null;
export type DataValue = Primitive | DataObject | DataArray | Date;
export interface DataObject { [key: string]: DataValue }
export type DataArray = DataValue[];

/** Path segment: string key or numeric index */
export type PathSegment = string | number;

// --- Path Access ---

/** Get a nested value from an object using a dot-notation path */
export function get<T = unknown>(obj: Record<string, unknown>, path: string): T | undefined {
  const segments: PathSegment[] = parsePath(path);
  let current: unknown = obj;

  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[String(seg)];
  }

  return current as T | undefined;
}

/** Set a nested value using a dot-notation path. Creates intermediate objects as needed. */
export function set(obj: Record<string, unknown>, path: string, value: unknown): void {
  const segments: PathSegment[] = parsePath(path);
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = String(segments[i]!);
    let next = current[seg];

    if (next === undefined || next === null) {
      // Check if next segment is a number (array index)
      next = typeof segments[i + 1] === "number" ? [] : {};
      current[seg] = next;
    }

    if (typeof next !== "object" || Array.isArray(next)) {
      // Can't traverse further — overwrite
      current[seg] = typeof segments[i + 1] === "number" ? [] : {};
      next = current[seg];
    }

    current = next as Record<string, unknown>;
  }

  current[String(segments[segments.length - 1]!)] = value;
}

/** Check if a path exists in an object */
export function has(obj: Record<string, unknown>, path: string): boolean {
  return get(obj, path) !== undefined;
}

/** Delete a nested property by path. Returns true if deleted */
export function unset(obj: Record<string, unknown>, path: string): boolean {
  const segments: PathSegment[] = parsePath(path);
  if (segments.length === 0) return false;

  let current: unknown = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (current == null || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[String(segments[i])!];
    if (current === undefined) return false;
  }

  if (current == null || typeof current !== "object") return false;
  return delete (current as Record<string, unknown>)[String(segments[segments.length - 1]!)];
}

/** Parse a dot-notation path into segments */
export function parsePath(path: string): PathSegment[] {
  if (!path) return [];
  return path.split(".").map((seg) => {
    const num = Number(seg);
    return isNaN(num) ? seg : num;
  });
}

// --- Object Transformation ---

/** Pick specific keys from an object */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/** Omit specific keys from an object */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/** Rename a key in an object */
export function renameKey<T extends Record<string, unknown>>(
  obj: T,
  oldKey: string,
  newKey: string,
): Record<string, unknown> {
  const result = { ...obj };
  if (oldKey in result && !(newKey in result)) {
    result[newKey] = result[oldKey];
    delete result[oldKey];
  }
  return result;
}

/** Deep clone a plain object (JSON-safe values only) */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Deep merge two objects. Later sources override earlier ones. */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;

  const source = sources[0]!;
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (
      isPlainObject(sourceVal) &&
      isPlainObject(targetVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else if (sourceVal !== undefined) {
      (result as Record<string, unknown>)[key] = sourceVal;
    }
  }

  // Recurse with remaining sources
  if (sources.length > 1) {
    return deepMerge(result, ...sources.slice(1));
  }

  return result;
}

/** Check if value is a plain object (not array, not null) */
function isPlainObject(val: unknown): val is Record<string, unknown> {
  return (
    val !== null &&
    typeof val === "object" &&
    !Array.isArray(val) &&
    Object.prototype.toString.call(val) === "[object Object]"
  );
}

// --- Array Transformation ---

/** Map over array elements with optional index */
export function mapArray<T, U>(arr: T[], fn: (item: T, index: number) => U): U[] {
  return arr.map(fn);
}

/** Filter array with type-safe predicate */
export function filterArray<T>(arr: T[], predicate: (item: T, index: number) => boolean): T[] {
  return arr.filter(predicate);
}

/** Find first element matching predicate */
export function findArray<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
  return arr.find(predicate);
}

/** Group array items by a key function */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key]!.push(item);
  }
  return groups;
}

/** Count occurrences of each unique value */
export function countBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of arr) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

/** Sort array by a key function (stable) */
export function sortBy<T>(arr: T[], keyFn: (item: T) => string | number, direction: "asc" | "desc" = "asc"): T[] {
  return [...arr].sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    if (ka < kb) return direction === "asc" ? -1 : 1;
    if (ka > kb) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

/** Unique/deduplicate array (preserves order) */
export function uniq<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  return arr.filter((item) => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

/** Partition array into two arrays based on predicate */
export function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (const item of arr) {
    (predicate(item) ? truthy : falsy).push(item);
  }
  return [truthy, falsy];
}

/** Flatten nested arrays recursively */
export function flatten<T>(arr: unknown[]): T[] {
  const result: T[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...flatten<T>(item));
    } else {
      result.push(item as T);
    }
  }
  return result;
}

/** Chunk array into sub-arrays of given size */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Zip multiple arrays together into tuples */
export function zip<T>(...arrays: T[][]): T[][] {
  const len = Math.min(...arrays.map((a) => a.length));
  const result: T[][] = [];
  for (let i = 0; i < len; i++) {
    result.push(arrays.map((a) => a[i]!));
  }
  return result;
}

/** Reverse an array (immutable) */
export function reverse<T>(arr: T[]): T[] {
  return [...arr].reverse();
}

/** Sample N random items from array */
export function sample<T>(arr: T[], n = 1): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

/** Shuffle array (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

// --- Key/Value Operations ---

/** Extract all values from an object as array */
export function values<T = unknown>(obj: Record<string, T>): T[] {
  return Object.values(obj);
}

/** Extract all keys from an object as array */
export function keys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj);
}

/** Convert entries array to object */
export function fromEntries<K extends string, V>(entries: [K, V][]): Record<K, V> {
  return Object.fromEntries(entries);
}

/** Map object keys using a transform function */
export function mapKeys<T extends Record<string, unknown>>(
  obj: T,
  fn: (key: string, value: unknown) => string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[fn(key, value)] = value;
  }
  return result;
}

/** Map object values using a transform function */
export function mapValues<T extends Record<string, unknown>>(
  obj: T,
  fn: (value: unknown, key: string) => unknown,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = fn(value, key);
  }
  return result;
}

/** Filter object entries by predicate */
export function filterEntries<T extends Record<string, unknown>>(
  obj: T,
  fn: (key: string, value: unknown) => boolean,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (fn(key, value)) result[key] = value;
  }
  return result;
}

/** Invert an object (swap keys and values, values must be stringifiable) */
export function invert(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[String(value)] = key;
  }
  return result;
}
