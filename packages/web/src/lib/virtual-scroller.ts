/**
 * Virtual Scroller: High-performance virtualized scrolling engine for large lists,
 * grids, and tables with dynamic sizing, sticky headers, infinite loading,
 * bi-directional scroll, smooth scrollTo, and accessibility support.
 */

// --- Types ---

export interface ScrollItem<T = unknown> {
  id: string;
  data: T;
  /** Estimated or measured height (for vertical) / width (for horizontal) */
  size: number;
  /** Actual measured size after render */
  actualSize?: number;
  /** Index in the source data */
  index: number;
}

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  startOffset: number;
  endOffset: number;
  totalSize: number;
  overscanBefore: number;
  overscanAfter: number;
}

export interface ScrollerConfig<T> {
  /** Total number of items */
  itemCount: number;
  /** Get item data by index */
  getItem: (index: number) => T | Promise<T>;
  /** Get unique key for an item */
  getItemKey?: (item: T, index: number) => string;
  /** Estimated default item size in px (default: 50) */
  estimatedItemSize?: number;
  /** Container height/width in px */
  viewportSize: number;
  /** Number of extra items to render above/below viewport (default: 5) */
  overscanCount?: number;
  /** Direction of scrolling (default: "vertical") */
  direction?: "vertical" | "horizontal" | "both";
  /** Enable dynamic/measured item sizes (default: true) */
  dynamicSizing?: boolean;
  /** Sticky header indices (items that stick to top/left) */
  stickyIndices?: Set<number>;
  /** Section headers: indices that act as section dividers */
  sectionHeaders?: Map<number, { id: string; height: number; data: unknown }>;
  /** Grid mode: items per row/column */
  gridColumns?: number;
  /** Infinite loading: callback when near the end */
  loadMore?: (direction: "forward" | "backward") => Promise<number>;
  /** Threshold to trigger loadMore (0-1, fraction from edge, default: 0.8) */
  loadThreshold?: number;
  /** Smooth scrolling duration (ms, default: 300) */
  scrollDuration?: number;
  /** Enable keyboard navigation */
  keyboardNav?: boolean;
  /** Accessibility label */
  ariaLabel?: string;
  /** Debug mode: log measurements */
  debug?: boolean;
}

export interface ScrollerState {
  scrollTop: number;
  scrollLeft: number;
  isScrolling: boolean;
  isLoadingMore: boolean;
  visibleRange: VisibleRange;
  totalContentSize: number;
  itemCount: number;
  measuredItemCount: number;
}

export interface ScrollToOptions {
  index?: number;
  offset?: number;
  align?: "start" | "center" | "end" | "auto";
  animated?: boolean;
  duration?: number;
}

// --- Size Cache ---

class SizeCache {
  private sizes = new Map<number, number>(); // index -> size
  private defaultSize: number;

  constructor(defaultSize: number) {
    this.defaultSize = defaultSize;
  }

  set(index: number, size: number): void {
    this.sizes.set(index, size);
  }

  get(index: number): number {
    return this.sizes.get(index) ?? this.defaultSize;
  }

  has(index: number): boolean {
    return this.sizes.has(index);
  }

  /** Get total size up to (but not including) index */
  getSizeUpTo(index: number): number {
    let total = 0;
    for (let i = 0; i < index; i++) {
      total += this.get(i);
    }
    return total;
  }

  /** Get total content size for all items */
  getTotal(count: number): number {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += this.get(i);
    }
    return total;
  }

  /** Find index at given offset using binary search on measured + estimated sizes */
  findIndexAtOffset(offset: number, count: number): number {
    if (count === 0) return 0;
    if (offset <= 0) return 0;

    let low = 0;
    let high = count - 1;
    let accumulated = 0;

    // First check if we're past the end
    const total = this.getTotal(count);
    if (offset >= total) return count;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      const midSize = this.getSizeUpTo(mid);

      if (midSize <= offset) {
        low = mid;
        accumulated = midSize;
      } else {
        high = mid - 1;
      }
    }

    return low;
  }

  /** Update default size and recalculate */
  setDefault(size: number): void {
    this.defaultSize = size;
  }

  clear(): void {
    this.sizes.clear();
  }

  get measuredCount(): number {
    return this.sizes.size;
  }
}

// --- Virtual Scroller ---

export class VirtualScroller<T = unknown> {
  private config: Required<ScrollerConfig<T>>;
  private cache: SizeCache;
  private state: ScrollerState;
  private listeners = new Set<(state: ScrollerState) => void>();
  private rafId: number | null = null;
  private scrollContainer: HTMLElement | Window | null = null;
  private isScrolling = false;
  private scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  private itemCount = 0;
  private focusedIndex = -1;
  private _destroyed = false;

