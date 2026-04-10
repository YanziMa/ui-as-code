/**
 * Resource Pool: Generic object/connection pooling with health checks,
 * idle eviction, warm-up, metrics, lifecycle hooks, and multiple
 * acquisition strategies (FIFO/LIFO/Priority/Round-Robin).
 */

// --- Types ---

export type ResourceId = string;
export type PoolStatus = "idle" | "busy" | "warming-up" | "draining" | "destroyed";

export interface ResourceWrapper<T> {
  id: ResourceId;
  resource: T;
  status: "idle" | "busy" | "creating" | "destroying" | "unhealthy";
  createdAt: number;
  lastUsedAt: number;
  lastReturnedAt: number;
  useCount: number;
  acquireCount: number;
  releaseCount: number;
  metadata?: Record<string, unknown>;
}

export interface PoolOptions<T> {
  factory: () => T | Promise<T>;
  destroy?: (resource: T) => void | Promise<void>;
  healthCheck?: (resource: T) => boolean | Promise<boolean>;
  validate?: (resource: T) => boolean | Promise<boolean>;
  reset?: (resource: T) => void | Promise<void>;
  minSize?: number;
  maxSize?: number;
  maxPendingAcquires?: number;
  idleTimeoutMs?: number;
  maxResourceLifetimeMs?: number;
  acquireTimeoutMs?: number;
  healthCheckIntervalMs?: number;
  strategy?: "fifo" | "lifo" | "round-robin" | "least-used";
  initialSize?: number;
  eagerInit?: boolean;
  onAcquire?: (wrapper: ResourceWrapper<T>) => void;
  onRelease?: (wrapper: ResourceWrapper<T>) => void;
  onCreate?: (wrapper: ResourceWrapper<T>) => void;
  onDestroy?: (wrapper: ResourceWrapper<T>) => void;
  onUnhealthy?: (wrapper: ResourceWrapper<T>) => void;
  onExhausted?: () => void;
}

export interface PoolMetrics {
  totalCreated: number;
  totalDestroyed: number;
  totalAcquired: number;
  totalReleased: number;
  totalWaitTime: number;
  totalBorrowedTime: number;
  currentSize: number;
  idleCount: number;
  busyCount: number;
  pendingAcquires: number;
  peakSize: number;
  averageWaitTime: number;
  averageBorrowTime: number;
  hitRate: number;
  healthCheckFailures: number;
  evictionCount: number;
  creationErrors: number;
  acquireTimeouts: number;
}

export interface AcquireOptions {
  timeoutMs?: number;
  priority?: number;
  skipValidation?: boolean;
}

type PendingAcquire<T> = {
  resolve: (wrapper: ResourceWrapper<T>) => void;
  reject: (error: Error) => void;
  options: AcquireOptions;
  createdAt: number;
  timeout: ReturnType<typeof setTimeout>;
};

// --- ID Generator ---

let globalResourceIdCounter = 0;
function generateResourceId(): ResourceId {
  return `res_${++globalResourceIdCounter}_${Date.now().toString(36)}`;
}

// --- ResourcePool Implementation ---

export class ResourcePool<T = unknown> {
  private options: Required<Pick<PoolOptions<T>, "minSize" | "maxSize" | "maxPendingAcquires" | "idleTimeoutMs" | "maxResourceLifetimeMs" | "acquireTimeoutMs" | "healthCheckIntervalMs" | "strategy" | "eagerInit">> & Omit<PoolOptions<T>, "minSize" | "maxSize" | "maxPendingAcquires" | "idleTimeoutMs" | "maxResourceLifetimeMs" | "acquireTimeoutMs" | "healthCheckIntervalMs" | "strategy" | "eagerInit">;
  private resources = new Map<ResourceId, ResourceWrapper<T>>();
  private idleResources: ResourceId[] = [];
  private busyResources = new Set<ResourceId>();
  private pendingAcquires: PendingAcquire<T>[] = [];
  private status: PoolStatus = "idle";
  private metrics: PoolMetrics;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private evictionTimer: ReturnType<typeof setInterval> | null = null;
  private roundRobinIndex = 0;
  private destroyed = false;
  private drainPromise: Promise<void> | null = null;
  private drainResolve: (() => void) | null = null;

