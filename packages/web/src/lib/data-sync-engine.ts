/**
 * Data Sync Engine: Bidirectional data synchronization with conflict resolution
 * strategies (last-write-wins, merge, custom), change detection, sync queue,
 * offline support, incremental sync, watermark-based progress tracking,
 * and multi-source reconciliation.
 */

// --- Types ---

export type SyncId = string;
export type EntityId = string;
export type EntityType = string;
export type Revision = number;

export interface SyncEntity<T = Record<string, unknown>> {
  id: EntityId;
  type: EntityType;
  data: T;
  revision: Revision; // monotonically increasing version
  updatedAt: number; // server timestamp (ms)
  createdAt: number;
  deleted?: boolean; // tombstone for sync
  checksum?: string; // for integrity verification
}

export type ConflictStrategy = "last-write-wins" | "client-wins" | "server-wins" | "merge" | "manual";

export interface SyncConflict<T = Record<string, unknown>> {
  id: EntityId;
  type: EntityType;
  localVersion: SyncEntity<T>;
  remoteVersion: SyncEntity<T>;
  baseVersion?: SyncEntity<T>; // common ancestor if available
  resolvedBy: string | null; // "auto:<strategy>" or user ID when manual
  resolvedAt?: number;
  resolution?: SyncEntity<T>;
}

export interface SyncOperation {
  id: SyncId;
  entityType: EntityType;
  entityId: EntityId;
  operation: "create" | "update" | "delete";
  data: Record<string, unknown>;
  revision: Revision;
  timestamp: number;
  status: "pending" | "syncing" | "completed" | "failed" | "conflict";
  retryCount: number;
  error?: string;
  priority: number; // higher = synced first
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncAt: number | null;
  lastSyncDuration: number | null;
  pendingOperations: number;
  failedOperations: number;
  conflictsPending: number;
  entitiesSynced: number;
  totalEntities: number;
  syncProgress: number; // 0-100
  watermark: number; // last synced revision from server
}

export interface SyncConfig {
  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy;
  /** Custom merge function for "merge" strategy */
  mergeFn?: <T>(local: T, remote: T, base?: T) => T;
  /** Auto-sync interval in ms (0 = manual only) */
  autoSyncIntervalMs?: number;
  /** Max concurrent sync operations (default: 5) */
  concurrency?: number;
  /** Max retries per failed operation (default: 3) */
  maxRetries?: number;
  /** Retry delay in ms (default: 1000) */
  retryDelayMs?: number;
  /** Batch size for push operations (default: 50) */
  batchSize?: number;
  /** Enable offline mode detection */
  offlineSupport?: boolean;
  /** Storage adapter for local persistence */
  storageAdapter?: SyncStorageAdapter;
  /** Remote sync endpoint */
  remoteEndpoint?: string;
  /** Auth token provider */
  getAuthToken?: () => string | Promise<string>;
  /** Called when a conflict needs manual resolution */
  onConflict?: (conflict: SyncConflict) => Promise<SyncEntity<unknown> | null>;
  /** Called on sync progress updates */
  onProgress?: (status: SyncStatus) => void;
  /** Called on sync completion */
  onComplete?: (status: SyncStatus) => void;
  /** Called on sync error */
  onError?: (error: Error) => void;
}

export interface SyncStorageAdapter {
  get(entityType: EntityId, entityId: EntityId): Promise<SyncEntity | null>;
  getAll(entityType: EntityId): Promise<SyncEntity[]>;
  put(entity: SyncEntity): Promise<void>;
  delete(entityType: EntityId, entityId: EntityId): Promise<void>;
  getWatermark(): Promise<number>;
  setWatermark(revision: Revision): Promise<void>;
  getPendingOps(): Promise<SyncOperation[]>;
  addOp(op: SyncOperation): Promise<void>;
  updateOp(op: SyncOperation): Promise<void>;
  removeOp(opId: SyncId): Promise<void>;
  clearAll?(): Promise<void>;
}

export interface SyncPullResult {
  entitiesReceived: number;
  entitiesCreated: number;
  entitiesUpdated: number;
  entitiesDeleted: number;
  conflicts: SyncConflict[];
  newWatermark: number;
  duration: number;
}

