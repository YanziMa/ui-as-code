/**
 * WebSocket Manager: Connection management with auto-reconnect, heartbeat/ping-pong,
 * message queue during disconnection, request-response pattern, room/channel support,
 * presence tracking, typed events, connection state machine, and metrics.
 */

// --- Types ---

export type WsState = "connecting" | "connected" | "disconnecting" | "disconnected" | "reconnecting";

export interface WebSocketOptions {
  /** WebSocket URL (required) */
  url: string;
  /** Protocols (for subprotocol negotiation) */
  protocols?: string[];
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay between reconnect attempts (ms, default: 1000) */
  reconnectBaseDelay?: number;
  /** Max delay between reconnect attempts (ms, default: 30_000) */
  reconnectMaxDelay?: number;
  /** Heartbeat interval in ms (default: 30_000) */
  heartbeatInterval?: number;
  /** Heartbeat timeout — disconnect if no pong within this time (ms) */
  heartbeatTimeout?: number;
  /** Message queue max size while disconnected (default: 100) */
  queueSize?: number;
  /** Binary type (default: "arraybuffer") */
  binaryType?: BinaryType;
  /** Connect timeout in ms (default: 10_000) */
  connectTimeout?: number;
  /** Extra headers (if supported by server) */
  headers?: Record<string, string>;
  /** Debug logging */
  debug?: boolean;
}

export interface WsMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
  id?: string;
  from?: string;       // Sender ID (server-assigned)
  roomId?: string;     // Room/channel
}

