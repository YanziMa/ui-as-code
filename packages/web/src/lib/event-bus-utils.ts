/**
 * Event Bus (Pub/Sub) Utilities: Typed publish/subscribe event system,
 * wildcard subscriptions, once() listeners, async event handling,
 * event filtering, middleware pipeline, namespaced events, and
 * memory leak prevention.
 */

// --- Types ---

export type EventKey = string;
export type EventHandler<P = unknown> = (payload: P) => void | Promise<void>;
export type EventMiddleware<P = unknown> = (
  payload: P,
  next: () => void,
) => void;

export interface Subscription {
  /** Unique subscription ID */
  id: string;
  /** Event key subscribed to */
  event: EventKey;
  /** Handler function */
  handler: EventHandler<unknown>;
  /** Whether this is a one-time subscription */
  once: boolean;
  /** Priority (higher = called first). Default 0 */
  priority: number;
  /** Filter function — handler only called if returns true */
  filter?: (payload: unknown) => boolean;
}

export interface EventBusOptions {
  /** Maximum number of listeners per event (default 50) */
  maxListeners?: number;
  /** Enable wildcard subscriptions (e.g., "user:*") */
  wildcards?: boolean;
  /** Wildcard character (default "*") */
  wildcardChar?: string;
  /** Log events for debugging */
  debug?: boolean;
  /** Called when an error is thrown in a handler */
  onError?: (error: Error, event: EventKey, payload: unknown) => void;
  /** Called after every event dispatch */
  onDispatch?: (event: EventKey, payload: unknown) => void;
}

// --- Core Event Bus ---

/**
 * Typed pub/sub event bus with middleware support, filtering,
 * wildcard patterns, and one-time subscriptions.
 *
 * @example
 * ```ts
 * const bus = new EventBus({ debug: true });
 * bus.on("user:login", (data) => console.log("User logged in:", data));
 * bus.once("app:init", () => console.log("First init!"));
 * bus.emit("user:login", { name: "Alice", role: "admin" });
 * ```
 */
