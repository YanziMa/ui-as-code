/**
 * Publish/Subscribe: Topic-based messaging system with hierarchical topics,
 * wildcard subscriptions, message history, delivery guarantees, and
 * subscriber groups.
 */

// --- Types ---

export type MessageHandler<T = unknown> = (message: Message<T>) => void | Promise<void>;
export type TopicPattern = string; // e.g. "user.*", "order.#", "system.alert"

export interface Message<T = unknown> {
  /** Unique message ID */
  id: string;
  /** Topic this message was published to */
  topic: string;
  /** Payload data */
  data: T;
  /** Timestamp when published */
  timestamp: number;
  /** Publisher identifier (optional) */
  publisher?: string;
  /** Message metadata */
  headers?: Record<string, string>;
}

export interface Subscription {
  /** Subscription ID */
  id: string;
  /** Topic pattern (supports wildcards) */
  pattern: TopicPattern;
  /** Handler function */
  handler: MessageHandler;
  /** Whether this is a one-time subscription */
  once: boolean;
  /** Subscriber group (for load-balanced delivery) */
  group?: string;
  /** Timestamp when created */
  createdAt: number;
  /** Unsubscribe function */
  unsubscribe: () => boolean;
}

export interface PubSubOptions {
  /** Maximum number of messages in history (default: 100) */
  maxHistory?: number;
  /** Deliver messages in order per subscriber (default: true) */
  ordered?: boolean;
  /** Maximum subscribers per topic warning threshold (default: 50) */
  maxSubscribersWarning?: number;
}

export interface PubSubStats {
  totalTopics: number;
  totalSubscriptions: number;
  totalPublished: number;
  totalDelivered: number;
  totalErrors: number;
  historySize: number;
}

// --- PubSub Broker ---

/**
 * Topic-based publish/subscribe message broker.
 *
 * Topics use dot-notation with two wildcard types:
 * - `*` matches a single segment (e.g. "user.*" matches "user.create" but not "user.profile.update")
 * - `#` matches zero or more segments (e.g. "user.#" matches "user", "user.create", "user.profile.update")
 *
 * @example
 * const bus = new PubSub();
 * bus.subscribe("user.created", (msg) => console.log(msg.data));
 * bus.publish("user.created", { name: "Alice" });
 */
export class PubSub {
  private subscriptions = new Map<string, Set<Subscription>>();
  private history: Message[] = [];
  private stats: PubSubStats = {
    totalTopics: 0,
    totalSubscriptions: 0,
    totalPublished: 0,
    totalDelivered: 0,
    totalErrors: 0,
    historySize: 0,
  };
  private options: Required<Pick<PubSubOptions, "maxHistory" | "maxSubscribersWarning">>;
  private destroyed = false;

  constructor(options: PubSubOptions = {}) {
    this.options = {
      maxHistory: options.maxHistory ?? 100,
      maxSubscribersWarning: options.maxSubscribersWarning ?? 50,
    };
  }

  /**
   * Subscribe to a topic pattern.
   * @returns Unsubscribe function
   */
  subscribe<T = unknown>(
    pattern: TopicPattern,
    handler: MessageHandler<T>,
    options?: { once?: boolean; group?: string },
  ): () => boolean {
    if (this.destroyed) return () => false;

    const sub: Subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      pattern,
      handler: handler as MessageHandler<unknown>,
      once: options?.once ?? false,
      group: options?.group,
      createdAt: Date.now(),
      unsubscribe: () => this._unsubscribe(sub.id),
    };

    let set = this.subscriptions.get(pattern);
    if (!set) {
      set = new Set();
      this.subscriptions.set(pattern, set);
      this.stats.totalTopics++;
    }
    set.add(sub);
    this.stats.totalSubscriptions++;

    if (set.size > this.options.maxSubscribersWarning) {
      console.warn(
        `[PubSub] Many subscribers (${set.size}) for pattern "${pattern}"`,
      );
    }

