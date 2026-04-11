/**
 * Event Tracker: High-level tracking layer with automatic event capture,
 * page view tracking, click/scroll/visibility events, UTM parameter
 * persistence, performance event tracking, form interaction tracking,
 * and outbound link tracking.
 */

// --- Types ---

export interface TrackerConfig {
  /** Analytics core instance (or will create one) */
  analytics?: ReturnType<typeof import("./analytics-core").createAnalytics>;
  /** Track initial page view on init? */
  trackInitialPageView?: boolean;
  /** Track clicks automatically? */
  autoTrackClicks?: boolean;
  /** Track form submissions? */
  autoTrackForms?: boolean;
  /** Track scroll depth? */
  autoTrackScrollDepth?: boolean;
  /** Scroll depth thresholds to report (default: [25, 50, 75, 90, 100]) */
  scrollThresholds?: number[];
  /** Track visibility changes? */
  autoTrackVisibility?: boolean;
  /** Track outbound links? */
  trackOutboundLinks?: boolean;
  /** Domains considered "same origin" for outbound detection */
  sameOriginDomains?: string[];
  /** Track performance metrics? */
  trackPerformance?: boolean;
  /** Performance metrics interval in ms (default: 10000) */
  performanceIntervalMs?: number;
  /** Track errors? */
  trackErrors?: boolean;
  /** Include error stack traces? */
  includeErrorStack?: true;
  /** Max error message length */
  maxErrorMessageLength?: number;
  /** Custom property enrichers */
  enrichers?: Array<(eventName: string, properties: Record<string, unknown>) => Record<string, unknown>>;
  /** Filter function (return false to drop event) */
  filter?: (eventName: string, properties: Record<string, unknown>) => boolean;
  /** Enable debug logging? */
  debug?: boolean;
}

export interface PageViewInfo {
  url: string;
  path: string;
  title: string;
  referrer: string;
  timestamp: number;
}

export interface ScrollDepthEvent {
  depth: number;
  maxDepth: number;
  timestamp: number;
  timeOnPageMs: number;
}

export interface ClickEvent {
  element: string; // CSS selector or tag
  text: string;    // Text content (truncated)
  href?: string;   // Link URL if applicable
  x: number;
  y: number;
  timestamp: number;
}

export interface FormInteractionEvent {
  formId: string;
  action: "start" | "submit" | "abandon" | "field_focus" | "field_change";
  fieldName?: string;
  fieldValue?: string;
  timeSpentMs?: number;
  timestamp: number;
}

export interface PerformanceSnapshot {
  /** Time to first byte */
  ttfb?: number;
  /** First contentful paint */
  fcp?: number;
  /** Largest contentful paint */
  lcp?: number;
  /** Cumulative layout shift */
  cls?: number;
  /** First input delay */
  fid?: number;
  /** Interaction to next paint */
  inp?: number;
  /** Total page load time */
  loadTime?: number;
  /** DOM content loaded */
  dcl?: number;
  /** Timestamp of snapshot */
  timestamp: number;
}

// --- Main Class ---

export class EventTracker {
  private config: Required<TrackerConfig>;
  private analytics: NonNullable<TrackerConfig["analytics"]>;
  private currentPage: PageViewInfo | null = null;
  private pageStartTime = 0;
  private maxScrollDepth = 0;
  private reportedScrollDepths = new Set<number>();
  private activeFormId: string | null = null;
  private formStartTime: number | null = null;
  private cleanupFns: Array<() => void> = [];
  private destroyed = false;

  constructor(config: TrackerConfig = {}) {
    this.config = {
      trackInitialPageView: config.trackInitialPageView ?? true,
      autoTrackClicks: config.autoTrackClicks ?? false,
      autoTrackForms: config.autoTrackForms ?? false,
      autoTrackScrollDepth: config.autoTrackScrollDepth ?? false,
      scrollThresholds: config.scrollThresholds ?? [25, 50, 75, 90, 100],
      autoTrackVisibility: config.autoTrackVisibility ?? false,
      trackOutboundLinks: config.trackOutboundLinks ?? false,
      sameOriginDomains: config.sameOriginDomains ?? [],
      trackPerformance: config.trackPerformance ?? false,
      performanceIntervalMs: config.performanceIntervalMs ?? 10000,
      trackErrors: config.trackErrors ?? false,
      includeErrorStack: config.includeErrorStack ?? true,
      maxErrorMessageLength: config.maxErrorMessageLength ?? 500,
      enrichers: config.enrichers ?? [],
      filter: config.filter,
      debug: config.debug ?? false,
      ...config,
    };

    // Create analytics instance if not provided
    this.analytics = config.analytics ?? (() => {
      const { createAnalytics } = require("./analytics-core") as typeof import("./analytics-core");
      return createAnalytics({ debug: config.debug });
    })();

    this.init();
  }

  // --- Initialization ---

  private init(): void {
    this.pageStartTime = Date.now();
    this.currentPage = this.capturePageView();

    if (this.config.trackInitialPageView) {
      this.trackPageView();
    }

    this.setupAutoTracking();
  }

  // --- Public API ---

