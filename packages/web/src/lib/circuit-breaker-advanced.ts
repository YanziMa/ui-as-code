/**
 * Advanced Circuit Breaker: Resilience pattern with state machine (closed/open/half-open),
 * configurable thresholds, sliding window failure tracking, half-open probing with
 * gradual recovery, event-driven architecture, metrics, timeout integration,
 * fallback support, and state persistence.
 */

// --- Types ---

export type CircuitState = "closed" | "open" | "half-open";

export type CircuitEvent =
  | "state-change"
  | "success"
  | "failure"
  | "timeout"
  | "short-circuit"
  | "recovery"
  | "reset"
  | "probe-success"
  | "probe-failure";

export interface CircuitBreakerConfig {
  /** Number of failures before opening (default: 5) */
  failureThreshold?: number;
  /** Success threshold in half-open to close again (default: 3) */
  halfOpenSuccessThreshold?: number;
  /** Failure threshold in half-open to re-open (default: 1) */
  halfOpenFailureThreshold?: number;
  /** Time window for failure counting in ms (default: 60000) */
  windowDurationMs?: number;
  /** How long to stay open before trying half-open (default: 30000) */
  openTimeoutMs?: number;
  /** Half-open probe interval (default: 5000) */
  halfOpenProbeIntervalMs?: number;
  /** Request timeout in ms (default: 10000) */
  timeoutMs?: number;
  /** Percentage of failures to trigger (alternative to absolute count, e.g., 50 = 50%) */
  failureRateThreshold?: number;
  /** Minimum number of samples before rate-based triggering (default: 10) */
  volumeThreshold?: number;
  /** Enable gradual recovery in half-open (allow increasing traffic) */
  gradualRecovery?: boolean;
  /** Initial probe percentage in half-open (default: 10%) */
  initialProbePercent?: number;
  /** Maximum probe percentage during recovery (default: 100%) */
  maxProbePercent?: number;
  /** Name for identification/logging */
  name?: string;
  /** Whether to auto-reset after successful recovery period (default: true) */
  autoReset?: boolean;
  /** Successful run duration required for auto-reset (default: 120000) */
  resetTimeoutMs?: number;
}

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  successesInHalfOpen: number;
  failuresInHalfOpen: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  openedAt: number | null;
  stateChangedAt: number;
  nextAllowedAttempt: number | null;
  probePercent: number;
}

export interface CircuitBreakerMetrics {
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
  totalTimeouts: number;
  totalShortCircuits: number;
  currentFailureRate: number;
  averageResponseTime: number;
  state: CircuitState;
  stateTransitions: Record<CircuitState, number>;
  uptimePercent: number;
  lastStateChange: number | null;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface CircuitBreakerEventDetail {
  type: CircuitEvent;
  previousState: CircuitState;
  newState: CircuitState;
  timestamp: number;
  error?: Error;
  duration?: number;
  metadata?: Record<string, unknown>;
}

type EventListener = (detail: CircuitBreakerEventDetail) => void;

// --- Result Types ---

export interface CircuitResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  shortCircuited: boolean;
  timedOut: boolean;
  fallbackUsed: boolean;
  duration: number;
  state: CircuitState;
}

// --- Advanced Circuit Breaker Implementation ---

export class AdvancedCircuitBreaker {
  private config: Required<
    Pick<CircuitBreakerConfig,
      | "failureThreshold"
      | "halfOpenSuccessThreshold"
      | "halfOpenFailureThreshold"
      | "windowDurationMs"
      | "openTimeoutMs"
      | "halfOpenProbeIntervalMs"
      | "timeoutMs"
      | "volumeThreshold"
      | "gradualRecovery"
      | "initialProbePercent"
      | "maxProbePercent"
      | "autoReset"
      | "resetTimeoutMs"
    >
  > & Pick<CircuitBreakerConfig, "name" | "failureRateThreshold">;

