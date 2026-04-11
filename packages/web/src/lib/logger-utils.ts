/**
 * Logger Utilities: Structured logging with levels, formatters, transports,
 * log filtering, performance timing, error tracking, and browser console
 * output with optional remote transport.
 */

// --- Types ---

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal" | "silent";

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  msSinceStart: number;
  tags?: string[];
  source?: string;
  error?: Error;
  duration?: number;
}

export type LogTransport = (entry: LogEntry) => void;

export type LogFormatter = (entry: LogEntry) => string;

export interface LoggerOptions {
  /** Minimum level to log. Default "info" */
  level?: LogLevel;
  /** Custom name for this logger instance */
  name?: string;
  /** Enable timestamps in output. Default true */
  timestamps?: boolean;
  /** Include file/line info where available. Default false */
  includeSource?: boolean;
  /** Custom transports (in addition to console). Default [] */
  transports?: LogTransport[];
  /** Custom formatter for console output */
  formatter?: LogFormatter;
  /** Prefix all messages with this string */
  prefix?: string;
  /** Tags to attach to every log entry */
  defaultTags?: string[];
  /** Max entries kept in history buffer. Default 100 */
  historySize?: number;
  /** Whether to colorize console output. Default true in browsers */
  colors?: boolean;
  /** Callback when a fatal error is logged */
  onFatal?: (entry: LogEntry) => void;
}

// --- Level Constants ---

const LEVELS: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
  silent: 6,
};

const LEVEL_NAMES: Record<LogLevel, string> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO ",
  warn: "WARN ",
  error: "ERROR",
  fatal: "FATAL",
  silent: "",
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "color: #888",
  debug: "color: #6b7280",
  info:  "color: #3b82f6",
  warn:  "color: #f59e0b",
  error: "color: #ef4444",
  fatal: "color: #dc2626; font-weight: bold",
  silent: "",
};

// --- Console Transport ---

function consoleTransport(entry: LogEntry): void {
  const { level, message, data } = entry;
  const args: unknown[] = [];

  if (data && Object.keys(data).length > 0) {
    args.push(data);
  }
  if (entry.error) {
    args.push(entry.error);
  }

  switch (level) {
    case "trace":
    case "debug":
      console.debug(`[${LEVEL_NAMES[level]}]`, message, ...args);
      break;
    case "info":
      console.info(`[${LEVEL_NAMES[level]}]`, message, ...args);
      break;
    case "warn":
      console.warn(`[${LEVEL_NAMES[level]}]`, message, ...args);
      break;
    case "error":
    case "fatal":
      console.error(`[${LEVEL_NAMES[level]}]`, message, ...args);
      break;
  }
}

// --- Formatters ---

/** Simple text formatter: "[TIMESTAMP] [LEVEL] message {data}" */
export function textFormatter(entry: LogEntry): string {
  const parts: string[] = [];
  parts.push(`[${entry.timestamp}]`);
  parts.push(`[${LEVEL_NAMES[entry.level].trim()}]`);
  if (entry.source) parts.push(`[${entry.source}]`);
  if (entry.tags?.length) parts.push(`[${entry.tags.join(",")}]`);
  parts.push(entry.message);
  if (entry.data && Object.keys(entry.data).length > 0) {
    parts.push(JSON.stringify(entry.data));
  }
  return parts.join(" ");
}

