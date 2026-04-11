/**
 * Request Batcher: Collect multiple requests into batched HTTP calls
 * with configurable grouping, debounced flushing, size-based auto-flush,
 * timeout-based flush, and response demultiplexing.
 */

// --- Types ---

export interface BatchConfig {
  /** Batch endpoint URL */
  url: string;
  /** HTTP method for batch (default: "POST") */
  method?: "POST" | "PUT";
  /** Max requests per batch (default: 50) */
  maxBatchSize?: number;
  /** Flush interval in ms (default: 50) */
  flushIntervalMs?: number;
  /** Max wait time before forced flush (default: 5000) */
  maxWaitMs?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Auth token */
  authToken?: string;
  /** Timeout per batch request (default: 30000) */
  timeout?: number;
  /** Key extractor for grouping requests (default: all in one group) */
  groupBy?: (request: BatchableRequest) => string;
  /** Request serializer */
  serialize?: (requests: BatchableRequest[]) => unknown;
  /** Response deserializer */
  deserialize?: <T>(response: unknown) => BatchResponse<T>[];
}

export interface BatchableRequest {
  /** Unique request ID (auto-generated if not provided) */
  id?: string;
  /** Request type/action */
  type: string;
  /** Request payload */
  data?: unknown;
  /** Grouping key (overrides groupBy function) */
  groupKey?: string;
  /** Priority (higher = processed first, default: 0) */
  priority?: number;
  /** Created timestamp */
  createdAt?: number;
}

export interface BatchResponse<T = unknown> {
  /** Original request ID */
  requestId: string;
  /** Response data */
  data: T | null;
  /** Error info if failed */
  error?: { code: string; message: string };
  /** Processing time on server */
  durationMs?: number;
}

export interface BatchStats {
  totalBatches: number;
  totalRequests: number;
  totalBatchedRequests: number;
  averageBatchSize: number;
  pendingRequests: number;
  activeGroups: number;
  flushCount: number;
  errorCount: number;
  averageFlushLatencyMs: number;
}

// --- Internal Types ---

interface PendingRequest {
  id: string;
  request: BatchableRequest;
  resolve: (response: BatchResponse<unknown>) => void;
  reject: (error: Error) => void;
  createdAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

interface BatchGroup {
  key: string;
  requests: PendingRequest[];
  flushTimer: ReturnType<typeof setTimeout>;
  maxWaitTimer: ReturnType<typeof setTimeout>;
  lastActivity: number;
}

// --- Main Class ---

export class RequestBatcher {
  private config: Required<Omit<BatchConfig, "groupBy" | "serialize" | "deserialize">> & {
    groupBy: ((req: BatchableRequest) => string) | null;
    serialize: (requests: BatchableRequest[]) => unknown;
    deserialize: <T>(response: unknown) => BatchResponse<T>[];
  };
  private groups = new Map<string, BatchGroup>();
  private stats: BatchStats = {
    totalBatches: 0,
    totalRequests: 0,
    totalBatchedRequests: 0,
    averageBatchSize: 0,
    pendingRequests: 0,
    activeGroups: 0,
    flushCount: 0,
    errorCount: 0,
    averageFlushLatencyMs: 0,
  };
  private latencySamples: number[] = [];
  private destroyed = false;
  private idCounter = 0;

  constructor(config: BatchConfig) {
    this.config = {
      method: "POST",
      maxBatchSize: 50,
      flushIntervalMs: 50,
      maxWaitMs: 5000,
      timeout: 30000,
      headers: {},
      groupBy: config.groupBy ?? null,
      serialize: config.serialize ?? ((reqs) => ({ requests: reqs })),
      deserialize: config.deserialize ?? (<T>(resp: unknown) => (resp as { results: BatchResponse<T>[] }).results ?? []),
      ...config,
    };
  }

  /** Add a request to the batch queue. Returns a promise that resolves when the batch completes. */
  add<T = unknown>(request: BatchableRequest): Promise<BatchResponse<T>> {
    if (this.destroyed) return Promise.reject(new Error("Batcher destroyed"));

    const id = request.id ?? this.generateId();
    const fullRequest = { ...request, id };

    return new Promise<BatchResponse<T>>((resolve, reject) => {
      const groupKey = request.groupKey ?? (this.config.groupBy ? this.config.groupBy(fullRequest) : "__default__");

      let group = this.groups.get(groupKey);
      if (!group) {
        group = this.createGroup(groupKey);
        this.groups.set(groupKey, group);
      }

      // Check batch size limit
      if (group.requests.length >= this.config.maxBatchSize) {
        this.flushGroup(group.key);
        group = this.groups.get(groupKey)!;
      }

      const pending: PendingRequest = {
        id,
        request: fullRequest,
        resolve: resolve as (r: BatchResponse<unknown>) => void,
        reject,
        createdAt: Date.now(),
        timeoutId: setTimeout(() => {
          this.removePending(group!.key, id);
          reject(new Error(`Request ${id} timed out`));
        }, this.config.maxWaitMs),
      };

      group.requests.push(pending);
      group.lastActivity = Date.now();
      this.stats.totalRequests++;
      this.stats.pendingRequests++;

      // Reset/adjust flush timer
      this.scheduleFlush(group);
    });
  }

