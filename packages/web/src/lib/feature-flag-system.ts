/**
 * Feature Flag System: Comprehensive feature flag management with targeting rules,
 * A/B testing, percentage rollouts, user segmentation, environment-based flags,
 * flag dependencies, change history, analytics, persistence, SDK-like API,
 * admin dashboard data structures, and multi-provider support.
 */

// --- Types ---

export type FlagType = "boolean" | "string" | "number" | "json";
export type FlagStatus = "active" | "inactive" | "draft" | "archived";

export interface FeatureFlag {
  id: string;
  key: string;                    // Unique identifier (e.g., "new-dashboard")
  name: string;
  description?: string;
  type: FlagType;
  value: boolean | string | number | object;
  defaultValue: boolean | string | number | object;
  status: FlagStatus;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
  tags: string[];
  environment?: string;           // "production", "staging", "development"
  targetUsers?: string[];        // Specific user IDs
  targetPercentage?: number;     // 0-100 rollout percentage
  targetSegments?: string[];    // Segment names
  schedule?: {
    startAt?: number;            // Unix timestamp
    endAt?: number;
  };
  dependencies?: string[];       // Other flag keys this depends on
  variants?: Array<{
    key: string;
    value: unknown;
    weight: number;             // 0-100
  }>;
  strategy?: "rollout" | "a_b_test" | "canary" | "targeted" | "environment" | "progressive";
  metrics?: {
    evaluations: number;         // Total times evaluated
    trueCount: number;          // Times returned true
    exposureStart?: number;      // When first exposed
  };
  metadata?: Record<string, unknown>;
}

export interface SegmentDefinition {
  id: string;
  name: string;
  description?: string;
  conditions: SegmentCondition[];
  createdAt: number;
  userCount?: number;
}

export interface SegmentCondition {
  field: string;
  operator: "eq" | "neq" | "contains" | "notContains" | "in" | "notIn"
    | "gt" | "gte" | "lt" | "lte" | "regex" | "exists" | "notExists"
    | "startsWith" | "endsWith" | "between" | "isEmpty" | "isNotEmpty";
  value: unknown;
}

export interface EvaluationContext {
  userId?: string;
  sessionId?: string;
  attributes?: Record<string, unknown>;
  environment?: string;
  timestamp?: number;
  forceValues?: Record<string, unknown>; // Override for testing
  dryRun?: boolean;               // Don't record metrics
}

export interface EvaluationResult {
  flagKey: string;
  value: unknown;
  source: "default" | "override" | "segment" | "percentage" | "variant" | "dependency" | "scheduled" | "forced";
  reason?: string;
  matchedSegment?: string;
  variantKey?: string;
  timestamp: number;
  evaluationTimeMs: number;
}

export interface FlagChange {
  flagId: string;
  previousValue: unknown;
  newValue: unknown;
  changedBy?: string;
  timestamp: number;
}

// --- Feature Flag Store ---

export class FeatureFlagStore {
  private flags = new Map<string, FeatureFlag>();
  private segments = new Map<string, SegmentDefinition>();
  private overrides = new Map<string, Map<string, unknown>>(); // userId -> flagKey -> value
  private listeners = new Set<(change: FlagChange) => void>();
  private changeHistory: FlagChange[] = [];
  private maxHistory = 1000;
  private evaluationListeners = new Set<(result: EvaluationResult) => void>();

  /** Create or update a feature flag */
  upsert(flag: Omit<FeatureFlag, "createdAt" | "updatedAt">): FeatureFlag {
    const existing = this.flags.get(flag.key);
    const now = Date.now();

    if (existing) {
      const previousValue = existing.value;
      const updated: FeatureFlag = { ...existing, ...flag, updatedAt: now };
      this.flags.set(flag.key, updated);

      if (previousValue !== flag.value) {
        const change: FlagChange = { flagId: flag.id, previousValue, newValue: flag.value, changedBy: flag.updatedBy, timestamp: now };
        this.changeHistory.push(change);
        if (this.changeHistory.length > this.maxHistory) this.changeHistory.shift();
        for (const l of this.listeners) l(change);
      }

      return updated;
    }

    const newFlag: FeatureFlag = { ...flag, createdAt: now, updatedAt: now, id: flag.id ?? `flag-${now}` };
    this.flags.set(flag.key, newFlag);
    return newFlag;
  }

