/**
 * File System v3: Virtual file system abstraction, File System Access API (OPFS) wrapper,
 * path utilities, glob pattern matching, file watching, MIME type detection,
 * directory tree operations, drag-and-drop file handling, clipboard file API.
 */

// --- Path Utilities ---

export interface PathComponents {
  root: string;
  dir: string;
  name: string;
  ext: string;
}

/** Normalize a path (resolve . and .., convert separators) */
export function normalizePath(path: string, sep = "/"): string {
  let normalized = path.replace(/\\/g, sep);
  const parts = normalized.split(sep).filter(Boolean);
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") { resolved.pop(); continue; }
    resolved.push(part);
  }

  return (normalized.startsWith(sep) ? sep : "") + resolved.join(sep);
}

/** Join path segments */
export function joinPath(...segments: string[]): string {
  return segments.filter(Boolean).join("/").replace(/\/+/g, "/");
}

/** Get directory name from path */
export function dirname(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash <= 0 ? "." : normalized.slice(0, lastSlash);
}

/** Get base filename from path */
export function basename(path: string, ext?: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");
  const name = lastSlash < 0 ? normalized : normalized.slice(lastSlash + 1);
  if (ext && name.endsWith(ext)) return name.slice(0, -ext.length);
  return name;
}

/** Get file extension from path */
export function extname(path: string): string {
  const name = basename(path);
  const dotIdx = name.lastIndexOf(".");
  return dotIdx <= 0 ? "" : name.slice(dotIdx);
}

/** Parse path into components */
export function parsePath(path: string): PathComponents {
  const normalized = normalizePath(path);
  return {
    root: normalized.startsWith("/") ? "/" : "",
    dir: dirname(normalized),
    name: basename(normalized),
    ext: extname(normalized),
  };
}

/** Check if path is absolute */
export function isAbsolute(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:/.test(path);
}

/** Check if path is a parent of another */
export function isParent(parent: string, child: string): boolean {
  const normParent = normalizePath(parent).replace(/\/$/, "");
  const normChild = normalizePath(child);
  return normChild.startsWith(normParent + "/") || normChild === normParent;
}

/** Get relative path from one path to another */
export function relative(from: string, to: string): string {
  const fromParts = normalizePath(from).split("/").filter(Boolean);
  const toParts = normalizePath(to).split("/").filter(Boolean);

  let commonLength = 0;
  while (commonLength < fromParts.length && commonLength < toParts.length && fromParts[commonLength] === toParts[commonLength]) {
    commonLength++;
  }

  const upCount = fromParts.length - commonLength;
  const downParts = toParts.slice(commonLength);

  return Array(upCount).fill("..").concat(downParts).join("/");
}

// --- Glob Pattern Matching ---

interface GlobOptions { dot?: boolean; caseSensitive?: boolean; onlyDir?: boolean; onlyFile?: boolean; matchBase?: boolean; }

/** Match a glob pattern against a path */
export function globMatch(pattern: string, path: string, options?: GlobOptions): boolean {
  const regex = globToRegex(pattern, options);
  return regex.test(path);
}

/** Convert glob pattern to RegExp */
export function globToRegex(pattern: string, options?: GlobOptions): RegExp {
  const caseSensitive = options?.caseSensitive ?? false;
  const flags = caseSensitive ? "" : "i";
  let regexStr = "";

  // Handle ** (recursive wildcard)
  // Handle * (single-level wildcard)
  // Handle ? (single character)
  // Handle [abc] (character class)
  // Handle {a,b} (alternatives)

  const parts = pattern.split("/");
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part === "**") {
      regexStr += "(?:[^/]+/)*";
      continue;
    }
    if (part === "*") {
      regexStr += "[^/]+";
      continue;
    }
    // Convert glob chars to regex
    let segment = "";
    for (const ch of part) {
      switch (ch) {
        case "*": segment += "[^/]*"; break;
        case "?": segment += "[^/]"; break;
        case ".": segment += "\\."; break;
        case "+": segment += "\\+"; break;
        case "(": segment += "\\("; break;
        case ")": segment += "\\)"; break;
        case "[": segment += "["; break;
        case "]": segment += "]"; break;
        case "{":
          // Find matching } and handle alternatives
          const closeIdx = part.indexOf("}", part.indexOf("{"));
          if (closeIdx > -1) {
            const altContent = part.slice(part.indexOf("{") + 1, closeIdx);
            const alts = altContent.split(",").map((a) => a.trim());
            segment += `(?:${alts.join("|")})`;
          }
          break;
        default:
          segment += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
    }
    regexStr += i < parts.length - 1 ? `${segment}/` : segment;
  }

  // Anchor
  if (!regexStr.includes("**")) {
    regexStr = `^${regexStr}$`;
  }

  try {
    return new RegExp(regexStr, flags);
  } catch {
    return /$^/; // Invalid pattern matches nothing
  }
}

