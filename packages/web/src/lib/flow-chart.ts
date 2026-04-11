/**
 * Flow Chart: SVG-based flowchart/diagram builder with nodes, edges,
 * connectors, labels, multiple node shapes, layout algorithms,
 * drag-and-drop, zoom/pan, and interactive editing.
 */

// --- Types ---

export type NodeShape = "rect" | "rounded" | "diamond" | "ellipse" | "parallelogram" | "cylinder" | "document" | "terminator";
export type EdgeType = "straight" | "orthogonal" | "curved" | "step";

export interface FlowNode {
  id: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  shape?: NodeShape;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  fontSize?: number;
  sublabel?: string;
  icon?: string;
  data?: unknown;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: EdgeType;
  color?: string;
  width?: number;
  dashed?: boolean;
  animated?: boolean;
  arrow?: boolean;
}

export type FlowLayout = "manual" | "top-down" | "left-right" | "compact";

export interface FlowChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Nodes */
  nodes: FlowNode[];
  /** Edges */
  edges: FlowEdge[];
  /** Canvas width (px) */
  width?: number;
  /** Canvas height (px) */
  height?: number;
  /** Layout mode */
  layout?: FlowLayout;
  /** Default node shape */
  defaultShape?: NodeShape;
  /** Default node fill color */
  defaultFill?: string;
  /** Default stroke color */
  defaultStroke?: string;
  /** Edge default color */
  edgeColor?: string;
  /** Show grid? */
  showGrid?: boolean;
  /** Grid size (px) */
  gridSize?: number;
  /** Grid color */
  gridColor?: string;
  /** Enable dragging nodes? */
  draggable?: boolean;
  /** Enable zoom/pan? */
  zoomable?: boolean;
  /** Zoom limits */
  zoomLimits?: [number, number];
  /** Animation on mount? */
  animate?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Click callback on node */
  onNodeClick?: (node: FlowNode) => void;
  /** Callback on edge click */
  onEdgeClick?: (edge: FlowEdge) => void;
  /** Custom CSS class */
  className?: string;
}

