/**
 * queue-ds.ts — Comprehensive Queue, Stack, and Related Data Structures Library
 *
 * Pure TypeScript utility library with full generic type support.
 * No React/DOM dependencies. All exports are standalone data structure
 * implementations with JSDoc documentation, complexity annotations,
 * and iterator support where appropriate.
 *
 * @module queue-ds
 */

// ──────────────────────────────────────────────────────────────
//  1. QUEUE (Array-based)
// ──────────────────────────────────────────────────────────────

/**
 * A FIFO (First-In-First-Out) queue backed by a dynamic array.
 *
 * Enqueue appends to the tail; dequeue removes from the head.
 * For high-throughput scenarios where dequeue is frequent, consider
 * {@link LinkedListQueue} which offers O(1) head removal.
 *
 * Time Complexity:
 *   - enqueue:   O(1) amortized
 *   - dequeue:   O(n) worst-case (array shift)
 *   - peek:      O(1)
 *   - isEmpty:   O(1)
 *   - size:      O(1)
 *   - clear:     O(1)
 *   - toArray:   O(n)
 *   - reverse:   O(n)
 *
 * Space Complexity: O(n)
 */
export class ArrayQueue<T> {
  private _items: T[] = [];

  /** Create an optional initial queue from existing elements. */
  constructor(initialItems?: readonly T[]) {
    if (initialItems?.length) {
      this._items = [...initialItems];
    }
  }

  /**
   * Add an element to the back of the queue.
   * Time: O(1) amortized
   */
  enqueue(item: T): void {
    this._items.push(item);
  }

  /**
   * Remove and return the element at the front of the queue.
   * Returns `undefined` if the queue is empty.
   * Time: O(n) due to array shift; use LinkedListQueue for O(1).
   */
  dequeue(): T | undefined {
    return this._items.shift();
  }

  /**
   * Return the front element without removing it.
   * Returns `undefined` if the queue is empty.
   * Time: O(1)
   */
  peek(): T | undefined {
    return this._items[0];
  }

  /** Whether the queue contains no elements. Time: O(1) */
  isEmpty(): boolean {
    return this._items.length === 0;
  }

  /** Number of elements currently in the queue. Time: O(1) */
  get size(): number {
    return this._items.length;
  }

  /** Remove all elements. Time: O(1) */
  clear(): void {
    this._items = [];
  }

  /** Return a shallow copy of items as an array. Time: O(n) */
  toArray(): T[] {
    return [...this._items];
  }

  /** Reverse the queue in-place. Time: O(n) */
  reverse(): this {
    this._items.reverse();
    return this;
  }

