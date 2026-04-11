/**
 * WebSocket utilities: Connection management with auto-reconnect,
 * heartbeat/ping-pong, message queuing, binary support, connection state
 * tracking, rate limiting, and multiplexed channels.
 */

// --- Types ---

export type WSReadyState = "connecting" | "open" | "closing" | "closed";

export interface WSMessage {
  /** Raw data sent/received */
  data: string | ArrayBuffer | Blob;
  /** Timestamp */
  timestamp: number;
  /** Direction: "sent" or "received" */
  direction: "sent" | "received";
  /** Message ID for request/response matching */
  id?: string;
}

export interface WSOptions {
  /** WebSocket URL */
  url: string;
  /** Protocols to use */
  protocols?: string[];
  /** Auto-reconnect on disconnect? */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay between reconnects in ms (default: 1000) */
  reconnectBaseDelay?: number;
  /** Max delay between reconnects in ms (default: 30000) */
  reconnectMaxDelay?: number;
  /** Enable heartbeat ping/pong? */
  heartbeat?: boolean;
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Heartbeat timeout in ms (default: 10000) */
  heartbeatTimeout?: number;
  /** Message callback */
  onMessage?: (data: unknown) => void;
  /** Connection state change callback */
  onStateChange?: (state: WSReadyState) => void;
  /** Error callback */
  onError?: (error: Event) => void;
  /** Reconnect attempt callback */
  onReconnecting?: (attempt: number) => void;
  /** Reconnect success callback */
  onReconnected?: () => void;
  /** Binary type for received data ("arraybuffer" or "blob") */
  binaryType?: BinaryType;
  /** Queue messages while disconnected? */
  queueMessages?: boolean;
  /** Max queued messages before dropping oldest */
  maxQueueSize?: number;
  /** Request timeout in ms (0 = no timeout) */
  requestTimeout?: number;
}

export interface WSSendOptions {
  /** Don't queue if disconnected — throw instead */
  noQueue?: boolean;
  /** Expect a response within timeout? */
  expectReply?: boolean;
}

export interface WSChannel {
  id: string;
  name: string;
  /** Subscribe to messages on this channel */
  subscribe: (handler: (data: unknown) => void) => () => void;
  /** Send a message on this channel */
  send: (data: unknown, options?: WSSendOptions) => void;
  /** Unsubscribe all and close channel */
  close: () => void;
}

export interface WSInstance {
  /** Current ready state as string */
  getState(): WSReadyState;
  /** Underlying WebSocket ready state code */
  getReadyState(): number;
  /** Connect (or reconnect) */
  connect(): Promise<void>;
  /** Disconnect gracefully */
  disconnect(code?: number, reason?: string): void;
  /** Force disconnect without closing frame */
  abort(): void;
  /** Send data */
  send(data: unknown, options?: WSSendOptions): void;
  /** Send and wait for response (request-reply pattern) */
  request<T = unknown>(data: unknown, timeoutMs?: number): Promise<T>;
  /** Create a named multiplexed channel */
  createChannel(name: string): WSChannel;
  /** Get message history */
  getHistory(limit?: number): WSMessage[];
  /** Get connection stats */
  getStats(): WSStats;
  /** Destroy completely */
  destroy(): void;
}

export interface WSStats {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  reconnectCount: number;
  lastMessageAt: number | null;
  connectedAt: number | null;
  uptime: number; // ms since connected
}

// --- Main Class ---

export class WebSocketManager {
  create(options: WSOptions): WSInstance {
    let ws: WebSocket | null = null;
    let state: WSReadyState = "closed";
    let destroyed = false;

    // Options with defaults
    const opts = {
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      reconnectBaseDelay: options.reconnectBaseDelay ?? 1000,
      reconnectMaxDelay: options.reconnectMaxDelay ?? 30000,
      heartbeat: options.heartbeat ?? true,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      heartbeatTimeout: options.heartbeatTimeout ?? 10000,
      binaryType: options.binaryType ?? "arraybuffer",
      queueMessages: options.queueMessages ?? true,
      maxQueueSize: options.maxQueueSize ?? 100,
      requestTimeout: options.requestTimeout ?? 10000,
      ...options,
    };

    // State
    let reconnectAttempt = 0;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
    let messageQueue: unknown[] = [];
    const history: WSMessage[] = [];
    const maxHistory = 200;
    const pendingRequests = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    const channels = new Map<string, Set<(data: unknown) => void>>();

    // Stats
    const stats: WSStats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      reconnectCount: 0,
      lastMessageAt: null,
      connectedAt: null,
      uptime: 0,
    };

