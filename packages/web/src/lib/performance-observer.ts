/**
 * Performance Observer: Web Performance API wrapper for measuring Core Web Vitals,
 * custom metrics, resource timing, navigation timing, long tasks, and
 * performance entry collection with filtering and reporting.
 */

// --- Types ---

export type PerformanceEntryType =
  | "mark"
  | "measure"
  | "navigation"
  | "resource"
  | "paint"
  | "longtask"
  | "layout-shift"
  | "first-input"
  | "element";

export interface PerformanceObserverOptions {
  /** Entry types to observe (default: all supported) */
  entryTypes?: PerformanceEntryType[];
  /** Filter entries by name pattern */
  nameFilter?: string | RegExp;
  /** Only report entries exceeding duration threshold? */
  minDuration?: number;
  /** Buffer entries before callback? */
  bufferMs?: number;
  /** Callback on each new entry */
  onEntry?: (entry: NormalizedPerformanceEntry) => void;
  /** Callback when buffered batch is ready */
  onBatch?: (entries: NormalizedPerformanceEntry[]) => void;
  /** Auto-collect Core Web Vitals? */
  collectWebVitals?: boolean;
}

export interface NormalizedPerformanceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  /** For resource entries */
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  initiatorType?: string;
  /** For layout shift entries */
  value?: number;
  hadRecentInput?: boolean;
  /** For first input entries */
  processingStart?: number;
  processingEnd?: number;
  /** Navigation-specific */
  domContentLoadedEventEnd?: number;
  loadEventEnd?: number;
  /** Custom metadata */
  timestamp: number;
}

export interface CoreWebVitals {
  /** Largest Contentful Paint (ms) — should be < 2500 */
  lcp: number | null;
  /** First Input Delay / Interaction to Next Paint (ms) — should be < 200 */
  inp: number | null;
  /** Cumulative Layout Shift — should be < 0.1 */
  cls: number | null;
  /** First Contentful Paint (ms) */
  fcp: number | null;
  /** Time to First Byte (ms) */
  ttfb: number | null;
  /** Time to Interactive (ms) */
  tti: number | null;
}

export interface PerformanceObserverInstance {
  /** The raw browser PerformanceObserver */
  observer: PerformanceObserver | null;
  /** Get all collected entries */
  getEntries: () => NormalizedPerformanceEntry[];
  /** Get entries filtered by type */
  getEntriesByType: (type: string) => NormalizedPerformanceEntry[];
  /** Get entries filtered by name */
  getEntriesByName: (name: string) => NormalizedPerformanceEntry[];
  /** Get current Core Web Vitals snapshot */
  getWebVitals: () => CoreWebVitals;
  /** Create a custom performance mark */
  mark: (name: string) => void;
  /** Measure between two marks */
  measure: (name: string, startMark?: string, endMark?: string) => number | undefined;
  /** Clear specific marks/measures */
  clearMarks: (name?: string) => void;
  clearMeasures: (name?: string) => void;
  /** Get resource timing summary for a URL pattern */
  getResourceTiming: (urlPattern: RegExp) => ResourceTimingSummary | null;
  /** Disconnect observer */
  disconnect: () => void;
  /** Destroy completely */
  destroy: () => void;
}

export interface ResourceTimingSummary {
  url: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  dnsLookup: number;
  tcpConnect: number;
  tlsHandshake: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
}

// --- Helpers ---

function normalizeEntry(entry: PerformanceEntry): NormalizedPerformanceEntry {
  const base: NormalizedPerformanceEntry = {
    name: entry.name,
    entryType: entry.entryType,
    startTime: entry.startTime,
    duration: entry.duration,
    timestamp: Date.now(),
  };

  // Resource timing fields
  if ("transferSize" in entry && typeof (entry as PerformanceResourceTiming).transferSize === "number") {
    const r = entry as PerformanceResourceTiming;
    base.transferSize = r.transferSize;
    base.encodedBodySize = r.encodedBodySize;
    base.decodedBodySize = r.decodedBodySize;
    base.initiatorType = r.initiatorType;
  }

  // Layout shift fields
  if (entry.entryType === "layout-shift") {
    const ls = entry as { value: number; hadRecentInput: boolean };
    base.value = ls.value;
    base.hadRecentInput = ls.hadRecentInput;
  }

  // First input fields
  if (entry.entryType === "first-input") {
    const fi = entry as PerformanceEventTiming;
    base.processingStart = fi.processingStart;
    base.processingEnd = fi.processingEnd;
  }

  // Navigation timing fields
  if (entry.entryType === "navigation") {
    const nav = entry as PerformanceNavigationTiming;
    base.domContentLoadedEventEnd = nav.domContentLoadedEventEnd;
    base.loadEventEnd = nav.loadEventEnd;
  }

  return base;
}

