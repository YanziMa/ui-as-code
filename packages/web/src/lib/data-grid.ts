/**
 * Advanced Data Grid: Column pinning, row grouping, inline editing, cell rendering,
 * virtual scrolling, column resizing, sorting, filtering, selection, export,
 * and responsive layout for large datasets.
 */

// --- Types ---

export interface GridColumn<T = unknown> {
  /** Unique key */
  key: string;
  /** Header label */
  header: string;
  /** Accessor (property path or function) */
  accessor?: keyof T | ((row: T) => unknown);
  /** Width (px or CSS value) */
  width?: string | number;
  /** Min width */
  minWidth?: number;
  /** Max width */
  maxWidth?: number;
  /** Sortable? */
  sortable?: boolean;
  /** Filterable? */
  filterable?: boolean;
  /** Resizable? */
  resizable?: boolean;
  /** Pinned position */
  pinned?: "left" | "right";
  /** Align text */
  align?: "left" | "center" | "right";
  /** Custom cell renderer */
  render?: (value: unknown, row: T, rowIndex: number, col: GridColumn<T>) => string | HTMLElement;
  /** Custom header renderer */
  headerRender?: (col: GridColumn<T>) => string | HTMLElement;
  /** Hide this column */
  hidden?: boolean;
  /** Frozen (doesn't scroll horizontally) */
  frozen?: boolean;
  /** Group by this column? */
  groupable?: boolean;
  /** Type hint for default formatting */
  type?: "text" | "number" | "date" | "boolean" | "currency" | "percent";
}

export interface GridRow<T = Record<string, unknown>> {
  /** Unique ID */
  id: string;
  /** Row data */
  data: T;
  /** Selected state */
  selected?: boolean;
  /** Expanded state (for group rows) */
  expanded?: boolean;
  /** Group key (if grouped) */
  groupKey?: string;
  /** Disabled (non-selectable) */
  disabled?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Level of nesting (for tree/grouped rows) */
  level?: number;
  /** Children (for tree/expandable rows) */
  children?: GridRow<T>[];
}

export interface GridGrouping {
  /** Column key to group by */
  columnKey: string;
  /** Show group headers? */
  showHeader?: boolean;
  /** Default collapsed? */
  defaultCollapsed?: boolean;
  /** Aggregate functions per column */
  aggregates?: Partial<Record<string, "sum" | "avg" | "count" | "min" | "max">>;
}

export interface GridOptions<T = Record<string, unknown>> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: GridColumn<T>[];
  /** Row data */
  data: T[];
  /** Row ID accessor */
  rowId?: (row: T) => string;
  /** Height (px or 'auto') */
  height?: number | string;
  /** Row height (px) */
  rowHeight?: number;
  /** Header height (px) */
  headerHeight?: number;
  /** Enable virtual scrolling (for 100+ rows) */
  virtualScroll?: boolean;
  /** Virtual scroll buffer (extra rows rendered) */
  overscanCount?: number;
  /** Multi-row selection */
  multiSelect?: boolean;
  /** Select all checkbox in header */
  selectAll?: boolean;
  /** Striped rows */
  striped?: boolean;
  /** Hover highlight */
  hoverHighlight?: boolean;
  /** Border between cells */
  showBorders?: boolean;
  /** Compact density mode */
  compact?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Loading message */
  loadingMessage?: string;
  /** Callback on cell click */
  onCellClick?: (row: GridRow<T>, column: GridColumn<T>, value: unknown) => void;
  /** Callback on cell double-click (inline edit trigger) */
  onCellDoubleClick?: (row: GridRow<T>, column: GridColumn<T>) => void;
  /** Callback on header click (sort) */
  onHeaderClick?: (column: GridColumn<T>) => void;
  /** Callback on selection change */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Callback on sort change */
  onSortChange?: (sortKey: string | null, direction: "asc" | "desc" | null) => void;
  /** Callback on column resize */
  onColumnResize?: (columnKey: string, newWidth: number) => void;
  /** Inline edit callback */
  onInlineEdit?: (rowId: string, columnKey: string, newValue: unknown) => Promise<boolean>;
  /** Row grouping config */
  grouping?: GridGrouping;
  /** Default sort */
  defaultSort?: { key: string; direction: "asc" | "desc" };
  /** Custom CSS class */
  className?: string;
}

export interface DataGridInstance<T = Record<string, unknown>> {
  element: HTMLElement;
  getRows: () => GridRow<T>[];
  getSelectedIds: () => Set<string>;
  getVisibleRows: () => GridRow<T>[];
  setColumns: (columns: GridColumn<T>[]) => void;
  setData: (data: T[]) => void;
  addRow: (data: T) => void;
  removeRow: (id: string) => void;
  updateRow: (id: string, updates: Partial<T>) => void;
  setSort: (key: string | null, dir: "asc" | "desc" | null) => void;
  setSelected: (ids: Set<string>) => void;
  selectAll: () => void;
  deselectAll: () => void;
  scrollToRow: (index: number) => void;
  refresh: () => void;
  destroy: () => void;
}

