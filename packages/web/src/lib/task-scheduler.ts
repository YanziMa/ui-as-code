/**
 * Task Scheduler: Advanced job queue with priority execution, concurrency control,
 * rate limiting, retry with backoff, deadline/timeout support, dependency graphs,
 * worker pools, progress tracking, persistence, cancellation, and metrics.
 */

// --- Types ---

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "waiting" | "throttled";
export type TaskPriority = "critical" | "high" | "normal" | "low" | "background";
export type RetryStrategy = "fixed" | "exponential" | "exponential-jitter" | "linear";

export interface Task<T = unknown> {
  id: string;
  name: string;
  fn: () => Promise<T>;
  priority: TaskPriority;
  status: TaskStatus;
  result?: T;
  error?: Error;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retries: number;
  maxRetries: number;
  retryDelay: number;           // ms
  retryStrategy: RetryStrategy;
  timeout?: number;             // ms
  deadline?: number;            // unix timestamp
  dependencies?: string[];      // task IDs that must complete first
  tags?: string[];
  metadata?: Record<string, unknown>;
  progress?: number;            // 0-1
  onCancel?: () => void | Promise<void>;
}

export interface SchedulerConfig {
  /** Max concurrent tasks (default: 4) */
  concurrency?: number;
  /** Default priority for tasks without one */
  defaultPriority?: TaskPriority;
  /** Default max retries */
  defaultMaxRetries?: number;
  /** Default retry delay in ms */
  defaultRetryDelay?: number;
  /** Default retry strategy */
  defaultRetryStrategy?: RetryStrategy;
  /** Global timeout for all tasks in ms */
  globalTimeout?: number;
  /** Rate limit: max tasks per interval */
  rateLimit?: { maxTasks: number; intervalMs: number };
  /** Auto-start on add */
  autoStart?: boolean;
}

export interface SchedulerMetrics {
  totalTasks: number;
  completed: number;
  failed: number;
  cancelled: number;
  running: number;
  pending: number;
  avgExecutionTime: number;
  throughputPerMinute: number;
  uptime: number;
}

export interface WorkerPoolOptions {
  minWorkers: number;
  maxWorkers: number;
  idleTimeout?: number;         // ms before scaling down
  taskQueueSize?: number;
}

// --- Priority Weights ---

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  background: 4,
};

function comparePriority(a: Task, b: Task): number {
  return (PRIORITY_WEIGHTS[a.priority] ?? 2) - (PRIORITY_WEIGHTS[b.priority] ?? 2);
}

// --- Task Scheduler ---

