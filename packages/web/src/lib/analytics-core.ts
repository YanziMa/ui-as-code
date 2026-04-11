/**
 * Analytics Core: Event-driven analytics engine with schema validation,
 * batched delivery, sampling, user/session identification,
 * context enrichment, and multi-endpoint support.
 */

// --- Types ---

export interface AnalyticsEvent {
  /** Unique event ID */
  id: string;
  /** Event name/type */
  name: string;
  /** Event properties */
  properties?: Record<string, unknown>;
  /** Timestamp (ms) */
  timestamp: number;
  /** User ID */
  userId?: string;
  /** Anonymous/device ID */
  deviceId: string;
  /** Session ID */
  sessionId?: string;
  /** Event context (auto-enriched) */
  context?: AnalyticsContext;
}

export interface AnalyticsContext {
  /** Page URL */
  url: string;
  /** Page path */
  path: string;
  /** Referrer URL */
  referrer?: string;
  /** Page title */
  title?: string;
  /** User agent */
  userAgent?: string;
  /** Screen dimensions */
  screen?: { width: number; height: number };
  /** Viewport dimensions */
  viewport?: { width: number; height: number };
  /** Locale */
  locale?: string;
  /** UTM parameters */
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  /** App version */
  appVersion?: string;
  /** Library info */
  library: { name: string; version: string };
}

export interface EventSchema {
  /** Event name */
  name: string;
  /** Required property names */
  requiredProperties?: string[];
  /** Property type definitions */
  propertyTypes?: Record<string, "string" | "number" | "boolean" | "object" | "array">;
  /** Property value constraints */
  propertyConstraints?: Record<string, { min?: number; max?: number; enum?: unknown[]; pattern?: string }>;
}

export interface AnalyticsConfig {
  /** API endpoint(s) for event delivery */
  endpoints?: string[];
  /** Default endpoint if not specified */
  defaultEndpoint?: string;
  /** Batch size before auto-flush (default: 20) */
  flushBatchSize?: number;
  /** Flush interval in ms (default: 5000) */
  flushIntervalMs?: number;
  /** Max events in queue before dropping oldest (default: 1000) */
  maxQueueSize?: number;
  /** Sampling rate (0-1, 1 = all events) */
  sampleRate?: number;
  /** Enable debug logging? */
  debug?: boolean;
  /** Disable all tracking? */
  disabled?: boolean;
  /** Cookie/storage key for device ID */
  deviceIdKey?: string;
  /** Cookie/storage key for user ID */
  userIdKey?: string;
  /** Cookie/storage key for session */
  sessionKey?: string;
  /** Session timeout in ms (default: 1800000 = 30 min) */
  sessionTimeoutMs?: number;
  /** Auto-enrich context? */
  autoEnrichContext?: boolean;
  /** Custom event schemas for validation */
  schemas?: EventSchema[];
  /** Callback on each event (for side effects) */
  onEvent?: (event: AnalyticsEvent) => void;
  /** Callback on flush success */
  onFlush?: (events: AnalyticsEvent[], endpoint: string) => void;
  /** Callback on flush error */
  onError?: (error: Error, events: AnalyticsEvent[]) => void;
  /** Extra headers for requests */
  headers?: Record<string, string>;
  /** Auth token for requests */
  authToken?: string;
}

export interface AnalyticsStats {
  totalEventsTracked: number;
  totalEventsSent: number;
  totalEventsDropped: number;
  currentQueueSize: number;
  flushCount: number;
  lastFlushAt: number | null;
  sessionsCount: number;
  identifiedUsers: number;
}

// --- Internal Types ---

interface QueuedEvent extends AnalyticsEvent {
  retryCount: number;
}

// --- Main Class ---