/** JSON formatter for structured logging pipelines */
export function jsonFormatter(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/** Compact single-line formatter */
export function compactFormatter(entry: LogEntry): string {
  const tagStr = entry.tags?.length ? `[${entry.tags.join(",")}] ` : "";
  return `${tagStr}${entry.message}`;
}

// --- Core Logger ---

/**
 * Structured logger with levels, transports, history buffer, and child loggers.
 *
 * @example
 * ```ts
 * const log = new Logger({ name: "MyApp", level: "debug" });
 * log.info("App started", { version: "1.0.0" });
 * log.error("Failed to fetch", {}, err);
 * ```
 */
export class Logger {
  private options: Required<Omit<LoggerOptions, "onFatal">> & Pick<LoggerOptions, "onFatal">;
  private startTime: number;
  private history: LogEntry[] = [];
  private childLoggers = new Map<string, Logger>();

  constructor(options: LoggerOptions = {}) {
    this.startTime = performance.now();
    this.options = {
      level: options.level ?? "info",
      name: options.name ?? "app",
      timestamps: options.timestamps ?? true,
      includeSource: options.includeSource ?? false,
      transports: options.transports ?? [],
      formatter: options.formatter ?? textFormatter,
      prefix: options.prefix ?? "",
      defaultTags: options.defaultTags ?? [],
      historySize: options.historySize ?? 100,
      colors: options.colors ?? typeof document !== "undefined",
      onFatal: options.onFatal,
    };
  }

  // --- Level methods ---

  trace(message: string, data?: Record<string, unknown>, error?: Error): void {
    this._log("trace", message, data, error);
  }

  debug(message: string, data?: Record<string, unknown>, error?: Error): void {
    this._log("debug", message, data, error);
  }

  info(message: string, data?: Record<string, unknown>, error?: Error): void {
    this._log("info", message, data, error);
  }

  warn(message: string, data?: Record<string, unknown>, error?: Error): void {
    this._log("warn", message, data, error);
  }

  error(message: string, data?: Record<string, unknown>, error?: Error): void {
    this._log("error", message, data, error);
  }

  fatal(message: string, data?: Record<string, unknown>, error?: Error): void {
    this._log("fatal", message, data, error);
    this.options.onFatal?.(this.history[this.history.length - 1]!);
  }

  // --- Timing ---

  /**
   * Start a timer that logs the elapsed time when stopped.
   * Returns a stop function.
   *
   * @example
   * ```ts
   * const end = log.time("API call");
   * await fetchData();
   * end(); // Logs: [INFO ] API call 123ms
   * ```
   */
  time(label: string, level: LogLevel = "info"): () => void {
    const start = performance.now();
    return () => {
      const elapsed = Math.round(performance.now() - start);
      this._log(level, `${label} ${elapsed}ms`, undefined, undefined, elapsed);
    };
  }

  /**
   * Time an async function and log its duration.
   */
  async timeAsync<T>(
    label: string,
    fn: () => Promise<T>,
    level: LogLevel = "info",
  ): Promise<T> {
    const stop = this.time(label, level);
    try {
      const result = await fn();
      stop();
      return result;
    } catch (err) {
      this.error(`${label} failed`, undefined, err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  // --- Child Loggers ---

  /** Create a child logger with inherited config + overrides */
  child(name: string, overrides?: Partial<LoggerOptions>): Logger {
    if (this.childLoggers.has(name)) return this.childLoggers.get(name)!;

    const child = new Logger({
      ...this.options as LoggerOptions,
      name: `${this.options.name}:${name}`,
      ...overrides,
    });

    this.childLoggers.set(name, child);
    return child;
  }

  // --- Configuration ---

  /** Set minimum log level dynamically */
  setLevel(level: LogLevel): void {
    this.options.level = level;
  }

  /** Get current log level */
  getLevel(): LogLevel { return this.options.level; }

  /** Add a transport function */
  addTransport(transport: LogTransport): () => void {
    this.options.transports.push(transport);
    return () => {
      const idx = this.options.transports.indexOf(transport);
      if (idx >= 0) this.options.transports.splice(idx, 1);
    };
  }

  /** Get log history (for debugging / crash reporting) */
  getHistory(): LogEntry[] { return [...this.history]; }

  /** Clear history buffer */
  clearHistory(): void { this.history = []; }

  /** Get recent N entries from history */
  recent(count: number): LogEntry[] {
    return this.history.slice(-count);
  }

  /** Search history by message content or tag */
  search(query: string): LogEntry[] {
    const q = query.toLowerCase();
    return this.history.filter(
      (e) =>
        e.message.toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q)) ||
        e.source?.toLowerCase().includes(q),
    );
  }

  /** Export history as JSON string */
  exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /** Destroy logger and cleanup */
  destroy(): void {
    this.clearHistory();
    this.childLoggers.clear();
  }

  // --- Private ---

  private _log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error,
    duration?: number,
  ): void {
    if (LEVELS[level] < LEVELS[this.options.level]) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: this.options.timestamps ? new Date().toISOString() : "",
      msSinceStart: Math.round(performance.now() - this.startTime),
      tags: [...this.options.defaultTags],
      source: this.options.name,
      error,
      duration,
    };

    // Add to history
    this.history.push(entry);
    if (this.history.length > this.options.historySize) {
      this.history.shift();
    }

    // Console transport (always first)
    consoleTransport(entry);

    // Custom transports
    for (const transport of this.options.transports) {
      try { transport(entry); } catch { /* protect */ }
    }
  }
}

// --- Global Singleton ---

let globalLogger: Logger | null = null;

/** Get or create the global singleton logger */
export function getLogger(options?: LoggerOptions): Logger {
  if (!globalLogger) globalLogger = new Logger(options);
  return globalLogger;
}

/** Destroy the global logger */
export function destroyLogger(): void {
  if (globalLogger) { globalLogger.destroy(); globalLogger = null; }
}

// --- Convenience ---

/** Create a pre-configured logger for a specific module */
export function createModuleLogger(moduleName: string, level: LogLevel = "debug"): Logger {
  return new Logger({ name: moduleName, level, defaultTags: ["module"] });
}

// --- Performance Tracker ---

/**
 * Track multiple named timers with automatic logging on completion.
 */
export class PerfTracker {
  private timers = new Map<string, number>();
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? new Logger({ level: "debug" });
  }

  /** Start a named timer */
  start(name: string): void {
    this.timers.set(name, performance.now());
  }

  /** Stop a named timer and log its duration */
  end(name: string, level: LogLevel = "debug"): number | null {
    const start = this.timers.get(name);
    if (!start) return null;

    const elapsed = Math.round(performance.now() - start);
    this.timers.delete(name);

    this.logger._log(level, `${name}: ${elapsed}ms`, undefined, undefined, elapsed);
    return elapsed;
  }

  /** Stop all active timers and log them */
  endAll(level: LogLevel = "debug"): Map<string, number> {
    const results = new Map<string, number>();
    for (const [name] of this.timers) {
      const dur = this.end(name, level);
      if (dur !== null) results.set(name, dur);
    }
    return results;
  }

  /** Get list of currently running timer names */
  getActive(): string[] { return Array.from(this.timers.keys()); }
}
