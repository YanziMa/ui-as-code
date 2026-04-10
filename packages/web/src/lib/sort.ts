/**
 * Advanced sorting utilities with multi-key, custom comparator, and stable sort support.
 */

export type SortDirection = "asc" | "desc";

export interface SortRule<T> {
  key: keyof T | ((item: T) => unknown);
  direction?: SortDirection;
  /** Custom comparator (overrides default) */
  compare?: (a: T, b: T) => number;
}

/**
 * Sort an array by a single key.
 */
export function sortByKey<T>(arr: T[], key: keyof T, direction: SortDirection = "asc"): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    const cmp = compareValues(aVal, bVal);
    return direction === "desc" ? -cmp : cmp;
  });
}

/**
 * Sort by multiple keys in priority order.
 */
export function multiSort<T>(arr: T[], rules: SortRule<T>[]): T[] {
  return [...arr].sort((a, b) => {
    for (const rule of rules) {
      const { key, direction = "asc", compare } = rule;

      if (compare) {
        const result = compare(a, b);
        if (result !== 0) return direction === "desc" ? -result : result;
      }

      const aVal = typeof key === "function" ? key(a) : a[key];
      const bVal = typeof key === "function" ? key(b) : b[key];
      const cmp = compareValues(aVal, bVal);
      if (cmp !== 0) return direction === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

/**
 * Stable sort — preserves relative order of equal elements.
 */
export function stableSort<T>(arr: T[], compareFn: (a: T, b: T) => number): T[] {
  const indexed = arr.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    const cmp = compareFn(a.item, b.item);
    return cmp !== 0 ? cmp : a.index - b.index;
  });
  return indexed.map(({ item }) => item);
}

/**
 * Natural sort — sorts strings containing numbers correctly
 * (e.g., "file2" comes before "file10").
 */
export function naturalSort(arr: string[], direction: SortDirection = "asc"): string[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
  return [...arr].sort(direction === "desc"
    ? (a, b) => collator.compare(b, a)
    : (a, b) => collator.compare(a, b),
  );
}

/**
 * Create a reusable sorter for a specific array type.
 */
export function createSorter<T>(defaultRules?: SortRule<T>[]) {
  let currentRules = defaultRules ?? [];

  return {
    /** Set sort rules and return sorted copy of array */
    sort: (arr: T[], overrideRules?: SortRule<T>[]): T[] =>
      multiSort(arr, overrideRules ?? currentRules),

    /** Update the default sort rules */
    setRules: (rules: SortRule<T>[]) => { currentRules = rules; },

    /** Add or update a rule by key */
    toggle: (key: keyof T): void => {
      const existing = currentRules.findIndex(
        (r) => typeof r.key !== "function" && r.key === key,
      );
      if (existing >= 0) {
        const rule = currentRules[existing];
        currentRules[existing] = {
          ...rule,
          direction: rule.direction === "asc" ? "desc" : "asc",
        };
      } else {
        currentRules.push({ key, direction: "asc" });
      }
    },

    /** Get current rules */
    getRules: () => [...currentRules],

    /** Reset to no sorting */
    reset: () => { currentRules = [] },
  };
}

/** Compare two values safely */
function compareValues(a: unknown, b: unknown): number {
  // Handle null/undefined
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  // Handle numbers
  if (typeof a === "number" && typeof b === "number") return a - b;

  // Handle dates
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (a instanceof Date) return 1;
  if (b instanceof Date) return -1;

  // Handle booleans
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);

  // Handle strings
  if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);

  // Fallback: coerce to string
  return String(a).localeCompare(String(b));
}
