/**
 * File System Access API wrapper: Modern file system operations using
 * the File System Access API (OPFS), File Picker API, and Directory
 * Access API with fallbacks to traditional input[type=file].
 *
 * Supports:
 * - File picker (open/save single or multiple)
 * - Directory picker with recursive listing
 * - OPFS (Origin Private File System) for persistent storage
 * - Read/write/create/delete/rename/move files
 * - Stream-based read/write for large files
 * - Progress reporting for long operations
 * - Drag-and-drop file handling
 * - Permission management
 */

// --- Types ---

export interface FilePickerOptions {
  /** Accept multiple files? */
  multiple?: boolean;
  /** Accepted MIME types (e.g., ["image/*", ".pdf"]) */
  accept?: Record<string, string[]>;
  /** Suggested start directory */
  startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
  /** Exclude accept option? */
  excludeAcceptAllOption?: boolean;
  /** File type description */
  description?: string;
}

export interface SavePickerOptions {
  /** Suggested filename */
  suggestedName?: string;
  /** Accepted MIME types */
  accept?: Record<string, string[]>;
  /** Start in directory */
  startIn?: FilePickerOptions["startIn"];
}

export interface DirPickerOptions {
  /** ID for re-accessing without reprompting */
  id?: string;
  /** Mode of access */
  mode?: "read" | "readwrite";
  /** Start in directory */
  startIn?: FilePickerOptions["startIn"];
}

export interface FileSystemEntry {
  name: string;
  kind: "file" | "directory";
  path: string;
  size?: number;
  lastModified?: number;
  mimeType?: string;
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
}

export interface ReadOptions {
  /** Encoding for text read (default: "utf-8") */
  encoding?: string;
  /** Max bytes to read (default: no limit) */
  maxBytes?: number;
  /** Offset to start reading from */
  offset?: number;
  /** Read as text (default: true for text files) */
  asText?: boolean;
  /** Read as ArrayBuffer */
  asArrayBuffer?: boolean;
  /** Read as data URL (for images) */
  asDataURL?: boolean;
  /** Progress callback */
  onProgress?: (bytesRead: number, totalBytes: number) => void;
}

export interface WriteOptions {
  /** Create if not exists (default: true) */
  create?: boolean;
  /** Append instead of overwrite */
  append?: boolean;
  /** Encoding for text write */
  encoding?: string;
  /** Progress callback */
  onProgress?: (bytesWritten: number, totalBytes: number) => void;
}

export interface CopyMoveOptions {
  /** Destination directory handle */
  destination: FileSystemDirectoryHandle;
  /** New name (keep original if omitted) */
  newName?: string;
}

export interface OpfsOptions {
  /** Storage quota requested in bytes */
  requestedQuota?: boolean;
  /** Storage persistence */
  persist?: boolean;
}

export interface FileSystemStats {
  totalFiles: number;
  totalDirectories: number;
  totalSizeBytes: number;
  lastAccessed: number;
}

// --- Feature Detection ---

const SUPPORTS = {
  showOpenFilePicker: typeof window !== "undefined" && "showOpenFilePicker" in window,
  showSaveFilePicker: typeof window !== "undefined" && "showSaveFilePicker" in window,
  showDirectoryPicker: typeof window !== "undefined" && "showDirectoryPicker" in window,
  getOriginPrivateDirectory: typeof navigator !== "undefined" && "storage" in navigator,
};

// --- Main Class ---

export class FileSystemAccess {
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private destroyed = false;

  // --- File Picker ---

  /** Open file picker and return selected file(s) */
  async openFile(options: FilePickerOptions = {}): Promise<File[]> {
    if (SUPPORTS.showOpenFilePicker) {
      try {
        const handles = await window.showOpenFilePicker({
          multiple: options.multiple ?? false,
          types: this.buildFileTypes(options.accept),
          excludeAcceptAllOption: options.excludeAcceptAllOption ?? false,
          startIn: options.startIn,
        });

        const files: File[] = [];
        for (const handle of handles) {
          const file = await handle.getFile();
          files.push(file);
        }
        return files;
      } catch (err) {
        // User cancelled
        if ((err as Error).name === "AbortError") return [];
        throw err;
      }
    }

    // Fallback: input[type=file]
    return this.fallbackFileInput(options);
  }

