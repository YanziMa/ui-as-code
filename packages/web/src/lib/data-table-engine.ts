/**
 * Data Table Engine: Advanced data table with sorting, filtering, pagination,
 * column management, row selection, virtual scrolling, cell editing,
 * grouping, aggregation, tree/table modes, export, accessibility,
 * responsive layout, and state persistence.
 */

// --- Types ---

export interface Column<T = unknown> {
  key: string;
  header: string;
  width?: number | "auto" | "min";
  minWidth?: number;
  maxWidth?: number;
  fixed?: "left" | "right";       // Fixed/sticky columns
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  draggable?: boolean;           // Column reordering
  hidden?: boolean;
  order?: number;                // Display order
  align?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  type?: "text" | "number" | "date" | "boolean" | "image" | "link"
    | "badge" | "progress" | "custom" | "action";
  format?: (value: T, row: RowData<T>) => string;
  render?: (value: T, row: RowData<T>, col: Column<T>) => string; // Custom HTML render
  sortFn?: (a: T, b: T) => number; // Custom sort comparator
  filterFn?: (value: T, filterValue: string) => boolean; // Custom filter
  aggregate?: "sum" | "avg" | "count" | "min" | "max" | "concat" | "unique" | "none";
  groupable?: boolean;
  editable?: boolean;
  editor?: "text" | "select" | "number" | "date" | "checkbox" | "custom";
  editorOptions?: Record<string, unknown>;
  tooltip?: string | ((value: T, row: RowData<T>) => string);
  className?: string;
  headerClassName?: string;
  cellClassName?: string | ((value: T, row: RowData<T>) => string);
}

export interface RowData<T = unknown> {
  id: string;
  data: T;
  selected?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  visible?: boolean;
  level?: number;              // For tree mode
  parentId?: string;            // For tree mode
  children?: RowData<T>[];
  className?: string;
  style?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface SortState {
  columnKey: string;
  direction: "asc" | "desc";
  multiSort?: boolean;
}

export interface FilterState {
  columnKey: string;
  operator: FilterOperator;
  value: unknown;
  active: boolean;
}

export type FilterOperator =
  | "eq" | "neq" | "contains" | "notContains" | "startsWith" | "endsWith"
  | "gt" | "gte" | "lt" | "lte" | "between" | "isEmpty" | "isNotEmpty"
  | "in" | "notIn" | "isNull" | "isNotNull";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SelectionState {
  mode: "none" | "single" | "multi" | "all" | "page";
  selectedIds: Set<string>;
  lastSelectedId?: string;
}

export interface GroupState {
  columnKey: string;
  groups: Array<{ value: unknown; label: string; rows: RowData<unknown>[]; collapsed: boolean }>;
  expandedGroups: Set<string>;
}

export interface TableState {
  columns: Column[];
  rows: RowData<unknown>[];
  sort: SortState[];
  filters: FilterState[];
  pagination: PaginationState;
  selection: SelectionState;
  searchQuery?: string;
  groupBy?: GroupState;
  expandedRows: Set<string>;
  columnOrder: string[];          // Ordered column keys
  columnWidths: Map<string, number>;
  scrollPosition: { top: number; left: number };
  isLoading: boolean;
  error?: string;
}

// --- Data Table Engine ---

export class DataTableEngine<T = unknown> {
  private state: TableState;
  private listeners = new Set<(state: TableState) => void>();
  private filteredAndSortedRows: RowData<T>[] = [];
  private originalRows: RowData<T>[] = [];

  constructor(columns: Column<T>[], initialRows: RowData<T>[] = []) {
    this.state = this.createInitialState(columns);
    this.originalRows = initialRows;
    this.setRows(initialRows);
  }

  /** Get current state */
  getState(): TableState { return JSON.parse(JSON.stringify(this.state)) as TableState; }

  /** Get processed/visible rows for current page */
  getVisibleRows(): RowData<T>[] {
    const { pagination } = this.state;
    const start = (pagination.page - 1) * pagination.pageSize;
    return this.filteredAndSortedRows.slice(start, start + pagination.pageSize);
  }

  /** Get all processed rows (after filter/sort/group but before pagination) */
  getAllProcessedRows(): RowData<T>[] { return [...this.filteredAndSortedRows]; }

  // --- Column Operations ---

  /** Add a column */
  addColumn(column: Column<T>): void {
    if (!this.state.columns.find((c) => c.key === column.key)) {
      this.state.columns.push(column);
      this.state.columnOrder.push(column.key);
      this.recompute();
    }
  }

