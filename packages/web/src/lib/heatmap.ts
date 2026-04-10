/**
 * Heatmap: Calendar-style and matrix-style heatmap visualization with
 * color scales, tooltips, legends, interactive cells, and data grouping.
 */

// --- Types ---

export type HeatmapType = "calendar" | "matrix";
export type ColorScale = "green" | "blue" | "red" | "purple" | "warm" | "cool" | "custom";

export interface HeatmapCell {
  /** X-axis category / date string */
  x: string;
  /** Y-axis category */
  y: string;
  /** Value (determines color intensity) */
  value: number;
  /** Optional label for tooltip */
  label?: string;
}

export interface HeatmapOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data cells */
  data: HeatmapCell[];
  /** Heatmap type */
  type?: HeatmapType;
  /** Color scale */
  colorScale?: ColorScale;
  /** Custom color scale (array of hex colors from low to high) */
  customColors?: string[];
  /** Cell size in px (matrix mode, default: 20) */
  cellSize?: number;
  /** Gap between cells (default: 2) */
  gap?: number;
  /** Show legend? */
  showLegend?: boolean;
  /** Show values on hover? */
  showTooltip?: boolean;
  /** Show axis labels? */
  showLabels?: boolean;
  /** Min value for color mapping (auto from data if null) */
  min?: number | null;
  /** Max value for color mapping (auto from data if null) */
  max?: number | null;
  /** Null/empty cell color */
  nullColor?: string;
  /** Border radius on cells */
  radius?: number;
  /** Callback when cell clicked */
  onCellClick?: (cell: HeatmapCell) => void;
  /** Callback when cell hovered */
  onCellHover?: (cell: HeatmapCell | null) => void;
  /** Custom CSS class */
  className?: string;
}

export interface HeatmapInstance {
  element: HTMLElement;
  setData: (data: HeatmapCell[]) => void;
  setOptions: (opts: Partial<HeatmapOptions>) => void;
  destroy: () => void;
}

// --- Color Scales ---

const SCALES: Record<ColorScale, string[]> = {
  green: ["#f0fdf4", "#bbf7d0", "#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#166534"],
  blue:  ["#eff6ff", "#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#2563eb", "#1d4ed8", "#1e40af"],
  red:   ["#fef2f2", "#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#b91c1c", "#991b1b"],
  purple:["#faf5ff", "#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7", "#9333ea", "#7e22ce", "#6b21a8"],
  warm:  ["#fffbeb", "#fef3c7", "#fde68a", "#fcd34d", "#f59e0b", "#d97706", "#b45309", "#92400e"],
  cool:  ["#f0f9ff", "#e0f2fe", "#bae6fd", "#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1"],
};

function getColors(scale: ColorScale, custom: string[] | undefined): string[] {
  if (custom && custom.length > 0) return custom;
  return SCALES[scale] ?? SCALES.green;
}

function getColorForValue(value: number, min: number, max: number, colors: string[]): string {
  if (max === min) return colors[Math.floor(colors.length / 2)]!;
  const ratio = (value - min) / (max - min);
  const idx = Math.min(Math.floor(ratio * colors.length), colors.length - 1);
  return colors[idx]!;
}

// --- Main Factory ---

