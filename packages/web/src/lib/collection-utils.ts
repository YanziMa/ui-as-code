/**
 * Collection utilities — advanced operations on arrays and objects
 * beyond the standard Array methods, including grouping,
 * partitioning, frequency analysis, unique operations, tree operations,
 * and data structure conversions.
 */

// --- Grouping ---

/** Group array items by a key function */
export function groupBy<K extends string | number, T>(arr: T[], keyFn: (item: T) => K): Record<K, T[]> {
  const groups = {} as Record<K, T[]>;
  for (const item of arr) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

/** Group array items by a boolean predicate (two groups: true/false) */
export function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (const item of arr) {
    (predicate(item) ? truthy : falsy).push(item);
  }
  return [truthy, falsy];
}

/** Group consecutive elements that share the same key */
export function groupConsecutive<T>(arr: T[], getKey: (item: T) => string | number): Array<{ key: string | number; items: T[] }> {
  if (arr.length === 0) return [];

  const groups: Array<{ key: string | number; items: T[] }> = [];
  let currentKey = getKey(arr[0]!);
  let currentGroup: T[] = [arr[0]!];

  for (let i = 1; i < arr.length; i++) {
    const key = getKey(arr[i]!);
    if (key === currentKey) {
      currentGroup.push(arr[i]!);
    } else {
      groups.push({ key: currentKey, items: currentGroup });
      currentKey = key;
      currentGroup = [arr[i]!];
    }
  }
  groups.push({ key: currentKey, items: currentGroup });

  return groups;
}

// --- Frequency Analysis ---

/** Count occurrences of each value (returns Map) */
export function frequencyMap<T>(arr: T[]): Map<T, number> {
  const freq = new Map<T, number>();
  for (const item of arr) {
    freq.set(item, (freq.get(item) ?? 0) + 1);
  }
  return freq;
}

/** Get most frequent value(s) */
export function mode<T>(arr: T[]): T[] {
  const freq = frequencyMap(arr);
  let maxCount = 0;
  let modes: T[] = [];
  for (const [value, count] of freq) {
    if (count > maxCount) { maxCount = count; modes = [value]; }
    else if (count === maxCount) modes.push(value);
  }
  return modes;
}

/** Get least frequent value(s) */
export function antiMode<T>(arr: T[]): T[] {
  const freq = frequencyMap(arr);
  let minCount = Infinity;
  let antiModes: T[] = [];
  for (const [value, count] of freq) {
    if (count < minCount) { minCount = count; antiModes = [value]; }
    else if (count === minCount) antiModes.push(value);
  }
  return antiModes;
}

/** Count occurrences of a specific value */
export function countOccurrences<T>(arr: T[], value: T): number {
  let count = 0;
  for (const item of arr) { if (item === value) count++; }
  return count;
}

// --- Unique Operations ---

/** Get unique values preserving insertion order */
export function unique<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of arr) {
    if (!seen.has(item)) { seen.add(item); result.push(item); }
  }
  return result;
}

/** Get unique values by a key function */
export function uniqueBy<T, K>(arr: T[], keyFn: (item: T) => K): T[] {
  const seen = new Set<K>();
  const result: T[] = [];
  for (const item of arr) {
    const key = keyFn(item);
    if (!seen.has(key)) { seen.add(key); result.push(item); }
  }
  return result;
}

/** Symmetric difference (elements in either but not both) */
export function symmetricDifference<T>(a: T[], b: T[]): [T[], T[]] {
  const setA = new Set(a), setB = new Set(b);
  const onlyA = a.filter((v) => !setB.has(v));
  const onlyB = b.filter((v) => !setA.has(v));
  return [onlyA, onlyB];
}

/** Intersection of multiple arrays */
export function intersection<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) return [];
  let result = new Set(arrays[0]);
  for (let i = 1; i < arrays.length; i++) {
    result = new Set([...result].filter((v) => new Set(arrays[i]).has(v)));
  }
  return [...result];
}

/** Union of multiple arrays (preserving order, no duplicates) */
export function union<T>(...arrays: T[][]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const arr of arrays) {
    for (const item of arr) {
      if (!seen.has(item)) { seen.add(item); result.push(item); }
    }
  }
  return result;
}

// --- Searching ---

