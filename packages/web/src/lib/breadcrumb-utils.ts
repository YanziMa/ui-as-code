/**
 * Breadcrumb Utilities: Navigation breadcrumb trail with ARIA landmarks,
 * truncation, separators, icons, click handlers, and responsive behavior.
 */

// --- Types ---

export interface BreadcrumbItem {
  /** Label text */
  label: string;
  /** URL or path (if clickable) */
  href?: string;
  /** Icon (HTML string) */
  icon?: string;
  /** Click handler (overrides href navigation) */
  onClick?: (item: BreadcrumbItem, index: number) => void;
  /** Whether this is the current page (last item, not a link) */
  current?: boolean;
}

export interface BreadcrumbOptions {
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Separator between items (default: "/") */
  separator?: string | HTMLElement;
  /** Max visible items before truncation (0 = no limit) */
  maxItems?: number;
  /** Truncation label for hidden middle items (default: "...") */
  truncateLabel?: string;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when an item is clicked */
  onItemClick?: (item: BreadcrumbItem, index: number) => void;
  /** Render custom item element */
  renderItem?: (item: BreadcrumbItem, index: number, isLast: boolean) => HTMLElement;
}

export interface BreadcrumbInstance {
  /** The root breadcrumb element */
  el: HTMLElement;
  /** Update items */
  setItems: (items: BreadcrumbItem[]) => void;
  /** Get current items */
  getItems: () => BreadcrumbItem[];
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create a navigation breadcrumb.
 *
 * @example
 * ```ts
 * const bc = createBreadcrumb({
 *   items: [
 *     { label: "Home", href: "/" },
 *     { label: "Products", href: "/products" },
 *     { label: "Detail", current: true },
 *   ],
 * });
 * ```
 */
export function createBreadcrumb(options: BreadcrumbOptions): BreadcrumbInstance {
  const {
    items,
    separator = "/",
    maxItems = 0,
    truncateLabel = "\u2026",
    className,
    container,
    onItemClick,
    renderItem,
  } = options;

  let _items = [...items];

  // Root
  const root = document.createElement("nav");
  root.className = `breadcrumb ${className ?? ""}`.trim();
  root.setAttribute("aria-label", "Breadcrumb");
  root.style.cssText =
    "display:flex;align-items:center;gap:4px;flex-wrap:wrap;font-size:14px;color:#6b7280;";

  // List
  const list = document.createElement("ol");
  list.className = "breadcrumb-list";
  list.style.cssText = "display:flex;align-items:center;list-style:none;margin:0;padding:0;gap:4px;";
  root.appendChild(list);

  // Render
  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function setItems(newItems: BreadcrumbItem[]): void {
    _items = newItems;
    _render();
  }

  function getItems(): BreadcrumbItem[] { return [..._items]; }

  function destroy(): void {
    root.remove();
  }

  // --- Render ---

  function _render(): void {
    list.innerHTML = "";

    if (_items.length === 0) return;

    let displayItems: Array<{ item: BreadcrumbItem; index: number; isLast: boolean }> = [];

    // Truncation logic
    if (maxItems > 0 && _items.length > maxItems) {
      const keepFirst = Math.ceil(maxItems / 2);
      const keepLast = Math.floor(maxItems / 2);

      for (let i = 0; i < keepFirst && i < _items.length; i++) {
        displayItems.push({ item: _items[i]!, index: i, isLast: false });
      }

      // Truncation placeholder
      displayItems.push({
        item: { label: truncateLabel, current: false },
        index: -1,
        isLast: false,
      });

      for (let i = Math.max(keepFirst, _items.length - keepLast); i < _items.length; i++) {
        displayItems.push({ item: _items[i]!, index: i, isLast: i === _items.length - 1 });
      }
    } else {
      displayItems = _items.map((item, i) => ({
        item,
        index: i,
        isLast: i === _items.length - 1,
      }));
    }

    displayItems.forEach(({ item, index, isLast }, pos) => {
      const li = document.createElement("li");
      li.style.cssText = "display:flex;align-items:center;";

      // Separator (before all except first)
      if (pos > 0) {
        const sepEl = typeof separator === "string"
          ? document.createElement("span")
          : (separator.cloneNode(true) as HTMLElement);

        if (typeof separator === "string") {
          sepEl.textContent = separator;
          sepEl.className = "breadcrumb-separator";
          sepEl.style.cssText =
            "margin:0 4px;color:#9ca3af;user-select:none;font-size:12px;";
        } else {
          sepEl.style.marginLeft = "4px";
          sepEl.style.marginRight = "4px";
        }
        li.appendChild(sepEl);
      }

      // Item
      let itemEl: HTMLElement;

      if (index === -1) {
        // Truncation placeholder
        itemEl = document.createElement("span");
        itemEl.className = "breadcrumb-truncate";
        itemEl.textContent = item.label;
        itemEl.style.cssText =
          "color:#9ca3af;cursor:default;font-style:italic;padding:2px 8px;" +
          "font-size:13px;border-radius:4px;" +
          "background:#f9fafb;border:1px solid #e5e7eb;";
      } else if (isLast || item.current) {
        // Current page (not a link)
        itemEl = document.createElement("span");
        itemEl.className = "breadcrumb-current";
        itemEl.setAttribute("aria-current", "page");
        itemEl.style.cssText =
          "color:#111827;font-weight:500;cursor:default;padding:2px 4px;";
        if (item.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.innerHTML = item.icon;
          iconSpan.style.marginRight = "4px";
          itemEl.appendChild(iconSpan);
        }
        const labelSpan = document.createElement("span");
        labelSpan.textContent = item.label;
        itemEl.appendChild(labelSpan);
      } else {
        // Clickable link
        itemEl = document.createElement(item.href ? "a" : "button");
        itemEl.className = "breadcrumb-link";
        if (item.href) {
          (itemEl as HTMLAnchorElement).href = item.href;
        }
        if (!item.href) {
          (itemEl as HTMLButtonElement).type = "button";
        }
        itemEl.setAttribute("aria-current", "false");
        itemEl.style.cssText =
          "display:inline-flex;align-items:center;color:#3b82f6;text-decoration:none;" +
          "cursor:pointer;padding:2px 4px;border:none;background:none;" +
          "font-size:inherit;font-family:inherit;border-radius:4px;" +
          "transition:background 0.12s,color 0.12s;";

        if (item.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.innerHTML = item.icon;
          iconSpan.style.marginRight = "4px";
          itemEl.appendChild(iconSpan);
        }
        const labelSpan = document.createElement("span");
        labelSpan.textContent = item.label;
        itemEl.appendChild(labelSpan);

        // Hover effect
        itemEl.addEventListener("mouseenter", () => {
          itemEl.style.color = "#2563eb";
          itemEl.style.background = "#eff6ff";
        });
        itemEl.addEventListener("mouseleave", () => {
          itemEl.style.color = "#3b82f6";
          itemEl.style.background = "";
        });

        // Click handler
        itemEl.addEventListener("click", (e) => {
          e.preventDefault();
          item.onClick?.(item, index);
          onItemClick?.(item, index);
        });

        // Keyboard support
        itemEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            item.onClick?.(item, index);
            onItemClick?.(item, index);
          }
        });
      }

      // Custom renderer
      if (renderItem && index >= 0) {
        const customEl = renderItem(item, index, isLast);
        li.innerHTML = "";
        // Keep separator if present
        if (pos > 0 && li.firstChild) {
          li.innerHTML = "";
          const sepEl = typeof separator === "string"
            ? (() => { const s = document.createElement("span"); s.textContent = separator; s.style.margin = "0 4px"; return s; })()
            : (separator.cloneNode(true) as HTMLElement);
          li.appendChild(sepEl);
        }
        li.appendChild(customEl);
      } else {
        li.appendChild(itemEl);
      }

      list.appendChild(li);
    });
  }

  return { el: root, setItems, getItems, destroy };
}