/** Find files matching a glob pattern in a virtual/directory structure */
export function glob(pattern: string, files: string[], options?: GlobOptions): string[] {
  return files.filter((f) => globMatch(pattern, f, options));
}

// --- Virtual File System ---

export interface VFile {
  name: string;
  path: string;
  content: string | Uint8Array;
  type: "file" | "directory" | "symlink";
  size: number;
  createdAt: number;
  modifiedAt: number;
  permissions: number;
  mimeType?: string;
  children?: Map<string, VFile>;
  metadata?: Record<string, unknown>;
}

export class VirtualFileSystem {
  private root: VFile;
  private watchers = new Set<(event: FsEvent) => void>();

  constructor() {
    this.root = this.createDir("/", Date.now());
  }

  /** Create a new file or directory */
  async create(path: string, content: string | Uint8Array = "", type: "file" | "directory" = "file"): Promise<VFile> {
    const parentPath = dirname(path);
    const parent = await this.resolve(parentPath);
    if (!parent || parent.type !== "directory") throw new Error(`Parent not found: ${parentPath}`);

    const name = basename(path);
    if (parent.children!.has(name)) throw new Error(`Already exists: ${path}`);

    const now = Date.now();
    const vfile: VFile = {
      name,
      path: normalizePath(path),
      content,
      type,
      size: typeof content === "string" ? content.length : content.byteLength,
      createdAt: now,
      modifiedAt: now,
      permissions: type === "directory" ? 0o755 : 0o644,
      children: type === "directory" ? new Map() : undefined,
    };

    // Detect MIME type for files
    if (type === "file") vfile.mimeType = detectMimeType(name);

    parent.children!.set(name, vfile);
    this.emit({ type: "create", path, file: vfile });
    return vfile;
  }

  /** Read file content as text */
  async readText(path: string): Promise<string> {
    const file = await this.resolve(path);
    if (!file) throw new Error(`Not found: ${path}`);
    if (file.type !== "directory") return typeof file.content === "string" ? file.content : new TextDecoder().decode(file.content);
    throw new Error(`Is a directory: ${path}`);
  }

  /** Read file content as binary */
  async readBinary(path: string): Promise<Uint8Array> {
    const file = await this.resolve(path);
    if (!file) throw new Error(`Not found: ${path}`);
    if (typeof file.content === "string") return new TextEncoder().encode(file.content);
    return file.content;
  }

  /** Write content to file (creates if not exists) */
  async write(path: string, content: string | Uint8Array): Promise<void> {
    let file = await this.resolve(path);
    if (!file) {
      await this.create(path, content);
      return;
    }
    file.content = content;
    file.size = typeof content === "string" ? content.length : content.byteLength;
    file.modifiedAt = Date.now();
    this.emit({ type: "modify", path, file });
  }

  /** Delete a file or directory (recursive) */
  async delete(path: string): Promise<boolean> {
    const parentPath = dirname(path);
    const parent = await this.resolve(parentPath);
    if (!parent) return false;

    const name = basename(path);
    const file = parent.children?.get(name);
    if (!file) return false;

    if (file.type === "directory" && file.children) {
      for (const [childName] of file.children) {
        await this.delete(joinPath(path, childName));
      }
    }

    parent.children!.delete(name);
    this.emit({ type: "delete", path, file });
    return true;
  }

