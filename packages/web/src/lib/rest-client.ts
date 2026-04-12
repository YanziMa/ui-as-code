/**
 * REST Client: Type-safe HTTP client with interceptors, caching,
 * request/response transformation, retry, abort, progress,
 * auth token management, request deduplication, and adapter pattern.
 */

// --- Types ---

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type ContentType = "json" | "form" | "text" | "blob" | "arraybuffer" | "multipart";

export interface RequestConfig {
  /** URL (base + path combined) */
  url?: string;
  /** HTTP method */
  method?: HTTPMethod;
  /** URL params */
  params?: Record<string, string | number | boolean>;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Query string parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Response type expectation */
  responseType?: ContentType;
  /** Timeout in ms */
  timeout?: number;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Cache mode */
  cache?: RequestCache;
  /** Redirect mode */
  redirect?: RequestRedirect;
  /** Custom metadata attached to request */
  meta?: Record<string, unknown>;
  /** Base URL override for this request only */
  baseURL?: string;
  /** Attach upload progress listener */
  onUploadProgress?: (progress: ProgressEvent) => void;
  /** Attach download progress listener */
  onDownloadProgress?: (progress: ProgressEvent) => void;
}

export interface Response<T = unknown> {
  /** Response data (parsed) */
  data: T;
  /** HTTP status code */
  status: number;
  /** Status text */
  statusText: string;
  /** Response headers */
  headers: Record<string, string>;
  /** Original config used */
  config: RequestConfig;
  /** Duration in ms */
  duration: number;
  /** Raw response object */
  raw?: Response;
  /** URL that was called */
  url: string;
}

export interface ErrorResponse {
  /** Error message */
  message: string;
  /** HTTP status code (if available) */
  status?: number;
  /** Status text */
  statusText?: string;
  /** Response data (if available) */
  data?: unknown;
  /** Request config */
  config?: RequestConfig;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Error code classification */
  code: ErrorCode;
}

export enum ErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT = "TIMEOUT",
  ABORTED = "ABORTED",
  HTTP_ERROR = "HTTP_ERROR",
  PARSE_ERROR = "PARSE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  SERVER_ERROR = "SERVER_ERROR",
  CLIENT_ERROR = "CLIENT_ERROR",
}

// --- Interceptor Types ---

export interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

export interface ResponseInterceptor<T = unknown> {
  (response: Response<T>): Response<T> | Promise<Response<T>>;
}

export interface ErrorInterceptor {
  (error: ErrorResponse): ErrorResponse | Promise<ErrorResponse>;
}

// --- Cache Types ---

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  tags?: string[];
}

export interface CacheOptions {
  /** Enable cache? */
  enabled?: boolean;
  /** Time-to-live in ms (default: 5min) */
  ttl?: number;
  /** Cache key generator */
  keyGenerator?: (config: RequestConfig) => string;
  /** Only cache successful responses? */
  cacheSuccessOnly?: boolean;
  /** Tags for cache invalidation */
  tags?: string[];
}

// --- Retry Options ---

export interface RetryOptions {
  /** Max retry attempts */
  retries?: number;
  /** Initial delay in ms */
  delayMs?: number;
  /** Backoff multiplier */
  backoffFactor?: number;
  /** Max delay cap in ms */
  maxDelayMs?: number;
  /** Jitter: add randomness to delay */
  jitter?: boolean;
  /** Condition function — return true to retry on this error */
  shouldRetry?: (error: ErrorResponse, attempt: number) => boolean;
  /** HTTP status codes that trigger retry */
  retryOnStatus?: number[];
}

// --- Auth Token Manager ---

export interface AuthTokenManager {
  getToken(): string | null | Promise<string | null>;
  refreshToken(): Promise<string>;
  isExpired(token: string): boolean;
  setToken(token: string): void;
  clearToken(): void;
}

// --- Core Client ---

export class RestClient {
  private defaults: Required<Omit<RequestConfig, "body" | "signal" | "meta">> & {
    timeout: number;
    credentials: RequestCredentials;
    cache: RequestCache;
    redirect: RequestRedirect;
  };
  private baseHeaders: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private cacheStore: Map<string, CacheEntry> = new Map();
  private pendingRequests: Map<string, Promise<Response>> = new Map();
  private defaultRetry: Required<RetryOptions>;
  private authManager: AuthTokenManager | null = null;

  constructor(options: {
    baseURL?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retry?: RetryOptions;
    authManager?: AuthTokenManager;
  } = {}) {
    this.defaults = {
      method: "GET",
      timeout: options.timeout ?? 30000,
      credentials: "same-origin",
      cache: "default",
      redirect: "follow",
    };

    this.baseHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...options.headers,
    };

    this.defaultRetry = {
      retries: options.retry?.retries ?? 0,
      delayMs: options.retry?.delayMs ?? 1000,
      backoffFactor: options.retry?.backoffFactor ?? 2,
      maxDelayMs: options.retry?.maxDelayMs ?? 30000,
      jitter: options.retry?.jitter ?? true,
      retryOnStatus: options.retry?.retryOnStatus ?? [408, 429, 500, 502, 503, 504],
      shouldRetry: options.retry?.shouldRetry,
    };

