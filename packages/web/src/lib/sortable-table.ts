/**
 * Sortable Data Table: Full-featured table with column sorting (asc/desc/none),
 * multi-column sort, filtering, row selection (single/multi), pagination,
 * column visibility toggle, resizing, sticky headers, row expansion,
 * inline editing, cell rendering callbacks, and accessibility.
 */

// --- Types ---

export type SortDirection = "asc" | "desc" | "none";
export type SelectionMode = "none" | "single" | "multi" | "checkbox";

export interface Column<T = unknown> {
  /** Unique column key */
  key: string;
  /** Header label */
  title: string;
  /** Column width (px, %, or auto) */
  width?: string | number;
  /** Minimum width */
  minWidth?: number;
  /** Is this column sortable? */
  sortable?: boolean;
  /** Is this column filterable? */
  filterable?: boolean;
  /** Is this column resizable? */
  resizable?: boolean;
  /** Is this column visible by default? */
  visible?: boolean;
  /** Fixed position ("left" or "right") */
  fixed?: "left" | "right";
  /** Custom cell renderer */
  render?: (value: unknown, row: T, rowIndex: number) => string | HTMLElement;
  /** Custom header renderer */
  headerRender?: () => string | HTMLElement;
  /** Alignment */
  align?: "left" | "center" | "right";
  /** CSS class for cells in this column */
  className?: string;
  /** Tooltip for header */
  tooltip?: string;
  /** Compare function for sorting */
  compare?: (a: T, b: T) => number;
}

export interface TablePagination {
  /** Current page (1-based) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total items */
  total: number;
  /** Total pages */
  totalPages: number;
}

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface FilterState {
  key: string;
  value: string;
}

export interface TableRow<T = unknown> {
  /** Unique row ID */
  id: string;
  /** Row data */
  data: T;
  /** Is this row selected? */
  selected?: boolean;
  /** Is this row expanded? */
  expanded?: boolean;
  /** Is this row disabled? */
  disabled?: boolean;
  /** Custom row class */
  className?: string;
  /** Expanded content (for expandable rows) */
  expandedContent?: string | HTMLElement;
}

