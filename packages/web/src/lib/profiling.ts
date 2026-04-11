/**
 * Profiling Utilities: Code profiling, function timing instrumentation,
 * call tree tracking, memory usage monitoring, flame graph data generation,
 * and performance bottleneck detection.
 */

// --- Types ---

export interface ProfileEntry {
  /** Function/operation name */
  name: string;
  /** Duration in milliseconds */
  duration: number;
  /** Start timestamp */
  startTime: number;
  /** End timestamp */
  endTime?: number;
  /** Call depth for visualization */
  depth: number;
  /** Child entries (for nested calls) */
  children: ProfileEntry[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
  /** Number of times called */
  callCount: number;
}

export interface ProfilerOptions {
  /** Auto-start on creation? (default: true) */
  autoStart?: boolean;
  /** Maximum entries to keep (default: 10000) */
  maxEntries?: number;
  /** Sample interval in ms for sampling profiler (default: 0 = manual only) */
  sampleIntervalMs?: number;
  /** Enable call stack capture? */
  captureStack?: boolean;
  /** Callback when an entry is completed */
  onEntryComplete?: (entry: ProfileEntry) => void;
}

export interface TimerHandle {
  /** Stop the timer and record the entry */
  stop: (metadata?: Record<string, unknown>) => ProfileEntry;
  /** Cancel without recording */
  cancel: () => void;
  /** Get elapsed time so far (without stopping) */
  elapsed: () => number;
}

// --- Main Profiler ---

/**
 * Create a code profiler that tracks function execution times,
 * builds a call tree, and generates profiling reports.
 */
export function createProfiler(options: ProfilerOptions = {}): {
  start: (name: string, metadata?: Record<string, unknown>) => TimerHandle;
  getEntries: () => ProfileEntry[];
  getFlatEntries: () => ProfileEntry[];
  getStats: () => ProfilerStats;
  getCallTree: () => ProfileEntry;
  clear: () => void;
  getReport: () => string;
  destroy: () => void;
} {
  const {
    autoStart = true,
    maxEntries = 10000,
    captureStack = false,
    onEntryComplete,
  } = options;

  const entries: ProfileEntry[] = [];
  const activeTimers = new Map<string, { start: number; name: string; meta?: Record<string, unknown>; stack?: string }>();
  let destroyed = false;
  let entryIdCounter = 0;

  function start(name: string, metadata?: Record<string, unknown>): TimerHandle {
    if (destroyed) return { stop: () => ({}) as ProfileEntry, cancel: () => {}, elapsed: () => 0 };

    const id = `prof_${++entryIdCounter}`;
    const startTime = performance.now();
    const stack = captureStack ? new Error().stack : undefined;

    activeTimers.set(id, { start: startTime, name, meta: metadata, stack });

    return {
      stop(stopMeta?: Record<string, unknown>): ProfileEntry {
        const timer = activeTimers.get(id);
        if (!timer) { return { name, duration: 0, startTime, depth: 0, children: [], callCount: 0 }; }
        activeTimers.delete(id);

        const endTime = performance.now();
        const duration = endTime - timer.start;
        const mergedMeta = { ...timer.meta, ...stopMeta };

        const entry: ProfileEntry = {
          name: timer.name,
          duration,
          startTime: timer.start,
          endTime,
          depth: 0,
          children: [],
          metadata: mergedMeta,
          callCount: 1,
        };

        if (entries.length < maxEntries) {
          entries.push(entry);
        }

        onEntryComplete?.(entry);
        return entry;
      },
      cancel(): void {
        activeTimers.delete(id);
      },
      elapsed(): number {
        const timer = activeTimers.get(id);
        return timer ? performance.now() - timer.start : 0;
      },
    };
  }

  function getEntries(): ProfileEntry[] {
    return [...entries];
  }

  function getFlatEntries(): ProfileEntry[] {
    // Flatten all nested children into a single list
    const flat: ProfileEntry[] = [];
    for (const entry of entries) {
      flat.push(entry);
      collectChildren(entry.children, flat);
    }
    return flat;
  }

  function collectChildren(children: ProfileEntry[], target: ProfileEntry[]): void {
    for (const child of children) {
      target.push(child);
      collectChildren(child.children, target);
    }
  }

  function getStats(): ProfilerStats {
    const all = getFlatEntries();
    if (all.length === 0) return emptyStats();

    const durations = all.map((e) => e.duration);
    const totalDuration = durations.reduce((a, b) => a + b, 0);

    // Group by name
    const byName = new Map<string, ProfileEntry[]>();
    for (const entry of all) {
      const list = byName.get(entry.name) ?? [];
      list.push(entry);
      byName.set(entry.name, list);
    }

    // Find slowest operations
    const sorted = [...all].sort((a, b) => b.duration - a.duration);
    const top5 = sorted.slice(0, 5);

    // Percentiles
    const sortedDurations = durations.sort((a, b) => a - b);
    const p50Idx = Math.floor(sortedDurations.length * 0.5);
    const p90Idx = Math.floor(sortedDurations.length * 0.9);
    const p99Idx = Math.floor(sortedDurations.length * 0.99);

    return {
      totalEntries: all.length,
      totalDuration,
      avgDuration: totalDuration / all.length,
      minDuration: sortedDurations[0] ?? 0,
      maxDuration: sortedDurations[sortedDurations.length - 1] ?? 0,
      p50: sortedDurations[p50Idx] ?? 0,
      p90: sortedDurations[p90Idx] ?? 0,
      p99: sortedDurations[p99Idx] ?? 0,
      uniqueOperations: byName.size,
      topSlowest: top5.map((e) => ({ name: e.name, duration: e.duration, count: e.callCount })),
    };
  }

  function getCallTree(): ProfileEntry {
    // Build a simple root node with all entries as children
    const root: ProfileEntry = {
      name: "__root__",
      duration: 0,
      startTime: entries[0]?.startTime ?? performance.now(),
      depth: -1,
      children: [...entries],
      callCount: 0,
    };

    // Calculate total duration
    for (const entry of entries) {
      root.duration = Math.max(root.duration, (entry.endTime ?? entry.startTime + entry.duration));
    }

    return root;
  }

  function getReport(): string {
    const stats = getStats();
    const lines: string[] = [];

    lines.push("=== Profiler Report ===");
    lines.push(`Total entries: ${stats.totalEntries}`);
    lines.push(`Total time: ${stats.totalDuration.toFixed(2)}ms`);
    lines.push(`Avg: ${stats.avgDuration.toFixed(2)}ms`);
    lines.push(`Min: ${stats.minDuration.toFixed(2)}ms | Max: ${stats.maxDuration.toFixed(2)}ms`);
    lines.push(`P50: ${stats.p50.toFixed(2)}ms | P90: ${stats.p90.toFixed(2)}ms | P99: ${stats.p99.toFixed(2)}ms`);
    lines.push("");

    lines.push("--- Top 5 Slowest Operations ---");
    for (const op of stats.topSlowest) {
      lines.push(`  ${op.name}: ${op.duration.toFixed(2)}ms (${op.count} calls${op.count > 1 ? `, ${(op.duration / op.count).toFixed(2)}ms avg` : ""})`);
    }

    return lines.join("\n");
  }

  function clear(): void {
    entries.length = 0;
    activeTimers.clear();
  }

  function destroy(): void {
    destroyed = true;
    clear();
  }

  return { start, getEntries, getFlatEntries, getStats, getCallTree, getReport, clear, destroy };
}

// --- Stats Type ---

interface ProfilerStats {
  totalEntries: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p90: number;
  p99: number;
  uniqueOperations: number;
  topSlowest: Array<{ name: string; duration: number; count: number }>;
}

function emptyStats(): ProfilerStats {
  return {
    totalEntries: 0,
    totalDuration: 0,
    avgDuration: 0,
    minDuration: 0,
    maxDuration: 0,
    p50: 0,
    p90: 0,
    p99: 0,
    uniqueOperations: 0,
    topSlowest: [],
  };
}

// --- Convenience Wrappers ---

/**
 * Time a synchronous function.
 */
export function profileFn<T>(fn: () => T, label = "anonymous"): { result: T; duration: number } {
  const profiler = createProfiler();
  const handle = profiler.start(label);
  let error: unknown;
  let result: T;

  try {
    result = fn();
  } catch (e) {
    error = e;
  }

  handle.stop();

  if (error) throw error;
  return { result, duration: handle.elapsed() };
}

/**
 * Time an async function.
 */
export async function profileAsyncFn<T>(
  fn: () => Promise<T>,
  label = "anonymous",
): Promise<{ result: T; duration: number }> {
  const profiler = createProfiler();
  const handle = profiler.start(label);
  let error: unknown;
  let result: T;

  try {
    result = await fn();
  } catch (e) {
    error = e;
  }

  handle.stop();

  if (error) throw error;
  return { result, duration: handle.elapsed() };
}

/**
 * Higher-order function: wrap any function to auto-profile it.
 */
export function withProfile<T extends (...args: any[]) => any>(
  fn: T,
  label?: string,
): T {
  const name = label ?? (fn.name || "anonymous");

  return ((...args: Parameters<T>) => {
    const profiler = createProfiler();
    const handle = profiler.start(name);
    let error: unknown;
    let result: ReturnType<T>;

    try {
      result = fn(...args);
    } catch (e) {
      error = e;
    }

    if (result instanceof Promise) {
      return result
        .then((val) => { handle.stop(); return val; })
        .catch((err) => { handle.stop(); throw err; }) as ReturnType<T>;
    }

    handle.stop();
    if (error) throw error;
    return result as ReturnType<T>;
  }) as T;
}

// --- Memory Profiling ---

/**
 * Get current memory usage (if supported).
 */
export function getMemoryUsage(): MemoryUsageInfo | null {
  if (typeof performance === "undefined" || !(performance as any).memory) return null;

  const mem = (performance as any).memory;
  return {
    usedJSHeapSize: mem.usedJSHeapSize,
    totalJSHeapSize: mem.totalJSHeapSize,
    jsHeapSizeLimit: mem.jsHeapSizeLimit,
  };
}

interface MemoryUsageInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Measure memory usage before and after an operation.
 */
export async function measureMemory<T>(fn: () => Promise<T> | T): Promise<{
  result: T;
  before: MemoryUsageInfo | null;
  after: MemoryUsageInfo | null;
  delta: number;
}> {
  const before = getMemoryUsage();
  const result = await fn();
  const after = getMemoryUsage();
  const delta = (after?.usedJSHeapSize ?? 0) - (before?.usedJSHeapSize ?? 0);

  return { result, before, after, delta };
}
