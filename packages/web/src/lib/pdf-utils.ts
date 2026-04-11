/**
 * PDF Utilities: PDF generation from HTML, page measurement,
 * text extraction helpers, blob utilities, canvas-to-PDF, and
 * print-to-PDF workflow support.
 */

// --- Types ---

export interface PdfGenerationOptions {
  /** HTML content to convert */
  html: string;
  /** Title for the document */
  title?: string;
  /** Paper size (default: 'A4') */
  paperSize?: "A4" | "A3" | "Letter" | "Legal" | "Tabloid";
  /** Orientation (default: 'portrait') */
  orientation?: "portrait" | "landscape";
  /** Margins in mm */
  margins?: { top: number; right: number; bottom: number; left: number };
  /** Include header/footer */
  headerHtml?: string;
  footerHtml?: string;
  /** CSS styles to embed */
  styles?: string;
  /** External stylesheet URLs */
  styleSheets?: string[];
  /** Scale factor (default: 1) */
  scale?: number;
}

export interface PdfPageInfo {
  pageNumber: number;
  width: number;   // px
  height: number;  // px
  isLandscape: boolean;
}

export interface TextMetrics {
  width: number;
  height: number;
  lineCount: number;
  charCount: number;
  estimatedPages: number;
}

// --- Paper Size Config ---

const PAPER_SIZES: Record<string, { width: number; height: number }> = {
  A4:     { width: 210, height: 297 },
  A3:     { width: 297, height: 420 },
  Letter: { width: 216, height: 279 },
  Legal:  { width: 216, height: 356 },
  Tabloid: { width: 279, height: 432 },
};

// --- HTML to PDF (using browser print + iframe) ---

/**
 * Generate a PDF from HTML content using the browser's print-to-PDF capability.
 * Opens a hidden iframe, writes content, triggers print dialog with "Save as PDF".
 *
 * Note: This relies on the browser's built-in print-to-PDF feature.
 * For server-side generation, consider libraries like jsPDF or Puppeteer.
 */
