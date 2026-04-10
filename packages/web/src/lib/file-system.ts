/**
 * File System: Virtual file system and File System Access API wrapper with
 * directory listing, CRUD operations, watch for changes, drag-drop import/export,
 * tree view generation, search, path utilities, and permission handling.
 */

// --- Types ---

export type FileType = "file" | "directory" | "symlink";
export type WatchEventType = "create" | "modify" | "delete" | "rename";

export interface VfsEntry {
  name: string;
  path: string;           // Absolute path within VFS
  type: FileType;
  size?: number;          // Bytes (files only)
  modifiedAt?: number;    // Timestamp
  createdAt?: number;
  content?: string | ArrayBuffer; // File content
  children?: Map<string, VfsEntry>; // Directory entries
  metadata?: Record<string, unknown>;
}

export interface FileSystemOptions {
  /** Root directory name */
  rootName?: string;
  /** Auto-save to localStorage */
  persist?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
  /** Max total size in bytes (0 = unlimited) */
  maxStorage?: number;
  /** Enable change watching */
  enableWatch?: boolean;
}

export interface WatchEvent {
  type: WatchEventType;
  path: string;
  oldPath?: string;       // For rename events
  entry?: VfsEntry;
  timestamp: number;
}

export interface FileSystemStats {
  totalFiles: number;
  totalDirectories: number;
  totalSize: number;
  rootEntries: number;
  lastModified: number;
}

export interface SearchResult {
  path: string;
  entry: VfsEntry;
  score: number;          // Relevance score (0-1)
  matchType: "name" | "content" | "path";
}

export interface TreeViewNode {
  name: string;
  path: string;
  type: FileType;
  size?: number;
  depth: number;
  expanded?: boolean;
  children?: TreeViewNode[];
}

// --- Path Utilities ---

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

function joinPath(...parts: string[]): string {
  return normalizePath(parts.filter(Boolean).join("/"));
}

function dirname(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash === 0 ? "/" : normalized.slice(0, lastSlash);
}

function basename(path: string): string {
  const normalized = normalizePath(path);
  const lastSlash = normalized.lastIndexOf("/");
  return normalized.slice(lastSlash + 1);
}

function extname(path: string): string {
  const name = basename(path);
  const dotIdx = name.lastIndexOf(".");
  return dotIdx > 0 ? name.slice(dotIdx) : "";
}

// --- Main File System Class ---

/**
 * In-memory virtual file system with optional persistence and real FS bridge.
 *
 * ```ts
 * const fs = new VirtualFileSystem({ rootName: "project", persist: true });
 *
 * // Create structure
 * fs.mkdir("/src");
 * fs.writeFile("/src/index.ts", 'console.log("Hello");');
 * fs.writeFile("/package.json", '{ "name": "my-app" }');
 *
 * // Read
 * const content = fs.readFile("/src/index.ts");
 *
 * // List directory
 * const files = fs.readdir("/src");
 *
 * // Tree view
 * const tree = fs.getTreeView();
 *
 * // Search
 * const results = fs.search("console");
 * ```
 */
export class VirtualFileSystem {
  private root: VfsEntry;
  private options: Required<FileSystemOptions>;
  private watchers = new Set<(event: WatchEvent) => void>();
  private pathIndex = new Map<string, VfsEntry>(); // Fast lookup by path

  constructor(options: FileSystemOptions = {}) {
    this.options = {
      rootName: options.rootName ?? "root",
      persist: options.persist ?? false,
      storageKey: options.storageKey ?? "vfs-data",
      maxStorage: options.maxStorage ?? 50 * 1024 * 1024,
      enableWatch: options.enableWatch ?? true,
    };

    this.root = {
      name: this.options.rootName,
      path: "/",
      type: "directory",
      children: new Map(),
      modifiedAt: Date.now(),
      createdAt: Date.now(),
    };

    this.pathIndex.set("/", this.root);

    if (this.options.persist) {
      this.loadFromStorage();
    }
  }

  // --- Read Operations ---

  /** Get entry at path */
  getEntry(path: string): VfsEntry | null {
    const normalized = normalizePath(path);
    return this.pathIndex.get(normalized) ?? null;
  }

  /** Check if path exists */
  exists(path: string): boolean {
    return this.getEntry(path) !== null;
  }

