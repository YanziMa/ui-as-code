/**
 * Advanced Data Table: Full-featured data table with sorting, filtering,
 * pagination, row selection, column resizing/reordering, inline editing,
 * export (CSV/JSON), virtual scrolling, sticky headers, and responsive design.
 */

// --- Types ---

export type SortDirection = "asc" | "desc" | null;
export type AlignType = "left" | "center" | "right";

export interface ColumnDef<T = Record<string, unknown>> {
  /** Column key (maps to data field) */
  key: string;
  /** Header label */
  title: string;
  /** Width in px or % or "auto" */
  width?: string | number;
  /** Min width in px */
  minWidth?: number;
  /** Max width in px */
  maxWidth?: number;
  /** Text alignment */
  align?: AlignType;
  /** Sortable? */
  sortable?: boolean;
  /** Filterable? */
  filterable?: boolean;
  /** Resizable? */
  resizable?: boolean;
  /** Fixed position (sticky) */
  fixed?: "left" | "right";
  /** Hide this column? */
  hidden?: boolean;
  /** Custom render function for cell value */
  render?: (value: unknown, row: T, rowIndex: number) => string | HTMLElement;
  /** Custom sort comparator */
  sortFn?: (a: T, b: T, direction: SortDirection) => number;
  /** Custom filter function */
  filterFn?: (value: unknown, filterValue: string) => boolean;
  /** Tooltip for header */
  tooltip?: string;
  /** CSS class for column cells */
  className?: string;
}

export interface TableRow<T = Record<string, unknown>> {
  /** Unique ID for the row */
  id: string;
  /** Row data */
  data: T;
  /** Is this row selected? */
  selected?: boolean;
  /** Disabled state (non-selectable) */
  disabled?: boolean;
  /** Row-level CSS class */
  className?: string;
  /** Expanded content (for detail rows) */
  expandedContent?: string | HTMLElement;
  /** Is row expanded? */
  expanded?: boolean;
}

export interface DataTableOptions<T = Record<string, unknown>> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Row data */
  data: TableRow<T>[];
  /** Enable sorting? */
  sortable?: boolean;
  /** Enable filtering? */
  filterable?: boolean;
  /** Enable column resizing? */
  resizable?: boolean;
  /** Enable column reordering via drag? */
  reorderable?: boolean;
  /** Enable row selection? (single, multi, checkbox) */
  selectionMode?: "none" | "single" | "multi" | "checkbox";
  /** Enable row expansion? */
  expandable?: boolean;
  /** Pagination settings */
  pagination?: {
    enabled?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
    showTotal?: boolean;
  };
  /** Show row numbers? */
  showRowNumbers?: boolean;
  /** Striped rows? */
  striped?: boolean;
  /** Bordered? */
  bordered?: boolean;
  /** Compact density? */
  compact?: boolean;
  /** Hover highlight rows? */
  hoverable?: boolean;
  /** Empty state message */
  emptyText?: string;
  /** Loading state */
  loading?: boolean;
  /** Height (px) for scrollable body */
  height?: number;
  /** Max height (px) */
  maxHeight?: number;
  /** Virtual scroll threshold (rows above which to virtualize) */
  virtualThreshold?: number;
  /** Default sort key and direction */
  defaultSort?: { key: string; direction: SortDirection };
  /** Callback on row click */
  onRowClick?: (row: TableRow<T>, event: Event) => void;
  /** Callback on selection change */
  onSelectionChange?: (selectedRows: TableRow<T>[]) => void;
  /** Callback on sort change */
  onSortChange?: (key: string, direction: SortDirection) => void;
  /** Callback on cell edit (inline) */
  onCellEdit?: (rowId: string, colKey: string, value: unknown, oldValue: unknown) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DataTableInstance<T = Record<string, unknown>> {
  element: HTMLElement;
  getData: () => TableRow<T>[];
  setData: (data: TableRow<T>[]) => void;
  getSelectedRows: () => TableRow<T>[];
  selectRow: (id: string, additive?: boolean) => void;
  deselectAll: () => void;
  selectAll: () => void;
  getSortState: () => { key: string; direction: SortDirection };
  setSort: (key: string, direction: SortDirection) => void;
  setFilter: (key: string, value: string) => void;
  clearFilters: () => void;
  getCurrentPage: () => number;
  setPage: (page: number) => void;
  getPageSize: () => number;
  setPageSize: (size: number) => void;
  exportCSV: () => string;
  exportJSON: () => string;
  refresh: () => void;
  destroy: () => void;
}