/** Binary search in a sorted array. Returns index or -1 */
export function binarySearch<T>(arr: T[], value: T, compareFn?: (a: T, b: T) => number): number {
  const cmp = compareFn ?? ((a: T, b: T) => (a > b ? 1 : a < b ? -1 : 0);
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const c = cmp(arr[mid], value);
    if (c === 0) return mid;
    if (c < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/** Find index of value in unsorted array (-1 if not found) */
export function indexOf<T>(arr: T[], value: T): number {
  for (let i = 0; i < arr.length; i++) {
    if (Object.is(arr[i], value)) return i;
  }
  return -1;
}

/** Find last index of value in array (-1 if not found) */
export function lastIndexOf<T>(arr: T[], value: T): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (Object.is(arr[i], value)) return i;
  }
  return -1;
}

/** Find all indices of value in array */
export function findAllIndices<T>(arr: T[], value: T): number[] {
  const indices: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (Object.is(arr[i], value)) indices.push(i);
  }
  return indices;
}

// --- Transformation ---

/** Chunk array into groups of size n */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Split array at first occurrence where predicate returns true */
export function splitWhen<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const idx = arr.findIndex(predicate);
  if (idx === -1) return [arr, []];
  return [arr.slice(0, idx), arr.slice(idx)];
}

/** Flatten nested arrays one level deep */
export function flat<T>(arr: T[][]): T[] {
  return arr.flat();
}

/** Deep flatten arbitrarily nested arrays */
export function deepFlat<T>(arr: unknown[]): T[] {
  const result: T[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) result.push(...deepFlat(item));
    else result.push(item as T);
  }
  return result;
}

/** Rotate array left by n positions */
export function rotateLeft<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return arr;
  const norm = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(norm), ...arr.slice(0, norm)];
}

/** Rotate array right by n positions */
export function rotateRight<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return arr;
  const norm = ((-n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(-norm), ...arr.slice(0, -norm)];
}

/** Shuffle array in place (Fisher-Yates) */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Sample N random items without replacement */
export function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy[idx]!);
    copy.splice(idx, 1);
  }
  return result;
}

// --- Object Collections ---

/** Get keys of an object as array */
export function keysOf<T extends Record<string, unknown>>(obj: T): (keyof T & string)[] {
  return Object.keys(obj);
}

/** Get values of an object as array */
export function valuesOf<T extends Record<string, unknown>>(obj: T): T[] {
  return Object.values(obj);
}

/** Get entries as array of [key, value] pairs */
export function entriesOf<T extends Record<string, unknown>>(obj: T): Array<[keyof T & string, T]> {
  return Object.entries(obj);
}

/** Invert an object (swap keys and values) */
export function invertObject<V extends string | number, T>(obj: Record<V, T>): Record<T, V> {
  const result = {} as Record<T, V>;
  for (const [k, v] of Object.entries(obj)) {
    result[String(v)] = k;
  }
  return result;

/** Pick specified keys from object */
export function pickKeys<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const k of keys) result[k] = obj[k];
  return result;
}

/** Omit specified keys from object */
export function omitKeys<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj };
  for (const k of keys) delete result[k];
  return result as Omit<T, K>;
}

// --- Tree Operations ---

/** Build a tree structure from a flat array with parent references */
export interface TreeNode<T> {
  value: T;
  children: TreeNode<T>[];
  parent?: TreeNode<T>;
  depth?: number;
}

/** Build a tree from a parent-map style object */
export function buildTree<T>(
  items: T[],
  getId: (item: T) => string,
  getChildIds?: (item: T) => string[],
): TreeNode<T>[] {
  const nodeMap = new Map<string, TreeNode<T>>();
  const roots: TreeNode<T>[] = [];

  for (const item of items) {
    const id = getId(item);
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { value: item, children: [], depth: 0 });
    }
  }

  for (const item of items) {
    const id = getId(item);
    const node = nodeMap.get(id)!;
    const childIds = getChildIds?.(item) ?? [];
    for (const childId of childIds) {
      const childNode = nodeMap.get(childId);
      if (childNode) {
        childNode.parent = node;
        node.children.push(childNode);
      }
    }

    if (!node.parent) roots.push(node);
  }

  return roots;
}

/** Traverse tree depth-first (pre-order) */
export function traverseDF<T>(nodes: TreeNode<T>[], visitor: (node: TreeNode<T>) => void | "continue" | "skip"): void {
  const stack = [...nodes];
  const visited = new Set<TreeNode<T>>();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    const result = visitor(node);
    if (result === "skip") continue;
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]!);
    }
  }
}

/** Traverse tree breadth-first */
export function traverseBF<T>(nodes: TreeNode<T>[], visitor: (node: TreeNode<T>) => void | "break"): void {
  const queue = [...nodes];
  while (queue.length > 0) {
    const node = queue.shift()!;
    const result = visitor(node);
    if (result === "break") break;
    for (const child of node.children) queue.push(child);
  }
}

/** Flatten tree to array (depth-first) */
export function flattenTree<T>(roots: TreeNode<T>[]): T[] {
  const result: T[] = [];
  traverseDF(roots, (node) => { result.push(node.value); });
  return result;
}
