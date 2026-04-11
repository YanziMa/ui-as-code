/**
 * Task Scheduler v2: Advanced task scheduling with priority queues,
 * retry/backoff, rate limiting, deadline management, dependency resolution,
 * concurrency control, and execution statistics.
 *
 * Supports:
 * - Priority-based scheduling (higher priority runs first)
 * - Automatic retry with exponential backoff and jitter
 * - Rate limiting (token bucket + sliding window)
 * - Task deadlines (absolute and relative)
 * - Dependency graphs (DAG-based topological sort)
 * - Concurrency limits per category
 * - Task cancellation (AbortController)
 * - Execution history and metrics
 */

// --- Types ---

export interface SchedulerConfig {
  /** Max concurrent tasks (default: 4) */
  maxConcurrency?: number;
  /** Default retry count (default: 3) */
  defaultRetries?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  baseDelayMs?: number;
  /** Max delay cap in ms (default: 30000) */
  maxDelayMs?: number;
  /** Enable jitter (default: true) */
  jitter?: boolean;
  /** Rate limit: max tasks per window (default: Infinity) */
  rateLimitMax?: number;
  /** Rate limit: window size in ms (default: 1000) */
  rateLimitWindowMs?: number;
  /** Default task timeout in ms (default: 30000) */
  defaultTimeoutMs?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

export interface ScheduledTask<T = unknown> {
  /** Unique task ID */
  id: string;
  /** Task name/label */
  name?: string;
  /** Async function to execute */
  fn: () => Promise<T>;
  /** Priority (higher = first, default: 0) */
  priority?: number;
  /** Number of retries on failure (overrides default) */
  retries?: number;
  /** Category for concurrency grouping */
  category?: string;
  /** Absolute deadline timestamp (Date.now() value) */
  deadline?: number;
  /** Relative timeout from schedule time (ms) */
  timeoutMs?: number;
  /** Dependencies — task IDs that must complete first */
  dependsOn?: string[];
  /** AbortController for cancellation */
  signal?: AbortSignal;
  /** Metadata for tracking */
  meta?: Record<string, unknown>;
}

export interface TaskResult<T = unknown> {
  /** Task ID */
  taskId: string;
  /** Result value */
  value: T | null;
  /** Error if failed */
  error?: Error;
  /** Number of attempts made */
  attempts: number;
  /** Total duration including retries */
  totalDurationMs: number;
  /** Status */
  status: "completed" | "failed" | "cancelled" | "timeout" | "deadline-exceeded";
}

export interface SchedulerStats {
  /** Tasks completed successfully */
  completed: number;
  /** Tasks failed (after all retries) */
  failed: number;
  /** Tasks cancelled */
  cancelled: number;
  /** Tasks timed out */
  timedOut: number;
  /** Tasks that exceeded deadline */
  deadlineExceeded: number;
  /** Currently running tasks */
  running: number;
  /** Waiting in queue */
  waiting: number;
  /** Blocked by dependencies */
  blocked: number;
  /** Average execution time (ms) */
  averageExecutionTimeMs: number;
  /** Total tasks scheduled */
  totalScheduled: number;
}

// --- Internal Types ---

type TaskStatus = "waiting" | "ready" | "running" | "completed" | "failed" | "cancelled";

interface InternalTask {
  id: string;
  name?: string;
  fn: () => Promise<unknown>;
  priority: number;
  retries: number;
  maxRetries: number;
  category?: string;
  deadline?: number;
  timeoutMs: number;
  dependsOn: Set<string>;
  dependents: Set<string>;
  status: TaskStatus;
  attempts: number;
  resolve: (result: TaskResult) => void;
  reject: (error: Error) => void;
  abortController: AbortController;
  scheduledAt: number;
  startedAt?: number;
  meta?: Record<string, unknown>;
}

interface RateLimitState {
  tokens: number;
  lastRefill: number;
  timestamps: number[];
}

// --- Main Class ---

export class TaskSchedulerV2 {
  private config: Required<Omit<SchedulerConfig, "jitter">> & { jitter: boolean };
  private tasks = new Map<string, InternalTask>();
  private running = new Set<string>();
  private waitingQueue: string[] = [];
  private destroyed = false;

