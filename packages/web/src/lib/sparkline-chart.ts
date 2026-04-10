/**
 * Sparkline Chart: Mini inline chart component for embedding in tables,
 * cards, and dashboards. Supports line, area, bar, and win/loss variants,
 * with configurable colors, tooltips, min/max markers, and responsive sizing.
 */

// --- Types ---

export type SparklineType = "line" | "area" | "bar" | "win-loss" | "dot";
export type TrendIndicator = "up" | "down" | "neutral";

export interface SparklinePoint {
  value: number;
  /** Optional label for tooltip */
  label?: string;
  /** Color override for this point */
  color?: string;
}

export interface SparklineOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data points */
  data: SparklinePoint[];
  /** Chart type (default: "line") */
  type?: SparklineType;
  /** Width in px (default: 120) */
  width?: number;
  /** Height in px (default: 32) */
  height?: number;
  /** Line/area color */
  color?: string;
  /** Fill color for area type (defaults to color with opacity) */
  fillColor?: string;
  /** Stroke width for line type (default: 1.5) */
  strokeWidth?: number;
  /** Show min/max labels? */
  showExtremes?: boolean;
  /** Show tooltip on hover? */
  showTooltip?: boolean;
  /** Show trend indicator dot? */
  showTrend?: boolean;
  /** Curve smoothing (default: true for line/area) */
  smooth?: boolean;
  /** Bar padding ratio (0-1, default: 0.3) */
  barPadding?: number;
  /** Null value handling: "gap" or "zero" */
  nullMode?: "gap" | "zero";
  /** Custom CSS class */
  className?: string;
  /** Callback on point click */
  onPointClick?: (point: SparklinePoint, index: number) => void;
}

export interface SparklineInstance {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  setData: (data: SparklinePoint[]) => void;
  setOptions: (opts: Partial<SparklineOptions>) => void;
  getTrend: () => TrendIndicator;
  destroy: () => void;
}

// --- Helpers ---

function detectTrend(data: SparklinePoint[]): TrendIndicator {
  if (data.length < 2) return "neutral";
  const first = data[0]!.value;
  const last = data[data.length - 1]!.value;
  const diff = last - first;
  const threshold = Math.abs(first) * 0.02; // 2% threshold
  if (diff > threshold) return "up";
  if (diff < -threshold) return "down";
  return "neutral";
}

function getTrendColor(trend: TrendIndicator): string {
  switch (trend) {
    case "up": return "#22c55e";
    case "down": return "#ef4444";
    default: return "#9ca3af";
  }
}

// --- Main Factory ---

