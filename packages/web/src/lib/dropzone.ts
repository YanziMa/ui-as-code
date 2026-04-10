/**
 * Dropzone / File Upload: Drag-and-drop file upload area with file validation,
 * preview (images), progress tracking, multiple file support, file type filtering,
 * size limits, paste from clipboard, keyboard accessibility, and custom UI.
 */

// --- Types ---

export type FileValidationError = "type" | "size" | "count" | "custom";

export interface FileValidationRule {
  /** Accepted MIME types (e.g., ["image/*", ".pdf"]) */
  accept?: string[];
  /** Max file size in bytes */
  maxSize?: number;
  /** Min file size in bytes */
  minSize?: number;
  /** Max number of files */
  maxFiles?: number;
  /** Custom validator */
  validate?: (file: File) => string | null;
}

export interface DropzoneFile {
  /** Original File object */
  file: File;
  /** Unique ID */
  id: string;
  /** Preview URL (for images) */
  previewUrl?: string;
  /** Upload progress (0-100) */
  progress: number;
  /** Error message if validation failed */
  error?: string;
  /** Upload status */
  status: "pending" | "uploading" | "success" | "error" | "removed";
}

export interface DropzoneOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Validation rules */
  validation?: FileValidationRule;
  /** Allow multiple files? */
  multiple?: boolean;
  /** Show image previews? */
  showPreview?: boolean;
  /** Show progress bar during upload simulation? */
  showProgress?: boolean;
  /** Accept attribute for file input */
  accept?: string;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Callback when files are added (after validation) */
  onFilesAdded?: (files: DropzoneFile[]) => void;
  /** Callback when a single file is removed */
  onFileRemove?: (file: DropzoneFile) => void;
  /** Simulate upload with progress callback */
  onUpload?: (file: DropzoneFile, onProgress: (pct: number) => void) => Promise<void>;
  /** Click to browse files? */
  clickable?: boolean;
  /** Enable drag and drop? */
  droppable?: boolean;
  /** Enable paste from clipboard? */
  pasteEnabled?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface DropzoneInstance {
  element: HTMLElement;
  getFiles: () => DropzoneFile[];
  addFiles: (files: File[] | FileList) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;
  openFileDialog: () => void;
  destroy: () => void;
}

// --- Helpers ---

let fileIdCounter = 0;

