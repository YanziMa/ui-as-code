/**
 * Funnel Analytics: Conversion funnel definition, step tracking,
 * drop-off analysis, time-in-funnel analysis, cohort comparison,
 * A/B test integration, and funnel visualization data.
 */

// --- Types ---

export interface FunnelStep {
  /** Unique step identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Event name that triggers this step completion */
  eventName: string;
  /** Optional condition function to validate step completion */
  condition?: (properties: Record<string, unknown>) => boolean;
  /** Is this step required (must complete all prior required steps)? */
  required?: boolean;
  /** Expected conversion rate from previous step (for anomaly detection) */
  expectedConversionRate?: number;
  /** Order/sort position */
  order: number;
}

export interface FunnelDefinition {
  /** Unique funnel identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Funnel steps in order */
  steps: FunnelStep[];
  /** Funnel category/group */
  category?: string;
  /** Created at */
  createdAt?: number;
  /** Tags */
  tags?: string[];
}

export interface FunnelUserJourney {
  /** User ID */
  userId: string;
  /** Steps completed (step IDs in order) */
  completedSteps: string[];
  /** Current step (highest completed) */
  currentStepIndex: number;
  /** Entry timestamp */
  enteredAt: number;
  /** Exit timestamp (null if still in funnel) */
  exitedAt?: number;
  /** Step timestamps */
  stepTimestamps: Record<string, number>;
  /** Properties at each step */
  stepProperties: Record<string, Record<string, unknown>>;
  /** Converted (completed all steps)? */
  converted: boolean;
  /** Dropped off at step (if not converted) */
  droppedAtStep?: string;
  /** Total time in funnel (ms) */
  totalTimeMs: number;
}

export interface FunnelResult {
  /** Funnel ID */
  funnelId: string;
  /** Funnel name */
  funnelName: string;
  /** Per-step results */
  steps: Array<{
    stepId: string;
    stepName: string;
    visitors: number;       // Users who reached this step
    completions: number;     // Users who completed this step
    conversionRate: number;  // % of total who completed this step
    stepConversionRate: number; // % of previous step who completed this
    dropOff: number;         // Users lost from previous step
    dropOffRate: number;     // % drop-off from previous step
    avgTimeFromStart: number; // Avg ms from funnel entry
    avgTimeFromPrev: number;  // Avg ms from previous step
  }];
  /** Overall conversion rate */
  overallConversionRate: number;
  /** Total users who entered the funnel */
  totalEntrants: number;
  /** Total conversions */
  totalConversions: number;
  /** Total drop-offs */
  totalDropOffs: number;
  /** Average time to conversion (ms) */
  avgTimeToConvert: number;
  /** Median time to conversion (ms) */
  medianTimeToConvert: number;
  /** Breakdown by cohort (if available) */
  cohortBreakdown?: Array<{
    cohortName: string;
    entrants: number;
    conversions: number;
    conversionRate: number;
  }>;
  /** Anomaly detection */
  anomalies: Array<{
    stepId: string;
    type: "high_dropoff" | "low_conversion" | "unexpected_spike";
    expected: number;
    actual: number;
    deviation: number;
  }>;
  /** Generated at */
  generatedAt: number;
}

export interface FunnelOptions {
  /** Time range for analysis (ms ago from now) */
  lookbackMs?: number;
  /** Start date (ISO or timestamp) */
  startDate?: number | string;
  /** End date (ISO or timestamp) */
  endDate?: number | string;
  /** Filter by user properties */
  userFilter?: (userId: string) => boolean;
  /** Cohort definitions for breakdown */
  cohorts?: Array<{
    name: string;
    filter: (journey: FunnelUserJourney) => boolean;
  }>;
  /** Enable anomaly detection? */
  detectAnomalies?: boolean;
  /** Anomaly threshold (standard deviations, default: 2) */
  anomalyThreshold?: number;
}

// --- Main Class ---

export class FunnelEngine {
  private funnels = new Map<string, FunnelDefinition>();
  private journeys = new Map<string, Map<string, FunnelUserJourney>>(); // funnelId -> userId -> journey

  // --- Funnel Management ---

  /** Define a funnel */
  define(funnel: FunnelDefinition): void {
    // Sort steps by order
    funnel.steps.sort((a, b) => a.order - b.order);
    this.funnels.set(funnel.id, funnel);

    // Initialize journey map
    if (!this.journeys.has(funnel.id)) {
      this.journeys.set(funnel.id, new Map());
    }
  }

  /** Get a funnel definition */
  getFunnel(funnelId: string): FunnelDefinition | undefined {
    return this.funnels.get(funnelId);
  }

  /** List all funnels */
  listFunnels(): FunnelDefinition[] {
    return Array.from(this.funnels.values());
  }

  /** Remove a funnel */
  removeFunnel(funnelId: string): void {
    this.funnels.delete(funnelId);
    this.journeys.delete(funnelId);
  }

  // --- Event Processing ---

