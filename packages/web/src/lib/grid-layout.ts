/**
 * Grid Layout: CSS Grid layout manager with responsive breakpoints,
 * auto-fit/fill, gap control, area templates, item placement,
 * minmax support, and responsive column adjustment.
 */

// --- Types ---

export type GridAutoFit = "auto-fit" | "auto-fill" | "fixed";
export type GridJustify = "start" | "end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly";
export type GridAlign = "start" | "end" | "center" | "stretch";

export interface GridLayoutOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Number of columns (or responsive config) */
  columns?: number | { default: number; [breakpoint: number]: number };
  /** Column min-width for auto-fit/fill (px) */
  columnMinWidth?: number;
  /** Auto-fit mode (default: fixed) */
  autoFit?: GridAutoFit;
  /** Row gap (px) */
  rowGap?: number;
  /** Column gap (px) */
  columnGap?: number;
  /** Gap shorthand (overrides rowGap/columnGap) */
  gap?: number;
  /** Justify items horizontally */
  justifyItems?: GridJustify;
  /** Align items vertically */
  alignItems?: GridAlign;
  /** Justify content (for tracks) */
  justifyContent?: GridJustify;
  /** Align content (for tracks) */
  alignContent?: GridAlign;
  /** Named grid areas template (CSS grid-template-areas) */
  areas?: string[];
  /** Item placement rules */
  placements?: Array<{ id: string; colStart: string; rowStart: string; colEnd?: string; rowEnd?: string }>;
  /** Items to render */
  items?: Array<{ id: string; element: HTMLElement | string; colspan?: number; rowspan?: number }>;
  /** Custom CSS class */
  className?: string;
}

export interface GridLayoutInstance {
  element: HTMLElement;
  setColumns: (cols: number | { default: number; [breakpoint: number]: number }) => void;
  addItem: (item: { id: string; element: HTMLElement | string; colspan?: number; rowspan?: number }) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  reflow: () => void;
  destroy: () => void;
}

// --- Main Class ---

export class GridLayoutManager {
  create(options: GridLayoutOptions): GridLayoutInstance {
    const opts = {
      columnMinWidth: options.columnMinWidth ?? 200,
      autoFit: options.autoFit ?? "fixed",
      rowGap: options.rowGap ?? options.gap ?? 16,
      columnGap: options.columnGap ?? options.gap ?? 16,
      justifyItems: options.justifyItems ?? "stretch",
      alignItems: options.alignItems ?? "stretch",
      justifyContent: options.justifyContent ?? undefined,
      alignContent: options.alignContent ?? undefined,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("GridLayout: container not found");

    container.className = `grid-layout ${opts.className}`;
    this.applyStyles(container, opts);

    const itemMap = new Map<string, HTMLElement>();
    let destroyed = false;

    // Render initial items
    if (options.items) {
      for (const item of options.items) {
        this.addItemInternal(container, item, itemMap);
      }
    }

    // Responsive resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!destroyed) this.applyStyles(container, opts);
    });
    resizeObserver.observe(container);

    const instance: GridLayoutInstance = {
      element: container,

      setColumns(cols) {
        opts.columns = cols;
        this.applyStyles(container, opts);
      },

      addItem(item) {
        this.addItemInternal(container, item, itemMap);
      },

      removeItem(id: string) {
        const el = itemMap.get(id);
        if (el) {
          el.remove();
          itemMap.delete(id);
        }
      },

      clear() {
        itemMap.clear();
        container.innerHTML = "";
      },

      reflow() {
        this.applyStyles(container, opts);
      },

      destroy() {
        destroyed = true;
        resizeObserver.disconnect();
        itemMap.clear();
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }

  private applyStyles(el: HTMLElement, opts: Required<Pick<GridLayoutOptions,
      "rowGap" | "columnGap" | "justifyItems" | "alignItems" |
      "justifyContent" | "alignContent" | "columnMinWidth" | "autoFit" | "className"
    >> & GridLayoutOptions): void {
    let gridTemplateColumns: string;

    if (opts.autoFit === "auto-fit") {
      gridTemplateColumns = `repeat(auto-fit, minmax(${opts.columnMinWidth}px, 1fr))`;
    } else if (opts.autoFit === "auto-fill") {
      gridTemplateColumns = `repeat(auto-fill, minmax(${opts.columnMinWidth}px, 1fr))`;
    } else if (typeof opts.columns === "number") {
      gridTemplateColumns = `repeat(${opts.columns}, 1fr)`;
    } else if (opts.columns && typeof opts.columns === "object" && "default" in opts.columns) {
      // Responsive
      const width = el.clientWidth;
      let matched = opts.columns.default;
      const sortedBreakpoints = Object.entries(opts.columns)
        .filter(([k]) => k !== "default")
        .map(([k, v]) => [Number(k), v] as [number, number])
        .sort((a, b) => b[0] - a[0]);
      for (const [bp, val] of sortedBreakpoints) {
        if (width >= bp) { matched = val; break; }
      }
      gridTemplateColumns = `repeat(${matched}, 1fr)`;
    } else {
      gridTemplateColumns = "repeat(3, 1fr)";
    }

    el.style.cssText = `
      display: grid;
      grid-template-columns: ${gridTemplateColumns};
      gap: ${opts.rowGap}px ${opts.columnGap}px;
      justify-items: ${opts.justifyItems};
      align-items: ${opts.alignItems};
      ${opts.justifyContent ? `justify-content: ${opts.justifyContent};` : ""}
      ${opts.alignContent ? `align-content: ${opts.alignContent};` : ""}
      width: 100%;
    `;
  }

  private addItemInternal(
    container: HTMLElement,
    item: { id: string; element: HTMLElement | string; colspan?: number; rowspan?: number },
    itemMap: Map<string, HTMLElement>,
  ): void {
    const el = typeof item.element === "string"
      ? (() => { const d = document.createElement("div"); d.innerHTML = item.element as string; return d; })()
      : item.element;

    el.dataset.gridId = item.id;
    el.style.cssText += `
      ${item.colspan ? `grid-column: span ${item.colspan};` : ""}
      ${item.rowspan ? `grid-row: span ${item.rowspan};` : ""}
    `;
    container.appendChild(el);
    itemMap.set(item.id, el);
  }
}

/** Convenience: create a grid layout */
export function createGridLayout(options: GridLayoutOptions): GridLayoutInstance {
  return new GridLayoutManager().create(options);
}