  /** Track a custom event */
  track(eventName: string, properties?: Record<string, unknown>): void {
    if (this.destroyed) return;

    let enriched = { ...properties };

    // Apply enrichers
    for (const enricher of this.config.enrichers) {
      try {
        enriched = { ...enriched, ...enricher(eventName, enriched) };
      } catch {}
    }

    // Apply filter
    if (this.config.filter) {
      try {
        if (!this.config.filter(eventName, enriched)) return;
      } catch {}
    }

    this.analytics.track(eventName, enriched);
  }

  /** Track a page view */
  trackPageView(properties?: Record<string, unknown>): void {
    this.currentPage = this.capturePageView();
    this.pageStartTime = Date.now();
    this.maxScrollDepth = 0;
    this.reportedScrollDepths.clear();

    this.track("page_view", {
      ...this.currentPage,
      ...properties,
    });
  }

  /** Identify the user */
  identify(userId: string): void {
    this.analytics.identify(userId);
  }

  /** Manually report a click event */
  trackClick(element: HTMLElement, extra?: Record<string, unknown>): void {
    const clickInfo = this.extractClickInfo(element);

    this.track("element_click", {
      ...clickInfo,
      ...extra,
    });
  }

  /** Report current scroll depth manually */
  reportScrollDepth(): number {
    const depth = this.calculateScrollDepth();

    if (depth > this.maxScrollDepth) {
      this.maxScrollDepth = depth;

      for (const threshold of this.config.scrollThresholds) {
        if (depth >= threshold && !this.reportedScrollDepths.has(threshold)) {
          this.reportedScrollDepths.add(threshold);
          this.track("scroll_depth", {
            threshold,
            depth,
            max_depth: this.maxScrollDepth,
            time_on_page_ms: Date.now() - this.pageStartTime,
          });
        }
      }
    }

    return depth;
  }

  /** Get a performance snapshot */
  getPerformanceSnapshot(): PerformanceSnapshot {
    return this.capturePerformanceMetrics();
  }

  /** Get current page info */
  getCurrentPage(): PageViewInfo | null {
    return this.currentPage;
  }

  /** Get time spent on current page */
  getTimeOnPage(): number {
    return Date.now() - this.pageStartTime;
  }

  /** Destroy the tracker and remove all listeners */
  destroy(): void {
    this.destroyed = true;
    for (const fn of this.cleanupFns) {
      try { fn(); } catch {}
    }
    this.cleanupFns = [];
  }

  // --- Private: Auto Tracking Setup ---

  private setupAutoTracking(): void {
    if (typeof window === "undefined") return;

    if (this.config.autoTrackClicks) {
      this.setupClickTracking();
    }

    if (this.config.autoTrackForms) {
      this.setupFormTracking();
    }

    if (this.config.autoTrackScrollDepth) {
      this.setupScrollTracking();
    }

    if (this.config.autoTrackVisibility) {
      this.setupVisibilityTracking();
    }

    if (this.config.trackOutboundLinks) {
      this.setupOutboundLinkTracking();
    }

    if (this.config.trackPerformance) {
      this.setupPerformanceTracking();
    }

    if (this.config.trackErrors) {
      this.setupErrorTracking();
    }
  }

  private setupClickTracking(): void {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const clickInfo = this.extractClickInfo(target);

      // Determine event name
      let eventName = "click";
      if (target.tagName === "A") eventName = "link_click";
      else if (target.tagName === "BUTTON") eventName = "button_click";
      else if (target.closest("[data-track]")) eventName = `custom_click:${target.closest("[data-track]")?.getAttribute("data-track")}`;

      this.track(eventName, clickInfo);
    };

