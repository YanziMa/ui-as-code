/**
 * Virtual List Utilities: Virtualized scrolling for large lists with
 * dynamic item heights, recycling, scroll position restoration,
 * range calculation, and smooth scrolling.
 */

// --- Types ---

export interface VirtualListItem<T = unknown> {
  /** Unique key for this item */
  id: string | number;
  /** Item data */
  data: T;
  /** Estimated height in px (used before measured) */
  estimatedHeight?: number;
}

export interface VirtualListOptions<T = unknown> {
  /** Container element to render into */
  container: HTMLElement;
  /** Total number of items */
  totalCount: number;
  /** Function to get an item by index */
  getItem: (index: number) => VirtualListItem<T>;
  /** Render a single item into a container element */
  renderItem: (item: VirtualListItem<T>, index: number, containerEl: HTMLElement) => void;
  /** Estimated height of each item in px (default 44) */
  itemHeight?: number;
  /** Number of extra items to render above/below viewport (overscan, default 5) */
  overscan?: number;
  /** Height of the container in px (auto-detected if omitted) */
  height?: number;
  /** Enable smooth scrolling? Default true */
  smoothScroll?: boolean;
  /** Called when visible range changes */
  onRangeChange?: (startIndex: number, endIndex: number) => void;
  /** Called when items are rendered (for measuring) */
  onItemsRendered?: (elements: HTMLElement[]) => void;
  /** Custom class name for root */
  className?: string;
}

export interface VirtualListInstance<T = unknown> {
  /** Root element */
  el: HTMLElement;
  /** Scroll to a specific item index */
  scrollToIndex: (index: number, behavior?: "auto" | "smooth") => void;
  /** Scroll to top */
  scrollToTop: (behavior?: "auto" | "smooth") => void;
  /** Scroll to bottom */
  scrollToBottom: (behavior?: "auto" | "smooth") => void;
  /** Get current visible range */
  getVisibleRange: () => { start: number; end: number };
  /** Force re-render (e.g., after data change) */
  invalidate: () => void;
  /** Update total count */
  setTotalCount: (count: number) => void;
  /** Get current total count */
  getTotalCount: () => number;
  /** Recycle/refresh all visible items */
  refresh: () => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a virtualized list for rendering large datasets efficiently.
 *
 * @example
 * ```ts
 * const vlist = createVirtualList({
 *   container: listContainer,
 *   totalCount: 100000,
 *   getItem: (i) => ({ id: i, data: `Item ${i}` }),
 *   renderItem: (item, idx, el) => { el.textContent = item.data; },
 *   itemHeight: 50,
 * });
 *
 * // Later jump to item 50000:
 * vlist.scrollToIndex(50000, "smooth");
 * ```
 */
export function createVirtualList<T = unknown>(options: VirtualListOptions<T>): VirtualListInstance<T> {
  const {
    container,
    totalCount,
    getItem,
    renderItem,
    itemHeight = 44,
    overscan = 5,
    height: heightOption,
    smoothScroll = true,
    onRangeChange,
    onItemsRendered,
    className,
  } = options;

  let _totalCount = totalCount;
  const measuredHeights = new Map<string | number, number>();
  let _scrollHeight = 0;
  let isDestroyed = false;

  // --- Root structure ---
  const root = document.createElement("div");
  root.className = `virtual-list ${className ?? ""}`.trim();
  root.style.cssText =
    "position:relative;overflow:hidden;" +
    (heightOption ? `height:${heightOption}px;` : "") +
    "will-change:transform;";
  container.appendChild(root);

  // Viewport spacer (sets total scroll height)
  const spacerBefore = document.createElement("div");
  spacerBefore.style.height = "0px";
  const contentArea = document.createElement("div");
  contentArea.style.position = "relative";
  const spacerAfter = document.createElement("div");

  root.appendChild(spacerBefore);
  root.appendChild(contentArea);
  root.appendChild(spacerAfter);

  // Pool of recycled item containers
  const pool: HTMLElement[] = [];
  const activeItems = new Map<string | number, { el: HTMLElement; index: number }>();

  // --- Calculations ---

  function getDefaultHeight(): number {
    return itemHeight;
  }

  function getHeight(index: number): number {
    return measuredHeights.get(getItem(index).id) ?? getDefaultHeight();
  }

  function getOffsetForIndex(index: number): number {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getHeight(i);
    }
    return offset;
  }

  function getIndexForOffset(offset: number): number {
    // Binary search approximation then linear scan
    let low = 0;
    let high = _totalCount - 1;
    let approx = Math.floor(_totalCount / 2);

    while (low < high) {
      const midOffset = getOffsetForIndex(approx);
      if (midOffset < offset) {
        low = approx + 1;
      } else {
        high = approx - 1;
      }
      approx = Math.floor((low + high) / 2);
    }

    // Linear scan from approximate position
    let idx = Math.max(0, approx - overscan);
    while (idx < _totalCount && getOffsetForIndex(idx + 1) <= offset) {
      idx++;
    }
    while (idx > 0 && getOffsetForIndex(idx) > offset) {
      idx--;
    }

    return Math.max(0, Math.min(idx, _totalCount - 1));
  }

