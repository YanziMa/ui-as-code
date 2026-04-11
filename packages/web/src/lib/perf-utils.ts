/**
 * Performance Utilities: High-resolution timing, FPS monitoring, resource
 * timing, performance marks/measures, memory tracking, frame budget analysis,
 * and performance observer integration.
 */

// --- Types ---

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
  detail?: unknown;
}

export interface FrameStats {
  fps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameTime: number;
  droppedFrames: number;
  totalFrames: number;
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface ResourceTimingEntry {
  name: string;
  duration: number;
  transferSize: number;
  startTime: number;
  responseStart: number;
  responseEnd: number;
  initiatorType: string;
}

// --- Mark & Measure ---

const _marks = new Map<string, number>();

/** Create a named performance mark */
export function mark(name: string): void {
  if (typeof performance !== "undefined") {
    performance.mark(name);
  }
  _marks.set(name, performance.now());
}

/** Measure time between two marks (or from mark to now) */
export function measure(name: string, startMark?: string): number {
  const end = performance.now();
  const start = startMark ? (_marks.get(startMark) ?? 0) : (_marks.get(name) ?? 0);
  const duration = Math.round(end - start);

  if (typeof performance !== "undefined" && startMark && performance.getEntriesByName(startMark).length > 0) {
    try {
      performance.measure(name, startMark);
    } catch { /* ignore */ }
  }

  return duration;
}

/** End a mark and get elapsed duration */
export function endMark(name: string): number {
  return measure(name, name);
}

/** Clear all custom performance marks */
export function clearMarks(): void {
  _marks.clear();
  if (typeof performance !== "undefined") {
    try { performance.clearMarks(); } catch { /* ignore */ }
    try { performance.clearMeasures(); } catch { /* ignore */ }
  }
}

// --- Timer Wrapper ---

/**
 * Time a synchronous function and return its result + duration.
 *
 * @example
 * ```ts
 * const [result, ms] = perfTimer(() => heavyComputation());
 * console.log(`Took ${ms}ms`);
 * ```
 */
export function perfTimer<T>(fn: () => T): [T, number] {
  const start = performance.now();
  const result = fn();
  const duration = Math.round(performance.now() - start);
  return [result, duration];
}

/**
 * Time an async function and return its result + duration.
 */
export async function perfTimerAsync<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  return [result, duration];
}

// --- FPS Monitor ---

export interface FPSMonitorOptions {
  /** Sample window size in frames. Default 60 */
  sampleSize?: number;
  /** Called every frame with current stats */
  onFrame?: (stats: FrameStats) => void;
  /** Auto-start? Default false */
  autoStart?: boolean;
  /** Smoothing factor for average FPS (0-1). Default 0.1 */
  smoothing?: boolean;
}