  /** Iterate over elements in FIFO order. */
  [Symbol.iterator](): Iterator<T> {
    let idx = 0;
    const items = this._items;
    return {
      next(): IteratorResult<T> {
        if (idx < items.length) {
          return { done: false, value: items[idx++] };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
//  2. QUEUE (Linked List)
// ──────────────────────────────────────────────────────────────

/** Internal node for linked-list-based collections. */
interface ListNode<T> {
  value: T;
  next: ListNode<T> | null;
}

/**
 * A FIFO queue implemented as a singly-linked list with head/tail pointers.
 *
 * Both enqueue and dequeue are true O(1) operations because we maintain
 * direct references to both ends of the list.
 *
 * Time Complexity:
 *   - enqueue / dequeue / peek: O(1)
 *   - isEmpty / size:           O(1)
 *   - clear:                    O(1)
 *   - toArray:                  O(n)
 *   - reverse:                  O(n)
 *
 * Space Complexity: O(n) — one node per element + constant overhead
 */
export class LinkedListQueue<T> {
  private _head: ListNode<T> | null = null;
  private _tail: ListNode<T> | null = null;
  private _size: number = 0;

  constructor(initialItems?: readonly T[]) {
    if (initialItems?.length) {
      for (const item of initialItems) {
        this.enqueue(item);
      }
    }
  }

  /** Add to the tail. Time: O(1) */
  enqueue(item: T): void {
    const node: ListNode<T> = { value: item, next: null };
    if (!this._tail) {
      this._head = this._tail = node;
    } else {
      this._tail.next = node;
      this._tail = node;
    }
    this._size++;
  }

  /** Remove from the head. Returns `undefined` when empty. Time: O(1) */
  dequeue(): T | undefined {
    if (!this._head) return undefined;
    const value = this._head.value;
    this._head = this._head.next;
    if (!this._head) this._tail = null;
    this._size--;
    return value;
  }

  /** Peek at front without removal. Time: O(1) */
  peek(): T | undefined {
    return this._head?.value;
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  get size(): number {
    return this._size;
  }

  clear(): void {
    this._head = this._tail = null;
    this._size = 0;
  }

  toArray(): T[] {
    const result: T[] = [];
    let curr = this._head;
    while (curr) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }

  /** Reverse the list in-place. Time: O(n) */
  reverse(): this {
    let prev: ListNode<T> | null = null;
    let curr = this._head;
    let newTail = this._head;
    while (curr) {
      const next = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    this._tail = newTail;
    this._head = prev;
    return this;
  }

  [Symbol.iterator](): Iterator<T> {
    let curr = this._head;
    return {
      next(): IteratorResult<T> {
        if (curr) {
          const value = curr.value;
          curr = curr.next;
          return { done: false, value };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
//  3. STACK (Array-based)
// ──────────────────────────────────────────────────────────────

/**
 * A LIFO (Last-In-First-Out) stack backed by a dynamic array.
 *
 * Time Complexity:
 *   - push / pop / peek:  O(1) amortized
 *   - search:             O(n)
 *   - isEmpty / size:     O(1)
 *   - clear:              O(1)
 *   - toArray:            O(n)
 *   - reverse:            O(n)
 *
 * Space Complexity: O(n)
 */
export class ArrayStack<T> {
  private _items: T[] = [];

  constructor(initialItems?: readonly T[]) {
    if (initialItems?.length) {
      this._items = [...initialItems];
    }
  }

  /** Push item onto top of stack. Time: O(1) amortized */
  push(item: T): number {
    return this._items.push(item);
  }

  /** Pop and return top item, or `undefined` if empty. Time: O(1) amortized */
  pop(): T | undefined {
    return this._items.pop();
  }

  /** Return top item without removing it. Time: O(1) */
  peek(): T | undefined {
    return this._items[this._items.length - 1];
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }

  get size(): number {
    return this._items.length;
  }

  clear(): void {
    this._items = [];
  }

  toArray(): T[] {
    return [...this._items];
  }

  /** Return 1-based position from top, or -1 if not found. Time: O(n) */
  search(item: T): number {
    for (let i = this._items.length - 1; i >= 0; i--) {
      if (this._items[i] === item) {
        return this._items.length - i;
      }
    }
    return -1;
  }

  /** Reverse stack in-place. Time: O(n) */
  reverse(): this {
    this._items.reverse();
    return this;
  }

  [Symbol.iterator](): Iterator<T> {
    let idx = this._items.length - 1;
    const items = this._items;
    return {
      next(): IteratorResult<T> {
        if (idx >= 0) {
          return { done: false, value: items[idx--]! };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
//  4. STACK (Linked List)
// ──────────────────────────────────────────────────────────────

/**
 * LIFO stack using a singly-linked list where push/pop operate on the head.
 *
 * Every operation is guaranteed O(1) time with no amortization concerns.
 *
 * Time Complexity: All operations O(1) except toArray/reverse/search O(n)
 * Space Complexity: O(n)
 */
export class LinkedStack<T> {
  private _top: ListNode<T> | null = null;
  private _size: number = 0;

  constructor(initialItems?: readonly T[]) {
    if (initialItems?.length) {
      for (const item of initialItems) {
        this.push(item);
      }
    }
  }

  push(item: T): void {
    this._top = { value: item, next: this._top };
    this._size++;
  }

  pop(): T | undefined {
    if (!this._top) return undefined;
    const val = this._top.value;
    this._top = this._top.next;
    this._size--;
    return val;
  }

  peek(): T | undefined {
    return this._top?.value;
  }

  isEmpty(): boolean {
    return this._size === 0;
  }

  get size(): number {
    return this._size;
  }

  clear(): void {
    this._top = null;
    this._size = 0;
  }

  toArray(): T[] {
    const result: T[] = [];
    let curr = this._top;
    while (curr) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }

  search(item: T): number {
    let pos = 1;
    let curr = this._top;
    while (curr) {
      if (curr.value === item) return pos;
      curr = curr.next;
      pos++;
    }
    return -1;
  }

  reverse(): this {
    let prev: ListNode<T> | null = null;
    let curr = this._top;
    while (curr) {
      const next = curr.next;
      curr.next = prev;
      prev = curr;
      curr = next;
    }
    this._top = prev;
    return this;
  }

  [Symbol.iterator](): Iterator<T> {
    let curr = this._top;
    return {
      next(): IteratorResult<T> {
        if (curr) {
          const value = curr.value;
          curr = curr.next;
          return { done: false, value };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
//  5. DEQUE (Double-Ended Queue)
// ──────────────────────────────────────────────────────────────

/**
 * Double-ended queue supporting add/remove from both ends.
 * Backed by a dynamic array for simplicity; for true O(1) on both
 * ends consider a circular buffer implementation.
 *
 * Time Complexity:
 *   - addFront / addBack:       O(1) amortized
 *   - removeFront:              O(n) (shift); removeBack: O(1)
 *   - peekFront / peekBack:     O(1)
 *   - rotateLeft / rotateRight: O(n)
 *   - isPalindrome:             O(n)
 *
 * Space Complexity: O(n)
 */
export class Deque<T> {
  private _items: T[] = [];

  constructor(initialItems?: readonly T[]) {
    if (initialItems?.length) {
      this._items = [...initialItems];
    }
  }

  addFront(item: T): void {
    this._items.unshift(item);
  }

  addBack(item: T): void {
    this._items.push(item);
  }

  removeFront(): T | undefined {
    return this._items.shift();
  }

  removeBack(): T | undefined {
    return this._items.pop();
  }

  peekFront(): T | undefined {
    return this._items[0];
  }

  peekBack(): T | undefined {
    return this._items[this._items.length - 1];
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }

  get size(): number {
    return this._items.length;
  }

  clear(): void {
    this._items = [];
  }

  toArray(): T[] {
    return [...this._items];
  }

  /** Rotate left by n positions (front wraps to back). Time: O(n) */
  rotateLeft(n = 1): this {
    if (this._items.length === 0) return this;
    const k = ((n % this._items.length) + this._items.length) % this._items.length;
    this._items = this._items.slice(k).concat(this._items.slice(0, k));
    return this;
  }

  /** Rotate right by n positions (back wraps to front). Time: O(n) */
  rotateRight(n = 1): this {
    return this.rotateLeft(-n);
  }

  /**
   * Check whether the deque reads the same forwards and backwards.
   * Uses strict equality (`===`). Time: O(n)
   */
  isPalindrome(): boolean {
    const len = this._items.length;
    for (let i = 0; i < len >> 1; i++) {
      if (this._items[i] !== this._items[len - 1 - i]) return false;
    }
    return true;
  }

  [Symbol.iterator](): Iterator<T> {
    let idx = 0;
    const items = this._items;
    return {
      next(): IteratorResult<T> {
        if (idx < items.length) {
          return { done: false, value: items[idx++] };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
//  6. CIRCULAR BUFFER / RING BUFFER
// ──────────────────────────────────────────────────────────────

/** How to behave when the buffer is full and a write occurs. */
export enum OverwriteMode {
  /** Overwrite the oldest element (default). */
  OVERWRITE_OLDEST = 'overwrite-oldest',
  /** Reject the write and return false. */
  BLOCK = 'block',
  /** Grow capacity dynamically to accommodate. */
  GROW = 'grow',
}

/**
 * Fixed-size circular buffer with configurable overflow behavior.
 *
 * Read/write pointers wrap around the underlying storage array so that
 * no shifting or allocation occurs during normal operation.
 *
 * Time Complexity:
 *   - push / popFront / popBack: O(1)
 *   - peekFront / peekBack:      O(1)
 *   - get(index):                O(1)
 *   - toArray:                   O(n)
 *
 * Space Complexity: O(capacity)
 */
export class CircularBuffer<T> {
  private _buffer: (T | undefined)[];
  private _head: number = 0;
  private _tail: number = 0;
  private _count: number = 0;

  constructor(
    public capacity: number,
    public overwriteMode: OverwriteMode = OverwriteMode.OVERWRITE_OLDEST,
  ) {
    if (capacity <= 0) throw new Error('Capacity must be > 0');
    this._buffer = new Array<T | undefined>(capacity);
  }

  /**
   * Write a value to the back of the buffer.
   * Returns `true` if successful, `false` if blocked.
   */
  push(value: T): boolean {
    if (this._count === this.capacity) {
      switch (this.overwriteMode) {
        case OverwriteMode.BLOCK:
          return false;
        case OverwriteMode.GROW:
          this._grow();
          break;
        case OverwriteMode.OVERWRITE_OLDEST:
        default:
          // Advance head to discard oldest
          this._head = (this._head + 1) % this.capacity;
          this._count--;
          break;
      }
    }
    this._buffer[this._tail] = value;
    this._tail = (this._tail + 1) % this.capacity;
    this._count++;
    return true;
  }

  /** Remove and return the front element, or `undefined` if empty. */
  popFront(): T | undefined {
    if (this._count === 0) return undefined;
    const val = this._buffer[this._head];
    this._buffer[this._head] = undefined;
    this._head = (this._head + 1) % this.capacity;
    this._count--;
    return val;
  }

  /** Remove and return the back element, or `undefined` if empty. */
  popBack(): T | undefined {
    if (this._count === 0) return undefined;
    this._tail = (this._tail - 1 + this.capacity) % this.capacity;
    const val = this._buffer[this._tail];
    this._buffer[this._tail] = undefined;
    this._count--;
    return val;
  }

  peekFront(): T | undefined {
    return this._count === 0 ? undefined : this._buffer[this._head];
  }

  peekBack(): T | undefined {
    return this._count === 0 ? undefined : this._buffer[(this._tail - 1 + this.capacity) % this.capacity];
  }

  /** Access by logical index (0 = front). Time: O(1) */
  get(index: number): T | undefined {
    if (index < 0 || index >= this._count) return undefined;
    return this._buffer[(this._head + index) % this.capacity];
  }

  isEmpty(): boolean {
    return this._count === 0;
  }

  get isFull(): boolean {
    return this._count === this.capacity;
  }

  get size(): number {
    return this._count;
  }

  clear(): void {
    this._buffer.fill(undefined);
    this._head = this._tail = this._count = 0;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._count; i++) {
      const v = this.get(i);
      if (v !== undefined) result.push(v);
    }
    return result;
  }

  private _grow(): void {
    const newCap = this.capacity * 2;
    const newBuf = new Array<T | undefined>(newCap);
    for (let i = 0; i < this._count; i++) {
      newBuf[i] = this._buffer[(this._head + i) % this.capacity];
    }
    this._buffer = newBuf;
    this.capacity = newCap;
    this._head = 0;
    this._tail = this._count;
  }

  [Symbol.iterator](): Iterator<T> {
    let idx = 0;
    const buf = this;
    return {
      next(): IteratorResult<T> {
        if (idx < buf.size) {
          return { done: false, value: buf.get(idx++)! };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
//  7. PRIORITY QUEUE (Binary Heap)
// ──────────────────────────────────────────────────────────────

/** Heap ordering direction. */
export enum HeapOrder {
  MIN = 'min',
  MAX = 'max',
}

/**
 * Priority queue backed by a binary heap (array representation).
 * Supports min-heap and max-heap modes, decrease-key, and bulk build-heap.
 *
 * Time Complexity:
 *   - insert:           O(log n)
 *   - extractTop:       O(log n)
 *   - peek:             O(1)
 *   - decreaseKey:      O(log n)
 *   - buildHeap(array): O(n)
 *   - size/isEmpty:     O(1)
 *
 * Space Complexity: O(n)
 */
export class PriorityQueue<T> {
  private _heap: { elem: T; priority: number }[];
  private _order: HeapOrder;

  constructor(order: HeapOrder = HeapOrder.MIN, initial?: Array<{ elem: T; priority: number }>) {
    this._order = order;
    this._heap = initial ? [...initial] : [];
    if (this._heap.length > 1) {
      this._heapify();
    }
  }

  /** Insert an element with given numeric priority. Time: O(log n) */
  insert(elem: T, priority: number): void {
    this._heap.push({ elem, priority });
    this._bubbleUp(this._heap.length - 1);
  }

  /** Remove and return the top-priority element. Time: O(log n) */
  extractTop(): T | undefined {
    if (this._heap.length === 0) return undefined;
    const top = this._heap[0]!.elem;
    const last = this._heap.pop()!;
    if (this._heap.length > 0) {
      this._heap[0] = last;
      this._bubbleDown(0);
    }
    return top;
  }

  /** Return top element without removal. Time: O(1) */
  peek(): T | undefined {
    return this._heap[0]?.elem;
  }

  /**
   * Decrease (for min-heap) or increase (for max-heap) the priority
   * of the first matching element found. Returns `true` if updated.
   * Time: O(n log n) for lookup + O(log n) for heap fixup.
   */
  updatePriority(elem: T, newPriority: number): boolean {
    for (let i = 0; i < this._heap.length; i++) {
      if (this._heap[i]!.elem === elem) {
        const oldPriority = this._heap[i]!.priority;
        this._heap[i]!.priority = newPriority;
        if (
          (this._order === HeapOrder.MIN && newPriority < oldPriority) ||
          (this._order === HeapOrder.MAX && newPriority > oldPriority)
        ) {
          this._bubbleUp(i);
        } else {
          this._bubbleDown(i);
        }
        return true;
      }
    }
    return false;
  }

  isEmpty(): boolean {
    return this._heap.length === 0;
  }

  get size(): number {
    return this._heap.length;
  }

  clear(): void {
    this._heap = [];
  }

  /** Build a valid heap from the current internal array in O(n). */
  private _heapify(): void {
    for (let i = Math.floor(this._heap.length / 2) - 1; i >= 0; i--) {
      this._bubbleDown(i);
    }
  }

  /** Static helper: build a PriorityQueue from an unsorted array in O(n). */
  static fromArray<T>(
    entries: Array<{ elem: T; priority: number }>,
    order: HeapOrder = HeapOrder.MIN,
  ): PriorityQueue<T> {
    return new PriorityQueue(order, entries);
  }

  private _compare(a: number, b: number): boolean {
    return this._order === HeapOrder.MIN ? a < b : a > b;
  }

  private _bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this._compare(this._heap[idx]!.priority, this._heap[parent]!.priority)) {
        [this._heap[idx], this._heap[parent]] = [this._heap[parent]!, this._heap[idx]!];
        idx = parent;
      } else break;
    }
  }

  private _bubbleDown(idx: number): void {
    const len = this._heap.length;
    while (true) {
      let extreme = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (left < len && this._compare(this._heap[left]!.priority, this._heap[extreme]!.priority))
        extreme = left;
      if (right < len && this._compare(this._heap[right]!.priority, this._heap[extreme]!.priority))
        extreme = right;
      if (extreme !== idx) {
        [this._heap[idx], this._heap[extreme]] = [this._heap[extreme]!, this._heap[idx]!];
        idx = extreme;
      } else break;
    }
  }

  [Symbol.iterator](): Iterator<T> {
    // Yields in arbitrary heap order; for sorted order use repeated extractTop.
    let idx = 0;
    const heap = this._heap;
    return {
      next(): IteratorResult<T> {
        if (idx < heap.length) {
          return { done: false, value: heap[idx++]!.elem };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
//  8. MIN-MAX STACK
// ──────────────────────────────────────────────────────────────

/**
 * Stack that can retrieve the current minimum and maximum values in O(1)
 * time using the monotonic auxiliary-stack pattern.
 *
 * Each main-stack entry carries the running min/max at that depth,
 * so queries are instant at the cost of O(1) extra space per element.
 *
 * Time Complexity: All operations O(1)
 * Space Complexity: O(n)
 */
export class MinMaxStack<T> {
  private _stack: { value: T; min: T; max: T }[] = [];

  constructor(private readonly _comparator: (a: T, b: T) => number) {}

  push(value: T): void {
    if (this._stack.length === 0) {
      this._stack.push({ value, min: value, max: value });
    } else {
      const top = this._stack[this._stack.length - 1]!;
      this._stack.push({
        value,
        min: this._comparator(value, top.min) <= 0 ? value : top.min,
        max: this._comparator(value, top.max) >= 0 ? value : top.max,
      });
    }
  }

  pop(): T | undefined {
    const entry = this._stack.pop();
    return entry?.value;
  }

  peek(): T | undefined {
    return this._stack[this._stack.length - 1]?.value;
  }

  /** Current minimum in the stack. Time: O(1) */
  getMin(): T | undefined {
    return this._stack[this._stack.length - 1]?.min;
  }

  /** Current maximum in the stack. Time: O(1) */
  getMax(): T | undefined {
    return this._stack[this._stack.length - 1]?.max;
  }

  isEmpty(): boolean {
    return this._stack.length === 0;
  }

  get size(): number {
    return this._stack.length;
  }

  clear(): void {
    this._stack = [];
  }

  toArray(): T[] {
    return this._stack.map((e) => e.value);
  }

  [Symbol.iterator](): Iterator<T> {
    let idx = this._stack.length - 1;
    const s = this._stack;
    return {
      next(): IteratorResult<T> {
        if (idx >= 0) {
          return { done: false, value: s[idx--]!.value };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
//  9. LRU CACHE (Linked HashMap + Doubly-Linked List)
// ──────────────────────────────────────────────────────────────

interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

/**
 * Least-Recently-Used cache with O(1) get/set/delete.
 *
 * Internally uses a JavaScript Map (which preserves insertion order and
 * provides O(1) key lookup) combined with move-to-front semantics to
 * track recency. For a pure doubly-linked-list + hashmap version see
 * alternative implementations; Map's reordering makes this idiomatic TS.
 *
 * Time Complexity: All operations O(1) amortized
 * Space Complexity: O(capacity)
 */
export class LRUCache<K, V> {
  private _cache: Map<K, V>;
  public readonly capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error('LRU capacity must be > 0');
    this.capacity = capacity;
    this._cache = new Map<K, V>();
  }

  /**
   * Get value by key, marking it as most-recently-used.
   * Returns `undefined` if key is absent.
   * Time: O(1)
   */
  get(key: K): V | undefined {
    if (!this._cache.has(key)) return undefined;
    const value = this._cache.get(key)!;
    // Move to end (most recently used)
    this._cache.delete(key);
    this._cache.set(key, value);
    return value;
  }

  /**
   * Set key/value. If over capacity, evicts the least-recently-used entry.
   * Time: O(1)
   */
  set(key: K, value: V): void {
    if (this._cache.has(key)) {
      this._cache.delete(key);
    } else if (this._cache.size >= this.capacity) {
      // Evict least-recently-used (first entry in insertion-order map)
      const firstKey = this._cache.keys().next().value;
      this._cache.delete(firstKey);
    }
    this._cache.set(key, value);
  }

  /** Delete a specific key. Returns `true` if existed. Time: O(1) */
  delete(key: K): boolean {
    return this._cache.delete(key);
  }

  /** Check existence without affecting recency. Time: O(1) */
  has(key: K): boolean {
    return this._cache.has(key);
  }

  /** Clear all entries. Time: O(1) */
  clear(): void {
    this._cache.clear();
  }

  get size(): number {
    return this._cache.size;
  }

  /** Return entries ordered least → most recently used. */
  toArray(): Array<[K, V]> {
    return [...this._cache.entries()];
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this._cache[Symbol.iterator]();
  }
}

// ──────────────────────────────────────────────────────────────
// 10. TRIE (Prefix Tree)
// ──────────────────────────────────────────────────────────────

interface TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  prefixCount: number; // how many words pass through this node
}

/**
 * Prefix tree (trie) for efficient string insert/search/autocomplete.
 *
 * Time Complexity:
 *   - insert:         O(L)  where L = word length
 *   - search:         O(L)
 *   - startsWith:     O(L)
 *   - delete:         O(L)
 *   - autocomplete:   O(L + k·m)  k = suggestions, m = avg length
 *   - wildcardSearch: O(N · Σ^W)  worst case with wildcards
 *
 * Space Complexity: O(ALPHABET_SIZE × total_characters)
 */
export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = { children: new Map(), isEndOfWord: false, prefixCount: 0 };
  }

  /** Insert a word into the trie. Time: O(L) */
  insert(word: string): void {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) {
        node.children.set(ch, { children: new Map(), isEndOfWord: false, prefixCount: 0 });
      }
      node = node.children.get(ch)!;
      node.prefixCount++;
    }
    node.isEndOfWord = true;
  }

  /** Check exact word existence. Time: O(L) */
  search(word: string): boolean {
    const node = this._findNode(word);
    return node?.isEndOfWord ?? false;
  }

  /** Check if any word in the trie starts with the prefix. Time: O(L) */
  startsWith(prefix: string): boolean {
    return this._findNode(prefix) !== undefined;
  }

  /** Count how many words share this prefix. Time: O(L) */
  countWordsWithPrefix(prefix: string): number {
    const node = this._findNode(prefix);
    return node?.prefixCount ?? 0;
  }

  /**
   * Delete a word from the trie. Cleans up unused nodes.
   * Returns `true` if the word was present and removed.
   * Time: O(L)
   */
  delete(word: string): boolean {
    const path: Array<{ node: TrieNode; char: string }> = [];
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) return false;
      path.push({ node, char: ch });
      node = node.children.get(ch)!;
    }
    if (!node.isEndOfWord) return false;
    node.isEndOfWord = false;

    // Decrement prefix counts and prune dead nodes
    for (let i = path.length - 1; i >= 0; i--) {
      const childNode = path[i]!.node.children.get(path[i]!.char)!;
      childNode.prefixCount--;
      if (childNode.prefixCount === 0 && !childNode.isEndOfWord) {
        path[i]!.node.children.delete(path[i]!.char);
      }
    }
    return true;
  }

  /**
   * Return up to `limit` words with the given prefix, sorted lexicographically.
   * Time: O(L + k·m)
   */
  autocomplete(prefix: string, limit = 10): string[] {
    const startNode = this._findNode(prefix);
    if (!startNode) return [];

    const results: string[] = [];
    const dfs = (currentNode: TrieNode, path: string): void => {
      if (results.length >= limit) return;
      if (currentNode.isEndOfWord) results.push(path);
      // Iterate keys in sorted order for deterministic output
      const keys = [...currentNode.children.keys()].sort();
      for (const ch of keys) {
        dfs(currentNode.children.get(ch)!, path + ch);
      }
    };
    dfs(startNode, prefix);
    return results;
  }

  /**
   * Search with single-character wildcard support ('.' matches any char).
   * Time: O(N · ALPHABET_SIZE^dots) worst case
   */
  wildcardSearch(pattern: string): boolean {
    return this._wildcardDfs(this.root, pattern, 0);
  }

  private _wildcardDfs(node: TrieNode, pattern: string, idx: number): boolean {
    if (idx === pattern.length) return node.isEndOfWord;
    const ch = pattern[idx];
    if (ch === '.') {
      for (const child of node.children.values()) {
        if (this._wildcardDfs(child, pattern, idx + 1)) return true;
      }
      return false;
    }
    const child = node.children.get(ch);
    return child ? this._wildcardDfs(child, pattern, idx + 1) : false;
  }

  private _findNode(str: string): TrieNode | undefined {
    let node = this.root;
    for (const ch of str) {
      const child = node.children.get(ch);
      if (!child) return undefined;
      node = child;
    }
    return node;
  }
}

// ──────────────────────────────────────────────────────────────
// 11. BLOOM FILTER
// ──────────────────────────────────────────────────────────────

/**
 * Probabilistic set membership test with configurable false-positive rate.
 *
 * A Bloom filter may return false positives (says "maybe" when the item
 * was never added), but never false negatives (never says "no" for an
 * added item). Memory usage is fixed regardless of element count.
 *
 * Time Complexity:
 *   - add:    O(k)  where k = number of hash functions
 *   - test:   O(k)
 *   - memory: O(m) bits where m depends on desired n & error rate
 *
 * Space Complexity: O(m) bits (compact bit vector)
 */
export class BloomFilter {
  private _bits: Uint8Array;
  private _hashCount: number;
  private _size: number;

  /**
   * @param expectedElements  Approximate number of elements to store
   * @param falsePositiveRate Desired upper bound on false positive probability (0–1)
   */
  constructor(expectedElements: number, falsePositiveRate: number) {
    if (expectedElements <= 0 || falsePositiveRate <= 0 || falsePositiveRate >= 1) {
      throw new Error('Invalid bloom filter parameters');
    }
    // Optimal bit-array size: m = -(n ln p) / (ln 2)^2
    const ln2 = Math.LN2;
    const m = Math.ceil(-(expectedElements * Math.log(falsePositiveRate)) / (ln2 * ln2));
    // Optimal hash function count: k = (m/n) ln 2
    const k = Math.round((m / expectedElements) * ln2);

    this._size = m;
    this._hashCount = Math.max(1, k);
    this._bits = new Uint8Array(Math.ceil(m / 8));
  }

  /** Add an element to the filter. Time: O(k) */
  add(element: string): void {
    for (let i = 0; i < this._hashCount; i++) {
      const hash = this._hash(element, i);
      const byteIdx = Math.floor(hash / 8);
      const bitIdx = hash % 8;
      if (byteIdx < this._bits.length) {
        this._bits[byteIdx] |= 1 << bitIdx;
      }
    }
  }

  /**
   * Test probable membership.
   * Returns `false` only if the element definitely was NOT added.
   * Returns `true`  if it MAY have been added (possible false positive).
   * Time: O(k)
   */
  test(element: string): boolean {
    for (let i = 0; i < this._hashCount; i++) {
      const hash = this._hash(element, i);
      const byteIdx = Math.floor(hash / 8);
      const bitIdx = hash % 8;
      if (byteIdx >= this._bits.length || !(this._bits[byteIdx] & (1 << bitIdx))) {
        return false;
      }
    }
    return true;
  }

  /** Estimated current false positive rate based on inserted count. */
  estimatedFPR(insertedCount: number): number {
    return Math.pow(
      1 - Math.pow(1 - 1 / this._size, this._hashCount * insertedCount),
      this._hashCount,
    );
  }

  /** Number of hash functions being used. */
  get hashCount(): number {
    return this._hashCount;
  }

  /** Bit-vector length. */
  get bitSize(): number {
    return this._size;
  }

  /** Simple double-hashing scheme for generating k distinct hash values. */
  private _hash(str: string, seed: number): number {
    let hash1 = 5381;
    let hash2 = 65537;
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i);
      hash1 = ((hash1 << 5) + hash1 + c) | 0;
      hash2 = ((hash2 << 5) + hash2 + c * (seed + 1)) | 0;
    }
    return Math.abs((hash1 + seed * hash2) % this._size);
  }
}

// ──────────────────────────────────────────────────────────────
// 12. SKIP LIST
// ──────────────────────────────────────────────────────────────

interface SkipListNode<T> {
  value: T;
  forward: (SkipListNode<T> | null)[];
  level: number;
}

const SKIP_LIST_P = 0.5;
const SKIP_LIST_MAX_LEVEL = 16;

/**
 * Probabilistic skip list — a sorted multi-level linked list offering
 * average-case O(log n) search, insert, and delete with simpler code
 * than balanced trees.
 *
 * Time Complexity (average):
 *   - search / insert / delete: O(log n)
 *   - space:                   O(n log n) average
 *
 * Space Complexity: O(n log n) average
 */
export class SkipList<T> {
  private _head: SkipListNode<T>;
  private _level: number;
  private _length: number;
  private readonly _compare: (a: T, b: T) => number;

  constructor(comparator?: (a: T, b: T) => number) {
    this._compare = comparator ?? ((a: T, b: T) => (a as unknown as number) - (b as unknown as number));
    this._level = 1;
    this._length = 0;
    // Sentinel head node
    this._head = {
      value: undefined as unknown as T,
      forward: new Array(SKIP_LIST_MAX_LEVEL + 1).fill(null),
      level: SKIP_LIST_MAX_LEVEL,
    };
  }

  /** Random level generator using geometric distribution. */
  private _randomLevel(): number {
    let lvl = 1;
    while (Math.random() < SKIP_LIST_P && lvl < SKIP_LIST_MAX_LEVEL) lvl++;
    return lvl;
  }

  /** Search for a value. Returns the node or `undefined`. Avg: O(log n) */
  search(value: T): T | undefined {
    let curr = this._head;
    for (let i = this._level; i >= 1; i--) {
      while (curr.forward[i] && this._compare(curr.forward[i]!.value, value) < 0) {
        curr = curr.forward[i]!;
      }
    }
    curr = curr.forward[1]!;
    return curr && this._compare(curr.value, value) === 0 ? curr.value : undefined;
  }

  /** Insert a value (duplicates allowed unless you check first). Avg: O(log n) */
  insert(value: T): void {
    const update: (SkipListNode<T> | null)[] = new Array(SKIP_LIST_MAX_LEVEL + 1).fill(null);
    let curr = this._head;

    for (let i = this._level; i >= 1; i--) {
      while (curr.forward[i] && this._compare(curr.forward[i]!.value, value) < 0) {
        curr = curr.forward[i]!;
      }
      update[i] = curr;
    }

    const newNodeLevel = this._randomLevel();
    if (newNodeLevel > this._level) {
      for (let i = this._level + 1; i <= newNodeLevel; i++) {
        update[i] = this._head;
      }
      this._level = newNodeLevel;
    }

    const newNode: SkipListNode<T> = {
      value,
      forward: new Array(SKIP_LIST_MAX_LEVEL + 1).fill(null),
      level: newNodeLevel,
    };

    for (let i = 1; i <= newNodeLevel; i++) {
      newNode.forward[i] = update[i]!.forward[i];
      update[i]!.forward[i] = newNode;
    }
    this._length++;
  }

  /** Delete the first occurrence of value. Returns `true` if removed. Avg: O(log n) */
  delete(value: T): boolean {
    const update: (SkipListNode<T> | null)[] = new Array(SKIP_LIST_MAX_LEVEL + 1).fill(null);
    let curr = this._head;

    for (let i = this._level; i >= 1; i--) {
      while (curr.forward[i] && this._compare(curr.forward[i]!.value, value) < 0) {
        curr = curr.forward[i]!;
      }
      update[i] = curr;
    }

    const target = curr.forward[1];
    if (!target || this._compare(target.value, value) !== 0) return false;

    for (let i = 1; i <= this._level; i++) {
      if (update[i]!.forward[i] !== target) break;
      update[i]!.forward[i] = target.forward[i];
    }

    while (this._level > 1 && !this._head.forward[this._level]) {
      this._level--;
    }
    this._length--;
    return true;
  }

  isEmpty(): boolean {
    return this._length === 0;
  }

  get size(): number {
    return this._length;
  }

  /** Collect all values in sorted order. Time: O(n) */
  toArray(): T[] {
    const result: T[] = [];
    let curr = this._head.forward[1];
    while (curr) {
      result.push(curr.value);
      curr = curr.forward[1];
    }
    return result;
  }

  clear(): void {
    this._head.forward.fill(null);
    this._level = 1;
    this._length = 0;
  }

  [Symbol.iterator](): Iterator<T> {
    let curr = this._head.forward[1];
    return {
      next(): IteratorResult<T> {
        if (curr) {
          const value = curr.value;
          curr = curr.forward[1];
          return { done: false, value };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }
}

// ──────────────────────────────────────────────────────────────
// 13. DISJOINT SET UNION-FIND (Union-Find)
// ──────────────────────────────────────────────────────────────

/**
 * Union-Find (Disjoint Set Union) data structure with path compression
 * and union-by-rank optimizations.
 *
 * Supports near-constant amortized time per operation (inverse Ackermann).
 *
 * Time Complexity (amortized):
 *   - find:     α(n) ≈ O(1)
 *   - union:    α(n) ≈ O(1)
 *   - connected:α(n) ≈ O(1)
 *
 * Space Complexity: O(n)
 */
export class UnionFind {
  private parent: number[];
  private rank: number[];
  private _count: number;

  /** Initialize with `n` isolated elements labelled 0 … n-1. */
  constructor(public readonly size: number) {
    if (size < 0) throw new Error('UnionFind size must be >= 0');
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
    this._count = size;
  }

  /**
   * Find the root representative of `x`, with path compression.
   * Time: α(n) amortized
   */
  find(x: number): number {
    if (x < 0 || x >= this.size) throw new RangeError(`Index ${x} out of bounds`);
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // recursive path compression
    }
    return this.parent[x];
  }

  /**
   * Union the sets containing `a` and `b`.
   * Returns `true` if they were in different sets (merge happened).
   * Time: α(n) amortized
   */
  union(a: number, b: number): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;

    // Union by rank
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
    } else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
    this._count--;
    return true;
  }

  /** Check whether two elements are in the same set. Time: α(n) */
  connected(a: number, b: number): boolean {
    return this.find(a) === this.find(b);
  }

  /** Number of disjoint sets remaining. */
  get count(): number {
    return this._count;
  }

  /** Reset to initial state (all elements isolated). */
  reset(): void {
    for (let i = 0; i < this.size; i++) {
      this.parent[i] = i;
      this.rank[i] = 0;
    }
    this._count = this.size;
  }
}
