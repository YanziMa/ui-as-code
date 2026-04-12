/**
 * File Uploader: Drag-and-drop, paste, click-to-upload with progress tracking,
 * chunked upload, resume support, parallel chunk upload, file validation,
 * image preview, type filtering, size limits, and queue management.
 */

// --- Types ---

export type UploadStatus = "idle" | "validating" | "uploading" | "paused" | "completed" | "error" | "aborted";

export interface FileValidationOptions {
  /** Allowed MIME types (e.g., ["image/*", ".pdf"]) */
  accept?: string[];
  /** Max file size in bytes */
  maxSize?: number;
  /** Min file size in bytes */
  minSize?: number;
  /** Max total files allowed */
  maxFiles?: number;
  /** Custom validator function */
  customValidator?: (file: File) => string | null;
}

export interface FileValidationError {
  file: File;
  reason: string;
}

export interface ChunkInfo {
  index: number;
  start: number;
  end: number;
  data: Blob;
  uploaded: boolean;
  retries: number;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  status: UploadStatus;
  loaded: number;
  total: number;
  percent: number;
  speed: number; // bytes/sec
  eta: number; // seconds remaining
  chunks?: {
    total: number;
    completed: number;
  };
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  url: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
  duration: number;
}

export interface UploaderOptions {
  /** Endpoint URL for uploads */
  endpoint: string;
  /** HTTP method */
  method?: "POST" | "PUT" | "PATCH";
  /** Custom headers */
  headers?: Record<string, string>;
  /** Additional form fields */
  fields?: Record<string, string>;
  /** Chunk size in bytes (default: 5MB) */
  chunkSize?: number;
  /** Enable chunked upload for large files */
  enableChunking?: boolean;
  /** Number of parallel chunk uploads */
  parallelChunks?: number;
  /** Max retries per chunk */
  maxRetries?: number;
  /** Retry delay base (ms) */
  retryDelay?: number;
  /** Abort controller for cancellation */
  signal?: AbortSignal;
  /** Progress callback */
  onProgress?: (progress: UploadProgress) => void;
  /** Complete callback */
  onComplete?: (result: UploadResult) => void;
  /** Error callback */
  onError?: (error: UploadError) => void;
  /** Validation options */
  validation?: FileValidationOptions;
  /** Custom request transformer */
  transformRequest?: (data: FormData, file: File) => FormData;
  /** Response parser */
  parseResponse?: (response: Response) => Promise<UploadResult>;
}

export interface UploadError {
  fileId: string;
  fileName: string;
  message: string;
  code: string;
  retryable: boolean;
  chunkIndex?: number;
}

export interface FileEntry {
  id: string;
  file: File;
  status: UploadStatus;
  progress: UploadProgress;
  result?: UploadResult;
  error?: UploadError;
  abortController: AbortController;
  previewUrl?: string;
}

export interface QueueOptions {
  /** Max concurrent uploads */
  concurrency?: number;
  /** Auto-start on add? */
  autoStart?: boolean;
  /** Priority comparator */
  priorityFn?: (a: FileEntry, b: FileEntry) => number;
}

// --- File Validator ---

export class FileValidator {
  private options: FileValidationOptions;

  constructor(options: FileValidationOptions = {}) {
    this.options = options;
  }

  /** Validate a single file. Returns error reason or null if valid. */
  validate(file: File): string | null {
    const { accept, maxSize, minSize, customValidator } = this.options;

    // Size checks
    if (minSize && file.size < minSize) {
      return `File too small: ${formatBytes(file.size)} (minimum ${formatBytes(minSize)})`;
    }
    if (maxSize && file.size > maxSize) {
      return `File too large: ${formatBytes(file.size)} (maximum ${formatBytes(maxSize)})`;
    }

    // Type check
    if (accept && accept.length > 0) {
      const matched = accept.some((pattern) =>
        this.matchMimeType(file.type, pattern) || file.name.toLowerCase().endsWith(pattern.toLowerCase()),
      );
      if (!matched) {
        return `File type not allowed: ${file.type} (${file.name})`;
      }
    }

    // Custom validator
    if (customValidator) {
      const customError = customValidator(file);
      if (customError) return customError;
    }

    return null;
  }

