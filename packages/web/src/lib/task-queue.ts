/**
 * Task queue system: priority queue, worker pool, rate-limited execution,
 * retry with backoff, task dependencies, progress tracking, cancellation.
 */

// --- Types ---

export type TaskPriority = "critical" | "high" | "normal" | "low" | "background";
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "retrying";

export interface Task<T = unknown, R = unknown> {
  id: string;
  name: string;
  handler: () => Promise<R>;
  priority: TaskPriority;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  status: TaskStatus;
  result?: R;
  error?: Error;
  retries: number;
  maxRetries: number;
  timeoutMs?: number;
  dependsOn?: string[];      // Task IDs that must complete first
  metadata?: T;
  progress?: number;        // 0-100
  progressMessage?: string;
}

export interface TaskResult<R = unknown> {
  task: Task<R>;
  duration: number;
}

export interface WorkerPoolOptions {
  concurrency: number;       // Max parallel tasks
  maxQueueSize?: number;     // Max tasks in queue (0 = unlimited)
  autoStart?: boolean;       // Start processing immediately
  /** Called when any task completes */
  onTaskComplete?: (result: TaskResult) => void;
  /** Called when any task fails */
  onTaskError?: (task: Task, error: Error) => void;
  /** Called for progress updates */
  onProgress?: (task: Task, progress: number, message?: string) => void;
  /** Global rate limit (tasks per second) */
  rateLimitPerSecond?: number;
}

export interface QueueStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  avgDuration: number;
  throughput: number;        // Tasks per second over last minute
}

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 5,
  high: 4,
  normal: 3,
  low: 2,
  background: 1,
};

// --- Priority Queue ---

class PriorityQueue<T extends Task> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  dequeue(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  peek(): T | undefined { return this.items[0]; }

  get size(): number { return this.items.length; }

  isEmpty(): boolean { return this.items.length === 0 }

  remove(id: string): T | null {
    const idx = this.items.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const [item] = this.items.splice(idx, 1);
    if (idx < this.items.length) this.bubbleDown(idx);
    return item ?? null;
  }

  getAll(): T[] { return [...this.items]; }

  clear(): void { this.items = []; }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.compare(idx, parentIdx) > 0) {
        this.swap(idx, parentIdx);
        idx = parentIdx;
      } else break;
    }
  }

  private bubbleDown(idx: number): void {
    const length = this.items.length;
    while (true) {
      let largest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.compare(left, largest) > 0) largest = left;
      if (right < length && this.compare(right, largest) > 0) largest = right;

      if (largest !== idx) {
        this.swap(idx, largest);
        idx = largest;
      } else break;
    }
  }

  private compare(a: number, b: number): number {
    const pa = PRIORITY_WEIGHTS[this.items[a]!.priority];
    const pb = PRIORITY_WEIGHTS[this.items[b]!.priority];
    if (pa !== pb) return pa - pb;
    // Same priority: earlier created first (FIFO)
    return this.items[b]!.createdAt - this.items[a]!.createdAt;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b]!, this.items[a]!];
  }
}

// --- Main Task Queue ---

export class TaskQueue<T = unknown, R = unknown> {
  private queue = new PriorityQueue<Task<T, R>>();
  private running = new Set<string>();
  private completed = new Map<string, Task<T, R>>();
  private failed = new Map<string, Task<T, R>>();
  private cancelled = new Set<string>();
  private allTasks = new Map<string, Task<T, R>>();

  private options: Required<WorkerPoolOptions>;
  private activeWorkers = 0;
  private processing = false;
  private destroyed = false;

  // Throughput tracking
  private recentCompletions: number[] = [];
  private throughputWindow = 60_000; // 1 minute

  // Rate limiting
  private lastExecutionTime = 0;
  private rateLimitInterval = 0;

  // Listeners
  private listeners = {
    complete: new Set<(result: TaskResult<R>) => void>(),
    error: new Set<(task: Task<T, R>, error: Error) => void>(),
    progress: new Set<(task: Task<T, R>, progress: number, message?: string) => void>(),
    drain: new Set<() => void>(),
    idle: new Set<() => void>(),
  };

  constructor(options: WorkerPoolOptions) {
    this.options = {
      ...options,
      maxQueueSize: options.maxQueueSize ?? 0,
      autoStart: options.autoStart ?? true,
      rateLimitPerSecond: options.rateLimitPerSecond ?? 0,
    };
    if (this.options.rateLimitPerSecond > 0) {
      this.rateLimitInterval = 1000 / this.options.rateLimitPerSecond;
    }
  }

