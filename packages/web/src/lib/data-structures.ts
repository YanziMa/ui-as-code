/**
 * Data Structures: LinkedList, DoublyLinkedList, Stack, Queue, BinaryHeap,
 * Trie (prefix tree), LRU Cache, Bloom Filter, Ring Buffer.
 */

// --- Types ---

export interface ListNode<T> {
  value: T;
  next: ListNode<T> | null;
}

export interface DListNode<T> {
  value: T;
  prev: DListNode<T> | null;
  next: DListNode<T> | null;
}

// --- Singly Linked List ---

export class LinkedList<T> {
  private head: ListNode<T> | null = null;
  private tail: ListNode<T> | null = null;
  private _size = 0;

  get size(): number { return this._size; }
  get first(): T | undefined { return this.head?.value; }
  get last(): T | undefined { return this.tail?.value; }

  /** Append value to end */
  push(value: T): number {
    const node: ListNode<T> = { value, next: null };
    if (!this.tail) {
      this.head = this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    return ++this._size;
  }

  /** Remove and return last value */
  pop(): T | undefined {
    if (!this.head) return undefined;
    if (this.head === this.tail) {
      const val = this.head.value;
      this.head = this.tail = null;
      this._size = 0;
      return val;
    }
    let current = this.head!;
    while (current.next !== this.tail) current = current.next!;
    const val = this.tail!.value;
    current.next = null;
    this.tail = current;
    this._size--;
    return val;
  }

  /** Prepend value */
  unshift(value: T): number {
    const node: ListNode<T> = { value, next: this.head };
    this.head = node;
    if (!this.tail) this.tail = node;
    return ++this._size;
  }

  /** Remove and return first value */
  shift(): T | undefined {
    if (!this.head) return undefined;
    const val = this.head.value;
    this.head = this.head.next;
    if (!this.head) this.tail = null;
    this._size--;
    return val;
  }

  /** Get value at index (O(n)) */
  get(index: number): T | undefined {
    if (index < 0 || index >= this._size) return undefined;
    let current = this.head;
    for (let i = 0; i < index; i++) current = current!.next;
    return current!.value;
  }

  /** Set value at index */
  set(index: number, value: T): boolean {
    if (index < 0 || index >= this._size) return false;
    let current = this.head;
    for (let i = 0; i < index; i++) current = current!.next;
    current!.value = value;
    return true;
  }

  /** Insert at index */
  insert(index: number, value: T): boolean {
    if (index < 0 || index > this._size) return false;
    if (index === 0) { this.unshift(value); return true; }
    if (index === this._size) { this.push(value); return true; }
    let current = this.head;
    for (let i = 0; i < index - 1; i++) current = current!.next;
    const node: ListNode<T> = { value, next: current!.next };
    current!.next = node;
    this._size++;
    return true;
  }

  /** Remove first occurrence of value */
  remove(value: T): boolean {
    if (!this.head) return false;
    if (this.head.value === value) { this.shift(); return true; }
    let prev = this.head;
    while (prev.next && prev.next.value !== value) prev = prev.next;
    if (!prev.next) return false;
    if (prev.next === this.tail) this.tail = prev;
    prev.next = prev.next.next;
    this._size--;
    return true;
  }

  /** Remove at index */
  removeAt(index: number): T | undefined {
    if (index < 0 || index >= this._size) return undefined;
    if (index === 0) return this.shift();
    let prev = this.head;
    for (let i = 0; i < index - 1; i++) prev = prev!.next;
    const removed = prev!.next!;
    if (removed === this.tail) this.tail = prev;
    prev!.next = removed.next;
    this._size--;
    return removed.value;
  }

  /** Find index of value */
  indexOf(value: T): number {
    let current = this.head;
    for (let i = 0; i < this._size; i++) {
      if (current!.value === value) return i;
      current = current!.next;
    }
    return -1;
  }

  /** Check if contains value */
  contains(value: T): boolean { return this.indexOf(value) >= 0; }

  /** Convert to array */
  toArray(): T[] {
    const arr: T[] = [];
    let current = this.head;
    while (current) { arr.push(current.value); current = current.next; }
    return arr;
  }

  /** Reverse in place */
  reverse(): void {
    let prev: ListNode<T> | null = null;
    let current = this.head;
    this.tail = this.head;
    while (current) {
      const next = current.next;
      current.next = prev;
      prev = current;
      current = next;
    }
    this.head = prev;
  }

  /** Clear all nodes */
  clear(): void { this.head = this.tail = null; this._size = 0; }

  /** Iterate using for...of */
  [Symbol.iterator](): Iterator<T> {
    let current = this.head;
    return {
      next(): IteratorResult<T> {
        if (!current) return { done: true, value: undefined as unknown as T };
        const val = current.value;
        current = current.next;
        return { done: false, value: val };
      },
    };
  }
}

// --- Doubly Linked List ---

export class DoublyLinkedList<T> {
  private head: DListNode<T> | null = null;
  private tail: DListNode<T> | null = null;
  private _size = 0;

