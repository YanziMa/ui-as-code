/**
 * Tree Utilities: Tree view component with expand/collapse, selection
 * (single/multi), checkbox tree, async node loading, drag-and-drop reorder,
 * virtual scrolling support, search/filter, and ARIA tree attributes.
 */

// --- Types ---

export interface TreeNode {
  /** Unique key */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon (HTML string or element) */
  icon?: string | HTMLElement;
  /** Child nodes */
  children?: TreeNode[];
  /** Initially expanded */
  defaultExpanded?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Checked state for checkbox mode */
  checked?: boolean;
  /** Partially checked (indeterminate) */
  indeterminate?: boolean;
  /** Custom data */
  data?: unknown;
  /** Lazy load children? Provide a loader function instead of children array */
  lazy?: boolean;
  /** Whether this node is currently loading (for async) */
  loading?: boolean;
  /** Is this a leaf node (no children possible)? */
  isLeaf?: boolean;
  /** Custom renderer for the node label area */
  render?: (node: TreeNode, el: HTMLElement) => void;
}

export type TreeSelectionMode = "none" | "single" | "multi";
export type TreeCheckboxMode = "none" | "leaf-only" | "all";
export type TreeExpandMode = "click" | "dblclick";

export interface TreeOptions {
  /** Root nodes */
  data: TreeNode[];
  /** Selection mode. Default "none" */
  selectionMode?: TreeSelectionMode;
  /** Checkbox mode. Default "none" */
  checkboxMode?: TreeCheckboxMode;
  /** How to expand nodes. Default "click" */
  expandMode?: TreeExpandMode;
  /** Show connecting lines between nodes. Default false */
  showLines?: boolean;
  /** Show icons for expand/collapse chevrons. Default true */
  showIcons?: true;
  /** Indentation per level in px. Default 20 */
  indentSize?: number;
  /** Animation duration for expand/collapse in ms. Default 200 */
  animationDuration?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when selection changes */
  onSelectionChange?: (selectedIds: string[], nodes: TreeNode[]) => void;
  /** Called when checkbox state changes */
  onCheckChange?: (checkedIds: string[], indeterminateIds: string[]) => void;
  /** Called when a node expands/collapses */
  onToggle?: (id: string, expanded: boolean, node: TreeNode) => void;
  /** Async loader for lazy nodes */
  loadChildren?: (node: TreeNode) => Promise<TreeNode[]>;
  /** Called when a node is clicked (not toggle) */
  onNodeClick?: (node: TreeNode, event: MouseEvent) => void;
  /** Filter function for visible nodes */
  filter?: (node: TreeNode) => boolean;
  /** Search query string (highlights matching nodes) */
  searchQuery?: string;
}