  /** Add a task to the queue */
  add(handler: () => Promise<R>, options?: {
    id?: string;
    name?: string;
    priority?: TaskPriority;
    maxRetries?: number;
    timeoutMs?: number;
    dependsOn?: string[];
    metadata?: T;
  }): Task<T, R> {
    if (this.destroyed) throw new Error("TaskQueue is destroyed");

    const id = options?.id ?? `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const task: Task<T, R> = {
      id,
      name: options?.name ?? id,
      handler,
      priority: options?.priority ?? "normal",
      createdAt: Date.now(),
      status: "queued",
      retries: 0,
      maxRetries: options?.maxRetries ?? 3,
      timeoutMs: options?.timeoutMs,
      dependsOn: options?.dependsOn,
      metadata: options?.metadata,
      progress: 0,
    };

    // Check queue size limit
    if (this.options.maxQueueSize > 0 && this.queue.size >= this.options.maxQueueSize) {
      throw new Error(`Queue full (max ${this.options.maxQueueSize} tasks)`);
    }

    this.allTasks.set(id, task);
    this.queue.enqueue(task);

    if (this.options.autoStart && !this.processing) {
      this.process();
    }

    return task;
  }

  /** Get a task by ID */
  getTask(id: string): Task<T, R> | undefined { return this.allTasks.get(id); }

  /** Cancel a queued or running task */
  cancel(id: string): boolean {
    const task = this.allTasks.get(id);
    if (!task || task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
      return false;
    }

    if (task.status === "queued") {
      this.queue.remove(id);
    } else if (task.status === "running") {
      this.running.delete(id);
      this.activeWorkers--;
    }

    task.status = "cancelled";
    task.completedAt = Date.now();
    this.cancelled.add(id);

    // Check dependents
    this.checkDependents();

    return true;
  }

  /** Update task progress */
  updateProgress(id: string, progress: number, message?: string): void {
    const task = this.allTasks.get(id);
    if (!task) return;
    task.progress = Math.min(100, Math.max(0, progress));
    task.progressMessage = message;
    for (const fn of this.listeners.progress) { try { fn(task, task.progress, message); } catch {} }
  }

  /** Start processing the queue */
  start(): void {
    if (this.destroyed) return;
    this.processing = true;
    this.process();
  }

  /** Pause processing (running tasks will finish) */
  pause(): void { this.processing = false; }

  /** Clear all queued tasks */
  clearQueued(): void {
    for (const task of this.queue.getAll()) {
      task.status = "cancelled";
      this.cancelled.add(task.id);
    }
    this.queue.clear();
  }

  /** Wait for all tasks to complete */
  async drain(): Promise<void> {
    if (this.queue.isEmpty() && this.activeWorkers === 0) return;
    return new Promise((resolve) => {
      const check = () => {
        if (this.queue.isEmpty() && this.activeWorkers === 0) {
          this.listeners.drain.delete(fn);
          resolve();
        }
      };
      const fn = check;
      this.listeners.drain.add(fn);
      check();
    });
  }

  /** Destroy the queue and cancel everything */
  destroy(): void {
    this.destroyed = true;
    this.processing = false;
    this.clearQueued();
    for (const id of this.running) { this.cancel(id); }
    this.listeners.complete.clear();
    this.listeners.error.clear();
    this.listeners.progress.clear();
    this.listeners.drain.clear();
    this.listeners.idle.clear();
  }

  // --- Event Subscriptions ---

  onComplete(fn: (result: TaskResult<R>) => void): () => void {
    this.listeners.complete.add(fn);
    return () => this.listeners.complete.delete(fn);
  }

  onError(fn: (task: Task<T, R>, error: Error) => void): () => void {
    this.listeners.error.add(fn);
    return () => this.listeners.error.delete(fn);
  }

  onProgress(fn: (task: Task<T, R>, progress: number, message?: string) => void): () => void {
    this.listeners.progress.add(fn);
    return () => this.listeners.progress.delete(fn);
  }

  onIdle(fn: () => void): () => void {
    this.listeners.idle.add(fn);
    return () => this.listeners.idle.delete(fn);
  }

  // --- Stats ---

  getStats(): QueueStats {
    const now = Date.now();
    // Clean old throughput data
    this.recentCompletions = this.recentCompletions.filter((t) => now - t < this.throughputWindow);

    const completedArr = Array.from(this.completed.values());
    const totalDuration = completedArr.reduce((sum, t) => sum + ((t.completedAt ?? 0) - (t.startedAt ?? 0)), 0);

    return {
      total: this.allTasks.size,
      queued: this.queue.size,
      running: this.activeWorkers,
      completed: this.completed.size,
      failed: this.failed.size,
      cancelled: this.cancelled.size,
      avgDuration: completedArr.length > 0 ? Math.round(totalDuration / completedArr.length) : 0,
      throughput: Math.round((this.recentCompletions.length / this.throughputWindow) * 1000),
    };
  }

  // --- Private ---

  private async process(): Promise<void> {
    if (this.processing === false || this.destroyed) return;

    // Process as many tasks as concurrency allows
    while (
      this.activeWorkers < this.options.concurrency &&
      !this.queue.isEmpty() &&
      this.processing &&
      !this.destroyed
    ) {
      const task = this.findNextRunnable();
      if (!task) break;

      // Rate limiting
      if (this.rateLimitInterval > 0) {
        const waitTime = this.rateLimitInterval - (Date.now() - this.lastExecutionTime);
        if (waitTime > 0) await sleep(waitTime);
        if (this.destroyed) return;
      }

      this.running.add(task.id);
      this.activeWorkers++;
      task.status = "running";
      task.startedAt = Date.now();
      this.lastExecutionTime = Date.now();

      // Run task (don't await here so we can process multiple)
      this.executeTask(task).catch(() => {});
    }

    // Check if idle
    if (this.activeWorkers === 0 && this.queue.isEmpty()) {
      for (const fn of this.listeners.idle) { try { fn(); } catch {} }
      for (const fn of this.listeners.drain) { try { fn(); } catch {} }
    }
  }

  private findNextRunnable(): Task<T, R> | undefined {
    // Peek at all items and find one whose dependencies are met
    const candidates = this.queue.getAll().filter((t) => {
      if (!t.dependsOn || t.dependsOn.length === 0) return true;
      return t.dependsOn.every((depId) => {
        const dep = this.allTasks.get(depId);
        return dep?.status === "completed";
      });
    });

    if (candidates.length === 0) return undefined;

    // Return highest priority candidate
    candidates.sort((a, b) =>
      PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority] ||
      a.createdAt - b.createdAt
    );

    const chosen = candidates[0]!;
    this.queue.remove(chosen.id);
    return chosen;
  }

  private async executeTask(task: Task<T, R>): Promise<void> {
    let result: R;
    let duration: number;

    try {
      // Timeout wrapper
      if (task.timeoutMs) {
        result = await Promise.race([
          task.handler(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Task "${task.name}" timed out after ${task.timeoutMs}ms`)), task.timeoutMs)
          ),
        ]);
      } else {
        result = await task.handler();
      }

      duration = Date.now() - (task.startedAt!);
      task.status = "completed";
      task.completedAt = Date.now();
      task.result = result;
      task.progress = 100;

      this.completed.set(task.id, task);
      this.running.delete(task.id);
      this.activeWorkers--;

      // Track throughput
      this.recentCompletions.push(Date.now());

      const taskResult: TaskResult<R> = { task, duration };
      for (const fn of this.listeners.complete) { try { fn(taskResult); } catch {} }
      this.options.onTaskComplete?.(taskResult);

    } catch (error) {
      duration = Date.now() - (task.startedAt!);
      const err = error instanceof Error ? error : new Error(String(error));

      // Retry logic
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = "retrying";
        task.error = err;
        this.running.delete(task.id);
        this.activeWorkers--;

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, task.retries), 30_000);
        setTimeout(() => {
          if (!this.destroyed && task.status !== "cancelled") {
            task.status = "queued";
            this.queue.enqueue(task);
            this.process();
          }
        }, delay + Math.random() * 1000);

        for (const fn of this.listeners.error) { try { fn(task, err); } catch {} }
        this.options.onTaskError?.(task, err);
        return;
      }

      task.status = "failed";
      task.error = err;
      task.completedAt = Date.now();
      this.failed.set(task.id, task);
      this.running.delete(task.id);
      this.activeWorkers--;

      for (const fn of this.listeners.error) { try { fn(task, err); } catch {} }
      this.options.onTaskError?.(task, err);
    }

    // Continue processing
    this.checkDependents();
    this.process();
  }

  private checkDependents(): void {
    // Wake up process loop in case unblocked tasks are waiting
    if (this.processing && !this.destroyed) {
      this.process();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Convenience Factory ---

export function createTaskQueue(options: WorkerPoolOptions): TaskQueue {
  return new TaskQueue(options);
}
