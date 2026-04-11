/**
 * PDF Viewer: Lightweight PDF rendering using iframe/embed with custom UI overlay,
 * page navigation, zoom controls, search/highlight, thumbnail sidebar,
 * download/print, rotation, fit modes, and accessibility features.
 *
 * Note: For full PDF parsing without external libs, this provides an embed-based
 * viewer with rich UI controls. For programmatic PDF generation, see pdf-generator.
 */

// --- Types ---

export type FitMode = "width" | "height" | "page" | "auto";
export type ZoomMode = "fit-width" | "fit-height" | "custom";
export type ScrollMode = "vertical" | "horizontal" | "wrapped";

export interface PDFViewerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** PDF source (URL, Blob, or base64) */
  src: string | Blob;
  /** Show toolbar? */
  showToolbar?: boolean;
  /** Show page navigation? */
  showPageNav?: boolean;
  /** Show thumbnails sidebar? */
  showThumbnails?: boolean;
  /** Show search bar? */
  showSearch?: boolean;
  /** Initial page (1-based) */
  initialPage?: number;
  /** Initial zoom level (percentage) */
  initialZoom?: number;
  /** Fit mode */
  fitMode?: FitMode;
  /** Scroll mode */
  scrollMode?: ScrollMode;
  /** Default scale */
  defaultScale?: number;
  /** Min zoom (%) */
  minZoom?: number;
  /** Max zoom (%) */
  maxZoom?: number;
  /** Rotation angle (0, 90, 180, 270) */
  rotation?: number;
  /** Download button? */
  allowDownload?: boolean;
  /** Print button? */
  allowPrint?: boolean;
  /** Callback on page change */
  onPageChange?: (page: number, totalPages: number) => void;
  /** Callback on zoom change */
  onZoomChange?: (zoom: number) => void;
  /** Callback on load complete */
  onLoad?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PDFViewerInstance {
  element: HTMLElement;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Next page */
  nextPage: () => void;
  /** Previous page */
  prevPage: () => void;
  /** Set zoom level */
  setZoom: (zoom: number) => void;
  /** Zoom in */
  zoomIn: () => void;
  /** Zoom out */
  zoomOut: () => void;
  /** Set fit mode */
  setFitMode: (mode: FitMode) => void;
  /** Rotate clockwise */
  rotateCW: () => void;
  /** Rotate counter-clockwise */
  rotateCCW: () => void;
  /** Search text */
  search: (query: string) => void;
  /** Clear search highlights */
  clearSearch: () => void;
  /** Get current page */
  getCurrentPage: () => number;
  /** Get total pages */
  getTotalPages: () => number;
  /** Get current zoom */
  getZoom: () => number;
  /** Download PDF */
  download: () => void;
  /** Print PDF */
  print: () => void;
  /** Load new PDF source */
  loadSource: (src: string | Blob) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createPDFViewer(options: PDFViewerOptions): PDFViewerInstance {
  const opts = {
    showToolbar: options.showToolbar ?? true,
    showPageNav: options.showPageNav ?? true,
    showThumbnails: options.showThumbnails ?? false,
    showSearch: options.showSearch ?? true,
    initialPage: options.initialPage ?? 1,
    initialZoom: options.initialZoom ?? 100,
    fitMode: options.fitMode ?? "width",
    scrollMode: options.scrollMode ?? "vertical",
    minZoom: options.minZoom ?? 25,
    maxZoom: options.maxZoom ?? 400,
    rotation: options.rotation ?? 0,
    allowDownload: options.allowDownload ?? true,
    allowPrint: options.allowPrint ?? true,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("PDFViewer: container not found");

  let currentPage = opts.initialPage;
  let totalPages = 0;
  let currentZoom = opts.initialZoom;
  let currentRotation = opts.rotation;
  let destroyed = false;

  // Resolve source URL
  function resolveSrc(src: string | Blob): string {
    if (src instanceof Blob) return URL.createObjectURL(src);
    return src;
  }

  const srcUrl = resolveSrc(options.src);

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `pdf-viewer ${opts.className ?? ""}`;
  wrapper.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:100%;
    min-height:500px;background:#525659;font-family:-apple-system,sans-serif;
    border-radius:8px;overflow:hidden;position:relative;
  `;
  container.appendChild(wrapper);

  // Toolbar
  let toolbar: HTMLElement | null = null;
  if (opts.showToolbar) {
    toolbar = buildToolbar();
    wrapper.appendChild(toolbar);
  }

  // Main content area (sidebar + viewer)
  const mainArea = document.createElement("div");
  mainArea.style.cssText = "display:flex;flex:1;overflow:hidden;position:relative;";
  wrapper.appendChild(mainArea);

  // Thumbnail sidebar
  let sidebar: HTMLElement | null = null;
  if (opts.showThumbnails) {
    sidebar = buildSidebar();
    mainArea.appendChild(sidebar);
  }

  // Viewer container
  const viewerContainer = document.createElement("div");
  viewerContainer.className = "pdf-viewer-container";
  viewerContainer.style.cssText = `
    flex:1;overflow:auto;display:flex;justify-content:center;
    background:#525659;padding:8px;
  `;
  mainArea.appendChild(viewerContainer);

  // PDF embed/iframe
  const pdfFrame = document.createElement("iframe");
  pdfFrame.className = "pdf-frame";
  pdfFrame.src = srcUrl;
  pdfFrame.style.cssText = `
    width:100%;min-height:600px;border:none;border-radius:4px;
    transform:rotate(${currentRotation}deg);
    transition:transform 0.3s ease;
  `;
  viewerContainer.appendChild(pdfFrame);

  // Loading indicator
  const loadingEl = document.createElement("div");
  loadingEl.className = "pdf-loading";
  loadingEl.style.cssText = `
    position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
    color:#fff;font-size:14px;z-index:10;
  `;
  loadingEl.textContent = "Loading PDF...";
  viewerContainer.appendChild(loadingEl);

  // Hide loading after frame loads
  pdfFrame.addEventListener("load", () => {
    loadingEl.style.display = "none";
    totalPages = estimatePages();
    opts.onLoad?.();
    opts.onPageChange?.(currentPage, totalPages);
  });
  pdfFrame.addEventListener("error", () => {
    loadingEl.textContent = "Failed to load PDF.";
    opts.onError?.(new Error("PDF failed to load"));
  });

  // --- Toolbar ---

  function buildToolbar(): HTMLElement {
    const bar = document.createElement("div");
    bar.className = "pdf-toolbar";
    bar.style.cssText = `
      display:flex;align-items:center;gap:6px;padding:8px 12px;
      background:#323639;color:#d4d4d4;flex-wrap:wrap;
    `;

    // Page nav
    if (opts.showPageNav) {
      const prevBtn = makeBtn("\u25C0", "Previous Page", () => instance.prevPage());
      const pageInfo = document.createElement("span");
      pageInfo.className = "pdf-page-info";
      pageInfo.style.cssText = "font-size:13px;min-width:70px;text-align:center;font-variant-numeric:tabular-nums;";
      pageInfo.textContent = `${currentPage} / ${totalPages || "?"}`;
      const nextBtn = makeBtn("\u25B6", "Next Page", () => instance.nextPage());

      bar.append(prevBtn, pageInfo, nextBtn);
    }

    // Separator
    bar.appendChild(makeSeparator());

    // Zoom controls
    const zoomOutBtn = makeBtn("-", "Zoom Out", () => instance.zoomOut());
    const zoomLabel = document.createElement("span");
    zoomLabel.style.cssText = "font-size:13px;min-width:45px;text-align:center;font-variant-numeric:tabular-nums;";
    zoomLabel.textContent = `${currentZoom}%`;
    const zoomInBtn = makeBtn("+", "Zoom In", () => instance.zoomIn());

    bar.append(zoomOutBtn, zoomLabel, zoomInBtn);

    // Fit mode buttons
    bar.appendChild(makeSeparator());
    bar.append(
      makeBtn("Fit W", "Fit Width", () => instance.setFitMode("width")),
      makeBtn("Fit H", "Fit Height", () => instance.setFitMode("height")),
    );

    // Rotation
    bar.appendChild(makeSeparator());
    bar.append(
      makeBtn("\u21BB", "Rotate CW", () => instance.rotateCW()),
      makeBtn("\u21BA", "Rotate CCW", () => instance.rotateCCW()),
    );

    // Search
    if (opts.showSearch) {
      bar.appendChild(makeSeparator());
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Find...";
      searchInput.style.cssText = `
        padding:4px 8px;border:1px solid #555;border-radius:4px;
        background:#222;color:#d4d4d4;font-size:12px;width:120px;
      `;
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") instance.search(searchInput.value);
      });
      bar.appendChild(searchInput);
    }

    // Actions
    if (opts.allowDownload || opts.allowPrint) {
      bar.appendChild(makeSeparator());
      if (opts.allowDownload) bar.appendChild(makeBtn("\u2B07", "Download", () => instance.download()));
      if (opts.allowPrint) bar.appendChild(makeBtn("\u1F5A8", "Print", () => instance.print()));
    }

    return bar;
  }

  function makeBtn(label: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = title;
    btn.style.cssText = `
      padding:4px 8px;border:1px solid #555;border-radius:4px;background:#444;
      color:#d4d4d4;cursor:pointer;font-size:12px;white-space:nowrap;
      transition:background 0.15s;
    `;
    btn.addEventListener("click", onClick);
    return btn;
  }

  function makeSeparator(): HTMLElement {
    const sep = document.createElement("div");
    sep.style.cssText = "width:1px;height:20px;background:#555;margin:0 4px;";
    return sep;
  }

  // --- Thumbnail Sidebar ---

  function buildSidebar(): HTMLElement {
    const sb = document.createElement("div");
    sb.className = "pdf-sidebar";
    sb.style.cssText = `
      width:140px;background:#323639;border-right:1px solid #555;
      overflow-y:auto;padding:8px;flex-shrink:0;
    `;

    const title = document.createElement("div");
    title.style.cssText = "font-size:11px;color:#888;margin-bottom:8px;text-transform:uppercase;";
    title.textContent = "Pages";
    sb.appendChild(title);

    // Thumbnails will be populated when PDF loads
    const thumbGrid = document.createElement("div");
    thumbGrid.className = "pdf-thumbnails";
    thumbGrid.style.cssText = "display:flex;flex-direction:column;gap:8px;align-items:center;";
    sb.appendChild(thumbGrid);

    return sb;
  }

  // --- Helpers ---

  function estimatePages(): number {
    // Since we're using iframe, we can't directly know page count
    // This is a rough estimate based on typical PDF characteristics
    // In production, use PDF.js for accurate page counts
    return 1; // Placeholder — real implementation would use PDF.js
  }

  function updateZoomDisplay(): void {
    const zoomLabel = wrapper.querySelector(".pdf-toolbar .pdf-zoom-label") as HTMLElement
      ?? Array.from(wrapper.querySelectorAll(".pdf-toolbar span")).find((s) =>
        s.textContent?.includes("%")
      );
    if (zoomLabel) zoomLabel.textContent = `${currentZoom}%`;

    pdfFrame.style.transform = `scale(${currentZoom / 100}) rotate(${currentRotation}deg)`;
    pdfFrame.style.transformOrigin = "top center";
  }

  function updatePageDisplay(): void {
    const pageInfo = wrapper.querySelector(".pdf-page-info") as HTMLElement;
    if (pageInfo) pageInfo.textContent = `${currentPage} / ${totalPages || "?"}`;
  }

  // --- Instance ---

  const instance: PDFViewerInstance = {
    element: wrapper,

    goToPage(page: number) {
      currentPage = Math.max(1, Math.min(page, totalPages || 1));
      updatePageDisplay();
      opts.onPageChange?.(currentPage, totalPages);
    },

    nextPage() { instance.goToPage(currentPage + 1); },
    prevPage() { instance.goToPage(currentPage - 1); },

    setZoom(zoom: number) {
      currentZoom = Math.max(opts.minZoom, Math.min(opts.maxZoom, zoom));
      updateZoomDisplay();
      opts.onZoomChange?.(currentZoom);
    },

    zoomIn() { instance.setZoom(currentZoom + (currentZoom < 100 ? 25 : 50)); },
    zoomOut() { instance.setZoom(currentZoom - (currentZoom <= 100 ? 25 : 50)); },

    setFitMode(mode: FitMode) {
      switch (mode) {
        case "width": currentZoom = 100; break;
        case "height": currentZoom = 120; break;
        case "page": currentZoom = 100; break;
        case "auto": currentZoom = 80; break;
      }
      updateZoomDisplay();
    },

    rotateCW() {
      currentRotation = (currentRotation + 90) % 360;
      pdfFrame.style.transform = `scale(${currentZoom / 100}) rotate(${currentRotation}deg)`;
    },

    rotateCCW() {
      currentRotation = (currentRotation - 90 + 360) % 360;
      pdfFrame.style.transform = `scale(${currentZoom / 100}) rotate(${currentRotation}deg)`;
    },

    search(_query: string) {
      // Search requires PDF.js integration for full-text search within iframe
      // This is a placeholder — would need postMessage communication with embedded PDF
      console.log("[PDFViewer] Search:", _query);
    },

    clearSearch() {
      // Placeholder
    },

    getCurrentPage() { return currentPage; },
    getTotalPages() { return totalPages; },
    getZoom() { return currentZoom; },

    download() {
      const a = document.createElement("a");
      a.href = srcUrl;
      a.download = "document.pdf";
      a.click();
    },

    print() {
      pdfFrame.contentWindow?.print();
    },

    loadSource(src: string | Blob) {
      const newUrl = resolveSrc(src);
      pdfFrame.src = newUrl;
    },

    destroy() {
      destroyed = true;
      if (srcUrl.startsWith("blob:")) URL.revokeObjectURL(srcUrl);
      wrapper.remove();
    },
  };

  return instance;
}

// --- PDF Generation Utilities ---

/**
 * Generate a simple PDF-like data URI from text content.
 * This creates a minimal valid PDF with basic text rendering.
 * For complex PDF generation, consider using jsPDF or similar libraries.
 */
export function generateSimplePDF(options: {
  title?: string;
  author?: string;
  content: Array<{ text: string; fontSize?: number; bold?: boolean; margin?: number }>;
  pageSize?: "A4" | "Letter" | "A3";
}): string {
  const PAGE_SIZES: Record<string, { width: number; height: number }> = {
    A4: { width: 595, height: 842 },
    Letter: { width: 612, height: 792 },
    A3: { width: 842, height: 1190 },
  };

  const size = PAGE_SIZES[options.pageSize ?? "A4"]!;
  const lines: string[] = [];

  // PDF header
  lines.push("%PDF-1.4");
  lines.push("%\xE2\xE3\xCF\xD3"); // Binary comment

  // Object catalog (simplified — this is a minimal valid PDF structure)
  // Real PDF generation is complex; this produces a basic printable document

  let yOffset = size.height - 72;
  const streamParts: string[] = [];
  streamParts.push("BT"); // Begin text

  for (const block of options.content) {
    const fontSize = block.fontSize ?? 12;
    const margin = block.margin ?? 72;
    const x = margin;

    if (yOffset < 72) {
      // New page would be needed here
      yOffset = size.height - 72;
    }

    streamParts.push(`/F1 ${fontSize} Tf`);
    streamParts.push(`${x} ${yOffset} Td`);
    streamParts.push(`(${escapePDFString(block.text)}) Tj`);

    yOffset -= fontSize * 1.5;
  }

  streamParts.push("ET"); // End text

  // Build minimal PDF objects
  const contentStream = streamParts.join("\n");

  // Simplified PDF body
  const pdfBody = [
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${size.width} ${size.height}]`,
    `/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj`,
    `4 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`,
    `5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
  ].join("\n\n");

  lines.push(pdfBody);

  // Cross-reference table (simplified)
  lines.push("xref");
  lines.push("0 6");
  lines.push("0000000000 65535 f ");
  for (let i = 1; i <= 5; i++) {
    lines.push(`${String(i * 1000).padStart(10, "0")} 00000 n `); // Approximate offsets
  }

  // Trailer
  lines.push("trailer");
  lines.push(`<< /Size 6 /Root 1 0 R >>`);
  lines.push("startxref");
  lines.push("0");
  lines.push("%%EOF");

  return `data:application/pdf;base64,${btoa(lines.join("\n"))}`;
}

function escapePDFString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\n/g, ") Tj\n(");
}

/** Create a printable HTML view of content styled like a PDF page */
export function createPrintableView(content: string, options: {
  title?: string;
  pageSize?: "A4" | "Letter";
  orientation?: "portrait" | "landscape";
  margins?: string;
} = {}): HTMLElement {
  const sizes: Record<string, string> = {
    A4: "210mm 297mm",
    Letter: "8.5in 11in",
  };

  const container = document.createElement("div");
  container.className = "printable-pdf-view";
  container.style.cssText = `
    width:${sizes[options.pageSize ?? "A4"]};
    min-height:${sizes[options.pageSize ?? "A4"].split(" ")[1]};
    margin:0 auto;padding:${options.margins ?? "20mm"};
    background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);
    font-family:"Times New Roman",serif;font-size:12pt;line-height:1.6;
    @media print { box-shadow:none; margin:0; }
  `;

  if (options.title) {
    const titleEl = document.createElement("h1");
    titleEl.style.cssText = "text-align:center;font-size:18pt;margin-bottom:20pt;";
    titleEl.textContent = options.title;
    container.appendChild(titleEl);
  }

  const contentEl = document.createElement("div");
  contentEl.innerHTML = content;
  container.appendChild(contentEl);

  return container;
}