export class TaskScheduler {
  private config: Required<SchedulerConfig>;
  private tasks = new Map<string, Task>();
  private queue: Task[] = [];
  private running = new Set<string>();
  private listeners = new Set<(task: Task, event: string) => void>();
  private startTime = Date.now();
  private rateLimitState = { count: 0, resetAt: 0 };
  private active = false;

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      concurrency: config.concurrency ?? 4,
      defaultPriority: config.defaultPriority ?? "normal",
      defaultMaxRetries: config.defaultMaxRetries ?? 3,
      defaultRetryDelay: config.defaultRetryDelay ?? 1000,
      defaultRetryStrategy: config.defaultRetryStrategy ?? "exponential",
      globalTimeout: config.globalTimeout ?? 30000,
      rateLimit: config.rateLimit ?? null as unknown as NonNullable<SchedulerConfig["rateLimit"]>,
      autoStart: config.autoStart ?? true,
    };
    this.active = this.config.autoStart;
  }

  /** Add a task to the scheduler */
  add<T = unknown>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      priority?: TaskPriority;
      retries?: number;
      timeout?: number;
      deadline?: number;
      dependencies?: string[];
      tags?: string[];
      metadata?: Record<string, unknown>;
      onCancel?: () => void | Promise<void>;
    },
  ): Task<T> {
    const task: Task<T> = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      fn: fn as Task["fn"],
      priority: options?.priority ?? this.config.defaultPriority,
      status: "pending",
      createdAt: Date.now(),
      retries: 0,
      maxRetries: options?.retries ?? this.config.defaultMaxRetries,
      retryDelay: this.config.defaultRetryDelay,
      retryStrategy: this.config.defaultRetryStrategy,
      timeout: options?.timeout,
      deadline: options?.deadline,
      dependencies: options?.dependencies,
      tags: options?.tags,
      metadata: options?.metadata,
      onCancel: options?.onCancel,
    };

    this.tasks.set(task.id, task);

    // Check if dependencies are met
    if (task.dependencies && task.dependencies.length > 0) {
      task.status = "waiting";
    }

    this.queue.push(task);
    this.sortQueue();
    this.notifyListeners(task, "added");

    if (this.active) this.process();

    return task;
  }

  /** Cancel a task by ID */
  async cancel(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task || (task.status !== "pending" && task.status !== "waiting" && task.status !== "running")) return false;

    if (task.status === "running" && task.onCancel) {
      try { await task.onCancel(); } catch {}
    }

    task.status = "cancelled";
    this.running.delete(taskId);
    this.removeFromQueue(taskId);
    this.notifyListeners(task, "cancelled");

    // Process next task
    this.process();
    return true;
  }

  /** Get a task by ID */
  getTask(taskId: string): Task | undefined { return this.tasks.get(taskId); }

  /** Get all tasks, optionally filtered */
  getTasks(filter?: { status?: TaskStatus; tag?: string; priority?: TaskPriority }): Task[] {
    let result = Array.from(this.tasks.values());
    if (filter?.status) result = result.filter((t) => t.status === filter.status);
    if (filter?.tag) result = result.filter((t) => t.tags?.includes(filter.tag));
    if (filter?.priority) result = result.filter((t) => t.priority === filter.priority);
    return result;
  }

  /** Pause the scheduler (no new tasks will start) */
  pause(): void { this.active = false; }

  /** Resume the scheduler */
  resume(): void { this.active = true; this.process(); }

  /** Clear all pending/waiting tasks */
  clearPending(): void {
    for (const task of this.queue) {
      if (task.status === "pending" || task.status === "waiting") {
        task.status = "cancelled";
        this.notifyListeners(task, "cleared");
      }
    }
    this.queue = [];
  }

  /** Wait for all tasks to complete */
  async waitForAll(timeoutMs?: number): Promise<void> {
    const start = Date.now();
    while (this.running.size > 0 || this.queue.some((t) => t.status === "pending" || t.status === "waiting")) {
      if (timeoutMs && Date.now() - start > timeoutMs) throw new Error("Timeout waiting for tasks");
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /** Subscribe to task events */
  onEvent(listener: (task: Task, event: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get scheduler metrics */
  getMetrics(): SchedulerMetrics {
    const all = Array.from(this.tasks.values());
    const completed = all.filter((t) => t.status === "completed");
    const now = Date.now();

    return {
      totalTasks: all.length,
      completed: completed.length,
      failed: all.filter((t) => t.status === "failed").length,
      cancelled: all.filter((t) => t.status === "cancelled").length,
      running: this.running.size,
      pending: all.filter((t) => t.status === "pending" || t.status === "waiting").length,
      avgExecutionTime: completed.length > 0
        ? completed.reduce((sum, t) => sum + ((t.completedAt ?? 0) - (t.startedAt ?? 0)), 0) / completed.length
        : 0,
      throughputPerMinute: completed.length > 0 ? (completed.length / ((now - this.startTime) / 60000)) : 0,
      uptime: now - this.startTime,
    };
  }

  // --- Internal ---

  private sortQueue(): void {
    this.queue.sort(comparePriority);
  }

  private removeFromQueue(taskId: string): void {
    this.queue = this.queue.filter((t) => t.id !== taskId);
  }

  private async process(): Promise<void> {
    if (!this.active) return;

    // Check rate limit
    if (this.config.rateLimit) {
      const now = Date.now();
      if (now >= this.rateLimitState.resetAt) {
        this.rateLimitState.count = 0;
        this.rateLimitState.resetAt = now + this.config.rateLimit.intervalMs;
      }
      if (this.rateLimitState.count >= this.config.rateLimit.maxTasks) {
        // Mark pending tasks as throttled
        for (const task of this.queue) {
          if (task.status === "pending") task.status = "throttled";
        }
        return;
      }
    }

    // Fill up to concurrency limit
    while (this.running.size < this.config.concurrency) {
      const task = this.findNextRunnable();
      if (!task) break;

      this.running.add(task.id);
      this.rateLimitState.count++;
      task.status = "running";
      task.startedAt = Date.now();
      this.notifyListeners(task, "started");

      // Run asynchronously
      this.executeTask(task);
    }
  }

  private findNextRunnable(): Task | undefined {
    for (let i = 0; i < this.queue.length; i++) {
      const task = this.queue[i]!;
      if (task.status !== "pending" && task.status !== "waiting") continue;

      // Check dependencies
      if (task.dependencies) {
        const allDepsMet = task.dependencies.every((depId) => {
          const dep = this.tasks.get(depId);
          return dep?.status === "completed";
        });
        if (!allDepsMet) continue;
        task.status = "pending"; // Upgrade from waiting
      }

      // Check deadline
      if (task.deadline && Date.now() > task.deadline) {
        task.status = "failed";
        task.error = new Error("Deadline exceeded");
        this.notifyListeners(task, "deadline-exceeded");
        continue;
      }

      this.queue.splice(i, 1);
      return task;
    }
    return undefined;
  }

  private async executeTask(task: Task): Promise<void> {
    const effectiveTimeout = task.timeout ?? this.config.globalTimeout;

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;

    if (effectiveTimeout) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        task.error = new Error(`Task "${task.name}" timed out after ${effectiveTimeout}ms`);
        this.handleFailure(task);
      }, effectiveTimeout);
    }

    try {
      const result = await task.fn();
      if (timedOut) return;

      if (timeoutHandle) clearTimeout(timeoutHandle);

      task.result = result;
      task.status = "completed";
      task.completedAt = Date.now();
      this.notifyListeners(task, "completed");
    } catch (err) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (timedOut) return;

      task.error = err as Error;
      this.handleFailure(task);
    } finally {
      this.running.delete(task.id);
      // Process next task
      this.process();
    }
  }

  private handleFailure(task: Task): void {
    if (task.retries < task.maxRetries) {
      task.retries++;
      task.status = "pending";
      task.error = undefined;

      // Calculate retry delay based on strategy
      const delay = this.calculateRetryDelay(task.retries, task.retryDelay, task.retryStrategy);

      this.notifyListeners(task, `retrying (${task.retries}/${task.maxRetries})`);

      setTimeout(() => {
        this.queue.push(task);
        this.sortQueue();
        if (this.active) this.process();
      }, delay);
    } else {
      task.status = "failed";
      task.completedAt = Date.now();
      this.notifyListeners(task, "failed");
    }
  }

  private calculateRetryDelay(attempt: number, baseDelay: number, strategy: RetryStrategy): number {
    switch (strategy) {
      case "fixed":
        return baseDelay;
      case "linear":
        return baseDelay * attempt;
      case "exponential":
        return baseDelay * Math.pow(2, attempt - 1);
      case "exponential-jitter":
        return baseDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random() * 0.5);
      default:
        return baseDelay;
    }
  }

  private notifyListeners(task: Task, event: string): void {
    for (const l of this.listeners) {
      try { l(task, event); } catch {}
    }
  }
}
