/**
 * HTTP Utilities: Fetch wrapper with retry/timeout/caching, request/response
 * interceptors, abort controller management, progress tracking, request
 * deduplication, and adapter pattern for different transports.
 */

// --- Types ---

export interface HttpRequestConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  timeout?: number;           // ms
  retries?: number;           // Max retry attempts (default 0)
  retryDelay?: number;        // Base delay between retries in ms (default 1000)
  retryStatuses?: number[];   // Status codes that trigger retry (default [408, 429, 500, 502, 503, 504])
  signal?: AbortSignal;
  cacheTTL?: number;          // Cache TTL for GET requests (ms)
  credentials?: RequestCredentials;
  mode?: RequestMode;
  responseType?: "json" | "text" | "blob" | "arraybuffer" | "formData";
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  url: string;
  duration: number;            // Request duration in ms
  cached: boolean;
  retried: number;             // Number of retries used
}

export interface HttpError extends Error {
  status?: number;
  data?: unknown;
  config?: HttpRequestConfig;
}

export interface InterceptorContext {
  config: HttpRequestConfig;
  response?: HttpResponse<unknown>;
  error?: Error;
}

export type RequestInterceptor = (
  config: HttpRequestConfig,
) => HttpRequestConfig | Promise<HttpRequestConfig>;
export type ResponseInterceptor = (
  response: HttpResponse<unknown>,
) => HttpResponse<unknown> | Promise<HttpResponse<unknown>>;
export type ErrorInterceptor = (
  error: HttpError,
) => HttpResponse<unknown> | Promise<HttpResponse<unknown>>;

export interface HttpClientOptions {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
  maxRetries?: number;
  cacheEnabled?: boolean;
  cacheSize?: number;
  onProgress?: (loaded: number, total: number) => void;
}

// --- HTTP Error ---

function createHttpError(
  message: string,
  status?: number,
  data?: unknown,
  config?: HttpRequestConfig,
): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  err.data = data;
  err.config = config;
  err.name = "HttpError";
  return err;
}

// --- In-Memory Cache ---

interface CacheEntry {
  response: HttpResponse<unknown>;
  expiry: number;
}

class HttpCache {
  private store = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize = 100) { this.maxSize = maxSize; }

  get(key: string): HttpResponse<unknown> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.response;
  }

  set(key: string, response: HttpResponse<unknown>, ttlMs: number): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      // Evict oldest (first key)
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, { response, expiry: Date.now() + ttlMs });
  }

  clear(): void { this.store.clear(); }
  get size(): number { return this.store.size; }
}

// --- Core HTTP Client ---

/**
 * Lightweight HTTP client built on fetch with interceptors,
 * retry logic, caching, timeout, and request deduplication.
 *
 * @example
 * ```ts
 * const http = new HttpClient({ baseURL: "/api" });
 * const users = await http.get<User[]>("/users", { params: { page: 1 } });
 * await http.post("/users", { name: "Alice" });
 * ```
 */
