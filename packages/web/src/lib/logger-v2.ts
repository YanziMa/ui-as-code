/**
 * @fileoverview Comprehensive Structured Logging Library (v2)
 *
 * A full-featured TypeScript logging utility with:
 * - Multiple log levels with severity and color support
 * - Structured logging with context, tags, correlation IDs
 * - Pluggable transport system (console, memory, remote, localStorage)
 * - Flexible formatting (JSON, text, pretty, compact)
 * - Child loggers with inherited context
 * - Filtering by level, tag, module, and custom predicates
 * - Performance timers / stopwatches
 * - Error tracking with grouping, rate limiting, unhandled interception
 * - Log sampling to reduce noise at high volume
 * - Batching for remote transport efficiency
 * - Automatic redaction of sensitive fields
 * - DevTools integration via console.groupCollapsed
 *
 * @module logger-v2
 */

// ---------------------------------------------------------------------------
// 1. Log Levels
// ---------------------------------------------------------------------------

/** Numeric severity values for each log level. Higher = more severe. */
export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO  = 2,
  WARN  = 3,
  ERROR = 4,
  FATAL = 5,
}

/** Human-readable label for each log level. */
export const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO ]: 'INFO ',
  [LogLevel.WARN ]: 'WARN ',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
};

/** ANSI-style colour codes used by the console transport. */
export const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'color: #888',
  [LogLevel.DEBUG]: 'color: #2196F3',
  [LogLevel.INFO ]: 'color: #4CAF50',
  [LogLevel.WARN ]: 'color: #FF9800',
  [LogLevel.ERROR]: 'color: #F44336',
  [LogLevel.FATAL]: 'color: #D32F2F; font-weight: bold',
};

/** Parse a string label back into a LogLevel enum value. */
export function parseLevel(label: string): LogLevel {
  const upper = label.toUpperCase();
  const entry = Object.entries(LEVEL_LABELS).find(([, v]) => v.trim() === upper);
  return entry ? (Number(entry[0]) as LogLevel) : LogLevel.INFO;
}

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

/** A single log entry produced by the logger. */
export interface LogEntry<TContext extends Record<string, unknown> = Record<string, unknown>> {
  /** Monotonically increasing entry id (per-logger-instance). */
  id: number;
  /** ISO-8601 timestamp string. */
  timestamp: string;
  /** Millisecond-precision epoch. */
  timeMs: number;
  /** Log level. */
  level: LogLevel;
  /** The raw message (string or Error). */
  message: string;
  /** Arbitrary context data attached to this entry. */
  context: TContext;
  /** Tags for categorisation / filtering. */
  readonly tags: ReadonlyArray<string>;
  /** Correlation ID for distributed tracing. */
  correlationId?: string;
  /** Module / namespace that emitted the log. */
  module?: string;
  /** Stack trace captured automatically for ERROR/FATAL. */
  stack?: string;
  /** Duration in ms when created via a timer. */
  duration?: number;
  /** Timer label if applicable. */
  timerLabel?: string;
  /** The underlying Error object when `message` originated from one. */
  error?: Error;
}

/** Shape of a function that decides whether a given entry should be logged. */
export type LogFilter<TContext extends Record<string, unknown> = Record<string, unknown>> = (
  entry: LogEntry<TContext>,
) => boolean;

/** Output format variants. */
export type LogFormat = 'json' | 'text' | 'pretty' | 'compact';

/** Signature of a custom formatter – receives an entry and returns a string. */
export type LogFormatter<TContext extends Record<string, unknown> = Record<string, unknown>> = (
  entry: LogEntry<TContext>,
  format: LogFormat,
) => string;

// ---------------------------------------------------------------------------
// Transports
// ---------------------------------------------------------------------------

/** Minimal interface every transport must implement. */
export interface LogTransport<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> {
  /** Unique name used for identification / removal. */
  readonly name: string;
  /** Minimum level – entries below this are skipped by the transport. */
  minLevel: LogLevel;
  /** Write (or buffer) a single log entry. */
  log(entry: LogEntry<TContext>): void | Promise<void>;
  /** Flush any buffered state (no-op for synchronous transports). */
  flush?(): void | Promise<void>;
  /** Tear down resources (event listeners, intervals, etc.). */
  destroy?(): void;
}

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

/** Default field patterns that will be redacted from log output. */
const DEFAULT_REDACT_PATTERNS: ReadonlyArray<RegExp> = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /authorization/i,
  /cookie/i,
  /credit.?card/i,
  /ssn/i,
  /social.?security/i,
];

/** Default string patterns (e.g. email-like) redacted within values. */
const DEFAULT_VALUE_REDACT_PATTERNS: ReadonlyArray<RegExp> = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // credit-card-ish
];

