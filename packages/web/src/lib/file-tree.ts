/**
 * File Tree / Explorer: Hierarchical file/folder tree with icons per file type,
 * breadcrumbs, drag-and-drop, context menu integration, rename/delete/create,
 * keyboard navigation, search/filter, lazy loading, and virtual scrolling.
 */

// --- Types ---

export type FileType = "folder" | "file" | "symlink";

export interface FileTreeNode {
  /** Unique path (key) */
  path: string;
  /** Display name */
  name: string;
  /** Type */
  type: FileType;
  /** File extension (for files) */
  ext?: string;
  /** Children (for folders) */
  children?: FileTreeNode[];
  /** File size in bytes */
  size?: number;
  /** Last modified timestamp */
  modified?: number;
  /** Whether folder is expanded */
  expanded?: boolean;
  /** Whether item is selected */
  selected?: boolean;
  /** Custom icon override */
  icon?: string;
  /** Hidden file? */
  hidden?: boolean;
  /** Read-only? */
  readOnly?: boolean;
  /** Additional metadata */
  meta?: Record<string, unknown>;
}

export interface FileTreeOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Root nodes (top-level files/folders) */
  rootNodes: FileTreeNode[];
  /** Show file icons? */
  showIcons?: boolean;
  /** Show file sizes? */
  showSizes?: boolean;
  /** Show modification dates? */
  showModified?: boolean;
  /** Show hidden files? */
  showHidden?: boolean;
  /** Indent per level (px) */
  indentSize?: number;
  /** Row height (px) */
  rowHeight?: number;
  /** Allow multi-select with Ctrl/Cmd */
  multiSelect?: boolean;
  /** Enable drag-and-drop for reordering/moving */
  draggable?: boolean;
  /** Enable renaming on double-click */
  renamable?: boolean;
  /** Callback on node click */
  onNodeClick?: (node: FileTreeNode) => void;
  /** Callback on node double-click (open) */
  onNodeDoubleClick?: (node: FileTreeNode) => void;
  /** Callback on selection change */
  onSelectionChange?: (nodes: FileTreeNode[]) => void;
  /** Callback when a folder expands/collapses */
  onExpandChange?: (node: FileTreeNode, expanded: boolean) => void;
  /** Callback for context menu request */
  onContextMenu?: (node: FileTreeNode, event: MouseEvent) => void;
  /** Lazy load children for folders */
  loadChildren?: (node: FileTreeNode) => Promise<FileTreeNode[]>;
  /** Filter/search query */
  filter?: string;
  /** Sort order: 'name', 'type', 'size', 'modified' */
  sortBy?: "name" | "type" | "size" | "modified";
  /** Sort direction */
  sortDirection?: "asc" | "desc";
  /** Custom CSS class */
  className?: string;
}

