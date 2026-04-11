/**
 * Performance measurement and monitoring: User Timing API wrapper,
 * FPS counter, memory tracking, resource timing, performance observer,
 * and rendering performance metrics.
 */

// --- Types ---

export interface PerfMark {
  name: string;
  startTime: number;
  detail?: Record<string, unknown>;
}

export interface PerfMeasure {
  name: string;
  duration: number;
  startTime: number;
  entryType: "measure";
}

export interface FpsStats {
  current: number;
  average: number;
  min: number;
  max: number;
  frameCount: number;
  totalDuration: number;
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
  encodedBodySize: number;
  decodedBodySize: number;
  startTime: number;
  responseStart: number;
  responseEnd: number;
  initiatorType: string;
}

// --- User Timing API Wrapper ---

/** Create a performance mark */
export function perfMark(name: string, detail?: Record<string, unknown>): void {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(name, detail ? { detail } : undefined);
  }
}

/** End a mark and create a measure */
export function perfMeasure(measureName: string, startMark: string, endMark?: string): number {
  if (typeof performance !== "undefined" && performance.measure) {
    const end = endMark ?? undefined;
    performance.measure(measureName, startMark, end);

    const entries = performance.getEntriesByName(measureName, "measure");
    if (entries.length > 0) {
      return entries[entries.length - 1].duration;
    }
  }
  return 0;
}

/** Get all measures */
export function getPerfMeasures(): PerformanceEntryList {
  if (typeof performance !== "undefined") {
    return performance.getEntriesByType("measure");
  }
  return [];
}

/** Clear all marks and measures */
export function clearPerfMarks(): void {
  if (typeof performance !== "undefined") {
    performance.clearMarks();
    performance.clearMeasures();
  }
}

/** Time a synchronous operation */
export function timeSync<T>(name: string, fn: () => T): T {
  perfMark(`${name}-start`);
  const result = fn();
  perfMark(`${name}-end`);
  perfMeasure(name, `${name}-start`, `${name}-end`);
  clearMarks([`${name}-start`, `${name}-end`]);
  return result;
}

/** Clear specific marks */
function clearMarks(names: string[]): void {
  if (typeof performance !== "undefined" && performance.clearMarks) {
    for (const n of names) {
      performance.clearMarks(n);
    }
  }
}

// --- FPS Counter ---

/** Track frames per second */
export function createFpsCounter(): {
  getStats: () => FpsStats;
  subscribe: (callback: (fps: FpsStats) => void) => () => void;
  destroy: () => void;
} {
  let frameCount = 0;
  let lastTime = performance.now();
  let fpsValues: number[] = [];
  const listeners = new Set<(stats: FpsStats) => void>();
  let rafId: number | null = null;
  let active = true;

  function tick(time: number): void {
    if (!active) return;

    frameCount++;
    const elapsed = time - lastTime;

    // Update every second
    if (elapsed >= 1000) {
      const fps = Math.round((frameCount * 1000) / elapsed);
      fpsValues.push(fps);
      if (fpsValues.length > 60) fpsValues.shift(); // Keep last 60 samples

      const stats: FpsStats = {
        current: fps,
        average: Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length),
        min: Math.min(...fpsValues),
        max: Math.max(...fpsValues),
        frameCount,
        totalDuration: elapsed,
      };

      for (const cb of listeners) cb(stats);

      frameCount = 0;
      lastTime = time;
    }

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);

  return {
    getStats() {
      const elapsed = performance.now() - lastTime;
      const current = frameCount > 0 ? Math.round((frameCount * 1000) / elapsed) : 0;
      return {
        current,
        average: fpsValues.length > 0 ? Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length) : 0,
        min: fpsValues.length > 0 ? Math.min(...fpsValues) : 0,
        max: fpsValues.length > 0 ? Math.max(...fpsValues) : 0,
        frameCount,
        totalDuration: elapsed,
      };
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    destroy() {
      active = false;
      if (rafId) cancelAnimationFrame(rafId);
      listeners.clear();
    },
  };
}

// --- Memory Tracking ---

/** Get memory usage info (Chrome only) */
export function getMemoryUsage(): MemoryInfo | null {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const mem = (performance as any).memory;
    return {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
    };
  }
  return null;
}

/** Format bytes for display */
export function formatMemoryBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Poll memory usage at interval */
export function pollMemory(
  callback: (info: MemoryInfo) => void,
  intervalMs = 5000,
): () => void {
  const timer = setInterval(() => {
    const info = getMemoryUsage();
    if (info) callback(info);
  }, intervalMs);

  return () => clearInterval(timer);
}

