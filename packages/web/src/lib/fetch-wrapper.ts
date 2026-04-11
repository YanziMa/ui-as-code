/**
 * Fetch Wrapper: Enhanced fetch API with interceptors,
 * request/response transformation, caching, timeout,
 * progress tracking, and error handling.
 */

// --- Types ---

export interface FetchOptions extends RequestInit {
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Abort signal */
  signal?: AbortSignal;
  /** Base URL to prepend */
  baseUrl?: string;
  /** Headers to merge with defaults */
  headers?: Record<string, string>;
  /** Query parameters object */
  params?: Record<string, string>;
  /** Parse response as JSON automatically? */
  json?: boolean;
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Redirect behavior */
  redirect?: RequestRedirect;
  /** Cache mode */
  cache?: RequestCache;
  /** Retry config */
  retries?: { max: number; delayMs: number; statuses: number[] };
  /** Progress callback for uploads/downloads */
  onProgress?: (loaded: number, total: number) => void;
}

export interface FetchInterceptor {
  /** Called before the request is sent. Can modify options or return new ones. */
  request?: (url: string, options: FetchOptions) => Promise<{ url: string; options: FetchOptions }>;
  /** Called after response received. Can modify response or throw. */
  response?: (response: Response, url: string, options: FetchOptions) => Promise<Response>;
  /** Called on error. Can recover or re-throw. */
  error?: (error: Error, url: string, options: FetchOptions) => Promise<Response>;
}

export interface CacheEntry {
  response: Response;
  timestamp: number;
  etag?: string;
}

// --- Default Instance ---

class EnhancedFetch {
  private interceptors: FetchInterceptor[] = [];
  private cache = new Map<string, CacheEntry>();
  private defaultHeaders: Record<string, string> = {};
  private defaultTimeout: number;
  private defaultBaseUrl = "";
  private cacheEnabled = false;
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(options?: {
    timeout?: number;
    baseUrl?: string;
    headers?: Record<string, string>;
    cache?: boolean;
    cacheTtlMs?: number;
  }) {
    this.defaultTimeout = options?.timeout ?? 30000;
    this.defaultBaseUrl = options?.baseUrl ?? "";
    if (options?.headers) this.defaultHeaders = options.headers;
    this.cacheEnabled = options?.cache ?? false;
    this.cacheTtlMs = options?.cacheTtlMs ?? this.cacheTtlMs;
  }

  /** Add an interceptor */
  use(interceptor: FetchInterceptor): () => void {
    this.interceptors.push(interceptor);
    return () => {
      this.interceptors = this.interceptors.filter((i) => i !== interceptor);
    };
  }

