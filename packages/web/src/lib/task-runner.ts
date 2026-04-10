/**
 * Task Runner: Concurrent task execution engine with priority queues, concurrency control,
 * retry with backoff, cancellation tokens, progress tracking, dependency resolution,
 * result caching, timeout handling, and comprehensive lifecycle management.
 */

// --- Types ---

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "timeout" | "retrying";

export type TaskPriority = "low" | "normal" | "high" | "critical";

export interface Task<T = unknown, R = unknown> {
  /** Unique task identifier */
  id: string;
  /** Human-readable name */
  name?: string;
  /** The function to execute */
  fn: () => Promise<T>;
  /** Task priority (affects scheduling order) */
  priority?: TaskPriority;
  /** Maximum number of retries on failure */
  retries?: number;
  /** Delay between retries in ms (or array for custom backoff) */
  retryDelay?: number | number[];
  /** Timeout in ms (0 = no timeout) */
  timeout?: number;
  /** Dependencies: task IDs that must complete first */
  dependsOn?: string[];
  /** Tags for grouping/filtering */
  tags?: string[];
  /** Metadata */
  meta?: Record<string, unknown>;
  /** Weight for resource estimation (higher = more resources) */
  weight?: number;
}

export interface TaskResult<T = unknown> {
  id: string;
  status: TaskStatus;
  value?: T;
  error?: Error;
  durationMs: number;
  startedAt?: number;
  completedAt?: number;
  attempt: number;
  retriesRemaining: number;
}

export interface ConcurrencyOptions {
  /** Max concurrent tasks (default: CPU core count * 2) */
  maxConcurrency?: number;
  /** Queue behavior when full: "wait" (block) or "drop" (reject) */
  fullBehavior?: "wait" | "drop";
  /** Priority mode: "fifo" (respect insertion order) or "priority" (always run highest priority first) */
  schedulingMode?: "fifo" | "priority";
  /** Auto-start tasks as they're added (default: true) */
  autoStart?: boolean;
}

export interface RunnerStats {
  totalTasks: number;
  completed: number;
  failed: number;
  cancelled: number;
  timedOut: number;
  retried: number;
  avgDurationMs: number;
  totalDurationMs: number;
  activeCount: number;
  queueLength: number;
  throughputPerSecond: number; // Tasks completed in last second
}

export type ProgressCallback = (task: TaskResult<unknown>, allResults: TaskResult<unknown>[]) => void;

export type TaskFilter = (task: Task<unknown>) => boolean;

// --- Cancellation Token ---

export class CancellationToken {
  private _cancelled = false;
  private _reason?: string;
  private _onCancel: Set<() => void> = new Set();

  get cancelled(): boolean { return this._cancelled; }
  get reason(): string | undefined { return this._reason; }

  cancel(reason = "Cancelled"): void {
    this._cancelled = true;
    this._reason = reason;
    for (const fn of this._onCancel) fn();
    this._onCancel.clear();
  }

  onCancel(callback: () => void): () => void {
    this._onCancel.add(callback);
    return () => { this._onCancel.delete(callback); };
}

// --- Priority Queue ---

class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];

  enqueue(item: T, priority: number): void {
    const p = priorityMap(priority);
    // Insert sorted by priority (descending)
    let inserted = false;
    for (let i = 0; i < this.items.length; i++) {
      if (p > priorityMap(this.items[i]!.priority)) {
        this.items.splice(i, 0, { item, priority });
        inserted = true;
        break;
      }
    }
    if (!inserted) this.items.push({ item, priority });
  }

  dequeue(): T | undefined {
    return this.items.shift()?.item;
  }

  peek(): T | undefined {
    return this.items[0]?.item;
  }

  get length(): number { return this.items.length; }
  get isEmpty(): boolean { return this.items.length === 0; }
  clear(): void { this.items = []; }
  toArray(): T[] { return this.items.map((i) => i.item); }
  remove(predicate: (item: T) => boolean): T | undefined {
    const idx = this.items.findIndex((i) => predicate(i.item));
    if (idx !== -1) return this.items.splice(idx, 1)[0]!.item;
    return undefined;
  }
}

function priorityMap(p: TaskPriority): number {
  switch (p) {
    case "critical": return 100;
    case "high": return 75;
    case "normal": return 50;
    case "low": return 25;
    default: return 50;
  }
}

// --- Main Task Runner ---

/**
 * Advanced task runner with concurrency control, priorities, retries, and progress tracking.
 *
 * ```ts
 * const runner = new TaskRunner({ maxConcurrency: 4 });
 *
 * runner.onProgress((task, all) => {
 *   console.log(`${task.id}: ${task.status} (${all.completed}/${all.length})`);
 * });
 *
 * const taskId = runner.add({
 *   id: "fetch-data",
 *   fn: async () => { return await fetchData(); },
 *   priority: "high",
 *   retries: 3,
 *   timeout: 5000,
 * });
 *
 * await runner.startAndWait(); // Run all tasks to completion
 * const results = runner.getResults();
 * ```
 */
