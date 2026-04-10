/**
 * Comprehensive Analytics and Metrics Collection/Tracking Utilities.
 *
 * A pure TypeScript library for web application analytics covering:
 * - Event tracking with properties, session tracking, user identification
 * - Page view tracking (SPA route changes, referrer, duration)
 * - Performance metrics (Web Vitals: LCP, FID, INP, CLS, TTFB, FCP)
 * - Funnel analytics (step completion, drop-off, conversion rates)
 * - Cohort analysis (grouping by signup date/behavior, retention)
 * - Session management (start/end, duration, page views, return visitor)
 * - Error tracking (JS errors, API errors, grouping, rate limiting)
 * - User & super properties
 * - A/B test tracking (exposure, goal completion)
 * - Data export (JSON, endpoint send, batch + retry)
 * - Privacy controls (opt-out, PII hashing, Do Not Track)
 * - Dashboard data generators (mock data for charts)
 */

// ---------------------------------------------------------------------------
// 1. Core Types & Interfaces
// ---------------------------------------------------------------------------

/** Represents a single tracked event. */
export interface TrackedEvent {
  /** Unique event identifier */
  id: string;
  /** Event name (e.g., "button_click", "purchase") */
  name: string;
  /** Timestamp in milliseconds since epoch */
  timestamp: number;
  /** Arbitrary key-value properties attached to the event */
  properties: Record<string, unknown>;
  /** User ID at time of event (may be anonymous) */
  userId?: string;
  /** Session ID this event belongs to */
  sessionId: string;
  /** Page URL where the event occurred */
  url: string;
}

/** Represents a page view record. */
export interface PageView {
  id: string;
  url: string;
  referrer: string;
  title: string;
  timestamp: number;
  durationMs: number | null; // null until the view ends
  sessionId: string;
}

/** Web Vitals metric entry. */
export interface WebVitalEntry {
  name: "LCP" | "FID" | "INP" | "CLS" | "TTFB" | "FCP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  navigationType: string;
}

/** Resource timing summary for a loaded resource. */
export interface ResourceTimingSummary {
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
  startTime: number;
  responseStart: number;
  responseEnd: number;
}

/** Navigation timing summary. */
export interface NavigationTimingSummary {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  domInteractive: number;
  responseStart: number;
  redirectCount: number;
  navigationType: string;
}

/** A single step within a funnel definition. */
export interface FunnelStep {
  /** Step identifier */
  stepId: string;
  /** Human-readable step name */
  name: string;
  /** Optional condition function to determine if a user has completed this step */
  condition?: (events: TrackedEvent[]) => boolean;
  /** Event name that signals completion of this step */
  eventName: string;
}

/** A funnel definition consisting of ordered steps. */
export interface FunnelDefinition {
  funnelId: string;
  name: string;
  steps: FunnelStep[];
  createdAt: number;
}

/** Aggregated results for a single funnel step. */
export interface FunnelStepResult {
  stepId: string;
  name: string;
  totalUsers: number;
  completionRate: number; // percentage of users who entered the funnel and reached this step
  dropOffFromPrevious: number; // percentage of users lost from previous step
  avgTimeToComplete: number; // ms from funnel entry to this step
}

/** Complete funnel analysis result. */
export interface FunnelAnalysis {
  funnelId: string;
  funnelName: string;
  totalEntries: number;
  totalConversions: number;
  overallConversionRate: number;
  steps: FunnelStepResult[];
  analyzedAt: number;
}

/** A cohort group definition. */
export interface CohortGroup {
  groupId: string;
  name: string;
  type: "signup_date" | "behavior" | "property";
  /** For signup_date cohorts: date ranges; for behavior: event criteria; for property: property filter */
  criteria: Record<string, unknown>;
  memberIds: Set<string>;
}

/** Retention data point for a cohort over a period. */
export interface CohortRetentionPoint {
  period: number; // e.g., week 0, week 1, ...
  activeUsers: number;
  retentionRate: number;
}

/** Full cohort analysis result. */
export interface CohortAnalysis {
  groupId: string;
  groupName: string;
  totalMembers: number;
  retention: CohortRetentionPoint[];
  analyzedAt: number;
}

/** Active session information. */
export interface SessionInfo {
  sessionId: string;
  userId?: string;
  startedAt: number;
  lastActivityAt: number;
  pageViews: number;
  eventsCount: number;
  isReturnVisitor: boolean;
  referrer: string;
  landingPage: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

/** Captured error entry. */
export interface CapturedError {
  errorId: string;
  message: string;
  stack?: string;
  type: "js_error" | "api_error" | "promise_rejection";
  timestamp: number;
  url: string;
  userId?: string;
  sessionId: string;
  context?: Record<string, unknown>;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

/** An A/B test / experiment definition. */
export interface ExperimentDefinition {
  experimentId: string;
  name: string;
  variants: Array<{ variantId: string; name: string; weight: number }>;
  startDate: number;
  endDate?: number;
  status: "draft" | "running" | "paused" | "completed";
}

/** A recorded exposure to an experiment variant. */
export interface ExperimentExposure {
  experimentId: string;
  variantId: string;
  exposedAt: number;
  userId?: string;
  sessionId: string;
}

/** A goal completion for an experiment. */
export interface ExperimentGoal {
  experimentId: string;
  variantId: string;
  goalName: string;
  completedAt: number;
  userId?: string;
  value?: number;
}

/** Configuration options for the analytics engine. */
export interface AnalyticsConfig {
  /** Base URL for sending analytics data */
  endpointUrl?: string;
  /** Whether to automatically track page views on route change */
  autoTrackPageViews: boolean;
  /** Whether to collect Web Vitals automatically */
  autoCollectWebVitals: boolean;
  /** Maximum number of events to buffer before flushing */
  batchSize: number;
  /** Interval in ms for automatic batch flush */
  flushIntervalMs: number;
  /** Maximum retries for failed sends */
  maxRetries: number;
  /** Base delay in ms between retries (exponential backoff) */
  retryBaseDelayMs: number;
  /** Whether privacy mode is enabled (opt-out) */
  optOut: boolean;
  /** Whether to anonymize PII fields */
  anonymizePII: boolean;
  /** List of property keys that contain PII and should be hashed */
  piiFields: string[];
  /** Maximum errors per group per minute before rate-limiting */
  errorRateLimit: number;
  /** Session timeout in ms of inactivity */
  sessionTimeoutMs: number;
  /** Custom property extractor for super properties */
  superPropertyExtractor?: () => Record<string, unknown>;
  /** Debug mode: log all tracked events to console */
  debug: boolean;
}

/** Mock dashboard data for daily active users chart. */
export interface DailyActiveUsersData {
  date: string;
  dau: number;
  mau: number;
  newUsers: number;
  returningUsers: number;
}

/** Mock revenue data point. */
export interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

/** Top pages data point. */
export interface TopPageData {
  url: string;
  title: string;
  views: number;
  uniqueVisitors: number;
  avgDurationSec: number;
  bounceRate: number;
}

/** Generic batch send result. */
export interface BatchSendResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  retryableErrors: unknown[];
}

// ---------------------------------------------------------------------------
// 2. Constants & Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AnalyticsConfig = {
  endpointUrl: undefined,
  autoTrackPageViews: true,
  autoCollectWebVitals: true,
  batchSize: 20,
  flushIntervalMs: 10_000,
  maxRetries: 3,
  retryBaseDelayMs: 1000,
  optOut: false,
  anonymizePII: false,
  piiFields: ["email", "name", "username", "phone", "ip", "address"],
  errorRateLimit: 10,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  debug: false,
};

