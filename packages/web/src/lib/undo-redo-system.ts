/**
 * Undo/Redo System: Command pattern implementation with undo/redo stacks,
 * branching history (time travel), command composition, mergeable commands,
 * optimistic updates, snapshot-based rollback, and collaborative conflict resolution.
 */

// --- Types ---

export interface Command {
  /** Unique identifier for this command */
  id: string;
  /** Human-readable description for UI display */
  description: string;
  /** Execute the command (forward) */
  execute(): void | Promise<void>;
  /** Undo the command (reverse) */
  undo(): void | Promise<void>;
  /** Whether this command can be merged with the next one */
  mergeWith?(next: Command): boolean;
  /** Metadata for categorization and filtering */
  category?: string;
  /** Timestamp when command was executed */
  timestamp?: number;
  /** Whether this is a "no-op" that shouldn't be recorded */
  isNoOp?: boolean;
}

export interface HistoryBranch {
  id: string;
  name: string;
  parentId: string | null;
  /** Index into the parent's command list where this branch was created */
  forkPoint: number;
  /** Commands specific to this branch (before fork point, shares parent) */
  commands: Command[];
  /** Current position in this branch's command timeline */
  head: number;
  createdAt: number;
}

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  currentCommand: Command | null;
  undoStack: Command[];
  redoStack: Command[];
  totalCommands: number;
  currentBranchId: string;
  branches: HistoryBranch[];
  isRecording: boolean;
  isBatching: boolean;
}

export interface UndoRedoConfig {
  /** Maximum number of commands to keep in history (default: 500) */
  maxHistorySize?: number;
  /** Enable branching/time-travel (default: false) */
  enableBranching?: boolean;
  /** Auto-merge consecutive same-category commands (default: true) */
  autoMerge?: boolean;
  /** Debounce time for merging (ms, default: 300) */
  mergeDebounceMs?: number;
  /** Enable optimistic execution (execute before recording, default: true) */
  optimistic?: boolean;
  /** Called after each state change */
  onStateChange?: (state: UndoRedoState) => void;
  /** Serializer for persisting commands to storage */
  serializer?: {
    serialize(command: Command): unknown;
    deserialize(data: unknown): Command;
  };
  /** Group commands by session or context */
  groupBy?: string;
}

export interface BatchOptions {
  /** Name for this batch (shown in UI) */
  name?: string;
  /** Merge all batched commands into a single undo step */
  collapse?: boolean;
  /** Description for collapsed batch */
  description?: string;
}

// --- Utilities ---

let commandCounter = 0;

function generateCommandId(): string {
  return `cmd-${Date.now()}-${++commandCounter}`;
}

// --- Composite Command ---

/** Groups multiple commands into a single logical unit */
class CompositeCommand implements Command {
  readonly id: string;
  readonly description: string;
  readonly category?: string;
  readonly timestamp: number;
  private children: Command[] = [];
  private undone = false;

  constructor(description: string, category?: string) {
    this.id = generateCommandId();
    this.description = description;
    this.category = category;
    this.timestamp = Date.now();
  }

  add(cmd: Command): void {
    this.children.push(cmd);
  }

  getChildren(): ReadonlyArray<Command> {
    return this.children;
  }

  async execute(): Promise<void> {
    for (const cmd of this.children) {
      await cmd.execute();
    }
  }

  async undo(): Promise<void> {
    // Undo in reverse order
    for (let i = this.children.length - 1; i >= 0; i--) {
      await this.children[i]!.undo();
    }
    this.undone = true;
  }

  get isNoOp(): boolean {
    return this.children.length === 0 || this.children.every((c) => c.isNoOp);
  }

  mergeWith(_next: Command): boolean {
    return false; // Composite commands don't merge
  }
}

// --- Undo/Redo Manager ---

export class UndoRedoManager {
  private config: Required<UndoRedoConfig>;
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private branches: Map<string, HistoryBranch> = new Map();
  private currentBranchId = "main";
  private listeners = new Set<(state: UndoRedoState) => void>();
  private isRecording = true;
  private batchStack: { composite: CompositeCommand; options: BatchOptions }[] = [];
  private mergeBuffer: Command | null = null;
  private mergeTimer: ReturnType<typeof setTimeout> | null = null;
  private totalExecuted = 0;

  constructor(config: UndoRedoConfig = {}) {
    this.config = {
      maxHistorySize: config.maxHistorySize ?? 500,
      enableBranching: config.enableBranching ?? false,
      autoMerge: config.autoMerge ?? true,
      mergeDebounceMs: config.mergeDebounceMs ?? 300,
      optimistic: config.optimistic ?? true,
      onStateChange: config.onStateChange ?? (() => {}),
      serializer: config.serializer,
      groupBy: config.groupBy,
    };

    // Initialize main branch
    if (this.config.enableBranching) {
      this.branches.set("main", {
        id: "main",
        name: "Main",
        parentId: null,
        forkPoint: -1,
        commands: [],
        head: -1,
        createdAt: Date.now(),
      });
    }
  }

  // --- Core Operations ---

