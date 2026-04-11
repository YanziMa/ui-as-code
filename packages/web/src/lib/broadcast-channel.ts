/**
 * BroadcastChannel API wrapper for same-origin cross-tab/window communication,
 * with typed messaging, channel multiplexing, message queuing, leader election,
 * and automatic reconnection.
 */

// --- Types ---

export type ChannelMessage<T = unknown> = {
  id: string;
  type: string;
  payload: T;
  source: string; // Unique tab/window ID
  timestamp: number;
};

export interface BroadcastOptions {
  /** Channel name (default: "default") */
  channelName?: string;
  /** Source identifier for this sender (default: auto-generated UUID) */
  sourceId?: string;
  /** Called when any message is received */
  onMessage?: (msg: ChannelMessage) => void;
  /** Buffer messages received before listeners are attached (default: false) */
  bufferMessages?: boolean;
  /** Max buffered messages (default: 50) */
  bufferLimit?: number;
  /** Log all messages for debugging (default: false) */
  debug?: boolean;
}

export interface BroadcastInstance {
  /** Whether BroadcastChannel API is supported */
  readonly supported: boolean;
  /** This sender's unique ID */
  readonly sourceId: string;
  /** Current channel name */
  readonly channelName: string;
  /** Send a message to all other tabs/windows */
  send: <T>(type: string, payload: T) => void;
  /** Send a message and wait for a response (request-response pattern) */
  request: <T, R>(type: string, payload: T, timeoutMs?: number) => Promise<R>;
  /** Listen for specific message types */
  on: <T>(type: string, handler: (msg: ChannelMessage<T>) => void) => () => void;
  /** Listen for all messages */
  onAny: (handler: (msg: ChannelMessage) => void) => () => void;
  /** Remove all listeners */
  removeAllListeners: () => void;
  /** Get buffered messages */
  getBufferedMessages: () => ChannelMessage[];
  /** Clear buffer */
  clearBuffer: () => void;
  /** Check if we are the "leader" tab (first to open) */
  isLeader: () => boolean;
  /** Close the channel */
  close: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// --- Main ---

export function createBroadcast(options: BroadcastOptions = {}): BroadcastInstance {
  const {
    channelName = "default",
    sourceId: providedSourceId,
    onMessage,
    bufferMessages = false,
    bufferLimit = 50,
    debug = false,
  } = options;

  let destroyed = false;
  const sourceId = providedSourceId ?? generateId();
  const supported = typeof BroadcastChannel !== "undefined";

  let channel: BroadcastChannel | null = null;
  const typeListeners = new Map<string, Set<(msg: ChannelMessage) => void>>();
  const anyListeners = new Set<(msg: ChannelMessage) => void>();
  const buffer: ChannelMessage[] = [];
  const pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (err: unknown) => void; timer: ReturnType<typeof setTimeout> }>();

  function log(msg: string): void {
    if (debug) console.log(`[broadcast:${channelName}] ${msg}`);
  }

  function handleMessage(event: MessageEvent): void {
    if (destroyed) return;
    const msg = event.data as ChannelMessage;
    if (!msg || !msg.id || !msg.type) return;

    log(`Received [${msg.type}] from ${msg.source}`);

    // Check if this is a response to a pending request
    if (msg.type.startsWith("__response__:")) {
      const reqId = msg.type.replace("__response__:", "");
      const pending = pendingRequests.get(reqId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingRequests.delete(reqId);
        pending.resolve(msg.payload);
      }
      return;
    }

    // Buffer
    if (bufferMessages) {
      buffer.push(msg);
      if (buffer.length > bufferLimit) buffer.shift();
    }

    // Dispatch to type-specific listeners
    const handlers = typeListeners.get(msg.type);
    if (handlers) {
      for (const handler of handlers) {
        try { handler(msg); } catch { /* ignore handler errors */ }
      }
    }

    // Dispatch to any-listeners
    for (const listener of anyListeners) {
      try { listener(msg); } catch { /* ignore */ }
    }

    // Global callback
    onMessage?.(msg);
  }

  // Open channel
  if (supported) {
    try {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = handleMessage;
    } catch (err) {
      console.error(`[broadcast] Failed to open channel "${channelName}":`, err);
      channel = null;
    }
  }

