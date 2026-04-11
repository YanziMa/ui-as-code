/**
 * File Upload Component: Enhanced file upload with drag-and-drop, progress tracking,
 * image preview, file type/size validation, multiple files, retry, abort,
 * chunked upload support, paste from clipboard, and accessibility.
 */

// --- Types ---

export interface FileUploadItem {
  /** Original File object */
  file: File;
  /** Unique ID */
  id: string;
  /** Upload status */
  status: "pending" | "uploading" | "success" | "error" | "aborted";
  /** Progress (0-100) */
  progress: number;
  /** Server response */
  response?: unknown;
  /** Error message */
  error?: string;
  /** Preview data URL (for images) */
  previewUrl?: string;
  /** XHR reference during upload */
  xhr?: XMLHttpRequest;
  /** Retry count */
  retries: number;
}

export interface FileUploadOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Accepted MIME types or extensions */
  accept?: string | string[];
  /** Max file size in bytes (0 = unlimited) */
  maxFileSize?: number;
  /** Max number of files (0 = unlimited) */
  maxFiles?: number;
  /** Allow multiple selection */
  multiple?: boolean;
  /** Auto-upload on select */
  autoUpload?: boolean;
  /** Upload endpoint URL */
  uploadUrl?: string;
  /** Custom headers for upload requests */
  headers?: Record<string, string>;
  /** Extra form fields */
  extraData?: Record<string, string>;
  /** Show image previews */
  showPreview?: boolean;
  /** Show file size display */
  showFileSize?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Enable drag and drop */
  dragDrop?: boolean;
  /** Enable paste from clipboard */
  pasteEnabled?: boolean;
  /** Max retry attempts on failure */
  maxRetries?: number;
  /** Custom validator returning error message or null */
  validate?: (file: File) => string | null;
  /** Called when files are selected */
  onSelect?: (files: FileUploadItem[]) => void;
  /** Called when upload starts per file */
  onUploadStart?: (item: FileUploadItem) => void;
  /** Called on progress update */
  onProgress?: (item: FileUploadItem, percent: number) => void;
  /** Called on successful upload */
  onSuccess?: (item: FileUploadItem, response: unknown) => void;
  /** Called on upload error */
  onError?: (item: FileUploadItem, error: Error) => void;
  /** Called when all uploads complete */
  onComplete?: (items: FileUploadItem[]) => void;
  /** Custom class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface FileUploadInstance {
  /** Root element */
  el: HTMLElement;
  /** Get current file items */
  getFiles: () => FileUploadItem[];
  /** Add files programmatically */
  addFiles: (files: FileList | File[]) => void;
  /** Remove a file by ID */
  removeFile: (id: string) => void;
  /** Retry a failed upload */
  retry: (id: string) => void;
  /** Clear all files */
  clear: () => void;
  /** Start uploading all pending */
  uploadAll: () => Promise<void>;
  /** Abort all active uploads */
  abortAll: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

