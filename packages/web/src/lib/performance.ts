/**
 * Performance monitoring utilities.
 * Tracks Core Web Vitals and custom metrics.
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: string;
}

/** Core Web Vitals thresholds */
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 },   // First Input Delay (ms)
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint (ms)
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
} as const;

function getRating(name: string, value: number): PerformanceMetric["rating"] {
  const t = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
}

/**
 * Report a performance metric.
 * In production, this would send to an analytics service.
 */
export function reportMetric(name: string, value: number): void {
  const metric: PerformanceMetric = {
    name,
    value,
    rating: getRating(name, value),
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${value}ms (${metric.rating})`);
  }

  // Store in session for potential debugging
  try {
    const metrics = getSessionMetrics();
    metrics.push(metric);
    // Keep last 50 metrics
    if (metrics.length > 50) metrics.splice(0, metrics.length - 50);
    sessionStorage.setItem("uiac_metrics", JSON.stringify(metrics));
  } catch {
    // SessionStorage may not be available
  }
}

/**
 * Get stored metrics from this session.
 */
export function getSessionMetrics(): PerformanceMetric[] {
  try {
    const raw = sessionStorage.getItem("uiac_metrics");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Observe Core Web Vitals using the web-vitals library pattern.
 * Falls back to PerformanceObserver API.
 */
export function observeWebVitals(callback: (metric: PerformanceMetric) => void): () => void {
  const handlers: Array<() => void> = [];

  // LCP - use PerformanceObserver
  if ("PerformanceObserver" in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        if (lastEntry?.startTime) {
          callback({
            name: "LCP",
            value: Math.round(lastEntry.startTime),
            rating: getRating("LCP", lastEntry.startTime),
            timestamp: new Date().toISOString(),
          });
        }
      });
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      handlers.push(() => lcpObserver.disconnect());
    } catch {
      // Observer not supported for this type
    }

    // CLS
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        callback({
          name: "CLS",
          value: Math.round(clsValue * 1000) / 1000,
          rating: getRating("CLS", clsValue),
          timestamp: new Date().toISOString(),
        });
      });
      clsObserver.observe({ type: "layout-shift", buffered: true });
      handlers.push(() => clsObserver.disconnect());
    } catch {
      // Ignore
    }

    // FID / INP
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries()[0] as any;
        if (entry?.processingStart && entry?.startTime) {
          const fid = entry.processingStart - entry.startTime;
          callback({
            name: "FID",
            value: Math.round(fid),
            rating: getRating("FID", fid),
            timestamp: new Date().toISOString(),
          });
        }
      });
      fidObserver.observe({ type: "first-input", buffered: true });
      handlers.push(() => fidObserver.disconnect());
    } catch {
      // Ignore
    }
  }

  // TTFB from navigation timing
  try {
    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      if (nav.responseStart) {
        callback({
          name: "TTFB",
          value: Math.round(nav.responseStart - nav.requestStart || nav.responseStart),
          rating: getRating("TTFB", nav.responseStart),
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch {
    // Ignore
  }

  // Return cleanup function
  return () => handlers.forEach((h) => h());
}

/**
 * Measure render time of a component (for debugging).
 * Usage: const start = markRender("ComponentName"); ... endRender(start);
 */
export function markRender(label: string): () => void {
  const start = performance.now();
  return () => {
    const duration = Math.round(performance.now() - start);
    reportMetric(`render:${label}`, duration);
  };
}