export interface SyncPushResult {
  operationsSent: number;
  operationsSucceeded: number;
  operationsFailed: number;
  duration: number;
}

// --- In-Memory Storage Adapter ---

export class MemorySyncStore implements SyncStorageAdapter {
  private entities = new Map<string, SyncEntity>(); // "type:id" -> entity
  private watermark = 0;
  private ops: SyncOperation[] = [];

  async get(entityType: EntityId, entityId: EntityId): Promise<SyncEntity | null> {
    return this.entities.get(`${entityType}:${entityId}`) ?? null;
  }

  async getAll(entityType: EntityId): Promise<SyncEntity[]> {
    const results: SyncEntity[] = [];
    for (const [key, entity] of this.entities) {
      if (key.startsWith(`${entityType}:`) && !entity.deleted) results.push(entity);
    }
    return results;
  }

  async put(entity: SyncEntity): Promise<void> {
    this.entities.set(`${entity.type}:${entity.id}`, entity);
  }

  async delete(entityType: EntityId, entityId: EntityId): Promise<void> {
    this.entities.delete(`${entityType}:${entityId}`);
  }

  async getWatermark(): Promise<number> { return this.watermark; }
  async setWatermark(revision: Revision): Promise<void> { this.watermark = revision; }
  async getPendingOps(): Promise<SyncOperation[]> { return [...this.ops]; }
  async addOp(op: SyncOperation): Promise<void> { this.ops.push(op); }
  async updateOp(op: SyncOperation): Promise<void> {
    const idx = this.ops.findIndex((o) => o.id === op.id);
    if (idx !== -1) this.ops[idx] = op;
  }
  async removeOp(opId: SyncId): Promise<void> { this.ops = this.ops.filter((o) => o.id !== opId); }
  async clearAll(): Promise<void> { this.entities.clear(); this.ops = []; this.watermark = 0; }
}

// --- DataSyncEngine Implementation ---

export class DataSyncEngine {
  private config: Required<
    Pick<SyncConfig,
      | "conflictStrategy"
      | "autoSyncIntervalMs"
      | "concurrency"
      | "maxRetries"
      | "retryDelayMs"
      | "batchSize"
      | "offlineSupport"
    >
  > & Omit<SyncConfig,
    | "conflictStrategy"
    | "autoSyncIntervalMs"
    | "concurrency"
    | "maxRetries"
    | "retryDelayMs"
    | "batchSize"
    | "offlineSupport"
  >;

  private store: SyncStorageAdapter;
  private status: SyncStatus;
  private conflicts: Map<EntityId, SyncConflict> = new Map();
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private destroyed = false;
  private localRevisionCounter = 0;

  constructor(config: SyncConfig = {}) {
    this.config = {
      conflictStrategy: config.conflictStrategy ?? "last-write-wins",
      autoSyncIntervalMs: config.autoSyncIntervalMs ?? 0,
      concurrency: config.concurrency ?? 5,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
      batchSize: config.batchSize ?? 50,
      offlineSupport: config.offlineSupport ?? true,
      storageAdapter: config.storageAdapter ?? new MemorySyncStore(),
      remoteEndpoint: config.remoteEndpoint,
      getAuthToken: config.getAuthToken,
      mergeFn: config.mergeFn,
      onConflict: config.onConflict,
      onProgress: config.onProgress,
      onComplete: config.onComplete,
      onError: config.onError,
    };
    this.store = this.config.storageAdapter!;
    this.status = this.createEmptyStatus();

    if (this.config.autoSyncIntervalMs > 0) {
      this.syncTimer = setInterval(() => this.sync(), this.config.autoSyncIntervalMs);
    }
  }

  // --- Local Operations ---

  /**
   * Create a new entity locally (queues for sync).
   */
  async create<T>(entityType: EntityType, data: T, entityId?: EntityId): Promise<SyncEntity<T>> {
    const id = entityId ?? this.generateId();
    const now = Date.now();
    const entity: SyncEntity<T> = {
      id, type: entityType, data,
      revision: ++this.localRevisionCounter,
      updatedAt: now, createdAt: now,
    };

    await this.store.put(entity);

    // Queue sync operation
    await this.store.addOp({
      id: this.generateSyncId(),
      entityType, entityId: id,
      operation: "create", data: data as Record<string, unknown>,
      revision: entity.revision, timestamp: now,
      status: "pending", retryCount: 0, priority: 0,
    });

    this.updateStatus();
    return entity;
  }

