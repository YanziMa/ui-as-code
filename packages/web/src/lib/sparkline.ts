/**
 * Sparkline: Minimal inline chart for embedding in tables, cards, and text.
 * Supports line, bar, area, and win/loss (bullet) variants with
 * auto-scaling, tooltips, responsive sizing, and zero-dependency rendering.
 */

// --- Types ---

export type SparklineType = "line" | "bar" | "area" | "winloss" | "pie";

export interface SparklineOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data values */
  values: number[];
  /** Chart type */
  type?: SparklineType;
  /** Line width (for line/area, default: 1.5) */
  lineWidth?: number;
  /** Color for positive/up values */
  color?: string;
  /** Color for negative/down values (winloss) */
  negativeColor?: string;
  /** Background/fill color (for area) */
  fillOpacity?: number;
  /** Show min/max labels? */
  showLabels?: boolean;
  /** Show tooltip on hover? */
  showTooltip?: boolean;
  /** Target/reference line value */
  targetLine?: number;
  /** Target line color/dash */
  targetLineColor?: string;
  /** Width in px (default: auto from container) */
  width?: number;
  /** Height in px (default: 24) */
  height?: number;
  /** Padding inside the SVG */
  padding?: number;
  /** Smooth curves (line/area only)? */
  smooth?: boolean;
  /** Bar radius (bar type) */
  barRadius?: number;
  /** Callback on point hover */
  onHover?: (index: number | null, value: number | null) => void;
  /** Callback on click */
  onClick?: (index: number, value: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SparklineInstance {
  element: SVGSVGElement;
  setValues: (values: number[]) => void;
  getValue: () => number[];
  destroy: () => void;
}

// --- Helpers ---

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

function getStats(values: number[]): { min: number; max: number; avg: number } {
  if (values.length === 0) return { min: 0, max: 0, avg: 0 };
  let min = Infinity, max = -Infinity, sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, avg: sum / values.length };
}

// Catmull-Rom to Bezier control points for smooth curves
function getControlPoints(points: Array<{ x: number; y: number }>): Array<{ cp1: { x: number; y: number }; cp2: { x: number; y: number }; pt: { x: number; y: number } }> {
  const result: ReturnType<typeof getControlPoints> = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === points.length - 1) {
      result.push({ cp1: points[i]!, cp2: points[i]!, pt: points[i]! });
    } else {
      const p0 = points[i - 1]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      result.push({
        cp1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
        cp2: { x: p2.x - (p2.x - p0.x) / 6, y: p2.y - (p2.y - p0.y) / 6 },
        pt: p1,
      });
    }
  }
  return result;
}

// --- Main ---

