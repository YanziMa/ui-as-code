/**
 * Virtual Table: High-performance table with virtual scrolling for large datasets
 * (100k+ rows). Uses windowed rendering, dynamic row height measurement,
 * sticky columns, infinite scroll loading, and efficient DOM recycling.
 */

// --- Types ---

export interface VirtualColumn {
  key: string;
  title: string;
  width: number;
  minWidth?: number;
  /** Custom render: (value, row, index) => string | HTMLElement */
  render?: (value: unknown, row: Record<string, unknown>, index: number) => string | HTMLElement;
  align?: "left" | "center" | "right";
  fixed?: "left" | "right";
  className?: string;
}

export interface VirtualTableOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Column definitions */
  columns: VirtualColumn[];
  /** Data source or async loader */
  data: Record<string, unknown>[] | ((params: { offset: number; limit: number; sortKey?: string; sortDir?: "asc" | "desc" }) => Promise<{ rows: Record<string, unknown>[]; total: number }>);
  /** Estimated row height in px (default: 44) */
  rowHeight?: number;
  /** Buffer rows to render above/below viewport (default: 5) */
  overscanCount?: number;
  /** Total data count (for async mode) */
  totalCount?: number;
  /** Enable sorting? */
  sortable?: boolean;
  /** Enable sticky header? */
  stickyHeader?: boolean;
  /** Row key field */
  rowKey?: string;
  /** Row click handler */
  onRowClick?: (row: Record<string, unknown>, index: number) => void;
  /** Row class function */
  rowClassName?: (row: Record<string, unknown>, index: number) => string;
  /** Empty state text */
  emptyText?: string;
  /** Loading state */
  loading?: boolean;
  /** Scroll callback (for infinite load) */
  onScrollToEnd?: () => void;
  /** Threshold from bottom to trigger onScrollToEnd (px) */
  scrollThreshold?: number;
  /** Custom CSS class */
  className?: string;
}

export interface VirtualTableInstance {
  element: HTMLElement;
  scrollToIndex: (index: number) => void;
  scrollToTop: () => void;
  refresh: () => void;
  setData: (data: Record<string, unknown>[]) => void;
  getVisibleRange: () => { start: number; end: number };
  destroy: () => void;
}

// --- Main Class ---

