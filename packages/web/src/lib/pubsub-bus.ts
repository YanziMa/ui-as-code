/**
 * PubSub Bus: Advanced publish-subscribe message bus with topic routing,
 * wildcard subscriptions, message filtering, dead letter queues, replay,
 * request-reply pattern, rate limiting, priority ordering, persistence,
 * and throughput monitoring.
 */

// --- Types ---

export type Topic = string;
export type MessageId = string;
export type SubscriberId = string;

export interface PubSubMessage<T = unknown> {
  id: MessageId;
  topic: Topic;
  payload: T;
  headers?: Record<string, string>;
  timestamp: number;
  publisherId?: string;
  correlationId?: string;
  replyTo?: Topic;
  priority: number;
  ttl?: number;
  retries: number;
  maxRetries: number;
  contentType: string;
}

export interface SubscriptionFilter<T = unknown> {
  filter?: (message: PubSubMessage<T>) => boolean;
  headers?: Record<string, string>;
  rateLimit?: { maxMessages: number; windowMs: number };
  sampleRate?: number;
}

export interface Subscriber<T = unknown> {
  id: SubscriberId;
  topicPattern: Topic;
  handler: (message: PubSubMessage<T>) => void | Promise<void>;
  filter?: SubscriptionFilter<T>;
  once: boolean;
  priority: number;
  createdAt: number;
  messageCount: number;
  lastHandledAt: number;
  errorCount: number;
  isActive: boolean;
  unsubscribe: () => void;
}

export interface DeadLetterEntry<T = unknown> {
  message: PubSubMessage<T>;
  reason: "expired" | "handler-error" | "max-retries" | "filtered" | "unknown";
  error?: Error;
  timestamp: number;
  originalTopic: Topic;
  subscriberId?: SubscriberId;
}

export interface BusStats {
  totalPublished: number;
  totalDelivered: number;
  totalFiltered: number;
  totalErrors: number;
  totalDeadLettered: number;
  totalRetried: number;
  activeSubscribers: number;
  activeTopics: number;
  deadLetterQueueSize: number;
  averageDeliveryTime: number;
  peakThroughput: number;
  uptime: number;
}

export interface BusConfig {
  maxDeadLetterSize?: number;
  defaultTtl?: number;
  defaultMaxRetries?: number;
  persistent?: boolean;
  storageAdapter?: BusStorageAdapter;
  orderedDelivery?: boolean;
  globalRateLimit?: number;
  maxConcurrency?: number;
  errorHandler?: (error: Error, message: PubSubMessage, subscriber: Subscriber) => void | "retry" | "dead-letter" | "drop";
  onPublish?: (message: PubSubMessage) => void;
  onDeliver?: (message: PubSubMessage, subscriber: Subscriber) => void;
  enableWildcards?: boolean;
}

export interface BusStorageAdapter {
  save(message: PubSubMessage): Promise<void>;
  load(topic?: Topic): Promise<PubSubMessage[]>;
  remove(messageId: MessageId): Promise<void>;
  clear(topic?: Topic): Promise<void>;
  close?(): Promise<void>;
}

// --- Topic Pattern Matching ---

function matchTopic(pattern: Topic, actual: Topic): boolean {
  if (pattern === "#") return true;
  if (pattern === actual) return true;
  const patternParts = pattern.split(".");
  const actualParts = actual.split(".");
  if (patternParts.length !== actualParts.length && !pattern.includes("#")) return false;
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i], a = actualParts[i];
    if (p === "#") return true;
    if (p === "*") continue;
    if (p !== a) return false;
  }
  if (patternParts[patternParts.length - 1] === "#") return true;
  return patternParts.length === actualParts.length;
}

// --- ID Generation ---

let messageIdCounter = 0;
let subscriberIdCounter = 0;

function generateMessageId(): MessageId { return `msg_${++messageIdCounter}_${Date.now().toString(36)}`; }
function generateSubscriberId(): SubscriberId { return `sub_${++subscriberIdCounter}_${Date.now().toString(36)}`; }

// --- Per-Subscriber Rate Limiter ---

class PerSubscriberRateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();
  check(id: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    let w = this.windows.get(id);
    if (!w || now >= w.resetAt) { w = { count: 0, resetAt: now + windowMs }; this.windows.set(id, w); }
    if (w.count >= max) return false;
    w.count++; return true;
  }
  reset(id: string): void { this.windows.delete(id); }
  cleanup(): void {
    const now = Date.now();
    for (const [id, w] of this.windows) { if (now >= w.resetAt) this.windows.delete(id); }
  }
}

// --- PubSubBus Implementation ---

export class PubSubBus {
  private config: Required<Pick<BusConfig, "maxDeadLetterSize" | "defaultTtl" | "defaultMaxRetries" | "orderedDelivery" | "globalRateLimit" | "maxConcurrency" | "enableWildcards">> & Omit<BusConfig, "maxDeadLetterSize" | "defaultTtl" | "defaultMaxRetries" | "orderedDelivery" | "globalRateLimit" | "maxConcurrency" | "enableWildcards">;
  private subscribers = new Map<SubscriberId, Subscriber>();
  private topicIndex = new Map<Topic, Set<SubscriberId>>();
  private deadLetterQueue: DeadLetterEntry[] = [];
  private stats: BusStats;
  private rateLimiter = new PerSubscriberRateLimiter();
  private globalRateState: { count: number; resetAt: number } | null = null;
  private activeHandlers = 0;
  private destroyed = false;
  private startTime: number;
  private throughputSamples: number[] = [];
  private throughputTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: BusConfig = {}) {
    this.config = {
      maxDeadLetterSize: config.maxDeadLetterSize ?? 1000,
      defaultTtl: config.defaultTtl ?? 0,
      defaultMaxRetries: config.defaultMaxRetries ?? 3,
      orderedDelivery: config.orderedDelivery ?? false,
      globalRateLimit: config.globalRateLimit ?? Infinity,
      maxConcurrency: config.maxConcurrency ?? Infinity,
      enableWildcards: config.enableWildcards ?? true,
      persistent: config.persistent ?? false,
      storageAdapter: config.storageAdapter,
      errorHandler: config.errorHandler,
      onPublish: config.onPublish,
      onDeliver: config.onDeliver,
    };
    this.startTime = Date.now();
    this.stats = this.createEmptyStats();
    this.throughputTimer = setInterval(() => {
      const now = Date.now();
      this.throughputSamples = this.throughputSamples.filter((ts) => now - ts < 60000);
      if (this.throughputSamples.length > 0)
        this.stats.peakThroughput = Math.max(this.stats.peakThroughput, this.throughputSamples.length);
    }, 5000);
  }

  // --- Publishing ---

  async publish<T = unknown>(
    topic: Topic,
    payload: T,
    options?: {
      headers?: Record<string, string>; priority?: number; ttl?: number;
      contentType?: string; publisherId?: string; correlationId?: string; replyTo?: Topic;
    },
  ): Promise<{ delivered: number; filtered: number; errors: number }> {
    if (this.destroyed) throw new Error("Bus is destroyed");
    const now = Date.now();
    const message: PubSubMessage<T> = {
      id: generateMessageId(), topic, payload, headers: options?.headers,
      timestamp: now, publisherId: options?.publisherId,
      correlationId: options?.correlationId, replyTo: options?.replyTo,
      priority: options?.priority ?? 0,
      ttl: options?.ttl ?? (this.config.defaultTtl > 0 ? this.config.defaultTtl : undefined),
      retries: 0, maxRetries: this.config.defaultMaxRetries,
      contentType: options?.contentType ?? "application/json",
    };

    if (this.config.persistent && this.config.storageAdapter) {
      try { await this.config.storageAdapter.save(message); } catch (e) { console.error("[PubSubBus] Persist failed:", e); }
    }

    this.stats.totalPublished++;
    this.throughputSamples.push(now);
    this.config.onPublish?.(message);
    return this.deliverMessage(message);
  }

  /**
   * Request-reply pattern: publish and wait for response.
   */
  async request<TReq = unknown, TRes = unknown>(
    topic: Topic, payload: TReq,
    options?: { timeout?: number } & Parameters<PubSubBus["publish"]>[2],
  ): Promise<TRes> {
    const replyTopic = `__reply_${generateMessageId()}`;
    const correlationId = generateMessageId();
    let resolved = false;

    return new Promise<TRes>((resolve, reject) => {
      const timeout = options?.timeout ?? 30000;
      const timer = setTimeout(() => {
        if (!resolved) { resolved = true; this.unsubscribe(tempSubId); reject(new Error(`Request timed out after ${timeout}ms`)); }
      }, timeout);

      const tempSubId = this.subscribe<TRes>(replyTopic, (msg) => {
        if (!resolved) { resolved = true; clearTimeout(timer); this.unsubscribe(tempSubId); resolve(msg.payload); }
      }, { once: true });

      this.publish(topic, payload, { ...options, replyTo: replyTopic, correlationId }).catch(() => {
        if (!resolved) { resolved = true; clearTimeout(timer); this.unsubscribe(tempSubId); reject(new Error("Publish failed")); }
      });
    });
  }

  // --- Subscribing ---

  subscribe<T = unknown>(
    topic: Topic,
    handler: (message: PubSubMessage<T>) => void | Promise<void>,
    options?: {
      filter?: SubscriptionFilter<T>["filter"]; headers?: SubscriptionFilter<T>["headers"];
      rateLimit?: SubscriptionFilter<T>["rateLimit"]; sampleRate?: number;
      once?: boolean; priority?: number;
    },
  ): SubscriberId {
    if (this.destroyed) throw new Error("Bus is destroyed");
    const id = generateSubscriberId();
    const sub: Subscriber<T> = {
      id, topicPattern: topic, handler: handler as Subscriber["handler"],
      filter: options as SubscriptionFilter<T> | undefined,
      once: options?.once ?? false, priority: options?.priority ?? 0,
      createdAt: Date.now(), messageCount: 0, lastHandledAt: 0,
      errorCount: 0, isActive: true,
      unsubscribe: () => this.unsubscribe(id),
    };
    this.subscribers.set(id, sub as Subscriber);
    const key = this.normalizeTopicKey(topic);
    if (!this.topicIndex.has(key)) this.topicIndex.set(key, new Set());
    this.topicIndex.get(key)!.add(id);
    this.updateStats();
    return id;
  }

  once<T = unknown>(
    topic: Topic, handler: (message: PubSubMessage<T>) => void | Promise<void>,
    options?: Omit<Parameters<PubSubBus["subscribe"]>[2], "once">,
  ): SubscriberId { return this.subscribe(topic, handler, { ...options, once: true }); }

  unsubscribe(subscriberId: SubscriberId): boolean {
    const sub = this.subscribers.get(subscriberId);
    if (!sub) return false;
    sub.isActive = false;
    this.subscribers.delete(subscriberId);
    const key = this.normalizeTopicKey(sub.topicPattern);
    const ids = this.topicIndex.get(key);
    if (ids) { ids.delete(subscriberId); if (ids.size === 0) this.topicIndex.delete(key); }
    this.rateLimiter.reset(subscriberId);
    this.updateStats();
    return true;
  }

  unsubscribeTopic(topic: Topic): number {
    const key = this.normalizeTopicKey(topic);
    const ids = this.topicIndex.get(key);
    if (!ids) return 0;
    let count = 0;
    for (const id of ids) { if (this.unsubscribe(id)) count++; }
    return count;
  }

  unsubscribeAll(): number {
    let count = 0;
    for (const id of Array.from(this.subscribers.keys())) { if (this.unsubscribe(id)) count++; }
    return count;
  }

  // --- Query ---

  getTopics(): Topic[] { return Array.from(this.topicIndex.keys()); }
  getSubscriberCount(topic?: Topic): number {
    if (topic) return this.topicIndex.get(this.normalizeTopicKey(topic))?.size ?? 0;
    return this.subscribers.size;
  }
  getSubscribers(topic?: Topic): Subscriber[] {
    if (!topic) return Array.from(this.subscribers.values());
    const ids = this.topicIndex.get(this.normalizeTopicKey(topic));
    if (!ids) return [];
    return Array.from(ids).map((id) => this.subscribers.get(id)!).filter(Boolean);
  }
  getStats(): BusStats { this.updateStats(); return { ...this.stats }; }

  // --- Dead Letter Queue ---

  getDeadLetterQueue(): DeadLetterEntry[] { return [...this.deadLetterQueue]; }

  async retryDeadLetter(index: number): Promise<boolean> {
    const entry = this.deadLetterQueue[index];
    if (!entry) return false;
    this.deadLetterQueue.splice(index, 1);
    entry.message.retries = 0;
    this.stats.totalRetried++;
    this.deliverMessage(entry.message).then(() => true);
    return true;
  }

  async retryAllDeadLetters(): Promise<number> {
    const entries = [...this.deadLetterQueue];
    this.deadLetterQueue.length = 0;
    let retried = 0;
    for (const entry of entries) {
      entry.message.retries = 0;
      try { await this.deliverMessage(entry.message); retried++; }
      catch { this.deadLetterQueue.push(entry); }
    }
    this.stats.totalRetried += retried;
    return retried;
  }

  clearDeadLetterQueue(): number { const c = this.deadLetterQueue.length; this.deadLetterQueue.length = 0; return c; }

  // --- Replay ---

  async replay<T = unknown>(subscriberId: SubscriberId, topic?: Topic, since?: number): Promise<number> {
    if (!this.config.storageAdapter) throw new Error("Replay requires a storage adapter");
    const messages = await this.config.storageAdapter.load(topic);
    const sub = this.subscribers.get(subscriberId);
    if (!sub) throw new Error(`Subscriber ${subscriberId} not found`);
    let delivered = 0;
    for (const msg of messages) {
      if (since && msg.timestamp < since) continue;
      if (!matchTopic(sub.topicPattern, msg.topic)) continue;
      try { await (sub.handler as (m: PubSubMessage<T>) => void | Promise<void>)(msg as PubSubMessage<T>); delivered++; }
      catch {}
    }
    return delivered;
  }

  // --- Lifecycle ---

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.throughputTimer) clearInterval(this.throughputTimer);
    this.unsubscribeAll();
    this.deadLetterQueue.length = 0;
    if (this.config.storageAdapter?.close) await this.config.storageAdapter.close();
  }

  isDestroyed(): boolean { return this.destroyed; }

  // --- Internal: Delivery ---

  private async deliverMessage(message: PubSubMessage): Promise<{ delivered: number; filtered: number; errors: number }> {
    let delivered = 0, filtered = 0, errors = 0;

    if (message.ttl && Date.now() - message.timestamp > message.ttl) { this.deadLetter(message, "expired"); return { delivered: 0, filtered: 0, errors: 0 }; }

    if (this.config.globalRateLimit !== Infinity) {
      if (!this.globalRateState || Date.now() >= this.globalRateState.resetAt)
        this.globalRateState = { count: 0, resetAt: Date.now() + 1000 };
      if (this.globalRateState.count >= this.config.globalRateLimit) return { delivered: 0, filtered: 1, errors: 0 };
      this.globalRateState.count++;
    }

    const matchingSubscribers = this.findMatchingSubscribers(message.topic);
    matchingSubscribers.sort((a, b) => b.priority - a.priority);

    for (const sub of matchingSubscribers) {
      if (!sub.isActive) continue;
      if (this.activeHandlers >= this.config.maxConcurrency) continue;
      if (!this.passesFilters(message, sub)) { filtered++; continue; }
      if (sub.filter?.sampleRate !== undefined && Math.random() > sub.filter.sampleRate) { filtered++; continue; }

      this.activeHandlers++;
      const start = performance.now();
      try {
        await sub.handler(message);
        delivered++; sub.messageCount++; sub.lastHandledAt = Date.now();
        this.stats.totalDelivered++;
        this.config.onDeliver?.(message, sub);
        if (sub.once) this.unsubscribe(sub.id);
      } catch (err) {
        errors++; sub.errorCount++; this.stats.totalErrors++;
        let action: "retry" | "dead-letter" | "drop" = "dead-letter";
        if (this.config.errorHandler) {
          const hr = this.config.errorHandler(err as Error, message, sub);
          if (hr) action = hr;
        }
        if (action === "retry" && message.retries < message.maxRetries) {
          message.retries++; this.stats.totalRetried++;
          setTimeout(() => this.deliverMessage(message), 100 * message.retries);
        } else if (action === "dead-letter") this.deadLetter(message, "handler-error", err as Error, sub.id);
      } finally {
        this.activeHandlers--;
        const elapsed = performance.now() - start;
        this.stats.averageDeliveryTime =
          (this.stats.averageDeliveryTime * (this.stats.totalDelivered - 1) + elapsed) / this.stats.totalDelivered;
      }
    }
    return { delivered, filtered, errors };
  }

  // --- Internal: Matching ---

  private findMatchingSubscribers(topic: Topic): Subscriber[] {
    const results: Subscriber[] = [];
    const seen = new Set<SubscriberId>();

    const exactIds = this.topicIndex.get(this.normalizeTopicKey(topic));
    if (exactIds) {
      for (const id of exactIds) {
        const sub = this.subscribers.get(id);
        if (sub && !seen.has(id)) { seen.add(id); results.push(sub); }
      }
    }

    if (this.config.enableWildcards) {
      for (const [pattern, ids] of this.topicIndex) {
        if (seen.has(pattern)) continue;
        if (pattern.includes("*") || pattern.includes("#")) {
          if (matchTopic(pattern, topic)) {
            for (const id of ids) {
              const sub = this.subscribers.get(id);
              if (sub && !seen.has(id)) { seen.add(id); results.push(sub); }
            }
          }
        }
      }
    }
    return results;
  }

  private passesFilters(message: PubSubMessage, sub: Subscriber): boolean {
    const f = sub.filter;
    if (!f) return true;
    if (f.filter && !f.filter(message)) return false;
    if (f.headers && message.headers) {
      for (const [k, v] of Object.entries(f.headers)) if (message.headers[k] !== v) return false;
    }
    if (f.rateLimit && !this.rateLimiter.check(sub.id, f.rateLimit.maxMessages, f.rateLimit.windowMs)) return false;
    return true;
  }

  // --- Internal: Dead Letter ---

  private deadLetter(message: PubSubMessage, reason: DeadLetterEntry["reason"], error?: Error, subscriberId?: SubscriberId): void {
    if (this.deadLetterQueue.length >= this.config.maxDeadLetterSize) this.deadLetterQueue.shift();
    this.deadLetterQueue.push({ message, reason, error, timestamp: Date.now(), originalTopic: message.topic, subscriberId });
    this.stats.totalDeadLettered++;
  }

  // --- Internal: Utilities ---

  private normalizeTopicKey(t: Topic): Topic { return t.toLowerCase(); }

  private updateStats(): void {
    this.stats.activeSubscribers = this.subscribers.size;
    this.stats.activeTopics = this.topicIndex.size;
    this.stats.deadLetterQueueSize = this.deadLetterQueue.length;
    this.stats.uptime = Date.now() - this.startTime;
  }

  private createEmptyStats(): BusStats {
    return {
      totalPublished: 0, totalDelivered: 0, totalFiltered: 0, totalErrors: 0,
      totalDeadLettered: 0, totalRetried: 0, activeSubscribers: 0, activeTopics: 0,
      deadLetterQueueSize: 0, averageDeliveryTime: 0, peakThroughput: 0, uptime: 0,
    };
  }
}

