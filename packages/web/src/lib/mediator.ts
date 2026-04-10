/**
 * Mediator Pattern: Centralized request/response routing between decoupled
 * components. Supports synchronous and async handlers, priority ordering,
 * handler chaining, middleware, and request cancellation.
 */

// --- Types ---

export type RequestHandler<TRequest = unknown, TResponse = unknown> = (
  request: TRequest,
  next?: () => Promise<TResponse>,
) => TResponse | Promise<TResponse>;

export type Middleware<T = unknown> = (
  context: MediatorContext<T>,
  next: () => Promise<unknown>,
) => Promise<void>;

export interface MediatorContext<T = unknown> {
  /** The request being processed */
  request: T;
  /** Request type/name */
  type: string;
  /** Handler that will process this request (or undefined if not yet resolved) */
  handler?: RequestHandler;
  /** Cancellation token */
  cancelled: boolean;
  /** Custom metadata */
  metadata: Record<string, unknown>;
  /** Cancel this request */
  cancel(): void;
}

export interface HandlerRegistration {
  id: string;
  type: string;
  handler: RequestHandler;
  priority: number;
  createdAt: number;
}

export interface MediatorOptions {
  /** Enable strict mode — throw if no handler found for a request type */
  strict?: boolean;
  /** Default timeout for async requests (ms) */
  defaultTimeout?: number;
  /** Global error handler */
  onError?: (error: Error, type: string, request: unknown) => void;
}

export interface MediatorStats {
  totalRequests: number;
  totalHandled: number;
  totalErrors: number;
  registeredHandlers: number;
  registeredMiddleware: number;
  averageLatencyMs: number;
}

// --- Mediator ---

/**
 * Central mediator that routes requests to handlers.
 *
 * Components communicate through the mediator without knowing about each other.
 * Each request has a type string that maps to one or more handlers.
 *
 * @example
 * const mediator = new Mediator();
 *
 * // Register handler
 * mediator.handle("getUser", async ({ userId }) => {
 *   return await db.users.find(userId);
 * });
 *
 * // Send request
 * const user = await mediator.send({ type: "getUser", userId: 42 });
 */
export class Mediator {
  private handlers = new Map<string, HandlerRegistration[]>();
  private middleware: Middleware[] = [];
  private stats: MediatorStats = {
    totalRequests: 0,
    totalHandled: 0,
    totalErrors: 0,
    registeredHandlers: 0,
    registeredMiddleware: 0,
    averageLatencyMs: 0,
  };
  private options: Required<Pick<MediatorOptions, "strict" | "defaultTimeout">>;
  private errorHandler: ((error: Error, type: string, request: unknown) => void) | null = null;

  constructor(options: MediatorOptions = {}) {
    this.options = {
      strict: options.strict ?? false,
      defaultTimeout: options.defaultTimeout ?? 30000,
    };
    this.errorHandler = options.onError ?? null;
  }

