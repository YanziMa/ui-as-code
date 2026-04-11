/**
 * Async Task Queue: Priority-based concurrent task execution system with
 * concurrency control, retry logic, rate limiting, progress tracking,
 * pause/resume/cancel, event hooks, and persistent queue state.
 */

// --- Types ---

export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "retrying";
export type TaskPriority = "low" | "normal" | "high" | "critical";

export interface Task<T = unknown> {
  /** Unique task ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Async function to execute */
  fn: () => Promise<T>;
  /** Execution priority */
  priority?: TaskPriority;
  /** Max retry attempts (default: 0) */
  retries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Timeout in ms (0 = no timeout) */
  timeout?: number;
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
  /** Created timestamp */
  createdAt?: number;
}

export interface TaskResult<T = unknown> {
  /** Task reference */
  task: Task<T>;
  /** Resolved value (if successful) */
  value?: T;
  /** Error (if failed) */
  error?: Error;
  /** Final status */
  status: TaskStatus;
  /** Started timestamp */
  startedAt?: number;
  /** Completed timestamp */
  completedAt?: number;
  /** Duration in ms */
  duration?: number;
  /** Attempt count */
  attempts: number;
}

export interface QueueStats {
  total: number;
  queued: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  /** Average task duration in ms */
  avgDuration: number;
  /** Throughput (tasks/sec since start) */
  throughput: number;
}

export interface AsyncQueueOptions {
  /** Maximum concurrent tasks (default: 3) */
  concurrency?: number;
  /** Default max retries per task (default: 0) */
  defaultRetries?: number;
  /** Default retry delay in ms (default: 1000) */
  defaultRetryDelay?: number;
  /** Default task timeout in ms (default: 0 = none) */
  defaultTimeout?: number;
  /** Rate limit: min interval between task starts in ms (default: 0) */
  rateLimitMs?: number;
  /** Auto-start on enqueue? (default: true) */
  autoStart?: boolean;
  /** Callback when a task completes */
  onTaskComplete?: (result: TaskResult) => void;
  /** Callback when a task fails */
  onTaskError?: (result: TaskResult) => void;
  /** Callback when queue becomes empty */
  onDrain?: () => void;
  /** Callback when all tasks (including retries) are done */
  onIdle?: () => void;
  /** Persist queue to localStorage? */
  persistKey?: string;
}

export interface AsyncQueueInstance {
  /** Add a task to the queue */
  enqueue<T>(task: Omit<Task<T>, "id" | "createdAt">): Promise<TaskResult<T>>;
  /** Add multiple tasks */
  enqueueMany<T>(tasks: Array<Omit<Task<T>, "id" | "createdAt">>): Promise<TaskResult<T>[]>;
  /** Get current queue stats */
  getStats(): QueueStats;
  /** Get all results so far */
  getResults(): TaskResult[];
  /** Get result for a specific task ID */
  getResult(id: string): TaskResult | undefined;
  /** Pause processing (running tasks continue) */
  pause: () => void;
  /** Resume processing */
  resume: () => void;
  /** Cancel all queued tasks */
  cancelQueued: () => void;
  /** Cancel a specific task by ID */
  cancelTask: (id: string) => void;
  /** Retry a failed task */
  retryTask: (id: string) => Promise<void>;
  /** Clear completed/failed/cancelled results */
  clearHistory: () => void;
  /** Destroy the queue and cleanup */
  destroy: () => void;
  /** Is the queue currently paused? */
  isPaused: () => boolean;
  /** Is the queue idle (no running or queued tasks)? */
  isIdle: () => boolean;
}

// --- Helpers ---

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main Factory ---

