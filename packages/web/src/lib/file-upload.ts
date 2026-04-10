/**
 * File Upload Component: Drag-and-drop zone, progress tracking, image preview,
 * file type validation, multiple files, size limits, retry on error, and accessibility.
 */

// --- Types ---

export interface FileUploadOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Accepted MIME types (e.g., "image/*,.pdf") or array of extensions */
  accept?: string | string[];
  /** Maximum file size in bytes (0 = unlimited) */
  maxFileSize?: number;
  /** Maximum number of files (0 = unlimited) */
  maxFiles?: number;
  /** Allow multiple files? */
  multiple?: boolean;
  /** Upload URL (for auto-upload mode) */
  uploadUrl?: string;
  /** Custom headers for upload request */
  headers?: Record<string, string>;
  /** Additional form data fields */
  formData?: Record<string, string>;
  /** Auto-upload on file selection? */
  autoUpload?: boolean;
  /** Show image previews for images */
  showPreview?: boolean;
  /** Show file size in UI */
  showFileSize?: boolean;
  /** Show progress bar during upload */
  showProgress?: true;
  /** Allow drag and drop? */
  dragDrop?: boolean;
  /** Custom text labels */
  labels?: {
    dropzone?: string;
    browse?: string;
    or?: string;
    maxSize?: string;
    acceptedTypes?: string;
    uploading?: string;
    success?: string;
    error?: string;
    remove?: string;
    retry?: string;
  };
  /** Callback when files are selected (before upload) */
  onSelect?: (files: UploadFile[]) => boolean | void;
  /** Callback when upload starts */
  onUploadStart?: (file: UploadFile) => void;
  /** Callback on upload progress */
  onProgress?: (file: UploadFile, percent: number) => void;
  /** Callback on successful upload */
  onSuccess?: (file: UploadFile, response: unknown) => void;
  /** Callback on upload error */
  onError?: (file: UploadFile, error: Error) => void;
  /** Callback when all uploads complete */
  onComplete?: (files: UploadFile[]) => void;
  /** Validate function per-file */
  validate?: (file: File) => string | null; // error message or null
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
}

export interface UploadFile {
  /** Original File object */
  file: File;
  /** Unique ID */
  id: string;
  /** Current status */
  status: "pending" | "uploading" | "success" | "error" | "aborted";
  /** Progress 0-100 */
  progress: number;
  /** Server response (on success) */
  response?: unknown;
  /** Error message (on error) */
  error?: string;
  /** Preview URL (data URL for images) */
  previewUrl?: string;
  /** XMLHttpRequest reference (during upload) */
  xhr?: XMLHttpRequest;
}

export interface FileUploadInstance {
  element: HTMLElement;
  getFiles: () => UploadFile[];
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  retryUpload: (id: string) => void;
  clearAll: () => void;
  uploadAll: () => Promise<void>;
  abortAll: () => void;
  destroy: () => void;
}

// --- Helpers ---

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const ACCEPT_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif",
  "image/webp": ".webp", "application/pdf": ".pdf",
  "text/plain": ".txt", "application/zip": ".zip",
};

// --- Main Class ---