  /** Check if path is a file */
  isFile(path: string): boolean {
    return this.getEntry(path)?.type === "file";
  }

  /** Check if path is a directory */
  isDirectory(path: string): boolean {
    return this.getEntry(path)?.type === "directory";
  }

  /** Read file content as string */
  readFile(path: string): string | null {
    const entry = this.getEntry(path);
    if (!entry || entry.type !== "file") return null;
    if (typeof entry.content === "string") return entry.content;
    if (entry.content instanceof ArrayBuffer) {
      return new TextDecoder().decode(entry.content);
    }
    return null;
  }

  /** Read file content as ArrayBuffer */
  readFileBinary(path: string): ArrayBuffer | null {
    const entry = this.getEntry(path);
    if (!entry || entry.type !== "file") return null;
    if (entry.content instanceof ArrayBuffer) return entry.content;
    if (typeof entry.content === "string") {
      return new TextEncoder().encode(entry.content).buffer;
    }
    return null;
  }

  /** List directory contents */
  readdir(path: string): VfsEntry[] {
    const entry = this.getEntry(path);
    if (!entry || entry.type !== "directory" || !entry.children) return [];
    return Array.from(entry.children.values());
  }

  /** List directory names only */
  listNames(path: string): string[] {
    return this.readdir(path).map((e) => e.name);
  }

  // --- Write Operations ---

  /** Write/create a file */
  writeFile(path: string, content: string | ArrayBuffer, metadata?: Record<string, unknown>): boolean {
    const normalized = normalizePath(path);
    const dirPath = dirname(normalized);
    const fileName = basename(normalized);

    // Ensure parent directory exists
    if (!this.exists(dirPath)) {
      this.mkdir(dirPath);
    }

    // Check storage limit
    const contentSize = typeof content === "string"
      ? new TextEncoder().encode(content).byteLength
      : content.byteLength;

    if (this.options.maxStorage > 0) {
      const currentTotal = this.getStats().totalSize;
      const existing = this.getEntry(normalized);
      const existingSize = existing?.size ?? 0;
      if (currentTotal - existingSize + contentSize > this.options.maxStorage) {
        throw new Error(`Storage limit exceeded (${this.formatBytes(this.options.maxStorage)})`);
      }
    }

    const now = Date.now();

    // Update or create
    let entry = this.pathIndex.get(normalized);
    if (entry && entry.type === "file") {
      // Update existing
      entry.content = content;
      entry.size = contentSize;
      entry.modifiedAt = now;
    } else {
      // Create new
      entry = {
        name: fileName,
        path: normalized,
        type: "file",
        size: contentSize,
        content,
        modifiedAt: now,
        createdAt: now,
        metadata,
      };
      }

      // Add to parent's children
      const parent = this.pathIndex.get(dirPath)!;
      parent.children!.set(fileName, entry);
      parent.modifiedAt = now;

      this.pathIndex.set(normalized, entry);

      this.emitWatch("create", normalized, entry);
    }

    this.emitWatch("modify", normalized, entry);
    this.saveToStorage();

