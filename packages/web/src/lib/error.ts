/**
 * Error handling utilities: custom error classes, error classification,
 * retry strategies, error boundaries for React, stack trace parsing,
 * and error reporting helpers.
 */

// --- Custom Error Classes ---

/** Base application error with context */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "AppError";
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/** Network/API error */
export class NetworkError extends AppError {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url?: string,
    cause?: Error,
  ) {
    super(message, `NETWORK_${status}`, status, cause);
    this.name = "NetworkError";
  }
}

/** Validation error */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}

/** Not found error */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const msg = id ? `${resource} not found: ${id}` : `${resource} not found`;
    super(msg, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

/** Unauthorized/Authentication error */
export class AuthError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "AuthError";
  }
}

/** Rate limit error */
export class RateLimitError extends AppError {
  constructor(
    public readonly retryAfterMs: number,
    message = "Rate limit exceeded",
  ) {
    super(message, "RATE_LIMITED", 429);
    this.name = "RateLimitError";
  }
}

/** Timeout error */
export class TimeoutError extends AppError {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`, "TIMEOUT", 408);
    this.name = "TimeoutError";
  }
}

/** Abort/cancellation error */
export class CancelledError extends AppError {
  constructor(reason = "Operation cancelled") {
    super(reason, "CANCELLED", 499);
    this.name = "CancelledError";
  }
}

// --- Error Classification ---

export type ErrorCategory =
  | "network"
  | "auth"
  | "validation"
  | "not_found"
  | "rate_limit"
  | "timeout"
  | "server"
  | "client"
  | "unknown";

/** Classify an error into a category */
export function classifyError(error: unknown): ErrorCategory & { error: Error } {
  if (error instanceof NetworkError) return { ...error, category: "network" as ErrorCategory };
  if (error instanceof AuthError) return { ...error, category: "auth" as ErrorCategory };
  if (error instanceof ValidationError) return { ...error, category: "validation" as ErrorCategory };
  if (error instanceof NotFoundError) return { ...error, category: "not_found" as ErrorCategory };
  if (error instanceof RateLimitError) return { ...error, category: "rate_limit" as ErrorCategory };
  if (error instanceof TimeoutError) return { ...error, category: "timeout" as ErrorCategory };

  const err = error instanceof Error ? error : new Error(String(error));

  // DOMException
  if (err.name === "AbortError") return { error: err, category: "timeout" as ErrorCategory };

  // Fetch API errors
  if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
    return { error: err, category: "network" as ErrorCategory };
  }

  // HTTP status from message or name
  const statusMatch = err.message.match(/status\s*(\d{3})/i);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (status === 401 || status === 403) return { error: err, category: "auth" as ErrorCategory };
    if (status === 404) return { error: err, category: "not_found" as ErrorCategory };
    if (status === 429) return { error: err, category: "rate_limit" as ErrorCategory };
    if (status >= 400 && status < 500) return { error: err, category: "client" as ErrorCategory };
    if (status >= 500) return { error: err, category: "server" as ErrorCategory };
  }

  return { error: err, category: "unknown" as ErrorCategory };
}

/** Check if an error is recoverable (worth retrying) */
export function isRecoverable(error: unknown): boolean {
  const cat = classifyError(error);
  return ["network", "timeout", "rate_limit", "server"].includes(cat.category);
}

/** Check if an error should be shown to the user */
export function isUserFacing(error: unknown): boolean {
  const cat = classifyError(error);
  return !["network", "server", "unknown"].includes(cat.category);
}

/** Get a user-friendly message for an error */
export function getUserMessage(error: unknown): string {
  const cat = classifyError(error);

  switch (cat.category) {
    case "network":
      return "Connection lost. Please check your internet connection.";
    case "auth":
      return "You need to sign in to continue.";
    case "validation":
      return cat.error.message || "Please check your input and try again.";
    case "not_found":
      return "The requested resource was not found.";
    case "rate_limit":
      return "Too many requests. Please wait a moment and try again.";
    case "timeout":
      return "The request took too long. Please try again.";
    case "server":
      return "Something went wrong on our end. Please try again later.";
    default:
      return "An unexpected error occurred.";
  }
}

// --- Error Boundary (React-compatible) ---

export interface ErrorBoundaryProps {
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<SomethingWentWrong />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{ padding: 20, textAlign: "center", color: "#dc2626" }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Error Reporting ---

/** Capture and optionally report an error */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error("[ErrorCapture]", err.message, context ?? "");

  // In production, you'd send to an error reporting service
  // e.g., Sentry.captureException(err, { extra: context });
}

/** Wrap an async function with error handling */
export function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T,
  onError?: (error: Error) => void,
): Promise<T | undefined> {
  return fn().catch((error) => {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    captureError(err);
    return fallback;
  });
}

/** Create a wrapped version of a function that catches errors */
export function wrapWithErrorHandler<T extends (...args: any[]) => any>(
  fn: T,
  onError?: (error: Error, args: Parameters<T>) => void,
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((err) => {
          const error = err instanceof Error ? err : new Error(String(err));
          onError?.(error, args);
          throw error; // Re-throw so callers can still handle it
        });
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error, args);
      throw error;
    }
  }) as T;
}
