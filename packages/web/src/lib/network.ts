/**
 * Network / HTTP utilities: online/offline detection, connection quality,
 * fetch wrapper with timeout/retry/caching, request queueing for offline mode,
 * bandwidth estimation, and Network Information API integration.
 */

// --- Types ---

export interface NetworkStatus {
  online: boolean;
  /** effectiveType: "slow-2g" | "2g" | "3g" | "4g" */
  effectiveType: string;
  downlink: number;       // Mbps
  rtt: number;            // Round-trip time in ms
  saveData: boolean;      // Data-saver mode active?
  connectionType: string; // "wifi" | "cellular" | "ethernet" | "unknown"
}

export interface FetchOptions extends RequestInit {
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** Number of retries (default: 0) */
  retries?: number;
  /** Base delay between retries in ms (default: 500) */
  retryDelay?: number;
  /** Exponential backoff factor (default: 2) */
  backoffFactor?: number;
  /** Status codes that trigger retry (default: [408, 429, 500, 502, 503, 504]) */
  retryOnStatus?: number[];
  /** Cache TTL in ms (0 = no cache) */
  cacheTtl?: number;
  /** Custom cache key (default: URL + method + body hash) */
  cacheKey?: string;
  /** Abort signal from external controller */
  abortSignal?: AbortSignal;
  /** Callback on each attempt */
  onAttempt?: (attempt: number, error?: Error) => void;
  /** Callback before retry */
  onRetry?: (attempt: number, error: Error, delay: number) => void;
}

export interface FetchResult<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  fromCache: boolean;
  duration: number;
  url: string;
}

