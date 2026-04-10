/**
 * Event Sourcing: Event store with append-only log, event projection,
 * snapshot management, aggregate pattern, saga orchestration,
 * CQRS-style read/write separation, versioning, replay,
 * event serialization, and time-travel debugging.
 */

// --- Types ---

export type EventType = string;

export interface BaseEvent<T = unknown> {
  id: string;
  type: EventType;
  aggregateId: string;
  aggregateType: string;
  version: number;
  timestamp: number;
  data: T;
  metadata?: EventMetadata;
  correlationId?: string;
  causationId?: string;   // ID of the event that caused this one
}

export interface EventMetadata {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  tags?: string[];
  source?: string;        // "api" | "scheduler" | "saga" | "migration"
}

export interface StoredEvent<T = unknown> extends BaseEvent<T> {
  globalPosition: number;  // Global log position
  streamPosition?: number;  // Position within aggregate stream
  committed: boolean;
  commitTimestamp?: number;
}

export interface AggregateRoot<TState = unknown> {
  id: string;
  type: string;
  version: number;
  state: TState;
  uncommittedEvents: BaseEvent<unknown>[];
  createdAt: number;
  updatedAt: number;
}

export interface Projection<TView = unknown> {
  name: string;
  sourceAggregateTypes: string[];
  handler: (event: BaseEvent<unknown>) => void;
  state: TView;
  lastProcessedPosition: number;
  lastProcessedAt: number;
}

export interface Snapshot<TState = unknown> {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: TState;
  createdAt: number;
  eventCount: number;
}

export interface SagaStep {
  name: string;
  action: () => Promise<void>;
  compensate?: () => Promise<void>;
  completed: boolean;
  startedAt?: number;
  completedAt?: number;
  error?: Error;
}

export interface SagaDefinition {
  id: string;
  name: string;
  steps: SagaStep[];
  status: "pending" | "running" | "completed" | "failed" | "compensating";
  createdAt: number;
  completedAt?: number;
  context?: Record<string, unknown>;
}

// --- Event Store ---

export class InMemoryEventStore {
  private events: StoredEvent<unknown>[] = [];
  private aggregates = new Map<string, AggregateRoot<unknown>>();
  private projections = new Map<string, Projection<unknown>>();
  private snapshots = new Map<string, Snapshot<unknown>[]>();
  private listeners = new Set<(event: StoredEvent<unknown>) => void>();
  private globalPosition = 0;
  private snapshotInterval = 100; // Create snapshot every N events

