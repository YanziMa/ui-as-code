/**
 * Network utilities: connection detection, retry logic, request queuing, offline support.
 */

export interface NetworkStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData: boolean;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  retryableStatuses?: number[];
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

export interface RequestQueueItem {
  id: string;
  url: string;
  options: RequestInit;
  priority: number;
  createdAt: number;
  retries: number;
  resolve: (value: Response) => void;
  reject: (reason: Error) => void;
}

type QueueMode = "fifo" | "priority" | "lifo";

/** Get current network status */
export function getNetworkStatus(): NetworkStatus {
  if (typeof navigator === "undefined" || !("connection" in navigator)) {
    return { online: navigator.onLine, saveData: false };
  }

  const conn = (navigator as unknown as { connection: { effectiveType: string; downlink: number; rtt: number; saveData: boolean } }).connection;
  return {
    online: navigator.onLine,
    effectiveType: conn?.effectiveType,
    downlink: conn?.downlink,
    rtt: conn?.rtt,
    saveData: conn?.saveData ?? false,
  };
}

/** Subscribe to network status changes */
export function onNetworkChange(callback: (status: NetworkStatus) => void): () => void {
  const handler = () => callback(getNetworkStatus());
  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);

  // Connection API changes
  const conn = (navigator as unknown as { connection?: EventTarget }).connection;
  if (conn) conn.addEventListener("change", handler);

  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
    if (conn) conn.removeEventListener("change", handler);
  };
}

/** Check if connection is slow (2g or less) */
export function isSlowConnection(): boolean {
  const status = getNetworkStatus();
  return status.effectiveType === "slow-2g" || status.effectiveType === "2g";
}

/** Check if user prefers saving data */
export function isDataSaverEnabled(): boolean {
  return getNetworkStatus().saveData;
}

// --- Retry Logic ---

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 300,
  maxDelayMs: 10000,
  backoffFactor: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
};

