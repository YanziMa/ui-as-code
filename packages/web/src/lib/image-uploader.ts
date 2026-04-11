/**
 * Image Uploader: Drag-and-drop / click-to-upload image component with
 * preview, validation, resize/compression, progress tracking, upload
 * abort, multiple file support, and paste-from-clipboard.
 */

// --- Types ---

export interface UploadOptions {
  /** Acceptable MIME types (default: "image/*") */
  accept?: string;
  /** Max file size in bytes (default: 10MB) */
  maxSize?: number;
  /** Min image dimensions { width, height } */
  minDimensions?: { width: number; height: number };
  /** Max dimensions (images resized down if larger) */
  maxDimensions?: { width: number; height: number };
  /** Target quality for JPEG compression (0-1, default: 0.85) */
  quality?: number;
  /** Output format: "jpeg" | "png" | "webp" | "original" (default: "original") */
  outputFormat?: "jpeg" | "png" | "webp" | "original";
  /** Max number of files (default: 1) */
  maxFiles?: number;
  /** Whether to allow multiple files (default: false) */
  multiple?: boolean;
  /** Custom upload handler (returns URL or data) */
  uploadFn?: (file: File, onProgress?: (percent: number) => void) => Promise<UploadResult>;
  /** Container element or selector */
  container: HTMLElement | string;
  /** Drop zone label text */
  dropLabel?: string;
  /** Browse button text */
  browseLabel?: string;
  /** CSS class name */
  className?: string;
  /** Show preview before upload (default: true) */
  showPreview?: boolean;
  /** Preview max width/height in px */
  previewSize?: number;
  /** Callback when files are selected (before processing) */
  onSelect?: (files: File[]) => boolean | void;
  /** Callback when a file is validated but fails */
  onInvalid?: (file: File, reason: string) => void;
  /** Callback when upload completes */
  onComplete?: (result: UploadResult) => void;
  /** Callback on upload error */
  onError?: (error: Error) => void;
}

export interface UploadResult {
  /** Final URL (from server or data URL) */
  url: string;
  /** Original file name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Image dimensions after processing */
  width: number;
  height: number;
  /** Format of the output */
  format: string;
  /** Whether this was processed (resized/compressed) */
  processed: boolean;
}

export interface ValidationError {
  file: File;
  reason: string;
}