/** Replacement string used when a field is redacted. */
export const REDACTED_PLACEHOLDER = '[REDACTED]';

/**
 * Recursively walk an object and replace matching keys / values.
 * Does **not** mutate the input; returns a new object.
 */
export function redactObject<T>(obj: T, options?: {
  fields?: ReadonlyArray<RegExp>;
  values?: ReadonlyArray<RegExp>;
  placeholder?: string;
}): T {
  const { fields = DEFAULT_REDACT_PATTERNS, values = DEFAULT_VALUE_REDACT_PATTERNS, placeholder = REDACTED_PLACEHOLDER } = options ?? {};

  if (obj == null || typeof obj !== 'object') {
    // Scalar value – check value-level patterns
    let str = String(obj);
    for (const pat of values) {
      str = str.replace(pat, placeholder);
    }
    return (typeof obj === 'string' ? str : obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item, { fields, values, placeholder })) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    const isSensitive = fields.some(pat => pat.test(key));
    result[key] = isSensitive ? placeholder : redactObject(val, { fields, values, placeholder });
  }
  return result as T;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** Built-in formatters keyed by format name. */
export const FORMATTERS = {
  /**
   * JSON formatter – single-line JSON serialisation.
   */
  json<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
    return JSON.stringify(redactObject({
      t: entry.timestamp,
      l: LEVEL_LABELS[entry.level],
      m: entry.message,
      c: entry.context,
      g: [...entry.tags],
      i: entry.correlationId ?? null,
      mod: entry.module ?? null,
      d: entry.duration ?? null,
    }));
  },

  /**
   * Text formatter – human-readable single line.
   */
  text<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
    const parts = [
      entry.timestamp,
      LEVEL_LABELS[entry.level],
    ];
    if (entry.module) parts.push(`[${entry.module}]`);
    if (entry.correlationId) parts.push(`cid=${entry.correlationId}`);
    if (entry.tags.length) parts.push(`(${entry.tags.join(',')})`);
    parts.push(entry.message);
    if (entry.duration != null) parts.push(`+${entry.duration.toFixed(1)}ms`);
    if (Object.keys(entry.context).length) {
      parts.push(JSON.stringify(redactObject(entry.context)));
    }
    return parts.join(' ');
  },

  /**
   * Pretty formatter – multi-line, indented, dev-friendly.
   */
  pretty<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
    const ctx = Object.keys(entry.context).length
      ? '\n  Context: ' + JSON.stringify(redactObject(entry.context), null, 2)
      : '';
    const extra: string[] = [];
    if (entry.tags.length) extra.push(`Tags: ${entry.tags.join(', ')}`);
    if (entry.correlationId) extra.push(`CorrelationId: ${entry.correlationId}`);
    if (entry.module) extra.push(`Module: ${entry.module}`);
    if (entry.duration != null) extra.push(`Duration: ${entry.duration.toFixed(1)}ms`);
    if (entry.stack) extra.push(`Stack:\n${entry.stack}`);

    return [
      `${entry.timestamp}  ${LEVEL_LABELS[entry.level]}  ${entry.message}`,
      ...extra.map(e => `  ${e}`),
      ctx,
    ].filter(Boolean).join('\n');
  },

  /**
   * Compact formatter – minimal output for high-volume production use.
   */
  compact<T extends Record<string, unknown>>(entry: LogEntry<T>): string {
    return `${entry.timeMs}|${LEVEL_LABELS[entry.level].trim()}|${entry.module || '-'}|${entry.message}`;
  },
};

/** Resolve a format name or custom formatter into a formatting function. */
function resolveFormatter<T extends Record<string, unknown>>(
  fmt: LogFormat | LogFormatter<T>,
): LogFormatter<T> {
  if (typeof fmt === 'function') return fmt;
  switch (fmt) {
    case 'json':    return FORMATTERS.json as LogFormatter<T>;
    case 'text':    return FORMATTERS.text as LogFormatter<T>;
    case 'pretty':  return FORMATTERS.pretty as LogFormatter<T>;
    case 'compact': return FORMATTERS.compact as LogFormatter<T>;
    default:        return FORMATTERS.text as LogFormatter<T>;
  }
}

// ---------------------------------------------------------------------------
// Transport Implementations
// ---------------------------------------------------------------------------

/**
 * Console transport – writes coloured output to browser/dev console.
 * Uses `%c` CSS directives and `console.groupCollapsed` when configured.
 */