/** Web Vitals thresholds (based on Google's recommended values). */
const WEB_VITAL_THRESHOLDS: Record<string, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  FCP: { good: 1800, poor: 3000 },
};

// ---------------------------------------------------------------------------
// 3. Utility Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a unique ID (v4-like UUID).
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Simple hash function for anonymizing PII strings.
 * Uses a basic djb2-style hash and returns a hex representation.
 */
export function hashPII(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return ("00000000" + (hash >>> 0).toString(16)).slice(-8);
}

/**
 * Check if Do Not Track is enabled in the browser.
 */
export function isDoNotTrackEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    navigator.doNotTrack === "1" ||
    navigator.doNotTrack === "yes" ||
    (navigator as unknown as Record<string, string>)?.msDoNotTrack === "1"
  );
}

/**
 * Safely get current page URL.
 */
function getCurrentUrl(): string {
  try {
    return typeof location !== "undefined" ? location.href : "";
  } catch {
    return "";
  }
}

/**
 * Safely get document referrer.
 */
function getReferrer(): string {
  try {
    return typeof document !== "undefined" ? document.referrer : "";
  } catch {
    return "";
  }
}

/**
 * Parse UTM parameters from the current URL.
 */
export function parseUTMParams(): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    if (typeof URLSearchParams === "undefined" || typeof location === "undefined")
      return params;
    const searchParams = new URLSearchParams(location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      const val = searchParams.get(key);
      if (val) params[key] = val;
    }
  } catch {
    // ignore
  }
  return params;
}

/**
 * Rate limiter utility using token-bucket style logic.
 */
export class RateLimiter {
  private count = 0;
  private resetTime = 0;

  constructor(private limit: number, private windowMs: number = 60_000) {}

  /**
   * Check if an action is allowed under the rate limit.
   * Returns true if allowed, false if rate-limited.
   */
  allow(): boolean {
    const now = Date.now();
    if (now - this.resetTime >= this.windowMs) {
      this.count = 0;
      this.resetTime = now;
    }
    if (this.count >= this.limit) return false;
    this.count++;
    return true;
  }

  /** Reset the rate limiter. */
  reset(): void {
    this.count = 0;
    this.resetTime = 0;
  }

  /** Get remaining allowance. */
  remaining(): number {
    const now = Date.now();
    if (now - this.resetTime >= this.windowMs) return this.limit;
    return Math.max(0, this.limit - this.count);
  }
}

// ---------------------------------------------------------------------------
// 4. Event Tracking
// ---------------------------------------------------------------------------

/**
 * The main analytics engine. Orchestrates all tracking functionality.
 */
export class AnalyticsEngine {
  private config: AnalyticsConfig;
  private events: TrackedEvent[] = [];
  private pageViews: PageView[] = [];
  private webVitals: WebVitalEntry[] = [];
  private errors: CapturedError[] = [];
  private sessions: Map<string, SessionInfo> = new Map();
  private funnels: Map<string, FunnelDefinition> = new Map();
  private cohorts: Map<string, CohortGroup> = new Map();
  private experiments: Map<string, ExperimentDefinition> = new Map();
  private exposures: ExperimentExposure[] = [];
  private experimentGoals: ExperimentGoal[] = [];
  private currentSessionId: string = generateId();
  private currentUserId?: string;
  private userProperties: Record<string, unknown> = {};
  private currentPageViewId: string | null = null;
  private currentPageViewStartTime: number = 0;
  private errorRateLimiters: Map<string, RateLimiter> = new Map();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the analytics engine. Sets up session, starts timers,
   * attaches global listeners, and optionally begins collecting Web Vitals.
   */
  initialize(): void {
    if (this.isInitialized) return;

    this.startSession();

    // Auto-collect Web Vitals
    if (this.config.autoCollectWebVitals) {
      this.collectWebVitals();
    }

    // Auto-track initial page view
    if (this.config.autoTrackPageViews) {
      this.trackPageView();
    }

    // Global error listeners
    this.attachErrorListeners();

    // Start periodic flush
    if (this.config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);
    }

