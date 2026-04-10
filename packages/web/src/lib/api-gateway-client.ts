/**
 * API Gateway Client: Smart HTTP client with caching, retry, circuit breaker
 * integration, request deduplication, version negotiation, request/response
 * interceptors, batch requests, request queuing, timeout handling,
 * auth token management, and comprehensive observability.
 */

// --- Types ---

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface ApiRequestConfig {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, string>; // query params
  body?: unknown;
  timeout?: number; // ms
  cache?: boolean | CacheOptions;
  retry?: boolean | RetryOptions;
  dedupeKey?: string; // Deduplicate identical in-flight requests
  priority?: number; // For request queuing (higher = first)
  signal?: AbortSignal;
  abortController?: AbortController;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
  credentials?: RequestCredentials;
  meta?: Record<string, string>; // Pass-through metadata
  /** API version header value */
  apiVersion?: string;
  /** Expected content types to accept */
  accept?: string;
  /** Tag for metrics grouping */
  tag?: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  data: T;
  url: string;
  duration: number; // ms
  fromCache: boolean;
  retried: boolean;
  retryCount: number;
  cachedAt?: number;
  requestMeta?: Record<string, string>;
}

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  url: string;
  code?: string;
  data?: unknown;
  isTimeout: boolean;
  isAbort: boolean;
  isNetworkError: boolean;
  retryable: boolean;
}

export interface CacheOptions {
  ttl: number; // ms
  staleWhileRevalidate?: number; // Serve stale while revalidating
  key?: string; // Custom cache key
  conditions?: { methods?: HttpMethod[]; statuses?: number[] }; // Only cache matching
}

export interface RetryOptions {
  maxRetries?: number; // default: 3
  baseDelay?: number; // default: 1000ms
  maxDelay?: number; // default: 30000ms
  backoffFactor?: number; // default: 2
  retryableStatuses?: number[]; // default: [408, 429, 500, 502, 503, 504]
  retryOnNetworkError?: boolean; // default: true
  jitter?: boolean; // Add random jitter (default: true)
}

export interface InterceptorContext {
  request: ApiRequestConfig;
  response?: ApiResponse;
  error?: ApiError;
}

export type RequestInterceptor = (config: ApiRequestConfig) => ApiRequestConfig | Promise<ApiRequestConfig>;
export type ResponseInterceptor<T = unknown>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>;
export type ErrorInterceptor = (error: ApiError) => ApiError | Promise<ApiError>;
export type FinallyInterceptor = (context: InterceptorContext) => void | Promise<void>;

export interface ClientConfig {
  /** Base URL for all requests */
  baseUrl?: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Default timeout in ms (default: 15000) */
  timeout?: number;
  /** Auth token getter */
  getAuthToken?: () => string | Promise<string>;
  /** Auth token setter (called on 401) */
  onAuthError?: () => Promise<string | null>;
  /** Default cache options */
  cacheDefaults?: CacheOptions;
  /** Default retry options */
  retryDefaults?: RetryOptions;
  /** Enable request deduplication (default: true) */
  enableDedupe?: boolean;
  /** Max concurrent requests (default: 10) */
  maxConcurrent?: number;
  /** Request interceptors */
  requestInterceptors?: RequestInterceptor[];
  /** Response interceptors */
  responseInterceptors?: ResponseInterceptor[];
  /** Error interceptors */
  errorInterceptors?: ErrorInterceptor[];
  /** Finally interceptors (always run) */
  finallyInterceptors?: FinallyInterceptor[];
  /** Called before every request */
  onRequest?: (config: ApiRequestConfig) => void;
  /** Called after every response */
  onResponse?: (response: ApiResponse) => void;
  /** Called on error */
  onError?: (error: ApiError) => void;
  /** Circuit breaker instance (optional) */
  circuitBreaker?: { execute<T>(fn: () => Promise<T>) => Promise<{ success: boolean; data?: T; error?: Error }> };
}

export interface BatchRequestItem<T = unknown> {
  id: string;
  config: ApiRequestConfig;
  resolve: (response: ApiResponse<T>) => void;
  reject: (error: ApiError) => void;
}

export interface ClientMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  retriedRequests: number;
  averageResponseTime: number;
  totalResponseTime: number;
  requestsByMethod: Record<HttpMethod, number>;
  requestsByStatus: Record<number, number>;
  activeRequests: number;
  queuedRequests: number;
  cacheHitRate: number;
  uptime: number;
}

