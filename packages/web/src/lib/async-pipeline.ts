/**
 * Async Pipeline: Composable async task execution with concurrency control,
 * retry, timeout, cancellation, progress reporting, and multiple
 * execution modes (waterfall, parallel, race).
 */

// --- Types ---

export type PipelineMode = "waterfall" | "parallel" | "race";

export interface PipelineTask<T = unknown> {
  /** Unique task identifier */
  id: string;
  /** Task name for logging/display */
  name?: string;
  /** The async function to execute */
  execute: () => Promise<T>;
  /** Timeout in ms (0 = no timeout) */
  timeout?: number;
  /** Max retry attempts */
  retries?: number;
  /** Delay between retries (ms or backoff function) */
  retryDelay?: number | ((attempt: number) => number);
  /** Whether this task is critical (pipeline fails if it fails) */
  critical?: boolean;
  /** Dependencies: IDs of tasks that must complete first */
  dependsOn?: string[];
  /** Priority (lower = higher priority, used in parallel mode) */
  priority?: number;
}

export interface PipelineResult<T = unknown> {
  /** Task ID */
  taskId: string;
  /** Resolved value */
  value?: T;
  /** Error if failed */
  error?: Error;
  /** Whether the task succeeded */
  success: boolean;
  /** Number of attempts made */
  attempts: number;
  /** Duration in ms */
  duration: number;
}

export interface PipelineReport {
  /** Total tasks */
  total: number;
  /** Completed successfully */
  succeeded: number;
  /** Failed */
  failed: number;
  /** Skipped (due to dependency failure) */
  skipped: number;
  /** Total duration in ms */
  duration: number;
  /** Per-task results */
  results: PipelineResult<unknown>[];
}

export interface PipelineOptions<T = unknown> {
  /** Tasks to execute */
  tasks: PipelineTask<T>[];
  /** Execution mode */
  mode?: PipelineMode;
  /** Max concurrent tasks (parallel mode only, default: Infinity) */
  concurrency?: number;
  /** AbortController for cancellation */
  signal?: AbortSignal;
  /** Global timeout in ms (0 = no timeout) */
  timeout?: number;
  /** Progress callback */
  onProgress?: (report: Partial<PipelineReport>) => void;
  /** Called when a single task completes */
  onTaskComplete?: (result: PipelineResult<T>) => void;
  /** Called on unrecoverable error */
  onError?: (error: Error) => void;
  /** Continue on non-critical failures? */
  continueOnError?: boolean;
  /** Default retry count for all tasks */
  defaultRetries?: number;
  /** Default retry delay */
  defaultRetryDelay?: number | ((attempt: number) => number);
}

// --- Internal State ---

interface TaskState<T> {
  task: PipelineTask<T>;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "timed-out";
  result?: T;
  error?: Error;
  attempts: number;
  startTime: number;
  endTime?: number;
}

// --- Main Pipeline ---

export async function runPipeline<T = unknown>(options: PipelineOptions<T>): Promise<PipelineReport> {
  const {
    tasks,
    mode = "parallel",
    concurrency = Infinity,
    signal,
    timeout: globalTimeout = 0,
    onProgress,
    onTaskComplete,
    onError,
    continueOnError = true,
    defaultRetries = 0,
    defaultRetryDelay = 1000,
  } = options;

  const startTime = Date.now();
  const state = new Map<string, TaskState<T>>();

  // Initialize states
  for (const task of tasks) {
    state.set(task.id, {
      task: { ...task, retries: task.retries ?? defaultRetries, retryDelay: task.retryDelay ?? defaultRetryDelay },
      status: "pending",
      attempts: 0,
      startTime: 0,
    });
  }

  // Check abort signal
  if (signal?.aborted) {
    return buildReport(state, startTime);
  }

  let globalTimer: ReturnType<typeof setTimeout> | null = null;
  if (globalTimeout > 0) {
    globalTimer = setTimeout(() => {
      for (const s of state.values()) {
        if (s.status === "running" || s.status === "pending") {
          s.status = "timed-out";
          s.error = new Error(`Pipeline timed out after ${globalTimeout}ms`);
        }
      }
    }, globalTimeout);
  }

  const abortHandler = () => {
    for (const s of state.values()) {
      if (s.status === "running" || s.status === "pending") {
        s.status = s.status === "running" ? "failed" : "skipped";
        s.error = new Error("Pipeline aborted");
      }
    }
  };
  signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    switch (mode) {
      case "waterfall":
        await runWaterfall(state, onTaskComplete, onError, continueOnError);
        break;
      case "race":
        await runRace(state, onTaskComplete, onError);
        break;
      case "parallel":
      default:
        await runParallel(state, concurrency, onTaskComplete, onError, continueOnError);
        break;
    }

    emitProgress(state, onProgress, startTime);
  } finally {
    if (globalTimer) clearTimeout(globalTimer);
    signal?.removeEventListener("abort", abortHandler);
  }

  return buildReport(state, startTime);
}

