/**
 * Observer Pattern: Type-safe event emitter/observer system with wildcard
 * subscriptions, priority ordering, once() semantics, async handlers,
 * error handling, max listeners, and memory leak detection.
 */

// --- Types ---

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;
export type EventErrorHandler = (event: string, error: Error, data: unknown) => void | boolean;

export interface Subscription {
  /** Unique subscription ID */
  id: string;
  /** Event name (or "*" for wildcard) */
  event: string;
  /** Handler function */
  handler: EventHandler<unknown>;
  /** Priority (higher = called first, default: 0) */
  priority: number;
  /** Whether this is a one-time subscription */
  once: boolean;
  /** Whether the handler is async */
  async: boolean;
  /** Timestamp when created */
  createdAt: number;
  /** Unsubscribe function */
  unsubscribe: () => boolean;
}

export interface ObserverOptions {
  /** Priority level (default: 0, higher = earlier) */
  priority?: number;
  /** Only invoke once then auto-unsubscribe */
  once?: boolean;
  /** Bind `this` context for handler */
  context?: unknown;
  /** Signal this is an async handler (errors won't block subsequent handlers) */
  async?: boolean;
}

export interface ObserverStats {
  totalSubscriptions: number;
  eventsWithListeners: number;
  totalEventsEmitted: number;
  totalHandlersInvoked: number;
  errorsCaught: number;
  peakSubscriptions: number;
  created: number;
}

// --- Observer / EventEmitter ---

export class Observer<E extends Record<string, any> = Record<string, any>> {
  private subscriptions = new Map<string, Set<Subscription>>();
  private wildcards = new Set<Subscription>();
  private stats: ObserverStats = {
    totalSubscriptions: 0, eventsWithListeners: 0,
    totalEventsEmitted: 0, totalHandlersInvoked: 0,
    errorsCaught: 0, peakSubscriptions: 0, created: Date.now(),
  };
  private errorHandler: EventErrorHandler | null = null;
  private maxListeners = 100;
  private destroyed = false;
  private idCounter = 0;

  constructor(options?: { maxListeners?: number; errorHandler?: EventErrorHandler }) {
    if (options?.maxListeners) this.maxListeners = options.maxListeners;
    if (options?.errorHandler) this.errorHandler = options.errorHandler;
  }

  // --- Subscribe ---

  /**
   * Subscribe to an event.
   * @param event - Event name (or "*" for all events)
   * @param handler - Callback function
   * @param options - Priority, once, context, async
   * @returns Unsubscribe function
   */
  on<K extends keyof E>(
    event: K | string,
    handler: EventHandler<E[K]>,
    options?: ObserverOptions,
  ): () => boolean;

  on(event: string, handler: EventHandler<unknown>, options?: ObserverOptions): () => boolean;

  on(event: string, handler: EventHandler<unknown>, options: ObserverOptions = {}): () => boolean {
    if (this.destroyed) return () => false;

    const sub: Subscription = {
      id: `sub_${++this.idCounter}_${Date.now().toString(36)}`,
      event,
      handler: handler as EventHandler<unknown>,
      priority: options.priority ?? 0,
      once: options.once ?? false,
      async: options.async ?? false,
      createdAt: Date.now(),
      unsubscribe: () => this.unsubscribe(sub.id),
    };

    // Bind context if provided
    if (options.context) {
      const originalHandler = sub.handler;
      sub.handler = originalHandler.bind(options.context as object);
    }

    if (event === "*") {
      this.wildcards.add(sub);
    } else {
      if (!this.subscriptions.has(event)) this.subscriptions.set(event, new Set());
      this.subscriptions.get(event)!.add(sub);
    }

    this.stats.totalSubscriptions++;
    if (this.stats.totalSubscriptions > this.stats.peakSubscriptions) {
      this.stats.peakSubscriptions = this.stats.totalSubscriptions;
    }

    // Warn if too many listeners
    const eventCount = (this.subscriptions.get(event)?.size ?? 0) + (event === "*" ? 1 : 0);
    if (eventCount > this.maxListeners) {
      console.warn(
        `[Observer] Possible memory leak: ${eventCount} listeners for "${event}". Max: ${this.maxListeners}`,
      );
    }

    return () => this.unsubscribe(sub.id);
  }

  /** Subscribe to fire only once then auto-unsubscribe */
  once<K extends keyof E>(
    event: K | string,
    handler: EventHandler<E[K]>,
    options?: Omit<ObserverOptions, "once">,
  ): () => boolean {
    return this.on(event, handler, { ...options, once: true });
  }

  /** Subscribe to many events at once */
  onMany(events: string[], handler: EventHandler<unknown>, options?: ObserverOptions): () => void {
    const unsubs = events.map((e) => this.on(e, handler, options));
    return () => { for (const fn of unsubs) fn(); };
  }

  // --- Emit ---