// --- Simple In-Memory Cache ---

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
  staleWhileRevalidate?: number;
  key: string;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.cachedAt;
    if (age > entry.ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  getStale<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    const age = Date.now() - entry.cachedAt;
    const isStale = age > entry.ttl;
    const swr = entry.staleWhileRevalidate ?? 0;
    if (age > entry.ttl + swr) {
      this.store.delete(key);
      return null;
    }
    return { data: entry.data as T, isStale };
  }

  set(key: string, data: unknown, ttl: number, swr?: number): void {
    this.store.set(key, { data, cachedAt: Date.now(), ttl, staleWhileRevalidate: swr, key });
  }

  delete(key: string): boolean { return this.store.delete(key); }
  has(key: string): boolean { return this.store.has(key); }
  clear(): void { this.store.clear(); }
  get size(): number { return this.store.size; }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      const swr = entry.staleWhileRevalidate ?? 0;
      if (now - entry.cachedAt > entry.ttl + swr) this.store.delete(key);
    }
  }

  destroy(): void { clearInterval(this.cleanupTimer); this.store.clear(); }
}

// --- ApiGatewayClient Implementation ---

export class ApiGatewayClient {
  private config: Required<Pick<ClientConfig, "timeout" | "enableDedupe" | "maxConcurrent">> & Omit<ClientConfig, "timeout" | "enableDedupe" | "maxConcurrent">;
  private cache: SimpleCache;
  private inflightRequests = new Map<string, Promise<ApiResponse>>();
  private activeCount = 0;
  private queue: Array<{ config: ApiRequestConfig; resolve: (r: ApiResponse) => void; reject: (e: ApiError) => void }> = [];
  private metrics: ClientMetrics;
  private destroyed = false;

  constructor(config: ClientConfig = {}) {
    this.config = {
      timeout: config.timeout ?? 15_000,
      enableDedupe: config.enableDedupe ?? true,
      maxConcurrent: config.maxConcurrent ?? 10,
      baseUrl: config.baseUrl,
      headers: config.headers ?? {},
      getAuthToken: config.getAuthToken,
      onAuthError: config.onAuthError,
      cacheDefaults: config.cacheDefaults,
      retryDefaults: config.retryDefaults,
      requestInterceptors: config.requestInterceptors ?? [],
      responseInterceptors: config.responseInterceptors ?? [],
      errorInterceptors: config.errorInterceptors ?? [],
      finallyInterceptors: config.finallyInterceptors ?? [],
      onRequest: config.onRequest,
      onResponse: config.onResponse,
      onError: config.onError,
      circuitBreaker: config.circuitBreaker,
    };
    this.cache = new SimpleCache();
    this.metrics = this.createEmptyMetrics();
  }

  // --- Core API ---

  async request<T = unknown>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    if (this.destroyed) throw this.createError("Client destroyed", "", true, false, false);

    const startTime = performance.now();
    this.metrics.totalRequests++;

    // Build final config
    let finalConfig = this.buildConfig(config);

    // Run request interceptors
    for (const interceptor of this.config.requestInterceptors) {
      finalConfig = await interceptor(finalConfig);
    }

    this.config.onRequest?.(finalConfig);

    // Check cache for GET requests
    if ((finalConfig.method ?? "GET") === "GET" && finalConfig.cache !== false) {
      const cacheOpts = this.resolveCacheOptions(finalConfig.cache);
      if (cacheOpts) {
        const cached = this.cache.getStale<T>(cacheOpts.key ?? this.cacheKey(finalConfig));
        if (cached) {
          if (!cached.isStale || (cacheOpts.staleWhileRevalidate && cacheOpts.staleWhileRevalidate > 0)) {
            // Trigger background revalidation for stale entries
            if (cached.isStale) {
              this.executeRequest<T>(finalConfig, startTime).catch(() => {});
            }
            const response: ApiResponse<T> = {
              ok: true, status: 200, statusText: "OK",
              headers: new Headers(), data: cached.data,
              url: finalConfig.url, duration: performance.now() - startTime,
              fromCache: true, retried: false, retryCount: 0,
              cachedAt: Date.now(),
            };
            this.metrics.cachedRequests++;
            return this.applyResponseInterceptors(response);
          }
        }
      }
    }

    // Deduplication
    if (this.config.enableDedupe && finalConfig.dedupeKey) {
      const existing = this.inflightRequests.get(finalConfig.dedupeKey);
      if (existing) return existing as Promise<ApiResponse<T>>;
    }

