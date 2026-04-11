/**
 * User Journey Tracker: Session-based user journey recording with
 * page navigation tracking, event timelines, path analysis,
 * drop-off identification, journey segmentation, conversion paths,
 * and cross-cohort journey comparison.
 */

// --- Types ---

export interface JourneyEvent {
  /** Unique event ID */
  id: string;
  /** Event type/name */
  type: string;
  /** Timestamp (ms) */
  timestamp: number;
  /** Page URL at time of event */
  url?: string;
  /** Page path */
  path?: string;
  /** Event data */
  data?: Record<string, unknown>;
  /** Duration since previous event (ms) */
  durationFromPrev?: number;
}

export interface JourneyPage {
  /** Page URL */
  url: string;
  /** Path */
  path: string;
  /** Title */
  title?: string;
  /** Referrer */
  referrer?: string;
  /** Entry timestamp */
  enteredAt: number;
  /** Exit timestamp (null if current page) */
  exitedAt?: number | null;
  /** Time spent on page (ms) */
  timeSpentMs: number;
  /** Events that occurred on this page */
  events: JourneyEvent[];
  /** Scroll depth at exit (0-100) */
  scrollDepthAtExit?: number;
  /** Interaction count on this page */
  interactionCount: number;
}

export interface UserJourney {
  /** Unique journey/session ID */
  id: string;
  /** User ID */
  userId: string;
  /** Device ID */
  deviceId: string;
  /** Start timestamp */
  startedAt: number;
  /** End timestamp (null if active) */
  endedAt?: number | null;
  /** Total duration (ms) */
  totalDurationMs: number;
  /** Pages visited in order */
  pages: JourneyPage[];
  /** All events in chronological order */
  events: JourneyEvent[];
  /** Entry point (first page URL) */
  entryPoint: string;
  /** Exit point (last page URL or null) */
  exitPoint: string | null;
  /** Did the user convert? */
  converted: boolean;
  /** Conversion event/type */
  conversionType?: string;
  /** Conversion timestamp */
  convertedAt?: number | null;
  /** Journey tags (auto-classified) */
  tags: string[];
  /** Custom attributes */
  attributes?: Record<string, unknown>;
  /** UTM parameters at entry */
  utm?: Record<string, string>;
}

export interface JourneyConfig {
  /** Auto-track page views via history API? */
  autoTrackPages?: boolean;
  /** Track scroll depth on each page? */
  trackScrollDepth?: boolean;
  /** Track clicks as events? */
  trackClicks?: boolean;
  /** Max events per page before summarizing (default: 100) */
  maxEventsPerPage?: number;
  /** Max pages per journey (default: 50) */
  maxPagesPerJourney?: number;
  /** Session timeout in ms (default: 1800000 = 30 min) */
  sessionTimeoutMs?: number;
  /** Conversion event names/types */
  conversionEvents?: string[];
  /** Storage key prefix */
  storagePrefix?: string;
  /** Enable debug logging? */
  debug?: boolean;
}

export interface JourneyStats {
  totalJourneys: number;
  activeJourneys: number;
  completedJourneys: number;
  convertedJourneys: number;
  overallConversionRate: number;
  avgPagesPerJourney: number;
  avgDurationMs: number;
  avgEventsPerJourney: number;
  bounceRate: number;
  topEntryPoints: Array<{ url: string; count: number }>;
  topExitPoints: Array<{ url: string; count: number }>;
  commonPaths: Array<{ path: string[]; count: number }>;
}

export interface PathAnalysis {
  /** The unique path (array of page paths) */
  path: string[];
  /** Number of journeys following this exact path */
  frequency: number;
  /** Percentage of total journeys */
  percentage: number;
  /** Conversion rate for this path */
  conversionRate: number;
  /** Average time to complete this path */
  avgTimeMs: number;
  /** Drop-off point (index where users leave) */
  typicalDropOffIndex: number;
  /** Drop-off rate at each step */
  stepDropOffRates: number[];
}

// --- Main Class ---

export class JourneyTracker {
  private config: Required<JourneyConfig>;
  private journeys = new Map<string, UserJourney>();
  private activeJourneyId: string | null = null;
  private cleanupFns: Array<() => void> = [];
  private destroyed = false;

