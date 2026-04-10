/**
 * Table Engine: Full-featured data table with sorting, filtering, pagination,
 * column configuration, row selection, virtual scrolling integration,
 * export capabilities, and responsive design.
 */

// --- Types ---

export type SortDirection = "asc" | "desc" | null;
export type FilterOperator = "eq" | "neq" | "contains" | "startsWith" | "endsWith" | "gt" | "lt" | "gte" | "lte" | "in" | "notIn" | "isEmpty" | "isNotEmpty";
export type ColumnAlign = "left" | "center" | "right";

export interface Column<T = Record<string, unknown>> {
  /** Unique key (maps to data field) */
  key: string;
  /** Display header */
  header: string;
  /** Column width (px or CSS value) */
  width?: string | number;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Text alignment */
  align?: ColumnAlign;
  /** Is this column sortable? */
  sortable?: boolean;
  /** Default sort direction */
  defaultSortDir?: SortDirection;
  /** Is this column filterable? */
  filterable?: boolean;
  /** Filter input type */
  filterType?: "text" | "select" | "number" | "date" | "boolean";
  /** Filter options for select type */
  filterOptions?: Array<{ label: string; value: unknown }>;
  /** Custom render function */
  render?: (value: unknown, row: T, index: number) => string | HTMLElement;
  /** Whether column is visible (default: true) */
  visible?: boolean;
  /** Fixed position ("left" or "right") */
  fixed?: "left" | "right";
  /** Whether column can be resized by user */
  resizable?: boolean;
  /** Whether column can be hidden/shown by user */
  hideable?: boolean;
  /** Tooltip for header */
  headerTooltip?: string;
  /** CSS class for cells in this column */
  cellClass?: string;
  /** CSS class for the header */
  headerClass?: string;
  /** Value getter function (for nested data) */
  getter?: (row: T) => unknown;
  /** Comparator for sorting */
  comparator?: (a: T, b: T) => number;
}

export interface TableFilter {
  key: string;
  operator: FilterOperator;
  value: unknown;
}

export interface TableSort {
  key: string;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SelectionState {
  selected: Set<string | number>;
  /** "all" means all items on current page selected */
  mode: "none" | "some" | "all";
}

export interface TableConfig<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  /** Row key field (default: "id") */
  rowKey?: string;
  /** Default page size (default: 20) */
  pageSize?: number;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Enable row selection (default: false) */
  selectable?: boolean;
  /** Multi-select (default: true if selectable) */
  multiSelect?: boolean;
  /** Enable pagination (default: true) */
  paginated?: boolean;
  /** Show row numbers */
  showRowNumbers?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Bordered table */
  bordered?: boolean;
  /** Compact density */
  compact?: boolean;
  /** Hover highlight on rows */
  hoverable?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Max height for scrollable body */
  maxHeight?: string | number;
  /** Virtual scrolling threshold (row count above which to use virtual) */
  virtualThreshold?: number;
  /** Callback when selection changes */
  onSelectionChange?: (selection: SelectionState) => void;
  /** Callback when sort changes */
  onSortChange?: (sort: TableSort) => void;
  /** Callback when filter changes */
  onFilterChange?: (filters: TableFilter[]) => void;
  /** Callback when page changes */
  onPageChange?: (page: number, pageSize: number) => void;
  /** Callback when row is clicked */
  onRowClick?: (row: T, index: number) => void;
  /** Callback when row is double-clicked */
  onRowDoubleClick?: (row: T, index: number) => void;
  /** Row class function */
  rowClass?: (row: T, index: number) => string;
  /** Zebra stripe every N rows */
  zebraEvery?: number;
}

export interface TableState<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  filteredData: T[];
  sortedData: T[];
  pageData: T[];
  sort: TableSort;
  filters: TableFilter[];
  pagination: PaginationState;
  selection: SelectionState;
  config: Required<TableConfig<T>>;
}

// --- Table Engine Class ---

export class TableEngine<T extends Record<string, unknown> = Record<string, unknown>> {
  private state: TableState<T>;
  private listeners = new Set<(state: TableState<T>) => void>();
  private idCounter = 0;

  constructor(config: TableConfig<T>) {
    const resolvedConfig: Required<TableConfig<T>> = {
      rowKey: config.rowKey ?? "id",
      pageSize: config.pageSize ?? 20,
      pageSizeOptions: config.pageSizeOptions ?? [10, 20, 50, 100],
      selectable: config.selectable ?? false,
      multiSelect: config.multiSelect ?? true,
      paginated: config.paginated ?? true,
      showRowNumbers: config.showRowNumbers ?? false,
      striped: config.striped ?? false,
      bordered: config.bordered ?? false,
      compact: config.compact ?? false,
      hoverable: config.hoverable ?? true,
      emptyMessage: config.emptyMessage ?? "No data available",
      loading: config.loading ?? false,
      virtualThreshold: config.virtualThreshold ?? 200,
      ...config,
    };

    this.state = {
      columns: resolvedConfig.columns.filter((c) => c.visible !== false),
      data: config.data,
      filteredData: [...config.data],
      sortedData: [],
      pageData: [],
      sort: { key: "", direction: null },
      filters: [],
      pagination: { page: 1, pageSize: resolvedConfig.pageSize, totalItems: config.data.length, totalPages: 0 },
      selection: { selected: new Set(), mode: "none" },
      config: resolvedConfig,
    };

    this.recompute();
  }

