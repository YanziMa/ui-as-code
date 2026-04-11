/**
 * Grid Utilities: CSS Grid layout system, responsive grid generator,
 * grid gap utilities, auto-fit/fill helpers, grid area templates,
 * masonry-like layouts, and responsive breakpoint grids.
 */

// --- Types ---

export type GridColumns = number | string | Array<number | string>;
export type GridGap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | number;

export interface GridSystemOptions {
  /** Number of columns (default 12) */
  columns?: number;
  /** Gap between cells */
  gap?: GridGap;
  /** Max width of the grid container */
  maxWidth?: string | number;
  /** Horizontal padding */
  px?: GridGap | number;
  /** Vertical padding */
  py?: GridGap | number;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
}

export interface GridItemOptions {
  /** Column span (1-12 for 12-col grid) */
  colSpan?: number | "full";
  /** Column start position */
  colStart?: number;
  /** Column end position */
  colEnd?: number;
  /** Row span */
  rowSpan?: number;
  /** Alignment within cell */
  align?: "start" | "center" | "end" | "stretch";
  /** Justification within cell */
  justify?: "start" | "center" | "end" | "stretch";
  /** Offset (empty columns before this item) */
  offset?: number;
  /** Order value for visual reordering */
  order?: number;
}

export interface ResponsiveGridOptions extends GridSystemOptions {
  /** Breakpoint-specific column counts */
  breakpoints?: {
    sm?: { columns?: number; gap?: GridGap };
    md?: { columns?: number; gap?: GridGap };
    lg?: { columns?: number; gap?: GridGap };
    xl?: { columns?: number; gap?: GridGap };
  };
}

export interface GridLayout {
  container: HTMLElement;
  /** Add an item to the grid */
  addItem: (element: HTMLElement, options?: GridItemOptions) => void;
  /** Remove all items */
  clear: () => void;
  /** Destroy the grid */
  destroy: () => void;
}

// --- Gap Scale ---

const GAP_SCALE: Record<GridGap, string> = {
  none: "0",
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
};

function resolveGap(gap?: GridGap): string {
  if (gap === undefined) return GAP_SCALE.md;
  if (typeof gap === "number") return `${gap}px`;
  return GAP_SCALE[gap] ?? `${gap}px`;
}

// --- Core Grid System ---

/**
 * Create a CSS Grid system container.
 *
 * @example
 * ```ts
 * const grid = createGridSystem({ columns: 12, gap: "md" });
 * grid.addItem(el, { colSpan: 6 });
 * grid.addItem(el2, { colSpan: 4, offset: 2 });
 * ```
 */
export function createGridSystem(options: GridSystemOptions = {}): GridLayout {
  const {
    columns = 12,
    gap = "md",
    maxWidth,
    px,
    py,
    container,
    className,
  } = options;

  const root = document.createElement("div");
  root.className = `grid-system ${className ?? ""}`.trim();
  Object.assign(root.style, {
    display: "grid",
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: resolveGap(gap),
    width: maxWidth ? (typeof maxWidth === "number" ? `${maxWidth}px` : maxWidth) : "100%",
    boxSizing: "border-box" as const,
    ...(px !== undefined ? { paddingLeft: resolveGap(px), paddingRight: resolveGap(px) } : {}),
    ...(py !== undefined ? { paddingTop: resolveGap(py), paddingBottom: resolveGap(py) } : {}),
  });

  (container ?? document.body).appendChild(root);

  function addItem(element: HTMLElement, opts: GridItemOptions = {}): void {
    const style: Record<string, string> = {};

    // Column span
    if (opts.colSpan === "full") {
      style.gridColumn = `1 / -1`;
    } else if (opts.colSpan && opts.colSpan > 1) {
      style.gridColumn = `span ${Math.min(opts.colSpan, columns)}`;
    }

    // Explicit column start/end
    if (opts.colStart !== undefined || opts.colEnd !== undefined) {
      style.gridColumn = `${opts.colStart ?? "auto"} / ${opts.colEnd ?? "auto"}`;
    }

    // Row span
    if (opts.rowSpan && opts.rowSpan > 1) {
      style.gridRow = `span ${opts.rowSpan}`;
    }

    // Alignment
    if (opts.align) {
      style.alignSelf = opts.align === "stretch" ? "stretch" : `flex-${opts.align}`;
    }
    if (opts.justify) {
      style.justifySelf = opts.justify === "stretch" ? "stretch" : `flex-${opts.justify}`;
    }

    // Offset
    if (opts.offset && opts.offset > 0) {
      style.gridColumn = `${opts.offset + 1} / span ${Math.min(columns - opts.offset, columns)}`;
    }

    // Order
    if (opts.order !== undefined) {
      style.order = String(opts.order);
    }

    Object.assign(element.style, style);
    root.appendChild(element);
  }

  function clear(): void {
    root.innerHTML = "";
  }

  function destroy(): void {
    root.remove();
  }

  return { container: root, addItem, clear, destroy };
}

