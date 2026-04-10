/**
 * Event Aggregator: Time-windowed event analytics with counters, gauges,
 * histograms, percentile calculation, rate computation, alerting, and
 * time-series data management. Useful for metrics, monitoring, and
 * real-time dashboards.
 */

// --- Types ---

export type MetricType = "counter" | "gauge" | "histogram" | "timer";

export interface MetricId {
  name: string;
  tags?: Record<string, string>;
}

export interface CounterValue {
  count: number;
  rate: number;       // Events per second (over window)
  rate1m: number;
  rate5m: number;
  rate15m: number;
}

export interface GaugeValue {
  value: number;
  min: number;
  max: number;
  avg: number;
  timestamp: number;
}

export interface HistogramBucket {
  le: number;         // Less-than-or-equal boundary
  count: number;
}

export interface HistogramValue {
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  buckets: HistogramBucket[];
  stddev: number;
}

export interface TimerValue extends HistogramValue {
  /** Duration in milliseconds */
  durationMs: number;
}

export interface AggregatedMetrics {
  counters: Map<string, CounterValue>;
  gauges: Map<string, GaugeValue>;
  histograms: Map<string, HistogramValue>;
  timers: Map<string, TimerValue>;
  timestamp: number;
}

export interface AlertRule {
  id: string;
  metricName: string;
  type: MetricType;
  condition: "gt" | "lt" | "eq" | "gte" | "lte" | "outside" | "inside" | "changes";
  threshold: number;
  windowMs?: number;
  message: string;
  severity: "info" | "warning" | "critical";
  cooldownMs?: number;
  enabled?: boolean;
  onTrigger?: (alert: AlertEvent) => void;
  onResolve?: (alert: AlertEvent) => void;
}

export interface AlertEvent {
  rule: AlertRule;
  value: number;
  timestamp: number;
  resolved?: boolean;
}

// --- Time Window Ring Buffer ---

class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private size: number;
  private writeIdx = 0;
  private count = 0;

  constructor(size: number) {
    this.size = size;
    this.buffer = new Array(size).fill(undefined);
  }

  push(value: T): void {
    this.buffer[this.writeIdx] = value;
    this.writeIdx = (this.writeIdx + 1) % this.size;
    if (this.count < this.size) this.count++;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.writeIdx - this.count + i + this.size) % this.size;
      const val = this.buffer[idx];
      if (val !== undefined) result.push(val);
    }
    return result;
  }

  get length(): number { return this.count; }

  clear(): void {
    this.buffer.fill(undefined);
    this.writeIdx = 0;
    this.count = 0;
  }
}

// --- Counter ---

class Counter {
  private current = 0;
  private history: RingBuffer<{ ts: number; delta: number }>;

  constructor(private windowSeconds: number = 60) {
    // Store ~10 samples per second for the window
    const samples = Math.max(10, windowSeconds * 10);
    this.history = new RingBuffer(samples);
  }

  increment(amount = 1): void {
    this.current += amount;
    this.history.push({ ts: Date.now(), delta: amount });
  }

  decrement(amount = 1): void {
    this.current -= amount;
    this.history.push({ ts: Date.now(), delta: -amount });
  }

  reset(): number {
    const prev = this.current;
    this.current = 0;
    this.history.clear();
    return prev;
  }

  getValue(): CounterValue {
    const now = Date.now();
    const entries = this.history.toArray();

    // Calculate rates for different windows
    const rate1m = this.calcRate(entries, now, 60_000);
    const rate5m = this.calcRate(entries, now, 300_000);
    const rate15m = this.calcRate(entries, now, 900_000);

    return {
      count: this.current,
      rate: rate1m,
      rate1m,
      rate5m,
      rate15m,
    };
  }

