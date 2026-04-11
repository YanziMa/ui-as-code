/**
 * Area Chart: Stacked, normalized, or overlapping area chart with multiple
 * series, gradient fills, line overlays, data point markers, zoom/pan,
 * legend, axis configuration, and animation.
 */

// --- Types ---

export interface DataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface AreaSeries {
  name: string;
  data: DataPoint[];
  color?: string;
  fillColor?: string;
  dashed?: boolean;
  visible?: boolean;
  strokeWidth?: number;
}

export interface AreaChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Series data */
  series: AreaSeries[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Chart type ("standard" | "stacked" | "normalized" | "stream") */
  type?: string;
  /** Curve type ("linear" | "monotone" | "step" | "natural") */
  curve?: string;
  /** Show data points? */
  showPoints?: boolean;
  /** Point size (px) */
  pointSize?: number;
  /** Show line on top of area? */
  showLine?: boolean;
  /** Line width (px) */
  lineWidth?: number;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Use gradient fill? */
  gradient?: boolean;
  /** X axis label */
  xAxisLabel?: string;
  /** Y axis label */
  yAxisLabel?: string;
  /** Show grid lines? */
  gridLines?: boolean;
  /** Grid style ("full" | "ticks") */
  gridStyle?: string;
  /** Show legend? */
  showLegend?: boolean;
  /** Legend position ("top" | "right" | "bottom") */
  legendPosition?: string;
  /** Y axis starts at zero? */
  zeroBaseline?: boolean;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Stagger delay between series (ms) */
  staggerDelay?: number;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
  /** Point click callback */
  onPointClick?: (point: DataPoint, series: AreaSeries, index: number, event: MouseEvent) => void;
  /** Area hover callback */
  onAreaHover?: (series: AreaSeries | null) => void;
}

export interface AreaChartInstance {
  element: SVGElement;
  /** Add a series */
  addSeries: (series: AreaSeries) => void;
  /** Remove a series by name */
  removeSeries: (name: string) => void;
  /** Toggle series visibility */
  toggleSeries: (name: string) => void;
  /** Update series data */
  updateSeries: (name: string, data: DataPoint[]) => void;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Curve Generators ---

interface Point2D { x: number; y: number; }

function linearCurve(points: Point2D[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i]!.x} ${points[i]!.y`;
  }
  return d;
}

function monotoneCurve(points: Point2D[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0]!.x} ${points[0]!.y}`;

  if (points.length === 2) {
    d += ` L ${points[1]!.x} ${points[1]!.y}`;
    return d;
  }

  // Catmull-Rom to Bezier conversion for monotone interpolation
  const n = points.length;
  const tangents: Point2D[] = new Array(n);

  // Compute tangents (monotone cubic)
  tangents[0] = { x: (points[1]!.x - points[0]!.x), y: (points[1]!.y - points[0]!.y) };
  for (let i = 1; i < n - 1; i++) {
    const dx = points[i + 1]!.x - points[i - 1]!.x;
    const dy = points[i + 1]!.y - points[i - 1]!.y;
    tangents[i] = { x: dx / 2, y: dy / 2 };
  }
  tangents[n - 1] = { x: (points[n - 1]!.x - points[n - 2]!.x), y: (points[n - 1]!.y - points[n - 2]!.y) };

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const t0 = tangents[i]!;
    const t1 = tangents[i + 1]!;
    const dx = p1.x - p0.x;

    // Control points
    const cp1x = p0.x + (dx / 3) * (t0.x === 0 ? 1 : Math.abs(dx / t0.x));
    const cp1y = p0.y + (dx / 3) * (t0.y === 0 ? 0 : t0.y);
    const cp2x = p1.x - (dx / 3) * (t1.x === 0 ? 1 : Math.abs(dx / t1.x));
    const cp2y = p1.y - (dx / 3) * (t1.y === 0 ? 0 : t1.y);

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  return d;
}

function stepCurve(points: Point2D[], align: "center" | "left" | "right" = "center"): string {
  if (points.length < 2) return "";
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i]!;
    const next = points[i + 1]!;
    const midX = (curr.x + next.x) / 2;
    switch (align) {
      case "left": d += ` H ${next.x} V ${next.y}`; break;
      case "right": d += ` V ${next.y} H ${next.x}`; break;
      default: d += ` H ${midX} V ${next.y}`; break;
    }
  }
  return d;
}

