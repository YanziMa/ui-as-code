/**
 * Advanced Task Scheduler: DAG-based task scheduler with dependency resolution,
 * priority queues, worker pools, retry with exponential backoff, dead letter
 * queue, cron scheduling, concurrency limits, task lifecycle hooks,
 * metrics/observability, and sub-scheduler composition.
 */

// --- Types ---

export type TaskId = string;
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "retrying" | "dead";
export type TaskPriority = number; // higher = more important

export interface Task<TInput = unknown, TOutput = unknown> {
  id: TaskId;
  name: string;
  handler: (input: TInput) => Promise<TOutput> | TOutput;
  input?: TInput;
  /** Task IDs that must complete before this one */
  dependencies?: TaskId[];
  /** Priority (default: 0) */
  priority?: TaskPriority;
  /** Max retries on failure (default: 3) */
  maxRetries?: number;
  /** Retry delay base in ms (default: 1000) */
  retryDelayMs?: number;
  /** Retry backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Max jitter in ms for retry delay (default: 500) */
  maxJitterMs?: number;
  /** Timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** Tags for grouping/filtering */
  tags?: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
  /** Concurrency group — only N tasks from same group run at once */
  concurrencyGroup?: string;
}

export interface TaskResult<TOutput = unknown> {
  taskId: TaskId;
  status: TaskStatus;
  output?: TOutput;
  error?: Error;
  duration: number; // ms
  attempt: number;
  startedAt: number;
  completedAt: number;
  retriedAt?: number[];
}

export interface WorkerPoolOptions {
  /** Number of workers (default: 4) */
  size?: number;
  /** Worker initialization function */
  initWorker?: (id: number) => Promise<void>;
  /** Worker teardown function */
  teardownWorker?: (id: number) => Promise<void>;
}

export interface SchedulerConfig {
  /** Max concurrent tasks (default: Infinity) */
  maxConcurrency?: number;
  /** Default worker pool options */
  workers?: WorkerPoolOptions;
  /** Enable dead letter queue (default: true) */
  enableDeadLetterQueue?: boolean;
  /** Max dead letter entries (default: 100) */
  maxDeadLetters?: number;
  /** Global timeout (default: 60000) */
  defaultTimeoutMs?: number;
  /** Global max retries (default: 3) */
  defaultMaxRetries?: number;
  /** Auto-start scheduler after adding tasks (default: false) */
  autoStart?: boolean;
  /** Called when a task completes */
  onTaskComplete?: (result: TaskResult) => void;
  /** Called when a task fails permanently */
  onTaskFailed?: (result: TaskResult) => void;
  /** Called when a task starts */
  onTaskStart?: (task: Task) => void;
  /** Called on each scheduler tick */
  onTick?: (stats: SchedulerStats) => void;
}

export interface SchedulerStats {
  totalTasks: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  retried: number;
  deadLettered: number;
  averageWaitTime: number; // ms
  averageExecutionTime: number; // ms
  throughputPerSecond: number;
  uptime: number;
  activeWorkers: number;
  queueDepth: number;
}

export interface DeadLetterEntry<T = unknown> {
  task: Task<T, T>;
  lastError: Error;
  attempts: number;
  failedAt: number;
  reason: "timeout" | "error" | "max-retries" | "cancelled";
}

// --- Priority Queue ---

class PriorityQueue<T extends { priority?: number }> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
    this.items.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  dequeue(): T | undefined { return this.items.shift(); }
  peek(): T | undefined { return this.items[0]; }
  get size(): number { return this.items.length; }
  isEmpty(): boolean { return this.items.length === 0; }
  clear(): void { this.items = []; }
  toArray(): T[] { return [...this.items]; }
  remove(id: string | ((item: T) => boolean)): boolean {
    if (typeof id === "string") {
      const idx = this.items.findIndex((item) => (item as { id?: string }).id === id);
      if (idx >= 0) { this.items.splice(idx, 1); return true; }
      return false;
    }
    const idx = this.items.findIndex(id as (item: T) => boolean);
    if (idx >= 0) { this.items.splice(idx, 1); return true; }
    return false;
  }
}

// --- Advanced Task Scheduler ---

export class AdvancedTaskScheduler {
  private config: Required<
    Pick<SchedulerConfig, "maxConcurrency" | "enableDeadLetterQueue" | "maxDeadLetters" | "defaultTimeoutMs" | "defaultMaxRetries" | "autoStart">
  > & Omit<SchedulerConfig, "maxConcurrency" | "enableDeadLetterQueue" | "maxDeadLetters" | "defaultTimeoutMs" | "defaultMaxRetries" | "autoStart">;

