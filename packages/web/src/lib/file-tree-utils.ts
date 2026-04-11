/**
 * File Tree Utilities: File/folder tree explorer with expand/collapse,
 * selection (single/multi), context menu, drag-and-drop reorder, search/filter,
 * lazy loading, icons by type, keyboard navigation, and ARIA tree role.
 */

// --- Types ---

export type FileTreeNodeType = "file" | "folder";

export interface FileTreeNode {
  /** Unique ID */
  id: string;
  /** Display name */
  name: string;
  /** Node type */
  type: FileTreeNodeType;
  /** Children (folders only) */
  children?: FileTreeNode[];
  /** File extension (files only) */
  extension?: string;
  /** File size in bytes (files only) */
  size?: number;
  /** Last modified date */
  modifiedAt?: Date | string;
  /** Icon override (HTML string) */
  icon?: string;
  /** Custom data payload */
  data?: unknown;
  /** Lazy-load children? */
  lazy?: boolean;
  /** Is the folder open? (controlled) */
  isOpen?: boolean;
}

export interface TreeSelection {
  /** Selected node IDs */
  ids: Set<string>;
  /** Focused/active node ID */
  focusedId: string | null;
}

export interface ContextMenuItem {
  /** Menu item label */
  label: string;
  /** Icon (HTML string) */
  icon?: string;
  /** Disabled? */
  disabled?: boolean;
  /** Divider before this item? */
  divider?: boolean;
  /** Action handler */
  action: (node: FileTreeNode) => void;
}

export interface FileTreeOptions {
  /** Root nodes of the tree */
  data: FileTreeNode[];
  /** Selection mode */
  multiSelect?: boolean;
  /** Show file size? */
  showSize?: boolean;
  /** Show modified date? */
  showModified?: boolean;
  /** Show icons? */
  showIcons?: boolean;
  /** Show file extensions? */
  showExtension?: boolean;
  /** Initial expanded IDs */
  defaultExpandedIds?: Set<string>;
  /** Initial selected IDs */
  defaultSelectedIds?: Set<string> | string[];
  /** Height constraint (enables virtualization for large trees) */
  height?: number;
  /** Search/filter query */
  filterQuery?: string;
  /** Context menu items */
  contextMenuItems?: ContextMenuItem[];
  /** Allow drag and drop to reorder/move? */
  draggable?: boolean;
  /** Allow dropping files into folders? */
  droppable?: boolean;
  /** On node select callback */
  onSelect?: (nodes: FileTreeNode[], selection: TreeSelection) => void;
  /** On node expand/collapse */
  onToggle?: (node: FileTreeNode, isOpen: boolean) => void;
  /** On node double-click (open file) */
  onOpen?: (node: FileTreeNode) => void;
  /** On drop handler */
  onDrop?: (draggedNode: FileTreeNode, targetNode: FileTreeNode | null) => void;
  /** Lazy load children resolver */
  onLazyLoad?: (node: FileTreeNode) => Promise<FileTreeNode[]>;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
}

