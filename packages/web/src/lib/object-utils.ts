/**
 * Object utilities: deep merge, pick/omit, clone, path access,
 * transform, freeze, compare, and more.
 */

// --- Clone ---

/** Deep clone a plain object (JSON-safe values only) */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => deepClone(item)) as T;
  if (obj instanceof Date) return new Date(obj.getTime()) as T;
  if (obj instanceof Map) return new Map(Array.from(obj.entries()).map(([k, v]) => [k, deepClone(v)])) as T;
  if (obj instanceof Set) return new Set(Array.from(obj.values()).map((v) => deepClone(v))) as T;

  const cloned = {} as T;
  for (const key of Object.keys(obj)) {
    (cloned as Record<string, unknown>)[key] = deepClone((obj as Record<string, unknown>)[key]);
  }
  return cloned;
}

/** Shallow clone an object */
export function shallowClone<T extends object>(obj: T): T {
  if (Array.isArray(obj)) return [...obj] as T;
  return { ...obj };
}

// --- Pick / Omit ---

/** Pick specific keys from an object */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) (result as Record<string, unknown>)[String(key)] = obj[key];
  }
  return result;
}

/** Omit specific keys from an object */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj } as Omit<T, K>;
  for (const key of keys) {
    delete (result as Record<string, unknown>)[String(key)];
  }
  return result;
}

// --- Merge ---

/** Deep merge objects. Source values overwrite target. Arrays are replaced, not concatenated. */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  const result = { ...target };

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;

    for (const key of Object.keys(source)) {
      const sourceVal = (source as Record<string, unknown>)[key];
      const targetVal = (result as Record<string, unknown>)[key];

      if (
        sourceVal !== null &&
        typeof sourceVal === "object" &&
        !Array.isArray(sourceVal) &&
        targetVal !== null &&
        typeof targetVal === "object" &&
        !Array.isArray(targetVal)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetVal as object,
          sourceVal as object,
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceVal;
      }
    }
  }

  return result;
}

// --- Path Access ---

/** Get a nested value from an object using dot/bracket notation path */
export function get<T = unknown>(obj: Record<string, unknown>, path: string, defaultValue?: T): T {
  const keys = parsePath(path);
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== "object") return defaultValue ?? undefined as T;
    current = (current as Record<string, unknown>)[key] ?? defaultValue;
  }

  return current as T;
}

/** Set a nested value in an object using dot/bracket notation path */
export function set(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = parsePath(path);
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (!(key in current) || current[key] == null || typeof current[key] !== "object" || Array.isArray(current[key])) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]!] = value;
  return obj;
}

/** Check if a path exists in an object */
export function has(obj: Record<string, unknown>, path: string): boolean {
  const keys = parsePath(path);
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== "object") return false;
    if (!(key in (current as Record<string, unknown>))) return false;
    current = (current as Record<string, unknown>)[key];
  }

  return true;
}

/** Remove a nested property by path */
export function unset(obj: Record<string, unknown>, path: string): boolean {
  const keys = parsePath(path);
  let current: unknown = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (current == null || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[key];
    if (current == null || typeof current !== "object") return false;
  }

  const lastKey = keys[keys.length - 1]!;
  if (current != null && typeof current === "object" && lastKey in (current as Record<string, unknown>)) {
    delete (current as Record<string, unknown>)[lastKey];
    return true;
  }
  return false;
}

