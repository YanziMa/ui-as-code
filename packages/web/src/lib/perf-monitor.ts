/**
 * Performance Monitor: FPS tracking, memory metrics, timing utilities,
 * performance observer API wrapper, resource timing analysis, and
 * performance profiling with report generation.
 */

// --- Types ---

export interface FpsMetrics {
  /** Current frames per second */
  fps: number;
  /** Average FPS over the measurement window */
  avgFps: number;
  /** Minimum FPS in the window */
  minFps: number;
  /** Maximum FPS in the window */
  maxFps: number;
  /** Frame time in ms (1/fps) */
  frameTime: number;
  /** Jank count (frames > 50ms) in current window */
  jankCount: number;
  /** Total frames rendered */
  totalFrames: number;
}

export interface MemoryInfo {
  /** Used JS heap size in bytes */
  usedJSHeapSize: number;
  /** Total JS heap size allocated */
  totalJSHeapSize: number;
  /** JS heap size limit */
  jsHeapSizeLimit: number;
  /** Quota usage percentage */
  quotaUsage: number;
  /** Number of performance entries */
  entryCount: number;
}

export interface PerfEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  transferSize?: number;
  transferTime?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  responseStart?: number;
  responseEnd?: number;
  domComplete?: number;
  loadEventEnd?: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  nextPaint?: number;
  interactionToNextPaint?: number;
  cumulativeLayoutShift?: number;
  firstInputDelay?: number;
  maxFirstInputDelay?: number;
  totalBlockingTime?: number;
  longTasks?: Array<{ name: string; duration: number; start: number }>;
}

export interface PerfReport {
  timestamp: string;
  url: string;
  navigation: PerfEntry | null;
  resources: PerfEntry[];
  fps: FpsMetrics | null;
  memory: MemoryInfo | null;
  webVitals: WebVitals | null;
  summary: string;
}

export interface WebVitals {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  inp: number; // Interaction to Next Paint
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Total Blocking Time
  tbt: number; // Total Blocking Time (same as ttfb, alias)
}

export interface PerfMonitorOptions {
  /** Container for displaying metrics (optional) */
  container?: HTMLElement | string;
  /** Enable FPS monitoring (default: false) */
  enableFps?: boolean;
  /** FPS sample window size in frames (default: 60) */
  fpsWindow?: number;
  /** Enable memory monitoring interval (ms), 0 = disabled (default: 2000) */
  memoryInterval?: number;
  /** Enable Long Task Observer */
  observeLongTasks?: boolean;
  /** Callback on each FPS tick */
  onFpsTick?: (metrics: FpsMetrics) => void;
  /** Callback when memory threshold exceeded */
  onMemoryWarning?: (info: MemoryInfo) => void;
  /** Custom performance entry filter */
  entryFilter?: (entry: PerformanceEntry) => boolean;
  /** Auto-generate reports at intervals? */
  autoReportInterval?: number;
  /** Report callback */
  onReport?: (report: PerfReport) => void;
  /** Logger instance to use for output */
  logger?: { debug: (msg: string, data?: Record<string, unknown>) => void };
}

// --- FPS Tracker ---

class FpsTracker {
  private frames: number[] = [];
  private lastTime = performance.now();
  private rafId: number | null = null;
  private running = false;
  private windowSize: number;

  constructor(windowSize = 60) {
    this.windowSize = windowSize;
  }

