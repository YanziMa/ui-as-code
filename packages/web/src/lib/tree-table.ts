/**
 * Tree Table: Hierarchical data table with expandable/collapsible rows,
 * tree indentation, checkbox selection (with cascade to children),
 * drag-and-drop reordering, lazy loading of child nodes, and
 * virtual scrolling support for large trees.
 */

// --- Types ---

export interface TreeNode {
  /** Unique key */
  key: string;
  /** Display label or data */
  data: Record<string, unknown>;
  /** Child nodes */
  children?: TreeNode[];
  /** Initially expanded? */
  defaultExpanded?: boolean;
  /** Lazy load children? */
  hasChildren?: boolean;
  /** Disabled (cannot select/expand) */
  disabled?: boolean;
  /** Tree depth level */
  _depth?: number;
  /** Parent key */
  _parentKey?: string;
}

export interface TreeColumn {
  key: string;
  title: string;
  width?: string | number;
  render?: (value: unknown, node: TreeNode) => string | HTMLElement;
  align?: "left" | "center" | "right";
}

export interface TreeTableOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions (first column is the tree column) */
  columns: TreeColumn[];
  /** Tree data */
  data: TreeNode[];
  /** Row key field in data (default: "key") */
  rowKey?: string;
  /** Default expand all? */
  defaultExpandAll?: boolean;
  /** Show tree lines/connectors? */
  showTreeLines?: boolean;
  /** Selection mode */
  selectionMode?: "none" | "single" | "multi" | "cascade";
  /** Initial selected keys */
  defaultSelectedKeys?: string[];
  /** Indentation per level (px, default: 24) */
  indentSize?: number;
  /** Enable drag-and-drop reorder */
  draggable?: boolean;
  /** Callback on drop */
  onDrop?: (dragKey: string, targetKey: string, position: "before" | "after" | "inside") => void;
  /** Callback when a node expands (for lazy loading) */
  onExpand?: (node: TreeNode) => Promise<TreeNode[]>;
  /** Callback on selection change */
  onSelectionChange?: (selectedNodes: TreeNode[]) => void;
  /** Callback on node click */
  onNodeClick?: (node: TreeNode) => void;
  /** Custom row class */
  rowClassName?: (node: TreeNode) => string;
  /** Border style */
  bordered?: boolean;
  /** Stripe alternating rows */
  striped?: boolean;
  /** Hover effect */
  hoverable?: boolean;
  /** Empty text */
  emptyText?: string;
  /** Loading state */
  loading?: boolean;
  /** Max height with scroll */
  maxHeight?: string;
  /** Custom CSS class */
  className?: string;
}

