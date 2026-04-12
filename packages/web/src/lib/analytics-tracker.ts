/**
 * Analytics Tracker: Privacy-first analytics with event tracking,
 * session management, page views, custom properties, funnel analysis,
 * cohort tracking, A/B test integration, sampling, batching,
 * offline queue, and multi-provider support.
 */

// --- Types ---

export type EventType =
  | "pageview"
  | "event"
  | "timing"
  | "error"
  | "session_start"
  | "session_end"
  | "identify"
  | "group"
  | "revenue";

export interface AnalyticsEvent {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: EventType;
  /** Event name (e.g., "button_click", "purchase_completed") */
  name: string;
  /** Event properties */
  properties?: Record<string, unknown>;
  /** Timestamp (ms since epoch) */
  timestamp: number;
  /** Session ID */
  sessionId: string;
  /** User ID (if identified) */
  userId?: string;
  /** Device ID (anonymous) */
  deviceId: string;
  /** Page URL at time of event */
  url?: string;
  /** Page referrer */
  referrer?: string;
  /** User agent */
  userAgent?: string;
  /** Custom context */
  context?: Record<string, unknown>;
}

export interface UserIdentity {
  /** Unique user identifier */
  userId: string;
  /** Traits/attributes */
  traits?: Record<string, unknown>;
}

export interface SessionInfo {
  id: string;
  startedAt: number;
  lastActivityAt: number;
  pageCount: number;
  eventCount: number;
  referrer: string;
  landingPage: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface FunnelStep {
  /** Step name */
  name: string;
  /** Step order */
  order: number;
  /** Optional condition function */
  condition?: (event: AnalyticsEvent) => boolean;
}

export interface FunnelDefinition {
  /** Unique funnel name */
  name: string;
  /** Ordered steps */
  steps: FunnelStep[];
  /** Window in ms within which steps must occur (0 = unlimited) */
  windowMs?: number;
}

export interface FunnelResult {
  /** Funnel name */
  funnel: string;
  /** Total users who entered the funnel */
  totalEntries: number;
  /** Conversion per step */
  stepConversions: number[];
  /** Overall conversion rate */
  overallConversion: number;
  /** Average time between steps (ms) */
  avgStepTimes: number[];
  /** Drop-off per step */
  dropOffs: number[];
}

export interface ABTestVariant {
  /** Experiment/experiment ID */
  experimentId: string;
  /** Variant assigned */
  variant: string;
  /** Assignment timestamp */
  assignedAt: number;
  /** Whether user has converted */
  converted?: boolean;
  /** Converted at timestamp */
  convertedAt?: number;
}

export interface ProviderAdapter {
  /** Provider name */
  name: string;
  /** Initialize the provider */
  init?(options: Record<string, unknown>): Promise<void>;
  /** Track an event */
  track(event: AnalyticsEvent): Promise<void>;
  /** Identify a user */
  identify(userId: string, traits?: Record<string, unknown>): Promise<void>;
  /** Flush queued events */
  flush?(): Promise<void>;
  /** Shutdown provider */
  shutdown?(): Promise<void>;
}

export interface TrackerOptions {
  /** API endpoint for sending events */
  endpoint?: string;
  /** Application ID */
  appId?: string;
  /** Flush interval in ms (default: 5000) */
  flushInterval?: number;
  /** Max events per batch */
  batchSize?: number;
  /** Max events in offline queue */
  maxQueueSize?: number;
  /** Enable persistence across page loads */
  persist?: boolean;
  /** Storage key prefix */
  storagePrefix?: string;
  /** Track page views automatically? */
  autoPageView?: boolean;
  /** Track errors automatically? */
  autoTrackErrors?: boolean;
  /** Track performance timings? */
  autoTrackPerformance?: boolean;
  /** Session timeout in ms (default: 30min) */
  sessionTimeout?: number;
  /** Sample rate (0-1, 1 = track all) */
  sampleRate?: number;
  /** Respect Do Not Track header? */
  respectDNT?: boolean;
  /** Debug mode (console logging) */
  debug?: boolean;
  /** Custom property defaults */
  superProperties?: Record<string, unknown>;
  /** Provider adapters */
  providers?: ProviderAdapter[];
  /** Called before event is sent (return false to drop) */
  beforeSend?: (event: AnalyticsEvent) => AnalyticsEvent | false;
  /** Callback when events are flushed */
  onFlush?: (events: AnalyticsEvent[]) => void;
  /** Cookie domain for cross-subdomain tracking */
  cookieDomain?: string;
}

// --- Device / Session Utilities ---

function generateDeviceId(): string {
  let deviceId = "";

  // Try to get from localStorage
  try {
    deviceId = localStorage.getItem("__analytics_did") ?? "";
  } catch {}

  if (deviceId) return deviceId;

  // Generate new device ID
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx!.textBaseline = "top";
  ctx!.font = "14px Arial";
  ctx!.fillText("Browser fingerprint", 2, 2);

  const seed = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
  ].join("|");

