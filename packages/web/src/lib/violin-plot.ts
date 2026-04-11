/**
 * Violin Plot: Kernel density estimation violin plot with inner box plot,
 * split violins for group comparison, horizontal/vertical orientation,
 * bandwidth control, and interactive tooltips.
 */

// --- Types ---

export interface ViolinData {
  /** Group/category label */
  category: string;
  /** Raw sample values */
  values: number[];
  /** Override color */
  color?: string;
}

export interface ViolinOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data: array of violin groups */
  data: ViolinData[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Orientation */
  orientation?: "vertical" | "horizontal";
  /** Violin width ratio (0-1 of available space) */
  violinWidth?: number;
  /** KDE bandwidth (auto if 0) */
  bandwidth?: number;
  /** Show inner box plot? */
  showBoxPlot?: boolean;
  /** Show mean line/dot? */
  showMean?: boolean;
  /** Show median line? */
  showMedian?: boolean;
  /** Show data points (jitter)? */
  showPoints?: boolean;
  /** Point opacity when shown */
  pointOpacity?: number;
  /** Point size (px) */
  pointSize?: number;
  /** Jitter amount (0-1) */
  jitter?: number;
  /** Color palette */
  colors?: string[];
  /** Fill opacity */
  fillOpacity?: number;
  /** Border/stroke width */
  strokeWidth?: number;
  /** Smooth curve resolution (samples per side) */
  resolution?: number;
  /** Show grid lines? */
  gridLines?: boolean;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
  /** Violin hover callback */
  onViolinHover?: (data: ViolinData, index: number) => void;
}

export interface ViolinInstance {
  element: SVGElement;
  /** Update data */
  setData: (data: ViolinData[]) => void;
  /** Set bandwidth */
  setBandwidth: (bw: number) => void;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- KDE (Kernel Density Estimation) ---

function gaussianKDE(values: number[], bandwidth: number, x: number): number {
  const n = values.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const u = (x - values[i]!) / bandwidth;
    sum += Math.exp(-0.5 * u * u);
  }
  return sum / (n * bandwidth * Math.sqrt(2 * Math.PI));
}

