/**
 * Heatmap Utilities: Calendar-style and grid heatmaps with color scales,
 * tooltips, legend, interaction, and data aggregation for time-series
 * intensity visualization (e.g., GitHub contribution graphs).
 */

// --- Types ---

export type HeatmapColorScale = "green" | "blue" | "red" | "viridis" | "warm" | "cool" | "grayscale";

export interface HeatmapDataPoint {
  /** X-axis value (date string or category) */
  x: string;
  /** Y-axis value (category or index) */
  y: string | number;
  /** Intensity value (0-1 normalized, or raw value) */
  value: number;
  /** Optional label for tooltip */
  label?: string;
}

export interface HeatmapOptions {
  /** Data points */
  data: HeatmapDataPoint[];
  /** Heatmap type */
  type?: "calendar" | "grid";
  /** Color scale */
  colorScale?: HeatmapColorScale;
  /** Number of color buckets (default 5) */
  buckets?: number;
  /** Cell size in px (for calendar type) */
  cellSize?: number;
  /** Gap between cells in px */
  gap?: number;
  /** Show legend? */
  showLegend?: boolean;
  /** Show tooltip on hover? */
  showTooltip?: boolean;
  /** No data color */
  noDataColor?: string;
  /** Label for the heatmap */
  title?: string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when a cell is clicked */
  onCellClick?: (point: HeatmapDataPoint) => void;
  /** Format function for tooltip values */
  formatValue?: (value: number) => string;
  /** Month labels locale */
  locale?: string;
}

export interface HeatmapInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Update data */
  setData(data: HeatmapDataPoint[]): void;
  /** Get current data */
  getData(): HeatmapDataPoint[];
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Color Scales ---

const COLOR_SCALES: Record<HeatmapColorScale, string[]> = {
  "green": ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  "blue": ["#ebedf0", "#bae7ff", "#69c0ff", "#1890ff", "#0050b3"],
  "red": ["#ebedf0", "#ffa39e", "#ff7875", "#ff4d4f", "#cf1322"],
  "viridis": ["#ebedf0", "#a8dcaf", "#36b37e", "#0891b2", "#194185"],
  "warm": ["#fff7ed", "#fed7aa", "#fb923c", "#ea580c", "#c2410c"],
  "cool": ["#ebedf0", "#bfdbfe", "#60a5fa", "#3b82f6", "#1d4ed8"],
  "grayscale": ["#f3f4f6", "#d1d5db", "#9ca3af", "#6b7280", "#374151"],
};

// --- Helpers ---

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getBucketIndex(value: number, maxVal: number, bucketCount: number): number {
  if (maxVal === 0) return 0;
  const ratio = Math.min(1, value / maxVal);
  return Math.min(bucketCount - 1, Math.floor(ratio * bucketCount));
}

function getColorForValue(value: number, maxVal: number, scale: string[], noDataColor: string, buckets: number): string {
  if (value <= 0) return noDataColor;
  const idx = getBucketIndex(value, maxVal, buckets);
  return scale[idx] ?? noDataColor;
}

// --- Core Factory ---

/**
 * Create a heatmap visualization.
 *
 * @example
 * ```ts
 * // Calendar heatmap (GitHub-style)
 * const heatmap = createHeatmap({
 *   type: "calendar",
 *   data: generateYearlyData(),
 *   colorScale: "green",
 *   showLegend: true,
 * });
 *
 * // Grid heatmap
 * const grid = createHeatmap({
 *   type: "grid",
 *   data: [
 *     { x: "Mon", y: "Week 1", value: 5 },
 *     { x: "Tue", y: "Week 1", value: 12 },
 *   ],
 * });
 * ```
 */
