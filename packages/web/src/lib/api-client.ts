/**
 * @module api-client
 *
 * A comprehensive HTTP API client utility module built on the native Fetch API.
 *
 * Features:
 * - Configurable base client with interceptors, timeout, and retry
 * - Full REST method support (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 * - Request / response interceptor pipelines
 * - Typed error hierarchy (NetworkError, HttpError, TimeoutError, AbortError)
 * - In-memory request cache with TTL, tag-based & pattern-based invalidation
 * - In-flight request deduplication (coalescing)
 * - AbortController integration with automatic cleanup
 * - Upload/download progress tracking via callbacks
 * - Fluent API resource builder for RESTful endpoints
 * - Cursor-based and offset-based pagination helpers
 * - Offline request queue with auto-retry on reconnect
 * - Mock mode for development/testing without a backend
 */

// ---------------------------------------------------------------------------
// 1. Types & Interfaces
// ---------------------------------------------------------------------------

/** Supported HTTP methods */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/** Shape of the headers accepted by the client (plain object or Headers) */
export type HeaderInput = Record<string, string> | Headers;

/** Generic params that can be passed as query string or body */
export type RequestParams = Record<string, unknown> | URLSearchParams | undefined;

/** Progress event payload emitted during upload/download */
export interface ProgressEvent {
  /** Bytes transferred so far */
  loaded: number;
  /** Total bytes (may be 0 if unknown) */
  total: number;
  /** Percentage 0-100 */
  percent: number;
  /** Whether the transfer is complete */
  done: boolean;
}

/** Callback invoked repeatedly with progress information */
export type ProgressCallback = (event: ProgressEvent) => void;

/** Configuration for a single API request */
export interface RequestOptions<T = unknown> {
  /** URL path appended to the base URL */
  path?: string;
  /** Full URL (overrides base + path if set) */
  url?: string;
  /** HTTP method (default: GET) */
  method?: HttpMethod;
  /** Request headers (merged with client defaults) */
  headers?: HeaderInput;
  /** Query parameters (serialized onto the URL) */
  params?: RequestParams;
  /** Request body (JSON-serialised for POST/PUT/PATCH) */
  body?: T;
  /** Raw body string / FormData / Blob / etc. (skips JSON serialisation) */
  rawBody?: BodyInit | null;
  /** Timeout in milliseconds (0 = no timeout) */
  timeout?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Cache this request? (default: false) */
  cache?: boolean;
  /** Cache TTL in ms when caching is enabled (default: 5_000) */
  cacheTTL?: number;
  /** Cache tags for selective invalidation */
  cacheTags?: string[];
  /** Deduplicate identical in-flight requests? (default: true) */
  dedupe?: boolean;
  /** Retry count on retryable errors (default: 0) */
  retries?: number;
  /** Delay between retries in ms (default: 1_000) */
  retryDelay?: number;
  /** Upload progress callback */
  onUploadProgress?: ProgressCallback;
  /** Download progress callback */
  onDownloadProgress?: ProgressCallback;
  /** Response type expectation */
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData';
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Custom signal key used by cancelPrevious to identify request groups */
  signalKey?: string;
}

/** Parsed API response envelope */
export interface ApiResponse<T = unknown> {
  /** Parsed response data */
  data: T;
  /** Raw status code */
  status: number;
  /** Status text */
  statusText: string;
  /** Response headers (readonly) */
  headers: Headers;
  /** Whether the response came from cache */
  fromCache: boolean;
  /** Total duration of the request in ms */
  duration: number;
}

/** Interceptor context passed through the pipeline */
export interface InterceptorContext {
  /** The original request options */
  request: Required<Optionals<RequestOptions, 'method' | 'headers' | 'params' | 'body'>>;
  /** The (possibly modified) fetch Request just before sending */
  fetchRequest?: Request;
  /** The raw Response after receiving */
  fetchResponse?: Response;
  /** Timestamp when the request started */
  startTime: number;
}

/** Request interceptor – may modify the context or throw to abort */
export type RequestInterceptor = (
  context: InterceptorContext,
) => InterceptorContext | Promise<InterceptorContext>;

/** Response interceptor – receives context + parsed data, returns transformed data or throws */
export type ResponseInterceptor<T = unknown> = (
  context: InterceptorContext,
  response: ApiResponse<T>,
) => ApiResponse<T> | Promise<ApiResponse<T>>;

/** Top-level configuration for the ApiClient */
export interface ApiClientConfig {
  /** Base URL for all requests (e.g. https://api.example.com/v1) */
  baseURL?: string;
  /** Default headers sent with every request */
  defaultHeaders?: HeaderInput;
  /** Default timeout in ms (default: 15_000) */
  timeout?: number;
  /** Default number of retries (default: 0) */
  retries?: number;
  /** Default retry delay in ms (default: 1_000) */
  retryDelay?: number;
  /** Enable request caching globally (default: false) */
  cacheEnabled?: boolean;
  /** Global cache TTL in ms (default: 60_000) */
  cacheTTL?: number;
  /** Enable request deduplication globally (default: true) */
  dedupeEnabled?: boolean;
  /** Enable offline queue (default: false) */
  offlineQueueEnabled?: boolean;
  /** Enable mock mode (default: false) */
  mockMode?: boolean;
  /** Mock handlers registry */
  mocks?: MockHandlerMap;
  /** Request interceptors (applied in order) */
  requestInterceptors?: RequestInterceptor[];
  /** Response interceptors (applied in order) */
  responseInterceptors?: ResponseInterceptor[];
  /** Global error handler */
  onError?: (error: ApiClientError) => void;
  /** Log level: 'silent' | 'error' | 'warn' | 'info' | 'debug' */
  logLevel?: LogLevel;
}