  /** Validate multiple files. Returns array of errors. */
  validateAll(files: File[]): FileValidationError[] {
    const errors: FileValidationError[] = [];
    const maxFiles = this.options.maxFiles ?? Infinity;

    if (files.length > maxFiles) {
      errors.push({
        file: files[0]!,
        reason: `Too many files: ${files.length} (maximum ${maxFiles})`,
      });
    }

    for (const file of files) {
      const error = this.validate(file);
      if (error) {
        errors.push({ file, reason: error });
      }
    }

    return errors;
  }

  private matchMimeType(mimeType: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern.endsWith("/*")) {
      const base = pattern.slice(0, -2);
      return mimeType.startsWith(base + "/");
    }
    return mimeType === pattern;
  }
}

// --- Chunk Manager ---

class ChunkManager {
  private chunks: ChunkInfo[] = [];

  constructor(file: File, chunkSize: number) {
    const totalChunks = Math.ceil(file.size / chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      this.chunks.push({
        index: i,
        start,
        end,
        data: file.slice(start, end),
        uploaded: false,
        retries: 0,
      });
    }
  }

  getChunks(): ChunkInfo[] {
    return [...this.chunks];
  }

  getNextPending(): ChunkInfo | undefined {
    return this.chunks.find((c) => !c.uploaded);
  }

  markUploaded(index: number): void {
    const chunk = this.chunks.find((c) => c.index === index);
    if (chunk) chunk.uploaded = true;
  }

  incrementRetry(index: number): void {
    const chunk = this.chunks.find((c) => c.index === index);
    if (chunk) chunk.retries++;
  }

  get completed(): number {
    return this.chunks.filter((c) => c.uploaded).length;
  }

  get total(): number {
    return this.chunks.length;
  }

  get allDone(): boolean {
    return this.chunks.every((c) => c.uploaded);
  }
}

// --- Core Uploader ---

export class FileUploader {
  private options: Required<UploaderOptions> & { headers: Record<string, string> };
  private entries: Map<string, FileEntry> = new Map();
  private activeUploads: Set<string> = new Set();
  private queue: QueueManager | null = null;

  constructor(options: UploaderOptions) {
    this.options = {
      method: "POST",
      chunkSize: 5 * 1024 * 1024, // 5MB
      enableChunking: true,
      parallelChunks: 3,
      maxRetries: 3,
      retryDelay: 1000,
      ...options,
      headers: options.headers ?? {},
      validation: options.validation ?? {},
    };

    if (this.options.validation.accept && Array.isArray(this.options.validation.accept)) {
      // Already an array — keep as-is
    }
  }

  /** Add files to the upload queue. */
  async addFiles(files: File[] | FileList): Promise<FileEntry[]> {
    const fileArray = Array.from(files);

    // Validate
    const validator = new FileValidator(this.options.validation);
    const errors = validator.validateAll(fileArray);
    if (errors.length > 0 && this.options.onError) {
      for (const err of errors) {
        this.options.onError({
          fileId: generateId(),
          fileName: err.file.name,
          message: err.reason,
          code: "VALIDATION_ERROR",
          retryable: false,
        });
      }
    }

    const entries: FileEntry[] = [];

    for (const file of fileArray) {
      const validationError = validator.validate(file);
      if (validationError) continue;

      const entry: FileEntry = {
        id: generateId(),
        file,
        status: "idle",
        progress: this.createEmptyProgress(file),
        abortController: new AbortController(),
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      };

      this.entries.set(entry.id, entry);
      entries.push(entry);
    }

    return entries;
  }

  /** Start uploading a specific file. */
  async upload(entryId: string): Promise<UploadResult> {
    const entry = this.entries.get(entryId);
    if (!entry) throw new Error(`File entry not found: ${entryId}`);

    entry.status = "uploading";
    entry.abortController = new AbortController();

    try {
      const shouldChunk = this.options.enableChunking && entry.file.size > this.options.chunkSize;

      if (shouldChunk) {
        return await this.chunkedUpload(entry);
      } else {
        return await this.simpleUpload(entry);
      }
    } catch (err) {
      entry.status = "error";
      const error = this.normalizeError(err, entry);
      entry.error = error;
      this.options.onError?.(error);
      throw error;
    }
  }