export interface QueuedRequest {
  id: string;
  url: string;
  options: FetchOptions;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

export interface NetworkManagerOptions {
  /** Auto-detect online/offline changes? (default: true) */
  autoDetect?: boolean;
  /** Enable offline request queue? (default: false) */
  enableQueue?: boolean;
  /** Max queued requests (default: 50) */
  maxQueueSize?: number;
  /** Default fetch timeout (ms) */
  defaultTimeout?: number;
  /** Default retry count */
  defaultRetries?: number;
  /** Callback when status changes */
  onStatusChange?: (status: NetworkStatus) => void;
  /** Callback when going offline */
  onOffline?: () => void;
  /** Callback when coming back online */
  onOnline?: () => void;
}

export interface NetworkManagerInstance {
  /** Current network status */
  getStatus: () => NetworkStatus;
  /** Check if currently online */
  isOnline: () => boolean;
  /** Enhanced fetch with timeout/retry/cache */
  fetch<T = unknown>(url: string, options?: FetchOptions): Promise<FetchResult<T>>;
  /** GET shorthand */
  get<T = unknown>(url: string, options?: Omit<FetchOptions, "method" | "body">): Promise<FetchResult<T>>;
  /** POST shorthand */
  post<T = unknown>(url: string, body?: unknown, options?: Omit<FetchOptions, "method" | "body">): Promise<FetchResult<T>>;
  /** PUT shorthand */
  put<T = unknown>(url: string, body?: unknown, options?: Omit<FetchOptions, "method" | "body">): Promise<FetchResult<T>>;
  /** DELETE shorthand */
  del<T = unknown>(url: string, options?: Omit<FetchOptions, "method" | "body">): Promise<FetchResult<T>>;
  /** JSON POST shorthand */
  postJson<T = unknown>(url: string, data: unknown, options?: Omit<FetchOptions, "method" | "body" | "headers">): Promise<FetchResult<T>>;
  /** Add request to offline queue */
  enqueue: (url: string, options?: FetchOptions, maxRetries?: number) => string;
  /** Remove request from queue */
  dequeue: (id: string) => void;
  /** Get current queue contents */
  getQueue: () => QueuedRequest[];
  /** Process all queued requests */
  flushQueue: () => Promise<void>;
  /** Clear the queue */
  clearQueue: () => void;
  /** Get simple cache stats */
  getCacheStats: () => { size: number; hits: number; misses: number };
  /** Clear response cache */
  clearCache: () => void;
  /** Subscribe to status changes */
  subscribe: (callback: (status: NetworkStatus) => void) => () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Internal Cache ---

interface CacheEntry<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  timestamp: number;
  ttl: number;
}

// --- Helpers ---

function getDefaultRetryStatuses(): number[] {
  return [408, 429, 500, 502, 503, 504];
}

function isRetryableStatus(status: number, customList?: number[]): boolean {
  const list = customList ?? getDefaultRetryStatuses();
  return list.includes(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// --- Main Class ---

export class NetworkManager {
  create(options: NetworkManagerOptions = {}): NetworkManagerInstance {
    let destroyed = false;

    // State
    let currentStatus: NetworkStatus = readConnectionInfo();
    let cache = new Map<string, CacheEntry>();
    let cacheHits = 0;
    let cacheMisses = 0;
    let queue: QueuedRequest[] = [];
    const subscribers = new Set<(status: NetworkStatus) => void>();

    // Options
    const autoDetect = options.autoDetect ?? true;
    const enableQueue = options.enableQueue ?? false;
    const maxQueueSize = options.maxQueueSize ?? 50;
    const defaultTimeout = options.defaultTimeout ?? 10000;
    const defaultRetries = options.defaultRetries ?? 0;

    // Online/offline listeners
    let handleOnline: (() => void) | null = null;
    let handleOffline: (() => void) | null = null;

    if (autoDetect && typeof window !== "undefined") {
      handleOnline = () => {
        currentStatus = { ...currentStatus, online: true };
        notifySubscribers();
        options.onOnline?.();
        if (enableQueue) flushQueuedRequests();
      };
      handleOffline = () => {
        currentStatus = { ...currentStatus, online: false };
        notifySubscribers();
        options.onOffline?.();
      };
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Connection API change listener
      if ((navigator as unknown as { connection?: EventTarget }).connection) {
        (navigator as unknown as { connection: EventTarget }).connection.addEventListener("change", () => {
          currentStatus = readConnectionInfo();
          notifySubscribers();
        });
      }
    }

    function notifySubscribers(): void {
      for (const cb of subscribers) cb(currentStatus);
    }

    async function doFetch<T = unknown>(
      url: string,
      fetchOpts: FetchOptions = {},
    ): Promise<FetchResult<T>> {
      if (destroyed) throw new Error("NetworkManager destroyed");

      const {
        timeout = defaultTimeout,
        retries = defaultRetries,
        retryDelay = 500,
        backoffFactor = 2,
        retryOnStatus,
        cacheTtl = 0,
        cacheKey: customKey,
        abortSignal,
        onAttempt,
        onRetry,
        ...init
      } = fetchOpts;

      // Check cache first (GET only)
      if (cacheTtl > 0 && (!init.method || init.method === "GET")) {
        const key = customKey ?? buildCacheKey(url, init);
        const cached = cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          cacheHits++;
          return {
            data: cached.data as T,
            status: cached.status,
            statusText: cached.statusText,
            headers: cached.headers,
            ok: cached.status >= 200 && cached.status < 300,
            fromCache: true,
            duration: 0,
            url,
          };
        }
        cacheMisses++;
      }

      let lastError: Error | undefined;
      const startTime = Date.now();

      for (let attempt = 0; attempt <= retries; attempt++) {
        onAttempt?.(attempt, lastError);

        try {
          const controller = new AbortController();

          // Handle external abort signal
          if (abortSignal) {
            if (abortSignal.aborted) throw new DOMException("Aborted", "AbortError");
            abortSignal.addEventListener("abort", () => controller.abort());
          }

          const timer = setTimeout(() => controller.abort(), timeout);

          const response = await fetch(url, {
            ...init,
            signal: controller.signal,
          });

          clearTimeout(timer);

          const duration = Date.now() - startTime;

          // Retry on certain statuses
          if (retries > 0 && attempt < retries && isRetryableStatus(response.status, retryOnStatus)) {
            const delay = retryDelay * Math.pow(backoffFactor, attempt);
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
            onRetry?.(attempt, lastError, delay);
            await sleep(delay);
            continue;
          }

          const data: T = await parseResponse<T>(response);

          // Store in cache
          if (cacheTtl > 0 && (!init.method || init.method === "GET")) {
            const key = customKey ?? buildCacheKey(url, init);
            cache.set(key, {
              data,
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              timestamp: Date.now(),
              ttl: cacheTtl,
            });
            // Evict old entries if cache grows too large
            if (cache.size > 100) evictOldestCacheEntry();
          }

          return {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            ok: response.ok,
            fromCache: false,
            duration,
            url,
          };

        } catch (err) {
          clearTimeout(undefined as unknown as number); // safety
          lastError = err instanceof Error ? err : new Error(String(err));

          if (attempt < retries) {
            const delay = retryDelay * Math.pow(backoffFactor, attempt);
            onRetry?.(attempt, lastError, delay);
            await sleep(delay);
          }
        }
      }

      throw lastError ?? new Error("Fetch failed after all retries");
    }

    async function flushQueuedRequests(): Promise<void> {
      if (!currentStatus.online || queue.length === 0) return;

      const toProcess = [...queue];
      queue = [];

      for (const req of toProcess) {
        try {
          await doFetch(req.url, req.options);
        } catch {
          // Re-queue if retries remain
          if (req.retryCount < req.maxRetries) {
            req.retryCount++;
            queue.push(req);
          }
        }
      }
    }

    function buildCacheKey(url: string, init: RequestInit): string {
      const method = (init.method ?? "GET").toUpperCase();
      const body = init.body ? String(init.body) : "";
      return `${method}:${url}:${body}`;
    }

    function evictOldestCacheEntry(): void {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [key, entry] of cache) {
        if (entry.timestamp < oldestTime) {
          oldestTime = entry.timestamp;
          oldestKey = key;
        }
      }
      if (oldestKey) cache.delete(oldestKey);
    }

    const instance: NetworkManagerInstance = {

      getStatus() { return { ...currentStatus }; },

      isOnline() { return currentStatus.online; },

      fetch: doFetch,

      async get<T>(url, opts) {
        return doFetch<T>(url, { ...opts, method: "GET" });
      },

      async post<T>(url, body, opts) {
        return doFetch<T>(url, {
          ...opts,
          method: "POST",
          body: body instanceof FormData || body instanceof URLSearchParams
            ? body
            : JSON.stringify(body),
          headers: {
            ...(opts?.headers as Record<string, string> ?? {}),
            ...(body && !(body instanceof FormData) && !(body instanceof URLSearchParams)
              ? { "Content-Type": "application/json" }
              : {}),
          },
        });
      },

      async put<T>(url, body, opts) {
        return doFetch<T>(url, {
          ...opts,
          method: "PUT",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json", ...(opts?.headers as Record<string, string> ?? {}) },
        });
      },

      async del<T>(url, opts) {
        return doFetch<T>(url, { ...opts, method: "DELETE" });
      },

      async postJson<T>(url, data, opts) {
        return instance.post<T>(url, data, {
          ...opts,
          headers: { "Content-Type": "application/json", ...(opts?.headers as Record<string, string> ?? {}) },
        });
      },

      enqueue(url, opts, maxRetries = 3): string {
        const id = crypto.randomUUID();
        const req: QueuedRequest = {
          id,
          url,
          options: opts ?? {},
          createdAt: Date.now(),
          retryCount: 0,
          maxRetries,
        };
        if (queue.length >= maxQueueSize) queue.shift(); // FIFO eviction
        queue.push(req);
        return id;
      },

      dequeue(id: string): void {
        queue = queue.filter((q) => q.id !== id);
      },

      getQueue(): QueuedRequest[] { return [...queue]; },

      async flushQueue(): Promise<void> {
        await flushQueuedRequests();
      },

      clearQueue(): void { queue = []; },

      getCacheStats() {
        return { size: cache.size, hits: cacheHits, misses: cacheMisses };
      },

      clearCache(): void {
        cache.clear();
        cacheHits = 0;
        cacheMisses = 0;
      },

      subscribe(callback): () => void {
        subscribers.add(callback);
        callback(currentStatus); // Immediate call with current state
        return () => { subscribers.delete(callback); };
      },

      destroy(): void {
        if (destroyed) return;
        destroyed = true;
        if (handleOnline) window.removeEventListener("online", handleOnline);
        if (handleOffline) window.removeEventListener("offline", handleOffline);
        subscribers.clear();
        cache.clear();
        queue = [];
      },
    };

    return instance;
  }
}

/** Convenience: create a network manager */
export function createNetworkManager(options?: NetworkManagerOptions): NetworkManagerInstance {
  return new NetworkManager().create(options);
}

// --- Standalone helpers ---

/** Read current connection info from Network Information API */
export function readConnectionInfo(): NetworkStatus {
  if (typeof navigator === "undefined") {
    return { online: true, effectiveType: "unknown", downlink: 0, rtt: 0, saveData: false, connectionType: "unknown" };
  }

  const conn = (navigator as unknown as {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
      type?: string;
    };
  }).connection;