  /**
   * Update an existing entity locally.
   */
  async update<T>(entityType: EntityType, entityId: EntityId, data: Partial<T>): Promise<SyncEntity<T> | null> {
    const existing = await this.store.get(entityType, entityId);
    if (!existing && !existing?.deleted) return null;

    const now = Date.now();
    const mergedData = typeof existing?.data === "object" && existing !== null
      ? { ...(existing.data as Record<string, unknown>), ...data as Record<string, unknown> }
      : data;

    const entity: SyncEntity<T> = {
      ...existing!, data: mergedData as T,
      revision: ++this.localRevisionCounter, updatedAt: now,
    };

    await this.store.put(entity);
    await this.store.addOp({
      id: this.generateSyncId(), entityType, entityId,
      operation: "update", data: mergedData as Record<string, unknown>,
      revision: entity.revision, timestamp: now,
      status: "pending", retryCount: 0, priority: 0,
    });

    this.updateStatus();
    return entity;
  }

  /**
   * Delete an entity locally (creates tombstone).
   */
  async delete(entityType: EntityType, entityId: EntityId): Promise<boolean> {
    const existing = await this.store.get(entityType, entityId);
    if (!existing) return false;

    const now = Date.now();
    const tombstone: SyncEntity = {
      ...existing, deleted: true,
      revision: ++this.localRevisionCounter, updatedAt: now,
    };

    await this.store.put(tombstone);
    await this.store.addOp({
      id: this.generateSyncId(), entityType, entityId,
      operation: "delete", data: {},
      revision: tombstone.revision, timestamp: now,
      status: "pending", retryCount: 0, priority: 10, // deletes are high priority
    });

    this.updateStatus();
    return true;
  }

  /**
   * Get an entity from local store.
   */
  async get<T>(entityType: EntityType, entityId: EntityId): Promise<SyncEntity<T> | null> {
    const entity = await this.store.get(entityType, entityId);
    if (entity?.deleted) return null;
    return entity as SyncEntity<T> | null;
  }

  /**
   * Query all entities of a type.
   */
  async query<T>(entityType: EntityType): Promise<SyncEntity<T>[]> {
    const all = await this.store.getAll(entityType);
    return all.filter((e) => !e.deleted) as SyncEntity<T>[];
  }

  // --- Sync Operations ---

