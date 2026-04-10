/**
 * Chart.js Data Adapter: Transform raw data into Chart.js-compatible configurations.
 * Supports automatic chart type detection, dataset normalization, color palette
 * assignment, axis configuration, tooltip customization, legend management,
 * responsive scaling, and animation presets. Works with Chart.js v3/v4.
 */

// --- Types ---

export type ChartType = "line" | "bar" | "pie" | "doughnut" | "radar" | "polarArea"
  | "scatter" | "bubble" | "area" | "stackedBar" | "horizontalBar";

export interface DataPoint {
  label?: string;
  value: number;
  x?: number;
  y?: number;
  r?: number; // bubble radius
}

export interface Dataset {
  label: string;
  data: (number | null | DataPoint)[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  borderDash?: [number, number];
  fill?: boolean | string;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  hidden?: boolean;
  order?: number;
  stack?: string;
  yAxisID?: string;
  xAxisID?: string;
}

export interface AxisConfig {
  id?: string;
  position?: "left" | "right" | "top" | "bottom";
  title?: string;
  min?: number | "auto";
  max?: number | "auto";
  ticks?: {
    format?: string;       // e.g., "$0.00", "0.0%"
    stepSize?: number;
    maxTicksLimit?: number;
    callback?: string;      // function body for custom tick formatting
  };
  grid?: {
    display?: boolean;
    color?: string;
    lineWidth?: number;
    drawBorder?: boolean;
  };
  scaleType?: "linear" | "logarithmic" | "category" | "time" | "timeseries";
  time?: {
    unit?: "millisecond" | "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
    displayFormats?: Record<string, string>;
  };
  stacked?: boolean;
  reverse?: boolean;
}

export interface TooltipConfig {
  enabled?: boolean;
  mode?: "index" | "point" | "dataset" | "nearest" | "x" | "y";
  intersect?: boolean;
  position?: "average" | "nearest";
  callbacks?: {
    label?: string; // function template
    title?: string;
    afterBody?: string;
  };
  backgroundColor?: string;
  titleColor?: string;
  bodyColor?: string;
  borderColor?: string;
  borderWidth?: number;
  padding?: number;
  cornerRadius?: number;
  displayColors?: boolean;
}

export interface LegendConfig {
  display?: boolean;
  position?: "top" | "left" | "bottom" | "right";
  align?: "start" | "center" | "end";
  labels?: {
    boxWidth?: number;
    padding?: number;
    font?: { size?: number; weight?: string };
    usePointStyle?: boolean;
    filter?: string; // function template
  };
}

export interface AnimationConfig {
  duration?: number;
  easing?: "easeInOutQuart" | "easeOutQuart" | "easeOutElastic" | "linear" | "easeOutBounce";
  delay?: (context: { dataIndex: number }) => number;
}

export interface ChartJsConfig {
  type: ChartType;
  data: {
    labels?: string[];
    datasets: Dataset[];
  };
  options: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      title?: { display?: boolean; text?: string; font?: { size?: number; weight?: string }; color?: string };
      tooltip?: TooltipConfig;
      legend?: LegendConfig;
      subtitle?: { display?: boolean; text?: string };
      datalabels?: { display?: boolean; anchor?: string; align?: string; formatter?: string; color?: string; font?: { size?: number } };
    };
    scales?: {
      x?: AxisConfig & { stacked?: boolean };
      y?: AxisConfig & { stacked?: boolean };
      y2?: AxisConfig & { stacked?: boolean };
      [key: string]: AxisConfig & { stacked?: boolean } | undefined;
    };
    animation?: AnimationConfig;
    interaction?: { mode?: string; intersect?: boolean };
    elements?: {
      line?: { tension?: number; borderWidth?: number };
      point?: { radius?: number; hoverRadius?: number };
      bar?: { borderRadius?: number };
    };
  };
}

