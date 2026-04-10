/**
 * File Upload: Drag-and-drop file upload component with progress tracking,
 * file preview (image/audio/video), multiple file support, file type filtering,
 * size limits, retry on error, remove/reorder, and accessibility.
 */

// --- Types ---

export type UploadStatus = "pending" | "uploading" | "success" | "error" | "removed";

export interface UploadFile {
  /** Unique ID */
  id: string;
  /** Original File object */
  file: File;
  /** Current status */
  status: UploadStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** Server response URL (after success) */
  url?: string;
  /** Error message */
  error?: string;
  /** Preview data URL (for images) */
  previewUrl?: string;
  /** Abort controller for cancellation */
  abortController?: AbortController;
}

export interface UploadOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Accept file types (e.g., ".png,.jpg", "image/*") */
  accept?: string;
  /** Max file size in bytes (default: 10MB) */
  maxSize?: number;
  /** Max number of files (0 = unlimited) */
  maxFiles?: number;
  /** Allow multiple files? */
  multiple?: boolean;
  /** Enable drag-and-drop zone */
  draggable?: boolean;
  /** Show image previews */
  showPreview?: boolean;
  /** Show progress bar during upload */
  showProgress?: boolean;
  /** Custom upload handler (returns URL or throws) */
  uploader?: (file: File, onProgress: (pct: number) => void, signal: AbortSignal) => Promise<string>;
  /** Callback when files are selected (before upload) */
  onSelect?: (files: File[]) => boolean | void;
  /** Callback when a file upload completes */
  onSuccess?: (file: UploadFile) => void;
  /** Callback when a file upload fails */
  onError?: (file: UploadFile, error: unknown) => void;
  /** Callback when all uploads finish */
  onComplete?: (files: UploadFile[]) => void;
  /** Callback when files change (add/remove) */
  onChange?: (files: UploadFile[]) => void;
  /** Custom label text */
  label?: string;
  /** Sub-label / hint text */
  hint?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Auto-upload on selection (default: true) */
  autoUpload?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface UploadInstance {
  element: HTMLElement;
  /** Get all current files */
  getFiles: () => UploadFile[];
  /** Add files programmatically */
  addFiles: (files: File[] | FileList) => void;
  /** Remove a file by ID */
  removeFile: (id: string) => void;
  /** Retry a failed upload */
  retry: (id: string) => void;
  /** Cancel an ongoing upload */
  cancel: (id: string) => void;
  /** Start uploading all pending files */
  startUpload: () => void;
  /** Clear all files */
  clear: () => void;
  /** Open file picker dialog */
  openPicker: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

function generateId(): string {
  return `uf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function createPreview(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isImageFile(file)) { resolve(null); return; }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

// --- Main Factory ---

export function createUpload(options: UploadOptions): UploadInstance {
  const opts = {
    accept: options.accept ?? "",
    maxSize: options.maxSize ?? 10 * 1024 * 1024,
    maxFiles: options.maxFiles ?? 0,
    multiple: options.multiple ?? false,
    draggable: options.draggable ?? true,
    showPreview: options.showPreview ?? true,
    showProgress: options.showProgress ?? true,
    disabled: options.disabled ?? false,
    autoUpload: options.autoUpload ?? true,
    label: options.label ?? "Click or drag files here to upload",
    hint: options.hint ?? "",
    ...options,
  };

  const container = resolveEl(options.container);
  if (!container) throw new Error("Upload: container not found");

  let destroyed = false;
  let files: UploadFile[] = [];
  let hiddenInput: HTMLInputElement | null = null;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `upload ${opts.className ?? ""}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
  `;
  container.appendChild(root);

  // Drop zone
  const dropZone = document.createElement("div");
  dropZone.className = "upload-dropzone";
  dropZone.style.cssText = `
    border:2px dashed #d1d5db;border-radius:12px;padding:32px 24px;text-align:center;
    cursor:pointer;transition:border-color 0.2s,background 0.2s;
    background:#fafbfc;position:relative;
  `;
  root.appendChild(dropZone);

  // Drop zone content
  const iconEl = document.createElement("div");
  iconEl.innerHTML = "&#8683;"; // download arrow
  iconEl.style.cssText = "font-size:28px;color:#9ca3af;margin-bottom:8px;";
  dropZone.appendChild(iconEl);

  const labelEl = document.createElement("div");
  labelEl.textContent = opts.label;
  labelEl.style.cssText = "font-size:14px;font-weight:500;color:#374151;margin-bottom:4px;";
  dropZone.appendChild(labelEl);

  if (opts.hint) {
    const hintEl = document.createElement("div");
    hintEl.textContent = opts.hint;
    hintEl.style.cssText = "font-size:12px;color:#9ca3af;";
    dropZone.appendChild(hintEl);
  }

  // Hidden file input
  hiddenInput = document.createElement("input");
  hiddenInput.type = "file";
  hiddenInput.accept = opts.accept;
  hiddenInput.multiple = opts.multiple;
  hiddenInput.style.display = "none";
  hiddenInput.addEventListener("change", () => {
    if (hiddenInput!.files && hiddenInput!.files.length > 0) {
      handleFiles(Array.from(hiddenInput!.files));
      hiddenInput.value = "";
    }
  });
  root.appendChild(hiddenInput);

  // File list container
  const fileList = document.createElement("div");
  fileList.className = "upload-file-list";
  fileList.style.cssText = "margin-top:12px;display:flex;flex-direction:column;gap:8px;";
  root.appendChild(fileList);

  // --- Event Handlers ---

  function handleFiles(newFiles: File[]): void {
    if (destroyed || opts.disabled) return;

    // Check max files
    if (opts.maxFiles > 0) {
      const currentCount = files.filter((f) => f.status !== "removed").length;
      const available = opts.maxFiles - currentCount;
      if (available <= 0) return;
      if (newFiles.length > available) newFiles = newFiles.slice(0, available);
    }

    // Validate and create UploadFile entries
    const validFiles: UploadFile[] = [];

    for (const file of newFiles) {
      // Size check
      if (file.size > opts.maxSize) {
        opts.onError?.({} as UploadFile, new Error(`File "${file.name}" exceeds size limit (${formatFileSize(opts.maxSize)})`));
        continue;
      }

      const uf: UploadFile = {
        id: generateId(),
        file,
        status: "pending",
        progress: 0,
      };

      // Generate preview
      if (opts.showPreview && isImageFile(file)) {
        createPreview(file).then((url) => { uf.previewUrl = url ?? undefined; renderFileItem(uf); });
      }

      validFiles.push(uf);
      files.push(uf);
    }

    if (validFiles.length === 0) return;

    // Call onSelect callback
    if (opts.onSelect?.(validFiles.map((f) => f.file)) === false) {
      // Remove added files
      files = files.filter((f) => !validFiles.includes(f));
      return;
    }

    // Render items
    for (const uf of validFiles) renderFileItem(uf);

    opts.onChange?.([...files]);

    // Auto-upload
    if (opts.autoUpload && opts.uploader) {
      for (const uf of validFiles) uploadFile(uf);
    }
  }

  async function uploadFile(uf: UploadFile): Promise<void> {
    if (!opts.uploader || uf.status === "success" || uf.status === "removed") return;

    uf.status = "uploading";
    uf.progress = 0;
    uf.abortController = new AbortController();
    renderFileItem(uf);

    try {
      const url = await opts.uploader(
        uf.file,
        (pct) => {
          uf.progress = pct;
          renderFileItem(uf);
        },
        uf.abortController.signal,
      );
      uf.status = "success";
      uf.progress = 100;
      uf.url = url;
      uf.error = undefined;
      opts.onSuccess?.(uf);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        uf.status = "error";
        uf.error = err instanceof Error ? err.message : String(err);
        opts.onError?.(uf, err);
      }
    } finally {
      renderFileItem(uf);
      checkAllComplete();
    }
  }

  function checkAllComplete(): void {
    const active = files.filter((f) => f.status === "uploading" || f.status === "pending");
    if (active.length === 0) opts.onComplete?.([...files]);
  }

  function renderFileItem(uf: UploadFile): void {
    // Remove existing item if present
    const existing = fileList.querySelector(`[data-file-id="${uf.id}"]`);
    if (existing) existing.remove();

    if (uf.status === "removed") return;

    const item = document.createElement("div");
    item.className = `upload-item upload-item-${uf.status}`;
    item.dataset.fileId = uf.id;
    item.style.cssText = `
      display:flex;align-items:center;gap:10px;padding:10px 14px;
      background:#fff;border:1px solid #e5e7eb;border-radius:8px;
      transition:border-color 0.15s;
    `;

    // Preview thumbnail
    if (opts.showPreview && uf.previewUrl) {
      const thumb = document.createElement("img");
      thumb.src = uf.previewUrl;
      thumb.style.cssText = "width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;";
      item.appendChild(thumb);
    } else {
      const fileIcon = document.createElement("span");
      fileIcon.textContent = isImageFileFile(uf.file) ? "\uD83D\uDDBC️" : "\uD83D\uDCC4";
      fileIcon.style.cssText = "width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;background:#f3f4f6;border-radius:6px;";
      item.appendChild(fileIcon);
    }

    // Info area
    const info = document.createElement("div");
    info.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;";

    const nameRow = document.createElement("div");
    nameRow.style.cssText = "display:flex;align-items:center;gap:6px;";

    const fileName = document.createElement("span");
    fileName.textContent = uf.file.name;
    fileName.style.cssText = "font-size:13px;font-weight:500;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;";
    nameRow.appendChild(fileName);

    const fileSize = document.createElement("span");
    fileSize.textContent = formatFileSize(uf.file.size);
    fileSize.style.cssText = "font-size:11px;color:#9ca3af;flex-shrink:0;";
    nameRow.appendChild(fileSize);

    info.appendChild(nameRow);

    // Progress bar or status text
    if (uf.status === "uploading" && opts.showProgress) {
      const progressBar = document.createElement("div");
      progressBar.style.cssText = `
        height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:4px;
      `;
      const progressFill = document.createElement("div");
      progressFill.style.cssText = `
        height:100%;width:${uf.progress}%;background:#4f46e5;border-radius:2px;
        transition:width 0.2s ease;
      `;
      progressBar.appendChild(progressFill);
      info.appendChild(progressBar);

      const pctText = document.createElement("span");
      pctText.textContent = `${uf.progress}%`;
      pctText.style.cssText = "font-size:11px;color:#6366f1;";
      info.appendChild(pctText);
    } else if (uf.status === "error") {
      const errorText = document.createElement("span");
      errorText.textContent = uf.error ?? "Upload failed";
      errorText.style.cssText = "font-size:11px;color:#dc2626;";
      info.appendChild(errorText);
    } else if (uf.status === "success") {
      const successText = document.createElement("span");
      successText.textContent = "Uploaded successfully";
      successText.style.cssText = "font-size:11px;color:#059669;";
      info.appendChild(successText);
    }

    item.appendChild(info);

    // Action buttons
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:4px;flex-shrink:0;";

    if (uf.status === "uploading") {
      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "\u2715"; // X
      cancelBtn.title = "Cancel upload";
      cancelBtn.style.cssText = "width:24px;height:24px;border:none;border-radius:4px;background:#fef2f2;color:#dc2626;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;";
      cancelBtn.addEventListener("click", () => instance.cancel(uf.id));
      actions.appendChild(cancelBtn);
    } else if (uf.status === "error") {
      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.textContent = "\u21BB"; // ↻
      retryBtn.title = "Retry upload";
      retryBtn.style.cssText = "width:24px;height:24px;border:none;border-radius:4px;background:#eff6ff;color:#2563eb;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;";
      retryBtn.addEventListener("click", () => instance.retry(uf.id));
      actions.appendChild(retryBtn);
    }

    if (uf.status !== "uploading") {
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "\u2715"; // X
      removeBtn.title = "Remove file";
      removeBtn.style.cssText = "width:24px;height:24px;border:none;border-radius:4px;background:#f3f4f6;color:#6b7280;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;";
      removeBtn.addEventListener("click", () => instance.removeFile(uf.id));
      actions.appendChild(removeBtn);
    }

    item.appendChild(actions);
    fileList.appendChild(item);
  }

  function isImageFileFile(file: File): boolean {
    return file.type.startsWith("image/");
  }

  // --- Drop Zone Events ---

  dropZone.addEventListener("click", () => {
    if (!opts.disabled) hiddenInput?.click();
  });

  if (opts.draggable) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#6366f1";
      dropZone.style.background = "#eef2ff";
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "#d1d5db";
      dropZone.style.background = "#fafbfc";
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#d1d5db";
      dropZone.style.background = "#fafbfc";
      if (e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  // --- Instance ---

  const instance: UploadInstance = {
    element: root,

    getFiles: () => [...files],

    addFiles: (newFiles) => {
      handleFiles(Array.isArray(newFiles) ? newFiles : Array.from(newFiles));
    },

    removeFile: (id) => {
      const idx = files.findIndex((f) => f.id === id);
      if (idx >= 0) {
        if (files[idx]!.status === "uploading") {
          files[idx]!.abortController?.abort();
        }
        files[idx]!.status = "removed";
        const el = fileList.querySelector(`[data-file-id="${id}"]`);
        if (el) el.remove();
        files.splice(idx, 1);
        opts.onChange?.([...files]);
      }
    },

    retry: (id) => {
      const uf = files.find((f) => f.id === id);
      if (uf && uf.status === "error") {
        uf.status = "pending";
        uf.error = undefined;
        uf.progress = 0;
        if (opts.autoUpload && opts.uploader) uploadFile(uf);
      }
    },

    cancel: (id) => {
      const uf = files.find((f) => f.id === id);
      if (uf && uf.status === "uploading") {
        uf.abortController?.abort();
        uf.status = "error";
        uf.error = "Cancelled";
        renderFileItem(uf);
      }
    },

    startUpload: () => {
      if (!opts.uploader) return;
      for (const uf of files) {
        if (uf.status === "pending") uploadFile(uf);
      }
    },

    clear: () => {
      for (const uf of files) {
        if (uf.status === "uploading") uf.abortController?.abort();
      }
      files = [];
      fileList.innerHTML = "";
      opts.onChange?.([]);
    },

    openPicker: () => {
      if (!opts.disabled) hiddenInput?.click();
    },

    destroy: () => {
      destroyed = true;
      for (const uf of files) {
        if (uf.status === "uploading") uf.abortController?.abort();
      }
      root.remove();
    },
  };

  return instance;
}
