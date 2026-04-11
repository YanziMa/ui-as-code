/**
 * Waterfall Chart: SVG waterfall/falling-bar chart showing cumulative
 * changes between values, with connecting lines, subtotals,
 * totals, color-coded bars, labels, animations, and tooltips.
 */

// --- Types ---

export interface WaterfallDataPoint {
  /** Category label */
  label: string;
  /** Numeric value (positive = increase, negative = decrease, null = subtotal/total) */
  value: number | null;
  /** Display label override */
  displayLabel?: string;
  /** Color override */
  color?: string;
  /** Is this a total/subtotal column? */
  isTotal?: boolean;
  /** Is this a subtotal column? */
  isSubtotal?: boolean;
  /** Custom data payload */
  data?: unknown;
  /** Click handler */
  onClick?: (point: WaterfallDataPoint, index: number) => void;
}

export type WaterfallBarStyle = "rounded" | "sharp" | "pill";

export interface WaterfallChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data points */
  data: WaterfallDataPoint[];
  /** Chart width (px) */
  width?: number;
  /** Chart height (px) */
  height?: number;
  /** Bar width ratio (0-1, fraction of available space) */
  barWidthRatio?: number;
  /** Bar style variant */
  barStyle?: WaterfallBarStyle;
  /** Positive/increase color */
  positiveColor?: string;
  /** Negative/decrease color */
  negativeColor?: string;
  /** Total/subtotal color */
  totalColor?: string;
  /** Subtotal color */
  subtotalColor?: string;
  /** Line color for connectors */
  connectorColor?: string;
  /** Connector line style */
  connectorStyle?: "solid" | "dashed" | "dotted";
  /** Show value labels on bars? */
  showValues?: boolean;
  /** Show category labels below bars? */
  showLabels?: boolean;
  /** Value label font size (px) */
  valueFontSize?: number;
  /** Label font size (px) */
  labelFontSize?: number;
  /** Padding around chart area */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Y-axis minimum (auto-calculated if not set) */
  yMin?: number;
  /** Y-axis maximum (auto-calculated if not set) */
  yMax?: number;
  /** Show horizontal grid lines? */
  showGridLines?: boolean;
  /** Grid line color */
  gridLineColor?: string;
  /** Animation on mount? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Stagger delay between bars (ms) */
  staggerDelay?: number;
  /** Custom CSS class */
  className?: string;
}