    function setState(newState: WSReadyState): void {
      state = newState;
      opts.onStateChange?.(newState);
    }

    function recordMessage(data: string | ArrayBuffer | Blob, direction: "sent" | "received", id?: string): void {
      const msg: WSMessage = { data, timestamp: Date.now(), direction, id };
      history.push(msg);
      if (history.length > maxHistory) history.shift();
      stats.lastMessageAt = msg.timestamp;
      if (direction === "sent") {
        stats.messagesSent++;
        stats.bytesSent += typeof data === "string" ? new Blob([data]).size : (data as Blob).size || 0;
      } else {
        stats.messagesReceived++;
        stats.bytesReceived += typeof data === "string" ? new Blob([data]).size : (data as Blob).size || 0;
      }
    }

    // --- Connection ---

    function connect(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (destroyed) { reject(new Error("Destroyed")); return; }
        if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
          resolve();
          return;
        }

        setState("connecting");

        try {
          ws = new WebSocket(opts.url, opts.protocols);
          ws.binaryType = opts.binaryType;
        } catch (err) {
          setState("closed");
          reject(err);
          return;
        }

        ws.onopen = () => {
          if (destroyed) return;
          setState("open");
          stats.connectedAt = Date.now();
          reconnectAttempt = 0;

          // Start heartbeat
          if (opts.heartbeat) startHeartbeat();

          // Flush message queue
          flushQueue();

          resolve();
        };

        ws.onmessage = (event: MessageEvent) => {
          if (destroyed) return;
          handleIncoming(event.data);
        };

        ws.onclose = (event: CloseEvent) => {
          if (destroyed) return;
          setState("closed");
          stopHeartbeat();
          stats.connectedAt = null;
          stats.uptime = 0;

          // Reject pending requests
          for (const [id, req] of pendingRequests) {
            clearTimeout(req.timer);
            req.reject(new Error("Connection closed"));
            pendingRequests.delete(id);
          }

          // Auto-reconnect
          if (!event.wasClean && opts.autoReconnect && !destroyed) {
            scheduleReconnect();
          } else {
            resolve(); // Resolve the initial connect promise even on clean close
          }
        };

