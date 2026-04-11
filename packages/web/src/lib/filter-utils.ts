/**
 * Filter Utilities: Data filtering, search, multi-criteria filtering,
 * fuzzy matching, debounced filter input, filter state management,
 * and filter persistence.
 */

// --- Types ---

export interface FilterCriteria<T = unknown> {
  field: keyof T | string;
  operator: FilterOperator;
  value: unknown;
}

export type FilterOperator =
  | "equals" | "notEquals"
  | "contains" | "notContains"
  | "startsWith" | "endsWith"
  | "greaterThan" | "lessThan" | "greaterOrEqual" | "lessOrEqual"
  | "in" | "notIn"
  | "isEmpty" | "isNotEmpty"
  | "between"
  | "matches"; // regex

export interface FilterState<T = unknown> {
  criteria: FilterCriteria<T>[];
  searchText: string;
  searchFields?: (keyof T | string)[];
  active: boolean;
}

export interface FilterResult<T> {
  items: T[];
  totalBefore: number;
  totalAfter: number;
  filteredCount: number;
}

export interface FilterManagerOptions<T = unknown> {
  /** Initial data set */
  data: T[];
  /** Search fields (if omitted, searches all string fields) */
  searchFields?: (keyof T | string)[];
  /** Debounce delay for search input (ms) */
  debounceMs?: number;
  /** Called when filter results change */
  onFilterChange?: (result: FilterResult<T>) => void;
  /** Custom field accessor for nested paths */
  accessor?: (item: T, field: string) => unknown;
  /** Case sensitive search? */
  caseSensitive?: boolean;
  /** Persist filter state to localStorage */
  persistKey?: string;
}

// --- Core Filtering Engine ---

/** Apply a single criteria against a value */
export function applyCriteria(value: unknown, criteria: FilterCriteria): boolean {
  const { operator, value: criterionValue } = criteria;

  // Handle null/undefined
  if (value === undefined || value === null) {
    if (operator === "isEmpty") return true;
    if (operator === "isNotEmpty") return false;
    return false;
  }

  const strVal = String(value ?? "");
  const numVal = Number(value);
  const critStr = String(criterionValue ?? "");

  switch (operator) {
    case "equals":
      return value === criterionValue;
    case "notEquals":
      return value !== criterionValue;
    case "contains":
      return strVal.toLowerCase().includes(critStr.toLowerCase());
    case "notContains":
      return !strVal.toLowerCase().includes(critStr.toLowerCase());
    case "startsWith":
      return strVal.toLowerCase().startsWith(critStr.toLowerCase());
    case "endsWith":
      return strVal.toLowerCase().endsWith(critStr.toLowerCase());
    case "greaterThan":
      return !isNaN(numVal) && numVal > Number(criterionValue);
    case "lessThan":
      return !isNaN(numVal) && numVal < Number(criterionValue);
    case "greaterOrEqual":
      return !isNaN(numVal) && numVal >= Number(criterionValue);
    case "lessOrEqual":
      return !isNaN(numVal) && numVal <= Number(criterionValue);
    case "in":
      return Array.isArray(criterionValue) && criterionValue.includes(value);
    case "notIn":
      return Array.isArray(criterionValue) && !criterionValue.includes(value);
    case "isEmpty":
      return value === "" || value === null || value === undefined;
    case "isNotEmpty":
      return value !== "" && value !== null && value !== undefined;
    case "between":
      if (!Array.isArray(criterionValue) || criterionValue.length < 2) return false;
      const lo = Number(criterionValue[0]);
      const hi = Number(criterionValue[1]);
      return !isNaN(numVal) && numVal >= lo && numVal <= hi;
    case "matches":
      try { return new RegExp(String(criterionValue)).test(strVal); }
      catch { return false; }
    default:
      return true;
  }
}

