/**
 * WebSocket Realtime: Advanced real-time communication layer with auto-reconnect,
 * room management, presence tracking, data synchronization, structured messaging,
 * transport abstraction, security, reconnection strategies.
 */

// --- Types ---

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting" | "closing";

export interface ConnectionMetrics {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  reconnectCount: number;
  lastMessageAt: number;
  connectedAt?: number;
  averageLatency: number;
  uptime: number;
}

export interface ReconnectStrategy {
  type: "fixed" | "linear" | "exponential" | "exponential-jitter";
  baseDelay: number;       // ms
  maxDelay: number;        // ms
  maxAttempts?: number;     // 0 = infinite
  jitterFactor?: number;    // 0-1 for exponential-jitter
}

export interface RoomInfo {
  id: string;
  name?: string;
  members: Set<string>;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface PresenceData {
  userId: string;
  status: "online" | "away" | "busy" | "offline";
  lastSeen: number;
  cursor?: { x: number; y: number };
  typing?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SyncOperation {
  type: "set" | "delete" | "merge" | "increment" | "array-push" | "array-remove";
  path: string;
  value?: unknown;
  timestamp: number;
  version: number;
  clientId: string;
}

export interface MessageEnvelope {
  id: string;
  type: MessageType;
  timestamp: number;
  senderId: string;
  roomId?: string;
  payload: unknown;
  version?: number;
  ackRequested?: boolean;
  compressed?: boolean;
}

export type MessageType =
  | "JOIN" | "LEAVE"
  | "MESSAGE" | "BROADCAST"
  | "PRESENCE_UPDATE"
  | "SYNC_OP" | "SYNC_STATE"
  | "ACK" | "NACK"
  | "PING" | "PONG"
  | "REQUEST" | "RESPONSE"
  | "ERROR"
  | "AUTH" | "AUTH_RESPONSE";

// --- Reconnection Strategy ---

class BackoffCalculator {
  private attempts = 0;

  reset(): void { this.attempts = 0; }

  getNextDelay(strategy: ReconnectStrategy): number {
    const { type, baseDelay, maxDelay, jitterFactor = 0.3 } = strategy;
    let delay: number;

    switch (type) {
      case "fixed":
        delay = baseDelay;
        break;
      case "linear":
        delay = baseDelay * (this.attempts + 1);
        break;
      case "exponential":
        delay = baseDelay * Math.pow(2, this.attempts);
        break;
      case "exponential-jitter":
        const expDelay = baseDelay * Math.pow(2, this.attempts);
        delay = expDelay + (Math.random() - 0.5) * 2 * expDelay * jitterFactor;
        break;
      default:
        delay = baseDelay;
    }

    this.attempts++;
    return Math.min(delay, maxDelay);
  }

  getAttemptCount(): number { return this.attempts; }
}

// --- Realtime Client ---

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "disconnected";
  private url: string;
  private backoff = new BackoffCalculator();
  private reconnectStrategy: ReconnectStrategy;
  private messageQueue: unknown[] = [];
  private pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private listeners = new Map<MessageType | "*", Set<(msg: MessageEnvelope) => void>>();
  private stateListeners = new Set<(state: ConnectionState) => void>();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatIntervalMs = 30000;
  private metrics: ConnectionMetrics = this.createEmptyMetrics();
  private messageIdCounter = 0;
  private clientId: string;
  private autoReconnect = true;
  private connectTimeout = 10000;
  private pingTimeout = 5000;
  private lastPongAt = 0;
  private pingTimer: ReturnType<typeof setTimeout> | null = null;
  private bufferDuringDisconnect = true;
  private authToken?: string;

  constructor(url: string, options?: Partial<RealtimeClientOptions>) {
    this.url = url;
    this.clientId = `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.reconnectStrategy = options?.reconnectStrategy ?? {
      type: "exponential-jitter", baseDelay: 500, maxDelay: 30000,
    };
    if (options?.autoReconnect !== undefined) this.autoReconnect = options.autoReconnect;
    if (options?.heartbeatInterval) this.heartbeatIntervalMs = options.heartbeatInterval;
    if (options?.authToken) this.authToken = options.authToken;
  }

  /** Connect to the server */
  async connect(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") return;
    this.setState("connecting");

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Connection timeout")), this.connectTimeout);

        try {
          this.ws = new WebSocket(this.url);
        } catch (e) {
          clearTimeout(timer);
          reject(e);
          return;
        }

        this.ws.onopen = () => {
          clearTimeout(timer);
          this.onConnected();
          resolve();
        };

        this.ws.onclose = (event) => {
          clearTimeout(timer);
          this.onDisconnected(event.code, event.reason);
        };

        this.ws.onerror = (_event) => {
          clearTimeout(timer);
          // Don't reject here - onclose will fire with more info
        };

        this.ws.onmessage = (event) => {
          try {
            const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
            this.handleMessage(data as MessageEnvelope);
            this.metrics.messagesReceived++;
            this.metrics.bytesReceived += (typeof event.data === "string" ? event.data.length : (event.data as ArrayBuffer).byteLength);
            this.metrics.lastMessageAt = Date.now();
          } catch {}
        };
      });
    } catch (err) {
      this.setState("disconnected");
      if (this.autoReconnect) this.scheduleReconnect();
      throw err;
    }
  }

  /** Disconnect from server */
  disconnect(code = 1000, reason = "Client disconnect"): void {
    this.autoReconnect = false;
    this.cleanupHeartbeat();
    if (this.ws) { this.ws.close(code, reason); this.ws = null; }
    this.setState("disconnected");
  }

  /** Send a message (fire and forget) */
  send(type: MessageType, payload: unknown, roomId?: string): void {
    const envelope: MessageEnvelope = {
      id: this.generateId(),
      type, timestamp: Date.now(), senderId: this.clientId, roomId, payload,
    };

    if (this.state === "connected" && this.ws?.readyState === WebSocket.OPEN) {
      this.rawSend(envelope);
    } else if (this.bufferDuringDisconnect) {
      this.messageQueue.push(envelope);
    }
  }

  /** Send and wait for response */
  async request<T = unknown>(type: MessageType, payload: unknown, timeout = 15000): Promise<T> {
    const requestId = `req-${this.generateId()}`;
    const envelope: MessageEnvelope = {
      id: requestId, type, timestamp: Date.now(), senderId: this.clientId, payload, ackRequested: true,
    };

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${type} (${timeout}ms)`));
      }, timeout);

      this.pendingRequests.set(requestId, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });

      if (this.state === "connected" && this.ws?.readyState === WebSocket.OPEN) {
        this.rawSend(envelope);
      } else {
        this.messageQueue.push(envelope);
      }
    });
  }

  /** Listen for specific message types */
  on(type: MessageType | "*", listener: (msg: MessageEnvelope) => void): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  /** Listen for connection state changes */
  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /** Get current connection state */
  getState(): ConnectionState { return this.state; }

  /** Get connection metrics */
  getMetrics(): ConnectionMetrics {
    const now = Date.now();
    return {
      ...this.metrics,
      uptime: this.metrics.connectedAt ? now - this.metrics.connectedAt : 0,
      averageLatency: this.metrics.averageLatency,
    };
  }

  /** Flush queued messages */
  flushQueue(): number {
    if (this.state !== "connected") return 0;
    let sent = 0;
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      this.rawSend(msg as MessageEnvelope);
      sent++;
    }
    return sent;
  }

  /** Get client ID */
  getClientId(): string { return this.clientId; }

  /** Update auth token */
  setAuthToken(token: string): void { this.authToken = token; }

  /** Configure reconnection strategy */
  setReconnectStrategy(strategy: Partial<ReconnectStrategy>): void {
    Object.assign(this.reconnectStrategy, strategy);
    this.backoff.reset();
  }

  // --- Internal ---

  private onConnected(): void {
    this.setState("connected");
    this.backoff.reset();
    this.metrics.connectedAt = Date.now();

    // Send auth if token present
    if (this.authToken) {
      this.send("AUTH", { token: this.authToken });
    }

    // Start heartbeat
    this.startHeartbeat();

    // Flush queued messages
    this.flushQueue();
  }

  private onDisconnected(_code: number, _reason: string): void {
    this.cleanupHeartbeat();
    this.setState(this.autoReconnect ? "reconnecting" : "disconnected");

    // Reject pending requests
    for (const [, entry] of this.pendingRequests) {
      clearTimeout(entry.timer);
      entry.reject(new Error("Connection lost"));
    }
    this.pendingRequests.clear();

    if (this.autoReconnect) this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    const delay = this.backoff.getNextDelay(this.reconnectStrategy);
    const maxAttempts = this.reconnectStrategy.maxAttempts ?? 0;
    if (maxAttempts > 0 && this.backoff.getAttemptCount() >= maxAttempts) {
      this.setState("disconnected");
      return;
    }

    setTimeout(() => {
      if (this.state !== "disconnected") this.connect().catch(() => {});
    }, delay);
  }

  private startHeartbeat(): void {
    this.lastPongAt = Date.now();
    this.heartbeatInterval = setInterval(() => {
      if (this.state === "connected") {
        this.send("PING", { ts: Date.now() });
        // Check for pong timeout
        this.pingTimer = setTimeout(() => {
          console.warn("[Realtime] Pong timeout - closing connection");
          this.ws?.close(4001, "Ping timeout");
        }, this.pingTimeout);
      }
    }, this.heartbeatIntervalMs);
  }

  private cleanupHeartbeat(): void {
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
    if (this.pingTimer) { clearTimeout(this.pingTimer); this.pingTimer = null; }
  }

  private handleMessage(msg: MessageEnvelope): void {
    switch (msg.type) {
      case "PONG":
        if (this.pingTimer) { clearTimeout(this.pingTimer); this.pingTimer = null; }
        this.lastPongAt = Date.now();
        if (typeof msg.payload === "object" && msg.payload !== null) {
          const p = msg.payload as Record<string, unknown>;
          if (typeof p.ts === "number") {
            const latency = Date.now() - p.ts;
            this.metrics.averageLatency = this.metrics.averageLatency === 0
              ? latency : this.metrics.averageLatency * 0.9 + latency * 0.1;
          }
        }
        break;

      case "ACK":
        // Resolve pending request
        if (msg.payload && typeof msg.payload === "object") {
          const p = msg.payload as Record<string, unknown>;
          const reqId = p.requestId as string;
          if (reqId && this.pendingRequests.has(reqId)) {
            const entry = this.pendingRequests.get(reqId)!;
            clearTimeout(entry.timer);
            this.pendingRequests.delete(reqId);
            entry.resolve(p.data ?? p);
          }
        }
        break;

      case "NACK":
        if (msg.payload && typeof msg.payload === "object") {
          const p = msg.payload as Record<string, unknown>;
          const reqId = p.requestId as string;
          if (reqId && this.pendingRequests.has(reqId)) {
            const entry = this.pendingRequests.get(reqId)!;
            clearTimeout(entry.timer);
            this.pendingRequests.delete(reqId);
            entry.reject(new Error((p.error as string) ?? "Request rejected"));
          }
        }
        break;

      default:
        // Emit to listeners
        this.emit(msg.type, msg);
        this.emit("*", msg);
    }
  }

  private rawSend(envelope: MessageEnvelope): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(envelope);
      this.ws.send(data);
      this.metrics.messagesSent++;
      this.metrics.bytesSent += data.length;
    }
  }

  private emit(type: MessageType | "*", msg: MessageEnvelope): void {
    for (const listener of this.listeners.get(type) ?? []) listener(msg);
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    for (const l of this.stateListeners) l(state);
  }

  private generateId(): string {
    return `${this.clientId}-${++this.messageIdCounter}-${Date.now().toString(36)}`;
  }

  private createEmptyMetrics(): ConnectionMetrics {
    return { messagesSent: 0, messagesReceived: 0, bytesSent: 0, bytesReceived: 0, reconnectCount: 0, lastMessageAt: 0, averageLatency: 0, uptime: 0 };
  }

  destroy(): void {
    this.disconnect();
    this.listeners.clear();
    this.stateListeners.clear();
    this.messageQueue.length = 0;
  }
}