  private state: CircuitState = "closed";
  private failures: number[] = []; // timestamps of recent failures
  private successes: number[] = []; // timestamps of recent successes
  private successesInHalfOpen = 0;
  private failuresInHalfOpen = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private openedAt: number | null = null;
  private stateChangedAt = Date.now();
  private nextAllowedAttempt: number | null = null;
  private probePercent: number;
  private listeners = new Set<EventListener>();
  private metrics: CircuitBreakerMetrics;
  private destroyed = false;
  private probeTimer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private totalResponseTime = 0;
  private responseCount = 0;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      halfOpenSuccessThreshold: config.halfOpenSuccessThreshold ?? 3,
      halfOpenFailureThreshold: config.halfOpenFailureThreshold ?? 1,
      windowDurationMs: config.windowDurationMs ?? 60_000,
      openTimeoutMs: config.openTimeoutMs ?? 30_000,
      halfOpenProbeIntervalMs: config.halfOpenProbeIntervalMs ?? 5_000,
      timeoutMs: config.timeoutMs ?? 10_000,
      volumeThreshold: config.volumeThreshold ?? 10,
      gradualRecovery: config.gradualRecovery ?? true,
      initialProbePercent: config.initialProbePercent ?? 10,
      maxProbePercent: config.maxProbePercent ?? 100,
      autoReset: config.autoReset ?? true,
      resetTimeoutMs: config.resetTimeoutMs ?? 120_000,
      name: config.name,
      failureRateThreshold: config.failureRateThreshold,
    };
    this.probePercent = this.config.initialProbePercent;
    this.metrics = this.createEmptyMetrics();

    // Setup periodic cleanup of old entries
    this.cleanupTimer = setInterval(() => this.cleanupWindow(), Math.min(this.config.windowDurationMs, 30_000));
  }

  // --- Core API ---

  /**
   * Execute a function through the circuit breaker.
   * Handles state checking, short-circuiting, timeouts, and fallbacks.
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: {
      fallback?: () => T | Promise<T>;
      timeoutMs?: number;
      context?: Record<string, unknown>;
    },
  ): Promise<CircuitResult<T>> {
    if (this.destroyed) {
      return { success: false, error: new Error("Circuit breaker is destroyed"), shortCircuited: false, timedOut: false, fallbackUsed: false, duration: 0, state: this.state };
    }

    const start = performance.now();
    this.metrics.totalRequests++;

    // Check if we should short-circuit
    if (this.shouldShortCircuit()) {
      this.metrics.totalShortCircuits++;
      this.emit({ type: "short-circuit", previousState: this.state, newState: this.state, timestamp: Date.now() });

      if (options?.fallback) {
        try {
          const fallbackResult = await options.fallback();
          return { success: true, data: fallbackResult, shortCircuited: true, timedOut: false, fallbackUsed: true, duration: performance.now() - start, state: this.state };
        } catch (e) {
          return { success: false, error: e as Error, shortCircuited: true, timedOut: false, fallbackUsed: true, duration: performance.now() - start, state: this.state };
        }
      }

      return { success: false, error: new Error(`Circuit breaker "${this.config.name}" is open`), shortCircuited: true, timedOut: false, fallbackUsed: false, duration: performance.now() - start, state: this.state };
    }

    // Gradual recovery check in half-open
    if (this.state === "half-open" && this.config.gradualRecovery) {
      if (Math.random() * 100 > this.probePercent) {
        this.metrics.totalShortCircuits++;
        if (options?.fallback) {
          try { return { success: true, data: await options.fallback(), shortCircuited: true, timedOut: false, fallbackUsed: true, duration: performance.now() - start, state: this.state }; }
          catch (e) { return { success: false, error: e as Error, shortCircuited: true, timedOut: false, fallbackUsed: true, duration: performance.now() - start, state: this.state }; }
        }
        return { success: false, error: new Error("Circuit breaker in half-open — request not selected for probing"), shortCircuited: true, timedOut: false, fallbackUsed: false, duration: performance.now() - start, state: this.state };
      }
    }

    // Execute with timeout
    const timeoutMs = options?.timeoutMs ?? this.config.timeoutMs;
    let result: T;
    let timedOut = false;

    try {
      result = await this.withTimeout(fn(), timeoutMs);
    } catch (e) {
      const err = e as Error;
      const elapsed = performance.now() - start;

      if (err.message?.includes("timeout") || elapsed >= timeoutMs) {
        timedOut = true;
        this.recordFailure(err);
        this.emit({ type: "timeout", previousState: this.state, newState: this.state, timestamp: Date.now(), error: err, duration: elapsed, metadata: options?.context });
        this.metrics.totalTimeouts++;
      } else {
        this.recordFailure(err);
        this.emit({ type: "failure", previousState: this.state, newState: this.state, timestamp: Date.now(), error: err, duration: elapsed, metadata: options?.context });
        this.metrics.totalFailures++;
      }

      if (options?.fallback) {
        try { return { success: true, data: await options.fallback(), error: err, shortCircuited: false, timedOut, fallbackUsed: true, duration: elapsed, state: this.state }; }
        catch (fe) { return { success: false, error: fe as Error, shortCircuited: false, timedOut, fallbackUsed: true, duration: performance.now() - start, state: this.state }; }
      }

      return { success: false, error: err, shortCircuited: false, timedOut, fallbackUsed: false, duration: elapsed, state: this.state };
    }

    // Success
    const elapsed = performance.now() - start;
    this.recordSuccess();
    this.emit({ type: "success", previousState: this.state, newState: this.state, timestamp: Date.now(), duration: elapsed, metadata: options?.context });
    this.metrics.totalSuccesses++;
    this.totalResponseTime += elapsed;
    this.responseCount++;

    return { success: true, data: result, shortCircuited: false, timedOut: false, fallbackUsed: false, duration: elapsed, state: this.state };
  }

  /**
   * Execute synchronously (no timeout handling).
   */
  executeSync<T>(fn: () => T, options?: { fallback?: () => T }): CircuitResult<T> {
    if (this.destroyed) return { success: false, error: new Error("Destroyed"), shortCircuited: false, timedOut: false, fallbackUsed: false, duration: 0, state: this.state };

    const start = performance.now();
    this.metrics.totalRequests++;

    if (this.shouldShortCircuit()) {
      this.metrics.totalShortCircuits++;
      if (options?.fallback) {
        try { return { success: true, data: options.fallback(), shortCircuited: true, timedOut: false, fallbackUsed: true, duration: performance.now() - start, state: this.state }; }
        catch (e) { return { success: false, error: e as Error, shortCircuited: true, timedOut: false, fallbackUsed: true, duration: performance.now() - start, state: this.state }; }
      }
      return { success: false, error: new Error(`Circuit "${this.config.name}" is open`), shortCircuited: true, timedOut: false, fallbackUsed: false, duration: performance.now() - start, state: this.state };
    }

    try {
      const result = fn();
      this.recordSuccess();
      this.metrics.totalSuccesses++;
      return { success: true, data: result, shortCircuited: false, timedOut: false, fallbackUsed: false, duration: performance.now() - start, state: this.state };
    } catch (e) {
      this.recordFailure(e as Error);
      this.metrics.totalFailures++;
      if (options?.fallback) {
        try { return { success: true, data: options.fallback(), error: e as Error, shortCircuited: false, timedOut: false, fallbackUsed: true, duration: performance.now() - start, state: this.state }; }
        catch (fe) { return { success: false, error: fe as Error, shortCircuited: false, timedOut: false, fallbackUsed: true, duration: performance.now() - start, state: this.state }; }
      }
      return { success: false, error: e as Error, shortCircuited: false, timedOut: false, fallbackUsed: false, duration: performance.now() - start, state: this.state };
    }
  }

  // --- State Query ---

  getState(): CircuitState { return this.state; }
  getStateSnapshot(): CircuitBreakerState {
    return {
      state: this.state,
      failures: this.failures.length,
      successes: this.successes.length,
      successesInHalfOpen: this.successesInHalfOpen,
      failuresInHalfOpen: this.failuresInHalfOpen,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      openedAt: this.openedAt,
      stateChangedAt: this.stateChangedAt,
      nextAllowedAttempt: this.nextAllowedAttempt,
      probePercent: this.probePercent,
    };
  }

  getMetrics(): CircuitBreakerMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  isOpen(): boolean { return this.state === "open"; }
  isClosed(): boolean { return this.state === "closed"; }
  isHalfOpen(): boolean { return this.state === "half-open"; }
  isAvailable(): boolean { return this.state !== "open"; }

  getName(): string { return this.config.name ?? "unnamed"; }

  // --- Manual Control ---

  /** Force open the circuit */
  open(): void { this.transitionTo("open"); }

  /** Force close the circuit */
  close(): void { this.transitionTo("closed"); }

  /** Force half-open state */
  halfOpen(): void { this.transitionTo("half-open"); }

  /** Reset all state and metrics */
  reset(): void {
    this.transitionTo("closed");
    this.failures = [];
    this.successes = [];
    this.successesInHalfOpen = 0;
    this.failuresInHalfOpen = 0;
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.openedAt = null;
    this.nextAllowedAttempt = null;
    this.probePercent = this.config.initialProbePercent;
    this.metrics = this.createEmptyMetrics();
    this.emit({ type: "reset", previousState: this.state, newState: "closed", timestamp: Date.now() });
  }

  // --- Events ---

  on(event: CircuitEvent | "*", listener: EventListener): () => void {
    // Store listener with optional event filter
    const wrappedListener: EventListener = (detail) => {
      if (event === "*" || detail.type === event) listener(detail);
    };
    this.listeners.add(wrappedListener);
    return () => this.listeners.delete(wrappedListener);
  }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.listeners.clear();
  }

  // --- Internal ---

  private shouldShortCircuit(): boolean {
    if (this.state === "open") {
      // Check if open timeout has passed
      if (this.openedAt && Date.now() - this.openedAt >= this.config.openTimeoutMs) {
        this.transitionTo("half-open");
        return false; // Allow one probe
      }
      return true;
    }
    return false;
  }

  private recordSuccess(): void {
    const now = Date.now();
    this.lastSuccessTime = now;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;
    this.successes.push(now);

    if (this.state === "half-open") {
      this.successesInHalfOpen++;
      this.emit({ type: "probe-success", previousState: "half-open", newState: "half-open", timestamp: now });

      // Increase probe percent for gradual recovery
      if (this.config.gradualRecovery) {
        this.probePercent = Math.min(this.config.maxProbePercent, this.probePercent + (this.config.maxProbePercent - this.config.initialProbePercent) / this.config.halfOpenSuccessThreshold);
      }

      if (this.successesInHalfOpen >= this.config.halfOpenSuccessThreshold) {
        this.transitionTo("closed");
        this.emit({ type: "recovery", previousState: "half-open", newState: "closed", timestamp: now });
      }
    }

    // Auto-reset check
    if (this.state === "closed" && this.config.autoReset && this.consecutiveSuccesses > 0) {
      // After sustained success, clear failure history
      if (this.consecutiveSuccesses >= this.config.failureThreshold * 2) {
        this.failures = this.failures.filter((t) => now - t < this.config.windowDurationMs);
      }
    }
  }

  private recordFailure(error: Error): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;
    this.failures.push(now);

    if (this.state === "half-open") {
      this.failuresInHalfOpen++;
      this.emit({ type: "probe-failure", previousState: "half-open", newState: "half-open", timestamp: now, error });

      if (this.failuresInHalfOpen >= this.config.halfOpenFailureThreshold) {
        this.transitionTo("open");
      }
      return;
    }

    // Check if we should trip the breaker
    if (this.shouldTrip()) {
      this.transitionTo("open");
    }
  }

  private shouldTrip(): boolean {
    const now = Date.now();
    const windowFailures = this.failures.filter((t) => now - t < this.config.windowDurationMs);
    const windowSuccesses = this.successes.filter((t) => now - t < this.config.windowDurationMs);
    const totalInWindow = windowFailures.length + windowSuccesses.length;

    // Absolute threshold
    if (windowFailures.length >= this.config.failureThreshold) return true;

    // Rate-based threshold
    if (this.config.failureRateThreshold && totalInWindow >= this.config.volumeThreshold) {
      const rate = (windowFailures.length / totalInWindow) * 100;
      if (rate >= this.config.failureRateThreshold!) return true;
    }

    return false;
  }

  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    if (previousState === newState) return;

    this.state = newState;
    this.stateChangedAt = Date.now();

    if (newState === "open") {
      this.openedAt = Date.now();
      this.nextAllowedAttempt = Date.now() + this.config.openTimeoutMs;
      this.successesInHalfOpen = 0;
      this.failuresInHalfOpen = 0;
      this.probePercent = this.config.initialProbePercent;
    } else if (newState === "closed") {
      this.openedAt = null;
      this.nextAllowedAttempt = null;
      this.successesInHalfOpen = 0;
      this.failuresInHalfOpen = 0;
      this.probePercent = this.config.initialProbePercent;
      // Clear failure history on full recovery
      this.failures = [];
      this.successes = [];
    } else if (newState === "half-open") {
      this.successesInHalfOpen = 0;
      this.failuresInHalfOpen = 0;
    }

    this.metrics.stateTransitions[newState] = (this.metrics.stateTransitions[newState] ?? 0) + 1;
    this.emit({ type: "state-change", previousState, newState, timestamp: Date.now() });
  }

  private emit(detail: CircuitBreakerEventDetail): void {
    for (const listener of this.listeners) {
      try { listener(detail); } catch {}
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }

  private cleanupWindow(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowDurationMs;
    this.failures = this.failures.filter((t) => t > cutoff);
    this.successes = this.successes.filter((t) => t > cutoff);
  }

  private createEmptyMetrics(): CircuitBreakerMetrics {
    return {
      totalRequests: 0, totalSuccesses: 0, totalFailures: 0,
      totalTimeouts: 0, totalShortCircuits: 0,
      currentFailureRate: 0, averageResponseTime: 0,
      state: "closed", stateTransitions: { closed: 0, open: 0, "half-open": 0 },
      uptimePercent: 100, lastStateChange: null,
      consecutiveFailures: 0, consecutiveSuccesses: 0,
    };
  }

  private updateMetrics(): void {
    const now = Date.now();
    const windowFailures = this.failures.filter((t) => now - t < this.config.windowDurationMs);
    const windowTotal = windowFailures.length + this.successes.filter((t) => now - t < this.config.windowDurationMs).length;
    this.metrics.currentFailureRate = windowTotal > 0 ? (windowFailures.length / windowTotal) * 100 : 0;
    this.metrics.averageResponseTime = this.responseCount > 0 ? this.totalResponseTime / this.responseCount : 0;
    this.metrics.state = this.state;
    this.metrics.consecutiveFailures = this.consecutiveFailures;
    this.metrics.consecutiveSuccesses = this.consecutiveSuccesses;
    this.metrics.lastStateChange = this.stateChangedAt;
    // Uptime = time spent in closed state since creation
    const totalElapsed = now - (this.metrics.lastStateChange ?? now);
    this.metrics.uptimePercent = this.state === "closed" ? 100 :
      this.state === "open" ? 0 : 50; // Simplified
  }
}