    // Concurrency control
    if (this.activeCount >= this.config.maxConcurrent) {
      const queued = this.enqueue<T>(finalConfig);
      if (queued) return queued;
    }

    // Execute
    let responsePromise: Promise<ApiResponse<T>>;

    if (this.config.circuitBreaker) {
      const cbResult = await this.config.circuitBreaker.execute(() =>
        this.executeRequest<T>(finalConfig, startTime)
      );
      if (!cbResult.success && cbResult.error) {
        throw this.normalizeError(cbResult.error, finalConfig.url);
      }
      responsePromise = Promise.resolve(cbResult.data as ApiResponse<T>);
    } else {
      responsePromise = this.executeRequest<T>(finalConfig, startTime);
    }

    // Track inflight for dedup
    if (this.config.enableDedupe && finalConfig.dedupeKey) {
      this.inflightRequests.set(finalConfig.dedupeKey, responsePromise);
      responsePromise.finally(() => this.inflightRequests.delete(finalConfig.dedupeKey!));
    }

    return responsePromise;
  }

  // --- Shorthand Methods ---

  get<T = unknown>(url: string, config?: Omit<ApiRequestConfig, "url" | "method">): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  post<T = unknown>(url: string, body?: unknown, config?: Omit<ApiRequestConfig, "url" | "method" | "body">): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: "POST", body });
  }

  put<T = unknown>(url: string, body?: unknown, config?: Omit<ApiRequestConfig, "url" | "method" | "body">): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: "PUT", body });
  }

  patch<T = unknown>(url: string, body?: unknown, config?: Omit<ApiRequestConfig, "url" | "method" | "body">): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: "PATCH", body });
  }

  del<T = unknown>(url: string, config?: Omit<ApiRequestConfig, "url" | "method">): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  head<T = unknown>(url: string, config?: Omit<ApiRequestConfig, "url" | "method">): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, method: "HEAD" });
  }

  // --- Batch Requests ---

  async batch<T = unknown>(items: Array<{ id: string; config: ApiRequestConfig }>): Promise<Map<string, ApiResponse<T>>> {
    const results = new Map<string, ApiResponse<T>>();
    const promises = items.map(async ({ id, config }) => {
      try {
        const response = await this.request<T>(config);
        results.set(id, response);
      } catch (e) {
        // Store error as a pseudo-response
        results.set(id, {
          ok: false, status: 0, statusText: "Error",
          headers: new Headers(), data: undefined as T,
          url: config.url, duration: 0, fromCache: false,
          retried: false, retryCount: 0,
        });
      }
    });
    await Promise.allSettled(promises);
    return results;
  }

  // --- Cache Management ---

  invalidateCache(url?: string, params?: Record<string, string>): void {
    if (url) {
      const key = this.cacheKey({ url, params, method: "GET" });
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  preload<T>(url: string, config?: Omit<ApiRequestConfig, "url">): Promise<ApiResponse<T> | null> {
    return this.get<T>(url, { ...config, cache: { ttl: 300_000 } }).catch(() => null);
  }

  // --- Metrics ---

  getMetrics(): ClientMetrics {
    this.metrics.averageResponseTime =
      this.metrics.successfulRequests > 0
        ? this.metrics.totalResponseTime / this.metrics.successfulRequests
        : 0;
    this.metrics.cacheHitRate =
      this.metrics.totalRequests > 0
        ? this.metrics.cachedRequests / this.metrics.totalRequests
        : 0;
    this.metrics.activeRequests = this.activeCount;
    this.metrics.queuedRequests = this.queue.length;
    return { ...this.metrics };
  }

  resetMetrics(): void { this.metrics = this.createEmptyMetrics(); }

  // --- Lifecycle ---

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cache.destroy();
    this.inflightRequests.clear();
    // Reject queued requests
    for (const item of this.queue) {
      item.reject(this.createError("Client destroyed", item.config.url, false, false, false));
    }
    this.queue = [];
  }

  // --- Internal ---

  private async executeRequest<T>(config: ApiRequestConfig, startTime: number): Promise<ApiResponse<T>> {
    this.activeCount++;

    try {
      const method = (config.method ?? "GET").toUpperCase() as HttpMethod;
      const url = this.buildUrl(config);
      const timeout = config.timeout ?? this.config.timeout;

      // Setup abort controller
      const controller = config.abortController ?? new AbortController();
      const signal = config.signal ?? controller.signal;

      // Timeout
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Build headers
      const headers = new Headers(this.config.headers);
      if (config.headers) {
        for (const [k, v] of Object.entries(config.headers)) headers.set(k, v);
      }

      // Auth token
      if (this.config.getAuthToken) {
        const token = await this.config.getAuthToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);
      }

      // Content type
      if (config.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      // Accept
      if (config.accept) headers.set("Accept", config.accept);
      else if (!headers.has("Accept")) headers.set("Accept", "application/json");

      // API Version
      if (config.apiVersion) headers.set("API-Version", config.apiVersion);

      // Build fetch options
      const init: RequestInit = {
        method,
        headers,
        signal,
        credentials: config.credentials,
      };

      if (config.body !== undefined && method !== "GET" && method !== "HEAD") {
        init.body = typeof config.body === "string" ? config.body : JSON.stringify(config.body);
      }

      const response = await fetch(url, init);
      clearTimeout(timeoutId);

      const duration = performance.now() - startTime;

      // Parse response
      let data: T;
      const responseType = config.responseType ?? "json";

      switch (responseType) {
        case "text": data = (await response.text()) as unknown as T; break;
        case "blob": data = (await response.blob()) as unknown as T; break;
        case "arraybuffer": data = (await response.arrayBuffer()) as unknown as T; break;
        case "json":
        default:
          const text = await response.text();
          try { data = JSON.parse(text) as T; } catch { data = text as unknown as T; break;
      }

      // Handle 401 — attempt token refresh
      if (response.status === 401 && this.config.onAuthError) {
        const newToken = await this.config.onAuthError();
        if (newToken) {
          // Retry with new token
          headers.set("Authorization", `Bearer ${newToken}`);
          return this.executeRequest({ ...config, abortController: new AbortController() }, startTime);
        }
      }

      const apiResponse: ApiResponse<T> = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data,
        url: response.url,
        duration,
        fromCache: false,
        retried: false,
        retryCount: 0,
        requestMeta: config.meta,
      };

      // Cache successful GET responses
      if (apiResponse.ok && method === "GET" && config.cache !== false) {
        const cacheOpts = this.resolveCacheOptions(config.cache);
        if (cacheOpts) {
          this.cache.set(
            cacheOpts.key ?? this.cacheKey(config),
            data,
            cacheOpts.ttl,
            cacheOpts.staleWhileRevalidate,
          );
        }
      }

      // Update metrics
      this.metrics.successfulRequests++;
      this.metrics.totalResponseTime += duration;
      this.metrics.requestsByMethod[method] = (this.metrics.requestsByMethod[method] ?? 0) + 1;
      this.metrics.requestsByStatus[response.status] = (this.metrics.requestsByStatus[response.status] ?? 0) + 1;
      this.config.onResponse?.(apiResponse);

      // Run response interceptors
      return this.applyResponseInterceptors(apiResponse);

    } catch (e) {
      const duration = performance.now() - startTime;
      const error = this.normalizeError(e as Error, config.url, duration);

      // Retry logic
      const retryOpts = this.resolveRetryOptions(config.retry);
      if (retryOpts && error.retryable) {
        return this.retryWithBackoff<T>(config, retryOpts, startTime, 0, error);
      }

      // Run error interceptors
      let processedError = error;
      for (const interceptor of this.config.errorInterceptors) {
        processedError = await interceptor(processedError);
      }

      this.metrics.failedRequests++;
      this.config.onError?.(processedError);
      throw processedError;
    } finally {
      this.activeCount--;
      this.processQueue();

      // Run finally interceptors
      for (const interceptor of this.config.finallyInterceptors) {
        interceptor({ request: config }).catch(() => {});
      }
    }
  }

  private async retryWithBackoff<T>(
    config: ApiRequestConfig,
    opts: RetryOptions,
    startTime: number,
    attempt: number,
    lastError: ApiError,
  ): Promise<ApiResponse<T>> {
    const maxRetries = opts.maxRetries ?? 3;
    if (attempt >= maxRetries) throw lastError;

    const baseDelay = opts.baseDelay ?? 1000;
    const factor = opts.backoffFactor ?? 2;
    const maxDelay = opts.maxDelay ?? 30_000;
    let delay = baseDelay * Math.pow(factor, attempt);
    if (delay > maxDelay) delay = maxDelay;
    if (opts.jitter !== false) delay *= 0.5 + Math.random() * 0.5;

    await new Promise((r) => setTimeout(r, delay));

    try {
      const response = await this.executeRequest<T>(
        { ...config, abortController: new AbortController() },
        startTime,
      );
      (response as unknown as { retried: boolean; retryCount: number }).retried = true;
      (response as unknown as { retryCount: number }).retryCount = attempt + 1;
      this.metrics.retriedRequests++;
      return response;
    } catch (e) {
      return this.retryWithBackoff<T>(config, opts, startTime, attempt + 1, this.normalizeError(e as Error, config.url));
    }
  }

  private enqueue<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> | null {
    return new Promise((resolve, reject) => {
      this.queue.push({
        config: config as ApiRequestConfig,
        resolve: resolve as (r: ApiResponse) => void,
        reject,
      });
    });
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.activeCount < this.config.maxConcurrent) {
      const item = this.queue.shift()!;
      this.request(item.config).then(item.resolve).catch(item.reject);
    }
  }

  private buildConfig(config: ApiRequestConfig): ApiRequestConfig {
    return {
      ...config,
      url: this.config.baseUrl ? `${this.config.baseUrl.replace(/\/$/, "")}/${config.url.replace(/^\//, "")}` : config.url,
      method: config.method ?? "GET",
      timeout: config.timeout ?? this.config.timeout,
    };
  }

  private buildUrl(config: ApiRequestConfig): string {
    let url = config.url;
    if (config.params) {
      const searchParams = new URLSearchParams(config.params);
      const separator = url.includes("?") ? "&" : "?";
      url = `${separator}${searchParams.toString()}`;
    }
    return url;
  }

  private cacheKey(config: ApiRequestConfig): string {
    return `${(config.method ?? "GET").toUpperCase()}:${config.url}:${config.params ? JSON.stringify(config.params) : ""}`;
  }

  private resolveCacheOptions(cache: boolean | CacheOptions | undefined): CacheOptions | null {
    if (cache === false) return null;
    if (cache === true || cache === undefined) return this.config.cacheDefaults ?? { ttl: 300_000 };
    return cache;
  }

  private resolveRetryOptions(retry: boolean | RetryOptions | undefined): RetryOptions | null {
    if (retry === false) return null;
    if (retry === true || retry === undefined) return this.config.retryDefaults ?? { maxRetries: 3 };
    return retry;
  }

  private async applyResponseInterceptors<T>(response: ApiResponse<T>): Promise<ApiResponse<T>> {
    let result = response;
    for (const interceptor of this.config.responseInterceptors) {
      result = await (interceptor as ResponseInterceptor)(result);
    }
    return result;
  }

  private normalizeError(error: Error, url: string, duration?: number): ApiError {
    const apiError: ApiError = Object.assign(new Error(error.message), {
      url,
      status: (error as { status?: number }).status,
      statusText: (error as { statusText?: string }).statusText,
      code: (error as { code?: string }).code,
      data: (error as { data?: unknown }).data,
      isTimeout: error.name === "AbortError" && !url.startsWith("blob:"),
      isAbort: error.name === "AbortError",
      isNetworkError: error.message.includes("fetch") || error.message.includes("network") || error.message.includes("Failed to fetch"),
      retryable: true,
    }) as ApiError;

    // Determine retryability
    const status = apiError.status;
    if (status && ![408, 429, 500, 502, 503, 504].includes(status)) {
      apiError.retryable = false;
    }
    if (status === 400 || status === 401 || status === 403 || status === 404 || status === 405 || status === 422) {
      apiError.retryable = false;
    }

    return apiError;
  }

  private createError(message: string, url: string, isTimeout: boolean, isAbort: boolean, isNetwork: boolean): ApiError {
    return Object.assign(new Error(message), {
      url, isTimeout, isAbort, isNetworkError: isNetwork, retryable: !isAbort,
    }) as ApiError;
  }

  private createEmptyMetrics(): ClientMetrics {
    return {
      totalRequests: 0, successfulRequests: 0, failedRequests: 0,
      cachedRequests: 0, retriedRequests: 0, averageResponseTime: 0,
      totalResponseTime: 0, requestsByMethod: {} as Record<HttpMethod, number>,
      requestsByStatus: {} as Record<number, number>,
      activeRequests: 0, queuedRequests: 0, cacheHitRate: 0, uptime: 0,
    };
  }
}

// --- Factory ---

export function createApiClient(config?: ClientConfig): ApiGatewayClient {
  return new ApiGatewayClient(config);
}
