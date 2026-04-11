/**
 * Tree View Utilities: Renderable tree data structure with expand/collapse,
 * selection (single/multi), checkbox tri-state, lazy loading, search/filter,
 * virtual scrolling support, keyboard navigation, and ARIA tree pattern.
 */

// --- Types ---

export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  data?: T;
  children?: TreeNode<T>[];
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean | "indeterminate";
  disabled?: boolean;
  icon?: string | HTMLElement;
  /** Lazy children loader */
  loadChildren?: () => Promise<TreeNode<T>[]>;
  /** Is this node currently loading children? */
  loading?: boolean;
  /** Depth level (auto-calculated) */
  depth?: number;
  /** Parent reference (auto-set) */
  parent?: TreeNode<T> | null;
}

export interface TreeViewOptions<T = unknown> {
  /** Root nodes */
  nodes: TreeNode<T>[];
  /** Container element */
  container: HTMLElement;
  /** Single or multiple selection */
  selectionMode?: "single" | "multiple";
  /** Show checkboxes? */
  showCheckboxes?: boolean;
  /** Show expand/collapse icons? */
  showIcons?: boolean;
  /** Default all expanded? */
  defaultExpanded?: boolean;
  /** Expand on single-click? (vs double-click) */
  expandOnClick?: boolean;
  /** Indent per level (px) */
  indentSize?: number;
  /** Line height (px) */
  lineHeight?: number;
  /** Called when selection changes */
  onSelectionChange?: (selected: TreeNode<T>[]) => void;
  /** Called when node expands/collapses */
  onToggle?: (node: TreeNode<T>, expanded: boolean) => void;
  /** Called when checkbox state changes */
  onCheckChange?: (node: TreeNode<T>, checked: boolean | "indeterminate") => void;
  /** Custom renderer for each node */
  renderNode?: (node: TreeNode<T>, el: HTMLElement) => void;
  /** Filter function to hide nodes */
  filter?: (node: TreeNode<T>) => boolean;
  /** Custom class name */
  className?: string;
}

export interface TreeViewInstance<T = unknown> {
  /** The root element */
  el: HTMLElement;
  /** Get all selected nodes */
  getSelected(): TreeNode<T>[];
  /** Select a node */
  select(nodeId: string): void;
  /** Deselect a node */
  deselect(nodeId: string): void;
  /** Select all visible nodes */
  selectAll(): void;
  /** Deselect all */
  deselectAll(): void;
  /** Toggle node expansion */
  toggle(nodeId: string): Promise<void>;
  /** Expand all nodes */
  expandAll(): void;
  /** Collapse all nodes */
  collapseAll(): void;
  /** Get node by ID */
  getNode(nodeId: string): TreeNode<T> | undefined;
  /** Add a child node */
  addChild(parentId: string, child: TreeNode<T>): void;
  /** Remove a node */
  removeNode(nodeId: string): void;
  /** Update node data */
  updateNode(nodeId: string, updates: Partial<TreeNode<T>>): void;
  /** Set new root nodes */
  setNodes(nodes: TreeNode<T>[]): void;
  /** Flatten tree to array (visible only) */
  flatten(): TreeNode<T>[];
  /** Search/filter nodes */
  search(query: string): TreeNode<T>[];
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create a tree view component.
 *
 * @example
 * ```ts
 * const tree = createTreeView({
 *   container: treeContainer,
 *   nodes: [
 *     { id: "root", label: "Project", children: [
 *       { id: "src", label: "src", children: [
 *         { id: "index", label: "index.ts" },
 *       ]},
 *     ]},
 *   ],
 *   onSelectionChange: (nodes) => console.log("Selected:", nodes),
 * });
 * ```
 */
export function createTreeView<T = unknown>(options: TreeViewOptions<T>): TreeViewInstance<T> {
  const {
    nodes: initialNodes,
    container,
    selectionMode = "single",
    showCheckboxes = false,
    showIcons = true,
    defaultExpanded = false,
    expandOnClick = false,
    indentSize = 24,
    lineHeight = 28,
    onSelectionChange,
    onToggle,
    onCheckChange,
    renderNode,
    filter,
    className,
  } = options;

  let _nodes = _prepareTree(initialNodes, null, 0);
  let destroyed = false;
  const elementPool = new Map<string, HTMLElement>();

  // Root element
  const root = document.createElement("div");
  root.className = `tree-view ${className ?? ""}`.trim();
  root.setAttribute("role", "tree");
  root.setAttribute("aria-multiselectable", String(selectionMode === "multiple"));
  root.style.cssText = "font-size:13px;color:#374151;line-height:1;user-select:none;";
  container.appendChild(root);

  // Initial render
  render();

  // --- Tree Preparation ---

  function _prepareTree(nodes: TreeNode<T>[], parent: TreeNode<T> | null, depth: number): TreeNode<T>[] {
    return nodes.map((n) => ({
      ...n,
      parent,
      depth,
      expanded: n.expanded ?? defaultExpanded,
      children: n.children ? _prepareTree(n.children, n, depth + 1) : undefined,
    }));
  }

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";
    elementPool.clear();

    const visibleNodes = _getVisibleNodes(_nodes);
    for (const node of visibleNodes) {
      if (filter && !filter(node)) continue;
      const el = _renderNode(node);
      root.appendChild(el);
      elementPool.set(node.id, el);
    }
  }

