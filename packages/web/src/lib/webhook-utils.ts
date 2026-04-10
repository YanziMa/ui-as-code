// =============================================================================
// Webhook Utilities Library
// Comprehensive TypeScript module for webhook signature verification,
// dispatching, receiving, schema validation, logging, rate limiting,
// payload transformation, secret management, delivery tracking, and
// idempotency. Pure library -- no React dependencies.
//
// Uses Web Crypto API (SubtleCrypto) for all cryptographic operations.
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Core Type Definitions
// ---------------------------------------------------------------------------

/** Supported webhook provider formats for signature verification */
export type WebhookProvider = 'github' | 'stripe' | 'slack' | 'custom';

/** Delivery status of a webhook event */
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'retrying' | 'queued';

/** Log entry direction */
export type WebhookDirection = 'incoming' | 'outgoing';

/** A parsed and validated incoming webhook event */
export interface WebhookEvent<T = unknown> {
  /** Unique event identifier (from provider or generated) */
  id: string;
  /** Event type string (e.g., "push", "payment_intent.succeeded") */
  type: string;
  /** Parsed JSON payload */
  payload: T;
  /** Raw headers from the HTTP request */
  headers: Record<string, string>;
  /** Timestamp when this event was received */
  receivedAt: Date;
  /** Which provider sent this webhook */
  provider: WebhookProvider;
  /** Idempotency key for deduplication */
  idempotencyKey: string;
}

/** Configuration for signature verification */
export interface SignatureVerificationConfig {
  /** Secret used to compute/verify HMAC signatures */
  secret: string;
  /** Provider format (determines header names and prefix) */
  provider: WebhookProvider;
  /** Custom header name for the signature (used when provider='custom') */
  signatureHeader?: string;
  /** Custom header name for the timestamp (used when provider='custom') */
  timestampHeader?: string;
  /** Allowed clock skew in seconds (default: 300) */
  toleranceSeconds?: number;
  /** Prefix that appears before the hex digest in the header value (e.g., "sha256=") */
  prefix?: string;
}

/** Result of a signature verification attempt */
export interface VerificationResult {
  valid: boolean;
  reason?: string;
  computedSignature?: string;
}

/** Destination endpoint for outgoing webhooks */
export interface WebhookEndpoint {
  /** Unique identifier for this endpoint */
  id: string;
  /** Full URL to deliver to */
  url: string;
  /** Optional secret for signing outgoing payloads */
  secret?: string;
  /** Optional list of event types this endpoint subscribes to (empty = all) */
  eventTypes?: string[];
  /** Optional headers to include in every request */
  headers?: Record<string, string>;
  /** Whether this endpoint is currently active */
  active: boolean;
}

/** Options for dispatching a webhook */
export interface DispatchOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in ms (default: 1000), uses exponential backoff */
  baseRetryDelayMs?: number;
  /** Timeout per request in ms (default: 10000) */
  timeoutMs?: number;
  /** Whether to queue for later if offline (default: true) */
  queueOffline?: boolean;
  /** Priority for queued messages (lower = higher priority) */
  priority?: number;
  /** Additional headers to include in the dispatch request */
  headers?: Record<string, string>;
}

/** Entry in the persistent webhook log */
export interface WebhookLogEntry {
  /** Unique log entry ID */
  id: string;
  /** Direction: incoming or outgoing */
  direction: WebhookDirection;
  /** Event type */
  eventType: string;
  /** Endpoint URL (outgoing) or source URL (incoming) */
  url: string;
  /** HTTP status code (for completed requests) */
  statusCode?: number;
  /** Delivery status */
  status: DeliveryStatus;
  /** Timestamp of the log entry */
  timestamp: Date;
  /** Number of retry attempts */
  retryCount: number;
  /** Error message if failed */
  error?: string;
  /** Payload size in bytes */
  payloadSize: number;
  /** Duration of the request in ms */
  durationMs?: number;
}

/** Schema definition for an event type in the registry */
export interface EventSchemaDefinition {
  /** Event type this schema applies to */
  eventType: string;
  /** JSON Schema object for validation */
  schema: Record<string, unknown>;
  /** Optional semantic version of the schema */
  version?: string;
  /** Human-readable description */
  description?: string;
  /** Whether strict validation is required (reject unknown properties) */
  strict?: boolean;
}