function matchesFilter(entry: NormalizedPerformanceEntry, filter: string | RegExp | undefined): boolean {
  if (!filter) return true;
  if (typeof filter === "string") return entry.name.includes(filter);
  return filter.test(entry.name);
}

const SUPPORTED_ENTRY_TYPES: PerformanceEntryType[] = [
  "mark", "measure", "navigation", "resource",
  "paint", "longtask", "layout-shift", "first-input", "element",
];

function getSupportedTypes(requested?: PerformanceEntryType[]): PerformanceEntryType[] {
  if (!requested || requested.length === 0) return SUPPORTED_ENTRY_TYPES;

  const supported = typeof PerformanceObserver !== "undefined" &&
    PerformanceObserver.supportedEntryTypes
      ? PerformanceObserver.supportedEntryTypes as string[]
      : [];

  return requested.filter((t) => supported.includes(t));
}

// --- Main Class ---

export class PerformanceWatcher {
  create(options: PerformanceObserverOptions = {}): PerformanceObserverInstance {
    let destroyed = false;
    const entries: NormalizedPerformanceEntry[] = [];
    let buffer: NormalizedPerformanceEntry[] = [];
    let bufferTimer: ReturnType<typeof setTimeout> | null = null;

    // Web vitals state
    const vitals: CoreWebVitals = {
      lcp: null,
      inp: null,
      cls: null,
      fcp: null,
      ttfb: null,
      tti: null,
    };

    const entryTypes = getSupportedTypes(options.entryTypes);

    // Build observer callback
    const handleEntry = (list: PerformanceObserverEntryList) => {
      if (destroyed) return;

      const rawEntries = list.getEntries();
      for (const raw of rawEntries) {
        const normalized = normalizeEntry(raw);

        // Name filter
        if (!matchesFilter(normalized, options.nameFilter)) continue;

        // Duration filter
        if (options.minDuration != null && normalized.duration < options.minDuration) continue;

        entries.push(normalized);

        // Collect web vitals
        if (options.collectWebVitals !== false) {
          collectVital(normalized, vitals);
        }

        // Individual callback
        options.onEntry?.(normalized);
      }

      // Buffering
      if (options.bufferMs && options.bufferMs > 0) {
        buffer.push(...rawEntries.map(normalizeEntry));
        if (!bufferTimer) {
          bufferTimer = setTimeout(() => {
            flushBuffer();
          }, options.bufferMs);
        }
        return;
      }

      // Batch callback (no buffering)
      if (rawEntries.length > 0) {
        options.onBatch?.(rawEntries.map(normalizeEntry));
      }
    };

    function flushBuffer(): void {
      if (buffer.length > 0) {
        options.onBatch?.([...buffer]);
        buffer = [];
      }
      bufferTimer = null;
    }

    // Create observer (may fail for unsupported types)
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver(handleEntry);
      observer.observe({ type: "measure", buffered: true });
      observer.observe({ type: "resource", buffered: true });

      // Observe paint events
      if (entryTypes.includes("paint")) {
        try { observer.observe({ type: "paint", buffered: true }); } catch { /* not supported */ }
      }

      // Long tasks
      if (entryTypes.includes("longtask")) {
        try { observer.observe({ type: "longtask", buffered: true }); } catch { /* not supported */ }
      }

      // Layout shift (CLS)
      if (entryTypes.includes("layout-shift")) {
        try { observer.observe({ type: "layout-shift", buffered: true }); } catch { /* not supported */ }
      }

      // First input (INP)
      if (entryTypes.includes("first-input")) {
        try { observer.observe({ type: "first-input", buffered: true }); } catch { /* not supported */ }
      }
    } catch {
      // PerformanceObserver not available
    }