    document.addEventListener("click", handler, { passive: true });
    this.cleanupFns.push(() => document.removeEventListener("click", handler));
  }

  private setupFormTracking(): void {
    // Form focus = start
    document.addEventListener("focusin", (e) => {
      const form = (e.target as HTMLElement).closest("form");
      if (form && !this.activeFormId) {
        this.activeFormId = form.id || form.name || `form_${Date.now()}`;
        this.formStartTime = Date.now();

        this.track("form_start", {
          form_id: this.activeFormId,
          form_action: form.action,
          form_method: form.method,
        });
      }
    }, true);

    // Field changes
    document.addEventListener("change", (e) => {
      const field = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (!field || !field.form) return;

      this.track("form_field_change", {
        form_id: field.form.id || field.form.name || "",
        field_name: field.name || field.id || field.type,
        field_type: field.type,
        field_value: this.sanitizeFieldValue(field.value),
      });
    }, true);

    // Form submit
    document.addEventListener("submit", (e) => {
      const form = e.target as HTMLFormElement;
      const formId = form.id || form.name || "";
      const timeSpent = this.formStartTime ? Date.now() - this.formStartTime : 0;

      this.track("form_submit", {
        form_id: formId,
        form_action: form.action,
        form_method: form.method,
        time_spent_ms: timeSpent,
      });

      this.activeFormId = null;
      this.formStartTime = null;
    }, true);
  }

  private setupScrollTracking(): void {
    let ticking = false;

    const handler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.reportScrollDepth();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handler, { passive: true });
    this.cleanupFns.push(() => window.removeEventListener("scroll", handler));

    // Also report on unload
    window.addEventListener("beforeunload", () => {
      this.reportScrollDepth();
    });
  }

  private setupVisibilityTracking(): void {
    const handler = () => {
      this.track("visibility_change", {
        hidden: document.hidden,
        visibility_state: document.visibilityState,
        time_on_page_ms: Date.now() - this.pageStartTime,
      });
    };

    document.addEventListener("visibilitychange", handler);
    this.cleanupFns.push(() => document.removeEventListener("visibilitychange", handler));
  }

  private setupOutboundLinkTracking(): void {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target?.href) return;

      if (this.isOutboundLink(target.href)) {
        this.track("outbound_link_click", {
          url: target.href,
          text: target.textContent?.trim().slice(0, 200),
          target: target.target,
        });
      }
    };

    document.addEventListener("click", handler, { passive: true });
    this.cleanupFns.push(() => document.removeEventListener("click", handler));
  }

  private setupPerformanceTracking(): void {
    // Initial snapshot after load
    window.addEventListener("load", () => {
      setTimeout(() => {
        const perf = this.capturePerformanceMetrics();
        this.track("performance_initial", perf as unknown as Record<string, unknown>);
      }, 0);
    });

    // Periodic snapshots
    const interval = setInterval(() => {
      const perf = this.capturePerformanceMetrics();
      this.track("performance_snapshot", perf as unknown as Record<string, unknown>);
    }, this.config.performanceIntervalMs);

    this.cleanupFns.push(() => clearInterval(interval));
  }

  private setupErrorTracking(): void {
    const handler = (event: ErrorEvent) => {
      let message = event.message;
      if (message.length > this.config.maxErrorMessageLength) {
        message = message.slice(0, this.config.maxErrorMessageLength);
      }

      this.track("js_error", {
        message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: this.config.includeErrorStack ? (event.error?.stack ?? "").slice(0, 2000) : undefined,
        url: window.location.href,
      });
    };

    window.addEventListener("error", handler);
    this.cleanupFns.push(() => window.removeEventListener("error", handler));

    // Unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      this.track("unhandled_promise_rejection", {
        reason: String(event.reason)?.slice(0, 500),
        url: window.location.href,
      });
    };

    window.addEventListener("unhandledrejection", rejectionHandler);
    this.cleanupFns.push(() => window.removeEventListener("unhandledrejection", rejectionHandler));
  }

  // --- Private Helpers ---

  private capturePageView(): PageViewInfo {
    return {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer,
      timestamp: Date.now(),
    };
  }

  private extractClickInfo(element: HTMLElement): ClickEvent {
    const rect = element.getBoundingClientRect();

    return {
      element: this.getElementSelector(element),
      text: element.textContent?.trim().slice(0, 100) ?? "",
      href: element instanceof HTMLAnchorElement ? element.href : undefined,
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
      timestamp: Date.now(),
    };
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.getAttribute("data-track")) return `[data-track="${element.getAttribute("data-track")}"]`;
    return `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).split(" ").join(".")}` : ""}`;
  }

  private calculateScrollDepth(): number {
    if (!document.documentElement) return 0;

    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight,
      document.body.clientHeight,
      document.documentElement.clientHeight,
    );

    const winHeight = window.innerHeight;
    const scrollable = docHeight - winHeight;

    if (scrollable <= 0) return 100;

    return Math.round((scrollTop / scrollable) * 100);
  }

  private isOutboundLink(href: string): boolean {
    try {
      const url = new URL(href);
      const current = new URL(window.location.href);

      // Different protocol or hostname = outbound
      if (url.protocol !== current.protocol || url.hostname !== current.hostname) {
        return true;
      }

      // Check same-origin domain list
      if (this.config.sameOriginDomains.length > 0) {
        return !this.config.sameOriginDomains.some((d) =>
          url.hostname === d || url.hostname.endsWith(`.${d}`),
        );
      }

      return false;
    } catch {
      return true; // Invalid URLs treated as outbound
    }
  }

  private capturePerformanceMetrics(): PerformanceSnapshot {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;

    const paint = performance.getEntriesByType("paint");
    const fcpEntry = paint.find((p) => p.name === "first-contentful-paint");
    const lcpObserver = new PerformanceObserver((list) => {});
    // LCP requires observer — simplified here

    const layoutShift = performance.getEntriesByType("layout-shift");
    const clsValue = layoutShift.reduce((sum, entry) => sum + (entry as any).value, 0);

    return {
      ttfb: nav?.responseStart,
      fcp: fcpEntry?.startTime,
      cls: clsValue,
      loadTime: nav?.loadEventEnd ?? nav?.loadEventStart,
      dcl: nav?.domContentLoadedEventEnd,
      timestamp: Date.now(),
    };
  }

  private sanitizeFieldValue(value: string): string {
    // Truncate long values (like file paths)
    if (value.length > 200) return value.slice(0, 200) + "...";
    return value;
  }
}

/** Create a pre-configured event tracker */
export function createEventTracker(config?: TrackerConfig): EventTracker {
  return new EventTracker(config);
}
