/**
 * Queue data structures and utilities: FIFO queue, priority queue, circular buffer,
 * debounce queue, rate-limited queue, observable queue, batch processor,
 * worker queue (Web Worker integration), and async task queue.
 */

// --- Types ---

export interface QueueItem<T = unknown> {
  value: T;
  id?: string;
  priority?: number;
  createdAt: number;
}

export interface QueueStats {
  length: number;
  maxLength: number;
  totalEnqueued: number;
  totalDequeued: number;
  dropped: number;
}

export interface BatchProcessorOptions<T = unknown> {
  /** Max items per batch */
  batchSize?: number;
  /** Max wait time before flushing partial batch (ms) */
  maxWaitMs?: number;
  /** Process callback */
  process: (items: T[]) => Promise<void>;
  /** Called on processing error */
  onError?: (error: Error, items: T[]) => void;
}

// --- FIFO Queue ---

/**
 * Simple FIFO (First-In-First-Out) queue.
 */
export class Queue<T = unknown> {
  private items: T[] = [];
  private _maxLength = Infinity;
  private stats = { totalEnqueued: 0, totalDequeued: 0, dropped: 0 };

  constructor(maxLength?: number) {
    if (maxLength !== undefined) this._maxLength = maxLength;
  }

  /** Add item(s) to the end of the queue */
  enqueue(...items: T[]): number {
    let added = 0;
    for (const item of items) {
      if (this.items.length >= this._maxLength) {
        this.items.shift();
        this.stats.dropped++;
      }
      this.items.push(item);
      this.stats.totalEnqueued++;
      added++;
    }
    return added;
  }

  /** Remove and return the first item, or undefined if empty */
  dequeue(): T | undefined {
    const item = this.items.shift();
    if (item !== undefined) this.stats.totalDequeued++;
    return item;
  }

  /** Peek at the first item without removing it */
  peek(): T | undefined {
    return this.items[0];
  }

  /** Peek at the last item without removing it */
  peekLast(): T | undefined {
    return this.items[this.items.length - 1];
  }

  /** Check if queue is empty */
  get isEmpty(): boolean { return this.items.length === 0; }

  /** Get current size */
  get size(): number { return this.items.length; }

  /** Clear all items */
  clear(): T[] {
    const removed = [...this.items];
    this.items = [];
    return removed;
  }

  /** Iterate over items without removing them */
  forEach(callback: (item: T, index: number) => void): void {
    this.items.forEach(callback);
  }

  /** Map over items without removing them */
  map<U>(callback: (item: T, index: number) => U): U[] {
    return this.items.map(callback);
  }

  /** Filter items without removing them */
  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  /** Find an item matching predicate */
  find(predicate: (item: T) => boolean): T | undefined {
    return this.items.find(predicate);
  }

  /** Check if an item exists in the queue */
  contains(item: T): boolean {
    return this.items.includes(item);
  }

  /** Convert to array (does not empty the queue) */
  toArray(): T[] {
    return [...this.items];
  }

  /** Get queue statistics */
  getStats(): QueueStats {
    return {
      length: this.items.length,
      maxLength: this._maxLength,
      ...this.stats,
    };
  }
}

// --- Priority Queue ---

/**
 * Priority queue where items with lower priority numbers are dequeued first.
 */
export class PriorityQueue<T = unknown> {
  private items: Array<QueueItem<T>> = [];
  private _maxLength = Infinity;

  constructor(maxLength?: number) {
    if (maxLength !== undefined) this._maxLength = maxLength;
  }

  enqueue(value: T, priority = 0, id?: string): boolean {
    if (this.items.length >= this._maxLength) return false;

    const item: QueueItem<T> = {
      value,
      priority,
      id: id ?? crypto.randomUUID?.() ?? String(Math.random()),
      createdAt: Date.now(),
    };

    // Insert in sorted order
    let inserted = false;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i]!.priority! > priority) {
        this.items.splice(i, 0, item);
        inserted = true;
        break;
      }
    }
    if (!inserted) this.items.push(item);

    return true;
  }

  dequeue(): T | undefined {
    const item = this.items.shift();
    return item?.value;
  }

  peek(): T | undefined {
    return this.items[0]?.value;
  }

  get size(): number { return this.items.length; }
  get isEmpty(): boolean { return this.items.length === 0; }

  clear(): void { this.items = []; }
  toArray(): T[] { return this.items.map((i) => i.value); }
}

