/**
 * Stats Card: Statistics display card with animated counter, sparkline (mini chart),
 * trend indicator, icon, progress bar, comparison value, and multiple variants.
 */

// --- Types ---

export type TrendDirection = "up" | "down" | "neutral" | "none";
export type StatsVariant = "default" | "gradient" | "outline" | "filled";

export interface SparklinePoint {
  value: number;
  label?: string;
}

export interface StatsCardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Main statistic value */
  value: number | string;
  /** Label/title */
  label: string;
  /** Description/subtitle */
  description?: string;
  /** Icon (emoji or HTML string) */
  icon?: string;
  /** Icon background color */
  iconBg?: string;
  /** Icon text color */
  iconColor?: string;
  /** Previous/compare value (for trend calculation) */
  previousValue?: number;
  /** Trend direction override */
  trend?: TrendDirection;
  /** Trend percentage display */
  showTrend?: boolean;
  /** Sparkline data points */
  sparkline?: SparklinePoint[];
  /** Sparkline color */
  sparklineColor?: string;
  /** Progress value (0-100) */
  progress?: number;
  /** Progress color */
  progressColor?: string;
  /** Card variant */
  variant?: StatsVariant;
  /** Value prefix (e.g., "$", "€") */
  prefix?: string;
  /** Value suffix (e.g., "%", "ms") */
  suffix?: string;
  /** Number formatting options */
  format?: { style: "decimal" | "percent" | "currency" | "compact"; decimals?: number };
  /** Click callback */
  onClick?: () => void;
  /** Custom CSS class */
  className?: string;
  /** Animate number on mount? (default: true) */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
}