export interface FileTreeInstance {
  /** Root wrapper element */
  el: HTMLElement;
  /** Get current selection */
  getSelection(): TreeSelection;
  /** Get selected nodes */
  getSelectedNodes(): FileTreeNode[];
  /** Select a node programmatically */
  select(id: string, addToExisting?: boolean): void;
  /** Deselect all */
  deselectAll(): void;
  /** Expand a folder node */
  expand(id: string): void;
  /** Collapse a folder node */
  collapse(id: string): void;
  /** Expand all nodes */
  expandAll(): void;
  /** Collapse all nodes */
  collapseAll(): void;
  /** Set tree data */
  setData(data: FileTreeNode[]): void;
  /** Add a node under a parent */
  addNode(parentId: string | null, node: FileTreeNode): void;
  /** Remove a node by ID */
  removeNode(id: string): void;
  /** Update a node's data */
  updateNode(id: string, updates: Partial<FileTreeNode>): void;
  /** Find a node by ID */
  findNode(id: string): FileTreeNode | undefined;
  /** Filter visible nodes */
  setFilter(query: string): void;
  /** Refresh / re-render */
  refresh(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Icon Map by Extension ---

const FILE_ICONS: Record<string, string> = {
  "": "&#128196;",       // Default file
  ".js": "&#128736;",
  ".ts": "&#128736;",
  ".jsx": "&#128736;",
  ".tsx": "&#128736;",
  ".html": "&#127922;",
  ".css": "&#128176;",
  ".json": "{ }",
  ".md": "&#128221;",
  ".png": "&#128444;",
  ".jpg": "&#128444;",
  ".jpeg": "&#128444;",
  ".gif": "&#128444;",
  ".svg": "&#128247;",
  ".pdf": "&#128214;",
  ".zip": "&#128230;",
  ".mp3": "&#127925;",
  ".mp4": "&#127916;",
  ".txt": "&#128196;",
};

const FOLDER_OPEN_ICON = "&#128193;";
const FOLDER_CLOSED_ICON = "&#128194;";

// --- Helpers ---

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: Date | string | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getFileIcon(node: FileTreeNode): string {
  if (node.icon) return node.icon;
  if (node.type === "folder") return FOLDER_CLOSED_ICON;
  const ext = node.extension ? `.${node.extension.toLowerCase()}` : "";
  return FILE_ICONS[ext] ?? FILE_ICONS[""];
}

function matchesFilter(node: FileTreeNode, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (node.name.toLowerCase().includes(q)) return true;
  if (node.children) return node.children.some((c) => matchesFilter(c, q));
  return false;
}

function flattenVisible(nodes: FileTreeNode[], expandedIds: Set<string>, query: string): FileTreeNode[] {
  const result: FileTreeNode[] = [];
  for (const node of nodes) {
    const isExpanded = expandedIds.has(node.id);
    const match = query ? matchesFilter(node, query) : true;

    // Always include matching nodes or ancestors of matching descendants
    if (match || (query && node.children?.some((c) => matchesFilter(c, query)))) {
      result.push(node);
      if (node.type === "folder" && isExpanded && node.children) {
        result.push(...flattenVisible(node.children, expandedIds, query));
      }
    }
  }
  return result;
}

// --- Core Factory ---

/**
 * Create a file tree explorer component.
 *
 * @example
 * ```ts
 * const tree = createFileTree({
 *   data: [
 *     { id: "src", name: "src", type: "folder", children: [...] },
 *     { id: "readme", name: "README.md", type: "file", extension: "md" },
 *   ],
 *   onSelect: (nodes) => console.log("Selected:", nodes),
 * });
 * ```
 */
export function createFileTree(options: FileTreeOptions): FileTreeInstance {
  const {
    data,
    multiSelect = false,
    showSize = false,
    showModified = false,
    showIcons = true,
    showExtension = true,
    defaultExpandedIds = new Set(),
    defaultSelectedIds,
    height,
    filterQuery = "",
    contextMenuItems,
    draggable = false,
    droppable = false,
    onSelect,
    onToggle,
    onOpen,
    onDrop,
    onLazyLoad,
    className,
    container,
  } = options;

  let _data = [...data];
  let _expandedIds = new Set(defaultExpandedIds);
  let _selection: TreeSelection = {
    ids: new Set(Array.isArray(defaultSelectedIds) ? defaultSelectedIds : defaultSelectedIds ? [...defaultSelectedIds] : []),
    focusedId: null,
  };
  let _filterQuery = filterQuery;
  let _contextMenu: HTMLElement | null = null;
  let _dragNodeId: string | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `file-tree ${className ?? ""}`.trim();
  root.setAttribute("role", "tree");
  root.setAttribute("aria-label", "File browser");
  root.style.cssText =
    "font-family:-apple-system,sans-serif;font-size:13px;color:#374151;" +
    "user-select:none;outline:none;" +
    (height ? `height:${height}px;overflow-y:auto;` : "");

  // --- Render ---

  function render(): void {
    root.innerHTML = "";

    const visibleNodes = flattenVisible(_data, _expandedIds, _filterQuery);

    if (visibleNodes.length === 0 && _filterQuery) {
      const empty = document.createElement("div");
      empty.textContent = `No results for "${_filterQuery}"`;
      empty.style.cssText = "padding:20px;text-align:center;color:#9ca3af;";
      root.appendChild(empty);
      return;
    }

    renderNodes(visibleNodes, root, 0);
  }

  function renderNodes(nodes: FileTreeNode[], parentEl: HTMLElement, depth: number): void {
    for (const node of nodes) {
      const row = createNodeRow(node, depth);
      parentEl.appendChild(row);
    }
  }

  function createNodeRow(node: FileTreeNode, depth: number): HTMLElement {
    const isFolder = node.type === "folder";
    const isExpanded = _expandedIds.has(node.id);
    const isSelected = _selection.ids.has(node.id);
    const isFocused = _selection.focusedId === node.id;
    const hasChildren = isFolder && (node.children?.length ?? 0) > 0 || node.lazy;

    const row = document.createElement("div");
    row.className = `file-tree-node ${isFolder ? "folder" : "file"}`;
    row.dataset.nodeId = node.id;
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-expanded", String(isExpanded));
    row.setAttribute("aria-selected", String(isSelected));
    row.tabIndex = isFocused ? 0 : -1;
    row.draggable = draggable && !isFolder ? true : false;
    row.style.cssText =
      "display:flex;align-items:center;gap:4px;padding:2px 6px;" +
      `padding-left:${12 + depth * 18}px;` +
      "cursor:pointer;border-radius:4px;transition:background 0.08s;" +
      (isSelected ? "background:#dbeafe;" : "") +
      (isFocused ? "outline:1px solid #3b82f6;outline-offset:-1px;" : "");

    // Expand/collapse arrow
    if (isFolder) {
      const arrow = document.createElement("span");
      arrow.className = "tree-arrow";
      arrow.innerHTML = isExpanded ? "\u25BC" : "\u25B6";
      arrow.style.cssText =
        "width:14px;text-align:center;font-size:9px;color:#9ca3af;" +
        "flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;" +
        `transform:${isExpanded ? "" : "rotate(0deg)"};
        transition:transform 0.12s;`;
      row.appendChild(arrow);
    } else {
      const spacer = document.createElement("span");
      spacer.style.cssText = "width:14px;flex-shrink:0;";
      row.appendChild(spacer);
    }

    // Icon
    if (showIcons) {
      const icon = document.createElement("span");
      icon.className = "tree-icon";
      icon.innerHTML = isFolder
        ? (isExpanded ? FOLDER_OPEN_ICON : FOLDER_CLOSED_ICON)
        : getFileIcon(node);
      icon.style.cssText = "font-size:15px;flex-shrink:0;line-height:1;width:18px;text-align:center;";
      row.appendChild(icon);
    }

    // Name
    const nameEl = document.createElement("span");
    nameEl.className = "tree-name";
    nameEl.textContent = node.name + (showExtension && !isFolder && node.extension ? `.${node.extension}` : "");
    nameEl.style.cssText =
      "flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" +
      (isFolder ? "font-weight:500;" : "");
    row.appendChild(nameEl);

    // Size column
    if (showSize && !isFolder && node.size !== undefined) {
      const sizeEl = document.createElement("span");
      sizeEl.textContent = formatFileSize(node.size);
      sizeEl.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;flex-shrink:0;";
      row.appendChild(sizeEl);
    }

    // Modified column
    if (showModified && node.modifiedAt) {
      const modEl = document.createElement("span");
      modEl.textContent = formatDate(node.modifiedAt);
      modEl.style.cssText = "font-size:11px;color:#9ca3af;margin-left:12px;flex-shrink:0;white-space:nowrap;";
      row.appendChild(modEl);
    }

    // Lazy loading indicator
    if (isFolder && node.lazy && isExpanded && !node.children?.length) {
      const loading = document.createElement("span");
      loading.textContent = "...";
      loading.style.cssText = "color:#9ca3af;font-style:italic;margin-left:8px;";
      row.appendChild(loading);

      // Trigger lazy load
      if (onLazyLoad) {
        onLazyLoad(node).then((children) => {
          node.children = children;
          delete node.lazy;
          render();
        }).catch(() => {
          loading.textContent = "(error)";
        });
      }
    }

    // --- Events ---

    row.addEventListener("click", (e) => {
      e.stopPropagation();

      if (isFolder) {
        toggleExpand(node.id);
      } else {
        handleSelect(node.id, e.shiftKey);
      }
    });

    row.addEventListener("dblclick", () => {
      if (!isFolder) onOpen?.(node);
    });

    row.addEventListener("keydown", (e) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (isFolder) toggleExpand(node.id);
          else { handleSelect(node.id); if (!isFolder) onOpen?.(node); }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (isFolder && !_expandedIds.has(node.id)) expand(node.id);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (isFolder && _expandedIds.has(node.id)) collapse(node.id);
          break;
        case "ArrowDown":
          e.preventDefault();
          focusNext(row);
          break;
        case "ArrowUp":
          e.preventDefault();
          focusPrev(row);
          break;
        case "a":
          if ((e.ctrlKey || e.metaKey) && multiSelect) {
            e.preventDefault();
            selectAllVisible();
          }
          break;
      }
    });

    // Context menu
    if (contextMenuItems && contextMenuItems.length > 0) {
      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showContextMenu(e, node);
      });
    }

    // Drag start
    if (draggable && !isFolder) {
      row.addEventListener("dragstart", (e) => {
        _dragNodeId = node.id;
        e.dataTransfer!.setData("text/plain", node.id);
        row.style.opacity = "0.5";
      });

      row.addEventListener("dragend", () => {
        _dragNodeId = null;
        row.style.opacity = "";
      });
    }

    // Drop target
    if (droppable && isFolder) {
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        row.style.background = "#eff6ff";
      });

      row.addEventListener("dragleave", () => {
        row.style.background = isSelected ? "#dbeafe" : "";
      });

      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.style.background = isSelected ? "#dbeafe" : "";
        if (_dragNodeId) {
          const draggedNode = instance.findNode(_dragNodeId);
          if (draggedNode) onDrop?.(draggedNode, node);
        }
      });
    }

    // Hover effect
    row.addEventListener("mouseenter", () => {
      if (!isSelected) row.style.background = "#f9fafb";
    });
    row.addEventListener("mouseleave", () => {
      if (!isSelected) row.style.background = "";
    });

    return row;
  }

  // --- Selection Logic ---

  function handleSelect(id: string, shiftKey = false): void {
    if (multiSelect && shiftKey && _selection.focusedId) {
      // Range selection - add range between focused and clicked
      const visibleNodes = flattenVisible(_data, _expandedIds, _filterQuery);
      const focusedIdx = visibleNodes.findIndex((n) => n.id === _selection.focusedId);
      const clickIdx = visibleNodes.findIndex((n) => n.id === id);
      if (focusedIdx >= 0 && clickIdx >= 0) {
        const [start, end] = [Math.min(focusedIdx, clickIdx), Math.max(focusedIdx, clickIdx)];
        for (let i = start; i <= end; i++) {
          _selection.ids.add(visibleNodes[i]!.id);
        }
      }
    } else if (multiSelect) {
      // Toggle
      if (_selection.ids.has(id)) _selection.ids.delete(id);
      else _selection.ids.add(id);
    } else {
      _selection.ids.clear();
      _selection.ids.add(id);
    }

    _selection.focusedId = id;
    render();
    onSelect?.(instance.getSelectedNodes(), instance.getSelection());
  }

  function selectAllVisible(): void {
    const visibleNodes = flattenVisible(_data, _expandedIds, _filterQuery);
    for (const n of visibleNodes) _selection.ids.add(n.id);
    render();
    onSelect?.(instance.getSelectedNodes(), instance.getSelection());
  }

  // --- Navigation Helpers ---

  function focusNext(currentRow: HTMLElement): void {
    const rows = Array.from(root.querySelectorAll("[role='treeitem']"));
    const idx = rows.indexOf(currentRow);
    if (idx < rows.length - 1) {
      const next = rows[idx + 1] as HTMLElement;
      next.focus();
      _selection.focusedId = next.dataset.nodeId ?? null;
    }
  }

  function focusPrev(currentRow: HTMLElement): void {
    const rows = Array.from(root.querySelectorAll("[role='treeitem']"));
    const idx = rows.indexOf(currentRow);
    if (idx > 0) {
      const prev = rows[idx - 1] as HTMLElement;
      prev.focus();
      _selection.focusedId = prev.dataset.nodeId ?? null;
    }
  }

  // --- Expand/Collapse ---

  function toggleExpand(id: string): void {
    if (_expandedIds.has(id)) collapse(id);
    else expand(id);
  }

  function expand(id: string): void {
    _expandedIds.add(id);
    onToggle?.(instance.findNode(id)!, true);
    render();
  }

  function collapse(id: string): void {
    _expandedIds.delete(id);
    onToggle?.(instance.findNode(id)!, false);
    render();
  }

  // --- Context Menu ---

  function showContextMenu(e: MouseEvent, node: FileTreeNode): void {
    // Remove existing
    hideContextMenu();

    _contextMenu = document.createElement("div");
    _contextMenu.className = "file-tree-context-menu";
    _contextMenu.style.cssText =
      "position:fixed;z-index:9999;background:#fff;border:1px solid #e5e7eb;" +
      "border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:4px 0;" +
      "min-width:160px;font-size:13px;";

    for (const item of contextMenuItems!) {
      if (item.divider) {
        const div = document.createElement("div");
        div.style.cssText = "height:1px;background:#f3f4f6;margin:4px 8px;";
        _contextMenu.appendChild(div);
        continue;
      }

      const menuItem = document.createElement("button");
      menuItem.type = "button";
      menuItem.style.cssText =
        "display:flex;align-items:center;gap:6px;width:100%;padding:6px 12px;" +
        "border:none;background:none;cursor:pointer;font-size:13px;color:#374151;" +
        "text-align:left;" +
        (item.disabled ? "opacity:0.4;cursor:not-allowed;" : "");

      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = item.icon;
        iconSpan.style.flexShrink = "0";
        menuItem.appendChild(iconSpan);
      }

      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      menuItem.appendChild(labelSpan);

      if (!item.disabled) {
        menuItem.addEventListener("click", () => {
          item.action(node);
          hideContextMenu();
        });
        menuItem.addEventListener("mouseenter", () => { menuItem.style.background = "#f3f4f6"; });
        menuItem.addEventListener("mouseleave", () => { menuItem.style.background = ""; });
      }

      _contextMenu.appendChild(menuItem);
    }

    document.body.appendChild(_contextMenu);

    // Position
    const x = Math.min(e.clientX, window.innerWidth - 180);
    const y = Math.min(e.clientY, window.innerHeight - (_contextMenu.offsetHeight + 10));
    _contextMenu.style.left = `${x}px`;
    _contextMenu.style.top = `${y}px`;

    // Close on outside click
    requestAnimationFrame(() => {
      document.addEventListener("mousedown", closeContextMenuOnOutside);
    });
  }

  function hideContextMenu(): void {
    if (_contextMenu) {
      _contextMenu.remove();
      _contextMenu = null;
      document.removeEventListener("mousedown", closeContextMenuOnOutside);
    }
  }

  function closeContextMenuOnOutside(e: MouseEvent): void {
    if (_contextMenu && !_contextMenu.contains(e.target as Node)) {
      hideContextMenu();
    }
  }

  // --- Find Node Helper ---

  function findInTree(nodes: FileTreeNode[], id: string): FileTreeNode | undefined {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findInTree(node.children, id);
        if (found) return found;
      }
    }
    return undefined;
  }

  // --- Instance ---

  const instance: FileTreeInstance = {
    el: root,

    getSelection() { return { ..._selection, ids: new Set(_selection.ids) }; },

    getSelectedNodes() {
      return Array.from(_selection.ids)
        .map((id) => findInTree(_data, id))
        .filter((n): n is FileTreeNode => n !== undefined);
    },

    select(id, addToExisting) {
      if (!addToExisting) _selection.ids.clear();
      _selection.ids.add(id);
      _selection.focusedId = id;
      render();
      onSelect?.(instance.getSelectedNodes(), instance.getSelection());
    },

    deselectAll() {
      _selection.ids.clear();
      _selection.focusedId = null;
      render();
      onSelect?.([], { ids: new Set(), focusedId: null });
    },

    expand, collapse,

    expandAll() {
      function collectFolders(nodes: FileTreeNode[]): string[] {
        const ids: string[] = [];
        for (const n of nodes) {
          if (n.type === "folder") ids.push(n.id);
          if (n.children) ids.push(...collectFolders(n.children));
        }
        return ids;
      }
      collectFolders(_data).forEach((id) => _expandedIds.add(id));
      render();
    },

    collapseAll() {
      _expandedIds.clear();
      render();
    },

    setData(data) {
      _data = data;
      render();
    },

    addNode(parentId, node) {
      if (parentId === null) {
        _data.push(node);
      } else {
        const parent = findInTree(_data, parentId);
        if (parent && parent.type === "folder") {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      }
      render();
    },

    removeNode(id) {
      function removeFromArray(arr: FileTreeNode[]): boolean {
        const idx = arr.findIndex((n) => n.id === id);
        if (idx >= 0) { arr.splice(idx, 1); return true; }
        return arr.some((n) => n.children ? removeFromArray(n.children) : false);
      }
      removeFromArray(_data);
      _selection.ids.delete(id);
      if (_selection.focusedId === id) _selection.focusedId = null;
      render();
    },

    updateNode(id, updates) {
      const node = findInTree(_data, id);
      if (node) Object.assign(node, updates);
      render();
    },

    findNode(id) { return findInTree(_data, id); },

    setFilter(query) {
      _filterQuery = query;
      render();
    },

    refresh() { render(); },

    destroy() {
      hideContextMenu();
      root.remove();
    },
  };

  // Initial render
  render();

  if (container) container.appendChild(root);

  return instance;
}
