/**
 * Structured log formatter for consistent log output.
 */

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

export const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: "TRACE",
  [LogLevel.DEBUG]: "DEBUG",
  [LogLevel.INFO]: "INFO",
  [LogLevel.WARN]: "WARN",
  [LogLevel.ERROR]: "ERROR",
  [LogLevel.FATAL]: "FATAL",
};

export const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: "\x1b[90m", // gray
  [LogLevel.DEBUG]: "\x1b[36m", // cyan
  [LogLevel.INFO]: "\x1b[32m", // green
  [LogLevel.WARN]: "\x1b[33m", // yellow
  [LogLevel.ERROR]: "\x1b[31m", // red
  [LogLevel.FATAL]: "\x1b[35m", // magenta
};

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: string;
  context?: string;
  error?: Error;
  stack?: string;
}

/** Format a log entry as a structured string */
export function formatLogEntry(entry: LogEntry): string {
  const ts = entry.timestamp || new Date().toISOString();
  const level = LEVEL_NAMES[entry.level] ?? "INFO";
  const ctx = entry.context ? `[${entry.context}]` : "";
  const color = LEVEL_COLORS[entry.level] ?? "";

  let formatted = `${ts} ${level.padEnd(5)} ${ctx}`;

  if (entry.message) {
    formatted += ` ${entry.message}`;
  }

  if (entry.data !== undefined && Object.keys(entry.data as object).length > 0) {
    try {
      formatted += ` ${JSON.stringify(entry.data)}`;
    } catch {
      formatted += ` ${String(entry.data)}`;
    }
  }

  if (entry.error) {
    formatted += `\n${entry.error.stack || entry.error.message}`;
  }

  return formatted;
}

/** Format for JSON logging (no colors) */
export function formatJsonLogEntry(entry: LogEntry): string {
  return JSON.stringify({
    level: LEVEL_NAMES[entry.level],
    message: entry.message,
    data: entry.data,
    timestamp: entry.timestamp || new Date().toISOString(),
    context: entry.context,
    error: entry.error?.message,
    stack: entry.error?.stack,
  });
}

/** Parse a log line back into components */
export function parseLogLine(line: string): LogEntry | null {
  try {
    const parsed = JSON.parse(line) as Omit<LogEntry, "level"> & { level?: string };

    // Find level from string name
    let level = LogLevel.INFO;
    if (typeof parsed.level === "string") {
      const upperLevel = parsed.level.toUpperCase();
      const idx = Object.values(LEVEL_NAMES).indexOf(upperLevel);
      if (idx >= 0) level = idx;
    } else if (typeof parsed.level === "number") {
      level = parsed.level;
    }

    return {
      ...parsed,
      level,
      message: parsed.message ?? "",
      timestamp: parsed.timestamp ?? "",
    };
  } catch {
    return null;
  }
}

/** Create a simple console logger with levels */
export interface ConsoleLoggerOptions {
  prefix?: string;
  enableColors?: boolean;
  minLevel?: LogLevel;
  jsonFormat?: boolean;
  includeTimestamp?: boolean;
}

export function createConsoleLogger(options: ConsoleLoggerOptions = {}) {
  const {
    prefix = "",
    enableColors = true,
    minLevel = LogLevel.DEBUG,
    jsonFormat = false,
    includeTimestamp = true,
  } = options;

  return {
    trace: (...args: unknown[]) => logAt(LogLevel.TRACE, args),
    debug: (...args: unknown[]) => logAt(LogLevel.DEBUG, args),
    info: (...args: unknown[]) => logAt(LogLevel.INFO, args),
    warn: (...args: unknown[]) => logAt(LogLevel.WARN, args),
    error: (...args: unknown[]) => logAt(LogLevel.ERROR, args),
    fatal: (...args: unknown[]) => logAt(LogLevel.FATAL, args),

    child: (ctx: string) =>
      createConsoleLogger({ ...options, prefix: prefix ? `${prefix}:${ctx}` : ctx }),
  };

  function logAt(level: LogLevel, args: unknown[]): void {
    if (level < minLevel) return;

    const message = args.map((a) =>
      typeof a === "object" && a !== null && !(a instanceof Date)
        ? try { JSON.stringify(a) } catch { String(a) }
        : String(a)
    ).join(" ");

    const entry: LogEntry = {
      level,
      message: prefix ? `[${prefix}] ${message}` : message,
      timestamp: new Date().toISOString(),
    };

    if (jsonFormat) {
      console.log(formatJsonLogEntry(entry));
    } else {
      const color = enableColors ? LEVEL_COLORS[level] : "";
      console.log(`${color}${formatLogEntry(entry)}\x1b[0m`);
    }
  }
}
