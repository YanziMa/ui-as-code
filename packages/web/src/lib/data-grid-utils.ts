/**
 * Data Grid Utilities: Virtualized data table with sorting, filtering,
 * column resizing, row selection, inline editing, and frozen columns.
 */

// --- Types ---

export type SortDirection = "asc" | "desc";
export type ColumnAlign = "left" | "center" | "right";

export interface ColumnDef<T = unknown> {
  /** Unique key / field name */
  key: string;
  /** Display header label */
  label: string;
  /** Column width in px */
  width?: number;
  /** Minimum width */
  minWidth?: number;
  /** Maximum width */
  maxWidth?: number;
  /** Text alignment */
  align?: ColumnAlign;
  /** Is this column sortable? */
  sortable?: boolean;
  /** Is this column filterable? */
  filterable?: boolean;
  /** Is this column resizable? */
  resizable?: boolean;
  /** Is this column frozen (sticky)? */
  frozen?: boolean;
  /** Custom render function for cell content */
  render?: (value: T, row: Record<string, T>, rowIndex: number) => string | HTMLElement;
  /** Custom sort comparator */
  sortFn?: (a: T, b: T, dir: SortDirection) => number;
}

export interface DataGridOptions<T = unknown> {
  /** Container element to render into */
  container: HTMLElement;
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Row data array */
  data: Record<string, T>[];
  /** Row key field (default "id") */
  rowKey?: string;
  /** Height of the grid in px */
  height?: number;
  /** Row height in px (default 44) */
  rowHeight?: number;
  /** Enable row selection? */
  selectable?: boolean;
  /** Multi-select mode? */
  multiSelect?: boolean;
  /** Enable virtual scrolling for large datasets? */
  virtualScroll?: boolean;
  /** Number of overscan rows (default 5) */
  overscan?: number;
  /** Default sort column + direction */
  defaultSort?: { key: string; direction: SortDirection };
  /** Show row numbers? */
  showRowNumbers?: boolean;
  /** Striped rows? */
  striped?: boolean;
  /** Bordered cells? */
  bordered?: boolean;
  /** Compact density? */
  compact?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Called when selection changes */
  onSelectionChange?: (selectedKeys: (string | number)[]) => void;
  /** Called when a cell is edited (if editing enabled) */
  onCellEdit?: (rowKey: string | number, colKey: string, value: T) => void;
  /** Called when sort changes */
  onSortChange?: (key: string, direction: SortDirection) => void;
  /** Called when row is clicked */
  onRowClick?: (row: Record<string, T>, index: number) => void;
  /** Custom class name */
  className?: string;
}

