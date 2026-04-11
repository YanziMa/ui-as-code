/**
 * Circuit Board: Visual node-graph / flow diagram component with draggable nodes,
 * connection lines (bezier/straight), ports (input/output), zoom/pan, grid snapping,
 * selection, minimap, and serialization/deserialization.
 */

// --- Types ---

export type ConnectionStyle = "bezier" | "straight" | "step" | "rounded";
export type PortType = "input" | "output";
export type NodeShape = "rect" | "rounded" | "diamond" | "circle" | "pill";

export interface CircuitPort {
  id: string;
  label?: string;
  type: PortType;
  /** Max connections (0 = unlimited) */
  maxConnections?: number;
  color?: string;
  dataType?: string;
}

export interface CircuitNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  shape?: NodeShape;
  color?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  ports?: CircuitPort[];
  icon?: string;
  selected?: boolean;
  locked?: boolean;
  data?: Record<string, unknown>;
  customContent?: string | HTMLElement;
}

export interface CircuitConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  label?: string;
  color?: string;
  animated?: boolean;
  dashed?: boolean;
  data?: Record<string, unknown>;
}

export interface CircuitOptions {
  container: HTMLElement | string;
  nodes?: CircuitNode[];
  connections?: CircuitConnection[];
  /** Connection line style */
  connectionStyle?: ConnectionStyle;
  /** Show grid background? */
  showGrid?: boolean;
  /** Grid size in px */
  gridSize?: number;
  /** Snap to grid? */
  snapToGrid?: boolean;
  /** Enable panning (drag background) */
  pannable?: boolean;
  /** Enable zoom (scroll) */
  zoomable?: boolean;
  /** Min/max zoom */
  zoomRange?: [number, number];
  /** Draggable nodes? */
  draggable?: boolean;
  /** Selectable nodes? */
  selectable?: boolean;
  /** Multi-select with Ctrl/Cmd? */
  multiSelect?: boolean;
  /** Show minimap? */
  showMinimap?: boolean;
  /** Minimap size */
  minimapSize?: number;
  /** Callback on node move */
  onNodeMove?: (node: CircuitNode, x: number, y: number) => void;
  /** Callback on node select */
  onNodeSelect?: (node: CircuitNode | null) => void;
  /** Callback on connection create */
  onConnectionCreate?: (conn: CircuitConnection) => void;
  /** Callback on connection delete */
  onConnectionDelete?: (conn: CircuitConnection) => void;
  /** Callback on canvas click (deselect) */
  onCanvasClick?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface CircuitInstance {
  element: HTMLElement;
  getNodes: () => CircuitNode[];
  getConnections: () => CircuitConnection[];
  addNode: (node: CircuitNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<CircuitNode>) => void;
  addConnection: (conn: CircuitConnection) => void;
  removeConnection: (id: string) => void;
  getNodeById: (id: string) => CircuitNode | undefined;
  getConnectionById: (id: string) => CircuitConnection | undefined;
  getSelectedNodes: () => CircuitNode[];
  selectNode: (id: string) => void;
  deselectAll: () => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  panTo: (x: number, y: number) => void;
  centerView: () => void;
  fitToView: () => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  destroy: () => void;
}

// --- Constants ---

const DEFAULT_COLORS = {
  nodeBg: "#ffffff",
  nodeBorder: "#94a3b8",
  nodeSelected: "#6366f1",
  portInput: "#3b82f6",
  portOutput: "#10b981",
  connection: "#64748b",
  connectionActive: "#6366f1",
  gridLine: "#f0f0f0",
  selectionBox: "#6366f140",
};

// --- Main Class ---

export class CircuitBoardManager {
  create(options: CircuitOptions): CircuitInstance {
    const opts = {
      connectionStyle: options.connectionStyle ?? "bezier",
      showGrid: options.showGrid ?? true,
      gridSize: options.gridSize ?? 20,
      snapToGrid: options.snapToGrid ?? true,
      pannable: options.pannable ?? true,
      zoomable: options.zoomable ?? true,
      zoomRange: options.zoomRange ?? [0.2, 3],
      draggable: options.draggable ?? true,
      selectable: options.selectable ?? true,
      multiSelect: options.multiSelect ?? true,
      showMinimap: options.showMinimap ?? false,
      minimapSize: options.minimapSize ?? 150,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("CircuitBoard: container not found");

    container.className = `circuit-board ${opts.className ?? ""}`;
    container.style.cssText = `
      position:relative;overflow:hidden;width:100%;height:100%;
      background:${opts.showGrid ? "" : "#fff"};
      user-select:none;cursor:grab;font-family:-apple-system,sans-serif;
    `;

    // SVG layer for connections
    const svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgLayer.className = "cb-svg-layer";
    svgLayer.setAttribute("style", `
      position:absolute;top:0;left:0;width:100%;height:100%;
      pointer-events:none;z-index:1;overflow:visible;
    `);
    // Arrow marker definition
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="cb-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="${DEFAULT_COLORS.connection}"/>
      </marker>
      <marker id="cb-arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="${DEFAULT_COLORS.connectionActive}"/>
      </marker>
    `;
    svgLayer.appendChild(defs);
    container.appendChild(svgLayer);

    // Nodes layer
    const nodesLayer = document.createElement("div");
    nodesLayer.className = "cb-nodes-layer";
    nodesLayer.style.cssText = `
      position:absolute;top:0;left:0;width:100%;height:100%;
      z-index:2;transform-origin:0 0;
    `;
    container.appendChild(nodesLayer);

    // Grid pattern
    if (opts.showGrid) {
      const gridCanvas = document.createElement("canvas");
      gridCanvas.className = "cb-grid";
      gridCanvas.style.cssText = `
        position:absolute;top:0;left:0;width:100%;height:100%;
        z-index:0;pointer-events:none;
      `;
      container.insertBefore(gridCanvas, svgLayer);
    }

    // Minimap
    let minimapEl: HTMLCanvasElement | null = null;

    if (opts.showMinimap) {
      const minimapWrapper = document.createElement("div");
      minimapWrapper.style.cssText = `
        position:absolute;bottom:12px;right:12px;border:1px solid #e5e7eb;
        border-radius:6px;overflow:hidden;background:#fff;z-index:20;
        box-shadow:0 2px 8px rgba(0,0,0,0.1);
      `;
      minimapEl = document.createElement("canvas");
      minimapEl.width = opts.minimapSize;
      minimapEl.height = opts.minimapSize;
      minimapEl.style.display = "block";
      minimapWrapper.appendChild(minimapEl);
      container.appendChild(minimapWrapper);
    }

    // State
    let nodes: CircuitNode[] = [...(options.nodes ?? [])];
    let connections: CircuitConnection[] = [...(options.connections ?? [])];
    let selectedIds = new Set<string>();
    let destroyed = false;
    let zoom = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let dragNode: CircuitNode | null = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let connectingFrom: { nodeId: string; portId: string } | null = null;

    function render(): void {
      renderGrid();
      renderConnections();
      renderNodes();
      if (opts.showMinimap && minimapEl) renderMinimap();
    }

    function renderGrid(): void {
      if (!opts.showGrid) return;
      const gridCanvas = container.querySelector<HTMLCanvasElement>(".cb-grid");
      if (!gridCanvas) return;
      const rect = container.getBoundingClientRect();
      gridCanvas.width = rect.width * (window.devicePixelRatio || 1);
      gridCanvas.height = rect.height * (window.devicePixelRatio || 1);
      const ctx = gridCanvas.getContext("2d")!;
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      const size = opts.gridSize * zoom;
      if (size < 4) return;

      ctx.strokeStyle = DEFAULT_COLORS.gridLine;
      ctx.lineWidth = 0.5;

      const offsetX = (panX % size + size) % size;
      const offsetY = (panY % size + size) % size;

      for (let x = offsetX; x < rect.width; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke();
      }
      for (let y = offsetY; y < rect.height; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke();
      }
    }

    function renderConnections(): void {
      // Clear existing paths (keep defs)
      const existingPaths = svgLayer.querySelectorAll(":not(defs)");
      existingPaths.forEach((p) => p.remove());

      for (const conn of connections) {
        const srcNode = nodes.find((n) => n.id === conn.sourceNodeId);
        const tgtNode = nodes.find((n) => n.id === conn.targetNodeId);
        if (!srcNode || !tgtNode) continue;

        const srcPort = srcNode.ports?.find((p) => p.id === conn.sourcePortId);
        const tgtPort = tgtNode.ports?.find((p) => p.id === conn.targetPortId);

        const sx = transformX(srcNode.x + srcNode.width);
        const sy = transformY(srcNode.y + (srcNode.height ?? 40) / 2);
        const tx = transformX(tgtNode.x);
        const ty = transformY(tgtNode.y + (tgtNode.height ?? 40) / 2);

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const d = generatePath(sx, sy, tx, ty, opts.connectionStyle);
        path.setAttribute("d", d);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", conn.color ?? DEFAULT_COLORS.connection);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("marker-end", `url(#${connectingFrom?.portId === conn.sourcePortId ? "arrowhead-active" : "arrowhead"})`);
        if (conn.dashed) path.setAttribute("stroke-dasharray", "6,4");
        if (conn.animated) {
          path.style.animation = "cb-dash-flow 1s linear infinite";
        }
        path.dataset.connId = conn.id;
        path.style.pointerEvents = "stroke";
        path.style.cursor = "pointer";
        path.addEventListener("click", (e) => {
          e.stopPropagation();
          opts.onConnectionDelete?.(conn);
          instance.removeConnection(conn.id);
        });
        svgLayer.appendChild(path);

        // Label
        if (conn.label) {
          const midX = (sx + tx) / 2;
          const midY = (sy + ty) / 2 - 8;
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("x", String(midX));
          text.setAttribute("y", String(midY));
          text.setAttribute("text-anchor", "middle");
          text.setAttribute("font-size", "10");
          text.setAttribute("fill", "#64748b");
          text.textContent = conn.label;
          svgLayer.appendChild(text);
        }
      }

      // Temporary connection while dragging
      if (connectingFrom) {
        const srcNode = nodes.find((n) => n.id === connectingFrom.nodeId);
        if (srcNode) {
          const sx = transformX(srcNode.x + srcNode.width);
          const sy = transformY(srcNode.y + (srcNode.height ?? 40) / 2);
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", generatePath(sx, sy, lastMouseX, lastMouseY, opts.connectionStyle));
          path.setAttribute("fill", "none");
          path.setAttribute("stroke", DEFAULT_COLORS.connectionActive);
          path.setAttribute("stroke-width", "2");
          path.setAttribute("stroke-dasharray", "6,4");
          svgLayer.appendChild(path);
        }
      }
    }

    let lastMouseX = 0;
    let lastMouseY = 0;

    function generatePath(x1: number, y1: number, x2: number, y2: number, style: ConnectionStyle): string {
      switch (style) {
        case "straight":
          return `M ${x1} ${y1} L ${x2} ${y2}`;
        case "step": {
          const midX = (x1 + x2) / 2;
          return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
        }
        case "rounded": {
          const midX = (x1 + x2) / 2;
          const r = Math.min(Math.abs(midX - x1), Math.abs(y2 - y1)) / 2;
          return `M ${x1} ${y1} L ${midX - r} ${y1} Q ${midX} ${y1} ${midX} ${(y1 + y2) / 2} Q ${midX} ${y2} ${midX + r} ${y2} L ${x2} ${y2}`;
        }
        case "bezier":
        default: {
          const dx = Math.abs(x2 - x1);
          const cp = Math.max(dx * 0.4, 50);
          return `M ${x1} ${y1} C ${x1 + cp} ${y1}, ${x2 - cp} ${y2}, ${x2} ${y2}`;
        }
      }
    }

    function renderNodes(): void {
      nodesLayer.innerHTML = "";

      for (const node of nodes) {
        const el = createNodeElement(node);
        nodesLayer.appendChild(el);
      }
    }

    function createNodeElement(node: CircuitNode): HTMLElement {
      const el = document.createElement("div");
      el.className = "cb-node";
      el.dataset.nodeId = node.id;
      const shape = node.shape ?? "rect";
      const radius = shape === "rounded" ? "12px" : shape === "pill" ? "9999px" : shape === "circle" ? "50%" : shape === "diamond" ? "0" : "6px";

      el.style.cssText = `
        position:absolute;left:${transformX(node.x)}px;top:${transformY(node.y)}px;
        width:${node.width}px;height:${node.height}px;
        background:${node.color ?? DEFAULT_COLORS.nodeBg};
        border:2px solid ${node.selected ? DEFAULT_COLORS.nodeSelected : node.borderColor ?? DEFAULT_COLORS.nodeBorder};
        border-radius:${radius};
        display:flex;flex-direction:column;z-index:${node.selected ? 10 : 5};
        box-shadow:${node.selected ? "0 0 0 2px #c7d2fe, 0 4px 16px rgba(99,102,241,0.15)" : "0 1px 3px rgba(0,0,0,0.08)"};
        cursor:${opts.draggable && !node.locked ? "move" : "default"};
        transition:box-shadow 0.15s;
        font-size:${node.fontSize ?? 13}px;color:${node.textColor ?? "#374151"};
        overflow:hidden;
      `;

      // Header
      const header = document.createElement("div");
      header.style.cssText = `
        padding:6px 10px;background:${node.color ?? "#f8fafc"};border-bottom:1px solid #e5e7eb;
        font-weight:600;font-size:12px;display:flex;align-items:center;gap:6px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      `;
      if (node.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.textContent = node.icon;
        header.appendChild(iconSpan);
      }
      const titleSpan = document.createElement("span");
      titleSpan.textContent = node.label;
      titleSpan.title = node.label;
      header.appendChild(titleSpan);
      el.appendChild(header);

      // Body
      const body = document.createElement("div");
      body.style.cssText = "flex:1;padding:6px 10px;overflow:auto;";
      if (node.customContent) {
        if (typeof node.customContent === "string") body.innerHTML = node.customContent;
        else body.appendChild(node.customContent);
      }
      el.appendChild(body);

      // Ports
      if (node.ports && node.ports.length > 0) {
        const inputPorts = node.ports.filter((p) => p.type === "input");
        const outputPorts = node.ports.filter((p) => p.type === "output");

        for (const port of inputPorts) {
          const portEl = createPortEl(port, node, "left");
          el.appendChild(portEl);
        }
        for (const port of outputPorts) {
          const portEl = createPortEl(port, node, "right");
          el.appendChild(portEl);
        }
      }

      // Selection event
      el.addEventListener("mousedown", (e) => {
        if ((e.target as HTMLElement).classList.contains("cb-port")) return;

        if (opts.selectable) {
          if (e.ctrlKey || e.metaKey) {
            if (selectedIds.has(node.id)) selectedIds.delete(node.id);
            else selectedIds.add(node.id);
          } else {
            selectedIds.clear();
            selectedIds.add(node.id);
          }
          node.selected = true;
          opts.onNodeSelect?.(node);
          render();
        }

        if (opts.draggable && !node.locked) {
          e.preventDefault();
          dragNode = node;
          const rect = el.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          dragOffsetX = e.clientX - rect.left;
          dragOffsetY = e.clientY - rect.top;
          el.style.zIndex = "20";
        }
      });

      return el;
    }

    function createPortEl(port: CircuitPort, node: CircuitNode, side: "left" | "right"): HTMLElement {
      const el = document.createElement("div");
      el.className = "cb-port";
      el.dataset.portId = port.id;
      el.dataset.nodeId = node.id;
      const portColor = port.color ?? (port.type === "input" ? DEFAULT_COLORS.portInput : DEFAULT_COLORS.portOutput);
      el.style.cssText = `
        position:absolute;${side}:-8px;top:50%;transform:translateY(-50%);
        width:14px;height:14px;border-radius:50%;
        background:${portColor};border:2px solid #fff;
        cursor:crosshair;z-index:15;transition:transform 0.1s,box-shadow 0.1s;
      `;
      if (port.label) {
        const label = document.createElement("span");
        label.textContent = port.label;
        label.style.cssText = `
          position:absolute;${side === "left" ? "right" : "left"}:18px;top:50%;
          transform:translateY(-50%);font-size:10px;color:#6b7280;white-space:nowrap;
          pointer-events:none;
        `;
        el.appendChild(label);
      }

      el.addEventListener("mouseenter", () => {
        el.style.transform = "translateY(-50%) scale(1.3)";
        el.style.boxShadow = `0 0 6px ${portColor}`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "translateY(-50%) scale(1)";
        el.style.boxShadow = "";
      });

      el.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        if (port.type === "output") {
          connectingFrom = { nodeId: node.id, portId: port.id };
        }
      });

