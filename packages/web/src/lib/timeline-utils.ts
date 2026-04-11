/**
 * Timeline Utilities: Vertical timeline with event nodes, connecting lines,
 * alternating sides, icons, dates, and responsive layout.
 */

// --- Types ---

export type TimelineVariant = "default" | "dots" | "compact" | "bordered";
export type TimelineSide = "left" | "right" | "alternating";

export interface TimelineNode {
  /** Unique ID */
  id: string;
  /** Date or time label */
  date?: string;
  /** Title text */
  title: string;
  /** Description/body text */
  description?: string;
  /** Icon (HTML string) */
  icon?: string;
  /** Node variant: default, active, success, warning, error, info */
  variant?: "default" | "active" | "success" | "warning" | "error" | "info";
  /** Content element (shown when expanded or always visible) */
  content?: HTMLElement | string;
  /** Initially expanded? */
  expanded?: boolean;
  /** Click handler */
  onClick?: (node: TimelineNode) => void;
}

export interface TimelineOptions {
  /** Timeline nodes */
  nodes: TimelineNode[];
  /** Which side the line and nodes appear on */
  side?: TimelineSide;
  /** Visual variant */
  variant?: TimelineVariant;
  /** Show dates on each node */
  showDates?: boolean;
  /** Line color */
  lineColor?: string;
  /** Active/selected node ID */
  activeId?: string;
  /** Node click expands/collapses? */
  collapsible?: boolean;
  /** Show icons on nodes */
  showIcons?: boolean;
  /** Icon size in px */
  iconSize?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when a node is clicked */
  onNodeClick?: (node: TimelineNode, index: number) => void;
  /** Called when active node changes */
  onActiveChange?: (id: string | null) => void;
}

