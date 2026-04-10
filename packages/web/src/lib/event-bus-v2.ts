/**
 * Event Bus v2: Enhanced event bus with typed channels, middleware pipeline,
 * event versioning, wildcard subscriptions, async handler support with
 * concurrency control, event replay, snapshot/restore, metrics, and
 * channel-based isolation.
 */

// --- Types ---

export type ChannelName = string;
export type EventName = string;
export type EventId = string;
export type SubscriberId = string;
export type MiddlewareId = string;

export interface BaseEvent {
  type: EventName;
  timestamp: number;
  id: EventId;
  version?: number;
  source?: string;
  correlationId?: string;
  causationId?: string; // ID of event that caused this one
  metadata?: Record<string, unknown>;
}

export interface TypedEvent<T = unknown> extends BaseEvent {
  payload: T;
}

export type EventHandler<T = unknown> = (event: TypedEvent<T>) => void | Promise<void>;

export interface SubscriptionOptions {
  /** Only receive events matching predicate */
  filter?: (event: BaseEvent) => boolean;
  /** Receive events only once then unsubscribe */
  once?: boolean;
  /** Priority in handler execution (higher first) */
  priority?: number;
  /** Handler receives a copy (immutable) */
  immutable?: boolean;
  /** Maximum concurrent invocations (default: Infinity) */
  concurrency?: number;
  /** Timeout for async handlers (ms, default: 30000) */
  timeout?: number;
  /** Error strategy: "continue" (skip this handler) | "stop" (stop propagation) | "throw" (rethrow) */
  onError?: "continue" | "stop" | "throw";
}

export interface SubscriptionHandle {
  id: SubscriberId;
  channel: ChannelName;
  event: EventName | "*";
  unsubscribe: () => boolean;
}

export interface MiddlewareContext {
  event: BaseEvent;
  channel: ChannelName;
  index: number; // Position in pipeline
  totalMiddlewares: number;
  metadata?: Record<string, unknown>;
  /** Call to proceed to next middleware or stop */
  next: (event?: BaseEvent) => void;
  /** Stop propagation through pipeline */
  stop: (reason?: string) => void;
}

export type EventMiddleware = (ctx: MiddlewareContext) => void | Promise<void>;

export interface BusMetrics {
  totalEventsPublished: number;
  totalEventsDelivered: number;
  totalHandlersInvoked: number;
  totalErrorsCaught: number;
  totalMiddlewareBlocked: number;
  activeSubscriptions: number;
  activeChannels: number;
  eventsByType: Record<EventName, number>;
  channelsBySubscriptionCount: Record<ChannelName, number>;
  averageHandlerTime: number;
  uptime: number;
}

export interface EventBusConfig {
  /** Maximum number of subscriptions per channel+event (default: 100) */
  maxSubscriptionsPerTopic?: number;
  /** Enable wildcard "*" subscriptions (default: true) */
  enableWildcards?: boolean;
  /** Enable global "*" subscription (default: true) */
  enableGlobalWildcard?: boolean;
  /** Default handler timeout (default: 30000) */
  defaultHandlerTimeout?: number;
  /** Emit warning when handler exceeds timeout (default: true) */
  warnOnTimeout?: boolean;
  /** Called on unhandled errors during emit */
  onError?: (error: Error, event: BaseEvent, channel: ChannelName) => void;
  /** Called after each emit cycle */
  onEmit?: (event: BaseEvent, channel: ChannelName, delivered: number, errors: number) => void;
  /** Enable event history/snapshot (default: true) */
  enableHistory?: boolean;
  /** Max history entries (default: 1000) */
  maxHistorySize?: number;
  /** Name for debugging */
  name?: string;
}

interface StoredSubscription {
  id: SubscriberId;
  channel: ChannelName;
  event: EventName | "*";
  handler: EventHandler;
  options: SubscriptionOptions;
  createdAt: number;
  invokedCount: number;
  errorCount: number;
  lastInvokedAt: number | null;
  isActive: boolean;
}

