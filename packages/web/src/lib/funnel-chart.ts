/**
 * Funnel Chart: SVG-based funnel visualization for conversion funnels,
 * with horizontal/vertical orientation, animated entry, hover tooltips,
 * percentage labels, color gradients, and click handlers.
 */

// --- Types ---

export type FunnelOrientation = "vertical" | "horizontal";
export type FunnelStyle = "standard" | "rounded" | "3d";

export interface FunnelDataPoint {
  /** Stage label */
  label: string;
  /** Numeric value (e.g., count, revenue) */
  value: number;
  /** Fill color override */
  color?: string;
  /** Click handler */
  onClick?: (point: FunnelDataPoint, index: number) => void;
  /** Custom data payload */
  data?: unknown;
}

export interface FunnelChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Funnel stages data */
  data: FunnelDataPoint[];
  /** Orientation */
  orientation?: FunnelOrientation;
  /** Visual style variant */
  style?: FunnelStyle;
  /** Chart width (px) */
  width?: number;
  /** Chart height (px) */
  height?: number;
  /** Color palette (applied sequentially to stages) */
  colors?: string[];
  /** Use gradient fill? */
  useGradient?: boolean;
  /** Gap between stages (px) */
  gap?: number;
  /** Show value labels on each stage? */
  showValues?: boolean;
  /** Show percentage labels? */
  showPercentages?: boolean;
  /** Show stage labels? */
  showLabels?: boolean;
  /** Label position ("inside" or "outside") */
  labelPosition?: "inside" | "outside";
  /** Label font size (px) */
  labelFontSize?: number;
  /** Value font size (px) */
  valueFontSize?: number;
  /** Animation on mount? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Stagger delay between stages (ms) */
  staggerDelay?: number;
  /** Custom CSS class */
  className?: string;
}

export interface FunnelChartInstance {
  element: HTMLElement;
  /** Update funnel data */
  setData: (data: FunnelDataPoint[]) => void;
  /** Get current data */
  getData: () => FunnelDataPoint[];
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe",
];

// --- Helpers ---