// --- Execution Modes ---

async function runWaterfall<T>(
  state: Map<string, TaskState<T>>,
  onTaskComplete?: (result: PipelineResult<T>) => void,
  onError?: (error: Error) => void,
  continueOnError = true,
): Promise<void> {
  const ordered = Array.from(state.values());

  for (const s of ordered) {
    // Skip if already failed/skipped from dependency chain
    if (s.status !== "pending") continue;

    // Check dependencies
    const depsMet = checkDependencies(s.task.dependsOn, state);
    if (!depsMet) {
      s.status = "skipped";
      s.error = new Error("Dependency not met");
      continue;
    }

    await executeTask(s, onTaskComplete, onError);

    if (!s.success && s.task.critical && !continueOnError) {
      // Mark remaining as skipped
      for (const remaining of ordered) {
        if (remaining.status === "pending") remaining.status = "skipped";
      }
      break;
    }
  }
}

async function runParallel<T>(
  state: Map<string, TaskState<T>>,
  maxConcurrency: number,
  onTaskComplete?: (result: PipelineResult<T>) => void,
  onError?: (error: Error) => void,
  continueOnError = true,
): Promise<void> {
  const pending = Array.from(state.values()).filter((s) => s.status === "pending");
  // Sort by priority (lower = higher)
  pending.sort((a, b) => (a.task.priority ?? 0) - (b.task.priority ?? 0));

  let nextIndex = 0;
  const running = new Set<TaskState<T>>();

  const processNext = async (): Promise<void> => {
    while (nextIndex < pending.length && running.size < maxConcurrency) {
      const s = pending[nextIndex++]!;

      // Check dependencies
      const depsMet = checkDependencies(s.task.dependsOn, state);
      if (!depsMet) {
        s.status = "skipped";
        s.error = new Error("Dependency not met");
        continue;
      }

      running.add(s);
      // Fire and forget (errors handled inside)
      executeTask(s, onTaskComplete, onError).then(() => {
        running.delete(s);

        if (!s.success && s.task.critical && !continueOnError) {
          // Mark remaining pending as skipped
          for (const p of pending.slice(nextIndex)) {
            if (p.status === "pending") p.status = "skipped";
          }
          return;
        }

        // Process next in queue
        processNext();
      });
    }
  };

  // Start initial batch
  await processNext();

  // Wait for all running to complete
  while (running.size > 0) {
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (running.size === 0) {
          clearInterval(check);
          resolve();
        }
      }, 10);
    });
  }
}

async function runRace<T>(
  state: Map<string, TaskState<T>>,
  onTaskComplete?: (result: PipelineResult<T>) => void,
  onError?: (error: Error) => void,
): Promise<void> {
  const pending = Array.from(state.values()).filter((s) => s.status === "pending");

  await Promise.any(
    pending.map(async (s) => {
      await executeTask(s, onTaskComplete, onError);
      // First success wins — mark others as cancelled
      if (s.success) {
        for (const other of pending) {
          if (other !== s && other.status === "pending") {
            other.status = "skipped";
          }
          if (other !== s && other.status === "running") {
            other.status = "skipped";
            other.error = new Error("Cancelled by faster task");
          }
        }
      }
    }),
  ).catch(() => {
    // All rejected — that's fine, results are in state
  });
}

// --- Task Execution ---

