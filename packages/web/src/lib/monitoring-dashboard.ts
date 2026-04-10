/**
 * Monitoring Dashboard: Real-time metrics collection, time-series data storage,
 * chart rendering (canvas-based), alerting system, health checks,
 * dashboard layout engine, widget system, data aggregation,
 * export capabilities, theme support.
 */

// --- Types ---

export interface MetricPoint {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

export interface MetricSeries {
  id: string;
  name: string;
  unit?: string;
  color: string;
  points: MetricPoint[];
  type: "line" | "area" | "bar" | "scatter" | "step";
  visible: boolean;
  min?: number;
  max?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  metricId: string;
  condition: "gt" | "lt" | "gte" | "lte" | "eq" | "neq" | "inside" | "outside" | "rising" | "falling" | "absent";
  threshold: number | number[];
  duration: number;       // ms - how long condition must hold
  severity: "info" | "warning" | "critical";
  enabled: boolean;
  message: string;
  cooldown: number;        // ms between repeated alerts
  lastTriggered?: number;
  lastAcknowledged?: number;
  acknowledgedBy?: string;
  notifyChannels: string[];
}

export interface AlertEvent {
  ruleId: string;
  ruleName: string;
  metricId: string;
  value: number;
  threshold: number | number[];
  severity: AlertRule["severity"];
  message: string;
  triggeredAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  status: "firing" | "acknowledged" | "resolved";
}

export interface HealthCheckResult {
  name: string;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  latency?: number;
  message?: string;
  checkedAt: number;
  metadata?: Record<string, unknown>;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: WidgetConfig;
  refreshInterval?: number;
  dataSource?: string;
  style?: Record<string, string>;
}

export type WidgetType =
  | "metric"           // Single large number with trend
  | "chart"            // Line/area/bar chart
  | "gauge"            // Gauge/speedometer
  | "status-grid"      // Grid of status indicators
  | "table"            // Data table
  | "log-viewer"       // Scrolling log display
  | "heatmap"          // Heatmap grid
  | "funnel"           // Funnel visualization
  | "progress"         // Progress bar/circle
  | "counter"          // Animated counter
  | "sparkline"        // Mini inline chart
  | "status-badge"     // Colored status indicator
  | "comparison"       // Before/after comparison
  | "leaderboard"      // Ranked list
  | "timeline"         // Timeline of events;

export interface WidgetConfig {
  /** Chart-specific */
  seriesIds?: string[];
  timeRange?: { from: number; to: number } | "1h" | "6h" | "24h" | "7d" | "30d";
  yAxisMin?: number;
  yAxisMax?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  /** Metric-specific */
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trendWindow?: number;
  targetValue?: number;
  compareWith?: string;   // Compare with another metric
  /** Status grid */
  items?: Array<{ label: string; value: string; status: "good" | "warning" | "bad" }>;
  /** Table */
  columns?: Array<{ key: string; label: string; format?: string }>;
  /** Gauge */
  min?: number;
  max?: number;
  zones?: Array<{ from: number; to: number; color: string }>;
  /** Log viewer */
  maxLines?: number;
  filter?: string;
  levelColors?: Record<string, string>;
  /** Common */
  refreshIntervalMs?: number;
  height?: number;
  theme?: "light" | "dark";
}

// --- Time Series Store ---

export class TimeSeriesStore {
  private series = new Map<string, MetricSeries>();
  private maxPointsPerSeries = 10000;
  private retentionMs = 7 * 24 * 60 * 60 * 1000; // 7 days default

  /** Create or get a metric series */
  createSeries(config: Omit<MetricSeries, "points">): MetricSeries {
    const existing = this.series.get(config.id);
    if (existing) return existing;

    const series: MetricSeries = { ...config, points: [], visible: true };
    this.series.set(config.id, series);
    return series;
  }

  /** Add a data point to a series */
  addPoint(seriesId: string, value: number, tags?: Record<string, string>, timestamp?: number): void {
    const series = this.series.get(seriesId);
    if (!series) throw new Error(`Series ${seriesId} not found`);

    const point: MetricPoint = { timestamp: timestamp ?? Date.now(), value, tags };
    series.points.push(point);

    // Enforce max points
    if (series.points.length > this.maxPointsPerSeries) {
      const removeCount = series.points.length - this.maxPointsPerSeries;
      series.points.splice(0, removeCount);
    }

    // Update min/max
    if (series.min === undefined || value < series.min) series.min = value;
    if (series.max === undefined || value > series.max) series.max = value;
  }

