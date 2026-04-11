/**
 * Chord Diagram: Circular chord diagram for showing relationships/flows
 * between entities, with ribbon arcs, hover highlighting, tooltips,
 * color-coded categories, and interactive navigation.
 */

// --- Types ---

export interface ChordNode {
  id: string;
  name: string;
  color?: string;
}

export interface ChordLink {
  source: string; // node ID
  target: string; // node ID
  value: number;
  color?: string; // override
}

export interface ChordDiagramOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Nodes (entities around the circle) */
  nodes: ChordNode[];
  /** Links/flows between nodes */
  links: ChordLink[];
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Inner radius ratio (0-1 of outer) */
  innerRadius?: number;
  /** Pad angle between groups (degrees) */
  padAngle?: number;
  /** Ribbon opacity (default fades on hover of others) */
  ribbonOpacity?: number;
  /** Highlighted ribbon opacity */
  highlightOpacity?: number;
  /** Show labels? */
  showLabels?: boolean;
  /** Label position ("outside" | "inside" | "rotated") */
  labelPosition?: string;
  /** Show tick marks on arcs? */
  showTicks?: boolean;
  /** Color palette (used if node.color not set) */
  colors?: string[];
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Hover callback (node ID or null) */
  onHover?: (nodeId: string | null) => void;
  /** Click callback */
  onClick?: (nodeId: string, event: MouseEvent) => void;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
}

