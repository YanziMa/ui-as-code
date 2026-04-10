/**
 * Real-time Collaboration: CRDT (Conflict-free Replicated Data Type) for text,
 * operational transformation (OT), presence awareness, cursor sharing,
 * collaborative undo/redo, conflict resolution, sync protocol.
 */

// --- Types ---

export interface UserId { id: string; name: string; color: string; avatar?: string; }
export interface CursorPosition { line: number; column: number; selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number }; }
export interface PresenceInfo { user: UserId; cursor: CursorPosition; lastActive: number; documentId: string; }
export type OperationType = "insert" | "delete" | "retain";

// --- Unique ID Generation ---

let clientIdCounter = 0;
function generateClientId(): string {
  return `client-${Date.now()}-${++clientIdCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Generate a unique operation ID */
export function generateOpId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${generateClientId()}`;
}

// --- CRDT: Character-based Sequence (RGA - Replicated Growable Array) ---

interface CrdtChar {
  id: string;
  originLeft: string | null;
  originRight: string | null;
  value: string;
  deleted: boolean;
  clientId: string;
  timestamp: number;
}

export class CrdtDocument {
  private chars: CrdtChar[] = [];
  private clientId: string;
  private clock: number = 0;

  constructor(clientId?: string) {
    this.clientId = clientId ?? generateClientId();
    // Initialize with tombstone boundaries
    this.chars.push({ id: "start", originLeft: null, originRight: null, value: "", deleted: false, clientId: "system", timestamp: 0 });
    this.chars.push({ id: "end", originLeft: null, originRight: null, value: "", deleted: false, clientId: "system", timestamp: Infinity });
  }

  get text(): string {
    return this.chars.filter((c) => !c.deleted && c.value !== "").map((c) => c.value).join("");
  }

  get length(): number { return this.text.length; }

  /** Insert characters at position (local operation) */
  insert(position: number, text: string): Array<{ id: string; originLeft: string; originRight: string; value: string; timestamp: number }> {
    const ops: Array<{ id: string; originLeft: string; originRight: string; value: string; timestamp: number }> = [];
    // Find insertion point
    let idx = this.findIndex(position);
    let leftOrigin = this.chars[idx]?.id ?? "start";
    let rightOrigin = idx < this.chars.length - 1 ? this.chars[idx + 1]?.id ?? "end" : "end";

    for (const char of text) {
      this.clock++;
      const charId = `${this.clientId}-${this.clock}`;
      const crdtChar: CrdtChar = {
        id: charId,
        originLeft: leftOrigin,
        originRight: rightOrigin,
        value: char,
        deleted: false,
        clientId: this.clientId,
        timestamp: Date.now(),
      };
      // Insert in sorted order by causal ordering
      const insertIdx = this.findInsertIndex(crdtChar);
      this.chars.splice(insertIdx, 0, crdtChar);
      ops.push({ id: charId, originLeft: leftOrigin, originRight: rightOrigin, value: char, timestamp: crdtChar.timestamp });
      leftOrigin = charId;
    }

    return ops;
  }

  /** Delete range of characters (local operation) */
  delete(start: number, length: number): Array<{ id: string }> {
    const ops: Array<{ id: string }> = [];
    let count = 0;
    for (let i = 0; i < this.chars.length && count < length; i++) {
      const c = this.chars[i];
      if (!c.deleted && c.value !== "") {
        if (count >= start && count < start + length) {
          c.deleted = true;
          ops.push({ id: c.id });
        }
        count++;
      }
    }
    return ops;
  }

  /** Apply remote insert operation */
  applyRemoteInsert(op: { id: string; originLeft: string; originRight: string; value: string; timestamp: number; clientId: string }): void {
    // Check if already exists
    if (this.chars.some((c) => c.id === op.id)) return;
    const crdtChar: CrdtChar = { ...op, deleted: false };
    const insertIdx = this.findInsertIndex(crdtChar);
    this.chars.splice(insertIdx, 0, crdtChar);
  }

  /** Apply remote delete operation */
  applyRemoteDelete(id: string): void {
    const c = this.chars.find((ch) => ch.id === id);
    if (c && !c.deleted) c.deleted = true;
  }

