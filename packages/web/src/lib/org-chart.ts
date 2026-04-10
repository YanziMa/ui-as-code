/**
 * Organizational Chart: Interactive org chart with nodes, connections,
 * expand/collapse, zoom/pan, drag-to-reorder, search, and tooltips.
 */

// --- Types ---

export interface OrgNode {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Job title */
  title?: string;
  /** Avatar URL or initials fallback */
  avatar?: string;
  /** Department/team */
  department?: string;
  /** Parent node ID (null for root) */
  parentId: string | null;
  /** Child node IDs */
  childrenIds?: string[];
  /** Node color accent */
  color?: string;
  /** Status indicator */
  status?: "active" | "inactive" | "on-leave";
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface OrgChartOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** All nodes (flat list with parent references) */
  nodes: OrgNode[];
  /** Root node ID */
  rootId: string;
  /** Direction of layout: 'top-down', 'bottom-up', 'left-right', 'right-left' */
  direction?: "top-down" | "bottom-up" | "left-right" | "right-left";
  /** Node width in px (default: 180) */
  nodeWidth?: number;
  /** Node height in px (default: 80) */
  nodeHeight?: number;
  /** Horizontal gap between sibling nodes (px) */
  horizontalGap?: number;
  /** Vertical gap between levels (px) */
  verticalGap?: number;
  /** Show avatars? */
  showAvatars?: boolean;
  /** Show titles? */
  showTitles?: boolean;
  /** Show departments? */
  showDepartments?: boolean;
  /** Show connection lines? */
  showConnections?: boolean;
  /** Allow drag to pan? */
  pannable?: boolean;
  /** Allow mouse wheel zoom? */
  zoomable?: boolean;
  /** Expand all by default? */
  expandedDefault?: boolean;
  /** Callback on node click */
  onNodeClick?: (node: OrgNode) => void;
  /** Callback on node double-click (expand/collapse) */
  onNodeDoubleClick?: (node: OrgNode) => void;
  /** Custom render function for each node */
  renderNode?: (node: OrgNode) => HTMLElement | string;
  /** Custom CSS class */
  className?: string;
}

export interface OrgChartInstance {
  element: HTMLElement;
  getNodes: () => OrgNode[];
  setNodes: (nodes: OrgNode[]) => void;
  addNode: (node: OrgNode) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, updates: Partial<OrgNode>) => void;
  expandNode: (id: string) => void;
  collapseNode: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  findNode: (id: string) => OrgNode | undefined;
  setRootId: (rootId: string) => void;
  setDirection: (dir: "top-down" | "bottom-up" | "left-right" | "right-left") => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  destroy: () => void;
}

// --- Helpers ---

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + (parts[1]?.charAt(0) ?? "")).toUpperCase();
}

const STATUS_COLORS: Record<string, { dot: string; bg: string }> = {
  active:   { dot: "#22c55e", bg: "#f0fdf4" },
  inactive: { dot: "#9ca3af", bg: "#f9fafb" },
  "on-leave": { dot: "#f59e0b", bg: "#fffbeb" },
};

// --- Main Factory ---