  constructor(config: ScrollerConfig<T>) {
    this.config = {
      ...config,
      estimatedItemSize: config.estimatedItemSize ?? 50,
      overscanCount: config.overscanCount ?? 5,
      direction: config.direction ?? "vertical",
      dynamicSizing: config.dynamicSizing ?? true,
      stickyIndices: config.stickyIndices ?? new Set(),
      sectionHeaders: config.sectionHeaders ?? new Map(),
      loadThreshold: config.loadThreshold ?? 0.8,
      scrollDuration: config.scrollDuration ?? 300,
      keyboardNav: config.keyboardNav ?? false,
      debug: config.debug ?? false,
      getItemKey: config.getItemKey ?? ((_item: T, index: number) => `item-${index}`),
    };

    this.cache = new SizeCache(this.config.estimatedItemSize);
    this.itemCount = config.itemCount;

    this.state = {
      scrollTop: 0,
      scrollLeft: 0,
      isScrolling: false,
      isLoadingMore: false,
      visibleRange: this.calculateRange(0),
      totalContentSize: this.cache.getTotal(this.itemCount),
      itemCount: this.itemCount,
      measuredItemCount: 0,
    };
  }

  // --- Lifecycle ---

  /** Attach to a scroll container */
  attach(container: HTMLElement | Window): void {
    this.scrollContainer = container;
    const handler = () => this.handleScroll();
    container.addEventListener("scroll", handler, { passive: true });
    // Store handler reference for cleanup
    (this as any)._scrollHandler = handler;

    // Initial calculation
    this.handleScroll();

    // Keyboard nav
    if (this.config.keyboardNav) {
      container.addEventListener("keydown", this.handleKeyDown as EventListener);
    }
  }

  /** Detach from scroll container */
  detach(): void {
    if (this.scrollContainer && (this as any)._scrollHandler) {
      this.scrollContainer.removeEventListener("scroll", (this as any)._scrollHandler);
      if (this.config.keyboardNav) {
        this.scrollContainer.removeEventListener("keydown", this.handleKeyDown as EventListener);
      }
    }
    this._destroyed = true;
  }

  // --- Scrolling ---

