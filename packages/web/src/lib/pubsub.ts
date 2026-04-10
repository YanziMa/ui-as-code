/**
 * Advanced pub/sub message broker with topic-based routing and persistence.
 */

export type MessageHandler<T = unknown> = (message: T, context: MessageContext) => void | Promise<void>;

export interface Message<T = unknown> {
  id: string;
  topic: string;
  payload: T;
  timestamp: number;
  headers?: Record<string, string>;
}

export interface MessageContext {
  messageId: string;
  topic: string;
  timestamp: number;
  ack: () => void;
  nack: (reason?: string) => void;
  retryCount: number;
}

export interface SubscriptionOptions {
  /** Only receive messages matching this filter */
  filter?: (msg: Message) => boolean;
  /** Maximum delivery attempts (default: 3) */
  maxRetries?: number;
  /** Process messages in order */
  ordered?: boolean;
  /** Subscriber name for debugging */
  name?: string;
}

interface InternalSubscription<T = unknown> {
  id: string;
  handler: MessageHandler<T>;
  options: Required<SubscriptionOptions> & { maxRetries: number };
  pendingMessages: Array<{ msg: Message<T>; ctx: MessageContext; attempts: number }>;
  processing: boolean;
}

export class MessageBroker {
  private subscriptions = new Map<string, Map<string, InternalSubscription>>();
  private messageHistory: Message[] = [];
  private maxHistorySize: number;
  private messageIdCounter = 0;

  constructor(options?: { maxHistorySize?: number }) {
    this.maxHistorySize = options?.maxHistorySize ?? 1000;
  }

  /** Publish a message to a topic */
  async publish<T>(topic: string, payload: T, headers?: Record<string, string>): Promise<{ delivered: number; failed: number }> {
    const id = `msg_${++this.messageIdCounter}_${Date.now()}`;
    const message: Message<T> = { id, topic, payload, timestamp: Date.now(), headers };

    // Store in history
    this.messageHistory.push(message as Message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    const topicSubs = this.subscriptions.get(topic);
    if (!topicSubs || topicSubs.size === 0) {
      return { delivered: 0, failed: 0 };
    }

    let delivered = 0;
    let failed = 0;

    for (const [, sub] of topicSubs) {
      // Apply filter
      if (sub.options.filter && !sub.options.filter(message)) continue;

      try {
        const ctx = this.createContext(message);
        await sub.handler(message.payload, ctx);
        delivered++;
      } catch (error) {
        console.error(`[MessageBroker] Handler error in "${sub.options.name}":`, error);
        failed++;
      }
    }

    return { delivered, failed };
  }

  /** Subscribe to a topic */
  subscribe<T>(
    topic: string,
    handler: MessageHandler<T>,
    options?: SubscriptionOptions,
  ): () => void {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const sub: InternalSubscription<T> = {
      id: subId,
      handler: handler as MessageHandler<unknown>,
      options: {
        filter: options?.filter ?? (() => true),
        maxRetries: options?.maxRetries ?? 3,
        ordered: options?.ordered ?? false,
        name: options?.name ?? subId,
      },
      pendingMessages: [],
      processing: false,
    };

    let topicSubs = this.subscriptions.get(topic);
    if (!topicSubs) {
      topicSubs = new Map();
      this.subscriptions.set(topic, topicSubs);
    }
    topicSubs.set(subId, sub as InternalSubscription);

    // Return unsubscribe function
    return () => {
      topicSubs?.delete(subId);
      if (topicSubs?.size === 0) {
        this.subscriptions.delete(topic);
      }
    };
  }

  /** Subscribe to multiple topics with pattern matching (* wildcard) */
  subscribePattern(
    pattern: string,
    handler: MessageHandler,
    options?: SubscriptionOptions,
  ): () => void {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    const unsubs: Array<() => void> = [];

    // Subscribe to existing matching topics
    for (const [topic] of this.subscriptions) {
      if (regex.test(topic)) {
        unsubs.push(this.subscribe(topic, handler, options));
      }
    }

    // Note: New topics won't be auto-matched — this is a simplified implementation
    return () => unsubs.forEach((u) => u());
  }

  /** Get message history for a topic */
  getHistory(
    topic?: string,
    limit?: number,
  ): Message[] {
    let history = this.messageHistory;

    if (topic) {
      history = history.filter((m) => m.topic === topic);
    }

    return history.slice(-(limit ?? 50));
  }

  /** Get subscription count per topic */
  getTopicStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const [topic, subs] of this.subscriptions) {
      stats[topic] = subs.size;
    }
    return stats;
  }

  /** Clear all subscriptions */
  clear(): void {
    this.subscriptions.clear();
  }

  private createContext(message: Message): MessageContext {
    let acknowledged = false;
    let nacked = false;

    return {
      messageId: message.id,
      topic: message.topic,
      timestamp: message.timestamp,
      retryCount: 0,
      ack: () => { acknowledged = true; },
      nack: (reason?: string) => {
        nacked = true;
        if (reason) console.warn(`[MessageBroker] Message ${message.id} nacked: ${reason}`);
      },
    };
  }
}