async function executeTask<T>(
  s: TaskState<T>,
  onTaskComplete?: (result: PipelineResult<T>) => void,
  onError?: (error: Error) => void,
): Promise<void> {
  const { task } = s;
  const maxRetries = task.retries ?? 0;
  const delayFn = typeof task.retryDelay === "function"
    ? task.retryDelay
    : (_: number) => task.retryDelay ?? 1000;

  s.status = "running";
  s.startTime = Date.now();

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    s.attempts = attempt + 1;

    try {
      // Apply per-task timeout
      const result = task.timeout && task.timeout > 0
        ? await withTimeout(task.execute(), task.timeout)
        : await task.execute();

      s.result = result;
      s.status = "completed";
      s.endTime = Date.now();

      const pipelineResult: PipelineResult<T> = {
        taskId: task.id,
        value: result,
        success: true,
        attempts: s.attempts,
        duration: s.endTime - s.startTime,
      };
      onTaskComplete?.(pipelineResult);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on abort
      if (lastError.name === "AbortError") {
        s.status = "failed";
        s.error = lastError;
        s.endTime = Date.now();
        onError?.(lastError);
        onTaskComplete?.({
          taskId: task.id,
          error: lastError,
          success: false,
          attempts: s.attempts,
          duration: Date.now() - s.startTime,
        });
        return;
      }

      // Wait before retry (except on last attempt)
      if (attempt < maxRetries) {
        await sleep(delayFn(attempt));
      }
    }
  }

  // All retries exhausted
  s.status = "failed";
  s.error = lastError ?? new Error("Unknown error");
  s.endTime = Date.now();
  onError?.(s.error);
  onTaskComplete?.({
    taskId: task.id,
    error: s.error,
    success: false,
    attempts: s.attempts,
    duration: s.endTime - s.startTime,
  });
}

// --- Helpers ---

function checkDependencies(dependsOn: string[] | undefined, state: Map<string, TaskState<unknown>>): boolean {
  if (!dependsOn || dependsOn.length === 0) return true;
  return dependsOn.every((depId) => {
    const dep = state.get(depId);
    return dep?.status === "completed";
  });
}

function emitProgress<T>(state: Map<string, TaskState<T>>, onProgress?: (report: Partial<PipelineReport>) => void, startTime?: number): void {
  if (!onProgress) return;

  let succeeded = 0, failed = 0, skipped = 0;
  for (const s of state.values()) {
    if (s.status === "completed") succeeded++;
    else if (s.status === "failed" || s.status === "timed-out") failed++;
    else if (s.status === "skipped") skipped++;
  }

  onProgress({
    total: state.size,
    succeeded,
    failed,
    skipped,
    duration: startTime ? Date.now() - startTime : 0,
  });
}

function buildReport<T>(state: Map<string, TaskState<T>>, startTime: number): PipelineReport {
  const results: PipelineResult<unknown>[] = [];
  let succeeded = 0, failed = 0, skipped = 0;

  for (const [id, s] of state) {
    const r: PipelineResult = {
      taskId: id,
      value: s.result,
      error: s.error,
      success: s.status === "completed",
      attempts: s.attempts,
      duration: (s.endTime ?? Date.now()) - s.startTime,
    };
    results.push(r);

    if (r.success) succeeded++;
    else if (s.status === "skipped") skipped++;
    else failed++;
  }

  return {
    total: state.size,
    succeeded,
    failed,
    skipped,
    duration: Date.now() - startTime,
    results,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Task timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Convenience Builders ---

/** Create a simple pipeline task */
export function createTask<T>(id: string, fn: () => Promise<T>, overrides?: Partial<PipelineTask<T>>): PipelineTask<T> {
  return { id, execute: fn, ...overrides };
}

/** Run tasks in sequence (waterfall shorthand) */
export async function series<T>(tasks: PipelineTask<T>[], options?: Omit<PipelineOptions<T>, "tasks" | "mode">): Promise<PipelineReport> {
  return runPipeline({ ...options, tasks, mode: "waterfall" });
}

/** Run tasks in parallel (shorthand) */
export async function parallel<T>(tasks: PipelineTask<T>[], options?: Omit<PipelineOptions<T>, "tasks" | "mode">): Promise<PipelineReport> {
  return runPipeline({ ...options, tasks, mode: "parallel" });
}

/** Run tasks as a race (first to succeed wins) */
export async function race<T>(tasks: PipelineTask<T>[], options?: Omit<PipelineOptions<T>, "tasks" | "mode">): Promise<PipelineReport> {
  return runPipeline({ ...options, tasks, mode: "race" });
}
