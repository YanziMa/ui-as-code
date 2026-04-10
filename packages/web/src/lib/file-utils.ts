/**
 * File handling utilities: MIME type detection, file validation,
 * drag-and-drop handling, chunked upload helpers, file reading,
 * filename sanitization, and file type categorization.
 */

// --- MIME Types ---

/** Common MIME type mappings */
export const MIME_MAP: Record<string, string> = {
  // Images
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
  gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  ico: "image/x-icon", bmp: "image/bmp", avif: "image/avif",
  // Documents
  pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  rtf: "application/rtf", txt: "text/plain", csv: "text/csv",
  md: "text/markdown", json: "application/json",
  // Archives
  zip: "application/zip", "7z": "application/x-7z-compressed",
  rar: "application/x-rar-compressed", tar: "application/x-tar",
  gz: "application/gzip", bz2: "application/x-bzip2",
  // Audio
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
  flac: "audio/flac", aac: "audio/aac", m4a: "audio/mp4",
  wma: "audio/x-ms-wma",
  // Video
  mp4: "video/mp4", webm: "video/webm", avi: "video/x-msvideo",
  mkv: "video/x-matroska", mov: "video/quicktime",
  // Code
  js: "application/javascript", ts: "application/typescript",
  html: "text/html", css: "text/css", xml: "application/xml",
  py: "text/x-python", java: "text/x-java-source",
  c: "text/x-c", cpp: "text/x-c++src", sh: "application/x-sh",
  // Data
  sql: "application/sql", yaml: "application/x-yaml",
  toml: "application/toml", ini: "text/plain",
};

/** Get MIME type from file extension */
export function getMimeType(filename: string): string {
  const ext = getExtension(filename).toLowerCase();
  return MIME_MAP[ext] ?? "application/octet-stream";
}

/** Get file extension from filename */
export function getExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.slice(lastDot + 1);
}

/** Get base name without extension */
export function getBaseName(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) return filename;
  return filename.slice(0, lastDot);
}

// --- File Type Categories ---

export type FileCategory = "image" | "document" | "archive" | "audio" | "video" | "code" | "data" | "other";

const CATEGORY_PATTERNS: Record<FileCategory, RegExp> = {
  image: /^image\//,
  document: /^(text\/|application\/(pdf|rtf|msword|vnd\.openxml|vnd\.oasis))/,
  archive: /(?:zip|rar|7z|tar|gzip|bzip2|compress|x-(?:7z|rar|tar))/,
  audio: /^audio\//,
  video: /^video\//,
  code: /(?:javascript|typescript|xml|python|java|c\+\+|c#|ruby|go|rust|php|sh|shell)/i,
  data: /(?:json|csv|sql|yaml|toml|xml)/i,
  other: /.*/,
};

/** Categorize a file by its MIME type */
export function categorizeFile(mimeType: string): FileCategory {
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (pattern.test(mimeType)) return category as FileCategory;
  }
  return "other";
}

/** Check if MIME type is in a category */
export function isFileType(mimeType: string, category: FileCategory): boolean {
  return CATEGORY_PATTERNS[category].test(mimeType);
}

/** Common file extensions per category */
export const FILE_EXTENSIONS: Record<FileCategory, string[]> = {
  image: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"],
  document: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "txt", "csv", "md"],
  archive: ["zip", "7z", "rar", "tar", "gz", "bz2"],
  audio: ["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"],
  video: ["mp4", "webm", "avi", "mkv", "mov"],
  code: ["js", "ts", "html", "css", "json", "py", "java", "cpp", "c", "sh", "rb", "go", "rs", "php", "xml", "yaml", "yml"],
  data: ["json", "csv", "sql", "yaml", "yml", "toml", "ini"],
  other: [],
};

// --- File Validation ---

export interface FileValidationOptions {
  /** Allowed MIME types (or categories like "image") */
  accept?: string[];
  /** Max file size in bytes */
  maxSize?: number;
  /** Min file size in bytes */
  minSize?: number;
  /** Allowed extensions */
  extensions?: string[];
  /** Max total files (for multiple) */
  maxFiles?: number;
}