  /** Add multiple points at once (bulk insert) */
  addBatch(seriesId: string, points: Array<{ value: number; timestamp?: number; tags?: Record<string, string> }>): void {
    for (const p of points) this.addPoint(seriesId, p.value, p.tags, p.timestamp);
  }

  /** Get a series */
  getSeries(seriesId: string): MetricSeries | undefined {
    return this.series.get(seriesId);
  }

  /** Get all series */
  getAllSeries(): MetricSeries[] { return Array.from(this.series.values()); }

  /** Query points within time range */
  query(seriesId: string, from: number, to: number, downsample?: number): MetricPoint[] {
    const series = this.series.get(seriesId);
    if (!series) return [];

    let points = series.points.filter((p) => p.timestamp >= from && p.timestamp <= to);

    // Downsample by averaging buckets
    if (downsample && points.length > downsample) {
      const bucketSize = Math.ceil(points.length / downsample);
      const result: MetricPoint[] = [];
      for (let i = 0; i < points.length; i += bucketSize) {
        const bucket = points.slice(i, i + bucketSize);
        const avg = bucket.reduce((s, p) => s + p.value, 0) / bucket.length;
        result.push({ timestamp: bucket[Math.floor(bucket.length / 2)]!.timestamp, value: avg });
      }
      points = result;
    }

    return points;
  }

  /** Aggregate values across series */
  aggregate(seriesIds: string[], from: number, to: number, fn: "avg" | "sum" | "min" | "max" | "count" | "p50" | "p90" | "p95" | "p99"): number {
    let allValues: number[] = [];
    for (const id of seriesIds) {
      const points = this.query(id, from, to);
      allValues.push(...points.map((p) => p.value));
    }
    if (allValues.length === 0) return 0;
    allValues.sort((a, b) => a - b);

    switch (fn) {
      case "avg": return allValues.reduce((s, v) => s + v, 0) / allValues.length;
      case "sum": return allValues.reduce((s, v) => s + v, 0);
      case "min": return allValues[0]!;
      case "max": return allValues[allValues.length - 1]!;
      case "count": return allValues.length;
      case "p50": return allValues[Math.floor(allValues.length * 0.5)]!;
      case "p90": return allValues[Math.floor(allValues.length * 0.9)]!;
      case "p95": return allValues[Math.floor(allValues.length * 0.95)]!;
      case "p99": return allValues[Math.floor(allValues.length * 0.99)]!;
      default: return 0;
    }
  }

  /** Delete old data beyond retention period */
  cleanup(): void {
    const cutoff = Date.now() - this.retentionMs;
    for (const [, series] of this.series) {
      series.points = series.points.filter((p) => p.timestamp >= cutoff);
    }
  }

  /** Set retention period */
  setRetention(ms: number): void { this.retentionMs = ms; }

  /** Set max points per series */
  setMaxPoints(max: number): void { this.maxPointsPerSeries = max; }

  /** Clear all data */
  clear(): void { this.series.clear(); }

  /** Export as JSON */
  exportJson(): object {
    return Object.fromEntries(
      Array.from(this.series.entries()).map(([id, s]) => [id, { ...s, points: s.points }])
    );
  }

  /** Get statistics about store */
  getStats(): { seriesCount: number; totalPoints: number; memoryEstimate: number } {
    let totalPoints = 0;
    for (const [, s] of this.series) totalPoints += s.points.length;
    return {
      seriesCount: this.series.size,
      totalPoints,
      memoryEstimate: totalPoints * 64, // rough estimate
    };
  }
}

// --- Alert Manager ---

export class AlertManager {
  private rules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, AlertEvent>();
  private alertHistory: AlertEvent[] = [];
  private listeners = new Set<(event: AlertEvent) => void>();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private store: TimeSeriesStore;

  constructor(store: TimeSeriesStore) { this.store = store; }

  /** Add an alert rule */
  addRule(rule: AlertRule): void { this.rules.set(rule.id, rule); }

  /** Remove an alert rule */
  removeRule(id: string): void {
    this.rules.delete(id);
    this.activeAlerts.delete(id);
  }

  /** Get a rule */
  getRule(id: string): AlertRule | undefined { return this.rules.get(id); }

  /** Get all rules */
  getAllRules(): AlertRule[] { return Array.from(this.rules.values()); }

  /** Get active alerts */
  getActiveAlerts(): AlertEvent[] { return Array.from(this.activeAlerts.values()); }

  /** Get alert history */
  getHistory(limit = 100): AlertEvent[] { return this.alertHistory.slice(-limit); }

