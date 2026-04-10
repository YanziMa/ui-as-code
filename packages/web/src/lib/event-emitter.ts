/**
 * Enhanced Event Emitter: typed events, async handlers, wildcard support,
 * max listeners, error handling, event history, subscriber count,
 * pipe between emitters, and event namespacing.
 */

// --- Types ---

export type Listener<T = unknown> = (...args: T[]) => void;
export type AsyncListener<T = unknown> = (...args: T[]) => Promise<void>;

export interface EmitterOptions {
  /** Maximum number of listeners per event (default: 100) */
  maxListeners?: number;
  /** Capture error listener for unhandled errors */
  onError?: (error: Error, eventName?: string) => void;
  /** Whether to throw on emit errors or just log (default: false) */
  throwOnError?: boolean;
}

export interface Subscription {
  id: string;
  event: string | symbol;
  once: boolean;
  remove: () => void;
}

export interface EmitResult {
  /** Number of handlers that were invoked */
  invokedCount: number;
  /** Any errors that occurred during handler invocation */
  errors: Array<{ handler: string; error: Error }>;
}

export interface EmitterStats {
  totalEvents: number;
  totalInvocations: number;
  totalErrors: number;
  totalSubscriptions: number;
  peakListeners: number;
  eventNames: string[];
}

// --- Symbol for internal events ---

const WILDCARD = Symbol("*");
const INTERNAL_PREFIX = "__internal:";

// --- Event Emitter ---

export class EventEmitter {
  private listeners = new Map<string | symbol, Set<Subscription>>();
  private stats: EmitterStats = {
    totalEvents: 0,
    totalInvocations: 0,
    totalErrors: 0,
    totalSubscriptions: 0,
    peakListeners: 0,
    eventNames: [],
  };
  private options: Required<EmitterOptions>;
  private destroyed = false;

  constructor(options: EmitterOptions = {}) {
    this.options = {
      maxListeners: options.maxListeners ?? 100,
      onError: options.onError ?? (() => {}),
      throwOnError: options.throwOnError ?? false,
    };
  }

  /**
   * Subscribe to an event.
   * @returns Unsubscribe function
   */
  on<T = unknown>(event: string, listener: Listener<T>, options?: { once?: boolean; priority?: number }): () => boolean {
    if (this.destroyed) return () => false;

    const sub: Subscription = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event,
      once: options?.once ?? false,
      remove: () => this._remove(sub),
    };

    const set = this.listeners.get(event);
    if (!set) {
      this.listeners.set(event, new Set());
    }
    (this.listeners.get(event))!.add(sub);
    this.stats.totalSubscriptions++;
    this._updatePeak();

    // Warn on potential memory leaks
    const count = (this.listeners.get(event)?.size ?? 0);
    if (count > this.options.maxListeners) {
      console.warn(`[EventEmitter] Possible memory leak: ${count} listeners for "${event}"`);
    }