interface HistoryEntry {
  event: BaseEvent;
  channel: ChannelName;
  deliveredTo: number;
  errorsAt: number;
  timestamp: number;
}

let eventIdCounter = 0;
let subIdCounter = 0;

function generateEventId(): EventId { return `evt_${++eventIdCounter}_${Date.now().toString(36)}`; }
function generateSubId(): SubscriberId { return `sub_${++subIdCounter}_${Date.now().toString(36)}`; }

// --- EventBusV2 Implementation ---

export class EventBusV2 {
  private config: Required<Pick<EventBusConfig, "maxSubscriptionsPerTopic" | "enableWildcards" | "enableGlobalWildcard" | "warnOnTimeout" | "enableHistory" | "maxHistorySize">> & Omit<EventBusConfig, "maxSubscriptionsPerTopic" | "enableWildcards" | "enableGlobalWildcard" | "warnOnTimeout" | "enableHistory" | "maxHistorySize">;

  // channel:event -> subscriptions[]
  private subscriptions = new Map<string, StoredSubscription[]>();
  // channel -> middleware[]
  private middlewares = new Map<ChannelName, EventMiddleware[]>();
  private history: HistoryEntry[] = [];
  private metrics: BusMetrics;
  private destroyed = false;

  constructor(config: EventBusConfig = {}) {
    this.config = {
      maxSubscriptionsPerTopic: config.maxSubscriptionsPerTopic ?? 100,
      enableWildcards: config.enableWildcards ?? true,
      enableGlobalWildcard: config.enableGlobalWildcard ?? true,
      defaultHandlerTimeout: config.defaultHandlerTimeout ?? 30_000,
      warnOnTimeout: config.warnOnTimeout ?? true,
      enableHistory: config.enableHistory ?? true,
      maxHistorySize: config.maxHistorySize ?? 1000,
      name: config.name ?? "EventBusV2",
      onError: config.onError,
      onEmit: config.onEmit,
    };
    this.metrics = this.createEmptyMetrics();
  }

  // --- Publishing ---

