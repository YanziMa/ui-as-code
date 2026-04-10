/**
 * Breadcrumb Navigation: Hierarchical navigation trail with dropdown support,
 * icons, custom separators, responsive truncation, accessibility (ARIA),
 * max width with ellipsis, and click handlers.
 */

// --- Types ---

export interface BreadcrumbItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Icon (emoji or HTML string) */
  icon?: string;
  /** URL to navigate to on click */
  href?: string;
  /** Dropdown items (for nested menus) */
  children?: BreadcrumbItem[];
  /** Disabled state? */
  disabled?: boolean;
  /** Custom data */
  data?: Record<string, unknown>;
  /** Badge/count text */
  badge?: string | number;
}

export interface BreadcrumbOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Breadcrumb items */
  items: BreadcrumbItem[];
  /** Separator between items (default: "/") */
  separator?: string;
  /** Max width before truncation (px) (default: 100%) */
  maxWidth?: string | number;
  /** Show icons? */
  showIcons?: boolean;
  /** Show root/home item? */
  showRoot?: boolean;
  /** Root item config */
  rootItem?: BreadcrumbItem;
  /** Click callback */
  onClick?: (item: BreadcrumbItem, event: Event) => void;
  /** Responsive: collapse to icon-only below breakpoint */
  collapseBelow?: number;
  /** Custom CSS class */
  className?: string;
}

export interface BreadcrumbInstance {
  element: HTMLElement;
  getItems: () => BreadcrumbItem[];
  setItems: (items: Breadcrumb[]) => void;
  setCurrent: (key: string) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createBreadcrumb(options: BreadcrumbOptions): BreadcrumbInstance {
  const opts = {
    separator: options.separator ?? "/",
    maxWidth: options.maxWidth ?? "100%",
    showIcons: options.showIcons ?? true,
    showRoot: options.showRoot ?? true,
    collapseBelow: options.collapseBelow ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Breadcrumb: container not found");

  let items: BreadcrumbItem[] = [...options.items];
  let destroyed = false;

  container.className = `breadcrumb ${opts.className}`;
  container.style.cssText = `
    display:flex;align-items:center;gap:4px;font-family:-apple-system,sans-serif;
    font-size:13px;color:#6b7280;flex-wrap:wrap;max-width:${typeof opts.maxWidth === "number" ? opts.maxWidth + "px" : opts.maxWidth};
    overflow:hidden;padding:4px 0;
  `;

  // Resize observer for responsive collapsing
  let resizeObserver: ResizeObserver | null = null;
  if (opts.collapseBelow > 0) {
    resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const collapsed = w < opts.collapseBelow;
      container.setAttribute("data-collapsed", String(collapsed));
      render();
    });
    resizeObserver.observe(container);
  }

  function render(): void {
    // Save active dropdown state before re-render
    const openDropdowns = container.querySelectorAll(".bc-dropdown[aria-expanded='true']");

    container.innerHTML = "";

    // Root item
    if (opts.showRoot && opts.rootItem) {
      const rootEl = createCrumbItem(opts.rootItem, 0, true);
      container.appendChild(rootEl);
    }

    // Regular items
    for (let i = 0; i < items.length; i++) {
      // Separator
      const sep = document.createElement("span");
      sep.className = "bc-sep";
      sep.innerHTML = opts.separator;
      sep.style.cssText = `color:#d1d5db;user-select:none;margin:0 2px;flex-shrink:0;`;
      container.appendChild(sep);

      const itemEl = createCrumbItem(items[i], i + 1, false);
      container.appendChild(itemEl);
    }

    // Restore open dropdowns
    for (const dd of openDropdowns) {
      const key = dd.dataset.itemKey;
      const restored = container.querySelector(`[data-item-key="${key}"] .bc-dropdown`);
      if (restored) {
        restored.setAttribute("aria-expanded", "true");
        restored.style.display = "";
      }
    }
  }

