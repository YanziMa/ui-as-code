/**
 * File Manager: Virtual file system browser with tree view, grid/list view,
 * drag-and-drop file operations, breadcrumbs, search, context menu,
 * file type icons, sorting, and keyboard navigation.
 */

// --- Types ---

export interface FileManagerFile {
  /** Unique ID */
  id: string;
  /** File name */
  name: string;
  /** Is directory? */
  isDirectory: boolean;
  /** File size in bytes (0 for directories) */
  size?: number;
  /** MIME type or extension-based type */
  type?: string;
  /** Last modified timestamp */
  modifiedAt?: number;
  /** Created at timestamp */
  createdAt?: number;
  /** Parent directory ID */
  parentId?: string | null;
  /** Custom icon/emoji */
  icon?: string;
  /** Color tag */
  tagColor?: string;
  /** Is hidden? */
  isHidden?: boolean;
  /** Is selected? (internal state) */
  _selected?: boolean;
  /** Custom metadata */
  meta?: Record<string, unknown>;
}

export interface FileManagerOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial files/directories */
  files?: FileManagerFile[];
  /** Root folder name */
  rootName?: string;
  /** View mode */
  viewMode?: "list" | "grid" | "tree";
  /** Show hidden files? */
  showHidden?: boolean;
  /** Enable multi-select with Ctrl/Cmd */
  multiSelect?: boolean;
  /** Enable drag-and-drop reordering */
  draggable?: boolean;
  /** Enable file upload simulation */
  enableUpload?: boolean;
  /** Enable new folder creation */
  enableNewFolder?: boolean;
  /** Enable search/filter */
  enableSearch?: boolean;
  /** Enable sort controls */
  enableSort?: boolean;
  /** Default sort field */
  sortBy?: "name" | "size" | "modified" | "type";
  /** Sort direction */
  sortDirection?: "asc" | "desc";
  /** Show sidebar with quick access? */
  showSidebar?: boolean;
  /** Show status bar? */
  showStatusBar?: boolean;
  /** Show breadcrumbs? */
  showBreadcrumbs?: boolean;
  /** Items per page (0 = no pagination) */
  pageSize?: number;
  /** Click callback */
  onFileClick?: (file: FileManagerFile) => void;
  /** Double-click to open */
  onFileOpen?: (file: FileManagerFile) => void;
  /** Right-click / context menu */
  onContextMenu?: (file: FileManagerFile | null, x: number, y: number) => void;
  /** Navigation callback */
  onNavigate?: (path: FileManagerFile[]) => void;
  /** Selection change callback */
  onSelectionChange?: (files: FileManagerFile[]) => void;
  /** Upload handler (returns mock file data) */
  onUpload?: (files: FileList) => FileManagerFile[];
  /** Custom renderer for each item */
  renderItem?: (file: FileManagerFile, el: HTMLElement) => void;
  /** Custom CSS class */
  className?: string;
}

export interface FileManagerInstance {
  element: HTMLElement;
  /** Get all files */
  getFiles: () => FileManagerFile[];
  /** Get current directory contents */
  getCurrentFiles: () => FileManagerFile[];
  /** Get current path (array of directories from root) */
  getCurrentPath: () => FileManagerFile[];
  /** Get selected files */
  getSelected: () => FileManagerFile[];
  /** Navigate to a directory */
  navigateTo: (dirId: string) => void;
  /** Navigate up one level */
  navigateUp: () => void;
  /** Navigate to root */
  navigateRoot: () => void;
  /** Add a file or directory */
  addFile: (file: FileManagerFile) => void;
  /** Remove a file */
  removeFile: (id: string) => void;
  /** Update a file's properties */
  updateFile: (id: string, updates: Partial<FileManagerFile>) => void;
  /** Move a file to another directory */
  moveFile: (id: string, targetDirId: string) => void;
  /** Search files by name */
  search: (query: string) => FileManagerFile[];
  /** Sort current view */
  sort: (by: "name" | "size" | "modified" | "type", dir?: "asc" | "desc") => void;
  /** Set view mode */
  setViewMode: (mode: "list" | "grid" | "tree") => void;
  /** Select all */
  selectAll: () => void;
  /** Deselect all */
  deselectAll: () => void;
  /** Refresh display */
  refresh: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Constants ---

const FILE_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  image:     { icon: "\u{1F5BC}", color: "#22c55e" },
  video:     { icon: "\u{1F3AC}", color: "#ef4444" },
  audio:     { icon: "\u{1F3B5}", color: "#a855f7" },
  pdf:       { icon: "\u{1F4C4}", color: "#ef4444" },
  document:  { icon: "\u{1F4DD}", color: "#3b82f6" },
  spreadsheet:{ icon: "\u{1F4CA}", color: "#22c55e" },
  code:      { icon: "{ }", color: "#f59e0b" },
  archive:   { icon: "\u{1F4E6}", color: "#f97316" },
  default:   { icon: "\u{1F4C4}", color: "#9ca3af" },
};

