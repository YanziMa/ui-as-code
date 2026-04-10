/**
 * Event bus / pub-sub system: typed event emitter, wildcard subscriptions,
 * async event handling, middleware, event history, once/many semantics.
 */

// --- Types ---

export type EventCallback<T = unknown> = (data: T) => void | Promise<void>;
export type EventMiddleware<T = unknown> = (
  data: T,
  next: (data: T) => void,
  eventName: string,
) => void;

export interface Subscription<T = unknown> {
  id: string;
  eventName: string;
  callback: EventCallback<T>;
  once: boolean;
  priority: number;       // Higher = runs first
  createdAt: number;
}

export interface EmittedEvent<T = unknown> {
  name: string;
  data: T;
  timestamp: number;
  id: string;
  source?: string;
}

export interface EventBusOptions {
  maxListeners?: number;    // Max per event name
  maxHistory?: number;      // Events to keep in history
  wildcards?: boolean;      // Enable * pattern matching
  throwErrors?: boolean;    // Throw vs catch subscriber errors
  delimiter?: string;       // Namespace delimiter (default: ":")
}

// --- Core Event Bus ---

export class EventBus<E extends Record<string, unknown> = Record<string, unknown>> {
  private listeners = new Map<string, Set<Subscription>>();
  private wildcardListeners = new Set<Subscription>();
  private middlewares: Array<EventMiddleware> = [];
  private history: Array<EmittedEvent> = [];
  private options: Required<EventBusOptions>;
  private destroyed = false;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxListeners: options.maxListeners ?? 100,
      maxHistory: options.maxHistory ?? 0,
      wildcards: options.wildcards ?? true,
      throwErrors: options.throwErrors ?? false,
      delimiter: options.delimiter ?? ":",
    };
  }

  /** Subscribe to an event */
  on<K extends keyof E>(
    eventName: K & string,
    callback: EventCallback<E[K]>,
    options?: { once?: boolean; priority?: number },
  ): () => void {
    if (this.destroyed) return () => {};

    const sub: Subscription = {
      id: crypto.randomUUID(),
      eventName: String(eventName),
      callback: callback as EventCallback,
      once: options?.once ?? false,
      priority: options?.priority ?? 0,
      createdAt: Date.now(),
    };

    let set = this.listeners.get(sub.eventName);
    if (!set) { set = new Set(); this.listeners.set(sub.eventName, set); }

    if (set.size >= this.options.maxListeners) {
      console.warn(`[EventBus] Max listeners (${this.options.maxListeners}) reached for "${sub.eventName}"`);
    }

    set.add(sub);

    // Return unsubscribe function
    return () => this.off(sub.id);
  }

  /** Subscribe to an event that fires only once */
  once<K extends keyof E>(eventName: K & string, callback: EventCallback<E[K]>): () => void {
    return this.on(eventName, callback, { once: true });
  }

  /** Subscribe to events matching a wildcard pattern */
  onWildcard(
    pattern: string,
    callback: EventCallback<unknown>,
    options?: { once?: boolean; priority?: number },
  ): () => void {
    if (!this.options.wildcards) {
      console.warn("[EventBus] Wildcards not enabled");
      return () => {};
    }

    const sub: Subscription = {
      id: crypto.randomUUID(),
      eventName: pattern,
      callback,
      once: options?.once ?? false,
      priority: options?.priority ?? 0,
      createdAt: Date.now(),
    };

    this.wildcardListeners.add(sub);
    return () => this.off(sub.id);
  }

  /** Emit an event */
  emit<K extends keyof E>(eventName: K & string, data?: E[K], source?: string): void {
    if (this.destroyed) return;

    const event: EmittedEvent = {
      name: String(eventName),
      data: data as unknown,
      timestamp: Date.now(),
      id: crypto.randomUUID(),
      source,
    };

    // Store in history
    if (this.options.maxHistory > 0) {
      this.history.push(event);
      if (this.history.length > this.options.maxHistory) {
        this.history.shift();
      }
    }

    // Apply middleware chain
    const runWithMiddlewares = (currentData: unknown) => {
      if (this.middlewares.length === 0) {
        this.dispatchEvent(String(eventName), currentData);
        return;
      }

      let middlewareIndex = 0;
      const next = (data: unknown) => {
        if (middlewareIndex < this.middlewares.length) {
          const mw = this.middlewares[middlewareIndex++]!;
          try {
            mw(data, next as (d: unknown) => void, String(eventName));
          } catch (error) {
            if (this.options.throwErrors) throw error;
            console.error(`[EventBus] Middleware error on "${eventName}":`, error);
          }
        } else {
          this.dispatchEvent(String(eventName), currentData);
        }
      };
      next(currentData);
    };

    runWithMiddlewares(event.data);
  }

  /** Emit asynchronously (returns promise when all handlers complete) */
  async emitAsync<K extends keyof E>(
    eventName: K & string,
    data?: E[K],
  ): Promise<void> {
    if (this.destroyed) return;

    const subs = this.getMatchingSubs(String(eventName));
    const promises: Promise<void>[] = [];

    for (const sub of subs) {
      try {
        const result = sub.callback(data);
        if (result instanceof Promise) promises.push(result);
      } catch (error) {
        if (this.options.throwErrors) throw error;
        console.error(`[EventBus] Handler error on "${eventName}":`, error);
      }
    }

    await Promise.allSettled(promises);

    // Clean up once-only subscribers
    for (const sub of subs) {
      if (sub.once) this.removeSubscription(sub);
    }
  }

  /** Remove subscription by ID */
  off(subscriptionId: string): boolean {
    // Check regular listeners
    for (const [, set] of this.listeners) {
      for (const sub of set) {
        if (sub.id === subscriptionId) {
          set.delete(sub);
          return true;
        }
      }
    }
    // Check wildcard listeners
    for (const sub of this.wildcardListeners) {
      if (sub.id === subscriptionId) {
        this.wildcardListeners.delete(sub);
        return true;
      }
    }
    return false;
  }

  /** Remove all listeners for an event */
  removeAllListeners(eventName: string): void {
    this.listeners.delete(eventName);
  }

  /** Add middleware */
  use(middleware: EventMiddleware): () => void {
    this.middlewares.push(middleware);
    return () => {
      const idx = this.middlewares.indexOf(middleware);
      if (idx >= 0) this.middlewares.splice(idx, 1);
    };
  }

  /** Get event history */
  getHistory(name?: string, limit?: number): EmittedEvent[] {
    let events = this.history;
    if (name) events = events.filter((e) => e.name === name);
    if (limit) events = events.slice(-limit);
    return events;
  }

  /** Clear history */
  clearHistory(): void { this.history = []; }

  /** Get listener count for an event */
  listenerCount(eventName: string): number {
    return this.listeners.get(eventName)?.size ?? 0;
  }

  /** Get all event names with listeners */
  eventNames(): string[] {
    return Array.from(this.listeners.keys()).filter((n) =>
      (this.listeners.get(n)?.size ?? 0) > 0
    );
  }

  /** Destroy the event bus */
  destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
    this.wildcardListeners.clear();
    this.middlewares = [];
    this.history = [];
  }

  // --- Private ---

  private dispatchEvent(eventName: string, data: unknown): void {
    const subs = this.getMatchingSubs(eventName);
    const toRemove: Subscription[] = [];

    for (const sub of subs) {
      try {
        sub.callback(data);
      } catch (error) {
        if (this.options.throwErrors) throw error;
        console.error(`[EventBus] Handler error on "${eventName}":`, error);
      }
      if (sub.once) toRemove.push(sub);
    }

    // Cleanup once-only after dispatch completes
    for (const sub of toRemove) this.removeSubscription(sub);
  }

  private getMatchingSubs(eventName: string): Subscription[] {
    const result: Subscription[] = [];

    // Exact match
    const exact = this.listeners.get(eventName);
    if (exact) result.push(...Array.from(exact));

    // Wildcard matches
    if (this.options.wildcards) {
      for (const sub of this.wildcardListeners) {
        if (this.matchPattern(sub.eventName, eventName)) {
          result.push(sub);
        }
      }
    }

    // Sort by priority (higher first)
    result.sort((a, b) => b.priority - a.priority);

    return result;
  }

  private matchPattern(pattern: string, eventName: string): boolean {
    if (pattern === "*") return true;
    if (pattern.includes("*")) {
      const regexStr = "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
      return new RegExp(regexStr).test(eventName);
    }
    // Namespace-style: "app:*" matches "app:user:login"
    if (pattern.includes(this.options.delimiter)) {
      const prefix = pattern.split("*")[0];
      return eventName.startsWith(prefix!);
    }
    return pattern === eventName;
  }

  private removeSubscription(sub: Subscription): void {
    const set = this.listeners.get(sub.eventName);
    if (set) set.delete(sub);
    this.wildcardListeners.delete(sub);
  }
}

// --- Typed Event Bus Factory ---

/** Create a typed event bus with event map */
export function createEventBus<E extends Record<string, unknown>>(
  options?: EventBusOptions,
): EventBus<E> {
  return new EventBus<E>(options);
}
