/**
 * WebSocket Protocol Layer: High-level WebSocket client with
 * message framing, heartbeat/keep-alive, ACK/NACK protocol,
 * reconnection with exponential backoff, room/channel support,
 * message queuing, and binary data handling.
 */

// --- Types ---

export interface WsConfig {
  /** WebSocket URL (wss:// or ws://) */
  url: string;
  /** Protocols to use */
  protocols?: string[];
  /** Additional headers (not supported in all browsers) */
  headers?: Record<string, string>;
  /** Auth token sent on connect */
  authToken?: string;
  /** Reconnect config */
  reconnect?: {
    enabled?: boolean;
    maxAttempts?: number;        // -1 = infinite
    initialDelayMs?: number;     // default: 1000
    maxDelayMs?: number;         // default: 30000
    backoffFactor?: number;      // default: 2
    jitter?: number;             // 0-1, default: 0.3
  };
  /** Heartbeat / ping-pong config */
  heartbeat?: {
    intervalMs?: number;         // default: 30000
    timeoutMs?: number;          // default: 10000
    payload?: string;            // default: "ping"
  };
  /** Message queue for offline buffering */
  queueOfflineMessages?: boolean;
  /** Max queued messages when disconnected */
  maxQueueSize?: number;         // default: 100
  /** Enable debug logging */
  debug?: boolean;
  /** Abort signal */
  signal?: AbortSignal;
  /** Binary type (default: "arraybuffer") */
  binaryType?: BinaryType;
}

export interface WsMessage {
  /** Message ID (for request-response) */
  id?: string;
  /** Message type/action */
  type: string;
  /** Payload data */
  data?: unknown;
  /** Target room/channel */
  room?: string;
  /** Target user ID */
  to?: string;
  /** Timestamp */
  timestamp?: number;
  /** Error info (for error-type messages) */
  error?: { code: string; message: string };
}

export interface WsConnectionState {
  state: "connecting" | "open" | "closing" | "closed" | "reconnecting" | "error";
  url: string;
  readyState: number;
  reconnectAttempt: number;
  connectedAt: number | null;
  lastMessageAt: number | null;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  pendingAcks: number;
  rooms: string[];
  latencyMs: number | null;
}

export type WsMessageHandler = (message: WsMessage) => void;
export type WsRawHandler = (data: string | ArrayBuffer) => void;
export type WsStateHandler = (state: WsConnectionState) => void;
export type WsErrorHandler = (error: Error) => void;

// --- Internal Types ---

interface PendingRequest {
  id: string;
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  timestamp: number;
}

interface QueuedMessage {
  data: string;
  timestamp: number;
}

interface RoomSubscription {
  name: string;
  handlers: Set<WsMessageHandler>;
}

// --- Built-in Message Types ---

const WS_MSG_TYPES = {
  PING: "__ws_ping__",
  PONG: "__ws_pong__",
  ACK: "__ws_ack__",
  NACK: "__ws_nack__",
  JOIN: "__ws_join__",
  LEAVE: "__ws_leave__",
  ROOM_MSG: "__ws_room_msg__",
  ERROR: "__ws_error__",
} as const;

// --- Main Client ---

export class WsClient {
  private config: {
    url: string;
    protocols: string[];
    headers: Record<string, string>;
    authToken: string | undefined;
    reconnect: NonNullable<WsConfig["reconnect"]>;
    heartbeat: NonNullable<WsConfig["heartbeat"]>;
    queueOfflineMessages: boolean;
    maxQueueSize: number;
    debug: boolean;
    binaryType: BinaryType;
  };
  private ws: WebSocket | null = null;
  private currentState: WsConnectionState["state"] = "closed";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimer: ReturnType<typeof setTimeout> | null = null;
  private connectedAt: number | null = null;
  private lastMessageAt: number | null = null;
  private messagesSent = 0;
  private messagesReceived = 0;
  private bytesSent = 0;
  private bytesReceived = 0;
  private lastError: Error | null = null;
  private latencyMs: number | null = null;
  private destroyed = false;
  private externalAbortListener: (() => void) | null = null;

  // Handlers
  private messageHandlers = new Map<string, Set<WsMessageHandler>>();
  private rawHandlers = new Set<WsRawHandler>();
  private stateHandlers = new Set<WsStateHandler>();
  private errorHandlers = new Set<WsErrorHandler>();

  // Request-response tracking
  private pendingRequests = new Map<string, PendingRequest>();
  private messageIdCounter = 0;

  // Offline queue
  private messageQueue: QueuedMessage[] = [];

  // Rooms
  private rooms = new Map<string, RoomSubscription>();
  private pendingRooms: string[] = []; // Rooms to re-join after reconnect