  /** Acknowledge an alert */
  acknowledge(alertId: string, user: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === "firing") {
      alert.status = "acknowledged";
      alert.acknowledgedAt = Date.now();
      alert.acknowledgedBy = user;
      const rule = this.rules.get(alert.ruleId);
      if (rule) { rule.lastAcknowledged = Date.now(); }
    }
  }

  /** Start automatic checking */
  startCheck(intervalMs = 5000): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => this.checkAll(), intervalMs);
  }

  /** Stop automatic checking */
  stopCheck(): void {
    if (this.checkInterval) { clearInterval(this.checkInterval); this.checkInterval = null; }
  }

  /** Check all rules against current data */
  checkAll(): AlertEvent[] {
    const now = Date.now();
    const newAlerts: AlertEvent[] = [];

    for (const [, rule] of this.rules) {
      if (!rule.enabled) continue;

      const latest = this.getLatestValue(rule.metricId);
      if (latest === undefined) continue;

      const triggered = this.evaluateCondition(latest, rule.condition, rule.threshold);

      if (triggered) {
        const existing = this.activeAlerts.get(rule.id);
        if (!existing) {
          // New alert - check duration requirement
          const event: AlertEvent = {
            ruleId: rule.id, ruleName: rule.name, metricId: rule.metricId,
            value: latest, threshold: rule.threshold, severity: rule.severity,
            message: rule.message.replace("{value}", String(latest)),
            triggeredAt: now, status: "firing",
          };

          // For immediate conditions (no duration), fire right away
          if (rule.duration <= 0) {
            this.fireAlert(event);
            newAlerts.push(event);
          } else {
            // Track pending alert - will be checked on next cycle
            this.activeAlerts.set(rule.id, event);
          }
        } else if (existing.status === "firing") {
          // Check if duration has elapsed
          if (now - existing.triggeredAt >= rule.duration) {
            this.fireAlert(existing);
            newAlerts.push(existing);
          }
        }
      } else {
        // Condition not met - resolve if was firing
        const existing = this.activeAlerts.get(rule.id);
        if (existing && (existing.status === "firing" || existing.status === "acknowledged")) {
          existing.status = "resolved";
          existing.resolvedAt = now;
          this.alertHistory.push(existing);
          this.activeAlerts.delete(rule.id);
          rule.lastTriggered = undefined;
        }
      }
    }

    return newAlerts;
  }

  /** Listen for alert events */
  onAlert(listener: (event: AlertEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Get alert statistics */
  getStats(): { totalRules: number; activeRules: number; firingCount: number; acknowledgedCount: number; resolvedToday: number } {
    const now = Date.now();
    const startOfDay = new Date(now).setHours(0, 0, 0, 0);
    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter((r) => r.enabled).length,
      firingCount: Array.from(this.activeAlerts.values()).filter((a) => a.status === "firing").length,
      acknowledgedCount: Array.from(this.activeAlerts.values()).filter((a) => a.status === "acknowledged").length,
      resolvedToday: this.alertHistory.filter((a) => a.resolvedAt && a.resolvedAt >= startOfDay).length,
    };
  }

  private fireAlert(event: AlertEvent): void {
    const rule = this.rules.get(event.ruleId);
    if (rule) rule.lastTriggered = Date.now();
    this.alertHistory.push(event);
    for (const l of this.listeners) l(event);
  }

  private getLatestValue(metricId: string): number | undefined {
    const series = this.store.getSeries(metricId);
    if (!series || series.points.length === 0) return undefined;
    return series.points[series.points.length - 1]!.value;
  }

  private evaluateCondition(value: number, condition: AlertRule["condition"], threshold: number | number[]): boolean {
    switch (condition) {
      case "gt": return value > (threshold as number);
      case "lt": return value < (threshold as number);
      case "gte": return value >= (threshold as number);
      case "lte": return value <= (threshold as number);
      case "eq": return value === (threshold as number);
      case "neq": return value !== (threshold as number);
      case "inside": { const t = threshold as number[]; return value >= t[0]! && value <= t[1]!; }
      case "outside": { const t = threshold as number[]; return value < t[0]! || value > t[1]!; }
      default: return false;
    }
  }

  destroy(): void { this.stopCheck(); this.rules.clear(); this.activeAlerts.clear(); }
}

// --- Health Checker ---

export class HealthChecker {
  private checks = new Map<string, () => Promise<HealthCheckResult>>();
  private results = new Map<string, HealthCheckResult>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<(result: HealthCheckResult) => void>();

  /** Register a health check */
  register(name: string, checkFn: () => Promise<HealthCheckResult>): void {
    this.checks.set(name, checkFn);
  }

  /** Unregister a health check */
  unregister(name: string): void { this.checks.delete(name); }

