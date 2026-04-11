/**
 * Mosaic Plot: Mosaic/Marimekko plot for categorical data with variable-
 * width columns, nested row splits, area-proportional representation,
 * color coding, marginal totals, and tooltips.
 */

// --- Types ---

export interface MosaicCategory {
  key: string;
  label: string;
  values: string[];
}

export interface MosaicCell {
  /** Column category value */
  col: string;
  /** Row category value */
  row: string;
  count: number;
  color?: string;
  percentage?: number;
  label?: string;
}

export interface MosaicPlotOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Cell data */
  cells: MosaicCell[];
  /** Column dimension definition */
  columnDim: MosaicCategory;
  /** Row dimension definition */
  rowDim: MosaicCategory;
  /** Width (px) */
  width?: number;
  /** Height (px) */
  height?: number;
  /** Gap between cells (px) */
  gap?: number;
  /** Cell border radius */
  borderRadius?: number;
  /** Cell border color */
  borderColor?: string;
  /** Color scale ("category" | "sequential" | "heatmap" | custom) */
  colorScale?: string;
  /** Custom color palette */
  colors?: string[];
  /** Show cell labels? */
  showCellLabels?: boolean;
  /** Show percentages? */
  showPercentages?: boolean;
  /** Show marginal bars (column/row totals)? */
  showMarginals?: boolean;
  /** Marginal bar color */
  marginalColor?: string;
  /** Tooltip enabled? */
  tooltip?: boolean;
  /** Cell click callback */
  onCellClick?: (cell: MosaicCell, event: MouseEvent) => void;
  /** Cell hover callback */
  onCellHover?: (cell: MosaicCell | null) => void;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Padding */
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
  /** Custom CSS class */
  className?: string;
}

export interface MosaicInstance {
  element: SVGElement;
  /** Update cell data */
  setCells: (cells: MosaicCell[]) => void;
  /** Get computed layout info */
  getLayout: () => { cols: Map<string, { x: number; w: number; total: number }>; rows: Map<string, { total: number }> };
  /** Export as SVG string */
  exportSVG: () => string;
  /** Destroy */
  destroy: () => void;
}

// --- Colors ---

const CATEGORICAL_COLORS = [
  "#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f",
  "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac",
];

const SEQUENTIAL_COLORS = ["#fde8e8", "#fcd1d1", "#fab8b8", "#f89d9d", "#f57c7c", "#ef4444"];

// --- Main Factory ---

