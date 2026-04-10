/**
 * Client-side error logger for production monitoring.
 * Logs to console in dev, can be extended to report to external services.
 */

interface ErrorLogEntry {
  timestamp: string;
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  componentStack?: string;
  type: "error" | "unhandled" | "promise";
}

const isDev = process.env.NODE_ENV === "development";

/** Queue of errors (in-memory, survives page session) */
let errorQueue: ErrorLogEntry[] = [];
const MAX_QUEUE_SIZE = 50;

function enqueue(entry: ErrorLogEntry): void {
  errorQueue.push(entry);
  if (errorQueue.length > MAX_QUEUE_SIZE) {
    errorQueue.shift();
  }
}

export function logError(error: Error | string, context?: Record<string, unknown>): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    message: typeof error === "string" ? error : error.message,
    stack: typeof error !== "string" ? error.stack : undefined,
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    type: "error",
  };

  if (isDev) {
    console.error("[ErrorLogger]", entry.message, context || "", entry.stack);
  } else {
    console.warn("[ErrorLogger]", entry.message);
    // In production, you'd send to Sentry/LogRocket/etc here:
    // sendToExternalService(entry, context);
  }

  enqueue(entry);
}

export function logUnhandledError(event: ErrorEvent): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    message: event.message,
    stack: event.error?.stack,
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    type: "unhandled",
  };

  if (!isDev) {
    console.warn("[ErrorLogger] Unhandled:", entry.message);
  }

  enqueue(entry);
}

export function logUnhandledRejection(event: PromiseRejectionEvent): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    message: event.reason instanceof Error ? event.reason.message : String(event.reason),
    stack: event.reason instanceof Error ? event.reason.stack : undefined,
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    type: "promise",
  };

  if (!isDev) {
    console.warn("[ErrorLogger] Unhandled rejection:", entry.message);
  }

  enqueue(entry);
}

export function getErrorQueue(): ErrorLogEntry[] {
  return [...errorQueue];
}

export function clearErrorQueue(): void {
  errorQueue = [];
}

/**
 * Call once in root layout/client component to install global error handlers.
 */
export function installGlobalHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", logUnhandledError);
  window.addEventListener("unhandledrejection", logUnhandledRejection);
}