export interface StatsCardInstance {
  element: HTMLElement;
  /** Update the value with optional animation */
  setValue: (value: number | string) => void;
  /** Update trend */
  setTrend: (trend: TrendDirection) => void;
  /** Update progress */
  setProgress: (value: number) => void;
  /** Update sparkline data */
  setSparkline: (data: SparklinePoint[]) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Helpers ---

function formatNumber(value: number, fmt?: StatsCardOptions["format"]): string {
  if (!fmt) return String(Math.round(value));

  switch (fmt.style) {
    case "percent": return `${(value * 1).toFixed(fmt.decimals ?? 1)}%`;
    case "currency": return `${fmt.prefix ?? "$"}${value.toLocaleString("en-US", { minimumFractionDigits: fmt.decimals ?? 2 })}`;
    case "decimal": return value.toFixed(fmt.decimals ?? 1);
    case "compact":
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
      if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
      return String(value);
    default:
      return typeof value === "number"
        ? value.toLocaleString("en-US", { maximumFractionDigits: 1 })
        : String(value);
  }
}

function calcTrend(current: number, previous: number): { direction: TrendDirection; percent: number } {
  if (previous === 0 || previous == null) return { direction: "neutral", percent: 0 };
  const percent = ((current - previous) / Math.abs(previous)) * 100;
  const direction = current > previous ? "up" : current < previous ? "down" : "neutral";
  return { direction, percent: Math.abs(percent) };
}

function buildSparklineSvg(data: SparklinePoint[], color: string, width = 120, height = 32): string {
  if (!data || data.length < 2) return "";

  const min = Math.min(...data.map((p) => p.value));
  const max = Math.max(...data.map((p) => p.value));
  const range = max - min || 1;

  const points = data.map((p, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((p.value - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(" ");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="${points}"/></svg>`;
}

// --- Main Class ---

export class StatsCardManager {
  create(options: StatsCardOptions): StatsCardInstance {
    const opts = {
      showTrend: options.showTrend ?? true,
      animate: options.animate ?? true,
      animationDuration: options.animationDuration ?? 1500,
      variant: options.variant ?? "default",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("StatsCard: container not found");

    container.className = `stats-card stats-${opts.variant} ${opts.className ?? ""}`;

    // Determine trend
    let trend: { direction: TrendDirection; percent: number };
    if (opts.trend) {
      trend = { direction: opts.trend, percent: 0 };
    } else if (typeof opts.value === "number" && opts.previousValue !== undefined) {
      trend = calcTrend(opts.value, opts.previousValue);
    }

    // Build card based on variant
    this.buildCard(container, opts, trend);

    const instance: StatsCardInstance = {
      element: container,

      setValue(value: number | string) {
        opts.value = value;
        if (typeof value === "number" && opts.previousValue !== undefined) {
          trend = calcTrend(value, opts.previousValue);
          this.updateTrendDisplay(container, trend);
        }
        this.updateValueDisplay(container, opts);
        if (opts.animate && typeof value === "number") this.animateValue(container, value);
      },

      setTrend(t: TrendDirection) {
        trend.direction = t;
        this.updateTrendDisplay(container, trend);
      },

      setProgress(val: number) {
        opts.progress = val;
        const progEl = container.querySelector(".sc-progress-bar");
        if (progEl) {
          (progEl as HTMLElement).style.width = `${Math.min(100, Math.max(0, val))}%`;
        }
      },

      setSparkline(data: SparklinePoint[]) {
        opts.sparkline = data;
        const slEl = container.querySelector(".sc-sparkline");
        if (slEl) slEl.innerHTML = buildSparklineSvg(data, opts.sparklineColor ?? "#6366f1");
      },

      destroy() {
        container.innerHTML = "";
      },
    };

    // Initial animations
    if (opts.animate && typeof opts.value === "number") {
      setTimeout(() => instance.animateValue(container, opts.value as number), 100);
    }

    return instance;
  }

  private buildCard(el: HTMLElement, opts: StatsCardOptions, trend: { direction: TrendDirection; percent: number }): void {
    const isFilled = opts.variant === "filled";
    const isGradient = opts.variant === "gradient";

    el.style.cssText = `
      border-radius:12px;padding:20px;cursor:${opts.onClick ? "pointer" : "default"};
      font-family:-apple-system,sans-serif;transition:transform 0.2s,box-shadow 0.2s;
      position:relative;overflow:hidden;
      ${isFilled
        ? `background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;`
        : isGradient
          ? `background:linear-gradient(135deg,#eef2ff 0%,#fce7f3 100%);`
          : `background:#fff;border:1px solid #e5e7eb;`}
      box-shadow:0 2px 8px rgba(0,0,0,0.04);
    `;

    // Header row: icon + main content
    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;gap:14px;";

    // Icon
    if (opts.icon) {
      const iconWrap = document.createElement("div");
      iconWrap.style.cssText = `
        width:44px;height:44px;border-radius:11px;display:flex;align-items:center;
        justify-content:center;font-size:20px;flex-shrink:0;
        background:${opts.iconBg ?? (isFilled ? "rgba(255,255,255,0.2)" : "#f0f0ff")};
        color:${opts.iconColor ?? (isFilled ? "#fff" : "#4338ca")};
      `;
      iconWrap.textContent = opts.icon;
      header.appendChild(iconWrap);
    }

    // Content
    const content = document.createElement("div");
    content.style.cssText = "flex:1;min-width:0;";

    // Label
    const labelEl = document.createElement("div");
    labelEl.textContent = opts.label;
    labelEl.style.cssText = `font-size:12px;font-weight:500;margin-bottom:4px;${isFilled ? "color:rgba(255,255,255,0.8);" : "color:#6b7280;"}`;
    content.appendChild(labelEl);

    // Value row
    const valueRow = document.createElement("div");
    valueRow.style.cssText = "display:flex;align-items:baseline;gap:6px;";

    const valueEl = document.createElement("span");
    valueEl.className = "sc-value";
    valueEl.style.cssText = `
      font-size:28px;font-weight:700;line-height:1;
      ${isFilled ? "color:#fff;" : "color:#111827;"}
      letter-spacing:-0.5px;
    `;
    if (typeof opts.value === "string") {
      valueEl.textContent = opts.value;
    } else {
      valueEl.textContent = (opts.prefix ?? "") + formatNumber(opts.value, opts.format) + (opts.suffix ?? "");
    }
    valueRow.appendChild(valueEl);

    // Trend badge
    if (opts.showTrend && trend.direction !== "none") {
      const trendBadge = document.createElement("span");
      const trendIcon = trend.direction === "up" ? "\u2191" : trend.direction === "down" ? "\u2193" : "\u2014";
      const trendColor = trend.direction === "up" ? "#22c55e" : trend.direction === "down" ? "#ef4444" : "#9ca3af";
      trendBadge.innerHTML = `${trendIcon} ${trend.percent >= 0 ? trend.percent.toFixed(1) : ""}%`;
      trendBadge.style.cssText = `
        font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;
        background:${isFilled ? "rgba(255,255,255,0.15)" : trend.color + "15"};color:${trendColor};
        display:inline-flex;align-items:center;gap:2px;
      `;
      valueRow.appendChild(trendBadge);
    }

    content.appendChild(valueRow);

    // Description
    if (opts.description) {
      const descEl = document.createElement("div");
      descEl.textContent = opts.description;
      descEl.style.cssText = `font-size:12px;margin-top:4px;${isFilled ? "color:rgba(255,255,255,0.7);" : "color:#9ca3af;"}`;
      content.appendChild(descEl);
    }

    header.appendChild(content);
    el.appendChild(header);

    // Sparkline
    if (opts.sparkline && opts.sparkline.length > 0) {
      const slContainer = document.createElement("div");
      slContainer.className = "sc-sparkline";
      slContainer.style.cssText = "margin-top:16px;";
      slContainer.innerHTML = buildSparklineSvg(opts.sparkline, opts.sparklineColor ?? (isFilled ? "rgba(255,255,255,0.5)" : "#6366f1"));
      el.appendChild(slContainer);
    }

    // Progress bar
    if (opts.progress !== undefined) {
      const progWrap = document.createElement("div");
      progWrap.style.cssText = "margin-top:14px;height:6px;background:" + (isFilled ? "rgba(255,255,255,0.2)" : "#e5e7eb") + ";border-radius:3px;overflow:hidden;";
      const progBar = document.createElement("div");
      progBar.className = "sc-progress-bar";
      progBar.style.cssText = `height:100%;border-radius:3px;background:${opts.progressColor ?? (isFilled ? "#fff" : "#4338ca")};width:${Math.min(100, opts.progress)}%;transition:width 0.5s ease;`;
      progWrap.appendChild(progBar);
      el.appendChild(progWrap);
    }

    // Click handler
    if (opts.onClick) {
      el.addEventListener("click", () => opts.onClick());
      el.addEventListener("mouseenter", () => { el.style.transform = "translateY(-2px)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    }
  }

  private updateValueDisplay(el: HTMLElement, opts: StatsCardOptions): void {
    const valueEl = el.querySelector(".sc-value");
    if (valueEl) {
      if (typeof opts.value === "string") valueEl.textContent = opts.value;
      else valueEl.textContent = (opts.prefix ?? "") + formatNumber(opts.value, opts.format) + (opts.suffix ?? "");
    }
  }

  private updateTrendDisplay(el: HTMLElement, trend: { direction: TrendDirection; percent: number }): void {
    const badges = el.querySelectorAll("span[style*='border-radius:4px']");
    for (const b of badges) {
      if (b.textContent.includes("%") || b.textContent.includes("\u2191") || b.textContent.includes("\u2193")) {
        const trendIcon = trend.direction === "up" ? "\u2191" : trend.direction === "down" ? "\u2193" : "\u2014";
        const trendColor = trend.direction === "up" ? "#22c55e" : trend.direction === "down" ? "#ef4444" : "#9ca3af";
        b.innerHTML = `${trendIcon} ${trend.percent >= 0 ? trend.percent.toFixed(1) : ""}%`;
        b.style.background = trend.color + "15";
        b.style.color = trendColor;
      }
    }
  }

  private animateValue(el: HTMLElement, targetValue: number): void {
    const valueEl = el.querySelector(".sc-value");
    if (!valueEl || typeof opts.value !== "number") return;

    const start = 0;
    const end = targetValue;
    const startTime = performance.now();
    const duration = this.getAnimationDuration(el); // will read from opts

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      valueEl.textContent = (this.getOpts(el).prefix ?? "") + formatNumber(current, this.getOpts(el).format) + (this.getOpts(el).suffix ?? "");
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  // These would need to be stored on the instance - simplified for now
  private getOpts(_el: HTMLElement): StatsCardOptions { return {} as any; }
  private getAnimationDuration(_el: HTMLElement): number { return 1500; }
}

/** Convenience: create a stats card */
export function createStatsCard(options: StatsCardOptions): StatsCardInstance {
  return new StatsCardManager().create(options);
}