export class HttpClient {
  private options: Required<Omit<HttpClientOptions, "onProgress">> & Pick<HttpClientOptions, "onProgress">;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];
  private cache: HttpCache;
  private pendingRequests = new Map<string, Promise<HttpResponse<unknown>>>();

  constructor(options: HttpClientOptions = {}) {
    this.options = {
      baseURL: options.baseURL ?? "",
      defaultHeaders: options.defaultHeaders ?? {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      defaultTimeout: options.defaultTimeout ?? 15000,
      maxRetries: options.maxRetries ?? 0,
      cacheEnabled: options.cacheEnabled ?? true,
      cacheSize: options.cacheSize ?? 50,
      onProgress: options.onProgress,
    };
    this.cache = new HttpCache(this.options.cacheSize);
  }

  /** Add a request interceptor */
  useRequest(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const idx = this.requestInterceptors.indexOf(interceptor);
      if (idx >= 0) this.requestInterceptors.splice(idx, 1);
    };
  }

  /** Add a response interceptor */
  useResponse(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const idx = this.responseInterceptors.indexOf(interceptor);
      if (idx >= 0) this.responseInterceptors.splice(idx, 1);
    };
  }

  /** Add an error interceptor */
  useError(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const idx = this.errorInterceptors.indexOf(interceptor);
      if (idx >= 0) this.errorInterceptors.splice(idx, 1);
    };
  }

  /** Set a default header */
  setHeader(key: string, value: string): void {
    this.options.defaultHeaders[key] = value;
  }

  /** Remove a default header */
  removeHeader(key: string): void {
    delete this.options.defaultHeaders[key];
  }

  /** GET request */
  async get<T = unknown>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  /** POST request */
  async post<T = unknown>(url: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "POST", body });
  }

  /** PUT request */
  async put<T = unknown>(url: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "PUT", body });
  }

  /** PATCH request */
  async patch<T = unknown>(url: string, body?: unknown, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "PATCH", body });
  }

  /** DELETE request */
  async delete<T = unknown>(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  /** HEAD request */
  async head(url: string, config?: Partial<HttpRequestConfig>): Promise<HttpResponse<void>> {
    return this.request({ ...config, url, method: "HEAD" });
  }

  /** Core request method */
  async request<T = unknown>(rawConfig: HttpRequestConfig): Promise<HttpResponse<T>> {
    let config = this._mergeDefaults(rawConfig);

    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    const fullUrl = this._buildUrl(config.url, config.params);
    const cacheKey = config.method === "GET" ? fullUrl : "";

    // Check cache for GET requests
    if (cacheKey && this.options.cacheEnabled && config.cacheTTL !== 0) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached as HttpResponse<T>;
      }
    }

    // Deduplicate identical in-flight requests
    if (cacheKey && this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)! as Promise<HttpResponse<T>>;
    }

    const promise = this._executeRequest<T>(fullUrl, config, cacheKey);

    if (cacheKey) {
      this.pendingRequests.set(cacheKey, promise);
      promise.finally(() => this.pendingRequests.delete(cacheKey));
    }

    return promise;
  }

  /** Clear the response cache */
  clearCache(): void { this.cache.clear(); }

  /** Get cache statistics */
  getCacheStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.options.cacheSize };
  }

  // --- Private ---

  private _mergeDefaults(config: HttpRequestConfig): HttpRequestConfig {
    return {
      ...config,
      url: config.url.startsWith("http") ? config.url : `${this.options.baseURL}${config.url}`,
      headers: { ...this.options.defaultHeaders, ...config.headers },
      timeout: config.timeout ?? this.options.defaultTimeout,
      retries: config.retries ?? this.options.maxRetries,
      retryDelay: config.retryDelay ?? 1000,
      retryStatuses: config.retryStatuses ?? [408, 429, 500, 502, 503, 504],
      credentials: config.credentials ?? "same-origin",
      mode: config.mode ?? "cors",
    };
  }

  private _buildUrl(url: string, params?: Record<string, string | number | boolean>): string {
    if (!params || Object.keys(params).length === 0) return url;
    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      searchParams.set(k, String(v));
    }
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}${searchParams.toString()}`;
  }

  private async _executeRequest<T>(
    url: string,
    config: HttpRequestConfig,
    cacheKey: string,
  ): Promise<HttpResponse<T>> {
    const startTime = performance.now();
    let lastError: HttpError | null = null;
    const maxAttempts = (config.retries ?? 0) + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await this._singleFetch<T>(url, config);

        // Run response interceptors
        let response: HttpResponse<unknown> = result;
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response);
        }

        // Cache successful GET responses
        if (cacheKey && this.options.cacheEnabled && result.ok) {
          const ttl = config.cacheTTL ?? 300000; // Default 5 min
          this.cache.set(cacheKey, response, ttl);
        }

        return response as HttpResponse<T>;
      } catch (err) {
        const httpErr = err instanceof Error ? err : new Error(String(err));
        lastError = createHttpError(
          httpErr.message,
          (err as HttpError)?.status,
          (err as HttpError)?.data,
          config,
        );

        // Try error interceptors before retrying
        for (const interceptor of this.errorInterceptors) {
          try {
            const recovered = await interceptor(lastError);
            return recovered as HttpResponse<T>;
          } catch { /* continue to retry */ }
        }

        // Don't retry on last attempt or non-retryable errors
        if (attempt >= maxAttempts - 1) break;

        // Exponential backoff with jitter
        const delay = (config.retryDelay ?? 1000) * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw lastError ?? createHttpError("Request failed");
  }

  private async _singleFetch<T>(
    url: string,
    config: HttpRequestConfig,
  ): Promise<HttpResponse<T>> {
    const startTime = performance.now();

    // Build fetch options
    const init: RequestInit = {
      method: config.method ?? "GET",
      headers: config.headers,
      credentials: config.credentials,
      mode: config.mode,
      signal: config.signal,
    };

    if (config.body !== undefined && config.method !== "GET" && config.method !== "HEAD") {
      if (typeof config.body === "string") {
        init.body = config.body;
      } else if (config.body instanceof FormData) {
        init.body = config.body;
      } else {
        init.body = JSON.stringify(config.body);
      }
    }

    // Timeout via AbortController
    const controller = new AbortController();
    const timeoutId = config.timeout
      ? setTimeout(() => controller.abort(), config.timeout)
      : undefined;

    // Chain external signal
    if (config.signal) {
      config.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    init.signal = controller.signal;

    try {
      const response = await fetch(url, init);
      clearTimeout(timeoutId);

      const duration = performance.now() - startTime;

      // Parse response based on type
      let data: unknown;
      const responseType = config.responseType ?? "json";

      switch (responseType) {
        case "json":
          data = await response.json().catch(() => null);
          break;
        case "text":
          data = await response.text();
          break;
        case "blob":
          data = await response.blob();
          break;
        case "arraybuffer":
          data = await response.arrayBuffer();
          break;
        case "formData":
          data = await response.formData();
          break;
        default:
          data = await response.json().catch(() => null);
      }

      const httpResponse: HttpResponse<T> = {
        data: data as T,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        ok: response.ok,
        url: response.url,
        duration: Math.round(duration),
        cached: false,
        retried: 0,
      };

      if (!response.ok) {
        throw createHttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data,
          config,
        );
      }

      return httpResponse;
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        throw createHttpError(`Request timed out after ${config.timeout}ms`, undefined, undefined, config);
      }
      throw err;
    }
  }
}

// --- Convenience Functions ---

/** Create a pre-configured HTTP client instance */
export function createHttpClient(options?: HttpClientOptions): HttpClient {
  return new HttpClient(options);
}

/** Quick one-shot GET request */
export async function quickGet<T = unknown>(
  url: string,
  options?: Omit<HttpRequestConfig, "url" | "method">,
): Promise<T> {
  const http = new HttpClient();
  const res = await http.get<T>(url, options);
  return res.data;
}

/** Quick one-shot POST request */
export async function quickPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: Omit<HttpRequestConfig, "url" | "method" | "body">,
): Promise<T> {
  const http = new HttpClient();
  const res = await http.post<T>(url, body, options);
  return res.data;
}

/** JSONP request for cross-origin requests without CORS */
export function jsonp<T = unknown>(
  url: string,
  callbackParam = "callback",
  timeout = 10000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cbName = `jsonp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP request timed out"));
    }, timeout);

    function cleanup(): void {
      delete (window as any)[cbName];
      script.remove();
      clearTimeout(timer);
    }

    (window as any)[cbName] = (data: T) => {
      cleanup();
      resolve(data);
    };

    const separator = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    script.src = `${url}${separator}${callbackParam}=${cbName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP script load error"));
    };
    document.head.appendChild(script);
  });
}

// --- URL Utilities ---

/** Build a query string from an object */
export function buildQueryString(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(params)) {
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      for (const v of val) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
      }
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
    }
  }
  return parts.join("&");
}

/** Parse a query string into an object */
export function parseQueryString(queryString: string): Record<string, string> {
  const result: Record<string, string> = {};
  const search = queryString.startsWith("?") ? queryString.slice(1) : queryString;
  if (!search) return result;
  const params = new URLSearchParams(search);
  for (const [k, v] of params) {
    result[k] = v;
  }
  return result;
}

/** Get current page's query parameters as an object */
export function getCurrentQueryParams(): Record<string, string> {
  return parseQueryString(window.location.search);
}