function generateFileId(): string {
  return `file-${++fileIdCounter}-${Date.now()}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageType(file: File): boolean {
  return file.type.startsWith("image/");
}

function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const patterns = accept.split(",").map((s) => s.trim());
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    if (pattern.endsWith("/*")) return file.type.startsWith(pattern.slice(0, -1));
    return file.type === pattern;
  });
}

// --- Main Class ---

export class DropzoneManager {
  create(options: DropzoneOptions): DropzoneInstance {
    const opts = {
      multiple: options.multiple ?? true,
      showPreview: options.showPreview ?? true,
      showProgress: options.showProgress ?? true,
      placeholder: options.placeholder ?? "Drop files here or click to upload",
      subtitle: options.subtitle ?? "",
      icon: options.icon ?? "\u{1F4BE}",
      disabled: options.disabled ?? false,
      clickable: options.clickable ?? true,
      droppable: options.droppable ?? true,
      pasteEnabled: options.pasteEnabled ?? true,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Dropzone: container element not found");

    let files: DropzoneFile[] = [];
    let destroyed = false;
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = opts.multiple;
    if (opts.accept) fileInput.accept = opts.accept;
    fileInput.style.display = "none";

    container.className = `dropzone ${opts.disabled ? "disabled" : ""} ${opts.className ?? ""}`;
    container.style.cssText = `
      border:2px dashed #d1d5db;border-radius:12px;padding:32px 24px;
      text-align:center;cursor:${opts.clickable && !opts.disabled ? "pointer" : "default"};
      transition:border-color 0.2s,background 0.2s;position:relative;
      background:#fafbfc;font-family:-apple-system,sans-serif;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // Drop zone area
    const dropArea = document.createElement("div");
    dropArea.className = "dropzone-area";
    dropArea.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:8px;";
    container.appendChild(dropArea);

    // Icon
    const iconEl = document.createElement("span");
    iconEl.textContent = opts.icon;
    iconEl.style.cssText = "font-size:36px;line-height:1;";
    dropArea.appendChild(iconEl);

    // Placeholder text
    const placeholderEl = document.createElement("div");
    placeholderEl.className = "dropzone-placeholder";
    placeholderEl.style.cssText = "font-size:14px;color:#374151;font-weight:500;";
    placeholderEl.textContent = opts.placeholder;
    dropArea.appendChild(placeholderEl);

    // Subtitle
    if (opts.subtitle) {
      const subEl = document.createElement("div");
      subEl.className = "dropzone-subtitle";
      subEl.style.cssText = "font-size:12px;color:#9ca3af;";
      subEl.textContent = opts.subtitle;
      dropArea.appendChild(subEl);
    }

    // Files list
    const fileList = document.createElement("div");
    fileList.className = "dropzone-file-list";
    fileList.style.cssText = "margin-top:16px;width:100%;display:none;flex-direction:column;gap:8px;";
    container.appendChild(fileList);

    // Hidden file input
    container.appendChild(fileInput);

    function render(): void {
      // Show/hide areas
      dropArea.style.display = files.length > 0 ? "none" : "flex";
      fileList.style.display = files.length > 0 ? "flex" : "none";

      // Render file items
      fileList.innerHTML = "";
      for (const f of files) {
        const item = createFileItem(f);
        fileList.appendChild(item);
      }
    }

    function createFileItem(f: DropzoneFile): HTMLElement {
      const item = document.createElement("div");
      item.dataset.id = f.id;
      item.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:10px 12px;
        background:#fff;border:1px solid #e5e7eb;border-radius:8px;
        ${f.status === "error" ? "border-color:#fecaca;" : ""}
      `;

      // Preview
      if (opts.showPreview && isImageType(f.file) && f.previewUrl) {
        const img = document.createElement("img");
        img.src = f.previewUrl;
        img.alt = f.file.name;
        img.style.cssText = "width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0;";
        item.appendChild(img);
      } else {
        const fileIcon = document.createElement("span");
        fileIcon.style.cssText = `
          width:40px;height:40px;border-radius:6px;background:#f3f4f6;
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
          font-size:16px;
        `;
        fileIcon.textContent = "\u{1F4C4}";
        item.appendChild(fileIcon);
      }

      // Info
      const info = document.createElement("div");
      info.style.cssText = "flex:1;min-width:0;";
      const nameEl = document.createElement("div");
      nameEl.style.cssText = "font-size:13px;font-weight:500;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      nameEl.textContent = f.file.name;
      info.appendChild(nameEl);

      const metaEl = document.createElement("div");
      metaEl.style.cssText = "font-size:11px;color:#9ca3af;margin-top:2px;";
      metaEl.textContent = formatFileSize(f.file.size);
      info.appendChild(metaEl);

      // Progress bar
      if (opts.showProgress && f.status === "uploading") {
        const progressWrap = document.createElement("div");
        progressWrap.style.cssText = "width:100%;height:4px;background:#e5e7eb;border-radius:2px;margin-top:4px;overflow:hidden;";
        const progressBar = document.createElement("div");
        progressBar.style.cssText = `height:100%;background:#4338ca;border-radius:2px;transition:width 0.2s;width:${f.progress}%;`;
        progressWrap.appendChild(progressBar);
        info.appendChild(progressWrap);
      }

      // Status / Error
      if (f.error) {
        const errEl = document.createElement("div");
        errEl.style.cssText = "font-size:11px;color:#dc2626;margin-top:2px;";
        errEl.textContent = f.error;
        info.appendChild(errEl);
      } else if (f.status === "success") {
        const okEl = document.createElement("div");
        okEl.style.cssText = "font-size:11px;color:#16a34a;margin-top:2px;";
        okEl.textContent = "Uploaded successfully";
        info.appendChild(okEl);
      }

      item.appendChild(info);

      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.innerHTML = "&times;";
      removeBtn.setAttribute("aria-label", "Remove file");
      removeBtn.style.cssText = `
        flex-shrink:0;background:none;border:none;font-size:16px;color:#9ca3af;
        cursor:pointer;padding:2px;border-radius:4px;transition:color 0.15s;
      `;
      removeBtn.addEventListener("click", () => instance.removeFile(f.id));
      removeBtn.addEventListener("mouseenter", () => { removeBtn.style.color = "#ef4444"; });
      removeBtn.addEventListener("mouseleave", () => { removeBtn.style.color = "#9ca3af"; });
      item.appendChild(removeBtn);

      return item;
    }

    function handleFiles(fileList_input: File[] | FileList): void {
      const incoming = Array.from(fileList_input);

      // Validate max files
      if (opts.validation?.maxFiles && files.length + incoming.length > opts.validation.maxFiles) {
        // Only take what we can
        incoming.splice(opts.validation.maxFiles - files.length);
      }

      const newFiles: DropzoneFile[] = [];

      for (const file of incoming) {
        // Validate accept
        if (opts.accept && !matchesAccept(file, opts.accept)) continue;
        if (opts.validation?.accept && !matchesAccept(file, opts.validation.accept.join(","))) continue;

        // Validate size
        if (opts.validation?.maxSize && file.size > opts.validation.maxSize) continue;
        if (opts.validation?.minSize && file.size < opts.validation.minSize) continue;

        // Custom validator
        let error: string | undefined;
        if (opts.validation?.validate) {
          error = opts.validation.validate(file) ?? undefined;
        }

        const df: DropzoneFile = {
          id: generateFileId(),
          file,
          progress: 0,
          status: error ? "error" : "pending",
          error,
        };

        // Generate preview for images
        if (isImageType(file)) {
          df.previewUrl = URL.createObjectURL(file);
        }

        newFiles.push(df);
      }

      if (newFiles.length === 0) return;

      files.push(...newFiles);
      render();
      opts.onFilesAdded?.(newFiles);

      // Auto-upload if handler provided
      if (opts.onUpload) {
        for (const df of newFiles) {
          if (df.status !== "error") {
            df.status = "uploading";
            render();
            opts.onUpload(df, (pct) => {
              df.progress = pct;
              render();
            }).then(() => {
              df.status = "success";
              df.progress = 100;
              render();
            }).catch((err) => {
              df.status = "error";
              df.error = String(err);
              render();
            });
          }
        }
      }
    }

    // Drag & Drop handlers
    if (opts.droppable && !opts.disabled) {
      container.addEventListener("dragenter", (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.style.borderColor = "#4338ca";
        container.style.background = "#eef2ff";
      });

      container.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.style.borderColor = "#4338ca";
        container.style.background = "#eef2ff";
      });

      container.addEventListener("dragleave", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!container.contains(e.relatedTarget as Node)) {
          container.style.borderColor = "#d1d5db";
          container.style.background = "#fafbfc";
        }
      });

      container.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.style.borderColor = "#d1d5db";
        container.style.background = "#fafbfc";
        if (e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files);
        }
      });
    }

    // Click to open file dialog
    if (opts.clickable && !opts.disabled) {
      dropArea.addEventListener("click", () => fileInput.click());
      container.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !opts.disabled) {
          e.preventDefault();
          fileInput.click();
        }
      });
      container.tabIndex = 0;
    }

    // File input change
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files.length > 0) {
        handleFiles(fileInput.files);
        fileInput.value = "";
      }
    });

    // Paste from clipboard
    if (opts.pasteEnabled && !opts.disabled) {
      container.addEventListener("paste", (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const pastedFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i]!.kind === "file") {
            pastedFiles.push(items[i]!.getAsFile()!);
          }
        }
        if (pastedFiles.length > 0) {
          e.preventDefault();
          handleFiles(pastedFiles);
        }
      });
    }

    // Initial render
    render();

    const instance: DropzoneInstance = {
      element: container,

      getFiles() { return [...files]; },

      addFiles(newFiles: File[] | FileList) { handleFiles(newFiles); },

      removeFile(id: string) {
        const idx = files.findIndex((f) => f.id === id);
        if (idx >= 0) {
          const removed = files.splice(idx, 1)[0]!;
          if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
          render();
          opts.onFileRemove?.(removed);
        }
      },

      clearAll() {
        for (const f of files) {
          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        }
        files = [];
        render();
      },

      openFileDialog() { fileInput.click(); },

      destroy() {
        destroyed = true;
        clearAll();
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a dropzone */
export function createDropzone(options: DropzoneOptions): DropzoneInstance {
  return new DropzoneManager().create(options);
}
