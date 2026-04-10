/**
 * Structured logging utility with levels, context, and transport support.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  context?: string;
  timestamp: string;
  error?: Error;
}

type LogTransport = (entry: LogEntry) => void;

const DEFAULT_TRANSPORT: LogTransport = (entry) => {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const ctx = entry.context ? ` [${entry.context}]` : "";
  const msg = `${prefix}${ctx} ${entry.message}`;

  if (entry.level === "error") {
    console.error(msg, entry.data ?? "", entry.error ?? "");
  } else if (entry.level === "warn") {
    console.warn(msg, entry.data ?? "");
  } else if (entry.level === "debug") {
    console.debug(msg, entry.data ?? "");
  } else {
    console.log(msg, entry.data ?? "");
  }
};

/** Global minimum log level */
let globalLevel: LogLevel = typeof process !== "undefined" && process.env?.NODE_ENV === "production"
  ? "info"
  : "debug";

export function setGlobalLogLevel(level: LogLevel): void {
  globalLevel = level;
}

export function getGlobalLogLevel(): LogLevel {
  return globalLevel;
}

export class Logger {
  private transports: LogTransport[] = [];
  private context: string;
  private level: LogLevel;

  constructor(context?: string, level?: LogLevel) {
    this.context = context ?? "app";
    this.level = level ?? globalLevel;
    this.transports.push(DEFAULT_TRANSPORT);
  }

  /** Add a custom transport */
  addTransport(transport: LogTransport): () => void {
    this.transports.push(transport);
    return () => {
      this.transports = this.transports.filter((t) => t !== transport);
    };
  }

  /** Set logger's minimum level */
  setLevel(level: LogLevel): this {
    this.level = level;
    return this;
  }

  /** Create child logger with additional context */
  child(childContext: string): Logger {
    return new Logger(`${this.context}:${childContext}`, this.level);
  }

  private shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.level] && LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[globalLevel];
  }

  private dispatch(level: LogLevel, message: string, data?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      context: this.context,
      timestamp: new Date().toISOString(),
      error,
    };

    for (const transport of this.transports) {
      try { transport(entry); } catch { /* ignore transport errors */ }
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.dispatch("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.dispatch("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.dispatch("warn", message, data);
  }

  error(message: string, errorOrData?: Error | Record<string, unknown>, data?: Record<string, unknown>): void {
    if (errorOrData instanceof Error) {
      this.dispatch("error", message, data, errorOrData);
    } else {
      this.dispatch("error", message, errorOrData);
    }
  }

  /** Timed operation — returns a function to call when done */
  timer(label: string): () => void {
    const start = performance.now();
    return () => {
      const elapsed = Math.round((performance.now() - start) * 100) / 100;
      this.debug(`${label}: ${elapsed}ms`);
    };
  }
}

/** Default app-wide logger instance */
export const log = new Logger("uiac");

/** Pre-configured loggers for common contexts */
export const apiLog = new Logger("api");
export const dbLog = new Logger("db");
export const extLog = new Logger("extension");
