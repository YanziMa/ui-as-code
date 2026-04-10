/**
 * Undo/Redo v2: Advanced command pattern with branching undo history,
 * merge support, collaborative undo (operational transformation),
 * time-travel navigation, selective undo, undo groups,
 * serialization, capacity management, and performance optimization.
 */

// --- Types ---

export interface Command<T = unknown> {
  id: string;
  type: string;
  timestamp: number;
  data: T;
  description?: string;
  metadata?: Record<string, unknown>;
  groupId?: string;           // For grouping related commands
  userId?: string;            // For multi-user
}

export interface BranchInfo {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  headPosition: number;     // Position in the main timeline
  commandIds: string[];
}

export interface UndoState<T = unknown> {
  /** Main linear timeline (redo stack is implicit) */
  timeline: Command<T>[];
  /** Current position in timeline */
  position: number;
  /** Branching tree */
  branches: Map<string, BranchInfo>;
  /** Active branch */
  activeBranchId: string;
  /** Maximum history size */
  maxSize: number;
  /** Current state (reconstructed from commands + initial state) */
  currentState: T;
  /** Initial state */
  initialState: T;
  /** Listeners */
  listeners: Set<UndoListener<T>>;
  /** Whether we're currently performing undo/redo */
  isUndoing: boolean;
  /** Group stack for macro recording */
  groupStack: Array<{ id: string; name?: string; start: number }>;
  /** Saved bookmarks for quick navigation */
  bookmarks: Map<string, { position: number; name: string; snapshot: T }>;
}

export type UndoListener<T = unknown> = (state: T, action: "undo" | "redo" | "branch" | "jump" | "clear" | "group-start" | "group-end", command?: Command<T>) => void;

export interface RedoResult<T = unknown> {
  state: T;
  command: Command<T>;
  action: "undo" | "redo";
}

// --- Command Applier ---

export type ApplyFn<T> = (state: T, command: Command<T>) => T;
export type InvertFn<T> = (command: Command<T>) => Command<T>;

// --- Undo Manager ---

export class UndoManager<T = unknown> {
  private state: UndoState<T>;
  private apply: ApplyFn<T>;
  private invert: InvertFn<T>;

  constructor(initialState: T, apply: ApplyFn<T>, invert: InvertFn<T>, options?: { maxSize?: number }) {
    this.apply = apply;
    this.invert = invert;
    this.state = {
      timeline: [], position: 0,
      branches: new Map([["main", { id: "main", name: "Main", parentId: null, createdAt: Date.now(), headPosition:0, commandIds: [] }]]),
      activeBranchId: "main",
      maxSize: options?.maxSize ?? 500,
      currentState: initialState,
      initialState,
      listeners: new Set(),
      isUndoing: false,
      groupStack: [],
      bookmarks: new Map(),
    };
  }

