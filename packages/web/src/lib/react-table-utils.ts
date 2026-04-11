/**
 * React Table Utilities: Column definitions, sorting, filtering,
 * pagination, selection, row expansion, column resizing,
 * and table state management for data tables.
 */

// --- Types ---

export interface ColumnDef<T> {
  /** Unique key for the column */
  key: string;
  /** Display header */
  header: string;
  /** Accessor function or property key */
  accessor?: keyof T | ((row: T) => unknown);
  /** Render custom cell */
  render?: (value: unknown, row: T, rowIndex: number) => React.ReactNode;
  /** Sortable? */
  sortable?: boolean;
  /** Filterable? */
  filterable?: boolean;
  /** Column width (px or CSS value) */
  width?: string | number;
  /** Min width */
  minWidth?: number;
  /** Is this column fixed/sticky? */
  fixed?: "left" | "right";
  /** Align text */
  align?: "left" | "center" | "right";
  /** Hide on small screens? */
  responsiveHide?: boolean;
  /** Custom sort comparator */
  sortFn?: (a: T, b: T, direction: "asc" | "desc") => number;
}

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  columnKey: string;
  direction: SortDirection;
}

export interface FilterState {
  columnKey: string;
  value: string;
  operator: "contains" | "equals" | "startsWith" | "endsWith" | "gt" | "lt" | "gte" | "lte";
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface SelectionState<T> {
  selected: Set<T>;
  selectAll: boolean;
}

export interface TableState<T> {
  data: T[];
  filteredData: T[];
  sortedData: T[];
  paginatedData: T[];
  sort: SortState;
  filters: FilterState[];
  pagination: PaginationState;
  selection: SelectionState<T>;
  expandedRows: Set<number>;
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
}

// --- Sorting ---

/** Apply sorting to data array */
export function applySorting<T>(
  data: T[],
  columns: ColumnDef<T>[],
  sortState: SortState,
): T[] {
  if (!sortState.direction || !sortState.columnKey) return [...data];

  const col = columns.find((c) => c.key === sortState.columnKey);
  if (!col) return [...data];

  const dir = sortState.direction === "asc" ? 1 : -1;

  const sorted = [...data].sort((a, b) => {
    if (col.sortFn) return col.sortFn(a, b, sortState.direction!);

    let valA: unknown, valB: unknown;

    if (typeof col.accessor === "function") {
      valA = col.accessor(a);
      valB = col.accessor(b);
    } else if (col.accessor) {
      valA = a[col.accessor];
      valB = b[col.accessor];
    } else {
      return 0;
    }

    // Handle null/undefined
    if (valA == null && valB == null) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;

    // String comparison
    if (typeof valA === "string" && typeof valB === "string") {
      return valA.localeCompare(valB) * dir;
    }

    // Number comparison
    if (typeof valA === "number" && typeof valB === "number") {
      return (valA - valB) * dir;
    }

    // Date comparison
    if (valA instanceof Date && valB instanceof Date) {
      return (valA.getTime() - valB.getTime()) * dir;
    }

    // Fallback to string comparison
    return String(valA).localeCompare(String(valB)) * dir;
  });

  return sorted;
}

// --- Filtering ---

/** Apply filters to data array */
export function applyFilters<T>(
  data: T[],
  columns: ColumnDef<T>[],
  filters: FilterState[],
): T[] {
  if (filters.length === 0) return [...data];

  return data.filter((row) =>
    filters.every((filter) => {
      const col = columns.find((c) => c.key === filter.columnKey);
      if (!col || !filter.value) return true;

      let value: unknown;
      if (typeof col.accessor === "function") {
        value = col.accessor(row);
      } else if (col.accessor) {
        value = row[col.accessor];
      } else {
        return true;
      }

      const strValue = String(value ?? "").toLowerCase();
      const filterVal = filter.value.toLowerCase();

      switch (filter.operator) {
        case "contains": return strValue.includes(filterVal);
        case "equals": return strValue === filterVal;
        case "startsWith": return strValue.startsWith(filterVal);
        case "endsWith": return strValue.endsWith(filterVal);
        case "gt": return Number(value) > Number(filterVal);
        case "lt": return Number(value) < Number(filterVal);
        case "gte": return Number(value) >= Number(filterVal);
        case "lte": return Number(value) <= Number(filterVal);
        default: return true;
      }
    }),
  );
}

// --- Pagination ---

/** Slice data into pages */
export function paginate<T>(data: T[], page: number, pageSize: number): { data: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.max(0, Math.min(page, totalPages - 1));
  const start = safePage * pageSize;
  return {
    data: data.slice(start, start + pageSize),
    totalPages,
  };
}

/** Calculate pagination info */
export function getPaginationInfo(state: PaginationState): {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  const totalPages = Math.max(1, Math.ceil(state.totalItems / state.pageSize));
  const currentPage = Math.min(state.page, totalPages - 1);
  const startIndex = currentPage * state.pageSize + 1;
  const endIndex = Math.min(startIndex + state.pageSize - 1, state.totalItems);

  return {
    currentPage,
    totalPages,
    totalItems: state.totalItems,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages - 1,
    hasPrevPage: currentPage > 0,
  };
}

// --- Table State Manager ---

/**
 * Manages all table state in one place.
 */
export class TableStateManager<T> {
  private _columns: ColumnDef<T>[];
  private _originalData: T[];
  public state: TableState<T>;

