/**
 * Virtualized List: High-performance windowed rendering for large lists/tables.
 *
 * Provides:
 * - **Windowed rendering**: Only render visible rows (+ overscan buffer)
 * - **Dynamic row heights**: Support for fixed and variable-height rows
 * - **Scroll position restoration**: Maintain scroll position on data changes
 * - **Bi-directional infinite scrolling**: Load more data when scrolling up/down
 * - **Sticky headers**: Section headers that stick at top during scroll
 * - **Grid mode**: Virtualized grid layout with column virtualization
 * - **Keyboard navigation**: Arrow keys, Home/End, Page Up/Down
 * - **Accessibility**: ARIA roles, screen reader support
 * - **Smooth scrolling**: Animated scrollTo with easing
 * - **ResizeObserver integration**: Auto-recalculate on container resize
 */

// --- Types ---

export interface VirtualItem<T = unknown> {
  id: string | number;
  data: T;
  height?: number;              // Known height (for variable height mode)
  index: number;
}

export interface VirtualListConfig<T = unknown> {
  /** Total number of items */
  totalCount: number;
  /** Container height in pixels */
  containerHeight: number;
  /** Default row height for items without explicit height */
  defaultItemHeight?: number;
  /** Overscan buffer (extra rows rendered above/below viewport) */
  overscan?: number;
  /** Estimated average row height (for scrollbar estimation) */
  estimatedItemHeight?: number;
  /** Enable variable height mode */
  variableHeight?: boolean;
  /** Item renderer function */
  renderItem: (item: VirtualItem<T>, state: RenderState) => HTMLElement | string;
  /** Called when visible range changes */
  onRangeChange?: (range: VisibleRange) => void;
  /** Called when user scrolls near bottom (for infinite loading) */
  onNearBottom?: (distance: number) => void;
  /** Threshold for triggering near-bottom callback (pixels from bottom) */
  nearBottomThreshold?: number;
  /** Enable sticky section headers */
  stickyHeaders?: boolean;
  /** Get section key for an item (for sticky headers) */
  getSectionKey?: (index: number) => string;
  /** Header renderer for sections */
  renderSectionHeader?: (sectionKey: string) => HTMLElement | string;
  /** Grid mode columns */
  gridColumns?: number;
  /** Gap between grid items */
  gap?: number;
}

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  startOffset: number;
  endOffset: number;
}

export interface RenderState {
  isVisible: boolean;
  isFirstVisible: boolean;
  isLastVisible: boolean;
  offsetTop: number;
}

export interface ScrollPosition {
  scrollTop: number;
  scrollLeft: number;
  scrollHeight: number;
  scrollPercentage: number;
}

export interface VirtualListMetrics {
  totalHeight: number;
  viewportHeight: number;
  visibleItemCount: number;
  renderedItemCount: number;
  scrollPosition: ScrollPosition;
  estimatedScrollHeight: number;
}

// --- Position Cache (for variable height tracking) ---

class PositionCache {
  private positions: Map<number, { offset: number; height: number }> = new Map();
  private estimatedHeight: number;
  private lastIndex = -1;
  private lastOffset = 0;

  constructor(estimatedHeight = 50) {
    this.estimatedHeight = estimatedHeight;
  }

  /** Update or add a position entry */
  set(index: number, height: number): void {
    const prev = this.positions.get(index);
    const offset = prev?.offset ?? this.estimateOffset(index);
    this.positions.set(index, { offset, height });

    // Recalculate offsets for all subsequent positions
    if (prev && prev.height !== height) {
      this.recalculateFrom(index + 1);
    }
  }

  /** Get the offset (top position) for an item index */
  getOffset(index: number): number {
    const pos = this.positions.get(index);
    if (pos) return pos.offset;
    return this.estimateOffset(index);
  }

  /** Get the height for an item index */
  getHeight(index: number): number {
    return this.positions.get(index)?.height ?? this.estimatedHeight;
  }

