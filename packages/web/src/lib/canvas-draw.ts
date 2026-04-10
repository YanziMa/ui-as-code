/**
 * canvas-draw.ts — Comprehensive HTML5 Canvas 2D Drawing Utilities
 *
 * Provides a CanvasManager class with shape drawing, text rendering, image handling,
 * chart primitives, path utilities, animation helpers, pattern generation, and more.
 */

// ─── Types & Interfaces ───────────────────────────────────────────────

export interface DrawOptions {
  fill?: string | CanvasGradient | CanvasPattern;
  stroke?: string;
  lineWidth?: number;
  lineDash?: number[];
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  opacity?: number;
  rotation?: number;
  globalCompositeOperation?: GlobalCompositeOperation;
}

export interface TextOptions {
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  color?: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  maxWidth?: number;
}

export interface ColorStop {
  offset: number;
  color: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EasingFn = (t: number) => number;

export interface AnimationController {
  play(): void;
  pause(): void;
  seek(progress: number): void;
  cancel(): void;
  readonly isPlaying: boolean;
  readonly progress: number;
}

// ─── Utility Functions ────────────────────────────────────────────────

/** Convert degrees to radians. */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Convert radians to degrees. */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Clamp value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Linear interpolation between a and b by factor t (0..1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ─── Easing Functions ─────────────────────────────────────────────────

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function easeInBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return c3 * t * t * t - c1 * t * t;
}

export function linear(t: number): number {
  return t;
}

// ─── CanvasManager Class ──────────────────────────────────────────────

export class CanvasManager {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D | null = null;

  constructor(canvas: HTMLCanvasElement | string) {
    if (typeof canvas === "string") {
      const el = document.querySelector(canvas);
      if (!(el instanceof HTMLCanvasElement)) {
        throw new Error(`Element "${canvas}" is not an HTMLCanvasElement`);
      }
      this._canvas = el;
    } else {
      this._canvas = canvas;
    }
  }

  /** Get or create the 2D rendering context. */
  getContext(): CanvasRenderingContext2D {
    if (!this._ctx) {
      this._ctx = this._canvas.getContext("2d");
      if (!this._ctx) throw new Error("Failed to acquire 2D context");
    }
    return this._ctx!;
  }

  get canvas(): HTMLCanvasElement {
    return this._canvas;
  }

