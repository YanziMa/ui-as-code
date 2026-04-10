/**
 * Array utilities.
 */

/** Chunk array into groups of given size */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Remove duplicates from array (preserves order) */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/** Group array by key function */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return arr.reduce(
    (groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    },
    {} as Record<string, T[]>,
  );
}

/** Sort array by key function */
export function sortBy<T>(arr: T[], keyFn: (item: T) => number | string): T[] {
  return [...arr].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal);
    }
    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
  });
}

/** Flatten nested arrays one level */
export function flatten<T>(arr: T[][]): T[] {
  return arr.flat();
}

/** Create an array of N items using factory */
export function times<T>(n: number, factory: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => factory(i));
}
