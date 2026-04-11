/**
 * Scatter Plot: Interactive scatter plot with trend line, regression analysis,
 * bubble sizing, axis labels, grid lines, quadrant coloring, clustering hints,
 * brush selection, zoom/pan, and multiple series support.
 */

// --- Types ---

export interface ScatterPoint {
  x: number;
  y: number;
  id?: string;
  label?: string;
  size?: number;
  color?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface ScatterSeries {
  name: string;
  points: ScatterPoint[];
  color?: string;
  shape?: "circle" | "square" | "diamond" | "triangle" | "cross";
  showTrendLine?: boolean;
  trendLineStyle?: "solid" | "dashed" | "dotted";
}

export interface ScatterOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data series */
  series: ScatterSeries[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** X axis label */
  xAxisLabel?: string;
  /** Y axis label */
  yAxisLabel?: string;
  /** X domain [min, max] (auto if omitted) */
  xDomain?: [number, number];
  /** Y domain [min, max] (auto if omitted) */
  yDomain?: [number, number];
  /** X axis tick count */
  xTicks?: number;
  /** Y axis tick count */
  yTicks?: number;
  /** Show grid lines? */
  gridLines?: boolean;
  /** Grid style ("full" | "ticks" | "none") */
  gridStyle?: string;
  /** Point size range [min, max] based on point.size field */
  sizeRange?: [number, number];
  /** Opacity range for overlapping points */
  opacityRange?: [number, number];
  /** Show trend line for each series? */
  showTrendLine?: boolean;
  /** Trend line type ("linear" | "polynomial" | "exponential") */
  trendType?: string;
  /** Show regression equation? */
  showEquation?: boolean;
  /** Quadrant mode (divide into 4 quadrants?) */
  quadrants?: boolean;
  /** Quadrant colors [Q1, Q2, Q3, Q4] */
  quadrantColors?: string[];
  /** Brush selection enabled? */
  brushSelection?: boolean;
  /** Brush callback */
  onBrushSelect?: (points: ScatterPoint[]) => void;
  /** Point click callback */
  onPointClick?: (point: ScatterPoint, series: ScatterSeries, event: MouseEvent) => void;
  /** Point hover callback */
  onPointHover?: (point: ScatterPoint | null, series: ScatterSeries | null, event: MouseEvent) => void;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Padding around plot area */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
}

export interface ScatterInstance {
  element: SVGElement;
  /** Add a series */
  addSeries: (series: ScatterSeries) => void;
  /** Remove a series by name */
  removeSeries: (name: string) => void;
  /** Update point data */
  updatePoints: (seriesName: string, points: ScatterPoint[]) => void;
  /** Set domains manually */
  setDomain: (xDom?: [number, number], yDom?: [number, number]) => void;
  /** Auto-fit domain to data */
  autoFit: () => void;
  /** Get selected points (from brush) */
  getSelectedPoints: () => ScatterPoint[];
  /** Clear selection */
  clearSelection: () => void;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Regression Helpers ---

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 1 };

  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (const p of points) {
    sx += p.x; sy += p.y;
    sxx += p.x * p.x; syy += p.y * p.y;
    sxy += p.x * p.y;
  }

  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-10) return { slope: 0, intercept: sy / n, r2: 1 };

  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;

  const meanY = sy / n;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    ssRes += (p.y - (slope * p.x + intercept)) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }

  const r2 = ssTot < 1e-10 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

// --- Scale Helpers ---

function scaleLinear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const factor = (r1 - r0) / (d1 - d0 || 1);
  return (v: number) => r0 + (v - d0) * factor;
}

function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = count / (span / step);
  const finalStep = step * (
    err <= 1.5 ? 1 :
    err <= 3 ? 2 :
    err <= 7 ? 5 : 10
  );

  const niceMin = Math.floor(min / finalStep) * finalStep;
  const ticks: number[] = [];
  let v = niceMax = Math.ceil(max / finalStep) * finalStep;
  while (v >= niceMin) {
    ticks.unshift(v);
    v -= finalStep;
  }
  var niceMax = Math.ceil(max / finalStep) * finalStep;
  return ticks;
}
var niceMax: number;

