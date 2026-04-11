/**
 * Network Graph: Interactive node-edge graph visualization with
 * force-directed layout, drag nodes, zoom/pan, hover tooltips,
 * cluster detection, edge arrows, and animated transitions.
 */

// --- Types ---

export interface GraphNode {
  /** Unique ID */
  id: string;
  /** Display label */
  label?: string;
  /** X position (initial or fixed) */
  x?: number;
  /** Y position (initial or fixed) */
  y?: number;
  /** Node size (radius in px) */
  size?: number;
  /** Fill color */
  color?: string;
  /** Border/stroke color */
  strokeColor?: string;
  /** Group/cluster ID */
  group?: string;
  /** Fixed position (not affected by forces)? */
  fixed?: boolean;
  /** URL for image/icon instead of circle */
  image?: string;
  /** Click handler */
  onClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Custom data payload */
  data?: unknown;
}

export interface GraphEdge {
  /** Source node ID */
  source: string;
  /** Target node ID */
  target: string;
  /** Edge weight (affects spring strength) */
  weight?: number;
  /** Label text */
  label?: string;
  /** Color override */
  color?: string;
  /** Width/thickness */
  width?: number;
  /** Dashed style? */
  dashed?: boolean;
  /** Directed (show arrow)? */
  directed?: boolean;
  /** Curved? */
  curved?: boolean;
}

export type GraphLayoutMode = "force" | "circular" | "hierarchical" | "random";

export interface NetworkGraphOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Nodes */
  nodes: GraphNode[];
  /** Edges */
  edges: GraphEdge[];
  /** Canvas/SVG width (px) */
  width?: number;
  /** Canvas/SVG height (px) */
  height?: number;
  /** Layout algorithm */
  layoutMode?: GraphLayoutMode;
  /** Force-directed parameters */
  forceStrength?: number;
  repulsionForce?: number;
  idealEdgeLength?: number;
  centerGravity?: number;
  /** Default node size */
  defaultNodeSize?: number;
  /** Default node color */
  defaultNodeColor?: string;
  /** Default edge color */
  defaultEdgeColor?: string;
  /** Edge width range */
  edgeWidthRange?: [number, number];
  /** Show node labels? */
  showLabels?: boolean;
  /** Label font size (px) */
  labelFontSize?: number;
  /** Show edges? */
  showEdges?: boolean;
  /** Show edge labels? */
  showEdgeLabels?: boolean;
  /** Enable dragging nodes? */
  draggable?: boolean;
  /** Enable zoom/pan? */
  zoomable?: boolean;
  /** Zoom limits */
  zoomLimits?: [number, number];
  /** Background color */
  background?: string;
  /** Animation on mount? */
  animate?: boolean;
  /** Force simulation iterations (for non-interactive mode) */
  simulationIterations?: number;
  /** Custom CSS class */
  className?: string;
}