/** Fetch with automatic retry and exponential backoff */
export async function fetchWithRetry(
  url: string | URL,
  options: RequestInit = {},
  retryOpts: RetryOptions = {},
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOpts };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response.ok && opts.retryableStatuses.includes(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < opts.maxRetries) {
        if (opts.shouldRetry && !opts.shouldRetry(lastError, attempt)) break;

        const delay = Math.min(
          opts.baseDelayMs * Math.pow(opts.backoffFactor, attempt),
          opts.maxDelayMs,
        );
        await sleep(delay + Math.random() * delay * 0.5); // Jitter
      }
    }
  }

  throw lastError ?? new Error("Fetch failed after all retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Request Queue ---

export class RequestQueue {
  private queue: RequestQueueItem[] = [];
  private active = new Set<string>();
  private concurrency: number;
  private mode: QueueMode;
  private processing = false;
  private autoFlushOnOnline = true;
  private cleanup: (() => void) | null = null;

  constructor(concurrency = 4, mode: QueueMode = "fifo") {
    this.concurrency = concurrency;
    this.mode = mode;
    if (typeof window !== "undefined") {
      this.cleanup = onNetworkChange((status) => {
        if (status.online && this.autoFlushOnOnline) this.flush();
      });
    }
  }

  /** Add a request to the queue */
  enqueue(url: string, options: RequestInit = {}, priority = 0): Promise<Response> {
    return new Promise((resolve, reject) => {
      const item: RequestQueueItem = {
        id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        url,
        options,
        priority,
        createdAt: Date.now(),
        retries: 0,
        resolve,
        reject,
      };
      this.queue.push(item);
      this.sortQueue();
      this.process();
    });
  }

  /** Process queued requests */
  private process(): void {
    if (this.processing) return;
    this.processing = true;

    while (this.active.size < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      this.active.add(item.id);
      this.executeRequest(item);
    }

    this.processing = false;
  }

  private async executeRequest(item: RequestQueueItem): Promise<void> {
    try {
      const response = await fetchWithRetry(item.url, item.options, {
        maxRetries: 2,
        baseDelayMs: 200,
      });
      item.resolve(response);
    } catch (error) {
      item.retries++;
      if (item.retries < 3) {
        // Re-queue with lower priority
        item.priority -= 10;
        this.queue.push(item);
        this.sortQueue();
        this.process();
      } else {
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.active.delete(item.id);
      this.process();
    }
  }

  private sortQueue(): void {
    switch (this.mode) {
      case "priority":
        this.queue.sort((a, b) => b.priority - a.priority || a.createdAt - b.createdAt);
        break;
      case "lifo":
        this.queue.reverse();
        break;
      // fifo: default order
    }
  }

  /** Flush all pending requests immediately */
  flush(): void {
    this.process();
  }

  /** Clear all pending requests */
  clear(): void {
    for (const item of this.queue) {
      item.reject(new Error("Queue cleared"));
    }
    this.queue = [];
  }

  /** Get queue stats */
  getStats(): { pending: number; active: number; total: number } {
    return {
      pending: this.queue.length,
      active: this.active.size,
      total: this.queue.length + this.active.size,
    };
  }

  destroy(): void {
    this.clear();
    if (this.cleanup) this.cleanup();
  }
}

// --- Offline-aware fetch ---

/** Store data for later sync when offline */
class OfflineStore {
  private storeName = "uiac_offline_queue";

  async add(data: unknown): Promise<void> {
    try {
      const items = await this.getAll();
      items.push({ id: crypto.randomUUID(), data, createdAt: Date.now() });
      localStorage.setItem(this.storeName, JSON.stringify(items));
    } catch {}
  }

  async getAll(): Array<{ id: string; data: unknown; createdAt: number }> {
    try {
      const raw = localStorage.getItem(this.storeName);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async remove(id: string): Promise<void> {
    try {
      const items = (await this.getAll()).filter((i) => i.id !== id);
      localStorage.setItem(this.storeName, JSON.stringify(items));
    } catch {}
  }

  clear(): void {
    try { localStorage.removeItem(this.storeName); } catch {}
  }
}

const offlineStore = new OfflineStore();

/** Enqueue a mutation to be synced when back online */
export function syncWhenOnline(request: { url: string; options: RequestInit }): void {
  offlineStore.add(request);
}

/** Process all pending offline mutations */
export async function processOfflineQueue(): Promise<{ succeeded: number; failed: number }> {
  const items = await offlineStore.getAll();
  let succeeded = 0, failed = 0;

  for (const item of items) {
    const req = item.data as { url: string; options: RequestInit };
    try {
      const res = await fetch(req.url, req.options);
      if (res.ok) { succeeded++; await offlineStore.remove(item.id); }
      else failed++;
    } catch { failed++; }
  }

  return { succeeded, failed };
}

// --- Bandwidth estimation ---

export class BandwidthEstimator {
  private samples: number[] = [];
  private maxSamples = 10;
  private testUrl: string;
  private testSizeBytes: number;

  constructor(testUrl = "/bandwidth-test", testSizeKB = 100) {
    this.testUrl = testUrl;
    this.testSizeBytes = testSizeKB * 1024;
  }

  async measure(): Promise<number> {
    const start = performance.now();
    try {
      const response = await fetch(this.testUrl, { cache: "no-store" });
      const blob = await response.blob();
      const elapsed = (performance.now() - start) / 1000; // seconds
      const bps = (blob.size * 8) / elapsed; // bits per second
      this.recordSample(bps);
      return bps;
    } catch {
      return this.getAverage();
    }
  }

  recordSample(bps: number): void {
    this.samples.push(bps);
    if (this.samples.length > this.maxSamples) this.samples.shift();
  }

  getAverage(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  getEstimatedDownloadTime(bytes: number): number {
    const bps = this.getAverage();
    if (bps <= 0) return Infinity;
    return (bytes * 8) / bps; // seconds
  }

  clear(): void { this.samples = []; }
}

// --- Connection health check ---

export class ConnectionHealthChecker {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private healthy = true;
  private listeners = new Set<(healthy: boolean) => void>();
  private checkUrl: string;
  private intervalMs: number;
  private timeoutMs: number;

  constructor(checkUrl = "/health", intervalMs = 30000, timeoutMs = 5000) {
    this.checkUrl = checkUrl;
    this.intervalMs = intervalMs;
    this.timeoutMs = timeoutMs;
  }

  start(): void {
    this.check();
    this.intervalId = setInterval(() => this.check(), this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  private async check(): Promise<void> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(this.checkUrl, { signal: controller.signal });
      clearTimeout(timer);

      const nowHealthy = res.ok;
      if (nowHealthy !== this.healthy) {
        this.healthy = nowHealthy;
        this.notify(nowHealthy);
      }
    } catch {
      if (this.healthy) {
        this.healthy = false;
        this.notify(false);
      }
    }
  }

  isHealthy(): boolean { return this.healthy; }

  onHealthChange(fn: (healthy: boolean) => void): () => void {
    this.listeners.add(fn);
    fn(this.healthy);
    return () => this.listeners.delete(fn);
  }

  private notify(healthy: boolean): void {
    for (const fn of this.listeners) { try { fn(healthy); } catch {} }
  }
}
