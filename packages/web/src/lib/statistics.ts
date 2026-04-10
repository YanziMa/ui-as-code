/**
 * Statistics Cards: Data display cards with sparklines, trend indicators,
 * comparison values, progress bars, mini charts, and responsive layout.
 */

// --- Types ---

export type TrendDirection = "up" | "down" | "neutral";
export type SparklineType = "line" | "bar" | "area";

export interface StatCardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Card title */
  title: string;
  /** Primary value (formatted string or number) */
  value: string | number;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Change value (e.g., "+12.5%") */
  change?: string;
  /** Change direction */
  trend?: TrendDirection;
  /** Previous period value for comparison */
  previousValue?: string | number;
  /** Target value */
  target?: string | number;
  /** Unit suffix (e.g., "%", "ms", "users") */
  unit?: string;
  /** Icon (emoji, SVG string) */
  icon?: string;
  /** Icon background color */
  iconBg?: string;
  /** Card color accent */
  accentColor?: string;
  /** Show sparkline chart */
  sparkline?: number[];
  /** Sparkline type */
  sparklineType?: SparklineType;
  /** Sparkline color (overrides accent) */
  sparklineColor?: string;
  /** Progress toward target (0-1) */
  progress?: number;
  /** Show progress bar */
  showProgress?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Layout variant */
  layout?: "default" | "compact" | "horizontal";
  /** Click callback */
  onClick?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface StatisticsInstance {
  element: HTMLElement;
  setValue: (value: string | number) => void;
  setChange: (change: string, direction: TrendDirection) => void;
  setSparkline: (data: number[]) => void;
  setProgress: (value: number) => void;
  update: (options: Partial<StatCardOptions>) => void;
  destroy: () => void;
}

// --- Helpers ---

