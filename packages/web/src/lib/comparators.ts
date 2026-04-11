/**
 * Comparison and sorting utilities — multi-key sorting, natural sort,
 * locale-aware sorting, custom comparators, sort stability.
 */

// --- Types ---

export type Comparator<T> = (a: T, b: T) => number;
export type SortDirection = "asc" | "desc";

export interface SortSpec<T> {
  key: keyof T | ((item: T) => unknown);
  direction?: SortDirection;
  comparator?: Comparator<unknown>;
  nullsFirst?: boolean;
}

// --- Basic Comparators ---

/** Ascending comparator for primitives */
export const asc: Comparator<number | string | bigint | boolean | Date> = (a, b) =>
  a < b ? -1 : a > b ? 1 : 0;

/** Descending comparator for primitives */
export const desc: Comparator<number | string | bigint | boolean | Date> = (a, b) =>
  a > b ? -1 : a < b ? 1 : 0;

/** Null-safe comparator (nulls last by default) */
export function nullSafe<T>(comparator: Comparator<T>, nullsLast = true): Comparator<T | null | undefined> {
  return (a, b) => {
    if (a == null && b == null) return 0;
    if (a == null) return nullsLast ? 1 : -1;
    if (b == null) return nullsLast ? -1 : 1;
    return comparator(a, b);
  };
}

// --- Natural Sort ---

/** Compare strings naturally (numbers within strings compared numerically) */
export function naturalCompare(a: string, b: string): number {
  const ax = [], bx = [];
  a.replace(/(\d+)|(\D+)/g, (_, d, nd) => { ax.push(d || nd); return ""; });
  b.replace(/(\d+)|(\D+)/g, (_, d, nd) => { bx.push(d || nd); return ""; });

  const len = Math.min(ax.length, bx.length);
  for (let i = 0; i < len; i++) {
    const ai = ax[i]!, bi = bx[i]!;
    const an = parseInt(ai, 10), bn = parseInt(bi, 10);

    if (!isNaN(an) && !isNaN(bn)) {
      if (an !== bn) return an - bn;
    } else {
      const cmp = ai.localeCompare(bi);
      if (cmp !== 0) return cmp;
    }
  }

  return ax.length - bx.length;
}

/** Natural sort comparator */
export const naturalSort: Comparator<string> = naturalCompare;

// --- Locale-Aware Sorting ---

/** Locale-aware string comparator */
export function localeCompare(
  options?: Intl.CollatorOptions,
  locale?: string | string[],
): Comparator<string> {
  const collator = new Intl.Collator(locale, options);
  return (a, b) => collator.compare(a, b);
}

/** Case-insensitive comparator */
export const caseInsensitive: Comparator<string> = (a, b) =>
  a.localeCompare(b, undefined, { sensitivity: "base" });

// --- Multi-Key Sorting ---

/** Build a comparator from multiple sort specs */
export function multiKeyComparator<T>(specs: SortSpec<T>[]): Comparator<T> {
  return (a, b) => {
    for (const spec of specs) {
      const dir = spec.direction === "desc" ? -1 : 1;
      const keyFn = typeof spec.key === "function" ? spec.key : (item: T) => item[spec.key];
      const va = keyFn(a), vb = keyFn(b);

      let cmp: number;

      if (va == null || vb == null) {
        const ns = spec.nullsFirst ?? false;
        if (va == null && vb == null) continue;
        cmp = va == null ? (ns ? -1 : 1) : (ns ? 1 : -1);
      } else if (spec.comparator) {
        cmp = spec.comparator(va, vb);
      } else if (typeof va === "string" && typeof vb === "string") {
        cmp = va.localeCompare(vb);
      } else if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else if (va instanceof Date && vb instanceof Date) {
        cmp = va.getTime() - vb.getTime();
      } else {
        cmp = String(va).localeCompare(String(vb));
      }

      if (cmp !== 0) return cmp * dir;
    }
    return 0;
  };
}

