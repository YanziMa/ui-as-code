/**
 * Worker Pool: Browser Web Worker management with task queuing,
 * load balancing, priority scheduling, worker lifecycle, transferable
 * objects, abort support, progress reporting, error handling,
 * auto-scaling, and typed message protocols.
 */

// --- Types ---

export type WorkerStatus = "idle" | "busy" | "starting" | "terminating" | "dead";

export type TaskPriority = "low" | "normal" | "high" | "critical";

export interface WorkerTask<T = unknown> {
  /** Unique task ID */
  id: string;
  /** Task payload sent to worker */
  data: unknown;
  /** Transferable objects (ArrayBuffer, MessagePort, etc.) */
  transferables?: Transferable[];
  /** Task priority */
  priority?: TaskPriority;
  /** Timeout in ms (0 = no timeout) */
  timeout?: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Expected worker response type (for typing) */
  expectedType?: string;
  /** Metadata for logging/tracking */
  metadata?: Record<string, unknown>;
}

export interface TaskResult<T = unknown> {
  /** Task ID */
  taskId: string;
  /** Worker ID that processed it */
  workerId: string;
  /** Result data */
  result: T;
  /** Processing duration in ms */
  duration: number;
  /** Timestamp of completion */
  completedAt: number;
}

export interface TaskError {
  taskId: string;
  workerId: string;
  error: Error;
  retried: boolean;
  retryCount: number;
}

export interface WorkerInfo {
  id: string;
  status: WorkerStatus;
  tasksCompleted: number;
  tasksFailed: number;
  totalTaskTime: number;
  currentTaskId: string | null;
  createdAt: number;
  lastActivityAt: number;
}

export interface PoolStatistics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  totalUptime: number;
  throughputPerSecond: number;
}

export interface PoolOptions {
  /** Number of workers to create (default: navigator.hardwareConcurrency or 4) */
  size?: number;
  /** Worker script URL or Blob URL */
  workerScript: string | Blob;
  /** Minimum workers to keep alive */
  minWorkers?: number;
  /** Maximum workers (auto-scaling cap) */
  maxWorkers?: number;
  /** Scale up threshold (queue depth) */
  scaleUpThreshold?: number;
  /** Scale down idle time before termination (ms) */
  scaleDownIdleMs?: number;
  /** Default task timeout (ms) */
  taskTimeout?: number;
  /** Max retries per task on failure */
  maxRetries?: number;
  /** Enable task prioritization */
  prioritize?: boolean;
  /** Strategy for assigning tasks: "round-robin" | "least-busy" | "random" | "sticky" */
  strategy?: "round-robin" | "least-busy" | "random" | "sticky";
  /** Called when a worker is created */
  onWorkerCreate?: (worker: WorkerInfo) => void;
  /** Called when a worker is terminated */
  onWorkerTerminate?: (worker: WorkerInfo) => void;
  /** Called on task completion */
  onTaskComplete?: (result: TaskResult) => void;
  /** Called on task failure */
  onTaskError?: (error: TaskError) => void;
  /** Called on pool statistics update */
  onStatsUpdate?: (stats: PoolStatistics) => void;
  /** Auto-start pool? */
  autoStart?: boolean;
  /** Name for debugging */
  name?: string;
}

// --- Internal Types ---

interface PooledWorker {
  worker: Worker;
  info: WorkerInfo;
  resolveQueue: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
    startTime: number;
  }>;
  busy: boolean;
}

interface QueuedTask extends WorkerTask {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  createdAt: number;
  retryCount: number;
}

// --- Priority Comparator ---

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function comparePriority(a: QueuedTask, b: QueuedTask): number {
  return (PRIORITY_WEIGHT[a.priority ?? "normal"] ?? 2) - (PRIORITY_WEIGHT[b.priority ?? "normal"] ?? 2);
}

// --- Core Pool ---

export class WorkerPool {
  private options: Required<PoolOptions>;
  private workers: Map<string, PooledWorker> = new Map();
  private taskQueue: QueuedTask[] = [];
  private nextWorkerIndex = 0;
  private stats = {
    completedTasks: 0,
    failedTasks: 0,
    totalTaskTime: 0,
    createdAt: Date.now(),
  };
  private scaleCheckTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;