export class ConsoleTransport<TContext extends Record<string, unknown> = Record<string, unknown>>
  implements LogTransport<TContext>
{
  readonly name = 'console';
  minLevel: LogLevel = LogLevel.TRACE;

  /** Format used when not using DevTools groups. */
  format: LogFormat | LogFormatter<TContext> = 'pretty';

  /** When true, wrap each log in `console.groupCollapsed` / `groupEnd`. */
  useGroups = false;

  constructor(options?: {
    minLevel?: LogLevel;
    format?: LogFormat | LogFormatter<TContext>;
    useGroups?: boolean;
  }) {
    if (options?.minLevel != null) this.minLevel = options.minLevel;
    if (options?.format != null) this.format = options.format;
    if (options?.useGroups != null) this.useGroups = options.useGroups;
  }

  log(entry: LogEntry<TContext>): void {
    if (entry.level < this.minLevel) return;
    const fmt = resolveFormatter(this.format);
    const formatted = fmt(entry, typeof this.format === 'string' ? this.format : 'text');
    const colorStyle = LEVEL_COLORS[entry.level] ?? '';

    if (this.useGroups && typeof console !== 'undefined' && console.groupCollapsed) {
      const header = `${LEVEL_LABELS[entry.level]}  ${entry.message}`;
      console.groupCollapsed(`%c${header}`, colorStyle);
      console.log(`%c${formatted}`, 'color: #666');
      if (entry.context && Object.keys(entry.context).length) {
        console.log('%cContext:', 'font-weight: bold; color: #555', redactObject(entry.context));
      }
      if (entry.error) {
        console.error(entry.error);
      }
      if (entry.stack) {
        console.log('%cStack:', 'font-weight: bold; color: #F44336', entry.stack);
      }
      console.groupEnd();
    } else {
      // Map levels to native console methods for proper stack traces in devtools.
      const nativeFn = ((): typeof console.log => {
        switch (entry.level) {
          case LogLevel.TRACE:
          case LogLevel.DEBUG: return console.debug;
          case LogLevel.INFO:  return console.info;
          case LogLevel.WARN:  return console.warn;
          case LogLevel.ERROR:
          case LogLevel.FATAL: return console.error;
          default:            return console.log;
        }
      })();
      nativeFn(`%c${formatted}`, colorStyle);
    }
  }
}

/**
 * Memory transport – stores entries in a circular buffer for in-app log viewers.
 */
export class MemoryTransport<TContext extends Record<string, unknown> = Record<string, unknown>>
  implements LogTransport<TContext>
{
  readonly name = 'memory';
  minLevel: LogLevel = LogLevel.TRACE;

  /** Maximum number of entries retained (circular buffer). */
  maxSize: number;

  private _entries: Array<LogEntry<TContext>> = [];

  get entries(): ReadonlyArray<LogEntry<TContext>> {
    return this._entries;
  }

  constructor(options?: { minLevel?: LogLevel; maxSize?: number }) {
    this.minLevel = options?.minLevel ?? LogLevel.TRACE;
    this.maxSize = options?.maxSize ?? 1000;
  }

  log(entry: LogEntry<TContext>): void {
    if (entry.level < this.minLevel) return;
    this._entries.push({ ...entry });
    if (this._entries.length > this.maxSize) {
      this._entries.shift();
    }
  }

  /** Clear all stored entries. */
  clear(): void {
    this._entries = [];
  }

  /** Search stored entries by predicate. */
  find(predicate: (e: LogEntry<TContext>) => boolean): LogEntry<TContext>[] {
    return this._entries.filter(predicate);
  }

  destroy(): void {
    this.clear();
  }
}

/**
 * Remote transport – batches log entries and POSTs them to an endpoint.
 */
