/**
 * Analytics / Event Tracking: Lightweight client-side analytics with event tracking,
 * page view tracking, session management, performance metrics, custom properties,
 * batched sending with retry, and privacy controls.
 */

// --- Types ---

export interface AnalyticsEvent {
  /** Event name */
  name: string;
  /** Event timestamp (ISO string) */
  timestamp: string;
  /** Custom properties */
  properties?: Record<string, unknown>;
  /** Session ID */
  sessionId: string;
  /** User ID (optional) */
  userId?: string;
}

export interface PageView {
  url: string;
  title: string;
  referrer?: string;
  timestamp: string;
  sessionId: string;
  userId?: string;
  durationMs?: number;
}

export interface PerformanceMetric {
  name: string;
  value: number; // ms
  rating: "good" | "needs-improvement" | "poor";
  timestamp: string;
}

export interface AnalyticsConfig {
  /** Endpoint URL for sending events (null = local-only) */
  endpoint?: string | null;
  /** App identifier */
  appId?: string;
  /** User ID */
  userId?: string;
  /** Enable automatic page view tracking? */
  trackPageViews?: boolean;
  /** Enable PerformanceObserver for Core Web Vitals? */
  trackPerformance?: boolean;
  /** Batch size before auto-send (default: 10) */
  batchSize?: number;
  /** Flush interval in ms (default: 5000) */
  flushInterval?: number;
  /** Max retries on send failure (default: 3) */
  maxRetries?: number;
  /** Retry backoff base (ms, default: 1000) */
  retryBackoff?: number;
  /** Enable debug logging? */
  debug?: boolean;
  /** Custom properties attached to every event */
  globalProperties?: Record<string, unknown>;
  /** Callback when events are sent */
  onSend?: (events: AnalyticsEvent[]) => void;
  /** Callback on send error */
  onError?: (error: Error) => void;
  /** Max events kept in memory (default: 1000) */
  maxBufferSize?: number;
  /** Respect Do Not Track header? */
  respectDNT?: boolean;
  /** Sample rate (0-1, default: 1 = track all) */
  sampleRate?: number;
}

export interface AnalyticsState {
  sessionId: string;
  eventCount: number;
  pageViewCount: number;
  isOnline: boolean;
  lastFlush: string;
  pendingEvents: number;
}

// --- Session Management ---

function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// --- Main Class ---