  /** Start all queued uploads. */
  async uploadAll(concurrency = 3): Promise<UploadResult[]> {
    const entries = Array.from(this.entries.values()).filter(
      (e) => e.status === "idle" || e.status === "paused",
    );

    this.queue = new QueueManager({ concurrency });

    const results: UploadResult[] = [];
    const promises = entries.map(async (entry) => {
      return this.queue!.enqueue(async () => {
        const result = await this.upload(entry.id);
        results.push(result);
        return result;
      });
    });

    await Promise.allSettled(promises);
    return results;
  }

  /** Pause an upload. */
  pause(entryId: string): void {
    const entry = this.entries.get(entryId);
    if (entry?.status === "uploading") {
      entry.abortController.abort();
      entry.status = "paused";
    }
  }

  /** Resume a paused upload. */
  async resume(entryId: string): Promise<UploadResult> {
    const entry = this.entries.get(entryId);
    if (entry?.status === "paused") {
      return this.upload(entryId);
    }
    throw new Error(`Cannot resume file in state: ${entry?.status}`);
  }

  /** Cancel and remove an upload. */
  cancel(entryId: string): void {
    const entry = this.entries.get(entryId);
    if (entry) {
      entry.abortController.abort();
      entry.status = "aborted";
      this.cleanupPreview(entry);
      this.entries.delete(entryId);
    }
  }

  /** Cancel all uploads. */
  cancelAll(): void {
    for (const [id] of this.entries) {
      this.cancel(id);
    }
  }

  /** Get all file entries. */
  getEntries(): FileEntry[] {
    return Array.from(this.entries.values());
  }

  /** Get a specific entry. */
  getEntry(id: string): FileEntry | undefined {
    return this.entries.get(id);
  }

