/**
 * File Preview: Multi-format file previewer supporting images, PDF, text/code,
 * video, audio, and unknown types with fallback UI. Includes file type detection,
 * size formatting, download button, and responsive layout.
 */

// --- Types ---

export type FileType = "image" | "pdf" | "text" | "code" | "video" | "audio" | "office" | "archive" | "unknown";

export interface FilePreviewOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** File URL or data URI */
  url: string;
  /** File name (for display and type detection) */
  fileName?: string;
  /** MIME type hint (overrides auto-detection) */
  mimeType?: string;
  /** File size in bytes */
  fileSize?: number;
  /** Show toolbar (download, filename, size)? */
  showToolbar?: boolean;
  /** Show download button? */
  showDownload?: boolean;
  /** Allow fullscreen toggle? */
  allowFullscreen?: boolean;
  /** Max height for preview area */
  maxHeight?: string;
  /** Fallback message for unsupported types */
  fallbackMessage?: string;
  /** Custom renderers for specific file types */
  customRenderers?: Partial<Record<FileType, (url: string, container: HTMLElement) => void>>;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback on load complete */
  onLoad?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface FilePreviewInstance {
  element: HTMLElement;
  getUrl: () => string;
  setUrl: (url: string, fileName?: string) => void;
  getFileType: () => FileType;
  destroy: () => void;
}

// --- File Type Detection ---

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "avif", "tiff", "tif"];
const TEXT_EXTS = ["txt", "csv", "log", "md", "json", "xml", "html", "htm", "css", "scss", "less", "yaml", "yml", "toml", "ini", "env", "gitignore"];
const CODE_EXTS = ["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "h", "cs", "go", "rs", "rb", "php", "swift", "kt", "scala", "r", "lua", "sh", "bash", "zsh", "sql", "pl", "pm"];
const VIDEO_EXTS = ["mp4", "webm", "ogg", "mov", "avi", "mkv", "m4v", "3gp"];
const AUDIO_EXTS = ["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma", "opus"];
const OFFICE_EXTS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp"];
const ARCHIVE_EXTS = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];

function detectFileType(fileName: string, mimeType?: string): FileType {
  if (mimeType) {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType.startsWith("text/") || mimeType.startsWith("application/json") || mimeType.startsWith("application/xml")) return "text";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    if (mimeType.includes("document") || mimeType.includes("sheet") || mimeType.includes("presentation")) return "office";
  }

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (IMAGE_EXTS.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (TEXT_EXTS.includes(ext)) return "text";
  if (CODE_EXTS.includes(ext)) return "code";
  if (VIDEO_EXTS.includes(ext)) return "video";
  if (AUDIO_EXTS.includes(ext)) return "audio";
  if (OFFICE_EXTS.includes(ext)) return "office";
  if (ARCHIVE_EXTS.includes(ext)) return "archive";

  // Check data URI
  if (fileName.startsWith("data:image")) return "image";

  return "unknown";
}

// --- Helpers ---

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(type: FileType): { emoji: string; color: string } {
  switch (type) {
    case "image": return { emoji: "\u{1F5BC}\uFE0F", color: "#8b5cf6" };
    case "pdf":   return { emoji: "\u{1F4C4}", color: "#ef4444" };
    case "text":  return { emoji: "\u{1F4DD}", color: "#3b82f6" };
    case "code":  return { emoji: "{ }", color: "#22c55e" };
    case "video": return { emoji: "\u{1F3AC}", color: "#f59e0b" };
    case "audio": return { emoji: "\u{1F3B5}", color: "#ec4899" };
    case "office": return { emoji: "\u{1F4C2}", color: "#f97316" };
    case "archive":return { emoji: "\u{1F4E6}", color: "#6b7280" };
    default:      return { emoji: "\u{1F4C4}", color: "#9ca3af" };
  }
}

// --- Main Class ---

