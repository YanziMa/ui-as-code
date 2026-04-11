/**
 * Lightweight Table: Data table with sorting, column definitions, row selection,
 * pagination integration, responsive overflow, empty state, loading skeleton,
 * and accessibility (ARIA grid).
 */

// --- Types ---

export type TableSortDirection = "asc" | "desc" | null;

export interface TableColumn {
  /** Column key/field name */
  key: string;
  /** Header label */
  title: string;
  /** Width (CSS value) */
  width?: string;
  /** Minimum width */
  minWidth?: string;
  /** Sortable? */
  sortable?: boolean;
  /** Custom render function for cell */
  render?: (value: unknown, row: Record<string, unknown>, rowIndex: number) => HTMLElement | string;
  /** Align text */
  align?: "left" | "center" | "right";
  /** Fixed column (doesn't scroll horizontally) */
  fixed?: boolean;
  /** Header CSS class */
  headerClassName?: string;
  /** Cell CSS class */
  className?: string;
  /** Description for tooltip */
  description?: string;
}

export interface TableRow {
  /** Unique key */
  id: string;
  /** Cell data keyed by column key */
  cells: Record<string, unknown>;
  /** Disabled? */
  disabled?: boolean;
  /** Custom row class */
  className?: string;
  /** Extra metadata */
  meta?: Record<string, unknown>;
}

export type TableVariant = "default" | "bordered" | "striped" | "compact";
export type TableSize = "sm" | "md" | "lg";

export interface TableOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: TableColumn[];
  /** Row data */
  rows: TableRow[];
  /** Visual variant */
  variant?: TableVariant;
  /** Size */
  size?: TableSize;
  /** Row selection mode */
  selectionMode?: "none" | "single" | "multiple" | "checkbox";
  /** Enable sorting */
  sortable?: boolean;
  /** Initial sort key and direction */
  defaultSort?: { key: string; direction: TableSortDirection };
  /** Show zebra striping */
  striped?: boolean;
  /** Border around table */
  bordered?: boolean;
  /** Compact density */
  compact?: boolean;
  /** Max height with scroll */
  maxHeight?: string;
  /** Empty state message */
  emptyText?: string;
  /** Loading state */
  loading?: boolean;
  /** Callback on sort change */
  onSort?: (key: string, direction: TableSortDirection) => void;
  /** Callback on selection change */
  onSelectionChange?: (selectedRows: TableRow[]) => void;
  /** Callback on row click */
  onRowClick?: (row: TableRow, index: number) => void;
  /** Custom row renderer */
  renderRow?: (row: TableRow, index: number) => HTMLElement | null;
  /** Custom CSS class */
  className?: string;
}

export interface TableInstance {
  element: HTMLElement;
  getColumns: () => TableColumn[];
  getRows: () => TableRow[];
  setRows: (rows: TableRow[]) => void;
  addRow: (row: TableRow) => void;
  removeRow: (id: string) => void;
  getSelectedRows: () => TableRow[];
  setSelectedIds: (ids: string[]) => void;
  getSortState: () => { key: string; direction: TableSortDirection } | null;
  sortBy: (key: string) => void;
  setLoading: (loading: boolean) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<TableSize, { cellPadding: string; fontSize: number; headerFontSize: number; height: number }> = {
  sm:  { cellPadding: "6px 10px", fontSize: 12, headerFontSize: 11, height: 32 },
  md:  { cellPadding: "10px 14px", fontSize: 13, headerFontSize: 12, height: 40 },
  lg:  { cellPadding: "12px 16px", fontSize: 14, headerFontSize: 13, height: 48 },
};

// --- Main Factory ---

export function createTable(options: TableOptions): TableInstance {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    selectionMode: options.selectionMode ?? "none",
    sortable: options.sortable ?? false,
    striped: options.striped ?? true,
    bordered: options.bordered ?? true,
    compact: options.compact ?? false,
    emptyText: options.emptyText ?? "No data",
    loading: options.loading ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Table: container not found");

  let columns = [...options.columns];
  let rows = [...options.rows];
  let selectedIds = new Set<string>();
  let sortState: { key: string; direction: TableSortDirection } | null = opts.defaultSort ?? null;
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `table-wrapper ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;overflow-x:auto;
    ${opts.maxHeight ? `max-height:${opts.maxHeight};overflow-y:auto;` : ""}
  `;

  // Table element
  const table = document.createElement("div");
  table.className = `table table-${opts.variant} table-${opts.size} ${opts.bordered ? "table-bordered" : ""} ${opts.striped ? "table-striped" : ""}`;
  table.setAttribute("role", "grid");
  table.style.cssText = `
    width:100%;border-collapse:separate;border-spacing:0;
    ${opts.bordered ? "border:1px solid #e5e7eb;" : ""}
  `;
  root.appendChild(table);

  // --- Render ---

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

    // Header
    renderHeader();

    // Body
    renderBody();
  }

