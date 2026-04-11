/**
 * Metrics Utilities: Client-side metrics collection including counters,
 * gauges, histograms, timers, percentile calculation, metrics aggregation,
 * and export formats (Prometheus/JSON).
 */

// --- Types ---

export interface MetricBase {
  name: string;
  help: string;
  tags?: Record<string, string>;
  timestamp: number;
}

export interface CounterMetric extends MetricBase {
  type: "counter";
  value: number;
}

export interface GaugeMetric extends MetricBase {
  type: "gauge";
  value: number;
}

export interface HistogramMetric extends MetricBase {
  type: "histogram";
  buckets: number[];
  counts: number[];
  sum: number;
  count: number;
  min: number;
  max: number;
}

export interface TimerMetric extends HistogramMetric {
  type: "timer";
}

export type Metric = CounterMetric | GaugeMetric | HistogramMetric | TimerMetric;

export interface MetricsRegistryConfig {
  /** Prefix all metric names. Default "" */
  prefix?: string;
  /** Default tags applied to all metrics */
  defaultTags?: Record<string, string>;
  /** Whether to automatically collect browser metrics */
  collectBrowserMetrics?: boolean;
  /** Collection interval for browser metrics in ms. Default 10000 */
  collectionInterval?: number;
}

// --- Counter ---

/**
 * A counter that only increases (or resets to zero).
 */
export class Counter {
  private _value = 0;
  readonly name: string;
  readonly help: string;
  readonly tags: Record<string, string>;

  constructor(name: string, help: string, tags: Record<string, string> = {}) {
    this.name = name;
    this.help = help;
    this.tags = tags;
  }

  /** Increment by amount (default 1) */
  inc(amount = 1): void {
    this._value += Math.max(0, amount);
  }

  /** Get current value */
  get value(): number { return this._value; }

  /** Reset to zero */
  reset(): void { this._value = 0; }

  /** Export as CounterMetric */
  toMetric(prefix = ""): CounterMetric {
    return {
      type: "counter",
      name: prefix + this.name,
      help: this.help,
      value: this._value,
      tags: { ...this.tags },
      timestamp: Date.now(),
    };
  }
}

// --- Gauge ---

/**
 * A gauge that can go up or down.
 */
export class Gauge {
  private _value = 0;
  readonly name: string;
  readonly help: string;
  readonly tags: Record<string, string>;

  constructor(name: string, help: string, initialValue = 0, tags: Record<string, string> = {}) {
    this.name = name;
    this.help = help;
    this._value = initialValue;
    this.tags = tags;
  }

  set(value: number): void { this._value = value; }
  inc(amount = 1): void { this._value += amount; }
  dec(amount = 1): void { this._value -= Math.min(this._value, amount); }

  get value(): number { return this._value; }

  toMetric(prefix = ""): GaugeMetric {
    return {
      type: "gauge",
      name: prefix + this.name,
      help: this.help,
      value: this._value,
      tags: { ...this.tags },
      timestamp: Date.now(),
    };
  }
}

// --- Histogram ---

/** Default histogram bucket boundaries */
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * A histogram that tracks the distribution of values across configurable buckets.
 */
export class Histogram {
  private _buckets: number[];
  private _counts: number[] = [];
  private _sum = 0;
  private _count = 0;
  private _min = Infinity;
  private _max = -Infinity;
  readonly name: string;
  readonly help: string;
  readonly tags: Record<string, string>;

  constructor(
    name: string,
    help: string,
    buckets = DEFAULT_BUCKETS,
    tags: Record<string, string> = {},
  ) {
    this.name = name;
    this.help = help;
    this._buckets = [...buckets].sort((a, b) => a - b);
    this._counts = new Array(buckets.length + 1).fill(0);
    this.tags = tags;
  }

  /** Record a value */
  observe(value: number): void {
    this._sum += value;
    this._count++;
    if (value < this._min) this._min = value;
    if (value > this._max) this._max = value;

    // Find the right bucket
    let bucketIdx = this._buckets.length; // Start at +Inf bucket
    for (let i = 0; i < this._buckets.length; i++) {
      if (value <= this._buckets[i]!) {
        bucketIdx = i;
        break;
      }
    }
    this._counts[bucketIdx]++;
  }

  get sum(): number { return this._sum; }
  get count(): number { return this._count; }
  get min(): number { return this._min === Infinity ? 0 : this._min; }
  get max(): number { return this._max === -Infinity ? 0 : this._max; }
  get mean(): number { return this._count === 0 ? 0 : this._sum / this._count; }

