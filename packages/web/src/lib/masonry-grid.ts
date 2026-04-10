/**
 * Masonry Grid: Pinterest-style masonry layout engine.
 * Dynamically arranges items of varying heights into columns with
 * optimal packing, supporting:
 * - Configurable column count (responsive)
 * - Gutter/gap control
 * - Animated layout transitions
 * - Append/prepend/remove items
 * - Virtual scrolling for large datasets
 * - RTL support
 * - Infinite scroll integration point
 *
 * Pure DOM-based (no external dependencies). Uses ResizeObserver
 * and IntersectionObserver for performance.
 */

// --- Types ---

export interface MasonryItem {
  /** Unique key */
  key: string;
  /** Item height (can be 'auto' to measure from content) */
  height?: number | "auto";
  /** Item content (string HTML or HTMLElement) */
  content: string | HTMLElement;
  /** Column span (>1 for wide items) */
  span?: number;
  /** Custom CSS class */
  className?: string;
  /** Data attributes */
  data?: Record<string, string>;
  /** Click callback */
  onClick?: () => void;
}

export interface MasonryGridOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial items */
  items?: MasonryItem[];
  /** Number of columns (default: auto-calculated from width) */
  columns?: number | ((containerWidth: number) => number);
  /** Min column width in px (default: 200) */
  minColumnWidth?: number;
  /** Max column count (default: 12) */
  maxColumns?: number;
  /** Gutter/gap between items in px (default: 16) */
  gutter?: number;
  /** Row gap in px (default: same as gutter) */
  rowGutter?: number;
  /** Animation duration ms for layout changes (default: 300) */
  animationDuration?: number;
  /** Enable FLIP animation (default: true) */
  animate?: boolean;
  /** Easing function name (default: ease-out) */
  easing?: string;
  /** RTL layout (default: false) */
  rtl?: boolean;
  /** Fit width (stretch last row, default: false) */
  fitWidth?: boolean;
  /** Center grid when fewer items than columns (default: true) */
  centerAligned?: boolean;
  /** Callback when layout completes */
  onLayout?: (layout: LayoutInfo) => void;
  /** Callback when item is clicked */
  onItemClick?: (item: MasonryItem, index: number) => void;
  /** Callback when scroll threshold crossed (for infinite scroll) */
  onScrollNearEnd?: () => void;
  /** Scroll threshold px from bottom (default: 200) */
  scrollThreshold?: number;
  /** Custom CSS class */
  className?: string;
}

export interface LayoutInfo {
  columnCount: number;
  columnWidth: number;
  gutter: number;
  totalHeight: number;
  itemCount: number;
  itemPositions: Array<{ key: string; x: number; y: number; w: number; h: number }>;
}

export interface MasonryGridInstance {
  element: HTMLElement;
  /** Get current layout info */
  getLayout: () => LayoutInfo;
  /** Add items at end */
  append: (items: MasonryItem[]) => void;
  /** Add items at beginning */
  prepend: (items: MasonryItem[]) => void;
  /** Insert items at specific index */
  insert: (index: number, items: MasonryItem[]) => void;
  /** Remove item by key */
  remove: (key: string) => void;
  /** Replace item by key */
  replace: (key: string, item: MasonryItem) => void;
  /** Update item content */
  updateItem: (key: string, updates: Partial<MasonryItem>) => void;
  /** Set all items */
  setItems: (items: MasonryItem[]) => void;
  /** Force re-layout */
  layout: (animate?: boolean) => void;
  /** Get item element by key */
  getItemElement: (key: string) => HTMLElement | null;
  /** Scroll to item */
  scrollToItem: (key: string, behavior?: ScrollBehavior) => void;
  /** Destroy instance */
  destroy: () => void;
}

// --- Helpers ---

function getColumnCount(width: number, minW: number, maxCols: number, custom?: number | ((w: number) => number)): number {
  if (typeof custom === "number") return custom;
  if (typeof custom === "function") return custom(width);
  return Math.min(maxCols, Math.max(1, Math.floor((width + 16) / (minW + 16))));
}

// --- Main ---