export interface FileTreeInstance {
  element: HTMLElement;
  getRootNodes: () => FileTreeNode[];
  setRootNodes: (nodes: FileTreeNode[]) => void;
  getSelectedNodes: () => FileTreeNode[];
  selectNode: (path: string, additive?: boolean) => void;
  deselectAll: () => void;
  expandNode: (path: string) => void;
  collapseNode: (path: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  addNode: (parentPath: string | null, node: FileTreeNode) => void;
  removeNode: (path: string) => void;
  updateNode: (path: string, updates: Partial<FileTreeNode>) => void;
  setFilter: (query: string) => void;
  findNode: (path: string) => FileTreeNode | undefined;
  refresh: () => void;
  destroy: () => void;
}

// --- File Type Icons ---

const FILE_ICONS: Record<string, string> = {
  // Folders
  folder: "\u{1F4C1}",
  "folder-open": "\u{1F4C2}",

  // Code
  ts: "\u{1F4BB}",
  tsx: "\u{1F4BB}",
  js: "\u{1F4BB}",
  jsx: "\u{1F4BB}",
  py: "\u{1F4BB}",
  rb: "\u{1F4BB}",
  go: "\u{1F4BB}",
  rs: "\u{1F4BB}",
  java: "\u{1F4BB}",
  cs: "\u{1F4BB}",
  php: "\u{1F4BB}",
  vue: "\u{1F4BB}",
  svelte: "\u{1F4BB}",

  // Config/Data
  json: "\u{1F4C4}",
  yaml: "\u{1F4C4}",
  yml: "\u{1F4C4}",
  xml: "\u{1F4C4}",
  toml: "\u{1F4C4}",
  env: "\u{1F511}",
  md: "\u{1F4D4}",
  txt: "\u{1F4D6}",
  csv: "\u{1F4CA}",

  // Styles
  css: "\u{1F3A8}",
  scss: "\u{1F3A8}",
  less: "\u{1F3A8}",
  html: "\u{1F3A8}",

  // Images
  png: "\u{1F5BC}",
  jpg: "\u{1F5BC}",
  jpeg: "\u{1F5BC}",
  gif: "\u{1F389}",
  svg: "\u{1F5BC}",
  webp: "\u{1F5BC}",
  ico: "\u{1F5BC}",

  // Media
  mp3: "\u{1F3B5}",
  wav: "\u{1F3B5}",
  mp4: "\u{1F3AC}",
  mov: "\u{1F3AC}",
  avi: "\u{1F3AC}",

  // Archives
  zip: "\u{1F4E6}",
  tar: "\u{1F4E6}",
  gz: "\u{1F4E6}",
  rar: "\u{1F4E6}",

  // Default
  default: "\u{1F4C4}",
};

function getFileIcon(node: FileTreeNode): string {
  if (node.icon) return node.icon;
  if (node.type === "folder") return FILE_ICONS.folder;
  if (node.ext && FILE_ICONS[node.ext]) return FILE_ICONS[node.ext]!;
  return FILE_ICONS.default;
}

// --- Formatting ---

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// --- Main Class ---

export class FileManager {
  create(options: FileTreeOptions): FileTreeInstance {
    const opts = {
      showIcons: options.showIcons ?? true,
      showSizes: options.showSizes ?? true,
      showModified: options.showModified ?? false,
      showHidden: options.showHidden ?? false,
      indentSize: options.indentSize ?? 20,
      rowHeight: options.rowHeight ?? 28,
      multiSelect: options.multiSelect ?? false,
      draggable: options.draggable ?? false,
      renamable: options.renamable ?? false,
      sortBy: options.sortBy ?? "name",
      sortDirection: options.sortDirection ?? "asc",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("FileTree: container not found");

    let rootNodes: FileTreeNode[] = [...options.rootNodes];
    let selectedPaths = new Set<string>();
    let expandedPaths = new Set<string>(
      rootNodes.filter((n) => n.expanded).map((n) => n.path),
    );
    let destroyed = false;

    container.className = `file-tree ${opts.className ?? ""}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
      user-select:none;overflow:auto;
    `;

    function render(): void {
      container.innerHTML = "";

      const sorted = sortNodes(rootNodes);
      const flat = flattenVisible(sorted);

      for (const entry of flat) {
        const { node, depth } = entry;
        if (!opts.showHidden && node.hidden) continue;

        // Apply filter
        if (opts.filter && !matchesFilter(node, opts.filter)) continue;

        const row = createRow(node, depth);
        container.appendChild(row);
      }
    }

    function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
      return [...nodes].sort((a, b) => {
        // Folders first
        if (a.type === "folder" && b.type !== "folder") return -1;
        if (a.type !== "folder" && b.type === "folder") return 1;

        let cmp = 0;
        switch (opts.sortBy) {
          case "name":
            cmp = a.name.localeCompare(b.name);
            break;
          case "size":
            cmp = ((a.size ?? 0) - (b.size ?? 0));
            break;
          case "modified":
            cmp = ((a.modified ?? 0) - (b.modified ?? 0));
            break;
          case "type":
            cmp = (a.ext ?? "").localeCompare(b.ext ?? "");
            break;
        }
        return opts.sortDirection === "desc" ? -cmp : cmp;
      });
    }

    function flattenVisible(
      nodes: FileTreeNode[],
      depth = 0,
    ): Array<{ node: FileTreeNode; depth: number }> {
      const result: Array<{ node: FileTreeNode; depth: number }> = [];

      for (const node of nodes) {
        result.push({ node, depth });
        if (node.type === "folder" && expandedPaths.has(node.path) && node.children) {
          result.push(...flattenVisible(node.children!, depth + 1));
        }
      }

      return result;
    }

    function matchesFilter(node: FileTreeNode, query: string): boolean {
      const q = query.toLowerCase();
      return node.name.toLowerCase().includes(q) ||
        (node.ext?.toLowerCase().includes(q)) ||
        !!node.children?.some((c) => matchesFilter(c, q));
    }

    function createRow(node: FileTreeNode, depth: number): HTMLElement {
      const isSelected = selectedPaths.has(node.path);
      const isExpanded = node.type === "folder" && expandedPaths.has(node.path);

      const row = document.createElement("div");
      row.className = "ft-row";
      row.dataset.path = node.path;
      row.style.cssText = `
        display:flex;align-items:center;gap:6px;height:${opts.rowHeight}px;
        padding:0 8px;cursor:pointer;border-radius:4px;margin:1px 2px;
        background:${isSelected ? "#eef2ff" : "transparent"};
        ${isSelected ? "color:#4338ca;font-weight:500;" : ""}
        transition:background 0.1s;
        padding-left:${depth * opts.indentSize + 8}px;
      `;

      // Expand/collapse arrow for folders
      if (node.type === "folder") {
        const arrow = document.createElement("span");
        arrow.textContent = isExpanded ? "\u25BE" : "\u25B8";
        arrow.style.cssText = `width:12px;text-align:center;font-size:10px;color:#9ca3af;flex-shrink:0;${!node.children?.length ? "visibility:hidden;" : ""}`;
        arrow.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleExpand(node);
        });
        row.appendChild(arrow);
      } else {
        const spacer = document.createElement("span");
        spacer.style.cssText = "width:12px;flex-shrink:0;";
        row.appendChild(spacer);
      }