  start(onTick?: (m: FpsMetrics) => void): void {
    if (this.running) return;
    this.running = true;
    this.frames = [];
    this.lastTime = performance.now();

    const loop = () => {
      if (!this.running) return;
      const now = performance.now();
      this.frames.push(now);

      // Keep only the last N frames
      while (this.frames.length > this.windowSize) {
        this.frames.shift();
      }

      if (onTick) {
        onTick(this.getMetrics());
      }

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  getMetrics(): FpsMetrics {
    if (this.frames.length < 2) {
      return { fps: 0, avgFps: 0, minFps: 0, maxFps: 0, frameTime: Infinity, jankCount: 0, totalFrames: this.frames.length };
    }

    const now = performance.now();
    const recentFrames = this.frames.filter((t) => now - t < 1000); // Last second

    if (recentFrames.length === 0) {
      return { fps: 0, avgFps: 0, minFps: 0, maxFps: 0, frameTime: Infinity, jankCount: 0, totalFrames: this.frames.length };
    }

    let totalTime = 0;
    let minFps = Infinity;
    let maxFps = 0;
    let jankCount = 0;

    for (let i = 1; i < recentFrames.length; i++) {
      const delta = recentFrames[i]! - recentFrames[i - 1]!;
      const fps = 1000 / delta;
      totalTime += delta;
      minFps = Math.min(minFps, fps);
      maxFps = Math.max(maxFps, fps);
      if (delta > 50) jankCount++;
    }

    const avgFps = 1000 / (totalTime / (recentFrames.length - 1));
    const currentDelta = recentFrames[recentFrames.length - 1]! - recentFrames[recentFrames.length - 2]!;
    const currentFps = 1000 / currentDelta;

    return {
      fps: Math.round(currentFps),
      avgFps: Math.round(avgFps),
      minFps: Math.round(minFps),
      maxFps: Math.round(maxFps),
      frameTime: Math.round(currentDelta / 10) / 100,
      jankCount,
      totalFrames: this.frames.length,
    };
  }
}

// --- Memory Tracker ---

class MemoryTracker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private history: Array<{ timestamp: number; info: MemoryInfo }> = [];

  start(intervalMs: number, onWarning?: (info: MemoryInfo) => void): void {
    this.stop();
    this.history = [];

    const sample = () => {
      const info = this.getMemoryInfo();
      this.history.push({ timestamp: Date.now(), info });
      if (this.history.length > 100) this.history.shift(); // Keep last 100 samples
      onWarning?.(info);
    };

    sample(); // Initial
    this.intervalId = setInterval(sample, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getMemoryInfo(): MemoryInfo {
    const perf = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } });
    const mem = perf.memory ?? (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;

    return {
      usedJSHeapSize: mem.usedJSHeapSize ?? 0,
      totalJSHeapSize: mem.totalJSHeapSize ?? 0,
      jsHeapSizeLimit: mem.jsHeapSizeLimit ?? 0,
      quotaUsage: mem.jsHeapSizeLimit > 0 ? mem.usedJSHeapSize / mem.jsHeapSizeLimit : 0,
      entryCount: performance.getEntriesByType("measure").length,
    };
  }

  getHistory() { return [...this.history]; }
}

// --- Timer Utility ---

class PerfTimer {
  private marks = new Map<string, number>();
  private measures = new Map<string, { start: number; end?: number; duration?: number }>();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string): () => void {
    this.measures.set(name, { start: performance.now() });
    return () => {
      const end = performance.now();
      const m = this.measures.get(name)!;
      m.end = end;
      m.duration = end - m.start;
    };
  }

  getMark(name: string): number | undefined {
    return this.marks.get(name);
  }

  getMeasure(name: string): { start: number; end?: number; duration?: number } | undefined {
    return this.measures.get(name);
  }

  getAllMarks(): Record<string, number> {
    return Object.fromEntries(this.marks);
  }

  getAllMeasures(): Record<string, { start: number; end?: number; duration?: number }> {
    return Object.fromEntries(this.measures);
  }

