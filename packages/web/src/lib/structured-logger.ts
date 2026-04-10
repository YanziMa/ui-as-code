/**
 * Structured Logger: Production-grade structured logging with levels, batching,
 * sampling, correlation IDs, context propagation, remote upload, log retention
 * policies, search/filtering, export formats (JSON/NDJSON/text), and
 * performance-optimized buffered writing.
 */

// --- Types ---

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogFormat = "json" | "ndjson" | "text" | "compact";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  correlationId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  sessionId?: string;
  tags?: string[];
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    cause?: unknown;
  };
  duration?: number; // ms
  source: string; // module/file name
  metadata?: Record<string, string>;
  /** Internal: index for ordering */
  _index?: number;
}

export interface LoggerConfig {
  /** Minimum level to capture (default: "debug") */
  minLevel?: LogLevel;
  /** Output format (default: "json") */
  format?: LogFormat;
  /** Include timestamps (default: true) */
  includeTimestamp?: boolean;
  /** Enable console output (default: true) */
  enableConsole?: boolean;
  /** Console colors (default: true in browser/dev) */
  enableColors?: boolean;
  /** Buffer size before flush (default: 50) */
  bufferSize?: number;
  /** Flush interval in ms (default: 5000) */
  flushIntervalMs?: number;
  /** Max buffer size — drops oldest when full (default: 10000) */
  maxBufferSize?: number;
  /** Sampling rate per level (0-1, default: 1 = all) */
  sampling?: Partial<Record<LogLevel, number>>;
  /** Global sampling rate (default: 1) */
  globalSampleRate?: number;
  /** Default context added to every entry */
  defaultContext?: Record<string, unknown>;
  /** Default tags */
  defaultTags?: string[];
  /** Remote upload endpoint */
  remoteUrl?: string;
  /** Auth token for remote upload */
  authToken?: string;
  /** Batch size for remote uploads (default: 100) */
  remoteBatchSize?: number;
  /** Max retained entries in memory (default: 5000) */
  maxRetainedEntries?: number;
  /** Enable performance tracking (auto-measure durations) */
  enablePerformanceTracking?: boolean;
  /** Custom serializer (override JSON.stringify) */
  serializer?: (entry: LogEntry) => string;
  /** Called after each flush */
  onFlush?: (entries: LogEntry[]) => void;
  /** Filter function — return false to drop entry */
  filter?: (entry: LogEntry) => boolean;
}

export interface LogSearchQuery {
  levels?: LogLevel[];
  since?: number; // timestamp ms
  until?: number; // timestamp ms
  messagePattern?: string; // regex / substring
  tags?: string[];
  correlationId?: string;
  source?: string;
  hasError?: boolean;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  totalEntries: number;
  entriesByLevel: Record<LogLevel, number>;
  bufferSize: number;
  retainedCount: number;
  droppedCount: number;
  sampledOutCount: number;
  filteredCount: number;
  lastFlushAt: number | null;
  lastFlushSize: number;
  uptime: number;
}

// --- Level Utilities ---

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: "gray", debug: "blue", info: "green", warn: "yellow", error: "red", fatal: "magenta",
};

function shouldLog(entryLevel: LogLevel, minLevel: LogLevel): boolean {
  return LEVEL_ORDER[entryLevel] >= LEVEL_ORDER[minLevel];
}

// --- StructuredLogger Implementation ---

export class StructuredLogger {
  private config: Required<
    Pick<LoggerConfig,
      | "minLevel"
      | "format"
      | "includeTimestamp"
      | "enableConsole"
      | "enableColors"
      | "bufferSize"
      | "flushIntervalMs"
      | "maxBufferSize"
      | "globalSampleRate"
      | "enablePerformanceTracking"
      | "maxRetainedEntries"
      | "remoteBatchSize"
    >
  > & Omit<LoggerConfig,
    | "minLevel"
    | "format"
    | "includeTimestamp"
    | "enableConsole"
    | "enableColors"
    | "bufferSize"
    | "flushIntervalMs"
    | "maxBufferSize"
    | "globalSampleRate"
    | "enablePerformanceTracking"
    | "maxRetainedEntries"
    | "remoteBatchSize"
  >;

  private buffer: LogEntry[] = [];
  private retained: LogEntry[] = [];
  private stats: LogStats;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private uploadTimer: ReturnType<typeof setInterval> | null = null;
  private entryIndex = 0;
  private destroyed = false;
  private activeContext: Record<string, unknown> = {};
  private activeTags: string[] = [];
  private activeCorrelationId: string | undefined;
  private timers = new Map<string, number>();

