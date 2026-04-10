/**
 * PDF Generator: browser-based PDF creation using Canvas + jsPDF-like approach.
 * Document layout, text rendering, tables, images, headers/footers, page breaks,
 * watermarks, annotations, bookmarks, metadata, export/download.
 */

// --- Types ---

export interface PdfOptions {
  format?: "a4" | "letter" | "legal" | "a3" | "a5";
  orientation?: "portrait" | "landscape";
  margins?: { top: number; right: number; bottom: number; left: number };
  unit?: "mm" | "pt" | "in" | "px";
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
}

export interface FontOptions {
  family: string;
  size: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
}

export interface CellOptions {
  text: string;
  colSpan?: number;
  rowSpan?: number;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  font?: Partial<FontOptions>;
  padding?: number;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
}

export interface ImageOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  fit?: "contain" | "cover" | "fill" | "none";
  opacity?: number;
  rotation?: number;
}

export interface AnnotationOptions {
  type: "text" | "highlight" | "underline" | "strikeout" | "link" | "comment";
  x: number; y: number; width: number; height: number;
  content?: string;
  url?: string;
  color?: string;
  author?: string;
  date?: Date;
}

interface Page {
  content: Array<{
    type: "text" | "line" | "rect" | "image" | "table" | "annotation" | "watermark" | "qrcode";
    data: unknown;
  }>;
  width: number;
  height: number;
  number: number;
}

// --- Page Format Dimensions (in mm) ---

const PAGE_FORMATS = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  a3: { width: 297, height: 420 },
  a5: { width: 148, height: 210 },
};

const DEFAULT_MARGINS = { top: 20, right: 15, bottom: 20, left: 15 };

// --- Main PDF Class ---

export class PdfDocument {
  private pages: Page[] = [];
  private currentPage: Page;
  private options: Required<PdfOptions>;
  private cursorX: number;
  private cursorY: number;
  private fonts: Map<string, FontMetrics> = new Map();
  private bookmarks: Array<{ title: string; pageIndex: number; level: number }> = [];

  constructor(options: PdfOptions = {}) {
    this.options = {
      format: options.format ?? "a4",
      orientation: options.orientation ?? "portrait",
      margins: options.margins ?? DEFAULT_MARGINS,
      unit: options.unit ?? "mm",
      title: options.title ?? "",
      author: options.author ?? "",
      subject: options.subject ?? "",
      keywords: options.keywords ?? [],
      creator: options.creator ?? "PdfGenerator",
    };
    const dims = PAGE_FORMATS[this.options.format]!;
    const isLandscape = this.options.orientation === "landscape";
    const pageWidth = isLandscape ? dims.height : dims.width;
    const pageHeight = isLandscape ? dims.width : dims.height;
    this.currentPage = this.createPage(pageWidth, pageHeight);
    this.pages.push(this.currentPage);
    this.cursorX = this.options.margins.left;
    this.cursorY = this.options.margins.top;
    this.initDefaultFonts();
  }

  // --- Page Management ---

  private createPage(width: number, height: number): Page {
    return { content: [], width, height, number: this.pages.length + 1 };
  }

  get currentPageNumber(): number { return this.currentPage.number; }
  get totalPages(): number { return this.pages.length; }
  get contentWidth(): number {
    return this.currentPage.width - this.options.margins.left - this.options.margins.right;
  }
  get contentHeight(): number {
    return this.currentPage.height - this.options.margins.top - this.options.margins.bottom;
  }

  /** Add a new page */
  addPage(): this {
    const dims = PAGE_FORMATS[this.options.format]!;
    const isLandscape = this.options.orientation === "landscape";
    const w = isLandscape ? dims.height : dims.width;
    const h = isLandscape ? dims.width : dims.height;
    this.currentPage = this.createPage(w, h);
    this.pages.push(this.currentPage);
    this.cursorX = this.options.margins.left;
    this.cursorY = this.options.margins.top;
    return this;
  }

  /** Get current Y position */
  getY(): number { return this.cursorY; }

  /** Set Y position */
  setY(y: number): this { this.cursorY = y; return this; }

