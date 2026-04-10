/**
 * Performance Utilities: PerformanceObserver wrapper, timing measurement,
 * resource analysis, navigation metrics, FPS counter, memory monitoring,
 * long task detection, Web Vitals collection, custom metric tracking,
 * performance scoring, and reporting.
 */

// --- Types ---

export interface TimingResult {
  name: string;
  duration: number;       // ms
  startTime: number;
  endTime: number;
  entries?: PerformanceEntry[];
}

export interface MemoryUsage {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface FPSStats {
  current: number;
  average: number;
  min: number;
  max: number;
  drops: number;       // Frames below 20fps
  samples: number;
}

export interface WebVitals {
  // Core Web Vitals
  LCP?: number;          // Largest Contentful Paint (ms)
  FID?: number;          // First Input Delay (ms)
  CLS?: number;          // Cumulative Layout Shift (score)
  INP?: number;          // Interaction to Next Paint (ms)
  TTFB?: number;         // Time to First Byte (ms)
  TBT?: number;          // Total Blocking Time (ms)

  // Derived
  score: number;         // Overall 0-100 score
}

export interface NavigationTiming {
  connectStart: number;
  connectEnd: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domContentLoaded: number;
  loadComplete: number;
  domInteractive: number;

  // Computed
  dnsLookup: number;
  tcpConnect: number;
  tlsNegotiation: number;
  ttfb: number;         // Time to First Byte
  tbt: number;          // Total Blocking Time
  downloadTime: number;
}

// --- Performance Observer Wrapper ---

/**
 * Observe performance entries with filtering, batching, and auto-cleanup.
 */
export class PerfObserver {
  private observer: PerformanceObserver | null = null;
  private entries: PerformanceEntry[] = [];
  private handlers = new Map<string, Set<(entry: PerformanceEntry) => void>>();
  private maxEntries: number;

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
  }

  /** Start observing an entry type */
  observe(entryTypes: string | string[], callback?: (entry: PerformanceEntry) => void): () => void {
    if (!this.observer) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.entries.push(entry);
          if (this.entries.length > this.maxEntries) this.entries.shift();

          const typeHandlers = this.handlers.get(entry.entryType);
          if (typeHandlers) for (const h of typeHandlers) try { h(entry); } catch {}
        }
      });
    }

    const types = Array.isArray(entryTypes) ? entryTypes : [entryTypes];
    for (const type of types) this.observer!.observe({ type, buffered: true });

    if (callback) return this.on(type, callback);
    return () => this.disconnect();
  }

  /** Register a handler for a specific entry type */
  on(entryType: string, handler: (entry: PerformanceEntry) => void): () => void {
    if (!this.handlers.has(entryType)) this.handlers.set(entryType, new Set());
    this.handlers.get(entryType)!.add(handler);
    return () => { this.handlers.get(entryType)?.delete(handler); };
  }

  /** Get all collected entries, optionally filtered */
  getEntries(filter?: (e: PerformanceEntry) => boolean): PerformanceEntry[] {
    if (filter) return this.entries.filter(filter);
    return [...this.entries];
  }

  /** Clear collected entries */
  clear(): void { this.entries = []; }

  /** Disconnect the observer */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }
}

// --- Timing Measurement ---

/** Measure execution time of a synchronous function */
export function measureSync<T>(name: string, fn: () => T): TimingResult & { result: T } {
  const start = performance.now();
  const result = fn();
  const end = performance.now();
  return { name, duration: end - start, startTime: start, endTime: end, result };
}

/** Measure execution time of an async function */
export async function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<TimingResult & { result: T }> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return { name, duration: end - start, startTime: start, endTime: end, result };
}

/** Create a named performance mark */
export function perfMark(name: string): void {
  performance.mark(`${name}-start`);
}

/** End a performance mark and measure it */
export function perfMeasure(name: string): number {
  performance.mark(`${name}-end`);
  try {
    performance.measure(name, `${name}-start`, `${name}-end`);
    const entries = performance.getEntriesByName(name);
    const duration = entries[0]?.duration ?? 0;
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
    return duration;
  } catch { return 0; }
}

/** Measure between two marks (existing or created on-the-fly) */
export function measureBetween(startMark: string, endMark: string): number {
  try {
    performance.measure("temp", startMark, endMark);
    const duration = performance.getEntriesByName("temp")[0]?.duration ?? 0;
    performance.clearMeasures("temp");
    return duration;
  } catch { return 0; }
}

// --- FPS Counter ---

/**
 * Track frames per second using requestAnimationFrame.
 */
export class FPSCounter {
  private frames: number[] = [];
  private rafId: number | null = null;
  private running = false;
  private lastTime = 0;