    return true;
  }

  /** Create a directory */
  mkdir(path: string, metadata?: Record<string, unknown>): boolean {
    const normalized = normalizePath(path);
    if (this.exists(normalized)) return false;

    const dirPath = dirname(normalized);
    const dirName = basename(normalized);

    // Ensure parent exists
    if (dirPath !== "/" && !this.exists(dirPath)) {
      this.mkdir(dirPath);
    }

    const now = Date.now();
    const entry: VfsEntry = {
      name: dirName,
      path: normalized,
      type: "directory",
      children: new Map(),
      modifiedAt: now,
      createdAt: now,
      metadata,
    };

    const parent = this.pathIndex.get(dirPath !== "" ? dirPath : "/");
    parent!.children!.set(dirName, entry);
    this.pathIndex.set(normalized, entry);

    this.emitWatch("create", normalized, entry);
    this.saveToStorage();
    return true;
  }

  /** Copy a file or directory */
  copy(from: string, to: string): boolean {
    const src = this.getEntry(from);
    if (!src) return false;

    if (src.type === "file") {
      this.writeFile(to, src.content!, src.metadata);
    } else if (src.type === "directory" && src.children) {
      this.mkdir(to, src.metadata);
      for (const [name, child] of src.children) {
        this.copy(child.path, joinPath(to, name));
      }
    }

    return true;
  }

  /** Move/rename a file or directory */
  move(from: string, to: string): boolean {
    const src = this.getEntry(from);
    if (!src) return false;

    this.copy(from, to);
    this.delete(from, true); // Don't emit delete event for moves

    this.emitWatch("rename", to, undefined, from);
    return true;
  }

  /** Delete a file or directory */
  delete(path: string, silent = false): boolean {
    const normalized = normalizePath(path);
    const entry = this.pathIndex.get(normalized);
    if (!entry) return false;

    // Remove from parent
    const dirPath = dirname(normalized);
    const parent = this.pathIndex.get(dirPath);
    if (parent?.children) {
      parent.children.delete(entry.name);
      parent.modifiedAt = Date.now();
    }

    // Recursively remove from index
    this.removeFromIndex(entry);

    if (!silent) {
      this.emitWatch("delete", normalized, entry);
    }

    this.saveToStorage();
    return true;
  }

  // --- Search ---

  /**
   * Search for files by name or content.
   */
  search(query: string, options?: { includeContent?: boolean; caseSensitive?: boolean; maxResults?: number }): SearchResult[] {
    const opts = { includeContent: true, caseSensitive: false, maxResults: 50, ...options };
    const results: SearchResult[] = [];
    const q = opts.caseSensitive ? query.toLowerCase() : query.toLowerCase();

    const searchEntry = (entry: VfsEntry): void => {
      const nameMatch = opts.caseSensitive
        ? entry.name.includes(query)
        : entry.name.toLowerCase().includes(q);

      if (nameMatch) {
        results.push({
          path: entry.path,
          entry,
          score: entry.name === query ? 1 : entry.name.toLowerCase().startsWith(q) ? 0.8 : 0.5,
          matchType: "name",
        });
      }

      // Content search (text files only)
      if (opts.includeContent && entry.type === "file" && typeof entry.content === "string") {
        const contentMatch = opts.caseSensitive
          ? entry.content.includes(query)
          : entry.content.toLowerCase().includes(q);

        if (contentMatch && !nameMatch) {
          results.push({
            path: entry.path,
            entry,
            score: 0.3,
            matchType: "content",
          });
        }
      }

      // Recurse into directories
      if (entry.children) {
        for (const child of entry.children.values()) {
          searchEntry(child);
        }
      }
    };

    searchEntry(this.root);

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, opts.maxResults);
  }

  // --- Tree View ---

  /** Generate tree structure for UI rendering */
  getTreeView(rootPath?: string): TreeViewNode[] {
    const startEntry = rootPath ? this.getEntry(rootPath) : this.root;
    if (!startEntry || !startEntry.children) return [];

    const buildNodes = (entry: VfsEntry, depth = 0): TreeViewNode => {
      const node: TreeViewNode = {
        name: entry.name,
        path: entry.path,
        type: entry.type,
        size: entry.size,
        depth,
      };

      if (entry.children && entry.children.size > 0) {
        node.expanded = depth < 2;
        node.children = Array.from(entry.children.values())
          .sort((a, b) => {
            // Directories first, then alphabetical
            if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((child) => buildNodes(child, depth + 1));
      }

      return node;
    };

    return Array.from(startEntry.children.values())
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((child) => buildNodes(child));
  }

  // --- Stats ---

  /** Get filesystem statistics */
  getStats(): FileSystemStats {
    let totalFiles = 0, totalDirs = 0, totalSize = 0, lastMod = 0;

    const count = (entry: VfsEntry): void => {
      if (entry.type === "file") {
        totalFiles++;
        totalSize += entry.size ?? 0;
        if (entry.modifiedAt && entry.modifiedAt > lastMod) lastMod = entry.modifiedAt;
      } else if (entry.type === "directory") {
        totalDirs++;
        if (entry.children) {
          for (const child of entry.children.values()) count(child);
        }
      }
    };

    count(this.root);

    return {
      totalFiles,
      totalDirectories: totalDirs,
      totalSize,
      rootEntries: this.root.children?.size ?? 0,
      lastModified: lastMod,
    };
  }

  // --- Watch / Events ---

  /** Subscribe to file system changes */
  watch(callback: (event: WatchEvent) => void): () => void {
    this.watchers.add(callback);
    return () => this.watchers.delete(callback);
  }

  // --- Import/Export ---

  /** Import files from a DataTransfer (drag & drop) */
  async importFromDataTransfer(dt: DataTransfer, targetDir = "/"): Promise<VfsEntry[]> {
    const files = dt.files;
    const imported: VfsEntry[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const arrayBuf = await file.arrayBuffer();
      const targetPath = joinPath(targetDir, file.name);
      this.writeFile(targetPath, arrayBuf, { originalName: file.name, mimeType: file.type, lastModified: file.lastModified });
      imported.push(this.getEntry(targetPath)!);
    }

    return imported;
  }

  /** Export the entire VFS as JSON */
  exportJson(): string {
    const data = this.serializeEntry(this.root);
    return JSON.stringify(data, null, 2);
  }

  /** Import VFS from JSON */
  importJson(json: string): boolean {
    try {
      const data = JSON.parse(json);
      this.root = this.deserializeEntry(data);
      this.rebuildIndex();
      this.saveToStorage();
      return true;
    } catch {
      return false;
    }
  }

  // --- Utility ---

  /** Format bytes to human-readable string */
  formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
  }

  /** Resolve relative path to absolute */
  resolvePath(from: string, to: string): string {
    if (to.startsWith("/")) return normalizePath(to);
    return normalizePath(joinPath(dirname(from), to));
  }

  // --- Internal ---

  private removeFromIndex(entry: VfsEntry): void {
    this.pathIndex.delete(entry.path);
    if (entry.children) {
      for (const child of entry.children.values()) {
        this.removeFromIndex(child);
      }
    }
  }

  private rebuildIndex(): void {
    this.pathIndex.clear();
    const indexEntry = (entry: VfsEntry): void => {
      this.pathIndex.set(entry.path, entry);
      if (entry.children) {
        for (const child of entry.children.values()) indexEntry(child);
      }
    };
    indexEntry(this.root);
  }

  private serializeEntry(entry: VfsEntry): Record<string, unknown> {
    const obj: Record<string, unknown> = {
      name: entry.name,
      path: entry.path,
      type: entry.type,
      modifiedAt: entry.modifiedAt,
      createdAt: entry.createdAt,
      metadata: entry.metadata,
    };

    if (entry.type === "file") {
      obj.size = entry.size;
      obj.content = typeof entry.content === "string" ? entry.content : "[ArrayBuffer]";
    }

    if (entry.type === "directory" && entry.children) {
      obj.children = Array.from(entry.children.entries()).map(([k, v]) => [k, this.serializeEntry(v)]);
    }

    return obj;
  }

  private deserializeEntry(data: Record<string, unknown>): VfsEntry {
    const entry: VfsEntry = {
      name: data.name as string,
      path: data.path as string,
      type: data.type as FileType,
      modifiedAt: data.modifiedAt as number,
      createdAt: data.createdAt as number,
      metadata: data.metadata as Record<string, unknown>,
    };

    if (entry.type === "file") {
      entry.size = data.size as number;
      entry.content = (data.content as string) ?? "";
    }

    if (entry.type === "directory" && data.children) {
      entry.children = new Map(
        (data.children as [string, unknown][]).map(([k, v]) => [k, this.deserializeEntry(v as Record<string, unknown>)]),
      );
    }

    return entry;
  }

  private emitWatch(type: WatchEventType, path: string, entry?: VfsEntry, oldPath?: string): void {
    if (!this.options.enableWatch) return;
    const event: WatchEvent = { type, path, oldPath, entry, timestamp: Date.now() };
    for (const watcher of this.watchers) watcher(event);
  }

  private saveToStorage(): void {
    if (!this.options.persist) return;
    try {
      localStorage.setItem(this.options.storageKey, this.exportJson());
    } catch {
      console.warn("[VFS] Failed to save to localStorage");
    }
  }

  private loadFromStorage(): void {
    if (!this.options.persist) return;
    try {
      const raw = localStorage.getItem(this.options.storageKey);
      if (raw) this.importJson(raw);
    } catch {
      console.warn("[VFS] Failed to load from localStorage");
    }
  }
}
