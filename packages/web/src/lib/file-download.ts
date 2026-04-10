/**
 * File Download: Streaming/chunked downloads, progress tracking, abort control,
 * blob/URL/File API wrapper, download queue with prioritization,
 * parallel downloads, resume support, and drag-and-drop download.
 */

// --- Types ---

export interface DownloadProgress {
  loaded: number;
  total: number;
  percent: number;       // 0-100
  speed: number;         // bytes/sec
  remaining: number;     // estimated seconds remaining
  status: "downloading" | "paused" | "completed" | "error" | "aborted";
}

export interface DownloadOptions {
  /** URL to download from */
  url: string;
  /** Filename for the saved file */
  filename?: string;
  /** HTTP method (default: GET) */
  method?: string;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (for POST) */
  body?: BodyInit | null;
  /** Abort signal */
  signal?: AbortSignal;
  /** Callback for progress updates */
  onProgress?: (progress: DownloadProgress) => void;
  /** Chunk size in bytes for streaming (default: 64KB) */
  chunkSize?: number;
  /** Whether to show in browser's download bar (default: true) */
  saveToDisk?: boolean;
  /** MIME type override */
  mimeType?: string;
  /** Number of retry attempts (default: 3) */
  retries?: number;
  /** Retry delay base in ms (default: 1000) */
  retryDelay?: number;
  /** Credentials mode */
  credentials?: RequestCredentials;
  /** Request mode */
  mode?: RequestMode;
  /** Custom fetch function */
  fetchFn?: typeof fetch;
}

export interface DownloadResult {
  url: string;           // blob URL
  blob: Blob;
  filename: string;
  size: number;
  mimeType: string;
  duration: number;      // ms
}

export interface DownloadTask {
  id: string;
  url: string;
  filename: string;
  options: DownloadOptions;
  progress: DownloadPriority;
  result?: DownloadResult;
  error?: Error;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface DownloadQueueOptions {
  /** Max concurrent downloads (default: 3) */
  maxConcurrent?: number;
  /** Max total queue size (default: 50) */
  maxSize?: number;
  /** Auto-start when task added (default: true) */
  autoStart?: boolean;
  /** Default retries per task */
  defaultRetries?: number;
  /** On task complete callback */
  onTaskComplete?: (task: DownloadTask) => void;
  /** On task error callback */
  onTaskError?: (task: DownloadTask) => void;
  /** On all tasks done callback */
  onDrain?: () => void;
}

export type DownloadPriority = "low" | "normal" | "high" | "critical";

// --- Utility Functions ---

/** Extract filename from Content-Disposition header or URL */
function extractFilename(response: Response, url: string, fallback?: string): string {
  // Try Content-Disposition header
  const cd = response.headers.get("content-disposition");
  if (cd) {
    const match = cd.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (match?.[1]) {
      return match[1].replace(/^["']|["']$/g, "").trim();
    }
    const utf8Match = cd.match(/filename\*=UTF-8''(.+)/i);
    if (utf8Match?.[1]) {
      try { return decodeURIComponent(utf8Match[1]); } catch {}
    }
  }

  if (fallback) return fallback;

  // Extract from URL path
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.includes(".")) return last;
  } catch {}

  return `download_${Date.now()}`;
}

/** Parse size from Content-Length or infer */
function getTotalSize(response: Response): number {
  const cl = response.headers.get("content-length");
  if (cl) return parseInt(cl, 10) || 0;
  return 0;
}

/** Generate unique ID */
let taskIdCounter = 0;
function generateTaskId(): string {
  taskIdCounter++;
  return `dl_${Date.now()}_${taskIdCounter}`;
}

// --- Single File Download ---

/**
 * Download a file with progress tracking.
 * Returns a Blob URL and metadata.
 */
export async function downloadFile(options: DownloadOptions): Promise<DownloadResult> {
  const startTime = performance.now();
  const retries = options.retries ?? 3;
  const retryBase = options.retryDelay ?? 1000;
  const fetchFn = options.fetchFn ?? fetch;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, retryBase * Math.pow(2, attempt - 1)));
      options.onProgress?.({
        loaded: 0, total: 0, percent: 0, speed: 0, remaining: 0,
        status: "downloading",
      });
    }

    try {
      const controller = new AbortController();
      if (options.signal) {
        options.signal.addEventListener("abort", () => controller.abort(), { once: true });
      }

      const response = await fetchFn(options.url, {
        method: options.method ?? "GET",
        headers: options.headers,
        body: options.body,
        signal: controller.signal,
        credentials: options.credentials,
        mode: options.mode,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const total = getTotalSize(response);
      const contentType = options.mimeType ?? response.headers.get("content-type") ?? "application/octet-stream";
      const filename = extractFilename(response, options.url, options.filename);

      // Read as stream with progress
      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      let speedStartTime = performance.now();
      let speedLoaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        loaded += value.length;
        speedLoaded += value.length;

        const elapsed = (performance.now() - speedStartTime) / 1000;
        if (elapsed >= 0.5) {
          const speed = speedLoaded / elapsed;
          const remaining = speed > 0 ? (total - loaded) / speed : 0;

          options.onProgress?.({
            loaded,
            total,
            percent: total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0,
            speed: Math.round(speed),
            remaining: Math.round(remaining),
            status: "downloading",
          });

          speedStartTime = performance.now();
          speedLoaded = 0;
        }
      }

      const blob = new Blob(chunks, { type: contentType });
      const blobUrl = URL.createObjectURL(blob);

      // Save to disk if requested
      if (options.saveToDisk !== false) {
        saveBlob(blobUrl, filename);
      }

      const result: DownloadResult = {
        url: blobUrl,
        blob,
        filename,
        size: blob.size,
        mimeType: contentType,
        duration: Math.round(performance.now() - startTime),
      };

      options.onProgress?.({
        loaded, total: loaded, percent: 100, speed: 0, remaining: 0,
        status: "completed",
      });

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if ((lastError.name === "AbortError" || lastError.message.includes("aborted")) || attempt >= retries) {
        options.onProgress?.({
          loaded: 0, total: 0, percent: 0, speed: 0, remaining: 0,
          status: "aborted",
        });
        throw lastError;
      }
    }
  }

  throw lastError!;
}