  // Simple hash
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  deviceId = `did-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`;

  try {
    localStorage.setItem("__analytics_did", deviceId);
  } catch {}

  return deviceId;
}

function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseUTMParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  return utm;
}

// --- Core Tracker ---

export class AnalyticsTracker {
  private options: Required<TrackerOptions>;
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private deviceId: string;
  private session: SessionInfo;
  private currentUser: UserIdentity | null = null;
  private funnels: Map<string, FunnelDefinition> = new Map();
  private funnelEvents: Map<string, AnalyticsEvent[]> = new Map();
  private abTests: Map<string, ABTestVariant> = new Map();
  private providers: ProviderAdapter[] = [];
  private initialized = false;
  private destroyed = false;

  constructor(options: TrackerOptions = {}) {
    this.options = {
      endpoint: "",
      appId: "",
      flushInterval: 5000,
      batchSize: 20,
      maxQueueSize: 1000,
      persist: true,
      storagePrefix: "__analytics_",
      autoPageView: true,
      autoTrackErrors: false,
      autoTrackPerformance: false,
      sessionTimeout: 30 * 60 * 1000,
      sampleRate: 1,
      respectDNT: true,
      debug: false,
      superProperties: {},
      providers: [],
      ...options,
    };

    this.deviceId = generateDeviceId();
    this.session = this.createSession();

    // Restore from persistence
    if (this.options.persist) {
      this.restoreState();
    }
  }

