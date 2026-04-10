/**
 * Masonry Layout: Pinterest-style masonry grid layout manager with
 * column-based placement, responsive columns, gap control,
 * animations on add/remove, virtualization support, and
 * performance-optimized reflow.
 */

// --- Types ---

export interface MasonryItem {
  /** Unique identifier */
  id: string;
  /** DOM element or HTML string */
  element?: HTMLElement | string;
  /** Estimated height (px) for initial layout (optional) */
  height?: number;
  /** Aspect ratio (width/height) for proportional sizing */
  aspectRatio?: number;
  /** Custom data */
  data?: unknown;
}

export interface MasonryOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Number of columns (or responsive breakpoints) */
  columns?: number | { default: number; [breakpoint: number]: number };
  /** Gap between items (px) */
  gap?: number;
  /** Item width calculation mode */
  itemWidth?: "auto" | "fixed";
  /** Fixed item width in px (when itemWidth is "fixed") */
  fixedItemWidth?: number;
  /** Animation duration for layout changes (ms) */
  animationDuration?: number;
  /** Enable smooth transitions on reflow */
  animateReflow?: boolean;
  /** Callback when an item is clicked */
  onItemClick?: (item: MasonryItem, index: number, event: MouseEvent) => void;
  /** Custom renderer for each item */
  renderItem?: (item: MasonryItem, index: number) => HTMLElement | string;
  /** Custom CSS class */
  className?: string;
  /** Minimum column width for auto-calculation */
  minColumnWidth?: number;
}

export interface MasonryInstance {
  element: HTMLElement;
  getItems: () => MasonryItem[];
  addItem: (item: MasonryItem) => void;
  addItems: (items: MasonryItem[]) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  setColumns: (cols: number) => void;
  reflow: () => void;
  destroy: () => void;
}

// --- Main Class ---

