/**
 * Comprehensive Web Workers utility library for browser environments.
 *
 * Provides worker creation, management, message passing patterns,
 * task execution, communication primitives, error handling, and
 * performance measurement utilities for dedicated and shared workers.
 *
 * @module web-workers
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Metadata about a worker's execution environment. */
export interface WorkerInfo {
  isWorker: boolean;
  isSharedWorker: boolean;
  isServiceWorker: boolean;
  type: "main" | "dedicated" | "shared" | "service";
}

/** Performance metrics collected from a worker task run. */
export interface WorkerMetrics {
  executionTime: number;
  memoryUsage?: number;
  transferSize: number;
}

/** A pool of reusable Worker instances. */
export interface WorkerPool {
  acquire(): Worker;
  release(worker: Worker): void;
  size: number;
  busyCount: number;
  destroy(): void;
}

/** Options for the WorkerErrorBoundary. */
export interface ErrorBoundaryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  fallbackValue?: unknown;
  retryDelayMs?: number;
  onError?: (error: Error, attempt: number) => void;
}

/** Result from a guarded worker call. */
export interface ErrorBoundaryResult<T = unknown> {
  success: boolean;
  data: T | undefined;
  error?: Error;
  attempts: number;
  elapsedMs: number;
}

/** Health status reported by DeadWorkerDetector. */
export interface WorkerHealthStatus {
  worker: Worker;
  alive: boolean;
  lastResponseTime: number;
  missedPings: number;
}

/** Stream chunk emitted by StreamWorker. */
export interface StreamChunk<T = unknown> {
  index: number;
  data: T;
  done: boolean;
  total?: number;
}

/** Listener for stream chunks. */
export type StreamListener<T> = (chunk: StreamChunk<T>) => void;