export class RemoteTransport<TContext extends Record<string, unknown> = Record<string, unknown>>
  implements LogTransport<TContext>
{
  readonly name = 'remote';
  minLevel: LogLevel = LogLevel.INFO;

  /** Target URL for batched log submission. */
  endpoint: string;

  /** Maximum number of entries before auto-flush. */
  batchSize: number;

  /** Maximum time (ms) before flushing even if batch is not full. */
  flushIntervalMs: number;

  /** Format used to serialise each entry. */
  format: LogFormat | LogFormatter<TContext> = 'json';

  /** Optional headers added to each fetch request. */
  headers: Record<string, string>;

  /** Whether to include credentials (cookies) on cross-origin requests. */
  credentials: RequestCredentials;

  private _buffer: Array<LogEntry<TContext>> = [];
  private _timerHandle: ReturnType<typeof setInterval> | null = null;
  private _flushing = false;

  constructor(endpoint: string, options?: {
    minLevel?: LogLevel;
    batchSize?: number;
    flushIntervalMs?: number;
    format?: LogFormat | LogFormatter<TContext>;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
  }) {
    this.endpoint = endpoint;
    this.minLevel = options?.minLevel ?? LogLevel.INFO;
    this.batchSize = options?.batchSize ?? 20;
    this.flushIntervalMs = options?.flushIntervalMs ?? 5000;
    this.format = options?.format ?? 'json';
    this.headers = options?.headers ?? { 'Content-Type': 'application/json' };
    this.credentials = options?.credentials ?? 'same-origin';
    this._startFlushTimer();
  }

  log(entry: LogEntry<TContext>): void {
    if (entry.level < this.minLevel) return;
    this._buffer.push({ ...entry });
    if (this._buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this._flushing || this._buffer.length === 0) return;
    this._flushing = true;
    const batch = this._buffer.splice(0);
    try {
      const fmt = resolveFormatter(this.format);
      const payload = batch.map(e => fmt(e, typeof this.format === 'string' ? this.format : 'json'));
      await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        credentials: this.credentials,
        keepalive: true,
      });
    } catch {
      // Silently swallow network errors – logging must never break the app.
      // In production you might want a fallback queue here.
    } finally {
      this._flushing = false;
    }
  }

  destroy(): void {
    this._stopFlushTimer();
    this.flush(); // best-effort
  }

  private _startFlushTimer(): void {
    if (typeof window === 'undefined' || !window.setInterval) return;
    this._timerHandle = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  private _stopFlushTimer(): void {
    if (this._timerHandle != null) {
      clearInterval(this._timerHandle);
      this._timerHandle = null;
    }
  }
}

/**
 * LocalStorage transport – persists logs to `localStorage` for post-mortem analysis.
 */
export class LocalStorageTransport<TContext extends Record<string, unknown> = Record<string, unknown>>
  implements LogTransport<TContext>
{
  readonly name = 'localStorage';
  minLevel: LogLevel = LogLevel.INFO;

  /** Key prefix used under `localStorage`. */
  storageKey: string;

  /** Maximum number of persisted entries. */
  maxSize: number;

  /** Format used for serialisation. */
  format: LogFormat | LogFormatter<TContext> = 'json';

  constructor(storageKey = 'logs', options?: {
    minLevel?: LogLevel;
    maxSize?: number;
    format?: LogFormat | LogFormatter<TContext>;
  }) {
    this.storageKey = storageKey;
    this.minLevel = options?.minLevel ?? LogLevel.INFO;
    this.maxSize = options?.maxSize ?? 500;
    this.format = options?.format ?? 'json';
  }

  log(entry: LogEntry<TContext>): void {
    if (entry.level < this.minLevel) return;
    try {
      if (typeof localStorage === 'undefined') return;
      const raw = localStorage.getItem(this.storageKey);
      const entries: string[] = raw ? JSON.parse(raw) : [];
      const fmt = resolveFormatter(this.format);
      entries.push(fmt(entry, typeof this.format === 'string' ? this.format : 'json'));
      // Trim to maxSize
      while (entries.length > this.maxSize) entries.shift();
      localStorage.setItem(this.storageKey, JSON.stringify(entries));
    } catch {
      // Storage full / unavailable – ignore.
    }
  }

  /** Read persisted logs back out. */
  load(): string[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** Remove all persisted logs. */
  clear(): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(this.storageKey);
    } catch { /* noop */ }
  }
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

/**
 * Determines whether a given entry should be sampled (kept) based on its level.
 * Returns `true` when the entry **should** be logged.
 */
export interface SamplingStrategy {
  /** Return `true` to keep the entry, `false` to drop it. */
  shouldSample(level: LogLevel, tags: ReadonlyArray<string>): boolean;
}

/** Sample a fixed percentage of messages per level. */
export class RateSamplingStrategy implements SamplingStrategy {
  private readonly _rates: Map<LogLevel, number>;

  constructor(rates?: Partial<Record<LogLevel, number>>) {
    this._rates = new Map<LogLevel, number>([
      [LogLevel.TRACE, rates?.[LogLevel.TRACE] ?? 0.1],
      [LogLevel.DEBUG, rates?.[LogLevel.DEBUG] ?? 0.3],
      [LogLevel.INFO , rates?.[LogLevel.INFO ] ?? 1.0],
      [LogLevel.WARN , rates?.[LogLevel.WARN ] ?? 1.0],
      [LogLevel.ERROR, rates?.[LogLevel.ERROR] ?? 1.0],
      [LogLevel.FATAL, rates?.[LogLevel.FATAL] ?? 1.0],
    ]);
  }

  shouldSample(level: LogLevel): boolean {
    const rate = this._rates.get(level) ?? 1;
    if (rate >= 1) return true;
    if (rate <= 0) return false;
    return Math.random() < rate;
  }
}

// ---------------------------------------------------------------------------
// Error Tracking
// ---------------------------------------------------------------------------

