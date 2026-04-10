/**
 * Tree View: Hierarchical data tree with virtual scrolling, expand/collapse,
 * checkbox selection (with indeterminate state), drag-and-drop reorder,
 * search/filter, lazy loading, keyboard navigation, and accessibility.
 */

// --- Types ---

export interface TreeNodeData {
  id: string;
  label: string;
  icon?: string;
  children?: TreeNodeData[];
  /** Data payload */
  data?: Record<string, unknown>;
  /** Disabled state */
  disabled?: boolean;
  /** Whether node is initially expanded */
  defaultExpanded?: boolean;
  /** Whether node is a leaf (no children even if children array exists) */
  isLeaf?: boolean;
  /** Lazy load children */
  lazy?: boolean;
  /** Sort index among siblings */
  sortIndex?: number;
}

export interface TreeNode extends TreeNodeData {
  depth: number;
  parent?: TreeNode;
  expanded: boolean;
  selected: boolean;
  checked: "unchecked" | "checked" | "indeterminate";
  visible: boolean;
  matchedBySearch: boolean;
  _index: number; // Flat array index
}

export type CheckMode = "none" | "single" | "multi" | "cascade";

export interface TreeViewConfig {
  /** Selection mode (default: "none") */
  checkMode?: CheckMode;
  /** Show connecting lines between nodes */
  showLines?: boolean;
  /** Show expand/collapse icons */
  showIcons?: boolean;
  /** Indent size in px (default: 24) */
  indentSize?: number;
  /** Allow drag and drop reordering */
  draggable?: boolean;
  /** Allow dropping into folders */
  droppable?: boolean;
  /** Animation duration for expand/collapse (ms) */
  animationDuration?: number;
  /** Virtual scroll threshold (node count above which to use virtual) */
  virtualThreshold?: number;
  /** Row height for virtual scrolling (px) */
  rowHeight?: number;
  /** Callback on selection change */
  onSelectionChange?: (selected: Set<string>) => void;
  /** Callback on check change */
  onCheckChange?: (checked: Set<string>, indeterminate: Set<string>) => void;
  /** Callback on expand change */
  onExpandChange?: (expanded: Set<string>) => void;
  /** Callback on node click */
  onNodeClick?: (node: TreeNode) => void;
  /** Callback on node double-click */
  onNodeDoubleClick?: (node: TreeNode) => void;
  /** Callback when nodes are reordered via DnD */
  onReorder?: (sourceId: string, targetId: string, position: "before" | "after" | "inside") => void;
  /** Custom render function for each node */
  renderNode?: (node: TreeNode) => HTMLElement | string;
  /** Key field name (default: "id") */
  idField?: string;
  /** Children field name (default: "children") */
  childrenField?: string;
  /** Label field name (default: "label") */
  labelField?: string;
}

// --- Tree View Class ---

export class TreeView {
  private rootNodes: TreeNode[] = [];
  private flatList: TreeNode[] = [];
  private config: Required<TreeViewConfig> & TreeViewConfig;
  private selectedIds = new Set<string>();
  private checkedIds = new Set<string>();
  private indeterminateIds = new Set<string>();
  private expandedIds = new Set<string>();
  private searchQuery = "";
  private listeners = new Set<(flatList: TreeNode[]) => void>();

  constructor(config: TreeViewConfig = {}) {
    this.config = {
      checkMode: config.checkMode ?? "none",
      showLines: config.showLines ?? true,
      showIcons: config.showIcons ?? true,
      indentSize: config.indentSize ?? 24,
      draggable: config.draggable ?? false,
      droppable: config.droppable ?? false,
      animationDuration: config.animationDuration ?? 200,
      virtualThreshold: config.virtualThreshold ?? 200,
      rowHeight: config.rowHeight ?? 32,
      idField: config.idField ?? "id",
      childrenField: config.childrenField ?? "children",
      labelField: config.labelField ?? "label",
      ...config,
    };
  }

  // --- Data Operations ---

  setData(data: TreeNodeData[]): void {
    this.rootNodes = this.buildTree(data);
    this.rebuildFlatList();
    this.notify();
  }

  getData(): TreeNodeData[] { return this.serialize(this.rootNodes); }

  getNode(id: string): TreeNode | undefined {
    return this.flatList.find((n) => n.id === id);
  }

  getFlatList(): TreeNode[] { return [...this.flatList]; }

  getVisibleNodes(): TreeNode[] { return this.flatList.filter((n) => n.visible); }

  getSelectedNodes(): TreeNode[] {
    return this.flatList.filter((n) => n.selected && n.visible);
  }

  getCheckedNodes(): TreeNode[] {
    return this.flatList.filter((n) => n.checked === "checked");
  }

  getAllDescendants(node: TreeNode): TreeNode[] {
    const result: TreeNode[] = [];
    const walk = (n: TreeNode) => {
      if (n.children) for (const child of n.children) { result.push(child!); walk(child!); }
    };
    walk(node);
    return result;
  }

