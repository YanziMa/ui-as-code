/**
 * REST API Client: High-level RESTful resource client with OpenAPI-like
 * resource definitions, endpoint-level rate limiting, request deduplication,
 * automatic pagination, response caching, and schema-based validation.
 */

// --- Types ---

export interface RestResourceConfig {
  /** Base path for this resource (e.g., "/users") */
  basePath: string;
  /** Singular name (used in error messages) */
  singular?: string;
  /** Plural name (default: basePath without slash) */
  plural?: string;
  /** Default query parameters for all requests */
  defaultParams?: Record<string, string>;
  /** Default headers for this resource */
  headers?: Record<string, string>;
  /** Transform response data */
  transform?: <T>(data: T) => T;
  /** Enable caching for GET requests? */
  cacheable?: boolean;
  /** Cache TTL in ms (default: 30000) */
  cacheTtl?: number;
  /** Rate limit config for this resource */
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface RestEndpointDefinition {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description?: string;
  /** Expected response shape (for documentation/validation) */
  responseSchema?: Record<string, unknown>;
  /** Request body schema */
  requestSchema?: Record<string, unknown>;
  /** Parameters schema */
  paramsSchema?: Record<string, { type: string; required?: boolean }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
  /** Cursor-based pagination token */
  cursor?: string;
  /** Use cursor-based pagination instead of offset */
  cursorBased?: boolean;
}

export interface RestClientConfig {
  /** Base URL for the API */
  baseUrl: string;
  /** Auth token */
  authToken?: string;
  /** Auth header name (default: "Authorization") */
  authHeader?: string;
  /** Auth scheme (default: "Bearer") */
  authScheme?: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Global rate limit */
  globalRateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  /** Enable debug logging */
  debug?: boolean;
  /** Default pagination settings */
  defaultPagination?: {
    pageSize: number;
    maxPageSize: number;
  };
  /** Response interceptor */
  onResponse?: <T>(response: T) => T;
  /** Error interceptor */
  onError?: (error: RestError) => void | Promise<void>;
}

export class RestError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public code?: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(`REST ${status}: ${statusText}${code ? ` (${code})` : ""}`);
    this.name = "RestError";
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// --- Cache ---

class ResponseCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize = 200;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set(key: string, data: unknown, ttl: number): void {
    if (this.store.size >= this.maxSize) {
      // Evict oldest entry
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, { data, timestamp: Date.now(), ttl, key });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.store.clear();
      return;
    }

    for (const key of this.store.keys()) {
      if (key.includes(pattern)) this.store.delete(key);
    }
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

// --- Deduplicator ---

class RequestDeduplicator {
  private pending = new Map<string, PendingRequest<unknown>>();
  private maxAge = 5000; // 5 seconds

  async dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      // Check if still valid
      if (Date.now() - existing.timestamp < this.maxAge) {
        return existing.promise as Promise<T>;
      }
      this.pending.delete(key);
    }

    const promise = fn();
    this.pending.set(key, { promise: promise as Promise<unknown>, timestamp: Date.now() });

    try {
      return await promise;
    } finally {
      // Clean up after a short delay
      setTimeout(() => this.pending.delete(key), this.maxAge);
    }
  }

  clear(): void {
    this.pending.clear();
  }
}

// --- Rate Limiter ---

class RateLimiter {
  private buckets = new Map<string, RateLimitEntry>();

  async acquire(key: string, limit: { maxRequests: number; windowMs: number }): Promise<void> {
    const now = Date.now();
    let entry = this.buckets.get(key);

    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + limit.windowMs };
      this.buckets.set(key, entry);
    }

    entry.count++;

    if (entry.count > limit.maxRequests) {
      const waitTime = entry.resetAt - now;
      if (waitTime > 0) {
        await new Promise((r) => setTimeout(r, waitTime));
        // Reset and retry once
        this.buckets.delete(key);
        return this.acquire(key, limit);
      }
    }
  }

  clear(): void {
    this.buckets.clear();
  }
}

// --- Main Client ---

export class RestClient {
  private config: Required<RestClientConfig>;
  private cache = new ResponseCache();
  private deduplicator = new RequestDeduplicator();
  private rateLimiter = new RateLimiter();
  private resources = new Map<string, RestResourceConfig>();

