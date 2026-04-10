/**
 * Statistic Card: Data display component with value, label, trend indicator,
 * sparkline, comparison, multiple layout variants (horizontal/vertical/card),
 * animated counter, and color-coded status.
 */

// --- Types ---

export type TrendDirection = "up" | "down" | "neutral" | "none";
export type StatVariant = "default" | "card" | "minimal" | "inline";
export type TrendColor = "green" | "red" | "neutral";

export interface StatOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Primary numeric value */
  value: number;
  /** Label / description text */
  label: string;
  /** Prefix (e.g., "$", "\u00A3") */
  prefix?: string;
  /** Suffix (e.g., "%", "ms", "users") */
  suffix?: string;
  /** Decimal places to show */
  decimals?: number;
  /** Locale for number formatting */
  locale?: string;
  /** Trend direction and value */
  trend?: {
    direction: TrendDirection;
    /** Numeric change amount */
    value: number;
    /** Percentage change */
    percent?: number;
    /** Label e.g. "vs last month" */
    label?: string;
  };
  /** Previous period value (for comparison) */
  previousValue?: number;
  /** Color variant */
  variant?: StatVariant;
  /** Value font size (px) */
  valueFontSize?: number;
  /** Label font size (px) */
  labelFontSize?: number;
  /** Value color override */
  valueColor?: string;
  /** Label color override */
  labelColor?: string;
  /** Background color (for card variant) */
  backgroundColor?: string;
  /** Show animated counting up effect? */
  animate?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Sparkline data points (for mini chart) */
  sparklineData?: number[];
  /** Sparkline color */
  sparklineColor?: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Icon position: left or top */
  iconPosition?: "left" | "top";
  /** Click callback */
  onClick?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface StatInstance {
  element: HTMLElement;
  getValue: () => number;
  setValue: (value: number, animate?: boolean) => void;
  setTrend: (trend: StatOptions["trend"]) => void;
  setSparklineData: (data: number[]) => void;
  destroy: () => void;
}

// --- Helpers ---

