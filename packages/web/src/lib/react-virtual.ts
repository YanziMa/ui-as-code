/**
 * React Virtual: Virtualized list/grid rendering for large datasets.
 * Implements windowed rendering with dynamic item sizing,
 * scroll position estimation, and smooth scrolling.
 */

// --- Types ---

export interface VirtualItem {
  /** Index in the data array */
  index: number;
  /** Start position (top/left) */
  start: number;
  /** Size (height/width) */
  size: number;
  /** End position */
  end: number;
  /** Unique key for React */
  key: string;
}

export interface VirtualizerOptions<T> {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Total number of items */
  count: number;
  /** Function to get or estimate item size */
  getItemSize?: (index: number) => number;
  /** Default item size for unmeasured items */
  defaultItemSize?: number;
  /** Overscan buffer (extra items rendered beyond viewport) */
  overscan?: number;
  /** Orientation ("vertical" | "horizontal") */
  orientation?: "vertical" | "horizontal";
  /** Gap between items in px */
  gap?: number;
  /** Callback when visible items change */
  onItemsChange?: (items: VirtualItem[]) => void;
  /** Scroll-to-index callback */
  onScrollToIndex?: (index: number, align?: "start" | "center" | "end" | "auto") => void;
}

export interface VirtualizerInstance {
  /** Get currently visible items */
  getVisibleItems(): VirtualItem[];
  /** Get total estimated size of all items */
  getTotalSize(): number;
  /** Scroll to a specific item index */
  scrollToIndex(index: number, align?: "start" | "center" | "end" | "auto"): void;
  /** Scroll to a specific offset */
  scrollToOffset(offset: number): void;
  /** Recalculate all measurements */
  measureAll(): void;
  /** Reset cached measurements */
  resetMeasurements(): void;
  /** Force re-render with current scroll position */
  forceUpdate(): void;
  /** Destroy the virtualizer and cleanup */
  destroy(): void;
}

// --- Size Cache ---

class ItemSizeCache {
  private sizes = new Map<number, number>();
  private defaultSize: number;

  constructor(defaultSize = 50) {
    this.defaultSize = defaultSize;
  }

  set(index: number, size: number): void { this.sizes.set(index, size); }
  get(index: number): number { return this.sizes.get(index) ?? this.defaultSize; }
  has(index: number): boolean { return this.sizes.has(index); }
  clear(): void { this.sizes.clear(); }

  /** Estimate total size using measured average for unmeasured items */
  estimateTotal(count: number): number {
    if (this.sizes.size === 0) return count * this.defaultSize;

    let measuredTotal = 0;
    for (const [, size] of this.sizes) measuredTotal += size;
    const avgMeasured = measuredTotal / this.sizes.size;

    return measuredTotal + (count - this.sizes.size) * avgMeasured;
  }

  /** Find the item at a given offset using binary search-ish approach */
  findItemAtOffset(offset: number, count: number): { index: number; start: number } {
    let pos = 0;
    let idx = 0;

    while (idx < count && pos < offset) {
      const size = this.get(idx);
      if (pos + size > offset) break;
      pos += size;
      idx++;
    }

    return { index: idx, start: pos };
  }
}

// --- Main Virtualizer ---

/**
 * Create a virtual list renderer for large datasets.
 *
 * @example
 * const virt = createVirtualizer({
 *   container: "#list-container",
 *   count: 10000,
 *   getItemSize: (i) => items[i]?.height ?? 50,
 *   overscan: 5,
 * });
 *
 * // In render loop:
 * const items = virt.getVisibleItems();
 * // Render only items[index] at position items[i].start
 */