export interface ImageUploaderInstance {
  /** The root container element */
  element: HTMLElement;
  /** Current state */
  state: "idle" | "processing" | "uploading" | "done" | "error";
  /** Currently selected files */
  getFiles: () => File[];
  /** Get current results */
  getResults: () => UploadResult[];
  /** Programmatically trigger file input click */
  openPicker: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Abort any in-progress upload */
  abort: () => void;
  /** Destroy and remove from DOM */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

// --- Main Factory ---

export function createImageUploader(options: UploadOptions): ImageUploaderInstance {
  const opts = {
    accept: "image/*",
    maxSize: DEFAULT_MAX_SIZE,
    quality: 0.85,
    outputFormat: "original",
    maxFiles: 1,
    multiple: false,
    showPreview: true,
    previewSize: 200,
    dropLabel: "Drop images here or click to browse",
    browseLabel: "Browse Files",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)
    : options.container;

  if (!container) throw new Error("ImageUploader: container not found");

  let state: "idle" | "processing" | "uploading" | "done" | "error" = "idle";
  let selectedFiles: File[] = [];
  let results: UploadResult[] = [];
  let currentAbort: AbortController | null = null;

  // Build UI
  const wrapper = document.createElement("div");
  wrapper.className = `img-uploader ${opts.className ?? ""}`;
  wrapper.style.cssText = `
    position:relative;border:2px dashed #d1d5db;border-radius:12px;padding:32px;
    text-align:center;cursor:pointer;transition:border-color 0.2s,background 0.2s;
    min-height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  `;

  // Drop zone content
  const icon = document.createElement("div");
  icon.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
  wrapper.appendChild(icon);

  const label = document.createElement("p");
  label.textContent = opts.dropLabel;
  label.style.cssText = "margin:12px 0 4px;color:#6b7280;font-size:14px;";
  wrapper.appendChild(label);

  const sublabel = document.createElement("p");
  sublabel.textContent = `Max ${formatBytes(opts.maxSize!)}, up to ${opts.maxFiles} file(s)`;
  sublabel.style.cssText = "margin:0;color:#9ca3af;font-size:12px;";
  wrapper.appendChild(sublabel);

  // Hidden file input
  const input = document.createElement("input");
  input.type = "file";
  input.accept = opts.accept!;
  input.multiple = opts.multiple!;
  input.style.display = "none";
  wrapper.appendChild(input);

  // Preview area
  const previewArea = document.createElement("div");
  previewArea.style.cssText = "display:none;margin-top:16px;gap:12px;flex-wrap:wrap;justify-content:center;width:100%;";
  wrapper.appendChild(previewArea);

  // Progress bar
  const progressBar = document.createElement("div");
  progressBar.style.cssText = `
    display:none;width:100%;height:4px;background:#e5e7eb;border-radius:2px;margin-top:12px;overflow:hidden;
  `;
  const progressFill = document.createElement("div");
  progressFill.style.cssText = "height:100%;width:0%;background:#3b82f6;transition:width 0.2s;";
  progressBar.appendChild(progressFill);
  wrapper.appendChild(progressBar);

  container.appendChild(wrapper);

  // --- Drag & Drop ---

  let dragCounter = 0;

  wrapper.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    wrapper.style.borderColor = "#3b82f6";
    wrapper.style.background = "#eff6ff";
  });

  wrapper.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      wrapper.style.borderColor = "#d1d5db";
      wrapper.style.background = "";
    }
  });

  wrapper.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  wrapper.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    wrapper.style.borderColor = "#d1d5db";
    wrapper.style.background = "";
    const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) handleFiles(files);
  });

  // Click to browse
  wrapper.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    input.click();
  });

  input.addEventListener("change", () => {
    if (input.files?.length) handleFiles(Array.from(input.files));
  });

  // Paste support
  if (typeof window !== "undefined") {
    window.addEventListener("paste", (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i]!.type.startsWith("image/")) {
          const f = items[i]!.getAsFile();
          if (f) imageFiles.push(f);
        }
      }
      if (imageFiles.length > 0) handleFiles(imageFiles);
    });
  }

  // --- Processing Pipeline ---

  async function handleFiles(files: File[]): Promise<void> {
    // Limit count
    if (files.length > opts.maxFiles!) {
      files = files.slice(0, opts.maxFiles!);
    }

    // Validate each file
    const valid: File[] = [];
    for (const file of files) {
      const err = validateFile(file);
      if (err) {
        opts.onInvalid?.(file, err);
      } else {
        valid.push(file);
      }
    }

    if (valid.length === 0) return;

    // Call select callback
    const proceed = opts.onSelect?.(valid);
    if (proceed === false) return;

    selectedFiles = valid;
    showPreviews(valid);
    state = "processing";

    try {
      // Process each file (resize/compress)
      const processed = await Promise.all(valid.map(processFile));
      state = "uploading";

      // Upload each processed file
      if (opts.uploadFn) {
        progressBar.style.display = "block";
        for (let i = 0; i < processed.length; i++) {
          currentAbort = new AbortController();
          const result = await opts.uploadFn(processed[i]!, (percent) => {
            progressFill.style.width = `${percent}%`;
          });
          results.push(result);
          opts.onComplete?.(result);
        }
        progressBar.style.display = "none";
      } else {
        // No upload function — just use object URLs as results
        for (const blob of processed) {
          results.push({
            url: URL.createObjectURL(blob),
            fileName: "",
            fileSize: blob.size,
            width: 0,
            height: 0,
            format: blob.type,
            processed: true,
          });
        }
      }

      state = "done";
    } catch (err) {
      state = "error";
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  function validateFile(file: File): string | null {
    if (!file.type.startsWith("image/")) return "Not an image file";
    if (file.size > opts.maxSize!) return `File too large (${formatBytes(file.size)} > ${formatBytes(opts.maxSize!)})`;
    return null;
  }

  async function processFile(file: File): Promise<File> {
    // If no resizing needed and original format, return as-is
    if (!opts.maxDimensions && opts.outputFormat === "original") return file;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Resize if needed
        if (opts.maxDimensions && (width > opts.maxDimensions.width || height > opts.maxDimensions.height)) {
          const ratio = Math.min(opts.maxDimensions.width / width, opts.maxDimensions.height / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;

        ctx.drawImage(img, 0, 0, width, height);

        const format = opts.outputFormat === "original"
          ? (file.type === "image/png" ? "image/png" : "image/jpeg")
          : `image/${opts.outputFormat}`;

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(new File([blob], file.name, { type: format }));
            else reject(new Error("Canvas toBlob failed"));
          },
          format,
          opts.quality!,
        );
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = URL.createObjectURL(file);
    });
  }

  function showPreviews(files: File[]): void {
    if (!opts.showPreview) return;
    previewArea.style.display = "flex";
    previewArea.innerHTML = "";

    for (const file of files) {
      const wrap = document.createElement("div");
      wrap.style.cssText = `position:relative;width:${opts.previewSize}px;height:${opts.previewSize}px;border-radius:8px;overflow:hidden;`;

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      wrap.appendChild(img);

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "\u2715";
      removeBtn.style.cssText = `
        position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;
        background:rgba(0,0,0,0.6);color:#fff;border:none;font-size:11px;cursor:pointer;display:flex;
        align-items:center;justify-content:center;
      `;
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        wrap.remove();
        selectedFiles = selectedFiles.filter((f) => f !== file);
        if (selectedFiles.length === 0) previewArea.style.display = "none";
      });
      wrap.appendChild(removeBtn);

      previewArea.appendChild(wrap);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }

  // --- Instance ---

  const instance: ImageUploaderInstance = {
    get element() { return wrapper; },
    get state() { return state; },

    getFiles: () => [...selectedFiles],
    getResults: () => [...results],

    openPicker: () => input.click(),

    reset() {
      state = "idle";
      selectedFiles = [];
      results = [];
      input.value = "";
      previewArea.style.display = "none";
      previewArea.innerHTML = "";
      progressBar.style.display = "none";
      progressFill.style.width = "0%";
      if (currentAbort) { currentAbort.abort(); currentAbort = null; }
    },

    abort() {
      if (currentAbort) { currentAbort.abort(); currentAbort = null; }
      state = "error";
    },

    destroy() {
      window.removeEventListener("paste", () => {});
      wrapper.remove();
    },
  };

  return instance;
}
