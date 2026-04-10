/**
 * Pagination Component: Page navigation with ellipsis, page sizes, total count,
 * keyboard navigation, compact mode, accessibility (ARIA), and i18n support.
 */

// --- Types ---

export interface PaginationOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Total number of items */
  totalItems: number;
  /** Items per page */
  pageSize?: number;
  /** Current page (1-based) */
  currentPage?: number;
  /** Available page sizes for selector */
  pageSizes?: number[];
  /** Show page size selector */
  showPageSizeSelector?: boolean;
  /** Show total item count */
  showTotal?: boolean;
  /** Show first/last page buttons */
  showFirstLast?: boolean;
  /** Max visible page numbers (excluding first/last) */
  maxVisiblePages?: number;
  /** Compact mode (smaller buttons) */
  compact?: boolean;
  /** Callback on page change */
  onPageChange?: (page: number) => void;
  /** Callback on page size change */
  onPageSizeChange?: (size: number) => void;
  /** Custom labels */
  labels?: {
    prev?: string;
    next?: string;
    first?: string;
    last?: string;
    total?: string;
    pageOfSize?: string;
    goToPage?: string;
  };
  /** Disabled state */
  disabled?: boolean;
  /** Custom CSS class */
  className?: string;
}

export interface PaginationInstance {
  element: HTMLElement;
  getCurrentPage: () => number;
  getPageSize: () => number;
  getTotalPages: () => number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  destroy: () => void;
}

// --- Helpers ---

function createButton(
  label: string,
  disabled: boolean,
  onClick: () => void,
  compact: boolean,
  ariaLabel?: string,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.disabled = disabled;
  if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
  btn.style.cssText = `
    display:inline-flex;align-items:center;justify-content:center;
    ${compact ? "min-width:28px;height:28px;padding:0 6px;font-size:12px;" : "min-width:34px;height:36px;padding:0 10px;font-size:13px;"}
    border:1px solid ${disabled ? "#e5e7eb" : "#d1d5db"};border-radius:6px;
    background:${disabled ? "#f9fafb" : "#fff"};color:${disabled ? "#9ca3af" : "#374151"};
    cursor:${disabled ? "not-allowed" : "pointer"};
    transition:all 0.15s;white-space:nowrap;user-select:none;
  `;
  btn.addEventListener("mouseenter", () => {
    if (!disabled) {
      btn.style.borderColor = "#6366f1";
      btn.style.color = "#4338ca";
      btn.style.background = "#eef2ff";
    }
  });
  btn.addEventListener("mouseleave", () => {
    if (!disabled) {
      btn.style.borderColor = "#d1d5db";
      btn.style.color = "#374151";
      btn.style.background = "#fff";
    }
  });
  btn.addEventListener("click", onClick);
  return btn;
}

// --- Main Class ---

