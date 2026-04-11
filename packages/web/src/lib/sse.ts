/**
 * Server-Sent Events (SSE) Client: Full-featured SSE client with
 * auto-reconnect, event filtering, last-event-id tracking,
 * exponential backoff, heartbeat monitoring, message buffering,
 * and multi-source aggregation.
 */

// --- Types ---

export interface SseConfig {
  /** SSE endpoint URL */
  url: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Auth token (Bearer) */
  authToken?: string;
  /** Request body (for POST-based SSE) */
  body?: string;
  /** HTTP method (default: "GET") */
  method?: "GET" | "POST";
  /** Reconnect config */
  reconnect?: {
    /** Enable auto-reconnect (default: true) */
    enabled?: boolean;
    /** Initial delay in ms (default: 1000) */
    initialDelay?: number;
    /** Maximum delay in ms (default: 30000) */
    maxDelay?: number;
    /** Backoff multiplier (default: 2) */
    backoffFactor?: number;
    /** Jitter factor (0-1, default: 0.2) */
    jitter?: number;
    /** Max retry attempts (-1 = infinite, default: -1) */
    maxAttempts?: number;
  };
  /** Heartbeat config */
  heartbeat?: {
    /** Expected interval in ms (default: 30000) */
    intervalMs?: number;
    /** Tolerance in ms (default: 10000) */
    toleranceMs?: number;
  };
  /** Last event ID to resume from */
  lastEventId?: string;
  /** Event types to listen for (empty = all) */
  eventTypes?: string[];
  /** Enable debug logging */
  debug?: boolean;
  /** Abort signal for external cancellation */
  signal?: AbortSignal;
}

export interface SseMessage {
  /** Event type (default: "message") */
  event: string;
  /** Data payload */
  data: string;
  /** Event ID */
  id: string | null;
  /** Origin URL */
  origin: string;
  /** Timestamp when received */
  timestamp: number;
  /** Retry hint from server */
  retry: number | null;
}

export interface SseConnectionState {
  /** Current state */
  state: "connecting" | "open" | "closed" | "reconnecting" | "error";
  /** URL being connected to */
  url: string;
  /** ReadyState of EventSource/fetch */
  readyState: number;
  /** Number of reconnection attempts */
  reconnectAttempt: number;
  /** Last connected timestamp */
  lastConnectedAt: number | null;
  /** Last error */
  lastError: Error | null;
  /** Messages received count */
  messagesReceived: number;
  /** Bytes received estimate */
  bytesReceived: number;
  /** Last event ID */
  lastEventId: string | null;
}

export type SseEventHandler = (message: SseMessage) => void;
export type SseStateHandler = (state: SseConnectionState) => void;
export type SseErrorHandler = (error: Error) => void;

// --- Internal Types ---

interface ReconnectConfig {
  enabled: boolean;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: number;
  maxAttempts: number;
}

interface HeartbeatConfig {
  intervalMs: number;
  toleranceMs: number;
}

// --- Main Client ---

export class SseClient {
  private config: Required<SseConfig> & { method: "GET" | "POST"; reconnect: ReconnectConfig; heartbeat: HeartbeatConfig };
  private eventSource: EventSource | null = null;
  private abortController: AbortController | null = null;
  private currentState: SseConnectionState["state"] = "closed";
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private lastMessageTime = 0;
  private messagesReceived = 0;
  private bytesReceived = 0;
  private lastError: Error | null = null;
  private lastConnectedAt: number | null = null;
  private currentLastEventId: string | null = null;
  private listeners = new Map<string, Set<SseEventHandler>>();
  private stateListeners = new Set<SseStateHandler>();
  private errorListeners = new Set<SseErrorHandler>();
  private messageBuffer: SseMessage[] = [];
  private bufferMaxSize = 100;
  private destroyed = false;
  private externalAbortListener: (() => void) | null = null;

  constructor(config: SseConfig) {
    this.config = {
      method: config.method ?? "GET",
      debug: false,
      reconnect: {
        enabled: true,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
        jitter: 0.2,
        maxAttempts: -1,
        ...config.reconnect,
      },
      heartbeat: {
        intervalMs: 30000,
        toleranceMs: 10000,
        ...config.heartbeat,
      },
      ...config,
    };

    this.currentLastEventId = config.lastEventId ?? null;

    // Listen for external abort
    if (config.signal) {
      this.externalAbortListener = () => this.close();
      config.signal.addEventListener("abort", this.externalAbortListener);
    }
  }

  // --- Connection Management ---

