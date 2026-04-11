/**
 * Statistics Utilities: Stat cards, sparklines, trend indicators,
 * comparison displays, mini charts, and data formatting for
 * dashboards and analytics views.
 */

// --- Types ---

export type TrendDirection = "up" | "down" | "neutral";
export type StatCardSize = "sm" | "md" | "lg";

export interface StatCardOptions {
  /** Main value to display */
  value: string | number;
  /** Label / title */
  label: string;
  /** Previous period value (for trend calculation) */
  previousValue?: string | number;
  /** Explicit trend direction */
  trend?: TrendDirection;
  /** Change percentage (overrides auto-calculation) */
  changePercent?: number;
  /** Icon (HTML string) */
  icon?: string;
  /** Icon background color */
  iconBg?: string;
  /** Color variant */
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  /** Size variant */
  size?: StatCardSize;
  /** Show sparkline? */
  showSparkline?: boolean;
  /** Sparkline data points */
  sparklineData?: number[];
  /** Sparkline color */
  sparklineColor?: string;
  /** Description text below the stat */
  description?: string;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface ComparisonBarOptions {
  /** Label */
  label: string;
  /** Current value */
  value: number;
  /** Maximum value (for bar width) */
  max: number;
  /** Compare-to value */
  compareValue: number;
  /** Compare-to label */
  compareLabel?: string;
  /** Show percentage labels? */
  showPercent?: boolean;
  /** Bar color */
  color?: string;
  /** Compare bar color */
  compareColor?: string;
  /** Height in px */
  height?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface MiniChartOptions {
  /** Data points */
  data: number[];
  /** Chart type */
  type?: "line" | "bar" | "area";
  /** Width in px */
  width?: number;
  /** Height in px */
  height?: number;
  /** Line/area color */
  color?: string;
  /** Fill color (for area) */
  fillOpacity?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Show data points as dots? */
  showDots?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

// --- Variant Colors ---

const VARIANT_STYLES: Record<string, { bg: string; text: string; iconBg: string; trendUp: string; trendDown: string }> = {
  "default": { bg: "#f9fafb", text: "#111827", iconBg: "#f3f4f6", trendUp: "#22c55e", trendDown: "#ef4444" },
  "primary": { bg: "#eff6ff", text: "#1e40af", iconBg: "#dbeafe", trendUp: "#22c55e", trendDown: "#ef4444" },
  "success": { bg: "#f0fdf4", text: "#166534", iconBg: "#dcfce7", trendUp: "#22c55e", trendDown: "#ef4444" },
  "warning": { bg: "#fffbeb", text: "#92400e", iconBg: "#fef3c7", trendUp: "#22c55e", trendDown: "#ef4444" },
  "danger": { bg: "#fef2f2", text: "#991b1b", iconBg: "#fee2e2", trendUp: "#22c55e", trendDown: "#ef4444" },
  "info": { bg: "#eff6ff", text: "#1e3a8a", iconBg: "#dbeafe", trendUp: "#22c55e", trendDown: "#ef4444" },
};

const SIZE_CONFIG: Record<StatCardSize, { padding: string; valueSize: string; labelSize: string }> = {
  "sm": { padding: "12px 14px", valueSize: "20px", labelSize: "11px" },
  "md": { padding: "16px 18px", valueSize: "26px", labelSize: "12px" },
  "lg": { padding: "20px 22px", valueSize: "32px", labelSize: "13px" },
};

// --- Helpers ---

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function formatChange(percent: number): string {
  const sign = percent >= 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

// --- Stat Card Factory ---

/**
 * Create a statistics card.
 *
 * @example
 * ```ts
 * const card = createStatCard({
 *   value: "$12,459",
 *   label: "Total Revenue",
 *   previousValue: "$10,200",
 *   icon: "&#128176;",
 *   variant: "success",
 * });
 * ```
 */
export function createStatCard(options: StatCardOptions): HTMLElement {
  const {
    value,
    label,
    previousValue,
    trend,
    changePercent,
    icon,
    iconBg,
    variant = "default",
    size = "md",
    showSparkline,
    sparklineData,
    sparklineColor,
    description,
    loading = false,
    onClick,
    className,
    container,
  } = options;

  const vs = VARIANT_STYLES[variant];
  const sc = SIZE_CONFIG[size];

  // Calculate change if not provided
  let displayTrend: TrendDirection = trend ?? "neutral";
  let displayChange: number | undefined = changePercent;

  if (displayChange === undefined && previousValue !== undefined) {
    const curr = typeof value === "number" ? value : parseFloat(String(value)) || 0;
    const prev = typeof previousValue === "number" ? previousValue : parseFloat(String(previousValue)) || 0;
    displayChange = calcChange(curr, prev);
    displayTrend = displayChange >= 0 ? "up" : "down";
  }

  // Root
  const root = document.createElement("div");
  root.className = `stat-card ${variant} ${size} ${className ?? ""}`.trim();
  root.style.cssText =
    `background:${vs.bg};border-radius:12px;padding:${sc.padding};` +
    "display:flex;flex-direction:column;gap:6px;" +
    (onClick ? "cursor:pointer;transition:box-shadow 0.15s;" : "");

  if (onClick) {
    root.addEventListener("mouseenter", () => { root.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; });
    root.addEventListener("mouseleave", () => { root.style.boxShadow = ""; });
    root.addEventListener("click", onClick);
  }

  if (loading) {
    const skeleton = document.createElement("div");
    skeleton.style.cssText =
      `height:${parseInt(sc.valueSize) + 16}px;background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%);` +
      "background-size:400% 100%;animation:shimmer 1.5s ease-in-out infinite;border-radius:6px;";
    root.appendChild(skeleton);
    if (container) container.appendChild(root);
    return root;
  }

  // Header row (label + optional change)
  const headerRow = document.createElement("div");
  headerRow.style.display = "flex";
  headerRow.style.justifyContent = "space-between";
  headerRow.style.alignItems = "center";

  const labelEl = document.createElement("span");
  labelEl.className = "stat-label";
  labelEl.textContent = label;
  labelEl.style.cssText = `font-size:${sc.labelSize};color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:0.03em;`;
  headerRow.appendChild(labelEl);

  // Trend indicator
  if (displayChange !== undefined && displayTrend !== "neutral") {
    const trendEl = document.createElement("span");
    trendEl.className = "stat-trend";
    const trendColor = displayTrend === "up" ? vs.trendUp : vs.trendDown;
    const arrow = displayTrend === "up" ? "\u2191" : "\u2193";
    trendEl.innerHTML = `${arrow} ${formatChange(displayChange)}`;
    trendEl.style.cssText =
      `font-size:11px;font-weight:600;color:${trendColor};display:flex;align-items:center;gap:2px;`;
    headerRow.appendChild(trendEl);
  }

  root.appendChild(headerRow);

  // Value row (value + icon)
  const valueRow = document.createElement("div");
  valueRow.style.display = "flex";
  valueRow.style.alignItems = "center";
  valueRow.style.justifyContent = "space-between";

  const valueEl = document.createElement("span");
  valueEl.className = "stat-value";
  valueEl.textContent = String(value);
  valueEl.style.cssText =
    `font-size:${sc.valueSize};font-weight:700;color:${vs.text};line-height:1;letter-spacing:-0.02em;`;
  valueRow.appendChild(valueEl);

  if (icon) {
    const iconWrap = document.createElement("span");
    iconWrap.innerHTML = icon;
    iconWrap.style.cssText =
      `width:36px;height:36px;display:flex;align-items:center;justify-content:center;` +
      `background:${iconBg ?? vs.iconBg};border-radius:10px;font-size:18px;flex-shrink:0;`;
    valueRow.appendChild(iconWrap);
  }

  root.appendChild(valueRow);

  // Sparkline
  if (showSparkline && sparklineData && sparklineData.length > 0) {
    const svg = createMiniSvg(sparklineData, {
      width: root.clientWidth || 120,
      height: 32,
      color: sparklineColor ?? vs.text,
      type: "area",
      fillOpacity: 0.15,
      strokeWidth: 1.5,
    });
    svg.style.marginTop = "4px";
    root.appendChild(svg);
  }

  // Description
  if (description) {
    const descEl = document.createElement("p");
    descEl.textContent = description;
    descEl.style.cssText = "margin:0;font-size:11px;color:#9ca3af;line-height:1.4;";
    root.appendChild(descEl);
  }

  if (container) container.appendChild(root);

  return root;
}

// --- Comparison Bar Factory ---

/**
 * Create a comparison bar chart (current vs compare-to).
 *
 * @example
 * ```ts
 * const bar = createComparisonBar({
 *   label: "Sales",
 *   value: 85,
 *   max: 100,
 *   compareValue: 60,
 *   compareLabel: "Last year",
 * });
 * ```
 */
export function createComparisonBar(options: ComparisonBarOptions): HTMLElement {
  const {
    label,
    value,
    max,
    compareValue,
    compareLabel = "Previous",
    showPercent = true,
    color = "#3b82f6",
    compareColor = "#d1d5db",
    height = 28,
    className,
    container,
  } = options;

  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const compPct = Math.min(100, Math.max(0, (compareValue / max) * 100));

  const root = document.createElement("div");
  root.className = `comparison-bar ${className ?? ""}`.trim();
  root.style.cssText = "display:flex;flex-direction:column;gap:4px;";

  // Label row
  const labelRow = document.createElement("div");
  labelRow.style.display = "flex";
  labelRow.style.justifyContent = "space-between";

  const labelText = document.createElement("span");
  labelText.textContent = label;
  labelText.style.cssText = "font-size:13px;font-weight:500;color:#374151;";
  labelRow.appendChild(labelText);

  if (showPercent) {
    const pctText = document.createElement("span");
    pctText.textContent = `${pct.toFixed(0)}%`;
    pctText.style.cssText = "font-size:12px;font-weight:600;color:#3b82f6;";
    labelRow.appendChild(pctText);
  }
  root.appendChild(labelRow);

  // Bars container
  const barsContainer = document.createElement("div");
  barsContainer.style.display = "flex";
  barsContainer.style.flexDirection = "column";
  barsContainer.style.gap = "3px";

  // Current value bar
  const barRow = document.createElement("div");
  barRow.style.display = "flex";
  barRow.style.alignItems = "center";
  barRow.style.gap = "8px";

  const barTrack = document.createElement("div");
  barTrack.style.cssText =
    `flex:1;height:${height}px;background:#f3f4f6;border-radius:${height / 2}px;overflow:hidden;`;

  const barFill = document.createElement("div");
  barFill.style.cssText =
    `height:100%;width:${pct}%;background:${color};border-radius:${height / 2}px;` +
    "transition:width 0.4s ease;";
  barTrack.appendChild(barFill);
  barRow.appendChild(barTrack);

  const valLabel = document.createElement("span");
  valLabel.textContent = String(value);
  valLabel.style.cssText = `font-size:12px;font-weight:600;color:#374151;min-width:36px;text-align:right;`;
  barRow.appendChild(valLabel);
  barsContainer.appendChild(barRow);

  // Compare bar
  const compRow = document.createElement("div");
  compRow.style.display = "flex";
  compRow.style.alignItems = "center";
  compRow.style.gap = "8px";

  const compTrack = document.createElement("div");
  compTrack.style.cssText =
    `flex:1;height:${Math.max(4, height - 8)}px;background:#f9fafb;border-radius:${Math.max(2, (height - 8) / 2)}px;overflow:hidden;`;

  const compFill = document.createElement("div");
  compFill.style.cssText =
    `height:100%;width:${compPct}%;background:${compareColor};border-radius:${Math.max(2, (height - 8) / 2)}px;` +
    "transition:width 0.4s ease;";
  compTrack.appendChild(compFill);
  compRow.appendChild(compTrack);

  const compLabelEl = document.createElement("span");
  compLabelEl.textContent = `${compareLabel}: ${compareValue}`;
  compLabelEl.style.cssText = "font-size:11px;color:#9ca3af;min-width:60px;text-align:right;";
  compRow.appendChild(compLabelEl);
  barsContainer.appendChild(compRow);

  root.appendChild(barsContainer);

  if (container) container.appendChild(root);
  return root;
}

// --- Mini Chart Factory ---

/**
 * Create a mini inline chart (SVG-based).
 *
 * @example
 * ```ts
 * const chart = createMiniChart({
 *   data: [10, 25, 18, 30, 22, 35, 28],
 *   type: "area",
 *   width: 160,
 *   height: 48,
 *   color: "#3b82f6",
 * });
 * ```
 */
export function createMiniChart(options: MiniChartOptions): SVGSVGElement {
  const {
    data,
    type = "line",
    width = 140,
    height = 44,
    color = "#3b82f6",
    fillOpacity = 0.15,
    strokeWidth = 2,
    showDots = false,
    className,
    container,
  } = options;

  return createMiniSvg(data, { width, height, color, type, fillOpacity, strokeWidth, showDots }, container, className);
}

// --- Internal SVG Renderer ---

function createMiniSvg(
  data: number[],
  opts: { width: number; height: number; color: string; type: string; fillOpacity: number; strokeWidth: number; showDots: boolean },
  container?: HTMLElement,
  className?: string,
): SVGSVGElement {
  const { width, height, color, type, fillOpacity, strokeWidth, showDots } = opts;
  const padX = 2;
  const padY = 2;
  const w = width - padX * 2;
  const h = height - padY * 2;

  if (data.length < 2) data = [0, 0];

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg") as unknown as SVGSVGElement;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  if (className) svg.setAttribute("class", className);
  svg.style.overflow = "visible";

  function toPoint(idx: number): { x: number; y: number } {
    const x = padX + (idx / (data.length - 1)) * w;
    const y = padY + h - ((data[idx]! - minVal) / range) * h;
    return { x, y };
  }

  if (type === "bar") {
    const barWidth = Math.max(2, w / data.length - 2);
    for (let i = 0; i < data.length; i++) {
      const pt = toPoint(i);
      const barH = ((data[i]! - minVal) / range) * h;
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", String(pt.x - barWidth / 2));
      rect.setAttribute("y", String(pt.y));
      rect.setAttribute("width", String(barWidth));
      rect.setAttribute("height", String(Math.max(1, barH)));
      rect.setAttribute("fill", color);
      rect.setAttribute("rx", "2");
      svg.appendChild(rect);
    }
  } else {
    // Line or area
    const points = data.map((_, i) => {
      const p = toPoint(i);
      return `${p.x},${p.y}`;
    }).join(" ");

    if (type === "area") {
      const areaPath = document.createElementNS(ns, "path");
      const firstPt = toPoint(0);
      const lastPt = toPoint(data.length - 1);
      areaPath.setAttribute(
        "d",
        `M${firstPt.x},${padY + h} L${points.replace(/,/g, " ").replace(/\s+/g, ",")} L${lastPt.x},${padY + h} Z`
      );
      areaPath.setAttribute("fill", color);
      areaPath.setAttribute("fill-opacity", String(fillOpacity));
      svg.appendChild(areaPath);
    }

    // Line
    const linePath = document.createElementNS(ns, "path");
    linePath.setAttribute("d", `M${points}`);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", color);
    linePath.setAttribute("stroke-width", String(strokeWidth));
    linePath.setAttribute("stroke-linecap", "round");
    linePath.setAttribute("stroke-linejoin", "round");
    svg.appendChild(linePath);

    // Dots
    if (showDots) {
      for (let i = 0; i < data.length; i++) {
        const pt = toPoint(i);
        const dot = document.createElementNS(ns, "circle");
        dot.setAttribute("cx", String(pt.x));
        dot.setAttribute("cy", String(pt.y));
        dot.setAttribute("r", "2.5");
        dot.setAttribute("fill", color);
        svg.appendChild(dot);
      }
    }
  }

  if (container) container.appendChild(svg);
  return svg;
}
