/**
 * Print utilities: page setup, print preview, PDF generation, receipt printing.
 */

export interface PrintOptions {
  title?: string;
  orientation?: "portrait" | "landscape";
  margins?: { top: string; right: string; bottom: string; left: string };
  stylesheet?: string | CSSStyleSheet[];
  header?: string;
  footer?: string;
  removeElements?: string[]; // CSS selectors to hide when printing
}

export interface PageSettings {
  size: "A4" | "A3" | "Letter" | "Legal" | "Tabloid";
  orientation: "portrait" | "landscape";
  margins: { top: mm; right: mm; bottom: mm; left: mm };
}

type mm = `${number}mm`;

/** Trigger browser print dialog with options */
export function printContent(
  content: HTMLElement | string,
  options: PrintOptions = {},
): void {
  const {
    title = document.title,
    orientation = "portrait",
    margins = { top: "15mm", right: "10mm", bottom: "15mm", left: "10mm" },
    header,
    footer,
    removeElements = [],
  } = options;

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Popup blocked - allow popups to print");
  }

  // Collect stylesheets
  let styles = "";
  if (Array.isArray(options.stylesheet)) {
    for (const sheet of options.stylesheet) {
      try { styles += Array.from(sheet.cssRules).map((r) => r.cssText).join("\n"); } catch {}
    }
  } else if (options.stylesheet) {
    styles = options.stylesheet;
  } else {
    // Import all current styles
    for (const sheet of document.styleSheets) {
      try { styles += Array.from(sheet.cssRules).map((r) => r.cssText).join("\n"); } catch {}
    }
  }

  // Hide specified elements
  let hideStyles = "";
  for (const selector of removeElements) {
    hideStyles += ` ${selector} { display: none !important; }\n`;
  }

  const htmlContent = typeof content === "string" ? content : content.outerHTML;

  printWindow.document.write(`<!DOCTYPE html>
<html><head>
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${orientation}; margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left}; }
    body { margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.5; }
    @media print { body { padding: 0; } .no-print { display: none !important; } }
    ${hideStyles}
    ${styles}
  </style>
</head><body>
  ${header ? `<header style="margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #333;">${header}</header>` : ""}
  ${htmlContent}
  ${footer ? `<footer style="margin-top:20px;padding-top:10px;border-top:1px solid #ccc;font-size:12px;color:#666;">${footer}</footer>` : ""}
</body></html>`);

  printWindow.document.close();
  printWindow.focus();

  // Small delay to ensure rendering before print
  setTimeout(() => { printWindow.print(); }, 250);
}