export interface FlowChartInstance {
  element: HTMLElement;
  /** Add a node */
  addNode: (node: FlowNode) => void;
  /** Remove a node */
  removeNode: (id: string) => void;
  /** Add an edge */
  addEdge: (edge: FlowEdge) => void;
  /** Remove an edge */
  removeEdge: (id: string) => void;
  /** Update node position */
  moveNode: (id: string, x: number, y: number) => void;
  /** Auto-layout nodes */
  autoLayout: (mode?: FlowLayout) => void;
  /** Get all nodes */
  getNodes: () => FlowNode[];
  /** Get all edges */
  getEdges: () => FlowEdge[];
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_FILL = "#f0f4ff";
const DEFAULT_STROKE = "#6366f1";
const DEFAULT_EDGE_COLOR = "#9ca3af";
const NODE_WIDTH = 140;
const NODE_HEIGHT = 50;

// --- Shape Renderers ---

function createNodePath(shape: NodeShape, w: number, h: number): string {
  const r = Math.min(8, w * 0.08, h * 0.15);
  switch (shape) {
    case "rect": return `M 0 0 h ${w} v ${h} h ${-w} Z`;
    case "rounded": return `M ${r} 0 h ${w - r * 2} a ${r} ${r} 0 0 1 ${r} ${r} v ${h - r * 2} a ${r} ${r} 0 0 1 -${r} ${r} h ${-w + r * 2} a ${r} ${r} 0 0 1 -${r} -${r} v ${-h + r * 2} a ${r} ${r} 0 0 1 ${r} -${r} Z`;
    case "diamond": return `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z`;
    case "ellipse": return `M ${w / 2} 0 A ${w / 2} ${h / 2} 0 1 0 ${w / 2} ${h} A ${w / 2} ${h / 2} 0 1 0 ${w / 2} 0`;
    case "parallelogram": return `M ${w * 0.15} 0 H ${w} V ${h} H 0 Z`;
    case "cylinder":
      return `M 0 4 A ${w / 2} 8 0 0 1 ${w} 4 V ${h - 4} A ${w / 2} 8 0 0 1 0 ${h - 4} Z M 0 4 A ${w / 2} 8 0 0 0 ${w} 4`;
    case "document":
      return `M 0 0 H ${w - 16} L ${w} 16 V ${h} H 0 Z M ${w - 16} 0 L ${w} 16 V ${h - 16} H ${w - 16} Z`;
    case "terminator":
      return `M ${h / 2} 0 H ${w - h / 2} A ${h / 2} ${h / 2} 0 0 1 ${w} ${h / 2} V ${h - h / 2} A ${h / 2} ${h / 2} 0 0 1 ${w - h / 2} ${h} H ${h / 2} A ${h / 2} ${h / 2} 0 0 1 0 ${h - h / 2} V ${h / 2} A ${h / 2} ${h / 2} 0 0 1 ${h / 2} 0 Z`;
    default: return `M 0 0 h ${w} v ${h} h ${-w} Z`;
  }
}

// --- Main Factory ---

export function createFlowChart(options: FlowChartOptions): FlowChartInstance {
  const opts = {
    width: options.width ?? 700,
    height: options.height ?? 500,
    layout: options.layout ?? "manual",
    defaultShape: options.defaultShape ?? "rounded",
    defaultFill: options.defaultFill ?? DEFAULT_FILL,
    defaultStroke: options.defaultStroke ?? DEFAULT_STROKE,
    edgeColor: options.edgeColor ?? DEFAULT_EDGE_COLOR,
    showGrid: options.showGrid ?? true,
    gridSize: options.gridSize ?? 20,
    gridColor: options.gridColor ?? "#f0f0f0",
    draggable: options.draggable ?? true,
    zoomable: options.zoomable ?? false,
    zoomLimits: options.zoomLimits ?? [0.3, 3],
    animate: options.animate ?? true,
    animationDuration: options.animationDuration ?? 500,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("FlowChart: container not found");

  let nodes = [...options.nodes];
  let edges = [...options.edges];
  let destroyed = false;

  const ns = "http://www.w3.org/2000/svg";

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `flow-chart ${opts.className}`;
  wrapper.style.cssText = `
    position:relative;width:${opts.width}px;height:${opts.height}px;overflow:hidden;
    font-family:-apple-system,sans-serif;background:#fafbfc;border-radius:8px;
    border:1px solid #e5e7eb;cursor:${opts.draggable ? "grab" : "default"};
  `;
  container.appendChild(wrapper);

  // SVG
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.style.cssText = "width:100%;height:100%;display:block;";
  wrapper.appendChild(svg);

  // Defs
  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  // Arrow marker
  const arrowMarker = document.createElementNS(ns, "marker");
  arrowMarker.setAttribute("id", "fc-arrow");
  arrowMarker.setAttribute("viewBox", "0 0 10 10");
  arrowMarker.setAttribute("refX", "9");
  arrowMarker.setAttribute("refY", "5");
  arrowMarker.setAttribute("markerWidth", "6");
  arrowMarker.setAttribute("markerHeight", "6");
  arrowMarker.setAttribute("orient", "auto-start-reverse");
  arrowMarker.innerHTML = `<path d="M 0 0 L 10 5 L 0 10 z" fill="${opts.edgeColor}" />`;
  defs.appendChild(arrowMarker);

  // Layers
  const gridGroup = document.createElementNS(ns, "g");
  svg.appendChild(gridGroup);
  const edgeGroup = document.createElementNS(ns, "g");
  svg.appendChild(edgeGroup);
  const nodeGroup = document.createElementNS(ns, "g");
  svg.appendChild(nodeGroup);

  // --- Grid ---

  if (opts.showGrid) {
    for (let x = 0; x <= opts.width; x += opts.gridSize) {
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", String(x));
      line.setAttribute("y1", "0");
      line.setAttribute("x2", String(x));
      line.setAttribute("y2", String(opts.height));
      line.setAttribute("stroke", opts.gridColor);
      line.setAttribute("stroke-width", "0.5");
      gridGroup.appendChild(line);
    }
    for (let y = 0; y <= opts.height; y += opts.gridSize) {
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", "0");
      line.setAttribute("y1", String(y));
      line.setAttribute("x2", String(opts.width));
      line.setAttribute("y2", String(y));
      line.setAttribute("stroke", opts.gridColor);
      line.setAttribute("stroke-width", "0.5");
      gridGroup.appendChild(line);
    }
  }

  // --- Rendering ---

  function render(): void {
    edgeGroup.innerHTML = "";
    nodeGroup.innerHTML = "";

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Edges
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      const sx = src.x! + (src.width ?? NODE_WIDTH) / 2;
      const sy = src.y! + (src.height ?? NODE_HEIGHT) / 2;
      const tx = tgt.x! + (tgt.width ?? NODE_WIDTH) / 2;
      const ty = tgt.y! + (tgt.height ?? NODE_HEIGHT) / 2;

      let d: string;
      switch (edge.type ?? "straight") {
        case "orthogonal": {
          const midX = (sx + tx) / 2;
          d = `M ${sx} ${sy} H ${midX} V ${ty} H ${tx}`;
          break;
        }
        case "curved": {
          const cx = (sx + tx) / 2;
          d = `M ${sx} ${sy} C ${cx} ${sy}, ${cx} ${ty}, ${tx} ${ty}`;
          break;
        }
        case "step": {
          const stepSize = 20;
          d = `M ${sx} ${sy} H ${tx > sx ? tx - stepSize : tx + stepSize} V ${ty} H ${tx}`;
          break;
        }
        default:
          d = `M ${sx} ${sy} L ${tx} ${ty}`;
      }

      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", edge.color ?? opts.edgeColor);
      path.setAttribute("stroke-width", String(edge.width ?? 1.5));
      if (edge.dashed) path.setAttribute("stroke-dasharray", "5,4");
      if (edge.animated !== false && edge.arrow !== false) {
        path.setAttribute("marker-end", "url(#fc-arrow)");
      }
      path.style.cursor = "pointer";
      path.dataset.edgeId = edge.id;

      path.addEventListener("click", () => opts.onEdgeClick?.(edge));
      edgeGroup.appendChild(path);

      // Edge label
      if (edge.label) {
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        const lbl = document.createElementNS(ns, "text");
        lbl.setAttribute("x", String(mx));
        lbl.setAttribute("y", String(my - 6));
        lbl.setAttribute("text-anchor", "middle");
        lbl.style.cssText = "font-size:10px;fill:#6b7280;font-weight:500;";
        lbl.textContent = edge.label;
        edgeGroup.appendChild(lbl);
      }
    }

    // Nodes
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]!;
      const w = node.width ?? NODE_WIDTH;
      const h = node.height ?? NODE_HEIGHT;
      const shape = node.shape ?? opts.defaultShape;
      const fill = node.fill ?? opts.defaultFill;
      const stroke = node.stroke ?? opts.defaultStroke;
      const sw = node.strokeWidth ?? 1.5;

      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "fc-node");
      g.dataset.nodeId = node.id;
      g.style.cursor = opts.draggable ? "grab" : "default";
      g.style.transition = opts.animate ? `opacity ${opts.animationDuration}ms ease` : "";

