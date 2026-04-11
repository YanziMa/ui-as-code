/**
 * Sankey Diagram: Flow diagram showing quantity transfers between nodes,
 * with curved link paths, node positioning, color-coded flows,
 * hover highlighting, tooltips, and animated entry.
 */

// --- Types ---

export interface SankeyNode {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Color override */
  color?: string;
  /** Custom data payload */
  data?: unknown;
}

export interface SankeyLink {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Flow value/quantity */
  value: number;
  /** Color override for this link */
  color?: string;
  /** Link label/tooltip text */
  label?: string;
}

export interface SankeyOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Nodes */
  nodes: SankeyNode[];
  /** Links between nodes */
  links: SankeyLink[];
  /** Diagram width (px) */
  width?: number;
  /** Diagram height (px) */
  height?: number;
  /** Node width (px) */
  nodeWidth?: number;
  /** Node padding (px) between nodes in same column */
  nodePadding?: number;
  /** Link curvature (0=straight, 1=very curved) */
  curvature?: number;
  /** Link opacity */
  linkOpacity?: number;
  /** Highlight opacity on hover */
  highlightOpacity?: number;
  /** Dimmed opacity when another link hovered */
  dimmedOpacity?: number;
  /** Default color palette for nodes */
  nodeColors?: string[];
  /** Default color palette for links */
  linkColors?: string[];
  /** Show node labels? */
  showNodeLabels?: boolean;
  /** Show link values? */
  showLinkValues?: boolean;
  /** Show link labels on hover? */
  showLinkLabels?: boolean;
  /** Node label font size (px) */
  nodeLabelSize?: number;
  /** Node border radius (px) */
  nodeRadius?: number;
  /** Animation on mount? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
}

export interface SankeyInstance {
  element: HTMLElement;
  /** Update links */
  setLinks: (links: SankeyLink[]) => void;
  /** Update nodes */
  setNodes: (nodes: SankeyNode[]) => void;
  /** Get current data */
  getNodes: () => SankeyNode[];
  getLinks: () => SankeyLink[];
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_NODE_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#ef4444",
  "#8b5cf6", "#06b6d4", "#84cc16",
];

const DEFAULT_LINK_COLORS = [
  "rgba(99,102,241,0.35)", "rgba(236,72,153,0.35)",
  "rgba(245,158,11,0.35)", "rgba(16,185,129,0.35)",
  "rgba(239,68,68,0.35)", "rgba(139,92,246,0.35)",
];

// --- Helpers ---

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

interface PositionedNode {
  node: SankeyNode;
  x: number;
  y: number;
  height: number;
  column: number;
}

interface PositionedLink {
  link: SankeyLink;
  source: PositionedNode;
  target: PositionedNode;
  dy0: number;
  dy1: number;
}

// --- Layout Algorithm ---

