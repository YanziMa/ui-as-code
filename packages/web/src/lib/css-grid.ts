/**
 * CSS Grid layout utilities: responsive grid generator, template helpers,
 * minmax functions, gap utilities, named area definitions,
 * auto-fit/fill helpers, and breakpoint-aware grid patterns.
 */

// --- Types ---

export interface GridTemplate {
  columns: string;
  rows: string;
  areas?: string;
  gap?: string;
}

export interface GridOptions {
  /** Number of columns (auto if omitted) */
  columns?: number | string;
  /** Column width (e.g., "200px", "1fr", "minmax(200px, 1fr)") */
  columnWidth?: string;
  /** Number of rows */
  rows?: number | string;
  /** Row height */
  rowHeight?: string;
  /** Gap between items */
  gap?: string;
  /** Row gap */
  rowGap?: string;
  /** Column gap */
  columnGap?: string;
  /** Justify content */
  justifyItems?: "start" | "end" | "center" | "stretch";
  /** Align content */
  alignContent?: "start" | "end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly";
  /** Place items */
  placeItems?: "start" | "end" | "center" | "stretch";
  /** Named grid areas */
  areas?: Record<string, string>;
  /** Auto-fit vs auto-fill */
  fillMode?: "fit" | "fill" | "none";
  /** Minimum column width for auto-fit/fill */
  minColumnWidth?: string;
  /** Maximum columns before wrapping */
  maxColumns?: number;
  /** Responsive breakpoints */
  responsive?: Record<string, Partial<GridOptions>>;
}

export interface GridStyles {
  display: string;
  gridTemplateColumns: string;
  gridTemplateRows: string;
  gridGap?: string;
  rowGap?: string;
  columnGap?: string;
  justifyContent?: string;
  alignContent?: string;
  alignItems?: string;
  placeItems?: string;
  gridTemplateAreas?: string;
}

// --- Template Generators ---

/** Generate repeat() value for N tracks */
export function repeat(count: number | "auto-fill" | "auto-fit", size = "1fr"): string {
  return `repeat(${count}, ${size})`;
}

/** Generate a fixed-column grid template */
export function fixedGrid(columns: number, rowHeight = "auto", gap = "1rem"): GridTemplate {
  return {
    columns: repeat(columns, "1fr"),
    rows: repeat(rowHeight === "auto" ? "auto" : rowHeight),
    gap,
  };
}

/** Generate an auto-fit grid that adapts to content */
export function autoFitGrid(
  minColWidth = "200px",
  maxCols = Infinity,
  gap = "1rem",
): GridTemplate {
  return {
    columns: `repeat(auto-fit, minmax(${minColWidth}, 1fr))`,
    rows: "auto",
    gap,
  };
}

/** Generate an auto-fill grid that fills available space */
export function autoFillGrid(
  colWidth = "1fr",
  maxCols = Infinity,
  gap = "1rem",
): GridTemplate {
  return {
    columns: `repeat(auto-fill, ${colWidth})`,
    rows: "auto",
    gap,
  };
}

/** Generate a masonry-style grid (using dense packing) */
export function masonryGrid(columnCount = 3, gap = "1rem"): GridTemplate {
  return {
    columns: repeat(columnCount, "1fr"),
    rows: "auto",
    gap,
  };
}

// --- MinMax Helpers ---

/** Create a minmax() value with optional preferred size */
export function minmax(min: string | number, max?: string | number): string {
  const minVal = typeof min === "number" ? `${min}px` : min;
  const maxVal = max ? (typeof max === "number" ? `${max}px` : max) : undefined;
  return maxVal ? `minmax(${minVal}, ${maxVal})` : `minmax(${minVal}, 100%)`;
}

/** Create a minmax with auto as max */
export function flexible(min: string | number): string {
  return minmax(min, "auto");
}

/** Common minmax presets */
export const MINMAX = {
  content: () => minmax("min-content", "1fr"),
  readable: () => minmax("300px", "700px"),
  sidebar: () => minmax("200px", "300px"),
  narrow: () => minmax("100px", "200px"),
  wide: () => minmax("400px", "800px"),
} as const;

// --- Gap Utilities ---

/** Normalize gap value (adds unit if needed) */
export function normalizeGap(gap: number | string): string {
  return typeof gap === "number" ? `${gap}px` : gap;
}

/** Generate consistent gap for both axes */
export function uniformGap(gap: number | string): { rowGap: string; columnGap: string } {
  const g = normalizeGap(gap);
  return { rowGap: g, columnGap: g };
}

/** Asymmetric gap */
export function asymmetricGap(rowGap: number | string, colGap: number | string): { rowGap: string; columnGap: string } {
  return { rowGap: normalizeGap(rowGap), columnGap: normalizeGap(colGap) };
}

// --- Named Areas ---

/**
 * Define named grid areas using ASCII-art-like syntax.
 *
 * ```ts
 * defineAreas({
 *   header: '"header header header"',
 *   sidebar: '"sidebar sidebar sidebar"',
 *   main: '"main main main"',
 *   footer: '"footer footer footer"',
 * })
 * ```
 */