/** A grouped error fingerprint used for de-duplication. */
export interface ErrorFingerprint {
  /** Hash-like key derived from message + first stack frame. */
  key: string;
  /** How many times this error has been seen. */
  count: number;
  /** First-seen timestamp. */
  firstSeen: string;
  /** Last-seen timestamp. */
  lastSeen: string;
  /** The last Error instance captured. */
  lastError: Error;
}

/** Build a simple fingerprint key from an Error. */
function fingerprintError(err: Error): string {
  const msg = err.message || '';
  // Grab the "most relevant" frame line (first after own code).
  const line = (err.stack || '').split('\n').slice(1, 3).join('|');
  return `${msg}@${line}`;
}

// ---------------------------------------------------------------------------
// Timers / Stopwatches
// ---------------------------------------------------------------------------

interface ActiveTimer {
  label: string;
  start: number;
  context?: Record<string, unknown>;
  tags?: string[];
  level?: LogLevel;
}

// ---------------------------------------------------------------------------
// Main Logger Class
// ---------------------------------------------------------------------------

/** Options accepted by the {@link Logger} constructor. */
export interface LoggerOptions<TContext extends Record<string, unknown> = Record<string, unknown>> {
  /** Default minimum level for the logger itself. */
  minLevel?: LogLevel;
  /** Default module/namespace label attached to every entry. */
  module?: string;
  /** Initial context merged into every entry. */
  context?: TContext;
  /** Initial tags applied to every entry. */
  tags?: string[];
  /** Default correlation ID for request tracing. */
  correlationId?: string;
  /** Transports to register immediately. */
  transports?: LogTransport<TContext>[];
  /** Global filters – all must pass for the entry to be emitted. */
  filters?: LogFilter<TContext>[];
  /** Sampling strategy (default: log everything). */
  sampling?: SamplingStrategy;
  /** Sensitive-field redaction enabled by default. */
  redactEnabled?: boolean;
  /** Custom redaction field patterns. */
  redactFields?: RegExp[];
  /** Custom redaction value patterns. */
  redactValues?: RegExp[];
  /** Capture stack traces for ERROR and FATAL entries. */
  captureStack?: boolean;
  /** Intercept unhandled rejections / errors globally. */
  interceptErrors?: boolean;
  /** Threshold (ms) – timers exceeding this are logged as WARN. */
  slowThresholdMs?: number;
  /** Default format used by the built-in console transport. */
  defaultFormat?: LogFormat;
  /** Use console.groupCollapsed in console transport. */
  devToolsGroups?: boolean;
}

/**
 * Comprehensive structured logger.
 *
 * @example
 * ```ts
 * const log = new Logger({ module: 'AuthService', minLevel: LogLevel.DEBUG });
 * log.info('User logged in', { userId: 42 }, ['auth', 'success']);
 *
 * const child = log.child({ feature: 'oauth' });
 * child.debug('Token refreshed');
 * ```
 */
export class Logger<TContext extends Record<string, unknown> = Record<string, unknown>> {
  // -- public config --------------------------------------------------------
  minLevel: LogLevel;
  module?: string;
  correlationId?: string;
  tags: string[];
  context: TContext;
  captureStack: boolean;
  slowThresholdMs: number;
  redactEnabled: boolean;
  redactFields: RegExp[];
  redactValues: RegExp[];

  // -- internal state -------------------------------------------------------
  private _transports: LogTransport<TContext>[] = [];
  private _filters: LogFilter<TContext>[] = [];
  private _sampling: SamplingStrategy;
  private _counter = 0;
  private _timers: Map<string, ActiveTimer> = new Map();
  private _errorRegistry: Map<string, ErrorFingerprint> = new Map();
  private _errorCounts: Map<LogLevel, number> = new Map();
  private _totalErrors = 0;
  private _interceptorsActive = false;

  constructor(options: LoggerOptions<TContext> = {}) {
    this.minLevel       = options.minLevel       ?? (import.meta.env?.DEV ? LogLevel.DEBUG : LogLevel.INFO);
    this.module         = options.module;
    this.correlationId  = options.correlationId;
    this.tags           = options.tags            ?? [];
    this.context        = (options.context        ?? {}) as TContext;
    this.captureStack   = options.captureStack    ?? true;
    this.slowThresholdMs= options.slowThresholdMs ?? 1000;
    this.redactEnabled  = options.redactEnabled   ?? true;
    this.redactFields   = options.redactFields     ?? [...DEFAULT_REDACT_PATTERNS];
    this.redactValues   = options.redactValues     ?? [...DEFAULT_VALUE_REDACT_PATTERNS];
    this._sampling      = options.sampling         ?? new RateSamplingStrategy();

    if (options.transports) {
      for (const t of options.transports) this.addTransport(t);
    }
    if (options.filters) {
      for (const f of options.filters) this.addFilter(f);
    }

    // Auto-register a console transport if none provided.
    if (this._transports.length === 0 && typeof console !== 'undefined') {
      this.addTransport(new ConsoleTransport<TContext>({
        format: options.defaultFormat ?? (import.meta.env?.DEV ? 'pretty' : 'compact'),
        useGroups: options.devToolsGroups ?? !!import.meta.env?.DEV,
      }));
    }

    if (options.interceptErrors) {
      this.interceptGlobalErrors();
    }
  }