function parsePath(path: string): string[] {
  // Handle bracket notation like "a[0].b.c"
  return path
    .replace(/\[(\w+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
}

// --- Transform ---

/** Map object values through a transform function */
export function mapValues<T extends object, V>(
  obj: T,
  fn: (value: T[keyof T & string], key: keyof T & string) => V,
): Record<keyof T & string, V> {
  const result = {} as Record<keyof T & string, V>;
  for (const key of Object.keys(obj)) {
    result[key] = fn((obj as Record<string, T[keyof T]>)[key], key);
  }
  return result;
}

/** Map object keys through a transform function */
export function mapKeys<T extends object>(
  obj: T,
  fn: (key: keyof T & string) => string,
): Record<string, T[keyof T & string]> {
  const result = {} as Record<string, T[keyof T & string]>;
  for (const key of Object.keys(obj)) {
    result[fn(key)] = (obj as Record<string, T[keyof T]>)[key];
  }
  return result;
}

/** Filter object entries by a predicate */
export function filterEntries<T extends object>(
  obj: T,
  predicate: (value: T[keyof T & string], key: keyof T & string) => boolean,
): Partial<T> {
  const result = {} as Partial<T>;
  for (const key of Object.keys(obj)) {
    if (predicate((obj as Record<string, T[keyof T]>)[key], key)) {
      (result as Record<string, unknown>)[key] = (obj as Record<string, T[keyof T]>)[key];
    }
  }
  return result;
}

/** Invert an object (swap keys and values) */
export function invert<K extends string | number, V extends string | number>(
  obj: Record<K, V>,
): Record<V, K> {
  const result = {} as Record<V, K>;
  for (const [key, value] of Object.entries(obj)) {
    result[value as V] = key as K;
  }
  return result;
}

// --- Compare ---

/** Deep equality check for two values */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;

  if (Array.isArray(a)) {
    if (a.length !== (b as unknown[]).length) return false;
    return a.every((v, i) => deepEqual(v, (b as unknown[])[i]));
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) =>
    Object.prototype.hasOwnProperty.call(b, key) && deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key],
    ),
  );
}

// --- Query ---

/** Get all keys of an object (including inherited enumerable ones by default) */
export function allKeys(obj: object, ownOnly = true): string[] {
  return ownOnly ? Object.keys(obj) : [];
}

/** Check if object is empty (no own enumerable properties) */
export function isEmpty(obj: unknown): boolean {
  if (obj == null) return true;
  if (typeof obj !== "object") return false;
  if (Array.isArray(obj)) return obj.length === 0;
  return Object.keys(obj).length === 0;
}

/** Get the number of own enumerable properties */
export function size(obj: object): number {
  return Object.keys(obj).length;
}

// --- Freeze / Seal ---

/** Recursively freeze an object (deep freeze) */
export function deepFreeze<T>(obj: T): T {
  if (obj == null || typeof obj !== "object") return obj;

  Object.freeze(obj);

  if (Array.isArray(obj)) {
    for (const item of obj) deepFreeze(item);
  } else {
    for (const key of Object.keys(obj)) {
      deepFreeze((obj as Record<string, unknown>)[key]);
    }
  }

  return obj;
}

// --- Group By ---

/** Group array items by a key derived from each item */
export function groupBy<T, K extends string | number | symbol>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  const result = {} as Record<K, T[]>;

  for (const item of items) {
    const key = keyFn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }

  return result;
}

/** Count occurrences of each unique key from items */
export function countBy<T, K extends string | number | symbol>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, number> {
  const result = {} as Record<K, number>;

  for (const item of items) {
    const key = keyFn(item);
    result[key] = (result[key] ?? 0) + 1;
  }

  return result;
}

/** Index items by a key (last item wins on duplicate keys) */
export function indexBy<T, K extends string | number | symbol>(
  items: T[],
  keyFn: (item: T) => K,
): Record<K, T> {
  const result = {} as Record<K, T>;

  for (const item of items) {
    result[keyFn(item)] = item;
  }

  return result;
}

// --- Key / Value Extraction ---

/** Extract all values from an object as an array */
export function values<T extends object>(obj: T): T[keyof T & string][] {
  return Object.values(obj) as T[keyof T & string][];
}

/** Extract all keys from an object as an array */
export function keys<T extends object>(obj: T): (keyof T & string)[] {
  return Object.keys(obj) as (keyof T & string)[];
}

/** Convert an object to an array of [key, value] tuples */
export function toPairs<T extends object>(obj: T): Array<[keyof T & string, T[keyof T & string]]> {
  return Object.entries(obj) as Array<[keyof T & string, T[keyof T & string]]>;
}

/** Convert [key, value] tuples back to an object */
export function fromPairs<K extends string | number | symbol, V>(pairs: Array<[K, V]>): Record<K, V> {
  const result = {} as Record<K, V>;
  for (const [key, value] of pairs) {
    result[key] = value;
  }
  return result;
}

// --- Defaults ---

/** Fill in missing properties with defaults */
export function defaults<T extends object, D extends Partial<T>>(obj: T, defaultsObj: D): T & D {
  return { ...defaultsObj, ...obj };
}

/** Ensure a value exists at a path, setting default if missing */
export function ensurePath(obj: Record<string, unknown>, path: string, defaultValue: unknown): unknown {
  if (!has(obj, path)) {
    set(obj, path, defaultValue);
  }
  return get(obj, path, defaultValue);
}
