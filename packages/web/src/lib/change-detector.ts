/**
 * Change Detector: Deep object/array change detection with fine-grained diffing,
 * path-based change tracking, immutable-style snapshots, change batching,
 * custom equality functions, circular reference handling, and reactive
 * integration hooks.
 */

// --- Types ---

export type ChangeType = "added" | "removed" | "updated" | "moved" | "reordered"
  | "typeChanged" | "deepChange";

export interface ChangeInfo {
  type: ChangeType;
  /** Dot-notation path to the changed value */
  path: string;
  /** Previous value */
  oldValue: unknown;
  /** New value */
  newValue: unknown;
  /** For arrays: index of the change */
  index?: number;
  /** Nested changes (for objects/arrays) */
  children?: ChangeInfo[];
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface DiffResult {
  hasChanges: boolean;
  changes: ChangeInfo[];
  added: ChangeInfo[];
  removed: ChangeInfo[];
  updated: ChangeInfo[];
  moved: ChangeInfo[];
  reordered: boolean;
  /** Summary stats */
  stats: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    updatedCount: number;
    movedCount: number;
    unchangedCount: number;
    deepScanCount: number;
  };
}

export interface Snapshot<T = unknown> {
  value: T;
  timestamp: number;
  version: number;
  hash: string; // Quick-change-detection hash
}

export interface DetectorOptions {
  /** Max depth for recursive comparison (default: 10) */
  maxDepth?: number;
  /** Ignore these paths (dot-notation) */
  ignorePaths?: string[];
  /** Only watch these paths (null = watch all) */
  watchPaths?: string[] | null;
  /** Custom equality for specific types or paths */
  customEquality?: Map<string | RegExp, (a: unknown, b: unknown) => boolean>;
  /** Treat NaN as equal to NaN (default: true) */
  nanEqual?: boolean;
  /** Treat Date objects by their time value (default: true) */
  dateEqualByValue?: boolean;
  /** Treat Arrays as ordered (default: true) — false = set-like comparison */
  arrayOrderMatters?: boolean;
  /** Include unchanged values in diff (default: false) */
  includeUnchanged?: boolean;
  /** Circular reference handling: "error" | "skip" | "track" (default: "track") */
  circularHandling?: "error" | "skip" | "track";
  /** Batch multiple detect() calls within this ms window */
  batchMs?: number;
  /** Callback fired on any detected change */
  onChange?: (diff: DiffResult) => void;
  /** Callback for a specific path */
  onPathChange?: Record<string, (change: ChangeInfo) => void>;
}

// --- Hash Utilities ---

/** Generate a simple hash for quick change detection (not cryptographically secure) */
export function simpleHash(value: unknown): string {
  if (value == null) return "null";
  if (typeof value === "number") return `n:${value}`;
  if (typeof value === "boolean") return `b:${value}`;
  if (typeof value === "string") return `s:${value.length}:${value.slice(0, 32)}`;
  if (value instanceof Date) return `d:${value.getTime()}`;
  if (Array.isArray(value)) {
    return `[${value.map(simpleHash).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${simpleHash(v)}`);
    return `{${entries.join(",")}}`;
  }
  return `?:${String(value)}`;
}

// --- Main Change Detector ---

/**
 * Deep change detector that tracks differences between object states.
 *
 * ```ts
 * const detector = new ChangeDetector({ maxDepth: 5 });
 *
 * const snapshot1 = detector.snapshot({ users: [{ name: "Alice" }] });
 * // ... make changes ...
 * const snapshot2 = detector.snapshot({ users: [{ name: "Alice", age: 30 }] });
 *
 * const diff = detector.diff(snapshot1, snapshot2);
 * // diff.changes → [{ type: "added", path: "users.0.age", oldValue: undefined, newValue: 30 }]
 * ```
 */
