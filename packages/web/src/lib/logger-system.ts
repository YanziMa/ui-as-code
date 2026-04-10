/**
 * Logger System: Structured logging with levels, transports, sampling,
 * correlation IDs, context propagation, performance timing, log aggregation,
 * browser console output formatting, and remote transport support.
 */

// --- Types ---

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
  error?: Error;
  context?: Record<string, unknown>;
  correlationId?: string;
  source?: string;
  duration?: number;
  tags?: string[];
  requestId?: string;
  userId?: string;
  sessionId?: string;
}

export interface LogTransport {
  name: string;
  /** Minimum level to process */
  minLevel?: LogLevel;
  /** Write a log entry */
  write(entry: LogEntry): void | Promise<void>;
  /** Flush buffered entries */
  flush?(): Promise<void>;
  /** Close/cleanup the transport */
  close?(): void | Promise<void>;
  /** Whether transport is enabled */
  enabled?: boolean;
}

export interface LoggerConfig {
  /** Minimum log level (default: "debug") */
  level?: LogLevel;
  /** Default context added to every log entry */
  defaultContext?: Record<string, unknown>;
  /** Enable timestamps (default: true) */
  timestamps?: boolean;
  /** Transport(s) for log output */
  transports?: LogTransport[];
  /** Sampling rate 0-1 (default: 1 = all logs) */
  sampleRate?: number;
  /** Enable pretty-printing in console (default: true in dev) */
  prettyPrint?: boolean;
  /** Max entries kept in memory buffer (default: 1000) */
  bufferSize?: number;
  /** Prefix for all messages */
  prefix?: string;
  /** Enable performance tracking */
  enableTiming?: boolean;
  /** Global tags applied to all entries */
  tags?: string[];
  /** Redact sensitive fields (PII masking) */
  redactKeys?: string[];
  /** Redaction replacement string */
  redactReplacement?: string;
}

export interface TimerHandle {
  label: string;
  startTime: number;
  context?: Record<string, unknown>;
  tags?: string[];
}

// --- Constants ---

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "color: #888",
  debug: "color: #209cee",
  info: "color: #23d160",
  warn: "color: #ffdd57",
  error: "color: #ff3860",
  fatal: "color: #fff; background: #ff3860; font-weight: bold",
};

const LEVEL_ICONS: Record<LogLevel, string> = {
  trace: "\u22ee",   // ⋮
  debug: "\u2699",   // \u2699
  info: "\u2139\ufe0f", // ℹ️
  warn: "\u26a0\ufe0f", // ⚠️
  error: "\u274c",   // ❌
  fatal: "\U0001f480", // 💀
};

// --- Redaction ---

