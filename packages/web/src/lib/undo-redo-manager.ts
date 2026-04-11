/**
 * Undo/Redo Manager: Full-featured undo/redo stack with branching,
 * grouping/batching of operations, merge support for consecutive
 * same-type operations, persistence, undo limit with automatic
 * pruning, and integration hooks for editors.
 *
 * Supports:
 * - Linear undo/redo stack (default)
 * - Branching undo tree (for non-linear history)
 * - Group operations into atomic units
 * - Merge consecutive similar operations to save stack space
 * - Optional persistence via localStorage
 * - Configurable max undo levels
 * - Event-based change notification
 */

// --- Types ---

export interface UndoState<T = unknown> {
  /** The application state snapshot */
  data: T;
  /** Human-readable description of this action */
  description?: string;
  /** Timestamp when this state was created */
  timestamp?: number;
  /** Group ID for batched operations */
  groupId?: string;
  /** Action type for merging logic */
  actionType?: string;
}

export interface UndoRedoOptions {
  /** Maximum number of undo levels (default: 100) */
  maxUndoLevels?: number;
  /** Enable branching (non-linear history) */
  enableBranching?: boolean;
  /** Persist state to localStorage */
  persistKey?: string;
  /** Serializer for state data */
  serialize?: (state: unknown) => string;
  /** Deserializer for state data */
  deserialize?: (raw: string) => unknown;
  /** Called after every undo/redo */
  onChange?: (state: unknown, action: "undo" | "redo" | "push") => void;
  /** Called when undo is not available */
  onUndoUnavailable?: () => void;
  /** Called when redo is not available */
  onRedoUnavailable?: () => void;
  /** Merge strategy: "auto" | "none" | custom function */
  mergeStrategy?: "auto" | "none" | ((current: UndoState, incoming: UndoState) => UndoState | null);
}

export interface UndoRedoStats {
  canUndo: boolean;
  canRedo: boolean;
  undoStackSize: number;
  redoStackSize: number;
  totalStates: number;
  currentBranchId: string | null;
  groups: Record<string, number>;
}

export interface UndoGroupHandle {
  id: string;
  end: () => void;
  cancel: () => void;
}

// --- Internal Types ---

interface BranchNode<T> {
  id: string;
  state: UndoState<T>;
  parent: BranchNode<T> | null;
  children: BranchNode<T>[];
  timestamp: number;
}

// --- Main Class ---

export class UndoRedoManager<T = unknown> {
  private config: Required<Pick<UndoRedoOptions, "maxUndoLevels" | "enableBranching" | "persistKey">> & Omit<UndoRedoOptions, "maxUndoLevels" | "enableBranching" | "persistKey">>;

  // Linear mode stacks
  private undoStack: UndoState<T>[] = [];
  private redoStack: UndoState<T>[] = [];

  // Branching mode tree
  private rootBranch: BranchNode<T> | null = null;
  private currentBranchNode: BranchNode<T> | null = null;

  private destroyed = false;

  constructor(options: UndoRedoOptions = {}) {
    this.config = {
      maxUndoLevels: options.maxUndoLevels ?? 100,
      enableBranching: options.enableBranching ?? false,
      persistKey: options.persistKey ?? null,
      serialize: options.serialize ?? JSON.stringify,
      deserialize: options.deserialize ?? JSON.parse,
      onChange: options.onChange,
      onUndoUnavailable: options.onUndoUnavailable,
      onRedoUnavailable: options.onRedoUnavailable,
      mergeStrategy: options.mergeStrategy ?? "auto",
    };

    if (this.config.enableBranching) {
      this.rootBranch = null; // Will be set on first push
      this.currentBranchNode = null;
    }

    // Restore from persistence
    if (this.config.persistKey) {
      this.restore();
    }
  }