  /** Initialize the tracker (call after construction). */
  async init(): Promise<void> {
    if (this.initialized || this.destroyed) return;

    // Initialize providers
    for (const provider of this.options.providers) {
      if (provider.init) {
        try { await provider.init({ appId: this.options.appId }); } catch {}
      }
      this.providers.push(provider);
    }

    // Start flush timer
    this.flushTimer = setInterval(() => this.flush(), this.options.flushInterval);

    // Auto-tracking
    if (this.options.autoPageView) {
      this.trackPageview();
    }

    if (this.options.autoTrackErrors) {
      this.setupErrorTracking();
    }

    if (this.options.autoTrackPerformance) {
      this.setupPerformanceTracking();
    }

    // Visibility change handler for session management
    document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this));

    // Before unload — flush remaining events
    window.addEventListener("beforeunload", () => {
      this.flush(true);
      this.saveState();
    });

    this.initialized = true;
    this.log("Analytics tracker initialized");
  }

  /** Track a custom event. */
  track(name: string, properties?: Record<string, unknown>): void {
    this.enqueue({
      type: "event",
      name,
      properties: { ...this.options.superProperties, ...properties },
    });

    // Check funnels
    this.checkFunnels(name, properties);
  }

  /** Track a page view. */
  trackPageview(properties?: Record<string, unknown>): void {
    this.refreshSession();
    this.session.pageCount++;
    this.enqueue({
      type: "pageview",
      name: window.location.pathname,
      properties: {
        title: document.title,
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        ...this.options.superProperties,
        ...properties,
      },
    });
  }

  /** Track timing metric. */
  trackTiming(category: string, variable: string, value: number, label?: string): void {
    this.enqueue({
      type: "timing",
      name: variable,
      properties: {
        category,
        value,
        label,
        ...this.options.superProperties,
      },
    });
  }

  /** Track an error. */
  trackError(error: Error | string, properties?: Record<string, unknown>): void {
    this.enqueue({
      type: "error",
      name: typeof error === "error" ? error.name : "Error",
      properties: {
        message: typeof error === "string" ? error : error.message,
        stack: typeof error === "object" && error.stack ? error.stack.slice(0, 2000) : undefined,
        ...this.options.superProperties,
        ...properties,
      },
    });
  }

  /** Identify the current user. */
  identify(userId: string, traits?: Record<string, unknown>): void {
    this.currentUser = { userId, traits };
    this.enqueue({
      type: "identify",
      name: userId,
      properties: traits,
    });

    // Forward to providers
    for (const p of this.providers) {
      p.identify(userId, traits).catch(() => {});
    }

    if (this.options.persist) {
      this.saveUser(userId, traits);
    }
  }

  /** Group user into a cohort/group. */
  group(groupId: string, traits?: Record<string, unknown>): void {
    this.enqueue({
      type: "group",
      name: groupId,
      properties: traits,
    });
  }

  /** Track revenue/conversion. */
  trackRevenue(amount: number, currency = "USD", properties?: Record<string, unknown>): void {
    this.enqueue({
      type: "revenue",
      name: "purchase",
      properties: {
        amount,
        currency,
        ...this.options.superProperties,
        ...properties,
      },
    });
  }

  /** Register a funnel definition. */
  registerFunnel(funnel: FunnelDefinition): void {
    this.funnels.set(funnel.name, funnel);
    this.funnelEvents.set(funnel.name, []);
  }

  /** Get funnel conversion results. */
  getFunnelResults(funnelName: string): FunnelResult | null {
    const def = this.funnels.get(funnelName);
    const events = this.funnelEvents.get(funnelName);
    if (!def || !events) return null;

    const totalEntries = events.length;
    const stepConversions: number[] = [];
    const dropOffs: number[] = [];

    for (let s = 0; s < def.steps.length; s++) {
      const step = def.steps[s]!;
      const matching = events.filter((e) =>
        e.name === step.name && (!step.condition || step.condition(e)),
      );
      stepConversions.push(matching.length);
      const prev = s > 0 ? stepConversions[s - 1]! : totalEntries;
      dropOffs.push(prev - matching.length);
    }

    const overallConversion = totalEntries > 0
      ? (stepConversions[stepConversions.length - 1] ?? 0) / totalEntries
      : 0;

    return {
      funnel: funnelName,
      totalEntries,
      stepConversions,
      overallConversion,
      avgStepTimes: [], // Would need timestamp analysis
      dropOffs,
    };
  }

  /** Assign user to an A/B test variant. */
  abAssign(experimentId: string, variants: string[], weights?: number[]): ABTestVariant {
    const existing = this.abTests.get(experimentId);
    if (existing) return existing;

    // Weighted random selection
    const w = weights ?? variants.map(() => 1 / variants.length);
    const rand = Math.random();
    let cumulative = 0;
    let selected = variants[0]!;

    for (let i = 0; i < variants.length; i++) {
      cumulative += w[i]!;
      if (rand <= cumulative) {
        selected = variants[i]!;
        break;
      }
    }

    const variant: ABTestVariant = {
      experimentId,
      variant: selected,
      assignedAt: Date.now(),
    };

    this.abTests.set(experimentId, variant);
    this.track(`ab_assigned:${experimentId}`, { variant: selected });

    return variant;
  }

  /** Record A/B test conversion. */
  abConvert(experimentId: string): void {
    const test = this.abTests.get(experimentId);
    if (test && !test.converted) {
      test.converted = true;
      test.convertedAt = Date.now();
      this.track(`ab_convert:${experimentId}`, { variant: test.variant });
    }
  }

  /** Manually flush queued events. */
  async flush(sync = false): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, this.options.batchSize);

    // Send to custom endpoint
    if (this.options.endpoint) {
      try {
        const controller = new AbortController();
        if (!sync) {
          // Async flush with short timeout
          setTimeout(() => controller.abort(), 5000);
        }

        await fetch(this.options.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events: batch }),
          signal: sync ? undefined : controller.signal,
          keepalive: sync,
        }).catch(() => {});
      } catch {
        // Re-queue on failure
        this.eventQueue.unshift(...batch);
      }
    }

    // Send to providers
    for (const provider of this.providers) {
      for (const event of batch) {
        provider.track(event).catch(() => {});
      }
      if (provider.flush) provider.flush().catch(() => {});
    }

    this.options.onFlush?.(batch);
    this.log(`Flushed ${batch.length} events`);
  }

  /** Get current session info. */
  getSession(): SessionInfo {
    return { ...this.session };
  }

  /** Get current device ID. */
  getDeviceId(): string {
    return this.deviceId;
  }

  /** Get current user identity. */
  getUser(): UserIdentity | null {
    return this.currentUser;
  }

  /** Reset the tracker state (clear user, start new session). */
  reset(): void {
    this.currentUser = null;
    this.session = this.createSession();
    this.abTests.clear();
    for (const [name] of this.funnelEvents) {
      this.funnelEvents.set(name, []);
    }
    this.log("Tracker reset");
  }

  /** Destroy the tracker — clean up all resources. */
  destroy(): void {
    this.destroyed = true;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush(true);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange.bind(this));
    this.log("Tracker destroyed");
  }

  // --- Internal ---

  private enqueue(partial: Omit<AnalyticsEvent, "id" | "timestamp" | "sessionId" | "deviceId" | "url" | "referrer" | "userAgent">): void {
    // Check DNT
    if (this.options.respectDNT && navigator.doNotTrack === "1") return;

    // Sampling
    if (Math.random() > this.options.sampleRate) return;

    // Queue size limit
    if (this.eventQueue.length >= this.options.maxQueueSize) {
      this.eventQueue.shift(); // Drop oldest
    }

    const event: AnalyticsEvent = {
      id: generateEventId(),
      ...partial,
      timestamp: Date.now(),
      sessionId: this.session.id,
      deviceId: this.deviceId,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      userId: this.currentUser?.userId,
    };

    // Before-send hook
    if (this.options.beforeSend) {
      const result = this.options.beforeSend(event);
      if (result === false) return;
      Object.assign(event, result);
    }

    this.eventQueue.push(event);
    this.session.eventCount++;
  }

  private createSession(): SessionInfo {
    const utm = parseUTMParams();
    return {
      id: generateSessionId(),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      pageCount: 0,
      eventCount: 0,
      referrer: document.referrer,
      landingPage: window.location.pathname,
      utmSource: utm.utm_source,
      utmMedium: utm.utm_medium,
      utmCampaign: utm.utm_campaign,
      utmTerm: utm.utm_term,
      utmContent: utm.utm_content,
    };
  }

  private refreshSession(): void {
    const now = Date.now();
    const idle = now - this.session.lastActivityAt;

    if (idle > this.options.sessionTimeout) {
      // End old session, start new one
      this.enqueue({ type: "session_end", name: "session_end" });
      this.session = this.createSession();
      this.enqueue({ type: "session_start", name: "session_start" });
    }

    this.session.lastActivityAt = now;
  }

  private checkFunnels(eventName: string, properties?: Record<string, unknown>): void {
    for (const [name, def] of this.funnels) {
      const matchingStep = def.steps.find((s) => s.name === eventName);
      if (matchingStep) {
        const events = this.funnelEvents.get(name)!;
        // Find latest event for this session
        const lastEvent = events[events.length - 1];
        if (lastEvent?.sessionId !== this.session.id) {
          events.length = 0; // New session — reset funnel
        }
        if (!matchingStep.condition || matchingStep.condition({
          type: "event",
          name: eventName,
          properties: properties ?? {},
          timestamp: Date.now(),
          sessionId: this.session.id,
          deviceId: this.deviceId,
          id: "",
        })) {
          events.push({
            type: "event",
            name: eventName,
            properties: properties ?? {},
            timestamp: Date.now(),
            sessionId: this.session.id,
            deviceId: this.deviceId,
            id: "",
          });
        }
      }
    }
  }

  private setupErrorTracking(): void {
    window.addEventListener("error", (event) => {
      this.trackError(event.error ?? new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.trackError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
        type: "unhandledrejection",
      });
    });
  }

  private setupPerformanceTracking(): void {
    if ("performance" in window && "getEntriesByType" in performance) {
      // Observe long tasks, layout shifts, etc.
      try {
        const obs = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackTiming("web_vital", entry.name, entry.duration, entry.entryType);
          }
        });
        obs.observe({ entryTypes: ["navigation", "resource", "paint"] });
      } catch {}
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === "visible") {
      this.refreshSession();
    } else if (document.visibilityState === "hidden") {
      this.flush(true);
      this.saveState();
    }
  }

  private saveState(): void {
    if (!this.options.persist) return;
    try {
      sessionStorage.setItem(
        `${this.options.storagePrefix}session`,
        JSON.stringify(this.session),
      );
      if (this.currentUser) {
        sessionStorage.setItem(
          `${this.options.storagePrefix}user`,
          JSON.stringify(this.currentUser),
        );
      }
    } catch {}
  }

  private restoreState(): void {
    try {
      const savedSession = sessionStorage.getItem(`${this.options.storagePrefix}session`);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as SessionInfo;
        // Check if session hasn't expired
        if (Date.now() - parsed.lastActivityAt < this.options.sessionTimeout) {
          this.session = parsed;
        }
      }

      const savedUser = sessionStorage.getItem(`${this.options.storagePrefix}user`);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser) as UserIdentity;
      }
    } catch {}
  }

  private saveUser(_userId: string, _traits?: Record<string, unknown>): void {
    // Already handled in saveState
  }

  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log("[Analytics]", ...args);
    }
  }
}

// --- Factory ---

/** Create a new analytics tracker instance. */
export function createAnalyticsTracker(options?: TrackerOptions): AnalyticsTracker {
  return new AnalyticsTracker(options);
}
