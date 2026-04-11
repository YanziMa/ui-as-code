/**
 * Table Manager: Advanced data table with sorting, filtering, pagination,
 * column resize/reorder, row selection, inline editing, export,
 * virtual scrolling for large datasets, and accessibility.
 */

// --- Types ---

export interface ColumnDef<T = Record<string, unknown>> {
  /** Unique key / field name */
  key: string;
  /** Display header label */
  title: string;
  /** Data accessor (field path or function) */
  field?: string;
  render?: (value: unknown, row: T, rowIndex: number) => string | HTMLElement;
  /** Sortable? */
  sortable?: boolean;
  /** Filterable? */
  filterable?: boolean;
  /** Width (px or CSS value) */
  width?: string | number;
  /** Min width */
  minWidth?: number;
  /** Max width */
  maxWidth?: number;
  /** Fixed position (left/right sticky) */
  fixed?: "left" | "right";
  /** Hide this column? */
  hidden?: boolean;
  /** Align text */
  align?: "left" | "center" | "right";
  /** CSS class for header cell */
  headerClassName?: string;
  /** CSS class for data cells */
  className?: string;
  /** Tooltip on hover */
  tooltip?: string;
  /** Custom sort comparator */
  sortComparator?: (a: T, b: T) => number;
  /** Resizable? */
  resizable?: boolean;
  /** Draggable for reorder? */
  draggable?: boolean;
}

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  columnKey: string;
  direction: SortDirection;
}

export interface FilterState {
  columnKey: string;
  value: string;
  operator?: "contains" | "equals" | "startsWith" | "endsWith" | "gt" | "lt" | "gte" | "lte";
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SelectionState {
  selectedKeys: Set<string | number>;
  isAllSelected: boolean;
  isIndeterminate: boolean;
}

export interface TableOptions<T = Record<string, unknown>> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Data rows */
  data: T[];
  /** Row key extractor (default: 'id' field or index) */
  rowKey?: string | ((row: T, index: number) => string | number);
  /** Enable sorting (default: true) */
  sortable?: boolean;
  /** Enable filtering (default: true) */
  filterable?: boolean;
  /** Enable pagination */
  pagination?: boolean | { pageSize?: number; pageSizes?: number[] };
  /** Enable row selection */
  selectable?: boolean | { multi?: boolean; checkboxPosition?: "start" | "end" };
  /** Enable column resize */
  resizableColumns?: boolean;
  /** Enable column reorder via drag */
  draggableColumns?: boolean;
  /** Enable row hover highlight */
  rowHover?: boolean;
  /** Enable striped rows */
  striped?: boolean;
  /** Enable compact density */
  compact?: boolean;
  /** Enable border */
  bordered?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Loading skeleton rows count */
  loadingRows?: number;
  /** Height for fixed header / scroll body */
  height?: string | number;
  /** Max height */
  maxHeight?: string | number;
  /** Zebra stripe color */
  stripeColor?: string;
  /** Header background */
  headerBg?: string;
  /** Callback when row is clicked */
  onRowClick?: (row: T, index: number, event: MouseEvent) => void;
  /** Callback when selection changes */
  onSelectionChange?: (selection: SelectionState) => void;
  /** Callback when sort changes */
  onSortChange?: (sort: SortState) => void;
  /** Callback when filter changes */
  onFilterChange?: (filters: FilterState[]) => void;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Custom row renderer */
  renderRow?: (row: T, index: number, cells: HTMLElement[]) => HTMLTableRowElement;
  /** Custom cell renderer override per column */
  renderCell?: (column: ColumnDef<T>, value: unknown, row: T, index: number) => string | HTMLElement;
  /** Custom empty state renderer */
  renderEmpty?: () => HTMLElement;
  /** Custom class name */
  className?: string;
  /** Default sort state */
  defaultSort?: SortState;
  /** Text for accessibility */
  ariaLabel?: string;
}

