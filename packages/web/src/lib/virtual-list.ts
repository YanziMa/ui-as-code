/**
 * Virtual List: High-performance virtualized list rendering for large datasets.
 * Only renders visible items + overscan buffer, with dynamic item heights,
 * scroll position restoration, smooth scrolling to items, and
 * efficient DOM recycling.
 */

// --- Types ---

export interface VirtualListItem {
  /** Unique key */
  id: string | number;
  /** Estimated height (px) for initial layout */
  height?: number;
  /** Item data */
  data?: unknown;
}

export interface VirtualListOptions {
  /** Container element */
  container: HTMLElement | string;
  /** Total number of items */
  itemCount: number;
  /** Function to render a single item */
  renderItem: (index: number, item: VirtualListItem) => HTMLElement;
  /** Get or estimate item height */
  getItemHeight?: (index: number) => number;
  /** Estimated default item height (px) */
  estimatedItemHeight?: number;
  /** Overscan buffer (extra items rendered above/below viewport) */
  overscan?: number;
  /** Height of the container (px) */
  height?: string | number;
  /** Scroll callback */
  onScroll?: (info: { startIndex: number; endIndex: number; scrollOffset: number }) => void;
  /** Custom class name */
  className?: string;
  /** Enable smooth scrolling on programmatic jumps */
  smoothScrolling?: boolean;
  /** Direction */
  direction?: "vertical" | "horizontal";
}

export interface VirtualListInstance {
  element: HTMLElement;
  /** Force re-render / recalculate layout */
  refresh: () => void;
  /** Scroll to specific item index */
  scrollToIndex: (index: number, align?: "start" | "center" | "end") => void;
  /** Scroll to specific pixel offset */
  scrollToOffset: (offset: number) => void;
  /** Get current visible range */
  getVisibleRange: () => { start: number; end: number };
  /** Recalculate item sizes (call after dynamic content changes) */
  resetHeights: () => void;
  /** Update item count */
  setItemCount: (count: number) => void;
  /** Update a single item's data and re-render if visible */
  updateItem: (index: number, item: Partial<VirtualListItem>) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Factory ---

export function createVirtualList(options: VirtualListOptions): VirtualListInstance {
  const opts = {
    estimatedItemHeight: options.estimatedItemHeight ?? 50,
    overscan: options.overscan ?? 5,
    height: options.height ?? "100%",
    smoothScrolling: options.smoothScrolling ?? true,
    direction: options.direction ?? "vertical",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("VirtualList: container not found");

  const isHorizontal = opts.direction === "horizontal";

  // Create inner structure
  container.className = `virtual-list vl-${opts.direction} ${opts.className}`;
  container.style.cssText = `
    overflow:auto;position:relative;
    ${isHorizontal ? "white-space:nowrap;" : ""}
    ${typeof opts.height === "number" ? `height:${opts.height}px;` : `height:${opts.height};`}
    -webkit-overflow-scrolling:touch;
  `;

  // Content wrapper (the tall element that enables scrolling)
  const content = document.createElement("div");
  content.className = "vl-content";
  content.style.cssText = isHorizontal
    ? "height:100%;display:inline-block;"
    : "width:100%;";
  container.appendChild(content);

  // Viewport for positioning items
  const viewport = document.createElement("div");
  viewport.className = "vl-viewport";
  viewport.style.cssText = `
    position:relative;${isHorizontal ? "display:inline-flex;height:100%;" : ""};
  `;
  content.appendChild(viewport);

  // State
  let itemCount = options.itemCount;
  let destroyed = false;
  let rafId: number | null = null;

  // Height cache per item index
  const heightCache = new Map<number, number>();
  // Offset cache per item index (cumulative)
  const offsetCache = new Map<number, number>();

  // Measured item elements (keyed by index)
  const itemElements = new Map<number, HTMLElement>();

  function getDefaultItem(index: number): VirtualListItem {
    return { id: index, height: opts.estimatedItemHeight };
  }

  function getItemHeight(index: number): number {
    if (opts.getItemHeight) return opts.getItemHeight(index);
    return heightCache.get(index) ?? opts.estimatedItemHeight;
  }

  function getTotalHeight(): number {
    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      total += getItemHeight(i);
    }
    return total;
  }

  function getOffsetAtIndex(index: number): number {
    if (offsetCache.has(index)) return offsetCache.get(index)!;
    let offset = 0;
    for (let i = 0; i < index && i < itemCount; i++) {
      offset += getItemHeight(i);
    }
    offsetCache.set(index, offset);
    return offset;
  }

  function getIndexAtOffset(offset: number): { index: number; startOffset: number } {
    let low = 0;
    let high = itemCount - 1;
    let result = 0;
    let resultOffset = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midOffset = getOffsetAtIndex(mid);

      if (midOffset <= offset) {
        result = mid;
        resultOffset = midOffset;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return { index: result, startOffset: resultOffset };
  }

  function calculateVisibleRange(): { startIndex: number; endIndex: number; scrollOffset: number } {
    const scrollOffset = isHorizontal ? container.scrollLeft : container.scrollTop;
    const clientSize = isHorizontal ? container.clientWidth : container.clientHeight;

    const { index: startIdx } = getIndexAtOffset(Math.max(0, scrollOffset - opts.overscan * opts.estimatedItemHeight));
    const { index: endIdx } = getIndexAtOffset(scrollOffset + clientSize + opts.overscan * opts.estimatedItemHeight);

    return {
      startIndex: Math.max(0, startIdx),
      endIndex: Math.min(itemCount - 1, endIdx),
      scrollOffset,
    };
  }

  function render(): void {
    if (destroyed) return;

    const totalH = getTotalHeight();
    const range = calculateVisibleRange();

    // Set content size
    if (isHorizontal) {
      content.style.width = `${totalH}px`;
      viewport.style.width = `${totalH}px`;
    } else {
      content.style.height = `${totalH}px`;
      viewport.style.height = `${totalH}px`;
    }

    // Determine which items need to be rendered
    const neededIndices = new Set<number>();
    for (let i = range.startIndex; i <= range.endIndex; i++) {
      neededIndices.add(i);
    }

    // Remove items no longer needed
    for (const [idx, el] of itemElements) {
      if (!neededIndices.has(idx)) {
        el.remove();
        itemElements.delete(idx);
      }
    }

    // Add/update needed items
    for (let i = range.startIndex; i <= range.endIndex; i++) {
      let el = itemElements.get(i);
      const offset = getOffsetAtIndex(i);
      const itemHeight = getItemHeight(i);

      if (!el) {
        const itemData = getDefaultItem(i);
        el = opts.renderItem(i, itemData);
        el.dataset.vlIndex = String(i);
        el.style.position = "absolute";
        el.setAttribute("role", "listitem");

        // Measure after insertion
        viewport.appendChild(el);
        itemElements.set(i, el);

        // Measure actual height after render
        requestAnimationFrame(() => {
          if (destroyed) return;
          const measured = isHorizontal ? el.offsetWidth : el.offsetHeight;
          if (measured > 0 && measured !== heightCache.get(i)) {
            heightCache.set(i, measured);
            // Invalidate offset cache from this point
            for (let j = i; j <= itemCount; j++) {
              offsetCache.delete(j);
            }
          }
        });
      }

      // Position the element
      if (isHorizontal) {
        el.style.left = `${offset}px`;
        el.style.top = "0";
        el.style.minWidth = `${itemHeight}px`;
      } else {
        el.style.top = `${offset}px`;
        el.style.left = "0";
        el.style.width = "100%";
        el.style.minHeight = `${itemHeight}px`;
      }
    }

    opts.onScroll?.(range);
  }

  // Scroll handler with rAF throttle
  function handleScroll(): void {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      if (!destroyed) render();
      rafId = null;
    });
  }