  // --- Data Operations ---

  setData(data: T[]): void {
    this.state.data = data;
    this.recompute();
    this.notify();
  }

  getData(): T[] { return [...this.state.data]; }

  getFilteredData(): T[] { return [...this.state.filteredData]; }

  getPageData(): T[] { return [...this.state.pageData]; }

  addRow(row: T): void {
    this.state.data.push(row);
    this.recompute();
    this.notify();
  }

  updateRow(keyValue: string | number, updates: Partial<T>): void {
    const idx = this.state.data.findIndex((r) => r[this.state.config.rowKey] === keyValue);
    if (idx >= 0) {
      this.state.data[idx] = { ...this.state.data[idx]!, ...updates };
      this.recompute();
      this.notify();
    }
  }

  deleteRow(keyValue: string | number): void {
    this.state.data = this.state.data.filter((r) => r[this.state.config.rowKey] !== keyValue);
    this.state.selection.selected.delete(keyValue);
    this.recompute();
    this.notify();
  }

  // --- Sorting ---

  setSort(key: string, direction?: SortDirection): void {
    const currentDir = this.state.sort.key === key ? this.state.sort.direction : null;
    const newDir = direction ?? (currentDir === "asc" ? "desc" : currentDir === "desc" ? null : "asc");

    this.state.sort = { key, direction: newDir };
    this.recompute();
    this.notify();
    this.state.config.onSortChange?.(this.state.sort);
  }

  getSort(): TableSort { return { ...this.state.sort }; }

  clearSort(): void {
    this.state.sort = { key: "", direction: null };
    this.recompute();
    this.notify();
  }

  // --- Filtering ---

  setFilter(key: string, operator: FilterOperator, value: unknown): void {
    const existingIdx = this.state.filters.findIndex((f) => f.key === key);
    const filter: TableFilter = { key, operator, value };

    if (existingIdx >= 0) {
      this.state.filters[existingIdx] = filter;
    } else {
      this.state.filters.push(filter);
    }

    this.state.pagination.page = 1; // Reset to first page
    this.recompute();
    this.notify();
    this.state.config.onFilterChange?.([...this.state.filters]);
  }

  removeFilter(key: string): void {
    this.state.filters = this.state.filters.filter((f) => f.key !== key);
    this.state.pagination.page = 1;
    this.recompute();
    this.notify();
  }

  clearFilters(): void {
    this.state.filters = [];
    this.state.pagination.page = 1;
    this.recompute();
    this.notify();
  }

  getFilters(): TableFilter[] { return [...this.state.filters]; }

  // --- Pagination ---

  setPage(page: number): void {
    const maxPage = this.state.pagination.totalPages;
    this.state.pagination.page = Math.max(1, Math.min(page, maxPage));
    this.computePageData();
    this.notify();
    this.state.config.onPageChange?.(this.state.pagination.page, this.state.pagination.pageSize);
  }

  setPageSize(size: number): void {
    this.state.pagination.pageSize = size;
    this.state.pagination.page = 1;
    this.recompute();
    this.notify();
  }

  getPagination(): PaginationState { return { ...this.state.pagination }; }

  nextPage(): void { this.setPage(this.state.pagination.page + 1); }
  prevPage(): void { this.setPage(this.state.pagination.page - 1); }

  // --- Selection ---

  selectRow(keyValue: string | number): void {
    if (!this.state.config.multiSelect) {
      this.state.selection.selected.clear();
    }
    this.state.selection.selected.add(keyValue);
    this.updateSelectionMode();
    this.notify();
    this.state.config.onSelectionChange?.({ ...this.state.selection });
  }

  deselectRow(keyValue: string | number): void {
    this.state.selection.selected.delete(keyValue);
    this.updateSelectionMode();
    this.notify();
    this.state.config.onSelectionChange?.({ ...this.state.selection });
  }

  toggleRow(keyValue: string | number): void {
    if (this.state.selection.selected.has(keyValue)) {
      this.deselectRow(keyValue);
    } else {
      this.selectRow(keyValue);
    }
  }

  selectAll(): void {
    for (const row of this.state.pageData) {
      this.state.selection.selected.add(row[this.state.config.rowKey] as string | number);
    }
    this.state.selection.mode = "all";
    this.notify();
    this.state.config.onSelectionChange?.({ ...this.state.selection });
  }

  deselectAll(): void {
    this.state.selection.selected.clear();
    this.state.selection.mode = "none";
    this.notify();
    this.state.config.onSelectionChange?.({ ...this.state.selection });
  }

  getSelectedRows(): T[] {
    const keySet = this.state.selection.selected;
    return this.state.data.filter((r) => keySet.has(r[this.state.config.rowKey] as string | number));
  }