export class EventBus {
  private listeners = new Map<EventKey, Subscription[]>();
  private middleware: Array<EventMiddleware<unknown>> = [];
  private destroyed = false;
  private options: Required<EventBusOptions>;
  private subIdCounter = 0;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxListeners: options.maxListeners ?? 50,
      wildcards: options.wildcards ?? true,
      wildcardChar: options.wildcardChar ?? "*",
      debug: options.debug ?? false,
      onError: options.onError ?? ((e) => console.error("[EventBus]", e.message)),
      onDispatch: options.onDispatch ?? (() => {}),
    };
  }

  /** Subscribe to an event */
  on<P = unknown>(event: EventKey, handler: EventHandler<P>, options?: { once?: boolean; priority?: number; filter?: (payload: P) => boolean }): () => void {
    if (this.destroyed) throw new Error("EventBus is destroyed");

    const sub: Subscription = {
      id: `sub_${++this.subIdCounter}`,
      event,
      handler: handler as EventHandler<unknown>,
      once: options?.once ?? false,
      priority: options?.priority ?? 0,
      filter: options?.filter as ((payload: unknown) => boolean) | undefined,
    };

    let list = this.listeners.get(event);
    if (!list) {
      list = [];
      this.listeners.set(event, list);
    }

    // Enforce max listeners
    if (list.length >= this.options.maxListeners && !this.options.debug) {
      console.warn(`[EventBus] Max listeners (${this.options.maxListeners}) reached for "${event}"`);
      return () => {};
    }

    list.push(sub);
    // Sort by priority (higher first)
    list.sort((a, b) => b.priority - a.priority);

    // Return unsubscribe function
    return () => this.off(event, sub.id);
  }

  /** Subscribe to an event that fires only once */
  once<P = unknown>(event: EventKey, handler: EventHandler<P>): () => void {
    return this.on(event, handler, { once: true });
  }

  /** Unsubscribe by event + subscription ID */
  off(event: EventKey, subId: string): boolean {
    const list = this.listeners.get(event);
    if (!list) return false;

    const idx = list.findIndex((s) => s.id === subId);
    if (idx >= 0) {
      list.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Unsubscribe all handlers for an event */
  offAll(event: EventKey): number {
    const list = this.listeners.get(event);
    if (!list) return 0;
    const count = list.length;
    this.listeners.delete(event);
    return count;
  }

  /** Emit/publish an event */
  emit<P = unknown>(event: EventKey, payload?: P): void {
    if (this.destroyed) return;

    try {
      // Run through middleware pipeline
      let currentPayload = payload as unknown;
      let idx = 0;
      const runNext = (): void => {
        if (idx < this.middleware.length) {
          const mw = this.middleware[idx]!;
          idx++;
          mw(currentPayload, runNext);
        } else {
          this._dispatch(event, currentPayload);
        }
      };
      runNext();
    } catch (err) {
      this.options.onError(err instanceof Error ? err : new Error(String(err)), event, payload);
    }
  }

  /** Emit asynchronously (awaits all handlers) */
  async emitAsync<P = unknown>(event: EventKey, payload?: P): Promise<void> {
    if (this.destroyed) return;

    let currentPayload = payload as unknown;
    // Middleware
    for (const mw of this.middleware) {
      await new Promise<void>((resolve) => {
        mw(currentPayload, resolve);
      });
    }

    await this._dispatchAsync(event, currentPayload);
  }

  /** Add middleware that runs on every emit */
  use(middleware: EventMiddleware<unknown>): void {
    this.middleware.push(middleware);
  }

  /** Remove middleware */
  removeMiddleware(middleware: EventMiddleware<unknown>): void {
    const idx = this.middleware.indexOf(middleware);
    if (idx >= 0) this.middleware.splice(idx, 1);
  }

  /** Check if any listeners are subscribed to an event */
  hasListeners(event: EventKey): boolean {
    if (this.listeners.has(event)) return true;
    if (this.options.wildcards) {
      for (const key of this.listeners.keys()) {
        if (this._matchWildcard(key, event)) return true;
      }
    }
    return false;
  }

  /** Get listener count for an event */
  listenerCount(event: EventKey): number {
    let count = this.listeners.get(event)?.length ?? 0;
    if (this.options.wildcards) {
      for (const [key, subs] of this.listeners) {
        if (key !== event && this._matchWildcard(key, event)) count += subs.length;
      }
    }
    return count;
  }

  /** Clear all listeners and middleware */
  clear(): void {
    this.listeners.clear();
    this.middleware = [];
  }

  /** Destroy the event bus — prevents further operations */
  destroy(): void {
    this.clear();
    this.destroyed = true;
  }

  // --- Private ---

  private _dispatch(event: EventKey, payload: unknown): void {
    // Direct matches
    const direct = this.listeners.get(event) ?? [];
    // Wildcard matches
    const wildcardMatches: Subscription[] = [];
    if (this.options.wildcards) {
      for (const [key, subs] of this.listeners) {
        if (key !== event && this._matchWildcard(key, event)) {
          wildcardMatches.push(...subs);
        }
      }
    }

    const all = [...direct, ...wildcardMatches];
    const toRemove: string[] = [];

    for (const sub of all) {
      // Apply filter
      if (sub.filter && !sub.filter(payload)) continue;

      try {
        const result = sub.handler(payload);
        if (result instanceof Promise) {
          console.warn("[EventBus] Async handler in sync emit() — promise ignored. Use emitAsync().");
        }
        if (sub.once) toRemove.push(sub.id);
      } catch (err) {
        this.options.onError(err instanceof Error ? err : new Error(String(err)), event, payload);
      }
    }

    // Remove once handlers
    for (const id of toRemove) {
      this.off(event, id);
    }

    this.options.onDispatch(event, payload);

    if (this.options.debug) {
      console.log(`[EventBus] Emit: ${event}`, payload);
    }
  }

  private async _dispatchAsync(event: EventKey, payload: unknown): Promise<void> {
    const direct = this.listeners.get(event) ?? [];
    const wildcardMatches: Subscription[] = [];
    if (this.options.wildcards) {
      for (const [key, subs] of this.listeners) {
        if (key !== event && this._matchWildcard(key, event)) {
          wildcardMatches.push(...subs);
        }
      }
    }

    const all = [...direct, ...wildcardMatches];
    const toRemove: string[] = [];

    for (const sub of all) {
      if (sub.filter && !sub.filter(payload)) continue;

      try {
        await sub.handler(payload);
        if (sub.once) toRemove.push(sub.id);
      } catch (err) {
        this.options.onError(err instanceof Error ? err : new Error(String(err)), event, payload);
      }
    }

    for (const id of toRemove) {
      this.off(event, id);
    }
  }

  private _matchWildcard(pattern: EventKey, key: EventKey): boolean {
    const wc = this.options.wildcardChar;
    if (pattern.includes(wc)) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$",
      );
      return regex.test(key);
    }
    return pattern === key;
  }
}

// --- Global Singleton ---

let globalBus: EventBus | null = null;

/** Get or create a global singleton event bus */
export function getEventBus(options?: EventBusOptions): EventBus {
  if (!globalBus || globalBus.isDestroyed?.()) {
    globalBus = new EventBus(options);
  }
  return globalBus;
}

/** Destroy the global event bus */
export function destroyGlobalBus(): void {
  if (globalBus) { globalBus.destroy(); globalBus = null; }
}