interface RealtimeClientOptions {
  reconnectStrategy?: ReconnectStrategy;
  autoReconnect?: boolean;
  heartbeatInterval?: number;
  authToken?: string;
}

// --- Room Manager ---

export class RoomManager {
  private client: RealtimeClient;
  private rooms = new Map<string, RoomInfo>();
  private joinedRooms = new Set<string>();
  private roomListeners = new Map<string, Set<(event: RoomEvent) => void>>();

  constructor(client: RealtimeClient) { this.client = client; }

  /** Join a room */
  async join(roomId: string, options?: { name?: string; metadata?: Record<string, unknown> }): Promise<RoomInfo> {
    if (this.joinedRooms.has(roomId)) return this.rooms.get(roomId)!;

    const result = await this.client.request<RoomInfo>("JOIN", { roomId, ...options });
    const room: RoomInfo = {
      id: roomId, name: options?.name, members: new Set(), createdAt: Date.now(), metadata: options?.metadata,
    };
    this.rooms.set(roomId, room);
    this.joinedRooms.add(roomId);
    return room;
  }

  /** Leave a room */
  async leave(roomId: string): Promise<void> {
    if (!this.joinedRooms.has(roomId)) return;
    this.client.send("LEAVE", { roomId });
    this.joinedRooms.delete(roomId);
    this.rooms.delete(roomId);
  }

