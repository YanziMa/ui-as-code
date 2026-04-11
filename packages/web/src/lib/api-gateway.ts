/**
 * API Gateway: Service-oriented API gateway with service registry,
 * request routing, per-service circuit breakers, request/response
 * transformation, fallback chains, and metrics collection.
 */

// --- Types ---

export interface ServiceConfig {
  /** Unique service name */
  name: string;
  /** Base URL for this service */
  baseUrl: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Auth token */
  authToken?: string;
  /** Auth scheme (default: "Bearer") */
  authScheme?: string;
  /** Timeout in ms (default: 30000) */
  timeout?: number;
  /** Circuit breaker config */
  circuitBreaker?: {
    failureThreshold: number;   // failures before opening
    resetTimeoutMs: number;     // time before half-open probe
    halfOpenMaxCalls: number;   // max calls in half-open state
  };
  /** Retry config */
  retry?: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    retryableStatuses: number[];
  };
  /** Transform request before sending */
  transformRequest?: (request: GatewayRequest) => GatewayRequest;
  /** Transform response after receiving */
  transformResponse?: <T>(response: T) => T;
  /** Fallback service name */
  fallbackService?: string;
  /** Priority (lower = higher priority) */
  priority?: number;
}

export interface GatewayRequest {
  method: string;
  path: string;
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  expectedStatus?: number[];
  signal?: AbortSignal;
}

export interface GatewayResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  ok: boolean;
  service: string;
  duration: number;
  fromCache: boolean;
  fromFallback: boolean;
}

export interface RouteConfig {
  /** Path pattern (supports :param and * wildcard) */
  pattern: string;
  /** Target service name */
  service: string;
  /** Method filter (empty = all methods) */
  methods?: string[];
  /** Rewrite path (use $1, $2 for capture groups) */
  rewrite?: string;
  /** Rate limit for this route */
  rateLimit?: { requestsPerSecond: number };
}

export interface GatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  fallbackRequests: number;
  averageLatencyMs: number;
  requestsByService: Record<string, { count: number; errors: number; avgLatency: number }>;
  circuitBreakerStates: Record<string, "closed" | "open" | "half-open">;
}

// --- Circuit Breaker States ---

type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerEntry {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  halfOpenCalls: number;
  config: NonNullable<ServiceConfig["circuitBreaker"]>;
}

// --- Main Gateway ---