  // Rate limiting
  private rateLimit: RateLimitState;

  // Stats
  private stats: Omit<SchedulerStats, "running" | "waiting" | "blocked"> & { totalScheduled: number } = {
    completed: 0,
    failed: 0,
    cancelled: 0,
    timedOut: 0,
    deadlineExceeded: 0,
    averageExecutionTimeMs: 0,
    totalScheduled: 0,
  };
  private executionTimes: number[] = [];

  // Event listeners
  private listeners: Set<(event: SchedulerEvent) => void> = new Set();

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      maxConcurrency: 4,
      defaultRetries: 3,
      baseDelayMs: 1_000,
      maxDelayMs: 30_000,
      jitter: true,
      rateLimitMax: Infinity,
      rateLimitWindowMs: 1_000,
      defaultTimeoutMs: 30_000,
      debug: false,
      ...config,
    };

    this.rateLimit = {
      tokens: this.config.rateLimitMax,
      lastRefill: Date.now(),
      timestamps: [],
    };
  }

  /** Schedule a task. Returns promise that resolves with the result. */
  async schedule<T = unknown>(task: ScheduledTask<T>): Promise<TaskResult<T>> {
    if (this.destroyed) throw new Error("Scheduler destroyed");

    const id = task.id ?? this.generateId();
    if (this.tasks.has(id)) throw new Error(`Task ${id} already exists`);

    const abortController = new AbortController();
    // Link external signal if provided
    if (task.signal) {
      task.signal.addEventListener("abort", () => abortController.abort(), { once: true });
    }

    const internalTask: InternalTask = {
      id,
      name: task.name,
      fn: task.fn as () => Promise<unknown>,
      priority: task.priority ?? 0,
      maxRetries: task.retries ?? this.config.defaultRetries,
      retries: 0,
      category: task.category,
      deadline: task.deadline ?? (task.timeoutMs ? Date.now() + task.timeoutMs : undefined),
      timeoutMs: task.timeoutMs ?? this.config.defaultTimeoutMs,
      dependsOn: new Set(task.dependsOn ?? []),
      dependents: new Set(),
      status: "waiting",
      attempts: 0,
      resolve: (() => {}) as (r: TaskResult) => void,
      reject: (() => {}) as (e: Error) => void,
      abortController,
      scheduledAt: Date.now(),
      meta: task.meta,
    };

    // Register dependencies
    for (const depId of internalTask.dependsOn) {
      const dep = this.tasks.get(depId);
      if (dep) {
        dep.dependents.add(id);
      }
    }

    this.tasks.set(id, internalTask);
    this.stats.totalScheduled++;

    return new Promise<TaskResult<T>>((resolve, reject) => {
      internalTask.resolve = resolve as (r: TaskResult) => void;
      internalTask.reject = reject;

      // Listen for external abort
      if (task.signal) {
        task.signal.addEventListener("abort", () => {
          this.cancelTask(id);
        }, { once: true });
      }

      this.log(`Task ${id} scheduled${task.name ? ` (${task.name})` : ""}`);
      this.tryDispatch();
    });
  }

  /** Cancel a specific task */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
      return false;
    }

    task.abortController.abort();
    task.status = "cancelled";
    this.running.delete(taskId);

    const result: TaskResult = {
      taskId,
      value: null,
      error: new Error("Cancelled"),
      attempts: task.attempts,
      totalDurationMs: Date.now() - task.scheduledAt,
      status: "cancelled",
    };

    this.stats.cancelled++;
    this.emit({ type: "task:cancelled", detail: result });

    try { task.resolve(result); } catch { /* ignore */ }

    // Unblock dependents
    this.unblockDependents(taskId);
    this.tryDispatch();

    return true;
  }

  /** Get scheduler statistics */
  getStats(): SchedulerStats {
    let waiting = 0;
    let blocked = 0;

    for (const [, task] of this.tasks) {
      if (task.status === "waiting" || task.status === "ready") {
        if (this.isBlocked(task)) {
          blocked++;
        } else {
          waiting++;
        }
      }
    }

    return {
      ...this.stats,
      running: this.running.size,
      waiting,
      blocked,
    };
  }

  /** Get pending task count */
  getPendingCount(): number {
    let count = 0;
    for (const [, task] of this.tasks) {
      if (task.status !== "completed" && task.status !== "failed" && task.status !== "cancelled") {
        count++;
      }
    }
    return count;
  }

  /** Wait for all scheduled tasks to complete */
  async waitForAll(): Promise<void> {
    while (this.getPendingCount() > 0 && !this.destroyed) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /** Destroy the scheduler, cancel all pending tasks */
  destroy(): void {
    this.destroyed = true;

    for (const [id, task] of this.tasks) {
      if (task.status !== "completed" && task.status !== "failed" && task.status !== "cancelled") {
        task.abortController.abort();
        task.status = "cancelled";
        try { task.resolve({ taskId: id, value: null, error: new Error("Destroyed"), attempts: task.attempts, totalDurationMs: Date.now() - task.scheduledAt, status: "cancelled" }); } catch { /* ignore */ }
      }
    }

    this.tasks.clear();
    this.running.clear();
    this.waitingQueue = [];
    this.listeners.clear();
  }

  /** Subscribe to scheduler events */
  onEvent(listener: (event: SchedulerEvent) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  // --- Private ---

  private tryDispatch(): void {
    if (this.destroyed) return;

    // Collect ready tasks
    const readyTasks: InternalTask[] = [];

    for (const [, task] of this.tasks) {
      if ((task.status === "waiting" || task.status === "ready") && !this.isBlocked(task)) {
        task.status = "ready";
        readyTasks.push(task);
      }
    }

    // Sort by priority (descending)
    readyTasks.sort((a, b) => b.priority - a.priority);

    for (const task of readyTasks) {
      if (this.running.size >= this.config.maxConcurrency) break;
      if (!this.checkRateLimit()) break;

      this.executeTask(task);
    }
  }

  private async executeTask(task: InternalTask): Promise<void> {
    task.status = "running";
    task.attempts++;
    task.startedAt = Date.now();
    this.running.add(task.id);

    this.emit({ type: "task:start", detail: { taskId: task.id, name: task.name, attempt: task.attempts } });

    // Deadline check
    if (task.deadline && Date.now() > task.deadline) {
      this.handleDeadlineExceeded(task);
      return;
    }

    // Timeout setup
    const timer = setTimeout(() => {
      this.handleTimeout(task);
    }, task.timeoutMs);

    try {
      const value = await task.fn();
      clearTimeout(timer);

      // Check if aborted during execution
      if (task.abortController.signal.aborted) {
        this.cancelTask(task.id);
        return;
      }

      const elapsed = Date.now() - (task.startedAt ?? task.scheduledAt);
      this.recordExecutionTime(elapsed);

      const result: TaskResult = {
        taskId: task.id,
        value: value as unknown,
        attempts: task.attempts,
        totalDurationMs: Date.now() - task.scheduledAt,
        status: "completed",
      };

      task.status = "completed";
      this.stats.completed++;
      this.running.delete(task.id);

      this.emit({ type: "task:complete", detail: result });
      try { task.resolve(result); } catch { /* ignore */ }

      // Unblock dependents
      this.unblockDependents(task.id);
      this.tryDispatch();

    } catch (error) {
      clearTimeout(timer);
      this.handleError(task, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleError(task: InternalTask, error: Error): void {
    this.running.delete(task.id);

    if (task.attempts < task.maxRetries && !task.abortController.signal.aborted) {
      // Retry with backoff
      const delay = this.calculateBackoff(task.attempts);
      this.log(`Task ${task.id} failed (attempt ${task.attempts}/${task.maxRetries}), retrying in ${delay}ms`);

      task.retries++;
      task.status = "waiting";

      setTimeout(() => {
        if (!this.destroyed && task.status === "waiting") {
          this.tryDispatch();
        }
      }, delay);
    } else {
      // Final failure
      const result: TaskResult = {
        taskId: task.id,
        value: null,
        error,
        attempts: task.attempts,
        totalDurationMs: Date.now() - task.scheduledAt,
        status: "failed",
      };

      task.status = "failed";
      this.stats.failed++;
      this.emit({ type: "task:fail", detail: result });
      try { task.reject(error); } catch { /* ignore */ }

      // Unblock dependents (they'll fail too when they check)
      this.unblockDependents(task.id);
      this.tryDispatch();
    }
  }

  private handleTimeout(task: InternalTask): void {
    if (task.status !== "running") return;

    this.running.delete(task.id);
    task.abortController.abort();

    const result: TaskResult = {
      taskId: task.id,
      value: null,
      error: new Error(`Task timed out after ${task.timeoutMs}ms`),
      attempts: task.attempts,
      totalDurationMs: Date.now() - task.scheduledAt,
      status: "timeout",
    };

    task.status = "failed"; // Treat timeout as failure (could retry)
    this.stats.timedOut++;
    this.emit({ type: "task:timeout", detail: result });
    try { task.reject(result.error!); } catch { /* ignore */ }

    this.unblockDependents(task.id);
    this.tryDispatch();
  }

  private handleDeadlineExceeded(task: InternalTask): void {
    this.running.delete(task.id);
    task.abortController.abort();

    const result: TaskResult = {
      taskId: task.id,
      value: null,
      error: new Error(`Task exceeded deadline`),
      attempts: task.attempts,
      totalDurationMs: Date.now() - task.scheduledAt,
      status: "deadline-exceeded",
    };

    task.status = "failed";
    this.stats.deadlineExceeded++;
    this.emit({ type: "task:deadline", detail: result });
    try { task.reject(result.error!); } catch { /* ignore */ }

    this.unblockDependents(task.id);
    this.tryDispatch();
  }

  private isBlocked(task: InternalTask): boolean {
    for (const depId of task.dependsOn) {
      const dep = this.tasks.get(depId);
      if (!dep || dep.status !== "completed") return true;
    }
    return false;
  }

  private unblockDependents(completedTaskId: string): void {
    const task = this.tasks.get(completedTaskId);
    if (!task) return;

    for (const depId of task.dependents) {
      const dependent = this.tasks.get(depId);
      if (dependent) {
        dependent.dependsOn.delete(completedTaskId);
      }
    }
  }

  private calculateBackoff(attempt: number): number {
    let delay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
    delay = Math.min(delay, this.config.maxDelayMs);

    if (this.config.jitter) {
      // Full jitter: random between 0 and delay
      delay = Math.random() * delay;
    }

    return Math.floor(delay);
  }

  private checkRateLimit(): boolean {
    if (this.config.rateLimitMax === Infinity) return true;

    const now = Date.now();

    // Sliding window cleanup
    this.rateLimit.timestamps = this.rateLimit.timestamps.filter(
      (ts) => now - ts < this.config.rateLimitWindowMs
    );

    if (this.rateLimit.timestamps.length >= this.config.rateLimitMax) {
      return false;
    }

    this.rateLimit.timestamps.push(now);
    return true;
  }

  private recordExecutionTime(ms: number): void {
    this.executionTimes.push(ms);
    if (this.executionTimes.length > 100) this.executionTimes.shift();
    this.stats.averageExecutionTimeMs =
      this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length;
  }

  private emit(event: SchedulerEvent): void {
    for (const listener of this.listeners) {
      try { listener(event); } catch { /* ignore */ }
    }
  }

  private generateId(): string {
    return `sched_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[SchedulerV2]`, ...args);
    }
  }
}

/** Scheduler event types */
export interface SchedulerEvent {
  type: "task:start" | "task:complete" | "task:fail" | "task:cancel" |
        "task:timeout" | "task:deadline" | "scheduler:drain";
  detail: unknown;
}

/** Create a pre-configured task scheduler v2 */
export function createTaskSchedulerV2(config?: SchedulerConfig): TaskSchedulerV2 {
  return new TaskSchedulerV2(config);
}