function interpolateColor(c1: string, c2: string, t: number): string {
  const hex = (s: string) => {
    const m = s.replace("#", "").match(/.{2}/g);
    return m ? [parseInt(m[0]!, 16), parseInt(m[1]!, 16), parseInt(m[2]!, 16)] : [128, 128, 128];
  };
  const [r1, g1, b1] = hex(c1);
  const [r2, g2, b2] = hex(c2);
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r1 + (r2 - r1) * t)}${toHex(g1 + (g2 - g1) * t)}${toHex(b1 + (b2 - b1) * t)}`;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// --- Main Factory ---

export function createFunnelChart(options: FunnelChartOptions): FunnelChartInstance {
  const opts = {
    orientation: options.orientation ?? "vertical",
    style: options.style ?? "rounded",
    width: options.width ?? 400,
    height: options.height ?? 350,
    colors: options.colors ?? DEFAULT_COLORS,
    useGradient: options.useGradient ?? true,
    gap: options.gap ?? 4,
    showValues: options.showValues ?? true,
    showPercentages: options.showPercentages ?? true,
    showLabels: options.showLabels ?? true,
    labelPosition: options.labelPosition ?? "inside",
    labelFontSize: options.labelFontSize ?? 12,
    valueFontSize: options.valueFontSize ?? 13,
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 700,
    staggerDelay: options.staggerDelay ?? 100,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("FunnelChart: container not found");

  let data = [...options.data];
  let destroyed = false;

  const ns = "http://www.w3.org/2000/svg";

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `funnel-chart ${opts.className}`;
  wrapper.style.cssText = `display:inline-block;font-family:-apple-system,sans-serif;`;
  container.appendChild(wrapper);

  // SVG
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;overflow:visible;`;
  wrapper.appendChild(svg);

  // Defs for gradients
  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.style.cssText = `
        position:absolute;z-index:100;padding:8px 14px;border-radius:8px;
        background:#1f2937;color:#fff;font-size:12px;pointer-events:none;
        white-space:nowrap;opacity:0;transition:opacity 0.15s;
        box-shadow:0 4px 12px rgba(0,0,0,0.15);
      `;
      wrapper.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Rendering ---

  function render(progress = 1): void {
    svg.querySelectorAll(".fc-stage").forEach(el => el.remove());
    svg.querySelectorAll(".fc-label-group").forEach(el => el.remove());

    if (data.length === 0) return;

    const maxValue = Math.max(...data.map(d => d.value));
    if (maxValue <= 0) return;

    const isVert = opts.orientation === "vertical";
    const padX = opts.labelPosition === "outside" && isVert ? 80 : 20;
    const padY = 40;
    const plotW = opts.width - padX * 2;
    const plotH = opts.height - padY * 2;
    const stageCount = data.length;
    const gap = opts.gap;

    for (let i = 0; i < stageCount; i++) {
      const point = data[i]!;
      const fraction = point.value / maxValue;
      const prevFraction = i > 0 ? data[i - 1]!.value / maxValue : 1;
      const delay = i * opts.staggerDelay;
      const stageProgress = progress <= 0 ? 0 : Math.max(0, Math.min(1, (progress * opts.animationDuration - delay) / (opts.animationDuration - delay)));

      const color = point.color ?? opts.colors[i % opts.colors.length];
      const lighterColor = interpolateColor(color, "#ffffff", 0.3);

      // Create gradient for this stage
      let fillUrl: string | null = null;
      if (opts.useGradient) {
        const gradId = `fc-grad-${i}-${Date.now()}`;
        const grad = document.createElementNS(ns, "linearGradient");
        grad.setAttribute("id", gradId);
        if (isVert) {
          grad.setAttribute("x1", "0%");
          grad.setAttribute("y1", "0%");
          grad.setAttribute("x2", "100%");
          grad.setAttribute("y2", "0%");
        } else {
          grad.setAttribute("x1", "0%");
          grad.setAttribute("y1", "0%");
          grad.setAttribute("x2", "0%");
          grad.setAttribute("y2", "100%");
        }
        const stop1 = document.createElementNS(ns, "stop");
        stop1.setAttribute("offset", "0%");
        stop1.setAttribute("stop-color", color);
        const stop2 = document.createElementNS(ns, "stop");
        stop2.setAttribute("offset", "100%");
        stop2.setAttribute("stop-color", lighterColor);
        grad.appendChild(stop1);
        grad.appendChild(stop2);
        defs.appendChild(grad);
        fillUrl = `url(#${gradId})`;
      }

      let pathD: string;
      let labelX: number;
      let labelY: number;
      let textAnchor: string;

      if (isVert) {
        // Vertical funnel
        const topW = plotW * prevFraction;
        const bottomW = plotW * fraction;
        const stageH = (plotH - gap * (stageCount - 1)) / stageCount;
        const topY = padY + i * (stageH + gap);
        const bottomY = topY + stageH;
        const centerX = opts.width / 2;
        const radius = opts.style === "rounded" ? Math.min(stageH * 0.2, 12) : 0;

        const x0 = centerX - topW / 2;
        const x1 = centerX + topW / 2;
        const x2 = centerX + bottomW / 2;
        const x3 = centerX - bottomW / 2;

        if (radius > 0) {
          pathD = `
            M ${x0 + radius} ${topY}
            L ${x1 - radius} ${topY}
            Q ${x1} ${topY} ${x1} ${topY + radius}
            L ${x2} ${bottomY - radius}
            Q ${x2} ${bottomY} ${x2 - radius} ${bottomY}
            L ${x3 + radius} ${bottomY}
            Q ${x3} ${bottomY} ${x3} ${bottomY - radius}
            L ${x0} ${topY + radius}
            Q ${x0} ${topY} ${x0 + radius} ${topY}
            Z
          `;
        } else {
          pathD = `M ${x0} ${topY} L ${x1} ${topY} L ${x2} ${bottomY} L ${x3} ${bottomY} Z`;
        }

        labelX = centerX;
        labelY = topY + stageH / 2;
        textAnchor = "middle";
      } else {
        // Horizontal funnel
        const leftH = plotH * prevFraction;
        const rightH = plotH * fraction;
        const stageW = (plotW - gap * (stageCount - 1)) / stageCount;
        const leftX = padX + i * (stageW + gap);
        const rightX = leftX + stageW;
        const centerY = opts.height / 2;
        const radius = opts.style === "rounded" ? Math.min(stageW * 0.15, 10) : 0;

        const y0 = centerY - leftH / 2;
        const y1 = centerY + leftH / 2;
        const y2 = centerY + rightH / 2;
        const y3 = centerY - rightH / 2;

        if (radius > 0) {
          pathD = `
            M ${leftX} ${y0 + radius}
            L ${rightX - radius} ${y0}
            Q ${rightX} ${y0} ${rightX} ${y0 + radius}
            L ${rightX} ${y2 - radius}
            Q ${rightX} ${y2} ${rightX - radius} ${y2}
            L ${leftX + radius} ${y1}
            Q ${leftX} ${y1} ${leftX} ${y1 - radius}
            L ${leftX} ${y0 + radius}
            Q ${leftX} ${y0} ${leftX} ${y0 + radius}
            Z
          `;
        } else {
          pathD = `M ${leftX} ${y0} L ${rightX} ${y0} L ${rightX} ${y2} L ${leftX} ${y1} Z`;
        }

        labelX = leftX + stageW / 2;
        labelY = centerY;
        textAnchor = "middle";
      }

      // Stage path
      const path = document.createElementNS(ns, "path");
      path.setAttribute("class", "fc-stage");
      path.setAttribute("d", pathD);
      path.setAttribute("fill", fillUrl ?? color);
      if (opts.style === "3d") {
        path.setAttribute("filter", "drop-shadow(2px 4px 6px rgba(0,0,0,0.15))");
      }
      path.style.cursor = point.onClick ? "pointer" : "default";
      path.style.opacity = String(stageProgress);
      path.style.transformOrigin = isVert ? "center top" : "left center";
      path.style.transition = `transform 0.2s, opacity 0.3s`;

      // Hover
      path.addEventListener("mouseenter", () => {
        path.style.filter = "brightness(1.08)";
        showTooltip(point, i, maxValue);
      });
      path.addEventListener("mouseleave", () => {
        path.style.filter = "";
        hideTooltip();
      });
      if (point.onClick) {
        path.addEventListener("click", () => point.onClick!(point, i));
      }

      svg.appendChild(path);

      // Labels
      if ((opts.showLabels || opts.showValues || opts.showPercentages) && stageProgress > 0.7) {
        const labelGroup = document.createElementNS(ns, "g");
        labelGroup.setAttribute("class", "fc-label-group");
        labelGroup.style.opacity = String(Math.min(1, (stageProgress - 0.7) * 3.33));

        if (isVert && opts.labelPosition === "outside") {
          labelX = padX - 8;
          textAnchor = "end";
        }

        let yOffset = 0;

        if (opts.showLabels) {
          const lbl = document.createElementNS(ns, "text");
          lbl.setAttribute("x", String(labelX));
          lbl.setAttribute("y", String(labelY + yOffset));
          lbl.setAttribute("text-anchor", textAnchor);
          lbl.setAttribute("dominant-baseline", "central");
          lbl.style.cssText = `font-size:${opts.labelFontSize}px;font-weight:600;fill:#374151;`;
          lbl.textContent = point.label;
          labelGroup.appendChild(lbl);
          yOffset += opts.labelFontSize + 2;
        }

        if (opts.showValues) {
          const val = document.createElementNS(ns, "text");
          val.setAttribute("x", String(labelX));
          val.setAttribute("y", String(labelY + yOffset));
          val.setAttribute("text-anchor", textAnchor);
          val.setAttribute("dominant-baseline", "central");
          val.style.cssText = `font-size:${opts.valueFontSize}px;font-weight:700;fill:#111827;`;
          val.textContent = point.value.toLocaleString();
          labelGroup.appendChild(val);
          yOffset += opts.valueFontSize + 2;
        }

        if (opts.showPercentages && i < stageCount - 1) {
          const nextVal = i < stageCount - 1 ? data[i + 1]!.value : 0;
          const pct = nextVal > 0 ? ((point.value / nextVal) * 100).toFixed(1) : "0";
          const pctEl = document.createElementNS(ns, "text");
          pctEl.setAttribute("x", String(labelX));
          pctEl.setAttribute("y", String(labelY + yOffset));
          pctEl.setAttribute("text-anchor", textAnchor);
          pctEl.setAttribute("dominant-baseline", "central");
          pctEl.style.cssText = `font-size:11px;fill:#9ca3af;`;
          pctEl.textContent = `${pct}% of next`;
          labelGroup.appendChild(pctEl);
        }

        svg.appendChild(labelGroup);
      }
    }
  }

  function showTooltip(point: FunnelDataPoint, index: number, maxVal: number): void {
    const tt = getTooltip();
    const pct = maxVal > 0 ? ((point.value / maxVal) * 100).toFixed(1) : "0";
    const dropPct = index > 0
      ? ((1 - point.value / data[index - 1]!.value) * 100).toFixed(1)
      : "-";
    tt.innerHTML = `<strong>${point.label}</strong><br>Value: ${point.value.toLocaleString()} (${pct}%)<br>Drop-off: ${dropPct}%`;
    tt.style.opacity = "1";
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.opacity = "0";
  }

  // Animated entry
  if (opts.animate) {
    const dur = opts.animationDuration + (data.length - 1) * opts.staggerDelay;
    const start = performance.now();
    function tick(now: number): void {
      const t = Math.min((now - start) / dur, 1);
      render(easeOutQuart(t));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } else {
    render(1);
  }

  // --- Instance ---

  const instance: FunnelChartInstance = {
    element: wrapper,

    getData() { return [...data]; },

    setData(newData: FunnelDataPoint[]) {
      data = [...newData];
      render(1);
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