    const instance: PerformanceObserverInstance = {
      observer,

      getEntries() {
        return [...entries];
      },

      getEntriesByType(type: string) {
        return entries.filter((e) => e.entryType === type);
      },

      getEntriesByName(name: string) {
        return entries.filter((e) => e.name === name);
      },

      getWebVitals() {
        return { ...vitals };
      },

      mark(name: string): void {
        try {
          performance.mark(name);
        } catch { /* ignore */ }
      },

      measure(name: string, startMark?: string, endMark?: string): number | undefined {
        try {
          performance.measure(name, startMark, endMark);
          const measures = performance.getEntriesByName(name, "measure");
          return measures[measures.length - 1]?.duration;
        } catch {
          return undefined;
        }
      },

      clearMarks(name?: string): void {
        try { performance.clearMarks(name); } catch { /* ignore */ }
      },

      clearMeasures(name?: string): void {
        try { performance.clearMeasures(name); } catch { /* ignore */ }
      },

      getResourceTiming(urlPattern: RegExp): ResourceTimingSummary | null {
        const match = entries.find(
          (e) => e.entryType === "resource" && urlPattern.test(e.name),
        );
        if (!match || !match.transferSize) return null;

        const raw = performance.getEntriesByName(match.name, "resource")[0] as PerformanceResourceTiming | undefined;
        if (!raw) return null;

        return {
          url: raw.name,
          initiatorType: raw.initiatorType ?? "unknown",
          duration: raw.duration,
          transferSize: raw.transferSize,
          dnsLookup: raw.domainLookupEnd - raw.domainLookupStart,
          tcpConnect: raw.connectEnd - raw.connectStart,
          tlsHandshake: raw.secureConnectionStart > 0
            ? raw.connectEnd - raw.secureConnectionStart
            : 0,
          requestStart: raw.requestStart,
          responseStart: raw.responseStart,
          responseEnd: raw.responseEnd,
        };
      },

      disconnect() {
        observer?.disconnect();
        if (bufferTimer) { clearTimeout(bufferTimer); bufferTimer = null; }
        buffer = [];
      },

      destroy() {
        if (destroyed) return;
        destroyed = true;
        instance.disconnect();
        entries.length = 0;
      },
    };

    return instance;
  }
}

/** Convenience: create a performance observer */
export function createPerformanceObserver(options?: PerformanceObserverOptions): PerformanceObserverInstance {
  return new PerformanceWatcher().create(options);
}

// --- Core Web Vitals Collection Helpers ---

function collectVital(entry: NormalizedPerformanceEntry, vitals: CoreWebVitals): void {
  switch (entry.entryType) {
    case "largest-contentful-paint":
      // LCP: take the largest value seen so far
      if (vitals.lcp == null || entry.startTime > vitals.lcp) {
        vitals.lcp = Math.round(entry.startTime);
      }
      break;

    case "first-input":
      // INP: track interaction delay
      const inpDelay = (entry.processingStart ?? 0) - entry.startTime;
      if (vitals.inp == null || inpDelay > vitals.inp) {
        vitals.inp = Math.round(inpDelay);
      }
      break;

    case "layout-shift":
      // CLS: accumulate only shifts without recent user input
      if (!(entry.hadRecentInput ?? false)) {
        vitals.cls = ((vitals.cls ?? 0) + (entry.value ?? 0));
        // Round to avoid floating point noise
        vitals.cls = Math.round(vitals.cls * 1000) / 1000;
      }
      break;

    case "paint":
      if (entry.name === "first-contentful-paint" && vitals.fcp == null) {
        vitals.fcp = Math.round(entry.startTime);
      }
      break;

    case "navigation":
      // TTFB from navigation timing
      if (vitals.ttfb == null) {
        vitals.ttfb = Math.round(entry.responseStart ?? 0);
      }
      break;
  }
}