// --- Circular Buffer (Ring Buffer) ---

/**
 * Fixed-size circular buffer for efficient append/read operations.
 * Overwrites oldest data when full.
 */
export class CircularBuffer<T = unknown> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private _size = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity).fill(undefined);
  }

  /** Write a value (overwrites oldest if full) */
  write(value: T): void {
    this.buffer[this.tail] = value;
    this.tail = (this.tail + 1) % this.capacity;
    if (this._size < this.capacity) this._size++;
  }

  /** Read the oldest value (FIFO order) */
  read(): T | undefined {
    if (this._size === 0) return undefined;
    const value = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this._size--;
    return value;
  }

  /** Peek at the oldest value without reading */
  peekOldest(): T | undefined {
    if (this._size === 0) return undefined;
    return this.buffer[this.head];
  }

  /** Peek at the newest value without reading */
  peekNewest(): T | undefined {
    if (this._size === 0) return undefined;
    const idx = (this.tail - 1 + this.capacity) % this.capacity;
    return this.buffer[idx];
  }

  get size(): number { return this._size; }
  get isEmpty(): boolean { return this._size === 0; }
  get isFull(): boolean { return this._size === this.capacity; }
  get capacity(): number { return this.capacity; }

  /** Iterate from oldest to newest */
  forEach(callback: (value: T, index: number) => void): void {
    for (let i = 0; i < this._size; i++) {
      const idx = (this.head + i) % this.capacity;
      callback(this.buffer[idx]!, i);
    }
  }

  toArray(): T[] {
    const result: T[] = [];
    this.forEach((v) => result.push(v));
    return result;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this._size = 0;
  }
}

// --- Rate-Limited Queue ---

/**
 * Queue that processes items at a maximum rate (items per interval).
 */
export class RateLimitedQueue<T = unknown> {
  private innerQueue = new Queue<T>();
  private processedCount = 0;
  private resetInterval: ReturnType<typeof setInterval>;
  private availableTokens: number;

  constructor(
    private maxItemsPerInterval: number,
    private intervalMs: number = 1000,
  ) {
    this.availableTokens = maxItemsPerInterval;
    this.resetInterval = setInterval(() => {
      this.availableTokens = maxItemsPerInterval;
    }, intervalMs);
  }

  enqueue(item: T): boolean {
    return this.innerQueue.enqueue(item);
  }

  /** Try to dequeue one item (only succeeds if under rate limit) */
  tryDequeue(): T | undefined {
    if (this.availableTokens <= 0 || this.innerQueue.isEmpty) return undefined;
    this.availableTokens--;
    this.processedCount++;
    return this.innerQueue.dequeue();
  }

  get pendingSize(): number { return this.innerQueue.size; }
  get available(): number { return this.availableTokens; }
  get totalProcessed(): number { return this.processedCount; }

  destroy(): void {
    clearInterval(this.resetInterval);
  }
}

// --- Observable Queue ---

/**
 * Queue that emits events when items are enqueued/dequeued.
 */
export class ObservableQueue<T = unknown> extends Queue<T> {
  private listeners = new Set<(event: "enqueue" | "dequeue" | "clear", item?: T) => void>();

  on(listener: (event: "enqueue" | "dequeue" | "clear", item?: T) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  override enqueue(...items: T[]): number {
    const count = super.enqueue(...items);
    for (const item of items) {
      this.listeners.forEach((l) => l("enqueue", item));
    }
    return count;
  }

  override dequeue(): T | undefined {
    const item = super.dequeue();
    if (item !== undefined) {
      this.listeners.forEach((l) => l("dequeue", item));
    }
    return item;
  }

  override clear(): T[] {
    const items = super.clear();
    this.listeners.forEach((l) => l("clear"));
    return items;
  }
}

// --- Debounce Queue ---

/**
 * Queue that batches rapid enqueue calls into periodic flushes.
 * Useful for auto-save, search-as-you-type, etc.
 */
export class DebounceQueue<T = unknown> {
  private pending: T[] = [];
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private flushCallback: (items: T[]) => void;
  private _waitMs: number;
  private _maxBatch: number;

