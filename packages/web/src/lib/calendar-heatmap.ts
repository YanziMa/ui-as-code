/**
 * Calendar Heatmap: GitHub-style contribution activity heatmap with
 * color intensity levels, month labels, day-of-week headers, tooltips,
 * hover effects, date range selection, and summary statistics.
 */

// --- Types ---

export type HeatmapColorScheme = "green" | "blue" | "red" | "purple" | "orange" | "custom";

export interface HeatmapDataPoint {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Value / count */
  value: number;
  /** Optional label for tooltip */
  label?: string;
}

export interface HeatmapOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data points */
  data: HeatmapDataPoint[];
  /** Year to display */
  year?: number;
  /** Color scheme */
  colorScheme?: HeatmapColorScheme;
  /** Custom colors array (5 levels: 0=none, 1-4=intensity) */
  colors?: string[];
  /** Cell size (px) */
  cellSize?: number;
  /** Gap between cells (px) */
  cellGap?: number;
  /** Month label font size */
  monthFontSize?: number;
  /** Day of week label font size */
  dowFontSize?: number;
  /** Show month labels? */
  showMonthLabels?: boolean;
  /** Show day-of-week headers? */
  showDowHeaders?: boolean;
  /** Show tooltip on hover? */
  showTooltip?: boolean;
  /** Locale for date formatting */
  locale?: string;
  /** Start day of week (0=Sun, 1=Mon) */
  startDayOfWeek?: number;
  /** Background color */
  background?: string;
  /** Border radius for cells */
  cellRadius?: number;
  /** Empty cell color */
  emptyColor?: string;
  /** Border color */
  borderColor?: string;
  /** On cell click callback */
  onCellClick?: (point: HeatmapDataPoint | null, date: string) => void;
  /** On cell hover callback */
  onCellHover?: (point: HeatmapDataPoint | null, date: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface HeatmapInstance {
  element: HTMLElement;
  /** Update data */
  setData: (data: HeatmapDataPoint[]) => void;
  /** Set year */
  setYear: (year: number) => void;
  /** Get statistics */
  getStats: () => { total: number; max: number; avg: number; daysActive: number; totalDays: number };
  /** Destroy */
  destroy: () => void;
}

// --- Color Schemes ---

const SCHEMES: Record<HeatmapColorScheme, string[]> = {
  green: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  blue: ["#ebedf0", "#c6e4ff", "#79b8ff", "#218bff", "#0851a1"],
  red: ["#ffebe9", "#ffa198", "#f85149", #da3633", "#a40726"],
  purple: ["#ebedf0", "#d2a8ff", "#a371f7", "#8957e5", "#6e40c9"],
  orange: ["#fff1df", "#ffd699", "#f0883e", "#db6d28", "#bd561d"],
  custom: [],
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Main Factory ---

export function createCalendarHeatmap(options: HeatmapOptions): HeatmapInstance {
  const opts = {
    year: options.year ?? new Date().getFullYear(),
    colorScheme: options.colorScheme ?? "green",
    colors: options.colors ?? [],
    cellSize: options.cellSize ?? 11,
    cellGap: options.cellGap ?? 3,
    monthFontSize: options.monthFontSize ?? 11,
    dowFontSize: options.dowFontSize ?? 10,
    showMonthLabels: options.showMonthLabels ?? true,
    showDowHeaders: options.showDowHeaders ?? true,
    showTooltip: options.showTooltip ?? true,
    locale: options.locale ?? "en-US",
    startDayOfWeek: options.startDayOfWeek ?? 0,
    background: options.background ?? "#fff",
    cellRadius: options.cellRadius ?? 2,
    emptyColor: options.emptyColor ?? "#ebedf0",
    borderColor: options.borderColor ?? "rgba(27,31,35,0.06)",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("CalendarHeatmap: container not found");

  let data: HeatmapDataPoint[] = [...options.data];
  let destroyed = false;

  // Resolve colors
  function getColors(): string[] {
    if (opts.colors.length >= 5) return opts.colors;
    const scheme = SCHEMES[opts.colorScheme] ?? SCHEMES.green;
    return [...scheme];
  }

  // Build data map
  function getDataMap(): Map<string, HeatmapDataPoint> {
    const map = new Map<string, HeatmapDataPoint>();
    for (const p of data) {
      map.set(p.date, p);
    }
    return map;
  }

  // Compute levels
  function computeLevels(dataMap: Map<string, HeatmapDataPoint>): { max: number; levels: number[] } {
    const values = Array.from(dataMap.values()).map(d => d.value).filter(v => v > 0);
    if (values.length === 0) return { max: 0, levels: [0, 0, 0, 0] };
    const max = Math.max(...values);
    // Quartile-based thresholds
    const sorted = values.slice().sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
    const med = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
    return { max, levels: [q1, med, q3, max] };
  }

  // Tooltip element
  let tooltipEl: HTMLElement | null = null;
  if (opts.showTooltip) {
    tooltipEl = document.createElement("div");
    tooltipEl.style.cssText = `
      position:fixed;z-index:9999;padding:6px 10px;border-radius:6px;
      background:#1f2937;color:#fff;font-size:11px;font-family:-apple-system,sans-serif;
      pointer-events:none;opacity:0;transition:opacity 0.15s;white-space:nowrap;
      box-shadow:0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(tooltipEl);
  }

  // Root
  const root = document.createElement("div");
  root.className = `calendar-heatmap ${opts.className}`;
  root.style.cssText = `
    display:inline-block;background:${opts.background};padding:8px 16px 0;
    border-radius:6px;font-family:-apple-system,sans-serif;position:relative;
  `;
  container.appendChild(root);

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";

    const dataMap = getDataMap();
    const { levels } = computeLevels(dataMap);
    const colors = getColors();
    const year = opts.year;

    // Grid dimensions: 53 weeks x 7 days (or 54 for some years)
    const weeksInYear = getWeeksInYear(year);
    const cols = weeksInYear;
    const rows = 7;

    // Layout: left side for DOW headers, top for month labels
    const headerW = opts.showDowHeaders ? 24 : 0;
    const gridW = cols * (opts.cellSize + opts.cellGap) - opts.cellGap;
    const gridH = rows * (opts.cellSize + opts.cellGap) - opts.cellGap;

    // DOW headers
    if (opts.showDowHeaders) {
      const dowRow = document.createElement("div");
      dowRow.style.cssText = `display:flex;flex-direction:column;gap:${opts.cellGap}px;margin-right:4px;`;
      for (let d = 0; d < 7; d++) {
        const di = (d + opts.startDayOfWeek) % 7;
        const lbl = document.createElement("span");
        lbl.style.cssText = `
          width:${headerW}px;height:${opts.cellSize}px;line-height:${opts.cellSize}px;
          text-align:center;font-size:${opts.dowFontSize}px;color:#9ca3af;
        `;
        lbl.textContent = DOW_LABELS[di].charAt(0);
        dowRow.appendChild(lbl);
      }
      root.appendChild(dowRow);
    }

    // Grid wrapper (grid + month labels above)
    const gridWrap = document.createElement("div");
    gridWrap.style.cssText = "display:inline-flex;flex-direction:column;";

    // Month labels row
    if (opts.showMonthLabels) {
      const monthRow = document.createElement("div");
      monthRow.style.cssText = `display:flex;height:16px;margin-bottom:4px;position:relative;width:${gridW}px;`;

      // Place month labels at their approximate column positions
      for (let m = 0; m < 12; m++) {
        const firstOfMonth = new Date(year, m, 1);
        const weekNum = getWeekNumber(firstOfMonth, opts.startDayOfWeek);
        const xPos = weekNum * (opts.cellSize + opts.cellGap);

        // Only show if visible
        if (xPos < gridW - 20) {
          const mlbl = document.createElement("span");
          mlbl.style.cssText = `
            position:absolute;left:${xPos}px;font-size:${opts.monthFontSize}px;color:#9ca3af;
          `;
          mlbl.textContent = MONTH_NAMES[m];
          monthRow.appendChild(mlbl);
        }
      }
      gridWrap.appendChild(monthRow);
    }

    // Cell grid
    const grid = document.createElement("div");
    grid.style.cssText = `display:flex;flex-direction:column;gap:${opts.cellGap}px;`;

    for (let row = 0; row < rows; row++) {
      const weekRow = document.createElement("div");
      weekRow.style.cssText = `display:flex;gap:${opts.cellGap}px;`;

      for (let col = 0; col < cols; col++) {
        const date = getDateFromWeekCol(year, col, row, opts.startDayOfWeek);
        if (!date) {
          // Empty filler cell
          const empty = document.createElement("div");
          empty.style.cssText = `width:${opts.cellSize}px;height:${opts.cellSize}px;`;
          weekRow.appendChild(empty);
          continue;
        }

        const dateStr = formatDateKey(date);
        const point = dataMap.get(dateStr);
        const value = point?.value ?? 0;

        // Determine color level (0-4)
        let level = 0;
        if (value > 0) {
          if (value <= levels[0]) level = 1;
          else if (value <= levels[1]) level = 2;
          else if (value <= levels[2]) level = 3;
          else level = 4;
        }

        const cell = document.createElement("div");
        cell.dataset.date = dateStr;
        cell.style.cssText = `
          width:${opts.cellSize}px;height:${opts.cellSize}px;border-radius:${opts.cellRadius}px;
          background:${colors[level] ?? opts.emptyColor};
          cursor:pointer;transition:transform 0.1s,stroke 0.1s;
          outline:1px solid transparent;outline-offset:-1px;
        `;

        // Hover
        cell.addEventListener("mouseenter", (e) => {
          cell.style.transform = "scale(1.3)";
          cell.style.outline = `1px solid rgba(0,0,0,0.2)`;

          if (tooltipEl && opts.showTooltip) {
            const formatted = date.toLocaleDateString(opts.locale, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
            const valLabel = point?.label ?? String(value);
            tooltipEl.innerHTML = `<strong>${formatted}</strong><br/>${valLabel} contribution${value !== 1 ? "s" : ""}`;
            tooltipEl.style.opacity = "1";
            tooltipEl.style.left = `${(e as MouseEvent).clientX + 10}px`;
            tooltipEl.style.top = `${(e as MouseEvent).clientY - 30}px`;
          }

          opts.onCellHover?.(point ?? null, dateStr);
        });

        cell.addEventListener("mouseleave", () => {
          cell.style.transform = "";
          cell.style.outline = "";
          if (tooltipEl) tooltipEl.style.opacity = "0";
        });

        cell.addEventListener("click", () => {
          opts.onCellClick?.(point ?? null, dateStr);
        });

        weekRow.appendChild(cell);
      }

      grid.appendChild(weekRow);
    }

    gridWrap.appendChild(grid);
    root.appendChild(gridWrap);

    // Summary footer
    const footer = document.createElement("div");
    footer.style.cssText = `
      display:flex;align-items:center;gap:6px;margin-top:8px;padding-top:8px;
      font-size:10px;color:#9ca3af;justify-content:flex-end;width:100%;
    `;
    footer.textContent = "Less ";
    for (let i = 0; i < 5; i++) {
      const swatch = document.createElement("span");
      swatch.style.cssText = `width:${opts.cellSize}px;height:${opts.cellSize}px;border-radius:${opts.cellRadius}px;background:${colors[i] ?? opts.emptyColor};display:inline-block;`;
      footer.appendChild(swatch);
    }
    footer.appendChild(document.createTextNode(" More"));
    root.appendChild(footer);
  }

  // --- Date Helpers ---

  function formatDateKey(d: Date): string {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }

  function getWeekNumber(date: Date, startDow: number): number {
    const jan1 = new Date(date.getFullYear(), 0, 1);
    const jan1Dow = jan1.getDay();
    // Adjust so that startDow is the first column
    const offset = (jan1Dow - startDow + 7) % 7;
    const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
    return Math.floor((dayOfYear + offset) / 7);
  }

  function getDateFromWeekCol(year: number, week: number, dow: number, startDow: number): Date | null {
    const jan1 = new Date(year, 0, 1);
    const jan1Dow = jan1.getDay();
    const offset = (jan1Dow - startDow + 7) % 7;
    const dayOfYear = week * 7 + dow - offset;
    if (dayOfYear < 0 || dayOfYear > 365 + (isLeapYear(year) ? 1 : 0)) return null;
    const d = new Date(year, 0, 1 + dayOfYear);
    // Check it's actually in the right year and matches expected DOW
    if (d.getFullYear() !== year) return null;
    return d;
  }

  function getWeeksInYear(year: number): number {
    const dec31 = new Date(year, 11, 31);
    const jan1 = new Date(year, 0, 1);
    const jan1Dow = jan1.getDay();
    const offset = (jan1Dow - opts.startDayOfWeek + 7) % 7;
    const lastDayOfYear = Math.floor((dec31.getTime() - jan1.getTime()) / 86400000);
    return Math.floor((lastDayOfYear + offset) / 7) + 1;
  }

  function isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: HeatmapInstance = {
    element: root,

    setData(newData: HeatmapDataPoint[]) {
      data = newData;
      render();
    },

    setYear(y: number) {
      opts.year = y;
      render();
    },

    getStats() {
      const dataMap = getDataMap();
      const activeValues = Array.from(dataMap.values()).filter(d => d.value > 0);
      const total = activeValues.reduce((sum, d) => sum + d.value, 0);
      const max = activeValues.length > 0 ? Math.max(...activeValues.map(d => d.value)) : 0;
      return {
        total,
        max,
        avg: activeValues.length > 0 ? total / activeValues.length : 0,
        daysActive: activeValues.length,
        totalDays: getWeeksInYear(opts.year) * 7,
      };
    },

    destroy() {
      destroyed = true;
      if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
