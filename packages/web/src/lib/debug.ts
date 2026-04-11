/**
 * Debug Utilities: Conditional debug mode, assertion helpers,
 * dev-only guards, environment detection, source map support,
 * and development-time convenience functions.
 */

// --- Types ---

export interface DebugOptions {
  /** Enable debug mode? */
  enabled?: boolean;
  /** Only show debug output for these tags/contexts */
  allowedTags?: string[];
  /** Blocked tags (always suppressed even in debug mode) */
  blockedTags?: string[];
  /** Show timestamps on debug messages? */
  showTimestamp?: boolean;
  /** Show file:line info (requires Error.stack parsing) */
  showLocation?: boolean;
  /** Custom handler for debug output */
  handler?: (message: string, context?: Record<string, unknown>) => void;
}

// --- Global State ---

let isDebugEnabled = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

/**
 * Enable or disable global debug mode.
 * When disabled, all debug* calls become no-ops.
 */
export function setDebug(enabled: boolean): void {
  isDebugEnabled = enabled;
}

/** Check if debug mode is currently active */
export function isDebug(): boolean {
  return isDebugEnabled;
}

/**
 * Create a scoped debug logger with tag filtering.
 */
export function createDebugger(tag: string, options: Partial<DebugOptions> = {}): {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  table?: (data: Record<string, unknown>) => void;
} {
  const { allowedTags, blockedTags, showTimestamp, showLocation, handler } = {
    allowedTags: undefined,
    blockedTags: [],
    ...options,
  };

  function shouldLog(): boolean {
    if (!isDebugEnabled) return false;
    if (blockedTags.includes(tag)) return false;
    if (allowedTags && !allowedTags.includes(tag)) return false;
    return true;
  }

  function formatMessage(...args: unknown[]): string {
    const parts = args.map((a) => {
      if (typeof a === "object" && a !== null) {
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    });

    let msg = parts.join(" ");
    if (showTimestamp) msg = `[${new Date().toISOString()}] ${msg}`;
    if (showLocation) {
      const loc = getCallerLocation(2);
      if (loc) msg = `[${loc}] ${msg}`;
    }
    if (tag) msg = `[${tag}] ${msg}`;

    return msg;
  }

  return {
    log: (...args: unknown[]) => {
      if (!shouldLog()) return;
      const msg = formatMessage(...args);
      if (handler) handler(msg, { tag });
      else console.log(msg);
    },
    warn: (...args: unknown[]) => {
      if (!shouldLog()) return;
      const msg = formatMessage(...args);
      if (handler) handler(msg, { tag });
      else console.warn(msg);
    },
    error: (...args: unknown[]) => {
      // Always show errors regardless of debug mode
      const msg = formatMessage(...args);
      if (handler) handler(msg, { tag });
      else console.error(msg);
    },
    ...(typeof console.table === "function"
      ? { table: (data: Record<string, unknown>) => { if (shouldLog()) console.table(data); } }
      : {}),
  };
}

// --- Assertions ---

/**
 * Assert that a condition is true. Throws in debug mode, no-ops otherwise.
 */
export function assert(condition: boolean, message = "Assertion failed", ...args: unknown[]): asserts condition {
  if (!condition) {
    const formatted = args.length > 0 ? `${message}: ${args.join(", ")}` : message;
    if (isDebugEnabled) {
      throw new Error(`[Debug Assert] ${formatted}`);
    }
    console.warn(`[Debug Assert] ${formatted}`);
  }
}

/**
 * Assert that a value is not null/undefined. Returns the value for chaining.
 */
export function assertExists<T>(value: T | null | undefined, message = "Value must exist"): T {
  assert(value != null, message);
  return value!;
}

/**
 * Assert that a value is of the expected type.
 */
export function assertType(value: unknown, expectedType: string, label = "value"): void {
  const actualType = Array.isArray(value) ? "array" : typeof value;
  assert(
    actualType === expectedType,
    `${label} expected type ${expectedType}, got ${actualType}`,
  );
}

// --- Dev Guards ---

/**
 * Execute code only in non-production environments.
 * The callback receives true when in dev mode, false in production.
 */
export function devOnly(fn: (isDev: boolean) => void): void {
  fn(isDebugEnabled);
}

/**
 * Get a value that differs between dev and production.
 */
export function devValue<T>(dev: T, prod: T): T {
  return isDebugEnabled ? dev : prod;
}

/**
 * Check if running in a browser environment.
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Check if running in Node.js.
 */
export function isNode(): boolean {
  return typeof process !== "undefined" && process.versions?.node != null;
}

/**
 * Check if running in a worker/thread context.
 */
export function isWorker(): boolean {
  return (
    typeof self !== "undefined" &&
    typeof window === "undefined" &&
    typeof (self as unknown as { importScripts?: unknown }).importScripts === "function"
  );
}

// --- Location Helpers ---

/** Extract file:line from Error stack at given depth */
function getCallerLocation(depth = 1): string | null {
  try {
    const stack = new Error().stack;
    if (!stack) return null;

    const lines = stack.split("\n");
    // Skip "Error", "getCallerLocation", and depth frames
    const targetLine = lines[3 + depth];
    if (!targetLine) return null;

    // Parse typical format: "at functionName (file:line:col)"
    const match = targetLine.match(/\(([^)]+):(\d+):(\d+)/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }

    // Fallback: just return the line as-is trimmed
    return targetLine.trim();
  } catch {
    return null;
  }
}

// --- Grouped Timers ---

const timers = new Map<string, number>();

/**
 * Start a named debug timer.
 */
export function timeStart(label: string): void {
  timers.set(label, performance.now());
}

/**
 * End a named debug timer and log the duration.
 */
export function timeEnd(label: string): number {
  const start = timers.get(label);
  if (start === undefined) {
    console.warn(`[Timer] "${label}" was never started`);
    return 0;
  }
  timers.delete(label);
  const elapsed = performance.now() - start;
  console.log(`[Timer] ${label}: ${elapsed.toFixed(2)}ms`);
  return elapsed;
}

/**
 * Time an async operation and log its duration.
 */
export async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  timeStart(label);
  try {
    return await fn();
  } finally {
    timeEnd(label);
  }
}
