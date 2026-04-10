/**
 * Canvas drawing utilities — shapes, gradients, text, images, patterns,
 * and a lightweight drawing context manager.
 */

// --- Types ---

export interface Point2D {
  x: number;
  y: number;
}

export interface CanvasSize {
  width: number;
  height: number;
}

export interface DrawOptions {
  /** Fill color */
  fill?: string;
  /** Stroke color */
  stroke?: string;
  /** Line width */
  lineWidth?: number;
  /** Opacity (0-1) */
  opacity?: number;
  /** Shadow blur */
  shadowBlur?: number;
  /** Shadow color */
  shadowColor?: string;
  /** Shadow offset X */
  shadowOffsetX?: number;
  /** Shadow offset Y */
  shadowOffsetY?: number;
  /** Global composite operation */
  globalCompositeOperation?: GlobalCompositeOperation;
  /** Line cap style */
  lineCap?: CanvasLineCap;
  /** Line join style */
  lineJoin?: CanvasLineJoin;
  /** Dash pattern */
  dashPattern?: number[];
}

export interface TextOptions {
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  maxWidth?: number;
  lineHeight?: number;
}

export interface GradientStop {
  offset: number; // 0-1
  color: string;
}

// --- Context Manager ---

/**
 * Wrapper around CanvasRenderingContext2D with save/restore automation,
 * option merging, and common drawing helpers.
 */