export interface ChordInstance {
  element: SVGElement;
  /** Update data */
  setData: (nodes: ChordNode[], links: ChordLink[]) => void;
  /** Highlight a node (dim others) */
  highlightNode: (nodeId: string) => void;
  /** Clear highlight */
  clearHighlight: () => void;
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Math Helpers ---

function polarToCartesian(cx: number, cy: number, r: number, a: number): [number, number] {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

const TWO_PI = Math.PI * 2;

function describeArc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const [x0, y0] = polarToCartesian(cx, cy, r, a0);
  const [x1, y1] = polarToCartesian(cx, cy, r, a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

// --- Default Colors ---

const DEFAULT_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

// --- Main Factory ---

export function createChordDiagram(options: ChordDiagramOptions): ChordInstance {
  const opts = {
    width: options.width ?? 500,
    height: options.height ?? 500,
    innerRadius: options.innerRadius ?? 0.55,
    padAngle: options.padAngle ?? 0.03,
    ribbonOpacity: options.ribbonOpacity ?? 0.6,
    highlightOpacity: options.highlightOpacity ?? 0.9,
    showLabels: options.showLabels ?? true,
    labelPosition: options.labelPosition ?? "outside",
    showTicks: options.showTicks ?? false,
    colors: options.colors ?? DEFAULT_COLORS,
    tooltip: options.tooltip ?? true,
    animationDuration: options.animationDuration ?? 600,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ChordDiagram: container not found");

  let nodes: ChordNode[] = JSON.parse(JSON.stringify(options.nodes));
  let links: ChordLink[] = JSON.parse(JSON.stringify(options.links));
  let highlightedNode: string | null = null;
  let destroyed = false;

  const cx = opts.width / 2;
  const cy = opts.height / 2;
  const outerR = Math.min(opts.width, opts.height) / 2 - 20;
  const innerR = outerR * opts.innerRadius;

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `chord-diagram ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;overflow:visible;font-family:-apple-system,sans-serif;`;

  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  // Shadow filter for highlights
  const shadow = document.createElementNS(ns, "filter");
  shadow.id = "chord-shadow";
  shadow.innerHTML = `<feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.2"/>`;
  defs.appendChild(shadow);

  const gRibbons = document.createElementNS(ns, "g");
  svg.appendChild(gRibbons);

  const gArcs = document.createElementNS(ns, "g");
  svg.appendChild(gArcs);

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
  ttBg.setAttribute("opacity", "0.92");
  gTooltip.appendChild(ttBg);

  const ttText = document.createElementNS(ns, "text");
  ttText.setAttribute("fill", "#fff");
  ttText.setAttribute("font-size", "11");
  gTooltip.appendChild(ttText);

  container.appendChild(svg);

  // --- Layout Computation ---

  function computeLayout(): {
    nodeAngles: Array<{ start: number; end: number; mid: number; node: ChordNode; color: string }>;
    totalValue: number;
  } {
    // Sum outgoing values per node
    const sums: Record<string, number> = {};
    for (const n of nodes) sums[n.id] = 0;
    for (const l of links) {
      if (!sums[l.source]) sums[l.source] = 0;
      sums[l.source] += l.value;
    }

    let total = 0;
    for (const v of Object.values(sums)) total += v;
    if (total === 0) total = 1;

    const padRad = opts.padAngle;

    const result: typeof computeLayout extends (...args: any) => any ? ReturnType<typeof computeLayout> : never =
      [] as any;

    let cursor = -Math.PI / 2; // Start from top

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!;
      const frac = (sums[n.id] ?? 0) / total;
      const span = Math.max(frac * TWO_PI - padRad, 0.01);
      const start = cursor;
      const end = cursor + span;
      const mid = (start + end) / 2;
      const color = n.color ?? opts.colors[i % opts.colors.length];

      result.push({ start, end, mid, node: n, color });
      cursor = end + padRad;
    }

    return { nodeAngles: result, totalValue: total };
  }

  // --- Rendering ---

  function render(): void {
    gRibbons.innerHTML = "";
    gArcs.innerHTML = "";
    gLabels.innerHTML = "";

    if (nodes.length === 0) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(cx)); empty.setAttribute("y", String(cy));
      empty.setAttribute("text-anchor", "middle"); empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gArcs.appendChild(empty);
      return;
    }

    const { nodeAngles } = computeLayout();

    // Draw ribbons first (behind arcs)
    for (const link of links) {
      const srcIdx = nodeAngles.findIndex(a => a.node.id === link.source);
      const tgtIdx = nodeAngles.findIndex(a => a.node.id === link.target);
      if (srcIdx < 0 || tgtIdx < 0) continue;

      const sa = nodeAngles[srcIdx]!;
      const ta = nodeAngles[tgtIdx]!;
      const isHighlighted = !highlightedNode ||
        highlightedNode === link.source || highlightedNode === link.target;
      const opacity = isHighlighted ? opts.highlightOpacity : opts.ribbonOpacity * 0.3;

      // Compute ribbon path
      const srcFrac = link.value / (opts.innerRadius * 10); // approximate
      const tgtFrac = link.value / (opts.innerRadius * 10);
      const srcSpan = (sa.end - sa.start) * Math.min(srcFrac, 0.8);
      const tgtSpan = (ta.end - ta.start) * Math.min(tgtFrac, 0.8);

      const s0 = sa.mid - srcSpan / 2;
      const s1 = sa.mid + srcSpan / 2;
      const t0 = ta.mid - tgtSpan / 2;
      const t1 = ta.mid + tgtSpan / 2;

      const ribbonColor = link.color ?? sa.color;

      // Ribbon as filled path
      const [os0x, os0y] = polarToCartesian(cx, cy, outerR, s0);
      const [os1x, os1y] = polarToCartesian(cx, cy, outerR, s1);
      const [is0x, is0y] = polarToCartesian(cx, cy, innerR, s0);
      const [is1x, is1y] = polarToCartesian(cx, cy, innerR, s1);
      const [it0x, it0y] = polarToCartesian(cx, cy, innerR, t0);
      const [it1x, it1y] = polarToCartesian(cx, cy, innerR, t1);
      const [ot0x, ot0y] = polarToCartesian(cx, cy, outerR, t0);
      const [ot1x, ot1y] = polarToCartesian(cx, cy, outerR, t1);

      const d = `M ${os0x} ${os0y}
        A ${outerR} ${outerR} 0 0 1 ${os1x} ${os1y}
        L ${is1x} ${is1y}
        A ${innerR} ${innerR} 0 0 0 ${is0x} ${is0y}
        Z
        M ${it0x} ${it0y}
        A ${innerR} ${innerR} 0 0 0 ${it1x} ${it1y}
        L ${ot1x} ${ot1y}
        A ${outerR} ${outerR} 0 0 1 ${ot0x} ${ot0y}
        Z`;

      const ribbon = document.createElementNS(ns, "path");
      ribbon.setAttribute("d", d);
      ribbon.setAttribute("fill", ribbonColor);
      ribbon.setAttribute("fill-opacity", String(opacity));
      ribbon.style.cursor = "pointer";
      ribbon.style.transition = `opacity ${opts.animationDuration}ms ease`;
      gRibbons.appendChild(ribbon);
    }

    // Draw arc segments (group boundaries)
    for (let i = 0; i < nodeAngles.length; i++) {
      const a = nodeAngles[i]!;
      const isHighlighted = !highlightedNode || highlightedNode === a.node.id;

      // Outer arc
      const arcPath = document.createElementNS(ns, "path");
      arcPath.setAttribute("d", describeArc(cx, cy, outerR, a.start, a.end));
      arcPath.setAttribute("fill", a.color);
      arcPath.setAttribute("opacity", String(isHighlighted ? 1 : 0.3));
      arcPath.style.cursor = "pointer";
      arcPath.style.transition = `opacity ${opts.animationDuration}ms ease`;

      if (highlightedNode === a.node.id) {
        arcPath.setAttribute("filter", "url(#chord-shadow)");
      }

      arcPath.addEventListener("mouseenter", () => {
        highlightNode = a.node.id;
        render();
        showTooltip(a.node);
        opts.onHover?.(a.node.id);
      });
      arcPath.addEventListener("mouseleave", () => {
        if (highlightedNode === a.node.id) {
          highlightNode = null;
          render();
        }
        hideTooltip();
        opts.onHover?.(null);
      });
      arcPath.addEventListener("click", (e) => opts.onClick?.(a.node.id, e));

      gArcs.appendChild(arcPath);

      // Ticks
      if (opts.showTicks) {
        const tickCount = Math.max(3, Math.floor((a.end - a.start) / 0.08));
        for (let t = 0; t <= tickCount; t++) {
          const angle = a.start + ((a.end - a.start) * t) / tickCount;
          const [tx, ty] = polarToCartesian(cx, cy, outerR + 4, angle);
          const [tx2, ty2] = polarToCartesian(cx, cy, outerR + 8, angle);
          const tk = document.createElementNS(ns, "line");
          tk.setAttribute("x1", String(tx)); tk.setAttribute("y1", String(ty));
          tk.setAttribute("x2", String(tx2)); tk.setAttribute("y2", String(ty2));
          tk.setAttribute("stroke", a.color); tk.setAttribute("stroke-width", "1");
          gArcs.appendChild(tk);
        }
      }

      // Labels
      if (opts.showLabels) {
        const labelR = opts.labelPosition === "inside" ? (innerR + outerR) / 2 : outerR + 18;
        const [lx, ly] = polarToCartesian(cx, cy, labelR, a.mid);

        const lbl = document.createElementNS(ns, "text");
        lbl.setAttribute("x", String(lx)); lbl.setAttribute("y", String(ly));
        if (opts.labelPosition === "rotated") {
          const rotDeg = ((a.mid * 180) / Math.PI + 90);
          const rotFlip = Math.abs(rotDeg) > 90 ? 180 : 0;
          lbl.setAttribute("transform", `rotate(${rotDeg + rotFlip}, ${lx}, ${ly})`);
          lbl.setAttribute("text-anchor", "middle");
        } else {
          lbl.setAttribute("text-anchor", "middle");
        }
        lbl.setAttribute("dominant-baseline", "middle");
        lbl.setAttribute("fill", "#374151");
        lbl.setAttribute("font-size", "11");
        lbl.setAttribute("font-weight", "500");
        lbl.setAttribute("pointer-events", "none");
        lbl.textContent = a.node.name;
        gLabels.appendChild(lbl);
      }
    }
  }

  function showTooltip(node: ChordNode): void {
    if (!opts.tooltip) return;
    const relatedLinks = links.filter(l => l.source === node.id || l.target === node.id);
    const totalIn = relatedLinks.filter(l => l.target === node.id).reduce((s, l) => s + l.value, 0);
    const totalOut = relatedLinks.filter(l => l.source === node.id).reduce((s, l) => s + l.value, 0);

    ttText.textContent = `${node.name}${totalIn > 0 ? `\nIn: ${totalIn}` : ""}${totalOut > 0 ? `\nOut: ${totalOut}` : ""}`;
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
      gTooltip.setAttribute("transform", `translate(${cx}, ${cy - outerR - 30})`);
    });
  }

  function hideTooltip(): void {
    gTooltip.style.display = "none";
  }

  // Initial render
  render();

  // --- Public API ---

  const instance: ChordInstance = {
    element: svg,

    setData(newNodes: ChordNode[], newLinks: ChordLink[]) {
      nodes = newNodes.map(n => ({ ...n }));
      links = newLinks.map(l => ({ ...l }));
      highlightedNode = null;
      render();
    },

    highlightNode(nodeId: string) {
      highlightedNode = nodeId;
      render();
    },

    clearHighlight() {
      highlightedNode = null;
      render();
    },

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      svg.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