export class AnalyticsManager {
  private config: Required<AnalyticsConfig> & AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private pageViews: PageView[] = [];
  private metrics: PerformanceMetric[] = [];
  private sessionId: string;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      endpoint: config.endpoint ?? null,
      appId: config.appId ?? "ui-as-code",
      userId: config.userId ?? undefined,
      trackPageViews: config.trackPageViews ?? false,
      trackPerformance: config.trackPerformance ?? true,
      batchSize: config.batchSize ?? 10,
      flushInterval: config.flushInterval ?? 5000,
      maxRetries: config.maxRetries ?? 3,
      retryBackoff: config.retryBackoff ?? 1000,
      debug: config.debug ?? false,
      globalProperties: config.globalProperties ?? {},
      maxBufferSize: config.maxBufferSize ?? 1000,
      respectDNT: config.respectDNT ?? true,
      sampleRate: config.sampleRate ?? 1,
      ...config,
    };

    this.sessionId = generateSessionId();

    // Auto-flush timer
    if (this.config.endpoint) {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
    }

    // Auto page views
    if (this.config.trackPageViews && typeof window !== "undefined") {
      this.trackInitialPageView();
      // Listen for SPA navigation
      const origPushState = history.pushState;
      history.pushState = (...args: any[]) => {
        origPushState.apply(history, args);
        this.trackPageView();
      };
      window.addEventListener("popstate", () => this.trackPageView());
    }

    // Performance tracking
    if (this.config.trackPerformance && typeof window !== "undefined") {
      this.setupPerformanceTracking();
    }

    // Visibility change (for session end)
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this.flush();
      });
    }

    // Before unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => { this.flush(); });
    }
  }

  // --- Event Tracking ---

  /** Track a custom event */
  track(name: string, properties?: Record<string, unknown>): void {
    if (!this.shouldTrack()) return;

    const event: AnalyticsEvent = {
      id: generateEventId(),
      name,
      timestamp: new Date().toISOString(),
      properties: { ...this.config.globalProperties, ...properties },
      sessionId: this.sessionId,
      userId: this.config.userId,
    };

    this.events.push(event);
    this.trimBuffer();

    if (this.config.debug) {
      console.log(`[Analytics] Track: ${name}`, properties);
    }

    if (this.events.length >= this.config.batchSize && this.config.endpoint) {
      this.flush();
    }
  }

  /** Track a page view */
  trackPageView(): void {
    if (!this.shouldTrack()) return;

    const pv: PageView = {
      url: location.href,
      title: document.title,
      referrer: document.referrer || undefined,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.config.userId,
    };

    this.pageViews.push(pv);

    // Also emit as an event
    this.track("page_view", {
      url: pv.url,
      title: pv.title,
      referrer: pv.referrer,
    });
  }

  private trackInitialPageView(): void {
    if (document.readyState === "complete") {
      this.trackPageView();
    } else {
      window.addEventListener("load", () => this.trackPageView(), { once: true });
    }
  }

  // --- Timing Helpers ---

  /** Start timing an operation, returns a function to call when done */
  startTimer(label: string): () => number {
    const start = performance.now();
    return (): number => {
      const duration = Math.round(performance.now() - start);
      this.trackTiming(label, duration);
      return duration;
    };
  }

  /** Record a timing measurement */
  trackTiming(name: string, durationMs: number, properties?: Record<string, unknown>): void {
    this.track(name, { duration_ms: durationMs, ...properties });

    // Also store as metric
    const rating = this.ratePerformance(durationMs, name);
    this.metrics.push({
      name,
      value: durationMs,
      rating,
      timestamp: new Date().toISOString(),
    });
  }

  /** Time an async function automatically */
  async timeAsync<T>(label: fn: () => Promise<T>): Promise<T> {
    const done = this.startTimer(label);
    try {
      return await fn();
    } finally {
      done();
    }
  }

  // --- State Access ---

  getState(): AnalyticsState {
    return {
      sessionId: this.sessionId,
      eventCount: this.events.length,
      pageViewCount: this.pageViews.length,
      isOnline: navigator.onLine,
      lastFlush: new Date().toISOString(),
      pendingEvents: this.events.length,
    };
  }

  getEvents(): AnalyticsEvent[] { return [...this.events]; }

  getPageViews(): PageView[] { return [...this.pageViews]; }

  getMetrics(): PerformanceMetric[] { return [...this.metrics]; }

  getSessionId(): string { return this.sessionId; }

  setUserId(userId: string): void {
    this.config.userId = userId;
  }

  /** Set a global property that will be included in all future events */
  setGlobalProperty(key: string, value: unknown): void {
    this.config.globalProperties[key] = value;
  }

  // --- Data Management ---

  /** Clear all stored events */
  clearEvents(): void {
    this.events = [];
    this.pageViews = [];
    this.metrics = [];
  }

  /** Export all data as JSON */
  exportData(): string {
    return JSON.stringify({
      events: this.events,
      pageViews: this.pageViews,
      metrics: this.metrics,
      state: this.getState(),
      config: { appId: this.config.appId },
    }, null, 2);
  }

  // --- Sending ---

  /** Force flush all pending events to endpoint */
  async flush(): Promise<void> {
    if (!this.config.endpoint || this.events.length === 0 || this.destroyed) return;

    const batch = this.events.splice(0, this.events.length);
    let retries = 0;

    while (retries < this.config.maxRetries) {
      try {
        await this.sendBatch(batch);
        this.config.onSend?.(batch);
        if (this.config.debug) console.log(`[Analytics] Flushed ${batch.length} events`);
        return;
      } catch (err) {
        retries++;
        const delay = this.config.retryBackoff * Math.pow(2, retries - 1);
        if (this.config.debug) console.warn(`[Analytics] Flush failed (attempt ${retries}), retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    // All retries failed, put events back
    this.events.unshift(...batch);
    this.config.onError?.(new Error(`Failed to send after ${this.config.maxRetries} retries`));
  }

  private async sendBatch(batch: AnalyticsEvent[]): Promise<void> {
    const payload = {
      appId: this.config.appId,
      sentAt: new Date().toISOString(),
      events: batch,
    };

    const res = await fetch(this.config.endpoint!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  // --- Cleanup ---

  destroy(): void {
    this.destroyed = true;
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush(); // Final flush
  }

  // --- Private ---

  private shouldTrack(): boolean {
    if (this.destroyed) return false;
    if (Math.random() > this.config.sampleRate) return false;
    if (this.config.respectDNT && navigator.doNotTrack === "1") return false;
    return true;
  }

  private trimBuffer(): void {
    if (this.events.length > this.config.maxBufferSize) {
      this.events = this.events.slice(-this.config.maxBufferSize);
    }
  }

  private ratePerformance(durationMs: number, _name?: string): "good" | "needs-improvement" | "poor" {
    // Default thresholds: <200ms good, <1000ms needs-improvement, >1000ms poor
    if (durationMs < 200) return "good";
    if (durationMs < 1000) return "needs-improvement";
    return "poor";
  }

  private setupPerformanceTracking(): void {
    if (!("PerformanceObserver" in window)) return;

    try {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackTiming("LCP", Math.round(entry.startTime + entry.duration));
          }
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {}

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).processingStart) continue;
            const fid = entry.startTime - (entry as any).processingStart;
            this.trackTiming("FID", Math.round(fid));
          }
        });
        fidObserver.observe({ type: "first-input", buffered: true });
      } catch {}

      // Cumulative Layout Shift
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
          if (clsValue > 0) {
            this.trackTiming("CLS", Math.round(clsValue * 1000)); // Convert to micro-ish scale
          }
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });
      } catch {}
    } catch {
      // PerformanceObserver not fully supported
    }
  }
}

// --- Convenience Factory ---

let globalAnalytics: AnalyticsManager | null = null;

/** Get or create the global analytics instance */
export function getAnalytics(config?: AnalyticsConfig): AnalyticsManager {
  if (!globalAnalytics) {
    globalAnalytics = new AnalyticsManager(config);
  }
  return globalAnalytics;
}

/** Initialize and return analytics instance */
export function initAnalytics(config: AnalyticsConfig): AnalyticsManager {
  globalAnalytics = new AnalyticsManager(config);
  return globalAnalytics;
}