  /**
   * Perform bidirectional sync (pull + push).
   */
  async sync(): Promise<{ pull: SyncPullResult; push: SyncPushResult }> {
    if (this.isSyncing || this.destroyed) {
      return {
        pull: { entitiesReceived: 0, entitiesCreated: 0, entitiesUpdated: 0, entitiesDeleted: 0, conflicts: [], newWatermark: 0, duration: 0 },
        push: { operationsSent: 0, operationsSucceeded: 0, operationsFailed: 0, duration: 0 },
      };
    }

    this.isSyncing = true;
    this.status.isSyncing = true;
    const syncStart = Date.now();
    this.notifyProgress();

    try {
      const [pullResult, pushResult] = await Promise.all([
        this.pull(),
        this.push(),
      ]);

      this.status.lastSyncAt = Date.now();
      this.status.lastSyncDuration = Date.now() - syncStart;
      this.status.isSyncing = false;
      this.notifyProgress();
      this.config.onComplete?.(this.status);

      return { pull: pullResult, push: pushResult };
    } catch (e) {
      this.status.isSyncing = false;
      this.config.onError?.(e instanceof Error ? e : new Error(String(e)));
      throw e;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Pull changes from remote server.
   */
  async pull(): Promise<SyncPullResult> {
    const start = performance.now();
    let result: SyncPullResult = {
      entitiesReceived: 0, entitiesCreated: 0, entitiesUpdated: 0,
      entitiesDeleted: 0, conflicts: [], newWatermark: 0, duration: 0,
    };

    if (!this.config.remoteEndpoint) return result;

    try {
      const watermark = await this.store.getWatermark();
      const token = await this.config.getAuthToken?.();

      const response = await fetch(
        `${this.config.remoteEndpoint}/sync/pull?watermark=${watermark}`,
        {
          headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
        },
      );

      if (!response.ok) throw new Error(`Pull failed: ${response.status}`);

      const payload = await response.json() as {
        entities: SyncEntity[];
        watermark: Revision;
        deletions: Array<{ type: EntityType; id: EntityId }>;
      };

      result.entitiesReceived = payload.entities.length + payload.deletions.length;

      for (const entity of payload.entities) {
        const existing = await this.store.get(entity.type, entity.id);

        if (!existing) {
          // New entity — accept directly
          await this.store.put(entity);
          result.entitiesCreated++;
        } else if (entity.revision > existing.revision) {
          // Remote is newer — check for conflict
          if (existing.revision > (await this.store.getWatermark())) {
            // Local has uncommitted changes — potential conflict
            const conflict = await this.resolveConflict(existing, entity);
            if (conflict) {
              result.conflicts.push(conflict);
              if (conflict.resolution) await this.store.put(conflict.resolution);
            } else {
              await this.store.put(entity); // Auto-resolved
              result.entitiesUpdated++;
            }
          } else {
            await this.store.put(entity);
            result.entitiesUpdated++;
          }
        }
        // Else: local is newer or same — ignore remote
      }

      // Process deletions
      for (const del of payload.deletions) {
        const existing = await this.store.get(del.type, del.id);
        if (existing && !existing.deleted) {
          await this.store.delete(del.type, del.id);
          result.entitiesDeleted++;
        }
      }

      result.newWatermark = payload.watermark;
      await this.store.setWatermark(payload.watermark);
      this.status.watermark = payload.watermark;

    } catch (e) {
      this.config.onError?.(e instanceof Error ? e : new Error(String(e)));
    }

    result.duration = performance.now() - start;
    return result;
  }

  /**
   * Push local changes to remote server.
   */
  async push(): Promise<SyncPushResult> {
    const start = performance.now();
    let result: SyncPushResult = { operationsSent: 0, operationsSucceeded: 0, operationsFailed: 0, duration: 0 };

    if (!this.config.remoteEndpoint) return result;

    const pendingOps = await this.store.getPendingOps()
      .then((ops) => ops.filter((o) => o.status === "pending"))
      .then((ops) => ops.sort((a, b) => b.priority - a.priority));

    if (pendingOps.length === 0) return result;

    // Process in batches
    for (let i = 0; i < pendingOps.length; i += this.config.batchSize) {
      const batch = pendingOps.slice(i, i + this.config.batchSize);
      result.operationsSent += batch.length;

      try {
        const token = await this.config.getAuthToken?.();
        const response = await fetch(`${this.config.remoteEndpoint}/sync/push`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" },
          body: JSON.stringify({ operations: batch }),
        });

        if (!response.ok) throw new Error(`Push failed: ${response.status}`);

        const results = await response.json() as Array<{
          opId: SyncId; success: boolean; newRevision?: Revision; error?: string;
        }>;

        for (const r of results) {
          const op = batch.find((o) => o.id === r.opId);
          if (!op) continue;

          if (r.success) {
            op.status = "completed";
            if (r.newRevision) op.revision = r.newRevision;
            result.operationsSucceeded++;
            await this.store.updateOp(op);
            await this.store.removeOp(op.id);
          } else {
            op.retryCount++;
            op.error = r.error;
            if (op.retryCount >= this.config.maxRetries) {
              op.status = "failed";
              result.operationsFailed++;
            }
            await this.store.updateOp(op);
          }
        }
      } catch (e) {
        // Mark batch as needing retry
        for (const op of batch) {
          op.retryCount++;
          op.error = (e as Error).message;
          if (op.retryCount >= this.config.maxRetries) {
            op.status = "failed";
            result.operationsFailed++;
          }
          await this.store.updateOp(op);
        }
        this.config.onError?.(e instanceof Error ? e : new Error(String(e)));
      }
    }

    this.updateStatus();
    result.duration = performance.now() - start;
    return result;
  }

  // --- Conflict Management ---

  getConflicts(): SyncConflict[] { return Array.from(this.conflicts.values()); }
  getConflict(entityId: EntityId): SyncConflict | undefined { return this.conflicts.get(entityId); }

  async resolveConflictManually(entityId: EntityId, resolution: SyncEntity): Promise<boolean> {
    const conflict = this.conflicts.get(entityId);
    if (!conflict) return false;

    conflict.resolvedBy = "manual";
    conflict.resolvedAt = Date.now();
    conflict.resolution = resolution;
    await this.store.put(resolution);

    // Queue the resolved version for push
    await this.store.addOp({
      id: this.generateSyncId(), entityType: resolution.type,
      entityId: resolution.id, operation: "update",
      data: resolution.data as Record<string, unknown>,
      resolution.revision, timestamp: Date.now(),
      status: "pending", retryCount: 0, priority: 5,
    });

    this.conflicts.delete(entityId);
    this.updateStatus();
    return true;
  }

  // --- Status ---

  getStatus(): SyncStatus { return { ...this.status }; }

  /** Check if there are pending changes to sync */
  hasPendingChanges(): boolean {
    // This is approximate — check would need async
    return this.status.pendingOperations > 0;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.syncTimer) clearInterval(this.syncTimer);
    this.conflicts.clear();
  }

