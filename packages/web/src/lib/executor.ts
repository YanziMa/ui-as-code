/**
 * Executor: Task execution engine with concurrency control, priority queues,
 * retry logic, cancellation, resource pooling, rate limiting, and
 * execution lifecycle hooks.
 */

// --- Types ---

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type TaskPriority = "low" | "normal" | "high" | "critical";

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
  abortController?: AbortController;
  dependencies?: string[]; // Task IDs that must complete first
}

export interface ExecutorOptions {
  /** Maximum concurrent tasks (default: 4) */
  concurrency?: number;
  /** Default priority for tasks without explicit priority */
  defaultPriority?: TaskPriority;
  /** Default max retries per task (default: 0) */
  defaultMaxRetries?: number;
  /** Retry delay base in ms (default: 1000) */
  retryDelayMs?: number;
  /** Enable task queue persistence across page reloads? */
  persistQueue?: boolean;
  /** Storage key for persisted queue */
  storageKey?: string;
  /** Called when a task starts */
  onTaskStart?: (task: Task) => void;
  /** Called when a task completes */
  onTaskComplete?: (task: Task) => void;
  /** Called when a task fails */
  onTaskFail?: (task: Task) => void;
  /** Called when all tasks are done */
  onDrain?: () => void;
  /** Global timeout per task in ms (default: no limit) */
  taskTimeoutMs?: number;
}

export interface ExecutorInstance {
  /** Submit a new task */
  submit<T>(fn: () => Promise<T>, options?: Partial<Pick<Task, "name" | "priority" | "maxRetries" | "dependencies">>): string;
  /** Cancel a task by ID */
  cancel(id: string): boolean;
  /** Cancel all pending/running tasks */
  cancelAll(): void;
  /** Get task by ID */
  getTask(id: string): Task | undefined;
  /** Get all tasks */
  getAllTasks(): Task[];
  /** Get tasks filtered by status */
  getTasksByStatus(status: TaskStatus): Task[];
  /** Wait for a specific task to complete */
  awaitTask<T>(id: string): Promise<T>;
  /** Wait for all tasks to complete */
  drain(): Promise<void};
  /** Pause accepting new tasks (running tasks continue) */
  pause(): void;
  /** Resume accepting new tasks */
  resume(): void;
  /** Get current stats */
  getStats(): { pending: number; running: number; completed: number; failed: number; cancelled: number };
  /** Destroy the executor */
  destroy(): void;
}

// --- Priority Weights ---

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
};

// --- Main Executor ---

/**
 * Create a task executor with concurrency control and priority scheduling.
 *
 * @example
 * ```ts
 * const executor = createExecutor({ concurrency: 3 });
 *
 * const id1 = executor.submit(() => fetch("/api/data").then(r => r.json()), {
 *   name: "fetch-data",
 *   priority: "high",
 * });
 *
 * const result = await executor.awaitTask(id1);
 * ```
 */