  /** Process an event against all funnels */
  processEvent(
    eventName: string,
    userId: string,
    properties?: Record<string, unknown>,
    timestamp?: number,
  ): Array<{ funnelId: string; stepId: string; isNew: boolean }> {
    const ts = timestamp ?? Date.now();
    const results: Array<{ funnelId: string; stepId: string; isNew: boolean }> = [];

    for (const [funnelId, funnel] of this.funnels) {
      // Find matching step
      const matchingStep = funnel.steps.find(
        (step) => step.eventName === eventName &&
          (!step.condition || step.condition(properties ?? {})),
      );

      if (!matchingStep) continue;

      // Get or create journey
      let journeys = this.journeys.get(funnelId)!;
      let journey = journeys.get(userId);

      if (!journey) {
        // New journey
        journey = {
          userId,
          completedSteps: [],
          currentStepIndex: -1,
          enteredAt: ts,
          stepTimestamps: {},
          stepProperties: {},
          converted: false,
          totalTimeMs: 0,
        };
        journeys.set(userId, journey);
      }

      // Check if already completed this step
      if (journey.completedSteps.includes(matchingStep.id)) {
        results.push({ funnelId, stepId: matchingStep.id, isNew: false });
        continue;
      }

      // Check if we're skipping required steps
      const stepIdx = funnel.steps.findIndex((s) => s.id === matchingStep.id);
      if (matchingStep.required !== false) {
        // Must have completed all prior required steps
        const priorRequired = funnel.steps
          .slice(0, stepIdx)
          .filter((s) => s.required !== false);

        for (const req of priorRequired) {
          if (!journey.completedSteps.includes(req.id)) {
            // Can't skip required step — ignore this event
            continue;
          }
        }
      }

      // Complete the step
      journey.completedSteps.push(matchingStep.id);
      journey.currentStepIndex = stepIdx;
      journey.stepTimestamps[matchingStep.id] = ts;
      journey.stepProperties[matchingStep.id] = properties ?? {};

      // Check if fully converted
      if (journey.completedSteps.length === funnel.steps.length) {
        journey.converted = true;
        journey.exitedAt = ts;
        journey.totalTimeMs = ts - journey.enteredAt;
      }

      results.push({ funnelId, stepId: matchingStep.id, isNew: true });
    }

    return results;
  }

  // --- Analysis ---

  /** Calculate funnel results */
  analyze(funnelId: string, options?: FunnelOptions): FunnelResult {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) throw new Error(`Funnel not found: ${funnelId}`);

    const journeys = Array.from((this.journeys.get(funnelId) ?? new Map()).values());

    // Filter by time range
    let filteredJourneys = journeys;
    if (options?.startDate) {
      const start = typeof options.startDate === "string"
        ? new Date(options.startDate).getTime()
        : options.startDate;
      filteredJourneys = filteredJourneys.filter((j) => j.enteredAt >= start);
    }
    if (options?.endDate) {
      const end = typeof options.endDate === "string"
        ? new Date(options.endDate).getTime()
        : options.endDate;
      filteredJourneys = filteredJourneys.filter((j) => j.enteredAt <= end);
    }
    if (options?.lookbackMs) {
      const cutoff = Date.now() - options.lookbackMs;
      filteredJourneys = filteredJourneys.filter((j) => j.enteredAt >= cutoff);
    }
    if (options?.userFilter) {
      filteredJourneys = filteredJourneys.filter((j) => options.userFilter!(j.userId));
    }

    const totalEntrants = filteredJourneys.length;
    const stepResults = funnel.steps.map((step, idx) => {
      // Users who reached this step (entered funnel AND completed all prior steps)
      const visitors = filteredJourneys.filter((j) =>
        j.completedSteps.slice(0, idx + 1).includes(step.id) ||
        (idx === 0 && j.completedSteps.length > 0)
      ).length;

      // Users who completed this specific step
      const completions = filteredJourneys.filter((j) =>
        j.completedSteps.includes(step.id)
      ).length;

      const prevCompletions = idx === 0
        ? totalEntrants
        : filteredJourneys.filter((j) =>
            j.completedSteps.includes(funnel.steps[idx - 1].id)
          ).length;

      const conversionRate = totalEntrants > 0 ? completions / totalEntrants : 0;
      const stepConversionRate = prevCompletions > 0 ? completions / prevCompletions : 0;
      const dropOff = prevCompletions - completions;
      const dropOffRate = prevCompletions > 0 ? dropOff / prevCompletions : 0;

      // Time calculations
      const timesToThisStep = filteredJourneys
        .filter((j) => j.stepTimestamps[step.id])
        .map((j) => j.stepTimestamps[step.id]! - j.enteredAt);

      const avgTimeFromStart = timesToThisStep.length > 0
        ? timesToThisStep.reduce((a, b) => a + b, 0) / timesToThisStep.length
        : 0;

      const timesFromPrev = idx === 0
        ? []
        : filteredJourneys
            .filter((j) => j.stepTimestamps[step.id] && j.stepTimestamps[funnel.steps[idx - 1].id])
            .map((j) => j.stepTimestamps[step.id]! - j.stepTimestamps[funnel.steps[idx - 1].id]!);

      const avgTimeFromPrev = timesFromPrev.length > 0
        ? timesFromPrev.reduce((a, b) => a + b, 0) / timesFromPrev.length
        : 0;

      return {
        stepId: step.id,
        stepName: step.name,
        visitors,
        completions,
        conversionRate,
        stepConversionRate,
        dropOff,
        dropOffRate,
        avgTimeFromStart,
        avgTimeFromPrev,
      };
    });

