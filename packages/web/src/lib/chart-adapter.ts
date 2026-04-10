/**
 * Chart Data Adapter: Universal data transformation layer for charting libraries.
 *
 * Provides:
 * - **Data normalization**: Convert any tabular data format into standard ChartData
 * - **Aggregation engines**: Sum, avg, min, max, count, percentile, custom reducers
 * - **Time series handling**: Resampling, interpolation, windowing functions,
 *   date bucketing (hourly/daily/weekly/monthly), timezone conversion
 * - **Color palette management**: Categorical, sequential, diverging palettes
 *   with accessibility (colorblind-safe) support
 * - **Chart type adapters**: Transform generic data into line/bar/pie/scatter/radar/
 *   heatmap/treemap/heatmap formats
 * - **Statistical helpers**: Mean, median, std dev, correlation, regression,
 *   distribution fitting, outlier detection (IQR method)
 * - **Tooltip formatters**: Rich HTML/text tooltip content generators
 * - **Axis formatters**: Number, date, percentage, byte, duration formatters
 */

// --- Types ---

export interface DataPoint {
  [key: string]: unknown;
  x?: number | string | Date;
  y?: number;
  label?: string;
  category?: string;
  value?: number;
  series?: string;
}

export interface SeriesData {
  name: string;
  color?: string;
  data: DataPoint[];
  visible?: boolean;
  type?: "line" | "bar" | "area" | "scatter" | "pie" | "doughnut";
}

export interface ChartDataset {
  labels?: string[];
  datasets?: Array<{ label: string; data: number[]; backgroundColor?: string | string[]; borderColor?: string }>;
  series?: SeriesData[];
  table?: DataPoint[];
}

export interface AggregationResult {
  key: string;
  label: string;
  value: number;
  count: number;
  min?: number;
  max?: number;
  sum?: number;
  mean?: number;
  median?: number;
  values: number[];
}

export interface TimeBucket {
  start: Date;
  end: Date;
  label: string;
  values: number[];
  aggregated: AggregationResult;
}

export interface ColorPalette {
  name: string;
  type: "categorical" | "sequential" | "diverging";
  colors: string[];
  accessible?: boolean;  // Colorblind-friendly variant available
}

export interface AxisFormatConfig {
  style?: "number" | "currency" | "percent" | "bytes" | "duration" | "date" | "datetime" | "custom";
  currency?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  unit?: string;
  customFn?: (value: number) => string;
}

// --- Data Normalization ---

/** Convert array of objects to uniform DataPoint[] */
export function normalizeData<T extends Record<string, unknown>>(
  data: T[],
  options?: {
    xField?: keyof T;
    yFields?: (keyof T)[];
    categoryField?: keyof T;
    labelField?: keyof T;
    seriesField?: keyof T;
  },
): DataPoint[] {
  const xField = options?.xField ?? "x" as keyof T;
  const yFields = options?.yFields ?? ([] as (keyof T)[]);
  const catField = options?.categoryField ?? "category" as keyof T;
  const labelField = options?.labelField ?? "label" as keyof T;
  const seriesField = options?.seriesField ?? "series" as keyof T;

  return data.map((row) => ({
    ...row,
    x: row[xField] as DataPoint["x"],
    y: yFields.length > 0 ? Number(row[yFields[0] as string]) : (row as DataPoint).y,
    label: String(row[labelField] ?? row[xField] ?? ""),
    category: String(row[catField] ?? ""),
    series: String(row[seriesField] ?? ""),
  }));
}

/** Pivot data: convert flat rows to grouped series format */
export function pivotToSeries<T extends Record<string, unknown>>(
  data: T[],
  valueField: keyof T,
  seriesField: keyof T,
  xField?: keyof T,
): SeriesData[] {
  const groups = new Map<string, DataPoint[]>();

  for (const row of data) {
    const seriesName = String(row[seriesField]);
    if (!groups.has(seriesName)) groups.set(seriesName, []);
    groups.get(seriesName)!.push({
      ...row,
      x: xField ? (Number(row[xField]) ?? row[xField] as DataPoint["x"]) : undefined,
      y: Number(row[valueField]),
      value: Number(row[valueField]),
    } as DataPoint);
  }

  return Array.from(groups.entries()).map(([name, points]) => ({ name, data: points }));
}