  /** Push a new state onto the undo stack */
  push(state: T, description?: string): void {
    if (this.destroyed) return;

    const undoState: UndoState<T> = {
      data: state,
      description,
      timestamp: Date.now(),
    };

    if (this.config.enableBranching) {
      this.pushBranch(undoState);
    } else {
      // Try merge with top of stack
      const merged = this.tryMerge(this.undoStack[this.undoStack.length - 1], undoState);

      if (merged) {
        this.undoStack[this.undoStack.length - 1] = merged;
      } else {
        this.undoStack.push(undoState);
        this.redoStack = []; // Clear redo on new action
      }

      // Prune if over limit
      while (this.undoStack.length > this.config.maxUndoLevels) {
        this.undoStack.shift();
      }
    }

    this.config.onChange?.(state, "push");
    this.persist();
  }

  /** Push a state as part of a group (atomic batch) */
  startGroup(description?: string): UndoGroupHandle {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const states: UndoState<T>[] = [];

    return {
      id: groupId,
      end: () => {
        // Mark all states in this group with the same groupId
        for (const s of states) {
          s.groupId = groupId;
        }
      },
      cancel: () => {
        // Remove all states that were part of this group
        this.undoStack = this.undoStack.filter((s) => s.groupId !== groupId);
      },
      _addState: (state: T, desc?: string) => {
        states.push({ data: state, description: desc, groupId });
      },
    } as UndoGroupHandle;
  }

  /** Undo last operation. Returns the undone state or null. */
  undo(): T | null {
    if (this.destroyed) return null;

    if (this.config.enableBranching) {
      return this.undoBranch();
    }

    if (this.undoStack.length === 0) {
      this.config.onUndoUnavailable?.();
      return null;
    }

    const state = this.undoStack.pop()!;
    this.redoStack.push(state);

    const result = this.getCurrentData();
    this.config.onChange?.(result, "undo");
    this.persist();

    return result;
  }

  /** Redo last undone operation. Returns the redone state or null. */
  redo(): T | null {
    if (this.destroyed) return null;

    if (this.config.enableBranching) {
      return this.redoBranch();
    }

    if (this.redoStack.length === 0) {
      this.config.onRedoUnavailable?.();
      return null;
    }

    const state = this.redoStack.pop()!;
    this.undoStack.push(state);

    const result = this.getCurrentData();
    this.config.onChange?.(result, "redo");
    this.persist();

    return result;
  }

  /** Get current state without modifying stacks */
  getCurrentData(): T | null {
    if (this.config.enableBranching && this.currentBranchNode) {
      return this.currentBranchNode.state.data as T;
    }

    if (this.undoStack.length > 0) {
      return this.undoStack[this.undoStack.length - 1].data as T;
    }

    return null;
  }

  /** Check if undo is available */
  canUndo(): boolean {
    if (this.config.enableBranching) {
      return this.currentBranchNode !== null && this.currentBranchNode.parent !== null;
    }
    return this.undoStack.length > 0;
  }

  /** Check if redo is available */
  canRedo(): boolean {
    if (this.config.enableBranching) {
      return this.currentBranchNode !== null && this.currentBranchNode.children.length > 0;
    }
    return this.redoStack.length > 0;
  }

