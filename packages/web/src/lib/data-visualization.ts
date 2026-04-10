/**
 * Data Visualization: chart rendering (bar/line/pie/scatter/area/radar/heatmap/treemap),
 * canvas-based drawing, SVG generation, responsive sizing, animation transitions,
 * tooltip system, legend management, axis formatting, color scales,
 * statistical overlays (mean line, confidence bands, trend lines).
 */

// --- Types ---

export interface ChartConfig {
  width?: number;
  height?: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  title?: string;
  subtitle?: string;
  animate?: boolean;
  animationDuration?: number;
  theme?: "light" | "dark";
  fontFamily?: string;
  baseFontSize?: number;
}

export interface DataPoint {
  label: string;
  value: number;
  category?: string;
  color?: string;
}

export interface SeriesData {
  name: string;
  data: DataPoint[];
  color?: string;
  type?: "line" | "bar" | "area" | "scatter" | "spline";
  dashed?: boolean;
  strokeWidth?: number;
}

export interface AxisConfig {
  show?: boolean;
  position?: "left" | "right" | "top" | "bottom";
  min?: number;
  max?: number;
  ticks?: number;
  format?: (v: number) => string;
  title?: string;
  grid?: boolean;
  gridColor?: string;
  gridStyle?: "solid" | "dashed" | "dotted";
  logarithmic?: boolean;
}

export interface LegendConfig {
  show?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  orientation?: "horizontal" | "vertical";
  itemWidth?: number;
  itemHeight?: number;
  formatter?: (name: string) => string;
}

export interface TooltipConfig {
  show?: boolean;
  trigger?: "hover" | "click" | "none";
  format?: (point: DataPoint, series?: string) => string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
}

// --- Color Scales ---

export const colorPalettes = {
  categorical: [
    "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
    "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
  ],
  sequential: ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#08519c", "#08306b"],
  diverging: ["#d73027", "#fc8d59", "#fee090", "#ffffbf", "#e0f3f8", "#91bfdb", "#4575b4", "#4393c3", "#2166ac"],
  warm: ["#fff5f0", "#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#980003", "#67000f"],
  cool: ["#f7fcfd", "#e5f5f9", "#ccece6", "#99d8c9", "#66c2a5", "#41ae76", "#238b45", "#006d2c", "#00441b"],
  pastel: ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff", "#e0bbff", "#ffc9de", "#fafafa"],
  neon: ["#ff006e", "#8338ec", "#3a86ff", "#06ffa5", "#ffbe0b", "#fb5607", "#ff006e", "#8338ec"],
};

/** Get color from palette by index */
export function getColor(palette: keyof typeof colorPalettes, index: number): string {
  return colorPalettes[palette][index % colorPalettes[palette].length];
}

/** Generate a color scale for numeric ranges */
export function createColorScale(colors: string[], domain: [number, number]): (value: number) => string {
  const n = colors.length - 1;
  return (value: number) => {
    const t = Math.max(0, Math.min(1, (value - domain[0]) / (domain[1] - domain[0])));
    const idx = t * n;
    const i = Math.floor(idx);
    if (i >= n) return colors[n]!;
    // Interpolate between colors
    return interpolateColor(colors[i], colors[i + 1]!, idx - i);
  };
}

function interpolateColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// --- Number Formatting ---

