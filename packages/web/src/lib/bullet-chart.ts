/**
 * Bullet Chart: KPI bullet graph with comparative measures, qualitative
 * ranges, target markers, value bars, horizontal/vertical layout,
 * multiple bullets per chart, and tooltips.
 */

// --- Types ---

export type RangeType = "gray" | "temperature" | "traffic-light" | "custom";

export interface BulletMeasure {
  /** Title/label */
  title: string;
  /** Subtitle (optional) */
  subtitle?: string;
  /** Actual value */
  value: number;
  /** Target/comparative value */
  target?: number;
  /** Range limits (e.g., [0, 50, 75, 100] for 3 ranges) */
  ranges: number[];
  /** Override color for the value bar */
  valueColor?: string;
  /** Override target marker color */
  targetColor?: string;
  /** Custom range colors (must match ranges length - 1) */
  rangeColors?: string[];
}

export interface BulletChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data measures */
  measures: BulletMeasure[];
  /** Width (px) */
  width?: number;
  /** Height per bullet (px) */
  bulletHeight?: number;
  /** Spacing between bullets (px) */
  spacing?: number;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Range type (color scheme) */
  rangeType?: RangeType;
  /** Custom range colors for default type */
  customRangeColors?: string[];
  /** Value bar width ratio (0-1 of bullet height) */
  barWidthRatio?: number;
  /** Target marker style ("line" | "triangle" | "diamond") */
  targetStyle?: string;
  /** Target marker thickness (px) */
  targetThickness?: number;
  /** Show value text? */
  showValue?: boolean;
  /** Value position ("inside" | "outside" | "end") */
  valuePosition?: string;
  /** Show percentage of target? */
  showPercentage?: boolean;
  /** Number format decimals */
  decimals?: number;
  /** Max value (auto if omitted) */
  maxValue?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
  /** Bullet click callback */
  onBulletClick?: (measure: BulletMeasure, index: number, event: MouseEvent) => void;
}