export class AnalyticsCore {
  private config: Required<Omit<AnalyticsConfig, "endpoints" | "schemas" | "onEvent" | "onFlush" | "onError">> & {
    endpoints: string[];
    schemas: EventSchema[];
    onEvent: AnalyticsConfig["onEvent"];
    onFlush: AnalyticsConfig["onFlush"];
    onError: AnalyticsConfig["onError"];
  };

  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private stats: AnalyticsStats = {
    totalEventsTracked: 0,
    totalEventsSent: 0,
    totalEventsDropped: 0,
    currentQueueSize: 0,
    flushCount: 0,
    lastFlushAt: null,
    sessionsCount: 0,
    identifiedUsers: 0,
  };

  private deviceId: string;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private sessionStartAt: number | null = null;
  private schemasMap = new Map<string, EventSchema>();
  private destroyed = false;

  constructor(config: AnalyticsConfig = {}) {
    this.config = {
      endpoints: config.endpoints ?? [config.defaultEndpoint ?? "/api/events"],
      defaultEndpoint: config.defaultEndpoint ?? this.getPrimaryEndpoint(),
      flushBatchSize: config.flushBatchSize ?? 20,
      flushIntervalMs: config.flushIntervalMs ?? 5000,
      maxQueueSize: config.maxQueueSize ?? 1000,
      sampleRate: config.sampleRate ?? 1,
      debug: config.debug ?? false,
      disabled: config.disabled ?? false,
      deviceIdKey: config.deviceIdKey ?? "analytics_device_id",
      userIdKey: config.userIdKey ?? "analytics_user_id",
      sessionKey: config.sessionKey ?? "analytics_session",
      sessionTimeoutMs: config.sessionTimeoutMs ?? 1800000,
      autoEnrichContext: config.autoEnrichContext ?? true,
      schemas: config.schemas ?? [],
      onEvent: config.onEvent,
      onFlush: config.onFlush,
      onError: config.onError,
      headers: config.headers ?? {},
      authToken: config.authToken,
    };

    // Restore or generate IDs
    this.deviceId = this.restoreDeviceId();
    this.userId = this.restoreUserId();
    this.sessionId = this.restoreSession();

    // Build schema index
    for (const schema of this.config.schemas) {
      this.schemasMap.set(schema.name, schema);
    }

    // Start flush timer
    this.startFlushTimer();
  }

  // --- Identification ---

  /** Set the user ID (identifies across sessions/devices) */
  identify(userId: string): void {
    this.userId = userId;
    this.persistUserId();
    this.stats.identifiedUsers++;
    if (this.config.debug) console.log(`[Analytics] Identified as: ${userId}`);
  }

  /** Clear the user ID (anonymize) */
  unidentify(): void {
    this.userId = null;
    this.clearUserIdStorage();
  }

  /** Get current device ID */
  getDeviceId(): string {
    return this.deviceId;
  }

  /** Get current user ID */
  getUserId(): string | null {
    return this.userId;
  }

  /** Get current session ID */
  getSessionId(): string | null {
    return this.sessionId;
  }

  // --- Event Tracking ---

  /** Track an event */
  track(name: string, properties?: Record<string, unknown>): void {
    if (this.config.disabled || this.destroyed) return;

    // Sampling check
    if (this.config.sampleRate < 1 && Math.random() > this.config.sampleRate) {
      this.stats.totalEventsDropped++;
      return;
    }

    // Ensure session is active
    this.ensureSession();

    // Validate against schema
    const validationError = this.validateEvent(name, properties);
    if (validationError) {
      if (this.config.debug) console.warn(`[Analytics] Schema validation failed: ${validationError}`);
    }

    // Build event
    const event: QueuedEvent = {
      id: this.generateEventId(),
      name,
      properties,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      userId: this.userId ?? undefined,
      sessionId: this.sessionId ?? undefined,
      context: this.config.autoEnrichContext ? this.buildContext() : undefined,
      retryCount: 0,
    };

    // Add to queue
    this.enqueue(event);

    // Callback
    if (this.config.onEvent) {
      try { this.config.onEvent(event); } catch {}
    }

    this.stats.totalEventsTracked++;

    if (this.config.debug) {
      console.log(`[Analytics] Track: ${name}`, properties);
    }
  }

