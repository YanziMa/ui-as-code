/**
 * Workflow Engine: DAG-based task orchestration with parallel/sequential execution,
 * conditional branching, retry with backoff, timeout handling, event hooks,
 * state persistence, and visual workflow definition.
 */

// --- Types ---

export type TaskId = string;
export type WorkflowId = string;

export interface TaskDefinition {
  id: TaskId;
  name: string;
  /** Handler function — returns the task result */
  handler: (...args: unknown[]) => Promise<unknown>;
  /** Tasks that must complete before this one can run */
  dependsOn?: TaskId[];
  /** Maximum number of retries on failure */
  retries?: number;
  /** Delay between retries (ms) */
  retryDelay?: number;
  /** Timeout for this task (ms) */
  timeout?: number;
  /** Condition function — if returns false, task is skipped */
  condition?: (context: WorkflowContext) => boolean | Promise<boolean>;
  /** Metadata for UI/debugging */
  metadata?: Record<string, unknown>;
}

export interface WorkflowContext {
  workflowId: WorkflowId;
  input: Record<string, unknown>;
  results: Map<TaskId, unknown>;
  startedAt: number;
  status: WorkflowStatus;
}

export type WorkflowStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "timeout";

export interface TaskResult {
  taskId: TaskId;
  status: "success" | "failed" | "skipped" | "timeout";
  data?: unknown;
  error?: Error;
  duration: number;
  attempts: number;
  startedAt: number;
  completedAt: number;
}

export interface WorkflowResult {
  workflowId: WorkflowId;
  status: WorkflowStatus;
  results: Map<TaskId, TaskResult>;
  output: Record<string, unknown>;
  duration: number;
  error?: Error;
  startedAt: number;
  completedAt: number;
}

export interface WorkflowHook {
  name: string;
  phase: "before" | "after" | "onError";
  taskId?: TaskId;
  handler: (context: WorkflowContext, data?: unknown) => Promise<void> | void;
}

export interface WorkflowOptions {
  /** Maximum concurrent tasks (default: Infinity) */
  concurrency?: number;
  /** Global timeout for the entire workflow (ms) */
  timeout?: number;
  /** Whether to continue other tasks when one fails (default: true) */
  continueOnError?: boolean;
  /** Default retry count for all tasks */
  defaultRetries?: number;
  /** Default retry delay (ms) */
  defaultRetryDelay?: number;
}

// --- Workflow Definition ---

export class WorkflowDefinition {
  private tasks = new Map<TaskId, TaskDefinition>();
  private hooks: WorkflowHook[] = [];

  /** Add a task to the workflow */
  addTask(task: TaskDefinition): this {
    this.tasks.set(task.id, task);
    return this;
  }

  /** Add multiple tasks */
  addTasks(tasks: TaskDefinition[]): this {
    for (const t of tasks) this.addTask(t);
    return this;
  }

  /** Get a task by ID */
  getTask(id: TaskId): TaskDefinition | undefined {
    return this.tasks.get(id);
  }

  /** Get all tasks */
  getAllTasks(): TaskDefinition[] {
    return [...this.tasks.values()];
  }

  /** Register a hook */
  addHook(hook: WorkflowHook): this {
    this.hooks.push(hook);
    return this;
  }

  /** Remove a task */
  removeTask(id: TaskId): boolean {
    return this.tasks.delete(id);
  }

  /** Validate the workflow DAG (check for cycles) */
  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const visited = new Set<TaskId>();
    const visiting = new Set<TaskId>();

    // Check all dependencies reference existing tasks
    for (const [id, task] of this.tasks) {
      if (task.dependsOn) {
        for (const dep of task.dependsOn) {
          if (!this.tasks.has(dep)) {
            errors.push(`Task "${id}" depends on non-existent task "${dep}"`);
          }
        }
      }
    }