export function formatNumber(value: number, compact = false): string {
  if (compact && Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (compact && Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (Number.isInteger(value)) return value.toLocaleString();
  return value.toFixed(2);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatCurrency(value: number, currency = "$"): string {
  return `${currency}${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
}

/** Auto-detect best format based on value range */
export function autoFormat(values: number[]): (v: number) => string {
  const max = Math.max(...values.map(Math.abs));
  if (max < 10) return (v) => v.toFixed(2);
  if (max < 1000) return (v) => v.toFixed(1);
  if (max < 1000000) return (v) => v.toLocaleString();
  return (v) => formatNumber(v, true);
}

// --- Statistics Helpers ---

export interface StatsResult {
  count: number;
  sum: number;
  mean: number;
  median: number;
  mode: number[];
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  q1: number; // First quartile
  q2: number; // Median
  q3: number; // Third quartile;
  iqr: number;
  outliers: number[];
  skewness: number;
  kurtosis: number;
}

/** Calculate comprehensive statistics for a dataset */
export function calculateStats(values: number[]): StatsResult {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const median = n % 2 === 0 ? (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2 : sorted[Math.floor(n / 2)]!;
  const q1 = sorted[Math.floor(n * 0.25)] ?? sorted[0]!;
  const q3 = sorted[Math.floor(n * 0.75)] ?? sorted[n - 1]!;

  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Mode
  const freq = new Map<number, number>();
  for (const v of values) freq.set(v, (freq.get(v) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  const mode = Array.from(freq.entries()).filter(([, f]) => f === maxFreq).map(([v]) => v);

  // Outliers (IQR method)
  const iqrVal = q3 - q1;
  const lowerFence = q1 - 1.5 * iqrVal;
  const upperFence = q3 + 1.5 * iqrVal;
  const outliers = values.filter((v) => v < lowerFence || v > upperFence);

  // Skewness
  const skewness = n > 0 ? values.reduce((acc, v) => acc + ((v - mean) / stdDev) ** 3, 0) / n : 0;

  // Kurtosis
  const kurtosis = n > 0 ? values.reduce((acc, v) => acc + ((v - mean) / stdDev) ** 4, 0) / n - 3 : 0;

  return {
    count: n, sum, mean, median, mode,
    min: sorted[0]!, max: sorted[n - 1]!, range: sorted[n - 1]! - sorted[0]!,
    variance, stdDev, q1, q2: median, q3, iqr: iqrVal, outliers, skewness, kurtosis,
  };
}

/** Generate histogram bins */
export function histogramBins(values: number[], binCount?: number): Array<{ start: number; end: number; count: number; frequency: number }> {
  const n = binCount ?? Math.ceil(Math.sqrt(values.length));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binWidth = (max - min) / n || 1;

  const bins = Array.from({ length: n }, (_, i) => ({
    start: min + i * binWidth,
    end: min + (i + 1) * binWidth,
    count: 0,
    frequency: 0,
  }));

  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= n) idx = n - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }

  for (const bin of bins) bin.frequency = bin.count / values.length;

  return bins;
}

// --- Chart Base Class ---

export abstract class ChartBase<T extends ChartConfig> {
  protected config: T;
  protected canvas: HTMLCanvasElement | null = null;
  protected ctx: CanvasRenderingContext2D | null = null;
  protected dataBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  protected animProgress = 0;
  protected animStartTime = 0;
  private animFrameId: number | null = null;

  constructor(config: T) {
    this.config = {
      width: 600,
      height: 400,
      padding: { top: 40, right: 20, bottom: 40, left: 50 },
      animate: true,
      animationDuration: 500,
      theme: "light",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
      baseFontSize: 12,
      ...config,
    };
  }

  /** Render to a canvas element */
  renderTo(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = this.config.width! * dpr;
    canvas.height = this.config.height! * dpr;
    canvas.style.width = `${this.config.width}px`;
    canvas.style.height = `${this.config.height}px`;
    this.ctx.scale(dpr, dpr);

    if (this.config.animate) {
      this.animStartTime = performance.now();
      this.animate();
    } else {
      this.draw();
    }
  }

  /** Export as image data URL */
  toDataURL(type = "image/png", quality = 1): string {
    if (!this.canvas) throw new Error("Call renderTo() first");
    return this.canvas.toDataURL(type, quality);
  }

  /** Download as image */
  download(filename = "chart.png"): void {
    if (!this.canvas) throw new Error("Call renderTo() first");
    const link = document.createElement("a");
    link.download = filename;
    link.href = this.toDataURL();
    link.click();
  }

  protected abstract draw(): void;

  protected getThemeColors() {
    return this.config.theme === "dark"
      ? { bg: "#1a1a2e", text: "#e0e0e0", grid: "#333355", axis: "#8888aa", title: "#ffffff" }
      : { bg: "#ffffff", text: "#333333", grid: "#eeeeee", axis: "#999999", title: "#111111" };
  }

  private animate(): void {
    const duration = this.config.animationDuration ?? 500;
    const tick = () => {
      const elapsed = performance.now() - this.animStartTime;
      this.animProgress = Math.min(1, elapsed / duration);
      // Ease out cubic
      this.animProgress = 1 - Math.pow(1 - this.animProgress, 3);
      this.draw();
      if (this.animProgress < 1) {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  destroy(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }
}

// --- Bar Chart ---

export class BarChart extends ChartBase<ChartConfig & { horizontal?: boolean; stacked?: boolean; barGap?: number; borderRadius?: number }> {
  private seriesData: SeriesData[];

  constructor(data: SeriesData[] | DataPoint[], config?: ChartConfig & { horizontal?: boolean; stacked?: boolean; barGap?: number; borderRadius?: number }) {
    super(config ?? {});
    this.seriesData = Array.isArray(data)
      ? [{ name: "default", data }]
      : data as SeriesData[];
  }

  protected draw(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.config.width!;
    const h = this.config.height!;
    const pad = this.config.padding!;
    const theme = this.getThemeColors();

    // Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);

    // Title
    if (this.config.title) {
      ctx.font = `bold ${this.config.baseFontSize! + 4}px ${this.config.fontFamily}`;
      ctx.fillStyle = theme.title;
      ctx.textAlign = "center";
      ctx.fillText(this.config.title!, w / 2, pad.top! - 12);
    }

    const allPoints = this.seriesData.flatMap((s) => s.data);
    const labels = allPoints.map((p) => p.label);
    const maxValue = Math.max(...allPoints.map((p) => p.value), 0);
    const chartW = w - pad.left! - pad.right!;
    const chartH = h - pad.top! - pad.bottom!;
    const isHorizontal = this.config.horizontal;
    const barCount = allPoints.length;
    const gap = this.config.barGap ?? 4;
    const barSize = isHorizontal
      ? (chartH - gap * (barCount + 1)) / barCount
      : (chartW - gap * (barCount + 1)) / barCount;
    const radius = this.config.borderRadius ?? 4;

    // Draw bars
    let currentIdx = 0;
    for (const point of allPoints) {
      const color = point.color ?? getColor("categorical", currentIdx);
      const val = point.value * this.animProgress;

      if (isHorizontal) {
        const y = pad.top! + gap + currentIdx * (barSize + gap);
        const barW = (val / maxValue) * chartW;
        this.roundRect(ctx, pad.left!, y, barW, barSize, radius, color);
        // Label
        ctx.fillStyle = theme.text;
        ctx.font = `${this.config.baseFontSize}px ${this.config.fontFamily}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(point.label, pad.left! - 8, y + barSize / 2);
        // Value
        ctx.textAlign = "left";
        ctx.fillText(formatNumber(val), pad.left! + barW + 4, y + barSize / 2);
      } else {
        const x = pad.left! + gap + currentIdx * (barSize + gap);
        const barH = (val / maxValue) * chartH;
        const y = pad.top! + chartH - barH;
        this.roundRect(ctx, x, y, barSize, barH, radius, color);
        // Label
        ctx.save();
        ctx.translate(x + barSize / 2, pad.top! + chartH + 16);
        ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = theme.text;
        ctx.font = `${this.config.baseFontSize}px ${this.config.fontFamily}`;
        ctx.textAlign = "center";
        ctx.fillText(point.label, 0, 0);
        ctx.restore();
        // Value on top
        if (this.animProgress > 0.8) {
          ctx.fillStyle = theme.text;
          ctx.textAlign = "center";
          ctx.fillText(formatNumber(val), x + barSize / 2, y - 4);
        }
      }
      currentIdx++;
    }

    // Axes
    this.drawAxes(ctx, w, h, pad, theme, 0, maxValue, labels);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string): void {
    if (w < 0) { x += w; w = Math.abs(w); }
    if (h < 0) { y += h; h = Math.abs(h); }
    ctx.fillStyle = color;
    ctx.beginPath();
    if (r > 0 && r < Math.min(w, h) / 2) {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fill();
  }

  private drawAxes(ctx: CanvasRenderingContext2D, w: number, h: number, pad: { top?: number; right?: number; bottom?: number; left?: number }, theme: Record<string, string>, minVal: number, maxVal: number, _labels: string[]): void {
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.fillStyle = theme.text;
    ctx.font = `${this.config.baseFontSize}px ${this.config.fontFamily}`;

    // Y axis
    ctx.beginPath();
    ctx.moveTo(pad.left!, pad.top!);
    ctx.lineTo(pad.left!, h - pad.bottom!);
    ctx.stroke();

    // X axis
    ctx.beginPath();
    ctx.moveTo(pad.left!, h - pad.bottom!);
    ctx.lineTo(w - pad.right!, h - pad.bottom!);
    ctx.stroke();

    // Y ticks
    const ticks = 5;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= ticks; i++) {
      const val = minVal + ((maxVal - minVal) / ticks) * i;
      const y = (h - pad.bottom!) - ((h - pad.top! - pad.bottom!) / ticks) * i;
      ctx.fillText(formatNumber(val), pad.left! - 8, y);
      // Grid line
      ctx.strokeStyle = theme.grid;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left!, y);
      ctx.lineTo(w - pad.right!, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// --- Line Chart ---

export class LineChart extends ChartBase<ChartConfig & { curved?: boolean; showPoints?: boolean; showArea?: boolean; lineWidth?: number }> {
  private seriesData: SeriesData[];
  private xAxisLabels: string[];

  constructor(data: SeriesData[], labels?: string[], config?: ChartConfig & { curved?: boolean; showPoints?: boolean; showArea?: boolean; lineWidth?: number }) {
    super(config ?? {});
    this.seriesData = data;
    this.xAxisLabels = labels ?? data[0]?.data.map((p) => p.label) ?? [];
  }

  protected draw(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.config.width!;
    const h = this.config.height!;
    const pad = this.config.padding!;
    const theme = this.getThemeColors();

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);

    if (this.config.title) {
      ctx.font = `bold ${this.config.baseFontSize! + 4}px ${this.config.fontFamily}`;
      ctx.fillStyle = theme.title;
      ctx.textAlign = "center";
      ctx.fillText(this.config.title!, w / 2, pad.top! - 12);
    }

    const allValues = this.seriesData.flatMap((s) => s.data.map((p) => p.value));
    const minVal = Math.min(0, Math.min(...allValues));
    const maxVal = Math.max(...allValues) * 1.05;
    const chartW = w - pad.left! - pad.right!;
    const chartH = h - pad.top! - pad.bottom!;
    const pointCount = this.xAxisLabels.length;
    const stepX = pointCount > 1 ? chartW / (pointCount - 1) : chartW;

    // Draw each series
    for (let si = 0; si < this.seriesData.length; si++) {
      const series = this.seriesData[si]!;
      const color = series.color ?? getColor("categorical", si);
      const points = series.data.map((p, i) => ({
        x: pad.left! + i * stepX,
        y: pad.top! + chartH - ((p.value - minVal) / (maxVal - minVal)) * chartH * this.animProgress,
      }));

      // Area fill
      if (this.config.showArea) {
        ctx.fillStyle = color + "20"; // 12% opacity hex
        ctx.beginPath();
        ctx.moveTo(points[0].x, pad.top! + chartH);
        for (const p of points) ctx.lineTo(p.x, p.y);
        ctx.lineTo(points[points.length - 1].x, pad.top! + chartH);
        ctx.closePath();
        ctx.fill();
      }

      // Line
      ctx.strokeStyle = color;
      ctx.lineWidth = this.config.lineWidth ?? 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      if (series.dashed) ctx.setLineDash([6, 4]);

      ctx.beginPath();
      if (this.config.curved && points.length > 1) {
        this.drawSmoothCurve(ctx, points);
      } else {
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Points
      if (this.config.showPoints) {
        for (const p of points) {
          ctx.fillStyle = theme.bg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // X-axis labels
    ctx.fillStyle = theme.axis;
    ctx.font = `${this.config.baseFontSize}px ${this.config.fontFamily}`;
    ctx.textAlign = "center";
    for (let i = 0; i < this.xAxisLabels.length; i++) {
      const x = pad.left! + i * stepX;
      ctx.save();
      ctx.translate(x, h - pad.bottom! + 16);
      ctx.rotate(-Math.PI / 8);
      ctx.fillText(this.xAxisLabels[i], 0, 0);
      ctx.restore();
    }

    // Y axis and grid
    this.drawYAxis(ctx, w, h, pad, theme, minVal, maxVal);
  }

  private drawSmoothCurve(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>): void {
    if (points.length < 2) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  private drawYAxis(ctx: CanvasRenderingContext2D, w: number, h: number, pad: { top?: number; right?: number; bottom?: number; left?: number }, theme: Record<string, string>, minVal: number, maxVal: number): void {
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left!, pad.top!);
    ctx.lineTo(pad.left!, h - pad.bottom!);
    ctx.moveTo(pad.left!, h - pad.bottom!);
    ctx.lineTo(w - pad.right!, h - pad.bottom!);
    ctx.stroke();

    const ticks = 5;
    ctx.fillStyle = theme.axis;
    ctx.font = `${this.config.baseFontSize}px ${this.config.fontFamily}`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= ticks; i++) {
      const val = minVal + ((maxVal - minVal) / ticks) * i;
      const y = (h - pad.bottom!) - ((h - pad.top! - pad.bottom!) / ticks) * i;
      ctx.fillText(formatNumber(val), pad.left! - 8, y);
      ctx.strokeStyle = theme.grid;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pad.left!, y);
      ctx.lineTo(w - pad.right!, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// --- Pie Chart ---

export class PieChart extends ChartBase<ChartConfig & { innerRadius?: number; showLabels?: boolean; showLegend?: boolean; donut?: boolean }> {
  private data: DataPoint[];

  constructor(data: DataPoint[], config?: ChartConfig & { innerRadius?: number; showLabels?: boolean; showLegend?: boolean; donut?: boolean }) {
    super(config ?? {});
    this.data = data;
  }

  protected draw(): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.config.width!;
    const h = this.config.height!;
    const pad = this.config.padding!;
    const theme = this.getThemeColors();

    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, w, h);

    if (this.config.title) {
      ctx.font = `bold ${this.config.baseFontSize! + 4}px ${this.config.fontFamily}`;
      ctx.fillStyle = theme.title;
      ctx.textAlign = "center";
      ctx.fillText(this.config.title!, w / 2, pad.top! - 12);
    }

    const total = this.data.reduce((sum, p) => sum + Math.abs(p.value), 0);
    if (total === 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w - pad.left! - pad.right!, h - pad.top! - pad.bottom!) / 2 - 40;
    const innerR = this.config.donut ? (this.config.innerRadius ?? radius * 0.55) : 0;

    let startAngle = -Math.PI / 2;

    for (let i = 0; i < this.data.length; i++) {
      const point = this.data[i]!;
      const sliceAngle = (Math.abs(point.value) / total) * Math.PI * 2 * this.animProgress;
      const color = point.color ?? getColor("categorical", i);
      const midAngle = startAngle + sliceAngle / 2;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();

      // Slice border
      ctx.strokeStyle = theme.bg;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      if (this.config.showLabels && sliceAngle > 0.15) {
        const labelR = radius * 0.7 + innerR * 0.3;
        const lx = cx + labelR * Math.cos(midAngle);
        const ly = cy + labelR * Math.sin(midAngle);
        ctx.fillStyle = theme.text;
        ctx.font = `${this.config.baseFontSize}px ${this.config.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const pct = (Math.abs(point.value) / total * 100).toFixed(1);
        ctx.fillText(`${point.label}\n${pct}%`, lx, ly);
      }

      startAngle += sliceAngle;
    }

    // Center text for donut
    if (this.config.donut && innerR > 0) {
      ctx.fillStyle = theme.title;
      ctx.font = `bold ${this.config.baseFontSize! + 8}px ${this.config.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formatNumber(total), cx, cy);
    }

    // Legend
    if (this.config.showLegend !== false) {
      this.drawLegend(ctx, w, h, theme);
    }
  }

  private drawLegend(ctx: CanvasRenderingContext2D, w: number, h: number, theme: Record<string, string>): void {
    const itemH = 20;
    const itemW = 120;
    const startX = w / 2 - (this.data.length * itemW) / 2;
    const startY = h - 25;

    for (let i = 0; i < this.data.length; i++) {
      const x = startX + i * itemW;
      const color = this.data[i].color ?? getColor("categorical", i);

      ctx.fillStyle = color;
      ctx.fillRect(x, startY, 12, 12);

      ctx.fillStyle = theme.text;
      ctx.font = `${this.config.baseFontSize}px ${this.config.fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(`${this.data[i].label} (${formatPercent(Math.abs(this.data[i].value) / this.data.reduce((s, p) => s + Math.abs(p.value), 0))})`, x + 18, startY - 2);
    }
  }
}