export function createAsyncQueue(options: AsyncQueueOptions = {}): AsyncQueueInstance {
  const opts = {
    concurrency: options.concurrency ?? 3,
    defaultRetries: options.defaultRetries ?? 0,
    defaultRetryDelay: options.defaultRetryDelay ?? 1000,
    defaultTimeout: options.defaultTimeout ?? 0,
    rateLimitMs: options.rateLimitMs ?? 0,
    autoStart: options.autoStart ?? true,
    persistKey: options.persistKey ?? "",
    ...options,
  };

  // State
  const queue: Task[] = [];           // Waiting to run
  const running = new Set<string>();   // Currently running task IDs
  const results: TaskResult[] = [];     // Completed results
  const resultMap = new Map<string, TaskResult>();
  let paused = false;
  let destroyed = false;
  let lastStartTime = 0;                // For rate limiting
  let activeCount = 0;                 // Currently running count

  // Pending resolve handlers (for awaitable results)
  const pendingResolves = new Map<string, (result: TaskResult) => void>();

  // Load persisted state
  if (opts.persistKey) {
    try {
      const saved = localStorage.getItem(opts.persistKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          for (const t of parsed) {
            queue.push({ ...t, fn: () => Promise.resolve(undefined as unknown) });
          }
        }
      }
    } catch { /* ignore */ }
  }

  // --- Core Processing Loop ---

  async function processNext(): Promise<void> {
    if (destroyed || paused) return;
    if (activeCount >= opts.concurrency) return;
    if (queue.length === 0) {
      checkIdle();
      return;
    }

    // Rate limiting
    if (opts.rateLimitMs > 0) {
      const now = Date.now();
      const wait = opts.rateLimitMs - (now - lastStartTime);
      if (wait > 0) await sleep(wait);
      if (destroyed || paused) return;
    }

    // Get next task (by priority)
    queue.sort((a, b) => (PRIORITY_WEIGHT[b.priority ?? "normal"] ?? 2) - (PRIORITY_WEIGHT[a.priority ?? "normal"] ?? 2));
    const task = queue.shift();
    if (!task) return;

    lastStartTime = Date.now();
    activeCount++;
    running.add(task.id);

    const result = await executeTask(task);
    activeCount--;
    running.delete(task.id);

    // Store result
    results.push(result);
    resultMap.set(task.id, result);

    // Notify pending resolver
    const resolver = pendingResolves.get(task.id);
    if (resolver) {
      resolver(result);
      pendingResolves.delete(task.id);
    }

    // Callbacks
    if (result.status === "completed") {
      opts.onTaskComplete?.(result);
    } else {
      opts.onTaskError?.(result);
    }

    // Persist
    saveState();

    // Check drain/idle
    if (queue.length === 0 && activeCount === 0) {
      opts.onDrain?.();
      checkIdle();
    }

    // Process next
    if (!destroyed && !paused) {
      processNext();
    }
  }

  async function executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    let attempts = 0;
    const maxRetries = task.retries ?? opts.defaultRetries;
    const retryDelay = task.retryDelay ?? opts.defaultRetryDelay;
    const timeout = task.timeout ?? opts.defaultTimeout;

    while (true) {
      attempts++;

      try {
        // Apply timeout wrapper if needed
        let promise = task.fn();
        if (timeout > 0) {
          promise = Promise.race([
            promise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Task "${task.name}" timed out after ${timeout}ms`)), timeout)
            ),
          ]);
        }

        const value = await promise;
        const endTime = Date.now();

        return {
          task,
          value: value as unknown,
          status: "completed",
          startedAt: startTime,
          completedAt: endTime,
          duration: endTime - startTime,
          attempts,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Retry?
        if (attempts <= maxRetries) {
          await sleep(retryDelay * attempts); // Exponential backoff factor
          continue;
        }

        const endTime = Date.now();
        return {
          task,
          error,
          status: "failed",
          startedAt: startTime,
          completedAt: endTime,
          duration: endTime - startTime,
          attempts,
        };
      }
    }
  }

  function checkIdle(): void {
    if (queue.length === 0 && activeCount === 0) {
      opts.onIdle?.();
    }
  }

  function saveState(): void {
    if (!opts.persistKey) return;
    try {
      const serializable = queue.map((t) => ({
        id: t.id,
        name: t.name,
        priority: t.priority,
        retries: t.retries,
        retryDelay: t.retryDelay,
        timeout: t.timeout,
        meta: t.meta,
        createdAt: t.createdAt,
      }));
      localStorage.setItem(opts.persistKey, JSON.stringify(serializable));
    } catch { /* ignore */ }
  }

  // --- Instance API ---

  async function enqueue<T>(taskDef: Omit<Task<T>, "id" | "createdAt">): Promise<TaskResult<T>> {
    if (destroyed) throw new Error("Queue is destroyed");

    const task: Task<T> = {
      ...taskDef,
      id: generateId(),
      createdAt: Date.now(),
    };

    queue.push(task);
    saveState();

    // Create promise that resolves when this task completes
    const resultPromise = new Promise<TaskResult<T>>((resolve) => {
      pendingResolves.set(task.id, resolve as (r: TaskResult) => void);
    });

    if (opts.autoStart && !paused) {
      processNext();
    }

    return resultPromise as Promise<TaskResult<T>>;
  }

  async function enqueueMany<T>(taskDefs: Array<Omit<Task<T>, "id" | "createdAt">>): Promise<TaskResult<T>[]> {
    const promises = taskDefs.map((t) => enqueue(t));
    return Promise.all(promises);
  }

  function getStats(): QueueStats {
    const now = Date.now();
    const completedResults = results.filter((r) => r.status === "completed");
    const avgDuration = completedResults.length > 0
      ? completedResults.reduce((sum, r) => sum + (r.duration ?? 0), 0) / completedResults.length
      : 0;

    const firstResult = results[0];
    const elapsed = firstResult ? (now - (firstResult.startedAt ?? now)) : 1;
    const throughput = elapsed > 0 ? completedResults.length / (elapsed / 1000) : 0;

    return {
      total: queue.length + running.size + results.length,
      queued: queue.length,
      running: running.size,
      completed: results.filter((r) => r.status === "completed").length,
      failed: results.filter((r) => r.status === "failed").length,
      cancelled: results.filter((r) => r.status === "cancelled").length,
      avgDuration,
      throughput,
    };
  }

  function getResults(): TaskResult[] {
    return [...results];
  }

  function getResult(id: string): TaskResult | undefined {
    return resultMap.get(id);
  }

  function pause(): void {
    paused = true;
  }

  function resume(): void {
    if (!paused) return;
    paused = false;
    processNext();
  }

  function cancelQueued(): void {
    for (const task of queue) {
      const result: TaskResult = {
        task,
        status: "cancelled",
        attempts: 0,
        createdAt: Date.now(),
      };
      results.push(result);
      resultMap.set(task.id, result);

      const resolver = pendingResolves.get(task.id);
      if (resolver) {
        resolver(result);
        pendingResolves.delete(task.id);
      }
    }
    queue.length = 0;
    saveState();
  }

  function cancelTask(id: string): void {
    // Check if in queue
    const qIdx = queue.findIndex((t) => t.id === id);
    if (qIdx >= 0) {
      const task = queue.splice(qIdx, 1)[0]!;
      const result: TaskResult = { task, status: "cancelled", attempts: 0 };
      results.push(result);
      resultMap.set(id, result);
      saveState();
      return;
    }
    // Can't cancel running tasks (would need AbortController integration)
  }

  async function retryTask(id: string): Promise<void> {
    const existing = resultMap.get(id);
    if (!existing || existing.status !== "failed") return;

    // Remove from results
    const idx = results.indexOf(existing);
    if (idx >= 0) results.splice(idx, 1);
    resultMap.delete(id);

    // Re-enqueue
    const task: Task = { ...existing.task };
    queue.push(task);
    saveState();

    if (!paused) processNext();
  }

  function clearHistory(): void {
    const kept = results.filter((r) => r.status === "running" || queue.some((t) => t.id === r.task.id));
    results.length = 0;
    results.push(...kept);
    // Rebuild map
    resultMap.clear();
    for (const r of results) resultMap.set(r.task.id, r);
  }

  function destroyQueue(): void {
    destroyed = true;
    cancelQueued();
    pendingResolves.clear();
    if (opts.persistKey) {
      try { localStorage.removeItem(opts.persistKey); } catch { /* ignore */ }
    }
  }

  function isPausedFn(): boolean { return paused; }

  function isIdleFn(): boolean { return queue.length === 0 && activeCount === 0; }

  // Auto-start if there are persisted tasks
  if (opts.autoStart && queue.length > 0 && !paused) {
    processNext();
  }

  return {
    enqueue: enqueue as <T>(t: Omit<Task<T>, "id" | "createdAt">) => Promise<TaskResult<T>>,
    enqueueMany: enqueueMany as <T>(ts: Array<Omit<Task<T>, "id" | "createdAt">>) => Promise<TaskResult<T>[]>,
    getStats,
    getResults,
    getResult,
    pause,
    resume,
    cancelQueued,
    cancelTask,
    retryTask,
    clearHistory,
    destroy: destroyQueue,
    isPaused: isPausedFn,
    isIdle: isIdleFn,
  };
}
