/**
 * WebSocket Reconnection Manager: Robust WebSocket connection with automatic
 * reconnection, exponential backoff, heartbeat/ping-pong, connection state
 * tracking, message queuing during disconnection, event-driven architecture,
 * and graceful degradation.
 */

// --- Types ---

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected"
  | "reconnecting"
  | "closed";

export interface ReconnectOptions {
  /** Enable automatic reconnection (default: true) */
  autoReconnect?: boolean;
  /** Maximum number of reconnection attempts (0 = unlimited, default: 10) */
  maxAttempts?: number;
  /** Initial delay before first reconnect attempt in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay between attempts in ms (default: 30000) */
  maxDelay?: number;
  /** Multiplier for delay after each failed attempt (default: 2) */
  backoffFactor?: number;
  /** Jitter to add to delay (0-1, default: 0.2) — randomizes to avoid thundering herd */
  jitter?: number;
  /** Whether to reconnect on WebSocket close event (default: true) */
  reconnectOnClose?: boolean;
  /** Reconnect on error event (default: true) */
  reconnectOnError?: boolean;
  /** Timeout for connection establishment in ms (default: 10000) */
  connectTimeout?: number;
}

export interface HeartbeatOptions {
  /** Enable heartbeat/ping-pong (default: true if autoReconnect is on) */
  enabled?: boolean;
  /** Interval between pings in ms (default: 30000) */
  interval?: number;
  /** Ping message payload (default: '{"type":"ping"}') */
  pingMessage?: string;
  /** Expected pong response pattern (default: check for 'pong' type) */
  pongChecker?: (data: unknown) => boolean;
  /** Max missed pongs before considering connection dead (default: 3) */
  maxMissedPings?: number;
  /** Timeout waiting for pong response in ms (default: 5000) */
  pongTimeout?: number;
}

export interface WsReconnectConfig {
  url: string;
  protocols?: string | string[];
  reconnect?: ReconnectOptions;
  heartbeat?: HeartbeatOptions;
  /** Custom headers or WebSocket options passed to constructor */
  wsOptions?: Record<string, unknown>;
  /** Message handler called for each received message */
  onMessage?: (data: unknown, event: MessageEvent) => void;
  /** Connection state change callback */
  onStateChange?: (state: ConnectionState, prevState: ConnectionState) => void;
  /** Error callback */
  onError?: (error: Event) => void;
  /** Called when reconnection fails after all attempts exhausted */
  onReconnectFailed?: () => void;
  /** Called when successfully reconnected */
  onReconnected?: (attemptNumber: number) => void;
  /** Logger function (default: console.log) */
  logger?: (...args: unknown[]) => void;
  /** Queue messages sent while disconnected (default: true) */
  queueMessages?: boolean;
  /** Max queued messages while disconnected (default: 500) */
  maxQueueSize?: number;
  /** Debug mode for verbose logging */
  debug?: boolean;
}

export type WsEventListener = (data: unknown, rawEvent: MessageEvent) => void;

export interface ConnectionStats {
  connectCount: number;
  reconnectCount: number;
  totalReconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
  bytesReceived: number;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  averageReconnectTimeMs: number;
  uptimeMs: number;
}

// --- Default Options ---

const DEFAULT_RECONNECT: Required<Omit<ReconnectOptions, "reconnectOnClose" | "reconnectOnError">> & Pick<ReconnectOptions, "reconnectOnClose" | "reconnectOnError"> = {
  autoReconnect: true,
  maxAttempts: 10,
  initialDelay: 1000,
  maxDelay: 30_000,
  backoffFactor: 2,
  jitter: 0.2,
  reconnectOnClose: true,
  reconnectOnError: true,
  connectTimeout: 10_000,
};

const DEFAULT_HEARTBEAT: Required<HeartbeatOptions> = {
  enabled: true,
  interval: 30_000,
  pingMessage: '{"type":"ping"}',
  pongChecker: (data) => {
    if (typeof data === "string") return data.includes("pong");
    if (typeof data === "object" && data !== null) return (data as Record<string, unknown>).type === "pong";
    return false;
  },
  maxMissedPings: 3,
  pongTimeout: 5_000,
};