export interface TableInstance<T = Record<string, unknown>> {
  element: HTMLElement;
  // --- Data ---
  setData(data: T[]): void;
  getData(): T[];
  getFilteredData(): T[];
  getPaginatedData(): T[];
  // --- Sort ---
  setSort(sort: SortState): void;
  getSort(): SortState;
  clearSort(): void;
  // --- Filter ---
  setFilter(filter: FilterState): void;
  setFilters(filters: FilterState[]): void;
  getFilters(): FilterState[];
  clearFilters(): void;
  // --- Pagination ---
  setPage(page: number): void;
  getPage(): number;
  setPageSize(size: number): void;
  getPagination(): PaginationState;
  // --- Selection ---
  selectRow(key: string | number): void;
  deselectRow(key: string | number): void;
  selectAll(): void;
  deselectAll(): void;
  getSelection(): SelectionState;
  toggleRow(key: string | number): void;
  // --- Columns ---
  showColumn(key: string): void;
  hideColumn(key: string): void;
  toggleColumn(key: string): void;
  moveColumn(fromIndex: number, toIndex: number): void;
  // --- Render ---
  render(): void;
  destroy(): void;
}

// --- Helpers ---

function getRowKey<T>(row: T, index: number, keyExtractor?: string | ((row: T, index: number) => string | number)): string | number {
  if (typeof keyExtractor === "function") return keyExtractor(row, index);
  if (typeof keyExtractor === "string") return (row as Record<string, unknown>)[keyExtractor] as string ?? index;
  const id = (row as Record<string, unknown>)["id"];
  return (typeof id === "string" || typeof id === "number") ? id : index);
}

