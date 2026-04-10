/**
 * Progress tracking utilities for uploads, downloads, and long-running operations.
 */

export interface ProgressState {
  /** Current progress 0-100 */
  percent: number;
  /** Bytes/units completed */
  loaded: number;
  /** Total bytes/units */
  total: number;
  /** Speed in units per second */
  speed: number;
  /** Estimated remaining time in seconds */
  eta: number;
  /** Whether the operation is running */
  isRunning: boolean;
  /** Whether completed successfully */
  isDone: boolean;
  /** Error message if failed */
  error: string | null;
}

export type ProgressCallback = (state: ProgressState) => void;

/** Create a progress tracker for any operation */
export function createProgressTracker(
  total: number,
  onProgress?: ProgressCallback,
): ProgressController {
  let loaded = 0;
  let startTime = Date.now();
  let lastTime = startTime;
  let lastLoaded = 0;
  let isRunning = true;
  let isDone = false;
  let error: string | null = null;
  let speedSamples: number[] = [];
  const MAX_SAMPLES = 10;

  function emit() {
    const now = Date.now();
    const elapsed = (now - lastTime) / 1000;

    if (elapsed > 0.1) {
      const instantSpeed = (loaded - lastLoaded) / elapsed;
      speedSamples.push(instantSpeed);
      if (speedSamples.length > MAX_SAMPLES) speedSamples.shift();
      lastTime = now;
      lastLoaded = loaded;
    }

    const avgSpeed = speedSamples.length > 0
      ? speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length
      : 0;

    const remaining = total - loaded;
    const eta = avgSpeed > 0 ? remaining / avgSpeed : 0;

    const state: ProgressState = {
      percent: total > 0 ? Math.min(100, (loaded / total) * 100) : 0,
      loaded,
      total,
      speed: Math.round(avgSpeed),
      eta: Math.round(eta),
      isRunning,
      isDone,
      error,
    };

    onProgress?.(state);
    return state;
  }

  return {
    advance(amount: number): ProgressState {
      loaded = Math.min(total, loaded + amount);
      return emit();
    },

    setProgress(value: number): ProgressState {
      loaded = Math.min(total, Math.max(0, value));
      return emit();
    },

    complete(err?: string): ProgressState {
      isRunning = false;
      isDone = !err;
      error = err ?? null;
      if (!err) loaded = total;
      return emit();
    },

    getState(): ProgressState {
      return emit();
    },

    reset(newTotal?: number): ProgressState {
      if (newTotal !== undefined) total = newTotal;
      loaded = 0;
      startTime = Date.now();
      lastTime = startTime;
      lastLoaded = 0;
      isRunning = true;
      isDone = false;
      error = null;
      speedSamples = [];
      return emit();
    },
  };
}

export type ProgressController = ReturnType<typeof createProgressTracker>;

/** Track multiple parallel operations */
export function createMultiProgressTracker(
  onProgress?: ProgressCallback,
): MultiProgressController {
  const trackers = new Map<string, ProgressController>();

  function emitOverall() {
    let totalLoaded = 0;
    let totalSize = 0;
    let allDone = true;
    let anyError: string | null = null;
    let anyRunning = false;

    for (const [, tracker] of trackers) {
      const state = tracker.getState();
      totalLoaded += state.loaded;
      totalSize += state.total;
      if (!state.isDone) allDone = false;
      if (state.isRunning) anyRunning = true;
      if (state.error && !anyError) anyError = state.error;
    }

    const overall: ProgressState = {
      percent: totalSize > 0 ? Math.min(100, (totalLoaded / totalSize) * 100) : 0,
      loaded: totalLoaded,
      total: totalSize,
      speed: 0,
      eta: 0,
      isRunning: anyRunning,
      isDone: allDone,
      error: anyError,
    };

    onProgress?.(overall);
    return overall;
  }

  return {
    create(name: string, total: number): ProgressController {
      const tracker = createProgressTracker(total, () => emitOverall());
      trackers.set(name, tracker);
      return tracker;
    },

    remove(name: string): void {
      trackers.delete(name);
      emitOverall();
    },

    getState(): ProgressState {
      return emitOverall();
    },
  };
}

export type MultiProgressController = ReturnType<typeof createMultiProgressTracker>;

/** Format progress state for display */
export function formatProgress(state: ProgressState): string {
  if (state.isDone) return "Complete";
  if (state.error) return `Error: ${state.error}`;

  const pct = `${Math.round(state.percent)}%`;
  const loaded = formatBytes(state.loaded);
  const total = formatBytes(state.total);

  let result = `${pct} (${loaded}/${total})`;

  if (state.speed > 0) {
    result += ` ${formatBytes(state.speed)}/s`;
  }

  if (state.eta > 0 && state.eta < 86400) {
    result += ` ${formatEta(state.eta)}`;
  }

  return result;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}MB`;
  return `${(bytes / 1073741824).toFixed(1)}GB`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/** Create a step-based progress tracker (for multi-step workflows) */
export function createStepProgress(
  steps: string[],
  onStepChange?: (stepIndex: number, stepName: string, progress: number) => void,
): StepProgressController {
  let currentStep = -1;

  return {
    next(): number {
      currentStep++;
      const progress = steps.length > 0
        ? ((currentStep + 1) / steps.length) * 100
        : 0;
      onStepChange?.(currentStep, steps[currentStep] ?? "", progress);
      return progress;
    },

    getCurrentStep(): { index: number; name: string; progress: number } {
      const progress = steps.length > 0
        ? ((currentStep + 1) / steps.length) * 100
        : 0;
      return {
        index: currentStep,
        name: steps[currentStep] ?? "",
        progress,
      };
    },

    reset(): void {
      currentStep = -1;
    },

    getTotalSteps(): number {
      return steps.length;
    },
  };
}

export type StepProgressController = ReturnType<typeof createStepProgress>;