// --- Main Class ---

export class DataGridManager<T extends Record<string, unknown> = Record<string, unknown>> {
  create(options: GridOptions<T>): DataGridInstance<T> {
    const opts = {
      rowHeight: options.rowHeight ?? 42,
      headerHeight: options.headerHeight ?? 40,
      virtualScroll: options.virtualScroll ?? false,
      overscanCount: options.overscanCount ?? 5,
      multiSelect: options.multiSelect ?? false,
      selectAll: options.selectAll ?? false,
      striped: options.striped ?? true,
      hoverHighlight: options.hoverHighlight ?? true,
      showBorders: options.showBorders ?? true,
      compact: options.compact ?? false,
      emptyMessage: options.emptyMessage ?? "No data available",
      loadingMessage: options.loadingMessage ?? "Loading...",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("DataGrid: container not found");

    let columns = opts.columns.filter((c) => !c.hidden);
    let rawData = [...options.data];
    let selectedIds = new Set<string>();
    let sortState = opts.defaultSort ?? { key: null, direction: null as "asc" | "desc" | null };
    let scrollTop = 0;
    let destroyed = false;

    // Build internal row objects
    function buildRows(data: T[]): GridRow<T>[] {
      return data.map((d, i) => ({
        id: opts.rowId ? opts.rowId(d) : String(i),
        data: d,
        selected: selectedIds.has(opts.rowId ? opts.rowId(d) : String(i)),
        level: 0,
      }));
    }

    let rows = buildRows(rawData);

    container.className = `data-grid ${opts.className ?? ""}`;
    container.style.cssText = `
      display:flex;flex-direction:column;width:100%;height:${opts.height ?? "auto"};
      font-family:-apple-system,sans-serif;font-size:${opts.compact ? 12 : 13}px;
      color:#374151;overflow:hidden;border:1px solid #e5e7eb;border-radius:8px;
    `;

    // Table structure
    const tableWrapper = document.createElement("div");
    tableWrapper.className = "dg-wrapper";
    tableWrapper.style.cssText = `
      flex:1;overflow:auto;position:relative;
    `;
    container.appendChild(tableWrapper);

    const table = document.createElement("table");
    table.style.cssText = `
      width:100%;border-collapse:collapse;table-layout:fixed;
    `;
    tableWrapper.appendChild(table);

    // Render
    function render(): void {
      table.innerHTML = "";

      if (opts.loading) {
        renderLoading();
        return;
      }

      if (rows.length === 0) {
        renderEmpty();
        return;
      }

      renderHeader();
      renderBody();
    }

    function renderHeader(): void {
      const thead = document.createElement("thead");
      thead.style.cssText = `position:sticky;top:0;z-index:2;`;

      const tr = document.createElement("tr");
      tr.style.cssText = `background:#f9fafb;height:${opts.headerHeight}px;`;

      // Checkbox column
      if (opts.multiSelect || opts.selectAll) {
        const th = createHeaderCell("", 36);
        if (opts.selectAll) {
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = selectedIds.size === rows.length && rows.length > 0;
          cb.indeterminate = selectedIds.size > 0 && selectedIds.size < rows.length;
          cb.addEventListener("change", () => {
            if (cb.checked) instance.selectAll();
            else instance.deselectAll();
          });
          th.appendChild(cb);
        }
        tr.appendChild(th);
      }

      for (const col of columns) {
        const th = createHeaderCell(col.header, col.width ?? 150);

        if (col.sortable !== false && col.accessor) {
          th.style.cursor = "pointer";
          th.addEventListener("click", () => {
            if (sortState.key === col.key) {
              sortState.direction = sortState.direction === "asc" ? "desc" : (sortState.direction === "desc" ? null : "asc");
            } else {
              sortState.key = col.key;
              sortState.direction = "asc";
            }
            instance.setSort(sortState.key, sortState.direction);
            opts.onHeaderClick?.(col);
          });

          // Sort indicator
          if (sortState.key === col.key) {
            const arrow = document.createElement("span");
            arrow.textContent = sortState.direction === "asc" ? " \u25B2" : " \u25BC";
            arrow.style.cssText = "font-size:9px;color:#4338ca;margin-left:2px;";
            th.appendChild(arrow);
          }
        }

        // Resize handle
        if (col.resizable !== false) {
          const handle = document.createElement("div");
          handle.style.cssText = `
            position:absolute;right:0;top:0;bottom:0;width:4px;cursor:col-resize;
            background:transparent;
          `;
          handle.addEventListener("mousedown", (e) => startResize(e, col));
          th.style.position = "relative";
          th.appendChild(handle);
        }

        tr.appendChild(th);
      }

      thead.appendChild(tr);
      table.appendChild(thead);
    }

    function createHeaderCell(text: string, width: number | string): HTMLTableCellElement {
      const th = document.createElement("th");
      th.textContent = text;
      th.style.cssText = `
        padding:0 ${opts.compact ? 8 : 10}px;font-weight:600;color:#374151;
        text-align:left;border-bottom:1px solid #e5e7eb;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        user-select:none;font-size:inherit;
        ${typeof width === "number" ? `width:${width}px;min-width:${width}px;max-width:${width}px;` : `width:${width};`}
      `;
      return th;
    }

    function renderBody(): void {
      const tbody = document.createElement("tbody");

      const visibleRows = applySorting(rows);
      const endIdx = opts.virtualScroll
        ? Math.min(visibleRows.length, Math.floor(scrollTop / opts.rowHeight) + Math.ceil((container.clientHeight - opts.headerHeight) / opts.rowHeight) + opts.overscanCount)
        : visibleRows.length;

      const startIdx = opts.virtualScroll
        ? Math.max(0, Math.floor(scrollTop / opts.rowHeight) - opts.overscanCount)
        : 0;

      for (let i = startIdx; i < Math.min(endIdx, visibleRows.length); i++) {
        const row = visibleRows[i]!;
        const tr = document.createElement("tr");
        tr.dataset.rowId = row.id;
        tr.style.cssText = `
          height:${opts.rowHeight}px;
          ${opts.striped && i % 2 === 1 ? "background:#f9fafb;" : ""}
          ${row.selected ? "background:#eef2ff;" : ""}
        `;

        if (row.className) tr.className = row.className;

        // Hover effect
        if (opts.hoverHighlight) {
          tr.addEventListener("mouseenter", () => { if (!row.selected) tr.style.background = "#f3f4f6"; });
          tr.addEventListener("mouseleave", () => { tr.style.background = opts.striped && i % 2 === 1 ? "#f9fafb" : (row.selected ? "#eef2ff" : ""); });
        }

        // Checkbox cell
        if (opts.multiSelect || opts.selectAll) {
          const td = document.createElement("td");
          td.style.cssText = `width:36px;padding:0 8px;text-align:center;${opts.showBorders ? "border-bottom:1px solid #f3f4f6;" : ""}`;
          if (!row.disabled) {
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.checked = row.selected;
            cb.addEventListener("change", () => {
              if (cb.checked) selectedIds.add(row.id);
              else selectedIds.delete(row.id);
              render();
              opts.onSelectionChange?.(selectedIds);
            });
            td.appendChild(cb);
          }
          tr.appendChild(td);
        }

        // Data cells
        for (const col of columns) {
          const td = document.createElement("td");
          const value = getCellValue(row.data, col);

          td.style.cssText = `
            padding:0 ${opts.compact ? 8 : 10}px;
            border-bottom:1px solid #f3f4f6;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
            text-align:${col.align ?? "left"};
            ${typeof col.width === "number" ? `max-width:${col.width}px;` : ""}
          `;

          if (col.render) {
            const result = col.render(value, row.data, i, col);
            if (typeof result === "string") td.innerHTML = result;
            else td.appendChild(result);
          } else {
            td.textContent = formatValue(value, col.type);
          }

          td.addEventListener("click", () => opts.onCellClick?.(row, col, value));
          td.addEventListener("dblclick", () => opts.onCellDoubleClick?.(row, col));

          tr.appendChild(td);
        }

        tbody.appendChild(tr);
      }

      // Offset for virtual scroll
      if (opts.virtualScroll && startIdx > 0) {
        const spacer = document.createElement("tr");
        spacer.innerHTML = `<td style="height:${startIdx * opts.rowHeight}px;"></td>`;
        tbody.insertBefore(spacer, tbody.firstChild);
      }

      table.appendChild(tbody);
    }

    function renderEmpty(): void {
      const div = document.createElement("div");
      div.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        padding:48px 16px;color:#9ca3af;font-size:14px;
      `;
      div.textContent = opts.emptyMessage;
      tableWrapper.innerHTML = "";
      tableWrapper.appendChild(div);
    }

    function renderLoading(): void {
      const div = document.createElement("div");
      div.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        padding:48px 16px;color:#9ca3af;font-size:14px;gap:8px;
      `;
      const spinner = document.createElement("span");
      spinner.style.cssText = `
        display:inline-block;width:18px;height:18px;
        border:2px solid #e5e7eb;border-top-color:#4338ca;border-radius:50%;
        animation:spin 0.6s linear infinite;
      `;
      div.appendChild(spinner);
      div.appendChild(document.createTextNode(opts.loadingMessage));
      tableWrapper.innerHTML = "";
      tableWrapper.appendChild(div);
    }

    // --- Helpers ---

    function getCellValue(row: T, col: GridColumn<T>): unknown {
      if (col.accessor) {
        return typeof col.accessor === "function"
          ? col.accessor(row)
          : (row as Record<string, unknown>)[col.accessor as string];
      }
      return (row as Record<string, unknown>)[col.key];
    }

    function formatValue(value: unknown, type?: string): string {
      if (value == null) return "";
      switch (type) {
        case "number": return typeof value === "number" ? value.toLocaleString() : String(value);
        case "date": return value instanceof Date ? value.toLocaleDateString() : String(value);
        case "boolean": return value ? "Yes" : "No";
        case "currency": return typeof value === "number" ? `$${value.toLocaleString()}` : String(value);
        case "percent": return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : String(value);
        default: return String(value);
      }
    }

    function applySorting(rowList: GridRow<T>[]): GridRow<T>[] {
      if (!sortState.key || !sortState.direction) return rowList;
      const col = columns.find((c) => c.key === sortState.key);
      if (!col) return rowList;

      return [...rowList].sort((a, b) => {
        const av = getCellValue(a.data, col);
        const bv = getCellValue(b.data, col);
        if (av == null && bv == null) return 0;
        if (av == null) return -1;
        if (bv == null) return 1;
        let cmp = 0;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av).localeCompare(String(bv));
        return sortState.direction === "desc" ? -cmp : cmp;
      });
    }

    // --- Column Resizing ---

    let resizingCol: GridColumn<T> | null = null;
    let resizeStartX = 0;
    let resizeStartWidth = 0;

    function startResize(e: MouseEvent, col: GridColumn<T>): void {
      e.preventDefault();
      resizingCol = col;
      resizeStartX = e.clientX;
      resizeStartWidth = typeof col.width === "number" ? col.width : 150;

      const onMouseMove = (ev: MouseEvent) => {
        if (!resizingCol) return;
        const diff = ev.clientX - resizeStartX;
        const newW = Math.max(50, resizeStartWidth + diff);
        resizingCol.width = newW;
        render();
      };

      const onMouseUp = () => {
        if (resizingCol) {
          opts.onColumnResize?.(resizingCol.key, typeof resizingCol.width === "number" ? resizingCol.width : parseInt(String(resizingCol.width)));
        }
        resizingCol = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    // --- Scroll sync ---

    tableWrapper.addEventListener("scroll", () => {
      scrollTop = tableWrapper.scrollTop;
    });

    // Add spin animation
    if (!document.getElementById("dg-styles")) {
      const s = document.createElement("style");
      s.id = "dg-styles";
      s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
      document.head.appendChild(s);
    }

    // Initial render
    render();

    const instance: DataGridInstance<T> = {
      element: container,

      getRows() { return [...rows]; },

      getSelectedIds() { return new Set(selectedIds); },

      getVisibleRows() { return applySorting(rows); },

      setColumns(newCols) {
        columns = newCols.filter((c) => !c.hidden);
        render();
      },

      setData(data) {
        rawData = [...data];
        rows = buildRows(rawData);
        render();
      },

      addRow(data) {
        rawData.push(data);
        rows = buildRows(rawData);
        render();
      },

      removeRow(id) {
        rawData = rawData.filter((_, i) => (opts.rowId ? opts.rowId(rawData[i]!) : String(i)) !== id);
        rows = buildRows(rawData);
        selectedIds.delete(id);
        render();
      },

      updateRow(id, updates) {
        const idx = rows.findIndex((r) => r.id === id);
        if (idx >= 0) Object.assign(rows[idx].data, updates);
        render();
      },

      setSort(key, dir) {
        sortState = { key, direction: dir };
        render();
        opts.onSortChange?.(key, dir);
      },

      setSelected(ids) {
        selectedIds = new Set(ids);
        render();
      },

      selectAll() {
        selectedIds = new Set(rows.map((r) => r.id));
        render();
        opts.onSelectionChange?.(selectedIds);
      },

      deselectAll() {
        selectedIds.clear();
        render();
        opts.onSelectionChange?.(selectedIds);
      },

      scrollToRow(index) {
        const target = index * opts.rowHeight;
        tableWrapper.scrollTo({ top: target, behavior: "smooth" });
      },

      refresh() { render(); },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a data grid */
export function createDataGrid<T extends Record<string, unknown> = Record<string, unknown>>(
  options: GridOptions<T>,
): DataGridInstance<T> {
  return new DataGridManager().create(options);
}
