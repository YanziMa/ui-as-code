/**
 * Radar Chart: SVG-based radar/spider chart with multiple datasets,
 * polygon areas, axis lines, grid levels, interactive hover tooltips,
 * legends, animated entry, and configurable styling.
 */

// --- Types ---

export interface RadarAxis {
  /** Axis label */
  label: string;
  /** Maximum value for this axis */
  max?: number;
}

export interface RadarDataset {
  /** Dataset label */
  label: string;
  /** Values per axis (must match axes.length) */
  values: number[];
  /** Fill color (with alpha for area) */
  fill?: string;
  /** Stroke color */
  stroke?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Point radius */
  pointRadius?: number;
  /** Point fill color */
  pointFill?: string;
  /** Dashed? */
  dashed?: boolean;
}

export interface RadarChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Axis definitions */
  axes: RadarAxis[];
  /** Datasets to display */
  datasets: RadarDataset[];
  /** Chart size (px) */
  size?: number;
  /** Number of grid rings/levels */
  levels?: number;
  /** Show axis labels? */
  showLabels?: boolean;
  /** Show data point dots? */
  showPoints?: boolean;
  /** Fill area under polygons? */
  showArea?: boolean;
  /** Show legend? */
  showLegend?: boolean;
  /** Default color palette */
  colors?: string[];
  /** Background color for the chart area */
  background?: string;
  /** Grid line color */
  gridColor?: string;
  /** Axis line color */
  axisColor?: string;
  /** Label font size (px) */
  labelFontSize?: number;
  /** Animation on mount? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Interaction mode */
  interactionMode?: "hover" | "none";
  /** Custom CSS class */
  className?: string;
}

