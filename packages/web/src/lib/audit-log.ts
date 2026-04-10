/**
 * audit-log.ts — Comprehensive Audit Logging Library
 *
 * Provides structured event logging, querying, statistics, export,
 * sensitive-data masking, and async-function wrapping middleware.
 */

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

/** Recognised audit actions (use as string constants). */
export const AuditActions = {
  CREATE: 'create', READ: 'read', UPDATE: 'update', DELETE: 'delete',
  LOGIN: 'login', LOGOUT: 'logout', EXPORT: 'export', IMPORT: 'import',
  APPROVE: 'approve', REJECT: 'reject', SHARE: 'share',
} as const;
export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditStatus = 'success' | 'failure';

/** A single audit-log entry. */
export interface AuditEvent {
  id: string; timestamp: Date; actor: string; action: string;
  resourceType: string; resourceId: string; metadata: Record<string, unknown>;
  ipAddress?: string; userAgent?: string; severity: AuditSeverity;
  status: AuditStatus; duration?: number; // ms
}

/** Configuration options for the AuditLog instance. */
export interface AuditLogOptions {
  maxEntries: number; retentionDays: number;
  storage?: AuditStorageBackend;
}

/** Pluggable persistence layer. */
export interface AuditStorageBackend {
  load(): Promise<AuditEvent[]>;
  persist(events: AuditEvent[]): Promise<void>;
}

export type AuditSortField = 'timestamp' | 'action' | 'severity' | 'duration';
export type AuditSortOrder = 'asc' | 'desc';

/** Filters accepted by `AuditLog.query()`. */
export interface AuditQueryFilters {
  actor?: string; action?: string; resourceType?: string; resourceId?: string;
  severity?: AuditSeverity; status?: AuditStatus;
  startTime?: Date; endTime?: Date; search?: string;
  limit?: number; offset?: number;
  sortBy?: AuditSortField; sortOrder?: AuditSortOrder;
}

/** Aggregated statistics returned by `AuditLog.getStats()`. */
export interface AuditStats {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByActor: Record<string, number>; // top 5
  eventsByResource: Record<string, number>;
  successRate: number;        // 0 – 1
  avgDuration: number | null; // ms
  criticalCount: number;
  dateRange: { start: Date | null; end: Date | null };
}

// ---------------------------------------------------------------------------
// Sensitive-Data Masking
// ---------------------------------------------------------------------------

const DEFAULT_SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn',
] as const;

/**
 * Return a shallow copy of `data` with listed fields replaced by `'***REDACTED***'`.
 *
 * ```ts
 * maskSensitiveData({ password: 's3cret', name: 'Alice' }, ['password'])
 * // => { password: '***REDACTED***', name: 'Alice' }
 * ```
 */
export function maskSensitiveData(
  data: Record<string, unknown>,
  fieldsToMask: readonly string[] = DEFAULT_SENSITIVE_FIELDS,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  for (const key of Object.keys(result)) {
    if (fieldsToMask.includes(key)) result[key] = '***REDACTED***';
  }
  return result;
}

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateId(): string {
  _idCounter += 1;
  return `evt-${Date.now()}-${_idCounter.toString(36).padStart(4, '0')}`;
}

// ---------------------------------------------------------------------------
// AuditLog class
// ---------------------------------------------------------------------------

export class AuditLog {
  private _entries: AuditEvent[] = [];
  private readonly _opts: Required<Pick<AuditLogOptions, 'maxEntries' | 'retentionDays'>> & { storage?: AuditStorageBackend };

  constructor(options?: Partial<AuditLogOptions>) {
    this._opts = {
      maxEntries: options?.maxEntries ?? 10_000,
      retentionDays: options?.retentionDays ?? 90,
      storage: options?.storage,
    };
  }

