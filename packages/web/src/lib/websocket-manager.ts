/**
 * WebSocket Manager: Robust WebSocket wrapper with auto-reconnect, heartbeat,
 * message queue, binary support, multiplexing (channels), backoff strategy,
 * connection state machine, and subscription management.
 */

// --- Types ---

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected"
  | "reconnecting"
  | "error";

export type MessageType = "text" | "binary" | "json";

export interface WsMessage {
  id: string;
  type: MessageType;
  data: unknown;
  channel?: string;
  timestamp: number;
  /** For request-response patterns */
  correlationId?: string;
}

export interface WsConfig {
  /** WebSocket URL */
  url: string;
  /** Protocols to use */
  protocols?: string[];
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelayMs?: number;
  /** Max reconnect delay in ms (default: 30000) */
  maxReconnectDelayMs?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Heartbeat/ping interval in ms (default: 30000) */
  heartbeatIntervalMs?: number;
  /** Heartbeat timeout — disconnect if no pong within this time (default: 10000) */
  heartbeatTimeoutMs?: number;
  /** Message queue size while disconnected (default: 500) */
  maxQueueSize?: number;
  /** Connection timeout in ms (default: 10000) */
  connectTimeoutMs?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom headers or extra options for the connection */
  headers?: Record<string, string>;
  /** Binary type for received data (default: "arraybuffer") */
  binaryType?: BinaryType;
  /** Serializer for outgoing messages */
  serializer?: (data: unknown) => string | ArrayBuffer;
  /** Deserializer for incoming messages */
  deserializer?: (data: string | ArrayBuffer) => unknown;
  /** Called when connection state changes */
  onStateChange?: (state: ConnectionState, prevState: ConnectionState) => void;
  /** Called on each incoming message */
  onMessage?: (message: WsMessage) => void;
  /** Called on error */
  onError?: (error: Event) => void;
}

export interface ChannelSubscription {
  id: string;
  channel: string;
  callback: (message: WsMessage) => void;
  filter?: (message: WsMessage) => boolean;
  createdAt: number;
}

export interface PendingRequest {
  id: string;
  resolve: (response: WsMessage) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  timestamp: number;
}

export interface WsStats {
  state: ConnectionState;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  reconnectCount: number;
  lastMessageAt: number | null;
  connectedAt: number | null;
  uptimeMs: number | null;
  queuedMessages: number;
  activeChannels: number;
  pendingRequests: number;
}

// --- State Machine ---

class ConnectionFSM {
  private state: ConnectionState = "disconnected";
  private listeners = new Set<(state: ConnectionState, prev: ConnectionState) => void>();

  get currentState(): ConnectionState { return this.state; }

  transition(to: ConnectionState): boolean {
    const validTransitions: Record<ConnectionState, ConnectionState[]> = {
      disconnected: ["connecting", "reconnecting"],
      connecting: ["connected", "error", "disconnected", "disconnecting"],
      connected: ["disconnecting", "error", "reconnecting"],
      disconnecting: ["disconnected", "error"],
      reconnecting: ["connected", "error", "disconnected", "reconnecting"],
      error: ["reconnecting", "disconnected", "connecting"],
    };

    const allowed = validTransitions[this.state];
    if (!allowed?.includes(to)) {
      console.warn(`[WS] Invalid transition: ${this.state} -> ${to}`);
      return false;
    }

    const prev = this.state;
    this.state = to;
    for (const l of this.listeners) l(to, prev);
    return true;
  }

