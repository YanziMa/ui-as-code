/**
 * Grid Layout Component: Responsive CSS Grid wrapper with configurable columns,
 * gaps, responsive breakpoints, item sizing, auto-fit/fill, and
 * masonry-like support for variable-height items.
 */

// --- Types ---

export type GridGap = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export type GridJustify = "start" | "center" | "end" | "stretch" | "space-between" | "space-around" | "space-evenly";
export type GridAlign = "start" | "center" | "end" | "stretch";

export interface GridItem<T = unknown> {
  /** Unique key */
  id: string;
  /** Content: string HTML or HTMLElement */
  content: string | HTMLElement;
  /** Span columns (1-based) */
  colSpan?: number;
  /** Span rows (1-based) */
  rowSpan?: number;
  /** Item data */
  data?: T;
}

export interface GridOptions<T = unknown> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Grid items */
  items?: GridItem<T>[];
  /** Number of columns (or CSS value like 'repeat(auto-fit, minmax(250px, 1fr))') */
  columns?: number | string;
  /** Gap size */
  gap?: GridGap | string | number;
  /** Horizontal justify */
  justifyItems?: GridJustify;
  /** Vertical align */
  alignItems?: GridAlign;
  /** Responsive breakpoints: { [maxWidth]: columns } */
  responsive?: Record<number, number>;
  /** Minimum column width for auto-fit (px) */
  minColWidth?: number;
  /** Maximum column width (px) */
  maxColWidth?: number;
  /** Equal height rows? */
  equalHeight?: boolean;
  /** Custom render function per item */
  renderItem?: (item: GridItem<T>, index: number) => HTMLElement;
  /** Callback on item click */
  onItemClick?: (item: GridItem<T>, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface GridInstance<T = unknown> {
  element: HTMLElement;
  getItems: () => GridItem<T>[];
  setItems: (items: GridItem<T>[]) => void;
  addItem: (item: GridItem<T>) => void;
  removeItem: (id: string) => void;
  updateColumns: (columns: number | string) => void;
  updateGap: (gap: GridGap | string | number) => void;
  destroy: () => void;
}

// --- Config ---

const GAP_MAP: Record<GridGap, string> = {
  none: "0",
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "32px",
};

// --- Main Factory ---

export function createGrid<T = unknown>(options: GridOptions<T>): GridInstance<T> {
  const opts = {
    columns: options.columns ?? 3,
    gap: options.gap ?? "md",
    justifyItems: options.justifyItems ?? "stretch",
    alignItems: options.alignItems ?? "stretch",
    equalHeight: options.equalHeight ?? true,
    minColWidth: options.minColWidth ?? 200,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Grid: container not found");

  let items = [...(options.items ?? [])];
  let destroyed = false;

  // Root grid container
  const root = document.createElement("div");
  root.className = `grid-container ${opts.className}`;
  root.setAttribute("role", "grid");
  root.style.cssText = buildGridStyle();

  // Build responsive media queries
  if (opts.responsive) {
    const sortedBreakpoints = Object.entries(opts.responsive)
      .map(([w, cols]) => ({ width: Number(w), cols }))
      .sort((a, b) => b.width - a.width);

    let styleEl: HTMLStyleElement | null = null;

    if (!document.getElementById("grid-responsive-styles")) {
      styleEl = document.createElement("style");
      styleEl.id = "grid-responsive-styles";
      let css = "";
      for (const bp of sortedBreakpoints) {
        css += `@media (max-width: ${bp.width}px) { .${root.className.split(" ")[0]}[data-grid-id="${Date.now()}"] { grid-template-columns: repeat(${bp.cols}, 1fr) !important; } }\n`;
      }
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }

    root.dataset.gridId = String(Date.now());
  }

  container.appendChild(root);

  function buildGridStyle(): string {
    const gapVal = typeof opts.gap === "number"
      ? `${opts.gap}px`
      : GAP_MAP[opts.gap as GridGap] ?? String(opts.gap);

    let templateCols: string;
    if (typeof opts.columns === "string") {
      templateCols = opts.columns;
    } else if (opts.columns === 0) {
      templateCols = `repeat(auto-fit, minmax(${opts.minColWidth}px, 1fr))`;
    } else {
      templateCols = `repeat(${opts.columns}, 1fr)`;
    }

    return `
      display:grid;
      grid-template-columns:${templateCols};
      gap:${gapVal};
      justify-items:${opts.justifyItems};
      align-items:${opts.alignItems};
      ${opts.equalHeight ? "" : "align-content:start;"}
      width:100%;
    `;
  }

  function render(): void {
    if (destroyed) return;
    root.innerHTML = "";

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      const el = opts.renderItem
        ? opts.renderItem(item, i)
        : renderDefaultItem(item, i);

      el.dataset.id = item.id;
      el.dataset.index = String(i);
      el.setAttribute("role", "gridcell");

      // Apply spans
      if (item.colSpan && item.colSpan > 1) {
        el.style.gridColumn = `span ${item.colSpan}`;
      }
      if (item.rowSpan && item.rowSpan > 1) {
        el.style.gridRow = `span ${item.rowSpan}`;
      }

      // Click handler
      if (opts.onItemClick) {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => opts.onItemClick!(item, i));
        el.addEventListener("mouseenter", () => { el.style.opacity = "0.85"; });
        el.addEventListener("mouseleave", () => { el.style.opacity = ""; });
      }

      root.appendChild(el);
    }
  }

  function renderDefaultItem(item: GridItem<T>, _index: number): HTMLElement {
    const cell = document.createElement("div");
    cell.className = "grid-item";
    cell.style.cssText = `
      overflow:hidden;border-radius:8px;background:#fff;
      border:1px solid #f0f0f0;transition:box-shadow 0.15s,transform 0.15s;
      min-height:80px;display:flex;flex-direction:column;
    `;

    if (typeof item.content === "string") {
      cell.innerHTML = item.content;
    } else {
      cell.appendChild(item.content);
    }

    cell.addEventListener("mouseenter", () => {
      cell.style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
      cell.style.transform = "translateY(-1px)";
    });
    cell.addEventListener("mouseleave", () => {
      cell.style.boxShadow = "";
      cell.style.transform = "";
    });

    return cell;
  }

  // Initial render
  render();

  // Instance
  const instance: GridInstance<T> = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: GridItem<T>[]) {
      items = [...newItems];
      render();
    },

    addItem(item: GridItem<T>) {
      items.push(item);
      render();
    },

    removeItem(id: string) {
      items = items.filter((i) => i.id !== id);
      render();
    },

    updateColumns(columns: number | string) {
      opts.columns = columns;
      root.style.cssText = buildGridStyle();
      render();
    },

    updateGap(gap: GridGap | string | number) {
      opts.gap = gap;
      root.style.cssText = buildGridStyle();
    },

    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.remove();
      // Clean up responsive styles
      const styleEl = document.getElementById("grid-responsive-styles");
      if (styleEl) styleEl.remove();
    },
  };

  return instance;
}
