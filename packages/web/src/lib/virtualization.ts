/**
 * Virtualization utilities for rendering large lists efficiently.
 */

export interface VirtualItem {
  id: string;
  index: number;
  offsetTop: number;
  height: number;
}

export interface VirtualizerOptions {
  /** Total number of items */
  count: number;
  /** Estimated item height (or function returning height per index) */
  getItemHeight: ((index: number) => number) | number;
  /** Container height in pixels (required) */
  containerHeight: number;
  /** Overscan buffer in pixels (default: 200) */
  overscan?: number;
  /** Top padding offset (for sticky headers, etc.) */
  topOffset?: number;
}

export interface VirtualizerResult {
  /** Items currently visible (plus overscan) */
  items: VirtualItem[];
  /** Total scrollable height */
  totalHeight: number;
  /** Start index of visible range */
  startIndex: number;
  /** End index of visible range */
  endIndex: number;
}

/**
 * Calculate which items to render based on scroll position.
 * Returns the virtualized result with items to render and positioning info.
 */
export function calculateVisibleItems(
  scrollTop: number,
  options: VirtualizerOptions,
): VirtualizerResult {
  const { count, getItemHeight, containerHeight, overscan = 200, topOffset = 0 } = options;

  const getItemH = typeof getItemHeight === "function" ? getItemHeight : () => getItemHeight;

  // Build position cache
  const positions: number[] = new Array(count + 1);
  positions[0] = 0;
  for (let i = 0; i < count; i++) {
    positions[i + 1] = positions[i] + getItemH(i);
  }
  const totalHeight = positions[count];

  // Binary search for start index
  let startIdx = 0;
  let lo = 0;
  let hi = count - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (positions[mid] < scrollTop - topOffset - overscan) {
      startIdx = mid + 1;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  // Find end index
  let endIdx = startIdx;
  const viewportBottom = scrollTop + containerHeight + topOffset + overscan;
  while (endIdx < count && positions[endIdx] < viewportBottom) {
    endIdx++;
  }

  // Build visible items array
  const items: VirtualItem[] = [];
  for (let i = startIdx; i < endIdx; i++) {
    items.push({
      id: `virtual-${i}`,
      index: i,
      offsetTop: positions[i],
      height: getItemH(i),
    });
  }

  return { items, totalHeight, startIndex: startIdx, endIndex: endIdx };
}

/**
 * Dynamic height virtualizer that measures actual DOM heights.
 * Call `updateItemHeight()` when an item's measured height changes.
 */
export class DynamicVirtualizer {
  private positions: number[] = [];
  private measuredHeights: Map<number, number> = new Map();
  private defaultHeight: number;

  constructor(
    public count: number,
    defaultHeight: number = 50,
  ) {
    this.defaultHeight = defaultHeight;
    this.rebuildPositions();
  }

  /** Update the total item count */
  setCount(newCount: number): void {
    this.count = newCount;
    this.rebuildPositions();
  }

  /** Record a measured height for a specific item */
  updateItemHeight(index: number, height: number): void {
    this.measuredHeights.set(index, height);
    this.rebuildPositions();
  }

  /** Get the current position cache */
  getPositions(): readonly number[] {
    return this.positions;
  }

  /** Get height for a specific item */
  getItemHeight(index: number): number {
    return this.measuredHeights.get(index) ?? this.defaultHeight;
  }

  /** Calculate visible items (same as calculateVisibleItems but uses internal state) */
  getVisible(scrollTop: number, containerHeight: number, overscan = 200): VirtualizerResult {
    return calculateVisibleItems(scrollTop, {
      count: this.count,
      getItemHeight: (i) => this.getItemHeight(i),
      containerHeight,
      overscan,
    });
  }

  /** Get total scrollable height */
  get totalHeight(): number {
    return this.positions[this.count] ?? 0;
  }

  /** Get offset for a specific item's top position */
  getItemOffset(index: number): number {
    return this.positions[index] ?? 0;
  }

  /** Reset all measurements */
  reset(defaultHeight?: number): void {
    if (defaultHeight !== undefined) this.defaultHeight = defaultHeight;
    this.measuredHeights.clear();
    this.rebuildPositions();
  }

  private rebuildPositions(): void {
    this.positions = new Array(this.count + 1);
    this.positions[0] = 0;
    for (let i = 0; i < this.count; i++) {
      this.positions[i + 1] = this.positions[i] + this.getItemHeight(i);
    }
  }
}

/**
 * Grid virtualizer for 2D grid layouts.
 */
export interface GridVirtualizerOptions {
  columns: number;
  rowCount: number;
  columnWidth: number;
  rowHeight: number;
  gap?: number;
  containerWidth: number;
  containerHeight: number;
  overscanRows?: number;
  overscanCols?: number;
}

export interface GridVirtualizerResult {
  cells: { row: number; col: number; left: number; top: number }[];
  totalWidth: number;
  totalHeight: number;
}

export function calculateGridCells(
  scrollLeft: number,
  scrollTop: number,
  options: GridVirtualizerOptions,
): GridVirtualizerResult {
  const {
    columns,
    rowCount,
    columnWidth,
    rowHeight,
    gap = 8,
    containerWidth,
    containerHeight,
    overscanRows = 2,
    overscanCols = 2,
  } = options;

  const cellW = columnWidth + gap;
  const cellH = rowHeight + gap;

  const startCol = Math.max(0, Math.floor((scrollLeft - overscanCols * cellW) / cellW));
  const endCol = Math.min(columns - 1, Math.ceil((scrollLeft + containerWidth + overscanCols * cellW) / cellW));
  const startRow = Math.max(0, Math.floor((scrollTop - overscanRows * cellH) / cellH));
  const endRow = Math.min(rowCount - 1, Math.ceil((scrollTop + containerHeight + overscanRows * cellH) / cellH));

  const cells: GridVirtualizerResult["cells"] = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol; col <= endCol; col++) {
      cells.push({ row, col, left: col * cellW, top: row * cellH });
    }
  }

  return {
    cells,
    totalWidth: columns * cellW - gap,
    totalHeight: rowCount * cellH - gap,
  };
}