  constructor(config: LoggerConfig = {}) {
    this.config = {
      minLevel: config.minLevel ?? "debug",
      format: config.format ?? "json",
      includeTimestamp: config.includeTimestamp ?? true,
      enableConsole: config.enableConsole ?? true,
      enableColors: config.enableColors ?? true,
      bufferSize: config.bufferSize ?? 50,
      flushIntervalMs: config.flushIntervalMs ?? 5000,
      maxBufferSize: config.maxBufferSize ?? 10000,
      globalSampleRate: config.globalSampleRate ?? 1,
      enablePerformanceTracking: config.enablePerformanceTracking ?? false,
      maxRetainedEntries: config.maxRetainedEntries ?? 5000,
      remoteBatchSize: config.remoteBatchSize ?? 100,
      sampling: config.sampling ?? {},
      defaultContext: config.defaultContext ?? {},
      defaultTags: config.defaultTags ?? [],
      remoteUrl: config.remoteUrl,
      authToken: config.authToken,
      serializer: config.serializer,
      onFlush: config.onFlush,
      filter: config.filter,
    };
    this.stats = this.createEmptyStats();
    this.activeContext = { ...this.config.defaultContext };
    this.activeTags = [...this.config.defaultTags];

    // Auto-flush timer
    this.flushTimer = setInterval(() => this.flush(), this.config.flushIntervalMs);

    // Remote upload timer (if configured)
    if (this.config.remoteUrl) {
      this.uploadTimer = setInterval(() => this.uploadRetained(), 30000);
    }
  }

  // --- Logging Methods ---

  trace(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log("trace", message, context, error);
  }

  debug(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log("debug", message, context, error);
  }

  info(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log("info", message, context, error);
  }

  warn(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log("warn", message, context, error);
  }

  error(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log("error", message, context, error);
  }

  fatal(message: string, context?: Record<string, unknown>, error?: Error): void {
    this.log("fatal", message, context, error);
    // Immediately flush fatal errors
    this.flush();
  }

  /** Generic log method */
  log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (this.destroyed) return;
    if (!shouldLog(level, this.config.minLevel)) return;

    // Sampling check
    const sampleRate = this.config.sampling[level] ?? this.config.globalSampleRate;
    if (sampleRate < 1 && Math.random() > sampleRate) {
      this.stats.sampledOutCount++;
      return;
    }

    const entry: LogEntry = {
      level, message, timestamp: Date.now(),
      correlationId: this.activeCorrelationId,
      tags: [...this.activeTags],
      context: { ...this.activeContext, ...context },
      source: this.getSource(),
      _index: this.entryIndex++,
    };

    if (error) {
      entry.error = {
        name: error.name, message: error.message,
        stack: error.stack, code: (error as { code?: string }).code,
        cause: (error as { cause?: unknown }).cause,
      };
    }

    // Apply filter
    if (this.config.filter && !this.config.filter(entry)) {
      this.stats.filteredCount++;
      return;
    }

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // Add to buffer
    this.buffer.push(entry);

    // Auto-flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }

