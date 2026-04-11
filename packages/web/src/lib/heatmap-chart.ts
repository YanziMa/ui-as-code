/**
 * Heatmap Chart: Calendar-style contribution heatmap, matrix heatmap,
 * and geographic heatmap with color scales, tooltips, legends,
 * interactive hover, and data aggregation.
 */

// --- Types ---

export type HeatmapLayout = "calendar" | "matrix" | "geographic";
export type ColorScale = "sequential" | "diverging" | "categorical";
export type AggregationMethod = "sum" | "avg" | "count" | "max" | "min";

export interface HeatmapCell {
  /** X-axis key (date string for calendar, column label for matrix) */
  x: string;
  /** Y-axis key (row label for matrix) */
  y?: string;
  /** Numeric value */
  value: number;
  /** Optional label for tooltip */
  label?: string;
  /** Optional category for categorical coloring */
  category?: string;
}

export interface HeatmapColorStop {
  value: number;
  color: string;
}

export interface HeatmapOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data points */
  data: HeatmapCell[];
  /** Layout variant */
  layout?: HeatmapLayout;
  /** Color scale type */
  colorScale?: ColorScale;
  /** Custom color stops (overrides built-in) */
  colorStops?: HeatmapColorStop[];
  /** Base color for sequential scale (light → dark) */
  baseColor?: string;
  /** Diverging midpoint color */
  midColor?: string;
  /** Cell size in px (default: 12 for calendar, 20 for matrix) */
  cellSize?: number;
  /** Gap between cells in px (default: 3) */
  cellGap?: number;
  /** Show legend? */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: "bottom" | "right" | "top" | "left";
  /** Legend label format */
  legendLabelFormat?: (value: number) => string;
  /** Show tooltip on hover? */
  showTooltip?: boolean;
  /** Tooltip formatter */
  tooltipFormatter?: (cell: HeatmapCell) => string;
  /** Month labels for calendar layout (default: abbreviated) */
  monthLabels?: boolean;
  /** Day labels for calendar layout (Su Mo Tu...) */
  dayLabels?: boolean;
  /** Start date for calendar layout */
  startDate?: Date;
  /** End date for calendar layout */
  endDate?: Date;
  /** Row labels for matrix layout */
  rowLabels?: string[];
  /** Column labels for matrix layout */
  colLabels?: string[];
  /** Aggregation method when multiple cells map to same position */
  aggregation?: AggregationMethod;
  /** Empty cell color */
  emptyColor?: string;
  /** Border radius on cells */
  borderRadius?: number;
  /** Click callback */
  onCellClick?: (cell: HeatmapCell, event: MouseEvent) => void;
  /** Hover callback */
  onCellHover?: (cell: HeatmapCell | null, event: MouseEvent) => void;
  /** Custom CSS class */
  className?: string;
  /** Locale for date formatting */
  locale?: string;
}

export interface HeatmapInstance {
  element: HTMLElement;
  /** Update data */
  setData: (data: HeatmapCell[]) => void;
  /** Get current data */
  getData: () => HeatmapCell[];
  /** Get cell element by coordinates */
  getCell: (x: string, y?: string) => HTMLElement | null;
  /** Highlight a cell */
  highlightCell: (x: string, y?: string) => void;
  /** Clear highlight */
  clearHighlight: () => void;
  /** Get statistics */
  getStats: () => { min: number; max: number; mean: number; count: number };
  /** Destroy instance */
  destroy: () => void;
}

// --- Built-in Color Scales ---

const SEQUENTIAL_COLORS = [
  { value: 0, color: "#ebedf0" },
  { value: 0.25, color: "#9be9a8" },
  { value: 0.5, color: "#40c463" },
  { value: 0.75, color: "#30a14e" },
  { value: 1, color: "#216e39" },
];

const DIVERGING_COLORS = [
  { value: 0, color: "#d73027" },
  { value: 0.25, color: "#fc8d59" },
  { value: 0.5, color: "#ffffbf" },
  { value: 0.75, color: "#91cf60" },
  { value: 1, color: "#1a9850" },
];

