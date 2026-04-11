/**
 * React Error Boundary: Error catching, fallback rendering,
 * error recovery, error logging integration, and boundary
 * composition utilities for React applications.
 */

// --- Types ---

export interface ErrorBoundaryProps {
  /** Fallback UI to render when an error is caught */
  fallback: (error: Error, errorInfo: React.ErrorInfo) => React.ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Custom reset keys that trigger a re-render when changed */
  resetKeys?: readonly unknown[];
  /** Children to render normally */
  children?: React.ReactNode;
  /** Show a default error UI instead of requiring fallback prop? */
  showDefaultFallback?: boolean;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export interface ErrorBoundaryInstance {
  /** Programmatically trigger a reset */
  reset(): void;
  /** Get the current error if any */
  getError(): Error | null;
}

// --- Default Fallback Components ---

/** Simple default error fallback component */
export function DefaultErrorFallback({ error, onReset }: { error: Error; onReset?: () => void }): JSX.Element {
  return (
    <div
      role="alert"
      style={{
        padding: "24px",
        margin: "16px 0",
        border: "1px solid #fca5a5",
        borderRadius: "8px",
        background: "#fef2f2",
        color: "#991b1b",
        fontFamily: "-apple-system, sans-serif",
        fontSize: "14px",
        lineHeight: "1.5",
      }}
    >
      <strong style={{ display: "block", marginBottom: "8px" }}>
        Something went wrong
      </strong>
      <pre style={{ margin: "8px 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {error.message}
      </pre>
      {onReset && (
        <button
          onClick={onReset}
          style={{
            marginTop: "12px",
            padding: "6px 16px",
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Minimal inline error fallback for compact spaces */
export function InlineErrorFallback({ error }: { error: Error }): JSX.Element {
  return (
    <span
      style={{
        color: "#dc2626",
        fontSize: "13px",
        fontStyle: "italic",
      }}
      title={error.stack ?? error.message}
    >
      Error: {error.message.slice(0, 80)}
    </span>
  );
}

// --- Error Boundary Class Component ---

/**
 * React Error Boundary class component.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallback={(err) => <div>Error: {err.message}</div>}
 *   onError={(err) => logError(err)}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private instanceRef: React.RefObject<ErrorBoundaryInstance>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
    this.instanceRef = { current: null } as React.RefObject<ErrorBoundaryInstance>;
    this.instanceRef.current = {
      reset: () => this.reset(),
      getError: () => this.state.error,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary]", error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset when resetKeys change
    const { resetKeys = [] } = this.props;
    const prevKeys = prevProps.resetKeys ?? [];
    if (
      this.state.hasError &&
      resetKeys.length > 0 &&
      resetKeys.some((key, i) => key !== prevKeys[i])
    ) {
      this.reset();
    }
  }

  reset(): void {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.showDefaultFallback) {
        return <DefaultErrorFallback error={this.state.error} onReset={() => this.reset()} />;
      }
      return this.props.fallback(this.state.error, this.state.errorInfo!);
    }

    return this.props.children ?? null;
  }
}

// --- Higher-Order Error Boundary ---

/**
 * HOC that wraps a component with an error boundary.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    fallback?: (error: Error, errorInfo: React.ErrorInfo) => React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    resetKeys?: readonly unknown[];
  },
): React.FC<P> & { displayName: string } {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || "Component";

  const Wrapper: React.FC<P> = (props) => (
    <ErrorBoundary
      fallback={options?.fallback ?? ((error) => <DefaultErrorFallback error={error} />)}
      onError={options?.onError}
      resetKeys={options?.resetKeys}
    >
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  Wrapper.displayName = `withErrorBoundary(${displayName})`;
  return Wrapper as React.FC<P> & { displayName: string };
}

// --- Error Logger Integration ---

/** Format error info for logging services */
export function formatErrorForLogging(
  error: Error,
  errorInfo?: React.ErrorInfo,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    url: typeof window !== "undefined" ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    ...extra,
  };
}

// --- Recovery Utilities ---

/** Create a recovery action that retries the last operation */
export function createRecoveryAction(onRetry: () => void): {
  retry: () => void;
  isRecovering: boolean;
} {
  let recovering = false;

  function retry(): void {
    if (recovering) return;
    recovering = true;
    try {
      onRetry();
    } finally {
      setTimeout(() => { recovering = false; }, 1000); // Debounce
    }
  }

  return { retry, get isRecovering() { return recovering; } };
}

// --- Boundary Composition ---

/**
 * Compose multiple error boundaries into a single wrapper.
 * Each child gets its own isolated error boundary.
 */
export function IsolatedChildren({
  children,
  fallback,
  onError,
}: {
  children: React.ReactNode[];
  fallback: (error: Error, errorInfo: React.ErrorInfo) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}): JSX.Element[] {
  return React.Children.map(children, (child, i) => (
    <ErrorBoundary key={i} fallback={fallback} onError={onError}>
      {child}
    </ErrorBoundary>
  )) as unknown as JSX.Element[];
}