/** Trigger browser download of a blob URL */
export function saveBlob(blobUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Revoke a blob URL to free memory */
export function revokeBlobUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// --- Multi-file / Batch Download ---

/** Download multiple files concurrently */
export async function downloadMultiple(
  items: Array<{ url: string; filename?: string; options?: Partial<DownloadOptions> }>,
  concurrency = 3,
  onProgress?: (completed: number, total: number) => void,
): Promise<DownloadResult[]> {
  const results: DownloadResult[] = [];
  let completed = 0;

  const execute = async (item: typeof items[number]): Promise<DownloadResult> => {
    const result = await downloadFile({
      url: item.url,
      filename: item.filename,
      ...item.options,
    });
    completed++;
    onProgress?.(completed, items.length);
    return result;
  };

  // Process in batches
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(execute));
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }

  return results;
}

// --- Download Queue ---

/**
 * Priority-based download queue with concurrency control.
 */
export class DownloadQueue {
  private queue: Map<string, DownloadTask> = new Map();
  private active = new Set<string>();
  private maxConcurrent: number;
  private maxSize: number;
  private autoStart: boolean;
  private defaultRetries: number;
  private paused = false;
  private destroyed = false;

  private onTaskCompleteCb?: (task: DownloadTask) => void;
  private onTaskErrorCb?: (task: DownloadTask) => void;
  private onDrainCb?: () => void;

  constructor(options: DownloadQueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent ?? 3;
    this.maxSize = options.maxSize ?? 50;
    this.autoStart = options.autoStart ?? true;
    this.defaultRetries = options.defaultRetries ?? 3;
    this.onTaskCompleteCb = options.onTaskComplete;
    this.onTaskErrorCb = options.onTaskError;
    this.onDrainCb = options.onDrain;
  }

  /** Add a download task to the queue */
  add(url: string, filename: string, options: Partial<DownloadOptions> & { priority?: DownloadPriority } = {}): string {
    if (this.destroyed) throw new Error("DownloadQueue is destroyed");
    if (this.queue.size >= this.maxSize) {
      // Remove oldest low-priority task
      this.evictOldest();
    }

    const id = generateTaskId();
    const task: DownloadTask = {
      id,
      url,
      filename,
      options: {
        url,
        filename,
        retries: this.defaultRetries,
        ...options,
        priority: undefined,
      },
      progress: options.priority ?? "normal",
      createdAt: Date.now(),
    };

    this.queue.set(id, task);

    if (this.autoStart && !this.paused) {
      this.processNext();
    }

    return id;
  }

  /** Pause all active downloads */
  pause(): void {
    this.paused = true;
  }

  /** Resume processing */
  resume(): void {
    this.paused = false;
    this.processNext();
  }

  /** Cancel a specific task */
  cancel(id: string): boolean {
    const task = this.queue.get(id);
    if (!task) return false;

    if (this.active.has(id)) {
      // Task is running — mark for cancellation
      task.error = new Error("Cancelled");
      this.active.delete(id);
    }

    this.queue.delete(id);
    return true;
  }

  /** Clear all pending tasks (does not cancel active) */
  clearPending(): void {
    for (const [id, task] of this.queue) {
      if (!this.active.has(id)) {
        this.queue.delete(id);
      }
    }
  }

  /** Cancel everything */
  cancelAll(): void {
    for (const id of this.active) {
      const task = this.queue.get(id);
      if (task) task.error = new Error("Cancelled");
    }
    this.active.clear();
    this.queue.clear();
  }

  /** Get task by ID */
  getTask(id: string): DownloadTask | undefined {
    return this.queue.get(id);
  }

  /** Get all tasks */
  getAllTasks(): DownloadTask[] {
    return Array.from(this.queue.values());
  }

  /** Get pending tasks count */
  get pendingCount(): number {
    return Array.from(this.queue.values()).filter((t) => !this.active.has(t.id)).length;
  }