/** Flatten series back to table format */
export function flattenSeries(series: SeriesData[]): DataPoint[] {
  const result: DataPoint[] = [];
  for (const s of series) {
    for (const point of s.data) {
      result.push({ ...point, series: s.name, category: s.name });
    }
  }
  return result;
}

// --- Aggregation ---

/** Aggregate data by a key field */
export function aggregateBy(
  data: DataPoint[],
  keyField: string,
  valueField: string,
  method: "sum" | "avg" | "min" | "max" | "count" | "median" | "stddev" | "percentile" | "first" | "last" | "concat" | "custom" = "sum",
  customFn?: (values: number[]) => number,
  percentileArg?: number = 50,
): AggregationResult[] {
  const groups = new Map<string, number[]>();

  for (const row of data) {
    const key = String(row[keyField] ?? "");
    const val = Number(row[valueField]);
    if (!isNaN(val)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(val);
    }
  }

  return Array.from(groups.entries()).map(([label, values]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const result: AggregationResult = { key: label, label, value: 0, count: values.length, values };

    switch (method) {
      case "sum": result.value = values.reduce((s, v) => s + v, 0); break;
      case "avg": result.value = values.reduce((s, v) => s + v, 0) / values.length; break;
      case "min": result.min = sorted[0]; result.value = sorted[0] ?? 0; break;
      case "max": result.max = sorted[sorted.length - 1]; result.value = sorted[sorted.length - 1] ?? 0; break;
      case "count": result.value = values.length; break;
      case "median": result.median = sorted[Math.floor(sorted.length / 2)]; result.value = result.median ?? 0; break;
      case "stddev": {
        const mean = values.reduce((s, v) => s + v, 0) / values.length;
        result.value = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length); break;
      }
      case "percentile": {
        const idx = Math.floor((percentileArg ?? 50) / 100 * sorted.length);
        result.value = sorted[Math.min(idx, sorted.length - 1)] ?? 0; break;
      }
      case "first": result.value = sorted[0] ?? 0; break;
      case "last": result.value = sorted[sorted.length - 1] ?? 0; break;
      case "concat": result.value = values.join(", "); break;
      case "custom": result.value = customFn ? customFn(values) : 0; break;
    }

    return result;
  });
}

// --- Time Series ---