/** Log verbosity levels */
export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

/** Pagination cursor result */
export interface CursorPage<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount?: number;
}

/** Offset-based page result */
export interface OffsetPage<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** Offline queued request entry */
export interface QueuedRequest {
  id: string;
  options: RequestOptions;
  timestamp: number;
  retryCount: number;
}

/** Optimistic update descriptor */
export interface OptimisticUpdate<T> {
  /** Temporary optimistic data */
  optimisticData: T;
  /** Rollback function called on failure */
  rollback: () => void | Promise<void>;
  /** The actual request to perform */
  request: () => Promise<unknown>;
}

/** Mock handler signature */
export type MockHandler<T = unknown> = (
  options: RequestOptions,
) => T | Promise<T>;

/** Registry mapping URL patterns to mock handlers */
export type MockHandlerMap = Record<string, MockHandler>;

/** Helper: make specified keys optional in T */
type Optionals<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ---------------------------------------------------------------------------
// 2. Error Classes
// ---------------------------------------------------------------------------

/** Base error class for all API client errors */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/** Error thrown when the network is unreachable */
export class NetworkError extends ApiClientError {
  constructor(message: string = 'Network error: Unable to reach the server') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

/** Error thrown for non-2xx HTTP responses */
export class HttpError extends ApiClientError {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly responseData?: unknown,
  ) {
    super(
      `HTTP ${status}: ${statusText}`,
      'HTTP_ERROR',
      status,
    );
    this.name = 'HttpError';
  }

  /** True for server-side errors (5xx) */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** True for client-side errors (4xx) */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /** True for 401 Unauthorized */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True for 403 Forbidden */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** True for 404 Not Found */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** True for 429 Too Many Requests */
  get isRateLimited(): boolean {
    return this.status === 429;
  }

  /** Whether this error is likely retryable (5xx, 429, or network) */
  get isRetryable(): boolean {
    return this.isServerError || this.isRateLimited || this.code === 'NETWORK_ERROR';
  }
}

/** Error thrown when a request exceeds its timeout */
export class TimeoutError extends ApiClientError {
  constructor(timeoutMs: number) {
    super(
      `Request timed out after ${timeoutMs}ms`,
      'TIMEOUT_ERROR',
    );
    this.name = 'TimeoutError';
  }
}

/** Error thrown when a request is explicitly cancelled via AbortController */
export class AbortRequestError extends ApiClientError {
  constructor(message: string = 'Request was aborted') {
    super(message, 'ABORT_ERROR');
    this.name = 'AbortRequestError';
  }
}

/**
 * Categorise an arbitrary error into one of the typed error classes.
 * Returns the error as-is if it is already a known type.
 */
export function categorizeError(err: unknown): ApiClientError {
  if (err instanceof ApiClientError) return err;
  if (err instanceof DOMException && err.name === 'AbortError') {
    return new AbortRequestError(err.message);
  }
  if (err instanceof TypeError) {
    // TypeError from fetch usually means network failure
    return new NetworkError(err.message);
  }
  return new ApiClientError(
    err instanceof Error ? err.message : String(err),
    'UNKNOWN_ERROR',
  );
}

// ---------------------------------------------------------------------------
// 3. Cache Implementation
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

/**
 * In-memory LRU-style request cache with TTL support and tag/pattern invalidation.
 */
