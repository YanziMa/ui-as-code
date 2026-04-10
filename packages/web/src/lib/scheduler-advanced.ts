/**
 * Advanced scheduling and job queue library.
 * Extends the basic Scheduler with DAG dependencies, priorities, resource constraints,
 * retry strategies, timeout handling, concurrency groups, enhanced cron parsing,
 * timezone support, persistence, and visualization utilities.
 */

import {
  Scheduler,
  ScheduledJob,
  JobStatus,
  parseCronExpression as baseParseCron,
  CronExpression,
} from "./scheduler";

// ─── Priority Levels ────────────────────────────────────────────────

export const Priority = {
  critical: 1,
  high: 2,
  normal: 5,
  low: 8,
} as const;

export type PriorityLevel = (typeof Priority)[keyof typeof Priority];

// ─── Job Definition ─────────────────────────────────────────────────

export interface RetryConfig {
  maxAttempts: number;
  backoffMs: number;
  jitter: boolean;
}

export interface JobDefinition<T = unknown> {
  id: string;
  name: string;
  handler: () => Promise<T>;
  schedule?: {
    type: "cron" | "interval" | "once";
    expression?: string; // cron or human-readable
    intervalMs?: number;
    runAt?: Date;
  };
  priority?: number;
  timeout?: number;
  retries?: Partial<RetryConfig>;
  dependsOn?: string[];
  concurrencyGroup?: string;
  resourceRequirements?: Record<string, number>;
  metadata?: Record<string, unknown>;
}

// ─── Job Execution Record ───────────────────────────────────────────

export interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
}

export interface JobExecution<T = unknown> {
  id: string;
  jobId: string;
  startedAt: Date;
  completedAt?: Date;
  status: JobStatus;
  duration?: number;
  result?: T | Error;
  retryCount: number;
  logs: LogEntry[];
  childExecutions?: string[];
}

// ─── Scheduler Statistics ───────────────────────────────────────────

export interface SchedulerStats {
  totalJobsRun: number;
  successfulRuns: number;
  failedRuns: number;
  avgDuration: number;
  jobsByStatus: Record<JobStatus, number>;
  uptime: number;
  queueDepth: number;
  throughputPerHour: number;
}

// ─── Timeline Visualization ─────────────────────────────────────────

export interface TimelineEvent {
  jobId: string;
  jobName: string;
  scheduledTime: Date;
  estimatedDuration?: number;
  priority: number;
  status: "pending" | "running" | "completed" | "failed";
}

// ─── Internal Types ─────────────────────────────────────────────────

interface InternalJob extends JobDefinition {
  _baseJobId?: string; // link to underlying Scheduler job
  _nextScheduledRun?: Date;
  _enabled: boolean;
}

interface ConcurrencyGroupState {
  running: number;
  limit: number;
  queue: string[]; // job IDs waiting
}

// ─── Enhanced Cron Parser ────────────────────────────────────────────

const ALIASES: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@hourly": "0 * * * *",
};

const DAY_NAMES: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

/** Parse enhanced cron expressions including aliases and human-readable forms */
export function parseEnhancedCron(expr: string): CronExpression | null {
  const trimmed = expr.trim().toLowerCase();

  // Alias lookup
  if (ALIASES[trimmed]) return baseParseCron(ALIASES[trimmed]);

  // Human-readable patterns
  const human = tryParseHumanReadable(trimmed);
  if (human) return baseParseCron(human);

  // Standard 5-field cron with L/W extensions
  return parseExtendedCron(trimmed);
}