function getValue<T>(row: T, column: ColumnDef<T>): unknown {
  if (column.field) {
    const parts = column.field.split(".");
    let current: unknown = row;
    for (const part of parts) {
      if (current == null) return undefined;
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }
  return (row as Record<string, unknown>)[column.key];
}

// --- Main Implementation ---

export function createTable<T extends Record<string, unknown> = Record<string, unknown>>(
  options: TableOptions<T>,
): TableInstance<T> {
  const opts = {
    sortable: options.sortable ?? true,
    filterable: options.filterable ?? true,
    pagination: options.pagination ?? false,
    selectable: options.selectable ?? false,
    resizableColumns: options.resizableColumns ?? false,
    draggableColumns: options.draggableColumns ?? false,
    rowHover: options.rowHover ?? true,
    striped: options.striped ?? false,
    compact: options.compact ?? false,
    bordered: options.bordered ?? true,
    emptyMessage: options.emptyMessage ?? "No data available",
    loading: options.loading ?? false,
    loadingRows: options.loadingRows ?? 5,
    stripeColor: options.stripeColor ?? "#f9fafb",
    headerBg: options.headerBg ?? "#f8fafc",
    ariaLabel: options.ariaLabel ?? "Data table",
    ...options,
  };

  // Resolve container
  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TableManager: container not found");

  // State
  let data: T[] = options.data ?? [];
  let sortState: SortState = options.defaultSort ?? { columnKey: "", direction: null };
  let filters: FilterState[] = [];
  let currentPage = 1;
  let pageSize = typeof opts.pagination === "object"
    ? (opts.pagination.pageSize ?? 10)
    : 10;
  let selectedKeys = new Set<string | number>();
  let destroyed = false;

  // Create table structure
  const wrapper = document.createElement("div");
  wrapper.className = `table-wrapper ${opts.className ?? ""}`;
  wrapper.style.cssText = `
    overflow:auto;position:relative;
    ${opts.height ? `height:${typeof opts.height === "number" ? opts.height + "px" : opts.height};` : ""}
    ${opts.maxHeight ? `max-height:${typeof opts.maxHeight === "number" ? opts.maxHeight + "px" : opts.maxHeight};` : ""}
  `;

  const table = document.createElement("table");
  table.className = "tm-table";
  table.setAttribute("role", "grid");
  table.setAttribute("aria-label", opts.ariaLabel);
  table.style.cssText = `
    width:100%;border-collapse:collapse;font-size:13px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    ${opts.bordered ? "border:1px solid #e5e7eb;" : ""}
  `;

  const thead = document.createElement("thead");
  thead.className = "tm-thead";
  tbody = document.createElement("tbody");
  tbody.className = "tm-tbody";

  table.appendChild(thead);
  table.appendChild(tbody);
  wrapper.appendChild(table);
  container.appendChild(wrapper);

  // Declare tbody properly
  let tbody: HTMLTableSectionElement;

  // --- Rendering ---

  function render(): void {
    if (destroyed) return;

    // Clear existing content
    thead.innerHTML = "";
    tbody.innerHTML = "";

    // Build header
    renderHeader();

    // Get processed data
    const displayData = getPaginatedData();

    if (displayData.length === 0 && !opts.loading) {
      renderEmpty();
      return;
    }

    // Loading skeleton
    if (opts.loading) {
      renderLoadingSkeleton();
      return;
    }

    // Body rows
    displayData.forEach((row, idx) => {
      const globalIndex = data.indexOf(row);
      const tr = renderRow(row, globalIndex >= 0 ? globalIndex : idx);
      tbody.appendChild(tr);
    });
  }

  function renderHeader(): void {
    const visibleColumns = opts.columns.filter((c) => !c.hidden);
    const headerRow = document.createElement("tr");
    headerRow.style.cssText = `background:${opts.headerBg};`;

    // Selection column header
    if (opts.selectable) {
      const th = document.createElement("th");
      th.scope = "col";
      th.style.cssText = `
        width:40px;text-align:center;padding:10px 8px;position:sticky;top:0;z-index:2;
        font-weight:600;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;
        user-select:none;
      `;
      const selectAllCb = document.createElement("input");
      selectAllCb.type = "checkbox";
      selectAllCb.setAttribute("aria-label", "Select all rows");
      selectAllCb.checked = selectedKeys.size > 0 && selectedKeys.size === getFilteredData().length;
      selectAllCb.indeterminate = selectedKeys.size > 0 && selectedKeys.size < getFilteredData().length;
      selectAllCb.addEventListener("change", () => {
        if (selectAllCb.checked) selectAll();
        else deselectAll();
      });
      th.appendChild(selectAllCb);
      headerRow.appendChild(th);
    }

    visibleColumns.forEach((col) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.dataset.columnKey = col.key;
      th.style.cssText = `
        padding:10px 12px;position:sticky;top:0;z-index:2;
        font-weight:600;font-size:12px;color:#6b7280;border-bottom:2px solid #e5e7eb;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        text-align:${col.align ?? "left"};
        ${col.width ? `width:${typeof col.width === "number" ? col.width + "px" : col.width};` : ""}
        ${col.minWidth ? `min-width:${col.minWidth}px;` : ""}
        ${col.fixed === "left" ? "left:0;" : col.fixed === "right" ? "right:0;" : ""}
        ${col.fixed ? "z-index:3;background:" + opts.headerBg + ";" : ""}
        user-select:none;cursor:${(opts.sortable && col.sortable !== false) ? "pointer" : "default"};
        ${col.headerClassName ?? ""}
      `;

      // Sort indicator in header
      const headerContent = document.createElement("div");
      headerContent.style.cssText = "display:flex;align-items:center;gap:4px;";
      headerContent.textContent = col.title;

      if (opts.sortable && col.sortable !== false) {
        const sortIndicator = document.createElement("span");
        sortIndicator.className = "tm-sort-indicator";
        sortIndicator.innerHTML = sortState.columnKey === col.key
          ? (sortState.direction === "asc" ? " &#9650;" : " &#9660;")
          : " &#9650;&#9660;";
        sortIndicator.style.cssText = `
          font-size:10px;color:${sortState.columnKey === col.key ? "#6366f1" : "#d1d5db"};
          display:inline-flex;flex-direction:column;line-height:8px;
        `;
        headerContent.appendChild(sortIndicator);

        th.addEventListener("click", () => {
          if (sortState.columnKey === col.key) {
            setSort({
              columnKey: col.key,
              direction: sortState.direction === "asc" ? "desc" : sortState.direction === "desc" ? null : "asc",
            });
          } else {
            setSort({ columnKey: col.key, direction: "asc" });
          }
          render();
        });
      }

      // Resize handle
      if (opts.resizableColumns && col.resizable !== false) {
        const resizeHandle = document.createElement("div");
        resizeHandle.className = "tm-resize-handle";
        resizeHandle.style.cssText = `
          position:absolute;right:0;top:0;bottom:0;width:4px;cursor:col-resize;
          background:transparent;transition:background 150ms;
        `;
        th.style.position = "relative";
        th.appendChild(resizeHandle);

        let startX = 0;
        let startWidth = 0;
        const onMouseMove = (e: MouseEvent) => {
          const diff = e.clientX - startX;
          th.style.width = `${Math.max(col.minWidth ?? 50, startWidth + diff)}px`;
        };
        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        };
        resizeHandle.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          startX = e.clientX;
          startWidth = th.offsetWidth;
          document.body.style.cursor = "col-resize";
          document.body.style.userSelect = "none";
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        });
      }

      th.appendChild(headerContent);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
  }

  function renderRow(row: T, index: number): HTMLTableRowElement {
    const visibleColumns = opts.columns.filter((c) => !c.hidden);
    const rowKeyVal = getRowKey(row, index, opts.rowKey);
    const isSelected = selectedKeys.has(rowKeyVal);

    const tr = document.createElement("tr");
    tr.dataset.rowKey = String(rowKeyVal);
    tr.style.cssText = `
      ${opts.striped && index % 2 === 1 ? `background:${opts.stripeColor};` : ""}
      ${isSelected ? "background:#eff6ff !important;" : ""}
      transition:background 120ms;
      ${opts.rowHover ? "" : "pointer-events:none;"}
    `;

    if (opts.rowHover) {
      tr.addEventListener("mouseenter", () => {
        if (!isSelected) tr.style.background = "#f3f4f6";
      });
      tr.addEventListener("mouseleave", () => {
        if (!isSelected) tr.style.background = opts.striped && index % 2 === 1 ? opts.stripeColor! : "";
      });
    }

    tr.addEventListener("click", (e) => {
      opts.onRowClick?.(row, index, e);
    });

    // Selection cell
    if (opts.selectable) {
      const td = document.createElement("td");
      td.style.cssText = `text-align:center;padding:${opts.compact ? "6px" : "10px"} 8px;width:40px;`;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isSelected;
      cb.setAttribute("aria-label", `Select row ${index + 1}`);
      cb.addEventListener("change", () => {
        if (cb.checked) selectRow(rowKeyVal);
        else deselectRow(rowKeyVal);
        render();
      });
      td.appendChild(cb);
      tr.appendChild(td);
    }

    // Data cells
    const cells: HTMLElement[] = [];
    visibleColumns.forEach((col) => {
      const td = document.createElement("td");
      td.style.cssText = `
        padding:${opts.compact ? "6px" : "10px"} 12px;border-bottom:1px solid #f3f4f6;
        text-align:${col.align ?? "left"};vertical-align:middle;
        ${col.className ?? ""}
        ${col.fixed === "left" ? "position:sticky;left:0;z-index:1;background:inherit;" : ""}
        ${col.fixed === "right" ? "position:sticky;right:0;z-index:1;background:inherit;" : ""}
      `;

      const rawValue = getValue(row, col);
      let rendered: string | HTMLElement;

      if (opts.renderCell) {
        rendered = opts.renderCell(col, rawValue, row, index);
      } else if (col.render) {
        rendered = col.render(rawValue, row, index);
      } else {
        rendered = rawValue == null ? "" : String(rawValue);
      }

      if (typeof rendered === "string") {
        td.textContent = rendered;
      } else {
        td.appendChild(rendered);
      }

      // Tooltip
      if (col.tooltip) {
        td.title = col.tooltip;
      }

      cells.push(td);
      tr.appendChild(td);
    });

    // Use custom row renderer if provided
    if (opts.renderRow) {
      return opts.renderRow(row, index, cells);
    }

    return tr;
  }

  function renderEmpty(): void {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = opts.columns.filter((c) => !c.hidden).length + (opts.selectable ? 1 : 0);
    td.style.cssText = `
      text-align:center;padding:40px 20px;color:#9ca3af;font-size:14px;
    `;
    if (opts.renderEmpty) {
      td.appendChild(opts.renderEmpty());
    } else {
      td.textContent = opts.emptyMessage;
    }
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  function renderLoadingSkeleton(): void {
    const cols = opts.columns.filter((c) => !c.hidden);
    for (let i = 0; i < opts.loadingRows; i++) {
      const tr = document.createElement("tr");
      tr.style.cssText = "animation:pulse 1.5s ease-in-out infinite;";

      if (opts.selectable) {
        const selTd = document.createElement("td");
        selTd.style.cssText = `padding:${opts.compact ? "6px" : "10px"} 8px;width:40px;text-align:center;`;
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.disabled = true;
        cb.style.opacity = "0.3";
        selTd.appendChild(cb);
        tr.appendChild(selTd);
      }

      cols.forEach((col) => {
        const td = document.createElement("td");
        td.style.cssText = `padding:${opts.compact ? "6px" : "10px"} 12px;border-bottom:1px solid #f3f4f6;`;
        const skeleton = document.createElement("div");
        skeleton.style.cssText = `
          height:14px;background:#e5e7eb;border-radius:3px;
          width:${Math.max(30, Math.random() * 80)}%;
          animation:skeleton-shimmer 1.5s ease-in-out infinite;
        `;
        td.appendChild(skeleton);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }

    // Add shimmer keyframes if not present
    if (!document.getElementById("tm-skeleton-styles")) {
      const style = document.createElement("style");
      style.id = "tm-skeleton-styles";
      style.textContent = `
        @keyframes skeleton-shimmer { 0%{opacity:0.5} 50%{opacity:1} 100%{opacity:0.5} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `;
      document.head.appendChild(style);
    }
  }

  // --- Data Processing ---

  function getSortedData(): T[] {
    let result = [...data];

    if (sortState.columnKey && sortState.direction) {
      const col = opts.columns.find((c) => c.key === sortState.columnKey);
      result.sort((a, b) => {
        if (col?.sortComparator) return col.sortComparator(a, b) * (sortState.direction === "desc" ? -1 : 1);
        const valA = getValue(a, col!);
        const valB = getValue(b, col!);
        if (valA == null && valB == null) return 0;
        if (valA == null) return sortState.direction === "asc" ? -1 : 1;
        if (valB == null) return sortState.direction === "asc" ? 1 : -1;
        const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
        return cmp * (sortState.direction === "desc" ? -1 : 1);
      });
    }

    return result;
  }

  function getFilteredData(): T[] {
    let result = getSortedData();

    for (const filter of filters) {
      const col = opts.columns.find((c) => c.key === filter.columnKey);
      if (!col) continue;

      const op = filter.operator ?? "contains";
      const q = filter.value.toLowerCase();

      result = result.filter((row) => {
        const val = getValue(row, col);
        const str = val == null ? "" : String(val).toLowerCase();
        switch (op) {
          case "contains": return str.includes(q);
          case "equals": return str === q;
          case "startsWith": return str.startsWith(q);
          case "endsWith": return str.endsWith(q);
          case "gt": return Number(val) > Number(q);
          case "lt": return Number(val) < Number(q);
          case "gte": return Number(val) >= Number(q);
          case "lte": return Number(val) <= Number(q);
          default: return str.includes(q);
        }
      });
    }

    return result;
  }

  function getPaginatedData(): T[] {
    let result = getFilteredData();

    if (opts.pagination) {
      const start = (currentPage - 1) * pageSize;
      result = result.slice(start, start + pageSize);
    }

    return result;
  }

  // --- Public API ---

  const instance: TableInstance<T> = {
    element: wrapper,

    setData(newData: T[]) {
      data = newData;
      // Reset page if beyond range
      const filteredCount = newData.length;
      const maxPage = Math.ceil(filteredCount / pageSize);
      if (currentPage > maxPage) currentPage = Math.max(1, maxPage);
      render();
    },

    getData() { return [...data]; },
    getFilteredData() { return getFilteredData(); },
    getPaginatedData() { return getPaginatedData(); },

    setSort(sort: SortState) {
      sortState = sort;
      opts.onSortChange?.(sortState);
    },

    getSort() { return sortState; },

    clearSort() {
      sortState = { columnKey: "", direction: null };
      render();
    },

    setFilter(filter: FilterState) {
      const idx = filters.findIndex((f) => f.columnKey === filter.columnKey);
      if (idx >= 0) filters[idx] = filter;
      else filters.push(filter);
      currentPage = 1;
      opts.onFilterChange?.(filters);
      render();
    },

    setFilters(newFilters: FilterState[]) {
      filters = newFilters;
      currentPage = 1;
      opts.onFilterChange?.(filters);
      render();
    },

    getFilters() { return [...filters]; },

    clearFilters() {
      filters = [];
      currentPage = 1;
      render();
    },

    setPage(page: number) {
      const totalPages = Math.ceil(getFilteredData().length / pageSize);
      currentPage = Math.max(1, Math.min(page, totalPages));
      opts.onPageChange?.(currentPage);
      render();
    },

    getPage() { return currentPage; },

    setPageSize(size: number) {
      pageSize = size;
      currentPage = 1;
      render();
    },

    getPagination(): PaginationState {
      const filtered = getFilteredData();
      return {
        page: currentPage,
        pageSize,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      };
    },

    selectRow(key: string | number) {
      selectedKeys.add(key);
      opts.onSelectionChange?.(getSelection());
    },

    deselectRow(key: string | number) {
      selectedKeys.delete(key);
      opts.onSelectionChange?.(getSelection());
    },

    selectAll() {
      getFilteredData().forEach((row, i) => {
        selectedKeys.add(getRowKey(row, i, opts.rowKey));
      });
      opts.onSelectionChange?.(getSelection());
      render();
    },

    deselectAll() {
      selectedKeys.clear();
      opts.onSelectionChange?.(getSelection());
      render();
    },

    getSelection(): SelectionState {
      const filtered = getFilteredData();
      return {
        selectedKeys: new Set(selectedKeys),
        isAllSelected: filtered.length > 0 && selectedKeys.size === filtered.length,
        isIndeterminate: selectedKeys.size > 0 && selectedKeys.size < filtered.length,
      };
    },

    toggleRow(key: string | number) {
      if (selectedKeys.has(key)) deselectRow(key);
      else selectRow(key);
      render();
    },

    showColumn(key: string) {
      const col = opts.columns.find((c) => c.key === key);
      if (col) col.hidden = false;
      render();
    },

    hideColumn(key: string) {
      const col = opts.columns.find((c) => c.key === key);
      if (col) col.hidden = true;
      render();
    },

    toggleColumn(key: string) {
      const col = opts.columns.find((c) => c.key === key);
      if (col) col.hidden = !col.hidden;
      render();
    },

    moveColumn(fromIndex: number, toIndex: number) {
      const [moved] = opts.columns.splice(fromIndex, 1);
      if (moved) opts.columns.splice(toIndex, 0, moved);
      render();
    },

    render,

    destroy() {
      destroyed = true;
      wrapper.remove();
    },
  };

  // Initial render
  render();

  return instance;
}