  get stats(): FPSStats {
    if (this.frames.length === 0) return { current: 0, average: 0, min: 0, max: 0, drops: 0, samples: 0 };

    const fpsValues = this.frames.map((f) => f * 1000);
    const sum = fpsValues.reduce((a, b) => a + b, 0);
    const avg = sum / fpsValues.length;

    return {
      current: fpsValues[fpsValues.length - 1] ?? 0,
      average: Math.round(avg),
      min: Math.min(...fpsValues),
      max: Math.max(...fpsValues),
      drops: fpsValues.filter((f) => f < 20).length,
      samples: fpsValues.length,
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): FPSStats {
    this.running = false;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    return this.stats();
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.frames.push(1 / (delta / 1000));

    // Keep only last 5 seconds worth of data
    while (this.frames.length > 300) this.frames.shift();

    this.rafId = requestAnimationFrame(this.loop);
  };
}

// -- Memory Monitoring --

/** Get current memory usage (if supported) */
export function getMemoryUsage(): MemoryUsage | null {
  if (typeof performance === "undefined" || !performance.memory) return null;
  return {
    usedJSHeapSize: performance.memory.usedJSHeapSize,
    totalJSHeapSize: performance.memory.totalJSHeapSize,
    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
  };
}

/** Get memory usage as percentage of limit */
export function getMemoryPercent(): number {
  const mem = getMemoryUsage();
  if (!mem) return 0;
  return (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
}

/** Monitor memory with periodic sampling */
export class MemoryMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private samples: Array<{ timestamp: number; usage: MemoryUsage }> = [];
  private listeners = new Set<(usage: MemoryUsage) => void>();
  private maxSamples: number;

  constructor(sampleIntervalMs = 5000, maxSamples = 60) {
    this.maxSamples = maxSamples;
  }

  start(): void {
    this.sample();
    this.intervalId = setInterval(() => this.sample(), sampleIntervalMs);
  }

  stop(): void {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  getSamples(): Array<{ timestamp: number; usage: MemoryUsage }> { return [...this.samples]; }

  getTrend(): "increasing" | "stable" | "decreasing" {
    if (this.samples.length < 3) return "stable";
    const recent = this.samples.slice(-10);
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    const avgFirst = firstHalf.reduce((s, e) => s + e.usage.usedJSHeapSize, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, e) => s + e.usage.usedJSHeapSize, 0) / secondHalf.length;
    if (avgSecond > avgFirst * 1.1) return "increasing";
    if (avgSecond < avgFirst * 0.9) return "decreasing";
    return "stable";
  }

  onChange(listener: (usage: MemoryUsage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private sample(): void {
    const usage = getMemoryUsage();
    if (!usage) return;
    this.samples.push({ timestamp: Date.now(), usage });
    if (this.samples.length > this.maxSamples) this.samples.shift();
    for (const l of this.listeners) try { l(usage); } catch {}
  }
}

// --- Long Task Detection ---

/**
 * Detect long tasks that block the main thread using requestIdleCallback.
 */
export class LongTaskDetector {
  private thresholdMs: number;
  private handlers = new Set<(duration: number) => void>();
  private running = false;

  constructor(thresholdMs = 50) {
    this.thresholdMs = thresholdMs;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.scheduleCheck();
  }

  stop(): void { this.running = false; }

  onLongTask(handler: (duration: number) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private scheduleCheck(): void {
    if (!this.running) return;
    const start = performance.now();
    requestIdleCallback(() => {
      const duration = performance.now() - start;
      if (duration >= this.thresholdMs) {
        for (const h of this.handlers) try { h(duration); } catch {}
      }
      this.scheduleCheck();
    });
  }
}

// --- Navigation Timing ---

/** Get navigation timing metrics */
export function getNavigationTiming(): NavigationTiming | null {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return null;

  return {
    connectStart: nav.connectStart,
    connectEnd: nav.connectEnd,
    requestStart: nav.requestStart,
    responseStart: nav.responseStart,
    responseEnd: nav.responseEnd,
    domContentLoaded: nav.domContentLoadedEventEnd,
    loadComplete: nav.loadEventEnd,
    domInteractive: nav.interactive,

    dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
    tcpConnect: nav.connectEnd - nav.connectStart,
    tlsNegotiation: nav.secureConnectionStart ? nav.connectEnd - nav.secureConnectionStart : 0,
    ttfb: nav.responseStart - nav.requestStart,
    ttb: calculateTBT(nav),
    downloadTime: nav.responseEnd - nav.responseStart,
  };
}

/** Calculate Total Blocking Time from navigation timing */
function calculateTBT(nav: PerformanceNavigationTiming): number {
  let tbt = 0;
  const longTasks = performance.getEntriesByType("longtask") as PerformanceLongTaskTiming[];
  for (const task of longTasks) {
    if (task.startTime < nav.loadEventEnd) tbt += task.duration;
  }
  return Math.round(tbt);
}

// --- Web Vitals Collection ---

/** Collect Core Web Vitals */
export async function collectWebVitals(): Promise<WebVitals> {
  const vitals: WebVitals = { score: 0 };

  // LCP
  vitals.LCP = await collectLCP();

  // FID/INP
  vitals.INP = await collectINP();

  // CLS
  vitals.CLS = await collectCLS();

  // TTFB
  const nav = getNavigationTiming();
  vitals.TTFB = nav?.ttfb ?? 0;

  // TBT
  vitals.TBT = nav?.tbt ?? 0;

  // Calculate overall score
  vitals.score = calculateVitalsScore(vitals);

  return vitals;
}

async function collectLCP(): Promise<number> {
  return new Promise((resolve) => {
    try {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) resolve(entries[entries.length - 1]!.startTime);
      });
      po.observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => resolve(0), 5000); // Timeout fallback
    } catch { resolve(0); }
  });
}

