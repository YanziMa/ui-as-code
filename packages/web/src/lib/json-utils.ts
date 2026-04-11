/**
 * JSON Utilities: Query, transform, traverse, merge, and manipulate
 * JSON data with path expressions, deep operations, and immutable
 * update patterns.
 *
 * Provides:
 *   - Dot/bracket-notation path access (get/set/update/remove)
 *   - Deep merge with array/object strategies
 *   - Immutable updates (clone-and-set pattern)
 *   - JSON traversal (walk, map, filter)
 *   - Flatten/unflatten nested objects
 *   - Object/array transformation utilities
 *   - Type guards for JSON values
 */

// --- Types ---

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject { [key: string]: JsonValue }
export type JsonArray = JsonValue[];

export type PathSegment = string | number;
export type JsonPath = PathSegment[];

// --- Path Utilities ---

/** Parse a dot/bracket notation path into segments */
export function parsePath(path: string): JsonPath {
  if (!path || path === "." || path === "$") return [];

  const segments: JsonPath = [];
  const regex = /\.?([^.[\]]+)|\[(\d+|[^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(path)) !== null) {
    const part = match[1] ?? match[2];
    if (part !== undefined) {
      // Numeric strings become numbers (array indices)
      segments.push(/^\d+$/.test(part) ? parseInt(part, 10) : part);
    }
  }

  return segments;
}

/** Serialize a path array back to dot notation */
export function stringifyPath(path: JsonPath): string {
  return path.map((seg) =>
    typeof seg === "number" ? `[${seg}]` : /[.\[\]]/.test(seg) ? `["${seg}"]` : `.${seg}`,
  ).join("").replace(/^\./, "");
}

// --- Get/Set/Update/Remove ---

/** Get a value at a path within a JSON structure */
export function get<T = JsonValue>(data: JsonValue, path: string | JsonPath): T | undefined {
  const segments = Array.isArray(path) ? path : parsePath(path);
  let current: unknown = data;

  for (const segment of segments) {
    if (current === undefined || current === null) return undefined;

    if (typeof segment === "number") {
      current = Array.isArray(current) ? current[segment] : undefined;
    } else {
      current = typeof current === "object" ? (current as Record<string, unknown>)[segment] : undefined;
    }
  }

  return current as T | undefined;
}

/** Check if a path exists in the data */
export function has(data: JsonValue, path: string | JsonPath): boolean {
  return get(data, path) !== undefined;
}

/** Set a value at a path (mutates original — for immutable use setImmutable) */
export function set(data: JsonValue, path: string | JsonPath, value: JsonValue): JsonValue {
  const segments = Array.isArray(path) ? path : parsePath(path);

  if (segments.length === 0) return value;

  let current: JsonValue = data;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    const nextSegment = segments[i + 1]!;
    const isNextArrayIndex = typeof nextSegment === "number";

    if (typeof segment === "number") {
      if (!Array.isArray(current)) return data;
      if (current[segment] === undefined) {
        (current as JsonArray)[segment] = isNextArrayIndex ? [] : {};
      }
      current = current[segment]!;
    } else {
      if (!current || typeof current !== "object" || Array.isArray(current)) return data;
      if ((current as JsonObject)[segment] === undefined) {
        (current as JsonObject)[segment] = isNextArrayIndex ? [] : {};
      }
      current = (current as JsonObject)[segment]!;
    }
  }

  const lastSegment = segments[segments.length - 1]!;
  if (typeof lastSegment === "number") {
    if (!Array.isArray(current)) return data;
    (current as JsonArray)[lastSegment] = value;
  } else {
    if (!current || typeof current !== "object") return data;
    (current as JsonObject)[lastSegment] = value;
  }

  return data;
}

/** Set a value immutably (returns new object without mutating input) */
export function setImmutable<T = JsonValue>(data: T, path: string | JsonPath, value: JsonValue): T {
  const segments = Array.isArray(path) ? path : parsePath(path);
  if (segments.length === 0) return value as T;

  const cloned = deepClone(data) as T;
  set(cloned as JsonValue, segments, value);
  return cloned;
}

/** Remove a value at a path (mutates) */
export function remove(data: JsonValue, path: string | JsonPath): JsonValue {
  const segments = Array.isArray(path) ? path : parsePath(path);
  if (segments.length === 0) return data;

  let current: JsonValue = data;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!;
    if (typeof segment === "number") {
      current = Array.isArray(current) ? current[segment]! : data;
    } else {
      current = (current?.[segment] as JsonValue) ?? data;
    }
  }

  const lastSegment = segments[segments.length - 1]!;
  if (Array.isArray(current) && typeof lastSegment === "number") {
    current.splice(lastSegment, 1);
  } else if (current && typeof current === "object" && !Array.isArray(current) && typeof lastSegment === "string") {
    delete (current as JsonObject)[lastSegment];
  }

  return data;
}

/** Remove a value immutably */
export function removeImmutable<T = JsonValue>(data: T, path: string | JsonPath): T {
  const cloned = deepClone(data) as T;
  remove(cloned as JsonValue, path);
  return cloned;
}

/** Update a value at a path using an updater function (immutable) */
export function update<T = JsonValue>(
  data: T,
  path: string | JsonPath,
  updater: (current: T | undefined) => T,
): T {
  const existing = get<T>(data as JsonValue, path);
  return setImmutable(data, path, updater(existing));
}

// --- Deep Clone ---

/** Deep clone a JSON-compatible value */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => deepClone(v)) as unknown as T;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) result[k] = deepClone(v);
  return result as T;
}

