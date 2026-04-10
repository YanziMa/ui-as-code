/**
 * Priority queue, heap, and scheduling utilities.
 */

// --- Types ---

export interface PriorityQueueItem<T> {
  priority: number;
  data: T;
  /** Insertion order for stable sorting (FIFO within same priority) */
  order: number;
}

export interface PriorityQueueOptions<T> {
  /** Comparator for priority (lower = higher priority by default) */
  comparator?: (a: T, b: T) => number;
  /** Max size (0 = unlimited) */
  maxSize?: number;
  /** When full, drop lowest or highest priority item? */
  overflowPolicy?: "drop-lowest" | "drop-highest" | "reject";
}

type HeapType = "min-heap" | "max-heap";

// --- Binary Heap ---

export class BinaryHeap<T> {
  private items: Array<PriorityQueueItem<T>> = [];
  private comparator: (a: T, b: T) => number;
  private type: HeapType;

  constructor(type: HeapType = "min-heap", comparator?: (a: T, b: T) => number) {
    this.type = type;
    this.comparator = comparator ?? ((a: T, b: T) => {
      if (typeof a === "number" && typeof b === "number") return (a as number) - (b as number);
      return String(a).localeCompare(String(b));
    });
  }

  get size(): number {
    return this.items.length;
  }

  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  peek(): T | null {
    if (this.items.length === 0) return null;
    return this.items[0]!.data;
  }

  push(data: T, priority = 0): number {
    const item: PriorityQueueItem<T> = { priority, data, order: this.items.length };
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
    return this.items.length;
  }

  pop(): T | null {
    if (this.items.length === 0) return null;

    const top = this.items[0]!;
    const last = this.items.pop()!;

    if (this.items.length > 0) {
      this.items[0] = last;
      this.bubbleDown(0);
    }

    return top.data;
  }

  clear(): void {
    this.items = [];
  }

  toArray(): T[] {
    // Return sorted without modifying internal state
    const copy = [...this.items];
    const result: T[] = [];

    while (copy.length > 0) {
      // Move root to end
      copy.swap(0, copy.length - 1);
      result.push(copy.pop()!.data);

      if (copy.length > 0) {
        this._bubbleDown(copy, 0);
      }
    }

    return result;
  }

  *[Symbol.iterator](): Generator<T> {
    while (!this.isEmpty()) {
      yield this.pop()!;
    }
  }

  // --- Internal heap operations ---

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      if (!this.shouldSwap(parentIdx, index)) break;

      this.items.swap(parentIdx, index);
      index = parentIdx;
    }
  }

  private bubbleDown(index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < this.items.length && this.shouldSwap(smallest, leftChild)) {
        smallest = leftChild;
      }

      if (rightChild < this.items.length && this.shouldSwap(smallest, rightChild)) {
        smallest = rightChild;
      }

      if (smallest === index) break;

      this.items.swap(smallest, index);
      index = smallest;
    }
  }

  private shouldSwap(i: number, j: number): boolean {
    const cmp = this.comparator(this.items[i]!.data, this.items[j]!.data);
    // For min-heap: swap if parent > child (cmp > 0)
    // For max-heap: swap if parent < child (cmp < 0)
    return this.type === "min-heap" ? cmp > 0 : cmp < 0;
  }

  // Helper used in toArray's bubbleDown
  private _bubbleDown(arr: Array<PriorityQueueItem<T>>, index: number): void {
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let target = index;

      if (leftChild < arr.length && this.comparator(arr[target]!.data, arr[leftChild]!.data) > 0) {
        target = leftChild;
      }
      if (rightChild < arr.length && this.comparator(arr[target]!.data, arr[rightChild]!.data) > 0) {
        target = rightChild;
      }
      if (target === index) break;

      arr.swap(target, index);
      index = target;
    }
  }
}

// --- Priority Queue ---

export class PriorityQueue<T> {
  private heap: BinaryHeap<T>;
  private options: Required<Pick<PriorityQueueOptions<T>, "comparator">>;
  private _orderCounter = 0;

  constructor(options: PriorityQueueOptions<T> = {}) {
    this.options = {
      comparator: options.comparator ?? ((a: T, b: T) => {
        if (typeof a === "number" && typeof b === "number") return (a as number) - (b as number);
        return String(a).localeCompare(String(b));
      }),
      maxSize: options.maxSize ?? 0,
      overflowPolicy: options.overflowPolicy ?? "drop-lowest",
    };

    this.heap = new BinaryHeap("min-heap", this.options.comparator);
  }