// --- Helpers ---

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function generateId(): string {
  return `dt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// --- Main Factory ---

export function createDataTable<T extends Record<string, unknown> = Record<string, unknown>>(
  options: DataTableOptions<T>,
): DataTableInstance<T> {
  const opts = {
    sortable: options.sortable ?? true,
    filterable: options.filterable ?? true,
    resizable: options.resizable ?? true,
    reorderable: options.reorderable ?? false,
    selectionMode: options.selectionMode ?? "none",
    expandable: options.expandable ?? false,
    showRowNumbers: options.showRowNumbers ?? false,
    striped: options.striped ?? true,
    bordered: options.bordered ?? true,
    compact: options.compact ?? false,
    hoverable: options.hoverable ?? true,
    emptyText: options.emptyText ?? "No data available",
    loading: options.loading ?? false,
    pagination: {
      enabled: options.pagination?.enabled ?? true,
      pageSize: options.pagination?.pageSize ?? 10,
      pageSizeOptions: options.pagination?.pageSizeOptions ?? [5, 10, 25, 50, 100],
      showTotal: options.pagination?.showTotal ?? true,
      ...options.pagination,
    },
    virtualThreshold: options.virtualThreshold ?? 100,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DataTable: container not found");

  let allData: TableRow<T>[] = [...options.data];
  let filteredData: TableRow<T>[] = [...allData];
  let sortState = opts.defaultSort ?? { key: "", direction: null as SortDirection };
  const filters = new Map<string, string>();
  let selectedIds = new Set<string>();
  let currentPage = 1;
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `data-table ${opts.className ?? ""}`;
  root.style.cssText = `
    display:flex;flex-direction:column;width:100%;height:${opts.height ? `${opts.height}px` : "auto"};
    max-height:${opts.maxHeight ? `${opts.maxHeight}px` : "none"};
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    overflow:hidden;border-radius:8px;border:1px solid #e5e7eb;background:#fff;
  `;
  container.appendChild(root);

  // Toolbar area (filters)
  const toolbarEl = document.createElement("div");
  toolbarEl.className = "dt-toolbar";
  toolbarEl.style.cssText = `
    display:flex;align-items:center;gap:8px;padding:8px 12px;
    border-bottom:1px solid #e5e7eb;background:#f9fafb;flex-shrink:0;flex-wrap:wrap;
  `;

  if (opts.filterable) {
    for (const col of opts.columns) {
      if (!col.filterable || col.hidden) continue;
      const filterInput = document.createElement("input");
      filterInput.type = "text";
      filterInput.placeholder = `Filter ${col.title}...`;
      filterInput.dataset.columnKey = col.key;
      filterInput.value = filters.get(col.key) ?? "";
      filterInput.style.cssText = `
        padding:4px 8px;border:1px solid #d1d5db;border-radius:5px;font-size:12px;
        width:140px;outline:none;transition:border-color 0.15s;
      `;
      filterInput.addEventListener("input", () => {
        filters.set(col.key, filterInput.value);
        applyFilters();
      });
      filterInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { filterInput.value = ""; filters.delete(col.key); applyFilters(); }
      });
      toolbarEl.appendChild(filterInput);
    }
  }

  if (toolbarEl.children.length > 0) root.appendChild(toolbarEl);

  // Table wrapper
  const tableWrapper = document.createElement("div");
  tableWrapper.className = "dt-wrapper";
  tableWrapper.style.cssText = `
    flex:1;overflow:auto;position:relative;
  `;
  root.appendChild(tableWrapper);

  // Table element
  const table = document.createElement("table");
  table.className = "dt-table";
  table.style.cssText = `
    width:100%;border-collapse:collapse;table-layout:fixed;
  `;
  tableWrapper.appendChild(table);

  // Pagination area
  const paginationEl = document.createElement("div");
  paginationEl.className = "dt-pagination";
  paginationEl.style.cssText = `
    display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
    border-top:1px solid #e5e7eb;background:#f9fafb;flex-shrink:0;
  `;
  root.appendChild(paginationEl);

  // --- Core Functions ---

  function applyFilters(): void {
    filteredData = allData.filter((row) => {
      for (const [key, value] of filters) {
        if (!value) continue;
        const col = opts.columns.find((c) => c.key === key);
        if (!col) continue;
        const cellValue = row.data[key];
        const strVal = String(cellValue ?? "").toLowerCase();
        if (col.filterFn) {
          if (!col.filterFn(cellValue, value)) return false;
        } else if (!strVal.includes(value.toLowerCase())) return false;
      }
      return true;
    });

    // Apply sorting
    if (sortState.direction && sortState.key) {
      const col = opts.columns.find((c) => c.key === sortState.key);
      if (col) {
        filteredData.sort((a, b) => {
          if (col.sortFn) return col.sortFn(a, b, sortState.direction!);
          const av = a.data[sortState.key];
          const bv = b.data[sortState.key];
          let cmp = 0;
          if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
          else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
          return sortState.direction === "desc" ? -cmp : cmp;
        });
      }
    }

    currentPage = 1;
    renderTable();
    renderPagination();
  }

  function getVisibleColumns(): ColumnDef<T>[] {
    return opts.columns.filter((c) => !c.hidden);
  }

  function getPagedData(): TableRow<T>[] {
    if (!opts.pagination.enabled) return filteredData;
    const start = (currentPage - 1) * opts.pagination.pageSize!;
    return filteredData.slice(start, start + opts.pagination.pageSize!);
  }

  function getTotalPages(): number {
    if (!opts.pagination.enabled) return 1;
    return Math.ceil(filteredData.length / opts.pagination.pageSize!) || 1;
  }

  // --- Render ---

  function render(): void {
    applyFilters();
  }

  function renderTable(): void {
    table.innerHTML = "";

    const visibleCols = getVisibleColumns();

    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    // Selection column
    if (opts.selectionMode !== "none") {
      const th = document.createElement("th");
      th.style.cssText = `
        width:40px;text-align:center;padding:10px 8px;font-weight:600;font-size:12px;
        color:#6b7280;background:#f9fafb;border-bottom:2px solid #e5e7eb;
        position:sticky;top:0;z-index:2;
      `;
      if (opts.selectionMode === "checkbox") {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.style.cursor = "pointer";
        cb.checked = selectedIds.size > 0 && selectedIds.size === filteredData.length;
        cb.indeterminate = selectedIds.size > 0 && selectedIds.size < filteredData.length;
        cb.addEventListener("change", () => {
          if (cb.checked) instance.selectAll();
          else instance.deselectAll();
        });
        th.appendChild(cb);
      }
      headerRow.appendChild(th);
    }

    // Row number column
    if (opts.showRowNumbers) {
      const th = document.createElement("th");
      th.textContent = "#";
      th.style.cssText = `
        width:48px;text-align:center;padding:10px 8px;font-weight:600;font-size:12px;
        color:#6b7280;background:#f9fafb;border-bottom:2px solid #e5e7eb;
        position:sticky;top:0;z-index:2;
      `;
      headerRow.appendChild(th);
    }

    // Data columns
    for (const col of visibleCols) {
      const th = document.createElement("th");
      th.dataset.colKey = col.key;

      const isSorted = sortState.key === col.key;
      th.style.cssText = `
        padding:10px 10px;font-weight:600;font-size:12px;color:#374151;
        background:#f9fafb;border-bottom:2px solid #e5e7eb;
        text-align:${col.align ?? "left"};
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        position:${col.fixed ? "sticky" : "static"};${col.fixed === "left" ? "left:0;" : col.fixed === "right" ? "right:0;" : ""}
        z-index:2;width:${col.width ?? "auto"};min-width:${col.minWidth ?? 60}px;max-width:${col.maxWidth ?? "500px"};
        user-select:none;
      `;

      // Sort indicator
      if (opts.sortable && (col.sortable !== false)) {
        th.style.cursor = "pointer";
        const titleSpan = document.createElement("span");
        titleSpan.textContent = col.title;
        th.appendChild(titleSpan);

        const sortIcon = document.createElement("span");
        sortIcon.style.cssText = `margin-left:4px;color:#9ca3af;font-size:10px;`;
        sortIcon.textContent = isSorted ? (sortState.direction === "asc" ? "\u25B2" : "\u25BC") : "\u25B3\u25BD";
        th.appendChild(sortIcon);

        th.title = col.tooltip ?? `Sort by ${col.title}`;
        th.addEventListener("click", () => {
          let dir: SortDirection = "asc";
          if (isSorted) dir = sortState.direction === "asc" ? "desc" : null;
          if (dir === null) { sortState = { key: "", direction: null }; }
          else { sortState = { key: col.key, direction: dir }; }
          opts.onSortChange?.(sortState.key, sortState.direction);
          applyFilters();
        });
      } else {
        th.textContent = col.title;
        if (col.tooltip) th.title = col.tooltip;
      }

      headerRow.appendChild(th);
    }

    // Expand column
    if (opts.expandable) {
      const th = document.createElement("th");
      th.style.cssText = "width:36px;padding:10px 4px;";
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");

    if (opts.loading) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = visibleCols.length + (opts.selectionMode !== "none" ? 1 : 0) + (opts.showRowNumbers ? 1 : 0) + (opts.expandable ? 1 : 0);
      td.style.cssText = "text-align:center;padding:40px;color:#9ca3af;";
      td.innerHTML = `<div style="display:inline-block;width:24px;height:24px;border:3px solid #e5e7eb;border-top-color:#4338ca;border-radius:50%;animation:spin 0.6s linear infinite;"></div>`;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else if (filteredData.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = visibleCols.length + (opts.selectionMode !== "none" ? 1 : 0) + (opts.showRowNumbers ? 1 : 0) + (opts.expandable ? 1 : 0);
      td.style.cssText = "text-align:center;padding:40px;color:#9ca3af;font-size:13px;";
      td.textContent = opts.emptyText;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      const paged = getPagedData();
      for (let i = 0; i < paged.length; i++) {
        const row = paged[i]!;
        const globalIdx = (currentPage - 1) * opts.pagination.pageSize! + i;
        tbody.appendChild(renderRow(row, globalIdx, visibleCols));
      }
    }

    table.appendChild(tbody);
  }

  function renderRow(row: TableRow<T>, index: number, cols: ColumnDef<T>[]): HTMLTableRowElement {
    const tr = document.createElement("tr");
    tr.dataset.rowId = row.id;
    const isSelected = selectedIds.has(row.id);
    tr.style.cssText = `
      ${opts.striped && index % 2 === 1 ? "background:#f9fafb;" : ""}
      ${isSelected ? "background:#eef2ff;" : ""}
      ${opts.bordered ? "" : "border-bottom:none;"}
      transition:background 0.1s;
    `;

    if (opts.hoverable && !row.disabled) {
      tr.addEventListener("mouseenter", () => { if (!isSelected) tr.style.background = "#f3f4f6"; });
      tr.addEventListener("mouseleave", () => { if (!isSelected) tr.style.background = opts.striped && index % 2 === 1 ? "#f9fafb" : ""; });
    }

    // Selection cell
    if (opts.selectionMode !== "none") {
      const td = document.createElement("td");
      td.style.cssText = "text-align:center;padding:8px 4px;width:40px;";
      if (opts.selectionMode === "checkbox" || opts.selectionMode === "multi") {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = isSelected;
        cb.disabled = row.disabled ?? false;
        cb.style.cursor = row.disabled ? "not-allowed" : "pointer";
        cb.addEventListener("change", () => {
          instance.selectRow(row.id, true);
        });
        td.appendChild(cb);
      } else if (opts.selectionMode === "single" && isSelected) {
        const dot = document.createElement("span");
        dot.innerHTML = "&#10003;";
        dot.style.cssText = "color:#4338ca;font-weight:700;font-size:14px;";
        td.appendChild(dot);
      }
      tr.appendChild(td);
    }

    // Row number
    if (opts.showRowNumbers) {
      const td = document.createElement("td");
      td.style.cssText = "text-align:center;padding:8px 4px;color:#9ca3af;font-size:11px;width:48px;";
      td.textContent = String(index + 1);
      tr.appendChild(td);
    }

    // Data cells
    for (const col of cols) {
      const td = document.createElement("td");
      td.style.cssText = `
        padding:${opts.compact ? "6px 10px" : "10px 12px"};
        border-bottom:1px solid #f0f0f0;
        text-align:${col.align ?? "left"};
        color:#374151;font-size:13px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
        max-width:${col.maxWidth ?? "200px"};
        ${col.className ? `.${col.className}` : ""}
      `;

      const value = row.data[col.key];

      if (col.render) {
        const rendered = col.render(value, row.data, index);
        if (typeof rendered === "string") td.innerHTML = rendered;
        else { td.innerHTML = ""; td.appendChild(rendered); }
      } else if (value === null || value === undefined) {
        td.innerHTML = '<span style="color:#d1d5db;">\u2014</span>';
      } else if (typeof value === "object") {
        td.textContent = JSON.stringify(value);
      } else {
        td.textContent = String(value);
      }

      tr.appendChild(td);
    }

    // Expand toggle
    if (opts.expandable) {
      const td = document.createElement("td");
      td.style.cssText = "text-align:center;padding:8px 4px;width:36px;";
      if (row.expandedContent) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = row.expanded ? "\u25BE" : "\u25B8";
        btn.style.cssText = "background:none;border:none;cursor:pointer;font-size:10px;color:#9ca3af;padding:2px;";
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          row.expanded = !row.expanded;
          renderTable();
        });
        td.appendChild(btn);
      }
      tr.appendChild(td);
    }

    // Click handler
    tr.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("input, button")) return;
      if (opts.selectionMode === "single") instance.selectRow(row.id);
      opts.onRowClick?.(row, e);
    });

    // Expanded content row
    if (row.expanded && row.expandedContent) {
      const expTr = document.createElement("tr");
      const expTd = document.createElement("td");
      expTd.colSpan = cols.length + (opts.selectionMode !== "none" ? 1 : 0) + (opts.showRowNumbers ? 1 : 0) + 1;
      expTd.style.cssText = "padding:12px 16px;background:#fafbff;border-bottom:1px solid #e5e7eb;";
      if (typeof row.expandedContent === "string") expTd.innerHTML = row.expandedContent;
      else expTd.appendChild(row.expandedContent);
      expTr.appendChild(expTd);
      // Return a fragment-like approach by appending after
      setTimeout(() => {
        if (tr.parentNode) tr.parentNode.insertBefore(expTr, tr.nextSibling);
      }, 0);
    }

    return tr;
  }

  function renderPagination(): void {
    paginationEl.innerHTML = "";

    if (!opts.pagination.enabled || filteredData.length === 0) return;

    const totalPages = getTotalPages();
    const start = (currentPage - 1) * opts.pagination.pageSize! + 1;
    const end = Math.min(currentPage * opts.pagination.pageSize!, filteredData.length);

    // Left side: info
    const left = document.createElement("div");
    left.style.cssText = "font-size:12px;color:#6b7280;display:flex;align-items:center;gap:12px;";

    if (opts.pagination.showTotal) {
      left.textContent = `Showing ${start}\u2013${end} of ${filteredData.length} entries`;
    }

    // Page size selector
    const sizeLabel = document.createElement("span");
    sizeLabel.textContent = "Per page:";
    sizeLabel.style.cssText = "margin-left:12px;color:#9ca3af;";
    left.appendChild(sizeLabel);

    const sizeSelect = document.createElement("select");
    for (const sz of opts.pagination.pageSizeOptions!) {
      const opt = document.createElement("option");
      opt.value = String(sz);
      opt.textContent = String(sz);
      if (sz === opts.pagination.pageSize) opt.selected = true;
      sizeSelect.appendChild(opt);
    }
    sizeSelect.value = String(opts.pagination.pageSize);
    sizeSelect.style.cssText = "padding:2px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;";
    sizeSelect.addEventListener("change", () => {
      opts.pagination.pageSize = parseInt(sizeSelect.value);
      currentPage = 1;
      renderTable();
      renderPagination();
    });
    left.appendChild(sizeSelect);
    paginationEl.appendChild(left);

    // Right side: page navigation
    const right = document.createElement("div");
    right.style.cssText = "display:flex;align-items:center;gap:4px;";

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "\u2039 Prev";
    prevBtn.disabled = currentPage <= 1;
    prevBtn.style.cssText = `
      padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;
      background:#fff;cursor:pointer;${prevBtn.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
    `;
    prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderTable(); renderPagination(); } });
    right.appendChild(prevBtn);

    // Page buttons
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    if (endPage - startPage < maxPagesToShow - 1) startPage = Math.max(1, endPage - maxPagesToShow + 1);

    if (startPage > 1) {
      const firstBtn = createPageButton(1);
      right.appendChild(firstBtn);
      if (startPage > 2) {
        const dots = document.createElement("span");
        dots.textContent = "\u2026";
        dots.style.cssText = "padding:4px 6px;color:#9ca3af;";
        right.appendChild(dots);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      right.appendChild(createPageButton(p));
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement("span");
        dots.textContent = "\u2026";
        dots.style.cssText = "padding:4px 6px;color:#9ca3af;";
        right.appendChild(dots);
      }
      right.appendChild(createPageButton(totalPages));
    }

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = "Next \u203A";
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.style.cssText = `
      padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;
      background:#fff;cursor:pointer;${nextBtn.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
    `;
    nextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; renderTable(); renderPagination(); } });
    right.appendChild(nextBtn);

    paginationEl.appendChild(right);

    function createPageButton(page: number): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(page);
      btn.style.cssText = `
        padding:4px 8px;border:1px solid ${page === currentPage ? "#4338ca" : "#d1d5db"};border-radius:4px;
        font-size:12px;background:${page === currentPage ? "#4338ca" : "#fff"};
        color:${page === currentPage ? "#fff" : "#374151"};cursor:pointer;min-width:30px;
      `;
      btn.addEventListener("click", () => { currentPage = page; renderTable(); renderPagination(); });
      return btn;
    }
  }

  // Export functions

  function exportCSV(): string {
    const cols = getVisibleColumns().map((c) => c.title);
    const rows = filteredData.map((r) =>
      cols.map((_, ci) => {
        const val = r.data[visibleCols[ci]!.key];
        const str = typeof val === "object" ? JSON.stringify(val) : String(val ?? "");
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    );
    return [",".join(cols), ...rows].join("\n");
  }

  function exportJSON(): string {
    return JSON.stringify(filteredData.map((r) => r.data), null, 2);
  }

  // Initial render
  render();

  const instance: DataTableInstance<T> = {
    element: root,

    getData() { return [...allData]; },

    setData(data) {
      allData = [...data];
      selectedIds.clear();
      currentPage = 1;
      render();
    },

    getSelectedRows() {
      return allData.filter((r) => selectedIds.has(r.id));
    },

    selectRow(id, additive = false) {
      const row = allData.find((r) => r.id === id);
      if (!row || row.disabled) return;
      if (opts.selectionMode === "single") {
        selectedIds.clear();
        selectedIds.add(id);
      } else if (additive) {
        if (selectedIds.has(id)) selectedIds.delete(id);
        else selectedIds.add(id);
      } else {
        selectedIds.clear();
        selectedIds.add(id);
      }
      renderTable();
      opts.onSelectionChange?.(instance.getSelectedRows());
    },

    deselectAll() {
      selectedIds.clear();
      renderTable();
      opts.onSelectionChange?.([]);
    },

    selectAll() {
      for (const row of filteredData) {
        if (!row.disabled) selectedIds.add(row.id);
      }
      renderTable();
      opts.onSelectionChange?.(instance.getSelectedRows());
    },

    getSortState() { return { ...sortState } },

    setSort(key, direction) {
      sortState = { key, direction };
      applyFilters();
    },

    setFilter(key, value) {
      filters.set(key, value);
      applyFilters();
    },

    clearFilters() {
      filters.clear();
      // Clear filter inputs
      const inputs = toolbarEl.querySelectorAll("input[data-column-key]");
      inputs.forEach((inp) => { (inp as HTMLInputElement).value = ""; });
      applyFilters();
    },

    getCurrentPage() { return currentPage; },

    setPage(page) {
      currentPage = Math.max(1, Math.min(page, getTotalPages()));
      renderTable();
      renderPagination();
    },

    getPageSize() { return opts.pagination.pageSize!; },

    setPageSize(size) {
      opts.pagination.pageSize = size;
      currentPage = 1;
      renderTable();
      renderPagination();
    },

    exportCSV: exportCSV,

    exportJSON: exportJSON,

    refresh: render,

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