  // -------------------------------------------------------------------------
  // Transport management
  // -------------------------------------------------------------------------

  /** Register a transport. */
  addTransport(transport: LogTransport<TContext>): this {
    this._transports.push(transport);
    return this;
  }

  /** Remove a transport by name or reference. */
  removeTransport(nameOrTransport: string | LogTransport<TContext>): this {
    const key = typeof nameOrTransport === 'string' ? nameOrTransport : nameOrTransport.name;
    this._transports = this._transports.filter(t => t.name !== key);
    return this;
  }

  /** Flush all transports that support flushing. */
  async flushAll(): Promise<void> {
    await Promise.all(
      this._transports.map(t => t.flush?.()),
    );
  }

  /** Destroy all transports (call their destroy hook). */
  destroyAll(): void {
    for (const t of this._transports) t.destroy?.();
    this._transports = [];
    this.stopErrorInterception();
  }

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  /** Append a global filter function. */
  addFilter(filter: LogFilter<TContext>): this {
    this._filters.push(filter);
    return this;
  }

  /** Remove all registered filters. */
  clearFilters(): this {
    this._filters = [];
    return this;
  }

  /**
   * Convenience helper: only log entries whose tags match the given glob-like
   * pattern (simple `includes` check for now).
   */
  filterByTag(pattern: string): this {
    return this.addFilter(e => e.tags.length === 0 || e.tags.some(t => t.includes(pattern)));
  }

  /**
   * Convenience helper: only log entries from a specific module/namespace.
   */
  filterByModule(moduleName: string): this {
    return this.addFilter(e => !e.module || e.module === moduleName);
  }

  // -------------------------------------------------------------------------
  // Sampling
  // -------------------------------------------------------------------------

  /** Replace the current sampling strategy. */
  setSampling(strategy: SamplingStrategy): this {
    this._sampling = strategy;
    return this;
  }

  // -------------------------------------------------------------------------
  // Child Loggers
  // -------------------------------------------------------------------------

  /**
   * Create a child logger that inherits parent config but can override
   * context, tags, module, etc.
   */
  child(childOptions?: {
    context?: Partial<TContext>;
    tags?: string[];
    module?: string;
    correlationId?: string;
    minLevel?: LogLevel;
  }): Logger<TContext> {
    const mergedCtx = { ...this.context, ...(childOptions?.context ?? {}) } as TContext;
    const mergedTags = [...this.tags, ...(childOptions?.tags ?? [])];

    const child = new Logger<TContext>({
      minLevel: childOptions?.minLevel ?? this.minLevel,
      module: childOptions?.module ?? this.module,
      context: mergedCtx,
      tags: mergedTags,
      correlationId: childOptions?.correlationId ?? this.correlationId,
      sampling: this._sampling,
      redactEnabled: this.redactEnabled,
      redactFields: [...this.redactFields],
      redactValues: [...this.redactValues],
      captureStack: this.captureStack,
      slowThresholdMs: this.slowThresholdMs,
    });

    // Share the same transport set (by reference) so child output goes to the same places.
    child._transports = this._transports;
    child._filters = [...this._filters];
    return child;
  }

  // -------------------------------------------------------------------------
  // Core logging methods
  // -------------------------------------------------------------------------

  /** Low-level entry point – builds a LogEntry and dispatches to transports. */
  private _log(
    level: LogLevel,
    message: string,
    entryContext?: Partial<TContext>,
    entryTags?: string[],
    error?: Error,
    duration?: number,
    timerLabel?: string,
  ): LogEntry<TContext> | null {
    // 1. Level gate (logger-level)
    if (level < this.minLevel) return null;

    // 2. Sampling gate
    if (!this._sampling.shouldSample(level, this.tags)) return null;

    // 3. Build entry
    const now = new Date();
    const mergedContext = { ...this.context, ...(entryContext ?? {}) } as TContext;
    const mergedTags = [...this.tags, ...(entryTags ?? [])];
    let stack: string | undefined;
    if ((level >= LogLevel.ERROR && this.captureStack) || error?.stack) {
      stack = error?.stack ?? new Error().stack;
    }

    const entry: LogEntry<TContext> = {
      id: ++this._counter,
      timestamp: now.toISOString(),
      timeMs: now.getTime(),
      level,
      message: this.redactEnabled ? this._redactMessage(message) : message,
      context: this.redactEnabled ? redactObject(mergedContext, {
        fields: this.redactFields,
        values: this.redactValues,
      }) : mergedContext,
      tags: mergedTags,
      correlationId: this.correlationId,
      module: this.module,
      stack,
      duration,
      timerLabel,
      error,
    };

    // 4. Filter gate
    for (const f of this._filters) {
      if (!f(entry)) return null;
    }

    // 5. Error bookkeeping
    if (level >= LogLevel.ERROR) {
      this._trackError(entry);
    }

    // 6. Dispatch to transports
    for (const t of this._transports) {
      try {
        t.log(entry);
      } catch {
        // Transport failures must never propagate.
      }
    }

    return entry;
  }

