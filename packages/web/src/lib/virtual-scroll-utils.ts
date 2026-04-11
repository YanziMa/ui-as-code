/**
 * Virtual Scroll Utilities: Virtualized list/grid rendering, item sizing,
 * scroll position tracking, dynamic height estimation, range calculation,
 * buffer zones, sticky headers, and scroll-to-index support.
 */

// --- Types ---

export interface VirtualItem {
  /** Unique identifier for the item */
  id: string | number;
  /** Estimated or measured height (px) */
  height: number;
  /** Item data (passed to render function) */
  data?: unknown;
  /** Optional index in source array */
  index?: number;
}

export interface VirtualScrollConfig {
  /** Container element */
  container: HTMLElement;
  /** Total number of items */
  totalCount: number;
  /** Default estimated item height for unmeasured items. Default 50 */
  defaultItemHeight?: number;
  /** Height of each item, or function returning height by index/item */
  getItemHeight?: (index: number) => number;
  /** Number of extra items to render above/below viewport as buffer. Default 5 */
  overscanCount?: number;
  /** Gap between items in px. Default 0 */
  gap?: number;
  /** Render callback: called when visible range changes */
  onRangeChange?: (range: VisibleRange) => void;
  /** Called when scroll position changes */
  onScroll?: (scrollOffset: number) => void;
  /** Enable horizontal scrolling. Default false */
  horizontal?: boolean;
  /** Header height (sticky). Default 0 */
  headerHeight?: number;
  /** Footer height. Default 0 */
  footerHeight?: number;
}

export interface VisibleRange {
  /** Index of first visible item */
  startIndex: number;
  /** Index of last visible item (inclusive) */
  endIndex: number;
  /** Start offset of first item from container top (for alignment) */
  startOffset: number;
  /** End offset after last item */
  endOffset: number;
  /** Total content height */
  totalHeight: number;
  /** Items that should be rendered (with positions) */
  items: Array<{ index: number; offset: number; height: number }>;
}

export interface ScrollToOptions {
  /** Target index to scroll to */
  index: number;
  /** Alignment: "start", "center", "end", "auto". Default "auto" */
  align?: "start" | "center" | "end" | "auto";
  /** Smooth scroll animation. Default false */
  smooth?: boolean;
  /** Additional offset in px */
  offset?: number;
}

// --- Core Virtual Scroller ---

/**
 * VirtualScroller - calculates which items are visible and where they
 * should be positioned for efficient rendering of large lists.
 *
 * @example
 * ```ts
 * const scroller = new VirtualScroller({
 *   container: listEl,
 *   totalCount: 100000,
 *   defaultItemHeight: 60,
 *   onRangeChange: (range) => renderItems(range.items),
 * });
 * ```
 */
export class VirtualScroller {
  private config: Required<VirtualScrollConfig>;
  private itemHeights = new Map<number, number>();
  private measuredItems = new Set<number>();
  private _scrollTop = 0;
  private _scrollLeft = 0;
  private _totalHeight = 0;
  private dirty = true;
  private rafId: number | null = null;
  private cleanupFns: Array<() => void> = [];

  constructor(config: VirtualScrollConfig) {
    this.config = {
      defaultItemHeight: config.defaultItemHeight ?? 50,
      overscanCount: config.overscanCount ?? 5,
      gap: config.gap ?? 0,
      horizontal: config.horizontal ?? false,
      headerHeight: config.headerHeight ?? 0,
      footerHeight: config.footerHeight ?? 0,
      ...config,
    };

    this._recalculateTotal();
    this._bindEvents();
    this._scheduleUpdate();
  }

  /** Get current visible range */
  getVisibleRange(): VisibleRange {
    return this._calculateRange();
  }

  /** Get current scroll position */
  getScrollTop(): number { return this._scrollTop; }
  getScrollLeft(): number { return this._scrollLeft; }

  /** Get total content height */
  getTotalHeight(): number { return this._totalHeight; }

  /** Report a measured item height (call after rendering) */
  reportItemHeight(index: number, height: number): void {
    this.itemHeights.set(index, height);
    this.measuredItems.add(index);
    if (!this.dirty) {
      this.dirty = true;
      this._scheduleUpdate();
    }
  }