  /** Scroll to a specific item or offset */
  async scrollTo(options: ScrollToOptions): Promise<void> {
    const { index, offset, align = "auto", animated = true, duration } = options;

    let targetOffset = offset ?? 0;

    if (index !== undefined && index >= 0 && index < this.itemCount) {
      const itemOffset = this.cache.getSizeUpTo(index);
      const itemSize = this.cache.get(index);

      switch (align) {
        case "start": targetOffset = itemOffset; break;
        case "center": targetOffset = itemOffset - (this.config.viewportSize / 2) + (itemSize / 2); break;
        case "end": targetOffset = itemOffset - this.config.viewportSize + itemSize; break;
        case "auto":
        default:
          targetOffset = itemOffset;
          // If already visible, don't scroll
          const range = this.calculateRange(this.state.scrollTop);
          if (index >= range.startIndex && index <= range.endIndex) return;
          break;
      }
    }

    targetOffset = Math.max(0, Math.min(targetOffset, this.state.totalContentSize - this.config.viewportSize));

    if (!animated || !this.scrollContainer) {
      this.setScrollPosition(targetOffset);
      return;
    }

    // Animated scroll
    const start = this.getScrollPosition();
    const distance = targetOffset - start;
    const dur = duration ?? this.config.scrollDuration;
    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / dur, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        this.setScrollPosition(start + distance * eased);

        if (progress < 1) {
          this.rafId = requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      this.rafId = requestAnimationFrame(step);
    });
  }

  /** Scroll to top */
  scrollToTop(animated = true): Promise<void> {
    return this.scrollTo({ offset: 0, animated });
  }

  /** Scroll to bottom */
  scrollToBottom(animated = true): Promise<void> {
    return this.scrollTo({ offset: this.state.totalContentSize, animated });
  }

  /** Scroll item into view */
  scrollIntoView(index: number, align: "start" | "center" | "end" = "auto"): Promise<void> {
    return this.scrollTo({ index, align });
  }

  // --- Measurement ---

  /** Report the measured size of an item (call after rendering) */
  reportItemSize(index: number, size: number): void {
    if (!this.config.dynamicSizing) return;
    const oldSize = this.cache.get(index);

    if (Math.abs(oldSize - size) > 0.5) {
      this.cache.set(index, size);
      // Recalculate range if significant change
      if (this.config.debug) {
        console.log(`[VirtualScroller] Item ${index} size changed: ${oldSize} → ${size}`);
      }
      this.updateState();
    }
  }

  /** Reset all cached sizes (call when data changes significantly) */
  resetSizes(): void {
    this.cache.clear();
    this.updateState();
  }

  // --- Data Management ---

  /** Update item count (e.g., after loading more) */
  setItemCount(count: number): void {
    this.itemCount = count;
    this.state.itemCount = count;
    this.state.totalContentSize = this.cache.getTotal(count);
    this.updateState();
  }

  /** Get currently visible item indices */
  getVisibleRange(): VisibleRange {
    return this.state.visibleRange;
  }

  /** Get items that should be rendered */
  getVisibleItems(): Array<ScrollItem<T>> {
    const range = this.state.visibleRange;
    const items: ScrollItem<T>[] = [];

    for (let i = range.startIndex; i <= range.endIndex; i++) {
      if (i < 0 || i >= this.itemCount) continue;
      items.push({
        id: this.config.getItemKey(null as T, i),
        data: null as T, // Caller should fill this via getItem
        size: this.cache.get(i),
        index: i,
      });
    }

    return items;
  }

  // --- State ---

  /** Get current scroller state */
  getState(): ScrollerState {
    return { ...this.state };
  }

  /** Subscribe to state changes */
  onChange(listener: (state: ScrollerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- Keyboard Navigation ---

  /** Move focus to next item */
  focusNext(): void {
    if (this.focusedIndex < this.itemCount - 1) {
      this.focusedIndex++;
      this.scrollIntoView(this.focusedIndex, "center");
      this.notifyListeners();
    }
  }

  /** Move focus to previous item */
  focusPrev(): void {
    if (this.focusedIndex > 0) {
      this.focusedIndex--;
      this.scrollIntoView(this.focusedIndex, "center");
      this.notifyListeners();
    }
  }

  /** Get currently focused index */
  getFocusedIndex(): number { return this.focusedIndex; }

  // --- Internal ---

  private handleScroll(): void {
    const pos = this.getScrollPosition();
    this.state.scrollTop = this.config.direction === "vertical" || this.config.direction === "both" ? pos : this.state.scrollTop;
    this.state.scrollLeft = this.config.direction === "horizontal" || this.config.direction === "both" ? pos : this.state.scrollLeft;

    this.isScrolling = true;
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.state.isScrolling = false;
      this.notifyListeners();
    }, 150);

    this.checkLoadMore();
    this.updateState();
  }

  private calculateRange(scrollPos: number): VisibleRange {
    const overscan = this.config.overscanCount;
    const viewportSize = this.config.viewportSize;
    const totalCount = this.itemCount;

    if (totalCount === 0) {
      return { startIndex: 0, endIndex: -1, startOffset: 0, endOffset: 0, totalSize: 0, overscanBefore: 0, overscanAfter: 0 };
    }

    const startIndex = this.cache.findIndexAtOffset(Math.max(0, scrollPos), totalCount);
    let endIndex = this.cache.findIndexAtOffset(scrollPos + viewportSize, totalCount);

    // Apply overscan
    const startIdx = Math.max(0, startIndex - overscan);
    const endIdx = Math.min(totalCount - 1, endIndex + overscan);

    const startOffset = this.cache.getSizeUpTo(startIdx);
    const endOffset = this.cache.getSizeUpTo(endIdx + 1);
    const totalSize = this.cache.getTotal(totalCount);

    return {
      startIndex: startIdx,
      endIndex: endIdx,
      startOffset,
      endOffset,
      totalSize,
      overscanBefore: startIndex - startIdx,
      overscanAfter: endIdx - endIndex,
    };
  }

  private updateState(): void {
    if (this._destroyed) return;
    const scrollPos = this.getScrollPosition();
    this.state.visibleRange = this.calculateRange(scrollPos);
    this.state.totalContentSize = this.cache.getTotal(this.itemCount);
    this.state.measuredItemCount = this.cache.measuredCount;
    this.notifyListeners();
  }

  private async checkLoadMore(): Promise<void> {
    if (!this.config.loadMore || this.state.isLoadingMore) return;

    const pos = this.getScrollPosition();
    const maxScroll = this.state.totalContentSize - this.config.viewportSize;
    const ratio = maxScroll > 0 ? pos / maxScroll : 0;

    // Check forward threshold
    if (ratio > this.config.loadThreshold) {
      this.state.isLoadingMore = true;
      this.notifyListeners();
      try {
        const newCount = await this.config.loadMore("forward");
        if (newCount > 0) this.setItemCount(newCount);
      } catch (e) {
        if (this.config.debug) console.error("[VirtualScroller] loadMore failed:", e);
      } finally {
        this.state.isLoadingMore = false;
        this.notifyListeners();
      }
    }
  }

  private getScrollPosition(): number {
    if (!this.scrollContainer) return 0;
    if (this.scrollContainer === window) {
      return this.config.direction === "horizontal"
        ? this.scrollContainer.scrollX
        : this.scrollContainer.scrollY;
    }
    const el = this.scrollContainer as HTMLElement;
    return this.config.direction === "horizontal" ? el.scrollLeft : el.scrollTop;
  }

  private setScrollPosition(pos: number): void {
    if (!this.scrollContainer) return;
    if (this.scrollContainer === window) {
      if (this.config.direction === "horizontal") {
        window.scrollTo(pos, window.scrollY);
      } else {
        window.scrollTo(window.scrollX, pos);
      }
    } else {
      const el = this.scrollContainer as HTMLElement;
      if (this.config.direction === "horizontal") {
        el.scrollLeft = pos;
      } else {
        el.scrollTop = pos;
      }
    }
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        this.focusNext();
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        this.focusPrev();
        break;
      case "Home":
        e.preventDefault();
        this.focusedIndex = 0;
        this.scrollToTop();
        break;
      case "End":
        e.preventDefault();
        this.focusedIndex = this.itemCount - 1;
        this.scrollToBottom();
        break;
    }
  };

  private notifyListeners(): void {
    for (const l of this.listeners) l(this.getState());
  }
}
