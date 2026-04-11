/**
 * Virtual Scroller Utilities: Virtualized scrolling with dynamic item heights,
 * recycling DOM nodes, smooth scrolling, range rendering, sticky items,
 * and efficient large dataset rendering.
 */

// --- Types ---

export interface VirtualItem<T = unknown> {
  /** Unique identifier */
  id: string;
  /** Item data */
  data: T;
  /** Estimated height (px) — used before measured */
  estimatedHeight?: number;
  /** Sticky? Sticks to top when scrolling past */
  sticky?: boolean;
  /** Sticky offset from top (px) */
  stickyOffset?: number;
}

export interface VirtualScrollerOptions<T = unknown> {
  /** All items to virtualize */
  items: VirtualItem<T>[];
  /** Render function for each visible item */
  renderItem: (item: VirtualItem<T>, index: number) => HTMLElement;
  /** Container element */
  container: HTMLElement;
  /** Item height estimate (px) for unmeasured items */
  itemHeight?: number;
  /** Overscan buffer (extra items rendered above/below viewport) */
  overscan?: number;
  /** Total height of all items (if known) */
  totalHeight?: number;
  /** Smooth scrolling duration (ms) */
  scrollDuration?: number;
  /** Called when visible range changes */
  onRangeChange?: (startIndex: number, endIndex: number) => void;
  /** Called when items are recycled */
  onRecycle?: (element: HTMLElement, item: VirtualItem<T>) => void;
  /** Custom class name */
  className?: string;
}

export interface VirtualScrollerInstance<T = unknown> {
  /** The root scroller element */
  el: HTMLElement;
  /** Set new items (full replace) */
  setItems(items: VirtualItem<T>[]): void;
  /** Get current items */
  getItems(): VirtualItem<T>[];
  /** Scroll to item by index */
  scrollToIndex(index: number, behavior?: "auto" | "smooth"): void;
  /** Scroll to top */
  scrollToTop(behavior?: "auto" | "smooth"): void;
  /** Scroll to bottom */
  scrollToBottom(behavior?: "auto" | "smooth"): void;
  /** Get first visible index */
  getFirstVisibleIndex(): number;
  /** Get last visible index */
  getLastVisibleIndex(): void;
  /** Force recalculation and re-render */
  invalidate(): void;
  /** Get total content height */
  getTotalHeight(): number;
  /** Measure all visible items */
  measureItems(): void;
  /** Destroy and cleanup */
  destroy(): void;
}

// --- Core Factory ---

/**
 * Create a virtual scroller for efficiently rendering large lists.
 *
 * @example
 * ```ts
 * const vscroller = createVirtualScroller({
 *   container: listContainer,
 *   items: Array.from({ length: 10000 }, (_, i) => ({
 *     id: `item-${i}`,
 *     data: { name: `Item ${i}` },
 *     estimatedHeight: 48,
 *   })),
 *   renderItem: (item, idx) => {
 *     const el = document.createElement("div");
 *     el.textContent = item.data.name;
 *     el.style.height = "48px";
 *     return el;
 *   },
 *   itemHeight: 48,
 * });
 * ```
 */
