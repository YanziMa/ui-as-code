/**
 * Stack data structure utilities (LIFO) with undo/redo support.
 */

// --- Types ---

export interface StackOptions<T> {
  /** Maximum stack size (default: Infinity) */
  maxSize?: number;
  /** Called when item is pushed */
  onPush?: (item: T) => void;
  /** Called when item is popped */
  onPop?: (item: T) => void;
}

export interface UndoRedoState<T> {
  /** Current value */
  current: T;
  /** Can undo? */
  canUndo: boolean;
  /** Can redo? */
  canRedo: boolean;
  /** Undo stack size */
  undoSize: number;
  /** Redo stack size */
  redoSize: number;
}

// --- Stack ---

export class Stack<T> {
  private items: T[] = [];
  private readonly maxSize: number;
  private onPush?: (item: T) => void;
  private onPop?: (item: T) => void;

  constructor(options?: StackOptions<T>) {
    this.maxSize = options?.maxSize ?? Infinity;
    this.onPush = options?.onPush;
    this.onPop = options?.onPop;
  }

  /** Push item onto stack */
  push(item: T): this {
    this.items.push(item);
    if (this.items.length > this.maxSize) {
      this.items.shift();
    }
    this.onPush?.(item);
    return this;
  }

  /** Pop item from stack (returns undefined if empty) */
  pop(): T | undefined {
    const item = this.items.pop();
    if (item !== undefined) {
      this.onPop?.(item);
    }
    return item;
  }

  /** Peek at top item without removing */
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  /** Check if stack is empty */
  get isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** Get current size */
  get size(): number {
    return this.items.length;
  }

  /** Clear all items */
  clear(): void {
    this.items = [];
  }

  /** Convert to array (top last) */
  toArray(): T[] {
    return [...this.items];
  }

  /** Iterate from bottom to top */
  [Symbol.iterator](): Iterator<T> {
    let idx = 0;
    return {
      next: (): IteratorResult<T> => {
        if (idx < this.items.length) {
          return { done: false, value: this.items[idx++] };
        }
        return { done: true, value: undefined as unknown as T };
      },
    };
  }

  /** Find item by predicate (searches from top) */
  find(predicate: (item: T) => boolean): T | undefined {
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (predicate(this.items[i])) return this.items[i];
    }
    return undefined;
  }

  /** Check if item exists in stack */
  has(item: T): boolean {
    return this.items.includes(item);
  }

  /** Remove first matching item */
  remove(predicate: (item: T) => boolean): boolean {
    const idx = this.items.findIndex(predicate);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }

  /** Map over all items */
  map<R>(fn: (item: T, index: number) => R): R[] {
    return this.items.map(fn);
  }

  /** Filter items */
  filter(predicate: (item: T) => boolean): T[] {
    return this.items.filter(predicate);
  }

  /** Reduce items */
  reduce<R>(fn: (acc: R, item: T) => R, initial: R): R {
    return this.items.reduce(fn, initial);
  }
}

// --- Undo/Redo Manager ---

/**
 * Generic undo/redo manager built on two stacks.
 * Useful for editor state, form history, etc.
 */
export class UndoRedoManager<T> {
  private undoStack: Stack<T>;
  private redoStack: Stack<T>;
  private _current: T;
  private readonly maxHistory: number;

  constructor(initialState: T, maxHistory: number = 50) {
    this._current = initialState;
    this.maxHistory = maxHistory;
    this.undoStack = new Stack<T>({ maxSize: maxHistory });
    this.redoStack = new Stack<T>({ maxSize: maxHistory });
  }

  /** Save current state to undo stack (clears redo) */
  save(state: T): void {
    this.undoStack.push(this._current);
    this.redoStack.clear();
    this._current = state;
  }

  /** Undo: revert to previous state */
  undo(): T | null {
    if (this.undoStack.isEmpty) return null;

    this.redoStack.push(this._current);
    this._current = this.undoStack.pop()!;
    return this._current;
  }

  /** Redo: re-apply undone state */
  redo(): T | null {
    if (this.redoStack.isEmpty) return null;

    this.undoStack.push(this._current);
    this._current = this.redoStack.pop()!;
    return this._current;
  }

  /** Get current state */
  get current(): T {
    return this._current;
  }

  /** Set current state directly (without saving to undo) */
  set current(value: T) {
    this._current = value;
  }

  /** Get full state snapshot */
  getState(): UndoRedoState<T> {
    return {
      current: this._current,
      canUndo: !this.undoStack.isEmpty,
      canRedo: !this.redoStack.isEmpty,
      undoSize: this.undoStack.size,
      redoSize: this.redoStack.size,
    };
  }

  /** Clear all history */
  clear(): void {
    this.undoStack.clear();
    this.redoStack.clear();
  }

  /** Get undo stack as array (oldest first) */
  getUndoHistory(): T[] {
    return this.undoStack.toArray();
  }

  /** Get redo stack as array (oldest first) */
  getRedoHistory(): T[] {
    return this.redoStack.toArray();
  }
}

// --- Call Stack Tracker ---

/**
 * Track function call entries/exits for debugging.
 * Lightweight alternative to console.profile.
 */
export class CallTracker {
  private stack: Array<{ name: string; start: number; depth: number }> = [];
  private depth = 0;

  /** Enter a function call */
  enter(name: string): void {
    this.stack.push({ name, start: performance.now(), depth: this.depth });
    this.depth++;
  }

  /** Exit the most recent call, returns duration in ms */
  exit(): number | null {
    if (this.stack.length === 0) return null;
    this.depth--;
    const entry = this.stack.pop()!;
    return performance.now() - entry.start;
  }

  /** Get formatted call tree */
  getTree(): string {
    const lines: string[] = [];
    for (const entry of this.stack) {
      const indent = "  ".repeat(entry.depth);
      const duration = performance.now() - entry.start;
      lines.push(`${indent}${entry.name} (${duration.toFixed(1)}ms, active)`);
    }
    return lines.join("\n");
  }

  /** Clear tracker */
  clear(): void {
    this.stack = [];
    this.depth = 0;
  }

  /** Get current depth */
  get currentDepth(): number {
    return this.depth;
  }
}