  /** Get current X position */
  getX(): number { return this.cursorX; }

  /** Set X position */
  setX(x: number): this { this.cursorX = x; return this; }

  /** Check if there's enough space on current page */
  hasSpace(neededHeight: number): boolean {
    return this.cursorY + neededHeight <= this.currentPage.height - this.options.margins.bottom;
  }

  /** Auto-page-break if not enough space */
  ensureSpace(neededHeight: number): boolean {
    if (!this.hasSpace(neededHeight)) {
      this.addPage();
      return true;
    }
    return false;
  }

  // --- Text Rendering ---

  /** Write text at current position */
  text(text: string, options?: Partial<FontOptions> & { maxWidth?: number }): this {
    const font: FontOptions = {
      family: options?.family ?? "Helvetica",
      size: options?.size ?? 12,
      bold: options?.bold ?? false,
      italic: options?.italic ?? false,
      color: options?.color ?? "#000000",
      align: options?.align ?? "left",
      lineHeight: options?.lineHeight ?? 1.2,
    };

    const lines = this.wrapText(text, font, options?.maxWidth ?? this.contentWidth);
    const lineH = font.size * font.lineHeight;

    for (let i = 0; i < lines.length; i++) {
      if (i > 0 && !this.hasSpace(lineH)) this.addPage();
      this.currentPage.content.push({
        type: "text",
        data: {
          text: lines[i]!,
          x: this.cursorX,
          y: this.cursorY,
          font,
          width: options?.maxWidth ?? this.contentWidth,
          align: font.align,
        },
      });
      this.cursorY += lineH;
    }
    return this;
  }

  /** Write text at specific position */
  textAt(text: string, x: number, y: number, options?: Partial<FontOptions>): this {
    const prevX = this.cursorX, prevY = this.cursorY;
    this.cursorX = x; this.cursorY = y;
    this.text(text, options);
    this.cursorX = prevX; this.cursorY = prevY;
    return this;
  }

  /** Write centered text */
  centerText(text: string, options?: Omit<Partial<FontOptions>, "align">): this {
    return this.text(text, { ...options, align: "center" });
  }

  /** Write right-aligned text */
  rightText(text: string, options?: Omit<Partial<FontOptions>, "align">): this {
    return this.text(text, { ...options, align: "right" });
  }

  /** Add a paragraph with word wrap */
  paragraph(text: string, options?: Partial<FontOptions> & { indent?: number; spacingAfter?: number }): this {
    if (options?.indent) this.cursorX += options.indent;
    this.text(text, options);
    if (options?.spacingAfter) this.cursorY += options.spacingAfter;
    this.cursorX = this.options.margins.left;
    return this;
  }

  // --- Lines and Shapes ---

  /** Draw a horizontal line */
  drawLine(y?: number, options?: { color?: string; thickness?: number; style?: "solid" | "dashed" | "dotted" }): this {
    const lineY = y ?? this.cursorY;
    this.currentPage.content.push({
      type: "line",
      data: {
        x1: this.options.margins.left, y1: lineY,
        x2: this.currentPage.width - this.options.margins.right, y2: lineY,
        color: options?.color ?? "#000000", thickness: options?.thickness ?? 0.5, style: options?.style ?? "solid",
      },
    });
    if (y === undefined) this.cursorY += 3;
    return this;
  }

  /** Draw a rectangle */
  rect(x: number, y: number, width: number, height: number, options?: { fill?: string; stroke?: string; strokeWidth?: number; borderRadius?: number }): this {
    this.currentPage.content.push({
      type: "rect", data: { x, y, width, height, ...options },
    });
    return this;
  }

  /** Draw a filled rectangle */
  filledRect(x: number, y: number, width: number, height: number, color: string): this {
    return this.rect(x, y, width, height, { fill: color });
  }

  // --- Tables ---