  function renderHeader(): void {
    thead = document.createElement("div");
    thead.className = "table-head";
    thead.style.cssText = `
      display:flex;position:relative;background:#f9fafb;
      border-bottom:1px solid #e5e7eb;font-weight:600;
      ${SIZE_STYLES[opts.size].height}px;height:${SIZE_STYLES[opts.size].height}px};
      color:#111827;font-size:${SIZE_STYLES[opts.size].headerFontSize}px;
    `;

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!;
      const th = document.createElement("div");
      th.setAttribute("role", "columnheader");
      th.setAttribute("aria-sort", sortState?.key === col.key ? (sortState.direction === "asc" ? "ascending" : "descending") : "none");

      const alignStyle = col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "flex-start";
      th.style.cssText = `
        flex:${col.width ?? "1"};min-width:${col.minWidth ?? "80px"};
        padding:${SIZE_STYLES[opts.size].cellPadding};
        display:flex;align-items:center;gap:4px;
        ${alignStyle};user-select:none;position:relative;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
      `;

      // Sort indicator
      if (opts.sortable && col.sortable !== false) {
        th.style.cursor = "pointer";

        const sortBtn = document.createElement("span");
        sortBtn.style.cssText = "display:flex;align-items:center;gap:2px;";
        sortBtn.textContent = col.title;

        const arrow = document.createElement("span");
        arrow.innerHTML = "&nbsp;&#8593;&nbsp;&#8595;";
        arrow.style.cssText = "font-size:10px;opacity:0.5;transition:transform 0.15s;";
        if (sortState?.key === col.key) {
          arrow.style.opacity = "1";
          arrow.style.transform = sortState.direction === "desc" ? "rotate(180deg)" : "";
        }
        sortBtn.appendChild(arrow);
        th.appendChild(sortBtn);

        th.addEventListener("click", () => handleSort(col.key));
      } else {
        const label = document.createElement("span");
        label.textContent = col.title;
        label.title = col.description ?? "";
        th.appendChild(label);
      }

      if (col.headerClassName) th.classList.add(col.headerClassName);
      thead.appendChild(th);
    }

    // Selection checkbox header
    if (opts.selectionMode === "checkbox" || opts.selectionMode === "multiple") {
      const selectAllTh = document.createElement("div");
      selectAllTh.style.cssText = `flex:0 0 36px;display:flex;align-items:center;justify-content:center;`;
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.style.cssText = "cursor:pointer;width:16px;height:16px;accent-color:#4338ca;";
      cb.addEventListener("change", () => {
        if (cb.checked) {
          selectedIds = new Set(rows.map((r) => r.id));
        } else {
          selectedIds.clear();
        }
        renderBody();
        opts.onSelectionChange?.(getSelectedRows());
      });
      selectAllTh.appendChild(cb);
      thead.prepend(selectAllTh);
    }