  /** Calculate percentile using linear interpolation between buckets */
  percentile(p: number): number {
    if (this._count === 0) return 0;

    const target = (p / 100) * this._count;
    let cumulative = 0;

    for (let i = 0; i < this._counts.length; i++) {
      cumulative += this._counts[i]!;
      if (cumulative >= target) {
        if (i === 0) return 0;
        const upperBound = i <= this._buckets.length ? this._buckets[i - 1] ?? Infinity : Infinity;
        const lowerBound = i > 1 ? this._buckets[i - 2] ?? 0 : 0;
        // Linear interpolation within bucket
        const prevCumulative = cumulative - this._counts[i]!;
        const fraction = (target - prevCumulative) / (this._counts[i] ?? 1);
        return lowerBound + (upperBound - lowerBound) * fraction;
      }
    }

    return this._max;
  }

  /** Get common percentiles */
  get percentiles(): Record<string, number> {
    return {
      p50: this.percentile(50),
      p90: this.percentile(90),
      p95: this.percentile(95),
      p99: this.percentile(99),
    };
  }

  reset(): void {
    this._counts = new Array(this._buckets.length + 1).fill(0);
    this._sum = 0;
    this._count = 0;
    this._min = Infinity;
    this._max = -Infinity;
  }

  toMetric(prefix = ""): HistogramMetric {
    return {
      type: "histogram",
      name: prefix + this.name,
      help: this.help,
      buckets: [...this._buckets],
      counts: [...this._counts],
      sum: this._sum,
      count: this._count,
      min: this.min,
      max: this.max,
      tags: { ...this.tags },
      timestamp: Date.now(),
    };
  }
}

// --- Timer (Histogram wrapper with timing convenience) ---

/**
 * A timer that measures durations and records them into a histogram.
 */
export class Timer {
  private histogram: Histogram;
  private activeTimers = new Map<string, number>();

  constructor(name: string, help: string, buckets?: number[], tags?: Record<string, string>) {
    this.histogram = new Histogram(name, help, buckets, tags);
  }

  /** Start a named timer, returns a stop function */
  start(label = "default"): () => number {
    const start = performance.now();
    this.activeTimers.set(label, start);

    return (): number => {
      const elapsed = performance.now() - start;
      this.activeTimers.delete(label);
      this.histogram.observe(elapsed);
      return elapsed;
    };
  }

  /** Time an async function */
  async timeAsync<T>(label = "default", fn: () => Promise<T>): Promise<T> {
    const stop = this.start(label);
    try {
      const result = await fn();
      stop();
      return result;
    } catch (err) {
      stop();
      throw err;
    }
  }

  /** Record a duration directly */
  record(ms: number): void { this.histogram.observe(ms); }

  get percentiles() { return this.histogram.percentiles; }
  get mean() { return this.histogram.mean; }
  get count() { return this.histogram.count; }

  toMetric(prefix = ""): TimerMetric {
    return { ...this.histogram.toMetric(prefix), type: "timer" } as TimerMetric;
  }

  reset(): void { this.histogram.reset(); }
}

// --- Metrics Registry ---

/**
 * Central registry for all metrics. Create counters/gauges/histograms/timers
 * through the registry for unified management and export.
 */