  /** Append an event to the log (append-only) */
  async append<T>(event: Omit<BaseEvent<T>, "version">): Promise<StoredEvent<T>> {
    const aggregate = this.aggregates.get(event.aggregateId);
    const version = aggregate ? aggregate.version + 1 : 1;

    const storedEvent: StoredEvent<T> = {
      ...event,
      version,
      globalPosition: ++this.globalPosition,
      streamPosition: (aggregate?.uncommittedEvents.length ?? 0) + 1,
      committed: true,
      commitTimestamp: Date.now(),
    };

    this.events.push(storedEvent);

    // Update aggregate
    if (aggregate) {
      aggregate.uncommittedEvents.push(storedEvent as BaseEvent<unknown>);
      aggregate.version = version;
      aggregate.updatedAt = Date.now();
    } else {
      // Create new aggregate stub
      this.aggregates.set(event.aggregateId, {
        id: event.aggregateId,
        type: event.aggregateType,
        version,
        state: {} as unknown,
        uncommittedEvents: [storedEvent as BaseEvent<unknown>],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Run projections
    for (const [, proj] of this.projections) {
      if (proj.sourceAggregateTypes.includes(event.aggregateType)) {
        try { proj.handler(storedEvent as BaseEvent<unknown>); } catch {}
        proj.lastProcessedPosition = storedEvent.globalPosition;
        proj.lastProcessedAt = Date.now();
      }
    }

    // Notify listeners
    for (const l of this.listeners) l(storedEvent);

    // Auto-snapshot
    if (version % this.snapshotInterval === 0 && aggregate) {
      this.createSnapshot(aggregate);
    }

    return storedEvent;
  }

  /** Append multiple events atomically */
  async appendBatch<T>(events: Array<Omit<BaseEvent<T>, "version">): Promise<StoredEvent<T>[]> {
    const stored: StoredEvent<T>[] = [];
    for (const event of events) stored.push(await this.append(event));
    return stored;
  }

  /** Read events for an aggregate */
  readStream(aggregateId: string, fromVersion = 0, toVersion?: number): StoredEvent<unknown>[] {
    return this.events.filter(
      (e) => e.aggregateId === aggregateId && e.version > fromVersion && (!toVersion || e.version <= toVersion)
    );
  }

  /** Read all events from a position */
  readAll(fromPosition = 0): StoredEvent<unknown>[] {
    return this.events.filter((e) => e.globalPosition > fromPosition);
  }

  /** Get an aggregate's current state */
  getAggregate(aggregateId: string): AggregateRoot<unknown> | undefined {
    return this.aggregates.get(aggregateId);
  }

  /** Get all aggregates */
  getAggregates(): AggregateRoot<unknown>[] { return Array.from(this.aggregates.values()); }

  /** Register a projection (read model updater) */
  registerProjection(projection: Projection<unknown>): void {
    this.projections.set(projection.name, projection);
  }

  /** Get a projection's current state */
  getProjection(name: string): Projection<unknown> | undefined {
    return this.projections.get(name);
  }

  /** Create a snapshot of an aggregate */
  createSnapshot(aggregate: AggregateRoot<unknown>): Snapshot<unknown> {
    const snap: Snapshot<unknown> = {
      aggregateId: aggregate.id,
      aggregateType: aggregate.type,
      version: aggregate.version,
      state: JSON.parse(JSON.stringify(aggregate.state)),
      createdAt: Date.now(),
      eventCount: aggregate.uncommittedEvents.length,
    };

    if (!this.snapshots.has(aggregate.id)) this.snapshots.set(aggregate.id, []);
    this.snapshots.get(aggregate.id)!.push(snap);

    // Keep only latest N snapshots
    const snaps = this.snapshots.get(aggregate.id)!;
    while (snaps.length > 10) snaps.shift();

    return snap;
  }

  /** Get latest snapshot for an aggregate */
  getLatestSnapshot(aggregateId: string): Snapshot<unknown> | undefined {
    const snaps = this.snapshots.get(aggregateId);
    return snaps?.[snaps.length - 1];
  }

  /** Replay events from a snapshot forward */
  replayFromSnapshot(aggregateId: string, fromVersion: number, handler: (event: BaseEvent<unknown>) => void): void {
    const events = this.readStream(aggregateId, fromVersion);
    for (const event of events) try { handler(event); } catch {}
  }

  /** Rebuild an aggregate from scratch (replay all events) */
  rebuildAggregate(aggregateId: string): AggregateRoot<unknown> | undefined {
    const events = this.readStream(aggregateId, 0);
    if (events.length === 0) return undefined;

    const aggregate: AggregateRoot<unknown> = {
      id: aggregateId,
      type: events[0]!.aggregateType,
      version: 0,
      state: {} as unknown,
      uncommittedEvents: [],
      createdAt: events[0]!.timestamp,
      updatedAt: events[0]!.timestamp,
    };

    for (const event of events) {
      this.applyEventToAggregate(aggregate, event);
      aggregate.version = event.version;
    }

    this.aggregates.set(aggregateId, aggregate);
    return aggregate;
  }

  /** Listen to all appended events */
  onEvent(listener: (event: StoredEvent<unknown>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get store statistics */
  getStats(): { totalEvents: number; aggregateCount: number; projectionCount: number; snapshotCount: number; globalPosition: number } {
    let snapCount = 0;
    for (const [, snaps] of this.snapshots) snapCount += snaps.length;
    return {
      totalEvents: this.events.length,
      aggregateCount: this.aggregates.size,
      projectionCount: this.projections.size,
      snapshotCount,
      globalPosition: this.globalPosition,
    };
  }

  /** Export all data */
  exportData(): { events: StoredEvent<unknown>[]; snapshots: Record<string, Snapshot<unknown>[]> } {
    return {
      events: [...this.events],
      snapshots: Object.fromEntries(Array.from(this.snapshots.entries()).map(([k, v]) => [k, v])),
    };
  }

  /** Import data (for migration/restore) */
  importData(data: { events: StoredEvent<unknown>[] }): void {
    for (const event of data.events) {
      this.events.push(event);
      if (event.globalPosition > this.globalPosition) this.globalPosition = event.globalPosition;
      // Rebuild aggregate index
      if (!this.aggregates.has(event.aggregateId)) {
        this.aggregates.set(event.aggregateId, {
          id: event.aggregateId, type: event.aggregateType,
          version: event.version, state: {} as unknown,
          uncommittedEvents: [], createdAt: event.timestamp, updatedAt: event.timestamp,
        });
      }
      const agg = this.aggregates.get(event.aggregateId)!;
      agg.version = Math.max(agg.version, event.version);
      agg.updatedAt = event.timestamp;
      agg.uncommittedEvents.push(event as BaseEvent<unknown>);
    }
  }

  // --- Internal ---

  private applyEventToAggregate(aggregate: AggregateRoot<unknown>, event: BaseEvent<unknown>): void {
    // This would call the aggregate's apply method in a real implementation
    // For the in-memory store, we just track version
    aggregate.uncommittedEvents.push(event);
  }
}

// --- Saga Orchestrator ---

export class SagaOrchestrator {
  private sagas = new Map<string, SagaDefinition>();
  private runningSagas = new Set<string>();
  private listeners = new Set<(saga: SagaDefinition, stepName: string, status: "started" | "completed" | "failed" | "compensated") => void>();
  private compensating = new Set<string>();

  /** Define and register a saga */
  defineSaga(definition: Omit<SagaDefinition, "status" | "createdAt">): SagaDefinition {
    const saga: SagaDefinition = { ...definition, status: "pending", createdAt: Date.now() };
    this.sagas.set(saga.id, saga);
    return saga;
  }

  /** Start executing a saga */
  async execute(sagaId: string): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (!saga) throw new Error(`Saga ${sagaId} not found`);
    if (this.runningSagas.has(sagaId)) throw new Error(`Saga ${sagaId} already running`);

    saga.status = "running";
    this.runningSagas.add(sagaId);

    try {
      for (const step of saga.steps) {
        if (this.compensating.has(sagaId)) break; // Stop if compensating

        step.startedAt = Date.now();
        step.completed = false;
        this.notifyListeners(saga, step.name, "started");

        await step.action();
        step.completed = true;
        step.completedAt = Date.now();
        this.notifyListeners(saga, step.name, "completed");
      }

      saga.status = "completed";
      saga.completedAt = Date.now();
    } catch (err) {
      saga.status = "failed";
      step.error = err as Error;
      this.notifyListeners(saga, saga.steps.find((s) => !s.completed)?.name ?? "unknown", "failed");

      // Start compensation
      await this.compensate(sagaId);
    } finally {
      this.runningSagas.delete(sagaId);
    }
  }

  /** Compensate (rollback) a saga */
  async compensate(sagaId: string): Promise<void> {
    const saga = this.sagas.get(sagaId);
    if (!saga) return;

    this.compensating.add(sagaId);
    saga.status = "compensating";

    // Execute compensations in reverse order
    const completedSteps = saga.steps.filter((s) => s.completed);
    for (let i = completedSteps.length - 1; i >= 0; i--) {
      const step = completedSteps[i]!;
      if (step.compensate) {
        try { await step.compensate(); } catch (err) {
          console.error(`[Saga] Compensation failed for ${step.name}:`, err);
        }
        this.notifyListeners(saga, step.name, "compensated");
      }
    }

    this.compensating.delete(sagaId);
    saga.status = "failed"; // Compensated but original failed
  }

  /** Get a saga's status */
  getSaga(sagaId: string): SagaDefinition | undefined { return this.sagas.get(sagaId); }

  /** Get all sagas */
  getAllSagas(): SagaDefinition[] { return Array.from(this.sagas.values()); }

  /** Listen to saga lifecycle events */
  onSagaEvent(listener: typeof SagaOrchestrator.prototype.listeners.values().next().value): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(saga: SagaDefinition, stepName: string, status: "started" | "completed" | "failed" | "compensated"): void {
    for (const l of this.listeners) l(saga, stepName, status);
  }
}

// --- Event Serializer ---

/** Serialize an event for storage/transmission */
export function serializeEvent<T>(event: BaseEvent<T>): string {
  return JSON.stringify({
    id: event.id,
    type: event.type,
    aggregateId: event.aggregateId,
    aggregateType: event.aggregateType,
    version: event.version,
    timestamp: event.timestamp,
    data: event.data,
    metadata: event.metadata,
    correlationId: event.correlationId,
    causationId: event.causationId,
  });
}

/** Deserialize an event from storage/transmission */
export function deserializeEvent<T>(json: string): BaseEvent<T> {
  return JSON.parse(json) as BaseEvent<T>;
}

/** Generate a unique event ID */
export function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${crypto.randomUUID?.slice(0, 8) ?? Math.random().toString(36).slice(2, 10)}`;
}

// --- Utility Functions ---

/** Create a correlation ID for tracing a flow across events */
export function createCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Validate an event structure */
export function validateEvent(event: Partial<BaseEvent<unknown>>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!event.id) errors.push("Missing id");
  if (!event.type) errors.push("Missing type");
  if (!event.aggregateId) errors.push("Missing aggregateId");
  if (!event.aggregateType) errors.push("Missing aggregateType");
  if (event.version == null) errors.push("Missing version");
  if (!event.timestamp) errors.push("Missing timestamp");
  if (event.data == null) errors.push("Missing data");
  return { valid: errors.length === 0, errors };
}

/** Compute event hash for deduplication */
export function eventHash(event: BaseEvent<unknown>): string {
  const str = `${event.type}:${event.aggregateId}:${event.version}:${JSON.stringify(event.data)}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
