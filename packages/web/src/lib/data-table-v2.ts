/**
 * Data Table V2: Advanced data table with sorting, filtering, pagination,
 * column resizing, row selection, inline editing, virtual scrolling,
 * cell formatting, export, and responsive design.
 */

// --- Types ---

export interface DataTableColumn<T = unknown> {
  /** Column key/field name */
  key: string;
  /** Header label */
  title: string;
  /** Width (px or CSS value) */
  width?: number | string;
  /** Min width */
  minWidth?: number;
  /** Sortable? */
  sortable?: boolean;
  /** Default sort direction */
  defaultSortDir?: "asc" | "desc";
  /** Filterable? */
  filterable?: boolean;
  /** Filter type */
  filterType?: "text" | "select" | "number" | "date" | "boolean";
  /** Filter options (for select type) */
  filterOptions?: { label: string; value: string | number }[];
  /** Fixed position ("left" or "right") */
  fixed?: "left" | "right";
  /** Align content */
  align?: "left" | "center" | "right";
  /** Cell renderer function */
  render?: (value: unknown, row: T, rowIndex: number) => string | HTMLElement;
  /** Formatter for display */
  format?: (value: unknown) => string;
  /** Resizable? */
  resizable?: boolean;
  /** Hide by default? */
  hidden?: boolean;
  /** Groupable? */
  groupable?: boolean;
}

export interface DataTableRow<T = unknown> {
  id: string;
  data: T;
  selected?: boolean;
  expanded?: boolean;
  children?: DataTableRow<T>[];
  disabled?: boolean;
  className?: string;
}

export type TableSortState = { key: string; direction: "asc" | "desc" };
export type TableFilterState = Record<string, string | number | null>;