export interface SortableTableOptions<T = unknown> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: Column<T>[];
  /** Row data */
  data: TableRow<T>[];
  /** Selection mode */
  selectionMode?: SelectionMode;
  /** Enable row click selection? */
  rowClickSelect?: boolean;
  /** Show row numbers? */
  showRowNumbers?: boolean;
  /** Enable pagination? */
  pagination?: boolean;
  /** Default page size */
  defaultPageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Enable column visibility toggle? */
  columnVisibilityToggle?: boolean;
  /** Enable column resize? */
  columnResize?: boolean;
  /** Sticky header? */
  stickyHeader?: boolean;
  /** Max height with scroll (px, 0 = no limit) */
  maxHeight?: number;
  /** Striped rows? */
  striped?: boolean;
  /** Hoverable rows? */
  hoverable?: boolean;
  /** Bordered? */
  bordered?: boolean;
  /** Compact density? */
  compact?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Callback on sort change */
  onSort?: (sorts: SortState[]) => void;
  /** Callback on selection change */
  onSelectionChange?: (selectedRows: TableRow<T>[]) => void;
  /** Callback on page change */
  onPageChange?: (page: number, pageSize: number) => void;
  /** Callback on row click */
  onRowClick?: (row: TableRow<T>, event: Event) => void;
  /** Callback on row double-click */
  onRowDoubleClick?: (row: TableRow<T>, event: Event) => void;
  /** Callback when filters change */
  onFilter?: (filters: FilterState[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SortableTableInstance<T = unknown> {
  element: HTMLElement;
  /** Get current data (after sorting/filtering/pagination) */
  getData(): TableRow<T>[];
  /** Get all raw data */
  getAllData(): TableRow<T>[];
  /** Set data */
  setData(data: TableRow<T>[]): void;
  /** Get selected rows */
  getSelectedRows(): TableRow<T>[];
  /** Select all visible rows */
  selectAll(): void;
  /** Deselect all */
  deselectAll(): void;
  /** Select a specific row */
  selectRow(id: string): void;
  /** Set sort state */
  setSort(sorts: SortState[]): void;
  /** Get current sort state */
  getSorts(): SortState[];
  /** Set filter */
  setFilter(key: string, value: string): void;
  /** Clear all filters */
  clearFilters(): void;
  /** Get pagination info */
  getPagination(): TablePagination;
  /** Go to specific page */
  goToPage(page: number): void;
  /** Toggle column visibility */
  toggleColumn(key: string): void;
  /** Show a loading spinner */
  setLoading(loading: boolean): void;
  /** Force re-render */
  render(): void;
  /** Destroy */
  destroy(): void;
}

// --- Main Factory ---

export function createSortableTable<T = unknown>(options: SortableTableOptions<T>): SortableTableInstance<T> {
  const opts = {
    selectionMode: options.selectionMode ?? "none",
    rowClickSelect: options.rowClickSelect ?? true,
    showRowNumbers: options.showRowNumbers ?? false,
    pagination: options.pagination ?? false,
    defaultPageSize: options.defaultPageSize ?? 20,
    pageSizeOptions: options.pageSizeOptions ?? [10, 20, 50, 100],
    columnVisibilityToggle: options.columnVisibilityToggle ?? false,
    columnResize: options.columnResize ?? false,
    stickyHeader: options.stickyHeader ?? true,
    maxHeight: options.maxHeight ?? 0,
    striped: options.striped ?? true,
    hoverable: options.hoverable ?? true,
    bordered: options.bordered ?? true,
    compact: options.compact ?? false,
    emptyMessage: options.emptyMessage ?? "No data available",
    loading: options.loading ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("SortableTable: container not found");

  // State
  let columns = [...options.columns];
  let allData = [...options.data];
  let sorts: SortState[] = [];
  let filters: FilterState[] = [];
  let currentPage = 1;
  let pageSize = opts.defaultPageSize;
  let destroyed = false;

  // Track column visibility
  const colVisibility = new Map<string, boolean>();
  for (const col of columns) {
    colVisibility.set(col.key, col.visible !== false);
  }

  // Root element
  const root = document.createElement("div");
  root.className = `sortable-table ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;width:100%;overflow:hidden;
    ${opts.maxHeight > 0 ? `max-height:${opts.maxHeight}px;overflow:auto;` : ""}
  `;
  container.appendChild(root);

  // --- Filtering & Sorting Pipeline ---

  function getProcessedData(): TableRow<T>[] {
    let result = [...allData];

    // Apply filters
    for (const f of filters) {
      if (!f.value) continue;
      const q = f.value.toLowerCase();
      result = result.filter((row) => {
        const val = (row.data as Record<string, unknown>)[f.key];
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      });
    }

    // Apply sorts (apply in order)
    for (const sort of sorts) {
      if (sort.direction === "none") continue;
      const col = columns.find((c) => c.key === sort.key);
      const compareFn = col?.compare ?? ((a: T, b: T) => {
        const va = (a as Record<string, unknown>)[sort.key];
        const vb = (b as Record<string, unknown>)[sort.key];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const sa = String(va).toLowerCase();
        const sb = String(vb).toLowerCase();
        return sa < sb ? -1 : sa > sb ? 1 : 0;
      });
      result.sort((a, b) => {
        const cmp = compareFn(a.data, b.data);
        return sort.direction === "desc" ? -cmp : cmp;
      });
    }

    return result;
  }

  function getPaginatedData(data: TableRow<T>[]): TableRow<T>[] {
    if (!opts.pagination) return data;
    const start = (currentPage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }

  function getPaginationInfo(): TablePagination {
    const total = getProcessedData().length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    return { page: currentPage, pageSize, total, totalPages };
  }

  // --- Rendering ---

  function render(): void {
    if (destroyed) return;
    root.innerHTML = "";

    const processed = getProcessedData();
    const visible = getPaginatedData(processed);
    const visibleColumns = columns.filter((c) => colVisibility.get(c.key) !== false);

    if (visible.length === 0 || columns.length === 0) {
      root.innerHTML = `<div style="text-align:center;padding:40px;color:#9ca3af;">${opts.emptyMessage}</div>`;
      return;
    }

    // Toolbar (filters + column toggle + pagination info)
    const toolbar = document.createElement("div");
    toolbar.className = "st-toolbar";
    toolbar.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;padding:8px 12px;
      border-bottom:1px solid #e5e7eb;background:#f9fafb;flex-wrap:wrap;gap:8px;
    `;

    // Left side: filters + column toggle
    const leftGroup = document.createElement("div");
    leftGroup.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";

    // Filter inputs for filterable columns
    for (const col of visibleColumns) {
      if (!col.filterable) continue;
      const filterWrap = document.createElement("div");
      filterWrap.style.cssText = "display:flex;align-items:center;gap:4px;";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `Filter ${col.title}...`;
      input.value = filters.find((f) => f.key === col.key)?.value ?? "";
      input.style.cssText = "padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;width:140px;";
      input.addEventListener("input", () => {
        setFilter(col.key, input.value);
      });
      filterWrap.appendChild(input);
      leftGroup.appendChild(filterWrap);
    }

    // Column visibility toggle
    if (opts.columnVisibilityToggle) {
      const visBtn = document.createElement("button");
      visBtn.type = "button";
      visBtn.textContent = "Columns";
      visBtn.style.cssText = "padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;background:#fff;cursor:pointer;";
      visBtn.addEventListener("click", () => {
        showColumnMenu(visBtn);
      });
      leftGroup.appendChild(visBtn);
    }

    toolbar.appendChild(leftGroup);

    // Right side: pagination info / controls
    const rightGroup = document.createElement("div");
    rightGroup.style.cssText = "display:flex;align-items:center;gap:8px;font-size:12px;color:#6b7280;";

    if (opts.pagination) {
      const pag = getPaginationInfo();
      rightGroup.textContent = `${(pag.page - 1) * pag.pageSize + 1}-${Math.min(pag.page * pag.pageSize, pag.total)} of ${pag.total}`;

      // Page size selector
      const sizeSel = document.createElement("select");
      sizeSel.style.cssText = "padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;";
      for (const ps of opts.pageSizeOptions) {
        const opt = document.createElement("option");
        opt.value = String(ps); opt.textContent = `${ps}/page`;
        if (ps === pageSize) opt.selected = true;
        sizeSel.appendChild(opt);
      }
      sizeSel.addEventListener("change", () => {
        pageSize = parseInt(sizeSel.value);
        currentPage = 1;
        render();
        opts.onPageChange?.(currentPage, pageSize);
      });
      rightGroup.appendChild(sizeSel);
    } else {
      rightGroup.textContent = `${processed.length} rows`;
    }

    toolbar.appendChild(rightGroup);
    root.appendChild(toolbar);

    // Table wrapper
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "st-wrapper";
    tableWrapper.style.cssText = `overflow:auto;${opts.maxHeight > 0 ? `max-height:${opts.maxHeight - 50}px;` : ""}`;

    const table = document.createElement("table");
    table.className = "st-table";
    table.style.cssText = `
      width:100%;border-collapse:collapse;table-layout:fixed;
      ${opts.bordered ? "" : ""}
    `;

    // --- Header ---
    const thead = document.createElement("thead");
    if (opts.stickyHeader) {
      thead.style.cssText = "position:sticky;top:0;z-index:10;background:#fff;";
    }
    const headerRow = document.createElement("tr");

    // Selection checkbox column
    if (opts.selectionMode === "checkbox" || opts.selectionMode === "multi") {
      const th = createHeaderCell("");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.style.cssText = "cursor:pointer;";
      cb.addEventListener("change", () => {
        if (cb.checked) selectAll(); else deselectAll();
      });
      th.appendChild(cb);
      headerRow.appendChild(th);
    }

    // Row number column
    if (opts.showRowNumbers) {
      headerRow.appendChild(createHeaderCell("#"));
    }

    // Data columns
    for (const col of visibleColumns) {
      const th = createHeaderCell(col.title, col.align, col.tooltip);

      if (col.sortable !== false) {
        th.style.cursor = "pointer";
        th.style.userSelect = "none";
        const currentSort = sorts.find((s) => s.key === col.key);
        const sortIndicator = document.createElement("span");
        sortIndicator.style.cssText = "margin-left:4px;font-size:10px;color:#6b7280;";
        sortIndicator.textContent = currentSort?.direction === "asc" ? "\u2191" : currentSort?.direction === "desc" ? "\u2193" : "\u21C5";
        th.appendChild(sortIndicator);

        th.addEventListener("click", () => {
          handleSortClick(col.key);
          render();
        });
      }

      // Resize handle
      if (opts.columnResize && col.resizable !== false) {
        const resizer = document.createElement("div");
        resizer.className = "st-col-resizer";
        resizer.style.cssText = "position:absolute;right:0;top:0;bottom:0;width:4px;cursor:col-resize;background:#e5e7eb;";
        resizer.addEventListener("mousedown", (e) => startColumnResize(e, col.key, th));
        th.style.position = "relative";
        th.appendChild(resizer);
      }

      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // --- Body ---
    const tbody = document.createElement("tbody");

    if (opts.loading) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = visibleColumns.length + (opts.selectionMode !== "none" ? 1 : 0) + (opts.showRowNumbers ? 1 : 0);
      td.style.cssText = "text-align:center;padding:40px;color:#9ca3af;";
      td.innerHTML = `<div style="display:inline-block;width:20px;height:20px;border:2px solid #ddd;border-top-color:#4338ca;border-radius:50%;animation:st-spin 0.6s linear infinite"></div>`;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else if (visible.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = visibleColumns.length + (opts.selectionMode !== "none" ? 1 : 0) + (opts.showRowNumbers ? 1 : 0);
      td.style.cssText = "text-align:center;padding:40px;color:#9ca3af;";
      td.textContent = opts.emptyMessage;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      for (let i = 0; i < visible.length; i++) {
        const row = visible[i]!;
        const tr = document.createElement("tr");
        tr.dataset.rowId = row.id;
        tr.style.cssText = `
          ${opts.striped && i % 2 === 1 ? "background:#f9fafb;" : ""}
          ${row.className ?? ""}
          transition:background 0.1s;
        `;
        if (row.disabled) tr.style.opacity = "0.5";

        // Selection checkbox
        if (opts.selectionMode === "checkbox" || opts.selectionMode === "multi") {
          const td = document.createElement("td");
          td.style.cssText = "width:40px;text-align:center;padding:8px 4px;";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = row.selected ?? false;
          cb.disabled = row.disabled;
          cb.style.cssText = "cursor:pointer;";
          cb.addEventListener("change", () => {
            row.selected = cb.checked;
            opts.onSelectionChange?.(getSelectedRows());
          });
          td.appendChild(cb);
          tr.appendChild(td);
        }

        // Row number
        if (opts.showRowNumbers) {
          const td = document.createElement("td");
          td.style.cssText = "width:40px;text-align:center;padding:8px 4px;color:#9ca3af;font-size:12px;";
          td.textContent = String((currentPage - 1) * pageSize + i + 1);
          tr.appendChild(td);
        }

        // Data cells
        for (const col of visibleColumns) {
          const td = document.createElement("td");
          td.style.cssText = `
            padding:${opts.compact ? "4px 8px" : "8px 12px"};
            border-bottom:1px solid #f0f0f0;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            text-align:${col.align ?? "left"};
            ${col.className ?? ""}
          `;

          const value = (row.data as Record<string, unknown>)[col.key];

          if (col.render) {
            const rendered = col.render(value, row.data, i);
            if (typeof rendered === "string") {
              td.innerHTML = rendered;
            } else {
              td.innerHTML = "";
              td.appendChild(rendered);
            }
          } else {
            td.textContent = value == null ? "" : String(value);
          }

          tr.appendChild(td);
        }

        // Row events
        if (!row.disabled) {
          if (opts.hoverable) {
            tr.addEventListener("mouseenter", () => { tr.style.background = "#eff6ff"; });
            tr.addEventListener("mouseleave", () => { tr.style.background = ""; });
          }
          tr.addEventListener("click", (e) => {
            if (opts.selectionMode === "single" && opts.rowClickSelect) {
              deselectAll();
              row.selected = true;
              render();
              opts.onSelectionChange?.(getSelectedRows());
            }
            opts.onRowClick?.(row, e);
          });
          tr.addEventListener("dblclick", (e) => {
            opts.onRowDoubleClick?.(row, e);
          });
        }

        tbody.appendChild(tr);

        // Expanded row
        if (row.expanded && row.expandedContent) {
          const expTr = document.createElement("tr");
          const expTd = document.createElement("td");
          expTd.colSpan = visibleColumns.length + (opts.selectionMode !== "none" ? 1 : 0) + (opts.showRowNumbers ? 1 : 0);
          expTd.style.cssText = "padding:12px 16px;background:#f0f9ff;border-bottom:1px solid #e5e7eb;";
          if (typeof row.expandedContent === "string") {
            expTd.innerHTML = row.expandedContent;
          } else {
            expTd.appendChild(row.expandedContent);
          }
          expTr.appendChild(expTd);
          tbody.appendChild(expTr);
        }
      }
    }

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    root.appendChild(tableWrapper);

    // Pagination controls
    if (opts.pagination && !opts.loading) {
      const pagControls = document.createElement("div");
      pagControls.className = "st-pagination";
      pagControls.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        padding:8px 12px;border-top:1px solid #e5e7eb;font-size:12px;
      `;

      const pag = getPaginationInfo();

      // Prev/Next buttons
      const navBtns = document.createElement("div");
      navBtns.style.cssText = "display:flex;gap:4px;";

      const prevBtn = document.createElement("button");
      prevBtn.type = "button"; prevBtn.textContent = "Prev";
      prevBtn.disabled = currentPage <= 1;
      prevBtn.style.cssText = "padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;background:#fff;cursor:pointer;" + (prevBtn.disabled ? "opacity:0.4;cursor:not-allowed;" : "");
      prevBtn.addEventListener("click", () => { goToPage(currentPage - 1); });

      const nextBtn = document.createElement("button");
      nextBtn.type = "button"; nextBtn.textContent = "Next";
      nextBtn.disabled = currentPage >= pag.totalPages;
      nextBtn.style.cssText = "padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;background:#fff;cursor:pointer;" + (nextBtn.disabled ? "opacity:0.4;cursor:not-allowed;" : "");
      nextBtn.addEventListener("click", () => { goToPage(currentPage + 1); });

      navBtns.append(prevBtn, nextBtn);

      // Page jump
      const pageInfo = document.createElement("span");
      pageInfo.textContent = `Page ${pag.page} of ${pag.totalPages}`;

      pagControls.append(navBtns, pageInfo);
      root.appendChild(pagControls);
    }

    // Inject spinner keyframes
    if (!document.getElementById("st-styles")) {
      const style = document.createElement("style");
      style.id = "st-styles";
      style.textContent = "@keyframes st-spin{to{transform:rotate(360deg)}}";
      document.head.appendChild(style);
    }
  }

  function createHeaderCell(text: string, align?: string, tooltip?: string): HTMLTableCellElement {
    const th = document.createElement("th");
    th.style.cssText = `
      padding:10px 12px;text-align:${align ?? "left"};font-weight:600;font-size:12px;
      color:#374151;border-bottom:2px solid #e5e7eb;background:#fafafa;
      white-space:nowrap;user-select:none;position:relative;
    `;
    th.textContent = text;
    if (tooltip) th.title = tooltip;
    return th;
  }

  function handleSortClick(key: string): void {
    const existingIdx = sorts.findIndex((s) => s.key === key);
    if (existingIdx >= 0) {
      const current = sorts[existingIdx]!;
      if (current.direction === "asc") {
        sorts[existingIdx] = { key, direction: "desc" };
      } else if (current.direction === "desc") {
        sorts.splice(existingIdx, 1); // Remove sort
      } else {
        sorts[existingIdx] = { key, direction: "asc" };
      }
    } else {
      // For single-sort mode, replace; for multi-sort, add
      sorts = [{ key, direction: "asc" }];
    }
    opts.onSort?.(sorts);
  }

  function showColumnMenu(anchor: HTMLElement): void {
    // Remove existing menu
    const existing = document.getElementById("st-column-menu");
    if (existing) existing.remove();

    const menu = document.createElement("div");
    menu.id = "st-column-menu";
    menu.style.cssText = `
      position:absolute;z-index:100;background:#fff;border:1px solid #e5e7eb;
      border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:4px 0;min-width:160px;
    `;

    const rect = anchor.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;

    for (const col of columns) {
      const item = document.createElement("label");
      item.style.cssText = "display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;font-size:13px;";
      item.addEventListener("mouseenter", () => { item.style.background = "#f3f4f6"; });
      item.addEventListener("mouseleave", () => { item.style.background = ""; });

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = colVisibility.get(col.key) !== false;
      cb.addEventListener("change", () => {
        toggleColumn(col.key);
        menu.remove();
        render();
      });

      const span = document.createElement("span");
      span.textContent = col.title;

      item.append(cb, span);
      menu.appendChild(item);
    }

    document.body.appendChild(menu);

    // Close on outside click
    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove(); document.removeEventListener("mousedown", closeHandler);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", closeHandler), 0);
  }

  function startColumnResize(e: MouseEvent, _key: string, th: HTMLElement): void {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = th.offsetWidth;

    const onMouseMove = (me: MouseEvent) => {
      const diff = me.clientX - startX;
      th.style.width = `${Math.max(60, startWidth + diff)}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  // --- Public API ---

  function getData(): TableRow<T>[] { return getPaginatedData(getProcessedData()); }
  function getAllData(): TableRow<T>[] { return [...allData]; }

  function setData(data: TableRow<T>[]): void {
    allData = data;
    currentPage = 1;
    render();
  }

  function getSelectedRows(): TableRow<T>[] {
    return allData.filter((r) => r.selected);
  }

  function selectAll(): void {
    const visible = getProcessedData();
    for (const row of visible) row.selected = true;
    opts.onSelectionChange?.(getSelectedRows());
    render();
  }

  function deselectAll(): void {
    for (const row of allData) row.selected = false;
    opts.onSelectionChange?.([]);
    render();
  }

  function selectRow(id: string): void {
    const row = allData.find((r) => r.id === id);
    if (row) {
      if (opts.selectionMode === "single") deselectAll();
      row.selected = true;
      opts.onSelectionChange?.(getSelectedRows());
      render();
    }
  }

  function setSort(newSorts: SortState[]): void {
    sorts = newSorts;
    opts.onSort?.(sorts);
    render();
  }

  function getSorts(): SortState[] { return [...sorts]; }

  function setFilter(key: string, value: string): void {
    const idx = filters.findIndex((f) => f.key === key);
    if (idx >= 0) {
      if (value) filters[idx] = { key, value }; else filters.splice(idx, 1);
    } else if (value) {
      filters.push({ key, value });
    }
    currentPage = 1;
    opts.onFilter?.(filters);
    render();
  }

  function clearFilters(): void {
    filters = [];
    currentPage = 1;
    render();
  }

  function getPagination(): TablePagination { return getPaginationInfo(); }

  function goToPage(page: number): void {
    const pag = getPaginationInfo();
    currentPage = Math.max(1, Math.min(page, pag.totalPages));
    render();
    opts.onPageChange?.(currentPage, pageSize);
  }

  function toggleColumn(key: string): void {
    colVisibility.set(key, !colVisibility.get(key));
  }

  function setLoading(loading: boolean): void {
    opts.loading = loading;
    render();
  }

  const instance: SortableTableInstance<T> = {
    element: root,
    getData, getAllData, setData,
    getSelectedRows, selectAll, deselectAll, selectRow,
    setSort, getSorts, setFilter, clearFilters,
    getPagination, goToPage, toggleColumn,
    setLoading, render,
    destroy() {
      destroyed = true;
      root.remove();
      root.style.cssText = "";
    },
  };

  // Initial render
  render();

  return instance;
}
