// =============================================================================
// Webhook Handling Library
// Comprehensive TypeScript utility module for handling webhooks
// (GitHub, Stripe, and custom webhooks)
// =============================================================================

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

/** Standard webhook headers extracted from an incoming request */
export interface WebhookHeaders {
  signature: string | null;
  eventType: string | null;
  requestId: string | null;
  timestamp: string | null;
  raw: Record<string, string>;
}

/** A parsed webhook event ready for processing */
export interface WebhookEvent {
  id: string;
  type: string;
  payload: unknown;
  headers: WebhookHeaders;
  receivedAt: Date;
  source: WebhookSource;
}

/** Response returned by a webhook handler */
export interface WebhookResponse {
  status: number;
  body?: string;
  headers?: Record<string, string>;
}

/** Supported webhook sources */
export type WebhookSource = 'github' | 'stripe' | 'custom';

/** Handler function for a webhook event */
export type WebhookHandler = (event: WebhookEvent) => Promise<WebhookResponse> | WebhookResponse;

/** Middleware function that can transform or reject events before routing */
export type WebhookMiddleware = (
  event: WebhookEvent,
  next: () => Promise<WebhookResponse>
) => Promise<WebhookResponse>;

/** Log entry for debugging webhook deliveries */
export interface WebhookDeliveryLogEntry {
  id: string;
  eventId: string;
  eventType: string;
  source: WebhookSource;
  statusCode: number;
  receivedAt: Date;
  processedAt: Date;
  durationMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Detect whether an incoming HTTP request is a webhook based on headers.
 * Checks for common webhook header patterns.
 */
export function isWebhookRequest(headers: Record<string, string>): boolean {
  const lowerKeys = Object.keys(headers).map((k) => k.toLowerCase());

  const webhookIndicators = [
    'x-hub-signature',
    'x-hub-signature-256',
    'x-github-event',
    'x-github-delivery',
    'x-signature',
    'x-event-type',
    'stripe-signature',
    'x-request-id',
    'x-timestamp',
  ];

  return webhookIndicators.some((indicator) =>
    lowerKeys.some((k) => k === indicator || k === `x-${indicator}`)
  );
}

/**
 * Determine the likely source of a webhook from its headers.
 * Returns `'github'`, `'stripe'`, `'custom'`, or `null` if undetectable.
 */
export function getWebhookSource(headers: Record<string, string>): WebhookSource | null {
  const lowerKeys = new Set(Object.keys(headers).map((k) => k.toLowerCase()));

  if (lowerKeys.has('x-github-event') || lowerKeys.has('x-hub-signature-256')) {
    return 'github';
  }

  if (lowerKeys.has('stripe-signature')) {
    return 'stripe';
  }

  if (lowerKeys.has('x-signature') || lowerKeys.has('x-event-type')) {
    return 'custom';
  }

  // If we have some webhook-like headers but can't identify the provider
  if (lowerKeys.has('x-request-id') || lowerKeys.has('x-timestamp')) {
    return 'custom';
  }

  return null;
}

// ---------------------------------------------------------------------------
// WebhookSignatureVerifier
// ---------------------------------------------------------------------------

/**
 * Verifies HMAC-SHA256 signatures on webhook payloads.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export class WebhookSignatureVerifier {
  /**
   * Verify a payload against its signature using the shared secret.
   * @param payload - Raw request body string
   * @param signature - The signature header value (e.g. "sha256=abc123...")
   * @param secret - The secret key used to sign the payload
   * @returns `true` if the signature is valid
   */
  verify(payload: string, signature: string, secret: string): boolean {
    const expectedPrefix = 'sha256=';
    if (!signature.startsWith(expectedPrefix)) {
      return false;
    }

    const expectedSignature = signature.slice(expectedPrefix.length);
    const computedSignature = this.generateSignature(payload, secret);

    return timingSafeEqual(expectedSignature, computedSignature);
  }