// --- Merge ---

/** Deep merge source into target. Arrays are concatenated by default. */
export function deepMerge(target: JsonValue, source: JsonValue, options?: { arrays?: "replace" | "concat" | "merge" }): JsonValue {
  const { arrays = "concat" } = options ?? {};

  if (source === null || source === undefined) return target;
  if (target === null || target === undefined) return source;

  if (Array.isArray(source) && Array.isArray(target)) {
    switch (arrays) {
      case "replace": return [...source];
      case "concat": return [...target, ...source];
      case "merge":
        return source.map((s, i) =>
          i < target.length && typeof s === "object" && typeof target[i] === "object"
            ? deepMerge(target[i]!, s, { arrays })
            : s,
        );
    }
  }

  if (typeof source === "object" && typeof target === "object" && !Array.isArray(source) && !Array.isArray(target)) {
    const result = { ...target };
    for (const [key, srcVal] of Object.entries(source)) {
      const tgtVal = (target as JsonObject)[key];
      result[key] =
        srcVal !== null && typeof srcVal === "object" &&
        tgtVal !== null && typeof tgtVal === "object"
          ? deepMerge(tgtVal, srcVal, { arrays })
          : deepClone(srcVal);
    }
    return result;
  }

  return deepClone(source);
}

// --- Traversal ---

/** Walk all nodes in a JSON structure, calling visitor for each */
export interface WalkOptions {
  /** Visit before children (default: true) */
  preOrder?: boolean;
  /** Maximum depth to traverse */
  maxDepth?: number;
}

export interface WalkVisitor {
  (value: JsonValue, path: JsonPath, parent: JsonValue | undefined): void | "stop";
}

export function walk(data: JsonValue, visitor: WalkVisitor, options: WalkOptions = {}): void {
  const { maxDepth = Infinity } = options;

  function _walk(value: JsonValue, path: JsonPath, parent: JsonValue | undefined, depth: number): void | "stop" {
    if (depth > maxDepth) return;

    const result = visitor(value, path, parent);
    if (result === "stop") return;

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        _walk(value[i]!, [...path, i], value, depth + 1);
      }
    } else if (value !== null && typeof value === "object") {
      for (const [key, val] of Object.entries(value)) {
        _walk(val, [...path, key], value, depth + 1);
      }
    }
  }

  _walk(data, [], undefined, 0);
}

/** Map over all leaf values in a JSON structure */
export function mapValues<T>(
  data: JsonValue,
  mapper: (value: JsonValue, path: JsonPath) => T,
): T[] {
  const results: T[] = [];
  walk(data, (value, path) => {
    if (!(typeof value === "object" && value !== null)) results.push(mapper(value, path));
  });
  return results;
}

/** Filter nodes from a JSON structure by predicate */
export function filterNodes(
  data: JsonValue,
  predicate: (value: JsonValue, path: JsonPath) => boolean,
): Array<{ value: JsonValue; path: JsonPath }> {
  const results: Array<{ value: JsonValue; path: JsonPath }> = [];
  walk(data, (value, path) => {
    if (predicate(value, path)) results.push({ value, path });
  });
  return results;
}

/** Find first node matching a predicate */
export function findNode(
  data: JsonValue,
  predicate: (value: JsonValue, path: JsonPath) => boolean,
): { value: JsonValue; path: JsonPath } | undefined {
  let found: { value: JsonValue; path: JsonPath } | undefined;
  walk(data, (value, path) => {
    if (predicate(value, path)) { found = { value, path }; return "stop"; }
  });
  return found;
}

// --- Flatten / Unflatten ---

/** Flatten a nested object using dot notation keys */
export function flatten(obj: JsonValue, prefix = "", separator = "."): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};

  walk(obj, (value, path) => {
    if (!(typeof value === "object" && value !== null)) {
      const key = prefix + stringifyPath(path).replace(/\./g, separator);
      result[key] = value;
    }
  });

  return result;
}

/** Unflatten a flat object back to nested structure */
export function unflatten(flat: Record<string, JsonValue>, separator = "."): JsonObject {
  const result: JsonObject = {};

  for (const [key, value] of Object.entries(flat)) {
    set(result as JsonValue, key.split(separator), value);
  }

  return result;
}

// --- Transformation ---

/** Pick specific paths from an object */
export function pickPaths(data: JsonValue, paths: (string | JsonPath)[]): JsonObject {
  const result: JsonObject = {};
  for (const path of paths) {
    const value = get(data, path);
    if (value !== undefined) {
      const key = Array.isArray(path) ? stringifyPath(path) : path;
      set(result as JsonValue, key, value);
    }
  }
  return result;
}

/** Omit specific paths from an object (immutable) */
export function omitPaths(data: JsonValue, paths: (string | JsonPath)[]): JsonValue {
  let result = deepClone(data);
  for (const path of paths) {
    result = removeImmutable(result, path);
  }
  return result;
}

/** Rename keys in an object (immutable) */
export function renameKeys(data: JsonValue, mapping: Record<string, string>): JsonObject {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data as JsonObject;

  const result: JsonObject = {};
  for (const [key, value] of Object.entries(data as JsonObject)) {
    const newKey = mapping[key] ?? key;
    result[newKey] = value;
  }
  return result;
}

// --- Type Guards ---

export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value);
}

export function isJsonValue(value: unknown): value is JsonValue {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    isJsonObject(value) ||
    isJsonArray(value)
  );
}
