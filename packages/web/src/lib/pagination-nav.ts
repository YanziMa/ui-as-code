/**
 * Pagination Navigation: Standalone pagination component with page size selector,
 * jump-to-page input, total count display, page range info, compact/full modes,
 * keyboard navigation, and accessibility.
 */

// --- Types ---

export type PaginationSize = "sm" | "md" | "lg";
export type PaginationVariant = "default" | "outlined" | "filled";

export interface PaginationNavOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Total number of items */
  total: number;
  /** Current page (1-based) */
  current?: number;
  /** Page size (items per page) */
  pageSize?: number;
  /** Available page sizes for selector */
  pageSizes?: number[];
  /** Show total count? */
  showTotal?: boolean;
  /** Show page size selector? */
  showPageSize?: boolean;
  /** Show jump-to-page input? */
  showJumpToPage?: boolean;
  /** Show page range info (e.g., "1-10 of 100")? */
  showRangeInfo?: boolean;
  /** Max visible page buttons (0 = show all) */
  maxVisiblePages?: number;
  /** Size variant */
  size?: PaginationSize;
  /** Visual variant */
  variant?: PaginationVariant;
  /** Disabled state */
  disabled?: boolean;
  /** Callback on page change */
  onPageChange?: (page: number, pageSize: number) => void;
  /** Callback on page size change */
  onPageSizeChange?: (pageSize: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface PaginationNavInstance {
  element: HTMLElement;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Next page */
  nextPage: () => void;
  /** Previous page */
  prevPage: () => void;
  /** Get current page */
  getCurrentPage: () => number;
  /** Get total pages */
  getTotalPages: () => number;
  /** Set page size */
  setPageSize: (size: number) => void;
  /** Get current page size */
  getPageSize: () => number;
  /** Set total items count */
  setTotal: (total: number) => void;
  /** Get total items count */
  getTotal: () => number;
  /** Disable/enable pagination */
  setDisabled: (disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<PaginationSize, {
  btnPadding: string; fontSize: string; btnSize: string; gap: string;
}> = {
  sm: { btnPadding: "4px 8px", fontSize: "12px", btnSize: "28px", gap: "4px" },
  md: { btnPadding: "6px 12px", fontSize: "13px", btnSize: "34px", gap: "6px" },
  lg: { btnPadding: "8px 16px", fontSize: "14px", btnSize: "40px", gap: "8px" },
};

// --- Main Factory ---

export function createPaginationNav(options: PaginationNavOptions): PaginationNavInstance {
  const opts = {
    current: options.current ?? 1,
    pageSize: options.pageSize ?? 10,
    pageSizes: options.pageSizes ?? [10, 20, 50, 100],
    showTotal: options.showTotal ?? true,
    showPageSize: options.showPageSize ?? true,
    showJumpToPage: options.showJumpToPage ?? false,
    showRangeInfo: options.showRangeInfo ?? true,
    maxVisiblePages: options.maxVisiblePages ?? 7,
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    disabled: options.disabled ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("PaginationNav: container not found");

  let currentPage = opts.current;
  let currentPageSize = opts.pageSize;
  let totalItems = opts.total;
  let destroyed = false;

  // Root element
  const root = document.createElement("nav");
  root.className = `pagination-nav pagination-${opts.size} pagination-${opts.variant} ${opts.className ?? ""}`;
  root.setAttribute("role", "navigation");
  root.setAttribute("aria-label", "Pagination");
  root.style.cssText = `
    display:flex;align-items:center;flex-wrap:wrap;gap:${SIZE_STYLES[opts.size].gap};
    font-family:-apple-system,sans-serif;color:#374151;
  `;
  container.appendChild(root);

  function totalPages(): number {
    return Math.max(1, Math.ceil(totalItems / currentPageSize));
  }

  function render(): void {
    root.innerHTML = "";

    const tp = totalPages();
    const sz = SIZE_STYLES[opts.size];
    const isDisabled = opts.disabled || tp <= 1;

    // Previous button
    const prevBtn = createButton(
      "\u2039",
      "Previous page",
      () => instance.prevPage(),
      currentPage <= 1 || isDisabled,
    );
    root.appendChild(prevBtn);

    // Page buttons
    const pages = getVisiblePages(currentPage, tp, opts.maxVisiblePages);
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i]!;

      if (p === "...") {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "\u2026";
        ellipsis.style.cssText = `
          padding:${sz.btnPadding};color:#9ca3af;font-size:${sz.fontSize};
          user-select:none;display:flex;align-items:center;justify-content:center;
        `;
        root.appendChild(ellipsis);
        continue;
      }

      const isActive = p === currentPage;
      const pageBtn = createButton(
        String(p),
        `Go to page ${p}`,
        () => instance.goToPage(p),
        isDisabled,
        isActive,
      );
      root.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = createButton(
      "\u203A",
      "Next page",
      () => instance.nextPage(),
      currentPage >= tp || isDisabled,
    );
    root.appendChild(nextBtn);

    // Right-side controls
    if (opts.showRangeInfo || opts.showTotal || opts.showPageSize || opts.showJumpToPage) {
      const rightPanel = document.createElement("div");
      rightPanel.className = "pagination-info";
      rightPanel.style.cssText = `
        display:flex;align-items:center;gap:${sz.gap};
        margin-left:auto;font-size:${sz.fontSize};color:#6b7280;
      `;

      // Range info
      if (opts.showRangeInfo && totalItems > 0) {
        const start = (currentPage - 1) * currentPageSize + 1;
        const end = Math.min(currentPage * currentPageSize, totalItems);
        const rangeEl = document.createElement("span");
        rangeEl.className = "pagination-range";
        rangeEl.style.cssText = "white-space:nowrap;";
        rangeEl.textContent = `${start}-${end} of ${totalItems.toLocaleString()}`;
        rightPanel.appendChild(rangeEl);
      }

      // Page size selector
      if (opts.showPageSize && opts.pageSizes.length > 0) {
        const select = document.createElement("select");
        select.className = "pagination-size-select";
        select.setAttribute("aria-label", "Items per page");
        select.style.cssText = `
          border:1px solid #d1d5db;border-radius:6px;padding:2px 6px;
          font-size:${sz.fontSize};cursor:pointer;background:#fff;color:#374151;
        `;
        for (const ps of opts.pageSizes) {
          const opt = document.createElement("option");
          opt.value = String(ps);
          opt.textContent = `${ps} / page`;
          if (ps === currentPageSize) opt.selected = true;
          select.appendChild(opt);
        }
        select.addEventListener("change", () => {
          instance.setPageSize(parseInt(select.value, 10));
        });
        rightPanel.appendChild(select);
      }

      // Jump to page
      if (opts.showJumpToPage && tp > 1) {
        const jumpGroup = document.createElement("div");
        jumpGroup.style.cssText = "display:flex;align-items:center;gap:2px;";

        const label = document.createElement("span");
        label.textContent = "Go to:";
        jumpGroup.appendChild(label);

        const input = document.createElement("input");
        input.type = "number";
        input.min = "1";
        input.max = String(tp);
        input.value = String(currentPage);
        input.style.cssText = `
          width:48px;border:1px solid #d1d5db;border-radius:4px;
          padding:2px 4px;text-align:center;font-size:${sz.fontSize};
        `;
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            const val = parseInt(input.value, 10);
            if (val >= 1 && val <= tp) instance.goToPage(val);
          }
        });
        jumpGroup.appendChild(input);

        rightPanel.appendChild(jumpGroup);
      }

      // Total count
      if (opts.showTotal) {
        const totalEl = document.createElement("span");
        totalEl.className = "pagination-total";
        totalEl.style.cssText = "white-space:nowrap;";
        totalEl.textContent = `${totalItems.toLocaleString()} total`;
        rightPanel.appendChild(totalEl);
      }

      root.appendChild(rightPanel);
    }
  }

  function createButton(
    label: string,
    title: string,
    onClick: () => void,
    disabled: boolean,
    active = false,
  ): HTMLButtonElement {
    const sz = SIZE_STYLES[opts.size];

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.title = title;
    btn.disabled = disabled;
    btn.setAttribute("aria-current", String(active));

    switch (opts.variant) {
      case "outlined":
        btn.style.cssText = `
          padding:${sz.btnPadding};border:1px solid ${active ? "#4338ca" : "#d1d5db"};
          border-radius:6px;background:${active ? "#eef2ff" : "#fff"};
          color:${active ? "#4338ca" : "#374151"};font-size:${sz.fontSize};
          cursor:${disabled ? "not-allowed" : "pointer"};font-weight:${active ? "600" : "400"};
          min-width:${sz.btnSize};display:flex;align-items:center;justify-content:center;
          transition:all 0.15s;font-family:inherit;
        `;
        break;
      case "filled":
        btn.style.cssText = `
          padding:${sz.btnPadding};border:none;border-radius:6px;
          background:${active ? "#4338ca" : "#f3f4f6"};color:${active ? "#fff" : "#374151"};
          font-size:${sz.fontSize};cursor:${disabled ? "not-allowed" : "pointer"};
          font-weight:${active ? "600" : "400"};min-width:${sz.btnSize};
          display:flex;align-items:center;justify-content:center;
          transition:all 0.15s;font-family:inherit;
        `;
        break;
      default:
        btn.style.cssText = `
          padding:${sz.btnPadding};border:1px solid transparent;border-radius:6px;
          background:${active ? "#4338ca" : "transparent"};color:${active ? "#fff" : "#374151"};
          font-size:${sz.fontSize};cursor:${disabled ? "not-allowed" : "pointer"};
          font-weight:${active ? "600" : "400"};min-width:${sz.btnSize};
          display:flex;align-items:center;justify-content:center;
          transition:all 0.15s;font-family:inherit;
        `;
    }

    btn.addEventListener("click", onClick);

    // Hover effects (only when not disabled and not active in default mode)
    if (!disabled) {
      btn.addEventListener("mouseenter", () => {
        if (opts.variant === "default" && !active) {
          btn.style.background = "#f3f4f6";
        } else if (opts.variant === "outlined" && !active) {
          btn.style.borderColor = "#4338ca"; btn.style.color = "#4338ca";
        } else if (opts.variant === "filled" && !active) {
          btn.style.background = "#e5e7eb";
        }
      });
      btn.addEventListener("mouseleave", () => {
        render(); // Re-render to reset styles
      });
    }

    return btn;
  }

  /**
   * Calculate which page numbers to show.
   * Always shows first, last, current, and neighbors with ellipsis for gaps.
   */
  function getVisiblePages(current: number, total: number, maxVisible: number): Array<number | "..."> {
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, current - half + 1);
    let end = start + maxVisible - 1;

    if (end > total) {
      end = total;
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages: Array<number | "..."> = [];

    // Always include first page
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    // Middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Always include last page
    if (end < total) {
      if (end < total - 1) pages.push("...");
      pages.push(total);
    }

    return pages;
  }

  function changePage(page: number): void {
    const tp = totalPages();
    page = Math.max(1, Math.min(page, tp));
    if (page === currentPage) return;
    currentPage = page;
    render();
    opts.onPageChange?.(currentPage, currentPageSize);
  }

  // Initial render
  render();

  // Instance
  const instance: PaginationNavInstance = {
    element: root,

    goToPage(page: number) { changePage(page); },
    nextPage() { changePage(currentPage + 1); },
    prevPage() { changePage(currentPage - 1); },

    getCurrentPage() { return currentPage; },
    getTotalPages() { return totalPages(); },

    setPageSize(size: number) {
      currentPageSize = size;
      // Reset to first page when changing size
      currentPage = 1;
      render();
      opts.onPageSizeChange?.(size);
      opts.onPageChange?.(currentPage, currentPageSize);
    },

    getPageSize() { return currentPageSize; },

    setTotal(total: number) {
      totalItems = total;
      if (currentPage > totalPages()) currentPage = totalPages();
      render();
    },

    getTotal() { return totalItems; },

    setDisabled(disabled: boolean) {
      opts.disabled = disabled;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}

// --- Helper: Generate page info text ---

/** Format pagination info as a readable string */
export function formatPaginationInfo(options: {
  current: number;
  pageSize: number;
  total: number;
}): string {
  const { current, pageSize, total } = options;
  const tp = Math.ceil(total / pageSize);
  const start = (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  return `Showing ${start}-${end} of ${total.toLocaleString()} (page ${current} of ${tp})`;
}

/** Calculate optimal page size based on viewport height */
export function getOptimalPageSize(containerHeight: number, rowHeight = 40): number {
  const visibleRows = Math.floor((containerHeight - 80) / rowHeight); // 80px for header/footer
  return Math.max(10, Math.min(100, visibleRows));
}
