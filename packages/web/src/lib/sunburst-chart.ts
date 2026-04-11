/**
 * Sunburst Chart: Hierarchical sunburst/pie chart with multi-level zoom,
 * color scales, interactive segments, breadcrumb navigation, animations,
 * and customizable ring configurations.
 */

// --- Types ---

export interface SunburstNode {
  name: string;
  value: number;
  children?: SunburstNode[];
  color?: string;
  id?: string;
}

export interface SunburstOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Hierarchical data */
  data: SunburstNode;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Inner radius ratio (0-1) */
  innerRadius?: number;
  /** Color scale ("category10" | "tableau10" | "warm" | "cool" | "sequential" | custom) */
  colorScale?: string | ((node: SunburstNode, depth: number) => string);
  /** Show center label? */
  showCenterLabel?: boolean;
  /** Center label formatter */
  centerLabelFormatter?: (node: SunburstNode) => string;
  /** Show legend? */
  showLegend?: boolean;
  /** Legend position ("right" | "bottom") */
  legendPosition?: string;
  /** Max visible levels */
  maxLevels?: number;
  /** Ring padding (degrees) */
  ringPadding?: number;
  /** Segment padding (degrees) */
  segmentPadding?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Show percentage labels? */
  showPercentages?: boolean;
  /** Show values on hover? */
  showValuesOnHover?: boolean;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Click to zoom? */
  zoomOnClick?: boolean;
  /** Breadcrumb navigation? */
  showBreadcrumb?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Segment click callback */
  onSegmentClick?: (node: SunburstNode, event: MouseEvent) => void;
  /** Segment hover callback */
  onSegmentHover?: (node: SunburstNode | null, event: MouseEvent) => void;
}

export interface SunburstInstance {
  element: SVGElement;
  /** Zoom to a specific node */
  zoomTo: (nodeId: string) => void;
  /** Reset zoom to root */
  resetZoom: () => void;
  /** Update data */
  setData: (data: SunburstNode) => void;
  /** Highlight a segment by id */
  highlight: (nodeId: string) => void;
  /** Clear highlight */
  clearHighlight: () => void;
  /** Get current root node */
  getCurrentRoot: () => SunburstNode;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Color Scales ---

const CATEGORY10 = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

const TABLEAU10 = [
  "#4c78a8", "#f58518", "#e45756", "#72b7b2", "#54a24b",
  "#eeca3b", "#b279a2", "#ff9da6", "#9d755d", "#bab0ac",
];

const WARM = ["#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04"];
const COOL = ["#edf8fb", "#b2e2e2", "#66c2a4", "#2ca25d", "#006d2c"];

function getColor(scale: string | ((node: SunburstNode, depth: number) => string), node: SunburstNode, depth: number, index: number): string {
  if (typeof scale === "function") return scale(node, depth);
  switch (scale) {
    case "tableau10": return TABLEAU10[index % TABLEAU10.length];
    case "warm": return WARM[Math.min(depth, WARM.length - 1)];
    case "cool": return COOL[Math.min(depth, COOL.length - 1)];
    case "sequential": {
      const hue = 220 - depth * 30;
      return `hsl(${hue}, 70%, ${55 + (index % 3) * 10}%)`;
    }
    default: return CATEGORY10[index % CATEGORY10.length];
  }
}

// --- Math Helpers ---

interface ArcData {
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  node: SunburstNode;
  depth: number;
  index: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function describeArc(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number): string {
  const diff = endAngle - startAngle;
  if (diff < 0.001) return "";

  const [x1, y1] = polarToCartesian(cx, cy, outerR, startAngle);
  const [x2, y2] = polarToCartesian(cx, cy, outerR, endAngle);
  const [x3, y3] = polarToCartesian(cx, cy, innerR, endAngle);
  const [x4, y4] = polarToCartesian(cx, cy, innerR, startAngle);

  const largeArc = diff > 180 ? 1 : 0;

  let d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`;

  if (innerR > 0) {
    d += ` L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  } else {
    d += ` L ${cx} ${cy} Z`;
  }

