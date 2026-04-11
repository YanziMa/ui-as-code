/**
 * Layout Grid: CSS Grid layout manager with responsive breakpoints,
 * auto-fit/fill, gap control, area templates, drag-to-resize,
 * and grid inspection utilities.
 *
 * Provides:
 *   - Declarative grid configuration (columns, rows, gaps, areas)
 *   - Responsive breakpoint-based layouts
 *   - Grid item placement API
 *   - Auto-responsive grids with minmax
 *   - Grid template string builder
 *   - DOM-based grid inspector for debugging
 */

// --- Types ---

export interface GridConfig {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions (CSS grid-template-columns values) */
  columns?: string | string[];
  /** Row definitions */
  rows?: string | string[];
  /** Gap between items */
  gap?: string | { row: string; column: string };
  /** Named grid areas */
  areas?: string[];
  /** Justify items */
  justifyItems?: "start" | "end" | "center" | "stretch";
  /** Align items */
  alignItems?: "start" | "end" | "center" | "stretch";
  /** Justify content */
  justifyContent?: "start" | "end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly";
  /** Align content */
  alignContent?: "start" | "end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly";
  /** Auto flow direction */
  autoFlow?: "row" | "column" | "dense" | "row dense" | "column dense";
  /** Min column width for auto-fit/fill */
  minColumnWidth?: string;
  /** Max number of columns for auto grids */
  maxColumns?: number;
  /** Custom CSS class */
  className?: string;
  /** Inline style overrides */
  style?: Partial<CSSStyleDeclaration>;
}

export interface GridItemOptions {
  /** Element to place in the grid */
  element: HTMLElement;
  /** Column start/end */
  column?: string | { start: number; end: number };
  /** Row start/end */
  row?: string | { start: number; end: number };
  /** Named area to place into */
  area?: string;
  /** Justify self */
  justifySelf?: "start" | "end" | "center" | "stretch";
  /** Align self */
  alignSelf?: "start" | "end" | "center" | "stretch";
  /** Order in the flow */
  order?: number;
}

export interface BreakpointLayout {
  /** Minimum width for this breakpoint (px) */
  minWidth: number;
  /** Grid config for this breakpoint */
  config: Partial<GridConfig>;
}

export interface GridLayoutInstance {
  /** The grid container element */
  element: HTMLElement;
  /** Add an item to the grid */
  addItem: (options: GridItemOptions) => void;
  /** Remove an item from the grid */
  removeItem: (element: HTMLElement) => void;
  /** Update grid configuration */
  updateConfig: (config: Partial<GridConfig>) => void;
  /** Set responsive breakpoints */
  setBreakpoints: (breakpoints: BreakpointLayout[]) => void;
  /** Get current computed grid info */
  getInfo: () => GridInfo;
  /** Destroy the grid */
  destroy: () => void;
}

export interface GridInfo {
  columnCount: number;
  rowCount: number;
  gap: { row: number; column: number };
  containerSize: { width: number; height: number };
}

// --- Main Factory ---

