/**
 * Performance monitoring and metrics collection utilities.
 */

export interface MetricValue {
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface HistogramBucket {
  le: number; // less than or equal
  count: number;
}

/** Simple metrics collector */
export class MetricsCollector {
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, HistogramBucket[]>();

  /** Increment a counter */
  increment(name: string, value = 1, tags?: Record<string, string>): void {
    const key = this.key(name, tags);
    this.counters.set(key, (this.counters.get(key) ?? 0) + value);
  }

  /** Set a gauge value */
  gauge(name: string, value: number, tags?: Record<string, string>): void {
    const key = this.key(name, tags);
    this.gauges.set(key, value);
  }

  /** Record a value in a histogram */
  histogram(name: string, value: number, buckets?: number[], tags?: Record<string, string>): void {
    const key = this.key(name, tags);

    if (!this.histograms.has(key)) {
      // Default exponential buckets
      const bks = buckets ?? [1, 5, 10, 25, 50, 100, 250, 500, 1000];
      this.histograms.set(key, bks.map((le) => ({ le, count: 0 })));
    }

    const hist = this.histograms.get(key)!;

    for (const bucket of hist) {
      if (value <= bucket.le) {
        bucket.count++;
        break;
      }
    }
  }

  /** Time an operation and record duration as histogram */
  async time<T>(name: string, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const duration = performance.now() - start;
      this.histogram(name, duration, undefined, tags);
    }
  }

  /** Get all collected metrics */
  getMetrics(): {
    counters: Array<{ name: string; value: number; tags?: Record<string, string> }>;
    gauges: Array<{ name: string; value: number; tags?: Record<string, string> }>;
    histograms: Array<{ name: string; buckets: HistogramBucket[]; tags?: Record<string, string> }>;
  } {
    const counters: MetricsCollector["getMetrics"]["counters"] = [];
    const gauges: MetricsCollector["getMetrics"]["gauges"] = [];
    const histograms: MetricsCollector["getMetrics"]["histograms"] = [];

    for (const [key, value] of this.counters) {
      const { name, tags } = this.parseKey(key);
      counters.push({ name, value, tags });
    }

    for (const [key, value] of this.gauges) {
      const { name, tags } = this.parseKey(key);
      gauges.push({ name, value, tags });
    }

    for (const [key, buckets] of this.histograms) {
      const { name, tags } = this.parseKey(key);
      histograms.push({ name, buckets, tags });
    }

    return { counters, gauges, histograms };
  }

  /** Reset all metrics */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  /** Export in Prometheus text format */
  exportPrometheus(): string {
    const { counters, gauges, histograms } = this.getMetrics();
    const lines: string[] = [];

    for (const c of counters) {
      const tagStr = c.tags ? "{" + Object.entries(c.tags).map(([k, v]) => `${k}="${v}"`).join(",") + "}" : "";
      lines.push(`# HELP uiac_${c.name}_total Total counter for ${c.name}`);
      lines.push(`# TYPE uiac_${c.name}_total counter`);
      lines.push(`uiac_${c.name}_total${tagStr} ${c.value}`);
    }

    for (const g of gauges) {
      const tagStr = g.tags ? "{" + Object.entries(g.tags).map(([k, v]) => `${k}="${v}"`).join(",") + "}" : "";
      lines.push(`# HELP uiac_${g.name} Gauge for ${g.name}`);
      lines.push(`# TYPE uiac_${g.name} gauge`);
      lines.push(`uiac_${g.name}${tagStr} ${g.value}`);
    }

    for (const h of histograms) {
      const tagStr = h.tags ? "{" + Object.entries(h.tags).map(([k, v]) => `${k}="${v}"`).join(",") + "}" : "";
      let cumulative = 0;
      for (const bucket of h.buckets) {
        cumulative += bucket.count;
        lines.push(`uiac_${h.name}_bucket${tagStr}{le="${bucket.le}"} ${cumulative}`);
      }
      lines.push(`uiac_${g?.name ?? h.name}_sum${tagStr} ${cumulative}`); // Note: fix variable ref
      lines.push(`uiac_${h.name}_count${tagStr} ${cumulative}`);
      lines.push(`# HELP uiac_${h.name}_bucket Histogram bucket for ${h.name}`);
      lines.push(`# TYPE uiac_${h.name}_bucket histogram`);
    }

    return lines.join("\n");
  }