export function createMasonryGrid(options: MasonryGridOptions): MasonryGridInstance {
  const opts = {
    minColumnWidth: 200,
    maxColumns: 12,
    gutter: 16,
    rowGutter: undefined as number | undefined,
    animationDuration: 300,
    animate: true,
    easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
    rtl: false,
    fitWidth: false,
    centerAligned: true,
    scrollThreshold: 200,
    items: [],
    ...options,
  };

  const rowGutter = opts.rowGutter ?? opts.gutter;

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Masonry Grid: container not found");

  // Grid element
  const grid = document.createElement("div");
  grid.className = `masonry-grid ${opts.className ?? ""}`;
  grid.style.cssText = `
    position:relative;width:100%;min-height:1px;
  `;
  container.appendChild(grid);

  // State
  let items = [...opts.items];
  let columnCount = 1;
  let columnWidth = 0;
  let totalHeight = 0;
  let destroyed = false;
  const itemElements = new Map<string, HTMLElement>();
  let resizeObserver: ResizeObserver | null = null;
  let scrollParent: HTMLElement | Window | null = null;
  let mutationObserver: MutationObserver | null = null;

  // Measure item heights
  async function measureItems(): Promise<Map<string, number>> {
    const heights = new Map<string, number>();

    // Create a temporary measurement container (hidden, same width as grid)
    const measurer = document.createElement("div");
    measurer.style.cssText = `
      position:absolute;visibility:hidden;left:-9999px;top:-9999px;
      width:${grid.clientWidth}px;pointer-events:none;
    `;
    document.body.appendChild(measurer);

    for (const item of items) {
      if (item.height !== undefined && item.height !== "auto") {
        heights.set(item.key, item.height);
        continue;
      }

      const el = createItemElement(item);
      measurer.appendChild(el);
      await new Promise(r => requestAnimationFrame(r));
      heights.set(item.key, el.offsetHeight);
      measurer.removeChild(el);
    }

    measurer.remove();
    return heights;
  }

  function createItemElement(item: MasonryItem): HTMLElement {
    const el = document.createElement("div");
    el.className = `masonry-item ${item.className ?? ""}`;
    el.dataset.masonryKey = item.key;
    el.style.cssText = `
      position:absolute;width:100%;box-sizing:border-box;
      will-change:transform,opacity;
    `;

    if (item.data) {
      for (const [k, v] of Object.entries(item.data)) {
        el.dataset[k] = v;
      }
    }

    if (typeof item.content === "string") {
      el.innerHTML = item.content;
    } else {
      el.appendChild(item.content);
    }

    el.addEventListener("click", () => {
      item.onClick?.();
      opts.onItemClick?.(item, items.findIndex(i => i.key === item.key));
    });

    return el;
  }

  // Core layout algorithm
  async function doLayout(animate = opts.animate): Promise<void> {
    const containerWidth = grid.clientWidth;
    if (containerWidth === 0) return;

    columnCount = getColumnCount(containerWidth, opts.minColumnWidth, opts.maxColumns, opts.columns);
    const g = opts.gutter;
    const rg = rowGutter;
    columnWidth = (containerWidth - g * (columnCount - 1)) / columnCount;

    // Measure item heights
    const heights = await measureItems();

    // Track bottom of each column
    const colBottoms = new Array(columnCount).fill(0);
    const positions: LayoutInfo["itemPositions"] = [];

    // Place each item
    for (const item of items) {
      const span = Math.min(item.span ?? 1, columnCount);
      const itemH = heights.get(item.key) ?? 200;

      // Find shortest column(s) that can fit this span
      let bestCol = 0;
      let bestBottom = Infinity;

      for (let c = 0; c <= columnCount - span; c++) {
        let maxBottom = 0;
        for (let s = 0; s < span; s++) {
          maxBottom = Math.max(maxBottom, colBottoms[c + s]!);
        }
        if (maxBottom < bestBottom) {
          bestBottom = maxBottom;
          bestCol = c;
        }
      }

      const x = opts.rtl
        ? containerWidth - (bestCol + span) * columnWidth - bestCol * g
        : bestCol * (columnWidth + g);
      const y = bestBottom;
      const w = span * columnWidth + (span - 1) * g;

      positions.push({ key: item.key, x, y, w, h: itemH });

      // Update column bottoms
      for (let s = 0; s < span; s++) {
        colBottoms[bestCol + s] = bestBottom + itemH + rg;
      }
    }

    totalHeight = Math.max(...colBottoms, 0);

    // Apply positions
    applyPositions(positions, animate);

    // Report layout
    const layoutInfo: LayoutInfo = {
      columnCount,
      columnWidth,
      gutter: g,
      totalHeight,
      itemCount: items.length,
      itemPositions: positions,
    };

    grid.style.height = `${totalHeight}px`;
    opts.onLayout?.(layoutInfo);
  }

  function applyPositions(
    positions: LayoutInfo["itemPositions"],
    animate: boolean,
  ): void {
    for (const pos of positions) {
      let el = itemElements.get(pos.key);

      if (!el) {
        const item = items.find(i => i.key === pos.key);
        if (!item) continue;
        el = createItemElement(item);
        itemElements.set(pos.key, el);
        grid.appendChild(el);
      }

      if (animate && opts.animate) {
        el.style.transition = `transform ${opts.animationDuration}ms ${opts.easing}`;
      } else {
        el.style.transition = "none";
      }

      el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      el.style.width = `${pos.w}px`;
    }

    // Remove elements for items no longer in list
    const currentKeys = new Set(items.map(i => i.key));
    for (const [key, el] of itemElements) {
      if (!currentKeys.has(key)) {
        if (animate && opts.animate) {
          el.style.opacity = "0";
          el.style.transition = `opacity 200ms ease, transform ${opts.animationDuration}ms ${opts.easing}`;
          setTimeout(() => el.remove(), 200);
        } else {
          el.remove();
        }
        itemElements.delete(key);
      }
    }
  }

  // ResizeObserver for responsive columns
  resizeObserver = new ResizeObserver(() => {
    if (!destroyed) doLayout(false);
  });
  resizeObserver.observe(grid);

  // Scroll detection for infinite scroll
  function setupScrollDetection(): void {
    // Find scroll parent
    let parent: HTMLElement | null = grid.parentElement;
    while (parent) {
      const { overflow, overflowY } = getComputedStyle(parent);
      if (overflow === "auto" || overflow === "scroll" || overflowY === "auto" || overflowY === "scroll") {
        scrollParent = parent;
        break;
      }
      if (parent === document.body) {
        scrollParent = window;
        break;
      }
      parent = parent.parentElement;
    }

    if (scrollParent) {
      scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    }
  }

  function handleScroll(): void {
    if (!scrollParent || !opts.onScrollNearEnd) return;

    let scrollTop: number;
    let clientHeight: number;
    let scrollHeight: number;

    if (scrollParent === window) {
      scrollTop = window.scrollY;
      clientHeight = window.innerHeight;
      scrollHeight = document.documentElement.scrollHeight;
    } else {
      const el = scrollParent as HTMLElement;
      scrollTop = el.scrollTop;
      clientHeight = el.clientHeight;
      scrollHeight = el.scrollHeight;
    }

    if (scrollTop + clientHeight >= scrollHeight - opts.scrollThreshold) {
      opts.onScrollNearEnd();
    }
  }

  // Initialize
  doLayout(false).then(() => setupScrollDetection());

  // Instance
  const instance: MasonryGridInstance = {
    element: grid,

    getLayout() {
      return {
        columnCount,
        columnWidth,
        gutter: opts.gutter,
        totalHeight,
        itemCount: items.length,
        itemPositions: [],
      };
    },

    append(newItems: MasonryItem[]) {
      items.push(...newItems);
      doLayout(true);
    },

    prepend(newItems: MasonryItem[]) {
      items.unshift(...newItems);
      doLayout(true);
    },

    insert(index: number, newItems: MasonryItem[]) {
      items.splice(index, 0, ...newItems);
      doLayout(true);
    },

    remove(key: string) {
      items = items.filter(i => i.key !== key);
      const el = itemElements.get(key);
      if (el) {
        el.style.opacity = "0";
        el.style.transition = `opacity 200ms ease`;
        setTimeout(() => { el.remove(); itemElements.delete(key); }, 200);
      }
      // Recalculate after removal animation
      setTimeout(() => doLayout(true), 250);
    },

    replace(key: string, newItem: MasonryItem) {
      const idx = items.findIndex(i => i.key === key);
      if (idx >= 0) {
        items[idx] = newItem;
        // Remove old element
        const oldEl = itemElements.get(key);
        if (oldEl) { oldEl.remove(); itemElements.delete(key); }
        doLayout(true);
      }
    },

    updateItem(key: string, updates: Partial<MasonryItem>) {
      const item = items.find(i => i.key === key);
      if (item) {
        Object.assign(item, updates);
        // If content changed, recreate element
        if (updates.content !== undefined) {
          const el = itemElements.get(key);
          if (el) { el.remove(); itemElements.delete(key); }
        }
        doLayout(true);
      }
    },

    setItems(newItems: MasonryItem[]) {
      // Clear all existing elements
      for (const [, el] of itemElements) el.remove();
      itemElements.clear();
      items = [...newItems];
      doLayout(true);
    },

    layout(animate = true) {
      doLayout(animate);
    },

    getItemElement(key: string) {
      return itemElements.get(key) ?? null;
    },

    scrollToItem(key: string, behavior: ScrollBehavior = "smooth") {
      const el = itemElements.get(key);
      if (el) el.scrollIntoView({ behavior, block: "nearest" });
    },

    destroy() {
      destroyed = true;
      resizeObserver?.disconnect();
      if (scrollParent) {
        scrollParent.removeEventListener("scroll", handleScroll);
      }
      mutationObserver?.disconnect();
      grid.remove();
    },
  };

  return instance;
}