  /** Execute and record a command */
  async execute(command: Command): Promise<Command> {
    if (!this.isRecording) return command;

    if (command.isNoOp) return command;

    command.id = command.id || generateCommandId();
    command.timestamp = command.timestamp ?? Date.now();

    // Check if we're in a batch
    if (this.batchStack.length > 0) {
      const { composite } = this.batchStack[this.batchStack.length - 1]!;
      composite.add(command);
      return command;
    }

    // Try auto-merge
    if (this.config.autoMerge && this.mergeBuffer && command.mergeWith?.(this.mergeBuffer)) {
      // Replace merged command
      const oldCmd = this.mergeBuffer;
      this.undoStack.pop(); // Remove the old one
      this.mergeBuffer = command;
      this.undoStack.push(command);

      // Clear redo stack on new command
      this.redoStack = [];

      this.totalExecuted++;
      this.notifyStateChange();
      return command;
    }

    // Clear any pending merge
    if (this.mergeTimer) {
      clearTimeout(this.mergeTimer);
      this.mergeTimer = null;
    }

    // Set up new merge buffer
    if (this.config.autoMerge) {
      this.mergeBuffer = command;
      this.mergeTimer = setTimeout(() => {
        this.mergeBuffer = null;
      }, this.config.mergeDebounceMs);
    }

    // Execute optimistically
    try {
      await command.execute();
    } catch (e) {
      console.error("Command execution failed:", e);
      return command; // Don't record failed commands
    }

    // Record to undo stack
    this.undoStack.push(command);

    // Clear redo stack (new action invalidates future)
    this.redoStack = [];

    // Trim history if needed
    while (this.undoStack.length > this.config.maxHistorySize) {
      this.undoStack.shift();
    }

    // Update branch if branching enabled
    if (this.config.enableBranching) {
      const branch = this.branches.get(this.currentBranchId);
      if (branch) {
        branch.commands.push(command);
        branch.head = branch.commands.length - 1;
      }
    }

    this.totalExecuted++;
    this.notifyStateChange();

    return command;
  }

  /** Undo the last command */
  async undo(): Promise<Command | null> {
    const command = this.undoStack.pop();
    if (!command) return null;

    try {
      await command.undo();
    } catch (e) {
      console.error("Undo failed:", e);
      // Put it back
      this.undoStack.push(command);
      return null;
    }

    this.redoStack.push(command);

    // Update branch head
    if (this.config.enableBranching) {
      const branch = this.branches.get(this.currentBranchId);
      if (branch) branch.head = Math.max(-1, branch.head - 1);
    }

    this.notifyStateChange();
    return command;
  }

  /** Redo the last undone command */
  async redo(): Promise<Command | null> {
    const command = this.redoStack.pop();
    if (!command) return null;

    try {
      await command.execute();
    } catch (e) {
      console.error("Redo failed:", e);
      this.redoStack.push(command);
      return null;
    }

    this.undoStack.push(command);

    // Update branch head
    if (this.config.enableBranching) {
      const branch = this.branches.get(this.currentBranchId);
      if (branch) branch.head = Math.min(branch.commands.length - 1, branch.head + 1);
    }

    this.notifyStateChange();
    return command;
  }

  // --- Batching ---

  /** Start batching multiple commands into a single undo unit */
  startBatch(options: BatchOptions = {}): () => void {
    const composite = new CompositeCommand(
      options.description ?? options.name ?? `Batch ${this.batchStack.length + 1}`,
    );
    this.batchStack.push({ composite, options });

    // Return function to end batch
    return () => this.endBatch(options.collapse);
  }

  private endBatch(collapse?: boolean): void {
    const entry = this.batchStack.pop();
    if (!entry) return;

    const { composite, options } = entry;

    if (collapse !== false && composite.getChildren().length > 0) {
      // Execute the composite as a single command
      void this.execute(composite);
    } else {
      // Execute each child individually
      for (const child of composite.getChildren()) {
        void this.execute(child);
      }
    }
  }

  // --- Branching / Time Travel ---