  constructor(columns: ColumnDef<T>[], data: T[], options?: { pageSize?: number }) {
    this._columns = columns;
    this._originalData = data;

    const visibleCols: Record<string, boolean> = {};
    for (const col of columns) visibleCols[col.key] = true;

    this.state = {
      data,
      filteredData: data,
      sortedData: data,
      paginatedData: [],
      sort: { columnKey: "", direction: null },
      filters: [],
      pagination: { page: 0, pageSize: options?.pageSize ?? 10, totalItems: data.length },
      selection: { selected: new Set(), selectAll: false },
      expandedRows: new Set(),
      columnOrder: columns.map((c) => c.key),
      columnVisibility: visibleCols,
    };

    this.recompute();
  }

  /** Recompute derived state after any change */
  recompute(): void {
    const filtered = applyFilters(this._originalData, this._columns, this.state.filters);
    const sorted = applySorting(filtered, this._columns, this.state.sort);
    const { data: paginated, totalPages } = paginate(sorted, this.state.pagination.page, this.state.pagination.pageSize);

    this.state.filteredData = filtered;
    this.state.sortedData = sorted;
    this.state.paginatedData = paginated;
    this.state.pagination.totalItems = sorted.length;
    this.state.pagination.page = Math.min(this.state.pagination.page, Math.max(0, totalPages - 1));
  }

  // --- Sort ---
  setSort(columnKey: string, direction?: SortDirection): void {
    const currentCol = this.state.sort.columnKey === columnKey ? this.state.sort.direction : null;
    const newDir = direction ?? (currentCol === "asc" ? "desc" : currentCol === "desc" ? null : "asc");
    this.state.sort = { columnKey, direction: newDir };
    this.recompute();
  }

  toggleSort(columnKey: string): void {
    const currentDir = this.state.sort.columnKey === columnKey ? this.state.sort.direction : null;
    this.setSort(columnKey, currentDir === "asc" ? "desc" : "asc");
  }

  // --- Filter ---
  setFilter(columnKey: string, value: string, operator: FilterState["operator"] = "contains"): void {
    const existingIdx = this.state.filters.findIndex((f) => f.columnKey === columnKey);
    if (existingIdx !== -1) {
      if (!value) {
        this.state.filters.splice(existingIdx, 1);
      } else {
        this.state.filters[existingIdx] = { columnKey, value, operator };
      }
    } else if (value) {
      this.state.filters.push({ columnKey, value, operator });
    }
    this.state.pagination.page = 0; // Reset to first page
    this.recompute();
  }

  clearFilters(): void {
    this.state.filters = [];
    this.state.pagination.page = 0;
    this.recompute();
  }

  // --- Data ---
  setData(data: T[]): void {
    this._originalData = data;
    this.state.data = data;
    this.recompute();
  }

  // --- Pagination ---
  setPage(page: number): void {
    this.state.pagination.page = page;
    this.recompute();
  }

  setPageSize(size: number): void {
    this.state.pagination.pageSize = size;
    this.state.pagination.page = 0;
    this.recompute();
  }

  // --- Selection ---
  toggleRowSelection(row: T): void {
    if (this.state.selection.selected.has(row)) {
      this.state.selection.selected.delete(row);
    } else {
      this.state.selection.selected.add(row);
    }
    this.state.selection.selectAll = false;
  }

  selectAll(): void {
    this.state.selection.selected = new Set(this.state.sortedData);
    this.state.selection.selectAll = true;
  }

  clearSelection(): void {
    this.state.selection.selected.clear();
    this.state.selection.selectAll = false;
  }

  // --- Expansion ---
  toggleRowExpansion(rowIndex: number): void {
    if (this.state.expandedRows.has(rowIndex)) {
      this.state.expandedRows.delete(rowIndex);
    } else {
      this.state.expandedRows.add(rowIndex);
    }
  }

  // --- Columns ---
  toggleColumnVisibility(key: string): void {
    this.state.columnVisibility[key] = !this.state.columnVisibility[key];
  }

  setColumnOrder(order: string[]): void {
    this.state.columnOrder = order;
  }

  /** Get visible columns in order */
  getVisibleColumns(): ColumnDef<T>[] {
    return this.state.columnOrder
      .map((key) => this._columns.find((c) => c.key === key))
      .filter((col): col is ColumnDef<T> => col !== undefined && this.state.columnVisibility[col.key]);
  }
}