export class PaginationManager {
  create(options: PaginationOptions): PaginationInstance {
    const opts = {
      pageSize: options.pageSize ?? 20,
      currentPage: options.currentPage ?? 1,
      pageSizes: options.pageSizes ?? [10, 20, 50, 100],
      showPageSizeSelector: options.showPageSizeSelector ?? true,
      showTotal: options.showTotal ?? true,
      showFirstLast: options.showFirstLast ?? true,
      maxVisiblePages: options.maxVisiblePages ?? 5,
      compact: options.compact ?? false,
      disabled: options.disabled ?? false,
      labels: {
        prev: "\u2039",
        next: "\u203A",
        first: "\u00AB",
        last: "\u00BB",
        total: "Total {count} items",
        pageOfSize: "{page} / {size}",
        goToPage: "Go to page...",
        ...options.labels,
      },
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Pagination: container element not found");

    container.className = `pagination ${opts.compact ? "compact" : ""} ${opts.className ?? ""}`;
    container.style.cssText = "display:flex;align-items:center;gap:8px;flex-wrap:wrap;";

    // State
    let currentPage = opts.currentPage;
    let pageSize = opts.pageSize;
    let totalItems = opts.totalItems;

    function getTotalPages(): number {
      return Math.max(1, Math.ceil(totalItems / pageSize));
    }

    function clampPage(page: number): number {
      return Math.max(1, Math.min(page, getTotalPages()));
    }

    // Render function
    function render(): void {
      container.innerHTML = "";

      const totalPages = getTotalPages();
      const isDisabled = opts.disabled || totalPages <= 1;

      // Page size selector
      if (opts.showPageSizeSelector && opts.pageSizes.length > 0) {
        const selectWrapper = document.createElement("div");
        selectWrapper.style.cssText = "display:flex;align-items:center;gap:4px;";
        const select = document.createElement("select");
        select.disabled = isDisabled;
        select.style.cssText = `
          padding:${opts.compact ? "3px 5px" : "5px 8px"};border:1px solid #d1d5db;border-radius:6px;
          font-size:${opts.compact ? "11px" : "12px"};color:#374151;background:#fff;
          cursor:pointer;outline:none;
        `;
        for (const size of opts.pageSizes) {
          const opt = document.createElement("option");
          opt.value = String(size);
          opt.textContent = String(size);
          if (size === pageSize) opt.selected = true;
          select.appendChild(opt);
        }
        select.addEventListener("change", () => {
          pageSize = parseInt(select.value, 10);
          currentPage = 1;
          render();
          opts.onPageSizeChange?.(pageSize);
        });
        selectWrapper.appendChild(select);

        const sizeLabel = document.createElement("span");
        sizeLabel.textContent = "/ page";
        sizeLabel.style.cssText = `font-size:${opts.compact ? "11px" : "12px"};color:#6b7280;`;
        selectWrapper.appendChild(sizeLabel);
        container.appendChild(selectWrapper);
      }

      // Navigation buttons
      const navGroup = document.createElement("div");
      navGroup.style.cssText = "display:flex;align-items:center;gap:2px;";

      if (opts.showFirstLast) {
        navGroup.appendChild(createButton(opts.labels.first!, currentPage <= 1 || isDisabled, () => {
          setCurrentPage(1);
        }, opts.compact, "First page"));
      }

      navGroup.appendChild(createButton(opts.labels.prev!, currentPage <= 1 || isDisabled, () => {
        setCurrentPage(currentPage - 1);
      }, opts.compact, "Previous page"));

      // Page numbers with ellipsis
      const pages = generatePageNumbers(currentPage, totalPages, opts.maxVisiblePages);
      for (const p of pages) {
        if (p === "...") {
          const ellipsis = document.createElement("span");
          ellipsis.textContent = "\u2026";
          ellipsis.style.cssText = `
            display:inline-flex;align-items:center;justify-content:center;
            min-width:${opts.compact ? "28px" : "34px"};height:${opts.compact ? "28px" : "36px"};
            color:#9ca3af;font-size:13px;cursor:default;
          `;
          navGroup.appendChild(ellipsis);
        } else {
          const isActive = p === currentPage;
          const pageBtn = createButton(String(p), false, () => {
            setCurrentPage(p!);
          }, opts.compact, `Go to page ${p}`);
          if (isActive) {
            pageBtn.style.background = "#4338ca";
            pageBtn.style.color = "#fff";
            pageBtn.style.borderColor = "#4338ca";
            pageBtn.style.fontWeight = "600";
            pageBtn.setAttribute("aria-current", "page");
          }
          navGroup.appendChild(pageBtn);
        }
      }

      navGroup.appendChild(createButton(opts.labels.next!, currentPage >= totalPages || isDisabled, () => {
        setCurrentPage(currentPage + 1);
      }, opts.compact, "Next page"));

      if (opts.showFirstLast) {
        navGroup.appendChild(createButton(opts.labels.last!, currentPage >= totalPages || isDisabled, () => {
          setCurrentPage(totalPages);
        }, opts.compact, "Last page"));
      }

      container.appendChild(navGroup);

      // Total count
      if (opts.showTotal) {
        const totalEl = document.createElement("span");
        totalEl.className = "pagination-total";
        totalEl.style.cssText = `font-size:${opts.compact ? "11px" : "12px"};color:#6b7280;margin-left:auto;`;
        totalEl.textContent = opts.labels.total!.replace("{count}", String(totalItems));
        container.appendChild(totalEl);
      }

      // Current page info
      const infoEl = document.createElement("span");
      infoEl.className = "pagination-info";
      infoEl.style.cssText = `font-size:${opts.compact ? "11px" : "12px"};color:#6b7280;`;
      const startItem = (currentPage - 1) * pageSize + 1;
      const endItem = Math.min(currentPage * pageSize, totalItems);
      infoEl.textContent = `${startItem}-${endItem} of ${totalItems}`;
      container.appendChild(infoEl);
    }

    function generatePageNumbers(current: number, total: number, maxVisible: number): (number | "...")[] {
      if (total <= maxVisible + 2) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }

      const pages: (number | "...")[] = [1];
      let left = Math.max(2, current - Math.floor(maxVisible / 2));
      let right = Math.min(total - 1, current + Math.floor(maxVisible / 2));

      // Adjust range
      if (current - left < Math.floor(maxVisible / 2)) {
        right = Math.min(total - 1, right + (Math.floor(maxVisible / 2) - (current - left)));
      }
      if (right - current < Math.floor(maxVisible / 2)) {
        left = Math.max(2, left - (Math.floor(maxVisible / 2) - (right - current)));
      }

      if (left > 2) pages.push("...");
      for (let i = left; i <= right; i++) pages.push(i);
      if (right < total - 1) pages.push("...");
      pages.push(total);

      return pages;
    }

    function setCurrentPage(page: number): void {
      const newPage = clampPage(page);
      if (newPage === currentPage) return;
      currentPage = newPage;
      render();
      opts.onPageChange?.(currentPage);
    }

    // Initial render
    render();

    const instance: PaginationInstance = {
      element: container,

      getCurrentPage() { return currentPage; },
      getPageSize() { return pageSize; },
      getTotalPages() { return getTotalPages(); },

      setCurrentPage(page: number) { setCurrentPage(page); },

      setPageSize(size: number) {
        pageSize = size;
        currentPage = 1;
        render();
      },

      setTotalItems(total: number) {
        totalItems = total;
        currentPage = clampPage(currentPage);
        render();
      },

      destroy() {
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a pagination component */
export function createPagination(options: PaginationOptions): PaginationInstance {
  return new PaginationManager().create(options);
}
