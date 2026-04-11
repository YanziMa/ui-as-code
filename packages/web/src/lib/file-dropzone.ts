/**
 * File Drop Zone: Drag-and-drop file upload area with visual feedback,
 * file type validation, size limits, thumbnail preview, progress tracking,
 * multiple file support, paste from clipboard, and accessibility.
 */

// --- Types ---

export type DropZoneState = "idle" | "drag-over" | "uploading" | "success" | "error";
export type DropZoneVariant = "default" | "compact" | "card";

export interface FileValidationRule {
  /** Accepted MIME types (e.g., ["image/*", "application/pdf"]) */
  accept?: string[];
  /** Max file size in bytes */
  maxSize?: number;
  /** Min file size in bytes */
  minSize?: number;
  /** Max file count */
  maxFiles?: number;
  /** Custom validator function — return error message or null */
  customValidator?: (file: File) => string | null;
}

export interface DropZoneOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Accept attribute string (e.g., "image/*,.pdf") */
  accept?: string;
  /** Multiple files allowed? */
  multiple?: boolean;
  /** Max file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Max number of files */
  maxFiles?: number;
  /** Visual variant */
  variant?: DropZoneVariant;
  /** Label text shown in drop zone */
  label?: string;
  /** Sub-label / hint text */
  hint?: string;
  /** Custom icon (emoji, SVG string, or HTML element) */
  icon?: string | HTMLElement;
  /** Show file previews for images? */
  showPreview?: boolean;
  /** Show file list? */
  showFileList?: boolean;
  /** Callback when files are accepted */
  onDrop?: (files: File[]) => void;
  /** Callback on each file error */
  onFileError?: (file: File, error: string) => void;
  /** Callback on drag state change */
  onDragStateChange?: (state: DropZoneState) => void;
  /** Callback when files are added/removed */
  onChange?: (files: File[]) => void;
  /** Allow click to browse files? */
  clickable?: boolean;
  /** Allow paste from clipboard? */
  allowPaste?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface DropZoneInstance {
  element: HTMLElement;
  /** Get current accepted files */
  getFiles: () => File[];
  /** Clear all files */
  clear: () => void;
  /** Remove a specific file */
  removeFile: (index: number) => void;
  /** Open the native file picker dialog */
  openPicker: () => void;
  /** Set disabled state */
  setDisabled: (disabled: boolean) => void;
  /** Get current drag state */
  getState: () => DropZoneState;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default Icon ---

const DEFAULT_ICON = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

// --- Helpers ---

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function isAcceptedType(file: File, accept: string): boolean {
  if (!accept) return true;
  const types = accept.split(",").map((t) => t.trim().toLowerCase());
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  for (const t of types) {
    if (t.startsWith(".") && fileName.endsWith(t)) return true;
    if (t.endsWith("/*") && fileType.startsWith(t.slice(0, -1))) return true;
    if (t === fileType) return true;
    if (t === "*") return true;
  }
  return false;
}

// --- Main Factory ---

export function createDropZone(options: DropZoneOptions): DropZoneInstance {
  const opts = {
    accept: options.accept ?? "",
    multiple: options.multiple ?? true,
    maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024,
    maxFiles: options.maxFiles ?? 0,
    variant: options.variant ?? "default",
    label: options.label ?? "Drop files here or click to upload",
    hint: options.hint ?? "",
    icon: options.icon,
    showPreview: options.showPreview ?? true,
    showFileList: options.showFileList ?? true,
    clickable: options.clickable ?? true,
    allowPaste: options.allowPaste ?? false,
    disabled: options.disabled ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DropZone: container not found");

  container.className = `drop-zone dz-${opts.variant} ${opts.className}`;

  let state: DropZoneState = "idle";
  let files: File[] = [];
  let destroyed = false;

  // Hidden file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = opts.multiple;
  if (opts.accept) fileInput.accept = opts.accept;
  fileInput.style.cssText = "display:none;";
  container.appendChild(fileInput);

  // Build UI
  function build(): void {
    container.innerHTML = "";
    // Re-add hidden input
    container.appendChild(fileInput);

    const isCompact = opts.variant === "compact";

    container.style.cssText = `
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      border:2px dashed ${state === "drag-over" ? "#6366f1" : "#d1d5db"};
      border-radius:12px;padding:${isCompact ? "16px 20px" : "32px 24px"};
      background:${state === "drag-over" ? "#eef2ff" : "#fafbfc"};
      cursor:${opts.disabled ? "not-allowed" : opts.clickable ? "pointer" : "default"};
      transition:all 0.2s ease;text-align:center;
      min-height:${isCompact ? "80px" : "160px"};
      position:relative;font-family:-apple-system,sans-serif;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // If we have files and showing file list
    if (files.length > 0 && opts.showFileList && opts.variant !== "compact") {
      renderFileList();
      return;
    }

    // Icon
    const iconWrap = document.createElement("div");
    iconWrap.className = "dz-icon";
    iconWrap.style.cssText = `
      color:${state === "drag-over" ? "#6366f1" : "#9ca3af"};
      margin-bottom:12px;transition:color 0.2s;
    `;
    if (typeof opts.icon === "string") {
      iconWrap.innerHTML = opts.icon;
    } else if (opts.icon instanceof HTMLElement) {
      iconWrap.appendChild(opts.icon);
    } else {
      iconWrap.innerHTML = DEFAULT_ICON;
    }
    if (!isCompact) container.appendChild(iconWrap);

    // Label
    const labelEl = document.createElement("div");
    labelEl.className = "dz-label";
    labelEl.textContent = opts.label;
    labelEl.style.cssText = `
      font-size:${isCompact ? "13px" : "14px"};font-weight:500;color:#374151;
      margin-bottom:4px;
    `;
    container.appendChild(labelEl);

    // Hint
    if (opts.hint) {
      const hintEl = document.createElement("div");
      hintEl.className = "dz-hint";
      hintEl.textContent = opts.hint;
      hintEl.style.cssText = "font-size:12px;color:#9ca3af;margin-top:2px;";
      container.appendChild(hintEl);
    }

    // Accept info
    if (opts.accept) {
      const acceptEl = document.createElement("div");
      acceptEl.className = "dz-accept-info";
      acceptEl.textContent = `Accepted: ${opts.accept}`;
      acceptEl.style.cssText = "font-size:11px;color:#b0b4ba;margin-top:6px;";
      container.appendChild(acceptEl);
    }
  }

  function renderFileList(): void {
    container.innerHTML = "";
    container.appendChild(fileInput);

    container.style.cssText += "padding:16px;align-items:stretch;min-height:auto;";

    const list = document.createElement("div");
    list.className = "dz-file-list";
    list.style.cssText = "width:100%;display:flex;flex-direction:column;gap:8px;";

    files.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "dz-file-item";
      item.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:8px 12px;
        background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
        transition:background 0.15s;
      `;

      // Preview (for images)
      if (opts.showPreview && file.type.startsWith("image/")) {
        const thumb = document.createElement("img");
        thumb.className = "dz-thumb";
        thumb.src = URL.createObjectURL(file);
        thumb.alt = file.name;
        thumb.style.cssText = "width:36px;height:36px;border-radius:6px;object-fit:cover;flex-shrink:0;";
        item.appendChild(thumb);
      } else {
        const fileIcon = document.createElement("div");
        fileIcon.style.cssText = `
          width:36px;height:36px;border-radius:6px;background:#eef2ff;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          font-size:14px;color:#4338ca;font-weight:600;
        `;
        fileIcon.textContent = file.name.split(".").pop()?.slice(0, 3).toUpperCase() ?? "FILE";
        item.appendChild(fileIcon);
      }

      // File info
      const fileInfo = document.createElement("div");
      fileInfo.style.cssText = "flex:1;min-width:0;";
      const nameEl = document.createElement("div");
      nameEl.textContent = file.name;
      nameEl.style.cssText = "font-size:13px;font-weight:500;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      const sizeEl = document.createElement("div");
      sizeEl.textContent = formatFileSize(file.size);
      sizeEl.style.cssText = "font-size:11px;color:#9ca3af;";
      fileInfo.append(nameEl, sizeEl);
      item.appendChild(fileInfo);

      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.innerHTML = "&times;";
      removeBtn.title = "Remove file";
      removeBtn.style.cssText = `
        background:none;border:none;font-size:16px;cursor:pointer;
        color:#9ca3af;padding:2px 6px;border-radius:4px;flex-shrink:0;
        transition:all 0.15s;
      `;
      removeBtn.addEventListener("click", () => instance.removeFile(index));
      removeBtn.addEventListener("mouseenter", () => { removeBtn.style.color = "#ef4444"; removeBtn.style.background = "#fef2f2"; });
      removeBtn.addEventListener("mouseleave", () => { removeBtn.style.color = "#9ca3af"; removeBtn.style.background = ""; });
      item.appendChild(removeBtn);

      list.appendChild(item);
    });

    container.appendChild(list);

    // Add more area
    const addMore = document.createElement("button");
    addMore.type = "button";
    addMore.textContent = "+ Add more files";
    addMore.style.cssText = `
      margin-top:8px;padding:6px 16px;border-radius:6px;font-size:13px;
      background:none;color:#6366f1;border:1px dashed #c7d2fe;cursor:pointer;
      transition:all 0.15s;width:100%;
    `;
    addMore.addEventListener("click", () => instance.openPicker());
    addMore.addEventListener("mouseenter", () => { addMore.style.background = "#eef2ff"; });
    addMore.addEventListener("mouseleave", () => { addMore.style.background = ""; });
    container.appendChild(addMore);
  }

  function setState(newState: DropZoneState): void {
    state = newState;
    opts.onDragStateChange?.(state);
    build();
  }

  function validateAndAdd(newFiles: FileList | File[]): File[] {
    const accepted: File[] = [];
    const arr = Array.from(newFiles);

    // Check max files
    if (opts.maxFiles > 0 && files.length + arr.length > opts.maxFiles) {
      opts.onFileError?.(arr[0]!, `Maximum ${opts.maxFiles} files allowed`);
      return accepted;
    }

    for (const file of arr) {
      // Type check
      if (opts.accept && !isAcceptedType(file, opts.accept)) {
        opts.onFileError?.(file, `File type not accepted: ${file.name}`);
        continue;
      }

      // Size check
      if (file.size > opts.maxFileSize) {
        opts.onFileError?.(file, `File too large (${formatFileSize(file.size)} > ${formatFileSize(opts.maxFileSize)})`);
        continue;
      }

      // Single mode: replace
      if (!opts.multiple) {
        files = [];
      }

      files.push(file);
      accepted.push(file);
    }

    if (accepted.length > 0) {
      opts.onChange?.(files);
      build();
    }

    return accepted;
  }

  // --- Event Handlers ---

  // Drag & drop
  container.addEventListener("dragenter", (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (opts.disabled || destroyed) return;
    setState("drag-over");
  });

  container.addEventListener("dragover", (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (opts.disabled || destroyed) return;
    // Already handled by dragenter, but keep preventDefault for drop to work
  });

  container.addEventListener("dragleave", (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset if leaving the container itself
    if (container.contains(e.relatedTarget as Node)) return;
    if (!destroyed) setState("idle");
  });

  container.addEventListener("drop", (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (opts.disabled || destroyed) return;
    setState("idle");
    if (e.dataTransfer?.files.length) {
      const accepted = validateAndAdd(e.dataTransfer.files);
      if (accepted.length > 0) opts.onDrop?.(accepted);
    }
  });

  // Click to open file picker
  if (opts.clickable) {
    container.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("button")) return; // Don't trigger on buttons
      instance.openPicker();
    });
  }

  // File input change
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      const accepted = validateAndAdd(fileInput.files);
      if (accepted.length > 0) opts.onDrop?.(accepted);
      fileInput.value = ""; // Reset so same file can be selected again
    }
  });

  // Paste support
  if (opts.allowPaste) {
    container.addEventListener("paste", (e: ClipboardEvent) => {
      if (opts.disabled || destroyed) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item?.kind === "file") {
          const f = item.getAsFile();
          if (f) pastedFiles.push(f);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        const accepted = validateAndAdd(pastedFiles);
        if (accepted.length > 0) opts.onDrop?.(accepted);
      }
    });
  }

  // Prevent default drag behavior on window
  const globalDragHandler = (e: DragEvent) => {
    e.preventDefault();
  };
  window.addEventListener("dragover", globalDragHandler);
  window.addEventListener("drop", globalDragHandler);

  // Initial render
  build();

  const instance: DropZoneInstance = {
    element: container,

    getFiles() { return [...files]; },

    clear() {
      files = [];
      opts.onChange?.(files);
      build();
    },

    removeFile(index: number) {
      if (index >= 0 && index < files.length) {
        files.splice(index, 1);
        opts.onChange?.(files);
        build();
      }
    },

    openPicker() {
      if (!opts.disabled && !destroyed) fileInput.click();
    },

    setDisabled(disabled: boolean) {
      opts.disabled = disabled;
      build();
    },

    getState() { return state; },

    destroy() {
      destroyed = true;
      window.removeEventListener("dragover", globalDragHandler);
      window.removeEventListener("drop", globalDragHandler);
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