// --- Responsive Grid ---

/**
 * Create a responsive grid that adapts column count at breakpoints.
 */
export function createResponsiveGrid(options: ResponsiveGridOptions = {}): GridLayout {
  const baseGrid = createGridSystem(options);
  const { breakpoints } = options;

  if (!breakpoints) return baseGrid;

  // Inject responsive styles via media queries
  const styleEl = document.createElement("style");
  const gridId = baseGrid.container.id || `grid-${Date.now()}`;
  baseGrid.container.id = gridId;

  let css = "";
  const bpQueries: [string, string, typeof breakpoints.sm][] = [
    ["(min-width: 640px)", "sm", breakpoints.sm],
    ["(min-width: 768px)", "md", breakpoints.md],
    ["(min-width: 1024px)", "lg", breakpoints.lg],
    ["(min-width: 1280px)", "xl", breakpoints.xl],
  ];

  for (const [query, _bp, config] of bpQueries) {
    if (!config) continue;
    const rules: string[] = [];
    if (config.columns) rules.push(`grid-template-columns: repeat(${config.columns}, 1fr);`);
    if (config.gap) rules.push(`gap: ${resolveGap(config.gap)};`);
    if (rules.length > 0) {
      css += `@media ${query} { #${gridId} { ${rules.join(" ")} } }\n`;
    }
  }

  if (css) {
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // Override destroy to clean up style
  const originalDestroy = baseGrid.destroy;
  baseGrid.destroy = () => {
    styleEl.remove();
    originalDestroy();
  };

  return baseGrid;
}

// --- Auto-Fit / Fill Helpers ---

/** Generate CSS for an auto-fit grid with minmax columns */
export function autoFitGrid(
  minColumnWidth = 250,
  gap: GridGap = "md",
  maxColumns?: number,
): Record<string, string> {
  let template = `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`;
  if (maxColumns) template = `repeat(auto-fit, minmax(min(${minColumnWidth}px, ${(100 / maxColumns).toFixed(2)}%), 1fr))`;

  return {
    display: "grid",
    gridTemplateColumns: template,
    gap: resolveGap(gap),
  };
}

/** Generate CSS for an auto-fill grid (fills available space) */
export function autoFillGrid(
  columnWidth = 200,
  gap: GridGap = "md",
): Record<string, string> {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(${columnWidth}px, 1fr))`,
    gap: resolveGap(gap),
  };
}

// --- Grid Template Areas ---

/**
 * Create a grid using named template areas.
 *
 * @example
 * ```ts
 * createAreaGrid(container, {
 *   areas: ["header header header", "sidebar content content", "footer footer footer"],
 *   columns: "1fr 2fr 1fr",
 *   rows: "auto 1fr auto",
 *   gap: "sm",
 * });
 * ```
 */
export function createAreaGrid(
  container: HTMLElement,
  options: {
    areas: string[];
    columns: string;
    rows: string;
    gap?: GridGap;
  },
): HTMLElement {
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateAreas = options.areas.map((a) => `"${a}"`).join(" ");
  grid.style.gridTemplateColumns = options.columns;
  grid.style.gridTemplateRows = options.rows;
  grid.style.gap = resolveGap(options.gap ?? "md");
  container.appendChild(grid);
  return grid;
}

/** Place an element into a named grid area */
export function placeInArea(element: HTMLElement, areaName: string): void {
  element.style.gridArea = areaName;
}

// --- Masonry-like Layout ---

/**
 * Create a masonry-style layout using CSS columns (for equal-width items).
 * Falls back gracefully in older browsers.
 */
export function createMasonry(
  options: {
    columnCount?: number;
    columnWidth?: number;
    gap?: GridGap;
    container?: HTMLElement;
  } = {},
): { container: HTMLElement; addItem: (el: HTMLElement) => void; destroy: () => void } {
  const { columnCount = 3, columnWidth = 280, gap = "md", container } = options;

  const root = document.createElement("div");
  root.className = "masonry-layout";
  Object.assign(root.style, {
    display: "grid",
    gridTemplateColumns: `repeat(${columnCount}, ${columnWidth}px)`,
    gap: resolveGap(gap),
    gridAutoRows: "max-content",
    gridAutoFlow: "dense",
  });

  (container ?? document.body).appendChild(root);

  function addItem(el: HTMLElement): void {
    root.appendChild(el);
  }

  function destroy(): void {
    root.remove();
  }

  return { container: root, addItem, destroy };
}

// --- Grid Item Class Generators ---

/** Apply grid item styles directly to an element */
export function applyGridItem(element: HTMLElement, options: GridItemOptions): void {
  const style: Record<string, string> = {};

  if (options.colSpan === "full") style.gridColumn = "1 / -1";
  else if (options.colSpan) style.gridColumn = `span ${options.colSpan}`;

  if (options.offset) style.gridColumn = `${options.offset + 1} / span ${options.colSpan ?? 1}`;
  if (options.rowSpan) style.gridRow = `span ${options.rowSpan}`;
  if (options.align) style.alignSelf = options.align;
  if (options.justify) style.justifySelf = options.justify;
  if (options.order !== undefined) style.order = String(options.order);

  Object.assign(element.style, style);
}

/** Pre-built grid item classes for common span sizes (returns style object, not class names) */
export function gridSpan(n: number, total = 12): Record<string, string> {
  return { gridColumn: `span ${Math.min(n, total)}`;
}

/** Full-width grid item */
export const gridFull: Record<string, string> = { gridColumn: "1 / -1" };

/** Centered grid item (horizontal + vertical) */
export const gridCenter: Record<string, string> = {
  justifySelf: "center",
  alignSelf: "center",
};

// --- Grid Debug Helper ---

/** Overlay grid lines on a container for debugging layout */
export function showGridLines(gridEl: HTMLElement, color = "rgba(255, 0, 0, 0.15)"): () => void {
  const computed = getComputedStyle(gridEl);
  const cols = computed.gridTemplateColumns.split(" ").length;
  const rows = computed.gridTemplateRows.split(" ").length;

  const overlay = document.createElement("div");
  overlay.className = "grid-debug-overlay";
  overlay.style.cssText =
    "position:absolute;inset:0;pointer-events:none;z-index:9999;" +
    "display:grid;" +
    `grid-template-columns:${computed.gridTemplateColumns};` +
    `grid-template-rows:${computed.gridTemplateRows};` +
    `gap:${computed.gap};`;

  gridEl.style.position = gridEl.style.position || "relative";
  for (let i = 0; i < cols * rows; i++) {
    const cell = document.createElement("div");
    cell.style.backgroundColor = color;
    cell.style.border = "1px solid rgba(255,0,0,0.3)";
    cell.style.minHeight = "20px";
    overlay.appendChild(cell);
  }

  gridEl.appendChild(overlay);

  return () => overlay.remove();
}
