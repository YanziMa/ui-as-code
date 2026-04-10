// =============================================================================
// WebSocket Utilities Library
// Comprehensive TypeScript utility module for WebSocket management
// =============================================================================

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type WsEvent = "open" | "close" | "error" | "message" | "reconnecting" | "reconnected";

export type WebSocketData = string | ArrayBuffer | Blob;

export interface OpenHandler {
  (): void;
}

export interface CloseHandler {
  (event: CloseEvent): void;
}

export interface ErrorHandler {
  (event: Event): void;
}

export interface MessageHandler {
  (data: WebSocketData): void;
}

export interface ReconnectingHandler {
  (attempt: number): void;
}

export type WsEventHandler = OpenHandler | CloseHandler | ErrorHandler | MessageHandler | ReconnectingHandler;

export interface WebSocketState {
  readyState: number;
  status: "connecting" | "open" | "closing" | "closed" | "reconnecting";
  connectedAt: Date | null;
  lastMessageAt: Date | null;
  reconnectAttempt: number;
}

export interface WebSocketStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  latency: number | null;
  uptime: number | null;
  reconnectCount: number;
}

export interface ReconnectConfig {
  autoReconnect: boolean;
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

export interface HeartbeatConfig {
  intervalMs: number;
  timeoutMs: number;
}

export interface WebSocketOptions {
  protocols?: string[];
  reconnect?: boolean | ReconnectConfig;
  heartbeat?: HeartbeatConfig | false;
  maxMessageSize?: number;
  debug?: boolean;
  binaryType?: BinaryType;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  autoReconnect: true,
  maxAttempts: 10,
  delayMs: 1000,
  backoffMultiplier: 2,
};

const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  intervalMs: 30000,
  timeoutMs: 10000,
};

const WS_READY_STATES: Record<number, WebSocketState["status"]> = {
  0: "connecting",
  1: "open",
  2: "closing",
  3: "closed",
};

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Check if the browser/environment supports WebSocket.
 */
export function isWebSocketSupported(): boolean {
  return typeof WebSocket !== "undefined";
}

/**
 * Build a full WebSocket URL from a base URL, optional path, and query params.
 * Automatically upgrades http:// to ws:// and https:// to wss://.
 */
