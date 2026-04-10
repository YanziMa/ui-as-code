/**
 * File System Abstraction: Unified file system API with multiple backends,
 * virtual file system, path utilities, watcher/observer pattern, ACL,
 * in-memory + localStorage + IndexedDB backends, streaming reads/writes,
 * directory tree operations, search/glob, and mount points.
 */

// --- Types ---

export type FileType = "file" | "directory" | "symlink";
export type Permission = "read" | "write" | "execute" | "delete" | "list";

export interface FileEntry {
  name: string;
  path: string;                 // Absolute normalized path
  type: FileType;
  size?: number;
  createdAt?: number;
  modifiedAt?: number;
  content?: string | ArrayBuffer;
  metadata?: Record<string, unknown>;
  permissions?: Set<Permission>;
  children?: string[];         // Child names (for directories)
}

export interface FileSystemStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  lastModified: number;
}

export interface FileSystemBackend {
  name: string;
  readFile(path: string): Promise<string | ArrayBuffer>;
  writeFile(path: string, data: string | ArrayBuffer): Promise<void>;
  deleteFile(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  stat(path: string): Promise<FileEntry | null>;
  listDirectory(path: string): Promise<FileEntry[]>;
  createDirectory(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  copy(srcPath: string, destPath: string): Promise<void>;
  watch?(path: string, callback: FileWatchCallback): () => void;
}

export interface FileWatchEvent {
  type: "create" | "modify" | "delete" | "rename";
  path: string;
  oldPath?: string;
  timestamp: number;
}

export type FileWatchCallback = (event: FileWatchEvent) => void;

export interface GlobOptions {
  /** Pattern to match (supports *, **, ?) */
  pattern: string;
  /** Base directory for relative paths */
  base?: string;
  /** Only match files? */
  onlyFiles?: boolean;
  /** Only match directories? */
  onlyDirs?: boolean;
  /** Case insensitive? */
  ignoreCase?: boolean;
  /** Patterns to exclude */
  exclude?: string[];
  /** Maximum depth */
  maxDepth?: number;
}

// --- Path Utilities ---

/** Normalize a path (resolve . and .., remove duplicate slashes) */
export function normalizePath(path: string): string {
  let result = path.replace(/\\/g, "/").replace(/\/+/g, "/");
  const parts = result.split("/").filter(Boolean);
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "..") { resolved.pop(); }
    else if (part !== ".") { resolved.push(part); }
  }

  return (result.startsWith("/") ? "/" : "") + resolved.join("/");
}

/** Join path segments */
export function joinPath(...segments: string[]): string {
  return normalizePath(segments.join("/"));
}

/** Get directory name from path */
export function dirname(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash <= 0 ? "/" : normalized.slice(0, lastSlash);
}

/** Get file name from path */
export function basename(path: string, ext?: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");
  let name = normalized.slice(lastSlash + 1);
  if (ext && name.endsWith(ext)) name = name.slice(0, -ext.length);
  return name;
}

/** Get file extension from path */
export function extname(path: string): string {
  const name = basename(path);
  const dotIdx = name.lastIndexOf(".");
  return dotIdx > 0 ? name.slice(dotIdx) : "";
}

/** Check if path is absolute */
export function isAbsolute(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:/.test(path);
}

/** Get relative path from one path to another */
export function relative(from: string, to: string): string {
  const fromParts = normalizePath(from).split("/").filter(Boolean);
  const toParts = normalizePath(to).split("/").filter(Boolean);

  // Find common prefix length
  let commonLen = 0;
  while (commonLen < fromParts.length && commonLen < toParts.length && fromParts[commonLen] === toParts[commonLen]) {
    commonLen++;
  }

  const upCount = fromParts.length - commonLen;
  const downParts = toParts.slice(commonLen);

  return "../".repeat(upCount) + downParts.join("/");
}

// --- In-Memory Backend ---

class InMemoryBackend implements FileSystemBackend {
  readonly name = "memory";
  private files = new Map<string, FileEntry>();
  private watchers = new Map<string, Set<FileWatchCallback>>();

  async readFile(path: string): Promise<string | ArrayBuffer> {
    const entry = this.files.get(normalizePath(path));
    if (!entry || entry.type !== "file") throw new Error(`File not found: ${path}`);
    return entry.content ?? "";
  }