export function createSparkline(options: SparklineOptions): SparklineInstance {
  const opts = {
    type: options.type ?? "line",
    lineWidth: options.lineWidth ?? 1.5,
    color: options.color ?? "#4338ca",
    negativeColor: options.negativeColor ?? "#ef4444",
    fillOpacity: options.fillOpacity ?? 0.15,
    showLabels: options.showLabels ?? false,
    showTooltip: options.showTooltip ?? true,
    width: options.width ?? 0,
    height: options.height ?? 24,
    padding: options.padding ?? 2,
    smooth: options.smooth ?? true,
    barRadius: options.barRadius ?? 1.5,
    targetLineColor: options.targetLineColor ?? "#9ca3af",
    className: options.className ?? "",
    ...options,
  };

  const container = resolveEl(options.container);
  if (!container) throw new Error("Sparkline: container not found");

  container.className = `sparkline ${opts.className}`;
  container.style.cssText = "display:inline-block;position:relative;font-family:-apple-system,sans-serif;vertical-align:middle;";

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg") as SVGSVGElement;
  svg.style.display = "block";
  svg.style.overflow = "visible";
  container.appendChild(svg);

  let currentValues = [...options.values];
  let destroyed = false;

  // Tooltip element
  let tooltipEl: HTMLDivElement | null = null;

  function render(): void {
    svg.innerHTML = "";
    const vals = currentValues;
    if (vals.length === 0) return;

    // Determine dimensions
    const w = opts.width || container.clientWidth || 120;
    const h = opts.height;
    svg.setAttribute("width", String(w));
    svg.setAttribute("height", String(h));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

    const pad = opts.padding;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;
    const stats = getStats(vals);

    switch (opts.type) {
      case "line": renderLine(vals, stats, ns, pad, plotW, plotH); break;
      case "area": renderArea(vals, stats, ns, pad, plotW, plotH); break;
      case "bar": renderBar(vals, stats, ns, pad, plotW, plotH); break;
      case "winloss": renderWinLoss(vals, ns, pad, plotW, plotH); break;
      case "pie": renderPie(vals, ns, w, h); break;
    }

    // Target line
    if (opts.targetLine !== undefined && opts.type !== "pie") {
      const range = stats.max - stats.min || 1;
      const ty = pad + plotH - ((opts.targetLine! - stats.min) / range) * plotH;
      const tl = document.createElementNS(ns, "line");
      tl.setAttribute("x1", String(pad));
      tl.setAttribute("y1", String(ty));
      tl.setAttribute("x2", String(w - pad));
      tl.setAttribute("y2", String(ty));
      tl.setAttribute("stroke", opts.targetLineColor);
      tl.setAttribute("stroke-width", "1");
      tl.setAttribute("stroke-dasharray", "3,3");
      svg.appendChild(tl);
    }

    // Min/max labels
    if (opts.showLabels && opts.type !== "pie") {
      const minLbl = document.createElementNS(ns, "text");
      minLbl.setAttribute("x", String(pad));
      minLbl.setAttribute("y", String(h - 1));
      minLbl.setAttribute("font-size", "8");
      minLbl.setAttribute("fill", "#9ca3af");
      minLbl.textContent = formatVal(stats.min);
      svg.appendChild(minLbl);

      const maxLbl = document.createElementNS(ns, "text");
      maxLbl.setAttribute("x", String(pad));
      maxLbl.setAttribute("y", String(pad + 7));
      maxLbl.setAttribute("font-size", "8");
      maxLbl.setAttribute("fill", "#9ca3af");
      maxLbl.textContent = formatVal(stats.max);
      svg.appendChild(maxLbl);
    }
  }

  function formatVal(v: number): string {
    if (Math.abs(v) >= 1000) return (v / 1000).toFixed(1) + "k";
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(1);
  }

  function renderLine(vals: number[], stats: { min: number; max: number }, ns: string, pad: number, plotW: number, plotH: number): void {
    const range = stats.max - stats.min || 1;
    const stepX = vals.length > 1 ? plotW / (vals.length - 1) : plotW / 2;

    const points = vals.map((v, i) => ({
      x: pad + i * stepX,
      y: pad + plotH - ((v - stats.min) / range) * plotH,
    }));

    const pathData = buildPathData(points);
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", opts.color);
    path.setAttribute("stroke-width", String(opts.lineWidth));
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);

    attachPointEvents(vals, points, ns, pad, plotW, plotH);
  }

  function renderArea(vals: number[], stats: { min: number; max: number }, ns: string, pad: number, plotW: number, plotH: number): void {
    const range = stats.max - stats.min || 1;
    const stepX = vals.length > 1 ? plotW / (vals.length - 1) : plotW / 2;

    const points = vals.map((v, i) => ({
      x: pad + i * stepX,
      y: pad + plotH - ((v - stats.min) / range) * plotH,
    }));

    // Area fill
    const areaPathData = buildPathData(points) +
      ` L ${points[points.length - 1]?.x ?? pad + plotW} ${pad + plotH}` +
      ` L ${pad} ${pad + plotH} Z`;
    const areaPath = document.createElementNS(ns, "path");
    areaPath.setAttribute("d", areaPathData);
    areaPath.setAttribute("fill", opts.color);
    areaPath.setAttribute("fill-opacity", String(opts.fillOpacity));
    svg.appendChild(areaPath);

    // Line on top
    const linePath = document.createElementNS(ns, "path");
    linePath.setAttribute("d", buildPathData(points));
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", opts.color);
    linePath.setAttribute("stroke-width", String(opts.lineWidth));
    linePath.setAttribute("stroke-linecap", "round");
    linePath.setAttribute("stroke-linejoin", "round");
    svg.appendChild(linePath);

    attachPointEvents(vals, points, ns, pad, plotW, plotH);
  }

  function renderBar(vals: number[], stats: { min: number; max: number }, ns: string, pad: number, plotW: number, plotH: number): void {
    const range = stats.max - stats.min || 1;
    const hasNeg = stats.min < 0;
    const zeroY = hasNeg ? pad + plotH - (0 - stats.min) / range * plotH : pad + plotH;
    const barW = Math.max(2, plotW / vals.length - (plotW / vals.length) * 0.3);
    const gap = (plotW - barW * vals.length) / (vals.length + 1);

    for (let i = 0; i < vals.length; i++) {
      const v = vals[i]!;
      const isNeg = v < 0;
      const barH = Math.max(1, Math.abs(v - (hasNeg ? Math.min(0, stats.min) : stats.min)) / range * plotH);
      const x = pad + gap + i * (barW + gap);
      const y = isNeg ? zeroY : zeroY - barH;

      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", String(barW));
      rect.setAttribute("height", String(barH));
      rect.setAttribute("rx", String(opts.barRadius));
      rect.setAttribute("fill", isNeg ? opts.negativeColor : opts.color);
      rect.style.cursor = "pointer";
      rect.dataset.index = String(i);

      rect.addEventListener("click", () => opts.onClick?.(i, v));

      if (opts.showTooltip) {
        rect.addEventListener("mouseenter", () => {
          showTooltip(i, v, x + barW / 2, y);
          opts.onHover?.(i, v);
        });
        rect.addEventListener("mouseleave", () => {
          hideTooltip();
          opts.onHover?.(null, null);
        });
      }

      svg.appendChild(rect);
    }
  }

  function renderWinLoss(vals: number[], ns: string, pad: number, _plotW: number, h: number): void {
    const cellSize = Math.floor(h / vals.length) || 12;
    const dotSize = cellSize * 0.6;
    const offset = (h - cellSize * vals.length) / 2;

    for (let i = 0; i < vals.length; i++) {
      const v = vals[i]!;
      const isWin = v > 0;
      const cy = pad + offset + i * cellSize + cellSize / 2;
      const cx = pad + cellSize / 2;

      const circle = document.createElementNS(ns, "circle");
      circle.setAttribute("cx", String(cx));
      circle.setAttribute("cy", String(cy));
      circle.setAttribute("r", String(dotSize / 2));
      circle.setAttribute("fill", isWin ? opts.color : opts.negativeColor);
      circle.style.opacity = v === 0 ? "0.25" : "1";
      circle.dataset.index = String(i);

      circle.style.cursor = "pointer";
      circle.addEventListener("click", () => opts.onClick?.(i, v));
      svg.appendChild(circle);
    }
  }

  function renderPie(vals: number[], ns: string, w: number, h: number): void {
    const total = vals.reduce((s, v) => s + Math.abs(v), 0);
    if (total === 0) return;

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - pad;
    let startAngle = -Math.PI / 2;

    for (let i = 0; i < vals.length; i++) {
      const sliceAngle = (Math.abs(vals[i]) / total) * Math.PI * 2;
      const endAngle = startAngle + sliceAngle;
      const largeArc = sliceAngle > Math.PI ? 1 : 0;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);

      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} ${x2} ${y2} Z`);
      path.setAttribute("fill", opts.colors?.[i % (opts.colors?.length ?? 10)] ?? opts.color);
      path.style.cursor = "pointer";
      path.dataset.index = String(i);

      path.addEventListener("click", () => opts.onClick?.(i, vals[i]));
      svg.appendChild(path);

      startAngle = endAngle;
    }
  }

  function buildPathData(points: Array<{ x: number; y: number }>): string {
    if (!opts.smooth || points.length <= 2) {
      return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    }

    const cps = getControlPoints(points);
    return cps.map((c, i) =>
      `${i === 0 ? "M" : "C"} ${c.cp1.x} ${c.cp1.y} ${c.cp2.x} ${c.cp2.y} ${c.pt.x} ${c.pt.y}`
    ).join(" ");
  }

  function attachPointEvents(
    vals: number[],
    points: Array<{ x: number; y: number }>,
    _ns: string,
    _pad: number,
    _plotW: number,
    _plotH: number,
  ): void {
    if (!opts.showTooltip && !opts.onClick) return;

    // Invisible hit areas for easier interaction
    for (let i = 0; i < points.length; i++) {
      const hitArea = document.createElementNS(_ns, "rect");
      const prevX = i > 0 ? points[i - 1]!.x : points[0]!.x - 5;
      const nextX = i < points.length - 1 ? points[i + 1]!.x : points[points.length - 1]!.x + 5;
      hitArea.setAttribute("x", String(prevX));
      hitArea.setAttribute("y", String(0));
      hitArea.setAttribute("width", String(nextX - prevX));
      hitArea.setAttribute("height", String(opts.height));
      hitArea.setAttribute("fill", "transparent");
      hitArea.style.cursor = "pointer";
      hitArea.dataset.index = String(i);

      hitArea.addEventListener("click", () => opts.onClick?.(i, vals[i]));

      if (opts.showTooltip) {
        hitArea.addEventListener("mouseenter", () => {
          showTooltip(i, vals[i], points[i].x, points[i].y);
          opts.onHover?.(i, vals[i]);
        });
        hitArea.addEventListener("mouseleave", () => {
          hideTooltip();
          opts.onHover?.(null, null);
        });
      }

      svg.appendChild(hitArea);
    }
  }

  function showTooltip(index: number, value: number, x: number, y: number): void {
    hideTooltip();
    tooltipEl = document.createElement("div");
    tooltipEl.className = "sparkline-tooltip";
    tooltipEl.style.cssText = `
      position:absolute;z-index:10000;background:#1e1b4b;color:#fff;padding:3px 8px;
      border-radius:4px;font-size:11px;font-weight:500;pointer-events:none;
      box-shadow:0 2px 8px rgba(0,0,0,0.15);white-space:nowrap;
      transform:translate(-50%, -100%);margin-top:-6px;
    `;
    tooltipEl.textContent = `[${index}] ${formatVal(value)}`;
    container.appendChild(tooltipEl);
    tooltipEl.style.left = `${x}px`;
    tooltipEl.style.top = `${y}px`;
  }

  function hideTooltip(): void {
    tooltipEl?.remove();
    tooltipEl = null;
  }

  // Initial render
  render();

  const instance: SparklineInstance = {
    element: svg,

    setValues(newVals: number[]) {
      currentValues = newVals;
      render();
    },

    getValue() { return [...currentValues] },

    destroy() {
      destroyed = true;
      hideTooltip();
      svg.remove();
    },
  };

  return instance;
}