export interface RadarChartInstance {
  element: HTMLElement;
  /** Update datasets */
  setDatasets: (datasets: RadarDataset[]) => void;
  /** Update a single dataset by index */
  updateDataset: (index: number, dataset: Partial<RadarDataset>) => void;
  /** Get current datasets */
  getDatasets: () => RadarDataset[];
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_COLORS = [
  "rgba(99,102,241,0.25)", "rgba(236,72,153,0.25)",
  "rgba(245,158,11,0.25)", "rgba(16,185,129,0.25)",
];
const DEFAULT_STROKES = ["#6366f1", "#ec4899", "#f59e0b", "#10b981"];

// --- Helpers ---

function polarToCartesian(cx: number, cy: number, r: number, angleRad: number): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

// --- Main Factory ---

export function createRadarChart(options: RadarChartOptions): RadarChartInstance {
  const opts = {
    size: options.size ?? 300,
    levels: options.levels ?? 5,
    showLabels: options.showLabels ?? true,
    showPoints: options.showPoints ?? true,
    showArea: options.showArea ?? true,
    showLegend: options.showLegend ?? true,
    colors: options.colors ?? [...DEFAULT_COLORS],
    background: options.background ?? "transparent",
    gridColor: options.gridColor ?? "#e5e7eb",
    axisColor: options.axisColor ?? "#d1d5db",
    labelFontSize: options.labelFontSize ?? 11,
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 800,
    interactionMode: options.interactionMode ?? "hover",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("RadarChart: container not found");

  let datasets = [...options.datasets];
  let destroyed = false;

  const ns = "http://www.w3.org/2000/svg";
  const cx = opts.size / 2;
  const cy = opts.size / 2;
  const radius = opts.size / 2 - (opts.showLabels ? opts.labelFontSize + 16 : 20);
  const numAxes = opts.axes.length;

  if (numAxes < 3) throw new Error("RadarChart: requires at least 3 axes");

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `radar-chart ${opts.className}`;
  wrapper.style.cssText = `display:inline-block;font-family:-apple-system,sans-serif;`;
  container.appendChild(wrapper);

  // SVG
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.size} ${opts.size}`);
  svg.style.cssText = `width:${opts.size}px;height:${opts.size}px;display:block;overflow:visible;`;
  wrapper.appendChild(svg);

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.style.cssText = `
        position:absolute;z-index:100;padding:6px 10px;border-radius:6px;
        background:#1f2937;color:#fff;font-size:11px;pointer-events:none;
        white-space:nowrap;opacity:0;transition:opacity 0.15s;
      `;
      wrapper.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Rendering ---

  function render(progress = 1): void {
    svg.innerHTML = "";

    // Background
    if (opts.background !== "transparent") {
      const bg = document.createElementNS(ns, "circle");
      bg.setAttribute("cx", String(cx));
      bg.setAttribute("cy", String(cy));
      bg.setAttribute("r", String(radius));
      bg.setAttribute("fill", opts.background);
      svg.appendChild(bg);
    }

    // Grid rings
    for (let level = 1; level <= opts.levels; level++) {
      const r = (radius / opts.levels) * level;
      const points: string[] = [];
      for (let i = 0; i < numAxes; i++) {
        const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
        const pt = polarToCartesian(cx, cy, r, angle);
        points.push(`${pt.x},${pt.y}`);
      }
      const ring = document.createElementNS(ns, "polygon");
      ring.setAttribute("points", points.join(" "));
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke", level === opts.levels ? opts.axisColor : opts.gridColor);
      ring.setAttribute("stroke-width", level === opts.levels ? "1.5" : "1");
      svg.appendChild(ring);
    }

    // Axis lines + labels
    for (let i = 0; i < numAxes; i++) {
      const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
      const edge = polarToCartesian(cx, cy, radius, angle);

      // Axis line
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", String(cx));
      line.setAttribute("y1", String(cy));
      line.setAttribute("x2", String(edge.x));
      line.setAttribute("y2", String(edge.y));
      line.setAttribute("stroke", opts.axisColor);
      line.setAttribute("stroke-width", "1");
      svg.appendChild(line);

      // Label
      if (opts.showLabels) {
        const axis = opts.axes[i]!;
        const labelR = radius + opts.labelFontSize + 8;
        const labelPos = polarToCartesian(cx, cy, labelR, angle);
        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", String(labelPos.x));
        text.setAttribute("y", String(labelPos.y));
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "central");
        text.style.cssText = `font-size:${opts.labelFontSize}px;color:#6b7280;font-weight:500;`;
        text.textContent = axis.label;
        svg.appendChild(text);
      }
    }

    // Data polygons
    for (let di = 0; di < datasets.length; di++) {
      const ds = datasets[di]!;
      const stroke = ds.stroke ?? DEFAULT_STROKES[di % DEFAULT_STROKES.length];
      const fill = ds.fill ?? opts.colors[di % opts.colors.length];
      const sw = ds.strokeWidth ?? 2;
      const pr = ds.pointRadius ?? 4;
      const pf = ds.pointFill ?? stroke;

      // Calculate vertex positions
      const vertices: { x: number; y: number; value: number }[] = [];
      for (let i = 0; i < numAxes; i++) {
        const axis = opts.axes[i]!;
        const maxVal = axis.max ?? Math.max(...ds.values, ...datasets.flatMap(d => d.values), 1);
        const val = ds.values[i] ?? 0;
        const normalized = maxVal > 0 ? val / maxVal : 0;
        const angle = (Math.PI * 2 * i) / numAxes - Math.PI / 2;
        const r = radius * normalized * progress;
        vertices.push({ ...polarToCartesian(cx, cy, r, angle), value: val });
      }

      const pointsStr = vertices.map(v => `${v.x},${v.y}`).join(" ");

      // Area fill
      if (opts.showArea) {
        const area = document.createElementNS(ns, "polygon");
        area.setAttribute("points", pointsStr);
        area.setAttribute("fill", fill);
        area.setAttribute("stroke", "none");
        area.style.opacity = String(progress);
        area.setAttribute("class", "rc-area");
        svg.appendChild(area);
      }

      // Polygon outline
      const poly = document.createElementNS(ns, "polygon");
      poly.setAttribute("points", pointsStr);
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", stroke);
      poly.setAttribute("stroke-width", String(sw));
      if (ds.dashed) poly.setAttribute("stroke-dasharray", "6,4");
      poly.style.opacity = String(progress);
      poly.setAttribute("class", "rc-poly");
      poly.dataset.datasetIndex = String(di);

      // Hover events
      if (opts.interactionMode === "hover") {
        poly.addEventListener("mouseenter", (e) => {
          poly.setAttribute("stroke-width", String(sw + 1));
          showTooltip(e as MouseEvent, ds, vertices, i);
        });
        poly.addEventListener("mouseleave", () => {
          poly.setAttribute("stroke-width", String(sw));
          hideTooltip();
        });
      }

      svg.appendChild(poly);

      // Data points
      if (opts.showPoints) {
        for (const v of vertices) {
          const dot = document.createElementNS(ns, "circle");
          dot.setAttribute("cx", String(v.x));
          dot.setAttribute("cy", String(v.y));
          dot.setAttribute("r", String(pr));
          dot.setAttribute("fill", pf);
          dot.setAttribute("stroke", "#fff");
          dot.setAttribute("stroke-width", "1.5");
          dot.style.opacity = String(progress);
          svg.appendChild(dot);
        }
      }
    }

    // Legend
    if (opts.showLegend && datasets.length > 0) {
      const legendGroup = document.createElementNS(ns, "g");
      legendGroup.setAttribute("transform", `translate(${8}, ${opts.size - 12})`);

      let lx = 0;
      for (let di = 0; di < datasets.length; di++) {
        const ds = datasets[di]!;
        const stroke = ds.stroke ?? DEFAULT_STROKES[di % DEFAULT_STROKES.length];

        const itemW = ds.label.length * opts.labelFontSize * 0.6 + 20;

        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(lx));
        rect.setAttribute("y", "-4");
        rect.setAttribute("width", "12");
        rect.setAttribute("height", "4");
        rect.setAttribute("rx", "2");
        rect.setAttribute("fill", stroke);
        legendGroup.appendChild(rect);

        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", String(lx + 16));
        text.setAttribute("y", "2");
        text.style.cssText = `font-size:${opts.labelFontSize}px;color:#374151;`;
        text.textContent = ds.label;
        legendGroup.appendChild(text);

        lx += itemW + 16;
      }
      svg.appendChild(legendGroup);
    }
  }

  function showTooltip(e: MouseEvent, ds: RadarDataset, vertices: { x: number; y: number; value: number }[], _axisIdx: number): void {
    const tt = getTooltip();
    const rect = wrapper.getBoundingClientRect();
    tt.innerHTML = `<strong>${ds.label}</strong><br>` +
      vertices.map((v, i) => `${opts.axes[i]?.label ?? ""}: ${v.value}`).join("<br>");
    tt.style.left = `${e.clientX - rect.left}px`;
    tt.style.top = `${e.clientY - rect.top - 10}px`;
    tt.style.opacity = "1";
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.opacity = "0";
  }

  // Animated entry
  if (opts.animate) {
    const dur = opts.animationDuration;
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

  const instance: RadarChartInstance = {
    element: wrapper,

    getDatasets() { return [...datasets]; },

    setDatasets(newDatasets: RadarDataset[]) {
      datasets = [...newDatasets];
      render(1);
    },

    updateDataset(index: number, updates: Partial<RadarDataset>) {
      if (index >= 0 && index < datasets.length) {
        datasets[index] = { ...datasets[index]!, ...updates };
        render(1);
      }
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
