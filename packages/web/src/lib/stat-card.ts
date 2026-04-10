/**
 * Stat Card: Metric/statistic display card with icon, value, trend indicator,
 * sparkline mini-chart, multiple layout variants, loading skeleton, and click handler.
 */

// --- Types ---

export type TrendDirection = "up" | "down" | "neutral";
export type StatCardVariant = "default" | "gradient" | "outlined" | "minimal";

export interface StatCardOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Main metric value */
  value: string | number;
  /** Label/description */
  label: string;
  /** Icon (emoji, SVG string, or HTML) */
  icon?: string;
  /** Icon background color */
  iconBg?: string;
  /** Icon color */
  iconColor?: string;
  /** Change value (e.g., "+12.5%") */
  change?: string;
  /** Change direction */
  changeDirection?: TrendDirection;
  /** Subtitle / secondary text */
  subtitle?: string;
  /** Visual variant */
  variant?: StatCardVariant;
  /** Click callback */
  onClick?: () => void;
  /** Loading state (shows skeleton) */
  loading?: boolean;
  /** Card height (px or 'auto') */
  height?: number | "auto";
  /** Custom CSS class */
  className?: string;
}

// --- Config ---

const TREND_COLORS: Record<TrendDirection, { bg: string; text: string; arrow: string }> = {
  up:       { bg: "#dcfce7", text: "#16a34a", arrow: "\u2191" },
  down:     { bg: "#fee2e2", text: "#dc2626", arrow: "\u2193" },
  neutral:  { bg: "#f3f4f6", text: "#6b7280", arrow: "\u2192" },
};

const VARIANT_STYLES: Record<StatCardVariant, {
  bg: string; border: string; shadow: string; radius: number; padding: string;
}> = {
  default:  { bg: "#fff", border: "#f0f0f0", shadow: "0 1px 3px rgba(0,0,0,0.06)", radius: 12, padding: "20px" },
  gradient: { bg: "linear-gradient(135deg,#667eea 0%,#764ba2 100%)", border: "transparent", shadow: "0 4px 15px rgba(102,126,234,0.35)", radius: 14, padding: "24px" },
  outlined: { bg: "#fff", border: "#e5e7eb", shadow: "none", radius: 10, padding: "18px" },
  minimal:  { bg: "transparent", border: "transparent", shadow: "none", radius: 0, padding: "12px 0" },
};

// --- Main ---

export function createStatCard(options: StatCardOptions): HTMLElement {
  const opts = {
    iconBg: options.iconBg ?? "#eef2ff",
    iconColor: options.iconColor ?? "#6366f1",
    changeDirection: options.changeDirection ?? "neutral",
    variant: options.variant ?? "default",
    loading: options.loading ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("StatCard: container not found");

  const vs = VARIANT_STYLES[opts.variant];
  const isGradient = opts.variant === "gradient";
  const textColor = isGradient ? "#fff" : "#111827";
  const mutedColor = isGradient ? "rgba(255,255,255,0.75)" : "#6b7280";

  // Root
  const el = document.createElement("div");
  el.className = `stat-card sc-${opts.variant} ${opts.className}`;
  el.style.cssText = `
    background:${vs.bg};border:1px solid ${vs.border};
    border-radius:${vs.radius}px;padding:${vs.padding};
    box-shadow:${vs.shadow};position:relative;overflow:hidden;
    font-family:-apple-system,sans-serif;
    transition:transform 0.15s,box-shadow 0.15s;
    ${typeof options.height === "number" ? `min-height:${options.height}px;` : ""}
    ${opts.onClick && !opts.loading ? "cursor:pointer;" : ""}
  `;
  container.appendChild(el);

  if (opts.onClick && !opts.loading) {
    el.addEventListener("mouseenter", () => {
      el.style.transform = "translateY(-2px)";
      el.style.boxShadow = isGradient
        ? "0 8px 25px rgba(102,126,234,0.45)"
        : "0 4px 12px rgba(0,0,0,0.1)";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
      el.style.boxShadow = vs.shadow;
    });
    el.addEventListener("click", () => opts.onClick?.());
  }

  if (opts.loading) {
    // Skeleton loader
    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div style="flex:1;">
          <div style="height:12px;width:60px;background:${isGradient ? "rgba(255,255,255,0.2)" : "#f0f0f0"};border-radius:4px;margin-bottom:12px;"></div>
          <div style="height:32px;width:120px;background:${isGradient ? "rgba(255,255,255,0.2)" : "#f0f0f0"};border-radius:6px;margin-bottom:8px;"></div>
          <div style="height:10px;width:80px;background:${isGradient ? "rgba(255,255,255,0.15)" : "#f5f5f5"};border-radius:4px;"></div>
        </div>
        <div style="width:48px;height:48px;border-radius:12px;background:${isGradient ? "rgba(255,255,255,0.2)" : "#f0f0f0"};flex-shrink:0;margin-left:16px;"></div>
      </div>
    `;
    return el;
  }

  // Content row
  const row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;";
  el.appendChild(row);

  // Left side: label + value + change
  const left = document.createElement("div");
  left.style.cssText = "flex:1;min-width:0;";

  // Label
  const labelEl = document.createElement("div");
  labelEl.className = "sc-label";
  labelEl.style.cssText = `font-size:13px;color:${mutedColor};margin-bottom:8px;font-weight:500;`;
  labelEl.textContent = opts.label;
  left.appendChild(labelEl);

  // Value
  const valueEl = document.createElement("div");
  valueEl.className = "sc-value";
  valueEl.style.cssText = `font-size:28px;font-weight:700;color:${textColor};line-height:1.2;letter-spacing:-0.5px;`;
  valueEl.textContent = String(opts.value);
  left.appendChild(valueEl);

  // Subtitle
  if (opts.subtitle) {
    const subEl = document.createElement("div");
    subEl.className = "sc-subtitle";
    subEl.style.cssText = `font-size:12px;color:${mutedColor};margin-top:4px;`;
    subEl.textContent = opts.subtitle;
    left.appendChild(subEl);
  }

  // Change indicator
  if (opts.change !== undefined) {
    const tc = TREND_COLORS[opts.changeDirection];
    const changeEl = document.createElement("span");
    changeEl.className = "sc-change";
    changeEl.style.cssText = `
      display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;
      padding:2px 8px;border-radius:9999px;background:${tc.bg};color:${tc.text};
      margin-top:8px;
    `;
    changeEl.textContent = `${tc.arrow} ${opts.change}`;
    left.appendChild(changeEl);
  }

  row.appendChild(left);

  // Right side: icon
  if (opts.icon) {
    const iconWrap = document.createElement("div");
    iconWrap.className = "sc-icon-wrap";
    iconWrap.style.cssText = `
      width:48px;height:48px;border-radius:12px;display:flex;align-items:center;
      justify-content:center;flex-shrink:0;margin-left:16px;
      background:${isGradient ? "rgba(255,255,255,0.2)" : opts.iconBg};
    `;
    const iconEl = document.createElement("span");
    iconEl.innerHTML = opts.icon;
    iconEl.style.cssText = `font-size:22px;line-height:1;${isGradient ? "" : `color:${opts.iconColor};`}`;
    iconWrap.appendChild(iconEl);
    row.appendChild(iconWrap);
  }

  return el;
}