      // Shape
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", createNodePath(shape, w, h));
      path.setAttribute("fill", fill);
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", String(sw));
      path.style.filter = "drop-shadow(0 1px 2px rgba(0,0,0,0.06))";
      g.appendChild(path);

      // Label
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", String(w / 2));
      text.setAttribute("y", String(h / 2));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.style.cssText = `
        font-size:${node.fontSize ?? 12}px;font-weight:600;fill:#374151;
        pointer-events:none;
      `;
      text.textContent = node.label;
      g.appendChild(text);

      // Sublabel
      if (node.sublabel) {
        const sub = document.createElementNS(ns, "text");
        sub.setAttribute("x", String(w / 2));
        sub.setAttribute("y", String(h / 2 + 14));
        sub.setAttribute("text-anchor", "middle");
        sub.style.cssText = "font-size:9px;fill:#9ca3af;pointer-events:none;";
        sub.textContent = node.sublabel;
        g.appendChild(sub);
      }

      g.setAttribute("transform", `translate(${node.x}, ${node.y})`);

      // Events
      g.addEventListener("click", () => opts.onNodeClick?.(node));
      g.addEventListener("mouseenter", () => { path.style.strokeWidth = String(sw + 1); });
      g.addEventListener("mouseleave", () => { path.style.strokeWidth = String(sw); });

