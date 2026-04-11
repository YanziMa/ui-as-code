/**
 * Table Utilities: Data table with sorting, column config, row selection,
 * pagination integration, responsive behavior, and ARIA grid attributes.
 */

// --- Types ---

export type TableSize = "sm" | "md" | "lg";
export type TableVariant = "default" | "striped" | "bordered" | "minimal";

export interface TableColumn<T = unknown> {
  /** Column key/id */
  key: string;
  /** Header label */
  header: string;
  /** Width (CSS value) */
  width?: string;
  /** Minimum width */
  minWidth?: string;
  /** Align text */
  align?: "left" | "center" | "right";
  /** Sortable? */
  sortable?: boolean;
  /** Cell renderer */
  render?: (value: unknown, row: T, rowIndex: number) => HTMLElement | string;
  /** Header cell renderer */
  headerRender?: (col: TableColumn<T>) => HTMLElement | string;
}

export interface TableRow<T = unknown> {
  /** Unique ID */
  id: string;
  /** Row data */
  data: T;
  /** Disabled? */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface TableOptions<T = unknown> {
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Row data */
  rows: TableRow<T>[];
  /** Size variant */
  size?: TableSize;
  /** Visual variant */
  variant?: TableVariant;
  /** Show row numbers? */
  showRowNumbers?: boolean;
  /** Allow row selection? */
  selectable?: boolean;
  /** Multi-select? */
  multiSelect?: boolean;
  /** Currently selected IDs */
  selectedIds?: Set<string>;
  /** Zebra striping even rows */
  striped?: boolean;
  /** Hover highlight rows */
  hoverable?: boolean;
  /** Compact mode (dense padding) */
  compact?: boolean;
  /** Sticky header */
  stickyHeader?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** On sort change */
  onSort?: (key: string, direction: "asc" | "desc") => void;
  /** On selection change */
  onSelectionChange?: (ids: string[]) => void;
  /** On row click */
  onRowClick?: (row: TableRow<T>, index: number) => void;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface TableInstance<T = unknown> {
  /** The table element */
  el: HTMLElement;
  /** Set rows */
  setRows: (rows: TableRow<T>[]) => void;
  /** Get rows */
  getRows: () => TableRow<T>[];
  /** Get selected row IDs */
  getSelectedIds: () => string[];
  /** Select all rows */
  selectAll: () => void;
  /** Deselect all */
  deselectAll: () => void;
  /** Sort by column */
  sortBy: (key: string) => void;
  /** Get current sort state */
  getSortState: () => { key: string; direction: "asc" | "desc" } | null;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const TABLE_SIZES: Record<TableSize, { cellPadding: string; fontSize: string; headerWeight: string }> = {
  "sm": { cellPadding: "6px 10px", fontSize: "12px", headerWeight: "600" },
  "md": { cellPadding: "10px 14px", fontSize: "13px", headerWeight: "600" },
  "lg": { cellPadding: "12px 18px", fontSize: "14px", headerWeight: "600" },
};

// --- Core Factory ---

/**
 * Create a data table.
 *
 * @example
 * ```ts
 * const table = createTable({
 *   columns: [
 *     { key: "name", header: "Name", sortable: true },
 *     { key: "email", header: "Email" },
 *     { key: "role", header: "Role" },
 *   ],
 *   rows: [
 *     { id: "1", data: { name: "Alice", email: "a@b.com", role: "Admin" } },
 *     { id: "2", data: { name: "Bob", email: "b@c.com", role: "User" } },
 *   ],
 *   selectable: true,
 *   onSelectionChange: (ids) => console.log("Selected:", ids),
 * });
 * ```
 */
export function createTable<T = unknown>(options: TableOptions<T>): TableInstance<T> {
  const {
    columns,
    rows,
    size = "md",
    variant = "default",
    showRowNumbers = false,
    selectable = false,
    multiSelect = false,
    selectedIds = new Set<string>(),
    striped = variant === "striped",
    hoverable = true,
    compact = false,
    stickyHeader = false,
    emptyMessage = "No data available",
    onSort,
    onSelectionChange,
    onRowClick,
    container,
    className,
  } = options;

  let _rows = [...rows];
  let _selected = new Set(selectedIds);
  let _sortState: { key: string; direction: "asc" | "desc" } | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `table-wrapper ${variant} ${size} ${compact ? "compact" : ""} ${className ?? ""}`.trim();
  root.style.cssText =
    "overflow-x:auto;width:100%;border:1px solid #e5e7eb;border-radius:8px;" +
    "background:#fff;";

  const table = document.createElement("table");
  table.className = "data-table";
  table.style.cssText =
    "width:100%;border-collapse:collapse;font-size:" + TABLE_SIZES[size].fontSize + ";";
  table.setAttribute("role", "grid");

  // Render
  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function setRows(newRows: TableRow<T>[]): void {
    _rows = newRows;
    _render();
  }

  function getRows(): TableRow<T>[] { return [..._rows]; }
  function getSelectedIds(): string[] { return [..._selected]; }

  function selectAll(): void {
    _selected = new Set(_rows.filter((r) => !r.disabled).map((r) => r.id));
    _render();
    onSelectionChange?.([..._selected]);
  }

  function deselectAll(): void {
    _selected.clear();
    _render();
    onSelectionChange?.([]);
  }

  function sortBy(key: string): void {
    if (_sortState?.key === key) {
      _sortState = { key, direction: _sortState.direction === "asc" ? "desc" : "asc" };
    } else {
      _sortState = { key, direction: "asc" };
    }
    // Sort rows
    _rows.sort((a, b) => {
      const aVal = String((a.data as Record<string, unknown>)[key] ?? "");
      const bVal = String((b.data as Record<string, unknown>)[key] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return _sortState?.direction === "desc" ? -cmp : cmp;
    });
    _render();
    onSort?.(key, _sortState!.direction);
  }

  function getSortState() { return _sortState; }

  function destroy(): void { root.remove(); }

  // --- Internal ---

  function _render(): void {
    table.innerHTML = "";
    const sc = TABLE_SIZES[size];

    // Header row
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    if (selectable) {
      const th = document.createElement("th");
      th.style.cssText =
        `padding:${sc.cellPadding};text-align:center;width:36px;` +
        "font-size:11px;color:#9ca3af;border-bottom:2px solid #f3f4f6;" +
        "background:#fafafa;";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = _selected.size === _rows.filter((r) => !r.disabled).length;
      checkbox.style.cursor = "pointer";
      checkbox.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) selectAll(); else deselectAll();
      });
      th.appendChild(checkbox);
      headRow.appendChild(th);
    }

    if (showRowNumbers) {
      const th = document.createElement("th");
      th.textContent = "#";
      th.style.cssText =
        `padding:${sc.cellPadding};text-align:center;width:44px;` +
        "font-size:11px;color:#9ca3af;border-bottom:2px solid #f3f4f6;" +
        "background:#fafafa;";
      headRow.appendChild(th);
    }

    columns.forEach((col) => {
      const th = document.createElement("th");
      th.scope = "col";
      th.dataset.columnKey = col.key;
      th.style.cssText =
        `padding:${sc.cellPadding};text-align:${col.align ?? "left"};` +
        `font-size:${sc.fontSize};font-weight:${sc.headerWeight};color:#374151;` +
        "border-bottom:2px solid #f3f4f6;background:#fafafa;" +
        "white-space:nowrap;position:relative;" +
        (col.width ? `width:${col.width};` : "") +
        (col.minWidth ? `min-width:${col.minWidth};` : "");

      if (col.sortable) {
        th.style.cursor = "pointer";
        th.setAttribute("aria-sort", (_sortState?.key === col.key)
          ? (_sortState.direction === "asc" ? "ascending" : "descending")
          : "none");

        const sortIndicator = document.createElement("span");
        sortIndicator.style.marginLeft = "6px";
        sortIndicator.style.color = "#9ca3af";
        sortIndicator.style.fontSize = "11px";
        if (_sortState?.key === col.key) {
          sortIndicator.textContent = _sortState.direction === "asc" ? "\u2191" : "\u2193";
        }
        th.appendChild(sortIndicator);

        th.addEventListener("click", () => sortBy(col.key));
      }

      if (col.headerRender) {
        const rendered = col.headerRender(col);
        th.innerHTML = "";
        th.appendChild(typeof rendered === "string"
          ? document.createTextNode(rendered)
          : rendered);
      } else {
        th.textContent = col.header;
      }

      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");

    if (_rows.length === 0) {
      const emptyTr = document.createElement("tr");
      const emptyTd = document.createElement("td");
      emptyTd.colSpan = String(columns.length + (selectable ? 1 : 0) + (showRowNumbers ? 1 : 0));
      emptyTd.textContent = emptyMessage;
      emptyTd.style.cssText =
        `padding:24px;text-align:center;color:#9ca3af;font-size:${sc.fontSize};`;
      emptyTr.appendChild(emptyTd);
      tbody.appendChild(emptyTr);
    } else {
      _rows.forEach((row, idx) => {
        const tr = document.createElement("tr");
        tr.dataset.rowId = row.id;
        tr.style.transition = "background 0.1s";

        if (striped && idx % 2 === 1) {
          tr.style.background = "#fafafa";
        }

        if (hoverable && !row.disabled) {
          tr.style.cursor = "pointer";
          tr.addEventListener("mouseenter", () => { tr.style.background = "#eff6ff"; });
          tr.addEventListener("mouseleave", () => {
            tr.style.background = striped && idx % 2 === 1 ? "#fafafa" : "";
          });
        }

        if (row.disabled) {
          tr.style.opacity = "0.5";
        }

        // Selection checkbox
        if (selectable) {
          const td = document.createElement("td");
          td.style.cssText =
            `padding:${sc.cellPadding};text-align:center;border-bottom:1px solid #f3f4f6;`;
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = _selected.has(row.id);
          cb.disabled = row.disabled;
          cb.style.cursor = row.disabled ? "not-allowed" : "pointer";
          cb.addEventListener("change", (e) => {
            const target = e.target as HTMLInputElement;
            if (target.checked) {
              if (!multiSelect) _selected.clear();
              _selected.add(row.id);
            } else {
              _selected.delete(row.id);
            }
            _render();
            onSelectionChange?.([..._selected]);
          });
          td.appendChild(cb);
          tr.appendChild(td);
        }

        // Row number
        if (showRowNumbers) {
          const numTd = document.createElement("td");
          numTd.textContent = String(idx + 1);
          numTd.style.cssText =
            `padding:${sc.cellPadding};text-align:center;border-bottom:1px solid #f3f4f6;` +
            "color:#9ca3af;font-size:11px;";
          tr.appendChild(numTd);
        }

        // Data cells
        columns.forEach((col) => {
          const td = document.createElement("td");
          td.style.cssText =
            `padding:${sc.cellPadding};border-bottom:1px solid #f3f4f6;` +
            (col.align ? `text-align:${col.align};` : "") +
            (col.width ? `width:${col.width};` : "") +
            (col.minWidth ? `min-width:${col.minWidth};` : "");

          const value = (row.data as Record<string, unknown>)[col.key];
          if (col.render) {
            const rendered = col.render(value, row.data, idx);
            td.innerHTML = "";
            td.appendChild(typeof rendered === "string"
              ? document.createTextNode(rendered)
              : rendered);
          } else {
            td.textContent = value != null ? String(value) : "";
          }

          tr.appendChild(td);
        });

        tbody.appendChild(tr);

        // Row click
        if (onRowClick && !row.disabled) {
          tr.addEventListener("click", () => onRowClick(row, idx));
        }
      });
    }

    table.appendChild(tbody);
    root.appendChild(table);
  }

  return { el: root, setRows, getRows, getSelectedIds, selectAll, deselectAll, sortBy, getSortState, destroy };
}
