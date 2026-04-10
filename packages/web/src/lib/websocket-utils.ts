/**
 * @module websocket-utils
 * @description Comprehensive WebSocket utility library for real-time applications.
 *
 * Provides:
 * - WebSocket Manager with auto-reconnect, exponential backoff, heartbeat, message queue
 * - Typed Message Protocol with generic type safety
 * - Room/Channel Management with subscribe/unsubscribe and broadcast patterns
 * - Presence System for tracking online users, join/leave events, user state
 * - Rate Limiting for outgoing messages per connection
 * - Message Acknowledgment with correlation IDs and timeouts
 * - Reconnection Strategy with configurable backoff and quality detection
 * - Typed Event Emitter for WS lifecycle events
 * - Binary Message Support (ArrayBuffer, Blob)
 * - Connection Pool for managing multiple endpoints
 * - Statistics tracking (messages, latency, reconnections)
 * - Graceful Shutdown with pending message flush
 *
 * Pure TypeScript -- no React or framework dependencies. Uses native WebSocket API.
 */

// ---------------------------------------------------------------------------
// 1. Core Types & Interfaces
// ---------------------------------------------------------------------------

/** All possible states of a WebSocket connection */
export type WSConnectionState =
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected'
  | 'reconnecting';

/** Severity levels for logging / diagnostics */
export type WSLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

/** Supported binary data types for transmission */
export type WSBinaryData = ArrayBuffer | Blob;

/** A unique identifier for correlating request-response pairs */
export type CorrelationId = string;

// ---------------------------------------------------------------------------
// 1a. Configuration Interfaces
// ---------------------------------------------------------------------------

/**
 * Options used to construct a {@link WebSocketManager} instance.
 */
export interface WebSocketManagerOptions {
  /** URL of the WebSocket server endpoint (required) */
  url: string;
  /** Protocols to pass to the WebSocket constructor (optional) */
  protocols?: string | string[];
  /** Whether to attempt automatic reconnection on unexpected close (default: true) */
  autoReconnect?: boolean;
  /** Maximum number of reconnection attempts before giving up (default: 10) */
  maxRetries?: number;
  /** Initial delay in ms before first reconnect attempt (default: 1000) */
  initialBackoffMs?: number;
  /** Maximum backoff cap in ms (default: 30_000) */
  maxBackoffMs?: number;
  /** Multiplier applied to backoff on each retry (default: 2) */
  backoffFactor?: number;
  /** Jitter factor (0-1) added to prevent thundering herd (default: 0.2) */
  jitterFactor?: number;
  /** Enable heartbeat/ping-pong keep-alive (default: true) */
  enableHeartbeat?: boolean;
  /** Interval in ms between heartbeat pings (default: 30_000) */
  heartbeatIntervalMs?: number;
  /** Timeout in ms waiting for a pong before treating connection as dead (default: 10_000) */
  pongTimeoutMs?: number;
  /** Custom payload sent as ping (default: JSON {type:"ping",ts}) */
  pingPayload?: () => unknown;
  /** Queue outgoing messages while disconnected (default: true) */
  queueWhileDisconnected?: boolean;
  /** Max queued messages before oldest are dropped (default: 500) */
  maxQueueSize?: number;
  /** Log level for internal diagnostics (default: "warn") */
  logLevel?: WSLogLevel;
  /** Custom logger function; receives (level, ...args) */
  logger?: (level: WSLogLevel, ...args: unknown[]) => void;
  /** Headers or extra options passed when constructing the WS (browser-dependent) */
  connectOptions?: Record<string, unknown>;
}

/**
 * Options for the {@link RateLimiter}.
 */
export interface RateLimiterOptions {
  /** Maximum number of messages allowed in the window (default: 100) */
  maxMessages?: number;
  /** Window duration in ms (default: 1_000) */
  windowMs?: number;
  /** Strategy when limit is reached: "drop" | "queue" | "throw" (default: "drop") */
  overflowStrategy?: 'drop' | 'queue' | 'throw';
}

/**
 * Options for an individual acknowledgment-wrapped send.
 */
export interface AckOptions<T = unknown> {
  /** Timeout in ms before the promise rejects (default: 10_000) */
  timeoutMs?: number;
  /** Optional custom correlation ID (auto-generated if omitted) */
  correlationId?: CorrelationId;
  /** Callback invoked when ack is received */
  onAck?: (response: T) => void;
  /** Callback invoked on timeout */
  onTimeout?: () => void;
}

/**
 * Options for subscribing to a room/channel.
 */
export interface RoomSubscriptionOptions {
  /** Data to include with the subscribe message (e.g. auth token) */
  data?: Record<string, unknown>;
  /** Whether to receive history upon joining (default: false) */
  fetchHistory?: boolean;
  /** Number of historical messages to request */
  historyLimit?: number;
}

/**
 * User state tracked by the presence system.
 */
export interface PresenceUser {
  /** Unique user identifier */
  userId: string;
  /** Display name */
  displayName?: string;
  /** Arbitrary user metadata */
  meta?: Record<string, unknown>;
  /** ISO timestamp of last activity */
  lastSeen: string;
  /** Current online status */
  status: 'online' | 'away' | 'busy' | 'offline';
}

/**
 * Presence event emitted when users join/leave/update.
 */
export interface PresenceEvent {
  /** Event type */
  type: 'join' | 'leave' | 'update' | 'state';
  /** Affected room (or "*" for global) */
  room: string;
  /** User that triggered the event */
  user: PresenceUser;
  /** Timestamp of the event */
  timestamp: string;
}

/**
 * Snapshot of all users currently present in a room.
 */
export interface PresenceSnapshot {
  room: string;
  users: PresenceUser[];
  count: number;
  timestamp: string;
}

/**
 * Runtime statistics collected by the manager.
 */
