/**
 * Undo Manager: Command-pattern-based undo/redo system with grouped operations,
 * branching history (git-like branches), merge capability, stack size limits,
 * serialization, selective undo, and time-travel navigation.
 */

// --- Types ---

export type CommandId = string;
export type BranchId = string;
export type GroupId = string;

export interface Command<TState = unknown> {
  id: CommandId;
  name: string;
  /** Apply this command to produce a new state */
  execute: (state: TState) => TState;
  /** Reverse this command to restore previous state */
  undo: (state: TState) => TState;
  /** Timestamp when executed */
  timestamp?: number;
  /** Optional grouping key */
  group?: GroupId;
  /** Metadata for filtering/searching */
  tags?: string[];
  /** Description for UI display */
  description?: string;
  /** Whether this command can be undone */
  undoable?: boolean;
}

export interface HistoryEntry<TState = unknown> {
  command: Command<TState>;
  state: TState;
  /** Index in the linear history */
  index: number;
  /** Branch this entry belongs to */
  branchId: BranchId;
  /** Parent entry (for branching) */
  parentIndex?: number;
}

export interface Branch<TState = unknown> {
  id: BranchId;
  name: string;
  /** Starting point in main history */
  fromIndex: number;
  /** Entries unique to this branch */
  entries: HistoryEntry<TState>[];
  createdAt: number;
  /** Who created this branch */
  author?: string;
}

export interface UndoManagerConfig<TState = unknown> {
  /** Maximum entries in undo stack (default: 100) */
  maxHistorySize?: number;
  /** Initial state */
  initialState?: TState;
  /** Called after every state change */
  onStateChange?: (state: TState, action: "undo" | "redo" | "execute") => void;
  /** Called when history is modified */
  onHistoryChange?: (entries: HistoryEntry<TState>[]) => void;
  /** Enable branching (default: true) */
  enableBranching?: boolean;
  /** Auto-group commands within N ms (default: 500) */
  groupDelayMs?: number;
  /** Serialize state for persistence */
  serializer?: (state: TState) => string;
  /** Deserialize state from persistence */
  deserializer?: (raw: string) => TState;
  /** Debug logging */
  debug?: boolean;
}

export interface UndoStats {
  canUndo: boolean;
  canRedo: boolean;
  undoStackSize: number;
  redoStackSize: number;
  totalEntries: number;
  currentBranch: BranchId | null;
  branchCount: number;
  currentGroup: GroupId | null;
  memoryEstimate: number; // bytes
}

// --- ID Generators ---

let cmdIdCounter = 0;
let branchIdCounter = 0;

function genCmdId(): CommandId { return `cmd_${++cmdIdCounter}_${Date.now().toString(36)}`; }
function genBranchId(): BranchId { return `branch_${++branchIdCounter}_${Date.now().toString(36)}`; }

// --- Undo Manager ---

export class UndoManager<TState = unknown> {
  private config: Required<Pick<UndoManagerConfig<TState>, "maxHistorySize" | "enableBranching" | "groupDelayMs" | "debug">> & Omit<UndoManagerConfig<TState>, "maxHistorySize" | "enableBranching" | "groupDelayMs" | "debug">;

  // Linear history (main trunk)
  private history: HistoryEntry<TState>[] = [];
  // Redo stack (commands that were undone)
  private redoStack: HistoryEntry<TState>[] = [];
  // Current state
  private currentState: TState;
  // Position in history (-1 = before any command)
  private currentIndex = -1;
  // Active branches
  private branches = new Map<BranchId, Branch<TState>>();
  // Current active branch (null = main trunk)
  private activeBranchId: BranchId | null = null;
  // Group tracking
  private currentGroup: GroupId | null = null;
  private groupTimer: ReturnType<typeof setTimeout> | null = null;
  private groupedCommands: Command<TState>[] = [];
  // Listeners
  private listeners = new Set<(stats: UndoStats) => void>();
  private destroyed = false;