export class TaskRunner {
  private options: Required<ConcurrencyOptions>;
  private pendingQueue = new PriorityQueue<Task>();
  private running = new Map<string, Task<unknown>>();
  private results = new Map<string, TaskResult<unknown>>();
  private dependencies = new Map<string, Set<string>>(); // taskId → set of dependency IDs
  private resolvedDeps = new Set<string>(); // Completed dependency IDs
  private cancelToken = new CancellationToken();

  private stats: RunnerStats = createFreshStats();
  private startTime = 0;
  private progressCallbacks: ProgressCallback[] = [];
  private filterFns: TaskFilter[] = [];
  private completedEvent: (() => void) | null = null;

  constructor(options: ConcurrencyOptions = {}) {
    this.options = {
      maxConcurrency: options.maxConcurrency ?? Math.max(1, (navigator.hardwareConcurrency ?? 4) * 2),
      fullBehavior: options.fullBehavior ?? "wait",
      schedulingMode: options.schedulingMode ?? "priority",
      autoStart: options.autoStart ?? true,
    };
  }

  /**
   * Add a task to the queue. Returns the task ID.
   */
  add<T>(task: Task<T>): string {
    if (!task.id) task.id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Register dependencies
    if (task.dependsOn?.length) {
      this.dependencies.set(task.id, new Set(task.dependsOn));
      for (const dep of task.dependsOn) {
        if (!this.dependencies.has(dep)) {
          this.dependencies.set(dep, new Set());
        }
      }
    }

    this.pendingQueue.enqueue(task, priorityMap(task.priority ?? "normal"));
    this.stats.totalTasks++;
    this.stats.queueLength = this.pendingQueue.length;

    if (this.options.autoStart && !this.cancelToken.cancelled) {
      this.scheduleNext();
    }

    return task.id;
  }

  /**
   * Add multiple tasks at once.
   */
  addMany(tasks: Task[]): string[] {
    return tasks.map((t) => this.add(t));
  }

  /**
   * Remove a pending task. Returns true if removed (not yet running).
   */
  remove(taskId: string): boolean {
    const removed = this.pendingQueue.remove((t) => t.id === taskId);
    if (removed) {
      this.stats.totalTasks--;
      this.dependencies.delete(taskId);
    }
    return !!removed;
  }

  /**
   * Get the result of a completed task.
   */
  getResult<T>(taskId: string): TaskResult<T> | undefined {
    return this.results.get(taskId) as TaskResult<T> | undefined;
  }

  /** Get all results so far */
  getAllResults(): Map<string, TaskResult<unknown>> {
    return new Map(this.results);
  }

  /**
   * Cancel a specific task or all tasks.
   */
  cancel(taskIdOrAll?: string): void {
    if (taskIdOrAll) {
      const task = this.running.get(taskIdOrAll);
      if (task) {
        this.results.set(taskIdOrAll, {
          id: taskIdOrAll, status: "cancelled",
          error: new Error("Cancelled"), durationMs: 0,
          attempt: 1, retriesRemaining: 0,
        });
        this.running.delete(taskIdOrAll);
        this.stats.cancelled++;
      } else {
        this.pendingQueue.remove((t) => t.id === taskIdOrAll);
        this.cancelToken.cancel("User cancelled");
      }
    } else {
      this.cancelToken.cancel("Cancel all");
      // Cancel all running
      for (const [id, task] of this.running) {
        this.results.set(id, {
          id, status: "cancelled", error: new Error("Cancelled"),
          durationMs: 0, attempt: 1, retriesRemaining: 0,
        });
      }
      this.running.clear();
      this.stats.cancelled += this.running.size;
    }
  }

  /**
   * Register a progress callback.
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter((fn) => fn !== callback);
    };
  }

  /**
   * Add a filter to skip certain tasks.
   */
  addFilter(fn: TaskFilter): void {
    this.filterFns.push(fn);
  }

  /**
   * Start processing the queue and wait for all tasks to complete.
   */
  async startAndWait(): Promise<Map<string, TaskResult<unknown>>> {
    this.startTime = Date.now();
    this.scheduleNext();

    return new Promise((resolve) => {
      this.completedEvent = resolve;
      this.checkCompletion();
    });
  }

  /**
   * Start processing (non-blocking). Use onProgress or poll getResults().
   */
  start(): void {
    this.startTime = Date.now();
    this.scheduleNext();
  }

  /** Get current statistics */
  getStats(): RunnerStats {
    this.updateThroughput();
    return { ...this.stats };
  }

  // --- Internal Scheduling ---

  private scheduleNext(): void {
    if (this.cancelToken.cancelled) {
      this.checkCompletion();
      return;
    }

    // Fill up to max concurrency
    while (this.running.size < this.options.maxConcurrency) {
      const task = this.pickNextTask();
      if (!task) break;

      // Check filters
      if (this.filterFns.some((fn) => !fn(task))) continue;

      // Check dependencies
      if (!this.areDependenciesMet(task)) continue;

      this.running.set(task.id, task);
      this.executeTask(task);
    }
  }

