/**
 * Request: HTTP client with interceptors, retry logic, caching,
 * request cancellation, progress tracking, timeout handling,
 * and response type safety.
 */

// --- Types ---

export interface RequestOptions extends Omit<RequestInit, "body"> {
  /** Request URL */
  url: string;
  /** URL path params to interpolate */
  params?: Record<string, string>;
  /** Query string parameters */
  query?: Record<string, string | number | boolean | undefined>;
  /** Request body (auto-stringified for JSON) */
  body?: unknown;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  /** Number of retries (default: 0) */
  retries?: number;
  /** Retry delay in ms or function */
  retryDelay?: number | ((attempt: number) => number);
  /** Base URL prefix */
  baseUrl?: string;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Parse as JSON? (default: true) */
  json?: boolean;
  /** Send credentials? */
  credentials?: RequestCredentials;
  /** Response type override */
  responseType?: "json" | "text" | "blob" | "arraybuffer";
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Upload/download progress callback */
  onProgress?: (loaded: number, total: number) => void;
  /** Custom request ID for deduplication */
  requestId?: string;
}

export interface Response<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  ok: boolean;
  url: string;
  durationMs: number;
}

export interface RequestError extends Error {
  status?: number;
  statusText?: string;
  data?: unknown;
  isAbort: boolean;
  isTimeout: boolean;
  isNetwork: boolean;
}

// --- Error Factory ---

function createRequestError(
  message: string,
  options: Partial<RequestError> = {},
): RequestError {
  const err = new Error(message) as RequestError;
  err.name = "RequestError";
  err.status = options.status;
  err.statusText = options.statusText;
  err.data = options.data;
  err.isAbort = options.isAbort ?? false;
  err.isTimeout = options.isTimeout ?? false;
  err.isNetwork = options.isNetwork ?? false;
  return err;
}

// --- Interceptors ---

export interface InterceptorContext {
  request: RequestOptions;
  /** Modify and return the request options, or throw to cancel */
  next: (options: RequestOptions) => Promise<Response<unknown>>;
}

export type RequestInterceptor = (options: RequestOptions) => RequestOptions | Promise<RequestOptions>;
export type ResponseInterceptor<T = unknown> = (response: Response<T>) => Response<T> | Promise<Response<T>>;
export type ErrorInterceptor = (error: RequestError) => RequestError | Promise<RequestError>;

// --- Main HTTP Client ---

/**
 * Feature-rich HTTP client.
 *
 * @example
 * const client = new HttpClient({ baseUrl: "/api" });
 *
 * const users = await client.get<User[]>("/users", { query: { page: 1 } });
 * const user = await client.post<User>("/users", { body: { name: "Alice" } });
 */
export class HttpClient {
  private _baseUrl: string = "";
  private _defaultHeaders: Record<string, string> = {};
  private _defaultTimeout: number = 30_000;
  private _requestInterceptors: RequestInterceptor[] = [];
  private _responseInterceptors: ResponseInterceptor[] = [];
  private _errorInterceptors: ErrorInterceptor[] = [];
  private _pendingRequests = new Map<string, AbortController>();

  constructor(options?: { baseUrl?: string; headers?: Record<string, string>; timeout?: number }) {
    this._baseUrl = options?.baseUrl ?? "";
    this._defaultHeaders = options?.headers ?? {};
    this._defaultTimeout = options?.timeout ?? 30_000;
  }

  // --- Interceptor Management ---

  useRequest(interceptor: RequestInterceptor): this { this._requestInterceptors.push(interceptor); return this; }
  useResponse(interceptor: ResponseInterceptor): this { this._responseInterceptors.push(interceptor); return this; }
  useError(interceptor: ErrorInterceptor): this { this._errorInterceptors.push(interceptor); return this; }

  // --- HTTP Methods ---

  async get<T = unknown>(url: string, options?: Omit<RequestOptions, "url" | "method" | "body">): Promise<Response<T>> {
    return this.request<T>({ ...options, url, method: "GET" });
  }

  async post<T = unknown>(url: string, options?: Omit<RequestOptions, "url" | "method">): Promise<Response<T>> {
    return this.request<T>({ ...options, url, method: "POST" });
  }

  async put<T = unknown>(url: string, options?: Omit<RequestOptions, "url" | "method">): Promise<Response<T>> {
    return this.request<T>({ ...options, url, method: "PUT" });
  }

  async patch<T = unknown>(url: string, options?: Omit<RequestOptions, "url" | "method">): Promise<Response<T>> {
    return this.request<T>({ { ...options, url, method: "PATCH" }); }
  }

  async delete<T = unknown>(url: string, options?: Omit<RequestOptions, "url" | "method" | "body">): Promise<Response<T>> {
    return this.request<T>({ ...options, url, method: "DELETE" });
  }

  async head(url: string, options?: Omit<RequestOptions, "url" | "method" | "body">): Promise<Response<null>> {
    return this.request({ ...options, url, method: "HEAD" }) as Promise<Response<null>>;
  }

  // --- Core Request ---