  return {
    online: navigator.onLine ?? true,
    effectiveType: conn?.effectiveType ?? "unknown",
    downlink: conn?.downlink ?? 0,
    rtt: conn?.rtt ?? 0,
    saveData: conn?.saveData ?? false,
    connectionType: conn?.type ?? "unknown",
  };
}

/** Parse query string to object */
export function parseQueryString(str: string): Record<string, string> {
  const params: Record<string, string> = {};
  const search = str.startsWith("?") ? str.slice(1) : str;
  if (!search) return params;
  for (const pair of search.split("&")) {
    const [key, ...rest] = pair.split("=");
    if (key) {
      params[decodeURIComponent(key)] = decodeURIComponent(rest.join("="));
    }
  }
  return params;
}

/** Build query string from object */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return entries.length > 0 ? `?${entries.join("&")}` : "";
}

/** Build full URL with base + path + query params */
export function buildUrl(
  base: string,
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const url = new URL(path, base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/** Parse content-range header */
export function parseContentRange(header: string): { start: number; end: number; total: number } | null {
  const match = header.match(/bytes (\d+)-(\d+)\/(\d+|\*)/);
  if (!match) return null;
  return {
    start: parseInt(match[1]!),
    end: parseInt(match[2]!),
    total: match[3] === "*" ? -1 : parseInt(match[3]!),
  };
}

/** Simple fetch wrapper with timeout and retry (standalone) */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number; retries?: number } = {},
): Promise<Response> {
  const { timeout = 10000, retries = 2, ...fetchOptions } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error("Fetch failed");
}

// --- Response parser helpers ---

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("json")) {
    return response.json() as Promise<T>;
  }
  if (contentType.includes("text")) {
    return response.text() as unknown as Promise<T>;
  }
  if (contentType.includes("octet-stream") || contentType.includes("application/pdf")) {
    return response.blob() as unknown as Promise<T>;
  }

  // Try JSON first, then text
  try {
    return await response.json() as Promise<T>;
  } catch {
    return await response.text() as unknown as Promise<T>;
  }
}