  reset(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

// --- Main Monitor ---

export class PerfMonitor {
  private options: Required<Omit<PerfMonitorOptions, "container">>;
  private fpsTracker: FpsTracker;
  private memoryTracker: MemoryTracker;
  private timer: PerfTimer;
  private longTaskObserver: PerformanceObserver | null = null;
  private destroyed = false;
  private autoReportTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: PerfMonitorOptions = {}) {
    this.options = {
      container: options.container,
      enableFps: options.enableFps ?? false,
      fpsWindow: options.fpsWindow ?? 60,
      memoryInterval: options.memoryInterval ?? 2000,
      observeLongTasks: options.observeLongTasks ?? false,
      entryFilter: options.entryFilter ?? (() => true),
      ...options,
    };

    this.fpsTracker = new FpsTracker(this.options.fpsWindow);
    this.memoryTracker = new MemoryTracker();
    this.timer = new PerfTimer();

    // Start subsystems
    if (this.options.enableFps) {
      this.fpsTracker.start(this.options.onFpsTick);
    }
    if (this.options.memoryInterval > 0) {
      this.memoryTracker.start(this.options.memoryInterval, this.options.onMemoryWarning);
    }
    if (this.options.observeLongTasks) {
      this.setupLongTaskObserver();
    }
    if (this.options.autoReportInterval && this.options.autoReportInterval > 0) {
      this.autoReportTimer = setInterval(() => this.generateReport(), this.options.autoReportInterval);
    }
  }

  // --- Public API ---

  /** Get current FPS metrics */
  getFps(): FpsMetrics | null {
    return this.options.enableFps ? this.fpsTracker.getMetrics() : null;
  }

  /** Get current memory info */
  getMemory(): MemoryInfo {
    return this.memoryTracker.getMemoryInfo();
  }

  /** Get memory history samples */
  getMemoryHistory() { return this.memoryTracker.getHistory(); }

  /** Access the timer utility */
  getTimer(): PerfTimer { return this.timer; }

  /** Measure execution of a function */
  async measure<T>(fn: () => Promise<T>, label?: string): Promise<{ result: T; durationMs: number }> {
    const timerLabel = label ?? fn.name ?? "anonymous";
    this.timer.measure(timerLabel)();
    try {
      const result = await fn();
      this.timer.measure(timerLabel)();
      return { result, durationMs: this.timer.getMeasure(timerLabel)!.duration! };
    } catch (err) {
      this.timer.measure(timerLabel)();
      throw err;
    }
  }

  /** Measure synchronous function */
  measureSync<T>(fn: () => T, label?: string): { result: T; durationMs: number } {
    const timerLabel = label ?? fn.name ?? "anonymous";
    this.timer.measure(timerLabel)();
    try {
      const result = fn();
      this.timer.measure(timerLabel)();
      return { result, durationMs: this.timer.getMeasure(timerLabel)!.duration! };
    } catch (err) {
      this.timer.measure(timerLabel)();
      throw err;
    }
  }

  /** Generate a full performance report */
  generateReport(): PerfReport {
    const navEntries = performance.getEntriesByType("navigation");
    const nav = navEntries.length > 0 ? this.parseNavigationEntry(navEntries[0]) : null;
    const resourceEntries = performance.getEntriesByType("resource")
      .filter((e) => this.options.entryFilter(e as PerformanceEntry))
      .map((e) => this.parseResourceEntry(e));

    // Calculate Web Vitals
    const vitals = nav ? this.calcWebVitals(nav) : null;

    const report: PerfReport = {
      timestamp: new Date().toISOString(),
      url: typeof location !== "undefined" ? location.href : "",
      navigation: nav,
      resources: resourceEntries,
      fps: this.getFps(),
      memory: this.getMemory(),
      webVitals: vitals,
      summary: this.generateSummary(nav, vitals),
    };

    this.options.onReport?.(report);
    this.options.logger?.debug("Performance report generated", { url: report.url, summary: report.summary } as unknown);

    return report;
  }

  /** Get all performance entries */
  getEntries(type?: string): PerformanceEntry[] {
    if (type) return performance.getEntriesByType(type).filter((e) => this.options.entryFilter(e));
    return performance.getEntries().filter((e) => this.options.entryFilter(e));
  }

  /** Clear all performance buffers */
  clear(): void {
    performance.clearResourceTimings();
    performance.clearMeasures();
    if ("clearResourceTimings" in performance) (performance as unknown as { clearResourceTimings?: () => void }).clearResourceTimings?.();
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.destroyed = true;
    this.fpsTracker.stop();
    this.memoryTracker.stop();
    this.timer.reset();
    if (this.longTaskObserver) this.longTaskObserver.disconnect();
    if (this.autoReportTimer) clearInterval(this.autoReportTimer);
  }

  // --- Private ---

  private parseNavigationEntry(entry: PerformanceNavigationTiming): PerfEntry {
    return {
      name: "navigation",
      entryType: "navigation",
      startTime: entry.startTime,
      duration: entry.responseEnd - entry.requestStart,
      domComplete: entry.domContentLoadedEventEnd - entry.fetchStart,
      loadEventEnd: entry.loadEventEnd - entry.fetchStart,
      firstPaint: entry.responseStart - entry.fetchStart,
      firstContentfulPaint: entry.domContentLoadedEventEnd - entry.fetchStart,
      largestContentfulPaint: entry.domComplete,
      nextPaint: 0,
      interactionToNextPaint: 0,
      cumulativeLayoutShift: 0,
      firstInputDelay: 0,
      maxFirstInputDelay: 0,
      totalBlockingTime: 0,
      longTasks: [],
    };
  }

  private parseResourceEntry(entry: PerformanceResourceTiming): PerfEntry {
    return {
      name: entry.name,
      entryType: "resource",
      startTime: entry.startTime,
      duration: entry.responseEnd - entry.requestStart,
      transferSize: entry.transferSize,
      transferTime: entry.transferDuration,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      responseStart: entry.responseStart - entry.requestStart,
      responseEnd: entry.responseEnd - entry.requestStart,
    };
  }

  private calcWebVitals(nav: PerfEntry): WebVitals {
    const fcp = nav.firstContentfulPaint ?? 0;
    const lcp = nav.largestContentfulPaint ?? 0;
    const fid = nav.firstInputDelay ?? 0;
    const inp = nav.interactionToNextPaint ?? 0;
    const cls = nav.cumulativeLayoutShift ?? 0;
    const tbt = nav.totalBlockingTime ?? 0;

    return { fcp, lcp, fid, inp, cls, ttfb: tbt, tbt };
  }

  private generateSummary(nav: PerfEntry | null, vitals: WebVitals | null): string {
    const parts: string[] = [];

    if (nav) {
      parts.push(`Page load: ${Math.round(nav.duration)}ms`);
      parts.push(`DOM ready: ${Math.round(nav.domComplete ?? 0)}ms`);
    }

    if (vitals) {
      parts.push(`FCP: ${Math.round(vitals.fcp)}ms`);
      parts.push(`LCP: ${Math.round(vitals.lcp)}ms`);
      parts.push(`FID: ${Math.round(vitals.fid)}ms`);
      parts.push(`INP: ${Math.round(vitals.inp)}ms`);
      parts.push(`CLS: ${vitals.cls.toFixed(3)}`);
    }

    const mem = this.getMemory();
    if (mem) {
      parts.push(`Heap: ${formatBytes(mem.usedJSHeapSize)} / ${formatBytes(mem.totalJSHeapSize)} (${(mem.quotaUsage * 100).toFixed(0)}%)`);
    }

    return parts.join(" | ") || "No data";
  }

  private setupLongTaskObserver(): void {
    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        const tasks = list.getEntries()
          .filter((e) => e.duration > 50)
          .map((e) => ({ name: e.name, duration: e.duration, start: e.startTime }));

        if (tasks.length > 0 && this.options.logger) {
          this.options.logger.warn(`${tasks.length} long task(s) detected`, { tasks } as unknown);
        }
      });
      this.longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch {
      // PerformanceObserver not fully supported
    }
  }
}

// --- Formatting Helpers ---

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Convenience: create and start a performance monitor */
export function createPerfMonitor(options?: PerfMonitorOptions): PerfMonitor {
  return new PerfMonitor(options);
}