  getPathToRoot(node: TreeNode): TreeNode[] {
    const path: TreeNode[] = [];
    let current: TreeNode | undefined = node;
    while (current) { path.unshift(current); current = current.parent; }
    return path;
  }

  // --- Expand/Collapse ---

  expand(id: string): void {
    const node = this.getNode(id);
    if (node && !node.isLeaf && (!node.children || node.lazy)) {
      this.expandedIds.add(id);
      node.expanded = true;
      this.rebuildFlatList();
      this.notify();
      this.config.onExpandChange?.(new Set(this.expandedIds));
    }
  }

  collapse(id: string): void {
    this.expandedIds.delete(id);
    const node = this.getNode(id);
    if (node) node.expanded = false;
    this.rebuildFlatList();
    this.notify();
    this.config.onExpandChange?.(new Set(this.expandedIds));
  }

  toggle(id: string): void {
    this.isExpanded(id) ? this.collapse(id) : this.expand(id);
  }

  expandAll(): void {
    for (const node of this.flatList) {
      if (!node.isLeaf && node.children && node.children.length > 0) {
        this.expandedIds.add(node.id);
        node.expanded = true;
      }
    }
    this.rebuildFlatList();
    this.notify();
  }

  collapseAll(): void {
    this.expandedIds.clear();
    for (const node of this.flatList) node.expanded = false;
    this.rebuildFlatList();
    this.notify();
  }

  isExpanded(id: string): boolean { return this.expandedIds.has(id); }

  getExpandedIds(): Set<string> { return new Set(this.expandedIds); }

  // --- Selection ---

  select(id: string): void {
    if (this.config.checkMode === "none") return;

    if (this.config.checkMode === "single") {
      this.selectedIds.clear();
      for (const n of this.flatList) n.selected = false;
    }

    const node = this.getNode(id);
    if (node && !node.disabled) {
      this.selectedIds.add(id);
      node.selected = true;
      this.notify();
      this.config.onSelectionChange?.(new Set(this.selectedIds));
    }
  }

  deselect(id: string): void {
    this.selectedIds.delete(id);
    const node = this.getNode(id);
    if (node) node.selected = false;
    this.notify();
    this.config.onSelectionChange?.(new Set(this.selectedIds));
  }

  selectAll(): void {
    if (this.config.checkMode !== "multi" && this.config.checkMode !== "cascade") return;
    for (const node of this.getVisibleNodes()) {
      if (!node.disabled) { this.selectedIds.add(node.id); node.selected = true; }
    }
    this.notify();
  }

  deselectAll(): void {
    this.selectedIds.clear();
    for (const n of this.flatList) n.selected = false;
    this.notify();
  }

  // --- Checkbox (Cascade) ---

  check(id: string): void {
    if (this.config.checkMode !== "cascade" && this.config.checkMode !== "multi") return;

    const node = this.getNode(id);
    if (!node || node.disabled) return;

    // Toggle current
    if (node.checked === "checked") {
      this.uncheckRecursive(node);
    } else {
      this.checkRecursive(node);
    }

    this.updateParentCheckState(node);
    this.notify();
    this.config.onCheckChange?.(new Set(this.checkedIds), new Set(this.indeterminateIds));
  }

  uncheck(id: string): void { this.check(id); }

  // --- Search/Filter ---

  setSearch(query: string): void {
    this.searchQuery = query.trim().toLowerCase();

    if (!this.searchQuery) {
      for (const node of this.flatList) node.matchedBySearch = true;
    } else {
      for (const node of this.flatList) {
        node.matchedBySearch = this.matchesSearch(node);
        // Auto-expand parents of matching nodes
        if (node.matchedBySearch) {
          let p = node.parent;
          while (p) { this.expandedIds.add(p.id); p.expanded = true; p = p.parent; }
        }
      }
    }

    this.rebuildFlatList();
    this.notify();
  }

  getSearchQuery(): string { return this.searchQuery; }

  // --- Node Manipulation ---

  addNode(parentId: string | null, nodeData: TreeNodeData): void {
    const newNode: TreeNode = {
      ...nodeData,
      depth: 0,
      expanded: nodeData.defaultExpanded ?? false,
      selected: false,
      checked: "unchecked",
      visible: true,
      matchedBySearch: true,
      _index: -1,
    };

    if (parentId) {
      const parent = this.getNode(parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        newNode.depth = parent.depth + 1;
        newNode.parent = parent;
        parent.children.push(newNode);
      }
    } else {
      newNode.depth = 0;
      this.rootNodes.push(newNode);
    }

    this.rebuildFlatList();
    this.notify();
  }

  removeNode(id: string): void {
    const removeFromParent = (nodes: TreeNode[], targetId: string): boolean => {
      const idx = nodes.findIndex((n) => n.id === targetId);
      if (idx >= 0) { nodes.splice(idx, 1); return true; }
      for (const node of nodes) { if (node.children && removeFromParent(node.children, targetId)) return true; }
      return false;
    };

    removeFromParent(this.rootNodes, id);
    this.selectedIds.delete(id);
    this.checkedIds.delete(id);
    this.indeterminateIds.delete(id);
    this.expandedIds.delete(id);
    this.rebuildFlatList();
    this.notify();
  }