  /** Leave all rooms */
  async leaveAll(): Promise<void> {
    for (const roomId of [...this.joinedRooms]) await this.leave(roomId);
  }

  /** Get room info */
  getRoom(roomId: string): RoomInfo | undefined { return this.rooms.get(roomId); }

  /** Get joined rooms */
  getJoinedRooms(): string[] { return Array.from(this.joinedRooms); }

  /** Send message to a room */
  sendToRoom(roomId: string, payload: unknown): void {
    this.client.send("MESSAGE", payload, roomId);
  }

  /** Broadcast to all joined rooms */
  broadcast(payload: unknown): void {
    for (const roomId of this.joinedRooms) this.sendToRoom(roomId, payload);
  }

  /** Listen for room events */
  onRoomEvent(roomId: string, listener: (event: RoomEvent) => void): () => void {
    if (!this.roomListeners.has(roomId)) this.roomListeners.set(roomId, new Set());
    this.roomListeners.get(roomId)!.add(listener);
    return () => this.roomListeners.get(roomId)?.delete(listener);
  }

  /** Get member count in a room */
  getMemberCount(roomId: string): number { return this.rooms.get(roomId)?.members.size ?? 0; }
}

interface RoomEvent {
  type: "member_joined" | "member_left" | "message" | "sync";
  roomId: string;
  userId?: string;
  data?: unknown;
}

