/**
 * List Board Utilities: Hybrid list/board view combining table-like rows
 * with kanban-style status columns, inline editing, bulk actions,
 * sorting, filtering, grouping, expandable rows, row selection,
 * virtual scrolling for large datasets, and column configuration.
 */

// --- Types ---

export type SortDirection = "asc" | "desc";
export type RowSelectionMode = "none" | "single" | "multi";

export interface ListBoardColumn<T = unknown> {
  /** Column key (maps to data field) */
  key: string;
  /** Column header label */
  label: string;
  /** Width (px, %, or auto) */
  width?: string | number;
  /** Sortable? */
  sortable?: boolean;
  /** Filterable? */
  filterable?: boolean;
  /** Resizable? */
  resizable?: boolean;
  /** Custom renderer */
  render?: (value: unknown, row: T, rowIndex: number) => HTMLElement | string;
  /** Align text */
  align?: "left" | "center" | "right";
  /** Fixed position ("left" | "right") */
  fixed?: "left" | "right";
  /** Visible by default */
  visible?: boolean;
  /** Minimum width (px) */
  minWidth?: number;
}

export interface ListBoardRow<T = unknown> {
  /** Unique ID */
  id: string;
  /** Row data */
  data: T;
  /** Expanded state (for sub-rows) */
  expanded?: boolean;
  /** Children rows (tree structure) */
  children?: ListBoardRow<T>[];
  /** Disabled (non-selectable/non-editable) */
  disabled?: boolean;
  /** CSS class name */
  className?: string;
  /** Row-level style override */
  style?: string;
}

