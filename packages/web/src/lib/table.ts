/**
 * Table/data grid utilities: sorting, filtering, pagination, column management.
 */

export interface Column<T = unknown> {
  /** Unique key */
  key: string;
  /** Display header */
  header: string;
  /** Accessor function or property path */
  accessor?: keyof T | ((row: T) => unknown);
  /** Sortable? (default: true if accessor exists) */
  sortable?: boolean;
  /** Filterable? */
  filterable?: boolean;
  /** Column width (CSS) */
  width?: string;
  /** Minimum width */
  minWidth?: string;
  /** Align text */
  align?: "left" | "center" | "right";
  /** Custom render function */
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
  /** Whether to hide this column */
  hidden?: boolean;
  /** Fixed position (sticky) */
  fixed?: "left" | "right";
}

export interface TableState<T> {
  data: T[];
  columns: Column<T>[];
  sort: SortState;
  filter: FilterState;
  pagination: PaginationState;
  selection: SelectionState;
  expandedRows: Set<number | string>;
}

export interface SortState {
  key: string | null;
  direction: "asc" | "desc" | null;
}

export interface FilterState {
  searchTerm: string;
  activeFilters: Array<{ key: string; value: unknown; operator: FilterOperator }>;
}

export type FilterOperator = "equals" | "contains" | "startsWith" | "endsWith" |
  "gt" | "gte" | "lt" | "lte" | "notEquals";

export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface SelectionState {
  selected: Set<number | string>;
  selectAll: boolean;
}

/** Create initial table state */
export function createTableState<T>(
  data: T[],
  columns: Column<T>[],
  options?: { pageSize?: number },
): TableState<T> {
  return {
    data,
    columns: columns.filter((c) => !c.hidden),
    sort: { key: null, direction: null },
    filter: { searchTerm: "", activeFilters: [] },
    pagination: {
      page: 1,
      pageSize: options?.pageSize ?? 10,
      totalItems: data.length,
    },
    selection: { selected: new Set(), selectAll: false },
    expandedRows: new Set(),
  };
}

/** Get sorted data */
export function getSortedData<T>(state: TableState<T>): T[] {
  const { data, sort } = state;

  if (!sort.key || !sort.direction) return [...data];

  const column = state.columns.find((c) => c.key === sort.key);
  if (!column) return [...data];

  return [...data].sort((a, b) => {
    const aVal = getCellValue(a, column);
    const bVal = getCellValue(b, column);

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sort.direction === "asc" ? -1 : 1;
    if (bVal == null) return sort.direction === "asc" ? 1 : -1;

    let cmp = 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal));
    }

    return sort.direction === "desc" ? -cmp : cmp;
  });
}

/** Get filtered data */
export function getFilteredData<T>(state: TableState<T>): T[] {
  let result = getSortedData(state);
  const { filter } = state;

  // Search term
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    result = result.filter((row) =>
      state.columns.some((col) => {
        const val = getCellValue(row, col);
        return val != null && String(val).toLowerCase().includes(term);
      }),
    );
  }

  // Active filters
  for (const f of filter.activeFilters) {
    result = result.filter((row) => {
      const col = state.columns.find((c) => c.key === f.key);
      if (!col) return true;
      const val = getCellValue(row, col);
      return applyFilterOperator(val, f.value, f.operator);
    });
  }

  // Update total count
  state.pagination.totalItems = result.length;

  return result;
}

/** Get paginated data slice */
export function getPaginatedData<T>(state: TableState<T>): T[] {
  const filtered = getFilteredData(state);
  const { page, pageSize } = state.pagination;
  const start = (page - 1) * pageSize;
  return filtered.slice(start, start + pageSize);
}

/** Get cell value from a row using column config */
export function getCellValue<T>(row: T, column: Column<T>): unknown {
  if (column.accessor) {
    if (typeof column.accessor === "function") {
      return column.accessor(row);
    }
    return (row as Record<string, unknown>)[column.accessor as string];
  }
  return (row as Record<string, unknown>)[column.key];
}

/** Apply a filter operator */
export function applyFilterOperator(
  cellValue: unknown,
  filterValue: unknown,
  operator: FilterOperator,
): boolean {
  const val = cellValue ?? "";
  const fval = filterValue ?? "";

  switch (operator) {
    case "equals": return val === fval;
    case "notEquals": return val !== fval;
    case "contains":
      return String(val).toLowerCase().includes(String(fval).toLowerCase());
    case "startsWith":
      return String(val).toLowerCase().startsWith(String(fval).toLowerCase());
    case "endsWith":
      return String(val).toLowerCase().endsWith(String(fval).toLowerCase());
    case "gt": return Number(val) > Number(fval);
    case "gte": return Number(val) >= Number(fval);
    case "lt": return Number(val) < Number(fval);
    case "lte": return Number(val) <= Number(fval);
    default: return true;
  }
}