function formatValue(
  value: number,
  decimals: number,
  locale: string,
  prefix?: string,
  suffix?: string,
): string {
  const formatted = value.toLocaleString(locale || undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${prefix ?? ""}${formatted}${suffix ?? ""}`;
}

const TREND_COLORS: Record<TrendDirection, { fg: string; bg: string }> = {
  up:       { fg: "#16a34a", bg: "#f0fdf4" },
  down:     { fg: "#dc2626", bg: "#fef2f2" },
  neutral:  { fg: "#6b7280", bg: "#f9fafb" },
  none:     { fg: "transparent", bg: "transparent" },
};

// --- Main Class ---

export class StatManager {
  create(options: StatOptions): StatInstance {
    const opts = {
      decimals: options.decimals ?? (Number.isInteger(options.value) ? 0 : 1),
      locale: options.locale ?? "en-US",
      variant: options.variant ?? "default",
      valueFontSize: options.valueFontSize ?? 28,
      labelFontSize: options.labelFontSize ?? 13,
      animate: options.animate ?? true,
      animationDuration: options.animationDuration ?? 800,
      iconPosition: options.iconPosition ?? "left",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Statistic: container not found");

    container.className = `stat stat-${opts.variant} ${opts.className ?? ""}`;

    let currentValue = opts.value;
    let destroyed = false;

    function render(): void {
      container.innerHTML = "";

      switch (opts.variant) {
        case "card":
          renderCard();
          break;
        case "minimal":
          renderMinimal();
          break;
        case "inline":
          renderInline();
          break;
        default:
          renderDefault();
      }
    }

    function renderDefault(): void {
      container.style.cssText = `display:flex;align-items:center;gap:12px;padding:12px;`;

      // Icon
      if (opts.icon && opts.iconPosition === "left") {
        const iconEl = createIconEl();
        container.appendChild(iconEl);
      }

      // Content
      const content = document.createElement("div");
      content.style.cssText = "display:flex;flex-direction:column;gap:4px;";

      // Label
      const labelEl = document.createElement("span");
      labelEl.className = "stat-label";
      labelEl.style.cssText = `font-size:${opts.labelFontSize}px;color:${opts.labelColor ?? "#6b7280"};font-weight:400;`;
      labelEl.textContent = opts.label;
      content.appendChild(labelEl);

      // Value row
      const valueRow = document.createElement("div");
      valueRow.className = "stat-value-row";
      valueRow.style.cssText = "display:flex;align-items:baseline;gap:8px;";

      const valueEl = document.createElement("span");
      valueEl.className = "stat-value";
      valueEl.style.cssText = `
        font-size:${opts.valueFontSize}px;font-weight:700;font-variant-numeric:tabular-nums;
        color:${opts.valueColor ?? "#111827"};line-height:1.2;
      `;
      valueEl.textContent = formatValue(currentValue, opts.decimals, opts.locale, opts.prefix, opts.suffix);
      valueRow.appendChild(valueEl);

      // Trend badge
      if (opts.trend && opts.trend.direction !== "none") {
        const trendBadge = createTrendBadge(opts.trend);
        valueRow.appendChild(trendBadge);
      }

      content.appendChild(valueRow);

      // Sparkline
      if (opts.sparklineData && opts.sparklineData.length > 1) {
        const svg = createSparkline(opts.sparklineData, opts.sparklineColor);
        content.appendChild(svg);
      }

      container.appendChild(content);
    }

    function renderCard(): void {
      container.style.cssText = `
        background:${opts.backgroundColor ?? "#fff"};
        border:1px solid #e5e7eb;border-radius:12px;padding:20px;
        box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:box-shadow 0.2s;
        display:flex;flex-direction:column;gap:10px;
        min-width:160px;
      `;

      if (opts.onClick) {
        container.style.cursor = "pointer";
        container.addEventListener("mouseenter", () => { container.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; });
        container.addEventListener("mouseleave", () => { container.style.boxShadow = ""; });
        container.addEventListener("click", () => opts.onClick?.());
      }

      // Header: label + optional icon
      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:center;justify-content:space-between;";

      const labelEl = document.createElement("span");
      labelEl.className = "stat-label";
      labelEl.style.cssText = `font-size:${opts.labelFontSize}px;color:${opts.labelColor ?? "#6b7280"};`;
      labelEl.textContent = opts.label;
      header.appendChild(labelEl);

      if (opts.icon) {
        const iconEl = createIconEl();
        iconEl.style.fontSize = "18px";
        header.appendChild(iconEl);
      }

      container.appendChild(header);

      // Value + trend
      const valueRow = document.createElement("div");
      valueRow.style.cssText = "display:flex;align-items:baseline;gap:10px;";

      const valueEl = document.createElement("span");
      valueEl.className = "stat-value";
      valueEl.style.cssText = `
        font-size:${opts.valueFontSize}px;font-weight:700;font-variant-numeric:tabular-nums;
        color:${opts.valueColor ?? "#111827"};line-height:1.2;
      `;
      valueEl.textContent = formatValue(currentValue, opts.decimals, opts.locale, opts.prefix, opts.suffix);
      valueRow.appendChild(valueEl);

      if (opts.trend && opts.trend.direction !== "none") {
        valueRow.appendChild(createTrendBadge(opts.trend));
      }

      container.appendChild(valueRow);

      // Sparkline at bottom of card
      if (opts.sparklineData && opts.sparklineData.length > 1) {
        const svg = createSparkline(opts.sparklineData, opts.sparklineColor);
        container.appendChild(svg);
      }
    }

    function renderMinimal(): void {
      container.style.cssText = `display:inline-flex;flex-direction:column;gap:2px;`;

      const valueEl = document.createElement("span");
      valueEl.className = "stat-value";
      valueEl.style.cssText = `
        font-size:${opts.valueFontSize - 4}px;font-weight:600;font-variant-numeric:tabular-nums;
        color:${opts.valueColor ?? "#374151"};line-height:1.2;
      `;
      valueEl.textContent = formatValue(currentValue, opts.decimals, opts.locale, opts.prefix, opts.suffix);
      container.appendChild(valueEl);

      const labelEl = document.createElement("span");
      labelEl.className = "stat-label";
      labelEl.style.cssText = `font-size:11px;color:${opts.labelColor ?? "#9ca3af"};`;
      labelEl.textContent = opts.label;
      container.appendChild(labelEl);
    }

    function renderInline(): void {
      container.style.cssText = `display:inline-flex;align-items:baseline;gap:6px;`;

      const labelEl = document.createElement("span");
      labelEl.className = "stat-label";
      labelEl.style.cssText = `font-size:${opts.labelFontSize}px;color:${opts.labelColor ?? "#6b7280"};`;
      labelEl.textContent = `${opts.label}:`;
      container.appendChild(labelEl);

      const valueEl = document.createElement("span");
      valueEl.className = "stat-value";
      valueEl.style.cssText = `
        font-size:${opts.valueFontSize - 2}px;font-weight:600;font-variant-numeric:tabular-nums;
        color:${opts.valueColor ?? "#111827"};
      `;
      valueEl.textContent = formatValue(currentValue, opts.decimals, opts.locale, opts.prefix, opts.suffix);
      container.appendChild(valueEl);

      if (opts.trend && opts.trend.direction !== "none") {
        container.appendChild(createTrendBadge(opts.trend));
      }
    }

    function createIconEl(): HTMLElement {
      const el = document.createElement("span");
      el.textContent = opts.icon!;
      el.style.cssText = "font-size:24px;line-height:1;";
      return el;
    }

    function createTrendBadge(trend: NonNullable<StatOptions["trend"]>): HTMLElement {
      const colors = TREND_COLORS[trend.direction];
      const badge = document.createElement("span");
      badge.className = "stat-trend-badge";
      badge.style.cssText = `
        display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:500;
        padding:2px 8px;border-radius:4px;background:${colors.bg};color:${colors.fg};
        white-space:nowrap;
      `;

      // Arrow
      const arrow = trend.direction === "up" ? "\u2191" : trend.direction === "down" ? "\u2193" : "\u2192";
      badge.textContent = `${arrow} `;

      // Show percent or absolute value
      if (trend.percent !== undefined) {
        badge.textContent += `${Math.abs(trend.percent).toFixed(1)}%`;
      } else {
        badge.textContent += formatValue(Math.abs(trend.value), opts.decimals, opts.locale, opts.prefix, opts.suffix);
      }

      // Optional label
      if (trend.label) {
        const lbl = document.createElement("span");
        lbl.style.cssText = "color:#9ca3af;margin-left:4px;font-weight:400;font-size:10px;";
        lbl.textContent = trend.label;
        badge.appendChild(lbl);
      }

      return badge;
    }

    function createSparkline(data: number[], color?: string): SVGSVGElement {
      const width = 200;
      const height = 40;
      const padding = 2;

      const min = Math.min(...data);
      const max = Math.max(...data);
      const range = max - min || 1;

      const points = data.map((v, i) => {
        const x = padding + (i / Math.max(1, data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((v - min) / range) * (height - padding * 2);
        return `${x},${y}`;
      }).join(" ");

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", String(height));
      svg.style.cssText = "overflow:visible;display:block;";

      // Area fill
      const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      areaPath.setAttribute("points", `${padding},${height - padding} ${points} ${width - padding},${height - padding}`);
      areaPath.setAttribute("fill", `${color ?? "#4338ca"}15`);
      svg.appendChild(areaPath);

      // Line
      const linePath = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      linePath.setAttribute("points", points);
      linePath.setAttribute("fill", "none");
      linePath.setAttribute("stroke", color ?? "#4338ca");
      linePath.setAttribute("stroke-width", "1.5");
      linePath.setAttribute("stroke-linecap", "round");
      linePath.setAttribute("stroke-linejoin", "round");
      svg.appendChild(linePath);

      // End dot
      const lastPoint = points.split(" ").pop()!;
      const [lx, ly] = lastPoint.split(",").map(Number);
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", String(lx));
      dot.setAttribute("cy", String(ly));
      dot.setAttribute("r", "3");
      dot.setAttribute("fill", color ?? "#4338ca");
      svg.appendChild(dot);

      return svg;
    }

    function animateValue(from: number, to: number): void {
      if (!opts.animate) return;
      const duration = opts.animationDuration;
      const start = performance.now();

      function step(timestamp: number): void {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = from + (to - from) * eased;

        const valEl = container.querySelector(".stat-value") as HTMLElement;
        if (valEl) {
          valEl.textContent = formatValue(current, opts.decimals, opts.locale, opts.prefix, opts.suffix);
        }

        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    }

    // Initial render
    render();

    const instance: StatInstance = {
      element: container,

      getValue() { return currentValue; },

      setValue(newValue: number, animate = true) {
        const oldAnimate = opts.animate;
        opts.animate = animate;
        if (animate && oldAnimate) {
          animateValue(currentValue, newValue);
        } else {
          const valEl = container.querySelector(".stat-value") as HTMLElement;
          if (valEl) valEl.textContent = formatValue(newValue, opts.decimals, opts.locale, opts.prefix, opts.suffix);
        }
        currentValue = newValue;
        opts.animate = oldAnimate;
      },

      setTrend(newTrend: StatOptions["trend"]) {
        opts.trend = newTrend;
        render();
      },

      setSparklineData(data: number[]) {
        opts.sparklineData = data;
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a statistic card */
export function createStat(options: StatOptions): StatInstance {
  return new StatManager().create(options);
}