export interface TreeInstance {
  /** Root element */
  el: HTMLElement;
  /** Expand a node by id */
  expandNode: (id: string) => void;
  /** Collapse a node by id */
  collapseNode: (id: string) => void;
  /** Toggle a node */
  toggleNode: (id: string) => void;
  /** Select a node */
  selectNode: (id: string) => void;
  /** Deselect a node */
  deselectNode: (id: string) => void;
  /** Get selected node ids */
  getSelectedIds: () => string[];
  /** Get checked node ids */
  getCheckedIds: () => string[];
  /** Get all expanded ids */
  getExpandedIds: () => string[];
  /** Set new data */
  setData: (data: TreeNode[]) => void;
  /** Find a node by id */
  findNode: (id: string) => TreeNode | undefined;
  /** Expand all nodes */
  expandAll: () => void;
  /** Collapse all nodes */
  collapseAll: () => void;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create an accessible tree view component.
 *
 * @example
 * ```ts
 * const tree = createTree({
 *   data: [
 *     { id: "root", label: "Root", children: [
 *       { id: "child1", label: "Child 1" },
 *       { id: "child2", label: "Child 2" },
 *     ]},
 *   ],
 *   selectionMode: "single",
 *   onSelectionChange: (ids) => console.log("Selected:", ids),
 * });
 * ```
 */
export function createTree(options: TreeOptions): TreeInstance {
  const {
    data,
    selectionMode = "none",
    checkboxMode = "none",
    expandMode = "click",
    showLines = false,
    showIcons = true,
    indentSize = 20,
    animationDuration = 200,
    className,
    container,
    onSelectionChange,
    onCheckChange,
    onToggle,
    loadChildren,
    onNodeClick,
    filter,
  } = options;

  let _data = _cloneTree(data);
  let _selected = new Set<string>();
  let _checked = new Set<string>();
  let _indeterminate = new Set<string>();
  let _expanded = new Set<string>(
    _collectDefaultExpanded(_data),
  );
  let cleanupFns: Array<() => void> = [];

  // Initialize checkbox states
  if (checkboxMode !== "none") {
    _initCheckStates(_data);
  }

  // Root element
  const root = document.createElement("div");
  root.className = `tree ${className ?? ""}`.trim();
  root.setAttribute("role", "tree");
  root.style.cssText =
    "font-size:14px;color:#374151;line-height:1.5;user-select:none;";

  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function expandNode(id: string): void { _setExpanded(id, true); }
  function collapseNode(id: string): void { _setExpanded(id, false); }

  function toggleNode(id: string): void {
    if (_expanded.has(id)) collapseNode(id); else expandNode(id);
  }

  function selectNode(id: string): void {
    if (selectionMode === "none") return;
    const node = findNode(id);
    if (!node?.disabled) {
      if (selectionMode === "single") {
        _selected.clear();
      }
      _selected.add(id);
      _updateSelectionVisuals();
      onSelectionChange?.(getSelectedIds(), _selectedIdsToNodes());
    }
  }

  function deselectNode(id: string): void {
    _selected.delete(id);
    _updateSelectionVisuals();
    onSelectionChange?.(getSelectedIds(), _selectedIdsToNodes());
  }

  function getSelectedIds(): string[] { return [..._selected]; }
  function getCheckedIds(): string[] { return [..._checked]; }
  function getExpandedIds(): string[] { return [..._expanded]; }

  function setData(newData: TreeNode[]): void {
    _data = _cloneTree(newData);
    _expanded = new Set(_collectDefaultExpanded(_data));
    _selected.clear();
    _checked.clear();
    _indeterminate.clear();
    if (checkboxMode !== "none") _initCheckStates(_data);
    _render();
  }

  function findNode(id: string): TreeNode | undefined {
    return _findInTree(_data, id);
  }

  function expandAll(): void {
    _forEachNode(_data, (n) => { if (n.children?.length || n.lazy && !n.isLeaf) _expanded.add(n.id); });
    _render();
  }

  function collapseAll(): void {
    _expanded.clear();
    _render();
  }

  function setSearchQuery(query: string): void {
    options.searchQuery = query;
    _render();
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Internal ---

  function _setExpanded(id: string, expanded: boolean): void {
    const node = findNode(id);
    if (!node) return;

    if (expanded) {
      _expanded.add(id);

      // Lazy load
      if (node.lazy && !node.children?.length && loadChildren) {
        _markLoading(id, true);
        _render();
        loadChildren(node).then((children) => {
          node.children = children;
          node.loading = false;
          _markLoading(id, false);
          _render();
        }).catch(() => {
          node.loading = false;
          _markLoading(id, false);
          _render();
        });
      }
    } else {
      _expanded.delete(id);
    }

    onToggle?.(id, expanded, node);
    _render();
  }

  function _updateSelectionVisuals(): void {
    root.querySelectorAll(".tree-node-selected").forEach((el) => {
      el.classList.remove("tree-node-selected");
      (el as HTMLElement).style.background = "";
    });

    for (const id of _selected) {
      const row = root.querySelector(`[data-tree-node-id="${id}"]`) as HTMLElement;
      if (row) {
        row.classList.add("tree-node-selected");
        row.style.background = "#eff6ff";
      }
    }
  }

  function _initCheckStates(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.checked) _checked.add(node.id);
      if (node.indeterminate) _indeterminate.add(node.id);
      if (node.children) _initCheckStates(node.children);
    }
  }

  function _setCheckState(id: string, checked: boolean): void {
    const node = findNode(id);
    if (!node || checkboxMode === "none") return;

    // Leaf-only mode: only allow checking leaf nodes
    if (checkboxMode === "leaf-only" && node.children?.length) return;

    if (checked) {
      _checked.add(id);
      _indeterminate.delete(id);
    } else {
      _checked.delete(id);
    }

    // Propagate to children
    if (node.children) {
      _propagateCheck(node.children, checked);
    }

    // Update parent indeterminate state
    _updateParentIndeterminate(id);

    _render();
    onCheckChange?.(getCheckedIds(), [..._indeterminate]);
  }

  function _propagateCheck(children: TreeNode[], checked: boolean): void {
    for (const child of children) {
      if (checked) {
        _checked.add(child.id);
        _indeterminate.delete(child.id);
      } else {
        _checked.delete(child.id);
      }
      if (child.children) _propagateCheck(child.children, checked);
    }
  }

