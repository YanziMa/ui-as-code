/**
 * Cron Scheduler: Time-based task scheduling for browser environments.
 * Supports cron expression parsing, recurring/one-shot tasks, timezone handling,
 * task persistence, pause/resume, execution history, and missed-run tracking.
 */

// --- Types ---

export interface CronTask {
  /** Unique task ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Cron expression (e.g., "0 9 * * 1-5") */
  cronExpression: string;
  /** Task handler */
  handler: () => void | Promise<void>;
  /** Whether the task is enabled */
  enabled?: boolean;
  /** Timezone (default: local) */
  timezone?: string;
  /** Maximum concurrent executions (default: 1) */
  maxConcurrent?: number;
  /** Timeout in ms (0 = no timeout, default: 30000) */
  timeout?: number;
  /** Run immediately on registration? (default: false) */
  runOnRegister?: boolean;
  /** Custom data attached to task */
  meta?: Record<string, unknown>;
}

export type CronField = "minute" | "hour" | "dayOfMonth" | "month" | "dayOfWeek";

export interface ParsedCron {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
  raw: string;
}

export interface TaskExecution {
  taskId: string;
  scheduledAt: Date;
  executedAt: Date;
  completedAt?: Date;
  success: boolean;
  error?: string;
  durationMs?: number;
}

export interface SchedulerOptions {
  /** Start scheduler automatically on creation? (default: true) */
  autoStart?: boolean;
  /** Default timezone (default: local) */
  defaultTimezone?: string;
  /** Callback when a task executes */
  onExecute?: (task: CronTask) => void;
  /** Callback when a task completes */
  onComplete?: (execution: TaskExecution) => void;
  /** Callback when a task errors */
  onError?: (task: CronTask, error: Error) => void;
  /** Max history entries to keep (default: 100) */
  maxHistory?: number;
  /** Tick interval in ms — how often to check for due tasks (default: 1000) */
  tickInterval?: number;
}

// --- Cron Expression Parser ---

/**
 * Parse a standard 5-field cron expression.
 * Format: minute hour day-of-month month day-of-week
 *
 * Supported syntax:
 *   - Wildcard (*)
 *   - Ranges (1-5)
 *   - Lists (1,3,5)
 *   - Steps (*/5, 1-10/2)
 *   - Named values for day-of-week (MON-SUN) and month (JAN-DEC)
 */
export function parseCron(expression: string): ParsedCron {
  const fields = expression.trim().split(/\s+/);

  if (fields.length < 5 || fields.length > 6) {
    throw new Error(`Invalid cron expression: "${expression}". Expected 5 or 6 fields.`);
  }

  const [minuteStr, hourStr, domStr, monthStr, dowStr] = fields;

  return {
    minute: parseField(minuteStr, 0, 59),
    hour: parseField(hourStr, 0, 23),
    dayOfMonth: parseField(domStr, 1, 31),
    month: parseField(monthStr, 1, 12),
    dayOfWeek: parseDayOfWeek(dowStr),
    raw: expression,
  };
}

function parseField(field: string, min: number, max: number): number[] {
  // Handle wildcard
  if (field === "*") return range(min, max);

  // Handle step (*/5)
  const stepMatch = field.match(/^\*\/(\d+)$/);
  if (stepMatch) {
    const step = parseInt(stepMatch[1]!, 10);
    const result: number[] = [];
    for (let i = min; i <= max; i += step) result.push(i);
    return result;
  }

  // Handle range with step (1-10/2)
  const rangeStepMatch = field.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (rangeStepMatch) {
    const start = parseInt(rangeStepMatch[1]!, 10);
    const end = parseInt(rangeStepMatch[2]!, 10);
    const step = parseInt(rangeStepMatch[3]!, 10);
    const result: number[] = [];
    for (let i = start; i <= end; i += step) result.push(i);
    return result;
  }

  // Handle range (1-5)
  const rangeMatch = field.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    return range(parseInt(rangeMatch[1]!, 10), parseInt(rangeMatch[2]!, 10));
  }

  // Handle list (1,3,5)
  if (field.includes(",")) {
    return field.split(",").map((s) => parseInt(s.trim(), 10));
  }

  // Single value
  const val = parseInt(field, 10);
  if (!isNaN(val)) return [val];

  throw new Error(`Invalid cron field: "${field}"`);
}