    return sub.unsubscribe;
  }

  /** Subscribe for a single message then auto-unsubscribe */
  once<T = unknown>(pattern: TopicPattern, handler: MessageHandler<T>): () => boolean {
    return this.subscribe(pattern, handler, { once: true });
  }

  /**
   * Publish a message to a topic.
   * Delivers to all matching subscriptions.
   */
  async publish<T = unknown>(
    topic: string,
    data: T,
    options?: { publisher?: string; headers?: Record<string, string> },
  ): Promise<{ delivered: number; errors: number }> {
    if (this.destroyed) return { delivered: 0, errors: 0 };

    const message: Message<T> = {
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      topic,
      data,
      timestamp: Date.now(),
      publisher: options?.publisher,
      headers: options?.headers,
    };

    // Store in history
    if (this.options.maxHistory > 0) {
      this.history.push(message as Message<unknown>);
      if (this.history.length > this.options.maxHistory) {
        this.history.shift();
      }
    }
    this.stats.totalPublished++;
    this.stats.historySize = this.history.length;

    // Find all matching subscriptions
    const matched = this._matchSubscriptions(topic);

    // Group-aware delivery: within a group, only deliver to one subscriber
    const deliveredGroups = new Map<string, boolean>();
    let delivered = 0;
    let errors = 0;

    for (const sub of matched) {
      // Skip if already delivered to this group
      if (sub.group && deliveredGroups.get(sub.group)) continue;

      try {
        await sub.handler(message as Message<unknown>);
        delivered++;
        this.stats.totalDelivered++;

        if (sub.group) deliveredGroups.set(sub.group, true);
        if (sub.once) sub.unsubscribe();
      } catch (err) {
        errors++;
        this.stats.totalErrors++;
        console.error(`[PubSub] Handler error on "${topic}":`, err);
        if (sub.once) sub.unsubscribe();
      }
    }

    return { delivered, errors };
  }

  /**
   * Publish synchronously (fire-and-forget, no await on handlers).
   */
  publishSync<T = unknown>(
    topic: string,
    data: T,
    options?: { publisher?: string; headers?: Record<string, string> },
  ): void {
    // Fire and forget — don't block on async handlers
    void this.publish(topic, data, options);
  }

  /** Unsubscribe by subscription ID */
  private _unsubscribe(id: string): boolean {
    for (const [, set] of this.subscriptions) {
      for (const sub of set) {
        if (sub.id === id) {
          set.delete(sub);
          this.stats.totalSubscriptions--;
          if (set.size === 0) {
            this.subscriptions.delete(sub.pattern);
            this.stats.totalTopics--;
          }
          return true;
        }
      }
    }
    return false;
  }

  /** Unsubscribe by pattern and handler */
  unsubscribe(pattern: TopicPattern, handler: MessageHandler): boolean {
    const set = this.subscriptions.get(pattern);
    if (!set) return false;

    for (const sub of set) {
      if (sub.handler === handler) {
        set.delete(sub);
        this.stats.totalSubscriptions--;
        if (set.size === 0) {
          this.subscriptions.delete(pattern);
          this.stats.totalTopics--;
        }
        return true;
      }
    }
    return false;
  }

  /** Remove all subscriptions for a pattern */
  unsubscribePattern(pattern: TopicPattern): number {
    const set = this.subscriptions.get(pattern);
    if (!set) return 0;
    const count = set.size;
    this.stats.totalSubscriptions -= count;
    this.subscriptions.delete(pattern);
    this.stats.totalTopics--;
    return count;
  }

  /** Get message history */
  getHistory(limit?: number): Message[] {
    if (limit !== undefined) return this.history.slice(-limit);
    return [...this.history];
  }

  /** Get recent messages for a topic */
  getTopicHistory(topic: string, limit?: number): Message[] {
    const filtered = this.history.filter((m) => m.topic === topic || this._topicMatch(m.topic, topic));
    if (limit !== undefined) return filtered.slice(-limit);
    return filtered;
  }

  /** Check if there are subscribers for a topic */
  hasSubscribers(topic: string): boolean {
    for (const [pattern] of this.subscriptions) {
      if (this._topicMatch(topic, pattern)) return true;
    }
    return false;
  }

  /** Get subscriber count for a topic pattern */
  subscriberCount(pattern?: TopicPattern): number {
    if (pattern) return this.subscriptions.get(pattern)?.size ?? 0;
    return this.stats.totalSubscriptions;
  }

  /** List all registered topic patterns */
  listTopics(): string[] {
    return [...this.subscriptions.keys()];
  }

  /** Get statistics */
  getStats(): PubSubStats {
    return { ...this.stats };
  }

  /** Destroy the broker and clean up */
  destroy(): void {
    this.subscriptions.clear();
    this.history = [];
    this.destroyed = true;
  }

  // --- Topic Matching ---

  /** Find all subscriptions that match a given topic */
  private _matchSubscriptions(topic: string): Subscription[] {
    const matched: Subscription[] = [];
    for (const [pattern, subs] of this.subscriptions) {
      if (this._topicMatch(topic, pattern)) {
        matched.push(...subs);
      }
    }
    return matched;
  }

  /**
   * Match a topic against a pattern.
   * Supports:
   * - Exact match: "user.created"
   * - Single-segment wildcard: "user.*" matches "user.created", "user.deleted"
   * - Multi-segment wildcard: "user.#" matches "user", "user.created", "user.profile.updated"
   */
  _topicMatch(topic: string, pattern: string): boolean {
    if (topic === pattern) return true;

    const topicParts = topic.split(".");
    const patternParts = pattern.split(".");

    for (let i = 0; i < patternParts.length; i++) {
      const pp = patternParts[i];
      if (pp === "#") return true; // Matches everything remaining
      if (pp === "*") {
        if (i >= topicParts.length) return false;
        continue;
      }
      if (i >= topicParts.length || pp !== topicParts[i]) return false;
    }

    return topicParts.length === patternParts.length;
  }
}

/** Create a new PubSub broker */
export function createPubSub(options?: PubSubOptions): PubSub {
  return new PubSub(options);
}
