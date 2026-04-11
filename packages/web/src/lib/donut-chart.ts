/**
 * Donut Chart: Interactive donut/pie chart with SVG rendering,
 * hover tooltips, click handlers, legend, animated entry,
 * multiple datasets, center label, and responsive sizing.
 */

// --- Types ---

export type DonutChartInteractionMode = "hover" | "click" | "both" | "none";
export type DonutChartLegendPosition = "right" | "bottom" | "hidden";

export interface DonutChartDataPoint {
  /** Segment label */
  label: string;
  /** Numeric value */
  value: number;
  /** Fill color */
  color?: string;
  /** Hover tooltip text (defaults to "{label}: {value}") */
  tooltip?: string;
  /** Click callback */
  onClick?: (point: DonutChartDataPoint, index: number) => void;
  /** Custom data payload */
  data?: unknown;
}

export interface DonutChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data points */
  data: DonutChartDataPoint[];
  /** Chart diameter (px) */
  size?: number;
  /** Inner hole ratio (0=solid pie, 0.6=60% donut) */
  innerRatio?: number;
  /** Segment padding/gap between slices (degrees) */
  padAngle?: number;
  /** Default color palette (used when point.color not set) */
  colors?: string[];
  /** Border width around each segment (px) */
  borderWidth?: number;
  /** Border color */
  borderColor?: string;
  /** Interaction mode */
  interactionMode?: DonutChartInteractionMode;
  /** Legend position */
  legendPosition?: DonutChartLegendPosition;
  /** Show center label (total or custom)? */
  showCenterLabel?: boolean;
  /** Center label text (overrides default total) */
  centerLabel?: string;
  /** Center sub-label */
  centerSublabel?: string;
  /** Animation on mount? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Sort segments by value descending? */
  sortData?: boolean;
  /** Show percentages in legend? */
  showPercentages?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface DonutChartInstance {
  element: HTMLElement;
  /** Update data with optional animation */
  setData: (data: DonutChartDataPoint[]) => void;
  /** Get current data */
  getData: () => DonutChartDataPoint[];
  /** Highlight a specific segment by index */
  highlightSegment: (index: number) => void;
  /** Clear highlight */
  clearHighlight: () => void;
  /** Get total value */
  getTotal: () => number;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16", "#f97316", "#14b8a6",
];