/** Rate limit configuration per endpoint */
export interface RateLimitConfig {
  /** Maximum requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/** Payload transformer function signature */
export type PayloadTransformer<TFrom = unknown, TTo = unknown> = (
  payload: TFrom,
  eventType: string,
) => TTo | Promise<TTo>;

/** Registered transformer entry */
export interface TransformerEntry<TFrom = unknown, TTo = unknown> {
  sourceFormat: string;
  targetFormat: string;
  eventTypes: string[] | '*';
  transform: PayloadTransformer<TFrom, TTo>;
}

/** Secret store entry */
export interface SecretEntry {
  /** Identifier for the secret (e.g., endpoint ID or provider name) */
  id: string;
  /** The current active secret (hashed or encrypted representation) */
  secret: string;
  /** Previous secret(s) still valid during rotation window */
  previousSecrets: string[];
  /** When this secret was created */
  createdAt: Date;
  /** When this secret expires (null = never) */
  expiresAt: Date | null;
  /** How many previous secrets to keep for rotation */
  rotationHistory: number;
}

/** Delivery tracking record */
export interface DeliveryRecord {
  /** Event ID */
  eventId: string;
  /** Endpoint ID */
  endpointId: string;
  /** Endpoint URL */
  url: string;
  /** Current status */
  status: DeliveryStatus;
  /** Attempt count */
  attemptCount: number;
  /** Last attempted at */
  lastAttemptedAt: Date | null;
  /** Delivered at (if successful) */
  deliveredAt: Date | null;
  /** Error on last failure */
  lastError?: string;
  /** HTTP response status code */
  responseStatusCode?: number;
}

/** Handler function for routed webhook events */
export type WebhookEventHandler<T = unknown> = (
  event: WebhookEvent<T>,
) => Promise<void> | void;

/** Query filter for delivery records / logs */
export interface DeliveryQueryFilter {
  /** Filter by status */
  status?: DeliveryStatus | DeliveryStatus[];
  /** Filter by endpoint ID */
  endpointId?: string;
  /** Filter by event type */
  eventType?: string;
  /** Start of time range (inclusive) */
  from?: Date;
  /** End of time range (inclusive) */
  to?: Date;
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

// ---------------------------------------------------------------------------
// 2. Webhook Signature Verification
// ---------------------------------------------------------------------------

/**
 * Compute an HMAC-SHA256 signature over a payload using the given secret.
 * Returns the hexadecimal digest string.
 *
 * @param payload - The raw string payload to sign
 * @param secret - The secret key used for HMAC
 * @returns Hex-encoded HMAC-SHA256 digest
 *
 * @example
 * ```ts
 * const sig = await computeHmacSha256(payload, 'my-secret');
 * // => 'a1b2c3...'
 * ```
 */
export async function computeHmacSha256(
  payload: string,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
  return arrayBufferToHex(signature);
}

/**
 * Verify an incoming webhook signature against the expected HMAC-SHA256 digest.
 * Supports GitHub (`sha256=...`), Stripe (`t=...,v1=...`), Slack (`v0=...`),
 * and custom header configurations.
 *
 * @param payload - Raw request body string
 * @param signature - Signature value from the request header
 * @param config - Verification configuration including secret and provider
 * @returns Verification result with validity flag and optional reason
 *
 * @example
 * ```ts
 * const result = await verifyWebhookSignature(body, headerSig, {
 *   secret: 'whsec_...',
 *   provider: 'stripe',
 * });
 * if (!result.valid) console.error(result.reason);
 * ```
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  config: SignatureVerificationConfig,
): Promise<VerificationResult> {
  const { secret, provider, toleranceSeconds = 300 } = config;

  // --- Timestamp extraction & tolerance check (Stripe / custom with timestamp) ---
  if (provider === 'stripe' || config.timestampHeader) {
    const tsHeader =
      provider === 'stripe'
        ? extractStripeTimestamp(signature)
        : null; // For custom, caller should pass timestamp separately

    // For stripe-style signatures, we parse t=... from the signature header itself
    if (provider === 'stripe') {
      const tsMatch = signature.match(/t=(\d+),/);
      if (tsMatch?.[1]) {
        const ts = parseInt(tsMatch[1], 10);
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - ts) > toleranceSeconds) {
          return {
            valid: false,
            reason:
              'Timestamp outside tolerance window; possible replay attack',
          };
        }
      }
    }
  }

  // --- Determine expected signature header name ---
  let signatureHeader: string;
  let prefix = '';

  switch (provider) {
    case 'github':
      signatureHeader = 'X-Hub-Signature-256';
      prefix = 'sha256=';
      break;
    case 'stripe':
      signatureHeader = 'Stripe-Signature';
      break;
    case 'slack':
      signatureHeader = 'X-Slack-Signature';
      prefix = 'v0=';
      break;
    case 'custom':
      signatureHeader = config.signatureHeader ?? 'X-Webhook-Signature';
      prefix = config.prefix ?? '';
      break;
    default:
      return { valid: false, reason: `Unknown provider: ${provider}` };
  }

  // --- Strip prefix if present ---
  let providedSig = signature;
  if (prefix && providedSig.startsWith(prefix)) {
    providedSig = providedSig.slice(prefix.length);
  }

  // --- For Stripe, extract v1=... portion ---
  if (provider === 'stripe') {
    const v1Match = signature.match(/v1=([^,]+)/);
    if (!v1Match) {
      return { valid: false, reason: 'No v1 signature found in Stripe header' };
    }
    providedSig = v1Match[1];
  }

  // --- Compute expected signature ---
  const expectedDigest = await computeHmacSha256(payload, secret);

  // --- Timing-safe comparison ---
  const valid = timingSafeEqual(providedSig, expectedDigest);

  return {
    valid,
    reason: valid ? undefined : 'Signature mismatch',
    computedSignature: expectedDigest,
  };
}

/**
 * Extract the Unix timestamp from a Stripe-style signature header.
 * @internal
 */
function extractStripeTimestamp(signature: string): number | null {
  const match = signature.match(/t=(\d+),/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Convert an ArrayBuffer to a hex string.
 * @internal
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe string equality comparison to prevent timing attacks.
 * Compares two hex strings of equal length in constant time.
 *
 * @param a - First hex string
 * @param b - Second hex string
 * @returns True if strings are identical
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// 3. Webhook Dispatcher
// ---------------------------------------------------------------------------

/** In-memory queue item for offline/pending dispatch */
interface QueueItem {
  id: string;
  endpointId: string;
  url: string;
  payload: unknown;
  headers: Record<string, string>;
  options: Required<DispatchOptions>;
  addedAt: Date;
  priority: number;
}

/**
 * WebhookDispatcher sends webhook payloads to one or more endpoints with
 * built-in retry logic, exponential backoff, offline queuing, and batch support.
 */
export class WebhookDispatcher {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private queue: QueueItem[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private processingQueue: boolean = false;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private logEntries: WebhookLogEntry[] = [];
  private deliveryRecords: Map<string, DeliveryRecord> = new Map();

  constructor(private defaultOptions: DispatchOptions = {}) {
    // Listen for online/offline events in browser environments
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        void this.processQueue();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  /**
   * Register an endpoint for outgoing webhooks.
   * @param endpoint - Endpoint configuration
   */
  addEndpoint(endpoint: WebhookEndpoint): void {
    this.endpoints.set(endpoint.id, endpoint);
    if (!this.rateLimiters.has(endpoint.id)) {
      this.rateLimiters.set(endpoint.id, new RateLimiter({ maxRequests: 30, windowMs: 60_000 }));
    }
  }

  /**
   * Remove a registered endpoint.
   * @param endpointId - ID of the endpoint to remove
   */
  removeEndpoint(endpointId: string): void {
    this.endpoints.delete(endpointId);
    this.rateLimiters.delete(endpointId);
  }

  /**
   * Get a registered endpoint by ID.
   * @param endpointId - Endpoint identifier
   */
  getEndpoint(endpointId: string): WebhookEndpoint | undefined {
    return this.endpoints.get(endpointId);
  }

  /**
   * List all registered endpoints.
   */
  listEndpoints(): WebhookEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Dispatch a webhook payload to a specific endpoint.
   *
   * @param endpointId - Target endpoint ID
   * @param payload - Payload to send (will be JSON-stringified)
   * @param eventType - Event type for logging and routing
   * @param options - Override dispatch options
   * @returns Promise resolving to the log entry for this dispatch
   */
  async dispatch<T>(
    endpointId: string,
    payload: T,
    eventType: string,
    options: DispatchOptions = {},
  ): Promise<WebhookLogEntry> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${endpointId}`);
    }
    if (!endpoint.active) {
      throw new Error(`Endpoint is inactive: ${endpointId}`);
    }

    const opts = this.mergeOptions(options);
    const eventId = generateId();
    const payloadStr = JSON.stringify(payload);

    // Build request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': eventType,
      'X-Webhook-Event-Id': eventId,
      ...endpoint.headers,
      ...(options.headers ?? {}),
    };

    // Sign payload if endpoint has a secret
    if (endpoint.secret) {
      const sig = await computeHmacSha256(payloadStr, endpoint.secret);
      headers['X-Webhook-Signature'] = `sha256=${sig}`;
    }

    // Check rate limiter
    const limiter = this.rateLimiters.get(endpointId);
    if (limiter && !limiter.allow()) {
      // Queue instead of rejecting
      return this.queueForLater(endpointId, endpoint.url, payload, headers, eventType, opts, opts.priority);
    }

    // If offline, queue immediately
    if (!this.isOnline && opts.queueOffline) {
      return this.queueForLater(endpointId, endpoint.url, payload, headers, eventType, opts, opts.priority);
    }

    // Attempt delivery with retries
    return this.deliverWithRetry(eventId, endpointId, endpoint.url, payloadStr, headers, eventType, opts);
  }

  /**
   * Broadcast a payload to all active endpoints (or those matching the event type).
   *
   * @param payload - Payload to broadcast
   * @param eventType - Event type string
   * @param options - Dispatch options
   * @returns Array of log entries (one per endpoint)
   */
  async broadcast<T>(
    payload: T,
    eventType: string,
    options: DispatchOptions = {},
  ): Promise<WebhookLogEntry[]> {
    const targets = Array.from(this.endpoints.values()).filter((ep) => {
      if (!ep.active) return false;
      if (!ep.eventTypes || ep.eventTypes.length === 0) return true;
      return ep.eventTypes.includes(eventType);
    });

    const results = await Promise.allSettled(
      targets.map((ep) => this.dispatch(ep.id, payload, eventType, options)),
    );

    return results.map((r) =>
      r.status === 'fulfilled' ? r.value : createErrorLogEntry(eventType, '', 'outgoing', r.reason?.message),
    );
  }

  /**
   * Send multiple payloads in a single batch to an endpoint.
   *
   * @param endpointId - Target endpoint
   * @param items - Array of {eventType, payload} tuples
   * @param options - Dispatch options
   * @returns Array of log entries
   */
  async batchDispatch<T>(
    endpointId: string,
    items: Array<{ eventType: string; payload: T }>,
    options: DispatchOptions = {},
  ): Promise<WebhookLogEntry[]> {
    return Promise.all(
      items.map((item) =>
        this.dispatch(endpointId, item.payload, item.eventType, options),
      ),
    );
  }

  /**
   * Deliver a payload with automatic retry and exponential backoff.
   * @internal
   */
  private async deliverWithRetry(
    eventId: string,
    endpointId: string,
    url: string,
    payloadStr: string,
    headers: Record<string, string>,
    eventType: string,
    opts: Required<DispatchOptions>,
  ): Promise<WebhookLogEntry> {
    const startTime = Date.now();
    let lastError: string | undefined;
    let statusCode: number | undefined;

    const record: DeliveryRecord = {
      eventId,
      endpointId,
      url,
      status: 'pending',
      attemptCount: 0,
      lastAttemptedAt: null,
      deliveredAt: null,
    };
    this.deliveryRecords.set(`${eventId}:${endpointId}`, record);

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      record.attemptCount = attempt + 1;
      record.lastAttemptedAt = new Date();
      record.status = attempt === 0 ? 'pending' : 'retrying';

      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      try {
        const controller = new AbortController();
        timeoutHandle = setTimeout(() => controller.abort(), opts.timeoutMs);

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: payloadStr,
          signal: controller.signal,
        });

        clearTimeout(timeoutHandle);
        timeoutHandle = undefined;
        statusCode = response.status;

        if (response.ok) {
          record.status = 'delivered';
          record.deliveredAt = new Date();
          record.responseStatusCode = response.status;

          const duration = Date.now() - startTime;
          const entry: WebhookLogEntry = {
            id: generateId(),
            direction: 'outgoing',
            eventType,
            url,
            statusCode: response.status,
            status: 'delivered',
            timestamp: new Date(),
            retryCount: attempt,
            payloadSize: new Blob([payloadStr]).size,
            durationMs: duration,
          };
          this.logEntries.push(entry);
          return entry;
        }

        // Server-side error -- may be retryable
        lastError = `HTTP ${response.status}: ${response.statusText}`;
        if (response.status >= 400 && response.status < 500) {
          // Client errors are generally not retryable
          break;
        }
      } catch (err) {
        if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
        lastError = err instanceof Error ? err.message : String(err);

        // Don't retry on abort (timeout)
        if (err instanceof DOMException && err.name === 'AbortError') {
          lastError = 'Request timed out';
          // Timeout is retryable
        }
      }

      // Wait before next retry (exponential backoff with jitter)
      if (attempt < opts.maxRetries) {
        const delay = opts.baseRetryDelayMs * Math.pow(2, attempt) + Math.random() * 1000;
        await sleep(delay);
      }
    }

    // All retries exhausted
    record.status = 'failed';
    record.lastError = lastError;

    const entry: WebhookLogEntry = {
      id: generateId(),
      direction: 'outgoing',
      eventType,
      url,
      statusCode,
      status: 'failed',
      timestamp: new Date(),
      retryCount: opts.maxRetries,
      error: lastError,
      payloadSize: new Blob([payloadStr]).size,
      durationMs: Date.now() - startTime,
    };
    this.logEntries.push(entry);
    return entry;
  }

  /**
   * Queue a webhook for later delivery when online.
   * @internal
   */
  private async queueForLater(
    endpointId: string,
    url: string,
    payload: unknown,
    headers: Record<string, string>,
    eventType: string,
    opts: Required<DispatchOptions>,
    priority: number,
  ): Promise<WebhookLogEntry> {
    const item: QueueItem = {
      id: generateId(),
      endpointId,
      url,
      payload,
      headers,
      options: opts,
      addedAt: new Date(),
      priority,
    };
    this.queue.push(item);
    this.queue.sort((a, b) => a.priority - b.priority);

    const entry: WebhookLogEntry = {
      id: item.id,
      direction: 'outgoing',
      eventType,
      url,
      status: 'queued',
      timestamp: new Date(),
      retryCount: 0,
      payloadSize: new Blob([JSON.stringify(payload)]).size,
    };
    this.logEntries.push(entry);
    return entry;
  }

  /**
   * Process all queued items (called when coming back online).
   */
  async processQueue(): Promise<void> {
    if (this.processingQueue || this.queue.length === 0) return;
    this.processingQueue = true;

    while (this.queue.length > 0 && this.isOnline) {
      const item = this.queue.shift()!;
      try {
        const payloadStr = JSON.stringify(item.payload);
        await this.deliverWithRetry(
          item.id,
          item.endpointId,
          item.url,
          payloadStr,
          item.headers,
          'queued', // generic event type for queued items
          item.options,
        );
      } catch {
        // Individual item failure shouldn't stop queue processing
      }
      // Small delay between items to avoid flooding
      await sleep(100);
    }

    this.processingQueue = false;
  }

  /**
   * Get the number of items currently in the queue.
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Clear all queued items.
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Retrieve the persistent log of all dispatched webhooks.
   */
  getLog(): WebhookLogEntry[] {
    return [...this.logEntries];
  }

  /**
   * Query log entries with filters.
   */
  queryLog(filter: Record<string, unknown> & Partial<DeliveryQueryFilter>): WebhookLogEntry[] {
    let results = [...this.logEntries];

    if (filter.direction !== undefined) {
      // Note: DeliveryQueryFilter doesn't have direction; this is internal use
    }
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter((e) => statuses.includes(e.status));
    }
    if (filter.eventType) {
      results = results.filter((e) => e.eventType === filter.eventType);
    }
    if (filter.url) {
      results = results.filter((e) => e.url === filter.url);
    }
    if (filter.from) {
      results = results.filter((e) => e.timestamp >= filter.from!);
    }
    if (filter.to) {
      results = results.filter((e) => e.timestamp <= filter.to!);
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filter.offset) {
      results = results.slice(filter.offset);
    }
    if (filter.limit) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Query delivery records.
   */
  queryDeliveryRecords(filter: DeliveryQueryFilter): DeliveryRecord[] {
    let results = Array.from(this.deliveryRecords.values());

    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter((r) => statuses.includes(r.status));
    }
    if (filter.endpointId) {
      results = results.filter((r) => r.endpointId === filter.endpointId);
    }
    if (filter.eventType) {
      // We'd need to look up event type from log entries; simplified here
    }
    if (filter.from) {
      results = results.filter((r) => r.lastAttemptedAt && r.lastAttemptedAt >= filter.from!);
    }
    if (filter.to) {
      results = results.filter((r) => !r.lastAttemptedAt || r.lastAttemptedAt <= filter.to!);
    }

    if (filter.offset) results = results.slice(filter.offset);
    if (filter.limit) results = results.slice(0, filter.limit);

    return results;
  }

  /**
   * Retry all failed deliveries.
   */
  async retryFailed(): Promise<number> {
    const failed = Array.from(this.deliveryRecords.values()).filter(
      (r) => r.status === 'failed',
    );
    let retried = 0;

    for (const record of failed) {
      const endpoint = this.endpoints.get(record.endpointId);
      if (!endpoint) continue;

      // Find original log entry to reconstruct
      const logEntry = this.logEntries.find((e) => e.id === record.eventId);
      if (!logEntry) continue;

      try {
        await this.dispatch(record.endpointId, {}, logEntry.eventType, {
          maxRetries: 3,
        });
        retried++;
      } catch {
        // Skip
      }
    }

    return retried;
  }

  /** Merge user options with defaults. @internal */
  private mergeOptions(options: DispatchOptions): Required<DispatchOptions> {
    return {
      maxRetries: options.maxRetries ?? this.defaultOptions.maxRetries ?? 3,
      baseRetryDelayMs: options.baseRetryDelayMs ?? this.defaultOptions.baseRetryDelayMs ?? 1000,
      timeoutMs: options.timeoutMs ?? this.defaultOptions.timeoutMs ?? 10_000,
      queueOffline: options.queueOffline ?? this.defaultOptions.queueOffline ?? true,
      priority: options.priority ?? this.defaultOptions.priority ?? 5,
      headers: options.headers ?? this.defaultOptions.headers ?? {},
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Webhook Receiver
// ---------------------------------------------------------------------------

/**
 * WebhookReceiver parses incoming webhook payloads, verifies signatures,
 * routes events to handlers by type, and provides idempotency guarantees.
 */
export class WebhookReceiver {
  private handlers: Map<string, Set<WebhookEventHandler>> = new Map();
  private schemaRegistry: EventSchemaRegistry;
  private idempotencyStore: Map<string, { processedAt: Date; eventId: string }> = new Map();
  private verificationConfigs: Map<WebhookProvider, SignatureVerificationConfig> = new Map();
  private receiverLog: WebhookLogEntry[] = [];

  constructor(schemaRegistry?: EventSchemaRegistry) {
    this.schemaRegistry = schemaRegistry ?? new EventSchemaRegistry();
  }

  /**
   * Register a verification config for a specific provider.
   * @param config - Signature verification configuration
   */
  setVerificationConfig(config: SignatureVerificationConfig): void {
    this.verificationConfigs.set(config.provider, config);
  }

  /**
   * Register a handler for a specific event type.
   * Multiple handlers can be registered for the same event type.
   *
   * @param eventType - Event type string (use '*' as wildcard for all events)
   * @param handler - Handler function
   */
  on<T = unknown>(eventType: string, handler: WebhookEventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as WebhookEventHandler);
  }

  /**
   * Remove a handler for an event type.
   * @param eventType - Event type
   * @param handler - Handler reference to remove
   */
  off(eventType: string, handler: WebhookEventHandler): void {
    this.handlers.get(eventType)?.delete(handler);
  }

  /**
   * Process an incoming webhook request. This is the main entry point.
   *
   * Steps performed:
   * 1. Parse the raw body as JSON
   * 2. Verify signature (if configured)
   * 3. Check idempotency key for duplicates
   * 4. Validate payload against schema (if registered)
   * 5. Route to matching handlers
   *
   * @param rawBody - Raw request body string
   * @param headers - HTTP headers from the request
   * @param provider - Which provider format to expect
   * @returns The parsed and processed event
   *
   * @throws {Error} If signature verification fails, schema validation fails, etc.
   */
  async receive<T = unknown>(
    rawBody: string,
    headers: Record<string, string>,
    provider: WebhookProvider = 'custom',
  ): Promise<WebhookEvent<T>> {
    const receivedAt = new Date();
    const startTime = Date.now();

    // --- Parse payload ---
    let payload: T;
    try {
      payload = JSON.parse(rawBody) as T;
    } catch (err) {
      const entry = this.createIncomingLogEntry('parse_error', headers, 'failed', 0, 'Invalid JSON body', Date.now() - startTime);
      throw new Error(`Invalid JSON payload: ${err instanceof Error ? err.message : err}`);
    }

    // --- Extract event type from headers or payload ---
    const eventType = this.extractEventType(headers, payload);
    const eventId = this.extractEventId(headers, payload);
    const idempotencyKey = this.extractIdempotencyKey(headers, payload) ?? `${eventId}:${eventType}`;

    // --- Signature verification ---
    const config = this.verificationConfigs.get(provider);
    if (config) {
      const sigHeader = this.getSignatureHeader(headers, provider);
      if (sigHeader) {
        const result = await verifyWebhookSignature(rawBody, sigHeader, config);
        if (!result.valid) {
          const entry = this.createIncomingLogEntry(eventType, headers, 'failed', 0, result.reason ?? 'Signature verification failed', Date.now() - startTime);
          throw new Error(`Signature verification failed: ${result.reason}`);
        }
      }
    }

    // --- Idempotency check ---
    const existing = this.idempotencyStore.get(idempotencyKey);
    if (existing) {
      // Already processed -- return without re-executing handlers
      const entry = this.createIncomingLogEntry(eventType, headers, 'delivered', 0, 'Duplicate (idempotent)', Date.now() - startTime);
      return {
        id: existing.eventId,
        type: eventType,
        payload,
        headers,
        receivedAt,
        provider,
        idempotencyKey,
      };
    }
    this.idempotencyStore.set(idempotencyKey, { processedAt: receivedAt, eventId });

    // --- Schema validation ---
    if (this.schemaRegistry.hasSchema(eventType)) {
      const validationResult = this.schemaRegistry.validate(eventType, payload);
      if (!validationResult.valid) {
        const entry = this.createIncomingLogEntry(eventType, headers, 'failed', 0, `Schema validation failed: ${validationResult.errors.join(', ')}`, Date.now() - startTime);
        throw new Error(
          `Schema validation failed for event "${eventType}": ${validationResult.errors.join(', ')}`,
        );
      }
    }

    // --- Build event object ---
    const event: WebhookEvent<T> = {
      id: eventId,
      type: eventType,
      payload,
      headers,
      receivedAt,
      provider,
      idempotencyKey,
    };

    // --- Route to handlers ---
    const matchedHandlers: WebhookEventHandler[] = [];

    // Exact type match
    const exactHandlers = this.handlers.get(eventType);
    if (exactHandlers) {
      matchedHandlers.push(...exactHandlers);
    }

    // Wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      matchedHandlers.push(...wildcardHandlers);
    }

    // Execute handlers
    const handlerResults = await Promise.allSettled(
      matchedHandlers.map((h) => h(event)),
    );

    const errors = handlerResults
      .filter((r) => r.status === 'rejected')
      .map((r) => (r as PromiseRejectedResult).reason?.message);

    // Log the receive
    const status: DeliveryStatus = errors.length > 0 && matchedHandlers.length === errors.length
      ? 'failed'
      : 'delivered';
    this.createIncomingLogEntry(
      eventType,
      headers,
      status,
      0,
      errors.length > 0 ? errors.join('; ') : undefined,
      Date.now() - startTime,
    );

    return event;
  }

  /**
   * Extract event type from headers or payload depending on provider conventions.
   * @internal
   */
  private extractEventType<T>(headers: Record<string, string>, payload: T): string {
    // Try common header names
    const headerNames = [
      'x-github-event',
      'x-event-type',
      'ce-type',           // CloudEvents
      'event-type',
    ];
    for (const name of headerNames) {
      const val = headers[name] ?? headers[name.toLowerCase()];
      if (val) return val;
    }

    // Try payload fields
    const p = payload as Record<string, unknown>;
    if (typeof p.type === 'string') return p.type;
    if (typeof p.event === 'string') return p.event;
    if (typeof p.event_type === 'string') return p.event_type;
    if (typeof p.action === 'string') return p.action; // GitHub style

    return 'unknown';
  }

  /**
   * Extract event ID from headers or payload.
   * @internal
   */
  private extractEventId<T>(headers: Record<string, string>, payload: T): string {
    const headerNames = [
      'x-request-id',
      'x-github-delivery',
      'ce-id',
      'webhook-id',
    ];
    for (const name of headerNames) {
      const val = headers[name] ?? headers[name.toLowerCase()];
      if (val) return val;
    }

    const p = payload as Record<string, unknown>;
    if (typeof p.id === 'string') return p.id;
    if (typeof p.event_id === 'string') return p.event_id;

    return generateId();
  }

  /**
   * Extract idempotency key from headers or payload.
   * @internal
   */
  private extractIdempotencyKey<T>(
    headers: Record<string, string>,
    payload: T,
  ): string | null {
    const key = headers['idempotency-key'] ?? headers['x-idempotency-key'];
    if (key) return key;

    const p = payload as Record<string, unknown>;
    if (typeof p.idempotency_key === 'string') return p.idempotency_key;

    return null;
  }

  /**
   * Get the signature header value for a given provider.
   * @internal
   */
  private getSignatureHeader(
    headers: Record<string, string>,
    provider: WebhookProvider,
  ): string | null {
    switch (provider) {
      case 'github':
        return headers['x-hub-signature-256'] ?? null;
      case 'stripe':
        return headers['stripe-signature'] ?? null;
      case 'slack':
        return headers['x-slack-signature'] ?? null;
      case 'custom': {
        const config = this.verificationConfigs.get('custom');
        const name = config?.signatureHeader ?? 'x-webhook-signature';
        return headers[name] ?? headers[name.toLowerCase()] ?? null;
      }
      default:
        return null;
    }
  }

  /**
   * Create a log entry for an incoming webhook.
   * @internal
   */
  private createIncomingLogEntry(
    eventType: string,
    headers: Record<string, string>,
    status: DeliveryStatus,
    retryCount: number,
    error?: string,
    durationMs?: number,
  ): WebhookLogEntry {
    const entry: WebhookLogEntry = {
      id: generateId(),
      direction: 'incoming',
      eventType,
      url: headers['origin'] ?? headers['referer'] ?? 'unknown',
      status,
      timestamp: new Date(),
      retryCount,
      error,
      payloadSize: 0, // Unknown for incoming without explicit measurement
      durationMs,
    };
    this.receiverLog.push(entry);
    return entry;
  }

  /**
   * Get all incoming webhook log entries.
   */
  getReceiverLog(): WebhookLogEntry[] {
    return [...this.receiverLog];
  }

  /**
   * Clear the idempotency store (use with caution -- may allow replays).
   */
  clearIdempotencyStore(): void {
    this.idempotencyStore.clear();
  }

  /**
   * Get the size of the idempotency store.
   */
  getIdempotencyStoreSize(): number {
    return this.idempotencyStore.size;
  }
}

// ---------------------------------------------------------------------------
// 5. Event Schema Registry
// ---------------------------------------------------------------------------

/** Result of validating a payload against a schema */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * EventSchemaRegistry manages JSON schemas for webhook event types and
 * validates incoming payloads against their registered schemas.
 *
 * Supports versioned schemas and strict mode (rejects unknown properties).
 */
export class EventSchemaRegistry {
  private schemas: Map<string, EventSchemaDefinition> = new Map();

  /**
   * Register a schema for an event type.
   *
   * @param definition - Schema definition including event type and JSON schema
   * @throws {Error} If a schema with a different version already exists for this event type
   */
  register(definition: EventSchemaDefinition): void {
    const existing = this.schemas.get(definition.eventType);
    if (existing && existing.version && definition.version && existing.version !== definition.version) {
      throw new Error(
        `Schema version conflict for "${definition.eventType}": existing v${existing.version}, trying to register v${definition.version}`,
      );
    }
    this.schemas.set(definition.eventType, definition);
  }

  /**
   * Unregister a schema for an event type.
   * @param eventType - Event type to remove
   */
  unregister(eventType: string): boolean {
    return this.schemas.delete(eventType);
  }

  /**
   * Check if a schema is registered for an event type.
   * @param eventType - Event type to check
   */
  hasSchema(eventType: string): boolean {
    return this.schemas.has(eventType);
  }

  /**
   * Get a registered schema definition.
   * @param eventType - Event type
   */
  getSchema(eventType: string): EventSchemaDefinition | undefined {
    return this.schemas.get(eventType);
  }

  /**
   * List all registered event types.
   */
  listEventTypes(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Validate a payload against the registered schema for its event type.
   *
   * @param eventType - Event type to validate against
   * @param payload - Payload to validate
   * @returns Validation result with any errors found
   */
  validate<T>(eventType: string, payload: T): ValidationResult {
    const definition = this.schemas.get(eventType);
    if (!definition) {
      // No schema registered -- pass by default
      return { valid: true, errors: [] };
    }

    const errors = this.validateAgainstSchema(payload, definition.schema, definition.strict ?? false);
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Bulk-register multiple schemas at once.
   * @param definitions - Array of schema definitions
   */
  registerBatch(definitions: EventSchemaDefinition[]): void {
    for (const def of definitions) {
      this.register(def);
    }
  }

  /**
   * Core schema validation engine. Recursively validates an object against a JSON Schema.
   *
   * Supports: type, required, properties, additionalProperties (strict mode),
   * enum, minLength, maxLength, minimum, maximum, pattern, format, items (arrays),
   * $ref (basic intra-schema references).
   *
   * @internal
   */
  private validateAgainstSchema(
    data: unknown,
    schema: Record<string, unknown>,
    strict: boolean,
    path: string = '',
  ): string[] {
    const errors: string[] = [];
    const currentPath = path || 'root';

    // --- Type checking ---
    const expectedType = schema.type as string | string[] | undefined;
    if (expectedType) {
      const types = Array.isArray(expectedType) ? expectedType : [expectedType];
      if (!types.some((t) => this.checkType(data, t))) {
        errors.push(`${currentPath}: expected type ${types.join('|')}, got ${this.getTypeName(data)}`);
        return errors; // Type mismatch -- don't recurse further
      }
    }

    // --- Enum validation ---
    if (schema.enum && Array.isArray(schema.enum)) {
      const enumValues = schema.enum as unknown[];
      if (!enumValues.some((v) => JSON.stringify(v) === JSON.stringify(data))) {
        errors.push(`${currentPath}: value must be one of ${JSON.stringify(schema.enum)}`);
      }
    }

    // --- Object validation ---
    if (this.checkType(data, 'object') && data !== null && !Array.isArray(data)) {
      const obj = data as Record<string, unknown>;

      // Required properties
      if (schema.required && Array.isArray(schema.required)) {
        for (const req of schema.required as string[]) {
          if (!(req in obj)) {
            errors.push(`${currentPath}: missing required property "${req}"`);
          }
        }
      }

      // Property-level validation
      if (schema.properties && typeof schema.properties === 'object') {
        const props = schema.properties as Record<string, Record<string, unknown>>;
        for (const [propName, propSchema] of Object.entries(props)) {
          if (propName in obj) {
            const propErrors = this.validateAgainstSchema(
              obj[propName],
              propSchema,
              strict,
              `${currentPath}.${propName}`,
            );
            errors.push(...propErrors);
          }
        }
      }

      // Additional properties (strict mode)
      if (strict || schema.additionalProperties === false) {
        const allowedProps = new Set(
          Object.keys(schema.properties ?? {}),
        );
        for (const key of Object.keys(obj)) {
          if (!allowedProps.has(key)) {
            errors.push(`${currentPath}: unexpected property "${key}"`);
          }
        }
      }
    }

    // --- Array validation ---
    if (Array.isArray(data)) {
      if (schema.items) {
        const itemSchema = schema.items as Record<string, unknown>;
        data.forEach((item, idx) => {
          const itemErrors = this.validateAgainstSchema(
            item,
            itemSchema,
            strict,
            `${currentPath}[${idx}]`,
          );
          errors.push(...itemErrors);
        });
      }

      if (typeof schema.minItems === 'number' && data.length < schema.minItems) {
        errors.push(`${currentPath}: array must have at least ${schema.minItems} items`);
      }
      if (typeof schema.maxItems === 'number' && data.length > schema.maxItems) {
        errors.push(`${currentPath}: array must have at most ${schema.maxItems} items`);
      }
    }

    // --- String validation ---
    if (typeof data === 'string') {
      if (typeof schema.minLength === 'number' && data.length < schema.minLength) {
        errors.push(`${currentPath}: string length must be >= ${schema.minLength}`);
      }
      if (typeof schema.maxLength === 'number' && data.length > schema.maxLength) {
        errors.push(`${currentPath}: string length must be <= ${schema.maxLength}`);
      }
      if (schema.pattern && typeof schema.pattern === 'string') {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(data)) {
          errors.push(`${currentPath}: string does not match pattern "${schema.pattern}"`);
        }
      }
    }

    // --- Number validation ---
    if (typeof data === 'number') {
      if (typeof schema.minimum === 'number' && data < schema.minimum) {
        errors.push(`${currentPath}: value must be >= ${schema.minimum}`);
      }
      if (typeof schema.maximum === 'number' && data > schema.maximum) {
        errors.push(`${currentPath}: value must be <= ${schema.maximum}`);
      }
    }

    return errors;
  }

  /** Runtime type check helper. @private */
  private checkType(data: unknown, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof data === 'string';
      case 'number':
        return typeof data === 'number' && !Number.isNaN(data);
      case 'integer':
        return Number.isInteger(data);
      case 'boolean':
        return typeof data === 'boolean';
      case 'object':
        return typeof data === 'object' && data !== null && !Array.isArray(data);
      case 'array':
        return Array.isArray(data);
      case 'null':
        return data === null;
      default:
        return true;
    }
  }

  /** Get human-readable type name. @private */
  private getTypeName(data: unknown): string {
    if (data === null) return 'null';
    if (Array.isArray(data)) return 'array';
    return typeof data;
  }
}

// ---------------------------------------------------------------------------
// 6. Rate Limiting per Endpoint
// ---------------------------------------------------------------------------

/**
 * Token-bucket / sliding-window rate limiter for controlling outbound webhook
 * frequency to individual endpoints. Prevents overwhelming receivers.
 */
export class RateLimiter {
  private requests: number[] = []; // Timestamps of recent requests

  constructor(private config: RateLimitConfig) {}

  /**
   * Check whether a request is allowed under the current rate limit.
   * @returns True if the request is allowed; false if it would exceed the limit
   */
  allow(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Prune old entries outside the window
    this.requests = this.requests.filter((ts) => ts > windowStart);

    if (this.requests.length >= this.config.maxRequests) {
      return false;
    }

    this.requests.push(now);
    return true;
  }

  /**
   * Get the number of remaining requests allowed in the current window.
   */
  remaining(): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const activeCount = this.requests.filter((ts) => ts > windowStart).length;
    return Math.max(0, this.config.maxRequests - activeCount);
  }

  /**
   * Get the time in ms until the next request slot becomes available.
   * Returns 0 if a request can be made immediately.
   */
  resetTimeMs(): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    if (this.requests.length < this.config.maxRequests) return 0;

    const oldestInWindow = this.requests.find((ts) => ts > windowStart);
    if (!oldestInWindow) return 0;

    return oldestInWindow + this.config.windowMs - now;
  }

  /**
   * Update the rate limit configuration.
   * @param config - New configuration
   */
  updateConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Reset the rate limiter state (clear all recorded requests).
   */
  reset(): void {
    this.requests = [];
  }
}

// ---------------------------------------------------------------------------
// 7. Payload Transformation
// ---------------------------------------------------------------------------

/**
 * PayloadTransformerRegistry holds transformation functions that convert webhook
 * payloads from one format/provider to another (e.g., GitHub -> Slack).
 */
export class PayloadTransformerRegistry {
  private transformers: Map<string, TransformerEntry[]> = new Map();

  /**
   * Register a payload transformer.
   *
   * @param entry - Transformer entry with source/target format and transform function
   */
  register<TFrom = unknown, TTo = unknown>(entry: TransformerEntry<TFrom, TTo>): void {
    const key = `${entry.sourceFormat}->${entry.targetFormat}`;
    if (!this.transformers.has(key)) {
      this.transformers.set(key, []);
    }
    this.transformers.get(key)!.push(entry as TransformerEntry);
  }

  /**
   * Transform a payload from source format to target format.
   *
   * @param sourceFormat - Source provider/format (e.g., 'github')
   * @param targetFormat - Target provider/format (e.g., 'slack')
   * @param payload - Original payload
   * @param eventType - Event type for selecting the right transformer
   * @returns Transformed payload
   * @throws {Error} If no matching transformer is found
   */
  async transform<TFrom = unknown, TTo = unknown>(
    sourceFormat: string,
    targetFormat: string,
    payload: TFrom,
    eventType: string,
  ): Promise<TTo> {
    const key = `${sourceFormat}->${targetFormat}`;
    const entries = this.transformers.get(key);

    if (!entries || entries.length === 0) {
      throw new Error(
        `No transformer registered for ${key}`,
      );
    }

    // Find best match: exact event type first, then wildcard
    let bestEntry: TransformerEntry | null = null;
    for (const entry of entries) {
      if (Array.isArray(entry.eventTypes) && entry.eventTypes.includes(eventType)) {
        bestEntry = entry;
        break;
      }
      if (entry.eventTypes === '*') {
        bestEntry = entry; // Fallback to wildcard
      }
    }

    if (!bestEntry) {
      throw new Error(
        `No transformer found for ${key} with event type "${eventType}"`,
      );
    }

    return (bestEntry.transform as PayloadTransformer<TFrom, TTo>)(
      payload,
      eventType,
    );
  }

  /**
   * Check if a transformer exists for a given format pair.
   */
  hasTransformer(sourceFormat: string, targetFormat: string): boolean {
    return this.transformers.has(`${sourceFormat}->${targetFormat}`);
  }

  /**
   * List all registered transformation routes.
   */
  listRoutes(): string[] {
    return Array.from(this.transformers.keys());
  }

  /**
   * Remove a transformer route entirely.
   */
  removeRoute(sourceFormat: string, targetFormat: string): boolean {
    return this.transformers.delete(`${sourceFormat}->${targetFormat}`);
  }
}

/**
 * Pre-built common transformers for popular format conversions.
 * Import and register these with PayloadTransformerRegistry.
 */
export const CommonTransformers = {
  /**
   * GitHub push event -> Slack message attachment.
   * Transforms a GitHub push payload into a Slack-compatible message structure.
   */
  githubPushToSlack: {
    sourceFormat: 'github' as const,
    targetFormat: 'slack' as const,
    eventTypes: ['push'] as string[],
    transform: (payload: Record<string, unknown>): Record<string, unknown> => {
      const p = payload;
      const repo = (p.repository as Record<string, unknown>) ?? {};
      const pusher = (p.pusher as Record<string, unknown>) ?? {};
      const commits = (p.commits as Array<Record<string, unknown>>) ?? [];

      return {
        text: `*${(repo.name as string) ?? 'unknown'}*: ${(pusher.name as string) ?? 'someone'} pushed ${commits.length} commit(s)`,
        attachments: commits.map((c) => ({
          title: `Commit: ${(c.id as string)?.slice(0, 7) ?? 'unknown'}`,
          text: c.message ?? 'No message',
          color: '#36a64f',
        })),
        mrkdwn: true,
      };
    },
  },

  /**
   * Generic flatten transformer: converts nested objects into flat key-value pairs.
   */
  flatten: {
    sourceFormat: '*' as const,
    targetFormat: 'flat' as const,
    eventTypes: '*',
    transform: <T extends Record<string, unknown>>(payload: T): Record<string, unknown> => {
      const result: Record<string, unknown> = {};

      const flatten = (obj: unknown, prefix = ''): void => {
        if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
          result[prefix] = obj;
          return;
        }
        for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
          const newKey = prefix ? `${prefix}.${key}` : key;
          flatten(value, newKey);
        }
      };

      flatten(payload);
      return result;
    },
  },

  /**
   * Stripe payment intent -> generic notification format.
   */
  stripePaymentToGeneric: {
    sourceFormat: 'stripe' as const,
    targetFormat: 'generic' as const,
    eventTypes: ['payment_intent.succeeded', 'payment_intent.payment_failed'] as string[],
    transform: (payload: Record<string, unknown>, eventType: string): Record<string, unknown> => {
      const obj = payload.object as Record<string, unknown> ?? payload;
      return {
        notification_type: eventType,
        amount: obj.amount,
        currency: obj.currency,
        status: obj.status,
        customer_id: obj.customer,
        metadata: obj.metadata,
        created: obj.created,
      };
    },
  },
};

// ---------------------------------------------------------------------------
// 8. Secret Management
// ---------------------------------------------------------------------------

/**
 * SecretManager securely stores and manages webhook secrets with support for
 * secret rotation. Secrets are stored in-memory; for persistence, serialize
 * with `exportSecrets()` and restore with `importSecrets()`.
 *
 * **Security note**: This is a client-side utility. For production server-side
 * use, integrate with a proper secrets backend (HashiCorp Vault, AWS Secrets
 * Manager, environment variables, etc.).
 */
export class SecretManager {
  private secrets: Map<string, SecretEntry> = new Map();

  /**
   * Store a secret for a given identifier.
   *
   * @param id - Identifier (e.g., endpoint ID or provider name)
   * @param secret - The secret value
   * @param options - Optional expiration and rotation settings
   */
  setSecret(
    id: string,
    secret: string,
    options: { expiresAt?: Date | null; rotationHistory?: number } = {},
  ): void {
    const existing = this.secrets.get(id);
    const previousSecrets = existing ? [existing.secret, ...existing.previousSecrets].slice(0, options.rotationHistory ?? 2) : [];

    this.secrets.set(id, {
      id,
      secret,
      previousSecrets,
      createdAt: new Date(),
      expiresAt: options.expiresAt ?? null,
      rotationHistory: options.rotationHistory ?? 2,
    });
  }

  /**
   * Get the current active secret for an identifier.
   * @param id - Secret identifier
   * @returns The current secret, or undefined if not found/expired
   */
  getSecret(id: string): string | undefined {
    const entry = this.secrets.get(id);
    if (!entry) return undefined;

    // Check expiration
    if (entry.expiresAt && new Date() > entry.expiresAt) {
      return undefined;
    }

    return entry.secret;
  }

  /**
   * Get all valid secrets for an identifier (current + previous for rotation).
   * Used during signature verification when the sender might be using either
   * the current or a recently rotated secret.
   *
   * @param id - Secret identifier
   * @returns Array of valid secrets (newest first)
   */
  getAllValidSecrets(id: string): string[] {
    const entry = this.secrets.get(id);
    if (!entry) return [];

    if (entry.expiresAt && new Date() > entry.expiresAt) {
      return [];
    }

    return [entry.secret, ...entry.previousSecrets];
  }

  /**
   * Rotate a secret: generate a new one and demote the current to previous.
   *
   * @param id - Secret identifier
   * @param newSecret - New secret value (or omit to auto-generate)
   * @returns The new secret value
   */
  rotateSecret(id: string, newSecret?: string): string {
    const secret = newSecret ?? generateRandomHex(32);
    this.setSecret(id, secret);
    return secret;
  }

  /**
   * Remove a secret entirely.
   * @param id - Secret identifier
   */
  removeSecret(id: string): boolean {
    return this.secrets.delete(id);
  }

  /**
   * Check if a secret exists and is not expired.
   * @param id - Secret identifier
   */
  hasSecret(id: string): boolean {
    return this.getSecret(id) !== undefined;
  }

  /**
   * List all secret identifiers.
   */
  listSecretIds(): string[] {
    return Array.from(this.secrets.keys());
  }

  /**
   * Export secrets for persistence (e.g., to localStorage or a secure store).
   * **Warning**: Exports contain plaintext secrets. Handle with extreme care.
   *
   * @returns Array of serializable secret entries (secrets included)
   */
  exportSecrets(): Array<{ id: string; secret: string; previousSecrets: string[]; createdAt: string; expiresAt: string | null }> {
    return Array.from(this.secrets.values()).map((entry) => ({
      id: entry.id,
      secret: entry.secret,
      previousSecrets: entry.previousSecrets,
      createdAt: entry.createdAt.toISOString(),
      expiresAt: entry.expiresAt?.toISOString() ?? null,
    }));
  }

  /**
   * Import secrets from a previously exported state.
   * @param data - Array of secret entries from exportSecrets()
   */
  importSecrets(
    data: Array<{ id: string; secret: string; previousSecrets: string[]; createdAt: string; expiresAt: string | null }>,
  ): void {
    for (const item of data) {
      this.secrets.set(item.id, {
        id: item.id,
        secret: item.secret,
        previousSecrets: item.previousSecrets,
        createdAt: new Date(item.createdAt),
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
        rotationHistory: 2,
      });
    }
  }

  /**
   * Clean up expired secrets.
   * @returns Number of secrets removed
   */
  cleanupExpired(): number {
    let removed = 0;
    const now = new Date();
    for (const [id, entry] of this.secrets) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.secrets.delete(id);
        removed++;
      }
    }
    return removed;
  }
}

// ---------------------------------------------------------------------------
// 9. Delivery Status Tracking
// ---------------------------------------------------------------------------

/**
 * DeliveryTracker provides comprehensive tracking of webhook delivery statuses
 * across all endpoints with querying capabilities.
 */
export class DeliveryTracker {
  private records: Map<string, DeliveryRecord> = new Map();

  /**
   * Record a new delivery attempt or update an existing one.
   * @param record - Delivery record to upsert
   */
  upsert(record: DeliveryRecord): void {
    const key = `${record.eventId}:${record.endpointId}`;
    this.records.set(key, record);
  }

  /**
   * Get a specific delivery record.
   * @param eventId - Event ID
   * @param endpointId - Endpoint ID
   */
  get(eventId: string, endpointId: string): DeliveryRecord | undefined {
    return this.records.get(`${eventId}:${endpointId}`);
  }

  /**
   * Query delivery records with flexible filtering.
   * @param filter - Query filter criteria
   * @returns Matching delivery records
   */
  query(filter: DeliveryQueryFilter): DeliveryRecord[] {
    let results = Array.from(this.records.values());

    // Filter by status
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter((r) => statuses.includes(r.status));
    }

    // Filter by endpoint
    if (filter.endpointId) {
      results = results.filter((r) => r.endpointId === filter.endpointId);
    }

    // Filter by time range
    if (filter.from) {
      results = results.filter((r) => r.lastAttemptedAt && r.lastAttemptedAt >= filter.from!);
    }
    if (filter.to) {
      results = results.filter((r) => !r.lastAttemptedAt || r.lastAttemptedAt <= filter.to!);
    }

    // Sort by last attempted descending
    results.sort((a, b) => {
      const ta = a.lastAttemptedAt?.getTime() ?? 0;
      const tb = b.lastAttemptedAt?.getTime() ?? 0;
      return tb - ta;
    });

    // Pagination
    if (filter.offset) results = results.slice(filter.offset);
    if (filter.limit) results = results.slice(0, filter.limit);

    return results;
  }

  /**
   * Count records by status.
   * @param status - Optional status to filter by
   */
  countByStatus(status?: DeliveryStatus): number {
    if (!status) return this.records.size;
    return Array.from(this.records.values()).filter((r) => r.status === status).length;
  }

  /**
   * Get all records with a given status.
   * @param status - Status to filter by
   */
  getByStatus(status: DeliveryStatus): DeliveryRecord[] {
    return Array.from(this.records.values()).filter((r) => r.status === status);
  }

  /**
   * Remove old delivery records (e.g., older than N days).
   * @param olderThan - Cutoff date; records last attempted before this date are removed
   * @returns Number of records removed
   */
  prune(olderThan: Date): number {
    let removed = 0;
    for (const [key, record] of this.records) {
      if (record.lastAttemptedAt && record.lastAttemptedAt < olderThan) {
        this.records.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Clear all records.
   */
  clear(): void {
    this.records.clear();
  }

  /**
   * Get total record count.
   */
  size(): number {
    return this.records.size;
  }
}

// ---------------------------------------------------------------------------
// 10. Idempotency Keys
// ---------------------------------------------------------------------------

/**
 * IdempotencyStore handles duplicate detection for webhook deliveries using
 * idempotency keys. Prevents the same webhook from being processed twice.
 *
 * Supports TTL-based expiry of entries to prevent unbounded memory growth.
 */
export class IdempotencyStore {
  private store: Map<string, { processedAt: Date; eventId: string; ttl: number }> = new Map();

  /**
   * Check if an idempotency key has already been processed.
   *
   * @param key - Idempotency key to check
   * @param ttlMs - Time-to-live in ms for new entries (default: 24 hours)
   * @returns The existing event ID if already processed, or null if this is a new key
   */
  check(key: string, ttlMs: number = 86_400_000): string | null {
    this.evictExpired();

    const existing = this.store.get(key);
    if (existing) {
      return existing.eventId;
    }

    // Mark as seen
    this.store.set(key, {
      processedAt: new Date(),
      eventId: key.split(':')[0] ?? key,
      ttl: ttlMs,
    });

    return null;
  }

  /**
   * Manually mark a key as processed.
   * @param key - Idempotency key
   * @param eventId - Associated event ID
   * @param ttlMs - TTL in ms
   */
  markProcessed(key: string, eventId: string, ttlMs: number = 86_400_000): void {
    this.store.set(key, {
      processedAt: new Date(),
      eventId,
      ttl: ttlMs,
    });
  }

  /**
   * Check if a key exists without marking it.
   * @param key - Idempotency key
   */
  has(key: string): boolean {
    this.evictExpired();
    return this.store.has(key);
  }

  /**
   * Remove a specific key.
   * @param key - Idempotency key to remove
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get the number of stored entries.
   */
  size(): number {
    this.evictExpired();
    return this.store.size;
  }

  /**
   * Evict entries whose TTL has elapsed.
   * @private
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      const age = now - entry.processedAt.getTime();
      if (age > entry.ttl) {
        this.store.delete(key);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random unique ID (v4-like UUID format).
 * Uses Web Crypto API for randomness.
 *
 * @returns UUID string
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  return Array.from(bytes)
    .map((b, i) => (i === 4 || i === 6 || i === 8 || i === 10 ? `-` : '') + b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate a random hex string of specified byte length.
 * @param byteLength - Number of random bytes
 * @returns Hex-encoded string
 */
export function generateRandomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sleep for a given number of milliseconds.
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an error log entry (utility for dispatcher failures).
 * @internal
 */
function createErrorLogEntry(
  eventType: string,
  url: string,
  direction: WebhookDirection,
  errorMessage?: string,
): WebhookLogEntry {
  return {
    id: generateId(),
    direction,
    eventType,
    url,
    status: 'failed',
    timestamp: new Date(),
    retryCount: 0,
    error: errorMessage,
    payloadSize: 0,
  };
}

// ---------------------------------------------------------------------------
// Re-export aggregate convenience classes
// ---------------------------------------------------------------------------

/**
 * WebhookUtils is a facade that combines all webhook utilities into a single
 * cohesive API. Use this for quick setup, or use individual classes directly.
 */
export class WebhookUtils {
  readonly dispatcher: WebhookDispatcher;
  readonly receiver: WebhookReceiver;
  readonly schemaRegistry: EventSchemaRegistry;
  readonly secretManager: SecretManager;
  readonly deliveryTracker: DeliveryTracker;
  readonly idempotencyStore: IdempotencyStore;
  readonly transformerRegistry: PayloadTransformerRegistry;

  constructor(defaultDispatchOptions?: DispatchOptions) {
    this.schemaRegistry = new EventSchemaRegistry();
    this.receiver = new WebhookReceiver(this.schemaRegistry);
    this.dispatcher = new WebhookDispatcher(defaultDispatchOptions);
    this.secretManager = new SecretManager();
    this.deliveryTracker = new DeliveryTracker();
    this.idempotencyStore = new IdempotencyStore();
    this.transformerRegistry = new PayloadTransformerRegistry();
  }

  /**
   * Quick-setup: configure a complete inbound + outbound webhook pipeline.
   *
   * @param config - Pipeline configuration
   *
   * @example
   * ```ts
   * const utils = new WebhookUtils();
   * utils.setup({
   *   inbound: { provider: 'github', secret: 'my-webhook-secret' },
   *   outbound: [{ id: 'slack', url: 'https://hooks.slack.com/...' }],
   * });
   * ```
   */
  setup(config: {
    inbound?: { provider: WebhookProvider; secret: string };
    outbound?: Array<{ id: string; url: string; secret?: string }>;
  }): void {
    if (config.inbound) {
      this.receiver.setVerificationConfig({
        secret: config.inbound.secret,
        provider: config.inbound.provider,
      });
    }

    if (config.outbound) {
      for (const ep of config.outbound) {
        this.dispatcher.addEndpoint({
          id: ep.id,
          url: ep.url,
          secret: ep.secret,
          active: true,
        });
        if (ep.secret) {
          this.secretManager.setSecret(ep.id, ep.secret);
        }
      }
    }
  }
}