// --- Scale & Ticks ---

function scaleLinear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
}

function bandScale(domain: string[], range: [number, number], padding: number = 0.1): (v: string) => number {
  const [r0, r1] = range;
  const step = (r1 - r0) / domain.length;
  const pad = step * padding;
  const map = new Map<string, number>();
  domain.forEach((k, i) => map.set(k, r0 + step * i + pad + (step - 2 * pad) / 2));
  return (v: string) => map.get(v) ?? r0;
}

function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = count / (span / step);
  const fs = step * (err <= 1.5 ? 1 : err <= 3 ? 2 : err <= 7 ? 5 : 10);
  const ticks: number[] = [];
  let v = Math.ceil(min / fs) * fs;
  while (v <= max + fs * 0.5) { ticks.push(v); v += fs; }
  return ticks;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// --- Main Factory ---

export function createAreaChart(options: AreaChartOptions): AreaChartInstance {
  const opts = {
    width: options.width ?? 650,
    height: options.height ?? 380,
    type: options.type ?? "standard",
    curve: options.curve ?? "monotone",
    showPoints: options.showPoints ?? false,
    pointSize: options.pointSize ?? 4,
    showLine: options.showLine ?? true,
    lineWidth: options.lineWidth ?? 2,
    fillOpacity: options.fillOpacity ?? 0.2,
    gradient: options.gradient ?? true,
    xAxisLabel: options.xAxisLabel ?? "",
    yAxisLabel: options.yAxisLabel ?? "",
    gridLines: options.gridLines ?? true,
    gridStyle: options.gridStyle ?? "full",
    showLegend: options.showLegend ?? true,
    legendPosition: options.legendPosition ?? "top",
    zeroBaseline: options.zeroBaseline ?? true,
    tooltip: options.tooltip ?? true,
    animationDuration: options.animationDuration ?? 500,
    staggerDelay: options.staggerDelay ?? 80,
    padding: options.padding ?? { top: 40, right: 20, bottom: 50, left: 55 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("AreaChart: container not found");

  let series: AreaSeries[] = JSON.parse(JSON.stringify(options.series));
  let destroyed = false;

  const pad = opts.padding;
  const plotW = opts.width - pad.left! - pad.right!;
  const plotH = opts.height - pad.top! - pad.bottom!;

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `area-chart ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc");
  bg.setAttribute("rx", "6");
  svg.appendChild(bg);

  const gGrid = document.createElementNS(ns, "g");
  svg.appendChild(gGrid);

  const gAreas = document.createElementNS(ns, "g");
  svg.appendChild(gAreas);

  const gLines = document.createElementNS(ns, "g");
  svg.appendChild(gLines);

  const gPoints = document.createElementNS(ns, "g");
  svg.appendChild(gPoints);

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

  // Legend container
  let legendEl: HTMLElement | null = null;
  if (opts.showLegend) {
    legendEl = document.createElement("div");
    legendEl.style.cssText = `
      display:flex;gap:12px;padding:6px 12px;flex-wrap:wrap;
      font-size:11px;font-family:-apple-system,sans-serif;
      justify-content:center;
    `;
    container.insertBefore(legendEl, svg);
  }

  container.appendChild(svg);

  // --- Rendering ---

  function render(): void {
    gAreas.innerHTML = "";
    gLines.innerHTML = "";
    gPoints.innerHTML = "";
    gGrid.innerHTML = "";
    gAxes.innerHTML = "";
    if (legendEl) legendEl.innerHTML = "";

    const visibleSeries = series.filter(s => s.visible !== false);
    if (visibleSeries.length === 0) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(opts.width / 2));
      empty.setAttribute("y", String(opts.height / 2));
      empty.setAttribute("text-anchor", "middle");
      empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gAreas.appendChild(empty);
      return;
    }

    // Collect X categories
    const xCategories: string[] = [];
    const xMap = new Map<string, number>();
    for (const s of visibleSeries) {
      for (const dp of s.data) {
        const key = String(dp.x);
        if (!xMap.has(key)) {
          xMap.set(key, xCategories.length);
          xCategories.push(key);
        }
      }
    }

    // Compute Y domain
    let yMin = opts.zeroBaseline ? 0 : Infinity;
    let yMax = -Infinity;

    if (opts.type === "stacked" || opts.type === "normalized" || opts.type === "stream") {
      // Stack values per X
      const stacked: number[] = new Array(xCategories.length).fill(0);
      for (const s of visibleSeries) {
        for (let i = 0; i < xCategories.length; i++) {
          const val = s.data.find(d => String(d.x) === xCategories[i])?.y ?? 0;
          stacked[i] += val;
        }
      }
      if (opts.type === "normalized") {
        for (let i = 0; i < stacked.length; i++) stacked[i] = 100;
      }
      for (const v of stacked) {
        if (v < yMin) yMin = v;
        if (v > yMax) yMax = v;
      }
    } else {
      for (const s of visibleSeries) {
        for (const dp of s.data) {
          if (dp.y < yMin) yMin = dp.y;
          if (dp.y > yMax) yMax = dp.y;
        }
      }
    }

    if (!isFinite(yMax)) yMax = 100;
    if (!isFinite(yMin)) yMin = 0;
    const yPad = (yMax - yMin) * 0.06 || 1;
    yMin -= yPad; yMax += yPad;

    const xScale = bandScale(xCategories, [pad.left!, pad.left! + plotW]);
    const yScale = scaleLinear([yMin, yMax], [pad.top! + plotH, pad.top!]);

    // Grid
    if (opts.gridLines) {
      const ticks = niceTicks(yMin, yMax, 6);
      for (const t of ticks) {
        const pos = yScale(t);
        const gl = document.createElementNS(ns, "line");
        gl.setAttribute("x1", String(pad.left));
        gl.setAttribute("y1", String(pos));
        gl.setAttribute("x2", String(pad.left! + plotW));
        gl.setAttribute("y2", String(pos));
        gl.setAttribute("stroke", opts.gridStyle === "ticks" ? "#f0f0f0" : "#e5e7eb");
        gl.setAttribute("stroke-width", "1");
        if (opts.gridStyle === "ticks") gl.setAttribute("stroke-dasharray", "3,3");
        gGrid.appendChild(gl);
      }
    }

    // Zero baseline
    if (opts.zeroBaseline && yMin < 0 && yMax > 0) {
      const zl = document.createElementNS(ns, "line");
      zl.setAttribute("x1", String(pad.left));
      zl.setAttribute("y1", String(yScale(0)));
      zl.setAttribute("x2", String(pad.left! + plotW));
      zl.setAttribute("y2", String(yScale(0)));
      zl.setAttribute("stroke", "#9ca3af");
      zl.setAttribute("stroke-width", "1");
      gGrid.appendChild(zl);
    }

    // Build cumulative base for stacking
    const baseValues: number[] = new Array(xCategories.length).fill(
      opts.type === "stream" ? yMax / 2 : opts.zeroBaseline ? 0 : yMin
    );

    // Draw areas
    for (let si = 0; si < visibleSeries.length; si++) {
      const s = visibleSeries[si]!;
      const color = s.color ?? SERIES_COLORS[si % SERIES_COLORS.length];
      const fillColor = s.fillColor ?? color;

      // Create gradient def
      let fillRef = fillColor;
      if (opts.gradient) {
        const gradId = `area-gradient-${si}`;
        const grad = document.createElementNS(ns, "linearGradient");
        grad.setAttribute("id", gradId);
        grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0");
        grad.setAttribute("x2", "0"); grad.setAttribute("y2", "1");
        grad.innerHTML = `<stop offset="0%" stop-color="${fillColor}" stop-opacity="${opts.fillOpacity + 0.15}"/><stop offset="100%" stop-color="${fillColor}" stop-opacity="0.02"/>`;
        defs.appendChild(grad);
        fillRef = `url(#${gradId})`;
      }

      // Build area points
      const areaPts: Point2D[] = [];
      const linePts: Point2D[] = [];

      for (let xi = 0; xi < xCategories.length; xi++) {
        const cat = xCategories[xi]!;
        const dp = s.data.find(d => String(d.x) === cat);
        const val = dp?.y ?? 0;
        const px = xScale(cat);
        let py: number;

        if (opts.type === "stacked" || opts.type === "normalized" || opts.type === "stream") {
          py = yScale(baseValues[xi]! + val);
          linePts.push({ x: px, y: py });
          areaPts.push({ x: px, y: py });
        } else {
          py = yScale(val);
          linePts.push({ x: px, y: py });
          areaPts.push({ x: px, y: py });
        }
      }

      // Close the area path
      if (areaPts.length > 0) {
        if (opts.type === "stacked" || opts.type === "normalized" || opts.type === "stream") {
          // Add reverse baseline
          for (let xi = xCategories.length - 1; xi >= 0; xi--) {
            const cat = xCategories[xi]!;
            areaPts.push({ x: xScale(cat), y: yScale(baseValues[xi]!) });
          }
          // Update base for next series
          for (let xi = 0; xi < xCategories.length; xi++) {
            const cat = xCategories[xi]!;
            const val = s.data.find(d => String(d.x) === cat)?.y ?? 0;
            baseValues[xi]! += val;
          }
        } else {
          // Close to baseline
          areaPts.push({ x: areaPts[areaPts.length - 1]!.x, y: yScale(opts.zeroBaseline ? 0 : yMin) });
          areaPts.push({ x: areaPts[0]!.x, y: yScale(opts.zeroBaseline ? 0 : yMin) });
        }
      }

      // Generate curve
      const getCurve = (pts: Point2D[]) => {
        switch (opts.curve) {
          case "monotone": return monotoneCurve(pts);
          case "step": return stepCurve(pts);
          case "natural": return monotoneCurve(pts); // fallback
          default: return linearCurve(pts);
        }
      };

      // Area fill
      if (areaPts.length >= 3) {
        const areaPath = document.createElementNS(ns, "path");
        areaPath.setAttribute("d", getCurve(areaPts));
        areaPath.setAttribute("fill", fillRef);
        areaPath.setAttribute("stroke", "none");
        areaPath.style.opacity = "0";
        areaPath.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: opts.animationDuration,
          delay: si * opts.staggerDelay,
          fill: "forwards",
        });
        gAreas.appendChild(areaPath);
      }

      // Line overlay
      if (opts.showLine && linePts.length >= 2) {
        const linePath = document.createElementNS(ns, "path");
        linePath.setAttribute("d", getCurve(linePts));
        linePath.setAttribute("fill", "none");
        linePath.setAttribute("stroke", color);
        linePath.setAttribute("stroke-width", String(s.lineWidth ?? opts.lineWidth));
        if (s.dashed) linePath.setAttribute("stroke-dasharray", "6,4");
        linePath.style.opacity = "0";
        linePath.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: opts.animationDuration,
          delay: si * opts.staggerDelay,
          fill: "forwards",
        });
        gLines.appendChild(linePath);
      }

      // Points
      if (opts.showPoints) {
        for (let pi = 0; pi < linePts.length; pi++) {
          const lp = linePts[pi]!;
          const dp = s.data[pi];
          if (!dp) continue;
          const pt = document.createElementNS(ns, "circle");
          pt.setAttribute("cx", String(lp.x));
          pt.setAttribute("cy", String(lp.y));
          pt.setAttribute("r", String(opts.pointSize));
          pt.setAttribute("fill", "#fff");
          pt.setAttribute("stroke", color);
          pt.setAttribute("stroke-width", "2");
          pt.style.cursor = "pointer";
          pt.style.opacity = "0";
          pt.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 200,
            delay: si * opts.staggerDelay + pi * 20,
            fill: "forwards",
          });

          pt.addEventListener("mouseenter", (e) => {
            pt.setAttribute("r", String(opts.pointSize * 1.5));
            showTooltip(dp, s);
          });
          pt.addEventListener("mouseleave", () => {
            pt.setAttribute("r", String(opts.pointSize));
            hideTooltip();
          });
          pt.addEventListener("click", (e) => opts.onPointClick?.(dp, s, pi, e));

          gPoints.appendChild(pt);
        }
      }

      // Legend item
      if (legendEl) {
        const item = document.createElement("div");
        item.style.cssText = "display:flex;align-items:center;gap:5px;cursor:pointer;";
        item.addEventListener("click", () => toggleSeriesLocal(s.name));

        const swatch = document.createElement("span");
        swatch.style.cssText = `width:14px;height:3px;border-radius:2px;background:${color};`;

        const name = document.createElement("span");
        name.textContent = s.name;
        name.style.color = "#374151";

        item.appendChild(swatch);
        item.appendChild(name);
        legendEl.appendChild(item);
      }
    }

    // X axis labels
    for (let xi = 0; xi < xCategories.length; xi++) {
      const cat = xCategories[xi]!;
      const px = xScale(cat);
      const xl = document.createElementNS(ns, "text");
      xl.setAttribute("x", String(px));
      xl.setAttribute("y", String(pad.top! + plotH + 18));
      xl.setAttribute("text-anchor", "middle");
      xl.setAttribute("fill", "#6b7280");
      xl.setAttribute("font-size", "10");
      xl.textContent = cat.length > 12 ? cat.slice(0, 11) + "\u2026" : cat;
      gAxes.appendChild(xl);
    }

    // Y axis
    const yTicks = niceTicks(yMin, yMax, 6);
    for (const t of yTicks) {
      const pos = yScale(t);
      const tk = document.createElementNS(ns, "line");
      tk.setAttribute("x1", String(pad.left - 5));
      tk.setAttribute("y1", String(pos));
      tk.setAttribute("x2", String(pad.left));
      tk.setAttribute("y2", String(pos));
      tk.setAttribute("stroke", "#d1d5db");

      const lb = document.createElementNS(ns, "text");
      lb.setAttribute("x", String(pad.left - 8));
      lb.setAttribute("y", String(pos + 4));
      lb.setAttribute("text-anchor", "end");
      lb.setAttribute("fill", "#6b7280");
      lb.setAttribute("font-size", "10");
      lb.textContent = formatTick(t);

      gAxes.appendChild(tk);
      gAxes.appendChild(lb);
    }

    // Axis titles
    if (opts.xAxisLabel) {
      const xtl = document.createElementNS(ns, "text");
      xtl.setAttribute("x", String(pad.left! + plotW / 2));
      xtl.setAttribute("y", String(opts.height - 4));
      xtl.setAttribute("text-anchor", "middle");
      xtl.setAttribute("fill", "#6b7280");
      xtl.setAttribute("font-size", "11");
      xtl.textContent = opts.xAxisLabel;
      gAxes.appendChild(xtl);
    }
    if (opts.yAxisLabel) {
      const ytl = document.createElementNS(ns, "text");
      ytl.setAttribute("x", String(14));
      ytl.setAttribute("y", String(pad.top! + plotH / 2));
      ytl.setAttribute("transform", `rotate(-90, 14, ${pad.top! + plotH / 2})`);
      ytl.setAttribute("text-anchor", "middle");
      ytl.setAttribute("fill", "#6b7280");
      ytl.setAttribute("font-size", "11");
      ytl.textContent = opts.yAxisLabel;
      gAxes.appendChild(ytl);
    }
  }

  function toggleSeriesLocal(name: string): void {
    const s = series.find(s => s.name === name);
    if (s) s.visible = s.visible === false ? true : false;
    render();
  }

  function showTooltip(dp: DataPoint, ser: AreaSeries): void {
    if (!opts.tooltip) return;
    ttText.textContent = `${ser.name}: ${typeof dp.x === "number" ? dp.x : dp.x} = ${dp.y}`;
    gTooltip.style.display = "block";
    requestAnimationFrame(() => {
      const bb = ttText.getBBox();
      const p = 6;
      ttBg.setAttribute("x", String(-bb.width / 2 - p));
      ttBg.setAttribute("y", String(-bb.height - p - 10));
      ttBg.setAttribute("width", String(bb.width + p * 2));
      ttBg.setAttribute("height", String(bb.height + p * 2));
      ttText.setAttribute("x", String(-bb.width / 2));
      ttText.setAttribute("y", String(-bb.height - 10 + bb.height / 2 + 4));
      gTooltip.setAttribute("transform", `translate(${opts.width / 2}, ${opts.height / 3})`);
    });
  }

  function hideTooltip(): void {
    gTooltip.style.display = "none";
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: AreaChartInstance = {
    element: svg,

    addSeries(newSeries: AreaSeries) {
      series.push({ ...newSeries, data: [...newSeries.data] });
      render();
    },

    removeSeries(name: string) {
      series = series.filter(s => s.name !== name);
      render();
    },

    toggleSeries(name: string) {
      toggleSeriesLocal(name);
    },

    updateSeries(name: string, data: DataPoint[]) {
      const s = series.find(s => s.name === name);
      if (s) { s.data = data; render(); }
    },

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      svg.remove();
      legendEl?.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}

const SERIES_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];