  /**
   * Generate an HMAC-SHA256 signature for a payload.
   * @param payload - Raw request body string
   * @param secret - The secret key
   * @returns Hex-encoded signature (without prefix)
   */
  generateSignature(payload: string, secret: string): string {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);

    return crypto.subtle
      .importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then((key) => crypto.subtle.sign('HMAC', key, payloadData))
      .then((buffer) => Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''));
  }
}

// ---------------------------------------------------------------------------
// Timing-Safe Comparison
// ---------------------------------------------------------------------------

/**
 * Constant-time string comparison to prevent timing attacks.
 * Returns `true` only if both strings are identical in length and content.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) {
    return false;
  }

  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  const key = await crypto.subtle.generateKey(
    { name: 'HMAC', hash: 'SHA-256' },
    true,
    ['sign']
  );

  const aMac = await crypto.subtle.sign('HMAC', key, aBytes);
  const bMac = await crypto.subtle.sign('HMAC', key, bBytes);

  const aArr = new Uint8Array(aMac);
  const bArr = new Uint8Array(bMac);

  let result = 0;
  for (let i = 0; i < aArr.length; i++) {
    result |= aArr[i] ^ bArr[i];
  }

  return result === 0;
}

// ---------------------------------------------------------------------------
// WebhookParser
// ---------------------------------------------------------------------------

/**
 * Generic parser for webhook requests.
 * Extracts headers, parses JSON body, validates timestamps.
 */