// --- Presence System ---

export class PresenceSystem {
  private client: RealtimeClient;
  private presences = new Map<string, PresenceData>();
  private ttl = 30000; // 30s default TTL
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(userId: string, presence: PresenceData) => void>();

  constructor(client: RealtimeClient) {
    this.client = client;
    this.client.on("PRESENCE_UPDATE", (msg) => {
      const data = msg.payload as PresenceData & { userId: string };
      if (data.userId) {
        this.presences.set(data.userId, data);
        for (const l of this.listeners) l(data.userId, data);
      }
    });
  }

  /** Initialize presence system */
  start(cleanupIntervalMs = 30000): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    // Announce our own presence
    this.updatePresence({ status: "online" });
  }

  /** Stop presence system */
  stop(): void {
    if (this.cleanupInterval) { clearInterval(this.cleanupInterval); this.cleanupInterval = null; }
  }

  /** Update own presence */
  updatePresence(updates: Partial<PresenceData>): void {
    this.client.send("PRESENCE_UPDATE", { ...updates, lastSeen: Date.now() });
  }

  /** Set typing indicator */
  setTyping(roomId: string, isTyping = true): void {
    this.updatePresence({ typing: isTyping });
    this.client.send("PRESENCE_UPDATE", { typing: isTyping, roomId }, roomId);
  }

  /** Update cursor position */
  updateCursor(x: number, y: number, roomId?: string): void {
    this.updatePresence({ cursor: { x, y } });
    if (roomId) this.client.send("PRESENCE_UPDATE", { cursor: { x, y } }, roomId);
  }

  /** Get user's presence */
  getPresence(userId: string): PresenceData | undefined { return this.presences.get(userId); }

  /** Get all online users */
  getOnlineUsers(): string[] {
    return Array.from(this.presences.entries())
      .filter(([, p]) => p.status !== "offline")
      .map(([id]) => id);
  }

  /** Get users in a room (would need server-side support) */
  getUsersInRoom(roomId: string): string[] {
    return this.getOnlineUsers(); // Simplified - real impl would filter by room
  }

  /** Listen for presence changes */
  onChange(listener: (userId: string, presence: PresenceData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Set TTL for presence entries */
  setTTL(ms: number): void { this.ttl = ms; }

  private cleanup(): void {
    const cutoff = Date.now() - this.ttl;
    for (const [userId, presence] of this.presences) {
      if (presence.lastSeen < cutoff) {
        this.presences.set(userId, { ...presence, status: "offline" });
        for (const l of this.listeners) l(userId, presence);
      }
    }
  }

  destroy(): void { this.stop(); this.presences.clear(); this.listeners.clear(); }
}

// --- Data Synchronization ---

export class SyncEngine {
  private client: RealtimeClient;
  private documents = new Map<string, SyncDocument>();
  private versionVectors = new Map<string, Map<string, number>>();
  private listeners = new Set<(docId: string, op: SyncOperation) => void>();

  constructor(client: RealtimeClient) {
    this.client = client;
    this.client.on("SYNC_OP", (msg) => {
      const op = msg.payload as SyncOperation;
      if (op && op.path) this.applyOperation(op);
    });
  }

  /** Create or get a sync document */
  getDocument(docId: string): SyncDocument {
    let doc = this.documents.get(docId);
    if (!doc) {
      doc = new SyncDocument(docId);
      this.documents.set(docId, doc);
      if (!this.versionVectors.has(docId)) this.versionVectors.set(docId, new Map());
    }
    return doc;
  }

  /** Apply local operation and broadcast */
  applyLocal(docId: string, op: Omit<SyncOperation, "timestamp" | "version" | "clientId">): void {
    const doc = this.getDocument(docId);
    const vv = this.versionVectors.get(docId)!;
    const myVersion = (vv.get(this.client.getClientId()) ?? 0) + 1;
    vv.set(this.client.getClientId(), myVersion);

    const fullOp: SyncOperation = {
      ...op, timestamp: Date.now(), version: myVersion, clientId: this.client.getClientId(),
    };

    doc.apply(fullOp);
    this.client.send("SYNC_OP", { docId, operation: fullOp });

    for (const l of this.listeners) l(docId, fullOp);
  }

  /** Get document value */
  getValue(docId: string, path?: string): unknown {
    const doc = this.getDocument(docId);
    return doc.get(path);
  }

  /** Set a value (convenience) */
  set(docId: string, path: string, value: unknown): void {
    this.applyLocal(docId, { type: "set", path, value });
  }

  /** Delete a key (convenience) */
  delete(docId: string, path: string): void {
    this.applyLocal(docId, { type: "delete", path });
  }

  /** Merge into object (convenience) */
  merge(docId: string, path: string, value: Record<string, unknown>): void {
    this.applyLocal(docId, { type: "merge", path, value });
  }

  /** Increment a counter (convenience) */
  increment(docId: string, path: string, amount = 1): void {
    this.applyLocal(docId, { type: "increment", path, value: amount });
  }

  /** Push to array (convenience) */
  arrayPush(docId: string, path: string, item: unknown): void {
    this.applyLocal(docId, { type: "array-push", path, value: item });
  }

  /** Remove from array (convenience) */
  arrayRemove(docId: string, path: string, index: number): void {
    this.applyLocal(docId, { type: "array-remove", path, value: index });
  }

  /** Listen for remote operations */
  onSync(listener: (docId: string, op: SyncOperation) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Request full state sync */
  async requestState(docId: string): Promise<unknown> {
    return this.client.request("SYNC_STATE", { docId });
  }

  /** Get version vector for a document */
  getVersionVector(docId: string): Map<string, number> {
    return new Map(this.versionVectors.get(docId));
  }

  private applyOperation(op: SyncOperation): void {
    const doc = this.documents.get(op.path.split(".")[0] ?? "");
    if (doc) { doc.apply(op); for (const l of this.listeners) l(op.path.split(".")[0]!, op); }
  }

  destroy(): void { this.documents.clear(); this.versionVectors.clear(); this.listeners.clear(); }
}

/** In-memory sync document */
class SyncDocument {
  constructor(public id: string, private data: Record<string, unknown> = {}) {}

  apply(op: SyncOperation): void {
    switch (op.type) {
      case "set": this.setAtPath(op.path, op.value); break;
      case "delete": this.deleteAtPath(op.path); break;
      case "merge": this.mergeAtPath(op.path, op.value as Record<string, unknown>); break;
      case "increment": this.incrementAtPath(op.path, op.value as number); break;
      case "array-push": this.arrayPushAtPath(op.path, op.value); break;
      case "array-remove": this.arrayRemoveAtPath(op.path, op.value as number); break;
    }
  }

  get(path?: string): unknown {
    if (!path) return { ...this.data };
    return this.getValueAtPath(path);
  }

  private setAtPath(path: string, value: unknown): void {
    const parts = path.split(".");
    let current: Record<string, unknown> = this.data;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]!] = value;
  }

  private deleteAtPath(path: string): void {
    const parts = path.split(".");
    if (parts.length === 1) { delete this.data[parts[0]!]; return; }
    const parent = this.getValueAtPath(parts.slice(0, -1).join(".")) as Record<string, unknown> | undefined;
    if (parent && typeof parent === "object") delete parent[parts[parts.length - 1]!];
  }

  private mergeAtPath(path: string, value: Record<string, unknown>): void {
    const existing = this.getValueAtPath(path) as Record<string, unknown> | undefined;
    if (existing && typeof existing === "object") Object.assign(existing, value);
    else this.setAtPath(path, value);
  }

  private incrementAtPath(path: string, amount: number): void {
    const existing = this.getValueAtPath(path) as number | undefined;
    this.setAtPath(path, (existing ?? 0) + amount);
  }

  private arrayPushAtPath(path: string, item: unknown): void {
    const arr = this.getValueAtPath(path) as unknown[] | undefined;
    if (Array.isArray(arr)) arr.push(item);
    else this.setAtPath(path, [item]);
  }

  private arrayRemoveAtPath(path: string, index: number): void {
    const arr = this.getValueAtPath(path) as unknown[] | undefined;
    if (Array.isArray(arr) && index >= 0 && index < arr.length) arr.splice(index, 1);
  }

  private getValueAtPath(path: string): unknown {
    const parts = path.split(".");
    let current: unknown = this.data;
    for (const part of parts) {
      if (current == null || typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
}

// --- Security Utilities ---

export function signMessage(message: MessageEnvelope, secret: string): MessageEnvelope {
  const payload = JSON.stringify({ ...message, signature: undefined });
  // Simple HMAC-like signing (in production use Web Crypto API)
  let hash = 0;
  for (let i = 0; i < secret.length; i++) hash = ((hash << 5) - hash + secret.charCodeAt(i)) | 0;
  for (let i = 0; i < payload.length; i++) hash = ((hash << 5) - hash + payload.charCodeAt(i)) | 0;
  return { ...message, signature: (hash >>> 0).toString(16) };
}

export function verifySignature(message: MessageEnvelope, secret: string): boolean {
  if (!message.signature) return false;
  const expected = signMessage({ ...message, signature: undefined }, secret).signature;
  return message.signature === expected;
}

export function rateLimitByConnection(clientId: string, windowMs = 1000, maxMessages = 50): RateLimitResult {
  const key = `rl-${clientId}`;
  const store = rateLimitStore;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxMessages - 1, retryAfter: 0 };
  }

  if (now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxMessages - 1, retryAfter: 0 };
  }

  if (entry.count >= maxMessages) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, remaining: maxMessages - entry.count, retryAfter: 0 };
}

interface RateLimitEntry { count: number; resetAt: number }
interface RateLimitResult { allowed: boolean; remaining: number; retryAfter: number }
const rateLimitStore = new Map<string, RateLimitEntry>();

// --- Utility Functions ---

/** Create a complete realtime client with all subsystems */
export function createRealtimeClient(url: string, options?: RealtimeClientOptions): {
  client: RealtimeClient;
  rooms: RoomManager;
  presence: PresenceSystem;
  sync: SyncEngine;
} {
  const client = new RealtimeClient(url, options);
  return {
    client,
    rooms: new RoomManager(client),
    presence: new PresenceSystem(client),
    sync: new SyncEngine(client),
  };
}
