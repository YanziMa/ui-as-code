/**
 * Pagination Utilities: Full-featured pagination with page navigation,
 * size options, total count display, keyboard support, ARIA attributes,
 * and multiple layout variants.
 */

// --- Types ---

export type PaginationSize = "sm" | "md" | "lg";
export type PaginationLayout = "full" | "simple" | "compact" | "input";

export interface PaginationOptions {
  /** Total number of items */
  total: number;
  /** Items per page */
  pageSize: number;
  /** Current page (1-based) */
  currentPage?: number;
  /** Layout variant */
  layout?: PaginationLayout;
  /** Size variant */
  size?: PaginationSize;
  /** Show total item count */
  showTotal?: boolean;
  /** Show page size selector */
  showPageSize?: boolean;
  /** Available page sizes */
  pageSizes?: number[];
  /** Max visible page buttons (for full layout) */
  maxVisiblePages?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Called when page size changes */
  onPageSizeChange?: (size: number) => void;
}

export interface PaginationInstance {
  /** The root element */
  el: HTMLElement;
  /** Get current page */
  getCurrentPage: () => number;
  /** Set current page */
  setPage: (page: number) => void;
  /** Get page size */
  getPageSize: () => number;
  /** Set page size */
  setPageSize: (size: number) => void;
  /** Get total pages */
  getTotalPages: () => number;
  /** Go to first page */
  first: () => void;
  /** Go to last page */
  last: () => void;
  /** Go to next page */
  next: () => void;
  /** Go to previous page */
  prev: () => void;
  /** Update total items */
  setTotal: (total: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a pagination component.
 *
 * @example
 * ```ts
 * const pagination = createPagination({
 *   total: 1000,
 *   pageSize: 20,
 *   currentPage: 1,
 *   onPageChange: (page) => fetchData(page),
 * });
 * ```
 */
export function createPagination(options: PaginationOptions): PaginationInstance {
  const {
    total,
    pageSize: initialPageSize,
    currentPage = 1,
    layout = "full",
    size = "md",
    showTotal = true,
    showPageSize = false,
    pageSizes = [10, 20, 50, 100],
    maxVisiblePages = 7,
    className,
    container,
    onPageChange,
    onPageSizeChange,
  } = options;

  let _currentPage = Math.max(1, Math.min(currentPage, Math.ceil(total / initialPageSize) || 1));
  let _pageSize = initialPageSize;
  let _total = total;

  // Size config
  const sizeConfig: Record<PaginationSize, { btnPadding: string; fontSize: string; gap: string }> = {
    "sm": { btnPadding: "4px 8px", fontSize: "12px", gap: "2px" },
    "md": { btnPadding: "6px 12px", fontSize: "13px", gap: "4px" },
    "lg": { btnPadding: "8px 16px", fontSize: "14px", gap: "6px" },
  };
  const sc = sizeConfig[size];

  // Root
  const root = document.createElement("nav");
  root.className = `pagination ${layout} ${size} ${className ?? ""}`.trim();
  root.setAttribute("aria-label", "Pagination");
  root.style.cssText =
    `display:flex;align-items:center;gap:${sc.gap};flex-wrap:wrap;font-size:${sc.fontSize};`;

  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function getCurrentPage(): number { return _currentPage; }
  function getPageSize(): number { return _pageSize; }

  function getTotalPages(): number {
    return Math.max(1, Math.ceil(_total / _pageSize));
  }

  function setPage(page: number): void {
    const totalPages = getTotalPages();
    const newPage = Math.max(1, Math.min(page, totalPages));
    if (newPage === _currentPage) return;
    _currentPage = newPage;
    _render();
    onPageChange(_currentPage);
  }

  function setPageSize(size: number): void {
    if (size === _pageSize) return;
    _pageSize = size;
    // Reset to page 1 since page may no longer be valid
    _currentPage = 1;
    _render();
    onPageSizeChange?.(size);
    onPageChange(1);
  }

  function first(): void { setPage(1); }
  function last(): void { setPage(getTotalPages()); }
  function next(): void { setPage(_currentPage + 1); }
  function prev(): void { setPage(_currentPage - 1); }

  function setTotal(newTotal: number): void {
    _total = newTotal;
    if (_currentPage > getTotalPages()) _currentPage = getTotalPages();
    _render();
  }

  function destroy(): void { root.remove(); }

  // --- Render ---

  function _render(): void {
    root.innerHTML = "";

    const totalPages = getTotalPages();
    if (totalPages <= 1 && !showTotal) return;

    switch (layout) {
      case "full": _renderFull(totalPages); break;
      case "simple": _renderSimple(totalPages); break;
      case "compact": _renderCompact(totalPages); break;
      case "input": _renderInput(totalPages); break;
    }

    // Total count
    if (showTotal) {
      const totalEl = document.createElement("span");
      totalEl.className = "pagination-total";
      totalEl.textContent = `${_total} total`;
      totalEl.style.cssText = "color:#9ca3af;margin-left:auto;white-space:nowrap;";
      root.appendChild(totalEl);
    }

    // Page size selector
    if (showPageSize) {
      const select = document.createElement("select");
      select.className = "pagination-size-select";
      select.style.cssText =
        `padding:${sc.btnPadding};border:1px solid #d1d5db;border-radius:6px;` +
        `font-size:${sc.fontSize};background:#fff;color:#374151;cursor:pointer;`;
      for (const ps of pageSizes) {
        const opt = document.createElement("option");
        opt.value = String(ps);
        opt.textContent = `${ps} / page`;
        opt.selected = ps === _pageSize;
        select.appendChild(opt);
      }
      select.addEventListener("change", () => {
        setPageSize(parseInt(select.value, 10));
      });
      root.appendChild(select);
    }
  }

  function _createBtn(label: string, disabled: boolean, onClick: () => void, ariaLabel?: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.innerHTML = label;
    btn.disabled = disabled;
    if (ariaLabel) btn.setAttribute("aria-label", ariaLabel);
    btn.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;` +
      `padding:${sc.btnPadding};border:1px solid ${disabled ? "#e5e7eb" : "#d1d5db"};` +
      `border-radius:6px;background:${disabled ? "#f9fafb" : "#fff"};` +
      `color:${disabled ? "#9ca3af" : "#374151"};cursor:${disabled ? "not-allowed" : "pointer"};` +
      "font-size:inherit;font-family:inherit;line-height:1;" +
      "transition:border-color 0.12s,background 0.12s,color 0.12s;";

    if (!disabled) {
      btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#93c5fd"; btn.style.color = "#2563eb"; });
      btn.addEventListener("mouseleave", () => { btn.style.borderColor = "#d1d5db"; btn.style.color = "#374151"; });
      btn.addEventListener("click", onClick);
    }

    return btn;
  }

  function _createPageBtn(pageNum: number, isActive: boolean, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(pageNum);
    btn.setAttribute("aria-current", String(isActive));
    btn.setAttribute("aria-label", `Page ${pageNum}`);
    btn.style.cssText =
      `display:inline-flex;align-items:center;justify-content:center;` +
      `padding:${sc.btnPadding};border:1px solid ${isActive ? "#3b82f6" : "#d1d5db"};` +
      `border-radius:6px;background:${isActive ? "#eff6ff" : "#fff"};` +
      `color:${isActive ? "#2563eb" : "#374151"};cursor:pointer;` +
      "font-size:inherit;font-family:inherit;line-height:1;min-width:32px;" +
      "transition:border-color 0.12s,background 0.12s,color 0.12s;";

    if (!isActive) {
      btn.addEventListener("mouseenter", () => { btn.style.borderColor = "#93c5fd"; btn.style.color = "#2563eb"; });
      btn.addEventListener("mouseleave", () => { btn.style.borderColor = "#d1d5db"; btn.style.color = "#374151"; });
    }
    btn.addEventListener("click", onClick);

    return btn;
  }

  function _renderFull(totalPages: number): void {
    // First / Prev
    root.appendChild(_createBtn("&laquo;&laquo;", _currentPage <= 1, first, "First page"));
    root.appendChild(_createBtn("&laquo;", _currentPage <= 1, prev, "Previous page"));

    // Page numbers with ellipsis
    const pages = _getPageRange(totalPages);
    for (const p of pages) {
      if (p === -1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "\u2026";
        ellipsis.style.cssText = "color:#9ca3af;padding:0 4px;";
        root.appendChild(ellipsis);
      } else {
        root.appendChild(_createPageBtn(p, p === _currentPage, () => setPage(p)));
      }
    }

    // Next / Last
    root.appendChild(_createBtn("&raquo;", _currentPage >= totalPages, next, "Next page"));
    root.appendChild(_createBtn("&raquo;&raquo;", _currentPage >= totalPages, last, "Last page"));
  }

  function _renderSimple(totalPages: number): void {
    root.appendChild(_createBtn("&larr;", _currentPage <= 1, prev, "Previous"));
    const info = document.createElement("span");
    info.textContent = `${_currentPage} / ${totalPages}`;
    info.style.cssText = "min-width:48px;text-align:center;color:#374151;font-weight:500;";
    root.appendChild(info);
    root.appendChild(_createBtn("&rarr;", _currentPage >= totalPages, next, "Next"));
  }

  function _renderCompact(totalPages: number): void {
    root.appendChild(_createBtn("&laquo;", _currentPage <= 1, prev));
    root.appendChild(_createPageBtn(_currentPage, true, () => {}));
    const info = document.createElement("span");
    info.textContent = `/ ${totalPages}`;
    info.style.color = "#9ca3af";
    root.appendChild(info);
    root.appendChild(_createBtn("&raquo;", _currentPage >= totalPages, next));
  }

  function _renderInput(totalPages: number): void {
    root.appendChild(_createBtn("&laquo;", _currentPage <= 1, prev));

    const inputWrap = document.createElement("div");
    inputWrap.style.display = "inline-flex";
    inputWrap.style.alignItems = "center";
    inputWrap.style.gap = "4px";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(totalPages);
    input.value = String(_currentPage);
    input.setAttribute("aria-label", "Go to page");
    input.style.cssText =
      `width:52px;padding:${sc.btnPadding};border:1px solid #d1d5db;border-radius:6px;` +
      `text-align:center;font-size:${sc.fontSize};color:#374151;`;

    input.addEventListener("change", () => {
      const val = parseInt(input.value, 10);
      if (!isNaN(val)) setPage(val);
      else input.value = String(_currentPage);
    });

    inputWrap.appendChild(input);
    const ofLabel = document.createElement("span");
    ofLabel.textContent = `/ ${totalPages}`;
    ofLabel.style.color = "#9ca3af";
    inputWrap.appendChild(ofLabel);
    root.appendChild(inputWrap);

    root.appendChild(_createBtn("&raquo;", _currentPage >= totalPages, next));
  }

  function _getPageRange(totalPages: number): number[] {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, _currentPage - half + 1);
    let end = start + maxVisiblePages - 1;

    if (end > totalPages) {
      end = totalPages;
      start = end - maxVisiblePages + 1;
    }

    const pages: number[] = [];

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push(-1); // ellipsis
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(-1);
      pages.push(totalPages);
    }

    return pages;
  }

  return { el: root, getCurrentPage, setPage, getPageSize, setPageSize, getTotalPages, first, last, next, prev, setTotal, destroy };
}