export class WebhookParser {
  /**
   * Parse a JSON request body into a structured event.
   * @param body - Raw JSON string from the request body
   * @returns Parsed payload object
   */
  parseBody(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch (err) {
      throw new Error(`Invalid webhook body JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Extract standard webhook headers from raw HTTP headers.
   * Normalizes keys to lowercase and maps known fields.
   * @param headers - Raw HTTP headers (case-insensitive keys recommended)
   * @returns Structured WebhookHeaders object
   */
  parseHeaders(headers: Record<string, string>): WebhookHeaders {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }

    return {
      signature:
        normalized['x-hub-signature-256'] ??
        normalized['x-hub-signature'] ??
        normalized['x-signature'] ??
        normalized['stripe-signature'] ??
        null,
      eventType:
        normalized['x-github-event'] ??
        normalized['x-event-type'] ??
        null,
      requestId:
        normalized['x-github-delivery'] ??
        normalized['x-request-id'] ??
        null,
      timestamp:
        normalized['x-timestamp'] ??
        null,
      raw: normalized,
    };
  }

  /**
   * Validate that the webhook timestamp is within acceptable bounds
   * to prevent replay attacks.
   * @param headers - Parsed webhook headers containing timestamp
   * @param maxAgeMs - Maximum allowed age in milliseconds (default 5 minutes)
   * @returns `true` if timestamp is valid (or absent; caller should decide)
   */
  validateTimestamp(headers: WebhookHeaders, maxAgeMs: number = 300_000): boolean {
    if (!headers.timestamp) {
      // No timestamp present — up to caller to enforce
      return true;
    }

    const ts = parseInt(headers.timestamp, 10);
    if (Number.isNaN(ts)) {
      return false;
    }

    const now = Date.now();
    const age = Math.abs(now - ts);
    return age <= maxAgeMs;
  }

  /**
   * Full parse: combine headers + body into a WebhookEvent.
   */
  async parse(
    body: string,
    headers: Record<string, string>
  ): Promise<WebhookEvent> {
    const parsedHeaders = this.parseHeaders(headers);
    const payload = this.parseBody(body);
    const source = getWebhookSource(headers) ?? 'custom';

    return {
      id: parsedHeaders.requestId ?? crypto.randomUUID(),
      type: parsedHeaders.eventType ?? 'unknown',
      payload,
      headers: parsedHeaders,
      receivedAt: new Date(),
      source,
    };
  }
}

// ---------------------------------------------------------------------------
// GitHub Webhook Parser
// ---------------------------------------------------------------------------

/** Structure of a GitHub webhook payload (common fields) */
export interface GitHubWebhookEvent extends WebhookEvent {
  action?: string;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    owner?: { login: string };
    private: boolean;
  };
  sender?: {
    id: number;
    login: string;
    avatar_url?: string;
  };
  installation?: { id: number };
}

/** Known GitHub webhook event types */
export const GITHUB_EVENT_TYPES = [
  'push',
  'pull_request',
  'issues',
  'issue_comment',
  'deployment',
  'deployment_status',
  'release',
  'fork',
  'watch',
  'star',
  'create',
  'delete',
  'member',
  'membership',
  'ping',
] as const;

/**
 * Specialized parser for GitHub webhook events.
 * Enriches the generic WebhookEvent with GitHub-specific fields.
 */
export class GitHubWebhookParser extends WebhookParser {
  /**
   * Parse a GitHub webhook into a fully enriched event.
   */
  async parse(
    body: string,
    headers: Record<string, string>
  ): Promise<GitHubWebhookEvent> {
    const baseEvent = await super.parse(body, headers);
    const payload = baseEvent.payload as Record<string, unknown>;

    const ghEvent: GitHubWebhookEvent = {
      ...baseEvent,
      action: this.extractAction(payload),
      repository: this.extractRepository(payload),
      sender: this.extractSender(payload),
    };

    // Pull installation ID if present
    if ('installation' in payload && typeof payload.installation === 'object' && payload.installation !== null) {
      ghEvent.installation = payload.installation as { id: number };
    }

    return ghEvent;
  }

  /** Extract the action field from common GitHub payloads */
  private extractAction(payload: Record<string, unknown>): string | undefined {
    return typeof payload.action === 'string' ? payload.action : undefined;
  }

  /** Extract repository info from the payload */
  private extractRepository(payload: Record<string, unknown>): GitHubWebhookEvent['repository'] {
    const repo = payload.repository;
    if (!repo || typeof repo !== 'object') return undefined;

    const r = repo as Record<string, unknown>;
    return {
      id: typeof r.id === 'number' ? r.id : 0,
      name: typeof r.name === 'string' ? r.name : '',
      full_name: typeof r.full_name === 'string' ? r.full_name : '',
      owner: r.owner && typeof r.owner === 'object'
        ? { login: ((r.owner as Record<string, unknown>).login as string) ?? '' }
        : undefined,
      private: typeof r.private === 'boolean' ? r.private : false,
    };
  }

  /** Extract sender info from the payload */
  private extractSender(payload: Record<string, unknown>): GitHubWebhookEvent['sender'] {
    const sender = payload.sender;
    if (!sender || typeof sender !== 'object') return undefined;

    const s = sender as Record<string, unknown>;
    return {
      id: typeof s.id === 'number' ? s.id : 0,
      login: typeof s.login === 'string' ? s.login : '',
      avatar_url: typeof s.avatar_url === 'string' ? s.avatar_url : undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Stripe Webhook Parser
// ---------------------------------------------------------------------------

/** Parsed Stripe signature components */
export interface StripeSignatureComponents {
  timestamp: number;
  signatures: string[];
  raw: string;
}

/** Enriched Stripe webhook event */
export interface StripeWebhookEvent extends WebhookEvent {
  stripeEventType: string;
  stripeSignature: StripeSignatureComponents;
  data: {
    object: Record<string, unknown>;
  };
}

/**
 * Specialized parser for Stripe webhooks.
 * Handles the Stripe-specific signature format: `t=TIMESTAMP,v1=SIGNATURE,...`
 */
export class StripeWebhookParser extends WebhookParser {
  /**
   * Parse a Stripe webhook signature header into its components.
   * Format: `t=1492774577,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd`
   */
  parseStripeSignature(signatureHeader: string): StripeSignatureComponents {
    const components: StripeSignatureComponents = {
      timestamp: 0,
      signatures: [],
      raw: signatureHeader,
    };

    const parts = signatureHeader.split(',');
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        components.timestamp = parseInt(value, 10);
      } else if (key && key.startsWith('v1=')) {
        components.signatures.push(value);
      } else if (key?.startsWith('v')) {
        // Future versioned signatures
        components.signatures.push(value ?? '');
      }
    }

    return components;
  }

  /**
   * Verify a Stripe webhook signature.
   * Iterates through all v1 signatures and checks against the computed HMAC.
   */
  async verifyStripeSignature(
    payload: string,
    signatureHeader: string,
    secret: string
  ): Promise<boolean> {
    const components = this.parseStripeSignature(signatureHeader);
    const verifier = new WebhookSignatureVerifier();

    for (const sig of components.signatures) {
      const expectedSig = `sha256=${sig}`;
      const isValid = await verifier.verify(payload, expectedSig, secret);
      if (isValid) return true;
    }

    return false;
  }

  /**
   * Full parse of a Stripe webhook request.
   */
  async parse(
    body: string,
    headers: Record<string, string>
  ): Promise<StripeWebhookEvent> {
    const baseEvent = await super.parse(body, headers);
    const payload = baseEvent.payload as Record<string, unknown>;
    const sigHeader = baseEvent.headers.signature ?? '';

    const stripeEvent: StripeWebhookEvent = {
      ...baseEvent,
      stripeEventType: baseEvent.type,
      stripeSignature: this.parseStripeSignature(sigHeader),
      data: {
        object: (payload.data?.object as Record<string, unknown>) ?? {},
      },
    };

    return stripeEvent;
  }
}

// ---------------------------------------------------------------------------
// WebhookRouter
// ---------------------------------------------------------------------------

/**
 * Routes webhook events to registered handlers by event type.
 * Supports middleware pipeline, default fallback handlers, and per-event routing.
 */
export class WebhookRouter {
  private handlers: Map<string, WebhookHandler> = new Map();
  private defaultHandlerFn: WebhookHandler | null = null;
  private middlewareFns: WebhookMiddleware[] = [];

  /**
   * Register a handler for a specific event type.
   * @param event - Event type string (e.g., "push", "payment_intent.succeeded")
   * @param handler - Handler function to invoke for matching events
   */
  on(event: string, handler: WebhookHandler): void {
    this.handlers.set(event, handler);
  }

  /**
   * Register a default/fallback handler for unrecognized event types.
   * @param handler - Handler function invoked when no specific handler matches
   */
  defaultHandler(handler: WebhookHandler): void {
    this.defaultHandlerFn = handler;
  }

  /**
   * Add middleware to the processing pipeline.
   * Middleware runs in registration order before the handler.
   * Each middleware must call `next()` to continue the chain.
   * @param fn - Middleware function
   */
  middleware(fn: WebhookMiddleware): void {
    this.middlewareFns.push(fn);
  }

  /**
   * Route an incoming webhook event to the appropriate handler.
   * Runs the full middleware pipeline before dispatching.
   * @param event - The parsed webhook event
   * @returns Response from the matched handler or default handler
   */
  async handle(event: WebhookEvent): Promise<WebhookResponse> {
    // Build the middleware chain ending with the actual handler dispatch
    const handler = this.handlers.get(event.type) ?? this.defaultHandlerFn;

    if (!handler) {
      return { status: 202, body: JSON.stringify({ error: 'No handler for event type', type: event.type }) };
    }

    // Compose middleware chain
    let index = 0;
    const buildChain = (): (() => Promise<WebhookResponse>) => {
      if (index < this.middlewareFns.length) {
        const mw = this.middlewareFns[index++];
        return () => mw(event, buildChain());
      }
      return () => handler(event);
    };

    try {
      return buildChain()();
    } catch (err) {
      return {
        status: 500,
        body: JSON.stringify({
          error: 'Webhook handler error',
          message: err instanceof Error ? err.message : String(err),
        }),
      };
    }
  }

  /**
   * Remove all registered handlers and middleware (useful for testing).
   */
  reset(): void {
    this.handlers.clear();
    this.defaultHandlerFn = null;
    this.middlewareFns = [];
  }

  /**
   * Get the list of currently registered event types.
   */
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// ---------------------------------------------------------------------------
// In-Memory Delivery Log
// ---------------------------------------------------------------------------

/**
 * Simple in-memory log for recording webhook delivery outcomes.
 * Useful for debugging and audit trails during development.
 */
export class WebhookDeliveryLog {
  private entries: Map<string, WebhookDeliveryLogEntry> = new Map();
  private maxEntries: number;

  constructor(maxEntries: number = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Record a webhook delivery attempt.
   */
  record(entry: Omit<WebhookDeliveryLogEntry, 'id'>): string {
    const id = crypto.randomUUID();
    const fullEntry: WebhookDeliveryLogEntry = { ...entry, id };

    // Evict oldest entries if over capacity
    if (this.entries.size >= this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }

    this.entries.set(id, fullEntry);
    return id;
  }

  /**
   * Retrieve a log entry by ID.
   */
  get(id: string): WebhookDeliveryLogEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Get all log entries, optionally filtered by source or event type.
   */
  query(options?: { source?: WebhookSource; eventType?: string }): WebhookDeliveryLogEntry[] {
    let results = Array.from(this.entries.values());

    if (options?.source) {
      results = results.filter((e) => e.source === options.source);
    }

    if (options?.eventType) {
      results = results.filter((e) => e.eventType === options.eventType);
    }

    // Sort newest first
    results.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
    return results;
  }

  /**
   * Clear all log entries.
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Get the total number of logged entries.
   */
  get size(): number {
    return this.entries.size;
  }
}

// ---------------------------------------------------------------------------
// Built-in Middleware Factories
// ---------------------------------------------------------------------------

/**
 * Create a logging middleware that prints webhook event info to console.
 * @param logger - Custom logger function (defaults to console.log)
 */
export function createLoggingMiddleware(
  logger: (msg: string) => void = console.log.bind(console)
): WebhookMiddleware {
  return async (event, next) => {
    const start = Date.now();
    logger(`[webhook] Received ${event.source}:${event.type} (${event.id})`);

    const response = await next();

    const duration = Date.now() - start;
    logger(
      `[webhook] Handled ${event.type} -> ${response.status} (${duration}ms)`
    );

    return response;
  };
}

/**
 * Create a simple rate-limiting middleware.
 * Rejects requests if more than `maxRequests` have been received within `windowMs`.
 *
 * Note: This is a basic in-memory rate limiter suitable for development.
 * Production use should employ a proper distributed rate limiter.
 */
export function createRateLimitMiddleware(
  maxRequests: number = 100,
  windowMs: number = 60_000
): WebhookMiddleware {
  const requests: number[] = [];

  return async (_event, next) => {
    const now = Date.now();

    // Prune old entries
    while (requests.length > 0 && requests[0]! < now - windowMs) {
      requests.shift();
    }

    if (requests.length >= maxRequests) {
      return {
        status: 429,
        body: JSON.stringify({ error: 'Too many webhook requests' }),
      };
    }

    requests.push(now);
    return next();
  };
}

// ---------------------------------------------------------------------------
// Re-exports Summary
// ---------------------------------------------------------------------------

// Types: WebhookHeaders, WebhookEvent, WebhookResponse, WebhookSource,
//        WebhookHandler, WebhookMiddleware, WebhookDeliveryLogEntry,
//        GitHubWebhookEvent, StripeSignatureComponents, StripeWebhookEvent

// Classes: WebhookSignatureVerifier, WebhookParser, GitHubWebhookParser,
//          StripeWebhookParser, WebhookRouter, WebhookDeliveryLog

// Functions: isWebhookRequest, getWebhookSource,
//            createLoggingMiddleware, createRateLimitMiddleware

// Constants: GITHUB_EVENT_TYPES