export interface WsRequest<T = unknown> {
  id: string;
  type: string;
  data: T;
  resolve: (response: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export interface RoomInfo {
  id: string;
  name?: string;
  members: Set<string>;
  created: number;
}

export interface PresenceEntry {
  userId: string;
  status: "online" | "away" | "offline";
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface WsMetrics {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  reconnectCount: number;
  connectTime: number | null;
  uptime: number;
  averageLatency: number;
}

// --- Main Class ---

/**
 * WebSocket manager with reconnection, heartbeat, rooms, presence, and typed messaging.
 *
 * ```ts
 * const ws = new WebSocketManager({ url: "wss://example.com/ws" });
 *
 * ws.on("message", (msg) => console.log(msg.data));
 * ws.on("user:joined", (msg) => console.log(`${msg.data} joined!`));
 *
 * await ws.connect();
 * ws.send({ type: "chat", text: "Hello!" });
 *
 * // Request-response pattern
 * const reply = await ws.request({ type: "getUser", userId: "123" });
 * ```
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private options: Required<WebSocketOptions>;
  private state: WsState = "disconnected";
  private listeners = new Map<string, Set<(msg: WsMessage) => void>>();
  private onceListeners = new Map<string, Set<(msg: WsMessage) => void>>();
  private stateListeners = new Set<(state: WsState) => void>();
  private messageQueue: WsMessage[] = [];
  private pendingRequests = new Map<string, WsRequest<unknown>>();
  private rooms = new Map<string, RoomInfo>();
  private presence = new Map<string, PresenceEntry>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTime: number | null = null;
  private metrics: WsMetrics;
  private messageIdCounter = 0;
  private _destroyed = false;

  constructor(options: WebSocketOptions) {
    this.options = {
      ...options,
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      reconnectBaseDelay: options.reconnectBaseDelay ?? 1000,
      reconnectMaxDelay: options.reconnectMaxDelay ?? 30000,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      heartbeatTimeout: options.heartbeatTimeout ?? 15000,
      queueSize: options.queueSize ?? 100,
      binaryType: options.binaryType ?? "arraybuffer",
      connectTimeout: options.connectTimeout ?? 10000,
      debug: options.debug ?? false,
    };

    this.metrics = this.freshMetrics();
  }

  get currentState(): WsState { return this.state; }
  get isConnected(): boolean { return this.state === "connected"; }
  get url(): string { return this.options.url; }

  // --- Connection Lifecycle ---

  /** Establish WebSocket connection */
  connect(): Promise<void> {
    if (this._destroyed) return Promise.reject(new Error("WebSocketManager destroyed"));
    if (this.ws && (this.state === "connecting" || this.state === "connected")) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.state = "connecting";
      this.notifyStateListeners();

      try {
        this.ws = new WebSocket(this.options.url, this.options.protocols);
        this.ws.binaryType = this.options.binaryType;

        // Connect timeout
        this.connectTimer = setTimeout(() => {
          if (this.state === "connecting") {
            this.ws?.close(4005, "Connect timeout");
            reject(new Error("Connection timeout"));
          }
        }, this.options.connectTimeout);

        this.ws.onopen = () => {
          if (this.connectTimer) clearTimeout(this.connectTimer);
          this.handleOpen();
          resolve();
        };

        this.ws.onclose = (event) => {
          if (this.connectTimer) clearTimeout(this.connectTimer);
          this handleClose(event.code, event.reason);
        };

        this.ws.onerror = (event) => {
          this.log("error", "WebSocket error:", event);
          if (this.state === "connecting") {
            reject(new Error("Connection failed"));
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
      } catch (err) {
        this.state = "disconnected";
        reject(err);
      }
    });
  }

  /** Disconnect gracefully */
  disconnect(code = 1000, reason = "Client disconnect"): void {
    this._destroyed = true;
    this.options.autoReconnect = false;
    this.cleanup();
    this.ws?.close(code, reason);
    this.ws = null;
    this.state = "disconnected";
    this.notifyStateListeners();
  }

  // --- Messaging ---

  /** Send a message */
  send(data: unknown, type = "message"): boolean {
    if (!this.isConnected) {
      this.enqueue({ type, data, timestamp: Date.now() });
      return false;
    }

    const msg: WsMessage = { type, data, timestamp: Date.now(), id: this.generateId() };
    const raw = this.serialize(msg);
    this.ws!.send(raw);
    this.recordSend(raw);
    return true;
  }

  /** Send to a specific room */
  sendToRoom(roomId: string, data: unknown, type = "message"): boolean {
    return this.send({ ...data as object, __room: roomId }, type);
  }

  /** Send and wait for response (request-response pattern) */
  async request<T = unknown>(data: unknown, type = "request", timeoutMs = 10000): Promise<T> {
    if (!this.isConnected) {
      throw new Error("Not connected — cannot send request");
    }

    const id = this.generateId();
    const msg: WsMessage = { type, data, timestamp: Date.now(), id };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request "${type}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        id, type, data: data as unknown,
        resolve: resolve as (v: unknown) => void,
        reject: reject as (e: Error) => void,
        timeout: timer!,
      });

      const raw = this.serialize(msg);
      this.ws!.send(raw);
      this.recordSend(raw);
    });
  }

  /** Register a message handler */
  on(type: string, handler: (msg: WsMessage) => void): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  /** Register a one-time message handler */
  once(type: string, handler: (msg: WsMessage) => void): () => void {
    if (!this.onceListeners.has(type)) this.onceListeners.set(type, new Set());
    this.onceListeners.get(type)!.add(handler);
    return () => this.onceListeners.get(type)?.delete(handler);
  }

  /** Remove all handlers for a type */
  off(type: string): void {
    this.listeners.delete(type);
    this.onceListeners.delete(type);
  }

  // --- Rooms / Channels ---

  /** Join a room */
  joinRoom(roomId: string, name?: string): void {
    this.send({ action: "join", room: roomId, name }, "room:join");

    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        name,
        members: new Set(),
        created: Date.now(),
      });
    }

    this.rooms.get(roomId)!.members.add("self");
    this.log("room", `Joined room: ${roomId}`);
  }

  /** Leave a room */
  leaveRoom(roomId: string): void {
    this.send({ action: "leave", room: roomId }, "room:leave");
    this.rooms.get(roomId)?.members.delete("self");
    if (this.rooms.get(roomId)?.members.size === 0) {
      this.rooms.delete(roomId);
    }
    this.log("room", `Left room: ${roomId}`);
  }

  /** Get room info */
  getRoom(roomId: string): RoomInfo | undefined {
    return this.rooms.get(roomId);
  }

  /** List all joined rooms */
  listRooms(): RoomInfo[] {
    return Array.from(this.rooms.values());
  }

  // --- Presence ---

  /** Update own presence status */
  setPresence(status: PresenceEntry["status"], metadata?: Record<string, unknown>): void {
    this.send({ status, metadata }, "presence:update");
  }

  /** Get presence of a user */
  getPresence(userId: string): PresenceEntry | undefined {
    return this.presence.get(userId);
  }

  /** Get all online users */
  getOnlineUsers(): PresenceEntry[] {
    return Array.from(this.presence.values()).filter((p) => p.status === "online");
  }

  // --- State ---

  /** Subscribe to connection state changes */
  onStateChange(fn: (state: WsState) => void): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  /** Get current metrics */
  getMetrics(): WsMetrics {
    if (this.connectTime) {
      this.metrics.uptime = Date.now() - this.connectTime;
    }
    return { ...this.metrics };
  }

  // --- Internal ---

  private handleOpen(): void {
    this.state = "connected";
    this.reconnectAttempts = 0;
    this.connectTime = Date.now();
    this.notifyStateListeners();

    // Flush queued messages
    if (this.messageQueue.length > 0) {
      this.log("queue", `Flushing ${this.messageQueue.length} queued messages`);
      for (const msg of this.messageQueue) {
        this.send(msg.data, msg.type);
      }
      this.messageQueue = [];
    }

    // Start heartbeat
    this.startHeartbeat();

    // Send queued requests? No — they need fresh connections
  }

  private handleClose(_code: number, reason: string): void {
    this.stopHeartbeat();
    this.state = "disconnected";
    this.notifyStateListeners();

    // Reject pending requests
    for (const [id, req] of this.pendingRequests) {
      clearTimeout(req.timeout);
      req.reject(new Error(`Connection closed: ${reason}`));
    }
    this.pendingRequests.clear();

    // Auto-reconnect
    if (this.options.autoReconnect && !this._destroyed) {
      this.scheduleReconnect();
    }
  }

  private handleMessage(data: unknown): void {
    let parsed: WsMessage;

    if (typeof data === "string") {
      try {
        parsed = JSON.parse(data) as WsMessage;
      } catch {
        parsed = { type: "raw", data, timestamp: Date.now() };
      }
    } else if (data instanceof ArrayBuffer) {
      try {
        parsed = JSON.parse(new TextDecoder().decode(data)) as WsMessage;
      } catch {
        parsed = { type: "binary", data, timestamp: Date.now() };
      }
    } else if (data instanceof Blob) {
      // Handle blob data
      return;
    } else {
      parsed = { type: "raw", data, timestamp: Date.now() };
    }

    this.recordReceive(data);

    // Check if this is a response to a pending request
    if (parsed.id && this.pendingRequests.has(parsed.id)) {
      const req = this.pendingRequests.get(parsed.id)!;
      this.pendingRequests.delete(parsed.id);
      clearTimeout(req.timeout);
      req.resolve(parsed.data);
      return;
    }

    // Handle system messages
    switch (parsed.type) {
      case "pong":
        if (this.heartbeatTimeoutTimer) {
          clearTimeout(this.heartbeatTimeoutTimer);
          this.heartbeatTimeoutTimer = null;
        }
        return;
      case "room:update":
        this.handleRoomUpdate(parsed.data as Record<string, unknown>);
        return;
      case "presence:update":
        this.handlePresenceUpdate(parsed.data as Record<string, unknown>);
        return;
    }

    // Dispatch to listeners
    const handlers = this.listeners.get(parsed.type);
    if (handlers) {
      for (const fn of handlers) {
        try { fn(parsed); } catch (err) {
          this.log("error", `Handler error for "${parsed.type}":`, err);
        }
      }
    }

    // Once listeners
    const onceHandlers = this.onceListeners.get(parsed.type);
    if (onceHandlers) {
      for (const fn of onceHandlers) {
        try { fn(parsed); } catch (err) {
          this.log("error", `Once-handler error for "${parsed.type}":`, err);
        }
      }
      this.onceListeners.delete(parsed.type);
    }
  }

  private handleRoomUpdate(data: Record<string, unknown>): void {
    const roomId = data.room as string;
    if (!roomId) return;

    if (data.action === "join") {
      const userId = data.userId as string;
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, { id: roomId, members: new Set(), created: Date.now() });
      }
      this.rooms.get(roomId)!.members.add(userId);
    } else if (data.action === "leave") {
      const userId = data.userId as string;
      this.rooms.get(roomId)?.members.delete(userId);
    }
  }

  private handlePresenceUpdate(data: Record<string, unknown>): void {
    const userId = data.userId as string;
    if (!userId) return;

    this.presence.set(userId, {
      userId,
      status: (data.status ?? "offline") as PresenceEntry["status"],
      lastSeen: Date.now(),
      metadata: data.metadata as Record<string, unknown>,
    });

    // Clean up stale entries (>5 min since last seen)
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [uid, entry] of this.presence) {
      if (entry.lastSeen < cutoff) this.presence.delete(uid);
    }
  }

  // --- Heartbeat ---

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));

        // Timeout waiting for pong
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.log("warn", "Heartbeat timeout — closing connection");
          this.ws?.close(4001, "Heartbeat timeout");
        }, this.options.heartbeatTimeout);
      }
    }, this.options.heartbeatInterval);
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

  // --- Reconnection ---

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log("warn", "Max reconnect attempts reached");
      return;
    }

    const delay = Math.min(
      this.options.reconnectBaseDelay * Math.pow(1.5, this.reconnectAttempts),
      this.options.reconnectMaxDelay,
    );

    this.reconnectAttempts++;
    this.metrics.reconnectCount = this.reconnectAttempts;
    this.state = "reconnecting";
    this.notifyStateListeners();

    this.log("info", `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((err) => {
        this.log("error", "Reconnect failed:", err);
      });
    }, delay);
  }

  // -- Utilities --

  private enqueue(msg: WsMessage): void {
    if (this.messageQueue.length < this.options.queueSize) {
      this.messageQueue.push(msg);
    } else {
      this.messageQueue.shift(); // Drop oldest
      this.messageQueue.push(msg);
    }
  }

  private serialize(msg: WsMessage): string {
    return JSON.stringify(msg);
  }

  private generateId(): string {
    return `msg_${Date.now().toString(36)}_${++this.messageIdCounter}`;
  }

  private recordSend(data: unknown): void {
    this.metrics.messagesSent++;
    this.metrics.bytesSent += typeof data === "string" ? data.length : (data as ArrayBuffer)?.byteLength ?? 0;
  }

  private recordReceive(data: unknown): void {
    this.metrics.messagesReceived++;
    this.metrics.bytesReceived += typeof data === "string" ? data.length : (data as ArrayBuffer)?.byteLength ?? 0;
  }

  private freshMetrics(): WsMetrics {
    return {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      reconnectCount: 0,
      connectTime: null,
      uptime: 0,
      averageLatency: 0,
    };
  }

  private notifyStateListeners(): void {
    for (const fn of this.stateListeners) fn(this.state);
  }

  private cleanup(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.connectTimer) clearTimeout(this.connectTimer);
    for (const timer of Object.values(this.pendingRequests.values())) {
      clearTimeout(timer.timeout);
    }
    this.pendingRequests.clear();
    this.listeners.clear();
    this.onceListeners.clear();
    this.stateListeners.clear();
  }

  private log(level: "info" | "warn" | "error", ...args: unknown[]): void {
    if (!this.options.debug) return;
    const prefix = "[WS]";
    switch (level) {
      case "error": console.error(prefix, ...args); break;
      case "warn": console.warn(prefix, ...args); break;
      default: console.log(prefix, ...args); break;
    }
  }
}
