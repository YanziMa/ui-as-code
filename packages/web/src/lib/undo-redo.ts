/**
 * Advanced undo/redo with branching history, grouping, and persistence.
 */

export interface UndoItem<T> {
  id: string;
  type: string;
  timestamp: number;
  data: T;
  description?: string;
  /** Metadata for display */
  meta?: Record<string, unknown>;
}

export interface UndoBranch<T> {
  id: string;
  name: string;
  parentId: string | null;
  items: UndoItem<T>[];
  currentIndex: number;
  createdAt: number;
}

export interface UndoHistoryOptions<T> {
  /** Maximum items to keep in history */
  maxHistory?: number;
  /** Auto-save interval (ms), 0 = manual only */
  autoSaveInterval?: number;
  /** Group actions within this many ms as one undo step */
  groupDelay?: number;
  /** Serialize/deserialize for persistence */
  serializer?: (data: T) => string;
  deserializer?: (raw: string) => T;
  /** Storage key for localStorage persistence */
  storageKey?: string;
  /** Called when state changes */
  onStateChange?: (state: UndoState<T>) => void;
}

export interface UndoState<T> {
  canUndo: boolean;
  canRedo: boolean;
  currentItem: UndoItem<T> | null;
  currentData: T | null;
  branchCount: number;
  totalItems: number;
}

export type UndoChangeListener<T> = (state: UndoState<T>) => void;

/** Advanced undo/redo manager with branching support */
export class UndoHistory<T> {
  private branches: Map<string, UndoBranch<T>> = new Map();
  private activeBranchId: string;
  private options: Required<UndoHistoryOptions<T>>;
  private listeners = new Set<UndoChangeListener<T>>();
  private counter = 0;
  private groupTimer: ReturnType<typeof setTimeout> | null = null;
  private groupedItems: UndoItem<T>[] = [];
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private initialData: T;

  constructor(initialData: T, options: UndoHistoryOptions<T> = {}) {
    this.initialData = initialData;
    this.options = {
      maxHistory: options.maxHistory ?? 100,
      autoSaveInterval: options.autoSaveInterval ?? 0,
      groupDelay: options.groupDelay ?? 500,
      serializer: options.serializer ?? ((d) => JSON.stringify(d)),
      deserializer: options.deserializer ?? ((r) => JSON.parse(r) as T),
      storageKey: options.storageKey ?? "",
      onStateChange: options.onStateChange,
    };

    // Create main branch
    const mainBranchId = "main";
    const firstItem: UndoItem<T> = {
      id: `item-${++this.counter}`,
      type: "initial",
      timestamp: Date.now(),
      data: initialData,
      description: "Initial state",
    };

    this.activeBranchId = mainBranchId;
    this.branches.set(mainBranchId, {
      id: mainBranchId,
      name: "Main",
      parentId: null,
      items: [firstItem],
      currentIndex: 0,
      createdAt: Date.now(),
    });

    // Load from storage if available
    if (this.options.storageKey) {
      this.loadFromStorage();
    }

    // Auto-save
    if (this.options.autoSaveInterval > 0) {
      this.autoSaveTimer = setInterval(() => {
        this.saveToStorage();
      }, this.options.autoSaveInterval);
    }
  }

  /** Push a new state onto the history */
  push(data: T, type = "change", description?: string): void {
    const item: UndoItem<T> = {
      id: `item-${++this.counter}`,
      type,
      timestamp: Date.now(),
      data,
      description,
    };

    if (this.options.groupDelay > 0) {
      this.groupedItems.push(item);

      if (this.groupTimer) clearTimeout(this.groupTimer);
      this.groupTimer = setTimeout(() => {
        this.commitGroupedItems();
      }, this.options.groupDelay);
    } else {
      this.commitItem(item);
    }
  }

  /** Undo last action */
  undo(): T | null {
    const branch = this.getBranch();
    if (branch.currentIndex <= 0) return null;

    branch.currentIndex--;
    this.emit();
    return this.getCurrentData();
  }

  /** Redo next action */
  redo(): T | null {
    const branch = this.getBranch();
    if (branch.currentIndex >= branch.items.length - 1) return null;

    branch.currentIndex++;
    this.emit();
    return this.getCurrentData();
  }

  /** Go to a specific item in history */
  goTo(itemId: string): T | null {
    const branch = this.getBranch();
    const idx = branch.items.findIndex((i) => i.id === itemId);
    if (idx < 0) return null;

    branch.currentIndex = idx;
    this.emit();
    return this.getCurrentData();
  }

  /** Create a new branch from current position */
  createBranch(name: string): string {
    const branch = this.getBranch();
    const branchId = `branch-${++this.counter}`;

    const newBranch: UndoBranch<T> = {
      id: branchId,
      name,
      parentId: this.activeBranchId,
      items: branch.items.slice(0, branch.currentIndex + 1),
      currentIndex: branch.currentIndex,
      createdAt: Date.now(),
    };

    this.branches.set(branchId, newBranch);
    return branchId;
  }