  /**
   * Emit an event with data.
   * Handlers are called in priority order (highest first).
   * Wildcard ("*") handlers are called before specific handlers.
   */
  emit<K extends keyof E>(event: K, data?: E[K]): Promise<void>;
  emit(event: string, data?: unknown): Promise<void>;

  async emit(event: string, data?: unknown): Promise<void> {
    if (this.destroyed) return;
    this.stats.totalEventsEmitted++;

    // Collect handlers: wildcards first (by priority), then specific
    const handlers: Array<{ sub: Subscription; data: unknown }> = [];

    // Wildcard handlers (sorted by priority desc)
    const sortedWildcards = Array.from(this.wildcards).sort((a, b) => b.priority - a.priority);
    for (const sub of sortedWildcards) {
      handlers.push({ sub, data });
    }

    // Specific handlers (sorted by priority desc)
    const specificSubs = this.subscriptions.get(event);
    if (specificSubs) {
      const sortedSpecifics = Array.from(specificSubs).sort((a, b) => b.priority - a.priority);
      for (const sub of sortedSpecifics) {
        handlers.push({ sub, data });
      }
    }

    // Execute handlers
    for (const { sub } of handlers) {
      // Skip if already unsubscribed during this emit cycle
      if (!this.isSubscribed(sub)) continue;

      try {
        await sub.handler(data!);
        this.stats.totalHandlersInvoked++;

        // Auto-unsubscribe for once()
        if (sub.once) {
          this.unsubscribe(sub.id);
        }
      } catch (err) {
        this.stats.errorsCaught++;
        const shouldContinue = this.errorHandler?.(event, err as Error, data);
        if (shouldContinue === false && !sub.async) break;
        // For non-async handlers, errors stop the chain unless errorHandler returns true
        if (!sub.async && shouldContinue !== true) break;
      }
    }
  }

  // --- Unsubscribe ---

  /** Unsubscribe by subscription ID */
  unsubscribe(id: string): boolean {
    // Search in wildcards
    for (const sub of this.wildcards) {
      if (sub.id === id) { this.wildcards.delete(sub); this.stats.totalSubscriptions--; return true; }
    }
    // Search in specific subscriptions
    for (const [, subs] of this.subscriptions) {
      for (const sub of subs) {
        if (sub.id === id) { subs.delete(sub); this.stats.totalSubscriptions--; return true; }
      }
    }
    return false;
  }

  /** Unsubscribe all handlers for an event */
  off(event: string): number {
    const subs = this.subscriptions.get(event);
    if (subs) {
      const count = subs.size;
      this.stats.totalSubscriptions -= count;
      this.subscriptions.delete(event);
      return count;
    }
    return 0;
  }

  /** Remove all subscriptions */
  removeAll(): number {
    let count = this.stats.totalSubscriptions;
    this.subscriptions.clear();
    this.wildcards.clear();
    this.stats.totalSubscriptions = 0;
    return count;
  }

  // --- Query ---

  /** Check if there are listeners for an event */
  hasListeners(event?: string): boolean {
    if (event) {
      return (this.subscriptions.get(event)?.size ?? 0) > 0 || this.wildcards.size > 0;
    }
    return this.stats.totalSubscriptions > 0;
  }

  /** Get listener count for an event */
  listenerCount(event?: string): number {
    if (event) return this.subscriptions.get(event)?.size ?? 0;
    return this.stats.totalSubscriptions;
  }

  /** Get all event names that have listeners */
  eventNames(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /** Get all subscriptions for debugging */
  getSubscriptions(event?: string): Subscription[] {
    if (event) {
      return Array.from(this.subscriptions.get(event) ?? []);
    }
    const result: Subscription[] = [];
    for (const [, subs] of this.subscriptions) result.push(...Array.from(subs));
    result.push(...Array.from(this.wildcards));
    return result;
  }

  /** Get statistics */
  getStats(): ObserverStats {
    return { ...this.stats, eventsWithListeners: this.subscriptions.size + (this.wildcards.size > 0 ? 1 : 0) };
  }

  // --- Lifecycle ---

  /** Destroy the observer and clean up all resources */
  destroy(): void {
    this.removeAll();
    this.destroyed = true;
    this.errorHandler = null;
  }

  /** Check if destroyed */
  isDestroyed(): boolean { return this.destroyed; }

  // --- Internal ---

  private isSubscribed(sub: Subscription): boolean {
    if (this.wildcards.has(sub)) return true;
    const subs = this.subscriptions.get(sub.event);
    return subs?.has(sub) ?? false;
  }
}

// --- Typed Factory ---

/** Create a typed observer/event emitter */
export function createObserver<E extends Record<string, any> = Record<string, any>>(
  options?: { maxListeners?: number; errorHandler?: EventErrorHandler },
): Observer<E> {
  return new Observer<E>(options);
}
