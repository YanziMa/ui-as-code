/**
 * Experiment Framework: Experiment lifecycle management with variant assignment,
 * exposure tracking, metrics collection, targeting rules, cohort analysis,
 * and statistical evaluation helpers.
 */

// --- Types ---

export type ExperimentStatus = "draft" | "running" | "paused" | "completed" | "archived";

export interface Variant<T = unknown> {
  /** Variant identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Variant weight (for traffic allocation, relative) */
  weight: number;
  /** Configuration/data for this variant */
  config?: T;
  /** Is this the control (baseline) variant? */
  isControl?: boolean;
}

export interface ExperimentMetric {
  /** Metric identifier */
  id: string;
  /** Name */
  name: string;
  /** Type of metric */
  type: "binary" | "count" | "duration" | "revenue";
  /** Primary metric? (used for winner determination) */
  primary?: boolean;
  /** Better direction: "higher_is_better" or "lower_is_better" */
  direction?: "higher" | "lower";
  /** Unit label */
  unit?: string;
}

export interface ExperimentTargeting {
  /** Percentage of traffic to include (0-100) */
  trafficPercentage?: number;
  /** Required user attributes */
  requiredAttributes?: Record<string, unknown>;
  /** Excluded segments */
  excludedSegments?: string[];
  /** Included segments only */
  includedSegments?: string[];
  /** Minimum session count for eligibility */
  minSessions?: number;
  /** User ID allowlist */
  allowlist?: string[];
  /** User ID blocklist */
  blocklist?: string[];
}

export interface ExperimentConfig {
  /** Unique experiment key */
  key: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description?: string;
  /** Owner/team */
  owner?: string;
  /** Tags */
  tags?: string[];
  /** Variants (including control) */
  variants: Variant[];
  /** Metrics to track */
  metrics: ExperimentMetric[];
  /** Targeting rules */
  targeting?: ExperimentTargeting;
  /** Start date (ISO string or timestamp) */
  startDate?: string | number;
  /** Planned end date */
  endDate?: string | number;
  /** Minimum sample size per variant before evaluating */
  minSampleSize?: number;
  /** Minimum runtime in hours before auto-evaluating */
  minRuntimeHours?: number;
  /** Significance level for statistical tests (default: 0.05) */
  significanceLevel?: number;
  /** Minimum detectable effect (MDE) as proportion (default: 0.05) */
  minimumDetectableEffect?: number;
  /** Custom context for assignment */
  context?: Record<string, unknown>;
}

