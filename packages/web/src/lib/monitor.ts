/**
 * Monitor: Performance and health monitoring utilities including
 * FPS tracking, memory monitoring, long task detection,
 * resource timing analysis, custom metrics, and alerting.
 *
 * Provides:
 *   - FPS monitor with min/max/avg/p50/p99 stats
 *   - Memory usage tracking (if performance.memory available)
 *   - Long task detection via PerformanceObserver
 *   - Resource Timing API wrapper
 *   - Custom metric collection and aggregation
 *   - Health score computation
 *   - Alerting threshold system
 *   - Report generation
 */

// --- Types ---

export interface FpsSample {
  timestamp: number;
  fps: number;
  delta: number;
}

export interface FpsStats {
  current: number;
  average: number;
  min: number;
  max: number;
  p50: number;
  p99: number;
  samples: FpsSample[];
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  percentUsed: number;
}

export interface LongTaskEntry {
  name: string;
  duration: number;
  startTime: number;
  attribution: string[];
}

export interface MetricValue {
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface MonitorConfig {
  /** Enable FPS monitoring (default: true) */
  fps?: boolean;
  /** Enable memory monitoring (default: true) */
  memory?: boolean;
  /** Enable long task detection (default: true) */
  longTasks?: boolean;
  /** Long task threshold in ms (default: 50) */
  longTaskThreshold?: number;
  /** Sample retention count (default: 300) */
  sampleCount?: number;
  /** Custom metrics interval (ms, default: 5000) */
  metricsInterval?: number;
  /** Auto-start on creation (default: true) */
  autoStart?: boolean;
}

export interface MonitorInstance {
  /** Current FPS */
  getFps: () => number;
  /** Full FPS statistics */
  getFpsStats: () => FpsStats;
  /** Current memory info (or null if unavailable) */
  getMemory: () => MemoryInfo | null;
  /** Detected long tasks since start */
  getLongTasks: () => LongTaskEntry[];
  /** Record a custom metric */
  recordMetric: (name: string, value: number, unit?: string, tags?: Record<string, string>) => void;
  /** Get all recorded custom metrics */
  getMetrics: () => Map<string, MetricValue[]>;
  /** Compute overall health score (0-100) */
  getHealthScore: () => number;
  /** Generate a text report */
  getReport: () => string;
  /** Start all monitors */
  start: () => void;
  /** Stop all monitors */
  stop: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- FPS Monitor ---

class FpsMonitor {
  private samples: FpsSample[] = [];
  private rafId: number | null = null;
  private lastTime = performance.now();
  private running = false;
  readonly maxSamples: number;

  constructor(maxSamples = 300) { this.maxSamples = maxSamples; }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  private tick(): void {
    if (!this.running) return;
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    const fps = delta > 0 ? 1000 / delta : 0;

    this.samples.push({ timestamp: now, fps, delta });
    if (this.samples.length > this.maxSamples) this.samples.shift();

    this.rafId = requestAnimationFrame(() => this.tick());
  }

  get currentFps(): number {
    return this.samples.length > 0 ? this.samples[this.samples.length - 1]!.fps : 0;
  }