/** Unsubscribe handle returned by PubSub / StreamWorker. */
export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function resolveSource(urlOrFn: string | (() => void)): { url: string; revoke: (() => void) | null } {
  if (typeof urlOrFn === "string") return { url: urlOrFn, revoke: null };
  const blob = new Blob([`(${urlOrFn.toString()})()`], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

function safeRevoke(revoke: (() => void) | null, worker: Worker): void {
  if (!revoke) return;
  const cleanup = (): void => { revoke(); };
  worker.addEventListener("error", cleanup, { once: true });
  setTimeout(cleanup, 30_000);
}

// ---------------------------------------------------------------------------
// 1. Worker Creation & Management
// ---------------------------------------------------------------------------

/**
 * Create a dedicated Web Worker from a URL or inline function.
 *
 * When a function is provided it is serialized into a Blob-backed Worker,
 * so no external script file is required.
 *
 * @param urlOrFn - Script URL or self-contained function.
 * @param options - Standard `WorkerOptions`.
 * @returns The created `Worker` instance.
 */
export function createWorker(urlOrFn: string | (() => void), options?: WorkerOptions): Worker {
  const { url, revoke } = resolveSource(urlOrFn);
  const worker = new Worker(url, options);
  safeRevoke(revoke, worker);
  return worker;
}

/**
 * Create a SharedWorker from a URL or inline function.
 *
 * SharedWorkers are shared across multiple browsing contexts (tabs/iframes)
 * via the `worker.port` MessagePort.
 *
 * @param urlOrFn - Script URL or self-contained function.
 * @param options - Standard `WorkerOptions`.
 * @returns The created `SharedWorker` instance.
 */
export function createSharedWorker(urlOrFn: string | (() => void), options?: WorkerOptions): SharedWorker {
  const { url, revoke } = resolveSource(urlOrFn);
  const worker = new SharedWorker(url, options?.name ?? (options as unknown as string));
  if (revoke) { worker.port.addEventListener("error", () => revoke(), { once: true }); setTimeout(() => revoke(), 30_000); }
  return worker;
}

/**
 * Safely terminate a Worker, clearing all listeners first.
 */
export function terminateWorker(worker: Worker): void {
  if (!worker) return;
  try { worker.onmessage = null; worker.onerror = null; worker.onmessageerror = null; worker.terminate(); } catch { /* already terminated */ }
}

/**
 * Create a pool of reusable Workers with round-robin or least-busy scheduling.
 *
 * @param opts - Pool configuration (`size`, `scriptUrl`, `workerFactory`, `strategy`).
 * @returns A `WorkerPool` instance.
 */
export function workerPool(opts?: {
  size?: number; scriptUrl?: string | (() => void); workerFactory?: () => Worker; strategy?: "round-robin" | "least-busy";
}): WorkerPool {
  const size = opts?.size ?? 4;
  const strategy = opts?.strategy ?? "round-robin";
  const pool: { w: Worker; busy: boolean }[] = [];
  let destroyed = false, rrIdx = 0;

  const make = (): { w: Worker; busy: boolean } => ({
    w: opts?.workerFactory ? opts.workerFactory()
      : typeof opts?.scriptUrl === "string" ? new Worker(opts.scriptUrl)
      : typeof opts?.scriptUrl === "function" ? createWorker(opts.scriptUrl)
      : createWorker(() => { self.onmessage = (e: MessageEvent) => { if (e.data?.type === "__ping__") postMessage({ type: "__pong__", id: e.data.id }); }; }),
    busy: false,
  });
  for (let i = 0; i < size; i++) pool.push(make());

  return {
    acquire() {
      if (destroyed) throw new Error("WorkerPool destroyed");
      const pick = strategy === "least-busy"
        ? pool.reduce((b, c) => (!c.busy && b.busy || !c.busy && !b.busy) ? c : b, pool[0])
        : pool[rrIdx++ % size];
      pick.busy = true;
      return pick.w;
    },
    release(w: Worker) { const e = pool.find((p) => p.w === w); if (e) { e.busy = false; } },
    get size() { return pool.length; },
    get busyCount() { return pool.filter((p) => p.busy).length; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const p of pool) terminateWorker(p.w);
      pool.length = 0;
    },
  };
}

// ---------------------------------------------------------------------------
// 2. Message Passing
// ---------------------------------------------------------------------------

/**
 * Send data to a worker and await its reply (request-response pattern).
 * Uses correlation IDs so multiple concurrent calls are safe.
 */
export async function postMessage<TSend = unknown, TReceive = unknown>(
  worker: Worker, data: TSend, transferables?: Transferable[],
): Promise<TReceive> {
  return new Promise<TReceive>((resolve, reject) => {
    const id = generateCorrelationId();
    const handler = (e: MessageEvent): void => {
      if (e.data?.__correlationId === id) {
        worker.removeEventListener("message", handler);
        e.data.__error ? reject(new Error(e.data.__error)) : resolve(e.data.__payload as TReceive);
      }
    };
    worker.addEventListener("message", handler);
    worker.postMessage({ __correlationId: id, __payload: data }, transferables ?? []);
  });
}

/** Wrap native `MessageChannel` constructor. */
export function createMessageChannel(): MessageChannel { return new MessageChannel(); }

/** Broadcast the same message to every worker in a list. */
export function broadcast(workers: Worker[], data: unknown, transferables?: Transferable[]): void {
  for (const w of workers) w.postMessage(data, transferables ?? []);
}

/**
 * Deep-clone using `structuredClone` with JSON fallback and error handling.
 */
export function structuredCloneSafe<T>(value: T): T {
  try { if (typeof structuredClone === "function") return structuredClone(value); } catch { /* fall through */ }
  try { return JSON.parse(JSON.stringify(value)) as T; }
  catch { throw new Error("structuredCloneSafe: value is not clonable"); }
}

// ---------------------------------------------------------------------------
// 3. Task Runner
// ---------------------------------------------------------------------------

/**
 * Run a synchronous function inside a fresh Worker and return its result.
 * The worker is terminated automatically after completion.
 */
export function runInWorker<T>(fn: (...args: any[]) => T, ...args: any[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof Worker === "undefined") { try { resolve(fn(...args)); } catch (e) { reject(e); } return; }
    const code = `self.onmessage=function(e){try{var f=(${fn.toString()});self.postMessage({s:true,d:f.apply(null,e.data.a)})}catch(e){self.postMessage({s:false,e:e.message+""})}}`;
    const blob = new Blob([code], { type: "application/javascript" }), url = URL.createObjectURL(blob);
    const w = new Worker(url);
    w.onmessage = (e: MessageEvent) => { terminateWorker(w); URL.revokeObjectURL(url); e.data.s ? resolve(e.data.d) : reject(new Error(e.data.e)); };
    w.onerror = () => { terminateWorker(w); URL.revokeObjectURL(url); reject(new Error("Worker error")); };
    w.postMessage({ a: args });
  });
}

/**
 * Execute async tasks in parallel with controlled concurrency.
 * Returns ordered results matching input order.
 */
