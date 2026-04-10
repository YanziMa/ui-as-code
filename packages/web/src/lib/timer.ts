/**
 * Timer and scheduling utilities.
 */

/** Simple timer with pause/resume */
export class Timer {
  private startTime: number = 0;
  private accumulated: number = 0;
  private running: boolean = false;

  start(): void {
    if (!this.running) {
      this.startTime = Date.now();
      this.running = true;
    }
  }

  stop(): number {
    if (this.running) {
      this.accumulated += Date.now() - this.startTime;
      this.running = false;
    }
    return this.accumulated;
  }

  reset(): void {
    this.accumulated = 0;
    this.startTime = 0;
    this.running = false;
  }

  get elapsed(): number {
    if (this.running) {
      return this.accumulated + (Date.now() - this.startTime);
    }
    return this.accumulated;
  }

  get isRunning(): boolean {
    return this.running;
  }
}

/** Debounce with cancel */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): { (...args: Parameters<T>): void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout>;
  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}

/** Throttle with trailing call */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  ms: number,
): { (...args: Parameters<T>): void; cancel: () => void } {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout>;
  let lastArgs: Parameters<T> | null = null;

  const throttled = (...args: Parameters<T>) => {
    lastArgs = args;
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn(...args);
      lastArgs = null;
    } else if (!timer) {
      timer = setTimeout(() => {
        lastCall = Date.now();
        if (lastArgs) fn(...lastArgs);
        lastArgs = null;
        timer = undefined as unknown as ReturnType<typeof setTimeout>;
      }, ms - (now - lastCall));
    }
  };

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = undefined as unknown as ReturnType<typeof setTimeout>;
  };

  return throttled;
}

/** Delay promise (async sleep) */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry async function with exponential backoff */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelay?: number; maxDelay?: number } = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 300, maxDelay = 5000 } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts - 1) {
        const delayMs = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await delay(delayMs);
      }
    }
  }

  throw lastError;
}

/** Run function with timeout */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms),
    ),
  ]);
}