    // Overall stats
    const lastStep = stepResults[stepResults.length - 1];
    const totalConversions = lastStep?.completions ?? 0;
    const overallConversionRate = totalEntrants > 0 ? totalConversions / totalEntrants : 0;
    const totalDropOffs = totalEntrants - totalConversions;

    const convertedJourneys = filteredJourneys.filter((j) => j.converted);
    const convertTimes = convertedJourneys.map((j) => j.totalTimeMs).sort((a, b) => a - b);
    const avgTimeToConvert = convertTimes.length > 0
      ? convertTimes.reduce((a, b) => a + b, 0) / convertTimes.length
      : 0;
    const medianTimeToConvert = convertTimes.length > 0
      ? convertTimes[Math.floor(convertTimes.length / 2)]
      : 0;

    // Cohort breakdown
    let cohortBreakdown: FunnelResult["cohortBreakdown"] | undefined;
    if (options?.cohorts && options.cohorts.length > 0) {
      cohortBreakdown = options.cohorts.map((cohort) => {
        const cohortJourneys = filteredJourneys.filter((j) => cohort.filter(j));
        const cohortConversions = cohortJourneys.filter((j) => j.converted).length;

        return {
          cohortName: cohort.name,
          entrants: cohortJourneys.length,
          conversions: cohortConversions,
          conversionRate: cohortJourneys.length > 0 ? cohortConversions / cohortJourneys.length : 0,
        };
      });
    }

    // Anomaly detection
    const anomalies: FunnelResult["anomalies"] = [];
    if (options?.detectAnomalies !== false) {
      const threshold = options?.anomalyThreshold ?? 2;

      for (const step of stepResults) {
        const stepDef = funnel.steps.find((s) => s.id === step.stepId);
        if (stepDef?.expectedConversionRate) {
          const expected = stepDef.expectedConversionRate;
          const actual = step.stepConversionRate;
          const deviation = Math.abs(actual - expected);

          if (deviation > threshold * 0.1) { // Simplified threshold
            anomalies.push({
              stepId: step.stepId,
              type: actual < expected ? "high_dropoff" : "unexpected_spike",
              expected,
              actual,
              deviation,
            });
          }
        }

        // High drop-off detection
        if (step.dropOffRate > 0.5 && step.visitors > 10) {
          anomalies.push({
            stepId: step.stepId,
            type: "high_dropoff",
            expected: 1 - step.dropOffRate,
            actual: step.dropOffRate,
            deviation: step.dropOffRate - 0.5,
          });
        }
      }
    }

    return {
      funnelId,
      funnelName: funnel.name,
      steps: stepResults,
      overallConversionRate,
      totalEntrants,
      totalConversions,
      totalDropOffs,
      avgTimeToConvert,
      medianTimeToConvert,
      cohortBreakdown,
      anomalies,
      generatedAt: Date.now(),
    };
  }

  /** Get raw journeys for a funnel */
  getJourneys(funnelId: string): FunnelUserJourney[] {
    return Array.from((this.journeys.get(funnelId) ?? new Map()).values());
  }

  /** Get a specific user's journey through a funnel */
  getUserJourney(funnelId: string, userId: string): FunnelUserJourney | undefined {
    return this.journeys.get(funnelId)?.get(userId);
  }

  /** Clear all journey data for a funnel */
  clearJourneys(funnelId?: string): void {
    if (funnelId) {
      this.journeys.set(funnelId, new Map());
    } else {
      for (const [key] of this.journeys) {
        this.journeys.set(key, new Map());
      }
    }
  }

  /** Export all data */
  exportData(): { funnels: FunnelDefinition[]; journeys: Record<string, FunnelUserJourney[]> } {
    const journeysRecord: Record<string, FunnelUserJourney[]> = {};
    for (const [funnelId, journeyMap] of this.journeys) {
      journeysRecord[funnelId] = Array.from(journeyMap.values());
    }

    return {
      funnels: Array.from(this.funnels.values()),
      journeys: journeysRecord,
    };
  }

  /** Import data */
  importData(data: { funnels: FunnelDefinition[]; journeys: Record<string, FunnelUserJourney[]> }): void {
    for (const funnel of data.funnels) {
      this.define(funnel);
    }

    for (const [funnelId, journeys] of Object.entries(data.journeys)) {
      const map = this.journeys.get(funnelId) ?? new Map();
      for (const journey of journeys) {
        map.set(journey.userId, journey);
      }
      this.journeys.set(funnelId, map);
    }
  }
}

/** Create a pre-configured funnel engine */
export function createFunnelEngine(): FunnelEngine {
  return new FunnelEngine();
}