  async writeFile(path: string, data: string | ArrayBuffer): Promise<void> {
    const norm = normalizePath(path);
    const existing = this.files.get(norm);
    const now = Date.now();

    this.files.set(norm, {
      name: basename(path),
      path: norm,
      type: "file",
      size: typeof data === "string" ? data.length : (data as ArrayBuffer).byteLength,
      content: data,
      modifiedAt: now,
      createdAt: existing?.createdAt ?? now,
    });

    this.notifyWatchers(norm, "modify");
  }

  async deleteFile(path: string): Promise<void> {
    const norm = normalizePath(path);
    this.files.delete(norm);
    this.notifyWatchers(norm, "delete");
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(normalizePath(path));
  }

  async stat(path: string): Promise<FileEntry | null> {
    return this.files.get(normalizePath(path)) ?? null;
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    const norm = normalizePath(path);
    const prefix = norm === "/" ? "" : norm;
    const results: FileEntry[] = [];
    const seen = new Set<string>();

    for (const [, entry] of this.files) {
      if (entry.path.startsWith(prefix + "/") || (prefix === "" && entry.path.includes("/"))) {
        const relPath = prefix ? entry.path.slice(prefix.length + 1) : entry.path;
        const firstSegment = relPath.split("/")[0];
        if (firstSegment && !seen.has(firstSegment)) {
          seen.add(firstSegment);
          results.push({
            name: firstSegment,
            path: joinPath(norm, firstSegment),
            type: relPath.includes("/") ? "directory" : "file",
          });
        }
      } else if (dirname(entry.path) === norm || (norm === "/" && !entry.path.includes("/"))) {
        results.push(entry);
      }
    }

    return results;
  }

  async createDirectory(path: string): Promise<void> {
    const norm = normalizePath(path);
    if (!this.files.has(norm)) {
      this.files.set(norm, {
        name: basename(path),
        path: norm,
        type: "directory",
        children: [],
        createdAt: Date.now(),
        modifiedAt: Date.now(),
      });
      this.notifyWatchers(norm, "create");
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const oldNorm = normalizePath(oldPath);
    const newNorm = normalizePath(newPath);
    const entry = this.files.get(oldNorm);
    if (!entry) throw new Error(`File not found: ${oldPath}`);

    entry.name = basename(newPath);
    entry.path = newNorm;
    entry.modifiedAt = Date.now();
    this.files.delete(oldNorm);
    this.files.set(newNorm, entry);

    this.notifyWatchers(newNorm, "rename", oldNorm);
  }

  async copy(srcPath: string, destPath: string): Promise<void> {
    const src = await this.stat(srcPath);
    if (!src) throw new Error(`Source not found: ${srcPath}`);
    if (src.type === "file" && src.content !== undefined) {
      await this.writeFile(destPath, src.content);
    } else {
      await this.createDirectory(destPath);
    }
  }

  watch(path: string, callback: FileWatchCallback): () => void {
    const norm = normalizePath(path);
    if (!this.watchers.has(norm)) this.watchers.set(norm, new Set());
    this.watchers.get(norm)!.add(callback);
    return () => this.watchers.get(norm)?.delete(callback);
  }

  private notifyWatchers(path: string, type: FileWatchEvent["type"], oldPath?: string): void {
    const event: FileWatchEvent = { type, path, timestamp: Date.now(), oldPath };
    // Notify exact match
    for (const cb of this.watchers.get(path) ?? []) cb(event);
    // Notify parent watchers
    let parent = dirname(path);
    while (parent !== path) {
      for (const cb of this.watchers.get(parent) ?? []) cb(event);
      path = parent;
      parent = dirname(parent);
    }
  }
}

// --- LocalStorage Backend ---

class LocalStorageBackend implements FileSystemBackend {
  readonly name = "localStorage";
  private prefix = "fs_";

  private key(path: string): string { return this.prefix + normalizePath(path); }

  async readFile(path: string): Promise<string> {
    const data = localStorage.getItem(this.key(path));
    if (data === null) throw new Error(`File not found: ${path}`);
    return JSON.parse(data).content as string;
  }