function getFileTypeInfo(filename: string): { icon: string; color: string } {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image", jpeg: "image", png: "image", gif: "image", svg: "image", webp: "image",
    mp4: "video", webm: "video", mov: "video", avi: "video",
    mp3: "audio", wav: "audio", ogg: "audio", flac: "audio",
    pdf: "pdf",
    doc: "document", docx: "document", txt: "document", md: "document", rtf: "document",
    xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet",
    js: "code", ts: "code", jsx: "code", tsx: "code", py: "code", java: "code",
    go: "code", rs: "code", c: "code", cpp: "code", html: "code", css: "code",
    json: "code", xml: "code", yaml: "code", yml: "code", sh: "code",
    zip: "archive", rar: "archive", "7z:": "archive", tar: "archive", gz: "archive",
  };
  return FILE_TYPE_ICONS[map[ext] ?? "default"] ?? FILE_TYPE_ICONS.default!;
}

const DIR_ICON = { icon: "\u{1F4C1}", color: "#f59e0b" };

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// --- Main Factory ---

export function createFileManager(options: FileManagerOptions): FileManagerInstance {
  const opts = {
    rootName: options.rootName ?? "Root",
    viewMode: options.viewMode ?? "list",
    showHidden: options.showHidden ?? false,
    multiSelect: options.multiSelect ?? true,
    draggable: options.draggable ?? false,
    enableUpload: options.enableUpload ?? false,
    enableNewFolder: options.enableNewFolder ?? false,
    enableSearch: options.enableSearch ?? true,
    enableSort: options.enableSort ?? true,
    sortBy: options.sortBy ?? "name",
    sortDirection: options.sortDirection ?? "asc",
    showSidebar: options.showSidebar ?? false,
    showStatusBar: options.showStatusBar ?? true,
    showBreadcrumbs: options.showBreadcrumbs ?? true,
    pageSize: options.pageSize ?? 0,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("FileManager: container not found");

  // Internal file store
  let allFiles: FileManagerFile[] = [...(options.files ?? [])];
  let currentDirId: string | null = null; // null = root
  let selectedIds = new Set<string>();
  let destroyed = false;
  let searchQuery = "";

  // Root element
  const root = document.createElement("div");
  root.className = `file-manager ${opts.className ?? ""}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:100%;
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;
  `;
  container.appendChild(root);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "fm-toolbar";
  toolbar.style.cssText = `
    display:flex;align-items:center;gap:8px;padding:8px 12px;
    background:#f9fafb;border-bottom:1px solid #e5e7eb;flex-shrink:0;flex-wrap:wrap;
  `;
  root.appendChild(toolbar);

  // Build toolbar buttons
  function buildToolbar(): void {
    toolbar.innerHTML = "";

    // Nav buttons
    const navGroup = document.createElement("div");
    navGroup.style.display = "flex";
    navGroup.style.gap = "4px";

    const backBtn = makeToolbarBtn("\u2190", "Back");
    backBtn.addEventListener("click", () => instance.navigateUp());
    navGroup.appendChild(backBtn);

    const fwdDisabled = true; // No forward history yet
    const fwdBtn = makeToolbarBtn("\u2192", "Forward");
    fwdBtn.style.opacity = "0.4";
    fwdBtn.style.pointerEvents = "none";
    navGroup.appendChild(fwdBtn);

    const upBtn = makeToolbarBtn("\u2191", "Up");
    upBtn.addEventListener("click", () => instance.navigateUp());
    navGroup.appendChild(upBtn);

    const homeBtn = makeToolbarBtn="\u2302", "Home");
    homeBtn.addEventListener("click", () => instance.navigateRoot());
    navGroup.appendChild(homeBtn);

    toolbar.appendChild(navGroup);

    // Breadcrumbs
    if (opts.showBreadcrumbs) {
      const bc = document.createElement("div");
      bc.className = "fm-breadcrumbs";
      bc.style.cssText = "flex:1;display:flex;align-items:center;gap:4px;overflow-x:auto;";
      renderBreadcrumbs(bc);
      toolbar.appendChild(bc);
    }

    // Search
    if (opts.enableSearch) {
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search files...";
      searchInput.style.cssText = `
        padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;width:160px;background:#fff;
      `;
      searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value.toLowerCase();
        refresh();
      });
      toolbar.appendChild(searchInput);
    }

    // View toggle
    const viewGroup = document.createElement("div");
    viewGroup.style.display = "flex";
    viewGroup.style.gap = "2px";

    for (const mode of ["list", "grid"] as const) {
      const btn = makeToolbarBtn(mode === "list" "\u2630" : "\u25A6", `${mode} view`);
      btn.style.background = opts.viewMode === mode ? "#eef2ff" : "transparent";
      btn.style.color = opts.viewMode === mode ? "#4338ca" : "#6b7280";
      btn.addEventListener("click", () => { opts.viewMode = mode; buildToolbar(); refresh(); });
      viewGroup.appendChild(btn);
    }
    toolbar.appendChild(viewGroup);

    // New folder button
    if (opts.enableNewFolder) {
      const newFolderBtn = makeToolbarBtn("+ New Folder", "Create folder");
      newFolderBtn.addEventListener("click", handleNewFolder);
      toolbar.appendChild(newFolderBtn);
    }

    // Upload button
    if (opts.enableUpload) {
      const uploadLabel = document.createElement("label");
      uploadLabel.style.cssText = `
        padding:4px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;
        cursor:pointer;background:#fff;color:#374151;
      `;
      uploadLabel.textContent = "Upload";
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.multiple = true;
      fileInput.style.display = "none";
      fileInput.addEventListener("change", () => {
        if (fileInput.files && fileInput.files.length > 0 && opts.onUpload) {
          const newFiles = opts.onUpload(fileInput.files);
          for (const f of newFiles) instance.addFile({ ...f, parentId: currentDirId });
          refresh();
        }
      });
      uploadLabel.appendChild(fileInput);
      toolbar.appendChild(uploadLabel);
    }
  }

  function makeToolbarBtn(label: string, title: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = title;
    btn.style.cssText = `
      padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;
      background:#fff;cursor:pointer;color:#374151;
    `;
    btn.addEventListener("mouseenter", () => { btn.style.background = "#f3f4f6"; });
    btn.addEventListener("mouseleave", () => { btn.style.background = ""; });
    return btn;
  }

  // Breadcrumbs
  function renderBreadcrumbs(container: HTMLElement): void {
    container.innerHTML = "";
    const path = instance.getCurrentPath();

    // Root
    const rootCrumb = document.createElement("button");
    rootCrumb.type = "button";
    rootCrumb.textContent = opts.rootName;
    rootCrumb.style.cssText = "background:none;border:none;cursor:pointer;font-size:12px;color:#4f46e5;padding:2px 4px;";
    rootCrumb.addEventListener("click", () => instance.navigateRoot());
    container.appendChild(rootCrumb);

    for (let i = 0; i < path.length; i++) {
      const sep = document.createElement("span");
      sep.textContent = "/";
      sep.style.color = "#9ca3af";
      sep.style.fontSize = "11px";
      container.appendChild(sep);

      const crumb = document.createElement("button");
      crumb.type = "button";
      crumb.textContent = path[i]!.name;
      crumb.style.cssText = "background:none;border:none;cursor:pointer;font-size:12px;color:#4f46e5;padding:2px 4px;";
      crumb.addEventListener("click", () => instance.navigateTo(path[i]!.id));
      container.appendChild(crumb);
    }
  }

  // Content area
  const contentArea = document.createElement("div");
  contentArea.className = "fm-content";
  contentArea.style.cssText = "flex:1;overflow:auto;padding:8px;";
  root.appendChild(contentArea);

  // Status bar
  let statusBar: HTMLElement | null = null;
  if (opts.showStatusBar) {
    statusBar = document.createElement("div");
    statusBar.className = "fm-statusbar";
    statusBar.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:4px 12px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;flex-shrink:0;
    `;
    root.appendChild(statusBar);
  }

  // --- Core Logic ---

  function getChildren(dirId: string | null): FileManagerFile[] {
    return allFiles.filter((f) => f.parentId === dirId && (opts.showHidden || !f.isHidden));
  }

  function sortFiles(files: FileManagerFile[]): FileManagerFile[] {
    const sorted = [...files];
    sorted.sort((a, b) => {
      // Directories first
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;

      let cmp = 0;
      switch (opts.sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name); break;
        case "size":
          cmp = (a.size ?? 0) - (b.size ?? 0); break;
        case "modified":
          cmp = (a.modifiedAt ?? 0) - (b.modifiedAt ?? 0); break;
        case "type":
          cmp = (a.type ?? "").localeCompare(b.type ?? ""); break;
      }
      return opts.sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }

  function getVisibleFiles(): FileManagerFile[] {
    let files = getChildren(currentDirId);
    if (searchQuery) {
      files = files.filter((f) => f.name.toLowerCase().includes(searchQuery));
    }
    return sortFiles(files);
  }

  function buildPathToRoot(targetId: string): FileManagerFile[] {
    const path: FileManagerFile[] = [];
    let current: string | null = targetId;
    while (current !== null) {
      const file = allFiles.find((f) => f.id === current);
      if (!file) break;
      path.unshift(file);
      current = file.parentId ?? null;
    }
    return path;
  }

  // --- Rendering ---

  function render(): void {
    contentArea.innerHTML = "";

    const files = getVisibleFiles();

    if (files.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px;";
      empty.textContent = searchQuery ? "No matching files found" : "This folder is empty";
      contentArea.appendChild(empty);
      updateStatusBar(files);
      return;
    }

    if (opts.viewMode === "grid") {
      renderGrid(files);
    } else if (opts.viewMode === "tree") {
      renderTree(files);
    } else {
      renderList(files);
    }

    updateStatusBar(files);
  }

  function renderList(files: FileManagerFile[]): void {
    // Table header
    const table = document.createElement("div");
    table.style.cssText = "width:100%";

    if (opts.enableSort) {
      const header = document.createElement("div");
      header.className = "fm-list-header";
      header.style.cssText = `
        display:flex;align-items:center;padding:6px 8px;background:#f9fafb;
        border-bottom:1px solid #e5e7eb;font-size:11px;font-weight:600;color:#6b7280;
      `;

      const cols = [
        { key: "name", label: "Name", flex: "3" },
        { key: "modified", label: "Modified", flex: "2" },
        { key: "size", label: "Size", flex: "1" },
        { key: "type", label: "Type", flex: "1" },
      ];

      for (const col of cols) {
        const th = document.createElement("div");
        th.style.cssText = `flex:${col.flex};cursor:pointer;padding:0 4px;`;
        th.textContent = col.label + (opts.sortBy === col.key ? (opts.sortDirection === "asc" ? " \u2191" : " \u2193") : "");
        th.addEventListener("click", () => {
          if (opts.sortBy === col.key) {
            opts.sortDirection = opts.sortDirection === "asc" ? "desc" : "asc";
          } else {
            opts.sortBy = col.key as typeof opts.sortBy;
            opts.sortDirection = "asc";
          }
          refresh();
        });
        header.appendChild(th);
      }
      table.appendChild(header);
    }

    for (const file of files) {
      const row = renderFileRow(file);
      table.appendChild(row);
    }

    contentArea.appendChild(table);
  }

  function renderFileRow(file: FileManagerFile): HTMLElement {
    const row = document.createElement("div");
    row.className = "fm-file-row";
    row.dataset.fileId = file.id;
    row.style.cssText = `
      display:flex;align-items:center;padding:6px 8px;border-bottom:1px solid #f3f4f6;
      cursor:pointer;${selectedIds.has(file.id) ? "background:#eff6ff;" : ""}
      transition:background 0.15s;
    `;

    const isSelected = selectedIds.has(file.id);
    const info = file.isDirectory ? DIR_ICON : getFileTypeInfo(file.name);

    // Checkbox (multi-select)
    if (opts.multiSelect) {
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isSelected;
      cb.style.cssText = "margin-right:8px;cursor:pointer;";
      cb.addEventListener("change", (e) => {
        e.stopPropagation();
        toggleSelect(file.id);
      });
      cb.addEventListener("click", (e) => e.stopPropagation());
      row.appendChild(cb);
    }

    // Icon
    const iconEl = document.createElement("span");
    iconEl.textContent = info.icon;
    iconEl.style.cssText = `font-size:16px;margin-right:8px;${file.tagColor ? `filter:drop-shadow(0 0 2px ${file.tagColor});` : ""}`;
    row.appendChild(iconEl);

    // Name
    const nameEl = document.createElement("div");
    nameEl.style.cssText = "flex:3;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    nameEl.textContent = file.name;
    if (file.tagColor) {
      nameEl.style.borderLeft = `3px solid ${file.tagColor}`;
      nameEl.style.paddingLeft = "6px";
    }
    row.appendChild(nameEl);

    // Modified
    const modEl = document.createElement("div");
    modEl.style.cssText = "flex:2;color:#6b7280;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    modEl.textContent = file.modifiedAt ? formatDate(file.modifiedAt) : "-";
    row.appendChild(modEl);

    // Size
    const sizeEl = document.createElement("div");
    sizeEl.style.cssText = "flex:1;color:#6b7280;font-size:12px;text-align:right;";
    sizeEl.textContent = file.isDirectory ? "-" : formatFileSize(file.size ?? 0);
    row.appendChild(sizeEl);

    // Type
    const typeEl = document.createElement("div");
    typeEl.style.cssText = "flex:1;color:#6b7280;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    typeEl.textContent = file.isDirectory ? "Folder" : (file.type ?? getFileTypeFromName(file.name));
    row.appendChild(typeEl);

    // Events
    row.addEventListener("click", (e) => {
      if (!(e.target as HTMLElement).closest("input[type=checkbox]")) {
        handleClick(file, e);
      }
    });

    row.addEventListener("dblclick", () => {
      if (file.isDirectory) instance.navigateTo(file.id);
      else opts.onFileOpen?.(file);
    });

    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (!selectedIds.has(file.id)) {
        if (!e.ctrlKey && !e.metaKey) deselectAll();
        toggleSelect(file.id);
      }
      opts.onContextMenu?.(file, e.clientX, e.clientY);
    });

    row.addEventListener("mouseenter", () => {
      if (!isSelected) row.style.background = "#f9fafb";
    });
    row.addEventListener("mouseleave", () => {
      if (!isSelected) row.style.background = "";
    });

    // Drag
    if (opts.draggable && !file.isDirectory) {
      row.draggable = true;
      row.addEventListener("dragstart", (e) => {
        e.dataTransfer!.setData("text/plain", file.id);
        row.style.opacity = "0.5";
      });
      row.addEventListener("dragend", () => { row.style.opacity = ""; });
    }

    // Custom renderer
    if (opts.renderItem) opts.renderItem(file, row);

    return row;
  }

  function renderGrid(files: FileManagerFile[]): void {
    const grid = document.createElement("div");
    grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:12px;padding:4px;";

    for (const file of files) {
      const card = document.createElement("div");
      card.className = "fm-grid-item";
      card.dataset.fileId = file.id;
      card.style.cssText = `
        display:flex;flex-direction:column;align-items:center;padding:12px 8px;
        border-radius:8px;cursor:pointer;border:1px solid transparent;
        transition:all 0.15s;${selectedIds.has(file.id) ? "background:#eff6ff;border-color:#93c5fd;" : ""}
      `;

      const info = file.isDirectory ? DIR_ICON : getFileTypeInfo(file.name);

      const iconWrap = document.createElement("div");
      iconWrap.style.cssText = `width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:6px;`;

      const iconEl = document.createElement("span");
      iconEl.textContent = info.icon;
      iconWrap.appendChild(iconEl);
      card.appendChild(iconWrap);

      const nameEl = document.createElement("div");
      nameEl.style.cssText = "font-size:11px;text-align:center;word-break:break-word;line-height:1.3;max-width:100%;";
      nameEl.textContent = file.name;
      card.appendChild(nameEl);

      card.addEventListener("click", (e) => handleClick(file, e));
      card.addEventListener("dblclick", () => {
        if (file.isDirectory) instance.navigateTo(file.id);
        else opts.onFileOpen?.(file);
      });
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        opts.onContextMenu?.(file, e.clientX, e.clientY);
      });
      card.addEventListener("mouseenter", () => {
        if (!selectedIds.has(file.id)) card.style.background = "#f9fafb";
      });
      card.addEventListener("mouseleave", () => {
        if (!selectedIds.has(file.id)) card.style.background = "";
      });

      if (opts.renderItem) opts.renderItem(file, card);

      grid.appendChild(card);
    }

    contentArea.appendChild(grid);
  }

  function renderTree(files: FileManagerFile[]): void {
    const tree = document.createElement("div");
    tree.style.cssText = "width:100%;";

    function renderTreeNode(file: FileManagerFile, depth: number): HTMLElement {
      const node = document.createElement("div");
      node.dataset.fileId = file.id;

      const row = document.createElement("div");
      row.style.cssText = `
        display:flex;align-items:center;padding:4px 8px;cursor:pointer;
        ${selectedIds.has(file.id) ? "background:#eff6ff;" : ""}
      `;

      // Indent
      const indent = document.createElement("span");
      indent.style.cssText = `display:inline-block;width:${depth * 20}px;`;
      row.appendChild(indent);

      // Expand/collapse arrow for directories
      if (file.isDirectory) {
        const children = allFiles.filter((f) => f.parentId === file.id);
        const hasChildren = children.length > 0;
        const arrow = document.createElement("span");
        arrow.textContent = hasChildren ? "\u25B6" : "\u25CB";
        arrow.style.cssText = `font-size:10px;width:16px;display:inline-block;text-align:center;${hasChildren ? "cursor:pointer;" : ""}`;
        if (hasChildren) {
          arrow.addEventListener("click", (e) => {
            e.stopPropagation();
            // Toggle expand/collapse would need expanded state tracking
            // For simplicity, navigate into the directory
            instance.navigateTo(file.id);
          });
        }
        row.appendChild(arrow);
      } else {
        const spacer = document.createElement("span");
        spacer.style.cssText = "width:16px;display:inline-block;";
        row.appendChild(spacer);
      }

      // Icon + name
      const info = file.isDirectory ? DIR_ICON : getFileTypeInfo(file.name);
      const icon = document.createElement("span");
      icon.textContent = info.icon;
      icon.style.cssText = "margin-right:6px;font-size:14px;";
      row.appendChild(icon);

      const name = document.createElement("span");
      name.textContent = file.name;
      name.style.cssText = "font-size:13px;";
      row.appendChild(name);

      node.appendChild(row);

      node.addEventListener("click", (e) => handleClick(file, e));
      node.addEventListener("dblclick", () => {
        if (file.isDirectory) instance.navigateTo(file.id);
        else opts.onFileOpen?.(file);
      });

      return node;
    }

    for (const file of files) {
      tree.appendChild(renderTreeNode(file, 0));
    }

    contentArea.appendChild(tree);
  }

  function updateStatusBar(files: FileManagerFile[]): void {
    if (!statusBar) return;
    const dirs = files.filter((f) => f.isDirectory).length;
    const regFiles = files.length - dirs;
    statusBar.textContent = `${regFiles} item(s), ${dirs} folder(s)${selectedIds.size > 0 ? `  |  ${selectedIds.size} selected` : ""}`;
  }

  // --- Interaction ---

  function handleClick(file: FileManagerFile, e: MouseEvent): void {
    if (e.ctrlKey || e.metaKey) {
      // Multi-select toggle
      toggleSelect(file.id);
    } else if (e.shiftKey && selectedIds.size > 0) {
      // Range select (simplified: just toggle this one)
      toggleSelect(file.id);
    } else {
      // Single select
      deselectAll();
      toggleSelect(file.id);
    }
    opts.onFileClick?.(file);
  }

  function toggleSelect(id: string): void {
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    refresh();
    opts.onSelectionChange?.(instance.getSelected());
  }

  function deselectAll(): void {
    selectedIds.clear();
  }

  function handleNewFolder(): void {
    const name = prompt("Enter folder name:");
    if (!name?.trim()) return;

    const newFolder: FileManagerFile = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      isDirectory: true,
      parentId: currentDirId,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    allFiles.push(newFolder);
    refresh();
  }

  function getFileTypeFromName(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const typeMap: Record<string, string> = {
      jpg: "Image", jpeg: "Image", png: "Image", gif: "Image", svg: "Image", webp: "Image",
      mp4: "Video", webm: "Video", mov: "Video",
      mp3: "Audio", wav: "Audio",
      pdf: "PDF Document",
      doc: "Word Document", docx: "Word Document",
      xls: "Spreadsheet", xlsx: "Spreadsheet", csv: "CSV",
      js: "JavaScript", ts: "TypeScript", py: "Python", json: "JSON",
      zip: "Archive", rar: "Archive", "tar:": "Archive", gz: "Archive",
      txt: "Text File", md: "Markdown",
    };
    return typeMap[ext] ?? "File";
  }

  function refresh(): void {
    render();
    if (opts.showBreadcrumbs) {
      const bc = toolbar.querySelector(".fm-breadcrumbs");
      if (bc) renderBreadcrumbs(bc as HTMLElement);
    }
  }

  // --- Instance API ---

  const instance: FileManagerInstance = {
    element: root,

    getFiles() { return [...allFiles]; },

    getCurrentFiles() { return getVisibleFiles(); },

    getCurrentPath() { return currentDirId ? buildPathToRoot(currentDirId) : []; },

    getSelected() { return allFiles.filter((f) => selectedIds.has(f.id)); },

    navigateTo(dirId: string) {
      const dir = allFiles.find((f) => f.id === dirId && f.isDirectory);
      if (!dir) return;
      currentDirId = dirId;
      selectedIds.clear();
      refresh();
      opts.onNavigate?.(instance.getCurrentPath());
    },

    navigateUp() {
      if (currentDirId === null) return;
      const parent = allFiles.find((f) => f.id === currentDirId)?.parentId ?? null;
      currentDirId = parent;
      selectedIds.clear();
      refresh();
      opts.onNavigate?.(instance.getCurrentPath());
    },

    navigateRoot() {
      currentDirId = null;
      selectedIds.clear();
      refresh();
      opts.onNavigate?.([]);
    },

    addFile(file: FileManagerFile) {
      allFiles.push(file);
      refresh();
    },

    removeFile(id: string) {
      // Also remove children if it's a directory
      const toRemove = [id];
      let i = 0;
      while (i < toRemove.length) {
        const children = allFiles.filter((f) => f.parentId === toRemove[i]).map((f) => f.id);
        toRemove.push(...children);
        i++;
      }
      allFiles = allFiles.filter((f) => !toRemove.includes(f.id));
      selectedIds.delete(id);
      refresh();
    },

    updateFile(id: string, updates: Partial<FileManagerFile>) {
      const idx = allFiles.findIndex((f) => f.id === id);
      if (idx >= 0) {
        allFiles[idx] = { ...allFiles[idx]!, ...updates };
        refresh();
      }
    },

    moveFile(id: string, targetDirId: string) {
      const idx = allFiles.findIndex((f) => f.id === id);
      if (idx >= 0) {
        allFiles[idx]!.parentId = targetDirId;
        allFiles[idx]!.modifiedAt = Date.now();
        refresh();
      }
    },

    search(query: string) {
      searchQuery = query.toLowerCase();
      return allFiles.filter((f) =>
        f.name.toLowerCase().includes(query) &&
        (opts.showHidden || !f.isHidden)
      );
    },

    sort(by, dir) {
      opts.sortBy = by;
      if (dir) opts.sortDirection = dir;
      refresh();
    },

    setViewMode(mode) {
      opts.viewMode = mode;
      buildToolbar();
      refresh();
    },

    selectAll() {
      for (const f of getVisibleFiles()) selectedIds.add(f.id);
      refresh();
      opts.onSelectionChange?.(instance.getSelected());
    },

    deselectAll() {
      selectedIds.clear();
      refresh();
      opts.onSelectionChange?.([]);
    },

    refresh,

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  // Initialize
  buildToolbar();
  refresh();

  // Keyboard shortcuts
  container.addEventListener("keydown", (e) => {
    if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      instance.selectAll();
    }
    if (e.key === "Escape") {
      instance.deselectAll();
    }
    if (e.key === "Backspace" || (e.key === "Delete" && !e.ctrlKey)) {
      e.preventDefault();
      instance.navigateUp();
    }
    if (e.key === "Enter") {
      const sel = instance.getSelected();
      if (sel.length === 1 && sel[0]!.isDirectory) {
        instance.navigateTo(sel[0]!.id);
      } else if (sel.length === 1) {
        opts.onFileOpen?.(sel[0]!);
      }
    }
  });

  return instance;
}