      el.addEventListener("mouseup", (e) => {
        if (connectingFrom && port.type === "input") {
          const newConn: CircuitConnection = {
            id: `conn-${Date.now()}`,
            sourceNodeId: connectingFrom.nodeId,
            sourcePortId: connectingFrom.portId,
            targetNodeId: node.id,
            targetPortId: port.id,
          };
          instance.addConnection(newConn);
          opts.onConnectionCreate?.(newConn);
        }
        connectingFrom = null;
        render();
      });

      return el;
    }

    function transformX(x: number): number { return x * zoom + panX; }
    function transformY(y: number): number { return y * zoom + panY; }

    function inverseTransformX(screenX: number): number { return (screenX - panX) / zoom; }
    function inverseTransformY(screenY: number): number { return (screenY - panY) / zoom; }

    function snap(v: number): number {
      if (!opts.snapToGrid) return v;
      return Math.round(v / opts.gridSize) * opts.gridSize;
    }

    function renderMinimap(): void {
      if (!minimapEl) return;
      const ctx = minimapEl.getContext("2d")!;
      const w = minimapEl.width;
      const h = minimapEl.height;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, w, h);

      if (nodes.length === 0) return;

      // Find bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
      }

      const pad = 20;
      const scaleX = (w - pad * 2) / Math.max(maxX - minX, 1);
      const scaleY = (h - pad * 2) / Math.max(maxY - minY, 1);
      const scale = Math.min(scaleX, scaleY);

      // Draw nodes
      for (const n of nodes) {
        ctx.fillStyle = n.selected ? DEFAULT_COLORS.nodeSelected : "#94a3b8";
        ctx.fillRect(
          pad + (n.x - minX) * scale,
          pad + (n.y - minY) * scale,
          Math.max(n.width * scale, 2),
          Math.max(n.height * scale, 2),
        );
      }

      // Draw viewport indicator
      const rect = container.getBoundingClientRect();
      const vpW = (rect.width / zoom) * scale;
      const vpH = (rect.height / zoom) * scale;
      const vpX = pad + (-panX / zoom - minX) * scale;
      const vpY = pad + (-panY / zoom - minY) * scale;
      ctx.strokeStyle = DEFAULT_COLORS.nodeSelected;
      ctx.lineWidth = 1;
      ctx.strokeRect(vpX, vpY, vpW, vpH);
    }

    // --- Event Handlers ---

    container.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.classList.contains("cb-node") || target.classList.contains("cb-port")) return;

      if (opts.pannable) {
        isPanning = true;
        panStartX = e.clientX - panX;
        panStartY = e.clientY - panY;
        container.style.cursor = "grabbing";
      }

      if (opts.selectable) {
        selectedIds.clear();
        for (const n of nodes) n.selected = false;
        opts.onNodeSelect?.(null);
        opts.onCanvasClick?.();
        render();
      }
    });

    container.addEventListener("mousemove", (e) => {
      lastMouseX = e.clientX - container.getBoundingClientRect().left;
      lastMouseY = e.clientY - container.getBoundingClientRect().top;

      if (isPanning) {
        panX = e.clientX - panStartX;
        panY = e.clientY - panStartY;
        render();
      }

      if (dragNode) {
        const newX = snap(inverseTransformX(e.clientX - container.getBoundingClientRect().left - dragOffsetX));
        const newY = snap(inverseTransformY(e.clientY - container.getBoundingClientRect().top - dragOffsetY));
        dragNode.x = newX;
        dragNode.y = newY;
        opts.onNodeMove?.(dragNode, newX, newY);
        render();
      }

      if (connectingFrom) {
        renderConnections();
      }
    });

    container.addEventListener("mouseup", () => {
      if (isPanning) {
        isPanning = false;
        container.style.cursor = "grab";
      }
      if (dragNode) {
        dragNode = null;
        render();
      }
      if (connectingFrom) {
        connectingFrom = null;
        render();
      }
    });

    container.addEventListener("mouseleave", () => {
      if (isPanning) {
        isPanning = false;
        container.style.cursor = "grab";
      }
    });

    // Zoom with wheel
    if (opts.zoomable) {
      container.addEventListener("wheel", (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        const newZoom = clamp(zoom * delta, opts.zoomRange![0], opts.zoomRange![1]);
        if (newZoom !== zoom) {
          // Zoom toward mouse position
          const rect = container.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          panX = mx - (mx - panX) * (newZoom / zoom);
          panY = my - (my - panY) * (newZoom / zoom);
          zoom = newZoom;
          render();
        }
      }, { passive: false });
    }

    // Inject CSS animation for animated connections
    if (!document.getElementById("cb-styles")) {
      const style = document.createElement("style");
      style.id = "cb-styles";
      style.textContent = `
        @keyframes cb-dash-flow { to { stroke-dashoffset: -10; } }
      `;
      document.head.appendChild(style);
    }

    // Initial render
    render();

    const instance: CircuitInstance = {
      element: container,

      getNodes() { return [...nodes]; },
      getConnections() { return [...connections]; },

      addNode(newNode) {
        nodes.push(newNode);
        render();
      },

      removeNode(id) {
        nodes = nodes.filter((n) => n.id !== id);
        connections = connections.filter((c) => c.sourceNodeId !== id && c.targetNodeId !== id);
        selectedIds.delete(id);
        render();
      },

      updateNode(id, updates) {
        const node = nodes.find((n) => n.id === id);
        if (node) Object.assign(node, updates);
        render();
      },

      addConnection(conn) {
        connections.push(conn);
        render();
      },

      removeConnection(id) {
        connections = connections.filter((c) => c.id !== id);
        render();
      },

      getNodeById(id) { return nodes.find((n) => n.id === id); },
      getConnectionById(id) { return connections.find((c) => c.id === id); },

      getSelectedNodes() { return nodes.filter((n) => selectedIds.has(n.id)); },

      selectNode(id) {
        selectedIds.clear();
        selectedIds.add(id);
        for (const n of nodes) n.selected = n.id === id;
        opts.onNodeSelect?.(nodes.find((n) => n.id === id)!);
        render();
      },

      deselectAll() {
        selectedIds.clear();
        for (const n of nodes) n.selected = false;
        render();
      },

      setZoom(newZoom) {
        zoom = clamp(newZoom, opts.zoomRange![0], opts.zoomRange![1]);
        render();
      },

      getZoom() { return zoom; },

      panTo(x, y) { panX = x; panY = y; render(); },

      centerView() {
        if (nodes.length === 0) return;
        const rect = container.getBoundingClientRect();
        let sumX = 0, sumY = 0;
        for (const n of nodes) { sumX += n.x + n.width / 2; sumY += n.y + n.height / 2; }
        panX = rect.width / 2 - (sumX / nodes.length) * zoom;
        panY = rect.height / 2 - (sumY / nodes.length) * zoom;
        render();
      },

      fitToView() {
        if (nodes.length === 0) return;
        const rect = container.getBoundingClientRect();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) {
          minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
          maxX = Math.max(maxX, n.x + n.width); maxY = Math.max(maxY, n.y + n.height);
        }
        const contentW = maxX - minX;
        const contentH = maxY - minY;
        zoom = Math.min(rect.width / contentW, rect.height / contentH, opts.zoomRange![1]);
        zoom = Math.max(zoom, opts.zoomRange![0]);
        panX = (rect.width - contentW * zoom) / 2 - minX * zoom + 20;
        panY = (rect.height - contentH * zoom) / 2 - minY * zoom + 20;
        render();
      },

      exportJSON() {
        return JSON.stringify({ nodes, connections, zoom, pan: { x: panX, y: panY } }, null, 2);
      },

      importJSON(json) {
        try {
          const data = JSON.parse(json);
          if (data.nodes) nodes = data.nodes;
          if (data.connections) connections = data.connections;
          if (data.zoom != null) zoom = data.zoom;
          if (data.pan) { panX = data.pan.x; panY = data.pan.y; }
          render();
        } catch {}
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a circuit board */
export function createCircuitBoard(options: CircuitOptions): CircuitInstance {
  return new CircuitBoardManager().create(options);
}