export interface TimelineInstance {
  /** The root timeline element */
  el: HTMLElement;
  /** Set active node by ID */
  setActive: (id: string) => void;
  /** Expand a node by ID */
  expandNode: (id: string) => void;
  /** Collapse a node by ID */
  collapseNode: (id: string) => void;
  /** Get expanded node IDs */
  getExpandedIds: () => string[];
  /** Update nodes dynamically */
  setNodes: (nodes: TimelineNode[]) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Variant Config ---

const NODE_COLORS: Record<string, { bg: string; border: string; iconBg: string }> = {
  "default": { bg: "#f3f4f6", border: "#e5e7eb", iconBg: "#e5e7eb" },
  "active": { bg: "#eff6ff", border: "#93c5fd", iconBg: "#dbeafe" },
  "success": { bg: "#ecfdf5", border: "#a7f3d0", iconBg: "#d1fae5" },
  "warning": { bg: "#fffbeb", border: "#fde68a", iconBg: "#fef3c7" },
  "error": { bg: "#fef2f2", border: "#fecaca", iconBg: "#fee2e2" },
  "info": { bg: "#eff6ff", border: "#bfdbfe", iconBg: "#dbeafe" },
};

// --- Core Factory ---

/**
 * Create a vertical timeline.
 *
 * @example
 * ```ts
 * const tl = createTimeline({
 *   nodes: [
 *     { id: "n1", date: "2024-01-15", title: "Project kickoff", variant: "success" },
 *     { id: "n2", date: "2024-02-01", title: "MVP demo", variant: "active" },
 *     { id: "n3", date: "2024-03-10", title: "Launch", variant: "error" },
 *   ],
 *   side: "alternating",
 * });
 * ```
 */
export function createTimeline(options: TimelineOptions): TimelineInstance {
  const {
    nodes,
    side = "left",
    variant = "default",
    showDates = false,
    lineColor = "#e5e7eb",
    activeId,
    collapsible = false,
    showIcons = true,
    iconSize = 24,
    className,
    container,
    onNodeClick,
    onActiveChange,
  } = options;

  let _nodes = [...nodes];
  const _expanded = new Set<string>(nodes.filter((n) => n.expanded).map((n) => n.id));

  const root = document.createElement("div");
  root.className = `timeline ${variant} ${side} ${className ?? ""}`.trim();
  root.style.cssText = "position:relative;";

  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function setActive(id: string): void {
    activeId = id;
    onActiveChange?.(id);
    _render();
  }

  function expandNode(id: string): void {
    _expanded.add(id);
    _updateNodeExpand(id, true);
  }

  function collapseNode(id: string): void {
    _expanded.delete(id);
    _updateNodeExpand(id, false);
  }

  function getExpandedIds(): string[] { return [..._expanded]; }

  function setNodes(newNodes: TimelineNode[]): void {
    _nodes = newNodes;
    _expanded.clear();
    newNodes.filter((n) => n.expanded).forEach((n) => _expanded.add(n.id));
    _render();
  }

  function destroy(): void { root.remove(); }

  // --- Render ---

  function _render(): void {
    root.innerHTML = "";

    _nodes.forEach((node, i) => => {
      const isEven = i % 2 === 0;
      const nodeSide = side === "alternating"
        ? (isEven ? "right" : "left")
        : side;
      const isExpanded = _expanded.has(node.id);
      const isActive = node.id === activeId;
      const colors = NODE_COLORS[node.variant ?? "default"];

      // Row
      const row = document.createElement("div");
      row.className = "timeline-row";
      row.dataset.nodeId = node.id;
      row.style.cssText =
        "display:flex;position:relative;margin-bottom:" + (variant === "compact" ? "12px" : "24px") + ";align-items:flex-start;";

      // Content side
      const contentSide = document.createElement("div");
      contentSide.className = "timeline-content";
      contentSide.style.cssText =
        `flex:1;min-width:0;padding-${nodeSide === "right" ? "0" : "24px"} 0;` +
        "position:relative;z-index:1;";

      // Dot/icon
      if (showIcons || variant === "dots") {
        const dot = document.createElement("div");
        dot.className = "timeline-dot";
        const size = variant === "dots" ? 10 : iconSize;
        dot.style.cssText =
          `width:${size}px;height:${size}px;border-radius:50%;` +
          `background:${colors.iconBg};flex-shrink:0;` +
          (nodeSide === "right" ? "order:1;margin-left:12px;" : "margin-right:12px;") +
          `display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.5)}px;` +
          `color:${isActive ? "#3b82f6" : "#9ca3af"};`;
        if (node.icon) dot.innerHTML = node.icon;
        contentSide.appendChild(dot);
      }

      // Date
      if (showDates && node.date) {
        const dateEl = document.createElement("div");
        dateEl.className = "timeline-date";
        dateEl.textContent = node.date;
        dateEl.style.cssText =
          "font-size:11px;color:#9ca3af;margin-bottom:2px;" +
          (nodeSide === "right" ? "text-align:right;" : "");
        contentSide.appendChild(dateEl);
      }

      // Title
      const titleEl = document.createElement("div");
      titleEl.className = "timeline-title";
      titleEl.textContent = node.title;
      titleEl.style.cssText =
        `font-size:14px;font-weight:600;color:#111827;line-height:1.3;` +
        (isActive ? "color:#2563eb;" : "");
      contentSide.appendChild(titleEl);

      // Description
      if (node.description) {
        const descEl = document.createElement("div");
        descEl.className = "timeline-desc";
        descEl.textContent = node.description;
        descEl.style.cssText = "font-size:13px;color:#6b7280;margin-top:2px;line-height:1.4;";
        contentSide.appendChild(descEl);
      }

      // Expanded content
      if (isExpanded && node.content) {
        const contentEl = document.createElement("div");
        contentEl.className = "timeline-expanded-content";
        contentEl.style.cssText =
          "margin-top:8px;padding:12px;background:#f9fafb;border-radius:6px;" +
          "font-size:13px;color:#374151;line-height:1.5;";
        if (typeof node.content === "string") contentEl.innerHTML = node.content;
        else contentEl.appendChild(node.content.cloneNode(true));
        contentSide.appendChild(contentEl);
      }

      // Click handler
      if (collapsible || node.onClick || onNodeClick) {
        const clickableArea = document.createElement("div");
        clickableArea.style.cssText =
          "position:absolute;inset:0;cursor:pointer;z-index:2;";
        clickableArea.addEventListener("click", (e) => {
          e.stopPropagation();
          if (collapsible) {
            if (_expanded.has(node.id)) collapseNode(node.id);
            else expandNode(node.id);
          }
          node.onClick?.(node);
          onNodeClick?.(node, i);
        });
        row.appendChild(clickableArea);
      }

      row.appendChild(contentSide);
      root.appendChild(row);
    });
  }

  // Draw connecting line
    _drawLine();

  // Update active state visuals
    if (activeId) {
      root.querySelectorAll(".timeline-dot").forEach((dot) => {
        const row = dot.closest(".timeline-row");
        if (row && (row as HTMLElement).dataset.nodeId === activeId) {
          dot.style.color = "#2563eb";
        }
      });
    }
  }

  function _updateNodeExpand(id: string, expanded: boolean): void {
    const row = root.querySelector(`[data-node-id="${id}"]`) as HTMLElement;
    if (!row) return;

    const existingContent = row.querySelector(".timeline-expanded-content");
    if (expanded) {
      const contentEl = document.createElement("div");
      contentEl.className = "timeline-expanded-content";
      contentEl.style.cssText =
        "margin-top:8px;padding:12px;background:#f9fafb;border-radius:6px;" +
        "font-size:13px;color:#374151;line-height:1.5;";
      const node = _nodes.find((n) => n.id === id);
      if (node?.content) {
        if (typeof node.content === "string") contentEl.innerHTML = node.content;
        else contentEl.appendChild(node.content.cloneNode(true));
      }
      const contentSide = row.querySelector(".timeline-content");
      contentSide?.appendChild(contentEl);
    } else {
      existingContent?.remove();
    }
  }

  function _drawLine(): void {
    // Remove existing line
    const existing = root.querySelector(".timeline-line");
    if (existing) existing.remove();

    const line = document.createElement("div");
    line.className = "timeline-line";
    line.style.cssText =
      "position:absolute;top:0;bottom:0;width:2px;" +
      `background:${lineColor};` +
      (side === "right" ? "right:18px;" : "left:18px;") +
      "z-index:0;";
    root.insertBefore(line, root.firstChild);
  }

  return { el: root, setActive, expandNode, collapseNode, getExpandedIds, setNodes, destroy };
}