  /** Get a flag by key */
  getFlag(key: string): FeatureFlag | undefined { return this.flags.get(key); }

  /** Get all flags */
  getAllFlags(options?: { status?: FlagStatus; environment?: string; tags?: string[] }): FeatureFlag[] {
    let result = Array.from(this.flags.values());
    if (options?.status) result = result.filter((f) => f.status === options.status);
    if (options?.environment) result = result.filter((f) => f.environment === options.environment || !f.environment);
    if (options?.tags && options.tags.length > 0) result = result.filter((f) => options.tags.some((t) => f.tags.includes(t)));
    return result;
  }

  /** Remove a flag */
  remove(key: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    this.flags.delete(key);
    return true;
  }

  /** Archive a flag */
  archive(key: string): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;
    flag.status = "archived";
    return true;
  }

  /** Evaluate a single flag for a context */
  evaluate(key: string, context: EvaluationContext = {}): EvaluationResult {
    const start = Date.now();
    const flag = this.flags.get(key);

    // Check forced override
    if (context.forceValues && key in context.forceValues) {
      return this.buildResult(key, context.forceValues[key]!, "forced", Date.now() - start);
    }

    // Check per-user override
    if (context.userId && this.overrides.has(context.userId)) {
      const userOverrides = this.overrides.get(context.userId)!;
      if (key in userOverrides) {
        return this.buildResult(key, userOverrides[key]!, "override", Date.now() - start);
      }
    }

    // Flag doesn't exist
    if (!flag) {
      return { flagKey: key, value: null, source: "default", reason: "Flag not found", timestamp: Date.now(), evaluationTimeMs: Date.now() - start };
    }

    // Check status
    if (flag.status !== "active") {
      return this.buildResult(key, flag.defaultValue, "default", Date.now() - start, "Flag is not active");
    }

    // Check environment
    if (flag.environment && context.environment && flag.environment !== context.environment) {
      return this.buildResult(key, flag.defaultValue, "default", Date.now() - start, "Environment mismatch");
    }

    // Check schedule
    if (flag.schedule) {
      const now = context.timestamp ?? Date.now();
      if (flag.schedule.startAt && now < flag.schedule.startAt) {
        return this.buildResult(key, flag.defaultValue, "scheduled", Date.now() - start, "Not yet started");
      }
      if (flag.schedule.endAt && now > flag.schedule.endAt) {
        return this.buildResult(key, flag.defaultValue, "scheduled", Date.now() - start, "Has ended");
      }
    }

    // Check dependencies
    if (flag.dependencies?.length) {
      for (const depKey of flag.dependencies) {
        const depResult = this.evaluate(depKey, context);
        if (!this.isTruthy(depResult.value)) {
          return this.buildResult(key, flag.defaultValue, "dependency", Date.now() - start, `Dependency '${depKey}' is not met`);
        }
      }
    }

    // Check targeted users
    if (flag.targetUsers?.length && context.userId) {
      if (flag.targetUsers.includes(context.userId)) {
        return this.buildResult(key, flag.value, "targeted", Date.now() - start);
      }
    }

    // Check segments
    if (flag.targetSegments?.length) {
      for (const segName of flag.targetSegments) {
        const segment = this.segments.get(segName);
        if (segment && this.matchesSegment(segment, context)) {
          return this.buildResult(key, flag.value, "segment", Date.now() - start, segName);
        }
      }
    }

    // Check percentage rollout
    if (flag.targetPercentage != null && flag.targetPercentage < 100) {
      const hash = this.deterministicHash(key, context.userId ?? context.sessionId ?? "");
      const bucket = hash % 100;
      if (bucket < flag.targetPercentage) {
        return this.buildResult(key, flag.value, "percentage", Date.now() - start);
      }
      return this.buildResult(key, flag.defaultValue, "default", Date.now() - start, `Outside ${flag.targetPercentage}% rollout`);
    }

    // Check variants (A/B testing)
    if (flag.variants?.length) {
      const variant = this.selectVariant(flag.variants, key, context);
      if (variant) {
        return this.buildResult(key, variant.value, "variant", Date.now() - start, undefined, variant.key);
      }
    }

    // Default: flag is active, return its value
    const result = this.buildResult(key, flag.value, "default", Date.now() - start);

    // Track metrics (unless dry run)
    if (!context.dryRun && flag.metrics) {
      flag.metrics.evaluations++;
      if (this.isTruthy(result.value)) flag.metrics.trueCount++;
      if (!flag.metrics.exposureStart) flag.metrics.exposureStart = Date.now();
    }

    // Notify evaluation listeners
    for (const l of this.evaluationListeners) l(result);

    return result;
  }

  /** Evaluate multiple flags at once */
  evaluateMultiple(keys: string[], context: EvaluationContext = {}): Record<string, EvaluationResult> {
    const results: Record<string, EvaluationResult> = {};
    for (const key of keys) results[key] = this.evaluate(key, context);
    return results;
  }

  /** Evaluate all active flags */
  evaluateAll(context: EvaluationContext = {}): Record<string, EvaluationResult> {
    return this.evaluateMultiple(
      Array.from(this.flags.values()).filter((f) => f.status === "active").map((f) => f.key),
      context,
    );
  }

  /** Quick boolean check */
  isEnabled(key: string, context?: EvaluationContext): boolean {
    return this.isTruthy(this.evaluate(key, context ?? {}).value);
  }

  /** Set a per-user override */
  setOverride(userId: string, flagKey: string, value: unknown): void {
    if (!this.overrides.has(userId)) this.overrides.set(userId, new Map());
    this.overrides.get(userId)!.set(flagKey, value);
  }

  /** Clear a per-user override */
  clearOverride(userId: string, flagKey?: string): void {
    if (flagKey) this.overrides.get(userId)?.delete(flagKey);
    else this.overrides.delete(userId);
  }

  /** Register a segment definition */
  registerSegment(segment: SegmentDefinition): void { this.segments.set(segment.id, segment); }

  /** Remove a segment */
  removeSegment(id: string): void { this.segments.delete(id); }

  /** Get all segments */
  getSegments(): SegmentDefinition[] { return Array.from(this.segments.values()); }

  /** Listen for flag changes */
  onChange(listener: (change: FlagChange) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Listen to every evaluation */
  onEvaluation(listener: (result: EvaluationResult) => void): () => void {
    this.evaluationListeners.add(listener);
    return () => this.evaluationListeners.delete(listener);
  }

  /** Get change history */
  getChangeHistory(limit = 50): FlagChange[] { return this.changeHistory.slice(-limit); }

  /** Get flag stats */
  getFlagStats(key: string): FeatureFlag["metrics"] | undefined {
    return this.flags.get(key)?.metrics;
  }

  /** Export all state as JSON */
  exportState(): object {
    return {
      flags: Object.fromEntries(Array.from(this.flags.entries()).map(([k, v]) => [k, { ...v }])),
      segments: Object.fromEntries(this.segments.entries()),
      changeHistory: this.changeHistory.slice(-100),
    };
  }

  /** Import state from JSON */
  importState(data: { flags?: Record<string, Omit<FeatureFlag, never">>; segments?: Record<string, SegmentDefinition> }): void {
    if (data.flags) {
      for (const [, flag] of Object.entries(data.flags)) this.upsert(flag);
    }
    if (data.segments) {
      for (const [, seg] of Object.entries(data.segments)) this.registerSegment(seg);
    }
  }

  // --- Internal ---

  private buildResult(flagKey: string, value: unknown, source: EvaluationResult["source"], evalMs: number, reason?: string, variantKey?: string): EvaluationResult {
    return { flagKey, value, source: reason ? `${source}: ${reason}` : source, reason, variantKey, timestamp: Date.now(), evaluationTimeMs: evalMs };
  }

  private matchesSegment(segment: SegmentDefinition, context: EvaluationContext): boolean {
    const attrs = context.attributes ?? {};
    for (const cond of segment.conditions) {
      const val = attrs[cond.field];
      if (!this.evaluateCondition(val, cond.operator, cond.value)) return false;
    }
    return true;
  }

  private evaluateCondition(value: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case "eq": return value === expected;
      case "neq": return value !== expected;
      case "contains": return String(value).includes(String(expected));
      case "notContains": return !String(value).includes(String(expected));
      case "in": return Array.isArray(expected) ? expected.includes(value) : false;
      case "notIn": return Array.isArray(expected) ? !expected.includes(value) : false;
      case "gt": return Number(value) > Number(expected);
      case "gte": return Number(value) >= Number(expected);
      case "lt": return Number(value) < Number(expected);
      case "lte": return Number(value) <= Number(expected);
      case "regex": return new RegExp(String(expected)).test(String(value));
      case "exists": return value !== undefined && value !== null;
      case "notExists": return value === undefined || value === null;
      case "startsWith": return String(value).startsWith(String(expected));
      case "endsWith": return String(value).endsWith(String(expected));
      case "between":
        const arr = Array.isArray(expected) ? expected : [expected, expected];
        const n = Number(value);
        return n >= Number(arr[0]) && n <= Number(arr[1]);
      case "isEmpty": return value === "" || value === null || value === undefined || (Array.isArray(value) && value.length === 0);
      case "isNotEmpty": return value !== "" && value !== null && value !== undefined && !(Array.isArray(value) && value.length === 0);
      default: return false;
    }
  }

  private selectVariant(variants: NonNullable<FeatureFlag["variants"]>, flagKey: string, context: EvaluationContext): { key: string; value: unknown } | null {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let hash = this.deterministicHash(flagKey + "-variant", context.userId ?? context.sessionId ?? "") % totalWeight;

    for (const variant of variants) {
      if (hash < variant.weight) return variant;
      hash -= variant.weight;
    }
    return null;
  }

  private deterministicHash(seed: string, salt: string): number {
    let hash = 0;
    const str = seed + "|" + salt;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  private isTruthy(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value !== "" && value !== "false" && value !== "0";
    if (Array.isArray(value)) return value.length > 0;
    if (value != null) return true;
    return false;
  }
}

// --- Remote Flag Provider Interface ---

export interface RemoteFlagProvider {
  name: string;
  initialize(config?: Record<string, unknown>): Promise<void>;
  fetchFlags(): Promise<FeatureFlag[]>;
  trackEvent(event: string, data?: Record<string, unknown>): void;
}

// --- Analytics Collector ---

export class FlagAnalytics {
  private events: Array<{ event: string; data: Record<string, unknown>; timestamp: number }> = [];

  track(event: string, data: Record<string, unknown> = {}): void {
    this.events.push({ event, data, timestamp: Date.now() });
  }

  getEvents(limit = 100): typeof this.events { return this.events.slice(-limit); }

  getSummary(): { totalEvents: number; eventsByType: Record<string, number> } {
    const byType: Record<string, number> = {};
    for (const e of this.events) byType[e.event] = (byType[e.event] ?? 0) + 1;
    return { totalEvents: this.events.length, eventsByType: byType };
  }

  clear(): void { this.events.length = 0; }
}
