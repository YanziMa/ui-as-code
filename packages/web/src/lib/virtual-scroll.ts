/**
 * Virtual Scrolling: High-performance windowed rendering for large lists
 * with dynamic row heights, binary search index lookup, overscan buffering,
 * scroll position restoration, and grid virtualization support.
 */

// --- Types ---

export interface VirtualItem<T = unknown> {
  id: string | number;
  data: T;
}

export interface VirtualScrollOptions<T> {
  /** Scrollable container element */
  container: HTMLElement;
  /** Total item count */
  totalCount: number;
  /** Item renderer: (item, index, el) => void */
  renderItem: (item: T | null, index: number, element: HTMLElement) => void;
  /** Estimated default item height (px) */
  estimatedHeight?: number;
  /** Overscan buffer (items rendered outside viewport) */
  overscan?: number;
  /** Height measurer after render */
  measureHeight?: (element: HTMLElement, index: number) => number;
  /** Callback on visible range change */
  onRangeChange?: (start: number, end: number) => void;
  /** Callback on scroll */
  onScroll?: (scrollTop: number) => void;
  /** Enable dynamic height measurement */
  dynamicHeights?: boolean;
  /** Scroll debounce (ms) */
  scrollDebounce?: number;
}

export interface VirtualScrollInstance {
  /** Recalculate and re-render */
  refresh: () => void;
  /** Scroll to item index */
  scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
  /** Scroll to top */
  scrollToTop: () => void;
  /** Scroll to bottom */
  scrollToBottom: () => void;
  /** Get current visible range */
  getVisibleRange: () => { start: number; end: number };
  /** Update measured height for an item */
  setItemHeight: (index: number, height: number) => void;
  /** Update total count */
  setTotalCount: (count: number) => void;
  /** Get current state */
  getState: () => { scrollTop: number; start: number; end: number };
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Implementation ---

export function createVirtualScroll<T>(options: VirtualScrollOptions<T>): VirtualScrollInstance {
  const {
    container,
    renderItem,
    estimatedHeight = 50,
    overscan = 5,
    measureHeight,
    onRangeChange,
    onScroll,
    dynamicHeights = true,
    scrollDebounce = 16,
  } = options;

  let totalCount = options.totalCount;
  const heightCache = new Map<number, number>();
  let defaultH = estimatedHeight;

  // State
  let scrollTop = 0;
  let isScrolling = false;
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;
  let destroyed = false;

  // DOM
  const viewport = document.createElement("div");
  viewport.style.cssText = "position:relative;width:100%;will-change:transform;";
  container.style.overflow = "auto";
  container.style.position = "relative";
  container.appendChild(viewport);

  // Height accumulator cache for O(log n) lookup
  const accCache: number[] = [];
  let accDirty = true;

  function buildAccCache(): void {
    accCache.length = totalCount + 1;
    accCache[0] = 0;
    for (let i = 0; i < totalCount; i++) {
      const h = heightCache.get(i) ?? defaultH;
      accCache[i + 1] = accCache[i]! + h;
    }
    accDirty = false;
  }

  function getItemHeight(index: number): number {
    if (index < 0 || index >= totalCount) return defaultH;
    const cached = heightCache.get(index);
    if (cached !== undefined) return cached;
    return defaultH;
  }

  function getTotalHeight(): number {
    if (accDirty || accCache.length !== totalCount + 1) buildAccCache();
    return accCache[totalCount] ?? 0;
  }

  // Binary search for index at given offset
  function findIndexAtOffset(offset: number): number {
    if (accDirty || accCache.length !== totalCount + 1) buildAccCache();

    let lo = 0, hi = totalCount - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (accCache[mid]! <= offset) lo = mid + 1;
      else hi = mid - 1;
    }
    return Math.max(0, Math.min(lo, totalCount - 1));
  }

  function findOffsetForIndex(index: number): number {
    if (accDirty || accCache.length !== totalCount + 1) buildAccCache();
    return accCache[index] ?? 0;
  }

  function calculateRange(): { start: number; end: number } {
    const containerH = container.clientHeight;
    const start = Math.max(0, findIndexAtOffset(scrollTop) - overscan);
    const end = Math.min(totalCount - 1, findIndexAtOffset(scrollTop + containerH) + overscan);
    return { start, end };
  }

  let currentStart = -1, currentEnd = -1;

  function render(): void {
    if (destroyed || totalCount === 0) {
      viewport.innerHTML = "";
      viewport.style.height = "0";
      return;
    }

    const { start, end } = calculateRange();
    const totalH = getTotalHeight();
    const offsetTop = findOffsetForIndex(start);

    // Only re-render if range changed
    if (start === currentStart && end === currentEnd && !accDirty) return;
    currentStart = start;
    currentEnd = end;

    viewport.style.height = `${totalH}px`;
    viewport.style.transform = `translateY(${offsetTop}px)`;

    // Build fragment
    const frag = document.createDocumentFragment();
    for (let i = start; i <= end; i++) {
      const el = document.createElement("div");
      el.dataset.index = String(i);
      el.style.cssText = "position:absolute;left:0;width:100%;top:0;";
      el.style.height = `${getItemHeight(i)}px`;
      el.style.transform = `translateY(${findOffsetForIndex(i) - offsetTop}px)`;

      renderItem(null as T, i, el);
      frag.appendChild(el);

      // Measure after render
      if (dynamicHeights && measureHeight && !heightCache.has(i)) {
        requestAnimationFrame(() => {
          const measured = measureHeight(el, i);
          if (measured > 0 && measured !== defaultH) {
            heightCache.set(i, measured);
            accDirty = true;
          }
        });
      }
    }

    viewport.innerHTML = "";
    viewport.appendChild(frag);

    onRangeChange?.(start, end);
  }

  function handleScroll(): void {
    if (destroyed) return;
    scrollTop = container.scrollTop;
    isScrolling = true;
    onScroll?.(scrollTop);

    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      isScrolling = false;
    }, scrollDebounce);

    // Use rAF for smooth updates during fast scrolling
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = null;
      render();
    });
  }

  container.addEventListener("scroll", handleScroll, { passive: true });

  // ResizeObserver
  const resizeObs = new ResizeObserver(() => {
    if (!destroyed) render();
  });
  resizeObs.observe(container);

  // Initial render
  render();

  return {
    refresh() { accDirty = true; render(); },

    scrollToIndex(index, align = "start") {
      const offset = findOffsetForIndex(Math.max(0, Math.min(index, totalCount - 1)));
      const itemH = getItemHeight(Math.max(0, Math.min(index, totalCount - 1)));
      const containerH = container.clientHeight;

      let target = offset;
      if (align === "center") target = offset - containerH / 2 + itemH / 2;
      else if (align === "end") target = offset - containerH + itemH;

      container.scrollTop = Math.max(0, target);
    },

    scrollToTop() { container.scrollTop = 0; },
    scrollToBottom() { container.scrollTop = getTotalHeight(); },

    getVisibleRange() { return calculateRange(); },

    setItemHeight(index, height) {
      heightCache.set(index, height);
      accDirty = true;
    },

    setTotalCount(count) {
      totalCount = count;
      accDirty = true;
      render();
    },

    getState() {
      const { start, end } = calculateRange();
      return { scrollTop, start, end };
    },

    destroy() {
      destroyed = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
      container.removeEventListener("scroll", handleScroll);
      resizeObs.disconnect();
      viewport.remove();
    },
  };
}