  function calculateVisibleRange(): { start: number; end: number } {
    const scrollTop = root.scrollTop;
    const viewHeight = root.clientHeight;

    const startIndex = getIndexForOffset(scrollTop);
    let endIndex = startIndex;
    let accumulatedHeight = 0;

    // Count how many items fit from start
    for (let i = startIndex; i < _totalCount && accumulatedHeight < viewHeight + overscan * itemHeight; i++) {
      accumulatedHeight += getHeight(i);
      endIndex = i;
    }

    // Add overscan buffer
    const finalStart = Math.max(0, startIndex - overscan);
    const finalEnd = Math.min(_totalCount - 1, endIndex + overscan);

    return { start: finalStart, end: finalEnd };
  }

  function updateTotalScrollHeight(): void {
    _scrollHeight = 0;
    for (let i = 0; i < _totalCount; i++) {
      _scrollHeight += getHeight(i);
    }
    spacerAfter.style.height = `${Math.max(0, _scrollHeight - getOffsetForIndex(_totalCount))}px`;
  }

  // --- Rendering ---

  function acquireContainer(): HTMLElement {
    if (pool.length > 0) return pool.pop()!;
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;left:0;right:0;top:0;";
    return el;
  }

  function releaseContainer(el: HTMLElement): void {
    el.innerHTML = "";
    el.style.display = "none";
    pool.push(el);
  }

  function render(): void {
    if (isDestroyed) return;

    const { start, end } = calculateVisibleRange();

    // Update spacers
    spacerBefore.style.height = `${getOffsetForIndex(start)}px`;
    updateTotalScrollHeight();

    // Determine which items should be visible
    const neededKeys = new Set<string | number>();
    for (let i = start; i <= end; i++) {
      neededKeys.add(getItem(i).id);
    }

    // Remove items no longer needed
    for (const [key, { el }] of activeItems) {
      if (!neededKeys.has(key)) {
        releaseContainer(el);
        activeItems.delete(key);
      }
    }

    // Add/update needed items
    const renderedElements: HTMLElement[] = [];

    for (let i = start; i <= end; i++) {
      const item = getItem(i);
      const existing = activeItems.get(item.id);

      if (existing) {
        // Update position
        existing.index = i;
        existing.el.style.top = `${getOffsetForIndex(i) - root.scrollTop}px`;
        renderedElements.push(existing.el);
      } else {
        // Create new
        const el = acquireContainer();
        el.style.display = "";
        el.style.top = `${getOffsetForIndex(i) - root.scrollTop}px`;

        renderItem(item, i, el);
        activeItems.set(item.id, { el, index: i });
        renderedElements.push(el);
      }
    }

    onRangeChange?.(start, end);
    onItemsRendered?.(renderedElements);
  }

  // --- Scroll methods ---

  function scrollToIndex(index: number, behavior: "auto" | "smooth" = "auto"): void {
    const clampedIndex = Math.max(0, Math.min(index, _totalCount - 1));
    const targetOffset = getOffsetForIndex(clampedIndex);
    root.scrollTo({ top: targetOffset, behavior: smoothScroll ? behavior : "auto" });
  }

  function scrollToTop(behavior: "auto" | "smooth" = "auto"): void {
    root.scrollTo({ top: 0, behavior: smoothScroll ? behavior : "auto" });
  }

  function scrollToBottom(behavior: "auto" | "smooth" = "auto"): void {
    root.scrollTo({ top: _scrollHeight || 999999, behavior: smoothScroll ? behavior : "auto" });
  }

  function getVisibleRange(): { start: number; end: number } {
    return calculateVisibleRange();
  }

  // --- Public API ---

  function invalidate(): void {
    render();
  }

  function setTotalCount(count: number): void {
    _totalCount = count;
    render();
  }

  function getTotalCount(): number { return _totalCount; }

  function refresh(): void {
    // Clear all cached measurements and re-render
    measuredHeights.clear();
    for (const [, { el }] of activeItems) {
      releaseContainer(el);
    }
    activeItems.clear();
    render();
  }

  function destroy(): void {
    isDestroyed = true;
    for (const [, { el }] of activeItems) {
      releaseContainer(el);
    }
    activeItems.clear();
    pool.length = 0;
    root.remove();
  }

  // --- Event listeners ---

  let rafId: number | null = null;
  let scheduled = false;

  function scheduleRender(): void {
    if (scheduled || isDestroyed) return;
    scheduled = true;
    rafId = requestAnimationFrame(() => {
      scheduled = false;
      render();
    });
  }

  root.addEventListener("scroll", () => {
    scheduleRender();
  }, { passive: true });

  // Observe container resize
  const resizeObserver = new ResizeObserver(() => {
    if (!isDestroyed) scheduleRender();
  });
  resizeObserver.observe(container);

  // Initial render
  render();

  return {
    el: root,
    scrollToIndex,
    scrollToTop,
    scrollToBottom,
    getVisibleRange,
    invalidate,
    setTotalCount,
    getTotalCount,
    refresh,
    destroy,
  };
}