export function createMosaicPlot(options: MosaicPlotOptions): MosaicInstance {
  const opts = {
    width: options.width ?? 600,
    height: options.height ?? 420,
    gap: options.gap ?? 2,
    borderRadius: options.borderRadius ?? 3,
    borderColor: options.borderColor ?? "#fff",
    colorScale: options.colorScale ?? "category",
    colors: options.colors ?? CATEGORICAL_COLORS,
    showCellLabels: options.showCellLabels ?? true,
    showPercentages: options.showPercentages ?? false,
    showMarginals: options.showMarginals ?? true,
    marginalColor: options.marginalColor ?? "#d1d5db",
    tooltip: options.tooltip ?? true,
    animationDuration: options.animationDuration ?? 500,
    padding: options.padding ?? { top: 30, right: 60, bottom: 40, left: 40 },
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("MosaicPlot: container not found");

  let cells: MosaicCell[] = JSON.parse(JSON.stringify(options.cells));
  let destroyed = false;

  const pad = opts.padding;
  const plotW = opts.width - pad.left! - pad.right!;
  const plotH = opts.height - pad.top! - pad.bottom!;
  const margW = opts.showMarginals ? 16 : 0;
  const effectivePlotW = plotW - margW;

  // SVG
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${opts.width} ${opts.height}`);
  svg.setAttribute("class", `mosaic-plot ${opts.className}`);
  svg.style.cssText = `width:${opts.width}px;height:${opts.height}px;display:block;font-family:-apple-system,sans-serif;`;

  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", String(opts.width)); bg.setAttribute("height", String(opts.height));
  bg.setAttribute("fill", "#fafbfc"); bg.setAttribute("rx", "6");
  svg.appendChild(bg);

  const gCells = document.createElementNS(ns, "g");
  svg.appendChild(gCells);

  const gMarginals = document.createElementNS(ns, "g");
  svg.appendChild(gMarginals);

  const gLabels = document.createElementNS(ns, "g");
  svg.appendChild(gLabels);

  // Tooltip
  const gTooltip = document.createElementNS(ns, "g");
  gTooltip.style.display = "none"; gTooltip.style.pointerEvents = "none";
  svg.appendChild(gTooltip);

  const ttBg = document.createElementNS(ns, "rect");
  ttBg.setAttribute("rx", "4"); ttBg.setAttribute("fill", "#1f2937"); ttBg.setAttribute("opacity", "0.9");
  gTooltip.appendChild(ttBg);

  const ttText = document.createElementNS(ns, "text");
  ttText.setAttribute("fill", "#fff"); ttText.setAttribute("font-size", "11");
  gTooltip.appendChild(ttText);

  container.appendChild(svg);

  // --- Layout Computation ---

  function computeLayout() {
    // Column totals
    const colTotals = new Map<string, number>();
    const grandTotal = cells.reduce((s, c) => s + c.count, 0) || 1;

    for (const c of cells) {
      colTotals.set(c.col, (colTotals.get(c.col) ?? 0) + c.count);
    }

    // Row totals per column
    const rowTotalsPerCol = new Map<string, Map<string, number>>();
    for (const c of cells) {
      if (!rowTotalsPerCol.has(c.col)) rowTotalsPerCol.set(c.col, new Map());
      rowTotalsPerCol.get(c.col)!.set(c.row, (rowTotalsPerCol.get(c.col)!.get(c.row) ?? 0) + c.count);
    }

    // Sort columns by total descending
    const sortedCols = [...colTotals.entries()].sort((a, b) => b[1] - a[1]);

    // Compute column widths
    const colLayout = new Map<string, { x: number; w: number; total: number }>();
    let cursorX = pad.left!;
    for (const [col, total] of sortedCols) {
      const w = (total / grandTotal) * effectivePlotW;
      colLayout.set(col, { x: cursorX, w, total });
      cursorX += w + opts.gap;
    }

    // Row totals globally
    const rowTotals = new Map<string, number>();
    for (const c of cells) {
      rowTotals.set(c.row, (rowTotals.get(c.row) ?? 0) + c.count);
    }

    return { colLayout, rowTotals, rowTotalsPerCol, grandTotal, sortedCols };
  }

  // --- Rendering ---

  function render(): void {
    gCells.innerHTML = ""; gMarginals.innerHTML = ""; gLabels.innerHTML = "";

    if (cells.length === 0) {
      const empty = document.createElementNS(ns, "text");
      empty.setAttribute("x", String(opts.width / 2)); empty.setAttribute("y", String(opts.height / 2));
      empty.setAttribute("text-anchor", "middle"); empty.setAttribute("fill", "#9ca3af");
      empty.textContent = "No data";
      gCells.appendChild(empty);
      return;
    }

    const { colLayout, rowTotals, rowTotalsPerCol, grandTotal, sortedCols } = computeLayout();

    // Get unique rows (sorted by total desc)
    const uniqueRows = [...rowTotals.entries()].sort((a, b) => b[1] - a[1]);
    const rowKeys = uniqueRows.map(([k]) => k);

    // Color index tracker
    let colorIdx = 0;
    const colorMap = new Map<string, string>();

    function getColor(cell: MosaicCell): string {
      if (cell.color) return cell.color;
      if (!colorMap.has(cell.row)) {
        colorMap.set(cell.row, opts.colors[colorIdx % opts.colors.length]);
        colorIdx++;
      }
      return colorMap.get(cell.row)!;
    }

    // Draw cells
    for (let ci = 0; ci < sortedCols.length; ci++) {
      const [colKey, colTotal] = sortedCols[ci]!;
      const cl = colLayout.get(colKey)!;
      const rtMap = rowTotalsPerCol.get(colKey)!;

      // Get rows for this column, sorted by count desc
      const colRows = [...rtMap.entries()].sort((a, b) => b[1] - a[1]);
      let cursorY = pad.top!;

      for (let ri = 0; ri < colRows.length; ri++) {
        const [rowKey, rowTotal] = colRows[ri]!;
        const h = (rowTotal / colTotal) * plotH;
        const cell = cells.find(c => c.col === colKey && c.row === rowKey);

        if (!cell) { cursorY += h + opts.gap; continue; }

        const color = getColor(cell);
        const pct = ((cell.count / grandTotal) * 100).toFixed(1);

        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", String(cl.x));
        rect.setAttribute("y", String(pad.top! + plotH)); // animate from bottom
        rect.setAttribute("w", String(cl.w - opts.gap));
        rect.setAttribute("width", String(cl.w - opts.gap));
        rect.setAttribute("height", "0");
        rect.setAttribute("fill", color);
        rect.setAttribute("stroke", opts.borderColor);
        rect.setAttribute("stroke-width", "1");
        rect.setAttribute("rx", String(opts.borderRadius));
        rect.style.cursor = "pointer";

        // Animate
        requestAnimationFrame(() => {
          rect.animate(
            [{ height: "0", y: String(pad.top! + plotH) }, { height: `${h - opts.gap}px`, y: `${cursorY}px` }],
            { duration: opts.animationDuration, delay: (ci * 50 + ri * 30), easing: "ease-out", fill: "forwards" }
          );
        });

        rect.addEventListener("mouseenter", () => {
          rect.setAttribute("opacity", "0.85");
          showTooltip(cell, pct);
          opts.onCellHover?.(cell);
        });
        rect.addEventListener("mouseleave", () => {
          rect.removeAttribute("opacity");
          hideTooltip();
          opts.onCellHover?.(null);
        });
        rect.addEventListener("click", (e) => opts.onCellClick?.(cell, e));

        gCells.appendChild(rect);

        // Cell label
        if (opts.showCellLabels && h > 25) {
          const lbl = document.createElementNS(ns, "text");
          lbl.setAttribute("x", String(cl.x + (cl.w - opts.gap) / 2));
          lbl.setAttribute("y", String(cursorY + (h - opts.gap) / 2));
          lbl.setAttribute("text-anchor", "middle"); lbl.setAttribute("dominant-baseline", "middle");
          lbl.setAttribute("fill", "#fff"); lbl.setAttribute("font-size", "11");
          lbl.setAttribute("font-weight", "600"); lbl.setAttribute("pointer-events", "none");
          lbl.textContent = opts.showPercentages ? `${pct}%` : String(cell.count);
          gLabels.appendChild(lbl);
        }

        cursorY += h + opts.gap;
      }

      // Column marginal (right side)
      if (opts.showMarginals) {
        const mg = document.createElementNS(ns, "rect");
        mg.setAttribute("x", String(cl.x + cl.w - opts.gap));
        mg.setAttribute("y", String(pad.top));
        mg.setAttribute("width", String(margW));
        mg.setAttribute("h", String(plotH));
        mg.setAttribute("height", String(plotH));
        mg.setAttribute("fill", opts.marginalColor); mg.setAttribute("fill-opacity", "0.15");
        mg.setAttribute("rx", "2");
        gMarginals.appendChild(mg);

        // Column total label
        const clbl = document.createElementNS(ns, "text");
        clbl.setAttribute("x", String(cl.x + cl.w - opts.gap + margW / 2));
        clbl.setAttribute("y", String(pad.top! + plotH + 14));
        clbl.setAttribute("text-anchor", "middle"); clbl.setAttribute("fill", "#6b7280");
        clbl.setAttribute("font-size", "9"); clbl.setAttribute("font-weight", "600");
        clbl.textContent = `${colTotal}`;
        gLabels.appendChild(clbl);

        // Column header
        const chdr = document.createElementNS(ns, "text");
        chdr.setAttribute("x", String(cl.x + (cl.w - opts.gap) / 2));
        chdr.setAttribute("y", String(pad.top! - 10));
        chdr.setAttribute("text-anchor", "middle"); chdr.setAttribute("fill", "#374151");
        chdr.setAttribute("font-size", "11"); chdr.setAttribute("font-weight", "600");
        chdr.textContent = colKey;
        gLabels.appendChild(chdr);
      }
    }

    // Row headers (left side)
    if (opts.showMarginals) {
      let ryCursor = pad.top!;
      for (const [rowKey, rowTotal] of uniqueRows) {
        const rh = (rowTotal / grandTotal) * plotH;
        const rmg = document.createElementNS(ns, "rect");
        rmg.setAttribute("x", String(pad.left! - margW - opts.gap));
        rmg.setAttribute("y", String(ryCursor));
        rmg.setAttribute("width", String(margW));
        rmg.setAttribute("height", String(rh - opts.gap));
        rmg.setAttribute("fill", opts.marginalColor); rmg.setAttribute("fill-opacity", "0.15");
        rmg.setAttribute("rx", "2");
        gMarginals.appendChild(rmg);

        // Row label
        const rl = document.createElementNS(ns, "text");
        rl.setAttribute("x", String(pad.left! - margW / 2 - opts.gap / 2));
        rl.setAttribute("y", String(ryCursor + (rh - opts.gap) / 2));
        rl.setAttribute("text-anchor", "middle"); rl.setAttribute("dominant-baseline", "middle");
        rl.setAttribute("fill", "#374151"); rl.setAttribute("font-size", "10");
        rl.setAttribute("font-weight", "500");
        rl.setAttribute("transform", `rotate(-90, ${pad.left! - margW / 2 - opts.gap / 2}, ${ryCursor + (rh - opts.gap) / 2})`);
        rl.textContent = rowKey;
        gLabels.appendChild(rl);

        // Row total
        const rtl = document.createElementNS(ns, "text");
        rtl.setAttribute("x", String(pad.left! - 6));
        rtl.setAttribute("y", String(ryCursor + (rh - opts.gap) / 2));
        rtl.setAttribute("text-anchor", "end"); rtl.setAttribute("dominant-baseline", "middle");
        rtl.setAttribute("fill", "#6b7280"); rtl.setAttribute("font-size", "9");
        rtl.textContent = `${rowTotal}`;
        gLabels.appendChild(rtl);

        ryCursor += rh + opts.gap;
      }
    }
  }

  function showTooltip(cell: MosaicCell, pct: string): void {
    if (!opts.tooltip) return;
    ttText.textContent = `${cell.col} \u00D7 ${cell.row}\nCount: ${cell.count} (${pct}%)`;
    gTooltip.style.display = "block";
    requestAnimationFrame(() => {
      const bb = ttText.getBBox();
      const p = 6;
      ttBg.setAttribute("x", String(-bb.width / 2 - p));
      ttBg.setAttribute("y", String(-bb.height - p - 10));
      ttBg.setAttribute("width", String(bb.width + p * 2));
      ttBg.setAttribute("height", String(bb.height + p * 2));
      ttText.setAttribute("x", String(-bb.width / 2));
      ttText.setAttribute("y", String(-bb.height - 10 + bb.height / 2 + 4));
      gTooltip.setAttribute("transform", `translate(${opts.width / 2}, ${opts.height / 3})`);
    });
  }

  function hideTooltip(): void { gTooltip.style.display = "none"; }

  // Initial render
  render();

  // --- Public API ---

  const instance: MosaicInstance = {
    element: svg,

    setCells(newCells: MosaicCell[]) {
      cells = newCells.map(c => ({ ...c }));
      render();
    },

    getLayout: () => {
      const { colLayout, rowTotals } = computeLayout();
      return { cols: colLayout, rows: rowTotals };
    },

    exportSVG: () => svg.outerHTML,

    destroy() {
      destroyed = true;
      svg.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