/** Get a field value from an item, supporting dot-notation paths */
export function getFieldValue<T>(item: T, field: string, customAccessor?: (item: T, field: string) => unknown): unknown {
  if (customAccessor) return customAccessor(item, field);

  // Dot notation support
  const parts = field.split(".");
  let current: unknown = item;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Filter an array of items by multiple criteria AND search text */
export function filterItems<T>(
  items: T[],
  criteria: FilterCriteria[],
  searchText: string,
  searchFields?: (keyof T | string)[],
  options?: { caseSensitive?: boolean; accessor?: (item: T, field: string) => unknown },
): FilterResult<T> {
  const { caseSensitive = false, accessor } = options ?? {};
  const searchLower = caseSensitive ? searchText : searchText?.toLowerCase();
  const fields = searchFields ?? _inferStringFields(items);

  let result = items;

  // Apply criteria filters
  for (const c of criteria) {
    result = result.filter((item) => {
      const value = getFieldValue(item, c.field as string, accessor);
      return applyCriteria(value, c);
    });
  }

  // Apply text search
  if (searchText && searchText.trim().length > 0) {
    result = result.filter((item) => {
      for (const field of fields) {
        const value = getFieldValue(item, field as string, accessor);
        if (value === null || value === undefined) continue;
        const strVal = caseSensitive ? String(value) : String(value).toLowerCase();
        if (strVal.includes(searchLower!)) return true;
      }
      return false;
    });
  }

  return {
    items: result,
    totalBefore: items.length,
    totalAfter: result.length,
    filteredCount: items.length - result.length,
  };
}

/** Infer searchable string fields from first few items */
function _inferStringFields<T>(items: T[]): string[] {
  if (items.length === 0) return [];
  const sample = items[0] as Record<string, unknown>;
  const fields: string[] = [];
  for (const [key, val] of Object.entries(sample)) {
    if (typeof val === "string" || typeof val === "number") {
      fields.push(key);
    }
  }
  return fields;
}

// --- Filter Manager ---

/**
 * Create a managed filter with state, debounced search, and change notifications.
 *
 * @example
 * ```ts
 * const mgr = createFilterManager({
 *   data: users,
 *   searchFields: ["name", "email"],
 *   onFilterChange: (r) => renderTable(r.items),
 * });
 * mgr.addCriteria({ field: "age", operator: "greaterThan", value: 18 });
 * mgr.setSearch("alice");
 * ```
 */
export function createFilterManager<T>(options: FilterManagerOptions<T>): {
  /** Get current filtered results */
  getResults: () => FilterResult<T>;
  /** Set the source data */
  setData: (data: T[]) => void;
  /** Add a filter criteria */
  addCriteria: (criteria: FilterCriteria<T>) => void;
  /** Remove criteria by index */
  removeCriteria: (index: number) => void;
  /** Clear all criteria */
  clearCriteria: () => void;
  /** Set search text (debounced) */
  setSearch: (text: string) => void;
  /** Get current search text */
  getSearchText: () => string;
  /** Get all active criteria */
  getCriteria: () => FilterCriteria<T>[];
  /** Toggle filter on/off */
  setActive: (active: boolean) => void;
  /** Check if filter is active */
  isActive: () => boolean;
  /** Reset everything */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
} {
  const {
    data: initialData,
    searchFields,
    debounceMs = 200,
    onFilterChange,
    accessor,
    caseSensitive = false,
    persistKey,
  } = options;

  let data = [...initialData];
  let criteria: FilterCriteria<T>[] = [];
  let searchText = "";
  let active = true;
  let destroyed = false;
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  // Restore persisted state
  if (persistKey) {
    try {
      const saved = localStorage.getItem(persistKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<FilterState<T>>;
        if (parsed.criteria) criteria = parsed.criteria;
        if (parsed.searchText) searchText = parsed.searchText;
        if (parsed.active !== undefined) active = parsed.active;
      }
    } catch {}
  }

  function computeAndNotify(): void {
    if (destroyed) return;
    const result = active
      ? filterItems(data, criteria, searchText, searchFields, { caseSensitive, accessor })
      : { items: data, totalBefore: data.length, totalAfter: data.length, filteredCount: 0 };
    onFilterChange?.(result);
  }

  function persist(): void {
    if (!persistKey || destroyed) return;
    try {
      localStorage.setItem(persistKey, JSON.stringify({ criteria, searchText, active }));
    } catch {}
  }

  // Immediate compute on init
  computeAndNotify();

  return {
    getResults() {
      return active
        ? filterItems(data, criteria, searchText, searchFields, { caseSensitive, accessor })
        : { items: data, totalBefore: data.length, totalAfter: data.length, filteredCount: 0 };
    },

    setData(newData: T[]) {
      data = newData;
      computeAndNotify();
    },

    addCriteria(c: FilterCriteria<T>) {
      criteria.push(c);
      persist();
      computeAndNotify();
    },

    removeCriteria(index: number) {
      criteria.splice(index, 1);
      persist();
      computeAndNotify();
    },

    clearCriteria() {
      criteria = [];
      persist();
      computeAndNotify();
    },

    setSearch(text: string) {
      searchText = text;
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        persist();
        computeAndNotify();
      }, debounceMs);
    },

    getSearchText() { return searchText; },
    getCriteria() { return [...criteria] },

    setActive(a: boolean) {
      active = a;
      persist();
      computeAndNotify();
    },

    isActive() { return active; },

    reset() {
      criteria = [];
      searchText = "";
      active = true;
      persist();
      computeAndNotify();
    },

    destroy() {
      destroyed = true;
      if (searchTimer) clearTimeout(searchTimer);
    },
  };
}

// --- Fuzzy Search ---

/** Simple fuzzy match score (0 = no match, 1 = exact match) */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  if (t === q) return 1;
  if (t.startsWith(q)) return 0.9;
  if (t.endsWith(q)) return 0.8;
  if (t.includes(q)) return 0.7;

  // Character-by-character scoring
  let qi = 0;
  let ti = 0;
  let score = 0;
  const maxScore = q.length;

  while (qi < q.length && ti < t.length) {
    if (q[qi] === t[ti]) {
      score++;
      qi++;
    }
    ti++;
  }

  return qi === q.length ? (score / maxScore) * 0.6 : 0;
}

/** Fuzzy sort — returns items sorted by best fuzzy match */
export function fuzzySearch<T>(
  items: T[],
  query: string,
  field?: keyof T | string,
): Array<{ item: T; score: number }> {
  if (!query.trim()) return items.map((item) => ({ item, score: 1 }));

  const results: Array<{ item: T; score: number }> = [];

  for (const item of items) {
    const value = field ? getFieldValue(item, field as string) : JSON.stringify(item);
    const score = fuzzyScore(query, String(value ?? ""));
    if (score > 0) results.push({ item, score });
  }

  return results.sort((a, b) => b.score - a.score);
}

// --- Quick Filters ---

/** Create a text filter that works with an input element */
export function bindFilterInput<T>(
  inputEl: HTMLInputElement,
  manager: ReturnType<typeof createFilterManager<T>>,
  debounceMs = 200,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const handler = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => manager.setSearch(inputEl.value), debounceMs);
  };

  inputEl.addEventListener("input", handler);

  return () => {
    inputEl.removeEventListener("input", handler);
    if (timer) clearTimeout(timer);
  };
}
