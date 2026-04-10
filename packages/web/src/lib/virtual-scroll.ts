/**
 * Virtual scrolling / windowing for large lists with dynamic row heights.
 */

export interface VirtualScrollItem<T = unknown> {
  id: string | number;
  data: T;
  /** Estimated or measured height */
  height?: number;
}

export interface VirtualScrollOptions<T> {
  /** Container element (required) */
  container: HTMLElement;
  /** Item count or data array */
  itemCount?: number;
  items?: T[];
  /** Unique key extractor */
  getItemKey?: (index: number, item: T) => string | number;
  /** Estimate item height (px) */
  estimatedItemHeight?: number;
  /** Overscan buffer (extra items rendered above/below viewport) */
  overscan?: number;
  /** Height getter/measurer */
  measureItem?: (item: T, index: number) => number;
  /** Called when visible range changes */
  onRangeChange?: (startIndex: number, endIndex: number, items: T[]) => void;
  /** Scroll position change callback */
  onScroll?: (scrollTop: number) => void;
  /** Enable dynamic height measurement */
  dynamicHeights?: boolean;
}

export interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  totalHeight: number;
  offsetTop: number; // translateY for the content wrapper
  visibleItems: Array<{ index: number; offset: number }>;
}

/** Create a virtual scroll manager */
export function createVirtualScroll<T>(
  options: VirtualScrollOptions<T>,
): VirtualScrollController<T> {
  const {
    container,
    items,
    itemCount,
    getItemKey = (_i, _item) => _i,
    estimatedItemHeight = 50,
    overscan = 3,
    measureItem,
    onRangeChange,
    onScroll,
    dynamicHeights = false,
  } = options;

  const dataSource = items ?? [];
  const totalCount = itemCount ?? dataSource.length;

  // Measured heights cache
  const heightCache = new Map<string | number, number>();
  let defaultHeight = estimatedItemHeight;

  // State
  let scrollTop = 0;
  let isScrolling = false;
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  // DOM elements
  const inner = document.createElement("div");
  inner.style.cssText = "position:relative;width:100%;will-change:transform;";
  container.style.overflow = "auto";
  container.style.position = "relative";
  container.appendChild(inner);

  // --- Core calculations ---

  function getItemHeight(index: number): number {
    const key = getItemKey(index, dataSource[index]!);
    const cached = heightCache.get(key);
    if (cached !== undefined) return cached;
    if (measureItem && dataSource[index] !== undefined) {
      const measured = measureItem(dataSource[index]!, index);
      if (measured > 0) {
        heightCache.set(key, measured);
        return measured;
      }
    }
    return defaultHeight;
  }

  function getOffsetForIndex(index: number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }

  function getIndexForOffset(offset: number): number {
    let accumulated = 0;
    for (let i = 0; i < totalCount; i++) {
      accumulated += getItemHeight(i);
      if (accumulated > offset) return i;
    }
    return Math.max(0, totalCount - 1);
  }

  function getTotalHeight(): number {
    let total = 0;
    for (let i = 0; i < totalCount; i++) {
      total += getItemHeight(i);
    }
    return total;
  }

  function calculateVisibleRange(): { start: number; end: number } {
    const containerHeight = container.clientHeight;
    const start = Math.max(0, getIndexForOffset(scrollTop) - overscan);
    const end = Math.min(
      totalCount - 1,
      getIndexForOffset(scrollTop + containerHeight) + overscan,
    );
    return { start, end };
  }

  function render(): void {
    if (destroyed) return;

    const { start, end } = calculateVisibleRange();
    const totalH = getTotalHeight();
    const offsetTop = getOffsetForIndex(start);

    // Set total height as spacer
    inner.style.height = `${totalH}px`;
    inner.style.transform = `translateY(${offsetTop}px)`;

    // Notify of range change
    const visibleItems = dataSource.slice(start, end + 1);
    onRangeChange?.(start, end, visibleItems);

    return {
      startIndex: start,
      endIndex: end,
      scrollTop,
      totalHeight: totalH,
      offsetTop,
      visibleItems: Array.from({ length: end - start + 1 }, (_, i) => ({
        index: start + i,
        offset: getOffsetForIndex(start + i) - offsetTop,
      })),
    };
  }

  // --- Event handlers ---

  function handleScroll(): void {
    if (destroyed) return;
    scrollTop = container.scrollTop;
    isScrolling = true;

    onScroll?.(scrollTop);

    render();

    // Detect scroll stop
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
    }, 150);
  }

  container.addEventListener("scroll", handleScroll, { passive: true });

  // Initial render
  render();

  // Resize observer to recalculate on container resize
  const resizeObserver = new ResizeObserver(() => {
    if (!destroyed) render();
  });
  resizeObserver.observe(container);

  return {
    getState(): VirtualScrollState {
      const { start, end } = calculateVisibleRange();
      return {
        startIndex: start,
        endIndex: end,
        scrollTop,
        totalHeight: getTotalHeight(),
        offsetTop: getOffsetForIndex(start),
        visibleItems: Array.from({ length: end - start + 1 }, (_, i) => ({
          index: start + i,
          offset: getOffsetFor(start + i) - getOffsetFor(start),
        })),
      };
    },

    scrollToIndex(index: number, align: "start" | "center" | "end" = "start"): void {
      const offset = getOffsetForIndex(index);
      const itemHeight = getItemHeight(index);
      const containerHeight = container.clientHeight;

      let targetOffset = offset;
      if (align === "center") targetOffset = offset - containerHeight / 2 + itemHeight / 2;
      else if (align === "end") targetOffset = offset - containerHeight + itemHeight;

      container.scrollTop = targetOffset;
    },

    scrollToTop(): void {
      container.scrollTop = 0;
    },

    scrollToBottom(): void {
      container.scrollTop = getTotalHeight();
    },

    /** Update measured height for an item */
    setItemHeight(index: number, height: number): void {
      const key = getItemKey(index, dataSource[index]!);
      heightCache.set(key, height);
      render();
    },

    /** Update all items */
    setItems(newItems: T[]): void {
      // Note: in a real implementation you'd update the internal data source
      // For now just trigger re-render
      render();
    },

    /** Update default estimated height */
    setEstimatedHeight(height: number): void {
      defaultHeight = height;
      render();
    },

    /** Force recalculation */
    refresh(): void {
      render();
    },

    /** Check if currently scrolling */
    isScrolling(): boolean {
      return isScrolling;
    },

    destroy(): void {
      destroyed = true;
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (scrollTimeout) clearTimeout(scrollTimeout);
      inner.remove();
    },
  };
}