export interface WSStatistics {
  /** Total messages sent (including queued retries) */
  messagesSent: number;
  /** Total messages received */
  messagesReceived: number;
  /** Total bytes sent (approximate for text) */
  bytesSent: number;
  /** Total bytes received */
  bytesReceived: number;
  /** Number of successful reconnections */
  reconnectionCount: number;
  /** Number of failed reconnection attempts */
  reconnectionFailures: number;
  /** Current connection latency in ms (from most recent pong round-trip) */
  currentLatencyMs: number | null;
  /** Rolling average latency over last N measurements */
  averageLatencyMs: number;
  /** Number of pings sent without reply (connection health indicator) */
  missedHeartbeats: number;
  /** Timestamp of the last successful connection */
  lastConnectedAt: string | null;
  /** Timestamp of the last disconnection */
  lastDisconnectedAt: string | null;
  /** Total uptime in ms since first connect */
  totalUptimeMs: number;
  /** Current size of the outbound queue */
  queueSize: number;
  /** Number of messages dropped due to queue overflow */
  messagesDropped: number;
}

/**
 * Quality-of-connection assessment.
 */
export interface ConnectionQuality {
  /** Qualitative label */
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'degraded';
  /** Numeric score 0-100 */
  score: number;
  /** Latency component of score */
  latencyScore: number;
  /** Stability component (reconnects / time) */
  stabilityScore: number;
}

/**
 * Result of a graceful shutdown.
 */
export interface ShutdownResult {
  /** Whether shutdown completed within the deadline */
  success: boolean;
  /** Messages flushed before close */
  messagesFlushed: number;
  /** Messages still pending (could not be sent) */
  messagesRemaining: number;
  /** Elapsed time in ms */
  elapsedMs: number;
}

// ---------------------------------------------------------------------------
// 1b. Typed Message Protocol Types
// ---------------------------------------------------------------------------

/**
 * Envelope for every message sent/received through the typed protocol.
 * @typeparam T - Discriminant union member type for the `type` field.
 * @typeparam P - Payload shape associated with each message type.
 */
export interface WSEnvelope<T extends string = string, P = unknown> {
  /** Message type discriminator */
  type: T;
  /** Correlation ID for request-response pattern (optional) */
  cid?: CorrelationId;
  /** Target room/channel (optional routing hint) */
  room?: string;
  /** Message payload */
  payload: P;
  /** Server-side timestamp (populated on inbound messages) */
  _ts?: string;
  /** Message ID assigned by sender */
  mid?: string;
}

/**
 * Acknowledgment envelope returned by the server (or peer).
 */
export interface WSAckEnvelope<T = unknown> {
  /** Always "ack" for acknowledgment messages */
  type: 'ack';
  /** Correlation ID matching the original request */
  cid: CorrelationId;
  /** true if the operation succeeded, false otherwise */
  ok: boolean;
  /** Response data */
  data?: T;
  /** Human-readable error message when `ok` is false */
  error?: string;
}

// ---------------------------------------------------------------------------
// 2. Event Emitter (Typed)
// ---------------------------------------------------------------------------

/** Map of event names to their listener signatures for the WS event system */
export interface WSEventMap {
  open: (event: Event) => void;
  close: (event: CloseEvent) => void;
  message: (data: unknown) => void;
  error: (event: Event) => void;
  reconnecting: (attempt: number, delay: number) => void;
  reconnected: (attempt: number) => void;
  reconnectFailed: (error: Error) => void;
  stateChange: (from: WSConnectionState, to: WSConnectionState) => void;
  heartbeatMissed: (count: number) => void;
  heartbeatRecovered: (latencyMs: number) => void;
  rateLimited: (dropped: boolean) => void;
  queueOverflow: (droppedCount: number) => void;
  presence: (event: PresenceEvent) => void;
  binary: (data: WSBinaryData) => void;
  statistics: (stats: WSStatistics) => void;
  qualityChange: (quality: ConnectionQuality) => void;
}

export type WSEventName = keyof WSEventMap;
export type WSEventListener<K extends WSEventName> = WSEventMap[K];

/**
 * Lightweight typed event emitter for WebSocket lifecycle events.
 *
 * Supports `on`, `once`, `off`, `removeAllListeners`, and `emit`.
 */
export class WSEventEmitter<E extends WSEventMap = WSEventMap> {
  private listeners = new Map<string, Set<(...args: any[]) => any>>();

  /**
   * Register a persistent listener for the given event.
   * @param event - Event name
   * @param listener - Callback function
   */
  on<K extends keyof E & string>(event: K, listener: E[K]): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as (...args: any[]) => any);
    return this;
  }

  /**
   * Register a one-time listener that is removed after first invocation.
   * @param event - Event name
   * @param listener - Callback function
   */
  once<K extends keyof E & string>(event: K, listener: E[K]): this {
    const wrapper: any = ((...args: any[]) => {
      this.off(event, wrapper);
      (listener as Function)(...args);
    });
    return this.on(event, wrapper);
  }

  /**
   * Remove a specific listener for the given event.
   * @param event - Event name
   * @param listener - Callback reference to remove
   */
  off<K extends keyof E & string>(event: K, listener: E[K]): this {
    this.listeners.get(event)?.delete(listener as (...args: any[]) => any);
    return this;
  }

  /**
   * Remove all listeners for a specific event, or all events if no argument.
   * @param event - Optional event name
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /**
   * Invoke all registered listeners for the given event.
   * @param event - Event name
   * @param args - Arguments forwarded to listeners
   */
  emit<K extends keyof E & string>(event: K, ...args: any[]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    // Clone to allow mutation during iteration (e.g., once() removing itself)
    for (const fn of new Set(set)) {
      try {
        (fn as Function)(...args);
      } catch (err) {
        // Swallow listener errors so other listeners still fire
      }
    }
  }

  /**
   * Return the number of registered listeners for an event.
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

// ---------------------------------------------------------------------------
// 3. Logger Helper
// ---------------------------------------------------------------------------

function createLogger(
  level: WSLogLevel,
  customLogger?: (level: WSLogLevel, ...args: unknown[]) => void,
): (level: WSLogLevel, ...args: unknown[]) => void {
  const order: WSLogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];
  const minIdx = order.indexOf(level);
  return (lvl: WSLogLevel, ...args: unknown[]) => {
    if (customLogger) {
      customLogger(lvl, ...args);
      return;
    }
    if (order.indexOf(lvl) >= minIdx && lvl !== 'none') {
      const prefix = `[WS] ${lvl.toUpperCase()}`;
      switch (lvl) {
        case 'debug':
        case 'info':
          console.log(prefix, ...args);
          break;
        case 'warn':
          console.warn(prefix, ...args);
          break;
        case 'error':
          console.error(prefix, ...args);
          break;
      }
    }
  };
}

// ---------------------------------------------------------------------------
// 4. Rate Limiter
// ---------------------------------------------------------------------------

/**
 * Token-bucket style rate limiter for outgoing WebSocket messages.
 *
 * Tracks messages sent within a sliding window and applies the configured
 * overflow strategy when the limit is exceeded.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxMessages: number;
  private readonly windowMs: number;
  private readonly strategy: 'drop' | 'queue' | 'throw';

  constructor(options: RateLimiterOptions = {}) {
    this.maxMessages = options.maxMessages ?? 100;
    this.windowMs = options.windowMs ?? 1_000;
    this.strategy = options.overflowStrategy ?? 'drop';
  }

  /**
   * Attempt to record a message send. Returns `true` if allowed.
   * @throws Error if strategy is "throw" and limit exceeded
   */
  trySend(): boolean {
    const now = Date.now();
    // Prune expired entries
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxMessages) {
      switch (this.strategy) {
        case 'throw':
          throw new Error(`Rate limit exceeded: ${this.maxMessages} msgs / ${this.windowMs}ms`);
        case 'queue':
          // Caller should queue; we report not allowed but don't throw
          return false;
        case 'drop':
        default:
          return false;
      }
    }

    this.timestamps.push(now);
    return true;
  }

  /**
   * How many more messages can be sent in the current window.
   */
  get remaining(): number {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxMessages - this.timestamps.length);
  }

  /**
   * Reset the limiter state (e.g., after reconnection).
   */
  reset(): void {
    this.timestamps = [];
  }
}