    table.appendChild(thead);
  }

  let thead: HTMLElement;

  function renderBody(): void {
    tbody = document.createElement("div");
    tbody.className = "table-body";
    tbody.setAttribute("role", "rowgroup");

    for (let r = 0; r < rows.length; r++) {
      const row = rows[r]!;
      const isSelected = selectedIds.has(row.id);

      // Use custom renderer or default
      const rowEl = opts.renderRow
        ? opts.renderRow(row, r)
        : renderDefaultRow(row, r, isSelected);

      if (rowEl) {
        rowEl.dataset.id = row.id;
        rowEl.dataset.index = String(r);
        if (isSelected) rowEl.classList.add("table-row-selected");
        if (row.disabled) rowEl.classList.add("table-row-disabled");
        if (row.className) rowEl.classList.add(row.className);

        // Zebra striping
        if (opts.striped && r % 2 === 1 && !isSelected) {
          rowEl.style.background = "#fafbfc";
        }

        tbody.appendChild(rowEl);
      }
    }

    table.appendChild(tbody);
  }

  function renderDefaultRow(row: TableRow, _index: number, isSelected: boolean): HTMLElement {
    const tr = document.createElement("div");
    tr.className = "table-row";
    tr.style.cssText = `
      display:flex;min-height:${SIZE_STYLES[opts.size].height}px;
      border-bottom:1px solid #f3f4f6;
      transition:background 0.1s;
      ${isSelected ? "background:#eef2ff;" : ""}
      ${row.disabled ? "opacity:0.5;" : ""}
    `;

    // Selection checkbox
    if (opts.selectionMode !== "none") {
      const selCell = document.createElement("div");
      selCell.style.cssText = `flex:0 0 36px;display:flex;align-items:center;justify-content:center;`;
      const cb = document.createElement("input");
      cb.type = opts.selectionMode === "checkbox" ? "checkbox" : "radio";
      cb.name = "table-select";
      cb.checked = isSelected;
      cb.style.cssText = "cursor:pointer;width:16px;height:16px;accent-color:#4338ca;";
      cb.addEventListener("change", () => {
        handleSelect(row.id, cb.checked);
      });
      selCell.appendChild(cb);
      tr.appendChild(selCell);
    }

    // Data cells
    for (let c = 0; c < columns.length; c++) {
      const col = columns[c]!;
      const td = document.createElement("td");
      td.setAttribute("role", "gridcell");
      const val = row.cells[col.key];

      const alignStyle = col.align === "right" ? "flex-end;text-align:right;" :
        col.align === "center" ? "text-align:center;" : "";
      td.style.cssText = `
        flex:${col.width ?? "1"};min-width:${col.minWidth ?? "80px"};
        padding:${SIZE_STYLES[opts.size].cellPadding};
        ${alignStyle}
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
      `;

      if (col.render) {
        const rendered = col.render(val, row.cells, _index);
        if (typeof rendered === "string") {
          td.innerHTML = rendered;
        } else {
          td.appendChild(rendered);
        }
      } else {
        td.textContent = val != null ? String(val) : "";
      }

      if (col.className) td.className = col.className;
      tr.appendChild(td);
    }

    // Click handler
    if (!row.disabled && opts.onRowClick) {
      tr.style.cursor = "pointer";
      tr.addEventListener("click", () => opts.onRowClick!(row, _index));
    }

    return tr;
  }

  function renderLoading(): void {
    const loadBody = document.createElement("div");
    loadBody.className = "table-loading";
    loadBody.style.cssText = `padding:${SIZE_STYLES[opts.size].height * 3}px};text-align:center;`;

    const dots = document.createElement("span");
    dots.innerHTML = "&#8226;&nbsp;&#8226;&nbsp;&#8226;";
    dots.style.cssText = `color:#9ca3af;font-size:18px;letter-spacing:4px;`;

    loadBody.appendChild(dots);
    table.appendChild(loadBody);
  }

  function renderEmpty(): void {
    const emptyBody = document.createElement("div");
    emptyBody.className = "table-empty";
    emptyBody.style.cssText = `
      padding:${SIZE_STYLES[opts.size].height * 2}px};
      text-align:center;color:#9ca3af;font-size:13px;
    `;
    emptyBody.textContent = opts.emptyText;
    table.appendChild(emptyBody);
  }

  // --- Handlers ---

  function handleSort(key: string): void {
    if (sortState?.key === key) {
      sortState = sortState.direction === "asc"
        ? { key, direction: "desc" as TableSortDirection }
        : { key, direction: "asc" as TableSortDirection };
    } else {
      sortState = { key, direction: "asc" };
    }

    // Sort rows
    rows.sort((a, b) => {
      const aVal = a.cells[key];
      const bVal = b.cells[key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortState!.direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      return sortState!.direction === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    render();
    opts.onSort?.(sortState.key, sortState.direction);
  }

  function handleSelect(id: string, checked: boolean): void {
    if (opts.selectionMode === "single") {
      selectedIds.clear();
    } else if (opts.selectionMode === "checkbox") {
      // Toggle handled by checkbox
      if (checked) selectedIds.add(id); else selectedIds.delete(id);
    } else {
      if (checked) selectedIds.add(id); else selectedIds.delete(id);
    }
    renderBody();
    opts.onSelectionChange?.(getSelectedRows());
  }

  // Initial render
  render();

  // Instance
  const instance: TableInstance = {
    element: root,

    getColumns: () => [...columns],
    getRows: () => [...rows],

    setRows(newRows: TableRow[]) {
      rows = newRows;
      selectedIds.clear();
      render();
    },

    addRow(newRow: TableRow) {
      rows.push(newRow);
      render();
    },

    removeRow(id: string) {
      rows = rows.filter((r) => r.id !== id);
      selectedIds.delete(id);
      render();
    },

    getSelectedRows() {
      return rows.filter((r) => selectedIds.has(r.id));
    },

    setSelectedIds(ids: string[]) {
      selectedIds = new Set(ids);
      render();
    },

    getSortState() { return sortState; },

    sortBy(key: string) {
      handleSort(key);
    },

    setLoading(loading: boolean) {
      opts.loading = loading;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
