/**
 * Error handling utilities: error classification, recovery strategies,
 * error boundaries (conceptual), error reporting, and user-facing
 * error message formatting.
 */

// --- Types ---

export type ErrorCategory =
  | "network"
  | "auth"
  | "validation"
  | "not_found"
  | "rate_limit"
  | "server"
  | "timeout"
  | "permission"
  | "unknown";

export interface ClassifiedError {
  original: Error;
  category: ErrorCategory;
  userMessage: string;
  recoverable: boolean;
  retryable: boolean;
  statusCode?: number;
  context?: Record<string, unknown>;
}

export interface ErrorHandlerOptions {
  /** Custom error classifiers (checked in order) */
  classifiers?: Array<(error: Error) => ClassifiedError | null>;
  /** Whether to log errors to console */
  logToConsole?: boolean;
  /** Custom logger function */
  logger?: (entry: ErrorLogEntry) => void;
  /** Global context added to all errors */
  defaultContext?: Record<string, unknown>;
  /** Whether to report errors to a remote service */
  reporter?: (error: ClassifiedError) => Promise<void>;
}

export interface ErrorLogEntry {
  timestamp: string;
  category: ErrorCategory;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  userId?: string;
}

export interface RecoveryAction {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
}

// --- Built-in Classifiers ---

const DEFAULT_CLASSIFIERS: Array<(error: Error) => ClassifiedError | null> = [
  // Network errors
  (error) => {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("failed to fetch") ||
      msg.includes("net::err_") ||
      msg.includes("connection")
    ) {
      return classify(error, "network", "Network connection failed. Please check your internet connection.", true, true);
    }
    return null;
  },

  // Timeout errors
  (error) => {
    if (
      error.name === "TimeoutError" ||
      error.message.toLowerCase().includes("timeout") ||
      error.message.toLowerCase().includes("timed out") ||
      error.message.toLowerCase().includes("abort")
    ) {
      return classify(error, "timeout", "Request timed out. Please try again.", true, true);
    }
    return null;
  },

  // Auth errors (401/403)
  (error) => {
    const status = extractStatus(error);
    if (status === 401) {
      return classify(error, "auth", "Your session has expired. Please sign in again.", false, false, status);
    }
    if (status === 403) {
      return classify(error, "permission", "You don't have permission to perform this action.", false, false, status);
    }
    return null;
  },

  // Validation errors (400/422)
  (error) => {
    const status = extractStatus(error);
    if (status === 400 || status === 422) {
      return classify(error, "validation", "The request data is invalid. Please check and try again.", true, false, status);
    }
    return null;
  },

  // Not found (404)
  (error) => {
    const status = extractStatus(error);
    if (status === 404) {
      return classify(error, "not_found", "The requested resource was not found.", false, false, status);
    }
    return null;
  },

  // Rate limit (429)
  (error) => {
    const status = extractStatus(error);
    if (status === 429) {
      return classify(error, "rate_limit", "Too many requests. Please wait a moment and try again.", true, true, status);
    }
    return null;
  },

  // Server errors (5xx)
  (error) => {
    const status = extractStatus(error);
    if (status >= 500 && status < 600) {
      return classify(error, "server", "Something went wrong on our end. We're working on it.", true, true, status);
    }
    return null;
  },
];

// --- Main Handler ---

/**
 * Centralized error handler with classification, logging,
 * optional remote reporting, and recovery action suggestions.
 *
 * @example
 * const handler = new ErrorHandler({ reporter: sendToSentry });
 * const result = handler.handle(error, { action: "save-settings" });
 * console.log(result.userMessage); // User-friendly message
 * console.log(result.recoveryActions); // Suggested actions
 */
export class ErrorHandler {
  private options: Required<Pick<ErrorHandlerOptions, "logToConsole">> & ErrorHandlerOptions;

  constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      logToConsole: true,
      ...options,
    };
  }

  /**
   * Handle an error: classify, log, optionally report, and return
   * a structured result with user message and recovery suggestions.
   */
  handle(
    error: unknown,
    context?: Record<string, unknown>,
  ): ClassifiedError & { recoveryActions: RecoveryAction[] } {
    const err = ensureError(error);
    const mergedContext = { ...this.options.defaultContext, ...context };

    // Try custom classifiers first, then built-in
    let classified: ClassifiedError | null = null;
    const allClassifiers = [...(this.options.classifiers ?? []), ...DEFAULT_CLASSIFIERS];

    for (const classifier of allClassifiers) {
      classified = classifier(err);
      if (classified) break;
    }

    // Fallback classification
    if (!classified) {
      classified = classify(err, "unknown", "An unexpected error occurred.", false, false);
    }

    classified.context = mergedContext;

    // Log
    const logEntry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      category: classified.category,
      message: classified.original.message,
      stack: classified.original.stack,
      context: mergedContext,
    };

    if (this.options.logToConsole) {
      if (this.options.logger) {
        this.options.logger(logEntry);
      } else {
        console.error(`[Error:${classified.category.toUpperCase()}]`, logEntry);
      }
    }

    // Report
    if (this.options.reporter) {
      this.options.reporter(classified).catch(() => {});
    }

    return {
      ...classified,
      recoveryActions: suggestRecovery(classified),
    };
  }

  /**
   * Wrap a function so all errors are automatically handled.
   * Returns the function's result or throws a handled error.
   */
  wrap<TArgs extends unknown[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    context?: Record<string, unknown>,
  ): (...args: TArgs) => TReturn {
    return (...args: TArgs): TReturn => {
      try {
        const result = fn(...args);
        // Handle async functions
        if (result instanceof Promise) {
          return result.catch((error: unknown) => {
            this.handle(error, context);
            throw error;
          }) as TReturn;
        }
        return result;
      } catch (error) {
        this.handle(error, context);
        throw error;
      }
    };
  }

  /**
   * Create an async boundary that catches and handles errors,
   * returning a fallback value instead of throwing.
   */
  asyncBoundary<T>(
    fn: () => Promise<T>,
    fallback: T,
    context?: Record<string, unknown>,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }

  /** Create a sync boundary that catches and handles errors */
  syncBoundary<T>(fn: () => T, fallback: T, context?: Record<string, unknown>): T {
    try {
      return fn();
    } catch (error) {
      this.handle(error, context);
      return fallback;
    }
  }
}

// --- Recovery Suggestions ---

function suggestRecovery(error: ClassifiedError): RecoveryAction[] {
  const actions: RecoveryAction[] = [];

  switch (error.category) {
    case "network":
      actions.push(
        { label: "Retry", action: () => window.location.reload(), primary: true },
        { label: "Check Connection", action: () => {} },
      );
      break;

    case "timeout":
      actions.push(
        { label: "Try Again", action: () => window.location.reload(), primary: true },
      );
      break;

    case "auth":
      actions.push(
        { label: "Sign In", action: () => { window.location.href = "/login"; }, primary: true },
      );
      break;

    case "validation":
      actions.push(
        { label: "Review Input", action: () => {}, primary: true },
      );
      break;

    case "rate_limit":
      actions.push(
        { label: "Try Again Later", action: () => window.location.reload(), primary: true },
      );
      break;

    case "server":
      actions.push(
        { label: "Retry", action: () => window.location.reload(), primary: true },
        { label: "Contact Support", action: () => {} },
      );
      break;

    default:
      if (error.retryable && error.recoverable) {
        actions.push({ label: "Retry", action: () => window.location.reload(), primary: true });
      }
      actions.push(
        { label: "Go Home", action: () => { window.location.href = "/"; } },
      );
  }

  return actions;
}

// --- Helpers ---

function classify(
  error: Error,
  category: ErrorCategory,
  userMessage: string,
  recoverable: boolean,
  retryable: boolean,
  statusCode?: number,
): ClassifiedError {
  return {
    original: error,
    category,
    userMessage,
    recoverable,
    retryable,
    statusCode,
  };
}

function ensureError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

function extractStatus(error: Error): number | undefined {
  // Check for HTTP status in common patterns
  const match = error.message.match(/(\d{3})/);
  if (match) {
    const num = Number(match[1]);
    if (num >= 100 && num < 600) return num;
  }

  // Check for status property on custom errors
  const anyErr = error as Record<string, unknown>;
  if (typeof anyErr.status === "number") return anyErr.status as number;
  if (typeof anyErr.statusCode === "number") return anyErr.statusCode as number;

  return undefined;
}

// --- Standalone Utilities ---

/** Quick-classify an error without full handler setup */
export function classifyError(error: unknown): ClassifiedError {
  const handler = new ErrorHandler({ logToConsole: false });
  return handler.handle(error);
}

/** Get a user-friendly message for an error */
export function getUserMessage(error: unknown): string {
  return classifyError(error).userMessage;
}

/** Check if an error is retryable */
export function isRetryable(error: unknown): boolean {
  return classifyError(error).retryable;
}

/** Check if an error is recoverable (user can take action) */
export function isRecoverable(error: unknown): boolean {
  return classifyError(error).recoverable;
}

/** Get the error category */
export function getErrorCategory(error: unknown): ErrorCategory {
  return classifyError(error).category;
}

/** Create a noop error handler (swallows all errors) */
export function createNoopHandler(): ErrorHandler {
  return new ErrorHandler({
    logToConsole: false,
    logger: () => {},
  });
}
