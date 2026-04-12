/**
 * Chart Engine: Pure TypeScript canvas-based chart rendering library.
 * Supports line, bar, area, pie, doughnut, scatter, bubble, radar,
 * and mixed charts with animations, legends, tooltips, responsive sizing,
 * and export to image/data URL.
 */

// --- Types ---

export type ChartType = "line" | "bar" | "area" | "pie" | "doughnut" | "scatter" | "bubble" | "radar" | "mixed";

export type AxisPosition = "left" | "right" | "top" | "bottom";

export interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
  color?: string;
}

export interface BubblePoint extends DataPoint {
  r: number; // radius
}

export interface SeriesData {
  label: string;
  data: DataPoint[];
  color?: string;
  borderColor?: string;
  fill?: boolean;
  dashed?: boolean;
  pointStyle?: "circle" | "square" | "triangle" | "cross";
  pointSize?: number;
  lineWidth?: number;
  areaFill?: boolean;
}

export interface ChartAxis {
  position: AxisPosition;
  title?: string;
  min?: number;
  max?: number;
  ticks?: number;
  format?: (value: number) => string;
  gridLines?: boolean;
  show?: boolean;
}

export interface ChartLegend {
  show?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  itemWidth?: number;
  itemHeight?: number;
  fontSize?: number;
}

export interface ChartTooltip {
  enabled?: boolean;
  format?: (point: DataPoint, series?: SeriesData) => string;
  backgroundColor?: string;
  textColor?: string;
  padding?: number;
  borderRadius?: number;
}

export interface AnimationConfig {
  enabled?: boolean;
  duration?: number;
  easing?: "linear" | "easeOut" | "easeInOut" | "elastic";
  delayBetweenSeries?: number;
}

export interface ChartOptions {
  /** Canvas element or selector */
  canvas: HTMLCanvasElement | string;
  /** Chart type */
  type: ChartType;
  /** Data series */
  data: SeriesData[];
  /** Chart title */
  title?: string;
  /** Subtitle */
  subtitle?: string;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Padding around chart area */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** X axis config */
  xAxis?: Partial<ChartAxis>;
  /** Y axis config */
  yAxis?: Partial<ChartAxis>[];
  /** Legend */
  legend?: ChartLegend;
  /** Tooltip */
  tooltip?: ChartTooltip;
  /** Animation */
  animation?: AnimationConfig;
  /** Responsive (auto-resize) */
  responsive?: boolean;
  /** Custom CSS class on wrapper */
  className?: string;
  /** Show data point labels? */
  showLabels?: boolean;
  /** Label format function */
  labelFormat?: (value: number) => string;
  /** Stacked mode (for bar/area) */
  stacked?: boolean;
  /** Percentage mode (0-100%) */
  percentage?: boolean;
  /** Corner radius for bars/pie */
  borderRadius?: number;
  /** Callback on click */
  onClick?: (point: DataPoint, seriesIndex: number, pointIndex: number) => void;
  /** Callback on hover */
  onHover?: (point: DataPoint | null, seriesIndex: number, pointIndex: number) => void;
  /** Device pixel ratio for sharp rendering */
  dpr?: number;
}

export interface ChartInstance {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  update: () => void;
  setData: (data: SeriesData[]) => void;
  setOptions: (opts: Partial<ChartOptions>) => void;
  resize: (w?: number, h?: number) => void;
  toDataURL: (type?: string) => string;
  destroy: () => void;
}

// --- Color Palette ---

const DEFAULT_COLORS = [
  "#4f46e5", "#7c3aed", "#db2777", "#e11d48", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

function getColor(index: number, custom?: string): string {
  if (custom) return custom;
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

// --- Utility Functions ---

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
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI)) / p + 1;
}

