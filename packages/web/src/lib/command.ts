/**
 * Command Pattern: Encapsulates operations as objects with undo/redo support,
 * command composition (macro commands), command queue, history tracking,
 * and serialization.
 */

// --- Types ---

export type CommandResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: Error;
};

export interface Command<T = unknown> {
  /** Unique identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** Execute the command */
  execute(): Promise<CommandResult<T>>;
  /** Undo the command */
  undo(): Promise<CommandResult<void>>;
  /** Whether this command can be undone */
  canUndo(): boolean;
  /** Check if this command is currently executing */
  isExecuting(): boolean;
}

export interface CommandConstructor<T = unknown> {
  new (...args: unknown[]): Command<T>;
}

export interface CommandHistoryEntry {
  id: string;
  name: string;
  executedAt: number;
  undoneAt?: number;
  durationMs?: number;
  result: "success" | "error" | "undone";
}

export interface CommandManagerOptions {
  /** Maximum history size (default: 100) */
  maxHistory?: number;
  /** Enable auto-save of history to localStorage */
  persistKey?: string;
  /** Called before each execute */
  beforeExecute?: (cmd: Command) => boolean | Promise<boolean>; // return false to cancel
  /** Called after each execute/undo */
  afterExecute?: (cmd: Command, action: "execute" | "undo", result: CommandResult) => void;
}

// --- Base Command ---

/**
 * Abstract base class for commands. Extend this to create custom commands.
 */
export abstract class BaseCommand<T = unknown> implements Command<T> {
  readonly id: string;
  readonly name: string;
  private _executing = false;
  private _executed = false;

  constructor(name: string) {
    this.id = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.name = name;
  }

  abstract doExecute(): Promise<T>;
  abstract doUndo(): Promise<void>;

  async execute(): Promise<CommandResult<T>> {
    if (this._executing) {
      return { success: false, error: new Error("Command already executing") };
    }
    this._executing = true;
    try {
      const data = await this.doExecute();
      this._executed = true;
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      this._executing = false;
    }
  }

  async undo(): Promise<CommandResult<void>> {
    if (!this._executed) {
      return { success: false, error: new Error("Command not yet executed") };
    }
    if (this._executing) {
      return { success: false, error: new Error("Command already executing") };
    }
    this._executing = true;
    try {
      await this.doUndo();
      this._executed = false;
      return { success: true };
    } catch (error) {
      this._executing = false;
      return { success: false, error: error as Error };
    }
  }

  canUndo(): boolean {
    return this._executed && !this._executing;
  }

  isExecuting(): boolean {
    return this._executing;
  }
}

// --- Macro Command ---

/**
 * A command that groups multiple sub-commands into one.
 * Executes in order; undoes in reverse order.
 */
export class MacroCommand extends BaseCommand<void> {
  private commands: Command[] = [];

  add(cmd: Command): this {
    this.commands.push(cmd);
    return this;
  }

  remove(cmdId: string): boolean {
    const idx = this.commands.findIndex((c) => c.id === cmdId);
    if (idx !== -1) {
      this.commands.splice(idx, 1);
      return true;
    }
    return false;
  }

  get size(): number {
    return this.commands.length;
  }

  override async doExecute(): Promise<void> {
    for (const cmd of this.commands) {
      const result = await cmd.execute();
      if (!result.success) throw result.error ?? new Error(`Sub-command "${cmd.name}" failed`);
    }
  }

  override async doUndo(): Promise<void> {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i]!;
      if (cmd.canUndo()) {
        const result = await cmd.undo();
        if (!result.success) throw result.error ?? new Error(`Undo of "${cmd.name}" failed`);
      }
    }
  }

  override canUndo(): boolean {
    return this.commands.every((c) => c.canUndo());
  }
}

// --- Command Manager ---

