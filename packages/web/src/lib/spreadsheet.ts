/**
 * Spreadsheet: In-browser spreadsheet/table component with cell editing,
 * formula support basics, selection ranges, column/row headers,
 * keyboard navigation, data import/export, formatting, and sorting.
 */

// --- Types ---

export interface SpreadsheetCell {
  value: string | number | null;
  formatted?: string;
  formula?: string;
  readOnly?: boolean;
  bgColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  dataType?: "text" | "number" | "currency" | "percentage" | "date" | "formula";
  validation?: { min?: number; max?: number; pattern?: string; error?: string };
}

export interface SpreadsheetColumn {
  id: string;
  header: string;
  width?: number;
  minWidth?: number;
  resizable?: boolean;
  sortable?: boolean;
  type?: "text" | "number" | "currency" | "percentage" | "date" | "select";
  options?: string[]; // For select type
  format?: string; // Number format string
}

export interface SpreadsheetOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: SpreadsheetColumn[];
  /** Initial data (2D array of cells) */
  data?: SpreadsheetCell[][];
  /** Number of rows */
  rows?: number;
  /** Show row headers (1, 2, 3...)? */
  showRowHeaders?: boolean;
  /** Show column headers? */
  showColHeaders?: true;
  /** Frozen rows at top */
  frozenRows?: number;
  /** Frozen columns at left */
  frozenCols?: number;
  /** Enable cell selection? */
  selectable?: boolean;
  /** Enable multi-select with Ctrl/Cmd? */
  multiSelect?: boolean;
  /** Enable cell editing? */
  editable?: boolean;
  /** Row height (px) */
  rowHeight?: number;
  /** Header row height (px) */
  headerHeight?: number;
  /** Border color */
  borderColor?: string;
  /** Header background */
  headerBg?: string;
  /** Selection highlight color */
  selectionColor?: string;
  /** Active cell border color */
  activeBorderColor?: string;
  /** Alternating row colors? */
  stripedRows?: boolean;
  /** Stripe colors */
  stripeColors?: [string, string];
  /** Callback when cell value changes */
  onCellChange?: (row: number, col: number, value: SpreadsheetCell["value"], cell: SpreadsheetCell) => void;
  /** Callback on selection change */
  onSelectionChange?: (startRow: number, startCol: number, endRow: number, endCol: number) => void;
  /** Custom renderer per cell */
  renderCell?: (row: number, col: number, cell: SpreadsheetCell, el: HTMLTableCellElement) => void;
  /** Custom CSS class */
  className?: string;
}