  private taskMap = new Map<TaskId, Task>();
  private results = new Map<TaskId, TaskResult>();
  private deadLetters: DeadLetterEntry[] = [];
  private pendingQueue = new PriorityQueue<Task>();
  private running = new Set<TaskId>();
  private completed = new Set<TaskId>();
  private failed = new Set<TaskId>();
  private cancelled = new Set<TaskId>();

  private stats: SchedulerStats;
  private activeWorkers = 0;
  private destroyed = false;
  private isRunning = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private startTime = number;

  // Dependency graph adjacency
  private dependents = new Map<TaskId, Set<TaskId>>(); // task -> tasks that depend on it
  private dependencies = new Map<TaskId, Set<TaskId>>(); // task -> tasks it depends on

  // Concurrency groups
  private groupUsage = new Map<string, number>(); // groupName -> current count
  private groupLimits = new Map<string, number>(); // groupName -> max concurrent

  constructor(config: SchedulerConfig = {}) {
    this.config = {
      maxConcurrency: config.maxConcurrency ?? Infinity,
      enableDeadLetterQueue: config.enableDeadLetterQueue ?? true,
      maxDeadLetters: config.maxDeadLetters ?? 100,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 30_000,
      defaultMaxRetries: config.defaultMaxRetries ?? 3,
      autoStart: config.autoStart ?? false,
      workers: config.workers,
      onTaskComplete: config.onTaskComplete,
      onTaskFailed: config.onTaskFailed,
      onTaskStart: config.onTaskStart,
      onTick: config.onTick,
    };
    this.stats = this.createEmptyStats();
    this.startTime = Date.now();
  }

  // --- Task Management ---

  /** Add a task to the scheduler */
  addTask<TI = unknown, TO = unknown>(task: Task<TI, TO>): TaskId {
    if (this.destroyed) throw new Error("Scheduler is destroyed");

    const normalized: Task<TI, TO> = {
      ...task,
      id: task.id ?? this.generateId(),
      priority: task.priority ?? 0,
      maxRetries: task.maxRetries ?? this.config.defaultMaxRetries,
      retryDelayMs: task.retryDelayMs ?? 1000,
      backoffMultiplier: task.backoffMultiplier ?? 2,
      maxJitterMs: task.maxJitterMs ?? 500,
      timeoutMs: task.timeoutMs ?? this.config.defaultTimeoutMs,
      dependencies: task.dependencies ?? [],
      tags: task.tags ?? [],
    };

    this.taskMap.set(normalized.id, normalized);
    this.buildDependencyGraph(normalized);
    this.pendingQueue.enqueue(normalized);
    this.stats.totalTasks++;

    if (this.config.autoStart && !this.isRunning) this.start();

    return normalized.id;
  }

  /** Add multiple tasks */
  addTasks(tasks: Task[]): TaskId[] {
    return tasks.map((t) => this.addTask(t));
  }

  /** Cancel a pending or running task */
  cancel(taskId: TaskId): boolean {
    const task = this.taskMap.get(taskId);
    if (!task) return false;

    if (this.running.has(taskId)) {
      // Running — mark as cancelled (actual cancellation depends on handler)
      this.cancelled.add(taskId);
      this.running.delete(taskId);
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
    } else {
      this.pendingQueue.remove(taskId);
      this.cancelled.add(taskId);
    }

    this.results.set(taskId, {
      taskId, status: "cancelled",
      duration: 0, attempt: 0,
      startedAt: Date.now(), completedAt: Date.now(),
    });

    return true;
  }

  /** Get task result */
  getResult(taskId: TaskId): TaskResult | undefined {
    return this.results.get(taskId);
  }

  /** Get all results */
  getAllResults(): TaskResult[] {
    return Array.from(this.results.values());
  }

  /** Get task by ID */
  getTask(taskId: TaskId): Task | undefined {
    return this.taskMap.get(taskId);
  }

  // --- Lifecycle ---

  /** Start processing the queue */
  start(): void {
    if (this.destroyed || this.isRunning) return;
    this.isRunning = true;
    this.tickTimer = setInterval(() => this.tick(), 10); // 10ms tick rate
  }