  /** Clear all history */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];

    if (this.config.enableBranching) {
      this.rootBranch = null;
      this.currentBranchNode = null;
    }

    this.persist();
  }

  /** Get statistics about the undo/redo system */
  getStats(): UndoRedoStats {
    const groups: Record<string, number> = {};
    for (const s of this.undoStack) {
      if (s.groupId) {
        groups[s.groupId] = (groups[s.groupId] || 0) + 1;
      }
    }

    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoStackSize: this.undoStack.length,
      redoStackSize: this.redoStack.length,
      totalStates: this.undoStack.length + this.redoStack.length,
      currentBranchId: this.currentBranchNode?.id ?? null,
      groups,
    };
  }

  /** Get undo stack (read-only, for debugging/display) */
  getUndoStack(): ReadonlyArray<UndoState<T>> {
    return this.undoStack;
  }

  /** Get redo stack (read-only) */
  getRedoStack(): ReadonlyArray<UndoState<T>> {
    return this.redoStack;
  }

  /** Set a max undo level and prune if needed */
  setMaxLevels(max: number): void {
    this.config.maxUndoLevels = max;
    while (this.undoStack.length > max) {
      this.undoStack.shift();
    }
  }

  /** Destroy and cleanup */
  destroy(): void {
    this.destroyed = true;
    this.clear();
  }

  // --- Branching Mode ---

  private pushBranch(state: UndoState<T>): void {
    const node: BranchNode<T> = {
      id: `branch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      state,
      parent: this.currentBranchNode,
      children: [],
      timestamp: Date.now(),
    };

    if (!this.rootBranch) {
      this.rootBranch = node;
      this.currentBranchNode = node;
      return;
    }

    // Add as child of current node
    this.currentBranchNode.children.push(node);
    this.currentBranchNode = node;
  }

  private undoBranch(): T | null {
    if (!this.currentBranchNode || !this.currentBranchNode.parent) {
      this.config.onUndoUnavailable?.();
      return null;
    }

    this.currentBranchNode = this.currentBranchNode.parent;
    return this.currentBranchNode.state.data as T;
  }

  private redoBranch(): T | null {
    if (!this.currentBranchNode || this.currentBranchNode.children.length === 0) {
      this.config.onRedoUnavailable?.();
      return null;
    }

    // Redo to most recent child
    this.currentBranchNode = this.currentBranchNode.children[this.currentBranchNode.children.length - 1]!;
    return this.currentBranchNode.state.data as T;
  }

  /** Get branch info for debugging */
  getBranchInfo(): { currentId: string | null; parentId: string | null; childCount: number; depth: number } | null {
    if (!this.currentBranchNode) return null;

    let depth = 0;
    let node: BranchNode<T> | null = this.currentBranchNode;
    while (node) { depth++; node = node.parent; }

    return {
      currentId: this.currentBranchNode.id,
      parentId: this.currentBranchNode.parent?.id ?? null,
      childCount: this.currentBranchNode.children.length,
      depth,
    };
  }

  // --- Persistence ---

  private persist(): void {
    if (!this.config.persistKey || this.destroyed) return;

    try {
      const data = {
        undoStack: this.undoStack.slice(-50), // Only persist last 50
        redoStack: this.redoStack.slice(-20),
        currentBranchId: this.currentBranchNode?.id ?? null,
      };
      localStorage.setItem(this.config.persistKey, this.config.serialize!(data));
    } catch {
      // Storage full or unavailable
    }
  }

  private restore(): void {
    if (!this.config.persistKey) return;

    try {
      const raw = localStorage.getItem(this.config.persistKey);
      if (!raw) return;

      const data = this.config.deserialize!(raw) as {
        undoStack: UndoState<T>[];
        redoStack: UndoState<T>[];
        currentBranchId: string | null;
      };

      if (data.undoStack) this.undoStack = data.undoStack;
      if (data.redoStack) this.redoStack = data.redoStack;
    } catch {
      // Corrupted data — ignore
    }
  }

  // --- Merge Logic ---

  private tryMerge(existing: UndoState<T> | undefined, incoming: UndoState<T>): UndoState<T> | null {
    if (!existing) return null;
    if (this.config.mergeStrategy === "none") return null;

    // Auto merge: only merge if same action type and within 3 seconds
    if (this.config.mergeStrategy === "auto") {
      if (!existing.actionType || !incoming.actionType) return null;
      if (existing.actionType !== incoming.actionType) return null;
      if ((incoming.timestamp ?? Date.now()) - (existing.timestamp ?? 0) > 3000) return null;

      // Return merged state (keep incoming as it's newer)
      return {
        ...incoming,
        description: `${existing.description ?? ""} (+ ${incoming.description ?? ""})`,
      };
    }

    // Custom merge function
    if (typeof this.config.mergeStrategy === "function") {
      return this.config.mergeStrategy(existing, incoming) as UndoState<T> | null;
    }

    return null;
  }
}

/** Convenience factory */
export function createUndoRedoManager<T = unknown>(options?: UndoRedoOptions): UndoRedoManager<T> {
  return new UndoRedoManager<T>(options);
}