  /** Copy file or directory */
  async copy(src: string, dest: string): Promise<VFile> {
    const source = await this.resolve(src);
    if (!source) throw new Error(`Source not found: ${src}`);

    if (source.type === "directory") {
      const dir = await this.create(dest, "", "directory");
      if (source.children) {
        for (const [childName, child] of source.children) {
          await this.copy(joinPath(src, childName), joinPath(dest, childName));
        }
      }
      return dir;
    }

    return await this.create(dest, source.content);
  }

  /** Move/rename file or directory */
  async move(src: string, dest: string): Promise<VFile> {
    await this.copy(src, dest);
    await this.delete(src);
    return (await this.resolve(dest))!;
  }

  /** List directory contents */
  async list(path: string = "/"): Promise<VFile[]> {
    const dir = await this.resolve(path);
    if (!dir) throw new Error(`Not found: ${path}`);
    if (dir.type !== "directory") throw new Error(`Not a directory: ${path}`);
    return Array.from(dir.children?.values() ?? []);
  }

  /** Check if path exists */
  async exists(path: string): Promise<boolean> {
    return (await this.resolve(path)) !== null;
  }

  /** Get file/directory info */
  async stat(path: string): Promise<VFile | null> {
    return this.resolve(path);
  }

  /** Create directory recursively */
  async mkdirp(path: string): Promise<VFile> {
    if (await this.exists(path)) return (await this.resolve(path))!;

    const parentPath = dirname(path);
    if (parentPath !== path && !(await this.exists(parentPath))) {
      await this.mkdirp(parentPath);
    }

    return this.create(path, "", "directory");
  }

  /** Walk directory tree */
  async *walk(path: string = "/", recursive = true): AsyncGenerator<VFile> {
    const entries = await this.list(path);
    for (const entry of entries) {
      yield entry;
      if (recursive && entry.type === "directory") {
        yield* this.walk(entry.path, true);
      }
    }
  }

  /** Search for files by name/glob pattern */
  async search(pattern: string, path = "/"): Promise<VFile[]> {
    const results: VFile[] = [];
    const regex = globToRegex(basename(pattern));
    for await (const entry of this.walk(path)) {
      if (entry.type === "file" && regex.test(entry.name)) results.push(entry);
    }
    return results;
  }

  /** Watch for file changes */
  watch(callback: (event: FsEvent) => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  /** Export entire filesystem as JSON-serializable object */
  exportJson(): object {
    return this.serializeNode(this.root);
  }

  /** Import from exported JSON */
  importJson(data: object): void {
    this.root = this.deserializeNode(data as any, "/");
  }

  // --- Internal ---

  private async resolve(path: string): Promise<VFile | null> {
    const normalized = normalizePath(path);
    if (normalized === "/" || normalized === "") return this.root;

    const parts = normalized.split("/").filter(Boolean);
    let current = this.root;

    for (const part of parts) {
      if (!current.children || !current.children.has(part)) return null;
      current = current.children.get(part)!;
    }

    return current;
  }

  private createDir(path: string, time: number): VFile {
    return {
      name: basename(path) || "/",
      path: normalizePath(path),
      content: "",
      type: "directory",
      size: 0,
      createdAt: time,
      modifiedAt: time,
      permissions: 0o755,
      children: new Map(),
    };
  }

  private emit(event: FsEvent): void {
    for (const cb of this.watchers) cb(event);
  }

  private serializeNode(node: VFile): object {
    return {
      ...node,
      content: node.type === "file" && typeof node.content === "string"
        ? node.content : undefined,
      children: node.children ? Object.fromEntries(
        Array.from(node.children.entries()).map(([k, v]) => [k, this.serializeNode(v)])
      ) : undefined,
    };
  }

  private deserializeNode(data: VFile & { children?: Record<string, unknown> }, path: string): VFile {
    const node: VFile = { ...data, children: data.children ? new Map<string, VFile>() : undefined };
    if (data.children) {
      for (const [key, value] of Object.entries(data.children)) {
        node.children!.set(key!, this.deserializeNode(value as VFile, joinPath(path, key)));
      }
    }
    return node;
  }
}

interface FsEvent {
  type: "create" | "modify" | "delete" | "rename";
  path: string;
  file: VFile;
}

// --- MIME Type Detection ---

const MIME_MAP: Record<string, string> = {
  html: "text/html", htm: "text/html", css: "text/css", js: "application/javascript",
  mjs: "application/javascript", json: "application/json", xml: "application/xml",
  txt: "text/plain", md: "text/markdown", csv: "text/csv", tsv: "text/tab-separated-values",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  svg: "image/svg+xml", webp: "image/webp", ico: "image/x-icon",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg",
  mp4: "video/mp4", webm: "video/webm", pdf: "application/pdf",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip", tar: "application/x-tar", gz: "application/gzip",
  rar: "application/vnd.rar", "7z: "application/x-7z-compressed",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
};

/** Detect MIME type from filename extension */
export function detectMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return MIME_MAP[ext.slice(1)] ?? "application/octet-stream";
}