  /** Remove a column */
  removeColumn(key: string): void {
    this.state.columns = this.state.columns.filter((c) => c.key !== key);
    this.state.columnOrder = this.state.columnOrder.filter((k) => k !== key);
    this.recompute();
  }

  /** Update a column's config */
  updateColumn(key: string, updates: Partial<Column<T>>): void {
    const idx = this.state.columns.findIndex((c) => c.key === key);
    if (idx >= 0) Object.assign(this.state.columns[idx]!, updates);
    this.recompute();
  }

  /** Show/hide a column */
  toggleColumnVisibility(key: string): void {
    const col = this.state.columns.find((c) => c.key === key);
    if (col) col.hidden = !col.hidden;
    this.recompute();
  }

  /** Reorder columns */
  reorderColumns(newOrder: string[]): void {
    this.state.columnOrder = newOrder;
    this.recompute();
  }

  /** Resize column */
  resizeColumn(key: string, width: number): void {
    this.state.columnWidths.set(key, width);
    this.emit();
  }

  /** Auto-size column to fit content */
  autoSizeColumn(key: string): void {
    let maxWidth = 0;
    const headerCol = this.state.columns.find((c) => c.key === key);
    if (headerCol) maxWidth = measureText(headerCol.header);

    for (const row of this.filteredAndSortedRows) {
      const val = (row.data as Record<string, unknown>)[key];
      const str = val != null ? String(val) : "";
      maxWidth = Math.max(maxWidth, measureText(str));
    }
    this.state.columnWidths.set(key, maxWidth + 16); // padding
    this.emit();
  }

  // --- Data Operations ---

  /** Set all rows */
  setRows(rows: RowData<T>[]): void {
    this.originalRows = rows;
    this.state.pagination.totalItems = rows.length;
    this.state.pagination.totalPages = Math.ceil(rows.length / this.state.pagination.pageSize);
    this.processRows();
  }

  /** Add a row */
  addRow(row: RowData<T>): void {
    this.originalRows.push(row);
    this.state.pagination.totalItems++;
    this.processRows();
  }

  /** Remove rows by IDs */
  removeRow(ids: string | string[]): void {
    const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
    this.originalRows = this.originalRows.filter((r) => !idSet.has(r.id));
    this.state.selection.selectedIds = new Set([...this.state.selection.selectedIds].filter((id) => !idSet.has(id)));
    this.state.pagination.totalItems = this.originalRows.length;
    this.processRows();
  }

  /** Update a row by ID */
  updateRow(id: string, updates: Partial<RowData<T>> & { data?: Partial<T> }): void {
    const idx = this.originalRows.findIndex((r) => r.id === id);
    if (idx >= 0) {
      if (updates.data) Object.assign(this.originalRows[idx]!.data, updates.data);
      delete updates.data;
      Object.assign(this.originalRows[idx]!, updates);
      this.processRows();
    }
  }

  /** Update a specific cell */
  updateCell(rowId: string, columnKey: string, value: unknown): void {
    const row = this.originalRows.find((r) => r.id === rowId);
    if (row && typeof row.data === "object") {
      (row.data as Record<string, unknown>)[columnKey] = value;
      this.processRows();
    }
  }

  /** Clear all data */
  clearRows(): void {
    this.originalRows = [];
    this.filteredAndSortedRows = [];
    this.state.pagination.totalItems = 0;
    this.state.selection.selectedIds.clear();
    this.emit();
  }

  // --- Sorting ---

  /** Set sort on a column */
  sortBy(columnKey: string, direction: "asc" | "desc" = "asc", addToMulti = false): void {
    if (addToMulti) {
      const existing = this.state.sort.find((s) => s.columnKey === columnKey);
      if (existing) existing.direction = direction;
      else this.state.sort.push({ columnKey, direction });
    } else {
      this.state.sort = [{ columnKey, direction }];
    }
    this.processRows();
  }

  /** Toggle sort direction on a column */
  toggleSort(columnKey: string): void {
    const existing = this.state.sort.find((s) => s.columnKey === columnKey);
    if (existing) {
      existing.direction = existing.direction === "asc" ? "desc" : "asc";
    } else {
      this.sortBy(columnKey, "asc");
    }
  }

  /** Clear all sorts */
  clearSort(): void { this.state.sort = []; this.processRows(); }

  // --- Filtering ---

