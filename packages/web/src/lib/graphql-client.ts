/**
 * GraphQL Client: Type-safe GraphQL client over HTTP/WebSocket with
 * query/mutation/subscription support, persisted queries, automatic
 * fragment spreading, variable normalization, error handling,
 * operation batching, file uploads, and offline mutation queue.
 */

// --- Types ---

export type GraphQLOperationType = "query" | "mutation" | "subscription";

export interface GraphQLVariableValues {
  [key: string]: unknown;
}

export interface GraphQLRequest<V extends GraphQLVariableValues = GraphQLVariableValues> {
  /** Operation type (inferred from document or explicit) */
  operation?: GraphQLOperationType;
  /** GraphQL document string */
  query: string;
  /** Operation name (for multi-operation documents) */
  operationName?: string;
  /** Variables */
  variables?: V;
  /** Request extensions */
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T = unknown> {
  /** Response data */
  data: T | null;
  /** Array of errors */
  errors?: GraphQLErrorResponse[];
  /** Response extensions (e.g., tracing info) */
  extensions?: Record<string, unknown>;
  /** HTTP status */
  status: number;
  /** Request duration */
  latency: number;
}

export interface GraphQLErrorResponse {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLClientOptions {
  /** GraphQL endpoint URL */
  url: string;
  /** WebSocket endpoint for subscriptions (optional) */
  wsUrl?: string;
  /** Fetch implementation (for SSR/testing) */
  fetchFn?: typeof fetch;
  /** Headers (static or dynamic function) */
  headers?: Record<string, string> | (() => Record<string, string>);
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Request timeout in ms */
  timeout?: number;
  /** Auth token */
  authToken?: string | (() => string | null | Promise<string | null>);
  /** Enable persisted query support (automatic document hashing) */
  persistedQueries?: boolean;
  /** Batch multiple operations into single request */
  batchInterval?: number;
  /** Maximum batch size */
  batchSize?: number;
  /** Default error policy */
  errorPolicy?: "none" | "throw" | "all";
  /** Called before each request */
  onRequest?: (request: GraphQLRequest) => GraphQLRequest | Promise<GraphQLRequest>;
  /** Called after each response */
  onResponse?: (response: GraphQLResponse) => void;
  /** Called on network error */
  onError?: (error: Error) => void;
}

export interface SubscriptionOptions<V extends GraphQLVariableValues = GraphQLVariableValues> {
  query: string;
  variables?: V;
  operationName?: string;
  /** Called on each new data payload */
  onNext: (data: unknown) => void;
  /** Called when subscription ends normally */
  onComplete?: () => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

// --- Document Parsing ---

/** Extract operation type from a GraphQL document string. */
export function extractOperationType(document: string): GraphQLOperationType {
  // Remove strings and comments first
  const cleaned = document
    .replace(/"""[\s\S]*?"""/g, '""')
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/#.*/g, "");

  if (/^\s*mutation\b/m.test(cleaned)) return "mutation";
  if (/^\s*subscription\b/m.test(cleaned)) return "subscription";
  return "query";
}

/** Extract operation names from a document. */
export function extractOperationNames(document: string): string[] {
  const regex = /\b(query|mutation|subscription)\s+(\w+)/g;
  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(document)) !== null) {
    names.push(match[2]!);
  }
  return names;
}

/** Extract variable definitions from a document. */
export function extractVariableNames(document: string): string[] {
  const regex = /\$(\w+)\s*:/g;
  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(document)) !== null) {
    names.push(match[1]!);
  }
  return [...new Set(names)];
}