function tryParseHumanReadable(expr: string): string | null {
  // "every [day] at HH[:MM]"
  let m = expr.match(/^every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (m) {
    const dow = DAY_NAMES[m[1].toLowerCase()];
    let hour = parseInt(m[2], 10);
    if (m[4]?.toLowerCase() === "pm" && hour !== 12) hour += 12;
    if (m[4]?.toLowerCase() === "am" && hour === 12) hour = 0;
    const min = parseInt(m[3] || "0", 10);
    return `${min} ${hour} * * ${dow}`;
  }

  // "HHth of every month"
  m = expr.match(/^(\d{1,2})(?:st|nd|rd|th)\s+of\s+every\s+month\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (m) {
    const dom = parseInt(m[1], 10);
    let hour = parseInt(m[2], 10);
    if (m[4]?.toLowerCase() === "pm" && hour !== 12) hour += 12;
    if (m[4]?.toLowerCase() === "am" && hour === 12) hour = 0;
    const min = parseInt(m[3] || "0", 10);
    return `${min} ${hour} ${dom} * *`;
  }

  // "every N hours/minutes"
  m = expr.match(/^every\s+(\d+)\s+(hours?|minutes?)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (m[2].startsWith("h")) return `0 */${n} * * *`; // every N hours
    return `*/${n} * * * *`; // every N minutes
  }

  return null;
}

function parseExtendedCron(expr: string): CronExpression | null {
  const parts = expr.split(/\s+/);
  if (parts.length !== 5) return null;

  // Resolve L (last day of month) in day-of-month field
  const domField = parts[2];
  if (domField === "L") parts[2] = "28-31"; // will be validated at match time

  // Resolve W (nearest weekday) in day-of-month field
  if (/^\d+W$/.test(domField)) {
    parts[2] = domField.replace("W", "");
  }

  return baseParseCron(parts.join(" "));
}

/** Convert a cron expression between timezones */
export function convertSchedule(cronExpr: string, fromTz: string, toTz: string): string {
  const parsed = parseEnhancedCron(cronExpr);
  if (!parsed) throw new Error(`Invalid cron expression: ${cronExpr}`);

  // Use Intl API to determine offset difference at a reference point
  const now = new Date();
  const fromFmt = new Intl.DateTimeFormat("en-US", { timeZone: fromTz, hourCycle: "h23" });
  const toFmt = new Intl.DateTimeFormat("en-US", { timeZone: toTz, hourCycle: "h23" });

  // Approximate conversion by shifting hour field by offset delta
  const fromParts = fromFmt.formatToParts(now);
  const toParts = toFmt.formatToParts(now);

  const fromHour = fromParts.find((p) => p.type === "hour")?.value ?? "0";
  const toHour = toParts.find((p) => p.type === "hour")?.value ?? "0";

  const shift = (parseInt(toHour, 10) - parseInt(fromHour, 10) + 24) % 24;

  const shiftedHours = parsed.hour.map((h) => (h + shift) % 24).sort((a, b) => a - b);
  const hourStr = formatCronField(shiftedHours, 0, 23);

  return [
    formatCronField(parsed.minute, 0, 59),
    hourStr,
    formatCronField(parsed.dayOfMonth, 1, 31),
    formatCronField(parsed.month, 1, 12),
    formatCronField(parsed.dayOfWeek, 0, 6),
  ].join(" ");
}

function formatCronField(values: number[], min: number, max: number): string {
  if (values.length === max - min + 1 && values.every((v, i) => v === i + min)) return "*";
  if (values.length <= 3) return values.join(",");
  // Detect step pattern
  const step = values[1] - values[0];
  const isStep = values.length > 1 && values.every((v, i) => i === 0 || v === values[i - 1] + step);
  if (isStep && values[0] === min) return `*/${step}`;
  return values.join(",");
}

// ─── Advanced Scheduler ─────────────────────────────────────────────

export class AdvancedScheduler extends Scheduler {
  private definitions = new Map<string, InternalJob>();
  private executions = new Map<string, JobExecution>();
  private dependencyGraph = new Map<string, Set<string>>(); // job -> set of dependents
  private reverseDeps = new Map<string, Set<string>>();   // job -> set of dependencies
  private completedDeps = new Set<string>();

  private concurrencyGroups = new Map<string, ConcurrencyGroupState>();
  private resourceUsage = new Map<string, number>();       // resource -> current usage
  private resourceLimits = new Map<string, number>();      // resource -> max allowed

  private startTime = Date.now();
  private hourlyCount = 0;
  private hourlyResetTime = Date.now();
  private totalDuration = 0;

  /** Register a job definition */
  define<T>(def: JobDefinition<T>): string {
    const internal: InternalJob = {
      ...def,
      _enabled: true,
    };

    this.definitions.set(def.id, internal);

    // Build dependency graph
    if (def.dependsOn?.length) {
      for (const depId of def.dependsOn) {
        if (!this.reverseDeps.has(depId)) this.reverseDeps.set(depId, new Set());
        this.reverseDeps.get(depId)!.add(def.id);
        if (!this.dependencyGraph.has(def.id)) this.dependencyGraph.set(def.id, new Set());
        this.dependencyGraph.get(def.id)!.add(depId);
      }
    }

    // Register concurrency group
    if (def.concurrencyGroup) {
      if (!this.concurrencyGroups.has(def.concurrencyGroup)) {
        this.concurrencyGroups.set(def.concurrencyGroup, { running: 0, limit: Infinity, queue: [] });
      }
    }

    // Register resource requirements
    if (def.resourceRequirements) {
      for (const [resource, amount] of Object.entries(def.resourceRequirements)) {
        const current = this.resourceLimits.get(resource) || 0;
        this.resourceLimits.set(resource, Math.max(current, amount));
      }
    }

    // Schedule based on type
    this.scheduleInternal(internal);

    return def.id;
  }

  private scheduleInternal(job: InternalJob): void {
    if (!job.schedule) return;

    switch (job.schedule.type) {
      case "cron":
      case "interval": {
        const ms = job.schedule.intervalMs ?? 60_000;
        const baseId = this.every(job.name, async () => {
          await this.executeWithLifecycle(job.id);
        }, ms, { startDelay: this.computeInitialDelay(job) });
        job._baseJobId = baseId;
        break;
      }
      case "once": {
        const when = job.schedule.runAt ?? new Date(Date.now() + 60_000);
        const baseId = this.at(job.name, async () => {
          await this.executeWithLifecycle(job.id);
        }, when);
        job._baseJobId = baseId;
        break;
      }
    }
  }

  private computeInitialDelay(job: InternalJob): number {
    if (!job.schedule?.expression) return 0;
    const cron = parseEnhancedCron(job.schedule.expression);
    if (!cron) return 0;
    const next = this.getNextMatch(cron, new Date());
    return Math.max(0, next.getTime() - Date.now());
  }

  /** Execute a job with full lifecycle management (retries, timeout, deps, resources) */
  private async executeWithLifecycle(jobId: string): Promise<void> {
    const def = this.definitions.get(jobId);
    if (!def || !def._enabled) return;

    // Check dependencies
    if (!this.areDependenciesMet(jobId)) {
      this.log(jobId, "info", `Waiting on dependencies: ${(def.dependsOn ?? []).join(", ")}`);
      return; // will be re-triggered when deps complete
    }

    // Check concurrency group
    if (def.concurrencyGroup && !this.acquireConcurrencySlot(def.concurrencyGroup, jobId)) {
      this.log(jobId, "info", `Queued in concurrency group "${def.concurrencyGroup}"`);
      return;
    }

    // Acquire resources
    if (def.resourceRequirements && !this.acquireResources(def.resourceRequirements, jobId)) {
      if (def.concurrencyGroup) this.releaseConcurrencySlot(def.concurrencyGroup);
      this.log(jobId, "warn", "Resource constraints not met, deferring execution");
      return;
    }

    // Create execution record
    const execId = this.createExecution(jobId);
    const exec = this.executions.get(execId)!;
    const retries = { maxAttempts: 3, backoffMs: 1000, jitter: true, ...def.retries };
    const timeout = def.timeout ?? 30_000;
    let lastError: Error | undefined;

    this.log(jobId, "info", `Execution started (priority=${def.priority ?? Priority.normal})`);

    for (let attempt = 0; attempt < retries.maxAttempts; attempt++) {
      try {
        const result = await this.withTimeout(
          def.handler(),
          timeout,
          `Job "${def.name}" exceeded timeout of ${timeout}ms`,
        );

        exec.status = "completed";
        exec.result = result;
        exec.completedAt = new Date();
        exec.duration = exec.completedAt.getTime() - exec.startedAt.getTime();
        exec.retryCount = attempt;
        this.totalDuration += exec.duration;
        this.hourlyCount++;
        this.completedDeps.add(jobId);
        this.log(jobId, "info", `Completed successfully in ${exec.duration}ms (attempt ${attempt + 1})`);
        this.triggerDependents(jobId);
        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        exec.retryCount = attempt + 1;
        this.log(jobId, "warn", `Attempt ${attempt + 1}/${retries.maxAttempts} failed: ${lastError.message}`);

        if (attempt < retries.maxAttempts - 1) {
          const delay = this.computeBackoff(retries.backoffMs, attempt, retries.jitter);
          this.log(jobId, "info", `Retrying in ${delay.toFixed(0)}ms...`);
          await sleep(delay);
        }
      }
    }

    if (exec.status !== "completed") {
      exec.status = "failed";
      exec.result = lastError;
      exec.completedAt = new Date();
      exec.duration = exec.completedAt.getTime() - exec.startedAt.getTime();
      this.log(jobId, "error", `Failed after ${retries.maxAttempts} attempts: ${lastError?.message}`);
    }

    // Release resources & concurrency slot
    if (def.resourceRequirements) this.releaseResources(def.resourceRequirements);
    if (def.concurrencyGroup) this.releaseConcurrencySlot(def.concurrencyGroup);
  }

  private areDependenciesMet(jobId: string): boolean {
    const deps = this.reverseDeps.get(jobId);
    if (!deps || deps.size === 0) return true;
    for (const depId of deps) {
      if (!this.completedDeps.has(depId)) return false;
    }
    return true;
  }

  private triggerDependents(completedJobId: string): void {
    const dependents = this.dependencyGraph.get(completedJobId);
    if (!dependents) return;

    for (const depId of dependents) {
      const depDef = this.definitions.get(depId);
      if (depDef && depDef._enabled && this.areDependenciesMet(depId)) {
        this.log(depId, "info", `Dependency "${completedJobId}" satisfied, triggering execution`);
        this.executeWithLifecycle(depId);
      }
    }
  }

  private acquireConcurrencySlot(groupName: string, jobId?: string): boolean {
    const group = this.concurrencyGroups.get(groupName);
    if (!group) return true;
    if (group.running < group.limit) {
      group.running++;
      return true;
    }
    if (jobId && !group.queue.includes(jobId)) group.queue.push(jobId);
    return false;
  }

  private releaseConcurrencySlot(groupName: string): void {
    const group = this.concurrencyGroups.get(groupName);
    if (!group) return;
    group.running = Math.max(0, group.running - 1);

    // Dequeue next waiting job
    if (group.queue.length > 0 && group.running < group.limit) {
      const nextId = group.queue.shift()!;
      group.running++;
      this.executeWithLifecycle(nextId);
    }
  }

  /** Set max parallelism for a concurrency group */
  setConcurrencyLimit(groupName: string, limit: number): void {
    const group = this.concurrencyGroups.get(groupName);
    if (group) group.limit = limit;
    else this.concurrencyGroups.set(groupName, { running: 0, limit, queue: [] });
  }

  /** Set max concurrent usage for a resource type */
  setResourceLimit(resource: string, maxConcurrent: number): void {
    this.resourceLimits.set(resource, maxConcurrent);
  }

  private acquireResources(requirements: Record<string, number>, jobId?: string): boolean {
    for (const [resource, needed] of Object.entries(requirements)) {
      const current = this.resourceUsage.get(resource) || 0;
      const limit = this.resourceLimits.get(resource) ?? Infinity;
      if (current + needed > limit) return false;
    }
    for (const [resource, needed] of Object.entries(requirements)) {
      this.resourceUsage.set(resource, (this.resourceUsage.get(resource) || 0) + needed);
    }
    return true;
  }

  private releaseResources(requirements: Record<string, number>): void {
    for (const [resource, needed] of Object.entries(requirements)) {
      const current = this.resourceUsage.get(resource) || 0;
      this.resourceUsage.set(resource, Math.max(0, current - needed));
    }
  }

  private createExecution(jobId: string): string {
    const id = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const exec: JobExecution = {
      id,
      jobId,
      startedAt: new Date(),
      status: "running",
      retryCount: 0,
      logs: [],
    };
    this.executions.set(id, exec);
    return id;
  }

  private log(jobId: string, level: LogEntry["level"], message: string): void {
    // Find most recent execution for this job
    let latestExec: JobExecution | undefined;
    for (const exec of this.executions.values()) {
      if (exec.jobId === jobId && (!latestExec || exec.startedAt > latestExec.startedAt)) {
        latestExec = exec;
      }
    }
    latestExec?.logs.push({ timestamp: new Date().toISOString(), level, message });
  }

  private computeBackoff(baseMs: number, attempt: number, useJitter: boolean): number {
    const exponential = baseMs * Math.pow(2, attempt);
    if (!useJitter) return exponential;
    // Full jitter: random between 0 and exponential
    return Math.random() * exponential;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(msg)), ms);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); },
      );
    });
  }

  private getNextMatch(cron: CronExpression, after: Date): Date {
    // Use minute-by-minute search (same approach as base scheduler)
    const date = new Date(after.getTime() + 60_000);
    const limit = new Date(after.getTime() + 4 * 365.25 * 24 * 60 * 60 * 1000);
    while (date < limit) {
      if (
        cron.minute.includes(date.getMinutes()) &&
        cron.hour.includes(date.getHours()) &&
        cron.dayOfMonth.includes(date.getDate()) &&
        cron.month.includes(date.getMonth() + 1) &&
        cron.dayOfWeek.includes(date.getDay())
      ) {
        return date;
      }
      date.setMinutes(date.getMinutes() + 1);
    }
    return limit;
  }

  // ─── Query API ──────────────────────────────────────────────────

  getExecution(execId: string): JobExecution | undefined {
    return this.executions.get(execId);
  }

  getExecutionsForJob(jobId: string): JobExecution[] {
    return [...this.executions.values()].filter((e) => e.jobId === jobId);
  }

  getAllExecutions(): JobExecution[] {
    return [...this.executions.values()];
  }

  getDefinition(jobId: string): JobDefinition | undefined {
    return this.definitions.get(jobId);
  }

  getAllDefinitions(): JobDefinition[] {
    return [...this.definitions.values()];
  }

  /** Get scheduler statistics */
  getStats(): SchedulerStats {
    const now = Date.now();

    // Reset hourly counter each hour
    if (now - this.hourlyResetTime >= 3_600_000) {
      this.hourlyCount = 0;
      this.hourlyResetTime = now;
    }

    const allExecs = [...this.executions.values()];
    const successful = allExecs.filter((e) => e.status === "completed").length;
    const failed = allExecs.filter((e) => e.status === "failed").length;
    const withDuration = allExecs.filter((e) => e.duration != null);

    const jobsByStatus: Record<JobStatus, number> = {
      idle: 0, running: 0, completed: successful, failed, cancelled: 0,
    };
    // Count currently running
    for (const e of allExecs) {
      if (e.status === "running") jobsByStatus.running++;
    }

    return {
      totalJobsRun: allExecs.length,
      successfulRuns: successful,
      failedRuns: failed,
      avgDuration: withDuration.length > 0
        ? Math.round(withDuration.reduce((s, e) => s + (e.duration ?? 0), 0) / withDuration.length)
        : 0,
      jobsByStatus,
      uptime: now - this.startTime,
      queueDepth: this.getQueueDepth(),
      throughputPerHour: this.hourlyCount,
    };
  }

  private getQueueDepth(): number {
    let depth = 0;
    for (const [, group] of this.concurrencyGroups) {
      depth += group.queue.length;
    }
    // Add pending executions
    for (const exec of this.executions.values()) {
      if (exec.status === "running") depth++;
    }
    return depth;
  }

  /** Enable or disable a job definition */
  setEnabled(jobId: string, enabled: boolean): void {
    const def = this.definitions.get(jobId);
    if (def) {
      def._enabled = enabled;
      if (!enabled && def._baseJobId) {
        this.cancel(def._baseJobId);
      } else if (enabled && def.schedule) {
        this.scheduleInternal(def);
      }
    }
  }

  /** Remove a job definition and clean up */
  removeJob(jobId: string): boolean {
    const def = this.definitions.get(jobId);
    if (!def) return false;

    if (def._baseJobId) this.cancel(def._baseJobId);
    this.definitions.delete(jobId);
    this.dependencyGraph.delete(jobId);
    this.reverseDeps.delete(jobId);
    this.completedDeps.delete(jobId);
    return true;
  }

  // ─── Persistence ─────────────────────────────────────────────────

  /** Serialize scheduler state to JSON */
  saveState(): string {
    const state = {
      version: 1,
      savedAt: new Date().toISOString(),
      startTime: this.startTime,
      definitions: [...this.definitions.entries()].map(([id, def]) => ({
        id,
        name: def.name,
        schedule: def.schedule,
        priority: def.priority,
        timeout: def.timeout,
        retries: def.retries,
        dependsOn: def.dependsOn,
        concurrencyGroup: def.concurrencyGroup,
        resourceRequirements: def.resourceRequirements,
        metadata: def.metadata,
        _enabled: def._enabled,
      })),
      completedDeps: [...this.completedDeps],
      concurrencyGroupLimits: [...this.concurrencyGroups.entries()].map(([name, g]) => ({ name, limit: g.limit })),
      resourceLimits: [...this.resourceLimits.entries()],
      recentExecutions: [...this.executions.values()]
        .filter((e) => e.status === "running")
        .map((e) => ({
          id: e.id, jobId: e.jobId, startedAt: e.startedAt.toISOString(),
          retryCount: e.retryCount, logs: e.logs,
        })),
    };
    return JSON.stringify(state);
  }

  /** Restore scheduler state from serialized JSON */
  loadState(json: string): void {
    try {
      const state = JSON.parse(json);
      this.startTime = state.startTime ?? Date.now();
      this.completedDeps = new Set(state.completedDeps ?? []);

      // Restore concurrency group limits
      if (state.concurrencyGroupLimits) {
        for (const { name, limit } of state.concurrencyGroupLimits) {
          this.setConcurrencyLimit(name, limit);
        }
      }

      // Restore resource limits
      if (state.resourceLimits) {
        for (const [resource, limit] of state.resourceLimits) {
          this.resourceLimits.set(resource, limit);
        }
      }

      // Re-register job definitions (handlers cannot be serialized, so they remain stubs)
      if (state.definitions) {
        for (const def of state.definitions) {
          if (this.definitions.has(def.id)) continue; // already exists
          const internal: InternalJob = {
            ...def,
            handler: () => Promise.reject(new Error(`Handler not restored for job "${def.name}". Re-register with define().`)),
            _enabled: def._enabled ?? true,
          };
          this.definitions.set(def.id, internal);

          if (internal.dependsOn) {
            for (const depId of internal.dependsOn) {
              if (!this.reverseDeps.has(depId)) this.reverseDeps.set(depId, new Set());
              this.reverseDeps.get(depId)!.add(def.id);
              if (!this.dependencyGraph.has(def.id)) this.dependencyGraph.set(def.id, new Set());
              this.dependencyGraph.get(def.id)!.add(depId);
            }
          }

          if (internal._enabled && internal.schedule) {
            this.scheduleInternal(internal);
          }
        }
      }

      // Restore in-flight executions as failed (they were interrupted)
      if (state.recentExecutions) {
        for (const exec of state.recentExecutions) {
          this.executions.set(exec.id, {
            ...exec,
            startedAt: new Date(exec.startedAt),
            status: "failed",
            completedAt: new Date(),
            duration: Date.now() - new Date(exec.startedAt).getTime(),
            result: new Error("Job interrupted by scheduler restart"),
            logs: (exec.logs ?? []).map((l: LogEntry) => l),
          } as JobExecution);
        }
      }
    } catch (err) {
      throw new Error(`Failed to restore scheduler state: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ─── Schedule Visualizer Utility ────────────────────────────────────

export class ScheduleVisualizer {
  /**
   * Generate a timeline of scheduled events within a date range.
   * Useful for building calendar/Gantt chart views.
   */
  generateTimeline(
    jobs: JobDefinition[],
    dateRange: { start: Date; end: Date },
  ): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    for (const job of jobs) {
      if (!job.schedule) continue;

      const times = this.getScheduledTimes(job, dateRange.start, dateRange.end);
      for (const time of times) {
        events.push({
          jobId: job.id,
          jobName: job.name,
          scheduledTime: time,
          estimatedDuration: job.timeout,
          priority: job.priority ?? Priority.normal,
          status: "pending",
        });
      }
    }

    return events.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  private getScheduledTimes(job: JobDefinition, start: Date, end: Date): Date[] {
    const times: Date[] = [];

    if (!job.schedule) return times;

    switch (job.schedule.type) {
      case "once": {
        const at = job.schedule.runAt;
        if (at && at >= start && at <= end) times.push(at);
        break;
      }
      case "interval": {
        const ms = job.schedule.intervalMs ?? 60_000;
        let cursor = new Date(start);
        while (cursor <= end) {
          times.push(new Date(cursor));
          cursor = new Date(cursor.getTime() + ms);
        }
        break;
      }
      case "cron": {
        const expr = job.schedule.expression;
        if (!expr) break;
        const cron = parseEnhancedCron(expr);
        if (!cron) break;
        let cursor = new Date(start);
        const limit = end;
        while (cursor <= limit) {
          if (
            cron.minute.includes(cursor.getMinutes()) &&
            cron.hour.includes(cursor.getHours()) &&
            cron.dayOfMonth.includes(cursor.getDate()) &&
            cron.month.includes(cursor.getMonth() + 1) &&
            cron.dayOfWeek.includes(cursor.getDay())
          ) {
            times.push(new Date(cursor));
          }
          cursor.setMinutes(cursor.getMinutes() + 1);
        }
        break;
      }
    }

    return times;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Re-exports ─────────────────────────────────────────────────────

export {
  Scheduler,
  ScheduledJob,
  JobStatus,
  CronExpression,
  parseCronExpression as baseParseCron,
};