/** Toggle sort on a column */
export function toggleSort<T>(state: TableState<T>, columnKey: string): TableState<T> {
  const current = state.sort;

  if (current.key === columnKey) {
    // Cycle: asc -> desc -> null
    const nextDirection = current.direction === "asc" ? "desc" :
                          current.direction === "desc" ? null : "asc";
    return { ...state, sort: { key: nextDirection ? columnKey : null, direction: nextDirection } };
  }

  return { ...state, sort: { key: columnKey, direction: "asc" } };
}

/** Set search term and reset to page 1 */
export function setSearchTerm<T>(state: TableState<T>, term: string): TableState<T> {
  return {
    ...state,
    filter: { ...state.filter, searchTerm: term },
    pagination: { ...state.pagination, page: 1 },
  };
}

/** Add/remove a filter */
export function toggleFilter<T>(
  state: TableState<T>,
  filter: { key: string; value: unknown; operator: FilterOperator },
): TableState<T> {
  const existing = state.filter.activeFilters.findIndex(
    (f) => f.key === filter.key && f.value === filter.value,
  );

  let newFilters;
  if (existing >= 0) {
    newFilters = state.filter.activeFilters.filter((_, i) => i !== existing);
  } else {
    newFilters = [...state.filter.activeFilters, filter];
  }

  return {
    ...state,
    filter: { ...state.filter, activeFilters: newFilters },
    pagination: { ...state.pagination, page: 1 },
  };
}

/** Go to specific page */
export function goToPage<T>(state: TableState<T>, page: number): TableState<T> {
  const totalPages = Math.ceil(state.pagination.totalItems / state.pagination.pageSize);
  const clampedPage = Math.max(1, Math.min(page, totalPages));
  return { ...state, pagination: { ...state.pagination, page: clampedPage } };
}

/** Change page size */
export function setPageSize<T>(state: TableState<T>, size: number): TableState<T> {
  return {
    ...state,
    pagination: { page: 1, pageSize: size, totalItems: state.pagination.totalItems },
  };
}

/** Toggle row selection */
export function toggleRowSelection<T>(
  state: TableState<T>,
  rowIndex: number | string,
): TableState<T> {
  const newSelected = new Set(state.selection.selected);
  if (newSelected.has(rowIndex)) {
    newSelected.delete(rowIndex);
  } else {
    newSelected.add(rowIndex);
  }
  return { ...state, selection: { ...state.selection, selected: newSelected } };
}

/** Select/deselect all visible rows */
export function toggleSelectAll<T>(state: TableState<T>, visibleIndices: Array<number | string>): TableState<T> {
  if (state.selection.selectAll) {
    return { ...state, selection: { selected: new Set(), selectAll: false } };
  }

  const allSelected = visibleIndices.every((i) => state.selection.selected.has(i));
  if (allSelected) {
    return { ...state, selection: { selected: new Set(), selectAll: false } };
  }

  return {
    ...state,
    selection: { selected: new Set(visibleIndices), selectAll: true },
  };
}

/** Toggle row expansion */
export function toggleRowExpand<T>(
  state: TableState<T>,
  rowIndex: number | string,
): TableState<T> {
  const newExpanded = new Set(state.expandedRows);
  if (newExpanded.has(rowIndex)) {
    newExpanded.delete(rowIndex);
  } else {
    newExpanded.add(rowIndex);
  }
  return { ...state, expandedRows: newExpanded };
}

/** Clear all selections and filters */
export function resetTable<T>(state: TableState<T>): TableState<T> {
  return {
    ...state,
    sort: { key: null, direction: null },
    filter: { searchTerm: "", activeFilters: [] },
    pagination: { ...state.pagination, page: 1, totalItems: state.data.length },
    selection: { selected: new Set(), selectAll: false },
    expandedRows: new Set(),
  };
}

/** Export table data as CSV */
export function exportTableAsCsv<T>(state: TableState<T>, filename = "export.csv"): void {
  const headers = state.columns.map((c) => c.header);
  const rows = getFilteredData(state).map((row) =>
    state.columns.map((col) => {
      const val = getCellValue(row, col);
      const str = val == null ? "" : String(val);
      // Escape quotes and wrap in quotes if contains comma
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }),
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadCsv(csv, filename);
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