// --- Helpers ---

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number
): string {
  if (endAngle - startAngle < 0.001) return "";

  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// --- Main Factory ---

export function createDonutChart(options: DonutChartOptions): DonutChartInstance {
  const opts = {
    size: options.size ?? 240,
    innerRatio: options.innerRatio ?? 0.6,
    padAngle: (options.padAngle ?? 1) * (Math.PI / 180),
    colors: options.colors ?? DEFAULT_COLORS,
    borderWidth: options.borderWidth ?? 0,
    borderColor: options.borderColor ?? "#fff",
    interactionMode: options.interactionMode ?? "hover",
    legendPosition: options.legendPosition ?? "right",
    showCenterLabel: options.showCenterLabel ?? true,
    centerLabel: options.centerLabel,
    centerSublabel: options.centerSublabel,
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 800,
    sortData: options.sortData ?? true,
    showPercentages: options.showPercentages ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DonutChart: container not found");

  let data = opts.sortData
    ? [...options.data].sort((a, b) => b.value - a.value)
    : [...options.data];

  let destroyed = false;
  let highlightedIndex: number | null = null;
  let tooltipEl: HTMLElement | null = null;

  const ns = "http://www.w3.org/2000/svg";
  const cx = opts.size / 2;
  const cy = opts.size / 2;
  const outerR = opts.size / 2 - 2;
  const innerR = outerR * opts.innerRatio;

  // Layout wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `donut-chart ${opts.className}`;
  wrapper.style.cssText = `
    display:${opts.legendPosition === "bottom" ? "flex" : "flex"};
    flex-direction:${opts.legendPosition === "bottom" ? "column" : "row"};
    align-items:center;gap:20px;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(wrapper);

  // SVG area
  const svgArea = document.createElement("div");
  svgArea.style.cssText = `position:relative;flex-shrink:0;`;
  wrapper.appendChild(svgArea);

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.size} ${opts.size}`);
  svg.style.cssText = `width:${opts.size}px;height:${opts.size}px;display:block;overflow:visible;`;
  svgArea.appendChild(svg);

  // Group for segments
  const segmentsGroup = document.createElementNS(ns, "g");
  svg.appendChild(segmentsGroup);

  // Center label group
  const centerGroup = document.createElementNS(ns, "g");
  if (opts.showCenterLabel) svg.appendChild(centerGroup);

  // Legend area
  let legendEl: HTMLElement | null = null;
  if (opts.legendPosition !== "hidden") {
    legendEl = document.createElement("div");
    legendEl.className = "dc-legend";
    legendEl.style.cssText = `
      display:flex;flex-direction:${opts.legendPosition === "bottom" ? "row" : "column"};
      gap:6px;flex-wrap:wrap;font-size:12px;color:#374151;
    `;
    wrapper.appendChild(legendEl);
  }

  // Tooltip
  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.className = "dc-tooltip";
      tooltipEl.style.cssText = `
        position:absolute;z-index:100;padding:6px 12px;border-radius:6px;
        background:#1f2937;color:#fff;font-size:12px;font-weight:500;
        pointer-events:none;white-space:nowrap;opacity:0;transition:opacity 0.15s;
        transform:translate(-50%,-100%);margin-top:-8px;
      `;
      svgArea.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Rendering ---

  function getTotal(): number {
    return data.reduce((sum, d) => sum + d.value, 0);
  }

  function render(animationProgress = 1): void {
    segmentsGroup.innerHTML = "";
    if (centerGroup) centerGroup.innerHTML = "";
    if (legendEl) legendEl.innerHTML = "";

    const total = getTotal();
    if (total === 0) {
      // Empty state
      const emptyText = document.createElementNS(ns, "text");
      emptyText.setAttribute("x", String(cx));
      emptyText.setAttribute("y", String(cy));
      emptyText.setAttribute("text-anchor", "middle");
      emptyText.setAttribute("dominant-baseline", "central");
      emptyText.style.cssText = "font-size:13px;color:#9ca3af;";
      emptyText.textContent = "No data";
      segmentsGroup.appendChild(emptyText);
      return;
    }

    let currentAngle = -Math.PI / 2; // Start from top

    for (let i = 0; i < data.length; i++) {
      const point = data[i]!;
      const fraction = point.value / total;
      const sweepAngle = fraction * 2 * Math.PI * animationProgress - opts.padAngle;
      if (sweepAngle <= 0) continue;

      const endAngle = currentAngle + sweepAngle;
      const color = point.color ?? opts.colors[i % opts.colors.length];
      const isHighlighted = highlightedIndex === i;
      const expandOffset = isHighlighted ? 6 : 0;

      // Calculate midpoint for expansion direction
      const midAngle = currentAngle + sweepAngle / 2;
      const offsetX = Math.cos(midAngle) * expandOffset;
      const offsetY = Math.sin(midAngle) * expandOffset;

      const path = document.createElementNS(ns, "path");
      path.setAttribute("class", "dc-segment");
      path.setAttribute("data-index", String(i));
      path.setAttribute("fill", color);
      path.setAttribute("stroke", opts.borderColor);
      path.setAttribute("stroke-width", String(opts.borderWidth));
      path.style.cssText = `
        cursor:${opts.interactionMode !== "none" ? "pointer" : "default"};
        transition:transform 0.2s ease, opacity 0.15s;
        transform:translate(${offsetX}px, ${offsetY}px);
        opacity:${animationProgress};
      `;

      const d = describeArc(
        cx + offsetX, cy + offsetY,
        outerR, innerR,
        currentAngle, endAngle
      );
      path.setAttribute("d", d);
      segmentsGroup.appendChild(path);

      // Event handlers
      if (opts.interactionMode === "hover" || opts.interactionMode === "both") {
        path.addEventListener("mouseenter", (e) => {
          if (destroyed) return;
          highlightedIndex = i;
          renderSegmentsOnly();
          showTooltip(e as MouseEvent, point, fraction);
        });
        path.addEventListener("mouseleave", () => {
          if (destroyed) return;
          highlightedIndex = null;
          renderSegmentsOnly();
          hideTooltip();
        });
      }

      if (opts.interactionMode === "click" || opts.interactionMode === "both") {
        path.addEventListener("click", () => {
          point.onClick?.(point, i);
        });
      }

      currentAngle = endAngle + opts.padAngle;
    }

    // Center label
    if (opts.showCenterLabel && centerGroup && innerR > 20) {
      const labelText = opts.centerLabel ?? String(total);
      const mainLabel = document.createElementNS(ns, "text");
      mainLabel.setAttribute("x", String(cx));
      mainLabel.setAttribute("y", String(cy - (opts.centerSublabel ? 6 : 0)));
      mainLabel.setAttribute("text-anchor", "middle");
      mainLabel.setAttribute("dominant-baseline", "central");
      mainLabel.style.cssText = `font-size:${opts.size * 0.13}px;font-weight:700;color:#111827;`;
      mainLabel.textContent = labelText;
      centerGroup.appendChild(mainLabel);

      if (opts.centerSublabel) {
        const subLabel = document.createElementNS(ns, "text");
        subLabel.setAttribute("x", String(cx));
        subLabel.setAttribute("y", String(cy + opts.size * 0.06));
        subLabel.setAttribute("text-anchor", "middle");
        subLabel.setAttribute("dominant-baseline", "central");
        subLabel.style.cssText = `font-size:${opts.size * 0.055}px;color:#9ca3af;`;
        subLabel.textContent = opts.centerSublabel;
        centerGroup.appendChild(subLabel);
      }
    }

    // Legend
    if (legendEl) {
      for (let i = 0; i < data.length; i++) {
        const point = data[i]!;
        const color = point.color ?? opts.colors[i % opts.colors.length];
        const pct = total > 0 ? ((point.value / total) * 100).toFixed(1) : "0";

        const item = document.createElement("div");
        item.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;";
        item.addEventListener("mouseenter", () => {
          if (opts.interactionMode === "hover" || opts.interactionMode === "both") {
            highlightedIndex = i;
            renderSegmentsOnly();
          }
        });
        item.addEventListener("mouseleave", () => {
          if (opts.interactionMode === "hover" || opts.interactionMode === "both") {
            highlightedIndex = null;
            renderSegmentsOnly();
          }
        });

        const swatch = document.createElement("span");
        swatch.style.cssText = `width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0;`;
        item.appendChild(swatch);

        const label = document.createElement("span");
        label.textContent = point.label;
        item.appendChild(label);

        if (opts.showPercentages) {
          const pctEl = document.createElement("span");
          pctEl.style.cssText = "color:#9ca3af;margin-left:auto;";
          pctEl.textContent = `${pct}%`;
          item.appendChild(pctEl);
        }

        legendEl.appendChild(item);
      }
    }
  }

  function renderSegmentsOnly(): void {
    // Only re-render segments (not legend/center) for performance during hover
    const paths = segmentsGroup.querySelectorAll<SVGPathElement>("path.dc-segment");
    const total = getTotal();
    let currentAngle = -Math.PI / 2;

    for (let i = 0; i < data.length; i++) {
      const point = data[i]!;
      const fraction = point.value / total;
      const sweepAngle = fraction * 2 * Math.PI - opts.padAngle;
      if (sweepAngle <= 0) { currentAngle += opts.padAngle; continue; }

      const endAngle = currentAngle + sweepAngle;
      const isHighlighted = highlightedIndex === i;
      const expandOffset = isHighlighted ? 6 : 0;
      const midAngle = currentAngle + sweepAngle / 2;
      const offsetX = Math.cos(midAngle) * expandOffset;
      const offsetY = Math.sin(midAngle) * expandOffset;

      const path = paths[i];
      if (path) {
        const d = describeArc(cx + offsetX, cy + offsetY, outerR, innerR, currentAngle, endAngle);
        path.setAttribute("d", d);
        path.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      }

      currentAngle = endAngle + opts.padAngle;
    }
  }

  function showTooltip(e: MouseEvent, point: DonutChartDataPoint, fraction: number): void {
    const tt = getTooltip();
    const rect = svgArea.getBoundingClientRect();
    const total = getTotal();
    const pct = total > 0 ? ((point.value / total) * 100).toFixed(1) : "0";
    tt.textContent = point.tooltip ?? `${point.label}: ${point.value} (${pct}%)`;
    tt.style.left = `${e.clientX - rect.left}px`;
    tt.style.top = `${e.clientY - rect.top}px`;
    tt.style.opacity = "1";
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.opacity = "0";
  }

  // Animated entry
  if (opts.animate) {
    const dur = opts.animationDuration;
    const start = performance.now();

    function tick(now: number): void {
      const elapsed = now - start;
      const t = Math.min(elapsed / dur, 1);
      render(easeOutQuart(t));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } else {
    render(1);
  }

  // --- Instance ---

  const instance: DonutChartInstance = {
    element: wrapper,

    getData() { return [...data]; },

    getTotal() { return getTotal(); },

    setData(newData: DonutChartDataPoint[]) {
      data = opts.sortData
        ? [...newData].sort((a, b) => b.value - a.value)
        : [...newData];
      highlightedIndex = null;
      render(1);
    },

    highlightSegment(index: number) {
      highlightedIndex = index;
      renderSegmentsOnly();
    },

    clearHighlight() {
      highlightedIndex = null;
      renderSegmentsOnly();
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