export interface SpreadsheetInstance {
  element: HTMLTableElement;
  /** Get data as 2D array */
  getData: () => SpreadsheetCell[][];
  /** Set data */
  setData: (data: SpreadsheetCell[][]) => void;
  /** Get cell value */
  getCellValue: (row: number, col: number) => SpreadsheetCell["value"];
  /** Set cell value */
  setCellValue: (row: number, col: number, value: SpreadsheetCell["value"]) => void;
  /** Get selected range */
  getSelection: () => { startRow: number; startCol: number; endRow: number; endCol: number } | null;
  /** Select a cell/range */
  select: (row: number, col: number, endRow?: number, endCol?: number) => void;
  /** Insert row */
  insertRow: (atIndex: number) => void;
  /** Delete row */
  deleteRow: (index: number) => void;
  /** Insert column */
  insertColumn: (atIndex: number) => void;
  /** Sort by column */
  sortBy: (col: number, direction?: "asc" | "desc") => void;
  /** Export as TSV string */
  exportTSV: () => string;
  /** Import from TSV string */
  importTSV: (tsv: string) => void;
  /** Focus the spreadsheet */
  focus: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_COL_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 34;
const DEFAULT_HEADER_HEIGHT = 36;

// --- Main Factory ---

export function createSpreadsheet(options: SpreadsheetOptions): SpreadsheetInstance {
  const opts = {
    rows: options.rows ?? 20,
    showRowHeaders: options.showRowHeaders ?? true,
    showColHeaders: options.showColHeaders ?? true,
    frozenRows: options.frozenRows ?? 0,
    frozenCols: options.frozenCols ?? 0,
    selectable: options.selectable ?? true,
    multiSelect: options.multiSelect ?? false,
    editable: options.editable ?? true,
    rowHeight: options.rowHeight ?? DEFAULT_ROW_HEIGHT,
    headerHeight: options.headerHeight ?? DEFAULT_HEADER_HEIGHT,
    borderColor: options.borderColor ?? "#e5e7eb",
    headerBg: options.headerBg ?? "#f9fafb",
    selectionColor: options.selectionColor ?? "rgba(99,102,241,0.12)",
    activeBorderColor: options.activeBorderColor ?? "#6366f1",
    stripedRows: options.stripedRows ?? false,
    stripeColors: options.stripeColors ?? ["#ffffff", "#f9fafb"],
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Spreadsheet: container not found");

  // Initialize data
  let data: SpreadsheetCell[][] = options.data ??
    Array.from({ length: opts.rows }, (_, r) =>
      Array.from({ length: options.columns.length }, (_, c) => ({
        value: null,
        readOnly: !opts.editable,
      } as SpreadsheetCell)
    );

  let destroyed = false;
  let selStart: [number, number] | null = null;
  let selEnd: [number, number] | null = null;
  let activeCell: [number, number] | null = null;
  let editingCell: [number, number] | null = null;

  // Create table
  const wrapper = document.createElement("div");
  wrapper.className = `spreadsheet ${opts.className}`;
  wrapper.style.cssText = `
    overflow:auto;width:100%;height:100%;
    font-family:-apple-system,'SF Mono',Consolas,monospace;font-size:13px;
    border:1px solid ${opts.borderColor};border-radius:6px;
  `;
  container.appendChild(wrapper);

  const table = document.createElement("table");
  table.className = "ss-table";
  table.style.cssText = `
    border-collapse:collapse;width:max-content;table-layout:fixed;
    empty-cells:show;
  `;
  wrapper.appendChild(table);

  // --- Rendering ---

  function render(): void {
    table.innerHTML = "";

    const colCount = options.columns.length;
    const rowCount = data.length;

    // Column group for widths
    const colGroup = document.createElement("colgroup");
    if (opts.showRowHeaders) {
      const rhCol = document.createElement("col");
      rhCol.style.width = "44px";
      colGroup.appendChild(rhCol);
    }
    for (const col of options.columns) {
      const c = document.createElement("col");
      c.style.width = `${col.width ?? DEFAULT_COL_WIDTH}px`;
      c.style.minWidth = `${col.minWidth ?? 40}px`;
      colGroup.appendChild(c);
    }
    table.appendChild(colGroup);

    // Header row
    if (opts.showColHeaders) {
      const thead = document.createElement("thead");
      const hr = document.createElement("tr");
      hr.style.height = `${opts.headerHeight}px`;

      if (opts.showRowHeaders) {
        const cornerTh = document.createElement("th");
        cornerTh.style.cssText = `
          background:${opts.headerBg};border-bottom:1px solid ${opts.borderColor};
          border-right:1px solid ${opts.borderColor};position:sticky;top:0;z-index:3;
          font-size:11px;color:#9ca3af;text-align:center;font-weight:600;
        `;
        cornerTh.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>`;
        hr.appendChild(cornerTh);
      }

      for (let ci = 0; ci < colCount; ci++) {
        const col = options.columns[ci]!;
        const th = document.createElement("th");
        th.style.cssText = `
          background:${opts.headerBg};border-bottom:1px solid ${opts.borderColor};
          ${ci < colCount - 1 ? `border-right:1px solid ${opts.borderColor};` : ""}
          position:sticky;top:0;z-index:3;padding:0 8px;
          font-size:12px;font-weight:600;color:#374151;text-align:left;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          user-select:none;cursor:${col.sortable !== false ? "pointer" : "default"};
        `;

        // Sort indicator area
        const sortArea = document.createElement("span");
        sortArea.style.cssText = "display:flex;align-items:center;gap:4px;";
        sortArea.textContent = col.header;

        if (col.sortable !== false) {
          sortArea.addEventListener("click", () => {
            // Toggle sort direction
            const currentDir = (th as any).__sortDir ?? null;
            const dir = currentDir === "asc" ? "desc" : "asc";
            (th as any).__sortDir = dir;
            sortBy(ci, dir);
            // Update visual
            th.querySelectorAll(".ss-sort-icon").forEach(el => el.remove());
            const icon = document.createElement("span");
            icon.className = "ss-sort-icon";
            icon.textContent = dir === "asc" ? "\u2191" : "\u2193";
            icon.style.cssText = "font-size:10px;color:#6366f1;";
            sortArea.appendChild(icon);
          });
        }

        th.appendChild(sortArea);

        // Resize handle
        if (col.resizable !== false) {
          const resizer = document.createElement("div");
          resizer.style.cssText = `
            position:absolute;right:0;top:0;bottom:0;width:4px;
            cursor:col-resize;background:transparent;
          `;
          th.style.position = "relative";
          th.appendChild(resizer);

          let resizing = false;
          let startX = 0;
          let startW = 0;

          resizer.addEventListener("mousedown", (e) => {
            resizing = true;
            startX = (e as MouseEvent).clientX;
            startW = col.width ?? DEFAULT_COL_WIDTH;
            e.preventDefault();
            e.stopPropagation();

            const onMove = (me: MouseEvent) => {
              if (!resizing) return;
              const diff = me.clientX - startX;
              col.width = Math.max(col.minWidth ?? 40, startW + diff);
              render(); // Re-render with new widths
            };
            const onUp = () => {
              resizing = false;
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
          });
        }

        hr.appendChild(th);
      }
      thead.appendChild(hr);
      table.appendChild(thead);
    }

    // Body
    const tbody = document.createElement("tbody");
    for (let ri = 0; ri < rowCount; ri++) {
      const tr = document.createElement("tr");
      tr.style.height = `${opts.rowHeight}px`;
      tr.dataset.row = String(ri);

      if (opts.stripedRows) {
        tr.style.background = opts.stripeColors[ri % 2];
      }

      // Row header
      if (opts.showRowHeaders) {
        const rhTd = document.createElement("td");
        rhTd.style.cssText = `
          background:${opts.headerBg};border-bottom:1px solid ${opts.borderColor};
          border-right:1px solid ${opts.borderColor};
          text-align:center;font-size:11px;color:#9ca3af;font-weight:500;
          user-select:none;position:sticky;left:0;z-index:2;
        `;
        rhTd.textContent = String(ri + 1);
        tr.appendChild(rhTd);
      }

      for (let ci = 0; ci < colCount; ci++) {
        const cell = data[ri]?.[ci] ?? { value: null, readOnly: !opts.editable };
        const td = document.createElement("td");
        td.dataset.row = String(ri);
        td.dataset.col = String(ci);
        td.tabIndex = 0;

        const isSelected = isInSelection(ri, ci);
        const isActive = activeCell?.[0] === ri && activeCell?.[1] === ci;
        const isEditing = editingCell?.[0] === ri && editingCell?.[1] === ci;

        td.style.cssText = `
          border-bottom:1px solid ${opts.borderColor};
          ${ci < colCount - 1 ? `border-right:1px solid ${opts.borderColor};` : ""}
          padding:0 6px;white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;vertical-align:middle;
          ${cell.bgColor ? `background:${cell.bgColor};` : ""}
          ${cell.textColor ? `color:${cell.textColor};` : ""}
          ${cell.bold ? "font-weight:700;" : ""}
          ${cell.italic ? "font-style:italic;" : ""}
          ${cell.align ? `text-align:${cell.align};` : ""}
          ${isSelected ? `background:${opts.selectionColor};` : ""}
          ${isActive ? `outline:2px solid ${opts.activeBorderColor};outline-offset:-2px;` : ""}
          cursor:${cell.readOnly ? "default" : (opts.editable ? "cell" : "default")};
        `;

        // Custom renderer
        if (opts.renderCell) {
          opts.renderCell(ri, ci, cell, td);
        } else {
          if (isEditing) {
            // Edit mode: input
            const input = document.createElement("input");
            input.type = "text";
            input.value = formatCellValue(cell.value);
            input.style.cssText = `
              width:100%;border:none;outline:none;background:transparent;
              font:inherit;color:inherit;text-align:inherit;
              padding:0;margin:-1px -6px;
            `;
            input.addEventListener("blur", () => finishEditing(input.value));
            input.addEventListener("keydown", (e) => {
              if (e.key === "Enter") { input.blur(); }
              if (e.key === "Escape") { input.blur(); restoreValue(); }
            });
            td.innerHTML = "";
            td.appendChild(input);
            setTimeout(() => input.focus(), 0);
            input.select();
          } else {
            td.textContent = cell.formatted ?? formatCellValue(cell.value);
          }
        }

        // Cell events
        if (opts.selectable) {
          td.addEventListener("click", (e) => {
            if (editingCell) return; // Don't change selection while editing

            if (e.ctrlKey || e.metaKey) {
              // Multi-select: extend selection
              if (selStart) {
                selEnd = [ri, ci];
              } else {
                selStart = [ri, ci];
                selEnd = [ri, ci];
              }
            } else {
              selStart = [ri, ci];
              selEnd = [ri, ci];
            }
            activeCell = [ri, ci];

            if (opts.editable && !cell.readOnly && e.detail === 2) {
              // Double-click to edit
              startEditing(ri, ci);
            }

            render();
            opts.onSelectionChange?.(
              selStart![0], selStart![1],
              selEnd![0], selEnd![1]
            );
          });
        }

        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
  }

  // --- Helpers ---

  function formatCellValue(val: SpreadsheetCell["value"]): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") return val.toLocaleString();
    return String(val);
  }

  function isInSelection(r: number, c: number): boolean {
    if (!selStart || !selEnd) return false;
    const minR = Math.min(selStart[0], selEnd[0]);
    const maxR = Math.max(selStart[0], selEnd[0]);
    const minC = Math.min(selStart[1], selEnd[1]);
    const maxC = Math.max(selStart[1], selEnd[1]);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  }

  function startEditing(row: number, col: number): void {
    editingCell = [row, col];
    render();
  }

  function finishEditing(newValue: string): void {
    if (!editingCell) return;
    const [row, col] = editingCell;
    const cell = data[row]?.[col];
    if (cell) {
      const parsed = parseInput(newValue);
      cell.value = parsed;
      cell.formatted = undefined;
      opts.onCellChange?.(row, col, parsed, cell);
    }
    editingCell = null;
    render();
  }

  function restoreValue(): void {
    editingCell = null;
    render();
  }

  function parseInput(s: string): SpreadsheetCell["value"] {
    const trimmed = s.trim();
    if (trimmed === "") return null;
    const num = parseFloat(trimmed);
    if (!isNaN(num)) return num;
    return trimmed;
  }

  // --- Public API ---

  function sortBy(col: number, direction: "asc" | "desc" = "asc"): void {
    const sorted = [...data].sort((a, b) => {
      const va = a[col]?.value;
      const vb = b[col]?.value;
      if (va == null && vb == null) return 0;
      if (va == null) return direction === "asc" ? -1 : 1;
      if (vb == null) return direction === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return direction === "asc" ? va - vb : vb - va;
      }
      return direction === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    data = sorted;
    render();
  }

  // Initial render
  render();

  // Keyboard nav on wrapper
  wrapper.addEventListener("keydown", (e) => {
    if (!activeCell || editingCell) return;
    const [r, c] = activeCell;
    switch (e.key) {
      case "ArrowUp":    e.preventDefault(); select(Math.max(0, r - 1), c); break;
      case "ArrowDown":  e.preventDefault(); select(Math.min(data.length - 1, r + 1), c); break;
      case "ArrowLeft": e.preventDefault(); select(r, Math.max(0, c - 1)); break;
      case "ArrowRight":e.preventDefault(); select(r, Math.min(options.columns.length - 1, c + 1)); break;
      case "Enter":     e.preventDefault(); startEditing(r, c); break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) select(r, Math.max(0, c - 1));
        else select(r, Math.min(options.columns.length - 1, c + 1));
        break;
    }
  });

  function select(row: number, col: number, endRow?: number, endCol?: number): void {
    selStart = [row, col];
    selEnd = [endRow ?? row, endCol ?? col];
    activeCell = [row, col];
    render();
    opts.onSelectionChange?.(row, col, selEnd[0], selEnd[1]);

    // Scroll into view
    const td = table.querySelector(`td[data-row="${row}"][data-col="${col}"]`);
    td?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  // --- Instance ---

  const instance: SpreadsheetInstance = {
    element: table,

    getData: () => JSON.parse(JSON.stringify(data)),
    setData(newData: SpreadsheetCell[][]) { data = newData; render(); },
    getCellValue: (r, c) => data[r]?.[c]?.value ?? null,
    setCellValue: (r, c, val) => {
      if (!data[r]) data[r] = [];
      if (!data[r][c]) data[r][c] = { value: null, readOnly: !opts.editable };
      data[r][c]!.value = val;
      render();
    },

    getSelection: () => {
      if (!selStart || !selEnd) return null;
      return { startRow: selStart[0], startCol: selStart[1], endRow: selEnd[0], endCol: selEnd[1] };
    },
    select,

    insertRow(atIndex: number) {
      const newRow: SpreadsheetCell[] = options.columns.map(() => ({ value: null, readOnly: !opts.editable }));
      data.splice(atIndex, 0, newRow);
      render();
    },

    deleteRow(index: number) {
      data.splice(index, 1);
      if (activeCell?.[0] === index) activeCell = null;
      render();
    },

    insertColumn(atIndex: number) {
      options.columns.splice(atIndex, 0, { id: `col-${atIndex}`, header: `Column ${atIndex + 1}` });
      for (const row of data) row.splice(atIndex, 0, { value: null, readOnly: !opts.editable });
      render();
    },

    sortBy,

    exportTSV: () => {
      const lines: string[] = [];
      if (opts.showColHeaders) {
        lines.push(["", ...options.columns.map(c => c.header)].join("\t"));
      }
      for (let r = 0; r < data.length; r++) {
        const cells = opts.showRowHeaders ? [String(r + 1)] : [];
        for (let c = 0; c < options.columns.length; c++) {
          cells.push(formatCellValue(data[r]?.[c]?.value ?? null));
        }
        lines.push(cells.join("\t"));
      }
      return lines.join("\n");
    },

    importTSV(tsv: string) {
      const lines = tsv.split("\n").filter(l => l.trim());
      const startIdx = opts.showColHeaders ? 1 : 0;
      const newData: SpreadsheetCell[][] = [];

      for (let li = startIdx; li < lines.length; li++) {
        const cols = lines[li]!.split("\t");
        const row: SpreadsheetCell[] = [];
        for (let ci = 0; ci < options.columns.length; ci++) {
          const val = cols[ci]?.trim() ?? "";
          const numVal = parseFloat(val);
          row.push({
            value: isNaN(numVal) || val === "" ? (val || null) : numVal,
            readOnly: !opts.editable,
          });
        }
        newData.push(row);
      }
      data = newData;
      render();
    },

    focus: () => { wrapper.focus(); table.focus(); },

    destroy() {
      destroyed = true;
      wrapper.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