  function createCrumbItem(item: BreadcrumbItem index: number, isRoot: boolean): HTMLElement {
    const wrapper = document.createElement("nav");
    wrapper.dataset.itemKey = item.key;
    wrapper.setAttribute("role", "listitem");

    const isCollapsed = container.getAttribute("data-collapsed") === "true";

    // Link/button
    const el = document.createElement(item.href ? "a" : "button");
    el.type = "button";
    if (item.href) (el as HTMLAnchorElement).href = item.href;
    el.className = "bc-item";
    el.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;color:#6366f1;text-decoration:none;
      background:none;border:none;cursor:pointer;padding:3px 8px;border-radius:6px;
      font-size:13px;font-weight:500;transition:all 0.15s;line-height:1;
      white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis;
      ${item.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
    `;

    // Icon
    if (opts.showIcons && item.icon && !isCollapsed) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = item.icon;
      iconSpan.style.cssText = "font-size:14px;flex-shrink:0;display:flex;";
      el.insertBefore(iconSpan, el.firstChild);
    }

    // Label
    const labelSpan = document.createElement("span");
    labelSpan.textContent = item.label;
    labelSpan.style.cssText = `${isCollapsed ? "" : ""}`;
    el.appendChild(labelSpan);

    // Badge
    if (item.badge !== undefined && !isCollapsed) {
      const badge = document.createElement("span");
      badge.textContent = String(item.badge);
      badge.style.cssText = `
        background:#ef4444;color:#fff;font-size:10px;font-weight:600;
        padding:1px 7px;border-radius:10px;margin-left:4px;flex-shrink:0;
      `;
      el.appendChild(badge);
    }

    // Click handler
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (item.disabled) return;
      opts.onClick?.(item, e);
      if (item.href) window.location.href = item.href;
    });

    el.addEventListener("mouseenter", () => { if (!item.disabled) el.style.background = "#eef2ff"; });
    el.addEventListener("mouseleave", () => { el.style.background = ""; });

    wrapper.appendChild(el);

    // Dropdown for nested items
    if (item.children && item.children.length > 0) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.innerHTML = "&#9660;";
      toggle.style.cssText = `
        background:none;border:none;cursor:pointer;font-size:10px;color:#9ca3af;
        padding:0 2px;margin-left:2px;flex-shrink:0;
      `;
      wrapper.appendChild(toggle);

      const dropdown = document.createElement("div");
      dropdown.className = "bc-dropdown";
      dropdown.dataset.itemKey = item.key;
      dropdown.setAttribute("aria-expanded", "false");
      dropdown.style.cssText = `
        display:none;position:absolute;left:0;top:100%;margin-top:4px;
        min-width:160px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;
        box-shadow:0 4px 16px rgba(0,0,0,0.12);z-index:100;
        padding:4px 0;
      `;

      for (const child of item.children) {
        const childEl = createCrumbChild(child);
        dropdown.appendChild(childEl);
      }

      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = dropdown.getAttribute("aria-expanded") === "true";
        dropdown.setAttribute("aria-expanded", String(!isOpen));
        dropdown.style.display = isOpen ? "" : "none";
      });

      // Close on outside click
      const closeOnOutside = (ev: Event) => {
        if (!wrapper.contains(ev.target as Node)) {
          dropdown.setAttribute("aria-expanded", "false");
          dropdown.style.display = "none";
        }
      };
      document.addEventListener("click", closeOnOutside);

      wrapper.appendChild(dropdown);
    }

    return wrapper;
  }

  function createCrumbChild(item: BreadcrumbItem): HTMLElement {
    const child = document.createElement("a");
    child.href = item.href ?? "#";
    child.textContent = item.label;
    child.style.cssText = `
      display:block;padding:6px 12px;color:#374151;text-decoration:none;border-radius:4px;
      font-size:13px;transition:background 0.15s;
    `;
    child.addEventListener("click", (e) => { e.stopPropagation(); opts.onClick?.(item, e); });
    child.addEventListener("mouseenter", () => { child.style.background = "#f3f4f6"; });
    child.addEventListener("mouseleave", () => { child.style.background = ""; });
    return child;
  }

  // Initial render
  render();

  const instance: BreadcrumbInstance = {
    element: container,

    getItems() { return [...items]; },

    setItems(newItems: Breadcrumb[]) {
      items = newItems;
      render();
    },

    setCurrent(key: string) {
      const idx = items.findIndex((i) => i.key === key);
      if (idx >= 0) {
        opts.onClick?.(items[idx]!, new Event("navigate"));
      }
    },

    destroy() {
      destroyed = true;
      resizeObserver?.disconnect();
      container.innerHTML = "";
      container.style.cssText = "";
    },
  };

  return instance;
}
