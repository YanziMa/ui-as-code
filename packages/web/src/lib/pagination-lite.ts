/**
 * Lightweight Pagination: Page navigation with ellipsis page numbers, page size selector,
 * first/last buttons, compact mode, total count display, i18n labels.
 */

// --- Types ---

export type PaginationSize = "sm" | "md" | "lg";

export interface PaginationOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Total items */
  total: number;
  /** Items per page */
  pageSize?: number;
  /** Current page (1-based) */
  current?: number;
  /** Max visible page buttons (default: 7) */
  maxVisible?: number;
  /** Show page size selector? */
  showPageSize?: boolean;
  /** Show total count? */
  showTotal?: boolean;
  /** Compact mode (smaller)? */
  compact?: boolean;
  /** Callback on page change */
  onPageChange?: (page: number) => void;
  /** Callback on page size change */
  onPageSizeChange?: (size: number) => void;
  /** Custom labels for i18n */
  labels?: {
    of?: string;
    prev?: string;
    next?: string;
    first?: string;
    last?: string;
    itemsPerPage?: string;
  };
  /** Custom CSS class */
  className?: string;
}

export interface PaginationInstance {
  element: HTMLElement;
  getCurrentPage: () => number;
  setCurrentPage: (page: number) => void;
  getPageSize: () => number;
  setPageSize: (size: number) => void;
  getTotalPages: () => number;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<PaginationSize, { height: number; fontSize: number; paddingX: number; btnPadding: number }> = {
  sm: { height: 28, fontSize: 12, paddingX: 6, btnPadding: 4 },
  md: { height: 34, fontSize: 13, paddingX: 8, btnPadding: 6 },
  lg: { height: 40, fontSize: 14, paddingX: 10, btnPadding: 8 },
};

// --- Main Factory ---

export function createPagination(options: PaginationOptions): PaginationInstance {
  const opts = {
    pageSize: options.pageSize ?? 10,
    current: options.current ?? 1,
    maxVisible: options.maxVisible ?? 7,
    showPageSize: options.showPageSize ?? false,
    showTotal: options.showTotal ?? true,
    compact: options.compact ?? false,
    labels: {
      of: options.labels?.of ?? "of",
      prev: options.labels?.prev ?? "\u2039",
      next: options.labels?.next ?? "\u203a",
      first: options.labels?.first ?? "\u226a",
      last: options.labels?.last ?? "\u226b",
      itemsPerPage: options.labels?.itemsPerPage ?? "per page",
    },
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Pagination: container not found");

  let currentPage = opts.current;
  let pageSize = opts.pageSize;
  let destroyed = false;

  const sz = SIZE_STYLES.md;

  // Root
  const root = document.createElement("div");
  root.className = `pagination ${opts.className}`;
  root.style.cssText = `
    display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:${opts.compact ? "4" : "8px"};
    font-family:-apple-system,sans-serif;color:#374151;font-size:13px;
  `;
  container.appendChild(root);

  function totalPages(): number {
    return Math.max(1, Math.ceil(options.total / pageSize));
  }

  function render(): void {
    root.innerHTML = "";

    const totalP = totalPages();
    if (totalP <= 1 && !opts.showTotal) return;

    // First button
    const firstBtn = createBtn(opts.labels.first);
    firstBtn.disabled = currentPage <= 1 || totalP <= 1;
    firstBtn.addEventListener("click", () => goToPage(1));
    root.appendChild(firstBtn);

    // Prev button
    const prevBtn = createBtn(opts.labels.prev);
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener("click", () => goToPage(currentPage - 1));
    root.appendChild(prevBtn);

    // Page numbers
    const pages = getPageNumbers(currentPage, totalP, opts.maxVisible);
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i]!;
      if (p === "...") {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "\u2026";
        ellipsis.style.cssText = `padding:0 ${sz.paddingX}px;color:#9ca3af;`;
        root.appendChild(ellipsis);
      } else {
        const pageBtn = createBtn(String(p));
        pageBtn.classList.add(p === currentPage ? "pg-active" : "");
        if (p === currentPage) {
          pageBtn.style.background = "#4f46e5";
          pageBtn.style.color = "#fff";
          pageBtn.style.borderColor = "#4338ca";
          pageBtn.style.fontWeight = "600";
        }
        pageBtn.disabled = p === currentPage;
        pageBtn.addEventListener("click", () => goToPage(p));
        root.appendChild(pageBtn);
      }
    }

    // Next button
    const nextBtn = createBtn(opts.labels.next);
    nextBtn.disabled = currentPage >= totalP;
    nextBtn.addEventListener("click", () => goToPage(currentPage + 1));
    root.appendChild(nextBtn);

    // Last button
    const lastBtn = createBtn(opts.labels.last);
    lastBtn.disabled = currentPage >= totalP || totalP <= 1;
    lastBtn.addEventListener("click", () => goToPage(totalP));
    root.appendChild(lastBtn);

    // Page size selector
    if (opts.showPageSize) {
      const sizes = [10, 20, 50, 100];
      const select = document.createElement("select");
      select.className = "pg-size-select";
      select.value = String(pageSize);
      select.style.cssText = `
        border:1px solid #d1d5db;border-radius:6px;padding:3px 6px;
        font-size:${sz.fontSize - 1}px;color:#374151;background:#fff;
        cursor:pointer;font-family:inherit;margin-left:8px;
      `;
      for (const s of sizes) {
        const opt = document.createElement("option");
        opt.value = String(s);
        opt.textContent = `${s} ${opts.labels.itemsPerPage}`;
        select.appendChild(opt);
      }
      select.addEventListener("change", () => {
        pageSize = parseInt(select.value, 10);
        if (currentPage > totalPages()) currentPage = totalPages();
        render();
        opts.onPageSizeChange?.(pageSize);
      });
      root.appendChild(select);
    }

    // Total count
    if (opts.showTotal && options.total > 0) {
      const totalEl = document.createElement("span");
      totalEl.className = "pg-total";
      totalEl.textContent = `${opts.labels.of} ${options.total.toLocaleString()}`;
      totalEl.style.cssText = `margin-left:12px;color:#9ca3af;font-size:${sz.fontSize - 1}px;white-space:nowrap;`;
      root.appendChild(totalEl);
    }
  }