  constructor(config: RestClientConfig) {
    this.config = {
      timeout: 30000,
      authHeader: "Authorization",
      authScheme: "Bearer",
      debug: false,
      defaultPagination: { pageSize: 20, maxPageSize: 100 },
      ...config,
    };
  }

  /** Register a REST resource */
  resource(config: RestResourceConfig): RestResourceHandler {
    const plural = config.plural ?? config.basePath.replace(/^\//, "");
    const singular = config.singular ?? plural.replace(/s$/, "");
    const fullConfig = { ...config, plural, singular };

    this.resources.set(plural, fullConfig);

    return new RestResourceHandler(this, fullConfig);
  }

  /** Get a registered resource by name */
  getResource(name: string): RestResourceHandler | undefined {
    const config = this.resources.get(name);
    if (!config) return undefined;
    return new RestResourceHandler(this, config);
  }

  /** List all registered resources */
  listResources(): string[] {
    return Array.from(this.resources.keys());
  }

  /** Clear all caches */
  clearCache(): void {
    this.cache.clear();
  }

  /** Invalidate cache matching pattern */
  invalidateCache(pattern?: string): void {
    this.cache.invalidate(pattern);
  }

  /** Get cache stats */
  getCacheStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: 200 };
  }

  // --- Internal fetch ---

  async fetch<T = unknown>(
    method: string,
    path: string,
    options: {
      body?: unknown;
      params?: Record<string, string>;
      headers?: Record<string, string>;
      expectedStatus?: number[];
      cacheKey?: string;
      cacheTtl?: number;
      dedupKey?: string;
      rateLimitKey?: string;
      rateLimit?: { maxRequests: number; windowMs: number };
    } = {},
  ): Promise<T> {
    const {
      body,
      params,
      headers: extraHeaders,
      expectedStatus,
      cacheKey,
      cacheTtl,
      dedupKey,
      rateLimitKey,
      rateLimit,
    } = options;

    // Check cache for GET requests
    if (method === "GET" && cacheKey) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== null) {
        if (this.config.debug) console.log(`[REST] Cache hit: ${cacheKey}`);
        return cached;
      }
    }

    // Apply rate limiting
    const rl = rateLimit ?? (this.config.globalRateLimit ? { ...this.config.globalRateLimit } : undefined);
    if (rateLimitKey && rl) {
      await this.rateLimiter.acquire(rateLimitKey, rl);
    }

    // Deduplicate concurrent identical requests
    const execute = async (): Promise<T> => {
      // Build URL
      let url = `${this.config.baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

      if (params && Object.keys(params).length > 0) {
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) sp.append(k, v);
        url += `?${sp.toString()}`;
      }

      // Build headers
      const reqHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...this.config.headers,
        ...extraHeaders,
      };

      if (this.config.authToken) {
        reqHeaders[this.config.authHeader] = `${this.config.authScheme} ${this.config.authToken}`;
      }

      // Execute
      if (this.config.debug) {
        console.log(`[REST] ${method} ${url}`);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(url, {
          method,
          headers: reqHeaders,
          body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timer);

        const responseData = response.headers.get("content-type")?.includes("json")
          ? await response.json().catch(() => null)
          : await response.text().catch(() => null);

        // Check expected status
        const expected = expectedStatus ?? [200, 201, 204];
        if (!expected.includes(response.status)) {
          const error = new RestError(
            response.status,
            response.statusText,
            (responseData as Record<string, unknown>)?.code as string ?? undefined,
            responseData,
            response.headers.get("x-request-id") ?? undefined,
          );

          if (this.config.onError) await this.config.onError(error);
          throw error;
        }

        // Apply response transform
        let result = responseData;
        if (this.config.onResponse) {
          result = this.config.onResponse(result);
        }

        // Cache GET responses
        if (method === "GET" && cacheKey && cacheTtl) {
          this.cache.set(cacheKey, result, cacheTtl);
        }

        return result as T;
      } catch (err) {
        clearTimeout(timer);

        if (err instanceof RestError) throw err;

        const error = err instanceof Error ? err : new Error(String(err));
        const restError = new RestError(0, error.message);
        if (this.config.onError) await this.config.onError(restError);
        throw restError;
      }
    };

    if (dedupKey) {
      return this.deduplicator.dedup(dedupKey, execute);
    }

    return execute();
  }

  /** Raw GET request */
  async get<T = unknown>(path: string, options?: Omit<Parameters<typeof this.fetch>[2], "method">): Promise<T> {
    return this.fetch<T>("GET", path, options);
  }

  /** Raw POST request */
  async post<T = unknown>(path: string, body?: unknown, options?: Omit<Parameters<typeof this.fetch>[2], "method" | "body">): Promise<T> {
    return this.fetch<T>("POST", path, { ...options, body });
  }

  /** Raw PUT request */
  async put<T = unknown>(path: string, body?: unknown, options?: Omit<Parameters<typeof this.fetch>[2], "method" | "body">): Promise<T> {
    return this.fetch<T>("PUT", path, { ...options, body });
  }

  /** Raw PATCH request */
  async patch<T = unknown>(path: string, body?: unknown, options?: Omit<Parameters<typeof this.fetch>[2], "method" | "body">): Promise<T> {
    return this.fetch<T>("PATCH", path, { ...options, body });
  }

  /** Raw DELETE request */
  async del<T = unknown>(path: string, options?: Omit<Parameters<typeof this.fetch>[2], "method">): Promise<T> {
    return this.fetch<T>("DELETE", path, options);
  }
}

// --- Resource Handler ---

export class RestResourceHandler {
  private client: RestClient;
  private config: RestResourceConfig;

  constructor(client: RestClient, config: RestResourceConfig) {
    this.client = client;
    this.config = config;
  }

  private buildPath(suffix: string = ""): string {
    return `${this.config.basePath.replace(/\/$/, "")}${suffix}`;
  }

  private mergeParams(params?: Record<string, string>): Record<string, string> {
    return { ...this.config.defaultParams, ...params };
  }

  /** Get all items (paginated) */
  async getAll<T>(pagination?: PaginationOptions): Promise<PaginatedResponse<T>> {
    const { page = 1, pageSize = this.client.config.defaultPagination.pageSize, sortBy, sortOrder, cursor, cursorBased } = pagination ?? {};

    const params: Record<string, string> = this.mergeParams({
      ...(cursorBased && cursor ? { cursor } : { page: String(page), per_page: String(pageSize) }),
      ...(sortBy ? { sort_by: sortBy } : {}),
      ...(sortOrder ? { sort_order: sortOrder } : {}),
    });

    const data = await this.client.get<PaginatedResponse<T>>(this.buildPath(), {
      params,
      cacheKey: `${this.config.plural}:list:${JSON.stringify(params)}`,
      cacheTtl: this.config.cacheTtl ?? 30000,
      headers: this.config.headers,
    });

    return this.config.transform ? this.config.transform(data) : data;
  }

  /** Get all items (unpaginated, fetches all pages) */
  async getAllUnpaginated<T>(): Promise<T[]> {
    const firstPage = await this.getAll<T>({ page: 1, pageSize: this.client.config.defaultPagination.maxPageSize });
    const allItems = [...firstPage.data];

    if (firstPage.meta.hasNext) {
      const totalPages = firstPage.meta.totalPages;
      for (let page = 2; page <= totalPages; page++) {
        const pageData = await this.getAll<T>({ page });
        allItems.push(...pageData.data);
      }
    }

    return allItems;
  }

  /** Get single item by ID */
  async getById<T>(id: string | number): Promise<T> {
    const data = await this.client.get<T>(this.buildPath(`/${id}`), {
      cacheKey: `${this.config.singular}:${id}`,
      cacheTtl: this.config.cacheTtl ?? 60000,
      headers: this.config.headers,
    });
    return this.config.transform ? this.config.transform(data) : data;
  }

  /** Get item by custom field */
  async getBy<T>(field: string, value: string): Promise<T> {
    const data = await this.client.get<T>(this.buildPath(), {
      params: this.mergeParams({ [field]: value }),
      cacheKey: `${this.config.singular}:${field}:${value}`,
      cacheTtl: this.config.cacheTtl ?? 60000,
      headers: this.config.headers,
    });
    return this.config.transform ? this.config.transform(data) : data;
  }

  /** Create item */
  async create<T>(data: unknown): Promise<T> {
    const result = await this.client.post<T>(this.buildPath(), data, {
      headers: this.config.headers,
      rateLimitKey: `${this.config.plural}:write`,
      rateLimit: this.config.rateLimit,
    });
    // Invalidate list cache
    this.client.invalidateCache(`${this.config.plural}:`);
    return this.config.transform ? this.config.transform(result) : result;
  }

  /** Update item (PUT) */
  async update<T>(id: string | number, data: unknown): Promise<T> {
    const result = await this.client.put<T>(this.buildPath(`/${id}`), data, {
      headers: this.config.headers,
      rateLimitKey: `${this.config.plural}:write`,
      rateLimit: this.config.rateLimit,
    });
    // Invalidate caches
    this.client.invalidateCache(`${this.config.singular}:${id}`);
    this.client.invalidateCache(`${this.config.plural}:`);
    return this.config.transform ? this.config.transform(result) : result;
  }

  /** Partial update (PATCH) */
  async patchItem<T>(id: string | number, data: unknown): Promise<T> {
    const result = await this.client.patch<T>(this.buildPath(`/${id}`), data, {
      headers: this.config.headers,
      rateLimitKey: `${this.config.plural}:write`,
      rateLimit: this.config.rateLimit,
    });
    this.client.invalidateCache(`${this.config.singular}:${id}`);
    this.client.invalidateCache(`${this.config.plural}:`);
    return this.config.transform ? this.config.transform(result) : result;
  }

  /** Delete item */
  async remove(id: string | number): Promise<void> {
    await this.client.del(this.buildPath(`/${id}`), {
      expectedStatus: [200, 204],
      headers: this.config.headers,
      rateLimitKey: `${this.config.plural}:write`,
      rateLimit: this.config.rateLimit,
    });
    this.client.invalidateCache(`${this.config.singular}:${id}`);
    this.client.invalidateCache(`${this.config.plural}:`);
  }

  /** Bulk create items */
  async bulkCreate<T>(items: unknown[]): Promise<T[]> {
    const results = await this.client.post<T[]>(this.buildPath("/bulk"), { items }, {
      headers: this.config.headers,
    });
    this.client.invalidateCache(`${this.config.plural}:`);
    return results;
  }

  /** Bulk delete items */
  async bulkRemove(ids: (string | number)[]): Promise<void> {
    await this.client.post(this.buildPath("/bulk-delete"), { ids }, {
      expectedStatus: [200, 204],
      headers: this.config.headers,
    });
    this.client.invalidateCache(`${this.config.plural}:`);
  }

  /** Search items */
  async search<T>(query: string, options?: PaginationOptions & { fields?: string[] }): Promise<PaginatedResponse<T>> {
    const params: Record<string, string> = this.mergeParams({
      q: query,
      ...(options?.fields ? { fields: options.fields.join(",") } : {}),
      ...(options?.page ? { page: String(options.page) } : {}),
      ...(options?.pageSize ? { per_page: String(options.pageSize) } : {}),
    });

    return this.client.get<PaginatedResponse<T>>(this.buildPath("/search"), {
      params,
      headers: this.config.headers,
    });
  }

  /** Count items */
  async count(filters?: Record<string, string>): Promise<number> {
    const result = await this.client.get<{ count: number }>(this.buildPath("/count"), {
      params: this.mergeParams(filters),
      cacheKey: `${this.config.plural}:count:${JSON.stringify(filters)}`,
      cacheTtl: 15000,
      headers: this.config.headers,
    });
    return result.count;
  }

  /** Check if item exists */
  async exists(id: string | number): Promise<boolean> {
    try {
      await this.client.head(this.buildPath(`/${id}`), {
        headers: this.config.headers,
        expectedStatus: [200],
      });
      return true;
    } catch {
      return false;
    }
  }
}

/** Create a pre-configured REST client */
export function createRestClient(config: RestClientConfig): RestClient {
  return new RestClient(config);
}
