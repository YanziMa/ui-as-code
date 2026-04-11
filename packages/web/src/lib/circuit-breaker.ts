/**
 * Circuit Breaker pattern: protects systems from cascading failures.
 * States: CLOSED → OPEN → HALF_OPEN → (back to CLOSED or OPEN).
 */

// --- Types ---

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  /** Number of failures before tripping open */
  failureThreshold: number;
  /** Time in ms before attempting half-open */
  recoveryTimeoutMs: number;
  /** Number of successes in half-open before closing again */
  halfOpenMaxSuccesses: number;
  /** Percentage (0-1) of failures that triggers opening (for volume-based) */
  failureRateThreshold?: number;
  /** Minimum number of calls before evaluating failure rate */
  minimumNumberOfCalls?: number;
  /** Window size for sliding failure tracking (ms) */
  slidingWindowMs?: number;
  /** Called on state transitions */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  /** Called when a call is rejected (breaker is open) */
  onRejected?: () => void;
  /** Name for logging/debugging */
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  totalCalls: number;
  totalSuccesses: number;
  totalFailures: number;
  totalRejected: number;
  successRate: number;
  failureRate: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  openedCount: number;
  halfOpenAttempts: number;
}

// --- Main Class ---

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private totalCalls = 0;
  private totalRejected = 0;
  private openedCount = 0;
  private halfOpenAttempts = 0;
  private openedAt = 0;
  private halfOpenSuccesses = 0;
  private lastFailureTime?: number;
  private lastSuccessTime?: number;

  private readonly config: Required<
    Pick<CircuitBreakerConfig, "failureThreshold" | "recoveryTimeoutMs" | "halfOpenMaxSuccesses">
  > & CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config.failureThreshold,
      recoveryTimeoutMs: config.recoveryTimeoutMs,
      halfOpenMaxSuccesses: config.halfOpenMaxSuccesses,
      failureRateThreshold: config.failureRateThreshold ?? 0.5,
      minimumNumberOfCalls: config.minimumNumberOfCalls ?? 10,
      slidingWindowMs: config.slidingWindowMs ?? 60000,
      onStateChange: config.onStateChange ?? (() => {}),
      onRejected: config.onRejected ?? (() => {}),
      name: config.name ?? "unnamed",
    };
  }

  /**
   * Execute a function through the circuit breaker.
   * Returns the result or throws if the breaker is open.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalCalls++;

    if (!this.allowRequest()) {
      this.totalRejected++;
      this.config.onRejected();
      throw new Error(`CircuitBreaker[${this.config.name}]: circuit is ${this.state}`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /** Synchronous version of execute */
  executeSync<T>(fn: () => T): T {
    this.totalCalls++;

    if (!this.allowRequest()) {
      this.totalRejected++;
      this.config.onRejected();
      throw new Error(`CircuitBreaker[${this.config.name}]: circuit is ${this.state}`);
    }

    try {
      const result = fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /** Check if a request is currently allowed through */
  allowRequest(): boolean {
    this.checkRecovery();

    if (this.state === "open") return false;
    if (this.state === "half-open") {
      // In half-open, allow up to halfOpenMaxSuccesses trial requests
      return this.halfOpenSuccesses < this.config.halfOpenMaxSuccesses;
    }

    return true; // closed
  }

  /** Get current state */
  get currentState(): CircuitState {
    this.checkRecovery();
    return this.state;
  }

  /** Get statistics */
  get stats(): CircuitBreakerStats {
    this.checkRecovery();
    const total = this.successes + this.failures;
    return {
      state: this.state,
      totalCalls: this.totalCalls,
      totalSuccesses: this.successes,
      totalFailures: this.failures,
      totalRejected: this.totalRejected,
      successRate: total > 0 ? Math.round((this.successes / total) * 10000) / 100 : 0,
      failureRate: total > 0 ? Math.round((this.failures / total) * 10000) / 100 : 0,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedCount: this.openedCount,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /** Force open the circuit */
  forceOpen(): void {
    this.transitionTo("open");
  }

  /** Force close the circuit (reset all counters) */
  forceClose(): void {
    this.reset();
  }

  /** Reset everything to initial state */
  reset(): void {
    this.transitionTo("closed");
    this.failures = 0;
    this.successes = 0;
    this.halfOpenSuccesses = 0;
    this.halfOpenAttempts = 0;
    this.totalRejected = 0;
  }

  // --- Internal ---

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = Date.now();

    if (this.state === "half-open") {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenMaxSuccesses) {
        this.transitionTo("closed");
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "closed") {
      if (this.failures >= this.config.failureThreshold) {
        this.transitionTo("open");
      }
    } else if (this.state === "half-open") {
      // Any failure in half-open trips back to open immediately
      this.transitionTo("open");
    }
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === "open") {
      this.openedAt = Date.now();
      this.openedCount++;
      this.halfOpenSuccesses = 0;
    } else if (newState === "half-open") {
      this.halfOpenAttempts++;
      this.halfOpenSuccesses = 0;
    } else if (newState === "closed") {
      this.failures = 0;
      this.successes = 0;
    }

    this.config.onStateChange(oldState, newState);
  }

  private checkRecovery(): void {
    if (this.state !== "open") return;

    if (Date.now() - this.openedAt >= this.config.recoveryTimeoutMs) {
      this.transitionTo("half-open");
    }
  }
}

// --- Factory ---

/** Create a circuit breaker with sensible defaults */
export function createCircuitBreaker(config: Partial<CircuitBreakerConfig> = {}): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: config.failureThreshold ?? 5,
    recoveryTimeoutMs: config.recoveryTimeoutMs ?? 30000,
    halfOpenMaxSuccesses: config.halfOpenMaxSuccesses ?? 3,
    ...config,
  });
}