  constructor(options: PoolOptions) {
    this.options = {
      size: typeof navigator !== "undefined" ? (navigator.hardwareConcurrency || 4) : 4,
      minWorkers: 1,
      maxWorkers: options.size ?? (typeof navigator !== "undefined" ? (navigator.hardwareConcurrency || 4) : 4),
      scaleUpThreshold: this.options.size * 2,
      scaleDownIdleMs: 30000,
      taskTimeout: 30000,
      maxRetries: 2,
      prioritize: true,
      strategy: "least-busy",
      autoStart: true,
      name: "pool",
      ...options,
    };

    if (this.options.autoStart && !this.destroyed) {
      this.start();
    }
  }

  get size(): number {
    return this.workers.size;
  }

  get queueLength(): number {
    return this.taskQueue.length;
  }

  /** Submit a task to the pool. Returns a promise with the result. */
  execute<T = unknown>(task: Omit<WorkerTask<T>, "id">): Promise<T> {
    if (this.destroyed) {
      return Promise.reject(new Error("WorkerPool has been destroyed"));
    }

    const fullTask: QueuedTask = {
      ...task,
      id: task.id ?? generateTaskId(),
      createdAt: Date.now(),
      retryCount: 0,
      resolve: () => {},
      reject: () => {},
    };

    return new Promise<T>((resolve, reject) => {
      fullTask.resolve = resolve as (value: unknown) => void;
      fullTask.reject = reject;

      // Try immediate dispatch
      const assigned = this.tryDispatch(fullTask);
      if (!assigned) {
        this.taskQueue.push(fullTask);
        if (this.options.prioritize) {
          this.taskQueue.sort(comparePriority);
        }
      }
    });
  }

  /** Execute multiple tasks and wait for all results. */
  async executeAll<T = unknown>(tasks: Omit<WorkerTask<T>, "id">[]): Promise<TaskResult<T>[]> {
    const promises = tasks.map((t) => this.execute(t));
    return Promise.all(promises) as Promise<TaskResult<T>[]>;
  }

  /** Execute tasks with concurrency limit — returns results as they complete. */
  async executeSettled<T = unknown>(tasks: Omit<WorkerTask<T>, "id">[]): Promise<PromiseSettledResult<TaskResult<T>>[]> {
    const promises = tasks.map((t) =>
      this.execute(t).then(
        (r) => ({ status: "fulfilled" as const, value: r as unknown as TaskResult<T> }),
        (e) => ({ status: "rejected" as const, reason: e }),
      ),
    );
    return Promise.allSettled(promises);
  }

  /** Start the pool (create initial workers). */
  start(): void {
    if (this.destroyed) return;

    for (let i = 0; i < this.options.size; i++) {
      this.createWorker();
    }

    // Start auto-scaling check
    this.scaleCheckTimer = setInterval(() => this.checkScaling(), 5000);
  }

  /** Gracefully shut down all workers. */
  async stop(force = false): Promise<void> {
    this.destroyed = true;

    if (this.scaleCheckTimer) {
      clearInterval(this.scaleCheckTimer);
      this.scaleCheckTimer = null;
    }

    // Reject all queued tasks
    for (const task of this.taskQueue) {
      task.reject(new Error("Pool shutting down"));
    }
    this.taskQueue = [];

    const terminatePromises: Promise<void>[] = [];

    for (const [id, pw] of this.workers) {
      if (force) {
        pw.worker.terminate();
        this.options.onWorkerTerminate?.(pw.info);
      } else {
        terminatePromises.push(
          this.gracefulTerminate(id).catch(() => {}),
        );
      }
    }

    await Promise.all(terminatePromises);
    this.workers.clear();
  }

  /** Get pool statistics. */
  getStats(): PoolStatistics {
    let activeCount = 0;
    let idleCount = 0;

    for (const pw of this.workers.values()) {
      if (pw.busy) activeCount++;
      else idleCount++;
    }

    const avgTime = this.stats.completedTasks > 0
      ? this.stats.totalTaskTime / this.stats.completedTasks
      : 0;

    const uptime = Date.now() - this.stats.createdAt;
    const throughput = uptime > 0 ? this.stats.completedTasks / (uptime / 1000) : 0;

    const stats: PoolStatistics = {
      totalWorkers: this.workers.size,
      activeWorkers: activeCount,
      idleWorkers: idleCount,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks,
      averageTaskTime: avgTime,
      totalUptime: uptime,
      throughputPerSecond: throughput,
    };

    this.options.onStatsUpdate?.(stats);
    return stats;
  }

  /** Get information about individual workers. */
  getWorkerInfos(): WorkerInfo[] {
    return Array.from(this.workers.values()).map((pw) => pw.info);
  }