  getSelection(): SelectionState {
    return { selected: new Set(this.state.selection.selected), mode: this.state.selection.mode };
  }

  // --- Columns ---

  setColumns(columns: Column<T>[]): void {
    this.state.columns = columns.filter((c) => c.visible !== false);
    this.state.config.columns = columns;
    this.notify();
  }

  showColumn(key: string): void {
    this.toggleColumnVisibility(key, true);
  }

  hideColumn(key: string): void {
    this.toggleColumnVisibility(key, false);
  }

  toggleColumnVisibility(key: string, visible?: boolean): void {
    const col = this.state.config.columns.find((c) => c.key === key);
    if (col) {
      col.visible = visible ?? !col.visible;
      this.state.columns = this.state.config.columns.filter((c) => c.visible !== false);
      this.notify();
    }
  }

  getVisibleColumns(): Column<T>[] { return [...this.state.columns]; }

  // --- State Access ---

  getState(): TableState<T> { return this.state; }

  subscribe(listener: (state: TableState<T>) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  // --- Export ---

  exportCSV(filename = "table-data.csv"): string {
    const visibleCols = this.getVisibleColumns();
    const headers = visibleCols.map((c) => `"${c.header}"`).join(",");
    const rows = this.getFilteredData().map((row) =>
      visibleCols.map((col) => {
        const val = col.getter ? col.getter(row) : row[col.key];
        return typeof val === "string" && val.includes(",") ? `"${val}"` : String(val ?? "");
      }).join(",")
    );

    const csv = [headers, ...rows].join("\n");
    this.downloadFile(csv, filename, "text/csv");
    return csv;
  }

  exportJSON(): string {
    return JSON.stringify(this.getFilteredData(), null, 2);
  }

  // --- Internal ---

  private recompute(): void {
    this.applyFilters();
    this.applySort();
    this.computePagination();
    this.computePageData();
  }

  private applyFilters(): void {
    let result = [...this.state.data];

    for (const filter of this.state.filters) {
      result = result.filter((row) => this.matchFilter(row, filter));
    }

    this.state.filteredData = result;
  }

  private matchFilter(row: T, filter: TableFilter): boolean {
    const col = this.state.config.columns.find((c) => c.key === filter.key);
    const rawValue = col?.getter ? col.getter(row) : row[filter.key];
    const value = rawValue ?? "";
    const fv = filter.value;

    switch (filter.operator) {
      case "eq": return value == fv;
      case "neq": return value != fv;
      case "contains": return String(value).toLowerCase().includes(String(fv).toLowerCase());
      case "startsWith": return String(value).toLowerCase().startsWith(String(fv).toLowerCase());
      case "endsWith": return String(value).toLowerCase().endsWith(String(fv).toLowerCase());
      case "gt": return Number(value) > Number(fv);
      case "lt": return Number(value) < Number(fv);
      case "gte": return Number(value) >= Number(fv);
      case "lte": return Number(value) <= Number(fv);
      case "in": return Array.isArray(fv) ? fv.includes(value) : false;
      case "notIn": return Array.isArray(fv) ? !fv.includes(value) : true;
      case "isEmpty": return value === "" || value === null || value === undefined;
      case "isNotEmpty": return value !== "" && value !== null && value !== undefined;
      default: return true;
    }
  }

  private applySort(): void {
    const { key, direction } = this.state.sort;
    if (!key || !direction) {
      this.state.sortedData = [...this.state.filteredData];
      return;
    }

    const col = this.state.config.columns.find((c) => c.key === key);

    const sorted = [...this.state.filteredData].sort((a, b) => {
      if (col?.comparator) return col.comparator(a, b);

      const av = col?.getter ? col.getter(a) : a[key];
      const bv = col?.getter ? col.getter(b) : b[key];

      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;

      let cmp = 0;
      if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));

      return direction === "desc" ? -cmp : cmp;
    });

    this.state.sortedData = sorted;
  }

  private computePagination(): void {
    const totalItems = this.state.sortedData.length;
    const pageSize = this.state.pagination.pageSize;
    const totalPages = this.state.config.paginated ? Math.ceil(totalItems / pageSize) || 1 : 1;

    this.state.pagination = {
      ...this.state.pagination,
      totalItems,
      totalPages,
      page: Math.min(this.state.pagination.page, totalPages),
    };
  }

  private computePageData(): void {
    if (!this.state.config.paginated) {
      this.state.pageData = [...this.state.sortedData];
      return;
    }

    const { page, pageSize } = this.state.pagination;
    const start = (page - 1) * pageSize;
    this.state.pageData = this.state.sortedData.slice(start, start + pageSize);
  }

  private updateSelectionMode(): void {
    const selected = this.state.selection.selected.size;
    const pageTotal = this.state.pageData.length;

    if (selected === 0) this.state.selection.mode = "none";
    else if (selected >= pageTotal) this.state.selection.mode = "all";
    else this.state.selection.mode = "some";
  }

  private notify(): void {
    for (const fn of this.listeners) { try { fn(this.state); } catch {} }
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