export function createHeatmap(options: HeatmapOptions): HeatmapInstance {
  const {
    data,
    type = "calendar",
    colorScale = "green",
    buckets = 5,
    cellSize = 11,
    gap = 3,
    showLegend = true,
    showTooltip = true,
    noDataColor = "#ebedf0",
    title,
    formatValue,
    className,
    container,
    onCellClick,
  } = options;

  let _data = [...data];
  let _tooltipEl: HTMLElement | null = null;
  const scale = COLOR_SCALES[colorScale];

  // Root
  const root = document.createElement("div");
  root.className = `heatmap ${type} ${className ?? ""}`.trim();
  root.style.cssText =
    "font-family:-apple-system,sans-serif;font-size:11px;color:#6b7280;";

  _render();

  // --- Render ---

  function _render(): void {
    root.innerHTML = "";

    if (title) {
      const titleEl = document.createElement("h4");
      titleEl.textContent = title;
      titleEl.style.cssText = "margin:0 0 8px;font-size:13px;font-weight:600;color:#111827;";
      root.appendChild(titleEl);
    }

    if (type === "calendar") {
      renderCalendarHeatmap();
    } else {
      renderGridHeatmap();
    }

    if (showLegend) {
      renderLegend();
    }
  }

  function renderCalendarHeatmap(): void {
    const wrapper = document.createElement("div");
    wrapper.style.display = "inline-flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "4px";

    // Day-of-week labels
    const dowRow = document.createElement("div");
    dowRow.style.display = "flex";
    dowRow.style.gap = `${gap}px`;
    dowRow.style.marginLeft = `${cellSize + 8}px`; // Space for month labels

    for (let d = 2; d < 9; d++) {
      const dayLabel = document.createElement("span");
      dayLabel.textContent = DAY_NAMES[d % 7];
      dayLabel.style.cssText = `width:${cellSize}px;text-align:center;font-size:10px;`;
      dowRow.appendChild(dayLabel);
    }
    wrapper.appendChild(dowRow);

    // Group data by month
    const months: Map<number, HeatmapDataPoint[]> = new Map();

    for (let m = 0; m < 12; m++) months.set(m, []);

    const maxVal = Math.max(..._data.map((d) => d.value), 1);

    for (const point of _data) {
      const date = new Date(point.x);
      const month = date.getMonth();
      if (!months.has(month)) months.set(month, []);
      months.get(month)!.push(point);
    }

    // Render each month
    for (let m = 0; m < 12; m++) {
      const monthRow = document.createElement("div");
      monthRow.style.display = "flex";
      monthRow.style.alignItems = "center";

      // Month label
      const monthLabel = document.createElement("span");
      monthLabel.textContent = MONTH_NAMES[m];
      monthLabel.style.cssText = `width:${cellSize + 4}px;font-size:10px;text-align:right;padding-right:4px;`;
      monthRow.appendChild(monthLabel);

      // Week columns
      const weeksInMonth: Map<number, HeatmapDataPoint[]> = new Map();
      const monthPoints = months.get(m) ?? [];

      for (const pt of monthPoints) {
        const date = new Date(pt.x);
        const weekNum = getISOWeekNumber(date);
        if (!weeksInMonth.has(weekNum)) weeksInMonth.set(weekNum, []);
        weeksInMonth.get(weekNum)!.push(pt);
      }

      const weekCount = weeksInMonth.size || 4; // Minimum 4 weeks display

      for (let w = 0; w < Math.max(weekCount, 4); w++) {
        const weekCol = document.createElement("div");
        weekCol.style.display = "flex";
        weekCol.style.flexDirection = "column";
        weekCol.style.gap = `${gap}px`;

        for (let dow = 0; dow < 7; dow++) {
          const dayPoints = weeksInMonth.get(w)?.filter((pt) => {
            const d = new Date(pt.x);
            return d.getDay() === dow && d.getMonth() === m;
          }) ?? [];

          const cell = document.createElement("div");
          cell.style.cssText =
            `width:${cellSize}px;height:${cellSize}px;border-radius:2px;` +
            "cursor:pointer;transition:background 0.1s;";

          if (dayPoints.length > 0) {
            const pt = dayPoints[0]!;
            cell.style.background = getColorForValue(pt.value, maxVal, scale, noDataColor, buckets);
            cell.dataset.value = String(pt.value);
            cell.dataset.date = pt.x;
            cell.dataset.label = pt.label ?? "";

            cell.addEventListener("mouseenter", (e) => handleCellHover(e as MouseEvent, pt));
            cell.addEventListener("mouseleave", hideTooltip);
            cell.addEventListener("click", () => onCellClick?.(pt));
          } else {
            cell.style.background = noDataColor;
          }

          weekCol.appendChild(cell);
        }

        monthRow.appendChild(weekCol);
      }

      wrapper.appendChild(monthRow);
    }

    root.appendChild(wrapper);
  }

  function renderGridHeatmap(): void {
    // Collect unique x and y values
    const xValues = [...new Set(_data.map((d) => d.x))];
    const yValues = [...new Set(_data.map((d) => String(d.y)))];

    const maxVal = Math.max(..._data.map((d) => d.value), 1);
    const cellW = Math.max(20, Math.min(60, 400 / xValues.length));
    const cellH = Math.max(20, Math.min(40, 300 / yValues.length));

    const wrapper = document.createElement("div");
    wrapper.style.display = "inline-flex";
    wrapper.style.flexDirection = "column";

    // Header row (x labels)
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.marginLeft = `${60}px`;

    for (const x of xValues) {
      const xLabel = document.createElement("span");
      xLabel.textContent = x;
      xLabel.style.cssText = `width:${cellW}px;text-align:center;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      headerRow.appendChild(xLabel);
    }
    wrapper.appendChild(headerRow);

    // Data rows
    for (const y of yValues) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";

      // Y label
      const yLabel = document.createElement("span");
      yLabel.textContent = String(y);
      yLabel.style.cssText = `width:${56}px;text-align:right;padding-right:4px;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;`;
      row.appendChild(yLabel);

      for (const x of xValues) {
        const pt = _data.find((d) => d.x === x && String(d.y) === y);

        const cell = document.createElement("div");
        cell.style.cssText =
          `width:${cellW}px;height:${cellH}px;border-radius:3px;cursor:pointer;transition:background 0.1s;`;

        if (pt) {
          cell.style.background = getColorForValue(pt.value, maxVal, scale, noDataColor, buckets);
          cell.dataset.value = String(pt.value);
          cell.dataset.label = pt.label ?? "";

          cell.addEventListener("mouseenter", (e) => handleCellHover(e as MouseEvent, pt));
          cell.addEventListener("mouseleave", hideTooltip);
          cell.addEventListener("click", () => onCellClick?.(pt));
        } else {
          cell.style.background = noDataColor;
        }

        row.appendChild(cell);
      }

      wrapper.appendChild(row);
    }

    root.appendChild(wrapper);
  }

  function renderLegend(): void {
    const legend = document.createElement("div");
    legend.className = "heatmap-legend";
    legend.style.cssText =
      "display:flex;align-items:center;gap:6px;margin-top:10px;justify-content:flex-end;";

    const lessLabel = document.createElement("span");
    lessLabel.textContent = "Less";
    lessLabel.style.fontSize = "10px";
    legend.appendChild(lessLabel);

    for (let i = 0; i < buckets; i++) {
      const swatch = document.createElement("span");
      swatch.style.cssText =
        `width:12px;height:12px;border-radius:2px;background:${scale[i]};`;
      legend.appendChild(swatch);
    }

    const moreLabel = document.createElement("span");
    moreLabel.textContent = "More";
    moreLabel.style.fontSize = "10px";
    legend.appendChild(moreLabel);

    root.appendChild(legend);
  }

  function handleCellHover(e: MouseEvent, pt: HeatmapDataPoint): void {
    if (!showTooltip) return;
    hideTooltip();

    _tooltipEl = document.createElement("div");
    _tooltipEl.className = "heatmap-tooltip";
    _tooltipEl.style.cssText =
      "position:fixed;z-index:9999;padding:6px 10px;border-radius:6px;" +
      "background:#111827;color:#fff;font-size:11px;" +
      "pointer-events:none;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.2);";

    const text = formatValue ? formatValue(pt.value)
      : pt.label || `${pt.x}: ${pt.value}`;
    _tooltipEl.textContent = text;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    _tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
    _tooltipEl.style.top = `${rect.bottom + window.scrollY + 6}px`;
    _tooltipEl.style.transform = "translateX(-50%)";

    document.body.appendChild(_tooltipEl);
  }

  function hideTooltip(): void {
    if (_tooltipEl) {
      _tooltipEl.remove();
      _tooltipEl = null;
    }
  }

  function getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  // --- Instance ---

  const instance: HeatmapInstance = {
    el: root,

    setData(newData) {
      _data = newData;
      _render();
    },

    getData() { return [..._data]; },

    destroy() {
      hideTooltip();
      root.remove();
    },
  };

  if (container) container.appendChild(root);

  return instance;
}