  /** Remove a completed/failed entry. */
  remove(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      this.cleanupPreview(entry);
      this.entries.delete(id);
    }
  }

  // --- Internal ---

  private async simpleUpload(entry: FileEntry): Promise<UploadResult> {
    const startTime = Date.now();
    const formData = new FormData();
    formData.append("file", entry.file);

    // Add extra fields
    if (this.options.fields) {
      for (const [key, value] of Object.entries(this.options.fields)) {
        formData.append(key, value);
      }
    }

    const transformed = this.options.transformRequest?.(formData, entry.file) ?? formData;

    const response = await fetch(this.options.endpoint, {
      method: this.options.method,
      headers: this.options.headers,
      body: transformed,
      signal: entry.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const parser = this.options.parseResponse ?? defaultResponseParser;
    const result = await parser(response);
    result.duration = Date.now() - startTime;

    entry.status = "completed";
    entry.result = result;
    this.updateProgress(entry, entry.file.size, entry.file.size);
    this.options.onComplete?.(result);

    return result;
  }

  private async chunkedUpload(entry: FileEntry): Promise<UploadResult> {
    const startTime = Date.now();
    const chunkMgr = new ChunkManager(entry.file, this.options.chunkSize);
    const fileId = entry.id;
    const fileName = entry.file.name;

    // Initiate multipart upload (in production, call server to get upload ID)
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    while (!chunkMgr.allDone && !entry.abortController.signal.aborted) {
      const pendingChunks = chunkMgr.getChunks()
        .filter((c) => !c.uploaded)
        .slice(0, this.options.parallelChunks);

      if (pendingChunks.length === 0) break;

      await Promise.allSettled(
        pendingChunks.map(async (chunk) => {
          const formData = new FormData();
          formData.append("chunk", chunk.data);
          formData.append("chunkIndex", String(chunk.index));
          formData.append("totalChunks", String(chunkMgr.total));
          formData.append("fileId", fileId);
          formData.append("fileName", fileName);
          formData.append("uploadId", uploadId);

          try {
            const resp = await fetch(this.options.endpoint, {
              method: "POST",
              headers: { ...this.options.headers, "X-Upload-Type": "chunked" },
              body: formData,
              signal: entry.abortController.signal,
            });

            if (!resp.ok) throw new Error(`Chunk ${chunk.index} failed: ${resp.status}`);

            chunkMgr.markUploaded(chunk.index);
            this.reportChunkProgress(entry, chunkMgr, entry.file.size);
          } catch (err) {
            if ((err as Error).name === "AbortError") throw err;

            chunkMgr.incrementRetry(chunk.index);
            if (chunk.retries >= this.options.maxRetries) {
              throw new Error(`Chunk ${chunk.index} exceeded max retries`);
            }
            // Will be retried in next loop iteration
          }
        }),
      );
    }

    if (entry.abortController.signal.aborted) {
      entry.status = "aborted";
      throw new Error("Upload aborted");
    }

    // Complete multipart upload
    const completeResp = await fetch(this.options.endpoint, {
      method: "POST",
      headers: { ...this.options.headers, "X-Upload-Action": "complete" },
      body: JSON.stringify({ uploadId, fileId, fileName, totalChunks: chunkMgr.total }),
      signal: entry.abortController.signal,
    });

    if (!completeResp.ok) throw new Error("Failed to complete upload");

    const parser = this.options.parseResponse ?? defaultResponseParser;
    const result = await parser(completeResp);
    result.duration = Date.now() - startTime;

    entry.status = "completed";
    entry.result = result;
    this.options.onComplete?.(result);
    return result;
  }

  private reportChunkProgress(entry: FileEntry, mgr: ChunkManager, totalSize: number): void {
    const loaded = Math.round((mgr.completed / mgr.total) * totalSize);
    this.updateProgress(entry, loaded, totalSize, {
      total: mgr.total,
      completed: mgr.completed,
    });
  }

  private updateProgress(
    entry: FileEntry,
    loaded: number,
    total: number,
    chunks?: { total: number; completed: number },
  ): void {
    const now = Date.now();
    const prevLoaded = entry.progress.loaded;
    const prevTime = entry.progress._lastUpdate ?? now;
    const elapsed = (now - prevTime) / 1000;

    const speed = elapsed > 0 ? (loaded - prevLoaded) / elapsed : 0;
    const remaining = speed > 0 ? (total - loaded) / speed : 0;

    entry.progress = {
      fileId: entry.id,
      fileName: entry.file.name,
      status: entry.status,
      loaded,
      total,
      percent: total > 0 ? Math.round((loaded / total) * 100) : 0,
      speed,
      eta: Math.round(remaining),
      chunks,
      _lastUpdate: now,
    };

    this.options.onProgress?.(entry.progress);
  }

  private createEmptyProgress(file: File): UploadProgress {
    return {
      fileId: "",
      fileName: file.name,
      status: "idle",
      loaded: 0,
      total: file.size,
      percent: 0,
      speed: 0,
      eta: 0,
    };
  }

  private normalizeError(err: unknown, entry: FileEntry): UploadError {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort = (err as Error)?.name === "AbortError";

    return {
      fileId: entry.id,
      fileName: entry.file.name,
      message,
      code: isAbort ? "ABORTED" : "UPLOAD_ERROR",
      retryable: !isAbort && message.includes("failed"),
    };
  }

  private cleanupPreview(entry: FileEntry): void {
    if (entry.previewUrl) {
      URL.revokeObjectURL(entry.previewUrl);
    }
  }
}

// --- Queue Manager ---

class QueueManager {
  private running = 0;
  private queue: Array<() => Promise<unknown>> = [];
  private concurrency: number;

  constructor(options: QueueOptions = {}) {
    this.concurrency = options.concurrency ?? 3;
  }

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        } finally {
          this.running--;
          this.next();
        }
      });
      this.next();
    });
  }

  private next(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      this.running++;
      const task = this.queue.shift()!;
      task();
    }
  }
}

// --- Drag & Drop Helpers ---

export interface DropZoneOptions {
  /** Element or selector */
  element: HTMLElement | string;
  /** Called when files are dropped */
  onDrop: (files: File[]) => void;
  /** Called on drag over */
  onDragOver?: (event: DragEvent) => void;
  /** Called on drag leave */
  onDragLeave?: (event: DragEvent) => void;
  /** Accepted types */
  accept?: string[];
  /** Disable click-to-upload? */
  disableClick?: boolean;
  /** Show visual feedback class */
  activeClass?: string;
}