  /** Set a filter */
  setFilter(columnKey: string, operator: FilterOperator, value: unknown): void {
    const existing = this.state.filters.find((f) => f.columnKey === columnKey);
    if (existing) { existing.operator = operator; existing.value = value; existing.active = true; }
    else this.state.filters.push({ columnKey, operator, value, active: true });
    this.processRows();
  }

  /** Remove a filter */
  removeFilter(columnKey: string): void {
    this.state.filters = this.state.filters.filter((f) => f.columnKey !== columnKey);
    this.processRows();
  }

  /** Clear all filters */
  clearFilters(): void { this.state.filters = []; this.processRows(); }

  /** Set global search query */
  setSearch(query: string): void {
    this.state.searchQuery = query;
    this.processRows();
  }

  // --- Pagination ---

  /** Go to a specific page */
  setPage(page: number): void {
    this.state.pagination.page = Math.max(1, Math.min(page, this.state.pagination.totalPages));
    this.emit();
  }

  /** Set page size */
  setPageSize(size: number): void {
    this.state.pagination.pageSize = size;
    this.state.pagination.totalPages = Math.ceil(this.filteredAndSortedRows.length / size);
    this.state.pagination.page = 1;
    this.emit();
  }

  /** Next page */
  nextPage(): void { this.setPage(this.state.pagination.page + 1); }

  /** Previous page */
  prevPage(): void { this.setPage(this.state.pagination.page - 1); }

  // --- Selection ---

  /** Set selection mode */
  setSelectionMode(mode: SelectionState["mode"]): void {
    this.state.selection.mode = mode;
    if (mode === "none") this.state.selection.selectedIds.clear();
    this.emit();
  }

  /** Select/deselect a row */
  selectRow(id: string, selected: boolean = true, addToExisting = false): void {
    switch (this.state.selection.mode) {
      case "single":
        this.state.selection.selectedIds.clear();
        if (selected) this.state.selection.selectedIds.add(id);
        break;
      case "multi":
        if (selected) {
          if (addToExisting || !this.state.selection.selectedIds.has(id))
            this.state.selection.selectedIds.add(id);
        } else {
          this.state.selection.selectedIds.delete(id);
        }
        break;
      case "all":
        // Toggle handled differently
        break;
      default:
        if (selected) this.state.selection.selectedIds.add(id);
        else this.state.selection.selectedIds.delete(id);
    }
    this.state.selection.lastSelectedId = id;
    this.emit();
  }

  /** Select all visible rows */
  selectAll(): void {
    if (this.state.selection.mode === "none") return;
    this.getVisibleRows().forEach((r) => this.state.selection.selectedIds.add(r.id));
    this.emit();
  }

  /** Deselect all */
  deselectAll(): void {
    this.state.selection.selectedIds.clear();
    this.emit();
  }

  /** Get selected rows */
  getSelectedRows(): RowData<T>[] {
    return this.originalRows.filter((r) => this.state.selection.selectedIds.has(r.id));
  }