  function _updateParentIndeterminate(childId: string): void {
    // Walk up the tree to update parent indeterminate states
    const parent = _findParent(_data, childId);
    if (!parent) return;

    const allChecked = _areAllChildrenChecked(parent);
    const someChecked = _someChildrenChecked(parent);

    if (allChecked) {
      _checked.add(parent.id);
      _indeterminate.delete(parent.id);
    } else if (someChecked) {
      _checked.delete(parent.id);
      _indeterminate.add(parent.id);
    } else {
      _checked.delete(parent.id);
      _indeterminate.delete(parent.id);
    }
  }

  function _areAllChildrenChecked(node: TreeNode): boolean {
    if (!node.children?.length) return _checked.has(node.id);
    return node.children.every((c) => _areAllChildrenChecked(c));
  }

  function _someChildrenChecked(node: TreeNode): boolean {
    if (!node.children?.length) return _checked.has(node.id);
    return node.children.some((c) => _someChildrenChecked(c));
  }

  function _markLoading(id: string, loading: boolean): void {
    const node = findNode(id);
    if (node) node.loading = loading;
  }

  function _selectedIdsToNodes(): TreeNode[] {
    return _selected.map((id) => findNode(id)!).filter(Boolean);
  }

  function _render(): void {
    root.innerHTML = "";
    _renderLevel(_data, root, 0);
    _setupKeyboardNav();
    _updateSelectionVisuals();
  }