  /** Set default header for all requests */
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  /** Clear all cached responses */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Enhanced fetch with all features.
   */
  async fetch<T = unknown>(
    url: string,
    options: FetchOptions = {},
  ): Promise<T> {
    const {
      timeout = this.defaultTimeout,
      signal,
      baseUrl = this.defaultBaseUrl,
      headers = {},
      params,
      json = true,
      credentials,
      redirect,
      cache,
      retries,
      onProgress,
    } = options;

    // Build full URL
    let fullUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}` : url;

    // Append query params
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) {
        searchParams.append(k, v);
      }
      const separator = fullUrl.includes("?") ? "&" : "?";
      fullUrl += `${separator}${searchParams.toString()}`;
    }

    // Merge headers
    const mergedHeaders = { ...this.defaultHeaders, ...headers };

    // Check cache
    if (cache !== false && this.cacheEnabled) {
      const cached = this.getFromCache(fullUrl, mergedHeaders);
      if (cached) return cached as unknown as T;
    }

    // Apply request interceptors
    let currentUrl = fullUrl;
    let currentOpts: FetchOptions = { ...options, headers: mergedHeaders, timeout, signal, credentials, redirect };

    for (const interceptor of this.interceptors) {
      if (interceptor.request) {
        const result = await interceptor.request(currentUrl, currentOpts);
        currentUrl = result.url;
        currentOpts = result.options;
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      let response: Response;

      // Handle progress (for blob responses)
      if (onProgress) {
        response = await this.fetchWithProgress(
          currentUrl,
          currentOpts,
          controller.signal,
          onProgress,
        );
      } else {
        response = await window.fetch(currentUrl, {
          ...currentOpts,
          signal: signal ?? controller.signal,
        });
      }

      clearTimeout(timeoutId);

      // Apply response interceptors
      for (const interceptor of this.interceptors) {
        if (interceptor.response) {
          response = await interceptor.response(response, currentUrl, currentOpts);
        }
      }

      // Auto-retry on certain status codes
      if (retries && retries.statuses.includes(response.status)) {
        clearTimeout(timeoutId);
        return this.retry<T>(currentUrl, currentOpts, retries) as Promise<T>;
      }

      // Store in cache
      if (this.cacheEnabled && response.ok) {
        this.setCache(fullUrl, mergedHeaders, response);
      }

      // Auto-parse JSON
      if (json && response.headers.get("content-type")?.includes("json")) {
        return (await response.json()) as T;
      }

      return response as unknown as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Try error interceptors
      for (const interceptor of this.interceptors) {
        if (interceptor.error) {
          try {
            return await interceptor.error(error as Error, currentUrl, currentOpts);
          } catch { /* continue */ }
        }
      }

      throw error;
    }
  }

  /** Convenience GET */
  async get<T = unknown>(url: string, opts?: Omit<FetchOptions, "method" | "body">): Promise<T> {
    return this.fetch<T>(url, { ...opts, method: "GET" });
  }

  /** Convenience POST */
  async post<T = unknown>(url: string, body?: unknown, opts?: Omit<FetchOptions, "method">): Promise<T> {
    return this.fetch<T>(url, {
      ...opts,
      method: "POST",
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    });
  }

  /** Convenience PUT */
  async put<T = unknown>(url: string, body?: unknown, opts?: Omit<FetchOptions, "method">): Promise<T> {
    return this.fetch<T>(url, {
      ...opts,
      method: "PUT",
      body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    });
  }

  /** Convenience DELETE */
  async del<T = unknown>(url: string, opts?: Omit<FetchOptions, "method">): Promise<T> {
    return this.fetch<T>(url, { ...opts, method: "DELETE" });
  }

  // --- Private ---

  private async fetchWithProgress(
    url: string,
    options: FetchOptions,
    signal: AbortSignal,
    onProgress: (loaded: number, total: number) => void,
  ): Promise<Response> {
    const response = await fetch(url, { ...options, signal });

    if (!response.body) return response;

    const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
    let loaded = 0;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (value) {
        chunks.push(value);
        loaded += value.length;
        onProgress(loaded, contentLength > 0 ? contentLength : loaded + chunks.length * 1024);
      }
      if (done) break;
    }

    // Reconstruct response with read body
    const body = new Blob(chunks);
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  private async retry<T>(url: string, options: FetchOptions, retries: NonNullable<FetchOptions["retries"]>): Promise<T> {
    const { max = 3, delayMs = 1000, statuses = [408, 429, 500, 502, 503, 504] } = retries;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < max; attempt++) {
      try {
        return await this.fetch<T>(url, { ...options, retries: undefined });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < max - 1) {
          await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError ?? new Error("Retry failed");
  }

  private getFromCache(url: string, headers: Record<string, string>): Response | null {
    const key = `${url}:${JSON.stringify(headers)}`;
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.cacheTtlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  private setCache(url: string, headers: Record<string, string>, response: Response): void {
    const key = `${url}:${JSON.stringify(headers)}`;
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      etag: response.headers.get("etag"),
    });
  }
}

// --- Global singleton ---

let globalFetch: EnhancedFetch | null = null;

/** Get or create the global enhanced fetch instance */
export function getEnhancedFetch(options?: ConstructorParameters<typeof EnhancedFetch>): EnhancedFetch {
  if (!globalFetch) globalFetch = new EnhancedFetch(options);
  return globalFetch;
}

/** Quick GET with auto-JSON parsing */
export async function httpGet<T = unknown>(url: string, options?: Omit<FetchOptions, "method" | "body">): Promise<T> {
  return getEnhancedFetch().get<T>(url, options);
}

/** Quick POST with auto-JSON serialization */
export async function httpPost<T = unknown>(url: string, body?: unknown, options?: Omit<FetchOptions, "method">): Promise<T> {
  return getEnhancedFetch().post<T>(url, body, options);
}