  /** Record a new audit event. Returns the fully-formed stored event. */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const full: AuditEvent = { ...event, id: generateId(), timestamp: new Date() };
    this._entries.unshift(full);
    if (this._entries.length > this._opts.maxEntries) {
      this._entries = this._entries.slice(0, this._opts.maxEntries);
    }
    void this._persist();
    return full;
  }

  // -- Read / Query -------------------------------------------------------

  getById(id: string): AuditEvent | null {
    return this._entries.find((e) => e.id === id) ?? null;
  }

  getRecent(limit = 50): AuditEvent[] { return this._entries.slice(0, limit); }

  getByActor(actorId: string): AuditEvent[] {
    return this._entries.filter((e) => e.actor === actorId);
  }

  getByResource(resourceType: string, resourceId: string): AuditEvent[] {
    return this._entries.filter(
      (e) => e.resourceType === resourceType && e.resourceId === resourceId,
    );
  }

  getByAction(action: string): AuditEvent[] {
    return this._entries.filter((e) => e.action === action);
  }

  getTimeRange(start: Date, end: Date): AuditEvent[] {
    return this._entries.filter((e) => e.timestamp >= start && e.timestamp <= end);
  }

  /**
   * Flexible query with multiple optional filters.
   * Results default to sorted newest-first unless overridden.
   */
  query(filters: AuditQueryFilters = {}): AuditEvent[] {
    let results = [...this._entries];
    const f = filters;

    if (f.actor)   results = results.filter((e) => e.actor === f.actor);
    if (f.action)  results = results.filter((e) => e.action === f.action);
    if (f.resourceType)
      results = results.filter((e) => e.resourceType === f.resourceType);
    if (f.resourceId)
      results = results.filter((e) => e.resourceId === f.resourceId);
    if (f.severity)
      results = results.filter((e) => e.severity === f.severity);
    if (f.status)  results = results.filter((e) => e.status === f.status);
    if (f.startTime)
      results = results.filter((e) => e.timestamp >= f.startTime!);
    if (f.endTime)
      results = results.filter((e) => e.timestamp <= f.endTime!);

    if (f.search) {
      const term = f.search.toLowerCase();
      results = results.filter((e) => {
        const metaStr = JSON.stringify(e.metadata).toLowerCase();
        return (
          e.actor.toLowerCase().includes(term) ||
          e.action.toLowerCase().includes(term) ||
          e.resourceType.toLowerCase().includes(term) ||
          e.resourceId.toLowerCase().includes(term) ||
          metaStr.includes(term)
        );
      });
    }

    const sortBy: AuditSortField = f.sortBy ?? 'timestamp';
    const sortOrder: AuditSortOrder = f.sortOrder ?? 'desc';

    results.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'timestamp': cmp = a.timestamp.getTime() - b.timestamp.getTime(); break;
        case 'action':    cmp = a.action.localeCompare(b.action); break;
        case 'severity': {
          const order: Record<AuditSeverity, number> = { info: 0, warning: 1, critical: 2 };
          cmp = order[a.severity] - order[b.severity]; break;
        }
        case 'duration': cmp = (a.duration ?? 0) - (b.duration ?? 0); break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    if (f.offset) results = results.slice(f.offset);
    if (f.limit != null) results = results.slice(0, f.limit);
    return results;
  }

  // -- Statistics ---------------------------------------------------------

  getStats(): AuditStats {
    const total = this._entries.length;
    const byAction: Record<string, number> = {};
    const byResource: Record<string, number> = {};
    const byActor: Record<string, number> = {};
    let successes = 0, durSum = 0, durCount = 0, criticalCount = 0;
    let earliest: Date | null = null, latest: Date | null = null;

    for (const ev of this._entries) {
      byAction[ev.action] = (byAction[ev.action] || 0) + 1;
      byActor[ev.actor] = (byActor[ev.actor] || 0) + 1;
      byResource[`${ev.resourceType}:${ev.resourceId}`] =
        (byResource[`${ev.resourceType}:${ev.resourceId}`] || 0) + 1;
      if (ev.status === 'success') successes++;
      if (ev.duration != null) { durSum += ev.duration; durCount++; }
      if (ev.severity === 'critical') criticalCount++;
      if (!earliest || ev.timestamp < earliest) earliest = ev.timestamp;
      if (!latest || ev.timestamp > latest) latest = ev.timestamp;
    }

    const top5Actors: Record<string, number> = {};
    for (const [actor, count] of Object.entries(byActor).sort(
      ([, a], [, b]) => b - a,
    ).slice(0, 5)) {
      top5Actors[actor] = count;
    }

    return {
      totalEvents: total, eventsByAction: byAction, eventsByActor: top5Actors,
      eventsByResource: byResource,
      successRate: total > 0 ? successes / total : 0,
      avgDuration: durCount > 0 ? durSum / durCount : null,
      criticalCount, dateRange: { start: earliest, end: latest },
    };
  }

  // -- Export -------------------------------------------------------------

  export(format: 'json' | 'csv'): string {
    switch (format) {
      case 'json': return JSON.stringify(this._entries, null, 2);
      case 'csv':  return new AuditLogExporter(this._entries).toCSV();
      default:     throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // -- Maintenance --------------------------------------------------------

  clear(olderThan?: Date): void {
    this._entries = olderThan
      ? this._entries.filter((e) => e.timestamp >= olderThan)
      : [];
    void this._persist();
  }

  prune(): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this._opts.retentionDays);
    const before = this._entries.length;
    this._entries = this._entries.filter((e) => e.timestamp >= cutoff);
    const removed = before - this._entries.length;
    if (removed > 0) void this._persist();
    return removed;
  }

  private async _persist(): Promise<void> {
    if (this._opts.storage) await this._opts.storage.persist(this._entries);
  }
}