export interface FileValidationError {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Validate a single file against options */
export function validateFile(file: File, options: FileValidationOptions = {}): FileValidationError {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Size checks
  if (options.maxSize && file.size > options.maxSize) {
    errors.push(`File too large: ${formatBytes(file.size)} exceeds ${formatBytes(options.maxSize)}`);
  }
  if (options.minSize && file.size < options.minSize) {
    errors.push(`File too small: ${formatBytes(file.size)} below minimum ${formatBytes(options.minSize)}`);
  }

  // Extension check
  if (options.extensions?.length) {
    const ext = getExtension(file.name).toLowerCase();
    if (!options.extensions.includes(ext)) {
      errors.push(`Invalid extension: .${ext}. Allowed: ${options.extensions.join(", ")}`);
    }
  }

  // Accept check (MIME types or categories)
  if (options.accept?.length) {
    const mimeType = file.type || getMimeType(file.name);
    const ext = getExtension(file.name).toLowerCase();
    const accepted = options.accept.some((a) => {
      if (a.startsWith(".")) return a.slice(1).toLowerCase() === ext;
      if (a.endsWith("/*")) {
        const cat = a.replace("/*", "");
        return mimeType.startsWith(cat + "/") || categorizeFile(mimeType) === cat;
      }
      return mimeType === a;
    });
    if (!accepted) {
      errors.push(`File type not accepted: ${mimeType}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate multiple files */
export function validateFiles(files: File[], options: FileValidationOptions = {}): Map<File, FileValidationError> {
  const results = new Map<File, FileValidationError>();

  if (options.maxFiles && files.length > options.maxFiles) {
    const err: FileValidationError = { valid: false, errors: [`Too many files: ${files.length} > ${options.maxFiles}`], warnings: [] };
    for (const f of files) results.set(f, err);
    return results;
  }

  for (const file of files) {
    results.set(file, validateFile(file, options));
  }
  return results;
}

// --- Filename Utilities ---

/** Sanitize a filename for safe filesystem use */
export function sanitizeFilename(name: string, options?: { maxLength?: number; replacement?: string }): string {
  const { maxLength = 255, replacement = "_" } = options ?? {};
  let result = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, replacement)
    .replace(/^\.+/g, replacement)       // Don't start with dots
    .replace(/\s+/g, "_")                 // Spaces → underscores
    .replace(/_{2,}/g, replacement);     // Collapse multiple underscores

  // Remove trailing dots/spaces/underscores
  result = result.replace(/[_.\s]+$/, "");

  // Truncate
  if (result.length > maxLength) {
    const ext = getExtension(result);
    const base = result.slice(0, maxLength - (ext ? ext.length + 1 : 0));
    result = ext ? `${base}.${ext}` : base;
  }

  return result || "unnamed";
}

/** Generate a unique filename (appends suffix if needed) */
export function uniqueFilename(base: string, existingNames: Set<string>): string {
  let name = base;
  let counter = 1;
  while (existingNames.has(name)) {
    const ext = getExtension(base);
    const baseNoExt = getBaseName(base);
    name = ext ? `${baseNoExt}_${counter}.${ext}` : `${base}_${counter}`;
    counter++;
  }
  return name;
}

/** Format file size with appropriate unit */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${units[i]}`;
}

/** Format file size with auto unit selection (short form) */
export function formatFileSizeShort(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}G`;
}

/** Get file icon name based on extension/category */
export function getFileIcon(filename: string, mimeType?: string): string {
  const ext = getExtension(filename).toLowerCase();
  const mime = mimeType ?? getMimeType(filename);

  if (/^image\//.test(mime)) return "image";
  if (/^video\//.test(mime)) return "video";
  if (/^audio\//.test(mime)) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (["zip", "7z", "rar", "tar", "gz"].includes(ext)) return "archive";
  if (["js", "ts", "jsx", "tsx", "py", "java", "go", "rs"].includes(ext)) return "code";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt"].includes(ext)) return "document";
  return "file";
}

// --- Drag & Drop Helpers ---

export interface DropEvent {
  files: File[];
  items: DataTransferItem[];
  isDirectory: boolean;
}

/** Parse a drag/drop event into structured data */
export function parseDropEvent(event: DragEvent): DropEvent | null {
  if (!event.dataTransfer) return null;

  const files = Array.from(event.dataTransfer.files);
  const items = Array.from(event.dataTransfer.items);
  const isDirectory = items.some((item) => item.kind === "file" && item.webkitGetAsEntry()?.isDirectory);

  return { files, items, isDirectory };
}

/** Prevent default drag behavior on an element */
export function setupDropZone(
  element: HTMLElement,
  handlers: {
    onDragEnter?: (e: DragEvent) => void;
    onDragOver?: (e: DragEvent) => void;
    onDragLeave?: (e: DragEvent) => void;
    onDrop: (e: DragEvent, dropData: DropEvent) => void;
    onError?: (error: Error) => void;
  },
): () => void {
  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handlers.onDragEnter?.(e);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handlers.onDragOver?.(e);
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handlers.onDragLeave?.(e);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const dropData = parseDropEvent(e);
      if (dropData) handlers.onDrop(e, dropData);
    } catch (err) {
      handlers.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  };

  element.addEventListener("dragenter", onDragEnter);
  element.addEventListener("dragover", onDragOver);
  element.addEventListener("dragleave", onDragLeave);
  element.addEventListener("drop", onDrop);

  return () => {
    element.removeEventListener("dragenter", onDragEnter);
    element.removeEventListener("dragover", onDragOver);
    element.removeEventListener("dragleave", onDragLeave);
    element.removeEventListener("drop", onDrop);
  };
}

// --- File Reading Helpers ---

/** Read file as text */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsText(file);
  });
}

/** Read file as data URL */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/** Read file as ArrayBuffer */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

/** Read file as binary string */
export function readFileAsBinaryString(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsBinaryString(file);
  });
}

/** Read first N bytes of a file (for magic number detection) */
export function readFileHeader(file: File, bytes = 4): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const slice = file.slice(0, bytes);
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(new Error(`Failed to read header: ${file.name}`));
    reader.readAsArrayBuffer(slice);
  });
}

// --- Chunked Upload Helpers ---

export interface FileChunk {
  index: number;
  start: number;
  end: number;
  data: Blob;
  totalChunks: number;
}

/** Split a file into chunks for upload */
export function splitFileIntoChunks(file: File, chunkSize = 5 * 1024 * 1024): FileChunk[] {
  const chunks: FileChunk[] = [];
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    chunks.push({
      index: i,
      start,
      end,
      data: file.slice(start, end),
      totalChunks,
    });
  }

  return chunks;
}

/** Reassemble chunks from uploaded parts (for download/reconstruction) */
export interface UploadProgress {
  fileId: string;
  fileName: string;
  totalChunks: number;
  completedChunks: number;
  progress: number; // 0-100
  status: "uploading" | "paused" | "complete" | "error" | "merging";
  error?: string;
}

/** Track upload progress across multiple chunks */
export class UploadTracker {
  private uploads = new Map<string, UploadProgress>();

  createUpload(fileId: string, fileName: string, totalChunks: number): UploadProgress {
    const progress: UploadProgress = {
      fileId,
      fileName,
      totalChunks,
      completedChunks: 0,
      progress: 0,
      status: "uploading",
    };
    this.uploads.set(fileId, progress);
    return progress;
  }

  updateChunk(fileId: string, chunkIndex: number): UploadProgress | undefined {
    const upload = this.uploads.get(fileId);
    if (!upload) return undefined;

    upload.completedChunks++;
    upload.progress = Math.round((upload.completedChunks / upload.totalChunks) * 100);

    if (upload.completedChunks >= upload.totalChunks) {
      upload.status = "merging";
    }

    return upload;
  }

  completeUpload(fileId: string): UploadProgress | undefined {
    const upload = this.uploads.get(fileId);
    if (!upload) return undefined;
    upload.status = "complete";
    upload.progress = 100;
    return upload;
  }

  failUpload(fileId: string, error: string): UploadProgress | undefined {
    const upload = this.uploads.get(fileId);
    if (!upload) return undefined;
    upload.status = "error";
    upload.error = error;
    return upload;
  }

  getUpload(fileId: string): UploadProgress | undefined {
    return this.uploads.get(fileId);
  }

  getAllUploads(): UploadProgress[] {
    return [...this.uploads.values()];
  }

  removeUpload(fileId: string): boolean {
    return this.uploads.delete(fileId);
  }

  clear(): void {
    this.uploads.clear();
  }
}
