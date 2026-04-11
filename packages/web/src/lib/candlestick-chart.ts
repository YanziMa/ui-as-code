/**
 * Candlestick Chart: Financial OHLC candlestick chart with volume bars,
 * moving averages, crosshair tooltip, zoom/pan, date axis, up/down
 * coloring, wick styles, and interactive data inspection.
 */

// --- Types ---

export interface OHLCData {
  /** Date/time label or timestamp */
  date: string;
  /** Open price */
  open: number;
  /** High price */
  high: number;
  /** Low price */
  low: number;
  /** Close price */
  close: number;
  /** Volume (optional) */
  volume?: number;
  /** Custom data */
  metadata?: Record<string, unknown>;
}

export interface MovingAverageConfig {
  /** Period (e.g., 20 for 20-day MA) */
  period: number;
  /** Line color */
  color?: string;
  /** Line width */
  width?: number;
  /** Label (e.g., "MA20") */
  label?: string;
  /** Dashed? */
  dashed?: boolean;
}

export interface CandlestickOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** OHLC data (sorted by date ascending) */
  data: OHLCData[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Up candle color (close >= open) */
  upColor?: string;
  /** Down candle color (close < open) */
  downColor?: string;
  /** Wick color */
  wickColor?: string;
  /** Candle body width ratio (0-1 of available space) */
  bodyRatio?: number;
  /** Show volume bars? */
  showVolume?: string;
  /** Volume bar height ratio (0-1 of main chart) */
  volumeRatio?: number;
  /** Volume up/down colors */
  volumeUpColor?: string;
  volumeDownColor?: string;
  /** Moving average lines */
  movingAverages?: MovingAverageConfig[];
  /** Show crosshair on hover? */
  crosshair?: boolean;
  /** Show grid lines? */
  gridLines?: boolean;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Date format for x-axis */
  dateFormat?: string;
  /** Price decimals */
  decimals?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
  /** Candle hover callback */
  onCandleHover?: (data: OHLCData, index: number) => void;
  /** Candle click callback */
  onCandleClick?: (data: OHLCData, index: number, event: MouseEvent) => void;
}