  get size(): number { return this._size; }
  get first(): T | undefined { return this.head?.value; }
  get last(): T | undefined { return this.tail?.value; }

  push(value: T): number {
    const node: DListNode<T> = { value, prev: this.tail, next: null };
    if (!this.tail) { this.head = this.tail = node; }
    else { this.tail.next = node; this.tail = node; }
    return ++this._size;
  }

  pop(): T | undefined {
    if (!this.tail) return undefined;
    const val = this.tail.value;
    this.tail = this.tail.prev;
    if (this.tail) this.tail.next = null;
    else this.head = null;
    this._size--;
    return val;
  }

  unshift(value: T): number {
    const node: DListNode<T> = { value, prev: null, next: this.head };
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
    return ++this._size;
  }

  shift(): T | undefined {
    if (!this.head) return undefined;
    const val = this.head.value;
    this.head = this.head.next;
    if (this.head) this.head.prev = null;
    else this.tail = null;
    this._size--;
    return val;
  }

  toArray(): T[] {
    const arr: T[] = [];
    let current = this.head;
    while (current) { arr.push(current.value); current = current.next; }
    return arr;
  }

  clear(): void { this.head = this.tail = null; this._size = 0; }

  [Symbol.iterator](): Iterator<T> {
    let current = this.head;
    return {
      next(): IteratorResult<T> {
        if (!current) return { done: true, value: undefined as unknown as T };
        const val = current.value;
        current = current.next;
        return { done: false, value: val };
      },
    };
  }
}

// --- Stack ---

export class Stack<T> {
  private items: T[] = [];

  get size(): number { return this.items.length; }
  get isEmpty(): boolean { return this.items.length === 0; }
  get peek(): T | undefined { return this.items[this.items.length - 1]; }

  push(item: T): number { return this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  clear(): void { this.items = []; }
  toArray(): T[] { return [...this.items]; }
  clone(): Stack<T> { const s = new Stack<T>(); s.items = [...this.items]; return s; }
  contains(item: T): boolean { return this.items.includes(item); }
}

// --- Queue ---

export class Queue<T> {
  private items: T[] = [];

  get size(): number { return this.items.length; }
  get isEmpty(): boolean { return this.items.length === 0; }
  get peek(): T | undefined { return this.items[0]; }

  enqueue(item: T): number { return this.items.push(item); }
  dequeue(): T | undefined { return this.items.shift(); }
  clear(): void { this.items = []; }
  toArray(): T[] { return [...this.items]; }
  contains(item: T): boolean { return this.items.includes(item); }
}

// --- Binary Heap (Min/Max) ---

export type HeapType = "min" | "max";

export interface HeapEntry<T> {
  priority: number;
  value: T;
}

export class BinaryHeap<T> {
  private heap: HeapEntry<T>[] = [];
  private readonly type: HeapType;

  constructor(type: HeapType = "min") { this.type = type; }

  get size(): number { return this.heap.length; }
  get isEmpty(): boolean { return this.heap.length === 0; }
  get peek(): T | undefined { return this.heap[0]?.value; }

  push(priority: number, value: T): void {
    this.heap.push({ priority, value });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length <= 1) return this.heap.pop()?.value;
    const top = this.heap[0].value;
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return top;
  }

  /** Update priority of an existing entry (by reference equality on value) */
  updatePriority(value: T, newPriority: number): boolean {
    const idx = this.heap.findIndex((e) => e.value === value);
    if (idx < 0) return false;
    const old = this.heap[idx]!.priority;
    this.heap[idx]!.priority = newPriority;
    if (newPriority < old) this.bubbleUp(idx);
    else this.bubbleDown(idx);
    return true;
  }