export function getWebSocketUrl(
  baseUrl: string,
  path?: string,
  params?: Record<string, string>,
): string {
  let url = baseUrl.replace(/^https?/, (protocol) => (protocol === "https" ? "wss" : "ws"));

  if (path) {
    url = url.endsWith("/") ? url + path.replace(/^\//, "") : url + "/" + path.replace(/^\//, "");
  }

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  return url;
}

/**
 * Construct a WebSocket URL from individual components.
 */
export function createWebSocketUrl(
  protocol: string,
  host: string,
  port?: number,
  path?: string,
): string {
  const normalizedProtocol = protocol.replace(/s?$/, protocol.includes("wss") ? "s" : "");
  let url = `${normalizedProtocol}://${host}`;

  if (port !== undefined && port !== null) {
    url += `:${port}`;
  }

  if (path) {
    url += path.startsWith("/") ? path : `/${path}`;
  }

  return url;
}

/**
 * Parse a WebSocket URL into its constituent parts.
 */
export function parseWsUrl(url: string): { protocol: string; host: string; port: number; path: string } {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid WebSocket URL: ${url}`);
  }

  const port = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === "wss:" ? 443 : 80;
  const path = parsed.pathname + (parsed.search || "");

  return {
    protocol: parsed.protocol, // e.g. "wss:" or "ws:"
    host: parsed.hostname,
    port,
    path: path || "/",
  };
}

// ---------------------------------------------------------------------------
// Reconnection Strategy Helpers
// ---------------------------------------------------------------------------

function calculateReconnectDelay(
  attempt: number,
  config: ReconnectConfig,
): number {
  // Exponential backoff with jitter
  const baseDelay = config.delayMs * Math.pow(config.backoffMultiplier, attempt);
  const jitter = baseDelay * 0.2 * Math.random(); // +/- 20% jitter
  return Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
}

// ---------------------------------------------------------------------------
// WebSocketManager
// ---------------------------------------------------------------------------

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private readonly options: Required<WebSocketOptions>;
  private listeners: Map<WsEvent, Set<WsEventHandler>> = new Map();
  private onceListeners: Map<WsEvent, Set<WsEventHandler>> = new Map();

  // Internal state
  private _connectedAt: Date | null = null;
  private _lastMessageAt: Date | null = null;
  private _reconnectAttempt = 0;
  private _reconnectCount = 0;
  private _messagesSent = 0;
  private _messagesReceived = 0;
  private _bytesSent = 0;
  private _bytesReceived = 0;
  private _latency: number | null = null;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _pingTimestamp: number | null = null;
  private _manualClose = false;
  private _connectResolve: (() => void) | null = null;
  private _connectReject: ((err: Error) => void) | null = null;

  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url;
    this.options = {
      protocols: options.protocols ?? [],
      reconnect:
        typeof options.reconnect === "boolean"
          ? options.reconnect
            ? { ...DEFAULT_RECONNECT_CONFIG }
            : { ...DEFAULT_RECONNECT_CONFIG, autoReconnect: false }
          : { ...DEFAULT_RECONNECT_CONFIG, ...options.reconnect },
      heartbeat: options.heartbeat === false ? false : { ...DEFAULT_HEARTBEAT_CONFIG, ...(options.heartbeat ?? {}) },
      maxMessageSize: options.maxMessageSize ?? 1024 * 1024, // 1 MB default
      debug: options.debug ?? false,
      binaryType: options.binaryType ?? "arraybuffer",
    };

    this.initEventMaps();
  }

  private initEventMaps(): void {
    const events: WsEvent[] = ["open", "close", "error", "message", "reconnecting", "reconnected"];
    for (const event of events) {
      this.listeners.set(event, new Set());
      this.onceListeners.set(event, new Set());
    }
  }

  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log("[WS]", ...args);
    }
  }

  /**
   * Establish a WebSocket connection. Returns a promise that resolves when
   * the connection is open or rejects on error.
   */
  connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this._manualClose = false;

    return new Promise<void>((resolve, reject) => {
      try {
        this._connectResolve = resolve;
        this._connectReject = reject;

        this.ws = new WebSocket(this.url, this.options.protocols.length > 0 ? undefined : undefined);

        // Apply binary type before connecting
        this.ws.binaryType = this.options.binaryType;

        if (this.options.protocols.length > 0) {
          // Recreate with protocols
          this.ws.close();
          this.ws = new WebSocket(this.url, this.options.protocols);
          this.ws.binaryType = this.options.binaryType;
        }

        this.ws.onopen = () => this.handleOpen();
        this.ws.onclose = (event) => this.handleClose(event);
        this.ws.onerror = (event) => this.handleError(event);
        this.ws.onmessage = (event) => this.handleMessage(event);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private handleOpen(): void {
    this.log("Connection opened");
    this._connectedAt = new Date();
    this._lastMessageAt = new Date();
    this._reconnectAttempt = 0;

    this.startHeartbeat();
    this.emit("open");
    this.emit("reconnected");

    if (this._connectResolve) {
      this._connectResolve();
      this._connectResolve = null;
      this._connectReject = null;
    }
  }

  private handleClose(event: CloseEvent): void {
    this.log("Connection closed:", event.code, event.reason);
    this.stopHeartbeat();
    this.emit("close", event);

    if (this._connectReject && !this._connectedAt) {
      this._connectReject(new Error(`WebSocket closed before opening: ${event.reason || event.code}`));
      this._connectResolve = null;
      this._connectReject = null;
    }

    if (!this._manualClose && this.options.reconnect.autoReconnect) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    this.log("Error:", event);
    this.emit("error", event);

    if (this._connectReject && !this._connectedAt) {
      this._connectReject(new Error("WebSocket connection error"));
      this._connectResolve = null;
      this._connectReject = null;
    }
  }

  private handleMessage(event: MessageEvent): void {
    const data = event.data as WebSocketData;
    this._lastMessageAt = new Date();
    this._messagesReceived++;
    this._bytesReceived += this.getDataSize(data);

    // Handle pong response for latency measurement
    if (typeof data === "string" && data === "pong" && this._pingTimestamp !== null) {
      this._latency = performance.now() - this._pingTimestamp;
      this._pingTimestamp = null;
      return;
    }

    this.emit("message", data);
  }

  private getDataSize(data: WebSocketData): number {
    if (typeof data === "string") return new Blob([data]).size;
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (data instanceof Blob) return data.size;
    return 0;
  }

  /**
   * Gracefully disconnect the WebSocket.
   */
  disconnect(code = 1000, reason = "Client initiated disconnect"): void {
    this._manualClose = true;
    this.stopHeartbeat();

    if (this.ws) {
      if (
        this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING
      ) {
        this.ws.close(code, reason);
      }
      this.ws = null;
    }

    this._connectedAt = null;
  }

  /**
   * Send data through the WebSocket. Auto-stringifies objects.
   */
  send(data: string | object | ArrayBuffer): void {
    this.ensureConnected();

    let payload: string | ArrayBuffer;

    if (typeof data === "object" && !(data instanceof ArrayBuffer)) {
      payload = JSON.stringify(data);
    } else {
      payload = data as string | ArrayBuffer;
    }

    const size = typeof payload === "string" ? new Blob([payload]).size : payload.byteLength;
    this.enforceMaxMessageSize(size);

    this.ws!.send(payload);
    this._messagesSent++;
    this._bytesSent += size;
    this._lastMessageAt = new Date();
  }

  /**
   * Send JSON data.
   */
  sendJson(data: object): void {
    this.send(data);
  }

  /**
   * Send binary data.
   */
  sendBinary(data: ArrayBuffer | Uint8Array): void {
    this.ensureConnected();
    const buffer = data instanceof Uint8Array ? data.buffer : data;
    this.enforceMaxMessageSize(buffer.byteLength);
    this.ws!.send(buffer);
    this._messagesSent++;
    this._bytesSent += buffer.byteLength;
    this._lastMessageAt = new Date();
  }

  private ensureConnected(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected. Call connect() first.");
    }
  }

  private enforceMaxMessageSize(size: number): void {
    if (size > this.options.maxMessageSize!) {
      throw new Error(
        `Message size (${size} bytes) exceeds maximum allowed (${this.options.maxMessageSize} bytes)`,
      );
    }
  }

  /**
   * Register an event listener. Returns an unsubscribe function.
   */
  on(event: WsEvent, handler: WsEventHandler): () => void {
    const handlers = this.listeners.get(event)!;
    handlers.add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Remove an event listener.
   */
  off(event: WsEvent, handler: WsEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Register a one-time event listener that is removed after firing once.
   */
  once(event: WsEvent, handler: WsEventHandler): void {
    this.onceListeners.get(event)!.add(handler);
  }

  private emit(event: WsEvent, ...args: unknown[]): void {
    // Fire persistent listeners
    for (const handler of this.listeners.get(event) ?? []) {
      try {
        (handler as (...a: unknown[]) => void)(...args);
      } catch (err) {
        console.error(`[WS] Error in "${event}" handler:`, err);
      }
    }

    // Fire once listeners and remove them
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers && onceHandlers.size > 0) {
      for (const handler of onceHandlers) {
        try {
          (handler as (...a: unknown[]) => void)(...args);
        } catch (err) {
          console.error(`[WS] Error in once "${event}" handler:`, err);
        }
      }
      onceHandlers.clear();
    }
  }

  /**
   * Get the current connection state.
   */
  getState(): WebSocketState {
    const readyState = this.ws?.readyState ?? WebSocket.CLOSED;
    let status: WebSocketState["status"];

    if (this._reconnectAttempt > 0 && readyState !== WebSocket.OPEN) {
      status = "reconnecting";
    } else {
      status = WS_READY_STATES[readyState] ?? "closed";
    }

    return {
      readyState,
      status,
      connectedAt: this._connectedAt,
      lastMessageAt: this._lastMessageAt,
      reconnectAttempt: this._reconnectAttempt,
    };
  }

  /**
   * Get connection statistics.
   */
  getStats(): WebSocketStats {
    let uptime: number | null = null;
    if (this._connectedAt) {
      uptime = Date.now() - this._connectedAt.getTime();
    }

    return {
      messagesSent: this._messagesSent,
      messagesReceived: this._messagesReceived,
      bytesSent: this._bytesSent,
      bytesReceived: this._bytesReceived,
      latency: this._latency,
      uptime,
      reconnectCount: this._reconnectCount,
    };
  }

  /**
   * Send a ping and measure round-trip latency in milliseconds.
   * Returns the measured latency.
   */
  ping(): number {
    this.ensureConnected();
    this._pingTimestamp = performance.now();
    this.ws!.send("ping");
    return this._latency ?? 0;
  }

  /**
   * Force a reconnection.
   */
  async reconnect(): Promise<void> {
    this.disconnect(4000, "Forced reconnect");
    await this.connect();
  }

  // --- Heartbeat ---

  private startHeartbeat(): void {
    if (this.options.heartbeat === false) return;

    this.stopHeartbeat();
    this._heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ping();
      }
    }, this.options.heartbeat.intervalMs);
  }

  private stopHeartbeat(): void {
    if (this._heartbeatTimer !== null) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  // --- Reconnection ---

  private scheduleReconnect(): void {
    const config = this.options.reconnect as ReconnectConfig;

    if (this._reconnectAttempt >= config.maxAttempts) {
      this.log("Max reconnect attempts reached");
      return;
    }

    this._reconnectAttempt++;
    this._reconnectCount++;

    const delay = calculateReconnectDelay(this._reconnectAttempt - 1, config);
    this.log(`Reconnecting in ${Math.round(delay)}ms (attempt ${this._reconnectAttempt}/${config.maxAttempts})`);

    this.emit("reconnecting", this._reconnectAttempt);

    setTimeout(async () => {
      if (this._manualClose) return;
      try {
        await this.connect();
      } catch {
        // Connection failed — scheduleReconnect will be called again via handleClose
      }
    }, delay);
  }

  /** Clean up all resources. */
  destroy(): void {
    this.disconnect();
    this.listeners.clear();
    this.onceListeners.clear();
  }
}

// ---------------------------------------------------------------------------
// WsRoomManager - Room-based pub/sub over WebSocket
// ---------------------------------------------------------------------------

interface RoomMessage {
  type: "join" | "leave" | "room_message" | "broadcast";
  roomId?: string;
  payload?: unknown;
}

export class WsRoomManager {
  private manager: WebSocketManager;
  private rooms: Set<string> = new Set();

  constructor(manager: WebSocketManager) {
    this.manager = manager;
  }

  /**
   * Join a room by sending a join message.
   */
  join(roomId: string): void {
    this.rooms.add(roomId);
    this.manager.sendJson({ type: "join", roomId });
  }

  /**
   * Leave a room by sending a leave message.
   */
  leave(roomId: string): void {
    this.rooms.delete(roomId);
    this.manager.sendJson({ type: "leave", roomId });
  }

  /**
   * Send data to a specific room.
   */
  sendToRoom(roomId: string, data: unknown): void {
    if (!this.rooms.has(roomId)) {
      throw new Error(`Not joined to room "${roomId}". Call join() first.`);
    }
    this.manager.sendJson({ type: "room_message", roomId, payload: data });
  }

  /**
   * Broadcast data to all joined rooms.
   */
  broadcast(data: unknown): void {
    this.manager.sendJson({ type: "broadcast", payload: data });
  }

  /**
   * Get the list of currently joined rooms.
   */
  getRooms(): string[] {
    return Array.from(this.rooms);
  }

  /**
   * Leave all rooms.
   */
  leaveAll(): void {
    for (const roomId of this.rooms) {
      this.leave(roomId);
    }
  }
}