export interface CandlestickInstance {
  element: SVGElement;
  /** Update data */
  setData: (data: OHLCData[]) => void;
  /** Set moving averages */
  setMovingAverages: (configs: MovingAverageConfig[]) => void;
  /** Zoom to range [startIndex, endIndex] */
  setZoom: (start: number, end: number) => void;
  /** Reset zoom */
  resetZoom: () => void;
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

function bandScale(count: number, range: [number, number], padding: number = 0.15): (i: number) => {
  const step = (range[1] - range[0]) / count;
  const pad = step * padding;
  return (i: number) => range[0] + i * step + pad + (step - 2 * pad) / 2;
};

function niceTicks(min: number, max: number, count: number): { value: number; label: string }[] {
  const span = max - min;
  if (span <= 0) return [{ value: min, label: formatPrice(min, 2) }];
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = count / (span / step);
  const fs = step * (err <= 1.5 ? 1 : err <= 3 ? 2 : err <= 7 ? 5 : 10);
  const result: { value: number; label: string }[] = [];
  let v = Math.floor(min / fs) * fs;
  while (v <= max + fs * 0.5) {
    result.push({ value: v, label: formatPrice(v, 2) });
    v += fs;
  }
  return result;
}

function formatPrice(v: number, dec: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 1000).toFixed(1)}K`;
  if (dec > 0) return v.toFixed(dec);
  return v.toLocaleString();
}

function computeMA(data: OHLCData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i]!.close;
    if (i < period - 1) {
      result.push(null);
    } else {
      if (i >= period) sum -= data[i - period]!.close;
      result.push(sum / period);
    }
  }
  return result;
}

// --- Main Factory ---

export function createCandlestickChart(options: CandlestickOptions): CandlestickInstance {
  const opts = {
    width: options.width ?? 700,
    height: options.height ?? 420,
    upColor: options.upColor ?? "#22c55e",
    downColor: options.downColor ?? "#ef4444",
    wickColor: options.wickColor ?? "#6b7280",
    bodyRatio: options.bodyRatio ?? 0.7,
    showVolume: options.showVolume ?? "bottom",
    volumeRatio: options.volumeRatio ?? 0.2,
    volumeUpColor: options.volumeUpColor ?? "rgba(34,197,94,0.5)",
    volumeDownColor: options.volumeDownColor ?? "rgba(239,68,68,0.5)",
    movingAverages: options.movingAverages ?? [],
    crosshair: options.crosshair ?? true,
    gridLines: options.gridLines ?? true,
    tooltip: options.tooltip ?? true,
    decimals: options.decimals ?? 2,
    animationDuration: options.animationDuration ?? 400,
    padding: options.padding ?? { top: 10, right: 70, bottom: 30, left: 10 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CandlestickChart: container not found");

  let data: OHLCData[] = JSON.parse(JSON.stringify(options.data));
  let destroyed = false;
  let zoomStart = 0;
  let zoomEnd = data.length;

  const pad = opts.padding;
  const hasVolume = opts.showVolume !== "none" && data.some(d => d.volume != null && d.volume > 0);
  const volH = hasVolume ? opts.height * opts.volumeRatio : 0;
  const mainH = opts.height - volH;
  const plotW = opts.width - pad.left! - pad.right!;
  const mainPlotH = mainH - pad.top! - (hasVolume ? 8 : pad.bottom!);

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `candlestick-chart ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc");
  svg.appendChild(bg);

  const gGrid = document.createElementNS(ns, "g");
  svg.appendChild(gGrid);

  const gVolume = document.createElementNS(ns, "g");
  svg.appendChild(gVolume);

  const gWicks = document.createElementNS(ns, "g");
  svg.appendChild(gWicks);

  const gBodies = document.createElementNS(ns, "g");
  svg.appendChild(gBodies);

  const gMA = document.createElementNS(ns, "g");
  svg.appendChild(gMA);

  const gCrosshair = document.createElementNS(ns, "g");
  gCrosshair.style.display = "none";
  gCrosshair.style.pointerEvents = "none";
  svg.appendChild(gCrosshair);

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
  ttBg.setAttribute("opacity", "0.92");
  gTooltip.appendChild(ttBg);

  const ttText = document.createElementNS(ns, "text");
  ttText.setAttribute("fill", "#fff");
  ttText.setAttribute("font-size", "11");
  gTooltip.appendChild(ttText);

  container.appendChild(svg);

  // --- Rendering ---

  function render(): void {
    gGrid.innerHTML = "";
    gVolume.innerHTML = "";
    gWicks.innerHTML = "";
    gBodies.innerHTML = "";
    gMA.innerHTML = "";
    gAxes.innerHTML = "";

    if (data.length === 0) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(opts.width / 2));
      empty.setAttribute("y", String(mainH / 2));
      empty.setAttribute("text-anchor", "middle");
      empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gBodies.appendChild(empty);
      return;
    }

    const visible = data.slice(zoomStart, zoomEnd);
    if (visible.length === 0) return;

    // Price domain
    let lo = Infinity, hi = -Infinity;
    for (const d of visible) {
      if (d.low < lo) lo = d.low;
      if (d.high > hi) hi = d.high;
    }
    if (!isFinite(lo)) lo = 0;
    if (!isFinite(hi)) hi = 100;
    const pPad = (hi - lo) * 0.04 || 1;
    lo -= pPad; hi += pPad;

    const xScale = bandScale(visible.length, [pad.left!, pad.left! + plotW], 0.25);
    const yScale = scaleLinear([lo, hi], [pad.top! + mainPlotH, pad.top!]);

    // Grid & Y-axis labels
    if (opts.gridLines) {
      const ticks = niceTicks(lo, hi, 6);
      for (const t of ticks) {
        const pos = yScale(t.value);
        const gl = document.createElementNS(ns, "line");
        gl.setAttribute("x1", String(pad.left)); gl.setAttribute("y1", String(pos));
        gl.setAttribute("x2", String(pad.left! + plotW)); gl.setAttribute("y2", String(pos));
        gl.setAttribute("stroke", "#f0f0f0"); gl.setAttribute("stroke-width", "1");
        gGrid.appendChild(gl);

        const lb = document.createElementNS(ns, "text");
        lb.setAttribute("x", String(pad.left! + plotW + 4)); lb.setAttribute("y", String(pos + 3));
        lb.setAttribute("fill", "#6b7280"); lb.setAttribute("font-size", "9");
        lb.textContent = t.label;
        gAxes.appendChild(lb);
      }
    }

    // X-axis labels (show subset)
    const labelStep = Math.max(1, Math.ceil(visible.length / 8));
    for (let i = 0; i < visible.length; i += labelStep) {
      const px = xScale(i);
      const lb = document.createElementNS(ns, "text");
      lb.setAttribute("x", String(px)); lb.setAttribute("y", String(opts.height - 6));
      lb.setAttribute("text-anchor", "middle"); lb.setAttribute("fill", "#6b7280");
      lb.setAttribute("font-size", "9");
      lb.textContent = visible[i]!.date.length > 10 ? visible[i]!.date.slice(5) : visible[i]!.date;
      gAxes.appendChild(lb);
    }

    // Volume bars
    if (hasVolume) {
      let vMax = 0;
      for (const d of visible) { if ((d.volume ?? 0) > vMax) vMax = d.volume!; }
      const volYScale = scaleLinear([0, vMax], [mainH + volH - 4, mainH + 4]);
      const volBarW = (plotW / visible.length) * 0.6;

      for (let i = 0; i < visible.length; i++) {
        const d = visible[i]!;
        if (d.volume == null || d.volume <= 0) continue;
        const px = xScale(i);
        const isUp = d.close >= d.open;
        const vh = (d.volume / vMax) * (volH - 8);
        const vb = document.createElementNS(ns, "rect");
        vb.setAttribute("x", String(px - volBarW / 2));
        vb.setAttribute("y", String(volYScale(0) - vh));
        vb.setAttribute("width", String(volBarW));
        vb.setAttribute("vh", String(vh)); // fix below
        vb.setAttribute("height", String(vh));
        vb.setAttribute("fill", isUp ? opts.volumeUpColor : opts.volumeDownColor);
        gVolume.appendChild(vb);
      }
    }

    // Candlesticks
    const bodyW = (plotW / visible.length) * opts.bodyRatio;

    for (let i = 0; i < visible.length; i++) {
      const d = visible[i]!;
      const px = xScale(i);
      const isUp = d.close >= d.open;
      const color = isUp ? opts.upColor : opts.downColor;

      // Wick
      const wick = document.createElementNS(ns, "line");
      wick.setAttribute("x1", String(px));
      wick.setAttribute("y1", String(yScale(d.high)));
      wick.setAttribute("x2", String(px));
      wick.setAttribute("y2", String(yScale(d.low)));
      wick.setAttribute("stroke", opts.wickColor);
      wick.setAttribute("stroke-width", "1");
      gWicks.appendChild(wick);

      // Body
      const bodyTop = yScale(Math.max(d.open, d.close));
      const bodyBottom = yScale(Math.min(d.open, d.close));
      const bodyH = Math.abs(bodyBottom - bodyTop);
      const body = document.createElementNS(ns, "rect");
      body.setAttribute("x", String(px - bodyW / 2));
      body.setAttribute("y", String(bodyTop));
      body.setAttribute("width", String(Math.max(bodyW, 1)));
      body.setAttribute("height", String(Math.max(bodyH, 1)));
      body.setAttribute("fill", color);
      body.style.cursor = "crosshair";

      body.addEventListener("mouseenter", () => {
        body.setAttribute("opacity", "0.8");
        showCrosshair(px, d);
        showTooltip(d);
        opts.onCandleHover?.(d, zoomStart + i);
      });
      body.addEventListener("mouseleave", () => {
        body.removeAttribute("opacity");
        hideCrosshair();
        hideTooltip();
      });
      body.addEventListener("click", (e) => opts.onCandleClick?.(d, zoomStart + i, e));

      gBodies.appendChild(body);
    }

    // Moving averages
    for (const ma of opts.movingAverages) {
      const maValues = computeMA(data, ma.period);
      const maColor = ma.color ?? "#8b5cf6";
      let dStr = "";
      let started = false;

      for (let i = 0; i < visible.length; i++) {
        const globalIdx = zoomStart + i;
        const val = maValues[globalIdx];
        if (val == null) continue;
        const px = xScale(i);
        const py = yScale(val);
        if (!started) { dStr += `M ${px} ${py}`; started = true; }
        else { dStr += ` L ${px} ${py}`; }
      }

      if (dStr) {
        const maLine = document.createElementNS(ns, "path");
        maLine.setAttribute("d", dStr);
        maLine.setAttribute("fill", "none");
        maLine.setAttribute("stroke", maColor);
        maLine.setAttribute("stroke-width", String(ma.width ?? 1.2));
        if (ma.dashed) maLine.setAttribute("stroke-dasharray", "4,3");

        // Label at end
        if (ma.label && visible.length > 0) {
          const lastI = visible.length - 1;
          const lastVal = maValues[zoomStart + lastI];
          if (lastVal != null) {
            const lbl = document.createElementNS(ns, "text");
            lbl.setAttribute("x", String(xScale(lastI) + 4));
            lbl.setAttribute("y", String(yScale(lastVal)));
            lbl.setAttribute("fill", maColor);
            lbl.setAttribute("font-size", "9");
            lbl.textContent = ma.label;
            gMA.appendChild(lbl);
          }
        }

        gMA.appendChild(maLine);
      }
    }
  }

  function showCrosshair(x: number, d: OHLCData): void {
    if (!opts.crosshair) return;
    gCrosshair.innerHTML = "";
    gCrosshair.style.display = "block";

    const vLine = document.createElementNS(ns, "line");
    vLine.setAttribute("x1", String(x)); vLine.setAttribute("y1", String(pad.top));
    vLine.setAttribute("x2", String(x)); vLine.setAttribute("y2", String(pad.top! + mainPlotH));
    vLine.setAttribute("stroke", "#9ca3af"); vLine.setAttribute("stroke-width", "0.5");
    vLine.setAttribute("stroke-dasharray", "3,3");
    gCrosshair.appendChild(vLine);
  }

  function hideCrosshair(): void {
    gCrosshair.style.display = "none";
  }

  function showTooltip(d: OHLCData): void {
    if (!opts.tooltip) return;
    const change = d.close - d.open;
    const changePct = d.open !== 0 ? (change / d.open) * 100 : 0;
    const lines = [
      d.date,
      `O: ${formatPrice(d.open, opts.decimals)}  H: ${formatPrice(d.high, opts.decimals)}`,
      `L: ${formatPrice(d.low, opts.decimals)}  C: ${formatPrice(d.close, opts.decimals)}`,
      `Chg: ${change >= 0 ? "+" : ""}${change.toFixed(opts.decimals)} (${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%)`,
    ];
    if (d.volume != null) lines.push(`Vol: ${d.volume.toLocaleString()}`);
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
      gTooltip.setAttribute("transform", `translate(${opts.width / 2}, ${mainH / 3})`);
    });
  }

  function hideTooltip(): void {
    gTooltip.style.display = "none";
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: CandlestickInstance = {
    element: svg,

    setData(newData: OHLCData[]) {
      data = newData.map(d => ({ ...d }));
      zoomStart = 0;
      zoomEnd = data.length;
      render();
    },

    setMovingAverages(configs: MovingAverageConfig[]) {
      opts.movingAverages = configs;
      render();
    },

    setZoom(start: number, end: number) {
      zoomStart = Math.max(0, start);
      zoomEnd = Math.min(data.length, end);
      render();
    },

    resetZoom() {
      zoomStart = 0;
      zoomEnd = data.length;
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