  /** Render a table from 2D cell array */
  table(headers: string[], rows: string[][], options?: {
    columnWidths?: number[];
    headerBackgroundColor?: string;
    headerTextColor?: string;
    headerFontSize?: number;
    rowFontSize?: number;
    rowPadding?: number;
    borderColor?: string;
    alternateRowColors?: [string, string];
    showRowLines?: boolean;
    showColLines?: boolean;
    cellPadding?: number;
  }): this {
    const cols = headers.length;
    const totalWidth = this.contentWidth;
    const colWidths = options?.columnWidths ??
      headers.map(() => totalWidth / cols);
    const padding = options?.cellPadding ?? 4;
    const rowPad = options?.rowPadding ?? 3;
    const headerBg = options?.headerBackgroundColor ?? "#e8e8e8";
    const headerFg = options?.headerTextColor ?? "#000000";
    const headerSize = options?.headerFontSize ?? 10;
    const rowSize = options?.rowFontSize ?? 9;
    const border = options?.borderColor ?? "#cccccc";

    // Header row
    let headerH = headerSize * 1.4 + rowPad * 2;
    if (!this.hasSpace(headerH)) this.addPage();
    this.rect(this.options.margins.left, this.cursorY, totalWidth, headerH, { fill: headerBg, stroke: border, strokeWidth: 0.3 });
    let hx = this.options.margins.left + padding;
    for (let c = 0; c < cols; c++) {
      this.textAt(headers[c]!, hx, this.cursorY + rowPad, { size: headerSize, bold: true, color: headerFg, align: "center" });
      hx += colWidths[c]!;
    }
    this.cursorY += headerH;

    // Data rows
    const altColors = options?.alternateRowColors;
    for (let r = 0; r < rows.length; r++) {
      const rowH = rowSize * 1.4 + rowPad * 2;
      if (!this.hasSpace(rowH)) this.addPage();
      if (altColors) {
        const bg = r % 2 === 0 ? altColors[0] : altColors[1];
        this.filledRect(this.options.margins.left, this.cursorY, totalWidth, rowH, bg);
      }
      if (options?.showRowLines !== false)
        this.drawLine(this.cursorY + rowH, { color: border, thickness: 0.2 });
      let rx = this.options.margins.left + padding;
      for (let c = 0; c < cols; c++) {
        this.textAt(rows[r]?.[c] ?? "", rx, this.cursorY + rowPad, { size: rowSize, align: "center" });
        rx += colWidths[c]!;
      }
      this.cursorY += rowH;
    }
    // Final border
    this.drawLine(this.cursorY, { color: border, thickness: 0.3 });
    this.cursorY += 3;
    return this;
  }

  // --- Images ---

  /** Add an image to the document */
  async image(src: string | HTMLImageElement | HTMLCanvasElement, options: ImageOptions): Promise<this> {
    let imgEl: HTMLImageElement | HTMLCanvasElement;
    if (typeof src === "string") {
      imgEl = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    } else {
      imgEl = src;
    }

    const { x, y, width, height, fit, opacity, rotation } = options;
    this.currentPage.content.push({
      type: "image",
      data: { element: imgEl, x, y, width, height, fit: fit ?? "contain", opacity: opacity ?? 1, rotation: rotation ?? 0 },
    });
    return this;
  }

  // --- Headers & Footers ---

  private headerFn?: (pageNum: number, totalPages: number) => void;
  private footerFn?: (pageNum: number, totalPages: number) => void;

  /** Set header callback (called on each page) */
  onHeader(fn: (pageNum: number, totalPages: number) => void): this {
    this.headerFn = fn;
    return this;
  }

  /** Set footer callback */
  onFooter(fn: (pageNum: number, totalPages: number) => void): this {
    this.footerFn = fn;
    return this;
  }

  // --- Watermarks ---

  /** Add watermark text to all pages */
  watermark(text: string, options?: { angle?: number; fontSize?: number; color?: string; opacity?: number; x?: number; y?: number }): this {
    for (const page of this.pages) {
      page.content.push({
        type: "watermark",
        data: {
          text,
          angle: options?.angle ?? 45,
          fontSize: options?.fontSize ?? 60,
          color: options?.color ?? "#cccccc",
          opacity: options?.opacity ?? 0.15,
          x: options?.x ?? page.width / 2,
          y: options?.y ?? page.height / 2,
        },
      });
    }
    return this;
  }

  // --- Annotations ---