/** Convenience: sort array by single key */
export function sortBy<T>(
  arr: T[],
  key: keyof T | ((item: T) => unknown),
  direction: SortDirection = "asc",
): T[] {
  const comparator = multiKeyComparator([{ key, direction }]);
  return [...arr].sort(comparator);
}

/** Convenience: sort array by multiple keys */
export function sortByMultiple<T>(arr: T[], specs: SortSpec<T>[]): T[] {
  const comparator = multiKeyComparator(specs);
  return [...arr].sort(comparator);
}

// --- Property Access Comparators ---

/** Create a comparator for a specific property path */
export function byProperty<T>(path: string, direction: SortDirection = "asc"): Comparator<T> {
  const keys = path.split(".");
  const getValue = (obj: T): unknown => {
    let val: unknown = obj;
    for (const k of keys) {
      if (val == null || typeof val !== "object") return undefined;
      val = (val as Record<string, unknown>)[k];
    }
    return val;
  };

  const dir = direction === "desc" ? -1 : 1;
  return (a, b) => {
    const va = getValue(a), vb = getValue(b);
    if (va == null && vb == null) return 0;
    if (va == null) return dir;
    if (vb == null) return -dir;
    if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  };
}

// --- Rank / Percentile ---

/** Assign ranks to sorted values (handles ties) */
export function rankValues<T>(values: T[], comparator: Comparator<T>): Map<T, number> {
  const sorted = [...values].sort(comparator);
  const rankMap = new Map<T, number>();
  let rank = 1;

  for (let i = 0; i < sorted.length;) {
    const val = sorted[i]!;
    let j = i + 1;
    while (j < sorted.length && comparator(sorted[j]!, val) === 0) j++;

    // Average rank for ties
    const avgRank = (rank + (rank + (j - i - 1))) / 2;
    for (let k = i; k < j; k++) rankMap.set(sorted[k]!, avgRank);

    rank += j - i;
    i = j;
  }

  return rankMap;
}

/** Get percentile rank of a value in a sorted array */
export function percentileRank<T>(sortedArray: T[], value: T, comparator: Comparator<T>): number {
  if (sortedArray.length === 0) return 0;

  let lo = 0, hi = sortedArray.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const cmp = comparator(sortedArray[mid]!, value);
    if (cmp < 0) lo = mid + 1;
    else if (cmp > 0) hi = mid - 1;
    else return (mid / (sortedArray.length - 1)) * 100;
  }

  // Value not found — interpolate position
  return (lo / sortedArray.length) * 100;
}

// --- Top-N / Bottom-N ---

/** Get top N items by comparator */
export function topN<T>(arr: T[], n: number, comparator: Comparator<T> = asc): T[] {
  return [...arr].sort(comparator).slice(0, n);
}

/** Get bottom N items by comparator */
export function bottomN<T>(arr: T[], n: number, comparator: Comparator<T> = asc): T[] {
  return [...arr].sort(comparator).slice(-n).reverse();
}

/** Partition array around median (quickselect-ish) */
export function partitionBy<T>(arr: T[], pivotIndex: number, comparator: Comparator<T>): [T[], T[]] {
  const pivot = arr[pivotIndex]!;
  const left: T[] = [], right: T[] = [];

  for (let i = 0; i < arr.length; i++) {
    if (i === pivotIndex) continue;
    if (comparator(arr[i]!, pivot) <= 0) left.push(arr[i]!);
    else right.push(arr[i]!);
  }

  return [left, right];
}

// --- Binary Search Helpers ---

/** Find insertion point in a sorted array */
export function insertionPoint<T>(sortedArr: T[], value: T, comparator: Comparator<T>): number {
  let lo = 0, hi = sortedArr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (comparator(sortedArr[mid]!, value) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Check if a sorted array contains a value (binary search) */
export function binarySearch<T>(sortedArr: T[], value: T, comparator: Comparator<T>): boolean {
  let lo = 0, hi = sortedArr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const cmp = comparator(sortedArr[mid]!, value);
    if (cmp === 0) return true;
    if (cmp < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}