  return d;
}

function computeArcs(
  node: SunburstNode,
  startAngle: number,
  endAngle: number,
  innerR: number,
  outerR: number,
  depth: number,
  result: ArcData[],
  opts: Required<Pick<SunburstOptions, "ringPadding" | "segmentPadding">>,
  maxDepth: number,
  indexOffset: number,
): number {
  const totalValue = sumValues(node);
  if (totalValue <= 0 || depth > maxDepth) return indexOffset;

  let angleCursor = startAngle;
  const children = node.children ?? [];
  let idx = indexOffset;

  for (let i = 0; i < children.length; i++) {
    const child = children[i]!;
    const fraction = child.value / totalValue;
    const segAngle = fraction * (endAngle - startAngle);

    if (segAngle < 0.05) { idx++; continue; }

    const padAngle = opts.segmentPadding / 2;
    const sAngle = angleCursor + padAngle;
    const eAngle = angleCursor + segAngle - padAngle;

    // Self arc
    result.push({
      startAngle: sAngle,
      endAngle: eAngle,
      innerRadius: innerR,
      outerRadius: outerR,
      node: child,
      depth,
      index: idx,
    });

    // Recurse into children
    const nextInner = outerR + (opts.ringPadding / 2);
    const nextOuter = nextInner + (outerR - innerR) * 0.85;
    if (child.children && child.children.length > 0 && depth < maxDepth) {
      idx = computeArcs(child, sAngle, eAngle, nextInner, nextOuter, depth + 1, result, opts, maxDepth, idx);
    }
    idx++;

    angleCursor += segAngle;
  }

  return idx;
}

function sumValues(node: SunburstNode): number {
  if (!node.children || node.children.length === 0) return node.value;
  return node.children.reduce((s, c) => s + sumValues(c), 0);
}

// --- Main Factory ---

export function createSunburstChart(options: SunburstOptions): SunburstInstance {
  const opts = {
    width: options.width ?? 500,
    height: options.height ?? 500,
    innerRadius: options.innerRadius ?? 0.15,
    colorScale: options.colorScale ?? "category10",
    showCenterLabel: options.showCenterLabel ?? true,
    centerLabelFormatter: options.centerLabelFormatter ?? ((n) => n.name),
    showLegend: options.showLegend ?? true,
    legendPosition: options.legendPosition ?? "right",
    maxLevels: options.maxLevels ?? 5,
    ringPadding: options.ringPadding ?? 1,
    segmentPadding: options.segmentPadding ?? 0.5,
    animationDuration: options.animationDuration ?? 400,
    showPercentages: options.showPercentages ?? false,
    showValuesOnHover: options.showValuesOnHover ?? true,
    tooltip: options.tooltip ?? true,
    zoomOnClick: options.zoomOnClick ?? true,
    showBreadcrumb: options.showBreadcrumb ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SunburstChart: container not found");

  let data = { ...options.data };
  let destroyed = false;
  let currentRoot: SunburstNode = data;
  let highlightedId: string | null = null;
  let hoveredNode: SunburstNode | null = null;

  const cx = opts.width / 2;
  const cy = opts.height / 2;
  const maxR = Math.min(opts.width, opts.height) / 2 - 10;
  const innerR = maxR * opts.innerRadius;

  // Root SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `sunburst-chart ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;overflow:visible;`;

  // Defs
  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  // Shadow filter
  const shadowFilter = document.createElementNS(ns, "filter");
  shadowFilter.id = "sunburst-shadow";
  shadowFilter.innerHTML = `<feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>`;
  defs.appendChild(shadowFilter);

  // Main group
  const gMain = document.createElementNS(ns, "g");
  gMain.setAttribute("transform", `translate(${cx}, ${cy})`);
  svg.appendChild(gMain);

  // Tooltip group
  const gTooltip = document.createElementNS(ns, "g");
  gTooltip.style.display = "none";
  gTooltip.style.pointerEvents = "none";
  svg.appendChild(gTooltip);

  const tooltipBg = document.createElementNS(ns, "rect");
  tooltipBg.setAttribute("rx", "6");
  tooltipBg.setAttribute("fill", "#1f2937");
  tooltipBg.setAttribute("opacity", "0.92");
  gTooltip.appendChild(tooltipBg);

  const tooltipText = document.createElementNS(ns, "text");
  tooltipText.setAttribute("fill", "#fff");
  tooltipText.setAttribute("font-size", "12");
  tooltipText.setAttribute("font-family", "-apple-system, sans-serif");
  gTooltip.appendChild(tooltipText);

  // Breadcrumb
  let breadcrumbEl: HTMLElement | null = null;
  if (opts.showBreadcrumb) {
    breadcrumbEl = document.createElement("div");
    breadcrumbEl.style.cssText = `
      display:flex;align-items:center;gap:4px;padding:6px 12px;
      font-size:12px;color:#6b7280;font-family:-apple-system,sans-serif;
      flex-wrap:wrap;
    `;
    container.appendChild(breadcrumbEl);
  }

  // Legend
  let legendEl: HTMLElement | null = null;
  if (opts.showLegend) {
    legendEl = document.createElement("div");
    legendEl.style.cssText = `
      display:flex;flex-direction:${opts.legendPosition === "bottom" ? "row" : "column"};
      gap:6px;padding:8px;font-size:11px;font-family:-apple-system,sans-serif;
      ${opts.legendPosition === "right" ? "position:absolute;top:0;right:0;" : ""}
    `;
    container.appendChild(legendEl);
  }

  container.appendChild(svg);

  // --- Rendering ---

  function render(): void {
    gMain.innerHTML = "";
    if (legendEl) legendEl.innerHTML = "";
    if (breadcrumbEl) renderBreadcrumb();

    const totalVal = sumValues(currentRoot);
    if (totalVal <= 0) {
      const emptyText = document.createElementNS(ns, "text");
      emptyText.setAttribute("text-anchor", "middle");
      emptyText.setAttribute("dy", "5");
      emptyText.setAttribute("fill", "#9ca3af");
      emptyText.setAttribute("font-size", "14");
      emptyText.textContent = "No data";
      gMain.appendChild(emptyText);
      return;
    }

    const arcs: ArcData[] = [];
    computeArcs(currentRoot, 0, 360, innerR, maxR, 0, arcs, opts, opts.maxLevels, 0);

    // Draw arcs
    for (const arc of arcs) {
      const isHighlighted = highlightedId && (arc.node.id === highlightedId || isDescendant(currentRoot, arc.node, highlightedId));
      const isDimmed = highlightedId && !isHighlighted;

      const path = document.createElementNS(ns, "path");
      const color = arc.node.color ?? getColor(opts.colorScale, arc.node, arc.depth, arc.index);
      const d = describeArc(0, 0, arc.innerRadius, arc.outerRadius, arc.startAngle, arc.endAngle);

      path.setAttribute("d", d);
      path.setAttribute("fill", color);
      path.setAttribute("stroke", "#fff");
      path.setAttribute("stroke-width", "1");
      path.style.cursor = "pointer";
      path.style.transition = `opacity ${opts.animationDuration}ms ease, transform ${opts.animationDuration}ms ease`;
      path.style.opacity = isDimmed ? "0.25" : "1";
      if (isHighlighted) {
        path.style.filter = "url(#sunburst-shadow)";
        path.setAttribute("transform", "scale(1.02)");
        path.setAttribute("transform-origin", "0 0");
      }

      path.dataset.nodeId = arc.node.id ?? arc.node.name;

      // Hover
      path.addEventListener("mouseenter", (e) => {
        hoveredNode = arc.node;
        path.setAttribute("opacity", "0.85");
        showTooltip(e, arc.node, arc);
        opts.onSegmentHover?.(arc.node, e);
      });

      path.addEventListener("mouseleave", () => {
        hoveredNode = null;
        path.removeAttribute("opacity");
        hideTooltip();
        opts.onSegmentHover?.(null, new MouseEvent("mouseleave"));
      });

      // Click
      path.addEventListener("click", (e) => {
        if (opts.zoomOnClick && arc.node.children && arc.node.children.length > 0) {
          zoomToNode(arc.node);
        }
        opts.onSegmentClick?.(arc.node, e);
      });

      gMain.appendChild(path);

      // Percentage labels
      if (opts.showPercentages && (arc.endAngle - arc.startAngle) > 15) {
        const midAngle = (arc.startAngle + arc.endAngle) / 2;
        const midR = (arc.innerRadius + arc.outerRadius) / 2;
        const [lx, ly] = polarToCartesian(0, 0, midR, midAngle);
        const pct = ((arc.node.value / totalVal) * 100).toFixed(1);

        const label = document.createElementNS(ns, "text");
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("dominant-baseline", "middle");
        label.setAttribute("fill", "#fff");
        label.setAttribute("font-size", "10");
        label.setAttribute("font-weight", "600");
        label.setAttribute("pointer-events", "none");
        label.textContent = `${pct}%`;
        label.setAttribute("transform", `translate(${lx}, ${ly})`);
        gMain.appendChild(label);
      }
    }

    // Center label
    if (opts.showCenterLabel) {
      const centerGroup = document.createElementNS(ns, "g");

      const centerCircle = document.createElementNS(ns, "circle");
      centerCircle.setAttribute("r", String(innerR * 0.95));
      centerCircle.setAttribute("fill", "#fff");
      centerGroup.appendChild(centerCircle);

      const centerTxt = document.createElementNS(ns, "text");
      centerTxt.setAttribute("text-anchor", "middle");
      centerTxt.setAttribute("dominant-baseline", "middle");
      centerTxt.setAttribute("fill", "#374151");
      centerTxt.setAttribute("font-size", "13");
      centerTxt.setAttribute("font-weight", "600");
      centerTxt.textContent = opts.centerLabelFormatter(currentRoot);
      centerGroup.appendChild(centerTxt);

      const valTxt = document.createElementNS(ns, "text");
      valTxt.setAttribute("text-anchor", "middle");
      valTxt.setAttribute("dominant-baseline", "middle");
      valTxt.setAttribute("dy", "16");
      valTxt.setAttribute("fill", "#6b7280");
      valTxt.setAttribute("font-size", "11");
      valTxt.textContent = formatValue(totalVal);
      centerGroup.appendChild(valTxt);

      gMain.appendChild(centerGroup);
    }

    // Legend
    if (legendEl && currentRoot.children) {
      for (let i = 0; i < currentRoot.children.length; i++) {
        const child = currentRoot.children[i]!;
        const item = document.createElement("div");
        item.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;";
        item.addEventListener("click", () => {
          if (child.children && child.children.length > 0) zoomToNode(child);
        });

        const swatch = document.createElement("span");
        swatch.style.cssText = `width:12px;height:12px;border-radius:2px;background:${child.color ?? getColor(opts.colorScale, child, 0, i)};flex-shrink:0;`;

        const name = document.createElement("span");
        name.textContent = child.name;
        name.style.color = "#374151";

        const val = document.createElement("span");
        val.textContent = formatValue(child.value);
        val.style.color = "#9ca3af";
        val.style.marginLeft = "auto";

        item.appendChild(swatch);
        item.appendChild(name);
        item.appendChild(val);
        legendEl.appendChild(item);
      }
    }
  }

  function renderBreadcrumb(): void {
    if (!breadcrumbEl || !currentRoot) return;
    breadcrumbEl.innerHTML = "";

    const path: SunburstNode[] = [];
    function findPath(node: SunburstNode, target: SunburstNode, acc: SunburstNode[]): boolean {
      acc.push(node);
      if (node === target || node.id === target.id) return true;
      if (node.children) {
        for (const c of node.children) {
          if (findPath(c, target, [...acc])) return true;
        }
      }
      return false;
    }
    findPath(data, currentRoot, path);

    for (let i = 0; i < path.length; i++) {
      const n = path[i]!;
      if (i > 0) {
        const sep = document.createElement("span");
        sep.textContent = "\u203A";
        sep.style.color = "#d1d5db";
        sep.style.fontSize = "10px";
        breadcrumbEl!.appendChild(sep);
      }
      const crumb = document.createElement("button");
      crumb.type = "button";
      crumb.textContent = n.name;
      crumb.style.cssText = `
        background:none;border:none;color:#6366f1;cursor:pointer;
        font-size:12px;padding:2px 4px;border-radius:4px;
        font-family:inherit;
      `;
      crumb.addEventListener("mouseenter", () => { crumb.style.background = "#eef2ff"; });
      crumb.addEventListener("mouseleave", () => { crumb.style.background = ""; });
      crumb.addEventListener("click", () => { currentRoot = n; render(); });
      breadcrumbEl!.appendChild(crumb);
    }
  }

  function showTooltip(e: MouseEvent, node: SunburstNode, arc: ArcData): void {
    if (!opts.tooltip) return;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const totalVal = sumValues(currentRoot);
    const pct = ((node.value / totalVal) * 100).toFixed(1);
    const text = `${node.name}: ${formatValue(node.value)} (${pct}%)`;

    tooltipText.textContent = text;
    gTooltip.style.display = "block";

    requestAnimationFrame(() => {
      const tbb = tooltipText.getBBox();
      const pad = 8;
      tooltipBg.setAttribute("x", String(mx - tbb.width / 2 - pad));
      tooltipBg.setAttribute("y", String(my - tbb.height / 2 - pad - 20));
      tooltipBg.setAttribute("width", String(tbb.width + pad * 2));
      tooltipBg.setAttribute("height", String(tbb.height + pad * 2));
      tooltipText.setAttribute("x", String(mx - tbb.width / 2));
      tooltipText.setAttribute("y", String(my - tbb.height / 2 - 20 + tbb.height / 2 + 4));
    });
  }

  function hideTooltip(): void {
    gTooltip.style.display = "none";
  }

  function zoomToNode(node: SunburstNode): void {
    currentRoot = node;
    highlightedId = null;
    render();
  }

  function isDescendant(root: SunburstNode, node: SunburstNode, targetId: string): boolean {
    if (node.id === targetId) return true;
    if (node.children) {
      for (const c of node.children) {
        if (isDescendant(root, c, targetId)) return true;
      }
    }
    return false;
  }

  function formatValue(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toFixed(0);
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: SunburstInstance = {
    element: svg,

    zoomTo(nodeId: string) {
      function find(n: SunburstNode): SunburstNode | null {
        if (n.id === nodeId) return n;
        if (n.children) for (const c of n.children) { const f = find(c); if (f) return f; }
        return null;
      }
      const found = find(data);
      if (found) zoomToNode(found);
    },

    resetZoom() {
      currentRoot = data;
      highlightedId = null;
      render();
    },

    setData(newData: SunburstNode) {
      data = newData;
      currentRoot = newData;
      highlightedId = null;
      render();
    },

    highlight(nodeId: string) {
      highlightedId = nodeId;
      render();
    },

    clearHighlight() {
      highlightedId = null;
      render();
    },

    getCurrentRoot: () => currentRoot,

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      svg.remove();
      breadcrumbEl?.remove();
      legendEl?.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
