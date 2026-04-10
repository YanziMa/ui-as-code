/**
 * Task scheduling utilities — cron-like scheduling, job queues, delayed execution.
 */

export interface ScheduledJob<T = void> {
  id: string;
  name: string;
  execute: () => Promise<T>;
  interval?: number; // ms between runs (for recurring)
  nextRunAt: number;
  lastRunAt?: number;
  lastResult?: T;
  lastError?: Error;
  runCount: number;
  enabled: boolean;
}

export type JobStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export class Scheduler {
  private jobs = new Map<string, ScheduledJob>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private running = false;

  /** Add a one-time job that runs after a delay */
  schedule<T>(
    name: string,
    execute: () => Promise<T>,
    delayMs: number,
  ): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: ScheduledJob<T> = {
      id,
      name,
      execute: execute as () => Promise<void>,
      nextRunAt: Date.now() + delayMs,
      runCount: 0,
      enabled: true,
    };

    this.jobs.set(id, job);

    const timer = setTimeout(() => this.runJob(id), delayMs);
    this.timers.set(id, timer);

    return id;
  }

  /** Add a recurring job with an interval */
  every<T>(
    name: string,
    execute: () => Promise<T>,
    intervalMs: number,
    options?: { immediate?: boolean; startDelay?: number },
  ): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const initialDelay = options?.startDelay ?? (options?.immediate ? 0 : intervalMs);

    const job: ScheduledJob<T> = {
      id,
      name,
      execute: execute as () => Promise<void>,
      interval: intervalMs,
      nextRunAt: Date.now() + initialDelay,
      runCount: 0,
      enabled: true,
    };

    this.jobs.set(id, job);
    this.scheduleNext(id);

    return id;
  }

  /** Run a job at a specific date/time */
  at<T>(
    name: string,
    execute: () => Promise<T>,
    date: Date,
  ): string {
    const delay = Math.max(0, date.getTime() - Date.now());
    return this.schedule(name, execute, delay);
  }

  /** Cancel a job */
  cancel(jobId: string): boolean {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = false;
      return true;
    }

    return false;
  }

  /** Get job status */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /** List all jobs */
  listJobs(): ScheduledJob[] {
    return [...this.jobs.values()];
  }

  /** Remove completed/failed jobs */
  cleanup(): number {
    let removed = 0;
    for (const [id, job] of this.jobs) {
      if (!job.enabled && !this.timers.has(id)) {
        this.jobs.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /** Cancel all jobs */
  cancelAll(): void {
    for (const [id] of this.timers) {
      clearTimeout(this.timers.get(id)!);
    }
    this.timers.clear();
    for (const [, job] of this.jobs) {
      job.enabled = false;
    }
  }

  private scheduleNext(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled || job.interval === undefined) return;

    const timer = setTimeout(() => this.runJob(jobId), job.interval);
    this.timers.set(jobId, timer);
    job.nextRunAt = Date.now() + job.interval;
  }

  private async runJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.enabled) return;

    try {
      job.lastRunAt = Date.now();
      job.lastResult = await job.execute();
      job.runCount++;
    } catch (error) {
      job.lastError = error instanceof Error ? error : new Error(String(error));
    }

    // Schedule next if recurring
    if (job.interval !== undefined && job.enabled) {
      this.scheduleNext(jobId);
    }
  }
}

/** Simple cron-like expression parser (supports subset of cron syntax) */
export interface CronExpression {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

export function parseCronExpression(expr: string): CronExpression | null {
  // Support: * /N , ranges
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minute, hour, dom, month, dow] = parts;

  return {
    minute: parseCronField(minute, 0, 59),
    hour: parseCronField(hour, 0, 23),
    dayOfMonth: parseCronField(dom, 1, 31),
    month: parseCronField(month, 1, 12),
    dayOfWeek: parseCronField(dow, 0, 6),
  };
}

function parseCronField(field: string, min: number, max: number): number[] {
  if (field === "*") return Array.from({ length: max - min + 1 }, (_, i) => i + min);

  const values = new Set<number>();

  for (const part of field.split(",")) {
    // Range: 1-5
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= end; i++) values.add(i);
    }
    // Step: */5 or 1-10/2
    else if (part.includes("/")) {
      const [range, step] = part.split("/");
      const stepNum = parseInt(step, 10);
      if (range === "*") {
        for (let i = min; i <= max; i += stepNum) values.add(i);
      } else if (range.includes("-")) {
        const [start, end] = range.split("-").map(Number);
        for (let i = start; i <= end; i += stepNum) values.add(i);
      }
    }
    // Single value
    else {
      values.add(parseInt(part, 10));
    }
  }

  return [...values].filter((v) => v >= min && v <= max).sort((a, b) => a - b);
}

/** Check if a cron expression matches a given date */
export function cronMatches(cron: CronExpression, date: Date = new Date()): boolean {
  return (
    cron.minute.includes(date.getMinutes()) &&
    cron.hour.includes(date.getHours()) &&
    cron.dayOfMonth.includes(date.getDate()) &&
    cron.month.includes(date.getMonth() + 1) &&
    cron.dayOfWeek.includes(date.getDay())
  );
}

/** Get next run time for a cron expression from a given date */
export function getNextCronRun(cron: CronExpression, after: Date = new Date()): Date {
  const date = new Date(after.getTime() + 60000); // Start from next minute

  // Simple search within next 4 years
  const limit = new Date(after.getTime() + 4 * 365.25 * 24 * 60 * 60 * 1000);

  while (date < limit) {
    if (cronMatches(cron, date)) return date;
    date.setMinutes(date.getMinutes() + 1);
  }

  return limit; // Fallback
}