// --- In-Memory Storage Adapter ---

export class MemoryBusStorage implements BusStorageAdapter {
  private store = new Map<MessageId, PubSubMessage>();
  private topicIndex = new Map<Topic, Set<MessageId>>();

  async save(message: PubSubMessage): Promise<void> {
    this.store.set(message.id, message);
    if (!this.topicIndex.has(message.topic)) this.topicIndex.set(message.topic, new Set());
    this.topicIndex.get(message.topic)!.add(message.id);
  }

  async load(topic?: Topic): Promise<PubSubMessage[]> {
    if (topic) {
      const ids = this.topicIndex.get(topic);
      return ids ? Array.from(ids).map((id) => this.store.get(id)!).filter(Boolean) : [];
    }
    return Array.from(this.store.values());
  }

  async remove(messageId: MessageId): Promise<void> {
    const msg = this.store.get(messageId);
    if (msg) {
      this.store.delete(messageId);
      const ids = this.topicIndex.get(msg.topic);
      if (ids) { ids.delete(messageId); if (ids.size === 0) this.topicIndex.delete(msg.topic); }
    }
  }

  async clear(topic?: Topic): Promise<void> {
    if (topic) {
      const ids = this.topicIndex.get(topic);
      if (ids) { for (const id of ids) this.store.delete(id); this.topicIndex.delete(topic); }
    } else { this.store.clear(); this.topicIndex.clear(); }
  }

  async close(): Promise<void> { this.store.clear(); this.topicIndex.clear(); }
}

// --- Factory ---

export function createPubSubBus(config?: BusConfig): PubSubBus {
  return new PubSubBus(config);
}
