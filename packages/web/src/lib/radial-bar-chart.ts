/**
 * Radial Bar Chart: Circular/radial bar gauge chart with multiple bars,
 * rounded caps, gap control, gradient fills, animated entry, labels,
 * legends, and configurable track appearance.
 */

// --- Types ---

export interface RadialBarData {
  label: string;
  value: number;
  max?: number;
  color?: string;
  subtitle?: string;
}

export interface RadialBarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data bars */
  data: RadialBarData[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Inner radius ratio (0-1 of outer) */
  innerRadius?: number;
  /** Bar thickness (ratio of radius) */
  thickness?: number;
  /** Gap between bars (degrees) */
  gap?: number;
  /** Start angle (degrees, -180 to 180) */
  startAngle?: number;
  /** Rounded bar ends? */
  rounded?: boolean;
  /** Use gradient fill? */
  gradient?: boolean;
  /** Track (background arc) color */
  trackColor?: string;
  /** Show track? */
  showTrack?: boolean;
  /** Show labels? */
  showLabels?: boolean;
  /** Label position ("outside" | "inside" | "tooltip") */
  labelPosition?: string;
  /** Show values on bars? */
  showValues?: boolean;
  /** Value decimal places */
  decimals?: number;
  /** Value formatter */
  valueFormatter?: (value: number, max: number) => string;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Stagger delay (ms) */
  staggerDelay?: number;
  /** Easing ("linear" | "easeOut" | "easeInOut") */
  easing?: string;
  /** Legend enabled? */
  showLegend?: boolean;
  /** Legend position ("right" | "bottom") */
  legendPosition?: string;
  /** Tooltip on hover? */
  tooltip?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Bar click callback */
  onBarClick?: (data: RadialBarData, index: number, event: MouseEvent) => void;
}

