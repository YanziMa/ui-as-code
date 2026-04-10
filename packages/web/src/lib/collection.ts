/**
 * Collection / data structure utilities.
 */

/** Create a Map from an array of key-value pairs */
export function toMap<K, V>(arr: readonly (readonly [K, V])[]): Map<K, V> {
  return new Map(arr as [K, V][]);
}

/** Create a Set from array */
export function toSet<T>(arr: readonly T[]): Set<T> {
  return new Set(arr);
}

/** Get unique values from array by key function */
export function uniqueBy<T>(arr: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Partition array into two groups based on predicate */
export function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];
  for (const item of arr) {
    if (predicate(item)) truthy.push(item);
    else falsy.push(item);
  }
  return [truthy, falsy];
}

/** Group array items into a Record by key function */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

/** Count occurrences in array */
export function countBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, number> {
  return arr.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
}

/** Find first matching element or return default */
export function findFirst<T>(arr: T[], predicate: (item: T) => boolean, defaultValue?: T): T | undefined {
  return arr.find(predicate) ?? defaultValue;
}

/** Find last matching element */
export function findLast<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return arr[i];
  }
  return undefined;
}

/** Check if all elements match predicate */
export function all<T>(arr: T[], predicate: (item: T) => boolean): boolean {
  return arr.every(predicate);
}

/** Check if any element matches predicate */
export function any<T>(arr: T[], predicate: (item: T) => boolean): boolean {
  return arr.some(predicate);
}

/** Find the intersection of two arrays */
export function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item));
}

/** Find difference (items in a but not in b) */
export function difference<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter((item) => !setB.has(item));
}

/** Flatten nested arrays recursively */
export function deepFlatten<T>(arr: unknown[]): T[] {
  const result: T[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...deepFlatten(item));
    } else {
      result.push(item as T);
    }
  }
  return result;
}

/** Zip two arrays together into tuples */
export function zip<A, B>(a: A[], b: B[]): Array<[A, B]> {
  const len = Math.min(a.length, b.length);
  const result: Array<[A, B]> = [];
  for (let i = 0; i < len; i++) {
    result.push([a[i], b[i]]);
  }
  return result;
}

/** Rotate array left by N positions */
export function rotateLeft<T>(arr: T[], n: number): T[] {
  if (arr.length === 0) return arr;
  const offset = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(offset), ...arr.slice(0, offset)];
}

/** Pick random element from array */
export function sample<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N random elements without replacement */
export function sampleMany<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}