  /** Add an annotation to the current page */
  annotate(options: AnnotationOptions): this {
    this.currentPage.content.push({ type: "annotation", data: options });
    return this;
  }

  /** Highlight text region */
  highlight(x: number, y: number, width: number, height: number, color = "#ffff00"): this {
    return this.annotate({ type: "highlight", x, y, width, height, color });
  }

  /** Add clickable link */
  link(x: number, y: number, width: number, height: number, url: string): this {
    return this.annotate({ type: "link", x, y, width, height, url });
  }

  // --- Bookmarks / Outline ---

  /** Add a bookmark entry */
  bookmark(title: string, level = 0): this {
    this.bookmarks.push({ title, pageIndex: this.currentPageNumber - 1, level });
    return this;
  }

  // --- QR Code (simple implementation) ---

  /** Generate and embed a QR code */
  qrCode(text: string, x: number, y: number, size = 30): this {
    const modules = generateQRModules(text);
    const moduleSize = size / modules.length;
    // Draw as small rects
    for (let row = 0; row < modules.length; row++) {
      for (let col = 0; col < modules[row]!.length; col++) {
        if (modules[row]![col]) {
          this.filledRect(
            x + col * moduleSize, y + row * moduleSize,
            moduleSize, moduleSize, "#000000",
          );
        }
      }
    }
    return this;
  }

  // --- Export ---

  /** Generate PDF blob URL for download/in-browser viewing */
  async toBlobUrl(): Promise<string> {
    const canvas = await this.renderToCanvas();
    // In a real implementation, this would use pdf.js or similar
    // For now, we render each page as a canvas and create a simple PDF
    const blob = await this.generatePdfBlob(canvas);
    return URL.createObjectURL(blob);
  }