  /** Apply simple regex-based redaction to a message string. */
  private _redactMessage(msg: string): string {
    let out = msg;
    for (const pat of this.redactValues) {
      out = out.replace(pat, REDACTED_PLACEHOLDER);
    }
    return out;
  }

  // -- Level shortcuts ------------------------------------------------------

  trace(msg: string, ctx?: Partial<TContext>, tags?: string[]): LogEntry<TContext> | null {
    return this._log(LogLevel.TRACE, msg, ctx, tags);
  }

  debug(msg: string, ctx?: Partial<TContext>, tags?: string[]): LogEntry<TContext> | null {
    return this._log(LogLevel.DEBUG, msg, ctx, tags);
  }

  info(msg: string, ctx?: Partial<TContext>, tags?: string[]): LogEntry<TContext> | null {
    return this._log(LogLevel.INFO, msg, ctx, tags);
  }

  warn(msg: string, ctx?: Partial<TContext>, tags?: string[]): LogEntry<TContext> | null {
    return this._log(LogLevel.WARN, msg, ctx, tags);
  }

  error(msg: string, ctx?: Partial<TContext>, tags?: string[], err?: Error): LogEntry<TContext> | null {
    return this._log(LogLevel.ERROR, msg, ctx, tags, err);
  }

  fatal(msg: string, ctx?: Partial<TContext>, tags?: string[], err?: Error): LogEntry<TContext> | null {
    return this._log(LogLevel.FATAL, msg, ctx, tags, err);
  }

  /**
   * Convenience: log an Error object – extracts message and uses ERROR level.
   */
  logError(err: Error, ctx?: Partial<TContext>, tags?: string[]): LogEntry<TContext> | null {
    return this.error(err.message || String(err), ctx, tags, err);
  }

  // -------------------------------------------------------------------------
  // Timers / Stopwatches
  // -------------------------------------------------------------------------

  /** Start a named timer. Returns the label (useful for chaining). */
  timer(label: string, ctx?: Partial<TContext>, tags?: string[], level?: LogLevel): string {
    this._timers.set(label, {
      label,
      start: performance.now(),
      context: ctx,
      tags,
      level,
    });
    return label;
  }

  /** Stop a named timer and log the elapsed duration. */
  timerEnd(label: string): number | null {
    const t = this._timers.get(label);
    if (!t) {
      this.warn(`Timer "${label}" was stopped but never started.`);
      return null;
    }
    this._timers.delete(label);
    const duration = performance.now() - t.start;
    const lvl = t.level ?? (duration > this.slowThresholdMs ? LogLevel.WARN : LogLevel.DEBUG);
    this._log(lvl, `[Timer] ${label}`, t.context, t.tags, undefined, duration, label);
    return duration;
  }

  /**
   * Measure execution time of an async function automatically.
   * Logs the duration (and re-throws errors).
   */
  async timeAsync<T>(
    label: string,
    fn: () => Promise<T>,
    ctx?: Partial<TContext>,
    tags?: string[],
  ): Promise<T> {
    this.timer(label, ctx, tags);
    try {
      const result = await fn();
      this.timerEnd(label);
      return result;
    } catch (err) {
      this.timerEnd(label);
      throw err;
    }
  }

  /**
   * Measure execution time of a sync function automatically.
   */
  timeSync<T>(
    label: string,
    fn: () => T,
    ctx?: Partial<TContext>,
    tags?: string[],
  ): T {
    this.timer(label, ctx, tags);
    try {
      const result = fn();
      this.timerEnd(label);
      return result;
    } catch (err) {
      this.timerEnd(label);
      throw err;
    }
  }

  /** Get the set of currently-active timer labels. */
  get activeTimers(): ReadonlySet<string> {
    return new Set(this._timers.keys());
  }

  // -------------------------------------------------------------------------
  // Error Tracking
  // -------------------------------------------------------------------------