export function createVirtualScroller<T = unknown>(options: VirtualScrollerOptions<T>): VirtualScrollerInstance<T> {
  const {
    items,
    renderItem,
    container,
    itemHeight = 44,
    overscan = 5,
    totalHeight,
    scrollDuration = 300,
    onRangeChange,
    onRecycle,
    className,
  } = options;

  let _items = [...items];
  let _measuredHeights = new Map<string, number>();
  let _stickyOffsets = new Map<string, number>();

  // Root element
  const root = document.createElement("div");
  root.className = `virtual-scroller ${className ?? ""}`.trim();
  root.style.cssText =
    "position:relative;width:100%;height:100%;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;";

  // Content spacer (sets total height)
  const spacer = document.createElement("div");
  spacer.className = "virtual-spacer";
  spacer.style.cssText = "position:relative;width:100%;pointer-events:none;";

  // Content transform wrapper (offsets visible items)
  const content = document.createElement("div");
  content.className = "virtual-content";
  content.style.cssText = "position:absolute;top:0;left:0;width:100%;will-change:transform;";

  root.appendChild(spacer);
  spacer.appendChild(content);
  container.appendChild(root);

  // Pool of recycled elements
  const elementPool = new Map<string, HTMLElement>();

  // Calculate initial total height
  function calcTotalHeight(): number {
    if (totalHeight !== undefined) return totalHeight;
    let h = 0;
    for (const item of _items) {
      h += _measuredHeights.get(item.id) ?? item.estimatedHeight ?? itemHeight;
    }
    return h;
  }

  // Find the start index for a given scroll offset
  function findStartIndex(scrollTop: number): number {
    let accumulated = 0;
    for (let i = 0; i < _items.length; i++) {
      const h = _measuredHeights.get(_items[i].id) ?? _items[i].estimatedHeight ?? itemHeight;
      if (accumulated + h > scrollTop) return i;
      accumulated += h;
    }
    return Math.max(0, _items.length - 1);
  }

  // Get Y offset for a given item index
  function getItemOffset(index: number): number {
    let offset = 0;
    for (let i = 0; i < index && i < _items.length; i++) {
      offset += _measuredHeights.get(_items[i].id) ?? _items[i].estimatedHeight ?? itemHeight;
    }
    return offset;
  }

  // Main render function
  function render(): void {
    const scrollTop = root.scrollTop;
    const viewHeight = root.clientHeight;
    const totalH = calcTotalHeight();

    // Set spacer height
    spacer.style.height = `${totalH}px`;

    // Find visible range
    const startIndex = findStartIndex(Math.max(0, scrollTop - overscan * itemHeight));
    let endIndex = startIndex;
    let accumHeight = getItemOffset(startIndex);

    while (accumHeight < scrollTop + viewHeight + overscan * itemHeight && endIndex < _items.length) {
      accumHeight += _measuredHeights.get(_items[endIndex].id) ?? _items[endIndex].estimatedHeight ?? itemHeight;
      endIndex++;
    }

    endIndex = Math.min(endIndex, _items.length - 1);

    // Notify range change
    onRangeChange?.(startIndex, endIndex);

    // Clear old content
    content.innerHTML = "";

    // Handle sticky items
    let stickyOffsetAccum = 0;
    const stickyElements: Array<{ el: HTMLElement; offset: number }> = [];

    // Render visible items
    let currentOffset = getItemOffset(startIndex);

    for (let i = startIndex; i <= endIndex; i++) {
      const item = _items[i];
      if (!item) continue;

      const measuredH = _measuredHeights.get(item.id) ?? item.estimatedHeight ?? itemHeight;

      // Try to reuse existing element
      let el = elementPool.get(item.id)?.cloneNode(true) as HTMLElement | undefined;
      if (!el) {
        el = renderItem(item, i);
        el.dataset.virtualId = item.id;
        el.dataset.virtualIndex = String(i);
      }

      el.style.position = item.sticky ? "sticky" : "absolute";
      if (item.sticky) {
        el.style.top = `${(item.stickyOffset ?? 0) + stickyOffsetAccum}px`;
        el.style.zIndex = "1";
        stickyOffsetAccum += measuredH;
        stickyElements.push({ el, offset: currentOffset });
      } else {
        el.style.top = `${currentOffset}px`;
      }
      el.style.left = "0";
      el.style.width = "100%";

      content.appendChild(el);

      // Measure after render
      requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.height !== _measuredHeights.get(item.id)) {
          _measuredHeights.set(item.id, rect.height);
          // Don't re-render immediately to avoid loops
        }
      });

      currentOffset += measuredH;
    }

    // Position content
    content.style.transform = `translateY(${getItemOffset(startIndex)}px)`;
  }

  // Initial render
  render();

  // Scroll handler with RAF throttling
  let ticking = false;
  root.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        render();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Resize handler
  const resizeObserver = new ResizeObserver(() => { render(); });
  resizeObserver.observe(root);

  // --- Instance Methods ---

  function setItems(newItems: VirtualItem<T>[]): void {
    _items = newItems;
    _measuredHeights.clear();
    elementPool.clear();
    render();
  }

  function getItems(): VirtualItem<T>[] { return [..._items]; }

  function scrollToIndex(index: number, behavior: "auto" | "smooth" = "auto"): void {
    const offset = getItemOffset(Math.max(0, Math.min(index, _items.length - 1)));
    root.scrollTo({ top: offset, behavior });
  }

  function scrollToTop(behavior: "auto" | "smooth" = "auto"): void {
    root.scrollTo({ top: 0, behavior });
  }

  function scrollToBottom(behavior: "auto" | "smooth" = "smooth"): void {
    root.scrollTo({ top: calcTotalHeight(), behavior });
  }

  function getFirstVisibleIndex(): number {
    return findStartIndex(root.scrollTop);
  }

  function getLastVisibleIndex(): number {
    const start = findStartIndex(root.scrollTop);
    let end = start;
    let h = getItemOffset(start);
    const viewBottom = root.scrollTop + root.clientHeight;
    while (h < viewBottom && end < _items.length - 1) {
      end++;
      h += _measuredHeights.get(_items[end].id) ?? _items[end].estimatedHeight ?? itemHeight;
    }
    return end;
  }

  function invalidate(): void { render(); }

  function getTotalHeight(): number { return calcTotalHeight(); }

  function measureItems(): void {
    const children = content.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const id = child.dataset.virtualId;
      if (id) {
        const rect = child.getBoundingClientRect();
        if (rect.height > 0) _measuredHeights.set(id, rect.height);
      }
    }
    render();
  }

  function destroy(): void {
    resizeObserver.disconnect();
    root.remove();
  }

  return {
    el: root,
    setItems, getItems, scrollToIndex, scrollToTop, scrollToBottom,
    getFirstVisibleIndex, getLastVisibleIndex, invalidate,
    getTotalHeight, measureItems, destroy,
  };
}
