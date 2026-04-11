/**
 * Bubble Chart: Interactive bubble chart with size as third dimension,
 * color by category, force-like collision avoidance, hover/tooltip,
 * animation, legend, and axis configuration.
 */

// --- Types ---

export interface Bubble {
  x: number;
  y: number;
  size: number; // area or radius
  id?: string;
  label?: string;
  category?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface BubbleSeries {
  name: string;
  bubbles: Bubble[];
  color?: string;
}

export interface BubbleChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data series */
  series: BubbleSeries[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Size mode ("area" | "radius") */
  sizeMode?: string;
  /** Min bubble radius (px) */
  minRadius?: number;
  /** Max bubble radius (px) */
  maxRadius?: number;
  /** X axis domain [min, max] (auto if omitted) */
  xDomain?: [number, number];
  /** Y axis domain [min, max] (auto if omitted) */
  yDomain?: [number, number];
  /** Show axes? */
  showAxes?: boolean;
  /** Axis labels */
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** Grid lines? */
  gridLines?: boolean;
  /** Opacity range for bubbles */
  opacityRange?: [number, number];
  /** Stroke width */
  strokeWidth?: number;
  /** Show labels on bubbles? */
  showLabels?: boolean;
  /** Label font size */
  labelFontSize?: number;
  /** Collision avoidance iterations */
  collisionIterations?: number;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Legend enabled? */
  showLegend?: boolean;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
  /** Bubble click callback */
  onBubbleClick?: (bubble: Bubble, series: BubbleSeries, event: MouseEvent) => void;
  /** Bubble hover callback */
  onBubbleHover?: (bubble: Bubble | null, series: BubbleSeries | null) => void;
}

export interface BubbleChartInstance {
  element: SVGElement;
  /** Add a series */
  addSeries: (series: BubbleSeries) => void;
  /** Remove a series */
  removeSeries: (name: string) => void;
  /** Update bubbles in a series */
  updateBubbles: (seriesName: string, bubbles: Bubble[]) => void;
  /** Set domain */
  setDomain: (xDom?: [number, number], yDom?: [number, number]) => void;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Helpers ---

function scaleLinear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
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

const COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

// --- Main Factory ---

export function createBubbleChart(options: BubbleChartOptions): BubbleChartInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 450,
    sizeMode: options.sizeMode ?? "area",
    minRadius: options.minRadius ?? 8,
    maxRadius: options.maxRadius ?? 50,
    showAxes: options.showAxes ?? true,
    xAxisLabel: options.xAxisLabel ?? "",
    yAxisLabel: options.yAxisLabel ?? "",
    gridLines: options.gridLines ?? true,
    opacityRange: options.opacityRange ?? [0.45, 0.9],
    strokeWidth: options.strokeWidth ?? 1.5,
    showLabels: options.showLabels ?? false,
    labelFontSize: options.labelFontSize ?? 10,
    collisionIterations: options.collisionIterations ?? 3,
    tooltip: options.tooltip ?? true,
    animationDuration: options.animationDuration ?? 500,
    showLegend: options.showLegend ?? true,
    padding: options.padding ?? { top: 30, right: 20, bottom: 50, left: 55 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("BubbleChart: container not found");

  let series: BubbleSeries[] = JSON.parse(JSON.stringify(options.series));
  let destroyed = false;

  const pad = opts.padding;
  const plotW = opts.width - pad.left! - pad.right!;
  const plotH = opts.height - pad.top! - pad.bottom!;

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `bubble-chart ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc");
  bg.setAttribute("rx", "6");
  svg.appendChild(bg);

  const gGrid = document.createElementNS(ns, "g");
  svg.appendChild(gGrid);

  const gBubbles = document.createElementNS(ns, "g");
  svg.appendChild(gBubbles);

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

  // Legend
  let legendEl: HTMLElement | null = null;
  if (opts.showLegend) {
    legendEl = document.createElement("div");
    legendEl.style.cssText = "display:flex;gap:12px;padding:6px 12px;font-size:11px;flex-wrap:wrap;justify-content:center;";
    container.insertBefore(legendEl, svg);
  }

  container.appendChild(svg);

  // --- Rendering ---

  function render(): void {
    gBubbles.innerHTML = "";
    gGrid.innerHTML = "";
    gAxes.innerHTML = "";
    if (legendEl) legendEl.innerHTML = "";

    if (series.length === 0 || series.every(s => s.bubbles.length === 0)) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(opts.width / 2));
      empty.setAttribute("y", String(opts.height / 2));
      empty.setAttribute("text-anchor", "middle");
      empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gBubbles.appendChild(empty);
      return;
    }

    // Compute domains
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    let maxSize = 0;
    for (const s of series) {
      for (const b of s.bubbles) {
        if (b.x < xMin) xMin = b.x;
        if (b.x > xMax) xMax = b.x;
        if (b.y < yMin) yMin = b.y;
        if (b.y > yMax) yMax = b.y;
        if (b.size > maxSize) maxSize = b.size;
      }
    }

    const xDomain: [number, number] = opts.xDomain ?? [
      isFinite(xMin) ? xMin : 0,
      isFinite(xMax) ? xMax : 100,
    ];
    const yDomain: [number, number] = opts.yDomain ?? [
      isFinite(yMin) ? yMin : 0,
      isFinite(yMax) ? yMax : 100,
    ];

    const xPad = (xDomain[1] - xDomain[0]) * 0.06 || 1;
    const yPad = (yDomain[1] - yDomain[0]) * 0.06 || 1;
    xDomain[0] -= xPad; xDomain[1] += xPad;
    yDomain[0] -= yPad; yDomain[1] += yPad;

    const scaleX = scaleLinear(xDomain, [pad.left!, pad.left! + plotW]);
    const scaleY = scaleLinear(yDomain, [pad.top! + plotH, pad.top!]);

    // Size scale
    const maxR = opts.maxRadius;
    const minR = opts.minRadius;
    const sizeScale = (size: number): number => {
      if (maxSize === 0) return minR;
      if (opts.sizeMode === "area") {
        const areaFrac = size / maxSize;
        return minR + Math.sqrt(areaFrac) * (maxR - minR);
      }
      return minR + (size / maxSize) * (maxR - minR);
    };

    // Grid
    if (opts.gridLines) {
      const xt = niceTicks(xDomain[0], xDomain[1], 6);
      const yt = niceTicks(yDomain[0], yDomain[1], 6);
      for (const t of xt) {
        const pos = scaleX(t);
        const gl = document.createElementNS(ns, "line");
        gl.setAttribute("x1", String(pos)); gl.setAttribute("y1", String(pad.top));
        gl.setAttribute("x2", String(pos)); gl.setAttribute("y2", String(pad.top! + plotH));
        gl.setAttribute("stroke", "#f0f0f0"); gl.setAttribute("stroke-width", "1");
        gGrid.appendChild(gl);
      }
      for (const t of yt) {
        const pos = scaleY(t);
        const gl = document.createElementNS(ns, "line");
        gl.setAttribute("x1", String(pad.left)); gl.setAttribute("y1", String(pos));
        gl.setAttribute("x2", String(pad.left! + plotW)); gl.setAttribute("y2", String(pos));
        gl.setAttribute("stroke", "#f0f0f0"); gl.setAttribute("stroke-width", "1");
        gGrid.appendChild(gl);
      }
    }

    // Collect all positioned bubbles for collision avoidance
    const allBubbles: { el: SVGCircleElement; cx: number; cy: number; r: number; bubble: Bubble; ser: BubbleSeries }[] = [];

    // Draw each series
    for (let si = 0; si < series.length; si++) {
      const s = series[si]!;
      const color = s.color ?? COLORS[si % COLORS.length];

      for (const b of s.bubbles) {
        const px = scaleX(b.x);
        const py = scaleY(b.y);
        const r = sizeScale(b.size);

        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("cx", String(px));
        circle.setAttribute("cy", String(py));
        circle.setAttribute("r", String(r));
        circle.setAttribute("fill", b.color ?? color);
        circle.setAttribute("fill-opacity", String(opts.opacityRange[0]));
        circle.setAttribute("stroke", b.color ?? color);
        circle.setAttribute("stroke-width", String(opts.strokeWidth));
        circle.style.cursor = "pointer";

        // Animation: grow from center
        circle.setAttribute("transform-origin", `${px} ${py}`);
        circle.animate(
          [{ transform: "scale(0)" }, { transform: "scale(1)" }],
          { duration: opts.animationDuration, delay: si * 60, easing: "ease-out" }
        );

        // Hover
        circle.addEventListener("mouseenter", () => {
          circle.setAttribute("fill-opacity", String(opts.opacityRange[1]));
          circle.setAttribute("stroke-width", "2.5");
          showTooltip(b, s);
          opts.onBubbleHover?.(b, s);
        });
        circle.addEventListener("mouseleave", () => {
          circle.setAttribute("fill-opacity", String(opts.opacityRange[0]));
          circle.setAttribute("stroke-width", String(opts.strokeWidth));
          hideTooltip();
          opts.onBubbleHover?.(null, null);
        });
        circle.addEventListener("click", (e) => opts.onBubbleClick?.(b, s, e));

        gBubbles.appendChild(circle);
        allBubbles.push({ el: circle, cx: px, cy: py, r, bubble: b, ser: s });

        // Label
        if (opts.showLabels && b.label && r > 20) {
          const lbl = document.createElementNS(ns, "text");
          lbl.setAttribute("x", String(px));
          lbl.setAttribute("y", String(py + opts.labelFontSize / 3));
          lbl.setAttribute("text-anchor", "middle");
          lbl.setAttribute("fill", "#fff");
          lbl.setAttribute("font-size", String(Math.min(opts.labelFontSize, r * 0.5)));
          lbl.setAttribute("font-weight", "600");
          lbl.setAttribute("pointer-events", "none");
          lbl.textContent = b.label.length > 8 ? b.label.slice(0, 7) + "\u2026" : b.label;
          gBubbles.appendChild(lbl);
        }
      }

      // Legend
      if (legendEl) {
        const item = document.createElement("div");
        item.style.cssText = "display:flex;align-items:center;gap:5px;";
        const swatch = document.createElement("span");
        swatch.style.cssText = `width:12px;height:12px;border-radius:50%;background:${color};`;
        const name = document.createElement("span");
        name.textContent = s.name;
        name.style.color = "#374151";
        item.appendChild(swatch); item.appendChild(name);
        legendEl.appendChild(item);
      }
    }

    // Simple collision avoidance (push overlapping bubbles apart)
    if (opts.collisionIterations > 0) {
      for (let iter = 0; iter < opts.collisionIterations; iter++) {
        for (let i = 0; i < allBubbles.length; i++) {
          for (let j = i + 1; j < allBubbles.length; j++) {
            const a = allBubbles[i]!;
            const b = allBubbles[j]!;
            const dx = b.cx - a.cx;
            const dy = b.cy - a.cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = a.r + b.r + 2;
            if (dist < minDist && dist > 0) {
              const overlap = (minDist - dist) / 2 * 0.3;
              const nx = dx / dist;
              const ny = dy / dist;
              a.cx -= nx * overlap;
              a.cy -= ny * overlap;
              b.cx += nx * overlap;
              b.cy += ny * overlap;
              a.el.setAttribute("cx", String(a.cx));
              a.el.setAttribute("cy", String(a.cy));
              b.el.setAttribute("cx", String(b.cx));
              b.el.setAttribute("cy", String(b.cy));
            }
          }
        }
      }
    }

    // Axes
    if (opts.showAxes) {
      const xt = niceTicks(xDomain[0], xDomain[1], 6);
      const yt = niceTicks(yDomain[0], yDomain[1], 6);

      for (const t of xt) {
        const pos = scaleX(t);
        const tk = document.createElementNS(ns, "line");
        tk.setAttribute("x1", String(pos)); tk.setAttribute("y1", String(pad.top! + plotH));
        tk.setAttribute("x2", String(pos)); tk.setAttribute("y2", String(pad.top! + plotH + 5));
        tk.setAttribute("stroke", "#d1d5db");

        const lb = document.createElementNS(ns, "text");
        lb.setAttribute("x", String(pos)); lb.setAttribute("y", String(pad.top! + plotH + 18));
        lb.setAttribute("text-anchor", "middle"); lb.setAttribute("fill", "#6b7280");
        lb.setAttribute("font-size", "10"); lb.textContent = formatTick(t);
        gAxes.appendChild(tk); gAxes.appendChild(lb);
      }

      for (const t of yt) {
        const pos = scaleY(t);
        const tk = document.createElementNS(ns, "line");
        tk.setAttribute("x1", String(pad.left - 5)); tk.setAttribute("y1", String(pos));
        tk.setAttribute("x2", String(pad.left)); tk.setAttribute("y2", String(pos));
        tk.setAttribute("stroke", "#d1d5db");

        const lb = document.createElementNS(ns, "text");
        lb.setAttribute("x", String(pad.left - 8)); lb.setAttribute("y", String(pos + 4));
        lb.setAttribute("text-anchor", "end"); lb.setAttribute("fill", "#6b7280");
        lb.setAttribute("font-size", "10"); lb.textContent = formatTick(t);
        gAxes.appendChild(tk); gAxes.appendChild(lb);
      }

      if (opts.xAxisLabel) {
        const xl = document.createElementNS(ns, "text");
        xl.setAttribute("x", String(pad.left! + plotW / 2)); xl.setAttribute("y", String(opts.height - 4));
        xl.setAttribute("text-anchor", "middle"); xl.setAttribute("fill", "#6b7280");
        xl.setAttribute("font-size", "11"); xl.textContent = opts.xAxisLabel;
        gAxes.appendChild(xl);
      }
      if (opts.yAxisLabel) {
        const yl = document.createElementNS(ns, "text");
        yl.setAttribute("x", String(14)); yl.setAttribute("y", String(pad.top! + plotH / 2));
        yl.setAttribute("transform", `rotate(-90, 14, ${pad.top! + plotH / 2})`);
        yl.setAttribute("text-anchor", "middle"); yl.setAttribute("fill", "#6b7280");
        yl.setAttribute("font-size", "11"); yl.textContent = opts.yAxisLabel;
        gAxes.appendChild(yl);
      }
    }
  }

  function showTooltip(bubble: Bubble, ser: BubbleSeries): void {
    if (!opts.tooltip) return;
    const parts = [ser.name];
    if (bubble.label) parts.push(bubble.label);
    parts.push(`X: ${bubble.x}  Y: ${bubble.y}  Size: ${bubble.size}`);
    ttText.textContent = parts.join(" \u2013 ");
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

  const instance: BubbleChartInstance = {
    element: svg,

    addSeries(newSeries: BubbleSeries) {
      series.push({ ...newSeries, bubbles: [...newSeries.bubbles] });
      render();
    },

    removeSeries(name: string) {
      series = series.filter(s => s.name !== name);
      render();
    },

    updateBubbles(seriesName: string, bubbles: Bubble[]) {
      const s = series.find(s => s.name === seriesName);
      if (s) { s.bubbles = bubbles; render(); }
    },

    setDomain(xDom?, yDom?) {
      if (xDom) Object.assign(opts, { xDomain: xDom });
      if (yDom) Object.assign(opts, { yDomain: yDom });
      render();
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