export function defineAreas(areas: Record<string, string>): string {
  return Object.entries(areas)
    .map(([name, template]) => `"${name}" ${template}`)
    .join("\n");
}

/** Common 12-area grid layout (header + sidebar + main + footer) */
export function layout12Area(
  sidebarWidth = "250px",
  headerHeight = "60px",
  footerHeight = "40px",
): string {
  return defineAreas({
    header: `"${headerHeight}" "${headerHeight}" "${headerHeight}"`,
    sidebar: `"${sidebarWidth}" "${sidebarWidth}" "${sidebarWidth}"`,
    main: `"${sidebarWidth}" "1fr" "1fr"`,
    footer: `"${footerHeight}" "${footerHeight}" "${footerHeight}"`,
  });
}

/** Holy grail layout (header + nav + article + aside + footer) */
export function holyGrail(
  navWidth = "200px",
  asideWidth = "250px,
): string {
  return defineAreas({
    header: `"1fr" "auto" "1fr"`,
    nav: `"${navWidth}" "1fr" "1fr"`,
    article: `"${navWidth}" "1fr" "${asideWidth}"`,
    aside: `"${asideWidth}" "1fr" "1fr"`,
    footer: `"1fr" "auto" "1fr"`,
  });
}

// --- Style Generator ---

/** Convert GridOptions to CSS style object */
export function generateGridStyles(options: GridOptions): GridStyles {
  const cols = resolveColumns(options);
  const rows = resolveRows(options);
  const gap = options.gap ?? options.rowGap ?? options.columnGap;

  const styles: GridStyles = {
    display: "grid",
    gridTemplateColumns: cols,
    gridTemplateRows: rows,
    justifyContent: options.justifyItems,
    alignContent: options.alignContent,
    alignItems: options.alignItems,
    placeItems: options.placeItems,
  };

  if (gap) styles.gridGap = normalizeGap(gap);
  if (options.rowGap && !options.columnGap && gap) styles.rowGap = normalizeGap(options.rowGap);
  if (options.columnGap && !options.rowGap && gap) styles.columnGap = normalizeGap(options.columnGap);

  if (options.areas && Object.keys(options.areas).length > 0) {
    styles.gridTemplateAreas = defineAreas(options.areas);
  }

  return styles;
}

/** Apply grid styles to an element and return cleanup function */
export function applyGrid(element: HTMLElement, options: GridOptions): () => void {
  const styles = generateGridStyles(options);
  Object.assign(element.style, styles);

  // Return cleanup function
  return () => {
    element.style.display = "";
    element.style.gridTemplateColumns = "";
    element.style.gridTemplateRows = "";
    element.style.gridGap = "";
    element.style.justifyContent = "";
    element.style.alignContent = "";
    element.style.alignItems = "";
    element.style.placeItems = "";
    element.style.gridTemplateAreas = "";
  };
}

// --- Responsive Helpers ---

/** Generate media-query-based responsive grid overrides */
export function responsiveGrid(base: GridOptions, breakpoints: Record<string, Partial<GridOptions>>): Record<string, GridStyles> {
  const result: Record<string, GridStyles> = {};
  const baseStyles = generateGridStyles(base);

  for (const [bp, overrides] of Object.entries(breakpoints)) {
    result[bp] = { ...baseStyles, ...generateGridStyles({ ...base, ...overrides }) };
  }

  return result;
}

/** Common responsive breakpoints */
export const BREAKPOINTS = {
  xs: "480px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

/** Generate @media query for a breakpoint */
export function mediaQuery(breakpoint: keyof typeof BREAKPOINTS, rule: string): string {
  return `@media (min-width: ${BREAKPOINTS[breakpoint]}) { ${rule} }`;
}

/** Generate responsive grid that adapts at breakpoints */
export function adaptiveGrid(
  baseOptions: GridOptions,
  breakpoints: {
    sm?: Partial<GridOptions>;
    md?: Partial<GridOptions>;
    lg?: Partial<GridOptions>;
    xl?: Partial<GridOptions>;
  },
): { base: GridStyles; responsive: Record<string, GridStyles> } {
  return {
    base: generateGridStyles(baseOptions),
    responsive: responsiveGrid(baseOptions, breakpoints ?? {}),
  };
}

// --- Internal ---

function resolveColumns(opts: GridOptions): string {
  if (opts.columns !== undefined) {
    if (typeof opts.columns === "number") return repeat(opts.columns, opts.columnWidth ?? "1fr");
    return String(opts.columns);
  }
  switch (opts.fillMode) {
    case "fit": return `repeat(auto-fit, ${opts.minColumnWidth ?? "200px"})`;
    case "fill": return `repeat(auto-fill, ${opts.columnWidth ?? "1fr"})`;
    default: return "1fr";
  }
}

function resolveRows(opts: GridOptions): string {
  if (opts.rows !== undefined) {
    if (typeof opts.rows === "number") return repeat(opts.rows, opts.rowHeight ?? "auto");
    return String(opts.rows);
  }
  return "auto";
}