    if (options.authManager) {
      this.authManager = options.authManager;
    }
  }

  // --- Convenience Methods ---

  get<T = unknown>(url: string, config?: Omit<RequestConfig, "method" | "body">): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  post<T = unknown>(url: string, body?: unknown, config?: Omit<RequestConfig, "method">): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: "POST", body });
  }

  put<T = unknown>(url: string, body?: unknown, config?: Omit<RequestConfig, "method">): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: "PUT", body });
  }

  patch<T = unknown>(url: string, body?: unknown, config?: Omit<RequestConfig, "method">): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: "PATCH", body });
  }

  delete<T = unknown>(url: string, config?: Omit<RequestConfig, "method" | "body">): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  head<T = unknown>(url: string, config?: Omit<RequestConfig, "method" | "body">): Promise<Response<T>> {
    return this.request<T>({ ...config, url, method: "HEAD" });
  }

  // --- Core Request ---

  async request<T = unknown>(config: RequestConfig): Promise<Response<T>> {
    // Merge with defaults
    const merged: RequestConfig = {
      ...this.defaults,
      ...config,
      headers: { ...this.baseHeaders, ...config.headers },
    };

    // Run request interceptors
    let processed = merged;
    for (const interceptor of this.requestInterceptors) {
      processed = await interceptor(processed);
    }

    // Inject auth token
    if (this.authManager && !processed.headers?.["Authorization"]) {
      const token = await this.authManager.getToken();
      if (token) {
        processed.headers = { ...processed.headers, Authorization: `Bearer ${token}` };
      }
    }

    // Check cache for GET requests
    if (processed.method === "GET") {
      const cached = this.checkCache(processed);
      if (cached) return cached as Response<T>;
    }

    // Deduplication
    const dedupKey = this.buildDedupKey(processed);
    if (dedupKey && this.pendingRequests.has(dedupKey)) {
      return this.pendingRequests.get(dedupKey)! as Promise<Response<T>>;
    }

    // Execute with retry
    const promise = this.executeWithRetry<T>(processed);

    if (dedupKey) {
      this.pendingRequests.set(dedupKey, promise as Promise<Response>);
      promise.finally(() => this.pendingRequests.delete(dedupKey));
    }

    return promise;
  }

  // --- Interceptor Management ---

  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const idx = this.requestInterceptors.indexOf(interceptor);
      if (idx >= 0) this.requestInterceptors.splice(idx, 1);
    };
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const idx = this.responseInterceptors.indexOf(interceptor);
      if (idx >= 0) this.responseInterceptors.splice(idx, 1);
    };
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const idx = this.errorInterceptors.indexOf(interceptor);
      if (idx >= 0) this.errorInterceptors.splice(idx, 1);
    };
  }

  // --- Cache ---

  getFromCache(key: string): CacheEntry | undefined {
    return this.cacheStore.get(key);
  }

  invalidateCache(tags?: string[]): void {
    if (!tags || tags.length === 0) {
      this.cacheStore.clear();
      return;
    }
    for (const [key, entry] of this.cacheStore) {
      if (entry.tags?.some((t) => tags.includes(t))) {
        this.cacheStore.delete(key);
      }
    }
  }

  clearCache(): void {
    this.cacheStore.clear();
  }

  // --- Internal ---

  private async executeWithRetry<T>(config: RequestConfig, attempt = 0): Promise<Response<T>> {
    try {
      const result = await this.doFetch<T>(config);

      // Store in cache
      if (config.method === "GET" && result.status >= 200 && result.status < 300) {
        this.storeInCache(config, result);
      }

      // Run response interceptors
      let processed = result;
      for (const interceptor of this.responseInterceptors) {
        processed = await interceptor(processed);
      }

      return processed;
    } catch (err) {
      const error = this.normalizeError(err, config);

      // Run error interceptors
      let processedError = error;
      for (const interceptor of this.errorInterceptors) {
        processedError = await interceptor(processedError);
      }

      // Retry logic
      if (attempt < this.defaultRetry.retries && this.shouldRetry(processedError)) {
        const delay = this.calculateDelay(attempt);
        await sleep(delay);
        return this.executeWithRetry<T>(config, attempt + 1);
      }

      throw processedError;
    }
  }

  private async doFetch<T>(config: RequestConfig): Promise<Response<T>> {
    const startTime = Date.now();

    // Build full URL
    let url = config.url ?? "";
    if (config.baseURL && !url.startsWith("http")) {
      url = config.baseURL + (url.startsWith("/") ? "" : "/") + url;
    }

    // Append query params
    if (config.query && Object.keys(config.query).length > 0) {
      const qs = Object.entries(config.query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      url += (url.includes("?") ? "&" : "?") + qs;
    }

    // Append URL params
    if (config.params && Object.keys(config.params).length > 0) {
      const ps = Object.entries(config.params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      url += (url.includes("?") ? "&" : "?") + ps;
    }

    // Prepare fetch options
    const init: RequestInit & { duplex?: string } = {
      method: config.method ?? this.defaults.method,
      headers: config.headers ?? {},
      credentials: config.credentials ?? this.defaults.credentials,
      cache: config.cache ?? this.defaults.cache,
      redirect: config.redirect ?? this.defaults.redirect,
      signal: config.signal,
    };

    // Prepare body
    if (config.body !== undefined && config.method !== "GET" && config.method !== "HEAD") {
      if (config.body instanceof FormData) {
        init.body = config.body;
        delete (init.headers as Record<string, string>)["Content-Type"];
      } else if (typeof config.body === "string") {
        init.body = config.body;
      } else {
        init.body = JSON.stringify(config.body);
      }
    }

    // Timeout handling via AbortController
    const timeout = config.timeout ?? this.defaults.timeout;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (timeout > 0 && !config.signal) {
      const controller = new AbortController();
      init.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeout);
    }

    try {
      const response = await fetch(url, init);
      if (timeoutId) clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      // Parse response based on expected type
      let data: T;
      const responseType = config.responseType ?? "json";

      switch (responseType) {
        case "json":
          data = await response.json() as T;
          break;
        case "text":
          data = await response.text() as T;
          break;
        case "blob":
          data = await response.blob() as T;
          break;
        case "arraybuffer":
          data = await response.arrayBuffer() as T;
          break;
        case "form":
          data = await response.formData() as T;
          break;
        default:
          data = await response.json() as T;
      }

      // Build response object
      const result: Response<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: this.parseHeaders(response.headers),
        config,
        duration,
        raw: response,
        url,
      };

      // Throw for non-2xx responses
      if (!response.ok) {
        throw {
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          data,
          config,
          retryable: this.isRetryableStatus(response.status),
          code: this.classifyError(response.status),
        } satisfies ErrorResponse;
      }

      return result;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);
      throw err;
    }
  }

  private normalizeError(err: unknown, config: RequestConfig): ErrorResponse {
    if ((err as ErrorResponse)?.code !== undefined) {
      return err as ErrorResponse;
    }

    if ((err as Error)?.name === "AbortError") {
      return {
        message: "Request aborted",
        retryable: false,
        code: ErrorCode.ABORTED,
        config,
      };
    }

    if (err instanceof TypeError) {
      return {
        message: err.message || "Network error",
        retryable: true,
        code: ErrorCode.NETWORK_ERROR,
        config,
      };
    }

    return {
      message: String(err),
      retryable: false,
      code: ErrorCode.UNKNOWN as ErrorCode,
      config,
    };
  }

  private classifyError(status: number): ErrorCode {
    if (status === 429) return ErrorCode.RATE_LIMITED;
    if (status === 408) return ErrorCode.TIMEOUT;
    if (status >= 500) return ErrorCode.SERVER_ERROR;
    if (status >= 400) return ErrorCode.CLIENT_ERROR;
    return ErrorCode.HTTP_ERROR;
  }

  private isRetryableStatus(status: number): boolean {
    return this.defaultRetry.retryOnStatus.includes(status);
  }

  private shouldRetry(error: ErrorResponse): boolean {
    if (!error.retryable) return false;
    if (this.defaultRetry.shouldRetry) {
      return this.defaultRetry.shouldRetry(error, 0);
    }
    return true;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.defaultRetry.delayMs * Math.pow(this.defaultRetry.backoffFactor, attempt);
    delay = Math.min(delay, this.defaultRetry.maxDelayMs);
    if (this.defaultRetry.jitter) {
      delay *= 0.5 + Math.random() * 0.5;
    }
    return delay;
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private buildDedupKey(config: RequestConfig): string | null {
    // Only deduplicate GET requests without custom signals
    if (config.method !== "GET" || config.signal) return null;
    return `${config.method}:${config.url}:${JSON.stringify(config.query)}`;
  }

  private checkCache(config: RequestConfig): Response<unknown> | null {
    const key = JSON.stringify({ url: config.url, query: config.query });
    const entry = this.cacheStore.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cacheStore.delete(key);
      return null;
    }

    return {
      data: entry.data,
      status: 200,
      statusText: "OK (cached)",
      headers: { "X-Cache": "HIT" },
      config,
      duration: 0,
      url: config.url ?? "",
    };
  }

  private storeInCache(config: RequestConfig, response: Response<unknown>): void {
    const key = JSON.stringify({ url: config.url, query: config.query });
    this.cacheStore.set(key, {
      data: response.data,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000, // Default 5 min
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Factory ---

/** Create a configured REST client instance. */
export function createRestClient(options?: ConstructorParameters<typeof RestClient>[0]): RestClient {
  return new RestClient(options);
}
