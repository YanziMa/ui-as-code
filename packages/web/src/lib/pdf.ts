/**
 * PDF generation and parsing utilities (client-side, no external dependencies).
 */

export interface PdfOptions {
  /** Page size */
  size?: "A4" | "Letter" | "Legal";
  /** Orientation */
  orientation?: "portrait" | "landscape";
  /** Margins in mm */
  margins?: { top: number; right: number; bottom: number; left: number };
  /** Title metadata */
  title?: string;
  /** Author metadata */
  author?: string;
  /** Subject metadata */
  subject?: string;
}

export interface PdfTextOptions {
  font?: string;
  size?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
}

/** Page sizes in points (1/72 inch) */
const PAGE_SIZES = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
};

const MM_TO_PT = 2.8346456693;

/** Simple PDF builder - generates basic PDF documents with text content */
export class PdfBuilder {
  private pages: PdfPage[] = [];
  private currentPage: PdfPage;
  private options: Required<PdfOptions>;
  private objects: PdfObject[] = [];
  private x: number;
  private y: number;

  constructor(options: PdfOptions = {}) {
    this.options = {
      size: options.size ?? "A4",
      orientation: options.orientation ?? "portrait",
      margins: options.margins ?? { top: 20, right: 20, bottom: 20, left: 20 },
      title: options.title ?? "",
      author: options.author ?? "",
      subject: options.subject ?? "",
    };

    const pageSize = PAGE_SIZES[this.options.size];
    this.currentPage = this.createPage();
    this.pages.push(this.currentPage);
    this.x = this.options.margins.left * MM_TO_PT;
    this.y = pageSize.height - this.options.margins.top * MM_TO_PT;
  }

  /** Add text at current position */
  text(content: string, options: PdfTextOptions = {}): this {
    const fontSize = options.size ?? 12;
    const lineHeight = (options.lineHeight ?? 1.5) * fontSize;

    // Simple word wrapping
    const maxWidth = this.getContentWidth();
    const words = content.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (this.measureText(testLine, fontSize) > maxWidth && line) {
        this.addTextLine(line, options);
        line = word;
        if (this.y < this.options.margins.bottom * MM_TO_PT + lineHeight) {
          this.newPage();
        }
      } else {
        line = testLine;
      }
    }

    if (line) {
      this.addTextLine(line, options);
    }