  constructor(config: WsConfig) {
    this.config = {
      protocols: [],
      headers: {},
      reconnect: {
        enabled: true,
        maxAttempts: -1,
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        backoffFactor: 2,
        jitter: 0.3,
        ...config.reconnect,
      },
      heartbeat: {
        intervalMs: 30000,
        timeoutMs: 10000,
        payload: "ping",
        ...config.heartbeat,
      },
      queueOfflineMessages: false,
      maxQueueSize: 100,
      debug: false,
      binaryType: "arraybuffer",
      ...config,
    };

    if (config.signal) {
      this.externalAbortListener = () => this.destroy();
      config.signal.addEventListener("abort", this.externalAbortListener);
    }
  }

  // --- Connection ---

  /** Connect to the WebSocket server */
  connect(): void {
    if (this.destroyed) return;
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      if (this.config.debug) console.log("[WS] Already connected or connecting");
      return;
    }

    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols.length > 0 ? this.config.protocols : undefined);
      this.ws.binaryType = this.config.binaryType;

      this.ws.onopen = () => this.handleOpen();
      this.ws.onclose = (event) => this handleClose(event);
      this.ws.onerror = () => this.handleError(new Error("WebSocket error"));
      this.ws.onmessage = (event) => this.handleMessage(event);
    } catch (err) {
      this.handleError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /** Disconnect gracefully */
  disconnect(code = 1000, reason = "Normal closure"): void {
    this.cleanup();
    try {
      this.ws?.close(code, reason);
    } catch {}
    this.setState("closed");
  }

  /** Force close without waiting */
  destroy(): void {
    this.destroyed = true;
    this.disconnect(4001, "Destroyed");
    this.clearAll();
    if (this.externalAbortListener) {
      // Can't remove from signal since it's already aborted
      this.externalAbortListener = null;
    }
  }

  // --- Messaging ---

  /** Send a typed message */
  send(message: Partial<WsMessage> & { type: string }): void {
    const fullMessage: WsMessage = {
      type: message.type,
      data: message.data,
      room: message.room,
      to: message.to,
      timestamp: Date.now(),
      ...message.id !== undefined ? { id: message.id } : {},
    };

    this.sendRaw(JSON.stringify(fullMessage));
  }

  /** Send a raw string message */
  sendRaw(data: string): void {
    if (!this.isConnected()) {
      if (this.config.queueOfflineMessages) {
        this.enqueueMessage(data);
        return;
      }
      if (this.config.debug) console.warn("[WS] Cannot send: not connected");
      return;
    }

    try {
      this.ws!.send(data);
      this.messagesSent++;
      this.bytesSent += new TextEncoder().encode(data).length;
      this.lastMessageAt = Date.now();
    } catch (err) {
      if (this.config.debug) console.error("[WS] Send error:", err);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /** Send binary data */
  sendBinary(data: ArrayBuffer | ArrayBufferView): void {
    if (!this.isConnected()) {
      if (this.config.debug) console.warn("[WS] Cannot send binary: not connected");
      return;
    }

    try {
      this.ws!.send(data);
      this.messagesSent++;
      this.bytesReceived += data.byteLength;
      this.lastMessageAt = Date.now();
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /** Send a request and wait for response (request-response pattern) */
  async request<T = unknown>(type: string, data?: unknown, timeoutMs = 15000): Promise<T> {
    const id = this.generateMessageId();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request ${id} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        id,
        resolve: resolve as (data: unknown) => void,
        reject,
        timer,
        timestamp: Date.now(),
      });

      this.send({ type, data, id });
    });
  }

  // --- Event Handling ---

  /** Subscribe to a specific message type */
  on(type: string, handler: WsMessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => this.messageHandlers.get(type)?.delete(handler);
  }

  /** Subscribe to all messages */
  onMessage(handler: WsMessageHandler): () => void {
    return this.on("*", handler);
  }

  /** Subscribe to raw (unparsed) messages */
  onRaw(handler: WsRawHandler): () => void {
    this.rawHandlers.add(handler);
    return () => this.rawHandlers.delete(handler);
  }

  /** Subscribe to state changes */
  onStateChange(handler: WsStateHandler): () => void {
    this.stateHandlers.add(handler);
    handler(this.getState());
    return () => this.stateHandlers.delete(handler);
  }

  /** Subscribe to errors */
  onError(handler: WsErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  // --- Rooms / Channels ---

  /** Join a room/channel */
  join(room: string): void {
    if (this.rooms.has(room)) {
      if (this.config.debug) console.log(`[WS] Already in room: ${room}`);
      return;
    }

    const subscription: RoomSubscription = { name: room, handlers: new Set() };
    this.rooms.set(room, subscription);

    if (this.isConnected()) {
      this.send({ type: WS_MSG_TYPES.JOIN, data: { room } });
    } else {
      this.pendingRooms.push(room);
    }

    if (this.config.debug) console.log(`[WS] Joining room: ${room}`);
  }

  /** Leave a room/channel */
  leave(room: string): void {
    this.rooms.delete(room);
    this.pendingRooms = this.pendingRooms.filter((r) => r !== room);

    if (this.isConnected()) {
      this.send({ type: WS_MSG_TYPES.LEAVE, data: { room } });
    }

    if (this.config.debug) console.log(`[WS] Leaving room: ${room}`);
  }

  /** Listen to messages in a specific room */
  onRoom(room: string, handler: WsMessageHandler): () => void {
    let sub = this.rooms.get(room);
    if (!sub) {
      sub = { name: room, handlers: new Set() };
      this.rooms.set(room, sub);
    }
    sub.handlers.add(handler);

    return () => sub.handlers.delete(handler);
  }

  /** Get list of joined rooms */
  getRooms(): string[] {
    return Array.from(this.rooms.keys());
  }

  // --- State ---

  /** Get current connection state */
  getState(): WsConnectionState {
    return {
      state: this.currentState,
      url: this.config.url,
      readyState: this.ws?.readyState ?? WebSocket.CLOSED,
      reconnectAttempt: this.reconnectAttempt,
      connectedAt: this.connectedAt,
      lastMessageAt: this.lastMessageAt,
      messagesSent: this.messagesSent,
      messagesReceived: this.messagesReceived,
      bytesSent: this.bytesSent,
      bytesReceived: this.bytesReceived,
      pendingAcks: this.pendingRequests.size,
      rooms: Array.from(this.rooms.keys()),
      latencyMs: this.latencyMs,
    };
  }

  /** Check if connected */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Get current latency measurement */
  getLatency(): number | null {
    return this.latencyMs;
  }

  /** Get queue size */
  getQueueSize(): number {
    return this.messageQueue.length;
  }

  /** Flush the offline message queue */
  flushQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const msg = this.messageQueue.shift();
      if (msg) this.sendRaw(msg.data);
    }
  }

  // --- Private: Connection Handlers ---

  private handleOpen(): void {
    this.reconnectAttempt = 0;
    this.connectedAt = Date.now();
    this.lastMessageAt = Date.now();
    this.setState("open");
    this.startHeartbeat();

    // Re-join rooms after reconnect
    if (this.pendingRooms.length > 0) {
      for (const room of this.pendingRooms) {
        this.send({ type: WS_MSG_TYPES.JOIN, data: { room } });
      }
      this.pendingRooms = [];
    }

    // Flush queued messages
    if (this.messageQueue.length > 0) {
      this.flushQueue();
    }

    // Send auth token if present
    if (this.config.authToken) {
      this.send({ type: "auth", data: { token: this.config.authToken } });
    }

    if (this.config.debug) console.log(`[WS] Connected to ${this.config.url}`);
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    this.cancelPendingRequests(new Error(`Connection closed: code=${event.code}, reason=${event.reason}`));

    if (this.destroyed || event.code === 4001) {
      this.setState("closed");
      return;
    }

    // Auto-reconnect
    if (this.config.reconnect.enabled &&
        !this.destroyed &&
        event.code !== 1000) {
      this.scheduleReconnect();
    } else {
      this.setState("closed");
    }
  }

  private handleError(error: Error): void {
    this.lastError = error;
    this.setState("error");

    for (const handler of this.errorHandlers) {
      try { handler(error); } catch {}
    }

    if (this.config.reconnect.enabled && !this.destroyed) {
      this.scheduleReconnect();
    }
  }

  private handleMessage(event: MessageEvent): void {
    this.messagesReceived++;
    this.bytesReceived += typeof event.data === "string"
      ? new TextEncoder().encode(event.data).length
      : (event.data as ArrayBuffer).byteLength;
    this.lastMessageAt = Date.now();

    // Raw handler dispatch
    for (const handler of this.rawHandlers) {
      try { handler(event.data); } catch {}
    }

    // Try to parse as JSON
    if (typeof event.data === "string") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        // Not JSON, skip typed handling
        return;
      }

      const msg = parsed as WsMessage;
      this.handleTypedMessage(msg);
    }
  }

  private handleTypedMessage(msg: WsMessage): void {
    // Handle built-in message types
    switch (msg.type) {
      case WS_MSG_TYPES.PING:
        this.send({ type: WS_MSG_TYPES.PONG, data: msg.data });
        return;

      case WS_MSG_TYPES.PONG:
        if (this.pongTimer) {
          clearTimeout(this.pongTimer);
          this.pongTimer = null;
          this.latencyMs = Date.now() - (msg.timestamp ?? Date.now());
        }
        return;

      case WS_MSG_TYPES.ACK:
        this.resolvePendingRequest(msg.id ?? "");
        return;

      case WS_MSG_TYPES.NACK:
        this.rejectPendingRequest(msg.id ?? "", msg.error ?? new Error("NACK received"));
        return;

      case WS_MSG_TYPES.ROOM_MSG:
        // Dispatch to room handlers
        if (msg.room) {
          const roomSub = this.rooms.get(msg.room);
          if (roomSub) {
            for (const h of roomSub.handlers) { try { h(msg); } catch {} }
          }
        }
        break;

      case WS_MSG_TYPES.ERROR:
        if (this.config.debug) console.error("[WS] Server error:", msg.error);
        for (const h of this.errorHandlers) {
          try { h(new Error(msg.error?.message ?? "Unknown error")); } catch {}
        }
        return;
    }

    // Auto-ACK if message has an ID
    if (msg.id) {
      this.send({ type: WS_MSG_TYPES.ACK, data: { id: msg.id } });
    }

    // Dispatch to type-specific handlers
    const typeHandlers = this.messageHandlers.get(msg.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try { handler(msg); } catch {}
      }
    }

    // Wildcard handlers
    const wildcardHandlers = this.messageHandlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try { handler(msg); } catch {}
      }
    }

    if (this.config.debug) {
      console.log(`[WS] [${msg.type}]`, msg.data != null ? JSON.stringify(msg.data).substring(0, 100) : "");
    }
  }

  // --- Private: State Management ---

  private setState(state: WsConnectionState["state"]): void {
    this.currentState = state;
    const info = this.getState();
    for (const handler of this.stateHandlers) {
      try { handler(info); } catch {}
    }
  }

  // --- Private: Heartbeat ---

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected()) return;

      const start = Date.now();
      this.send({ type: WS_MSG_TYPES.PING, data: { timestamp: start } });

      // Set pong timeout
      this.pongTimer = setTimeout(() => {
        if (this.config.debug) console.warn("[WS] Pong timeout — reconnecting");
        this.ws?.close(4000, "Pong timeout");
      }, this.config.heartbeat.timeoutMs);
    }, this.config.heartbeat.intervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  // --- Private: Reconnection ---

  private scheduleReconnect(): void {
    this.reconnectAttempt++;
    this.setState("reconnecting");

    const { initialDelayMs, maxDelayMs, backoffFactor, jitter, maxAttempts } = this.config.reconnect;

    if (maxAttempts !== -1 && this.reconnectAttempt > maxAttempts) {
      if (this.config.debug) console.error(`[WS] Max reconnect attempts (${maxAttempts}) reached`);
      this.setState("closed");
      return;
    }

    let delay = Math.min(initialDelayMs * Math.pow(backoffFactor, this.reconnectAttempt - 1), maxDelayMs);
    delay += (Math.random() * 2 - 1) * delay * jitter;
    delay = Math.max(delay, 200);

    if (this.config.debug) {
      console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempt})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // --- Private: Request Tracking ---

  private generateMessageId(): string {
    return `req_${Date.now()}_${++this.messageIdCounter}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private resolvePendingRequest(id: string): void {
    const req = this.pendingRequests.get(id);
    if (req) {
      clearTimeout(req.timer);
      this.pendingRequests.delete(id);
      // Resolve with undefined — actual data comes through normal message handlers
      req.resolve(undefined as unknown);
    }
  }

  private rejectPendingRequest(id: string, error: Error): void {
    const req = this.pendingRequests.get(id);
    if (req) {
      clearTimeout(req.timer);
      this.pendingRequests.delete(id);
      req.reject(error);
    }
  }

  private cancelPendingRequests(error: Error): void {
    for (const [, req] of this.pendingRequests) {
      clearTimeout(req.timer);
      req.reject(error);
    }
    this.pendingRequests.clear();
  }

  // --- Private: Queue ---

  private enqueueMessage(data: string): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.messageQueue.shift(); // Drop oldest
    }
    this.messageQueue.push({ data, timestamp: Date.now() });
  }

  // --- Private: Cleanup ---

  private clearAll(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.cancelPendingRequests(new Error("Client destroyed"));
    this.messageQueue = [];
    this.rooms.clear();
    this.messageHandlers.clear();
    this.rawHandlers.clear();
    this.stateHandlers.clear();
    this.errorHandlers.clear();
  }

  private cleanup(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }
}

/** Create a pre-configured WebSocket client */
export function createWsClient(config: WsConfig): WsClient {
  return new WsClient(config);
}