  /** Scroll to a specific item index */
  scrollTo(options: ScrollToOptions): void {
    const { index, align = "auto", smooth = false, offset = 0 } = options;

    const itemOffset = this._getItemOffset(index);
    const itemHeight = this._getItemHeight(index);
    const viewHeight = this.config.container.clientHeight - this.config.headerHeight - this.config.footerHeight;

    let targetScroll: number;
    switch (align) {
      case "start":
        targetScroll = itemOffset + this.config.headerHeight - offset;
        break;
      case "end":
        targetScroll = itemOffset + itemHeight - viewHeight + this.config.headerHeight + offset;
        break;
      case "center":
        targetScroll = itemOffset - viewHeight / 2 + itemHeight / 2 + this.config.headerHeight + offset;
        break;
      default: // auto
        const itemBottom = itemOffset + itemHeight;
        if (itemOffset < this._scrollTop) {
          targetScroll = itemOffset + this.config.headerHeight - offset;
        } else if (itemBottom > this._scrollTop + viewHeight) {
          targetScroll = itemBottom - viewHeight + this.config.headerHeight + offset;
        } else {
          return; // Already visible
        }
    }

    targetScroll = Math.max(0, Math.min(targetScroll, this._totalHeight - viewHeight));

    this.config.container.scrollTo({
      top: targetScroll,
      left: undefined,
      behavior: smooth ? "smooth" : "instant",
    });
  }

  /** Update total count (e.g., after data load) */
  setTotalCount(count: number): void {
    this.config.totalCount = count;
    this._recalculateTotal();
    this.dirty = true;
    this._scheduleUpdate();
  }

  /** Reset all measurements and recalculate */
  resetMeasurements(): void {
    this.itemHeights.clear();
    this.measuredItems.clear();
    this._recalculateTotal();
    this.dirty = true;
    this._scheduleUpdate();
  }

  /** Force a recalculation */
  invalidate(): void {
    this.dirty = true;
    this._scheduleUpdate();
  }

  /** Destroy and clean up */
  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  // --- Private ---

  private _getItemHeight(index: number): number {
    // Use provided function
    if (this.config.getItemHeight) {
      return this.config.getItemHeight(index);
    }
    // Use measured value
    if (this.itemHeights.has(index)) {
      return this.itemHeights.get(index)!;
    }
    // Fall back to default
    return this.config.defaultItemHeight;
  }

  private _getItemOffset(index: number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += this._getItemHeight(i) + this.config.gap;
    }
    return offset;
  }

  private _findIndexAtOffset(offset: number): number {
    if (offset <= 0 || this.config.totalCount === 0) return 0;

    let accumulated = 0;
    for (let i = 0; i < this.config.totalCount; i++) {
      const h = this._getItemHeight(i) + this.config.gap;
      if (accumulated + h > offset) return i;
      accumulated += h;
    }
    return Math.max(0, this.config.totalCount - 1);
  }

  private _recalculateTotal(): void {
    let total = 0;
    for (let i = 0; i < this.config.totalCount; i++) {
      total += this._getItemHeight(i) + this.config.gap;
    }
    total -= this.config.gap; // Remove trailing gap
    total += this.config.headerHeight + this.config.footerHeight;
    this._totalHeight = total;
  }

  private _calculateRange(): VisibleRange {
    const containerHeight = this.config.container.clientHeight;
    const scrollTop = this._scrollTop - this.config.headerHeight;
    const effectiveHeight = containerHeight - this.config.headerHeight - this.config.footerHeight;

    const startIndex = Math.max(0, this._findIndexAtOffset(Math.max(0, scrollTop)) - this.config.overscanCount);

    let endOffset = scrollTop + effectiveHeight;
    let endIndex = this._findIndexAtOffset(endOffset) + this.config.overscanCount;
    endIndex = Math.min(endIndex, this.config.totalCount - 1);

    const startOffset = this._getItemOffset(startIndex);

    // Build item list
    const items: Array<{ index: number; offset: number; height: number }> = [];
    let currentOffset = startOffset;
    for (let i = startIndex; i <= endIndex; i++) {
      const h = this._getItemHeight(i);
      items.push({ index: i, offset: currentOffset, height: h });
      currentOffset += h + this.config.gap;
    }

    return {
      startIndex,
      endIndex,
      startOffset,
      endOffset: currentOffset - this.config.gap,
      totalHeight: this._totalHeight,
      items,
    };
  }

  private _bindEvents(): void {
    const el = this.config.container;

    const onScroll = () => {
      this._scrollTop = el.scrollTop;
      this._scrollLeft = el.scrollLeft;
      this.config.onScroll?.(this._scrollTop);
      this.dirty = true;
      this._scheduleUpdate();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    this.cleanupFns.push(() => el.removeEventListener("scroll", onScroll));

    // Initial position
    this._scrollTop = el.scrollTop;
    this._scrollLeft = el.scrollLeft;
  }

  private _scheduleUpdate(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.dirty) {
        this.dirty = false;
        this._recalculateTotal();
        const range = this._calculateRange();
        this.config.onRangeChange?.(range);
      }
    });
  }
}