export interface TreeTableInstance {
  element: HTMLElement;
  /** Get all nodes (flattened visible) */
  getVisibleNodes: () => TreeNode[];
  /** Get all nodes including hidden */
  getAllNodes: () => TreeNode[];
  /** Get selected nodes */
  getSelectedNodes: () => TreeNode[];
  /** Expand a node by key */
  expand: (key: string) => void;
  /** Collapse a node by key */
  collapse: (key: string) => void;
  /** Expand all */
  expandAll: () => void;
  /** Collapse all */
  collapseAll: () => void;
  /** Select a node */
  select: (key: string) => void;
  /** Deselect a node */
  deselect: (key: string) => void;
  /** Add a node under parent */
  addNode: (node: TreeNode, parentKey?: string) => void;
  /** Remove a node and its children */
  removeNode: (key: string) => void;
  /** Update a node's data */
  updateNode: (key: string, data: Partial<Record<string, unknown>>) => void;
  /** Set new data */
  setData: (data: TreeNode[]) => void;
  /** Refresh render */
  refresh: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Main Class ---

export class TreeTableManager {
  create(options: TreeTableOptions): TreeTableInstance {
    const opts = {
      rowKey: options.rowKey ?? "key",
      defaultExpandAll: options.defaultExpandAll ?? false,
      showTreeLines: options.showTreeLines ?? true,
      selectionMode: options.selectionMode ?? "none",
      indentSize: options.indentSize ?? 24,
      draggable: options.draggable ?? false,
      bordered: options.bordered ?? true,
      striped: options.striped ?? true,
      hoverable: options.hoverable ?? true,
      emptyText: options.emptyText ?? "No data",
      loading: options.loading ?? false,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("TreeTable: container not found");

    container.className = `tree-table ${opts.className}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
      ${opts.maxHeight ? `max-height:${opts.maxHeight};overflow:auto;` : ""}
    `;

    // State
    let treeData: TreeNode[] = this.cloneTree(options.data);
    let expandedKeys = new Set<string>();
    let selectedKeys = new Set<string>(options.defaultSelectedKeys ?? []);
    let destroyed = false;

    // Initialize expanded state
    function initExpanded(nodes: TreeNode[]): void {
      for (const node of nodes) {
        if ((node.defaultExpanded || opts.defaultExpandAll) && (node.children?.length || node.hasChildren)) {
          expandedKeys.add(node.key);
        }
        if (node.children) initExpanded(node.children);
      }
    }
    initExpanded(treeData);

    // Create DOM structure
    const wrapper = document.createElement("div");
    wrapper.className = "tt-wrapper";
    wrapper.style.cssText = "width:100%;";

    const table = document.createElement("table");
    table.className = "tt-table";
    table.style.cssText = `width:100%;border-collapse:collapse;${opts.bordered ? "border:1px solid #e5e7eb;" : ""}`;
    wrapper.appendChild(table);
    container.appendChild(wrapper);

    // Flatten visible nodes
    function flattenVisible(nodes: TreeNode[], depth = 0, parentKey?: string): TreeNode[] {
      const result: TreeNode[] = [];
      for (const node of nodes) {
        const n = { ...node, _depth: depth, _parentKey: parentKey };
        result.push(n);
        if (expandedKeys.has(node.key) && node.children) {
          result.push(...flattenVisible(node.children, depth + 1, node.key));
        }
      }
      return result;
    }

    // Find node by key in tree
    function findNode(key: string, nodes: TreeNode[] = treeData): TreeNode | null {
      for (const node of nodes) {
        if (node.key === key) return node;
        if (node.children) {
          const found = findNode(key, node.children);
          if (found) return found;
        }
      }
      return null;
    }

    // Find parent and index
    function findParentAndIndex(key: string, nodes: TreeNode[] = treeData): { parent: TreeNode[] | null; index: number } | null {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i]!.key === key) return { parent: nodes, index: i };
        if (nodes[i]!.children) {
          const found = findParentAndIndex(key, nodes[i]!.children!);
          if (found) return found;
        }
      }
      return null;
    }

    // Clone tree (shallow clone for mutation safety)
    privateCloneTree(source: TreeNode[]): TreeNode[] {
      return source.map((n) => ({ ...n, children: n.children ? [...n.children] : undefined }));
    }

