/**
 * Enhanced structured logging with levels, transports, filtering,
 * correlation IDs, and context attachment.
 */

// --- Types ---

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  /** Timestamp (ISO string) */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Logger name/module */
  logger?: string;
  /** Primary message */
  message: string;
  /** Additional data/context */
  data?: Record<string, unknown>;
  /** Error object if applicable */
  error?: Error;
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** Source file:line */
  source?: string;
  /** Elapsed time in ms (for timing logs) */
  elapsedMs?: number;
}

export type LogTransport = (entry: LogEntry) => void | Promise<void>;

export interface TransportOptions {
  /** Console transport options */
  console?: {
    /** Colorize output? (default: true) */
    colorize?: boolean;
    /** Show timestamps? (default: true) */
    showTimestamp?: boolean;
    /** Show level badge? (default: true) */
    showLevel?: boolean;
  };
  /** Remote transport options */
  remote?: {
    /** Endpoint URL */
    url: string;
    /** Headers to include */
    headers?: Record<string, string>;
    /** Batch size before sending (default: 10) */
    batchSize?: number;
    /** Flush interval ms (default: 5000) */
    flushInterval?: number;
    /** Include 'data' field? */
    includeData?: boolean;
  };
  /** Storage transport options */
  storage?: {
    /** Key prefix (default: "log_") */
    keyPrefix?: string;
    /** Max entries to keep (default: 200) */
    maxEntries?: number;
  };
}

export interface LoggerOptions {
  /** Logger name (for identification) */
  name?: string;
  /** Minimum level to log (default: "debug") */
  minLevel?: LogLevel;
  /** Transports to use */
  transports?: TransportOptions;
  /** Default context attached to every log entry */
  defaultContext?: Record<string, unknown>;
  /** Include stack trace on errors? (default: true) */
  includeStack?: boolean;
  /** Include caller info? (default: false - perf cost) */
  includeCaller?: boolean;
}

// --- Level Configuration ---

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "#6b7280",
  info: "#3b82f6",
  warn: "#f59e0b",
  error: "#ef4444",
  fatal: "#dc2626",
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: "DBG",
  info: "INF",
  warn: "WRN",
  error: "ERR",
  fatal: "FTL",
};

// --- Main Logger Class ---

export class EnhancedLogger {
  private name: string;
  private minLevel: LogLevel;
  private transports: LogTransport[] = [];
  private defaultContext: Record<string, unknown>;
  private includeStack: boolean;
  private correlationId: string | null = null;

  constructor(options: LoggerOptions = {}) {
    this.name = options.name ?? "app";
    this.minLevel = options.minLevel ?? "debug";
    this.defaultContext = options.defaultContext ?? {};
    this.includeStack = options.includeStack ?? true;

    // Set up transports
    if (options.transports) {
      if (options.transports.console !== false) {
        this.transports.push(this.createConsoleTransport(options.transports.console ?? {}));
      }
      if (options.transports.remote) {
        this.transports.push(this.createRemoteTransport(options.transports.remote));
      }
      if (options.transports.storage) {
        this.transports.push(this.createStorageTransport(options.transports.storage));
      }
    }

    // Default: console only
    if (this.transports.length === 0) {
      this.transports.push(this.createConsoleTransport({}));
    }
  }

  // --- Logging Methods ---

