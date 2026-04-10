/**
 * Chart/data visualization utilities: data formatting, axis calculations, color scales.
 */

// --- Data Types ---

export interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
  category?: string;
}

export interface DataSeries {
  name: string;
  data: DataPoint[];
  color?: string;
}

export interface ChartConfig {
  width: number;
  height: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  title?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  animate?: boolean;
}

export interface AxisScale {
  min: number;
  max: number;
  ticks: number[];
  tickLabels: string[];
  step: number;
}

// --- Axis Calculations ---

/** Calculate nice axis scale (min, max, ticks) */
export function calculateAxisScale(
  dataMin: number,
  dataMax: number,
  targetTicks = 5,
): AxisScale {
  if (dataMin === dataMax) {
    const center = dataMin || 0;
    const range = center === 0 ? 10 : Math.abs(center);
    return {
      min: center - range,
      max: center + range,
      ticks: Array.from({ length: targetTicks + 1 }, (_, i) => center - range + (2 * range / targetTicks) * i),
      tickLabels: Array.from({ length: targetTicks + 1 }, (_, i) =>
        formatAxisLabel(center - range + (2 * range / targetTicks) * i),
      ),
      step: (2 * range) / targetTicks,
    };
  }

  // Calculate "nice" range
  const rawRange = dataMax - dataMin;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawRange)));
  const residual = rawRange / magnitude;

  let niceStep: number;
  if (residual <= 1.5) niceStep = 1;
  else if (residual <= 3) niceStep = 2;
  else if (residual <= 7) niceStep = 5;
  else niceStep = 10;

  niceStep *= magnitude;

  const niceMin = Math.floor(dataMin / niceStep) * niceStep;
  const niceMax = Math.ceil(dataMax / niceStep) * niceStep;
  const tickCount = Math.round((niceMax - niceMin) / niceStep);

  const ticks: number[] = [];
  const tickLabels: string[] = [];

  for (let i = 0; i <= tickCount; i++) {
    const val = niceMin + niceStep * i;
    ticks.push(val);
    tickLabels.push(formatAxisLabel(val));
  }

  return { min: niceMin, max: niceMax, ticks, tickLabels, step: niceStep };
}

/** Format axis label with smart abbreviation */
export function formatAxisLabel(value: number): string {
  const absValue = Math.abs(value);

  if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (absValue >= 1000) return `${(value / 1000).toFixed(1)}K`;
  if (Number.isInteger(value)) return String(value);
  if (absValue < 0.01) return value.toExponential(1);
  if (absValue < 1) return value.toFixed(2);
  return value.toFixed(1);
}

/** Map data value to pixel coordinate */
export function valueToPixel(
  value: number,
  scale: AxisScale,
  pixelStart: number,
  pixelEnd: number,
  inverted = false,
): number {
  const ratio = (value - scale.min) / (scale.max - scale.min);
  const clampedRatio = Math.max(0, Math.min(1, ratio));
  return inverted
    ? pixelEnd - clampedRatio * (pixelEnd - pixelStart)
    : pixelStart + clampedRatio * (pixelEnd - pixelStart);
}

/** Map pixel coordinate back to value */
export function pixelToValue(
  pixel: number,
  scale: AxisScale,
  pixelStart: number,
  pixelEnd: number,
): number {
  const ratio = (pixel - pixelStart) / (pixelEnd - pixelStart);
  return scale.min + ratio * (scale.max - scale.min);
}

// --- Data Processing ---

/** Aggregate data points by interval */
export function aggregateByInterval(
  data: DataPoint[],
  interval: "hour" | "day" | "week" | "month",
  aggregator: "sum" | "avg" | "min" | "max" | "count" = "sum",
): DataPoint[] {
  const groups = new Map<string, number[]>();

  for (const point of data) {
    const date = typeof point.x === "number" ? new Date(point.x) : new Date(point.x as string);
    let key: string;

    switch (interval) {
      case "hour":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
        break;
      case "day":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        break;
      case "week": {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split("T")[0]!;
        break;
      }
      case "month":
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        break;
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(point.y);
  }

  const result: DataPoint[] = [];
  for (const [key, values] of groups) {
    let aggregated: number;
    switch (aggregator) {
      case "avg": aggregated = values.reduce((a, b) => a + b, 0) / values.length; break;
      case "min": aggregated = Math.min(...values); break;
      case "max": aggregated = Math.max(...values); break;
      case "count": aggregated = values.length; break;
      default: aggregated = values.reduce((a, b) => a + b, 0);
    }
    result.push({ x: key, y: aggregated });
  }

  return result.sort((a, b) =>
    typeof a.x === "string" && typeof b.x === "string"
      ? a.x.localeCompare(b.x)
      : Number(a.x) - Number(b.x),
  );
}

/** Calculate moving average */
export function movingAverage(data: DataPoint[], windowSize = 3): DataPoint[] {
  const result: DataPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(windowSize / 2));
    const end = Math.min(data.length - 1, i + Math.floor(windowSize / 2));
    const windowData = data.slice(start, end + 1);
    const avg = windowData.reduce((sum, p) => sum + p.y, 0) / windowData.length;
    result.push({ ...data[i]!, y: avg });
  }

  return result;
}

