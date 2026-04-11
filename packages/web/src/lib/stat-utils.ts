/**
 * Stat Utilities: Metric/statistic display cards with value, label, trend
 * indicator, sparkline mini-chart, comparison badges, and formatting helpers.
 */

// --- Types ---

export type StatTrend = "up" | "down" | "neutral" | "flat";
export type StatSize = "sm" | "md" | "lg";
export type StatFormat = "number" | "percent" | "currency" | "bytes" | "custom";

export interface StatOptions {
  /** Primary value to display */
  value: number | string;
  /** Label describing the stat */
  label: string;
  /** Secondary/subtitle text */
  secondaryLabel?: string;
  /** Trend direction */
  trend?: StatTrend;
  /** Trend value (e.g., "+12.5%") */
  trendValue?: string;
  /** Format for the value */
  format?: StatFormat;
  /** Prefix symbol (e.g., "$", "↑", "↓") */
  prefix?: string;
  /** Suffix symbol (e.g., "%", "KB", "users") */
  suffix?: string;
  /** Decimal places for numbers */
  decimals?: number;
  /** Color override for value */
  valueColor?: string;
  /** Size variant */
  size?: StatSize;
  /** Show sparkline mini chart */
  sparkline?: number[];
  /** Comparison value (for change-from display) */
  compareValue?: number | string;
  /** Change percentage (pre-calculated) */
  changePercent?: number;
  /** Icon HTML string */
  icon?: string;
  /** Click handler */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface StatCardOptions extends StatOptions {
  /** Card background variant */
  variant?: "default" | "filled" | "outlined" | "flat";
  /** Show border */
  bordered?: boolean;
  /** Show shadow */
  shadow?: boolean;
  /** Padding */
  padding?: number | string;
  /** Width */
  width?: number | string | "auto";
  /** Height */
  height?: number | string | "auto";
  /** Horizontal layout (value + label side by side) */
  horizontal?: boolean;
}

// --- Trend Colors ---

const TREND_COLORS: Record<StatTrend, { color: string; arrow: string; bg: string }> = {
  "up": { color: "#22c55e", arrow: "&#8593;", bg: "#ecfdf5" },
  "down": { color: "#ef4444", arrow: "&#8595;", bg: "#fef2f2" },
  "neutral": { color: "#6b7280", arrow: "", bg: "#f9fafb" },
  "flat": { color: "#374151", arrow: "", bg: "transparent" },
};

const SIZE_STYLES: Record<StatSize, { valueFontSize: string; labelFontSize: string; padding: string }> = {
  "sm": { valueFontSize: "20px", labelFontSize: "12px", padding: "10px 14px" },
  "md": { valueFontSize: "28px", labelFontSize: "14px", padding: "14px 18px" },
  "lg": { valueFontSize: "36px", labelFontSize: "16px", padding: "18px 22px" },
};

// --- Formatters ---

function formatValue(value: number, format: StatFormat, decimals = 1, prefix = "", suffix = ""): string {
  switch (format) {
    case "percent": return `${prefix}${value.toFixed(decimals)}%${suffix}`;
    case "currency": return `${prefix}$${value.toLocaleString("en-US", { style: "currency", minimumFractionDigits: decimals })}${suffix}`;
    case "bytes": {
      const units = ["B", "KB", "MB", "GB", "TB", "PB"];
      const idx = Math.floor(Math.log2(value) / Math.log2(1024));
      return `${prefix}${value.toFixed(decimals > 0 ? value.toFixed(decimals) : value}${units[Math.min(idx, units.length - 1)]}${suffix}`;
    }
    default: return `${prefix}${Number(value).toLocaleString()}${suffix}`;
  }
}

// --- Sparkline ---

interface SparklineOptions {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  points?: number;
  /** Color based on last value vs first */
  autoColor?: boolean;
  /** Min value for scaling */
  min?: number;
  /** Max value for scaling */
  max?: number;
  /** Gradient fill under line? */
  gradientFill?: string;
  /** CSS class */
  className?: string;
}

/**
 * Create a mini sparkline SVG chart.
 */
export function createSparkline(options: SparklineOptions): SVGSVGElement {
  const {
    data,
    width = 120,
    height = 32,
    stroke = "#3b82f6",
    fill = "none",
    strokeWidth = 1.5,
    points = data.length,
    autoColor = false,
    min, max,
    gradientFill,
    className,
  } = options;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg") as SVGSVGElement;
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.overflow = "visible";
  if (className) svg.className.baseVal = className;

  // Calculate path
  if (data.length === 0) {
    svg.innerHTML = `<rect width="${width}" height="${height}" fill="transparent"/>`;
    return svg;
  }

  const actualMin = min ?? Math.min(...data);
  const actualMax = max ?? Math.max(...data);
  const range = actualMax - actualMin || 1;

  let d = "";
  const stepX = (width - strokeWidth * 2) / (points - 1 || 1);

  data.forEach((val, i) => {
    const x = i * stepX + strokeWidth;
    const y = height - ((val - actualMin) / range) * (height - strokeWidth * 2) - strokeWidth;
    const py = Math.max(strokeWidth / 2, Math.min(height - strokeWidth / 2, y));
    if (i === 0) d += `M ${x},${py}`;
    else d += ` L ${x},${py}`;
  });

  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", gradientFill || fill);
  path.setAttribute("stroke", autoColor
    ? (data[data.length - 1]! >= data[0] ? "#22c55e" : data[data.length - 1] > data[0] ? "#ef4444" : "#3b82f6")
    : stroke);
  path.setAttribute("stroke-width", String(strokeWidth));
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");

  svg.appendChild(path);
  return svg;
}

// --- Core Factory ---

/**
 * Create a stat display element.
 *
 * @example
 * ```ts
 * const stat = createStat({
 *   value: 12847,
 *   label: "Total Users",
 *   format: "number",
 *   trend: "up",
 *   trendValue: "+12.5%",
 *   size: "md",
 * });
 * ```
 */
export function createStat(options: StatOptions): HTMLElement {
  const {
    value, label, secondaryLabel, trend = "neutral", trendValue, format = "number",
    prefix, suffix, decimals = 1, valueColor, size = "md",
    sparkline, compareValue, changePercent, icon, onClick, className, container,
  } = options;

  const ss = SIZE_STYLES[size];
  const tc = TREND_COLORS[trend];

  const root = document.createElement("div");
  root.className = `stat ${size} ${className ?? ""}`.trim();
  root.style.cssText = "display:inline-flex;align-items:baseline;gap:6px;cursor:default;";

  // Value
  const valueEl = document.createElement("span");
  valueEl.className = "stat-value";
  const displayVal = typeof value === "number"
    ? formatValue(value, format, decimals, prefix, suffix)
    : String(value);
  valueEl.textContent = displayVal;
  valueEl.style.cssText =
    `font-size:${ss.valueFontSize};font-weight:700;font-family:inherit;` +
    `color:${valueColor || tc.color};line-height:1;`;
  root.appendChild(valueEl);

  // Trend arrow + change
  if (trend !== "neutral" || trendValue || changePercent !== undefined) {
    const trendEl = document.createElement("span");
    trendEl.className = "stat-trend";
    trendEl.style.cssText =
      `font-size:${parseInt(ss.valueFontSize) - 4}px;font-weight:500;` +
      `color:${tc.color};display:inline-flex;align-items:center;gap:2px;margin-left:2px;`;
    if (tc.arrow) trendEl.innerHTML = tc.arrow;
    if (trendValue) {
      const tv = document.createElement("span");
      tv.textContent = trendValue;
      tv.style.color = tc.color;
      trendEl.appendChild(tv);
    }
    if (changePercent !== undefined) {
      const cp = document.createElement("span");
      cp.textContent = `(${changePercent > 0 ? "+" : ""}${changePercent}%)`;
      cp.style.color = tc.color;
      trendEl.appendChild(cp);
    }
    root.appendChild(trendEl);
  }

  // Label
  const labelEl = document.createElement("span");
  labelEl.className = "stat-label";
  labelEl.textContent = label;
  labelEl.style.cssText =
    `font-size:${ss.labelFontSize};color:#6b7280;max-width:120px;`;
  root.appendChild(labelEl);

  // Secondary label
  if (secondaryLabel) {
    const subEl = document.createElement("span");
    subEl.className = "stat-secondary";
    subEl.textContent = secondaryLabel;
    subEl.style.cssText =
      `font-size:${parseInt(ss.labelFontSize) - 2}px;color:#9ca3af;`;
    root.appendChild(subEl);
  }

  // Sparkline
  if (sparkline && sparkline.length > 0) {
    const sl = createSparkline({ data: sparkline, width: 80, height: 24 });
    sl.style.marginLeft = "8px";
    sl.style.verticalAlign = "middle";
    root.appendChild(sl);
  }

  // Icon
  if (icon) {
    const iconEl = document.createElement("span");
    iconEl.innerHTML = icon;
    iconEl.style.marginRight = "4px";
    root.insertBefore(iconEl, root.firstChild);
  }

  if (onClick) root.addEventListener("click", onClick);
  (container ?? document.body).appendChild(root);
  return root;
}

/**
 * Create a full stat card with background, border, and optional shadow.
 */
export function createStatCard(options: StatCardOptions): HTMLElement {
  const {
    variant = "default", bordered = true, shadow = false, horizontal = false,
    padding, width = "auto", height = "auto", className, container,
    ...rest
  } = options;

  const root = document.createElement("div");
  root.className = `stat-card ${variant} ${className ?? ""}`. trim();
  Object.assign(root.style, {
    display: horizontal ? "inline-flex" : "block",
    alignItems: horizontal ? "center" : "flex-start",
    gap: horizontal ? "16px" : "4px",
    ...(horizontal ? {} : { flexDirection: "column" }),
    padding: padding ?? (variant === "filled" ? "20px" : "16px"),
    width: width === "auto" ? (horizontal ? "auto" : "280px") : typeof width === "number" ? `${width}px` : width),
    height: typeof height === "number" ? `${height}px` : height,
    backgroundColor: variant === "filled" ? "#f9fafb" : variant === "flat" ? "transparent" : "#fff",
    border: bordered ? (variant === "outlined" ? "1px solid #d1d5db" : "1px solid #e5e7eb") : "none",
    boxShadow: shadow ? "0 4px 12px rgba(0,0,0,0.08)" : "none",
    borderRadius: "10px",
  });

  root.appendChild(createStat(rest));
  (container ?? document.body).appendChild(root);
  return root;
}
