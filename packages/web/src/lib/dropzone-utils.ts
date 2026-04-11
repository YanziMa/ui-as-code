/**
 * Dropzone Utilities: Drag-and-drop file upload zone with click-to-upload,
 * paste support, file type validation, size limits, preview generation,
 * progress tracking, and multi-file management.
 */

// --- Types ---

export type DropzoneVariant = "default" | "bordered" | "filled" | "compact";
export type FileValidationError = "type" | "size" | "count" | "custom";

export interface DropzoneFile {
  /** The underlying File object */
  file: File;
  /** Unique ID */
  id: string;
  /** Preview URL (for images) */
  previewUrl?: string;
  /** Upload progress (0-100) */
  progress?: number;
  /** Error message if validation/upload failed */
  error?: string;
  /** Server response after upload */
  response?: unknown;
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface DropzoneOptions {
  /** Accepted MIME types (e.g., "image/*,.pdf") */
  accept?: string;
  /** Max file size in bytes (0 = unlimited) */
  maxSize?: number;
  /** Max number of files (0 = unlimited) */
  maxFiles?: number;
  /** Allow multiple files? */
  multiple?: boolean;
  /** Click to open file dialog? */
  clickable?: boolean;
  /** Enable drag-and-drop? */
  dragDrop?: boolean;
  /** Enable paste from clipboard? */
  pasteEnabled?: boolean;
  /** Show file previews for images? */
  showPreviews?: boolean;
  /** Show upload progress bars? */
  showProgress?: boolean;
  /** Show remove button on each file? */
  showRemove?: boolean;
  /** Visual variant */
  variant?: DropzoneVariant;
  /** Label text shown in the dropzone */
  label?: string;
  /** Sublabel/description text */
  sublabel?: string;
  /** Icon HTML (shown in center of dropzone) */
  icon?: string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Disabled state */
  disabled?: boolean;
  /** Called when files are added (before upload) */
  onFilesAdded?: (files: DropzoneFile[]) => void;
  /** Called when a single file is selected/added */
  onFileAdd?: (file: DropzoneFile) => void;
  /** Called when a file is removed */
  onFileRemove?: (file: DropzoneFile) => void;
  /** Called when validation fails */
  onValidationError?: (error: FileValidationError, file: File, message: string) => void;
  /** Called when user clicks the dropzone (return false to prevent default) */
  onClick?: () => void | boolean;
  /** Custom validator function */
  validateFile?: (file: File) => string | null;
}

export interface DropzoneInstance {
  /** Root element */
  el: HTMLElement;
  /** The hidden file input element */
  inputEl: HTMLInputElement;
  /** Open the file picker programmatically */
  open: () => void;
  /** Get all current files */
  getFiles: () => DropzoneFile[];
  /** Remove a file by ID */
  removeFile: (id: string) => void;
  /** Clear all files */
  clear: () => void;
  /** Set progress for a file */
  setProgress: (id: string, progress: number) => void;
  /** Set error for a file */
  setError: (id: string, error: string) => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a drag-and-drop file upload zone.
 *
 * @example
 * ```ts
 * const dz = createDropzone({
 *   accept: "image/*",
 *   maxSize: 5 * 1024 * 1024,
 *   multiple: true,
 *   onFilesAdded: (files) => uploadFiles(files),
 * });
 * ```
 */
export function createDropzone(options: DropzoneOptions = {}): DropzoneInstance {
  const {
    accept = "*/*",
    maxSize = 0,
    maxFiles = 0,
    multiple = true,
    clickable = true,
    dragDrop = true,
    pasteEnabled = false,
    showPreviews = true,
    showProgress = true,
    showRemove = true,
    variant = "default",
    label = "Drop files here or click to upload",
    sublabel = "",
    icon = "&#128228;",
    className,
    container,
    disabled = false,
    onFilesAdded,
    onFileAdd,
    onFileRemove,
    onValidationError,
    onClick,
    validateFile,
  } = options;

  let _files: DropzoneFile[] = [];
  let _counter = 0;

  // Root element
  const root = document.createElement("div");
  root.className = `dropzone ${variant} ${className ?? ""}`.trim();
  root.style.cssText =
    "position:relative;border:2px dashed #d1d5db;border-radius:12px;" +
    "padding:32px 24px;text-align:center;cursor:pointer;" +
    "transition:border-color 0.2s, background 0.2s;" +
    (disabled ? "opacity:0.5;cursor:not-allowed;pointer-events:none;" : "");

  // Hidden file input
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = multiple;
  input.accept = accept;
  input.style.cssText = "position:absolute;inset:0;opacity:0;cursor:pointer;" + (disabled ? "pointer-events:none;" : "");
  if (!disabled && clickable) root.appendChild(input);

  // Default content area
  const contentArea = document.createElement("div");
  contentArea.className = "dropzone-content";
  contentArea.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:8px;";

  const iconEl = document.createElement("div");
  iconEl.innerHTML = icon;
  iconEl.style.cssText = "font-size:36px;color:#9ca3af;";
  contentArea.appendChild(iconEl);

  const labelEl = document.createElement("div");
  labelEl.className = "dropzone-label";
  labelEl.textContent = label;
  labelEl.style.cssText = "font-size:14px;font-weight:500;color:#374151;";
  contentArea.appendChild(labelEl);

  if (sublabel) {
    const subEl = document.createElement("div");
    subEl.className = "dropzone-sublabel";
    subEl.textContent = sublabel;
    subEl.style.cssText = "font-size:12px;color:#9ca3af;margin-top:-4px;";
    contentArea.appendChild(subEl);
  }

  root.appendChild(contentArea);

  // File list area
  const fileList = document.createElement("div");
  fileList.className = "dropzone-file-list";
  fileList.style.cssText =
    "margin-top:16px;display:flex;flex-direction:column;gap:8px;max-height:200px;overflow-y:auto;";
  root.appendChild(fileList);

  (container ?? document.body).appendChild(root);

  // --- Validation ---

  function validate(file: File): string | null {
    // Custom validator first
    if (validateFile) {
      const customErr = validateFile(file);
      if (customErr) return customErr;
    }

    // Type check
    if (accept && accept !== "*/*") {
      const acceptedTypes = accept.split(",").map((t) => t.trim());
      const matchesType = acceptedTypes.some((pattern) => {
        if (pattern.endsWith("/*")) {
          return file.type.startsWith(pattern.slice(0, -1));
        }
        if (pattern.startsWith(".")) {
          return file.name.toLowerCase().endsWith(pattern.toLowerCase());
        }
        return file.type === pattern || pattern === "*/*";
      });
      if (!matchesType) return `File type "${file.type}" is not accepted`;
    }

    // Size check
    if (maxSize > 0 && file.size > maxSize) {
      const mb = maxSize / (1024 * 1024);
      return `File exceeds maximum size of ${mb.toFixed(1)}MB`;
    }

    // Count check
    if (maxFiles > 0 && _files.length >= maxFiles) {
      return `Maximum ${maxFiles} file(s) allowed`;
    }

    return null;
  }

  // --- File Handling ---

  function processFiles(fileList_: FileList | File[]): void {
    const newFiles: DropzoneFile[] = [];

    Array.from(fileList_).forEach((file) => {
      const error = validate(file);
      if (error) {
        onValidationError?.(("type" as any) === error ? "type" : ("size" as any), file, error);
        return;
      }

      const id = `dz-${Date.now()}-${++_counter}`;
      const dzFile: DropzoneFile = { file, id };

      // Generate image preview
      if (showPreviews && file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        dzFile.previewUrl = url;
      }

      _files.push(dzFile);
      newFiles.push(dzFile);
      onFileAdd?.(dzFile);
    });

    if (newFiles.length > 0) {
      renderFileList();
      onFilesAdded?.(newFiles);
    }
  }

  function renderFileList(): void {
    fileList.innerHTML = "";

    for (const f of _files) {
      const row = document.createElement("div");
      row.className = "dropzone-file-row";
      row.dataset.fileId = f.id;
      row.style.cssText =
        "display:flex;align-items:center;gap:10px;padding:8px 12px;" +
        "background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;";

      // Preview or icon
      if (f.previewUrl) {
        const img = document.createElement("img");
        img.src = f.previewUrl;
        img.style.cssText = "width:40px;height:40px;object-fit:cover;border-radius:6px;flex-shrink:0;";
        row.appendChild(img);
      } else {
        const fileIcon = document.createElement("span");
        fileIcon.innerHTML = "&#128196;";
        fileIcon.style.cssText = "font-size:24px;flex-shrink:0;color:#9ca3af;";
        row.appendChild(fileIcon);
      }

      // Info
      const info = document.createElement("div");
      info.style.flex = "1";
      info.style.minWidth = "0";

      const nameEl = document.createElement("div");
      nameEl.textContent = f.file.name;
      nameEl.style.cssText = "font-size:13px;font-weight:500;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      info.appendChild(nameEl);

      const sizeEl = document.createElement("div");
      sizeEl.textContent = formatFileSize(f.file.size);
      sizeEl.style.cssText = "font-size:11px;color:#9ca3af;";
      info.appendChild(sizeEl);

      // Progress bar
      if (showProgress && f.progress !== undefined) {
        const progWrap = document.createElement("div");
        progWrap.style.cssText = "width:100%;height:3px;background:#e5e7eb;border-radius:2px;margin-top:4px;overflow:hidden;";

        const progFill = document.createElement("div");
        progFill.style.cssText =
          `height:100%;background:#3b82f6;border-radius:2px;transition:width 0.3s;width:${Math.max(0, Math.min(100, f.progress))}%;`;
        progWrap.appendChild(progFill);
        info.appendChild(progWrap);
      }

      // Error
      if (f.error) {
        const errEl = document.createElement("div");
        errEl.textContent = f.error;
        errEl.style.cssText = "font-size:11px;color:#ef4444;margin-top:2px;";
        info.appendChild(errEl);
      }

      row.appendChild(info);

      // Remove button
      if (showRemove) {
        const rmBtn = document.createElement("button");
        rmBtn.type = "button";
        rmBtn.innerHTML = "&times;";
        rmBtn.style.cssText =
          "background:none;border:none;cursor:pointer;font-size:16px;color:#9ca3af;" +
          "padding:2px 6px;border-radius:4px;line-height:1;";
        rmBtn.addEventListener("mouseenter", () => { rmBtn.style.background = "#fee2e2"; rmBtn.style.color = "#ef4444"; });
        rmBtn.addEventListener("mouseleave", () => { rmBtn.style.background = ""; rmBtn.style.color = "#9ca3af"; });
        rmBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removeFile(f.id);
        });
        row.appendChild(rmBtn);
      }

      fileList.appendChild(row);
    }