// ---------------------------------------------------------------------------
// 5. Message Queue (for offline/disconnected buffering)
// ---------------------------------------------------------------------------

interface QueuedMessage {
  data: string | ArrayBuffer | Blob;
  timestamp: number;
  resolve?: (value: void | PromiseLike<void>) => void;
  reject?: (reason?: unknown) => void;
}

/**
 * Bounded FIFO queue for messages that could not be sent while disconnected.
 */
class MessageQueue {
  private items: QueuedMessage[] = [];
  private readonly maxSize: number;
  private droppedCount = 0;

  constructor(maxSize: number = 500) {
    this.maxSize = maxSize;
  }

  enqueue(data: string | ArrayBuffer | Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.items.length >= this.maxSize) {
        // Drop oldest
        const removed = this.items.shift();
        if (removed?.reject) {
          removed.reject(new Error('Queue overflow: message dropped'));
        }
        this.droppedCount++;
      }
      this.items.push({ data, timestamp: Date.now(), resolve, reject });
    });
  }

  dequeueAll(): QueuedMessage[] {
    const batch = [...this.items];
    this.items = [];
    return batch;
  }

  get size(): number {
    return this.items.length;
  }

  get totalDropped(): number {
    return this.droppedCount;
  }

  clear(): void {
    // Reject all pending promises
    for (const item of this.items) {
      item.reject?.(new Error('Queue cleared'));
    }
    this.items = [];
  }
}

// ---------------------------------------------------------------------------
// 6. Acknowledgment Tracker (request-response via correlation IDs)
// ---------------------------------------------------------------------------

interface PendingAck<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
  timeoutMs: number;
  onAck?: (response: T) => void;
  onTimeout?: () => void;
}

/**
 * Manages in-flight acknowledgment requests keyed by correlation ID.
 */
class AckTracker<T = unknown> {
  private pending = new Map<CorrelationId, PendingAck<T>>();
  private counter = 0;

