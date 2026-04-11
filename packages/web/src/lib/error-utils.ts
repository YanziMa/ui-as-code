/**
 * Error Utilities: Error classification, error boundaries, error reporting,
 * stack trace parsing, error grouping, retryable error detection,
 * error context enrichment, and error recovery patterns.
 */

// --- Types ---

export type ErrorCategory =
  | "network"
  | "timeout"
  | "auth"
  | "permission"
  | "validation"
  | "not_found"
  | "rate_limit"
  | "server"
  | "client"
  | "unknown";

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface ClassifiedError extends Error {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  context?: Record<string, unknown>;
  cause?: Error;
  timestamp: string;
  id: string;
}

export interface ErrorBoundaryOptions {
  /** Component or container element */
  container?: HTMLElement;
  /** Fallback UI to show on error */
  fallback?: string | HTMLElement;
  /** Called when an error is caught */
  onError?: (error: ClassifiedError) => void;
  /** Whether to auto-recover after delay (ms). 0 = no auto-recovery */
  recoverAfterMs?: number;
  /** Max consecutive errors before giving up */
  maxErrors?: number;
}

export interface ErrorReport {
  id: string;
  error: ClassifiedError;
  url: string;
  userAgent: string;
  timestamp: string;
  sessionInfo?: Record<string, unknown>;
  customData?: Record<string, unknown>;
}

export interface ErrorReporterConfig {
  /** Endpoint to send reports to */
  endpoint?: string;
  /** Sample rate (0-1). Default 1.0 */
  sampleRate?: number;
  /** Max reports per session. Default 50 */
  maxReportsPerSession?: number;
  /** Additional data to include in every report */
  globalContext?: () => Record<string, unknown>;
  /** Called before sending (return false to skip) */
  shouldReport?: (error: ClassifiedError) => boolean;
  /** Grouping key function (errors with same key are deduplicated) */
  groupKey?: (error: ClassifiedError) => string;
}

// --- Error Classification ---

/** HTTP status codes that indicate retryable errors */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

/** Classify an error into a category based on its properties */
export function classifyError(error: unknown): ClassifiedError {
  const err = error instanceof Error ? error : new Error(String(error));
  const id = generateErrorId();
  const now = new Date().toISOString();

  let category: ErrorCategory = "unknown";
  let severity: ErrorSeverity = "medium";
  let retryable = false;

  // DOMException
  if (err.name === "AbortError") {
    category = "timeout";
    severity = "low";
    retryable = true;
  }
  // Network errors
  else if (
    err.message.includes("Failed to fetch") ||
    err.message.includes("NetworkError") ||
    err.message.includes("net::ERR_") ||
    err.message.includes("ECONNREFUSED") ||
    err.message.includes("ENOTFOUND")
  ) {
    category = "network";
    severity = "high";
    retryable = true;
  }
  // Timeout
  else if (
    err.message.includes("timeout") ||
    err.message.includes("timed out") ||
    err.message.includes("ETIMEDOUT")
  ) {
    category = "timeout";
    severity = "medium";
    retryable = true;
  }
  // Auth errors (401/403)
  else if (
    err.message.includes("401") ||
    err.message.includes("403") ||
    err.message.includes("Unauthorized") ||
    err.message.includes("Forbidden") ||
    err.message.includes("authentication")
  ) {
    category = "auth";
    severity = "high";
    retryable = false;
  }
  // Not found (404)
  else if (
    err.message.includes("404") ||
    err.message.includes("Not Found")
  ) {
    category = "not_found";
    severity = "low";
    retryable = false;
  }
  // Rate limit (429)
  else if (
    err.message.includes("429") ||
    err.message.includes("Too Many Requests") ||
    err.message.includes("rate limit")
  ) {
    category = "rate_limit";
    severity = "medium";
    retryable = true;
  }
  // Server errors (5xx)
  else if (/5\d{2}/.test(err.message)) {
    category = "server";
    severity = "critical";
    retryable = true;
  }
  // Validation errors (4xx except above)
  else if (/4\d{2}/.test(err.message)) {
    category = "validation";
    severity = "medium";
    retryable = false;
  }
  // Permission errors
  else if (
    err.message.includes("Permission") ||
    err.message.includes("denied") ||
    err.name === "NotAllowedError" ||
    err.name === "SecurityError"
  ) {
    category = "permission";
    severity = "medium";
    retryable = false;
  }

  return Object.assign(err, {
    category,
    severity,
    retryable,
    timestamp: now,
    id,
  }) as ClassifiedError;
}

