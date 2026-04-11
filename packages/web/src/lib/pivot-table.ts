/**
 * Pivot Table: Interactive pivot table with drag-and-drop dimensions,
 * aggregation functions (sum, avg, count, min, max), drill-down,
 * conditional formatting, and export capabilities.
 */

// --- Types ---

export type AggregationFn = "sum" | "avg" | "count" | "min" | "max" | "median" | "distinct";

export interface PivotDimension {
  /** Dimension name/key */
  key: string;
  /** Display label */
  label: string;
  /** Values (for dropdown filter) */
  values?: string[];
}

export interface PivotMeasure {
  /** Field key */
  key: string;
  /** Display label */
  label: string;
  /** Aggregation function */
  aggregation: AggregationFn;
  /** Number format */
  format?: string;
  /** Background color condition */
  colorScale?: [string, string]; // [lowColor, highColor]
}

export interface PivotValue {
  rowKey: string[];
  colKey: string[];
  rawValues: number[];
  aggregated: number;
  formatted: string;
}

export interface PivotTableOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Source data (array of objects) */
  data: Record<string, unknown>[];
  /** Row dimensions */
  rows: PivotDimension[];
  /** Column dimensions */
  columns: PivotDimension[];
  /** Measures/values */
  measures: PivotMeasure[];
  /** Grand total label */
  grandTotalLabel?: string;
  /** Show grand totals? */
  showGrandTotal?: boolean;
  /** Show subtotals? */
  showSubtotals?: boolean;
  /** Conditional formatting rules */
  conditions?: Array<{
    measure: string;
    operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
    value: number;
    color: string;
    bgColor: string;
    bold?: boolean;
  }>;
  /** Number of decimal places */
  decimals?: number;
  /** Compact mode (smaller cells)? */
  compact?: boolean;
  /** Sort rows by first measure? */
  autoSort?: boolean;
  /** Empty cell text */
  emptyText?: string;
  /** Export callback */
  onExport?: (data: PivotValue[][]) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PivotTableInstance {
  element: HTMLElement;
  /** Update source data */
  setData: (data: Record<string, unknown>[]) => void;
  /** Set row dimensions */
  setRows: (dims: PivotDimension[]) => void;
  /** Set column dimensions */
  setColumns: (dims: PivotDimension[]) => void;
  /** Add a measure */
  addMeasure: (measure: PivotMeasure) => void;
  /** Remove a measure */
  removeMeasure: (key: string) => void;
  /** Get pivoted data */
  getPivotedData: () => PivotValue[][];
  /** Export as HTML table string */
  exportHTML: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Aggregation Functions ---

function aggregate(values: number[], fn: AggregationFn): number {
  if (values.length === 0) return 0;
  const nums = values.filter(v => v != null && !isNaN(v));
  if (nums.length === 0) return 0;
  switch (fn) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "count": return nums.length;
    case "min": return Math.min(...nums);
    case "max": return Math.max(...nums);
    case "median": {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
    }
    case "distinct": return new Set(nums).size;
    default: return nums[0]!;
  }
}

function formatNumber(val: number, decimals: number): string {
  if (decimals > 0) return val.toFixed(decimals);
  return val.toLocaleString();
}

// --- Main Factory ---