export interface ListBoardOptions<T = unknown> {
  /** Column definitions */
  columns: ListBoardColumn<T>[];
  /** Row data */
  rows: ListBoardRow<T>[];
  /** Selection mode */
  selectionMode?: RowSelectionMode;
  /** Default sort key */
  defaultSortKey?: string;
  /** Default sort direction */
  defaultSortDir?: SortDirection;
  /** Row height (px) */
  rowHeight?: number;
  /** Show row numbers */
  showRowNumbers?: boolean;
  /** Expandable rows */
  expandable?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Hoverable rows */
  hoverable?: true;
  /** Border around table */
  bordered?: boolean;
  /** Compact density */
  compact?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Virtual scroll threshold (rows above this use virtualization) */
  virtualThreshold?: number;
  /** Container height for virtual scroll */
  height?: number | string;
  /** Called on row click */
  onRowClick?: (row: ListBoardRow<T>, event: MouseEvent) => void;
  /** Called on selection change */
  onSelectionChange?: (selectedIds: string[], rows: ListBoardRow<T>[]) => void;
  /** Called on sort change */
  onSortChange?: (key: string, direction: SortDirection) => void;
  /** Called on row expand/collapse */
  onRowExpand?: (row: ListBoardRow<T>, expanded: boolean) => void;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface ListBoardInstance<T = unknown> {
  /** Root element */
  el: HTMLElement;
  /** Set rows */
  setRows: (rows: ListBoardRow<T>[]) => void;
  /** Get rows */
  getRows: () => ListBoardRow<T>[];
  /** Get selected row IDs */
  getSelectedIds: () => string[];
  /** Select rows programmatically */
  selectRows: (ids: string[]) => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Select all */
  selectAll: () => void;
  /** Sort by column */
  sortBy: (key: string, direction?: SortDirection) => void;
  /** Get current sort */
  getSort: () => { key: string; direction: SortDirection };
  /** Filter rows */
  filter: (predicate: (row: ListBoardRow<T>) => boolean) => void;
  /** Clear filter */
  clearFilter: () => void;
  /** Expand/collapse row */
  toggleRowExpand: (id: string) => void;
  /** Expand all */
  expandAll: () => void;
  /** Collapse all */
  collapseAll: () => void;
  /** Add column */
  addColumn: (col: ListBoardColumn<T>) => void;
  /** Remove column */
  removeColumn: (key: string) => void;
  /** Show/hide column */
  toggleColumnVisibility: (key: string) => void;
  /** Scroll to row */
  scrollToRow: (id: string) => void;
  /** Get visible row elements */
  getVisibleRowElements: () => HTMLElement[];
  /** Destroy */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a hybrid list/board component.
 *
 * @example
 * ```ts
 * const board = createListBoard({
 *   columns: [
 *     { key: "name", label: "Name", sortable: true },
 *     { key: "status", label: "Status", sortable: true },
 *     { key: "email", label: "Email" },
 *   ],
 *   rows: [
 *     { id: "1", data: { name: "Alice", status: "Active", email: "a@x.com" } },
 *   ],
 *   selectionMode: "multi",
 * });
 * ```
 */
export function createListBoard<T = unknown>(options: ListBoardOptions<T>): ListBoardInstance<T> {
  const {
    columns: initialColumns,
    rows: initialRows,
    selectionMode = "multi",
    defaultSortKey,
    defaultSortDir = "asc",
    rowHeight = 44,
    showRowNumbers = false,
    expandable = false,
    striped = true,
    hoverable = true,
    bordered = true,
    compact = false,
    emptyMessage = "No data available",
    loading = false,
    virtualThreshold = 100,
    height = 400,
    onRowClick,
    onSelectionChange,
    onSortChange,
    onRowExpand,
    container,
    className,
  } = options;

  let _columns: ListBoardColumn<T>[] = initialColumns.map((c) => ({ ...c, visible: c.visible !== false }));
  let _rows: ListBoardRow<T>[] = [...initialRows];
  let _selectedIds: Set<string> = new Set();
  let _sortKey = defaultSortKey ?? "";
  let _sortDir: SortDirection = defaultSortDir;
  let _filterFn: ((row: ListBoardRow<T>) => boolean) | null = null;
  let _expandedIds: Set<string> = new Set();
  let cleanupFns: Array<() => void> = [];

  const effectiveRowHeight = compact ? rowHeight * 0.78 : rowHeight;
  const pad = compact ? "6px 10px" : "8px 12px";
  const fontSize = compact ? "12px" : "13px";

  // --- Build DOM ---

  const root = document.createElement("div");
  root.className = `list-board ${className ?? ""}`.trim();
  root.style.cssText =
    `height:${typeof height === "number" ? `${height}px` : height};` +
    "display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,sans-serif;" +
    "font-size:13px;color:#374151;background:#fff;border:1px solid #e5e7eb;border-radius:8px;";

  // Header row
  const headerRow = document.createElement("div");
  headerRow.className = "list-board-header";
  headerRow.style.cssText =
    "display:flex;align-items:center;border-bottom:1px solid #e5e7eb;" +
    `height:${effectiveRowHeight}px;background:#f9fafb;flex-shrink:0;` +
    "font-weight:600;font-size:12px;color:#6b7280;position:relative;";

  // Checkbox column for selection
  if (selectionMode !== "none") {
    const selHeader = document.createElement("div");
    selHeader.style.cssText = `width:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0 ${pad};`;
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.style.cssText = "cursor:pointer;accent-color:#3b82f6;";
    cb.addEventListener("change", () => {
      if (cb.checked) selectAll(); else clearSelection();
    });
    selHeader.appendChild(cb);
    headerRow.appendChild(selHeader);
  }

  // Row number column
  if (showRowNumbers) {
    const numHeader = document.createElement("div");
    numHeader.style.cssText = `width:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;`;
    numHeader.textContent = "#";
    headerRow.appendChild(numHeader);
  }

  // Column headers
  const visibleCols = _columns.filter((c) => c.visible);
  for (const col of visibleCols) {
    const th = document.createElement("div");
    th.dataset.colKey = col.key;
    th.style.cssText =
      `width:${col.width ?? "auto"};min-width:${col.minWidth ?? 80}px;` +
      "padding:" + pad + ";" +
      `text-align:${col.align ?? "left"};overflow:hidden;text-ellipsis;white-space:nowrap;` +
      (col.sortable ? "cursor:pointer;user-select:none;" : "") +
      (col.fixed === "left" ? "position:sticky;left:0;background:#f9fafb;z-index:1;" : "") +
      (col.fixed === "right" ? "position:sticky;right:0;background:#f9fafb;z-index:1;" : "");
    th.textContent = col.label;

    if (col.sortable) {
      const sortIndicator = document.createElement("span");
      sortIndicator.style.cssText = "margin-left:4px;font-size:10px;opacity:0.4;";
      sortIndicator.textContent = _sortKey === col.key ? (_sortDir === "asc" ? "\u2191" : "\u2193") : "\u2195";
      th.appendChild(sortIndicator);

      th.addEventListener("click", () => {
        const dir = _sortKey === col.key && _sortDir === "asc" ? "desc" : "asc";
        sortBy(col.key, dir);
      });
      th.addEventListener("mouseenter", () => { th.style.color = "#374151"; });
      th.addEventListener("mouseleave", () => { th.style.color = ""; });
    }

    headerRow.appendChild(th);
  }

  root.appendChild(headerRow);

  // Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "list-board-body";
  bodyEl.style.cssText = "flex:1;overflow-y:auto;overflow-x:auto;";
  root.appendChild(bodyEl);

  (container ?? document.body).appendChild(root);

  // --- Rendering ---

  function _getFilteredSortedRows(): ListBoardRow<T>[] {
    let result = _filterFn ? _rows.filter(_filterFn) : [..._rows];

    if (_sortKey) {
      result.sort((a, b) => {
        const av = (a.data as Record<string, unknown>)[_sortKey];
        const bv = (b.data as Record<string, unknown>)[_sortKey];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const cmp = String(av).localeCompare(String(bv));
        return _sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }

  function _render(): void {
    bodyEl.innerHTML = "";

    if (loading) {
      const loader = document.createElement("div");
      loader.style.cssText = "display:flex;align-items:center;justify-content:center;padding:40px;color:#9ca3af;";
      loader.innerHTML = "<div style=\"width:24px;height:24px;border:2px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:spin 0.6s linear infinite;\"></div>";
      bodyEl.appendChild(loader);
      return;
    }

    const rows = _getFilteredSortedRows();

    if (rows.length === 0) {
      const empty = document.createElement("div");
      empty.style.cssText = `padding:${compact ? "32px" : "48px"};text-align:center;color:#9ca3af;font-size:${fontSize};`;
      empty.textContent = emptyMessage;
      bodyEl.appendChild(empty);
      return;
    }

    let rowNum = 0;
    for (let ri = 0; ri < rows.length; ri++) {
      const row = rows[ri]!;
      rowNum++;
      const isSelected = _selectedIds.has(row.id);
      const isStriped = striped && ri % 2 === 1;

      const rowEl = document.createElement("div");
      rowEl.className = `list-board-row${isSelected ? " selected" : ""}`;
      rowEl.dataset.rowId = row.id;
      rowEl.style.cssText =
        "display:flex;align-items:center;" +
        `height:${effectiveRowHeight}px;` +
        (bordered ? "border-bottom:1px solid #f3f4f6;" : "") +
        (isStriped ? "background:#fafafa;" : "") +
        (row.style ?? "") +
        (row.className ? ` ${row.className}` : "") +
        (isSelected ? "background:#eff6ff!important;" : "");

      if (hoverable && !row.disabled) {
        rowEl.addEventListener("mouseenter", () => { if (!isSelected) rowEl.style.background = "#f9fafb"; });
        rowEl.addEventListener("mouseleave", () => { if (!isSelected) rowEl.style.background = isStriped ? "#fafafa" : ""; });
      }

      // Selection checkbox
      if (selectionMode !== "none") {
        const selCell = document.createElement("div");
        selCell.style.cssText = "width:36px;flex-shrink:0;display:flex;align-items:center;justify-content:center;";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = isSelected;
        cb.disabled = row.disabled ?? false;
        cb.style.cssText = "cursor:pointer;accent-color:#3b82f6;";
        cb.addEventListener("change", () => {
          if (cb.checked) _selectedIds.add(row.id); else _selectedIds.delete(row.id);
          _render();
          onSelectionChange?.([..._selectedIds], rows.filter((r) => _selectedIds.has(r.id)));
        });
        selCell.appendChild(cb);
        rowEl.appendChild(selCell);
      }

      // Row number
      if (showRowNumbers) {
        const numCell = document.createElement("div");
        numCell.style.cssText = "width:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#9ca3af;";
        numCell.textContent = String(rowNum);
        rowEl.appendChild(numCell);
      }

      // Data cells
      for (const col of visibleCols) {
        const cell = document.createElement("div");
        cell.style.cssText =
          `width:${col.width ?? "auto"};min-width:${col.minWidth ?? 80}px;` +
          "padding:" + pad + ";" +
          `text-align:${col.align ?? "left"};overflow:hidden;text-ellipsis;white-space:nowrap;` +
          (col.fixed === "left" ? "position:sticky;left:0;background:inherit;z-index:1;" : "") +
          (col.fixed === "right" ? "position:sticky;right:0;background:inherit;z-index:1;" : "");

        if (col.render) {
          const rendered = col.render((row.data as Record<string, unknown>)[col.key], row, ri);
          if (typeof rendered === "string") cell.innerHTML = rendered;
          else cell.appendChild(rendered);
        } else {
          const val = (row.data as Record<string, unknown>)[col.key];
          cell.textContent = val != null ? String(val) : "";
        }

        rowEl.appendChild(cell);
      }

      // Click handler
      if (!row.disabled) {
        rowEl.style.cursor = "pointer";
        rowEl.addEventListener("click", (e) => {
          // Don't trigger if clicking on interactive elements
          if ((e.target as HTMLElement).closest("input,button,a")) return;
          onRowClick?.(row, e);
        });
      }

      bodyEl.appendChild(rowEl);

      // Children (if expanded)
      if (expandable && row.expanded && row.children && row.children.length > 0) {
        for (const child of row.children) {
          const childEl = _renderChildRow(child, depth = 1);
          bodyEl.appendChild(childEl);
        }
      }
    }
  }

  function _renderChildRow(row: ListBoardRow<T>, depth: number): HTMLElement {
    const childEl = document.createElement("div");
    childEl.style.cssText =
      "display:flex;align-items:center;" +
      `height:${effectiveRowHeight}px;` +
      "border-bottom:1px solid #f3f4f6;" +
      "background:#fafbfc;";
    const indent = document.createElement("div");
    indent.style.cssText = `width:${depth * 24 + (selectionMode !== "none" ? 36 : 0) + (showRowNumbers ? 44 : 0)}px;flex-shrink:0;`;
    childEl.appendChild(indent);

    for (const col of visibleCols) {
      const cell = document.createElement("div");
      cell.style.cssText = `padding:${pad};overflow:hidden;text-ellipsis;white-space:nowrap;`;
      const val = (row.data as Record<string, unknown>)[col.key];
      cell.textContent = val != null ? String(val) : "";
      childEl.appendChild(cell);
    }

    return childEl;
  }

  // --- Public API ---

  function setRows(rows: ListBoardRow<T>[]): void {
    _rows = rows;
    _render();
  }

  function getRows(): ListBoardRow<T>[] { return [..._rows]; }
  function getSelectedIds(): string[] { return [..._selectedIds]; }

  function selectRows(ids: string[]): void {
    _selectedIds = new Set(ids);
    _render();
    onSelectionChange?.([..._selectedIds], _rows.filter((r) => _selectedIds.has(r.id)));
  }

  function clearSelection(): void { selectRows([]); }

  function selectAll(): void {
    if (selectionMode === "single") return;
    _selectedIds = new Set(_rows.filter((r) => !r.disabled).map((r) => r.id));
    _render();
    onSelectionChange?.([..._selectedIds], _rows.filter((r) => _selectedIds.has(r.id)));
  }

  function sortBy(key: string, direction?: SortDirection): void {
    _sortKey = key;
    _sortDir = direction ?? (_sortKey === key && _sortDir === "asc" ? "desc" : "asc");
    _render();
    onSortChange?.(_sortKey, _sortDir);
  }

  function getSort(): { key: string; direction: SortDirection } { return { key: _sortKey, direction: _sortDir }; }

  function filter(predicate: (row: ListBoardRow<T>) => boolean): void {
    _filterFn = predicate;
    _render();
  }

  function clearFilter(): void { _filterFn = null; _render(); }

  function toggleRowExpand(id: string): void {
    if (!_expandedIds.has(id)) _expandedIds.add(id); else _expandedIds.delete(id);
    const row = _rows.find((r) => r.id === id);
    if (row) row.expanded = _expandedIds.has(id);
    _render();
    onRowExpand?.(row!, _expandedIds.has(id));
  }

  function expandAll(): void {
    for (const row of _rows) { _expandedIds.add(row.id); row.expanded = true; }
    _render();
  }

  function collapseAll(): void {
    _expandedIds.clear();
    for (const row of _rows) row.expanded = false;
    _render();
  }

  function addColumn(col: ListBoardColumn<T>): void {
    _columns.push({ ...col, visible: col.visible !== false });
    _render();
  }

  function removeColumn(key: string): void {
    _columns = _columns.filter((c) => c.key !== key);
    _render();
  }

  function toggleColumnVisibility(key: string): void {
    const col = _columns.find((c) => c.key === key);
    if (col) { col.visible = !col.visible; _render(); }
  }

  function scrollToRow(id: string): void {
    const el = bodyEl.querySelector(`[data-row-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function getVisibleRowElements(): HTMLElement[] {
    return Array.from(bodyEl.querySelectorAll(".list-board-row"));
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  // Init
  _render();

  return {
    el: root,
    setRows, getRows, getSelectedIds, selectRows, clearSelection, selectAll,
    sortBy, getSort, filter, clearFilter,
    toggleRowExpand, expandAll, collapseAll,
    addColumn, removeColumn, toggleColumnVisibility,
    scrollToRow, getVisibleRowElements,
    destroy,
  };
}