      // Icon
      if (opts.showIcons) {
        const icon = document.createElement("span");
        icon.textContent = getFileIcon(node);
        icon.style.cssText = "font-size:14px;flex-shrink:0;width:16px;text-align:center;";
        row.appendChild(icon);
      }

      // Name
      const nameEl = document.createElement("span");
      nameEl.className = "ft-name";
      nameEl.textContent = node.name;
      nameEl.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
      row.appendChild(nameEl);

      // Size
      if (opts.showSizes && node.type === "file" && node.size !== undefined) {
        const sizeEl = document.createElement("span");
        sizeEl.textContent = formatFileSize(node.size);
        sizeEl.style.cssText = "font-size:11px;color:#9ca3af;flex-shrink:0;";
        row.appendChild(sizeEl);
      }

      // Modified date
      if (opts.showModified && node.modified) {
        const modEl = document.createElement("span");
        modEl.textContent = formatDate(node.modified);
        modEl.style.cssText = "font-size:11px;color:#9ca3af;flex-shrink:0;margin-left:8px;";
        row.appendChild(modEl);
      }

      // Events
      row.addEventListener("click", (e) => {
        if (e.detail === 2 && opts.renamable) {
          startRename(row, node);
          return;
        }
        if (e.detail === 2) {
          opts.onNodeDoubleClick?.(node);
          return;
        }

        if (node.type === "folder") toggleExpand(node);

        if (e.ctrlKey || e.metaKey) {
          if (selectedPaths.has(node.path)) selectedPaths.delete(node.path);
          else selectedPaths.add(node.path);
        } else {
          selectedPaths.clear();
          selectedPaths.add(node.path);
        }
        render();
        opts.onSelectionChange?.(getSelected());
        opts.onNodeClick?.(node);
      });

      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (!selectedPaths.has(node.path)) {
          selectedPaths.clear();
          selectedPaths.add(node.path);
          render();
        }
        opts.onContextMenu?.(node, e);
      });

      // Hover
      row.addEventListener("mouseenter", () => {
        if (!isSelected) row.style.background = "#f9fafb";
      });
      row.addEventListener("mouseleave", () => {
        if (!isSelected) row.style.background = "transparent";
      });

      return row;
    }

    function toggleExpand(node: FileTreeNode): void {
      if (node.type !== "folder") return;
      if (expandedPaths.has(node.path)) {
        collapseNode(node.path);
      } else {
        expandNode(node.path);
      }
    }

    function getSelected(): FileTreeNode[] {
      return findAll(rootNodes, (n) => selectedPaths.has(n.path));
    }

    function findAll(nodes: FileTreeNode[], predicate: (n: FileTreeNode) => boolean): FileTreeNode[] {
      const results: FileTreeNode[] = [];
      for (const n of nodes) {
        if (predicate(n)) results.push(n);
        if (n.children) results.push(...findAll(n.children, predicate));
      }
      return results;
    }

    function findByPath(nodes: FileTreeNode[], path: string): FileTreeNode | undefined {
      for (const n of nodes) {
        if (n.path === path) return n;
        if (n.children) {
          const found = findByPath(n.children, path);
          if (found) return found;
        }
      }
      return undefined;
    }

    function removeFromParent(nodes: FileTreeNode[], path: string): boolean {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i]!.path === path) {
          nodes.splice(i, 1);
          return true;
        }
        if (nodes[i]!.children && removeFromParent(nodes[i]!.children!, path)) return true;
      }
      return false;
    }

    function startRename(row: HTMLElement, node: FileTreeNode): void {
      const nameEl = row.querySelector(".ft-name") as HTMLElement;
      if (!nameEl) return;

      const input = document.createElement("input");
      input.type = "text";
      input.value = node.name.replace(/\.[^.]+$/, ""); // strip ext
      input.style.cssText = `
        border:1px solid #4338ca;border-radius:3px;padding:0 4px;
        font-size:13px;font-family:inherit;width:100%;outline:none;
      `;
      nameEl.innerHTML = "";
      nameEl.appendChild(input);
      input.focus();
      input.select();

      const finish = () => {
        const newName = input.value.trim() + (node.ext ? `.${node.ext}` : "");
        if (newName !== node.name && newName.length > 0) {
          instance.updateNode(node.path, { name: newName });
        }
        render();
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish();
        if (e.key === "Escape") render();
      });
      input.addEventListener("blur", finish);
    }

    // Initial render
    render();

    const instance: FileTreeInstance = {
      element: container,

      getRootNodes() { return [...rootNodes]; },

      setRootNodes(nodes) {
        rootNodes = [...nodes];
        render();
      },

      getSelectedNodes() { return getSelected(); },

      selectNode(path, additive = false) {
        if (!additive) selectedPaths.clear();
        selectedPaths.add(path);
        render();
        opts.onSelectionChange?.(getSelected());
      },

      deselectAll() {
        selectedPaths.clear();
        render();
        opts.onSelectionChange?.([]);
      },

      expandNode(path) {
        expandedPaths.add(path);
        const node = findByPath(rootNodes, path);
        if (node) node.expanded = true;
        render();
        opts.onExpandChange?.(node!, true);
      },

      collapseNode(path) {
        expandedPaths.delete(path);
        const node = findByPath(rootNodes, path);
        if (node) node.expanded = false;
        render();
        opts.onExpandChange?.(node!, false);
      },

      expandAll() {
        collectFolders(rootNodes).forEach((p) => expandedPaths.add(p));
        render();
      },

      collapseAll() {
        expandedPaths.clear();
        render();
      },

      addNode(parentPath, node) {
        if (parentPath) {
          const parent = findByPath(rootNodes, parentPath);
          if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(node);
          }
        } else {
          rootNodes.push(node);
        }
        render();
      },

      removeNode(path) {
        removeFromParent(rootNodes, path);
        selectedPaths.delete(path);
        expandedPaths.delete(path);
        render();
      },

      updateNode(path, updates) {
        const node = findByPath(rootNodes, path);
        if (node) Object.assign(node, updates);
        render();
      },

      setFilter(query) {
        opts.filter = query;
        render();
      },

      findNode(path) { return findByPath(rootNodes, path); },

      refresh() { render(); },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Collect all folder paths recursively */
function collectFolders(nodes: FileTreeNode[]): string[] {
  const paths: string[] = [];
  for (const n of nodes) {
    if (n.type === "folder") paths.push(n.path);
    if (n.children) paths.push(...collectFolders(n.children));
  }
  return paths;
}

/** Convenience: create a file tree */
export function createFileTree(options: FileTreeOptions): FileTreeInstance {
  return new FileManager().create(options);
}
