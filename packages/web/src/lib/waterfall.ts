/**
 * Waterfall/pipeline utilities for sequential async operations.
 */

export interface PipelineStep<T = unknown> {
  name: string;
  execute: (context: PipelineContext) => Promise<T>;
  /** Skip this step if returns true */
  skip?: (context: PipelineContext) => boolean;
  /** Rollback function if a later step fails */
  rollback?: (result: T, context: PipelineContext) => Promise<void>;
  /** Timeout in ms for this step (default: 30000) */
  timeout?: number;
}

export interface PipelineContext {
  [key: string]: unknown;
}

export interface PipelineResult {
  success: boolean;
  results: Map<string, unknown>;
  errors: Array<{ step: string; error: unknown }>;
  duration: number;
  executedSteps: string[];
  rolledBackSteps: string[];
}

/** Execute steps sequentially with rollback on failure */
export async function runPipeline(
  steps: PipelineStep[],
  initialContext: PipelineContext = {},
): Promise<PipelineResult> {
  const startTime = performance.now();
  const results = new Map<string, unknown>();
  const errors: Array<{ step: string; error: unknown }> = [];
  const executedSteps: string[] = [];
  const rolledBackSteps: string[] = [];

  let context = { ...initialContext };
  let failedStepIndex = -1;

  // Execute steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    try {
      // Check skip condition
      if (step.skip?.(context)) {
        executedSteps.push(step.name + " (skipped)");
        continue;
      }

      // Execute with optional timeout
      let result: unknown;
      if (step.timeout) {
        result = await withTimeout(step.execute(context), step.timeout);
      } else {
        result = await step.execute(context);
      }

      context[step.name] = result;
      results.set(step.name, result);
      executedSteps.push(step.name);

    } catch (error) {
      errors.push({ step: step.name, error });
      failedStepIndex = i;
      break; // Stop pipeline on first error
    }
  }

  // Rollback completed steps in reverse order
  if (failedStepIndex >= 0) {
    for (let i = failedStepIndex - 1; i >= 0; i--) {
      const step = steps[i];
      if (step.rollback && results.has(step.name)) {
        try {
          await step.rollback(results.get(step.name)!, context);
          rolledBackSteps.push(step.name);
        } catch (rollbackError) {
          errors.push({ step: `${step.name} (rollback)`, error: rollbackError });
        }
      }
    }
  }

  return {
    success: failedStepIndex < 0,
    results,
    errors,
    duration: Math.round((performance.now() - startTime) * 100) / 100,
    executedSteps,
    rolledBackSteps,
  };
}

/** Run multiple operations in parallel and return all results */
export async function parallel<T>(
  tasks: (() => Promise<T>)[],
  options?: { concurrency?: number; stopOnError?: boolean },
): Promise<{ results: T[]; errors: { index: number; error: unknown }[] }> {
  const { concurrency = tasks.length, stopOnError = false } = options ?? {};
  const results: T[] = new Array(tasks.length).fill(null as unknown as T);
  const errors: { index: number; error: unknown }[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;

      try {
        results[idx] = await tasks[idx]();
      } catch (error) {
        errors.push({ index: idx, error });
        if (stopOnError) return;
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);

  return { results, errors };
}

/** Waterfall — run tasks where each gets the previous task's output */
export async function waterfall<T>(tasks: Array<(input: unknown) => Promise<unknown>>, initialInput?: unknown): Promise<T[]> {
  let current: unknown = initialInput;
  const results: unknown[] = [];

  for (const task of tasks) {
    current = await task(current);
    results.push(current);
  }

  return results as T[];
}

/** Race with cancellation of losers */
export async function raceWithCleanup<T>(
  promises: Array<() => Promise<T>>,
  cleanup?: (loser: () => Promise<T>) => Promise<void>,
): Promise<T> {
  const wrapped = promises.map((p) => p());
  const winner = await Promise.race(wrapped);

  // Note: We can't truly cancel the other promises,
  // but we can call cleanup if provided
  if (cleanup) {
    wrapped.forEach(async (promise) => {
      if (promise !== winner) {
        try { await cleanup(() => promise); } catch { /* ignore */ }
      }
    });
  }

  return winner;
}

/** Timeout wrapper */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}