  /** Track a page view */
  pageView(path?: string, properties?: Record<string, unknown>): void {
    this.track("page_view", {
      ...properties,
      path: path ?? window.location.pathname,
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
    });
  }

  // --- Queue Management ---

  /** Manually flush queued events to server */
  async flush(): Promise<void> {
    if (this.queue.length === 0 || this.destroyed) return;

    // Take events from queue
    const events = this.queue.splice(0, this.config.flushBatchSize);

    if (events.length === 0) return;

    // Send to each endpoint
    for (const endpoint of this.config.endpoints) {
      try {
        await this.sendEvents(endpoint, events);
        this.stats.totalEventsSent += events.length;
        this.stats.flushCount++;
        this.stats.lastFlushAt = Date.now();

        if (this.config.onFlush) {
          try { this.config.onFlush(events, endpoint); } catch {}
        }
      } catch (error) {
        // Re-queue failed events (with retry limit)
        for (const event of events) {
          if (event.retryCount < 3) {
            event.retryCount++;
            this.queue.unshift(event);
          } else {
            this.stats.totalEventsDropped++;
          }
        }

        if (this.config.onError) {
          try { this.config.onError(error instanceof Error ? error : new Error(String(error)), events); } catch {}
        }
      }
    }

    // Update queue size stat
    this.stats.currentQueueSize = this.queue.length;
  }

  /** Get current queue size */
  getQueueSize(): number {
    return this.queue.length;
  }

  /** Clear the event queue without sending */
  clearQueue(): void {
    this.stats.totalEventsDropped += this.queue.length;
    this.queue = [];
    this.stats.currentQueueSize = 0;
  }

  // --- Stats ---

  /** Get analytics statistics */
  getStats(): AnalyticsStats {
    return {
      ...this.stats,
      currentQueueSize: this.queue.length,
    };
  }

  /** Reset statistics */
  resetStats(): void {
    this.stats = {
      totalEventsTracked: 0,
      totalEventsSent: 0,
      totalEventsDropped: 0,
      currentQueueSize: this.queue.length,
      flushCount: 0,
      lastFlushAt: null,
      sessionsCount: 0,
      identifiedUsers: 0,
    };
  }

  // --- Lifecycle ---

  /** Disable tracking (stop collecting but keep queue) */
  disable(): void {
    this.config.disabled = true;
  }

  /** Re-enable tracking */
  enable(): void {
    this.config.disabled = false;
  }

  /** Destroy the analytics instance */
  destroy(): void {
    this.destroyed = true;
    this.stopFlushTimer();
    this.clearQueue();
  }

  // --- Private ---

  private enqueue(event: QueuedEvent): void {
    // Drop oldest if over max
    if (this.queue.length >= this.config.maxQueueSize) {
      const dropped = this.queue.shift();
      if (dropped) this.stats.totalEventsDropped++;
    }

    this.queue.push(event);
    this.stats.currentQueueSize = this.queue.length;

    // Auto-flush if batch size reached
    if (this.queue.length >= this.config.flushBatchSize) {
      this.flush();
    }
  }

