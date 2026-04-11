/**
 * Statistics Chart: Lightweight SVG-based chart rendering for bar, line, area,
 * pie/donut charts with animations, tooltips, legends, responsive sizing,
 * and data-driven updates. No external dependencies.
 */

// --- Types ---

export type ChartType = "bar" | "line" | "area" | "pie" | "donut" | "scatter";

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  /** Secondary value (for range/area) */
  value2?: number;
  /** Tooltip extra info */
  tooltip?: string;
}

export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
  /** Line style: solid, dashed, dotted */
  lineStyle?: "solid" | "dashed" | "dotted";
  /** Show/hide this series */
  visible?: boolean;
}

export interface ChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Chart type */
  type?: ChartType;
  /** Data series (single series = array of points) */
  data: ChartSeries[] | ChartDataPoint[];
  /** Chart title */
  title?: string;
  /** X-axis label */
  xAxisLabel?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** Show legend? */
  showLegend?: boolean;
  /** Show grid lines? */
  showGrid?: boolean;
  /** Show tooltips on hover? */
  showTooltip?: boolean;
  /** Animation duration ms (default: 600) */
  animationDuration?: number;
  /** Chart dimensions */
  width?: number;
  height?: number;
  /** Color palette (used if no per-point colors) */
  colors?: string[];
  /** Bar width ratio (0-1, default: 0.6) */
  barWidthRatio?: number;
  /** Line point radius (default: 4) */
  pointRadius?: number;
  /** Donut inner radius ratio (0-1, default: 0.6) */
  donutRatio?: number;
  /** Stacked bars? (bar chart only) */
  stacked?: boolean;
  /** Horizontal bars? */
  horizontal?: boolean;
  /** Callback on data point click */
  onPointClick?: (point: ChartDataPoint, seriesIndex: number, pointIndex: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ChartInstance {
  element: SVGElement;
  /** Update data and re-render */
  setData: (data: ChartSeries[] | ChartDataPoint[]) => void;
  /** Get current data */
  getData: () => ChartSeries[];
  /** Resize to new dimensions */
  resize: (width: number, height: number) => void;
  /** Export as SVG string */
  toSVG: () => string;
  /** Export as data URL (PNG via canvas) */
  toDataURL: (type?: string) => Promise<string>;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Default palette ---

const DEFAULT_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4",
];

// --- Helpers ---

function normalizeData(data: ChartSeries[] | ChartDataPoint[]): ChartSeries[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  // Check if it's a flat array of points
  const first = data[0]!;
  if ("value" in first && !("data" in first)) {
    return [{ name: "Series 1", data: data as ChartDataPoint[] }];
  }
  return data as ChartSeries[];
}

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

function getMaxValue(series: ChartSeries[]): number {
  let max = 0;
  for (const s of series) {
    for (const p of s.data) {
      max = Math.max(max, p.value, p.value2 ?? 0);
    }
  }
  return max * 1.1; // 10% padding
}

function getLabels(series: ChartSeries[]): string[] {
  const labels = new Set<string>();
  for (const s of series) {
    for (const p of s.data) labels.add(p.label);
  }
  return [...labels];
}

// --- Main Factory ---

export function createChart(options: ChartOptions): ChartInstance {
  const opts = {
    type: options.type ?? "bar",
    showLegend: options.showLegend ?? true,
    showGrid: options.showGrid ?? true,
    showTooltip: options.showTooltip ?? true,
    animationDuration: options.animationDuration ?? 600,
    width: options.width ?? 400,
    height: options.height ?? 280,
    colors: options.colors ?? DEFAULT_COLORS,
    barWidthRatio: options.barWidthRatio ?? 0.6,
    pointRadius: options.pointRadius ?? 4,
    donutRatio: options.donutRatio ?? 0.6,
    stacked: options.stacked ?? false,
    horizontal: options.horizontal ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = resolveEl(options.container);
  if (!container) throw new Error("Chart: container not found");

  container.className = `chart ${opts.className}`;
  container.style.cssText = `display:inline-block;position:relative;font-family:-apple-system,sans-serif;`;

  // Create SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg") as SVGElement;
  svg.setAttribute("width", String(opts.width));
  svg.setAttribute("height", String(opts.height));
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.style.display = "block";
  container.appendChild(svg);

  // Tooltip element
  let tooltipEl: HTMLDivElement | null = null;
  if (opts.showTooltip) {
    tooltipEl = document.createElement("div");
    tooltipEl.className = "chart-tooltip";
    tooltipEl.style.cssText = `
      position:absolute;display:none;padding:6px 10px;background:#1e1b4b;color:#fff;
      border-radius:6px;font-size:12px;font-weight:500;pointer-events:none;z-index:10;
      box-shadow:0 4px 12px rgba(0,0,0,0.2);white-space:nowrap;transform:translate(-50%, -100%);
      margin-top:-8px;
    `;
    container.appendChild(tooltipEl);
  }

  let series = normalizeData(opts.data);
  let destroyed = false;

  function render(): void {
    svg.innerHTML = "";

    const padding = { top: 30, right: 20, bottom: 40, left: 50 };
    const plotW = opts.width - padding.left - padding.right;
    const plotH = opts.height - padding.top - padding.bottom;

    // Title
    if (opts.title) {
      const title = document.createElementNS(ns, "text");
      title.setAttribute("x", String(opts.width / 2));
      title.setAttribute("y", "18");
      title.setAttribute("text-anchor", "middle");
      title.setAttribute("font-size", "14");
      title.setAttribute("font-weight", "600");
      title.setAttribute("fill", "#111827");
      title.textContent = opts.title;
      svg.appendChild(title);
    }

    switch (opts.type) {
      case "bar":
        renderBarChart(padding, plotW, plotH);
        break;
      case "line":
        renderLineChart(padding, plotW, plotH, false);
        break;
      case "area":
        renderLineChart(padding, plotW, plotH, true);
        break;
      case "pie":
        renderPieChart(false);
        break;
      case "donut":
        renderPieChart(true);
        break;
      case "scatter":
        renderScatterChart(padding, plotW, plotH);
        break;
    }

    // Legend
    if (opts.showLegend && series.length > 1 && !["pie", "donut"].includes(opts.type)) {
      renderLegend();
    }
  }

  function renderBarChart(pad: { top: number; right: number; bottom: number; left: number }, plotW: number, plotH: number): void {
    const labels = getLabels(series);
    const maxVal = getMaxValue(series);
    const barW = Math.max(8, (plotW / labels.length) * opts.barWidthRatio);
    const gap = (plotW - barW * labels.length) / (labels.length + 1);

    // Grid lines
    if (opts.showGrid) {
      for (let i = 0; i <= 5; i++) {
        const y = pad.top + (plotH / 5) * i;
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(pad.left));
        line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(pad.left + plotW));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", "#e5e7eb");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);

        // Y-axis label
        const val = Math.round(maxVal * (1 - i / 5));
        const label = document.createElementNS(ns, "text");
        label.setAttribute("x", String(pad.left - 8));
        label.setAttribute("y", String(y + 4));
        label.setAttribute("text-anchor", "end");
        label.setAttribute("font-size", "10");
        label.setAttribute("fill", "#9ca3af");
        label.textContent = String(val);
        svg.appendChild(label);
      }
    }

    // Bars
    for (let li = 0; li < labels.length; li++) {
      const x = pad.left + gap + li * (barW + gap);
      const groupW = barW / (series.length || 1);

      for (let si = 0; si < series.length; si++) {
        const sr = series[si]!;
        if (sr.visible === false) continue;
        const pt = sr.data[li];
        if (!pt) continue;

        const h = Math.max(1, (pt.value / maxVal) * plotH);
        const y = pad.top + plotH - h;
        const color = pt.color ?? sr.color ?? opts.colors[si % opts.colors.length];

        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(x + si * groupW));
        rect.setAttribute("y", String(y));
        rect.setAttribute("width", String(Math.max(1, groupW - 2)));
        rect.setAttribute("height", String(h));
        rect.setAttribute("fill", color);
        rect.setAttribute("rx", "3");
        rect.style.cursor = "pointer";

        // Animation
        rect.setAttribute("transform-origin", `${x + groupW / 2} ${pad.top + plotH}`);
        rect.style.animation = `chart-grow ${opts.animationDuration}ms ease-out both`;

        // Hover
        rect.addEventListener("mouseenter", () => {
          showTooltip(pt.label + ": " + pt.value, x + groupW / 2, y);
          rect.setAttribute("opacity", "0.8");
        });
        rect.addEventListener("mouseleave", () => {
          hideTooltip();
          rect.setAttribute("opacity", "1");
        });
        rect.addEventListener("click", () => opts.onPointClick?.(pt, si, li));

        svg.appendChild(rect);
      }

      // X-axis label
      const xLabel = document.createElementNS(ns, "text");
      xLabel.setAttribute("x", String(x + barW / 2));
      xLabel.setAttribute("y", String(pad.top + plotH + 18));
      xLabel.setAttribute("text-anchor", "middle");
      xLabel.setAttribute("font-size", "11");
      xLabel.setAttribute("fill", "#6b7280");
      xLabel.textContent = labels[li];
      svg.appendChild(xLabel);
    }
  }

  function renderLineChart(pad: { top: number; right: number; bottom: number; left: number }, plotW: number, plotH: number, isArea: boolean): void {
    const labels = getLabels(series);
    const maxVal = getMaxValue(series);
    const stepX = plotW / Math.max(1, labels.length - 1);

    // Grid
    if (opts.showGrid) {
      for (let i = 0; i <= 5; i++) {
        const y = pad.top + (plotH / 5) * i;
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(pad.left));
        line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(pad.left + plotW));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", "#e5e7eb");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);
      }
    }

    for (let si = 0; si < series.length; si++) {
      const sr = series[si]!;
      if (sr.visible === false) continue;
      const color = sr.color ?? opts.colors[si % opts.colors.length];
      const pts = sr.data;

      // Area fill
      if (isArea) {
        const areaPath = document.createElementNS(ns, "path");
        let d = `M ${pad.left} ${pad.top + plotH}`;
        for (let pi = 0; pi < pts.length; pi++) {
          const x = pad.left + pi * stepX;
          const y = pad.top + plotH - (pts[pi]!.value / maxVal) * plotH;
          d += ` L ${x} ${y}`;
        }
        d += ` L ${pad.left + (pts.length - 1) * stepX} ${pad.top + plotH} Z`;
        areaPath.setAttribute("d", d);
        areaPath.setAttribute("fill", color);
        areaPath.setAttribute("fill-opacity", "0.15");
        svg.appendChild(areaPath);
      }

      // Line path
      const path = document.createElementNS(ns, "path");
      let d = "";
      for (let pi = 0; pi < pts.length; pi++) {
        const x = pad.left + pi * stepX;
        const y = pad.top + plotH - (pts[pi]!.value / maxVal) * plotH;
        d += pi === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
      }
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      if (sr.lineStyle === "dashed") path.setAttribute("stroke-dasharray", "8,4");
      else if (sr.lineStyle === "dotted") path.setAttribute("stroke-dasharray", "3,3");

      // Animate line
      const len = path.getTotalLength?.() ?? 1000;
      path.setAttribute("stroke-dasharray", `${len}`);
      path.setAttribute("stroke-dashoffset", String(len));
      path.style.transition = `stroke-dashoffset ${opts.animationDuration}ms ease-out`;
      requestAnimationFrame(() => { path.setAttribute("stroke-dashoffset", "0"); });

      svg.appendChild(path);

      // Points
      for (let pi = 0; pi < pts.length; pi++) {
        const pt = pts[pi]!;
        const x = pad.left + pi * stepX;
        const y = pad.top + plotH - (pt.value / maxVal) * plotH;

        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", String(x));
        circle.setAttribute("cy", String(y));
        circle.setAttribute("r", String(opts.pointRadius));
        circle.setAttribute("fill", "#fff");
        circle.setAttribute("stroke", color);
        circle.setAttribute("stroke-width", "2.5");
        circle.style.cursor = "pointer";

        circle.addEventListener("mouseenter", () => {
          showTooltip(`${sr.name} - ${pt.label}: ${pt.value}`, x, y);
          circle.setAttribute("r", String(opts.pointRadius + 2));
        });
        circle.addEventListener("mouseleave", () => {
          hideTooltip();
          circle.setAttribute("r", String(opts.pointRadius));
        });
        circle.addEventListener("click", () => opts.onPointClick?.(pt, si, pi));

        svg.appendChild(circle);
      }
    }

    // X-axis labels
    for (let li = 0; li < labels.length; li++) {
      const x = pad.left + li * stepX;
      const lbl = document.createElementNS(ns, "text");
      lbl.setAttribute("x", String(x));
      lbl.setAttribute("y", String(pad.top + plotH + 18));
      lbl.setAttribute("text-anchor", "middle");
      lbl.setAttribute("font-size", "11");
      lbl.setAttribute("fill", "#6b7280");
      lbl.textContent = labels[li];
      svg.appendChild(lbl);
    }
  }

  function renderPieChart(isDonut: boolean): void {
    const sr = series[0]?.data ?? [];
    const total = sr.reduce((sum, p) => sum + p.value, 0);
    const cx = opts.width / 2;
    const cy = opts.height / 2;
    const outerR = Math.min(opts.width, opts.height) / 2 - 30;
    const innerR = isDonut ? outerR * opts.donutRatio : 0;

    let startAngle = -Math.PI / 2;

    for (let i = 0; i < sr.length; i++) {
      const pt = sr[i]!;
      const sliceAngle = (pt.value / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      const color = pt.color ?? opts.colors[i % opts.colors.length];

      const largeArc = sliceAngle > Math.PI ? 1 : 0;
      const x1 = cx + outerR * Math.cos(startAngle);
      const y1 = cy + outerR * Math.sin(startAngle);
      const x2 = cx + outerR * Math.cos(endAngle);
      const y2 = cy + outerR * Math.sin(endAngle);

      const path = document.createElementNS(ns, "path");
      let d = `M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} ${x2} ${y2}`;

      if (isDonut) {
        const ix1 = cx + innerR * Math.cos(endAngle);
        const iy1 = cy + innerR * Math.sin(endAngle);
        const ix2 = cx + innerR * Math.cos(startAngle);
        const iy2 = cy + innerR * Math.sin(startAngle);
        d += ` L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc ^ 1} ${ix2} ${iy2}`;
      }

      d += " Z";
      path.setAttribute("d", d);
      path.setAttribute("fill", color);
      path.setAttribute("stroke", "#fff");
      path.setAttribute("stroke-width", "2");
      path.style.cursor = "pointer";
      path.style.transformOrigin = `${cx}px ${cy}px`;
      path.style.transition = `transform 0.2s ease`;

      path.addEventListener("mouseenter", () => {
        path.style.transform = "scale(1.03)";
        showTooltip(`${pt.label}: ${pt.value} (${((pt.value / total) * 100).toFixed(1)}%)`, cx, cy);
      });
      path.addEventListener("mouseleave", () => {
        path.style.transform = "";
        hideTooltip();
      });
      path.addEventListener("click", () => opts.onPointClick?.(pt, 0, i));

      svg.appendChild(path);
      startAngle = endAngle;
    }

    // Center text (for donut)
    if (isDonut) {
      const centerText = document.createElementNS(ns, "text");
      centerText.setAttribute("x", String(cx));
      centerText.setAttribute("y", String(cy - 4));
      centerText.setAttribute("text-anchor", "middle");
      centerText.setAttribute("font-size", "20");
      centerText.setAttribute("font-weight", "700");
      centerText.setAttribute("fill", "#111827");
      centerText.textContent = String(Math.round(total));

      const subText = document.createElementNS(ns, "text");
      subText.setAttribute("x", String(cx));
      subText.setAttribute("y", String(cy + 14));
      subText.setAttribute("text-anchor", "middle");
      subText.setAttribute("font-size", "11");
      subText.setAttribute("fill", "#9ca3af");
      subText.textContent = "Total";

      svg.appendChild(centerText);
      svg.appendChild(subText);
    }
  }

  function renderScatterChart(pad: { top: number; right: number; bottom: number; left: number }, plotW: number, plotH: number): void {
    const maxVal = getMaxValue(series);

    // Grid
    if (opts.showGrid) {
      for (let i = 0; i <= 5; i++) {
        const y = pad.top + (plotH / 5) * i;
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(pad.left));
        line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(pad.left + plotW));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", "#e5e7eb");
        svg.appendChild(line);
      }
    }

    for (let si = 0; si < series.length; si++) {
      const sr = series[si]!;
      if (sr.visible === false) continue;
      const color = sr.color ?? opts.colors[si % opts.colors.length];

      for (let pi = 0; pi < sr.data.length; pi++) {
        const pt = sr.data[pi]!;
        const x = pad.left + ((pi + 0.5) / sr.data.length) * plotW;
        const y = pad.top + plotH - (pt.value / maxVal) * plotH;

        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", String(x));
        circle.setAttribute("cy", String(y));
        circle.setAttribute("r", "5");
        circle.setAttribute("fill", color);
        circle.setAttribute("fill-opacity", "0.7");
        circle.style.cursor = "pointer";

        circle.addEventListener("click", () => opts.onPointClick?.(pt, si, pi));
        svg.appendChild(circle);
      }
    }
  }

  function renderLegend(): void {
    const legendGroup = document.createElementNS(ns, "g");
    let lx = opts.width - 10;

    for (let si = 0; si < series.length; si++) {
      const sr = series[si]!;
      const color = sr.color ?? opts.colors[si % opts.colors.length];
      lx -= 80;

      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", String(lx));
      rect.setAttribute("y", String(8));
      rect.setAttribute("width", "12");
      rect.setAttribute("height", "12");
      rect.setAttribute("rx", "2");
      rect.setAttribute("fill", color);
      rect.style.cursor = "pointer";
      rect.addEventListener("click", () => {
        sr.visible = sr.visible === false ? true : false;
        render();
      });
      legendGroup.appendChild(rect);

      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(lx + 17));
      text.setAttribute("y", String(18));
      text.setAttribute("font-size", "11");
      text.setAttribute("fill", "#374151");
      text.textContent = sr.name;
      legendGroup.appendChild(text);
    }

    svg.appendChild(legendGroup);
  }

  function showTooltip(text: string, x: number, y: number): void {
    if (!tooltipEl) return;
    tooltipEl.textContent = text;
    tooltipEl.style.display = "block";
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.display = "none";
  }

  // Inject animation keyframes
  if (!document.getElementById("chart-styles")) {
    const style = document.createElement("style");
    style.id = "chart-styles";
    style.textContent = `
      @keyframes chart-grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    `;
    document.head.appendChild(style);
  }

  // Initial render
  render();

  const instance: ChartInstance = {
    element: svg,

    setData(data: ChartSeries[] | ChartDataPoint[]) {
      series = normalizeData(data);
      render();
    },

    getData() { return [...series]; },

    resize(w: number, h: number) {
      opts.width = w;
      opts.height = h;
      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      render();
    },

    toSVG() { return svg.outerHTML; },

    async toDataURL(type = "image/png"): Promise<string> {
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(xml));
      const dataUrl = `data:image/svg+xml;base64,${svg64}`;

      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = resolve;
        img.src = dataUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = opts.width * 2;
      canvas.height = opts.height * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, opts.width, opts.height);
      return canvas.toDataURL(type);
    },

    destroy() {
      destroyed = true;
      if (tooltipEl) tooltipEl.remove();
      svg.remove();
    },
  };

  return instance;
}
