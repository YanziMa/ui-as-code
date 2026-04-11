/**
 * HTTP Client: High-level REST client with resource-based routing,
 * middleware pipeline, type-safe methods, automatic auth token injection,
 * request/response logging, and error classification.
 */

// --- Types ---

export interface HttpClientConfig {
  /** Base URL for all requests */
  baseUrl?: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Auth token (Bearer or custom scheme) */
  authToken?: string;
  /** Auth scheme (default: "Bearer") */
  authScheme?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Default content type */
  contentType?: string;
  /** Enable debug logging? */
  debug?: boolean;
  /** Global prefix for all routes */
  routePrefix?: string;
}

export interface HttpRequestOptions {
  /** Method override */
  method?: string;
  /** Request body */
  body?: unknown;
  /** Query parameters */
  query?: Record<string, string>;
  /** Path parameters (for substitution) */
  params?: Record<string, string>;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Timeout override */
  timeout?: number;
  /** Signal for cancellation */
  signal?: AbortSignal;
  /** Expected response type */
  expectedStatus?: number | number[];
  /** Retry count */
  retries?: number;
  /** Skip base URL prepending */
  absoluteUrl?: boolean;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  ok: boolean;
  headers: Record<string, string>;
  url: string;
  duration: number;
}

export interface HttpMiddleware {
  name: string;
  request?: (request: HttpRequest) => Promise<HttpRequest>;
  response?: (response: HttpResponse, request: HttpRequest) => Promise<HttpResponse>;
  error?: (error: Error, request: HttpRequest) => Promise<HttpResponse | void>;
}

interface HttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  expectedStatus?: number | number[];
}

// --- Error Classification ---

export class HttpError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public responseBody?: unknown,
    message?: string,
  ) {
    super(message ?? `HTTP ${status}: ${statusText}`);
    this.name = "HttpError";
  }
}

function classifyError(status: number): "client" | "server" | "network" {
  if (status >= 400 && status < 500) return "client";
  if (status >= 500) return "server";
  return "network";
}

// --- Main Client ---