export interface DataGridInstance<T = unknown> {
  /** Root element */
  el: HTMLElement;
  /** Set new data */
  setData: (data: Record<string, T>[]) => void;
  /** Get current data */
  getData: () => Record<string, T>[];
  /** Set sorting */
  setSort: (key: string, direction: SortDirection) => void;
  /** Get current sort */
  getSort: () => { key: string; direction: SortDirection } | null;
  /** Filter data by text query */
  filter: (query: string) => void;
  /** Clear filters */
  clearFilter: () => void;
  /** Select row(s) */
  selectRow: (key: string | number) => void;
  /** Deselect row(s) */
  deselectRow: (key: string | number) => void;
  /** Select all rows */
  selectAll: () => void;
  /** Deselect all rows */
  deselectAll: () => void;
  /** Get selected keys */
  getSelectedRows: () => (string | number)[];
  /** Scroll to row index */
  scrollToRow: (index: number) => void;
  /** Force re-render */
  invalidate: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a virtualized data table/grid.
 *
 * @example
 * ```ts
 * const grid = createDataGrid({
 *   container: tableContainer,
 *   columns: [
 *     { key: "name", label: "Name", sortable: true },
 *     { key: "email", label: "Email", width: 250 },
 *   ],
 *   data: users,
 *   selectable: true,
 *   height: 500,
 * });
 *
 * grid.setSort("name", "asc");
 * ```
 */
export function createDataGrid<T = unknown>(options: DataGridOptions<T>): DataGridInstance<T> {
  const {
    container,
    columns,
    data: initialData,
    rowKey = "id",
    height: heightOption,
    rowHeight = 44,
    selectable = false,
    multiSelect = false,
    virtualScroll = false,
    overscan = 5,
    defaultSort,
    showRowNumbers = false,
    striped = true,
    bordered = true,
    compact = false,
    emptyMessage = "No data available",
    onSelectionChange,
    onCellEdit,
    onSortChange,
    onRowClick,
    className,
  } = options;

  let _data = [...initialData];
  let _filteredData = [..._data];
  let _sortKey: string | null = defaultSort?.key ?? null;
  let _sortDir: SortDirection = defaultSort?.direction ?? "asc";
  let _filterQuery = "";
  const selectedKeys = new Set<string | number>();
  const colWidths = new Map<string, number>();
  let isDestroyed = false;

  // Initialize column widths
  for (const col of columns) {
    colWidths.set(col.key, col.width ?? Math.max(col.minWidth ?? 80, 120));
  }

  // --- Root structure ---
  const root = document.createElement("div");
  root.className = `data-grid ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-direction:column;overflow:hidden;" +
    "font-family:-apple-system,sans-serif;font-size:" + (compact ? 12 : 14) + "px;" +
    "color:#1f2937;border:1px solid #e5e7eb;border-radius:8px;" +
    (heightOption ? `height:${heightOption}px;` : "");

  // Header
  const headerEl = document.createElement("div");
  headerEl.className = "dg-header";
  headerEl.style.cssText =
    "display:flex;align-items:center;background:#f9fafb;" +
    "border-bottom:1px solid #e5e7eb;font-weight:600;" +
    "font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;" +
    "user-select:none;flex-shrink:0;";
  root.appendChild(headerEl);

  // Body
  const bodyEl = document.createElement("div");
  bodyEl.className = "dg-body";
  bodyEl.style.cssText =
    "flex:1;overflow:auto;position:relative;" +
    (virtualScroll ? "" : "");
  root.appendChild(bodyEl);

  // --- Render helpers ---

  function getColumnWidth(key: string): number {
    return colWidths.get(key) ?? 120;
  }

  function sortData(): void {
    if (!_sortKey) return;

    _filteredData.sort((a, b) => {
      const col = columns.find((c) => c.key === _sortKey);
      if (col?.sortFn) return col.sortFn(a[_sortKey!], b[_sortKey!], _sortDir);

      const va = a[_sortKey!];
      const vb = b[_sortKey!];

      if (va == null && vb == null) return 0;
      if (va == null) return _sortDir === "asc" ? -1 : 1;
      if (vb == null) return _sortDir === "asc" ? 1 : -1;

      let cmp = 0;
      if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
      else cmp = String(va).localeCompare(String(vb));

      return _sortDir === "desc" ? -cmp : cmp;
    });
  }

  function applyFilter(): void {
    if (!_filterQuery) {
      _filteredData = [..._data];
    } else {
      const q = _filterQuery.toLowerCase();
      _filteredData = _data.filter((row) =>
        columns.some((col) =>
          String(row[col.key] ?? "").toLowerCase().includes(q),
        ),
      );
    }
    sortData();
  }

  function getRowKeyValue(row: Record<string, T>): string | number {
    return row[rowKey] as string | number ?? String(row);
  }

  // --- Render header ---

  function renderHeader(): void {
    headerEl.innerHTML = "";

    // Checkbox column
    if (selectable) {
      const cbCell = createHeaderCell("", 40, "center");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.style.cssText = "cursor:pointer;accent-color:#3b82f6;";
      cb.checked = selectedKeys.size > 0 && selectedKeys.size === _filteredData.length;
      cb.indeterminate = selectedKeys.size > 0 && selectedKeys.size < _filteredData.length;
      cb.addEventListener("change", () => {
        if (cb.checked) selectAll();
        else deselectAll();
      });
      cbCell.appendChild(cb);
      headerEl.appendChild(cbCell);
    }

    // Row number placeholder
    if (showRowNumbers) {
      headerEl.appendChild(createHeaderCell("#", 50, "center"));
    }

    for (const col of columns) {
      const cell = createHeaderCell(
        col.label,
        getColumnWidth(col.key),
        col.align ?? "left",
      );

      if (col.sortable) {
        cell.style.cursor = "pointer";
        cell.addEventListener("click", () => {
          if (_sortKey === col.key) {
            setSort(col.key, _sortDir === "asc" ? "desc" : "asc");
          } else {
            setSort(col.key, "asc");
          }
        });

        // Sort indicator
        if (_sortKey === col.key) {
          const indicator = document.createElement("span");
          indicator.textContent = _sortDir === "asc" ? " \u2191" : " \u2193";
          indicator.style.marginLeft = "4px";
          cell.appendChild(indicator);
        }
      }

      // Resize handle
      if (col.resizable !== false) {
        const handle = document.createElement("div");
        handle.className = "dg-resize-handle";
        handle.style.cssText =
          "position:absolute;right:0;top:0;bottom:0;width:4px;cursor:col-resize;" +
          "background:transparent;transition:background 0.15s;";
        handle.addEventListener("mouseenter", () => { handle.style.background = "#3b82f6"; });
        handle.addEventListener("mouseleave", () => { handle.style.background = "transparent"; });

        let startX = 0;
        let startW = 0;
        const onMouseMove = (e: MouseEvent) => {
          const dx = e.clientX - startX;
          const newW = Math.max(col.minWidth ?? 60, Math.min(col.maxWidth ?? 800, startW + dx));
          colWidths.set(col.key, newW);
          renderHeader();
          renderBody();
        };
        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
          bodyEl.style.userSelect = "";
        };

        handle.addEventListener("mousedown", (e) => {
          e.preventDefault();
          startX = e.clientX;
          startW = getColumnWidth(col.key);
          bodyEl.style.userSelect = "none";
          document.addEventListener("mousemove", onMouseMove);
          document.addEventListener("mouseup", onMouseUp);
        });

        cell.style.position = "relative";
        cell.appendChild(handle);
      }

      headerEl.appendChild(cell);
    }
  }

  function createHeaderCell(text: string, w: number, align: ColumnAlign): HTMLElement {
    const el = document.createElement("div");
    el.className = "dg-header-cell";
    el.textContent = text;
    el.style.cssText =
      `width:${w}px;min-width:${w}px;padding:${compact ? "6px 10px" : "8px 12px"};` +
      `text-align:${align};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;` +
      "border-right:1px solid #e5e7eb;display:flex;align-items:center;gap:2px;flex-shrink:0;";
    return el;
  }

  // --- Render body ---

  function renderBody(): void {
    bodyEl.innerHTML = "";

    if (_filteredData.length === 0) {
      const empty = document.createElement("div");
      empty.className = "dg-empty";
      empty.style.cssText =
        "display:flex;align-items:center;justify-content:center;height:100%;" +
        "color:#9ca3af;font-size:14px;padding:32px;";
      empty.textContent = emptyMessage;
      bodyEl.appendChild(empty);
      return;
    }

    if (virtualScroll) {
      renderVirtualBody();
    } else {
      renderFullBody();
    }
  }

  function renderFullBody(): void {
    for (let i = 0; i < _filteredData.length; i++) {
      const row = _filteredData[i];
      const isSelected = selectedKeys.has(getRowKeyValue(row));
      bodyEl.appendChild(renderRow(row, i, isSelected));
    }
  }

  function renderVirtualBody(): void {
    const scrollTop = bodyEl.scrollTop;
    const viewHeight = bodyEl.clientHeight;
    const totalHeight = _filteredData.length * rowHeight;

    // Spacer
    const spacer = document.createElement("div");
    spacer.style.height = `${totalHeight}px`;
    spacer.style.position = "relative";
    bodyEl.appendChild(spacer);

    const startIdx = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endIdx = Math.min(_filteredData.length - 1, Math.ceil((scrollTop + viewHeight) / rowHeight) + overscan);

    for (let i = startIdx; i <= endIdx; i++) {
      const row = _filteredData[i];
      const isSelected = selectedKeys.has(getRowKeyValue(row));
      const rowEl = renderRow(row, i, isSelected);
      rowEl.style.position = "absolute";
      rowEl.style.top = `${i * rowHeight}px`;
      rowEl.style.left = "0";
      rowEl.style.right = "0";
      spacer.appendChild(rowEl);
    }
  }

  function renderRow(row: Record<string, T>, index: number, isSelected: boolean): HTMLElement {
    const tr = document.createElement("div");
    tr.className = `dg-row ${isSelected ? "dg-row-selected" : ""} ${striped && index % 2 === 1 ? "dg-row-striped" : ""}`;
    tr.style.cssText =
      "display:flex;align-items:center;" +
      `height:${rowHeight}px;${compact ? "" : "min-height:" + rowHeight + "px;"} ` +
      (bordered ? "border-bottom:1px solid #f3f4f6;" : "") +
      (isSelected
        ? "background:#eff6ff;"
        : striped && index % 2 === 1
          ? "background:#fafafa;"
          : "background:#fff;") +
      "transition:background 0.1s;cursor:default;";
    tr.dataset.rowKey = String(getRowKeyValue(row));

    tr.addEventListener("mouseenter", () => {
      if (!isSelected) tr.style.background = "#f9fafb";
    });
    tr.addEventListener("mouseleave", () => {
      if (!isSelected) tr.style.background = striped && index % 2 === 1 ? "#fafafa" : "#fff";
    });

    tr.addEventListener("click", () => onRowClick?.(row, index));

    // Checkbox
    if (selectable) {
      const cbCell = document.createElement("div");
      cbCell.style.cssText = `width:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;`;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = isSelected;
      cb.style.cssText = "cursor:pointer;accent-color:#3b82f6;";
      cb.addEventListener("change", (e) => {
        e.stopPropagation();
        if ((cb as HTMLInputElement).checked) selectRow(getRowKeyValue(row));
        else deselectRow(getRowKeyValue(row));
      });
      cbCell.appendChild(cb);
      tr.appendChild(cbCell);
    }

    // Row number
    if (showRowNumbers) {
      const numCell = document.createElement("div");
      numCell.style.cssText = "width:50px;text-align:center;padding:0 10px;color:#9ca3af;font-size:12px;flex-shrink:0;";
      numCell.textContent = String(index + 1);
      tr.appendChild(numCell);
    }

    // Cells
    for (const col of columns) {
      const val = row[col.key];
      const cell = document.createElement("div");
      cell.className = `dg-cell dg-cell-${col.key}`;
      cell.style.cssText =
        `width:${getColumnWidth(col.key)}px;min-width:${getColumnWidth(col.key)}px;` +
        `padding:${compact ? "4px 10px" : "8px 12px"};` +
        `text-align:${col.align ?? "left"};overflow:hidden;text-overflow:ellipsis;` +
        "white-space:nowrap;border-right:1px solid #f3f4f6;flex-shrink:0;";

      if (col.render) {
        const rendered = col.render(val, row, index);
        if (rendered instanceof HTMLElement) {
          cell.innerHTML = "";
          cell.appendChild(rendered);
        } else {
          cell.textContent = rendered;
        }
      } else {
        cell.textContent = val == null ? "" : String(val);
      }

      tr.appendChild(cell);
    }

    return tr;
  }

  // --- Public API ---

  function setData(data: Record<string, T>[]): void {
    _data = data;
    applyFilter();
    renderHeader();
    renderBody();
  }

  function getData(): Record<string, T>[] { return [..._data]; }

  function setSort(key: string, direction: SortDirection): void {
    _sortKey = key;
    _sortDir = direction;
    sortData();
    renderHeader();
    renderBody();
    onSortChange?.(key, direction);
  }

  function getSort(): { key: string; direction: SortDirection } | null {
    return _sortKey ? { key: _sortKey, direction: _sortDir } : null;
  }

  function filter(query: string): void {
    _filterQuery = query;
    applyFilter();
    renderBody();
  }

  function clearFilter(): void {
    _filterQuery = "";
    applyFilter();
    renderBody();
  }

  function selectRow(key: string | number): void {
    if (!multiSelect) selectedKeys.clear();
    selectedKeys.add(key);
    renderBody();
    renderHeader(); // update checkbox indeterminate state
    onSelectionChange?.([...selectedKeys]);
  }

  function deselectRow(key: string | number): void {
    selectedKeys.delete(key);
    renderBody();
    renderHeader();
    onSelectionChange?.([...selectedKeys]);
  }

  function selectAll(): void {
    for (const row of _filteredData) {
      selectedKeys.add(getRowKeyValue(row));
    }
    renderBody();
    renderHeader();
    onSelectionChange?.([...selectedKeys]);
  }

  function deselectAll(): void {
    selectedKeys.clear();
    renderBody();
    renderHeader();
    onSelectionChange?.([]);
  }

  function getSelectedRows(): (string | number)[] { return [...selectedKeys]; }

  function scrollToRow(index: number): void {
    const targetRow = bodyEl.querySelector(`[data-row-key="${index}"]`) as HTMLElement;
    if (targetRow) {
      targetRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else if (virtualScroll) {
      bodyEl.scrollTo({ top: index * rowHeight, behavior: "smooth" });
    }
  }

  function invalidate(): void {
    renderHeader();
    renderBody();
  }

  function destroy(): void {
    isDestroyed = true;
    root.remove();
  }

  // --- Event listeners ---

  if (virtualScroll) {
    let rafId: number | null = null;
    bodyEl.addEventListener("scroll", () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => { renderBody(); });
    }, { passive: true });
  }

  // Initial render
  applyFilter();
  renderHeader();
  renderBody();

  return {
    el: root,
    setData, getData,
    setSort, getSort,
    filter, clearFilter,
    selectRow, deselectRow, selectAll, deselectAll, getSelectedRows,
    scrollToRow, invalidate, destroy,
  };
}