    // Toggle visibility of content area based on whether we have files
    contentArea.style.display = _files.length > 0 ? "none" : "";
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  // --- Drag & Drop ---

  if (dragDrop && !disabled) {
    let dragCounter = 0;

    root.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      root.style.borderColor = "#3b82f6";
      root.style.background = "#eff6ff";
    });

    root.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    root.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        root.style.borderColor = "";
        root.style.background = "";
      }
    });

    root.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      root.style.borderColor = "";
      root.style.background = "";

      if (e.dataTransfer?.files) {
        processFiles(e.dataTransfer.files);
      }
    });
  }

  // --- Paste Support ---

  if (pasteEnabled && !disabled) {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files?.length) {
        processFiles(e.clipboardData.files);
      }
    };
    root.addEventListener("paste", handlePaste);
    // Also listen on window for global paste
    document.addEventListener("paste", handlePaste);
  }

  // --- Input Change ---

  input.addEventListener("change", () => {
    if (input.files?.length) processFiles(input.files);
    input.value = ""; // Reset so same file can be re-selected
  });

  // Click handler
  root.addEventListener("click", (e) => {
    if (e.target === input) return;
    if (onClick?.() === false) return;
    if (!disabled && clickable) input.click();
  });

  // --- Methods ---

  function open(): void { if (!disabled) input.click(); }

  function getFiles(): DropzoneFile[] { return [..._files]; }

  function removeFile(id: string): void {
    const idx = _files.findIndex((f) => f.id === id);
    if (idx < 0) return;

    const [removed] = _files.splice(idx, 1);
    if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    renderFileList();
    onFileRemove?.(removed);
  }

  function clear(): void {
    _files.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
    _files = [];
    renderFileList();
  }

  function setProgress(id: string, progress: number): void {
    const f = _files.find((f) => f.id === id);
    if (f) {
      f.progress = Math.max(0, Math.min(100, progress));
      renderFileList();
    }
  }

  function setError(id: string, error: string): void {
    const f = _files.find((f) => f.id === id);
    if (f) {
      f.error = error;
      renderFileList();
    }
  }

  function setDisabled(d: boolean): void {
    disabled = d;
    root.style.opacity = d ? "0.5" : "";
    root.style.cursor = d ? "not-allowed" : "pointer";
    root.style.pointerEvents = d ? "none" : "";
    input.style.pointerEvents = d ? "none" : "";
  }

  function destroy(): void {
    clear();
    root.remove();
  }

  return { el: root, inputEl: input, open, getFiles, removeFile, clear, setProgress, setError, setDisabled, destroy };
}