function computeLayout(
  nodes: SankeyNode[],
  links: SankeyLink[],
  width: number,
  height: number,
  nodeW: number,
  nodePad: number
): { positionedNodes: PositionedNode[]; positionedLinks: PositionedLink[] } {
  // Assign columns via BFS from sources
  const nodeMap = new Map<string, { node: SankeyNode; column: number; inputs: Set<string>; outputs: Set<string>; totalIn: number; totalOut: number }>();
  for (const n of nodes) {
    nodeMap.set(n.id, { node: n, column: -1, inputs: new Set(), outputs: new Set(), totalIn: 0, totalOut: 0 });
  }

  for (const l of links) {
    const s = nodeMap.get(l.source);
    const t = nodeMap.get(l.target);
    if (s && t) {
      s.outputs.add(l.target);
      t.inputs.add(l.source);
      s.totalOut += l.value;
      t.totalIn += l.value;
    }
  }

  // BFS to assign columns
  const visited = new Set<string>();
  const queue: string[] = [];
  // Find sources (nodes with no inputs)
  for (const [id, info] of nodeMap) {
    if (info.inputs.size === 0) { info.column = 0; queue.push(id); visited.add(id); }
  }
  // Also handle orphaned nodes
  for (const [id, info] of nodeMap) {
    if (!visited.has(id)) { info.column = 0; queue.push(id); visited.add(id); }
  }

  while (queue.length > 0) {
    const currId = queue.shift()!;
    const currInfo = nodeMap.get(currId)!;
    for (const outId of currInfo.outputs) {
      const outInfo = nodeMap.get(outId)!;
      if (!visited.has(outId)) {
        outInfo.column = currInfo.column + 1;
        visited.add(outId);
        queue.push(outId);
      } else {
        outInfo.column = Math.max(outInfo.column, currInfo.column + 1);
      }
    }
  }

  // Group by column
  const columns: Map<number, string[]> = new Map();
  for (const [id, info] of nodeMap) {
    const col = Math.max(0, info.column);
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col)!.push(id);
  }
  const numCols = columns.size || 1;

  // Column positions
  const colWidth = (width - nodeW) / Math.max(1, numCols - 1 || 1);

  // Calculate node heights based on total flow through each node
  const maxTotal = Math.max(
    ...Array.from(nodeMap.values()).map(info => Math.max(info.totalIn, info.totalOut)),
    1
  );
  const maxNodeHeight = height * 0.75;

  const positionedNodes: PositionedNode[] = [];
  const nodePositions = new Map<string, PositionedNode>();

  for (let col = 0; col < numCols; col++) {
    const colNodes = columns.get(col) ?? [];
    const colHeight = colNodes.reduce((sum, id) => {
      const info = nodeMap.get(id)!;
      return sum + (Math.max(info.totalIn, info.totalOut) / maxTotal) * maxNodeHeight;
    }, 0) + (colNodes.length - 1) * nodePad;

    let cursorY = (height - colHeight) / 2;
    for (const id of colNodes) {
      const info = nodeMap.get(id)!;
      const h = (Math.max(info.totalIn, info.totalOut) / maxTotal) * maxNodeHeight;
      const x = numCols > 1 ? col * colWidth : (width - nodeW) / 2;
      const pn: PositionedNode = { node: info.node, x, y: cursorY, height: Math.max(h, 16), column: col };
      positionedNodes.push(pn);
      nodePositions.set(id, pn);
      cursorY += h + nodePad;
    }
  }

  // Position links within source/target nodes
  const positionedLinks: PositionedLink[] = [];
  for (const link of links) {
    const src = nodePositions.get(link.source);
    const tgt = nodePositions.get(link.target);
    if (!src || !tgt) continue;

    // Simple vertical distribution within each node's height
    positionedLinks.push({
      link,
      source: src,
      target: tgt,
      dy0: src.height / 2,
      dy1: tgt.height / 2,
    });
  }

  return { positionedNodes, positionedLinks };
}

// --- Main Factory ---