  /** Connect to the SSE endpoint */
  connect(): void {
    if (this.destroyed) {
      if (this.config.debug) console.error("[SSE] Cannot connect: client destroyed");
      return;
    }

    if (this.currentState === "open" || this.currentState === "connecting") {
      if (this.config.debug) console.log("[SSE] Already connecting or connected");
      return;
    }

    this.setState("connecting");

    if (this.config.method === "POST") {
      this.connectWithFetch();
    } else {
      this.connectWithEventSource();
    }
  }

  /** Disconnect from the SSE endpoint */
  close(): void {
    this.cleanup();
    this.setState("closed");
    if (this.config.debug) console.log("[SSE] Connection closed");
  }

  /** Destroy the client completely (cannot reconnect) */
  destroy(): void {
    this.destroyed = true;
    this.close();
    this.listeners.clear();
    this.stateListeners.clear();
    this.errorListeners.clear();
    this.messageBuffer = [];

    if (this.externalAbortListener && this.config.signal) {
      this.config.signal.removeEventListener("abort", this.externalAbortListener);
    }
  }

  // --- Event Handling ---

  /** Subscribe to a specific event type */
  on(event: string, handler: SseEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  /** Subscribe to all events (wildcard) */
  onMessage(handler: SseEventHandler): () => void {
    return this.on("*", handler);
  }

  /** Subscribe to connection state changes */
  onStateChange(handler: SseStateHandler): () => void {
    this.stateListeners.add(handler);
    handler(this.getState());
    return () => this.stateListeners.delete(handler);
  }

  /** Subscribe to errors */
  onError(handler: SseErrorHandler): () => void {
    this.errorListeners.add(handler);
    return () => this.errorListeners.delete(handler);
  }

  /** Remove all listeners for an event type */
  off(event: string): void {
    this.listeners.delete(event);
  }

  /** Get buffered messages (received before subscription) */
  getBufferedMessages(): SseMessage[] {
    return [...this.messageBuffer];
  }

  /** Clear the message buffer */
  clearBuffer(): void {
    this.messageBuffer = [];
  }

  // --- State ---

  /** Get current connection state */
  getState(): SseConnectionState {
    return {
      state: this.currentState,
      url: this.config.url,
      readyState: this.eventSource?.readyState ?? (this.abortController ? (this.currentState === "open" ? 1 : 0) : 2),
      reconnectAttempt: this.reconnectAttempt,
      lastConnectedAt: this.lastConnectedAt,
      lastError: this.lastError,
      messagesReceived: this.messagesReceived,
      bytesReceived: this.bytesReceived,
      lastEventId: this.currentLastEventId,
    };
  }

  /** Check if currently connected */
  isConnected(): boolean {
    return this.currentState === "open";
  }

  /** Get the current last-event-id */
  getLastEventId(): string | null {
    return this.currentLastEventId;
  }

  // --- Private: EventSource connection ---

  private connectWithEventSource(): void {
    try {
      let url = this.config.url;

      // Append last-event-id as query param
      if (this.currentLastEventId) {
        const sep = url.includes("?") ? "&" : "?";
        url += `${sep}lastEventId=${encodeURIComponent(this.currentLastEventId)}`;
      }

      this.eventSource = new EventSource(url, {
        withCredentials: false,
      });

      this.eventSource.onopen = () => {
        this.onOpen();
      };

      this.eventSource.onmessage = (event: MessageEvent) => {
        this.handleMessage({
          event: "message",
          data: event.data,
          id: event.lastEventId,
          origin: event.origin ?? this.config.url,
          timestamp: Date.now(),
          retry: null,
        });
      };

      this.eventSource.onerror = (_event) => {
        this.onError(new Error("EventSource error"));
      };

      // Listen for named events
      if (this.config.eventTypes && this.config.eventTypes.length > 0) {
        for (const eventType of this.config.eventTypes) {
          this.eventSource.addEventListener(eventType, (event: MessageEvent) => {
            this.handleMessage({
              event: eventType,
              data: event.data,
              id: (event as MessageEvent & { lastEventId?: string }).lastEventId ?? null,
              origin: event.origin ?? this.config.url,
              timestamp: Date.now(),
              retry: null,
            });
          });
        }
      } else {
        // If no specific event types, we need to capture custom events differently
        // EventSource only supports addEventListener for known types
        // For unknown types, they'll come through onerror or need special handling
      }
    } catch (err) {
      this.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // --- Private: Fetch-based connection (supports POST) ---

  private async connectWithFetch(): Promise<void> {
    this.abortController = new AbortController();

    const headers: Record<string, string> = {
      Accept: "text/event-stream",
      Cache-Control: "no-cache",
      ...this.config.headers,
    };

    if (this.config.authToken) {
      headers["Authorization"] = `Bearer ${this.config.authToken}`;
    }

    try {
      const response = await fetch(this.config.url, {
        method: this.config.method,
        headers,
        body: this.config.body,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      this.onOpen();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        this.bytesReceived += value.length;

        // Parse SSE messages from buffer
        const messages = this.parseSseBuffer(buffer);
        buffer = messages.remaining;

        for (const msg of messages.parsed) {
          this.handleMessage(msg);
        }
      }

      // Stream ended normally — treat as disconnect
      this.onError(new Error("Stream ended"));
    } catch (err) {
      if ((err instanceof Error && err.name === "AbortError") || this.destroyed) {
        return; // Intentional close
      }
      this.onError(err instanceof Error ? err : new Error(String(err)));
    }
  }

  // --- Private: SSE Parser ---

  private parseSseBuffer(buffer: string): { parsed: SseMessage[]; remaining: string } {
    const messages: SseMessage[] = [];
    const lines = buffer.split("\n");
    let currentEvent = "message";
    let currentData: string[] = [];
    let currentId: string | null = null;
    let currentRetry: number | null = null;
    let remaining = "";
    let foundComplete = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === "") {
        // Empty line = end of message
        if (currentData.length > 0 || currentId !== null) {
          messages.push({
            event: currentEvent,
            data: currentData.join("\n"),
            id: currentId,
            origin: this.config.url,
            timestamp: Date.now(),
            retry: currentRetry,
          });
          foundComplete = true;
        }
        // Reset
        currentEvent = "message";
        currentData = [];
        currentId = null;
        currentRetry = null;
      } else if (line.startsWith("event:")) {
        currentEvent = line.slice(6).trimStart();
      } else if (line.startsWith("data:")) {
        currentData.push(line.slice(5).trimStart());
      } else if (line.startsWith("id:")) {
        currentId = line.slice(3).trimStart() || null;
      } else if (line.startsWith("retry:")) {
        const retryVal = parseInt(line.slice(6).trimStart(), 10);
        if (!isNaN(retryVal)) currentRetry = retryVal;
      } else if (line.startsWith(":")) {
        // Comment line, ignore
      } else {
        // Treat as data field without prefix
        currentData.push(line.trimStart());
      }
    }

    // If the buffer didn't end with a complete message, keep the incomplete part
    if (!foundComplete && lines.length > 0) {
      remaining = lines[lines.length - 1];
      // Also include any lines that were part of an incomplete message
      for (let j = lines.length - 2; j >= 0; j--) {
        if (lines[j] === "") break; // Found previous message boundary
        remaining = lines[j] + "\n" + remaining;
      }
    }

    return { parsed: messages, remaining };
  }

  // --- Private: Handlers ---

  private onOpen(): void {
    this.reconnectAttempt = 0;
    this.lastConnectedAt = Date.now();
    this.lastMessageTime = Date.now();
    this.setState("open");
    this.startHeartbeat();

    if (this.config.debug) console.log("[SSE] Connected");
  }

  private handleMessage(message: SseMessage): void {
    this.messagesReceived++;
    this.lastMessageTime = Date.now();

    // Update last-event-id
    if (message.id) {
      this.currentLastEventId = message.id;
    }

    // Buffer message
    if (this.messageBuffer.length >= this.bufferMaxSize) {
      this.messageBuffer.shift();
    }
    this.messageBuffer.push(message);

    // Dispatch to listeners
    // Wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      for (const handler of wildcardListeners) {
        try { handler(message); } catch {}
      }
    }

    // Specific event type listeners
    const typeListeners = this.listeners.get(message.event);
    if (typeListeners) {
      for (const handler of typeListeners) {
        try { handler(message); } catch {}
      }
    }

    if (this.config.debug) {
      console.log(`[SSE] [${message.event}] ${message.data.substring(0, 100)}${message.data.length > 100 ? "..." : ""}`);
    }
  }