export interface WaterfallChartInstance {
  element: HTMLElement;
  /** Update data */
  setData: (data: WaterfallDataPoint[]) => void;
  /** Get current data */
  getData: () => WaterfallDataPoint[];
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_POSITIVE_COLOR = "#10b981";
const DEFAULT_NEGATIVE_COLOR = "#ef4444";
const DEFAULT_TOTAL_COLOR = "#6366f1";
const DEFAULT_SUBTOTAL_COLOR = "#8b5cf6";

// --- Helpers ---

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// --- Main Factory ---

export function createWaterfallChart(options: WaterfallChartOptions): WaterfallChartInstance {
  const opts = {
    width: options.width ?? 500,
    height: options.height ?? 300,
    barWidthRatio: options.barWidthRatio ?? 0.6,
    barStyle: options.barStyle ?? "rounded",
    positiveColor: options.positiveColor ?? DEFAULT_POSITIVE_COLOR,
    negativeColor: options.negativeColor ?? DEFAULT_NEGATIVE_COLOR,
    totalColor: options.totalColor ?? DEFAULT_TOTAL_COLOR,
    subtotalColor: options.subtotalColor ?? DEFAULT_SUBTOTAL_COLOR,
    connectorColor: options.connectorColor ?? "#9ca3af",
    connectorStyle: options.connectorStyle ?? "dashed",
    showValues: options.showValues ?? true,
    showLabels: options.showLabels ?? true,
    valueFontSize: options.valueFontSize ?? 11,
    labelFontSize: options.labelFontSize ?? 11,
    padding: options.padding ?? { top: 30, right: 20, bottom: 50, left: 60 },
    yMin: options.yMin,
    yMax: options.yMax,
    showGridLines: options.showGridLines ?? true,
    gridLineColor: options.gridLineColor ?? "#f0f0f0",
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 700,
    staggerDelay: options.staggerDelay ?? 80,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("WaterfallChart: container not found");

  let data = [...options.data];
  let destroyed = false;

  const ns = "http://www.w3.org/2000/svg";
  const pad = opts.padding;
  const plotWidth = opts.width - pad.left - pad.right;
  const plotHeight = opts.height - pad.top - pad.bottom;
  const plotX = pad.left;
  const plotY = opts.height - pad.bottom;

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `waterfall-chart ${opts.className}`;
  wrapper.style.cssText = `display:inline-block;font-family:-apple-system,sans-serif;`;
  container.appendChild(wrapper);

  // SVG
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;overflow:visible;`;
  wrapper.appendChild(svg);

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.style.cssText = `
        position:absolute;z-index:100;padding:6px 12px;border-radius:6px;
        background:#1f2937;color:#fff;font-size:11px;pointer-events:none;
        white-space:nowrap;opacity:0;transition:opacity 0.15s;
      `;
      wrapper.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Calculate scales ---

  function calculateScales(): { yMin: number; yMax: number; runningTotals: number[] } {
    let running = 0;
    const runningTotals: number[] = [];
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of data) {
      if (point.value === null || point.isTotal || point.isSubtotal) {
        // Total/subtotal: use accumulated running total
        runningTotals.push(running);
        minY = Math.min(minY, running);
        maxY = Math.max(maxY, running);
      } else {
        const nextRunning = running + point.value;
        runningTotals.push(nextRunning);
        minY = Math.min(minY, running, nextRunning);
        maxY = Math.max(maxY, running, nextRunning);
        running = nextRunning;
      }
    }

    // Apply overrides
    if (opts.yMin !== undefined) minY = opts.yMin;
    if (opts.yMax !== undefined) maxY = opts.yMax;

    // Add padding
    const range = maxY - minY;
    if (range === 0) { minY -= 1; maxY += 1; }
    else { minY -= range * 0.05; maxY += range * 0.05; }

    return { yMin: minY, yMax: maxY, runningTotals };
  }

  function yScale(value: number, yMin: number, yMax: number): number {
    return plotY - ((value - yMin) / (yMax - yMin)) * plotHeight;
  }

  // --- Rendering ---

  function render(progress = 1): void {
    svg.innerHTML = "";

    if (data.length === 0) return;

    const { yMin, yMax, runningTotals } = calculateScales();
    const zeroY = yScale(0, yMin, yMax);
    const barSpace = plotWidth / data.length;
    const barWidth = barSpace * opts.barWidthRatio;
    const barRadius = opts.barStyle === "pill" ? barWidth / 2 : opts.barStyle === "rounded" ? 4 : 0;

    // Horizontal grid lines
    if (opts.showGridLines) {
      const gridCount = 5;
      for (let i = 0; i <= gridCount; i++) {
        const val = yMin + ((yMax - yMin) / gridCount) * i;
        const gy = yScale(val, yMin, yMax);
        const gridLine = document.createElementNS(ns, "line");
        gridLine.setAttribute("x1", String(plotX));
        gridLine.setAttribute("y1", String(gy));
        gridLine.setAttribute("x2", String(plotX + plotWidth));
        gridLine.setAttribute("y2", String(gy));
        gridLine.setAttribute("stroke", opts.gridLineColor);
        gridLine.setAttribute("stroke-width", "1");
        svg.appendChild(gridLine);

        // Y-axis label
        const label = document.createElementNS(ns, "text");
        label.setAttribute("x", String(plotX - 8));
        label.setAttribute("y", String(gy + 3));
        label.setAttribute("text-anchor", "end");
        label.style.cssText = `font-size:10px;color:#9ca3af;fill:#9ca3af;`;
        label.textContent = Math.round(val).toLocaleString();
        svg.appendChild(label);
      }
    }

    // Zero line (if visible)
    if (zeroY > plotY - plotHeight && zeroY < plotY) {
      const zeroLine = document.createElementNS(ns, "line");
      zeroLine.setAttribute("x1", String(plotX));
      zeroLine.setAttribute("y1", String(zeroY));
      zeroLine.setAttribute("x2", String(plotX + plotWidth));
      zeroLine.setAttribute("y2", String(zeroY));
      zeroLine.setAttribute("stroke", "#d1d5db");
      zeroLine.setAttribute("stroke-width", "1");
      zeroLine.setAttribute("stroke-dasharray", "4,4");
      svg.appendChild(zeroLine);
    }