// --- Dynamic Height Estimator ---

/**
 * Estimates item heights based on recent measurements using an
 * exponential moving average. Improves accuracy over time.
 */
export class DynamicHeightEstimator {
  private estimates = new Map<number, number>();
  private globalAverage = 0;
  private sampleCount = 0;
  private maxSamples: number;
  private defaultHeight: number;

  constructor(defaultHeight = 50, maxSamples = 100) {
    this.defaultHeight = defaultHeight;
    this.maxSamples = maxSamples;
    this.globalAverage = defaultHeight;
  }

  /** Record a measurement for an item at given index */
  record(index: number, height: number): void {
    const prev = this.estimates.get(index);
    if (prev === undefined) {
      this.sampleCount++;
    }

    // EMA update
    const alpha = 1 / Math.min(this.sampleCount, 10);
    const current = prev ?? this.globalAverage;
    const estimate = current + alpha * (height - current);
    this.estimates.set(index, estimate);

    // Update global average
    this.globalAverage = this.globalAverage + alpha * (height - this.globalAverage);
  }

  /** Get estimated height for an item */
  getEstimate(index: number): number {
    return this.estimates.get(index) ?? this.defaultHeight;
  }

  /** Get average of all estimates */
  getGlobalAverage(): number {
    return this.globalAverage;
  }

  /** Get estimated total height for N items starting at index */
  getTotalEstimate(startIndex: number, count: number, gap = 0): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.getEstimate(startIndex + i) + gap;
    }
    return total > gap ? total - gap : total; // Remove trailing gap
  }

  /** Clear all estimates */
  clear(): void {
    this.estimates.clear();
    this.sampleCount = 0;
    this.globalAverage = this.defaultHeight;
  }
}

// --- Grid Virtualization ---

export interface VirtualGridConfig {
  container: HTMLElement;
  /** Total number of items */
  totalCount: number;
  /** Number of columns */
  columns: number;
  /** Item width in px */
  itemWidth: number;
  /** Item height in px (or function) */
  itemHeight: number | ((index: number) => number);
  /** Gap between items (px). Default 8 */
  gap?: number;
  /** Overscan rows. Default 2 */
  overscanRows?: number;
  onRangeChange?: (range: GridVisibleRange) => void;
}

export interface GridVisibleRange {
  startIndex: number;
  endIndex: number;
  items: Array<{
    index: number;
    column: number;
    row: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  totalWidth: number;
  totalHeight: number;
}

/**
 * VirtualGridScroller - virtualizes a grid layout (not just a list).
 */
export class VirtualGridScroller {
  private config: Required<VirtualGridConfig>;
  private _scrollTop = 0;
  private _scrollLeft = 0;
  private dirty = true;
  private rafId: number | null = null;
  private cleanupFns: Array<() => void> = [];