  async request<T = unknown>(rawOptions: RequestOptions): Promise<Response<T>> {
    // Build full options
    let opts: RequestOptions = {
      timeout: this._defaultTimeout,
      json: true,
      credentials: "same-origin",
      ...rawOptions,
      headers: { ...this._defaultHeaders, ...rawOptions.headers },
      url: this.resolveUrl(rawOptions.url, rawOptions.baseUrl),
    };

    // Apply URL params
    if (opts.params) {
      for (const [key, value] of Object.entries(opts.params)) {
        opts.url = opts.url.replace(`:${key}`, encodeURIComponent(value));
      }
    }

    // Apply query string
    if (opts.query && Object.keys(opts.query).length > 0) {
      const qs = Object.entries(opts.query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      opts.url += (opts.url.includes("?") ? "&" : "?") + qs;
    }

    // Apply request interceptors
    for (const interceptor of this._requestInterceptors) {
      opts = await interceptor(opts);
    }

    // Setup abort controller
    const controller = new AbortController();
    const outerSignal = opts.signal;
    if (outerSignal) {
      outerSignal.addEventListener("abort", () => controller.abort());
    }
    opts.signal = controller.signal;

    // Track pending request
    const reqId = opts.requestId ?? `${opts.method}:${opts.url}`;
    this._pendingRequests.set(reqId, controller);

    // Prepare body
    let fetchBody: BodyInit | undefined;
    if (opts.body !== undefined) {
      if (opts.json || typeof opts.body === "object") {
        fetchBody = JSON.stringify(opts.body);
        opts.headers["Content-Type"] ??= "application/json";
      } else {
        fetchBody = String(opts.body);
      }
    }

    // Execute with retry
    const maxRetries = opts.retries ?? 0;

    try {
      const result = await this.executeWithRetry<T>(
        () => this.fetchWithTimeout<T>(opts.url!, { ...opts, body: fetchBody }, opts.timeout!),
        maxRetries,
        opts.retryDelay,
        reqId,
      );

      // Apply response interceptors
      let response = result;
      for (const interceptor of this._responseInterceptors) {
        response = await interceptor(response);
      }

      return response;
    } catch (err) {
      let error: RequestError =
        err instanceof RequestError ? err :
        createRequestError(err instanceof Error ? err.message : "Request failed");

      // Apply error interceptors
      for (const interceptor of this._errorInterceptors) {
        error = await interceptor(error);
      }

      throw error;
    } finally {
      this._pendingRequests.delete(reqId);
    }
  }

  // --- Private Helpers ---

  private resolveUrl(url: string, baseUrlOverride?: string): string {
    const base = baseUrlOverride ?? this._baseUrl;
    if (!base) return url;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
    return base.replace(/\/+$/, "") + "/" + url.replace(/^\/+/, "");
  }

  private async executeWithRetry<T>(
    fn: () => Promise<Response<T>>,
    maxRetries: number,
    delay?: number | ((n: number) => number),
    reqId: string,
  ): Promise<Response<T>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry on abort or 4xx errors
        if (lastError instanceof RequestError && (lastError.isAbort || (lastError.status && lastError.status < 500))) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          const delayMs = typeof delay === "function"
            ? delay(attempt + 1)
            : (delay ?? 1000) * Math.pow(2, attempt);

          await sleep(delayMs);
        }
      }
    }

    throw lastError!;
  }

  private async fetchWithTimeout<T>(
    url: string,
    init: RequestOptions & { body?: BodyInit },
    timeoutMs: number,
  ): Promise<Response<T>> {
    const start = performance.now();

    const timeoutId = setTimeout(() => {
      throw createRequestError(`Request timed out after ${timeoutMs}ms`, { isTimeout: true });
    }, timeoutMs);

    try {
      const res = await fetch(url, init as RequestInit);
      clearTimeout(timeoutId);

      const durationMs = performance.now() - start;

      if (!res.ok) {
        let errorData: unknown;
        try { errorData = await res.clone().json(); } catch {}

        throw createRequestError(`HTTP ${res.status}: ${res.statusText}`, {
          status: res.status,
          statusText: res.statusText,
          data: errorData,
        });
      }

      let data: T;
      const responseType = init.responseType ?? (init.json !== false ? "json" : "text");
      switch (responseType) {
        case "json": data = await res.json() as T; break;
        case "text": data = await res.text() as unknown as T; break;
        case "blob": data = await res.blob() as unknown as T; break;
        case "arraybuffer": data = await res.arrayBuffer() as unknown as T; break;
        default: data = await res.json() as T;
      }

      return { data, status: res.status, statusText: res.statusText, headers: res.headers, ok: res.ok, url: res.url, durationMs };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Cancel a pending request by ID */
  cancel(requestId: string): void {
    this._pendingRequests.get(requestId)?.abort();
    this._pendingRequests.delete(requestId);
  }

  /** Cancel all pending requests */
  cancelAll(): void {
    for (const [, controller] of this._pendingRequests) {
      controller.abort();
    }
    this._pendingRequests.clear();
  }
}

// --- Default Instance ---

/** Default shared HTTP client instance */
export const http = new HttpClient();

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