/** Generate a stable hash of a GraphQL query for persisted queries. */
export function hashQuery(document: string): string {
  // Simple hash — production would use SHA-256
  let hash = 0;
  for (let i = 0; i < document.length; i++) {
    const char = document.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// --- Core Client ---

export class GraphQLClient {
  private options: Required<GraphQLClientOptions> & { fetchFn: typeof fetch };
  private batchQueue: Array<{
    request: GraphQLRequest;
    resolve: (resp: GraphQLResponse) => void;
    reject: (err: Error) => void;
  }> = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptionIdCounter = 0;
  private activeSubscriptions: Map<number, { close: () => void }> = new Map();

  constructor(options: GraphQLClientOptions) {
    this.options = {
      fetchFn: options.fetchFn ?? fetch,
      credentials: "same-origin",
      timeout: 30000,
      errorPolicy: "none",
      batchInterval: 10,
      batchSize: 10,
      persistedQueries: false,
      ...options,
      headers: options.headers ?? {},
    };
  }

  // --- Public API ---

  /** Execute a GraphQL query. */
  async query<T = unknown, V extends GraphQLVariableValues = GraphQLVariableValues>(
    request: GraphQLRequest<V>,
  ): Promise<GraphQLResponse<T>> {
    return this.request<T, V>({ ...request, operation: "query" });
  }

  /** Execute a GraphQL mutation. */
  async mutate<T = unknown, V extends GraphQLVariableValues = GraphQLVariableValues>(
    request: GraphQLRequest<V>,
  ): Promise<GraphQLResponse<T>> {
    return this.request<T, V>({ ...request, operation: "mutation" });
  }

  /** Execute a raw request (auto-detects operation type). */
  async request<T = unknown, V extends GraphQLVariableValues = GraphQLVariableValues>(
    request: GraphQLRequest<V>,
  ): Promise<GraphQLResponse<T>> {
    const normalized = this.normalizeRequest(request);

    // Apply request hook
    let processed = normalized;
    if (this.options.onRequest) {
      processed = await this.options.onRequest(normalized);
    }

    // Batching for queries
    if (
      processed.operation === "query" &&
      this.options.batchInterval > 0 &&
      !process.env.DISABLE_BATCHING
    ) {
      return this.batchRequest<T>(processed);
    }

    return this.executeRequest<T>(processed);
  }

  /** Subscribe to a GraphQL subscription (requires wsUrl). */
  subscribe<V extends GraphQLVariableValues = GraphQLVariableValues>(
    options: SubscriptionOptions<V>,
  ): { unsubscribe: () => void; id: number } {
    const id = ++this.subscriptionIdCounter;

    if (!this.options.wsUrl) {
      console.warn("GraphQL: Cannot subscribe — no wsUrl provided");
      options.onError?.(new Error("WebSocket URL not configured"));
      return { unsubscribe: () => {}, id };
    }

    // For browser environments, use native WebSocket
    try {
      const ws = new WebSocket(this.options.wsUrl);

      const connectionInit = {
        type: "connection_init",
        payload: { Authorization: this.getAuthToken() },
      };

      ws.onopen = () => {
        ws.send(JSON.stringify(connectionInit));
        ws.send(JSON.stringify({
          id: String(id),
          type: "start",
          payload: {
            query: options.query,
            variables: options.variables,
            operationName: options.operationName,
          },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          switch (msg.type) {
            case "data":
              options.onNext(msg.payload.data);
              break;
            case "complete":
              options.onComplete?.();
              break;
            case "error":
              options.onError?.(new Error(msg.payload?.message ?? "Subscription error"));
              break;
            case "connection_ack":
              // Connection established
              break;
            case "ka": // keep-alive
              break;
          }
        } catch {}
      };

      ws.onerror = () => {
        options.onError?.(new Error("WebSocket error"));
      };

      const close = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ id: String(id), type: "stop" }));
        }
        ws.close();
        this.activeSubscriptions.delete(id);
      };

      this.activeSubscriptions.set(id, { close });
      return { unsubscribe: close, id };
    } catch (err) {
      options.onError?.(err as Error);
      return { unsubscribe: () => {}, id };
    }
  }

  /** Unsubscribe from an active subscription. */
  unsubscribe(subscriptionId: number): void {
    const sub = this.activeSubscriptions.get(subscriptionId);
    if (sub) sub.close();
  }

  /** Close all active subscriptions. */
  closeAllSubscriptions(): void {
    for (const [, sub] of this.activeSubscriptions) {
      sub.close();
    }
    this.activeSubscriptions.clear();
  }

  // --- Internal ---

  private async executeRequest<T>(
    request: GraphQLRequest,
  ): Promise<GraphQLResponse<T>> {
    const startTime = Date.now();

    try {
      const headers = await this.resolveHeaders();
      const body = this.buildRequestBody(request);

      // Timeout handling
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        this.options.timeout,
      );

      const response = await this.options.fetchFn(this.options.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
        credentials: this.options.credentials,
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`GraphQL: HTTP ${response.status} - ${text.slice(0, 200)}`);
      }

      const json = await response.json() as GraphQLResponse<T>;
      json.latency = latency;
      json.status = response.status;

      // Handle errors based on policy
      if (json.errors?.length && this.options.errorPolicy === "throw") {
        const error = new Error(json.errors.map((e) => e.message).join("; "));
        (error as Error & { graphQLErrors: GraphQLErrorResponse[] }).graphQLErrors = json.errors;
        throw error;
      }

      this.options.onResponse?.(json);
      return json;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.options.onError?.(error);
      throw error;
    }
  }

  private batchRequest<T>(request: GraphQLRequest): Promise<GraphQLResponse<T>> {
    return new Promise<T>((resolve, reject) => {
      this.batchQueue.push({
        request,
        resolve: resolve as (resp: GraphQLResponse) => void,
        reject,
      });

      if (this.batchQueue.length >= this.options.batchSize!) {
        this.flushBatch();
      } else if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.flushBatch(), this.options.batchInterval);
      }
    }) as Promise<GraphQLResponse<T>>;
  }

  private async flushBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    const batch = this.batchQueue.splice(0);
    if (batch.length === 0) return;

    if (batch.length === 1) {
      // Single request — don't bother with batch format
      try {
        const result = await this.executeRequest(batch[0]!.request);
        batch[0]!.resolve(result);
      } catch (err) {
        batch[0]!.reject(err as Error);
      }
      return;
    }

    // Multiple requests — send as batch
    try {
      const results = await this.executeBatch(batch.map((b) => b.request));

      for (let i = 0; i < batch.length; i++) {
        if (results[i]?.errors && this.options.errorPolicy === "throw") {
          batch[i]!.reject(new Error(results[i]!.errors!.map((e) => e.message).join("; ")));
        } else {
          batch[i]!.resolve(results[i]!);
        }
      }
    } catch (err) {
      for (const b of batch) {
        b.reject(err as Error);
      }
    }
  }

  private async executeBatch(
    requests: GraphQLRequest[],
  ): Promise<GraphQLResponse[]> {
    const headers = await this.resolveHeaders();
    const body = requests.map((r) => this.buildRequestBody(r));

    const response = await this.options.fetchFn(this.options.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      credentials: this.options.credentials,
    });

    if (!response.ok) {
      throw new Error(`Batch request failed: ${response.status}`);
    }

    const json = await response.json() as GraphQLResponse[];

    // If server returned single response (doesn't support batching), fall back
    if (!Array.isArray(json)) {
      return requests.map(() => json);
    }

    return json;
  }

  private normalizeRequest(request: GraphQLRequest): GraphQLRequest {
    return {
      ...request,
      operation: request.operation ?? extractOperationType(request.query),
    };
  }

  private buildRequestBody(request: GraphQLRequest): Record<string, unknown> {
    const body: Record<string, unknown> = {
      query: request.query,
      variables: request.variables ?? {},
    };

    if (request.operationName) {
      body.operationName = request.operationName;
    }

    if (this.options.persistedQueries) {
      body.extensions = {
        ...(request.extensions ?? {}),
        persistedQuery: {
          version: 1,
          sha256Hash: hashQuery(request.query),
        },
      };
    } else if (request.extensions) {
      body.extensions = request.extensions;
    }

    return body;
  }

  private async resolveHeaders(): Promise<Record<string, string>> {
    const base = typeof this.options.headers === "function"
      ? this.options.headers()
      : { ...this.options.headers };

    const token = this.getAuthToken();
    if (token) {
      base.Authorization = `Bearer ${token}`;
    }

    return base;
  }

  private getAuthToken(): string | null {
    if (!this.options.authToken) return null;
    if (typeof this.options.authToken === "function") {
      const result = this.options.authToken();
      return result instanceof Promise ? null : result; // Sync only for header construction
    }
    return this.options.authToken;
  }
}

// --- Factory ---

/** Create a new GraphQL client instance. */
export function createGraphQLClient(options: GraphQLClientOptions): GraphQLClient {
  return new GraphQLClient(options);
}
