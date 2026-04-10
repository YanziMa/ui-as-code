/**
 * Upload Zone: Drag-and-drop file upload area with click-to-browse, file validation
 * (type/size/count), thumbnail preview for images, progress tracking, paste support,
 * and accessible drop zone semantics.
 */

// --- Types ---

export interface FileValidationRule {
  /** Accepted MIME types (e.g., ["image/*", "application/pdf"]) */
  accept?: string[];
  /** Max file size in bytes (0 = no limit) */
  maxSize?: number;
  /** Min file size in bytes */
  minSize?: number;
  /** Max file count */
  maxFiles?: number;
  /** Allowed extensions (e.g., [".jpg", ".png"]) */
  extensions?: string[];
  /** Reject files matching these name patterns (regex strings) */
  rejectPatterns?: string[];
}

export interface UploadedFile {
  /** Original File object */
  file: File;
  /** Unique ID */
  id: string;
  /** Preview URL (for images) */
  previewUrl?: string;
  /** Validation error message if invalid */
  error?: string;
  /** Upload progress 0-1 */
  progress: number;
  /** Upload status */
  status: "pending" | "uploading" | "success" | "error" | "aborted";
}

export interface UploadZoneOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Validation rules */
  validation?: FileValidationRule;
  /** Multiple files? (default: true) */
  multiple?: boolean;
  /** Show image previews? */
  showPreviews?: boolean;
  /** Show progress bars? */
  showProgress?: boolean;
  /** Show file list? */
  showFileList?: boolean;
  /** Custom label text */
  label?: string;
  /** Sub-label / hint text */
  hint?: string;
  /** Zone height (CSS value) */
  height?: string;
  /** Callback when files are selected (after validation) */
  onFilesSelected?: (files: UploadedFile[]) => void;
  /** Callback to trigger actual upload (returns abort controller) */
  onUpload?: (file: UploadedFile) => AbortController | void;
  /** Callback on upload complete (per file) */
  onUploadComplete?: (file: UploadedFile) => void;
  /** Callback on upload error */
  onUploadError?: (file: UploadedFile, error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface UploadZoneInstance {
  element: HTMLElement;
  getFiles: () => UploadedFile[];
  clearFiles: () => void;
  removeFile: (id: string) => void;
  openFileDialog: () => void;
  setDisabled: (disabled: boolean) => void;
  destroy: () => void;
}

// --- Helpers ---

function generateId(): string {
  return `uf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file: File): boolean {
  return file.type.startsWith("image/");
}

function validateFile(file: File, rules: FileValidationRule): string | null {
  if (rules.maxSize && file.size > rules.maxSize) {
    return `File too large (${formatFileSize(file.size)} exceeds ${formatFileSize(rules.maxSize)})`;
  }
  if (rules.minSize && file.size < rules.minSize) {
    return `File too small (minimum ${formatFileSize(rules.minSize)})`;
  }
  if (rules.extensions && rules.extensions.length > 0) {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!rules.extensions.includes(ext)) {
      return `File type not allowed (.${file.name.split(".").pop()} not in ${rules.extensions.join(", ")})`;
    }
  }
  if (rules.accept && rules.accept.length > 0) {
    const accepted = rules.accept.some((t) => {
      if (t.endsWith("/*")) return file.type.startsWith(t.slice(0, -1));
      return file.type === t;
    });
    if (!accepted) return `MIME type ${file.type} not allowed`;
  }
  if (rules.rejectPatterns) {
    for (const pattern of rules.rejectPatterns) {
      try {
        if (new RegExp(pattern).test(file.name)) return `Filename rejected by rule`;
      } catch { /* ignore bad regex */ }
    }
  }
  return null;
}

// --- Main Class ---

export class UploadZoneManager {
  create(options: UploadZoneOptions): UploadZoneInstance {
    const opts = {
      multiple: options.multiple ?? true,
      showPreviews: options.showPreviews ?? true,
      showProgress: options.showProgress ?? true,
      showFileList: options.showFileList ?? true,
      label: options.label ?? "Drop files here or click to browse",
      hint: options.hint ?? "",
      height: options.height ?? "200px",
      validation: options.validation ?? {},
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("UploadZone: container not found");

    container.className = `upload-zone ${opts.className ?? ""}`;
    let files: UploadedFile[] = [];
    let disabled = false;
    let destroyed = false;

    // Hidden file input
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = opts.multiple;
    input.style.cssText = "display:none;";
    if (opts.validation.accept?.length) {
      input.accept = opts.validation.accept.join(",");
    }

    function render(): void {
      container.innerHTML = "";

      // Drop zone
      const zone = document.createElement("div");
      zone.className = "upload-zone-area";
      zone.style.cssText = `
        border:2px dashed #d1d5db;border-radius:12px;padding:32px;text-align:center;
        cursor:${disabled ? "not-allowed" : "pointer"};transition:all 0.2s ease;
        background:#fafafa;height:${opts.height};display:flex;flex-direction:column;
        align-items:center;justify-content:center;gap:12px;position:relative;
        ${disabled ? "opacity:0.5;" : ""}
      `;

      // Icon
      const icon = document.createElement("div");
      icon.innerHTML = "&#128194;"; // 📔
      icon.style.cssText = "font-size:40px;opacity:0.6;";
      zone.appendChild(icon);

      // Label
      const labelEl = document.createElement("div");
      labelEl.style.cssText = "font-size:15px;font-weight:500;color:#374151;";
      labelEl.textContent = opts.label;
      zone.appendChild(labelEl);

      // Hint
      if (opts.hint) {
        const hintEl = document.createElement("div");
        hintEl.style.cssText = "font-size:12px;color:#9ca3af;";
        hintEl.textContent = opts.hint;
        zone.appendChild(hintEl);
      }

      // Drag state visual feedback
      let dragCounter = 0;

      zone.addEventListener("dragenter", (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        zone.style.borderColor = "#4338ca";
        zone.style.background = "#eef2ff";
      });

      zone.addEventListener("dragleave", (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter <= 0) {
          zone.style.borderColor = "";
          zone.style.background = "";
          dragCounter = 0;
        }
      });

      zone.addEventListener("dragover", (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
      });

      zone.addEventListener("drop", (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        zone.style.borderColor = "";
        zone.style.background = "";

        if (disabled || !e.dataTransfer?.files.length) return;
        handleFiles(Array.from(e.dataTransfer.files));
      });

      // Click to browse
      zone.addEventListener("click", () => {
        if (!disabled) input.click();
      });

      // Keyboard accessibility
      zone.tabIndex = disabled ? -1 : 0;
      zone.setAttribute("role", "button");
      zone.setAttribute("aria-label", opts.label);
      zone.addEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!disabled) input.click();
        }
      });

      container.appendChild(zone);
      container.appendChild(input);

      // Input change handler
      input.addEventListener("change", () => {
        if (input.files?.length) handleFiles(Array.from(input.files));
        input.value = ""; // Reset so same file can be re-selected
      });

      // Paste support
      const pasteHandler = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const fileItems: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i]?.kind === "file") {
            const f = items[i].getAsFile();
            if (f) fileItems.push(f);
          }
        }
        if (fileItems.length > 0) handleFiles(fileItems);
      };
      document.addEventListener("paste", pasteHandler);

      // Store cleanup ref
      (container as any)._pasteHandler = pasteHandler;

      // File list
      if (opts.showFileList && files.length > 0) {
        renderFileList(container);
      }
    }

    function handleFiles(newFiles: File[]): void {
      // Apply max files limit
      const remainingSlots = opts.validation.maxFiles ? opts.validation.maxFiles - files.length : Infinity;
      if (remainingSlots <= 0) return;

      const toProcess = newFiles.slice(0, Math.min(newFiles.length, remainingSlots));
      const uploaded: UploadedFile[] = [];

      for (const file of toProcess) {
        const error = validateFile(file, opts.validation);
        const uf: UploadedFile = {
          id: generateId(),
          file,
          previewUrl: undefined,
          error: error ?? undefined,
          progress: 0,
          status: error ? "error" : "pending",
        };

        // Generate preview for images
        if (!error && isImage(file) && opts.showPreviews) {
          uf.previewUrl = URL.createObjectURL(file);
        }

        uploaded.push(uf);
      }

      files = [...files, ...uploaded];
      render();

      const validFiles = uploaded.filter((f) => !f.error);
      if (validFiles.length > 0) {
        opts.onFilesSelected?.(validFiles);

        // Auto-upload if callback provided
        if (opts.onUpload) {
          for (const uf of validFiles) {
            startUpload(uf);
          }
        }
      }
    }

    function startUpload(uf: UploadedFile): void {
      if (!opts.onUpload) return;
      uf.status = "uploading";
      render();

      const controller = opts.onUpload(uf);

      if (controller) {
        controller.signal.addEventListener("abort", () => {
          uf.status = "aborted";
          render();
        });
      }

      // Simulate progress if no external progress updates
      // (real implementation would get progress from the upload callback)
    }

    function renderFileList(parent: HTMLElement): void {
      const list = document.createElement("div");
      list.className = "upload-file-list";
      list.style.cssText = "margin-top:12px;display:flex;flex-direction:column;gap:8px;";

      for (const uf of files) {
        const item = document.createElement("div");
        item.dataset.id = uf.id;
        item.style.cssText = `
          display:flex;align-items:center;gap:10px;padding:8px 12px;
          border:1px solid ${uf.error ? "#fecaca" : uf.status === "success" ? "#bbf7d0" : "#e5e7eb"};
          border-radius:8px;background:${uf.error ? "#fef2f2" : "#fff"};
        `;

        // Preview or file icon
        if (uf.previewUrl) {
          const thumb = document.createElement("img");
          thumb.src = uf.previewUrl;
          thumb.alt = uf.file.name;
          thumb.style.cssText = "width:40px;height:40px;border-radius:6px;object-fit:cover;";
          item.appendChild(thumb);
        } else {
          const fileIcon = document.createElement("span");
          fileIcon.textContent = isImage(uf.file) ? "\u{1F5BC}\uFE0F" : "\u{1F4C4}";
          fileIcon.style.cssText = "font-size:24px;width:40px;text-align:center;";
          item.appendChild(fileIcon);
        }

        // Info
        const info = document.createElement("div");
        info.style.cssText = "flex:1;min-width:0;";

        const nameEl = document.createElement("div");
        nameEl.style.cssText = "font-size:13px;font-weight:500;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:250px;";
        nameEl.textContent = uf.file.name;
        info.appendChild(nameEl);

        const metaRow = document.createElement("div");
        metaRow.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:2px;";

        const sizeEl = document.createElement("span");
        sizeEl.style.cssText = "font-size:11px;color:#9ca3af;";
        sizeEl.textContent = formatFileSize(uf.file.size);
        metaRow.appendChild(sizeEl);

        // Progress bar
        if (uf.status === "uploading" && opts.showProgress) {
          const progBar = document.createElement("div");
          progBar.style.cssText = "flex:1;height:4px;background:#e5e7eb;border-radius:2px;overflow:hidden;max-width:100px;";
          const progFill = document.createElement("div");
          progFill.style.cssText = `height:100%;background:#4338ca;border-radius:2px;transition:width 0.2s;width:${uf.progress * 100}%;`;
          progBar.appendChild(progFill);
          metaRow.appendChild(progBar);

          const pctEl = document.createElement("span");
          pctEl.style.cssText = "font-size:11px;color:#4338ca;font-weight:500;";
          pctEl.textContent = `${Math.round(uf.progress * 100)}%`;
          metaRow.appendChild(pctEl);
        }

        // Status text
        if (uf.error) {
          const errEl = document.createElement("span");
          errEl.style.cssText = "font-size:11px;color:#ef4444;";
          errEl.textContent = uf.error;
          metaRow.appendChild(errEl);
        } else if (uf.status === "success") {
          const okEl = document.createElement("span");
          okEl.style.cssText = "font-size:11px;color:#22c55e;";
          okEl.textContent = "\u2705 Done";
          metaRow.appendChild(okEl);
        } else if (uf.status === "aborted") {
          const abEl = document.createElement("span");
          abEl.style.cssText = "font-size:11px;color:#f59e0b;";
          abEl.textContent = "Cancelled";
          metaRow.appendChild(abEl);
        }

        info.appendChild(metaRow);
        item.appendChild(info);

        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.innerHTML = "&times;";
        removeBtn.title = "Remove";
        removeBtn.style.cssText = `
          background:none;border:none;font-size:16px;color:#9ca3af;cursor:pointer;
          padding:2px 4px;border-radius:4px;flex-shrink:0;
        `;
        removeBtn.addEventListener("click", () => instance.removeFile(uf.id));
        removeBtn.addEventListener("mouseenter", () => { removeBtn.style.color = "#ef4444"; });
        removeBtn.addEventListener("mouseleave", () => { removeBtn.style.color = "#9ca3af"; });
        item.appendChild(removeBtn);

        list.appendChild(item);
      }

      parent.appendChild(list);
    }

    // Initial render
    render();

    const instance: UploadZoneInstance = {
      element: container,

      getFiles() { return [...files]; },

      clearFiles() {
        // Revoke object URLs
        for (const f of files) {
          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        }
        files = [];
        render();
      },

      removeFile(id: string) {
        const idx = files.findIndex((f) => f.id === id);
        if (idx >= 0) {
          const removed = files.splice(idx, 1)[0];
          if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
          render();
        }
      },

      openFileDialog() {
        if (!disabled) input.click();
      },

      setDisabled(d: boolean) {
        disabled = d;
        render();
      },

      destroy() {
        destroyed = true;
        instance.clearFiles();
        const ph = (container as any)._pasteHandler;
        if (ph) document.removeEventListener("paste", ph);
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create an upload zone */
export function createUploadZone(options: UploadZoneOptions): UploadZoneInstance {
  return new UploadZoneManager().create(options);
}