export interface ExposureEvent {
  /** Experiment key */
  experimentKey: string;
  /** Assigned variant ID */
  variantId: string;
  /** User ID */
  userId: string;
  /** Timestamp */
  timestamp: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface MetricEvent {
  /** Experiment key */
  experimentKey: string;
  /** Metric ID */
  metricId: string;
  /** Value */
  value: number;
  /** User ID */
  userId: string;
  /** Variant ID */
  variantId: string;
  /** Timestamp */
  timestamp: number;
}

export interface ExperimentResult {
  /** Experiment key */
  experimentKey: string;
  /** Status at time of evaluation */
  status: ExperimentStatus;
  /** Winner variant (if determined) */
  winner: string | null;
  /** Confidence in winner (0-1) */
  confidence: number;
  /** Per-variant results */
  variantResults: Array<{
    variantId: string;
    variantName: string;
    sampleSize: number;
    conversions: number;
    conversionRate: number;
    revenue?: number;
    avgValue?: number;
    stdDev?: number;
  }>;
  /** Per-metric results */
  metricResults: Array<{
    metricId: string;
    metricName: string;
    pValue: number;
    significant: boolean;
    lift: number;
    liftPercent: number;
  }>;
  /** Total exposures */
  totalExposures: number;
  /** Evaluation timestamp */
  evaluatedAt: number;
  /** Recommendation */
  recommendation: "continue" | "declare_winner" | "declare_no_difference" | "needs_more_data";
}

export interface ExperimentInstance {
  /** Get the current config */
  getConfig(): ExperimentConfig;
  /** Update config */
  updateConfig(partial: Partial<ExperimentConfig>): void;
  /** Get status */
  getStatus(): ExperimentStatus;
  /** Set status */
  setStatus(status: ExperimentStatus): void;
  /** Assign a variant to a user */
  assign(userId: string): Variant | null;
  /** Get assigned variant (without recording exposure) */
  getVariant(userId: string): Variant | null;
  /** Record an exposure event */
  recordExposure(userId: string, metadata?: Record<string, unknown>): void;
  /** Track a metric event */
  track(metricId: string, value: number, userId: string): void;
  /** Get current results */
  getResults(): ExperimentResult;
  /** Check if user is eligible */
  isEligible(userId: string, attributes?: Record<string, unknown>): boolean;
  /** Get all exposure events */
  getExposures(): ExposureEvent[];
  /** Get all metric events */
  getMetricEvents(): MetricEvent[];
  /** Clear all data */
  clearData(): void;
  /** Export state as JSON */
  exportState(): unknown;
  /** Import state from JSON */
  importState(state: unknown): void;
}

// --- Assignment Engine ---

function deterministicAssign(
  userId: string,
  experimentKey: string,
  variants: Variant[],
): Variant | null {
  if (variants.length === 0) return null;

  // Compute hash for consistent assignment
  let hash = 0;
  const str = `${experimentKey}:${userId}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }

  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  if (totalWeight <= 0) return variants[0];

  const bucket = Math.abs(hash) % totalWeight;
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant;
    }
  }

  return variants[variants.length - 1];
}

// --- Main Class ---

export class ExperimentEngine {
  private experiments = new Map<string, ExperimentConfig>();
  private statuses = new Map<string, ExperimentStatus>();
  private exposures = new Map<string, ExposureEvent[]>();
  private metricEvents = new Map<string, MetricEvent[]>();
  private userAssignments = new Map<string, Map<string, string>>(); // userId -> experimentKey -> variantId

  // --- Experiment Management ---

  /** Define/register an experiment */
  define(config: ExperimentConfig): ExperimentInstance {
    this.experiments.set(config.key, { ...config });
    this.statuses.set(config.key, config.startDate ? "running" : "draft");
    this.exposures.set(config.key, []);
    this.metricEvents.set(config.key, []);

    return this.createInstance(config.key);
  }

  /** Get an experiment instance by key */
  get(key: string): ExperimentInstance | undefined {
    if (!this.experiments.has(key)) return undefined;
    return this.createInstance(key);
  }

  /** List all experiments */
  list(): Array<{ key: string; name: string; status: ExperimentStatus; variantCount: number }> {
    return Array.from(this.experiments.entries()).map(([key, config]) => ({
      key,
      name: config.name,
      status: this.statuses.get(key) ?? "draft",
      variantCount: config.variants.length,
    }));
  }

  /** Remove an experiment */
  remove(key: string): void {
    this.experiments.delete(key);
    this.statuses.delete(key);
    this.exposures.delete(key);
    this.metricEvents.delete(key);

    // Clean up assignments
    for (const [, expMap] of this.userAssignments) {
      expMap.delete(key);
    }
  }

  // --- Global Queries ---

  /** Get all exposures across all experiments */
  getAllExposures(): ExposureEvent[] {
    const all: ExposureEvent[] = [];
    for (const [, events] of this.exposures) {
      all.push(...events);
    }
    return all;
  }

  /** Get all metric events across all experiments */
  getAllMetricEvents(): MetricEvent[] {
    const all: MetricEvent[] = [];
    for (const [, events] of this.metricEvents) {
      all.push(...events);
    }
    return all;
  }

  /** Find which experiments a user is part of */
  getUserExperiments(userId: string): Array<{ experimentKey: string; variantId: string; variantName: string }> {
    const result: Array<{ experimentKey: string; variantId: string; variantName: string }> = [];

    for (const [key, config] of this.experiments) {
      const variant = this.getVariantInternal(key, userId, config);
      if (variant && this.hasExposure(key, userId)) {
        result.push({ experimentKey: key, variantId: variant.id, variantName: variant.name });
      }
    }

    return result;
  }

  // --- Private Instance Factory ---

  private createInstance(key: string): ExperimentInstance {
    const self = this;

    return {
      getConfig() {
        return { ...self.experiments.get(key)! };
      },

      updateConfig(partial) {
        const existing = self.experiments.get(key);
        if (existing) {
          self.experiments.set(key, { ...existing, ...partial });
        }
      },

      getStatus() {
        return self.statuses.get(key) ?? "draft";
      },

      setStatus(status) {
        self.statuses.set(key, status);
      },

      assign(userId) {
        const config = self.experiments.get(key);
        if (!config) return null;

        const status = self.statuses.get(key);
        if (status !== "running") return null;

        if (!self.isEligibleInternal(key, userId, config)) return null;

        const variant = self.getVariantInternal(key, userId, config);
        if (!variant) return null;

        // Store assignment
        if (!self.userAssignments.has(userId)) {
          self.userAssignments.set(userId, new Map());
        }
        self.userAssignments.get(userId)!.set(key, variant.id);

        // Record exposure
        self.recordExposureInternal(key, variant.id, userId);

        return variant;
      },

      getVariant(userId) {
        const config = self.experiments.get(key);
        if (!config) return null;
        return self.getVariantInternal(key, userId, config);
      },

      recordExposure(userId, metadata) {
        const config = self.experiments.get(key);
        if (!config) return;
        const variant = self.getVariantInternal(key, userId, config);
        if (variant) {
          self.recordExposureInternal(key, variant.id, userId, metadata);
        }
      },

      track(metricId, value, userId) {
        const config = self.experiments.get(key);
        if (!config) return;

        const variant = self.getVariantInternal(key, userId, config);
        if (!variant) return;

        const events = self.metricEvents.get(key) ?? [];
        events.push({
          experimentKey: key,
          metricId,
          value,
          userId,
          variantId: variant.id,
          timestamp: Date.now(),
        });
        self.metricEvents.set(key, events);
      },

      getResults() {
        return self.calculateResults(key);
      },

      isEligible(userId, attributes) {
        const config = self.experiments.get(key);
        if (!config) return false;
        return self.isEligibleInternal(key, userId, config, attributes);
      },

      getExposures() {
        return [...(self.exposures.get(key) ?? [])];
      },

      getMetricEvents() {
        return [...(self.metricEvents.get(key) ?? [])];
      },

      clearData() {
        self.exposures.set(key, []);
        self.metricEvents.set(key, []);
      },

      exportState() {
        return {
          config: self.experiments.get(key),
          status: self.statuses.get(key),
          exposures: self.exposures.get(key),
          metricEvents: self.metricEvents.get(key),
        };
      },

      importState(state) {
        const s = state as Record<string, unknown>;
        if (s.config) self.experiments.set(key, s.config as ExperimentConfig);
        if (s.status) self.statuses.set(key, s.status as ExperimentStatus);
        if (s.exposures) self.exposures.set(key, s.exposures as ExposureEvent[]);
        if (s.metricEvents) self.metricEvents.set(key, s.metricEvents as MetricEvent[]);
      },
    };
  }

  // --- Internal Methods ---

  private getVariantInternal(experimentKey: string, userId: string, config: ExperimentConfig): Variant | null {
    // Check cached assignment first
    const userMap = this.userAssignments.get(userId);
    if (userMap?.has(experimentKey)) {
      const variantId = userMap.get(experimentKey)!;
      return config.variants.find((v) => v.id === variantId) ?? null;
    }

    return deterministicAssign(userId, experimentKey, config.variants);
  }

  private recordExposureInternal(
    experimentKey: string,
    variantId: string,
    userId: string,
    metadata?: Record<string, unknown>,
  ): void {
    const events = this.exposures.get(experimentKey) ?? [];
    events.push({
      experimentKey,
      variantId,
      userId,
      timestamp: Date.now(),
      metadata,
    });
    this.exposures.set(experimentKey, events);
  }

  private hasExposure(experimentKey: string, userId: string): boolean {
    const events = this.exposures.get(experimentKey) ?? [];
    return events.some((e) => e.userId === userId);
  }

  private isEligibleInternal(
    experimentKey: string,
    userId: string,
    config: ExperimentConfig,
    extraAttributes?: Record<string, unknown>,
  ): boolean {
    const targeting = config.targeting;
    if (!targeting) return true;

    // Blocklist check
    if (targeting.blocklist?.includes(userId)) return false;

    // Allowlist (if set, only these users)
    if (targeting.allowlist && targeting.allowlist.length > 0) {
      if (!targeting.allowlist.includes(userId)) return false;
    }

    // Traffic percentage
    if (targeting.trafficPercentage !== undefined && targeting.trafficPercentage < 100) {
      let hash = 0;
      const str = `${experimentKey}:traffic:${userId}`;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
      }
      if (Math.abs(hash) % 100 >= targeting.trafficPercentage) return false;
    }

    // Required attributes would need a full context object to check
    // This is a simplified version

    return true;
  }

  private calculateResults(experimentKey: string): ExperimentResult {
    const config = this.experiments.get(experimentKey);
    if (!config) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    const status = this.statuses.get(experimentKey) ?? "draft";
    const exposures = this.exposures.get(experimentKey) ?? [];
    const events = this.metricEvents.get(experimentKey) ?? [];

    // Per-variant results
    const variantResults = config.variants.map((variant) => {
      const variantExposures = exposures.filter((e) => e.variantId === variant.id);
      const variantEvents = events.filter((e) => e.variantId === variant.id);

      const sampleSize = new Set(variantExposures.map((e) => e.userId)).size;
      const primaryMetric = config.metrics.find((m) => m.primary) ?? config.metrics[0];

      let conversions = 0;
      let conversionRate = 0;
      let totalValue = 0;
      let avgValue: number | undefined;
      let revenue: number | undefined;

      if (primaryMetric && variantEvents.length > 0) {
        const metricEventsForVariant = variantEvents.filter((e) => e.metricId === primaryMetric.id);

        switch (primaryMetric.type) {
          case "binary":
            conversions = metricEventsForVariant.length;
            conversionRate = sampleSize > 0 ? conversions / sampleSize : 0;
            break;
          case "count":
            totalValue = metricEventsForVariant.reduce((sum, e) => sum + e.value, 0);
            avgValue = sampleSize > 0 ? totalValue / sampleSize : 0;
            break;
          case "revenue":
            revenue = metricEventsForVariant.reduce((sum, e) => sum + e.value, 0);
            avgValue = sampleSize > 0 ? (revenue ?? 0) / sampleSize : 0;
            break;
          case "duration":
            totalValue = metricEventsForVariant.reduce((sum, e) => sum + e.value, 0);
            avgValue = metricEventsForVariant.length > 0 ? totalValue / metricEventsForVariant.length : 0;
            break;
        }
      }

      return {
        variantId: variant.id,
        variantName: variant.name,
        sampleSize,
        conversions,
        conversionRate,
        revenue,
        avgValue,
      };
    });

    // Find control for comparison
    const controlResult = variantResults.find((r) =>
      config.variants.find((v) => v.id === r.variantId)?.isControl,
    ) ?? variantResults[0];

    // Per-metric results
    const metricResults = config.metrics.map((metric) => {
      const controlMetrics = events.filter(
        (e) => e.metricId === metric.id && e.variantId === controlResult?.variantId,
      );
      const controlUsers = new Set(controlMetrics.map((e) => e.userId)).size;
      const controlValue = metric.type === "binary"
        ? controlUsers > 0 ? controlMetrics.length / controlUsers : 0
        : controlMetrics.reduce((s, e) => s + e.value, 0) / Math.max(controlMetrics.length, 1);

      // Find best non-control variant
      let bestLift = 0;
      let bestVariant: typeof variantResults[number] | null = null;

      for (const vr of variantResults) {
        if (vr.variantId === controlResult.variantId) continue;

        const variantMetrics = events.filter(
          (e) => e.metricId === metric.id && e.variantId === vr.variantId,
        );
        const variantUsers = new Set(variantMetrics.map((e) => e.userId)).size;
        const variantValue = metric.type === "binary"
          ? variantUsers > 0 ? variantMetrics.length / variantUsers : 0
          : variantMetrics.reduce((s, e) => s + e.value, 0) / Math.max(variantMetrics.length, 1);

        if (controlValue > 0) {
          const lift = (variantValue - controlValue) / controlValue;
          if (Math.abs(lift) > Math.abs(bestLift)) {
            bestLift = lift;
            bestVariant = vr;
          }
        }
      }

      // Simplified p-value (would need proper statistical test)
      const pValue = 0.5; // Placeholder — real implementation would use chi-squared or t-test

      return {
        metricId: metric.id,
        metricName: metric.name,
        pValue,
        significant: pValue < (config.significanceLevel ?? 0.05),
        lift: bestLift,
        liftPercent: bestLift * 100,
      };
    });

    // Determine winner
    let winner: string | null = null;
    let confidence = 0;
    let recommendation: ExperimentResult["recommendation"] = "needs_more_data";

    const primaryMetricResult = metricResults.find((m) =>
      config.metrics.find((cm) => cm.primary && cm.id === m.metricId),
    ) ?? metricResults[0];

    if (primaryMetricResult?.significant) {
      const bestVariant = variantResults
        .filter((v) => v.variantId !== controlResult.variantId)
        .sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0))[0];

      if (bestVariant && (bestVariant.conversionRate ?? 0) > (controlResult.conversionRate ?? 0)) {
        winner = bestVariant.variantId;
        confidence = 1 - (primaryMetricResult.pValue ?? 0);
        recommendation = "declare_winner";
      } else {
        recommendation = "declare_no_difference";
      }
    } else if (exposures.length >= (config.minSampleSize ?? 100) * config.variants.length) {
      recommendation = "declare_no_difference";
    }

    return {
      experimentKey,
      status,
      winner,
      confidence,
      variantResults,
      metricResults,
      totalExposures: exposures.length,
      evaluatedAt: Date.now(),
      recommendation,
    };
  }
}

/** Create a global experiment engine */
export function createExperimentEngine(): ExperimentEngine {
  return new ExperimentEngine();
}