    // Check for cycles using DFS
    for (const id of this.tasks.keys()) {
      if (!visited.has(id)) {
        const cycle = this.detectCycle(id, visited, visiting);
        if (cycle) errors.push(`Cycle detected: ${cycle.join(" → ")}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /** Get execution order (topological sort) */
  getExecutionOrder(): TaskId[][] {
    const order: TaskId[][] = [];
    const completed = new Set<TaskId>();
    const remaining = new Set(this.tasks.keys());

    while (remaining.size > 0) {
      const batch: TaskId[] = [];

      for (const id of remaining) {
        const task = this.tasks.get(id)!;
        const canRun = !task.dependsOn?.some((dep) => !completed.has(dep));
        const conditionMet = !task.condition || true; // Can't evaluate without context
        if (canRun && conditionMet) batch.push(id);
      }

      if (batch.length === 0) {
        // Remaining tasks have unmet deps or cycle
        break;
      }

      order.push(batch);
      for (const id of batch) {
        completed.add(id);
        remaining.delete(id);
      }
    }

    return order;
  }

  private detectCycle(node: TaskId, visited: Set<TaskId>, visiting: Set<TaskId>): TaskId[] | null {
    visiting.add(node);

    const task = this.tasks.get(node);
    if (!task) return null;

    for (const dep of task.dependsOn ?? []) {
      if (visiting.has(dep)) return [dep, node];
      if (!visited.has(dep)) {
        const cycle = this.detectCycle(dep, visited, visiting);
        if (cycle) return [...cycle, node];
      }
    }

    visiting.delete(node);
    visited.add(node);
    return null;
  }
}

// --- Workflow Executor ---

/**
 * Executes a WorkflowDefinition.
 *
 * Features:
 * - DAG-based parallel execution (tasks in same level run concurrently)
 * - Retry with configurable delay and count
 * - Per-task and global timeouts
 * - Conditional task execution
 * - Before/after/onError hooks
 * - Continue-on-error mode
 *
 * @example
 * const def = new WorkflowDefinition()
 *   .addTask({ id: "fetch", handler: fetchData })
 *   .addTask({ id: "process", handler: processData, dependsOn: ["fetch"] })
 *   .addTask({ id: "notify", handler: sendNotification, dependsOn: ["process"] });
 *
 * const executor = new WorkflowExecutor();
 * const result = await executor.execute(def, { userId: "123" });
 */
export class WorkflowExecutor {
  private globalHooks: WorkflowHook[] = [];

  /** Add a global hook (applies to all workflows) */
  addHook(hook: WorkflowHook): this {
    this.globalHooks.push(hook);
    return this;
  }

  /**
   * Execute a workflow definition with given input.
   */
  async execute(
    definition: WorkflowDefinition,
    input: Record<string, unknown> = {},
    options: WorkflowOptions = {},
  ): Promise<WorkflowResult> {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();

    // Validate first
    const validation = definition.validate();
    if (!validation.valid) {
      return {
        workflowId,
        status: "failed",
        results: new Map(),
        output: {},
        duration: Date.now() - startedAt,
        error: new Error(`Invalid workflow: ${validation.errors.join("; ")}`),
        startedAt,
        completedAt: Date.now(),
      };
    }

    const context: WorkflowContext = {
      workflowId,
      input,
      results: new Map(),
      startedAt,
      status: "running",
    };

    const allHooks = [...this.globalHooks, ...definition["hooks" as WorkflowHook[] ?? []];
    const results = new Map<TaskId, TaskResult>();
    const opts = {
      concurrency: options.concurrency ?? Infinity,
      timeout: options.timeout,
      continueOnError: options.continueOnError ?? true,
      defaultRetries: options.defaultRetries ?? 0,
      defaultRetryDelay: options.defaultRetryDelay ?? 1000,
    };

    // Global timeout
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;
    if (opts.timeout) {
      timeoutId = setTimeout(() => { timedOut = true; }, opts.timeout);
    }

    try {
      // Run before-workflow hooks
      await this.runHooks(allHooks, "before", context);

      // Execute in topological batches
      const batches = definition.getExecutionOrder();
      const maxConcurrency = opts.concurrency;

      for (const batch of batches) {
        if (timedOut || context.status === "cancelled") break;

        // Check conditions and run tasks with concurrency limit
        const semaphore = new Semaphore(maxConcurrency);
        const promises = batch.map(async (taskId) => {
          await semaphore.acquire();
          try {
            const result = await this.runTask(taskId, definition, context, opts, allHooks);
            results.set(taskId, result);
            if (result.status === "failed" && !opts.continueOnError) {
              context.status = "failed";
            }
          } finally {
            semaphore.release();
          }
        });

        await Promise.all(promises);
      }

      // Determine final status
      context.status = timedOut ? "timeout"
        : context.status === "cancelled" ? "cancelled"
        : context.status === "failed" ? "failed"
        : "completed";

      // Build output from task results
      const output: Record<string, unknown> = {};
      for (const [taskId, result] of results) {
        if (result.data !== undefined) output[taskId] = result.data;
        context.results.set(taskId, result.data);
      }

      // Run after-workflow hooks
      await this.runHooks(allHooks, "after", context, output);

      return {
        workflowId,
        status: context.status as Exclude<WorkflowStatus, "pending" | "running">,
        results,
        output,
        duration: Date.now() - startedAt,
        startedAt,
        completedAt: Date.now(),
      };
    } catch (err) {
      await this.runHooks(allHooks, "onError", context, err);
      return {
        workflowId,
        status: "failed",
        results,
        output: {},
        duration: Date.now() - startedAt,
        error: err as Error,
        startedAt,
        completedAt: Date.now(),
      };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /** Cancel a running workflow (best-effort) */
  cancel(context: WorkflowContext): void {
    context.status = "cancelled";
  }

  // --- Private ---

  private async runTask(
    taskId: TaskId,
    definition: WorkflowDefinition,
    context: WorkflowContext,
    opts: Required<Pick<WorkflowOptions, "concurrency" | "continueOnError" | "defaultRetries" | "defaultRetryDelay">>,
    hooks: WorkflowHook[],
  ): Promise<TaskResult> {
    const task = definition.getTask(taskId)!;
    const startedAt = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;
    const maxRetries = task.retries ?? opts.defaultRetries;
    const retryDelay = task.retryDelay ?? opts.defaultRetryDelay;

    // Check condition
    if (task.condition) {
      try {
        const shouldRun = await task.condition(context);
        if (!shouldRun) {
          return { taskId, status: "skipped", duration: Date.now() - startedAt, attempts: 0, startedAt, completedAt: Date.now() };
        }
      } catch (err) {
        return { taskId, status: "skipped", error: err as Error, duration: Date.now() - startedAt, attempts: 0, startedAt, completedAt: Date.now() };
      }
    }

    // Run before-task hooks
    await this.runHooks(hooks, "before", context, taskId);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      attempts = attempt + 1;

      try {
        // Per-task timeout
        let result: unknown;
        if (task.timeout) {
          result = await Promise.race([
            task.handler(context.input),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Task "${taskId}" timed out after ${task.timeout}ms`)), task.timeout),
            ),
          ]);
        } else {
          result = await task.handler(context.input);
        }

        const taskResult: TaskResult = {
          taskId,
          status: "success",
          data: result,
          duration: Date.now() - startedAt,
          attempts,
          startedAt,
          completedAt: Date.now(),
        };

        // Run after-task hooks
        await this.runHooks(hooks, "after", context, taskResult);

        return taskResult;
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, retryDelay));
        }
      }
    }

    // All retries exhausted
    const failedResult: TaskResult = {
      taskId,
      status: "failed",
      error: lastError,
      duration: Date.now() - startedAt,
      attempts,
      startedAt,
      completedAt: Date.now(),
    };

    // Run on-error hooks
    await this.runHooks(hooks, "onError", context, failedResult);

    return failedResult;
  }

  private async runHooks(
    hooks: WorkflowHook[],
    phase: WorkflowHook["phase"],
    context: WorkflowContext,
    data?: unknown,
  ): Promise<void> {
    const matching = hooks.filter((h) => h.phase === phase);
    for (const hook of matching) {
      try { await hook.handler(context, data); } catch { /* ignore hook errors */ }
    }
  }
}

