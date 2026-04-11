/**
 * Reflow: CSS layout reflow detection, measurement batching,
 * forced reflow prevention, layout thrashing mitigation,
 * and DOM read/write scheduling utilities.
 */

// --- Types ---

export type ReadFn<T> = () => T;
export type WriteFn = () => void;

export interface ReflowMetrics {
  /** Number of read operations */
  reads: number;
  /** Number of write operations */
  writes: number;
  /** Number of forced reflows (read after write) */
  forcedReflows: number;
  /** Total time spent in ms */
  totalTimeMs: number;
}

// --- Layout Batch Scheduler ---

/**
 * Batches DOM reads and writes to minimize layout thrashing.
 * Reads are batched together first, then all writes happen together.
 *
 * @example
 * batchDOM(() => {
 *   const width = el.offsetWidth; // READ
 *   const height = el.offsetHeight; // READ
 *   // ... more reads ...
 *   return { width, height };
 * }, (dims) => {
 *   el.style.width = dims.width + 'px'; // WRITE
 *   el.style.height = dims.height + 'px'; // WRITE
 * });
 */
export function batchDOM<T>(
  reads: () => T,
  writes: (result: T) => void,
): void {
  // Phase 1: All reads
  const result = reads();

  // Phase 2: All writes
  writes(result);
}

// --- Read/Write Scheduler ---

/** Schedule reads and writes to avoid layout thrashing */
export class ReadWriteScheduler {
  private readQueue: Array<{ fn: () => void; resolve: () => void }> = [];
  private writeQueue: Array<() => void> = [];
  private scheduled = false;
  private lastWasWrite = false;

  /** Queue a read operation */
  scheduleRead(fn: () => void): Promise<void> {
    return new Promise((resolve) => {
      this.readQueue.push({ fn, resolve });
      this.flush();
    });
  }

  /** Queue a write operation */
  scheduleWrite(fn: () => void): void {
    this.writeQueue.push(fn);
    this.lastWasWrite = true;
    this.flush();
  }

  private flush(): void {
    if (this.scheduled) return;
    this.scheduled = true;

    queueMicrotask(() => {
      // Process all reads first
      for (const item of this.readQueue) {
        try { item.fn(); } catch {}
        item.resolve();
      }
      this.readQueue = [];

      // Then all writes
      for (const fn of this.writeQueue) {
        try { fn(); } catch {}
      }
      this.writeQueue = [];

      this.scheduled = false;
      this.lastWasWrite = false;
    });
  }

  /** Clear pending operations */
  clear(): void {
    this.readQueue.forEach((item) => item.resolve());
    this.readQueue = [];
    this.writeQueue = [];
  }
}

// --- Forced Reflow Detector ---

/** Detect and report forced synchronous reflows (layout thrashing) */
export class ReflowDetector {
  private metrics: ReflowMetrics = { reads: 0, writes: 0, forcedReflows: 0, totalTimeMs: 0 };
  private active = false;
  private lastOpWasWrite = false;

  start(): void {
    this.active = true;
    this.metrics = { reads: 0, writes: 0, forcedReflows: 0, totalTimeMs: 0 };
    this.lastOpWasWrite = false;
  }

  stop(): ReflowMetrics {
    this.active = false;
    return { ...this.metrics };
  }

  /** Wrap a read operation */
  measure<T>(fn: ReadFn<T>): T {
    if (!this.active) return fn();

    const start = performance.now();
    if (this.lastOpWasWrite) this.metrics.forcedReflows++;

    const result = fn();
    this.metrics.reads++;
    this.metrics.totalTimeMs += performance.now() - start;
    this.lastOpWasWrite = false;

    return result;
  }

  /** Wrap a write operation */
  mutate(fn: WriteFn): void {
    if (!this.active) { fn(); return; }

    const start = performance.now();
    fn();
    this.metrics.writes++;
    this.metrics.totalTimeMs += performance.now() - start;
    this.lastOpWasWrite = true;
  }

  getMetrics(): ReflowMetrics { return { ...this.metrics }; }
}

// --- Fast DOM Measurements ---

/** Get multiple measurements in a single pass */
export function measureMultiple(
  elements: HTMLElement[],
  props: Array<"offsetWidth" | "offsetHeight" | "clientWidth" | "clientHeight" | "scrollHeight" | "scrollWidth" | "boundingRect">,
): Record<string, number | DOMRect>[] {
  return elements.map((el, i) => {
    const result: Record<string, number | DOMRect> = {};
    for (const prop of props) {
      if (prop === "boundingRect") {
        result[prop] = el.getBoundingClientRect();
      } else {
        result[prop] = (el as unknown as Record<string, number>)[prop];
      }
    }
    return result;
  });
}

// --- Visibility-Based Batching ---

/** Only perform work when the element is visible (using IntersectionObserver) */
export function whenVisible(
  el: HTMLElement,
  callback: () => void,
  options?: { rootMargin?: string; once?: boolean },
): () => void {
  let done = false;
  const observer = new IntersectionObserver(([entry]) => {
    if (entry?.isIntersecting && !done) {
      callback();
      if (options?.once) { done = true; observer.disconnect(); }
    }
  }, { rootMargin: options?.rootMargin ?? "100px" });

  observer.observe(el);
  return (): void => observer.disconnect();
}

// --- Request Idle Callback Wrapper ---

/** Run non-critical work during idle periods */
export function runDuringIdle(callback: IdleRequestCallback, options?: { timeout?: number }): AbortController {
  const controller = new AbortController();

  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback((deadline) => {
      if (!controller.signal.aborted) callback(deadline);
    }, { timeout: options?.timeout ?? 2000 });

    controller.signal.addEventListener("abort", () => cancelIdleCallback(id));
  } else {
    setTimeout(() => {
      if (!controller.signal.aborted) callback({ timeRemaining: () => 50, didTimeout: false } as IdleDeadline);
    }, 1);
  }

  return controller;
}