const CATEGORICAL_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

// --- Main Factory ---

export function createHeatmap(options: HeatmapOptions): HeatmapInstance {
  const opts = {
    layout: options.layout ?? "calendar",
    colorScale: options.colorScale ?? "sequential",
    cellSize: options.cellSize ?? (options.layout === "calendar" ? 12 : 20),
    cellGap: options.cellGap ?? 3,
    showLegend: options.showLegend ?? true,
    legendPosition: options.legendPosition ?? "bottom",
    showTooltip: options.showTooltip ?? true,
    monthLabels: options.monthLabels ?? true,
    dayLabels: options.dayLabels ?? true,
    aggregation: options.aggregation ?? "sum",
    emptyColor: options.emptyColor ?? "#ebedf0",
    borderRadius: options.borderRadius ?? 2,
    locale: options.locale ?? "en-US",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("HeatmapChart: container not found");

  let currentData = [...options.data];
  let destroyed = false;
  let highlightedCell: HTMLElement | null = null;

  // Compute stats
  function computeStats(): { min: number; max: number; mean: number; count: number } {
    const values = currentData.map((d) => d.value).filter((v) => !isNaN(v));
    if (values.length === 0) return { min: 0, max: 0, mean: 0, count: 0 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    return { min, max, mean: sum / values.length, count: values.length };
  }

  // Interpolate color
  function getColorForValue(value: number): string {
    const stops = opts.colorStops ?? (
      opts.colorScale === "diverging" ? DIVERGING_COLORS :
      opts.colorScale === "categorical" ? SEQUENTIAL_COLORS : SEQUENTIAL_COLORS
    );
    const stats = computeStats();
    if (stats.max === stats.min) return stops[stops.length - 1]!.color;

    let normalized: number;
    if (opts.colorScale === "diverging") {
      const range = Math.max(Math.abs(stats.min), Math.abs(stats.max));
      normalized = range === 0 ? 0.5 : (value / (range * 2)) + 0.5;
    } else {
      normalized = (value - stats.min) / (stats.max - stats.min);
    }
    normalized = Math.max(0, Math.min(1, normalized));

    // Find surrounding stops
    for (let i = 0; i < stops.length - 1; i++) {
      const s1 = stops[i]!;
      const s2 = stops[i + 1]!;
      if (normalized >= s1.value && normalized <= s2.value) {
        const t = (normalized - s1.value) / (s2.value - s1.value);
        return interpolateColor(s1.color, s2.color, t);
      }
    }
    return stops[stops.length - 1]!.color;
  }

  function interpolateColor(c1: string, c2: string, t: number): string {
    const r1 = parseInt(c1.slice(1, 3), 16), g1 = parseInt(c1.slice(3, 5), 16), b1 = parseInt(c1.slice(5, 7), 16);
    const r2 = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b2 = parseInt(c2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  // --- Tooltip ---

  let tooltipEl: HTMLElement | null = null;

  function createTooltip(): HTMLElement {
    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;z-index:9999;padding:6px 10px;background:#1f2937;color:#fff;" +
      "font-size:12px;border-radius:6px;pointer-events:none;opacity:0;transition:opacity 0.15s;max-width:240px;";
    document.body.appendChild(el);
    return el;
  }

  function showTooltip(cell: HeatmapCell, x: number, y: number): void {
    if (!tooltipEl) tooltipEl = createTooltip();
    tooltipEl.textContent = opts.tooltipFormatter?.(cell) ??
      `${cell.label ?? cell.x}${cell.y ? ` / ${cell.y}` : ""}: ${cell.value}`;
    tooltipEl.style.opacity = "1";
    tooltipEl.style.left = `${x + 10}px`;
    tooltipEl.style.top = `${y - 10}px`;
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.opacity = "0";
  }

  // --- Render ---

  const root = document.createElement("div");
  root.className = `heatmap ${opts.className ?? ""}`;
  root.style.cssText = `
    display:flex;flex-direction:${opts.legendPosition === "right" || opts.legendPosition === "left" ? "row" : "column"};
    gap:12px;font-family:-apple-system,sans-serif;color:#374151;position:relative;
  `;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    const chartArea = document.createElement("div");
    chartArea.className = "heatmap-chart-area";
    chartArea.style.position = "relative";
    root.appendChild(chartArea);

    switch (opts.layout) {
      case "calendar": renderCalendar(chartArea); break;
      case "matrix": renderMatrix(chartArea); break;
      default: renderMatrix(chartArea); break;
    }

    if (opts.showLegend) renderLegend(root);
  }

  function renderCalendar(container: HTMLElement): void {
    const start = opts.startDate ?? new Date(Date.now() - 365 * 86400000);
    const end = opts.endDate ?? new Date();

    // Build date → value map
    const dateMap = new Map<string, number>();
    const labelMap = new Map<string, string>();
    for (const cell of currentData) {
      const existing = dateMap.get(cell.x) ?? 0;
      dateMap.set(cell.x, existing + cell.value);
      if (cell.label && !labelMap.has(cell.x)) labelMap.set(cell.x, cell.label);
    }

    const weeks: Date[][] = [];
    let week: Date[] = [];
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());

    // Align to Sunday
    const dayOffset = cursor.getDay();
    cursor.setDate(cursor.getDate() - dayOffset);

    while (cursor <= end) {
      week.push(new Date(cursor));
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (week.length > 0) weeks.push(week);

    const grid = document.createElement("div");
    grid.style.display = "inline-flex";
    grid.style.flexDirection = "column";
    grid.style.gap = `${opts.cellGap}px`;

    // Month headers
    if (opts.monthLabels) {
      const monthRow = document.createElement("div");
      monthRow.style.display = "flex";
      monthRow.style.marginBottom = "4px";
      monthRow.style.paddingLeft = `${opts.cellSize + 20}px`; // offset for day labels

      let lastMonth = -1;
      for (const w of weeks) {
        if (w.length > 0) {
          const m = w[0]!.getMonth();
          if (m !== lastMonth) {
            const label = document.createElement("span");
            label.style.fontSize = "11px";
            label.style.color = "#9ca3af";
            label.textContent = w[0]!.toLocaleDateString(opts.locale, { month: "short" });
            const weekWidth = (opts.cellSize + opts.cellGap) * 7;
            label.style.minWidth = `${weekWidth}px`;
            monthRow.appendChild(label);
            lastMonth = m;
          }
        }
      }
      grid.appendChild(monthRow);
    }

    // Day labels + cells
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let d = 0; d < 7; d++) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = `${opts.cellGap}px`;

      // Day label
      if (opts.dayLabels && d === 0) {
        const dayLabel = document.createElement("span");
        dayLabel.style.fontSize = "10px";
        dayLabel.style.color = "#9ca3af";
        dayLabel.style.width = "20px";
        dayLabel.style.textAlign = "right";
        dayLabel.textContent = dayNames[d];
        row.appendChild(dayLabel);
      } else if (opts.dayLabels) {
        const spacer = document.createElement("span");
        spacer.style.width = "20px";
        row.appendChild(spacer);
      }

      for (const w of weeks) {
        const date = w[d];
        if (!date || date < start || date > end) {
          const empty = document.createElement("div");
          empty.style.width = `${opts.cellSize}px`;
          empty.style.height = `${opts.cellSize}px`;
          row.appendChild(empty);
        } else {
          const dateKey = formatDateKey(date);
          const val = dateMap.get(dateKey) ?? 0;
          const cell = createCell(dateKey, undefined, val, labelMap.get(dateKey));
          row.appendChild(cell);
        }
      }

      grid.appendChild(row);
    }

    container.appendChild(grid);
  }

  function renderMatrix(container: HTMLElement): void {
    // Aggregate data into rows × columns
    const rowKeys = opts.rowLabels ?? [...new Set(currentData.map((d) => d.y ?? ""))];
    const colKeys = opts.colLabels ?? [...new Set(currentData.map((d) => d.x))];

    const cellMap = new Map<string, { value: number; count: number; cell: HeatmapCell }>();
    for (const d of currentData) {
      const key = `${d.x}|${d.y ?? ""}`;
      const prev = cellMap.get(key);
      if (prev) {
        prev.value += d.value;
        prev.count++;
      } else {
        cellMap.set(key, { value: d.value, count: 1, cell: d });
      }
    }

    const grid = document.createElement("div");
    grid.style.display = "inline-flex";
    grid.style.flexDirection = "column";
    grid.style.gap = `${opts.cellGap}px`;

    // Column headers
    const headerRow = document.createElement("div");
    headerRow.style.display = "flex";
    headerRow.style.alignItems = "center";
    headerRow.style.gap = `${opts.cellGap}px`;
    headerRow.style.paddingLeft = "60px"; // space for row labels
    for (const col of colKeys) {
      const label = document.createElement("span");
      label.style.fontSize = "11px";
      label.style.color = "#6b7280";
      label.style.width = `${opts.cellSize}px`;
      label.style.textAlign = "center";
      label.style.overflow = "hidden";
      label.style.textOverflow = "ellipsis";
      label.style.whiteSpace = "nowrap";
      label.textContent = col;
      headerRow.appendChild(label);
    }
    grid.appendChild(headerRow);

    // Rows
    for (const row of rowKeys) {
      const rowEl = document.createElement("div");
      rowEl.style.display = "flex";
      rowEl.style.alignItems = "center";
      rowEl.style.gap = `${opts.cellGap}px`;

      // Row label
      const rowLabel = document.createElement("span");
      rowLabel.style.fontSize = "11px";
      rowLabel.style.color = "#6b7280";
      rowLabel.style.width = "56px";
      rowLabel.style.textAlign = "right";
      rowLabel.style.overflow = "hidden";
      rowLabel.style.textOverflow = "ellipsis";
      rowLabel.style.whiteSpace = "nowrap";
      rowLabel.style.flexShrink = "0";
      rowLabel.textContent = row;
      rowEl.appendChild(rowLabel);

      for (const col of colKeys) {
        const key = `${col}|${row}`;
        const entry = cellMap.get(key);
        const val = entry ? (opts.aggregation === "avg" ? entry.value / entry.count : entry.value) : 0;
        const cell = createCell(col, row, val, entry?.cell.label);
        rowEl.appendChild(cell);
      }

      grid.appendChild(rowEl);
    }

    container.appendChild(grid);
  }

  function createCell(x: string, y: string | undefined, value: number, label?: string): HTMLElement {
    const el = document.createElement("div");
    el.dataset.heatmapX = x;
    if (y) el.dataset.heatmapY = y;
    el.dataset.heatmapValue = String(value);

    const hasValue = value !== 0 || currentData.some((d) => d.x === x && d.y === y);
    const bgColor = hasValue ? getColorForValue(value) : opts.emptyColor;

    el.style.cssText = `
      width:${opts.cellSize}px;height:${opts.cellSize}px;border-radius:${opts.borderRadius}px;
      background:${bgColor};cursor:pointer;transition:transform 0.1s,box-shadow 0.15s;
      flex-shrink:0;position:relative;
    `;

    el.addEventListener("mouseenter", (e) => {
      el.style.transform = "scale(1.3)";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
      el.style.zIndex = "10";
      if (opts.showTooltip) {
        const cellData: HeatmapCell = { x, y, value, label };
        showTooltip(cellData, e.clientX, e.clientY);
      }
      opts.onCellHover?.({ x, y, value, label }, e);
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
      el.style.boxShadow = "";
      el.style.zIndex = "";
      hideTooltip();
      opts.onCellHover?.(null, {} as MouseEvent);
    });

    el.addEventListener("click", (e) => {
      opts.onCellClick?.({ x, y, value, label }, e);
    });

    return el;
  }

  function renderLegend(parent: HTMLElement): void {
    const legend = document.createElement("div");
    legend.className = "heatmap-legend";
    const isVertical = opts.legendPosition === "right" || opts.legendPosition === "left";

    legend.style.cssText = `
      display:flex;${isVertical ? "flex-direction:column" : "flex-direction:row"};
      align-items:center;gap:4px;font-size:11px;color:#6b7280;
      ${opts.legendPosition === "right" ? "margin-left:8px" : ""}
      ${opts.legendPosition === "left" ? "margin-right:8px;order:-1" : ""}
      ${opts.legendPosition === "top" ? "margin-bottom:8px;order:-1" : ""}
      ${opts.legendPosition === "bottom" ? "margin-top:8px" : ""}
    `;

    const stops = opts.colorStops ?? SEQUENTIAL_COLORS;
    const isDiverging = opts.colorScale === "diverging";

    if (isVertical) {
      // Vertical gradient bar
      const bar = document.createElement("div");
      bar.style.width = "12px";
      bar.style.height = "100px";
      bar.style.borderRadius = "6px";
      bar.style.background = isDiverging
        ? `linear-gradient(to top, ${stops.map((s) => s.color).join(", ")})`
        : `linear-gradient(to top, ${stops[0]?.color ?? "#eee"}, ${stops[stops.length - 1]?.color ?? "#333"})`;
      legend.appendChild(bar);

      const labels = document.createElement("div");
      labels.style.display = "flex";
      labels.style.flexDirection = "column";
      labels.style.justifyContent = "space-between";
      labels.style.height = "100px";
      labels.style.marginLeft = "6px";

      const stats = computeStats();
      const lo = document.createElement("span");
      lo.textContent = opts.legendLabelFormat?.(stats.max) ?? formatNumber(stats.max);
      const hi = document.createElement("span");
      hi.textContent = opts.legendLabelFormat?.(stats.min) ?? formatNumber(stats.min);
      labels.appendChild(lo);
      labels.appendChild(hi);
      legend.appendChild(labels);
    } else {
      // Horizontal gradient bar
      const less = document.createElement("span");
      less.textContent = "Less";
      legend.appendChild(less);

      const bar = document.createElement("div");
      bar.style.width = "120px";
      bar.style.height = "12px";
      bar.style.borderRadius = "6px";
      bar.style.background = isDiverging
        ? `linear-gradient(to right, ${stops.map((s) => s.color).join(", ")})`
        : `linear-gradient(to right, ${stops[0]?.color ?? "#eee"}, ${stops[stops.length - 1]?.color ?? "#333"})`;
      legend.appendChild(bar);

      const more = document.createElement("span");
      more.textContent = "More";
      legend.appendChild(more);
    }

    parent.appendChild(legend);
  }

  // --- Helpers ---

  function formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatNumber(n: number): string {
    if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toFixed(n % 1 === 0 ? 0 : 1);
  }

  // --- Instance API ---

  render();

  const instance: HeatmapInstance = {
    element: root,

    setData(data: HeatmapCell[]) {
      currentData = [...data];
      render();
    },

    getData() { return [...currentData]; },

    getCell(x: string, y?: string): HTMLElement | null {
      return root.querySelector(`[data-heatmap-x="${x}"]${y ? `[data-heatmap-y="${y}"]` : ""}`);
    },

    highlightCell(x: string, y?: string) {
      this.clearHighlight();
      const cell = this.getCell(x, y);
      if (cell) {
        cell.style.outline = "2px solid #f59e0b";
        cell.style.outlineOffset = "1px";
        highlightedCell = cell;
      }
    },

    clearHighlight() {
      if (highlightedCell) {
        highlightedCell.style.outline = "";
        highlightedCell.style.outlineOffset = "";
        highlightedCell = null;
      }
    },

    getStats: computeStats,

    destroy() {
      destroyed = true;
      root.innerHTML = "";
      container.style.cssText = "";
      if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
    },
  };

  return instance;
}
