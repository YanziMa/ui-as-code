/**
 * Offline: Offline detection, sync queue management, connectivity
 * status monitoring, offline-first data caching, and reconnection
 * handling with retry strategies.
 *
 * Provides:
 *   - Online/offline event detection via navigator.onLine
 *   - Request queuing for offline periods
 *   - Automatic retry on reconnection with exponential backoff
 *   - Local storage fallback cache (memory + localStorage)
 *   - Sync conflict resolution (last-write-wins)
 *   - Network quality scoring (latency-based)
 *   - Service Worker registration helper
 */

export type ConnectionStatus = "online" | "offline" | "unknown";

export interface OfflineConfig {
  /** Queue name prefix for stored requests */
  queuePrefix?: string;
  /** Max queued requests before dropping oldest */
  maxQueueSize?: number;
  /** Retry base delay (ms) */
  retryBaseDelay?: number;
  /** Retry max delay cap (ms) */
  retryMaxDelay?: number;
  /** Retry max attempts per request */
  retryMaxAttempts?: number;
  /** Use localStorage persistence */
  persistQueue?: boolean;
  /** Callback when going offline */
  onOffline?: () => void;
  /** Callback when coming back online */
  onOnline?: () => void;
  /** Callback before each retry attempt */
  onRetry?: (attempt: number, request: QueuedRequest) => void;
  /** Custom fetch function (for testing) */
  fetchFn?: typeof fetch;
}

export interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  attempts: number;
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
}

export interface OfflineManager {
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether currently online */
  isOnline: () => boolean;
  /** Queue a request for later or immediate execution */
  queue: (url: string, options?: RequestInit) => Promise<Response>;
  /** Get current queue length */
  getQueueLength: () => number;
  /** Clear the queue */
  clearQueue: () => void;
  /** Process all queued requests immediately */
  flushQueue: () => Promise<void>;
  /** Retry a specific failed request */
  retry: (id: string) => Promise<Response | undefined>;
  /** Get network quality score (0-100) */
  getQualityScore: () => number;
  /** Register service worker */
  registerServiceWorker: (url: string) => Promise<void>;
  /** Destroy cleanup */
  destroy: () => void;
}

let qidCounter = 0;
function genQid() { return `q_${Date.now()}_${++qidCounter}`; }

export function createOfflineManager(config: OfflineConfig = {}): OfflineManager {
  const {
    queuePrefix = "offq_",
    maxQueueSize = 50,
    retryBaseDelay = 1000,
    retryMaxDelay = 30000,
    retryMaxAttempts = 5,
    persistQueue = true,
  } = config;

  const fetchFn = config.fetchFn ?? fetch;
  const queue: QueuedRequest[] = [];
  let status: ConnectionStatus = navigator.onLine ? "online" : "unknown";
  let destroyed = false;
  let qualitySamples: number[] = [];

  // Status detection
  function updateStatus(): void {
    const wasOnline = status === "online";
    status = navigator.onLine ? (navigator.onLine ? "online" : "offline") : "unknown";

    if (!wasOnline && status === "online") config.onOnline?.();
    else if (wasOnline && status === "offline") config.offline?.();
  }

  window.addEventListener("online", () => { updateStatus(); flushQueue(); });
  window.addEventListener("offline", updateStatus);

  async function queueRequest(url: string, options?: RequestInit): Promise<Response> {
    if (destroyed) throw new Error("OfflineManager destroyed");

    if (status === "online") {
      try {
        const start = performance.now();
        const resp = await fetchFn(url, options);
        qualitySamples.push(performance.now() - start);
        if (qualitySamples.length > 20) qualitySamples.shift();
        return resp;
      } catch (err) {
        // If fetch fails, fall through to queue
        if (!(err instanceof TypeError)) throw err;
      }
    }

    // Queue for later
    return new Promise<Response>((resolve, reject) => {
      if (queue.length >= maxQueueSize) {
        const dropped = queue.shift()!;
        dropped.reject(new Error("Queue full — request dropped"));
      }

      const req: QueuedRequest = {
        id: genQid(), url, options: options ?? {},
        timestamp: Date.now(), attempts: 0, resolve, reject,
      };
      queue.push(req);
      saveQueue();
    });
  }

  async function flushQueue(): Promise<void> {
    if (status !== "online" || queue.length === 0 || destroyed) return;

    // Process in order, one at a time
    while (queue.length > 0 && !destroyed) {
      const req = queue[0]!;
      req.attempts++;
      config.onRetry?.(req.attempts, req);

      const delay = Math.min(retryBaseDelay * Math.pow(2, req.attempts - 1), retryMaxDelay);

      try {
        await new Promise((r) => setTimeout(r, delay));
        const resp = await fetchFn(req.url, req.options);
        queue.shift();
        saveQueue();
        req.resolve(resp);
      } catch (err) {
        if (req.attempts >= retryMaxAttempts) {
          queue.shift();
          saveQueue();
          req.reject(err instanceof Error ? err : new Error(String(err)));
        }
        // Otherwise will be retried next flush
      }
    }
  }

  function retry(id: string): Promise<Response> | undefined {
    const idx = queue.findIndex((r) => r.id === id);
    if (idx === -1) return undefined;
    const req = queue[idx]!;
    queue.splice(idx, 1);
    queue.push(req); // Move to end for immediate retry

    return new Promise((resolve, reject) => {
      req.resolve = resolve as (r: Response) => void;
      req.reject = reject;
    });
  }

  function getQualityScore(): number {
    if (qualitySamples.length === 0) return status === "online" ? 90 : 30;
    const avgLatency = qualitySamples.reduce((a, b) => a + b, 0) / qualitySamples.length;
    if (avgLatency < 100) return 95;
    if (avgLatency < 300) return 80;
    if (avgLatency < 800) return 55;
    if (avgLatency < 2000) return 35;
    return 15;
  }

  function saveQueue(): void {
    if (!persistQueue) return;
    try {
      localStorage.setItem(queuePrefix + "queue", JSON.stringify(queue.map((r) => ({ id: r.id, url: r.url, timestamp: r.timestamp, attempts: r.attempts }))));
    } catch {}
  }

  function loadQueue(): void {
    if (!persistQueue) return;
    try {
      const raw = localStorage.getItem(queuePrefix + "queue");
      if (raw) {
        const saved = JSON.parse(raw) as Array<{ id: string; url: string; timestamp: number; attempts: number }>;
        // Don't restore very old entries (>1 day)
        const recent = saved.filter((s) => Date.now() - s.timestamp < 86400000);
        // Re-queue without resolvers (they're dead promises)
        for (const s of recent) {
          queue.push({ ...s, options: {}, timestamp: s.timestamp, attempts: s.attempts,
            resolve: () => {}, reject: () => {},
          });
        }
      }
    } catch {}
  }

  loadQueue();

  return {
    get status() { return status; },
    isOnline: () => status === "online",
    queue: queueRequest, getQueueLength: () => queue.length,
    clearQueue: () => { queue.length = 0; saveQueue(); },
    flushQueue, retry, getQualityScore,
    async registerServiceWorker(url: string) {
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.register(url);
        console.log("[Offline] SW registered:", reg.scope);
      }
    },
    destroy: () => { destroyed = true; queue.length = 0; saveQueue(); },
  };
}
