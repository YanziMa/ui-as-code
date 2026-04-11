/**
 * File Explorer: Full file browser UI with toolbar, address bar, sidebar,
 * grid/list view toggle, sort options, new folder dialog, upload area,
 * drag-and-drop, context menu, breadcrumbs, and status bar.
 */

// --- Types ---

export type ViewMode = "grid" | "list" | "details";
export type SortField = "name" | "size" | "type" | "modified";

export interface FileEntry {
  name: string;
  type: "file" | "folder";
  size?: number;
  modified?: Date;
  ext?: string;
  icon?: string;
  thumbnail?: string;
  path: string;
}

export interface FileExplorerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial files (root directory) */
  files?: FileEntry[];
  /** Current path display */
  currentPath?: string;
  /** View mode */
  viewMode?: ViewMode;
  /** Sort field */
  sortBy?: SortField;
  /** Show sidebar? */
  showSidebar?: boolean;
  /** Show toolbar? */
  showToolbar?: boolean;
  /** Show status bar? */
  showStatusBar?: boolean;
  /** Allow file upload via drop zone? */
  allowUpload?: boolean;
  /** Allow creating new folders? */
  allowNewFolder?: boolean;
  /** Breadcrumb items */
  breadcrumbs?: Array<{ label: string; path: string }>;
  /** Callback on breadcrumb click */
  onNavigate?: (path: string) => void;
  /** Callback on file double-click (open) */
  onFileOpen?: (file: FileEntry) => void;
  /** Callback on selection change */
  onSelectionChange?: (files: FileEntry[]) => void;
  /** Callback on file upload */
  onUpload?: (files: FileList) => void;
  /** Custom CSS class */
  className?: string;
}

export interface FileExplorerInstance {
  element: HTMLElement;
  setFiles: (files: FileEntry[]) => void;
  getSelectedFiles: () => FileEntry[];
  setPath: (path: string) => void;
  setViewMode: (mode: ViewMode) => void;
  refresh: () => void;
  destroy: () => void;
}

// --- Helpers ---

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const FILE_ICONS: Record<string, string> = {
  folder: "\u{1F4C1}",
  jpg: "\u{1F5BC}", jpeg: "\u{1F5BC}", png: "\u{1F5BC}", gif: "\u{1F389}", svg: "\u{1F5BC}", webp: "\u{1F5BC}",
  mp4: "\u{1F3AC}", mov: "\u{1F3AC}", mp3: "\u{1F3B5}",
  pdf: "\u{1F4DF}", doc: "\u{1F4C4}", xls: "\u{1F4CA}", ppt: "\u{1F4DA}",
  zip: "\u{1F4E6}", tar: "\u{1F4E6}", gz: "\u{1F4E6}",
  ts: "\u{1F4BB}", js: "\u{1F4BB}", py: "\u{1F4BB}", json: "\u{1F4C4}", md: "\u{1F4D4}",
  default: "\u{1F4C4}",
};

function getFileIcon(entry: FileEntry): string {
  if (entry.icon) return entry.icon;
  if (entry.type === "folder") return FILE_ICONS.folder;
  const ext = entry.ext?.toLowerCase() ?? "";
  return FILE_ICONS[ext] ?? FILE_ICONS.default;
}

// --- Main Factory ---