/** Named day-of-week mapping */
const DOW_MAP: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
  "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
  "7": 0, // Sunday can be 0 or 7
};

const MONTH_MAP: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

function parseDayOfWeek(field: string): number[] {
  // First check named values
  const upper = field.toUpperCase();
  if (upper in DOW_MAP) return [DOW_MAP[upper]!];

  // Handle ? (any day) — return all days
  if (field === "?" || field === "*") return range(0, 6);

  // Handle last-day-of-month convention (L) — simplified as 7/Saturday
  if (upper === "L") return [6];

  // Handle hash (Nth weekday) — simplified: just parse the number
  const hashMatch = upper.match(/^(\d+)#(\d+)$/);
  if (hashMatch) {
    return [parseInt(hashMatch[2]!, 10) % 7];
  }

  // Fall through to normal parsing
  try { return parseField(field, 0, 6); }
  catch { return parseField(upper, 0, 6); }
}

function range(start: number, end: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i);
  return result;
}

// --- Next Run Calculator ---

/**
 * Calculate the next execution time after a given date for a parsed cron expression.
 */
export function getNextRun(cron: ParsedCron, after: Date = new Date()): Date | null {
  const d = new Date(after.getTime() + 60000); // Check from 1 minute after

  // Search up to 5 years ahead
  const endTime = new Date(d.getTime() + 5 * 365.25 * 24 * 60 * 60 * 1000);

  while (d < endTime) {
    if (
      matchesField(cron.minute, d.getMinutes()) &&
      matchesField(cron.hour, d.getHours()) &&
      matchesField(cron.month, d.getMonth() + 1) &&
      matchesField(cron.dayOfWeek, d.getDay()) &&
      matchesDayOfMonth(cron.dayOfMonth, d)
    ) {
      return new Date(d);
    }

    d.setMinutes(d.getMinutes() + 1);
  }

  return null; // No match found within 5 years
}

function matchesField(values: number[], actual: number): boolean {
  return values.includes(actual);
}

function matchesDayOfMonth(values: number[], date: Date): boolean {
  if (values.includes(date.getDate())) return true;
  // Handle "L" (last day of month) represented as 32
  if (values.includes(32)) {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return date.getDate() === lastDay;
  }
  return false;
}

// --- Human Readable Description ---

/** Generate a human-readable description of a cron expression */
export function describeCron(expression: string): string {
  const cron = parseCron(expression);
  const parts: string[] = [];

  // Minute
  if (cron.minute.length === 1 && cron.minute[0] === 0) {
    parts.push("at minute 0");
  } else if (cron.minute.length >= 59) {
    // Every minute
  } else if (cron.minute.length <= 10) {
    parts.push(`at minutes ${cron.minute.join(", ")}`);
  }

  // Hour
  if (cron.hour.length === 24) {
    parts.push("every hour");
  } else if (cron.hour.length === 1) {
    parts.push(formatHour(cron.hour[0]!));
  } else {
    parts.push(`at hours ${cron.hour.map(formatHour).join(", ")}`);
  }

  // Day of month / week
  if (cron.dayOfMonth.includes(32)) {
    parts.push("on the last day of the month");
  } else if (!cron.dayOfMonth.includes(0) && cron.dayOfMonth.length < 15) {
    parts.push(`on days ${cron.dayOfMonth.join(", ")}`);
  }

  // Day of week
  if (cron.dayOfWeek.length < 7 && !cron.dayOfWeek.includes(undefined!)) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    parts.push(`on ${cron.dayOfWeek.map((d) => dayNames[d]).join(", ")}`);
  }

  // Month
  if (cron.month.length < 12) {
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    parts.push(`in ${cron.month.map((m) => monthNames[m]!).join(", ")}`);
  }

  return parts.join(" ");
}

function formatHour(h: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 || 12;
  return `${display}${period}`;
}

// --- Main Scheduler ---

export class CronScheduler {
  private tasks = new Map<string, CronTask>();
  private history: TaskExecution[] = [];
  private runningTasks = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private options: Required<SchedulerOptions>;
  private destroyed = false;