export class ApiGateway {
  private services = new Map<string, ServiceConfig>();
  private routes: RouteConfig[] = [];
  private circuitBreakers = new Map<string, CircuitBreakerEntry>();
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private metrics: GatewayMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cachedRequests: 0,
    fallbackRequests: 0,
    averageLatencyMs: 0,
    requestsByService: {},
    circuitBreakerStates: {},
  };
  private latencySamples: number[] = [];
  private maxLatencySamples = 100;

  // --- Service Registry ---

  /** Register a service */
  registerService(config: ServiceConfig): void {
    this.services.set(config.name, config);

    // Initialize circuit breaker if configured
    if (config.circuitBreaker) {
      this.circuitBreakers.set(config.name, {
        state: "closed",
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        halfOpenCalls: 0,
        config: config.circuitBreaker,
      });
    }
  }

  /** Unregister a service */
  unregisterService(name: string): void {
    this.services.delete(name);
    this.circuitBreakers.delete(name);
  }

  /** Get a registered service */
  getService(name: string): ServiceConfig | undefined {
    return this.services.get(name);
  }

  /** List all registered services */
  listServices(): string[] {
    return Array.from(this.services.keys());
  }

  // --- Routing ---

  /** Add a route rule */
  addRoute(route: RouteConfig): void {
    this.routes.push(route);
  }

  /** Remove a route by pattern */
  removeRoute(pattern: string): void {
    this.routes = this.routes.filter((r) => r.pattern !== pattern);
  }

  /** Clear all routes */
  clearRoutes(): void {
    this.routes = [];
  }

  /** Resolve a request to a target service */
  private resolveRoute(method: string, path: string): { service: string; rewrittenPath: string } | null {
    // Sort routes by specificity (more specific patterns first)
    const sortedRoutes = [...this.routes].sort((a, b) => b.pattern.length - a.pattern.length);

    for (const route of sortedRoutes) {
      if (route.methods && !route.methods.includes(method)) continue;

      const match = this.matchPattern(route.pattern, path);
      if (match) {
        let rewrittenPath = path;
        if (route.rewrite) {
          rewrittenPath = route.rewrite.replace(/\$(\d+)/g, (_, n) => match[parseInt(n)] ?? "");
        }
        return { service: route.service, rewrittenPath };
      }
    }

    return null;
  }

  private matchPattern(pattern: string, path: string): string[] | null {
    const patternParts = pattern.split("/");
    const pathParts = path.split("/");

    const captures: string[] = [];
    if (patternParts.length !== pathParts.length && !pattern.includes("*")) return null;

    for (let i = 0; i < Math.max(patternParts.length, pathParts.length); i++) {
      const p = patternParts[i];
      const pp = pathParts[i];

      if (p === "*") {
        captures.push(pathParts.slice(i).join("/"));
        return captures;
      }

      if (!p || !pp) return null;
      if (p.startsWith(":")) {
        captures.push(pp);
      } else if (p !== pp) {
        return null;
      }
    }

    return captures;
  }

  // --- Request Execution ---

  /** Execute a routed request through the gateway */
  async request<T = unknown>(req: GatewayRequest): Promise<GatewayResponse<T>> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    // Resolve route
    const route = this.resolveRoute(req.method, req.path);
    const serviceName = route?.service ?? this.extractServiceFromPath(req.path);

    // Check cache
    const cacheKey = `${req.method}:${serviceName}:${req.path}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.metrics.cachedRequests++;
      this.recordLatency(performance.now() - startTime, serviceName, true);
      return {
        data: cached.data as T,
        status: 200,
        statusText: "OK",
        ok: true,
        service: serviceName,
        duration: performance.now() - startTime,
        fromCache: true,
        fromFallback: false,
      };
    }

    // Get service config
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    // Apply request transform
    let processedReq = req;
    if (service.transformRequest) {
      processedReq = service.transformRequest(req);
    }

    // Execute with circuit breaker
    try {
      const result = await this.executeWithCircuitBreaker<T>(serviceName, processedReq, service);

      // Apply response transform
      let finalData = result.data;
      if (service.transformResponse) {
        finalData = service.transformResponse(finalData);
      }

      // Cache GET responses
      if (req.method === "GET") {
        this.cache.set(cacheKey, { data: finalData, timestamp: Date.now(), ttl: 30000 });
      }

      this.metrics.successfulRequests++;
      this.recordLatency(performance.now() - startTime, serviceName, true);

      return {
        ...result,
        data: finalData,
        service: serviceName,
        duration: performance.now() - startTime,
        fromCache: false,
        fromFallback: false,
      };
    } catch (error) {
      this.metrics.failedRequests++;
      this.recordLatency(performance.now() - startTime, serviceName, false);

      // Try fallback service
      if (service.fallbackService) {
        const fallbackService = this.services.get(service.fallbackService);
        if (fallbackService) {
          this.metrics.fallbackRequests++;
          try {
            const fallbackResult = await this.executeDirect<T>(service.fallbackService, processedReq, fallbackService);
            this.metrics.successfulRequests++;
            return {
              ...fallbackResult,
              service: service.fallbackService,
              duration: performance.now() - startTime,
              fromCache: false,
              fromFallback: true,
            };
          } catch {
            // Fallback also failed
          }
        }
      }

      throw error;
    }
  }

  /** Direct request to a specific service (bypass routing) */
  async direct<T = unknown>(serviceName: string, req: GatewayRequest): Promise<GatewayResponse<T>> {
    const service = this.services.get(serviceName);
    if (!service) throw new Error(`Unknown service: ${serviceName}`);

    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      const result = await this.executeWithCircuitBreaker<T>(serviceName, req, service);
      this.metrics.successfulRequests++;
      this.recordLatency(performance.now() - startTime, serviceName, true);
      return {
        ...result,
        service: serviceName,
        duration: performance.now() - startTime,
        fromCache: false,
        fromFallback: false,
      };
    } catch (error) {
      this.metrics.failedRequests++;
      this.recordLatency(performance.now() - startTime, serviceName, false);
      throw error;
    }
  }

  // --- Convenience Methods ---

  async get<T = unknown>(path: string, options?: Omit<GatewayRequest, "method">): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, method: "GET", path });
  }

  async post<T = unknown>(path: string, body?: unknown, options?: Omit<GatewayRequest, "method" | "body">): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, method: "POST", path, body });
  }

  async put<T = unknown>(path: string, body?: unknown, options?: Omit<GatewayRequest, "method" | "body">): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, method: "PUT", path, body });
  }

  async del<T = unknown>(path: string, options?: Omit<GatewayRequest, "method">): Promise<GatewayResponse<T>> {
    return this.request<T>({ ...options, method: "DELETE", path });
  }

  // --- Metrics ---

  /** Get gateway metrics */
  getMetrics(): GatewayMetrics {
    return { ...this.metrics };
  }

  /** Reset all metrics */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      fallbackRequests: 0,
      averageLatencyMs: 0,
      requestsByService: {},
      circuitBreakerStates: {},
    };
    this.latencySamples = [];
  }

  /** Get circuit breaker state for a service */
  getCircuitBreakerState(serviceName: string): CircuitState | null {
    const cb = this.circuitBreakers.get(serviceName);
    return cb?.state ?? null;
  }

  /** Manually reset a circuit breaker */
  resetCircuitBreaker(serviceName: string): void {
    const cb = this.circuitBreakers.get(serviceName);
    if (cb) {
      cb.state = "closed";
      cb.failures = 0;
      cb.successes = 0;
    }
  }

  /** Force open a circuit breaker */
  tripCircuitBreaker(serviceName: string): void {
    const cb = this.circuitBreakers.get(serviceName);
    if (cb) {
      cb.state = "open";
      cb.lastFailureTime = Date.now();
    }
  }

  // --- Cache ---

  /** Invalidate cache entries matching a pattern */
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }

  // --- Private ---

  private extractServiceFromPath(path: string): string {
    const firstSegment = path.split("/").filter(Boolean)[0] ?? "default";
    return this.services.has(firstSegment) ? firstSegment : Array.from(this.services.keys())[0] ?? "default";
  }

  private async executeWithCircuitBreaker<T>(
    serviceName: string,
    req: GatewayRequest,
    service: ServiceConfig,
  ): Promise<Omit<GatewayResponse<T>, "service" | "duration" | "fromCache" | "fromFallback">> {
    const cb = this.circuitBreakers.get(serviceName);

    if (cb) {
      // Check circuit state
      if (cb.state === "open") {
        // Check if we should transition to half-open
        if (Date.now() - cb.lastFailureTime >= cb.config.resetTimeoutMs) {
          cb.state = "half-open";
          cb.halfOpenCalls = 0;
        } else {
          throw new Error(`Circuit breaker OPEN for service: ${serviceName}`);
        }
      }

      if (cb.state === "half-open") {
        cb.halfOpenCalls++;
        if (cb.halfOpenCalls > cb.config.halfOpenMaxCalls) {
          throw new Error(`Circuit breaker HALF-OPEN limit reached for service: ${serviceName}`);
        }
      }
    }

    const result = await this.executeDirect<T>(serviceName, req, service);

    // Update circuit breaker on success
    if (cb) {
      cb.successes++;
      if (cb.state === "half-open") {
        cb.state = "closed";
        cb.failures = 0;
      }
    }

    return result;
  }

  private async executeDirect<T>(
    serviceName: string,
    req: GatewayRequest,
    service: ServiceConfig,
  ): Promise<Omit<GatewayResponse<T>, "service" | "duration" | "fromCache" | "fromFallback">> {
    const baseUrl = service.baseUrl.replace(/\/$/, "");
    let url = `${baseUrl}/${req.path.replace(/^\//, "")}`;

    // Query params
    if (req.params && Object.keys(req.params).length > 0) {
      const sp = new URLSearchParams();
      for (const [k, v] of Object.entries(req.params)) sp.append(k, v);
      url += `?${sp.toString()}`;
    }

    // Headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...service.headers,
      ...req.headers,
    };

    if (service.authToken) {
      headers["Authorization"] = `${service.authScheme ?? "Bearer"} ${service.authToken}`;
    }

    const timeout = req.timeout ?? service.timeout ?? 30000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: req.method,
        headers,
        body: req.body ? (typeof req.body === "string" ? req.body : JSON.stringify(req.body)) : undefined,
        signal: req.signal ?? controller.signal,
      });

      clearTimeout(timer);

      const responseData = response.headers.get("content-type")?.includes("json")
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

      const expectedStatus = req.expectedStatus ?? [200, 201, 204];
      if (!expectedStatus.includes(response.status)) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        this.recordCircuitFailure(serviceName);
        throw error;
      }

      return {
        data: responseData as T,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      };
    } catch (err) {
      clearTimeout(timer);
      this.recordCircuitFailure(serviceName);
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  private recordCircuitFailure(serviceName: string): void {
    const cb = this.circuitBreakers.get(serviceName);
    if (!cb) return;

    cb.failures++;
    cb.lastFailureTime = Date.now();

    if (cb.state === "closed" && cb.failures >= cb.config.failureThreshold) {
      cb.state = "open";
    } else if (cb.state === "half-open") {
      cb.state = "open";
      cb.lastFailureTime = Date.now();
    }

    this.metrics.circuitBreakerStates[serviceName] = cb.state;
  }

  private recordLatency(ms: number, service: string, success: boolean): void {
    this.latencySamples.push(ms);
    if (this.latencySamples.length > this.maxLatencySamples) {
      this.latencySamples.shift();
    }

    this.metrics.averageLatencyMs =
      this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length;

    if (!this.metrics.requestsByService[service]) {
      this.metrics.requestsByService[service] = { count: 0, errors: 0, avgLatency: 0 };
    }

    const svc = this.metrics.requestsByService[service];
    svc.count++;
    if (!success) svc.errors;
    svc.avgLatency = ms; // Simplified — just track latest
  }
}

/** Create an API Gateway instance */
export function createApiGateway(): ApiGateway {
  return new ApiGateway();
}