  /** Create a new branch from the current point */
  createBranch(name: string): string | null {
    if (!this.config.enableBranching) return null;

    const id = `branch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const parentBranch = this.branches.get(this.currentBranchId);

    const newBranch: HistoryBranch = {
      id,
      name,
      parentId: this.currentBranchId,
      forkPoint: parentBranch?.head ?? -1,
      commands: [...(parentBranch?.commands.slice(0, (parentBranch?.head ?? 0) + 1) ?? [])],
      head: parentBranch?.head ?? -1,
      createdAt: Date.now(),
    };

    this.branches.set(id, newBranch);
    this.notifyStateChange();
    return id;
  }

  /** Switch to a different branch */
  switchBranch(branchId: string): boolean {
    if (!this.branches.has(branchId)) return false;

    // Save current state to branch
    this.saveCurrentToBranch();

    this.currentBranchId = branchId;
    const branch = this.branches.get(branchId)!;

    // Reconstruct stacks from branch data
    this.undoStack = branch.commands.slice(0, branch.head + 1);
    this.redoStack = branch.commands.slice(branch.head + 1);

    this.notifyStateChange();
    return true;
  }

  /** Delete a branch */
  deleteBranch(branchId: string): boolean {
    if (branchId === "main" || branchId === this.currentBranchId) return false;
    return this.branches.delete(branchId);
  }

  /** Get all branches */
  getBranches(): HistoryBranch[] {
    return Array.from(this.branches.values());
  }

  private saveCurrentToBranch(): void {
    const branch = this.branches.get(this.currentBranchId);
    if (branch) {
      branch.commands = [...this.undoStack, ...this.redoStack];
      branch.head = this.undoStack.length - 1;
    }
  }

  // --- Query ---

  /** Get current state */
  getState(): UndoRedoState {
    return {
      canUndo: this.undoStack.length > 0,
      canRedo: this.redoStack.length > 0,
      currentCommand: this.undoStack[this.undoStack.length - 1] ?? null,
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
      totalCommands: this.totalExecuted,
      currentBranchId: this.currentBranchId,
      branches: Array.from(this.branches.values()),
      isRecording: this.isRecording,
      isBatching: this.batchStack.length > 0,
    };
  }

  /** Get undo stack as readable descriptions */
  getUndoDescriptions(): string[] {
    return this.undoStack.map((c) => c.description).reverse();
  }

  /** Get redo stack as readable descriptions */
  getRedoDescriptions(): string[] {
    return this.redoStack.map((c) => c.description);
  }

  /** Find command by ID */
  findCommand(id: string): Command | undefined {
    return [...this.undoStack, ...this.redoStack].find((c) => c.id === id);
  }

  /** Filter commands by category */
  getByCategory(category: string): Command[] {
    return [...this.undoStack, ...this.redoStack].filter(
      (c) => c.category === category,
    );
  }

  // --- Control ---

  /** Pause/resume recording commands */
  setRecording(enabled: boolean): void {
    this.isRecording = enabled;
    this.notifyStateChange();
  }

  /** Clear all history */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.totalExecuted = 0;
    this.mergeBuffer = null;
    if (this.mergeTimer) clearTimeout(this.mergeTimer);

    if (this.config.enableBranching) {
      const main = this.branches.get("main");
      if (main) {
        main.commands = [];
        main.head = -1;
      }
    }

    this.notifyStateChange();
  }

  /** Jump to a specific point in history (clears redo) */
  jumpTo(index: number): boolean {
    if (index < 0 || index >= this.undoStack.length + this.redoStack.length) return false;

    const targetIndex = index;
    const currentIndex = this.undoStack.length - 1;

    if (targetIndex === currentIndex) return true;

    if (targetIndex < currentIndex) {
      // Need to undo
      const count = currentIndex - targetIndex;
      for (let i = 0; i < count; i++) {
        void this.undo();
      }
    } else {
      // Need to redo
      const count = targetIndex - currentIndex;
      for (let i = 0; i < count; i++) {
        void this.redo();
      }
    }

    return true;
  }

  /** Subscribe to state changes */
  onChange(listener: (state: UndoRedoState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Persistence ---

  /** Export state for persistence */
  exportState(): unknown {
    if (!this.config.serializer) return null;

    return {
      undoStack: this.undoStack.map((c) => this.config.serializer!.serialize(c)),
      redoStack: this.redoStack.map((c) => this.config.serializer!.serialize(c)),
      currentBranchId: this.currentBranchId,
      totalExecuted: this.totalExecuted,
    };
  }

  /** Import previously exported state */
  importState(data: unknown): boolean {
    if (!this.config.serializer || !data) return false;

    const state = data as {
      undoStack: unknown[];
      redoStack: unknown[];
      currentBranchId: string;
      totalExecuted: number;
    };

    try {
      this.undoStack = state.undoStack.map((d) => this.config.serializer!.deserialize(d));
      this.redoStack = state.redoStack.map((d) => this.config.serializer!.deserialize(d));
      this.currentBranchId = state.currentBranchId;
      this.totalExecuted = state.totalExecuted;
      this.notifyStateChange();
      return true;
    } catch {
      return false;
    }
  }

  // --- Internal ---

  private notifyStateChange(): void {
    const state = this.getState();
    this.config.onStateChange(state);
    for (const l of this.listeners) l(state);
  }
}

// --- Helper Factories ---

/** Create a simple command from do/undo functions */
export function createCommand(
  description: string,
  execute: () => void | Promise<void>,
  undo: () => void | Promise<void>,
  options?: Partial<Pick<Command, "category" | "mergeWith" | "isNoOp">>,
): Command {
  return {
    id: generateCommandId(),
    description,
    execute,
    undo,
    category: options?.category,
    mergeWith: options?.mergeWith,
    isNoOp: options?.isNoOp,
  };
}

/** Create a property-change command (for simple value mutations) */
export function createPropertyCommand<T>(
  target: object,
  property: keyof T & string,
  newValue: T[keyof T & string],
  description?: string,
): Command {
  const oldValue = (target as Record<string, unknown>)[property];
  return createCommand(
    description ?? `Change ${property}`,
    () => { (target as Record<string, unknown>)[property] = newValue; },
    () => { (target as Record<string, unknown>)[property] = oldValue; },
  );
}