/** Check if an error is likely retryable */
export function isRetryable(error: unknown): boolean {
  return classifyError(error).retryable;
}

/** Enrich an error with additional context */
export function enrichError(
  error: unknown,
  context: Record<string, unknown>,
): ClassifiedError {
  const classified = classifyError(error);
  classified.context = { ...classified.context, ...context };
  return classified;
}

// --- Stack Trace Parsing ---

export interface ParsedStackFrame {
  file: string;
  line: number | null;
  column: number | null;
  functionName: string | null;
  raw: string;
}

/** Parse a stack trace string into structured frames */
export function parseStackTrace(stack: string): ParsedStackFrame[] {
  if (!stack) return [];

  const lines = stack.split("\n").slice(1); // Skip "Error:" line
  const frames: ParsedStackFrame[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Chrome/Firefox format: "functionName@file:line:col" or "at functionName (file:line:col)"
    let match = trimmed.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ??
      trimmed.match(/(.+?)@(.+?):(\d+):(\d+)/);

    if (match) {
      frames.push({
        functionName: match[1] || null,
        file: match[2] || "",
        line: match[3] ? parseInt(match[3], 10) : null,
        column: match[4] ? parseInt(match[4], 10) : null,
        raw: trimmed,
      });
    } else {
      // Fallback: capture the whole line
      frames.push({
        file: trimmed,
        line: null,
        column: null,
        functionName: null,
        raw: trimmed,
      });
    }
  }

  return frames;
}

/** Get the topmost application frame from a stack trace (skipping library code) */
export function getAppFrame(stack: string): ParsedStackFrame | null {
  const frames = parseStackTrace(stack);

  // Filter out known library/framework paths
  const skipPatterns = [
    /node_modules/,
    /angular/,
    /react-dom/,
    /react\/jsx-runtime/,
    /webpack/,
    /polyfills/,
    /zone\.js/,
  ];

  for (const frame of frames) {
    if (!skipPatterns.some((p) => p.test(frame.file))) {
      return frame;
    }
  }

  return frames[0] ?? null;
}

// --- Error Boundary (Browser) ---

/**
 * Create an error boundary around async operations or event handlers.
 * Catches errors, classifies them, and provides fallback UI.
 */
export function createErrorBoundary(options: ErrorBoundaryOptions = {}) {
  const {
    container,
    fallback = "<div style='padding:16px;color:#ef4444;border:1px solid #fca5a5;border-radius:8px;'>Something went wrong</div>",
    onError,
    recoverAfterMs = 0,
    maxErrors = 5,
  } = options;

  let errorCount = 0;
  let active = true;
  let recoverTimer: ReturnType<typeof setTimeout> | null = null;
  let originalContent: string | null = null;

  function handle(error: unknown): ClassifiedError {
    if (!active) return classifyError(error);

    const classified = classifyError(error);
    errorCount++;

    onError?.(classified);

    if (container && originalContent === null) {
      originalContent = container.innerHTML;
    }

    if (container) {
      if (typeof fallback === "string") {
        container.innerHTML = fallback;
      } else {
        container.innerHTML = "";
        container.appendChild(fallback.cloneNode(true));
      }
    }

    if (recoverAfterMs > 0 && errorCount < maxErrors) {
      recoverTimer = setTimeout(recover, recoverAfterMs);
    } else if (errorCount >= maxErrors) {
      active = false; // Give up after too many errors
    }

    return classified;
  }

  function recover(): void {
    if (container && originalContent !== null) {
      container.innerHTML = originalContent;
    }
    errorCount = 0;
  }

  /** Wrap a function so errors are caught by the boundary */
  function wrap<T extends (...args: unknown[]) => unknown>(fn: T): T {
    return ((...args: unknown[]) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch((err) => { throw handle(err); });
        }
        return result;
      } catch (err) {
        throw handle(err);
      }
    }) as T;
  }

  /** Destroy the boundary */
  function destroy(): void {
    active = false;
    if (recoverTimer) clearTimeout(recoverTimer);
    recover?.();
  }

  return { handle, wrap, recover, destroy, get errorCount() { return errorCount; } };
}