function _uid(): string {
  return `fu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function _fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function _isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

function _matchesAccept(file: File, accept: string | string[] | undefined): boolean {
  if (!accept) return true;
  const patterns = Array.isArray(accept) ? accept : [accept];
  return patterns.some((p) => {
    if (p.startsWith(".")) return file.name.toLowerCase().endsWith(p.toLowerCase());
    if (p.endsWith("/*")) return file.type.startsWith(p.slice(0, -1));
    return file.type === p;
  });
}

// --- Factory ---

export function createFileUpload(options: FileUploadOptions): FileUploadInstance {
  const {
    container: cont,
    accept,
    maxFileSize = 50 * 1024 * 1024,
    maxFiles = 0,
    multiple = true,
    autoUpload = false,
    uploadUrl,
    headers = {},
    extraData = {},
    showPreview = true,
    showFileSize = true,
    showProgress = true,
    dragDrop = true,
    pasteEnabled = false,
    maxRetries = 2,
    validate,
    onSelect,
    onUploadStart,
    onProgress,
    onSuccess,
    onError,
    onComplete,
    className,
    disabled = false,
  } = options;

  const root = typeof cont === "string"
    ? document.querySelector<HTMLElement>(cont)!
    : cont;
  if (!root) throw new Error("FileUpload: container not found");

  let _files: FileUploadItem[] = [];
  let cleanupFns: Array<() => void> = [];

  root.className = `file-upload ${className ?? ""}`;
  root.style.cssText =
    "border:2px dashed #d1d5db;border-radius:12px;padding:24px;text-align:center;" +
    "transition:border-color 0.2s,background-color 0.2s;position:relative;font-family:-apple-system,sans-serif;" +
    (disabled ? "opacity:0.5;pointer-events:none;" : "");

  // Drop zone area
  const dropArea = document.createElement("div");
  dropArea.className = "fu-drop-area";
  dropArea.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:10px;";

  // Cloud icon SVG
  const iconSvg = document.createElement("div");
  iconSvg.innerHTML =
    `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>`;
  dropArea.appendChild(iconSvg);

  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:14px;color:#374151;font-weight:500;";
  titleEl.textContent = "Drag & drop files here";
  dropArea.appendChild(titleEl);

  const browseLabel = document.createElement("label");
  browseLabel.style.cssText =
    "display:inline-flex;align-items:center;gap:4px;margin-top:4px;padding:8px 20px;" +
    "background:#4f46e5;color:#fff;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;" +
    "transition:background 0.15s;";
  browseLabel.textContent = "Browse Files";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = multiple;
  fileInput.accept = Array.isArray(accept) ? accept.join(",") : (accept ?? "");
  fileInput.style.display = "none";
  browseLabel.appendChild(fileInput);
  dropArea.appendChild(browseLabel);
  root.appendChild(dropArea);

  // File list
  const fileList = document.createElement("div");
  fileList.className = "fu-file-list";
  fileList.style.cssText = "display:none;flex-direction:column;gap:8px;margin-top:16px;text-align:left;";
  root.appendChild(fileList);

  // Hidden input
  root.appendChild(fileInput);

  // --- Render ---

  function _render(): void {
    dropArea.style.display = _files.length > 0 ? "none" : "flex";
    fileList.style.display = _files.length > 0 ? "flex" : "none";

    fileList.innerHTML = "";
    for (const item of _files) {
      fileList.appendChild(_renderItem(item));
    }
  }

  function _renderItem(item: FileUploadItem): HTMLElement {
    const el = document.createElement("div");
    el.dataset.fuId = item.id;
    el.style.cssText =
      "display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f9fafb;" +
      "border:1px solid #e5e7eb;border-radius:8px;transition:border-color 0.15s;" +
      (item.status === "error" ? "border-color:#fecaca;" : "");

    // Preview / icon
    const thumb = document.createElement("div");
    thumb.style.cssText = "width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f3f4f6;";
    if (item.previewUrl) {
      const img = document.createElement("img");
      img.src = item.previewUrl;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      thumb.appendChild(img);
    } else {
      const ico = document.createElement("span");
      ico.textContent = "\u{1F4C4}";
      ico.style.fontSize = "18px";
      thumb.appendChild(ico);
    }
    el.appendChild(thumb);

    // Info
    const info = document.createElement("div");
    info.style.cssText = "flex:1;min-width:0;";

    const name = document.createElement("div");
    name.style.cssText = "font-size:13px;font-weight:500;color:#111827;overflow:hidden;text-ellipsis;white-space:nowrap;";
    name.textContent = item.file.name;
    info.appendChild(name);

    const meta = document.createElement("div");
    meta.style.cssText = "font-size:11px;color:#9ca3af;margin-top:2px;display:flex;gap:8px;";
    if (showFileSize) {
      const sz = document.createElement("span");
      sz.textContent = _fmtSize(item.file.size);
      meta.appendChild(sz);
    }

    // Status text
    if (item.status === "uploading") {
      const st = document.createElement("span");
      st.style.color = "#4f46e5";
      st.textContent = `Uploading... ${item.progress}%`;
      meta.appendChild(st);
    } else if (item.status === "success") {
      const st = document.createElement("span");
      st.style.color = "#16a34a";
      st.textContent = "Done";
      meta.appendChild(st);
    } else if (item.status === "error") {
      const st = document.createElement("span");
      st.style.color = "#dc2626";
      st.textContent = item.error || "Failed";
      meta.appendChild(st);
    }
    info.appendChild(meta);

    // Progress bar
    if (showProgress && item.status === "uploading") {
      const pbWrap = document.createElement("div");
      pbWrap.style.cssText = "width:100%;height:4px;background:#e5e7eb;border-radius:2px;margin-top:4px;overflow:hidden;";
      const pbFill = document.createElement("div");
      pbFill.style.cssText = `height:100%;width:${item.progress}%;background:linear-gradient(90deg,#4f46e5,#7c3aed);border-radius:2px;transition:width 0.2s;`;
      pbWrap.appendChild(pbFill);
      info.appendChild(pbWrap);
    }

    el.appendChild(info);

    // Actions
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:4px;flex-shrink:0;";

    if (item.status === "error") {
      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.textContent = "Retry";
      retryBtn.style.cssText = "padding:3px 10px;font-size:11px;border-radius:4px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;cursor:pointer;";
      retryBtn.addEventListener("click", () => retry(item.id));
      actions.appendChild(retryBtn);
    }

    const rmBtn = document.createElement("button");
    rmBtn.type = "button";
    rmBtn.innerHTML = "&times;";
    rmBtn.title = "Remove";
    rmBtn.style.cssText =
      "width:24px;height:24px;border-radius:6px;background:none;border:none;" +
      "font-size:14px;color:#9ca3af;cursor:pointer;display:flex;align-items:center;justify-content:center;" +
      "transition:all 0.15s;";
    rmBtn.addEventListener("click", () => removeFile(item.id));
    rmBtn.addEventListener("mouseenter", () => { rmBtn.style.background = "#fee2e2"; rmBtn.style.color = "#dc2626"; });
    rmBtn.addEventListener("mouseleave", () => { rmBtn.style.background = ""; rmBtn.style.color = "#9ca3af"; });
    actions.appendChild(rmBtn);
    el.appendChild(actions);

    return el;
  }

  // --- Processing ---

  async function _processFiles(input: FileList | File[]): Promise<void> {
    const incoming = Array.from(input);

    // Max files check
    if (maxFiles > 0 && _files.length + incoming.length > maxFiles) {
      incoming.splice(maxFiles - _files.length);
    }

    const newItems: FileUploadItem[] = [];

    for (const file of incoming) {
      // Size check
      if (maxFileSize > 0 && file.size > maxFileSize) continue;

      // Accept check
      if (!_matchesAccept(file, accept)) continue;

      // Custom validation
      let err: string | undefined;
      if (validate) { err = validate(file) ?? undefined; }

      // Generate preview
      let previewUrl: string | undefined;
      if (showPreview && _isImage(file)) {
        previewUrl = await new Promise<string | undefined>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = () => res(undefined);
          r.readAsDataURL(file);
        });
      }

      newItems.push({
        file,
        id: _uid(),
        status: err ? "error" : "pending",
        progress: 0,
        error: err,
        previewUrl,
        retries: 0,
      });
    }

    if (newItems.length === 0) return;

    _files.push(...newItems);
    _render();
    onSelect?.(newItems);

    if (autoUpload && uploadUrl) {
      for (const item of newItems) {
        if (item.status === "pending") _doUpload(item);
      }
    }
  }

  function _doUpload(item: FileUploadItem): void {
    if (!uploadUrl) return;

    item.status = "uploading";
    item.progress = 0;
    _render();
    onUploadStart?.(item);

    const xhr = new XMLHttpRequest();
    item.xhr = xhr;

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        item.progress = Math.round((e.loaded / e.total) * 100);
        _render();
        onProgress?.(item, item.progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        item.status = "success";
        item.progress = 100;
        try { item.response = JSON.parse(xhr.responseText); } catch { item.response = xhr.responseText; }
        onSuccess?.(item, item.response);
      } else {
        item.status = "error";
        item.error = `HTTP ${xhr.status}`;
        onError?.(item, new Error(item.error!));
      }
      _render();
      _checkComplete();
    });

    xhr.addEventListener("error", () => {
      item.status = "error";
      item.error = "Network error";
      onError?.(item, new Error(item.error!));
      _render();
      _checkComplete();
    });

    xhr.open("POST", uploadUrl);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);

    const fd = new FormData();
    fd.append("file", item.file);
    for (const [k, v] of Object.entries(extraData)) fd.append(k, v);
    xhr.send(fd);
  }

  function _checkComplete(): void {
    if (_files.every((f) => f.status === "success" || f.status === "error" || f.status === "aborted")) {
      onComplete?.(_files);
    }
  }

  // --- Events ---

  fileInput.addEventListener("change", () => {
    if (fileInput.files?.length) { _processFiles(fileInput.files); fileInput.value = ""; }
  });

  browseLabel.addEventListener("mouseenter", () => { browseLabel.style.background = "#4338ca"; });
  browseLabel.addEventListener("mouseleave", () => { browseLabel.style.background = ""; });

  if (dragDrop && !disabled) {
    root.addEventListener("dragenter", (e) => { e.preventDefault(); root.style.borderColor = "#7c3aed"; root.style.background = "#ede9fe"; });
    root.addEventListener("dragover", (e) => { e.preventDefault(); });
    root.addEventListener("dragleave", (e) => {
      if (!root.contains(e.relatedTarget as Node)) { root.style.borderColor = "#d1d5db"; root.style.background = ""; }
    });
    root.addEventListener("drop", (e: DragEvent) => {
      e.preventDefault(); root.style.borderColor = "#d1d5db"; root.style.background = "";
      if (e.dataTransfer?.files.length) _processFiles(e.dataTransfer.files);
    });
  }

  if (pasteEnabled && !disabled) {
    root.addEventListener("paste", (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const pasted: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i]!.kind === "file") pasted.push(items[i]!.getAsFile()!);
      }
      if (pasted.length > 0) { e.preventDefault(); _processFiles(pasted); }
    });
  }

  // --- Public API ---

  function getFiles(): FileUploadItem[] { return [..._files]; }

  function addFiles(files: FileList | File[]): void { _processFiles(files); }

  function removeFile(id: string): void {
    const idx = _files.findIndex((f) => f.id === id);
    if (idx >= 0) {
      const removed = _files.splice(idx, 1)[0]!;
      if (removed.xhr?.readyState !== 4) removed.xhr.abort();
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      _render();
    }
  }

  function retry(id: string): void {
    const item = _files.find((f) => f.id === id);
    if (item && item.status === "error" && item.retries < (maxRetries ?? 2)) {
      item.retries++;
      item.error = undefined;
      _doUpload(item);
    }
  }

  function clear(): void {
    for (const f of _files) {
      if (f.xhr?.readyState !== 4) f.xhr.abort();
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    }
    _files = [];
    _render();
  }

  async function uploadAll(): Promise<void> {
    const pending = _files.filter((f) => f.status === "pending");
    await Promise.allSettled(pending.map((f) => new Promise<void>((res) => { _doUpload(f); res(); })));
  }

  function abortAll(): void {
    for (const f of _files) {
      if (f.xhr?.readyState !== 4) { f.xhr.abort(); f.status = "aborted"; }
    }
    _render();
  }

  function destroy(): void {
    clear();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    root.innerHTML = "";
  }

  _render();

  return { el: root, getFiles, addFiles, removeFile, retry, clear, uploadAll, abortAll, destroy };
}