  /** Resize the canvas with DPR-aware scaling. */
  resize(width: number, height: number): void {
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = width * dpr;
    this._canvas.height = height * dpr;
    this._canvas.style.width = `${width}px`;
    this._canvas.style.height = `${height}px`;
    const ctx = this.getContext();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** Auto-size to match the parent element's dimensions. */
  resizeToContainer(): void {
    const parent = this._canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.resize(rect.width, rect.height);
  }

  /** Clear the entire canvas. */
  clear(): void {
    const ctx = this.getContext();
    ctx.clearRect(0, 0, this._canvas.width / (window.devicePixelRatio || 1), this._canvas.height / (window.devicePixelRatio || 1));
  }

  save(): void { this.getContext().save(); }
  restore(): void { this.getContext().restore(); }

  /** Export as data URL. */
  toDataURL(type = "image/png", quality = 1): string {
    return this._canvas.toDataURL(type, quality);
  }

  /** Export as Blob. */
  toBlob(callback: BlobCallback): void {
    this._canvas.toBlob(callback);
  }

  /** Trigger file download of the canvas image. */
  download(filename = "canvas-export.png"): void {
    const link = document.createElement("a");
    link.download = filename;
    link.href = this.toDataURL();
    link.click();
  }

  // ── Internal helpers ─────────────────────────────────────────────

  private applyOptions(options?: DrawOptions): void {
    const ctx = this.getContext();
    if (!options) return;
    if (options.lineWidth != null) ctx.lineWidth = options.lineWidth;
    if (options.lineDash) ctx.setLineDash(options.lineDash);
    if (options.shadowColor) ctx.shadowColor = options.shadowColor;
    if (options.shadowBlur != null) ctx.shadowBlur = options.shadowBlur;
    if (options.shadowOffsetX != null) ctx.shadowOffsetX = options.shadowOffsetX;
    if (options.shadowOffsetY != null) ctx.shadowOffsetY = options.shadowOffsetY;
    if (options.opacity != null) ctx.globalAlpha = options.opacity;
    if (options.globalCompositeOperation) ctx.globalCompositeOperation = options.globalCompositeOperation;
  }

  private resetOptions(): void {
    const ctx = this.getContext();
    ctx.setLineDash([]);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private fillAndStroke(options?: DrawOptions): void {
    const ctx = this.getContext();
    if (options?.fill) {
      ctx.fillStyle = options.fill as string;
      ctx.fill();
    }
    if (options?.stroke) {
      ctx.strokeStyle = options.stroke;
      ctx.stroke();
    }
  }

  // ── Shape Drawing Methods ─────────────────────────────────────────

  drawRect(x: number, y: number, w: number, h: number, options?: DrawOptions): void {
    const ctx = this.getContext();
    ctx.beginPath();
    if (options?.rotation) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(options.rotation);
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ctx.rect(x, y, w, h);
    }
    this.applyOptions(options);
    this.fillAndStroke(options);
    this.resetOptions();
  }

  drawRoundedRect(x: number, y: number, w: number, h: number, radius = 8, options?: DrawOptions): void {
    const r = Math.min(radius, w / 2, h / 2);
    const ctx = this.getContext();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    this.applyOptions(options);
    this.fillAndStroke(options);
    this.resetOptions();
  }

  drawCircle(cx: number, cy: number, radius: number, options?: DrawOptions): void {
    const ctx = this.getContext();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.applyOptions(options);
    this.fillAndStroke(options);
    this.resetOptions();
  }

  drawEllipse(cx: number, cy: number, rx: number, ry: number, options?: DrawOptions): void {
    const ctx = this.getContext();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    this.applyOptions(options);
    this.fillAndStroke(options);
    this.resetOptions();
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, options?: DrawOptions): void {
    const ctx = this.getContext();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    this.applyOptions(options);
    if (options?.stroke) {
      ctx.strokeStyle = options.stroke;
      ctx.stroke();
    }
    this.resetOptions();
  }

  drawPolygon(points: Array<{ x: number; y: number }>, options?: DrawOptions): void {
    if (points.length < 3) return;
    const ctx = this.getContext();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    this.applyOptions(options);
    this.fillAndStroke(options);
    this.resetOptions();
  }

  drawTriangle(p1: Point, p2: Point, p3: Point, options?: DrawOptions): void {
    this.drawPolygon([p1, p2, p3], options);
  }

  drawStar(
    cx: number,
    cy: number,
    points: number,
    outerRadius: number,
    innerRadius?: number,
    rotation = 0,
    options?: DrawOptions
  ): void {
    const inner = innerRadius ?? outerRadius * 0.4;
    const step = Math.PI / points;
    const ctx = this.getContext();
    ctx.beginPath();
    for (let i = 0; i < 2 * points; i++) {
      const r = i % 2 === 0 ? outerRadius : inner;
      const angle = i * step + rotation - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    this.applyOptions(options);
    this.fillAndStroke(options);
    this.resetOptions();
  }

  drawArrow(from: Point, to: Point, headSize = 12, options?: DrawOptions): void {
    const ctx = this.getContext();
    const angle = Math.atan2(to.y - from.y, to.x - from.x);

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    this.applyOptions(options);
    if (options?.stroke) {
      ctx.strokeStyle = options.stroke;
      ctx.stroke();
    }

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - headSize * Math.cos(angle - Math.PI / 6), to.y - headSize * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - headSize * Math.cos(angle + Math.PI / 6), to.y - headSize * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    if (options?.fill) {
      ctx.fillStyle = options.fill as string;
      ctx.fill();
    } else if (options?.stroke) {
      ctx.stroke();
    }
    this.resetOptions();
  }

  // ── Gradient Helpers ──────────────────────────────────────────────

  createLinearGradient(x0: number, y0: number, x1: number, y1: number, colorStops: ColorStop[]): CanvasLinearGradient {
    const ctx = this.getContext();
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const stop of colorStops) grad.addColorStop(stop.offset, stop.color);
    return grad;
  }

  createRadialGradient(cx: number, cy: number, r0: number, r1: number, colorStops: ColorStop[]): CanvasRadialGradient {
    const ctx = this.getContext();
    const grad = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
    for (const stop of colorStops) grad.addColorStop(stop.offset, stop.color);
    return grad;
  }

  createConicGradient(cx: number, cy: number, startAngle: number, endAngle: number, colorStops: ColorStop[]): CanvasConicGradient {
    const ctx = this.getContext();
    // Use native conic gradient when available
    if ("createConicGradient" in ctx) {
      const grad = (ctx as any).createConicGradient(startAngle, cx, cy);
      for (const stop of colorStops) grad.addColorStop(stop.offset, stop.color);
      return grad;
    }
    // Fallback: approximate with radial segments
    const size = Math.max(this._canvas.width, this._canvas.height);
    const offscreen = document.createElement("canvas");
    offscreen.width = size;
    offscreen.height = size;
    const octx = offscreen.getContext("2d")!;
    const center = size / 2;
    const totalAngle = endAngle - startAngle;
    for (const stop of colorStops) {
      octx.beginPath();
      octx.moveTo(center, center);
      octx.arc(center, center, size, startAngle + totalAngle * stop.offset, startAngle + totalAngle * (stop.offset + 0.001));
      octx.closePath();
      octx.fillStyle = stop.color;
      octx.fill();
    }
    return ctx.createPattern(offscreen, "no-repeat") as unknown as CanvasConicGradient;
  }

  // ── Text Rendering ────────────────────────────────────────────────

  private resolveFont(options?: TextOptions): string {
    if (options?.font) return options.font;
    const size = options?.fontSize ?? 16;
    const family = options?.fontFamily ?? "sans-serif";
    const weight = options?.fontWeight ?? "normal";
    return `${weight} ${size}px ${family}`;
  }

  drawText(text: string, x: number, y: number, options?: TextOptions): TextMetrics {
    const ctx = this.getContext();
    const font = this.resolveFont(options);
    ctx.font = font;
    if (options?.align) ctx.textAlign = options.align;
    if (options?.baseline) ctx.textBaseline = options.baseline;
    if (options?.color) ctx.fillStyle = options.color;
    ctx.fillText(text, x, y);
    return ctx.measureText(text);
  }

  measureText(text: string, font?: string): TextMetrics {
    const ctx = this.getContext();
    ctx.font = font ?? this.resolveFont();
    return ctx.measureText(text);
  }

  wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight?: number, options?: TextOptions): { lines: number; height: number } {
    const ctx = this.getContext();
    const font = this.resolveFont(options);
    ctx.font = font;
    if (options?.align) ctx.textAlign = options.align;
    if (options?.baseline) ctx.textBaseline = options.baseline;
    if (options?.color) ctx.fillStyle = options.color;
    const lh = lineHeight ?? (options?.fontSize ?? 16) * 1.4;
    const words = text.split(/\s+/);
    let line = "";
    let currentY = y;
    let lineCount = 0;

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lh;
        lineCount++;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, currentY);
      lineCount++;
    }
    return { lines: lineCount, height: lineCount * lh };
  }

  drawMultilineText(lines: string[], x: number, y: number, lineHeight?: number, options?: TextOptions): void {
    const ctx = this.getContext();
    const font = this.resolveFont(options);
    ctx.font = font;
    if (options?.align) ctx.textAlign = options.align;
    if (options?.baseline) ctx.textBaseline = options.baseline;
    if (options?.color) ctx.fillStyle = options.color;
    const lh = lineHeight ?? (options?.fontSize ?? 16) * 1.4;
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lh));
  }

  // ── Image Drawing ─────────────────────────────────────────────────

  drawImage(
    image: HTMLImageElement | ImageBitmap,
    x: number,
    y: number,
    w?: number,
    h?: number,
    options?: DrawOptions
  ): void {
    const ctx = this.getContext();
    this.save();
    this.applyOptions(options);
    if (w != null && h != null) {
      ctx.drawImage(image, x, y, w, h);
    } else {
      ctx.drawImage(image, x, y);
    }
    this.restore();
    this.resetOptions();
  }

  drawImageFit(
    image: HTMLImageElement | ImageBitmap,
    x: number,
    y: number,
    w: number,
    h: number,
    fit: "cover" | "contain" | "fill" | "none" = "contain"
  ): void {
    const ctx = this.getContext();
    const iw = (image as HTMLImageElement).naturalWidth ?? (image as ImageBitmap).width;
    const ih = (image as HTMLImageElement).naturalHeight ?? (image as ImageBitmap).height;

    if (fit === "fill") {
      ctx.drawImage(image, x, y, w, h);
      return;
    }
    if (fit === "none") {
      ctx.drawImage(image, x, y);
      return;
    }

    const scaleW = w / iw;
    const scaleH = h / ih;
    let dw: number, dh: number;

    if (fit === "cover") {
      const s = Math.max(scaleW, scaleH);
      dw = iw * s;
      dh = ih * s;
    } else {
      const s = Math.min(scaleW, scaleH);
      dw = iw * s;
      dh = ih * s;
    }

    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(image, dx, dy, dw, dh);
  }

  loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  // ── Chart Primitives ──────────────────────────────────────────────

  drawBarChart(
    data: Array<{ value: number; label?: string; color?: string }>,
    rect: Rect,
    options?: DrawOptions & { barGap?: number; showLabels?: boolean }
  ): void {
    const ctx = this.getContext();
    const gap = options?.barGap ?? 4;
    const barWidth = (rect.width - gap * (data.length + 1)) / data.length;
    const maxVal = Math.max(...data.map(d => d.value), 1);

    data.forEach((d, i) => {
      const bh = (d.value / maxVal) * (rect.height - (options?.showLabels ? 20 : 0));
      const bx = rect.x + gap + i * (barWidth + gap);
      const by = rect.y + rect.height - bh - (options?.showLabels ? 20 : 0);
      this.drawRect(bx, by, barWidth, bh, { fill: d.color ?? "#4A90D9", ...options });
      if (options?.showLabels && d.label) {
        this.drawText(d.label, bx + barWidth / 2, rect.y + rect.height - 4, {
          fontSize: 10, align: "center", color: "#666"
        });
      }
    });
  }

  drawLineChart(
    data: Array<{ x: number; y: number }>,
    rect: Rect,
    options?: DrawOptions & { pointRadius?: number; showPoints?: boolean }
  ): void {
    if (data.length < 2) return;
    const ctx = this.getContext();
    const xs = data.map(d => d.x);
    const ys = data.map(d => d.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const mapX = (v: number) => rect.x + ((v - minX) / rangeX) * rect.width;
    const mapY = (v: number) => rect.y + rect.height - ((v - minY) / rangeY) * rect.height;

    ctx.beginPath();
    ctx.moveTo(mapX(data[0].x), mapY(data[0].y));
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(mapX(data[i].x), mapY(data[i].y));
    }
    this.applyOptions(options);
    if (options?.stroke) { ctx.strokeStyle = options.stroke; ctx.stroke(); }
    this.resetOptions();

    if (options?.showPoints !== false) {
      const pr = options?.pointRadius ?? 4;
      data.forEach(p => this.drawCircle(mapX(p.x), mapY(p.y), pr, { fill: options?.stroke ?? "#4A90D9" }));
    }
  }

  drawPieChart(
    data: Array<{ value: number; label?: string; color?: string }>,
    cx: number,
    cy: number,
    radius: number,
    options?: DrawOptions & { innerRadius?: number; labelDistance?: number }
  ): void {
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    let angle = -Math.PI / 2;
    const colors = ["#4A90D9", "#50E3C2", "#F5A623", "#E74C3C", "#9B59B6", "#1ABC9C", "#E67E22", "#34495E"];

    data.forEach((d, i) => {
      const slice = (d.value / total) * Math.PI * 2;
      const ctx = this.getContext();
      ctx.beginPath();
      const ir = options?.innerRadius ?? 0;
      if (ir > 0) {
        ctx.arc(cx, cy, radius, angle, angle + slice);
        ctx.arc(cx, cy, ir, angle + slice, angle, true);
      } else {
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + slice);
      }
      ctx.closePath();
      ctx.fillStyle = d.color ?? colors[i % colors.length];
      ctx.fill();
      if (options?.stroke) { ctx.strokeStyle = options.stroke; ctx.lineWidth = options.lineWidth ?? 1; ctx.stroke(); }

      if (d.label && options?.labelDistance) {
        const midAngle = angle + slice / 2;
        const lx = cx + Math.cos(midAngle) * (radius + options.labelDistance);
        const ly = cy + Math.sin(midAngle) * (radius + options.labelDistance);
        this.drawText(d.label, lx, ly, { fontSize: 11, align: "center", baseline: "middle" });
      }
      angle += slice;
    });
  }

  drawProgressCircle(percent: number, cx: number, cy: number, radius: number, options?: DrawOptions & {
    bgColor?: string; lineWidth?: number; startAngle?: number; counterClockwise?: boolean;
  }): void {
    const p = clamp(percent, 0, 1);
    const lw = options?.lineWidth ?? 8;
    const start = options?.startAngle ?? -Math.PI / 2;
    const end = start + p * Math.PI * 2 * (options?.counterClockwise ? -1 : 1);
    const ctx = this.getContext();

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = options?.bgColor ?? "#eee";
    ctx.lineWidth = lw;
    ctx.stroke();

    // Progress arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end, options?.counterClockwise ?? false);
    ctx.strokeStyle = (options?.fill as string) ?? options?.stroke ?? "#4A90D9";
    ctx.lineWidth = lw;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  drawSparkline(values: number[], rect: Rect, options?: DrawOptions & { fillOpacity?: number; strokeWidth?: number }): void {
    if (values.length < 2) return;
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    const stepX = rect.width / (values.length - 1);
    const ctx = this.getContext();

    const pts = values.map((v, i) => ({
      x: rect.x + i * stepX,
      y: rect.y + rect.height - ((v - min) / range) * rect.height
    }));

    // Fill area
    if (options?.fillOpacity !== 0) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, rect.y + rect.height);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, rect.y + rect.height);
      ctx.closePath();
      ctx.fillStyle = (options?.fill as string) ?? "#4A90D9";
      ctx.globalAlpha = options?.fillOpacity ?? 0.15;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = (options?.stroke as string) ?? "#4A90D9";
    ctx.lineWidth = options?.strokeWidth ?? 1.5;
    ctx.stroke();
  }

  // ── Path Utilities ────────────────────────────────────────────────

  beginPath(): Path2D {
    return new Path2D();
  }

  moveTo(path: Path2D, x: number, y: number): void { path.moveTo(x, y); }
  lineTo(path: Path2D, x: number, y: number): void { path.lineTo(x, y); }
  quadraticCurveTo(path: Path2D, cpx: number, cpy: number, x: number, y: number): void { path.quadraticCurveTo(cpx, cpy, x, y); }
  bezierCurveTo(path: Path2D, cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    path.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  }
  closePath(path: Path2D): void { path.closePath(); }

  strokePath(path: Path2D, options?: DrawOptions): void {
    const ctx = this.getContext();
    this.applyOptions(options);
    if (options?.stroke) ctx.strokeStyle = options.stroke;
    ctx.stroke(path);
    this.resetOptions();
  }

  fillPath(path: Path2D, options?: DrawOptions): void {
    const ctx = this.getContext();
    this.applyOptions(options);
    if (options?.fill) ctx.fillStyle = options.fill as string;
    ctx.fill(path);
    this.resetOptions();
  }

  clipToPath(path: Path2D): void {
    this.getContext().clip(path);
  }

  isPointInPath(path: Path2D, x: number, y: number): boolean {
    return this.getContext().isPointInPath(path, x, y);
  }

  // ── Animation Helper ──────────────────────────────────────────────

  animate(
    drawFn: (progress: number) => void,
    duration = 1000,
    easing: EasingFn = easeInOutQuad
  ): AnimationController {
    const ctx = this.getContext();
    let startTime: number | null = null;
    let animId = 0;
    let _isPlaying = true;
    let _progress = 0;
    let cancelled = false;

    const tick = (timestamp: number) => {
      if (cancelled) return;
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      _progress = clamp(elapsed / duration, 0, 1);
      const eased = easing(_progress);
      this.save();
      drawFn(eased);
      this.restore();
      if (_progress < 1 && !cancelled) {
        animId = requestAnimationFrame(tick);
      } else {
        _isPlaying = false;
      }
    };

    animId = requestAnimationFrame(tick);

    return {
      play() {
        if (!_isPlaying && !cancelled && _progress < 1) {
          _isPlaying = true;
          startTime = performance.now() - _progress * duration;
          animId = requestAnimationFrame(tick);
        }
      },
      pause() {
        _isPlaying = false;
        cancelAnimationFrame(animId);
      },
      seek(p: number) {
        _progress = clamp(p, 0, 1);
        cancelAnimationFrame(animId);
        this.save();
        drawFn(easing(_progress));
        this.restore();
      },
      cancel() {
        cancelled = true;
        cancelAnimationFrame(animId);
      },
      get isPlaying() { return _isPlaying; },
      get progress() { return _progress; },
    };
  }

  // ── Pattern Generation ────────────────────────────────────────────

  createCheckerPattern(size: number, color1 = "#ffffff", color2 = "#cccccc"): CanvasPattern {
    const cvs = document.createElement("canvas");
    cvs.width = size * 2;
    cvs.height = size * 2;
    const c = cvs.getContext("2d")!;
    c.fillStyle = color1;
    c.fillRect(0, 0, size * 2, size * 2);
    c.fillStyle = color2;
    c.fillRect(0, 0, size, size);
    c.fillRect(size, size, size, size);
    return this.getContext().createPattern(cvs, "repeat")!;
  }

  createStripePattern(spacing: number, angle: number, color = "#000000"): CanvasPattern {
    const diag = spacing * 3;
    const cvs = document.createElement("canvas");
    cvs.width = diag;
    cvs.height = diag;
    const c = cvs.getContext("2d")!;
    c.translate(diag / 2, diag / 2);
    c.rotate(degToRad(angle));
    c.translate(-diag / 2, -diag / 2);
    c.strokeStyle = color;
    c.lineWidth = 1;
    for (let i = -diag; i < diag * 2; i += spacing) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i + diag, diag);
      c.stroke();
    }
    return this.getContext().createPattern(cvs, "repeat")!;
  }

  createDotPattern(spacing: number, color = "#000000", radius = 2): CanvasPattern {
    const cvs = document.createElement("canvas");
    cvs.width = spacing;
    cvs.height = spacing;
    const c = cvs.getContext("2d")!;
    c.fillStyle = color;
    c.beginPath();
    c.arc(spacing / 2, spacing / 2, radius, 0, Math.PI * 2);
    c.fill();
    return this.getContext().createPattern(cvs, "repeat")!;
  }
}
