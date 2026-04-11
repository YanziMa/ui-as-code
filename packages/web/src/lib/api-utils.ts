/**
 * API utilities: request builders, response transformers,
 * pagination helpers, retry logic, and API client factory.
 */

// --- Types ---

export interface ApiPagination {
  page?: number;
  pageSize?: number;
  cursor?: string;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  status?: number;
}

export interface ApiRequestConfig {
  url: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
  baseUrl?: string;
}

// --- URL Building ---

/** Build a full URL from base + path + query params */
export function buildApiUrl(
  base: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  let url = `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  if (query && Object.keys(query).length > 0) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) {
        params.append(k, String(v));
      }
    }
    url += `?${params.toString()}`;
  }
  return url;
}

/** Append pagination query parameters */
export function appendPagination(
  url: string,
  pagination: ApiPagination,
): string {
  const params = new URLSearchParams(url.includes("?") ? url.split("?")[1] : "");
  const base = url.split("?")[0] ?? url;

  if (pagination.page) params.set("page", String(pagination.page));
  if (pagination.pageSize) params.set("pageSize", String(pagination.pageSize));
  if (pagination.cursor) params.set("cursor", pagination.cursor);
  if (pagination.offset !== undefined) params.set("offset", String(pagination.offset));

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

// --- Response Helpers ---

/** Check if a response indicates success */
export function isOkResponse(status: number): boolean {
  return status >= 200 && status < 300;
}

/** Extract error info from a fetch Response or thrown value */
export function extractApiError(error: unknown): ApiError {
  if (error instanceof Response) {
    return {
      code: `HTTP_${error.status}`,
      message: error.statusText || "Request failed",
      status: error.status,
    };
  }

  if (error instanceof Error) {
    // Try to parse JSON error body
    try {
      const parsed = JSON.parse(error.message);
      if (parsed.code || parsed.message) {
        return parsed as ApiError;
      }
    } catch { /* not JSON */ }

    return {
      code: "UNKNOWN_ERROR",
      message: error.message,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: String(error),
  };
}

/** Wrap a response in the PaginatedResponse envelope */
export function wrapPaginated<T>(
  data: T[],
  options: {
    total?: number;
    page?: number;
    pageSize?: number;
    nextCursor?: string;
    prevCursor?: string;
  } = {},
): PaginatedResponse<T> {
  const { page = 1, pageSize = data.length, total } = options;
  return {
    data,
    total,
    page,
    pageSize,
    hasNextPage: !!options.nextCursor || (total != null ? page * pageSize < total : false),
    hasPrevPage: page > 1,
    nextCursor: options.nextCursor,
    prevCursor: options.prevCursor,
  };
}

// --- Request Helpers ---

/** Create default headers for API requests */
export function createApiHeaders(
  custom?: Record<string, string>,
  authToken?: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...custom,
  };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

/** Make a simple GET request with automatic JSON parsing */
export async function apiGet<T = unknown>(
  url: string,
  options?: { query?: Record<string, string>; headers?: Record<string, string>; signal?: AbortSignal },
): Promise<T> {
  let finalUrl = url;
  if (options?.query) {
    const params = new URLSearchParams(options.query);
    finalUrl += `?${params.toString()}`;
  }

  const response = await fetch(finalUrl, {
    method: "GET",
    headers: options?.headers ?? createApiHeaders(),
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`API GET failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/** Make a simple POST request with automatic JSON parsing */
export async function apiPost<T = unknown>(
  url: string,
  body?: unknown,
  options?: { headers?: Record<string, string>; signal?: AbortSignal },
): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: options?.headers ?? createApiHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`API POST failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// --- Retry Logic ---

/** Execute an async function with exponential backoff retry */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.baseDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 10000;
  const shouldRetry = options.shouldRetry ?? ((e: unknown) => e instanceof Error);

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      options.onRetry?.(attempt + 1, error);
      await sleep(delay);
    }
  }

  throw lastError;
}

// --- Debounced Fetch ---

/** Debounce API calls — only the last call within the window executes */
export function createDebouncedFetcher<T>(
  fetcher: (...args: unknown[]) => Promise<T>,
  delayMs = 300,
): (...args: unknown[]) => Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: T) => void) | null = null;
  let pendingReject: ((error: unknown) => void) | null = null;
  let lastArgs: unknown[] = [];

  return (...args: unknown[]): Promise<T> => {
    lastArgs = args;

    if (timer) clearTimeout(timer);

    return new Promise<T>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;

      timer = setTimeout(async () => {
        try {
          const result = await fetcher(...lastArgs);
          pendingResolve?.(result);
        } catch (error) {
          pendingReject?.(error);
        }
      }, delayMs);
    });
  };
}

// --- Request Queue ---

/** Serialize concurrent requests to avoid race conditions */
export class RequestQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private active = 0;
  private readonly concurrency: number;

  constructor(concurrency = 5) {
    this.concurrency = concurrency;
  }

  /** Add a request to the queue */
  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active--;
          this.processQueue();
        }
      });
      this.processQueue();
    });
  }

  private processQueue(): void {
    while (this.active < this.concurrency && this.queue.length > 0) {
      this.active++;
      const fn = this.queue.shift()!;
      fn();
    }
  }
}

// --- Internal ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