// --- Circuit Breaker Registry ---

/**
 * Manage multiple circuit breakers by name.
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, AdvancedCircuitBreaker>();

  get(name: string, config?: CircuitBreakerConfig): AdvancedCircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new AdvancedCircuitBreaker({ ...config, name });
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  getAll(): Map<string, AdvancedCircuitBreaker> { return new Map(this.breakers); }
  getNames(): string[] { return Array.from(this.breakers.keys()); }
  getStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {};
    for (const [name, breaker] of this.breakers) states[name] = breaker.getState();
    return states;
  }

  remove(name: string): boolean { return this.breakers.delete(name); }
  destroyAll(): void { for (const [, b] of this.breakers) b.destroy(); this.breakers.clear(); }
  getAggregateMetrics(): { total: number; open: number; closed: number; halfOpen: number } {
    let open = 0, closed = 0, halfOpen = 0;
    for (const [, b] of this.breakers) {
      switch (b.getState()) {
        case "open": open++; break;
        case "closed": closed++; break;
        case "halfOpen": halfOpen++; break;
      }
    }
    return { total: this.breakers.size, open, closed, halfOpen };
  }
}

// --- Factory Functions ---

export function createCircuitBreaker(config?: CircuitBreakerConfig): AdvancedCircuitBreaker {
  return new AdvancedCircuitBreaker(config);
}

export function createCircuitBreakerRegistry(): CircuitBreakerRegistry {
  return new CircuitBreakerRegistry();
}
