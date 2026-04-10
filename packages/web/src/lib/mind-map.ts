/**
 * Mind Map: Interactive mind map visualization with nodes, connections,
 * drag-to-reposition, zoom/pan, collapse/expand branches, node editing,
 * layout algorithms (radial/tree), and export.
 */

// --- Types ---

export interface MindMapNode {
  id: string;
  text: string;
  /** Child nodes */
  children?: MindMapNode[];
  /** Color for this branch */
  color?: string;
  /** Icon/emoji */
  icon?: string;
  /** Notes/description */
  notes?: string;
  /** URL link */
  url?: string;
  /** Custom position (overrides auto-layout) */
  x?: number;
  y?: number;
  /** Expanded? */
  expanded?: boolean;
  /** Completion status 0-100 */
  progress?: number;
  /** Custom data */
  data?: Record<string, unknown>;
}

export interface MindMapOptions {
  container: HTMLElement | string;
  /** Root node data */
  root: MindMapNode;
  /** Layout algorithm */
  layout?: "radial" | "tree" | "organic";
  /** Direction for tree layout */
  direction?: "horizontal" | "vertical";
  /** Node size in px (default: 32) */
  nodeSize?: number;
  /** Connection line style */
  connectionStyle?: "curve" | "straight" | "step";
  /** Show root node centered? */
  centerRoot?: boolean;
  /** Color palette for branches */
  colors?: string[];
  /** Enable dragging nodes */
  draggable?: boolean;
  /** Enable zoom/pan on canvas */
  zoomable?: boolean;
  /** Initial zoom level (default: 1) */
  zoom?: number;
  /** Callback on node click */
  onNodeClick?: (node: MindMapNode) => void;
  /** Callback on node double-click (edit) */
  onNodeDoubleClick?: (node: MindMapNode) => void;
  /** Callback when node text changes */
  onNodeEdit?: (node: MindMapNode, newText: string) => void;
  /** Callback on node add */
  onNodeAdd?: (parentId: string, node: MindMapNode) => void;
  /** Callback on node delete */
  onNodeDelete?: (nodeId: string) => void;
  /** Font size in px (default: 13) */
  fontSize?: number;
  /** Theme: "light" or "dark" */
  theme?: "light" | "dark";
  /** Custom CSS class */
  className?: string;
}

export interface MindMapInstance {
  element: HTMLElement;
  getRoot: () => MindMapNode;
  setRoot: (root: MindMapNode) => void;
  findNode: (id: string) => MindMapNode | undefined;
  addChild: (parentId: string, node: MindMapNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<MindMapNode>) => void;
  setLayout: (layout: "radial" | "tree" | "organic") => void;
  fitToView: () => void;
  setZoom: (level: number) => void;
  getZoom: () => number;
  exportSvg: () => string;
  destroy: () => void;
}

// --- Default Colors ---

const DEFAULT_COLORS = [
  "#4338ca", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316",
];

// --- Main Factory ---

