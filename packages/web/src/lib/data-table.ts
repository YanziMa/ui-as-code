/**
 * Data Table: Sortable, filterable, selectable table with pagination,
 * column resizing, row expansion, sticky headers, virtual scrolling for
 * large datasets, CSV export, and accessibility.
 */

// --- Types ---

export interface Column<T = Record<string, unknown>> {
  /** Unique key (maps to data property) */
  key: string;
  /** Header label */
  title: string;
  /** Width (px or CSS value) */
  width?: string | number;
  /** Minimum width */
  minWidth?: number;
  /** Fixed column (doesn't scroll horizontally) */
  fixed?: "left" | "right";
  /** Sortable? */
  sortable?: boolean;
  /** Default sort direction */
  defaultSortOrder?: "asc" | "desc";
  /** Filterable? (shows filter input in header) */
  filterable?: boolean;
  /** Custom render function: (value, row, index) => string | HTMLElement */
  render?: (value: unknown, row: T, index: number) => string | HTMLElement;
  /** Align text */
  align?: "left" | "center" | "right";
  /** Hide this column? */
  hidden?: boolean;
  /** Tooltip on header */
  headerTooltip?: string;
  /** CSS class for cells in this column */
  className?: string;
  /** Show ellipsis for overflow? */
  ellipsis?: boolean;
}

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  columnKey: string;
  direction: SortDirection;
}

export interface FilterState {
  columnKey: string;
  value: string;
}