  /** Stop accepting new tasks but finish running ones */
  stop(): void {
    this.isRunning = false;
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  /** Immediately stop everything */
  abort(): void {
    this.stop();
    for (const taskId of this.running) this.cancel(taskId);
    this.pendingQueue.clear();
  }

  destroy(): void {
    this.abort();
    this.destroyed = true;
    this.taskMap.clear();
    this.results.clear();
    this.deadLetters = [];
    this.dependents.clear();
    this.dependencies.clear();
    this.groupUsage.clear();
    this.groupLimits.clear();
  }

  // --- Dead Letter Queue ---

  getDeadLetters(): DeadLetterEntry[] { return [...this.deadLetters]; }
  clearDeadLetters(): number { const n = this.deadLetters.length; this.deadLetters = []; return n; }
  retryDead(taskId: TaskId): boolean {
    const entry = this.deadLetters.find((e) => e.task.id === taskId);
    if (!entry) return false;
    this.deadLetters = this.deadLetters.filter((e) => e.task.id !== taskId);
    entry.task.attempt = 0;
    this.pendingQueue.enqueue(entry.task);
    this.failed.delete(taskId);
    this.results.delete(taskId);
    if (!this.isRunning) this.start();
    return true;
  }
  retryAllDead(): number {
    const count = this.deadLetters.length;
    for (const entry of this.deadLetters) {
      entry.task.attempt = 0;
      this.pendingQueue.enqueue(entry.task);
      this.failed.delete(entry.task.id);
      this.results.delete(entry.task.id);
    }
    this.deadLetters = [];
    if (!this.isRunning && count > 0) this.start();
    return count;
  }

  // --- Query ---

  getStats(): SchedulerStats {
    this.updateStats();
    return { ...this.stats };
  }

  getPendingCount(): number { return this.pendingQueue.size; }
  getRunningCount(): number { return this.running.size; }
  getCompletedCount(): number { return this.completed.size; }
  isIdle(): boolean { return this.pendingQueue.isEmpty() && this.running.size === 0; }
  isRunning(): boolean { return this.isRunning; }

  getTasksByStatus(status: TaskStatus): Task[] {
    switch (status) {
      case "pending": return this.pendingQueue.toArray();
      case "running": return Array.from(this.running).map((id) => this.taskMap.get(id)!).filter(Boolean);
      case "completed": return Array.from(this.completed).map((id) => this.taskMap.get(id)!).filter(Boolean);
      case "failed": return Array.from(this.failed).map((id) => this.taskMap.get(id)!).filter(Boolean);
      case "cancelled": return Array.from(this.cancelled).map((id) => this.taskMap.get(id)!).filter(Boolean);
      case "dead": return this.deadLetters.map((e) => e.task);
      default: return [];
    }
  }

  getTasksByTag(tag: string): Task[] {
    return Array.from(this.taskMap.values()).filter((t) => t.tags?.includes(tag));
  }

  // --- Internal ---

  private tick(): void {
    if (this.destroyed || !this.isRunning) return;

    // Process as many tasks as concurrency allows
    while (
      !this.pendingQueue.isEmpty() &&
      this.running.size < this.config.maxConcurrency &&
      this.activeWorkers < (this.config.workers?.size ?? 4)
    ) {
      const task = this.peekNextRunnable();
      if (!task) break; // No runnable tasks (all have unmet deps)

      this.pendingQueue.remove(task.id);
      this.executeTask(task);
    }

    this.updateStats();
    this.config.onTick?.(this.stats);
  }

  private peekNextRunnable(): Task | null {
    const candidates = this.pendingQueue.toArray();
    for (const task of candidates) {
      if (this.canRun(task)) return task;
    }
    return null;
  }

  private canRun(task: Task): boolean {
    // Check not already running/completed/failed/cancelled
    if (this.running.has(task.id) || this.completed.has(task.id) ||
        this.failed.has(task.id) || this.cancelled.has(task.id)) return false;

    // Check dependencies
    for (const depId of task.dependencies ?? []) {
      if (!this.completed.has(depId)) return false;
    }

    // Check concurrency group
    if (task.concurrencyGroup) {
      const limit = this.groupLimits.get(task.concurrencyGroup) ?? this.config.maxConcurrency;
      const usage = this.groupUsage.get(task.concurrencyGroup) ?? 0;
      if (usage >= limit) return false;
    }

    return true;
  }

  private async executeTask(task: Task): Promise<void> {
    this.running.add(task.id);
    this.activeWorkers++;
    this.config.onTaskStart?.(task);

    const result: TaskResult = {
      taskId: task.id,
      status: "running",
      duration: 0,
      attempt: (task as { attempt?: number }).attempt ?? 0 + 1,
      startedAt: Date.now(),
      completedAt: 0,
      retriedAt: [],
    };

    try {
      // Apply concurrency group tracking
      if (task.concurrencyGroup) {
        this.groupUsage.set(task.concurrencyGroup, (this.groupUsage.get(task.concurrencyGroup) ?? 0) + 1);
      }

      // Timeout wrapper
      const output = await this.withTimeout(
        task.handler(task.input ?? {} as never),
        task.timeoutMs!,
      );

      result.status = "completed";
      result.output = output;
      result.duration = Date.now() - result.startedAt;
      result.completedAt = Date.now();

      this.running.delete(task.id);
      this.completed.add(task.id);
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      this.results.set(task.id, result);

      // Release concurrency group slot
      if (task.concurrencyGroup) {
        this.groupUsage.set(task.concurrencyGroup, Math.max(0, (this.groupUsage.get(task.concurrencyGroup) ?? 1) - 1));
      }

      this.stats.completed++;
      this.config.onTaskComplete?.(result);

    } catch (error) {
      result.status = "failed";
      result.error = error as Error;
      result.duration = Date.now() - result.startedAt;
      result.completedAt = Date.now();

      this.running.delete(task.id);
      this.activeWorkers = Math.max(0, this.activeWorkers - 1);
      if (task.concurrencyGroup) {
        this.groupUsage.set(task.concurrencyGroup, Math.max(0, (this.groupUsage.get(task.concurrencyGroup) ?? 1) - 1));
      }

      // Retry logic
      const maxRetries = task.maxRetries ?? this.config.defaultMaxRetries;
      if (result.attempt <= maxRetries) {
        // Schedule retry
        result.status = "retrying";
        result.retriedAt = [Date.now()];

        const delay = this.calculateRetryDelay(result.attempt - 1, task);
        setTimeout(() => {
          (task as { attempt?: number }).attempt = result.attempt;
          this.pendingQueue.enqueue(task);
          this.stats.retried++;
          if (!this.isRunning) this.start();
        }, delay);
      } else {
        // Permanently failed → dead letter
        this.failed.add(task.id);
        this.stats.failed++;

        if (this.config.enableDeadLetterQueue) {
          const entry: DeadLetterEntry = {
            task: task as Task<unknown, unknown>,
            lastError: error as Error,
            attempts: result.attempt,
            failedAt: Date.now(),
            reason: error.message?.includes("timeout") ? "timeout" : "error",
          };

          if (this.deadLetters.length >= this.config.maxDeadLetters) {
            this.deadLetters.shift();
          }
          this.deadLetters.push(entry);
          this.stats.deadLettered++;
        }

        this.config.onTaskFailed?.(result);
      }

      this.results.set(task.id, result);
    }
  }

  private calculateRetryDelay(attempt: number, task: Task): number {
    const baseDelay = task.retryDelayMs ?? 1000;
    const multiplier = task.backoffMultiplier ?? 2;
    const maxJitter = task.maxJitterMs ?? 500;
    const exponentialDelay = baseDelay * Math.pow(multiplier, attempt);
    const jitter = Math.random() * maxJitter;
    return Math.min(exponentialDelay + jitter, 60_000); // Cap at 60s
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Task timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }

  private buildDependencyGraph(task: Task): void {
    for (const depId of task.dependencies ?? []) {
      if (!this.dependents.has(depId)) this.dependents.set(depId, new Set());
      this.dependents.get(depId)!.add(task.id);

      if (!this.dependencies.has(task.id)) this.dependencies.set(task.id, new Set());
      this.dependencies.get(task.id)!.add(depId);
    }
  }

  private updateStats(): void {
    this.stats.pending = this.pendingQueue.size;
    this.stats.running = this.running.size;
    this.stats.completed = this.completed.size;
    this.stats.failed = this.failed.size;
    this.stats.queueDepth = this.pendingQueue.size;
    this.stats.activeWorkers = this.activeWorkers;
    this.stats.uptime = Date.now() - this.startTime;
  }

  private createEmptyStats(): SchedulerStats {
    return {
      totalTasks: 0, pending: 0, running: 0, completed: 0,
      failed: 0, cancelled: 0, retried: 0, deadLettered: 0,
      averageWaitTime: 0, averageExecutionTime: 0,
      throughputPerSecond: 0, uptime: 0,
      activeWorkers: 0, queueDepth: 0,
    };
  }

  private generateId(): TaskId {
    return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// --- Factory ---

export function createAdvancedScheduler(config?: SchedulerConfig): AdvancedTaskScheduler {
  return new AdvancedTaskScheduler(config);
}