export function createSankey(options: SankeyOptions): SankeyInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 400,
    nodeWidth: options.nodeWidth ?? 16,
    nodePadding: options.nodePadding ?? 12,
    curvature: options.curvature ?? 0.5,
    linkOpacity: options.linkOpacity ?? 0.4,
    highlightOpacity: options.highlightOpacity ?? 0.65,
    dimmedOpacity: options.dimmedOpacity ?? 0.08,
    nodeColors: options.nodeColors ?? DEFAULT_NODE_COLORS,
    linkColors: options.linkColors ?? DEFAULT_LINK_COLORS,
    showNodeLabels: options.showNodeLabels ?? true,
    showLinkValues: options.showLinkValues ?? false,
    showLinkLabels: options.showLinkLabels ?? true,
    nodeLabelSize: options.nodeLabelSize ?? 11,
    nodeRadius: options.nodeRadius ?? 4,
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 800,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Sankey: container not found");

  let nodes = [...options.nodes];
  let links = [...options.links];
  let destroyed = false;

  const ns = "http://www.w3.org/2000/svg";

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `sankey-diagram ${opts.className}`;
  wrapper.style.cssText = `display:inline-block;font-family:-apple-system,sans-serif;position:relative;`;
  container.appendChild(wrapper);

  // SVG
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;overflow:visible;`;
  wrapper.appendChild(svg);

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.style.cssText = `
        position:absolute;z-index:100;padding:8px 14px;border-radius:8px;
        background:#1f2937;color:#fff;font-size:11px;pointer-events:none;
        white-space:nowrap;opacity:0;transition:opacity 0.15s;
        box-shadow:0 4px 12px rgba(0,0,0,0.15);
      `;
      wrapper.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Rendering ---

  function render(progress = 1): void {
    svg.innerHTML = "";

    if (nodes.length === 0) return;

    const layout = computeLayout(nodes, links, opts.width, opts.height, opts.nodeWidth, opts.nodePadding);

    // Draw links first (behind nodes)
    for (let i = 0; i < layout.positionedLinks.length; i++) {
      const plink = layout.positionedLinks[i]!;
      const color = plink.link.color ?? opts.linkColors[i % opts.linkColors.length];

      const sx = plink.source.x + opts.nodeWidth;
      const sy = plink.source.y + plink.dy0;
      const tx = plink.target.x;
      const ty = plink.target.y + plink.dy1;
      const midX = sx + (tx - sx) * opts.curvature;

      const path = document.createElementNS(ns, "path");
      path.setAttribute("class", "sk-link");
      path.setAttribute("d", `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", String(Math.max(1, plink.link.value / Math.max(...links.map(l => l.value), 1) * 30)));
      path.style.opacity = String(opts.linkOpacity * progress);
      path.style.transition = "opacity 0.2s";
      path.dataset.linkIndex = String(i);

      path.addEventListener("mouseenter", () => {
        // Dim all other links
        svg.querySelectorAll<SVGPathElement>(".sk-link").forEach((l, j) => {
          l.style.opacity = j === i ? String(opts.highlightOpacity) : String(opts.dimmedOpacity);
        });
        showLinkTooltip(plink);
      });

      path.addEventListener("mouseleave", () => {
        svg.querySelectorAll<SVGPathElement>(".sk-link").forEach(l => {
          l.style.opacity = String(opts.linkOpacity);
        });
        hideTooltip();
      });

      svg.appendChild(path);
    }

    // Draw nodes
    for (let i = 0; i < layout.positionedNodes.length; i++) {
      const pn = layout.positionedNodes[i]!;
      const color = pn.node.color ?? opts.nodeColors[i % opts.nodeColors.length];

      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("class", "sk-node");
      rect.setAttribute("x", String(pn.x));
      rect.setAttribute("y", String(pn.y));
      rect.setAttribute("width", String(opts.nodeWidth));
      rect.setAttribute("height", String(pn.height));
      rect.setAttribute("rx", String(opts.nodeRadius));
      rect.setAttribute("ry", String(opts.nodeRadius));
      rect.setAttribute("fill", color);
      rect.style.opacity = String(progress);
      svg.appendChild(rect);

      // Node label
      if (opts.showNodeLabels) {
        const label = document.createElementNS(ns, "text");
        label.setAttribute("x", String(pn.x + opts.nodeWidth + 6));
        label.setAttribute("y", String(pn.y + pn.height / 2));
        label.setAttribute("dominant-baseline", "central");
        label.style.cssText = `font-size:${opts.nodeLabelSize}px;font-weight:500;fill:#374151;`;
        label.textContent = pn.node.name;
        label.style.opacity = String(progress);
        svg.appendChild(label);
      }
    }
  }

  function showLinkTooltip(plink: PositionedLink): void {
    if (!opts.showLinkLabels) return;
    const tt = getTooltip();
    const total = links.reduce((s, l) => s + l.value, 0);
    const pct = total > 0 ? ((plink.link.value / total) * 100).toFixed(1) : "0";
    tt.textContent = plink.link.label ?? `${plink.source.node.name} \u2192 ${plink.target.node.name}: ${plink.link.value.toLocaleString()} (${pct}%)`;
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
      render(easeOutCubic(t));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  } else {
    render(1);
  }

  // --- Instance ---

  const instance: SankeyInstance = {
    element: wrapper,

    getNodes() { return [...nodes]; },
    getLinks() { return [...links]; },

    setNodes(newNodes: SankeyNode[]) {
      nodes = [...newNodes];
      render(1);
    },

    setLinks(newLinks: SankeyLink[]) {
      links = [...newLinks];
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