  /** Switch to a different branch */
  switchBranch(branchId: string): boolean {
    if (!this.branches.has(branchId)) return false;
    this.activeBranchId = branchId;
    this.emit();
    return true;
  }

  /** Get current state info */
  getState(): UndoState<T> {
    const branch = this.getBranch();
    const current = branch.items[branch.currentIndex] ?? null;

    return {
      canUndo: branch.currentIndex > 0,
      canRedo: branch.currentIndex < branch.items.length - 1,
      currentItem: current,
      currentData: current?.data ?? null,
      branchCount: this.branches.size,
      totalItems: branch.items.length,
    };
  }

  /** Get all items in current branch (for timeline UI) */
  getTimeline(): UndoItem<T>[] {
    return [...this.getBranch().items];
  }

  /** Get all branches */
  getBranches(): Array<{ id: string; name: string; isActive: boolean; itemCount: number }> {
    return Array.from(this.branches.values()).map((b) => ({
      id: b.id,
      name: b.name,
      isActive: b.id === this.activeBranchId,
      itemCount: b.items.length,
    }));
  }

  /** Clear history (keep current state) */
  clear(keepCurrent = true): void {
    const branch = this.getBranch();
    const current = keepCurrent ? branch.items[branch.currentIndex] : null;

    branch.items = current ? [current] : [];
    branch.currentIndex = 0;

    if (current) {
      branch.items[0] = { ...current, type: "cleared", timestamp: Date.now() };
    }

    this.emit();
  }

  /** Subscribe to state changes */
  subscribe(listener: UndoChangeListener<T>): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  /** Export history as JSON string */
  exportHistory(): string {
    const data = {
      activeBranch: this.activeBranchId,
      branches: Array.from(this.branches.entries()).map(([id, branch]) => ({
        id,
        ...branch,
        items: branch.items.map((item) => ({
          ...item,
          data: this.options.serializer(item.data),
        })),
      })),
    };
    return JSON.stringify(data);
  }

  /** Import history from JSON string */
  importHistory(json: string): boolean {
    try {
      const data = JSON.parse(json);
      if (!data.branches || !Array.isArray(data.branches)) return false;

      this.branches.clear();

      for (const b of data.branches) {
        this.branches.set(b.id, {
          ...b,
          items: b.items.map((item: UndoItem<string>) => ({
            ...item,
            data: this.options.deserializer(item.data),
          })),
        });
      }

      this.activeBranchId = data.activeBranch ?? "main";
      this.emit();
      return true;
    } catch {
      return false;
    }
  }

  /** Destroy and cleanup */
  destroy(): void {
    if (this.groupTimer) clearTimeout(this.groupTimer);
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    this.listeners.clear();
    this.branches.clear();
  }

  // --- Private ---

  private getBranch(): UndoBranch<T> {
    const branch = this.branches.get(this.activeBranchId);
    if (!branch) throw new Error(`Branch not found: ${this.activeBranchId}`);
    return branch;
  }

  private getCurrentData(): T | null {
    const branch = this.getBranch();
    return branch.items[branch.currentIndex]?.data ?? null;
  }

  private commitItem(item: UndoItem<T>): void {
    const branch = this.getBranch();

    // Remove any redo items after current position
    branch.items = branch.items.slice(0, branch.currentIndex + 1);
    branch.items.push(item);
    branch.currentIndex = branch.items.length - 1;

    // Trim if over max
    if (branch.items.length > this.options.maxHistory) {
      const excess = branch.items.length - this.options.maxHistory;
      branch.items.splice(0, excess);
      branch.currentIndex -= excess;
    }

    this.saveToStorage();
    this.emit();
  }

  private commitGroupedItems(): void {
    if (this.groupedItems.length === 0) return;

    if (this.groupedItems.length === 1) {
      this.commitItem(this.groupedItems[0]!);
    } else {
      // Merge into single item with the latest data
      const lastItem = this.groupedItems[this.groupedItems.length - 1]!;
      this.commitItem({
        ...lastItem,
        type: "grouped",
        description: `${this.groupedItems.length} actions`,
        meta: { count: this.groupedItems.length },
      });
    }

    this.groupedItems = [];
  }

  private emit(): void {
    const state = this.getState();
    this.options.onStateChange?.(state);
    for (const listener of this.listeners) {
      try { listener(state); } catch { /* ignore */ }
    }
  }

  private saveToStorage(): void {
    if (!this.options.storageKey) return;
    try {
      localStorage.setItem(this.options.storageKey, this.exportHistory());
    } catch { /* ignore */ }
  }

  private loadFromStorage(): void {
    if (!this.options.storageKey) return;
    try {
      const raw = localStorage.getItem(this.options.storageKey);
      if (raw) this.importHistory(raw);
    } catch { /* ignore */ }
  }
}