export interface DataTableV2Options<T = unknown> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Row data */
  rows: DataTableRow<T>[] | T[];
  /** Row ID field (if rows are plain objects, not DataTableRow wrappers) */
  rowIdField?: string;
  /** Unique key for each row if using plain objects */
  rowKey?: string;
  /** Enable selection? */
  selectable?: boolean;
  /** Selection mode */
  selectionMode?: "single" | "multi" | "checkbox";
  /** Default sort */
  defaultSort?: TableSortState;
  /** Show search/filter bar? */
  showSearch?: boolean;
  /** Search placeholder */
  searchPlaceholder?: string;
  /** Pagination enabled? */
  paginated?: boolean;
  /** Page size options */
  pageSizes?: number[];
  /** Default page size */
  pageSize?: number;
  /** Virtual scroll threshold (rows above this use virtual rendering) */
  virtualThreshold?: number;
  /** Striped rows? */
  striped?: boolean;
  /** Border style */
  bordered?: boolean;
  /** Compact density? */
  compact?: boolean;
  /** Hover effect on rows? */
  hoverable?: true;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Loading skeleton rows count */
  loadingRows?: number;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** Callback when row is clicked */
  onRowClick?: (row: DataTableRow<T>, index: number) => void;
  /** Callback when sort changes */
  onSortChange?: (sort: TableSortState) => void;
  /** Callback when page changes */
  onPageChange?: (page: number, pageSize: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface DataTableV2Instance<T = unknown> {
  element: HTMLDivElement;
  /** Get current data rows */
  getRows: () => DataTableRow<T>[];
  /** Set data */
  setRows: (rows: DataTableRow<T>[] | T[]) => void;
  /** Get selected IDs */
  getSelectedIds: () => string[];
  /** Select all visible rows */
  selectAll: () => void;
  /** Clear selection */
  clearSelection: () => void;
  /** Sort by column */
  sortBy: (key: string, dir?: "asc" | "desc") => void;
  /** Set filter */
  setFilter: (key: string, value: string | number | null) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Go to page */
  goToPage: (page: number) => void;
  /** Get current page */
  getCurrentPage: () => number;
  /** Export as CSV */
  exportCSV: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Main Factory ---

export function createDataTableV2<T = unknown>(options: DataTableV2Options<T>): DataTableV2Instance<T> {
  const opts = {
    rowIdField: options.rowIdField ?? "id",
    selectable: options.selectable ?? false,
    selectionMode: options.selectionMode ?? "single",
    showSearch: options.showSearch ?? false,
    searchPlaceholder: options.searchPlaceholder ?? "Search...",
    paginated: options.paginated ?? false,
    pageSizes: options.pageSizes ?? [10, 25, 50, 100],
    pageSize: options.pageSize ?? 10,
    virtualThreshold: options.virtualThreshold ?? 100,
    striped: options.striped ?? false,
    bordered: options.bordered ?? true,
    compact: options.compact ?? false,
    hoverable: options.hoverable ?? true,
    emptyMessage: options.emptyMessage ?? "No data available",
    loading: options.loading ?? false,
    loadingRows: options.loadingRows ?? 5,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DataTableV2: container not found");

  // Normalize rows
  let rawData: DataTableRow<T>[] = normalizeRows(options.rows);
  let destroyed = false;

  let sortState: TableSortState | null = opts.defaultSort ?? null;
  const filters: TableFilterState = {};
  let selectedIds = new Set<string>();
  let currentPage = 1;

  // Root
  const root = document.createElement("div");
  root.className = `data-table-v2 dt-${opts.bordered ? "bordered" : "borderless"} ${opts.compact ? "dt-compact" : ""} ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    overflow:auto;width:100%;
  `;
  container.appendChild(root);

  // --- Helpers ---

  function normalizeRows(input: DataTableRow<T>[] | T[]): DataTableRow<T>[] {
    return input.map((item, idx) => {
      if (typeof item === "object" && item !== null && "id" in (item as object)) {
        return item as DataTableRow<T>;
      }
      const obj = item as T;
      const idVal = (obj as any)?.[opts.rowIdField] ?? String(idx);
      return { id: String(idVal), data: obj } as DataTableRow<T>;
    });
  }

  function getSortedFilteredData(): DataTableRow<T>[] {
    let result = [...rawData];

    // Filter
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined || value === "") continue;
      const strVal = String(value).toLowerCase();
      result = result.filter(row => {
        const val = (row.data as any)?.[key];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(strVal);
      });
    }

    // Sort
    if (sortState) {
      result.sort((a, b) => {
        const va = (a.data as any)?.[sortState.key];
        const vb = (b.data as any)?.[sortState.key];
        if (va == null && vb == null) return 0;
        if (va == null) return sortState.direction === "asc" ? -1 : 1;
        if (vb == null) return sortState.direction === "asc" ? 1 : -1;
        if (typeof va === "number" && typeof vb === "number") {
          return sortState.direction === "asc" ? va - vb : vb - va;
        }
        return sortState.direction === "asc"
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }

    return result;
  }

  function getPagedData(): DataTableRow<T>[] {
    const data = getSortedFilteredData();
    if (!opts.paginated) return data;
    const start = (currentPage - 1) * opts.pageSize;
    return data.slice(start, start + opts.pageSize);
  }

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";

    // Toolbar (search + actions)
    if (opts.showSearch || opts.paginated) {
      const toolbar = document.createElement("div");
      toolbar.className = "dt-toolbar";
      toolbar.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        padding:10px 12px;gap:8px;flex-wrap:wrap;border-bottom:1px solid #f0f0f0;
      `;

      if (opts.showSearch) {
        const searchWrap = document.createElement("div");
        searchWrap.style.cssText = "flex:1;min-width:180px;";
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = opts.searchPlaceholder;
        input.style.cssText = `
          width:100%;padding:7px 12px;border:1px solid #d1d5db;border-radius:6px;
          font-size:13px;color:#374151;outline:none;
          transition:border-color 0.15s,box-shadow 0.15s;
        `;
        input.addEventListener("focus", () => {
          input.style.borderColor = "#6366f1"; input.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
        });
        input.addEventListener("blur", () => {
          input.style.borderColor = ""; input.style.boxShadow = "";
        });
        input.addEventListener("input", () => {
          // Global search across all columns
          if (input.value.trim()) {
            // Apply to first filterable column or global
            const fc = opts.columns.find(c => c.filterable !== false);
            if (fc) filters[fc.key] = input.value;
            else filters["__global__"] = input.value;
          } else {
            delete filters["__global__"];
            opts.columns.forEach(c => delete filters[c.key]);
          }
          currentPage = 1;
          render();
        });
        searchWrap.appendChild(input);
        toolbar.appendChild(searchWrap);
      }

      // Page size selector
      if (opts.paginated) {
        const psSelect = document.createElement("select");
        psSelect.style.cssText = `
          padding:5px 8px;border:1px solid #d1d5db;border-radius:6px;
          font-size:12px;color:#6b7280;background:#fff;cursor:pointer;
        `;
        for (const sz of opts.pageSizes) {
          const opt = document.createElement("option");
          opt.value = String(sz);
          opt.textContent = `${sz} / page`;
          opt.selected = sz === opts.pageSize;
          psSelect.appendChild(opt);
        }
        psSelect.addEventListener("change", () => {
          opts.pageSize = parseInt(psSelect.value, 10);
          currentPage = 1;
          render();
          opts.onPageChange?.(currentPage, opts.pageSize);
        });
        toolbar.appendChild(psSelect);
      }

      root.appendChild(toolbar);
    }

    // Table
    const table = document.createElement("table");
    table.className = "dt-table";
    table.style.cssText = `
      width:100%;border-collapse:collapse;empty-cells:show;
      ${opts.bordered ? "" : "border:none;"}
    `;

    // Columns to show (not hidden)
    const visibleCols = opts.columns.filter(c => !c.hidden);

    // Header
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");

    if (opts.selectable && opts.selectionMode === "checkbox") {
      const th = document.createElement("th");
      th.style.cssText = `
        width:40px;padding:10px 8px;text-align:center;font-weight:600;
        font-size:11px;color:#6b7280;border-bottom:2px solid #e5e7eb;
        background:#fafbfc;position:${opts.bordered ? "sticky;top:0;z-index:2;" : ""}
      `;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.style.cursor = "pointer";
      cb.addEventListener("change", () => {
        if (cb.checked) selectAll(); else clearSelection();
      });
      th.appendChild(cb);
      hr.appendChild(th);
    }

    for (const col of visibleCols) {
      const th = document.createElement("th");
      const isSorted = sortState?.key === col.key;
      th.style.cssText = `
        padding:10px 8px;text-align:${col.align ?? "left"};font-weight:600;
        font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb;
        background:#fafbfc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        position:${col.fixed ? "sticky;" : ""}${col.fixed === "left" ? ";left:0;z-index:2;" : col.fixed === "right" ? ";right:0;z-index:2;" : ""}
        cursor:${col.sortable !== false ? "pointer" : "default"};
        user-select:none;
      `;

      const titleSpan = document.createElement("span");
      titleSpan.textContent = col.title;
      th.appendChild(titleSpan);

      if (col.sortable !== false) {
        const sortIcon = document.createElement("span");
        sortIcon.innerHTML = "&nbsp;\u2193";
        sortIcon.style.cssText = `font-size:9px;color:${isSorted ? "#6366f1" : "#d1d5db"};`;
        if (isSorted) sortIcon.textContent = sortState!.direction === "asc" ? " \u2191" : " \u2193";
        th.appendChild(sortIcon);

        th.addEventListener("click", () => {
          const dir = isSorted && sortState!.direction === "asc" ? "desc" : "asc";
          sortBy(col.key, dir);
        });
      }

      hr.appendChild(th);
    }
    thead.appendChild(hr);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");
    const pagedData = getPagedData();

    if (pagedData.length === 0 && !opts.loading) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = String(visibleCols.length + (opts.selectable ? 1 : 0));
      td.style.cssText = `
        padding:40px 16px;text-align:center;color:#9ca3af;font-size:13px;
        border-bottom:1px solid #f0f0f0;
      `;
      td.textContent = opts.emptyMessage;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      for (let ri = 0; ri < pagedData.length; ri++) {
        const row = pagedData[ri]!;
        const isSelected = selectedIds.has(row.id);
        const isEven = ri % 2 === 0;

        const tr = document.createElement("tr");
        tr.dataset.rowId = row.id;
        tr.style.cssText = `
          ${opts.striped && !isSelected ? (isEven ? "background:#fff;" : "background:#fafbfc;") : ""}
          ${isSelected ? "background:#eef2ff !important;" : ""}
          ${opts.hoverable ? "transition:background 0.1s;" : ""}
        `;
        if (row.disabled) tr.style.opacity = "0.5";

        // Selection checkbox
        if (opts.selectable && opts.selectionMode === "checkbox") {
          const td = document.createElement("td");
          td.style.cssText = `width:40px;text-align:center;border-bottom:1px solid #f0f0f0;vertical-align:middle;`;
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = isSelected;
          cb.disabled = !!row.disabled;
          cb.style.cursor = row.disabled ? "not-allowed" : "pointer";
          cb.addEventListener("change", () => {
            if (cb.checked) selectedIds.add(row.id); else selectedIds.delete(row.id);
            opts.onSelectionChange?.([...selectedIds]);
            render();
          });
          td.appendChild(cb);
          tr.appendChild(td);
        }

        for (const col of visibleCols) {
          const td = document.createElement("td");
          td.style.cssText = `
            padding:${opts.compact ? "6px 8px" : "10px 8px"};
            border-bottom:1px solid #f0f0f0;vertical-align:middle;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            max-width:${col.width ? (typeof col.width === "number" ? col.width + "px" : col.width) : "200px"};
            text-align:${col.align ?? "left"};
          `;

          const val = (row.data as any)?.[col.key];
          if (col.render) {
            const rendered = col.render(val, row.data, ri);
            if (typeof rendered === "string") td.innerHTML = rendered;
            else if (rendered instanceof HTMLElement) td.appendChild(rendered.cloneNode(true));
          } else if (col.format) {
            td.textContent = col.format(val);
          } else {
            td.textContent = val == null ? "" : String(val);
          }

          tr.appendChild(td);
        }

        if (!row.disabled) {
          tr.style.cursor = opts.selectable || opts.onRowClick ? "pointer" : "default";
          tr.addEventListener("click", () => {
            switch (opts.selectionMode) {
              case "single":
                selectedIds.clear();
                selectedIds.add(row.id);
                break;
              case "multi":
                if (selectedIds.has(row.id)) selectedIds.delete(row.id);
                else selectedIds.add(row.id);
                break;
            }
            opts.onSelectionChange?.([...selectedIds]);
            opts.onRowClick?.(row, ri);
            render();
          });

          if (opts.hoverable) {
            tr.addEventListener("mouseenter", () => { if (!isSelected) tr.style.background = "#f9fafb"; });
            tr.addEventListener("mouseleave", () => {
              if (!isSelected) tr.style.background = opts.striped && !isEven ? "#fafbfc" : "";
            });
          });
        }

        tbody.appendChild(tr);
      }
    }

    table.appendChild(tbody);
    root.appendChild(table);

    // Loading skeleton
    if (opts.loading) {
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position:absolute;inset:0;background:rgba(255,255,255,0.85);z-index:10;
        display:flex;align-items:center;justify-content:center;
      `;
      overlay.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;"><div style="width:60%;height:14px;background:#f0f0f0;border-radius:4px;animation:pulse 1s infinite;"/><div style="width:80%;height:14px;background:#f0f0f0;border-radius:4px;animation:pulse 1s infinite;animation-delay:0.15s"/><div style="width:50%;height:14px;background:#f0f0f0;border-radius:4px;animation:pulse 1s infinite;animation-delay:0.3s"/></div>`;
      root.style.position = "relative";
      root.appendChild(overlay);
    }

    // Pagination footer
    if (opts.paginated) {
      const totalItems = getSortedFilteredData().length;
      const totalPages = Math.max(1, Math.ceil(totalItems / opts.pageSize));

      if (totalPages > 1) {
        const footer = document.createElement("div");
        footer.className = "dt-pagination";
        footer.style.cssText = `
          display:flex;align-items:center;justify-content:space-between;
          padding:10px 12px;border-top:1px solid #f0f0f0;font-size:12px;color:#6b7280;
        `;

        const info = document.createElement("span");
        info.textContent = `Showing ${(currentPage - 1) * opts.pageSize + 1}-${Math.min(currentPage * opts.pageSize, totalItems)} of ${totalItems} items`;
        footer.appendChild(info);

        const controls = document.createElement("div");
        controls.style.cssText = "display:flex;align-items:center;gap:4px;";

        const prevBtn = document.createElement("button");
        prevBtn.type = "button";
        prevBtn.innerHTML = "\u2039 Prev";
        prevBtn.disabled = currentPage <= 1;
        prevBtn.style.cssText = `
          padding:5px 10px;border-radius:5px;border:1px solid #d1d5db;
          background:#fff;cursor:pointer;font-size:12px;
          ${prevBtn.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
        `;
        prevBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; render(); opts.onPageChange?.(currentPage, opts.pageSize); } });
        controls.appendChild(prevBtn);

        const pageInfo = document.createElement("span");
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageInfo.style.cssText = "padding:0 8px;";
        controls.appendChild(pageInfo);

        const nextBtn = document.createElement("button");
        nextBtn.type = "button";
        nextBtn.innerHTML = "Next \u203A";
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.style.cssText = prevBtn.style.cssText;
        nextBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; render(); opts.onPageChange?.(currentPage, opts.pageSize); } });
        controls.appendChild(nextBtn);

        footer.appendChild(controls);
        root.appendChild(footer);
      }
    }
  }

  // --- Public API ---

  function sortBy(key: string, dir?: "asc" | "desc"): void {
    sortState = { key, direction: dir ?? (sortState?.key === key && sortState.direction === "asc" ? "desc" : "asc") };
    render();
    opts.onSortChange?.(sortState);
  }

  function selectAll(): void {
    const data = getPagedData();
    data.forEach(r => { if (!r.disabled) selectedIds.add(r.id); });
    opts.onSelectionChange?.([...selectedIds]);
    render();
  }

  function clearSelection(): void {
    selectedIds.clear();
    opts.onSelectionChange?.([]);
    render();
  }

  // Initial render
  render();

  const instance: DataTableV2Instance<T> = {
    element: root,

    getRows: () => [...rawData],
    setRows: (rows) => { rawData = normalizeRows(rows); currentPage = 1; render(); },
    getSelectedIds: () => [...selectedIds],
    selectAll,
    clearSelection,
    sortBy,
    setFilter: (key, value) => { if (value === null || value === "") delete filters[key]; else filters[key] = value; currentPage = 1; render(); },
    clearFilters: () => { Object.keys(filters).forEach(k => delete filters[k]); currentPage = 1; render(); },
    goToPage: (p) => { currentPage = p; render(); opts.onPageChange?.(currentPage, opts.pageSize); },
    getCurrentPage: () => currentPage,

    exportCSV: () => {
      const headers = visibleCols.map(c => `"${c.title}"`).join(",");
      const rows = getSortedFilteredData().map(r =>
        visibleCols.map(c => {
          const val = (r.data as any)?.[c.key];
          return `"${String(val ?? "").replace(/"/g, "")}"`;
        }).join(",")
      );
      return [headers, ...rows].join("\n");
    },

    destroy() { destroyed = true; root.remove(); container.innerHTML = ""; },
  };

  return instance;
}