export interface FPSMonitorInstance {
  /** Current stats */
  getStats: () => FrameStats;
  /** Start monitoring */
  start: () => void;
  /** Stop monitoring */
  stop: () => void;
  /** Check if running */
  isRunning: () => boolean;
  /** Get tick callback for manual use */
  tick: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

/**
 * Create an FPS monitor using requestAnimationFrame.
 *
 * @example
 * ```ts
 * const monitor = createFPSMonitor({ sampleSize: 60, onFrame: (s) => console.log(s.fps) });
 * monitor.start();
 * // Later:
 * monitor.stop();
 * ```
 */
export function createFPSMonitor(options: FPSMonitorOptions = {}): FPSMonitorInstance {
  const {
    sampleSize = 60,
    onFrame,
    autoStart = false,
    smoothing = true,
  } = options;

  let running = false;
  let rafId: number | null = null;
  let lastTime = performance.now();
  const frameTimes: number[] = [];
  let droppedFrames = 0;
  let totalFrames = 0;

  // Exponential moving average for smoothed FPS
  let emaFPS = 60;
  const alpha = 0.1; // smoothing factor

  function calcStats(): FrameStats {
    if (frameTimes.length === 0) {
      return {
        fps: 0, avgFps: 0, minFps: 0, maxFps: 0,
        frameTime: 0, droppedFrames, totalFrames,
      };
    }

    const recent = frameTimes.slice(-Math.min(sampleSize, frameTimes.length));
    const avgFrameTime = recent.reduce((a, b) => a + b, 0) / recent.length;
    const fps = avgFrameTime > 0 ? Math.round(1000 / avgFrameTime) : 0;

    // EMA smoothing
    if (smoothing) {
      emaFPS = emaFPS === 0 ? fps : Math.round(alpha * fps + (1 - alpha) * emaFPS);
    }

    const sorted = [...recent].sort((a, b) => a - b);

    return {
      fps: smoothing ? emaFPS : fps,
      avgFps: emaFPS,
      minFps: sorted[sorted.length - 1] > 0 ? Math.round(1000 / sorted[sorted.length - 1]!) : 0,
      maxFps: sorted[0] > 0 ? Math.round(1000 / sorted[0]!) : 0,
      frameTime: Math.round(avgFrameTime),
      droppedFrames,
      totalFrames,
    };
  }

  function loop(now: number): void {
    if (!running) return;

    const frameTime = now - lastTime;
    lastTime = now;
    totalFrames++;

    // Count as dropped if frame took > 50ms (below 20fps for that frame)
    if (frameTime > 50) droppedFrames++;

    frameTimes.push(frameTime);
    if (frameTimes.length > sampleSize * 2) {
      frameTimes.splice(0, frameTimes.length - sampleSize);
    }

    onFrame?.(calcStats());
    rafId = requestAnimationFrame(loop);
  }

  function tick(): void {
    loop(performance.now());
  }

  function start(): void {
    if (running) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop(): void {
    running = false;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function isRunning(): boolean { return running; }

  function destroy(): void {
    stop();
    frameTimes.length = 0;
    droppedFrames = 0;
    totalFrames = 0;
  }

  if (autoStart) start();

  return { getStats: calcStats, start, stop, isRunning, tick, destroy };
}

// --- Memory Tracking ---

/** Get memory info if available (Chrome/Node only) */
export function getMemoryInfo(): MemoryInfo | null {
  try {
    const mem = (performance as unknown as { memory?: MemoryInfo }).memory;
    if (mem) {
      return {
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize,
        jsHeapSizeLimit: mem.jsHeapSizeLimit,
      };
    }
  } catch { /* not available */ }
  return null;
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Format memory info for display */
export function formatMemoryInfo(mem: MemoryInfo): string {
  return `Used: ${formatBytes(mem.usedJSHeapSize)} / Total: ${formatBytes(mem.totalJSHeapSize)} / Limit: ${formatBytes(mem.jsHeapSizeLimit)}`;
}

// --- Resource Timing ---

/** Get performance resource entries filtered by type */
export function getResourceTimings(filter?: (entry: PerformanceResourceTiming) => boolean): ResourceTimingEntry[] {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return [];

  try {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const filtered = filter ? entries.filter(filter) : entries;

    return filtered.map((e) => ({
      name: e.name,
      duration: Math.round(e.duration),
      transferSize: e.transferSize,
      startTime: Math.round(e.startTime),
      responseStart: Math.round(e.responseStart),
      responseEnd: Math.round(e.responseEnd),
      initiatorType: e.initiatorType,
    }));
  } catch { return []; }
}

/** Get resources by initiator type (script, img, fetch, xmlhttprequest, etc.) */
export function getResourcesByType(type: string): ResourceTimingEntry[] {
  return getResourceTimings((e) => e.initiatorType === type);
}

/** Get slowest N resources by duration */
export function getSlowestResources(count = 5): ResourceTimingEntry[] {
  return getResourceTimings()
    .sort((a, b) => b.duration - a.duration)
    .slice(0, count);
}

/** Get largest resources by transfer size */
export function getLargestResources(count = 5): ResourceTimingEntry[] {
  return getResourceTimings()
    .filter((r) => r.transferSize > 0)
    .sort((a, b) => b.transferSize - a.transferSize)
    .slice(0, count);
}

// --- Navigation Timing ---

/** Get key navigation timing metrics */
export function getNavigationTiming() {
  if (typeof performance === "undefined" || !performance.getEntriesByType) return null;

  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (!nav) return null;

    return {
      dnsLookup: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
      tcpConnect: Math.round(nav.connectEnd - nav.connectStart),
      tlsHandshake: Math.round(nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0),
      ttfb: Math.round(nav.responseStart - nav.requestStart), // Time to first byte
      download: Math.round(nav.responseEnd - nav.responseStart),
      domInteractive: Math.round(nav.domInteractive - nav.startTime),
      domComplete: Math.round(nav.domComplete - nav.startTime),
      loadEvent: Math.round(nav.loadEventEnd - nav.loadEventStart),
      total: Math.round(nav.loadEventEnd - nav.startTime),
    };
  } catch { return null; }
}

// --- Performance Observer ---

/** Observe long tasks (tasks taking > 50ms) */
export function observeLongTasks(
  callback: (entries: PerformanceEntryList) => void,
): () => void {
  if (typeof PerformanceObserver === "undefined") return () => {};

  try {
    const observer = new PerformanceObserver((list) => callback(list.getEntries()));
    observer.observe({ entryTypes: ["longtask"] });
    return () => observer.disconnect();
  } catch {
    // longtask may not be supported
    return () => {};
  }
}

/** Observe layout shifts (CLS) */
export function observeLayoutShift(
  callback: (value: number, entry: PerformanceEntry) => void,
): () => void {
  if (typeof PerformanceObserver === "undefined") return () => {};

  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          callback(clsValue, entry);
        }
      }
    });
    observer.observe({ entryTypes: ["layout-shift"] });
    return () => observer.disconnect();
  } catch { return () => {}; }
}