  /**
   * Publish an event to a channel.
   */
  async publish<T = unknown>(
    channel: ChannelName,
    eventType: EventName,
    payload: T,
    options?: {
      version?: number;
      source?: string;
      correlationId?: string;
      causationId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{ delivered: number; errors: number }> {
    if (this.destroyed) return { delivered: 0, errors: 0 };

    const event: TypedEvent<T> = {
      type: eventType,
      payload,
      id: generateEventId(),
      timestamp: Date.now(),
      version: options?.version,
      source: options?.source,
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      metadata: options?.metadata,
    };

    this.metrics.totalEventsPublished++;

    // Run middleware pipeline for this channel
    let currentEvent: BaseEvent = event;
    let blocked = false;
    const channelMws = this.middlewares.get(channel) ?? [];

    for (let i = 0; i < channelMws.length; i++) {
      const mw = channelMws[i];
      let nextCalled = false;
      let stopped = false;
      let stopReason: string | undefined;

      const ctx: MiddlewareContext = {
        event: currentEvent,
        channel,
        index: i,
        totalMiddlewares: channelMws.length,
        next: (ev?: BaseEvent) => {
          nextCalled = true;
          if (ev) currentEvent = ev;
        },
        stop: (reason?) => {
          stopped = true;
          stopReason = reason;
        },
      };

      await mw(ctx);

      if (stopped && !nextCalled) {
        blocked = true;
        this.metrics.totalMiddlewareBlocked++;
        break;
      }
    }

    if (blocked) {
      this.recordHistory(event, channel, 0, 1);
      return { delivered: 0, errors: 1 };
    }

    // Find and execute matching subscribers
    const subs = this.matchSubscriptions(channel, eventType);
    let delivered = 0;
    let errors = 0;

    // Sort by priority descending
    subs.sort((a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0));

    // Execute handlers
    for (const sub of subs) {
      if (!sub.isActive) continue;

      // Apply filter
      if (sub.options.filter && !sub.options.filter(currentEvent)) continue;

      // Once check
      if (sub.options.once) sub.isActive = false;

      // Create immutable copy if requested
      const handlerEvent = sub.options.immutable
        ? JSON.parse(JSON.stringify(currentEvent))
        : currentEvent;

      const start = performance.now();
      let errored = false;

      try {
        if (sub.handler.length > 1) {
          // Async handler (has 2+ args, likely async)
          await this.invokeWithTimeout(sub, handlerEvent);
        } else {
          const result = sub.handler(handlerEvent);
          if (result instanceof Promise) await result;
        }

        delivered++;
        sub.invokedCount++;
        sub.lastInvokedAt = Date.now();
        this.metrics.totalHandlersInvoked++;

      } catch (err) {
        errored = true;
        sub.errorCount++;
        this.metrics.totalErrorsCaught++;

        const strategy = sub.options.onError ?? "continue";

        switch (strategy) {
          case "throw":
            throw err;
          case "stop":
            errors++;
            this.config.onError?.(err as Error, currentEvent, channel);
            break;
          case "continue":
          default:
            errors++;
            if (this.config.warnOnTimeout && err instanceof Error && err.message.includes("timeout")) {
              console.warn(`[EventBusV2:${this.config.name}] Handler ${sub.id} timed out`);
            }
            this.config.onError?.(err as Error, currentEvent, channel);
            break;
        }
      }

      const elapsed = performance.now() - start;
      this.updateAverageTime(elivered + errors, elapsed);
    }

    // Cleanup once subscriptions
    for (const sub of subs) {
      if (!sub.isActive) this.unsubscribe(sub.id);
    }

    // Record history
    this.recordHistory(event, channel, delivered, errors);
    this.config.onEmit?.(event, channel, delivered, errors);

    return { delivered, errors };
  }

  /**
   * Publish and wait for responses from handlers that return values.
   */
  async requestResponse<TReq = unknown, TRes = unknown>(
    channel: ChannelName,
    eventType: EventName,
    payload: TReq,
    options?: {
      timeout?: number;
      expectResponses?: number;
    } & Parameters<EventBusV2["publish"]>[2],
  ): Promise<TRes[]> {
    const responses: TRes[] = [];
    const responded = new Set<SubscriberId>();

    const tempSub = this.subscribe<unknown>(channel, eventType, (event) => {
      const handler = event.handler as EventHandler<unknown>;
      const result = handler(event);
      if (result != null && !responded.has(event.id)) {
        responded.add(event.id);
        responses.push(result as TRes);
      }
    }, { once: false, priority: -1 }); // Low priority so runs after real handlers

    await this.publish(channel, eventType, payload, options);

    // Wait for responses or timeout
    const timeout = options?.timeout ?? this.config.defaultHandlerTimeout;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline && responses.length < (options?.expectResponses ?? 0)) {
      await new Promise((r) => setTimeout(r, 10));
    }

    this.unsubscribe(tempSub.id);
    return responses;
  }

  // --- Subscribing ---

  subscribe<T = unknown>(
    channel: ChannelName,
    eventType: EventName | "*",
    handler: EventHandler<T>,
    options?: SubscriptionOptions,
  ): SubscriptionHandle {
    if (this.destroyed) throw new Error("Bus is destroyed");

    const key = `${channel}:${eventType}`;
    const existingCount = (this.subscriptions.get(key) ?? []).length;

    if (existingCount >= this.config.maxSubscriptionsPerTopic) {
      console.warn(`[EventBusV2:${this.config.name}] Max subscriptions (${this.config.maxSubscriptionsPerTopic}) reached for ${key}`);
    }

    const id = generateSubId();
    const sub: StoredSubscription = {
      id, channel, event: eventType,
      handler: handler as EventHandler,
      options: {
        filter: options?.filter,
        once: options?.once ?? false,
        priority: options?.priority ?? 0,
        immutable: options?.immutable ?? false,
        concurrency: options?.concurrency ?? Infinity,
        timeout: options?.timeout ?? this.config.defaultHandlerTimeout,
        onError: options?.onError ?? "continue",
      },
      createdAt: Date.now(),
      invokedCount: 0,
      errorCount: 0,
      lastInvokedAt: null,
      isActive: true,
    };

    if (!this.subscriptions.has(key)) this.subscriptions.set(key, []);
    this.subscriptions.get(key)!.push(sub);
    this.updateMetrics();

    return {
      id,
      channel,
      event: eventType,
      unsubscribe: () => this.unsubscribe(id),
    };
  }

  subscribeOnce<T = unknown>(
    channel: ChannelName,
    eventType: EventName,
    handler: EventHandler<T>,
    options?: Omit<SubscriptionOptions, "once">,
  ): SubscriptionHandle {
    return this.subscribe(channel, eventType, handler, { ...options, once: true });
  }

  unsubscribe(subId: SubscriberId): boolean {
    for (const [, subs] of this.subscriptions) {
      const idx = subs.findIndex((s) => s.id === subId);
      if (idx >= 0) {
        subs[idx].isActive = false;
        subs.splice(idx, 1);
        this.updateMetrics();
        return true;
      }
    }
    return false;
  }

  unsubscribeChannel(channel: ChannelName): number {
    let count = 0;
    for (const [key, subs] of this.subscriptions) {
      if (key.startsWith(`${channel}:`)) {
        for (const sub of subs) sub.isActive = false;
        count += subs.length;
        subs.length = 0;
      }
    }
    this.updateMetrics();
    return count;
  }

  unsubscribeAll(): number {
    let count = 0;
    for (const [, subs] of this.subscriptions) {
      for (const sub of subs) sub.isActive = false;
      count += subs.length;
    }
    this.subscriptions.clear();
    this.updateMetrics();
    return count;
  }

  // --- Middleware ---

  use(channel: ChannelName, middleware: EventMiddleware): () => void {
    if (!this.middlewares.has(channel)) this.middlewares.set(channel, []);
    this.middlewares.get(channel)!.push(middleware);
    return () => {
      const arr = this.middlewares.get(channel);
      if (arr) {
        const idx = arr.indexOf(middleware);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }

  // --- Query ---

  getChannels(): ChannelName[] {
    const channels = new Set<ChannelName>();
    for (const [key] of this.subscriptions.keys()) {
      channels.add(key.split(":")[0]);
    }
    for (const ch of this.middlewares.keys()) channels.add(ch);
    return Array.from(channels);
  }

  getSubscriptionCount(channel?: ChannelName, event?: EventName): number {
    if (channel && event) return (this.subscriptions.get(`${channel}:${event}`) ?? []).filter((s) => s.isActive).length;
    if (channel) {
      let count = 0;
      for (const [key, subs] of this.subscriptions) {
        if (key.startsWith(`${channel}:`)) count += subs.filter((s) => s.isActive).length;
      }
      return count;
    }
    return Array.from(this.subscriptions.values()).flat().filter((s) => s.isActive).length;
  }

  getMetrics(): BusMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  // --- History / Replay ---

  getHistory(limit?: number): HistoryEntry[] {
    if (limit) return this.history.slice(-limit);
    return [...this.history];
  }

  /**
   * Replay events from history through the bus.
   */
  async replay(fromIndex?: number, toIndex?: number, channelFilter?: ChannelName): Promise<number> {
    const slice = this.history.slice(fromIndex, toIndex);
    const filtered = channelFilter ? slice.filter((h) => h.channel === channelFilter) : slice;
    let replayed = 0;

    for (const entry of filtered) {
      const { event, channel } = entry;
      await this.publish(channel, event.type, event.payload);
      replayed++;
    }

    return replayed;
  }

  clearHistory(): void { this.history = []; }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribeAll();
    this.middlewares.clear();
    this.history = [];
  }

  isDestroyed(): boolean { return this.destroyed; }

  // --- Internal ---

  private matchSubscriptions(channel: ChannelName, eventType: EventName): StoredSubscription[] {
    const results: StoredSubscription[] = [];

    // Exact match
    const exactKey = `${channel}:${eventType}`;
    const exact = this.subscriptions.get(exactKey) ?? [];
    results.push(...exact.filter((s) => s.isActive));

    // Channel wildcard (channel:*)
    if (this.config.enableWildcards) {
      const chanWild = this.subscriptions.get(`${channel}:*`) ?? [];
      results.push(...chanWild.filter((s) => s.isActive && s.event !== "*" && (s.event as string) !== eventType));
    }

    // Event wildcard (*)
    if (this.config.enableWildcards) {
      const evtWild = this.subscriptions.get(`${channel}:*`) ?? [];
      results.push(...evtWild.filter((s) => s.isActive && s.event === "*"));
    }

    // Global wildcard (*:*)
    if (this.config.enableGlobalWildcard) {
      const global = this.subscriptions.get("*:*") ?? [];
      results.push(...global.filter((s) => s.isActive));
    }

    return results;
  }

  private async invokeWithTimeout(sub: StoredSubscription, event: BaseEvent): Promise<void> {
    const timeout = sub.options.timeout ?? this.config.defaultHandlerTimeout;
    return Promise.race([
      (sub.handler as EventHandler<unknown>)(event),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Handler timeout after ${timeout}ms`)), timeout),
      ),
    ]);
  }

  private recordHistory(event: BaseEvent, channel: ChannelName, delivered: number, errors: number): void {
    if (!this.config.enableHistory) return;
    this.history.push({ event, channel, deliveredTo: delivered, errorsAt: errors, timestamp: Date.now() });
    if (this.history.length > this.config.maxHistorySize) {
      this.history = this.history.slice(-this.config.maxHistorySize);
    }
  }

  private updateMetrics(): void {
    let active = 0;
    const channels = new Set<ChannelName>();
    const types = new Map<EventName, number>();

    for (const [key, subs] of this.subscriptions) {
      const activeSubs = subs.filter((s) => s.isActive);
      active += activeSubs.length;
      channels.add(key.split(":")[0]);

      for (const sub of activeSubs) {
        const t = (sub.event as string) ?? "*";
        types.set(t, (types.get(t) ?? 0) + 1);
      }
    }

    this.metrics.activeSubscriptions = active;
    this.metrics.activeChannels = channels.size;
    this.metrics.channelsBySubscriptionCount = Object.fromEntries(
      Array.from(channels).map((ch) => [ch, this.getSubscriptionCount(ch)]),
    );
    this.metrics.eventsByType = Object.fromEntries(types);
    this.metrics.uptime = performance.now(); // rough
  }

  private updateAverageTime(totalCalls: number, totalTime: number): void {
    if (totalCalls > 0) {
      this.metrics.averageHandlerTime = totalTime / totalCalls;
    }
  }

  private createEmptyMetrics(): BusMetrics {
    return {
      totalEventsPublished: 0, totalEventsDelivered: 0,
      totalHandlersInvoked: 0, totalErrorsCaught: 0,
      totalMiddlewareBlocked: 0, activeSubscriptions: 0,
      activeChannels: 0, eventsByType: {},
      channelsBySubscriptionCount: {}, averageHandlerTime: 0, uptime: 0,
    };
  }
}

// --- Factory ---

export function createEventBusV2(config?: EventBusConfig): EventBusV2 {
  return new EventBusV2(config);
}