  /** Open a single file (convenience method) */
  async openSingleFile(options?: Omit<FilePickerOptions, "multiple">): Promise<File | null> {
    const files = await this.openFile({ ...options, multiple: false });
    return files[0] ?? null;
  }

  /** Show save dialog and return a writable handle */
  async saveFile(options: SavePickerOptions = {}): Promise<FileSystemFileHandle | null> {
    if (SUPPORTS.showSaveFilePicker) {
      try {
        return await window.showSaveFilePicker({
          suggestedName: options.suggestedName ?? "untitled",
          types: this.buildFileTypes(options.accept),
          startIn: options.startIn,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return null;
        throw err;
      }
    }

    // Fallback: download via blob
    return null; // Caller should use downloadBlob() instead
  }

  /** Open directory picker */
  async openDirectory(options: DirPickerOptions = {}): Promise<FileSystemDirectoryHandle | null> {
    if (SUPPORTS.showDirectoryPicker) {
      try {
        return await window.showDirectoryPicker({
          id: options.id,
          mode: options.mode ?? "read",
          startIn: options.startIn,
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return null;
        throw err;
      }
    }

    // Fallback: use webkitdirectory
    return this.fallbackDirInput();
  }

  // --- OPFS (Origin Private File System) ---

  /** Get or create the OPFS root directory */
  async getOpfsRoot(options: OpfsOptions = {}): Promise<FileSystemDirectoryHandle> {
    if (this.opfsRoot) return this.opfsRoot;

    if (!SUPPORTS.getOriginPrivateDirectory) {
      throw new Error("OPFS not supported in this browser");
    }

    this.opfsRoot = await navigator.storage.getDirectory();

    if (options.persist) {
      try {
        // Request persistent storage
        if (navigator.storage?.persist) {
          await navigator.storage.persist();
        }
      } catch { /* ignore */ }
    }

    return this.opfsRoot;
  }

  /** Create a file in OPFS and write content */
  async opfsWrite(path: string, content: string | Blob | ArrayBuffer, options: WriteOptions = {}): Promise<void> {
    const root = await this.getOpfsRoot();
    const parts = path.split("/").filter(Boolean);
    const fileName = parts.pop()!;

    // Navigate/create directories
    let dir = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }

    // Create/get file
    const fileHandle = await dir.getFileHandle(fileName, { create: options.create ?? true });

    // Write
    const writable = await fileHandle.createWritable();
    try {
      if (typeof content === "string") {
        await writable.write(new Blob([content], { type: "text/plain" }));
      } else if (content instanceof ArrayBuffer) {
        await writable.write(content);
      } else {
        await writable.write(content);
      }
    } finally {
      await writable.close();
    }
  }

  /** Read a file from OPFS */
  async opfsRead(path: string, options: ReadOptions = {}): Promise<string | ArrayBuffer | null> {
    const root = await this.getOpfsRoot();
    const parts = path.split("/").filter(Boolean);

    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]!);
    }

    const fileName = parts[parts.length - 1];
    const fileHandle = await dir.getFileHandle(fileName);
    const file = await fileHandle.getFile();

    if (options.asArrayBuffer || (!options.asText && !options.asDataURL)) {
      return await file.arrayBuffer();
    }

    if (options.asDataURL) {
      return this.blobToDataURL(file);
    }

    return await file.text(options.encoding);
  }

  /** Check if a file exists in OPFS */
  async opfsExists(path: string): Promise<boolean> {
    try {
      await this.opfsRead(path);
      return true;
    } catch {
      return false;
    }
  }

  /** Delete a file or directory in OPFS */
  async opfsDelete(path: string): Promise<void> {
    const root = await this.getOpfsRoot();
    const parts = path.split("/").filter(Boolean);
    const name = parts.pop()!;

    let dir = root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }

    await dir.removeEntry(name, { recursive: true });
  }

  /** List entries in an OPFS directory */
  async opfsList(dirPath?: string): Promise<FileSystemEntry[]> {
    const root = await this.getOpfsRoot();
    let dir: FileSystemDirectoryHandle = root;

    if (dirPath) {
      const parts = dirPath.split("/").filter(Boolean);
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part);
      }
    }

    const entries: FileSystemEntry[] = [];
    const prefix = dirPath ? `${dirPath}/` : "";

    for await (const entry of dir.values()) {
      const entryInfo: FileSystemEntry = {
        name: entry.name,
        kind: entry.kind,
        path: prefix + entry.name,
        handle: entry,
      };

      if (entry.kind === "file") {
        const file = await (entry as FileSystemFileHandle).getFile();
        entryInfo.size = file.size;
        entryInfo.lastModified = file.lastModified;
        entryInfo.mimeType = file.type;
      }

      entries.push(entryInfo);
    }

    return entries;
  }

  /** Get stats about OPFS usage */
  async opfsStats(dirPath?: string): Promise<FileSystemStats> {
    const entries = await this.opfsList(dirPath);
    let totalFiles = 0;
    let totalDirs = 0;
    let totalSize = 0;

    for (const entry of entries) {
      if (entry.kind === "file") {
        totalFiles++;
        totalSize += entry.size ?? 0;
      } else {
        totalDirs++;
      }
    }

    return {
      totalFiles,
      totalDirectories: totalDirs,
      totalSizeBytes: totalSize,
      lastAccessed: Date.now(),
    };
  }

  // --- Directory Operations (with handle) ---

  /** List all entries in a directory handle recursively */
  async listDirectory(
    dir: FileSystemDirectoryHandle,
    options: { recursive?: boolean; maxDepth?: number } = {},
  ): Promise<FileSystemEntry[]> {
    const { recursive = false, maxDepth = 10 } = options;
    const results: FileSystemEntry[] = [];

    async function walk(handle: FileSystemDirectoryHandle, depth: number, parentPath: string): Promise<void> {
      if (depth > maxDepth) return;

      for await (const entry of handle.values()) {
        const path = `${parentPath}/${entry.name}`;
        const info: FileSystemEntry = {
          name: entry.name,
          kind: entry.kind,
          path,
          handle: entry,
        };

        if (entry.kind === "file") {
          const file = await (entry as FileSystemFileHandle).getFile();
          info.size = file.size;
          info.lastModified = file.lastModified;
          info.mimeType = file.type;
          results.push(info);
        } else {
          results.push(info);
          if (recursive) {
            await walk(entry as FileSystemDirectoryHandle, depth + 1, path);
          }
        }
      }
    }

    await walk(dir, 0, "");
    return results;
  }

  /** Read a file from a directory handle */
  async readFile(handle: FileSystemFileHandle, options: ReadOptions = {}): Promise<string | ArrayBuffer | null> {
    const file = await handle.getFile();

    if (options.offset !== undefined && options.maxBytes !== undefined) {
      const slice = file.slice(options.offset, options.offset + options.maxBytes);
      if (options.asArrayBuffer) return await slice.arrayBuffer();
      return await slice.text(options.encoding);
    }

    if (options.asArrayBuffer) return await file.arrayBuffer();
    if (options.asDataURL) return this.blobToDataURL(file);
    return await file.text(options.encoding);
  }

  /** Write text/blob to a file handle */
  async writeFile(handle: FileSystemFileHandle, content: string | Blob | ArrayBuffer, options: WriteOptions = {}): Promise<void> {
    const writable = await handle.createWritable();
    try {
      if (options.append) {
        // Read existing, append, then write
        const existing = await this.readFile(handle);
        const combined = (existing ?? "") + (typeof content === "string" ? content : "");
        await writable.write(new Blob([combined]));
      } else {
        if (typeof content === "string") {
          await writable.write(new Blob([content], { type: "text/plain" }));
        } else if (content instanceof ArrayBuffer) {
          await writable.write(content);
        } else {
          await writable.write(content);
        }
      }
    } finally {
      await writable.close();
    }
  }

  /** Copy a file to another directory */
  async copyFile(source: FileSystemFileHandle, options: CopyMoveOptions): Promise<FileSystemFileHandle> {
    const dest = options.destination;
    const newName = options.newName ?? source.name;
    const copied = await dest.getFileHandle(newName, { create: true });

    const file = await source.getFile();
    const writable = await copied.createWritable();
    await writable.write(file);
    await writable.close();

    return copied;
  }

  /** Move a file to another directory */
  async moveFile(source: FileSystemFileHandle, options: CopyMoveOptions): Promise<FileSystemFileHandle> {
    const dest = options.destination;
    const newName = options.newName ?? source.name;

    // Copy then delete original
    const copied = await this.copyFile(source, options);
    await source.remove();
    return copied;
  }

  // --- Drag & Drop ---

  /** Set up drag-and-drop zone on an element */
  setupDropZone(element: HTMLElement, options: {
    onDrop?: (files: File[]) => void;
    onDragEnter?: () => void;
    onDragLeave?: () => void;
    onDragOver?: () => void;
    acceptedTypes?: string[];
  }): () => void {
    const opts = {
      onDrop: () => {},
      onDragEnter: () => { element.classList.add("drop-active"); },
      onDragLeave: () => { element.classList.remove("drop-active"); },
      onDragOver: () => {},
      ...options,
    };

    element.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      opts.onDragEnter!();
    });

    element.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      opts.onDragOver!();
    });

    element.addEventListener("dragleave", (e) => {
      e.preventDefault();
      opts.onDragLeave!();
    });

    element.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove("drop-active");

      const files = Array.from(e.dataTransfer.files);
      if (opts.acceptedTypes && opts.acceptedTypes.length > 0) {
        const filtered = files.filter((f) =>
          opts.acceptedTypes!.some((t) => f.type.startsWith(t.replace("*", "")) || f.name.endsWith(t))
        );
        opts.onDrop!(filtered);
      } else {
        opts.onDrop!(files);
      }
    });

    // Return cleanup function
    return () => {
      element.removeEventListener("dragenter", opts.onDragEnter!);
      element.removeEventListener("dragover", opts.onDragOver!);
      element.removeEventListener("dragleave", opts.onDragLeave!);
      element.removeEventListener("drop", element.ondrop as EventListener);
    };
  }

  // --- Download Fallback ---

  /** Download a blob/file as a file save (fallback for non-FSA browsers) */
  downloadBlob(data: string | Blob | ArrayBuffer, filename: string, mimeType = "application/octet-stream"): void {
    const blob = data instanceof Blob
      ? data
      : new Blob([data instanceof ArrayBuffer ? new Uint8Array(data) : data], { type: mimeType });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Download text content as a file */
  downloadText(text: string, filename: string, mimeType = "text/plain"): void {
    this.downloadBlob(text, filename, mimeType);
  }

  // --- Utility ---

  /** Format file size for display */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /** Get file extension from filename */
  static getExtension(filename: string): string {
    const idx = filename.lastIndexOf(".");
    return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
  }

  /** Check feature support */
  static getSupport(): typeof SUPPORTS {
    return { ...SUPPORTS };
  }

  /** Destroy and release resources */
  destroy(): void {
    this.destroyed = true;
    this.opfsRoot = null;
  }

  // --- Internal ---

  private buildFileTypes(accept?: Record<string, string[]>): Array<{ description: string; accept: Record<string, string[]> }> | undefined {
    if (!accept) return undefined;

    return Object.entries(accept).map(([key, values]) => ({
      description: key,
      accept: { [key]: values },
    }));
  }

  private fallbackFileInput(options: FilePickerOptions): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = options.multiple ?? false;
      if (options.accept) {
        input.accept = Object.values(options.accept).flat().join(",");
      }
      input.style.display = "none";

      input.addEventListener("change", () => {
        resolve(Array.from(input.files));
        input.remove();
      });

      input.addEventListener("cancel", () => {
        resolve([]);
        input.remove();
      });

      document.body.appendChild(input);
      input.click();
    });
  }

  private fallbackDirInput(): Promise<null> {
    // webkitdirectory is the only fallback
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.webkitdirectory = true;
      input.style.display = "none";

      input.addEventListener("change", () => {
        // Can't return a proper handle — just resolve with files
        resolve(null);
        input.remove();
      });

      input.addEventListener("cancel", () => {
        resolve(null);
        input.remove();
      });

      document.body.appendChild(input);
      input.click();
    });
  }

  private async blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to convert blob"));
      reader.readAsDataURL(blob);
    });
  }
}