export function createHeatmap(options: HeatmapOptions): HeatmapInstance {
  const opts = {
    type: options.type ?? "calendar",
    colorScale: options.colorScale ?? "green",
    cellSize: options.cellSize ?? 14,
    gap: options.gap ?? 3,
    showLegend: options.showLegend ?? true,
    showTooltip: options.showTooltip ?? true,
    showLabels: options.showLabels ?? true,
    min: options.min ?? null,
    max: options.max ?? null,
    nullColor: options.nullColor ?? "#f3f4f6",
    radius: options.radius ?? 2,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Heatmap: container not found");

  container.className = `heatmap ${opts.className}`;
  let data = options.data;
  let destroyed = false;

  function getStats(): { min: number; max: number } {
    const values = data.map((d) => d.value).filter((v) => v !== null && !isNaN(v));
    if (values.length === 0) return { min: 0, max: 100 };
    const minVal = opts.min !== null ? opts.min : Math.min(...values);
    const maxVal = opts.max !== null ? opts.max : Math.max(...values);
    return { min: minVal, max: maxVal };
  }

  function render(): void {
    container.innerHTML = "";
    const colors = getColors(opts.colorScale, opts.customColors);
    const stats = getStats();

    if (opts.type === "calendar") {
      renderCalendar(colors, stats);
    } else {
      renderMatrix(colors, stats);
    }
  }

  function renderMatrix(colors: string[], stats: { min: number; max: number }): void {
    // Get unique x/y categories
    const xCategories = [...new Set(data.map((d) => d.x))];
    const yCategories = [...new Set(data.map((d) => d.y))].reverse();

    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:inline-block;font-family:-apple-system,sans-serif;font-size:11px;";

    // Y-axis labels + grid
    const grid = document.createElement("div");
    grid.style.cssText = "display:flex;";

    // Y labels
    if (opts.showLabels) {
      const yAxis = document.createElement("div");
      yAxis.style.cssText = `display:flex;flex-direction:column;padding-right:8px;gap:${opts.gap}px;justify-content:space-around;`;
      for (const y of yCategories) {
        const lbl = document.createElement("span");
        lbl.style.cssText = "text-align:right;color:#6b7280;font-size:10px;white-space:nowrap;height:" + opts.cellSize + "px;line-height:" + opts.cellSize + "px;";
        lbl.textContent = y;
        yAxis.appendChild(lbl);
      }
      grid.appendChild(yAxis);
    }

    // Cells
    const cellsArea = document.createElement("div");
    cellsArea.style.cssText = `display:flex;flex-direction:column;gap:${opts.gap}px;`;

    for (const y of yCategories) {
      const row = document.createElement("div");
      row.style.cssText = `display:flex;gap:${opts.gap}px;`;
      for (const x of xCategories) {
        const cellData = data.find((d) => d.x === x && d.y === y);
        const val = cellData?.value;
        const hasValue = val !== undefined && val !== null && !isNaN(val);

        const cell = document.createElement("div");
        cell.style.cssText = `
          width:${opts.cellSize}px;height:${opts.cellSize}px;border-radius:${opts.radius}px;
          background:${hasValue ? getColorForValue(val!, stats.min, stats.max, colors) : opts.nullColor};
          cursor:pointer;transition:transform 0.1s,box-shadow 0.1s;position:relative;
        `;
        cell.dataset.x = x;
        cell.dataset.y = y;

        if (hasValue && cellData) {
          cell.addEventListener("mouseenter", () => {
            cell.style.transform = "scale(1.3)";
            cell.style.zIndex = "10";
            showTooltip(cell, cellData, val!);
            opts.onCellHover?.(cellData);
          });
          cell.addEventListener("mouseleave", () => {
            cell.style.transform = "";
            cell.style.zIndex = "";
            hideTooltip();
            opts.onCellHover?.(null);
          });
          cell.addEventListener("click", () => opts.onCellClick?.(cellData));
        }

        row.appendChild(cell);
      }
      cellsArea.appendChild(row);
    }
    grid.appendChild(cellsArea);
    wrapper.appendChild(grid);

    // X-axis labels
    if (opts.showLabels) {
      const spacer = document.createElement("div");
      spacer.style.cssText = `width:${opts.showLabels ? 50 : 0}px;flex-shrink:0;`;
      wrapper.appendChild(spacer);

      const xAxis = document.createElement("div");
      xAxis.style.cssText = `display:flex;gap:${opts.gap}px;margin-left:${opts.showLabels ? 58 : 0}px;`;
      for (const x of xCategories) {
        const lbl = document.createElement("span");
        lbl.style.cssText = `font-size:9px;color:#9ca3af;text-align:center;width:${opts.cellSize}px;display:block;transform:rotate(-45deg);transform-origin:left top;`;
        lbl.textContent = x.length > 5 ? x.slice(0, 5) + ".." : x;
        xAxis.appendChild(lbl);
      }
      wrapper.appendChild(xAxis);
    }

    container.appendChild(wrapper);

    // Legend
    if (opts.showLegend) renderLegend(wrapper, colors, stats);
  }

  function renderCalendar(_colors: string[], _stats: { min: number; max: number }): void {
    // Simplified calendar heatmap (year view)
    const weeks: Map<string, HeatmapCell[]> = new Map();
    for (const d of data) {
      if (!weeks.has(d.x)) weeks.set(d.x, []);
      weeks.get(d.x)!.push(d);
    }

    const colors = getColors(opts.colorScale, opts.customColors);
    const stats = getStats();

    const calWrapper = document.createElement("div");
    calWrapper.style.cssText = "font-family:-apple-system,sans-serif;";

    // Month headers
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const headerRow = document.createElement("div");
    headerRow.style.cssText = "display:flex;gap:3px;margin-bottom:4px;padding-left:24px;";
    for (let i = 0; i < 12; i++) {
      const mEl = document.createElement("span");
      mEl.style.cssText = "font-size:10px;color:#6b7280;width:calc((100% - 36px) / 12);text-align:center;";
      mEl.textContent = months[i]!;
      headerRow.appendChild(mEl);
    }
    calWrapper.appendChild(headerRow);

    // Day-of-week labels
    const dowRow = document.createElement("div");
    dowRow.style.cssText = "display:flex;gap:3px;margin-bottom:4px;";
    const dowLabel = document.createElement("span");
    dowLabel.style.cssText = "font-size:9px;color:#9ca3af;width:16px;text-align:center;line-height:14px;";
    dowLabel.textContent = "";
    dowRow.appendChild(dowLabel);
    for (const day of ["","M","","W","","F",""]) {
      const dEl = document.createElement("span");
      dEl.style.cssText = "font-size:9px;color:#9ca3af;width:14px;text-align:center;";
      dEl.textContent = day;
      dowRow.appendChild(dEl);
    }
    calWrapper.appendChild(dowRow);

    // Grid (53 weeks x 7 days)
    for (let w = 0; w < 53; w++) {
      const weekRow = document.createElement("div");
      weekRow.style.cssText = "display:flex;gap:3px;";

      for (let d = 0; d < 7; d++) {
        const key = `${w}-${d}`;
        const cellData = data.find((c) => c.x === String(w) && c.y === String(d));
        const val = cellData?.value;
        const hasValue = val !== undefined && val !== null && !isNaN(val);

        const cell = document.createElement("div");
        cell.style.cssText = `
          width:12px;height:12px;border-radius:2px;
          background:${hasValue ? getColorForValue(val!, stats.min, stats.max, colors) : opts.nullColor};
          cursor:pointer;transition:transform 0.1s;
        `;
        if (hasValue && cellData) {
          cell.title = `${cellData.label ?? `${cellData.x}/${cellData.y}`}: ${val}`;
          cell.addEventListener("click", () => opts.onCellClick?.(cellData));
        }
        weekRow.appendChild(cell);
      }
      calWrapper.appendChild(weekRow);
    }

    container.appendChild(calWrapper);
  }

  let tooltipEl: HTMLDivElement | null = null;

  function showTooltip(anchor: HTMLElement, cell: HeatmapCell, value: number): void {
    if (!opts.showTooltip) return;
    hideTooltip();

    tooltipEl = document.createElement("div");
    tooltipEl.className = "heatmap-tooltip";
    tooltipEl.style.cssText = `
      position:absolute;z-index:10000;background:#1e1b4b;color:#fff;padding:6px 10px;
      border-radius:6px;font-size:11px;font-weight:500;pointer-events:none;
      box-shadow:0 4px 12px rgba(0,0,0,0.2);white-space:nowrap;
    `;
    tooltipEl.textContent = `${cell.label ?? `${cell.x} / ${cell.y}`}: ${typeof value === 'number' ? value.toFixed(1) : value}`;

    const rect = anchor.getBoundingClientRect();
    tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
    tooltipEl.style.top = `${rect.top - 36}px`;
    tooltipEl.style.transform = "translateX(-50%)";

    document.body.appendChild(tooltipEl);
  }

  function hideTooltip(): void {
    tooltipEl?.remove();
    tooltipEl = null;
  }

  function renderLegend(parent: HTMLElement, colors: string[], stats: { min: number; max: number }): void {
    const legend = document.createElement("div");
    legend.style.cssText = "display:flex;align-items:center;gap:6px;margin-top:12px;justify-content:flex-end;";

    const label = document.createElement("span");
    label.style.cssText = "font-size:10px;color:#9ca3af;";
    label.textContent = "Less";
    legend.appendChild(label);

    for (let i = 0; i < colors.length; i++) {
      const swatch = document.createElement("div");
      swatch.style.cssText = `width:10px;height:10px;border-radius:2px;background:${colors[i]};`;
      legend.appendChild(swatch);
    }

    const labelEnd = document.createElement("span");
    labelEnd.style.cssText = "font-size:10px;color:#9ca3af;";
    labelEnd.textContent = "More";
    legend.appendChild(labelEnd);

    parent.appendChild(legend);
  }

  render();

  return {
    element: container,

    setData(newData: HeatmapCell[]) {
      data = newData;
      render();
    },

    setOptions(newOpts: Partial<HeatmapOptions>) {
      Object.assign(opts, newOpts);
      render();
    },

    destroy() {
      destroyed = true;
      hideTooltip();
      container.innerHTML = "";
    },
  };
}