  /** Run a single check */
  async runCheck(name: string): Promise<HealthCheckResult> {
    const fn = this.checks.get(name);
    if (!fn) throw new Error(`Health check "${name}" not registered`);
    try {
      const result = await fn();
      this.results.set(name, result);
      for (const l of this.listeners) l(result);
      return result;
    } catch (err) {
      const errorResult: HealthCheckResult = {
        name, status: "unhealthy", message: (err as Error).message, checkedAt: Date.now(),
      };
      this.results.set(name, errorResult);
      for (const l of this.listeners) l(errorResult);
      return errorResult;
    }
  }

  /** Run all checks */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    const results = await Promise.all(Array.from(this.checks.keys()).map((name) => this.runCheck(name)));
    return results;
  }

  /** Start periodic checking */
  start(intervalMs = 30000): void {
    if (this.interval) return;
    this.runAllChecks(); // Run immediately
    this.interval = setInterval(() => this.runAllChecks(), intervalMs);
  }

  /** Stop periodic checking */
  stop(): void { if (this.interval) { clearInterval(this.interval); this.interval = null; } }

  /** Get overall health status */
  getOverallStatus(): "healthy" | "degraded" | "unhealthy" {
    const statuses = Array.from(this.results.values()).map((r) => r.status);
    if (statuses.includes("unhealthy")) return "unhealthy";
    if (statuses.includes("degraded") || statuses.includes("unknown")) return "degraded";
    return "healthy";
  }

  /** Get all results */
  getAllResults(): HealthCheckResult[] { return Array.from(this.results.values()); }

  /** Listen for results */
  onResult(listener: (result: HealthCheckResult) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void { this.stop(); this.checks.clear(); this.results.clear(); }
}

// --- Dashboard Layout Engine ---

export class DashboardLayout {
  private widgets: Map<string, DashboardWidget> = new Map();
  private gridSize = { cols: 12, rows: 12 };
  private cellSize = { width: 80, height: 60 };
  private gap = 8;
  private listeners = new Set<(event: LayoutEvent) => void>();

  /** Add a widget to the dashboard */
  addWidget(widget: DashboardWidget): void {
    this.widgets.set(widget.id, widget);
    this.emit({ type: "widget:add", widgetId: widget.id });
  }

  /** Remove a widget */
  removeWidget(id: string): void {
    this.widgets.delete(id);
    this.emit({ type: "widget:remove", widgetId: id });
  }

  /** Move/resize widget */
  updateWidget(id: string, updates: Partial<Pick<DashboardWidget, "position" | "config" | "style" | "title">>): void {
    const widget = this.widgets.get(id);
    if (widget) Object.assign(widget, updates);
    this.emit({ type: "widget:update", widgetId: id });
  }

  /** Get a widget */
  getWidget(id: string): DashboardWidget | undefined { return this.widgets.get(id); }

  /** Get all widgets */
  getAllWidgets(): DashboardWidget[] { return Array.from(this.widgets.values()); }

  /** Auto-arrange widgets in grid */
  autoArrange(algorithm: "row-first" | "column-first" | "pack" = "row-first"): void {
    const widgets = Array.from(this.widgets.values());
    if (algorithm === "row-first") {
      let col = 0, row = 0;
      for (const w of widgets) {
        if (col + w.position.w > this.gridSize.cols) { col = 0; row++; }
        w.position = { x: col, y: row, w: w.position.w, h: w.position.h };
        col += w.position.w + 1;
      }
    } else if (algorithm === "column-first") {
      let col = 0, row = 0;
      for (const w of widgets) {
        if (row + w.position.h > this.gridSize.rows) { col++; row = 0; }
        w.position = { x: col, y: row, w: w.position.w, h: w.position.h };
        row += w.position.h + 1;
      }
    }
    this.emit({ type: "layout:changed" });
  }

  /** Check for overlapping widgets */
  findOverlaps(widgetId: string): DashboardWidget[] {
    const widget = this.widgets.get(widgetId);
    if (!widget) return [];
    return Array.from(this.widgets.values()).filter((w) =>
      w.id !== widgetId &&
      this.rectsOverlap(
        widget.position.x, widget.position.y, widget.position.w, widget.position.h,
        w.position.x, w.position.y, w.position.w, w.position.h
      )
    );
  }

  /** Export layout state */
  exportLayout(): object {
    return {
      gridSize: this.gridSize,
      cellSize: this.cellSize,
      gap: this.gap,
      widgets: Array.from(this.widgets.entries()).map(([id, w]) => ({ id, ...w })),
    };
  }