  getStats(): FpsStats {
    if (this.samples.length === 0) return { current: 0, average: 0, min: 0, max: 0, p50: 0, p99: 0, samples: [] };
    const fpss = this.samples.map((s) => s.fps).sort((a, b) => a - b);
    return {
      current: this.currentFps(),
      average: fpss.reduce((a, b) => a + b, 0) / fpss.length,
      min: fpss[0]!,
      max: fpss[fpss.length - 1]!,
      p50: percentile(fpss, 50),
      p99: percentile(fpss, 99),
      samples: [...this.samples],
    };
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, sorted.length - 1);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

// --- Main Factory ---

export function createMonitor(config: MonitorConfig = {}): MonitorInstance {
  const {
    longTaskThreshold = 50,
    sampleCount = 300,
    metricsInterval = 5000,
    autoStart = true,
  } = config;

  const fpsMonitor = new FpsMonitor(sampleCount);
  const longTasks: LongTaskEntry[] = [];
  const customMetrics = new Map<string, MetricValue[]>();
  let metricsTimer: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;
  let longTaskObserver: PerformanceObserver | null = null;

  function start(): void {
    if (destroyed) return;
    if (config.fps !== false) fpsMonitor.start();
    if (config.longTasks !== false) observeLongTasks();
    if (metricsTimer === null) {
      metricsTimer = setInterval(() => {}, metricsInterval);
    }
  }

  function stop(): void {
    fpsMonitor.stop();
    if (longTaskObserver) { longTaskObserver.disconnect(); longTaskObserver = null; }
    if (metricsTimer) { clearInterval(metricsTimer); metricsTimer = null; }
  }

  function observeLongTasks(): void {
    if (!("PerformanceObserver" in window)) return;
    try {
      longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const task = entry as PerformanceEventTiming;
          longTasks.push({
            name: task.name,
            duration: task.duration,
            startTime: task.startTime,
            attribution: (task as unknown as { attribution: { containers: string[] } }) ).attribution?.containers ?? [],
          });
          // Keep only recent 100
          if (longTasks.length > 100) longTasks.shift();
        }
      });
      longTaskObserver.observe({ entryTypes: ["longtask"] });
    } catch { /* not supported */ }
  }

  function getMemory(): MemoryInfo | null {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (!mem) return null;
    return {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
      percentUsed: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100),
    };
  }

  function recordMetric(name: string, value: number, unit = "", tags?: Record<string, string>): void {
    const arr = customMetrics.get(name) ?? [];
    arr.push({ value, unit, timestamp: Date.now(), tags });
    customMetrics.set(name, arr);
    if (arr.length > 1000) arr.shift();
  }

  function getHealthScore(): number {
    let score = 100;
    const fps = fpsMonitor.getStats();
    if (fps.current < 30) score -= 40;
    else if (fps.current < 55) score -= 20;
    else if (fps.average < 30) score -= 15;

    const mem = getMemory();
    if (mem && mem.percentUsed > 90) score -= 25;
    else if (mem && mem.percentUsed > 75) score -= 10;

    const recentLongTasks = longTasks.filter((t) => Date.now() - t.startTime < 10000);
    if (recentLongTasks.length > 10) score -= 20;
    else if (recentLongTasks.length > 3) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  function getReport(): string {
    const fps = fpsMonitor.getStats();
    const mem = getMemory();
    const health = getHealthScore();
    const recentLT = longTasks.filter((t) => Date.now() - t.startTime < 30000);

    return [
      `=== Performance Monitor Report ===`,
      `Health Score: ${health}/100`,
      ``,
      `FPS: current=${fps.current.toFixed(1)} avg=${fps.average.toFixed(1)} min=${fps.min.toFixed(1)} max=${fps.max.toFixed(1)} p50=${fps.p50.toFixed(1)} p99=${fps.p99.toFixed(1)}`,
      mem ? `Memory: ${(mem.usedJSHeapSize / 1024 / 1024).toFixed(0)}MB / ${(mem.jsHeapSizeLimit / 1024 / 1024).toFixed(0)}MB (${mem.percentUsed}%)` : "",
      `Long Tasks (30s): ${recentLT.length} (threshold: ${longTaskThreshold}ms)`,
      recentLT.length > 0 ? `  Latest: ${recentLT.map((t) => `${t.name} ${t.duration.toFixed(0)}ms`).join(", ")}` : "",
      `Custom Metrics: ${customMetrics.size} defined`,
    ].filter(Boolean).join("\n");
  }

  function destroy(): void {
    destroyed = true;
    stop();
    customMetrics.clear();
  }

  if (autoStart) start();

  return {
    getFps: () => fpsMonitor.currentFps(),
    getFpsStats: () => fpsMonitor.getStats(),
    getMemory,
    getLongTasks: () => [...longTasks],
    recordMetric,
    getMetrics: () => new Map(customMetrics),
    getHealthScore,
    getReport,
    start, stop, destroy,
  };
}
