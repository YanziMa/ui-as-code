/**
 * Advanced retry utilities with exponential backoff, jitter, and circuit breaker.
 */

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms (default: 1000) */
  baseDelay?: number;
  /** Multiplier for each subsequent delay (default: 2) */
  backoffFactor?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Function to determine if an error is retryable (default: always retry) */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Callback before each retry */
  onRetry?: (error: unknown, attempt: number) => void;
}

/** Retry an async function with exponential backoff */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    backoffFactor = 2,
    maxDelay = 30000,
    jitter = true,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error, attempt)) throw error;

      // Don't wait after the last attempt
      if (attempt >= maxAttempts) throw error;

      // Calculate delay with exponential backoff
      let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);

      // Add jitter (±25%)
      if (jitter) {
        delay = delay * (0.75 + Math.random() * 0.5);
      }

      onRetry?.(error, attempt);

      await sleep(delay);
    }
  }

  throw lastError;
}

/** Circuit breaker states */
type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms before trying again when open (default: 30000) */
  resetTimeout?: number;
  /** Successes required to close circuit from half-open (default: 1) */
  halfOpenSuccessThreshold?: number;
  /** Callback on state change */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/** Circuit breaker for protecting against cascading failures */
export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      resetTimeout: options.resetTimeout ?? 30000,
      halfOpenSuccessThreshold: options.halfOpenSuccessThreshold ?? 1,
      onStateChange: options.onStateChange ?? (() => {}),
    };
  }

  /** Get current circuit state */
  get currentState(): CircuitState {
    // Auto-transition from open to half-open after timeout
    if (this.state === "open" && Date.now() - this.lastFailureTime > this.options.resetTimeout) {
      this.transition("half-open");
    }

    return this.state;
  }

  /** Execute a function through the circuit breaker */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.currentState;

    if (state === "open") {
      throw new Error("Circuit breaker is open — requests are not being accepted");
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    if (this.state === "half-open") {
      this.successes++;
      if (this.successes >= this.options.halfOpenSuccessThreshold) {
        this.transition("closed");
        this.successes = 0;
      }
    }

    // Reset failure count on success in closed state
    if (this.state === "closed") {
      this.failures = 0;
    }
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.transition("open");
      this.successes = 0;
    } else if (this.failures >= this.options.failureThreshold) {
      this.transition("open");
    }
  }

  private transition(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    this.options.onStateChange(oldState, newState);
  }

  /** Manually reset the circuit to closed state */
  reset(): void {
    this.transition("closed");
    this.failures = 0;
    this.successes = 0;
  }
}

/** Sleep utility */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