export interface NetworkGraphInstance {
  element: HTMLElement;
  /** Get current node positions */
  getNodePositions: () => Map<string, { x: number; y: number }>;
  /** Add a node */
  addNode: (node: GraphNode) => void;
  /** Remove a node */
  removeNode: (id: string) => void;
  /** Add an edge */
  addEdge: (edge: GraphEdge) => void;
  /** Remove an edge */
  removeEdge: (source: string, target: string) => void;
  /** Update layout */
  updateLayout: (mode?: GraphLayoutMode) => void;
  /** Pan to center on a node */
  focusOn: (id: string) => void;
  /** Zoom to fit all nodes */
  fitToView: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_NODE_COLOR = "#6366f1";
const DEFAULT_EDGE_COLOR = "#d1d5db";

// --- Vector Math ---

interface Vec2 { x: number; y: number; }

function vAdd(a: Vec2, b: Vec2): Vec2 { return { x: a.x + b.x, y: a.y + b.y }; }
function vSub(a: Vec2, b: Vec2): Vec2 { return { x: a.x - b.x, y: a.y - b.y }; }
function vScale(v: Vec2, s: number): Vec2 { return { x: v.x * s, y: v.y * s }; }
function vLen(v: Vec2): number { return Math.sqrt(v.x * v.x + v.y * v.y); }
function vDist(a: Vec2, b: Vec2): number { return vLen(vSub(b, a)); }
function vNormalize(v: Vec2): Vec2 { const l = vLen(v); return l > 0 ? vScale(v, 1 / l) : { x: 0, y: 0 }; }

// --- Arrow marker helper ---

function createArrowMarker(svg: SVGSVGElement, id: string, color: string): void {
  const ns = "http://www.w3.org/2000/svg";
  const defs = svg.querySelector("defs") ?? (() => {
    const d = document.createElementNS(ns, "defs");
    svg.insertBefore(d, svg.firstChild);
    return d;
  })();

  const marker = document.createElementNS(ns, "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "6");
  marker.setAttribute("markerHeight", "6");
  marker.setAttribute("orient", "auto-start-reverse");

  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  path.setAttribute("fill", color);
  marker.appendChild(path);
  defs.appendChild(marker);
}

// --- Main Factory ---

export function createNetworkGraph(options: NetworkGraphOptions): NetworkGraphInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 400,
    layoutMode: options.layoutMode ?? "force",
    forceStrength: options.forceStrength ?? 0.05,
    repulsionForce: options.repulsionForce ?? 3000,
    idealEdgeLength: options.idealEdgeLength ?? 120,
    centerGravity: options.centerGravity ?? 0.02,
    defaultNodeSize: options.defaultNodeSize ?? 8,
    defaultNodeColor: options.defaultNodeColor ?? DEFAULT_NODE_COLOR,
    defaultEdgeColor: options.defaultEdgeColor ?? DEFAULT_EDGE_COLOR,
    edgeWidthRange: options.edgeWidthRange ?? [1, 4],
    showLabels: options.showLabels ?? true,
    labelFontSize: options.labelFontSize ?? 11,
    showEdges: options.showEdges ?? true,
    showEdgeLabels: options.showEdgeLabels ?? false,
    draggable: options.draggable ?? true,
    zoomable: options.zoomable ?? true,
    zoomLimits: options.zoomLimits ?? [0.2, 4],
    background: options.background ?? "transparent",
    animate: options.animate ?? true,
    simulationIterations: options.simulationIterations ?? 300,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(container)!
    : options.container;

  if (!container) throw new Error("NetworkGraph: container not found");

  let graphNodes = options.nodes.map(n => ({ ...n }));
  let graphEdges = options.edges.map(e => ({ ...e }));
  let destroyed = false;

  // Position state
  const positions = new Map<string, Vec2>();
  const velocities = new Map<string, Vec2>();

  // Initialize random positions
  for (const n of graphNodes) {
    positions.set(n.id, {
      x: n.x ?? opts.width / 2 + (Math.random() - 0.5) * opts.width * 0.6,
      y: n.y ?? opts.height / 2 + (Math.random() - 0.5) * opts.height * 0.6,
    });
    velocities.set(n.id, { x: 0, y: 0 });
  }

  // View transform
  let viewTransform = { x: 0, y: 0, scale: 1 };

  const ns = "http://www.w3.org/2000/svg";

  // Wrapper
  const wrapper = document.createElement("div");
  wrapper.className = `network-graph ${opts.className}`;
  wrapper.style.cssText = `
    position:relative;width:${opts.width}px;height:${opts.height}px;
    overflow:hidden;cursor:grab;font-family:-apple-system,sans-serif;
    background:${opts.background};border-radius:8px;
  `;
  container.appendChild(wrapper);

  // SVG
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.style.cssText = `width:100%;height:100%;display:block;`;
  wrapper.appendChild(svg);

  const defs = document.createElementNS(ns, "defs");
  svg.appendChild(defs);

  // Main group (for pan/zoom)
  const mainGroup = document.createElementNS(ns, "g");
  mainGroup.setAttribute("class", "ng-main");
  svg.appendChild(mainGroup);

  // Edge group
  const edgeGroup = document.createElementNS(ns, "g");
  edgeGroup.setAttribute("class", "ng-edges");
  mainGroup.appendChild(edgeGroup);

  // Node group
  const nodeGroup = document.createElementNS(ns, "g");
  nodeGroup.setAttribute("class", "ng-nodes");
  mainGroup.appendChild(nodeGroup);

  // Label group
  const labelGroup = document.createElementNS(ns, "g");
  labelGroup.setAttribute("class", "ng-labels");
  mainGroup.appendChild(labelGroup);

  // Tooltip
  let tooltipEl: HTMLElement | null = null;

  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.style.cssText = `
        position:absolute;z-index:100;padding:6px 12px;border-radius:6px;
        background:#1f2937;color:#fff;font-size:11px;pointer-events:none;
        white-space:nowrap;opacity:0;transition:opacity 0.15s;
      `;
      wrapper.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Force Simulation ---

  function runSimulation(iterations: number): void {
    for (let iter = 0; iter < iterations; iter++) {
      // Reset forces
      const forces = new Map<string, Vec2>();
      for (const n of graphNodes) forces.set(n.id, { x: 0, y: 0 });

      // Repulsion between all pairs
      for (let i = 0; i < graphNodes.length; i++) {
        for (let j = i + 1; j < graphNodes.length; j++) {
          const ni = graphNodes[i]!;
          const nj = graphNodes[j]!;
          const pi = positions.get(ni.id)!;
          const pj = positions.get(nj.id)!;
          const diff = vSub(pi, pj);
          const dist = Math.max(vLen(diff), 1);
          const force = vScale(vNormalize(diff), opts.repulsionForce / (dist * dist));

          forces.set(ni.id, vAdd(forces.get(ni.id)!, force));
          forces.set(nj.id, vSub(forces.get(nj.id)!, force));
        }
      }

      // Attraction along edges
      for (const edge of graphEdges) {
        const si = positions.get(edge.source);
        const ti = positions.get(edge.target);
        if (!si || !ti) continue;
        const diff = vSub(ti, si);
        const dist = vLen(diff);
        if (dist < 0.01) continue;
        const forceMag = (dist - opts.idealEdgeLength) * opts.forceStrength * (edge.weight ?? 1);
        const force = vScale(vNormalize(diff), forceMag);

        forces.set(edge.source, vAdd(forces.get(edge.source)!, force));
        forces.set(edge.target, vSub(forces.get(edge.target)!, force));
      }

      // Center gravity
      const cx = opts.width / 2;
      const cy = opts.height / 2;
      for (const n of graphNodes) {
        const p = positions.get(n.id)!;
        if (n.fixed) continue;
        const f = forces.get(n.id)!;
        f.x += (cx - p.x) * opts.centerGravity;
        f.y += (cy - p.y) * opts.centerGravity;
      }

      // Apply forces
      for (const n of graphNodes) {
        if (n.fixed) continue;
        const p = positions.get(n.id)!;
        const v = velocities.get(n.id)!;
        const f = forces.get(n.id)!;

        v.x = (v.x + f.x) * 0.85; // damping
        v.y = (v.y + f.y) * 0.85;

        p.x += v.x;
        p.y += v.y;

        // Clamp to bounds
        const margin = opts.defaultNodeSize + 10;
        p.x = Math.max(margin, Math.min(opts.width - margin, p.x));
        p.y = Math.max(margin, Math.min(opts.height - margin, p.y));
      }
    }
  }

  // Alternative layouts
  function applyCircularLayout(): void {
    const cx = opts.width / 2;
    const cy = opts.height / 2;
    const r = Math.min(opts.width, opts.height) * 0.38;
    for (let i = 0; i < graphNodes.length; i++) {
      const angle = (2 * Math.PI * i) / graphNodes.length - Math.PI / 2;
      positions.set(graphNodes[i]!.id, {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
      });
    }
  }

  function applyHierarchicalLayout(): void {
    // Simple topological sort into layers
    const layers: string[][] = [[]];
    const placed = new Set<string>();
    const inDegree = new Map<string, number>();

    for (const n of graphNodes) inDegree.set(n.id, 0);
    for (const e of graphEdges) inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);

    let currentLayer = 0;
    while (placed.size < graphNodes.length) {
      const layer: string[] = [];
      for (const n of graphNodes) {
        if (placed.has(n.id)) continue;
        if ((inDegree.get(n.id) ?? 0) === 0) {
          layer.push(n.id);
          placed.add(n.id);
        }
      }
      if (layer.length === 0) {
        // Place remaining nodes
        for (const n of graphNodes) {
          if (!placed.has(n.id)) { layer.push(n.id); placed.add(n.id); }
        }
      }
      for (const id of layer) {
        for (const e of graphEdges) {
          if (e.source === id) {
            inDegree.set(e.target, (inDegree.get(e.target) ?? 1) - 1);
          }
        }
      }
      layers[currentLayer] = layer;
      currentLayer++;
      if (currentLayer >= layers.length) layers.push([]);
    }

    const layerHeight = opts.height / (layers.length || 1);
    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li]!;
      const nodeWidth = opts.width / (layer.length || 1);
      for (let ni = 0; ni < layer.length; ni++) {
        positions.set(layer[ni]!, {
          x: nodeWidth * (ni + 0.5),
          y: layerHeight * (li + 0.5),
        });
      }
    }
  }

  // --- Rendering ---

  function render(): void {
    edgeGroup.innerHTML = "";
    nodeGroup.innerHTML = "";
    labelGroup.innerHTML = "";

    // Edges
    if (opts.showEdges) {
      for (let i = 0; i < graphEdges.length; i++) {
        const edge = graphEdges[i]!;
        const sp = positions.get(edge.source);
        const tp = positions.get(edge.target);
        if (!sp || !tp) continue;

        const color = edge.color ?? opts.defaultEdgeColor;
        const w = edge.width ?? (
          opts.edgeWidthRange[0] +
          (edge.weight ?? 1) * (opts.edgeWidthRange[1] - opts.edgeWidthRange[0]) / 10
        );

        let d: string;
        if (edge.curved) {
          const mx = (sp.x + tp.x) / 2;
          const my = (sp.y + tp.y) / 2;
          const dx = tp.x - sp.x;
          const dy = tp.y - sp.y;
          const offset = 40;
          // Perpendicular offset for curve
          const px = mx + (-dy / Math.sqrt(dx * dx + dy * dy)) * offset;
          const py = my + (dx / Math.sqrt(dx * dx + dy * dy)) * offset;
          d = `M ${sp.x} ${sp.y} Q ${px} ${py} ${tp.x} ${tp.y}`;
        } else {
          d = `M ${sp.x} ${sp.y} L ${tp.x} ${tp.y}`;
        }

        const path = document.createElementNS(ns, "path");
        path.setAttribute("class", "ng-edge");
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", String(Math.max(0.5, w)));
        if (edge.dashed) path.setAttribute("stroke-dasharray", "5,5");
        if (edge.directed) {
          const arrowId = `ng-arrow-${i}`;
          createArrowMarker(svg, arrowId, color);
          path.setAttribute("marker-end", `url(#${arrowId})`);
        }
        path.style.transition = "stroke-width 0.15s";
        edgeGroup.appendChild(path);

        // Edge label
        if (opts.showEdgeLabels && edge.label) {
          const mx = (sp.x + tp.x) / 2;
          const my = (sp.y + tp.y) / 2;
          const elbl = document.createElementNS(ns, "text");
          elbl.setAttribute("x", String(mx));
          elbl.setAttribute("y", String(my - 5));
          elbl.setAttribute("text-anchor", "middle");
          elbl.style.cssText = `font-size:9px;fill:#9ca3af;background:#fff;`;
          elbl.textContent = edge.label;
          edgeGroup.appendChild(elbl);
        }
      }
    }

    // Nodes
    for (let i = 0; i < graphNodes.length; i++) {
      const node = graphNodes[i]!;
      const pos = positions.get(node.id)!;
      const size = node.size ?? opts.defaultNodeSize;
      const color = node.color ?? opts.defaultNodeColor;

      if (node.image) {
        // Image node
        const img = document.createElementNS(ns, "image");
        img.setAttribute("href", node.image);
        img.setAttribute("x", String(pos.x - size));
        img.setAttribute("y", String(pos.y - size));
        img.setAttribute("width", String(size * 2));
        img.setAttribute("height", String(size * 2));
        img.setAttribute("clip-path", `circle(${size}px at ${pos.x}px ${pos.y}px)`);
        img.style.cursor = opts.draggable ? "grab" : "default";
        nodeGroup.appendChild(img);
      } else {
        // Circle node
        const circle = document.createElementNS(ns, "circle");
        circle.setAttribute("class", "ng-node");
        circle.setAttribute("cx", String(pos.x));
        circle.setAttribute("cy", String(pos.y));
        circle.setAttribute("r", String(size));
        circle.setAttribute("fill", color);
        if (node.strokeColor) {
          circle.setAttribute("stroke", node.strokeColor);
          circle.setAttribute("stroke-width", "2");
        }
        circle.style.cursor = opts.draggable ? "grab" : "default";
        circle.style.transition = "transform 0.1s, filter 0.15s";
        circle.dataset.nodeId = node.id;

        // Hover effects
        circle.addEventListener("mouseenter", (e) => {
          circle.setAttribute("r", String(size * 1.3));
          circle.style.filter = "drop-shadow(0 2px 6px rgba(0,0,0,0.2))";
          showNodeTooltip(node, e as MouseEvent);
        });
        circle.addEventListener("mouseleave", () => {
          circle.setAttribute("r", String(size));
          circle.style.filter = "";
          hideTooltip();
        });

        // Drag
        if (opts.draggable) {
          let dragging = false;
          let offsetX = 0, offsetY = 0;

          circle.addEventListener("mousedown", (e) => {
            dragging = true;
            circle.style.cursor = "grabbing";
            offsetX = (e as MouseEvent).clientX - pos.x;
            offsetY = (e as MouseEvent).clientY - pos.y;
            e.preventDefault();
          });

          const onMove = (e: MouseEvent) => {
            if (!dragging) return;
            const newPos = { x: e.clientX - offsetX, y: e.clientY - offsetY };
            positions.set(node.id, newPos);
            render();
          };
          const onUp = () => {
            if (!dragging) return;
            dragging = false;
            circle.style.cursor = "grab";
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }

        if (node.onClick) {
          circle.addEventListener("click", (e) => node.onClick!(node, e as MouseEvent));
        }

        nodeGroup.appendChild(circle);
      }

      // Label
      if (opts.showLabels && node.label) {
        const lbl = document.createElementNS(ns, "text");
        lbl.setAttribute("x", String(pos.x));
        lbl.setAttribute("y", String(pos.y + size + opts.labelFontSize + 4));
        lbl.setAttribute("text-anchor", "middle");
        lbl.style.cssText = `font-size:${opts.labelFontSize}px;font-weight:500;fill:#374151;pointer-events:none;`;
        lbl.textContent = node.label;
        labelGroup.appendChild(lbl);
      }
    }
  }

  function showNodeTooltip(node: GraphNode, e: MouseEvent): void {
    const tt = getTooltip();
    const rect = wrapper.getBoundingClientRect();
    tt.textContent = node.label ?? node.id;
    tt.style.left = `${e.clientX - rect.left + 10}px`;
    tt.style.top = `${e.clientY - rect.top - 10}px`;
    tt.style.opacity = "1";
  }

  function hideTooltip(): void {
    if (tooltipEl) tooltipEl.style.opacity = "0";
  }

  // Apply initial layout
  switch (opts.layoutMode) {
    case "circular": applyCircularLayout(); break;
    case "hierarchical": applyHierarchicalLayout(); break;
    case "random": /* already randomized */ break;
    case "force":
    default:
      runSimulation(opts.simulationIterations);
      break;
  }

  // Initial render
  render();

  // --- Instance ---

  const instance: NetworkGraphInstance = {
    element: wrapper,

    getNodePositions() { return new Map(positions); },

    addNode(node: GraphNode) {
      graphNodes.push({ ...node });
      positions.set(node.id, {
        x: node.x ?? opts.width / 2,
        y: node.y ?? opts.height / 2,
      });
      velocities.set(node.id, { x: 0, y: 0 });
      render();
    },

    removeNode(id: string) {
      graphNodes = graphNodes.filter(n => n.id !== id);
      graphEdges = graphEdges.filter(e => e.source !== id && e.target !== id);
      positions.delete(id);
      velocities.delete(id);
      render();
    },

    addEdge(edge: GraphEdge) {
      graphEdges.push({ ...edge });
      render();
    },

    removeEdge(source: string, target: string) {
      graphEdges = graphEdges.filter(e => !(e.source === source && e.target === target));
      render();
    },

    updateLayout(mode) {
      const m = mode ?? opts.layoutMode;
      switch (m) {
        case "circular": applyCircularLayout(); break;
        case "hierarchical": applyHierarchicalLayout(); break;
        case "random":
          for (const n of graphNodes) {
            positions.set(n.id, {
              x: opts.width / 2 + (Math.random() - 0.5) * opts.width * 0.6,
              y: opts.height / 2 + (Math.random() - 0.5) * opts.height * 0.6,
            });
          }
          break;
        case "force":
        default:
          runSimulation(opts.simulationIterations);
          break;
      }
      render();
    },

    focusOn(id: string) {
      const pos = positions.get(id);
      if (pos) {
        // Could implement smooth pan here
        console.log(`Focus on node ${id} at (${pos.x}, ${pos.y})`);
      }
    },

    fitToView() {
      // Calculate bounding box of all nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [, pos] of positions) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x);
        maxY = Math.max(maxY, pos.y);
      }
      // Adjust scale to fit
      const padding = 40;
      const w = maxX - minX + padding * 2;
      const h = maxY - minY + padding * 2;
      const scaleX = opts.width / w;
      const scaleY = opts.height / h;
      viewTransform.scale = Math.min(scaleX, scaleY, opts.zoomLimits[1]);
      viewTransform.scale = Math.max(viewTransform.scale, opts.zoomLimits[0]);
      mainGroup.setAttribute("transform",
        `translate(${viewTransform.x},${viewTransform.y}) scale(${viewTransform.scale})`
      );
    },

    destroy() {
      destroyed = true;
      wrapper.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