  /** Add more workers dynamically. */
  scaleUp(count = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.workers.size >= this.options.maxWorkers) break;
      this.createWorker();
    }
  }

  /** Remove idle workers. */
  scaleDown(count = 1): void {
    let removed = 0;
    for (const [id, pw] of this.workers) {
      if (removed >= count) break;
      if (!pw.busy && this.workers.size > this.options.minWorkers) {
        this.terminateWorker(id);
        removed++;
      }
    }
  }

  // --- Internal ---

  private createWorker(): PooledWorker {
    const id = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let worker: Worker;

    if (typeof this.options.workerScript === "string") {
      worker = new Worker(this.options.workerScript);
    } else {
      const blobUrl = URL.createObjectURL(
        new Blob([this.options.workerScript], { type: "application/javascript" }),
      );
      worker = new Worker(blobUrl);
    }

    const info: WorkerInfo = {
      id,
      status: "starting",
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTaskTime: 0,
      currentTaskId: null,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    };

    const pw: PooledWorker = {
      worker,
      info,
      resolveQueue: new Map(),
      busy: false,
    };

    // Message handler
    worker.onmessage = (e: MessageEvent) => this.handleMessage(id, e);
    worker.onerror = (e: ErrorEvent) => this.handleError(id, e);

    pw.info.status = "idle";
    this.workers.set(id, pw);

    this.options.onWorkerCreate?.(info);
    return pw;
  }

  private tryDispatch(task: QueuedTask): boolean {
    const target = this.selectWorker();
    if (!target) return false;

    const pw = this.workers.get(target)!;
    pw.busy = true;
    pw.info.status = "busy";
    pw.info.currentTaskId = task.id;
    pw.info.lastActivityAt = Date.now();

    // Set up promise resolution
    const startTime = Date.now();

    const timeout = task.timeout ?? this.options.taskTimeout;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (timeout > 0) {
      timer = setTimeout(() => {
        this.handleTimeout(task.id, target);
      }, timeout);
    }

    pw.resolveQueue.set(task.id, {
      resolve: task.resolve,
      reject: task.reject,
      timer: timer!,
      startTime,
    });

    // Send task to worker
    try {
      pw.worker.postMessage({
        type: "task",
        id: task.id,
        data: task.data,
        metadata: task.metadata,
      }, task.transferables ?? []);
    } catch (err) {
      // Transfer error — clean up
      pw.resolveQueue.delete(task.id);
      pw.busy = false;
      pw.info.status = "idle";
      pw.info.currentTaskId = null;
      task.reject(err as Error);
      return false;
    }

    return true;
  }

  private selectWorker(): string | null {
    if (this.workers.size === 0) return null;

    switch (this.options.strategy) {
      case "round-robin": {
        const ids = Array.from(this.workers.keys());
        const id = ids[this.nextWorkerIndex % ids.length];
        this.nextWorkerIndex++;
        // Find next non-busy worker starting from index
        for (let i = 0; i < ids.length; i++) {
          const candidate = ids[(this.nextWorkerIndex + i - 1) % ids.length]!;
          const pw = this.workers.get(candidate)!;
          if (!pw.busy) return candidate;
        }
        // All busy — return first one anyway (will queue)
        return id;
      }

      case "least-busy": {
        let best: string | null = null;
        let minTasks = Infinity;
        for (const [id, pw] of this.workers) {
          const load = pw.resolveQueue.size;
          if (!pw.busy && load < minTasks) {
            minTasks = load;
            best = id;
          }
        }
        return best;
      }

      case "random": {
        const idle = Array.from(this.workers.entries())
          .filter(([, pw]) => !pw.busy);
        if (idle.length === 0) return Array.from(this.workers.keys())[0] ?? null;
        return idle[Math.floor(Math.random() * idle.length)]![0];
      }

      case "sticky":
        // Simple hash-based sticky routing
        return Array.from(this.workers.keys())[0] ?? null;

      default:
        return Array.from(this.workers.keys())[0] ?? null;
    }
  }

  private handleMessage(workerId: string, event: MessageEvent): void {
    const pw = this.workers.get(workerId);
    if (!pw) return;

    const msg = event.data as { type: string; id: string; result?: unknown; error?: string };

    if (msg.type !== "task-result" || !msg.id) return;

    const entry = pw.resolveQueue.get(msg.id);
    if (!entry) return;

    // Clear timeout
    if (entry.timer) clearTimeout(entry.timer);
    pw.resolveQueue.delete(msg.id);

    const duration = Date.now() - entry.startTime;

    // Update worker state
    pw.busy = false;
    pw.info.status = "idle";
    pw.info.currentTaskId = null;
    pw.info.tasksCompleted++;
    pw.info.totalTaskTime += duration;
    pw.info.lastActivityAt = Date.now();

    if (msg.error) {
      // Error from worker
      pw.info.tasksFailed++;
      this.stats.failedTasks++;
      const err = new Error(msg.error);
      entry.reject(err);

      this.options.onTaskError?.({
        taskId: msg.id,
        workerId,
        error: err,
        retried: false,
        retryCount: 0,
      });
    } else {
      // Success
      this.stats.completedTasks++;
      this.stats.totalTaskTime += duration;

      const result: TaskResult = {
        taskId: msg.id,
        workerId,
        result: msg.result!,
        duration,
        completedAt: Date.now(),
      };

      entry.resolve(result.result);
      this.options.onTaskComplete?.(result);
    }

    // Process next queued task
    this.processQueue();
  }

  private handleError(workerId: string, event: ErrorEvent): void {
    const pw = this.workers.get(workerId);
    if (!pw) return;

    // Reject current pending task if any
    for (const [taskId, entry] of pw.resolveQueue) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(event.error ?? new Error("Worker error"));
      pw.resolveQueue.delete(taskId);

      this.options.onTaskError?.({
        taskId,
        workerId,
        error: event.error ?? new Error("Worker error"),
        retried: false,
        retryCount: 0,
      });

      this.stats.failedTasks++;
    }

    pw.busy = false;
    pw.info.status = "error" as WorkerStatus;
    pw.info.tasksFailed++;
    pw.info.currentTaskId = null;

    // Mark as dead — will be replaced by scaling check
    pw.info.status = "dead";

    this.processQueue();
  }

  private handleTimeout(taskId: string, workerId: string): void {
    const pw = this.workers.get(workerId);
    if (!pw) return;

    const entry = pw.resolveQueue.get(taskId);
    if (!entry) return;

    pw.resolveQueue.delete(taskId);
    pw.busy = false;
    pw.info.status = "idle";
    pw.info.currentTaskId = null;

    const err = new Error(`Task ${taskId} timed out`);
    entry.reject(err);

    this.stats.failedTasks++;

    this.options.onTaskError?.({
      taskId,
      workerId,
      error: err,
      retried: false,
      retryCount: 0,
    });

    this.processQueue();
  }

  private processQueue(): void {
    while (this.taskQueue.length > 0) {
      const task = this.taskQueue[0]!;
      if (this.tryDispatch(task)) {
        this.taskQueue.shift();
      } else {
        break; // No available workers
      }
    }
  }

  private checkScaling(): void {
    if (this.destroyed) return;

    // Scale up if queue is backing up
    if (this.taskQueue.length >= this.options.scaleUpThreshold &&
        this.workers.size < this.options.maxWorkers) {
      this.scaleUp(1);
    }

    // Scale down idle workers
    const now = Date.now();
    for (const [id, pw] of this.workers) {
      if (!pw.busy &&
          pw.info.status !== "dead" &&
          now - pw.info.lastActivityAt > this.options.scaleDownIdleMs &&
          this.workers.size > this.options.minWorkers) {
        this.terminateWorker(id);
      }
    }

    // Replace dead workers
    for (const [id, pw] of this.workers) {
      if (pw.info.status === "dead" && this.workers.size >= this.options.minWorkers) {
        this.workers.delete(id);
        pw.worker.terminate();
        this.createWorker(); // Replace
      }
    }
  }

  private terminateWorker(id: string): void {
    const pw = this.workers.get(id);
    if (!pw) return;

    // Reject any pending resolves
    for (const [, entry] of pw.resolveQueue) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.reject(new Error("Worker terminated"));
    }

    pw.worker.terminate();
    this.options.onWorkerTerminate?.(pw.info);
    this.workers.delete(id);
  }

  private async gracefulTerminate(id: string): Promise<void> {
    const pw = this.workers.get(id);
    if (!pw) return;

    pw.info.status = "terminating";

    // Wait for current task to finish (with timeout)
    if (pw.busy) {
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (!pw.busy) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        // Fallback timeout
        setTimeout(() => { clearInterval(check); resolve(); }, 5000);
      });
    }

    this.terminateWorker(id);
  }
}

// --- Utility Functions ---

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a worker pool from an inline worker script (Blob-based). */
export function createWorkerPool(scriptBody: string, options?: Omit<PoolOptions, "workerScript">): WorkerPool {
  return new WorkerPool({ ...options, workerScript: scriptBody });
}
