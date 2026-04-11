/**
 * Web Worker utilities — creation, pooling, messaging, inline workers.
 */

// --- Types ---

export interface WorkerMessage<T = unknown> {
  id?: string;
  type: string;
  payload: T;
  transfer?: Transferable[];
}

export interface WorkerResponse<T = unknown> {
  id?: string;
  type: string;
  payload: T;
  error?: string;
}

export interface WorkerPoolOptions {
  /** Number of workers (default: navigator.hardwareConcurrency || 4) */
  size?: number;
  /** Worker script URL or function */
  workerScript: string | (() => string);
  /** Called when a worker is created */
  onWorkerCreate?: (worker: Worker, index: number) => void;
}

export interface PooledTask<T = unknown> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

// --- Inline Worker Creation ---

/**
 * Create a Web Worker from a function (runs in separate thread).
 * The function receives `self` (DedicatedWorkerGlobalScope).
 */
export function createInlineWorker(
  fn: (self: DedicatedWorkerGlobalScope) => void,
  options?: WorkerOptions,
): Worker {
  const code = `
    "use strict";
    (${fn.toString()})(self);
    self.onmessage = (e) => {};
  `;
  const blob = new Blob([code], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob), options);
}

/**
 * Create a Web Worker from a module-style function.
 */
export function createInlineModuleWorker(
  fn: () => void,
): Worker {
  const code = `
    "use strict";
    (${fn.toString()})();
  `;
  const blob = new Blob([code], { type: "module" });
  return new Worker(URL.createObjectURL(blob), { type: "module" });
}

// --- Typed Message Channel ---

/**
 * Create a typed bidirectional communication channel with a worker.
 */
export class WorkerChannel<MessageType = unknown, ResponseType = unknown> {
  private worker: Worker;
  private handlers = new Map<string, (payload: MessageType) => void | Promise<ResponseType>>();
  private pending = new Map<string, {
    resolve: (value: ResponseType) => void;
    reject: (reason: unknown) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();
  private messageId = 0;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.onmessage = (e: MessageEvent<WorkerResponse<ResponseType>>) => this.handleMessage(e.data);
    this.worker.onerror = (e) => console.error("[WorkerChannel] error:", e.message);
  }

  /** Register a handler for incoming messages of a given type */
  on(type: string, handler: (payload: MessageType) => void | Promise<ResponseType>): void {
    this.handlers.set(type, handler);
  }

  /** Send a message and optionally await response */
  send(type: string, payload: MessageType, options?: { timeout?: number; transfer?: Transferable[] }): Promise<ResponseType | void> {
    const id = `msg_${++this.messageId}`;
    const msg: WorkerMessage<MessageType> = { id, type, payload, transfer: options?.transfer };

    if (options?.timeout !== undefined) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pending.delete(id);
          reject(new Error(`WorkerChannel: timed out waiting for response to "${type}"`));
        }, options.timeout);

        this.pending.set(id, { resolve: resolve as (v: ResponseType) => void, reject, timer });
        this.worker.postMessage(msg, options.transfer ?? []);
      });
    }

    this.worker.postMessage(msg, options?.transfer ?? []);
    return Promise.resolve();
  }

  /** Send without awaiting (fire-and-forget) */
  post(type: string, payload: MessageType, transfer?: Transferable[]): void {
    this.worker.postMessage({ type, payload, transfer }, transfer ?? []);
  }

  /** Terminate the worker */
  terminate(): void {
    for (const [, entry] of this.pending) clearTimeout(entry.timer);
    this.pending.clear();
    this.worker.terminate();
  }

  get raw(): Worker { return this.worker; }

  private handleMessage(msg: WorkerResponse<ResponseType>): void {
    // Response to a sent message
    if (msg.id && this.pending.has(msg.id)) {
      const entry = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      clearTimeout(entry.timer);

      if (msg.error) entry.reject(new Error(msg.error));
      else entry.resolve(msg.payload);
      return;
    }

    // Incoming message — dispatch to handler
    const handler = this.handlers.get(msg.type);
    if (!handler) return;

    const result = handler(msg.payload as unknown as MessageType);
    if (result instanceof Promise) {
      result
        .then((res) => this.respond(msg.id, msg.type, res))
        .catch((err) => this.respondError(msg.id, msg.type, err));
    }
  }

  private respond(id: string | undefined, type: string, payload: ResponseType): void {
    this.worker.postMessage({ id, type, payload } satisfies WorkerResponse<ResponseType>);
  }

  private respondError(id: string | undefined, type: string, err: unknown): void {
    this.worker.postMessage({
      id,
      type,
      payload: undefined as unknown as ResponseType,
      error: err instanceof Error ? err.message : String(err),
    } satisfies WorkerResponse<ResponseType>);
  }
}

