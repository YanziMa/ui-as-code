/**
 * Web Worker Pool: Manage a pool of Web Workers with task queuing,
 * load balancing, worker lifecycle management, error handling,
 * and graceful shutdown.
 *
 * Supports:
 * - Dynamic pool sizing (min/max workers)
 * - Task queue with priority
 * - Worker recycling on error/idle timeout
 * - Transferable objects for zero-copy messaging
 * - Progress reporting for long-running tasks
 * - Worker health monitoring
 */

// --- Types ---

export interface WorkerPoolConfig {
  /** URL or function for worker script */
  workerScript: string | (() => Worker);
  /** Minimum number of workers (default: 1) */
  minWorkers?: number;
  /** Maximum number of workers (default: navigator.hardwareConcurrency || 4) */
  maxWorkers?: number;
  /** Idle timeout before shrinking pool (ms, default: 30000) */
  idleTimeoutMs?: number;
  /** Max tasks per worker before recycle (default: Infinity) */
  maxTasksPerWorker?: number;
  /** Task timeout in ms (default: 60000) */
  taskTimeoutMs?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

export interface PoolTask<T = unknown> {
  /** Unique task ID */
  id: string;
  /** Data to send to worker */
  data: unknown;
  /** Transferable objects */
  transferables?: Transferable[];
  /** Priority (higher = first, default: 0) */
  priority?: number;
  /** Task type/action for routing */
  type?: string;
}

export interface PoolTaskResult<T = unknown> {
  /** Original task ID */
  taskId: string;
  /** Result data */
  result: T | null;
  /** Error if failed */
  error?: { message: string; code?: string };
  /** Execution time in ms */
  durationMs?: number;
  /** Which worker handled it */
  workerId: number;
}

export interface WorkerStats {
  /** Total workers in pool */
  totalWorkers: number;
  /** Active (busy) workers */
  activeWorkers: number;
  /** Idle workers */
  idleWorkers: number;
  /** Tasks completed */
  totalTasksCompleted: number;
  /** Tasks failed */
  totalTasksFailed: number;
  /** Tasks waiting in queue */
  queuedTasks: number;
  /** Average task time (ms) */
  averageTaskTimeMs: number;
  /** Workers recycled due to error/task limit */
  workersRecycled: number;
}

export interface PoolEvent {
  type: "worker:created" | "worker:idle" | "worker:recycled" | "worker:error" |
        "task:complete" | "task:error" | "task:timeout" | "pool:resized";
  detail: unknown;
}

// --- Internal Types ---

interface PooledWorker {
  id: number;
  worker: Worker;
  busy: boolean;
  taskCount: number;
  lastUsed: number;
  createdAt: number;
  currentTaskId: string | null;
  currentResolve: ((result: PoolTaskResult) => void) | null;
  currentReject: ((error: Error) => void) | null;
  currentTimer: ReturnType<typeof setTimeout> | null;
}

interface QueuedTask {
  id: string;
  data: unknown;
  transferables?: Transferable[];
  priority: number;
  type?: string;
  resolve: (result: PoolTaskResult) => void;
  reject: (error: Error) => void;
  createdAt: number;
}

// --- Main Class ---

export class WebWorkerPool {
  private config: Required<Omit<WorkerPoolConfig, "workerScript">> & {
    workerScript: string | (() => Worker);
  };
  private workers: PooledWorker[] = [];
  private taskQueue: QueuedTask[] = [];
  private taskIdCounter = 0;
  private workerIdCounter = 0;
  private destroyed = false;
  private idleTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private stats: Omit<WorkerStats, "totalWorkers" | "activeWorkers" | "idleWorkers" | "queuedTasks"> = {
    totalTasksCompleted: 0,
    totalTasksFailed: 0,
    averageTaskTimeMs: 0,
    workersRecycled: 0,
  };
  private taskTimes: number[] = [];
  private eventListeners: Set<(event: PoolEvent) => void> = new Set();

  constructor(config: WorkerPoolConfig) {
    this.config = {
      minWorkers: 1,
      maxWorkers: navigator.hardwareConcurrency || 4,
      idleTimeoutMs: 30_000,
      maxTasksPerWorker: Infinity,
      taskTimeoutMs: 60_000,
      debug: false,
      ...config,
    };

    // Create initial workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      this.createWorker();
    }
  }

  /** Submit a task to the pool. Returns promise that resolves when complete. */
  submit<T = unknown>(task: PoolTask<T>): Promise<PoolTaskResult<T>> {
    if (this.destroyed) return Promise.reject(new Error("Pool destroyed"));

    const id = task.id ?? this.generateTaskId();
    const priority = task.priority ?? 0;

    return new Promise<PoolTaskResult<T>>((resolve, reject) => {
      const queued: QueuedTask = {
        id,
        data: task.data,
        transferables: task.transferables,
        priority,
        type: task.type,
        resolve: resolve as (r: PoolTaskResult) => void,
        reject,
        createdAt: Date.now(),
      };

      // Insert by priority (higher first)
      const insertIdx = this.taskQueue.findIndex((t) => t.priority < priority);
      if (insertIdx === -1) {
        this.taskQueue.push(queued);
      } else {
        this.taskQueue.splice(insertIdx, 0, queued);
      }

      this.log(`Task ${id} queued (priority: ${priority})`);
      this.dispatch();
    });
  }

