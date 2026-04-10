/**
 * Advanced array manipulation utilities.
 */

/** Chunk an array into groups of specified size */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Split array at the first element matching a predicate */
export function splitAt<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const idx = arr.findIndex(predicate);
  if (idx === -1) return [arr, []];
  return [arr.slice(0, idx), arr.slice(idx)];
}

/** Partition array into two groups based on a predicate */
export function partitionArray<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of arr) {
    (predicate(item) ? truthy : falsy).push(item);
  }

  return [truthy, falsy];
}

/** Create a sliding window over an array */
export function slidingWindow<T>(arr: T[], size: number): T[][] {
  const windows: T[][] = [];
  for (let i = 0; i <= arr.length - size; i++) {
    windows.push(arr.slice(i, i + size));
  }
  return windows;
}

/** Group consecutive elements that satisfy the same predicate result */
export function groupConsecutive<T>(
  arr: T[],
  getKey: (item: T) => string | number,
): Array<{ key: string | number; items: T[] }> {
  if (arr.length === 0) return [];

  const groups: Array<{ key: string | number; items: T[] }> = [];
  let currentKey = getKey(arr[0]);
  let currentItems: T[] = [arr[0]];

  for (let i = 1; i < arr.length; i++) {
    const key = getKey(arr[i]);
    if (key === currentKey) {
      currentItems.push(arr[i]);
    } else {
      groups.push({ key: currentKey, items: currentItems });
      currentKey = key;
      currentItems = [arr[i]];
    }
  }

  groups.push({ key: currentKey, items: currentItems });
  return groups;
}

/** Flatten nested arrays to arbitrary depth */
export function deepFlatten<T>(arr: unknown[]): T[] {
  const result: T[] = [];

  for (const item of arr) {
    if (Array.isArray(item)) {
      result.push(...deepFlatten<T>(item));
    } else {
      result.push(item as T);
    }
  }

  return result;
}

/** Remove duplicates based on a key function */
export function uniqueBy<T>(arr: T[], keyFn: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return arr.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Find the intersection of multiple arrays */
export function intersectArrays<T>(...arrays: T[][]): T[] {
  if (arrays.length === 0) return [];

  // Start with first array as base
  let result = new Set(arrays[0]);

  for (let i = 1; i < arrays.length; i++) {
    const nextSet = new Set(arrays[i]);
    result = new Set([...result].filter((item) => nextSet.has(item)));
  }

  return [...result];
}

/** Find elements present in the first array but not in others */
export function differenceArrays<T>(first: T[], ...others: T[][]): T[] {
  const otherSet = new Set(others.flat());
  return first.filter((item) => !otherSet.has(item));
}

/** Find elements in either array but not both (symmetric difference) */
export function symmetricDifference<T>(a: T[], b: T[]): T[] {
  const setA = new Set(a);
  const setB = new Set(b);

  return [
    ...a.filter((item) => !setB.has(item)),
    ...b.filter((item) => !setA.has(item)),
  ];
}

/** Rotate array elements left or right */
export function rotateArray<T>(arr: T[], positions: number): T[] {
  if (arr.length === 0) return arr;

  const normalizedPositions = ((positions % arr.length) + arr.length) % arr.length;
  return [...arr.slice(normalizedPositions), ...arr.slice(0, normalizedPositions)];
}

/** Sample N random elements from array without replacement */
export function sampleArray<T>(arr: T[], count: number): T[] {
  if (count >= arr.length) return [...arr];
  if (count <= 0) return [];

  const shuffled = [...arr];
  const result: T[] = [];

  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * (shuffled.length - i));
    result.push(shuffled[idx]!);
    // Swap with last element to avoid re-sampling
    [shuffled[idx], shuffled[shuffled.length - 1 - i]] = [
      shuffled[shuffled.length - 1 - i]!,
      shuffled[idx]!,
    ];
  }

  return result;
}

/** Shuffle array in place using Fisher-Yates algorithm */
export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }

  return result;
}

/** Zip multiple arrays together into tuples */
export function zipArrays<T extends unknown[]>(...arrays: T): Array<{ [K in keyof T]: T[K] }> {
  const minLength = Math.min(...arrays.map((a) => a.length));

  const result: Array<{ [K in keyof T]: T[K] }> = [];

  for (let i = 0; i < minLength; i++) {
    const tuple = {} as { [K in keyof T]: T[K] };
    for (let j = 0; j < arrays.length; j++) {
      tuple[j as keyof T] = arrays[j][i] as T[keyof T & number];
    }
    result.push(tuple);
  }

  return result;
}

/** Create an array filled with values from a factory function */
export function fillArray<T>(length: number, factory: (index: number) => T): T[] {
  return Array.from({ length }, (_, i) => factory(i));
}

/** Find the index of the minimum element */
export function argMin<T>(arr: T[], valueFn?: (item: T) => number): number {
  if (arr.length === 0) return -1;

  const fn = valueFn ?? ((v: T) => v as unknown as number);
  let minIdx = 0;
  let minVal = fn(arr[0]);

  for (let i = 1; i < arr.length; i++) {
    const val = fn(arr[i]);
    if (val < minVal) {
      minVal = val;
      minIdx = i;
    }
  }

  return minIdx;
}

/** Find the index of the maximum element */
export function argMax<T>(arr: T[], valueFn?: (item: T) => number): number {
  if (arr.length === 0) return -1;

  const fn = valueFn ?? ((v: T) => v as unknown as number);
  let maxIdx = 0;
  let maxVal = fn(arr[0]);

  for (let i = 1; i < arr.length; i++) {
    const val = fn(arr[i]);
    if (val > maxVal) {
      maxVal = val;
      maxIdx = i;
    }
  }

  return maxIdx;
}