  constructor(config: JourneyConfig = {}) {
    this.config = {
      autoTrackPages: config.autoTrackPages ?? true,
      trackScrollDepth: config.trackScrollDepth ?? false,
      trackClicks: config.trackClicks ?? false,
      maxEventsPerPage: config.maxEventsPerPage ?? 100,
      maxPagesPerJourney: config.maxPagesPerJourney ?? 50,
      sessionTimeoutMs: config.sessionTimeoutMs ?? 1800000,
      conversionEvents: config.conversionEvents ?? ["purchase", "signup", "conversion"],
      storagePrefix: config.storagePrefix ?? "journey_",
      debug: config.debug ?? false,
    };

    // Restore active journey
    this.restoreActiveJourney();

    // Setup auto-tracking
    if (this.config.autoTrackPages && typeof window !== "undefined") {
      this.setupPageTracking();
    }

    if (this.config.trackClicks && typeof window !== "undefined") {
      this.setupClickTracking();
    }
  }

  // --- Journey Management ---

  /** Start a new journey for a user */
  startJourney(userId: string, deviceId: string, attributes?: Record<string, unknown>): UserJourney {
    const id = crypto.randomUUID();
    const now = Date.now();

    const journey: UserJourney = {
      id,
      userId,
      deviceId,
      startedAt: now,
      totalDurationMs: 0,
      pages: [],
      events: [],
      entryPoint: window.location?.href ?? "",
      exitPoint: null,
      converted: false,
      tags: [],
      attributes,
      utm: this.parseUTMParams(),
    };

    // Record initial page
    this.recordPage(journey);

    this.journeys.set(id, journey);
    this.activeJourneyId = id;
    this.persistActiveJourney();

    if (this.config.debug) {
      console.log(`[Journey] Started: ${id} for user ${userId}`);
    }

    return journey;
  }

  /** Get or create the current active journey */
  getOrCreateJourney(userId: string, deviceId: string): UserJourney {
    if (this.activeJourneyId) {
      const existing = this.journeys.get(this.activeJourneyId);
      if (existing && !existing.endedAt) return existing;
    }
    return this.startJourney(userId, deviceId);
  }

  /** End the current active journey */
  endJourney(conversionType?: string): UserJourney | null {
    if (!this.activeJourneyId) return null;

    const journey = this.journeys.get(this.activeJourneyId);
    if (!journey || journey.endedAt) return null;

    const now = Date.now();
    journey.endedAt = now;
    journey.totalDurationMs = now - journey.startedAt;

    // Finalize last page
    if (journey.pages.length > 0) {
      const lastPage = journey.pages[journey.pages.length - 1];
      lastPage.exitedAt = now;
      lastPage.timeSpentMs = now - lastPage.enteredAt;
    }

    // Set exit point
    journey.exitPoint = lastPageUrl(journey);

    // Check conversion
    if (conversionType || this.config.conversionEvents.includes(journey.events[journey.events.length - 1]?.type)) {
      journey.converted = true;
      journey.conversionType = conversionType ?? journey.events[journey.events.length - 1]?.type;
      journey.convertedAt = now;
    }

    // Classify journey
    journey.tags = this.classifyJourney(journey);

    this.activeJourneyId = null;
    this.clearActiveJourney();

    if (this.config.debug) {
      console.log(`[Journey] Ended: ${journey.id}, converted=${journey.converted}`);
    }

    return journey;
  }

  /** Record an event on the current journey */
  recordEvent(type: string, data?: Record<string, unknown>): void {
    const journey = this.getCurrentJourney();
    if (!journey) return;

    const prevEvent = journey.events[journey.events.length - 1];
    const now = Date.now();

    const event: JourneyEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      timestamp: now,
      url: window.location?.href,
      path: window.location?.pathname,
      data,
      durationFromPrev: prevEvent ? now - prevEvent.timestamp : undefined,
    };

    journey.events.push(event);