  onChange(listener: (state: ConnectionState, prev: ConnectionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

// --- WebSocket Manager ---

export class WebSocketManager {
  private config: Required<WsConfig>;
  private ws: WebSocket | null = null;
  private fsm: ConnectionFSM;
  private reconnectAttempts = 0;
  private currentDelay = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: Array<{ data: unknown; channel?: string }> = [];
  private channels = new Map<string, Set<ChannelSubscription>>();
  private pendingRequests = new Map<string, PendingRequest>();
  private stats: WsStats;
  private requestIdCounter = 0;

  constructor(config: WsConfig) {
    this.config = {
      url: config.url,
      protocols: config.protocols ?? [],
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectDelayMs: config.reconnectDelayMs ?? 1000,
      maxReconnectDelayMs: config.maxReconnectDelayMs ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
      heartbeatIntervalMs: config.heartbeatIntervalMs ?? 30_000,
      heartbeatTimeoutMs: config.heartbeatTimeoutMs ?? 10_000,
      maxQueueSize: config.maxQueueSize ?? 500,
      connectTimeoutMs: config.connectTimeoutMs ?? 10_000,
      debug: config.debug ?? false,
      binaryType: config.binaryType ?? "arraybuffer",
      serializer: config.serializer ?? ((d) => JSON.stringify(d)),
      deserializer: config.deserializer ?? ((d) => {
        if (typeof d === "string") { try { return JSON.parse(d); } catch { return d; } }
        return d;
      }),
      onStateChange: config.onStateChange ?? (() => {}),
      onMessage: config.onMessage ?? (() => {}),
      onError: config.onError ?? (() => {}),
      headers: config.headers ?? {},
    };

    this.fsm = new ConnectionFSM();
    this.fsm.onChange((s, p) => {
      this.config.onStateChange(s, p);
      if (s === "connected") {
        this.stats.connectedAt = Date.now();
        this.flushQueue();
      } else if (s === "disconnected" || s === "error") {
        this.stats.connectedAt = null;
        this.stats.uptimeMs = null;
      }
    });

    this.stats = {
      state: "disconnected",
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      reconnectCount: 0,
      lastMessageAt: null,
      connectedAt: null,
      uptimeMs: null,
      queuedMessages: 0,
      activeChannels: 0,
      pendingRequests: 0,
    };
  }

  // --- Connection Management ---

  /** Open a WebSocket connection */
  connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.fsm.transition("connecting");

      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols.length > 0 ? undefined : undefined);
        // Note: WebSocket constructor doesn't support custom headers directly
        // Headers would need to be passed via URL params or subprotocol
      } catch (e) {
        this.fsm.transition("error");
        reject(e);
        return;
      }

      if (this.ws) {
        this.ws.binaryType = this.config.binaryType;
      }

      // Connection timeout
      this.connectTimeoutTimer = setTimeout(() => {
        this.log("Connection timeout");
        this.closeInternal();
        this.fsm.transition("error");
        reject(new Error("WebSocket connection timeout"));
      }, this.config.connectTimeoutMs);

      this.ws!.onopen = () => {
        clearTimeout(this.connectTimeoutTimer!);
        this.reconnectAttempts = 0;
        this.currentDelay = this.config.reconnectDelayMs;
        this.fsm.transition("connected");
        this.stats.state = "connected";
        this.startHeartbeat();
        resolve();
      };

      this.ws!.onmessage = (event) => this.handleMessage(event);

      this.ws!.onclose = (event) => {
        clearTimeout(this.connectTimeoutTimer!);
        this.stopHeartbeat();
        this.handleDisconnect(event.code, event.reason);
      };

      this.ws!.onerror = (event) => {
        this.config.onError(event);
        this.stats.state = "error";
      };
    });
  }

  /** Close the connection gracefully */
  disconnect(code = 1000, reason = "Client disconnect"): void {
    this.config.autoReconnect = false; // Prevent reconnection
    this.fsm.transition("disconnecting");
    this.closeInternal(code, reason);
    this.fsm.transition("disconnected");
    this.rejectAllPending(new Error("Disconnected"));
  }

  private closeInternal(code = 1000, reason = ""): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null; // Prevent handleDisconnect from firing again
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(code, reason);
      }
      this.ws = null;
    }
  }

  private handleDisconnect(_code: number, _reason: string): void {
    const wasConnected = this.fsm.currentState === "connected";

    if (wasConnected) {
      this.fsm.transition("error"); // Briefly go through error state
    }

    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      this.fsm.transition("disconnected");
      this.stats.state = "disconnected";
    }
  }

  private scheduleReconnect(): void {
    this.fsm.transition("reconnecting");
    this.reconnectAttempts++;
    this.stats.reconnectCount = this.reconnectAttempts;

    // Exponential backoff with jitter
    const baseDelay = Math.min(
      this.currentDelay,
      this.config.maxReconnectDelayMs,
    );
    const jitter = baseDelay * (0.5 + Math.random() * 0.5);
    const delay = Math.round(jitter);

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    setTimeout(() => {
      this.currentDelay = Math.min(
        this.currentDelay * this.config.backoffMultiplier,
        this.config.maxReconnectDelayMs,
      );
      void this.connect().catch(() => {
        // Will be handled by onerror/onclose
      });
    }, delay);
  }

  // --- Messaging ---

  /** Send a message (queues if disconnected) */
  send(data: unknown, options?: { channel?: string; priority?: boolean }): boolean {
    const payload = this.buildPayload(data, options?.channel);

    if (this.isConnected()) {
      return this.doSend(payload);
    }

    // Queue for later delivery
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      if (options?.priority) {
        // Insert at front for priority messages
        this.messageQueue.unshift({ data, channel: options?.channel });
        this.messageQueue.pop(); // Remove oldest non-priority
      } else {
        this.log("Message queue full, dropping message");
        return false;
      }
    } else {
      this.messageQueue.push({ data, channel: options?.channel });
    }
    this.stats.queuedMessages = this.messageQueue.length;
    return true;
  }

  /** Send and wait for a response (request-response pattern) */
  async request<T = unknown>(
    data: unknown,
    timeoutMs = 30000,
    options?: { channel?: string },
  ): Promise<WsMessage & { data: T }> {
    const correlationId = `req-${++this.requestIdCounter}-${Date.now()}`;

    const enrichedData = typeof data === "object" && data !== null
      ? { ...(data as Record<string, unknown>), _correlationId: correlationId }
      : data;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(correlationId, {
        id: correlationId,
        resolve: resolve as (r: WsMessage) => void,
        reject,
        timeout: timer,
        timestamp: Date.now(),
      });

      const sent = this.send(enrichedData, options);
      if (!sent) {
        clearTimeout(timer);
        this.pendingRequests.delete(correlationId);
        reject(new Error("Failed to send request"));
      }
    }) as Promise<WsMessage & { data: T }>;
  }

  /** Send raw string/binary data */
  sendRaw(data: string | ArrayBuffer | Blob): boolean {
    if (!this.isConnected()) return false;
    try {
      this.ws!.send(data);
      const size = typeof data === "string" ? data.length : (data as ArrayBuffer).byteLength ?? 0;
      this.stats.messagesSent++;
      this.stats.bytesSent += size;
      return true;
    } catch {
      return false;
    }
  }

  private doSend(payload: string | ArrayBuffer): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    try {
      this.ws.send(payload);
      const size = typeof payload === "string" ? payload.length : (payload as ArrayBuffer).byteLength ?? 0;
      this.stats.messagesSent++;
      this.stats.bytesSent += size;
      this.stats.lastMessageAt = Date.now();
      return true;
    } catch (e) {
      this.config.onError(e as Event);
      return false;
    }
  }

  private buildPayload(data: unknown, channel?: string): string | ArrayBuffer {
    const envelope = { data, channel, timestamp: Date.now(), id: crypto.randomUUID() };
    const serialized = this.config.serializer(envelope);
    return serialized;
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const item = this.messageQueue.shift()!;
      const payload = this.buildPayload(item.data, item.channel);
      this.doSend(payload);
    }
    this.stats.queuedMessages = 0;
  }

  // --- Channels / Subscriptions ---

  /** Subscribe to a named channel */
  subscribe(channel: string, callback: (msg: WsMessage) => void, filter?: (msg: WsMessage) => boolean): () => void {
    const sub: ChannelSubscription = {
      id: crypto.randomUUID(),
      channel,
      callback,
      filter,
      createdAt: Date.now(),
    };

    let subs = this.channels.get(channel);
    if (!subs) {
      subs = new Set();
      this.channels.set(channel, subs);
    }
    subs.add(sub);
    this.stats.activeChannels = this.channels.size;

    // Return unsubscribe function
    return () => {
      subs!.delete(sub);
      if (subs!.size === 0) this.channels.delete(channel);
      this.stats.activeChannels = this.channels.size;
    };
  }

  /** Unsubscribe all listeners from a channel */
  unsubscribeChannel(channel: string): void {
    this.channels.delete(channel);
    this.stats.activeChannels = this.channels.size;
  }

  /** Get list of active channels */
  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  // --- Heartbeat ---

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.doSend(JSON.stringify({ type: "_ping", timestamp: Date.now() }));

        // Timeout waiting for pong
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.log("Heartbeat timeout — closing connection");
          this.closeInternal(4001, "Heartbeat timeout");
          this.handleDisconnect(4001, "Heartbeat timeout");
        }, this.config.heartbeatTimeoutMs);
      }
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // --- Message Handling ---

  private handleMessage(event: MessageEvent): void {
    // Handle pong
    if (typeof event.data === "string") {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "_pong") {
          if (this.heartbeatTimeoutTimer) {
            clearTimeout(this.heartbeatTimeoutTimer);
            this.heartbeatTimeoutTimer = null;
          }
          return;
        }
      } catch {
        // Not JSON, continue processing
      }
    }

    const size = typeof event.data === "string"
      ? event.data.length
      : (event.data as ArrayBuffer).byteLength ?? 0;

    this.stats.messagesReceived++;
    this.stats.bytesReceived += size;
    this.stats.lastMessageAt = Date.now();

    let deserialized: unknown;
    try {
      deserialized = this.config.deserializer(event.data);
    } catch {
      deserialized = event.data;
    }

    const message: WsMessage = {
      id: crypto.randomUUID(),
      type: typeof event.data === "string" ? "text" : "binary",
      data: deserialized,
      timestamp: Date.now(),
    };

    // Extract channel and correlation ID if present
    if (typeof deserialized === "object" && deserialized !== null) {
      const obj = deserialized as Record<string, unknown>;
      message.channel = obj.channel as string | undefined;
      message.correlationId = obj._correlationId as string | undefined;
    }

    // Handle request-response
    if (message.correlationId) {
      const pending = this.pendingRequests.get(message.correlationId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.correlationId);
        pending.resolve(message);
        this.stats.pendingRequests = this.pendingRequests.size;
      }
    }

    // Dispatch to channel subscribers
    if (message.channel) {
      const subs = this.channels.get(message.channel);
      if (subs) {
        for (const sub of subs) {
          if (!sub.filter || sub.filter(message)) {
            sub.callback(message);
          }
        }
      }
    }

    // Global handler
    this.config.onMessage(message);
  }

  // --- Query ---

  /** Check if currently connected */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Get current connection state */
  getState(): ConnectionState {
    return this.fsm.currentState;
  }

  /** Get statistics */
  getStats(): WsStats {
    this.stats.state = this.fsm.currentState;
    this.stats.uptimeMs = this.stats.connectedAt ? Date.now() - this.stats.connectedAt : null;
    this.stats.queuedMessages = this.messageQueue.length;
    this.stats.pendingRequests = this.pendingRequests.size;
    return { ...this.stats };
  }

  // --- Internal ---

  private log(msg: string): void {
    if (this.config.debug) {
      console.log(`[WS] ${new Date().toISOString()} ${msg}`);
    }
  }

  private rejectAllPending(error: Error): void {
    for (const [id, req] of this.pendingRequests) {
      clearTimeout(req.timeout);
      req.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  /** Force immediate reconnection */
  async reconnect(): Promise<void> {
    this.closeInternal();
    this.reconnectAttempts = 0;
    this.currentDelay = this.config.reconnectDelayMs;
    await this.connect();
  }

  /** Destroy the manager completely */
  destroy(): void {
    this.disconnect();
    this.channels.clear();
    this.messageQueue = [];
    this.rejectAllPending(new Error("Destroyed"));
  }
}