  generateCorrelationId(): CorrelationId {
    this.counter++;
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${this.counter}`;
  }

  register(options: AckOptions<T> = {}): CorrelationId {
    const cid = options.correlationId ?? this.generateCorrelationId();
    const timeoutMs = options.timeoutMs ?? 10_000;

    let resolved = false;
    const timer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      this.pending.delete(cid);
      options.onTimeout?.();
      pending.reject(new Error(`Acknowledgment timeout for ${cid} after ${timeoutMs}ms`));
    }, timeoutMs);

    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const pending: PendingAck<T> = {
      resolve(v) { resolve(v); },
      reject(r) { reject(r); },
      timer,
      timeoutMs,
      onAck: options.onAck,
      onTimeout: options.onTimeout,
    };

    // Wrap resolve/reject to clean up map
    pending.resolve = (value: T) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(pending.timer);
      this.pending.delete(cid);
      pending.onAck?.(value);
      resolve(value);
    };
    pending.reject = (reason?: unknown) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(pending.timer);
      this.pending.delete(cid);
      reject(reason);
    };

    this.pending.set(cid, pending);
    return cid;
  }

  receive(ack: WSAckEnvelope<T>): boolean {
    const pending = this.pending.get(ack.cid);
    if (!pending) return false;
    if (ack.ok) {
      pending.resolve(ack.data as T);
    } else {
      pending.reject(new Error(ack.error ?? 'Server returned error ack'));
    }
    return true;
  }

  rejectAll(reason: string = 'Connection closed'): void {
    for (const [cid, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new Error(`${reason}: ${cid}`));
      this.pending.delete(cid);
    }
  }

  get pendingCount(): number {
    return this.pending.size;
  }
}

// ---------------------------------------------------------------------------
// 7. Room / Channel Management
// ---------------------------------------------------------------------------

interface RoomEntry {
  name: string;
  joinedAt: number;
  options: RoomSubscriptionOptions;
}

/**
 * Manages subscriptions to rooms/channels on the WebSocket server.
 *
 * Sends subscribe/unsubscribe messages through the manager's send path
 * and tracks local membership state.
 */
export class RoomManager {
  private rooms = new Map<string, RoomEntry>();
  private sendFn: (data: string | ArrayBuffer | Blob) => Promise<void>;

  constructor(sendFn: (data: string | ArrayBuffer | Blob) => Promise<void>) {
    this.sendFn = sendFn;
  }

  /**
   * Subscribe to a room/channel.
   * @param room - Room identifier
   * @param options - Subscription options
   */
  async join(room: string, options: RoomSubscriptionOptions = {}): Promise<void> {
    if (this.rooms.has(room)) {
      return; // Already joined
    }
    await this.sendFn(JSON.stringify({
      type: 'room:join',
      payload: { room, ...options.data },
      ...(options.fetchHistory ? { historyLimit: options.historyLimit } : {}),
    }));
    this.rooms.set(room, { name: room, joinedAt: Date.now(), options });
  }

  /**
   * Unsubscribe from a room/channel.
   * @param room - Room identifier
   */
  async leave(room: string): Promise<void> {
    if (!this.rooms.has(room)) return;
    await this.sendFn(JSON.stringify({
      type: 'room:leave',
      payload: { room },
    }));
    this.rooms.delete(room);
  }

  /**
   * Leave all currently joined rooms.
   */
  async leaveAll(): Promise<void> {
    const promises = [...this.rooms.keys()].map(r => this.leave(r));
    await Promise.allSettled(promises);
  }

  /**
   * Broadcast a message to a specific room.
   * @param room - Target room
   * @param payload - Message payload
   */
  async broadcast(room: string, payload: unknown): Promise<void> {
    await this.sendFn(JSON.stringify({
      type: 'room:broadcast',
      room,
      payload,
    }));
  }

  /**
   * List of currently joined room names.
   */
  get joinedRooms(): string[] {
    return [...this.rooms.keys()];
  }

  /**
   * Check if currently subscribed to a room.
   */
  isInRoom(room: string): boolean {
    return this.rooms.has(room);
  }

  /**
   * Get details about a specific room subscription.
   */
  getRoomInfo(room: string): RoomEntry | undefined {
    return this.rooms.get(room);
  }
}

// ---------------------------------------------------------------------------
// 8. Presence System
// ---------------------------------------------------------------------------

/**
 * Tracks online users across rooms using join/leave/state events.
 *
 * Listens for presence-typed messages from the server and maintains
 * a local view of who is online.
 */
export class PresenceSystem {
  private usersByRoom = new Map<string, Map<string, PresenceUser>>();
  private globalUsers = new Map<string, PresenceUser>();
  private emitter: WSEventEmitter;

  constructor(emitter: WSEventEmitter) {
    this.emitter = emitter;
  }

  /**
   * Handle an incoming presence event (call from message handler).
   */
  handleEvent(event: PresenceEvent): void {
    const { type, room, user } = event;

    switch (type) {
      case 'join': {
        this.addUser(room, user);
        break;
      }
      case 'leave': {
        this.removeUser(room, user.userId);
        break;
      }
      case 'update':
      case 'state': {
        this.updateUser(room, user);
        break;
      }
    }

    this.emitter.emit('presence', event);
  }

  private addUser(room: string, user: PresenceUser): void {
    // Per-room map
    if (!this.usersByRoom.has(room)) {
      this.usersByRoom.set(room, new Map());
    }
    this.usersByRoom.get(room)!.set(user.userId, user);
    // Global map
    this.globalUsers.set(user.userId, user);
  }

  private removeUser(room: string, userId: string): void {
    this.usersByRoom.get(room)?.delete(userId);
    // Remove from global only if not present in any other room
    let foundElsewhere = false;
    for (const [, users] of this.usersByRoom) {
      if (users.has(userId)) {
        foundElsewhere = true;
        break;
      }
    }
    if (!foundElsewhere) {
      this.globalUsers.delete(userId);
    }
  }

  private updateUser(room: string, user: PresenceUser): void {
    this.usersByRoom.get(room)?.set(user.userId, user);
    this.globalUsers.set(user.userId, user);
  }

  /**
   * Get a snapshot of users in a specific room.
   */
  getPresenceSnapshot(room: string): PresenceSnapshot {
    const users = [...(this.usersByRoom.get(room)?.values() ?? [])];
    return {
      room,
      users,
      count: users.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all globally known users.
   */
  getAllUsers(): PresenceUser[] {
    return [...this.globalUsers.values()];
  }

  /**
   * Find a specific user by ID.
   */
  getUser(userId: string): PresenceUser | undefined {
    return this.globalUsers.get(userId);
  }

  /**
   * Get count of online users in a room.
   */
  getUserCount(room: string): number {
    return this.usersByRoom.get(room)?.size ?? 0;
  }

  /**
   * Get total count of distinct online users across all rooms.
   */
  getTotalOnlineCount(): number {
    return this.globalUsers.size;
  }

  /**
   * Clear all presence data (e.g., on disconnect).
   */
  clear(): void {
    this.usersByRoom.clear();
    this.globalUsers.clear();
  }
}

// ---------------------------------------------------------------------------
// 9. Statistics Collector
// ---------------------------------------------------------------------------

/**
 * Collects runtime statistics about the WebSocket connection.
 */
class StatsCollector {
  private stats: WSStatistics = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    reconnectionCount: 0,
    reconnectionFailures: 0,
    currentLatencyMs: null,
    averageLatencyMs: 0,
    missedHeartbeats: 0,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    totalUptimeMs: 0,
    queueSize: 0,
    messagesDropped: 0,
  };

  private latencySamples: number[] = [];
  private readonly maxLatencySamples = 20;
  private uptimeStart: number | null = null;
  private uptimeAccumulated = 0;

  recordSent(bytes: number): void {
    this.stats.messagesSent++;
    this.stats.bytesSent += bytes;
  }

  recordReceived(bytes: number): void {
    this.stats.messagesReceived++;
    this.stats.bytesReceived += bytes;
  }

  recordConnect(): void {
    this.stats.lastConnectedAt = new Date().toISOString();
    this.uptimeStart = Date.now();
    this.stats.missedHeartbeats = 0;
  }

  recordDisconnect(): void {
    this.stats.lastDisconnectedAt = new Date().toISOString();
    if (this.uptimeStart != null) {
      this.uptimeAccumulated += Date.now() - this.uptimeStart;
      this.uptimeStart = null;
    }
  }

  recordReconnectSuccess(): void {
    this.stats.reconnectionCount++;
  }

  recordReconnectFailure(): void {
    this.stats.reconnectionFailures++;
  }

  recordLatency(ms: number): void {
    this.stats.currentLatencyMs = ms;
    this.latencySamples.push(ms);
    if (this.latencySamples.length > this.maxLatencySamples) {
      this.latencySamples.shift();
    }
    this.stats.averageLatencyMs =
      this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length;
  }

  recordMissedHeartbeat(): void {
    this.stats.missedHeartbeats++;
  }

  resetHeartbeatMisses(): void {
    this.stats.missedHeartbeats = 0;
  }

  updateQueueSize(size: number): void {
    this.stats.queueSize = size;
  }

  recordDropped(count: number): void {
    this.stats.messagesDropped += count;
  }

  get snapshot(): WSStatistics {
    const uptime =
      this.uptimeAccumulated +
      (this.uptimeStart != null ? Date.now() - this.uptimeStart : 0);
    return { ...this.stats, totalUptimeMs: uptime };
  }
}

// ---------------------------------------------------------------------------
// 10. Connection Quality Assessor
// ---------------------------------------------------------------------------

/**
 * Evaluates connection quality based on latency and stability metrics.
 */
class QualityAssessor {
  assess(stats: WSStatistics, uptimeMs: number): ConnectionQuality {
    // Latency score: 100 at 0ms, 0 at 2000ms+
    const lat = stats.currentLatencyMs ?? stats.averageLatencyMs;
    const latencyScore = Math.max(0, Math.min(100, 100 - (lat / 20)));

    // Stability score based on reconnects per hour of uptime
    const hours = Math.max(uptimeMs / 3_600_000, 0.001); // avoid div-by-zero
    const reconnectRate = stats.reconnectionCount / hours;
    const stabilityScore = Math.max(0, Math.min(100, 100 - reconnectRate * 20));

    // Weighted composite
    const score = Math.round(latencyScore * 0.6 + stabilityScore * 0.4);

    let level: ConnectionQuality['level'];
    if (score >= 85) level = 'excellent';
    else if (score >= 65) level = 'good';
    else if (score >= 40) level = 'fair';
    else if (score >= 20) level = 'poor';
    else level = 'degraded';

    return { level, score, latencyScore: Math.round(latencyScore), stabilityScore: Math.round(stabilityScore) };
  }
}

// ---------------------------------------------------------------------------
// 11. Connection Pool
// ---------------------------------------------------------------------------

/**
 * Manages multiple named WebSocket connections to different endpoints.
 *
 * Each entry is a full {@link WebSocketManager} instance identified by a key.
 */
export class ConnectionPool {
  private connections = new Map<string, WebSocketManager>();

  /**
   * Create and register a new managed connection.
   * @param key - Unique identifier for this connection
   * @param options - Manager options (must include url)
   */
  create(key: string, options: WebSocketManagerOptions): WebSocketManager {
    if (this.connections.has(key)) {
      throw new Error(`Connection "${key}" already exists in pool`);
    }
    const mgr = new WebSocketManager(options);
    this.connections.set(key, mgr);
    return mgr;
  }

  /**
   * Get an existing connection by key.
   */
  get(key: string): WebSocketManager | undefined {
    return this.connections.get(key);
  }

  /**
   * Remove and close a connection.
   */
  async remove(key: string, graceful = true): Promise<void> {
    const conn = this.connections.get(key);
    if (!conn) return;
    if (graceful) {
      await conn.gracefulShutdown(3000);
    } else {
      conn.disconnect();
    }
    this.connections.delete(key);
  }

  /**
   * Gracefully shut down all connections in the pool.
   */
  async shutdownAll(timeoutMs = 5000): Promise<ShutdownResult[]> {
    const results = await Promise.all(
      [...this.connections.entries()].map(async ([key, conn]) => {
        const result = await conn.gracefulShutdown(timeoutMs);
        this.connections.delete(key);
        return result;
      }),
    );
    return results;
  }

  /**
   * List all registered connection keys.
   */
  get keys(): string[] {
    return [...this.connections.keys()];
  }

  /**
   * Total number of managed connections.
   */
  get size(): number {
    return this.connections.size;
  }
}

// ---------------------------------------------------------------------------
// 12. WebSocket Manager (Main Class)
// ---------------------------------------------------------------------------

/**
 * Full-featured WebSocket manager with auto-reconnect, heartbeat, typed messaging,
 * room management, presence, rate limiting, acknowledgments, statistics, and
 * graceful shutdown.
 *
 * @example
 * ```ts
 * const ws = new WebSocketManager({ url: 'wss://example.com/ws' });
 * ws.on('open', () => console.log('connected'));
 * ws.connect();
 * ws.send({ type: 'chat', payload: { text: 'hello' } });
 * ```
 */
export class WebSocketManager {
  // -- Public read-only state --
  /** Current connection state */
  public state: WSConnectionState = 'disconnected';

  /** Typed event emitter -- use `.on()` / `.off()` / `.once()` / `.emit()` */
  public readonly events: WSEventEmitter;

  /** Room/channel manager */
  public readonly rooms: RoomManager;

  /** Presence tracker */
  public readonly presence: PresenceSystem;

  /** Outgoing rate limiter */
  public readonly rateLimiter: RateLimiter;

  // -- Internal --
  private socket: WebSocket | null = null;
  private opts: Required<Omit<WebSocketManagerOptions, 'protocols' | 'pingPayload' | 'logger' | 'connectOptions'>> & {
    protocols?: WebSocketManagerOptions['protocols'];
    pingPayload?: WebSocketManagerOptions['pingPayload'];
    logger?: WebSocketManagerOptions['logger'];
    connectOptions?: WebSocketManagerOptions['connectOptions'];
  };

  private log: (level: WSLogLevel, ...args: unknown[]) => void;
  private queue: MessageQueue;
  private ackTracker: AckTracker;
  private stats: StatsCollector;
  private qualityAssessor: QualityAssessor;

  private retryCount = 0;
  private currentBackoff = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPingTime = 0;
  private intentionalClose = false;
  private reconnectScheduled = false;
  private qualityTimer: ReturnType<typeof setInterval> | null = null;
  private previousQualityLevel: ConnectionQuality['level'] | null = null;

  constructor(options: WebSocketManagerOptions) {
    // Normalize options with defaults
    this.opts = {
      url: options.url,
      protocols: options.protocols,
      autoReconnect: options.autoReconnect ?? true,
      maxRetries: options.maxRetries ?? 10,
      initialBackoffMs: options.initialBackoffMs ?? 1_000,
      maxBackoffMs: options.maxBackoffMs ?? 30_000,
      backoffFactor: options.backoffFactor ?? 2,
      jitterFactor: options.jitterFactor ?? 0.2,
      enableHeartbeat: options.enableHeartbeat ?? true,
      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 30_000,
      pongTimeoutMs: options.pongTimeoutMs ?? 10_000,
      pingPayload: options.pingPayload,
      queueWhileDisconnected: options.queueWhileDisconnected ?? true,
      maxQueueSize: options.maxQueueSize ?? 500,
      logLevel: options.logLevel ?? 'warn',
      logger: options.logger,
      connectOptions: options.connectOptions,
    };

    this.log = createLogger(this.opts.logLevel, this.opts.logger);
    this.events = new WSEventEmitter<WSEventMap>();
    this.queue = new MessageQueue(this.opts.maxQueueSize);
    this.ackTracker = new AckTracker();
    this.stats = new StatsCollector();
    this.qualityAssessor = new QualityAssessor();
    this.rateLimiter = new RateLimiter();

    // Room & Presence need access to send
    this.rooms = new RoomManager((data) => this.sendRaw(data));
    this.presence = new PresenceSystem(this.events);

    // Start quality monitoring timer
    this.startQualityMonitor();
  }

  // -----------------------------------------------------------------------
  // Connection Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Open the WebSocket connection. If already connected, does nothing.
   */
  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.log('warn', 'Already connected or connecting');
      return;
    }

    this.intentionalClose = false;
    this.setState('connecting');
    this.retryCount = 0;
    this.currentBackoff = this.opts.initialBackoffMs;

    try {
      this.log('info', `Connecting to ${this.opts.url}`);
      this.socket = new WebSocket(this.opts.url, this.opts.protocols);
      this.bindSocketEvents();
    } catch (err) {
      this.log('error', 'WebSocket construction failed', err);
      this.setState('disconnected');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect immediately without flushing the queue.
   */
  disconnect(code = 1000, reason = 'Client disconnect'): void {
    this.intentionalClose = true;
    this.stopHeartbeat();
    this.cancelReconnect();
    this.ackTracker.rejectAll('Disconnected');
    this.queue.clear();
    if (this.socket) {
      try {
        this.socket.close(code, reason);
      } catch { /* ignore */ }
      this.socket = null;
    }
    this.setState('disconnected');
    this.stats.recordDisconnect();
  }

  /**
   * Gracefully close the connection, attempting to flush queued messages first.
   * @param timeoutMs - Maximum time to wait for flush before force-closing
   */
  async gracefulShutdown(timeoutMs = 5_000): Promise<ShutdownResult> {
    const start = Date.now();
    this.intentionalClose = true;
    this.stopHeartbeat();
    this.cancelReconnect();

    let flushed = 0;
    const remainingBefore = this.queue.size;

    // Flush queue if connected
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const pending = this.queue.dequeueAll();
      this.setState('disconnecting');

      for (const msg of pending) {
        if (Date.now() - start > timeoutMs) break;
        try {
          await this.sendRaw(msg.data);
          msg.resolve?.();
          flushed++;
        } catch {
          msg.reject?.(new Error('Send failed during shutdown'));
        }
      }
    }

    // Close socket
    if (this.socket) {
      try {
        this.socket.close(1000, 'Graceful shutdown');
      } catch { /* ignore */ }
      this.socket = null;
    }

    // Reject remaining acks
    this.ackTracker.rejectAll('Graceful shutdown');

    const remaining = this.queue.size;
    this.queue.clear();
    this.setState('disconnected');
    this.stats.recordDisconnect();
    this.stopQualityMonitor();

    return {
      success: remaining === 0,
      messagesFlushed: flushed,
      messagesRemaining: remaining,
      elapsedMs: Date.now() - start,
    };
  }

  // -----------------------------------------------------------------------
  // Sending Messages
  // -----------------------------------------------------------------------

  /**
   * Send a raw string/binary payload through the WebSocket.
   * Resolves when the underlying `send()` succeeds (best-effort).
   */
  async sendRaw(data: string | ArrayBuffer | Blob): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    // Rate limiting check
    if (!this.rateLimiter.trySend()) {
      this.events.emit('rateLimited', true);
      this.log('warn', 'Message dropped due to rate limiting');
      throw new Error('Rate limited');
    }

    return new Promise<void>((resolve, reject) => {
      try {
        this.socket!.send(data);
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data).byteLength :
                     data instanceof Blob ? data.size : data.byteLength;
        this.stats.recordSent(bytes);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send a typed message envelope.
   * @typeparam T - Message type string literal
   * @typeparam P - Payload type
   */
  async send<T extends string, P = unknown>(envelope: WSEnvelope<T, P>): Promise<void> {
    const serialized = JSON.stringify(envelope);

    if (this.state !== 'connected') {
      if (this.opts.queueWhileDisconnected) {
        await this.queue.enqueue(serialized);
        this.stats.updateQueueSize(this.queue.size);
        return;
      }
      throw new Error(`Cannot send while ${this.state}`);
    }

    await this.sendRaw(serialized);
  }

  /**
   * Send a typed message and wait for an acknowledgment (request-response).
   * @typeparam T - Message type
   * @typeparam P - Payload type
   * @typeparam R - Expected response data type in the ack
   */
  async sendWithAck<T extends string, P = unknown, R = unknown>(
    envelope: WSEnvelope<T, P>,
    ackOptions?: AckOptions<R>,
  ): Promise<R> {
    const cid = this.ackTracker.register(ackOptions as AckOptions<unknown>);
    envelope.cid = cid;

    await this.send(envelope);

    return new Promise<R>((resolve, reject) => {
      // We already registered in ackTracker; hook into its resolution chain
      // by re-registering with explicit resolve/reject capture
      // Actually, ackTracker.register returns a promise-like internally.
      // We'll create a thin wrapper promise here.
      const timeout = ackOptions?.timeoutMs ?? 10_000;
      const timer = setTimeout(() => {
        ackOptions?.onTimeout?.();
        reject(new Error(`Ack timeout for ${cid}`));
      }, timeout);

      // Listen for the matching ack via a one-time handler
      const onMessage = (data: unknown) => {
        if (typeof data === 'string') {
          try {
            const parsed: WSAckEnvelope<R> = JSON.parse(data);
            if (parsed.type === 'ack' && parsed.cid === cid) {
              clearTimeout(timer);
              this.events.off('message', onMessage as WSEventListener<'message'>);
              if (parsed.ok) {
                ackOptions?.onAck?.(parsed.data as R);
                resolve(parsed.data as R);
              } else {
                reject(new Error(parsed.error ?? 'Ack error'));
              }
            }
          } catch { /* not an ack */ }
        }
      };

      this.events.on('message', onMessage as WSEventListener<'message'>);
    });
  }

  /**
   * Send binary data (ArrayBuffer or Blob).
   */
  async sendBinary(data: WSBinaryData): Promise<void> {
    if (this.state !== 'connected') {
      if (this.opts.queueWhileDisconnected) {
        await this.queue.enqueue(data);
        this.stats.updateQueueSize(this.queue.size);
        return;
      }
      throw new Error(`Cannot send while ${this.state}`);
    }
    await this.sendRaw(data);
  }

  // -----------------------------------------------------------------------
  // Reconnection Logic
  // -----------------------------------------------------------------------

  private scheduleReconnect(): void {
    if (!this.opts.autoReconnect || this.intentionalClose || this.reconnectScheduled) return;
    if (this.retryCount >= this.opts.maxRetries) {
      this.log('error', `Max retries (${this.opts.maxRetries}) exhausted`);
      this.events.emit('reconnectFailed', new Error('Max retries exhausted'));
      return;
    }

    this.reconnectScheduled = true;
    this.retryCount++;

    // Calculate backoff with jitter
    const baseDelay = Math.min(
      this.currentBackoff,
      this.opts.maxBackoffMs,
    );
    const jitter = baseDelay * this.opts.jitterFactor * (Math.random() * 2 - 1);
    const delay = Math.max(0, Math.round(baseDelay + jitter));

    this.currentBackoff = Math.min(
      this.currentBackoff * this.opts.backoffFactor,
      this.opts.maxBackoffMs,
    );

    this.log('info', `Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.opts.maxRetries})`);
    this.setState('reconnecting');
    this.events.emit('reconnecting', this.retryCount, delay);

    setTimeout(() => {
      this.reconnectScheduled = false;
      this.performReconnect();
    }, delay);
  }

  private performReconnect(): void {
    if (this.intentionalClose) return;

    this.setState('connecting');
    try {
      this.log('info', `Attempting reconnect #${this.retryCount} to ${this.opts.url}`);
      this.socket = new WebSocket(this.opts.url, this.opts.protocols);
      this.bindSocketEvents();
    } catch (err) {
      this.log('error', 'Reconnect construction failed', err);
      this.stats.recordReconnectFailure();
      this.scheduleReconnect();
    }
  }

  private cancelReconnect(): void {
    this.reconnectScheduled = false;
  }

  // -----------------------------------------------------------------------
  // Heartbeat / Ping-Pong
  // -----------------------------------------------------------------------

  private startHeartbeat(): void {
    this.stopHeartbeat();
    if (!this.opts.enableHeartbeat) return;

    this.heartbeatTimer = setInterval(() => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

      const payload = this.opts.pingPayload
        ? this.opts.pingPayload()
        : { type: 'ping', ts: Date.now() };

      this.lastPingTime = Date.now();
      try {
        this.socket.send(JSON.stringify(payload));
      } catch { /* socket may be closing */ }

      // Set up pong timeout watcher
      this.pongTimer = setTimeout(() => {
        this.stats.recordMissedHeartbeat();
        this.log('warn', `Pong timeout (missed: ${this.stats.snapshot.missedHeartbeats})`);
        this.events.emit('heartbeatMissed', this.stats.snapshot.missedHeartbeats);

        // If too many missed heartbeats, force reconnect
        if (this.stats.snapshot.missedHeartbeats >= 3) {
          this.log('warn', 'Too many missed heartbeats, forcing reconnect');
          try {
            this.socket?.close(4000, 'Heartbeat timeout');
          } catch { /* ignore */ }
        }
      }, this.opts.pongTimeoutMs);
    }, this.opts.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer != null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimer != null) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  private handlePong(): void {
    if (this.pongTimer != null) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
    const latency = Date.now() - this.lastPingTime;
    this.stats.recordLatency(latency);
    this.stats.resetHeartbeatMisses();
    this.log('debug', `Pong received, latency=${latency}ms`);
    this.events.emit('heartbeatRecovered', latency);
  }

  // -----------------------------------------------------------------------
  // Socket Event Binding
  // -----------------------------------------------------------------------

  private bindSocketEvents(): void {
    const ws = this.socket!;
    if (ws == null) return;

    ws.addEventListener('open', (event) => {
      this.log('info', 'WebSocket opened');
      this.setState('connected');
      this.stats.recordConnect();
      this.stats.recordReconnectSuccess();
      this.retryCount = 0;
      this.currentBackoff = this.opts.initialBackoffMs;
      this.rateLimiter.reset();
      this.events.emit('open', event);

      // Flush queued messages
      this.flushQueue();

      // Start heartbeat
      this.startHeartbeat();
    });

    ws.addEventListener('message', (event) => {
      this.handleIncomingMessage(event.data);
    });

    ws.addEventListener('close', (event) => {
      this.log('info', `WebSocket closed: code=${event.code}, reason="${event.reason}"`);
      this.stopHeartbeat();
      this.stats.recordDisconnect();
      this.setState('disconnected');
      this.events.emit('close', event);

      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    });

    ws.addEventListener('error', (event) => {
      this.log('error', 'WebSocket error', event);
      this.events.emit('error', event);
    });
  }

  // -----------------------------------------------------------------------
  // Incoming Message Handling
  // -----------------------------------------------------------------------

  private handleIncomingMessage(data: string | BufferSource | Blob): void {
    // Binary data
    if (data instanceof ArrayBuffer || data instanceof Blob) {
      const bytes = data instanceof Blob ? data.size : data.byteLength;
      this.stats.recordReceived(bytes);
      this.events.emit('binary', data as WSBinaryData);
      return;
    }

    // Text data
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    const bytes = new TextEncoder().encode(text).byteLength;
    this.stats.recordReceived(bytes);

    // Try to parse as JSON envelope
    try {
      const parsed = JSON.parse(text);

      // Handle pong/ack responses
      if (parsed.type === 'pong' || (parsed.type === 'ack' && parsed.cid != null)) {
        if (parsed.type === 'pong') {
          this.handlePong();
        }
        // Route acks through tracker
        if (parsed.type === 'ack') {
          this.ackTracker.receive(parsed as WSAckEnvelope);
        }
        return;
      }

      // Handle presence events
      if (parsed.type?.startsWith('presence:') || parsed.room != null && (parsed.type === 'join' || parsed.type === 'leave' || parsed.type === 'update' || parsed.type === 'state')) {
        this.presence.handleEvent(parsed as PresenceEvent);
      }

      // Emit generic message event
      this.events.emit('message', parsed);
    } catch {
      // Not JSON -- emit raw text
      this.events.emit('message', text);
    }
  }

  // -----------------------------------------------------------------------
  // Queue Flushing
  // -----------------------------------------------------------------------

  private async flushQueue(): Promise<void> {
    if (this.queue.size === 0) return;

    const batch = this.queue.dequeueAll();
    this.log('info', `Flushing ${batch.length} queued messages`);

    for (const msg of batch) {
      try {
        await this.sendRaw(msg.data);
        msg.resolve?.();
      } catch (err) {
        msg.reject?.(err);
        // On send failure, put remaining back? No -- they'd block the pipe.
        // Optionally re-queue:
        // this.queue.enqueue(msg.data);
      }
    }
    this.stats.updateQueueSize(this.queue.size);
  }

  // -----------------------------------------------------------------------
  // State Management
  // -----------------------------------------------------------------------

  private setState(newState: WSConnectionState): void {
    const oldState = this.state;
    if (oldState === newState) return;
    this.state = newState;
    this.log('debug', `State: ${oldState} -> ${newState}`);
    this.events.emit('stateChange', oldState, newState);
  }

  // -----------------------------------------------------------------------
  // Quality Monitoring
  // -----------------------------------------------------------------------

  private startQualityMonitor(): void {
    this.qualityTimer = setInterval(() => {
      const snap = this.stats.snapshot;
      const quality = this.qualityAssessor.assess(snap, snap.totalUptimeMs);

      if (quality.level !== this.previousQualityLevel) {
        this.previousQualityLevel = quality.level;
        this.events.emit('qualityChange', quality);
        this.log('info', `Connection quality: ${quality.level} (score=${quality.score})`);
      }

      this.events.emit('statistics', snap);
    }, 10_000);
  }

  private stopQualityMonitor(): void {
    if (this.qualityTimer != null) {
      clearInterval(this.qualityTimer);
      this.qualityTimer = null;
    }
  }

  // -----------------------------------------------------------------------
  // Public Accessors
  // -----------------------------------------------------------------------

  /**
   * Current runtime statistics snapshot.
   */
  get statistics(): WSStatistics {
    const snap = this.stats.snapshot;
    snap.queueSize = this.queue.size;
    return snap;
  }

  /**
   * Current assessed connection quality.
   */
  get connectionQuality(): ConnectionQuality {
    return this.qualityAssessor.assess(this.statistics, this.statistics.totalUptimeMs);
  }

  /**
   * Whether the underlying WebSocket is currently open.
   */
  get isConnected(): boolean {
    return this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Number of pending acknowledgment requests.
   */
  get pendingAcks(): number {
    return this.ackTracker.pendingCount;
  }

  /**
   * Number of messages currently queued for delivery.
   */
  get queuedMessages(): number {
    return this.queue.size;
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  /**
   * Destroy this manager instance completely, releasing all resources.
   */
  destroy(): void {
    this.stopHeartbeat();
    this.stopQualityMonitor();
    this.cancelReconnect();
    this.intentionalClose = true;
    this.ackTracker.rejectAll('Destroyed');
    this.queue.clear();
    this.events.removeAllListeners();
    this.presence.clear();
    if (this.socket) {
      try { this.socket.close(1001, 'Destroying'); } catch { /* ignore */ }
      this.socket = null;
    }
    this.setState('disconnected');
  }
}

// ---------------------------------------------------------------------------
// 13. Utility Functions
// ---------------------------------------------------------------------------

/**
 * Generate a unique message ID suitable for `WSEnvelope.mid`.
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Build a complete typed envelope ready for sending.
 * @typeparam T - Message type literal
 * @typeparam P - Payload type
 */
export function buildEnvelope<T extends string, P = unknown>(
  type: T,
  payload: P,
  options?: {
    room?: string;
    correlationId?: CorrelationId;
    messageId?: string;
  },
): WSEnvelope<T, P> {
  return {
    type,
    payload,
    mid: options?.messageId ?? generateMessageId(),
    ...(options?.correlationId ? { cid: options.correlationId } : {}),
    ...(options?.room ? { room: options.room } : {}),
  };
}

/**
 * Create an acknowledgment response envelope.
 * @typeparam T - Response data type
 */
export function buildAck<T = unknown>(
  cid: CorrelationId,
  ok: boolean,
  data?: T,
  error?: string,
): WSAckEnvelope<T> {
  return { type: 'ack', cid, ok, data, error };
}

/**
 * Calculate the next backoff delay given current parameters.
 * Useful for custom reconnection strategies outside the manager.
 */
export function calculateBackoff(
  attempt: number,
  initialMs: number,
  maxMs: number,
  factor: number,
  jitterFactor = 0.2,
): number {
  const baseDelay = Math.min(initialMs * Math.pow(factor, attempt), maxMs);
  const jitter = baseDelay * jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(baseDelay + jitter));
}

/**
 * Determine if a CloseEvent indicates a recoverable situation (should reconnect).
 */
export function isRecoverableClose(event: CloseEvent): boolean {
  // Normal closures that are not intentional
  const nonRecoverableCodes = [
    1000, // Normal closure
    1001, // Going away
    1002, // Protocol error
    1003, // Unsupported data
    1007, // Invalid payload
    1008, // Policy violation
    1011, // Internal error
  ];
  return !nonRecoverableCodes.includes(event.code);
}

/**
 * Convenience factory: create a pre-configured manager with sensible defaults.
 */
export function createWebSocket(url: string, partialOptions?: Partial<WebSocketManagerOptions>): WebSocketManager {
  return new WebSocketManager({ url, ...partialOptions });
}

// ---------------------------------------------------------------------------
// 14. Default Exports Summary
// ---------------------------------------------------------------------------

export default {
  WebSocketManager,
  WSEventEmitter,
  RateLimiter,
  RoomManager,
  PresenceSystem,
  ConnectionPool,
  // Utilities
  generateMessageId,
  buildEnvelope,
  buildAck,
  calculateBackoff,
  isRecoverableClose,
  createWebSocket,
};