export function createFileExplorer(options: FileExplorerOptions): FileExplorerInstance {
  const opts = {
    viewMode: options.viewMode ?? "grid",
    sortBy: options.sortBy ?? "name",
    showSidebar: options.showSidebar ?? false,
    showToolbar: options.showToolbar ?? true,
    showStatusBar: options.showStatusBar ?? true,
    allowUpload: options.allowUpload ?? true,
    allowNewFolder: options.allowNewFolder ?? true,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("FileExplorer: container not found");

  let files = options.files ?? [];
  let selectedFiles = new Set<string>();
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `file-explorer ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:column;height:100%;min-height:300px;
    border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    background:#fff;
  `;
  container.appendChild(root);

  // Toolbar
  let toolbarEl: HTMLElement | null = null;
  if (opts.showToolbar) {
    toolbarEl = document.createElement("div");
    toolbarEl.className = "fe-toolbar";
    toolbarEl.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:8px 12px;
      border-bottom:1px solid #f0f0f0;background:#fafafa;flex-shrink:0;
    `;

    // Navigation buttons
    for (const [label, icon] of [["Back", "\u2190"], ["Forward", "\u2192"], ["Up", "\u2191"]]) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = icon;
      btn.title = label;
      btn.style.cssText = `
        width:28px;height:28px;border:1px solid #d1d5db;border-radius:4px;
        background:#fff;cursor:pointer;font-size:12px;display:flex;
        align-items:center;justify-content:center;color:#6b7280;
      `;
      btn.addEventListener("mouseenter", () => { btn.style.background = "#f3f4f6"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
      toolbarEl.appendChild(btn);
    }

    // Path / breadcrumbs
    const breadcrumbBar = document.createElement("div");
    breadcrumbBar.className = "fe-breadcrumbs";
    breadcrumbBar.style.cssText = "display:flex;align-items:center;gap:4px;flex:1;min-width:0;overflow-x:auto;";
    renderBreadcrumbs(breadcrumbBar);
    toolbarEl.appendChild(breadcrumbBar);

    // View toggle
    const viewBtn = document.createElement("button");
    viewBtn.type = "button";
    viewBtn.textContent = opts.viewMode === "grid" ? "\u2630" : "\u2263";
    viewBtn.title = "Toggle view";
    viewBtn.style.cssText = `
      padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;
      background:#fff;cursor:pointer;font-size:12px;color:#6b7280;
    `;
    viewBtn.addEventListener("click", () => {
      instance.setViewMode(opts.viewMode === "grid" ? "list" : "grid");
    });
    toolbarEl.appendChild(viewBtn);

    root.appendChild(toolbarEl);
  }

  // Main content area
  const contentArea = document.createElement("div");
  contentArea.className = "fe-content";
  contentArea.style.cssText = "flex:1;display:flex;overflow:hidden;";

  // Sidebar
  let sidebarEl: HTMLElement | null = null;
  if (opts.showSidebar) {
    sidebarEl = document.createElement("div");
    sidebarEl.className = "fe-sidebar";
    sidebarEl.style.cssText = `
      width:180px;border-right:1px solid #f0f0f0;padding:8px;
      background:#fafafa;flex-shrink:0;overflow-y:auto;
    `;
    const quickAccess = [
      { label: "Desktop", icon: "\u{1F5BB}" },
      { label: "Documents", icon: "\u{1F4C1}" },
      { label: "Downloads", icon: "\u2193" },
      { label: "Pictures", icon: "\u{1F5BC}" },
    ];
    for (const item of quickAccess) {
      const itemEl = document.createElement("button");
      itemEl.type = "button";
      itemEl.style.cssText = `
        display:flex;align-items:center;gap:6px;width:100%;
        padding:6px 10px;border:none;border-radius:4px;
        background:none;cursor:pointer;font-size:12px;color:#4b5563;text-align:left;
        transition:background 0.1s;
      `;
      itemEl.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
      itemEl.addEventListener("mouseenter", () => { itemEl.style.background = "#e5e7eb"; });
      itemEl.addEventListener("mouseleave", () => { itemEl.style.background = ""; });
      sidebarEl.appendChild(itemEl);
    }
    contentArea.appendChild(sidebarEl);
  }

  // File area
  const fileArea = document.createElement("div");
  fileArea.className = "fe-file-area";
  fileArea.style.cssText = "flex:1;overflow-y:auto;padding:12px;";

  // Drop zone overlay
  if (opts.allowUpload) {
    fileArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      fileArea.style.background = "#eff6ff";
    });
    fileArea.addEventListener("dragleave", () => {
      fileArea.style.background = "";
    });
    fileArea.addEventListener("drop", (e) => {
      e.preventDefault();
      fileArea.style.background = "";
      if (e.dataTransfer.files.length > 0) {
        opts.onUpload?.(e.dataTransfer.files);
      }
    });
  }

  contentArea.appendChild(fileArea);
  root.appendChild(contentArea);

  // Status bar
  let statusBarEl: HTMLElement | null = null;
  if (opts.showStatusBar) {
    statusBarEl = document.createElement("div");
    statusBarEl.className = "fe-status-bar";
    statusBarEl.style.cssText = `
      display:flex;justify-content:space-between;padding:6px 12px;
      border-top:1px solid #f0f0f0;background:#fafafa;font-size:11px;color:#9ca3af;flex-shrink:0;
    `;
    root.appendChild(statusBarEl);
  }

  // --- Rendering ---

  function renderBreadcrumbs(bar: HTMLElement): void {
    bar.innerHTML = "";
    const crumbs = options.breadcrumbs ?? [{ label: "/", path: "/" }];
    for (let i = 0; i < crumbs.length; i++) {
      const crumb = crumbs[i]!;
      if (i > 0) {
        const sep = document.createElement("span");
        sep.textContent = "/";
        sep.style.cssText = "color:#d1d5db;margin:0 2px;";
        bar.appendChild(sep);
      }
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = crumb.label;
      btn.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:12px;color:#4b5563;
        padding:2px 6px;border-radius:3px;white-space:nowrap;
      `;
      btn.addEventListener("click", () => opts.onNavigate?.(crumb.path));
      btn.addEventListener("mouseenter", () => { btn.style.background = "#e5e7eb"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
      bar.appendChild(btn);
    }
  }

  function renderFiles(): void {
    fileArea.innerHTML = "";

    if (files.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "display:flex;flex-direction:column;align-items:center;justify-content:center;height:200px;color:#9ca3af;";
      empty.innerHTML = `<div style="font-size:40px;margin-bottom:12px;">\u{1F4C1}</div><div style="font-size:14px;">This folder is empty</div>`;
      fileArea.appendChild(empty);
      updateStatusBar();
      return;
    }

    // Sort
    const sorted = [...files].sort((a, b) => {
      // Folders first
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      switch (opts.sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "size": return ((a.size ?? 0) - (b.size ?? 0));
        case "type": return (a.ext ?? "").localeCompare(b.ext ?? "");
        case "modified": return ((a.modified?.getTime() ?? 0) - (b.modified?.getTime() ?? 0));
        default: return 0;
      }
    });

    if (opts.viewMode === "grid") {
      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px;";

      for (const entry of sorted) {
        const card = createGridItem(entry);
        grid.appendChild(card);
      }
      fileArea.appendChild(grid);
    } else {
      const list = document.createElement("div");
      list.style.cssText = "display:flex;flex-direction:column;";

      // Header row
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;padding:6px 12px;
        font-size:11px;font-weight:600;color:#9ca3af;
        border-bottom:1px solid #f0f0f0;background:#fafafa;
      `;
      header.innerHTML = `<span style="flex:1">Name</span><span style="width:80px;text-align:right">Size</span><span style="width:140px;text-align:right">Modified</span>`;
      list.appendChild(header);

      for (const entry of sorted) {
        const row = createListItem(entry);
        list.appendChild(row);
      }
      fileArea.appendChild(list);
    }

    updateStatusBar();
  }

  function createGridItem(entry: FileEntry): HTMLElement {
    const isSelected = selectedFiles.has(entry.path);

    const card = document.createElement("div");
    card.dataset.path = entry.path;
    card.style.cssText = `
      display:flex;flex-direction:column;align-items:center;padding:12px 8px;
      border-radius:8px;cursor:pointer;border:2px solid transparent;
      transition:all 0.15s;${isSelected ? "border-color:#4338ca;background:#eef2ff;" : ""}
    `;

    // Thumbnail or icon
    const thumbArea = document.createElement("div");
    thumbArea.style.cssText = `
      width:64px;height:64px;border-radius:6px;display:flex;align-items:center;
      justify-content:center;font-size:32px;background:#f3f4f6;margin-bottom:6px;
      ${entry.thumbnail ? `background:url(${entry.thumbnail}) center/cover;` : ""}
    `;
    if (!entry.thumbnail) thumbArea.textContent = getFileIcon(entry);
    card.appendChild(thumbArea);

    // Name
    const name = document.createElement("div");
    name.textContent = entry.name;
    name.style.cssText = "font-size:11px;text-align:center;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    card.appendChild(name);

    card.addEventListener("click", (e) => handleSelect(entry, e));
    card.addEventListener("dblclick", () => opts.onFileOpen?.(entry));

    return card;
  }

  function createListItem(entry: FileEntry): HTMLElement {
    const isSelected = selectedFiles.has(entry.path);

    const row = document.createElement("div");
    row.dataset.path = entry.path;
    row.style.cssText = `
      display:flex;align-items:center;padding:6px 12px;cursor:pointer;
      border-bottom:1px solid #f9fafb;transition:background 0.08s;
      ${isSelected ? "background:#eef2ff;" : ""}
    `;

    const icon = document.createElement("span");
    icon.textContent = getFileIcon(entry);
    icon.style.cssText = "font-size:16px;width:24px;text-align:center;flex-shrink:0;";
    row.appendChild(icon);

    const name = document.createElement("span");
    name.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;";
    name.textContent = entry.name;
    row.appendChild(name);

    const size = document.createElement("span");
    size.style.cssText = "font-size:12px;color:#6b7280;width:80px;text-align:right;flex-shrink:0;";
    size.textContent = formatSize(entry.size ?? 0);
    row.appendChild(size);

    const mod = document.createElement("span");
    mod.style.cssText = "font-size:12px;color:#6b7280;width:140px;text-align:right;flex-shrink:0;";
    mod.textContent = entry.modified ? formatDate(entry.modified) : "—";
    row.appendChild(mod);

    row.addEventListener("click", (e) => handleSelect(entry, e));
    row.addEventListener("dblclick", () => opts.onFileOpen?.(entry));

    return row;
  }

  function handleSelect(entry: FileEntry, e: MouseEvent): void {
    if (e.ctrlKey || e.metaKey) {
      if (selectedFiles.has(entry.path)) selectedFiles.delete(entry.path);
      else selectedFiles.add(entry.path);
    } else {
      selectedFiles.clear();
      selectedFiles.add(entry.path);
    }
    renderFiles();
    opts.onSelectionChange?.([...selectedFiles].map(p => files.find(f => f.path === p)!).filter(Boolean));
  }

  function updateStatusBar(): void {
    if (!statusBarEl) return;
    const left = document.createElement("span");
    left.textContent = `${files.length} items`;
    if (selectedFiles.size > 0) left.textContent += `, ${selectedFiles.size} selected`;
    statusBarEl.innerHTML = "";
    statusBarEl.appendChild(left);

    const right = document.createElement("span");
    right.textContent = options.currentPath ?? "/";
    statusBarEl.appendChild(right);
  }

  // Initial render
  renderFiles();

  const instance: FileExplorerInstance = {
    element: root,

    setFiles(newFiles: FileEntry[]) {
      files = newFiles;
      selectedFiles.clear();
      renderFiles();
    },

    getSelectedFiles() {
      return [...selectedFiles].map(p => files.find(f => f.path === p)!).filter(Boolean);
    },

    setPath(path: string) {
      options.currentPath = path;
      if (toolbarEl) renderBreadcrumbs(toolbarEl.querySelector(".fe-breadcrumbs")!);
      updateStatusBar();
    },

    setViewMode(mode: ViewMode) {
      opts.viewMode = mode;
      renderFiles();
    },

    refresh() { renderFiles(); },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