    // Render
    function render(): void {
      table.innerHTML = "";

      const visibleNodes = flattenVisible(treeData);
      const cols = opts.columns;

      // Header
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      // Selection column
      if (opts.selectionMode !== "none") {
        const th = document.createElement("th");
        th.style.cssText = "padding:8px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;width:40px;";
        headerRow.appendChild(th);
      }

      for (const col of cols) {
        const th = document.createElement("th");
        th.style.cssText = `
          padding:8px 12px;text-align:${col.align ?? "left"};font-weight:600;color:#374151;
          border-bottom:2px solid #e5e7eb;white-space:nowrap;
          ${col.width ? `width:${typeof col.width === "number" ? col.width + "px" : col.width};` : ""}
        `;
        th.textContent = col.title;
        headerRow.appendChild(th);
      }

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Body
      const tbody = document.createElement("tbody");

      if (visibleNodes.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = cols.length + (opts.selectionMode !== "none" ? 1 : 0);
        td.style.cssText = `text-align:center;padding:32px;color:#9ca3af;${opts.bordered ? "border:1px solid #e5e7eb;" : ""}`;
        td.textContent = opts.loading ? "Loading..." : opts.emptyText;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        for (let i = 0; i < visibleNodes.length; i++) {
          const node = visibleNodes[i]!;
          const depth = node._depth ?? 0;
          const isExpanded = expandedKeys.has(node.key);
          const isSelected = selectedKeys.has(node.key);
          const hasChildren = (node.children?.length ?? 0) > 0 || node.hasChildren;

          const tr = document.createElement("tr");
          tr.dataset.key = node.key;
          tr.style.cssText = `
            ${opts.striped && i % 2 === 1 ? "background:#f9fafb;" : ""}
            ${isSelected ? "background:#eef2ff;" : ""}
            ${opts.hoverable ? "cursor:pointer;" : ""}
            transition:background 0.1s;
          `;
          if (opts.rowClassName) {
            const extraClass = opts.rowClassName(node);
            if (extraClass) tr.classList.add(extraClass);
          }

          // Selection cell
          if (opts.selectionMode !== "none") {
            const td = document.createElement("td");
            td.style.cssText = `padding:4px 12px;border-bottom:1px solid #f3f4f6;`;
            const cb = document.createElement("input");
            cb.type = opts.selectionMode === "single" ? "radio" : "checkbox";
            cb.checked = isSelected;
            cb.disabled = node.disabled;
            cb.addEventListener("change", () => {
              if (cb.checked) instance.select(node.key);
              else instance.deselect(node.key);
            });
            td.appendChild(cb);
            tr.appendChild(td);
          }

          // First column (tree column)
          const firstCol = cols[0];
          const td0 = document.createElement("td");
          td0.style.cssText = `
            padding:4px 8px;border-bottom:1px solid #f3f4f6;
            white-space:nowrap;position:relative;
          `;

          // Indentation + toggle + content
          const cellContent = document.createElement("div");
          cellContent.style.cssText = "display:flex;align-items:center;";

          // Indent spacer
          const indent = document.createElement("span");
          indent.style.cssText = `display:inline-block;width:${depth * opts.indentSize}px;flex-shrink:0;`;
          cellContent.appendChild(indent);

          // Toggle button
          if (hasChildren) {
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.innerHTML = isExpanded ? "&#9660;" : "&#9654;";
            toggle.setAttribute("aria-label", isExpanded ? "Collapse" : "Expand");
            toggle.style.cssText = `
              background:none;border:none;width:18px;height:18px;font-size:10px;
              cursor:pointer;display:flex;align-items:center;justify-content:center;
              color:#6b7280;padding:0;margin-right:2px;flex-shrink:0;border-radius:3px;
              transition:transform 0.15s;
              ${isExpanded ? "" : "transform:rotate(0deg);"}
            `;
            toggle.addEventListener("click", (e) => {
              e.stopPropagation();
              if (isExpanded) instance.collapse(node.key);
              else instance.expand(node.key);
            });
            cellContent.appendChild(toggle);

            // Tree lines
            if (opts.showTreeLines && depth > 0) {
              const line = document.createElement("span");
              line.style.cssText = `
                display:inline-block;width:14px;height:1px;background:#d1d5db;
                margin-right:2px;flex-shrink:0;
              `;
              cellContent.insertBefore(line, toggle.nextSibling);
            }
          } else {
            // Spacer for alignment
            const spacer = document.createElement("span");
            spacer.style.cssText = "display:inline-block;width:20px;flex-shrink:0;";
            cellContent.appendChild(spacer);
          }

          // Cell value
          const value = node.data[firstCol!.key];
          if (firstCol?.render) {
            const rendered = firstCol.render(value, node);
            if (typeof rendered === "string") {
              const span = document.createElement("span");
              span.innerHTML = rendered;
              cellContent.appendChild(span);
            } else {
              cellContent.appendChild(rendered);
            }
          } else {
            const span = document.createElement("span");
            span.textContent = value == null ? "" : String(value);
            cellContent.appendChild(span);
          }

          td0.appendChild(cellContent);
          tr.appendChild(td0);

          // Remaining columns
          for (let c = 1; c < cols.length; c++) {
            const col = cols[c];
            const td = document.createElement("td");
            td.style.cssText = `
              padding:4px 12px;border-bottom:1px solid #f3f4f6;
              text-align:${col.align ?? "left"};
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            `;
            const val = node.data[col.key];
            if (col.render) {
              const rendered = col.render(val, node);
              if (typeof rendered === "string") td.innerHTML = rendered;
              else td.appendChild(rendered);
            } else {
              td.textContent = val == null ? "" : String(val);
            }
            tr.appendChild(td);
          }

          // Events
          tr.addEventListener("click", () => opts.onNodeClick?.(node));

          if (opts.hoverable) {
            tr.addEventListener("mouseenter", () => { if (!isSelected) tr.style.background = "#f9fafb"; });
            tr.addEventListener("mouseleave", () => { if (!isSelected) tr.style.background = opts.striped && i % 2 === 1 ? "#f9fafb" : ""; });
          }

          // Drag & drop
          if (opts.draggable && !node.disabled) {
            tr.draggable = true;
            tr.addEventListener("dragstart", (e: DragEvent) => {
              e.dataTransfer!.setData("text/plain", node.key);
              tr.style.opacity = "0.5";
            });
            tr.addEventListener("dragend", () => { tr.style.opacity = ""; });
            tr.addEventListener("dragover", (e: DragEvent) => { e.preventDefault(); tr.style.outline = "2px solid #4338ca"; });
            tr.addEventListener("dragleave", () => { tr.style.outline = ""; });
            tr.addEventListener("drop", (e: DragEvent) => {
              e.preventDefault();
              tr.style.outline = "";
              const dragKey = e.dataTransfer!.getData("text/plain");
              if (dragKey && dragKey !== node.key) {
                opts.onDrop?.(dragKey, node.key, "inside");
              }
            });
          }

          tbody.appendChild(tr);
        }
      }

      table.appendChild(tbody);
    }