      // Drag
      if (opts.draggable) {
        let dragging = false;
        let dx = 0, dy = 0;

        g.addEventListener("mousedown", (e) => {
          dragging = true;
          g.style.cursor = "grabbing";
          dx = (e as MouseEvent).clientX - node.x!;
          dy = (e as MouseEvent).clientY - node.y!;
          e.preventDefault();
        });

        const onMove = (e: MouseEvent) => {
          if (!dragging) return;
          node.x = (e.clientX - dx);
          node.y = (e.clientY - dy);
          g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
          renderEdges(); // Re-render edges to follow
        };
        const onUp = () => {
          dragging = false;
          g.style.cursor = "grab";
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      }

      nodeGroup.appendChild(g);
    }
  }

  function renderEdges(): void {
    // Only re-render edges (not nodes)
    const existingPaths = edgeGroup.querySelectorAll<SVGPathElement>("path");
    const existingLabels = edgeGroup.querySelectorAll<SVGTextElement>("text");

    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Remove old edges
    edgeGroup.innerHTML = "";

    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      const sx = src.x! + (src.width ?? NODE_WIDTH) / 2;
      const sy = src.y! + (src.height ?? NODE_HEIGHT) / 2;
      const tx = tgt.x! + (tgt.width ?? NODE_WIDTH) / 2;
      const ty = tgt.y! + (tgt.height ?? NODE_HEIGHT) / 2;

      const d = `M ${sx} ${sy} L ${tx} ${ty}`;

      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", edge.color ?? opts.edgeColor);
      path.setAttribute("stroke-width", String(edge.width ?? 1.5));
      if (edge.dashed) path.setAttribute("stroke-dasharray", "5,4");
      if (edge.animated !== false) path.setAttribute("marker-end", "url(#fc-arrow)");
      edgeGroup.appendChild(path);

      if (edge.label) {
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        const lbl = document.createElementNS(ns, "text");
        lbl.setAttribute("x", String(mx));
        lbl.setAttribute("y", String(my - 6));
        lbl.setAttribute("text-anchor", "middle");
        lbl.style.cssText = "font-size:10px;fill:#6b7280;";
        lbl.textContent = edge.label;
        edgeGroup.appendChild(lbl);
      }
    }
  }

  // Auto-layout
  function autoLayout(mode?: FlowLayout): void {
    const m = mode ?? opts.layout;
    if (m === "manual") return;

    // Simple top-down level assignment via BFS
    const levels: Map<string, number> = new Map();
    const inDegree = new Map<string, number>();
    const children = new Map<string, string[]>();

    for (const n of nodes) { inDegree.set(n.id, 0); children.set(n.id, []); levels.set(n.id, 0); }
    for (const e of edges) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      const arr = children.get(e.source) ?? [];
      arr.push(e.target);
      children.set(e.source, arr);
    }

    // BFS from roots (in-degree 0)
    const queue: string[] = [];
    for (const [id, deg] of inDegree) { if (deg === 0) queue.push(id); }
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const lvl = levels.get(cur) ?? 0;
      for (const child of (children.get(cur) ?? [])) {
        levels.set(child, Math.max(levels.get(child) ?? 0, lvl + 1));
        inDegree.set(child, (inDegree.get(child) ?? 1) - 1);
        if ((inDegree.get(child) ?? 0) === 0) queue.push(child);
      }
    }

    // Position by level
    const levelGroups = new Map<number, string[]>();
    for (const [id, lvl] of levels) {
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl)!.push(id);
    }

    const maxLvl = Math.max(...Array.from(levelGroups.keys()), 0);
    const levelH = (opts.height - 80) / Math.max(maxLvl + 1, 1);

    for (let lvl = 0; lvl <= maxLvl; lvl++) {
      const group = levelGroups.get(lvl) ?? [];
      const colW = opts.width / (group.length + 1);
      group.forEach((id, idx) => {
        const node = nodes.find(n => n.id === id);
        if (node) {
          node.x = colW * (idx + 1) - (node.width ?? NODE_WIDTH) / 2;
          node.y = 40 + lvl * levelH;
        }
      });
    }

    render();
  }

  // Initial render
  if (opts.layout !== "manual") autoLayout();
  render();

  // --- Instance ---

  const instance: FlowChartInstance = {
    element: wrapper,

    getNodes: () => [...nodes],
    getEdges: () => [...edges],

    addNode(node: FlowNode) {
      nodes.push(node);
      render();
    },

    removeNode(id: string) {
      nodes = nodes.filter(n => n.id !== id);
      edges = edges.filter(e => e.source !== id && e.target !== id);
      render();
    },

    addEdge(edge: FlowEdge) {
      edges.push(edge);
      render();
    },

    removeEdge(id: string) {
      edges = edges.filter(e => e.id !== id);
      render();
    },

    moveNode(id: string, x: number, y: number) {
      const node = nodes.find(n => n.id === id);
      if (node) { node.x = x; node.y = y; render(); }
    },

    autoLayout,

    exportSVG() {
      return svg.outerHTML;
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