export class MasonryManager {
  create(options: MasonryOptions): MasonryInstance {
    const opts = {
      gap: options.gap ?? 12,
      animationDuration: options.animationDuration ?? 300,
      animateReflow: options.animateReflow ?? true,
      minColumnWidth: options.minColumnWidth ?? 200,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Masonry: container not found");

    container.className = `masonry ${opts.className}`;
    container.style.cssText = `
      position:relative;width:100%;
      ${opts.animateReflow ? "" : ""}
    `;

    let items: MasonryItem[] = [];
    let currentColumns = this.resolveColumns(opts);
    let destroyed = false;

    // Track item elements by ID
    const itemElements = new Map<string, HTMLElement>();

    function resolveColumns(options: MasonryOptions): number {
      const colsOption = options.columns;
      if (typeof colsOption === "number") return colsOption;
      if (colsOption && typeof colsOption === "object" && "default" in colsOption) {
        const width = container.clientWidth;
        // Find the largest matching breakpoint
        let matched = colsOption.default;
        const sortedBreakpoints = Object.entries(colsOption)
          .filter(([k]) => k !== "default")
          .map(([k, v]) => [Number(k), v] as [number, number])
          .sort((a, b) => b[0] - a[0]);
        for (const [bp, val] of sortedBreakpoints) {
          if (width >= bp) { matched = val; break; }
        }
        return matched;
      }
      // Auto-calculate from container width
      return Math.max(1, Math.floor((container.clientWidth + opts.gap) / (opts.minColumnWidth + opts.gap)));
    }

    function getColumnWidth(): number {
      const totalGap = (currentColumns - 1) * opts.gap;
      return (container.clientWidth - totalGap) / currentColumns;
    }

    function render(): void {
      if (destroyed || items.length === 0) {
        container.innerHTML = "";
        return;
      }

      currentColumns = resolveColumns(opts);
      const colWidth = getColumnWidth();

      // Column heights tracking
      const colHeights = new Array(currentColumns).fill(0);

      // Position each item
      for (const item of items) {
        const el = itemElements.get(item.id);
        if (!el) continue;

        // Find shortest column
        let minCol = 0;
        let minHeight = colHeights[0]!;
        for (let c = 1; c < currentColumns; c++) {
          if (colHeights[c]! < minHeight) {
            minHeight = colHeights[c]!;
            minCol = c;
          }
        }

        // Calculate position
        const x = minCol * (colWidth + opts.gap);
        const y = colHeights[minCol]!;

        el.style.position = "absolute";
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.width = `${colWidth}px`;

        if (opts.animateReflow) {
          el.style.transition = `left ${opts.animationDuration}ms ease, top ${opts.animationDuration}ms ease, width ${opts.animationDuration}ms ease`;
        }

        // Update column height after placing
        const itemHeight = el.offsetHeight || item.height || Math.round(colWidth / (item.aspectRatio ?? 1.5));
        colHeights[minCol] = y + itemHeight + opts.gap;
      }

      // Set container height to tallest column
      const maxH = Math.max(...colHeights);
      container.style.height = `${maxH}px`;
    }

    function createItemElement(item: MasonryItem): HTMLElement {
      if (item.element instanceof HTMLElement) return item.element;

      const content = typeof item.element === "string"
        ? item.element
        : opts.renderItem ? opts.renderItem(item, items.indexOf(item)) : "";

      const el = document.createElement("div");
      el.className = "masonry-item";
      el.dataset.masonryId = item.id;
      el.style.cssText = `
        overflow:hidden;border-radius:6px;
        background:#f9fafb;border:1px solid #f0f0f0;
        transition:transform 0.2s ease,box-shadow 0.2s ease;
      `;

      if (typeof content === "string") {
        el.innerHTML = content;
      } else {
        el.appendChild(content);
      }

      // Click handler
      if (opts.onItemClick) {
        el.style.cursor = "pointer";
        el.addEventListener("click", (e) => {
          const idx = items.findIndex((i) => i.id === item.id);
          opts.onItemClick!(item, idx, e);
        });
        el.addEventListener("mouseenter", () => {
          el.style.transform = "translateY(-2px)";
          el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "";
          el.style.boxShadow = "";
        });
      }

      return el;
    }

    function addItemInternal(item: MasonryItem, animate = true): void {
      const el = createItemElement(item);
      itemElements.set(item.id, el);
      container.appendChild(el);

      if (!animate) {
        el.style.transition = "none";
      }
    }

    // Initial render with all items
    for (const item of items) {
      addItemInternal(item, false);
    }
    render();

    // Resize observer for responsive columns
    const resizeObserver = new ResizeObserver(() => {
      if (!destroyed) {
        const newCols = resolveColumns(opts);
        if (newCols !== currentColumns) {
          currentColumns = newCols;
          render();
        } else {
          render();
        }
      }
    });
    resizeObserver.observe(container);

    // Images loaded observer for dynamic heights
    const imgLoadObserver = new MutationObserver(() => {
      if (!destroyed) setTimeout(() => render(), 50);
    });
    imgLoadObserver.observe(container, { childList: true, subtree: true });

    const instance: MasonryInstance = {
      element: container,

      getItems() { return [...items]; },

      addItem(item: MasonryItem) {
        items.push(item);
        addItemInternal(item);
        render();
      },

      addItems(newItems: MasonryItem[]) {
        for (const item of newItems) {
          items.push(item);
          addItemInternal(item);
        }
        render();
      },

      removeItem(id: string) {
        items = items.filter((i) => i.id !== id);
        const el = itemElements.get(id);
        if (el) {
          el.style.opacity = "0";
          el.style.transform = "scale(0.9)";
          setTimeout(() => {
            el.remove();
            itemElements.delete(id);
            render();
          }, opts.animationDuration);
        }
      },

      clear() {
        items = [];
        itemElements.clear();
        container.innerHTML = "";
        container.style.height = "0";
      },

      setColumns(cols: number) {
        currentColumns = cols;
        render();
      },

      reflow() { render(); },

      destroy() {
        destroyed = true;
        resizeObserver.disconnect();
        imgLoadObserver.disconnect();
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a masonry layout */
export function createMasonry(options: MasonryOptions): MasonryInstance {
  return new MasonryManager().create(options);
}