  constructor(config: VirtualGridConfig) {
    this.config = {
      gap: config.gap ?? 8,
      overscanRows: config.overscanRows ?? 2,
      ...config,
    };
    this._bindEvents();
    this._scheduleUpdate();
  }

  getVisibleRange(): GridVisibleRange { return this._calculateRange(); }
  getScrollTop(): number { return this._scrollTop; }
  scrollToIndex(index: number, align: "start" | "center" = "auto"): void {
    const { row } = this._indexToPosition(index);
    const rowHeight = typeof this.config.itemHeight === "function"
      ? this.config.itemHeight(0)
      : this.config.itemHeight;
    const y = row * (rowHeight + this.config.gap);
    this.config.container.scrollTo({ top: y, behavior: "instant" });
  }
  setColumns(cols: number): void { this.config.columns = cols; this.dirty = true; this._scheduleUpdate(); }
  setTotalCount(count: number): void { this.config.totalCount = count; this.dirty = true; this._scheduleUpdate(); }
  destroy(): void {
    for (const fn of this.cleanupFns) fn();
    this.cleanupFns = [];
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  private _indexToPosition(index: number): { column: number; row: number } {
    return { column: index % this.config.columns, row: Math.floor(index / this.config.columns) };
  }

  private _positionToIndex(col: number, row: number): number {
    return row * this.config.columns + col;
  }

  private _getRowHeight(row: number): number {
    return typeof this.config.itemHeight === "function"
      ? this.config.itemHeight(row)
      : this.config.itemHeight;
  }

  private _getYForRow(row: number): number {
    let y = 0;
    for (let r = 0; r < row; r++) {
      y += this._getRowHeight(r) + this.config.gap;
    }
    return y;
  }

  private _findRowAtY(y: number): number {
    let accumulated = 0;
    const totalRows = Math.ceil(this.config.totalCount / this.config.columns);
    for (let r = 0; r < totalRows; r++) {
      accumulated += this._getRowHeight(r) + this.config.gap;
      if (accumulated > y) return r;
    }
    return Math.max(0, totalRows - 1);
  }

  private _calculateRange(): GridVisibleRange {
    const cols = this.config.columns;
    const itemW = this.config.itemWidth;
    const gap = this.config.gap;
    const containerH = this.config.container.clientHeight;
    const totalRows = Math.ceil(this.config.totalCount / cols);

    const startRow = Math.max(0, this._findRowAtY(this._scrollTop) - this.config.overscanRows);
    let endRow = this._findRowAtY(this._scrollTop + containerH) + this.config.overscanRows;
    endRow = Math.min(endRow, totalRows - 1);

    const totalWidth = cols * itemW + (cols - 1) * gap;
    let totalHeight = 0;
    for (let r = 0; r < totalRows; r++) {
      totalHeight += this._getRowHeight(r) + gap;
    }
    totalHeight = totalHeight > gap ? totalHeight - gap : totalHeight;

    const items: GridVisibleRange["items"] = [];

    for (let row = startRow; row <= endRow; row++) {
      const rowH = this._getRowHeight(row);
      const y = this._getYForRow(row);

      for (let col = 0; col < cols; col++) {
        const idx = this._positionToIndex(col, row);
        if (idx >= this.config.totalCount) continue;

        items.push({
          index: idx,
          column: col,
          row,
          x: col * (itemW + gap),
          y,
          width: itemW,
          height: rowH,
        });
      }
    }

    return { startIndex: startRow * cols, endIndex: endRow * cols + cols - 1, items, totalWidth, totalHeight };
  }

  private _bindEvents(): void {
    const el = this.config.container;
    const onScroll = () => {
      this._scrollTop = el.scrollTop;
      this._scrollLeft = el.scrollLeft;
      this.dirty = true;
      this._scheduleUpdate();
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    this.cleanupFns.push(() => el.removeEventListener("scroll", onScroll));
    this._scrollTop = el.scrollTop;
    this._scrollLeft = el.scrollLeft;
  }

  private _scheduleUpdate(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      if (this.dirty) {
        this.dirty = false;
        this.config.onRangeChange?.(this._calculateRange());
      }
    });
  }
}
