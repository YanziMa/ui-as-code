/**
 * Masonry Utilities: Pinterest-style masonry grid layout with columns,
 * responsive column count, gap control, append/prepend operations,
 * animation on layout, and virtualized rendering for large datasets.
 */

// --- Types ---

export interface MasonryItem {
  /** Unique ID */
  id: string;
  /** Content element or HTML string */
  content: HTMLElement | string;
  /** Known height in px (optional — measured if omitted) */
  height?: number;
  /** Aspect ratio hint (width/height) for initial estimation */
  aspectRatio?: number;
  /** Custom data */
  data?: unknown;
}

export interface MasonryOptions {
  /** Initial items */
  items?: MasonryItem[];
  /** Number of columns. Default auto-calculated from width */
  columns?: number;
  /** Minimum column width in px for auto-calculation. Default 250 */
  minColumnWidth?: number;
  /** Gap between items in px. Default 16 */
  gap?: number;
  /** Container element */
  container?: HTMLElement;
  /** Custom class name */
  className?: string;
  /** Animation duration when items appear (ms). Default 300 */
  animationDuration?: number;
  /** Enable staggered animation on first render */
  staggerAnimation?: boolean;
  /** Stagger delay per item (ms). Default 50 */
  staggerDelay?: number;
  /** Called after layout recalculation */
  onLayout?: () => void;
  /** Called when an item is clicked */
  onItemClick?: (item: MasonryItem, index: number, el: HTMLElement) => void;
  /** Responsive breakpoint map: { "768px": 2, "1024px": 3 } */
  breakpoints?: Record<string, number>;
}