function redactObject(obj: unknown, keys: string[], replacement: string = "[REDACTED]"): unknown {
  if (!keys.length) return obj;
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactObject(item, keys, replacement));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (keys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      result[key] = replacement;
    } else if (value !== null && typeof value === "object") {
      result[key] = redactObject(value, keys, replacement);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// --- Console Transport ---

class ConsoleTransport implements LogTransport {
  name = "console";
  minLevel: LogLevel = "trace";
  enabled = true;
  private prettyPrint: boolean;

  constructor(prettyPrint = true) {
    this.prettyPrint = prettyPrint;
  }

  write(entry: LogEntry): void {
    if (!this.enabled) return;
    if (LEVEL_ORDER[entry.level] < LEVEL_ORDER[this.minLevel]) return;

    const ts = new Date(entry.timestamp).toISOString().slice(11, 23); // HH:mm:ss.sss
    const prefix = `[${ts}]`;
    const icon = LEVEL_ICONS[entry.level];
    const color = LEVEL_COLORS[entry.level];

    const args: unknown[] = [`%c${prefix} ${icon} ${entry.message}`, color];

    if (entry.context && Object.keys(entry.context).length > 0) {
      args.push("\n  Context:", entry.context);
    }
    if (entry.data !== undefined) {
      args.push("\n  Data:", entry.data);
    }
    if (entry.error) {
      args.push("\n  Error:", entry.error);
    }
    if (entry.duration !== undefined) {
      args.push(`\n  Duration: ${entry.duration.toFixed(2)}ms`);
    }
    if (entry.correlationId) {
      args.push(`\n  Correlation: ${entry.correlationId}`);
    }
    if (entry.tags?.length) {
      args.push(`\n  Tags: [${entry.tags.join(", ")}]`);
    }

    switch (entry.level) {
      case "trace":
      case "debug":
        console.debug(...args);
        break;
      case "info":
        console.info(...args);
        break;
      case "warn":
        console.warn(...args);
        break;
      case "error":
      case "fatal":
        console.error(...args);
        break;
    }
  }
}

// --- Memory Buffer Transport ---

class MemoryTransport implements LogTransport {
  name = "memory";
  entries: LogEntry[] = [];
  maxSize: number;
  enabled = true;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  write(entry: LogEntry): void {
    if (!this.enabled) return;
    this.entries.push(entry);
    while (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  }

  /** Get filtered entries */
  filter(options?: {
    level?: LogLevel;
    since?: number;
    tags?: string[];
    limit?: number;
  }): LogEntry[] {
    let result = [...this.entries];

    if (options?.level) {
      result = result.filter((e) => LEVEL_ORDER[e.level] >= LEVEL_ORDER[options.level!]);
    }
    if (options?.since) {
      result = result.filter((e) => e.timestamp >= options.since);
    }
    if (options?.tags?.length) {
      result = result.filter((e) =>
        e.tags?.some((t) => options.tags!.includes(t)),
      );
    }
    if (options?.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  clear(): void {
    this.entries = [];
  }

  flush(): Promise<void> {
    const entries = this.entries.splice(0);
    // Could send to remote here
    this.entries = [];
    return Promise.resolve();
  }

  close(): void {
    this.entries = [];
  }
}

// --- Remote Transport (fetch-based) ---

class RemoteTransport implements LogTransport {
  name: string;
  url: string;
  minLevel: LogLevel = "warn";
  enabled = true;
  private buffer: LogEntry[] = [];
  private batchSize: number;
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private maxRetries = 3;

  constructor(url: string, options?: { name?: string; batchSize?: number; flushIntervalMs?: number }) {
    this.url = url;
    this.name = options?.name ?? "remote";
    this.batchSize = options?.batchSize ?? 20;

    if (options?.flushIntervalMs) {
      this.flushInterval = setInterval(() => this.flush(), options.flushIntervalMs);
    }
  }

  write(entry: LogEntry): void {
    if (!this.enabled) return;
    if (LEVEL_ORDER[entry.level] < LEVEL_ORDER[this.minLevel]) return;
    this.buffer.push(entry);
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = this.buffer.splice(0);
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        await fetch(this.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });
        break;
      } catch {
        if (attempt === this.maxRetries) {
          // Put back in buffer on final failure
          this.buffer.unshift(...batch);
        }
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  close(): void {
    if (this.flushInterval) clearInterval(this.flushInterval);
    void this.flush();
  }
}

// --- Logger ---

export class Logger {
  private config: Required<LoggerConfig>;
  private transports: LogTransport[] = [];
  private memoryTransport: MemoryTransport;
  private correlationId?: string;
  private requestId?: string;
  private userId?: string;
  private sessionId?: string;
  private timers = new Map<string, TimerHandle>();
  private globalTags: Set<string>;

  constructor(config: LoggerConfig = {}) {
    this.globalTags = new Set(config.tags ?? []);
    this.config = {
      level: config.level ?? "debug",
      defaultContext: config.defaultContext ?? {},
      timestamps: config.timestamps ?? true,
      sampleRate: config.sampleRate ?? 1,
      prettyPrint: config.prettyPrint ?? (typeof process !== "undefined" ? process.env.NODE_ENV !== "production" : true),
      bufferSize: config.bufferSize ?? 1000,
      prefix: config.prefix ?? "",
      enableTiming: config.enableTiming ?? true,
      redactKeys: config.redactKeys ?? [],
      redactReplacement: config.redactReplacement ?? "[REDACTED]",
    };

    this.memoryTransport = new MemoryTransport(this.config.bufferSize);

    // Add default transports
    this.transports = config.transports ?? [
      new ConsoleTransport(this.config.prettyPrint),
      this.memoryTransport,
    ];
  }

  // --- Logging Methods ---

  trace(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log("trace", message, data, context);
  }

  debug(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log("debug", message, data, context);
  }

  info(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log("info", message, data, context);
  }

  warn(message: string, data?: unknown, context?: Record<string, unknown>): void {
    this.log("warn", message, data, context);
  }

  error(message: string, errorOrData?: Error | unknown, context?: Record<string, unknown>): void {
    if (errorOrData instanceof Error) {
      this.log("error", message, undefined, { ...context, _error: errorOrData }, errorOrData);
    } else {
      this.log("error", message, errorOrData, context);
    }
  }

  fatal(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log("fatal", message, undefined, context, error);
  }

  // --- Context / Correlation ---

  /** Set correlation ID for distributed tracing */
  setCorrelationId(id: string): this {
    this.correlationId = id;
    return this;
  }

  /** Set request ID */
  setRequestId(id: string): this {
    this.requestId = id;
    return this;
  }

  /** Set user ID */
  setUserId(id: string): this {
    this.userId = id;
    return this;
  }

  /** Set session ID */
  setSessionId(id: string): this {
    this.sessionId = id;
    return this;
  }

  /** Add persistent context fields */
  extend(context: Record<string, unknown>): this {
    Object.assign(this.config.defaultContext, context);
    return this;
  }

  /** Add global tags */
  tag(...tags: string[]): this {
    for (const t of tags) this.globalTags.add(t);
    return this;
  }

  /** Create child logger with additional context */
  child(additionalContext: Record<string, unknown>): Logger {
    const child = new Logger({
      ...this.config,
      defaultContext: { ...this.config.defaultContext, ...additionalContext },
      transports: this.transports,
    });
    child.correlationId = this.correlationId;
    child.requestId = this.requestId;
    child.userId = this.userId;
    child.sessionId = this.sessionId;
    child.globalTags = new Set(this.globalTags);
    return child;
  }

  // --- Timing ---

  /** Start a named timer */
  time(label: string, context?: Record<string, unknown>, tags?: string[]): TimerHandle {
    const handle: TimerHandle = {
      label,
      startTime: performance.now(),
      context,
      tags,
    };
    this.timers.set(label, handle);
    return handle;
  }

  /** End a timer and log the duration */
  timeEnd(label: string, level: LogLevel = "debug"): number | null {
    const handle = this.timers.get(label);
    if (!handle) return null;

    const duration = performance.now() - handle.startTime;
    this.timers.delete(label);

    this.log(level, `${handle.label}: ${duration.toFixed(2)}ms`, undefined, handle.context, undefined, {
      ...handle.tags,
      duration,
    });

    return duration;
  }

  /** Measure an async function's execution time */
  async measure<T>(label: string, fn: () => Promise<T>, level: LogLevel = "debug"): Promise<T> {
    this.time(label);
    try {
      const result = await fn();
      this.timeEnd(label, level);
      return result;
    } catch (error) {
      this.timeEnd(label, "error");
      throw error;
    }
  }

  // --- Query / Export ---

  /** Get buffered log entries */
  getEntries(options?: Parameters<MemoryTransport["filter"]>[0]): LogEntry[] {
    return this.memoryTransport.filter(options);
  }

  /** Clear in-memory buffer */
  clear(): void {
    this.memoryTransport.clear();
  }

  /** Flush all transports */
  async flushAll(): Promise<void> {
    for (const t of this.transports) {
      if (t.flush) await t.flush();
    }
  }

  /** Close all transports */
  closeAll(): void {
    for (const t of this.transports) {
      t.close?.();
    }
  }

  /** Get current config */
  getConfig(): LoggerConfig { return this.config; }

  /** Change minimum log level at runtime */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /** Add a transport dynamically */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  /** Remove a transport by name */
  removeTransport(name: string): void {
    this.transports = this.transports.filter((t) => t.name !== name);
  }

  // --- Internal ---

  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    context?: Record<string, unknown>,
    error?: Error,
    extra?: { tags?: string[]; duration?: number },
  ): void {
    // Level check
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.config.level]) return;

    // Sampling
    if (this.config.sampleRate < 1 && Math.random() > this.config.sampleRate) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      message: this.config.prefix ? `${this.config.prefix} ${message}` : message,
      data: this.config.redactKeys.length ? redactObject(data, this.config.redactKeys, this.config.redactReplacement) : data,
      error,
      context: { ...this.config.defaultContext, ...context },
      correlationId: this.correlationId,
      requestId: this.requestId,
      userId: this.userId,
      sessionId: this.sessionId,
      tags: extra?.tags ? [...this.globalTags, ...extra.tags] : this.globalTags.size > 0 ? [...this.globalTags] : undefined,
      duration: extra?.duration,
    };

    for (const transport of this.transports) {
      try {
        transport.write(entry);
      } catch {
        // Transport errors should not break app
      }
    }
  }
}

// --- Singleton / Factory ---

let defaultLogger: Logger | null = null;

/** Get or create the default application logger */
export function getLogger(config?: LoggerConfig): Logger {
  if (!defaultLogger) {
    defaultLogger = new Logger(config);
  }
  return defaultLogger;
}

/** Reset the default logger (useful for testing) */
export function resetLogger(): void {
  if (defaultLogger) {
    defaultLogger.closeAll();
    defaultLogger = null;
  }
}

/** Create a pre-configured logger for a module */
export function createModuleLogger(moduleName: string, config?: Partial<LoggerConfig>): Logger {
  return new Logger({
    ...config,
    prefix: config?.prefix ?? `[${moduleName}]`,
    defaultContext: { ...(config?.defaultContext ?? {}), source: moduleName },
  });
}

// --- Correlation ID Generator ---

/** Generate a unique correlation ID for request tracing */
export function generateCorrelationId(prefix = "corr"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Generate a unique request ID */
export function generateRequestId(prefix = "req"): string {
  return `${prefix}-${crypto.randomUUID?.()?.slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`;
}
