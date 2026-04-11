/**
 * Chart Renderer: Canvas/SVG-based charting library supporting bar, line,
 * area, pie, donut, scatter, radar, and mixed charts with animations,
 * tooltips, legends, responsive sizing, and theme support.
 */

// --- Types ---

export type ChartType = "bar" | "line" | "area" | "pie" | "donut" | "scatter" | "radar" | "mixed";
export type AxisPosition = "left" | "right" | "top" | "bottom";
export type CurveType = "linear" | "monotone" | "step" | "stepAfter" | "stepBefore";

export interface ChartDataPoint {
  label?: string;
  value: number;
  x?: number;
  y?: number;
  color?: string;
  /** For pie/donut */
  name?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  type?: "bar" | "line" | "area";
  dashed?: boolean;
  strokeWidth?: number;
  fillOpacity?: number;
}

export interface ChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Chart type */
  type: ChartType;
  /** Data series (for bar/line/area/scatter/radar/mixed) */
  series?: ChartSeries[];
  /** Simple data points (for pie/donut) */
  data?: ChartDataPoint[];
  /** Chart title */
  title?: string;
  /** Width in px (default: auto from container) */
  width?: number;
  /** Height in px (default: 300) */
  height?: number;
  /** Padding around chart area */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Show legend? */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: "top" | "bottom" | "left" | "right";
  /** Show tooltip on hover? */
  showTooltip?: boolean;
  /** Custom tooltip formatter */
  tooltipFormatter?: (point: ChartDataPoint, seriesName?: string) => string;
  /** Animation duration in ms (0 = no animation) */
  animationDuration?: number;
  /** X axis label */
  xAxisLabel?: string;
  /** Y axis label */
  yAxisLabel?: string;
  /** Show grid lines? */
  showGrid?: boolean;
  /** Show axes? */
  showAxes?: boolean;
  /** Y axis min value */
  yMin?: number;
  /** Y axis max value */
  yMax?: number;
  /** Stacked bars/areas? */
  stacked?: boolean;
  /** Horizontal bars? */
  horizontal?: boolean;
  /** Line curve type */
  curveType?: CurveType;
  /** Show data point dots on lines? */
  showDots?: boolean;
  /** Donut inner radius ratio (0-0.9) */
  donutRatio?: number;
  /** Color palette */
  colors?: string[];
  /** Theme: light or dark */
  theme?: "light" | "dark";
  /** Background color */
  backgroundColor?: string;
  /** Font family */
  fontFamily?: string;
  /** Bar border radius */
  barRadius?: number;
  /** Callback on data point click */
  onPointClick?: (point: ChartDataPoint, index: number, seriesIndex?: number) => void;
  /** Callback on hover */
  onHover?: (point: ChartDataPoint | null, index: number, seriesIndex?: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChartInstance {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  setData: (series: ChartSeries[], data?: ChartDataPoint[]) => void;
  updateOptions: (options: Partial<ChartOptions>) => void;
  resize: () => void;
  destroy: () => void;
  toDataURL: (type?: string, quality?: number) => string;
}

// --- Default Config ---

const DEFAULT_COLORS = [
  "#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

const LIGHT_THEME = {
  background: "#ffffff",
  text: "#374151",
  textLight: "#9ca3af",
  grid: "#f3f4f6",
  axisLine: "#d1d5db",
  tooltipBg: "rgba(17,24,39,0.9)",
  tooltipText: "#f9fafb",
};

const DARK_THEME = {
  background: "#1f2937",
  text: "#e5e7eb",
  textLight: "#6b7280",
  grid: "#374151",
  axisLine: "#4b5563",
  tooltipBg: "rgba(255,255,255,0.95)",
  tooltipText: "#111827",
};

// --- Helpers ---

function getColor(index: number, customColor?: string, palette?: string[]): string {
  if (customColor) return customColor;
  const colors = palette ?? DEFAULT_COLORS;
  return colors[index % colors.length];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutElastic(t: number): number {
  return t === 0 ? 0 : t === 1 ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

// --- Main Factory ---

export function createChart(options: ChartOptions): ChartInstance {
  const opts = {
    width: options.width,
    height: options.height ?? 300,
    padding: { top: 20, right: 20, bottom: 40, left: 50, ...options.padding },
    showLegend: options.showLegend ?? true,
    legendPosition: options.legendPosition ?? "bottom",
    showTooltip: options.showTooltip ?? true,
    animationDuration: options.animationDuration ?? 600,
    showGrid: options.showGrid ?? true,
    showAxes: options.showAxes ?? true,
    stacked: options.stacked ?? false,
    horizontal: options.horizontal ?? false,
    curveType: options.curveType ?? "monotone",
    showDots: options.showDots ?? true,
    donutRatio: options.donutRatio ?? 0.6,
    colors: options.colors ?? [...DEFAULT_COLORS],
    theme: options.theme ?? "light",
    backgroundColor: options.backgroundColor,
    fontFamily: options.fontFamily ?? "-apple-system,sans-serif",
    barRadius: options.barRadius ?? 4,
    className: options.className ?? "",
    ...options,
  };

  const theme = opts.theme === "dark" ? DARK_THEME : LIGHT_THEME;

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Chart: container not found");

  let destroyed = false;
  let currentSeries: ChartSeries[] = opts.series ?? [];
  let currentData: ChartDataPoint[] = opts.data ?? [];
  let animProgress = 0;
  let animFrameId: number | null = null;
  let hoveredPoint: { x: number; y: number; point: ChartDataPoint; seriesIdx: number; pointIdx: number } | null = null;
  let resizeObserver: ResizeObserver | null = null;

  // Root wrapper
  const root = document.createElement("div");
  root.className = `chart-container ${opts.className}`;
  root.style.cssText = `
    position:relative;width:${opts.width ? `${opts.width}px` : "100%"};
    height:${opts.height}px;overflow:hidden;font-family:${opts.fontFamily};
    ${opts.backgroundColor ? `background:${opts.backgroundColor};` : `background:${theme.background};`}
    border-radius:8px;
  `;
  container.appendChild(root);

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%;";
  root.appendChild(canvas);

  const ctx = canvas.getContext("2d")!;

  // Tooltip element
  let tooltipEl: HTMLDivElement | null = null;
  if (opts.showTooltip) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "chart-tooltip";
    tooltipEl.style.cssText = `
      position:absolute;display:none;padding:8px 12px;border-radius:6px;
      font-size:12px;color:${theme.tooltipText};background:${theme.tooltipBg};
      pointer-events:none;z-index:100;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.15);
      transform:translate(-50%,-100%);margin-top:-8px;
    `;
    root.appendChild(tooltipEl);
  }

  // Legend element
  let legendEl: HTMLDivElement | null = null;
  if (opts.showLegend && (currentSeries.length > 1 || opts.type === "pie" || opts.type === "donut")) {
    legendEl = document.createElement("div");
    legendEl.className = "chart-legend";
    legendEl.style.cssText = `
      display:flex;flex-wrap:wrap;gap:12px;justify-content:center;
      padding:8px;font-size:12px;color:${theme.text};
    `;
    if (opts.legendPosition === "top") root.prepend(legendEl);
    else root.appendChild(legendEl);
  }

  function setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = root.getBoundingClientRect();
    const w = rect.width || opts.width || 400;
    const h = rect.height || opts.height || 300;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getChartArea(): { x: number; y: number; w: number; h: number } {
    const rect = root.getBoundingClientRect();
    const w = rect.width || opts.width || 400;
    const h = rect.height || opts.height || 300;
    return {
      x: opts.padding.left,
      y: opts.padding.top,
      w: w - opts.padding.left - opts.padding.right,
      h: h - opts.padding.top - opts.padding.bottom,
    };
  }

  function getDataRange(): { min: number; max: number } {
    if (opts.type === "pie" || opts.type === "donut") {
      const total = currentData.reduce((s, d) => s + d.value, 0);
      return { min: 0, max: total };
    }
    let allValues: number[] = [];
    for (const s of currentSeries) {
      allValues = allValues.concat(s.data.map((d) => d.value));
    }
    if (allValues.length === 0) return { min: 0, max: 100 };
    let min = opts.yMin ?? Math.min(...allValues);
    let max = opts.yMax ?? Math.max(...allValues);
    if (min > 0) min = 0; // Start from zero for bar/area
    const range = max - min || 1;
    max += range * 0.1; // 10% headroom
    return { min, max };
  }

  // --- Drawing Functions ---

  function drawBackground(): void {
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function drawTitle(): void {
    if (!opts.title) return;
    ctx.fillStyle = theme.text;
    ctx.font = `600 14px ${opts.fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(opts.title, (root.getBoundingClientRect().width || opts.width || 400) / 2, 16);
  }

  function drawGrid(area: { x: number; y: number; w: number; h: number }, range: { min: number; max: number }): void {
    if (!opts.showGrid) return;
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 0.5;
    ctx.setLineDash([4, 4]);

    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = area.y + (area.h * i) / steps;
      ctx.beginPath();
      ctx.moveTo(area.x, y);
      ctx.lineTo(area.x + area.w, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawAxes(area: { x: number; y: number; w: number; h: number }, range: { min: number; max: number }): void {
    if (!opts.showAxes) return;
    ctx.strokeStyle = theme.axisLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([]);

    // Y axis line
    ctx.beginPath();
    ctx.moveTo(area.x, area.y);
    ctx.lineTo(area.x, area.y + area.h);
    ctx.stroke();

    // X axis line
    ctx.beginPath();
    ctx.moveTo(area.x, area.y + area.h);
    ctx.lineTo(area.x + area.w, area.y + area.h);
    ctx.stroke();

    // Y axis labels
    ctx.fillStyle = theme.textLight;
    ctx.font = `11px ${opts.fontFamily}`;
    ctx.textAlign = "right";
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const val = range.min + ((range.max - range.min) * (steps - i)) / steps;
      const y = area.y + (area.h * i) / steps;
      ctx.fillText(formatNumber(val), area.x - 8, y + 4);
    }

    // Y axis label
    if (opts.yAxisLabel) {
      ctx.save();
      ctx.translate(12, area.y + area.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.font = `11px ${opts.fontFamily}`;
      ctx.fillStyle = theme.textLight;
      ctx.fillText(opts.yAxisLabel, 0, 0);
      ctx.restore();
    }

    // X axis label
    if (opts.xAxisLabel) {
      ctx.textAlign = "center";
      ctx.font = `11px ${opts.fontFamily}`;
      ctx.fillStyle = theme.textLight;
      ctx.fillText(opts.xAxisLabel, area.x + area.w / 2, area.y + area.h + 28);
    }
  }

  function drawXLabels(area: { x: number; y: number; w: number; h: number }, labels: string[]): void {
    if (!opts.showAxes) return;
    ctx.fillStyle = theme.textLight;
    ctx.font = `11px ${opts.fontFamily}`;
    ctx.textAlign = "center";
    const step = area.w / Math.max(labels.length, 1);
    for (let i = 0; i < labels.length; i++) {
      const x = area.x + step * (i + 0.5);
      ctx.fillText(labels[i]!.slice(0, 12), x, area.y + area.h + 18);
    }
  }

  function drawBarChart(progress: number): void {
    const area = getChartArea();
    const range = getDataRange();
    const labels = currentSeries[0]?.data.map((d) => d.label ?? "") ?? [];

    drawGrid(area, range);
    drawAxes(area, range);

    const groupCount = currentSeries.length;
    const groupWidth = area.w / Math.max(labels.length, 1);
    const barPadding = groupWidth * 0.15;
    const barWidth = (groupWidth - barPadding * 2) / Math.max(groupCount, 1);
    const gap = barWidth * 0.15;

    for (let si = 0; si < currentSeries.length; si++) {
      const series = currentSeries[si]!;
      const color = getColor(si, series.color, opts.colors);

      for (let di = 0; di < series.data.length; di++) {
        const dp = series.data[di]!;
        const barH = ((dp.value - range.min) / (range.max - range.min)) * area.h * progress;
        const x = area.x + di * groupWidth + barPadding + si * (barWidth + gap);
        const y = area.y + area.h - barH;

        ctx.fillStyle = color;
        roundRect(ctx, x, y, barWidth, barH, opts.barRadius);
        ctx.fill();

        // Store hit region
        (dp as any)._hitRect = { x, y, w: barWidth, h: barH };
      }
    }

    drawXLabels(area, labels);
  }

  function drawLineChart(chartType: "line" | "area", progress: number): void {
    const area = getChartArea();
    const range = getDataRange();
    const labels = currentSeries[0]?.data.map((d) => d.label ?? "") ?? [];

    drawGrid(area, range);
    drawAxes(area, range);

    for (let si = 0; si < currentSeries.length; si++) {
      const series = currentSeries[si]!;
      const color = getColor(si, series.color, opts.colors);
      const points: { x: number; y: number }[] = [];

      const stepX = area.w / Math.max(series.data.length - 1, 1);

      for (let di = 0; di < series.data.length; di++) {
        const dp = series.data[di]!;
        const x = area.x + (series.data.length === 1 ? area.w / 2 : di * stepX);
        const rawY = area.y + area.h - ((dp.value - range.min) / (range.max - range.min)) * area.h;
        const y = area.y + area.h - ((dp.value - range.min) / (range.max - range.min)) * area.h * progress;
        points.push({ x, y });

        (dp as any)._hitPos = { x, y, rawY };
      }

      if (points.length === 0) continue;

      // Area fill
      if (chartType === "area" && points.length > 1) {
        ctx.globalAlpha = (series.fillOpacity ?? 0.15) * progress;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[0]!.x, area.y + area.h);
        drawCurve(ctx, points, opts.curveType);
        ctx.lineTo(points[points.length - 1]!.x, area.y + area.h);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Line
      if (points.length > 1) {
        ctx.strokeStyle = color;
        ctx.lineWidth = series.strokeWidth ?? 2;
        if (series.dashed) ctx.setLineDash([6, 4]);
        else ctx.setLineDash([]);
        ctx.beginPath();
        drawCurve(ctx, points, opts.curveType);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Dots
      if (opts.showDots) {
        for (const pt of points) {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = theme.background;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawXLabels(area, labels);
  }

  function drawPieChart(isDonut: boolean, progress: number): void {
    const rect = root.getBoundingClientRect();
    const w = rect.width || opts.width || 400;
    const h = rect.height || opts.height || 300;
    const cx = w / 2;
    const cy = h / 2;
    const outerR = Math.min(w, h) / 2 - 40;
    const innerR = isDonut ? outerR * opts.donutRatio : 0;

    const total = currentData.reduce((s, d) => s + d.value, 0);
    if (total === 0) return;

    let startAngle = -Math.PI / 2;

    for (let i = 0; i < currentData.length; i++) {
      const dp = currentData[i]!;
      const sliceAngle = (dp.value / total) * Math.PI * 2 * progress;
      const color = getColor(i, dp.color, opts.colors);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(startAngle) * innerR, cy + Math.sin(startAngle) * innerR);
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();

      // Slight gap between slices
      ctx.strokeStyle = theme.background;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Store center angle for tooltip/hit detection
      const midAngle = startAngle + sliceAngle / 2;
      (dp as any)._hitPie = {
        cx, cy, outerR, innerR, startAngle, endAngle: startAngle + sliceAngle, midAngle,
      };

      startAngle += sliceAngle;
    }

    // Center text for donut
    if (isDonut && total > 0) {
      ctx.fillStyle = theme.text;
      ctx.font = `600 22px ${opts.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(formatNumber(total), cx, cy - 8);
      ctx.font = `12px ${opts.fontFamily}`;
      ctx.fillStyle = theme.textLight;
      ctx.fillText("Total", cx, cy + 14);
    }
  }

  function drawScatterChart(progress: number): void {
    const area = getChartArea();
    const range = getDataRange();

    // Find x range too
    let xMin = Infinity, xMax = -Infinity;
    for (const s of currentSeries) {
      for (const d of s.data) {
        if (d.x != null) { xMin = Math.min(xMin, d.x); xMax = Math.max(xMax, d.x); }
      }
    }
    if (!isFinite(xMin)) { xMin = 0; xMax = currentSeries[0]?.data.length ?? 10; }
    const xRange = xMax - xMin || 1;

    drawGrid(area, range);
    drawAxes(area, range);

    for (let si = 0; si < currentSeries.length; si++) {
      const series = currentSeries[si]!;
      const color = getColor(si, series.color, opts.colors);

      for (let di = 0; di < series.data.length; di++) {
        const dp = series.data[di]!;
        const xVal = dp.x ?? di;
        const x = area.x + ((xVal - xMin) / xRange) * area.w;
        const y = area.y + area.h - ((dp.value - range.min) / (range.max - range.min)) * area.h * progress;
        const r = 6 * progress;

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        (dp as any)._hitPos = { x, y };
      }
    }
  }

  function drawRadarChart(progress: number): void {
    if (currentSeries.length === 0) return;
    const rect = root.getBoundingClientRect();
    const w = rect.width || opts.width || 400;
    const h = rect.height || opts.height || 300;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) / 2 - 50;
    const labels = currentSeries[0]?.data.map((d) => d.label ?? "") ?? [];
    const numAxes = labels.length;
    if (numAxes < 3) return;

    const range = getDataRange();

    // Draw web
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 0.5;
    for (let level = 1; level <= 5; level++) {
      const r = (radius * level) / 5;
      ctx.beginPath();
      for (let i = 0; i <= numAxes; i++) {
        const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < numAxes; i++) {
      const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();

      // Labels
      const lx = cx + Math.cos(angle) * (radius + 18);
      const ly = cy + Math.sin(angle) * (radius + 18);
      ctx.fillStyle = theme.textLight;
      ctx.font = `11px ${opts.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[i]!, lx, ly);
    }

    // Draw data polygons
    for (let si = 0; si < currentSeries.length; si++) {
      const series = currentSeries[si]!;
      const color = getColor(si, series.color, opts.colors);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.15 * progress;

      ctx.beginPath();
      for (let i = 0; i < numAxes; i++) {
        const dp = series.data[i] ?? series.data[0];
        const val = dp?.value ?? 0;
        const r = ((val - range.min) / (range.max - range.min)) * radius * progress;
        const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawMixedChart(progress: number): void {
    const area = getChartArea();
    const range = getDataRange();
    const labels = currentSeries[0]?.data.map((d) => d.label ?? "") ?? [];

    drawGrid(area, range);
    drawAxes(area, range);

    const groupCount = currentSeries.filter((s) => s.type === "bar").length;
    const nonBarSeries = currentSeries.filter((s) => s.type !== "bar");

    // First pass: bars
    const barSeries = currentSeries.filter((s) => s.type === "bar" || !s.type);
    if (barSeries.length > 0) {
      const groupWidth = area.w / Math.max(labels.length, 1);
      const barPadding = groupWidth * 0.2;
      const barWidth = (groupWidth - barPadding * 2) / Math.max(barSeries.length, 1);
      const gap = barWidth * 0.15;

      for (let si = 0; si < barSeries.length; si++) {
        const series = barSeries[si]!;
        const color = getColor(currentSeries.indexOf(series), series.color, opts.colors);
        for (let di = 0; di < series.data.length; di++) {
          const dp = series.data[di]!;
          const barH = ((dp.value - range.min) / (range.max - range.min)) * area.h * progress;
          const x = area.x + di * groupWidth + barPadding + si * (barWidth + gap);
          const y = area.y + area.h - barH;
          ctx.fillStyle = color;
          roundRect(ctx, x, y, barWidth, barH, opts.barRadius);
          ctx.fill();
        }
      }
    }

    // Second pass: lines/areas
    for (const series of nonBarSeries) {
      const si = currentSeries.indexOf(series);
      const color = getColor(si, series.color, opts.colors);
      const points: { x: number; y: number }[] = [];
      const stepX = area.w / Math.max(series.data.length - 1, 1);

      for (let di = 0; di < series.data.length; di++) {
        const dp = series.data[di]!;
        const x = area.x + (series.data.length === 1 ? area.w / 2 : di * stepX);
        const y = area.y + area.h - ((dp.value - range.min) / (range.max - range.min)) * area.h * progress;
        points.push({ x, y });
      }

      if (points.length < 2) continue;
      ctx.strokeStyle = color;
      ctx.lineWidth = series.strokeWidth ?? 2;
      ctx.beginPath();
      drawCurve(ctx, points, opts.curveType);
      ctx.stroke();

      if (opts.showDots) {
        for (const pt of points) {
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    drawXLabels(area, labels);
  }

  // --- Curve Drawing Helper ---

  function drawCurve(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], curveType: CurveType): void {
    if (points.length < 2) return;

    if (curveType === "linear" || points.length === 2) {
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
      return;
    }

    if (curveType === "step") {
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]!;
        const curr = points[i]!;
        ctx.lineTo(curr.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
      }
      return;
    }

    if (curveType === "stepAfter") {
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 0; i < points.length - 1; i++) {
        const curr = points[i]!;
        const next = points[i + 1]!;
        ctx.lineTo(next.x, curr.y);
        ctx.lineTo(next.x, next.y);
      }
      return;
    }

    if (curveType === "stepBefore") {
      ctx.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]!;
        const curr = points[i]!;
        ctx.lineTo(prev.x, curr.y);
        ctx.lineTo(curr.x, curr.y);
      }
      return;
    }

    // Monotone cubic spline (Catmull-Rom style)
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = points[Math.min(i + 2, points.length - 1)]!;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
    }
  }

  // --- Rounded Rectangle ---

  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // --- Render Pipeline ---

  function render(progress: number = 1): void {
    if (destroyed) return;
    setupCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawTitle();

    switch (opts.type) {
      case "bar": drawBarChart(progress); break;
      case "line": drawLineChart("line", progress); break;
      case "area": drawLineChart("area", progress); break;
      case "pie": drawPieChart(false, progress); break;
      case "donut": drawPieChart(true, progress); break;
      case "scatter": drawScatterChart(progress); break;
      case "radar": drawRadarChart(progress); break;
      case "mixed": drawMixedChart(progress); break;
    }

    renderLegend();
  }

  function renderLegend(): void {
    if (!legendEl) return;
    legendEl.innerHTML = "";

    const items = opts.type === "pie" || opts.type === "donut"
      ? currentData.map((d, i) => ({ name: d.name ?? d.label ?? `Item ${i + 1}`, color: getColor(i, d.color, opts.colors) }))
      : currentSeries.map((s, i) => ({ name: s.name, color: getColor(i, s.color, opts.colors) }));

    for (const item of items) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;";
      row.innerHTML = `<span style="width:12px;height:12px;border-radius:3px;background:${item.color};display:inline-block;"></span><span>${item.name}</span>`;
      legendEl.appendChild(row);
    }
  }

  // --- Animation ---

  function animate(): void {
    if (opts.animationDuration === 0) {
      animProgress = 1;
      render(1);
      return;
    }

    const startTime = performance.now();

    function frame(now: number): void {
      if (destroyed) return;
      const elapsed = now - startTime;
      animProgress = easeOutCubic(Math.min(elapsed / opts.animationDuration!, 1));
      render(animProgress);
      if (animProgress < 1) animFrameId = requestAnimationFrame(frame);
    }

    animFrameId = requestAnimationFrame(frame);
  }

  // --- Mouse Interaction ---

  function handleMouseMove(e: MouseEvent): void {
    if (!opts.showTooltip || !tooltipEl) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found = false;

    if (opts.type === "bar") {
      for (const s of currentSeries) {
        for (const d of s.data) {
          const hr = (d as any)._hitRect;
          if (hr && mx >= hr.x && mx <= hr.x + hr.w && my >= hr.y && my <= hr.y + hr.h) {
            showTooltip(e, d, s.name);
            opts.onHover?.(d, s.data.indexOf(d), currentSeries.indexOf(s));
            found = true; break;
          }
        }
        if (found) break;
      }
    } else if (opts.type === "line" || opts.type === "area" || opts.type === "mixed") {
      let closestDist = 30;
      let closest: { point: ChartDataPoint; si: number; pi: number } | null = null;
      for (let si = 0; si < currentSeries.length; si++) {
        const s = currentSeries[si]!;
        for (let pi = 0; pi < s.data.length; pi++) {
          const d = s.data[pi]!;
          const hp = (d as any)._hitPos;
          if (hp) {
            const dist = Math.sqrt((mx - hp.x) ** 2 + (my - hp.y) ** 2);
            if (dist < closestDist) { closestDist = dist; closest = { point: d, si, pi }; }
          }
        }
      }
      if (closest) {
        showTooltip(e, closest.point, currentSeries[closest.si]?.name);
        opts.onHover?.(closest.point, closest.pi, closest.si);
        found = true;
      }
    } else if (opts.type === "pie" || opts.type === "donut") {
      for (const d of currentData) {
        const pie = (d as any)._hitPie;
        if (pie) {
          const dx = mx - pie.cx;
          const dy = my - pie.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= pie.innerR && dist <= pie.outerR) {
            let angle = Math.atan2(dy, dx);
            if (angle < -Math.PI / 2) angle += Math.PI * 2;
            if (angle >= pie.startAngle && angle <= pie.endAngle) {
              showTooltip(e, d, d.name ?? d.label);
              opts.onHover?.(d, currentData.indexOf(d));
              found = true; break;
            }
          }
        }
      }
    } else if (opts.type === "scatter") {
      for (let si = 0; si < currentSeries.length; si++) {
        const s = currentSeries[si]!;
        for (const d of s.data) {
          const hp = (d as any)._hitPos;
          if (hp && Math.abs(mx - hp.x) < 10 && Math.abs(my - hp.y) < 10) {
            showTooltip(e, d, s.name);
            opts.onHover?.(d, s.data.indexOf(d), si);
            found = true; break;
          }
        }
        if (found) break;
      }
    }

    if (!found) {
      tooltipEl.style.display = "none";
      opts.onHover?.(null, -1);
    }
  }

  function handleClick(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (opts.type === "bar") {
      for (const s of currentSeries) {
        for (const d of s.data) {
          const hr = (d as any)._hitRect;
          if (hr && mx >= hr.x && mx <= hr.x + hr.w && my >= hr.y && my <= hr.y + hr.h) {
            opts.onPointClick?.(d, s.data.indexOf(d), currentSeries.indexOf(s)); return;
          }
        }
      }
    } else if (opts.type === "pie" || opts.type === "donut") {
      for (const d of currentData) {
        const pie = (d as any)._hitPie;
        if (pie) {
          const dx = mx - pie.cx;
          const dy = my - pie.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= pie.innerR && dist <= pie.outerR) {
            let angle = Math.atan2(dy, dx);
            if (angle < -Math.PI / 2) angle += Math.PI * 2;
            if (angle >= pie.startAngle && angle <= pie.endAngle) {
              opts.onPointClick?.(d, currentData.indexOf(d)); return;
            }
          }
        }
      }
    }
  }

  function showTooltip(e: MouseEvent, point: ChartDataPoint, seriesName?: string): void {
    if (!tooltipEl) return;
    const rect = root.getBoundingClientRect();
    const content = opts.tooltipFormatter?.(point, seriesName)
      ?? `${seriesName ? `<b>${seriesName}</b><br/>` : ""}${point.label ?? ""}: ${formatNumber(point.value)}`;
    tooltipEl.innerHTML = content;
    tooltipEl.style.display = "block";

    let tx = e.clientX - rect.left;
    let ty = e.clientY - rect.top;
    // Keep within bounds
    const ttRect = tooltipEl.getBoundingClientRect();
    if (tx - ttRect.width / 2 < 0) tx = ttRect.width / 2;
    if (tx + ttRect.width / 2 > rect.width) tx = rect.width - ttRect.width / 2;
    if (ty - ttRect.height - 8 < 0) ty = ttRect.height + 16;

    tooltipEl.style.left = `${tx}px`;
    tooltipEl.style.top = `${ty}px`;
  }

  // --- Event Listeners ---

  canvas.addEventListener("mousemove", handleMouseMove);
  canvas.addEventListener("click", handleClick);
  canvas.addEventListener("mouseleave", () => { if (tooltipEl) tooltipEl.style.display = "none"; });

  // Responsive
  resizeObserver = new ResizeObserver(() => { if (!destroyed) render(animProgress); });
  resizeObserver.observe(root);

  // Initial render
  animate();

  const instance: ChartInstance = {
    element: root,
    canvas,

    setData(series, data) {
      currentSeries = series ?? currentSeries;
      if (data) currentData = data;
      animProgress = 0;
      animate();
    },

    updateOptions(newOpts) {
      Object.assign(opts, newOpts);
      if (newOpts.theme) {
        const t = newOpts.theme === "dark" ? DARK_THEME : LIGHT_THEME;
        Object.assign(theme, t);
      }
      render(animProgress);
    },

    resize() { render(animProgress); },

    destroy() {
      destroyed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (resizeObserver) resizeObserver.disconnect();
      root.remove();
    },

    toDataURL(type = "image/png", quality = 1) {
      return canvas.toDataURL(type, quality);
    },
  };

  return instance;
}