    let prevEndY = zeroY;
    let prevCenterX = 0;

    for (let i = 0; i < data.length; i++) {
      const point = data[i]!;
      const centerX = plotX + barSpace * (i + 0.5);
      const delay = i * opts.staggerDelay;
      const barProgress = progress <= 0 ? 0 : Math.max(0, Math.min(1, (progress * opts.animationDuration - delay) / (opts.animationDuration - delay)));

      const isTotal = point.isTotal || point.value === null;
      const isSubtotal = point.isSubtotal;

      // Determine bar color
      let color: string;
      if (point.color) {
        color = point.color;
      } else if (isTotal) {
        color = opts.totalColor;
      } else if (isSubtotal) {
        color = opts.subtotalColor;
      } else if ((point.value ?? 0) >= 0) {
        color = opts.positiveColor;
      } else {
        color = opts.negativeColor;
      }

      // Calculate bar geometry
      let barTop: number;
      let barBottom: number;
      let barHeight: number;

      if (isTotal || isSubtotal) {
        // Total/subtotal: bar from 0 (or previous) to the running total
        const totalY = yScale(runningTotals[i]!, yMin, yMax);
        barTop = Math.min(zeroY, totalY);
        barBottom = Math.max(zeroY, totalY);
        barHeight = Math.abs(totalY - zeroY);
      } else {
        // Regular bar: from previous running total to new running total
        const startY = yScale(runningTotals[i]! - (point.value ?? 0), yMin, yMax);
        const endY = yScale(runningTotals[i]!, yMin, yMax);
        barTop = Math.min(startY, endY);
        barBottom = Math.max(startY, endY);
        barHeight = Math.abs(endY - startY);
      }

      const barLeft = centerX - barWidth / 2;
      const actualHeight = barHeight * barProgress;

      // Connector line (from previous bar end to this bar start)
      if (i > 0 && barProgress > 0.5) {
        const connLine = document.createElementNS(ns, "line");
        connLine.setAttribute("x1", String(prevCenterX + barWidth / 2));
        connLine.setAttribute("y1", String(prevEndY));
        connLine.setAttribute("x2", String(centerX - barWidth / 2));
        connLine.setAttribute("y2", String(prevEndY));
        connLine.setAttribute("stroke", opts.connectorColor);
        connLine.setAttribute("stroke-width", "1.5");
        if (opts.connectorStyle === "dashed") connLine.setAttribute("stroke-dasharray", "4,3");
        else if (opts.connectorStyle === "dotted") connLine.setAttribute("stroke-dasharray", "2,2");
        connLine.style.opacity = String(barProgress);
        svg.appendChild(connLine);
      }

      // Draw bar (as rect or path for rounded corners)
      if (barHeight > 0 && actualHeight > 0.5) {
        const drawY = barBottom - actualHeight;

        if (barRadius > 0) {
          // Rounded rect using path
          const r = Math.min(barRadius, actualHeight / 2, barWidth / 2);
          const path = document.createElementNS(ns, "path");
          let d: string;
          if (barTop < zeroY) {
            // Growing upward from bottom
            d = `
              M ${barLeft + r} ${drawY + actualHeight}
              L ${barLeft + barWidth - r} ${drawY + actualHeight}
              Q ${barLeft + barWidth} ${drawY + actualHeight} ${barLeft + barWidth} ${drawY + actualHeight - r}
              L ${barLeft + barWidth} ${drawY + r}
              Q ${barLeft + barWidth} ${drawY} ${barLeft + barWidth - r} ${drawY}
              L ${barLeft + r} ${drawY}
              Q ${barLeft} ${drawY} ${barLeft} ${drawY + r}
              L ${barLeft} ${drawY + actualHeight - r}
              Q ${barLeft} ${drawY + actualHeight} ${barLeft + r} ${drawY + actualHeight}
              Z
            `;
          } else {
            // Growing downward from top
            d = `
              M ${barLeft + r} ${drawY}
              L ${barLeft + barWidth - r} ${drawY}
              Q ${barLeft + barWidth} ${drawY} ${barLeft + barWidth} ${drawY + r}
              L ${barLeft + barWidth} ${drawY + actualHeight - r}
              Q ${barLeft + barWidth} ${drawY + actualHeight} ${barLeft + barWidth - r} ${drawY + actualHeight}
              L ${barLeft + r} ${drawY + actualHeight}
              Q ${barLeft} ${drawY + actualHeight} ${barLeft} ${drawY + actualHeight - r}
              L ${barLeft} ${drawY + r}
              Q ${barLeft} ${drawY} ${barLeft + r} ${drawY}
              Z
            `;
          }
          path.setAttribute("d", d);
          path.setAttribute("fill", color);
          path.style.cursor = point.onClick ? "pointer" : "default";
          path.style.transition = "opacity 0.2s";
          path.style.opacity = String(barProgress);

          path.addEventListener("mouseenter", () => {
            path.style.opacity = "1";
            path.style.filter = "brightness(1.1)";
            showTooltip(point, i);
          });
          path.addEventListener("mouseleave", () => {
            path.style.opacity = String(barProgress);
            path.style.filter = "";
            hideTooltip();
          });
          if (point.onClick) {
            path.addEventListener("click", () => point.onClick!(point, i));
          }

          svg.appendChild(path);
        } else {
          const rect = document.createElementNS(ns, "rect");
          rect.setAttribute("x", String(barLeft));
          rect.setAttribute("y", String(drawY));
          rect.setAttribute("width", String(barWidth));
          rect.setAttribute("height", String(actualHeight));
          rect.setAttribute("fill", color);
          rect.style.cursor = point.onClick ? "pointer" : "default";
          rect.style.opacity = String(barProgress);
          svg.appendChild(rect);
        }
      }

      // Value label on top of bar
      if (opts.showValues && barProgress > 0.8) {
        const displayVal = isTotal || isSubtotal
          ? runningTotals[i]
          : point.value;
        const valStr = displayVal === null ? "" :
          (typeof displayVal === "number" ? (displayVal >= 0 ? `+${displayVal}` : String(displayVal)) : "");

        if (valStr) {
          const valEl = document.createElementNS(ns, "text");
          valEl.setAttribute("x", String(centerX));
          valEl.setAttribute("y", String(barTop - 6));
          valEl.setAttribute("text-anchor", "middle");
          valEl.style.cssText = `font-size:${opts.valueFontSize}px;font-weight:600;fill:#374151;`;
          valEl.style.opacity = String(Math.min(1, (barProgress - 0.8) * 5));
          valEl.textContent = valStr;
          svg.appendChild(valEl);
        }
      }

      // Category label
      if (opts.showLabels) {
        const lbl = document.createElementNS(ns, "text");
        lbl.setAttribute("x", String(centerX));
        lbl.setAttribute("y", String(plotY + 18));
        lbl.setAttribute("text-anchor", "middle");
        lbl.style.cssText = `font-size:${opts.labelFontSize}px;fill:#6b7280;font-weight:500;`;
        lbl.textContent = point.displayLabel ?? point.label;
        svg.appendChild(lbl);
      }

      // Track for connector
      if (isTotal || isSubtotal) {
        prevEndY = yScale(runningTotals[i]!, yMin, yMax);
      } else {
        prevEndY = yScale(runningTotals[i]!, yMin, yMax);
      }
      prevCenterX = centerX;
    }
  }

  function showTooltip(point: WaterfallDataPoint, _index: number): void {
    const tt = getTooltip();
    const isTotal = point.isTotal || point.value === null;
    const valText = isTotal
      ? `Total: ${runningTotals[_index]}`
      : `${point.label}: ${point.value >= 0 ? "+" : ""}${point.value}`;
    tt.textContent = valText;
    tt.style.opacity = "1";
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.opacity = "0";
  }

  // Need runningTotals accessible for tooltip
  let runningTotals: number[] = [];

  // Override showTooltip to capture runningTotals
  const originalRender = render;
  render = function(progress = 1): void {
    // Capture runningTotals before rendering
    const scales = calculateScales();
    runningTotals = scales.runningTotals;
    originalRender(progress);
  }.bind(this);

  // Animated entry
  if (opts.animate) {
    const dur = opts.animationDuration + (data.length - 1) * opts.staggerDelay;
    const start = performance.now();
    function tick(now: number): void {
      const t = Math.min((now - start) / dur, 1);
      render(easeOutQuart(t));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } else {
    render(1);
  }

  // --- Instance ---

  const instance: WaterfallChartInstance = {
    element: wrapper,

    getData() { return [...data]; },

    setData(newData: WaterfallDataPoint[]) {
      data = [...newData];
      render(1);
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