  /** Import layout state */
  importLayout(data: { widgets: Array<Omit<DashboardWidget, never">>; gridSize?: typeof this.gridSize }): void {
    this.widgets.clear();
    if (data.gridSize) this.gridSize = data.gridSize;
    for (const w of data.widgets) this.widgets.set(w.id, w);
    this.emit({ type: "layout:loaded" });
  }

  /** Calculate dashboard dimensions in pixels */
  getSize(): { width: number; height: number } {
    let maxX = 0, maxY = 0;
    for (const w of this.widgets.values()) {
      maxX = Math.max(maxX, w.position.x + w.position.w);
      maxY = Math.max(maxY, w.position.y + w.position.h);
    }
    return {
      width: maxX * (this.cellSize.width + this.gap),
      height: maxY * (this.cellSize.height + this.gap),
    };
  }

  onLayoutChange(listener: (event: LayoutEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private rectsOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number): boolean {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  }

  private emit(event: LayoutEvent): void { for (const l of this.listeners) l(event); }
}

interface LayoutEvent {
  type: "widget:add" | "widget:remove" | "widget:update" | "layout:changed" | "layout:loaded";
  widgetId?: string;
}

// --- Canvas Chart Renderer ---

export class MonitoringChartRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private theme: "light" | "dark" = "light";

  private colors = {
    light: {
      bg: "#ffffff", text: "#333333", grid: "#e5e5e5", axis: "#999999",
      tooltipBg: "rgba(0,0,0,0.85)", tooltipText: "#ffffff",
    },
    dark: {
      bg: "#1a1a2e", text: "#e0e0e0", grid: "#2a2a4a", axis: "#666688",
      tooltipBg: "rgba(255,255,255,0.9)", tooltipText: "#1a1a2e",
    },
  };

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) this.attach(canvas);
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dpr = window.devicePixelRatio || 1;
  }

  setTheme(theme: "light" | "dark"): void { this.theme = theme; }

  /** Render a monitoring chart */
  renderChart(data: {
    series: MetricSeries[];
    width: number;
    height: number;
    timeRange?: { from: number; to: number };
    showLegend?: boolean;
    showGrid?: boolean;
    yAxisLabel?: string;
    xAxisFormat?: "time" | "relative";
    title?: string;
  }): void {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;

    const c = this.colors[this.theme];
    const dpr = this.dpr;
    const w = data.width * dpr;
    const h = data.height * dpr;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${data.width}px`;
    canvas.style.height = `${data.height}px`;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, data.width, data.height);

    const padding = { top: data.title ? 40 : 20, right: 20, bottom: 40, left: 60 };
    const chartW = data.width - padding.left - padding.right;
    const chartH = data.height - padding.top - padding.bottom;

    // Title
    if (data.title) {
      ctx.fillStyle = c.text;
      ctx.font = "bold 14px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(data.title, data.width / 2, 28);
    }

    // Determine time range and value range
    const range = data.timeRange ?? this.autoTimeRange(data.series);
    const valueRange = this.autoValueRange(data.series);

    // Draw grid
    if (data.showGrid !== false) this.drawGrid(ctx, padding, chartW, chartH, valueRange, c.grid);

    // Draw axes
    this.drawAxes(ctx, padding, chartW, chartH, valueRange, range, c.axis, data.yAxisLabel, data.xAxisFormat);

    // Draw each series
    for (const series of data.series) {
      if (!series.visible) continue;
      const points = this.filterPoints(series, range);
      switch (series.type) {
        case "line":
        case "area":
          this.drawLineOrArea(ctx, points, padding, chartW, chartH, range, valueRange, series.color, series.type === "area");
          break;
        case "bar":
          this.drawBars(ctx, points, padding, chartW, chartH, range, valueRange, series.color, data.series);
          break;
        case "scatter":
          this.drawScatter(ctx, points, padding, chartW, chartH, range, valueRange, series.color);
          break;
        case "step":
          this.drawStepLine(ctx, points, padding, chartW, chartH, range, valueRange, series.color);
          break;
      }
    }

    // Legend
    if (data.showLegend !== false) this.drawLegend(ctx, data.series, data.width, data.height - 10, c.text);

    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
  }

  /** Render a gauge/speedometer */
  renderGauge(data: {
    value: number;
    min: number;
    max: number;
    width: number;
    height: number;
    label?: string;
    unit?: string;
    zones?: Array<{ from: number; to: number; color: string }>;
    color?: string;
  }): void {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;

    const c = this.colors[this.theme];
    const dpr = this.dpr;
    const size = Math.min(data.width, data.height);
    canvas.width = data.width * dpr;
    canvas.height = data.height * dpr;
    canvas.style.width = `${data.width}px`;
    canvas.style.height = `${data.height}px`;
    ctx.scale(dpr, dpr);

    const cx = data.width / 2;
    const cy = data.height / 2 + 10;
    const radius = size * 0.35;
    const lineWidth = size * 0.06;
    const startAngle = 0.75 * Math.PI;
    const endAngle = 2.25 * Math.PI;
    const angleRange = endAngle - startAngle;

    ctx.clearRect(0, 0, data.width, data.height);

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = c.grid;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Zones (if provided)
    const zones = data.zones ?? [{ from: data.min, to: data.max, color: data.color ?? "#007aff" }];
    for (const zone of zones) {
      const zoneStart = startAngle + ((zone.from - data.min) / (data.max - data.min)) * angleRange;
      const zoneEnd = startAngle + ((zone.to - data.min) / (data.max - data.min)) * angleRange;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, zoneStart, zoneEnd);
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // Value arc
    const pct = Math.max(0, Math.min(1, (data.value - data.min) / (data.max - data.min)));
    const valueAngle = startAngle + pct * angleRange;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, valueAngle);
    ctx.strokeStyle = data.color ?? "#007aff";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Value text
    ctx.fillStyle = c.text;
    ctx.font = `bold ${size * 0.15}px -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(Math.round(data.value)), cx, cy - 8);

    // Unit
    if (data.unit) {
      ctx.font = `${size * 0.06}px -apple-system, sans-serif`;
      ctx.fillStyle = c.axis;
      ctx.fillText(data.unit, cx, cy + 16);
    }

    // Label
    if (data.label) {
      ctx.font = `${size * 0.05}px -apple-system, sans-serif`;
      ctx.fillText(data.label, cx, cy + size * 0.28);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Render a sparkline (mini inline chart) */
  renderSparkline(data: {
    points: MetricPoint[];
    width: number;
    height: number;
    color?: string;
    fill?: boolean;
    showDot?: boolean;
  }): void {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;

    const c = this.colors[this.theme];
    const dpr = this.dpr;
    canvas.width = data.width * dpr;
    canvas.height = data.height * dpr;
    canvas.style.width = `${data.width}px`;
    canvas.style.height = `${data.height}px`;
    ctx.scale(dpr, dpr);

    const pts = data.points;
    if (pts.length < 2) return;

    const minVal = Math.min(...pts.map((p) => p.value));
    const maxVal = Math.max(...pts.map((p) => p.value));
    const range = maxVal - minVal || 1;
    const padX = 2, padY = 2;
    const w = data.width - padX * 2;
    const h = data.height - padY * 2;

    // Fill area
    if (data.fill) {
      ctx.beginPath();
      ctx.moveTo(padX, padY + h);
      pts.forEach((p, i) => {
        const x = padX + (i / (pts.length - 1)) * w;
        const y = padY + h - ((p.value - minVal) / range) * h;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(padX + w, padY + h);
      ctx.closePath();
      ctx.fillStyle = (data.color ?? "#007aff") + "20";
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = padX + (i / (pts.length - 1)) * w;
      const y = padY + h - ((p.value - minVal) / range) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = data.color ?? "#007aff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // End dot
    if (data.showDot !== false && pts.length > 0) {
      const last = pts[pts.length - 1]!;
      const x = padX + w;
      const y = padY + h - ((last.value - minVal) / range) * h;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = data.color ?? "#007aff";
      ctx.fill();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Render a status badge */
  renderStatusBadge(data: {
    status: "good" | "warning" | "bad" | "unknown" | "neutral";
    label: string;
    width: number;
    height: number;
    size?: "sm" | "md" | "lg";
  }): void {
    const { canvas, ctx } = this;
    if (!canvas || !ctx) return;

    const dpr = this.dpr;
    canvas.width = data.width * dpr;
    canvas.height = data.height * dpr;
    canvas.style.width = `${data.width}px`;
    canvas.style.height = `${data.height}px`;
    ctx.scale(dpr, dpr);

    const sizeMap = { sm: 6, md: 8, lg: 10 };
    const dotSize = sizeMap[data.size ?? "md"];
    const colorMap = { good: "#22c55e", warning: "#f59e0b", bad: "#ef4444", unknown: "#9ca3af", neutral: "#3b82f6" };
    const color = colorMap[data.status];

    const fontSize = sizeMap[data.size ?? "md"] === 6 ? 11 : sizeMap[data.size ?? "md"] === 8 ? 13 : 15;
    ctx.font = `${fontSize}px -apple-system, sans-serif`;
    const textWidth = ctx.measureText(data.label).width;

    // Background pill
    const pillW = dotSize + 8 + textWidth + 12;
    const pillH = data.height - 4;
    const rx = pillH / 2;
    const x = (data.width - pillW) / 2;
    const y = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, pillW, pillH, rx);
    ctx.fillStyle = color + "18";
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(x + dotSize / 2 + 6, y + pillH / 2, dotSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Label
    ctx.fillStyle = this.colors[this.theme].text;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(data.label, x + dotSize + 10, y + pillH / 2);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Export chart as image data URL */
  toDataURL(type = "image/png"): string | null {
    return this.canvas?.toDataURL(type) ?? null;
  }

  // --- Private rendering helpers ---

  private drawGrid(ctx: CanvasRenderingContext2D, pad: { top: number; right: number; bottom: number; left: number }, w: number, h: number, range: { min: number; max: number }, color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    const yLines = 5;
    for (let i = 0; i <= yLines; i++) {
      const y = pad.top + (h / yLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + w, y);
      ctx.stroke();
    }
    const xLines = 6;
    for (let i = 0; i <= xLines; i++) {
      const x = pad.left + (w / xLines) * i;
      ctx.beginPath();
      ctx.moveTo(x, pad.top);
      ctx.lineTo(x, pad.top + h);
      ctx.stroke();
    }
  }

  private drawAxes(ctx: CanvasRenderingContext2D, pad: { top: number; right: number; bottom: number; left: number }, w: number, h: number, valueRange: { min: number; max: number }, timeRange: { from: number; to: number }, color: string, yLabel?: string, xFormat?: string): void {
    ctx.fillStyle = color;
    ctx.font = "11px -apple-system, sans-serif";

    // Y-axis labels
    const ySteps = 5;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= ySteps; i++) {
      const val = valueRange.min + ((valueRange.max - valueRange.min) / ySteps) * (ySteps - i);
      const y = pad.top + (h / ySteps) * i;
      ctx.fillText(this.formatValue(val), pad.left - 8, y);
    }
    if (yLabel) {
      ctx.save();
      ctx.translate(14, pad.top + h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    // X-axis labels
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xSteps = 6;
    for (let i = 0; i <= xSteps; i++) {
      const ts = timeRange.from + ((timeRange.to - timeRange.from) / xSteps) * i;
      const x = pad.left + (w / xSteps) * i;
      ctx.fillText(this.formatTime(ts, xFormat), x, pad.top + h + 8);
    }
  }

  private drawLineOrArea(ctx: CanvasRenderingContext2D, points: MetricPoint[], pad: { top: number; left: number }, w: number, h: number, timeRange: { from: number; to: number }, valueRange: { min: number; max: number }, color: string, fill: boolean): void {
    if (points.length < 2) return;

    const toX = (ts: number) => pad.left + ((ts - timeRange.from) / (timeRange.to - timeRange.from)) * w;
    const toY = (val: number) => pad.top + h - ((val - valueRange.min) / (valueRange.max - valueRange.min)) * h;

    if (fill) {
      ctx.beginPath();
      ctx.moveTo(toX(points[0].timestamp), toY(valueRange.min));
      for (const p of points) ctx.lineTo(toX(p.timestamp), toY(p.value));
      ctx.lineTo(toX(points[points.length - 1]!.timestamp), toY(valueRange.min));
      ctx.closePath();
      ctx.fillStyle = color + "18";
      ctx.fill();
    }

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      i === 0 ? ctx.moveTo(toX(p.timestamp), toY(p.value)) : ctx.lineTo(toX(p.timestamp), toY(p.value));
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawBars(ctx: CanvasRenderingContext2D, points: MetricPoint[], pad: { top: number; left: number }, w: number, h: number, timeRange: { from: number; to: number }, valueRange: { min: number; max: number }, color: string, _allSeries: MetricSeries[]): void {
    if (points.length === 0) return;
    const barGroupWidth = w / points.length;
    const barWidth = barGroupWidth * 0.7;
    const toX = (ts: number) => pad.left + ((ts - timeRange.from) / (timeRange.to - timeRange.from)) * w - barWidth / 2;
    const toY = (val: number) => pad.top + h - ((val - valueRange.min) / (valueRange.max - valueRange.min)) * h;
    const zeroY = toY(0);

    for (const p of points) {
      const x = toX(p.timestamp);
      const y = toY(p.value);
      const barH = Math.abs(y - zeroY);
      ctx.fillStyle = color + "cc";
      ctx.fillRect(x, Math.min(y, zeroY), barWidth, barH);
    }
  }

  private drawScatter(ctx: CanvasRenderingContext2D, points: MetricPoint[], pad: { top: number; left: number }, w: number, h: number, timeRange: { from: number; to: number }, valueRange: { min: number; max: number }, color: string): void {
    const toX = (ts: number) => pad.left + ((ts - timeRange.from) / (timeRange.to - timeRange.from)) * w;
    const toY = (val: number) => pad.top + h - ((val - valueRange.min) / (valueRange.max - valueRange.min)) * h;
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(toX(p.timestamp), toY(p.value), 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  private drawStepLine(ctx: CanvasRenderingContext2D, points: MetricPoint[], pad: { top: number; left: number }, w: number, h: number, timeRange: { from: number; to: number }, valueRange: { min: number; max: number }, color: string): void {
    if (points.length < 2) return;
    const toX = (ts: number) => pad.left + ((ts - timeRange.from) / (timeRange.to - timeRange.from)) * w;
    const toY = (val: number) => pad.top + h - ((val - valueRange.min) / (valueRange.max - valueRange.min)) * h;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      const x = toX(p.timestamp);
      const y = toY(p.value);
      if (i === 0) ctx.moveTo(x, y);
      else {
        ctx.lineTo(x, toY(points[i - 1]!.value)); // horizontal step
        ctx.lineTo(x, y); // vertical step
      }
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawLegend(ctx: CanvasRenderingContext2D, series: MetricSeries[], y: number, textColor: string): void {
    const visible = series.filter((s) => s.visible);
    if (visible.length === 0) return;
    ctx.font = "11px -apple-system, sans-serif";
    const itemWidth = 100;
    const totalWidth = visible.length * itemWidth;
    let startX = ctx.canvas.width / (window.devicePixelRatio || 1) / 2 - totalWidth / 2;

    for (const s of visible) {
      // Color swatch
      ctx.fillStyle = s.color;
      ctx.fillRect(startX, y - 4, 12, 12);
      // Label
      ctx.fillStyle = textColor;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(s.name, startX + 16, y + 2);
      startX += itemWidth;
    }
  }

  private filterPoints(series: MetricSeries, range: { from: number; to: number }): MetricPoint[] {
    return series.points.filter((p) => p.timestamp >= range.from && p.timestamp <= range.to);
  }

  private autoTimeRange(series: MetricSeries[]): { from: number; to: number } {
    let min = Infinity, max = -Infinity;
    for (const s of series) {
      for (const p of s.points) {
        if (p.timestamp < min) min = p.timestamp;
        if (p.timestamp > max) max = p.timestamp;
      }
    }
    if (min === Infinity) {
      const now = Date.now();
      return { from: now - 3600000, to: now };
    }
    return { from: min, to: max };
  }

  private autoValueRange(series: MetricSeries[]): { min: number; max: number } {
    let min = Infinity, max = -Infinity;
    for (const s of series) {
      if (s.min !== undefined && s.min < min) min = s.min;
      if (s.max !== undefined && s.max > max) max = s.max;
      for (const p of s.points) {
        if (p.value < min) min = p.value;
        if (p.value > max) max = p.value;
      }
    }
    if (min === Infinity) return { min: 0, max: 100 };
    const padding = (max - min) * 0.05 || 1;
    return { min: min - padding, max: max + padding };
  }

  private formatValue(val: number): string {
    if (Math.abs(val) >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (Math.abs(val) >= 1000) return (val / 1000).toFixed(1) + "K";
    if (Number.isInteger(val)) return String(val);
    return val.toFixed(2);
  }

  private formatTime(ts: number, format?: string): string {
    if (format === "relative") {
      const diff = Date.now() - ts;
      if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      return `${Math.floor(diff / 3600000)}h ago`;
    }
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
}

// --- Utility Functions ---

/** Format bytes for display */
export function formatMetricBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/** Format uptime */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  return parts.join(" ");
}

/** Calculate percentage change */
export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/** Generate trend indicator (up/down/stable arrow) */
export function getTrendIndicator(current: number, previous: number): { direction: "up" | "down" | "stable"; percent: number; color: string } {
  const change = calcPercentChange(current, previous);
  if (Math.abs(change) < 0.5) return { direction: "stable", percent: change, color: "#9ca3af" };
  if (change > 0) return { direction: "up", percent: change, color: "#22c55e" };
  return { direction: "down", percent: change, color: "#ef4444" };
}

/** Smooth value using exponential moving average */
export function emaSmooth(current: number, previous: number, alpha = 0.3): number {
  if (previous === 0) return current;
  return alpha * current + (1 - alpha) * previous;
}