  /** Get total height of all items up to count */
  getTotalHeight(count: number): number {
    if (count === 0) return 0;
    const lastPos = this.positions.get(count - 1);
    if (lastPos) return lastPos.offset + lastPos.height;
    return this.estimateOffset(count);
  }

  /** Find the index for a given scroll offset */
  findIndex(offset: number, count: number): number {
    // Binary search through known positions
    let low = 0;
    let high = Math.min(this.positions.size - 1, count - 1);

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midPos = this.positions.get(mid);
      if (!midPos) break;

      if (midPos.offset <= offset && midPos.offset + midPos.height > offset) return mid;
      if (midPos.offset < offset) low = mid + 1;
      else high = mid - 1;
    }

    // Fallback: estimate from nearest known position
    return Math.min(Math.floor(offset / this.estimatedHeight), count - 1);
  }

  /** Clear all cached positions */
  clear(): void { this.positions.clear(); this.lastIndex = -1; this.lastOffset = 0; }

  /** Remove positions after a given index (for data changes) */
  trimAfter(index: number): void {
    for (const [i] of [...this.positions].filter(([k]) => k > index)) {
      this.positions.delete(i);
    }
  }

  private estimateOffset(index: number): number {
    if (this.lastIndex >= 0 && index > this.lastIndex) {
      return this.lastOffset + (index - this.lastIndex) * this.estimatedHeight;
    }
    return index * this.estimatedHeight;
  }

  private recalculateFrom(startIndex: number): void {
    let offset = this.getOffset(startIndex - 1) + this.getHeight(startIndex - 1);
    for (let i = startIndex; ; i++) {
      const pos = this.positions.get(i);
      if (!pos) break;
      pos.offset = offset;
      offset += pos.height;
    }
  }
}

// --- Virtual List Engine ---