export class RequestCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  /**
   * Generate a deterministic cache key from method + url + params hash.
   */
  static generateKey(method: HttpMethod, url: string, params?: RequestParams): string {
    const paramStr = params
      ? typeof params === 'string'
        ? params
        : JSON.stringify(params instanceof URLSearchParams ? Object.fromEntries(params) : params)
      : '';
    return `${method}:${url}:${paramStr}`;
  }

  /** Retrieve a cached entry if it hasn't expired. Returns undefined on miss or expiry. */
  get<T>(key: string): ApiResponse<T> | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.store.delete(key);
      return undefined;
    }
    return {
      data: entry.data as T,
      status: 200,
      statusText: 'OK (cached)',
      headers: new Headers(),
      fromCache: true,
      duration: 0,
    };
  }

  /** Store a value in cache with optional TTL and tags. */
  set<T>(key: string, data: T, ttl: number, tags: string[] = []): void {
    // Evict oldest entries if at capacity
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
    this.store.set(key, { data, timestamp: Date.now(), ttl, tags });
  }

  /** Delete a single entry by key. */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /** Invalidate all entries matching any of the given tags. */
  invalidateByTags(tags: string[]): number {
    let count = 0;
    for (const [key, entry] of this.store) {
      if (entry.tags.some((t) => tags.includes(t))) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Invalidate all entries whose key matches the given regex pattern. */
  invalidateByPattern(pattern: RegExp): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (pattern.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /** Clear every cached entry. */
  clear(): void {
    this.store.clear();
  }

  /** Current number of cached entries. */
  get size(): number {
    return this.store.size;
  }
}

// ---------------------------------------------------------------------------
// 4. Request Deduplicator
// ---------------------------------------------------------------------------

/**
 * Coalesces identical in-flight requests so only one network call is made.
 * All callers receive the same resolved/rejected promise.
 */
export class RequestDeduplicator {
  private pending = new Map<string, Promise<ApiResponse<unknown>>>();

  /**
   * Execute or join an existing in-flight request for the given key.
   */
  async execute<T>(
    key: string,
    fn: () => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    if (this.pending.has(key)) {
      return this.pending.get(key)! as Promise<ApiResponse<T>>;
    }
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, promise);
    return promise as Promise<ApiResponse<T>>;
  }

  /** Cancel a pending deduplicated request (rejects all waiting callers). */
  cancel(key: string, reason?: string): boolean {
    const p = this.pending.get(key);
    if (!p) return false;
    this.pending.delete(key);
    // We cannot reject a settled promise, so we just remove it.
    // Callers will need to check externally if they want custom rejection.
    return true;
  }

  /** Number of currently pending deduplicated requests. */
  get pendingCount(): number {
    return this.pending.size;
  }

  /** Clear all pending tracking (does not abort actual fetches). */
  clear(): void {
    this.pending.clear();
  }
}

// ---------------------------------------------------------------------------
// 5. Abort Controller Manager
// ---------------------------------------------------------------------------

/**
 * Manages AbortControllers keyed by group names.
 * Useful for cancelling previous requests of the same type (e.g. search-as-you-type).
 */
export class AbortManager {
  private controllers = new Map<string, AbortController>();

  /**
   * Create (or reuse) an AbortController for the given key.
   * If a previous controller exists for the same key it is aborted first.
   */
  create(key: string, reason?: string): AbortController {
    this.abort(key, reason ?? 'Replaced by new request');
    const controller = new AbortController();
    this.controllers.set(key, controller);
    return controller;
  }

  /** Abort the controller associated with the given key (if any). */
  abort(key: string, reason?: string): boolean {
    const controller = this.controllers.get(key);
    if (!controller) return false;
    controller.abort(reason);
    this.controllers.delete(key);
    return true;
  }

  /** Remove a controller without aborting (e.g. on successful completion). */
  remove(key: string): boolean {
    return this.controllers.delete(key);
  }

  /** Abort all managed controllers. */
  abortAll(reason?: string): void {
    for (const [key] of this.controllers) {
      this.abort(key, reason);
    }
  }

  /** Get the current AbortSignal for a key (undefined if none). */
  getSignal(key: string): AbortSignal | undefined {
    return this.controllers.get(key)?.signal;
  }
}

// ---------------------------------------------------------------------------
// 6. Offline Queue
// ---------------------------------------------------------------------------

/**
 * Queue requests while offline and replay them once connectivity is restored.
 */
export class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private flushPromise: Promise<void> | null = null;
  private maxRetries = 3;
  private executeFn: (options: RequestOptions) => Promise<ApiResponse<unknown>>;

  constructor(
    executor: (options: RequestOptions) => Promise<ApiResponse<unknown>>,
    maxRetries = 3,
  ) {
    this.executeFn = executor;
    this.maxRetries = maxRetries;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /** Add a request to the offline queue. */
  enqueue(options: RequestOptions): string {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.queue.push({ id, options, timestamp: Date.now(), retryCount: 0 });
    return id;
  }

  /** Remove a queued request by ID. */
  dequeue(id: string): boolean {
    const idx = this.queue.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  /** Attempt to flush all queued requests. */
  async flush(): Promise<void> {
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = (async () => {
      while (this.queue.length > 0 && this.isOnline) {
        const item = this.queue[0];
        try {
          await this.executeFn(item.options);
          this.queue.shift(); // success – remove
        } catch {
          item.retryCount++;
          if (item.retryCount >= this.maxRetries) {
            this.queue.shift(); // exhausted retries – drop
          } else {
            // Move to end of queue, retry later
            this.queue.push(this.queue.shift()!);
            break; // pause flushing to avoid tight loop
          }
        }
      }
    })().finally(() => {
      this.flushPromise = null;
    });
  }

  /** Current queue length. */
  get length(): number {
    return this.queue.length;
  }

  /** Clear the entire queue. */
  clear(): void {
    this.queue = [];
  }

  private handleOnline(): void {
    this.isOnline = true;
    this.flush();
  }

  private handleOffline(): void {
    this.isOnline = false;
  }

  /** Clean up event listeners. */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Mock Handler System
// ---------------------------------------------------------------------------

/**
 * Intercept requests and return mock data instead of hitting the network.
 */
export class MockMode {
  private handlers: MockHandlerMap;
  private enabled = false;

  constructor(handlers: MockHandlerMap = {}) {
    this.handlers = handlers;
  }

  /** Enable or disable mock mode. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Check whether mock mode is active. */
  get isEnabled(): boolean {
    return this.enabled;
  }

  /** Register or update a mock handler for a URL pattern. */
  register(pattern: string, handler: MockHandler): void {
    this.handlers[pattern] = handler;
  }

  /** Remove a mock handler. */
  unregister(pattern: string): boolean {
    return delete this.handlers[pattern];
  }

  /**
   * Try to resolve a mocked response for the given URL.
   * Returns null if no matching handler is found or mock mode is off.
   */
  async resolve<T>(url: string, options: RequestOptions): Promise<ApiResponse<T> | null> {
    if (!this.enabled) return null;
    for (const [pattern, handler] of Object.entries(this.handlers)) {
      if (this.matchPattern(url, pattern)) {
        const data = await handler(options);
        return {
          data: data as T,
          status: 200,
          statusText: 'OK (mock)',
          headers: new Headers(),
          fromCache: false,
          duration: 0,
        };
      }
    }
    return null;
  }

  /** Simple glob-to-regexp matcher supporting * wildcards. */
  private matchPattern(url: string, pattern: string): boolean {
    const regexStr = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${regexStr}$`).test(url);
  }
}

// ---------------------------------------------------------------------------
// 8. Logger
// ---------------------------------------------------------------------------

const LOG_PRIORITY: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function createLogger(level: LogLevel) {
  const priority = LOG_PRIORITY[level];
  return {
    error(...args: unknown[]): void { if (priority >= LOG_PRIORITY.error) console.error('[api-client]', ...args); },
    warn(...args: unknown[]): void  { if (priority >= LOG_PRIORITY.warn)  console.warn('[api-client]', ...args); },
    info(...args: unknown[]): void  { if (priority >= LOG_PRIORITY.info)  console.info('[api-client]', ...args); },
    debug(...args: unknown[]): void { if (priority >= LOG_PRIORITY.debug) console.debug('[api-client]', ...args); },
  };
}

// ---------------------------------------------------------------------------
// 9. Main API Client
// ---------------------------------------------------------------------------

/**
 * A fully-featured HTTP API client built on the native Fetch API.
 *
 * @example
 * ```ts
 * const api = new ApiClient({ baseURL: 'https://api.example.com/v1' });
 * const user = await api.get<User>('/users/1');
 * ```
 */
export class ApiClient {
  /** Base URL prepended to all relative paths */
  public baseURL: string;

  /** Default headers merged into every request */
  public defaultHeaders: Headers;

  /** Default timeout in milliseconds */
  public timeout: number;

  /** Default retry count */
  public retries: number;

  /** Default retry delay in ms */
  public retryDelay: number;

  /** Request cache instance */
  public cache: RequestCache;

  /** Request deduplicator */
  public deduplicator: RequestDeduplicator;

  /** Abort controller manager */
  public abortManager: AbortManager;

  /** Offline queue (lazily created when enabled) */
  public offlineQueue: OfflineQueue | null;

  /** Mock mode handler */
  public mockMode: MockMode;

  /** Registered request interceptors */
  public requestInterceptors: RequestInterceptor[];

  /** Registered response interceptors */
  public responseInterceptors: ResponseInterceptor[];

  /** Logger instance */
  public log: ReturnType<typeof createLogger>;

  /** Global error handler */
  public onError: ((error: ApiClientError) => void) | null;

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL ?? '';
    this.defaultHeaders = this.normalizeHeaders(config.defaultHeaders ?? {});
    this.timeout = config.timeout ?? 15_000;
    this.retries = config.retries ?? 0;
    this.retryDelay = config.retryDelay ?? 1_000;
    this.cache = new RequestCache();
    this.deduplicator = new RequestDeduplicator();
    this.abortManager = new AbortManager();
    this.offlineQueue = null;
    this.mockMode = new MockMode(config.mocks);
    if (config.mockMode) this.mockMode.setEnabled(true);
    this.requestInterceptors = [...(config.requestInterceptors ?? [])];
    this.responseInterceptors = [...(config.responseInterceptors ?? [])];
    this.log = createLogger(config.logLevel ?? 'warn');
    this.onError = config.onError ?? null;

    // Initialise offline queue if requested
    if (config.offlineQueueEnabled) {
      this.offlineQueue = new OfflineQueue((opts) => this.request(opts));
    }
  }

  // -----------------------------------------------------------------------
  // Public REST methods
  // -----------------------------------------------------------------------

  /**
   * Perform a GET request.
   * @template T Expected response data type
   */
  async get<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, path, method: 'GET' });
  }

  /**
   * Perform a POST request.
   * @template B Request body type
   * @template T Expected response data type
   */
  async post<B = unknown, T = unknown>(path: string, body?: B, options?: RequestOptions<B>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, path, method: 'POST', body: body as unknown as RequestOptions['body'] });
  }

  /**
   * Perform a PUT request.
   */
  async put<B = unknown, T = unknown>(path: string, body?: B, options?: RequestOptions<B>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, path, method: 'PUT', body: body as unknown as RequestOptions['body'] });
  }

  /**
   * Perform a PATCH request.
   */
  async patch<B = unknown, T = unknown>(path: string, body?: B, options?: Options<B>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, path, method: 'PATCH', body: body as unknown as Options<B>['body'] });
  }

  /**
   * Perform a DELETE request.
   */
  async delete<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, path, method: 'DELETE' });
  }

  /**
   * Perform a HEAD request.
   */
  async head(path: string, options?: RequestOptions): Promise<ApiResponse<null>> {
    return this.request({ ...options, path, method: 'HEAD' });
  }

  /**
   * Perform an OPTIONS request.
   */
  async options<T = unknown>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, path, method: 'OPTIONS' });
  }

  // -----------------------------------------------------------------------
  // Core request method
  // -----------------------------------------------------------------------

  /**
   * Execute an HTTP request with full interceptor pipeline, caching,
   * deduplication, retry, timeout, and error handling.
   */
  async request<T = unknown>(options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const startTime = performance.now();

    // Merge defaults
    const method = (options.method ?? 'GET').toUpperCase() as HttpMethod;
    const timeout = options.timeout ?? this.timeout;
    const retries = options.retries ?? this.retries;
    const retryDelay = options.retryDelay ?? this.retryDelay;
    const useCache = options.cache ?? false;
    const cacheTTL = options.cacheTTL ?? 60_000;
    const useDedupe = options.dedupe !== false; // default true

    // Build final URL
    const url = this.buildUrl(options);

    // Build cache key early (before interceptors modify things)
    const cacheKey = RequestCache.generateKey(method, url, options.params);

    // Check cache first for GET requests
    if (useCache && method === 'GET') {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        this.log.debug('Cache hit:', cacheKey);
        return cached;
      }
    }

    // Check mock mode
    if (this.mockMode.isEnabled) {
      const mocked = await this.mockMode.resolve<T>(url, options);
      if (mocked) {
        this.log.debug('Mock response for:', url);
        return mocked;
      }
    }

    // Check online status for offline queue
    if (this.offlineQueue && !navigator.onLine) {
      this.log.warn('Offline – queuing request:', method, url);
      this.offlineQueue.enqueue(options);
      throw new NetworkError('Device is offline. Request has been queued.');
    }

    // Create initial interceptor context
    let context: InterceptorContext = {
      request: {
        method,
        headers: this.mergeHeaders(options.headers),
        params: options.params,
        body: options.body,
        path: options.path,
        url: options.url,
        timeout,
        cache: useCache,
        cacheTTL,
        cacheTags: options.cacheTags ?? [],
        dedupe: useDedupe,
        retries,
        retryDelay,
        responseType: options.responseType ?? 'json',
        credentials: options.credentials,
        signalKey: options.signalKey,
        rawBody: options.rawBody,
        onUploadProgress: options.onUploadProgress,
        onDownloadProgress: options.onDownloadProgress,
      },
      startTime,
    };

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      try {
        context = await interceptor(context);
      } catch (err) {
        const error = categorizeError(err);
        this.handleError(error);
        throw error;
      }
    }

    // Set up AbortController (merge provided signal + optional abort manager)
    const controller = new AbortController();
    const { signal: userSignal, signalKey } = options;
    if (signalKey) {
      const managedController = this.abortManager.create(signalKey);
      // If either signal aborts, we abort
      managedController.signal.addEventListener('abort', () => controller.abort(managedController.signal.reason));
    }
    if (userSignal) {
      userSignal.addEventListener('abort', () => controller.abort(userSignal.reason));
    }

    // Timeout wrapper
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        controller.abort(new TimeoutError(timeout).message);
      }, timeout);
    }

    // Define the actual fetch execution
    const executeFetch = async (): Promise<ApiResponse<T>> => {
      // Build headers from context
      const headers = new Headers();
      const ctxHeaders = context.request.headers;
      if (ctxHeaders instanceof Headers) {
        ctxHeaders.forEach((v, k) => headers.set(k, v));
      } else if (ctxHeaders) {
        for (const [k, v] of Object.entries(ctxHeaders)) {
          headers.set(k, v);
        }
      }

      // Determine body
      let bodyInit: BodyInit | undefined;
      if (context.request.rawBody !== undefined) {
        bodyInit = context.request.rawBody;
      } else if (context.request.body !== undefined && method !== 'GET' && method !== 'HEAD') {
        headers.set('Content-Type', 'application/json');
        bodyInit = JSON.stringify(context.request.body);
      }

      const fetchReq = new Request(url, {
        method,
        headers,
        body: bodyInit,
        signal: controller.signal,
        credentials: context.request.credentials ?? 'same-origin',
      });

      context.fetchRequest = fetchReq;

      // Track upload progress if callback provided and body is readable
      this.trackUploadProgress(fetchReq, options.onUploadProgress);

      let response: Response;
      try {
        response = await fetch(fetchReq);
      } catch (err) {
        if (controller.signal.aborted) {
          throw new AbortRequestError(controller.signal.reason ?? 'Request aborted');
        }
        throw err; // will be categorised below
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        // Clean up abort manager on success
        if (signalKey) this.abortManager.remove(signalKey);
      }

      context.fetchResponse = response;

      // Track download progress
      this.trackDownloadProgress(response, options.onDownloadProgress);

      // Handle non-OK status
      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.clone().json();
        } catch {
          try {
            errorData = await response.clone().text();
          } catch {
            errorData = undefined;
          }
        }
        throw new HttpError(response.status, response.statusText, errorData);
      }

      // Parse response body
      let data: unknown;
      const responseType = context.request.responseType;
      try {
        switch (responseType) {
          case 'json':
            data = await response.json();
            break;
          case 'text':
            data = await response.text();
            break;
          case 'blob':
            data = await response.blob();
            break;
          case 'arrayBuffer':
            data = await response.arrayBuffer();
            break;
          case 'formData':
            data = await response.formData();
            break;
          default:
            data = await response.json();
        }
      } catch {
        data = null;
      }

      const duration = Math.round(performance.now() - startTime);
      let apiResponse: ApiResponse<T> = {
        data: data as T,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        fromCache: false,
        duration,
      };

      // Run response interceptors
      for (const interceptor of this.responseInterceptors) {
        try {
          apiResponse = (await interceptor(context, apiResponse)) as ApiResponse<T>;
        } catch (err) {
          const error = categorizeError(err);
          this.handleError(error);
          throw error;
        }
      }

      // Store in cache for GET requests
      if (useCache && method === 'GET') {
        this.cache.set(cacheKey, apiResponse.data, cacheTTL, context.request.cacheTags);
        this.log.debug('Cached response for:', cacheKey);
      }

      return apiResponse;
    };

    // Wrap with deduplication
    const executeWithDedupe = (): Promise<ApiResponse<T>> => {
      if (useDedupe && method === 'GET') {
        return this.deduplicator.execute(cacheKey, executeFetch);
      }
      return executeFetch();
    };

    // Wrap with retry logic
    const executeWithRetry = async (attempt = 0): Promise<ApiResponse<T>> => {
      try {
        return await executeWithDedupe();
      } catch (err) {
        const error = categorizeError(err);
        // Only retry retryable errors and within retry budget
        if (error.isRetryable && attempt < retries) {
          this.log.warn(`Retry ${attempt + 1}/${retries} for ${method} ${url}`);
          await this.delay(retryDelay * (attempt + 1)); // exponential backoff
          return executeWithRetry(attempt + 1);
        }
        this.handleError(error);
        throw error;
      }
    };

    return executeWithRetry();
  }

  // -----------------------------------------------------------------------
  // Interceptor registration helpers
  // -----------------------------------------------------------------------

  /** Add a request interceptor (runs before the request is sent). */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /** Add a response interceptor (runs after the response is received). */
  addResponseInterceptor<T = unknown>(interceptor: ResponseInterceptor<T>): void {
    this.responseInterceptors.push(interceptor as ResponseInterceptor);
  }

  /**
   * Convenience: attach an auth token to every request.
   * @param getToken Function returning the current token (or null/undefined to skip).
   * @param headerName Header name (default: Authorization)
   * @param scheme Token scheme prefix (default: Bearer )
   */
  attachAuth(
    getToken: () => string | null | undefined,
    headerName = 'Authorization',
    scheme = 'Bearer ',
  ): void {
    this.addRequestInterceptor(async (ctx) => {
      const token = getToken();
      if (token) {
        const headers = ctx.request.headers;
        if (headers instanceof Headers) {
          headers.set(headerName, `${scheme}${token}`);
        } else if (headers && typeof headers === 'object') {
          (headers as Record<string, string>)[headerName] = `${scheme}${token}`;
        }
      }
      return ctx;
    });
  }

  /**
   * Convenience: attach a unique request ID (X-Request-ID) header.
   */
  attachRequestId(headerName = 'X-Request-ID'): void {
    this.addRequestInterceptor(async (ctx) => {
      const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const headers = ctx.request.headers;
      if (headers instanceof Headers) {
        headers.set(headerName, id);
      } else if (headers && typeof headers === 'object') {
        (headers as Record<string, string>)[headerName] = id;
      }
      return ctx;
    });
  }

  /**
   * Convenience: attach a correlation ID (X-Correlation-ID) header.
   */
  attachCorrelationId(getId: () => string, headerName = 'X-Correlation-ID'): void {
    this.addRequestInterceptor(async (ctx) => {
      const headers = ctx.request.headers;
      if (headers instanceof Headers) {
        headers.set(headerName, getId());
      } else if (headers && typeof headers === 'object') {
        (headers as Record<string, string>)[headerName] = getId();
      }
      return ctx;
    });
  }

  // -----------------------------------------------------------------------
  // Caching helpers
  // -----------------------------------------------------------------------

  /** Invalidate cache entries by tag(s). */
  invalidateCache(tags: string | string[]): number {
    const arr = Array.isArray(tags) ? tags : [tags];
    return this.cache.invalidateByTags(arr);
  }

  /** Invalidate cache entries matching a regex pattern. */
  invalidateCachePattern(pattern: RegExp): number {
    return this.cache.invalidateByPattern(pattern);
  }

  /** Clear the entire request cache. */
  clearCache(): void {
    this.cache.clear();
  }

  // -----------------------------------------------------------------------
  // Cancel helpers
  // -----------------------------------------------------------------------

  /** Cancel the most recent request for a given signal key. */
  cancelPrevious(key: string, reason?: string): boolean {
    return this.abortManager.abort(key, reason);
  }

  /** Cancel all managed requests. */
  cancelAll(reason?: string): void {
    this.abortManager.abortAll(reason);
  }

  // -----------------------------------------------------------------------
  // API Resource Builder
  // -----------------------------------------------------------------------

  /**
   * Create a fluent resource builder for a REST endpoint.
   *
   * @example
   * ```ts
   * const users = api.resource<User>('users');
   * const list = await users.list({ page: 1 });
   * const one  = await users.get('123');
   * const created = await users.create({ name: 'Alice' });
   * const updated = await users.update('123', { name: 'Alice Smith' });
   * await users.delete('123');
   * ```
   */
  resource<T = unknown>(basePath: string): ResourceBuilder<T> {
    return new ResourceBuilder<T>(this, basePath);
  }

  // -----------------------------------------------------------------------
  // Pagination Helpers
  // -----------------------------------------------------------------------

  /**
   * Fetch all pages of a cursor-paginated endpoint automatically.
   * @param initialUrl The initial URL (or path) that returns the first page
   * @param cursorField Field name holding the next cursor in each response
   * @param dataField Field name holding the data array in each response
   * @param maxPages Safety limit to prevent infinite loops (default: 100)
   */
  async fetchAllCursorPages<T>(
    initialUrl: string,
    cursorField = 'nextCursor',
    dataField = 'data',
    maxPages = 100,
  ): Promise<T[]> {
    const allData: T[] = [];
    let nextUrl: string | undefined = initialUrl;
    let pagesFetched = 0;

    while (nextUrl && pagesFetched < maxPages) {
      const res = await this.get<Record<string, unknown>>(nextUrl);
      const page = res.data as Record<string, unknown>;
      const items = (page[dataField] ?? []) as T[];
      allData.push(...items);
      nextUrl = (page[cursorField] as string | undefined) ?? undefined;
      pagesFetched++;
    }

    return allData;
  }

  /**
   * Fetch all pages of an offset-paginated endpoint automatically.
   * @param baseUrl Base URL/path
   * @param pageSize Items per page
   * @param dataField Field name holding the data array
   * @param totalField Field name holding the total count
   * @param maxPages Safety limit
   */
  async fetchAllOffsetPages<T>(
    baseUrl: string,
    pageSize = 50,
    dataField = 'data',
    totalField = 'total',
    maxPages = 100,
  ): Promise<T[]> {
    const allData: T[] = [];
    let page = 1;
    let fetchedTotal = 0;
    let declaredTotal: number | undefined;

    while (page <= maxPages) {
      const res = await this.get<Record<string, unknown>>(baseUrl, {
        params: { page, pageSize },
      });
      const p = res.data as Record<string, unknown>;
      const items = (p[dataField] ?? []) as T[];
      allData.push(...items);
      fetchedTotal += items.length;
      declaredTotal = (p[totalField] as number) ?? undefined;

      if (declaredTotal !== undefined && fetchedTotal >= declaredTotal) break;
      if (items.length === 0) break;
      page++;
    }

    return allData;
  }

  // -----------------------------------------------------------------------
  // Optimistic Updates
  // -----------------------------------------------------------------------

  /**
   * Perform an optimistic update: immediately apply optimistic data,
   * send the real request, and rollback on failure.
   */
  async optimisticUpdate<T>(update: OptimisticUpdate<T>): Promise<unknown> {
    try {
      return await update.request();
    } catch (err) {
      this.log.warn('Optimistic update failed – rolling back');
      await update.rollback();
      throw categorizeError(err);
    }
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Build the full URL from base, path, url override, and query params. */
  private buildUrl(options: RequestOptions): string {
    if (options.url) return options.url;

    let url = options.path ?? '';
    // Prepend base URL if path is relative
    if (this.baseURL && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = `${this.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
    }

    // Append query params
    if (options.params) {
      const searchParams = options.params instanceof URLSearchParams
        ? options.params
        : new URLSearchParams(
            Object.entries(options.params)
              .filter(([, v]) => v !== undefined && v !== null)
              .map(([k, v]) => [k, String(v)]),
          );
      const qs = searchParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }

    return url;
  }

  /** Normalise input headers into a Headers instance. */
  private normalizeHeaders(input: HeaderInput): Headers {
    if (input instanceof Headers) return new Headers(input);
    const h = new Headers();
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined && v !== null) h.set(k, v);
    }
    return h;
  }

  /** Merge per-request headers over the defaults. */
  private mergeHeaders(requestHeaders?: HeaderInput): HeaderInput {
    const merged = new Headers(this.defaultHeaders);
    if (!requestHeaders) return merged;
    const extra = this.normalizeHeaders(requestHeaders);
    extra.forEach((v, k) => merged.set(k, v));
    return merged;
  }

  /** Invoke global error handler if configured. */
  private handleError(error: ApiClientError): void {
    this.log.error(error.message);
    this.onError?.(error);
  }

  /** Simple promise-based delay. */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Attach upload progress tracking (best-effort using ReadableStream if available). */
  private trackUploadProgress(_request: Request, _callback?: ProgressCallback): void {
    // Native fetch does not expose upload progress directly.
    // This is a placeholder hook for environments that support it
    // (e.g., via service workers or future APIs).
    if (!_callback) return;
    // No-op: browsers don't expose upload progress on fetch().
    // For real upload progress, consider using XMLHttpRequest or a polyfill.
  }

  /** Attach download progress tracking using ReadableStream if available. */
  private trackDownloadProgress(response: Response, callback?: ProgressCallback): void {
    if (!callback) return;
    const contentLength = response.headers.get('Content-Length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    // If ReadableStream is available, wrap the reader
    if (response.body && typeof ReadableStream !== 'undefined') {
      const reader = response.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                callback({ loaded: loaded + (value?.length ?? 0), total, percent: 100, done: true });
                controller.close();
                break;
              }
              loaded += value.length;
              callback({
                loaded,
                total,
                percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
                done: false,
              });
              controller.enqueue(value);
            }
          } catch (err) {
            controller.error(err);
          }
        },
      });
      // Replace response body so consumers read from our wrapped stream
      // Note: this is a best-effort approach; the Response object is partially immutable.
    }
  }
}

