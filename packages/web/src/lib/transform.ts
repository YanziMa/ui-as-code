/**
 * Data transformation utilities — map, reduce, group, pivot operations.
 */

/** Transform an array of objects by applying a mapping function to each */
export function mapValues<T, R>(
  items: T[],
  keyFn: (item: T) => string,
  valueFn: (item: T) => R,
): Record<string, R> {
  const result: Record<string, R> = {};
  for (const item of items) {
    result[keyFn(item)] = valueFn(item);
  }
  return result;
}

/** Group array items by a key function and aggregate values */
export function groupAndAggregate<T, K extends string | number, V>(
  items: T[],
  keyFn: (item: T) => K,
  valueFn: (items: T[]) => V,
): Record<K, V> {
  const groups = new Map<K, T[]>();

  for (const item of items) {
    const key = keyFn(item);
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
    }
    group.push(item);
  }

  const result = {} as Record<K, V>;
  for (const [key, group] of groups) {
    result[key] = valueFn(group);
  }

  return result;
}

/** Pivot data: transform rows into columns */
export interface PivotOptions<T> {
  /** Column for row keys */
  rowKey: keyof T;
  /** Column for column keys */
  colKey: keyof T;
  /** Column for values */
  valueKey: keyof T;
  /** Aggregation for multiple values per cell (default: first) */
  aggregator?: "first" | "last" | "sum" | "avg" | "count" | "min" | "max";
  /** Default value for empty cells */
  fillValue?: unknown;
}

export function pivot<T extends Record<string, unknown>>(
  rows: T[],
  options: PivotOptions<T>,
): Record<string, Record<string, unknown>> {
  const { rowKey, colKey, valueKey, aggregator = "first", fillValue = null } = options;

  const cells: Record<string, Record<string, unknown[]>> = {};

  for (const row of rows) {
    const rKey = String(row[rowKey] ?? "");
    const cKey = String(row[colKey] ?? "");
    const value = row[valueKey];

    if (!cells[rKey]) cells[rKey] = {};
    if (!cells[rKey][cKey]) cells[rKey][cKey] = [];
    (cells[rKey][cKey] as unknown[]).push(value);
  }

  // Aggregate
  const result: Record<string, Record<string, unknown>> = {};
  for (const [rKey, cols] of Object.entries(cells)) {
    result[rKey] = {};
    for (const [cKey, values] of Object.entries(cols)) {
      const arr = values as unknown[];
      result[rKey][cKey] = aggregate(arr, aggregator) ?? fillValue;
    }
  }

  return result;
}

function aggregate(values: unknown[], type: string): unknown {
  if (values.length === 0) return undefined;

  switch (type) {
    case "first": return values[0];
    case "last": return values[values.length - 1];
    case "sum": return values.reduce((sum, v) => sum + (Number(v) || 0), 0);
    case "avg": return values.reduce((sum, v) => sum + (Number(v) || 0), 0) / values.length;
    case "count": return values.length;
    case "min": return Math.min(...values.map((v) => Number(v) || Infinity));
    case "max": return Math.max(...values.map((v) => Number(v) || -Infinity));
    default: return values[0];
  }
}

/** Unpivot: transform columns back into rows */
export function unpivot<T extends Record<string, unknown>>(
  data: T[],
  valueColumns: (keyof T)[],
  variableName = "variable",
  valueName = "value",
): Array<Record<string, unknown>> & { [K in string]: unknown }> {
  const result: Array<Record<string, unknown>> = [];

  for (const row of data) {
    for (const col of valueColumns) {
      result.push({
        ...row,
        [variableName]: col,
        [valueName]: row[col],
      });
    }
  }

  return result as Array<Record<string, unknown>> & { [K in string]: unknown >;
}

/** Flatten nested objects to dot-notation paths */
export function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
  separator = ".",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey, separator));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/** Unflatten dot-notation paths back to nested objects */
export function unflattenObject(
  flat: Record<string, unknown>,
  separator = ".",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split(separator);
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || current[part] === null || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

/** Deep merge with custom conflict resolution */
export function deepMergeCustom<T>(
  target: T,
  source: Partial<T>,
  resolver?: (key: string, targetVal: unknown, sourceVal: unknown) => unknown,
): T {
  const result = { ...target };

  for (const [key, sourceVal] of Object.entries(source)) {
    const targetVal = (result as Record<string, unknown>)[key];

    if (
      resolver &&
      targetVal !== undefined &&
      sourceVal !== undefined
    ) {
      (result as Record<string, unknown>)[key] = resolver(key, targetVal, sourceVal);
    } else if (
      sourceVal !== null &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      (result as Record<string, unknown>)[key] = deepMergeCustom(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
        resolver,
      );
    } else if (sourceVal !== undefined) {
      (result as Record<string, unknown>)[key] = sourceVal;
    }
  }

  return result;
}