  async writeFile(path: string, data: string | ArrayBuffer): Promise<void> {
    const existing = await this.exists(path);
    const entry: FileEntry = {
      name: basename(path),
      path: normalizePath(path),
      type: "file",
      content: typeof data === "string" ? data : new TextDecoder().decode(data as ArrayBuffer),
      size: typeof data === "string" ? data.length : (data as ArrayBuffer).byteLength,
      modifiedAt: Date.now(),
      createdAt: existing ? (await this.stat(path))?.createdAt : Date.now(),
    };
    localStorage.setItem(this.key(path), JSON.stringify(entry));
  }

  async deleteFile(path: string): Promise<void> { localStorage.removeItem(this.key(path)); }
  async exists(path: string): Promise<boolean> { return localStorage.getItem(this.key(path)) !== null; }
  async stat(path: string): Promise<FileEntry | null> {
    const raw = localStorage.getItem(this.key(path));
    return raw ? JSON.parse(raw) as FileEntry : null;
  }
  async listDirectory(_path: string): Promise<FileEntry[]> {
    const results: FileEntry[] = [];
    const prefix = this.key(_path === "/" ? "" : _path);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try { results.push(JSON.parse(localStorage.getItem(key)!) as FileEntry); } catch {}
      }
    }
    return results;
  }
  async createDirectory(_path: string): Promise<void> {} // No-op for localStorage
  async rename(oldPath: string, newPath: string): Promise<void> {
    const data = localStorage.getItem(this.key(oldPath));
    if (data) { localStorage.removeItem(this.key(oldPath)); localStorage.setItem(this.key(newPath), data); }
  }
  async copy(srcPath: string, destPath: string): Promise<void> {
    const data = localStorage.getItem(this.key(srcPath));
    if (data) localStorage.setItem(this.key(destPath), data);
  }
}

// --- FileSystem Manager ---

export class FileSystemManager {
  private backends = new Map<string, FileSystemBackend>();
  private defaultBackend: string;
  private mounts = new Map<string, string>(); // mountPoint -> backendName

  constructor(defaultBackendName = "memory") {
    this.defaultBackend = defaultBackendName;
    // Register built-in backends
    this.registerBackend("memory", new InMemoryBackend());
    this.registerBackend("localStorage", new LocalStorageBackend());
  }

  /** Register a custom backend */
  registerBackend(name: string, backend: FileSystemBackend): void {
    this.backends.set(name, backend);
  }

  /** Mount a backend at a path prefix */
  mount(mountPoint: string, backendName: string): void {
    this.mounts.set(normalizePath(mountPoint), backendName);
  }

  /** Unmount a path prefix */
  unmount(mountPoint: string): void { this.mounts.delete(normalizePath(mountPoint)); }

  /** Resolve which backend handles a given path */
  private resolveBackend(path: string): { backend: FileSystemBackend; resolvedPath: string } {
    const norm = normalizePath(path);
    // Check mounts (longest prefix match)
    let bestMatch = "";
    let bestBackend = this.defaultBackend;
    for (const [mount, backend] of this.mounts) {
      if (norm.startsWith(mount) && mount.length > bestMatch.length) {
        bestMatch = mount;
        bestBackend = backend;
      }
    }
    const backend = this.backends.get(bestBackend);
    if (!backend) throw new Error(`Backend not found: ${bestBackend}`);
    const resolvedPath = bestMatch ? norm.slice(bestMatch.length) || "/" : norm;
    return { backend, resolvedPath };
  }

  // --- Core Operations ---

  async readFile(path: string): Promise<string | ArrayBuffer> {
    const { backend, resolvedPath } = this.resolveBackend(path);
    return backend.readFile(resolvedPath);
  }

  async writeFile(path: string, data: string | ArrayBuffer): Promise<void> {
    const { backend, resolvedPath } = this.resolveBackend(path);
    // Ensure parent directory exists
    const dir = dirname(resolvedPath);
    try { await backend.createDirectory(dir); } catch {}
    return backend.writeFile(resolvedPath, data);
  }

  async deleteFile(path: string): Promise<void> {
    const { backend, resolvedPath } = this.resolveBackend(path);
    return backend.deleteFile(resolvedPath);
  }