  constructor(options: PoolOptions<T>) {
    this.options = {
      minSize: options.minSize ?? 0,
      maxSize: options.maxSize ?? 10,
      maxPendingAcquires: options.maxPendingAcquires ?? Infinity,
      idleTimeoutMs: options.idleTimeoutMs ?? 30000,
      maxResourceLifetimeMs: options.maxResourceLifetimeMs ?? Infinity,
      acquireTimeoutMs: options.acquireTimeoutMs ?? 30000,
      healthCheckIntervalMs: options.healthCheckIntervalMs ?? 15000,
      strategy: options.strategy ?? "fifo",
      eagerInit: options.eagerInit ?? false,
      factory: options.factory,
      destroy: options.destroy,
      healthCheck: options.healthCheck,
      validate: options.validate,
      reset: options.reset,
      onAcquire: options.onAcquire,
      onRelease: options.onRelease,
      onCreate: options.onCreate,
      onDestroy: options.onDestroy,
      onUnhealthy: options.onUnhealthy,
      onExhausted: options.onExhausted,
      initialSize: options.initialSize,
    };
    this.metrics = this.createEmptyMetrics();

    if (this.options.healthCheck) {
      this.healthCheckTimer = setInterval(() => this.runHealthChecks(), this.options.healthCheckIntervalMs);
    }
    this.evictionTimer = setInterval(() => this.evictIdleResources(), Math.min(this.options.idleTimeoutMs, 60000));

    if (this.options.eagerInit) {
      const initSize = this.options.initialSize ?? this.options.minSize;
      this.warmup(initSize).catch(() => {});
    }
  }

  // --- Core API ---

  async acquire(options?: AcquireOptions): Promise<ResourceWrapper<T>> {
    if (this.destroyed) throw new Error("Pool is destroyed");
    const effectiveOptions: AcquireOptions = {
      timeoutMs: options?.timeoutMs ?? this.options.acquireTimeoutMs,
      priority: options?.priority ?? 0,
      skipValidation: options?.skipValidation ?? false,
    };

    const wrapper = await this.tryAcquireIdle(effectiveOptions);
    if (wrapper) return wrapper;

    if (this.resources.size < this.options.maxSize) return this.createAndAcquire(effectiveOptions);

    if (this.pendingAcquires.length >= this.options.maxPendingAcquires) {
      this.metrics.acquireTimeouts++;
      this.options.onExhausted?.();
      throw new Error("Pool exhausted: too many pending acquires");
    }

    return new Promise<ResourceWrapper<T>>((resolve, reject) => {
      const pending: PendingAcquire<T> = {
        resolve, reject, options: effectiveOptions,
        createdAt: Date.now(),
        timeout: setTimeout(() => {
          const idx = this.pendingAcquires.indexOf(pending);
          if (idx !== -1) this.pendingAcquires.splice(idx, 1);
          this.metrics.acquireTimeouts++;
          reject(new Error(`Acquire timed out after ${effectiveOptions.timeoutMs}ms`));
        }, effectiveOptions.timeoutMs),
      };
      const insertIdx = this.pendingAcquires.findIndex(
        (p) => (p.options.priority ?? 0) < (effectiveOptions.priority ?? 0),
      );
      if (insertIdx === -1) this.pendingAcquires.push(pending);
      else this.pendingAcquires.splice(insertIdx, 0, pending);
      this.options.onExhausted?.();
    });
  }

  async release(wrapper: ResourceWrapper<T>): Promise<void> {
    if (this.destroyed) { await this.destroyResource(wrapper); return; }
    const entry = this.resources.get(wrapper.id);
    if (!entry || entry.status !== "busy") return;

    if (this.options.reset) {
      try { await this.options.reset(entry.resource); }
      catch (e) { await this.destroyResource(entry); this.ensureMinSize(); return; }
    }

    entry.status = "idle";
    entry.releaseCount++;
    entry.lastReturnedAt = Date.now();
    this.busyResources.delete(wrapper.id);
    this.metrics.totalReleased++;
    this.addToIdleList(wrapper.id);
    this.options.onRelease?.(entry);
    this.servePendingAcquires();
  }