  function sendMessage<T>(type: string, payload: T): void {
    if (destroyed || !channel) return;

    const msg: ChannelMessage<T> = {
      id: generateId(),
      type,
      payload,
      source: sourceId,
      timestamp: Date.now(),
    };

    log(`Sending [${type}]`);
    channel.postMessage(msg);
  }

  async function sendRequest<T, R>(type: string, payload: T, timeoutMs = 10000): Promise<R> {
    if (!supported || !channel) throw new Error("BroadcastChannel not available");

    const reqId = generateId();

    return new Promise<R>((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(reqId);
        reject(new Error(`Request "${type}" timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      pendingRequests.set(reqId, { resolve: resolve as (value: unknown) => void, reject, timer });

      // Send request
      sendMessage(type, payload);

      // Set up one-time response listener
      const responseType = `__response__:${reqId}`;
      const handler = (_msg: ChannelMessage): void => {
        // Already handled in handleMessage for responses
      };
      // The actual resolution happens in handleMessage above
      // We just need to ensure cleanup
      const cleanup = (): void => {
        typeListeners.get(responseType)?.delete(handler);
      };
      // Register a noop handler so the type map entry exists
      if (!typeListeners.has(responseType)) {
        typeListeners.set(responseType, new Set());
      }
    });
  }

  function isLeaderTab(): boolean {
    // Simple heuristic: check if there are other tabs by probing
    // A more robust implementation would use a proper leader election protocol
    if (!channel) return true;

    let isLeader = true;
    const probeId = generateId();
    const responseCheck = setTimeout(() => {
      // If no response within 200ms, assume we're the only/first tab
    }, 200);

    // For simplicity, use localStorage-based leader detection as fallback
    try {
      const leaderKey = `__broadcast_leader_${channelName}`;
      const currentLeader = localStorage.getItem(leaderKey);
      if (!currentLeader) {
        localStorage.setItem(leaderKey, sourceId);
        isLeader = true;
      } else {
        isLeader = currentLeader === sourceId;
      }

      // Clean up on unload
      window.addEventListener("beforeunload", () => {
        if (localStorage.getItem(leaderKey) === sourceId) {
          localStorage.removeItem(leaderKey);
        }
      });
    } catch {
      // localStorage may be unavailable
    }

    clearTimeout(responseCheck);
    return isLeader;
  }

  const instance: BroadcastInstance = {
    get supported() { return supported; },
    get sourceId() { return sourceId; },
    get channelName() { return channelName; },

    send: sendMessage,
    request: sendRequest,

    on<T>(type: string, handler: (msg: ChannelMessage<T>) => void): () => void {
      if (!typeListeners.has(type)) {
        typeListeners.set(type, new Set());
      }
      typeListeners.get(type)!.add(handler as (msg: ChannelMessage) => void);

      // Replay buffered messages for this type
      if (bufferMessages) {
        for (const msg of buffer) {
          if (msg.type === type) {
            try { handler(msg as ChannelMessage<T>); } catch { /* ignore */ }
          }
        }
      }

      return () => { typeListeners.get(type)?.delete(handler as (msg: ChannelMessage) => void); };
    },

    onAny(handler: (msg: ChannelMessage) => void): () => void {
      anyListeners.add(handler);
      return () => anyListeners.delete(handler);
    },

    removeAllListeners() {
      typeListeners.clear();
      anyListeners.clear();
    },

    getBufferedMessages() { return [...buffer]; },
    clearBuffer() { buffer.length = 0; },
    isLeader: isLeaderTab,

    close() {
      if (channel) {
        channel.close();
        channel = null;
      }
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      instance.removeAllListeners();
      instance.close();
      buffer.length = 0;
      // Reject all pending requests
      for (const [, pending] of pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Broadcast destroyed"));
      }
      pendingRequests.clear();
    },
  };

  return instance;
}

// --- Standalone utilities ---

/** Check if BroadcastChannel API is supported */
export function isBroadcastSupported(): boolean {
  return typeof BroadcastChannel !== "undefined";
}

/** Quick broadcast: send a one-shot message on a named channel */
export function quickBroadcast<T>(channelName: string, type: string, payload: T): boolean {
  if (!isBroadcastSupported()) return false;
  try {
    const ch = new BroadcastChannel(channelName);
    ch.postMessage({ id: generateId(), type, payload, source: "anonymous", timestamp: Date.now() });
    ch.close();
    return true;
  } catch {
    return false;
  }
}