    this.stats.totalEntries++;
    this.stats.entriesByLevel[level]++;
  }

  // --- Context Management ---

  /** Set context that applies to all subsequent log entries in this scope */
  setContext(context: Record<string, unknown>): void {
    Object.assign(this.activeContext, context);
  }

  /** Clear all active context */
  clearContext(): void {
    this.activeContext = { ...this.config.defaultContext };
  }

  /** Set correlation ID for request tracing */
  setCorrelationId(id: string): void {
    this.activeCorrelationId = id;
  }

  clearCorrelationId(): void { this.activeCorrelationId = undefined; }

  /** Add tags to all subsequent entries */
  addTag(...tags: string[]): void {
    this.activeTags.push(...tags);
  }

  removeTag(tag: string): void {
    this.activeTags = this.activeTags.filter((t) => t !== tag);
  }

  clearTags(): void { this.activeTags = [...this.config.defaultTags]; }

  // --- Performance Tracking ---

  /** Start a named timer */
  startTimer(name: string): void {
    if (!this.config.enablePerformanceTracking) return;
    this.timers.set(name, performance.now());
  }

  /** End a timer and log duration */
  endTimer(name: string, level: LogLevel = "debug", message?: string, context?: Record<string, unknown>): void {
    if (!this.config.enablePerformanceTracking) return;
    const start = this.timers.get(name);
    if (!start) return;
    const duration = performance.now() - start;
    this.timers.delete(name);
    this.log(level, message ?? `Timer "${name}" completed`, { ...context, _timerName: name, _timerDuration: duration });
  }

  /** Wrap a function with automatic timing */
  time<T>(name: string, fn: () => T, level: LogLevel = "debug"): T {
    this.startTimer(name);
    try {
      return fn();
    } finally {
      this.endTimer(name, level);
    }
  }

  async timeAsync<T>(name: string, fn: () => Promise<T>, level: LogLevel = "debug"): Promise<T> {
    this.startTimer(name);
    try {
      return await fn();
    } finally {
      this.endTimer(name, level);
    }
  }

  // --- Search & Query ---

  /** Search retained log entries */
  search(query: LogSearchQuery): LogEntry[] {
    let results = [...this.retained];

    if (query.levels) results = results.filter((e) => query.levels!.includes(e.level));
    if (query.since) results = results.filter((e) => e.timestamp >= query.since!);
    if (query.until) results = results.filter((e) => e.timestamp <= query.until!);
    if (query.messagePattern) {
      try {
        const regex = new RegExp(query.messagePattern, "i");
        results = results.filter((e) => regex.test(e.message));
      } catch {
        results = results.filter((e) => e.message.includes(query.messagePattern!));
      }
    }
    if (query.tags?.length) results = results.filter((e) => query.tags!.some((t) => e.tags?.includes(t)));
    if (query.correlationId) results = results.filter((e) => e.correlationId === query.correlationId);
    if (query.source) results = results.filter((e) => e.source.includes(query.source!));
    if (query.hasError) results = results.filter((e) => !!e.error === query.hasError);

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (query.offset) results = results.slice(query.offset);
    if (query.limit) results = results.slice(0, query.limit);

    return results;
  }

  /** Get all retained entries */
  getRetainedEntries(limit?: number): LogEntry[] {
    return limit ? this.retained.slice(-limit) : [...this.retained];
  }

  // --- Export ---

  /** Export logs as formatted string */
  export(format?: LogFormat): string {
    const fmt = format ?? this.config.format;
    const entries = this.retained;

    switch (fmt) {
      case "json":
        return JSON.stringify(entries, null, 2);

      case "ndjson":
        return entries.map((e) => JSON.stringify(e)).join("\n");

      case "text":
        return entries.map((e) => this.formatAsText(e)).join("\n");

      case "compact":
        return entries.map((e) =>
          `[${new Date(e.timestamp).toISOString()}] [${e.level.toUpperCase()}] ${e.message}` +
          (e.error ? ` ${e.error.name}: ${e.error.message}` : ""),
        ).join("\n");

      default:
        return JSON.stringify(entries);
    }
  }

  /** Download logs as file (browser only) */
  download(filename?: string, format?: LogFormat): void {
    if (typeof document === "undefined") return;
    const content = this.export(format);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Flush & Buffer Management ---

  /** Force flush buffer to retained storage */
  flush(): LogEntry[] {
    if (this.buffer.length === 0) return [];

    const entries = this.buffer.splice(0);
    this.retained.push(...entries);

    // Enforce max retention
    if (this.retained.length > this.config.maxRetainedEntries) {
      const excess = this.retained.length - this.config.maxRetainedEntries;
      this.retained.splice(0, excess);
      this.stats.droppedCount += excess;
    }

    this.stats.bufferSize = this.buffer.length;
    this.stats.retainedCount = this.retained.length;
    this.stats.lastFlushAt = Date.now();
    this.stats.lastFlushSize = entries.length;

    this.config.onFlush?.(entries);
    return entries;
  }

  clearRetained(): void { this.retained = []; this.stats.retainedCount = 0; }
  clearBuffer(): void { this.buffer = []; this.stats.bufferSize = 0; }

  // --- Stats ---

  getStats(): LogStats {
    this.stats.bufferSize = this.buffer.length;
    this.stats.retainedCount = this.retained.length;
    this.stats.uptime = performance.now(); // rough approximation
    return { ...this.stats };
  }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.flush(); // Final flush
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.uploadTimer) clearInterval(this.uploadTimer);
    this.retained = [];
    this.buffer = [];
    this.timers.clear();
  }

  // --- Internal ---

  private writeToConsole(entry: LogEntry): void {
    const prefix = this.config.format === "text"
      ? `${this.config.includeTimestamp ? new Date(entry.timestamp).toISOString() + " " : ""}[${entry.level.toUpperCase()}]`
      : "";

    const msg = this.config.format === "text"
      ? `${prefix} ${entry.message}${entry.error ? ` \u2716 ${entry.error.name}: ${entry.error.message}` : ""}`
      : this.serializeEntry(entry);

    // Use appropriate console method
    const fn = (console as Record<string, (...args: unknown[]) => void>)[entry.level] ?? console.log;
    fn.call(console, msg);
  }

  private serializeEntry(entry: LogEntry): string {
    if (this.config.serializer) return this.config.serializer(entry);

    const obj = { ...entry };
    delete obj._index; // Don't expose internal field

    switch (this.config.format) {
      case "compact":
        return `[${new Date(obj.timestamp).toISOString()}] [${obj.level.toUpperCase()}] ${obj.message}`;

      case "text":
        return this.formatAsText(obj);

      case "ndjson":
      case "json":
      default:
        return JSON.stringify(obj);
    }
  }

  private formatAsText(entry: LogEntry): string {
    const parts: string[] = [];
    if (this.config.includeTimestamp) parts.push(new Date(entry.timestamp).toISOString());
    parts.push(`[${entry.level.toUpperCase()}]`);
    parts.push(entry.message);
    if (entry.correlationId) parts.push(`cid=${entry.correlationId}`);
    if (entry.tags?.length) parts.push(`[${entry.tags.join(",")}]`);
    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }
    if (entry.error) parts.push(`\u2716 ${entry.error.name}: ${entry.error.message}`);
    return parts.join(" ");
  }

  private getSource(): string {
    try { throw new Error(); }
    catch (e) {
      const stack = (e as Error).stack ?? "";
      // Skip internal frames
      const lines = stack.split("\n").slice(2);
      for (const line of lines) {
        if (line.includes("StructuredLogger") || line.includes("structured-logger")) continue;
        const match = line.match(/at\s+(.+?)\s+\(/);
        if (match) return match[1].trim();
        // Fallback: extract file path
        const pathMatch = line.match(/\((.+?):\d+:\d+\)/);
        if (pathMatch) return pathMatch[1].split("/").pop() ?? "unknown";
      }
    }
    return "unknown";
  }

  private async uploadRetained(): Promise<void> {
    if (!this.config.remoteUrl || this.retained.length === 0) return;

    const batch = this.retained.slice(0, this.config.remoteBatchSize);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.config.authToken) headers["Authorization"] = `Bearer ${this.config.authToken}`;

      const response = await fetch(this.config.remoteUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ logs: batch }),
      });

      if (response.ok) {
        // Remove uploaded entries
        this.retained.splice(0, batch.length);
      }
    } catch {
      // Silently fail — will retry next interval
    }
  }

  private createEmptyStats(): LogStats {
    return {
      totalEntries: 0,
      entriesByLevel: { trace: 0, debug: 0, info: 0, warn: 0, error: 0, fatal: 0 },
      bufferSize: 0, retainedCount: 0, droppedCount: 0,
      sampledOutCount: 0, filteredCount: 0,
      lastFlushAt: null, lastFlushSize: 0, uptime: 0,
    };
  }
}

// --- Factory & Global Instance ---

let globalLogger: StructuredLogger | null = null;

export function createStructuredLogger(config?: LoggerConfig): StructuredLogger {
  return new StructuredLogger(config);
}

/** Get or create the global logger instance */
export function getLogger(config?: LoggerConfig): StructuredLogger {
  if (!globalLogger) globalLogger = createStructuredLogger(config);
  return globalLogger;
}

/** Convenience: log to global logger */
export const log = {
  trace: (msg: string, ctx?: Record<string, unknown>, err?: Error) => getLogger()?.trace(msg, ctx, err),
  debug: (msg: string, ctx?: Record<string, unknown>, err?: Error) => getLogger()?.debug(msg, ctx, err),
  info: (msg: string, ctx?: Record<string, unknown>, err?: Error) => getLogger()?.info(msg, ctx, err),
  warn: (msg: string, ctx?: Record<string, unknown>, err?: Error) => getLogger()?.warn(msg, ctx, err),
  error: (msg: string, ctx?: Record<string, unknown>, err?: Error) => getLogger()?.error(msg, ctx, err),
  fatal: (msg: string, ctx?: Record<string, unknown>, err?: Error) => getLogger()?.fatal(msg, ctx, err),
};