export function createSparklineChart(options: SparklineOptions): SparklineInstance {
  const opts = {
    type: options.type ?? "line",
    width: options.width ?? 120,
    height: options.height ?? 32,
    color: options.color ?? "#4338ca",
    strokeWidth: options.strokeWidth ?? 1.5,
    showExtremes: options.showExtremes ?? false,
    showTooltip: options.showTooltip ?? false,
    showTrend: options.showTrend ?? false,
    smooth: options.smooth ?? true,
    barPadding: options.barPadding ?? 0.3,
    nullMode: options.nullMode ?? "gap",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SparklineChart: container not found");

  container.className = `sparkline-chart ${opts.className}`;
  let data = options.data;
  let destroyed = false;

  // Canvas
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `display:block;width:${opts.width}px;height:${opts.height}px;`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Sparkline chart");
  container.appendChild(canvas);

  // Tooltip
  let tooltipEl: HTMLDivElement | null = null;

  function render(): void {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = opts.width * dpr;
    canvas.height = opts.height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, opts.width, opts.height);

    if (data.length === 0) return;

    switch (opts.type) {
      case "line":   drawLine(ctx); break;
      case "area":  drawArea(ctx); break;
      case "bar":   drawBar(ctx); break;
      case "win-loss": drawWinLoss(ctx); break;
      case "dot":   drawDot(ctx); break;
    }

    // Trend indicator
    if (opts.showTrend) {
      const trend = detectTrend(data);
      const tc = getTrendColor(trend);
      ctx.beginPath();
      ctx.arc(opts.width - 8, opts.height / 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = tc;
      ctx.fill();
    }
  }

  function getDataBounds(): { values: number[]; min: number; max: number } {
    const values = data
      .map((p) => p.value)
      .filter((v) => v !== null && !isNaN(v));
    if (values.length === 0) return { values: [], min: 0, max: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    // Add 10% padding
    return { values, min: min - range * 0.05, max: max + range * 0.05 };
  }

  function drawLine(ctx: CanvasRenderingContext2D): void {
    const { values, min, max } = getDataBounds();
    const w = opts.width;
    const h = opts.height;
    const stepX = w / Math.max(values.length - 1, 1);

    ctx.beginPath();
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.strokeWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    for (let i = 0; i < values.length; i++) {
      const x = i * stepX;
      const y = h - ((values[i]! - min) / (max - min)) * (h - 4) - 2;

      if (i === 0) ctx.moveTo(x, y);
      else if (opts.smooth && values.length > 2) {
        const prevX = (i - 1) * stepX;
        const prevY = h - ((values[i - 1]! - min) / (max - min)) * (h - 4) - 2;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(cpX, prevY, cpX, (prevY + y) / 2);
        if (i === values.length - 1) ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  function drawArea(ctx: CanvasRenderingContext2D): void {
    const { values, min, max } = getDataBounds();
    const w = opts.width;
    const h = opts.height;
    const stepX = w / Math.max(values.length - 1, 1);

    // Area fill
    ctx.beginPath();
    ctx.moveTo(0, h);

    for (let i = 0; i < values.length; i++) {
      const x = i * stepX;
      const y = h - ((values[i]! - min) / (max - min)) * (h - 4) - 2;
      if (i === 0) ctx.lineTo(x, y);
      else if (opts.smooth) {
        const prevX = (i - 1) * stepX;
        const prevY = h - ((values[i - 1]! - min) / (max - min)) * (h - 4) - 2;
        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(cpX, prevY, cpX, (prevY + y) / 2);
        if (i === values.length - 1) ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = opts.fillColor ?? (opts.color + "18");
    ctx.fill();

    // Line on top
    drawLine(ctx);
  }

  function drawBar(ctx: CanvasRenderingContext2D): void {
    const { values, min, max } = getDataBounds();
    const w = opts.width;
    const h = opts.height;
    const barW = Math.max(2, (w / values.length) * (1 - opts.barPadding));
    const gap = (w - barW * values.length) / (values.length + 1);

    for (let i = 0; i < values.length; i++) {
      const val = values[i]!;
      const barH = Math.max(2, ((val - min) / (max - min)) * (h - 2));
      const x = gap + i * (barW + gap);
      const y = h - barH;

      const isPositive = val >= 0;
      ctx.fillStyle = isPositive ? opts.color : "#ef4444";
      ctx.fillRect(x, y, barW, barH);
    }
  }

  function drawWinLoss(ctx: CanvasRenderingContext2D): void {
    const cellSize = Math.min(opts.width / Math.max(data.length, 1), opts.height);
    const gap = 2;
    const size = Math.max(4, cellSize - gap);

    for (let i = 0; i < data.length; i++) {
      const p = data[i]!;
      const x = i * (size + gap);
      const y = (opts.height - size) / 2;
      const r = Math.max(1, size / 2 - 1);

      if (p.value > 0) {
        // Win (green up)
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y - r);
        ctx.lineTo(x + size + 1, y - r);
        ctx.lineTo(x + size / 2, y + r);
        ctx.closePath();
        ctx.fill();
      } else if (p.value < 0) {
        // Loss (red down)
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + r);
        ctx.lineTo(x + size + 1, y + r);
        ctx.lineTo(x + size / 2, y - r);
        ctx.closePath();
        ctx.fill();
      } else {
        // Neutral (gray)
        ctx.fillStyle = "#d1d5db";
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  function drawDot(ctx: CanvasRenderingContext2D): void {
    const { values, min, max } = getDataBounds();
    const w = opts.width;
    const h = opts.height;

    for (let i = 0; i < values.length; i++) {
      const x = (i / Math.max(values.length - 1, 1)) * (w - 6) + 3;
      const y = h - ((values[i]! - min) / (max - min)) * (h - 6) - 3;

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = data[i]?.color ?? opts.color;
      ctx.fill();
    }
  }

  // Tooltip handling
  if (opts.showTooltip) {
    canvas.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const idx = Math.round((mx / rect.width) * (data.length - 1));

      if (idx >= 0 && idx < data.length && data[idx]) {
        if (!tooltipEl) {
          tooltipEl = document.createElement("div");
          tooltipEl.style.cssText = `
            position:absolute;z-index:10000;background:#1e1b4b;color:#fff;padding:3px 8px;
            border-radius:4px;font-size:11px;pointer-events:none;white-space:nowrap;
            box-shadow:0 2px 8px rgba(0,0,0,0.15);
          `;
          document.body.appendChild(tooltipEl);
        }
        const pt = data[idx]!;
        tooltipEl.textContent = `${pt.label ?? String(pt.value)}: ${pt.value}`;
        tooltipEl.style.left = `${e.clientX + 8}px`;
        tooltipEl.style.top = `${e.clientY - 24}px`;
      } else {
        hideTooltip();
      }
    });

    canvas.addEventListener("mouseleave", hideTooltip);
  }

  function hideTooltip(): void {
    if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
  }

  render();

  return {
    element: container,
    canvas,

    setData(newData: SparklinePoint[]) {
      data = newData;
      render();
    },

    setOptions(newOpts: Partial<SparklineOptions>) {
      Object.assign(opts, newOpts);
      canvas.style.width = `${opts.width}px`;
      canvas.style.height = `${opts.height}px`;
      render();
    },

    getTrend() { return detectTrend(data); },

    destroy() {
      destroyed = true;
      hideTooltip();
      canvas.removeEventListener("mousemove", () => {});
      canvas.removeEventListener("mouseleave", hideTooltip);
      container.innerHTML = "";
    },
  };
}