export class ChangeDetector {
  private options: Required<Omit<DetectorOptions, "onChange" | "onPathChange">> & Pick<DetectorOptions, "onChange" | "onPathChange">>;
  private currentSnapshot: Snapshot | null = null;
  private version = 0;
  private pendingChanges: DiffResult | null = null;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: DetectorOptions = {}) {
    this.options = {
      maxDepth: options.maxDepth ?? 10,
      ignorePaths: options.ignorePaths ?? [],
      watchPaths: options.watchPaths ?? null,
      customEquality: options.customEquality ?? new Map(),
      nanEqual: options.nanEqual ?? true,
      dateEqualByValue: options.dateEqualByValue ?? true,
      arrayOrderMatters: options.arrayOrderMatters ?? true,
      includeUnchanged: options.includeUnchanged ?? false,
      circularHandling: options.circularHandling ?? "track",
      batchMs: options.batchMs ?? 0,
      onChange: options.onChange,
      onPathChange: options.onPathChange,
    };
  }

  /**
   * Create an immutable snapshot of a value.
   */
  snapshot<T>(value: T): Snapshot<T> {
    this.version++;
    return {
      value: JSON.parse(JSON.stringify(value)), // Deep clone
      timestamp: Date.now(),
      version: this.version,
      hash: simpleHash(value),
    };
  }

  /**
   * Compare two values and produce a detailed diff.
   */
  diff(a: unknown, b: unknown, basePath = ""): DiffResult {
    const changes: ChangeInfo[] = [];
    const visited = new Set<object>();
    const result = this.compareDeep(a, b, basePath, 0, visited, changes);

    // Filter by watch/ignore paths
    let filtered = changes;
    if (this.options.watchPaths !== null && this.options.watchPaths.length > 0) {
      filtered = filtered.filter((c) =>
        this.options.watchPaths!.some((p) =>
          c.path === p || c.path.startsWith(p + ".") || c.path.startsWith(p + "["),
        ),
      );
    }
    if (this.options.ignorePaths.length > 0) {
      filtered = filtered.filter((c) =>
        !this.options.ignorePaths.some((p) =>
          c.path === p || c.path.startsWith(p + ".") || c.path.startsWith(p + "["),
        ),
      );
    }

    const categorized = categorizeChanges(filtered);
    const stats = computeStats(categorized);

    const diffResult: DiffResult = {
      hasChanges: filtered.length > 0,
      changes: filtered,
      ...categorized,
      ...stats,
    };

    // Fire callbacks
    if (filtered.length > 0) {
      if (this.options.batchMs > 0) {
        this.pendingChanges = mergeDiffs(this.pendingChanges, diffResult);
        if (!this.batchTimer) {
          this.batchTimer = setTimeout(() => {
            this.options.onChange?.(this.pendingChanges!);
            this.pendingChanges = null;
            this.batchTimer = null;
          }, this.options.batchMs);
        }
      } else {
        this.options.onChange?.(diffResult);
      }

      // Path-specific callbacks
      if (this.options.onPathChange) {
        for (const change of filtered) {
          const handler = this.findPathHandler(change.path);
          if (handler) handler(change);
        }
      }
    }

    return diffResult;
  }

  /**
   * Detect changes since the last snapshot.
   */
  detect(newValue: unknown): DiffResult | null {
    if (!this.currentSnapshot) {
      this.currentSnapshot = this.snapshot(newValue);
      return null;
    }

    const diff = this.diff(this.currentSnapshot.value, newValue);
    if (diff.hasChanges) {
      this.currentSnapshot = this.snapshot(newValue);
    }
    return diff.hasChanges ? diff : null;
  }

  /**
   * Reset the detector state.
   */
  reset(): void {
    this.currentSnapshot = null;
    this.version = 0;
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.pendingChanges = null;
  }

  /**
   * Check if two values are equal using the detector's configuration.
   */
  equals(a: unknown, b: unknown, path = ""): boolean {
    const changes: ChangeInfo[] = [];
    const visited = new Set<object>();
    const result = this.compareDeep(a, b, path, 0, visited, changes);
    return result;
  }

  // --- Internal Comparison ---

  private compareDeep(
    a: unknown,
    b: unknown,
    path: string,
    depth: number,
    visited: Set<object>,
    changes: ChangeInfo[],
  ): boolean {
    // Depth limit
    if (depth > this.options.maxDepth) {
      // Treat as potentially different at max depth
      if (a !== b) {
        changes.push({ type: "deepChange", path, oldValue: a, newValue: b });
        return false;
      }
      return true;
    }

    // Custom equality check
    for (const [keyOrPattern, fn] of this.options.customEquality) {
      const match = typeof keyOrPattern === "string"
        ? path === keyOrPattern || path.startsWith(keyOrPattern + ".")
        : keyOrPattern.test(path);
      if (match) return fn(a, b);
    }

    // Type check
    const typeA = typeof a;
    const typeB = typeof b;

    if (typeA !== typeB) {
      changes.push({ type: "typeChanged", path, oldValue: a, newValue: b });
      return false;
    }

    // Null/undefined
    if (a == null && b == null) return true;
    if (a == null || b == null) {
      changes.push({ type: a == null ? "added" : "removed", path, oldValue: a, newValue: b });
      return false;
    }

    // NaN handling
    if (typeof a === "number" && typeof b === "number") {
      if (Number.isNaN(a) && Number.isNaN(b)) return this.options.nanEqual;
      if (a !== b) {
        changes.push({ type: "updated", path, oldValue: a, newValue: b });
        return false;
      }
      return true;
    }

    // Primitive types
    if (typeA !== "object") {
      if (a !== b) {
        changes.push({ type: "updated", path, oldValue: a, newValue: b });
        return false;
      }
      return true;
    }

    // Date comparison
    if (a instanceof Date && b instanceof Date) {
      if (this.options.dateEqualByValue ? a.getTime() !== b.getTime() : a !== b) {
        changes.push({ type: "updated", path, oldValue: a, newValue: b });
        return false;
      }
      return true;
    }

    // Array comparison
    if (Array.isArray(a) && Array.isArray(b)) {
      return this.compareArrays(a, b, path, depth, visited, changes);
    }

    // Object comparison
    if (typeof a === "object" && typeof b === "object") {
      return this.compareObjects(a as Record<string, unknown>, b as Record<string, unknown>, path, depth, visited, changes);
    }

    // Fallback
    if (a !== b) {
      changes.push({ type: "updated", path, oldValue: a, newValue: b });
      return false;
    }
    return true;
  }

  private compareArrays(
    a: unknown[],
    b: unknown[],
    path: string,
    depth: number,
    visited: Set<object>,
    changes: ChangeInfo[],
  ): boolean {
    let isEqual = true;

    // Circular check
    if (visited.has(a as object) || visited.has(b as object)) {
      return this.options.circularHandling !== "error";
    }
    visited.add(a as object);
    visited.add(b as object);

    if (this.options.arrayOrderMatters) {
      // Ordered comparison
      const maxLen = Math.max(a.length, b.length);

      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${path}[${i}]`;

        if (i >= a.length) {
          changes.push({ type: "added", path: itemPath, oldValue: undefined, newValue: b[i], index: i });
          isEqual = false;
        } else if (i >= b.length) {
          changes.push({ type: "removed", path: itemPath, oldValue: a[i], newValue: undefined, index: i });
          isEqual = false;
        } else if (!this.compareDeep(a[i]!, b[i]!, itemPath, depth + 1, visited, changes)) {
          isEqual = false;
        }
      }
    } else {
      // Unordered (set-like) comparison
      const aSet = new Set(a.map((v) => simpleHash(v)));
      const bSet = new Set(b.map((v) => simpleHash(v)));

      for (let i = 0; i < b.length; i++) {
        if (!aSet.has(simpleHash(b[i]))) {
          changes.push({ type: "added", path: `${path}[${i}]`, oldValue: undefined, newValue: b[i], index: i });
          isEqual = false;
        }
      }
      for (let i = 0; i < a.length; i++) {
        if (!bSet.has(simpleHash(a[i]))) {
          changes.push({ type: "removed", path: `${path}[${i}]`, oldValue: a[i], newValue: undefined, index: i });
          isEqual = false;
        }
      }
    }

    return isEqual;
  }

  private compareObjects(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    path: string,
    depth: number,
    visited: Set<object>,
    changes: ChangeInfo[],
  ): boolean {
    let isEqual = true;

    // Circular check
    if (visited.has(a) || visited.has(b)) {
      return this.options.circularHandling !== "error";
    }
    visited.add(a);
    visited.add(b);

    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;

      if (!(key in a)) {
        changes.push({ type: "added", path: keyPath, oldValue: undefined, newValue: b[key] });
        isEqual = false;
      } else if (!(key in b)) {
        changes.push({ type: "removed", path: keyPath, oldValue: a[key], newValue: undefined });
        isEqual = false;
      } else if (!this.compareDeep(a[key]!, b[key]!, keyPath, depth + 1, visited, changes)) {
        isEqual = false;
      }
    }

    return isEqual;
  }

  private findPathHandler(path: string): ((change: ChangeInfo) => void) | undefined {
    if (!this.options.onPathChange) return undefined;

    // Exact match first
    if (this.options.onPathChange[path]) return this.options.onPathChange[path];

    // Prefix match
    for (const [pattern, handler] of Object.entries(this.options.onPathChange)) {
      if (path.startsWith(pattern + ".") || path.startsWith(pattern + "[")) {
        return handler;
      }
    }

    return undefined;
  }
}

// --- Utility Functions ---

function categorizeChanges(changes: ChangeInfo[]): Pick<DiffResult, "added" | "removed" | "updated" | "moved"> {
  return {
    added: changes.filter((c) => c.type === "added"),
    removed: changes.filter((c) => c.type === "removed"),
    updated: changes.filter((c) => c.type === "updated" || c.type === "typeChanged" || c.type === "deepChange"),
    moved: changes.filter((c) => c.type === "moved"),
    reordered: changes.some((c) => c.type === "reordered"),
  };
}

function computeStats(cat: Pick<DiffResult, "added" | "removed" | "updated" | "moved">): Pick<DiffResult, "stats"> {
  return {
    stats: {
      totalChanges: cat.added.length + cat.removed.length + cat.updated.length + cat.moved.length,
      addedCount: cat.added.length,
      removedCount: cat.removed.length,
      updatedCount: cat.updated.length,
      movedCount: cat.moved.length,
      unchangedCount: 0, // Would need original count to compute
      deepScanCount: 0,
    },
  };
}

function mergeDiffs(existing: DiffResult | null, fresh: DiffResult): DiffResult {
  if (!existing) return fresh;
  return {
    hasChanges: true,
    changes: [...existing.changes, ...fresh.changes],
    added: [...existing.added, ...fresh.added],
    removed: [...existing.removed, ...fresh.removed],
    updated: [...existing.updated, ...fresh.updated],
    moved: [...existing.moved, ...fresh.moved],
    reordered: existing.reordered || fresh.reordered,
    stats: {
      totalChanges: existing.stats.totalChanges + fresh.stats.totalChanges,
      addedCount: existing.stats.addedCount + fresh.stats.addedCount,
      removedCount: existing.stats.removedCount + fresh.stats.removedCount,
      updatedCount: existing.stats.updatedCount + fresh.stats.updatedCount,
      movedCount: existing.stats.movedCount + fresh.stats.movedCount,
      unchangedCount: 0,
      deepScanCount: 0,
    },
  };
}

// --- Convenience Functions ---

/** One-shot diff between two values */
export function diffValues(a: unknown, b: unknown, options?: DetectorOptions): DiffResult {
  const detector = new ChangeDetector(options);
  return detector.diff(a, b);
}

/** Check if two values are deeply equal */
export function deepEquals(a: unknown, b: unknown, options?: Partial<DetectorOptions>): boolean {
  const detector = new ChangeDetector(options);
  return detector.equals(a, b);
}

/** Get all changed paths from a diff */
export function getChangedPaths(diff: DiffResult): string[] {
  return diff.changes.map((c) => c.path);
}

/** Get a flat map of path → ChangeInfo */
export function getChangeMap(diff: DiffResult): Map<string, ChangeInfo> {
  const map = new Map<string, ChangeInfo>();
  for (const change of diff.changes) {
    map.set(change.path, change);
  }
  return map;
}

/** Apply a set of changes to produce a new value (patch helper) */
export function applyChanges(base: unknown, changes: ChangeInfo[]): unknown {
  // Deep clone base
  const result = JSON.parse(JSON.stringify(base));

  for (const change of changes) {
    setAtPath(result, change.path, change.newValue);
  }

  return result;
}

/** Set a value at a dot-notation path in an object */
function setAtPath(obj: unknown, path: string, value: unknown): void {
  const parts = path.split(/[\.\[\]]+/).filter(Boolean);
  let current: Record<string, unknown> = obj as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (!(part in current) || current[part] == null || typeof current[part] !== "object") {
      // Determine if next part is numeric (array index)
      const nextIsNumeric = /^\d+$/.test(parts[i + 1] ?? "");
      current[part] = nextIsNumeric ? [] : {};
    }
    current = current[part] as Record<string, unknown>;
  }

  const lastPart = parts[parts.length - 1]!;
  current[lastPart] = value;
}