  private onError(error: Error): void {
    this.lastError = error;
    this.stopHeartbeat();
    this.setState("error");

    // Notify error listeners
    for (const handler of this.errorListeners) {
      try { handler(error); } catch {}
    }

    // Auto-reconnect
    if (this.config.reconnect.enabled && !this.destroyed) {
      if (this.config.reconnect.maxAttempts === -1 ||
          this.reconnectAttempt < this.config.reconnect.maxAttempts) {
        this.scheduleReconnect();
      } else {
        if (this.config.debug) console.error(`[SSE] Max reconnect attempts (${this.config.reconnect.maxAttempts}) reached`);
        this.close();
      }
    } else {
      this.close();
    }
  }

  private setState(state: SseConnectionState["state"]): void {
    this.currentState = state;
    const stateInfo = this.getState();
    for (const listener of this.stateListeners) {
      try { listener(stateInfo); } catch {}
    }
  }

  // --- Private: Reconnection ---

  private scheduleReconnect(): void {
    this.reconnectAttempt++;
    this.setState("reconnecting");

    const { initialDelay, maxDelay, backoffFactor, jitter } = this.config.reconnect;
    let delay = Math.min(initialDelay * Math.pow(backoffFactor, this.reconnectAttempt - 1), maxDelay);

    // Add jitter
    delay = delay + (Math.random() * 2 - 1) * delay * jitter;
    delay = Math.max(delay, 100); // Minimum 100ms

    if (this.config.debug) {
      console.log(`[SSE] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempt})`);
    }

    this.reconnectTimer = setTimeout(() => {
      this.cleanup();
      this.connect();
    }, delay);
  }