  // --- Internal ---

  private async resolveConflict(local: SyncEntity, remote: SyncEntity): Promise<SyncConflict | null> {
    const conflict: SyncConflict = {
      id: local.id, type: local.type,
      localVersion: local, remoteVersion: remote,
      resolvedBy: null,
    };

    switch (this.config.conflictStrategy) {
      case "client-wins":
        conflict.resolvedBy = "auto:client-wins";
        conflict.resolution = local;
        break;

      case "server-wins":
        conflict.resolvedBy = "auto:server-wins";
        conflict.resolution = remote;
        break;

      case "last-write-wins":
        conflict.resolvedBy = "auto:last-write-wins";
        conflict.resolution = local.updatedAt >= remote.updatedAt ? local : remote;
        break;

      case "merge":
        if (this.config.mergeFn) {
          try {
            const merged = this.config.mergeFn(local.data, remote.data);
            conflict.resolvedBy = "auto:merge";
            conflict.resolution = { ...local, data: merged, revision: Math.max(local.revision, remote.revision), updatedAt: Date.now() };
          } catch {
            // Merge failed — fall through to manual
            conflict.resolvedBy = null;
          }
        } else {
          conflict.resolvedBy = null;
        }
        break;

      case "manual":
      default:
        conflict.resolvedBy = null;
        break;
    }

    if (!conflict.resolvedBy) {
      // Needs manual resolution
      this.conflicts.set(local.id, conflict);
      if (this.config.onConflict) {
        const resolution = await this.config.onConflict(conflict);
        if (resolution) {
          conflict.resolvedBy = "manual:user";
          conflict.resolvedAt = Date.now();
          conflict.resolution = resolution as SyncEntity;
          await this.store.put(resolution as SyncEntity);
        }
      }
      return conflict;
    }

    // Auto-resolved — apply immediately
    if (conflict.resolution) {
      await this.store.put(conflict.resolution);
    }

    return conflict;
  }

  private createEmptyStatus(): SyncStatus {
    return {
      isSyncing: false, lastSyncAt: null, lastSyncDuration: null,
      pendingOperations: 0, failedOperations: 0, conflictsPending: 0,
      entitiesSynced: 0, totalEntities: 0, syncProgress: 0, watermark: 0,
    };
  }

  private async updateStatus(): Promise<void> {
    const ops = await this.store.getPendingOps();
    this.status.pendingOperations = ops.filter((o) => o.status === "pending").length;
    this.status.failedOperations = ops.filter((o) => o.status === "failed").length;
    this.status.conflictsPending = this.conflicts.size;
    this.status.watermark = await this.store.getWatermark();
    this.notifyProgress();
  }

  private notifyProgress(): void {
    this.config.onProgress?.(this.status);
  }

  private generateId(): EntityId {
    return `ent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateSyncId(): SyncId {
    return `sync_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

// --- Factory ---

export function createDataSyncEngine(config?: SyncConfig): DataSyncEngine {
  return new DataSyncEngine(config);
}