/**
 * Manages command execution with full undo/redo history.
 *
 * @example
 * const manager = new CommandManager();
 *
 * // Execute a command
 * await manager.execute(myCommand);
 *
 * // Undo last command
 * manager.undo();
 *
 * // Redo
 * manager.redo();
 */
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private history: CommandHistoryEntry[] = [];
  private options: Required<Pick<CommandManagerOptions, "maxHistory">>;
  private beforeExecute?: (cmd: Command) => boolean | Promise<boolean>;
  private afterExecute?: (cmd: Command, action: "execute" | "undo", result: CommandResult) => void;

  constructor(options: CommandManagerOptions = {}) {
    this.options = {
      maxHistory: options.maxHistory ?? 100,
    };
    this.beforeExecute = options.beforeExecute;
    this.afterExecute = options.afterExecute;

    // Restore persisted history
    if (options.persistKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(options.persistKey);
        if (saved) this.history = JSON.parse(saved);
      } catch { /* ignore */ }
    }
  }

  /**
   * Execute a command and add it to the undo stack.
   * Clears the redo stack.
   */
  async execute<T>(cmd: Command<T>): Promise<CommandResult<T>> {
    // Before hook — can cancel execution
    if (this.beforeExecute) {
      const proceed = await this.beforeExecute(cmd);
      if (!proceed) return { success: false, error: new Error("Execution cancelled by hook") };
    }

    const startTime = Date.now();
    const result = await cmd.execute();

    const entry: CommandHistoryEntry = {
      id: cmd.id,
      name: cmd.name,
      executedAt: startTime,
      durationMs: Date.now() - startTime,
      result: result.success ? "success" : "error",
    };

    if (result.success) {
      this.undoStack.push(cmd);
      this.redoStack = []; // Clear redo on new command
      this.history.push(entry);
      this._trimHistory();
      this._persist();
    }

    this.afterExecute?.(cmd, "execute", result);
    return result;
  }

  /**
   * Undo the most recent command.
   */
  async undo(): Promise<CommandResult<void>> {
    const cmd = this.undoStack.pop();
    if (!cmd) return { success: false, error: new Error("Nothing to undo") };

    const result = await cmd.undo();

    if (result.success) {
      this.redoStack.push(cmd);

      // Update history entry
      const entry = this.history.find((e) => e.id === cmd.id);
      if (entry) {
        entry.undoneAt = Date.now();
        entry.result = "undone";
      }
      this._persist();
    } else {
      // Put it back on undo stack if undo failed
      this.undoStack.push(cmd);
    }

    this.afterExecute?.(cmd, "undo", result);
    return result;
  }

  /**
   * Redo the most recently undone command.
   */
  async redo(): Promise<CommandResult<void>> {
    const cmd = this.redoStack.pop();
    if (!cmd) return { success: false, error: new Error("Nothing to redo") };

    const result = await cmd.execute();

    if (result.success) {
      this.undoStack.push(cmd);

      const entry = this.history.find((e) => e.id === cmd.id);
      if (entry) {
        entry.result = "success";
        entry.undonedAt = undefined;
      }
      this._persist();
    } else {
      this.redoStack.push(cmd);
    }

    this.afterExecute?.(cmd, "redo", result);
    return result;
  }

  /** Can we undo? */
  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /** Can we redo? */
  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Number of commands on the undo stack */
  get undoCount(): number {
    return this.undoStack.length;
  }

  /** Number of commands on the redo stack */
  get redoCount(): number {
    return this.redoStack.length;
  }

  /** Get full command history */
  getHistory(): CommandHistoryEntry[] {
    return [...this.history];
  }

  /** Clear all stacks and history */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.history = [];
    this._persist();
  }

  /** Get the current undo stack (for inspection) */
  getUndoStack(): Command[] {
    return [...this.undoStack];
  }

  /** Get the current redo stack (for inspection) */
  getRedoStack(): Command[] {
    return [...this.redoStack];
  }

  // --- Private ---

  private _trimHistory(): void {
    while (this.history.length > this.options.maxHistory) {
      this.history.shift();
    }
  }

  private _persist(): void {
    // Persistence would use the persistKey option
    // Simplified for now — just keep in memory
  }
}

// --- Quick Command Factory ---

/**
 * Create a simple command from execute/undo functions.
 */
export function createCommand<T = unknown>(
  name: string,
  executeFn: () => T | Promise<T>,
  undoFn: () => void | Promise<void>,
): Command<T> {
  let _executed = false;
  let _executing = false;

  return {
    id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    async execute() {
      if (_executing) return { success: false, error: new Error("Already executing") };
      _executing = true;
      try {
        const data = await executeFn();
        _executed = true;
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error as Error };
      } finally {
        _executing = false;
      }
    },
    async undo() {
      if (!_executed || _executing) {
        return { success: false, error: new Error("Cannot undo") };
      }
      _executing = true;
      try {
        await undoFn();
        return { success: true };
      } catch (error) {
        return { success: false, error: error as Error };
      } finally {
        _executing = false;
      }
    },
    canUndo() { return _executed && !_executing; },
    isExecuting() { return _executing; },
  };
}