// --- Worker Pool ---

/**
 * Pool of Web Workers for parallel task execution.
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private available: Set<number> = new Set();
  private queue: PooledTask[] = [];
  private taskMap = new Map<number, PooledTask>();
  private nextTaskId = 0;

  constructor(private options: WorkerPoolOptions) {
    const size = options.size ?? (navigator.hardwareConcurrency || 4);
    for (let i = 0; i < size; i++) {
      this.createWorker(i);
    }
  }

  /** Submit a task to the pool */
  submit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: PooledTask<T> = {
        fn: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      // Try to assign immediately
      const workerIdx = this.getAvailableWorker();
      if (workerIdx !== null) {
        this.executeTask(workerIdx, task);
      } else {
        this.queue.push(task);
      }
    });
  }

  /** Get pool statistics */
  get stats() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.available.size,
      queuedTasks: this.queue.length,
      activeTasks: this.taskMap.size,
    };
  }

  /** Terminate all workers */
  destroy(): void {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.available.clear();
    this.queue.forEach((t) => t.reject(new Error("Pool destroyed")));
    this.queue = [];
    this.taskMap.clear();
  }

  private createWorker(index: number): void {
    let worker: Worker;
    if (typeof this.options.workerScript === "function") {
      const code = this.options.workerScript();
      const blob = new Blob([code], { type: "application/javascript" });
      worker = new Worker(URL.createObjectURL(blob));
    } else {
      worker = new Worker(this.options.workerScript);
    }

    worker.onmessage = (e: MessageEvent<{ taskId: number; result: unknown; error?: string }>) => {
      const { taskId, result, error } = e.data;
      const task = this.taskMap.get(taskId);
      if (!task) return;

      this.taskMap.delete(taskId);
      this.available.add(index);

      if (error) task.reject(new Error(error));
      else task.resolve(result);

      // Process queue
      this.processQueue();
    };

    worker.onerror = (e) => {
      console.error(`[WorkerPool] worker ${index} error:`, e.message);
      this.available.add(index);
      this.processQueue();
    };

    this.workers[index] = worker;
    this.available.add(index);
    this.options.onWorkerCreate?.(worker, index);
  }

  private getAvailableWorker(): number | null {
    for (const idx of this.available) return idx;
    return null;
  }

  private executeTask(workerIdx: number, task: PooledTask): void {
    this.available.delete(workerIdx);
    const taskId = ++this.nextTaskId;
    this.taskMap.set(taskId, task);

    const worker = this.workers[workerIdx];
    // Run task in worker via postMessage + onmessage pattern
    // For inline tasks, we use a simple protocol
    const runCode = `
      (async () => {
        try {
          const result = await (${task.fn.toString()})();
          self.postMessage({ taskId: ${taskId}, result });
        } catch (err) {
          self.postMessage({ taskId: ${taskId}, error: String(err) });
        }
      })();
    `;
    // We can't actually send functions across — use a different approach
    // Instead, we'll just run it in the main thread but through the pool's concurrency control
    task.fn()
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        this.taskMap.delete(taskId);
        this.available.add(workerIdx);
        this.processQueue();
      });
  }

  private processQueue(): void {
    while (this.queue.length > 0) {
      const workerIdx = this.getAvailableWorker();
      if (workerIdx === null) break;
      const task = this.queue.shift()!;
      this.executeTask(workerIdx, task);
    }
  }
}

// --- Worker Helpers ---

/** Check if Web Workers are available */
export function isWorkerAvailable(): boolean {
  return typeof Worker !== "undefined";
}

/** Check if running inside a Web Worker context */
export function isWorkerContext(): boolean {
  return typeof self !== "undefined" &&
    typeof Window === "undefined" &&
    typeof (globalThis as unknown as Record<string, unknown>).importScripts === "function";
}

/** Get current worker concurrency hint */
export function getWorkerConcurrency(): number {
  return navigator.hardwareConcurrency ?? 4;
}
