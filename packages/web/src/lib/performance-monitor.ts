/**
 * @module performance-monitor
 * @description
 * A comprehensive real-time performance monitoring and metrics collection library.
 *
 * Collects Web Vitals (LCP, INP, CLS, TTFB, FCP), custom metrics, resource timing,
 * navigation timing, memory usage, long tasks, FPS, performance scores, budgets,
 * alerts, trend tracking, and A/B test impact measurement.
 *
 * Uses browser Performance APIs throughout. No framework dependencies.
 */

// ---------------------------------------------------------------------------
// 1. Type Definitions & Interfaces
// ---------------------------------------------------------------------------

/** Core Web Vital metric names */
export type WebVitalName = 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP';

/** Supported custom metric types */
export type CustomMetricType = 'timing' | 'counter' | 'gauge' | 'histogram';

/** Trend direction for historical analysis */
export type TrendDirection = 'improving' | 'degrading' | 'stable';

/** Severity level for alerts */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/** Resource entry categories used in waterfall / slow-resource detection */
export type ResourceCategory = 'image' | 'script' | 'font' | 'stylesheet' | 'xhr' | 'fetch' | 'other';

/** Callback signatures */
export type MetricCallback<T = unknown> = (metric: T) => void;
export type AlertCallback = (alert: PerformanceAlert) => void;

/** A single Web Vital measurement */
export interface WebVitalMetric {
  /** Metric name */
  name: WebVitalName;
  /** Numeric value (ms for timings, unitless score for CLS) */
  value: number;
  /** DOM High Res timestamp of when the metric was recorded */
  timestamp: number;
  /** Navigation timestamp relative to navigation start */
  startTime: number;
  /** Rating assigned by the library ('good' | 'needs-improvement' | 'poor') */
  rating: 'good' | 'needs-improvement' | 'poor';
  /** Navigation unique ID this metric belongs to */
  navigationId: string;
  /** Additional attribution data when available */
  attribution?: Record<string, unknown>;
}

/** A user-defined custom metric entry */
export interface CustomMetricEntry {
  /** Unique identifier */
  id: string;
  /** Human-readable label */
  name: string;
  /** Type of metric */
  type: CustomMetricType;
  /** Current numeric value */
  value: number;
  /** Unit suffix (e.g. 'ms', 'bytes', '') */
  unit: string;
  /** When the metric was last updated */
  timestamp: number;
  /** For histogram types – bucket boundaries and counts */
  buckets?: { min: number; max: number; count: number }[];
  /** Arbitrary tags for filtering / grouping */
  tags?: Record<string, string>;
}

/** Parsed resource timing entry with derived fields */
export interface ResourceTimingEntry {
  /** Original initiator type from the Performance API */
  initiatorType: string;
  /** Normalised category */
  category: ResourceCategory;
  /** Full resource URL (truncated for privacy) */
  name: string;
  /** Duration in ms */
  duration: number;
  /** Transfer size in bytes (0 if cross-origin without Timing-Allow-Origin) */
  transferSize: number;
  /** Decoded body size in bytes */
  decodedBodySize: number;
  /** Response start relative to fetch start (rough TTFB for resource) */
  responseStart: number;
  /** Whether the resource is considered "slow" per current thresholds */
  isSlow: boolean;
}

/** Full Navigation Timing API breakdown */
export interface NavigationTimingData {
  /** DNS lookup time (ms) */
  dnsLookup: number;
  /** TCP connection time including TLS (ms) */
  tcpConnection: number;
  /** Time to First Byte (ms) */
  ttfb: number;
  /** Response download time (ms) */
  responseDownload: number;
  /** DOM processing time (ms) – parsing + interactive */
  domProcessing: number;
  /** DOM Complete to Load Event (ms) */
  loadEvent: number;
  /** Total page load time (ms) */
  totalLoadTime: number;
  /** Raw PerformanceNavigationTiming reference (snapshot) */
  raw?: PerformanceNavigationTiming;
}

/** Memory snapshot (only available in Chrome/Chromium) */
export interface MemorySnapshot {
  /** Current JS heap size in bytes */
  usedJSHeapSize: number;
  /** Total heap allocated by the browser */
  totalJSHeapSize: number;
  /** Heap size limit before GC pressure */
  jsHeapSizeLimit: number;
  /** Snapshot timestamp */
  timestamp: number;
}

/** Long task entry detected via PerformanceObserver */
export interface LongTaskEntry {
  /** Task duration in ms */
  duration: number;
  /** Start time (DOMHighResTimeStamp) */
  startTime: number;
  /** Attributable container names (if available) */
  attribution: string[];
  /** Timestamp of detection */
  detectedAt: number;
}

/** FPS measurement sample */
export interface FPSFrameSample {
  /** Frames rendered in this sampling window */
  frames: number;
  /** Duration of the sampling window in ms */
  duration: number;
  /** Calculated FPS */
  fps: number;
  /** Timestamp of the sample */
  timestamp: number;
  /** Whether jank was detected (FPS dropped below threshold) */
  jank: boolean;
}

/** Overall performance score breakdown */
export interface PerformanceScore {
  /** Composite score 0-100 */
  score: number;
  /** Individual vital scores */
  vitals: Partial<Record<WebVitalName, { value: number; rating: string; weight: number; contribution: number }>>;
  /** Weighted contributions that sum to the final score */
  details: string;
  /** Timestamp of calculation */
  calculatedAt: number;
}

/** A single budget rule definition */
export interface BudgetRule {
  /** Metric name this budget applies to */
  metricName: string;
  /** Maximum allowed value (e.g. 2500 for LCP in ms) */
  maxValue: number;
  /** Whether the budget has been exceeded at least once */
  exceeded: boolean;
  /** Number of times the budget was exceeded during the session */
  exceedCount: number;
  /** Worst observed value */
  worstValue: number;
}

/** Alert emitted when a threshold is crossed */
export interface PerformanceAlert {
  /** Unique alert ID */
  id: string;
  /** Severity level */
  severity: AlertSeverity;
  /** Metric that triggered the alert */
  metricName: string;
  /** Current value that triggered the alert */
  value: number;
  /** Threshold that was crossed */
  threshold: number;
  /** Human-readable message */
  message: string;
  /** When the alert fired */
  timestamp: number;
  /** Optional context */
  context?: Record<string, unknown>;
}

/** Historical data point for trend tracking */
export interface HistoricalDataPoint {
  /** Metric identifier */
  metricId: string;
  /** Value at this point */
  value: number;
  /** ISO timestamp */
  timestamp: string;
  /** Session or page-load identifier */
  sessionId: string;
}

/** Trend analysis result */
export interface TrendAnalysis {
  metricId: string;
  direction: TrendDirection;
  /** Average change per period (positive = degrading for latency metrics) */
  averageChange: number;
  /** Percentage change from baseline */
  percentChange: number;
  /** Number of data points analysed */
  sampleSize: number;
  /** Human-readable summary */
  summary: string;
}