/** Create a drag-and-drop zone. */
export function createDropZone(options: DropZoneOptions): { destroy: () => void } {
  const el = typeof options.element === "string"
    ? document.querySelector<HTMLElement>(options.element)!
    : options.element;

  const activeClass = options.activeClass ?? "dropzone-active";

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add(activeClass);
    options.onDragOver?.(e);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove if leaving the element itself
    if (!el.contains(e.relatedTarget as Node)) {
      el.classList.remove(activeClass);
    }
    options.onDragLeave?.(e);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.remove(activeClass);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      options.onDrop(Array.from(files));
    }
  };

  el.addEventListener("dragover", handleDragOver);
  el.addEventListener("dragleave", handleDragLeave);
  el.addEventListener("drop", handleDrop);

  // Click to upload
  if (!options.disableClick) {
    const handleClick = () => {
      const input = document.createElement("input");
      input.type = "file";
      if (options.accept?.length) input.accept = options.accept.join(",");
      input.multiple = true;
      input.onchange = () => {
        if (input.files?.length) {
          options.onDrop(Array.from(input.files));
        }
      };
      input.click();
    };
    el.addEventListener("click", handleClick);
    return {
      destroy: () => {
        el.removeEventListener("dragover", handleDragOver);
        el.removeEventListener("dragleave", handleDragLeave);
        el.removeEventListener("drop", handleDrop);
        el.removeEventListener("click", handleClick);
      },
    };
  }

  return {
    destroy: () => {
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("drop", handleDrop);
    },
  };
}

// --- Paste Handler ---

export interface PasteOptions {
  /** Element to attach paste listener */
  element: HTMLElement | string;
  /** Called when files are pasted */
  onPaste: (files: File[]) => void;
  /** Also accept pasted images as data URLs? */
  acceptImageData?: boolean;
  /** Callback for image data URLs */
  onImagePaste?: (dataUrl: string) => void;
}

/** Create a paste-to-upload handler. */
export function createPasteHandler(options: PasteOptions): { destroy: () => void } {
  const el = typeof options.element === "string"
    ? document.querySelector<HTMLElement>(options.element)!
    : options.element;

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item?.kind === "file") {
        const file = item.getAsFile();
        if (file) files.push(file);
      } else if (options.acceptImageData && item?.type.startsWith("image/")) {
        const blob = item.getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            options.onImagePaste?.(reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      options.onPaste(files);
    }
  };

  el.addEventListener("paste", handlePaste);

  return {
    destroy: () => {
      el.removeEventListener("paste", handlePaste);
    },
  };
}

// --- Image Preview Generator ---

/** Generate a preview (data URL or object URL) for a file. */
export function generatePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(""); // Non-image files get empty preview
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // Large files: use object URL (no memory overhead)
      resolve(URL.createObjectURL(file));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/** Get file icon based on MIME type. */
export function getFileIcon(mimeType: string): string {
  const icons: Record<string, string> = {
    "image": "\u{1F5BC}",
    "video": "\u{1F3AC}",
    "audio": "\u{1F3B5}",
    "pdf": "\u{1F4C4}",
    "zip": "\u{1F4E6}",
    "text": "\u{1F4DD}",
    "spreadsheet": "\u{1F4CA}",
    "presentation": "\u{1F4DA}",
    "code": "{ }",
    "default": "\u{1F4CE}",
  };

  if (mimeType.startsWith("image/")) return icons.image;
  if (mimeType.startsWith("video/")) return icons.video;
  if (mimeType.startsWith("audio/")) return icons.audio;
  if (mimeType === "application/pdf") return icons.pdf;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return icons.zip;
  if (mimeType.startsWith("text/")) return icons.text;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return icons.spreadsheet;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return icons.presentation;
  if (mimeType.includes("javascript") || mimeType.includes("json") || mimeType.includes("xml")) return icons.code;

  return icons.default;
}

// --- Utilities ---

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function defaultResponseParser(response: Response): Promise<UploadResult> {
  const data = await response.json() as Record<string, unknown>;
  return {
    fileId: data.fileId as string ?? "",
    fileName: data.fileName as string ?? "",
    url: data.url as string ?? "",
    size: data.size as number ?? 0,
    mimeType: data.mimeType as string ?? "",
    metadata: data.metadata as Record<string, unknown>,
    duration: 0,
  };
}