/** Print a specific element by selector */
export function printElement(selector: string, options?: Omit<PrintOptions, "removeElements">): void {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Element "${selector}" not found`);
  printContent(el.cloneNode(true) as HTMLElement, {
    ...options,
    removeElements: ["nav", "header", "footer", ".sidebar", ".no-print", ".toolbar"],
  });
}

// --- Print Preview ---

/** Open print preview in a new window */
export function printPreview(content: HTMLElement | string, options: PrintOptions = {}): WindowProxy | null {
  const {
    title = "Print Preview",
    orientation = "portrait",
    margins = { top: "15mm", right: "10mm", bottom: "15mm", left: "10mm" },
  } = options;

  const win = window.open("", "_blank");
  if (!win) return null;

  const htmlContent = typeof content === "string" ? content : content.outerHTML;

  let styles = "";
  for (const sheet of document.styleSheets) {
    try { styles += Array.from(sheet.cssRules).map((r) => r.cssText).join("\n"); } catch {}
  }

  win.document.write(`<!DOCTYPE html>
<html><head>
  <title>${escapeHtml(title)} - Preview</title>
  <style>
    @media screen {
      body { background: #525659; display: flex; justify-content: center; padding: 20px; }
      .page {
        background: white;
        width: ${orientation === "portrait" ? "210mm" : "297mm"};
        min-height: ${orientation === "portrait" ? "297mm" : "210mm"};
        padding: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
        box-shadow: 0 0 20px rgba(0,0,0,0.3);
        margin: 10px auto;
      }
    }
    @media print { .page { box-shadow: none; margin: 0; } body { background: white; padding: 0; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; }
    .preview-toolbar { position: sticky; top: 0; z-index: 100; background: #333; color: white; padding: 8px 16px; display: flex; gap: 12px; align-items: center; }
    .preview-toolbar button { padding: 6px 16px; cursor: pointer; border-radius: 4px; border: none; background: #007bff; color: white; font-size: 14px; }
    .preview-toolbar button:hover { background: #0056b3; }
    ${styles}
  </style>
</head><body>
  <div class="preview-toolbar">
    <button onclick="window.print()">Print</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="page">${htmlContent}</div>
</body></html>`);

  win.document.close();
  return win;
}

// --- Receipt / Label Printing ---

export interface ReceiptOptions {
  width: number;       // mm (typically 58 or 80)
  characterWidth: number; // chars per line
  fontSize: number;    // pt
  lineHeight: number;  // mm
}

/** Generate thermal printer-compatible receipt text */
export function generateReceiptText(
  items: Array<{ name: string; quantity: number; price: number }>,
  options: Partial<ReceiptOptions> = {},
): string {
  const opts: ReceiptOptions = {
    width: 80,
    characterWidth: 42,
    fontSize: 12,
    lineHeight: 4,
    ...options,
  };

  const w = opts.characterWidth;
  const lines: string[] = [];

  // Centered header
  lines.push(centerText("=== RECEIPT ===", w));
  lines.push(centerText(new Date().toLocaleString(), w));
  lines.push("=".repeat(w));

  // Items
  let total = 0;
  for (const item of items) {
    const subtotal = item.quantity * item.price;
    total += subtotal;
    const name = truncate(item.name, w - 12);
    const qtyStr = `x${item.quantity}`;
    const priceStr = `$${subtotal.toFixed(2)}`;
    lines.push(`${name}${" ".repeat(w - name.length - qtyStr.length - priceStr.length)}${qtyStr} ${priceStr}`);
  }

  lines.push("-".repeat(w));
  lines.push(`${" ".repeat(w - 10)}TOTAL: $${total.toFixed(2)}`);
  lines.push("=".repeat(w));
  lines.push(centerText("Thank you!", w));

  return lines.join("\n") + "\n";
}

function centerText(text: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 3) + "..." : text;
}

/** Generate label/barcode-style output */
export function generateLabel(
  data: { title: string; fields: Array<{ label: string; value: string }> },
  width = 62,
): string {
  const lines: string[] = [];
  lines.push(centerText(data.title.toUpperCase(), width));
  lines.push("-".repeat(width));

  for (const field of data.fields) {
    lines.push(field.label + ":");
    lines.push(field.value);
    lines.push("");
  }

  return lines.join("\n");
}

// --- CSS Print Utilities ---

/** Inject print-specific styles */
export function injectPrintStyles(styles: string): () => void {
  const styleEl = document.createElement("style");
  styleEl.setAttribute("media", "print");
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
  return () => styleEl.remove();
}

/** Common print style presets */
export const PRINT_STYLES = {
  /** Hide everything except main content */
  minimal: `
    body > *:not(.print-area) { display: none !important; }
    .print-area { display: block !important; width: 100%; }
  `,
  /** Reset colors for printing */
  grayscale: `
    * { color: #000 !important; background: transparent !important; border-color: #999 !important; }
    img { filter: grayscale(100%); }
  `,
  /** Force page breaks */
  pageBreaks: `
    .page-break-before { page-break-before: always; break-before: page; }
    .page-break-after { page-break-after: always; break-after: page; }
    .no-page-break { page-break-inside: avoid; break-inside: avoid; }
  `,
  /** Optimize tables for print */
  tableOptimized: `
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #333; padding: 4px 8px; text-align: left; font-size: 10px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  `,
  /** Show URLs after links */
  showLinks: `
    a[href]::after { content: " (" attr(href) ")"; font-size: 0.8em; color: #666; word-break: break-all; }
  `,
} as const;

// --- Page Layout Helpers ---

/** Calculate printable area dimensions */
export function getPrintableArea(pageSize: PageSettings["size"] = "A4"): {
  width: mm; height: mm;
  points: { width: number; height: number };
} {
  const sizes: Record<string, { w: number; h: number }> = {
    A4: { w: 210, h: 297 },
    A3: { w: 297, h: 420 },
    Letter: { w: 215.9, h: 279.4 },
    Legal: { w: 215.9, h: 355.6 },
    Tabloid: { w: 279.4, h: 431.8 },
  };
  const size = sizes[pageSize] ?? sizes.A4!;
  const ptPerMm = 2.83465;

  return {
    width: `${size.w}mm` as mm,
    height: `${size.h}mm` as mm,
    points: { width: Math.round(size.w * ptPerMm), height: Math.round(size.h * ptPerMm) },
  };
}

/** Estimate page count for content */
export function estimatePageCount(
  contentHeight: number,
  pageSize: PageSettings["size"] = "A4",
  marginTopMm = 15,
  marginBottomMm = 15,
): number {
  const area = getPrintableArea(pageSize);
  const heightNum = parseFloat(area.height);
  const usableHeight = heightNum - marginTopMm - marginBottomMm;
  return Math.ceil(contentHeight / usableHeight);
}

/** Split content into pages */
export function paginateContent(
  container: HTMLElement,
  pageHeightPx: number,
  marginTopPx = 50,
  marginBottomPx = 50,
): Array<{ html: string; pageNum: number }> {
  const usableHeight = pageHeightPx - marginTopPx - marginBottomPx;
  const children = Array.from(container.children);
  const pages: Array<{ html: string; pageNum: number }> = [];
  let currentPageHtml = "";
  let currentPageHeight = 0;
  let pageNum = 1;

  for (const child of children) {
    const childHeight = (child as HTMLElement).offsetHeight || 100;

    if (currentPageHeight + childHeight > usableHeight && currentPageHtml) {
      pages.push({ html: currentPageHtml, pageNum: pageNum++ });
      currentPageHtml = "";
      currentPageHeight = 0;
    }

    currentPageHtml += child.outerHTML;
    currentPageHeight += childHeight;
  }

  if (currentPageHtml) {
    pages.push({ html: currentPageHtml, pageNum });
  }

  return pages;
}

// --- PDF Generation (simplified - uses browser print-to-PDF) ---

/** Generate PDF from HTML content using print-to-PDF approach */
export async function generatePDF(
  content: HTMLElement | string,
  filename = "document.pdf",
  options?: Omit<PrintOptions, "removeElements">,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "210mm";
    iframe.style.height = "297mm";

    iframe.onload = () => {
      const doc = iframe.contentDocument!;
      const htmlContent = typeof content === "string" ? content : content.outerHTML;

      let styles = "";
      for (const sheet of document.styleSheets) {
        try { styles += Array.from(sheet.cssRules).map((r) => r.cssText).join("\n"); } catch {}
      }

      doc.open();
      doc.write(`<!DOCTYPE html><html><head><style>@page { margin: 0; } body { margin: 0; padding: 15mm; } ${styles}</style></head><body>${htmlContent}</body></html>`);
      doc.close();

      // Use the browser's built-in capability where available
      // Fallback: create a simple blob representation
      setTimeout(() => {
        document.body.removeChild(iframe);
        // In production, this would use jsPDF or similar library
        // For now, return an HTML blob that can be printed to PDF
        const blob = new Blob([doc.documentElement.outerHTML], { type: "text/html" });
        resolve(blob);
      }, 500);
    };

    document.body.appendChild(iframe);
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