    return sub.remove;
  }

  /**
   * Subscribe to fire only once then auto-unsubscribe.
   */
  once<T = unknown>(event: string, listener: Listener<T>): () => boolean {
    return this.on(event, listener, { once: true });
  }

  /**
   * Subscribe to all events (wildcard).
   * Receives [eventName, ...args] as arguments.
   */
  onAny(listener: (eventName: string, ...args: unknown[]) => void): () => boolean {
    return this.on(WILDCARD as any, listener as any);
  }

  /**
   * Remove a specific listener subscription.
   */
  off(event: string, listener: Function): boolean {
    const set = this.listeners.get(event);
    if (!set) return false;

    for (const sub of set) {
      if ((sub as any).originalListener === listener || sub.handler === listener) {
        set.delete(sub);
        this.stats.totalSubscriptions--;
        return true;
      }
    }
    return false;
  }

  /**
   * Remove all listeners for an event.
   */
  removeAll(event?: string): number {
    if (event) {
      const set = this.listeners.get(event);
      if (set) {
        const count = set.size;
        this.listeners.delete(event);
        this.stats.totalSubscriptions -= count;
        return count;
      }
      return 0;
    }
    let total = 0;
    for (const [, set] of this.listeners) {
      total += set.size;
    }
    this.listeners.clear();
    this.stats.totalSubscriptions = 0;
    return total;
  }

  /**
   * Emit an event, invoking all subscribed listeners in order.
   */
  emit<T = unknown>(event: string, ...args: T[]): EmitResult {
    if (this.destroyed) return { invokedCount: 0, errors: [] };

    this.stats.totalEvents++;
    const result: EmitResult = { invokedCount: 0, errors: [] };

    // Wildcard listeners first
    const wildcards = this.listeners.get(WILDCARD);
    if (wildcards) {
      for (const sub of wildcards) {
        try {
          (sub.handler as any)(event, ...args);
          result.invokedCount++;
          if (sub.once) this._remove(sub);
        } catch (err) {
          result.errors.push({ handler: "wildcard", error: err as Error });
          this.stats.totalErrors++;
          this.options.onError(err as Error, event);
          if (sub.once) this._remove(sub);
          if (this.options.throwOnError) throw err;
        }
      }
    }

    // Specific event listeners
    const specific = this.listeners.get(event);
    if (specific) {
      const toRemove: Subscription[] = [];
      for (const sub of specific) {
        try {
          (sub.handler as any)(...args);
          result.invokedCount++;
          if (sub.once) toRemove.push(sub);
        } catch (err) {
          result.errors.push({ handler: String(sub.id), error: err as Error });
          this.stats.totalErrors++;
          this.options.onError(err as Error, event);
          if (sub.once) toRemove.push(sub);
          if (this.options.throwOnError) throw err;
        }
      }
      for (const sub of toRemove) specific.delete(sub);
    }

    this.stats.totalInvocations += result.invokedCount;
    return result;
  }

  /**
   * Emit asynchronously - awaits all async handlers sequentially.
   */
  async emitAsync<T = unknown>(event: string, ...args: T[]): Promise<EmitResult> {
    if (this.destroyed) return { invokedCount: 0, errors: [] };

    this.stats.totalEvents++;
    const result: EmitResult = { invokedCount: 0, errors: [] };

    const wildcards = this.listeners.get(WILDCARD);
    if (wildcards) {
      for (const sub of wildcards) {
        try {
          await (sub.handler as any)(event, ...args);
          result.invokedCount++;
          if (sub.once) this._remove(sub);
        } catch (err) {
          result.errors.push({ handler: "wildcard", error: err as Error });
          this.stats.totalErrors++;
          this.options.onError(err as Error, event);
          if (sub.once) this._remove(sub);
        }
      }
    }

    const specific = this.listeners.get(event);
    if (specific) {
      const toRemove: Subscription[] = [];
      for (const sub of specific) {
        try {
          await (sub.handler as any)(...args);
          result.invokedCount++;
          if (sub.once) toRemove.push(sub);
        } catch (err) {
          result.errors.push({ handler: String(sub.id), error: err as Error });
          this.stats.totalErrors++;
          this.options.onError(err as Error, event);
          if (sub.once) this._remove(sub);
        }
      }
      for (sub of toRemove) specific.delete(sub);
    }

    this.stats.totalInvocations += result.invokedCount;
    return result;
  }

  /**
   * Check if there are listeners for an event.
   */
  hasListeners(event?: string): boolean {
    if (event) return (this.listeners.get(event)?.size ?? 0) > 0;
    return this.stats.totalSubscriptions > 0;
  }

  /**
   * Get listener count for an event.
   */
  listenerCount(event?: string): number {
    if (event) return this.listeners.get(event)?.size ?? 0;
    return this.stats.totalSubscriptions;
  }

  /**
   * Get all event names that have listeners.
   */
  eventNames(): string[] {
    return [...this.listeners.keys()].filter((k) => k !== WILDCARD)].map(String);
  }

  /**
   * Get emitter statistics.
   */
  getStats(): EmitterStats {
    return { ...this.stats, eventNames: this.eventNames() };
  }

  /**
   * Pipe all events from this emitter to another target.
   * Returns unsubscribe function.
   */
  pipe(target: EventEmitter): () => void {
    const off = this.onAny((event, ...args) => target.emit(event, ...args));
    // Store reference for cleanup
    (this as any).__pipeOff = off;
  }

  /**
   * Unpipe from a previously piped target.
   */
  unpipe(): void {
    (this as any).__pipeOff?.();
  }

  /**
   * Destroy the emitter and clean up all resources.
   */
  destroy(): void {
    this.removeAll();
    this.destroyed = true;
  }

  // --- Private ---

  private _remove(sub: Subscription): void {
    const set = this.listeners.get(sub.event);
    if (set) {
      set.delete(sub);
      this.stats.totalSubscriptions--;
    }
  }

  private _updatePeak(): void {
    let total = 0;
    for (const [, set] of this.listeners) total += set.size;
    if (total > this.stats.peakListeners) {
      this.stats.peakListeners = total;
    }
  }
}

// --- Convenience ---

/** Create a new EventEmitter with optional options */
export function createEmitter(options?: EmitterOptions): EventEmitter {
  return new EventEmitter(options);
}