// --- Main Class ---

/**
 * WebSocket wrapper with automatic reconnection and heartbeat management.
 *
 * ```ts
 * const ws = new WebSocketManager({
 *   url: "wss://example.com/ws",
 *   onMessage: (data) => console.log(data),
 *   onStateChange: (state) => console.log(state),
 * });
 * ws.connect();
 * ws.send({ type: "chat", text: "hello" });
 * ```
 */
export class WebSocketManager {
  private config: WsReconnectConfig;
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private missedPings = 0;
  private messageQueue: unknown[] = [];
  private listeners: Map<string, Set<WsEventListener>> = new Map();
  private stats: ConnectionStats = this.createFreshStats();
  private connectStartTime = 0;
  private reconnectTimes: number[] = [];
  private intentionalClose = false;
  private destroyed = false;

  constructor(config: WsReconnectConfig) {
    this.config = {
      reconnect: { ...DEFAULT_RECONNECT, ...config.reconnect },
      heartbeat: { ...DEFAULT_HEARTBEAT, ...config.heartbeat },
      queueMessages: true,
      maxQueueSize: 500,
      debug: false,
      ...config,
    };
  }

  // --- Public API ---

  /** Establish WebSocket connection */
  connect(): void {
    if (this.destroyed) return;

    this.intentionalClose = false;
    this.setState("connecting");
    this.connectStartTime = Date.now();

    try {
      const { url, protocols } = this.config;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.ws = new (WebSocket as any)(url, protocols);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this handleClose(event);
      this.ws.onerror = (event) => this.handleError(event);

      // Connection timeout
      this.clearConnectTimeout();
      this.connectTimeoutTimer = setTimeout(() => {
        if (this.state === "connecting") {
          this.log("Connection timeout");
          this.ws?.close(4000, "Connection timeout");
        }
      }, this.config.reconnect!.connectTimeout);
    } catch (err) {
      this.log("Failed to create WebSocket:", err);
      this.setState("disconnected");
      this.scheduleReconnect();
    }
  }

  /** Close the connection gracefully */
  close(code = 1000, reason = "Normal closure"): void {
    this.intentionalClose = true;
    this.setState("disconnecting");
    this.clearAllTimers();

    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }

    this.stats.lastDisconnectedAt = Date.now();
    this.setState("closed");
  }

  /** Destroy the manager completely (no reconnection) */
  destroy(): void {
    this.destroyed = true;
    this.close(1001, "Destroying");
    this.messageQueue = [];
    this.listeners.clear();
  }

  /** Send data through the WebSocket */
  send(data: unknown): boolean {
    if (!this.isConnected()) {
      if (this.config.queueMessages) {
        this.enqueueMessage(data);
        return true; // Queued successfully
      }
      return false; // Not connected, not queuing
    }

    try {
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      this.ws!.send(payload);
      this.stats.messagesSent++;
      return true;
    } catch (err) {
      this.log("Send error:", err);
      return false;
    }
  }

  /** Send data and wait for a response (request-response pattern) */
  async request<T = unknown>(
    data: unknown,
    timeoutMs = 15000,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const payload = { ...(typeof data === "object" ? data as Record<string, unknown> : { _data: data }), _requestId: requestId };

      // Set up one-time listener
      const timer = setTimeout(() => {
        this.off(`response:${requestId}`, handler);
        reject(new Error("Request timeout"));
      }, timeoutMs);

      const handler: WsEventListener = (_data, _event) => {
        clearTimeout(timer);
        resolve(_data as T);
      };

      this.on(`response:${requestId}`, handler);
      this.send(payload);
    });
  }

  /** Register an event listener for a specific message type */
  on(event: string, listener: WsEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);

    // Return unsubscribe function
    return () => this.off(event, listener);
  }

  /** Remove an event listener */
  off(event: string, listener: WsEventListener): void {
    this.listeners.get(event)?.delete(listener);
  }

  /** Emit an event locally (for testing or internal use) */
  emit(event: string, data: unknown, rawEvent?: MessageEvent): void {
    this.listeners.get(event)?.forEach((fn) => fn(data, rawEvent ?? new MessageEvent("message", { data })));
  }

  // --- State Accessors ---

  getState(): ConnectionState { return this.state; }
  isConnected(): boolean { return this.state === "connected"; }
  isConnecting(): boolean { return this.state === "connecting" || this.state === "reconnecting"; }
  getStats(): ConnectionStats { return { ...this.stats }; }
  getUrl(): string { return this.config.url; }
  getAttemptNumber(): number { return this.reconnectAttempt; }
  getQueuedMessageCount(): number { return this.messageQueue.length; }

  // --- Private Handlers ---

  private handleOpen(): void {
    this.clearConnectTimeout();
    this.stats.connectCount++;
    this.stats.lastConnectedAt = Date.now();

    if (this.reconnectAttempt > 0) {
      this.stats.reconnectCount++;
      const reconnectTime = Date.now() - this.connectStartTime;
      this.reconnectTimes.push(reconnectTime);
      this.stats.averageReconnectTimeMs = Math.round(
        this.reconnectTimes.reduce((a, b) => a + b, 0) / this.reconnectTimes.length,
      );
      this.log(`Reconnected after ${reconnectTime}ms (attempt ${this.reconnectAttempt})`);
      this.config.onReconnected?.(this.reconnectAttempt);
      this.reconnectAttempt = 0;
    }

    this.setState("connected");

    // Start heartbeat
    if (this.config.heartbeat?.enabled) {
      this.startHeartbeat();
    }

    // Flush queued messages
    this.flushQueue();
  }

  private handleMessage(event: MessageEvent): void {
    this.stats.messagesReceived++;
    this.stats.bytesReceived += (event.data as string).length ?? 0;

    let parsed: unknown;
    try {
      parsed = JSON.parse(event.data as string);
    } catch {
      parsed = event.data;
    }

    // Check for pong response
    if (this.config.heartbeat?.enabled && this.config.heartbeat.pongChecker?.(parsed)) {
      this.clearPongTimer();
      this.missedPings = 0;
      return;
    }

    // Check for response to request
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (obj._requestId) {
        this.emit(`response:${obj._requestId as string}`, parsed, event);
        return;
      }
      // Emit by type field
      if (obj.type && typeof obj.type === "string") {
        this.emit(obj.type as string, parsed, event);
      }
    }

    // Global message handler
    this.config.onMessage?.(parsed, event);
  }

  private handleClose(event: CloseEvent): void {
    this.clearAllTimers();
    this.stats.lastDisconnectedAt = Date.now();

    const wasConnected = this.state === "connected";

    if (this.intentionalClose || this.destroyed) {
      this.setState("closed");
      return;
    }

    this.setState("disconnected");
    this.log(`Connection closed: code=${event.code} reason=${event.reason}`);

    // Decide whether to reconnect
    const shouldReconnect =
      this.config.reconnect?.autoReconnect &&
      ((event.code !== 1000 && this.config.reconnect?.reconnectOnClose) ||
       (wasConnected && this.config.reconnect?.reconnectOnError));

    if (shouldReconnect) {
      this.scheduleReconnect();
    } else {
      this.config.onReconnectFailed?.();
    }
  }

  private handleError(_event: Event): void {
    this.log("WebSocket error");
    this.config.onError?.(_event);
  }

  // --- Reconnection Logic ---

  private scheduleReconnect(): void {
    const opts = this.config.reconnect!;

    if (opts.maxAttempts > 0 && this.reconnectAttempt >= opts.maxAttempts) {
      this.log(`Max reconnect attempts (${opts.maxAttempts}) reached`);
      this.config.onReconnectFailed?.();
      return;
    }

    this.reconnectAttempt++;
    this.stats.totalReconnectAttempts++;

    // Calculate delay with exponential backoff + jitter
    const baseDelay = Math.min(
      opts.initialDelay * Math.pow(opts.backoffFactor, this.reconnectAttempt - 1),
      opts.maxDelay,
    );
    const jitterAmount = baseDelay * opts.jitter;
    const delay = baseDelay + (Math.random() * jitterAmount * 2 - jitterAmount);

    this.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempt}/${opts.maxAttempts === 0 ? "\u221e" : opts.maxAttempts})`);

    this.setState("reconnecting");
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // --- Heartbeat ---

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.missedPings = 0;

    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) return;

      this.send(this.config.heartbeat!.pingMessage!);

      // Wait for pong
      this.clearPongTimer();
      this.pongTimer = setTimeout(() => {
        this.missedPings++;
        this.log(`Missed ping (${this.missedPings}/${this.config.heartbeat!.maxMissedPings})`);

        if (this.missedPings >= this.config.heartbeat!.maxMissedPings!) {
          this.log("Too many missed pings, forcing reconnect");
          this.ws?.close(4001, "Heartbeat timeout");
        }
      }, this.config.heartbeat!.pongTimeout);
    }, this.config.heartbeat!.interval);
  }

  // --- Message Queue ---

  private enqueueMessage(data: unknown): void {
    if (this.messageQueue.length >= (this.config.maxQueueSize ?? 500)) {
      this.log("Message queue full, dropping oldest message");
      this.messageQueue.shift();
    }
    this.messageQueue.push(data);
  }

  private flushQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.log(`Flushing ${this.messageQueue.length} queued messages`);
    const queued = [...this.messageQueue];
    this.messageQueue = [];

    for (const msg of queued) {
      this.send(msg);
    }
  }

  // --- State Management ---

  private setState(newState: ConnectionState): void {
    const oldState = this.state;
    if (oldState === newState) return;
    this.state = newState;
    this.log(`State: ${oldState} -> ${newState}`);
    this.config.onStateChange?.(newState, oldState);
  }

  // --- Timer Cleanup ---

  private clearAllTimers(): void {
    this.clearConnectTimeout();
    this.clearReconnectTimer();
    this.clearHeartbeat();
    this.clearPongTimer();
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearPongTimer(): void {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // --- Utilities ---

  private createFreshStats(): ConnectionStats {
    return {
      connectCount: 0,
      reconnectCount: 0,
      totalReconnectAttempts: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesReceived: 0,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      averageReconnectTimeMs: 0,
      uptimeMs: 0,
    };
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log(`[WsReconnect]`, ...args);
    }
    this.config.logger?.(...args);
  }
}

// --- Factory Functions ---

/** Create a pre-configured WebSocket manager with sensible defaults */
export function createWebSocket(url: string, options?: Partial<WsReconnectConfig>): WebSocketManager {
  return new WebSocketManager({ url, ...options });
}

/** Create a WebSocket manager optimized for real-time chat applications */
export function createChatWebSocket(url: string, onMessage: (data: unknown) => void): WebSocketManager {
  return new WebSocketManager({
    url,
    onMessage,
    reconnect: {
      ...DEFAULT_RECONNECT,
      maxAttempts: 20,
      initialDelay: 500,
      maxDelay: 15_000,
    },
    heartbeat: {
      ...DEFAULT_HEARTBEAT,
      interval: 25_000,
      maxMissedPings: 3,
    },
    debug: false,
  });
}

/** Create a WebSocket manager for live data streams (stock prices, metrics, etc.) */
export function createStreamWebSocket(url: string, onMessage: (data: unknown) => void): WebSocketManager {
  return new WebSocketManager({
    url,
    onMessage,
    reconnect: {
      ...DEFAULT_RECONNECT,
      maxAttempts: Infinity, // Never give up on streams
      initialDelay: 200,
      maxDelay: 5_000,
      backoffFactor: 1.5,
    },
    heartbeat: {
      ...DEFAULT_HEARTBEAT,
      interval: 15_000,
      maxMissedPings: 2,
      pongTimeout: 3_000,
    },
    queueMessages: false, // Don't queue stale stream data
  });
}