const TREND_ICONS: Record<TrendDirection, { svg: string; color: string }> = {
  up:    { svg: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 8l4-4 4 4" stroke="#22c55e" stroke-width="2" stroke-linecap="round"/></svg>', color: "#22c55e" },
  down:  { svg: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>', color: "#ef4444" },
  neutral: { svg: "", color: "#9ca3af" },
};

function renderSparklineSVG(data: number[], type: SparklineType, color: string, width: number, height: number): string {
  if (!data || data.length === 0) return "";

  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  switch (type) {
    case "bar": {
      const barWidth = Math.max(2, (w / data.length) - 2);
      let bars = "";
      for (let i = 0; i < data.length; i++) {
        const bh = ((data[i]! - min) / range) * h;
        const x = padding + i * (w / data.length) + 1;
        const y = padding + h - bh;
        bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${bh}" rx="1" fill="${color}" opacity="0.7"/>`;
      }
      return `<svg width="${width}" height="${height}">${bars}</svg>`;
    }

    case "area": {
      let points = "";
      let linePoints = "";
      for (let i = 0; i < data.length; i++) {
        const x = padding + (i / (data.length - 1)) * w;
        const y = padding + h - ((data[i]! - min) / range) * h;
        points += `${x},${y} `;
        linePoints += `${x},${y} `;
      }
      return `<svg width="${width}" height="${height}">
        <defs><linearGradient id="sg${Date.now()}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient></defs>
        <polygon points="${padding},${padding + h} ${points.trim()} ${padding + w},${padding + h}" fill="url(#sg${Date.now()})"/>
        <polyline points="${linePoints.trim()}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`;
    }

    case "line":
    default: {
      let pts = "";
      for (let i = 0; i < data.length; i++) {
        const x = padding + (i / (data.length - 1)) * w;
        const y = padding + h - ((data[i]! - min) / range) * h;
        pts += `${i === 0 ? "M" : "L"} ${x} ${y}`;
      }
      return `<svg width="${width}" height="${height}"><path d="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
  }
}

// --- Main ---

export function createStatCard(options: StatCardOptions): StatisticsInstance {
  const opts = {
    trend: options.trend ?? "neutral",
    sparklineType: options.sparklineType ?? "line",
    showProgress: options.showProgress ?? false,
    size: options.size ?? "md",
    layout: options.layout ?? "default",
    accentColor: options.accentColor ?? "#4338ca",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("StatCard: container not found");

  container.className = `stat-card stat-${opts.size} stat-${opts.layout} ${opts.className ?? ""}`;

  // Size styles
  const sizeStyles: Record<string, string> = {
    sm: "padding:14px 16px;",
    md: "padding:20px 24px;",
    lg: "padding:28px 32px;",
  };

  container.style.cssText = `
    ${sizeStyles[opts.size]}
    background:#fff;border-radius:12px;border:1px solid #e5e7eb;
    box-shadow:0 1px 3px rgba(0,0,0,0.04);cursor:${opts.onClick ? "pointer" : "default"};
    transition:transform 0.15s,box-shadow 0.15s;font-family:-apple-system,sans-serif;
    display:flex;flex-direction:column;gap:8px;position:relative;overflow:hidden;
  `;

  // Header row
  const headerRow = document.createElement("div");
  headerRow.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;";

  // Left side: title + value
  const leftCol = document.createElement("div");
  leftCol.style.cssText = "flex:1;min-width:0;";

  const titleEl = document.createElement("div");
  titleEl.style.cssText = "font-size:12px;color:#6b7280;font-weight:500;text-transform:uppercase;letter-spacing:0.03em;margin-bottom:4px;";
  titleEl.textContent = opts.title;
  leftCol.appendChild(titleEl);

  const valueRow = document.createElement("div");
  valueRow.style.cssText = "display:flex;align-items:baseline;gap:6px;";

  const valueEl = document.createElement("span");
  valueEl.className = "stat-value";
  valueEl.style.cssText = `
    font-size:${opts.size === "lg" ? "32px" : opts.size === "sm" ? "20px" : "26px"};
    font-weight:700;color:#111827;line-height:1;letter-spacing:-0.02em;
  `;
  valueEl.textContent = String(opts.value);
  valueRow.appendChild(valueEl);

  if (opts.unit) {
    const unitEl = document.createElement("span");
    unitEl.style.cssText = "font-size:13px;color:#9ca3af;font-weight:400;";
    unitEl.textContent = opts.unit;
    valueRow.appendChild(unitEl);
  }

  leftCol.appendChild(valueRow);

  // Subtitle
  if (opts.subtitle) {
    const subEl = document.createElement("div");
    subEl.style.cssText = "font-size:11px;color:#9ca3af;margin-top:2px;";
    subEl.textContent = opts.subtitle;
    leftCol.appendChild(subEl);
  }

  headerRow.appendChild(leftCol);

  // Right side: icon
  if (opts.icon) {
    const iconWrap = document.createElement("div");
    iconWrap.style.cssText = `
      width:${opts.size === "lg" ? 48 : 40}px;height:${opts.size === "lg" ? 48 : 40}px;border-radius:10px;
      background:${opts.iconBg ?? `${opts.accentColor}10`};
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
      font-size:${opts.size === "lg" ? 22 : 18}px;
    `;
    iconWrap.textContent = opts.icon;
    headerRow.appendChild(iconWrap);
  }

  container.appendChild(headerRow);

  // Change/trend indicator
  if (opts.change !== undefined) {
    const trendInfo = TREND_ICONS[opts.trend];
    const changeRow = document.createElement("div");
    changeRow.style.cssText = "display:flex;align-items:center;gap:4px;";
    if (trendInfo.svg) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = trendInfo.svg;
      changeRow.appendChild(iconSpan);
    }
    const changeText = document.createElement("span");
    changeText.style.cssText = `font-size:13px;font-weight:600;color:${trendInfo.color};`;
    changeText.textContent = opts.change;
    changeRow.appendChild(changeText);

    if (opts.previousValue !== undefined) {
      const prevLabel = document.createElement("span");
      prevLabel.style.cssText = "font-size:11px;color:#9ca3af;margin-left:4px;";
      prevLabel.textContent = `vs ${opts.previousValue}`;
      changeRow.appendChild(prevLabel);
    }

    container.appendChild(changeRow);
  }

  // Sparkline
  let sparklineContainer: HTMLDivElement | null = null;
  if (opts.sparkline && opts.sparkline.length > 0) {
    sparklineContainer = document.createElement("div");
    sparklineContainer.className = "stat-sparkline";
    sparklineContainer.style.cssText = `
      margin-top:4px;width:100%;height:${opts.size === "sm" ? 28 : 36}px;
    `;
    sparklineContainer.innerHTML = renderSparklineSVG(
      opts.sparkline,
      opts.sparklineType,
      opts.sparklineColor ?? opts.accentColor,
      sparklineContainer.offsetWidth || 120,
      opts.size === "sm" ? 28 : 36,
    );
    container.appendChild(sparklineContainer);
  }

  // Progress bar
  let progressBar: HTMLDivElement | null = null;
  if (opts.showProgress && opts.progress !== undefined) {
    const progWrap = document.createElement("div");
    progWrap.style.cssText = "margin-top:8px;";

    const progLabel = document.createElement("div");
    progLabel.style.cssText = "display:flex;justify-content:space-between;font-size:11px;color:#6b7280;margin-bottom:4px;";
    progLabel.innerHTML = `<span>Progress</span><span>${Math.round(opts.progress * 100)}%</span>`;
    progWrap.appendChild(progLabel);

    progressBar = document.createElement("div");
    progressBar.style.cssText = `
      height:6px;background:#f3f4f6;border-radius:3px;overflow:hidden;
    `;
    const progFill = document.createElement("div");
    progFill.style.cssText = `
      height:100%;border-radius:3px;background:${opts.accentColor};
      transition:width 0.5s ease;width:${Math.max(0, Math.min(100, opts.progress * 100))}%;
    `;
    progressBar.appendChild(progFill);
    progWrap.appendChild(progressBar);
    container.appendChild(progWrap);
  }

  // Click handler
  if (opts.onClick) {
    container.addEventListener("click", () => opts.onClick!());
    container.addEventListener("mouseenter", () => {
      container.style.transform = "translateY(-2px)";
      container.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
    });
    container.addEventListener("mouseleave", () => {
      container.style.transform = "";
      container.style.boxShadow = "";
    });
  }

  const instance: StatisticsInstance = {
    element: container,

    setValue(val: string | number) {
      valueEl.textContent = String(val);
    },

    setChange(change: string, direction: TrendDirection) {
      // Find and update existing change element, or create one
      let changeEl = container.querySelector(".stat-change-row") as HTMLElement | null;
      if (!changeEl) {
        changeEl = document.createElement("div");
        changeEl.className = "stat-change-row";
        changeEl.style.cssText = "display:flex;align-items:center;gap:4px;margin-top:4px;";
        // Insert after header row
        headerRow.after(changeEl);
      }
      const trendInfo = TREND_ICONS[direction];
      changeEl.innerHTML = (trendInfo.svg ? `<span>${trendInfo.svg}</span>` : "") +
        `<span style="font-weight:600;color:${trendInfo.color};">${change}</span>`;
    },

    setSparkline(data: number[]) {
      if (!sparklineContainer) {
        sparklineContainer = document.createElement("div");
        sparklineContainer.className = "stat-sparkline";
        sparklineContainer.style.cssText = `margin-top:4px;width:100%;height:36px;`;
        container.appendChild(sparklineContainer);
      }
      sparklineContainer.innerHTML = renderSparklineSVG(
        data,
        opts.sparklineType,
        opts.sparklineColor ?? opts.accentColor,
        sparklineContainer.offsetWidth || 120,
        36,
      );
    },

    setProgress(value: number) {
      if (progressBar) {
        const fill = progressBar.firstChild as HTMLElement;
        if (fill) fill.style.width = `${Math.max(0, Math.min(100, value * 100))}%`;
      }
    },

    update(newOpts: Partial<StatCardOptions>) {
      Object.assign(opts, newOpts);
      if (newOpts.value !== undefined) instance.setValue(newOpts.value);
      if (newOpts.change !== undefined && newOpts.trend !== undefined) {
        instance.setChange(newOpts.change, newOpts.trend);
      }
      if (newOpts.sparkline !== undefined) instance.setSparkline(newOpts.sparkline);
      if (newOpts.progress !== undefined) instance.setProgress(newOpts.progress);
    },

    destroy() {
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