export interface RadialBarInstance {
  element: SVGElement;
  /** Update data */
  setData: (data: RadialBarData[]) => void;
  /** Update single bar */
  updateBar: (index: number, data: Partial<RadialBarData>) => void;
  /** Animate to new values */
  animateToValues: (values: number[]) => void;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Easing ---

function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function easeInOutQuad(t: number): number { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

function getEaser(name: string): (t: number) => number {
  switch (name) {
    case "easeOut": return easeOutCubic;
    case "easeInOut": return easeInOutQuad;
    default: return (t: number) => t;
  }
}

// --- Math ---

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function describeArc(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number, rounded: boolean): string {
  const diff = endAngle - startAngle;
  if (diff < 0.01) return "";

  const capR = (outerR - innerR) / 2;
  const midR = (innerR + outerR) / 2;

  const [sxOuter, syOuter] = polarToCartesian(cx, cy, outerR, startAngle);
  const [exOuter, eyOuter] = polarToCartesian(cx, cy, outerR, endAngle);
  const [sxInner, syInner] = polarToCartesian(cx, cy, innerR, startAngle);
  const [exInner, eyInner] = polarToCartesian(cx, cy, innerR, endAngle);

  let d = "";

  if (rounded && diff > 2) {
    // Start cap (outer)
    d += `M ${sxOuter} ${syOuter} A ${capR} ${capR} 0 0 1 `;
    const [sc1x, sc1y] = polarToCartesian(sxOuter, syOuter, capR, startAngle + 90);
    d += `${sc1x} ${sc1y} `;
    // Line to inner start cap
    const [sicx, sicy] = polarToCartesian(cx, cy, midR, startAngle);
    d += `L ${sicx} ${sicy} `;
    // Start cap (inner)
    d += `A ${capR} ${capR} 0 0 0 `;
    const [sc2x, sc2y] = polarToCartesian(sxInner, syInner, capR, startAngle - 90);
    d += `${sc2x} ${sc2y} `;
    // Arc along outer edge
    d += `L ${exOuter} ${eyOuter} A ${outerR} ${outerR} 0 ${diff > 180 ? 1 : 0} 1 `;
    // End cap (outer)
    d += `A ${capR} ${capR} 0 0 1 `;
    const [ec1x, ec1y] = polarToCartesian(exOuter, eyOuter, capR, endAngle + 90);
    d += `${ec1x} ${ec1y} `;
    // Line to inner end cap
    const [eicx, eicy] = polarToCartesian(cx, cy, midR, endAngle);
    d += `L ${eicx} ${eicy} `;
    // End cap (inner)
    d += `A ${capR} ${capR} 0 0 0 `;
    const [ec2x, ec2y] = polarToCartesian(exInner, eyInner, capR, endAngle - 90);
    d += `${ec2x} ${ec2y} Z`;
  } else {
    // Simple arc
    const largeArc = diff > 180 ? 1 : 0;
    d = `M ${sxOuter} ${syOuter} A ${outerR} ${outerR} 0 ${largeArc} 1 ${exOuter} ${eyOuter}`;
    d += ` L ${exInner} ${eyInner} A ${innerR} ${innerR} 0 ${largeArc} 0 ${sxInner} ${syInner} Z`;
  }

  return d;
}

// --- Default Colors ---

const DEFAULT_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

// --- Main Factory ---

export function createRadialBarChart(options: RadialBarOptions): RadialBarInstance {
  const opts = {
    width: options.width ?? 400,
    height: options.height ?? 400,
    innerRadius: options.innerRadius ?? 0.55,
    thickness: options.thickness ?? 0.22,
    gap: options.gap ?? 2,
    startAngle: options.startAngle ?? -90,
    rounded: options.rounded ?? true,
    gradient: options.gradient ?? true,
    trackColor: options.trackColor ?? "#e5e7eb",
    showTrack: options.showTrack ?? true,
    showLabels: options.showLabels ?? true,
    labelPosition: options.labelPosition ?? "outside",
    showValues: options.showValues ?? true,
    decimals: options.decimals ?? 1,
    valueFormatter: options.valueFormatter ?? ((v, m) => `${((v / m) * 100).toFixed(0)}%`),
    animationDuration: options.animationDuration ?? 800,
    staggerDelay: options.staggerDelay ?? 100,
    easing: options.easing ?? "easeOut",
    showLegend: options.showLegend ?? true,
    legendPosition: options.legendPosition ?? "bottom",
    tooltip: options.tooltip ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RadialBarChart: container not found");

  let data: RadialBarData[] = JSON.parse(JSON.stringify(options.data));
  let destroyed = false;

  const cx = opts.width / 2;
  const cy = opts.height / 2;
  const outerR = Math.min(opts.width, opts.height) / 2 - 20;
  const innerR = outerR * opts.innerRadius;
  const barThickness = outerR * opts.thickness;
  const barInnerR = outerR - barThickness;

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `radial-bar-chart ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;overflow:visible;`;

  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  const gTracks = document.createElementNS(ns, "g");
  svg.appendChild(gTracks);

  const gBars = document.createElementNS(ns, "g");
  svg.appendChild(gBars);

  const gLabels = document.createElementNS(ns, "g");
  svg.appendChild(gLabels);

  // Tooltip
  const gTooltip = document.createElementNS(ns, "g");
  gTooltip.style.display = "none";
  gTooltip.style.pointerEvents = "none";
  svg.appendChild(gTooltip);

  const ttBg = document.createElementNS(ns, "rect");
  ttBg.setAttribute("rx", "4");
  ttBg.setAttribute("fill", "#1f2937");
  ttBg.setAttribute("opacity", "0.9");
  gTooltip.appendChild(ttBg);

  const ttText = document.createElementNS(ns, "text");
  ttText.setAttribute("fill", "#fff");
  ttText.setAttribute("font-size", "11");
  gTooltip.appendChild(ttText);

  // Legend
  let legendEl: HTMLElement | null = null;
  if (opts.showLegend) {
    legendEl = document.createElement("div");
    legendEl.style.cssText = `
      display:flex;flex-wrap:wrap;gap:8px;padding:8px;
      justify-content:center;font-size:11px;font-family:-apple-system,sans-serif;
    `;
    container.appendChild(legendEl);
  }

  container.appendChild(svg);

  // --- Rendering ---

  function render(): void {
    gTracks.innerHTML = "";
    gBars.innerHTML = "";
    gLabels.innerHTML = "";
    if (legendEl) legendEl.innerHTML = "";

    if (data.length === 0) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(cx));
      empty.setAttribute("y", String(cy));
      empty.setAttribute("text-anchor", "middle");
      empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gBars.appendChild(empty);
      return;
    }

    const totalAngle = 360 - opts.gap * data.length;
    const anglePerBar = totalAngle / data.length;

    // Tracks
    if (opts.showTrack) {
      for (let i = 0; i < data.length; i++) {
        const sa = opts.startAngle + i * (anglePerBar + opts.gap);
        const ea = sa + anglePerBar;
        const trackPath = document.createElementNS(ns, "path");
        trackPath.setAttribute("d", describeArc(cx, cy, barInnerR, outerR, sa, ea, false));
        trackPath.setAttribute("fill", opts.trackColor);
        trackPath.setAttribute("opacity", "0.35");
        gTracks.appendChild(trackPath);
      }
    }

    // Bars
    for (let i = 0; i < data.length; i++) {
      const d = data[i]!;
      const max = d.max ?? 100;
      const fraction = Math.min(Math.max(d.value / max, 0), 1);
      const color = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      const sa = opts.startAngle + i * (anglePerBar + opts.gap);
      const filledAngle = sa + fraction * anglePerBar;
      const ea = sa + anglePerBar;

      // Gradient def
      let fillRef = color;
      if (opts.gradient) {
        const gradId = `radbar-grad-${i}`;
        const grad = document.createElementNS(ns, "linearGradient");
        grad.setAttribute("id", gradId);
        grad.setAttribute("x1", "0%"); grad.setAttribute("y1", "0%");
        grad.setAttribute("x2", "100%"); grad.setAttribute("y2", "0%");
        grad.innerHTML = `<stop offset="0%" stop-color="${color}" stop-opacity="1"/><stop offset="100%" stop-color="${color}" stop-opacity="0.65"/>`;
        defs.appendChild(grad);
        fillRef = `url(#${gradId})`;
      }

      // Bar path
      const barPath = document.createElementNS(ns, "path");
      const fullD = describeArc(cx, cy, barInnerR, outerR, sa, filledAngle, opts.rounded);
      barPath.setAttribute("d", fullD);
      barPath.setAttribute("fill", fillRef);
      barPath.style.cursor = "pointer";
      barPath.style.transformOrigin = `${cx}px ${cy}px`;

      // Animate
      const easer = getEaser(opts.easing);
      barPath.animate(
        [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
        { duration: opts.animationDuration, delay: i * opts.staggerDelay, fill: "forwards", easing: "ease-out" }
      );

      // Hover
      barPath.addEventListener("mouseenter", (e) => {
        barPath.setAttribute("opacity", "0.85");
        showTooltip(d, max);
      });
      barPath.addEventListener("mouseleave", () => {
        barPath.removeAttribute("opacity");
        hideTooltip();
      });
      barPath.addEventListener("click", (e) => opts.onBarClick?.(d, i, e));

      gBars.appendChild(barPath);

      // Labels
      if (opts.showLabels) {
        const midAngle = sa + anglePerBar / 2;
        const labelR = opts.labelPosition === "inside" ? (barInnerR + outerR) / 2 : outerR + 18;
        const [lx, ly] = polarToCartesian(cx, cy, labelR, midAngle);

        const labelGroup = document.createElementNS(ns, "g");

        if (opts.labelPosition !== "tooltip") {
          const labelText = document.createElementNS(ns, "text");
          labelText.setAttribute("x", String(lx));
          labelText.setAttribute("y", String(ly));
          labelText.setAttribute("text-anchor", "middle");
          labelText.setAttribute("dominant-baseline", "middle");
          labelText.setAttribute("fill", "#374151");
          labelText.setAttribute("font-size", "11");
          labelText.setAttribute("font-weight", "500");
          labelText.setAttribute("pointer-events", "none");
          labelText.textContent = d.label;
          labelGroup.appendChild(labelText);
        }

        // Value text
        if (opts.showValues) {
          const valText = document.createElementNS(ns, "text");
          const valR = opts.labelPosition === "inside" ? (barInnerR + outerR) / 2 + 12 : outerR + 32;
          const [vx, vy] = polarToCartesian(cx, cy, valR, midAngle);
          valText.setAttribute("x", String(vx));
          valText.setAttribute("y", String(vy));
          valText.setAttribute("text-anchor", "middle");
          valText.setAttribute("dominant-baseline", "middle");
          valText.setAttribute("fill", color);
          valText.setAttribute("font-size", "13");
          valText.setAttribute("font-weight", "700");
          valText.setAttribute("pointer-events", "none");
          valText.textContent = opts.valueFormatter(d.value, max);
          labelGroup.appendChild(valText);
        }

        gLabels.appendChild(labelGroup);
      }

      // Legend
      if (legendEl) {
        const item = document.createElement("div");
        item.style.cssText = "display:flex;align-items:center;gap:5px;";
        const swatch = document.createElement("span");
        swatch.style.cssText = `width:14px;height:4px;border-radius:2px;background:${color};`;
        const name = document.createElement("span");
        name.textContent = d.label;
        name.style.color = "#374151";
        item.appendChild(swatch); item.appendChild(name);
        legendEl.appendChild(item);
      }
    }
  }

  function showTooltip(d: RadialBarData, max: number): void {
    if (!opts.tooltip) return;
    ttText.textContent = `${d.label}: ${opts.valueFormatter(d.value, max)}${d.subtitle ? ` (${d.subtitle})` : ""}`;
    gTooltip.style.display = "block";
    requestAnimationFrame(() => {
      const bb = ttText.getBBox();
      const p = 6;
      ttBg.setAttribute("x", String(-bb.width / 2 - p));
      ttBg.setAttribute("y", String(-bb.height - p - 10));
      ttBg.setAttribute("width", String(bb.width + p * 2));
      ttBg.setAttribute("height", String(bb.height + p * 2));
      ttText.setAttribute("x", String(-bb.width / 2));
      ttText.setAttribute("y", String(-bb.height - 10 + bb.height / 2 + 4));
      gTooltip.setAttribute("transform", `translate(${cx}, ${cy - outerR - 40})`);
    });
  }

  function hideTooltip(): void {
    gTooltip.style.display = "none";
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: RadialBarInstance = {
    element: svg,

    setData(newData: RadialBarData[]) {
      data = newData.map(d => ({ ...d }));
      render();
    },

    updateBar(index: number, partial: Partial<RadialBarData>) {
      if (index >= 0 && index < data.length) {
        data[index] = { ...data[index]!, ...partial };
        render();
      }
    },

    animateToValues(values: number[]) {
      for (let i = 0; i < Math.min(values.length, data.length); i++) {
        data[i]!.value = values[i]!;
      }
      render();
    },

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      svg.remove();
      legendEl?.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