async function collectINP(): Promise<number> {
  return new Promise((resolve) => {
    try {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntriesByType("event");
        let worstINP = 0;
        for (const entry of entries) {
          if ((entry as any).duration && (entry as any).processingStart) {
            const inp = (entry as any).duration - (entry as any).processingStart;
            if (inp > worstINP) worstINP = inp;
          }
        }
        if (worstINP > 0) resolve(Math.round(worstINP));
      });
      po.observe({ type: "first-input", type: "event", buffered: true, durationThreshold: 16 });
      setTimeout(() => resolve(0), 8000);
    } catch { resolve(0); }
  });
}

async function collectCLS(): Promise<number> {
  return new Promise((resolve) => {
    try {
      let clsValue = 0;
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          clsValue += (entry as any).value ?? 0;
        }
      });
      po.observe({ type: "layout-shift", buffered: true });
      setTimeout(() => resolve(Math.round(clsValue * 1000) / 1000), 5000);
    } catch { resolve(0); }
  });
}

/** Calculate overall Web Vitals score (0-100) */
function calculateVitalsScore(v: WebVitals): number {
  let score = 100;
  if (v.LCP && v.LCP > 2500) score -= 25;
  else if (v.LCP && v.LCP > 4000) score -= 40;
  if (v.INP && v.INP > 200) score -= 20;
  else if (v.INP && v.INP > 500) score -= 35;
  if (v.CLS && v.CLS > 0.1) score -= 15;
  else if (v.CLS && v.CLS > 0.25) score -= 25;
  if (v.TTFB && v.TTFB > 3000) score -= 15;
  if (v.TBT && v.TBT > 200) score -= 15;
  return Math.max(0, score);
}

// --- Resource Timing Analysis ---

/** Analyze loaded resources */
export function getResourceTiming(): Array<{
  name: string;
  type: string;
  duration: number;
  size: number;
  transferSize: number;
}> {
  const resources = performance.getEntriesByType("resource");
  return resources.map((r) => ({
    name: r.name,
    type: r.initiatorType,
    duration: r.duration,
    size: r.transferSize ?? 0,
    transferSize: r.decodedBodySize ?? 0,
  }));
}

/** Find slowest resources */
export function findSlowResources(limit = 5): typeof getResourceTiming extends () => infer R ? R : never {
  return getResourceTiming()
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);
}

// --- Custom Metrics ---

/** Track a custom metric */
export class CustomMetric {
  private values: number[] = [];
  private name: string;
  private maxSamples: number;

  constructor(name: string, maxSamples = 50) {
    this.name = name;
    this.maxSamples = maxSamples;
  }

  record(value: number): void {
    this.values.push(value);
    if (this.values.length > this.maxSamples) this.values.shift();
  }

  get average(): number {
    if (this.values.length === 0) return 0;
    return this.values.reduce((a, b) => a + b, 0) / this.values.length;
  }

  get min(): number { return this.values.length > 0 ? Math.min(...this.values) : 0; }
  get max(): number { return this.values.length > 0 ? Math.max(...this.values) : 0; }
  get p95(): number {
    if (this.values.length === 0) return 0;
    const sorted = [...this.values].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[Math.min(idx, sorted.length - 1)]!;
  }
  get count(): number { return this.values.length; }
  reset(): void { this.values = []; }
}