  /** Log at debug level */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log("debug", message, data);
  }

  /** Log at info level */
  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  /** Log at warn level */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  /** Log at error level */
  error(message: string, data?: Record<string, unknown> | Error): void {
    const err = data instanceof Error ? data : undefined;
    const ctx = err ? {} : (data as Record<string, unknown> | undefined);
    this.log("error", message, ctx, err);
  }

  /** Log at fatal level */
  fatal(message: string, data?: Record<string, unknown> | Error): void {
    const err = data instanceof Error ? data : undefined;
    const ctx = err ? {} : (data as Record<string, unknown> | undefined);
    this.log("fatal", message, ctx, err);
  }

  /** Generic log method */
  log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    error?: Error,
  ): void {
    // Check minimum level
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      logger: this.name,
      message,
      data: { ...this.defaultContext, ...data },
      error,
      correlationId: this.correlationId ?? undefined,
    };

    // Attach stack trace for errors
    if (error && this.includeStack && error.stack) {
      entry.data = { ...entry.data, stack: error.stack };
    }

    // Send to all transports
    for (const transport of this.transports) {
      try {
        transport(entry);
      } catch (transportErr) {
        // Don't let a broken transport break logging
        console.error("[Logger] Transport error:", transportErr);
      }
    }
  }

  // --- Timing Helper ---

  /**
   * Time an operation and log the duration.
   * @returns A function that completes the timer and logs the result.
   *
   * @example
   * ```ts
   * const stopTimer = logger.timeStart("DB Query");
   * await db.query(sql);
   * stopTimer(); // Logs: "DB Query completed in 45ms"
   * ```
   */
  timeStart(label: string): () => void {
    const start = performance.now();
    return () => {
      const elapsed = Math.round(performance.now() - start);
      this.info(`${label} completed`, { elapsedMs: elapsed });
    };
  }

  // --- Correlation ID ---

  /** Set correlation ID for request tracing (carries through to all child loggers) */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /** Get current correlation id */
  getCorrelationId(): string | null {
    return this.correlationId;
  }

  /** Run a function with a correlation ID attached to all logs within */
  withCorrelationId<T>(id: string, fn: () => T): T {
    const prev = this.correlationId;
    this.correlationId = id;
    try {
      return fn();
    } finally {
      this.correlationId = prev;
    }
  }

  // --- Child Logger ---

  /** Create a child logger that inherits settings but can override them */
  child(name: string, overrides?: Partial<LoggerOptions>): EnhancedLogger {
    return new EnhancedLogger({
      name: `${this.name}:${name}`,
      minLevel: overrides?.minLevel ?? this.minLevel,
      defaultContext: { ...this.defaultContext, ...overrides?.defaultContext },
      transports: overrides?.transports ?? { console: {} },
      includeStack: overrides?.includeStack ?? this.includeStack,
    });
  }

  // --- Destroy ---

  /** Remove all transports and stop logging */
  destroy(): void {
    this.transports.length = 0;
  }

  // --- Transport Factories ---

  private createConsoleTransport(opts: NonNullable<TransportOptions["console"]>): LogTransport {
    const colorize = opts.colorize !== false;
    const showTs = opts.showTimestamp !== false;
    const showLvl = opts.showLevel !== false;

    return (entry: LogEntry) => {
      const color = LEVEL_COLORS[entry.level];
      const icon = LEVEL_ICONS[entry.level];
      const ts = showTs ? `${entry.timestamp} ` : "";
      const lvl = showLvl ? `[${icon}]` : "";
      const ctx = entry.data ? ` ${JSON.stringify(entry.data).slice(0, 200)}` : "";
      const src = entry.logger !== "app" ? ` [${entry.logger}]` : "";
      const corr = entry.correlationId ? ` (${entry.correlationId})` : "";

      if (colorize && typeof console !== "undefined") {
        const style = `color:${color};font-weight:bold`;
        console.log(
          `%c${ts}${lvl}%c${message}%c${ctx}${src}${corr}`,
          style,
          "",
          "",
        );
      } else {
        console.log(`${ts}${lvl} ${message}${ctx}${src}${corr}`);
      }
    };
  }

  private createRemoteTransport(opts: NonNullable<TransportOptions["remote"]>): LogTransport {
    const buffer: LogEntry[] = [];
    const batchSize = opts.batchSize ?? 10;
    const flushInterval = opts.flushInterval ?? 5000;
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    const flush = async (): Promise<void> => {
      if (buffer.length === 0) return;
      const batch = buffer.splice(0, batchSize);

      try {
        const body = opts.includeData !== false ? batch : batch.map((e) => ({
          timestamp: e.timestamp,
          level: e.level,
          message: e.message,
          logger: e.logger,
          correlationId: e.correlationId,
        }));

        await fetch(opts.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...opts.headers },
          body: JSON.stringify(body),
        });
      } catch (err) {
        console.error("[Logger] Remote transport failed:", err);
      }
    };

    return (entry: LogEntry) => {
      buffer.push(entry);
      if (buffer.length >= batchSize) {
        flush();
      } else if (!flushTimer) {
        flushTimer = setTimeout(flush, flushInterval);
      }
    };
  }

  private createStorageTransport(opts: NonNullable<TransportOptions["storage"]>): LogTransport {
    const prefix = opts.keyPrefix ?? "log_";
    const maxEntries = opts.maxEntries ?? 200;

    return (entry: LogEntry) => {
      try {
        const key = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const existing = JSON.parse(localStorage.getItem(prefix + "_keys") || "[]");

        existing.push(key);
        if (existing.length > maxEntries) {
          const oldest = existing.shift();
          localStorage.removeItem(oldest);
        }

        localStorage.setItem(prefix + "_keys", JSON.stringify(existing));
        localStorage.setItem(key, JSON.stringify({
          ts: entry.timestamp,
          lvl: entry.level,
          msg: entry.message.slice(0, 500),
        }));
      } catch {
        // Storage may be full or unavailable
      }
    };
  }
}

// --- Global Default Logger ---

/** Default application logger instance */
export const logger = new EnhancedLogger({ name: "ui-as-code" });

/** Convenience: re-export log methods at module level */
export const log = {
  debug: (msg: string, data?: Record<string, unknown>) => logger.debug(msg, data),
  info: (msg: string, data?: Record<string, unknown>) => logger.info(msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => logger.warn(msg, data),
  error: (msg: string, data?: Record<string, unknown> | Error) => logger.error(msg, data),
  fatal: (msg: string, data?: Record<string, unknown> | Error) => logger.fatal(msg, data),
};

/** Create a new named logger */
export function createLogger(name: string, options?: Omit<LoggerOptions, "name">): EnhancedLogger {
  return new EnhancedLogger({ ...options, name });
}