  private calcRate(entries: Array<{ ts: number; delta: number }>, now: number, windowMs: number): number {
    const cutoff = now - windowMs;
    const windowEntries = entries.filter((e) => e.ts > cutoff);
    if (windowEntries.length === 0) return 0;

    const totalDelta = windowEntries.reduce((sum, e) => sum + e.delta, 0);
    const elapsed = Math.min(windowMs, now - (windowEntries[0]?.ts ?? now));
    return elapsed > 0 ? (totalDelta / elapsed) * 1000 : 0;
  }
}

// --- Gauge ---

class Gauge {
  private currentValue = 0;
  private history: RingBuffer<{ ts: number; value: number }>;

  constructor(maxSamples = 3600) {
    this.history = new RingBuffer(maxSamples);
  }

  set(value: number): void {
    this.currentValue = value;
    this.history.push({ ts: Date.now(), value });
  }

  increment(amount = 1): void { value: number } {
    this.currentValue += amount;
    this.history.push({ ts: Date.now(), value: this.currentValue });
    return { value: this.currentValue };
  }

  decrement(amount = 1): void { value: number } {
    this.currentValue -= amount;
    this.history.push({ ts: Date.now(), value: this.currentValue });
    return { value: this.currentValue };
  }

  getValue(): GaugeValue {
    const entries = this.history.toArray();
    if (entries.length === 0) {
      return { value: this.currentValue, min: this.currentValue, max: this.currentValue, avg: this.currentValue, timestamp: Date.now() };
    }

    const values = entries.map((e) => e.value);
    return {
      value: this.currentValue,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      timestamp: Date.now(),
    };
  }
}

// --- Histogram ---

class Histogram {
  private count = 0;
  private sum = 0;
  private min = Infinity;
  private max = -Infinity;
  private values: RingBuffer<number>;
  private bucketBoundaries: number[];

  constructor(options?: { maxValues?: number; boundaries?: number[] }) {
    const maxVals = options?.maxValues ?? 10_000;
    this.values = new RingBuffer(maxVals);
    // Default exponential-style buckets: 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, +Inf
    this.bucketBoundaries = options?.boundaries ?? [
      1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 5000, 10000, Infinity,
    ];
  }

  record(value: number): void {
    this.count++;
    this.sum += value;
    if (value < this.min) this.min = value;
    if (value > this.max) this.max = value;
    this.values.push(value);
  }

  getValue(): HistogramValue {
    const vals = this.values.toArray();

    if (vals.length === 0) {
      return this.emptyResult();
    }

    const sorted = [...vals].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const median = percentile(sorted, 50);

    // Standard deviation
    const variance = sorted.reduce((acc, v) => acc + (v - avg) ** 2, 0) / sorted.length;
    const stddev = Math.sqrt(variance);

    // Buckets
    const buckets: HistogramBucket[] = [];
    for (const boundary of this.bucketBoundaries) {
      const count = sorted.filter((v) => v <= boundary).length;
      buckets.push({ le: boundary, count });
    }

    return {
      count: this.count,
      sum: this.sum,
      min: this.min === Infinity ? 0 : this.min,
      max: this.max === -Infinity ? 0 : this.max,
      avg,
      median,
      p75: percentile(sorted, 75),
      p90: percentile(sorted, 90),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
      buckets,
      stddev,
    };
  }

  reset(): void {
    this.count = 0;
    this.sum = 0;
    this.min = Infinity;
    this.max = -Infinity;
    this.values.clear();
  }

  private emptyResult(): HistogramValue {
    return {
      count: 0, sum: 0, min: 0, max: 0, avg: 0, median: 0,
      p75: 0, p90: 0, p95: 0, p99: 0,
      buckets: [], stddev: 0,
    };
  }
}

// --- Timer (histogram of durations) ---

class Timer extends Histogram {
  private startTimes = new Map<string, number>();

  start(id = "default"): () => number {
    this.startTimes.set(id, performance.now());
    return () => this.stop(id);
  }

  stop(id = "default"): number {
    const startTime = this.startTimes.get(id);
    if (startTime === undefined) throw new Error(`Timer "${id}" was not started`);
    const duration = performance.now() - startTime;
    this.startTimes.delete(id);
    this.record(duration);
    return duration;
  }

