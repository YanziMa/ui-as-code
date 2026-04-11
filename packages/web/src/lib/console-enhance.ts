/**
 * Console Enhancement: Enhanced console methods with formatting,
 * grouping, filtering, persistence, pretty-printing,
 * and production-safe console utilities.
 */

// --- Types ---

export interface ConsoleGroupOptions {
  /** Group label */
  label?: string;
  /** Collapse group by default? */
  collapsed?: boolean;
  /** Color for the group header */
  color?: string;
}

export interface ConsoleFilterOptions {
  /** Only show logs matching this pattern (regex string) */
  allowPattern?: string;
  /** Hide logs matching this pattern */
  blockPattern?: string;
  /** Only show specific log types */
  types?: Array<"log" | "warn" | "error" | "info" | "debug">;
  /** Maximum entries to keep (FIFO) */
  maxEntries?: number;
}

interface LogEntry {
  type: string;
  args: unknown[];
  timestamp: number;
}

// --- Enhanced Console ---

class EnhancedConsole {
  private originalConsole: Console;
  private entries: LogEntry[] = [];
  private filter: ConsoleFilterOptions | null = null;
  private intercepting = false;

  constructor() {
    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug?.bind(console) ?? console.log.bind(console),
    };
  }

  /** Start intercepting all console output */
  startIntercepting(options?: ConsoleFilterOptions): () => void {
    if (this.intercepting) return () => {};

    this.filter = options ?? null;
    this.entries = [];
    this.intercepting = true;

    const self = this;

    console.log = function (...args: unknown[]) {
      self.capture("log", args);
      self.originalConsole.log.apply(console, args as []);
    };

    console.warn = function (...args: unknown[]) {
      self.capture("warn", args);
      self.originalConsole.warn.apply(console, args as []);
    };

    console.error = function (...args: unknown[]) {
      self.capture("error", args);
      self.originalConsole.error.apply(console, args as []);
    };

    console.info = function (...args: unknown[]) {
      self.capture("info", args);
      self.originalConsole.info.apply(console, args as []);
    };

    if (this.originalConsole.debug) {
      console.debug = function (...args: unknown[]) {
        self.capture("debug", args);
        self.originalConsole.debug.apply(console, args as []);
      };
    }

    return () => this.stopIntercepting();
  }

  /** Stop intercepting and restore original console */
  stopIntercepting(): void {
    if (!this.intercepting) return;

    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    if (this.originalConsole.debug) {
      console.debug = this.originalConsole.debug;
    }
    this.intercepting = false;
  }

  /** Get captured entries */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /** Get entries filtered by current filter settings */
  getFilteredEntries(): LogEntry[] {
    let result = [...this.entries];

    if (this.filter) {
      if (this.filter.allowPattern) {
        const regex = new RegExp(this.filter.allowPattern);
        result = result.filter((e) =>
          regex.test(e.args.map(String).join(" "))
        );
      }
      if (this.filter.blockPattern) {
        const regex = new RegExp(this.filter.blockPattern);
        result = result.filter((e) =>
          !regex.test(e.args.map(String).join(" "))
        );
      }
      if (this.filter.types) {
        const allowed = new Set(this.filter.types);
        result = result.filter((e) => allowed.has(e.type));
      }
      if (this.filter.maxEntries && result.length > this.filter.maxEntries) {
        result = result.slice(-this.filter.maxEntries);
      }
    }

    return result;
  }

  /** Clear captured entries */
  clearEntries(): void {
    this.entries = [];
  }

  /** Export entries as structured data */
  exportEntries(): Array<{ type: string; message: string; timestamp: string }> {
    return this.entries.map((e) => ({
      type: e.type,
      message: e.args.map(String).join(" "),
      timestamp: new Date(e.timestamp).toISOString(),
    }));
  }

  private capture(type: string, args: unknown[]): void {
    this.entries.push({ type, args, timestamp: Date.now() });
  }
}

// --- Instance ---

let instance: EnhancedConsole | null = null;

function getInstance(): EnhancedConsole {
  if (!instance) instance = new EnhancedConsole();
  return instance;
}

// --- Public API ---

/**
 * Start capturing console output. Returns unsubscribe function.
 */
export function interceptConsole(options?: ConsoleFilterOptions): () => void {
  return getInstance().startIntercepting(options);
}

/**
 * Stop capturing and get all captured entries.
 */
export function stopConsoleCapture(): LogEntry[] {
  const entries = getInstance().getFilteredEntries();
  getInstance().stopIntercepting();
  return entries;
}

/**
 * Get currently captured entries without stopping.
 */
export function getCapturedLogs(): LogEntry[] {
  return getInstance().getFilteredEntries();
}

// --- Pretty Printing ---

/** Pretty-print an object with syntax highlighting (basic ANSI colors) */
export function prettyPrint(obj: unknown, options?: { indent?: number; depth?: number; colors?: boolean }): string {
  const indent = options?.indent ?? 2;
  const depth = options?.depth ?? 5;
  const useColors = options?.colors ?? true;

  let level = 0;
  const seen = new WeakSet<object>();

  function format(value: unknown): string {
    if (level > depth || value == null) return String(value);

    if (typeof value === "string") {
      return useColors ? `\x1b[36m"${value}"\x1b[0m` : `"${value}"`;
    }
    if (typeof value === "number") {
      return useColors ? `\x1b[33m${value}\x1b[0m` : String(value);
    }
    if (typeof value === "boolean") {
      return useColors ? `\x1b[${value ? "32" : "31"}m${value}\x1b[0m` : String(value);
    }
    if (Array.isArray(value)) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
      level++;
      const items = value.map(format).join(`,\x1b[0m `);
      level--;
      return `[${items}]`;
    }
    if (typeof value === "object") {
      if (seen.has(value)) return "{Circular}";
      seen.add(value);
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return "{}";
      level++;
      const pairs = entries.map(([k, v]) => {
        const key = useColors ? `\x1b[34m${k}\x1b[0m` : k;
        return `${key}: ${format(v)}`;
      }).join(`,\x1b[0m `);
      level--;
      return `{${pairs}}`;
    }

    return String(value);
  }

  return format(obj);
}

// --- Grouped Logging ---

/**
 * Create a labeled console group. Returns end function.
 */
export function group(options?: ConsoleGroupOptions): () => void {
  const label = options?.label ?? "";
  const collapsed = options?.collapsed ?? false;

  if (collapsed) {
    console.groupCollapsed(label);
  } else {
    console.group(label);
  }

  return () => { console.groupEnd(); };
}

/**
 * Execute code within a console group.
 */
export function grouped<T>(label: string, fn: () => T): T {
  console.group(label);
  try {
    return fn();
  } finally {
    console.groupEnd();
  }
}

// --- Table Display ---

/**
 * Display data as a console.table if available, fallback to JSON.
 */
export function showTable(data: Record<string, unknown>[], columns?: string[]): void {
  if (typeof console.table === "function") {
    console.table(data, columns);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

// --- Counters ---

const counters = new Map<string, number>();

/**
 * Increment a named counter and display it.
 */
export function count(label: string, incrementBy = 1): number {
  const current = (counters.get(label) ?? 0) + incrementBy;
  counters.set(label, current);
  console.log(`[Count] ${label}: ${current}`);
  return current;
}

/**
 * Reset a counter to zero.
 */
export function resetCounter(label: string): void {
  counters.delete(label);
}

/**
 * Show all active counters.
 */
export function showCounters(): void {
  if (counters.size === 0) {
    console.log("[Count] No active counters");
    return;
  }
  for (const [label, value] of counters) {
    console.log(`[Count] ${label}: ${value}`);
  }
}
