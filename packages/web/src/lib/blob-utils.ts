/**
 * Blob & File utilities — creation, conversion, slicing, URLs, reading.
 */

// --- Types ---

export interface BlobParts {
  strings?: string[];
  arrayBuffers?: ArrayBuffer[];
  typedArrays?: (Uint8Array | Int8Array | Uint16Array | Int16Array |
                   Uint32Array | Int32Array | Float32Array | Float64Array)[];
  blobs?: Blob[];
  buffers?: BufferSource[];
}

export interface BlobReadOptions {
  /** Encoding for text reads (default: utf-8) */
  encoding?: string;
  /** Abort signal */
  signal?: AbortSignal;
}

export interface FileSliceOptions {
  /** Start byte offset */
  start?: number;
  /** End byte offset */
  end?: number;
  /** MIME type for the slice */
  contentType?: string;
}

// --- Creation ---

/**
 * Create a Blob from various input types.
 */
export function createBlob(data: BlobParts, type = "application/octet-stream"): Blob {
  const parts: BlobPart[] = [];

  if (data.strings) parts.push(...data.strings);
  if (data.arrayBuffers) parts.push(...data.arrayBuffers);
  if (data.typedArrays) parts.push(...data.typedArrays);
  if (data.blobs) parts.push(...data.blobs);
  if (data.buffers) parts.push(...data.buffers);

  return new Blob(parts, { type });
}

/**
 * Create a Blob from a string with specified encoding.
 */
export function stringToBlob(str: string, type = "text/plain"): Blob {
  return new Blob([str], { type });
}

/**
 * Create a Blob from JSON data.
 */
export function jsonToBlob(data: unknown, pretty = false): Blob {
  const str = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  return stringToBlob(str, "application/json");
}

/**
 * Create a File object from data.
 */
export function createFile(
  data: BlobPart[],
  name: string,
  options?: { type?: string; lastModified?: number },
): File {
  return new File(data, name, {
    type: options?.type ?? "application/octet-stream",
    lastModified: options?.lastModified ?? Date.now(),
  });
}

// --- Reading ---

/**
 * Read a Blob/File as text.
 */
export async function readAsText(blob: Blob | File, options?: BlobReadOptions): Promise<string> {
  if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        reader.abort();
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    }

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`FileReader error: ${reader.error?.message}`));
    reader.readAsText(blob, options?.encoding);
  });
}

/**
 * Read a Blob/File as ArrayBuffer.
 */
export async function readAsArrayBuffer(blob: Blob | File, options?: BlobReadOptions): Promise<ArrayBuffer> {
  if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();

    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        reader.abort();
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    }

    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`FileReader error: ${reader.error?.message}`));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Read a Blob/File as Data URL (base64).
 */
export async function readAsDataURL(blob: Blob | File, options?: BlobReadOptions): Promise<string> {
  if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        reader.abort();
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    }

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`FileReader error: ${reader.error?.message}`));
    reader.readAsDataURL(blob);
  });
}

/**
 * Read a Blob/File as binary string.
 */
export async function readAsBinaryString(blob: Blob | File, options?: BlobReadOptions): Promise<string> {
  if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    if (options?.signal) {
      options.signal.addEventListener("abort", () => {
        reader.abort();
        reject(new DOMException("Aborted", "AbortError"));
      }, { once: true });
    }

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`FileReader error: ${reader.error?.message}`));
    reader.readAsBinaryString(blob);
  });
}

// --- Conversion ---

/**
 * Convert a Blob to a Uint8Array.
 */
export async function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  const buffer = await readAsArrayBuffer(blob);
  return new Uint8Array(buffer);
}

/**
 * Convert a Uint8Array to a Blob.
 */
export function uint8ArrayToBlob(data: Uint8Array, type = "application/octet-stream"): Blob {
  return new Blob([data], { type });
}

/**
 * Convert base64 string to Blob.
 */
export function base64ToBlob(base64: string, type = "application/octet-stream"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return uint8ArrayToBlob(bytes, type);
}

/**
 * Convert Blob to base64 string.
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await readAsDataURL(blob);
  return dataUrl.split(",")[1]!;
}

/**
 * Convert ArrayBuffer to base64 string.
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer.
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// --- Slicing ---

/**
 * Slice a Blob/File with friendly options.
 */
export function sliceBlob(blob: Blob | File, options: FileSliceOptions): Blob {
  return blob.slice(options.start ?? 0, options.end, options.contentType);
}

/**
 * Split a Blob into chunks of specified size.
 */
export function splitBlob(blob: Blob, chunkSize: number): Blob[] {
  const blobs: Blob[] = [];
  let offset = 0;

  while (offset < blob.size) {
    blobs.push(blob.slice(offset, offset + chunkSize));
    offset += chunkSize;
  }

  return blobs;
}

// --- URL Management ---

/**
 * Create an object URL for a Blob/File.
 */
export function createObjectURL(blob: Blob | File): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke an object URL.
 */
export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Create a temporary object URL that auto-revokes after a duration.
 */
export function createTempObjectURL(blob: Blob | File, ttlMs: number = 60000): string {
  const url = createObjectURL(blob);
  setTimeout(() => revokeObjectURL(url), ttlMs);
  return url;
}

// --- Information ---

/**
 * Get human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Get MIME type from filename extension.
 */
export function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const mimeMap: Record<string, string> = {
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "application/javascript",
    mjs: "application/javascript",
    json: "application/json",
    xml: "application/xml",
    txt: "text/plain",
    csv: "text/csv",
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    webm: "video/webm",
    avi: "video/x-msvideo",
    zip: "application/zip",
    gz: "application/gzip",
    tar: "application/x-tar",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    otf: "font/otf",
    ttf: "font/ttf",
    woff: "font/woff",
    woff2: "font/woff2",
    eot: "application/vnd.ms-fontobject",
    wasm: "application/wasm",
  };

  return mimeMap[ext] ?? "application/octet-stream";
}

/**
 * Check if a MIME type is an image.
 */
export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/**
 * Check if a MIME type is audio.
 */
export function isAudioMime(mime: string): boolean {
  return mime.startsWith("audio/");
}

/**
 * Check if a MIME type is video.
 */
export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

/**
 * Check if a MIME type is text-based.
 */
export function isTextMime(mime: string): boolean {
  return mime.startsWith("text/") ||
    ["application/json", "application/javascript", "application/xml"].includes(mime);
}

// --- Download ---

/**
 * Trigger browser download of a Blob/File.
 */
export function downloadBlob(blob: Blob | File, filename?: string): void {
  const url = createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? (blob instanceof File ? blob.name : "download");
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => revokeObjectURL(url), 100);
}

/**
 * Download from a data URL.
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// --- Comparison ---

/**
 * Compare two Blobs for equality (by content).
 */
export async function compareBlobs(a: Blob, b: Blob): Promise<boolean> {
  if (a.size !== b.size) return false;

  const arrA = await readAsArrayBuffer(a);
  const arrB = await readAsArrayBuffer(b);

  const viewA = new Uint8Array(arrA);
  const viewB = new Uint8Array(arrB);

  for (let i = 0; i < viewA.length; i++) {
    if (viewA[i] !== viewB[i]) return false;
  }

  return true;
}

// --- Hashing (simple non-crypto) ---

/**
 * Compute a simple hash of Blob contents (for deduplication, not security).
 */
export async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await readAsArrayBuffer(blob);
  const view = new Uint8Array(buffer);
  let hash = 0;

  for (let i = 0; i < view.length; i++) {
    hash = ((hash << 5) - hash + view[i]) | 0;
  }

  return Math.abs(hash).toString(36);
}
