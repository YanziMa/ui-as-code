/**
 * Box Plot: Statistical box-and-whisker chart with quartile computation,
 * outlier detection (IQR method), multiple groups, horizontal/vertical
 * orientation, mean marker, notch display, and interactive tooltips.
 */

// --- Types ---

export interface BoxData {
  /** Category/group label */
  category: string;
  /** Raw values (will compute stats automatically) */
  values?: number[];
  /** Pre-computed stats (overrides values if provided) */
  min?: number;
  q1?: number;
  median?: number;
  q3?: number;
  max?: number;
  mean?: number;
  /** Outlier values */
  outliers?: number[];
  color?: string;
}

export interface BoxPlotOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data: array of box data */
  data: BoxData[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Orientation */
  orientation?: "vertical" | "horizontal";
  /** Box width ratio (0-1 of available space) */
  boxWidth?: number;
  /** Show mean dot? */
  showMean?: boolean;
  /** Show notches (median CI)? */
  notched?: boolean;
  /** Notch size (ratio of IQR) */
  notchSize?: number;
  /** Whisker style ("line" | "cap" | "range") */
  whiskerStyle?: string;
  /** Outlier shape ("circle" | "diamond" | "cross") */
  outlierShape?: string;
  /** Outlier size (px) */
  outlierSize?: number;
  /** Color palette */
  colors?: string[];
  /** Show grid lines? */
  gridLines?: boolean;
  /** Axis title */
  axisTitle?: string;
  /** Value axis title */
  valueTitle?: string;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
  /** Box click callback */
  onBoxClick?: (data: BoxData, index: number, event: MouseEvent) => void;
}