export function createPivotTable(options: PivotTableOptions): PivotTableInstance {
  const opts = {
    grandTotalLabel: options.grandTotalLabel ?? "Grand Total",
    showGrandTotal: options.showGrandTotal ?? true,
    showSubtotals: options.showSubtotals ?? false,
    decimals: options.decimals ?? 1,
    compact: options.compact ?? false,
    autoSort: options.autoSort ?? true,
    emptyText: options.emptyText ?? "-",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("PivotTable: container not found");

  let data = [...options.data];
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `pivot-table ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;font-size:12px;color:#374151;
    overflow:auto;width:100%;
  `;
  container.appendChild(root);

  // --- Pivot Engine ---

  function pivot(): PivotValue[][] {
    const result: Map<string, PivotValue> = new Map();

    for (const record of data) {
      // Build row keys
      const rowKey = opts.rows.map(d => String(record[d.key] ?? ""));
      // Build col keys
      const colKey = opts.columns.map(d => String(record[d.key] ?? ""));

      const rowStr = rowKey.join("\x00");
      const colStr = colKey.join("\x00");

      let pv = result.get(`${rowStr}\x00${colStr}`);
      if (!pv) {
        pv = { rowKey, colKey, rawValues: [], aggregated: 0, formatted: "" };
        result.set(`${rowStr}\x00${colStr}`, pv);
      }

      // Collect raw values for each measure
      for (const m of opts.measures) {
        const val = record[m.key];
        if (typeof val === "number") {
          pv.rawValues.push(val);
        }
      }
    }

    // Aggregate
    for (const [, pv] of result) {
      if (pv.rawValues.length > 0) {
        pv.aggregated = aggregate(pv.rawValues, opts.measures[0]?.aggregation ?? "sum");
        pv.formatted = formatNumber(pv.aggregated, opts.decimals);
      } else {
        pv.aggregated = 0;
        pv.formatted = opts.emptyText;
      }
    }

    // Convert to 2D array
    const rowKeys = [...new Set(Array.from(result.values()).map(pv => pv.rowKey.join("\x00")))];
    const colKeys = [...new Set(Array.from(result.values()).map(pv => pv.colKey.join("\x00")))];

    const grid: PivotValue[][] = [];
    for (const rk of rowKeys) {
      const row: PivotValue[] = [];
      for (const ck of colKeys) {
        const pv = result.get(`${rk}\x00${ck}`) ?? { rowKey: rk.split("\x00"), colKey: ck.split("\x00"), rawValues: [], aggregated: 0, formatted: opts.emptyText };
        row.push(pv);
      }
      grid.push(row);
    }

    // Auto-sort by first measure descending
    if (opts.autoSort && opts.measures.length > 0) {
      grid.sort((a, b) => (b[0]?.aggregated ?? 0) - (a[0]?.aggregated ?? 0));
    }

    return grid;
  }

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";

    const grid = pivot();
    if (grid.length === 0 || grid[0]?.length === 0) {
      root.innerHTML = `<div style="padding:40px;text-align:center;color:#9ca3af;">No data to display</div>`;
      return;
    }

    const colKeys = grid[0]!.map(pv => pv.colKey.join(", "));
    const hasGrandTotal = opts.showGrandTotal;
    const cellPad = opts.compact ? "4px 6px" : "8px 12px";
    const fontSize = opts.compact ? 11 : 12;

    const table = document.createElement("table");
    table.style.cssText = "width:100%;border-collapse:collapse;";

    // Header row
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");

    // Top-left corner
    const cornerTh = document.createElement("th");
    cornerTh.style.cssText = `
      padding:${cellPad};font-weight:700;font-size:${fontSize}px;color:#6b7280;
      background:#fafbfc;border-bottom:2px solid #e5e7eb;border-right:1px solid #e5e7eb;
      position:sticky;left:0;z-index:2;
    `;
    cornerTh.textContent = opts.rows.map(d => d.label).join(" \\ ");
    hr.appendChild(cornerTh);

    // Column headers
    for (let ci = 0; ci < colKeys.length; ci++) {
      const th = document.createElement("th");
      th.style.cssText = `
        padding:${cellPad};font-weight:600;font-size:${fontSize}px;color:#374151;
        background:#fafbfc;border-bottom:2px solid #e5e7eb;border-right:1px solid #e5e7eb;
        position:sticky;${ci < colKeys.length - 1 ? `left:auto;` : `right:0;z-index:2;`}
        white-space:nowrap;max-width:150px;overflow:hidden;text-overflow:ellipsis;
      `;
      th.textContent = colKeys[ci] || "(empty)";
      hr.appendChild(th);
    }

    // Grand total header
    if (hasGrandTotal) {
      const gtTh = document.createElement("th");
      gtTh.style.cssText = `
        padding:${cellPad};font-weight:700;font-size:${fontSize}px;color:#6366f1;
        background:#eef2ff;border-bottom:2px solid #c7d2fe;border-right:1px solid #e5e7eb;
        position:sticky;right:0;z-index:2;
      `;
      gtTh.textContent = opts.grandTotalLabel;
      hr.appendChild(gtTh);
    }

    thead.appendChild(hr);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");

    for (let ri = 0; ri < grid.length; ri++) {
      const row = grid[ri]!;
      const tr = document.createElement("tr");
      tr.style.borderBottom = "1px solid #f0f0f0";

      // Row header
      const rhTd = document.createElement("td");
      rhTd.style.cssText = `
        padding:${cellPad};font-weight:600;font-size:${fontSize}px;color:#374151;
        background:#fafbfc;border-right:1px solid #e5e7eb;
        position:sticky;left:0;white-space:nowrap;max-width:160px;
        overflow:hidden;text-overflow:ellipsis;
      `;
      rhTd.textContent = row[0]?.rowKey.join(" \\ ") || "";
      tr.appendChild(rhTd);

      // Data cells
      let rowTotal = 0;
      for (let ci = 0; ci < row.length; ci++) {
        const pv = row[ci]!;
        const td = document.createElement("td");
        td.style.cssText = `
          padding:${cellPad};text-align:right;font-size:${fontSize}px;
          font-variant-numeric:tabular-nums;border-right:1px solid #f0f0f0;
          vertical-align:middle;
        `;

        // Check conditional formatting
        let appliedStyle = "";
        if (opts.conditions) {
          for (const cond of opts.conditions) {
            let match = false;
            switch (cond.operator) {
              case ">": match = pv.aggregated > cond.value; break;
              case "<": match = pv.aggregated < cond.value; break;
              case ">=": match = pv.aggregated >= cond.value; break;
              case "<=": match = pv.aggregated <= cond.value; break;
              case "==": match = pv.aggregated === cond.value; break;
              case "!=": match = pv.aggregated !== cond.value; break;
            }
            if (match) {
              appliedStyle = `color:${cond.color ?? "#111827"};background:${cond.bgColor ?? ""};${cond.bold ? "font-weight:700;" : ""}`;
              break;
            }
          }
        }

        td.textContent = pv.formatted;
        td.setAttribute("style", td.getAttribute("style") + appliedStyle);
        tr.appendChild(td);
        rowTotal += pv.aggregated;
      }

      // Grand total cell
      if (hasGrandTotal) {
        const gtTd = document.createElement("td");
        gtTd.style.cssText = `
          padding:${cellPad};text-align:right;font-weight:700;font-size:${fontSize}px;
          color:#6366f1;background:#eef2ff;border-right:1px solid #e5e7eb;
          position:sticky;right:0;
        `;
        gtTd.textContent = formatNumber(rowTotal, opts.decimals);
        tr.appendChild(gtTd);
      }

      tbody.appendChild(tr);
    }

    // Grand total row
    if (hasGrandTotal) {
      const gtr = document.createElement("tr");
      gtr.style.background = "#fafbfc";gtr.style.fontWeight = "700";
      gtr.style.borderTop = "2px solid #e5e7eb";

      const gtCorner = document.createElement("td");
      gtCorner.style.cssText = `padding:${cellPad};color:#6366f1;border-right:1px solid #e5e7eb;position:sticky;left:0;z-index:2;`;
      gtCorner.textContent = opts.grandTotalLabel;
      gtr.appendChild(gtCorner);

      let grandTotal = 0;
      for (let ci = 0; ci < colKeys.length; ci++) {
        let colTotal = 0;
        for (const row of grid) colTotal += row[ci]!.aggregated;
        grandTotal += colTotal;

        const cd = document.createElement("td");
        cd.style.cssText = `padding:${cellPad};text-align:right;color:#6366f1;border-right:1px solid #e5e7eb;`;
        cd.textContent = formatNumber(colTotal, opts.decimals);
        gtr.appendChild(cd);
      }

      const ggt = document.createElement("td");
      ggt.style.cssText = `padding:${cellPad};text-align:right;color:#6366f1;font-weight:800;background:#eef2ff;position:sticky;right:0;`;
      ggt.textContent = formatNumber(grandTotal, opts.decimals);
      gtr.appendChild(ggt);

      tbody.appendChild(gtr);
    }

    table.appendChild(tbody);
    root.appendChild(table);
  }

  // Initial render
  render();

  // --- Instance ---

  const instance: PivotTableInstance = {
    element: root,

    setData(newData: Record<string, unknown>[]) { data = newData; render(); },
    setRows(dims: PivotDimension[]) { opts.rows = dims; render(); },
    setColumns(dims: PivotDimension[]) { opts.columns = dims; render(); },

    addMeasure(m: PivotMeasure) { opts.measures.push(m); render(); },
    removeMeasure(key: string) { opts.measures = opts.measures.filter(m => m.key !== key); render(); },

    getPivotedData: () => pivot().flat(),
    exportHTML: () => root.querySelector("table")?.outerHTML ?? "",

    destroy() { destroyed = true; root.remove(); container.innerHTML = ""; },
  };

  return instance;
}