// --- Error Reporter ---

let reportCount = 0;

/**
 * Report errors to a remote endpoint (or local storage as fallback).
 */
export function createErrorReporter(config: ErrorReporterConfig = {}) {
  const {
    endpoint,
    sampleRate = 1.0,
    maxReportsPerSession = 50,
    globalContext,
    shouldReport,
    groupKey,
  } = config;

  const sentGroups = new Set<string>();

  function report(error: unknown, customData?: Record<string, unknown>): boolean {
    if (reportCount >= maxReportsPerSession) return false;
    if (Math.random() > sampleRate) return false;

    const classified = classifyError(error);
    if (shouldReport && !shouldReport(classified)) return false;

    const group = groupKey ? groupKey(classified) : classified.id;
    if (sentGroups.has(group)) return false; // Deduplicate
    sentGroups.add(group);

    const errorReport: ErrorReport = {
      id: classified.id,
      error: classified,
      url: typeof location !== "undefined" ? location.href : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: classified.timestamp,
      sessionInfo: globalContext?.(),
      customData,
    };

    reportCount++;

    if (endpoint) {
      sendToEndpoint(endpoint, errorReport);
    } else {
      storeLocally(errorReport);
    }

    return true;
  }

  return { report, get reportCount() { return reportCount; }, reset: () => { reportCount = 0; sentGroups.clear(); } };
}

async function sendToEndpoint(endpoint: string, report: ErrorReport): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, JSON.stringify(report));
    } else {
      await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(report),
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    storeLocally(report);
  }
}

function storeLocally(report: ErrorReport): void {
  try {
    const key = `error_report_${report.id}`;
    localStorage.setItem(key, JSON.stringify(report));
  } catch {}
}

// --- Global Error Handlers ---

/** Set up global unhandled error handlers */
export function setupGlobalErrorHandler(
  reporter?: ReturnType<typeof createErrorReporter>,
): () => void {
  const handler = (event: ErrorEvent | PromiseRejectionEvent) => {
    const error = event instanceof ErrorEvent
      ? (event.error ?? new Error(event.message))
      : (event.reason ?? new Error("Unhandled promise rejection"));

    const classified = classifyError(error);
    reporter?.report(classified, {
      source: event instanceof ErrorEvent ? "unhandled_error" : "unhandled_rejection",
    });

    console.error("[GlobalErrorHandler]", classified.message, classified);
  };

  window.addEventListener("error", handler as EventListener);
  window.addEventListener("unhandledrejection", handler as EventListener);

  return () => {
    window.removeEventListener("error", handler as EventListener);
    window.removeEventListener("unhandledrejection", handler as EventListener);
  };
}

// --- Utility Functions ---

function generateErrorId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Create a new error with cause chain support */
export function createError(
  message: string,
  options?: {
    code?: string;
    status?: number;
    cause?: Error;
    context?: Record<string, unknown>;
  },
): Error {
  const err = new Error(message);
  if (options?.code) (err as Error & { code: string }).code = options.code;
  if (options?.status) (err as Error & { status: number }).status = options.status;
  if (options?.cause) (err as Error & { cause: Error }).cause = options.cause;
  if (options?.context) (err as Error & { context: Record<string, unknown> }).context = options.context;
  return err;
}

/** Retry a function with exponential backoff on retryable errors */
export async function retryOnError<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    shouldRetry?: (error: ClassifiedError) => boolean;
  },
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 300, shouldRetry } = options ?? {};
  let lastError: ClassifiedError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (rawErr) {
      const classified = classifyError(rawErr);
      lastError = classified;

      if (attempt >= maxAttempts || !classified.retryable || (shouldRetry && !shouldRetry(classified))) {
        throw classified;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * baseDelayMs * 0.5;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError!;
}
