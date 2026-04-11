/**
 * Chart Base: Canvas-based chart rendering engine with common chart types
 * (line, bar, area, pie, doughnut, scatter), responsive sizing, animations,
 * tooltips, legends, axis formatting, and accessibility.
 */

// --- Types ---

export type ChartType = "line" | "bar" | "area" | "pie" | "doughnut" | "scatter" | "radar";

export interface ChartDataPoint {
  label?: string;
  value: number;
  /** Secondary value for scatter/bubble charts */
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
  /** Point/segment border width */
  borderWidth?: number;
  /** Fill opacity for area charts */
  fillOpacity?: number;
  /** Show data points on line charts? */
  showPoints?: boolean;
  /** Point radius */
  pointRadius?: number;
  /** Dashed line pattern [dash, gap] */
  dashPattern?: number[];
  /** Hidden from legend/render? */
  hidden?: boolean;
}

export interface ChartAxisOptions {
  show?: boolean;
  title?: string;
  min?: number;
  max?: number;
  /** Number of tick marks */
  ticks?: number;
  /** Format function for labels */
  format?: (value: number) => string;
  /** Grid lines */
  gridLines?: boolean;
  gridColor?: string;
}

export interface ChartLegendOptions {
  show?: boolean;
  position?: "top" | "bottom" | "left" | "right";
  maxWidth?: string;
  itemClick?: (datasetIndex: number) => void;
}

export interface ChartTooltipOptions {
  show?: boolean;
  format?: (point: TooltipData) => string;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderRadius?: number;
  padding?: number;
}

export interface TooltipData {
  datasetLabel: string;
  label: string;
  value: number;
  x: number;
  y: number;
  color: string;
  index: number;
}

export interface ChartAnimationOptions {
  enabled?: boolean;
  duration?: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut";
  /** Stagger delay between elements (ms) */
  stagger?: number;
}

