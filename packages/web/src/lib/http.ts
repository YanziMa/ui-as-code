/**
 * HTTP client utilities for API communication.
 */

export interface HttpRequestConfig {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
  cache?: RequestCache;
}

export interface HttpResponse<T = unknown> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T;
  headers: Headers;
  url: string;
}

export interface HttpError extends Error {
  status: number;
  statusText: string;
  data: unknown;
  headers: Headers;
}

/** Base URL for all requests (can be configured) */
let baseUrl = "";

export function setBaseUrl(url: string): void {
  baseUrl = url.replace(/\/+$/, "");
}

export function getBaseUrl(): string {
  return baseUrl;
}

/** Make an HTTP request */
export async function httpRequest<T = unknown>(
  url: string,
  config: HttpRequestConfig = {},
): Promise<HttpResponse<T>> {
  const {
    method = "GET",
    headers = {},
    body,
    query,
    timeout = 30000,
    signal,
    credentials = "same-origin",
  } = config;

  // Build full URL
  let fullUrl = url.startsWith("http") ? url : `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;

  // Append query params
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams(query);
    fullUrl += `${fullUrl.includes("?") ? "&" : "?"}${params.toString()}`;
  }

  // Build request options
  const init: RequestInit = {
    method,
    credentials,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers,
    },
    signal,
  };

  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Use provided signal or our timeout signal
  init.signal = signal ?? controller.signal;

  try {
    const response = await fetch(fullUrl, init);
    clearTimeout(timeoutId);

    // Parse response
    let data: T;

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("json")) {
      data = await response.json();
    } else {
      data = await response.text() as unknown as T;
    }

    if (!response.ok) {
      const error: HttpError = new Error(`HTTP ${response.status}: ${response.statusText}`) as HttpError;
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = data;
      error.headers = response.headers;
      throw error;
    }

    return {
      ok: true,
      status: response.status,
      statusText: response.statusText,
      data,
      headers: response.headers,
      url: fullUrl,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if ((error as Error).name === "AbortError") {
      const timeoutError: HttpError = new Error("Request timed out") as HttpError;
      timeoutError.status = 408;
      timeoutError.statusText = "Request Timeout";
      throw timeoutError;
    }

    throw error;
  }
}

/** Convenience methods */
export const http = {
  get<T>(url: string, config?: Omit<HttpRequestConfig, "method" | "body">): Promise<HttpResponse<T>> {
    return httpRequest<T>(url, { ...config, method: "GET" });
  },

  post<T>(url: string, body?: unknown, config?: Omit<HttpRequestConfig, "method">): Promise<HttpResponse<T>> {
    return httpRequest<T>(url, { ...config, method: "POST", body });
  },

  put<T>(url: string, body?: unknown, config?: Omit<HttpRequestConfig, "method">): Promise<HttpResponse<T>> {
    return httpRequest<T>(url, { ...config, method: "PUT", body });
  },

  patch<T>(url: string, body?: unknown, config?: Omit<HttpRequestConfig, "method">): Promise<HttpResponse<T>> {
    return httpRequest<T>(url, { ...config, method: "PATCH", body });
  },

  delete<T>(url: string, config?: Omit<HttpRequestConfig, "method" | "body">): Promise<HttpResponse<T>> {
    return httpRequest<T>(url, { ...config, method: "DELETE" });
  },

  head<T>(url: string, config?: Omit<HttpRequestConfig, "method" | "body">): Promise<HttpResponse<T>> {
    return httpRequest<T>(url, { ...config, method: "HEAD" });
  },
};

/** Retry a failed request with exponential backoff */
export async function retryHttp<T>(
  fn: () => Promise<HttpResponse<T>>,
  options?: { maxRetries?: number; baseDelayMs?: number; shouldRetry?: (error: unknown) => boolean },
): Promise<HttpResponse<T>> {
  const { maxRetries = 3, baseDelayMs = 1000, shouldRetry } = options ?? {};

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error instanceof Error && "status" in error && typeof (error as HttpError).status === "number" && (error as HttpError).status < 500) {
        throw error;
      }

      // Check custom shouldRetry
      if (shouldRetry && !shouldRetry(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt <= maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