  constructor(config: UndoManagerConfig<TState> = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize ?? 100,
      enableBranching: config.enableBranching ?? true,
      groupDelayMs: config.groupDelayMs ?? 500,
      debug: config.debug ?? false,
      ...config,
    };
    this.currentState = config.initialState as TState ?? {} as TState;
  }

  // --- Core Operations ---

  /**
   * Execute a command and add it to the undo stack.
   */
  execute(command: Command<TState>): TState {
    if (this.destroyed) throw new Error("UndoManager is destroyed");

    const cmd: Command<TState> = {
      ...command,
      id: command.id ?? genCmdId(),
      timestamp: Date.now(),
      undoable: command.undoable !== false,
      group: command.group ?? this.currentGroup ?? undefined,
    };

    // If grouping, buffer the command
    if (this.currentGroup && this.config.groupDelayMs > 0) {
      this.groupedCommands.push(cmd);
      this.resetGroupTimer();
      return this.currentState;
    }

    return this.applyCommand(cmd);
  }

  /**
   * Execute multiple commands as an atomic group.
   */
  executeGroup(commands: Command<TState>[], groupName?: string): TState {
    const groupId = `group_${Date.now().toString(36)}`;
    this.startGroup(groupId);

    let state = this.currentState;
    for (const cmd of commands) {
      state = this.execute({ ...cmd, group: groupId });
    }

    this.endGroup();
    return state;
  }

  /**
   * Undo the last command.
   */
  undo(): TState {
    if (!this.canUndo()) return this.currentState;

    // If on a branch, undo within the branch
    if (this.activeBranchId) {
      return this.undoInBranch();
    }

    const entry = this.history[this.currentIndex]!;
    this.currentIndex--;

    // Move to redo stack
    this.redoStack.push(entry);

    // Recalculate state by replaying up to currentIndex
    this.replayTo(this.currentIndex);

    this.notify();
    this.config.onStateChange?.(this.currentState, "undo");
    return this.currentState;
  }

  /**
   * Redo the next command.
   */
  redo(): TState {
    if (!this.canRedo()) return this.currentState;

    const entry = this.redoStack.pop()!;

    // Re-apply the command
    this.currentState = entry.command.execute(this.currentState);
    this.currentIndex = entry.index;

    this.notify();
    this.config.onStateChange?.(this.currentState, "redo");
    return this.currentState;
  }

  // --- Query ---

  /** Get current state */
  getState(): TState { return this.currentState; }

  /** Check if undo is available */
  canUndo(): boolean {
    if (this.activeBranchId) {
      const branch = this.branches.get(this.activeBranchId);
      return (branch?.entries.length ?? 0) > 0 || this.currentIndex >= 0;
    }
    return this.currentIndex >= 0;
  }

  /** Check if redo is available */
  canRedo(): boolean { return this.redoStack.length > 0; }

  /** Get undo stack (newest first) */
  getUndoStack(): Command<TState>[] {
    return this.history
      .slice(0, this.currentIndex + 1)
      .reverse()
      .map((e) => e.command);
  }

  /** Get redo stack (oldest first) */
  getRedoStack(): Command<TState>[] {
    return this.redoStack.map((e) => e.command);
  }

  /** Get full statistics */
  getStats(): UndoStats {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoStackSize: this.currentIndex + 1,
      redoStackSize: this.redoStack.length,
      totalEntries: this.history.length,
      currentBranch: this.activeBranchId,
      branchCount: this.branches.size,
      currentGroup: this.currentGroup,
      memoryEstimate: JSON.stringify(this.currentState).length + this.history.length * 200,
    };
  }

  /** Get history entries (for timeline display) */
  getHistory(fromIndex?: number, count?: number): HistoryEntry<TState>[] {
    const start = fromIndex ?? 0;
    const end = count ? start + count : undefined;
    return this.history.slice(start, end);
  }

  // --- Grouping ---

  /** Start grouping subsequent executes */
  startGroup(id: GroupId): void {
    this.currentGroup = id;
    this.groupedCommands = [];
  }

  /** End the current group and flush buffered commands */
  endGroup(): void {
    if (this.groupTimer) clearTimeout(this.groupTimer);
    this.groupTimer = null;

    if (this.groupedCommands.length <= 1) {
      // No real grouping needed
      for (const cmd of this.groupedCommands) {
        this.applyCommand(cmd);
      }
    } else {
      // Create a composite command
      const composite: Command<TState> = {
        id: genCmdId(),
        name: `Group (${this.groupedCommands.length} commands)`,
        group: this.currentGroup ?? undefined,
        timestamp: Date.now(),
        execute: (state) => {
          let s = state;
          for (const cmd of this.groupedCommands) s = cmd.execute(s);
          return s;
        },
        undo: (state) => {
          let s = state;
          for (let i = this.groupedCommands.length - 1; i >= 0; i--) {
            s = this.groupedCommands[i]!.undo(s);
          }
          return s;
        },
      };
      this.applyCommand(composite);
    }

    this.currentGroup = null;
    this.groupedCommands = [];
  }

  // --- Branching (Git-like) ---

  /**
   * Create a new branch from the current position.
   */
  createBranch(name: string): BranchId {
    if (!this.config.enableBranching) throw new Error("Branching is disabled");

    const id = genBranchId();
    const branch: Branch<TState> = {
      id,
      name,
      fromIndex: this.currentIndex,
      entries: [],
      createdAt: Date.now(),
    };
    this.branches.set(id, branch);
    return id;
  }

  /** Switch to a branch */
  switchBranch(branchId: BranchId): TState {
    const branch = this.branches.get(branchId);
    if (!branch) throw new Error(`Branch "${branchId}" not found`);

    // Save current position before switching
    this.activeBranchId = branchId;

    // Replay branch state
    if (branch.entries.length > 0) {
      this.currentState = branch.entries[branch.entries.length - 1]!.state;
    } else {
      // Start from the branch point in main history
      this.replayTo(branch.fromIndex);
    }

    this.notify();
    return this.currentState;
  }

  /** Merge a branch back into main trunk */
  mergeBranch(branchId: BranchId): TState {
    const branch = this.branches.get(branchId);
    if (!branch) throw new Error(`Branch "${branchId}" not found`);

    // Append branch entries to main history
    for (const entry of branch.entries) {
      this.addToHistory(entry.command, entry.state);
    }

    // Remove branch
    this.branches.delete(branchId);
    if (this.activeBranchId === branchId) this.activeBranchId = null;

    this.notify();
    this.config.onHistoryChange?.(this.history);
    return this.currentState;
  }

  /** Delete a branch */
  deleteBranch(branchId: BranchId): void {
    this.branches.delete(branchId);
    if (this.activeBranchId === branchId) this.activeBranchId = null;
  }

  /** Get all branches */
  getBranches(): Branch<TState>[] { return Array.from(this.branches.values()); }

  // --- Navigation ---

  /** Jump to a specific point in history (time travel) */
  goTo(index: number): TState {
    if (index < -1 || index >= this.history.length) {
      throw new Error(`Index ${index} out of bounds [0, ${this.history.length})`);
    }

    // Move any skipped entries to redo stack
    while (this.currentIndex > index) {
      this.redoStack.push(this.history[this.currentIndex]!);
      this.currentIndex--;
    }

    // Redo forward if needed
    while (this.currentIndex < index && this.redoStack.length > 0) {
      this.currentIndex++;
      const entry = this.redoStack.pop()!;
      this.currentState = entry.command.execute(this.currentState);
    }

    this.notify();
    this.config.onStateChange?.(this.currentState, "execute");
    return this.currentState;
  }

  /** Jump to the beginning (before all commands) */
  goToStart(): TState { return this.goTo(-1); }

  /** Jump to the end (latest state) */
  goToEnd(): TState {
    while (this.canRedo()) this.redo();
    return this.currentState;
  }

  // --- Selective Undo ---

  /**
   * Undo a specific command (not necessarily the most recent).
   * Replays all later commands on top of the undone state.
   */
  selectiveUndo(commandId: CommandId): TState {
    const targetIdx = this.history.findIndex((e) => e.command.id === commandId);
    if (targetIdx < 0 || targetIdx > this.currentIndex) throw new Error("Cannot undo this command");

    const targetEntry = this.history[targetIdx]!;
    if (targetEntry.command.undoable === false) throw new Error("Command is not undoable");

    // Save state at target
    const stateBeforeTarget = targetIdx > 0 ? this.history[targetIdx - 1]!.state : this.config.initialState as TState;

    // Undo just this command
    const undoneState = targetEntry.command.undo(
      targetIdx > 0 ? this.history[targetIdx - 1]!.state : this.config.initialState as TState,
    );

    // Replace the target entry's state with undone version
    // Then replay everything after it
    let state = undoneState;
    for (let i = targetIdx + 1; i <= this.currentIndex; i++) {
      state = this.history[i]!.command.execute(state);
      this.history[i] = { ...this.history[i]!, state };
    }

    this.currentState = state;
    this.notify();
    this.config.onStateChange?.(this.currentState, "undo");
    return this.currentState;
  }

  // --- Persistence ---

  /** Export history as serializable data */
  exportHistory(): { history: Array<{ command: Omit<Command, "execute" | "undo">; state: string }>; index: number } {
    const serialized = this.history.map((entry) => ({
      command: {
        id: entry.command.id,
        name: entry.command.name,
        timestamp: entry.command.timestamp,
        group: entry.command.group,
        tags: entry.command.tags,
        description: entry.command.description,
        undoable: entry.command.undoable,
      },
      state: this.config.serializer ? this.config.serializer(entry.state) : JSON.stringify(entry.state),
    }));

    return { history: serialized, index: this.currentIndex };
  }

  /** Import previously exported history */
  importHistory(data: { history: Array<{ command: Partial<Command>; state: string }>; index: number }): void {
    this.clear();

    for (const item of data.history) {
      const cmd = item.command as Command<TState>;
      const state = this.config.deserializer
        ? this.config.deserializer(item.state)
        : JSON.parse(item.state) as TState;

      // Reconstruct minimal command objects for display
      this.addToHistory({
        id: cmd.id ?? genCmdId(),
        name: cmd.name ?? "Imported",
        execute: (_s) => state,
        undo: (_s) => this.config.initialState as TState,
        timestamp: cmd.timestamp,
        group: cmd.group,
        tags: cmd.tags,
        description: cmd.description,
        undoable: cmd.undoable,
      }, state);
    }

    this.currentIndex = Math.min(data.index, this.history.length - 1);
    if (this.currentIndex >= 0) {
      this.currentState = this.history[this.currentIndex]!.state;
    }
    this.notify();
  }

  // --- Bulk Operations ---

  /** Clear all history */
  clear(): void {
    this.history = [];
    this.redoStack = [];
    this.currentIndex = -1;
    this.branches.clear();
    this.activeBranchId = null;
    this.currentGroup = null;
    this.groupedCommands = [];
    this.currentState = this.config.initialState as TState ?? {} as TState;
    this.notify();
  }

  /** Trim history to max size (removes oldest) */
  trim(): number {
    const removed = Math.max(0, this.history.length - this.config.maxHistorySize);
    if (removed > 0) {
      this.history = this.history.slice(removed);
      this.currentIndex -= removed;
      // Adjust branch fromIndex values
      for (const [, branch] of this.branches) {
        branch.fromIndex = Math.max(-1, branch.fromIndex - removed);
      }
    }
    return removed;
  }

  // --- Events ---

  subscribe(listener: (stats: UndoStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clear();
    this.listeners.clear();
    if (this.groupTimer) clearTimeout(this.groupTimer);
  }

  // --- Internal ---

  private applyCommand(cmd: Command<TState>): TState {
    this.currentState = cmd.execute(this.currentState);
    this.addToHistory(cmd, this.currentState);

    // Clear redo stack on new command
    this.redoStack = [];

    // Trim if needed
    if (this.history.length > this.config.maxHistorySize) this.trim();

    this.notify();
    this.config.onStateChange?.(this.currentState, "execute");
    return this.currentState;
  }

  private addToHistory(command: Command<TState>, state: TState): void {
    const entry: HistoryEntry<TState> = {
      command,
      state,
      index: this.history.length,
      branchId: this.activeBranchId ?? "main",
    };

    if (this.activeBranchId) {
      const branch = this.branches.get(this.activeBranchId);
      if (branch) {
        branch.entries.push(entry);
      }
    } else {
      this.history.push(entry);
      this.currentIndex = this.history.length - 1;
    }

    this.config.onHistoryChange?.(this.history);
  }

  private replayTo(targetIndex: number): void {
    if (targetIndex < 0) {
      this.currentState = this.config.initialState as TState;
      return;
    }

    // Start from initial or nearest safe point
    let state = this.config.initialState as TState;
    for (let i = 0; i <= targetIndex; i++) {
      state = this.history[i]!.command.execute(state);
    }
    this.currentState = state;
  }

  private undoInBranch(): TState {
    const branch = this.branches.get(this.activeBranchId!);
    if (!branch || branch.entries.length === 0) {
      // Fall back to main trunk undo
      return this.undo();
    }

    const entry = branch.entries.pop()!;
    this.currentState = entry.command.undo(
      branch.entries.length > 0
        ? branch.entries[branch.entries.length - 1]!.state
        : (this.history[branch.fromIndex]?.state ?? this.config.initialState) as TState,
    );

    this.redoStack.push(entry);
    this.notify();
    this.config.onStateChange?.(this.currentState, "undo");
    return this.currentState;
  }

  private resetGroupTimer(): void {
    if (this.groupTimer) clearTimeout(this.groupTimer);
    this.groupTimer = setTimeout(() => {
      if (this.currentGroup) this.endGroup();
    }, this.config.groupDelayMs);
  }

  private notify(): void {
    const stats = this.getStats();
    for (const l of this.listeners) l(stats);
  }
}