/** A/B test variant comparison result */
export interface ABTestComparison {
  testName: string;
  variantA: string;
  variantB: string;
  metrics: {
    metricName: string;
    valueA: number;
    valueB: number;
    percentDiff: number;
    winner: 'A' | 'B' | 'tie';
  }[];
  overallWinner: 'A' | 'B' | 'tie' | 'inconclusive';
  confidence: number; // 0-1
  generatedAt: string;
}

/** Configuration options for the PerformanceMonitor */
export interface PerformanceMonitorConfig {
  /** Base URL for reporting endpoints (default: none) */
  reportEndpoint?: string;
  /** How often to report aggregated metrics in ms (default: 30000) */
  reportIntervalMs?: number;
  /** Maximum number of historical data points to retain per metric (default: 100) */
  maxHistoryPoints?: number;
  /** FPS sampling window in ms (default: 1000) */
  fpsSampleWindowMs?: number;
  /** FPS threshold below which jank is flagged (default: 30) */
  fpsJankThreshold?: number;
  /** Slow resource threshold in ms (default: 1000) */
  slowResourceThresholdMs?: number;
  /** Memory leak detection – number of consecutive growth samples to flag (default: 5) */
  memoryLeakConsecutiveGrowth?: number;
  /** Memory leak – MB growth threshold between samples (default: 10) */
  memoryLeakGrowthThresholdMB?: number;
  /** Whether to automatically collect Web Vitals on construction (default: true) */
  autoCollectWebVitals?: boolean;
  /** Whether to start FPS monitoring on construction (default: false) */
  autoStartFPS?: boolean;
  /** Whether to start memory monitoring on construction (default: false) */
  autoStartMemory?: boolean;
  /** Whether to observe long tasks on construction (default: true) */
  autoObserveLongTasks?: boolean;
  /** Custom weights for performance score calculation */
  scoreWeights?: Partial<Record<WebVitalName, number>>;
  /** Default budget rules */
  budgets?: BudgetRuleInput[];
  /** Alert callback – called whenever an alert fires */
  onAlert?: AlertCallback;
  /** Debug logging toggle (default: false) */
  debug?: boolean;
}

/** Input shape for defining a budget rule (simpler than the stored BudgetRule) */
export interface BudgetRuleInput {
  metricName: string;
  maxValue: number;
}

// ---------------------------------------------------------------------------
// 2. Constants & Defaults
// ---------------------------------------------------------------------------

/** Default thresholds for Web Vitals ratings (from Google CrUX / web-vitals lib) */
const WEB_VITAL_THRESHOLDS: Record<WebVitalName, { good: number; poor: number }> = {
  LCP:  { good: 2500,  poor: 4000 },
  INP:  { good: 200,   poor: 500 },
  CLS:  { good: 0.1,   poor: 0.25 },
  TTFB: { good: 800,   poor: 1800 },
  FCP:  { good: 1800,  poor: 3000 },
};

/** Default weights for composite performance scoring */
const DEFAULT_SCORE_WEIGHTS: Record<WebVitalName, number> = {
  LCP:  0.30,
  INP:  0.25,
  CLS:  0.20,
  TTFB: 0.15,
  FCP:  0.10,
};

/** Default budget rules aligned with Core Web Vitals "good" thresholds */
const DEFAULT_BUDGETS: BudgetRuleInput[] = [
  { metricName: 'LCP',  maxValue: 2500 },
  { metricName: 'INP',  maxValue: 200 },
  { metricName: 'CLS',  maxValue: 0.1 },
  { metricName: 'TTFB', maxValue: 800 },
  { metricName: 'FCP',  maxValue: 1800 },
];