  private pickNextTask(): Task | undefined {
    if (this.options.schedulingMode === "priority") {
      return this.pendingQueue.dequeue();
    }
    // FIFO: peek but don't dequeue — we need order preserved
    // For simplicity with our PQ, just dequeue
    return this.pendingQueue.dequeue();
  }

  private areDependenciesMet(task: Task): boolean {
    const deps = this.dependencies.get(task.id);
    if (!deps || deps.size === 0) return true;

    for (const depId of deps) {
      if (!this.resolvedDeps.has(depId)) {
        // Check if dep is already completed
        if (!this.results.has(depId)) return false;
      }
    }
    return true;
  }

  private async executeTask(task: Task): Promise<void> {
    const startTs = performance.now();
    let attempt = 1;
    const maxRetries = task.retries ?? 0;
    const delays = typeof task.retryDelay === "number"
      ? Array.from({ length: maxReties + 1 }, (_, i) => (task.retryDelay ?? 1000) * Math.pow(2, i))
      : (task.retryDelay ?? []);

    while (true) {
      if (this.cancelToken.cancelled || this.isTaskCancelled(task.id)) {
        this.handleTaskResult(task, {
          id: task.id, status: "cancelled", error: new Error("Cancelled"),
          durationMs: performance.now() - startTs, attempt, retriesRemaining: 0,
        });
        this.running.delete(task.id);
        this.scheduleNext();
        return;
      }

      try {
        // Execute with optional timeout
        let result: unknown;
        if (task.timeout && task.timeout > 0) {
          result = await Promise.race([
            task.fn(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), task.timeout),
            ),
          ]);
        } else {
          result = await task.fn();
        }

        this.handleTaskResult(task, {
          id: task.id, status: "completed", value: result,
          durationMs: performance.now() - startTs, attempt,
          retriesRemaining: maxRetries - attempt,
        });

        // Mark dependencies as resolved
        this.resolvedDeps.add(task.id);

        this.running.delete(task.id);
        this.scheduleNext();
        return;
      } catch (err) {
        if (attempt <= maxRetries) {
          // Retry with delay
          const delay = delays[attempt - 1] ?? 1000;
          this.stats.retried++;
          await new Promise((r) => setTimeout(r, delay));
          attempt++;
          this.results.set(task.id, {
            id: task.id, status: "retrying", error: err,
            durationMs: performance.now() - startTs, attempt,
            retriesRemaining: maxRetries - attempt + 1,
          });
        } else {
          // All retries exhausted
          this.handleTaskResult(task, {
            id: task.id, status: "failed", error: err,
            durationMs: performance.now() - startTs, attempt,
            retriesRemaining: 0,
          });
          this.running.delete(task.id);
          this.scheduleNext();
          return;
        }
      }
    }
  }

  private handleTaskResult(task: Task, result: TaskResult): void {
    this.results.set(task.id, result);

    // Update stats
    switch (result.status) {
      case "completed": this.stats.completed++; break;
      case "failed": this.stats.failed++; break;
      case "cancelled": this.stats.cancelled++; break;
      case "timeout": this.stats.timedOut++; break;
    }

    // Notify progress listeners
    const allResults = [...this.results.values()];
    for (const cb of this.progressCallbacks) {
      try { cb(result as TaskResult<unknown>, allResults); } catch { /* ignore */ }
    }

    this.checkCompletion();
  }

  private isTaskCancelled(taskId: string): boolean {
    const result = this.results.get(taskId);
    return result?.status === "cancelled";
  }

  private checkCompletion(): void {
    const done = this.pendingQueue.isEmpty() && this.running.size === 0;
    if (done && this.completedEvent) {
      this.updateStatsFinal();
      this.completedEvent(this.getAllResults());
      this.completedEvent = null;
    }
  }

  private updateStatsFinal(): void {
    const elapsed = Date.now() - this.startTime;
    this.stats.totalDurationMs = elapsed;
    this.stats.avgDurationMs = this.stats.completed > 0
      ? elapsed / this.stats.completed
      : 0;
    this.stats.activeCount = 0;
    this.stats.queueLength = 0;
    this.updateThroughput();
  }

  private updateThroughput(): void {
    // Simple: track completions in last 1-second window
    // Full implementation would use a ring buffer
    const now = Date.now();
    // Approximate: use recent completion rate
    if (this.stats.completed > 0 && now - this.startTime > 0) {
      this.stats.throughputPerSecond = this.stats.completed / ((now - this.startTime) / 1000);
    }
  }

  private updateThroughput(): void {
    // Called periodically from getStats
    this.updateThroughput();
  }
}

function createFreshStats(): RunnerStats {
  return {
    totalTasks: 0, completed: 0, failed: 0, cancelled: 0,
    timedOut: 0, retried: 0, avgDurationMs: 0,
    totalDurationMs: 0, activeCount: 0,
    queueLength: 0, throughputPerSecond: 0,
  };
}
