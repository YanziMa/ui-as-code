/**
 * Breadcrumb Navigation: Clickable breadcrumb trail with configurable separators,
 * max-item truncation with ellipsis, icons per item, dropdown for hidden items,
 * and accessibility support.
 */

// --- Types ---

export interface BreadcrumbItem {
  /** Label text */
  label: string;
  /** Href link (null = current page, not clickable) */
  href?: string | null;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Title attribute for long labels */
  title?: string;
  /** Custom data */
  data?: unknown;
}

export interface BreadcrumbOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Separator between items (default: "/") */
  separator?: string;
  /** Max visible items before truncation (0 = no limit) */
  maxItems?: number;
  /** Separator as custom HTML */
  separatorHtml?: string;
  /** Show icons? */
  showIcons?: boolean;
  /** Callback on item click */
  onItemClick?: (item: BreadcrumbItem, index: number) => void;
  /** Custom CSS class */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

export interface BreadcrumbInstance {
  element: HTMLElement;
  getItems: () => BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
  addItem: (item: BreadcrumbItem) => void;
  removeItem: (index: number) => void;
  destroy: () => void;
}

// --- Main Class ---

export class BreadcrumbManager {
  create(options: BreadcrumbOptions): BreadcrumbInstance {
    const opts = {
      separator: options.separator ?? "/",
      maxItems: options.maxItems ?? 0,
      showIcons: options.showIcons ?? true,
      size: options.size ?? "md",
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Breadcrumb: container element not found");

    container.className = `breadcrumb breadcrumb-${opts.size} ${opts.className ?? ""}`;

    const sizeStyles: Record<string, string> = {
      sm: "font-size:12px;gap:4px;",
      md: "font-size:13px;gap:6px;",
      lg: "font-size:14px;gap:8px;",
    };

    container.style.cssText = `
      display:flex;align-items:center;flex-wrap:wrap;${sizeStyles[opts.size]}
      color:#6b7280;line-height:1.4;
    `;

    let items = [...options.items];
    let destroyed = false;

    function render(): void {
      container.innerHTML = "";

      const maxVisible = opts.maxItems > 0 ? opts.maxItems : items.length;
      const needsTruncation = opts.maxItems > 0 && items.length > maxVisible;

      let startIdx = 0;
      let endIdx = items.length;

      if (needsTruncation) {
        // Always show first and last items
        startIdx = 1;
        endIdx = items.length - 1;
      }

      // First item (always shown)
      if (items.length > 0) {
        renderItem(items[0]!, 0, false);
      }

      // Ellipsis / dropdown for middle items
      if (needsTruncation && items.length > 2) {
        renderSeparator();
        const ellipsis = document.createElement("button");
        ellipsis.type = "button";
        ellipsis.className = "breadcrumb-ellipsis";
        ellipsis.style.cssText = `
          background:none;border:none;color:#9ca3af;cursor:pointer;
          padding:0 4px;font-size:inherit;font-family:inherit;
          display:flex;align-items:center;gap:2px;
        `;
        ellipsis.innerHTML = `\u2026 <span style="font-size:10px;">(${endIdx - startIdx})</span>`;
        ellipsis.title = "Show all items";

        // Dropdown on hover/click
        const dropdown = document.createElement("div");
        dropdown.className = "breadcrumb-dropdown";
        dropdown.style.cssText = `
          position:absolute;display:none;background:#fff;border:1px solid #e5e7eb;
          border-radius:6px;box-shadow:0 8px 24px rgba(0,0,0,0.12);
          padding:4px 0;min-width:160px;z-index:100;
        `;

        for (let i = startIdx; i < endIdx; i++) {
          const dropItem = document.createElement("button");
          dropItem.type = "button";
          dropItem.style.cssText = `
            display:flex;align-items:center;gap:6px;width:100%;
            padding:6px 12px;border:none;background:none;cursor:pointer;
            font-size:13px;color:#374151;text-align:left;
          `;
          dropItem.textContent = items[i]!.label;
          dropItem.addEventListener("click", (e) => {
            e.stopPropagation();
            opts.onItemClick?.(items[i]!, i);
            dropdown.style.display = "none";
          });
          dropItem.addEventListener("mouseenter", () => { dropItem.style.background = "#f5f3ff"; });
          dropItem.addEventListener("mouseleave", () => { dropItem.style.background = ""; });
          dropdown.appendChild(dropItem);
        }

        // Position dropdown relative to ellipsis
        ellipsis.addEventListener("click", (e) => {
          e.stopPropagation();
          const rect = ellipsis.getBoundingClientRect();
          dropdown.style.left = `${rect.left}px`;
          dropdown.style.top = `${rect.bottom + 4}px`;
          dropdown.style.display = "block";
        });

        document.body.appendChild(dropdown);
        document.addEventListener("mousedown", () => { dropdown.style.display = "none"; }, { once: true });

        container.appendChild(ellipsis);
      }

      // Middle items (if no truncation)
      if (!needsTruncation) {
        for (let i = 1; i < items.length - 1; i++) {
          renderSeparator();
          renderItem(items[i]!, i, false);
        }
      }

      // Last item (always shown, unless it's also the first)
      if (items.length > 1) {
        renderSeparator();
        renderItem(items[items.length - 1]!, items.length - 1, true); // last = current
      }
    }

    function renderItem(item: BreadcrumbItem, index: number, isLast: boolean): void {
      const isCurrent = isLast || item.href === null;

      if (isCurrent) {
        const span = document.createElement("span");
        span.className = "breadcrumb-item breadcrumb-current";
        span.setAttribute("aria-current", "page");
        span.style.cssText = `
          color:#111827;font-weight:500;max-width:200px;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
          display:inline-flex;align-items:center;gap:4px;
        `;

        if (opts.showIcons && item.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.style.cssText = "flex-shrink:0;font-size:14px;";
          iconSpan.textContent = item.icon;
          span.appendChild(iconSpan);
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = item.label;
        labelSpan.title = item.title ?? item.label;
        span.appendChild(labelSpan);

        container.appendChild(span);
      } else {
        const link = document.createElement("a");
        link.className = "breadcrumb-item breadcrumb-link";
        link.href = item.href ?? "#";
        link.style.cssText = `
          color:#6366f1;text-decoration:none;max-width:180px;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
          display:inline-flex;align-items:center;gap:4px;
          transition:color 0.15s;
        `;

        if (opts.showIcons && item.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.style.cssText = "flex-shrink:0;font-size:14px;";
          iconSpan.textContent = item.icon;
          link.appendChild(iconSpan);
        }

        const labelSpan = document.createElement("span");
        labelSpan.textContent = item.label;
        labelSpan.title = item.title ?? item.label;
        link.appendChild(labelSpan);

        link.addEventListener("click", (e) => {
          e.preventDefault();
          opts.onItemClick?.(item, index);
        });

        link.addEventListener("mouseenter", () => { link.style.color = "#4338ca"; });
        link.addEventListener("mouseleave", () => { link.style.color = ""; });

        container.appendChild(link);
      }
    }

    function renderSeparator(): void {
      const sep = document.createElement("span");
      sep.className = "breadcrumb-separator";
      sep.setAttribute("aria-hidden", "true");
      sep.style.cssText = "color:#d1d5db;user-select:none;flex-shrink:0;";

      if (opts.separatorHtml) {
        sep.innerHTML = opts.separatorHtml;
      } else {
        sep.textContent = ` ${opts.separator} `;
      }

      container.appendChild(sep);
    }

    // Initial render
    render();

    const instance: BreadcrumbInstance = {
      element: container,

      getItems() { return [...items]; },

      setItems(newItems: BreadcrumbItem[]) {
        items = [...newItems];
        render();
      },

      addItem(item: BreadcrumbItem) {
        items.push(item);
        render();
      },

      removeItem(index: number) {
        if (index >= 0 && index < items.length) {
          items.splice(index, 1);
          render();
        }
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
      },
    };

    return instance;
  }
}

/** Convenience: create a breadcrumb */
export function createBreadcrumb(options: BreadcrumbOptions): BreadcrumbInstance {
  return new BreadcrumbManager().create(options);
}