function silvermanBandwidth(values: number[]): number {
  const n = values.length;
  const std = Math.sqrt(
    values.reduce((s, v) => s + (v - mean(values)) ** 2, 0) / (n - 1)
  );
  const iqrVal = iqr(values);
  return 0.9 * Math.min(std, iqrVal / 1.34) * Math.pow(n, -0.2);
}

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function iqr(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const q1 = percentile(s, 25);
  const q3 = percentile(s, 75);
  return q3 - q1;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
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
  const finalStep = step * (err <= 1.5 ? 1 : err <= 3 ? 2 : err <= 7 ? 5 : 10);
  const ticks: number[] = [];
  let v = Math.ceil(min / finalStep) * finalStep;
  while (v <= max + finalStep * 0.5) { ticks.push(v); v += finalStep; }
  return ticks;
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

// --- Default Colors ---

const DEFAULT_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

// --- Main Factory ---

export function createViolinPlot(options: ViolinOptions): ViolinInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 360,
    orientation: options.orientation ?? "vertical",
    violinWidth: options.violinWidth ?? 0.7,
    bandwidth: options.bandwidth ?? 0,
    showBoxPlot: options.showBoxPlot ?? true,
    showMean: options.showMean ?? true,
    showMedian: options.showMedian ?? true,
    showPoints: options.showPoints ?? false,
    pointOpacity: options.pointOpacity ?? 0.35,
    pointSize: options.pointSize ?? 3,
    jitter: options.jitter ?? 0.3,
    colors: options.colors ?? DEFAULT_COLORS,
    fillOpacity: options.fillOpacity ?? 0.45,
    strokeWidth: options.strokeWidth ?? 1.5,
    resolution: options.resolution ?? 100,
    gridLines: options.gridLines ?? true,
    tooltip: options.tooltip ?? true,
    animationDuration: options.animationDuration ?? 400,
    padding: options.padding ?? { top: 30, right: 20, bottom: 50, left: 55 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ViolinPlot: container not found");

  let rawData: ViolinData[] = JSON.parse(JSON.stringify(options.data));
  let destroyed = false;

  const pad = opts.padding;
  const plotW = opts.width - pad.left! - pad.right!;
  const plotH = opts.height - pad.top! - pad.bottom!;
  const isVert = opts.orientation === "vertical";

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `violin-plot ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc");
  bg.setAttribute("rx", "6");
  svg.appendChild(bg);

  const gGrid = document.createElementNS(ns, "g");
  svg.appendChild(gGrid);

  const gViolins = document.createElementNS(ns, "g");
  svg.appendChild(gViolins);

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

  // --- Rendering ---

  function render(): void {
    gGrid.innerHTML = "";
    gViolins.innerHTML = "";
    gAxes.innerHTML = "";

    if (rawData.length === 0 || rawData.every(d => !d.values || d.values.length === 0)) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(opts.width / 2));
      empty.setAttribute("y", String(opts.height / 2));
      empty.setAttribute("text-anchor", "middle");
      empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gViolins.appendChild(empty);
      return;
    }

    // Global domain
    let globalMin = Infinity, globalMax = -Infinity;
    for (const d of rawData) {
      if (!d.values) continue;
      for (const v of d.values) {
        if (v < globalMin) globalMin = v;
        if (v > globalMax) globalMax = v;
      }
    }
    if (!isFinite(globalMin)) { globalMin = 0; globalMax = 100; }
    const yPad = (globalMax - globalMin) * 0.08 || 1;
    globalMin -= yPad;
    globalMax += yPad;

    const valScale = scaleLinear([globalMin, globalMax], isVert ? [pad.top! + plotH, pad.top!] : [pad.left!, pad.left! + plotW]);
    const catScale = (i: number) => isVert
      ? pad.left! + (i + 0.5) * (plotW / rawData.length)
      : pad.top! + (i + 0.5) * (plotH / rawData.length);

    const vw = isVert
      ? (plotW / rawData.length) * opts.violinWidth / 2
      : (plotH / rawData.length) * opts.violinWidth / 2;

    // Grid
    if (opts.gridLines) {
      const ticks = niceTicks(globalMin, globalMax, 6);
      for (const t of ticks) {
        const pos = valScale(t);
        const gl = document.createElementNS(ns, "line");
        if (isVert) {
          gl.setAttribute("x1", String(pad.left));
          gl.setAttribute("y1", String(pos));
          gl.setAttribute("x2", String(pad.left! + plotW));
          gl.setAttribute("y2", String(pos));
        } else {
          gl.setAttribute("x1", String(pos));
          gl.setAttribute("y1", String(pad.top));
          gl.setAttribute("x2", String(pos));
          gl.setAttribute("y2", String(pad.top! + plotH));
        }
        gl.setAttribute("stroke", "#f0f0f0");
        gGrid.appendChild(gl);
      }
    }

    // Draw each violin
    for (let i = 0; i < rawData.length; i++) {
      const d = rawData[i]!;
      if (!d.values || d.values.length === 0) continue;

      const color = d.color ?? opts.colors[i % opts.colors.length];
      const cx = catScale(i);
      const bw = opts.bandwidth || silvermanBandwidth(d.values);

      // Generate KDE curve
      const samples = opts.resolution;
      const kdeValues: number[] = [];
      let maxDensity = 0;

      for (let s = 0; s <= samples; s++) {
        const x = globalMin + (s / samples) * (globalMax - globalMin);
        const density = gaussianKDE(d.values, bw, x);
        kdeValues.push(density);
        if (density > maxDensity) maxDensity = density;
      }

      // Build path
      let pathD = "";
      const halfW = vw;

      // Top/right side (forward)
      for (let s = 0; s <= samples; s++) {
        const x = globalMin + (s / samples) * (globalMax - globalMin);
        const y = valScale(x);
        const dw = (kdeValues[s]! / (maxDensity || 1)) * halfW;
        if (s === 0) {
          if (isVert) pathD += `M ${cx + dw} ${y}`;
          else pathD += `M ${y} ${cx + dw}`;
        } else {
          if (isVert) pathD += ` L ${cx + dw} ${y}`;
          else pathD += ` L ${y} ${cx + dw}`;
        }
      }

      // Bottom/left side (reverse)
      for (let s = samples; s >= 0; s--) {
        const x = globalMin + (s / samples) * (globalMax - globalMin);
        const y = valScale(x);
        const dw = (kdeValues[s]! / (maxDensity || 1)) * halfW;
        if (isVert) pathD += ` L ${cx - dw} ${y}`;
        else pathD += ` L ${y} ${cx - dw}`;
      }
      pathD += " Z";

      // Violin path
      const violinPath = document.createElementNS(ns, "path");
      violinPath.setAttribute("d", pathD);
      violinPath.setAttribute("fill", color);
      violinPath.setAttribute("fill-opacity", String(opts.fillOpacity));
      violinPath.setAttribute("stroke", color);
      violinPath.setAttribute("stroke-width", String(opts.strokeWidth));

      const vGroup = document.createElementNS(ns, "g");
      vGroup.style.cursor = "pointer";
      vGroup.appendChild(violinPath);

      // Inner box plot
      if (opts.showBoxPlot && d.values.length > 1) {
        const sorted = [...d.values].sort((a, b) => a - b);
        const bpQ1 = percentile(sorted, 25);
        const bpMed = percentile(sorted, 50);
        const bpQ3 = percentile(sorted, 75);
        const bpIQR = bpQ3 - bpQ1;
        const lowerF = bpQ1 - 1.5 * bpIQR;
        const upperF = bpQ3 + 1.5 * bpIQR;

        let whiskerLo = sorted[0]!;
        let whiskerHi = sorted[sorted.length - 1]!;
        for (const v of sorted) { if (v >= lowerF) { whiskerLo = v; break; } }
        for (let j = sorted.length - 1; j >= 0; j--) { if (sorted[j]! <= upperF) { whiskerHi = sorted[j]!; break; } }

        const q1y = valScale(bpQ1);
        const q3y = valScale(bpQ3);
        const medY = valScale(bpMed);
        const wLoY = valScale(whiskerLo);
        const wHiY = valScale(whiskerHi);
        const innerW = vw * 0.25;

        // Box rect
        const boxRect = document.createElementNS(ns, "rect");
        if (isVert) {
          boxRect.setAttribute("x", String(cx - innerW));
          boxRect.setAttribute("y", String(q3y));
          boxRect.setAttribute("width", String(innerW * 2));
          boxRect.setAttribute("height", String(q1y - q3y));
        } else {
          boxRect.setAttribute("x", String(q1y));
          boxRect.setAttribute("y", String(cx - innerW));
          boxRect.setAttribute("width", String(q3y - q1y));
          boxRect.setAttribute("height", String(innerW * 2));
        }
        boxRect.setAttribute("fill", "#fff");
        boxRect.setAttribute("fill-opacity", "0.75");
        boxRect.setAttribute("stroke", color);
        boxRect.setAttribute("stroke-width", "1");
        vGroup.appendChild(boxRect);

        // Median line
        const medLine = document.createElementNS(ns, "line");
        if (isVert) {
          medLine.setAttribute("x1", String(cx - innerW));
          medLine.setAttribute("y1", String(medY));
          medLine.setAttribute("x2", String(cx + innerW));
          medLine.setAttribute("y2", String(medY));
        } else {
          medLine.setAttribute("x1", String(medY));
          medLine.setAttribute("y1", String(cx - innerW));
          medLine.setAttribute("x2", String(medY));
          medLine.setAttribute("y2", String(cx + innerW));
        }
        medLine.setAttribute("stroke", color);
        medLine.setAttribute("stroke-width", "1.5");
        vGroup.appendChild(medLine);

        // Whiskers
        const wLine1 = document.createElementNS(ns, "line");
        const wLine2 = document.createElementNS(ns, "line");
        if (isVert) {
          wLine1.setAttribute("x1", String(cx)); wLine1.setAttribute("y1", String(q3y));
          wLine1.setAttribute("x2", String(cx)); wLine1.setAttribute("y2", String(wHiY));
          wLine2.setAttribute("x1", String(cx)); wLine2.setAttribute("y1", String(q1y));
          wLine2.setAttribute("x2", String(cx)); wLine2.setAttribute("y2", String(wLoY));
        } else {
          wLine1.setAttribute("x1", String(q3y)); wLine1.setAttribute("y1", String(cx));
          wLine1.setAttribute("x2", String(wHiY)); wLine1.setAttribute("y2", String(cx));
          wLine2.setAttribute("x1", String(q1y)); wLine2.setAttribute("y1", String(cx));
          wLine2.setAttribute("x2", String(wLoY)); wLine2.setAttribute("y2", String(cx));
        }
        wLine1.setAttribute("stroke", color);
        wLine2.setAttribute("stroke", color);
        wLine1.setAttribute("stroke-width", "1");
        wLine2.setAttribute("stroke-width", "1");
        vGroup.appendChild(wLine1);
        vGroup.appendChild(wLine2);
      }

      // Mean indicator
      if (opts.showMean && d.values.length > 0) {
        const m = mean(d.values);
        const my = valScale(m);
        const meanLine = document.createElementNS(ns, "line");
        if (isVert) {
          meanLine.setAttribute("x1", String(cx - vw * 0.85));
          meanLine.setAttribute("y1", String(my));
          meanLine.setAttribute("x2", String(cx + vw * 0.85));
          meanLine.setAttribute("y2", String(my));
        } else {
          meanLine.setAttribute("x1", String(my));
          meanLine.setAttribute("y1", String(cx - vw * 0.85));
          meanLine.setAttribute("x2", String(my));
          meanLine.setAttribute("y2", String(cx + vw * 0.85));
        }
        meanLine.setAttribute("stroke", "#dc2626");
        meanLine.setAttribute("stroke-width", "1.5");
        meanLine.setAttribute("stroke-dasharray", "4,3");
        vGroup.appendChild(meanLine);
      }

      // Data points with jitter
      if (opts.showPoints && d.values.length > 0) {
        for (const v of d.values) {
          const py = valScale(v);
          const jx = (Math.random() - 0.5) * 2 * vw * opts.jitter;
          const pt = document.createElementNS(ns, "circle");
          pt.setAttribute("cx", String(isVert ? cx + jx : py));
          pt.setAttribute("cy", String(isVert ? py : cx + jx));
          pt.setAttribute("r", String(opts.pointSize));
          pt.setAttribute("fill", color);
          pt.setAttribute("fill-opacity", String(opts.pointOpacity));
          pt.setAttribute("stroke", "#fff");
          pt.setAttribute("stroke-width", "0.5");
          vGroup.appendChild(pt);
        }
      }

      // Interactivity
      vGroup.addEventListener("mouseenter", () => {
        violinPath.setAttribute("fill-opacity", String(opts.fillOpacity + 0.15));
        showTooltip(d);
        opts.onViolinHover?.(d, i);
      });
      vGroup.addEventListener("mouseleave", () => {
        violinPath.setAttribute("fill-opacity", String(opts.fillOpacity));
        hideTooltip();
      });

      gViolins.appendChild(vGroup);

      // Category label
      const clabel = document.createElementNS(ns, "text");
      if (isVert) {
        clabel.setAttribute("x", String(cx));
        clabel.setAttribute("y", String(pad.top! + plotH + 18));
        clabel.setAttribute("text-anchor", "middle");
      } else {
        clabel.setAttribute("x", String(pad.left! - 8));
        clabel.setAttribute("y", String(cx + 4));
        clabel.setAttribute("text-anchor", "end");
      }
      clabel.setAttribute("fill", "#374151");
      clabel.setAttribute("font-size", "11");
      clabel.textContent = d.category;
      gAxes.appendChild(clabel);
    }

    // Value axis
    drawValueAxis(globalMin, globalMax, valScale);
  }

  function drawValueAxis(minV: number, maxV: number, scale: (v: number) => number): void {
    const ticks = niceTicks(minV, maxV, 6);
    for (const t of ticks) {
      const pos = scale(t);
      const tk = document.createElementNS(ns, "line");
      const lb = document.createElementNS(ns, "text");

      if (isVert) {
        tk.setAttribute("x1", String(pad.left - 5));
        tk.setAttribute("y1", String(pos));
        tk.setAttribute("x2", String(pad.left));
        tk.setAttribute("y2", String(pos));
        lb.setAttribute("x", String(pad.left - 8));
        lb.setAttribute("y", String(pos + 4));
        lb.setAttribute("text-anchor", "end");
      } else {
        tk.setAttribute("x1", String(pos));
        tk.setAttribute("y1", String(pad.top! + plotH));
        tk.setAttribute("x2", String(pos));
        tk.setAttribute("y2", String(pad.top! + plotH + 5));
        lb.setAttribute("x", String(pos));
        lb.setAttribute("y", String(pad.top! + plotH + 18));
        lb.setAttribute("text-anchor", "middle");
      }

      tk.setAttribute("stroke", "#d1d5db");
      lb.setAttribute("fill", "#6b7280");
      lb.setAttribute("font-size", "10");
      lb.textContent = formatTick(t);
      gAxes.appendChild(tk);
      gAxes.appendChild(lb);
    }
  }

  function showTooltip(data: ViolinData): void {
    if (!opts.tooltip || !data.values) return;
    const sorted = [...data.values].sort((a, b) => a - b);
    const m = mean(data.values);
    const med = percentile(sorted, 50);
    const q1 = percentile(sorted, 25);
    const q3 = percentile(sorted, 75);

    ttText.textContent = [
      data.category,
      `n=${data.values.length}`,
      `Mean: ${m.toFixed(2)}  Median: ${med.toFixed(2)}`,
      `Range: [${data.values[0]?.toFixed(1)}, ${data.values[data.values.length - 1]?.toFixed(1)}]`,
    ].join("\n");
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

  const instance: ViolinInstance = {
    element: svg,

    setData(newData: ViolinData[]) {
      rawData = newData.map(d => ({ ...d, values: [...(d.values ?? [])] }));
      render();
    },

    setBandwidth(bw: number) {
      opts.bandwidth = bw;
      render();
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