    // Add to current page's events
    if (journey.pages.length > 0) {
      const currentPage = journey.pages[journey.pages.length - 1];
      if (currentPage.events.length < this.config.maxEventsPerPage) {
        currentPage.events.push(event);
        currentPage.interactionCount++;
      }
    }
  }

  /** Record a page view on the current journey */
  recordPage(journey?: UserJourney): void {
    const j = journey ?? this.getCurrentJourney();
    if (!j) return;

    if (j.pages.length >= this.config.maxPagesPerJourney) return;

    const prevPage = j.pages[j.pages.length - 1];
    const now = Date.now();

    // Finalize previous page
    if (prevPage) {
      prevPage.exitedAt = now;
      prevPage.timeSpentMs = now - prevPage.enteredAt;
    }

    const page: JourneyPage = {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer,
      enteredAt: now,
      exitedAt: null,
      timeSpentMs: 0,
      events: [],
      interactionCount: 0,
    };

    j.pages.push(page);

    // Also record as event
    this.recordEvent("page_view", { url: page.url, path: page.path, title: page.title });
  }

  /** Get the current active journey */
  getCurrentJourney(): UserJourney | null {
    if (!this.activeJourneyId) return null;
    return this.journeys.get(this.activeJourneyId) ?? null;
  }

  /** Get a journey by ID */
  getJourney(id: string): UserJourney | undefined {
    return this.journeys.get(id);
  }

  /** Get all journeys */
  getAllJourneys(): UserJourney[] {
    return Array.from(this.journeys.values());
  }

  /** Get journeys for a specific user */
  getUserJourneys(userId: string): UserJourney[] {
    return Array.from(this.journeys.values()).filter((j) => j.userId === userId);
  }

  // --- Analysis ---

  /** Calculate journey statistics */
  getStats(): JourneyStats {
    const all = Array.from(this.journeys.values());
    const completed = all.filter((j) => j.endedAt);
    const converted = all.filter((j) => j.converted);
    const active = all.filter((j) => !j.endedAt);

    // Bounce rate (single-page journeys)
    const bounces = completed.filter((j) => j.pages.length <= 1).length;
    const bounceRate = completed.length > 0 ? bounces / completed.length : 0;

    // Top entry points
    const entryMap = new Map<string, number>();
    for (const j of all) {
      entryMap.set(j.entryPoint, (entryMap.get(j.entryPoint) ?? 0) + 1);
    }
    const topEntryPoints = Array.from(entryMap.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top exit points
    const exitMap = new Map<string, number>();
    for (const j of completed) {
      if (j.exitPoint) exitMap.set(j.exitPoint, (exitMap.get(j.exitPoint) ?? 0) + 1);
    }
    const topExitPoints = Array.from(exitMap.entries())
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Common paths
    const pathMap = new Map<string, number>();
    for (const j of completed) {
      const pathStr = j.pages.map((p) => p.path).join(" → ");
      pathMap.set(pathStr, (pathMap.get(pathStr) ?? 0) + 1);
    }
    const commonPaths = Array.from(pathMap.entries())
      .map(([path, count]) => ({ path: path.split(" → "), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalJourneys: all.length,
      activeJourneys: active.length,
      completedJourneys: completed.length,
      convertedJourneys: converted.length,
      overallConversionRate: completed.length > 0 ? converted.length / completed.length : 0,
      avgPagesPerJourney: completed.length > 0
        ? completed.reduce((sum, j) => sum + j.pages.length, 0) / completed.length
        : 0,
      avgDurationMs: completed.length > 0
        ? completed.reduce((sum, j) => sum + j.totalDurationMs, 0) / completed.length
        : 0,
      avgEventsPerJourney: completed.length > 0
        ? completed.reduce((sum, j) => sum + j.events.length, 0) / completed.length
        : 0,
      bounceRate,
      topEntryPoints,
      topExitPoints,
      commonPaths,
    };
  }

  /** Analyze common paths through the site */
  analyzePaths(minFrequency = 2): PathAnalysis[] {
    const completed = Array.from(this.journeys.values()).filter((j) => j.endedAt);
    const pathMap = new Map<string, { journeys: UserJourney[]; times: number[] }>();

    for (const j of completed) {
      const pathKey = j.pages.map((p) => p.path).join("|");
      let entry = pathMap.get(pathKey);
      if (!entry) {
        entry = { journeys: [], times: [] };
        pathMap.set(pathKey, entry);
      }
      entry.journeys.push(j);
      entry.times.push(j.totalDurationMs);
    }

    return Array.from(pathMap.entries())
      .filter(([, v]) => v.journeys.length >= minFrequency)
      .map(([pathStr, data]) => {
        const path = pathStr.split("|");
        const conversions = data.journeys.filter((j) => j.converted).length;

        // Drop-off rates per step
        const stepDropOffRates: number[] = [];
        for (let i = 0; i < path.length; i++) {
          const atThisStep = data.journeys.filter((j) =>
            j.pages.length > i
          ).length;
          const atNextStep = data.journeys.filter((j) =>
            j.pages.length > i + 1
          ).length;
          const total = Math.max(atThisStep, 1);
          stepDropOffRates.push((total - atNextStep) / total);
        }

        // Typical drop-off (steepest)
        let maxDropIdx = 0;
        let maxDropVal = 0;
        stepDropOffRates.forEach((rate, idx) => {
          if (rate > maxDropVal) { maxDropVal = rate; maxDropIdx = idx; }
        });

        return {
          path,
          frequency: data.journeys.length,
          percentage: completed.length > 0 ? data.journeys.length / completed.length : 0,
          conversionRate: data.journeys.length > 0 ? conversions / data.journeys.length : 0,
          avgTimeMs: data.times.length > 0
            ? data.times.reduce((a, b) => a + b, 0) / data.times.length
            : 0,
          typicalDropOffIndex: maxDropIdx,
          stepDropOffRates,
        };
      })
      .sort((a, b) => b.frequency - a.frequency);
  }

  /** Destroy the tracker */
  destroy(): void {
    this.destroyed = true;
    this.endJourney();
    for (const fn of this.cleanupFns) { try { fn(); } catch {} }
    this.cleanupFns = [];
  }

  // --- Private ---

  private setupPageTracking(): void {
    const handler = () => {
      const journey = this.getCurrentJourney();
      if (journey && !journey.endedAt) {
        this.recordPage(journey);
      }
    };

    // Use pushState/popstate for SPA detection
    const originalPush = history.pushState.bind(history);
    history.pushState = (...args) => {
      originalPush(...args);
      handler();
    };

    const originalReplace = history.replaceState.bind(history);
    history.replaceState = (...args) => {
      originalReplace(...args);
      handler();
    };

    window.addEventListener("popstate", handler);

    this.cleanupFns.push(() => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      window.removeEventListener("popstate", handler);
    });
  }

  private setupClickTracking(): void {
    const handler = () => {
      this.recordEvent("click");
    };
    document.addEventListener("click", handler, { passive: true });
    this.cleanupFns.push(() => document.removeEventListener("click", handler));
  }

  private classifyJourney(journey: UserJourney): string[] {
    const tags: string[] = [];

    if (journey.converted) tags.push("converted");
    if (journey.pages.length === 1) tags.push("bounce");
    if (journey.pages.length <= 2) tags.push("short_session");
    if (journey.pages.length >= 5) tags.push("engaged");
    if (journey.totalDurationMs > 300000) tags.push("long_session");

    // Check for specific patterns
    const paths = journey.pages.map((p) => p.path);
    if (paths.some((p) => p.includes("/pricing") || p.includes("/checkout"))) {
      tags.push("commerce_intent");
    }
    if (paths.some((p) => p.includes("/signup") || p.includes("/register"))) {
      tags.push("acquisition");
    }
    if (paths.some((p) => p.includes("/help") || p.includes("/support"))) {
      tags.push("support_seeker");
    }

    return tags;
  }

  private parseUTMParams(): Record<string, string> {
    if (typeof window === "undefined") return {};

    try {
      const params = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      for (const [key, value] of params) {
        if (key.startsWith("utm_")) utm[key.slice(4)] = value;
      }
      return utm;
    } catch {
      return {};
    }
  }

  private persistActiveJourney(): void {
    if (this.activeJourneyId) {
      try { sessionStorage.setItem(`${this.config.storagePrefix}active`, this.activeJourneyId); } catch {}
    }
  }

  private restoreActiveJourney(): void {
    try {
      const stored = sessionStorage.getItem(`${this.config.storagePrefix}active`);
      if (stored) {
        this.activeJourneyId = stored;
        // Check if still valid
        const journey = this.journeys.get(stored);
        if (journey && !journey.endedAt) {
          // Check session timeout
          if (Date.now() - journey.startedAt > this.config.sessionTimeoutMs) {
            this.endJourney();
          }
        } else {
          this.activeJourneyId = null;
          sessionStorage.removeItem(`${this.config.storagePrefix}active`);
        }
      }
    } catch {}
  }

  private clearActiveJourney(): void {
    this.activeJourneyId = null;
    try { sessionStorage.removeItem(`${this.config.storagePrefix}active`); } catch {}
  }
}

function lastPageUrl(journey: UserJourney): string | null {
  if (journey.pages.length === 0) return null;
  return journey.pages[journey.pages.length - 1].url;
}

/** Create a pre-configured journey tracker */
export function createJourneyTracker(config?: JourneyConfig): JourneyTracker {
  return new JourneyTracker(config);
}
