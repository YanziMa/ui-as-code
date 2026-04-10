/**
 * MIME type detection and utilities.
 */

/** Common MIME type mappings */
export const MIME_MAP: Record<string, string> = {
  // Text
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  csv: "text/csv",
  txt: "text/plain",
  xml: "application/xml",
  json: "application/json",
  md: "text/markdown",

  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  bmp: "image/bmp",
  avif: "image/avif",

  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",

  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",

  // Documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",

  // Archives
  zip: "application/zip",
  gz: "application/gzip",
  tar: "application/x-tar",
  rar: "application/vnd.rar",
  "7z": "application/x-7z-compressed",

  // Fonts
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",

  // Data
  wasm: "application/wasm",
  bin: "application/octet-stream",
};

/** Get MIME type from file extension */
export function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_MAP[ext] ?? "application/octet-stream";
}

/** Get file extension from MIME type */
export function getExtension(mimeType: string): string {
  const entry = Object.entries(MIME_MAP).find(([, v]) => v === mimeType);
  return entry?.[0] ?? "";
}

/** Check if MIME type is an image */
export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Check if MIME type is video */
export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

/** Check if MIME type is audio */
export function isAudioMime(mime: string): boolean {
  return mime.startsWith("audio/");
}

/** Check if MIME type is text-based */
export function isTextMime(mime: string): boolean {
  return (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript" ||
    mime === "application/typescript"
  );
}

/** Check if MIME type is a document */
export function isDocumentMime(mime: string): boolean {
  const docs = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  return docs.includes(mime);
}

/** Check if MIME type is an archive */
export function isArchiveMime(mime: string): boolean {
  return [
    "application/zip",
    "application/gzip",
    "application/x-tar",
    "application/vnd.rar",
    "application/x-7z-compressed",
  ].includes(mime);
}

/** Get category of a MIME type */
export function getMimeCategory(mime: string): MimeCategory {
  if (isImageMime(mime)) return "image";
  if (isVideoMime(mime)) return "video";
  if (isAudioMime(mime)) return "audio";
  if (isDocumentMime(mime)) return "document";
  if (isArchiveMime(mime)) return "archive";
  if (isTextMime(mime)) return "text";
  if (mime.startsWith("font/")) return "font";
  return "other";
}

export type MimeCategory = "image" | "video" | "audio" | "document" | "archive" | "text" | "font" | "other";

/** Get human-readable label for MIME category */
export function getMimeCategoryLabel(category: MimeCategory): string {
  const labels: Record<MimeCategory, string> = {
    image: "Image",
    video: "Video",
    audio: "Audio",
    document: "Document",
    archive: "Archive",
    text: "Text",
    font: "Font",
    other: "Other",
  };
  return labels[category];
}

/** Parse Content-Type header into MIME type and charset */
export function parseContentType(header: string): { mime: string; charset: string | null; boundary: string | null } {
  const [mimePart, ...params] = header.split(";").map((s) => s.trim());
  let charset: string | null = null;
  let boundary: string | null = null;

  for (const param of params) {
    const [key, value] = param.split("=").map((s) => s.trim());
    if (key?.toLowerCase() === "charset") charset = value ?? null;
    if (key?.toLowerCase() === "boundary") boundary = value?.replace(/^["']|["']$/g, "") ?? null;
  }

  return { mime: mimePart, charset, boundary };
}

/** Build Content-Type header */
export function buildContentType(
  mime: string,
  options: { charset?: string; boundary?: string } = {},
): string {
  const parts = [mime];
  if (options.charset) parts.push(`charset=${options.charset}`);
  if (options.boundary) parts.push(`boundary="${options.boundary}"`);
  return parts.join("; ");
}

/** Detect MIME type from magic bytes (file signature) */
export function detectMimeTypeFromBytes(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  // Check common signatures
  if (arr.length < 4) return "application/octet-stream";

  // PDF
  if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) {
    return "application/pdf";
  }

  // PNG
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
    return "image/png";
  }

  // JPEG
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) {
    return "image/jpeg";
  }

  // GIF
  if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) {
    return "image/gif";
  }

  // WebP
  if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
    return "image/webp";
  }

  // ZIP (also used by docx, xlsx, etc.)
  if (arr[0] === 0x50 && arr[1] === 0x4B && arr[2] === 0x03 && arr[3] === 0x04) {
    return "application/zip";
  }

  // GZIP
  if (arr[0] === 0x1F && arr[1] === 0x8B) {
    return "application/gzip";
  }

  // TIFF
  if ((arr[0] === 0x49 && arr[1] === 0x49 && arr[2] === 0x2A) ||
      (arr[0] === 0x4D && arr[1] === 0x4D && arr[2] === 0x00)) {
    return "image/tiff";
  }

  // BMP
  if (arr[0] === 0x42 && arr[1] === 0x4D) {
    return "image/bmp";
  }

  // WebAssembly
  if (arr[0] === 0x00 && arr[1] === 0x61 && arr[2] === 0x73 && arr[3] === 0x6D) {
    return "application/wasm";
  }

  // MP4
  if (arr.length >= 8 &&
      arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
    return "video/mp4";
  }

  // WOFF
  if (arr[0] === 0x77 && arr[1] === 0x4F && arr[2] === 0x46 && arr[3] === 0x46) {
    return "font/woff";
  }

  // WOFF2
  if (arr[0] === 0x77 && arr[1] === 0x4F && arr[2] === 0x46 && arr[3] === 0x32) {
    return "font/woff2";
  }

  return "application/octet-stream";
}