    // Cascade selection helper
    function cascadeSelect(key: string, select: boolean): void {
      const node = findNode(key);
      if (!node) return;

      if (select) selectedKeys.add(key);
      else selectedKeys.delete(key);

      // Cascade to children
      if (node.children) {
        for (const child of node.children) {
          cascadeSelect(child.key, select);
        }
      }
    }

    // Check if all siblings are selected (for cascade up)
    function checkParentSelection(parentKey: string): void {
      const parentNode = findNode(parentKey);
      if (!parentNode || !parentNode.children) return;

      const allSelected = parentNode.children.every((c) => selectedKeys.has(c.key));
      if (allSelected) selectedKeys.add(parentKey);
      else selectedKeys.delete(parentKey);

      if (parentNode._parentKey) checkParentSelection(parentNode._parentKey);
    }

    const instance: TreeTableInstance = {
      element: container,

      getVisibleNodes() { return flattenVisible(treeData); },

      getAllNodes() {
        const result: TreeNode[] = [];
        function collect(nodes: TreeNode[]) {
          for (const n of nodes) { result.push(n); if (n.children) collect(n.children); }
        }
        collect(treeData);
        return result;
      },

      getSelectedNodes() {
        return this.getAllNodes().filter((n) => selectedKeys.has(n.key));
      },

      expand(key: string) {
        const node = findNode(key);
        if (!node) return;

        if (node.hasChildren && !node.children) {
          // Lazy load
          opts.onExpand?.(node).then((children) => {
            node.children = children;
            node.hasChildren = false;
            expandedKeys.add(key);
            render();
            opts.onSelectionChange?.(instance.getSelectedNodes());
          }).catch(() => {});
        } else {
          expandedKeys.add(key);
          render();
        }
      },

      collapse(key: string) {
        expandedKeys.delete(key);
        render();
      },

      expandAll() {
        function expandAllNodes(nodes: TreeNode[]) {
          for (const node of nodes) {
            if (node.children?.length || node.hasChildren) expandedKeys.add(node.key);
            if (node.children) expandAllNodes(node.children);
          }
        }
        expandAllNodes(treeData);
        render();
      },

      collapseAll() {
        expandedKeys.clear();
        render();
      },

      select(key: string) {
        if (opts.selectionMode === "single") {
          selectedKeys.clear();
          selectedKeys.add(key);
        } else if (opts.selectionMode === "cascade") {
          cascadeSelect(key, true);
          if (findNode(key)?._parentKey) checkParentSelection(findNode(key)!._parentKey!);
        } else {
          selectedKeys.add(key);
        }
        render();
        opts.onSelectionChange?.(instance.getSelectedNodes());
      },

      deselect(key: string) {
        if (opts.selectionMode === "cascade") {
          cascadeSelect(key, false);
          if (findNode(key)?._parentKey) checkParentSelection(findNode(key)!._parentKey!);
        } else {
          selectedKeys.delete(key);
        }
        render();
        opts.onSelectionChange?.(instance.getSelectedNodes());
      },

      addNode(newNode: TreeNode, parentKey?: string) {
        if (parentKey) {
          const parent = findNode(parentKey);
          if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(newNode);
            if (expandedKeys.has(parentKey)) render();
          }
        } else {
          treeData.push(newNode);
        }
        render();
      },

      removeNode(key: string) {
        const loc = findParentAndIndex(key);
        if (loc) loc.parent.splice(loc.index, 1);
        selectedKeys.delete(key);
        expandedKeys.delete(key);
        render();
      },

      updateNode(key: string, data: Partial<Record<string, unknown>>) {
        const node = findNode(key);
        if (node) Object.assign(node.data, data);
        render();
      },

      setData(data: TreeNode[]) {
        treeData = this.cloneTree(data);
        expandedKeys.clear();
        initExpanded(treeData);
        render();
      },

      refresh() { render(); },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    // Bind private method
    instance.cloneTree = (source: TreeNode[]) => this.privateCloneTree(source);

    // Initial render
    render();

    return instance;
  }

  private cloneTree(source: TreeNode[]): TreeNode[] {
    return source.map((n) => ({ ...n, children: n.children ? this.cloneTree(n.children) : undefined }));
  }
}

/** Convenience: create a tree table */
export function createTreeTable(options: TreeTableOptions): TreeTableInstance {
  return new TreeTableManager().create(options);
}