// --- Frame Budget ---

interface BudgetEntry {
  name: string;
  budgetMs: number;
  actualMs: number;
  overBudget: boolean;
}

/** Track whether operations fit within a frame budget (e.g., 16ms for 60fps) */
export class FrameBudgetTracker {
  private budgetMs: number;
  private entries: BudgetEntry[] = [];

  constructor(budgetMs = 16) {
    this.budgetMs = budgetMs;
  }

  /** Measure an operation against the frame budget */
  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const actual = Math.round(performance.now() - start);

    this.entries.push({ name, budgetMs: this.budgetMs, actualMs: actual, overBudget: actual > this.budgetMs });

    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const actual = Math.round(performance.now() - start);

    this.entries.push({ name, budgetMs: this.budgetMs, actualMs: actual, overBudget: actual > this.budgetMs });

    return result;
  }

  /** Get all entries */
  getEntries(): BudgetEntry[] { return [...this.entries]; }

  /** Get entries that exceeded the budget */
  getOverBudgetEntries(): BudgetEntry[] {
    return this.entries.filter((e) => e.overBudget);
  }

  /** Get budget violation rate (0-1) */
  getViolationRate(): number {
    if (this.entries.length === 0) return 0;
    return this.getOverBudgetEntries().length / this.entries.length;
  }

  /** Get summary stats */
  getSummary() {
    const entries = this.entries;
    if (entries.length === 0) return { count: 0, avgMs: 0, maxMs: 0, violations: 0, rate: 0 };

    const total = entries.reduce((s, e) => s + e.actualMs, 0);
    const max = Math.max(...entries.map((e) => e.actualMs));
    const violations = this.getOverBudgetEntries().length;

    return {
      count: entries.length,
      avgMs: Math.round(total / entries.length),
      maxMs,
      violations,
      rate: violations / entries.length,
    };
  }

  clear(): void { this.entries = []; }
}