export class HttpClient {
  private config: HttpClientConfig;
  private middlewares: HttpMiddleware[] = [];

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      timeout: 30000,
      contentType: "application/json",
      debug: false,
      ...config,
    };
  }

  /** Add a middleware to the pipeline */
  use(middleware: HttpMiddleware): () => void {
    this.middlewares.push(middleware);
    return () => {
      this.middlewares = this.middlewares.filter((m) => m !== middleware);
    };
  }

  /** Make an HTTP request */
  async request<T = unknown>(pathOrUrl: string, options: HttpRequestOptions = {}): Promise<HttpResponse<T>> {
    const startTime = performance.now();

    // Build request
    let url: string;
    if (options.absoluteUrl) {
      url = pathOrUrl;
    } else {
      const base = this.config.baseUrl ?? "";
      const prefix = this.config.routePrefix ?? "";
      url = `${base.replace(/\/$/, "")}/${prefix}${pathOrUrl}`.replace(/\/+/g, "/");
    }

    // Substitute path params
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url = url.replace(`:${key}`, encodeURIComponent(value));
      }
    }

    // Append query params
    if (options.query && Object.keys(options.query).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.query)) {
        searchParams.append(k, v);
      }
      const sep = url.includes("?") ? "&" : "?";
      url += `${sep}${searchParams.toString()}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": this.config.contentType!,
      ...this.config.headers,
      ...options.headers,
    };

    // Auth token
    if (this.config.authToken) {
      headers["Authorization"] = `${this.config.authScheme ?? "Bearer"} ${this.config.authToken}`;
    }

    const request: HttpRequest = {
      url,
      method: options.method ?? "GET",
      headers,
      body: options.body,
      signal: options.signal,
      timeout: options.timeout ?? this.config.timeout,
      expectedStatus: options.expectedStatus,
    };

    // Log
    if (this.config.debug) {
      console.log(`[HTTP] ${request.method} ${request.url}`);
    }

    // Run request middlewares
    for (const mw of this.middlewares) {
      if (mw.request) request = await mw.request(request);
    }

    // Execute fetch
    let response: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), request.timeout);

      response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? (typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body)
        ) : undefined,
        signal: request.signal ?? controller.signal,
      });

      clearTimeout(timer);
    } catch (err) {
      const duration = performance.now() - startTime;
      const error = err instanceof Error ? err : new Error(String(err));

      // Run error middlewares
      for (const mw of this.middlewares) {
        if (mw.error) await mw.error(error, request);
      }

      throw new HttpError(0, "Network Error", undefined, error.message);
    }

    const duration = performance.now() - startTime;
    const responseData: T = response.headers.get("content-type")?.includes("application/json")
      ? await response.json().catch(() => null)
      : await response.text().catch(() => null);

    const httpResponse: HttpResponse<T> = {
      data: responseData as T,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      url: request.url,
      duration,
    };

    // Validate expected status
    if (request.expectedStatus) {
      const expected = Array.isArray(request.expectedStatus)
        ? request.expectedStatus
        : [request.expectedStatus];
      if (!expected.includes(httpResponse.status)) {
        const error = new HttpError(
          httpResponse.status,
          httpResponse.statusText,
          httpResponse.data,
          `Expected status ${expected.join("/")} but got ${httpResponse.status}`,
        );

        // Run error middlewares
        for (const mw of this.middlewares) {
          if (mw.error) await mw.error(error, request);
        }

        throw error;
      }
    }

    // Run response middlewares
    for (const mw of this.middlewares) {
      if (mw.response) httpResponse = await mw.response(httpResponse, request);
    }

    return httpResponse;
  }

  // --- Shortcut Methods ---

  /** GET request */
  async get<T = unknown>(path: string, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  /** POST request */
  async post<T = unknown>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, "method">): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  /** PUT request */
  async put<T = unknown>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, "method">): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: "PUT", body });
  }

  /** PATCH request */
  async patch<T = unknown>(path: string, body?: unknown, options?: Omit<HttpRequestOptions, "method">): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  /** DELETE request */
  async del<T = unknown>(path: string, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<HttpResponse<T>> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  /** HEAD request */
  async head(path: string, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<HttpResponse<void>> {
    const res = this.request<void>(path, { ...options, method: "HEAD" });
    return { data: undefined, ...res };
  }

  /** OPTIONS request */
  async optionsReq(path: string, options?: Omit<HttpRequestOptions, "method" | "body">): Promise<HttpResponse<void>> {
    const res = this.request<void>(path, { ...options, method: "OPTIONS" });
    return { data: undefined, ...res };
  }

  /** JSONP-style GET (for cross-origin without CORS) */
  async jsonp<T>(path: string, callbackName = "callback"): Promise<T> {
    return this.get<T>(path, {
      params: { [callbackName, "jsonp"] },
      headers: { Accept: "text/javascript" },
    });
  }

  // --- Resource CRUD helpers ---

  /** Get all items from a collection */
  async getAll<T>(resource: string): Promise<HttpResponse<T[]>> {
    return this.get<T[]>(`/${resource}`);
  }

  /** Get single item by ID */
  async getById<T>(resource: string, id: string | number): Promise<HttpResponse<T>> {
    return this.get<T>(`/${resource}/${id}`);
  }

  /** Create item */
  async create<T>(resource: string, data: unknown): Promise<HttpResponse<T>> {
    return this.post<T>(resource, data);
  }

  /** Update item */
  async update<T>(resource: string, id: string | number, data: unknown): Promise<HttpResponse<T>> {
    return this.put<T>(`/${resource}/${id}`, data);
  }

  /** Partial update item */
  async patch<T>(resource: string, id: string | number, data: unknown): Promise<HttpResponse<T>> {
    return this.patch<T>(`/${resource}/${id}`, data);
  }

  /** Delete item */
  async remove(resource: string, id: string | number): Promise<HttpResponse<void>> {
    return this.del(`/${resource}/${id}`);
  }
}

/** Create a pre-configured HTTP client */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}