export function createMindMap(options: MindMapOptions): MindMapInstance {
  const opts = {
    layout: options.layout ?? "radial",
    direction: options.direction ?? "horizontal",
    nodeSize: options.nodeSize ?? 32,
    connectionStyle: options.connectionStyle ?? "curve",
    centerRoot: options.centerRoot ?? true,
    colors: options.colors ?? DEFAULT_COLORS,
    draggable: options.draggable ?? true,
    zoomable: options.zoomable ?? true,
    zoom: options.zoom ?? 1,
    fontSize: options.fontSize ?? 13,
    theme: options.theme ?? "light",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("MindMap: container not found");

  const isDark = opts.theme === "dark";
  const bg = isDark ? "#1a1a2e" : "#ffffff";
  const text = isDark ? "#e2e8f0" : "#1e293b";
  const lineColor = isDark ? "#4a5568" : "#cbd5e1";

  let rootNode: MindMapNode = { ...options.root };
  let destroyed = false;
  let currentZoom = opts.zoom;
  let panX = 0, panY = 0;
  let isDraggingCanvas = false;
  let canvasStartX = 0, canvasStartY = 0;

  // Create SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", `mind-map ${opts.className ?? ""}`);
  svg.style.cssText = `
    width:100%;height:100%;background:${bg};cursor:grab;
    font-family:-apple-system,sans-serif;font-size:${opts.fontSize}px;color:${text};
    touch-action:none;user-select:none;
  `;
  container.appendChild(svg);

  // Defs for markers
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);

  // Groups
  const connectionsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  connectionsGroup.setAttribute("class", "mm-connections");
  svg.appendChild(connectionsGroup);

  const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  nodesGroup.setAttribute("class", "mm-nodes");
  svg.appendChild(nodesGroup);

  // --- Layout Engine ---

  interface PositionedNode {
    node: MindMapNode;
    x: number;
    y: number;
    depth: number;
    color: string;
  }

  function computeLayout(): PositionedNode[] {
    const result: PositionedNode[] = [];
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;

    switch (opts.layout) {
      case "radial":
        radialLayout(rootNode, cx, cy, 0, 0, result);
        break;
      case "tree":
        treeLayout(rootNode, cx, cy, 0, result);
        break;
      case "organic":
        organicLayout(rootNode, cx, cy, 0, result);
        break;
    }

    return result;
  }

  function radialLayout(
    node: MindMapNode,
    x: number,
    y: number,
    depth: number,
    index: number,
    result: PositionedNode[],
  ): void {
    const color = node.color ?? opts.colors[depth % opts.colors.length]!;
    result.push({ node, x, y, depth, color });

    if (!node.children || node.children.length === 0 || node.expanded === false) return;

    const childCount = node.children.length;
    const radius = Math.max(80 + depth * 60, 120);
    const angleSpan = depth === 0 ? Math.PI * 2 : Math.PI * 0.7;
    const startAngle = depth === 0 ? -Math.PI / 2 : -angleSpan / 2;

    for (let i = 0; i < childCount; i++) {
      const angle = startAngle + (i / Math.max(childCount - 1, 1)) * angleSpan;
      const cx = x + Math.cos(angle) * radius;
      const cy = y + Math.sin(angle) * radius;
      radialLayout(node.children[i]!, cx, cy, depth + 1, i, result);
    }
  }

  function treeLayout(
    node: MindMapNode,
    x: number,
    y: number,
    depth: number,
    result: PositionedNode[],
  ): void {
    const color = node.color ?? opts.colors[depth % opts.colors.length]!;
    result.push({ node, x, y, depth, color });

    if (!node.children || node.children.length === 0 || node.expanded === false) return;

    const isHoriz = opts.direction === "horizontal";
    const spacing = 50 + depth * 15;
    const childCount = node.children.length;
    const totalSpan = (childCount - 1) * spacing;

    for (let i = 0; i < childCount; i++) {
      const offset = i * spacing - totalSpan / 2;
      const cx = isHoriz ? x + 140 : x + offset;
      const cy = isHoriz ? y + offset : y + 100;
      treeLayout(node.children[i]!, cx, cy, depth + 1, result);
    }
  }

  function organicLayout(
    node: MindMapNode,
    x: number,
    y: number,
    depth: number,
    result: PositionedNode[],
  ): void {
    const color = node.color ?? opts.colors[depth % opts.colors.length]!;

    // Use custom position if provided
    const px = node.x ?? x + (Math.random() - 0.5) * (100 - depth * 10);
    const py = node.y ?? y + (Math.random() - 0.5) * (100 - depth * 10);
    result.push({ node, x: px, y: py, depth, color });

    if (!node.children || node.children.length === 0 || node.expanded === false) return;

    for (let i = 0; i < node.children.length; i++) {
      organicLayout(node.children[i]!, px, py, depth + 1, result);
    }
  }

  // --- Rendering ---

  function render(): void {
    connectionsGroup.innerHTML = "";
    nodesGroup.innerHTML = "";

    const positioned = computeLayout();

    // Draw connections first (behind nodes)
    for (const p of positioned) {
      if (!p.node.children || p.node.expanded === false) continue;
      for (const child of p.node.children) {
        const childPos = positioned.find((pp) => pp.node.id === child!.id);
        if (!childPos) continue;
        drawConnection(p.x, p.y, childPos.x, childPos.y, p.color);
      }
    }

    // Draw nodes
    for (const p of positioned) {
      drawNode(p);
    }

    applyTransform();
  }

  function drawConnection(x1: number, y1: number, x2: number, y2: number, color: string): void {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    switch (opts.connectionStyle) {
      case "straight": {
        path.setAttribute("d", `M${x1},${y1} L${x2},${y2}`);
        break;
      }
      case "step": {
        const mx = (x1 + x2) / 2;
        path.setAttribute("d", `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`);
        break;
      }
      default: { // curve
        const mx = (x1 + x2) / 2;
        path.setAttribute("d", `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
      }
    }

    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-opacity", "0.6");
    connectionsGroup.appendChild(path);
  }

  function drawNode(p: PositionedNode): void {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "mm-node");
    g.dataset.nodeId = p.node.id;
    g.style.cursor = "pointer";

    const r = opts.nodeSize / 2;

    // Background circle/rect
    const shape = p.depth === 0
      ? document.createElementNS("http://www.w3.org/2000/svg", "circle")
      : document.createElementNS("http://www.w3.org/2000/svg", "ellipse");

    if (p.depth === 0) {
      (shape as SVGCircleElement).setAttribute("cx", String(p.x));
      (shape as SVGCircleElement).setAttribute("cy", String(p.y));
      (shape as SVGCircleElement).setAttribute("r", String(r + 4));
    } else {
      (shape as SVGEllipseElement).setAttribute("cx", String(p.x));
      (shape as SVGEllipseElement).setAttribute("cy", String(p.y));
      (shape as SVGEllipseElement).setAttribute("rx", String(r + 12));
      (shape as SVGEllipseElement).setAttribute("ry", String(r));
    }

    shape.setAttribute("fill", p.color + "18");
    shape.setAttribute("stroke", p.color);
    shape.setAttribute("stroke-width", "2");
    g.appendChild(shape);

    // Icon or initial letter
    if (p.node.icon) {
      const iconText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      iconText.setAttribute("x", String(p.x));
      iconText.setAttribute("y", String(p.y + 5));
      iconText.setAttribute("text-anchor", "middle");
      iconText.setAttribute("font-size", "16");
      iconText.textContent = p.node.icon;
      g.appendChild(iconText);
    } else {
      const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textEl.setAttribute("x", String(p.x));
      textEl.setAttribute("y", String(p.y + 4));
      textEl.setAttribute("text-anchor", "middle");
      textEl.setAttribute("font-weight", p.depth === 0 ? "700" : "500");
      textEl.setAttribute("font-size", p.depth === 0 ? "14" : "12");
      textEl.textContent = p.node.text.slice(0, 20) + (p.node.text.length > 20 ? "..." : "");
      g.appendChild(textEl);
    }

    // Progress ring (if applicable)
    if ((p.node.progress ?? 0) > 0 && p.node.progress! < 100) {
      const progR = r + 6;
      const circumference = 2 * Math.PI * progR;
      const progressCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      progressCircle.setAttribute("cx", String(p.x));
      progressCircle.setAttribute("cy", String(p.y));
      progressCircle.setAttribute("r", String(progR));
      progressCircle.setAttribute("fill", "none");
      progressCircle.setAttribute("stroke", p.color);
      progressCircle.setAttribute("stroke-width", "3");
      progressCircle.setAttribute("stroke-dasharray", `${(p.node.progress! / 100) * circumference} ${circumference}`);
      progressCircle.setAttribute("transform", `rotate(-90 ${p.x} ${p.y})`);
      g.appendChild(progressCircle);
    }

    // Collapse indicator for parent nodes
    if (p.node.children && p.node.children.length > 0) {
      const indicator = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      indicator.setAttribute("cx", String(p.x + r + 14));
      indicator.setAttribute("cy", String(p.y - r));
      indicator.setAttribute("r", "7");
      indicator.setAttribute("fill", "#fff");
      indicator.setAttribute("stroke", lineColor);
      indicator.setAttribute("stroke-width", "1");
      indicator.style.cursor = "pointer";

      const indText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      indText.setAttribute("x", String(p.x + r + 14));
      indText.setAttribute("y", String(p.y - r + 4));
      indText.setAttribute("text-anchor", "middle");
      indText.setAttribute("font-size", "10");
      indText.setAttribute("font-weight", "bold");
      indText.textContent = p.node.expanded === false ? "+" : "\u2012";
      indicator.appendChild(indText);
      g.appendChild(indicator);

      indicator.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleExpand(p.node);
      });
    }

    // Events
    g.addEventListener("click", () => opts.onNodeClick?.(p.node));
    g.addEventListener("dblclick", () => opts.onNodeDoubleClick?.(p.node));

    // Hover effect
    g.addEventListener("mouseenter", () => {
      shape.setAttribute("fill", p.color + "30");
    });
    g.addEventListener("mouseleave", () => {
      shape.setAttribute("fill", p.color + "18");
    });

    // Dragging
    if (opts.draggable && p.depth > 0) {
      setupNodeDrag(g, p);
    }

    nodesGroup.appendChild(g);
  }

  function setupNodeDrag(g: SVGGElement, p: PositionedNode): void {
    let startX = 0, startY = 0;

    g.addEventListener("mousedown", (e: Event) => {
      e.stopPropagation();
      const me = e as MouseEvent;
      startX = me.clientX;
      startY = me.clientY;
      svg.style.cursor = "grabbing";

      const onMove = (me: MouseEvent) => {
        const dx = (me.clientX - startX) / currentZoom;
        const dy = (me.clientY - startY) / currentZoom;
        p.node.x = p.x + dx;
        p.node.y = p.y + dy;
        p.x += dx;
        p.y += dy;
        startX = me.clientX;
        startY = me.clientY;
        render();
      };

      const onUp = () => {
        svg.style.cursor = "grab";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  function toggleExpand(node: MindMapNode): void {
    node.expanded = !node.expanded;
    render();
  }

  function applyTransform(): void {
    nodesGroup.setAttribute("transform", `translate(${panX},${panY}) scale(${currentZoom})`);
    connectionsGroup.setAttribute("transform", `translate(${panX},${panY}) scale(${currentZoom})`);
  }

  // --- Canvas Pan/Zoom ---

  if (opts.zoomable) {
    svg.addEventListener("mousedown", (e: MouseEvent) => {
      if ((e.target as Element).classList.contains("mm-node")) return;
      isDraggingCanvas = true;
      canvasStartX = e.clientX - panX;
      canvasStartY = e.clientY - panY;
      svg.style.cursor = "grabbing";
    });

    svg.addEventListener("mousemove", (e: MouseEvent) => {
      if (!isDraggingCanvas) return;
      panX = e.clientX - canvasStartX;
      panY = e.clientY - canvasStartY;
      applyTransform();
    });

    svg.addEventListener("mouseup", () => {
      isDraggingCanvas = false;
      svg.style.cursor = "grab";
    });

    svg.addEventListener("mouseleave", () => {
      isDraggingCanvas = false;
      svg.style.cursor = "grab";
    });

    svg.addEventListener("wheel", (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      currentZoom = Math.max(0.2, Math.min(3, currentZoom * delta));
      applyTransform();
    }, { passive: false });
  }

  // --- ResizeObserver ---

  const resizeObserver = new ResizeObserver(() => {
    if (!destroyed) render();
  });
  resizeObserver.observe(container);

  // --- Instance ---

  const instance: MindMapInstance = {
    element: container,

    getRoot() { return rootNode; },

    setRoot(newRoot: MindMapNode) {
      rootNode = { ...newRoot };
      render();
    },

    findNode(id: string): MindMapNode | undefined {
      return findInTree(rootNode, id);
    },

    addChild(parentId: string, newNode: MindMapNode) {
      const parent = findInTree(rootNode, parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(newNode);
        render();
        opts.onNodeAdd?.(parentId, newNode);
      }
    },

    removeNode(id: string) {
      removeFromTree(rootNode, id);
      render();
      opts.onNodeDelete?.(id);
    },

    updateNode(id: string, updates: Partial<MindMapNode>) {
      const node = findInTree(rootNode, id);
      if (node) Object.assign(node, updates);
      render();
    },

    setLayout(layout: "radial" | "tree" | "organic") {
      opts.layout = layout;
      render();
    },

    fitToView() {
      currentZoom = 1;
      panX = 0;
      panY = 0;
      render();
    },

    setZoom(level: number) {
      currentZoom = Math.max(0.2, Math.min(3, level));
      applyTransform();
    },

    getZoom() { return currentZoom; },

    exportSvg(): string {
      return new XMLSerializer().serializeToString(svg);
    },

    destroy() {
      destroyed = true;
      resizeObserver.disconnect();
      svg.remove();
    },
  };

  // Initial render
  render();

  return instance;
}

// --- Tree Helpers ---

function findInTree(root: MindMapNode, id: string): MindMapNode | undefined {
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findInTree(child, id);
      if (found) return found;
    }
  }
  return undefined;
}

function removeFromTree(root: MindMapNode, id: string): boolean {
  if (root.children) {
    root.children = root.children.filter((c) => c.id !== id);
    for (const child of root.children) {
      removeFromTree(child, id);
    }
  }
  return root.id === id;
}