  container.addEventListener("scroll", handleScroll, { passive: true });

  // ResizeObserver for container size changes
  const resizeObserver = new ResizeObserver(() => {
    if (!destroyed) render();
  });
  resizeObserver.observe(container);

  // Initial render
  render();

  return {
    element: container,

    refresh() { render(); },

    scrollToIndex(index: number, align: "start" = "start") {
      const offset = getOffsetAtIndex(index);
      const clientSize = isHorizontal ? container.clientWidth : container.clientHeight;
      const itemH = getItemHeight(index);

      let targetOffset = offset;
      if (align === "center") targetOffset = offset - clientSize / 2 + itemH / 2;
      else if (align === "end") targetOffset = offset - clientSize + itemH;

      if (opts.smoothScrolling) {
        container.scrollTo({
          [isHorizontal ? "left" : "top"]: targetOffset,
          behavior: "smooth",
        });
      } else {
        container[isHorizontal ? "scrollLeft" : "scrollTop"] = targetOffset;
      }
    },

    scrollToOffset(offset: number) {
      if (opts.smoothScrolling) {
        container.scrollTo({ [isHorizontal ? "left" : "top"]: offset, behavior: "smooth" });
      } else {
        container[isHorizontal ? "scrollLeft" : "scrollTop"] = offset;
      }
    },

    getVisibleRange() {
      const r = calculateVisibleRange();
      return { start: r.startIndex, end: r.endIndex };
    },

    resetHeights() {
      heightCache.clear();
      offsetCache.clear();
      render();
    },

    setItemCount(count: number) {
      itemCount = count;
      heightCache.clear();
      offsetCache.clear();
      render();
    },

    updateItem(index: number, updates: Partial<VirtualListItem>) {
      const el = itemElements.get(index);
      if (el) {
        if (updates.height) heightCache.set(index, updates.height);
        // Re-render if visible
        const range = calculateVisibleRange();
        if (index >= range.startIndex && index <= range.endIndex) {
          const itemData = { ...getDefaultItem(index), ...updates };
          const newEl = opts.renderIndex(index, itemData);
          newEl.dataset.vlIndex = String(index);
          newEl.style.cssText = el.style.cssText;
          newEl.setAttribute("role", "listitem");
          el.replaceWith(newEl);
          itemElements.set(index, newEl);
        }
      }
    },

    destroy() {
      destroyed = true;
      if (rafId) cancelAnimationFrame(rafId);
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      itemElements.clear();
      heightCache.clear();
      offsetCache.clear();
      content.remove();
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };
}