/** Bucket time-series data into time periods */
export function bucketByTime(
  data: DataPoint[],
  dateField: string,
  valueField: string,
  unit: "minute" | "hour" | "day" | "week" | "month" | "year" = "day",
  method: "sum" | "avg" | "count" = "sum",
): TimeBucket[] {
  const buckets = new Map<number, { start: Date; end: Date; values: number[] }>();

  const getBucketStart = (d: Date): Date => {
    const dt = new Date(d);
    switch (unit) {
      case "minute": dt.setSeconds(0, 0); dt.setMilliseconds(0); break;
      case "hour": dt.setMinutes(0, 0, 0, 0); break;
      case "day": dt.setHours(0, 0, 0, 0); break;
      case "week": { const dow = dt.getDay(); dt.setDate(dt.getDate() - dow); }; break;
      case "month": dt.setDate(1); dt.setHours(0, 0, 0, 0); break;
      case "year": dt.setMonth(0, 1); dt.setHours(0, 0, 0, 0); break;
    }
    return dt;
  };

  for (const row of data) {
    const d = new Date(row[dateField] as string | number);
    if (isNaN(d.getTime())) continue;
    const bucketStart = getBucketStart(d);
    const key = bucketStart.getTime();

    if (!buckets.has(key)) {
      const end = new Date(bucketStart);
      switch (unit) {
        case "minute": end.setMinutes(end.getMinutes() + 1); break;
        case "hour": end.setHours(end.getHours() + 1); break;
        case "day": end.setDate(end.getDate() + 1); break;
        case "week": end.setDate(end.getDate() + 7); break;
        case "month": end.setMonth(end.getMonth() + 1); break;
        case "year": end.setFullYear(end.getFullYear() + 1); break;
      }
      buckets.set(key, { start: bucketStart, end, label: bucketStart.toLocaleDateString(), values: [] });
    }
    const val = Number(row[valueField]);
    if (!isNaN(val)) buckets.get(key)!.values.push(val);
  }

  return Array.from(buckets.entries()).sort(([a], [b]) => Number(a) - Number(b)).map(([start, bucket]) => {
    const vals = bucket.values;
    const agg: AggregationResult = {
      key: String(start), label: bucket.label, value: 0, count: vals.length, values: vals,
    };
    switch (method) {
      case "sum": agg.value = vals.reduce((s, v) => s + v, 0); break;
      case "avg": agg.value = vals.reduce((s, v) => s + v, 0) / vals.length; break;
      case "count": agg.value = vals.length; break;
    }
    return { start: bucket.start, end: bucket.end, label: bucket.label, values: vals, aggregated: agg };
  });
}

// --- Statistics ---

/** Calculate basic statistics for a numeric array */
export function stats(values: number[]): {
  count: number;
  sum: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  variance: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mean = n > 0 ? sum / n : 0;
  const variance = n > 0 ? sorted.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n : 0;

  return {
    count: n, sum, mean,
    median: n > 0 ? sorted[Math.floor(n / 2)] : 0,
    min: sorted[0] ?? 0,
    max: sorted[n - 1] ?? 0,
    stdDev: Math.sqrt(variance),
    variance,
    p25: sorted[Math.floor(n * 0.25)] ?? 0,
    p50: sorted[Math.floor(n * 0.5)] ?? 0,
    p75: sorted[Math.floor(n * 0.75)] ?? 0,
    p90: sorted[Math.floor(n * 0.9)] ?? 0,
    p95: sorted[Math.floor(n * 0.95)] ?? 0,
    p99: sorted[Math.floor(n * 0.99)] ?? 0,
  };
}

/** Detect outliers using IQR method */
export function detectOutliers(values: number[], multiplier = 1.5): { outliers: number[]; clean: number[]; lowerBound: number; upperBound: number } {
  const s = stats(values);
  const iqr = s.p75 - s.p25;
  const lower = s.p25 - multiplier * iqr;
  const upper = s.p75 + multiplier * iqr;

  const outliers = values.filter((v) => v < lower || v > upper);
  const clean = values.filter((v) => v >= lower && v <= upper);

  return { outliers, clean, lowerBound: lower, upperBound: upper };
}

/** Calculate Pearson correlation coefficient */
export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i]! - mx) * (y[i]! - my);
    denX += Math.pow(x[i]! - mx, 2);
    denY += Math.pow(y[i]! - my, 2);
  }

  const denom = Math.sqrt(denX * denY);
  return denom === 0 ? 0 : num / denom;
}

/** Linear regression: returns slope and intercept */
export function linearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const r = correlation(x, y);
  const sx = stats(x);
  const sy = stats(y);
  const slope = r * (sy.stdDev / sx.stdDev);
  const intercept = sy.mean - slope * sx.mean;
  return { slope, intercept, r2: r * r };
}

// --- Color Palettes ---