// ---------------------------------------------------------------------------
// AuditMiddleware — auto-wrap async functions
// ---------------------------------------------------------------------------

const defaultAuditLog = new AuditLog();

function buildAuditEvent(
  opts: Partial<Omit<AuditEvent, 'id' | 'timestamp'>>,
  status: AuditStatus,
  elapsed: number,
  errorExtra?: Record<string, unknown>,
): Omit<AuditEvent, 'id' | 'timestamp'> {
  return {
    actor: opts.actor ?? 'anonymous', action: opts.action ?? 'execute',
    resourceType: opts.resourceType ?? 'unknown', resourceId: opts.resourceId ?? '-',
    metadata: { ...(opts.metadata ?? {}), ...errorExtra },
    ipAddress: opts.ipAddress, userAgent: opts.userAgent,
    severity: opts.severity ?? (status === 'failure' ? 'warning' : 'info'),
    status, duration: elapsed,
  };
}

/**
 * Wrap an async function so its execution is automatically recorded.
 * On success status is `"success"` with `duration`; on failure status is `"failure"`
 * with error details in `metadata.error`, and the error is re-thrown.
 *
 * ```ts
 * const result = await auditWrap(
 *   () => fetchUser(userId),
 *   { actor: 'system', action: 'read', resourceType: 'user', resourceId: userId },
 * );
 * ```
 */
export async function auditWrap<T>(
  fn: () => Promise<T>,
  auditOpts: Partial<Omit<AuditEvent, 'id' | 'timestamp'>>,
  logInstance?: AuditLog,
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const elapsed = Math.round(performance.now() - start);
    (logInstance ?? defaultAuditLog).log(buildAuditEvent(auditOpts, 'success', elapsed));
    return result;
  } catch (err: unknown) {
    const elapsed = Math.round(performance.now() - start);
    const errorDetail = err instanceof Error ? err.message : String(err);
    (logInstance ?? defaultAuditLog).log(buildAuditEvent(auditOpts, 'failure', elapsed, { error: errorDetail }));
    throw err;
  }
}

// ---------------------------------------------------------------------------
// AuditLogExporter helper class
// ---------------------------------------------------------------------------

export class AuditLogExporter {
  constructor(private readonly _events: AuditEvent[]) {}

  toJSON(): string { return JSON.stringify(this._events, null, 2); }

  toCSV(): string {
    const headers = [
      'id','timestamp','actor','action','resourceType','resourceId',
      'metadata','ipAddress','userAgent','severity','status','duration',
    ];
    const esc = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = this._events.map((ev) =>
      headers.map((h) => h === 'metadata' ? esc(JSON.stringify(ev.metadata)) : esc((ev as Record<string, unknown>)[h])).join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Human-readable summary report in Markdown format:
   * totals, breakdown tables, and critical-event list.
   */
  toMarkdownReport(): string {
    const total = this._events.length;
    if (total === 0) return '# Audit Log Report\n\nNo events to report.\n';

    const byAction: Record<string, number> = {};
    const byActor: Record<string, number> = {};
    let successes = 0, critCount = 0;
    const criticalEvents: AuditEvent[] = [];

    for (const ev of this._events) {
      byAction[ev.action] = (byAction[ev.action] || 0) + 1;
      byActor[ev.actor] = (byActor[ev.actor] || 0) + 1;
      if (ev.status === 'success') successes++;
      if (ev.severity === 'critical') { critCount++; criticalEvents.push(ev); }
    }

    const lines: string[] = [
      '# Audit Log Report', '',
      `**Generated:** ${new Date().toISOString()}`,
      `**Total Events:** ${total}  |  **Success Rate:** ${(successes / total * 100).toFixed(1)}%  |  **Critical:** ${critCount}`, '',
      '## Events by Action', '', '| Action | Count |', '|--------|-------|',
      ...Object.entries(byAction).sort(([,a],[,b])=>b-a).map(([a,c])=>`| ${a} | ${c} |`), '',
      '## Top Actors', '', '| Actor | Count |', '|-------|-------|',
      ...Object.entries(byActor).sort(([,a],[,b])=>b-a).slice(0,10).map(([a,c])=>`| ${a} | ${c} |`), '',
    ];

    if (criticalEvents.length > 0) {
      lines.push('## Critical Events', '', '| Time | Actor | Action | Resource | Status |');
      lines.push('|------|-------|--------|----------|--------|');
      for (const ev of criticalEvents.slice(0, 20))
        lines.push(`| ${ev.timestamp.toISOString()} | ${ev.actor} | ${ev.action} | ${ev.resourceType}/${ev.resourceId} | ${ev.status} |`);
      lines.push('');
    }

    return lines.join('\n');
  }
}