export class CanvasContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  private dpr: number;

  constructor(canvas: HTMLCanvasElement, options?: { width?: number; height?: number; dpr?: number }) {
    this.dpr = options?.dpr ?? (window.devicePixelRatio || 1);
    this.width = options?.width ?? (canvas.width / this.dpr);
    this.height = options?.height ?? (canvas.height / this.dpr);

    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;

    this.ctx = canvas.getContext("2d")!;
    this.ctx.scale(this.dpr, this.dpr);
  }

  /** Clear entire canvas */
  clear(color?: string): void {
    if (color) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }

  /** Save context state, apply options, run fn, restore */
  withOptions<T>(opts: DrawOptions, fn: () => T): T {
    this.ctx.save();
    this.applyOptions(opts);
    const result = fn();
    this.ctx.restore();
    return result;
  }

  private applyOptions(opts: DrawOptions): void {
    if (opts.fill !== undefined) this.ctx.fillStyle = opts.fill;
    if (opts.stroke !== undefined) this.ctx.strokeStyle = opts.stroke;
    if (opts.lineWidth !== undefined) this.ctx.lineWidth = opts.lineWidth;
    if (opts.opacity !== undefined) this.ctx.globalAlpha = opts.opacity;
    if (opts.shadowBlur !== undefined) this.ctx.shadowBlur = opts.shadowBlur;
    if (opts.shadowColor !== undefined) this.ctx.shadowColor = opts.shadowColor;
    if (opts.shadowOffsetX !== undefined) this.ctx.shadowOffsetX = opts.shadowOffsetX;
    if (opts.shadowOffsetY !== undefined) this.ctx.shadowOffsetY = opts.shadowOffsetY;
    if (opts.globalCompositeOperation !== undefined) this.ctx.globalCompositeOperation = opts.globalCompositeOperation;
    if (opts.lineCap !== undefined) this.ctx.lineCap = opts.lineCap;
    if (opts.lineJoin !== undefined) this.ctx.lineJoin = opts.lineJoin;
    if (opts.dashPattern !== undefined) this.ctx.setLineDash(opts.dashPattern);
  }

  // --- Shape Primitives ---

  /** Draw filled/stroked rectangle */
  rect(x: number, y: number, w: number, h: number, opts?: DrawOptions): void {
    this.withOptions(opts ?? {}, () => {
      if (opts?.fill || (!opts?.stroke && !opts)) {
        this.ctx.fillRect(x, y, w, h);
      }
      if (opts?.stroke) {
        this.ctx.strokeRect(x, y, w, h);
      }
    });
  }

  /** Draw rounded rectangle */
  roundRect(x: number, y: number, w: number, h: number, radius: number, opts?: DrawOptions): void {
    this.withOptions(opts ?? {}, () => {
      const r = Math.min(radius, w / 2, h / 2);
      this.ctx.beginPath();
      this.ctx.moveTo(x + r, y);
      this.ctx.lineTo(x + w - r, y);
      this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      this.ctx.lineTo(x + w, y + h - r);
      this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.ctx.lineTo(x + r, y + h);
      this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      this.ctx.lineTo(x, y + r);
      this.ctx.quadraticCurveTo(x, y, x + r, y);
      this.ctx.closePath();
      if (opts?.fill || (!opts?.stroke && !opts)) this.ctx.fill();
      if (opts?.stroke) this.ctx.stroke();
    });
  }

  /** Draw circle */
  circle(cx: number, cy: number, radius: number, opts?: DrawOptions): void {
    this.withOptions(opts ?? {}, () => {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      if (opts?.fill || (!opts?.stroke && !opts)) this.ctx.fill();
      if (opts?.stroke) this.ctx.stroke();
    });
  }

  /** Draw ellipse */
  ellipse(cx: number, cy: number, rx: number, ry: number, rotation = 0, opts?: DrawOptions): void {
    this.withOptions(opts ?? {}, () => {
      this.ctx.beginPath();
      this.ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
      if (opts?.fill || (!opts?.stroke && !opts)) this.ctx.fill();
      if (opts?.stroke) this.ctx.stroke();
    });
  }

  /** Draw line between two points */
  line(from: Point2D, to: Point2D, opts?: DrawOptions): void {
    this.withOptions(opts ?? {}, () => {
      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.stroke();
    });
  }

  /** Draw polyline (connected lines) */
  polyline(points: Point2D[], close = false, opts?: DrawOptions): void {
    if (points.length < 2) return;
    this.withOptions(opts ?? {}, () => {
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        this.ctx.lineTo(points[i].x, points[i].y);
      }
      if (close) this.ctx.closePath();
      this.ctx.stroke();
    });
  }

  /** Draw polygon (closed shape) */
  polygon(points: Point2D[], opts?: DrawOptions): void {
    this.polyline(points, true, opts);
  }

  /** Draw arc/sector */
  arc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, opts?: DrawOptions): void {
    this.withOptions(opts ?? {}, () => {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, startAngle, endAngle);
      if (opts?.fill || (!opts?.stroke && !opts)) this.ctx.fill();
      if (opts?.stroke) this.ctx.stroke();
    });
  }

  // --- Path Drawing ---

  /** Begin a custom path (returns the context for chaining path commands) */
  beginPath(): CanvasRenderingContext2D {
    this.ctx.beginPath();
    return this.ctx;
  }

  /** Fill current path */
  fillPath(opts?: DrawOptions): void {
    this.withOptions(opts ?? {}, () => this.ctx.fill());
  }

  /** Stroke current path */
  strokePath(opts?: DrawOptions): void {
    this.withOptions(opts ?? {}, () => this.ctx.stroke());
  }

  // --- Text ---

  /** Draw text */
  text(str: string, x: number, y: number, opts?: TextOptions & DrawOptions): void {
    const fontOpts = {
      font: opts?.font ?? `${opts?.fontWeight ?? "normal"} ${opts?.fontSize ?? 14}px ${opts?.fontFamily ?? "-apple-system,sans-serif"}`,
      color: opts?.color ?? "#000",
      align: opts?.align ?? "left",
      baseline: opts?.baseline ?? "alphabetic",
    };

    this.withOptions({ ...opts, fill: fontOpts.color }, () => {
      this.ctx.font = fontOpts.font;
      this.ctx.textAlign = fontOpts.align;
      this.ctx.textBaseline = fontOpts.baseline;

      if (opts?.maxWidth) {
        // Multi-line support
        const lines = wrapText(this.ctx, str, opts.maxWidth, opts?.lineHeight);
        for (let i = 0; i < lines.length; i++) {
          this.ctx.fillText(lines[i], x, y + i * (opts?.lineHeight ?? opts?.fontSize ?? 14 * 1.2));
        }
      } else {
        this.ctx.fillText(str, x, y);
      }
    });
  }

  /** Measure text width */
  measureText(str: string, font?: string): TextMetrics {
    if (font) this.ctx.font = font;
    return this.ctx.measureText(str);
  }

  /** Get text metrics including height estimate */
  textSize(str: string, font?: string): { width: number; height: number } {
    const metrics = this.measureText(str, font);
    const fontSize = parseInt((font ?? this.ctx.font).match(/\d+/)?.[0] ?? "14", 10);
    return { width: metrics.width, height: fontSize * 1.2 };
  }

  // --- Gradients ---

  /** Create linear gradient */
  linearGradient(x0: number, y0: number, x1: number, y1: number, stops: GradientStop[]): CanvasGradient {
    const grad = this.ctx.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) grad.addColorStop(s.offset, s.color);
    return grad;
  }

  /** Create radial gradient */
  radialGradient(cx: number, cy: number, r0: number, r1: number, stops: GradientStop[]): CanvasGradient {
    const grad = this.ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    for (const s of stops) grad.addColorStop(s.offset, s.color);
    return grad;
  }

  /** Create conic gradient (fallback to radial on unsupported browsers) */
  conicGradient(cx: number, cy: number, angle: number, stops: GradientStop[]): CanvasGradient {
    if (typeof this.ctx.createConicGradient === "function") {
      const grad = this.ctx.createConicGradient(angle, cx, cy);
      for (const s of stops) grad.addColorStop(s.offset, s.color);
      return grad;
    }
    // Fallback: approximate with radial
    return this.radialGradient(cx, cy, 0, Math.max(this.width, this.height), stops);
  }

  // --- Images ---

  /** Draw image with optional sizing */
  drawImage(
    image: CanvasImageSource,
    dx: number, dy: number,
    dw?: number, dh?: number,
    sx?: number, sy?: number, sw?: number, sh?: number,
  ): void {
    if (sx !== undefined && sy !== undefined) {
      this.ctx.drawImage(image, sx, sy, sw!, sh!, dx, dy, dw!, dh!);
    } else if (dw !== undefined && dh !== undefined) {
      this.ctx.drawImage(image, dx, dy, dw, dh);
    } else {
      this.ctx.drawImage(image, dx, dy);
    }
  }

  /** Convert canvas to data URL */
  toDataURL(type = "image/png", quality = 0.92): string {
    return this.ctx.canvas.toDataURL(type, quality);
  }

  /** Convert canvas to Blob */
  async toBlob(type = "image/png", quality = 0.92): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.ctx.canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob failed")),
        type,
        quality,
      );
    });
  }

  // --- Clipping ---

  /** Clip to rectangle */
  clipRect(x: number, y: number, w: number, h: number, fn: () => void): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
    fn();
    this.ctx.restore();
  }

  /** Clip to circle */
  clipCircle(cx: number, cy: number, r: number, fn: () => void): void {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.clip();
    fn();
    this.ctx.restore();
  }

  // --- Transform ---

  /** Translate origin */
  translate(x: number, y: number, fn?: () => void): void {
    this.ctx.save();
    this.ctx.translate(x, y);
    fn?.();
    if (!fn) return; // User must call restore manually
    this.ctx.restore();
  }

  /** Rotate around point */
  rotate(angle: number, cx = 0, cy = 0, fn?: () => void): void {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(angle);
    this.ctx.translate(-cx, -cy);
    fn?.();
    if (!fn) return;
    this.ctx.restore();
  }

  /** Scale */
  scale(sx: number, sy: number, fn?: () => void): void {
    this.ctx.save();
    this.ctx.scale(sx, sy);
    fn?.();
    if (!fn) return;
    this.ctx.restore();
  }
}