export interface AdapterOptions {
  /** Auto-detect best chart type from data shape */
  autoDetectType?: boolean;
  /** Color palette to use */
  palette?: ColorPaletteName;
  /** Show data values on chart */
  showDataLabels?: boolean;
  /** Enable animations */
  animate?: boolean;
  /** Responsive sizing */
  responsive?: boolean;
  /** Maintain aspect ratio */
  maintainAspectRatio?: boolean;
  /** Default fill for area/line charts */
  defaultFill?: boolean;
  /** Show grid lines */
  showGrid?: boolean;
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Currency symbol for value formatting */
  currency?: string;
  /** Number of decimal places for values */
  decimals?: number;
  /** Max data points to show (truncate from start) */
  maxPoints?: number;
  /** Sort data by value (for bar/pie) */
  sortByValue?: "asc" | "desc";
  /** Stack bars */
  stacked?: boolean;
  /** Horizontal orientation for bar charts */
  horizontal?: boolean;
  /** Secondary Y-axis config */
  secondaryAxis?: AxisConfig;
}

export type ColorPaletteName = "default" | "vibrant" | "pastel" | "monochrome" | "warm" | "cool"
  | "business" | "nature" | "neon" | "earth";

// --- Color Palettes ---

const PALETTES: Record<ColorPaletteName, string[]> = {
  default:   ["#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"],
  vibrant:   ["#ff6384", "#36a2eb", "#ffce56", "#4bc0c0", "#9966ff", "#ff9f40", "#c9cbcf", "#7c8798"],
  pastel:    ["#93c5fd", "#fca5a5", "#86efac", "#fde68a", "#c4b5fd", "#a5f3fc", "#fbcfe8", "#99f6e4"],
  monochrome: ["#1e293b", "#334155", "#475569", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0", "#f1f5f9"],
  warm:      ["#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#0891b2", "#2563eb"],
  cool:      ["#2563eb", "#0891b2", "#16a34a", "#65a30d", "#ca8a04", "#d97706", "#ea580c", "#dc2626"],
  business:  ["#1e40af", "#7c3aed", "#059669", "#d97706", "#dc2626", "#0891b2", "#be185d", "#4338ca"],
  nature:    ["#166534", "#15803d", "#65a30d", "#ca8a04", "#d97706", "#dc2626", "#92400e", "#44403c"],
  neon:      ["#00ffff", "#ff00ff", "#ffff00", "#00ff00", "#ff6600", "#6600ff", "#ff0066", "#00ff99"],
  earth:     ["#78350f", "#92400e", "#a16207", "#4d7c0f", "#15803d", "#0e7490", "#1e3a5f", "#4c1d95"],
};

function getPaletteColors(name: ColorPaletteName, count: number): string[] {
  const palette = PALETTES[name] ?? PALETTES.default;
  if (count <= palette.length) return palette.slice(0, count);
  // Generate more colors by varying brightness
  const result = [...palette];
  while (result.length < count) {
    const base = result[result.length % palette.length]!;
    const hsl = hexToHsl(base);
    const lightnessShift = ((result.length / palette.length) % 2 === 0 ? 10 : -10);
    result.push(hslToHex({ ...hsl, l: Math.max(15, Math.min(90, hsl.l + lightnessShift)) }));
  }
  return result;
}

// --- Color Utilities ---

interface HslColor { h: number; s: number; l: number }

function hexToHsl(hex: string): HslColor {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(hsl: HslColor): string {
  const { h, s, l } = hsl;
  const sNorm = s / 100;
  const lNorm = l / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Convert hex color with alpha to rgba string */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// --- Main Adapter ---

/**
 * Transform tabular data into a complete Chart.js configuration object.
 *
 * Input format:
 * ```ts
 * adapter({
 *   labels: ['Jan', 'Feb', 'Mar'],
 *   datasets: [
 *     { label: 'Revenue', values: [100, 200, 150] },
 *     { label: 'Cost', values: [80, 90, 85] },
 *   ],
 * })
 * ```
 */
export function createChartConfig(
  input: {
    labels?: string[];
    datasets: Array<{
      label: string;
      values: (number | null | undefined)[];
      color?: string;
      type?: ChartType;
      yAxis?: string;
      stack?: string;
      dashed?: boolean;
      fill?: boolean;
    }>;
  } | Array<{ label: string; value: number; category?: string }>,
  options: AdapterOptions = {},
): ChartJsConfig {
  const opts: Required<Omit<AdapterOptions, "secondaryAxis">> & Pick<AdapterOptions, "secondaryAxis"> = {
    autoDetectType: options.autoDetectType ?? true,
    palette: options.palette ?? "default",
    showDataLabels: options.showDataLabels ?? false,
    animate: options.animate !== false,
    responsive: options.responsive !== false,
    maintainAspectRatio: options.maintainAspectRatio !== false,
    defaultFill: options.defaultFill ?? false,
    showGrid: options.showGrid !== false,
    title: options.title,
    subtitle: options.subtitle,
    currency: options.currency ?? "",
    decimals: options.decimals ?? 0,
    maxPoints: options.maxPoints ?? 0,
    sortByValue: options.sortByValue,
    stacked: options.stacked ?? false,
    horizontal: options.horizontal ?? false,
    secondaryAxis: options.secondaryAxis,
  };

  // Normalize input into datasets array
  let normalizedInput: {
    labels?: string[];
    datasets: Array<{
      label: string;
      values: (number | null | undefined)[];
      color?: string;
      type?: ChartType;
      yAxis?: string;
      stack?: string;
      dashed?: boolean;
      fill?: boolean;
    }>;
  };

  if (Array.isArray(input)) {
    // Simple [{label, value}] format → convert to single-dataset format
    const sorted = opts.sortByValue
      ? [...input].sort((a, b) => opts.sortByValue === "asc" ? a.value - b.value : b.value - a.value)
      : input;
    normalizedInput = {
      labels: sorted.map((d) => d.label),
      datasets: [{
        label: "Values",
        values: sorted.map((d) => d.value),
      }],
    };
  } else {
    normalizedInput = input;
  }

  // Determine chart type
  let chartType: ChartType = "bar";
  if (opts.autoDetectType && !normalizedInput.datasets.some((d) => d.type)) {
    chartType = detectChartType(normalizedInput);
  }
  if (opts.horizontal && (chartType === "bar")) chartType = "horizontalBar";
  if (opts.stacked && (chartType === "bar" || chartType === "horizontalBar")) chartType = "stackedBar";

  // Assign colors
  const colors = getPaletteColors(opts.palette, normalizedInput.datasets.length);

  // Build datasets
  const datasets: Dataset[] = normalizedInput.datasets.map((ds, i) => {
    let values = ds.values;
    if (opts.maxPoints > 0 && values.length > opts.maxPoints) {
      values = values.slice(-opts.maxPoints);
    }

    const baseColor = ds.color ?? colors[i] ?? colors[0]!;

    const dataset: Dataset = {
      label: ds.label,
      data: values.map((v) => v ?? null),
      backgroundColor: getBackgroundColor(baseColor, chartType, i),
      borderColor: baseColor,
      borderWidth: chartType === "line" ? 2 : 0,
      fill: ds.fill ?? (chartType === "area" || opts.defaultFill ? (typeof baseColor === "string" ? hexToRgba(baseColor, 0.15) : false) : false),
      tension: chartType === "line" || chartType === "area" ? 0.3 : undefined,
      pointRadius: chartType === "line" ? 3 : undefined,
      pointHoverRadius: 5,
      order: i,
      stack: ds.stack,
      yAxisID: ds.yAxis ?? "y",
    };

    if (ds.dashed) dataset.borderDash = [6, 4];

    return dataset;
  });

  // Truncate labels if needed
  let labels = normalizedInput.labels;
  if (labels && opts.maxPoints > 0 && labels.length > opts.maxPoints) {
    labels = labels.slice(-opts.maxPoints);
  }

  // Build scales
  const scales = buildScales(chartType, opts, options.secondaryAxis);

  // Build plugins
  const plugins = buildPlugins(chartType, opts);

  // Assemble full config
  const config: ChartJsConfig = {
    type: mapType(chartType),
    data: { labels, datasets },
    options: {
      responsive: opts.responsive,
      maintainAspectRatio: opts.maintainAspectRatio,
      plugins,
      scales,
      animation: opts.animate ? { duration: 600, easing: "easeOutQuart" } : { duration: 0 },
      interaction: { mode: "index", intersect: false },
      elements: {
        line: { tension: 0.3 },
        point: { radius: 3, hoverRadius: 5 },
        bar: { borderRadius: chartType === "bar" ? 4 : 0 },
      },
    },
  };

  return config;
}

// --- Type Detection ---

function detectChartType(input: {
  labels?: string[];
  datasets: Array<{ label: string; values: (number | null | undefined)[] }>;
}): ChartType {
  const datasetCount = input.datasets.length;
  const pointCount = input.datasets[0]?.values.length ?? 0;
  const hasLabels = (input.labels?.length ?? 0) > 0;

  // Single dataset, few points → pie/doughnut
  if (datasetCount === 1 && pointCount <= 12 && hasLabels) return "pie";

  // Time-series-like (many points) → line
  if (pointCount > 20) return "line";

  // Multiple datasets with many points → line
  if (datasetCount >= 2 && pointCount > 8) return "line";

  // Default → bar
  return "bar";
}

function mapType(type: ChartType): ChartJsConfig["type"] {
  switch (type) {
    case "area": return "line";
    case "horizontalBar": return "bar";
    case "stackedBar": return "bar";
    default: return type as ChartJsConfig["type"];
  }
}

// --- Scale Building ---

function buildScales(
  chartType: ChartType,
  opts: Required<Omit<AdapterOptions, "secondaryAxis">>,
  secondaryAxis?: AxisConfig,
): ChartJsConfig["options"]["scales"] {
  // Pie/doughnut/radar/polarArea don't use Cartesian scales
  if (["pie", "doughnut", "radar", "polarArea"].includes(chartType)) return undefined;

  const isHorizontal = chartType === "horizontalBar";
  const isStacked = chartType === "stackedBar" || opts.stacked;
  const isTimeSeries = chartType === "line" || chartType === "area";

  const commonGrid = {
    display: opts.showGrid,
    color: "#e2e8f0",
    lineWidth: 1,
    drawBorder: false,
  };

  const valueFormat = buildValueFormatter(opts.currency, opts.decimals);

  const scales: NonNullable<ChartJsConfig["options"]["scales"]> = {};

  // X axis
  if (!isHorizontal) {
    scales.x = {
      stacked: isStacked,
      grid: isTimeSeries ? { ...commonGrid, drawOnChartArea: false } : commonGrid,
      ticks: { maxRotation: 45 },
      ...(isTimeSeries ? { scaleType: "time" as const } : {}),
    };
  } else {
    scales.x = {
      position: "top" as const,
      stacked: isStacked,
      grid: commonGrid,
      ticks: { ...valueFormat },
    };
  }

  // Y axis
  if (!isHorizontal) {
    scales.y = {
      position: "left" as const,
      stacked: isStacked,
      grid: commonGrid,
      ticks: valueFormat,
      beginAtZero: true,
    };
  } else {
    scales.y = {
      stacked: isStacked,
      grid: { ...commonGrid, drawOnChartArea: false },
      ticks: { maxRotation: 45 },
    };
  }

  // Secondary Y-axis
  if (secondaryAxis) {
    scales.y2 = {
      position: "right" as const,
      stacked: false,
      grid: { display: false },
      ...secondaryAxis,
      ticks: secondaryAxis.ticks ?? {},
    };
  }

  return scales;
}

function buildValueFormatter(currency: string, decimals: number): { callback: string } {
  if (currency) {
    return { callback: `(v) => '${currency}' + Number(v).toFixed(${decimals})` };
  }
  if (decimals > 0) {
    return { callback: `(v) => Number(v).toFixed(${decimals})` };
  }
  return {};
}

// --- Plugin Building ---

function buildPlugins(
  chartType: ChartType,
  opts: Required<Omit<AdapterOptions, "secondaryAxis">>,
): NonNullable<ChartJsConfig["options"]["plugins"]> {
  const plugins: NonNullable<ChartJsConfig["options"]["plugins"]> = {};

  // Title
  if (opts.title) {
    plugins.title = {
      display: true,
      text: opts.title,
      font: { size: 16, weight: "600" },
      color: "#1e293b",
    };
  }

  // Subtitle
  if (opts.subtitle) {
    plugins.subtitle = { display: true, text: opts.subtitle };
  }

  // Tooltip
  plugins.tooltip = {
    enabled: true,
    mode: "index",
    intersect: false,
    backgroundColor: "rgba(15,23,42,0.95)",
    titleColor: "#f8fafc",
    bodyColor: "#e2e8f0",
    borderColor: "#334155",
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    displayColors: true,
  };

  // Legend
  const hideLegend = ["pie", "doughnut"].includes(chartType);
  plugins.legend = {
    display: !hideLegend,
    position: "bottom",
    align: "center",
    labels: {
      boxWidth: 14,
      padding: 16,
      font: { size: 12 },
      usePointStyle: true,
    },
  };

  // Data labels
  if (opts.showDataLabels) {
    plugins.datalabels = {
      display: true,
      anchor: "end",
      align: "top",
      formatter: "(ctx) => ctx.parsed.y != null ? ctx.parsed.y.toLocaleString() : ''",
      color: "#475569",
      font: { size: 11, weight: "500" },
    };
  }

  return plugins;
}

// --- Background Color Helper ---

function getBackgroundColor(color: string, chartType: ChartType, index: number): string | string[] {
  switch (chartType) {
    case "line":
    case "area":
      return hexToRgba(color, 0.1);
    case "pie":
    case "doughnut":
    case "polarArea": {
      const palette = PALETTES.default;
      return palette.map((c) => hexToRgba(c, 0.75));
    }
    case "bar":
    case "stackedBar":
    case "horizontalBar":
      return hexToRgba(color, 0.8);
    default:
      return color;
  }
}

// --- Utility Functions ---

/**
 * Quick-create a simple bar/line chart config from minimal data.
 */
export function quickChart(
  labels: string[],
  values: number[],
  label = "Data",
  type: "bar" | "line" | "pie" = "bar",
): ChartJsConfig {
  return createChartConfig({
    labels,
    datasets: [{ label, values }],
  }, { autoDetectType: false }) as ChartJsConfig & { type: typeof type };
}

/**
 * Create a time series line chart config.
 */
export function timeSeriesChart(
  timestamps: (string | Date)[],
  datasets: Array<{ label: string; values: (number | null)[]; color?: string }>,
  options: Omit<AdapterOptions, "autoDetectType"> = {},
): ChartJsConfig {
  return createChartConfig({
    labels: timestamps.map((t) =>
      t instanceof Date ? t.toISOString() : t,
    ),
    datasets: datasets.map((d) => ({ ...d })),
  }, { ...options, autoDetectType: false });
}

/**
 * Create a multi-axis chart (e.g., revenue + profit margin).
 */
export function dualAxisChart(
  labels: string[],
  primaryDataset: { label: string; values: number[]; color?: string },
  secondaryDataset: { label: string; values: number[]; color?: string; axisConfig?: AxisConfig },
  options: AdapterOptions = {},
): ChartJsConfig {
  const config = createChartConfig({
    labels,
    datasets: [
      { ...primaryDataset },
      { ...secondaryDataset, yAxis: "y2" },
    ],
  }, { ...options, autoDetectType: false, secondaryAxis: secondaryDataset.axisConfig });
  return config;
}

/**
 * Update an existing config's data (efficient re-render helper).
 */
export function updateChartData(config: ChartJsConfig, newData: {
  labels?: string[];
  datasets: Array<{ label: string; values: (number | null)[] }>;
}): ChartJsConfig {
  const newDatasets = newData.datasets.map((ds, i) => ({
    ...(config.data.datasets[i] ?? {}),
    label: ds.label,
    data: ds.values.map((v) => v ?? null),
  }));

  return {
    ...config,
    data: {
      labels: newData.labels ?? config.data.labels,
      datasets: newDatasets,
    },
  };
}

/**
 * Export chart config as JSON (safe for serialization — strips functions).
 */
export function exportConfigJson(config: ChartJsConfig): string {
  return JSON.stringify(config, (_, val) =>
    typeof val === "function" ? val.toString() : val, 2);
}