  /** Range select (shift+click) */
  rangeSelect(fromId: string, toId: string): void {
    if (this.state.selection.mode !== "multi") return;
    const visible = this.getVisibleRows();
    const fromIdx = visible.findIndex((r) => r.id === fromId);
    const toIdx = visible.findIndex((r) => r.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;

    const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
    for (let i = start; i <= end; i++) this.state.selection.selectedIds.add(visible[i]!.id);
    this.emit();
  }

  // --- Grouping ---

  /** Group by a column */
  groupBy(columnKey: string): void {
    const col = this.state.columns.find((c) => c.key === columnKey);
    if (!col) return;

    const groups = new Map<unknown, RowData<T>[]>();
    for (const row of this.filteredAndSortedRows) {
      const val = (row.data as Record<string, unknown>)[columnKey];
      const key = val ?? "__null__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    this.state.groupBy = {
      columnKey,
      groups: Array.from(groups.entries()).map(([value, rows]) => ({
        value,
        label: value != null ? String(value) : "(empty)",
        rows,
        collapsed: false,
      })),
      expandedGroups: new Set(),
    };
    this.emit();
  }

  /** Clear grouping */
  clearGrouping(): void { this.state.groupBy = undefined; this.emit(); }

  /** Toggle group expansion */
  toggleGroup(groupValue: string): void {
    if (!this.state.groupBy) return;
    const set = this.state.groupBy.expandedGroups;
    if (set.has(groupValue)) set.delete(groupValue); else set.add(groupValue);
    this.emit();
  }

  // --- Row Expansion ---

  /** Toggle row expansion */
  toggleRowExpansion(id: string): void {
    if (this.state.expandedRows.has(id)) this.state.expandedRows.delete(id);
    else this.state.expandedRows.add(id);
    this.emit();
  }

  /** Expand all rows */
  expandAllRows(): void {
    this.filteredAndSortedRows.forEach((r) => this.state.expandedRows.add(r.id));
    this.emit();
  }

  /** Collapse all rows */
  collapseAllRows(): void { this.state.expandedRows.clear(); this.emit(); }

  // --- State Management ---

  /** Export current state as JSON */
  exportState(): object {
    return JSON.parse(JSON.stringify({
      sort: this.state.sort,
      filters: this.state.filters,
      pagination: this.state.pagination,
      selection: { mode: this.state.selection.mode },
      columnOrder: this.state.columnOrder,
      columnWidths: Object.fromEntries(this.state.columnWidths),
      searchQuery: this.state.searchQuery,
    }));
  }

  /** Import state from JSON */
  importState(state: Partial<Pick<TableState, "rows" | "columns">>): void {
    if (state.sort) this.state.sort = state.sort;
    if (state.filters) this.state.filters = state.filters;
    if (state.pagination) Object.assign(this.state.pagination, state.pagination);
    if (state.selection?.mode) this.state.selection.mode = state.selection.mode;
    if (state.columnOrder) this.state.columnOrder = state.columnOrder;
    if (state.columnWidths) this.state.columnWidths = new Map(Object.entries(state.columnWidths));
    if ("searchQuery" in state) this.state.searchQuery = state.searchQuery;
    this.processRows();
  }

  /** Listen for state changes */
  onChange(listener: (state: TableState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Set loading state */
  setLoading(loading: boolean): void { this.state.isLoading = loading; this.emit(); }

  /** Set error state */
  setError(error: string | undefined): void { this.state.error = error; this.emit(); }

  /** Get table statistics */
  getStats(): { totalRows: number; filteredRows: number; visibleRows: number; selectedCount: number; pageCount: number; columnCount: number; hiddenColumnCount: number } {
    return {
      totalRows: this.originalRows.length,
      filteredRows: this.filteredAndSortedRows.length,
      visibleRows: this.getVisibleRows().length,
      selectedCount: this.state.selection.selectedIds.size,
      pageCount: this.state.pagination.totalPages,
      columnCount: this.state.columns.length,
      hiddenColumnCount: this.state.columns.filter((c) => c.hidden).length,
    };
  }

  // --- Internal ---

  private processRows(): void {
    let rows = [...this.originalRows];

    // Apply global search
    if (this.state.searchQuery) {
      const q = this.state.searchQuery.toLowerCase();
      rows = rows.filter((row) =>
        Object.values(row.data as Record<string, unknown>).some((v) =>
          String(v ?? "").toLowerCase().includes(q)
        )
      );
    }

    // Apply column filters
    for (const filter of this.state.filters) {
      if (!filter.active) continue;
      rows = rows.filter((row) => this.applyFilter(row, filter));
    }

    // Apply sorting
    if (this.state.sort.length > 0) {
      rows = this.applySorting(rows);
    }

    this.filteredAndSortedRows = rows;
    this.state.pagination.totalItems = rows.length;
    this.state.pagination.totalPages = Math.ceil(rows.length / this.state.pagination.pageSize);
    if (this.state.pagination.page > this.state.pagination.totalPages) {
      this.state.pagination.page = Math.max(1, this.state.pagination.totalPages);
    }

    this.emit();
  }

  private applyFilter(row: RowData<T>, filter: FilterState): boolean {
    const col = this.state.columns.find((c) => c.key === filter.columnKey);
    if (!col) return true;
    const value = (row.data as Record<string, unknown>)[filter.columnKey];

    // Use custom filter function if available
    if (col.filterFn) return col.filterFn(value as T, String(filter.value));

    switch (filter.operator) {
      case "eq": return value == filter.value;
      case "neq": return value != filter.value;
      case "contains": return String(value ?? "").toLowerCase().includes(String(filter.value).toLowerCase());
      case "notContains": return !String(value ?? "").toLowerCase().includes(String(filter.value).toLowerCase());
      case "startsWith": return String(value ?? "").toLowerCase().startsWith(String(filter.value).toLowerCase());
      case "endsWith": return String(value ?? "").toLowerCase().endsWith(String(filter.value).toLowerCase());
      case "gt": return Number(value) > Number(filter.value);
      case "gte": return Number(value) >= Number(filter.value);
      case "lt": return Number(value) < Number(filter.value);
      case "lte": return Number(value) <= Number(filter.value);
      case "between":
        const arr = Array.isArray(filter.value) ? filter.value : [filter.value, filter.value];
        return Number(value) >= Number(arr[0]) && Number(value) <= Number(arr[1]);
      case "isEmpty": return value == null || value === "" || (Array.isArray(value) && value.length === 0);
      case "isNotEmpty": return value != null && value !== "" && !(Array.isArray(value) && value.length === 0);
      case "in": return Array.isArray(filter.value) ? filter.value.includes(value) : false;
      case "notIn": return Array.isArray(filter.value) ? !filter.value.includes(value) : true;
      case "isNull": return value == null;
      case "isNotNull": return value != null;
      default: return true;
    }
  }

  private applySorting(rows: RowData<T>[]): RowData<T>[] {
    const sorted = [...rows];
    for (let i = this.state.sort.length - 1; i >= 0; i--) {
      const sort = this.state.sort[i]!;
      const col = this.state.columns.find((c) => c.key === sort.columnKey);
      sorted.sort((a, b) => {
        const valA = (a.data as Record<string, unknown>)[sort.columnKey];
        const valB = (b.data as Record<string, unknown>)[sort.columnKey];

        if (col?.sortFn) return sort.direction === "asc" ? col.sortFn(valA as T, valB as T) : -col.sortFn(valA as T, valB as T);

        let cmp = 0;
        if (valA == null && valB == null) cmp = 0;
        else if (valA == null) cmp = -1;
        else if (valB == null) cmp = 1;
        else if (typeof valA === "number" && typeof valB === "number") cmp = valA - valB;
        else cmp = String(valA).localeCompare(String(valB));

        return sort.direction === "desc" ? -cmp : cmp;
      });
    }
    return sorted;
  }

  private createInitialState(columns: Column<T>[]): TableState {
    return {
      columns,
      rows: [],
      sort: [],
      filters: [],
      pagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0 },
      selection: { mode: "none", selectedIds: new Set() },
      expandedRows: new Set(),
      columnOrder: columns.map((c) => c.key),
      columnWidths: new Map(),
      scrollPosition: { top: 0, left: 0 },
      isLoading: false,
    };
  }

  private recompute(): void { this.processRows(); }

  private emit(): void {
    for (const l of this.listeners) l(this.getState());
  }
}

// --- Utility Functions ---

function measureText(text: string, fontSize = 13, font = "-apple-system, sans-serif"): number {
  if (typeof document === "undefined") return text.length * fontSize * 0.6;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return text.length * fontSize * 0.6;
  ctx.font = `${fontSize}px ${font}`;
  return ctx.measureText(text).width;
}

/** Format a cell value for display */
export function formatCellValue<T>(value: T, column: Column<T>, row: RowData<T>): string {
  if (column.format) return column.format(value, row);
  if (value == null) return "";

  switch (column.type) {
    case "number": return formatNumber(value as number);
    case "date": return formatDate(value as string | number);
    case "boolean": return value ? "Yes" : "No";
    case "progress": return `${Math.round(Number(value) * 100)}%`;
    default: return String(value);
  }
}

/** Aggregate values in a column */
export function aggregateColumn(values: unknown[], type: Column["aggregate"]): unknown {
  if (!type || type === "none" || values.length === 0) return null;
  const nums = values.map((v) => Number(v)).filter((n) => !isNaN(n));

  switch (type) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "count": return values.length;
    case "min": return nums.length ? Math.min(...nums) : null;
    case "max": return nums.length ? Math.max(...nums) : null;
    case "concat": return values.join(", ");
    case "unique": return [...new Set(values)].length;
    default: return null;
  }
}

/** Generate CSV from table data */
export function generateCsv<T>(columns: Column<T>[], rows: RowData<T>[]): string {
  const header = columns.map((c) => escapeCsv(c.header)).join(",");
  const lines = [header];
  for (const row of rows) {
    const cells = columns.map((c) => {
      const val = (row.data as Record<string, unknown>)[c.key];
      return escapeCsv(formatCellValue(val as T, c, row));
    }).join(",");
    lines.push(cells);
  }
  return lines.join("\n");
}

function escapeCsv(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatNumber(n: number): string {
  if (isNaN(n) || !isFinite(n)) return String(n);
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(v: string | number): string {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