  /** Get active tasks count */
  get activeCount(): number {
    return this.active.size;
  }

  /** Get stats */
  get stats(): { total: number; pending: number; active: number; completed: number; failed: number } {
    let completed = 0;
    let failed = 0;
    for (const t of this.queue.values()) {
      if (t.result) completed++;
      else if (t.error) failed++;
    }
    return {
      total: this.queue.size,
      pending: this.pendingCount,
      active: this.active.size,
      completed,
      failed,
    };
  }

  /** Destroy the queue and clean up resources */
  destroy(): void {
    this.cancelAll();
    this.destroyed = true;
  }

  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;
    let lowestPriority: DownloadPriority = "critical";

    for (const [id, task] of this.queue) {
      if (this.active.has(id)) continue;
      const priorityOrder: Record<DownloadPriority, number> = { critical: 4, high: 3, normal: 2, low: 1 };
      const pOrder = priorityOrder[task.progress] ?? 0;
      const lOrder = priorityOrder[lowestPriority] ?? 0;

      if (pOrder < lOrder || (pOrder === lOrder && task.createdAt < oldestTime)) {
        oldestId = id;
        oldestTime = task.createdAt;
        lowestPriority = task.progress;
      }
    }

    if (oldestId) this.queue.delete(oldestId);
  }

  private processNext(): void {
    if (this.paused || this.destroyed) return;
    while (this.active.size < this.maxConcurrent) {
      const next = this.pickNext();
      if (!next) {
        // Check if drain needed
        if (this.queue.size === 0) this.onDrainCb?.();
        return;
      }
      this.executeTask(next);
    }
  }

  private pickNext(): DownloadTask | null {
    const pending = Array.from(this.queue.values()).filter((t) => !this.active.has(t.id));
    if (pending.length === 0) return null;

    const priorityOrder: Record<DownloadPriority, number> = { critical: 4, high: 3, normal: 2, low: 1 };
    pending.sort((a, b) => {
      const pa = priorityOrder[a.progress] ?? 0;
      const pb = priorityOrder[b.progress] ?? 0;
      if (pb !== pa) return pb - pa;
      return a.createdAt - b.createdAt;
    });

    return pending[0]!;
  }

  private async executeTask(task: DownloadTask): Promise<void> {
    this.active.add(task.id);
    task.startedAt = Date.now();

    try {
      const result = await downloadFile(task.options);
      task.result = result;
      task.completedAt = Date.now();
      this.onTaskCompleteCb?.(task);
    } catch (err) {
      task.error = err instanceof Error ? err : new Error(String(err));
      this.onTaskErrorCb?.(task);
    } finally {
      this.active.delete(task.id);
      this.processNext();
    }
  }
}

// --- Drag & Drop Download ---

/**
 * Create a draggable element that triggers file download on drop.
 * Useful for "drag to desktop" style downloads.
 */
export function createDraggableDownload(
  result: DownloadResult,
  options?: { element?: HTMLElement; label?: string },
): HTMLElement {
  const el = options?.element ?? document.createElement("div");
  el.draggable = true;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", options?.label ?? `Download ${result.filename}`);
  el.style.cssText = `
    display:inline-flex;align-items:center;gap:6px;padding:8px 16px;
    cursor:grab;background:#f5f5f5;border-radius:8px;font-size:13px;color:#333;
    user-select:none;border:1px solid #e0e0e0;
  `;
  el.textContent = options?.label ?? `\u{1F4BE} ${result.filename}`;

  el.addEventListener("dragstart", (e) => {
    e.dataTransfer!.setData("DownloadURL", `${result.mimeType}:${result.filename}:${result.url}`);
    e.dataTransfer!.effectAllowed = "copy";
  });

  return el;
}

// --- Text/Blob Helpers ---

/** Download text content as a file */
export function downloadText(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8",
): DownloadResult {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  saveBlob(url, filename);
  return { url, blob, filename, size: blob.size, mimeType, duration: 0 };
}

/** Download JSON as a .json file */
export function downloadJSON(data: unknown, filename: string, pretty = true): DownloadResult {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  return downloadText(content, filename, "application/json;charset=utf-8");
}

/** Download data as CSV */
export function downloadCSV(
  rows: Record<string, unknown>[],
  filename: string,
  columns?: string[],
): DownloadResult {
  const cols = columns ?? (rows.length > 0 ? Object.keys(rows[0]!) : []);
  const escape = (v: unknown): string => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => escape(row[c])).join(","));
  }

  return downloadText(lines.join("\n"), filename, "text/csv;charset=utf-8");
}

/** Read a File object as ArrayBuffer */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** Read a File object as text */
export function readAsText(file: File, encoding = "utf-8"): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, encoding);
  });
}

/** Read a File object as DataURL */
export function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Convert a File/Blob to a downloadable link */
export function createFileLink(file: File | Blob, filename?: string): HTMLAnchorElement {
  const url = URL.createObjectURL(file instanceof File ? file : file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? (file instanceof File ? file.name : "download");
  return a;
}