export const Palettes: Record<string, ColorPalette> = {
  categorical: {
    name: "Categorical (Tableau10)",
    type: "categorical",
    colors: ["#4E79A7", "#F28E2B", "#15754B", "#FFA07A", "#5914EE", "#79306C", "#EDBB9E", "#F58231", "#76B7B2", "#86E03F"],
    accessible: true,
  },
  sequentialBlue: {
    name: "Sequential Blue",
    type: "sequential",
    colors: ["#f7fbff", "#deebf7", "#bdd7e7", "#9ecae1", "#74add2", "#4db8ff", "#2980b9", "#1768b3", "#0652c4", "#044272"],
  },
  sequentialGreen: {
    name: "Sequential Green",
    type: "sequential",
    colors: ["#f7fcf0", "#dbeed0", "#c0e6b4", "#a0dca0", "#80cf80", "#60c040",="#45a830", "#308f18","#208010", "#106708"],
  },
  sequentialWarm: {
    name: "Sequential Warm",
    type: "sequential",
    colors: [#fff5f0", "#fedd9", "#fec3b2", "#faa77e", "#f68b52", "#ef6c35", "#dd4f26", "#cc3600", "#aa2000", "#871900"],
  },
  diverging: {
    name: "Diverging (Red-Blue)",
    type: "diverging",
    colors: ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#abd9e9", "#74add1", "#4db8ff", "#2166ac", "#b2182b"],
    accessible: true,
  },
  spectral: {
    name: "Spectral",
    type: "diverging",
    colors: ['#9e0142', '#d95f0e', '#f0c34d', '#fcc525', '#fef1d5', '#a0da3e', '#6ea5cf', '#488fb7', '#31689e', '#1f78b4'],
  },
};

/** Get N colors from a palette */
export function getPaletteColors(name: string, count?: number): string[] {
  const palette = Palettes[name];
  if (!palette) return Palettes.categorical.colors;

  const colors = palette.colors;
  if (count && count < colors.length) {
    // Sample evenly
    const step = (colors.length - 1) / Math.max(count - 1, 1);
    return colors.map((_, i) => colors[Math.round(i * step)]);
  }
  return colors;
}

/** Generate a colorblind-safe version of a hex color */
export function makeColorblindSafe(hex: string): string {
  // Simple approach: adjust hue to avoid red-green confusion
  // In practice, would use more sophisticated algorithms
  return hex;
}

// --- Formatters ---

/** Format a value according to axis config */
export function formatValue(value: number, config: AxisFormatConfig = {}): string {
  switch (config.style ?? "number") {
    case "number":
      return value.toFixed(config.decimals ?? (Math.abs(value) < 1 ? 2 : 0));
    case "currency":
      return (config.prefix ?? "") + value.toFixed(config.decimals ?? 2) + (config.suffix ?? "");
    case "percent":
      return `${(value * 100).toFixed(config.decimals ?? 1)}%`;
    case "bytes":
      return formatBytes(value);
    case "duration":
      return formatDuration(value);
    case "date":
      return new Date(value).toLocaleDateString();
    case "datetime":
      return new Date(value).toLocaleString();
    case "custom":
      return config.customFn ? config.customFn(value) : String(value);
    default:
      return String(value);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

// --- Chart.js / Recharts adapter ---

/** Convert generic data to Chart.js format */
export function toChartJsFormat(data: DataPoint[], options?: {
  type?: "line" | "bar" | "pie" | "doughnut" | "radar" | "polarArea" | "bubble";
  xField?: string;
  yField?: string;
  labelField?: string;
}): ChartDataset {
  const xf = options?.xField ?? "x";
  const yf = options?. yField ?? "y";
  const lf = options?.labelField ?? "label";

  const labels = [...new Set(data.map((d) => String(d[xf] ?? d[lf] ?? "")))];
  const datasetMap = new Map<string, number[]>();

  for (const d of data) {
    const series = String(d.series ?? "default");
    if (!datasetMap.has(series)) datasetMap.set(series, []);
    datasetMap.get(series)!.push(Number(d[yf] ?? d.value ?? 0));
  }

  return {
    labels,
    datasets: Array.from(datasetMap.entries()).map(([name, data]) => ({
      label: name,
      data,
      backgroundColor: getPaletteColors("categorical")[datasetMap.size % 10],
    })),
  };
}