  private async sendEvents(endpoint: string, events: AnalyticsEvent[]): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...this.config.headers,
    };

    if (this.config.authToken) {
      headers["Authorization"] = `Bearer ${this.config.authToken}`;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        events: events.map((e) => ({
          id: e.id,
          name: e.name,
          properties: e.properties,
          timestamp: e.timestamp,
          user_id: e.userId,
          device_id: e.deviceId,
          session_id: e.sessionId,
          context: e.context,
        })),
        sent_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private startFlushTimer(): void {
    this.stopFlushTimer();
    this.flushTimer = setInterval(() => {
      if (!this.destroyed) this.flush();
    }, this.config.flushIntervalMs);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private validateEvent(name: string, properties?: Record<string, unknown>): string | null {
    const schema = this.schemasMap.get(name);
    if (!schema) return null; // No schema = no validation

    // Check required properties
    if (schema.requiredProperties) {
      for (const req of schema.requiredProperties) {
        if (!properties || !(req in properties)) {
          return `Missing required property: ${req}`;
        }
      }
    }

    // Check types and constraints
    if (schema.propertyTypes && properties) {
      for (const [propName, expectedType] of Object.entries(schema.propertyTypes)) {
        const value = properties[propName];
        if (value === undefined) continue; // Optional

        const actualType = Array.isArray(value) ? "array" : typeof value;
        if (actualType !== expectedType) {
          return `Property "${propName}" expected ${expectedType}, got ${actualType}`;
        }

        // Check constraints
        const constraint = schema.propertyConstraints?.[propName];
        if (constraint) {
          if (typeof value === "number") {
            if (constraint.min !== undefined && value < constraint.min) {
              return `Property "${propName}" below minimum (${constraint.min})`;
            }
            if (constraint.max !== undefined && value > constraint.max) {
              return `Property "${propName}" above maximum (${constraint.max})`;
            }
          }
          if (constraint.enum && !constraint.enum.includes(value)) {
            return `Property "${propName}" not in allowed values`;
          }
        }
      }
    }

    return null;
  }

  private buildContext(): AnalyticsContext {
    return {
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
      title: document.title,
      userAgent: navigator.userAgent,
      screen: { width: screen.width, height: screen.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      locale: navigator.language,
      utm: this.parseUTMParams(),
      library: { name: "analytics-core", version: "1.0.0" },
    };
  }

  private parseUTMParams(): NonNullable<AnalyticsContext["utm"]> {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string | undefined> = {
      source: params.get("utm_source") ?? undefined,
      medium: params.get("utm_medium") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
      term: params.get("utm_term") ?? undefined,
      content: params.get("utm_content") ?? undefined,
    };
    return utm as NonNullable<AnalyticsContext["utm"]>;
  }

  // --- Session Management ---

  private ensureSession(): void {
    if (!this.sessionId || !this.sessionStartAt) {
      this.startNewSession();
      return;
    }

    // Check expiry
    if (Date.now() - this.sessionStartAt! > this.config.sessionTimeoutMs) {
      this.startNewSession();
    }
  }

  private startNewSession(): void {
    this.sessionId = crypto.randomUUID();
    this.sessionStartAt = Date.now();
    this.persistSession();
    this.stats.sessionsCount++;

    if (this.config.debug) {
      console.log(`[Analytics] New session: ${this.sessionId}`);
    }
  }

  // --- Storage ---

  private restoreDeviceId(): string {
    try {
      const stored = localStorage.getItem(this.config.deviceIdKey);
      if (stored) return stored;
    } catch {}

    const newId = crypto.randomUUID();
    try { localStorage.setItem(this.config.deviceIdKey, newId); } catch {}
    return newId;
  }

  private restoreUserId(): string | null {
    try { return localStorage.getItem(this.config.userIdKey); } catch { return null; }
  }

  private persistUserId(): void {
    if (this.userId) {
      try { localStorage.setItem(this.config.userIdKey, this.userId); } catch {}
    }
  }

  private clearUserIdStorage(): void {
    try { localStorage.removeItem(this.config.userIdKey); } catch {}
  }

  private restoreSession(): string | null {
    try {
      const raw = localStorage.getItem(this.config.sessionKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { id: string; startedAt: number };
        if (Date.now() - parsed.startedAt < this.config.sessionTimeoutMs) {
          this.sessionStartAt = parsed.startedAt;
          return parsed.id;
        }
      }
    } catch {}

    return null;
  }

  private persistSession(): void {
    if (this.sessionId && this.sessionStartAt) {
      try {
        localStorage.setItem(this.config.sessionKey, JSON.stringify({
          id: this.sessionId,
          startedAt: this.sessionStartAt,
        }));
      } catch {}
    }
  }

  // --- Utilities ---

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private getPrimaryEndpoint(): string {
    return this.config.endpoints[0] ?? "/api/events";
  }
}

/** Create a pre-configured analytics core instance */
export function createAnalytics(config?: AnalyticsConfig): AnalyticsCore {
  return new AnalyticsCore(config);
}
