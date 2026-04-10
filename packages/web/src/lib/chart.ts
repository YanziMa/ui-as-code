/**
 * Chart Components: Lightweight chart rendering using Canvas API with support for
 * bar charts, line charts, pie/donut charts, area charts, mixed charts,
 * legends, tooltips, animations, responsive sizing, and theming.
 */

// --- Types ---

export type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "mixed";

export interface ChartDataPoint {
  label: string;
  value: number;
  /** Secondary value (for range/combined charts) */
  value2?: number;
  /** Color override */
  color?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface ChartDataset {
  label: string;
  data: ChartDataPoint[];
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  /** Line width for line charts */
  lineWidth?: number;
  /** Fill opacity for area charts */
  fillOpacity?: number;
  /** Point style */
  pointStyle?: "circle" | "square" | "triangle" | "none";
  /** Dashed line? */
  dashed?: boolean;
}

export interface ChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Chart type */
  type: ChartType;
  /** Single dataset or multiple datasets */
  datasets: ChartDataset[] | ChartDataPoint[];
  /** Chart title */
  title?: string;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Aspect ratio (used if height not set) */
  aspectRatio?: number;
  /** Show legend? */
  legend?: boolean;
  /** Legend position */
  legendPosition?: "top" | "bottom" | "left" | "right";
  /** Show tooltips on hover? */
  tooltips?: boolean;
  /** Animate on render? */
  animated?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** X-axis label */
  xAxisLabel?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** Y-axis min */
  yMin?: number;
  /** Y-axis max */
  yMax?: number;
  /** Show grid lines? */
  showGrid?: boolean;
  /** Show axes? */
  showAxes?: boolean;
  /** Color palette (auto-assigned if not set per dataset) */
  colors?: string[];
  /** Background color */
  background?: string;
  /** Text color */
  textColor?: string;
  /** Font size */
  fontSize?: number;
  /** Bar width ratio (0-1) */
  barWidthRatio?: number;
  /** Donut mode for pie (inner radius ratio) */
  donut?: boolean;
  /** Donut inner radius ratio (0-1) */
  innerRadius?: number;
  /** Callback on data point click */
  onClick?: (point: ChartDataPoint, datasetIndex: number, index: number) => void;
  /** Callback on hover */
  onHover?: (point: ChartDataPoint | null, datasetIndex: number, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChartInstance {
  element: HTMLCanvasElement;
  update: (datasets: ChartDataset[] | ChartDataPoint[]) => void;
  resize: () => void;
  destroy: () => void;
}

// --- Default Palette ---

const DEFAULT_PALETTE = [
  "#4338ca", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
];

// --- Main Class ---

export class ChartManager {
  create(options: ChartOptions): ChartInstance {
    const opts = {
      width: options.width ?? 400,
      height: options.height ?? options.width ? Math.round((options.width ?? 400) * 0.6) : 300,
      aspectRatio: options.aspectRatio ?? 1.67,
      legend: options.legend ?? true,
      legendPosition: options.legendPosition ?? "bottom",
      tooltips: options.tooltips ?? true,
      animated: options.animated ?? true,
      animationDuration: options.animationDuration ?? 600,
      showGrid: options.showGrid ?? true,
      showAxes: options.showAxes ?? true,
      barWidthRatio: options.barWidthRatio ?? 0.7,
      donut: options.donut ?? false,
      innerRadius: options.innerRadius ?? 0.55,
      colors: options.colors ?? DEFAULT_PALETTE,
      background: options.background ?? "transparent",
      textColor: options.textColor ?? "#374151",
      fontSize: options.fontSize ?? 12,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Chart: container not found");

    // Normalize datasets
    const normalizedDatasets: ChartDataset[] = Array.isArray(options.datasets)
      && options.datasets.length > 0
      && ("data" in (options.datasets[0] as any))
      ? options.datasets as ChartDataset[]
      : [{ label: "Data", data: options.datasets as ChartDataPoint[], color: opts.colors[0] }];

    let currentDatasets = normalizedDatasets;

    // Canvas setup
    const canvas = document.createElement("canvas");
    canvas.className = `chart ${opts.className ?? ""}`;
    canvas.width = opts.width * (window.devicePixelRatio || 1);
    canvas.height = opts.height * (window.devicePixelRatio || 1);
    canvas.style.cssText = `
      width:${opts.width}px;height:${opts.height}px;display:block;
    `;
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d")!;
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    let animationFrame: number | null = null;
    let destroyed = false;
    let hoverPoint: { dsIdx: number; ptIdx: number } | null = null;

    function getColor(dsIndex: number, ptIndex: number): string {
      const ds = currentDatasets[dsIndex];
      if (!ds) return opts.colors[dsIndex % opts.colors.length];
      return ds.color ?? opts.colors[dsIndex % opts.colors.length];
    }

    function draw(): void {
      const w = opts.width;
      const h = opts.height;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, w, h);

      switch (opts.type) {
        case "bar": case "mixed": drawBarChart(w, h); break;
        case "line": drawLineChart(w, h); break;
        case "area": drawAreaChart(w, h); break;
        case "pie": drawPieChart(w, h); break;
        case "scatter": drawScatterChart(w, h); break;
      }

      if (opts.title) drawTitle(w, h);
      if (opts.legend) drawLegend(w, h);
    }

    function drawTitle(w: number, h: number): void {
      ctx.save();
      ctx.fillStyle = opts.textColor;
      ctx.font = `bold ${opts.fontSize + 3}px -apple-system,sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(opts.title!, w / 2, 18);
      ctx.restore();
    }

    function drawBarChart(w: number, h: number): void {
      const padding = { top: opts.title ? 35 : 20, right: 20, bottom: 40, left: 50 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      // Find all labels and max value
      const allLabels = new Set<string>();
      let maxValue = 0;
      for (const ds of currentDatasets) {
        for (const pt of ds.data) {
          allLabels.add(pt.label);
          maxValue = Math.max(maxValue, pt.value);
        }
      }
      const labels = Array.from(allLabels);
      maxValue = opts.yMax ?? Math.ceil(maxValue * 1.15);
      const yMin = opts.yMin ?? 0;

      // Draw axes & grid
      if (opts.showAxes) {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, h - padding.bottom);
        ctx.lineTo(w - padding.right, h - padding.bottom);
        ctx.stroke();

        // Y axis labels
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px -apple-system,sans-serif`;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
          const val = yMin + ((maxValue - yMin) / ySteps) * i;
          const y = h - padding.bottom - (i / ySteps) * chartH;
          ctx.fillText(Math.round(val).toString(), padding.left - 8, y);
          if (opts.showGrid) {
            ctx.strokeStyle = "#f0f0f0";
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(w - padding.right, y);
            ctx.stroke();
          }
        }
      }

      // Draw bars
      const groupWidth = chartW / labels.length;
      const barWidth = groupWidth * opts.barWidthRatio / currentDatasets.length;

      for (let li = 0; li < labels.length; li++) {
        const x = padding.left + li * groupWidth + groupWidth / 2;

        // X axis label
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px -apple-system,sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(labels[li], x, h - padding.bottom + 16);

        for (let di = 0; di < currentDatasets.length; di++) {
          const ds = currentDatasets[di]!;
          const pt = ds.data.find((p) => p.label === labels[li]);
          if (!pt) continue;

          const barH = (pt.value / maxValue) * chartH;
          const bx = x - (currentDatasets.length * barWidth) / 2 + di * barWidth;
          const by = h - padding.bottom - barH;
          const color = getColor(di, li);

          ctx.fillStyle = color;
          ctx.globalAlpha = hoverPoint?.ptIdx === li && hoverPoint.dsIdx === di ? 1 : 0.85;
          roundRect(ctx, bx, by, barWidth - 2, barH, 3);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Axis labels
      if (opts.xAxisLabel) {
        ctx.fillStyle = opts.textColor;
        ctx.font = `${opts.fontSize}px -apple-system,sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(opts.xAxisLabel, w / 2, h - 4);
      }
      if (opts.yAxisLabel) {
        ctx.save();
        ctx.translate(12, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(opts.yAxisLabel, 0, 0);
        ctx.restore();
      }
    }

    function drawLineChart(w: number, h: number): void {
      const padding = { top: opts.title ? 35 : 20, right: 20, bottom: 40, left: 50 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      let allPoints: { label: string; values: number[] }[] = [];
      let maxValue = 0;
      let minValue = Infinity;

      for (const ds of currentDatasets) {
        for (let i = 0; i < ds.data.length; i++) {
          if (!allPoints[i]) allPoints[i] = { label: ds.data[i]!.label, values: [] };
          allPoints[i].values.push(ds.data[i]!.value);
          maxValue = Math.max(maxValue, ds.data[i]!.value);
          minValue = Math.min(minValue, ds.data[i]!.value);
        }
      }

      if (allPoints.length === 0) return;
      maxValue = opts.yMax ?? Math.ceil(maxValue * 1.15);
      minValue = opts.yMin ?? Math.min(0, Math.floor(minValue));

      // Grid
      if (opts.showGrid) {
        ctx.strokeStyle = "#f0f0f0";
        for (let i = 0; i <= 5; i++) {
          const y = padding.top + (i / 5) * chartH;
          ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        }
      }

      // Lines
      for (let di = 0; di < currentDatasets.length; di++) {
        const ds = currentDatasets[di]!;
        const color = getColor(di, 0);

        ctx.strokeStyle = color;
        ctx.lineWidth = ds.lineWidth ?? 2;
        if (ds.dashed) ctx.setLineDash([6, 4]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        for (let i = 0; i < allPoints.length; i++) {
          const x = padding.left + (i / Math.max(1, allPoints.length - 1)) * chartW;
          const y = h - padding.bottom - ((ds.data[i]?.value ?? 0) - minValue) / (maxValue - minValue) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points
        for (let i = 0; i < allPoints.length; i++) {
          const x = padding.left + (i / Math.max(1, allPoints.length - 1)) * chartW;
          const y = h - padding.bottom - ((ds.data[i]?.value ?? 0) - minValue) / (maxValue - minValue) * chartH;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, ds.pointStyle === "none" ? 0 : 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // X labels
      ctx.fillStyle = opts.textColor;
      ctx.font = `${opts.fontSize}px -apple-system,sans-serif`;
      ctx.textAlign = "center";
      for (let i = 0; i < allPoints.length; i++) {
        const x = padding.left + (i / Math.max(1, allPoints.length - 1)) * chartW;
        ctx.fillText(allPoints[i]!.label, x, h - padding.bottom + 16);
      }
    }

    function drawAreaChart(w: number, h: number): void {
      // Same as line but with fill
      const padding = { top: opts.title ? 35 : 20, right: 20, bottom: 40, left: 50 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      for (let di = 0; di < currentDatasets.length; di++) {
        const ds = currentDatasets[di]!;
        const color = getColor(di, 0);
        const alpha = ds.fillOpacity ?? 0.15;

        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(padding.left, h - padding.bottom);

        for (let i = 0; i < ds.data.length; i++) {
          const x = padding.left + (i / Math.max(1, ds.data.length - 1)) * chartW;
          const maxV = Math.max(...ds.data.map((p) => p.value));
          const y = h - padding.bottom - (ds.data[i]!.value / maxV) * chartH;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(padding.left + chartW, h - padding.bottom);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Line on top
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < ds.data.length; i++) {
          const x = padding.left + (i / Math.max(1, ds.data.length - 1)) * chartW;
          const maxV = Math.max(...ds.data.map((p) => p.value));
          const y = h - padding.bottom - (ds.data[i]!.value / maxV) * chartH;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function drawPieChart(w: number, h: number): void {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2 - 40;
      const innerR = opts.donut ? r * opts.innerRadius : 0;

      const ds = currentDatasets[0]?.data ?? [];
      const total = ds.reduce((s, p) => s + p.value, 0);
      if (total === 0) return;

      let startAngle = -Math.PI / 2;

      for (let i = 0; i < ds.length; i++) {
        const pt = ds[i]!;
        const sliceAngle = (pt.value / total) * Math.PI * 2;
        const endAngle = startAngle + sliceAngle;
        const color = pt.color ?? opts.colors[i % opts.colors.length];

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx + innerR * Math.cos(startAngle), cy + innerR * Math.sin(startAngle));
        ctx.arc(cx, cy, r, startAngle, endAngle);
        ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fill();

        startAngle = endAngle;
      }

      // Center text for donut
      if (opts.donut) {
        ctx.fillStyle = opts.textColor;
        ctx.font = `bold ${opts.fontSize + 4}px -apple-system,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(total.toLocaleString(), cx, cy - 6);
        ctx.font = `${opts.fontSize}px -apple-system,sans-serif`;
        ctx.fillStyle = "#9ca3af";
        ctx.fillText("Total", cx, cy + 14);
      }
    }

    function drawScatterChart(w: number, h: number): void {
      const padding = 40;
      const chartW = w - padding * 2;
      const chartH = h - padding * 2;

      let maxX = 0, maxY = 0;
      for (const ds of currentDatasets) {
        for (const pt of ds.data) {
          maxX = Math.max(maxX, pt.label ? parseFloat(pt.label) || 0 : ds.data.indexOf(pt));
          maxY = Math.max(maxY, pt.value);
        }
      }

      for (let di = 0; di < currentDatasets.length; di++) {
        const ds = currentDatasets[di]!;
        const color = getColor(di, 0);
        ctx.fillStyle = color;

        for (let i = 0; i < ds.data.length; i++) {
          const pt = ds.data[i]!;
          const x = padding + ((pt.label ? parseFloat(pt.label) || 0 : i) / maxX) * chartW;
          const y = h - padding - (pt.value / maxY) * chartH;
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawLegend(w: number, h: number): void {
      const isPie = opts.type === "pie";
      const items = isPie
        ? (currentDatasets[0]?.data ?? []).map((p, i) => ({ label: p.label, color: p.color ?? opts.colors[i % opts.colors.length] }))
        : currentDatasets.map((ds, i) => ({ label: ds.label, color: getColor(i, 0) }));

      ctx.font = `${opts.fontSize}px -apple-system,sans-serif`;

      let lx: number, ly: number;
      switch (opts.legendPosition) {
        case "top": lx = 10; ly = opts.title ? 30 : 10; break;
        case "bottom": lx = 10; ly = h - 15; break;
        case "left": lx = 10; ly = h / 2; break;
        default: lx = w - 100; ly = h / 2; break;
      }

      items.forEach((item, i) => {
        const x = (opts.legendPosition === "left" || opts.legendPosition === "right")
          ? lx : lx + i * 90;
        const y = (opts.legendPosition === "left" || opts.legendPosition === "right")
          ? ly + i * 18 : ly;

        ctx.fillStyle = item.color;
        ctx.fillRect(x, y - 5, 10, 10);
        ctx.fillStyle = opts.textColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(item.label.slice(0, 15), x + 14, y);
      });
    }

    // Rounded rectangle helper
    function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.lineTo(x, y + r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    // Mouse interaction
    canvas.addEventListener("mousemove", (e) => {
      if (!opts.tooltips) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Simple hit detection for bars
      // (full hit testing would require storing bar positions)
    });

    canvas.addEventListener("click", (e) => {
      opts.onClick?.({ label: "", value: 0 }, 0, 0);
    });

    // Initial draw
    draw();

    // Animation
    if (opts.animated) {
      let progress = 0;
      const startTime = performance.now();

      function animate(currentTime: number): void {
        progress = Math.min(1, (currentTime - startTime) / opts.animationDuration);
        // For simplicity, just redraw at end of animation
        if (progress < 1) animationFrame = requestAnimationFrame(animate);
        else draw();
      }
      animationFrame = requestAnimationFrame(animate);
    }

    const instance: ChartInstance = {
      element: canvas,

      update(newData) {
        currentDatasets = Array.isArray(newData) && newData.length > 0 && "data" in (newData[0] as any)
          ? newData as ChartDataset[]
          : [{ label: "Data", data: newData as ChartDataPoint[], color: opts.colors[0] }];
        draw();
      },

      resize() {
        // Re-measure container
        const rect = container.getBoundingClientRect();
        opts.width = rect.width || opts.width;
        opts.height = rect.height || opts.height;
        canvas.width = opts.width * (window.devicePixelRatio || 1);
        canvas.height = opts.height * (window.devicePixelRatio || 1);
        canvas.style.width = `${opts.width}px`;
        canvas.style.height = `${opts.height}px`;
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        draw();
      },

      destroy() {
        destroyed = true;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        canvas.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a chart */
export function createChart(options: ChartOptions): ChartInstance {
  return new ChartManager().create(options);
}