    // Handle page unload
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => this.handleUnload());
      // Handle visibility change for SPA duration tracking
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          this.finalizeCurrentPageView();
        } else if (document.visibilityState === "visible") {
          this.trackPageView();
        }
      });
    }

    this.isInitialized = true;
    if (this.config.debug) {
      console.log("[Analytics] Engine initialized", {
        sessionId: this.currentSessionId,
        config: this.config,
      });
    }
  }

  /**
   * Shut down the analytics engine cleanly.
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.finalizeCurrentPageView();
    this.endSession();
    this.isInitialized = false;
  }

  // ---- Event Tracking ----

  /**
   * Track a custom event with optional properties.
   * @param name - Event name (e.g., "button_click", "signup_complete")
   * @param properties - Arbitrary key-value pairs attached to the event
   * @returns The created event object
   */
  track(name: string, properties: Record<string, unknown> = {}): TrackedEvent {
    if (this.config.optOut || isDoNotTrackEnabled()) {
      return this.createStubEvent(name, properties);
    }

    const event: TrackedEvent = {
      id: generateId(),
      name,
      timestamp: Date.now(),
      properties: this.anonymizeProperties(properties),
      userId: this.currentUserId,
      sessionId: this.currentSessionId,
      url: getCurrentUrl(),
    };

    this.events.push(event);
    this.updateSessionActivity();

    if (this.config.debug) {
      console.log("[Analytics] Event tracked:", event);
    }

    // Auto-flush if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }

    return event;
  }

  /**
   * Identify the current user.
   * @param userId - Unique user identifier
   * @param traits - Optional user traits/properties to set
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    this.currentUserId = userId;
    if (traits) {
      Object.assign(this.userProperties, traits);
    }
    this.track("user_identify", { userId, ...traits });
    if (this.config.debug) {
      console.log("[Analytics] User identified:", userId);
    }
  }

  /**
   * Set a user-level property that persists across events.
   * @param key - Property key
   * @param value - Property value
   */
  setUserProperty(key: string, value: unknown): void {
    this.userProperties[key] = value;
  }

  /**
   * Set multiple user properties at once.
   * @param props - Key-value map of properties
   */
  setUserProperties(props: Record<string, unknown>): void {
    Object.assign(this.userProperties, props);
  }

  /**
   * Clear the current user identification.
   */
  clearUser(): void {
    this.currentUserId = undefined;
    this.userProperties = {};
    this.track("user_cleared");
  }

  // ---- Page View Tracking ----

  /**
   * Track a page view event.
   * @param url - Override the current URL (defaults to location.href)
   * @param title - Override page title (defaults to document.title)
   */
  trackPageView(url?: string, title?: string): void {
    this.finalizeCurrentPageView();

    const pageUrl = url ?? getCurrentUrl();
    const pageTitle =
      title ??
      (typeof document !== "undefined" ? document.title : "");

    const pageView: PageView = {
      id: generateId(),
      url: pageUrl,
      referrer: getReferrer(),
      title: pageTitle,
      timestamp: Date.now(),
      durationMs: null,
      sessionId: this.currentSessionId,
    };

    this.pageViews.push(pageView);
    this.currentPageViewId = pageView.id;
    this.currentPageViewStartTime = Date.now();
    this.updateSessionActivity();

    this.track("page_view", {
      url: pageUrl,
      title: pageTitle,
      referrer: pageView.referrer,
    });

    if (this.config.debug) {
      console.log("[Analytics] Page view tracked:", pageView);
    }
  }

  /**
   * Detect SPA route changes via History API or PopState.
   * Call this after initialization to enable automatic SPA route tracking.
   */
  setupSPARouteTracking(): void {
    if (typeof window === "undefined") return;

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      originalPushState.apply(history, args);
      this.trackPageView();
    };

    history.replaceState = (
      ...args: Parameters<typeof history.replaceState>
    ) => {
      originalReplaceState.apply(history, args);
      this.trackPageView();
    };

    window.addEventListener("popstate", () => {
      this.trackPageView();
    });
  }

  /**
   * Get all recorded page views.
   */
  getPageViews(): PageView[] {
    return [...this.pageViews];
  }

  // ---- Performance Metrics ----

  /**
   * Collect Web Vitals metrics (LCP, FID, INP, CLS, TTFB, FCP).
   * Uses the native Performance Observer API when available.
   */
  collectWebVitals(): void {
    if (typeof PerformanceObserver === "undefined") {
      if (this.config.debug) {
        console.warn("[Analytics] PerformanceObserver not available");
      }
      return;
    }

    const vitalTypes: Array<{
      type: string;
      name: WebVitalEntry["name"];
      mapper: (entry: PerformanceEntry) => number;
    }> = [
      { type: "largest-contentful-paint", name: "LCP", mapper: (e) => e.startTime },
      { type: "first-input", name: "FID", mapper: (e) => (e as PerformanceEventTiming).processingStart - e.startTime },
      { type: "interaction-to-next-paint", name: "INP", mapper: (e) => e.startTime }, // simplified
      { type: "layout-shift", name: "CLS", mapper: (e) => (e as unknown as { value?: number }).value ?? 0 },
      { type: "navigation", name: "TTFB", mapper: (e) => (e as PerformanceNavigationTiming).responseStart - e.startTime },
      { type: "paint", name: "FCP", mapper: (e) => e.startTime },
    ];

    for (const { type, name, mapper } of vitalTypes) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            const value = mapper(entry);
            const thresholds = WEB_VITAL_THRESHOLDS[name];
            let rating: WebVitalEntry["rating"] = "good";
            if (thresholds) {
              if (value <= thresholds.good) rating = "good";
              else if (value <= thresholds.poor) rating = "needs-improvement";
              else rating = "poor";
            }

            const navType = this.getNavigationType();

            const vital: WebVitalEntry = {
              name,
              value,
              rating,
              timestamp: Date.now(),
              navigationType: navType,
            };

            this.webVitals.push(vital);
            this.track(`web_vital_${name.toLowerCase()}`, {
              value,
              rating,
              navigationType: navType,
            });

            if (this.config.debug) {
              console.log(`[Analytics] Web Vital ${name}:`, vital);
            }
          }
        });

        // Use buffered flag for types that may have already fired
        observer.observe({ type, buffered: true });
      } catch {
        // Some vital types may not be supported in all browsers
      }
    }
  }

  /**
   * Get collected Web Vitals entries.
   */
  getWebVitals(): WebVitalEntry[] {
    return [...this.webVitals];
  }

  /**
   * Collect resource timing data for resources loaded during the page lifecycle.
   * @param filter - Optional filter function to select specific resources
   */
  collectResourceTimings(
    filter?: (entry: PerformanceResourceTiming) => boolean
  ): ResourceTimingSummary[] {
    const summaries: ResourceTimingSummary[] = [];
    try {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const filtered = filter ? entries.filter(filter) : entries;

      for (const entry of filtered.slice(-100)) { // limit to last 100
        summaries.push({
          name: entry.name,
          initiatorType: entry.initiatorType,
          duration: entry.duration,
          transferSize: entry.transferSize,
          startTime: entry.startTime,
          responseStart: entry.responseStart,
          responseEnd: entry.responseEnd,
        });
      }
    } catch {
      // Performance API may not be fully available
    }
    return summaries;
  }

  /**
   * Collect navigation timing data for the current page load.
   */
  collectNavigationTiming(): NavigationTimingSummary | null {
    try {
      const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (entries.length === 0) return null;

      const nav = entries[0];
      const paintEntries = performance.getEntriesByType("paint");

      const firstPaint = paintEntries.find((e) => e.name === "first-paint")?.startTime ?? 0;
      const fcp = paintEntries.find((e) => e.name === "first-contentful-paint")?.startTime ?? 0;

      return {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        loadComplete: nav.loadEventEnd - nav.startTime,
        firstPaint,
        firstContentfulPaint: fcp,
        domInteractive: nav.domInteractive - nav.startTime,
        responseStart: nav.responseStart - nav.startTime,
        redirectCount: performance.getEntriesByType("navigation").length > 0
          ? nav.redirectCount
          : 0,
        navigationType: this.getNavigationType(),
      };
    } catch {
      return null;
    }
  }

  // ---- Funnel Analytics ----

  /**
   * Define a new analytics funnel.
   * @param funnel - Funnel definition with ordered steps
   */
  defineFunnel(funnel: Omit<FunnelDefinition, "createdAt">): FunnelDefinition {
    const definition: FunnelDefinition = {
      ...funnel,
      createdAt: Date.now(),
    };
    this.funnels.set(funnel.funnelId, definition);

    if (this.config.debug) {
      console.log("[Analytics] Funnel defined:", definition);
    }

    return definition;
  }

  /**
   * Analyze a defined funnel against collected events.
   * @param funnelId - The funnel to analyze
   * @param timeRange - Optional time range filter (start, end timestamps)
   */
  analyzeFunnel(
    funnelId: string,
    timeRange?: { start: number; end: number }
  ): FunnelAnalysis | null {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return null;

    let relevantEvents = [...this.events];
    if (timeRange) {
      relevantEvents = relevantEvents.filter(
        (e) => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    // Group events by user
    const userEvents = new Map<string, TrackedEvent[]>();
    for (const event of relevantEvents) {
      const uid = event.userId ?? event.sessionId;
      if (!userEvents.has(uid)) userEvents.set(uid, []);
      userEvents.get(uid)!.push(event);
    }

    const totalEntries = userEvents.size;
    const steps: FunnelStepResult[] = [];
    let prevUsers = totalEntries;

    for (let i = 0; i < funnel.steps.length; i++) {
      const step = funnel.steps[i];
      let completedUsers = 0;
      let totalTime = 0;

      for (const [uid, events] of Array.from(userEvents.entries())) {
        const stepEvent = events.find(
          (e) =>
            e.name === step.eventName ||
            (step.condition?.(events) ?? false)
        );

        if (stepEvent) {
          completedUsers++;
          // Time from first event in funnel to this step
          const firstEvent = events[0];
          if (firstEvent) {
            totalTime += stepEvent.timestamp - firstEvent.timestamp;
          }
        }
      }

      const completionRate = totalEntries > 0 ? (completedUsers / totalEntries) * 100 : 0;
      const dropOff = prevUsers > 0 ? ((prevUsers - completedUsers) / prevUsers) * 100 : 0;
      const avgTime = completedUsers > 0 ? totalTime / completedUsers : 0;

      steps.push({
        stepId: step.stepId,
        name: step.name,
        totalUsers: completedUsers,
        completionRate: Math.round(completionRate * 100) / 100,
        dropOffFromPrevious: Math.round(dropOff * 100) / 100,
        avgTimeToComplete: Math.round(avgTime),
      });

      prevUsers = completedUsers;
    }

    const totalConversions =
      steps.length > 0 ? steps[steps.length - 1].totalUsers : 0;
    const overallConversionRate =
      totalEntries > 0 ? (totalConversions / totalEntries) * 100 : 0;

    return {
      funnelId: funnel.funnelId,
      funnelName: funnel.name,
      totalEntries,
      totalConversions,
      overallConversionRate: Math.round(overallConversionRate * 100) / 100,
      steps,
      analyzedAt: Date.now(),
    };
  }

  /**
   * Get all defined funnels.
   */
  getFunnels(): FunnelDefinition[] {
    return Array.from(this.funnels.values());
  }

  // ---- Cohort Analysis ----

  /**
   * Create a new cohort group.
   * @param cohort - Cohort group definition (without memberIds)
   */
  createCohort(
    cohort: Omit<CohortGroup, "memberIds">
  ): CohortGroup {
    const group: CohortGroup = {
      ...cohort,
      memberIds: new Set(),
    };
    this.cohorts.set(cohort.groupId, group);
    return group;
  }

  /**
   * Add a user to a cohort group.
   * @param groupId - Target cohort group
   * @param userId - User to add
   */
  addToCohort(groupId: string, userId: string): void {
    const cohort = this.cohorts.get(groupId);
    if (cohort) {
      cohort.memberIds.add(userId);
    }
  }

  /**
   * Analyze cohort retention over time periods.
   * @param groupId - Cohort to analyze
   * @param periods - Number of time periods to analyze (e.g., weeks)
   * @param periodMs - Duration of each period in milliseconds
   */
  analyzeCohortRetention(
    groupId: string,
    periods: number = 8,
    periodMs: number = 7 * 24 * 60 * 60 * 1000 // default weekly
  ): CohortAnalysis | null {
    const cohort = this.cohorts.get(groupId);
    if (!cohort) return null;

    const members = Array.from(cohort.memberIds);
    const totalMembers = members.length;
    if (totalMembers === 0) {
      return {
        groupId: cohort.groupId,
        groupName: cohort.name,
        totalMembers: 0,
        retention: [],
        analyzedAt: Date.now(),
      };
    }

    // Determine cohort start date based on type
    let cohortStart = Infinity;
    if (cohort.type === "signup_date") {
      // Use criteria as base date
      const startDate = cohort.criteria.startDate as number | undefined;
      if (startDate) cohortStart = startDate;
    }

    // Find first event for each cohort member to establish baseline
    const memberFirstEvent = new Map<string, number>();
    for (const event of this.events) {
      const uid = event.userId ?? event.sessionId;
      if (members.includes(uid) && !memberFirstEvent.has(uid)) {
        memberFirstEvent.set(uid, event.timestamp);
        if (event.timestamp < cohortStart) {
          cohortStart = event.timestamp;
        }
      }
    }

    if (cohortStart === Infinity) {
      cohortStart = Date.now();
    }

    const retention: CohortRetentionPoint[] = [];

    for (let p = 0; p < periods; p++) {
      const periodStart = cohortStart + p * periodMs;
      const periodEnd = periodStart + periodMs;

      let activeUsers = 0;
      for (const memberId of members) {
        const hasActivity = this.events.some(
          (e) => {
            const uid = e.userId ?? e.sessionId;
            return (
              uid === memberId &&
              e.timestamp >= periodStart &&
              e.timestamp < periodEnd
            );
          }
        );
        if (hasActivity) activeUsers++;
      }

      const retentionRate = totalMembers > 0 ? (activeUsers / totalMembers) * 100 : 0;

      retention.push({
        period: p,
        activeUsers,
        retentionRate: Math.round(retentionRate * 100) / 100,
      });
    }

    return {
      groupId: cohort.groupId,
      groupName: cohort.name,
      totalMembers,
      retention,
      analyzedAt: Date.now(),
    };
  }

  /**
   * Get all cohort groups.
   */
  getCohorts(): CohortGroup[] {
    return Array.from(this.cohorts.values());
  }

  // ---- Session Management ----

  /**
   * Start a new analytics session.
   */
  startSession(): SessionInfo {
    const utms = parseUTMParams();
    const isReturn = this.checkReturnVisitor();

    const session: SessionInfo = {
      sessionId: this.currentSessionId,
      userId: this.currentUserId,
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      pageViews: 0,
      eventsCount: 0,
      isReturnVisitor: isReturn,
      referrer: getReferrer(),
      landingPage: getCurrentUrl(),
      utmSource: utms.utm_source,
      utmMedium: utms.utm_medium,
      utmCampaign: utms.utm_campaign,
    };

    this.sessions.set(this.currentSessionId, session);

    // Persist session info
    this.persistSessionInfo(isReturn);

    this.track("session_start", {
      sessionId: this.currentSessionId,
      isReturnVisitor: isReturn,
      referrer: session.referrer,
      landingPage: session.landingPage,
      ...utms,
    });

    if (this.config.debug) {
      console.log("[Analytics] Session started:", session);
    }

    return session;
  }

  /**
   * End the current session.
   */
  endSession(): void {
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      const duration = Date.now() - session.startedAt;
      this.track("session_end", {
        sessionId: this.currentSessionId,
        durationMs: duration,
        pageViews: session.pageViews,
        eventsCount: session.eventsCount,
      });

      if (this.config.debug) {
        console.log("[Analytics] Session ended:", {
          sessionId: this.currentSessionId,
          durationMs: duration,
        });
      }
    }

    // Generate new session ID for next activity
    this.currentSessionId = generateId();
  }

  /**
   * Get the current active session.
   */
  getCurrentSession(): SessionInfo | undefined {
    return this.sessions.get(this.currentSessionId);
  }

  /**
   * Get all sessions.
   */
  getSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Check session timeout and renew if needed.
   */
  checkSessionTimeout(): boolean {
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return false;

    const inactive = Date.now() - session.lastActivityAt;
    if (inactive > this.config.sessionTimeoutMs) {
      this.endSession();
      this.startSession();
      return true; // session was renewed
    }
    return false;
  }

  // ---- Error Tracking ----

  /**
   * Attach global error listeners for uncaught JS errors and unhandled promise rejections.
   */
  attachErrorListeners(): void {
    if (typeof window === "undefined") return;

    window.addEventListener("error", (event) => {
      this.captureError({
        message: event.message,
        stack: event.error?.stack,
        type: "js_error",
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      this.captureError({
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
        type: "promise_rejection",
        context: { reason: String(reason).slice(0, 500) },
      });
    });
  }

  /**
   * Capture and record an error with grouping and rate limiting.
   * @param error - Error details to capture
   */
  captureError(error: {
    message: string;
    stack?: string;
    type: CapturedError["type"];
    context?: Record<string, unknown>;
  }): CapturedError {
    // Generate error group key from message + type
    const groupKey = `${error.type}:${error.message.slice(0, 100)}`;

    // Rate limiting per error group
    if (!this.errorRateLimiters.has(groupKey)) {
      this.errorRateLimiters.set(
        groupKey,
        new RateLimiter(this.config.errorRateLimit)
      );
    }
    const limiter = this.errorRateLimiters.get(groupKey)!;

    if (!limiter.allow()) {
      if (this.config.debug) {
        console.warn("[Analytics] Error rate limited:", groupKey);
      }
      // Return existing error entry if it exists
      const existing = this.errors.find((e) => e.message === error.message && e.type === error.type);
      if (existing) {
        existing.count++;
        existing.lastSeen = Date.now();
        return existing;
      }
    }

    const captured: CapturedError = {
      errorId: generateId(),
      message: error.message,
      stack: error.stack,
      type: error.type,
      timestamp: Date.now(),
      url: getCurrentUrl(),
      userId: this.currentUserId,
      sessionId: this.currentSessionId,
      context: error.context,
      count: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    };

    this.errors.push(captured);
    this.track("error_captured", {
      errorId: captured.errorId,
      type: error.type,
      message: error.message,
    });

    if (this.config.debug) {
      console.log("[Analytics] Error captured:", captured);
    }

    return captured;
  }

  /**
   * Track an API error.
   * @param url - Request URL
   * @param statusCode - HTTP status code
   * @param method - HTTP method
   * @param errorMessage - Error description
   */
  trackAPIError(
    url: string,
    statusCode: number,
    method: string,
    errorMessage: string
  ): CapturedError {
    return this.captureError({
      message: `API ${method} ${url} -> ${statusCode}: ${errorMessage}`,
      type: "api_error",
      context: { url, statusCode, method },
    });
  }

  /**
   * Get all captured errors.
   */
  getErrors(): CapturedError[] {
    return [...this.errors];
  }

  /**
   * Group errors by their message signature.
   */
  getErrorGroups(): Map<string, CapturedError[]> {
    const groups = new Map<string, CapturedError[]>();
    for (const err of this.errors) {
      const key = `${err.type}:${err.message.slice(0, 100)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(err);
    }
    return groups;
  }

  // ---- Super Properties ----

  /**
   * Automatically detect and collect device/browser/OS super properties.
   */
  getSuperProperties(): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    if (typeof navigator !== "undefined") {
      props.screenWidth = screen.width;
      props.screenHeight = screen.height;
      props.viewportWidth = window.innerWidth;
      props.viewportHeight = window.innerHeight;
      props.devicePixelRatio = window.devicePixelRatio ?? 1;
      props.language = navigator.language;
      props.languages = navigator.languages;
      props.platform = navigator.platform;
      props.userAgent = navigator.userAgent;
      props.cookieEnabled = navigator.cookieEnabled;
      props.onLine = navigator.onLine;

      // Basic browser detection
      const ua = navigator.userAgent;
      if (ua.includes("Chrome") && !ua.includes("Edg")) props.browser = "Chrome";
      else if (ua.includes("Firefox")) props.browser = "Firefox";
      else if (ua.includes("Safari") && !ua.includes("Chrome")) props.browser = "Safari";
      else if (ua.includes("Edg")) props.browser = "Edge";
      else props.browser = "Unknown";

      // Basic OS detection
      if (ua.includes("Windows")) props.os = "Windows";
      else if (ua.includes("Mac")) props.os = "macOS";
      else if (ua.includes("Linux")) props.os = "Linux";
      else if (ua.includes("Android")) props.os = "Android";
      else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad"))
        props.os = "iOS";
      else props.os = "Unknown";

      // Device type
      if (/Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua))
        props.deviceType = "mobile";
      else props.deviceType = "desktop";
    }

    if (typeof window !== "undefined") {
      // Detect dark mode preference
      props.darkMode =
        window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ??
        false;
    }

    // Apply custom extractor if provided
    if (this.config.superPropertyExtractor) {
      Object.assign(props, this.config.superPropertyExtractor());
    }

    return props;
  }

  /**
   * Get combined user properties and super properties.
   */
  getAllProperties(): Record<string, unknown> {
    return {
      ...this.getSuperProperties(),
      ...this.userProperties,
    };
  }

  // ---- A/B Test Tracking ----

  /**
   * Register an A/B test/experiment definition.
   */
  defineExperiment(experiment: Omit<ExperimentDefinition, "status">): ExperimentDefinition {
    const def: ExperimentDefinition = {
      ...experiment,
      status: "draft",
    };
    this.experiments.set(experiment.experimentId, def);
    return def;
  }

  /**
   * Activate an experiment (set status to running).
   */
  activateExperiment(experimentId: string): void {
    const exp = this.experiments.get(experimentId);
    if (exp) {
      exp.status = "running";
    }
  }

  /**
   * Record exposure to an experiment variant.
   * Selects a variant deterministically based on userId/sessionId.
   * @param experimentId - Experiment identifier
   * @returns The selected variant ID, or null if experiment not found/inactive
   */
  trackExperimentExposure(experimentId: string): string | null {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return null;

    const uid = this.currentUserId ?? this.currentSessionId;
    // Deterministic variant selection using hash of user+experiment
    const hash = this.simpleHash(`${uid}:${experimentId}`);
    const totalWeight = exp.variants.reduce((sum, v) => sum + v.weight, 0);
    let random = (hash % totalWeight) + totalWeight; // ensure positive
    random = ((random % totalWeight) + totalWeight) % totalWeight; // normalize

    let cumulative = 0;
    let selectedVariant = exp.variants[0];
    for (const variant of exp.variants) {
      cumulative += variant.weight;
      if (random < cumulative) {
        selectedVariant = variant;
        break;
      }
    }

    const exposure: ExperimentExposure = {
      experimentId,
      variantId: selectedVariant.variantId,
      exposedAt: Date.now(),
      userId: this.currentUserId,
      sessionId: this.currentSessionId,
    };

    this.exposures.push(exposure);
    this.track("experiment_exposure", {
      experimentId,
      experimentName: exp.name,
      variantId: selectedVariant.variantId,
      variantName: selectedVariant.name,
    });

    if (this.config.debug) {
      console.log("[Analytics] Experiment exposure:", exposure);
    }

    return selectedVariant.variantId;
  }

  /**
   * Track goal completion for an experiment.
   * @param experimentId - Experiment identifier
   * @param goalName - Name of the goal achieved
   * @param value - Optional numeric value for the goal
   */
  trackExperimentGoal(
    experimentId: string,
    goalName: string,
    value?: number
  ): void {
    // Find the most recent exposure for this experiment
    const exposure = [...this.exposures]
      .reverse()
      .find(
        (e) =>
          e.experimentId === experimentId &&
          (e.userId === this.currentUserId || e.sessionId === this.currentSessionId)
      );

    if (!exposure) {
      if (this.config.debug) {
        console.warn("[Analytics] No exposure found for experiment goal:", experimentId);
      }
      return;
    }

    const goal: ExperimentGoal = {
      experimentId,
      variantId: exposure.variantId,
      goalName,
      completedAt: Date.now(),
      userId: this.currentUserId,
      value,
    };

    this.experimentGoals.push(goal);
    this.track("experiment_goal", {
      experimentId,
      variantId: exposure.variantId,
      goalName,
      value,
    });

    if (this.config.debug) {
      console.log("[Analytics] Experiment goal:", goal);
    }
  }

  /**
   * Calculate experiment results (conversion rates by variant).
   * @param experimentId - Experiment to analyze
   * @param goalName - Goal to measure
   */
  getExperimentResults(
    experimentId: string,
    goalName: string
  ): Array<{
    variantId: string;
    variantName: string;
    exposures: number;
    conversions: number;
    conversionRate: number;
    avgValue: number;
  }> | null {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;

    const results = exp.variants.map((variant) => {
      const exposures = this.exposures.filter(
        (e) => e.experimentId === experimentId && e.variantId === variant.variantId
      );
      const conversions = this.experimentGoals.filter(
        (g) =>
          g.experimentId === experimentId &&
          g.variantId === variant.variantId &&
          g.goalName === goalName
      );

      const convRate =
        exposures.length > 0
          ? (conversions.length / exposures.length) * 100
          : 0;
      const avgValue =
        conversions.length > 0
          ? conversions.reduce((sum, g) => sum + (g.value ?? 0), 0) /
            conversions.length
          : 0;

      return {
        variantId: variant.variantId,
        variantName: variant.name,
        exposures: exposures.length,
        conversions: conversions.length,
        conversionRate: Math.round(convRate * 100) / 100,
        avgValue: Math.round(avgValue * 100) / 100,
      };
    });

    return results;
  }

  /**
   * Get all registered experiments.
   */
  getExperiments(): ExperimentDefinition[] {
    return Array.from(this.experiments.values());
  }

  // ---- Data Export ----

  /**
   * Export all collected analytics data as a structured object.
   */
  exportData(): {
    events: TrackedEvent[];
    pageViews: PageView[];
    webVitals: WebVitalEntry[];
    errors: CapturedError[];
    sessions: SessionInfo[];
    exportedAt: number;
    version: string;
  } {
    return {
      events: [...this.events],
      pageViews: [...this.pageViews],
      webVitals: [...this.webVitals],
      errors: [...this.errors],
      sessions: Array.from(this.sessions.values()),
      exportedAt: Date.now(),
      version: "1.0.0",
    };
  }

  /**
   * Export data as a JSON string.
   * @param pretty - Whether to pretty-print the JSON
   */
  exportJSON(pretty = false): string {
    const data = this.exportData();
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  /**
   * Send collected data to a configured endpoint.
   * @param endpoint - Override endpoint URL
   * @returns Send result with success/failure info
   */
  async sendData(endpoint?: string): Promise<BatchSendResult> {
    const url = endpoint ?? this.config.endpointUrl;
    if (!url) {
      return {
        success: false,
        sentCount: 0,
        failedCount: this.events.length,
        retryableErrors: ["No endpoint configured"],
      };
    }

    const data = this.exportData();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true, // ensure request completes even on page unload
      });

      if (response.ok) {
        // Clear sent data
        this.events = [];
        this.errors = this.errors.filter((e) => e.count > 1); // keep recurring errors
        return {
          success: true,
          sentCount: data.events.length,
          failedCount: 0,
          retryableErrors: [],
        };
      } else {
        return {
          success: false,
          sentCount: 0,
          failedCount: data.events.length,
          retryableErrors: [`HTTP ${response.status}`],
        };
      }
    } catch (err) {
      return {
        success: false,
        sentCount: 0,
        failedCount: data.events.length,
        retryableErrors: [err],
      };
    }
  }

  /**
   * Flush buffered events with automatic retry on failure.
   * Uses exponential backoff.
   */
  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const result = await this.sendData();
      if (result.success) return;

      lastError = result.retryableErrors[0];

      if (attempt < this.config.maxRetries) {
        const delay =
          this.config.retryBaseDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    if (this.config.debug) {
      console.error(
        "[Analytics] Failed to flush after retries:",
        lastError
      );
    }
  }

  /**
   * Download exported data as a JSON file (browser only).
   * @param filename - Name for the downloaded file
   */
  downloadJSON(filename = "analytics-export.json"): void {
    if (typeof document === "undefined") return;

    const json = this.exportJSON(true);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ---- Privacy Controls ----

  /**
   * Enable or disable opt-out mode.
   * When opted out, no events are tracked or sent.
   */
  setOptOut(optedOut: boolean): void {
    this.config.optOut = optedOut;
    if (this.config.debug) {
      console.log(`[Analytics] Opt-out ${optedOut ? "enabled" : "disabled"}`);
    }
  }

  /**
   * Check if currently opted out.
   */
  isOptedOut(): boolean {
    return this.config.optOut || isDoNotTrackEnabled();
  }

  /**
   * Enable or disable PII anonymization.
   */
  setAnonymizePII(enabled: boolean): void {
    this.config.anonymizePII = enabled;
  }

  /**
   * Configure which property keys should be treated as PII.
   */
  setPIIFields(fields: string[]): void {
    this.config.piiFields = fields;
  }

  /**
   * Clear all locally stored analytics data.
   */
  clearAllData(): void {
    this.events = [];
    this.pageViews = [];
    this.webVitals = [];
    this.errors = [];
    this.exposures = [];
    this.experimentGoals = [];

    // Clear persisted storage
    try {
      sessionStorage.removeItem("analytics_session_id");
      sessionStorage.removeItem("analytics_return_visitor");
      localStorage.removeItem("analytics_user_id");
    } catch {
      // Storage may not be available
    }

    if (this.config.debug) {
      console.log("[Analytics] All data cleared");
    }
  }

  // ---- Dashboard Data Generators ----

  /**
   * Generate mock daily active users data for charts.
   * @param days - Number of days to generate
   * @param baseDAU - Baseline daily active users
   * @param seed - Random seed for reproducibility
   */
  static generateDailyActiveUsersData(
    days: number = 30,
    baseDAU: number = 1000,
    seed: number = 42
  ): DailyActiveUsersData[] {
    const data: DailyActiveUsersData[] = [];
    let mau = baseDAU * 7; // rough MAU estimate
    const rng = seededRandom(seed);

    const now = Date.now();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 86400000);
      // Add weekday pattern (lower on weekends) and slight growth trend
      const dayOfWeek = date.getDay();
      const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.85 : 1.0;
      const growthFactor = 1 + (days - i) * 0.005; // 0.5% growth per day
      const noise = 0.9 + rng() * 0.2; // +/- 10% noise

      const dau = Math.round(baseDAU * weekendFactor * growthFactor * noise);
      const newUsers = Math.round(dau * (0.08 + rng() * 0.06));
      const returningUsers = dau - newUsers;
      mau = Math.round(mau * 0.95 + dau * 1.05); // smooth MAU

      data.push({
        date: date.toISOString().split("T")[0],
        dau,
        mau,
        newUsers,
        returningUsers,
      });
    }

    return data;
  }

  /**
   * Generate mock revenue data for charts.
   * @param days - Number of days to generate
   * @param dailyBaseRevenue - Baseline daily revenue
   * @param seed - Random seed
   */
  static generateRevenueData(
    days: number = 30,
    dailyBaseRevenue: number = 5000,
    seed: number = 123
  ): RevenueDataPoint[] {
    const data: RevenueDataPoint[] = [];
    const rng = seededRandom(seed);
    const now = Date.now();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now - i * 86400000);
      const noise = 0.8 + rng() * 0.4;
      const seasonalFactor =
        1 + Math.sin(((days - i) / days) * Math.PI * 2) * 0.15;
      const revenue = Math.round(dailyBaseRevenue * noise * seasonalFactor);
      const orders = Math.round(revenue / (40 + rng() * 60));
      const aov = orders > 0 ? Math.round((revenue / orders) * 100) / 100 : 0;

      data.push({
        date: date.toISOString().split("T")[0],
        revenue,
        orders,
        averageOrderValue: aov,
      });
    }

    return data;
  }

  /**
   * Generate mock top pages data.
   * @param count - Number of pages to generate
   * @param seed - Random seed
   */
  static generateTopPagesData(
    count: number = 10,
    seed: number = 77
  ): TopPageData[] {
    const data: TopPageData[] = [];
    const rng = seededRandom(seed);

    const pageTemplates = [
      { url: "/", title: "Home" },
      { url: "/products", title: "Products" },
      { url: "/pricing", title: "Pricing" },
      { url: "/about", title: "About Us" },
      { url: "/blog", title: "Blog" },
      { url: "/contact", title: "Contact" },
      { url: "/docs", title: "Documentation" },
      { url: "/signup", title: "Sign Up" },
      { url: "/login", title: "Login" },
      { url: "/dashboard", title: "Dashboard" },
      { url: "/settings", title: "Settings" },
      { url: "/help", title: "Help Center" },
      { url: "/features", title: "Features" },
      { url: "/integrations", title: "Integrations" },
      { url: "/changelog", title: "Changelog" },
    ];

    const selected = pageTemplates.slice(0, count);
    let maxViews = 50000;

    for (let i = 0; i < selected.length; i++) {
      const template = selected[i];
      const decay = Math.pow(0.75, i); // exponential decay by rank
      const views = Math.round(maxViews * decay * (0.8 + rng() * 0.4));
      const uniqueVisitors = Math.round(views * (0.5 + rng() * 0.3));
      const avgDuration = 30 + rng() * 300; // seconds
      const bounceRate = 0.2 + rng() * 0.5;

      data.push({
        url: template.url,
        title: template.title,
        views,
        uniqueVisitors,
        avgDurationSec: Math.round(avgDuration),
        bounceRate: Math.round(bounceRate * 1000) / 1000,
      });

      maxViews = views; // next page has fewer views
    }

    return data.sort((a, b) => b.views - a.views);
  }

  /**
   * Generate a complete mock analytics dashboard dataset.
   * @param days - Days of historical data
   */
  static generateDashboardDataset(days: number = 30): {
    dailyActiveUsers: DailyActiveUsersData[];
    revenue: RevenueDataPoint[];
    topPages: TopPageData[];
    summary: {
      totalUsers: number;
      totalRevenue: number;
      avgSessionDuration: number;
      bounceRate: number;
      conversionRate: number;
    };
  } {
    const dauData = AnalyticsEngine.generateDailyActiveUsersData(days);
    const revData = AnalyticsEngine.generateRevenueData(days);
    const topPages = AnalyticsEngine.generateTopPagesData();

    const totalUsers = dauData.reduce((s, d) => s + d.newUsers, 0);
    const totalRevenue = revData.reduce((s, d) => s + d.revenue, 0);
    const avgSessionDuration = 180 + Math.round(seededRandom(999)() * 240);
    const bounceRate = Math.round((35 + seededRandom(888)() * 20) * 10) / 10;
    const conversionRate = Math.round((2 + seededRandom(555)() * 4) * 10) / 10;

    return {
      dailyActiveUsers: dauData,
      revenue: revData,
      topPages,
      summary: {
        totalUsers,
        totalRevenue,
        avgSessionDuration,
        bounceRate,
        conversionRate,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private createStubEvent(
    name: string,
    properties: Record<string, unknown>
  ): TrackedEvent {
    return {
      id: generateId(),
      name,
      timestamp: Date.now(),
      properties,
      userId: this.currentUserId,
      sessionId: this.currentSessionId,
      url: getCurrentUrl(),
    };
  }

  private anonymizeProperties(
    props: Record<string, unknown>
  ): Record<string, unknown> {
    if (!this.config.anonymizePII) return props;

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (this.config.piiFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        result[key] = typeof value === "string" ? `hashed:${hashPII(value)}` : "[redacted]";
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private updateSessionActivity(): void {
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.lastActivityAt = Date.now();
      session.eventsCount = this.events.length;
    }
  }

  private finalizeCurrentPageView(): void {
    if (this.currentPageViewId) {
      const pv = this.pageViews.find((p) => p.id === this.currentPageViewId);
      if (pv) {
        pv.durationMs = Date.now() - this.currentPageViewStartTime;

        // Update session page view count
        const session = this.sessions.get(pv.sessionId);
        if (session) {
          session.pageViews++;
        }

        // Track page view duration
        this.track("page_view_duration", {
          pageViewId: pv.id,
          url: pv.url,
          durationMs: pv.durationMs,
        });
      }
      this.currentPageViewId = null;
    }
  }

  private handleUnload(): void {
    this.finalizeCurrentPageView();
    // Use sendBeacon for reliable delivery on unload
    if (this.config.endpointUrl && this.events.length > 0 && typeof navigator !== "undefined") {
      try {
        const data = this.exportData();
        navigator.sendBeacon(
          this.config.endpointUrl,
          JSON.stringify(data)
        );
      } catch {
        // Best-effort only
      }
    }
  }

  private checkReturnVisitor(): boolean {
    try {
      if (typeof localStorage === "undefined") return false;
      const visited = localStorage.getItem("analytics_visited_before");
      if (visited) {
        return true;
      }
      localStorage.setItem("analytics_visited_before", Date.now().toString());
      return false;
    } catch {
      return false;
    }
  }

  private persistSessionInfo(isReturn: boolean): void {
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("analytics_session_id", this.currentSessionId);
        sessionStorage.setItem(
          "analytics_session_start",
          Date.now().toString()
        );
      }
      if (typeof localStorage !== "undefined") {
        if (this.currentUserId) {
          localStorage.setItem("analytics_user_id", this.currentUserId);
        }
      }
    } catch {
      // Storage may not be available
    }
  }

  private getNavigationType(): string {
    try {
      const entries = performance.getEntriesByType(
        "navigation"
      ) as PerformanceNavigationTiming[];
      if (entries.length > 0) {
        const type = entries[0].type;
        switch (type) {
          case "navigate":
            return "direct";
          case "reload":
            return "reload";
          case "back_forward":
            return "back_forward";
          case "prerender":
            return "prerender";
          default:
            return type;
        }
      }
    } catch {
      // ignore
    }
    return "unknown";
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// 5. Standalone Utility Functions
// ---------------------------------------------------------------------------

/**
 * Create and initialize a pre-configured AnalyticsEngine instance.
 * Convenience factory function.
 * @param config - Partial configuration overrides
 * @returns Initialized engine ready for use
 */
export function createAnalytics(config?: Partial<AnalyticsConfig>): AnalyticsEngine {
  const engine = new AnalyticsEngine(config);
  engine.initialize();
  return engine;
}

/**
 * Format a duration in milliseconds to a human-readable string.
 * @param ms - Duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

/**
 * Format a large number with K/M/B suffixes for display.
 * @param num - Number to format
 */
export function formatMetricNumber(num: number): string {
  if (Math.abs(num) >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + "B";
  }
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return num.toString();
}

/**
 * Calculate percentage change between two values.
 * @param current - Current value
 * @param previous - Previous value
 */
export function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

/**
 * Compute a percentile from an array of numbers.
 * @param values - Array of numeric values
 * @param percentile - Percentile to compute (0-100)
 */
export function computePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return (
    sorted[lower] * (upper - index) + sorted[upper] * (index - lower)
  );
}

/**
 * Calculate the p-value for an A/B test using a simple z-test approximation.
 * @param controlConversions - Conversions in control group
 * @param controlSize - Total users in control group
 * @param variantConversions - Conversions in variant group
 * @param variantSize - Total users in variant group
 * @returns Statistical significance info
 */
export function calculateABSignificance(
  controlConversions: number,
  controlSize: number,
  variantConversions: number,
  variantSize: number
): {
  pValue: number;
  isSignificant: boolean; // at alpha = 0.05
  confidenceLevel: number;
  lift: number;
} {
  if (controlSize === 0 || variantSize === 0) {
    return { pValue: 1, isSignificant: false, confidenceLevel: 0, lift: 0 };
  }

  const p1 = controlConversions / controlSize;
  const p2 = variantConversions / variantSize;
  const pooledP = (controlConversions + variantConversions) / (controlSize + variantSize);

  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / controlSize + 1 / variantSize));

  if (se === 0) {
    return { pValue: 1, isSignificant: false, confidenceLevel: 0, lift: 0 };
  }

  const z = (p2 - p1) / se;

  // Approximate p-value from z-score using a simple method
  // This is a rough approximation; use a proper stats library for production
  const absZ = Math.abs(z);
  const pValue =
    absZ > 3.9
      ? 0.0001
      : absZ > 3.0
        ? 0.0013
        : absZ > 2.58
          ? 0.005
          : absZ > 1.96
            ? 0.025
            : absZ > 1.64
              ? 0.05
              : 0.5 - absZ * 0.15;

  const lift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;
  const confidenceLevel = Math.max(0, Math.min(99.9, (1 - pValue) * 100));

  return {
    pValue: Math.round(pValue * 10000) / 10000,
    isSignificant: pValue < 0.05,
    confidenceLevel: Math.round(confidenceLevel * 10) / 10,
    lift: Math.round(lift * 100) / 100,
  };
}

/**
 * Bucket numeric values into histogram bins.
 * @param values - Array of numbers to bucket
 * @param binEdges - Array of bin edge values (n edges produce n-1 bins)
 * @returns Array of { min, max, count } bins
 */
export function bucketValues(
  values: number[],
  binEdges: number[]
): Array<{ min: number; max: number; count: number }> {
  const bins = binEdges.slice(0, -1).map((edge, i) => ({
    min: edge,
    max: binEdges[i + 1],
    count: 0,
  }));

  for (const val of values) {
    for (let i = 0; i < bins.length; i++) {
      if (val >= bins[i].min && val < bins[i].max) {
        bins[i].count++;
        break;
      }
    }
    // Handle values >= last bin max
    if (val >= bins[bins.length - 1].max) {
      bins[bins.length - 1].count++;
    }
  }

  return bins;
}

/**
 * Smooth a time-series data array using a simple moving average.
 * @param data - Array of numeric values
 * @param windowSize - Size of the moving average window
 */
export function movingAverage(data: number[], windowSize: number = 3): number[] {
  if (windowSize <= 1) return [...data];
  const result: number[] = [];
  const halfWindow = Math.floor(windowSize / 2);

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const subset = data.slice(start, end);
    const avg = subset.reduce((a, b) => a + b, 0) / subset.length;
    result.push(Math.round(avg * 100) / 100);
  }

  return result;
}

/**
 * Determine if a given URL matches a pattern (useful for page grouping).
 * Supports wildcards (*) and simple patterns.
 * @param url - URL to test
 * @param pattern - Pattern to match against (e.g., "/products/*")
 */
export function matchURLPattern(url: string, pattern: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Convert pattern to regex
    const regexStr = pattern
      .replace(/\*/g, ".*")
      .replace(/\//g, "\\/");
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(pathname);
  } catch {
    return false;
  }
}

/**
 * Extract UTM parameters from a URL string.
 * @param url - URL string to parse
 */
export function extractUTMFromURL(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  try {
    const urlObj = new URL(url);
    const utmKeys = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
    ];
    for (const key of utmKeys) {
      const val = urlObj.searchParams.get(key);
      if (val) params[key] = val;
    }
  } catch {
    // ignore invalid URLs
  }
  return params;
}

/**
 * Debounce a tracking call to avoid excessive events.
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounceTrack<T extends unknown[], R>(
  fn: (...args: T) => R,
  delay: number
): (...args: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delay);
  };
}

/**
 * Throttle a tracking call to limit frequency.
 * @param fn - Function to throttle
 * @param interval - Minimum interval between calls in ms
 * @returns Throttled function
 */
export function throttleTrack<T extends unknown[]>(
  fn: (...args: T) => void,
  interval: number
): (...args: T) => void {
  let lastCall = 0;
  return (...args: T) => {
    const now = Date.now();
    if (now - lastCall >= interval) {
      fn(...args);
      lastCall = now;
    }
  };
}

// ---------------------------------------------------------------------------
// 6. Seeded Random Number Generator (for deterministic mock data)
// ---------------------------------------------------------------------------

/**
 * Create a seeded pseudo-random number generator.
 * Produces values in [0, 1).
 * @param seed - Initial seed value
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ---------------------------------------------------------------------------
// 7. Re-exports Summary
// ---------------------------------------------------------------------------

// All public interfaces, classes, and functions are exported individually above.
// Here is a summary of what is available:

// Types:
//   TrackedEvent, PageView, WebVitalEntry, ResourceTimingSummary,
//   NavigationTimingSummary, FunnelStep, FunnelDefinition, FunnelStepResult,
//   FunnelAnalysis, CohortGroup, CohortRetentionPoint, CohortAnalysis,
//   SessionInfo, CapturedError, ExperimentDefinition, ExperimentExposure,
//   ExperimentGoal, AnalyticsConfig, DailyActiveUsersData, RevenueDataPoint,
//   TopPageData, BatchSendResult

// Classes:
//   AnalyticsEngine, RateLimiter

// Factory functions:
//   createAnalytics

// Standalone utilities:
//   generateId, hashPII, isDoNotTrackEnabled, parseUTMParams,
//   formatDuration, formatMetricNumber, calculatePercentChange,
//   computePercentile, calculateABSignificance, bucketValues,
//   movingAverage, matchURLPattern, extractUTMFromURL,
//   debounceTrack, throttleTrack, seededRandom