export interface BulletChartInstance {
  element: HTMLElement;
  /** Update measures */
  setMeasures: (measures: BulletMeasure[]) => void;
  /** Update single measure */
  updateMeasure: (index: number, measure: Partial<BulletMeasure>) => void;
  /** Export as HTML string */
  exportHTML: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Color Schemes ---

const RANGE_SCHEMES: Record<RangeType, string[]> = {
  gray:       ["#e5e7eb", "#d1d5db", "#9ca3af"],
  temperature:["#2563eb", "#f59e0b", "#dc2626"],
  "traffic-light": ["#22c55e", "#f59e0b", "#ef4444"],
  custom:     [],
};

// --- Main Factory ---

export function createBulletChart(options: BulletChartOptions): BulletChartInstance {
  const opts = {
    width: options.width ?? 500,
    bulletHeight: options.bulletHeight ?? 30,
    spacing: options.spacing ?? 12,
    orientation: options.orientation ?? "horizontal",
    rangeType: options.rangeType ?? "gray",
    customRangeColors: options.customRangeColors ?? [],
    barWidthRatio: options.barWidthRatio ?? 0.65,
    targetStyle: options.targetStyle ?? "line",
    targetThickness: options.targetThickness ?? 2,
    showValue: options.showValue ?? true,
    valuePosition: options.valuePosition ?? "outside",
    showPercentage: options.showPercentage ?? true,
    decimals: options.decimals ?? 0,
    maxValue: options.maxValue ?? 0,
    animationDuration: options.animationDuration ?? 600,
    tooltip: options.tooltip ?? true,
    padding: options.padding ?? { top: 16, right: 80, bottom: 16, left: 120 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("BulletChart: container not found");

  let measures: BulletMeasure[] = JSON.parse(JSON.stringify(options.measures));
  let destroyed = false;

  const pad = opts.padding;
  const isHoriz = opts.orientation === "horizontal";
  const barW = isHoriz ? opts.bulletHeight * opts.barWidthRatio : opts.barWidthRatio;
  const totalHeight = measures.length * (opts.bulletHeight + opts.spacing) + pad.top! + pad.bottom!;

  // Root element
  const root = document.createElement("div");
  root.className = `bullet-chart ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;width:${opts.width}px;
    position:relative;overflow:visible;
  `;
  container.appendChild(root);

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";

    if (measures.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "padding:40px;text-align:center;color:#9ca3af;";
      empty.textContent = "No data";
      root.appendChild(empty);
      return;
    }

    // Determine global max
    const maxVal = opts.maxValue || Math.max(
      ...measures.map(m => Math.max(m.value, m.target ?? 0, ...(m.ranges ?? [])))
    ) * 1.05 || 100;

    const rangeColors = opts.rangeType === "custom"
      ? opts.customRangeColors
      : RANGE_SCHEMES[opts.rangeType];

    for (let i = 0; i < measures.length; i++) {
      const m = measures[i]!;
      const yOffset = pad.top! + i * (opts.bulletHeight + opts.spacing);

      const row = document.createElement("div");
      row.style.cssText = `
        display:flex;align-items:center;position:relative;
        ${isHoriz ? `height:${opts.bulletHeight}px;margin-bottom:${i < measures.length - 1 ? opts.spacing : 0}px;` : ""}
      `;

      // Title column
      const titleCol = document.createElement("div");
      titleCol.style.cssText = `
        ${isHoriz ? `width:${pad.left}px;text-align:right;padding-right:12px;flex-shrink:0;` : ""}
        display:flex;flex-direction:column;justify-content:center;
      `;

      const titleEl = document.createElement("div");
      titleEl.style.cssText = "font-size:13px;font-weight:600;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      titleEl.textContent = m.title;
      titleCol.appendChild(titleEl);

      if (m.subtitle) {
        const subEl = document.createElement("div");
        subEl.style.cssText = "font-size:11px;color:#9ca3af;margin-top:1px;";
        subEl.textContent = m.subtitle;
        titleCol.appendChild(subEl);
      }

      row.appendChild(titleCol);

      // Chart area (ranges + bar + target)
      const chartArea = document.createElement("div");
      chartArea.style.cssText = `
        flex:1;position:relative;${isHoriz ? `height:${opts.bulletHeight * 0.6}px;` : `width:${opts.bulletHeight * 0.6}px;height:${Math.max(200, totalHeight - pad.top! - pad.bottom!)}px;`}
        background:#f9fafb;border-radius:4px;overflow:hidden;
      `;

      // Draw range segments
      const ranges = m.ranges ?? [maxVal * 0.33, maxVal * 0.66, maxVal];
      for (let ri = 0; ri < ranges.length; ri++) {
        const prev = ri === 0 ? 0 : ranges[ri - 1]!;
        const curr = ranges[ri]!;
        const seg = document.createElement("div");
        seg.style.position = "absolute";
        seg.style.background = rangeColors[ri % rangeColors.length] ?? "#e5e7eb";
        seg.style.opacity = "0.5";

        if (isHoriz) {
          seg.style.left = `${(prev / maxVal) * 100}%`;
          seg.style.width = `${((curr - prev) / maxVal) * 100}%`;
          seg.style.top = "0"; seg.style.bottom = "0";
        } else {
          seg.style.top = `${(1 - curr / maxVal) * 100}%`;
          seg.style.height = `${((curr - prev) / maxVal) * 100}%`;
          seg.style.left = "0"; seg.style.right = "0";
        }

        chartArea.appendChild(seg);
      }

      // Value bar
      const valFrac = Math.min(m.value / maxVal, 1);
      const valBar = document.createElement("div");
      valBar.style.position = "absolute";
      valBar.style.background = m.valueColor ?? "#4f46e5";
      valBar.style.borderRadius = isHoriz ? "2px 0 0 2px" : "0 2px 2px 0";
      valBar.style.zIndex = "2";

      if (isHoriz) {
        valBar.style.left = "0";
        valBar.style.top = `${(opts.bulletHeight * 0.6 - opts.bulletHeight * barW) / 2}px`;
        valBar.style.width = "0";
        valBar.style.height = `${opts.bulletHeight * barW}px`;
        // Animate
        requestAnimationFrame(() => {
          valBar.style.transition = `width ${opts.animationDuration}ms ease-out`;
          valBar.style.width = `${valFrac * 100}%`;
        });
      } else {
        valBar.style.bottom = "0";
        valBar.style.left = `${(opts.bulletHeight * 0.6 - opts.bulletHeight * barW) / 2}px`;
        valBar.style.width = `${opts.bulletHeight * barW}px`;
        valBar.style.height = "0";
        requestAnimationFrame(() => {
          valBar.style.transition = `height ${opts.animationDuration}ms ease-out`;
          valBar.style.height = `${valFrac * 100}%`;
        });
      }

      chartArea.appendChild(valBar);

      // Target marker
      if (m.target != null) {
        const tgtFrac = Math.min(m.target / maxVal, 1);
        const marker = document.createElement("div");
        marker.style.position = "absolute";
        marker.style.zIndex = "3";
        marker.style.background = m.targetColor ?? "#374151";

        switch (opts.targetStyle) {
          case "triangle":
            marker.style.width = "0"; marker.style.height = "0";
            if (isHoriz) {
              marker.style.borderLeft = "8px solid #374151";
              marker.style.borderTop = "5px solid transparent";
              marker.style.borderBottom = "5px solid transparent";
              marker.style.left = `${tgtFrac * 100}%`;
              marker.style.top = "50%";
              marker.style.transform = "translate(-50%, -50%)";
            } else {
              marker.style.borderBottom = "8px solid #374151";
              marker.style.borderLeft = "5px solid transparent";
              marker.style.borderRight = "5px solid transparent";
              marker.style.top = `${(1 - tgtFrac) * 100}%`;
              marker.style.left = "50%";
              marker.style.transform = "translate(-50%, 50%)";
            }
            break;
          case "diamond":
            marker.style.width = "10px"; marker.style.height = "10px";
            marker.style.transform = "rotate(45deg)";
            if (isHoriz) {
              marker.style.left = `${tgtFrac * 100}%`;
              marker.style.top = "50%";
              marker.style.marginLeft = "-5px";
              marker.style.marginTop = "-5px";
            } else {
              marker.style.top = `${(1 - tgtFrac) * 100}%`;
              marker.style.left = "50%";
              marker.style.marginTop = "-5px";
              marker.style.marginLeft = "-5px";
            }
            break;
          default: // line
            if (isHoriz) {
              marker.style.left = `${tgtFrac * 100}%`;
              marker.style.top = "0";
              marker.style.width = `${opts.targetThickness}px`;
              marker.style.height = "100%";
              marker.style.transform = "translateX(-50%)";
            } else {
              marker.style.top = `${(1 - tgtFrac) * 100}%`;
              marker.style.left = "0";
              marker.style.width = "100%";
              marker.style.height = `${opts.targetThickness}px`;
              marker.style.transform = "translateY(50%)";
            }
        }

        chartArea.appendChild(marker);
      }

      row.appendChild(chartArea);

      // Value column
      if (opts.showValue) {
        const valCol = document.createElement("div");
        valCol.style.cssText = `
          ${isHoriz ? `width:${pad.right}px;padding-left:12px;flex-shrink:0;` : "margin-top:8px;"}
          display:flex;flex-direction:column;${isHoriz ? "" : "align-items:flex-start;"}
        `;

        const valText = document.createElement("span");
        valText.style.cssText = "font-size:14px;font-weight:700;color:#111827;";
        valText.textContent = formatNumber(m.value, opts.decimals);
        valCol.appendChild(valText);

        if (m.target != null && opts.showPercentage) {
          const pct = (m.value / m.target) * 100;
          const pctText = document.createElement("span");
          pctText.style.cssText = `font-size:11px;color:${pct >= 100 ? "#16a34a" : pct >= 75 ? "#f59e0b" : "#dc2626"};`;
          pctText.textContent = `${pct.toFixed(0)}% of target`;
          valCol.appendChild(pctText);
        }

        row.appendChild(valCol);
      }

      // Interactivity
      row.style.cursor = "pointer";
      row.addEventListener("click", (e) => opts.onBulletClick?.(m, i, e));
      row.addEventListener("mouseenter", () => { row.style.background = "#f9fafb"; });
      row.addEventListener("mouseleave", () => { row.style.background = ""; });

      root.appendChild(row);
    }
  }

  function formatNumber(val: number, dec: number): string {
    if (dec > 0) return val.toFixed(dec);
    return val.toLocaleString();
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: BulletChartInstance = {
    element: root,

    setMeasures(newMeasures: BulletMeasure[]) {
      measures = newMeasures.map(m => ({ ...m }));
      render();
    },

    updateMeasure(index: number, partial: Partial<BulletMeasure>) {
      if (index >= 0 && index < measures.length) {
        measures[index] = { ...measures[index]!, ...partial };
        render();
      }
    },

    exportHTML: () => root.outerHTML,

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