export interface ChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Chart type */
  type: ChartType;
  /** Datasets to render */
  datasets: ChartDataset[];
  /** X-axis options */
  xAxis?: ChartAxisOptions;
  /** Y-axis options */
  yAxis?: ChartAxisOptions;
  /** Legend options */
  legend?: ChartLegendOptions;
  /** Tooltip options */
  tooltip?: ChartTooltipOptions;
  /** Animation options */
  animation?: ChartAnimationOptions;
  /** Chart title */
  title?: string;
  /** Responsive (resize with container) */
  responsive?: boolean;
  /** Aspect ratio (width / height) */
  aspectRatio?: number;
  /** Padding inside chart area */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Background color */
  backgroundColor?: string;
  /** Callback on click */
  onClick?: (point: TooltipData | null) => void;
  /** Callback on hover */
  onHover?: (point: TooltipData | null) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChartInstance {
  element: HTMLCanvasElement;
  /** Update data and re-render */
  update: (datasets?: ChartDataset[]) => void;
  /** Resize canvas */
  resize: () => void;
  /** Get canvas as data URL (for export) */
  toDataURL: (type?: string, quality?: number) => string;
  /** Get current animation state */
  isAnimating: () => boolean;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Color Palette ---

const DEFAULT_COLORS = [
  "#4338ca", "#16a34a", "#dc2626", "#f59e0b", "#06b6d4",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

function getColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// --- Easing Functions ---

const EASING: Record<string, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

// --- Main Class ---

export class ChartManager {
  create(options: ChartOptions): ChartInstance {
    const opts = {
      type: options.type,
      datasets: options.datasets,
      xAxis: { show: true, gridLines: true, ...options.xAxis },
      yAxis: { show: true, gridLines: true, ...options.yAxis },
      legend: { show: true, position: "bottom", ...options.legend },
      tooltip: { show: true, ...options.tooltip },
      animation: { enabled: true, duration: 600, easing: "easeOut", stagger: 30, ...options.animation },
      responsive: options.responsive ?? true,
      aspectRatio: options.aspectRatio ?? 2,
      padding: { top: 20, right: 20, bottom: 40, left: 50, ...options.padding },
      backgroundColor: options.backgroundColor ?? "#ffffff",
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Chart: container not found");

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.className = `chart-canvas ${opts.className}`;
    canvas.style.cssText = `width:100%;display:block;`;
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d")!;
    let destroyed = false;
    let animating = false;
    let animProgress = 0;
    let animFrame: number | null = null;
    let hoverPoint: TooltipData | null = null;

    // Device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;

    function setupCanvas(): void {
      const rect = container.getBoundingClientRect();
      const w = rect.width || 400;
      const h = w / opts.aspectRatio!;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // --- Layout Calculations ---

    interface ChartArea {
      x: number; y: number; width: number; height: number;
    }

    function getChartArea(): ChartArea {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      return {
        x: opts.padding!.left!,
        y: opts.padding!.top!,
        width: w - opts.padding!.left! - opts.padding!.right!,
        height: h - opts.padding!.top! - opts.padding!.bottom!,
      };
    }

    // --- Data Helpers ---

    function getAllLabels(): string[] {
      const labels = new Set<string>();
      for (const ds of opts.datasets) {
        for (const pt of ds.data) {
          if (pt.label) labels.add(pt.label);
        }
      }
      return [...labels];
    }

    function getValueRange(): { min: number; max: number } {
      let min = Infinity, max = -Infinity;
      for (const ds of opts.datasets) {
        if (ds.hidden) continue;
        for (const pt of ds.data) {
          if (pt.value < min) min = pt.value;
          if (pt.value > max) max = pt.value;
        }
      }
      if (!isFinite(min)) min = 0;
      if (!isFinite(max)) max = 10;
      // Add padding
      const pad = (max - min) * 0.05 || 1;
      return { min: Math.max(0, min - pad), max: max + pad };
    }

    // --- Rendering ---

    function clear(): void {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.fillStyle = opts.backgroundColor!;
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }

    function drawTitle(): void {
      if (!opts.title) return;
      ctx.save();
      ctx.fillStyle = "#374151";
      ctx.font = "bold 14px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(opts.title, (canvas.width / dpr) / 2, 16);
      ctx.restore();
    }

    function drawAxes(area: ChartArea): void {
      const labels = getAllLabels();
      const range = getValueRange();

      // Y-axis
      if (opts.yAxis!.show && !["pie", "doughnut"].includes(opts.type)) {
        const yTicks = opts.yAxis!.ticks ?? 5;
        ctx.save();
        ctx.fillStyle = "#9ca3af";
        ctx.font = "11px -apple-system, sans-serif";
        ctx.textAlign = "right";

        for (let i = 0; i <= yTicks; i++) {
          const val = range.min + (range.max - range.min) * (i / yTicks);
          const y = area.y + area.height - (area.height * (i / yTicks));
          const label = opts.yAxis!.format ? opts.yAxis.format!(val) : formatNumber(val);

          ctx.fillText(label, area.x - 8, y + 4);

          // Grid line
          if (opts.yAxis!.gridLines) {
            ctx.strokeStyle = opts.yAxis!.gridColor ?? "#f0f0f0";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(area.x, y);
            ctx.lineTo(area.x + area.width, y);
            ctx.stroke();
          }
        }

        // Y-axis title
        if (opts.yAxis!.title) {
          ctx.save();
          ctx.translate(12, area.y + area.height / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.textAlign = "center";
          ctx.fillText(opts.yAxis!.title!, 0, 0);
          ctx.restore();
        }

        ctx.restore();
      }

      // X-axis
      if (opts.xAxis!.show && !["pie", "doughnut"].includes(opts.type) && labels.length > 0) {
        ctx.save();
        ctx.fillStyle = "#9ca3af";
        ctx.font = "11px -apple-system, sans-serif";
        ctx.textAlign = "center";

        const step = area.width / Math.max(labels.length, 1);
        for (let i = 0; i < labels.length; i++) {
          const x = area.x + step * (i + 0.5);
          ctx.fillText(labels[i], x, area.y + area.height + 18);
        }

        ctx.restore();
      }
    }

    function drawLineChart(area: ChartArea, progress: number): void {
      const labels = getAllLabels();
      const range = getValueRange();
      const stepX = area.width / Math.max(labels.length - 1, 1);

      for (let di = 0; di < opts.datasets.length; di++) {
        const ds = opts.datasets[di]!;
        if (ds.hidden) continue;
        const color = ds.color ?? getColor(di);
        const bgColor = ds.backgroundColor ?? hexToRgba(color, 0.15);

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Area fill
        if (opts.type === "area") {
          ctx.beginPath();
          ctx.moveTo(area.x, area.y + area.height);
          for (let i = 0; i < ds.data.length; i++) {
            const x = area.x + i * stepX;
            const val = ds.data[i]!.value;
            const normVal = (val - range.min) / (range.max - range.min);
            const y = area.y + area.height - (area.height * normVal * progress);
            if (i === 0) ctx.lineTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.lineTo(area.x + (ds.data.length - 1) * stepX, area.y + area.height);
          ctx.closePath();
          ctx.fillStyle = bgColor;
          ctx.fill();
        }

        // Line
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = ds.borderWidth ?? 2;
        if (ds.dashPattern) ctx.setLineDash(ds.dashPattern);

        for (let i = 0; i < ds.data.length; i++) {
          const x = area.x + i * stepX;
          const val = ds.data[i]!.value;
          const normVal = (val - range.min) / (range.max - range.min);
          const y = area.y + area.height - (area.height * normVal * progress);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points
        if (ds.showPoints !== false) {
          for (let i = 0; i < ds.data.length; i++) {
            const x = area.x + i * stepX;
            const val = ds.data[i]!.value;
            const normVal = (val - range.min) / (range.max - range.min);
            const y = area.y + area.height - (area.height * normVal * progress);
            const r = ds.pointRadius ?? 4;

            ctx.beginPath();
            ctx.arc(x, y, r * progress, 0, Math.PI * 2);
            ctx.fillStyle = "#fff";
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }

        ctx.restore();
      }
    }

    function drawBarChart(area: ChartArea, progress: number): void {
      const labels = getAllLabels();
      const range = getValueRange();
      const groupWidth = area.width / labels.length;
      const barPadding = groupWidth * 0.2;
      const barWidth = (groupWidth - barPadding) / Math.max(opts.datasets.filter((d) => !d.hidden).length, 1);

      let barIndex = 0;
      for (let di = 0; di < opts.datasets.length; di++) {
        const ds = opts.datasets[di]!;
        if (ds.hidden) continue;
        const color = ds.color ?? getColor(di);

        for (let i = 0; i < ds.data.length; i++) {
          const val = ds.data[i]!.value;
          const normVal = (val - range.min) / (range.max - range.min);
          const x = area.x + i * groupWidth + barPadding / 2 + barIndex * barWidth;
          const barH = area.height * normVal * progress;
          const y = area.y + area.height - barH;

          ctx.save();
          ctx.fillStyle = color;
          // Rounded top corners
          const radius = Math.min(4, barWidth / 4);
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + barWidth - radius, y);
          ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
          ctx.lineTo(x + barWidth, area.y + area.height);
          ctx.lineTo(x, area.y + area.height);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        barIndex++;
      }
    }

    function drawPieChart(area: ChartArea, progress: number, doughnut = false): void {
      const cx = area.x + area.width / 2;
      const cy = area.y + area.height / 2;
      const radius = Math.min(area.width, area.height) / 2 - 10;
      const innerRadius = doughnut ? radius * 0.55 : 0;

      let total = 0;
      for (const ds of opts.datasets) {
        if (ds.hidden) continue;
        for (const pt of ds.data) total += Math.abs(pt.value);
      }
      if (total === 0) return;

      let startAngle = -Math.PI / 2;
      let globalIdx = 0;

      for (let di = 0; di < opts.datasets.length; di++) {
        const ds = opts.datasets[di]!;
        if (ds.hidden) continue;
        const color = ds.color ?? getColor(di);

        for (let i = 0; i < ds.data.length; i++) {
          const sliceAngle = (Math.abs(ds.data[i]!.value) / total) * Math.PI * 2 * progress;
          const endAngle = startAngle + sliceAngle;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(startAngle) * innerRadius, cy + Math.sin(startAngle) * innerRadius);
          ctx.arc(cx, cy, radius, startAngle, endAngle);
          ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();
          ctx.restore();

          startAngle = endAngle;
          globalIdx++;
        }
      }
    }

    function drawScatterChart(area: ChartArea, progress: number): void {
      const range = getValueRange();
      let range2 = { min: Infinity, max: -Infinity };
      for (const ds of opts.datasets) {
        for (const pt of ds.data) {
          if (pt.value2 != null) {
            if (pt.value2 < range2.min) range2.min = pt.value2;
            if (pt.value2 > range2.max) range2.max = pt.value2;
          }
        }
      }
      if (!isFinite(range2.min)) { range2.min = 0; range2.max = 10; }

      for (let di = 0; di < opts.datasets.length; di++) {
        const ds = opts.datasets[di]!;
        if (ds.hidden) continue;
        const color = ds.color ?? getColor(di);

        for (const pt of ds.data) {
          const nx = (pt.value - range.min) / (range.max - range.min);
          const ny = (pt.value2! - range2.min) / (range2.max - range2.min);
          const x = area.x + area.width * nx;
          const y = area.y + area.height - area.height * ny;
          const r = (ds.pointRadius ?? 6) * progress;

          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(color, 0.7);
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    function drawRadarChart(area: ChartArea, progress: number): void {
      const labels = getAllLabels();
      if (labels.length < 3) return;

      const cx = area.x + area.width / 2;
      const cy = area.y + area.height / 2;
      const radius = Math.min(area.width, area.height) / 2 - 30;
      const angleStep = (Math.PI * 2) / labels.length;
      const range = getValueRange();

      // Draw web
      ctx.save();
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 0.5;
      for (let ring = 1; ring <= 4; ring++) {
        const r = (radius / 4) * ring;
        ctx.beginPath();
        for (let i = 0; i <= labels.length; i++) {
          const angle = -Math.PI / 2 + angleStep * i;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // Axis lines
      for (let i = 0; i < labels.length; i++) {
        const angle = -Math.PI / 2 + angleStep * i;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.stroke();
        // Labels
        ctx.fillStyle = "#6b7280";
        ctx.font = "11px -apple-system, sans-serif";
        ctx.textAlign = "center";
        const lx = cx + Math.cos(angle) * (radius + 16);
        const ly = cy + Math.sin(angle) * (radius + 16);
        ctx.fillText(labels[i], lx, ly);
      }
      ctx.restore();

      // Draw data polygons
      for (let di = 0; di < opts.datasets.length; di++) {
        const ds = opts.datasets[di]!;
        if (ds.hidden) continue;
        const color = ds.color ?? getColor(di);

        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < labels.length; i++) {
          const angle = -Math.PI / 2 + angleStep * i;
          const pt = ds.data[i];
          const val = pt ? pt.value : 0;
          const normVal = (val - range.min) / (range.max - range.min);
          const r = radius * normVal * progress;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = hexToRgba(color, 0.2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawLegend(): void {
      if (!opts.legend!.show) return;
      const visibleDs = opts.datasets.filter((d) => !d.hidden);
      if (visibleDs.length === 0) return;

      ctx.save();
      ctx.font = "11px -apple-system, sans-serif";
      const itemW = 100;
      const itemH = 20;
      const totalW = visibleDs.length * itemW;
      let lx: number, ly: number;

      switch (opts.legend!.position) {
        case "top":
          lx = (canvas.width / dpr - totalW) / 2;
          ly = opts.title ? 28 : 8;
          break;
        case "bottom":
          lx = (canvas.width / dpr - totalW) / 2;
          ly = (canvas.height / dpr) - 8;
          break;
        case "left":
          lx = 8;
          ly = (canvas.height / dpr - itemH) / 2;
          break;
        default: // right
          lx = (canvas.width / dpr) - totalW - 8;
          ly = (canvas.height / dpr - itemH) / 2;
      }

      for (let i = 0; i < visibleDs.length; i++) {
        const ds = visibleDs[i]!;
        const color = ds.color ?? getColor(opts.datasets.indexOf(ds));

        // Color swatch
        ctx.fillStyle = color;
        ctx.fillRect(lx + i * itemW, ly + 5, 12, 12);

        // Label
        ctx.fillStyle = "#374151";
        ctx.textAlign = "left";
        const label = ds.label.length > 12 ? ds.label.slice(0, 12) + "..." : ds.label;
        ctx.fillText(label, lx + i * itemW + 17, ly + 14);
      }

      ctx.restore();
    }

    function drawTooltip(): void {
      if (!opts.tooltip!.show || !hoverPoint) return;

      const text = opts.tooltip!.format
        ? opts.tooltip!.format!(hoverPoint)
        : `${hoverPoint.datasetLabel}: ${hoverPoint.label} — ${formatNumber(hoverPoint.value)}`;

      ctx.save();
      ctx.font = "12px -apple-system, sans-serif";
      const metrics = ctx.measureText(text);
      const tw = metrics.width + 16;
      const th = 28;
      const tx = hoverPoint.x + 10;
      const ty = hoverPoint.y - th - 8;

      // Clamp to canvas
      const clampedTx = Math.min(tx, (canvas.width / dpr) - tw - 4);
      const clampedTy = Math.max(ty, 4);

      // Background
      ctx.fillStyle = opts.tooltip!.backgroundColor ?? "rgba(0,0,0,0.85)";
      roundRect(ctx, clampedTx, clampedTy, tw, th, opts.tooltip!.borderRadius ?? 6);
      ctx.fill();

      if (opts.tooltip!.borderColor) {
        ctx.strokeStyle = opts.tooltip!.borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Text
      ctx.fillStyle = opts.tooltip!.textColor ?? "#fff";
      ctx.textAlign = "left";
      ctx.fillText(text, clampedTx + 8, clampedTy + 18);

      ctx.restore();
    }

    function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.quadraticCurveTo(x + w, y, x + w, y + r);
      c.lineTo(x + w, y + h - r);
      c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      c.lineTo(x + r, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - r);
      c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
    }

    function formatNumber(n: number): string {
      if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + "M";
      if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + "K";
      return n.toFixed(n % 1 === 0 ? 0 : 1);
    }

    // --- Main Render ---

    function render(progress = 1): void {
      clear();
      const area = getChartArea();

      drawTitle();
      drawAxes(area);

      switch (opts.type) {
        case "line":
        case "area":
          drawLineChart(area, progress);
          break;
        case "bar":
          drawBarChart(area, progress);
          break;
        case "pie":
          drawPieChart(area, progress, false);
          break;
        case "doughnut":
          drawPieChart(area, progress, true);
          break;
        case "scatter":
          drawScatterChart(area, progress);
          break;
        case "radar":
          drawRadarChart(area, progress);
          break;
      }

      drawLegend();
      drawTooltip();
    }

    // --- Animation ---

    function animate(): void {
      if (!opts.animation!.enabled || destroyed) {
        render(1);
        return;
      }

      animating = true;
      animProgress = 0;
      const startTime = performance.now();
      const duration = opts.animation!.duration!;

      function frame(time: number): void {
        if (destroyed) return;
        const elapsed = time - startTime;
        animProgress = Math.min(elapsed / duration, 1);
        const eased = EASING[opts.animation!.easing!](animProgress);
        render(eased);

        if (animProgress < 1) {
          animFrame = requestAnimationFrame(frame);
        } else {
          animating = false;
          animFrame = null;
        }
      }

      animFrame = requestAnimationFrame(frame);
    }

    // --- Hit Testing ---

    function hitTest(mx: number, my: number): TooltipData | null {
      const area = getChartArea();
      const labels = getAllLabels();
      const range = getValueRange();

      if (["pie", "doughnut"].includes(opts.type)) {
        const cx = area.x + area.width / 2;
        const cy = area.y + area.height / 2;
        const radius = Math.min(area.width, area.height) / 2 - 10;
        const dist = Math.sqrt((mx - cx) ** 2 + (my - cy) ** 2);
        if (dist > radius) return null;

        let total = 0;
        for (const ds of opts.datasets) {
          if (ds.hidden) continue;
          for (const pt of ds.data) total += Math.abs(pt.value);
        }
        if (total === 0) return null;

        let angle = Math.atan2(my - cy, mx - cx) + Math.PI / 2;
        if (angle < 0) angle += Math.PI * 2;

        let cumAngle = 0;
        let globalIdx = 0;
        for (let di = 0; di < opts.datasets.length; di++) {
          const ds = opts.datasets[di]!;
          if (ds.hidden) continue;
          for (let i = 0; i < ds.data.length; i++) {
            const sliceAngle = (Math.abs(ds.data[i]!.value) / total) * Math.PI * 2;
            if (angle >= cumAngle && angle < cumAngle + sliceAngle) {
              return { datasetLabel: ds.label, label: ds.data[i]!.label ?? "", value: ds.data[i]!.value, x: mx, y: my, color: ds.color ?? getColor(di), index: globalIdx };
            }
            cumAngle += sliceAngle;
            globalIdx++;
          }
        }
        return null;
      }

      // For cartesian charts
      if (labels.length === 0) return null;
      const stepX = area.width / labels.length;
      const colIdx = Math.floor((mx - area.x) / stepX);
      if (colIdx < 0 || colIdx >= labels.length) return null;

      for (let di = 0; di < opts.datasets.length; di++) {
        const ds = opts.datasets[di]!;
        if (ds.hidden || colIdx >= ds.data.length) continue;
        const pt = ds.data[colIdx]!;
        const normVal = (pt.value - range.min) / (range.max - range.min);
        const py = area.y + area.height - area.height * normVal;
        if (Math.abs(my - py) < 15) {
          return { datasetLabel: ds.label, label: pt.label ?? labels[colIdx], value: pt.value, x: mx, y: py, color: ds.color ?? getColor(di), index: colIdx };
        }
      }

      return null;
    }

    // --- Event Handlers ---

    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitTest(mx, my);
      hoverPoint = hit;
      canvas.style.cursor = hit ? "pointer" : "default";
      render(animating ? animProgress : 1);
      opts.onHover?.(hit);
    });

    canvas.addEventListener("mouseleave", () => {
      hoverPoint = null;
      render(animating ? animProgress : 1);
      opts.onHover?.(null);
    });

    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitTest(mx, my);
      opts.onClick?.(hit);
    });

    // Resize handling
    let resizeTimer: ReturnType<typeof setTimeout>;
    if (opts.responsive) {
      const ro = new ResizeObserver(() => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (!destroyed) {
            setupCanvas();
            render(animating ? animProgress : 1);
          }
        }, 100);
      });
      ro.observe(container);
      (instance as any)._resizeObs = ro;
    }

    // Initial setup & render
    setupCanvas();
    animate();

    const instance: ChartInstance = {
      element: canvas,

      update(newDatasets?: ChartDataset[]) {
        if (newDatasets) opts.datasets = newDatasets;
        setupCanvas();
        animate();
      },

      resize() {
        setupCanvas();
        render(animating ? animProgress : 1);
      },

      toDataURL(type = "image/png", quality = 0.92) {
        return canvas.toDataURL(type, quality);
      },

      isAnimating: () => animating,

      destroy() {
        destroyed = true;
        if (animFrame) cancelAnimationFrame(animFrame);
        const obs = (instance as any)._resizeObs as ResizeObserver;
        if (obs) obs.disconnect();
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