  // --- Private: Heartbeat ---

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastMessageTime;
      if (elapsed > this.config.heartbeat.intervalMs + this.config.heartbeat.toleranceMs) {
        if (this.config.debug) console.warn(`[SSE] Heartbeat timeout: no message for ${elapsed}ms`);
        this.onError(new Error(`Heartbeat timeout (${elapsed}ms)`));
      }
    }, this.config.heartbeat.intervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // --- Private: Cleanup ---

  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();
  }
}

// --- Factory ---

/** Create a pre-configured SSE client */
export function createSseClient(config: SseConfig): SseClient {
  return new SseClient(config);
}

// --- Multi-Source Aggregator ---

export class SseAggregator {
  private clients = new Map<string, SseClient>();
  private unifiedHandlers = new Map<string, Set<(source: string, msg: SseMessage) => void>>();
  private messageCounter = 0;

  /** Add an SSE source */
  addSource(name: string, config: SseConfig): SseClient {
    const client = new SseClient({
      ...config,
      debug: config.debug ?? false,
    });

    client.onMessage((msg) => {
      this.messageCounter++;
      this.dispatch(name, msg);
    });

    this.clients.set(name, client);
    return client;
  }

  /** Listen to messages from all sources */
  onAny(handler: (source: string, msg: SseMessage) => void): () => void {
    if (!this.unifiedHandlers.has("*")) {
      this.unifiedHandlers.set("*", new Set());
    }
    this.unifiedHandlers.get("*)!.add(handler);

    return () => this.unifiedHandlers.get("*")?.delete(handler);
  }

  /** Listen to a specific event across all sources */
  onEvent(event: string, handler: (source: string, msg: SseMessage) => void): () => void {
    if (!this.unifiedHandlers.has(event)) {
      this.unifiedHandlers.set(event, new Set());
    }
    this.unifiedHandlers.get(event)!.add(handler);

    return () => this.unifiedHandlers.get(event)?.delete(handler);
  }

  /** Connect all sources */
  connectAll(): void {
    for (const [, client] of this.clients) {
      client.connect();
    }
  }

  /** Disconnect all sources */
  disconnectAll(): void {
    for (const [, client] of this.clients) {
      client.close();
    }
  }

  /** Destroy all sources */
  destroyAll(): void {
    for (const [, client] of this.clients) {
      client.destroy();
    }
    this.clients.clear();
    this.unifiedHandlers.clear();
  }

  /** Get aggregated stats */
  getStats(): { sourceCount: number; totalMessages: number; sources: Array<{ name: string; state: SseConnectionState }> } {
    return {
      sourceCount: this.clients.size,
      totalMessages: this.messageCounter,
      sources: Array.from(this.clients.entries()).map(([name, client]) => ({
        name,
        state: client.getState(),
      })),
    };
  }

  private dispatch(source: string, msg: SseMessage): void {
    // Wildcard handlers
    const wildcards = this.unifiedHandlers.get("*");
    if (wildcards) {
      for (const h of wildcards) { try { h(source, msg); } catch {} }
    }

    // Event-specific handlers
    const handlers = this.unifiedHandlers.get(msg.event);
    if (handlers) {
      for (const h of handlers) { try { h(source, msg); } catch {} }
    }
  }
}