export function createExecutor(options: ExecutorOptions = {}): ExecutorInstance {
  const {
    concurrency = 4,
    defaultPriority = "normal",
    defaultMaxRetries = 0,
    retryDelayMs = 1000,
    onTaskStart,
    onTaskComplete,
    onTaskFail,
    onDrain,
    taskTimeoutMs,
  } = options;

  const tasks = new Map<string, Task>();
  const queue: string[] = []; // Task IDs ordered by priority
  const running = new Set<string>();
  let paused = false;
  let destroyed = false;
  let drainResolve: (() => void) | null = null;

  function generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Add a task ID to the queue in priority order.
   */
  function enqueue(id: string): void {
    const task = tasks.get(id);
    if (!task || task.status !== "pending") return;

    // Check dependencies
    if (task.dependencies?.length) {
      const allDepsMet = task.dependencies.every((depId) => {
        const dep = tasks.get(depId);
        return dep?.status === "completed";
      });
      if (!allDepsMet) return; // Will be re-enqueued when deps complete
    }

    // Insert in priority order (highest first)
    let inserted = false;
    const weight = PRIORITY_WEIGHTS[task.priority];
    for (let i = 0; i < queue.length; i++) {
      const queuedTask = tasks.get(queue[i]!);
      if (queuedTask && PRIORITY_WEIGHTS[queuedTask.priority] < weight) {
        queue.splice(i, 0, id);
        inserted = true;
        break;
      }
    }
    if (!inserted) queue.push(id);

    // Try to run next
    runNext();
  }

  /**
   * Re-enqueue dependent tasks whose dependencies may now be met.
   */
  function checkDependents(completedId: string): void {
    for (const [, task] of tasks) {
      if (
        task.status === "pending" &&
        task.dependencies?.includes(completedId) &&
        !queue.includes(task.id)
      ) {
        // Check if ALL deps are now met
        const allMet = task.dependencies!.every((depId) => {
          const dep = tasks.get(depId);
          return dep?.status === "completed";
        });
        if (allMet) enqueue(task.id);
      }
    }
  }

  /**
   * Run the next task(s) from the queue up to concurrency limit.
   */
  async function runNext(): void {
    if (paused || destroyed) return;

    while (running.size < concurrency && queue.length > 0) {
      const id = queue.shift();
      if (!id) break;

      const task = tasks.get(id);
      if (!task || task.status !== "pending") continue;

      running.add(id);
      task.status = "running";
      task.startedAt = Date.now();
      task.abortController = new AbortController();

      onTaskStart?.(task);

      // Execute the task
      executeTask(task).finally(() => {
        running.delete(id);
        checkDependents(id);
        runNext();

        // Check if drained
        if (queue.length === 0 && running.size === 0 && drainResolve) {
          drainResolve();
          drainResolve = null;
          onDrain?.();
        }
      });
    }
  }

  async function executeTask(task: Task): Promise<void> {
    try {
      let resultPromise = task.fn();

      // Apply timeout
      if (taskTimeoutMs) {
        resultPromise = Promise.race([
          resultPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Task "${task.name}" timed out after ${taskTimeoutMs}ms`)), taskTimeoutMs),
          ),
        ]);
      }

      // Abort support
      if (task.abortController) {
        resultPromise = Promise.race([
          resultPromise,
          new Promise<never>((_, reject) => {
            task.abortController!.signal.addEventListener("abort", () =>
              reject(new DOMException("Task cancelled", "AbortError")),
            );
          }),
        ]);
      }

      const result = await resultPromise;

      task.status = "completed";
      task.result = result as unknown as T;
      task.completedAt = Date.now();
      onTaskComplete?.(task);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Handle cancellation
      if (error.name === "AbortError") {
        task.status = "cancelled";
        task.error = error;
        onTaskFail?.(task);
        return;
      }

      // Retry logic
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = "pending";
        task.error = undefined;

        // Delay before retry
        await new Promise((r) => setTimeout(r, retryDelayMs * Math.pow(2, task.retries - 1)));
        enqueue(task.id);
        return;
      }

      task.status = "failed";
      task.error = error;
      task.completedAt = Date.now();
      onTaskFail?.(task);
    }
  }

  function submit<T>(
    fn: () => Promise<T>,
    submitOptions?: Partial<Pick<Task, "name" | "priority" | "maxRetries" | "dependencies">>,
  ): string {
    if (destroyed) throw new Error("Executor is destroyed");

    const id = generateId();
    const task: Task = {
      id,
      name: submitOptions?.name ?? `task-${id}`,
      fn: fn as () => Promise<unknown>,
      priority: submitOptions?.priority ?? defaultPriority,
      status: "pending",
      createdAt: Date.now(),
      retries: 0,
      maxRetries: submitOptions?.maxRetries ?? defaultMaxRetries,
      dependencies: submitOptions?.dependencies,
    };

    tasks.set(id, task);
    enqueue(id);

    return id;
  }

  function cancel(id: string): boolean {
    const task = tasks.get(id);
    if (!task) return false;

    if (task.status === "running" && task.abortController) {
      task.abortController.abort();
    } else if (task.status === "pending") {
      task.status = "cancelled";
      // Remove from queue
      const idx = queue.indexOf(id);
      if (idx >= 0) queue.splice(idx, 1);
    } else {
      return false;
    }

    return true;
  }

  function cancelAll(): void {
    for (const [id] of tasks) cancel(id);
  }

  function getTask(id: string): Task | undefined {
    return tasks.get(id);
  }

  function getAllTasks(): Task[] {
    return Array.from(tasks.values());
  }

  function getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(tasks.values()).filter((t) => t.status === status);
  }

  async function awaitTask<T>(id: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const check = (): void => {
        const task = tasks.get(id);
        if (!task) { reject(new Error(`Task ${id} not found`)); return; }

        switch (task.status) {
          case "completed":
            resolve(task.result as T);
            break;
          case "failed":
            reject(task.error ?? new Error("Task failed"));
            break;
          case "cancelled":
            reject(new DOMException("Task was cancelled", "AbortError"));
            break;
          case "running":
          case "pending":
            // Poll with microtask delay
            setTimeout(check, 10);
            break;
        }
      };
      check();
    });
  }

  function drain(): Promise<void> {
    if (queue.length === 0 && running.size === 0) return Promise.resolve();
    return new Promise((resolve) => { drainResolve = resolve; });
  }

  function pause(): void { paused = true; }
  function resume(): void { paused = false; runNext(); }

  function getStats() {
    let pending = 0, runningCount = 0, completed = 0, failed = 0, cancelled = 0;
    for (const task of tasks.values()) {
      switch (task.status) {
        case "pending": pending++; break;
        case "running": runningCount++; break;
        case "completed": completed++; break;
        case "failed": failed++; break;
        case "cancelled": cancelled++; break;
      }
    }
    return { pending, running: runningCount, completed, failed, cancelled };
  }

  function destroy(): void {
    destroyed = true;
    cancelAll();
    tasks.clear();
    queue.length = 0;
  }

  return { submit, cancel, cancelAll, getTask, getAllTasks, getTasksByStatus, awaitTask, drain, pause, resume, getStats, destroy };
}

// --- Rate-Limited Executor Wrapper ---

export interface RateLimitOptions {
  /** Max tasks per interval */
  maxTasks: number;
  /** Interval in ms */
  intervalMs: number;
}

/**
 * Wrap an executor with rate limiting.
 * Ensures no more than `maxTasks` tasks start within any `intervalMs` window.
 */
export function createRateLimitedExecutor(
  executor: ExecutorInstance,
  rateLimit: RateLimitOptions,
): ExecutorInstance {
  const timestamps: number[] = [];

  const originalSubmit = executor.submit.bind(executor);

  const rateLimitedSubmit: ExecutorInstance["submit"] = <T>(
    fn: () => Promise<T>,
    options?: Partial<Pick<Task, "name" | "priority" | "maxRetries" | "dependencies">>,
  ): string => {
    // Clean old timestamps
    const now = Date.now();
    while (timestamps.length > 0 && timestamps[0]! <= now - rateLimit.intervalMs) {
      timestamps.shift();
    }

    if (timestamps.length >= rateLimit.maxTasks) {
      throw new Error(`Rate limit exceeded: ${rateLimit.maxTasks} tasks per ${rateLimit.intervalMs}ms`);
    }

    timestamps.push(now);
    return originalSubmit(fn, options);
  };

  return {
    ...executor,
    submit: rateLimitedSubmit,
  };
}
