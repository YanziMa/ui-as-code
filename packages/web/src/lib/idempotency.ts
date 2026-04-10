/**
 * Idempotency key utilities for API request deduplication.
 */

export interface IdempotencyEntry<T = unknown> {
  id: string;
  key: string;
  status: "pending" | "complete" | "expired";
  statusCode: number;
  responseBody: T;
  createdAt: number;
  expiresAt: number;
}

/** In-memory idempotency store */
export class IdempotencyStore {
  private store = new Map<string, IdempotencyEntry>();
  private readonly ttlMs: number;

  constructor(ttlMs: number = 86400000) { // Default 24 hours
    this.ttlMs = ttlMs;
  }

  /** Create a new idempotent entry */
  create(key: string, initialResponse?: Partial<IdempotencyEntry>): IdempotencyEntry {
    const now = Date.now();
    const entry: IdempotencyEntry = {
      id: `ide_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      key,
      status: "pending",
      statusCode: 202,
      responseBody: null as unknown as T,
      createdAt: now,
      expiresAt: now + this.ttlMs,
      ...initialResponse,
    };

    this.store.set(key, entry);
    return entry;
  }

  /** Get existing entry by key */
  get(key: string): IdempotencyEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      entry.status = "expired";
      return entry;
    }

    return entry;
  }

  /** Complete an idempotent operation with the final response */
  complete(key: string, statusCode: number, body: unknown): boolean {
    const entry = this.store.get(key);
    if (!entry || entry.status !== "pending") return false;

    entry.status = "complete";
    entry.statusCode = statusCode;
    entry.responseBody = body;
    return true;
  }

  /** Check if a key exists and is still valid */
  exists(key: string): boolean {
    const entry = this.get(key);
    return entry !== undefined && entry.status !== "expired";
  }

  /** Delete an entry */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /** Clean up expired entries */
  cleanup(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /** Get store statistics */
  get stats() {
    let pending = 0;
    let complete = 0;

    for (const [, entry] of this.store) {
      if (Date.now() <= entry.expiresAt) {
        if (entry.status === "pending") pending++;
        else if (entry.status === "complete") complete++;
      }
    }

    return { total: this.store.size, pending, complete, ttlMs: this.ttlMs };
  }
}

/** Generate a deterministic idempotency key from request params */
export function generateIdempotencyKey(
  userId: string,
  action: string,
  params?: Record<string, unknown>,
): string {
  const base = `${userId}:${action}`;
  if (!params) return base;

  // Sort keys for determinism
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join("&");

  return `${base}:${sorted}`;
}

/** Extract idempotency key from request headers */
export function extractIdempotencyKey(headers: Headers): string | null {
  return headers.get("Idempotency-Key") ?? headers.get("X-Idempotency-Key");
}