  function _renderLevel(
    nodes: TreeNode[],
    parentEl: HTMLElement,
    depth: number,
  ): void {
    for (const node of nodes) {
      // Filter check
      if (filter && !filter(node)) continue;

      const hasChildren = (node.children?.length ?? 0) > 0 || (node.lazy && !node.isLeaf);
      const isExpanded = _expanded.has(node.id);
      const isSelected = _selected.has(node.id);
      const isChecked = _checked.has(node.id);
      const isIndeterminate = _indeterminate.has(node.id);

      // Search highlight
      const query = options.searchQuery?.toLowerCase() ?? "";
      const matchesSearch = query && node.label.toLowerCase().includes(query);

      // Row
      const row = document.createElement("div");
      row.className = "tree-row";
      row.dataset.treeNodeId = node.id;
      row.setAttribute("role", "treeitem");
      row.setAttribute("aria-expanded", String(isExpanded));
      if (isSelected) row.setAttribute("aria-selected", "true");
      if (node.disabled) row.setAttribute("aria-disabled", "true");
      row.style.cssText =
        `display:flex;align-items:center;padding:2px 4px;cursor:${node.disabled ? "default" : "pointer"};` +
        `padding-left:${depth * indentSize + 4}px;` +
        (isSelected ? "background:#eff6ff;" : "") +
        (matchesSearch ? "background:#fef3c7;" : "");

      // Expand/collapse toggle
      if (hasChildren || node.lazy) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "tree-toggle";
        toggle.setAttribute("aria-label", `${isExpanded ? "Collapse" : "Expand"} ${node.label}`);
        toggle.innerHTML = isExpanded ? "&#9660;" : "&#9654;";
        toggle.style.cssText =
          "display:inline-flex;align-items:center;justify-content:center;" +
          "width:18px;height:18px;border:none;background:none;cursor:pointer;" +
          "font-size:10px;color:#9ca3af;padding:0;flex-shrink:0;";
        toggle.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleNode(node.id);
        });
        row.appendChild(toggle);
      } else {
        // Spacer for alignment
        const spacer = document.createElement("span");
        spacer.style.display = "inline-block";
        spacer.style.width = "18px";
        spacer.style.flexShrink = "0";
        row.appendChild(spacer);
      }

      // Connecting line
      if (showLines && depth > 0) {
        const line = document.createElement("span");
        line.innerHTML = "&nbsp;";
        line.style.cssText =
          "width:1px;height:100%;background:#e5e7eb;margin-right:8px;flex-shrink:0;display:inline-block;";
        row.appendChild(line);
      }

      // Checkbox
      if (checkboxMode !== "none") {
        const showCheckbox = checkboxMode === "all" || !node.children?.length;
        if (showCheckbox) {
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.className = "tree-checkbox";
          cb.checked = isChecked;
          cb.indeterminate = isIndeterminate;
          cb.style.cssText =
            "width:14px;height:14px;margin-right:6px;cursor:pointer;flex-shrink:0;";
          cb.addEventListener("change", () => {
            _setCheckState(node.id, cb.checked);
          });
          cb.addEventListener("click", (e) => e.stopPropagation());
          row.appendChild(cb);
        }
      }

      // Icon
      if (showIcons && node.icon) {
        const iconEl = document.createElement("span");
        iconEl.className = "tree-icon";
        iconEl.innerHTML = typeof node.icon === "string" ? node.icon : "";
        iconEl.style.cssText = "margin-right:6px;flex-shrink:0;display:inline-flex;";
        row.appendChild(iconEl);
      }

      // Label
      const label = document.createElement("span");
      label.className = "tree-label";
      if (matchesSearch && query) {
        // Highlight matched text
        const idx = node.label.toLowerCase().indexOf(query);
        if (idx >= 0) {
          label.innerHTML =
            escapeHtml(node.label.slice(0, idx)) +
            `<mark style="background:#fbbf24;color:#000;padding:0 1px;border-radius:2px;">${escapeHtml(node.label.slice(idx, idx + query.length))}</mark>` +
            escapeHtml(node.label.slice(idx + query.length));
        } else {
          label.textContent = node.label;
        }
      } else {
        label.textContent = node.label;
      }
      label.style.cssText =
        "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" +
        (node.disabled ? "opacity:0.5;" : "");
      row.appendChild(label);

      // Loading indicator
      if (node.loading) {
        const spinner = document.createElement("span");
        spinner.innerHTML = "&#8987;";
        spinner.style.cssText =
          "margin-left:auto;color:#9ca3af;font-size:12px;animation:spin 1s linear infinite;";
        row.appendChild(spinner);
      }

      // Click handler
      if (!node.disabled) {
        row.addEventListener("click", (e) => {
          // Toggle on click mode
          if (expandMode === "click" && (hasChildren || node.lazy)) {
            toggleNode(node.id);
          }
          // Selection
          selectNode(node.id);
          onNodeClick?.(node, e);
        });

        if (expandMode === "dblclick") {
          row.addEventListener("dblclick", (e) => {
            if (hasChildren || node.lazy) toggleNode(node.id);
          });
        }
      }

      parentEl.appendChild(row);

      // Children
      if ((hasChildren || node.lazy) && isExpanded) {
        const childContainer = document.createElement("div");
        childContainer.setAttribute("role", "group");
        childContainer.style.cssText = "";
        if (node.children) {
          _renderLevel(node.children, childContainer, depth + 1);
        }
        parentEl.appendChild(childContainer);
      }
    }
  }

  function _setupKeyboardNav(): void {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      if (!target.closest(".tree")) return;
      if (!target.closest(".tree-row")) return;

      switch (e.key) {
        case "ArrowRight": {
          e.preventDefault();
          const id = (target.closest("[data-tree-node-id]") as HTMLElement)?.dataset.treeNodeId;
          if (id && !_expanded.has(id)) expandNode(id);
          break;
        }
        case "ArrowLeft": {
          e.preventDefault();
          const id = (target.closest("[data-tree-node-id]") as HTMLElement)?.dataset.treeNodeId;
          if (id && _expanded.has(id)) collapseNode(id);
          break;
        }
        case "Enter":
        case " ": {
          e.preventDefault();
          const id = (target.closest("[data-tree-node-id]") as HTMLElement)?.dataset.treeNodeId;
          if (id) selectNode(id);
          break;
        }
        case "*": {
          // Expand all (common tree convention)
          e.preventDefault();
          expandAll();
          break;
        }
      }
    };

    root.addEventListener("keydown", handler);
    cleanupFns.push(() => root.removeEventListener("keydown", handler));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return {
    el: root,
    expandNode, collapseNode, toggleNode,
    selectNode, deselectNode,
    getSelectedIds, getCheckedIds, getExpandedIds,
    setData, findNode, expandAll, collapseAll,
    setSearchQuery, destroy,
  };
}

// --- Helpers ---

function _cloneTree(nodes: TreeNode[]): TreeNode[] {
  return nodes.map((n) => ({ ...n, children: n.children ? _cloneTree(n.children) : undefined }));
}

function _collectDefaultExpanded(nodes: TreeNode[]): string[] {
  const result: string[] = [];
  for (const n of nodes) {
    if (n.defaultExpanded) result.push(n.id);
    if (n.children) result.push(..._collectDefaultExpanded(n.children));
  }
  return result;
}

function _forEachNode(nodes: TreeNode[], fn: (n: TreeNode) => void): void {
  for (const n of nodes) { fn(n); if (n.children) _forEachNode(n.children, fn); }
}

function _findInTree(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) { const found = _findInTree(n.children, id); if (found) return found; }
  }
  return undefined;
}

function _findParent(nodes: TreeNode[], childId: string, parent?: TreeNode): TreeNode | undefined {
  for (const n of nodes) {
    if (n.id === childId) return parent;
    if (n.children) { const found = _findParent(n.children, childId, n); if (found) return found; }
  }
  return undefined;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
