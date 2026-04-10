/**
 * File system utilities for browser environments (File System Access API + fallbacks).
 */

export interface FileSystemEntry {
  name: string;
  type: "file" | "directory";
  size?: number;
  lastModified?: number;
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
  path: string;
}

export interface FileSystemOptions {
  /** Start in directory */
  startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
  /** Accepted file types */
  accept?: Record<string, string[]>;
  /** Multiple selection allowed? */
  multiple?: boolean;
  /** Exclude hidden files/directories? */
  excludeHidden?: boolean;
}

/** Check if File System Access API is available */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

/** Open file picker and return selected file(s) */
export async function openFilePicker(
  options: FileSystemOptions & { multiple?: false } = {},
): Promise<FileSystemEntry | null>;
export async function openFilePicker(
  options: FileSystemOptions & { multiple: true },
): Promise<FileSystemEntry[]>;
export async function openFilePicker(
  options: FileSystemOptions = {},
): Promise<FileSystemEntry | FileSystemEntry[] | null> {
  const { multiple = false, ...pickerOpts } = options;

  if (isFileSystemAccessAccessApi()) {
    try {
      const handles = await window.showOpenFilePicker({
        multiple,
        excludeAcceptAllOption: false,
        types: options.accept ? Object.entries(options.accept).map(([mimeType, extensions]) => ({
          accept: { [mimeType]: extensions },
        })) : undefined,
      });

      if (!handles.length) return multiple ? [] : null;

      const entries = await Promise.all(handles.map(async (handle) => {
        const file = await handle.getFile();
        return {
          name: file.name,
          type: "file" as const,
          size: file.size,
          lastModified: file.lastModified,
          handle,
          path: file.name,
        };
      }));

      return multiple ? entries : entries[0] ?? null;
    } catch {
      // User cancelled or error
      return multiple ? [] : null;
    }
  }

  // Fallback to <input type="file">
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (multiple) input.multiple = true;
    if (options.accept) {
      input.accept = Object.values(options.accept).flat().join(",");
    }
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      document.body.removeChild(input);

      const entries: FileSystemEntry[] = files.map((file) => ({
        name: file.name,
        type: "file" as const,
        size: file.size,
        lastModified: file.lastModified,
        path: file.name,
      }));

      resolve(multiple ? entries : entries[0] ?? null);
    };
    input.click();
  });
}

function isFileSystemAccessAccessApi(): boolean {
  return typeof window !== "undefined" && "showOpenFilePicker" in window;
}

/** Open directory picker */
export async function openDirectoryPicker(
  options: Pick<FileSystemOptions, "startIn"> = {},
): Promise<FileSystemEntry | null> {
  if ("showDirectoryPicker" in window) {
    try {
      const handle = await window.showDirectoryPicker({
        mode: "read",
        startIn: options.startIn as any,
      });
      return {
        name: handle.name,
        type: "directory",
        handle,
        path: handle.name,
      };
    } catch {
      return null;
    }
  }

  // Fallback: use <input webkitdirectory>
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      document.body.removeChild(input);

      if (files.length === 0) { resolve(null); return; }

      // Use first file's relative path to determine directory
      const firstPath = files[0]?.webkitRelativePath ?? "";
      const dirName = firstPath.split("/")[0] ?? "Selected Directory";

      resolve({
        name: dirName,
        type: "directory",
        path: dirName,
      });
    };
    input.click();
  });
}

/** Read file content as text */
export async function readFileAsText(entry: FileSystemEntry): Promise<string> {
  if (entry.handle && "getFile" in entry.handle) {
    const file = await (entry.handle as FileSystemFileHandle).getFile();
    return file.text();
  }

  // Fallback: re-prompt user
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (file) resolve(await file.text());
      else reject(new Error("No file selected"));
    };
    input.click();
  });
}

