/**
 * Web Worker and background task utilities.
 */

/** Create a Web Worker from a function (inline worker) */
export function createInlineWorker<TInput = unknown, TOutput = unknown>(
  fn: (data: TInput) => TOutput,
  options?: { name?: string },
): Worker {
  const code = `
    self.onmessage = function(e) {
      try {
        const result = (${fn.toString()})(e.data);
        self.postMessage({ success: true, data: result });
      } catch (err) {
        self.postMessage({ success: false, error: err.message });
      }
    };
  `;

  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, { name: options?.name });

  // Clean up blob URL after worker is created
  worker.addEventListener("error", () => URL.revokeObjectURL(url));

  return worker;
}

/** Run a task in a Web Worker and return a promise */
export function runInWorker<TInput, TOutput>(
  fn: (data: TInput) => TOutput,
  data: TInput,
): Promise<TOutput> {
  return new Promise((resolve, reject) => {
    if (typeof Worker === "undefined") {
      // Fallback: run in main thread
      try {
        resolve(fn(data));
      } catch (err) {
        reject(err);
      }
      return;
    }

    const worker = createInlineWorker(fn);

    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.success) {
        resolve(e.data.data as TOutput);
      } else {
        reject(new Error(e.data.error));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(err.error);
    };

    worker.postMessage(data);
  });
}

/** Task queue with configurable concurrency for background processing */
export class TaskQueue<T = unknown> {
  private queue: Array<{ task: () => Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void }> = [];
  private running = 0;
  private readonly maxConcurrency: number;

  constructor(maxConcurrency = 4) {
    this.maxConcurrency = maxConcurrency;
  }

  /** Add a task to the queue */
  enqueue(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  /** Get current queue size (waiting + running) */
  get size(): number {
    return this.queue.length + this.running;
  }

  /** Get number of currently running tasks */
  get activeCount(): number {
    return this.running;
  }

  private processNext(): void {
    while (this.running < this.maxConcurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;

      item.task()
        .then(item.resolve)
        .catch(item.reject)
        .finally(() => {
          this.running--;
          this.processNext();
        });
    }
  }

  /** Clear all pending tasks (running tasks continue) */
  clearPending(): number {
    const count = this.queue.length;
    this.queue = [];
    return count;
  }
}

/** Debounced task processor — batches rapid calls into one execution */
export class BatchingProcessor<T> {
  private pending: T[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly processor: (batch: T[]) => Promise<void>;
  private readonly batchDelay: number;
  private readonly maxSize: number;

  constructor(
    processor: (batch: T[]) => Promise<void>,
    options?: { delayMs?: number; maxSize?: number },
  ) {
    this.processor = processor;
    this.batchDelay = options?.delayMs ?? 100;
    this.maxSize = options?.maxSize ?? 50;
  }

  /** Add an item to the current batch */
  add(item: T): void {
    this.pending.push(item);

    // Flush immediately if at max size
    if (this.pending.length >= this.maxSize) {
      this.flush();
      return;
    }

    // Schedule flush
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.batchDelay);
    }
  }

  /** Force-flush the current batch */
  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pending.length === 0) return;

    const batch = [...this.pending];
    this.pending = [];

    await this.processor(batch);
  }

  /** Get current pending count */
  get pendingCount(): number {
    return this.pending.length;
  }
}

/** Request idle callback wrapper with fallback */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions,
): number {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback: use setTimeout
  return window.setTimeout(callback, 1) as unknown as number;
}

export function cancelIdleCallback(handle: number): void {
  if (typeof window !== "undefined" && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
}