export async function runTasksInParallel<T>(tasks: Array<() => Promise<T>>, concurrency?: number): Promise<T[]> {
  const limit = concurrency ?? tasks.length;
  const results: (T | Error)[] = new Array(tasks.length);
  let next = 0, running = 0, done = 0;

  return new Promise<T[]>((resolve, reject) => {
    const kick = (): void => {
      if (next >= tasks.length) return;
      const idx = next++; running++;
      tasks[idx]().then((v) => { results[idx] = v; }).catch((e) => { results[idx] = e; }).finally(() => {
        running--; done++;
        if (done === tasks.length) {
          const errs = results.filter((r): r is Error => r instanceof Error);
          errs.length > 0 ? reject(new AggregateError(errs, `${errs.length} task(s) failed`)) : resolve(results as T[]);
        } else if (next < tasks.length) kick();
      });
      while (running < limit && next < tasks.length) kick();
    };
    while (running < limit && next < tasks.length) kick();
    if (tasks.length === 0) resolve([]);
  });
}

/**
 * Task queue that dispatches work to available Workers from a pool.
 */
export class WorkerTaskQueue<T = unknown> {
  private _pool: WorkerPool;
  private _queue: { fn: () => Promise<T>; res: (v: T) => void; rej: (e: Error) => void }[] = [];
  private _running = 0, _max: number, _dead = false;

  constructor(poolOrSize: WorkerPool | number, maxConcurrency?: number) {
    this._pool = typeof poolOrSize === "number" ? workerPool({ size: poolOrSize }) : poolOrSize;
    this._max = maxConcurrency ?? this._pool.size;
  }

  enqueue(fn: () => Promise<T>): Promise<T> {
    if (this._dead) return Promise.reject(new Error("WorkerTaskQueue destroyed"));
    return new Promise<T>((res, rej) => { this._queue.push({ fn, res, rej }); this._drain(); });
  }

  get pendingCount(): number { return this._queue.length; }
  get runningCount(): number { return this._running; }
  get poolSize(): number { return this._pool.size; }

  destroy(): void {
    this._dead = true; this._pool.destroy();
    for (const t of this._queue) t.rej(new Error("WorkerTaskQueue destroyed"));
    this._queue.length = 0;
  }