  /** Immediately flush a specific group (or all groups) */
  flush(groupKey?: string): void {
    if (groupKey) {
      const group = this.groups.get(groupKey);
      if (group) this.flushGroup(groupKey);
    } else {
      for (const key of Array.from(this.groups.keys())) {
        this.flushGroup(key);
      }
    }
  }

  /** Get current statistics */
  getStats(): BatchStats {
    let pending = 0;
    for (const group of this.groups.values()) {
      pending += group.requests.length;
    }
    this.stats.pendingRequests = pending;
    this.stats.activeGroups = this.groups.size;

    return { ...this.stats };
  }

  /** Get the number of pending requests across all groups */
  getPendingCount(): number {
    let count = 0;
    for (const group of this.groups.values()) {
      count += group.requests.length;
    }
    return count;
  }

  /** Destroy the batcher and reject all pending requests */
  destroy(): void {
    this.destroyed = true;

    for (const [key, group] of this.groups) {
      clearTimeout(group.flushTimer);
      clearTimeout(group.maxWaitTimer);

      for (const pending of group.requests) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error("Batcher destroyed"));
      }
    }

    this.groups.clear();
  }

  // --- Private ---

  private generateId(): string {
    return `batch_${Date.now()}_${++this.idCounter}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private createGroup(key: string): BatchGroup {
    const group: BatchGroup = {
      key,
      requests: [],
      flushTimer: 0 as unknown as ReturnType<typeof setTimeout>,
      maxWaitTimer: 0 as unknown as ReturnType<typeof setTimeout>,
      lastActivity: Date.now(),
    };

    // Set up max-wait timer
    group.maxWaitTimer = setTimeout(() => {
      if (group.requests.length > 0) {
        this.flushGroup(key);
      }
    }, this.config.maxWaitMs);

    return group;
  }

  private scheduleFlush(group: BatchGroup): void {
    // Clear existing flush timer
    clearTimeout(group.flushTimer);

    // Schedule a new flush after the interval
    group.flushTimer = setTimeout(() => {
      if (group.requests.length > 0 && !this.destroyed) {
        this.flushGroup(group.key);
      }
    }, this.config.flushIntervalMs);
  }

  private async flushGroup(groupKey: string): Promise<void> {
    const group = this.groups.get(groupKey);
    if (!group || group.requests.length === 0) return;

    // Clear timers
    clearTimeout(group.flushTimer);
    clearTimeout(group.maxWaitTimer);

    // Take all requests
    const pendingRequests = group.requests.splice(0);
    group.requests = [];

    // Remove empty group
    if (this.groups.get(groupKey)?.requests.length === 0) {
      this.groups.delete(groupKey);
    }

    if (pendingRequests.length === 0) return;

    const startTime = performance.now();
    this.stats.totalBatches++;
    this.stats.totalBatchedRequests += pendingRequests.length;

    try {
      // Build batch payload
      const batchRequests = pendingRequests.map((p) => p.request);
      const payload = this.config.serialize(batchRequests);

      // Send batch request
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...this.config.headers,
      };

      if (this.config.authToken) {
        headers["Authorization"] = `Bearer ${this.config.authToken}`;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.config.url, {
        method: this.config.method,
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Batch request failed: HTTP ${response.status}`);
      }

      const responseData = await response.json();
      const results = this.config.deserialize(responseData);

      // Demultiplex responses back to individual promises
      const resultMap = new Map<string, BatchResponse<unknown>>();
      for (const result of results) {
        resultMap.set(result.requestId, result);
      }

      for (const pending of pendingRequests) {
        clearTimeout(pending.timeoutId);

        const result = resultMap.get(pending.id);
        if (result) {
          if (result.error) {
            pending.reject(new Error(result.error.message ?? `Server error: ${result.error.code}`));
            this.stats.errorCount++;
          } else {
            pending.resolve(result);
          }
        } else {
          // No matching response — treat as error
          pending.reject(new Error(`No response for request ${pending.id}`));
          this.stats.errorCount++;
        }
      }

      const elapsed = performance.now() - startTime;
      this.recordLatency(elapsed);
      this.stats.flushCount++;

    } catch (error) {
      // Reject all pending requests in this batch
      for (const pending of pendingRequests) {
        clearTimeout(pending.timeoutId);
        pending.reject(error instanceof Error ? error : new Error(String(error)));
        this.stats.errorCount++;
      }
    }
  }

  private removePending(groupKey: string, requestId: string): void {
    const group = this.groups.get(groupKey);
    if (!group) return;

    const idx = group.requests.findIndex((p) => p.id === requestId);
    if (idx !== -1) {
      group.requests.splice(idx, 1);
      this.stats.pendingRequests--;
    }
  }

  private recordLatency(ms: number): void {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > 100) this.latencySamples.shift();

    this.stats.averageFlushLatencyMs =
      this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length;

    if (this.stats.totalBatches > 0) {
      this.stats.averageBatchSize =
        this.stats.totalBatchedRequests / this.stats.totalBatches;
    }
  }
}

/** Create a pre-configured request batcher */
export function createRequestBatcher(config: BatchConfig): RequestBatcher {
  return new RequestBatcher(config);
}