  contains(value: T): boolean { return this.heap.some((e) => e.value === value); }
  clear(): void { this.heap = []; }
  toArray(): T[] { return this.heap.map((e) => e.value); }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.compare(idx, parent) < 0) {
        this.swap(idx, parent);
        idx = parent;
      } else break;
    }
  }

  private bubbleDown(idx: number): void {
    const len = this.heap.length;
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;
      if (left < len && this.compare(left, smallest) < 0) smallest = left;
      if (right < len && this.compare(right, smallest) < 0) smallest = right;
      if (smallest !== idx) { this.swap(idx, smallest); idx = smallest; }
      else break;
    }
  }

  private compare(a: number, b: number): number {
    const diff = this.heap[a]!.priority - this.heap[b]!.priority;
    return this.type === "min" ? diff : -diff;
  }

  private swap(a: number, b: number): void {
    [this.heap[a], this.heap[b]] = [this.heap[b]!, this.heap[a]!];
  }
}

// --- Trie (Prefix Tree) ---

export interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  value?: string;
}

export class Trie {
  private root: TrieNode = { children: new Map(), isEnd: false };

  /** Insert a word into the trie */
  insert(word: string, value?: string): void {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), isEnd: false });
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
    if (value !== undefined) node.value = value;
  }

  /** Check if a word exists in the trie */
  search(word: string): boolean {
    const node = this.findNode(word);
    return node?.isEnd ?? false;
  }

  /** Get stored value for a word */
  getValue(word: string): string | undefined {
    return this.findNode(word)?.value;
  }

  /** Check if any word starts with prefix */
  startsWith(prefix: string): boolean {
    return !!this.findNode(prefix);
  }

  /** Get all words with given prefix */
  autocomplete(prefix: string, limit?: number): string[] {
    const node = this.findNode(prefix);
    if (!node) return [];
    const results: string[] = [];
    this.collectWords(node, prefix, results, limit ?? Infinity);
    return results;
  }

  /** Delete a word from the trie */
  delete(word: string): boolean {
    const path: TrieNode[] = [this.root];
    let node = this.root;
    for (const ch of word) {
      const child = node.children.get(ch);
      if (!child) return false;
      path.push(child);
      node = child;
    }
    if (!node.isEnd) return false;
    node.isEnd = false;
    delete node.value;
    // Prune unused nodes
    for (let i = word.length - 1; i >= 0; i--) {
      const n = path[i + 1]!;
      if (n.isEnd || n.children.size > 0) break;
      path[i]!.children.delete(word[i]!);
    }
    return true;
  }

  /** Count total words in trie */
  get count(): number {
    let c = 0;
    this.countNodes(this.root, () => c++);
    return c;
  }

  /** Get all words in the trie */
  getAllWords(): string[] { return this.autocomplete(""); }

  clear(): void { this.root = { children: new Map(), isEnd: false }; }

  private findNode(prefix: string): TrieNode | undefined {
    let node = this.root;
    for (const ch of prefix) {
      const child = node.children.get(ch);
      if (!child) return undefined;
      node = child;
    }
    return node;
  }

  private collectWords(node: TrieNode, prefix: string, results: string[], limit: number): void {
    if (results.length >= limit) return;
    if (node.isEnd) results.push(prefix);
    for (const [ch, child] of node.children) {
      this.collectWords(child, prefix + ch, results, limit);
      if (results.length >= limit) return;
    }
  }

  private countNodes(node: TrieNode, cb: () => void): void {
    if (node.isEnd) cb();
    for (const child of node.children.values()) this.countNodes(child, cb);
  }
}

// --- LRU Cache ---

export interface LRUCacheEntry<V> {
  value: V;
  key: string;
  accessed: number;
}

export class LRUCache<V> {
  private cache = new Map<string, LRUCacheEntry<V>>();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    if (maxSize <= 0) throw new Error("LRU cache maxSize must be positive");
    this.maxSize = maxSize;
  }

  get size(): number { return this.cache.size; }
  get keys(): string[] { return [...this.cache.keys()]; }

  get(key: string): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    entry.accessed = Date.now();
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry in insertion order)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, key, accessed: Date.now() });
  }

  has(key: string): boolean { return this.cache.has(key); }
  delete(key: string): boolean { return this.cache.delete(key); }
  clear(): void { this.cache.clear(); }

  /** Get all entries sorted by access time (most recent first) */
  entries(): Array<{ key: string; value: V }> {
    return [...this.cache.values()]
      .sort((a, b) => b.accessed - a.accessed)
      .map((e) => ({ key: e.key, value: e.value }));
  }

  /** Peek without updating access order */
  peek(key: string): V | undefined { return this.cache.get(key)?.value; }
}