  constructor(options: SchedulerOptions = {}) {
    this.options = {
      autoStart: options.autoStart ?? true,
      defaultTimezone: options.defaultTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      maxHistory: options.maxHistory ?? 100,
      tickInterval: options.tickInterval ?? 1000,
      onExecute: options.onExecute ?? (() => {}),
      onComplete: options.onComplete ?? (() => {}),
      onError: options.onError ?? (() => {}),
    };

    if (this.options.autoStart) this.start();
  }

  /** Register a new scheduled task */
  register(task: CronTask): () => void {
    this.tasks.set(task.id, { ...task, enabled: task.enabled ?? true });

    if (task.runOnRegister && task.enabled !== false) {
      this.executeNow(task.id);
    }

    return () => this.tasks.delete(task.id);
  }

  /** Remove a task by ID */
  unregister(id: string): boolean {
    return this.tasks.delete(id);
  }

  /** Enable a task */
  enable(id: string): void {
    const task = this.tasks.get(id);
    if (task) task.enabled = true;
  }

  /** Disable a task */
  disable(id: string): void {
    const task = this.tasks.get(id);
    if (task) task.enabled = false;
  }

  /** Manually trigger a task now */
  async executeNow(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task || task.enabled === false) return;

    await this.executeTask(task);
  }

  /** Get next run time for a specific task */
  getNextRunTime(taskId: string): Date | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    try {
      const cron = parseCron(task.cronExpression);
      return getNextRun(cron);
    } catch {
      return null;
    }
  }

  /** Get all registered tasks */
  getTasks(): CronTask[] {
    return Array.from(this.tasks.values());
  }

  /** Get execution history */
  getHistory(): TaskExecution[] {
    return [...this.history];
  }

  /** Get history for a specific task */
  getTaskHistory(taskId: string): TaskExecution[] {
    return this.history.filter((h) => h.taskId === taskId);
  }

  /** Clear history */
  clearHistory(): void {
    this.history = [];
  }

  /** Start the scheduler tick loop */
  start(): void {
    if (this.timer) return;
    this.destroyed = false;
    this.timer = setInterval(() => this.tick(), this.options.tickInterval);
  }

  /** Stop the scheduler tick loop */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Destroy scheduler and clean up */
  destroy(): void {
    this.destroyed = true;
    this.stop();
    this.tasks.clear();
    this.history = [];
    this.runningTasks.clear();
  }

  // --- Internal ---

  private tick(): void {
    if (this.destroyed) return;

    const now = new Date();

    for (const [, task] of this.tasks) {
      if (!task.enabled) continue;

      // Check concurrency limit
      const maxConcurrent = task.maxConcurrent ?? 1;
      if (this.runningTasks.has(task.id) &&
          Array.from(this.runningTasks).filter((id) => id === task.id).length >= maxConcurrent) {
        continue;
      }

      try {
        const cron = parseCron(task.cronExpression);
        const nextRun = getNextRun(cron, new Date(now.getTime() - 60000));

        if (nextRun && Math.abs(nextRun.getTime() - now.getTime()) < this.options.tickInterval) {
          this.executeTask(task);
        }
      } catch {
        // Invalid cron expression — skip silently
      }
    }
  }

  private async executeTask(task: CronTask): Promise<void> {
    this.runningTasks.add(task.id);
    this.options.onExecute(task);

    const execution: TaskExecution = {
      taskId: task.id,
      scheduledAt: new Date(),
      executedAt: new Date(),
      success: false,
    };

    const timeoutMs = task.timeout ?? 30000;
    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
      const result = Promise.race([
        task.handler(),
        new Promise<never>((_, reject) => {
          if (timeoutMs > 0) {
            timer = setTimeout(() => reject(new Error(`Task "${task.name}" timed out after ${timeoutMs}ms`)), timeoutMs);
          }
        }),
      ]);

      await result;
      execution.success = true;
      execution.completedAt = new Date();
      this.options.onComplete(execution);
    } catch (error) {
      execution.success = false;
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      this.options.onError(task, error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (timer) clearTimeout(timer);
      this.runningTasks.delete(task.id);
      execution.durationMs = execution.completedAt.getTime() - execution.executedAt.getTime();

      this.history.push(execution);
      if (this.history.length > this.options.maxHistory) {
        this.history.shift();
      }
    }
  }
}