  getTimeValue(): TimerValue {
    const hist = this.getValue();
    return { ...hist, durationMs: hist.avg };
  }
}

// --- Main Aggregator ---

/**
 * Event/metrics aggregator with counters, gauges, histograms, and timers.
 *
 * ```ts
 * const agg = new EventAggregator();
 *
 * agg.counter("api.requests").increment();
 * agg.gauge("memory.usage").set(process.memoryUsage().heapUsed);
 * agg.timer("db.query").start("query1");
 * // ... do query ...
 * agg.timer("db.query").stop("query1");
 *
 * const metrics = agg.snapshot(); // Get all current values
 * ```
 */
export class EventAggregator {
  private counters = new Map<string, Counter>();
  private gauges = new Map<string, Gauge>();
  private histograms = new Map<string, Histogram>();
  private timers = new Map<string, Timer>();
  private alerts: AlertRule[] = [];
  private alertStates = new Map<string, boolean>(); // true = firing

  // --- Counter API ---

  counter(name: string): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Counter());
    }
    return this.counters.get(name)!;
  }

  // --- Gauge API ---

  gauge(name: string): Gauge {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Gauge());
    }
    return this.gauges.get(name)!;
  }

  // --- Histogram API ---

  histogram(name: string, options?: { boundaries?: number[] }): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Histogram(options));
    }
    return this.histograms.get(name)!;
  }

  // --- Timer API ---

  timer(name: string): Timer {
    if (!this.timers.has(name)) {
      this.timers.set(name, new Timer());
    }
    return this.timers.get(name)!;
  }

  // --- Snapshot ---

  /**
   * Take a snapshot of all current metric values.
   */
  snapshot(): AggregatedMetrics {
    const counters = new Map<string, CounterValue>();
    for (const [name, c] of this.counters) {
      counters.set(name, c.getValue());
    }

    const gauges = new Map<string, GaugeValue>();
    for (const [name, g] of this.gauges) {
      gauges.set(name, g.getValue());
    }

    const histograms = new Map<string, HistogramValue>();
    for (const [name, h] of this.histograms) {
      histograms.set(name, h.getValue());
    }

    const timers = new Map<string, TimerValue>();
    for (const [name, t] of this.timers) {
      timers.set(name, t.getTimeValue());
    }

    return {
      counters, gauges, histograms, timers,
      timestamp: Date.now(),
    };
  }

  /**
   * Export all metrics in Prometheus exposition format.
   */
  exportPrometheus(): string {
    const snap = this.snapshot();
    const lines: string[] = [];

    for (const [name, val] of snap.counters) {
      lines.push(`# HELP ${name} Total count`);
      lines.push(`# TYPE ${name} counter`);
      lines.push(`${name}_total ${val.count}`);
      lines.push(`${name}_rate ${val.rate.toFixed(4)}`);
    }

    for (const [name, val] of snap.gauges) {
      lines.push(`# HELP ${name} Current value`);
      lines.push(`# TYPE ${name} gauge`);
      lines.push(`${name} ${val.value}`);
      lines.push(`${name}_min ${val.min}`);
      lines.push(`${name}_max ${val.max}`);
      lines.push(`${name}_avg ${val.avg.toFixed(4)}`);
    }

    for (const [name, val] of snap.histograms) {
      lines.push(`# HELP ${name} Distribution`);
      lines.push(`# TYPE ${name} summary`);
      lines.push(`${name}_count ${val.count}`);
      lines.push(`${name}_sum ${val.sum.toFixed(4)}`);
      lines.push(`${name}_avg ${val.avg.toFixed(4)}`);
      lines.push(`${name}_median ${val.median.toFixed(4)}`);
      lines.push(`${name}_p95 ${val.p95.toFixed(4)}`);
      lines.push(`${name}_p99 ${val.p99.toFixed(4)}`);

      for (const bucket of val.buckets) {
        const leStr = bucket.le === Infinity ? "+Inf" : String(bucket.le);
        lines.push(`${name}_bucket{le="${leStr}"} ${bucket.count}`);
      }
    }

    for (const [name, val] of snap.timers) {
      lines.push(`# HELP ${name} Duration in ms`);
      lines.push(`# TYPE ${name} summary`);
      lines.push(`${name}_count ${val.count}`);
      lines.push(`${name}_duration_ms_sum ${val.sum.toFixed(4)}`);
      lines.push(`${name}_duration_ms_avg ${val.avg.toFixed(4)}`);
      lines.push(`${name}_duration_ms_p95 ${val.p95.toFixed(4)}`);
      lines.push(`${name}_duration_ms_p99 ${val.p99.toFixed(4)}`);
    }

    return lines.join("\n");
  }

  /**
   * Export as JSON.
   */
  exportJson(): string {
    const snap = this.snapshot();
    return JSON.stringify({
      timestamp: snap.timestamp,
      counters: Object.fromEntries(snap.counters),
      gauges: Object.fromEntries(snap.gauges),
      histograms: Object.fromEntries(snap.histograms),
      timers: Object.fromEntries(snap.timers),
    }, null, 2);
  }

  // --- Alerting ---

  /** Add an alert rule */
  addAlert(rule: AlertRule): void {
    this.alerts.push(rule);
  }

  /** Remove an alert rule */
  removeAlert(ruleId: string): boolean {
    const idx = this.alerts.findIndex((r) => r.id === ruleId);
    if (idx === -1) return false;
    this.alerts.splice(idx, 1);
    this.alertStates.delete(ruleId);
    return true;
  }

  /** Evaluate all alert rules against current metrics */
  evaluateAlerts(): AlertEvent[] {
    const snap = this.snapshot();
    const triggered: AlertEvent[] = [];

    for (const rule of this.alerts) {
      if (rule.enabled === false) continue;

      let value = 0;
      switch (rule.type) {
        case "counter": value = snap.counters.get(rule.metricName)?.rate ?? 0; break;
        case "gauge": value = snap.gauges.get(rule.metricName)?.value ?? 0; break;
        case "histogram": value = snap.histograms.get(rule.metricName)?.avg ?? 0; break;
        case "timer": value = snap.timers.get(rule.metricName)?.durationMs ?? 0; break;
      }

      const isFiring = this.checkCondition(value, rule.condition, rule.threshold);
      const wasFiring = this.alertStates.get(rule.id) ?? false;

      if (isFiring && !wasFiring) {
        // New alert
        const event: AlertEvent = { rule, value, timestamp: Date.now() };
        triggered.push(event);
        this.alertStates.set(rule.id, true);
        rule.onTrigger?.(event);
      } else if (!isFiring && wasFiring) {
        // Resolved
        const event: AlertEvent = { rule, value, timestamp: Date.now(), resolved: true };
        triggered.push(event);
        this.alertStates.set(rule.id, false);
        rule.onResolve?.(event);
      }
    }

    return triggered;
  }

  private checkCondition(value: number, condition: AlertRule["condition"], threshold: number): boolean {
    switch (condition) {
      case "gt": return value > threshold;
      case "lt": return value < threshold;
      case "eq": return value === threshold;
      case "gte": return value >= threshold;
      case "lte": return value <= threshold;
      default: return false;
    }
  }

  // --- Cleanup ---

  /** Reset all metrics */
  reset(): void {
    for (const c of this.counters.values()) c.reset();
    for (const h of this.histograms.values()) h.reset();
    for (const t of this.timers.values()) t.reset();
    // Gauges don't reset — they hold state
  }

  /** Get counts of registered metrics */
  getRegistrySize(): { counters: number; gauges: number; histograms: number; timers: number; alerts: number } {
    return {
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size,
      timers: this.timers.size,
      alerts: this.alerts.length,
    };
  }
}

// --- Utility Functions ---

/** Calculate the p-th percentile from a sorted array */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower]!;

  // Linear interpolation between adjacent values
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (idx - lower);
}