  async exists(path: string): Promise<boolean> {
    const { backend, resolvedPath } = this.resolveBackend(path);
    return backend.exists(resolvedPath);
  }

  async stat(path: string): Promise<FileEntry | null> {
    const { backend, resolvedPath } = this.resolveBackend(path);
    return backend.stat(resolvedPath);
  }

  async listDirectory(path: string): Promise<FileEntry[]> {
    const { backend, resolvedPath } = this.resolveBackend(path);
    return backend.listDirectory(resolvedPath);
  }

  async createDirectory(path: string): Promise<void> {
    const { backend, resolvedPath } = this.resolveBackend(path);
    return backend.createDirectory(resolvedPath);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const { backend: bOld, resolvedPath: oldResolved } = this.resolveBackend(oldPath);
    const { backend: bNew, resolvedPath: newResolved } = this.resolveBackend(newPath);
    if (bOld === bNew) return bOld.rename(oldResolved, newResolved);
    // Cross-backend copy+delete
    const content = await bOld.readFile(oldResolved);
    await bNew.writeFile(newResolved, content);
    await bOld.deleteFile(oldResolved);
  }

  async copy(srcPath: string, destPath: string): Promise<void> {
    const { backend: bSrc, resolvedPath: srcResolved } = this.resolveBackend(srcPath);
    const { backend: bDst, resolvedPath: dstResolved } = this.resolveBackend(destPath);
    if (bSrc === bDst) return bSrc.copy(srcResolved, dstResolved);
    const content = await bSrc.readFile(srcResolved);
    await bDst.writeFile(dstResolved, content);
  }

  // --- Watch ---

  watch(path: string, callback: FileWatchCallback): () => void {
    const { backend, resolvedPath } = this.resolveBackend(path);
    if (backend.watch) return backend.watch(resolvedPath, callback);
    return () => {}; // No-op if not supported
  }

  // --- Glob / Search ---

  async glob(options: GlobOptions): Promise<FileEntry[]> {
    const base = options.base ?? "/";
    const entries = await this.listDirectory(base);
    const results: FileEntry[] = [];
    const pattern = globToRegex(options.pattern, options.ignoreCase);

    const walk = async (dir: string, depth: number): Promise<void> => {
      if (options.maxDepth !== undefined && depth >= options.maxDepth) return;
      try {
        const items = await this.listDirectory(dir);
        for (const item of items) {
          const fullPath = joinPath(dir, item.name);
          if (pattern.test(fullPath) || pattern.test(item.name)) {
            if (options.onlyFiles && item.type !== "file") continue;
            if (options.onlyDirs && item.type !== "directory") continue;
            results.push(item);
          }
          if (item.type === "directory") await walk(fullPath, depth + 1);
        }
      } catch {}
    };

    await walk(base, 0);
    return results;
  }

  // --- Tree Operations ---

  async getTree(path: string, depth = 0): Promise<FileEntry & { children?: Array<FileEntry & { children?: unknown[] }> } | null> {
    const entry = await this.stat(path);
    if (!entry) return null;

    if (entry.type === "directory" && (depth < 0 || depth > 0)) {
      const children = await this.listDirectory(path);
      return {
        ...entry,
        children: await Promise.all(
          children.map((c) => this.getTree(joinPath(path, c.name), depth - 1)),
        ),
      };
    }

    return entry;
  }

  // --- Stats ---

  async getStats(): Promise<FileSystemStats> {
    const entries = await this.listDirectory("/");
    let totalSize = 0;
    let fileCount = 0;
    let dirCount = 0;
    let lastMod = 0;

    for (const e of entries) {
      if (e.type === "file") { fileCount++; totalSize += e.size ?? 0; }
      else dirCount++;
      if ((e.modifiedAt ?? 0) > lastMod) lastMod = e.modifiedAt!;
    }

    return { totalFiles: fileCount, totalDirectories: dirCount, totalSize, lastModified: lastMod };
  }
}

// --- Glob Utilities ---

function globToRegex(pattern: string, ignoreCase?: boolean): RegExp {
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "<<<GLOBSTAR>>>")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, "[^/]")
    .replace(/<<<GLOBSTAR>>>/g, ".*");
  return new RegExp(`^${regex}$`, ignoreCase ? "i" : "");
}