  private _drain(): void {
    while (this._running < this._max && this._queue.length > 0 && !this._dead) {
      const t = this._queue.shift()!; this._running++; const w = this._pool.acquire();
      t.fn().then(t.res).catch(t.rej).finally(() => { this._running--; this._pool.release(w); this._drain(); });
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Worker Communication Patterns
// ---------------------------------------------------------------------------

/**
 * Publish-subscribe messaging across Workers.
 * Register workers that post `{ topic, data }` messages; local subscribers receive them.
 */
export class PubSubWorker {
  private _subs = new Map<string, Set<(data: unknown) => void>>();
  private readonly _name: string;

  constructor(name?: string) { this._name = name ?? "pubsub"; }

  subscribe(topic: string, listener: (data: unknown) => void): Unsubscribe {
    if (!this._subs.has(topic)) this._subs.set(topic, new Set());
    this._subs.get(topic)!.add(listener);
    return () => { this._subs.get(topic)?.delete(listener); };
  }

  publish(topic: string, data: unknown): void {
    this._subs.get(topic)?.forEach((fn) => { try { fn(data); } catch { /* protect other subscribers */ } });
  }

  /** Register a Worker so its `{ topic, data }` messages are routed to local subscribers. */
  registerWorker(worker: Worker): void {
    worker.addEventListener("message", (e: MessageEvent) => {
      if (e.data?.topic != null) this.publish(e.data.topic, e.data.data);
    });
  }

  destroy(): void { this._subs.clear(); }
}

/**
 * RPC-like request-response using correlation IDs on a single Worker.
 * Supports many concurrent in-flight requests with optional timeouts.
 */
export class RequestResponse {
  private _pending = new Map<string, { resolve: (v: any) => void; reject: (e: Error) => void; timer?: ReturnType<typeof setTimeout> }>();
  private _w: Worker | null = null;
  private _timeout: number;

  constructor(defaultTimeoutMs = 10_000) { this._timeout = defaultTimeoutMs; }

  attach(worker: Worker): void { this.detach(); this._w = worker; worker.addEventListener("message", this._onMsg); }

  detach(): void {
    if (this._w) { this._w.removeEventListener("message", this._onMsg); this._w = null; }
    for (const [id, r] of this._pending) { clearTimeout(r.timer); r.reject(new Error("detached")); }
    this._pending.clear();
  }

  async request<TParams = unknown, TResult = unknown>(method: string, params?: TParams, timeoutMs?: number): Promise<TResult> {
    if (!this._w) throw new Error("RequestResponse: not attached");
    const id = generateCorrelationId(), ms = timeoutMs ?? this._timeout;
    return new Promise<TResult>((resolve, reject) => {
      const timer = setTimeout(() => { this._pending.delete(id); reject(new Error(`timed out ${ms}ms (${method})`)); }, ms);
      this._pending.set(id, { resolve: resolve as (v: any) => void, reject, timer });
      this._w!.postMessage({ __rr: true, id, method, params: params ?? null });
    });
  }

  get pendingCount(): number { return this._pending.size; }

  private _onMsg = (e: MessageEvent): void => {
    const m = e.data; if (!m?.__rr) return;
    const p = this._pending.get(m.id); if (!p) return;
    clearTimeout(p.timer); this._pending.delete(m.id);
    m.error ? p.reject(new Error(m.error)) : p.resolve(m.result);
  };
}

/**
 * Stream sequential `{ index, data, done }` chunks from a Worker to main thread listeners.
 */
export class StreamWorker<T = unknown> {
  private _listeners = new Set<StreamListener<T>>();
  private _w: Worker | null = null;
  private _idx = 0, _active = false;

  attach(worker: Worker): void {
    this.detach(); this._w = worker; this._active = true; this._idx = 0;
    worker.addEventListener("message", this._onChunk);
  }

  detach(): void {
    if (this._w) { this._w.removeEventListener("message", this._onChunk); this._w = null; }
    this._active = false; this._listeners.clear(); this._idx = 0;
  }

  onChunk(l: StreamListener<T>): Unsubscribe { this._listeners.add(l); return () => { this._listeners.delete(l); }; }
  get isActive(): boolean { return this._active; }
  get chunkCount(): number { return this._idx; }

  private _onChunk = (e: MessageEvent): void => {
    const c = e.data as StreamChunk<T>; if (!c?.index && c.index !== 0) return;
    this._idx = Math.max(this._idx, c.index + 1);
    this._listeners.forEach((l) => { try { l(c); } catch { /* protect */ } });
    if (c.done) this._active = false;
  };
}

// ---------------------------------------------------------------------------
// 5. Utilities
// ---------------------------------------------------------------------------

/** Detect whether running inside any Web Worker context. */
export function isWorkerContext(): boolean {
  if (typeof self === "undefined") return false;
  const g = self as any;
  return typeof Window === "undefined" || !!g.DedicatedWorkerGlobalScope || !!g.SharedWorkerGlobalScope || !!g.ServiceWorkerGlobalScope;
}

/** Return detailed info about the current execution context. */
export function getWorkerInfo(): WorkerInfo {
  const g = self as any;
  const d = !!g.DedicatedWorkerGlobalScope, s = !!g.SharedWorkerGlobalScope, sw = !!g.ServiceWorkerGlobalScope;
  const w = d || s || sw;
  return { isWorker: w, isSharedWorker: s, isServiceWorker: sw, type: sw ? "service" : s ? "shared" : d ? "dedicated" : "main" };
}

/**
 * Measure task execution time inside a temporary Worker.
 * Supports warmup runs, multiple iterations, and optional memory sampling.
 */
export async function measureWorkerPerformance(
  task: () => void, opts?: { warmupRuns?: number; iterations?: number; captureMemory?: boolean },
): Promise<WorkerMetrics> {
  const warmup = opts?.warmupRuns ?? 0, iters = opts?.iterations ?? 1, mem = opts?.captureMemory !== false;
  const code = `self.onmessage=function(e){var t=(${task.toString()});for(var w=0;w<${warmup};w++)t();var s=performance.now();for(var i=0;i<${iters};i++)t();var e=performance.now();var m=${mem}&&performance.memory?performance.memory.usedJSHeapSize||0:0;self.postMessage({t:e-s,m:m,sz:0})}`;
  return new Promise<WorkerMetrics>((resolve, reject) => {
    const blob = new Blob([code], { type: "application/javascript" }), url = URL.createObjectURL(blob);
    const w = new Worker(url);
    w.onmessage = (e: MessageEvent) => { terminateWorker(w); URL.revokeObjectURL(url); resolve({ executionTime: e.data.t / iters, memoryUsage: e.data.m || undefined, transferSize: e.data.sz }); };
    w.onerror = () => { terminateWorker(w); URL.revokeObjectURL(url); reject(new Error("measure failed")); };
    w.postMessage({});
  });
}

/** Type-safe identity helper marking a value as Transferable at compile time. */
export function transferOwnership<T extends Transferable>(t: T): Transferable { return t; }

/** Create an OffscreenCanvas (or fallback canvas) for use in Workers. */
export function createOffscreenCanvas(width: number, height: number): OffscreenCanvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const c = document.createElement("canvas"); c.width = width; c.height = height;
  return c as unknown as OffscreenCanvas;
}

// ---------------------------------------------------------------------------
// 6. Error Handling
// ---------------------------------------------------------------------------

/**
 * Wraps worker-invoking functions with retry logic, timeouts, and fallback values.
 */
export class WorkerErrorBoundary {
  private readonly o: Required<ErrorBoundaryOptions>;

  constructor(options?: ErrorBoundaryOptions) {
    this.o = { maxRetries: options?.maxRetries ?? 3, timeoutMs: options?.timeoutMs ?? 10_000, fallbackValue: options?.fallbackValue, retryDelayMs: options?.retryDelayMs ?? 500, onError: options?.onError ?? (() => {}) };
  }

  async execute<T>(fn: () => Promise<T>): Promise<ErrorBoundaryResult<T>> {
    const t0 = Date.now(); let err: Error | undefined, attempt = 0;
    while (attempt <= this.o.maxRetries) {
      attempt++;
      try { return { success: true, data: await this._to(fn(), this.o.timeoutMs), attempts: attempt, elapsedMs: Date.now() - t0 }; }
      catch (e) { err = e instanceof Error ? e : new Error(String(e)); this.o.onError(err, attempt); if (attempt <= this.o.maxRetries) await new Promise((r) => setTimeout(r, this.o.retryDelayMs)); }
    }
    return { success: false, data: this.o.fallbackValue as T | undefined, error: err, attempts: attempt, elapsedMs: Date.now() - t0 };
  }

  executeSync<T>(fn: () => T): ErrorBoundaryResult<T> {
    const t0 = Date.now(); let err: Error | undefined, attempt = 0;
    while (attempt <= this.o.maxRetries) {
      attempt++;
      try { return { success: true, data: fn(), attempts: attempt, elapsedMs: Date.now() - t0 }; }
      catch (e) { err = e instanceof Error ? e : new Error(String(e)); this.o.onError(err, attempt); }
    }
    return { success: false, data: this.o.fallbackValue as T | undefined, error: err, attempts: attempt, elapsedMs: Date.now() - t0 };
  }

  private _to<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((res, rej) => { const t = setTimeout(() => rej(new Error(`timed out ${ms}ms`)), ms); p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
  }
}

/**
 * Periodically ping watched Workers to detect hung/unresponsive ones.
 * Calls `onDeadWorkerDetected` when a worker misses consecutive responses.
 */
export class DeadWorkerDetector {
  private _workers = new Map<Worker, WorkerHealthStatus>();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private readonly o: { interval: number; timeout: number; onDead: (w: Worker) => void };

  constructor(options?: { checkIntervalMs?: number; responseTimeoutMs?: number; onDeadWorkerDetected?: (w: Worker) => void }) {
    this.o = { interval: options?.checkIntervalMs ?? 5_000, timeout: options?.responseTimeoutMs ?? 15_000, onDead: options?.onDeadWorkerDetected ?? (() => {}) };
  }

  watch(worker: Worker): void {
    if (this._workers.has(worker)) return;
    const st: WorkerHealthStatus = { worker, alive: true, lastResponseTime: Date.now(), missedPings: 0 };
    this._workers.set(worker, st);
    worker.addEventListener("message", (e: MessageEvent) => {
      if (e.data?.type === "__pong__") { const s = this._workers.get(worker); if (s) { s.alive = true; s.lastResponseTime = Date.now(); s.missedPings = 0; } }
    });
    if (!this._timer) this._timer = setInterval(() => this._check(), this.o.interval);
  }

  unwatch(worker: Worker): void { this._workers.delete(worker); if (!this._workers.size) this.stop(); }
  stop(): void { if (this._timer) { clearInterval(this._timer); this._timer = null; } this._workers.clear(); }
  getStatuses(): WorkerHealthStatus[] { return Array.from(this._workers.values()); }
  get isRunning(): boolean { return this._timer !== null; }

  private _check(): void {
    const now = Date.now();
    for (const [, s] of this._workers) {
      try { s.worker.postMessage({ type: "__ping__", id: now }); } catch { s.alive = false; }
      if (now - s.lastResponseTime > this.o.timeout) {
        s.missedPings++;
        if (s.missedPings >= 2) { s.alive = false; this.o.onDead(s.worker); }
      }
    }
  }
}