/** Read file content as ArrayBuffer */
export async function readFileAsBuffer(entry: FileSystemEntry): Promise<ArrayBuffer> {
  if (entry.handle && "getFile" in entry.handle) {
    const file = await (entry.handle as FileSystemFileHandle).getFile();
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = async () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (file) resolve(await file.arrayBuffer());
      else reject(new Error("No file selected"));
    };
    input.click();
  });
}

/** Read file content as data URL */
export async function readFileAsDataUrl(entry: FileSystemEntry): Promise<string> {
  if (entry.handle && "getFile" in entry.handle) {
    const file = await (entry.handle as FileSystemFileHandle).getFile();
    return new Promise((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (file) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      } else reject(new Error("No file selected"));
    };
    input.click();
  });
}

/** Save/download a file using File System Access API or fallback */
export async function saveFile(
  data: string | Blob | ArrayBuffer,
  filename: string,
  options: { mimeType?: string; createNew?: boolean } = {},
): Promise<boolean> {
  const { mimeType = "text/plain", createNew = false } = options;

  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ accept: { [mimeType]: [filename.split(".").pop() ?? "*"] } }],
      });
      const writable = await handle.createWritable();

      let blob: Blob;
      if (typeof data === "string") blob = new Blob([data], { type: mimeType });
      else if (data instanceof ArrayBuffer) blob = new Blob([data], { type: mimeType });
      else blob = data;

      await writable.write(blob);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }

  // Fallback: download via anchor
  downloadBlob(data, filename, mimeType);
  return true;
}

/** Download blob/data as file (fallback method) */
function downloadBlob(
  data: string | Blob | ArrayBuffer,
  filename: string,
  mimeType: string,
): void {
  let blob: Blob;
  if (typeof data === "string") blob = new Blob([data], { type: mimeType });
  else if (data instanceof ArrayBuffer) blob = new Blob([data], { type: mimeType });
  else blob = data;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** List directory contents using File System Access API */
export async function listDirectory(
  entry: FileSystemEntry,
  options: { recursive?: boolean; depth?: number } = {},
): Promise<FileSystemEntry[]> {
  if (!(entry.handle && "values" in entry.handle)) {
    console.warn("Directory listing requires File System Access API handle");
    return [];
  }

  const dirHandle = entry.handle as FileSystemDirectoryHandle;
  const results: FileSystemEntry[] = [];
  const { recursive = false, depth = recursive ? 10 : 1 } = options;

  async function walk(handle: FileSystemDirectoryHandle, currentPath: string, currentDepth: number): Promise<void> {
    if (currentDepth > depth) return;

    for await (const entry of handle.values()) {
      const entryPath = `${currentPath}/${entry.name}`;

      if (entry.kind === "file") {
        const file = await entry.getFile();
        results.push({
          name: entry.name,
          type: "file",
          size: file.size,
          lastModified: file.lastModified,
          handle: entry,
          path: entryPath,
        });
      } else if (entry.kind === "directory") {
        results.push({
          name: entry.name,
          type: "directory",
          handle: entry,
          path: entryPath,
        });

        if (recursive && currentDepth < depth) {
          await walk(entry, entryPath, currentDepth + 1);
        }
      }
    }
  }

  await walk(dirHandle, entry.name, 1);
  return results;
}

/** Get file extension from filename */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1 || lastDot === filename.length - 1) return "";
  return filename.slice(lastDot + 1).toLowerCase();
}

/** Get MIME type from filename */
export function guessMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeMap: Record<string, string> = {
    txt: "text/plain",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    ts: "application/typescript",
    json: "application/json",
    md: "text/markdown",
    csv: "text/csv",
    xml: "application/xml",
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    mp4: "video/mp4",
    webm: "video/webm",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    zip: "application/zip",
    tar: "application/x-tar",
    gz: "application/gzip",
  };
  return mimeMap[ext] ?? "application/octet-stream";
}

/** Format file size for display */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/** Format last modified date for display */
export function formatLastModified(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString();
}

/** Check if filename matches a pattern (glob-like) */
export function matchesPattern(filename: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${regexStr}$`, "i").test(filename);
}
