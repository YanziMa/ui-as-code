/**
 * React Performance Utilities: Render optimization helpers,
 * virtualization utilities, memoization strategies, render tracking,
 * and performance monitoring for React applications.
 */

// --- Types ---

export interface PerfMetric {
  name: string;
  duration: number; // ms
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PerfReport {
  totalRenders: number;
  averageRenderTime: number;
  slowestRender: PerfMetric | null;
  metrics: PerfMetric[];
}

// --- Render Tracker ---

/**
 * Track component render times for performance analysis.
 *
 * @example
 * const tracker = createRenderTracker("MyComponent");
 * function MyComponent() {
 *   tracker.track(() => { /* render logic */ });
 * }
 */
export class RenderTracker {
  private metrics: PerfMetric[] = [];
  private maxEntries: number;

  constructor(componentName: string, maxEntries = 100) {
    this.maxEntries = maxEntries;
    this.componentName = componentName;
  }

  private componentName: string;

  /** Track a render operation */
  track<T>(fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.record({ name: "render", duration, timestamp: Date.now() });
    }
  }

  /** Record a custom metric */
  record(metric: Omit<PerfMetric, "timestamp"> & { timestamp?: number }): void {
    const entry: PerfMetric = { ...metric, timestamp: metric.timestamp ?? Date.now() };
    this.metrics.push(entry);
    if (this.metrics.length > this.maxEntries) this.metrics.shift();
  }

  /** Get all recorded metrics */
  getMetrics(): PerfMetric[] {
    return [...this.metrics];
  }

  /** Get a summary report */
  getReport(): PerfReport {
    if (this.metrics.length === 0) {
      return { totalRenders: 0, averageRenderTime: 0, slowestRender: null, metrics: [] };
    }

    const durations = this.metrics.map((m) => m.duration);
    const total = durations.reduce((a, b) => a + b, 0);
    const avg = total / durations.length;
    let slowestIdx = 0;
    for (let i = 1; i < durations.length; i++) {
      if (durations[i]! > durations[slowestIdx]!) slowestIdx = i;
    }

    return {
      totalRenders: this.metrics.length,
      averageRenderTime: avg,
      slowestRender: this.metrics[slowestIdx]!,
      metrics: [...this.metrics],
    };
  }

  /** Clear all recorded metrics */
  clear(): void {
    this.metrics = [];
  }

  /** Log report to console */
  logReport(): void {
    const report = this.getReport();
    console.group(`[PerfTracker] ${this.componentName}`);
    console.log(`Total renders: ${report.totalRenders}`);
    console.log(`Avg render time: ${report.averageRenderTime.toFixed(2)}ms`);
    if (report.slowestRender) {
      console.log(`Slowest: ${report.slowestRender.duration.toFixed(2)}ms`);
    }
    console.groupEnd();
  }
}

/** Create a new render tracker instance */
export function createRenderTracker(name: string, maxEntries?: number): RenderTracker {
  return new RenderTracker(name, maxEntries);
}

// --- Memoization Helpers ---

/** Create a memoized version of a pure function with LRU cache */
export function memoize<A extends unknown[], R>(
  fn: (...args: A) => R,
  options?: { maxSize?: number; keyFn?: (...args: A) => string },
): (...args: A) => R {
  const cache = new Map<string, R>();
  const maxSize = options?.maxSize ?? 64;
  const keyFn = options?.keyFn ?? ((...args: A) => JSON.stringify(args));

  return (...args: A): R => {
    const key = keyFn(...args);
    if (cache.has(key)) return cache.get(key)!;

    const result = fn(...args);

    // Evict oldest if over capacity
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  };
}

/** Deep equality check for memoization */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  if (typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }

  return false;
}

// --- Batch Update Utilities ---

/** Batch state updates to reduce re-renders */
export function createBatchUpdater<T>(
  updater: (updates: T[]) => void,
  flushIntervalMs = 0,
): { enqueue: (update: T) => void; flush: () => void; destroy: () => void } {
  const queue: T[] = [];
  let scheduled = false;
  let destroyed = false;

  function flush(): void {
    if (queue.length === 0 || destroyed) return;
    const batch = queue.splice(0);
    updater(batch);
    scheduled = false;
  }

  function enqueue(update: T): void {
    if (destroyed) return;
    queue.push(update);
    if (!scheduled) {
      scheduled = true;
      if (flushIntervalMs > 0) {
        setTimeout(flush, flushIntervalMs);
      } else {
        queueMicrotask(flush);
      }
    }
  }

  function destroy(): void {
    destroyed = true;
    queue.length = 0;
  }

  return { enqueue, flush, destroy };
}

// --- Idle Callback Utilities ---

/** Run work during browser idle periods */
export function runWhenIdle(
  callback: IdleRequestCallback,
  options?: { timeout?: number },
): () => void {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(callback, options);
    return (): void => cancelIdleCallback(id);
  }
  // Fallback
  const id = setTimeout(callback, options?.timeout ?? 1);
  return (): void => clearTimeout(id);
}

// --- Performance Marking ---

/** Mark a performance measurement point */
export function perfMark(name: string): void {
  if (performance.mark) performance.mark(name);
}

/** Measure between two marks */
export function perfMeasure(name: string, startMark: string, endMark?: string): number {
  try {
    if (performance.measure) {
      performance.measure(name, startMark, endMark);
      const entries = performance.getEntriesByName(name);
      return entries[entries.length - 1]?.duration ?? 0;
    }
  } catch { /* not supported */ }
  return 0;
}

/** Clear all performance marks and measures */
export function perfClearMarks(prefix?: string): void {
  if (!performance) return;
  if (prefix) {
    for (const entry of performance.getEntriesByType("mark")) {
      if (entry.name.startsWith(prefix)) performance.clearMarks(entry.name);
    }
    for (const entry of performance.getEntriesByType("measure")) {
      if (entry.name.startsWith(prefix)) performance.clearMeasures(entry.name);
    }
  } else {
    performance.clearMarks();
    performance.clearMeasures();
  }
}