// --- Bloom Filter ---

/**
 * Probabilistic set membership test. May have false positives but never false negatives.
 * Uses multiple hash functions via double hashing technique.
 */
export class BloomFilter {
  private bits: Uint8Array;
  private readonly hashCount: number;
  private readonly size: number;
  private _itemCount = 0;

  /**
   * @param expectedItems Expected number of items to store
   * @param errorRate Desired false positive rate (0-1), default 0.01 (1%)
   */
  constructor(expectedItems = 1000, errorRate = 0.01) {
    // Optimal bit array size: m = -n * ln(p) / (ln2)^2
    this.size = Math.ceil(-expectedItems * Math.log(errorRate) / (Math.LN2 * Math.LN2));
    // Optimal hash count: k = m/n * ln2
    this.hashCount = Math.ceil((this.size / expectedItems) * Math.LN2);
    this.bits = new Uint8Array(Math.ceil(this.size / 8));
  }

  get itemCount(): number { return this._itemCount; }

  /** Add an item to the filter */
  add(item: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const pos = this.hash(item, i) % this.size;
      this.bits[Math.floor(pos / 8)] |= 1 << (pos % 8);
    }
    this._itemCount++;
  }

  /** Check if item might be in the set (may be false positive) */
  mightContain(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const pos = this.hash(item, i) % this.size;
      if ((this.bits[Math.floor(pos / 8)] & (1 << (pos % 8))) === 0) return false;
    }
    return true;
  }

  /** Estimated current false positive rate */
  get errorRate(): number {
    if (this._itemCount === 0) return 0;
    const k = this.hashCount;
    const n = this._itemCount;
    const m = this.size;
    return Math.pow(1 - Math.pow(1 - 1 / m, k * n), k);
  }

  clear(): void { this.bits.fill(0); this._itemCount = 0; }

  /** Double hashing: h_i(x) = (h1(x) + i * h2(x)) % m */
  private hash(item: string, seed: number): number {
    let h1 = 2166136261; // FNV offset basis
    let h2 = 1444694605;
    for (let i = 0; i < item.length; i++) {
      h1 = (h1 ^ item.charCodeAt(i)) * 16777619 >>> 0;
      h2 = (h2 ^ item.charCodeAt(i)) * 2147483647 >>> 0;
    }
    return ((h1 + seed * h2) >>> 0) % this.size;
  }
}

// --- Ring Buffer (Circular Buffer) ---

export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private readIdx = 0;
  private writeIdx = 0;
  private _count = 0;

  constructor(private readonly capacity: number) {
    this.buffer = new Array(capacity).fill(undefined);
  }

  get size(): number { return this._count; }
  get isEmpty(): boolean { return this._count === 0; }
  get isFull(): boolean { return this._count === this.capacity; }

  /** Write a value. If full, overwrites oldest (returns overwritten value or undefined) */
  write(value: T): T | undefined {
    const overwritten = this.isFull ? this.buffer[this.readIdx] : undefined;
    this.buffer[this.writeIdx] = value;
    this.writeIdx = (this.writeIdx + 1) % this.capacity;
    if (this.isFull) this.readIdx = (this.readIdx + 1) % this.capacity;
    else this._count++;
    return overwritten as T | undefined;
  }

  /** Read oldest value (FIFO) */
  read(): T | undefined {
    if (this.isEmpty) return undefined;
    const value = this.buffer[this.readIdx];
    this.buffer[this.readIdx] = undefined;
    this.readIdx = (this.readIdx + 1) % this.capacity;
    this._count--;
    return value as T | undefined;
  }

  /** Peek at oldest without removing */
  peek(): T | undefined { return this.isEmpty ? undefined : this.buffer[this.readIdx] as T; }

  /** Peek at newest without removing */
  peekNewest(): T | undefined {
    if (this.isEmpty) return undefined;
    const idx = (this.writeIdx - 1 + this.capacity) % this.capacity;
    return this.buffer[idx] as T;
  }

  /** Convert to array in FIFO order */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._count; i++) {
      result.push(this.buffer[(this.readIdx + i) % this.capacity] as T);
    }
    return result;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.readIdx = 0;
    this.writeIdx = 0;
    this._count = 0;
  }
}