export class FilePreviewManager {
  create(options: FilePreviewOptions): FilePreviewInstance {
    const opts = {
      fileName: options.fileName ?? "",
      showToolbar: options.showToolbar ?? true,
      showDownload: options.showDownload ?? true,
      allowFullscreen: options.allowFullscreen ?? true,
      maxHeight: options.maxHeight ?? "600px",
      fallbackMessage: options.fallbackMessage ?? "This file type cannot be previewed.",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("FilePreview: container not found");

    container.className = `file-preview ${opts.className ?? ""}`;
    let currentUrl = opts.url;
    let currentFileName = opts.fileName;
    let currentType = detectFileType(opts.fileName, opts.mimeType);
    let destroyed = false;

    function render(): void {
      currentType = detectFileType(currentFileName, opts.mimeType);
      const icon = getFileIcon(currentType);

      container.innerHTML = "";

      // Toolbar
      if (opts.showToolbar) {
        const toolbar = document.createElement("div");
        toolbar.className = "fp-toolbar";
        toolbar.style.cssText = `
          display:flex;align-items:center;justify-content:space-between;
          padding:10px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;border-radius:8px 8px 0 0;
        `;

        // Left: icon + name + size
        const leftSide = document.createElement("div");
        leftSide.style.cssText = "display:flex;align-items:center;gap:8px;min-width:0;";

        const typeIcon = document.createElement("span");
        typeIcon.style.cssText = `font-size:20px;`;
        typeIcon.textContent = icon.emoji;
        leftSide.appendChild(typeIcon);

        const fileInfo = document.createElement("div");
        fileInfo.style.cssText = "min-width:0;";

        const nameEl = document.createElement("div");
        nameEl.style.cssText = "font-size:13px;font-weight:500;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;";
        nameEl.textContent = currentFileName || "Untitled file";
        fileInfo.appendChild(nameEl);

        if (opts.fileSize) {
          const sizeEl = document.createElement("div");
          sizeEl.style.cssText = "font-size:11px;color:#9ca3af;";
          sizeEl.textContent = formatFileSize(opts.fileSize);
          fileInfo.appendChild(sizeEl);
        }

        leftSide.appendChild(fileInfo);
        toolbar.appendChild(leftSide);

        // Right: actions
        const actions = document.createElement("div");
        actions.style.cssText = "display:flex;align-items:center;gap:6px;";

        // Fullscreen toggle
        if (opts.allowFullscreen) {
          const fsBtn = document.createElement("button");
          fsBtn.type = "button";
          fsBtn.innerHTML = "\u26F6"; // ⛶
          fsBtn.title = "Toggle fullscreen";
          fsBtn.style.cssText = `
            background:none;border:none;font-size:14px;cursor:pointer;
            padding:4px 8px;border-radius:4px;color:#6b7280;
            transition:background 0.15s;
          `;
          fsBtn.addEventListener("click", () => toggleFullscreen());
          fsBtn.addEventListener("mouseenter", () => { fsBtn.style.background = "#e5e7eb"; });
          fsBtn.addEventListener("mouseleave", () => { fsBtn.style.background = ""; });
          actions.appendChild(fsBtn);
        }

        // Download button
        if (opts.showDownload) {
          const dlBtn = document.createElement("a");
          dlBtn.href = currentUrl;
          dlBtn.download = currentFileName || undefined;
          dlBtn.target = "_blank";
          dlBtn.innerHTML = "\u2B07"; // ⬇
          dlBtn.title = "Download";
          dlBtn.style.cssText = `
            display:inline-flex;align-items:center;padding:5px 12px;
            font-size:13px;font-weight:500;background:#4338ca;color:#fff;
            border:none;border-radius:6px;cursor:pointer;text-decoration:none;
            transition:background 0.15s;
          `;
          dlBtn.addEventListener("mouseenter", () => { dlBtn.style.background = "#3730a3"; });
          dlBtn.addEventListener("mouseleave", () => { dlBtn.style.background = "#4338ca"; });
          actions.appendChild(dlBtn);
        }

        toolbar.appendChild(actions);
        container.appendChild(toolbar);
      }

      // Preview area
      const previewArea = document.createElement("div");
      previewArea.className = "fp-preview-area";
      previewArea.style.cssText = `
        border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;
        overflow:auto;max-height:${opts.maxHeight};background:#fff;display:flex;
        align-items:center;justify-content:center;min-height:200px;
      `;

      // Render based on type
      try {
        if (opts.customRenderers?.[currentType]) {
          opts.customRenderers[currentType]!(currentUrl, previewArea);
        } else {
          renderByType(previewArea, currentType);
        }
        opts.onLoad?.();
      } catch (err) {
        renderFallback(previewArea, err instanceof Error ? err : new Error(String(err)));
        opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      }

      container.appendChild(previewArea);
    }

    function renderByType(area: HTMLElement, type: FileType): void {
      switch (type) {
        case "image":
          renderImage(area);
          break;
        case "pdf":
          renderPdf(area);
          break;
        case "text":
        case "code":
          renderTextCode(area, type);
          break;
        case "video":
          renderMedia(area, "video");
          break;
        case "audio":
          renderMedia(area, "audio");
          break;
        default:
          renderFallback(area, new Error("Unsupported file type"));
      }
    }

    function renderImage(area: HTMLElement): void {
      const img = document.createElement("img");
      img.src = currentUrl;
      img.alt = currentFileName || "";
      img.style.cssText = "max-width:100%;max-height:100%;object-fit:contain;";
      img.loading = "lazy";
      img.onerror = () => {
        area.innerHTML = "";
        renderFallback(area, new Error("Failed to load image"));
      };
      area.appendChild(img);
    }

    function renderPdf(area: HTMLElement): void {
      const iframe = document.createElement("iframe");
      iframe.src = currentUrl;
      iframe.style.cssText = "width:100%;height:600px;border:none;";
      iframe.title = currentFileName || "PDF Preview";
      area.appendChild(iframe);

      // Fallback link
      const link = document.createElement("a");
      link.href = currentUrl;
      link.target = "_blank";
      link.textContent = "Open PDF in new tab";
      link.style.cssText = "display:block;text-align:center;margin:12px;color:#4338ca;text-decoration:none;font-size:13px;";
      area.appendChild(link);
    }

    function renderTextCode(area: HTMLElement, type: FileType): void {
      const pre = document.createElement("pre");
      pre.style.cssText = `
        width:100%;padding:16px;margin:0;overflow:auto;
        font-family:'SF Mono','Fira Code',Consolas,monospace;
        font-size:13px;line-height:1.6;color:#24292f;background:#f6f8fa;
        white-space:pre-wrap;word-break:break-word;
      `;

      // Try to fetch text content
      fetch(currentUrl)
        .then((res) => res.text())
        .then((text) => {
          pre.textContent = text.slice(0, 50000); // Limit to prevent OOM
          if (text.length > 50000) {
            const trunc = document.createElement("div");
            trunc.style.cssText = "color:#9ca3af;font-size:11px;margin-top:8px;text-align:center;";
            trunc.textContent = `(Showing first 50,000 of ${text.length.toLocaleString()} characters)`;
            pre.appendChild(trunc);
          }
        })
        .catch(() => {
          pre.textContent = `[Unable to load ${type} content from ${currentUrl}]`;
        });

      area.appendChild(pre);
    }

    function renderMedia(area: HTMLElement, mediaType: "video" | "audio"): void {
      const el = document.createElement(mediaType);
      el.src = currentUrl;
      el.controls = true;
      el.preload = "metadata";
      el.style.cssText = mediaType === "video"
        ? "max-width:100%;max-height:500px;"
        : "width:100%;";
      area.appendChild(el);
    }

    function renderFallback(area: HTMLElement, _error?: Error): void {
      const icon = getFileIcon(currentType);
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        display:flex;flex-direction:column;align-items:center;gap:16px;
        padding:48px 24px;text-align:center;
      `;

      const iconEl = document.createElement("span");
      iconEl.style.cssText = `font-size:64px;opacity:0.5;`;
      iconEl.textContent = icon.emoji;
      wrapper.appendChild(iconEl);

      const msg = document.createElement("p");
      msg.style.cssText = "font-size:14px;color:#6b7280;max-width:320px;";
      msg.textContent = opts.fallbackMessage;
      wrapper.appendChild(msg);

      const fileNameEl = document.createElement("p");
      fileNameEl.style.cssText = "font-size:12px;color:#9ca3af;word-break:break-all;";
      fileNameEl.textContent = currentFileName || currentUrl;
      wrapper.appendChild(fileNameEl);

      area.appendChild(wrapper);
    }

    function toggleFullscreen(): void {
      if (!document.fullscreenElement) {
        container.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.();
      }
    }

    // Initial render
    render();

    const instance: FilePreviewInstance = {
      element: container,

      getUrl() { return currentUrl; },

      setUrl(url: string, fileName?: string) {
        currentUrl = url;
        if (fileName !== undefined) currentFileName = fileName;
        render();
      },

      getFileType() { return currentType; },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a file preview */
export function createFilePreview(options: FilePreviewOptions): FilePreviewInstance {
  return new FilePreviewManager().create(options);
}