  /** Get current pool statistics */
  getStats(): WorkerStats {
    const active = this.workers.filter((w) => w.busy).length;
    const idle = this.workers.length - active;

    return {
      totalWorkers: this.workers.length,
      activeWorkers: active,
      idleWorkers: idle,
      totalTasksCompleted: this.stats.totalTasksCompleted,
      totalTasksFailed: this.stats.totalTasksFailed,
      queuedTasks: this.taskQueue.length,
      averageTaskTimeMs: this.stats.averageTaskTimeMs,
      workersRecycled: this.stats.workersRecycled,
    };
  }

  /** Get the number of pending tasks (in queue + being processed) */
  getPendingCount(): number {
    return this.taskQueue.length + this.workers.filter((w) => w.busy).length;
  }

  /** Resize the pool to a specific size */
  resize(newSize: number): void {
    const clamped = Math.max(this.config.minWorkers, Math.min(this.config.maxWorkers, newSize));

    while (this.workers.length < clamped) {
      this.createWorker();
    }

    while (this.workers.length > clamped) {
      const worker = this.workers.pop()!;
      if (!worker.busy) {
        this.terminateWorker(worker);
      } else {
        // Put back — can't remove busy worker
        this.workers.push(worker);
        break;
      }
    }

    this.emit({ type: "pool:resized", detail: { newSize: this.workers.length } });
  }