export class VirtualTableManager {
  create(options: VirtualTableOptions): VirtualTableInstance {
    const opts = {
      rowHeight: options.rowHeight ?? 44,
      overscanCount: options.overscanCount ?? 5,
      sortable: options.sortable ?? true,
      stickyHeader: options.stickyHeader ?? true,
      rowKey: options.rowKey ?? "id",
      emptyText: options.emptyText ?? "No data",
      loading: options.loading ?? false,
      scrollThreshold: options.scrollThreshold ?? 200,
      className: options.className ?? "",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("VirtualTable: container not found");

    container.className = `virtual-table ${opts.className}`;
    container.style.cssText = `
      position:relative;width:100%;height:100%;min-height:200px;
      overflow:hidden;font-family:-apple-system,sans-serif;font-size:13px;color:#374151;
    `;

    let allData: Record<string, unknown>[] = Array.isArray(options.data) ? [...options.data] : [];
    const isAsync = typeof options.data === "function";
    let totalRows = isAsync ? (opts.totalCount ?? 0) : allData.length;
    let destroyed = false;

    // Measured row heights cache
    const rowHeights = new Map<number, number>();
    let estimatedRowHeight = opts.rowHeight;

    // Sort state
    let sortKey = "";
    let sortDir: "asc" | "desc" = "asc";

    // Viewport state
    let scrollTop = 0;
    let containerHeight = container.clientHeight || 400;

    // Create viewport structure
    const viewport = document.createElement("div");
    viewport.className = "vt-viewport";
    viewport.style.cssText = `
      position:absolute;inset:0;overflow-y:auto;overflow-x:hidden;
      -webkit-overflow-scrolling:touch;
    `;
    container.appendChild(viewport);

    // Spacer for total height
    const spacer = document.createElement("div");
    spacer.className = "vt-spacer";
    spacer.style.cssText = "position:relative;width:100%;";
    viewport.appendChild(spacer);

    // Content area (positioned within spacer)
    const content = document.createElement("div");
    content.className = "vt-content";
    content.style.cssText = "position:absolute;top:0;left:0;width:100%;";
    spacer.appendChild(content);

    // Header (fixed at top)
    let headerEl: HTMLDivElement | null = null;
    if (opts.stickyHeader) {
      headerEl = document.createElement("div");
      headerEl.className = "vt-header";
      headerEl.style.cssText = `
        position:sticky;top:0;z-index:10;background:#f9fafb;
        display:flex;border-bottom:2px solid #e5e7eb;
      `;
      for (const col of opts.columns) {
        const th = document.createElement("div");
        th.style.cssText = `
          padding:8px 12px;font-weight:600;color:#374151;
          white-space:nowrap;flex-shrink:0;width:${col.width}px;
          ${col.fixed === "left" ? `position:sticky;left:0;background:#f9fafb;z-index:1;` : ""}
          text-align:${col.align ?? "left"};
          user-select:none;cursor:${opts.sortable && col.key ? "pointer" : "default"};
        `;
        th.textContent = col.title;

        if (opts.sortable && col.key) {
          const sortIndicator = document.createElement("span");
          sortIndicator.style.cssText = "margin-left:4px;font-size:10px;color:#9ca3af;";
          sortIndicator.textContent = sortKey === col.key ? (sortDir === "asc" ? "\u2191" : "\u2193") : "\u2195";
          th.appendChild(sortIndicator);
          th.addEventListener("click", () => {
            if (sortKey === col.key) {
              sortDir = sortDir === "asc" ? "desc" : "asc";
            } else {
              sortKey = col.key!;
              sortDir = "asc";
            }
            // Re-sort and re-render
            if (!isAsync) {
              allData.sort((a, b) => {
                const av = a[col.key], bv = b[col.key];
                let cmp = 0;
                if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
                else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
                return sortDir === "desc" ? -cmp : cmp;
              });
            }
            render();
          });
        }

        headerEl.appendChild(th);
      }
      container.insertBefore(headerEl, viewport);
    }

    // Calculate total height
    function getTotalHeight(): number {
      if (isAsync) return totalRows * estimatedRowHeight;
      let h = 0;
      for (let i = 0; i < allData.length; i++) {
        h += rowHeights.get(i) ?? estimatedRowHeight;
      }
      return h;
    }

    // Get offset for a given row index
    function getOffsetForIndex(index: number): number {
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += rowHeights.get(i) ?? estimatedRowHeight;
      }
      return offset;
    }

    // Find the row index at a given scroll offset (binary search approximation)
    function findIndexAtOffset(offset: number): number {
      if (isAsync) return Math.floor(offset / estimatedRowHeight);

      let low = 0, high = allData.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        const midOffset = getOffsetForIndex(mid);
        if (midOffset < offset) low = mid + 1;
        else high = mid;
      }
      return low;
    }

    // Render visible rows
    function render(): void {
      content.innerHTML = "";

      const totalH = getTotalHeight();
      spacer.style.height = `${totalH}px`;

      if (totalRows === 0 || (allData.length === 0 && !isAsync)) {
        const empty = document.createElement("div");
        empty.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          height:${Math.min(containerHeight, 200)}px;color:#9ca3af;font-size:14px;
        `;
        empty.textContent = opts.loading ? "Loading..." : opts.emptyText;
        content.appendChild(empty);
        return;
      }

      const startIdx = Math.max(0, findIndexAtOffset(scrollTop) - opts.overscanCount);
      const viewportBottom = scrollTop + containerHeight;
      let endIdx = findIndexAtOffset(viewportBottom) + opts.overscanCount;
      endIdx = Math.min(endIdx, isAsync ? totalRows : allData.length - 1);

      const offsetY = getOffsetForIndex(startIdx);

      content.style.transform = `translateY(${offsetY}px)`;

      const dataSource = isAsync ? allData : allData;
      const renderEnd = Math.min(endIdx + 1, dataSource.length);

      for (let i = startIdx; i < renderEnd; i++) {
        const row = dataSource[i];
        if (!row) continue;

        const rowEl = document.createElement("div");
        rowEl.className = "vt-row";
        rowEl.dataset.index = String(i);

        const actualHeight = rowHeights.get(i) ?? estimatedRowHeight;
        rowEl.style.cssText = `
          display:flex;align-items:center;height:${actualHeight}px;
          border-bottom:1px solid #f3f4f6;
          ${opts.rowClassName?.(row, i) ? "" : ""}
          cursor:pointer;
        `;
        if (opts.rowClassName) {
          const extraClass = opts.rowClassName(row, i);
          if (extraClass) rowEl.classList.add(extraClass);
        }

        // Hover effect
        rowEl.addEventListener("mouseenter", () => { rowEl.style.background = "#f9fafb"; });
        rowEl.addEventListener("mouseleave", () => { rowEl.style.background = ""; });

        // Cells
        for (const col of opts.columns) {
          const cell = document.createElement("div");
          cell.style.cssText = `
            padding:0 12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
            flex-shrink:0;width:${col.width}px;
            ${col.fixed === "left" ? `position:sticky;left:0;background:inherit;z-index:1;` : ""}
            text-align:${col.align ?? "left"};
            ${col.className ?? ""}
          `;

          const value = row[col.key];
          if (col.render) {
            const rendered = col.render(value, row, i);
            if (typeof rendered === "string") cell.innerHTML = rendered;
            else cell.appendChild(rendered);
          } else {
            cell.textContent = value == null ? "" : String(value);
          }

          rowEl.appendChild(cell);
        }

        rowEl.addEventListener("click", () => opts.onRowClick?.(row, i));

        // Measure actual height after rendering
        requestAnimationFrame(() => {
          if (!destroyed && rowEl.offsetHeight !== actualHeight) {
            rowHeights.set(i, rowEl.offsetHeight);
            // Only re-render if difference is significant
            if (Math.abs(rowEl.offsetHeight - actualHeight) > 3) {
              render();
            }
          }
        });

        content.appendChild(rowEl);
      }
    }

    // Scroll handler (throttled)
    let scrollRAF: number | null = null;
    viewport.addEventListener("scroll", () => {
      scrollTop = viewport.scrollTop;

      if (scrollRAF != null) cancelAnimationFrame(scrollRAF);
      scrollRAF = requestAnimationFrame(() => {
        render();

        // Check for scroll-to-end threshold
        if (opts.onScrollToEnd) {
          const distanceToBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
          if (distanceToBottom < opts.scrollThreshold) {
            opts.onScrollToEnd();
          }
        }
      });
    }, { passive: true });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight = entry.contentRect.height;
        render();
      }
    });
    resizeObserver.observe(container);

    // Initial render
    render();

    const instance: VirtualTableInstance = {
      element: container,

      scrollToIndex(index: number) {
        const offset = getOffsetForIndex(index);
        viewport.scrollTo({ top: offset, behavior: "smooth" });
      },

      scrollToTop() {
        viewport.scrollTo({ top: 0, behavior: "smooth" });
      },

      refresh() { render(); },

      setData(data: Record<string, unknown>[]) {
        allData = data;
        totalRows = data.length;
        rowHeights.clear();
        render();
      },

      getVisibleRange() {
        const start = Math.max(0, findIndexAtOffset(scrollTop));
        const end = Math.min(findIndexAtOffset(scrollTop + containerHeight), totalRows - 1);
        return { start, end: Math.min(end, start + 100) };
      },

      destroy() {
        destroyed = true;
        if (scrollRAF != null) cancelAnimationFrame(scrollRAF);
        resizeObserver.disconnect();
        if (headerEl) headerEl.remove();
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a virtual table */
export function createVirtualTable(options: VirtualTableOptions): VirtualTableInstance {
  return new VirtualTableManager().create(options);
}
