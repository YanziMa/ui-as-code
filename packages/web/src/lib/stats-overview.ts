/**
 * Stats Overview: Dashboard stat cards with values, labels, trend indicators,
 * sparkline mini-charts, comparison values, icons, and responsive grid layout.
 */

// --- Types ---

export type TrendDirection = "up" | "down" | "neutral" | "flat";
export type StatCardSize = "sm" | "md" | "lg";

export interface TrendData {
  /** Direction */
  direction: TrendDirection;
  /** Percentage change */
  value: number;
  /** Label (e.g., "vs last month") */
  label?: string;
  /** Absolute difference */
  absolute?: number;
}

export interface SparklinePoint {
  value: number;
  label?: string;
}

export interface StatCard {
  /** Unique key */
  id: string;
  /** Card title/label */
  title: string;
  /** Primary value */
  value: string | number;
  /** Optional subtitle */
  subtitle?: string;
  /** Trend indicator */
  trend?: TrendData;
  /** Mini sparkline data */
  sparkline?: SparklinePoint[];
  /** Icon or emoji */
  icon?: string;
  /** Icon background color */
  iconBg?: string;
  /** Card size variant */
  size?: StatCardSize;
  /** Custom color accent */
  accentColor?: string;
  /** Click handler data */
  onClick?: () => void;
  /** Footer text */
  footer?: string;
  /** Loading state? */
  loading?: boolean;
}

export interface StatsOverviewOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Stat cards to display */
  cards: StatCard[];
  /** Number of columns in grid (default: auto) */
  columns?: number;
  /** Card gap (px) */
  gap?: number;
  /** Show trend indicators? */
  showTrends?: boolean;
  /** Show sparklines? */
  showSparklines?: boolean;
  /** Show icons? */
  showIcons?: boolean;
  /** Compact mode (less padding) */
  compact?: boolean;
  /** Card click callback */
  onCardClick?: (card: StatCard) => void;
  /** Custom CSS class */
  className?: string;
}

export interface StatsOverviewInstance {
  element: HTMLElement;
  getCards: () => StatCard[];
  setCards: (cards: StatCard[]) => void;
  updateCard: (id: string, updates: Partial<StatCard>) => void;
  setCardsLoading: (id: string, loading: boolean) => void;
  destroy: () => void;
}

// --- Config ---

const TREND_COLORS: Record<TrendDirection, { text: string; bg: string; arrow: string }> = {
  up:      { text: "#16a34a", bg: "#f0fdf4", arrow: "\u2191" },
  down:    { text: "#dc2626", bg: "#fef2f2", arrow: "\u2193" },
  neutral: { text: "#6b7280", bg: "#f9fafb", arrow: "\u2192" },
  flat:    { text: "#9ca3af", bg: "#f9fafb", arrow: "\u2014" },
};

const SIZE_STYLES: Record<StatCardSize, { padding: string; titleSize: string; valueSize: string }> = {
  sm:  { padding: "14px 16px", titleSize: "12px", valueSize: "22px" },
  md:  { padding: "18px 20px", titleSize: "13px", valueSize: "28px" },
  lg:  { padding: "22px 24px", titleSize: "14px", valueSize: "34px" },
};

// --- Sparkline Renderer ---

function renderMiniSparkline(points: SparklinePoint[], width: number, height: number, color: string): HTMLCanvasElement | null {
  if (!points || points.length < 2) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width * 2; // retina
  canvas.height = height * 2;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.display = "block";

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(2, 2);

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = width / (points.length - 1);

  // Area fill
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let i = 0; i < points.length; i++) {
    const x = i * stepX;
    const y = height - ((values[i]! - min) / range) * (height - 4) - 2;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fillStyle = color + "15";
  ctx.fill();

  // Line
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const x = i * stepX;
    const y = height - ((values[i]! - min) / range) * (height - 4) - 2;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // End dot
  const lastX = (points.length - 1) * stepX;
  const lastY = height - ((values[values.length - 1]! - min) / range) * (height - 4) - 2;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas;
}

// --- Main Class ---