  /** Subscribe to pool events */
  onEvent(listener: (event: PoolEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => { this.eventListeners.delete(listener); };
  }

  /** Destroy the pool and all workers */
  destroy(): void {
    this.destroyed = true;

    // Reject all queued tasks
    for (const task of this.taskQueue) {
      task.reject(new Error("Pool destroyed"));
    }
    this.taskQueue = [];

    // Terminate all workers
    for (const worker of this.workers) {
      if (worker.currentTimer) clearTimeout(worker.currentTimer);
      this.clearIdleTimer(worker.id);
      worker.worker.terminate();
      if (worker.currentReject) {
        worker.currentReject(new Error("Pool destroyed"));
      }
    }
    this.workers = [];
    this.eventListeners.clear();
  }

  // --- Private ---

  private createWorker(): PooledWorker {
    const id = ++this.workerIdCounter;
    let worker: Worker;

    if (typeof this.config.workerScript === "function") {
      worker = this.config.workerScript();
    } else {
      worker = new Worker(this.config.workerScript);
    }

    const pooled: PooledWorker = {
      id,
      worker,
      busy: false,
      taskCount: 0,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      currentTaskId: null,
      currentResolve: null,
      currentReject: null,
      currentTimer: null,
    };

    worker.onmessage = (e: MessageEvent) => this.handleMessage(pooled, e);
    worker.onerror = (err: Event | string) => this.handleError(pooled, err);

    this.workers.push(pooled);
    this.emit({ type: "worker:created", detail: { workerId: id } });
    this.log(`Worker ${id} created`);

    return pooled;
  }

  private dispatch(): void {
    if (this.destroyed) return;

    // Find an idle worker
    let targetWorker = this.workers.find((w) => !w.busy);

    // If no idle worker and under max, create one
    if (!targetWorker && this.workers.length < this.config.maxWorkers && this.taskQueue.length > 0) {
      targetWorker = this.createWorker();
    }

    if (!targetWorker || this.taskQueue.length === 0) return;

    const task = this.taskQueue.shift()!;

    // Mark worker as busy
    targetWorker.busy = true;
    targetWorker.currentTaskId = task.id;
    targetWorker.currentResolve = task.resolve;
    targetWorker.currentReject = task.reject;
    targetWorker.lastUsed = Date.now();
    targetWorker.taskCount++;

    // Clear idle timer
    this.clearIdleTimer(targetWorker.id);

    // Set task timeout
    targetWorker.currentTimer = setTimeout(() => {
      this.handleTimeout(targetWorker);
    }, this.config.taskTimeoutMs);

    // Send task to worker
    const message = { id: task.id, type: task.type ?? "task", data: task.data };
    try {
      if (task.transferables?.length) {
        targetWorker.worker.postMessage(message, task.transferables);
      } else {
        targetWorker.worker.postMessage(message);
      }
    } catch (err) {
      this.handleTaskError(targetWorker, err instanceof Error ? err : new Error(String(err)));
    }
  }

  private handleMessage(worker: PooledWorker, event: MessageEvent): void {
    if (worker.currentTimer) {
      clearTimeout(worker.currentTimer);
      worker.currentTimer = null;
    }

    const startTime = worker.lastUsed;
    const elapsed = performance.now() - startTime;

    const response = event.data as {
      id?: string;
      result?: unknown;
      error?: { message: string; code?: string };
      progress?: number;
    };

    // Handle progress updates
    if (response.progress !== undefined && response.result === undefined && !response.error) {
      this.log(`Worker ${worker.id} progress: ${response.progress}%`);
      return; // Don't complete yet — wait for final result
    }

    const result: PoolTaskResult = {
      taskId: worker.currentTaskId ?? "unknown",
      result: response.result ?? null,
      error: response.error,
      durationMs: elapsed,
      workerId: worker.id,
    };

    if (response.error) {
      this.stats.totalTasksFailed++;
      this.emit({ type: "task:error", detail: result });
      if (worker.currentReject) {
        worker.currentReject(new Error(response.error.message));
      }
    } else {
      this.stats.totalTasksCompleted++;
      this.recordTaskTime(elapsed);
      this.emit({ type: "task:complete", detail: result });
      if (worker.currentResolve) {
        worker.currentResolve(result);
      }
    }

    this.finishTask(worker);
  }

  private handleError(worker: PooledWorker, err: Event | string): void {
    this.log(`Worker ${worker.id} error:`, err);
    this.emit({ type: "worker:error", detail: { workerId: worker.id, error: String(err) });

    if (worker.busy && worker.currentReject) {
      worker.currentReject(new Error(`Worker error: ${String(err)}`));
      this.stats.totalTasksFailed++;
    }

    this.recycleWorker(worker);
  }

  private handleTimeout(worker: PooledWorker): void {
    this.log(`Task ${worker.currentTaskId} timed out on worker ${worker.id}`);
    this.emit({ type: "task:timeout", detail: { taskId: worker.currentTaskId, workerId: worker.id } });

    if (worker.currentReject) {
      worker.currentReject(new Error(`Task timed out after ${this.config.taskTimeoutMs}ms`));
      this.stats.totalTasksFailed++;
    }

    this.recycleWorker(worker);
  }

  private finishTask(worker: PooledWorker): void {
    worker.busy = false;
    worker.currentTaskId = null;
    worker.currentResolve = null;
    worker.currentReject = null;
    worker.currentTimer = null;

    // Check if worker should be recycled
    if (worker.taskCount >= this.config.maxTasksPerWorker) {
      this.recycleWorker(worker);
      return;
    }

    // Start idle timer
    this.startIdleTimer(worker);

    // Dispatch next task
    this.dispatch();
  }

  private recycleWorker(worker: PooledWorker): void {
    this.stats.workersRecycled++;
    this.log(`Recycling worker ${worker.id}`);

    // Remove from pool
    const idx = this.workers.indexOf(worker);
    if (idx !== -1) this.workers.splice(idx, 1);

    this.clearIdleTimer(worker.id);
    if (worker.currentTimer) clearTimeout(worker.currentTimer);
    worker.worker.terminate();

    this.emit({ type: "worker:recycled", detail: { oldWorkerId: worker.id } });

    // Replace if below minimum
    if (this.workers.length < this.config.minWorkers) {
      this.createWorker();
    }

    // Dispatch any queued tasks
    this.dispatch();
  }

  private startIdleTimer(worker: PooledWorker): void {
    this.clearIdleTimer(worker.id);
    const timer = setTimeout(() => {
      if (!worker.busy && this.workers.length > this.config.minWorkers) {
        this.log(`Worker ${worker.id} idle — removing from pool`);
        this.emit({ type: "worker:idle", detail: { workerId: worker.id } });
        const idx = this.workers.indexOf(worker);
        if (idx !== -1) this.workers.splice(idx, 1);
        this.clearIdleTimer(worker.id);
        worker.worker.terminate();
      }
    }, this.config.idleTimeoutMs);
    this.idleTimers.set(worker.id, timer);
  }

  private clearIdleTimer(workerId: number): void {
    const timer = this.idleTimers.get(workerId);
    if (timer) {
      clearTimeout(timer);
      this.idleTimers.delete(workerId);
    }
  }

  private handleTaskError(worker: PooledWorker, error: Error): void {
    if (worker.currentReject) {
      worker.currentReject(error);
      this.stats.totalTasksFailed++;
    }
    this.finishTask(worker);
  }

  private recordTaskTime(ms: number): void {
    this.taskTimes.push(ms);
    if (this.taskTimes.length > 100) this.taskTimes.shift();
    this.stats.averageTaskTimeMs =
      this.taskTimes.reduce((a, b) => a + b, 0) / this.taskTimes.length;
  }

  private emit(event: PoolEvent): void {
    for (const listener of this.eventListeners) {
      try { listener(event); } catch { /* ignore */ }
    }
  }

  private terminateWorker(worker: PooledWorker): void {
    this.clearIdleTimer(worker.id);
    if (worker.currentTimer) clearTimeout(worker.currentTimer);
    worker.worker.terminate();
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${++this.taskIdCounter}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[WorkerPool]`, ...args);
    }
  }
}

/** Create a pre-configured web worker pool */
export function createWorkerPool(config: WorkerPoolConfig): WebWorkerPool {
  return new WebWorkerPool(config);
}