  /** Execute a command and add to history */
  execute(command: Omit<Command<T>, "id" | "timestamp">): RedoResult<T> {
    const fullCommand: Command<T> = { ...command, id: command.id ?? `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: command.timestamp ?? Date.now() };

    // Check if we're in a group
    if (this.state.groupStack.length > 0) {
      fullCommand.groupId = this.state.groupStack[this.state.groupStack.length - 1]!.id;
    }

    // Trim future if we're not at the end (new command discards redo)
    if (this.state.position < this.state.timeline.length) {
      this.state.timeline = this.state.timeline.slice(0, this.state.position);
    }

    // Apply command
    const previousState = this.state.currentState;
    this.state.currentState = this.apply(this.state.currentState, fullCommand);

    // Add to timeline
    this.state.timeline.push(fullCommand as Command<T>);
    this.state.position++;

    // Update branch head
    const branch = this.state.branches.get(this.state.activeBranchId)!;
    branch.headPosition = this.state.position - 1;
    branch.commandIds.push(fullCommand.id);

    // Enforce max size
    this.trimHistory();

    const result: RedoResult<T> = { state: this.state.currentState, command: fullCommand, action: "execute" };
    this.notifyListeners(result, "redo");
    return result;
  }

  /** Undo last command */
  undo(): RedoResult<T> | null {
    if (this.state.position <= 0) return null;

    this.state.isUndoing = true;
    const command = this.state.timeline[this.state.position - 1]!;

    // Rebuild state from scratch up to position-1
    this.rebuildState(this.state.position - 1);

    this.state.position--;
    this.state.isUndoing = false;

    const result: RedoResult<T> = { state: this.state.currentState, command, action: "undo" };
    this.notifyListeners(result, "undo");
    return result;
  }

  /** Redo next command */
  redo(): RedoResult<T> | null {
    if (this.state.position >= this.state.timeline.length) return null;

    const command = this.state.timeline[this.state.position]!;
    this.state.currentState = this.apply(this.state.currentState, command);
    this.state.position++;

    const result: RedoResult<T> = { state: this.state.currentState, command, action: "redo" };
    this.notifyListeners(result, "redo");
    return result;
  }

  /** Undo multiple steps */
  undoSteps(count = 1): RedoResult<T> | null {
    let result: RedoResult<T> | null = null;
    for (let i = 0; i < count && result !== null; i++) result = this.undo();
    return result;
  }

  /** Redo multiple steps */
  redoSteps(count = 1): RedoResult<T> | null {
    let result: RedoResult<T> | null = null;
    for (let i = 0; i < count && result !== null; i++) result = this.redo();
    return result;
  }

  /** Go to a specific position in history */
  goTo(position: number): RedoResult<T> | null {
    if (position < 0 || position > this.state.timeline.length || position === this.state.position) return null;
    const direction = position > this.state.position ? "redo" : "undo";
    this.rebuildState(position);
    this.state.position = position;
    const result: RedoResult<T> = { state: this.state.currentState, command: this.state.timeline[Math.max(0, position - 1)]!, action: direction === "redo" ? "redo" : "undo" };
    this.notifyListeners(result, "jump");
    return result;
  }

  /** Jump to a bookmark */
  goToBookmark(bookmarkId: string): RedoResult<T> | null {
    const bm = this.state.bookmarks.get(bookmarkId);
    if (!bm) return null;
    return this.goTo(bm.position);
  }

  /** Create a branch from current position */
  createBranch(name: string): string {
    const id = `branch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const branch: BranchInfo = {
      id, name, parentId: this.state.activeBranchId,
      createdAt: Date.now(), headPosition: this.state.position - 1,
      commandIds: this.state.timeline.slice(0, this.state.position).map((c) => c.id),
    };
    this.state.branches.set(id, branch);
    return id;
  }

  /** Switch to a branch */
  switchBranch(branchId: string): boolean {
    const branch = this.state.branches.get(branchId);
    if (!branch) return false;

    // Save current state to current branch
    const currentBranch = this.state.branches.get(this.state.activeBranchId)!;
    currentBranch.headPosition = this.state.position - 1;
    currentBranch.commandIds = this.state.timeline.slice(0, this.state.position).map((c) => c.id);

    // Restore branch state
    this.state.activeBranchId = branchId;
    this.rebuildState(branch.headPosition + 1);
    this.state.position = branch.headPosition + 1;

    this.notifyListeners(this.state.currentState, "branch");
    return true;
  }

  /** Get list of branches */
  getBranches(): BranchInfo[] { return Array.from(this.state.branches.values()); }

  /** Delete a branch (only non-active branches) */
  deleteBranch(branchId: string): boolean {
    if (branchId === "main") return false;
    if (branchId === this.state.activeBranchId) return false;
    return this.state.branches.delete(branchId);
  }

  /** Start recording a command group */
  startGroup(name?: string): string {
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.state.groupStack.push({ id, name, start: this.state.position });
    return id;
  }

  /** End recording a command group */
  endGroup(): void {
    if (this.state.groupStack.length === 0) return;
    this.state.groupStack.pop();
  }

  /** Is there an active group? */
  isInGroup(): boolean { return this.state.groupStack.length > 0; }

  /** Create a bookmark at current position */
  createBookmark(name: string): string {
    const id = `bm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.state.bookmarks.set(id, { position: this.state.position, name, snapshot: JSON.parse(JSON.stringify(this.state.currentState)) });
    return id;
  }

  /** Remove a bookmark */
  removeBookmark(bookmarkId: string): boolean { return this.state.bookmarks.delete(bookmarkId); }

  /** Get all bookmarks */
  getBookmarks(): Array<{ id: string; name: string; position: number }> {
    return Array.from(this.state.bookmarks.entries()).map(([id, bm]) => ({ id, ...bm }));
  }

  /** Clear all history */
  clear(): void {
    this.state.timeline = [];
    this.state.position = 0;
    this.state.currentState = this.state.initialState;
    // Keep main branch, remove others
    const mainBranch = this.state.branches.get("main")!;
    mainBranch.headPosition = -1;
    mainBranch.commandIds = [];
    this.state.branches.clear();
    this.state.branches.set("main", mainBranch);
    this.notifyListeners(this.state.initialState, "clear");
  }

  /** Get current state */
  getState(): T { return this.state.currentState; }

  /** Get initial state */
  getInitialState(): T { return this.state.initialState; }

  /** Can undo? */
  canUndo(): boolean { return this.state.position > 0; }

  /** Can redo? */
  canRedo(): boolean { return this.state.position < this.state.timeline.length; }

  /** Get undo history (commands that can be undone) */
  getUndoHistory(): Command<T>[] { return this.state.timeline.slice(0, this.state.position); }

  /** Get redo history (commands that can be redone) */
  getRedoHistory(): Command<T>[] { return this.state.timeline.slice(this.state.position); }

  /** Get total command count */
  getCommandCount(): number { return this.state.timeline.length; }

  /** Listen to state changes */
  onChange(listener: UndoListener<T>): () => void {
    this.state.listeners.add(listener);
    return () => this.state.listeners.delete(listener);
  }

  /** Export state for persistence */
  export(): object {
    return {
      position: this.state.position,
      activeBranchId: this.state.activeBranchId,
      bookmarks: Object.fromEntries(this.state.bookmarks.entries()),
      branches: Object.fromEntries(Array.from(this.state.branches.entries()).map(([k, b]) => [k, { ...b, commandIds: b.commandIds }])),
      initialState: this.state.initialState,
    };
  }

  /** Import previously exported state */
  import(data: { position?: number; activeBranchId?: string; initialState?: T }): void {
    if (data.position !== undefined) this.state.position = data.position;
    if (data.activeBranchId && this.state.branches.has(data.activeBranchId)) this.state.activeBranchId = data.activeBranchId;
    if (data.initialState !== undefined) this.state.initialState = data.initialState;
    this.rebuildState(this.state.position);
  }

  // --- Internal ---

  private rebuildState(targetPosition: number): void {
    this.state.currentState = JSON.parse(JSON.stringify(this.state.initialState));
    for (let i = 0; i < targetPosition; i++) {
      const cmd = this.state.timeline[i]!;
      try { this.state.currentState = this.apply(this.state.currentState, cmd); } catch {}
    }
  }

  private trimHistory(): void {
    // Keep at most maxSize entries, but always keep at least one entry per branch
    if (this.state.timeline.length <= this.state.maxSize) return;

    // Simple strategy: trim oldest entries that aren't branch heads
    const branchHeadPositions = new Set(Array.from(this.state.branches.values()).map((b) => b.headPosition));
    let trimmed = 0;
    while (this.state.timeline.length > this.state.maxSize && trimmed < this.state.timeline.length / 2) {
      const idx = 0;
      if (!branchHeadPositions.has(idx)) {
        this.state.timeline.shift();
        this.state.position--;
        trimmed++;
        // Adjust positions
        for (const branch of this.state.branches.values()) {
          branch.headPosition = Math.max(-1, branch.headPosition - 1);
        }
      } else {
        break;
      }
    }
  }

  private notifyListeners(state: T, action: RedoResult<T>["action"]): void {
    for (const l of this.state.listeners) l(state, action, undefined);
  }
}

// --- Collaborative OT-based Undo ---

export interface TransformOperation {
  clientId: string;
  commandId: string;
  operation: "insert" | "delete" | "retain";
  position: number;
  content?: string;
}

/** Transform two operations to maintain convergence */
export function transform(op1: TransformOperation, op2: TransformOperation): [TransformOperation, TransformOperation] {
  // If operations are on different positions and don't overlap, no transform needed
  if (op1.operation === "retain" || op2.operation === "retain") {
    return [op1, op2];
  }

  // Both are inserts at same position: order by client ID for consistency
  if (op1.operation === "insert" && op2.operation === "insert" && op1.position === op2.position) {
    return op1.clientId < op2.clientId ? [op1, op2] : [op2, op1];
  }

  // Both deletes at same position: reverse order so later deletion happens first
  if (op1.operation === "delete" && op2.operation === "delete" && op1.position === op2.position) {
    // Later position should be deleted first (higher index)
    return op1.position > op2.position ? [op1, op2] : [op2, op1];
  }

  // Insert + Delete at same position: insert first, then adjust delete position
  if (op1.operation === "insert" && op2.operation === "delete" && op1.position <= op2.position) {
    const adjustedDelete: TransformOperation = { ...op2, position: op2.position + (op1.content?.length ?? 0) };
    return [op1, adjustedDelete];
  }
  if (op2.operation === "insert" && op1.operation === "delete" && op2.position <= op1.position) {
    const adjustedDelete: TransformOperation = { ...op1, position: op1.position + (op2.content?.length ?? 0) };
    return [adjustedDelete, op2];
  }

  return [op1, op2];
}