  /**
   * Register a handler for a request type.
   * Multiple handlers can be registered; they execute in priority order.
   */
  handle<TRequest = unknown, TResponse = unknown>(
    type: string,
    handler: RequestHandler<TRequest, TResponse>,
    options?: { priority?: number },
  ): () => void {
    const registration: HandlerRegistration = {
      id: `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      handler: handler as RequestHandler,
      priority: options?.priority ?? 0,
      createdAt: Date.now(),
    };

    let list = this.handlers.get(type);
    if (!list) {
      list = [];
      this.handlers.set(type, list);
    }
    list.push(registration);
    // Sort by priority descending (higher = first)
    list.sort((a, b) => b.priority - a.priority);
    this.stats.registeredHandlers++;

    return () => {
      const idx = list!.indexOf(registration);
      if (idx !== -1) {
        list!.splice(idx, 1);
        this.stats.registeredHandlers--;
        if (list!.length === 0) this.handlers.delete(type);
      }
    };
  }

  /**
   * Send a request and get a response.
   * Routes to the highest-priority matching handler.
   */
  async send<TResponse = unknown, TRequest = unknown>(
    request: TRequest & { type?: string },
    options?: { timeout?: number },
  ): Promise<TResponse> {
    const type = (request as any).type ?? "__anonymous__";
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const timeout = options?.timeout ?? this.options.defaultTimeout;
      const result = await this._execute<TResponse>(type, request, timeout);
      const latency = Date.now() - startTime;
      this.stats.averageLatencyMs =
        (this.stats.averageLatencyMs * (this.stats.totalHandled) + latency) /
        (this.stats.totalHandled + 1);
      this.stats.totalHandled++;
      return result;
    } catch (err) {
      this.stats.totalErrors++;
      this.errorHandler?.(err as Error, type, request);
      throw err;
    }
  }

  /**
   * Send a request synchronously (handler must be sync).
   */
  sendSync<TResponse = unknown, TRequest = unknown>(
    request: TRequest & { type?: string },
  ): TResponse {
    const type = (request as any).type ?? "__anonymous__";
    this.stats.totalRequests++;

    const list = this.handlers.get(type);
    if (!list || list.length === 0) {
      if (this.options.strict) throw new Error(`[Mediator] No handler for "${type}"`);
      return undefined as TResponse;
    }

    const handler = list[0]!.handler;
    const result = handler(request);
    this.stats.totalHandled++;
    return result as TResponse;
  }

  /**
   * Send a notification (fire-and-forget, no response expected).
   */
  notify<TRequest = unknown>(request: TRequest & { type?: string }): void {
    void this.send(request);
  }

  /**
   * Publish an event to ALL matching handlers (not just the first).
   * Returns results from all handlers.
   */
  async publish<TResponse = unknown, TRequest = unknown>(
    request: TRequest & { type?: string },
  ): Promise<TResponse[]> {
    const type = (request as any).type ?? "__anonymous__";
    this.stats.totalRequests++;

    const list = this.handlers.get(type);
    if (!list || list.length === 0) {
      if (this.options.strict) throw new Error(`[Mediator] No handler for "${type}"`);
      return [];
    }

    const results: TResponse[] = [];
    for (const reg of list) {
      try {
        const result = await reg.handler(request);
        results.push(result as TResponse);
        this.stats.totalHandled++;
      } catch (err) {
        this.stats.totalErrors++;
        this.errorHandler?.(err as Error, type, request);
      }
    }
    return results;
  }

  /**
   * Add middleware that runs before/after all requests.
   */
  use(middleware: Middleware): () => void {
    this.middleware.push(middleware);
    this.stats.registeredMiddleware++;
    let idx = this.middleware.length - 1;
    return () => {
      this.middleware.splice(idx, 1);
      this.stats.registeredMiddleware--;
      idx--;
    };
  }

  /** Check if a handler is registered for a type */
  hasHandler(type: string): boolean {
    return (this.handlers.get(type)?.length ?? 0) > 0;
  }

  /** Get all registered handler types */
  getHandlerTypes(): string[] {
    return [...this.handlers.keys()];
  }

  /** Get statistics */
  getStats(): MediatorStats {
    return { ...this.stats };
  }

  /** Remove all handlers and middleware */
  clear(): void {
    this.handlers.clear();
    this.middleware = [];
    this.stats.registeredHandlers = 0;
    this.stats.registeredMiddleware = 0;
  }

  // --- Private ---

  private async _execute<TResponse>(
    type: string,
    request: unknown,
    timeout: number,
  ): Promise<TResponse> {
    const list = this.handlers.get(type);
    if (!list || list.length === 0) {
      if (this.options.strict) throw new Error(`[Mediator] No handler for "${type}"`);
      return undefined as TResponse;
    }

    const handler = list[0]!.handler;

    // Build context
    let cancelled = false;
    const context: MediatorContext = {
      request,
      type,
      handler: handler as RequestHandler,
      cancelled: false,
      metadata: {},
      cancel: () => { cancelled = true; },
    };

    // Run middleware chain
    let middlewareIndex = 0;
    const runMiddleware = async (): Promise<unknown> => {
      if (cancelled) throw new Error("Request cancelled");
      if (middlewareIndex < this.middleware.length) {
        const mw = this.middleware[middlewareIndex++]!;
        await mw(context, runMiddleware);
      }
      return undefined;
    };

    await runMiddleware();

    if (cancelled) throw new Error("Request cancelled");

    // Execute handler with optional timeout
    if (timeout > 0 && timeout !== Infinity) {
      return Promise.race([
        handler(request),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`[Mediator] Timeout after ${timeout}ms`)), timeout),
        ),
      ]) as Promise<TResponse>;
    }

    return handler(request) as Promise<TResponse>;
  }
}

/** Create a new Mediator instance */
export function createMediator(options?: MediatorOptions): Mediator {
  return new Mediator(options);
}
