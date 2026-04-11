/**
 * Viewer Utilities: Generic content viewer with multiple view modes (text/image/PDF),
 * fullscreen support, zoom controls, page navigation, keyboard shortcuts,
 * print functionality, download capability, and responsive layout.
 */

// --- Types ---

export type ViewerMode = "text" | "image" | "pdf" | "markdown" | "auto";

export interface ViewerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Content source (URL string, HTML string, File object, or HTMLElement) */
  source: string | File | HTMLElement;
  /** Viewer mode hint */
  mode?: ViewerMode;
  /** Title shown in header */
  title?: string;
  /** Show header with controls */
  showHeader?: boolean;
  /** Show fullscreen button */
  showFullscreen?: boolean;
  /** Show zoom controls (for images) */
  showZoom?: boolean;
  /** Show page navigation (for PDF/multi-page) */
  showPagination?: boolean;
  /** Show download button */
  showDownload?: boolean;
  /** Show print button */
  showPrint?: boolean;
  /** Initial zoom level (for images, default 1) */
  initialZoom?: number;
  /** Max zoom level */
  maxZoom?: number;
  /** Min zoom level */
  minZoom?: number;
  /** Background color */
  background?: string;
  /** Padding around content */
  padding?: number;
  /** Custom toolbar position ("top" | "bottom" | "none") */
  toolbarPosition?: "top" | "bottom" | "none";
  /** Called when viewer opens/loads */
  onLoad?: () => void;
  /** Called when viewer closes */
  onClose?: () => void;
  /** Called on zoom change */
  onZoom?: (level: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ViewerInstance {
  /** Root element */
  el: HTMLElement;
  /** Load new content */
  load: (source: string | File | HTMLElement) => Promise<void>;
  /** Get current mode */
  getMode: () => ViewerMode;
  /** Set mode */
  setMode: (mode: ViewerMode) => void;
  /** Enter fullscreen */
  enterFullscreen: () => void;
  /** Exit fullscreen */
  exitFullscreen: () => void;
  /** Toggle fullscreen */
  toggleFullscreen: () => void;
  /** Is in fullscreen? */
  isFullscreen: () => boolean;
  /** Zoom in */
  zoomIn: () => void;
  /** Zoom out */
  zoomOut: () => void;
  /** Reset zoom */
  resetZoom: () => void;
  /** Print current content */
  print: () => void;
  /** Download current content */
  download: (filename?: string) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Factory ---

export function createViewer(options: ViewerOptions): ViewerInstance {
  const {
    container: cont,
    mode = "auto",
    title,
    showHeader = true,
    showFullscreen = true,
    showZoom = true,
    showPagination = false,
    showDownload = true,
    showPrint = false,
    initialZoom = 1,
    maxZoom = 5,
    minZoom = 0.25,
    background = "#fff",
    padding = 16,
    toolbarPosition = "top",
    onLoad,
    onClose,
    onZoom,
    className,
  } = options;

  const root = typeof cont === "string"
    ? document.querySelector<HTMLElement>(cont)!
    : cont;
  if (!root) throw new Error("Viewer: container not found");

  let _mode: ViewerMode = mode;
  let _isFullscreen = false;
  let _zoomLevel = initialZoom;
  let _currentSource = options.source;
  let cleanupFns: Array<() => void> = [];

  root.className = `viewer ${className ?? ""}`;
  root.style.cssText =
    `background:${background};position:relative;width:100%;height:100%;` +
    "display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,sans-serif;";

  // Header
  let headerEl: HTMLElement | null = null;
  if (showHeader) {
    headerEl = document.createElement("div");
    headerEl.className = "viewer-header";
    headerEl.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;" +
      `padding:${Math.round(padding / 2)}px ${padding}px;` +
      "border-bottom:1px solid #e5e7eb;background:#fafafa;flex-shrink:0;z-index:2;";

    const leftGroup = document.createElement("div");
    leftGroup.style.cssText = "display:flex;align-items:center;gap:8px;min-width:0;";

    const titleEl = document.createElement("span");
    titleEl.style.cssText = "font-size:14px;font-weight:600;color:#111827;overflow:hidden;text-ellipsis;white-space:nowrap;max-width:400px;";
    titleEl.textContent = title ?? "Viewer";
    leftGroup.appendChild(titleEl);

    // Mode badge
    const modeBadge = document.createElement("span");
    modeBadge.style.cssText =
      "padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;" +
      "background:#eff6ff;color:#2563eb;text-transform:uppercase;";
    modeBadge.textContent = _mode === "auto" ? "---" : _mode;
    leftGroup.appendChild(modeBadge);

    headerEl.appendChild(leftGroup);

    // Right group
    const rightGroup = document.createElement("div");
    rightGroup.style.cssText = "display:flex;align-items:center;gap:4px;";

    // Zoom controls
    if (showZoom) {
      const zoomOutBtn = _createToolbarBtn("\u2212", "Zoom out");
      const zoomInBtn = _createToolbarBtn("\u2211", "Zoom in");
      const resetBtn = _createToolbarBtn("1:1", "Reset zoom");
      zoomOutBtn.addEventListener("click", () => zoomOut());
      zoomInBtn.addEventListener("click", () => zoomIn());
      resetBtn.addEventListener("click", () => resetZoom());
      rightGroup.appendChild(zoomOutBtn);
      rightGroup.appendChild(zoomInBtn);
      rightGroup.appendChild(resetBtn);
    }

    // Fullscreen
    if (showFullscreen) {
      const fsBtn = _createToolbarBtn("\u26F6", "Fullscreen");
      fsBtn.addEventListener("click", () => toggleFullscreen());
      rightGroup.appendChild(fsBtn);
    }

    // Download
    if (showDownload) {
      const dlBtn = _createToolbarBtn "\u2193" "Download";
      dlBtn.addEventListener("click", () => download());
      rightGroup.appendChild(dlBtn);
    }

    // Print
    if (showPrint) {
      const prBtn = _createToolbar("\u{1F5A6}" "Print";
      prBtn.addEventListener("click", () => print());
      rightGroup.appendChild(prBtn);
    }

    headerEl.appendChild(rightGroup);
    root.appendChild(headerEl);
  }

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "viewer-content";
  contentArea.style.cssText =
    "flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;" +
    `padding:${padding}px;position:relative;min-height:0;`;
  root.appendChild(contentArea);

  // --- Internal ---

  function _detectMode(src: string | File | HTMLElement): ViewerMode {
    if (_mode !== "auto") return _mode;

    if (src instanceof File) {
      if (src.type.startsWith("image/")) return "image";
      if (src.type === "application/pdf") return "pdf";
      if (src.type.startsWith("text/") || src.name.endsWith(".md")) return "markdown";
      return "text";
    }
    if (typeof src === "string") {
      if (/\.(png|jpe?g|gif|svg|webp|bmp)(\?|$|#)/i.test(src)) return "image";
      if (/\.pdf(\?|$|#)/i.test(src)) return "pdf";
      if (/\.md(\?|$|#)/i.test(src)) return "markdown";
      return "text";
    }
    if (src instanceof HTMLElement) {
      if (src.tagName === "IMG" || src.querySelector("img")) return "image";
      return "text";
    }
    return "text";
  }

  async function _renderContent(src: string | File | HTMLElement): Promise<void> {
    contentArea.innerHTML = "";
    const detected = _detectMode(src);
    _mode = detected;
    if (headerEl) {
      const badge = headerEl.querySelector(".viewer-mode-badge");
      if (badge) badge.textContent = detected;
    }

    switch (detected) {
      case "image": await _renderImage(src); break;
      case "text":
      case "markdown": await _renderText(src); break;
      case "pdf": await _renderPDF(src); break;
      default:
        await _renderText(src); break;
    }

    onLoad?.();
  }

  async function _renderImage(src: string | File | HTMLElement): Promise<void> {
    const img = document.createElement("img");
    img.className = "viewer-image";
    img.alt = title ?? "";
    img.draggable = false;
    img.style.cssText =
      "max-width:100%;max-height:100%;object-fit:contain;" +
      `transform:scale(${_zoomLevel});transform-origin:center center;transition:transform 0.2s ease;`;

    if (src instanceof File) {
      img.src = URL.createObjectURL(src);
    } else if (typeof src === "string") {
      img.src = src;
    } else if (src instanceof HTMLElement && src.tagName === "IMG") {
      img.src = (src as HTMLImageElement).src;
    } else {
      img.src = "";
    }

    contentArea.appendChild(img);
  }

  async function _renderText(src: string | File | HTMLElement): Promise<void> {
    const pre = document.createElement("pre");
    pre.className = "viewer-text";
    pre.style.cssText =
      "max-width:100%;max-height:100%;overflow:auto;" +
      "font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;" +
      "font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word;" +
      `padding:8px;background:#f8fafc;border-radius:6px;color:#1e293b;` +
      `transform:scale(${_zoomLevel});transform-origin:top left;transition:transform 0.2s ease;`;

    if (src instanceof File) {
      const text = await src.text();
      pre.textContent = text;
    } else if (typeof src === "string") {
      pre.textContent = src;
    } else if (src instanceof HTMLElement) {
      pre.textContent = src.textContent || src.innerText || "";
    } else {
      pre.textContent = "";
    }

    contentArea.appendChild(pre);
  }

  async function _renderPDF(src: string | File): Promise<void> {
    const wrapper = document.createElement("div");
    wrapper.style.cssText =
      "width:100%;height:100%;display:flex;flex-direction:column;align-items:center;" +
      "justify-content:center;gap:12px;color:#6b7280;";

    if (src instanceof File) {
      const url = URL.createObjectURL(src);
      const iframe = document.createElement("iframe");
      iframe.src = url;
      iframe.style.cssText = "width:80%;height:70vh;border:1px solid #e5e7eb;border-radius:8px;";
      wrapper.appendChild(iframe);
    } else if (typeof src === "string") {
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.style.cssText = "width:80%;height:70vh;border:1px solid #e5e7eb;border-radius:8px;";
      wrapper.appendChild(iframe);
    } else {
      const msg = document.createElement("div");
      msg.textContent = "PDF viewing requires a URL or File source.";
      wrapper.appendChild(msg);
    }

    contentArea.appendChild(wrapper);
  }

  function _createToolbarBtn(label: string, title: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = title;
    btn.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;" +
      "padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;" +
      "background:#fff;font-size:12px;color:#374151;cursor:pointer;" +
      "transition:all 0.15s;";
    btn.addEventListener("mouseenter", () => { btn.style.background = "#f9fafb"; btn.style.borderColor = "#9ca3af"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = ""; btn.style.borderColor = "#d1d5db"; });
    return btn;
  }

  // --- Public API ---

  async function load(source: string | File | HTMLElement): Promise<void> {
    _currentSource = source;
    await _renderContent(source);
  }

  function getMode(): ViewerMode { return _mode; }
  function setMode(m: ViewerMode): void { _mode = m; load(_currentSource).catch(() => {}); }

  function enterFullscreen(): void {
    if (_isFullscreen) return;
    _isFullscreen = true;
    if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
  }

  function exitFullscreen(): void {
    if (!_isFullscreen) return;
    _isFullscreen = false;
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }

  function toggleFullscreen(): void { _isFullscreen ? exitFullscreen() : enterFullscreen(); }
  function isFullscreen(): boolean { return _isFullscreen; }

  function zoomIn(): void {
    _zoomLevel = Math.min(maxZoom, _zoomLevel * 1.25);
    _applyZoom();
  }

  function zoomOut(): void {
    _zoomLevel = Math.max(minZoom, _zoomLevel / 1.25);
    _applyZoom();
  }

  function resetZoom(): void {
    _zoomLevel = initialZoom;
    _applyZoom();
  }

  function _applyZoom(): void {
    const img = contentArea.querySelector(".viewer-image");
    if (img) (img as HTMLElement).style.transform = `scale(${_zoomLevel})`;
    const pre = contentArea.querySelector(".viewer-text");
    if (pre) (pre as HTMLElement).style.transform = `scale(${_zoomLevel})`;
    onZoom?.(_zoomLevel);
  }

  function print(): void {
    window.print();
  }

  function download(filename?: string): void {
    const name = filename ?? (title ?? "download") || "content";
    if (_currentSource instanceof File) {
      const url = URL.createObjectURL(_currentSource);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
    } else if (typeof _currentSource === "string") {
      const a = document.createElement("a");
      a.href = _currentSource; a.download = name; a.target = "_blank"; a.click();
    }
  }

  function destroy(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
    root.innerHTML = "";
    root.style.cssText = "";
  }

  // Keyboard
  root.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "Escape": if (_isFullscreen) exitFullscreen(); else onClose?.(); break;
      case "+": case "=": zoomIn(); break;
      case "-": zoomOut(); break;
      case "0": resetZoom(); break;
      case "f": if (e.ctrlKey || e.metaKey) { e.preventDefault(); toggleFullscreen(); } break;
    }
  });

  // Init
  _renderContent(_currentSource).catch(() => {});

  return {
    el: root, load, getMode, setMode,
    enterFullscreen, exitFullscreen, toggleFullscreen, isFullscreen,
    zoomIn, zoomOut, resetZoom, print, download, destroy,
  };
}