// --- Standalone Helpers ---

/** Create a CanvasContext from a new canvas element */
export function createCanvas(width: number, height: number, container?: HTMLElement): CanvasContext {
  const canvas = document.createElement("canvas");
  if (container) container.appendChild(canvas);
  return new CanvasContext(canvas, { width, height });
}

/** Draw grid pattern on canvas */
export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, options: {
  cellSize?: number;
  color?: string;
  lineWidth?: number;
  subdivisions?: boolean;
} = {}): void {
  const { cellSize = 40, color = "#e5e7eb", lineWidth = 0.5, subdivisions = true } = options;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  // Major grid lines
  ctx.beginPath();
  for (let x = 0; x <= w; x += cellSize) {
    ctx.moveTo(x, 0); ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += cellSize) {
    ctx.moveTo(0, y); ctx.lineTo(w, y);
  }
  ctx.stroke();

  // Subdivisions
  if (subdivisions && cellSize > 20) {
    const sub = cellSize / 4;
    ctx.lineWidth = 0.25;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let x = sub; x < w; x += sub) {
      if (Math.round(x) % cellSize !== 0) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    }
    for (let y = sub; y < h; y += sub) {
      if (Math.round(y) % cellSize !== 0) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Draw checkerboard pattern (for transparency preview) */
export function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number, size = 8): void {
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? "#ccc" : "#fff";
      ctx.fillRect(x, y, size, size);
    }
  }
}

// --- Internal ---

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight?: number): string[] {
  const lines: string[] = [];
  const paragraph = text.split("\n");
  const lh = lineHeight ?? 16;

  for (const para of paragraph) {
    if (ctx.measureText(para).width <= maxWidth) {
      lines.push(para);
      continue;
    }

    let line = "";
    for (const char of para) {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
        lines.push(line);
        line = char;
      } else {
        line = testLine;
      }
    }
    lines.push(line);
  }

  return lines;
}
