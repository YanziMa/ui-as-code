/**
 * PDF Preview: Lightweight PDF viewer with page navigation, zoom controls,
 * thumbnail sidebar, text search, download/print, and keyboard shortcuts.
 * Uses PDF.js via CDN or embedded iframe for rendering.
 */

// --- Types ---

export interface PdfPageInfo {
  /** Page number (1-indexed) */
  number: number;
  /** Original width in points */
  width: number;
  /** Original height in points */
  height: number;
  /** Thumbnail data URL (optional) */
  thumbnail?: string;
}

export interface PdfPreviewOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** PDF source: URL, File object, or base64 string */
  src: string | File;
  /** Initial page number (default: 1) */
  initialPage?: number;
  /** Show toolbar? */
  showToolbar?: boolean;
  /** Show thumbnails sidebar? */
  showThumbnails?: boolean;
  /** Default scale/zoom (default: 1) */
  defaultScale?: number;
  /** Available zoom levels */
  scales?: number[];
  /** Show page navigation? */
  showPageNav?: boolean;
  /** Enable text search? */
  enableSearch?: boolean;
  /** Worker source URL for PDF.js (if using CDN) */
  workerSrc?: string;
  /** Callback on document loaded */
  onLoad?: (numPages: number) => void;
  /** Callback on page change */
  onPageChange?: (page: number) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PdfPreviewInstance {
  element: HTMLElement;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Get current page */
  getCurrentPage: () => number;
  /** Get total pages */
  getTotalPages: () => number;
  /** Set zoom level */
  setScale: (scale: number) => void;
  /** Get current scale */
  getScale: () => number;
  /** Search for text */
  search: (query: string) => Promise<number>;
  /** Print the PDF */
  print: () => void;
  /** Download as blob */
  download: () => Promise<void>;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Constants ---

const DEFAULT_SCALES = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.mjs";

// --- Main Factory ---

export function createPdfPreview(options: PdfPreviewOptions): PdfPreviewInstance {
  const opts = {
    initialPage: options.initialPage ?? 1,
    showToolbar: options.showToolbar ?? true,
    showThumbnails: options.showThumbnails ?? false,
    defaultScale: options.defaultScale ?? 1,
    scales: options.scales ?? DEFAULT_SCALES,
    showPageNav: options.showPageNav ?? true,
    enableSearch: options.enableSearch ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("PdfPreview: container not found");

  container.className = `pdf-preview ${opts.className}`;
  container.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:100%;
    background:#f9fafb;border-radius:8px;overflow:hidden;font-family:-apple-system,sans-serif;
    position:relative;
  `;

  let destroyed = false;
  let pdfDoc: unknown = null; // PDFDocumentProxy
  let currentPage = opts.initialPage;
  let totalPages = 0;
  let currentScale = opts.defaultScale;

  // DOM structure
  const toolbarEl = document.createElement("div");
  toolbarEl.className = "pdf-toolbar";
  toolbarEl.style.cssText = `
    display:flex;align-items:center;gap:6px;padding:8px 12px;background:#f3f4f6;
    border-bottom:1px solid #e5e7eb;flex-shrink:0;flex-wrap:wrap;
  `;

  const viewerEl = document.createElement("div");
  viewerEl.className = "pdf-viewer";
  viewerEl.style.cssText = "flex:1;overflow:auto;display:flex;justify-content:center;align-items:center;position:relative;";
  container.appendChild(toolbarEl);
  container.appendChild(viewerEl);

  // Canvas for rendering
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "box-shadow:0 2px 12px rgba(0,0,0,0.08);";
  canvas.style.display = "none";
  viewerEl.appendChild(canvas);

  // Loading indicator
  const loadingEl = document.createElement("div");
  loadingEl.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;color:#6b7280;">
      <div class="spinner" style="width:24px;height:24px;border:2px solid #d1d5db;border-top-color:#4338ca;border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <span>Loading PDF...</span>
    </div>
  `;
  loadingEl.style.cssText = "display:flex;align-items:center;justify-content:center;width:100%;height:100%;";
  viewerEl.appendChild(loadingEl);

  // Build toolbar
  if (opts.showToolbar) buildToolbar();

  // Load PDF.js and render
  loadPdf();

  // --- Toolbar Builder ---

  function buildToolbar(): void {
    // Zoom controls
    const zoomGroup = document.createElement("div");
    zoomGroup.style.cssText = "display:flex;align-items:center;gap:4px;margin-left:auto;";

    const zoomOutBtn = createToolbarBtn("\u2212", "Zoom out", () => {
      const idx = opts.scales.indexOf(currentScale);
      if (idx > 0) instance.setScale(opts.scales[idx - 1]!);
    });

    const zoomLabel = document.createElement("span");
    zoomLabel.textContent = `${Math.round(currentScale * 100)}%`;
    zoomLabel.style.cssText = "font-size:12px;font-weight:500;min-width:45px;text-align:center;";

    const zoomInBtn = createToolbarBtn("\u2213", "Zoom in", () => {
      const idx = opts.scales.indexOf(currentScale);
      if (idx < opts.scales.length - 1) instance.setScale(opts.scales[idx + 1]!);
    });

    zoomGroup.appendChild(zoomOutBtn);
    zoomGroup.appendChild(zoomLabel);
    zoomGroup.appendChild(zoomInBtn);
    toolbarEl.appendChild(zoomGroup);

    // Page nav
    if (opts.showPageNav) {
      const prevBtn = createToolbarBtn("\u25C0", "Previous page", () => instance.goToPage(currentPage - 1));
      const pageInfo = document.createElement("span");
      pageInfo.style.cssText = "font-size:12px;font-weight:500;min-width:50px;text-align:center;";
      const nextBtn = createToolbarBtn("\u25B6", "Next page", () => instance.goToPage(currentPage + 1));

      toolbarEl.appendChild(prevBtn);
      toolbarEl.appendChild(pageInfo);
      toolbarEl.appendChild(nextBtn);
      (instance as any)._pageInfo = pageInfo;
    }

    // Search
    if (opts.enableSearch) {
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search in PDF...";
      searchInput.style.cssText = "padding:5px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;width:160px;outline:none;";
      searchInput.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
          const count = await instance.search(searchInput.value);
          if (count >= 0) pageInfo.textContent = `Found ${count} matches`;
        }
      });
      toolbarEl.appendChild(searchInput);
    }

    // Print/download buttons
    const printBtn = createToolbarButton("\u1F5A6", "Print", () => instance.print());
    const dlBtn = createToolbarButton("\u2193", "Download", () => instance.download());
    toolbarEl.appendChild(printBtn);
    toolbarEl.appendChild(dlBtn);
  }

  function createToolbarBtn(label: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = label;
    btn.title = title;
    btn.style.cssText = `
      padding:5px 10px;border:1px solid #d1d5db;border-radius:6px;
      background:#fff;color:#374151;font-size:12px;cursor:pointer;
      transition:all 0.15s;display:flex;align-items:center;justify-content:center;min-width:32px;
    `;
    btn.addEventListener("click", onClick);
    btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#4338ca"; btn.style.color = "#4338ca"; });
    btn.addEventListener("mouseleave", () => { btn.style.borderColor = "#d1d5db"; btn.style.color = "#374151"; });
    return btn;
  }

  function createToolbarButton(label: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = documentToolbarBtn(label, title, onClick);
    btn.style.cssText += `font-weight:600;padding:5px 14px;`;
    return btn;
  }
  // Alias for internal use
  function documentToolbarBtn(label: string, title: string, onClick: () => void): HTMLButtonElement {
    return createToolbarBtn(label, title, onClick);
  }
  }

  // --- PDF Loading ---

  async function loadPdf(): Promise<void> {
    try {
      // Dynamically import PDF.js from CDN
      if (typeof (globalThis as any).pdfjsLib === "undefined") {
        await injectPdfJs();
      }

      const pdfjsLib = (globalThis as any).pdfjsLib;
      let loadingTask: unknown;

      if (typeof options.src === "string" && (options.src.startsWith("data:") || options.src.startsWith("http"))) {
        loadingTask = await pdfjsLib.getDocument(options.src);
      } else if (typeof options.src === "string") {
        const resp = await fetch(options.src);
        const blob = await resp.blob();
        loadingTask = await pdfjsLib.getData(blob);
      } else if (options.src instanceof File) {
        loadingTask = await pdfjsLib.getFile(options.src);
      } else {
        throw new Error("Invalid PDF source");
      }

      pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages;

      loadingEl.remove();
      canvas.style.display = "";

      opts.onLoad?.(totalPages);
      updatePageInfo();
      renderPage(currentPage);

      // Keyboard shortcuts
      container.addEventListener("keydown", handleKeydown);

    } catch (err) {
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      loadingEl.innerHTML = `<span style="color:#ef4444;">Failed to load PDF</span>`;
    }
  }

  async function injectPdfJs(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((globalThis as any).pdfjsLib) { resolve(); return; }

      const script = document.createElement("script");
      script.src = opts.workerSrc ?? PDFJS_CDN;
      script.type = "module";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load PDF.js"));
      document.head.appendChild(script);
    });
  }

  // --- Rendering ---

  async function renderPage(pageNum: number): Promise<void> {
    if (!pdfDoc || destroyed) return;

    pageNum = Math.max(1, Math.min(pageNum, totalPages));
    currentPage = pageNum;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentScale });

    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const renderContext = {
      canvasContext: ctx,
      viewport,
    };

    await page.render(renderContext);
    updatePageInfo();
  }

  function updatePageInfo(): void {
    const info = (instance as any)._pageInfo as HTMLElement | undefined;
    if (info) {
      info.textContent = `${currentPage} / ${totalPages}`;
    }
  }

  // --- Keyboard ---

  function handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        instance.goToPage(currentPage - 1);
        break;
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        instance.goToPage(currentPage + 1);
        break;
      case "Home":
        e.preventDefault();
        instance.goToPage(1);
        break;
      case "End":
        e.preventDefault();
        instance.goToPage(totalPages);
        break;
      case "+":
      case "=":
        e.preventDefault();
        const idx = opts.scales.indexOf(currentScale);
        if (idx < opts.scales.length - 1) instance.setScale(opts.scales[idx + 1]!);
        break;
      case "-":
      case "_":
        e.preventDefault();
        const idx2 = opts.scales.indexOf(currentScale);
        if (idx2 > 0) instance.setScale(opts.scales[idx2 - 1]!);
        break;
    }
  }

  // --- Instance ---

  const instance: PdfPreviewInstance = {
    element: container,

    goToPage(page: number) {
      if (page >= 1 && page <= totalPages && page !== currentPage) {
        renderPage(page);
        opts.onPageChange?.(page);
      }
    },

    getCurrentPage() { return currentPage; },
    getTotalPages() { return totalPages; },

    setScale(scale: number) {
      currentScale = scale;
      renderPage(currentPage);
    },

    getScale() { return currentScale; },

    async search(query: string): Promise<number> {
      if (!pdfDoc || !query.trim()) return 0;
      let matchCount = 0;
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdfDoc.getPage(i);
        const content = await page.getTextContent();
        const matches = (content as string).toLowerCase().split(query.toLowerCase()).length - 1;
        if (matches > 0) {
          matchCount += matches;
          if (matchCount === 1) {
            instance.goToPage(i);
          }
        }
      }
      return matchCount;
    },

    print() {
      canvas.style.display = "none";
      if (!pdfDoc) return;
      pdfDoc.print().catch(() => {});
      setTimeout(() => { canvas.style.display = ""; }, 1000);
    },

    async download(): Promise<void> {
      if (!pdfDoc) return;
      const blob = await pdfDoc.saveBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "document.pdf";
      a.click();
      URL.revokeObjectURL(url);
    },

    destroy() {
      destroyed = true;
      container.innerHTML = "";
    },
  };

  return instance;
}