  /** Get the document state as serializable operations */
  getState(): Array<{ id: string; originLeft: string; originRight: string; value: string; deleted: boolean; clientId: string }> {
    return this.chars.filter((c) => c.id !== "start" && c.id !== "end").map((c) => ({
      id: c.id, originLeft: c.originLeft!, originRight: c.originRight!,
      value: c.value, deleted: c.deleted, clientId: c.clientId,
    }));
  }

  /** Restore from serialized state */
  restoreState(state: Array<{ id: string; originLeft: string; originRight: string; value: string; deleted: boolean; clientId: string }>): void {
    this.chars = [
      { id: "start", originLeft: null, originRight: null, value: "", deleted: false, clientId: "system", timestamp: 0 },
      ...state.map((s) => ({ ...s, originLeft: s.originLeft, originRight: s.originRight, timestamp: 0 })),
      { id: "end", originLeft: null, originRight: null, value: "", deleted: false, clientId: "system", timestamp: Infinity },
    ];
    // Re-sort
    this.chars.sort(this.compareChars.bind(this));
  }

  private findIndex(position: number): number {
    let count = 0;
    for (let i = 0; i < this.chars.length; i++) {
      if (!this.chars[i].deleted && this.chars[i].value !== "") {
        if (count === position) return i;
        count++;
      }
    }
    return this.chars.length - 1;
  }

  private findInsertIndex(char: CrdtChar): number {
    for (let i = 0; i < this.chars.length; i++) {
      if (this.compareChars(char, this.chars[i]) < 0) return i;
    }
    return this.chars.length;
  }

  private compareChars(a: CrdtChar, b: CrdtChar): number {
    // Start/end anchors
    if (a.id === "start") return -1;
    if (b.id === "start") return 1;
    if (a.id === "end") return 1;
    if (b.id === "end") return -1;

    // Causal ordering based on origins
    if (a.originLeft === b.id) return 1;
    if (b.originLeft === a.id) return -1;
    if (a.originRight === b.id) return -1;
    if (b.originRight === a.id) return 1;

    // Tie-breaker: client ID + timestamp
    if (a.clientId !== b.clientId) return a.clientId < b.clientId ? -1 : 1;
    return a.timestamp - b.timestamp;
  }
}

// --- Operational Transformation (OT) ---

export interface OtOperation {
  type: OperationType;
  content?: string;     // For insert
  length?: number;       // For delete/retain
  attributes?: Record<string, unknown>;
}

export interface TransformResult {
  operation: OtOperation[];
  priority: "left" | "right";
}

/**
 * Transform two concurrent operations against each other.
 * Implements the standard OT transform function.
 */