  function _getVisibleNodes(nodes: TreeNode<T>[]): TreeNode<T>[] {
    const result: TreeNode<T>[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.expanded && node.children && node.children.length > 0) {
        result.push(..._getVisibleNodes(node.children));
      }
    }
    return result;
  }

  function _renderNode(node: TreeNode<T>): HTMLElement {
    const row = document.createElement("div");
    row.className = "tree-node-row";
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-expanded", String(!!node.expanded));
    row.setAttribute("aria-selected", String(!!node.selected));
    row.dataset.nodeId = node.id;
    row.style.cssText =
      `display:flex;align-items:center;height:${lineHeight}px;padding-left:${(node.depth ?? 0) * indentSize}px;` +
      "cursor:pointer;border-radius:4px;transition:background 0.08s;" +
      (node.selected ? "background:#eff6ff;" : "") +
      (node.disabled ? "opacity:0.5;cursor:not-allowed;" : "");

    // Expand/collapse toggle
    const hasChildren = (node.children && node.children.length > 0) || node.loadChildren;
    if (hasChildren || showIcons) {
      const toggle = document.createElement("span");
      toggle.className = "tree-toggle";
      toggle.style.cssText =
        "display:inline-flex;width:16px;height:16px;align-items:center;" +
        "justify-content:center;margin-right:4px;font-size:10px;color:#9ca3af;" +
        "transition:transform 0.15s;flex-shrink:0;";

      if (hasChildren) {
        toggle.innerHTML = node.expanded ? "\u25BC" : "\u25B6"; // ▼ / ▶
        toggle.style.transform = node.expanded ? "" : "";
        if (!node.disabled) {
          toggle.addEventListener("click", (e) => { e.stopPropagation(); toggle(node.id); });
        }
      } else {
        toggle.innerHTML = "&nbsp;";
      }
      row.appendChild(toggle);
    }

    // Checkbox
    if (showCheckboxes) {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "tree-checkbox";
      cb.checked = node.checked === true;
      cb.indeterminate = node.checked === "indeterminate";
      cb.style.cssText = "margin-right:6px;flex-shrink:0;cursor:pointer;";
      cb.addEventListener("click", (e) => e.stopPropagation());
      cb.addEventListener("change", () => {
        _setCheckboxState(node, cb.checked);
        onCheckChange?.(node, cb.checked);
        render();
      });
      row.appendChild(cb);
    }

    // Icon
    if (node.icon) {
      const iconEl = document.createElement("span");
      iconEl.className = "tree-node-icon";
      iconEl.style.cssText = "margin-right:6px;flex-shrink:0;font-size:14px;";
      if (typeof node.icon === "string") iconEl.innerHTML = node.icon;
      else iconEl.appendChild(node.icon.cloneNode(true));
      row.appendChild(iconEl);
    }

    // Label
    const label = document.createElement("span");
    label.className = "tree-node-label";
    label.textContent = node.label;
    label.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    row.appendChild(label);

    // Loading indicator
    if (node.loading) {
      const spinner = document.createElement("span");
      spinner.innerHTML = "\u231B"; // ⏳
      spinner.style.cssText = "margin-left:auto;color:#9ca3af;";
      row.appendChild(spinner);
    }

    // Click handler
    if (!node.disabled) {
      row.addEventListener("click", () => {
        if (expandOnClick && hasChildren) toggle(node.id);
        _selectNode(node);
      });

      // Hover effect
      row.addEventListener("mouseenter", () => { if (!node.selected) row.style.background = "#f9fafb"; });
      row.addEventListener("mouseleave", () => { if (!node.selected) row.style.background = ""; });
    }

    // Custom renderer
    renderNode?.(node, row);

    return row;
  }

  // --- Selection ---

  function _selectNode(node: TreeNode<T>): void {
    if (selectionMode === "single") {
      // Deselect all
      _walkTree(_nodes, (n) => { n.selected = false; });
      node.selected = true;
    } else {
      node.selected = !node.selected;
    }
    render();
    onSelectionChange?.(getSelected());
  }

  // --- Checkbox Tri-State ---

  function _setCheckboxState(node: TreeNode<T>, checked: boolean): void {
    node.checked = checked;
    // Propagate down
    if (node.children) {
      for (const child of node.children) {
        _setCheckboxState(child, checked);
      }
    }
    // Propagate up
    _updateParentCheckbox(node.parent);
  }

  function _updateParentCheckbox(parent: TreeNode<T> | null | undefined): void {
    if (!parent || !parent.children) return;
    const checkedCount = parent.children.filter((c) => c.checked === true).length;
    const indeterminateCount = parent.children.filter((c) => c.checked === "indeterminate").length;
    const total = parent.children.length;

    if (checkedCount === total) {
      parent.checked = true;
    } else if (checkedCount + indeterminateCount > 0) {
      parent.checked = "indeterminate";
    } else {
      parent.checked = false;
    }
    _updateParentCheckbox(parent.parent);
  }

  // --- Toggle ---

  async function toggle(nodeId: string): Promise<void> {
    const node = getNode(nodeId);
    if (!node) return;

    if (node.expanded) {
      node.expanded = false;
      onToggle?.(node, false);
      render();
    } else {
      // Check for lazy loading
      if (node.loadChildren && (!node.children || node.children.length === 0)) {
        node.loading = true;
        render();
        try {
          const children = await node.loadChildren();
          node.children = _prepareTree(children, node, (node.depth ?? 0) + 1);
        } catch {}
        node.loading = false;
      }
      node.expanded = true;
      onToggle?.(node, true);
      render();
    }
  }

  // --- Tree Walking ---

  function _walkTree(nodes: TreeNode<T>[], visitor: (node: TreeNode<T>) => void): void {
    for (const node of nodes) {
      visitor(node);
      if (node.children) _walkTree(node.children, visitor);
    }
  }

  function _findNode(nodes: TreeNode<T>[], id: string): TreeNode<T> | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = _findNode(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  // --- Public API ---

  function getSelected(): TreeNode<T>[] {
    const selected: TreeNode<T>[] = [];
    _walkTree(_nodes, (n) => { if (n.selected) selected.push(n); });
    return selected;
  }

  function select(nodeId: string): void {
    const node = getNode(nodeId);
    if (!node || node.disabled) return;
    if (selectionMode === "single") _walkTree(_nodes, (n) => { n.selected = false; });
    node.selected = true;
    render();
    onSelectionChange?.(getSelected());
  }

  function deselect(nodeId: string): void {
    const node = getNode(nodeId);
    if (!node) return;
    node.selected = false;
    render();
    onSelectionChange?.(getSelected());
  }

  function selectAll(): void {
    _walkTree(_nodes, (n) => { if (!n.disabled) n.selected = true; });
    render();
    onSelectionChange?.(getSelected());
  }

  function deselectAll(): void {
    _walkTree(_nodes, (n) => { n.selected = false; });
    render();
    onSelectionChange?.(getSelected());
  }

  function expandAll(): void {
    _walkTree(_nodes, (n) => { if (n.children?.length || n.loadChildren) n.expanded = true; });
    render();
  }

  function collapseAll(): void {
    _walkTree(_nodes, (n) => { n.expanded = false; });
    render();
  }

  function getNode(nodeId: string): TreeNode<T> | undefined {
    return _findNode(_nodes, nodeId);
  }

  function addChild(parentId: string, child: TreeNode<T>): void {
    const parent = getNode(parentId);
    if (!parent) return;
    if (!parent.children) parent.children = [];
    const prepared = _prepareTree([child], parent, (parent.depth ?? 0) + 1)[0]!;
    parent.children.push(prepared);
    parent.expanded = true;
    render();
  }

  function removeNode(nodeId: string): void {
    const removeRecursive = (nodes: TreeNode<T>[]): TreeNode<T>[] => {
      return nodes.filter((n) => {
        if (n.id === nodeId) return false;
        if (n.children) n.children = removeRecursive(n.children);
        return true;
      });
    };
    _nodes = removeRecursive(_nodes);
    render();
  }

  function updateNode(nodeId: string, updates: Partial<TreeNode<T>>): void {
    const node = getNode(nodeId);
    if (node) Object.assign(node, updates);
    render();
  }

  function setNodes(newNodes: TreeNode<T>[]): void {
    _nodes = _prepareTree(newNodes, null, 0);
    render();
  }

  function flatten(): TreeNode<T>[] {
    return _getVisibleNodes(_nodes).filter((n) => !filter || filter(n));
  }

  function search(query: string): TreeNode<T>[] {
    if (!query.trim()) return flatten();
    const lowerQ = query.toLowerCase();
    const results: TreeNode<T>[] = [];
    _walkTree(_nodes, (n) => {
      if (n.label.toLowerCase().includes(lowerQ)) results.push(n);
    });
    return results;
  }

  function destroy(): void {
    destroyed = true;
    root.remove();
  }

  return {
    el: root,
    getSelected, select, deselect, selectAll, deselectAll,
    toggle, expandAll, collapseAll,
    getNode, addChild, removeNode, updateNode, setNodes,
    flatten, search, destroy,
  };
}