  /** Use a resource with automatic release */
  async use<R>(fn: (resource: T) => R | Promise<R>, options?: AcquireOptions): Promise<R> {
    const wrapper = await this.acquire(options);
    try { return await fn(wrapper.resource); }
    finally { await this.release(wrapper); }
  }

  // --- Lifecycle ---

  async warmup(count: number): Promise<number> {
    this.status = "warming-up";
    const target = Math.min(count, this.options.maxSize);
    let created = 0;
    const promises: Promise<void>[] = [];
    for (let i = 0; i < target; i++) {
      if (this.resources.size >= this.options.maxSize) break;
      promises.push(this.createResource().then((w) => { created++; this.addToIdleList(w.id); }).catch(() => {}));
    }
    await Promise.allSettled(promises);
    this.status = this.busyResources.size > 0 ? "busy" : "idle";
    return created;
  }

  async drain(): Promise<void> {
    if (this.drainPromise) return this.drainPromise;
    this.status = "draining";
    this.drainPromise = new Promise((resolve) => {
      this.drainResolve = resolve;
      if (this.busyResources.size === 0) { this.finishDrain(); return; }
    });
    return this.drainPromise;
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    this.status = "destroyed";
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.evictionTimer) clearInterval(this.evictionTimer);
    for (const pending of this.pendingAcquires) { clearTimeout(pending.timeout); pending.reject(new Error("Pool destroyed")); }
    this.pendingAcquires = [];
    const destroyPromises: Promise<void>[] = [];
    for (const [, w] of this.resources) destroyPromises.push(this.destroyResource(w).catch(() => {}));
    await Promise.allSettled(destroyPromises);
    this.resources.clear();
    this.idleResources = [];
    this.busyResources.clear();
  }

  // --- Query ---

  getStatus(): PoolStatus { return this.status; }
  getMetrics(): PoolMetrics { this.updateMetrics(); return { ...this.metrics }; }
  getIdleCount(): number { return this.idleResources.length; }
  getBusyCount(): number { return this.busyResources.size; }
  getSize(): number { return this.resources.size; }
  isDestroyed(): boolean { return this.destroyed; }
  isAvailable(): boolean { return this.idleResources.length > 0 || this.resources.size < this.options.maxSize; }

  // --- Internal: Resource Management ---

  private async createResource(): Promise<ResourceWrapper<T>> {
    const id = generateResourceId();
    const wrapper: ResourceWrapper<T> = {
      id, resource: await this.options.factory(), status: "creating",
      createdAt: Date.now(), lastUsedAt: Date.now(), lastReturnedAt: Date.now(),
      useCount: 0, acquireCount: 0, releaseCount: 0,
    };
    wrapper.status = "idle";
    this.resources.set(id, wrapper);
    this.metrics.totalCreated++;
    if (this.resources.size > this.metrics.peakSize) this.metrics.peakSize = this.resources.size;
    this.options.onCreate?.(wrapper);
    return wrapper;
  }

  private async destroyResource(wrapper: ResourceWrapper<T>): Promise<void> {
    wrapper.status = "destroying";
    this.resources.delete(wrapper.id);
    const idleIdx = this.idleResources.indexOf(wrapper.id);
    if (idleIdx !== -1) this.idleResources.splice(idleIdx, 1);
    this.busyResources.delete(wrapper.id);
    this.metrics.totalDestroyed++;
    if (this.options.destroy) { try { await this.options.destroy(wrapper.resource); } catch {} }
    this.options.onDestroy?.(wrapper);
  }

  private async tryAcquireIdle(options: AcquireOptions): Promise<ResourceWrapper<T> | null> {
    while (this.idleResources.length > 0) {
      const resourceId = this.pickFromIdleList();
      if (!resourceId) break;
      const wrapper = this.resources.get(resourceId);
      if (!wrapper || wrapper.status !== "idle") continue;

      if (this.options.maxResourceLifetimeMs !== Infinity &&
          Date.now() - wrapper.createdAt > this.options.maxResourceLifetimeMs) {
        this.removeFromIdleList(resourceId);
        await this.destroyResource(wrapper);
        if (this.resources.size < this.options.maxSize) return this.createAndAcquire(options);
        continue;
      }

      if (this.options.validate && !options.skipValidation) {
        try {
          const valid = await this.options.validate(wrapper.resource);
          if (!valid) {
            this.removeFromIdleList(resourceId);
            await this.destroyResource(wrapper);
            if (this.resources.size < this.options.maxSize) return this.createAndAcquire(options);
            continue;
          }
        } catch {
          this.removeFromIdleList(resourceId);
          await this.destroyResource(wrapper);
          continue;
        }
      }

      wrapper.status = "busy";
      wrapper.acquireCount++;
      wrapper.lastUsedAt = Date.now();
      this.busyResources.add(resourceId);
      this.metrics.totalAcquired++;
      this.metrics.hitRate = this.metrics.totalAcquired > 1
        ? (this.metrics.totalAcquired - this.metrics.totalCreated) / this.metrics.totalAcquired : 1;
      this.options.onAcquire?.(wrapper);
      return wrapper;
    }
    return null;
  }

  private async createAndAcquire(options: AcquireOptions): Promise<ResourceWrapper<T>> {
    const wrapper = await this.createResource();
    wrapper.status = "busy";
    wrapper.acquireCount++;
    wrapper.lastUsedAt = Date.now();
    this.busyResources.add(wrapper.id);
    this.metrics.totalAcquired++;
    this.options.onAcquire?.(wrapper);
    return wrapper;
  }

  // --- Internal: Strategy ---

  private pickFromIdleList(): ResourceId | null {
    switch (this.options.strategy) {
      case "fifo": return this.idleResources.shift() ?? null;
      case "lifo": return this.idleResources.pop() ?? null;
      case "round-robin": {
        if (this.idleResources.length === 0) return null;
        const idx = this.roundRobinIndex % this.idleResources.length;
        this.roundRobinIndex++;
        const resourceId = this.idleResources[idx];
        this.idleResources.splice(idx, 1);
        return resourceId;
      }
      case "least-used": {
        if (this.idleResources.length === 0) return null;
        let bestIdx = 0, bestUseCount = Infinity;
        for (let i = 0; i < this.idleResources.length; i++) {
          const w = this.resources.get(this.idleResources[i]);
          if (w && w.useCount < bestUseCount) { bestUseCount = w.useCount; bestIdx = i; }
        }
        return this.idleResources.splice(bestIdx, 1)[0] ?? null;
      }
      default: return this.idleResources.shift() ?? null;
    }
  }

  private addToIdleList(resourceId: ResourceId): void { this.idleResources.push(resourceId); }
  private removeFromIdleList(resourceId: ResourceId): void {
    const idx = this.idleResources.indexOf(resourceId);
    if (idx !== -1) this.idleResources.splice(idx, 1);
  }

  // --- Internal: Pending Queue ---

  private servePendingAcquires(): void {
    while (this.pendingAcquires.length > 0 && this.idleResources.length > 0) {
      const pending = this.pendingAcquires.shift()!;
      clearTimeout(pending.timeout);
      const waitTime = Date.now() - pending.createdAt;
      this.metrics.totalWaitTime += waitTime;
      this.tryAcquireIdle(pending.options).then((wrapper) => {
        if (wrapper) pending.resolve(wrapper);
        else if (this.resources.size < this.options.maxSize)
          this.createAndAcquire(pending.options).then(pending.resolve).catch(pending.reject);
        else pending.reject(new Error("No resource available"));
      }).catch(pending.reject);
    }
  }

  // --- Internal: Health Checks ---

  private async runHealthChecks(): Promise<void> {
    if (!this.options.healthCheck || this.destroyed) return;
    const checks: Promise<void>[] = [];
    for (const resourceId of [...this.idleResources]) {
      const wrapper = this.resources.get(resourceId);
      if (!wrapper || wrapper.status !== "idle") continue;
      checks.push((async () => {
        try {
          const healthy = await this.options.healthCheck!(wrapper.resource);
          if (!healthy) {
            wrapper.status = "unhealthy";
            this.removeFromIdleList(resourceId);
            this.metrics.healthCheckFailures++;
            this.options.onUnhealthy?.(wrapper);
            await this.destroyResource(wrapper);
            this.ensureMinSize();
          }
        } catch {
          wrapper.status = "unhealthy";
          this.removeFromIdleList(resourceId);
          this.metrics.healthCheckFailures++;
          this.options.onUnhealthy?.(wrapper);
          await this.destroyResource(wrapper);
          this.ensureMinSize();
        }
      })());
    }
    await Promise.allSettled(checks);
  }

  // --- Internal: Eviction ---

  private async evictIdleResources(): Promise<void> {
    if (this.destroyed) return;
    const now = Date.now();
    const toEvict: ResourceId[] = [];
    for (const resourceId of [...this.idleResources]) {
      const wrapper = this.resources.get(resourceId);
      if (!wrapper || wrapper.status !== "idle") continue;
      if (now - wrapper.lastReturnedAt > this.options.idleTimeoutMs) toEvict.push(resourceId);
    }
    for (const resourceId of toEvict) {
      const wrapper = this.resources.get(resourceId);
      if (wrapper) { this.removeFromIdleList(resourceId); await this.destroyResource(wrapper); this.metrics.evictionCount++; }
    }
    this.ensureMinSize();
  }

  private ensureMinSize(): void {
    if (this.destroyed) return;
    while (this.resources.size < this.options.minSize) {
      this.createResource().then((w) => this.addToIdleList(w.id)).catch(() => {});
    }
  }

  // --- Internal: Drain ---

  private finishDrain(): void {
    const promises: Promise<void>[] = [];
    for (const [, w] of this.resources) promises.push(this.destroyResource(w).catch(() => {}));
    Promise.allSettled(promises).then(() => {
      this.status = "destroyed"; this.destroyed = true;
      this.drainResolve?.(); this.drainPromise = null; this.drainResolve = null;
    });
  }

  // --- Metrics ---

  private createEmptyMetrics(): PoolMetrics {
    return {
      totalCreated: 0, totalDestroyed: 0, totalAcquired: 0, totalReleased: 0,
      totalWaitTime: 0, totalBorrowedTime: 0, currentSize: 0, idleCount: 0,
      busyCount: 0, pendingAcquires: 0, peakSize: 0, averageWaitTime: 0,
      averageBorrowTime: 0, hitRate: 0, healthCheckFailures: 0,
      evictionCount: 0, creationErrors: 0, acquireTimeouts: 0,
    };
  }

  private updateMetrics(): void {
    this.metrics.currentSize = this.resources.size;
    this.metrics.idleCount = this.idleResources.length;
    this.metrics.busyCount = this.busyResources.size;
    this.metrics.pendingAcquires = this.pendingAcquires.length;
    this.metrics.averageWaitTime = this.metrics.totalAcquired > 0 ? this.metrics.totalWaitTime / this.metrics.totalAcquired : 0;
  }
}

// --- ConnectionPool (specialized with reconnection logic) ---

export interface ConnectionPoolOptions<T> extends PoolOptions<T> {
  connectionTest?: (conn: T) => Promise<boolean>;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelayMs?: number;
}

export class ConnectionPool<T = unknown> extends ResourcePool<T> {
  private connOptions: ConnectionPoolOptions<T>;

  constructor(options: ConnectionPoolOptions<T>) {
    super(options);
    this.connOptions = options;
  }

  async execute<R>(fn: (connection: T) => Promise<R>): Promise<R> {
    let lastError: Error | undefined;
    const maxAttempts = this.connOptions.maxReconnectAttempts ?? 3;
    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      try { return await this.use(async (conn) => fn(conn)); }
      catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < maxAttempts && this.connOptions.autoReconnect !== false) {
          const delay = (this.connOptions.reconnectDelayMs ?? 1000) * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError!;
  }
}

// --- Factory Functions ---

export function createResourcePool<T>(options: PoolOptions<T>): ResourcePool<T> {
  return new ResourcePool<T>(options);
}

export function createConnectionPool<T>(options: ConnectionPoolOptions<T>): ConnectionPool<T> {
  return new ConnectionPool<T>(options);
}