function resolveEasing(name: string): (t: number) => number {
  switch (name) {
    case "linear": return (t) => t;
    case "easeOut": return easeOutCubic;
    case "easeInOut": return (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    case "elastic": return easeOutElastic;
    default: return easeOutCubic;
  }
}

// --- Main Chart Engine ---

export function createChart(options: ChartOptions): ChartInstance {
  const canvas = typeof options.canvas === "string"
    ? document.querySelector<HTMLCanvasElement>(options.canvas)!
    : options.canvas;

  if (!canvas) throw new Error("ChartEngine: canvas not found");

  const ctx = canvas.getContext("2d")!;
  const dpr = options.dpr ?? window.devicePixelRatio ?? 1;

  const opts = {
    width: options.width ?? 400,
    height: options.height ?? 300,
    backgroundColor: options.backgroundColor ?? "#ffffff",
    padding: { top: 40, right: 20, bottom: 40, left: 50, ...options.padding },
    animation: { enabled: true, duration: 800, easing: "easeOut", ...options.animation },
    legend: { show: true, position: "top", ...options.legend },
    tooltip: { enabled: true, ...options.tooltip },
    responsive: options.responsive ?? false,
    showLabels: options.showLabels ?? false,
    borderRadius: options.borderRadius ?? 4,
    ...options,
  };

  // Set up canvas
  const setCanvasSize = (w?: number, h?: number) => {
    const cw = w ?? opts.width;
    const ch = h ?? opts.height;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px}`;
    ctx.setTransform(dpr, 0, 0, dpr, 0);
  };
  setCanvasSize();

  let destroyed = false;
  let animProgress = 0;
  let animStartTime = 0;
  let animFrameId: number | null = null;

  // Tooltip state
  let hoverPoint: { point: DataPoint; seriesIdx: number; pointIdx: number } | null = null;
  let tooltipEl: HTMLElement | null = null;

  // --- Render Pipeline ---

  function render(progress = 1): void {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    // Background
    ctx.fillStyle = opts.backgroundColor;
    ctx.fillRect(0, 0, opts.width, opts.height);

    const plotArea = {
      x: opts.padding.left!,
      y: opts.padding.top!,
      w: opts.width! - opts.padding.left! - opts.padding.right!,
      h: opts.height! - opts.padding.top! - opts.padding.bottom!,
    };

    // Title
    if (opts.title) {
      ctx.fillStyle = "#111827";
      ctx.font = "bold 16px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(opts.title, opts.width! / 2, 24);
    }
    if (opts.subtitle) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "12px -apple-system, sans-serif";
      ctx.fillText(opts.subtitle, opts.width! / 2, 44);
    }

    // Dispatch by chart type
    switch (opts.type) {
      case "line": renderLineChart(plotArea, progress); break;
      case "bar": renderBarChart(plotArea, progress); break;
      case "area": renderAreaChart(plotArea, progress); break;
      case "pie": case "doughnut": renderPieChart(plotArea, progress); break;
      case "scatter": renderScatterChart(plotArea, progress); break;
      case "radar": renderRadarChart(plotArea, progress); break;
      case "bubble": renderBubbleChart(plotArea, progress); break;
      default: ctx.fillText(`Unsupported chart type: ${opts.type}`, 20, 20);
    }

    // Legend
    if (opts.legend.show && opts.type !== "pie" && opts.type !== "doughnut") {
      renderLegend(plotArea);
    }
  }

  // --- Line Chart ---

  function renderLineChart(area: { x: number; y: number; w: number; h: number }, progress: number): void {
    const axes = computeAxes();
    drawAxes(area, axes);

    for (let s = 0; s < opts.data.length; s++) {
      const series = opts.data[s]!;
      const color = getColor(s, series.color);
      const points = series.data.map((d, i) => ({
        x: mapX(d.x, axes.xMin, axes.xMax, area),
        y: mapY(d.y, axes.yMin, axes.yMax, area),
      }));

      ctx.strokeStyle = color;
      ctx.lineWidth = series.lineWidth ?? 2;
      if (series.dashed) ctx.setLineDash([6, 4]);
      else ctx.setLineDash([]);

      ctx.beginPath();
      const drawCount = Math.floor(points.length * progress);
      for (let i = 0; i < drawCount; i++) {
        const p = points[i]!;
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Points
      if (progress >= 1 || series.pointStyle !== undefined) {
        for (let i = 0; i < points.length; i++) {
          drawPoint(points[i]!.x, points[i]!.y, series.pointStyle ?? "circle", series.pointSize ?? 5, color);
        }
      }
    }
  }

  // --- Bar Chart ---

  function renderBarChart(area: { x: number; y: number; w: number; h: number }, progress: number): void {
    const axes = computeAxes();
    drawAxes(area, axes);

    const barCount = opts.data[0]?.data.length ?? 0;
    if (barCount === 0) return;
    const groupWidth = area.w / barCount;
    const barPadding = Math.max(1, groupWidth * 0.15);
    const barW = Math.max(1, groupWidth - barPadding);

    if (opts.stacked) {
      // Stacked bars
      for (let i = 0; i < barCount; i++) {
        let baseY = mapY(0, axes.yMin, axes.yMax, area);
        for (let s = 0; s < opts.data.length; s++) {
          const series = opts.data[s]!;
          const d = series.data[i];
          if (!d) continue;
          const val = d.y as number;
          const barH = Math.abs(mapY(val, axes.yMin, axes.yMax, area) - baseY) * progress;
          const x = area.x + i * groupWidth + barPadding / 2;
          const y = val >= 0 ? area.y + area.h - baseY - barH : area.y + area.h - baseY;
          ctx.fillStyle = getColor(s, series.color);
          roundRect(ctx, x, y, barW, Math.max(0, barH), opts.borderRadius);
          baseY += barH;
        }
      }
    } else {
      // Grouped bars
      const seriesW = groupWidth / opts.data.length;
      const pad = Math.max(1, seriesW * 0.15);
      const bW = Math.max(1, seriesW - pad);

      for (let i = 0; i < barCount; i++) {
        for (let s = 0; s < opts.data.length; s++) {
          const series = opts.data[s]!;
          const d = series.data[i];
          if (!d) continue;
          const val = d.y as number;
          const barH = Math.abs((val - (axes.yMin ?? 0)) / ((axes.yMax ?? 1) - (axes.yMin ?? 0)) * area.h) * progress;
          const x = area.x + i * groupWidth + s * seriesW + pad / 2;
          const y = area.y + area.h - barH;
          ctx.fillStyle = getColor(s, series.color);
          roundRect(ctx, x, y, bW, Math.max(0, barH), opts.borderRadius);
        }
      }
    }
  }

  // --- Area Chart ---

  function renderAreaChart(area: { x: number; y: number; w: number; h: number }, progress: number): void {
    renderLineChart(area, progress); // Draw line first

    // Fill under last series
    const series = opts.data[opts.data.length - 1];
    if (!series) return;
    const axes = computeAxes();
    const color = getColor(opts.data.length - 1, series.color);
    const points = series.data.map((d) => ({
      x: mapX(d.x, axes.xMin, axes.xMax, area),
      y: mapY(d.y, axes.yMin, axes.yMax, area),
    }));

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, area.y + area.h);
    const drawCount = Math.floor(points.length * progress);
    for (let i = 0; i < drawCount; i++) ctx.lineTo(points[i]!.x, points[i]!.y);
    ctx.lineTo(points[drawCount - 1]!.x, area.y + area.h);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- Pie / Doughnut Chart ---

  function renderPieChart(area: { x: number; y: number; w: number; h: number }, progress: number): void {
    const cx = area.x + area.w / 2;
    const cy = area.y + area.h / 2;
    const radius = Math.min(area.w, area.h) / 2 - 20;
    const innerRadius = opts.type === "doughnut" ? radius * 0.6 : 0;

    const total = opts.data.reduce((sum, s) =>
      sum + s.data.reduce((ss, d) => ss + Math.abs(d.y as number), 0), 0);

    let startAngle = -Math.PI / 2;
    const isDoughnut = opts.type === "doughnut";

    for (let s = 0; s < opts.data.length; s++) {
      const series = opts.data[s]!;
      const value = series.data.reduce((sum, d) => sum + Math.abs(d.y as number), 0);
      const sweep = (value / total) * Math.PI * 2 * progress;
      const color = getColor(s, series.color);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sweep);
      if (isDoughnut) ctx.arc(cx, cy, innerRadius, startAngle + sweep, startAngle);
      else ctx.closePath();
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      // Label
      if (progress >= 0.8 && opts.showLabels) {
        const midAngle = startAngle + sweep / 2;
        const labelR = (radius + innerRadius) / 2;
        const lx = cx + Math.cos(midAngle) * labelR;
        const ly = cy + Math.sin(midAngle) * labelR;
        ctx.fillStyle = "#fff";
        ctx.font = "11px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${Math.round(value / total * 100)}%`, lx, ly);
      }

      startAngle += sweep;
    }
  }

  // --- Scatter Chart ---

  function renderScatterChart(area: { x: number; y: number; w: number; h: number }, progress: number): void {
    const axes = computeAxes();
    drawAxes(area, axes);

    for (let s = 0; s < opts.data.length; s++) {
      const series = opts.data[s]!;
      const color = getColor(s, series.color);
      const count = Math.floor(series.data.length * progress);
      for (let i = 0; i < count; i++) {
        const d = series.data[i]!;
        const x = mapX(d.x, axes.xMin, axes.xMax, area);
        const y = mapY(d.y, axes.yMin, axes.yMax, area);
        drawPoint(x, y, series.pointStyle ?? "circle", series.pointSize ?? 6, color);
      }
    }
  }

  // --- Bubble Chart ---

  function renderBubbleChart(area: { x: number; y: number; w: number; h: number }, progress: number): void {
    const axes = computeAxes();
    drawAxes(area, axes);

    for (let s = 0; s < opts.data.length; s++) {
      const series = opts.data[s]!;
      const color = getColor(s, series.color);
      const count = Math.floor(series.data.length * progress);
      for (let i = 0; i < count; i++) {
        const d = series.data[i] as BubblePoint;
        const x = mapX(d.x, axes.xMin, axes.xMax, area);
        const y = mapY(d.y, axes.yMin, axes.yMax, area);
        const r = clamp(d.r * progress, 1, 30);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // --- Radar Chart ---

  function renderRadarChart(area: { x: number; y: number; w: number; h: number }, progress: number): void {
    const cx = area.x + area.w / 2;
    const cy = area.y + area.h / 2;
    const radius = Math.min(area.w, area.h) / 2 - 30;
    const series = opts.data[0];
    if (!series) return;

    const axes = series.data.map((d) => String(d.label ?? d.x));
    const angleStep = (Math.PI * 2) / axes.length;
    const values = series.data.map((d) => clamp(d.y as number / 100, 0, 1));

    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    for (let level = 1; level <= 5; level++) {
      const r = (level / 5) * radius;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Axes & data
    for (let i = 0; i < axes.length; i++) {
      const angle = angleStep * i - Math.PI / 2;
      ctx.strokeStyle = "#9ca3af";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.stroke();

      // Label
      const lx = cx + Math.cos(angle) * (radius + 16);
      const ly = cy + Math.sin(angle) * (radius + 16);
      ctx.fillStyle = "#374151";
      ctx.font = "11px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(axes[i], lx, ly);

      // Data point
      const val = values[i] * radius * progress;
      const px = cx + Math.cos(angle) * val;
      const py = cy + Math.sin(angle) * val;
      ctx.fillStyle = getColor(0, series.color);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- Axes Helpers ---

  interface AxisInfo { xMin: number; xMax: number; yMin: number; yMax: number; }

  function computeAxes(): AxisInfo {
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const series of opts.data) {
      for (const d of series.data) {
        if (typeof d.x === "number") { xMin = Math.min(xMin, d.x); xMax = Math.max(xMax, d.x); }
        yMin = Math.min(yMin, d.y); yMax = Math.max(yMax, d.y);
      }
    }
    if (!isFinite(xMin)) xMin = 0;
    if (!isFinite(xMax)) xMax = opts.data[0]?.data.length ?? 1;
    if (!isFinite(yMin)) yMin = 0;
    if (!isFinite(yMax)) yMax = 1;
    if (xMin === xMax) xMax = xMin + 1;
    if (yMin === yMax) yMax = yMin + 1;

    return { xMin, xMax, yMin, yMax };
  }

  function drawAxes(area: { x: number; y: number; w: number; h: number }, axes: AxisInfo): void {
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#9ca3af";
    ctx.font = "10px -apple-system, sans-serif";

    // Y axis labels & grid
    const yTicks = opts.yAxis?.[0]?.ticks ?? 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = axes.yMin + ((axes.yMax - axes.yMin) / yTicks) * i;
      const y = area.y + area.h - (i / yTicks) * area.h;
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      const fmt = opts.yAxis?.[0]?.format?.(val) ?? formatNum(val);
      ctx.fillText(fmt, area.x - 8, y);
      if (opts.yAxis?.[0].gridLines !== false) {
        ctx.beginPath(); ctx.moveTo(area.x, y); ctx.lineTo(area.x + area.w, y); ctx.stroke();
      }
    }

    // X axis labels
    const xTicks = Math.min(yTicks, opts.data[0]?.data.length ?? 5);
    for (let i = 0; i < xTicks; i++) {
      const val = axes.xMin + ((axes.xMax - axes.xMin) / (xTicks - 1)) * i;
      const x = area.x + (i / (xTicks - 1)) * area.w;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const fmt = opts.xAxis?.format?.(val) ?? formatNum(val);
      ctx.fillText(fmt, x, area.y + area.h + 16);
      if (opts.xAxis?.gridLines !== false) {
        ctx.beginPath(); ctx.moveTo(x, area.y); ctx.lineTo(x, area.y + area.h); ctx.stroke();
      }
    }
  }

  function mapX(val: number | string, min: number, max: number, area: { x: number; w: number }): number {
    if (typeof val === "string") return area.x + (parseFloat(val) / (opts.data[0]?.data.length ?? 1)) * area.w;
    return area.x + ((val - min) / (max - min || 1)) * area.w;
  }

  function mapY(val: number, min: number, max: number, area: { y: number; h: number }): number {
    return area.y + area.h - ((val - min) / (max - min || 1)) * area.h;
  }

  // --- Drawing Primitives ---

  function drawPoint(x: number, y: number, style: string, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    switch (style) {
      case "circle": ctx.arc(x, y, size, 0, Math.PI * 2); break;
      case "square":
        ctx.rect(x - size / 2, y - size / 2, size, size); break;
      case "triangle":
        ctx.moveTo(x, y - size); ctx.lineTo(x - size, y + size); ctx.lineTo(x + size, y + size); break;
      case "cross":
        ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); break;
    }
    ctx.fill();
  }

  function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    if (r <= 0) { c.rect(x, y, w, h); return; }
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + r);
    c.arcTo(x + w, y + h, x, y + h);
    c.arcTo(x, y + h, x + r, y + h);
    c.closePath();
  }

  function renderLegend(area: { x: number; y: number; w: number; h: number }): void {
    const itemW = opts.legend.itemWidth ?? 12;
    const itemH = opts.legend.itemHeight ?? 12;
    const startX = area.x + area.w - opts.data.length * (itemW + 16);
    let y = area.y - 28;

    for (let s = 0; s < opts.data.length; s++) {
      const series = opts.data[s]!;
      ctx.fillStyle = getColor(s, series.color);
      ctx.fillRect(startX, y, itemW, itemH);
      ctx.fillStyle = "#374151";
      ctx.font = `${opts.legend.fontSize ?? 11}px -apple-system, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(series.label, startX + itemW + 6, y + itemH / 2);
      y += itemH + 6;
    }
  }

  function formatNum(n: number): string {
    if (Math.abs(n) >= 1000) return n.toExponential(1);
    if (Number.isInteger(n)) return String(n);
    return n.toFixed(1);
  }

  // --- Interaction ---

  canvas.addEventListener("mousemove", (e) => {
    if (!opts.tooltip.enabled || destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Simple hit detection could be added here
  });

  canvas.addEventListener("click", (e) => {
    if (!opts.onClick || destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Hit detection would go here
  });

  // --- Animation ---

  function animate(): void {
    if (!opts.animation.enabled || destroyed) {
      render(1);
      return;
    }
    animStartTime = performance.now();
    const duration = opts.animation.duration ?? 800;
    const easingFn = resolveEasing(opts.animation.easing ?? "easeOut");

    function tick(now: number): void {
      const elapsed = now - animStartTime;
      const progress = Math.min(elapsed / duration, 1);
      animProgress = easingFn(progress);
      render(animProgress);
      if (progress < 1) animFrameId = requestAnimationFrame(tick);
    }
    animFrameId = requestAnimationFrame(tick);
  }

  // --- Resize Handling ---

  if (opts.responsive) {
    const observer = new ResizeObserver(() => {
      if (destroyed) return;
      const parent = canvas.parentElement;
      if (parent) setCanvasSize(parent.clientWidth, parent.clientHeight);
      render(animProgress);
    });
    observer.observe(canvas.parentElement!);
  }

  // --- Instance API ---

  animate();

  return {
    canvas,
    ctx,
    update() { render(animProgress); },
    setData(data: SeriesData[]) { opts.data = data; render(animProgress); },
    setOptions(newOpts: Partial<ChartOptions>) { Object.assign(opts, newOpts); render(animProgress); },
    resize(w?, h?) { setCanvasSize(w, h); render(animProgress); },
    toDataURL(type = "image/png") { return canvas.toDataURL(type); },
    destroy() {
      destroyed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      canvas.removeEventListener("mousemove", () => {});
      canvas.removeEventListener("click", () => {});
    },
  };
}