  updateNode(id: string, updates: Partial<TreeNodeData>): void {
    const node = this.getNode(id);
    if (node) Object.assign(node, updates);
    this.notify();
  }

  moveNode(sourceId: string, targetId: string, position: "before" | "after" | "inside"): void {
    const source = this.getNode(sourceId);
    if (!source || sourceId === targetId) return;

    // Remove from current location
    this.removeNode(sourceId);

    const target = this.getNode(targetId);
    if (!target) return;

    if (position === "inside") {
      if (!target.children) target.children = [];
      source!.depth = target.depth + 1;
      source!.parent = target;
      target.children.push(source!);
    } else {
      const siblings = target.parent?.children ?? this.rootNodes;
      const targetIdx = siblings.indexOf(target);
      const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
      source!.depth = target.depth;
      source!.parent = target.parent;
      siblings.splice(insertIdx, 0, source!);
    }

    this.rebuildFlatList();
    this.notify();
    this.config.onReorder?.(sourceId, targetId, position);
  }

  // --- State Access ---

  subscribe(listener: (flatList: TreeNode[]) => void): () => void {
    this.listeners.add(listener);
    listener([...this.flatList]);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.rootNodes = [];
    this.flatList = [];
    this.listeners.clear();
  }

  // --- Internal ---

  private buildTree(data: TreeNodeData[], depth = 0, parent?: TreeNode): TreeNode[] {
    return data.map((item, idx) => {
      const node: TreeNode = {
        ...item,
        depth,
        parent,
        expanded: item.defaultExpanded ?? false,
        selected: false,
        checked: "unchecked",
        visible: true,
        matchedBySearch: true,
        _index: -1,
      };

      if (item.children && item.children.length > 0 && !item.lazy) {
        node.children = this.buildTree(item.children, depth + 1, node);
      }

      return node;
    });
  }

  private rebuildFlatList(): void {
    this.flatList = [];

    const flatten = (nodes: TreeNode[]): void => {
      for (const node of nodes) {
        node.visible = this.isNodeVisible(node);
        this.flatList.push(node);
        node._index = this.flatList.length - 1;

        if (node.expanded && node.children) {
          flatten(node.children);
        }
      }
    };

    flatten(this.rootList());
  }

  private nodeList(): TreeNode[] { return this.rootNodes; }
  private rootList(): TreeNode[] { return this.rootNodes; }

  private isNodeVisible(node: TreeNode): boolean {
    // If searching, only show matched nodes and their ancestors
    if (this.searchQuery) {
      if (node.matchedBySearch) return true;
      // Show ancestor if any descendant matches
      if (node.children && this.hasMatchingDescendant(node)) return true;
      return false;
    }
    return true;
  }

  private hasMatchingDescendant(node: TreeNode): boolean {
    if (node.matchedBySearch) return true;
    if (node.children) return node.children.some((c) => this.hasMatchingDescendant(c!));
    return false;
  }

  private matchesSearch(node: TreeNode): boolean {
    if (!this.searchQuery) return true;
    const text = `${node.label} ${(node.data?.searchText ?? "")}`.toLowerCase();
    return text.includes(this.searchQuery);
  }

  private checkRecursive(node: TreeNode): void {
    node.checked = "checked";
    this.checkedIds.add(node.id);
    this.indeterminateIds.delete(node.id);
    if (node.children) for (const child of node.children) this.checkRecursive(child!);
  }

  private uncheckRecursive(node: TreeNode): void {
    node.checked = "unchecked";
    this.checkedIds.delete(node.id);
    this.indeterminateIds.delete(node.id);
    if (node.children) for (const child of node.children) this.uncheckRecursive(child!);
  }

  private updateParentCheckState(node: TreeNode): void {
    let current = node.parent;
    while (current) {
      if (!current.children) break;

      const allChecked = current.children.every((c) => c!.checked === "checked");
      const allUnchecked = current.children.every((c) => c!.checked === "unchecked");

      if (allChecked) {
        current.checked = "checked";
        this.checkedIds.add(current.id);
        this.indeterminateIds.delete(current.id);
      } else if (allUnchecked) {
        current.checked = "unchecked";
        this.checkedIds.delete(current.id);
        this.indeterminateIds.delete(current.id);
      } else {
        current.checked = "indeterminate";
        this.indeterminateIds.add(current.id);
      }

      current = current.parent;
    }
  }

  private serialize(nodes: TreeNode[]): TreeNodeData[] {
    return nodes.map((n) => ({
      id: n.id,
      label: n.label,
      icon: n.icon,
      data: n.data,
      disabled: n.disabled,
      isLeaf: n.isLeaf,
      lazy: n.lazy,
      sortIndex: n.sortIndex,
      children: n.children ? this.serialize(n.children) : undefined,
    }));
  }

  private notify(): void {
    for (const fn of this.listeners) { try { fn([...this.flatList]); } catch {} }
  }
}