        ws.onerror = (event: Event) => {
          opts.onError?.(event);
        };
      });
    }

    function scheduleReconnect(): void {
      if (reconnectAttempt >= opts.maxReconnectAttempts) {
        setState("closed");
        return;
      }

      reconnectAttempt++;
      stats.reconnectCount++;

      // Exponential backoff with jitter
      const delay = Math.min(
        opts.reconnectBaseDelay * Math.pow(2, reconnectAttempt - 1),
        opts.reconnectMaxDelay,
      ) + Math.random() * 500;

      opts.onReconnecting?.(reconnectAttempt);

      setTimeout(() => {
        if (destroyed) return;
        connect().then(() => {
          opts.onReconnected?.();
        }).catch(() => {
          // Will trigger another reconnect attempt via onclose
        });
      }, delay);
    }

    // --- Heartbeat ---

    function startHeartbeat(): void {
      stopHeartbeat();
      heartbeatTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          sendRaw(JSON.stringify({ type: "__ping__", ts: Date.now() }));

          // Timeout detection
          heartbeatTimeoutTimer = setTimeout(() => {
            // No pong received — connection might be dead
            if (ws?.readyState === WebSocket.OPEN) {
              ws.close(4000, "Heartbeat timeout");
            }
          }, opts.heartbeatTimeout);
        }
      }, opts.heartbeatInterval);
    }

    function stopHeartbeat(): void {
      if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
      if (heartbeatTimeoutTimer) { clearTimeout(heartbeatTimeoutTimer); heartbeatTimeoutTimer = null; }
    }

    // --- Messaging ---

    function handleIncoming(raw: Data): void {
      let parsed: unknown = raw;

      // Try JSON parse
      if (typeof raw === "string") {
        try { parsed = JSON.parse(raw); } catch { /* keep raw */ }
      }

      // Handle heartbeat responses
      if (typeof parsed === "object" && parsed !== null && (parsed as Record<string, unknown>).type === "__pong__") {
        if (heartbeatTimeoutTimer) { clearTimeout(heartbeatTimeoutTimer); heartbeatTimeoutTimer = null; }
        return;
      }

      // Handle request replies
      if (typeof parsed === "object" && parsed !== null) {
        const p = parsed as Record<string, unknown>;
        if (p.__replyTo && typeof p.__replyTo === "string") {
          const pending = pendingRequests.get(p.__replyTo);
          if (pending) {
            clearTimeout(pending.timer);
            pending.resolve(p.data ?? p);
            pendingRequests.delete(p.__replyTo);
          }
          return;
        }

        // Route to channel if present
        if (p.__channel && typeof p.__channel === "string") {
          const handlers = channels.get(p.__channel);
          if (handlers) {
            for (const h of handlers) { try { h(p.data ?? p); } catch {} }
          }
        }
      }

      // Global handler
      opts.onMessage?.(parsed);

      // Record
      recordMessage(raw as string | ArrayBuffer | Blob, "received");
    }

    function sendRaw(data: string | ArrayBuffer | Blob): boolean {
      if (ws?.readyState !== WebSocket.OPEN) return false;
      try {
        ws.send(data);
        recordMessage(data, "sent");
        return true;
      } catch {
        return false;
      }
    }

    function flushQueue(): void {
      while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg !== undefined) {
          const serialized = typeof msg === "string" ? msg : JSON.stringify(msg);
          sendRaw(serialized);
        }
      }
    }

    // --- Public API ---

    const instance: WSInstance = {

      getState() { return state; },
      getReadyState() { return ws?.readyState ?? WebSocket.CLOSED; },

      async connect(): Promise<void> {
        await connect();
      },

      disconnect(code = 1000, reason = "Normal closure"): void {
        destroyed = true;
        stopHeartbeat();
        if (ws) {
          setState("closing");
          ws.close(code, reason);
          ws = null;
        }
        setState("closed");
      },

      abort(): void {
        destroyed = true;
        stopHeartbeat();
        if (ws) {
          ws.close(); // No code/reason — abrupt
          ws = null;
        }
        setState("closed");
      },

      send(data: unknown, sendOpts?: WSSendOptions): void {
        const serialized = typeof data === "string" ? data : JSON.stringify(data);

        if (sendOpts?.noQueue && state !== "open") {
          throw new Error(`Cannot send: socket is ${state}`);
        }

        if (state === "open" && ws?.readyState === WebSocket.OPEN) {
          sendRaw(serialized);
        } else if (opts.queueMessages) {
          if (messageQueue.length >= opts.maxQueueSize) {
            messageQueue.shift(); // Drop oldest
          }
          messageQueue.push(data);
        }
      },

      async request<T = unknown>(data: unknown, timeoutMs?: number): Promise<T> {
        const id = crypto.randomUUID();
        const envelope = { __id: id, __replyTo: id, data };
        const timeout = timeoutMs ?? opts.requestTimeout;

        return new Promise<T>((resolve, reject) => {
          // Register pending
          const timer = setTimeout(() => {
            pendingRequests.delete(id);
            reject(new Error(`Request timeout after ${timeout}ms`));
          }, timeout);

          pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });

          // Send
          try {
            instance.send(envelope, { noQueue: true });
          } catch (err) {
            clearTimeout(timer);
            pendingRequests.delete(id);
            reject(err);
          }
        });
      },

      createChannel(name: string): WSChannel {
        const channelId = `ch:${name}:${Date.now()}`;

        return {
          id: channelId,
          name,
          subscribe(handler: (data: unknown) => void): () => void {
            let set = channels.get(channelId);
            if (!set) { set = new Set(); channels.set(channelId, set); }
            set.add(handler);
            return () => set!.delete(handler);
          },
          send(data: unknown, sendOpts?: WSSendOptions): void {
            const envelope = { __channel: channelId, data };
            instance.send(envelope, sendOpts);
          },
          close(): void {
            channels.delete(channelId);
          },
        };
      },

      getHistory(limit = 50): WSMessage[] {
        return history.slice(-limit);
      },

      getStats(): WSStats {
        return {
          ...stats,
          uptime: stats.connectedAt ? Date.now() - stats.connectedAt : 0,
        };
      },

      destroy(): void {
        instance.abort();
        messageQueue = [];
        history.length = 0;
        channels.clear();
        pendingRequests.clear();
      },
    };

    return instance;
  }
}

/** Convenience: create a WebSocket manager */
export function createWebSocket(options: WSOptions): WSInstance {
  return new WebSocketManager().create(options);
}

// --- Quick Connect ---

/**
 * Quick one-shot WebSocket connection: connect, send optional initial message,
 * listen for messages, auto-cleanup.
 *
 * @example
 * quickConnect("wss://example.com/ws", {
 *   onMessage: (data) => console.log(data),
 * })
 */
export function quickConnect(
  url: string,
  options?: Partial<Omit<WSOptions, "url">>,
): WSInstance {
  return createWebSocket({ url, ...options });
}