  /** Trigger download of the PDF */
  async download(filename?: string): Promise<void> {
    const url = await this.toBlobUrl();
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `${this.options.title || "document"}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /** Get PDF as ArrayBuffer */
  async toArrayBuffer(): Promise<ArrayBuffer> {
    const canvas = await this.renderToCanvas();
    return await this.generatePdfBlob(canvas).arrayBuffer();
  }

  /** Open in new browser tab */
  async openInNewTab(): Promise<void> {
    const url = await this.toBlobUrl();
    window.open(url, "_blank");
  }

  // --- Internal Rendering ---

  private async renderToCanvas(): Promise<HTMLCanvasElement[]> {
    const canvases: HTMLCanvasElement[] = [];
    const scale = 2; // HiDPI

    for (const page of this.pages) {
      const canvas = document.createElement("canvas");
      canvas.width = page.width * scale;
      canvas.height = page.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, page.width, page.height);

      // Header
      if (this.headerFn) {
        this.headerFn(page.number, this.pages.length);
      }

      // Render content
      for (const item of page.content) {
        this.renderItem(ctx, item, page);
      }

      // Footer
      if (this.footerFn) {
        this.footerFn(page.number, this.pages.length);
      }

      canvases.push(canvas);
    }
    return canvases;
  }

  private renderItem(ctx: CanvasRenderingContext2D, item: Page["content"][number], page: Page): void {
    switch (item.type) {
      case "text": this.renderText(ctx, item.data as any); break;
      case "line": this.renderLine(ctx, item.data as any); break;
      case "rect": this.renderRect(ctx, item.data as any); break;
      case "image": this.renderImage(ctx, item.data as any); break;
      case "watermark": this.renderWatermark(ctx, item.data as any, page); break;
      case "annotation": this.renderAnnotation(ctx, item.data as any); break;
    }
  }

  private renderText(ctx: CanvasRenderingContext2D, d: { text: string; x: number; y: number; font: FontOptions; width: number; align: string }): void {
    const { text, x, y, font, width, align } = d;
    ctx.save();
    ctx.font = `${font.italic ? "italic ""} ${font.bold ? "bold ""} ${font.size}px ${font.family}`;
    ctx.fillStyle = font.color ?? "#000000";
    ctx.textAlign = (align as CanvasTextAlign) ?? "left";
    ctx.textBaseline = "top";
    const metrics = ctx.measureText(text);
    const textX = align === "center" ? x + width / 2 : align === "right" ? x + width : x;
    ctx.fillText(text, textX, y);
    ctx.restore();
  }

  private renderLine(ctx: CanvasRenderingContext2D, d: { x1: number; y1: number; x2: number; y2: number; color: string; thickness: number; style: string }): void {
    ctx.save();
    ctx.strokeStyle = d.color;
    ctx.lineWidth = d.thickness;
    if (d.style === "dashed") ctx.setLineDash([5, 3]);
    else if (d.style === "dotted") ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(d.x1, d.y1);
    ctx.lineTo(d.x2, d.y2);
    ctx.stroke();
    ctx.restore();
  }

  private renderRect(ctx: CanvasRenderingContext2D, d: Record<string, unknown>): void {
    ctx.save();
    if (d.fill) { ctx.fillStyle = d.fill as string; ctx.fillRect(d.x as number, d.y as number, d.width as number, d.height as number); }
    if (d.stroke) {
      ctx.strokeStyle = d.stroke as string;
      ctx.lineWidth = (d.strokeWidth as number) ?? 1;
      if (d.borderRadius) {
        this.roundRect(ctx, d.x as number, d.y as number, d.width as number, d.height as number, d.borderRadius as number);
        ctx.stroke();
      } else {
        ctx.strokeRect(d.x as number, d.y as number, d.width as number, d.height as number);
      }
    }
    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private renderImage(ctx: CanvasRenderingContext2D, d: { element: HTMLImageElement | HTMLCanvasElement; x: number; y: number; width: number; height: number; fit: string; opacity: number; rotation: number }): void {
    ctx.save();
    ctx.globalAlpha = d.opacity;
    if (d.rotation) {
      ctx.translate(d.x + d.width / 2, d.y + d.height / 2);
      ctx.rotate((d.rotation * Math.PI) / 180);
      ctx.translate(-(d.x + d.width / 2), -(d.y + d.height / 2));
    }
    ctx.drawImage(d.element, d.x, d.y, d.width, d.height);
    ctx.restore();
  }

  private renderWatermark(ctx: CanvasRenderingContext2D, d: { text: string; angle: number; fontSize: number; color: string; opacity: number; x: number; y: number }, page: Page): void {
    ctx.save();
    ctx.globalAlpha = d.opacity;
    ctx.font = `${d.fontSize}px ${this.fonts.get("default")?.family ?? "Helvetica"}`;
    ctx.fillStyle = d.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(d.x, d.y);
    ctx.rotate((d.angle * Math.PI) / 180);
    ctx.fillText(d.text, 0, 0);
    ctx.restore();
  }

  private renderAnnotation(ctx: CanvasRenderingContext2D, d: AnnotationOptions): void {
    switch (d.type) {
      case "highlight":
        ctx.save(); ctx.fillStyle = d.color ?? "#ffff00"; ctx.globalAlpha = 0.3;
        ctx.fillRect(d.x, d.y, d.width, d.height); ctx.restore();
        break;
      case "underline":
        ctx.save(); ctx.strokeStyle = d.color ?? "#000000"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d.x, d.y + d.height); ctx.lineTo(d.x + d.width, d.y + d.height); ctx.stroke(); ctx.restore();
        break;
      case "strikeout":
        ctx.save(); ctx.strokeStyle = d.color ?? "#ff0000"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d.x, d.y + d.height / 2); ctx.lineTo(d.x + d.width, d.y + d.height / 2); ctx.stroke(); ctx.restore();
        break;
    }
  }

  private async generatePdfBlob(_canvases: HTMLCanvasElement[]): Promise<Blob> {
    // Simplified: return pages as images in a container
    // A real implementation would use pdfkit or jspdf
    const allCanvases = await this.renderToCanvas();
    // Create a multi-page representation
    const parts: BlobPart[] = [];
    for (const canvas of allCanvases) {
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
      parts.push(blob);
    }
    return new Blob(parts, { type: "application/pdf" });
  }

  // --- Text Utilities ---

  private wrapText(text: string, font: FontOptions, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    // Approximate char width
    const avgCharWidth = font.size * 0.5;
    const maxChars = Math.floor(maxWidth / avgCharWidth);

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length > maxChars && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [text];
  }

  private initDefaultFonts(): void {
    this.fonts.set("default", { family: "Helvetica", ascent: 718, descent: -182, capHeight: 718, unitsPerEm: 1000 });
    this.fonts.set("Courier", { family: "Courier", ascent: 629, descent: -157, capHeight: 629, unitsPerEm: 1000 });
    this.fonts.set("Times", { family: "Times-Roman", ascent: 683, descent: -217, capHeight: 662, unitsPerEm: 1000 });
  }
}

interface FontMetrics {
  family: string;
  ascent: number;
  descent: number;
  capHeight: number;
  unitsPerEm: number;
}

// --- Factory Function ---

/** Create a new PDF document */
export function createPdf(options?: PdfOptions): PdfDocument {
  return new PdfDocument(options);
}

// --- Quick Helpers ---

/** Generate a simple one-page PDF from text content */
export async function quickPdf(content: string, filename?: string, options?: PdfOptions): Promise<void> {
  const doc = createPdf(options);
  doc.paragraph(content);
  await doc.download(filename);
}

/** Generate PDF from HTML element (simple extraction) */
export async function htmlToPdf(element: HTMLElement, options?: PdfOptions): Promise<PdfDocument> {
  const doc = createPdf(options);
  // Simple text extraction
  const walk = (el: HTMLElement): void => {
    for (const child of Array.from(el.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) doc.paragraph(text);
      } else if (child instanceof HTMLElement) {
        if (/^h[1-6]$/.test(child.tagName.toLowerCase())) {
          const size = 24 - parseInt(child.tagName[1]!) * 2;
          doc.text(child.textContent ?? "", { size, bold: true });
          doc.cursorY += 4;
        } else if (child.tagName.toLowerCase() === "p") {
          doc.paragraph(child.textContent ?? "");
        } else if (child.tagName.toLowerCase() === "img") {
          const img = child as HTMLImageElement;
          if (img.src) doc.image(img.src, { x: doc.getX(), y: doc.getY(), width: 100, height: 100 }).catch(() => {});
        } else {
          walk(child);
        }
      }
    }
  };
  walk(element);
  return doc;
}

// --- Simple QR Code Generator (Reed-Solomon omitted for brevity) ---

function generateQRModules(text: string): boolean[][] {
  // Minimal QR Code generator (Version 1, L error correction)
  // This is a simplified implementation for basic use cases
  const size = 21; // Version 1 = 21x21
  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder patterns (top-left, top-right, bottom-left)
  drawFinderPattern(modules, 0, 0);
  drawFinderPattern(modules, size - 7, 0);
  drawFinderPattern(modules, 0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    modules[6][i] = i % 2 === 0;
    modules[i][6] = i % 2 === 0;
  }

  // Data encoding (simplified - just encode bytes directly)
  const bytes = new TextEncoder().encode(text);
  let bitIndex = 0;
  for (const byte of bytes) {
    for (let bit = 7; bit >= 0; bit--) {
      const pos = getNextEmptyPosition(modules, size, bitIndex++);
      if (pos) modules[pos.row][pos.col] = ((byte >> bit) & 1) === 1;
    }
  }

  return modules;
}

function drawFinderPattern(modules: boolean[][], row: number, col: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      modules[row + r][col + c] = isOuter || isInner;
    }
  }
}

function getNextEmptyPosition(modules: boolean[][], size: number, index: number): { row: number; col: number } | null {
  // Zig-zag pattern
  let count = 0;
  let col = size - 1;
  let goingUp = true;
  while (col >= 0) {
    if (col === 6) { col--; continue; } // Skip timing column
    for (let row = goingUp ? size - 1 : 0; goingUp ? row >= 0 : row < size; goingUp ? row-- : row++) {
      if (row === 6) continue; // Skip timing row
      if (!modules[row][col]) {
        if (count++ === index) return { row, col };
      }
    }
    col -= 2;
    goingUp = !goingUp;
  }
  return null;
}