// --- Convenience functions ---

/**
 * Measure a function's execution time using performance marks.
 * Returns the duration in milliseconds.
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const startMark = `${label}-start`;
  const endMark = `${label}-end`;

  performance.mark(startMark);
  const result = await fn();
  performance.mark(endMark);

  const measureName = `${label}-measure`;
  performance.measure(measureName, startMark, endMark);

  const duration = performance.getEntriesByName(measureName, "measure")[0]?.duration ?? 0;
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);

  return { result, duration };
}

/**
 * Synchronous version of measureAsync.
 */
export function measureSync<T>(
  label: string,
  fn: () => T,
): { result: T; duration: number } {
  const startMark = `${label}-start`;
  const endMark = `${label}-end`;

  performance.mark(startMark);
  const result = fn();
  performance.mark(endMark);

  const measureName = `${label}-measure`;
  performance.measure(measureName, startMark, endMark);

  const duration = performance.getEntriesByName(measureName, "measure")[0]?.duration ?? 0;
  performance.clearMarks(startMark);
  performance.clearMarks(endMark);
  performance.clearMeasures(measureName);

  return { result, duration };
}

/**
 * Report Core Web Vitals to a callback. Observes LCP, INP, CLS, FCP, TTFB.
 * Returns a cleanup function.
 */
export function reportWebVitals(
  onMetric: (metric: { name: string; value: number; rating: "good" | "needs-improvement" | "poor" }) => void,
): () => void {
  const obs = createPerformanceObserver({
    collectWebVitals: true,
    onEntry(entry) {
      let metricName: string | undefined;
      let value: number | undefined;
      let rating: "good" | "needs-improvement" | "poor" = "good";

      switch (entry.entryType) {
        case "largest-contentful-paint":
          metricName = "LCP";
          value = Math.round(entry.startTime);
          rating = value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
          break;
        case "first-input":
          metricName = "INP";
          value = Math.round((entry.processingStart ?? 0) - entry.startTime);
          rating = value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
          break;
        case "layout-shift":
          if (!(entry.hadRecentInput ?? false)) {
            metricName = "CLS";
            value = parseFloat((entry.value ?? 0).toFixed(3));
            rating = value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
          }
          break;
        case "paint":
          if (entry.name === "first-contentful-paint") {
            metricName = "FCP";
            value = Math.round(entry.startTime);
            rating = value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
          }
          break;
      }

      if (metricName != null && value != null) {
        onMetric({ name: metricName, value, rating });
      }
    },
  });

  return () => obs.destroy();
}

/**
 * Get a quick snapshot of current page load performance.
 * Works without needing an active observer.
 */
export function getPageLoadMetrics(): Partial<CoreWebVitals> & {
  domReady: number | null;
  loadComplete: number | null;
} {
  const result: Partial<CoreWebVitals> & { domReady: number | null; loadComplete: number | null } = {
    lcp: null, inp: null, cls: null, fcp: null, ttfb: null, tti: null,
    domReady: null, loadComplete: null,
  };

  try {
    // Navigation timing
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      result.ttfb = Math.round(nav.responseStart);
      result.domReady = Math.round(nav.domContentLoadedEventEnd);
      result.loadComplete = Math.round(nav.loadEventEnd);
    }

    // Paint timing
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((p) => p.name === "first-contentful-paint");
    if (fcp) result.fcp = Math.round(fcp.startTime);

    // LCP
    const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
    if (lcpEntries.length > 0) {
      const lastLcp = lcpEntries[lcpEntries.length - 1];
      result.lcp = Math.round(lastLcp.startTime);
    }

    // CLS
    const lsEntries = performance.getEntriesByType("layout-shift");
    let clsSum = 0;
    for (const ls of lsEntries) {
      const shifted = ls as unknown as { value: number; hadRecentInput: boolean };
      if (!shifted.hadRecentInput) clsSum += shifted.value;
    }
    if (lsEntries.length > 0) result.cls = Math.round(clsSum * 1000) / 1000;
  } catch {
    // Performance API not available
  }

  return result;
}