export class StatsOverviewManager {
  create(options: StatsOverviewOptions): StatsOverviewInstance {
    const opts = {
      columns: options.columns ?? 0,
      gap: options.gap ?? 16,
      showTrends: options.showTrends ?? true,
      showSparklines: options.showSparklines ?? true,
      showIcons: options.showIcons ?? true,
      compact: options.compact ?? false,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("StatsOverview: container not found");

    container.className = `stats-overview ${opts.className}`;
    let cards: StatCard[] = opts.cards;
    let destroyed = false;

    function render(): void {
      container.innerHTML = "";

      // Grid layout
      const colCount = opts.columns || (cards.length <= 2 ? cards.length : cards.length <= 4 ? 2 : Math.min(cards.length, 4));
      container.style.cssText = `
        display:grid;grid-template-columns:repeat(${colCount},1fr);
        gap:${opts.gap}px;
      `;

      for (const card of cards) {
        container.appendChild(renderCard(card));
      }
    }

    function renderCard(card: StatCard): HTMLElement {
      const sz = SIZE_STYLES[card.size ?? "md"];
      const el = document.createElement("div");
      el.className = `stat-card stat-${card.id} ${card.loading ? "stat-loading" : ""}`;
      el.dataset.id = card.id;
      el.style.cssText = `
        background:#fff;border-radius:12px;border:1px solid #e5e7eb;
        padding:${opts.compact ? "12px 14px" : sz.padding};
        transition:box-shadow 0.15s,transform 0.1s;cursor:${card.onClick ? "pointer" : "default"};
        position:relative;overflow:hidden;
      `;

      if (card.onClick || opts.onCardClick) {
        el.addEventListener("mouseenter", () => { el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; });
        el.addEventListener("mouseleave", () => { el.style.boxShadow = ""; });
        el.addEventListener("click", () => { card.onClick?.(); opts.onCardClick?.(card); });
      }

      // Loading skeleton overlay
      if (card.loading) {
        const skeleton = document.createElement("div");
        skeleton.style.cssText = `
          position:absolute;inset:0;background:#fff;display:flex;flex-direction:column;
          justify-content:center;gap:8px;padding:${sz.padding};z-index:1;
        `;
        skeleton.innerHTML = `
          <div style="width:40%;height:10px;background:#f3f4f6;border-radius:4px;"></div>
          <div style="width:60%;height:24px;background:#f3f4f6;border-radius:4px;"></div>
          <div style="width:30%;height:10px;background:#f3f4f6;border-radius:4px;"></div>
        `;
        el.appendChild(skeleton);
      }

      // Header row: title + icon
      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;";

      const titleEl = document.createElement("span");
      titleEl.className = "stat-title";
      titleEl.style.cssText = `font-size:${sz.titleSize};color:#6b7280;font-weight:500;`;
      titleEl.textContent = card.title;
      header.appendChild(titleEl);

      if ((opts.showIcons && card.icon) && !card.loading) {
        const iconWrap = document.createElement("span");
        iconWrap.style.cssText = `
          display:flex;align-items:center;justify-content:center;width:32px;height:32px;
          border-radius:8px;font-size:14px;background:${card.iconBg ?? "#eef2ff"};
        `;
        iconWrap.textContent = card.icon;
        header.appendChild(iconWrap);
      }

      el.appendChild(header);

      // Value row
      const valueRow = document.createElement("div");
      valueRow.style.cssText = "display:flex;align-items:baseline;gap:8px;margin-bottom:4px;";

      const valueEl = document.createElement("span");
      valueEl.className = "stat-value";
      valueEl.style.cssText = `font-size:${sz.valueSize};font-weight:700;color:#111827;line-height:1;letter-spacing:-0.02em;`;
      valueEl.textContent = String(card.value);
      valueRow.appendChild(valueEl);

      // Trend indicator
      if (card.trend && opts.showTrends && !card.loading) {
        const tc = TREND_COLORS[card.trend.direction];
        const trendEl = document.createElement("span");
        trendEl.className = "stat-trend";
        trendEl.style.cssText = `
          font-size:11px;font-weight:600;color:${tc.text};background:${tc.bg};
          padding:2px 6px;border-radius:4px;display:inline-flex;align-items:center;gap:2px;
        `;
        trendEl.textContent = `${tc.arrow} ${Math.abs(card.trend.value)}%`;
        if (card.trend.label) {
          const label = document.createElement("span");
          label.style.cssText = "font-weight:400;color:#9ca3af;margin-left:2px;";
          label.textContent = card.trend.label;
          trendEl.appendChild(label);
        }
        valueRow.appendChild(trendEl);
      }

      el.appendChild(valueRow);

      // Subtitle
      if (card.subtitle && !card.loading) {
        const subEl = document.createElement("span");
        subEl.className = "stat-subtitle";
        subEl.style.cssText = "font-size:12px;color:#9ca3af;";
        subEl.textContent = card.subtitle;
        el.appendChild(subEl);
      }

      // Sparkline
      if (card.sparkline && card.sparkline.length >= 2 && opts.showSparklines && !card.loading) {
        const slContainer = document.createElement("div");
        slContainer.style.cssText = "margin-top:8px;height:36px;";
        const color = card.accentColor ?? "#4338ca";
        const canvas = renderMiniSparkline(card.sparkline, slContainer.offsetWidth || 120, 36, color);
        if (canvas) slContainer.appendChild(canvas);
        el.appendChild(slContainer);
      }

      // Footer
      if (card.footer && !card.loading) {
        const footerEl = document.createElement("div");
        footerEl.className = "stat-footer";
        footerEl.style.cssText = "font-size:11px;color:#aaa;margin-top:6px;padding-top:6px;border-top:1px solid #f3f4f6;";
        footerEl.textContent = card.footer;
        el.appendChild(footerEl);
      }

      return el;
    }

    render();

    return {
      element: container,

      getCards() { return [...cards]; },

      setCards(newCards: StatCard[]) {
        cards = newCards;
        render();
      },

      updateCard(id: string, updates: Partial<StatCard>) {
        const idx = cards.findIndex((c) => c.id === id);
        if (idx >= 0) {
          cards[idx] = { ...cards[idx]!, ...updates };
          render();
        }
      },

      setCardsLoading(id: string, loading: boolean) {
        this.updateCard(id, { loading });
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };
  }
}

/** Convenience: create a stats overview */
export function createStatsOverview(options: StatsOverviewOptions): StatsOverviewInstance {
  return new StatsOverviewManager().create(options);
}