  constructor(
    callback: (items: T[]) => void,
    options?: { waitMs?: number; maxBatch?: number },
  ) {
    this.flushCallback = callback;
    this._waitMs = options?.waitMs ?? 300;
    this._maxBatch = options?.maxBatch ?? Infinity;
  }

  add(item: T): void {
    this.pending.push(item);

    if (this.pending.length >= this._maxBatch) {
      this.flushNow();
      return;
    }

    if (this.timerId !== null) return; // Already scheduled

    this.timerId = setTimeout(() => this.flush(), this._waitMs);
  }

  /** Immediately flush all pending items */
  flushNow(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.pending.length > 0) {
      const items = [...this.pending];
      this.pending = [];
      this.flushCallback(items);
    }
  }

  /** Flush on next tick regardless of timer */
  flush(): void { this.flushNow(); }

  get pendingCount(): number { return this.pending.length; }

  cancel(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  destroy(): void {
    this.cancel();
    this.pending = [];
  }
}

// --- Async Task Queue ---

/**
 * Queue that processes async tasks with concurrency control.
 */
export class AsyncTaskQueue<T = unknown, R = unknown> {
  private queue: Array<{ task: () => Promise<R>; resolve: (r: R) => void; reject: (e: Error) => void }> = [];
  private activeCount = 0;
  private _concurrency: number;
  private paused = false;

  constructor(concurrency = 4) {
    this._concurrency = concurrency;
  }

  /** Add a task to the queue */
  add(task: () => Promise<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  /** Add multiple tasks and wait for all */
  addAll(tasks: Array<() => Promise<R>>): Promise<R[]> {
    return Promise.all(tasks.map((t) => this.add(t)));
  }

  get activeCount(): number { return this.activeCount; }
  get pendingCount(): number { return this.queue.length; }
  get concurrency(): number { return this._concurrency; }

  set concurrency(n: number): void { this._concurrency = n; this.processNext(); }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; this.processNext(); }

  clear(): void {
    // Reject all pending
    for (const item of this.queue) {
      item.reject(new Error("Queue cleared"));
    }
    this.queue = [];
  }

  private processNext(): void {
    while (this.activeCount < this._concurrency && this.queue.length > 0 && !this.paused) {
      const item = this.queue.shift()!;
      this.activeCount++;

      item.task()
        .then((result) => {
          item.resolve(result);
        })
        .catch((error) => {
          item.reject(error);
        })
        .finally(() => {
          this.activeCount--;
          this.processNext();
        });
    }
  }
}

// --- Batch Processor ---

/**
 * Collects items into batches and processes them together.
 */
export class BatchProcessor<T = unknown> {
  private buffer: T[] = [];
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  private options: Required<BatchProcessorOptions<T>>;

  constructor(options: BatchProcessorOptions<T>) {
    this.options = {
      batchSize: options.batchSize ?? 10,
      maxWaitMs: options.maxWaitMs ?? 1000,
      process: options.process,
      onError: options.onError ?? (() => {}),
    };
  }

  /** Add an item to the current batch */
  add(item: T): void {
    if (this.closed) throw new Error("BatchProcessor is closed");

    this.buffer.push(item);

    if (this.buffer.length >= this.options.batchSize) {
      this.flushNow();
      return;
    }

    if (!this.timerId) {
      this.timerId = setTimeout(() => this.flush(), this.options.maxWaitMs);
    }
  }

  /** Force-flush the current batch */
  async flushNow(): Promise<void> {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }

    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await this.options.process(batch);
    } catch (error) {
      this.options.onError(error as Error, batch);
    }
  }

  /** Flush any remaining items (call when done adding) */
  async flush(): Promise<void> { await this.flushNow(); }

  /** Close the processor and prevent further adds */
  async close(): Promise<void> {
    this.closed = true;
    await this.flush();
  }

  get pendingCount(): number { return this.buffer.length; }
}
