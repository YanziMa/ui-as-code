/**
 * Upload Utilities: File upload component with drag-and-drop zone, file list
 * with progress, validation (type/size), image preview, retry/cancel, batch
 * upload queue, and ARIA live regions for status announcements.
 */

// --- Types ---

export type UploadVariant = "default" | "card" | "compact";
export type UploadStatus = "pending" | "uploading" | "success" | "error";

export interface FileValidationRule {
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Accepted MIME types */
  accept?: string[];
  /** Max number of files */
  maxFiles?: number;
  /** Custom validator */
  validate?: (file: File) => string | null;
}

export interface UploadFileItem {
  /** The underlying File object */
  file: File;
  /** Unique ID */
  id: string;
  /** Current status */
  status: UploadStatus;
  /** Progress (0-100) */
  progress: number;
  /** Server response URL (after success) */
  url?: string;
  /** Error message */
  error?: string;
  /** Preview URL (for images) */
  previewUrl?: string;
  /** Abort controller for cancellation */
  abortController?: AbortController;
}

export interface UploadOptions {
  /** Accept attribute string */
  accept?: string;
  /** Multiple files allowed? */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Show image previews? */
  showPreview?: boolean;
  /** Visual variant */
  variant?: UploadVariant;
  /** Disabled? */
  disabled?: boolean;
  /** Label / prompt text */
  label?: string;
  /** Description text */
  description?: string;
  /** Custom upload handler */
  onUpload?: (file: FileItemWrapper, signal?: AbortSignal) => Promise<string>;
  /** On files added callback */
  onFilesAdded?: (files: UploadFileItem[]) => void;
  /** On single file status change */
  onFileChange?: (item: UploadFileItem) => void;
  /** On all uploads complete */
  onComplete?: (items: UploadFileItem[]) => void;
  /** On error */
  onError?: (error: Error, item?: UploadFileItem) => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

/** Minimal wrapper passed to the custom upload handler */
export interface FileItemWrapper {
  file: File;
  id: string;
  updateProgress: (progress: number) => void;
}

export interface UploadInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Get all file items */
  getFiles(): UploadFileItem[];
  /** Add files programmatically */
  addFiles(files: File | File[]): void;
  /** Remove a file by ID */
  removeFile(id: string): void;
  /** Retry a failed upload */
  retry(id: string): void;
  /** Cancel an in-progress upload */
  cancel(id: string): void;
  /** Clear all files */
  clear(): void;
  /** Start uploading all pending files */
  uploadAll(): Promise<void>;
  /** Set disabled state */
  setDisabled(disabled: boolean): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Status Colors ---

const STATUS_COLORS: Record<UploadStatus, { bg: string; border: string; text: string }> = {
  "pending": { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" },
  "uploading": { bg: "#eff6ff", border: "#93c5fd", text: "#2563eb" },
  "success": { bg: "#f0fdf4", border: "#86efac", text: "#16a34a" },
  "error": { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" },
};

// --- Helpers ---

let _idCounter = 0;
function generateId(): string {
  return `upload-${Date.now()}-${++_idCounter}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function createPreviewUrl(file: File): string | null {
  if (!isImageFile(file)) return null;
  return URL.createObjectURL(file);
}

function validateFile(file: File, rules: FileValidationRule): string | null {
  if (rules.maxSize && file.size > rules.maxSize) {
    return `File too large (${formatFileSize(file)} exceeds ${formatFileSize(rules.maxSize)})`;
  }
  if (rules.accept && rules.accept.length > 0) {
    if (!rules.accept.some((t) => file.type === t || file.type.startsWith(t.replace("/*", "/")))) {
      return `File type "${file.type}" not accepted`;
    }
  }
  if (rules.validate) {
    return rules.validate(file);
  }
  return null;
}

// --- Core Factory ---

/**
 * Create a file upload component.
 *
 * @example
 * ```ts
 * const uploader = createUpload({
 *   accept: "image/*",
 *   multiple: true,
 *   maxFileSize: 5 * 1024 * 1024,
 *   showPreview: true,
 *   onUpload: async (wrapper) => {
 *     const formData = new FormData();
 *     formData.append("file", wrapper.file);
 *     const res = await fetch("/api/upload", { method: "POST", body: formData });
 *     return (await res.json()).url;
 *   },
 * });
 * ```
 */
export function createUpload(options: UploadOptions = {}): UploadInstance {
  const {
    accept,
    multiple = false,
    maxFileSize,
    maxFiles,
    showPreview = true,
    variant = "default",
    disabled = false,
    label = "Drop files here or click to browse",
    description,
    onUpload,
    onFilesAdded,
    onFileChange,
    onComplete,
    onError,
    className,
    container,
  } = options;

  const items: UploadFileItem[] = [];
  let _disabled = disabled;

  // Validation rules derived from options
  const rules: FileValidationRule = {
    maxSize: maxFileSize,
    accept: accept ? accept.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    maxFiles,
  };

  // Root
  const root = document.createElement("div");
  root.className = `upload-wrapper ${variant} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-direction:column;gap:8px;width:100%;";

  // Drop zone
  const dropZone = document.createElement("div");
  dropZone.className = "upload-dropzone";
  dropZone.setAttribute("role", "button");
  dropZone.tabIndex = _disabled ? -1 : 0;
  dropZone.setAttribute("aria-label", label);

  let isDraggingOver = false;

  function renderDropZone(): void {
    dropZone.style.cssText =
      "display:flex;flex-direction:column;align-items:center;justify-content:center;" +
      "gap:8px;padding:32px 20px;border:2px dashed " +
      (isDraggingOver ? "#3b82f6" : "#d1d5db") + ";" +
      "border-radius:12px;background:" + (isDraggingOver ? "#eff6ff" : "#fafafa") + ";" +
      "cursor:" + (_disabled ? "not-allowed" : "pointer") + ";" +
      "transition:border-color 0.15s, background 0.15s;text-align:center;" +
      (_disabled ? "opacity:0.5;pointer-events:none;" : "");

    dropZone.innerHTML = "";

    // Icon
    const icon = document.createElement("span");
    icon.innerHTML = isDraggingOver ? "&#8681;" : &#128193;;
    icon.style.cssText = "font-size:32px;line-height:1;";
    dropZone.appendChild(icon);

    // Label
    const labelEl = document.createElement("span");
    labelEl.textContent = label;
    labelEl.style.cssText = "font-size:14px;font-weight:500;color:#374151;";
    dropZone.appendChild(labelEl);

    // Description
    if (description) {
      const descEl = document.createElement("span");
      descEl.textContent = description;
      descEl.style.cssText = "font-size:12px;color:#9ca3af;";
      dropZone.appendChild(descEl);
    }

    // Accept hint
    if (accept) {
      const hintEl = document.createElement("span");
      hintEl.textContent = `Accepted: ${accept}`;
      hintEl.style.cssText = "font-size:11px;color:#9ca3af;margin-top:4px;";
      dropZone.appendChild(hintEl);
    }
  }

  renderDropZone();
  root.appendChild(dropZone);

  // Hidden file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  if (accept) fileInput.accept = accept;
  if (multiple) fileInput.multiple = true;
  fileInput.style.cssText = "position:absolute;opacity:0;width:0;height:0;margin:0;pointer-events:none;";
  root.appendChild(fileInput);

  // File list container
  const fileList = document.createElement("div");
  fileList.className = "upload-file-list";
  fileList.style.cssText = "display:flex;flex-direction:column;gap:6px;";
  root.appendChild(fileList);

  // Live region for announcements
  const announcer = document.createElement("div");
  announcer.setAttribute("role", "status");
  announcer.setAttribute("aria-live", "polite");
  announcer.className = "sr-only";
  announcer.style.cssText = "position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);";
  root.appendChild(announcer);

  function announce(msg: string): void {
    announcer.textContent = "";
    requestAnimationFrame(() => { announcer.textContent = msg; });
  }

  // --- File Handling ---

  function handleFiles(files: FileList | File[]): void {
    const fileArray = Array.from(files);

    // Check max files
    if (maxFiles && items.length + fileArray.length > maxFiles) {
      announce(`Maximum of ${maxFiles} files allowed`);
      onError?.(new Error(`Maximum of ${maxFiles} files allowed`));
      return;
    }

    const newItems: UploadFileItem[] = [];

    for (const file of fileArray) {
      const error = validateFile(file, rules);
      const item: UploadFileItem = {
        id: generateId(),
        file,
        status: error ? "error" : "pending",
        progress: 0,
        error: error ?? undefined,
        previewUrl: showPreview ? createPreviewUrl(file) ?? undefined : undefined,
      };
      items.push(item);
      newItems.push(item);
    }

    if (newItems.length > 0) {
      renderFileList();
      onFilesAdded?.(newItems);
      announce(`${newItems.length} file(s) added`);
    }
  }

  function renderFileList(): void {
    fileList.innerHTML = "";

    for (const item of items) {
      const row = document.createElement("div");
      row.className = `upload-file-item ${item.status}`;
      row.dataset.id = item.id;
      const sc = STATUS_COLORS[item.status];

      row.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:8px 12px;" +
        `background:${sc.bg};border:1px solid ${sc.border};border-radius:8px;` +
        "transition:all 0.15s ease;";

      // Preview thumbnail
      if (item.previewUrl) {
        const thumb = document.createElement("img");
        thumb.src = item.previewUrl;
        thumb.alt = item.file.name;
        thumb.style.cssText =
          "width:36px;height:36px;border-radius:6px;object-fit-cover;flex-shrink:0;border:1px solid #e5e7eb;";
        row.appendChild(thumb);
      } else {
        const fileIcon = document.createElement("span");
        fileIcon.textContent = "&#128196;";
        fileIcon.style.cssText = "font-size:24px;flex-shrink:0;";
        row.appendChild(fileIcon);
      }

      // Info area
      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;";

      const nameEl = document.createElement("span");
      nameEl.textContent = item.file.name;
      nameEl.style.cssText =
        "font-size:13px;font-weight:500;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      info.appendChild(nameEl);

      const metaRow = document.createElement("div");
      metaRow.style.display = "flex";
      metaRow.style.gap = "8px";
      metaRow.style.alignItems = "center";

      const sizeEl = document.createElement("span");
      sizeEl.textContent = formatFileSize(item.file.size);
      sizeEl.style.cssText = "font-size:11px;color:#9ca3af;";
      metaRow.appendChild(sizeEl);

      // Status badge
      const statusBadge = document.createElement("span");
      statusBadge.textContent = item.status.charAt(0).toUpperCase() + item.status.slice(1);
      statusBadge.style.cssText =
        `font-size:10px;font-weight:600;color:${sc.text};background:${sc.bg};` +
        "padding:1px 6px;border-radius:9999px;text-transform:capitalize;";
      metaRow.appendChild(statusBadge);

      info.appendChild(metaRow);

      // Progress bar (for uploading)
      if (item.status === "uploading") {
        const progressBar = document.createElement("div");
        progressBar.style.cssText =
          "width:100%;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;margin-top:4px;";

        const progressFill = document.createElement("div");
        progressFill.style.cssText =
          `height:100%;width:${item.progress}%;background:#3b82f6;border-radius:2px;` +
          "transition:width 0.15s ease;";
        progressBar.appendChild(progressFill);
        info.appendChild(progressBar);
      } else if (item.error) {
        const errEl = document.createElement("span");
        errEl.textContent = item.error;
        errEl.style.cssText = "font-size:11px;color:#dc2626;";
        info.appendChild(errEl);
      }

      row.appendChild(info);

      // Actions column
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:4px;flex-shrink:0;align-items:center;";

      // Retry button (for errors)
      if (item.status === "error") {
        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.innerHTML = "&#8635;";
        retryBtn.title = "Retry";
        retryBtn.style.cssText =
          "background:none;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;" +
          "font-size:14px;padding:4px 6px;color:#6b7280;";
        retryBtn.addEventListener("click", () => instance.retry(item.id));
        actions.appendChild(retryBtn);
      }

      // Cancel button (for uploading)
      if (item.status === "uploading") {
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.innerHTML = "&#10005;";
        cancelBtn.title = "Cancel";
        cancelBtn.style.cssText =
          "background:none;border:1px solid #d1d5db;border-radius:4px;cursor:pointer;" +
          "font-size:12px;padding:4px 6px;color:#ef4444;";
        cancelBtn.addEventListener("click", () => instance.cancel(item.id));
        actions.appendChild(cancelBtn);
      }

      // Remove button
      if (item.status !== "uploading") {
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerHTML = "&times;";
        removeBtn.title = "Remove";
        removeBtn.style.cssText =
          "background:none;border:none;cursor:pointer;font-size:16px;" +
          "color:#9ca3af;padding:2px;border-radius:4px;";
        removeBtn.addEventListener("mouseenter", () => { removeBtn.style.color = "#ef4444"; });
        removeBtn.addEventListener("mouseleave", () => { removeBtn.style.color = "#9ca3af"; });
        removeBtn.addEventListener("click", () => instance.removeFile(item.id));
        actions.appendChild(removeBtn);
      }

      row.appendChild(actions);
      fileList.appendChild(row);
    }
  }

  // --- Drag & Drop ---

  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    if (_disabled) return;
    isDraggingOver = true;
    renderDropZone();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (_disabled) return;
    isDraggingOver = true;
    renderDropZone();
  });

  dropZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    if (!_disabled && !dropZone.contains(e.relatedTarget as Node)) {
      isDraggingOver = false;
      renderDropZone();
    }
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    if (_disabled) return;
    isDraggingOver = false;
    renderDropZone();
    handleFiles(e.dataTransfer?.files ?? []);
  });

  // Click to open file dialog
  dropZone.addEventListener("click", () => {
    if (!_disabled) fileInput.click();
  });

  dropZone.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && !_disabled) {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files?.length) handleFiles(fileInput.files);
    fileInput.value = "";
  });

  // --- Instance ---

  const instance: UploadInstance = {
    el: root,

    getFiles() { return [...items]; },

    addFiles(f) {
      handleFiles(Array.isArray(f) ? f : [f]);
    },

    removeFile(id: string) {
      const idx = items.findIndex((i) => i.id === id);
      if (idx < 0) return;
      const [removed] = items.splice(idx, 1);
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      if (removed.abortController) removed.abortController.abort();
      renderFileList();
    },

    async retry(id: string) {
      const item = items.find((i) => i.id === id);
      if (!item || !onUpload) return;
      item.status = "uploading";
      item.progress = 0;
      item.error = undefined;
      renderFileList();

      try {
        const ac = new AbortController();
        item.abortController = ac;
        const url = await onUpload({
          file: item.file,
          id: item.id,
          updateProgress(p: number) {
            item.progress = p;
            renderFileList();
            onFileChange?.(item);
          },
        }, ac.signal);
        item.status = "success";
        item.progress = 100;
        item.url = url;
      } catch (err) {
        item.status = "error";
        item.error = err instanceof Error ? err.message : "Upload failed";
        onError?.(err instanceof Error ? err : new Error(String(err)), item);
      }
      renderFileList();
      onFileChange?.(item);
    },

    cancel(id: string) {
      const item = items.find((i) => i.id === id);
      if (!item || item.status !== "uploading") return;
      item.abortController?.abort();
      item.status = "pending";
      item.progress = 0;
      renderFileList();
    },

    clear() {
      for (const item of items) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        if (item.abortController) item.abortController.abort();
      }
      items.length = 0;
      renderFileList();
    },

    async uploadAll(): Promise<void> {
      if (!onUpload) return;
      const pending = items.filter((i) => i.status === "pending");

      for (const item of pending) {
        item.status = "uploading";
        item.progress = 0;
        renderFileList();

        try {
          const ac = new AbortController();
          item.abortController = ac;
          const url = await onUpload({
            file: item.file,
            id: item.id,
            updateProgress(p: number) {
              item.progress = p;
              renderFileList();
              onFileChange?.(item);
            },
          }, ac.signal);
          item.status = "success";
          item.progress = 100;
          item.url = url;
        } catch (err) {
          item.status = "error";
          item.error = err instanceof Error ? err.message : "Upload failed";
          onError?.(err instanceof Error ? err : new Error(String(err)), item);
        }
        renderFileList();
        onFileChange?.(item);
      }

      onComplete?.([...items]);
    },

    setDisabled(d: boolean) {
      _disabled = d;
      dropZone.tabIndex = d ? -1 : 0;
      renderDropZone();
    },

    destroy() {
      instance.clear();
      root.remove();
    },
  };

  if (container) container.appendChild(root);

  return instance;
}