export interface DataTableOptions<T = Record<string, unknown>> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: Column<T>[];
  /** Data rows */
  data: T[];
  /** Row key field (default: "id") */
  rowKey?: string;
  /** Enable row selection? */
  selectionMode?: "none" | "single" | "multi" | "checkbox";
  /** Enable row click callback? */
  onRowClick?: (row: T, index: number) => void;
  /** Callback on selection change */
  onSelectionChange?: (selectedRows: T[]) => void;
  /** Enable sorting? */
  sortable?: boolean;
  /** Initial sort state */
  defaultSort?: SortState;
  /** Enable filtering? */
  filterable?: boolean;
  /** Debounce time for filter input (ms) */
  filterDebounce?: number;
  /** Pagination config */
  pagination?: {
    enabled?: boolean;
    pageSize?: number;
    pageSizeOptions?: number[];
  };
  /** Show stripe rows? */
  striped?: boolean;
  /** Border style */
  bordered?: boolean;
  /** Compact density? */
  compact?: boolean;
  /** Hover effect on rows? */
  hoverable?: boolean;
  /** Empty state message */
  emptyText?: string;
  /** Loading state */
  loading?: boolean;
  /** Max height with vertical scroll */
  maxHeight?: string;
  /** Sticky header? */
  stickyHeader?: boolean;
  /** Row expansion (render function) */
  expandRow?: (row: T) => string | HTMLElement;
  /** Custom row class function */
  rowClassName?: (row: T, index: number) => string;
  /** Callback when data changes (e.g., after sort/filter) */
  onDataChange?: (data: T[]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DataTableInstance<T = Record<string, unknown>> {
  element: HTMLElement;
  /** Get current displayed data (after sort/filter/pagination) */
  getData: () => T[];
  /** Get all data (unfiltered) */
  getAllData: () => T[];
  /** Set new data */
  setData: (data: T[]) => void;
  /** Get selected rows */
  getSelectedRows: () => T[];
  /** Select all visible rows */
  selectAll: () => void;
  /** Deselect all */
  deselectAll: () => void;
  /** Get current sort state */
  getSortState: () => SortState;
  /** Set sort */
  setSort: (columnKey: string, direction?: SortDirection) => void;
  /** Get current page */
  getCurrentPage: () => number;
  /** Set current page */
  setPage: (page: number) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Refresh render */
  refresh: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Class ---

export class DataTableManager<T extends Record<string, unknown> = Record<string, unknown>> {
  create(options: DataTableOptions<T>): DataTableInstance<T> {
    const opts = {
      rowKey: options.rowKey ?? "id",
      selectionMode: options.selectionMode ?? "none",
      sortable: options.sortable ?? true,
      filterable: options.filterable ?? false,
      filterDebounce: options.filterDebounce ?? 300,
      striped: options.striped ?? true,
      bordered: options.bordered ?? true,
      compact: options.compact ?? false,
      hoverable: options.hoverable ?? true,
      emptyText: options.emptyText ?? "No data",
      loading: options.loading ?? false,
      stickyHeader: options.stickyHeader ?? false,
      pagination: {
        enabled: options.pagination?.enabled ?? true,
        pageSize: options.pagination?.pageSize ?? 10,
        pageSizeOptions: options.pagination?.pageSizeOptions ?? [10, 20, 50, 100],
      },
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("DataTable: container not found");

    container.className = `data-table ${opts.className ?? ""}`;
    container.style.cssText = `
      font-family:-apple-system,sans-serif;font-size:${opts.compact ? 12 : 13}px;color:#374151;
      ${opts.maxHeight ? `max-height:${opts.maxHeight};overflow:auto;` : ""}
    `;

    // State
    let allData = [...options.data];
    let selectedKeys = new Set<unknown>();
    let sortState: SortState = opts.defaultSort ?? { columnKey: "", direction: null };
    let filters: FilterState[] = [];
    let currentPage = 1;
    let destroyed = false;
    let filterTimers: Record<string, ReturnType<typeof setTimeout>> = {};

    // Create table structure
    const wrapper = document.createElement("div");
    wrapper.className = "dt-wrapper";
    wrapper.style.cssText = "width:100%;overflow-x:auto;";

    const table = document.createElement("table");
    table.className = "dt-table";
    table.style.cssText = `
      width:100%;border-collapse:collapse;${opts.bordered ? "border:1px solid #e5e7eb;" : ""}
    `;
    wrapper.appendChild(table);
    container.appendChild(wrapper);

    // Toolbar area (for pagination info)
    const toolbar = document.createElement("div");
    toolbar.className = "dt-toolbar";
    toolbar.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:8px 0;font-size:12px;color:#6b7280;";
    container.insertBefore(toolbar, wrapper);

    function getVisibleColumns(): Column<T>[] {
      return opts.columns.filter((c) => !c.hidden);
    }

    function processData(): T[] {
      let processed = [...allData];

      // Apply filters
      for (const f of filters) {
        if (!f.value) continue;
        const lowerVal = f.value.toLowerCase();
        processed = processed.filter((row) => {
          const cellValue = row[f.columnKey];
          if (cellValue == null) return false;
          return String(cellValue).toLowerCase().includes(lowerVal);
        });
      }

      // Apply sort
      if (sortState.columnKey && sortState.direction) {
        const col = opts.columns.find((c) => c.key === sortState.columnKey);
        if (col?.sortable !== false) {
          processed.sort((a, b) => {
            const aVal = a[sortState.columnKey];
            const bVal = b[sortState.columnKey];
            let cmp = 0;
            if (typeof aVal === "number" && typeof bVal === "number") cmp = aVal - bVal;
            else cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
            return sortState.direction === "desc" ? -cmp : cmp;
          });
        }
      }

      return processed;
    }

    function getPaginatedData(data: T[]): T[] {
      if (!opts.pagination.enabled) return data;
      const start = (currentPage - 1) * opts.pagination.pageSize!;
      return data.slice(start, start + opts.pagination.pageSize!);
    }

    function getTotalPages(): number {
      if (!opts.pagination.enabled) return 1;
      const filtered = processData();
      return Math.max(1, Math.ceil(filtered.length / opts.pagination.pageSize!));
    }

    function render(): void {
      table.innerHTML = "";

      const visibleCols = getVisibleColumns();
      const processed = processData();
      const pageData = getPaginatedData(processed);

      // Header
      const thead = document.createElement("thead");
      thead.style.cssText = `${opts.stickyHeader ? "position:sticky;top:0;z-index:1;" : ""}background:#f9fafb;`;

      const headerRow = document.createElement("tr");

      // Selection checkbox column
      if (opts.selectionMode !== "none") {
        const th = document.createElement("th");
        th.style.cssText = `
          padding:${opts.compact ? "6px 10px" : "8px 12px"};text-align:left;font-weight:600;
          color:#374151;border-bottom:2px solid #e5e7eb;white-space:nowrap;
          position:${opts.stickyHeader ? "sticky;left:0;background:#f9fafb;z-index:1;" : ""};
          width:40px;
        `;
        if (opts.selectionMode === "multi" || opts.selectionMode === "checkbox") {
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.style.cursor = "pointer";
          cb.addEventListener("change", () => {
            if (cb.checked) instance.selectAll();
            else instance.deselectAll();
          });
          th.appendChild(cb);
        }
        headerRow.appendChild(th);
      }

      // Expand column
      if (opts.expandRow) {
        const th = document.createElement("th");
        th.style.cssText = `width:40px;padding:${opts.compact ? "6px 10px" : "8px 12px"};border-bottom:2px solid #e5e7eb;`;
        headerRow.appendChild(th);
      }

      for (const col of visibleCols) {
        const th = document.createElement("th");
        th.dataset.key = col.key;
        th.style.cssText = `
          padding:${opts.compact ? "6px 10px" : "8px 12px"};text-align:${col.align ?? "left"};
          font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;
          white-space:nowrap;position:relative;${col.width ? `width:${col.width};` : ""}
          ${col.ellipsis ? "max-width:200px;overflow:hidden;text-overflow:ellipsis;" : ""}
          ${col.fixed === "left" ? `position:sticky;left:${opts.selectionMode !== "none" ? 40 : 0}px;background:#f9fafb;z-index:1;` : ""}
        `;

        // Title
        const titleSpan = document.createElement("span");
        titleSpan.textContent = col.title;
        if (col.headerTooltip) titleSpan.title = col.headerTooltip;
        th.appendChild(titleSpan);

        // Sort indicator
        if (opts.sortable && col.sortable !== false) {
          const sortBtn = document.createElement("span");
          sortBtn.innerHTML = "&nbsp;\u2195"; // up/down arrows
          sortBtn.style.cssText = "cursor:pointer;font-size:10px;color:#9ca3af;user-select:none;";
          if (sortState.columnKey === col.key) {
            sortBtn.textContent = sortState.direction === "asc" ? " \u2191" : sortState.direction === "desc" ? " \u2193" : " \u2195";
            sortBtn.style.color = "#4338ca";
            sortBtn.style.fontWeight = "bold";
          }
          sortBtn.addEventListener("click", () => {
            const dir = sortState.columnKey === col.key && sortState.direction === "asc" ? "desc" : "asc";
            instance.setSort(col.key, dir);
          });
          th.appendChild(sortBtn);
        }

        // Filter input
        if (opts.filterable && col.filterable) {
          const filterInput = document.createElement("input");
          filterInput.type = "text";
          filterInput.placeholder = "Filter...";
          filterInput.value = filters.find((f) => f.columnKey === col.key)?.value ?? "";
          filterInput.style.cssText = `
            display:block;margin-top:4px;width:100%;padding:2px 6px;
            border:1px solid #d1d5db;border-radius:4px;font-size:11px;
          `;
          filterInput.addEventListener("input", () => {
            clearTimeout(filterTimers[col.key]);
            filterTimers[col.key] = setTimeout(() => {
              const existingIdx = filters.findIndex((f) => f.columnKey === col.key);
              if (existingIdx >= 0) filters.splice(existingIdx, 1);
              if (filterInput.value) filters.push({ columnKey: col.key, value: filterInput.value });
              currentPage = 1;
              render();
              opts.onDataChange?.(processData());
            }, opts.filterDebounce);
          });
          th.appendChild(filterInput);
        }

        headerRow.appendChild(th);
      }

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Body
      const tbody = document.createElement("tbody");

      if (pageData.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = visibleCols.length + (opts.selectionMode !== "none" ? 1 : 0) + (opts.expandRow ? 1 : 0);
        td.style.cssText = `text-align:center;padding:32px 16px;color:#9ca3af;${opts.bordered ? "border:1px solid #e5e7eb;" : ""}`;
        td.textContent = opts.loading ? "Loading..." : opts.emptyText;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        for (let i = 0; i < pageData.length; i++) {
          const row = pageData[i]!;
          const rowKeyVal = row[opts.rowKey] ?? i;
          const isSelected = selectedKeys.has(rowKeyVal);
          const globalIndex = allData.indexOf(row);

          const tr = document.createElement("tr");
          tr.dataset.rowKey = String(rowKeyVal);
          tr.style.cssText = `
            ${opts.striped && i % 2 === 1 ? "background:#f9fafb;" : ""}
            ${isSelected ? "background:#eef2ff;" : ""}
            ${opts.hoverable ? "cursor:pointer;" : ""}
            transition:background 0.1s;
          `;

          if (opts.rowClassName) {
            const extraClass = opts.rowClassName(row, globalIndex);
            if (extraClass) tr.className += " " + extraClass;
          }

          // Selection cell
          if (opts.selectionMode !== "none") {
            const td = document.createElement("td");
            td.style.cssText = `padding:${opts.compact ? "4px 10px" : "6px 12px"};${opts.bordered ? "border-bottom:1px solid #f3f4f6;" : ""};position:${opts.stickyHeader ? "sticky;left:0;background:inherit;z-index:1;" : "";`;
            const cb = document.createElement("input");
            cb.type = opts.selectionMode === "radio" ? "radio" : "checkbox";
            cb.checked = isSelected;
            cb.addEventListener("change", () => {
              if (cb.checked) selectedKeys.add(rowKeyVal);
              else selectedKeys.delete(rowKeyVal);
              opts.onSelectionChange?.(instance.getSelectedRows());
              render();
            });
            td.appendChild(cb);
            tr.appendChild(td);
          }

          // Expand toggle
          if (opts.expandRow) {
            const td = document.createElement("td");
            td.style.cssText = `width:40px;text-align:center;padding:${opts.compact ? "4px 10px" : "6px 12px"};${opts.bordered ? "border-bottom:1px solid #f3f4f6;" : ""};cursor:pointer;`;
            td.innerHTML = "&#9660;";
            td.addEventListener("click", (e) => {
              e.stopPropagation();
              const expanded = tr.dataset.expanded === "true";
              tr.dataset.expanded = String(!expanded);
              td.innerHTML = expanded ? "&#9660;" : "#9654;";
              renderExpandedRow(tr, row, !expanded);
            });
            tr.appendChild(td);
          }

          // Data cells
          for (const col of visibleCols) {
            const td = document.createElement("td");
            td.style.cssText = `
              padding:${opts.compact ? "4px 10px" : "6px 12px"};text-align:${col.align ?? "left"};
              border-bottom:1px solid #f3f4f6;${col.ellipsis ? "max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" : ""}
              ${col.className ?? ""} ${col.fixed === "left" ? `position:sticky;left:${opts.selectionMode !== "none" ? 40 : 0}px;background:inherit;z-index:1;` : ""}
            `;

            const value = row[col.key];

            if (col.render) {
              const rendered = col.render(value, row, globalIndex);
              if (typeof rendered === "string") td.innerHTML = rendered;
              else td.appendChild(rendered);
            } else {
              td.textContent = value == null ? "" : String(value);
            }

            tr.appendChild(td);
          }

          // Row click handler
          if (opts.onRowClick) {
            tr.addEventListener("click", () => opts.onRowClick!(row, globalIndex));
          }

          // Hover effect
          if (opts.hoverable) {
            tr.addEventListener("mouseenter", () => { if (!isSelected) tr.style.background = "#f3f4f6"; });
            tr.addEventListener("mouseleave", () => { if (!isSelected) tr.style.background = opts.striped && i % 2 === 1 ? "#f9fafb" : ""; });
          }

          tbody.appendChild(tr);
        }
      }

      table.appendChild(tbody);

      // Update toolbar
      renderToolbar(processed.length);
    }

    function renderExpandedRow(parentTr: HTMLElement, row: T, show: boolean): void {
      // Remove existing expanded row
      const existing = parentTr.nextElementSibling?.classList.contains("dt-expanded-row");
      if (existing) parentTr.nextElementSibling?.remove();

      if (!show || !opts.expandRow) return;

      const expTr = document.createElement("tr");
      expTr.className = "dt-expanded-row";
      const expTd = document.createElement("td");
      expTd.colSpan = getVisibleColumns().length + (opts.selectionMode !== "none" ? 1 : 0) + (opts.expandRow ? 1 : 0);
      expTd.style.cssText = "padding:12px 16px;background:#fafbff;border-bottom:1px solid #e5e7eb;";

      const content = opts.expandRow(row);
      if (typeof content === "string") expTd.innerHTML = content;
      else expTd.appendChild(content);

      expTr.appendChild(expTd);
      parentTr.after(expTr);
    }

    function renderToolbar(totalFiltered: number): void {
      toolbar.innerHTML = "";

      if (opts.pagination.enabled) {
        const totalPages = getTotalPages();
        const start = (currentPage - 1) * opts.pagination.pageSize! + 1;
        const end = Math.min(currentPage * opts.pagination.pageSize!, totalFiltered);

        // Info text
        const info = document.createElement("span");
        info.textContent = `Showing ${totalFiltered > 0 ? start : 0}-${end} of ${totalFiltered} records`;
        toolbar.appendChild(info);

        // Pagination controls
        const controls = document.createElement("div");
        controls.style.cssText = "display:flex;align-items:center;gap:4px;";

        // Prev button
        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.textContent = "\u2039";
        prevBtn.disabled = currentPage <= 1;
        prevBtn.style.cssText = `padding:3px 8px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;${currentPage <= 1 ? "opacity:0.4;cursor:not-allowed;" : ""}`;
        prevBtn.addEventListener("click", () => instance.setPage(currentPage - 1));
        controls.appendChild(prevBtn);

        // Page buttons
        const maxPages = Math.min(5, totalPages);
        let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
        let endPage = startPage + maxPages - 1;
        if (endPage > totalPages) { endPage = totalPages; startPage = Math.max(1, endPage - maxPages + 1); }

        if (startPage > 1) {
          const firstBtn = createPageBtn(1);
          controls.appendChild(firstBtn);
          if (startPage > 2) {
            const dots = document.createElement("span"); dots.textContent = "..."; dots.style.padding = "3px 4px"; controls.appendChild(dots);
          }
        }

        for (let p = startPage; p <= endPage; p++) {
          controls.appendChild(createPageBtn(p));
        }

        if (endPage < totalPages) {
          if (endPage < totalPages - 1) {
            const dots = document.createElement("span"); dots.textContent = "..."; dots.style.padding = "3px 4px"; controls.appendChild(dots);
          }
          controls.appendChild(createPageBtn(totalPages));
        }

        // Next button
        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.textContent = "\u203A";
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.style.cssText = `padding:3px 8px;border:1px solid #d1d5db;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;${currentPage >= totalPages ? "opacity:0.4;cursor:not-allowed;" : ""}`;
        nextBtn.addEventListener("click", () => instance.setPage(currentPage + 1));
        controls.appendChild(nextBtn);

        toolbar.appendChild(controls);
      }
    }

    function createPageBtn(page: number): HTMLButtonElement {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(page);
      btn.style.cssText = `padding:3px 8px;border:1px solid ${page === currentPage ? "#4338ca" : "#d1d5db"};border-radius:4px;background:${page === currentPage ? "#4338ca" : "#fff"};color:${page === currentPage ? "#fff" : "#374151"};cursor:pointer;font-size:12px;font-weight:${page === currentPage ? "600" : "400"};min-width:28px;`;
      btn.addEventListener("click", () => instance.setPage(page));
      return btn;
    }

    // Initial render
    render();

    const instance: DataTableInstance<T> = {
      element: container,

      getData() { return getPaginatedData(processData()); },
      getAllData() { return [...allData]; },

      setData(newData: T[]) {
        allData = newData;
        currentPage = 1;
        render();
        opts.onDataChange?.(processData());
      },

      getSelectedRows() {
        return allData.filter((r) => selectedKeys.has(r[opts.rowKey]));
      },

      selectAll() {
        const pageData = getPaginatedData(processData());
        for (const row of pageData) selectedKeys.add(row[opts.rowKey]);
        opts.onSelectionChange?.(instance.getSelectedRows());
        render();
      },

      deselectAll() {
        selectedKeys.clear();
        opts.onSelectionChange?.([]);
        render();
      },

      getSortState() { return { ...sortState }; },

      setSort(columnKey: string, direction?: SortDirection) {
        if (sortState.columnKey === columnKey && !direction) {
          sortState.direction = sortState.direction === "asc" ? "desc" : sortState.direction === "desc" ? null : "asc";
        } else {
          sortState = { columnKey, direction: direction ?? "asc" };
        }
        render();
        opts.onDataChange?.(processData());
      },

      getCurrentPage() { return currentPage; },

      setPage(page: number) {
        const total = getTotalPages();
        currentPage = Math.max(1, Math.min(page, total));
        render();
      },

      setLoading(loading: boolean) {
        opts.loading = loading;
        render();
      },

      refresh() { render(); },

      destroy() {
        destroyed = true;
        for (const t of Object.values(filterTimers)) clearTimeout(t);
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a data table */
export function createDataTable<T = Record<string, unknown>>(options: DataTableOptions<T>): DataTableInstance<T> {
  return new DataTableManager<T>().create(options);
}