/** Calculate percent change between consecutive points */
export function calculatePercentChanges(data: DataPoint[]): Array<DataPoint & { changePercent: number }> {
  return data.map((point, i) => ({
    ...point,
    changePercent: i === 0 ? 0 : ((point.y - data[i - 1]!.y) / data[i - 1]!.y) * 100,
  }));
}

/** Find peaks and valleys in data */
export function findExtrema(data: DataPoint[], neighborhoodSize = 3): {
  peaks: DataPoint[];
  valleys: DataPoint[];
} {
  const peaks: DataPoint[] = [];
  const valleys: DataPoint[] = [];

  for (let i = neighborhoodSize; i < data.length - neighborhoodSize; i++) {
    const neighbors = data.slice(i - neighborhoodSize, i + neighborhoodSize + 1);
    const current = data[i]!;
    const isPeak = neighbors.every((n) => n.y <= current.y);
    const isValley = neighbors.every((n) => n.y >= current.y);

    if (isPeak) peaks.push(current);
    if (isValley) valleys.push(current);
  }

  return { peaks, valleys };
}

// --- Color Scales ---

/** Generate color palette for chart series */
export function generateChartColors(count: number, palette: ColorPaletteName = "default"): string[] {
  const palettes: Record<ColorPaletteName, string[]> = {
    default: ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"],
    pastel: ["#93c5fd", "#fcd34d", "#86efac", "#fca5a5", "#93c5fd", "#c4b5fd", "#f9a8d4", "#5eead4"],
    vibrant: ["#7c3aed", "#f97316", "#059669", "#dc2626", "#2563eb", "#db2777", "#0891b2", "#65a30d"],
    monochrome: ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9"],
    warm: ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#059669", "#0891b2", "#2563eb"],
    cool: ["#2563eb", "#0891b2", "#059669", "#65a30d", "#ca8a04", "#d97706", "#ea580c", "#dc2626"],
  };

  const selected = palettes[palette] ?? palettes.default;
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    colors.push(selected[i % selected.length]!);
  }

  return colors;
}

export type ColorPaletteName = "default" | "pastel" | "vibrant" | "monochrome" | "warm" | "cool";

/** Generate gradient color based on value (0 to 1) */
export function interpolateColor(
  value: number,
  colorStops: [number, string][],
): string {
  const clamped = Math.max(0, Math.min(1, value));

  // Find surrounding stops
  let lowerStop: [number, string] = colorStops[0]!;
  let upperStop: [number, string] = colorStops[colorStops.length - 1]!;

  for (let i = 0; i < colorStops.length - 1; i++) {
    if (clamped >= colorStops[i]![0] && clamped <= colorStops[i + 1]![0]) {
      lowerStop = colorStops[i]!;
      upperStop = colorStops[i + 1]!;
      break;
    }
  }

  const range = upperStop[0] - lowerStop[0];
  const t = range === 0 ? 0 : (clamped - lowerStop[0]) / range;

  return blendHexColors(lowerStop[1], upperStop[1], t);
}

/** Blend two hex colors by ratio (0-1) */
function blendHexColors(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgbObj(color1);
  const c2 = hexToRgbObj(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * ratio);
  const g = Math.round(c1.g + (c2.g - c1.g) * ratio);
  const b = Math.round(c1.b + (c2.b - c1.b) * ratio);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function hexToRgbObj(hex: string): { r: number; g: number; b: number } {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(match[1]!, 16),
    g: parseInt(match[2]!, 16),
    b: parseInt(match[3]!, 16),
  };
}

// --- Statistics ---

/** Basic statistics for a dataset */
export function getDataStats(values: number[]): DataStats {
  if (values.length === 0) {
    return { count: 0, sum: 0, mean: 0, median: 0, min: 0, max: 0, stdDev: 0, p25: 0, p75: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / sorted.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2
    : sorted[Math.floor(sorted.length / 2)]!;

  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  const p25Index = Math.floor(sorted.length * 0.25);
  const p75Index = Math.floor(sorted.length * 0.75);

  return {
    count: sorted.length,
    sum,
    mean,
    median,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    stdDev,
    p25: sorted[p25Index]!,
    p75: sorted[p75Index]!,
  };
}

export interface DataStats {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  p25: number;
  p75: number;
}