export function transform(op1: OtOperation[], op2: OtOperation[], priority: "left" | "right" = "left"): TransformResult {
  const result1: OtOperation[] = [];
  const result2: OtOperation[] = [];
  let i1 = 0, i2 = 0;

  while (i1 < op1.length || i2 < op2.length) {
    const o1 = op1[i1];
    const o2 = op2[i2];

    if (!o1) {
      // op1 consumed, retain rest of op2
      result2.push(o2!); i2++; continue;
    }
    if (!o2) {
      // op2 consumed, retain rest of op1
      result1.push(o1!); i1++; continue;
    }

    if (o1.type === "retain" && o2.type === "retain") {
      const minLen = Math.min(o1.length ?? 0, o2.length ?? 0);
      result1.push({ type: "retain", length: minLen });
      result2.push({ type: "retain", length: minLen });
      if ((o1.length ?? 0) > minLen) op1[i1] = { ...o1, length: (o1.length ?? 0) - minLen };
      else i1++;
      if ((o2.length ?? 0) > minLen) op2[i2] = { ...o2, length: (o2.length ?? 0) - minLen };
      else i2++;
    } else if (o1.type === "insert" && o2.type === "retain") {
      result1.push(o1); i1++;
      result2.push(o2); i2++;
    } else if (o1.type === "retain" && o2.type === "insert") {
      result1.push(o1); i1++;
      result2.push(o2); i2++;
    } else if (o1.type === "delete" && o2.type === "retain") {
      const minLen = Math.min(o1.length ?? 0, o2.length ?? 0);
      result1.push({ type: "delete", length: minLen });
      result2.push({ type: "retain", length: minLen });
      if ((o1.length ?? 0) > minLen) op1[i1] = { ...o1, length: (o1.length ?? 0) - minLen };
      else i1++;
      if ((o2.length ?? 0) > minLen) op2[i2] = { ...o2, length: (o2.length ?? 0) - minLen };
      else i2++;
    } else if (o1.type === "retain" && o2.type === "delete") {
      const minLen = Math.min(o1.length ?? 0, o2.length ?? 0);
      result1.push({ type: "retain", length: minLen });
      result2.push({ type: "delete", length: minLen });
      if ((o1.length ?? 0) > minLen) op1[i1] = { ...o1, length: (o1.length ?? 0) - minLen };
      else i1++;
      if ((o2.length ?? 0) > minLen) op2[i2] = { ...o2, length: (o2.length ?? 0) - minLen };
      else i2++;
    } else if (o1.type === "insert" && o2.type === "insert") {
      if (priority === "left") {
        result1.push(o1); result2.push({ type: "retain", length: o1.content?.length ?? 0 });
      } else {
        result1.push({ type: "retain", length: o2.content?.length ?? 0 }); result2.push(o2);
      }
      i1++; i2++;
    } else if (o1.type === "delete" && o2.type === "delete") {
      const minLen = Math.min(o1.length ?? 0, o2.length ?? 0);
      result1.push({ type: "delete", length: minLen });
      result2.push({ type: "delete", length: minLen });
      if ((o1.length ?? 0) > minLen) op1[i1] = { ...o1, length: (o1.length ?? 0) - minLen }; else i1++;
      if ((o2.length ?? 0) > minLen) op2[i2] = { ...o2, length: (o2.length ?? 0) - minLen }; else i2++;
    } else if (o1.type === "insert" && o2.type === "delete") {
      result1.push(o1); i1++;
      result2.push(o2); i2++;
    } else if (o1.type === "delete" && o2.type === "insert") {
      result1.push(o1); i1++;
      result2.push(o2); i2++;
    }
  }

  return { operation: priority === "left" ? result1 : result2, priority };
}

/** Compose two OT operations into one */
export function compose(op1: OtOperation[], op2: OtOperation[]): OtOperation[] {
  const result: OtOperation[] = [...op1];
  let pos = 0;

  for (const o2 of op2) {
    if (o2.type === "retain") {
      pos += o2.length ?? 0;
    } else if (o2.type === "insert") {
      result.splice(pos, 0, o2);
      pos += o2.content?.length ?? 0;
    } else if (o2.type === "delete") {
      let toDelete = o2.length ?? 0;
      let i = pos;
      while (toDelete > 0 && i < result.length) {
        if (result[i].type === "retain") {
          const del = Math.min(toDelete, result[i].length ?? 0);
          if ((result[i].length ?? 0) <= del) { result.splice(i, 1); } else { result[i] = { ...result[i], length: (result[i].length ?? 0) - del }; i++; }
          toDelete -= del;
        } else if (result[i].type === "insert") {
          result.splice(i, 1);
        } else {
          const del = Math.min(toDelete, result[i].length ?? 0);
          if ((result[i].length ?? 0) <= del) { result.splice(i, 1); } else { result[i] = { ...result[i], length: (result[i].length ?? 0) - del }; i++; }
          toDelete -= del;
        }
      }
    }
  }

  return result;
}

// --- Presence & Cursors ---

export class PresenceManager {
  private presences = new Map<string, PresenceInfo>();
  private listeners = new Set<(presences: Map<string, PresenceInfo>) => void>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(private ttlMs = 30000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), this.ttlMs / 2);
    if (typeof window !== "undefined") window.addEventListener("beforeunload", () => this.destroy());
  }

  /** Update or set user presence */
  update(userId: string, info: Partial<PresenceInfo>): void {
    const existing = this.presences.get(userId);
    this.presences.set(userId, {
      user: info.user ?? existing?.user ?? { id: userId, name: userId, color: "#000" },
      cursor: info.cursor ?? existing?.cursor ?? { line: 0, column: 0 },
      lastActive: Date.now(),
      documentId: info.documentId ?? existing?.documentId ?? "",
    });
    this.notify();
  }

  /** Remove user presence */
  remove(userId: string): void {
    this.presences.delete(userId);
    this.notify();
  }

  /** Get all active presences */
  getAll(): Map<string, PresenceInfo> { return new Map(this.presences); }

  /** Get presences for a specific document */
  getForDocument(docId: string): Map<string, PresenceInfo> {
    const filtered = new Map<string, PresenceInfo>();
    for (const [id, p] of this.presences) { if (p.documentId === docId) filtered.set(id, p); }
    return filtered;
  }

  /** Subscribe to presence changes */
  subscribe(listener: (presences: Map<string, PresenceInfo>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get cursor positions for rendering cursors overlay */
  getCursors(documentId: string): Array<{ user: UserId; cursor: CursorPosition }> {
    const cursors: Array<{ user: UserId; cursor: CursorPosition }> = [];
    for (const [, p] of this.presences) {
      if (p.documentId === documentId) cursors.push({ user: p.user, cursor: p.cursor });
    }
    return cursors;
  }

  private notify(): void {
    for (const listener of this.listeners) listener(new Map(this.presences));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, p] of this.presences) {
      if (now - p.lastActive > this.ttlMs) this.presences.delete(id);
    }
    if (this.presences.size > 0) this.notify();
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.listeners.clear();
    this.presences.clear();
  }
}