  function createBtn(label: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.cssText = `
      display:inline-flex;align-items:center;justify-content:center;
      min-width:${sz.height}px;height:${sz.height}px;
      padding:0 ${sz.btnPadding}px;border:1px solid #d1d5db;border-radius:6px;
      background:#fff;color:#374151;font-size:${sz.fontSize}px;font-weight:500;
      cursor:pointer;font-family:inherit;line-height:1;
      transition:all 0.15s;
    `;
    btn.addEventListener("mouseenter", () => {
      if (!btn.disabled) { btn.style.background = "#f9fafb"; btn.style.borderColor = "#c7d2fe"; }
    });
    btn.addEventListener("mouseleave", () => {
      if (!btn.disabled) { btn.style.background = ""; btn.style.borderColor = "#d1d5db"; }
    });
    return btn;
  }

  function goToPage(page: number): void {
    const maxP = totalPages();
    if (page < 1) page = 1;
    if (page > maxP) page = maxP;
    if (page !== currentPage) {
      currentPage = page;
      render();
      opts.onPageChange?.(currentPage);
    }
  }

  function getPageNumbers(current: number, total: number, maxVisible: number): Array<number | string> {
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisible / 2);
    const result: Array<number | string> = [];

    // Always include first page
    result.push(1);

    // Pages around current with ellipsis
    let start = Math.max(2, current - half + 1);
    let end = Math.min(total - 1, current + half - 1);

    if (start > 2) result.push("...");
    for (let i = start; i <= end; i++) result.push(i);
    if (end < total - 1) result.push("...");

    // Always include last page
    result.push(total);

    return result;
  }

  render();

  const instance: PaginationInstance = {
    element: root,

    getCurrentPage() { return currentPage; },

    setCurrentPage(page: number) { goToPage(page); },

    getPageSize() { return pageSize; },

    setPageSize(size: number) {
      pageSize = size;
      if (currentPage > totalPages()) currentPage = totalPages();
      render();
      opts.onPageSizeChange?.(pageSize);
    },

    getTotalPages() { return totalPages(); },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