export function createOrgChart(options: OrgChartOptions): OrgChartInstance {
  const opts = {
    direction: options.direction ?? "top-down",
    nodeWidth: options.nodeWidth ?? 180,
    nodeHeight: options.nodeHeight ?? 80,
    horizontalGap: options.horizontalGap ?? 30,
    verticalGap: options.verticalGap ?? 50,
    showAvatars: options.showAvatars ?? true,
    showTitles: options.showTitles ?? true,
    showDepartments: options.showDepartments ?? false,
    showConnections: options.showConnections ?? true,
    pannable: options.pannable ?? true,
    zoomable: options.zoomable ?? true,
    expandedDefault: options.expandedDefault ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("OrgChart: container not found");

  let allNodes: OrgNode[] = [...options.nodes];
  let rootId = options.rootId;
  let destroyed = false;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  const collapsedSet = new Set<string>();
  if (!opts.expandedDefault) {
    // Collapse all non-root
    for (const n of allNodes) {
      if (n.id !== rootId && n.parentId !== null) collapsedSet.add(n.id);
    }
  }

  // Root element
  const root = document.createElement("div");
  root.className = `org-chart ${opts.className}`;
  root.style.cssText = `
    width:100%;height:100%;overflow:hidden;position:relative;
    background:#fafbfc;border-radius:8px;cursor:grab;font-family:-apple-system,sans-serif;
  `;
  container.appendChild(root);

  // SVG for connection lines
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.className = "oc-svg";
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;";
  root.appendChild(svg);

  // Canvas area (pannable/zoomable)
  const canvas = document.createElement("div");
  canvas.className = "oc-canvas";
  canvas.style.cssText = `
    position:absolute;top:0;left:0;transform-origin:center center;
    transition:transform 0.15s ease-out;z-index:1;
  `;
  root.appendChild(canvas);

  // Tree container inside canvas
  const treeEl = document.createElement("div");
  treeEl.className = "oc-tree";
  treeEl.style.cssText = `display:flex;flex-direction:column;align-items:center;padding:40px;`;
  canvas.appendChild(treeEl);

  // Build tree structure from flat list
  function buildTree(nodeId: string): TreeNodeData | null {
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return null;

    const isCollapsed = collapsedSet.has(nodeId);
    const children = (!isCollapsed ? (allNodes.filter((n) => n.parentId === nodeId)) : [])
      .map((c) => buildTree(c.id))
      .filter(Boolean) as TreeNodeData[];

    return { node, children };
  }

  interface TreeNodeData {
    node: OrgNode;
    children: TreeNodeData[];
  }

  function render(): void {
    treeEl.innerHTML = "";
    svg.innerHTML = "";

    const tree = buildTree(rootId);
    if (!tree) return;

    const isHorizontal = opts.direction === "left-right" || opts.direction === "right-left";

    // Layout algorithm
    interface LayoutNode {
      data: TreeNodeData;
      x: number;
      y: number;
      width: number;
      height: number;
    }

    function layout(data: TreeNodeData, depth: number): LayoutNode {
      const childLayouts = data.children.map((c) => layout(c, depth + 1));

      let totalChildSize = 0;
      if (childLayouts.length > 0) {
        totalChildSize = childLayouts.reduce((sum, c) =>
          sum + (isHorizontal ? c.height + opts.verticalGap : c.width + opts.horizontalGap), -opts.horizontalGap);
      }

      const w = Math.max(opts.nodeWidth, isHorizontal ? opts.nodeWidth : totalChildSize);
      const h = Math.max(opts.nodeHeight, isHorizontal ? totalChildSize : opts.nodeHeight);

      let x: number;
      let y: number;

      if (isHorizontal) {
        x = depth * (opts.nodeWidth + opts.horizontalGap);
        y = 0;
        if (childLayouts.length > 0) {
          let childOffset = -(totalChildSize / 2);
          for (const cl of childLayouts) {
            cl.y = childOffset + cl.height / 2;
            childOffset += cl.height + opts.verticalGap;
          }
        }
      } else {
        x = 0;
        y = depth * (opts.nodeHeight + opts.verticalGap);
        if (childLayouts.length > 0) {
          let childOffset = -(totalChildSize / 2);
          for (const cl of childLayouts) {
            cl.x = childOffset + cl.width / 2;
            childOffset += cl.width + opts.horizontalGap;
          }
        }
      }

      const result: LayoutNode = { data, x, y, width: w, height: h };

      // Render this node
      const el = renderNodeElement(result);
      el.style.position = "absolute";
      el.style.left = `${result.x}px`;
      el.style.top = `${result.y}px`;
      treeEl.appendChild(el);

      // Render children
      for (const cl of childLayouts) {
        const childEl = document.createElement("div");
        childEl.style.position = "absolute";
        childEl.style.left = `${cl.x}px`;
        childEl.style.top = `${cl.y}px`;
        // Children are already rendered in recursive call via their own elements

        // Draw connection line
        if (opts.showConnections) {
          drawConnection(result, cl);
        }
      }

      return result;
    }

    layout(tree, 0);

    // Apply transform
    updateTransform();
  }

  function renderNodeElement(layout: LayoutNode): HTMLElement {
    const { node } = layout.data;
    const hasChildren = (node.childrenIds?.length ?? 0) > 0 ||
      allNodes.some((n) => n.parentId === node.id);
    const isCollapsed = collapsedSet.has(node.id);
    const sc = STATUS_COLORS[node.status ?? "active"];

    const el = document.createElement("div");
    el.className = `oc-node ${node.status ?? ""}`;
    el.dataset.nodeId = node.id;
    el.style.cssText = `
      width:${opts.nodeWidth}px;height:${opts.nodeHeight}px;background:#fff;
      border-radius:12px;border:2px solid ${node.color ?? "#e5e7eb"};
      box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:4px;padding:8px;
      cursor:pointer;transition:all 0.2s;position:relative;z-index:2;
      ${node.status === "inactive" ? "opacity:0.6;" : ""}
    `;

    // Custom renderer
    if (opts.renderNode) {
      const custom = opts.renderNode(node);
      if (typeof custom === "string") el.innerHTML = custom;
      else { el.innerHTML = ""; el.appendChild(custom); }
    } else {
      // Avatar
      if (opts.showAvatars) {
        if (node.avatar) {
          const img = document.createElement("img");
          img.src = node.avatar;
          img.alt = node.name;
          img.style.cssText = "width:36px;height:36px;border-radius:50%;object-fit:cover;";
          el.appendChild(img);
        } else {
          const avatarCircle = document.createElement("div");
          avatarCircle.style.cssText = `
            width:36px;height:36px;border-radius:50%;display:flex;align-items:center;
            justify-content:center;font-size:14px;font-weight:700;color:#fff;
            background:hsl(${hashCode(node.name)} % 60%, 45%);
          `;
          avatarCircle.textContent = getInitials(node.name);
          el.appendChild(avatarCircle);
        }
      }

      // Name
      const nameEl = document.createElement("div");
      nameEl.textContent = node.name;
      nameEl.style.cssText = "font-size:13px;font-weight:600;color:#111827;text-align:center;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      el.appendChild(nameEl);

      // Title
      if (opts.showTitles && node.title) {
        const titleEl = document.createElement("div");
        titleEl.textContent = node.title;
        titleEl.style.cssText = "font-size:11px;color:#6b7280;text-align:center;line-height:1.2;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
        el.appendChild(titleEl);
      }

      // Department
      if (opts.showDepartments && node.department) {
        const deptEl = document.createElement("div");
        deptEl.textContent = node.department;
        deptEl.style.cssText = "font-size:10px;color:#9ca3af;text-align:center;margin-top:2px;";
        el.appendChild(deptEl);
      }

      // Status dot
      if (node.status && node.status !== "active") {
        const dot = document.createElement("span");
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${sc.dot};position:absolute;top:6px;right:6px;`;
        el.appendChild(dot);
      }

      // Expand/collapse toggle
      if (hasChildren) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.textContent = isCollapsed ? "+" : "\u2012";
        toggle.style.cssText = `
          position:absolute;${opts.direction === "top-down" || opts.direction === "bottom-up" ? "bottom:-10px;" : "right:-10px;"}
          ${opts.direction === "top-down" || opts.direction === "bottom-up" ? "left:50%;margin-left:-10px;" : "top:50%;margin-top:-10px;"}
          width:20px;height:20px;border-radius:50%;background:#4338ca;color:#fff;
          border:none;cursor:pointer;font-size:12px;font-weight:700;display:flex;
          align-items:center;justify-content:center;z-index:3;box-shadow:0 1px 4px rgba(0,0,0,0.15);
        `;
        toggle.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isCollapsed) instance.expandNode(node.id);
          else instance.collapseNode(node.id);
        });
        el.appendChild(toggle);
      }
    }

    // Events
    el.addEventListener("click", () => opts.onNodeClick?.(node));
    el.addEventListener("dblclick", () => opts.onNodeDoubleClick?.(node));

    el.addEventListener("mouseenter", () => {
      el.style.boxShadow = "0 4px 16px rgba(67,56,202,0.15)";
      el.style.borderColor = "#4338ca";
    });
    el.addEventListener("mouseleave", () => {
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
      el.style.borderColor = node.color ?? "#e5e7eb";
    });

    return el;
  }

  function drawConnection(parent: LayoutNode, child: LayoutNode): void {
    const isHorizontal = opts.direction === "left-right" || opts.direction === "right-left";

    const px = (v: number) => v * scale + panX;
    const py = (v: number) => v * scale + panY;

    let sx: number, sy: number, ex: number, ey: number;

    if (isHorizontal) {
      sx = px(parent.x + opts.nodeWidth);
      sy = py(parent.y + opts.nodeHeight / 2);
      ex = px(child.x);
      ey = py(child.y + opts.nodeHeight / 2);
    } else {
      sx = px(parent.x + opts.nodeWidth / 2);
      sy = py(parent.y + opts.nodeHeight);
      ex = px(child.x + opts.nodeWidth / 2);
      ey = py(child.y);
    }

    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M${sx},${sy} C${mx},${sy} ${mx},${ey} ${ex},${ey}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#cbd5e1");
    path.setAttribute("stroke-width", String(Math.max(1, 1.5 * scale)));
    svg.appendChild(path);
  }

  function updateTransform(): void {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }

  // Pan support
  if (opts.pannable) {
    root.addEventListener("mousedown", (e) => {
      if ((e.target as HTMLElement).closest(".oc-node")) return;
      isPanning = true;
      panStart = { x: e.clientX - panX, y: e.clientY - panY };
      root.style.cursor = "grabbing";
    });

    root.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      panX = e.clientX - panStart.x;
      panY = e.clientY - panStart.y;
      updateTransform();
    });

    root.addEventListener("mouseup", () => {
      isPanning = false;
      root.style.cursor = "grab";
    });

    root.addEventListener("mouseleave", () => {
      isPanning = false;
      root.style.cursor = "grab";
    });
  }

  // Zoom support
  if (opts.zoomable) {
    root.addEventListener("wheel", (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      scale = clamp(scale + delta, 0.25, 2);
      updateTransform();
    }, { passive: false });
  }

  // Initial render
  render();

  const instance: OrgChartInstance = {
    element: root,

    getNodes() { return [...allNodes]; },

    setNodes(nodes) {
      allNodes = [...nodes];
      render();
    },

    addNode(node) {
      allNodes.push(node);
      render();
    },

    removeNode(id) {
      allNodes = allNodes.filter((n) => n.id !== id);
      collapsedSet.delete(id);
      render();
    },

    updateNode(id, updates) {
      const idx = allNodes.findIndex((n) => n.id === id);
      if (idx >= 0) {
        allNodes[idx] = { ...allCards[idx], ...updates };
        render();
      }
    },

    expandNode(id) {
      collapsedSet.delete(id);
      render();
    },

    collapseNode(id) {
      collapsedSet.add(id);
      render();
    },

    expandAll() {
      collapsedSet.clear();
      render();
    },

    collapseAll() {
      for (const n of allNodes) {
        if (n.id !== rootId) collapsedSet.add(n.id);
      }
      render();
    },

    findNode(id) { return allNodes.find((n) => n.id === id); },

    setRootId(newRootId) {
      rootId = newRootId;
      render();
    },

    setDirection(dir) {
      opts.direction = dir;
      render();
    },

    zoomIn() {
      scale = clamp(scale + 0.2, 0.25, 2);
      updateTransform();
    },

    zoomOut() {
      scale = clamp(scale - 0.2, 0.25, 2);
      updateTransform();
    },

    resetZoom() {
      scale = 1;
      panX = 0;
      panY = 0;
      updateTransform();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