  private key(name: string, tags?: Record<string, string>): string {
    if (!tags) return name;
    const tagStr = Object.entries(tags)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}{${tagStr}}`;
  }

  private parseKey(key: string): { name: string; tags?: Record<string, string> } {
    const braceIdx = key.indexOf("{");

    if (braceIdx === -1) return { name: key };

    const name = key.slice(0, braceIdx);
    const tagStr = key.slice(braceIdx + 1, -1);
    const tags: Record<string, string> = {};

    for (const pair of tagStr.split(",")) {
      const [k, v] = pair.split("=");
      tags[k!] = v!;
    }

    return { name, tags };
  }
}

/** Performance observer wrapper */
export class PerformanceObserver {
  private entries: PerformanceEntry[] = [];

  /** Observe specific entry types */
  observe(entryTypes: string[], options?: PerformanceObserverInit): () => void {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) {
      return () => {};
    }

    const obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.entries.push(entry);
      }
    });

    obs.observe({ entryTypes, ...options });

    return () => obs.disconnect();
  }

  /** Get observed entries filtered by type */
  getEntries(type?: string): PerformanceEntry[] {
    if (!type) return [...this.entries];
    return this.entries.filter((e) => e.entryType === type);
  }

  /** Get statistics for a metric type */
  getStats(type: "navigation" | "paint" | "resource"): {
    min: number;
    max: number;
    avg: number;
    count: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
  } | null {
    const entries = this.getEntries(type);

    if (entries.length === 0) return null;

    const values = entries.map((e) =>
      "duration" in e ? (e as PerformanceEntryTiming).duration :
      "startTime" in e ? (e as PerformanceEntryTiming).startTime :
      0
    ).sort((a, b) => a - b);

    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;

    return {
      min: values[0],
      max: values[count - 1],
      avg,
      count,
      p50: percentile(values, 50),
      p90: percentile(values, 90),
      p95: percentile(values, 95),
      p99: percentile(values, 99),
    };
  }

  /** Clear stored entries */
  clear(): void {
    this.entries = [];
  }
}

function percentile(sortedValues: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, idx)]!;
}

/** Measure Web Vitals */
export function measureWebVitals(): Promise<{
  LCP: number | null;
  FID: number | null;
  CLS: number | null;
  FCP: number | null;
  TTFB: number | null;
}> {
  return new Promise((resolve) => {
    const vitals = { LCP: null, FID: null, CLS: null, FCP: null, TTFB: null };

    try {
      // TTFB
      const navEntries = performance.getEntriesByType("navigation")[0];
      if (navEntries) {
        vitals.TTFB = (navEntries as PerformanceNavigationTiming).responseStart -
          (navEntries as PerformanceNavigationTiming).requestStart;
      }

      // FCP
      const fcpEntries = performance.getEntriesByType("paint")[0];
      if (fcpEntries) {
        vitals.FCP = (fcpEntries as PerformancePaintTiming).startTime;
      }

      // LCP
      if ("PerformanceObserver" in window) {
        try {
          const lcpObs = new PerformanceObserver((list) => {
            const lastEntry = list.getEntries().pop();
            if (lastEntry) {
              vitals.LCP = lastEntry.startTime;
            }
          });

          lcpObs.observe({ type: "largest-contentful-paint", buffered: true });

          // FID
          const fidObs = new PerformanceObserver((list) => {
            const lastEntry = list.getEntries().pop();
            if (lastEntry && "processingStart" in lastEntry) {
              vitals.FID = (lastEntry as PerformanceEventTiming).processingStart -
                lastEntry.startTime;
            }
          });

          fidObs.observe({ type: "first-input", buffered: true });

          // CLS
          const clsObs = new PerformanceObserver((list) => {
            let clsValue = 0;
            for (const entry of list.getEntries()) {
              if (!(entry as LayoutShiftEntry).hadRecentInput) {
                clsValue += (entry as LayoutShiftEntry).value;
              }
            }
            vitals.CLS = clsValue;
          });

          clsObs.observe({ type: "layout-shift", buffered: true });
        } catch {
          // Some observers may not be supported
        }
      }
    } catch {
      // Silently fail on unsupported browsers
    }

    // Wait a bit for LCP to be recorded
    setTimeout(() => resolve(vitals), 3000);
  });
}

/** Create a simple performance mark and measure cycle */
export function perfMark(name: string): void {
  if (typeof performance !== "undefined") {
    performance.mark(`${name}-start`);
  }
}

export function perfMeasure(name: string): number | null {
  if (typeof performance !== "undefined") {
    performance.mark(`${name}-end`);

    try {
      performance.measure(name, `${name}-start`, `${name}-end`);
      const entries = performance.getEntriesByName(name);
      return entries[0]?.duration ?? null;
    } catch {
      return null;
    } finally {
      try {
        performance.clearMarks(`${name}-start`);
        performance.clearMarks(`${name}-end`);
        performance.clearMeasures(name);
      } catch { /* ignore */ }
    }
  }

  return null;
}