/** Generate a short unique ID */
function uid(prefix = 'pm'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// 3. Main Class
// ---------------------------------------------------------------------------

/**
 * PerformanceMonitor – singleton-style class that collects, analyses, and reports
 * real-time browser performance data.
 *
 * @example
 * ```ts
 * const monitor = new PerformanceMonitor({
 *   reportEndpoint: '/api/performance',
 *   autoCollectWebVitals: true,
 *   autoStartFPS: true,
 * });
 *
 * monitor.onWebVital((v) => console.log(v.name, v.value));
 * monitor.start();
 * ```
 */
export class PerformanceMonitor {
  // -- Config ---------------------------------------------------------------
  private config: Required<PerformanceMonitorConfig>;

  // -- Collected Data -------------------------------------------------------
  private webVitals: Map<WebVitalName, WebVitalMetric> = new Map();
  private customMetrics: Map<string, CustomMetricEntry> = new Map();
  private longTasks: LongTaskEntry[] = [];
  private fpsHistory: FPSFrameSample[] = [];
  private memoryHistory: MemorySnapshot[] = [];
  private history: Map<string, HistoricalDataPoint[]> = new Map();
  private alerts: PerformanceAlert[] = [];

  // -- Budgets & Rules ------------------------------------------------------
  private budgetRules: Map<string, BudgetRule> = new Map();

  // -- Observers & Handles --------------------------------------------------
  private observers: PerformanceObserver[] = [];
  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsWindowStart: number = 0;
  private reportTimerId: ReturnType<typeof setInterval> | null = null;
  private memoryTimerId: ReturnType<typeof setInterval> | null = null;

  // -- Subscriptions --------------------------------------------------------
  private vitalCallbacks: Set<MetricCallback<WebVitalMetric>> = new Set();
  private alertCallbacks: Set<AlertCallback> = new Set();
  private longTaskCallbacks: Set<MetricCallback<LongTaskEntry>> = new Set();
  private fpsCallbacks: Set<MetricCallback<FPSFrameSample>> = new Set();

  // -- State ----------------------------------------------------------------
  private started = false;
  private sessionId: string;
  private consecutiveMemoryGrowth = 0;
  private prevMemoryUsed = 0;

  constructor(config: PerformanceMonitorConfig = {}) {
    this.sessionId = uid('sess');
    this.config = {
      reportEndpoint:          config.reportEndpoint ?? '',
      reportIntervalMs:        config.reportIntervalMs ?? 30_000,
      maxHistoryPoints:        config.maxHistoryPoints ?? 100,
      fpsSampleWindowMs:       config.fpsSampleWindowMs ?? 1000,
      fpsJankThreshold:        config.fpsJankThreshold ?? 30,
      slowResourceThresholdMs: config.slowResourceThresholdMs ?? 1000,
      memoryLeakConsecutiveGrowth: config.memoryLeakConsecutiveGrowth ?? 5,
      memoryLeakGrowthThresholdMB:  config.memoryLeakGrowthThresholdMB ?? 10,
      autoCollectWebVitals:    config.autoCollectWebVitals ?? true,
      autoStartFPS:            config.autoStartFPS ?? false,
      autoStartMemory:         config.autoStartMemory ?? false,
      autoObserveLongTasks:    config.autoObserveLongTasks ?? true,
      scoreWeights:            { ...DEFAULT_SCORE_WEIGHTS, ...config.scoreWeights },
      budgets:                 config.budgets ?? [...DEFAULT_BUDGETS],
      onAlert:                 config.onAlert ?? (() => {}),
      debug:                   config.debug ?? false,
    };

    // Initialise default budgets
    for (const b of this.config.budgets) {
      this.budgetRules.set(b.metricName, {
        metricName: b.metricName,
        maxValue: b.maxValue,
        exceeded: false,
        exceedCount: 0,
        worstValue: 0,
      });
    }

    if (this.config.debug) {
      console.log('[PerformanceMonitor] initialised', this.sessionId);
    }
  }

  // =======================================================================
  // 4. Lifecycle
  // =======================================================================

  /**
   * Start all enabled collectors.
   * Call after instantiation (or rely on auto-start flags).
   */
  start(): void {
    if (this.started) return;
    this.started = true;

    if (this.config.autoCollectWebVitals) {
      this.collectWebVitals();
    }
    if (this.config.autoObserveLongTasks) {
      this.observeLongTasks();
    }
    if (this.config.autoStartFPS) {
      this.startFPSMonitoring();
    }
    if (this.config.autoStartMemory) {
      this.startMemoryMonitoring();
    }
    if (this.config.reportEndpoint) {
      this.startReporting();
    }

    if (this.config.debug) {
      console.log('[PerformanceMonitor] started');
    }
  }

  /**
   * Stop all collectors, disconnect observers, clear timers.
   */
  stop(): void {
    this.started = false;

    for (const obs of this.observers) {
      obs.disconnect();
    }
    this.observers = [];

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.reportTimerId !== null) {
      clearInterval(this.reportTimerId);
      this.reportTimerId = null;
    }
    if (this.memoryTimerId !== null) {
      clearInterval(this.memoryTimerId);
      this.memoryTimerId = null;
    }

    if (this.config.debug) {
      console.log('[PerformanceMonitor] stopped');
    }
  }

  /** Destroy the instance and release all references. */
  destroy(): void {
    this.stop();
    this.webVitals.clear();
    this.customMetrics.clear();
    this.longTasks = [];
    this.fpsHistory = [];
    this.memoryHistory = [];
    this.history.clear();
    this.alerts = [];
    this.vitalCallbacks.clear();
    this.alertCallbacks.clear();
    this.longTaskCallbacks.clear();
    this.fpsCallbacks.clear();
  }

  // =======================================================================
  // 5. Web Vitals Collection
  // =======================================================================

  /**
   * Register a callback invoked every time a Web Vital is measured.
   */
  onWebVital(callback: MetricCallback<WebVitalMetric>): () => void {
    this.vitalCallbacks.add(callback);
    return () => { this.vitalCallbacks.delete(callback); };
  }

  /**
   * Collect Core Web Vitals using the Performance Observer API.
   * Supports: LCP, INP (fallback FID), CLS, TTFB, FCP.
   */
  collectWebVitals(): void {
    this.observeVital('largest-contentful-paint', (entries) => {
      const last = entries[entries.length - 1] as PerformanceEntry & { element?: Element; url?: string; loadTime?: number };
      if (!last) return;
      const metric = this.buildVital('LCP', last.startTime, last.startTime);
      metric.attribution = {
        element: last.element?.tagName ?? '',
        url: last.url ?? '',
        loadTime: last.loadTime ?? 0,
      };
      this.emitVital(metric);
    }, /* buffered */ true);

    // INP – Interaction to Next Paint (falls back to FID-like behaviour)
    this.observeVital('event', (entries) => {
      for (const entry of entries) {
        const perfEntry = entry as PerformanceEventTiming;
        // Only consider interactions (pointer/keyboard events)
        if (perfEntry.processingStart === undefined || perfEntry.duration === undefined) continue;
        // INP uses the longest interaction duration
        const existing = this.webVitals.get('INP');
        if (!existing || perfEntry.duration > existing.value) {
          const metric = this.buildVital('INP', perfEntry.duration, perfEntry.startTime);
          metric.attribution = {
            eventType: perfEntry.name,
            target: (perfEntry.target as Element)?.tagName ?? '',
          };
          this.emitVital(metric);
        }
      }
    }, true);

    this.observeVital('layout-shift', (entries) => {
      let clsValue = 0;
      for (const entry of entries) {
        const ls = entry as LayoutShift;
        if (!ls.hadRecentInput) {
          clsValue += ls.value;
        }
      }
      if (clsValue > 0) {
        // CLS accumulates – add to any existing value
        const existing = this.webVitals.get('CLS');
        const total = clsValue + (existing?.value ?? 0);
        const metric = this.buildVital('CLS', total, entries[0].startTime);
        this.emitVital(metric);
      }
    }, true);

    // TTFB – collected from navigation entry
    try {
      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        const ttfb = nav.responseStart - nav.requestStart;
        if (ttfb >= 0) {
          const metric = this.buildVital('TTFB', ttfb, nav.responseStart);
          this.emitVital(metric);
        }
      }
    } catch {
      // Navigation timing not available
    }

    // FCP
    this.observeVital('paint', (entries) => {
      for (const entry of entries) {
        if (entry.name === 'first-contentful-paint') {
          const metric = this.buildVital('FCP', entry.startTime, entry.startTime);
          this.emitVital(metric);
          break;
        }
      }
    }, true);
  }

  /** Get the latest value for a specific Web Vital, or undefined. */
  getWebVital(name: WebVitalName): WebVitalMetric | undefined {
    return this.webVitals.get(name);
  }

  /** Get all collected Web Vitals. */
  getAllWebVitals(): WebVitalMetric[] {
    return Array.from(this.webVitals.values());
  }

  // =======================================================================
  // 6. Custom Metrics
  // =======================================================================

  /**
   * Register a new custom metric. If one with the same ID exists it is overwritten.
   *
   * @param id       Unique identifier
   * @param name     Human-readable label
   * @param type     Metric type
   * @param initialValue Starting value (default 0)
   * @param unit     Unit suffix (default '')
   * @param tags     Optional key-value tags
   */
  registerCustomMetric(
    id: string,
    name: string,
    type: CustomMetricType,
    initialValue = 0,
    unit = '',
    tags?: Record<string, string>,
  ): CustomMetricEntry {
    const entry: CustomMetricEntry = {
      id,
      name,
      type,
      value: initialValue,
      unit,
      timestamp: performance.now(),
      tags,
      ...(type === 'histogram' ? { buckets: [] } : {}),
    };
    this.customMetrics.set(id, entry);
    return entry;
  }

  /**
   * Update a custom metric's value.
   * For counters the value is incremented; for gauges it is set directly;
   * for timing the value is treated as a new observation (min is kept).
   */
  updateCustomMetric(id: string, value: number): void {
    const metric = this.customMetrics.get(id);
    if (!metric) {
      if (this.config.debug) {
        console.warn(`[PerformanceMonitor] unknown custom metric: ${id}`);
      }
      return;
    }

    switch (metric.type) {
      case 'counter':
        metric.value += value;
        break;
      case 'gauge':
        metric.value = value;
        break;
      case 'timing':
        // Keep the minimum (best) timing observed
        if (metric.value === 0 || value < metric.value) {
          metric.value = value;
        }
        break;
      case 'histogram':
        this.recordHistogramBucket(metric, value);
        break;
    }

    metric.timestamp = performance.now();
    this.checkBudgets(id, metric.value);
    this.recordHistory(id, metric.value);
  }

  /** Get a custom metric by ID. */
  getCustomMetric(id: string): CustomMetricEntry | undefined {
    return this.customMetrics.get(id);
  }

  /** List all registered custom metrics. */
  getAllCustomMetrics(): CustomMetricEntry[] {
    return Array.from(this.customMetrics.values());
  }

  /** Increment a counter metric by 1 (convenience wrapper). */
  incrementCounter(id: string): void {
    this.updateCustomMetric(id, 1);
  }

  /**
   * Time an arbitrary operation and record it as a custom timing metric.
   *
   * @example
   * ```ts
   * const result = await monitor.timeOperation('db-query', async () => {
   *   return fetchData();
   * });
   * ```
   */
  async timeOperation<T>(metricId: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.updateCustomMetric(metricId, duration);
      return result;
    } catch (err) {
      const duration = performance.now() - start;
      this.updateCustomMetric(`${metricId}-error`, duration);
      throw err;
    }
  }

  // =======================================================================
  // 7. Resource Timing Analysis
  // =======================================================================

  /**
   * Analyse all loaded resources from the Performance Resource Timing buffer.
   * Returns categorised entries sorted by duration descending.
   */
  analyseResources(options?: { filterByType?: ResourceCategory; limit?: number }): ResourceTimingEntry[] {
    const threshold = this.config.slowResourceThresholdMs;
    let entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    if (options?.filterByType) {
      entries = entries.filter((e) => this.categoriseResource(e.initiatorType) === options.filterByType);
    }

    const parsed: ResourceTimingEntry[] = entries.map((e) => ({
      initiatorType: e.initiatorType,
      category: this.categoriseResource(e.initiatorType),
      name: this.truncateUrl(e.name, 120),
      duration: e.duration,
      transferSize: e.transferSize,
      decodedBodySize: e.decodedBodySize,
      responseStart: e.responseStart - e.requestStart,
      isSlow: e.duration >= threshold,
    }));

    // Sort by duration descending
    parsed.sort((a, b) => b.duration - a.duration);

    const limit = options?.limit ?? parsed.length;
    return parsed.slice(0, limit);
  }

  /**
   * Return only resources that exceed the slow-resource threshold.
   */
  getSlowResources(): ResourceTimingEntry[] {
    return this.analyseResources().filter((r) => r.isSlow);
  }

  /**
   * Build a simplified waterfall dataset suitable for visualisation.
   * Each row contains: name, start offset, duration, category.
   */
  getWaterfallData(): { name: string; start: number; duration: number; category: ResourceCategory }[] {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const navStart =
      (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.startTime ?? 0;

    return resources.slice(0, 80).map((r) => ({
      name: this.truncateUrl(r.name, 80),
      start: r.startTime - navStart,
      duration: r.duration,
      category: this.categoriseResource(r.initiatorType),
    }));
  }

  /** Get aggregate statistics about loaded resources. */
  getResourceSummary(): {
    totalCount: number;
    totalTransferBytes: number;
    totalDecodedBytes: number;
    avgDuration: number;
    maxDuration: number;
    slowCount: number;
    byCategory: Partial<Record<ResourceCategory, number>>;
  } {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const byCategory: Partial<Record<ResourceCategory, number>> = {};
    let totalTransfer = 0;
    let totalDecoded = 0;
    let totalDuration = 0;
    let maxDur = 0;
    let slowCount = 0;

    for (const e of entries) {
      const cat = this.categoriseResource(e.initiatorType);
      byCategory[cat] = (byCategory[cat] ?? 0) + 1;
      totalTransfer += e.transferSize;
      totalDecoded += e.decodedBodySize;
      totalDuration += e.duration;
      if (e.duration > maxDur) maxDur = e.duration;
      if (e.duration >= this.config.slowResourceThresholdMs) slowCount++;
    }

    return {
      totalCount: entries.length,
      totalTransferBytes: totalTransfer,
      totalDecodedBytes: totalDecoded,
      avgDuration: entries.length ? totalDuration / entries.length : 0,
      maxDuration: maxDur,
      slowCount,
      byCategory,
    };
  }

  // =======================================================================
  // 8. Navigation Timing
  // =======================================================================

  /**
   * Extract full Navigation Timing API data.
   * Returns a structured breakdown of DNS, TCP, TTFB, DOM processing, etc.
   */
  getNavigationTiming(): NavigationTimingData | null {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (entries.length === 0) return null;

    const nav = entries[0];

    return {
      dnsLookup: nav.domainLookupEnd - nav.domainLookupStart,
      tcpConnection: (nav.connectEnd - nav.connectStart) + (nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0),
      ttfb: nav.responseStart - nav.requestStart,
      responseDownload: nav.responseEnd - nav.responseStart,
      domProcessing: (nav.domInteractive - nav.responseEnd) + (nav.domComplete - nav.domInteractive),
      loadEvent: nav.loadEventEnd - nav.loadEventStart,
      totalLoadTime: nav.loadEventEnd - nav.startTime,
      raw: nav,
    };
  }

  /**
   * Return a human-readable navigation timing report string.
   */
  getNavigationTimingReport(): string {
    const timing = this.getNavigationTiming();
    if (!timing) return 'No navigation timing data available.';

    return [
      `Navigation Timing Report`,
      `--------------------------`,
      `DNS Lookup:              ${timing.dnsLookup.toFixed(1)} ms`,
      `TCP Connection:          ${timing.tcpConnection.toFixed(1)} ms`,
      `TTFB:                    ${timing.ttfb.toFixed(1)} ms`,
      `Response Download:       ${timing.responseDownload.toFixed(1)} ms`,
      `DOM Processing:          ${timing.domProcessing.toFixed(1)} ms`,
      `Load Event:              ${timing.loadEvent.toFixed(1)} ms`,
      `Total Load Time:         ${timing.totalLoadTime.toFixed(1)} ms`,
    ].join('\n');
  }

  // =======================================================================
  // 9. Memory Monitoring
  // =======================================================================

  /**
   * Take a snapshot of current JS heap memory (Chrome only).
   * Returns null if `performance.memory` is not available.
   */
  takeMemorySnapshot(): MemorySnapshot | null {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (!mem) return null;

    const snapshot: MemorySnapshot = {
      usedJSHeapSize: mem.usedJSHeapSize,
      totalJSHeapSize: mem.totalJSHeapSize,
      jsHeapSizeLimit: mem.jsHeapSizeLimit,
      timestamp: Date.now(),
    };

    this.memoryHistory.push(snapshot);
    this.detectMemoryLeak(snapshot);
    return snapshot;
  }

  /** Get all recorded memory snapshots. */
  getMemoryHistory(): MemorySnapshot[] {
    return [...this.memoryHistory];
  }

  /**
   * Start periodic memory monitoring at the given interval (default 5000 ms).
   */
  startMemoryMonitoring(intervalMs = 5000): void {
    if (this.memoryTimerId !== null) return;
    // Take initial snapshot
    this.takeMemorySnapshot();
    this.memoryTimerId = window.setInterval(() => this.takeMemorySnapshot(), intervalMs);
  }

  /** Stop periodic memory monitoring. */
  stopMemoryMonitoring(): void {
    if (this.memoryTimerId !== null) {
      clearInterval(this.memoryTimerId);
      this.memoryTimerId = null;
    }
  }

  /**
   * Simple heuristic-based memory leak detection.
   * Flags an alert when heap grows consecutively beyond thresholds.
   */
  private detectMemoryLeak(snapshot: MemorySnapshot): void {
    const usedMB = snapshot.usedJSHeapSize / (1024 * 1024);
    const growthMB = (snapshot.usedJSHeapSize - this.prevMemoryUsed) / (1024 * 1024);

    if (this.prevMemoryUsed > 0 && growthMB > this.config.memoryLeakGrowthThresholdMB) {
      this.consecutiveMemoryGrowth++;
    } else if (growthMB <= 0) {
      this.consecutiveMemoryGrowth = 0;
    }

    if (this.consecutiveMemoryGrowth >= this.config.memoryLeakConsecutiveGrowth) {
      this.fireAlert({
        id: uid('alert'),
        severity: 'warning',
        metricName: 'memory-leak',
        value: usedMB,
        threshold: this.config.memoryLeakGrowthThresholdMB,
        message: `Possible memory leak detected: heap grew ${growthMB.toFixed(1)} MB over ${this.consecutiveMemoryGrowth} consecutive samples (current: ${usedMB.toFixed(1)} MB)`,
        timestamp: Date.now(),
        context: { snapshot, consecutiveSamples: this.consecutiveMemoryGrowth },
      });
      this.consecutiveMemoryGrowth = 0; // Reset to avoid spamming
    }

    this.prevMemoryUsed = snapshot.usedJSHeapSize;
  }

  // =======================================================================
  // 10. Long Task Detection
  // =======================================================================

  /**
   * Subscribe to long task detections.
   */
  onLongTask(callback: MetricCallback<LongTaskEntry>): () => void {
    this.longTaskCallbacks.add(callback);
    return () => { this.longTaskCallbacks.delete(callback); };
  }

  /**
   * Observe long tasks (>50ms) using the PerformanceObserver "longtask" entry type.
   */
  observeLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const lt: LongTaskEntry = {
            duration: entry.duration,
            startTime: entry.startTime,
            attribution: [],
            detectedAt: performance.now(),
          };

          // Extract attribution if available
          const attribs = (entry as unknown as { attribution?: Array<{ containerType: string; containerName: string; containerId: string }> }).attribution;
          if (attribs) {
            lt.attribution = attribs.map((a) => `${a.containerType}:${a.containerName || a.containerId}`);
          }

          this.longTasks.push(lt);
          for (const cb of this.longTaskCallbacks) cb(lt);
        }
      });

      obs.observe({ type: 'longtask', buffered: true });
      this.observers.push(obs);

      if (this.config.debug) {
        console.log('[PerformanceMonitor] long-task observer started');
      }
    } catch {
      // longtask may not be supported in all browsers
    }
  }

  /** Get all detected long tasks. */
  getLongTasks(): LongTaskEntry[] {
    return [...this.longTasks];
  }

  /** Get summary stats about long tasks. */
  getLongTaskSummary(): { totalCount: number; totalDuration: number; avgDuration: number; maxDuration: number; worstAttribution: string } {
    const tasks = this.longTasks;
    if (tasks.length === 0) {
      return { totalCount: 0, totalDuration: 0, avgDuration: 0, maxDuration: 0, worstAttribution: '' };
    }

    let total = 0;
    let max = 0;
    let worstAttr = '';
    for (const t of tasks) {
      total += t.duration;
      if (t.duration > max) {
        max = t.duration;
        worstAttr = t.attribution.join(', ') || 'unknown';
      }
    }

    return {
      totalCount: tasks.length,
      totalDuration: total,
      avgDuration: total / tasks.length,
      maxDuration: max,
      worstAttribution: worstAttr,
    };
  }

  // =======================================================================
  // 11. FPS Counter
  // =======================================================================

  /**
   * Subscribe to FPS sample updates.
   */
  onFPSSample(callback: MetricCallback<FPSFrameSample>): () => void {
    this.fpsCallbacks.add(callback);
    return () => { this.fpsCallbacks.delete(callback); };
  }

  /**
   * Start measuring FPS using requestAnimationFrame.
   * Emits a sample every `fpsSampleWindowMs` milliseconds.
   */
  startFPSMonitoring(): void {
    if (this.rafId !== null) return;
    this.lastFrameTime = performance.now();
    this.fpsWindowStart = this.lastFrameTime;
    this.frameCount = 0;

    const loop = (now: number) => {
      if (!this.started) return;

      this.frameCount++;
      const elapsed = now - this.fpsWindowStart;

      if (elapsed >= this.config.fpsSampleWindowMs) {
        const fps = (this.frameCount / elapsed) * 1000;
        const jank = fps < this.config.fpsJankThreshold;
        const sample: FPSFrameSample = {
          frames: this.frameCount,
          duration: elapsed,
          fps: Math.round(fps * 10) / 10,
          timestamp: now,
          jank,
        };

        this.fpsHistory.push(sample);
        for (const cb of this.fpsCallbacks) cb(sample);

        if (jank) {
          this.fireAlert({
            id: uid('alert'),
            severity: 'warning',
            metricName: 'fps-jank',
            value: fps,
            threshold: this.config.fpsJankThreshold,
            message: `FPS jank detected: ${fps.toFixed(1)} fps (threshold: ${this.config.fpsJankThreshold})`,
            timestamp: Date.now(),
          });
        }

        this.frameCount = 0;
        this.fpsWindowStart = now;
      }

      this.lastFrameTime = now;
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  /** Stop FPS monitoring. */
  stopFPSMonitoring(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** Get recent FPS history. */
  getFPSHistory(): FPSFrameSample[] {
    return [...this.fpsHistory];
  }

  /** Get current / latest FPS reading, or 0 if no samples yet. */
  getCurrentFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    return this.fpsHistory[this.fpsHistory.length - 1].fps;
  }

  /** Calculate average FPS across all recorded samples. */
  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((acc, s) => acc + s.fps, 0);
    return Math.round((sum / this.fpsHistory.length) * 10) / 10;
  }

  /** Count how many jank events have occurred. */
  getJankCount(): number {
    return this.fpsHistory.filter((s) => s.jank).length;
  }

  // =======================================================================
  // 12. Performance Score
  // =======================================================================

  /**
   * Calculate an overall performance score (0-100) based on weighted Web Vitals.
   * Each vital is normalised to a 0-100 subscore then combined via configured weights.
   */
  calculateScore(): PerformanceScore {
    const weights = this.config.scoreWeights;
    const vitals: PerformanceScore['vitals'] = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;
    const detailParts: string[] = [];

    for (const [name, metric] of this.webVitals) {
      const w = weights[name] ?? 0;
      const subscore = this.vitalToSubscore(name, metric.value);
      const contribution = subscore * w;
      totalWeightedScore += contribution;
      totalWeight += w;

      vitals[name] = {
        value: metric.value,
        rating: metric.rating,
        weight: w,
        contribution: Math.round(contribution * 100) / 100,
      };
      detailParts.push(`${name}: ${subscore.toFixed(0)} (w=${w})`);
    }

    const score = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;

    return {
      score: Math.min(100, Math.max(0, score)),
      vitals,
      details: detailParts.join('; '),
      calculatedAt: Date.now(),
    };
  }

  /**
   * Convert a raw vital value into a 0-100 subscore.
   * Good = 100, Poor = 0, linear interpolation in between.
   */
  private vitalToSubscore(name: WebVitalName, value: number): number {
    const t = WEB_VITAL_THRESHOLDS[name];
    if (value <= t.good) return 100;
    if (value >= t.poor) return 0;
    // Linear interpolation between good and poor
    return 100 - ((value - t.good) / (t.poor - t.good)) * 100;
  }

  // =======================================================================
  // 13. Performance Budgets
  // =======================================================================

  /**
   * Define (or overwrite) a budget rule for a metric.
   */
  setBudget(metricName: string, maxValue: number): void {
    const existing = this.budgetRules.get(metricName);
    this.budgetRules.set(metricName, {
      metricName,
      maxValue,
      exceeded: existing?.exceeded ?? false,
      exceedCount: existing?.exceedCount ?? 0,
      worstValue: existing?.worstValue ?? 0,
    });
  }

  /** Remove a budget rule. */
  removeBudget(metricName: string): void {
    this.budgetRules.delete(metricName);
  }

  /** Get all current budget rules and their status. */
  getBudgets(): BudgetRule[] {
    return Array.from(this.budgetRules.values());
  }

  /**
   * Check all known metric values against their budgets.
   * Called internally when metrics are updated; can also be called manually.
   */
  checkAllBudgets(): void {
    // Check Web Vitals
    for (const [name, metric] of this.webVitals) {
      this.checkBudgets(name, metric.value);
    }
    // Check custom metrics
    for (const [id, metric] of this.customMetrics) {
      this.checkBudgets(id, metric.value);
    }
  }

  /** Internal: check a single metric against its budget rule. */
  private checkBudgets(metricName: string, value: number): void {
    const rule = this.budgetRules.get(metricName);
    if (!rule) return;

    if (value > rule.maxValue) {
      rule.exceeded = true;
      rule.exceedCount++;
      if (value > rule.worstValue) rule.worstValue = value;

      const severity: AlertSeverity = value > rule.maxValue * 2 ? 'critical' : 'warning';
      this.fireAlert({
        id: uid('alert'),
        severity,
        metricName,
        value,
        threshold: rule.maxValue,
        message: `Budget overrun: ${metricName} = ${value} exceeds limit ${rule.maxValue}`,
        timestamp: Date.now(),
      });
    }
  }

  // =======================================================================
  // 14. Reporting & Alerts
  // =======================================================================

  /**
   * Subscribe to alert notifications.
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertCallbacks.add(callback);
    return () => { this.alertCallbacks.delete(callback); };
  }

  /**
   * Fire an alert to all subscribers and store it.
   */
  private fireAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    this.config.onAlert(alert);
    for (const cb of this.alertCallbacks) cb(alert);

    if (this.config.debug) {
      console.warn(`[PerformanceMonitor] ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    }
  }

  /** Get all fired alerts. */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /** Clear stored alerts. */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Start automatic periodic reporting to the configured endpoint.
   */
  startReporting(): void {
    if (!this.config.reportEndpoint || this.reportTimerId !== null) return;
    this.reportTimerId = setInterval(() => this.sendReport(), this.config.reportIntervalMs);
  }

  /** Stop automatic reporting. */
  stopReporting(): void {
    if (this.reportTimerId !== null) {
      clearInterval(this.reportTimerId);
      this.reportTimerId = null;
    }
  }

  /**
   * Immediately send a performance report to the configured endpoint.
   * Uses `navigator.sendBeacon` when available for reliability on page unload.
   */
  async sendReport(): Promise<void> {
    const endpoint = this.config.reportEndpoint;
    if (!endpoint) return;

    const report = this.generateReport();

    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, JSON.stringify(report));
      } else {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
          keepalive: true,
        });
      }

      if (this.config.debug) {
        console.log('[PerformanceMonitor] report sent', endpoint);
      }
    } catch (err) {
      if (this.config.debug) {
        console.error('[PerformanceMonitor] report failed', err);
      }
    }
  }

  /**
   * Generate a full performance report object ready for serialisation.
   */
  generateReport(): {
    sessionId: string;
    timestamp: string;
    url: string;
    userAgent: string;
    vitals: WebVitalMetric[];
    customMetrics: CustomMetricEntry[];
    navigationTiming: NavigationTimingData | null;
    resourceSummary: ReturnType<PerformanceMonitor['getResourceSummary']>;
    longTaskSummary: ReturnType<PerformanceMonitor['getLongTaskSummary']>;
    fps: { current: number; average: number; jankCount: number };
    memory: MemorySnapshot | null;
    score: PerformanceScore;
    budgets: BudgetRule[];
    alerts: PerformanceAlert[];
  } {
    return {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: typeof location !== 'undefined' ? location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      vitals: this.getAllWebVitals(),
      customMetrics: this.getAllCustomMetrics(),
      navigationTiming: this.getNavigationTiming(),
      resourceSummary: this.getResourceSummary(),
      longTaskSummary: this.getLongTaskSummary(),
      fps: {
        current: this.getCurrentFPS(),
        average: this.getAverageFPS(),
        jankCount: this.getJankCount(),
      },
      memory: this.memoryHistory.length > 0 ? this.memoryHistory[this.memoryHistory.length - 1] : null,
      score: this.calculateScore(),
      budgets: this.getBudgets(),
      alerts: this.getAlerts(),
    };
  }

  /**
   * Return a human-readable text report.
   */
  generateTextReport(): string {
    const r = this.generateReport();
    const lines: string[] = [
      `=== Performance Monitor Report ===`,
      `Session : ${r.sessionId}`,
      `Time    : ${r.timestamp}`,
      `URL     : ${r.url}`,
      ``,
      `--- Score ---`,
      `Overall : ${r.score.score.toFixed(1)} / 100`,
      ``,
      `--- Web Vitals ---`,
    ];

    for (const v of r.vitals) {
      lines.push(`  ${v.name}: ${v.value} [${v.rating}]`);
    }

    lines.push('', `--- Custom Metrics ---`);
    for (const m of r.customMetrics) {
      lines.push(`  ${m.name} (${m.id}): ${m.value}${m.unit} [${m.type}]`);
    }

    if (r.navigationTiming) {
      lines.push('', `--- Navigation Timing ---`, this.getNavigationTimingReport());
    }

    lines.push(
      '', `--- Resources ---`,
      `  Total: ${r.resourceSummary.totalCount}, Slow: ${r.resourceSummary.slowCount}, Avg: ${r.resourceSummary.avgDuration.toFixed(1)}ms`,
      '', `--- Long Tasks ---`,
      `  Count: ${r.longTaskSummary.totalCount}, Total blocked: ${r.longTaskSummary.totalDuration.toFixed(1)}ms`,
      '', `--- FPS ---`,
      `  Current: ${r.fps.current}, Avg: ${r.fps.average}, Janks: ${r.fps.jankCount}`,
      '', `--- Budgets ---`,
    );

    for (const b of r.budgets) {
      lines.push(`  ${b.metricName}: limit=${b.maxValue}, exceeded=${b.exceeded} (${b.exceedCount}x), worst=${b.worstValue}`);
    }

    lines.push('', `--- Alerts (${r.alerts.length}) ---`);
    for (const a of r.alerts.slice(-10)) {
      lines.push(`  [${a.severity.toUpperCase()}] ${a.message}`);
    }

    return lines.join('\n');
  }

  // =======================================================================
  // 15. Trend Tracking
  // =======================================================================

  /**
   * Record a historical data point for trend analysis.
   * Called automatically for custom metrics; can also be called manually.
   */
  recordHistory(metricId: string, value: number): void {
    let points = this.history.get(metricId);
    if (!points) {
      points = [];
      this.history.set(metricId, points);
    }

    points.push({
      metricId,
      value,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    });

    // Enforce max history length
    if (points.length > this.config.maxHistoryPoints) {
      points.shift();
    }
  }

  /**
   * Get historical data points for a given metric.
   */
  getHistory(metricId: string): HistoricalDataPoint[] {
    return this.history.get(metricId) ?? [];
  }

  /**
   * Analyse trends for a metric based on its historical data.
   * Compares the first half average vs second half average.
   */
  analyseTrend(metricId: string): TrendAnalysis | null {
    const points = this.history.get(metricId);
    if (!points || points.length < 6) return null;

    const mid = Math.floor(points.length / 2);
    const firstHalf = points.slice(0, mid);
    const secondHalf = points.slice(mid);

    const avgFirst = firstHalf.reduce((s, p) => s + p.value, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, p) => s + p.value, 0) / secondHalf.length;
    const change = avgSecond - avgFirst;
    const pctChange = avgFirst !== 0 ? (change / avgFirst) * 100 : 0;

    // For latency-style metrics: positive change = degrading
    let direction: TrendDirection = 'stable';
    if (Math.abs(pctChange) > 5) {
      direction = pctChange > 0 ? 'degrading' : 'improving';
    }

    return {
      metricId,
      direction,
      averageChange: Math.round(change * 100) / 100,
      percentChange: Math.round(pctChange * 100) / 100,
      sampleSize: points.length,
      summary: `${metricId} is ${direction} (${pctChange > 0 ? '+' : ''}${pctChange.toFixed(1)}% over ${points.length} samples)`,
    };
  }

  /**
   * Analyse trends for all tracked metrics.
   */
  analyseAllTrends(): TrendAnalysis[] {
    const results: TrendAnalysis[] = [];
    for (const id of this.history.keys()) {
      const analysis = this.analyseTrend(id);
      if (analysis) results.push(analysis);
    }
    return results;
  }

  // =======================================================================
  // 16. A/B Test Impact Measurement
  // =======================================================================

  /**
   * Record a performance snapshot for an A/B test variant.
   * Store under `ab:<testName>:<variant>` keys.
   */
  recordABVariant(testName: string, variant: string, metrics: Record<string, number>): void {
    for (const [metricName, value] of Object.entries(metrics)) {
      const key = `ab:${testName}:${variant}:${metricName}`;
      this.recordHistory(key, value);
    }
  }

  /**
   * Compare two A/B variants for a given test.
   * Returns statistical comparison of each shared metric.
   */
  compareABVariants(testName: string, variantA: string, variantB: string): ABTestComparison {
    const prefixA = `ab:${testName}:${variantA}:`;
    const prefixB = `ab:${testName}:${variantB}:`;

    // Find all metric names present in both variants
    const metricNames = new Set<string>();
    for (const key of this.history.keys()) {
      if (key.startsWith(prefixA)) {
        const name = key.slice(prefixA.length);
        if (this.history.has(`${prefixB}${name}`)) {
          metricNames.add(name);
        }
      }
    }

    const metrics: ABTestComparison['metrics'] = [];
    let winsA = 0;
    let winsB = 0;

    for (const name of metricNames) {
      const dataA = this.history.get(`${prefixA}${name}`) ?? [];
      const dataB = this.history.get(`${prefixB}${name}`) ?? [];

      const avgA = dataA.length ? dataA.reduce((s, d) => s + d.value, 0) / dataA.length : 0;
      const avgB = dataB.length ? dataB.reduce((s, d) => s + d.value, 0) / dataB.length : 0;

      // For latency metrics lower is better
      const diff = ((avgA - avgB) / avgA) * 100;
      const winner: 'A' | 'B' | 'tie' = Math.abs(diff) < 2 ? 'tie' : avgA < avgB ? 'A' : 'B';

      if (winner === 'A') winsA++;
      else if (winner === 'B') winsB++;

      metrics.push({
        metricName: name,
        valueA: Math.round(avgA * 100) / 100,
        valueB: Math.round(avgB * 100) / 100,
        percentDiff: Math.round(diff * 100) / 100,
        winner,
      });
    }

    const total = winsA + winsB;
    let overallWinner: ABTestComparison['overallWinner'] = 'inconclusive';
    let confidence = 0;

    if (total > 0) {
      confidence = Math.max(winsA, winsB) / total;
      if (confidence > 0.65) {
        overallWinner = winsA > winsB ? 'A' : 'B';
      } else {
        overallWinner = 'tie';
      }
    }

    return {
      testName,
      variantA,
      variantB,
      metrics,
      overallWinner,
      confidence: Math.round(confidence * 100) / 100,
      generatedAt: new Date().toISOString(),
    };
  }

  // =======================================================================
  // 17. Utility Helpers (private)
  // =======================================================================

  /** Helper: create a PerformanceObserver for a given entry type. */
  private observeVital(
    type: string,
    handler: (entries: PerformanceEntryList) => void,
    buffered = false,
  ): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const obs = new PerformanceObserver((list) => handler(list.getEntries()));
      obs.observe({ type, buffered });
      this.observers.push(obs);
    } catch {
      // Entry type not supported in this browser
    }
  }

  /** Helper: build a standardised WebVitalMetric object. */
  private buildVital(name: WebVitalName, value: number, startTime: number): WebVitalMetric {
    const rating = this.rateVital(name, value);
    const metric: WebVitalMetric = {
      name,
      value: Math.round(value * 100) / 100,
      timestamp: performance.now(),
      startTime,
      rating,
      navigationId: this.sessionId,
    };
    return metric;
  }

  /** Helper: emit a vital to subscribers and store it. */
  private emitVital(metric: WebVitalMetric): void {
    this.webVitals.set(metric.name, metric);
    this.checkBudgets(metric.name, metric.value);
    this.recordHistory(metric.name, metric.value);
    for (const cb of this.vitalCallbacks) cb(metric);
  }

  /** Helper: rate a vital value as good / needs-improvement / poor. */
  private rateVital(name: WebVitalName, value: string | number): WebVitalMetric['rating'] {
    const t = WEB_VITAL_THRESHOLDS[name];
    if (value <= t.good) return 'good';
    if (value <= t.poor) return 'needs-improvement';
    return 'poor';
  }

  /** Helper: categorise a resource initiator type. */
  private categoriseResource(initiatorType: string): ResourceCategory {
    switch (initiatorType) {
      case 'img':
      case 'image': return 'image';
      case 'script': return 'script';
      case 'font':
      case 'css': return initiatorType === 'css' ? 'stylesheet' : 'font';
      case 'link': return 'stylesheet';
      case 'xmlhttprequest':
      case 'fetch':
      case 'xhr': return initiatorType === 'xmlhttprequest' ? 'xhr' : 'fetch';
      default: return 'other';
    }
  }

  /** Helper: truncate URLs for readability / privacy. */
  private truncateUrl(url: string, maxLength = 120): string {
    try {
      const u = new URL(url);
      const path = u.pathname + u.search;
      if (path.length <= maxLength) return u.origin + path;
      return u.origin + path.slice(0, maxLength - 3) + '...';
    } catch {
      return url.length <= maxLength ? url : url.slice(0, maxLength - 3) + '...';
    }
  }

  /** Helper: record a value into a histogram metric's buckets. */
  private recordHistogramBucket(metric: CustomMetricEntry, value: number): void {
    if (!metric.buckets) metric.buckets = [];

    // Try to find an existing bucket this value falls into (bucket width = 100 for generic histograms)
    const bucketWidth = 100;
    const bucketIndex = Math.floor(value / bucketWidth);
    const min = bucketIndex * bucketWidth;
    const max = (bucketIndex + 1) * bucketWidth;

    const existing = metric.buckets.find((b) => b.min === min && b.max === max);
    if (existing) {
      existing.count++;
    } else {
      metric.buckets.push({ min, max, count: 1 });
    }

    // Track mean-ish value for quick access
    metric.value = value;
  }
}

// =======================================================================
// 18. Factory & Singleton Helpers
// =======================================================================

/**
 * Create and optionally auto-start a PerformanceMonitor instance.
 *
 * @example
 * ```ts
 * const monitor = createPerformanceMonitor({ autoStartFPS: true });
 * monitor.onWebVital((v) => console.log(v));
 * ```
 */
export function createPerformanceMonitor(config?: PerformanceMonitorConfig): PerformanceMonitor {
  const monitor = new PerformanceMonitor(config);
  monitor.start();
  return monitor;
}

/** Default singleton instance (lazy-initialised on first access). */
let _defaultInstance: PerformanceMonitor | null = null;

/**
 * Get or create the default singleton PerformanceMonitor instance.
 * Uses default configuration; call `.destroy()` to reset.
 */
export function getDefaultMonitor(config?: PerformanceMonitorConfig): PerformanceMonitor {
  if (!_defaultInstance) {
    _defaultInstance = createPerformanceMonitor(config);
  }
  return _defaultInstance;
}

// =======================================================================
// 19. Re-exported Utilities
// =======================================================================

/**
 * Quick one-liner: capture current Web Vitals and return them as a promise.
 * Useful for non-class usage patterns.
 *
 * @example
 * ```ts
 * const vitals = await captureWebVitals();
 * console.log(vitals);
 * ```
 */
export function captureWebVitals(): Promise<WebVitalMetric[]> {
  return new Promise((resolve) => {
    const monitor = new PerformanceMonitor({ autoCollectWebVitals: true, autoObserveLongTasks: false });
    const vitals: WebVitalMetric[] = [];

    // Wait up to 5 seconds for all vitals to arrive
    const timeout = setTimeout(() => {
      monitor.stop();
      resolve(vitals);
    }, 5000);

    monitor.onWebVital((v) => {
      vitals.push(v);
      // Resolve once we have all 5 expected vitals (or after timeout)
      if (vitals.length >= 5) {
        clearTimeout(timeout);
        monitor.stop();
        resolve(vitals);
      }
    });

    monitor.start();
  });
}

/**
 * Check whether the current browser supports the required Performance APIs.
 */
export function checkBrowserSupport(): {
  performanceObserver: boolean;
  navigationTiming: boolean;
  resourceTiming: boolean;
  memoryApi: boolean;
  longTaskApi: boolean;
  userTiming: boolean;
  allSupported: boolean;
} {
  return {
    performanceObserver: typeof PerformanceObserver !== 'undefined',
    navigationTiming: !!(
      typeof performance !== 'undefined' &&
      performance.getEntriesByType &&
      performance.getEntriesByType('navigation').length > 0
    ),
    resourceTiming: !!(typeof performance !== 'undefined' && performance.getEntriesByType && performance.getEntriesByType('resource')),
    memoryApi: !!(typeof performance !== 'undefined' && (performance as unknown as { memory?: unknown }).memory),
    longTaskApi: (() => {
      try {
        return typeof PerformanceObserver !== 'undefined' &&
          typeof PerformanceObserver.supportedEntryTypes !== 'undefined' &&
          PerformanceObserver.supportedEntryTypes.includes('longtask');
      } catch {
        return false;
      }
    })(),
    userTiming: !!(typeof performance !== 'undefined' && performance.mark && performance.measure),
    allSupported: typeof PerformanceObserver !== 'undefined' && typeof performance !== 'undefined',
  };
}