export interface BoxPlotInstance {
  element: SVGElement;
  /** Update data */
  setData: (data: BoxData[]) => void;
  /** Get computed statistics for a group */
  getStats: (index: number) => Required<BoxData>;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Statistics ---

function computeStats(values: number[]): { min: number; q1: number; median: number; q3: number; max: number; mean: number; outliers: number[] } {
  if (values.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0, mean: 0, outliers: [] };

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const min = sorted[0]!;
  const max = sorted[n - 1]!;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;

  function percentile(arr: number[], p: number): number {
    const idx = (p / 100) * (arr.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return arr[lo]!;
    return arr[lo]! + (arr[hi]! - arr[lo]!) * (idx - lo);
  }

  const q1 = percentile(sorted, 25);
  const median = percentile(sorted, 50);
  const q3 = percentile(sorted, 75);

  // Outliers via IQR
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  let whiskerMin = min;
  let whiskerMax = max;
  const outliers: number[] = [];
  for (const v of sorted) {
    if (v < lowerFence) outliers.push(v);
    else if (v > upperFence) outliers.push(v);
  }
  // Adjust whiskers to last non-outlier
  for (const v of sorted) { if (v >= lowerFence) { whiskerMin = v; break; } }
  for (let i = n - 1; i >= 0; i--) { if (sorted[i]! <= upperFence) { whiskerMax = sorted[i]!; break; } }

  return { min: whiskerMin, q1, median, q3, max: whiskerMax, mean, outliers };
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
  while (v <= max + finalStep * 0.5) {
    ticks.push(v);
    v += finalStep;
  }
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

export function createBoxPlot(options: BoxPlotOptions): BoxPlotInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 350,
    orientation: options.orientation ?? "vertical",
    boxWidth: options.boxWidth ?? 0.6,
    showMean: options.showMean ?? true,
    notched: options.notched ?? false,
    notchSize: options.notchSize ?? 0.2,
    whiskerStyle: options.whiskerStyle ?? "cap",
    outlierShape: options.outlierShape ?? "circle",
    outlierSize: options.outlierSize ?? 6,
    colors: options.colors ?? DEFAULT_COLORS,
    gridLines: options.gridLines ?? true,
    axisTitle: options.axisTitle ?? "",
    valueTitle: options.valueTitle ?? "",
    tooltip: options.tooltip ?? true,
    animationDuration: options.animationDuration ?? 400,
    padding: options.padding ?? { top: 30, right: 20, bottom: 50, left: 55 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("BoxPlot: container not found");

  let rawData: BoxData[] = JSON.parse(JSON.stringify(options.data));
  let destroyed = false;

  const pad = opts.padding;
  const plotW = opts.width - pad.left! - pad.right!;
  const plotH = opts.height - pad.top! - pad.bottom!;
  const isVert = opts.orientation === "vertical";

  // SVG setup
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `box-plot ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  // Background
  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc");
  bg.setAttribute("rx", "6");
  svg.appendChild(bg);

  const gGrid = document.createElementNS(ns, "g");
  svg.appendChild(gGrid);

  const gBoxes = document.createElementNS(ns, "g");
  svg.appendChild(gBoxes);

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
    gBoxes.innerHTML = "";
    gAxes.innerHTML = "";

    if (rawData.length === 0) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(opts.width / 2));
      empty.setAttribute("y", String(opts.height / 2));
      empty.setAttribute("text-anchor", "middle");
      empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gBoxes.appendChild(empty);
      return;
    }

    // Compute stats for each group
    const computed: (BoxData & { _stats: NonNullable<BoxData["values"]> extends number[] ? ReturnType<typeof computeStats> : never })[] = [];
    let globalMin = Infinity, globalMax = -Infinity;

    for (const d of rawData) {
      let stats: ReturnType<typeof computeStats>;
      if (d.values && d.values.length > 0 && d.min == null) {
        stats = computeStats(d.values);
        computed.push({ ...d, min: stats.min, q1: stats.q1, median: stats.median, q3: stats.q3, max: stats.max, mean: stats.mean, outliers: stats.outliers, _stats: stats as any });
      } else {
        stats = computeStats(d.values ?? []);
        computed.push({
          ...d,
          min: d.min ?? stats.min,
          q1: d.q1 ?? stats.q1,
          median: d.median ?? stats.median,
          q3: d.q3 ?? stats.q3,
          max: d.max ?? stats.max,
          mean: d.mean ?? stats.mean,
          outliers: d.outliers ?? [],
          _stats: stats as any,
        });
      }

      globalMin = Math.min(globalMin, d.min ?? stats.min, ...(d.outliers ?? []));
      globalMax = Math.max(globalMax, d.max ?? stats.max, ...(d.outliers ?? []));
    }

    if (!isFinite(globalMin)) { globalMin = 0; globalMax = 100; }
    const yPad = (globalMax - globalMin) * 0.08 || 1;
    globalMin -= yPad;
    globalMax += yPad;

    const valScale = scaleLinear([globalMin, globalMax], isVert ? [pad.top! + plotH, pad.top!] : [pad.left!, pad.left! + plotW]);
    const catScale = (i: number) => isVert
      ? pad.left! + (i + 0.5) * (plotW / rawData.length)
      : pad.top! + (i + 0.5) * (plotH / rawData.length);

    const bw = isVert
      ? (plotW / rawData.length) * opts.boxWidth
      : (plotH / rawData.length) * opts.boxWidth;

    // Grid lines
    if (opts.gridLines) {
      const ticks = niceTicks(globalMin, globalMax, 6);
      for (const t of ticks) {
        const pos = valScale(t);
        const line = document.createElementNS(ns, "line");
        if (isVert) {
          line.setAttribute("x1", String(pad.left));
          line.setAttribute("y1", String(pos));
          line.setAttribute("x2", String(pad.left! + plotW));
          line.setAttribute("y2", String(pos));
        } else {
          line.setAttribute("x1", String(pos));
          line.setAttribute("y1", String(pad.top));
          line.setAttribute("x2", String(pos));
          line.setAttribute("y2", String(pad.top! + plotH));
        }
        line.setAttribute("stroke", "#f0f0f0");
        line.setAttribute("stroke-width", "1");
        gGrid.appendChild(line);
      }
    }

    // Draw boxes
    for (let i = 0; i < computed.length; i++) {
      const d = computed[i]!;
      const color = d.color ?? opts.colors[i % opts.colors.length];
      const cx = catScale(i);

      // Box body
      const boxGroup = document.createElementNS(ns, "g");
      boxGroup.style.cursor = "pointer";

      const q1Pos = valScale(d.q1!);
      const q3Pos = valScale(d.q3!);
      const medPos = valScale(d.median!);
      const minPos = valScale(d.min!);
      const maxPos = valScale(d.max!);

      let boxEl: SVGElement;
      if (isVert) {
        if (opts.notched) {
          const notchH = (q3Pos - q1Pos) * opts.notchSize;
          const notchW = bw * 0.35;
          boxEl = document.createElementNS(ns, "path");
          boxEl.setAttribute("d",
            `M ${cx - bw / 2} ${q1Pos}` +
            ` L ${cx - notchW} ${q1Pos} L ${cx} ${medPos - notchH} L ${cx + notchW} ${q1Pos}` +
            ` L ${cx + bw / 2} ${q1Pos} L ${cx + bw / 2} ${q3Pos}` +
            ` L ${cx + notchW} ${q3Pos} L ${cx} ${medPos + notchH} L ${cx - notchW} ${q3Pos}` +
            ` L ${cx - bw / 2} ${q3Pos} Z`
          );
        } else {
          boxEl = document.createElementNS(ns, "rect");
          boxEl.setAttribute("x", String(cx - bw / 2));
          boxEl.setAttribute("y", String(q3Pos)); // SVG y increases downward
          boxEl.setAttribute("width", String(bw));
          boxEl.setAttribute("height", String(q1Pos - q3Pos));
        }
      } else {
        if (opts.notched) {
          const notchW = (q3Pos - q1Pos) * opts.notchSize;
          const notchH = bw * 0.35;
          boxEl = document.createElementNS(ns, "path");
          boxEl.setAttribute("d",
            `M ${q1Pos} ${cy - bw / 2}` +
            ` L ${q1Pos} ${cy - notchH} L ${medPos - notchW} ${cy} L ${q1Pos} ${cy + notchH}` +
            ` L ${q1Pos} ${cy + bw / 2} L ${q3Pos} ${cy + bw / 2}` +
            ` L ${q3Pos} ${cy + notchH} L ${medPos + notchW} ${cy} L ${q3Pos} ${cy - notchH}` +
            ` L ${q3Pos} ${cy - bw / 2} Z`
          );
        } else {
          boxEl = document.createElementNS(ns, "rect");
          boxEl.setAttribute("x", String(q1Pos));
          boxEl.setAttribute("y", String(cx - bw / 2));
          boxEl.setAttribute("width", String(q3Pos - q1Pos));
          boxEl.setAttribute("height", String(bw));
        }
      }

      boxEl.setAttribute("fill", color);
      boxEl.setAttribute("fill-opacity", "0.65");
      boxEl.setAttribute("stroke", color);
      boxEl.setAttribute("stroke-width", "1.5");
      boxGroup.appendChild(boxEl);

      // Median line
      const medLine = document.createElementNS(ns, "line");
      if (isVert) {
        medLine.setAttribute("x1", String(cx - bw / 2));
        medLine.setAttribute("y1", String(medPos));
        medLine.setAttribute("x2", String(cx + bw / 2));
        medLine.setAttribute("y2", String(medPos));
      } else {
        medLine.setAttribute("x1", String(medPos));
        medLine.setAttribute("y1", String(cx - bw / 2));
        medLine.setAttribute("x2", String(medPos));
        medLine.setAttribute("y2", String(cx + bw / 2));
      }
      medLine.setAttribute("stroke", "#fff");
      medLine.setAttribute("stroke-width", "2.5");
      boxGroup.appendChild(medLine);

      // Mean dot
      if (opts.showMean && d.mean != null) {
        const meanPos = valScale(d.mean);
        const meanDot = document.createElementNS(ns, "circle");
        meanDot.setAttribute("cx", String(isVert ? cx : meanPos));
        meanDot.setAttribute("cy", String(isVert ? meanPos : cx));
        meanDot.setAttribute("r", "4");
        meanDot.setAttribute("fill", "#ef4444");
        meanDot.setAttribute("stroke", "#fff");
        meanDot.setAttribute("stroke-width", "1.5");
        boxGroup.appendChild(meanDot);
      }

      // Whiskers
      if (opts.whiskerStyle !== "range") {
        // Left/bottom whisker
        const w1 = document.createElementNS(ns, "line");
        if (isVert) {
          w1.setAttribute("x1", String(cx));
          w1.setAttribute("y1", String(q1Pos));
          w1.setAttribute("x2", String(cx));
          w1.setAttribute("y2", String(minPos));
        } else {
          w1.setAttribute("x1", String(q1Pos));
          w1.setAttribute("y1", String(cx));
          w1.setAttribute("x2", String(minPos));
          w1.setAttribute("y2", String(cx));
        }
        w1.setAttribute("stroke", color);
        w1.setAttribute("stroke-width", "1.5");
        boxGroup.appendChild(w1);

        // Right/top whisker
        const w2 = document.createElementNS(ns, "line");
        if (isVert) {
          w2.setAttribute("x1", String(cx));
          w2.setAttribute("y1", String(q3Pos));
          w2.setAttribute("x2", String(cx));
          w2.setAttribute("y2", String(maxPos));
        } else {
          w2.setAttribute("x1", String(q3Pos));
          w2.setAttribute("y1", String(cx));
          w2.setAttribute("x2", String(maxPos));
          w2.setAttribute("y2", String(cx));
        }
        w2.setAttribute("stroke", color);
        w2.setAttribute("stroke-width", "1.5");
        boxGroup.appendChild(w2);

        // Caps
        if (opts.whiskerStyle === "cap") {
          const capLen = bw * 0.3;
          const cap1 = document.createElementNS(ns, "line");
          const cap2 = document.createElementNS(ns, "line");
          if (isVert) {
            cap1.setAttribute("x1", String(cx - capLen));
            cap1.setAttribute("y1", String(minPos));
            cap1.setAttribute("x2", String(cx + capLen));
            cap1.setAttribute("y2", String(minPos));
            cap2.setAttribute("x1", String(cx - capLen));
            cap2.setAttribute("y1", String(maxPos));
            cap2.setAttribute("x2", String(cx + capLen));
            cap2.setAttribute("y2", String(maxPos));
          } else {
            cap1.setAttribute("x1", String(minPos));
            cap1.setAttribute("y1", String(cx - capLen));
            cap1.setAttribute("x2", String(minPos));
            cap1.setAttribute("y2", String(cx + capLen));
            cap2.setAttribute("x1", String(maxPos));
            cap2.setAttribute("y1", String(cx - capLen));
            cap2.setAttribute("x2", String(maxPos));
            cap2.setAttribute("y2", String(cx + capLen));
          }
          cap1.setAttribute("stroke", color);
          cap1.setAttribute("stroke-width", "1.5");
          cap2.setAttribute("stroke", color);
          cap2.setAttribute("stroke-width", "1.5");
          boxGroup.appendChild(cap1);
          boxGroup.appendChild(cap2);
        }
      }

      // Range line (alternative to whiskers)
      if (opts.whiskerStyle === "range") {
        const rangeLine = document.createElementNS(ns, "line");
        if (isVert) {
          rangeLine.setAttribute("x1", String(cx));
          rangeLine.setAttribute("y1", String(minPos));
          rangeLine.setAttribute("x2", String(cx));
          rangeLine.setAttribute("y2", String(maxPos));
        } else {
          rangeLine.setAttribute("x1", String(minPos));
          rangeLine.setAttribute("y1", String(cx));
          rangeLine.setAttribute("x2", String(maxPos));
          rangeLine.setAttribute("y2", String(cx));
        }
        rangeLine.setAttribute("stroke", color);
        rangeLine.setAttribute("stroke-width", "1");
        rangeLine.setAttribute("opacity", "0.4");
        boxGroup.appendChild(rangeLine);
      }

      // Outliers
      if (d.outliers && d.outliers.length > 0) {
        for (const ov of d.outliers) {
          const oPos = valScale(ov);
          const os = opts.outlierSize;
          let outlierEl: SVGElement;

          switch (opts.outlierShape) {
            case "diamond":
              outlierEl = document.createElementNS(ns, "polygon");
              outlierEl.setAttribute("points",
                `${isVert ? cx : oPos},${isVert ? oPos + os : cx - os} ` +
                `${isVert ? cx + os : oPos},${isVert ? oPos : cx} ` +
                `${isVert ? cx : oPos},${isVert ? oPos - os : cx + os}`
              );
              break;
            case "cross":
              outlierEl = document.createElementNS(ns, "path");
              outlierEl.setAttribute("d",
                `M ${isVert ? cx - os : oPos} ${isVert ? oPos : cx - os} L ${isVert ? cx + os : oPos} ${isVert ? oPos : cx + os} ` +
                `M ${isVert ? cx + os : oPos} ${isVert ? oPos : cx - os} L ${isVert ? cx - os : oPos} ${isVert ? oPos : cx + os}`
              );
              break;
            default:
              outlierEl = document.createElementNS(ns, "circle");
              outlierEl.setAttribute("cx", String(isVert ? cx : oPos));
              outlierEl.setAttribute("cy", String(isVert ? oPos : cx));
              outlierEl.setAttribute("r", String(os / 2));
          }

          outlierEl.setAttribute("fill", "none");
          outlierEl.setAttribute("stroke", color);
          outlierEl.setAttribute("stroke-width", "1.5");
          boxGroup.appendChild(outlierEl);
        }
      }

      // Interactivity
      boxGroup.addEventListener("mouseenter", () => {
        boxEl?.setAttribute("fill-opacity", "0.85");
        showTooltip(d);
      });
      boxGroup.addEventListener("mouseleave", () => {
        boxEl?.setAttribute("fill-opacity", "0.65");
        hideTooltip();
      });
      boxGroup.addEventListener("click", (e) => opts.onBoxClick?.(d, i, e));

      gBoxes.appendChild(boxGroup);

      // Category labels
      const catLabel = document.createElementNS(ns, "text");
      if (isVert) {
        catLabel.setAttribute("x", String(cx));
        catLabel.setAttribute("y", String(pad.top! + plotH + 18));
        catLabel.setAttribute("text-anchor", "middle");
      } else {
        catLabel.setAttribute("x", String(pad.left! - 8));
        catLabel.setAttribute("y", String(cx + 4));
        catLabel.setAttribute("text-anchor", "end");
      }
      catLabel.setAttribute("fill", "#374151");
      catLabel.setAttribute("font-size", "11");
      catLabel.textContent = d.category;
      gAxes.appendChild(catLabel);
    }

    // Value axis
    drawValueAxis(globalMin, globalMax, valScale);
  }

  var cy: number = 0; // used in horizontal mode

  function drawValueAxis(minV: number, maxV: number, scale: (v: number) => number): void {
    const ticks = niceTicks(minV, maxV, 6);
    for (const t of ticks) {
      const pos = scale(t);
      const tick = document.createElementNS(ns, "line");
      const label = document.createElementNS(ns, "text");

      if (isVert) {
        tick.setAttribute("x1", String(pad.left - 5));
        tick.setAttribute("y1", String(pos));
        tick.setAttribute("x2", String(pad.left));
        tick.setAttribute("y2", String(pos));
        label.setAttribute("x", String(pad.left - 8));
        label.setAttribute("y", String(pos + 4));
        label.setAttribute("text-anchor", "end");
      } else {
        tick.setAttribute("x1", String(pos));
        tick.setAttribute("y1", String(pad.top! + plotH));
        tick.setAttribute("x2", String(pos));
        tick.setAttribute("y2", String(pad.top! + plotH + 5));
        label.setAttribute("x", String(pos));
        label.setAttribute("y", String(pad.top! + plotH + 18));
        label.setAttribute("text-anchor", "middle");
      }

      tick.setAttribute("stroke", "#d1d5db");
      label.setAttribute("fill", "#6b7280");
      label.setAttribute("font-size", "10");
      label.textContent = formatTick(t);

      gAxes.appendChild(tick);
      gAxes.appendChild(label);
    }

    // Axis title
    const title = isVert ? opts.valueTitle : opts.axisTitle;
    if (title) {
      const tl = document.createElementNS(ns, "text");
      if (isVert) {
        tl.setAttribute("x", String(14));
        tl.setAttribute("y", String(pad.top! + plotH / 2));
        tl.setAttribute("transform", `rotate(-90, 14, ${pad.top! + plotH / 2})`);
      } else {
        tl.setAttribute("x", String(pad.left! + plotW / 2));
        tl.setAttribute("y", String(opts.height - 6));
      }
      tl.setAttribute("text-anchor", "middle");
      tl.setAttribute("fill", "#6b7280");
      tl.setAttribute("font-size", "11");
      tl.textContent = title;
      gAxes.appendChild(tl);
    }
  }

  function showTooltip(data: BoxData): void {
    if (!opts.tooltip) return;
    const lines = [
      data.category,
      `Min: ${formatTick(data.min ?? 0)}  Q1: ${formatTick(data.q1 ?? 0)}`,
      `Med: ${formatTick(data.median ?? 0)}  Q3: ${formatTick(data.q3 ?? 0)}`,
      `Max: ${formatTick(data.max ?? 0)}`,
    ];
    if (data.mean != null) lines.push(`Mean: ${formatTick(data.mean)}`);
    if (data.outliers?.length) lines.push(`Outliers: ${data.outliers.length}`);

    ttText.textContent = lines.join("\n");
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

  const instance: BoxPlotInstance = {
    element: svg,

    setData(newData: BoxData[]) {
      rawData = newData.map(d => ({ ...d }));
      render();
    },

    getStats(index: number) {
      const d = rawData[index];
      if (!d || !d.values) throw new Error(`No data at index ${index}`);
      return computeStats(d.values) as any;
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