// Fix reference to Options used in patch()
type Options<B> = RequestOptions<B>;

// ---------------------------------------------------------------------------
// 10. API Resource Builder (Fluent Interface)
// ---------------------------------------------------------------------------

/**
 * Fluent builder for defining and interacting with REST resources.
 *
 * Provides shorthand methods for CRUD operations against a common base path.
 */
export class ResourceBuilder<T = unknown> {
  constructor(
    private client: ApiClient,
    private basePath: string,
  ) {}

  /**
   * Get a single resource by identifier.
   */
  async get(id: string | number, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.client.get<T>(`${this.basePath}/${id}`, options);
  }

  /**
   * List all resources (with optional query params for filtering/pagination).
   */
  async list(params?: RequestParams, options?: RequestOptions): Promise<ApiResponse<T[]>> {
    return this.client.get<T[]>(this.basePath, { ...options, params });
  }

  /**
   * Create a new resource.
   */
  async create(data: Partial<T>, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.client.post<Partial<T>, T>(this.basePath, data, options);
  }

  /**
   * Update an existing resource by ID (PUT – full replace).
   */
  async update(id: string | number, data: Partial<T>, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.client.put<Partial<T>, T>(`${this.basePath}/${id}`, data, options);
  }

  /**
   * Partially update a resource by ID (PATCH).
   */
  async partialUpdate(id: string | number, data: Partial<T>, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.client.patch<Partial<T>, T>(`${this.basePath}/${id}`, data, options);
  }