// --- Resource Timing ---

/** Get resource timing entries filtered by type */
export function getResourceTimings(options?: {
  initiatorType?: string;
  nameFilter?: RegExp;
}): ResourceTimingEntry[] {
  if (typeof performance !== "undefined" && performance.getEntriesByType) {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    return entries
      .filter((entry) => {
        if (options?.initiatorType && entry.initiatorType !== options.initiatorType) return false;
        if (options?.nameFilter && !options.nameFilter.test(entry.name)) return false;
        return true;
      })
      .map((entry) => ({
        name: entry.name,
        duration: entry.duration,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize,
        decodedBodySize: entry.decodedBodySize,
        startTime: entry.startTime,
        responseStart: entry.responseStart,
        responseEnd: entry.responseEnd,
        initiatorType: entry.initiatorType,
      }));
  }

  return [];
}

/** Get total page load time breakdown */
export function getPageLoadTiming():
  | { dns: number; tcp: ssl: number; ttfb: number; contentDownload: number; domParsing: number; total: number }
  | null {
  if (typeof performance !== "undefined" && performance.timing) {
    const t = performance.timing;
    return {
      dns: t.domainLookupEnd - t.domainLookupStart,
      tcp: t.connectEnd - t.connectStart,
      ssl: t.secureConnectionStart > 0 ? t.connectEnd - t.secureConnectionStart : 0,
      ttfb: t.responseStart - t.requestStart,
      contentDownload: t.responseEnd - t.responseStart,
      domParsing: t.domComplete - t.domInteractive,
      total: t.loadEventEnd - t.navigationStart,
    };
  }
  return null;
}

// --- Performance Observer ---

/** Observe long tasks (performance bottlenecks) */
export function observeLongTasks(
  callback: (entries: PerformanceEntryList) => void,
): () => void {
  if (typeof PerformanceObserver === "undefined") return () => {};

  try {
    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });
    observer.observe({ entryTypes: ["longtask"] });
    return () => observer.disconnect();
  } catch {
    // longtask not supported
    return () => {};
  }
}

/** Observe layout shifts (CLS) */
export function observeLayoutShifts(
  callback: (value: number, entry: PerformanceEntry) => void,
): () => void {
  if (typeof PerformanceObserver === "undefined") return () => {};

  try {
    let clsValue = 0;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          clsValue += layoutShift.value;
          callback(clsValue, entry);
        }
      }
    });
    observer.observe({ entryTypes: ["layout-shift"] });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

// --- Rendering Metrics ---

/** Measure First Contentful Paint */
export function getFCP(): number | null {
  const entries = typeof performance !== "undefined"
    ? performance.getEntriesByName("first-contentful-paint")
    : [];
  return entries.length > 0 ? entries[0].startTime : null;
}

/** Measure Largest Contentful Paint */
export function observeLCP(
  callback: (value: number) => void,
): () => void {
  if (typeof PerformanceObserver === "undefined") return () => {};

  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) callback(last.startTime);
    });
    observer.observe({ entryTypes: ["largest-contentful-paint"] });
    return () => observer.disconnect();
  } catch {
    return () => {};
  }
}

/** Get all Core Web Vitals */
export function getCoreWebVitals(): Promise<{
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number;
}> {
  return new Promise((resolve) => {
    const fcp = getFCP();

    let lcp: number | null = null;
    let fid: number | null = null;
    let cls = 0;

    const lcpCleanup = observeLCP((v) => { lcp = v; });

    // FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0];
        if (entry) fid = entry.processingStart - entry.startTime;
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
    } catch { /* FID not supported */ }

    // CLS
    const clsCleanup = observeLayoutShift((v) => { cls = v; });

    // Wait a bit for metrics to populate
    setTimeout(() => {
      lcpCleanup();
      clsCleanup();
      resolve({ fcp, lcp, fid, cls });
    }, 3000);
  });
}

// --- Utility ---

/** Report a custom metric to performance timeline */
export function reportCustomMetric(name: string, value: number, tags?: Record<string, string>): void {
  if (typeof performance !== "undefined" && performance.measure) {
    // Use User Timing to store the metric
    const markName = `metric-${name}-${Date.now()}`;
    performance.mark(markName, { detail: { value, tags } });
    performance.measure(name, markName);
    performance.clearMarks(markName);
  }
}
