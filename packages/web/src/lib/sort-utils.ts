/**
 * Sort Utilities: Multi-column sorting, sort state management, comparator functions,
 * stable sort, natural sorting, custom comparators, and UI integration helpers.
 */

// --- Types ---

export type SortDirection = "asc" | "desc" | null;

export interface SortRule<T = unknown> {
  field: keyof T | string;
  direction: SortDirection;
  /** Custom comparator (optional) */
  comparator?: (a: T, b: T, field: keyof T | string) => number;
  /** Sort nulls/undefineds first or last */
  nullsFirst?: boolean;
}

export interface SortState<T = unknown> {
  rules: SortRule<T>[];
  multiSort: boolean; // Allow multiple simultaneous sorts
}

export type ComparatorFn<T = unknown> = (a: T, b: T) => number;

// --- Built-in Comparators ---

/** Default comparison for primitives */
export function defaultCompare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const sa = String(a);
  const sb = String(b);
  return sa.localeCompare(sb);
}

/** Natural sort (numbers within strings sorted numerically) */
export function naturalCompare(a: string, b: string): number {
  const ax = a.split(/(\d+)/);
  const bx = b.split(/(\d+)/);

  for (let i = 0; i < Math.max(ax.length, bx.length); i++) {
    const av = ax[i] ?? "";
    const bv = bx[i] ?? "";

    const an = parseInt(av, 10);
    const bn = parseInt(bv, 10);

    if (!isNaN(an) && !isNaN(bn)) {
      if (an !== bn) return an - bn;
    } else {
      const cmp = av.localeCompare(bv);
      if (cmp !== 0) return cmp;
    }
  }
  return ax.length - bx.length;
}

/** Case-insensitive compare */
export function caseInsensitiveCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

/** Date-aware compare (parses strings as dates when possible) */
export function dateAwareCompare(a: unknown, b: unknown): number {
  const da = a instanceof Date ? a : new Date(String(a));
  const db = b instanceof Date ? b : new Date(String(b));
  const ta = da.getTime();
  const tb = db.getTime();
  if (!isNaN(ta) && !isNaN(tb)) return ta - tb;
  return defaultCompare(a, b);
}

// --- Sorting Engine ---

/**
 * Create a comparator function from sort rules.
 * Rules are applied in order (first rule has highest priority).
 */
export function createComparator<T>(rules: SortRule<T>[], options?: {
  accessor?: (item: T, field: string) => unknown;
}): ComparatorFn<T> {
  const { accessor } = options ?? [];

  return (a: T, b: T): number => {
    for (const rule of rules) {
      if (!rule.direction) continue;

      const valA = accessor ? accessor(a, rule.field as string) : (a as Record<string, unknown>)[rule.field as string];
      const valB = accessor ? accessor(b, rule.field as string) : (b as Record<string, unknown>)[rule.field as string];

      let result: number;

      if (rule.comparator) {
        result = rule.comparator(a, b, rule.field);
      } else {
        result = defaultCompare(valA, valB);
      }

      // Handle null ordering
      if (valA == null || valB == null) {
        if (rule.nullsFirst) {
          if (valA == null && valB != null) result = -1;
          else if (valA != null && valB == null) result = 1;
          else result = 0;
        } else {
          if (valA == null && valB != null) result = 1;
          else if (valA != null && valB == null) result = -1;
          else result = 0;
        }
      }

      if (result !== 0) {
        return rule.direction === "desc" ? -result : result;
      }
    }
    return 0;
  };
}

/** Stable sort — preserves relative order of equal elements */
export function stableSort<T>(arr: T[], comparator: ComparatorFn<T>): T[] {
  const indexed = arr.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const cmp = comparator(a.item, b.item);
    return cmp !== 0 ? cmp : a.index - b.index;
  });
  return indexed.map((i) => i.item);
}

/** Sort an array in-place using the given rules */
export function sortByRules<T>(items: T[], rules: SortRule<T>[], options?: {
  accessor?: (item: T, field: string) => unknown;
  stable?: boolean;
}): T[] {
  const comparator = createComparator(rules, options);
  return (options?.stable !== false) ? stableSort(items, comparator) : [...items].sort(comparator);
}

// --- Sort Manager ---

/**
 * Manage sort state with toggle, add/remove rules, and auto-sort.
 *
 * @example
 * ```ts
 * const mgr = createSortManager({
 *   data: products,
 *   onChange: (sorted) => renderTable(sorted),
 * });
 * mgr.toggle("price"); // Sort by price asc
 * mgr.toggle("price"); // Toggle to desc
 * ```
 */
export function createSortManager<T>(options: {
  data: T[];
  multiSort?: boolean;
  stable?: boolean;
  accessor?: (item: T, field: string) => unknown;
  onChange?: (sorted: T[]) => void;
}) {
  const {
    data,
    multiSort = false,
    stable = true,
    accessor,
    onChange,
  } = options;

  let _data = [...data];
  let rules: SortRule<T>[] = [];

  function getSorted(): T[] {
    if (rules.length === 0) return _data;
    return sortByRules(_data, rules, { accessor, stable });
  }

  function compute(): void {
    onChange?.(getSorted());
  }

  /** Toggle sort direction for a field */
  function toggle(field: keyof T | string, comparator?: SortRule<T>["comparator"]): void {
    const existingIdx = rules.findIndex((r) => r.field === field);

    if (existingIdx >= 0) {
      const existing = rules[existingIdx]!;
      if (existing.direction === "asc") {
        existing.direction = "desc";
      } else if (multiSort) {
        rules.splice(existingIdx, 1); // Remove on third click in multi-sort mode
      } else {
        existing.direction = "asc";
      }
    } else {
      if (!multiSort) rules = [];
      rules.push({ field, direction: "asc", comparator });
    }

    compute();
  }

  /** Set explicit direction for a field */
  function setSort(field: keyof T | string, direction: SortDirection): void {
    if (!direction) {
      rules = rules.filter((r) => r.field !== field);
    } else {
      const existing = rules.find((r) => r.field === field);
      if (existing) {
        existing.direction = direction;
      } else {
        if (!multiSort) rules = [];
        rules.push({ field, direction });
      }
    }
    compute();
  }

  /** Get current direction for a field */
  function getDirection(field: keyof T | string): SortDirection {
    const found = rules.find((r) => r.field === field);
    return found?.direction ?? null;
  }

  /** Clear all sort rules */
  function clear(): void {
    rules = [];
    compute();
  }

  /** Update source data */
  setData(newData: T[]): void {
    _data = newData;
    compute();
  }

  /** Get current rules */
  getRules(): SortRule<T>[] { return [...rules]; }

  // Initial compute
  compute();

  return { toggle, setSort, getDirection, clear, setData, getRules, getSorted };
}

// --- Quick Helpers ---

/** Sort an array by a single field (one-liner) */
export function quickSort<T>(arr: T[], field: keyof T | string, direction: "asc" | "desc" = "asc"): T[] {
  return sortByRules(arr, [{ field, direction }]);
}

/** Get sort indicator symbol for UI display */
export function getSortIndicator(direction: SortDirection): string {
  switch (direction) {
    case "asc": return "\u2191"; // ↑
    case "desc": return "\u2193"; // ↓
    default: return "\u21C5"; // ⇅
  }
}