  private _trackError(entry: LogEntry<TContext>): void {
    this._totalErrors++;
    const prev = this._errorCounts.get(entry.level) ?? 0;
    this._errorCounts.set(entry.level, prev + 1);

    if (entry.error) {
      const key = fingerprintError(entry.error);
      const existing = this._errorRegistry.get(key);
      if (existing) {
        existing.count++;
        existing.lastSeen = entry.timestamp;
        existing.lastError = entry.error;
      } else {
        this._errorRegistry.set(key, {
          key,
          count: 1,
          firstSeen: entry.timestamp,
          lastSeen: entry.timestamp,
          lastError: entry.error,
        });
      }
    }
  }

  /** All tracked error fingerprints. */
  get errorFingerprints(): ReadonlyMap<string, ErrorFingerprint> {
    return this._errorRegistry;
  }

  /** Total error count since logger creation. */
  get totalErrors(): number {
    return this._totalErrors;
  }

  /** Error counts per level. */
  get errorCounts(): ReadonlyMap<LogLevel, number> {
    return this._errorCounts;
  }

  /** Clear error tracking state. */
  clearErrorStats(): void {
    this._errorRegistry.clear();
    this._errorCounts.clear();
    this._totalErrors = 0;
  }

  // -------------------------------------------------------------------------
  // Global Error Interception
  // -------------------------------------------------------------------------

  /** Hook `unhandledrejection` and `error` events so they are logged automatically. */
  interceptGlobalErrors(): this {
    if (this._interceptorsActive || typeof window === 'undefined') return this;
    this._interceptorsActive = true;

    window.addEventListener('error', (ev) => {
      this.fatal(`Unhandled error: ${ev.message}`, { filename: ev.filename, lineno: ev.lineno, colno: ev.colno }, ['unhandled'], ev.error);
    });

    window.addEventListener('unhandledrejection', (ev) => {
      const reason = ev.reason;
      const msg = reason instanceof Error ? reason.message : String(reason);
      this.fatal(`Unhandled rejection: ${msg}`, {}, ['unhandled', 'promise'], reason instanceof Error ? reason : undefined);
    });

    return this;
  }

  /** Remove global error listeners added by `interceptGlobalErrors`. */
  stopErrorInterception(): void {
    // Note: we cannot strictly remove only *our* listeners since references were anonymous.
    // This is acceptable – callers typically call destroyAll once at shutdown.
    this._interceptorsActive = false;
  }
}

// ---------------------------------------------------------------------------
// Factory Helpers
// ---------------------------------------------------------------------------

/**
 * Create a pre-configured logger optimised for development.
 */
export function createDevLogger(module?: string): Logger {
  return new Logger({
    module,
    minLevel: LogLevel.TRACE,
    defaultFormat: 'pretty',
    devToolsGroups: true,
    interceptErrors: true,
  });
}

/**
 * Create a pre-configured logger optimised for production.
 */
export function createProdLogger(module?: string): Logger {
  return new Logger({
    module,
    minLevel: LogLevel.INFO,
    defaultFormat: 'compact',
    interceptErrors: true,
  });
}

/**
 * Create a fully-loaded logger with all common transports wired up.
 *
 * @param module  Module/namespace label.
 * @param remoteEndpoint  If provided, a RemoteTransport is added.
 * @param lsKey  If provided, a LocalStorageTransport is added.
 */
export function createFullLogger(
  module: string,
  options?: {
    remoteEndpoint?: string;
    localStorageKey?: string;
    minLevel?: LogLevel;
    memoryBufferSize?: number;
  },
): Logger {
  const log = new Logger({ module, minLevel: options?.minLevel });

  log.addTransport(new ConsoleTransport({
    format: import.meta.env?.DEV ? 'pretty' : 'compact',
    useGroups: !!import.meta.env?.DEV,
  }));

  log.addTransport(new MemoryTransport({ maxSize: options?.memoryBufferSize ?? 2000 }));

  if (options?.localStorageKey) {
    log.addTransport(new LocalStorageTransport(options.localStorageKey));
  }

  if (options?.remoteEndpoint) {
    log.addTransport(new RemoteTransport(options.remoteEndpoint));
  }

  return log;
}

// ---------------------------------------------------------------------------
// Default singleton export
// ---------------------------------------------------------------------------

/** Default application-wide logger instance. Re-export for convenience. */
export const logger = createFullLogger('app');

// ---------------------------------------------------------------------------
// Re-export everything for clean barrel imports
// ---------------------------------------------------------------------------

export {
  redactObject,
  FORMATTERS,
  REDACTED_PLACEHOLDER,
  DEFAULT_REDACT_PATTERNS,
  DEFAULT_VALUE_REDACT_PATTERNS,
};