export type VirtualScrollController<T> = ReturnType<typeof createVirtualScroll>;

// --- Grid Virtualization ---

export interface VirtualGridOptions<T> {
  container: HTMLElement;
  items: T[];
  columns: number;
  columnWidth: number;
  rowHeight?: number;
  gap?: number;
  overscan?: number;
  getItemKey?: (index: number, item: T) => string | number;
  onRangeChange?: (startIndex: number, endIndex: number, items: T[]) => void;
}

export interface VirtualGridState {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
  visibleCells: Array<{ index: number; row: number; col: number; x: number; y: number }>;
}

/** Create a virtualized grid */
export function createVirtualGrid<T>(
  options: VirtualGridOptions<T>,
): VirtualGridController<T> {
  const {
    container,
    items,
    columns,
    columnWidth,
    rowHeight = 100,
    gap = 8,
    overscan = 1,
    getItemKey = (_i, _item) => _i,
    onRangeChange,
  } = options;

  let scrollTop = 0;
  let scrollLeft = 0;
  let destroyed = false;

  const rowCount = Math.ceil(items.length / columns);
  const cellWidth = columnWidth + gap;
  const cellHeight = rowHeight + gap;

  const inner = document.createElement("div");
  inner.style.cssText = "position:relative;display:grid;";
  container.style.overflow = "auto";
  container.style.position = "relative";
  container.appendChild(inner);

  function calculateVisible(): VirtualGridState {
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;

    const startRow = Math.max(0, Math.floor(scrollTop / cellHeight) - overscan);
    const endRow = Math.min(rowCount - 1, Math.ceil((scrollTop + containerHeight) / cellHeight) + overscan);
    const startCol = Math.max(0, Math.floor(scrollLeft / cellWidth) - overscan);
    const endCol = Math.min(columns - 1, Math.ceil((scrollLeft + containerWidth) / cellWidth) + overscan);

    const visibleCells: VirtualGridState["visibleCells"] = [];

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const index = row * columns + col;
        if (index < items.length) {
          visibleCells.push({
            index,
            row,
            col,
            x: col * cellWidth,
            y: row * cellHeight,
          });
        }
      }
    }

    const state: VirtualGridState = { startRow, endRow, startCol, endCol, visibleCells };
    onRangeChange?.(
      startRow * columns,
      Math.min(endRow * columns + columns - 1, items.length - 1),
      items.slice(startRow * columns, endRow * columns + columns),
    );

    return state;
  }

  function handleScroll(): void {
    if (destroyed) return;
    scrollTop = container.scrollTop;
    scrollLeft = container.scrollLeft;
    calculateVisible();
  }

  container.addEventListener("scroll", handleScroll, { passive: true });

  // Set dimensions
  inner.style.width = `${columns * columnWidth + (columns - 1) * gap}px`;
  inner.style.height = `${rowCount * rowHeight + (rowCount - 1) * gap}px`;

  calculateVisible();

  return {
    getState(): VirtualGridState {
      return calculateVisible();
    },

    scrollToCell(index: number): void {
      const row = Math.floor(index / columns);
      const col = index % columns;
      container.scrollTo({
        top: row * cellHeight,
        left: col * cellWidth,
      });
    },

    refresh(): void {
      calculateVisible();
    },

    destroy(): void {
      destroyed = true;
      container.removeEventListener("scroll", handleScroll);
      inner.remove();
    },
  };
}

export type VirtualGridController<T> = ReturnType<typeof createVirtualGrid>;