export function createVirtualizer(options: VirtualizerOptions<unknown>): VirtualizerInstance {
  const {
    container,
    count,
    getItemSize,
    defaultItemSize = 50,
    overscan = 3,
    orientation = "vertical",
    gap = 0,
    onItemsChange,
  } = options;

  const el = typeof container === "string"
    ? document.querySelector<HTMLElement>(container)!
    : container;

  if (!el) throw new Error("Virtualizer: container not found");

  const isVertical = orientation === "vertical";
  const cache = new ItemSizeCache(defaultItemSize);
  let destroyed = false;
  let rafId: number | null = null;
  let lastScrollPos = 0;

  function getViewportSize(): number {
    return isVertical ? el.clientHeight : el.clientWidth;
  }

  function getScrollOffset(): number {
    return isVertical ? el.scrollTop : el.scrollLeft;
  }

  function computeVisibleItems(): VirtualItem[] {
    const viewportSize = getViewportSize();
    const scrollOffset = getScrollOffset();
    const effectiveOverscan = overscan;

    // Find starting item
    const { index: startIndex, start: startPos } = cache.findItemAtOffset(scrollOffset - effectiveOverscan * defaultItemSize, count);

    const items: VirtualItem[] = [];
    let currentPos = startPos;

    for (let i = startIndex; i < count && currentPos < scrollOffset + viewportSize + effectiveOverscan * defaultItemSize; i++) {
      const size = getItemSize ? getItemSize(i) : cache.get(i);
      cache.set(i, size);

      if (i > startIndex) currentPos += gap;

      items.push({
        index: i,
        start: currentPos,
        size,
        end: currentPos + size,
        key: `virtual-item-${i}`,
      });

      currentPos += size;
    }

    return items;
  }

  function update(): void {
    if (destroyed) return;
    const items = computeVisibleItems();
    onItemsChange?.(items);
  }

  // Debounced scroll handler
  function handleScroll(): void {
    const pos = getScrollOffset();
    if (Math.abs(pos - lastScrollPos) > 1 || !rafId) {
      lastScrollPos = pos;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        update();
      });
    }
  }

  // Initialize
  el.addEventListener("scroll", handleScroll, { passive: true });
  update();

  // ResizeObserver for container size changes
  const resizeObserver = new ResizeObserver(() => {
    if (!destroyed) update();
  });
  resizeObserver.observe(el);

  return {
    getVisibleItems(): VirtualItem[] { return computeVisibleItems(); },

    getTotalSize(): number {
      const total = cache.estimateTotal(count);
      return total + Math.max(0, count - 1) * gap; // Add gaps between items
    },

    scrollToIndex(index: number, align = "auto"): void {
      if (index < 0 || index >= count) return;

      // Calculate offset to the item
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += cache.get(i) + gap;
      }

      const viewportSize = getViewportSize();
      const itemSize = cache.get(index);

      switch (align) {
        case "start":
          break; // Use calculated offset as-is
        case "center":
          offset -= (viewportSize - itemSize) / 2;
          break;
        case "end":
          offset -= viewportSize - itemSize;
          break;
        case "auto": {
          const currentScroll = getScrollOffset();
          const itemEnd = offset + itemSize;
          if (offset < currentScroll || itemEnd > currentScroll + viewportSize) {
            // Item not fully visible — pick closer alignment
            if (Math.abs(offset - currentScroll) < Math.abs(itemEnd - currentScroll - viewportSize)) {
              // Align to start
            } else {
              offset -= viewportSize - itemSize;
            }
          } else {
            return; // Already visible, no scroll needed
          }
          break;
        }
      }

      if (isVertical) {
        el.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      } else {
        el.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
      }
    },

    scrollToOffset(offset: number): void {
      if (isVertical) {
        el.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      } else {
        el.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
      }
    },

    measureAll(): void {
      // Trigger measurement by querying all children
      const children = el.children;
      for (let i = 0; i < children.length && i < count; i++) {
        const child = children[i] as HTMLElement;
        const size = isVertical ? child.offsetHeight : child.offsetWidth;
        if (size > 0) cache.set(i, size);
      }
      update();
    },

    resetMeasurements(): void {
      cache.clear();
      update();
    },

    forceUpdate(): void { update(); },

    destroy(): void {
      destroyed = true;
      el.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    },
  };
}