    return this;
  }

  /** Add text as heading */
  heading(text: string, level: 1 | 2 | 3 = 1): this {
    const sizes = { 1: 24, 2: 18, 3: 14 };
    const spacing = { 1: 20, 2: 14, 3: 10 };
    this.moveY(spacing[level] as number);
    return this.text(text, { size: sizes[level], bold: true });
  }

  /** Add a paragraph with spacing */
  paragraph(text: string, options?: PdfTextOptions): this {
    this.text(text, options);
    this.moveY(6);
    return this;
  }

  /** Add horizontal rule */
  hr(): this {
    this.currentPage.content.push({
      type: "line",
      x1: this.x,
      y1: this.y,
      x2: this.x + this.getContentWidth(),
      y2: this.y,
      width: 0.5,
      color: "#000000",
    });
    this.moveY(8);
    return this;
  }

  /** Add spacing */
  spacing(mm: number): this {
    this.moveY(mm);
    return this;
  }

  /** Move to next page */
  newPage(): this {
    this.pages.push(this.createPage());
    this.currentPage = this.pages[this.pages.length - 1]!;
    this.x = this.options.margins.left * MM_TO_PT;
    const pageSize = PAGE_SIZES[this.options.size];
    this.y = pageSize.height - this.options.margins.top * MM_TO_PT;
    return this;
  }

  /** Set X position */
  setX(x: number): this {
    this.x = x;
    return this;
  }

  /** Get current Y position */
  getY(): number {
    return this.y;
  }

  /** Generate the PDF as ArrayBuffer */
  async generate(): Promise<ArrayBuffer> {
    return this.buildPdf();
  }

  /** Generate the PDF as Blob for download */
  async generateBlob(): Promise<Blob> {
    const buffer = await this.generate();
    return new Blob([buffer], { type: "application/pdf" });
  }

  /** Download the PDF */
  async download(filename = "document.pdf"): Promise<void> {
    const blob = await this.generateBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  // --- Internal ---

  private createPage(): PdfPage {
    return { content: [], pageNumber: this.pages.length + 1 };
  }

  private getContentWidth(): number {
    const pageSize = PAGE_SIZES[this.options.size];
    return pageSize.width - (this.options.margins.left + this.options.margins.right) * MM_TO_PT;
  }

  private measureText(text: string, fontSize: number): number {
    // Approximate: average char width ~ 0.5 * fontSize
    return text.length * fontSize * 0.55;
  }

  private addTextLine(text: string, options: PdfTextOptions): void {
    const fontSize = options.size ?? 12;
    const lineHeight = (options.lineHeight ?? 1.5) * fontSize;

    this.currentPage.content.push({
      type: "text",
      x: this.x,
      y: this.y,
      text,
      font: options.font ?? "Helvetica",
      size: fontSize,
      color: options.color ?? "#000000",
      bold: options.bold ?? false,
      italic: options.italic ?? false,
      align: options.align ?? "left",
    });

    this.y -= lineHeight;
  }

  private moveY(mm: number): void {
    this.y -= mm * MM_TO_PT;
  }

  private async buildPdf(): Promise<ArrayBuffer> {
    // Build minimal valid PDF
    const pdf = this.buildMinimalPdf();
    return pdf;
  }

  private buildMinimalPdf(): ArrayBuffer {
    // This creates a simplified PDF structure
    // For production use, consider using jsPDF or pdfkit
    const parts: string[] = [];

    // Header
    parts.push("%PDF-1.4");
    parts.push("%\xE2\xE3\xCF\xD3");

    // Object offsets (we'll track these)
    const offsets: number[] = [];

    // Catalog object (obj 1)
    offsets.push(parts.length);
    parts.push("1 0 obj");
    parts.push("<< /Type /Catalog /Pages 2 0 R >>");
    parts.push("endobj");

    // Pages object (obj 2)
    offsets.push(parts.length);
    parts.push("2 0 obj");
    parts.push(`<< /Type /Pages /Kids [${this.pages.map((_, i) => `${3 + i} 0 R`).join(" ")}] /Count ${this.pages.length} >>`);
    parts.push("endobj");

    // Page objects
    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i]!;
      const pageSize = PAGE_SIZES[this.options.size];
      const isLandscape = this.options.orientation === "landscape";

      offsets.push(parts.length);
      parts.push(`${3 + i} 0 obj`);
      parts.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${isLandscape ? pageSize.height : pageSize.width} ${isLandscape ? pageSize.width : pageSize.height}] >>`);
      parts.push("endobj");

      // Content stream for each page
      const streamContent = this.buildPageStream(page);
      const stream = this.encodeStream(streamContent);

      offsets.push(parts.length);
      parts.push(`${3 + this.pages.length + i} 0 obj`);
      parts.push(`<< /Length ${stream.length} >>`);
      parts.push("stream");
      parts.push(stream);
      parts.push("endstream");
      parts.push("endobj");
    }

    // XRef table
    const xrefOffset = parts.join("\n").length;
    parts.push("xref");
    parts.push(`0 ${offsets.length + 1}`);
    parts.push("0000000000 65535 f ");
    for (const offset of offsets) {
      parts.push(`${String(offset).padStart(10, "0")} 00000 n ");
    }

    // Trailer
    parts.push("trailer");
    parts.push(`<< /Size ${offsets.length + 1} /Root 1 0 R >>`);
    parts.push("startxref");
    parts.push(String(xrefOffset));
    parts.push("%%EOF");

    // Convert to ArrayBuffer
    const str = parts.join("\n");
    const buffer = new ArrayBuffer(str.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i)!;
    }
    return buffer;
  }

  private buildPageStream(page: PdfPage): string {
    const ops: string[] = [];

    for (const item of page.content) {
      if (item.type === "text") {
        ops.push("BT");
        ops.push(`/F1 ${item.size} Tf`);
        ops.push(`${item.color === "#000000" ? "0 0 0 rg" : this.hexToRgb(item.color)} rg`);
        if (item.align === "center") {
          ops.push(`${item.x + this.getContentWidth() / 2} ${item.y} Td`);
          ops.push(`(${this.escapePdfString(item.text)}) Tj`);
        } else {
          ops.push(`${item.x} ${item.y} Td`);
          ops.push(`(${this.escapePdfString(item.text)}) Tj`);
        }
        ops.push("ET");
      } else if (item.type === "line") {
        ops.push(`${item.width} w`);
        ops.push(this.hexToRgb(item.color === "#000000" ? "0 0 0" : item.color));
        ops.push(`${item.x1} ${item.y1} m ${item.x2} ${item.y2} l S`);
      }
    }

    return ops.join("\n");
  }

  private hexToRgb(hexOrRgb: string): string {
    if (hexOrRgb.includes(" ")) return hexOrRgb; // Already RGB
    const match = hexOrRgb.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!match) return "0 0 0";
    return `${parseInt(match[1]!, 16) / 255} ${parseInt(match[2]!, 16) / 255} ${parseInt(match[3]!, 16) / 255} rg`;
  }

  private escapePdfString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\n/g, "\\n");
  }

  private encodeStream(str: string): string {
    // Simple ASCII85 encoding placeholder (for now just return as-is)
    return str;
  }
}

interface PdfPage {
  content: Array<PdfTextItem | PdfLineItem>;
  pageNumber: number;
}

interface PdfTextItem {
  type: "text";
  x: number;
  y: number;
  text: string;
  font: string;
  size: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: string;
}

interface PdfLineItem {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  color: string;
}

interface PdfObject {
  id: number;
  data: unknown;
}