/** Detect MIME type from magic bytes (first few bytes of file) */
export function detectMimeTypeFromBytes(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const header = Array.from(arr.slice(0, 16)).map((b) => b.toString(16).padStart(2, "0")).join("");

  if (header.startsWith("89504e47")) return "image/png";
  if (header.startsWith("ffd8ffe0")) return "image/jpeg";
  if (header.startsWith("47494638")) return "image/gif";
  if (header.startsWith("504b0304")) return "application/zip";
  if (header.startsWith("255044")) return "application/pdf";
  if (header.startsWith("7f454c46")) return "application/octet-stream"; // Could be various
  if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) return "application/pdf";
  if (header.startsWith("1a45dfa")) return "image/zst";

  return "application/octet-stream";
}

// --- OPFS (Origin Private File System) Wrapper ---

export class OpfsWrapper {
  private rootDir: FileSystemDirectoryHandle | null = null;
  private access: FileSystemHandlePermission | null = null;

  /** Request access to OPFS */
  async requestAccess(options?: { mode?: FileSystemMode; requestedQuota?: number }): Promise<FileSystemDirectoryHandle> {
    if (!navigator.storage?.files) throw new Error("OPFS not supported");
    this.access = await navigator.storage.requestPersistent({ quota: options?.requestedQuota ?? 100 * 1024 * 1024 });
    this.rootDir = await navigator.storage.getDirectory();
    return this.rootDir!;
  }

  /** Get file handle from path */
  async getFileHandle(path: string): Promise<FileSystemFileHandle> {
    if (!this.rootDir) throw new Error("OPFS not initialized");
    const parts = path.split("/").filter(Boolean);
    let dir = this.rootDir;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]!);
    }
    return dir.getFileHandle(parts[parts.length - 1]!);
  }

  /** Get directory handle from path */
  async getDirHandle(path: string): Promise<FileSystemDirectoryHandle> {
    if (!this.rootDir) throw new Error("OPFS not initialized");
    if (path === "/" || path === "") return this.rootDir;
    const parts = path.split("/").filter(Boolean);
    let dir = this.rootDir;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
    return dir;
  }

  /** Read file as text */
  async readFile(path: string): Promise<string> {
    const handle = await this.getFileHandle(path);
    const file = await handle.getFile();
    return file.text();
  }

  /** Write file */
  async writeFile(path: string, content: string | Blob): Promise<void> {
    const fileName = basename(path);
    const dirPath = dirname(path);
    const dir = await this.getDirHandle(dirPath);
    const handle = await dir.getFileHandle(fileName);
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  /** Delete file */
  async deleteFile(path: string): Promise<void> {
    const fileName = basename(path);
    const dirPath = dirname(path);
    const dir = await this.getDirHandle(dirPath);
    await dir.removeEntry(fileName);
  }

  /** List directory */
  async listDir(path: string = "/"): Promise<Array<{ name: string; kind: "file" | "directory" }>> {
    const dir = await this.getDirHandle(path);
    const entries: Array<{ name: string; kind: "file" | "directory" }> = [];
    for await (const entry of dir.values()) {
      entries.push({ name: entry.name, kind: entry.kind });
    }
    return entries;
  }

  /** Create directory */
  async createDir(path: string): Promise<void> {
    const parentPath = dirname(path);
    const dirName = basename(path);
    const parent = await this.getDirHandle(parentPath);
    await parent.getDirectoryHandle(dirName, { create: true });
  }

  static isSupported(): boolean {
    return typeof navigator !== "undefined" && "storage" in navigator && "files" in (navigator as any).storage;
  }
}