export class MetricsRegistry {
  private metrics = new Map<string, Counter | Gauge | Histogram | Timer>();
  private config: Required<MetricsRegistryConfig>;
  private collectionTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: MetricsRegistryConfig = {}) {
    this.config = {
      prefix: config.prefix ?? "",
      defaultTags: config.defaultTags ?? {},
      collectBrowserMetrics: config.collectBrowserMetrics ?? false,
      collectionInterval: config.collectionInterval ?? 10000,
    };

    if (this.config.collectBrowserMetrics && typeof window !== "undefined") {
      this.setupBrowserMetrics();
    }
  }

  /** Create or get a counter */
  counter(name: string, help: string, tags?: Record<string, string>): Counter {
    const key = `counter:${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, new Counter(name, help, { ...this.config.defaultTags, ...tags }));
    }
    return this.metrics.get(key)! as Counter;
  }

  /** Create or get a gauge */
  gauge(name: string, help: string, initialValue?: number, tags?: Record<string, string>): Gauge {
    const key = `gauge:${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, new Gauge(name, help, initialValue, { ...this.config.defaultTags, ...tags }));
    }
    return this.metrics.get(key)! as Gauge;
  }

  /** Create or get a histogram */
  histogram(name: string, help: string, buckets?: number[], tags?: Record<string, string>): Histogram {
    const key = `histogram:${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, new Histogram(name, help, buckets, { ...this.config.defaultTags, ...tags }));
    }
    return this.metrics.get(key)! as Histogram;
  }

  /** Create or get a timer */
  timer(name: string, help: string, buckets?: number[], tags?: Record<string, string>): Timer {
    const key = `timer:${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, new Timer(name, help, buckets, { ...this.config.defaultTags, ...tags }));
    }
    return this.metrics.get(key)! as Timer;
  }

  /** Get all registered metrics */
  getAll(): Metric[] {
    const result: Metric[] = [];
    for (const m of this.metrics.values()) {
      result.push(m.toMetric(this.config.prefix));
    }
    return result;
  }

  /** Export all metrics in Prometheus text format */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const m of this.getAll()) {
      const tagStr = m.tags ? formatPrometheusLabels(m.tags) : "";

      switch (m.type) {
        case "counter":
          lines.push(`# HELP ${m.name} ${m.help}`);
          lines.push(`# TYPE ${m.name} counter`);
          lines.push(`${m.name}${tagStr} ${m.value}`);
          break;

        case "gauge":
          lines.push(`# HELP ${m.name} ${m.help}`);
          lines.push(`# TYPE ${m.name} gauge`);
          lines.push(`${m.name}${tagStr} ${m.value}`);
          break;

        case "histogram":
        case "timer": {
          lines.push(`# HELP ${m.name} ${m.help}`);
          lines.push(`# TYPE ${m.name} histogram`);
          // Bucket counts (cumulative)
          let cumulative = 0;
          for (let i = 0; i < m.buckets.length; i++) {
            cumulative += m.counts[i]!;
            lines.push(`${m.name}_bucket{le="${m.buckets[i]}"${tagStr.replace(/^{|}$/g, "")}} ${cumulative}`);
          }
          cumulative += m.counts[m.counts.length - 1] ?? 0;
          lines.push(`${m.name}_bucket{le="+Inf"${tagStr.replace(/^{|}$/g, "")}} ${cumulative}`);
          lines.push(`${m.name}_sum${tagStr} ${m.sum}`);
          lines.push(`${m.name}_count${tagStr} ${m.count}`);
          break;
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  /** Export all metrics as JSON */
  exportJson(): string {
    return JSON.stringify(this.getAll(), null, 2);
  }

  /** Reset all metrics */
  resetAll(): void {
    for (const m of this.metrics.values()) {
      if ("reset" in m) (m as Counter | Gauge | Histogram | Timer).reset();
    }
  }

  /** Remove all metrics */
  clear(): void {
    this.metrics.clear();
    if (this.collectionTimer) clearInterval(this.collectionTimer);
  }

  destroy(): void { this.clear(); }

  // --- Browser Metrics ---

  private setupBrowserMetrics(): void {
    // Performance memory (if available)
    const memGauge = this.gauge("browser_memory_used_mb", "Memory used by the page in MB");
    const perfEntries = this.counter("performance_entries", "Number of performance entries observed");

    const collect = () => {
      try {
        if ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize) {
          memGauge.set(
            Math.round((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / (1024 * 1024) * 100) / 100,
          );
        }
        perfEntries.inc(performance.getEntries().length);
      } catch {}
    };

    collect();
    this.collectionTimer = setInterval(collect, this.config.collectionInterval);
  }
}

// --- Utility Functions ---

function formatPrometheusLabels(tags: Record<string, string>): string {
  const entries = Object.entries(tags);
  if (entries.length === 0) return "";
  const formatted = entries.map(([k, v]) => `${k}="${v}"`).join(",");
  return `{${formatted}}`;
}

/** Calculate percentile from a sorted array of numbers */
export function calculatePercentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0]!;

  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  return sortedValues[lower]! * (1 - fraction) + sortedValues[upper]! * fraction;
}

/** Global default registry instance */
let defaultRegistry: MetricsRegistry | null = null;

/** Get or create the global metrics registry */
export function getMetricsRegistry(config?: MetricsRegistryConfig): MetricsRegistry {
  if (!defaultRegistry) defaultRegistry = new MetricsRegistry(config);
  return defaultRegistry;
}

/** Destroy the global registry */
export function destroyMetricsRegistry(): void {
  if (defaultRegistry) { defaultRegistry.destroy(); defaultRegistry = null; }
}