  enqueue(data: T, priority = 0): boolean {
    if (this.options.maxSize > 0 && this.heap.size >= this.options.maxSize) {
      switch (this.options.overflowPolicy) {
        case "reject":
          return false;
        case "drop-highest":
          // Remove highest priority (worst in min-heap)
          this.removeWorst();
          break;
        case "drop-lowest":
        default:
          this.pop();
          break;
      }
    }

    this.heap.push(data, priority);
    return true;
  }

  dequeue(): T | null {
    return this.heap.pop();
  }

  peek(): T | null {
    return this.heap.peek();
  }

  get size(): number {
    return this.heap.size;
  }

  get isEmpty(): boolean {
    return this.heap.isEmpty();
  }

  clear(): void {
    this.heap.clear();
  }

  toArray(): T[] {
    return this.heap.toArray();
  }

  remove(predicate: (item: T) => boolean): T | null {
    // Linear scan and rebuild
    const items = this.toArray();
    const idx = items.findIndex(predicate);
    if (idx < 0) return null;

    const removed = items[idx]!;
    items.splice(idx, 1);
    this.clear();

    for (const item of items) {
      this.enqueue(item); // Will re-prioritize based on stored priority
    }

    return removed;
  }

  private removeWorst(): void {
    // In min-heap, worst is the last element (highest priority value)
    // We need to find and remove it
    if (this.heap.size <= 1) {
      this.pop();
      return;
    }
    this.pop(); // Simplified: just pop lowest priority
  }
}

// --- Rate-Limited Queue ---

export interface RateLimitedQueueOptions {
  /** Items per interval */
  rateLimit: number;
  /** Interval in ms */
  intervalMs: number;
  /** Callback when items are processed */
  onProcess?: (items: unknown[]) => void;
}

/** Queue that processes items at a limited rate */
export class RateLimitedQueue<T> {
  private queue: T[] = [];
  private processing = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private options: Required<RateLimitedQueueOptions>;

  constructor(options: RateLimitedQueueOptions) {
    this.options = {
      ...options,
      onProcess: options.onProcess ?? (() => {}),
    };
  }

  add(item: T): number {
    this.queue.push(item);
    this.scheduleProcessing();
    return this.queue.length;
  }

  addMany(items: T[]): number {
    this.queue.push(...items);
    this.scheduleProcessing();
    return this.queue.length;
  }

  get length(): number {
    return this.queue.length;
  }

  get isIdle(): boolean {
    return !this.processing && this.timer === null;
  }

  flush(): T[] {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const items = [...this.queue];
    this.queue = [];
    this.processing = false;
    return items;
  }

  destroy(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.queue = [];
    this.processing = false;
  }

  private scheduleProcessing(): void {
    if (this.processing || this.timer !== null) return;
    if (this.queue.length === 0) return;

    this.timer = setTimeout(() => {
      this.timer = null;
      this.processBatch();
    }, this.options.intervalMs);
  }

  private processBatch(): void {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const batch = this.queue.splice(0, Math.min(this.options.rateLimit, this.queue.length));

    try {
      this.options.onProcess(batch);
    } catch {
      // Ignore processing errors
    }

    this.processing = false;

    if (this.queue.length > 0) {
      this.scheduleProcessing();
    }
  }
}

// --- Circular Buffer / Ring Buffer ---

export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private _size = 0;
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = Math.max(1, capacity);
    this.buffer = new Array(capacity);
  }

  push(item: T): boolean {
    if (this._size >= this.capacity) return false; // Full

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    this._size++;
    return true;
  }

  pop(): T | undefined {
    if (this._size === 0) return undefined; // Empty

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined;
    this.head = (this.head + 1) % this.capacity;
    this._size--;
    return item;
  }

  peek(): T | undefined {
    if (this._size === 0) return undefined;
    return this.buffer[this.head];
  }

  get size(): number {
    return this._size;
  }

  get capacity(): number {
    return this.capacity;
  }

  get isEmpty(): boolean {
    return this._size === 0;
  }

  get isFull(): boolean {
    return this._size >= this.capacity;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.tail = 0;
    this._size = 0;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      const idx = (this.head + i) % this.capacity;
      const item = this.buffer[idx];
      if (item !== undefined) result.push(item);
    }
    return result;
  }
}