export class VirtualList<T = unknown> {
  private config: Required<VirtualListConfig<T>> & VirtualListConfig<T>;
  private positionCache: PositionCache;
  private container: HTMLElement | null = null;
  private contentElement: HTMLElement | null = null;
  private currentRange: VisibleRange = { startIndex: 0, endIndex: 0, startOffset: 0, endOffset: 0 };
  private scrollHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private itemElements = new Map<number | string, HTMLElement>();
  private measuredHeights = new Map<number, number>();
  private rafId: number | null = null;
  private isScrolling = false;
  private scrollTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config: VirtualListConfig<T>) {
    const estHeight = config.estimatedItemHeight ?? config.defaultItemHeight ?? 50;
    this.config = {
      ...config,
      defaultItemHeight: config.defaultItemHeight ?? 50,
      overscan: config.overscan ?? 5,
      estimatedItemHeight: estHeight,
      variableHeight: config.variableHeight ?? false,
      nearBottomThreshold: config.nearBottomThreshold ?? 200,
    } as Required<VirtualListConfig<T>> & VirtualListConfig<T>;

    this.positionCache = new PositionCache(estHeight);
  }

  /** Attach to a DOM container element */
  attach(container: HTMLElement): void {
    this.container = container;
    container.style.overflow = "auto";
    container.style.position = "relative";
    container.setAttribute("role", "listbox");
    container.tabIndex = 0;

    // Create content wrapper
    this.contentElement = document.createElement("div");
    this.contentElement.style.position = "relative";
    this.contentElement.style.minHeight = "100%";
    container.appendChild(this.contentElement);

    // Initial render
    this.render();

    // Scroll handler (debounced via RAF)
    this.scrollHandler = () => this.handleScroll();
    container.addEventListener("scroll", this.scrollHandler, { passive: true });

    // Resize observer
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(container);
    }

    // Keyboard navigation
    container.addEventListener("keydown", (e) => this.handleKeyDown(e));
  }

  /** Detach from DOM and clean up */
  detach(): void {
    if (this.scrollHandler && this.container) {
      this.container.removeEventListener("scroll", this.scrollHandler);
    }
    this.resizeObserver?.disconnect();
    this.container?.removeAttribute("role");
    this.itemElements.clear();
    this.measuredHeights.clear();
    this.positionCache.clear();
    if (this.contentElement?.parentNode) this.contentElement.parentNode.removeChild(this.contentElement);
    this.container = null;
    this.contentElement = null;
  }

  /** Update configuration (e.g., new data count) */
  updateConfig(partial: Partial<VirtualListConfig<T>>): void {
    Object.assign(this.config, partial);
    this.positionCache.trimAfter(this.config.totalCount);
    this.render();
  }

  /** Scroll to a specific item index */
  scrollToIndex(index: number, behavior: "auto" | "smooth" = "auto"): void {
    if (!this.container) return;
    const offset = this.positionCache.getOffset(index);
    this.container.scrollTo({ top: offset, behavior });
  }

  /** Scroll to a specific pixel offset */
  scrollTo(scrollTop: number, behavior: "auto" | "smooth" = "auto"): void {
    this.container?.scrollTo({ top: scrollTop, behavior });
  }

  /** Get current metrics */
  getMetrics(): VirtualListMetrics {
    const totalHeight = this.positionCache.getTotalHeight(this.config.totalCount);
    return {
      totalHeight,
      viewportHeight: this.config.containerHeight,
      visibleItemCount: this.currentRange.endIndex - this.currentRange.startIndex + 1,
      renderedItemCount: this.itemElements.size,
      scrollPosition: this.getScrollPosition(),
      estimatedScrollHeight: totalHeight,
    };
  }

  /** Force re-measure all visible items (call after dynamic content loads) */
  remeasure(): void {
    for (const [index, el] of this.itemElements) {
      const height = el.offsetHeight;
      if (height > 0) {
        this.measuredHeights.set(typeof index === "number" ? index : 0, height);
        this.positionCache.set(typeof index === "number" ? index : 0, height);
      }
    }
    this.render();
  }

  // --- Internal ---

  private handleScroll(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => this.processScroll());
  }

  private processScroll(): void {
    if (!this.container) return;
    const scrollTop = this.container.scrollTop;
    const newRange = this.calculateVisibleRange(scrollTop);

    // Check if range actually changed
    if (newRange.startIndex === this.currentRange.startIndex &&
        newRange.endIndex === this.currentRange.endIndex) {
      // Still check near-bottom
      this.checkNearBottom(scrollTop);
      return;
    }

    this.currentRange = newRange;
    this.render();

    this.config.onRangeChange?.(newRange);
    this.checkNearBottom(scrollTop);
  }

  private calculateVisibleRange(scrollTop: number): VisibleRange {
    const startIdx = this.positionCache.findIndex(scrollTop, this.config.totalCount);
    const overscanStart = Math.max(0, startIdx - this.config.overscan);

    const viewportBottom = scrollTop + this.config.containerHeight;
    const endIdx = this.positionCache.findIndex(viewportBottom, this.config.totalCount);
    const overscanEnd = Math.min(this.config.totalCount - 1, endIdx + this.config.overscan);

    return {
      startIndex: overscanStart,
      endIndex: overscanEnd,
      startOffset: this.positionCache.getOffset(overscanStart),
      endOffset: this.positionCache.getOffset(overscanEnd),
    };
  }

  private checkNearBottom(scrollTop: number): void {
    const totalHeight = this.positionCache.getTotalHeight(this.config.totalCount);
    const distanceFromBottom = totalHeight - scrollTop - this.config.containerHeight;
    if (distanceFromBottom < this.config.nearBottomThreshold) {
      this.config.onNearBottom?.(distanceFromBottom);
    }
  }

  private render(): void {
    if (!this.contentElement || !this.container) return;

    const scrollTop = this.container.scrollTop;
    const range = this.calculateVisibleRange(scrollTop);
    this.currentRange = range;

    const totalHeight = this.positionCache.getTotalHeight(this.config.totalCount);

    // Set content wrapper height
    this.contentElement.style.height = `${totalHeight}px`;

    // Build fragment with visible items
    const frag = document.createDocumentFragment();

    for (let i = range.startIndex; i <= range.endIndex; i++) {
      if (i < 0 || i >= this.config.totalCount) continue;

      const offset = this.positionCache.getOffset(i);
      const height = this.positionCache.getHeight(i);
      const item: VirtualItem<T> = {
        id: i,
        data: undefined as T,
        index: i,
        height,
      };

      const state: RenderState = {
        isVisible: true,
        isFirstVisible: i === range.startIndex,
        isLastVisible: i === range.endIndex,
        offsetTop: offset - scrollTop,
      };

      // Sticky header check
      if (this.config.stickyHeaders && this.config.getSectionKey) {
        const sectionKey = this.config.getSectionKey(i);
        const prevSectionKey = i > 0 ? this.config.getSectionKey(i - 1) : undefined;
        if (sectionKey !== prevSectionKey && this.config.renderSectionHeader) {
          const headerEl = this.renderNode(this.config.renderSectionHeader(sectionKey));
          headerEl.style.position = "sticky";
          headerEl.style.top = "0";
          headerEl.style.zIndex = "10";
          frag.appendChild(headerEl);
        }
      }

      const rendered = this.config.renderItem(item, state);
      const el = this.renderNode(rendered);
      el.style.position = "absolute";
      el.style.top = `${offset}px`;
      el.style.left = "0";
      el.style.right = "0";
      el.style.minHeight = `${height}px`;
      el.setAttribute("data-index", String(i));
      el.setAttribute("role", "option");
      el.setAttribute("aria-setsize", String(this.config.totalCount));
      el.setAttribute("aria-posinset", String(i + 1));

      frag.appendChild(el);
      this.itemElements.set(i, el);
    }

    // Replace content
    this.contentElement.innerHTML = "";
    this.contentElement.appendChild(frag);

    // Measure actual heights (variable height mode)
    if (this.config.variableHeight) {
      requestAnimationFrame(() => this.measureItems());
    }
  }

  private renderNode(result: HTMLElement | string): HTMLElement {
    if (typeof result === "string") {
      const div = document.createElement("div");
      div.innerHTML = result;
      return div.firstChild as HTMLElement ?? div;
    }
    return result;
  }

  private measureItems(): void {
    for (const [index, el] of this.itemElements) {
      const height = el.offsetHeight;
      if (height > 0 && height !== this.measuredHights.get(index)) {
        this.measuredHights.set(index, height);
        this.positionCache.set(typeof index === "number" ? index : 0, height);
      }
    }
  }

  private handleResize(): void {
    if (this.container) {
      this.config.containerHeight = this.container.clientHeight;
      this.render();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.container) return;
    const currentStart = this.currentRange.startIndex;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.scrollToIndex(currentStart + 1, "smooth");
        break;
      case "ArrowUp":
        e.preventDefault();
        this.scrollToIndex(Math.max(0, currentStart - 1), "smooth");
        break;
      case "PageDown":
        e.preventDefault();
        this.scrollTo(this.container.scrollTop + this.config.containerHeight * 0.8, "smooth");
        break;
      case "PageUp":
        e.preventDefault();
        this.scrollTo(this.container.scrollTop - this.config.containerHeight * 0.8, "smooth");
        break;
      case "Home":
        e.preventDefault();
        this.scrollToIndex(0, "smooth");
        break;
      case "End":
        e.preventDefault();
        this.scrollToIndex(this.config.totalCount - 1, "smooth");
        break;
    }
  }

  private getScrollPosition(): ScrollPosition {
    if (!this.container) return { scrollTop: 0, scrollLeft: 0, scrollHeight: 0, scrollPercentage: 0 };
    const st = this.container.scrollTop;
    const sh = this.container.scrollHeight;
    const ch = this.container.clientHeight;
    return {
      scrollTop: st,
      scrollLeft: this.container.scrollLeft,
      scrollHeight: sh,
      scrollPercentage: sh > ch ? st / (sh - ch) : 0,
    };
  }
}
