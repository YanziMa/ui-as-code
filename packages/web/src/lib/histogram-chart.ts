/**
 * Histogram Chart: Statistical histogram with automatic binning, normal
 * distribution curve overlay, cumulative distribution, frequency/count
 * density modes, bin interaction, and configurable styling.
 */

// --- Types ---

export interface Bin {
  /** Bin start (inclusive) */
  x0: number;
  /** Bin end (exclusive) */
  x1: number;
  /** Frequency/count */
  count: number;
  /** Density (for probability density) */
  density?: number;
  /** Midpoint */
  midpoint: number;
}

export interface HistogramOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Raw data values */
  values: number[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Number of bins (auto if 0) */
  bins?: number;
  /** Bin width (overrides bins if set) */
  binWidth?: number;
  /** Mode ("frequency" | "density" | "probability" | "cumulative") */
  mode?: string;
  /** Bar color */
  color?: string;
  /** Bar fill opacity */
  fillOpacity?: number;
  /** Bar stroke color */
  strokeColor?: string;
  /** Bar stroke width */
  strokeWidth?: number;
  /** Bar corner radius */
  borderRadius?: number;
  /** Show normal curve overlay? */
  showNormalCurve?: boolean;
  /** Normal curve color */
  normalCurveColor?: string;
  /** Normal curve line width */
  normalCurveWidth?: number;
  /** Show mean line? */
  showMean?: boolean;
  /** Mean line style */
  meanLineStyle?: "solid" | "dashed" | "dotted";
  /** Show median line? */
  showMedian?: boolean;
  /** Show statistics summary? */
  showStats?: boolean;
  /** Stats position ("top-right" | "bottom-left" | "hidden") */
  statsPosition?: string;
  /** Grid lines? */
  gridLines?: boolean;
  /** X/Y axis labels */
  xAxisLabel?: string;
  yAxisLabel?: string;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Bar click callback */
  onBinClick?: (bin: Bin, index: number, event: MouseEvent) => void;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
}

export interface HistogramInstance {
  element: SVGElement;
  /** Update values */
  setValues: (values: number[]) => void;
  /** Set bin count */
  setBins: (count: number) => void;
  /** Get computed bins */
  getBins: () => Bin[];
  /** Get statistics */
  getStats: () => { mean: number; stdDev: number; median: number; min: number; max: number; n: number };
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Statistics ---

function computeStats(values: number[]): { mean: number; stdDev: number; median: number; min: number; max: number; n: number } {
  const n = values.length;
  if (n === 0) return { mean: 0, stdDev: 0, median: 0, min: 0, max: 0, n: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2 : sorted[Math.floor(n / 2)]!;
  return { mean, stdDev, median, min: sorted[0]!, max: sorted[n - 1]!, n };
}

function autoBinCount(values: number[]): number {
  // Freedman-Diaconis rule
  const n = values.length;
  if (n < 2) return 10;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(n * 0.25)]!;
  const q3 = sorted[Math.floor(n * 0.75)]!;
  const iqr = q3 - q1;
  if (iqr === 0) return Math.ceil(Math.sqrt(n));
  const bw = 2 * iqr / Math.cbrt(n);
  const range = sorted[n - 1]! - sorted[0]!;
  if (bw === 0) return 10;
  return Math.max(5, Math.ceil(range / bw));
}

function createBins(values: number[], binCount: number): Bin[] {
  if (values.length === 0 || binCount <= 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const binWidth = range / binCount;

  const bins: Bin[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({
      x0: min + i * binWidth,
      x1: min + (i + 1) * binWidth,
      count: 0,
      midpoint: min + (i + 0.5) * binWidth,
    });
  }

  for (const v of values) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx]!.count++;
  }

  // Compute density
  const totalArea = values.length * binWidth;
  for (const b of bins) {
    b.density = totalArea > 0 ? b.count / totalArea : 0;
  }

  return bins;
}