export function createGridLayout(config: GridConfig): GridLayoutInstance {
  const opts = {
    gap: "16px",
    justifyContent: "start",
    alignContent: "start",
    autoFlow: "row",
    minColumnWidth: "200px",
    maxColumns: Infinity,
    ...config,
  };

  const container = typeof config.container === "string"
    ? document.querySelector<HTMLElement>(config.container)
    : config.container;

  if (!container) throw new Error("GridLayout: container not found");

  const el = document.createElement("div");
  el.className = `layout-grid ${opts.className ?? ""}`;
  applyGridStyles(el, opts);
  container.appendChild(el);

  let breakpoints: BreakpointLayout[] = [];
  let breakpointObserver: ResizeObserver | null = null;
  let currentBreakpoint = -1;

  // --- Apply Styles ---

  function applyGridStyles(target: HTMLElement, c: typeof opts): void {
    const gapVal = typeof c.gap === "string" ? c.gap : `${c.gap.row} ${c.gap.column}`;

    Object.assign(target.style, {
      display: "grid",
      gridTemplateColumns: resolveColumns(c),
      gridTemplateRows: resolveRows(c),
      gap: gapVal,
      justifyItems: c.justifyItems ?? "stretch",
      alignItems: c.alignItems ?? "stretch",
      justifyContent: c.justifyContent,
      alignContent: c.alignContent,
      gridAutoFlow: c.autoFlow,
      ...c.style,
    } as CSSStyleDeclaration);

    if (c.areas?.length) {
      target.style.gridTemplateAreas = c.areas.map((a) => `"${a}"`).join(" ");
    }
  }

  function resolveColumns(c: typeof opts): string {
    if (Array.isArray(c.columns)) return c.columns.join(" ");
    if (typeof c.columns === "string") return c.columns;

    // Auto-responsive
    const minW = c.minColumnWidth ?? "200px";
    return `repeat(auto-fill, minmax(${minW}, 1fr))`;
  }

  function resolveRows(c: typeof opts): string {
    if (Array.isArray(c.rows)) return c.rows.join(" ");
    return c.rows ?? "auto";
  }

  // --- Item Management ---

  function addItem(options: GridItemOptions): void {
    const { element } = options;

    // Apply placement styles
    if (options.column) {
      if (typeof options.column === "string") {
        element.style.gridColumn = options.column;
      } else {
        element.style.gridColumn = `${options.column.start} / ${options.column.end}`;
      }
    }

    if (options.row) {
      if (typeof options.row === "string") {
        element.style.gridRow = options.row;
      } else {
        element.style.gridRow = `${options.row.start} / ${options.row.end}`;
      }
    }

    if (options.area) element.style.gridArea = options.area;
    if (options.justifySelf) element.style.justifySelf = options.justifySelf;
    if (options.alignSelf) element.style.alignSelf = options.alignSelf;
    if (options.order !== undefined) element.style.order = String(options.order);

    el.appendChild(element);
  }

  function removeItem(element: HTMLElement): void {
    element.remove();
  }

  // --- Config Update ---

  function updateConfig(partial: Partial<GridConfig>): void {
    Object.assign(opts, partial);
    applyGridStyles(el, opts);
  }

  // --- Responsive Breakpoints ---

  function setBreakpoints(bps: BreakpointLayout[]): void {
    breakpoints = bps.sort((a, b) => a.minWidth - b.minWidth);

    if (breakpointObserver) breakpointObserver.disconnect();

    breakpointObserver = new ResizeObserver(() => {
      const width = el.clientWidth;
      let matchedIdx = -1;

      for (let i = breakpoints.length - 1; i >= 0; i--) {
        if (width >= breakpoints[i]!.minWidth) { matchedIdx = i; break; }
      }

      if (matchedIdx !== currentBreakpoint && matchedIdx >= 0) {
        currentBreakpoint = matchedIdx;
        updateConfig(breakpoints[matchedIdx]!.config);
      } else if (matchedIdx === -1 && currentBreakpoint >= 0) {
        // Below all breakpoints — revert to base config
        currentBreakpoint = -1;
        updateConfig(config);
      }
    });

    breakpointObserver.observe(el);
  }

  // --- Info ---

  function getInfo(): GridInfo {
    const cs = getComputedStyle(el);
    const gapParts = cs.gap.split(" ").map((g) => parseInt(g, 10) || 0);

    return {
      columnCount: cs.gridTemplateColumns.split(" ").filter(Boolean).length,
      rowCount: cs.gridTemplateRows.split(" ").filter(Boolean).length,
      gap: { row: gapParts[0] || 0, column: gapParts[1] || gapParts[0] || 0 },
      containerSize: { width: el.clientWidth, height: el.clientHeight },
    };
  }

  // --- Destroy ---

  function destroy(): void {
    if (breakpointObserver) { breakpointObserver.disconnect(); breakpointObserver = null; }
    el.remove();
  }

  return {
    get element() { return el; },
    addItem,
    removeItem,
    updateConfig,
    setBreakpoints,
    getInfo,
    destroy,
  };
}

// --- Template Builders ---

/** Build a 12-column grid template string */
export function build12ColTemplate(spanMap: Record<string, number>): string[] {
  const cols = Array(12).fill(".");
  for (const [name, span] of Object.entries(spanMap)) {
    let placed = 0;
    for (let i = 0; i < 12 && placed < span; i++) {
      if (cols[i] === ".") { cols[i] = name; placed++; }
    }
  }
  return [`"${cols.join(" ")}"`];
}

/** Build common layout patterns as grid configs */
export const gridPatterns = {
  twoEqual: { columns: "1fr 1fr", gap: "16px" },
  threeEqual: { columns: "1fr 1fr 1fr", gap: "16px" },
  sidebarMain: { columns: "280px 1fr", gap: "24px" },
  mainSidebar: { columns: "1fr 280px", gap: "24px" },
  holyGrail: {
    columns: "auto 1fr auto",
    areas: ['"header header header"', '"nav main ads"', '"footer footer footer"'],
    gap: "16px",
  },
  dashboard: {
    columns: "240px 1fr",
    rows: "auto 1fr auto",
    areas: ['"header header"', '"sidebar main"', '"footer footer"'],
    gap: "0",
  },
  masonry: { columns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", alignContent: "start" },
  autoResponsive: { columns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))", gap: "16px" },
} as const;
