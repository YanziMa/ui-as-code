/**
 * Parallel Coordinates: Multidimensional data visualization with parallel
 * axes, polyline rendering, brushing/highlighting, axis reordering,
 * color by category, scaling modes, and interactive filtering.
 */

// --- Types ---

export interface PCDimension {
  /** Dimension key/field name */
  key: string;
  /** Display label */
  label: string;
  /** Type ("numeric" | "ordinal" | "time") */
  type?: "numeric" | "ordinal" | "time";
  /** Custom domain [min, max] for numeric */
  domain?: [number, number];
  /** Custom categories for ordinal */
  categories?: string[];
}

export interface PCRow {
  id?: string;
  values: Record<string, number | string>;
  category?: string;
  color?: string;
  highlighted?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ParallelCoordinatesOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Data rows */
  data: PCRow[];
  /** Dimensions (axes) */
  dimensions: PCDimension[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Line opacity */
  lineOpacity?: number;
  /** Highlighted line opacity */
  highlightOpacity?: number;
  /** Line width */
  lineWidth?: number;
  /** Highlighted line width */
  highlightLineWidth?: number;
  /** Color palette for categories */
  colors?: string[];
  /** Default line color (when no category) */
  defaultColor?: string;
  /** Show axis ticks? */
  showTicks?: boolean;
  /** Tick font size */
  tickFontSize?: number;
  /** Axis title font size */
  titleFontSize?: number;
  /** Brush/filter mode ("none" | "single" | "multi") */
  brushMode?: string;
  /** Brush callback (returns filtered row indices) */
  onBrush?: (indices: number[]) => void;
  /** Line hover callback */
  onLineHover?: (row: PCRow | null, index: number) => void;
  /** Line click callback */
  onLineClick?: (row: PCRow, index: number, event: MouseEvent) => void;
  /** Show legend? */
  showLegend?: boolean;
  /** Curved lines (beta spline)? */
  curved?: boolean;
  /** Background color */
  background?: string;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
}

export interface PCInstance {
  element: SVGElement;
  /** Update data */
  setData: (data: PCRow[]) => void;
  /** Set dimensions */
  setDimensions: (dims: PCDimension[]) => void;
  /** Reorder dimensions */
  reorderDimensions: (keys: string[]) => void;
  /** Highlight rows by ID */
  highlight: (ids: string[]) => void;
  /** Clear highlights */
  clearHighlight: () => void;
  /** Get filtered indices (from brush) */
  getFilteredIndices: () => number[];
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Scale Helpers ---

function scaleLinear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  return (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);
}

function scaleOrdinal(categories: string[], range: [number, number]): (v: string) => number {
  const step = (range[1] - range[0]) / (categories.length || 1);
  const map = new Map<string, number>();
  categories.forEach((c, i) => map.set(c, range[0] + i * step + step / 2));
  return (v: string) => map.get(v) ?? range[0] + (range[1] - range[0]) / 2;
}

// --- Colors ---

const DEFAULT_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

// --- Main Factory ---

export function createParallelCoordinates(options: ParallelCoordinatesOptions): PCInstance {
  const opts = {
    width: options.width ?? 700,
    height: options.height ?? 380,
    lineOpacity: options.lineOpacity ?? 0.2,
    highlightOpacity: options.highlightOpacity ?? 0.85,
    lineWidth: options.lineWidth ?? 1.2,
    highlightLineWidth: options.highlightLineWidth ?? 2.5,
    colors: options.colors ?? DEFAULT_COLORS,
    defaultColor: options.defaultColor ?? "#94a3b8",
    showTicks: options.showTicks ?? true,
    tickFontSize: options.tickFontSize ?? 9,
    titleFontSize: options.titleFontSize ?? 11,
    brushMode: options.brushMode ?? "none",
    showLegend: options.showLegend ?? true,
    curved: options.curved ?? false,
    background: options.background ?? "#fafbfc",
    padding: options.padding ?? { top: 30, right: 30, bottom: 40, left: 40 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ParallelCoordinates: container not found");

  let data: PCRow[] = JSON.parse(JSON.stringify(options.data));
  let dimensions: PCDimension[] = JSON.parse(JSON.stringify(options.dimensions));
  let highlightedIds: Set<string> = new Set();
  let filteredIndices: number[] = [];
  let destroyed = false;

  const pad = opts.padding;
  const plotW = opts.width - pad.left! - pad.right!;
  const plotH = opts.height - pad.top! - pad.bottom!;

  // Category color map
  const catColorMap = new Map<string, string>();
  let catIdx = 0;
  for (const row of data) {
    if (row.category && !catColorMap.has(row.category)) {
      catColorMap.set(row.category, opts.colors[catIdx % opts.colors.length]);
      catIdx++;
    }
  }

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `parallel-coordinates ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width));
  bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", opts.background);
  bg.setAttribute("rx", "6");
  svg.appendChild(bg);

  const gAxes = document.createElementNS(ns, "g");
  svg.appendChild(gAxes);

  const gLines = document.createElementNS(ns, "g");
  svg.appendChild(gLines);

  const gBrushes = document.createElementNS(ns, "g");
  svg.appendChild(gBrushes);

  // Legend
  let legendEl: HTMLElement | null = null;
  if (opts.showLegend && catColorMap.size > 0) {
    legendEl = document.createElement("div");
    legendEl.style.cssText = "display:flex;gap:10px;padding:6px 12px;font-size:11px;flex-wrap:wrap;justify-content:center;";
    container.insertBefore(legendEl, svg);
  }

  container.appendChild(svg);

  // Brush state
  const brushState: Map<number, [number, number]> = new Map(); // dimIndex -> [minY, maxY]

  // --- Rendering ---

  function render(): void {
    gAxes.innerHTML = ""; gLines.innerHTML = ""; gBrushes.innerHTML = "";
    if (legendEl) legendEl.innerHTML = "";

    if (dimensions.length < 2 || data.length === 0) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(opts.width / 2)); empty.setAttribute("y", String(opts.height / 2));
      empty.setAttribute("text-anchor", "middle"); empty.setAttribute("fill", "#9ca3af");
      empty.textContent = dimensions.length < 2 ? "Need at least 2 dimensions" : "No data";
      gLines.appendChild(empty);
      return;
    }

    // Compute domains per dimension
    const dimDomains: Array<{ scale: (v: any) => number; domain: [number, number]; type: string }> = [];

    for (const dim of dimensions) {
      if (dim.type === "ordinal" || dim.categories) {
        const cats = dim.categories ?? [...new Set(data.map(r => String(r.values[dim.key] ?? "")))];
        const sc = scaleOrdinal(cats, [pad.top! + plotH, pad.top!]);
        dimDomains.push({
          scale: sc as (v: any) => number,
          domain: [0, cats.length],
          type: "ordinal",
        });
      } else {
        // Numeric
        const vals = data.map(r => Number(r.values[dim.key] ?? 0)).filter(v => !isNaN(v));
        const dMin = dim.domain?.[0] ?? (vals.length > 0 ? Math.min(...vals) : 0);
        const dMax = dim.domain?.[1] ?? (vals.length > 0 ? Math.max(...vals) : 100);
        const pad_ = (dMax - dMin) * 0.06 || 1;
        const sc = scaleLinear([dMin - pad_, dMax + pad_], [pad.top! + plotH, pad.top!]);
        dimDomains.push({ scale: sc, domain: [dMin - pad_, dMax + pad_], type: "numeric" });
      }
    }

    const axisXPositions = dimensions.map((_, i) =>
      pad.left! + (i / (dimensions.length - 1 || 1)) * plotW
    );

    // Draw axes
    for (let di = 0; di < dimensions.length; di++) {
      const dim = dimensions[di]!;
      const ax = axisXPositions[di]!;
      const dd = dimDomains[di]!;

      // Axis line
      const axisLine = document.createElementNS(ns, "line");
      axisLine.setAttribute("x1", String(ax)); axisLine.setAttribute("y1", String(pad.top));
      axisLine.setAttribute("x2", String(ax)); axisLine.setAttribute("y2", String(pad.top! + plotH));
      axisLine.setAttribute("stroke", "#d1d5db"); axisLine.setAttribute("stroke-width", "1.5");
      gAxes.appendChild(axisLine);

      // Ticks
      if (opts.showTicks && dd.type === "numeric") {
        const [d0, d1] = dd.domain;
        const tickCount = 5;
        const step = (d1 - d0) / tickCount;
        for (let t = 0; t <= tickCount; t++) {
          const val = d0 + t * step;
          const pos = dd.scale(val);
          const tk = document.createElementNS(ns, "line");
          tk.setAttribute("x1", String(ax - 4)); tk.setAttribute("y1", String(pos));
          tk.setAttribute("x2", String(ax)); tk.setAttribute("y2", String(pos));
          tk.setAttribute("stroke", "#9ca3af"); gAxes.appendChild(tk);

          const lb = document.createElementNS(ns, "text");
          lb.setAttribute("x", String(ax - 8)); lb.setAttribute("y", String(pos + 3));
          lb.setAttribute("text-anchor", "end"); lb.setAttribute("fill", "#6b7280");
          lb.setAttribute("font-size", String(opts.tickFontSize));
          lb.textContent = val >= 1000 ? `${(val / 1000).toFixed(1)}K` : val % 1 === 0 ? String(val) : val.toFixed(1);
          gAxes.appendChild(lb);
        }
      }

      // Title
      const title = document.createElementNS(ns, "text");
      title.setAttribute("x", String(ax)); title.setAttribute("y", String(pad.top! - 10));
      title.setAttribute("text-anchor", "middle"); title.setAttribute("fill", "#374151");
      title.setAttribute("font-size", String(opts.titleFontSize));
      title.setAttribute("font-weight", "600");
      title.textContent = dim.label;
      gAxes.appendChild(title);
    }

    // Draw polylines
    for (let ri = 0; ri < data.length; ri++) {
      const row = data[ri]!;
      const isHighlighted = highlightedIds.size > 0 && (row.id != null && highlightedIds.has(row.id));
      const isDimmed = highlightedIds.size > 0 && !isHighlighted;

      const color = row.color ?? catColorMap.get(row.category ?? "") ?? opts.defaultColor;
      const pts: string[] = [];

      for (let di = 0; di < dimensions.length; di++) {
        const rawVal = row.values[dimensions[di]!.key];
        const ax = axisXPositions[di]!;
        let py: number;

        if (dimDomains[di]!.type === "ordinal") {
          py = dimDomains[di]!.scale(String(rawVal ?? ""));
        } else {
          py = dimDomains[di]!.scale(Number(rawVal ?? 0));
        }

        pts.push(`${ax},${py}`);
      }

      let d: string;
      if (opts.curved && pts.length > 2) {
        // Catmull-Rom to Bezier
        d = catmullRomToBezier(pts);
      } else {
        d = `M ${pts.join(" L ")}`;
      }

      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", String(isHighlighted ? opts.highlightLineWidth : opts.lineWidth));
      path.setAttribute("stroke-opacity", String(isDimmed ? 0.05 : isHighlighted ? opts.highlightOpacity : opts.lineOpacity));
      path.style.cursor = "pointer";

      path.addEventListener("mouseenter", () => {
        if (!isDimmed) {
          path.setAttribute("stroke-opacity", String(opts.highlightOpacity));
          path.setAttribute("stroke-width", String(opts.highlightLineWidth));
        }
        opts.onLineHover?.(row, ri);
      });
      path.addEventListener("mouseleave", () => {
        path.setAttribute("stroke-opacity", String(isDimmed ? 0.05 : isHighlighted ? opts.highlightOpacity : opts.lineOpacity));
        path.setAttribute("stroke-width", String(isHighlighted ? opts.highlightLineWidth : opts.lineWidth));
        opts.onLineHover?.(null, -1);
      });
      path.addEventListener("click", (e) => opts.onLineClick?.(row, ri, e));

      gLines.appendChild(path);
    }

    // Brush rectangles
    if (opts.brushMode !== "none") {
      for (const [di, [by0, by1]] of brushState.entries()) {
        const ax = axisXPositions[di]!;
        const br = document.createElementNS(ns, "rect");
        br.setAttribute("x", String(ax - 15));
        br.setAttribute("y", String(Math.min(by0, by1)));
        br.setAttribute("width", "30");
        br.setAttribute("height", String(Math.abs(by1 - by0)));
        br.setAttribute("fill", "#6366f1");
        br.setAttribute("fill-opacity", "0.1");
        br.setAttribute("stroke", "#6366f1");
        br.setAttribute("stroke-width", "1");
        br.setAttribute("stroke-dasharray", "3,3");
        gBrushes.appendChild(br);
      }
    }

    // Legend
    if (legendEl) {
      for (const [cat, col] of catColorMap) {
        const item = document.createElement("div");
        item.style.cssText = "display:flex;align-items:center;gap:5px;";
        const swatch = document.createElement("span");
        swatch.style.cssText = `width:16px;height:2px;background:${col};`;
        const name = document.createElement("span");
        name.textContent = cat; name.style.color = "#374151";
        item.appendChild(swatch); item.appendChild(name);
        legendEl.appendChild(item);
      }
    }
  }

  function catmullRomToBezier(pts: string[]): string {
    if (pts.length < 3) return `M ${pts.join(" L ")}`;

    const parsed = pts.map(p => {
      const [x, y] = p.split(",").map(Number);
      return { x: x!, y: y! };
    });

    let d = `M ${parsed[0]!.x} ${parsed[0]!.y}`;

    for (let i = 0; i < parsed.length - 1; i++) {
      const p0 = parsed[Math.max(0, i - 1)]!;
      const p1 = parsed[i]!;
      const p2 = parsed[Math.min(parsed.length - 1, i + 1)]!;
      const p3 = parsed[Math.min(parsed.length - 1, i + 2)]!;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    return d;
  }

  // Brush handling
  if (opts.brushMode !== "none") {
    svg.addEventListener("mousedown", (e) => {
      const rect = svg.getBoundingClientRect();
      const my = e.clientY - rect.top;
      if (my < pad.top! || my > pad.top! + plotH) return;

      // Find nearest axis
      const axisXPositions = dimensions.map((_, i) =>
        pad.left! + (i / (dimensions.length - 1 || 1)) * plotW
      );
      let nearestDi = 0;
      let minDist = Infinity;
      for (let di = 0; di < axisXPositions.length; di++) {
        const dist = Math.abs(e.clientX - rect.left - axisXPositions[di]!);
        if (dist < minDist) { minDist = dist; nearestDi = di; }
      }
      if (minDist > 30) return; // Not near an axis

      const startY = my;

      function onMouseMove(me: MouseEvent): void {
        const rmy = me.clientY - rect.top;
        brushState.set(nearestDi, [startY, rmy]);
        render();
      }

      function onMouseUp(_me: MouseEvent): void {
        svg.removeEventListener("mousemove", onMouseMove);
        svg.removeEventListener("mouseup", onMouseUp);
        applyBrushFilter();
      }

      svg.addEventListener("mousemove", onMouseMove);
      svg.addEventListener("mouseup", onMouseUp);
    });
  }

  function applyBrushFilter(): void {
    if (brushState.size === 0) {
      filteredIndices = data.map((_, i) => i);
      opts.onBrush?.(filteredIndices);
      return;
    }

    filteredIndices = [];
    outer:
    for (let ri = 0; ri < data.length; ri++) {
      for (const [di, [by0, by1]] of brushState.entries()) {
        const dim = dimensions[di]!;
        const rawVal = data[ri]!.values[dim.key];

        // Need position along this axis
        const axisXPositions = dimensions.map((_, i) =>
          pad.left! + (i / (dimensions.length - 1 || 1)) * plotW
        );
        const ax = axisXPositions[di]!;

        // Compute domain and scale
        if (dim.type === "ordinal" || dim.categories) {
          const cats = dim.categories ?? [...new Set(data.map(r => String(r.values[dim.key] ?? "")))];
          const sc = scaleOrdinal(cats, [pad.top! + plotH, pad.top!]);
          const pos = sc(String(rawVal ?? ""));
          const minY = Math.min(by0, by1);
          const maxY = Math.max(by0, by1);
          if (pos < minY || pos > maxY) continue outer;
        } else {
          const vals = data.map(r => Number(r.values[dim.key] ?? 0)).filter(v => !isNaN(v));
          const dMin = dim.domain?.[0] ?? (vals.length > 0 ? Math.min(...vals) : 0);
          const dMax = dim.domain?.[1] ?? (vals.length > 0 ? Math.max(...vals) : 100);
          const p = (dMax - dMin) * 0.06 || 1;
          const sc = scaleLinear([dMin - p, dMax + p], [pad.top! + plotH, pad.top!]);
          const pos = sc(Number(rawVal ?? 0));
          const minY = Math.min(by0, by1);
          const maxY = Math.max(by0, by1);
          if (pos < minY || pos > maxY) continue outer;
        }
      }
      filteredIndices.push(ri);
    }

    opts.onBrush?.(filteredIndices);
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: PCInstance = {
    element: svg,

    setData(newData: PCRow[]) {
      data = newData.map(r => ({ ...r }));
      // Rebuild category colors
      catColorMap.clear();
      let ci = 0;
      for (const row of data) {
        if (row.category && !catColorMap.has(row.category)) {
          catColorMap.set(row.category, opts.colors[ci % opts.colors.length]);
          ci++;
        }
      }
      render();
    },

    setDimensions(dims: PCDimension[]) {
      dimensions = dims.map(d => ({ ...d }));
      brushState.clear();
      render();
    },

    reorderDimensions(keys: string[]) {
      dimensions = keys.map(k => dimensions.find(d => d.key === k)!).filter(Boolean);
      render();
    },

    highlight(ids: string[]) {
      highlightedIds = new Set(ids);
      render();
    },

    clearHighlight() {
      highlightedIds.clear();
      render();
    },

    getFilteredIndices: () => [...filteredIndices],

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