// --- Collaborative Undo/Redo (Undo Stack with Branching) ---

interface UndoEntry {
  operations: OtOperation[];
  inverse: OtOperation[];
  timestamp: number;
  clientId: string;
  parentId: string | null;
}

export class CollaborativeUndoManager {
  private stack: UndoEntry[] = [];
  private branchPoint = -1;
  private maxStack = 500;

  push(operations: OtOperation[], inverse: OtOperation[], clientId: string): void {
    // If we're not at the top of the stack, truncate future redo entries
    if (this.branchPoint >= 0 && this.branchPoint < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.branchPoint + 1);
    }
    this.stack.push({ operations, inverse, timestamp: Date.now(), clientId, parentId: this.branchPoint >= 0 ? this.stack[this.branchPoint]?.id ?? null : null });
    this.branchPoint = this.stack.length - 1;
    if (this.stack.length > this.maxStack) this.stack.shift();
  }

  undo(): OtOperation[] | null {
    if (this.branchPoint < 0) return null;
    const entry = this.stack[this.branchPoint];
    this.branchPoint--;
    return entry.inverse;
  }

  redo(): OtOperation[] | null {
    if (this.branchPoint >= this.stack.length - 1) return null;
    this.branchPoint++;
    return this.stack[this.branchPoint].operations;
  }

  canUndo(): boolean { return this.branchPoint >= 0; }
  canRedo(): boolean { return this.branchPoint < this.stack.length - 1; }
  get stackSize(): number { return this.stack.length; }
  clear(): void { this.stack = []; this.branchPoint = -1; }
}

// --- Sync Protocol (Message Types) ---

export enum SyncMessageType {
  JOIN = "join",
  LEAVE = "leave",
  OP = "operation",
  STATE_REQUEST = "state_request",
  STATE_RESPONSE = "state_response",
  CURSOR_UPDATE = "cursor_update",
  PRESENCE = "presence",
  AWARENESS = "awareness",
  PING = "ping",
  PONG = "pong",
  CONFLICT = "conflict",
  RESOLVED = "resolved",
}

export interface SyncMessage {
  type: SyncMessageType;
  documentId: string;
  senderId: string;
  timestamp: number;
  payload: unknown;
  version: number;
  vectorClock: Record<string, number>;
}

/** Create a sync message */
export function createSyncMessage(
  type: SyncMessageType,
  documentId: string,
  senderId: string,
  payload: unknown,
  vectorClock: Record<string, number>,
  version: number,
): SyncMessage {
  return { type, documentId, senderId, timestamp: Date.now(), payload, version, vectorClock };
}

// --- Vector Clock (for causality tracking) ---

export class VectorClock {
  private clock: Record<string, number> = {};
  private nodeId: string;

  constructor(nodeId: string) { this.nodeId = nodeId; this.clock[nodeId] = 0; }

  tick(): Record<string, number> {
    this.clock[this.nodeId] = (this.clock[this.nodeId] ?? 0) + 1;
    return { ...this.clock };
  }

  merge(other: Record<string, number>): void {
    for (const [node, time] of Object.entries(other)) {
      this.clock[node] = Math.max(this.clock[node] ?? 0, time);
    }
  }