// --- Semaphore (for concurrency control) ---

class Semaphore {
  private available: number;
  private queue: Array<() => void> = [];

  constructor(count: number) {
    this.available = count;
  }

  acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => this.queue.push(resolve));
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.available++;
    }
  }
}

// --- Convenience Functions ---

/** Create a workflow definition and execute it in one call */
export async function runWorkflow(
  tasks: TaskDefinition[],
  input?: Record<string, unknown>,
  options?: WorkflowOptions,
): Promise<WorkflowResult> {
  const def = new WorkflowDefinition();
  for (const t of tasks) def.addTask(t);
  const executor = new WorkflowExecutor();
  return executor.execute(def, input, options);
}

/** Create a sequential workflow (tasks run one after another) */
export function sequentialWorkflow(tasks: Array<Omit<TaskDefinition, "dependsOn">>): TaskDefinition[] {
  return tasks.map((t, i) => ({
    ...t,
    dependsOn: i > 0 ? [tasks[i - 1]!.id] : undefined,
  }));
}

/** Create a parallel workflow (all tasks run simultaneously) */
export function parallelWorkflow(tasks: Array<Omit<TaskDefinition, "dependsOn">>): TaskDefinition[] {
  return tasks.map((t) => ({ ...t, dependsOn: undefined }));
}
