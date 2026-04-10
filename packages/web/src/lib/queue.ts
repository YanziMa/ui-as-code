/**
 * Simple async queue utility for managing concurrent operations.
 */

export interface QueueTask<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export class AsyncQueue {
  private queue: QueueTask<unknown>[] = [];
  private activeCount = 0;
  private readonly concurrency: number;

  constructor(concurrency: number = 5) {
    this.concurrency = concurrency;
  }

  /** Add a task to the queue */
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        id: Math.random().toString(36).slice(2),
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.process();
    });
  }

  private process(): void {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.activeCount++;
      task.fn()
        .then(task.resolve)
        .catch(task.reject)
        .finally(() => {
          this.activeCount--;
          this.process();
        });
    }
  }

  /** Get current queue size */
  get size(): number {
    return this.queue.length;
  }

  /** Get number of active tasks */
  get active(): number {
    return this.activeCount;
  }
}

/** Rate-limited task executor */
export class RateLimiter {
  private queue: Array<() => Promise<unknown>> = [];
  private lastRun = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private intervalMs: number) {}

  /** Schedule a function to run at most once per interval */
  schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result as T);
        } catch (err) {
          reject(err);
        }
      });
      this.tick();
    });
  }

  private tick(): void {
    if (this.timer) return;
    const now = Date.now();
    const wait = Math.max(0, this.intervalMs - (now - this.lastRun));
    this.timer = setTimeout(() => {
      this.timer = null;
      this.lastRun = Date.now();
      const task = this.queue.shift();
      if (task) task();
      if (this.queue.length > 0) this.tick();
    }, wait);
  }
}

/** Debounced queue — batches items within a window */
export class BatchingQueue<T> {
  private buffer: T[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly batchFn: (items: T[]) => Promise<void>;
  private readonly windowMs: number;
  private readonly maxSize: number;

  constructor(
    batchFn: (items: T[]) => Promise<void>,
    options: { windowMs?: number; maxSize?: number } = {},
  ) {
    this.batchFn = batchFn;
    this.windowMs = options.windowMs ?? 100;
    this.maxSize = options.maxSize ?? 10;
  }

  push(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length >= this.maxSize) {
      this.flush();
    } else {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => this.flush(), this.windowMs);
    }
  }

  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];
    await this.batchFn(batch);
  }

  /** Force flush remaining items */
  async drain(): Promise<void> {
    return this.flush();
  }
}