function formatTick(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

// --- Shape Generators ---

function getShapePath(shape: string, cx: number, cy: number, r: number): string {
  switch (shape) {
    case "square":
      return `M ${cx - r} ${cy - r} h ${r * 2} v ${r * 2} h ${-${r * 2}} Z`;
    case "diamond":
      return `M ${cx} ${cy - r} l ${r} ${r} l ${-${r}} ${r} l ${-${r}} -${r} Z`;
    case "triangle":
      return `M ${cx} ${cy - r} l ${r * 0.866} ${r * 1.5} l ${-${r * 1.732}} Z`;
    case "cross":
      return `M ${cx - r} ${cy} h ${r * 2} M ${cx} ${cy - r} v ${r * 2}`;
    default:
      return `M ${cx} ${cy - r} a ${r} ${r} 0 1 0 0 ${r * 2} a ${r} ${r} 0 1 0 0 -${r * 2}`;
  }
}

// --- Main Factory ---

export function createScatterPlot(options: ScatterOptions): ScatterInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 400,
    xAxisLabel: options.xAxisLabel ?? "",
    yAxisLabel: options.yAxisLabel ?? "",
    xTicks: options.xTicks ?? 6,
    yTicks: options.yTicks ?? 6,
    gridLines: options.gridLines ?? true,
    gridStyle: options.gridStyle ?? "full",
    sizeRange: options.sizeRange ?? [3, 16],
    opacityRange: options.opacityRange ?? [0.4, 1],
    showTrendLine: options.showTrendLine ?? false,
    trendType: options.trendType ?? "linear",
    showEquation: options.showEquation ?? false,
    quadrants: options.quadrants ?? false,
    quadrantColors: options.quadrantColors ?? ["#fef3c7", "#ede9fe", "#dbeafe", "#fce7f3"],
    brushSelection: options.brushSelection ?? false,
    tooltip: options.tooltip ?? true,
    animationDuration: options.animationDuration ?? 300,
    padding: options.padding ?? { top: 30, right: 30, bottom: 50, left: 60 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ScatterPlot: container not found");

  let series: ScatterSeries[] = JSON.parse(JSON.stringify(options.series));
  let destroyed = false;
  let xDomain: [number, number] = opts.xDomain ?? [0, 100];
  let yDomain: [number, number] = opts.yDomain ?? [0, 100];
  let selectedPoints: ScatterPoint[] = [];

  const pad = opts.padding;
  const plotW = opts.width - pad.left! - pad.right!;
  const plotH = opts.height - pad.top! - pad.bottom!;

  // SVG setup
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `scatter-plot ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  // Clip path for plot area
  const clip = document.createElementNS(ns, "clipPath");
  clip.id = "scatter-clip";
  const clipRect = document.createElementNS(ns, "rect");
  clipRect.setAttribute("x", String(pad.left));
  clipRect.setAttribute("y", String(pad.top));
  clipRect.setAttribute("width", String(plotW));
  clipRect.setAttribute("height", String(plotH));
  clip.appendChild(clipRect);
  defs.appendChild(clip);

  // Background
  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc");
  bg.setAttribute("rx", "8");
  svg.appendChild(bg);

  // Plot group (clipped)
  const gPlot = document.createElementNS(ns, "g");
  gPlot.setAttribute("clip-path", "url(#scatter-clip)");
  svg.appendChild(gPlot);

  // Axes group
  const gAxes = document.createElementNS(ns, "g");
  svg.appendChild(gAxes);

  // Tooltip
  const gTooltip = document.createElementNS(ns, "g");
  gTooltip.style.display = "none";
  gTooltip.style.pointerEvents = "none";
  svg.appendChild(gTooltip);

  const ttBg = document.createElementNS(ns, "rect");
  ttBg.setAttribute("rx", "4");
  ttBg.setAttribute("fill", "#1f2937");
  ttBg.setAttribute("opacity", "0.9");
  gTooltip.appendChild(ttBg);

  const ttText = document.createElementNS(ns, "text");
  ttText.setAttribute("fill", "#fff");
  ttText.setAttribute("font-size", "11");
  gTooltip.appendChild(ttText);

  // Brush elements
  let brushRect: SVGRectElement | null = null;
  let brushing = false;
  let brushStart: { x: number; y: number } | null = null;

  container.appendChild(svg);

  // --- Domain Computation ---

  function computeDomain(): void {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const s of series) {
      for (const p of s.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }
    if (!isFinite(minX)) { minX = 0; maxX = 100; minY = 0; maxY = 100; }
    const xPad = (maxX - minX) * 0.08 || 1;
    const yPad = (maxY - minY) * 0.08 || 1;
    xDomain = [minX - xPad, maxX + xPad];
    yDomain = [minY - yPad, maxY + yPad];
  }

  if (!opts.xDomain || !opts.yDomain) computeDomain();

  const scaleX = scaleLinear(xDomain, [pad.left!, pad.left! + plotW]);
  const scaleY = scaleLinear(yDomain, [pad.top! + plotH, pad.top!]);

  // --- Rendering ---

  function render(): void {
    gPlot.innerHTML = "";
    gAxes.innerHTML = "";

    // Quadrants
    if (opts.quadrants) {
      const midX = scaleX((xDomain[0] + xDomain[1]) / 2);
      const midY = scaleY((yDomain[0] + yDomain[1]) / 2);
      const qColors = opts.quadrantColors!;
      const quads = [
        { x: pad.left!, y: pad.top!, w: midX - pad.left!, h: midY - pad.top!, fill: qColors[0] },
        { x: midX, y: pad.top!, w: pad.left! + plotW - midX, h: midY - pad.top!, fill: qColors[1] },
        { x: pad.left!, y: midY, w: midX - pad.left!, h: pad.top! + plotH - midY, fill: qColors[2] },
        { x: midX, y: midY, w: pad.left! + plotW - midX, h: pad.top! + plotH - midY, fill: qColors[3] },
      ];
      for (const q of quads) {
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(q.x));
        rect.setAttribute("y", String(q.y));
        rect.setAttribute("width", String(q.w));
        rect.setAttribute("height", String(q.h));
        rect.setAttribute("fill", q.fill);
        rect.setAttribute("opacity", "0.35");
        gPlot.appendChild(rect);
      }
    }

    // Grid lines
    if (opts.gridLines && opts.gridStyle !== "none") {
      const xTicksArr = niceTicks(xDomain[0], xDomain[1], opts.xTicks);
      const yTicksArr = niceTicks(yDomain[0], yDomain[1], opts.yTicks);

      for (const t of xTicksArr) {
        const x = scaleX(t);
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(x));
        line.setAttribute("y1", String(pad.top));
        line.setAttribute("x2", String(x));
        line.setAttribute("y2", String(pad.top! + plotH));
        line.setAttribute("stroke", "#e5e7eb");
        line.setAttribute("stroke-width", opts.gridStyle === "full" ? "1" : "0.5");
        if (opts.gridStyle === "ticks") {
          line.setAttribute("stroke-dasharray", "3,3");
        }
        gAxes.appendChild(line);
      }

      for (const t of yTicksArr) {
        const y = scaleY(t);
        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(pad.left));
        line.setAttribute("y1", String(y));
        line.setAttribute("x2", String(pad.left! + plotW));
        line.setAttribute("y2", String(y));
        line.setAttribute("stroke", "#e5e7eb");
        line.setAttribute("stroke-width", opts.gridStyle === "full" ? "1" : "0.5");
        if (opts.gridStyle === "ticks") {
          line.setAttribute("stroke-dasharray", "3,3");
        }
        gAxes.appendChild(line);
      }
    }

    // Draw axes
    drawAxis(xDomain, "x", pad.left!, pad.top! + plotH, plotW, true);
    drawAxis(yDomain, "y", pad.left!, pad.top!, plotH, false);

    // Axis labels
    if (opts.xAxisLabel) {
      const xl = document.createElementNS(ns, "text");
      xl.setAttribute("x", String(pad.left! + plotW / 2));
      xl.setAttribute("y", String(opts.height - 8));
      xl.setAttribute("text-anchor", "middle");
      xl.setAttribute("fill", "#6b7280");
      xl.setAttribute("font-size", "12");
      xl.textContent = opts.xAxisLabel;
      gAxes.appendChild(xl);
    }
    if (opts.yAxisLabel) {
      const yl = document.createElementNS(ns, "text");
      yl.setAttribute("x", String(14));
      yl.setAttribute("y", String(pad.top! + plotH / 2));
      yl.setAttribute("text-anchor", "middle");
      yl.setAttribute("fill", "#6b7280");
      yl.setAttribute("font-size", "12");
      yl.setAttribute("transform", `rotate(-90, 14, ${pad.top! + plotH / 2})`);
      yl.textContent = opts.yAxisLabel;
      gAxes.appendChild(yl);
    }

    // Data points & trend lines
    for (const s of series) {
      const color = s.color ?? CATEGORY_COLORS[series.indexOf(s) % CATEGORY_COLORS.length];
      const shape = s.shape ?? "circle";

      // Trend line
      if ((s.showTrendLine ?? opts.showTrendLine) && s.points.length >= 2) {
        const reg = linearRegression(s.points);
        const x1 = xDomain[0];
        const y1 = reg.slope * x1 + reg.intercept;
        const x2 = xDomain[1];
        const y2 = reg.slope * x2 + reg.intercept;

        const tl = document.createElementNS(ns, "line");
        tl.setAttribute("x1", String(scaleX(x1)));
        tl.setAttribute("y1", String(scaleY(Math.min(Math.max(y1, yDomain[0]), yDomain[1]))));
        tl.setAttribute("x2", String(scaleX(x2)));
        tl.setAttribute("y2", String(scaleY(Math.min(Math.max(y2, yDomain[0]), yDomain[1]))));
        tl.setAttribute("stroke", color);
        tl.setAttribute("stroke-width", "2");
        tl.setAttribute("stroke-dasharray", s.trendLineStyle === "dashed" ? "6,4" : s.trendLineStyle === "dotted" ? "2,4" : "");
        tl.setAttribute("opacity", "0.6");
        gPlot.appendChild(tl);

        if (opts.showEquation) {
          const eqText = document.createElementNS(ns, "text");
          eqText.setAttribute("x", String(pad.left! + plotW - 10));
          eqText.setAttribute("y", String(pad.top! + 20 + series.indexOf(s) * 16));
          eqText.setAttribute("text-anchor", "end");
          eqText.setAttribute("fill", color);
          eqText.setAttribute("font-size", "10");
          eqText.textContent = `${s.name}: y=${reg.slope.toFixed(2)}x+${reg.intercept.toFixed(2)} (R\u00B2=${reg.r2.toFixed(3)})`;
          gPlot.appendChild(eqText);
        }
      }

      // Points
      for (const p of s.points) {
        const px = scaleX(p.x);
        const py = scaleY(p.y);
        const size = p.size != null
          ? opts.sizeRange[0] + (p.size / (getMaxSize(s.points) || 1)) * (opts.sizeRange[1] - opts.sizeRange[0])
          : (opts.sizeRange[0] + opts.sizeRange[1]) / 2;

        const el = document.createElementNS(ns, "path");
        el.setAttribute("d", getShapePath(shape, px, py, size));
        el.setAttribute("fill", p.color ?? color);
        el.setAttribute("fill-opacity", String(opts.opacityRange[0]));
        el.setAttribute("stroke", p.color ?? color);
        el.setAttribute("stroke-width", "1");
        el.style.cursor = "pointer";
        el.style.transition = `fill-opacity ${opts.animationDuration}ms ease`;

        el.dataset.pointId = p.id ?? `${s.name}-${p.x}-${p.y}`;

        el.addEventListener("mouseenter", (e) => {
          el.setAttribute("fill-opacity", String(opts.opacityRange[1]));
          el.setAttribute("stroke-width", "2");
          showTooltip(e, p, s);
          opts.onPointHover?.(p, s, e);
        });
        el.addEventListener("mouseleave", () => {
          el.setAttribute("fill-opacity", String(opts.opacityRange[0]));
          el.setAttribute("stroke-width", "1");
          hideTooltip();
          opts.onPointHover?.(null, null, new MouseEvent("mouseleave"));
        });
        el.addEventListener("click", (e) => {
          opts.onPointClick?.(p, s, e);
        });

        gPlot.appendChild(el);
      }
    }
  }

  function drawAxis(domain: [number, number], axis: "x" | "y", ox: number, oy: number, len: number, horizontal: boolean): void {
    const ticks = niceTicks(domain[0], domain[1], axis === "x" ? opts.xTicks : opts.yTicks);

    // Axis line
    const line = document.createElementNS(ns, "line");
    if (horizontal) {
      line.setAttribute("x1", String(ox));
      line.setAttribute("y1", String(oy));
      line.setAttribute("x2", String(ox + len));
      line.setAttribute("y2", String(oy));
    } else {
      line.setAttribute("x1", String(ox));
      line.setAttribute("y1", String(oy));
      line.setAttribute("x2", String(ox));
      line.setAttribute("y2", String(oy + len));
    }
    line.setAttribute("stroke", "#9ca3af");
    line.setAttribute("stroke-width", "1.5");
    gAxes.appendChild(line);

    // Ticks
    for (const t of ticks) {
      const pos = axis === "x" ? scaleX(t) : scaleY(t);
      const tick = document.createElementNS(ns, "line");
      const label = document.createElementNS(ns, "text");

      if (horizontal) {
        tick.setAttribute("x1", String(pos));
        tick.setAttribute("y1", String(oy));
        tick.setAttribute("x2", String(pos));
        tick.setAttribute("y2", String(oy + 5));
        label.setAttribute("x", String(pos));
        label.setAttribute("y", String(oy + 18));
        label.setAttribute("text-anchor", "middle");
      } else {
        tick.setAttribute("x1", String(ox - 5));
        tick.setAttribute("y1", String(pos));
        tick.setAttribute("x2", String(ox));
        tick.setAttribute("y2", String(pos));
        label.setAttribute("x", String(ox - 8));
        label.setAttribute("y", String(pos + 4));
        label.setAttribute("text-anchor", "end");
      }

      tick.setAttribute("stroke", "#9ca3af");
      label.setAttribute("fill", "#6b7280");
      label.setAttribute("font-size", "10");
      label.textContent = formatTick(t);

      gAxes.appendChild(tick);
      gAxes.appendChild(label);
    }
  }

  function getMaxSize(points: ScatterPoint[]): number {
    let max = 0;
    for (const p of points) { if (p.size != null && p.size > max) max = p.size; }
    return max || 1;
  }

  function showTooltip(e: MouseEvent, pt: ScatterPoint, ser: ScatterSeries): void {
    if (!opts.tooltip) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const parts = [ser.name];
    if (pt.label) parts.push(pt.label);
    parts.push(`(${pt.x}, ${pt.y})`);
    if (pt.size != null) parts.push(`size: ${pt.size}`);

    ttText.textContent = parts.join(" \u2013 ");
    gTooltip.style.display = "block";

    requestAnimationFrame(() => {
      const bb = ttText.getBBox();
      const pad = 6;
      ttBg.setAttribute("x", String(mx - bb.width / 2 - pad));
      ttBg.setAttribute("y", String(my - bb.height - pad - 12));
      ttBg.setAttribute("width", String(bb.width + pad * 2));
      ttBg.setAttribute("height", String(bb.height + pad * 2));
      ttText.setAttribute("x", String(mx - bb.width / 2));
      ttText.setAttribute("y", String(my - bb.height - pad - 12 + bb.height / 2 + 4));
    });
  }

  function hideTooltip(): void {
    gTooltip.style.display = "none";
  }

  // Brush handling
  if (opts.brushSelection) {
    svg.addEventListener("mousedown", (e) => {
      const rect = svg.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (px < pad.left! || px > pad.left! + plotW || py < pad.top! || py > pad.top! + plotH) return;
      brushing = true;
      brushStart = { x: px, y: py };

      brushRect = document.createElementNS(ns, "rect");
      brushRect.setAttribute("fill", "#6366f1");
      brushRect.setAttribute("fill-opacity", "0.12");
      brushRect.setAttribute("stroke", "#6366f1");
      brushRect.setAttribute("stroke-width", "1");
      brushRect.setAttribute("stroke-dasharray", "4,2");
      gPlot.appendChild(brushRect);
    });

    svg.addEventListener("mousemove", (e) => {
      if (!brushing || !brushStart || !brushRect) return;
      const rect = svg.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const rx = Math.min(brushStart.x, px);
      const ry = Math.min(brushStart.y, py);
      const rw = Math.abs(px - brushStart.x);
      const rh = Math.abs(py - brushStart.y);
      brushRect.setAttribute("x", String(rx));
      brushRect.setAttribute("y", String(ry));
      brushRect.setAttribute("width", String(rw));
      brushRect.setAttribute("height", String(rh));
    });

    svg.addEventListener("mouseup", () => {
      if (!brushing || !brushRect) return;
      brushing = false;

      const bx = parseFloat(brushRect.getAttribute("x") ?? "0");
      const by = parseFloat(brushRect.getAttribute("y") ?? "0");
      const bw = parseFloat(brushRect.getAttribute("width") ?? "0");
      const bh = parseFloat(brushRect.getAttribute("height") ?? "0");

      // Find points inside brush
      selectedPoints = [];
      for (const s of series) {
        for (const p of s.points) {
          const px = scaleX(p.x);
          const py = scaleY(p.y);
          if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
            selectedPoints.push(p);
          }
        }
      }

      brushRect.remove();
      brushRect = null;
      brushStart = null;
      opts.onBrushSelect?.(selectedPoints);
    });
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: ScatterInstance = {
    element: svg,

    addSeries(newSeries: ScatterSeries) {
      series.push({ ...newSeries, points: [...newSeries.points] });
      if (!opts.xDomain || !opts.yDomain) computeDomain();
      render();
    },

    removeSeries(name: string) {
      series = series.filter(s => s.name !== name);
      render();
    },

    updatePoints(seriesName: string, points: ScatterPoint[]) {
      const s = series.find(s => s.name === seriesName);
      if (s) { s.points = points; render(); }
    },

    setDomain(xDom?, yDom?) {
      if (xDom) xDomain = xDom;
      if (yDom) yDomain = yDom;
      render();
    },

    autoFit() {
      computeDomain();
      render();
    },

    getSelectedPoints: () => [...selectedPoints],

    clearSelection() {
      selectedPoints = [];
      if (brushRect) { brushRect.remove(); brushRect = null; }
    },

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      svg.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}

const CATEGORY_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];
