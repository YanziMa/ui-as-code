/**
 * Error Boundary: Vanilla JS error boundary for catching runtime errors in UI sections,
 * with fallback UI rendering, error logging, retry mechanism, error details display,
 * and optional error reporting integration.
 */

// --- Types ---

export interface ErrorBoundaryOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Fallback UI renderer (receives error info) */
  fallback?: (error: ErrorBoundaryError) => HTMLElement;
  /** Custom error title */
  errorTitle?: string;
  /** Show error stack trace? */
  showStackTrace?: boolean;
  /** Show error component name? */
  showComponentName?: boolean;
  /** Enable retry button? */
  enableRetry?: boolean;
  /** Retry button label */
  retryLabel?: string;
  /** Callback on error caught */
  onError?: (error: ErrorBoundaryError) => void;
  /** Callback on reset/retry */
  onReset?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface ErrorBoundaryError {
  error: Error;
  errorInfo?: { componentStack: string };
  timestamp: number;
}

export interface ErrorBoundaryInstance {
  element: HTMLElement;
  /** Check if currently showing error state */
  hasError: () => boolean;
  /** Get last error (if any) */
  getError: () => ErrorBoundaryError | null;
  /** Manually trigger error state */
  catchError: (error: Error, info?: { componentStack: string }) => void;
  /** Reset to normal state */
  reset: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default Fallback Renderer ---

function defaultFallback(errorInfo: ErrorBoundaryError, opts: Required<Pick<ErrorBoundaryOptions, "errorTitle" | "showStackTrace" | "showComponentName" | "retryLabel">>): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "error-boundary-fallback";
  wrapper.style.cssText = `
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:32px 24px;min-height:200px;text-align:center;
    border:2px dashed #fecaca;border-radius:12px;background:#fef2f2;
    font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  `;

  // Icon
  const icon = document.createElement("div");
  icon.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#dc2626" stroke-width="1.5"/><path d="M12 8v4M12 16h.01" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/></svg>`;
  icon.style.marginBottom = "12px";
  wrapper.appendChild(icon);

  // Title
  const title = document.createElement("h3");
  title.textContent = opts.errorTitle;
  title.style.cssText = "font-size:16px;font-weight:600;color:#991b1b;margin:0 0 4px;";
  wrapper.appendChild(title);

  // Message
  const msg = document.createElement("p");
  msg.textContent = errorInfo.error.message || "An unexpected error occurred";
  msg.style.cssText = "font-size:13px;color:#b91c1c;margin:0 0 16px;max-width:400px;line-height:1.5;";
  wrapper.appendChild(msg);

  // Component name
  if (opts.showComponentName && errorInfo.errorInfo?.componentStack) {
    const compName = extractComponentName(errorInfo.errorInfo.componentStack);
    if (compName) {
      const compEl = document.createElement("code");
      compEl.textContent = `in ${compName}`;
      compEl.style.cssText = "display:inline-block;padding:3px 10px;background:#fee2e2;color:#991b1b;border-radius:4px;font-size:11px;margin-bottom:12px;";
      wrapper.appendChild(compEl);
    }
  }

  // Stack trace
  if (opts.showStackTrace && errorInfo.error.stack) {
    const stackPre = document.createElement("pre");
    stackPre.className = "error-stack-trace";
    stackPre.textContent = errorInfo.error.stack;
    stackPre.style.cssText = `
      max-height:150px;overflow:auto;padding:10px 14px;
      background:#fff;border-radius:6px;font-size:11px;color:#7f1d1d;
      text-align:left;white-space:pre-wrap;word-break:break-all;margin-bottom:16px;
      width:100%;max-width:500px;box-sizing:border-box;
    `;
    wrapper.appendChild(stackPre);
  }

  // Retry button
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = opts.retryLabel;
  btn.style.cssText = `
    padding:8px 20px;border-radius:8px;font-size:13px;font-weight:500;
    background:#dc2626;color:#fff;border:none;cursor:pointer;
    transition:background 0.15s;
  `;
  btn.addEventListener("mouseenter", () => { btn.style.background = "#b91c1c"; });
  btn.addEventListener("mouseleave", () => { btn.style.background = "#dc2626"; });
  wrapper.appendChild(btn);

  return wrapper;
}

function extractComponentName(stack: string): string | null {
  // Try to find a React-like component name from the stack
  const match = stack.match(/(?:at\s+)([A-Z][A-Za-z0-9_$]*)/);
  return match ? match[1] : null;
}

// --- Main Class ---

export class ErrorBoundaryManager {
  create(options: ErrorBoundaryOptions): ErrorBoundaryInstance {
    const opts = {
      errorTitle: options.errorTitle ?? "Something went wrong",
      showStackTrace: options.showStackTrace ?? false,
      showComponentName: options.showComponentName ?? true,
      enableRetry: options.enableRetry ?? true,
      retryLabel: options.retryLabel ?? "Try Again",
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("ErrorBoundary: container element not found");

    let currentError: ErrorBoundaryError | null = null;
    let originalContent: string = "";
    let fallbackEl: HTMLElement | null = null;

    function capture(error: Error, info?: { componentStack: string }): void {
      currentError = { error, errorInfo: info, timestamp: Date.now() };

      // Save original content
      originalContent = container.innerHTML;

      // Clear and render fallback
      container.innerHTML = "";
      fallbackEl = opts.fallback
        ? opts.fallback(currentError)
        : defaultFallback(currentError, opts);

      // Wire up retry button
      if (opts.enableRetry) {
        const retryBtn = fallbackEl.querySelector("button");
        if (retryBtn) {
          retryBtn.addEventListener("click", () => instance.reset());
        }
      }

      container.appendChild(fallbackEl);
      opts.onError?.(currentError);
    }

    const instance: ErrorBoundaryInstance = {
      element: container,

      hasError(): boolean {
        return currentError !== null;
      },

      getError(): ErrorBoundaryError | null {
        return currentError;
      },

      catchError(error: Error, info?: { componentStack: string }): void {
        capture(error, info);
      },

      reset(): void {
        if (!currentError) return;
        currentError = null;
        fallbackEl?.remove();
        fallbackEl = null;
        container.innerHTML = originalContent;
        originalContent = "";
        opts.onReset?.();
      },

      destroy(): void {
        instance.reset();
      },
    };

    return instance;
  }
}

/** Convenience: create an error boundary */
export function createErrorBoundary(options: ErrorBoundaryOptions): ErrorBoundaryInstance {
  return new ErrorBoundaryManager().create(options);
}