// --- Scale Helpers ---

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
  let v = Math.floor(min / fs) * fs;
  while (v <= max + fs * 0.5) { ticks.push(v); v += fs; }
  return ticks;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function normalPDF(x: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  const z = (x - mean) / stdDev;
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

// --- Main Factory ---

export function createHistogramChart(options: HistogramOptions): HistogramInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 380,
    bins: options.bins ?? 0,
    binWidth: options.binWidth ?? 0,
    mode: options.mode ?? "frequency",
    color: options.color ?? "#6366f1",
    fillOpacity: options.fillOpacity ?? 0.65,
    strokeColor: options.strokeColor ?? "",
    strokeWidth: options.strokeWidth ?? 1,
    borderRadius: options.borderRadius ?? 2,
    showNormalCurve: options.showNormalCurve ?? false,
    normalCurveColor: options.normalCurveColor ?? "#ef4444",
    normalCurveWidth: options.normalCurveWidth ?? 2,
    showMean: options.showMean ?? true,
    meanLineStyle: options.meanLineStyle ?? "dashed",
    showMedian: options.showMedian ?? false,
    showStats: options.showStats ?? true,
    statsPosition: options.statsPosition ?? "top-right",
    gridLines: options.gridLines ?? true,
    xAxisLabel: options.xAxisLabel ?? "",
    yAxisLabel: options.yAxisLabel ?? "",
    tooltip: options.tooltip ?? true,
    animationDuration: options.animationDuration ?? 500,
    padding: options.padding ?? { top: 40, right: 20, bottom: 50, left: 55 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("HistogramChart: container not found");

  let values: number[] = [...options.values];
  let destroyed = false;

  const pad = opts.padding;
  const plotW = opts.width - pad.left! - pad.right!;
  const plotH = opts.height - pad.top! - pad.bottom!;

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `histogram-chart ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc");
  bg.setAttribute("rx", "6");
  svg.appendChild(bg);

  const gGrid = document.createElementNS(ns, "g");
  svg.appendChild(gGrid);

  const gBars = document.createElementNS(ns, "g");
  svg.appendChild(gBars);

  const gOverlays = document.createElementNS(ns, "g");
  svg.appendChild(gOverlays);

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

  container.appendChild(svg);

  // --- Rendering -----

  function render(): void {
    gGrid.innerHTML = ""; gBars.innerHTML = ""; gOverlays.innerHTML = ""; gAxes.innerHTML = "";

    if (values.length === 0) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(opts.width / 2)); empty.setAttribute("y", String(opts.height / 2));
      empty.setAttribute("text-anchor", "middle"); empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gBars.appendChild(empty);
      return;
    }

    const stats = computeStats(values);
    const binCount = opts.binWidth > 0
      ? Math.max(1, Math.ceil((stats.max - stats.min) / opts.binWidth))
      : (opts.bins > 0 ? opts.bins : autoBinCount(values));
    const bins = createBins(values, binCount);

    if (bins.length === 0) return;

    // Compute Y values based on mode
    let yMax = 0;
    const yValues: number[] = [];
    let cumulative = 0;

    for (let i = 0; i < bins.length; i++) {
      const b = bins[i]!;
      let yVal: number;
      switch (opts.mode) {
        case "density": yVal = b.density ?? 0; break;
        case "probability": yVal = b.count / values.length; break;
        case "cumulative":
          cumulative += b.count;
          yVal = cumulative;
          break;
        default: yVal = b.count;
      }
      yValues.push(yVal);
      if (yVal > yMax) yMax = yVal;
    }

    if (yMax <= 0) yMax = 1;
    yMax *= 1.08;

    const xMin = bins[0]!.x0;
    const xMax = bins[bins.length - 1]!.x1;
    const xPad = (xMax - xMin) * 0.02 || 1;

    const xScale = scaleLinear([xMin - xPad, xMax + xPad], [pad.left!, pad.left! + plotW]);
    const yScale = scaleLinear([0, yMax], [pad.top! + plotH, pad.top!]);

    const barW = (plotW / bins.length) * 0.85;

    // Grid
    if (opts.gridLines) {
      const ticks = niceTicks(0, yMax, 6);
      for (const t of ticks) {
        const pos = yScale(t);
        const gl = document.createElementNS(ns, "line");
        gl.setAttribute("x1", String(pad.left)); gl.setAttribute("y1", String(pos));
        gl.setAttribute("x2", String(pad.left! + plotW)); gl.setAttribute("y2", String(pos));
        gl.setAttribute("stroke", "#f0f0f0"); gGrid.appendChild(gl);

        const lb = document.createElementNS(ns, "text");
        lb.setAttribute("x", String(pad.left - 8)); lb.setAttribute("y", String(pos + 4));
        lb.setAttribute("text-anchor", "end"); lb.setAttribute("fill", "#6b7280");
        lb.setAttribute("font-size", "10");
        lb.textContent = opts.mode === "probability" ? `${(t * 100).toFixed(0)}%` : formatTick(t);
        gAxes.appendChild(lb);
      }
    }

    // Bars
    for (let i = 0; i < bins.length; i++) {
      const b = bins[i]!;
      const bx = xScale(b.midpoint) - barW / 2;
      const by = yScale(yValues[i]!);
      const bh = (pad.top! + plotH) - by;

      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", String(bx));
      rect.setAttribute("y", String(pad.top! + plotH)); // animate from bottom
      rect.setAttribute("width", String(barW));
      rect.setAttribute("height", "0");
      rect.setAttribute("fill", opts.color);
      rect.setAttribute("fill-opacity", String(opts.fillOpacity));
      if (opts.strokeColor) rect.setAttribute("stroke", opts.strokeColor);
      if (opts.strokeWidth) rect.setAttribute("stroke-width", String(opts.strokeWidth));
      if (opts.borderRadius) rect.setAttribute("rx", String(opts.borderRadius));
      rect.style.cursor = "pointer";

      // Animate
      requestAnimationFrame(() => {
        rect.animate(
          [{ height: "0", y: String(pad.top! + plotH) }, { height: `${bh}px`, y: `${by}px` }],
          { duration: opts.animationDuration, delay: i * 20, easing: "ease-out", fill: "forwards" }
        );
      });

      // Interactivity
      rect.addEventListener("mouseenter", () => {
        rect.setAttribute("fill-opacity", String(opts.fillOpacity + 0.2));
        showTooltip(b, yValues[i]!);
      });
      rect.addEventListener("mouseleave", () => {
        rect.setAttribute("fill-opacity", String(opts.fillOpacity));
        hideTooltip();
      });
      rect.addEventListener("click", (e) => opts.onBinClick?.(b, i, e));

      gBars.appendChild(rect);
    }

    // Normal curve
    if (opts.showNormalCurve && values.length > 2) {
      const curvePts: [number, number][] = [];
      const step = (xMax - xMin) / 100;
      let maxYDens = 0;
      for (let x = xMin; x <= xMax; x += step) {
        const dens = normalPDF(x, stats.mean, stats.stdDev);
        if (dens > maxYDens) maxYDens = dens;
        curvePts.push([x, dens]);
      }

      const curveYScale = scaleLinear([0, maxYDens * 1.05], [pad.top! + plotH, pad.top!]);
      let d = "";
      for (let i = 0; i < curvePts.length; i++) {
        const [cx, cy] = curvePts[i]!;
        const px = xScale(cx);
        const py = curveYScale(cy);
        d += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
      }

      const curvePath = document.createElementNS(ns, "path");
      curvePath.setAttribute("d", d);
      curvePath.setAttribute("fill", "none");
      curvePath.setAttribute("stroke", opts.normalCurveColor);
      curvePath.setAttribute("stroke-width", String(opts.normalCurveWidth));
      curvePath.setAttribute("stroke-dasharray", "5,3");
      gOverlays.appendChild(curvePath);
    }

    // Mean line
    if (opts.showMean) {
      const mx = xScale(stats.mean);
      const ml = document.createElementNS(ns, "line");
      ml.setAttribute("x1", String(mx)); ml.setAttribute("y1", String(pad.top));
      ml.setAttribute("x2", String(mx)); ml.setAttribute("y2", String(pad.top! + plotH));
      ml.setAttribute("stroke", "#f59e0b"); ml.setAttribute("stroke-width", "1.5");
      if (opts.meanLineStyle !== "solid") ml.setAttribute("stroke-dasharray", opts.meanLineStyle === "dotted" ? "2,3" : "6,3");
      gOverlays.appendChild(ml);

      const mLabel = document.createElementNS(ns, "text");
      mLabel.setAttribute("x", String(mx + 4)); mLabel.setAttribute("y", String(pad.top + 12));
      mLabel.setAttribute("fill", "#f59e0b"); mLabel.setAttribute("font-size", "9");
      mLabel.textContent = `\u03BC=${stats.mean.toFixed(1)}`;
      gOverlays.appendChild(mLabel);
    }

    // Median line
    if (opts.showMedian) {
      const mdx = xScale(stats.median);
      const mdl = document.createElementNS(ns, "line");
      mdl.setAttribute("x1", String(mdx)); mdl.setAttribute("y1", String(pad.top));
      mdl.setAttribute("x2", String(mdx)); mdl.setAttribute("y2", String(pad.top! + plotH));
      mdl.setAttribute("stroke", "#8b5cf6"); mdl.setAttribute("stroke-width", "1.5");
      mdl.setAttribute("stroke-dasharray", "3,3");
      gOverlays.appendChild(mdl);
    }

    // Statistics box
    if (opts.showStats && opts.statsPosition !== "hidden") {
      const statLines = [
        `n=${stats.n}`,
        `\u03BC=${stats.mean.toFixed(2)}`,
        `\u03C3=${stats.stdDev.toFixed(2)}`,
        `Med=${stats.median.toFixed(2)}`,
      ];
      const sg = document.createElementNS(ns, "g");
      const sx = opts.statsPosition.includes("right") ? opts.width - 85 : pad.left + 5;
      const sy = opts.statsPosition.includes("top") ? pad.top + 5 : pad.top! + plotH - 60;

      const sbg = document.createElementNS(ns, "rect");
      sbg.setAttribute("x", String(sx)); sbg.setAttribute("y", String(sy));
      sbg.setAttribute("width", "80"); sbg.setAttribute("height", String(statLines.length * 14 + 8));
      sbg.setAttribute("rx", "4"); sbg.setAttribute("fill", "#fff"); sbg.setAttribute("stroke", "#e5e7eb");
      sg.appendChild(sbg);

      for (let si = 0; si < statLines.length; si++) {
        const st = document.createElementNS(ns, "text");
        st.setAttribute("x", String(sx + 6)); st.setAttribute("y", String(sy + 14 + si * 14));
        st.setAttribute("fill", "#6b7280"); st.setAttribute("font-size", "9");
        st.textContent = statLines[si]!;
        sg.appendChild(st);
      }
      gOverlays.appendChild(sg);
    }

    // X-axis labels
    const xTicks = niceTicks(xMin, xMax, 8);
    for (const t of xTicks) {
      const px = xScale(t);
      const lb = document.createElementNS(ns, "text");
      lb.setAttribute("x", String(px)); lb.setAttribute("y", String(pad.top! + plotH + 18));
      lb.setAttribute("text-anchor", "middle"); lb.setAttribute("fill", "#6b7280");
      lb.setAttribute("font-size", "10"); lb.textContent = formatTick(t);
      gAxes.appendChild(lb);
    }

    // Axis titles
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

  function showTooltip(bin: Bin, yVal: number): void {
    if (!opts.tooltip) return;
    ttText.textContent = [
      `[${bin.x0.toFixed(1)}, ${bin.x1.toFixed(1)})`,
      `Count: ${bin.count}  (${(bin.count / values.length * 100).toFixed(1)}%)`,
      opts.mode === "density" ? `Density: ${(bin.density ?? 0).toFixed(4)}` : "",
    ].filter(Boolean).join("\n");
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

  const instance: HistogramInstance = {
    element: svg,

    setValues(newValues: number[]) {
      values = [...newValues];
      render();
    },

    setBins(count: number) {
      opts.bins = count;
      render();
    },

    getBins: () => {
      const bc = opts.bins > 0 ? opts.bins : autoBinCount(values);
      return createBins(values, bc);
    },

    getStats: () => computeStats(values),

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      svg.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