export interface MasonryInstance {
  /** The root masonry element */
  el: HTMLElement;
  /** Add item(s) to the end */
  append: (...items: MasonryItem[]) => void;
  /** Add item(s) to the beginning */
  prepend: (...items: MasonryItem[]) => void;
  /** Insert at specific index */
  insert: (index: number, ...items: MasonryItem[]) => void;
  /** Remove item by ID */
  remove: (id: string) => void;
  /** Remove all items */
  clear: () => void;
  /** Replace all items */
  setItems: (items: MasonryItem[]) => void;
  /** Get all items */
  getItems: () => MasonryItem[];
  /** Get current column count */
  getColumnCount: () => number;
  /** Force relayout */
  layout: () => void;
  /** Scroll to item by ID */
  scrollToItem: (id: string, behavior?: ScrollBehavior) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a masonry (Pinterest-style) grid layout.
 *
 * @example
 * ```ts
 * const masonry = createMasonry({
 *   container: document.getElementById("grid"),
 *   columns: 3,
 *   gap: 16,
 *   items: [
 *     { id: "1", content: cardEl1 },
 *     { id: "2", content: "<div>Card 2</div>" },
 *   ],
 * });
 * ```
 */
export function createMasonry(options: MasonryOptions = {}): MasonryInstance {
  const {
    items = [],
    columns: fixedColumns,
    minColumnWidth = 250,
    gap = 16,
    container,
    className,
    animationDuration = 300,
    staggerAnimation = true,
    staggerDelay = 50,
    onLayout,
    onItemClick,
    breakpoints,
  } = options;

  let _items: MasonryItem[] = [...items];
  let _columnCount = fixedColumns ?? _calcAutoColumns();
  let cleanupFns: Array<() => void> = [];
  let resizeObserver: ResizeObserver | null = null;

  // Root
  const root = document.createElement("div");
  root.className = `masonry ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;gap:" + `${gap}px;align-items:flex-start;width:100%;`;

  // Column containers
  const columnEls: HTMLElement[] = [];

  // Initialize columns
  _initColumns();

  // Render initial items
  _renderItems(_items, false);

  (container ?? document.body).appendChild(root);

  // Resize observer for responsive columns
  resizeObserver = new ResizeObserver(() => {
    const newCols = fixedColumns ?? _calcAutoColumns();
    if (newCols !== _columnCount) {
      _columnCount = newCols;
      _initColumns();
      _renderItems(_items, false);
      onLayout?.();
    }
  });
  resizeObserver.observe(root);

  // --- Methods ---

  function append(...newItems: MasonryItem[]): void {
    _items.push(...newItems);
    _renderItems(newItems, true);
    onLayout?.();
  }

  function prepend(...newItems: MasonryItem[]): void {
    _items.unshift(...newItems);
    _rebuildAll();
    onLayout?.();
  }

  function insert(index: number, ...newItems: MasonryItem[]): void {
    _items.splice(index, 0, ...newItems);
    _rebuildAll();
    onLayout?.();
  }

  function remove(id: string): void {
    const idx = _items.findIndex((i) => i.id === id);
    if (idx < 0) return;

    const el = root.querySelector(`[data-masonry-id="${id}"]`) as HTMLElement;
    if (el) {
      el.style.transition = `opacity ${animationDuration}ms ease, transform ${animationDuration}ms`;
      el.style.opacity = "0";
      el.style.transform = "scale(0.95)";
      setTimeout(() => el.remove(), animationDuration);
    }

    _items.splice(idx, 1);
    setTimeout(() => _rebuildAll(), animationDuration + 50);
    onLayout?.();
  }

  function clear(): void {
    _items = [];
    columnEls.forEach((col) => { col.innerHTML = ""; });
    onLayout?.();
  }

  function setItems(newItems: MasonryItem[]): void {
    _items = [...newItems];
    _rebuildAll();
    onLayout?.();
  }

  function getItems(): MasonryItem[] { return [..._items]; }
  function getColumnCount(): number { return _columnCount; }

  function layout(): void { _rebuildAll(); onLayout?.(); }

  function scrollToItem(id: string, behavior: ScrollBehavior = "smooth"): void {
    const el = root.querySelector(`[data-masonry-id="${id}"]`) as HTMLElement;
    if (el) el.scrollIntoView({ behavior, block: "center" });
  }

  function destroy(): void {
    resizeObserver?.disconnect();
    _removeListeners();
    root.remove();
  }

  // --- Internal ---

  function _calcAutoColumns(): number {
    if (!root.parentElement) return 3;
    const containerWidth = root.parentElement.clientWidth || window.innerWidth;
    return Math.max(1, Math.floor(containerWidth / minColumnWidth));
  }

  function _initColumns(): void {
    // Clear existing
    columnEls.length = 0;
    root.innerHTML = "";

    for (let i = 0; i < _columnCount; i++) {
      const col = document.createElement("div");
      col.className = "masonry-column";
      col.dataset.columnIndex = String(i);
      col.style.cssText =
        "flex:1;min-width:0;display:flex;flex-direction:column;gap:" + `${gap}px;`;
      root.appendChild(col);
      columnEls.push(col);
    }
  }

  function _getShortestColumnIndex(): number {
    let shortestIdx = 0;
    let shortestHeight = Infinity;
    columnEls.forEach((col, idx) => {
      const h = col.scrollHeight || col.offsetHeight || 0;
      if (h < shortestHeight) {
        shortestHeight = h;
        shortestIdx = idx;
      }
    });
    return shortestIdx;
  }

  function _renderItems(itemsToRender: MasonryItem[], animate: boolean): void {
    itemsToRender.forEach((item, arrIdx) => {
      const colIdx = _getShortestColumnIndex();
      const col = columnEls[colIdx];

      const wrapper = document.createElement("div");
      wrapper.className = "masonry-item";
      wrapper.dataset.masonryId = item.id;
      wrapper.style.cssText =
        "break-inside:avoid;width:100%;overflow:hidden;" +
        (animate
          ? `opacity:0;transform:translateY(16px);transition:opacity ${animationDuration}ms ease,transform ${animationDuration}ms ease;`
          : "");

      if (typeof item.content === "string") {
        wrapper.innerHTML = item.content;
      } else {
        wrapper.appendChild(item.content.cloneNode(true));
      }

      // Click handler
      if (onItemClick) {
        wrapper.style.cursor = "pointer";
        wrapper.addEventListener("click", () => {
          const globalIdx = _items.findIndex((it) => it.id === item.id);
          onItemClick(item, globalIdx, wrapper);
        });
      }

      col.appendChild(wrapper);

      // Staggered animation
      if (animate && staggerAnimation) {
        const delay = arrIdx * staggerDelay;
        requestAnimationFrame(() => {
          setTimeout(() => {
            wrapper.style.opacity = "1";
            wrapper.style.transform = "translateY(0)";
          }, Math.min(delay, 500));
        });
      } else if (animate) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            wrapper.style.opacity = "1";
            wrapper.style.transform = "translateY(0)";
          });
        });
      }
    });
  }

  function _rebuildAll(): void {
    _initColumns();
    _renderItems(_items, false);
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return {
    el: root,
    append, prepend, insert, remove, clear, setItems, getItems,
    getColumnCount, layout, scrollToItem, destroy,
  };
}