  happenedBefore(other: Record<string, number>): boolean {
    const allNodes = new Set([...Object.keys(this.clock), ...Object.keys(other)]);
    let atLeastOneLesser = false;
    for (const node of allNodes) {
      const a = this.clock[node] ?? 0;
      const b = other[node] ?? 0;
      if (a > b) return false;
      if (a < b) atLeastOneLesser = true;
    }
    return atLeastOneLesser;
  }

  isConcurrent(other: Record<string, number>): boolean {
    return !this.happenedBefore(other) && !new VectorClock("temp").mergeIntoThis(other).happenedBefore(this.clock);
  }

  private mergeIntoThis(other: Record<string, number>): VectorClock {
    const merged = { ...this.clock };
    for (const [node, time] of Object.entries(other)) merged[node] = Math.max(merged[node] ?? 0, time);
    const vc = new VectorClock("");
    vc["clock" as keyof VectorClock] = merged;
    return vc;
  }

  get clockValue(): Record<string, number> { return { ...this.clock }; }
}

// --- Conflict Resolution Strategies ---

export type ConflictStrategy = "last-write-wins" | "first-write-wins" | "merge" | "manual" | "custom";

export interface ConflictInfo {
  field: string;
  localValue: unknown;
  remoteValue: unknown;
  localTimestamp: number;
  remoteTimestamp: number;
  localAuthor: string;
  remoteAuthor: string;
}

export interface Resolution { resolvedValue: unknown; strategy: ConflictStrategy; autoResolved: boolean; }

/** Resolve conflicts between local and remote changes */
export function resolveConflict(conflict: ConflictInfo, strategy: ConflictStrategy = "last-write-wins"): Resolution {
  switch (strategy) {
    case "last-write-wins":
      return { resolvedValue: conflict.remoteTimestamp > conflict.localTimestamp ? conflict.remoteValue : conflict.localValue, strategy, autoResolved: true };
    case "first-write-wins":
      return { resolvedValue: conflict.localTimestamp <= conflict.remoteTimestamp ? conflict.localValue : conflict.remoteValue, strategy, autoResolved: true };
    case "merge":
      // Attempt to merge arrays/objects
      if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
        const merged = [...new Set([...conflict.localValue, ...conflict.remoteValue])];
        return { resolvedValue: merged, strategy, autoResolved: true };
      }
      if (typeof conflict.localValue === "object" && typeof conflict.remoteValue === "object" && conflict.localValue && conflict.remoteValue) {
        return { resolvedValue: { ...(conflict.localValue as object), ...(conflict.remoteValue as object) }, strategy, autoResolved: true };
      }
      return { resolvedValue: conflict.remoteValue, strategy, autoResolved: false };
    default:
      return { resolvedValue: conflict.localValue, strategy, autoResolved: false };
  }
}

// --- Awareness / Activity Indicators ---

export interface UserActivity {
  userId: string;
  action: "typing" | "idle" | "viewing" | "editing";
  documentId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class ActivityTracker {
  private activities = new Map<string, UserActivity>();
  private listeners = new Set<(activities: Map<string, UserActivity>) => void>();
  private typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  track(activity: Omit<UserActivity, "timestamp">): void {
    const entry: UserActivity = { ...activity, timestamp: Date.now() };
    this.activities.set(activity.userId, entry);

    if (activity.action === "typing") {
      clearTimeout(this.typingTimeouts.get(activity.userId));
      this.typingTimeouts.set(activity.userId, setTimeout(() => {
        this.activities.set(activity.userId, { ...entry, action: "idle", timestamp: Date.now() });
        this.notify();
      }, 2000));
    }
    this.notify();
  }

  getTypingUsers(documentId: string): string[] {
    const typing: string[] = [];
    for (const [, a] of this.activities) { if (a.action === "typing" && a.documentId === documentId) typing.push(a.userId); }
    return typing;
  }

  getActiveUsers(documentId: string, idleThresholdMs = 60000): string[] {
    const now = Date.now();
    const active: string[] = [];
    for (const [, a] of this.activities) { if (a.documentId === documentId && now - a.timestamp < idleThresholdMs) active.push(a.userId); }
    return active;
  }

  subscribe(listener: (activities: Map<string, UserActivity>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void { for (const l of this.listeners) l(new Map(this.activities)); }
  destroy(): void { this.typingTimeouts.forEach(clearTimeout); this.listeners.clear(); this.activities.clear(); }
}