export class FileUploadManager {
  create(options: FileUploadOptions): FileUploadInstance {
    const opts = {
      accept: options.accept ?? "*/*",
      maxFileSize: options.maxFileSize ?? 50 * 1024 * 1024, // 50MB
      maxFiles: options.maxFiles ?? 0,
      multiple: options.multiple ?? true,
      autoUpload: options.autoUpload ?? false,
      showPreview: options.showPreview ?? true,
      showFileSize: options.showFileSize ?? true,
      dragDrop: options.dragDrop ?? true,
      disabled: options.disabled ?? false,
      labels: {
        dropzone: "Drag & drop files here",
        browse: "Browse Files",
        or: "or",
        maxSize: "Max file size:",
        acceptedTypes: "Accepted types:",
        uploading: "Uploading...",
        success: "Uploaded",
        error: "Upload failed",
        remove: "Remove",
        retry: "Retry",
        ...options.labels,
      },
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("FileUpload: container element not found");

    container.className = `file-upload ${opts.className ?? ""}`;
    container.style.cssText = `
      border:2px dashed #d1d5db;border-radius:12px;padding:24px;text-align:center;
      transition:border-color 0.2s,background 0.2s;position:relative;
      ${opts.disabled ? "opacity:0.5;pointer-events:none;" : ""}
    `;

    // Dropzone content
    const dropzoneContent = document.createElement("div");
    dropzoneContent.className = "fu-dropzone-content";
    dropzoneContent.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:8px;";
    container.appendChild(dropzoneContent);

    // Icon
    const iconEl = document.createElement("div");
    iconEl.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    `;
    dropzoneContent.appendChild(iconEl);

    // Text
    const textEl = document.createElement("div");
    textEl.className = "fu-text";
    textEl.style.cssText = "font-size:14px;color:#6b7280;";
    textEl.innerHTML = `<strong>${opts.labels.dropzone}</strong>`;
    dropzoneContent.appendChild(textEl);

    // Browse button
    const browseLabel = document.createElement("label");
    browseLabel.className = "fu-browse-label";
    browseLabel.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;margin-top:8px;
      padding:8px 20px;background:#4338ca;color:#fff;border-radius:8px;
      font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;
    `;
    browseLabel.textContent = opts.labels.browse;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = opts.multiple;
    fileInput.accept = Array.isArray(opts.accept)
      ? opts.accept.join(",")
      : opts.accept !== "*/*"
        ? opts.accept
        : "";
    fileInput.style.display = "none";
    browseLabel.appendChild(fileInput);
    dropzoneContent.appendChild(browseLabel);

    // Info text
    const infoEl = document.createElement("div");
    infoEl.className = "fu-info";
    infoEl.style.cssText = "font-size:11px;color:#9ca3af;margin-top:8px;";
    let infoParts: string[] = [];
    if (opts.maxFileSize > 0) infoParts.push(`${opts.labels.maxSize} ${formatFileSize(opts.maxFileSize)}`);
    if (opts.accept && opts.accept !== "*/*") {
      infoParts.push(`${opts.labels.acceptedTypes} ${Array.isArray(opts.accept) ? opts.accept.join(", ") : opts.accept}`);
    }
    infoEl.textContent = infoParts.join(" \u2022 ");
    dropzoneContent.appendChild(infoEl);

    // File list
    const fileList = document.createElement("div");
    fileList.className = "fu-file-list";
    fileList.style.cssText = "margin-top:16px;display:flex;flex-direction:column;gap:8px;";
    container.appendChild(fileList);

    // State
    let files: UploadFile[] = [];

    // Drag & drop visual feedback
    if (opts.dragDrop && !opts.disabled) {
      container.addEventListener("dragenter", (e) => {
        e.preventDefault();
        container.style.borderColor = "#6366f1";
        container.style.background = "#eef2ff";
      });

      container.addEventListener("dragover", (e) => {
        e.preventDefault();
      });

      container.addEventListener("dragleave", (e) => {
        e.preventDefault();
        if (!container.contains(e.relatedTarget as Node)) {
          container.style.borderColor = "#d1d5db";
          container.style.background = "";
        }
      });

      container.addEventListener("drop", (e: DragEvent) => {
        e.preventDefault();
        container.style.borderColor = "#d1d5db";
        container.style.background = "";
        if (e.dataTransfer?.files.length) {
          instance.addFiles(e.dataTransfer.files);
        }
      });
    }

    // File input change
    fileInput.addEventListener("change", () => {
      if (fileInput.files?.length) {
        instance.addFiles(fileInput.files);
        fileInput.value = ""; // Reset so same file can be re-selected
      }
    });

    // Browse button hover
    browseLabel.addEventListener("mouseenter", () => {
      browseLabel.style.background = "#3730a3";
    });
    browseLabel.addEventListener("mouseleave", () => {
      browseLabel.style.background = "#4338ca";
    });

    function renderFileItem(uploadFile: UploadFile): HTMLDivElement {
      const item = document.createElement("div");
      item.dataset.id = uploadFile.id;
      item.style.cssText = `
        display:flex;align-items:center;gap:10px;padding:10px 14px;
        background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
        transition:border-color 0.15s;
      `;

      // Preview / icon
      const previewArea = document.createElement("div");
      previewArea.style.cssText = `width:36px;height:36px;border-radius:6px;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#f3f4f6;`;

      if (uploadFile.previewUrl) {
        const img = document.createElement("img");
        img.src = uploadFile.previewUrl;
        img.style.cssText = "width:100%;height:100%;object-fit:cover;";
        previewArea.appendChild(img);
      } else {
        const fileIcon = document.createElement("span");
        fileIcon.textContent = "\u1F4C4"; // generic file emoji
        fileIcon.style.fontSize = "18px";
        previewArea.appendChild(fileIcon);
      }
      item.appendChild(previewArea);

      // File info
      const fileInfo = document.createElement("div");
      fileInfo.style.cssText = "flex:1;min-width:0;text-align:left;";
      const fileName = document.createElement("div");
      fileName.style.cssText = "font-size:13px;font-weight:500;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      fileName.textContent = uploadFile.file.name;
      fileInfo.appendChild(fileName);

      if (opts.showFileSize) {
        const fileSize = document.createElement("div");
        fileSize.style.cssText = "font-size:11px;color:#9ca3af;";
        fileSize.textContent = formatFileSize(uploadFile.file.size);
        fileInfo.appendChild(fileSize);
      }

      // Status / progress
      const statusEl = document.createElement("div");
      statusEl.className = "fu-status";
      statusEl.style.cssText = "font-size:11px;margin-top:2px;";

      if (uploadFile.status === "uploading") {
        statusEl.textContent = opts.labels.uploading;
        statusEl.style.color = "#6366f1";

        // Progress bar
        const progressBar = document.createElement("div");
        progressBar.style.cssText = `
          height:4px;background:#e5e7eb;border-radius:2px;margin-top:4px;overflow:hidden;
        `;
        const progressFill = document.createElement("div");
        progressFill.style.cssText = `
          height:100%;width:${uploadFile.progress}%;background:#6366f1;
          border-radius:2px;transition:width 0.2s;
        `;
        progressBar.appendChild(progressFill);
        statusEl.appendChild(progressBar);
      } else if (uploadFile.status === "success") {
        statusEl.textContent = opts.labels.success;
        statusEl.style.color = "#16a34a";
      } else if (uploadFile.status === "error") {
        statusEl.textContent = uploadFile.error || opts.labels.error;
        statusEl.style.color = "#dc2626";
      }

      fileInfo.appendChild(statusEl);
      item.appendChild(fileInfo);

      // Actions
      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:6px;flex-shrink:0;";

      if (uploadFile.status === "error") {
        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.textContent = opts.labels.retry;
        retryBtn.style.cssText = "padding:3px 10px;font-size:11px;border-radius:4px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;cursor:pointer;";
        retryBtn.addEventListener("click", () => instance.retryUpload(uploadFile.id));
        actions.appendChild(retryBtn);
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.innerHTML = "&times;";
      removeBtn.title = opts.labels.remove;
      removeBtn.style.cssText = `
        width:22px;height:22px;border-radius:50%;background:none;border:none;
        font-size:14px;color:#9ca3af;cursor:pointer;display:flex;align-items:center;
        justify-content:center;transition:all 0.15s;
      `;
      removeBtn.addEventListener("click", () => instance.removeFile(uploadFile.id));
      removeBtn.addEventListener("mouseenter", () => { removeBtn.style.background = "#fee2e2"; removeBtn.style.color = "#dc2626"; });
      removeBtn.addEventListener("mouseleave", () => { removeBtn.style.background = ""; removeBtn.style.color = "#9ca3af"; });
      actions.appendChild(removeBtn);

      item.appendChild(actions);
      return item;
    }

    function renderFileList(): void {
      fileList.innerHTML = "";
      for (const f of files) {
        fileList.appendChild(renderFileItem(f));
      }

      // Hide dropzone content when files present
      dropzoneContent.style.display = files.length > 0 ? "none" : "flex";
    }

    function generatePreview(file: File): Promise<string | undefined> {
      if (!opts.showPreview || !file.type.startsWith("image/")) return Promise.resolve(undefined);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      });
    }

    async function processFiles(newFiles: FileList | File[]): Promise<void> {
      const fileArray = Array.from(newFiles);

      // Check max files
      if (opts.maxFiles > 0 && files.length + fileArray.length > opts.maxFiles) {
        fileArray.splice(opts.maxFiles - files.length);
      }

      for (const file of fileArray) {
        // Size check
        if (opts.maxFileSize > 0 && file.size > opts.maxFileSize) continue;

        // Type check
        if (opts.accept !== "*/*") {
          const accepts = Array.isArray(opts.accept) ? opts.accept : [opts.accept];
          const ext = "." + file.name.split(".").pop()?.toLowerCase();
          const typeMatch = accepts.some((a) =>
            file.type === a || a === ext ||
            (a.endsWith("/*") && file.type.startsWith(a.slice(0, -1)))
          );
          if (!typeMatch) continue;
        }

        // Custom validation
        if (opts.validate) {
          const err = opts.validate(file);
          if (err) {
            files.push({
              file, id: generateId(), status: "error", progress: 0,
              error: err,
            });
            renderFileList();
            continue;
          }
        }

        const previewUrl = await generatePreview(file);
        const uploadFile: UploadFile = {
          file, id: generateId(), status: "pending", progress: 0, previewUrl,
        };
        files.push(uploadFile);
      }

      renderFileList();

      // Call onSelect callback
      const result = opts.onSelect?.(files.filter((f) => f.status === "pending"));
      if (result === false) {
        // Cancelled
        files = files.filter((f) => f.status !== "pending");
        renderFileList();
        return;
      }

      // Auto-upload
      if (opts.autoUpload && opts.uploadUrl) {
        await instance.uploadAll();
      }
    }

    function doUpload(uploadFile: UploadFile): Promise<void> {
      if (!opts.uploadUrl) return Promise.reject(new Error("No upload URL configured"));

      return new Promise((resolve, reject) => {
        uploadFile.status = "uploading";
        uploadFile.progress = 0;
        renderFileList();
        opts.onUploadStart?.(uploadFile);

        const xhr = new XMLHttpRequest();
        uploadFile.xhr = xhr;

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            uploadFile.progress = Math.round((e.loaded / e.total) * 100);
            renderFileList();
            opts.onProgress?.(uploadFile, uploadFile.progress);
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            uploadFile.status = "success";
            uploadFile.progress = 100;
            try {
              uploadFile.response = JSON.parse(xhr.responseText);
            } catch {
              uploadFile.response = xhr.responseText;
            }
            opts.onSuccess?.(uploadFile, uploadFile.response);
            resolve();
          } else {
            uploadFile.status = "error";
            uploadFile.error = `HTTP ${xhr.status}: ${xhr.statusText}`;
            opts.onError?.(uploadFile, new Error(uploadFile.error!));
            reject(new Error(uploadFile.error));
          }
          renderFileList();
        });

        xhr.addEventListener("error", () => {
          uploadFile.status = "error";
          uploadFile.error = "Network error";
          opts.onError?.(uploadFile, new Error(uploadFile.error!));
          reject(new Error(uploadFile.error));
          renderFileList();
        });

        xhr.open("POST", opts.uploadUrl);

        // Headers
        if (opts.headers) {
          for (const [key, val] of Object.entries(opts.headers)) {
            xhr.setRequestHeader(key, val);
          }
        }

        const formData = new FormData();
        formData.append("file", uploadFile.file);
        if (opts.formData) {
          for (const [key, val] of Object.entries(opts.formData)) {
            formData.append(key, val);
          }
        }

        xhr.send(formData);
      });
    }

    const instance: FileUploadInstance = {
      element: container,

      getFiles() { return [...files]; },

      addFiles: processFiles,

      removeFile(id: string) {
        const idx = files.findIndex((f) => f.id === id);
        if (idx >= 0) {
          const removed = files.splice(idx, 1)[0]!;
          if (removed.xhr && removed.xhr.readyState !== 4) {
            removed.xhr.abort();
            removed.status = "aborted";
          }
          renderFileList();
        }
      },

      retryUpload(id: string) {
        const f = files.find((f) => f.id === id);
        if (f && opts.uploadUrl) {
          doUpload(f).catch(() => {});
        }
      },

      clearAll() {
        for (const f of files) {
          if (f.xhr && f.xhr.readyState !== 4) f.xhr.abort();
        }
        files = [];
        renderFileList();
      },

      async uploadAll(): Promise<void> {
        const pending = files.filter((f) => f.status === "pending");
        await Promise.allSettled(pending.map(doUpload));
        opts.onComplete?.(files);
      },

      abortAll() {
        for (const f of files) {
          if (f.xhr && f.xhr.readyState !== 4) {
            f.xhr.abort();
            f.status = "aborted";
          }
        }
        renderFileList();
      },

      destroy() {
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a file upload component */
export function createFileUpload(options: FileUploadOptions): FileUploadInstance {
  return new FileUploadManager().create(options);
}