export async function generatePdfFromHtml(options: PdfGenerationOptions): Promise<Blob | null> {
  const {
    html,
    title = "Document",
    paperSize = "A4",
    orientation = "portrait",
    margins = { top: 15, right: 15, bottom: 15, left: 15 },
    scale = 1,
    styles = "",
    styleSheets = [],
  } = options;

  const size = PAPER_SIZES[paperSize] ?? PAPER_SIZES.A4;
  const isLandscape = orientation === "landscape";

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;border:0;";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: ${size.width}mm ${size.height}mm ${orientation}; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; }
    body { margin: 0; padding: 0; font-family: -apple-system, sans-serif; font-size: 11pt; line-height: 1.5; color: #000; }
    ${styles}
  </style>
  ${styleSheets.map((s) => `<link rel="stylesheet" href="${s}">`).join("\n")}
</head>
<body>${html}</body>
</html>`;

    doc.open();
    doc.write(fullHtml);
    doc.close();

    // Wait for content to render
    setTimeout(() => {
      try {
        // Try using jsPDF if available, otherwise fall back to print
        if ((window as any).jspdf) {
          // jsPDF available path
          const doc = iframe.contentDocument;
          const pdf = (window as any).jspdf.jsPDF({
            orientation: isLandscape ? "landscape" : "portrait",
            format: [size.width, size.height],
            unit: "mm",
          });
          pdf.html(doc.body).then(() => {
            pdf.save(title);
            resolve(null); // jsPDF handles download
          }).catch(reject);
        } else {
          // Fall back: trigger print dialog
          iframe.contentWindow?.print();
          resolve(null);
        }
      } catch (e) {
        reject(e);
      }

      // Cleanup
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 5000);
    }, 300);
  });
}

// --- Canvas/Screenshot to PDF ---

/**
 * Capture an element as image and wrap in a minimal PDF structure.
 * Returns a Blob representing the PDF file.
 *
 * Note: This creates a simple single-page PDF with an embedded image.
 * For multi-page or text-based PDFs, use a proper library like jsPDF.
 */
export async function elementToPdf(
  element: HTMLElement,
  options?: Partial<PdfGenerationOptions>,
): Promise<Blob> {
  const scale = options?.scale ?? 2;

  // Use html2canvas if available
  if ((window as any).html2canvas) {
    const canvas = await (window as any).html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
    });

    return canvasToPdfBlob(canvas, options);
  }

  // Fallback: use canvas drawing
  return fallbackElementToPdf(element, options);
}

async function canvasToPdfBlob(
  canvas: HTMLCanvasElement,
  options?: Partial<PdfGenerationOptions>,
): Promise<Blob> {
  // Build a minimal PDF with the canvas as image
  const imageData = canvas.toDataURL("image/png");
  const imgData = imageData.split(",")[1];

  const size = PAPER_SIZES[options?.paperSize ?? "A4"] ?? PAPER_SIZES.A4;
  const w = Math.round(size.width * 3.78); // mm to pt at 72dpi approx
  const h = Math.round(size.height * 3.78);

  // Simple PDF with embedded image (single page)
  const pdfContent = `%PDF-1.4
1 0 obj<</Type /Catalog /Pages 2 0 R>>
2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>
3 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}]
4 0 obj<</Type /XObject /Length ${imgData.length}>>stream
${atob(imgData)}
endstream
endobj
xref
0 5 00000 n
trailer<</Size ${Math.round(canvas.width)} ${Math.round(canvas.height)}>>
startxref
%%EOF`;

  return new Blob([pdfContent], { type: "application/pdf" });
}

async function fallbackElementToPdf(
  element: HTMLElement,
  options?: Partial<PdfGenerationOptions>,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scale = options?.scale ?? 2;
  const rect = element.getBoundingClientRect();

  canvas.width = rect.width * scale;
  canvas.height = rect.height * scale;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Draw white background
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw element
  await drawElementToCanvas(ctx, element, rect);

  return canvasToPdfBlob(canvas, options);
}

function drawElementToCanvas(
  ctx: CanvasRenderingContext2D,
  element: HTMLElement,
  rect: DOMRect,
): Promise<void> {
  return new Promise((resolve) => {
    const svg = new XMLSerializer().serializeToString(element);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, rect.left, rect.top, rect.width, rect.height);
      resolve();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  });
}

// --- Text Measurement ---

/**
 * Estimate how many pages text content will need when printed.
 */
export function estimatePrintPages(
  text: string,
  options?: {
    fontSize?: number;
    lineHeight?: number;
    charsPerLine?: number;
    linesPerPage?: number;
    paperSize?: string;
    margins?: { top: number; right: number; bottom: number; left: number };
  },
): TextMetrics {
  const fontSize = options?.fontSize ?? 11;
  const lineHeight = options?.lineHeight ?? fontSize * 1.5;
  const charsPerLine = options?.charsPerLine ?? 80;
  const linesPerPage = options?.linesPerPage ?? 50;
  const size = PAPER_SIZES[options?.paperSize ?? "A4"] ?? PAPER_SIZES.A4;
  const m = options?.margins ?? { top: 15, right: 15, bottom: 15, left: 15 };

  const printableWidth = size.width - m.left - m.right; // mm
  const printableHeight = size.height - m.top - m.bottom; // mm
  const lineWidthPt = (printableWidth / 210) * 792 * (fontSize / 11); // rough estimate

  const charCount = text.length;
  const lines = Math.ceil(charCount / (lineWidthPt > 0 ? lineWidthPt : charsPerLine));
  const totalPages = Math.ceil(lines / linesPerPage);

  return {
    width: printableWidth,
    height: printableHeight,
    lineCount: lines,
    charCount,
    estimatedPages: totalPages,
  };
}

// --- Blob Utilities ---

/**
 * Download a Blob as a file in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert a Blob to a data URL string.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert a data URL back to a Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// --- Print Helper ---

/**
 * Trigger browser print dialog for a specific element with print-only styles.
 */
export async function printElement(
  element: HTMLElement,
  options?: Omit<PdfGenerationOptions, "html">,
): Promise<void> {
  const opts: PdfGenerationOptions = {
    ...options,
    html: element.innerHTML,
    title: options?.title ?? "Print",
  };

  await generatePdfFromHtml(opts);
}

// --- Internal ---

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