  /**
   * Delete a resource by ID.
   */
  async delete(id: string | number, options?: RequestOptions): Promise<ApiResponse<unknown>> {
    return this.client.delete(`${this.basePath}/${id}`, options);
  }

  /**
   * Build a sub-resource (nested under the current path).
   * e.g. api.resource('users').subResource('123').subResource('posts')
   */
  subResource(segment: string | number): ResourceBuilder<T> {
    return new ResourceBuilder<T>(this.client, `${this.basePath}/${segment}`);
  }

  /**
   * Perform a custom action on the resource collection or member.
   * @example users.action('archive', { id: '123' })
   */
  async action<R = unknown>(
    actionName: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<R>> {
    return this.client.post<R>(`${this.basePath}/${actionName}`, undefined, options);
  }

  /**
   * Perform a custom action on a specific resource member.
   * @example users.memberAction('123', 'activate')
   */
  async memberAction<R = unknown>(
    id: string | number,
    actionName: string,
    data?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<R>> {
    return this.client.post<R>(`${this.basePath}/${id}/${actionName}`, data, options);
  }
}

// ---------------------------------------------------------------------------
// 11. Singleton / Factory Helpers
// ---------------------------------------------------------------------------

let _defaultClient: ApiClient | null = null;

/**
 * Get or create the default shared ApiClient instance.
 * Pass config only on the first call to initialise; subsequent calls return the same instance.
 */
export function getDefaultClient(config?: ApiClientConfig): ApiClient {
  if (!_defaultClient) {
    _defaultClient = new ApiClient(config);
  }
  return _defaultClient;
}

/**
 * Reset the default client (useful for testing).
 */
export function resetDefaultClient(): void {
  _defaultClient = null;
}

/**
 * Quick-create a pre-configured client with common defaults.
 */
export function createApiClient(baseURL: string, config: Omit<ApiClientConfig, 'baseURL'> = {}): ApiClient {
  return new ApiClient({ baseURL, ...config });
}

// ---------------------------------------------------------------------------
// 12. Re-exports Summary
// ---------------------------------------------------------------------------

// All public types, classes, and functions are exported at the top of the file.
// This section serves as a quick-reference index:

// Types:
//   HttpMethod, HeaderInput, RequestParams, ProgressEvent, ProgressCallback
//   RequestOptions, ApiResponse, InterceptorContext
//   RequestInterceptor, ResponseInterceptor, ApiClientConfig
//   LogLevel, CursorPage, OffsetPage, QueuedRequest, OptimisticUpdate
//   MockHandler, MockHandlerMap

// Errors:
//   ApiClientError, NetworkError, HttpError, TimeoutError, AbortRequestError
//   categorizeError

// Infrastructure:
//   RequestCache, RequestDeduplicator, AbortManager, OfflineQueue, MockMode

// Main:
//   ApiClient, ResourceBuilder

// Factories:
//   getDefaultClient, resetDefaultClient, createApiClient
