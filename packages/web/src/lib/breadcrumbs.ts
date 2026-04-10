/**
 * Breadcrumb Navigation: Hierarchical path navigation with customizable separators,
 * icons per item, max-items truncation with overflow indicator, click handlers,
 * current page highlighting, accessibility (ARIA navigation), and responsive design.
 */

// --- Types ---

export interface BreadcrumbItem {
  /** Label text */
  label: string;
  /** URL or href */
  href?: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Click handler (overrides href) */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Tooltip text */
  tooltip?: string;
}

export type BreadcrumbSeparator = "chevron" | "slash" | "arrow" | "bullet" | "dot" | string;

export interface BreadcrumbOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Breadcrumb items (ordered root → leaf) */
  items: BreadcrumbItem[];
  /** Separator style */
  separator?: BreadcrumbSeparator;
  /** Max visible items before truncation (0 = no limit) */
  maxItems?: number;
  /** Overflow label text (e.g., "...") */
  overflowLabel?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show icon for each item */
  showIcons?: boolean;
  /** Callback on item click */
  onItemClick?: (item: BreadcrumbItem, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface BreadcrumbInstance {
  element: HTMLElement;
  getItems: () => BreadcrumbItem[];
  setItems: (items: BreadcrumbItem[]) => void;
  addItem: (item: BreadcrumbItem) => void;
  removeItem: (index: number) => void;
  destroy: () => void;
}

// --- Separator Rendering ---

const SEPARATOR_MAP: Record<string, string> = {
  chevron: "\u203A",
  slash: "/",
  arrow: "\u2192",
  bullet: "\u2022",
  dot: "\u00B7",
};

function renderSeparator(sep: BreadcrumbSeparator, size: "sm" | "md" | "lg"): HTMLSpanElement {
  const el = document.createElement("span");
  el.className = "bc-separator";
  el.setAttribute("aria-hidden", "true");

  const fontSizeMap: Record<string, string> = { sm: "10px", md: "12px", lg: "14px" };
  const sepStr = typeof sep === "string" ? sep : SEPARATOR_MAP[sep] ?? SEPARATOR_MAP.chevron;

  el.style.cssText = `
    color:#9ca3af;font-size:${fontSizeMap[size]};flex-shrink:0;
    user-select:none;margin:0 4px;display:inline-flex;align-items:center;
  `;
  el.textContent = sepStr;
  return el;
}

// --- Main Factory ---

export function createBreadcrumbs(options: BreadcrumbOptions): BreadcrumbInstance {
  const opts = {
    separator: options.separator ?? "chevron",
    maxItems: options.maxItems ?? 0,
    overflowLabel: options.overflowLabel || "\u2026",
    size: options.size ?? "md",
    showIcons: options.showIcons ?? false,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Breadcrumbs: container not found");

  let items = [...options.items];
  let destroyed = false;

  const fontSizeMap: Record<string, number> = { sm: 12, md: 13, lg: 14 };
  const iconSizeMap: Record<string, number> = { sm: 13, md: 15, lg: 17 };

  function render(): void {
    container.innerHTML = "";
    container.className = `breadcrumbs ${opts.className}`;
    container.style.cssText = `
      display:flex;align-items:center;flex-wrap:wrap;font-size:${fontSizeMap[opts.size]}px;
      font-family:-apple-system,sans-serif;color:#6b7280;line-height:1;
    `;
    container.setAttribute("role", "navigation");
    container.setAttribute("aria-label", "Breadcrumb");

    // Determine visible items (with truncation)
    let visibleItems: Array<{ item: BreadcrumbItem; index: number }>;
    let overflowIndex = -1;

    if (opts.maxItems > 0 && items.length > opts.maxItems) {
      // Show first item + overflow + last (maxItems-1) items
      const keepLast = Math.max(1, opts.maxItems - 2);
      visibleItems = items.slice(0, 1).map((item, i) => ({ item, index: i }));
      overflowIndex = 1;
      for (let i = items.length - keepLast; i < items.length; i++) {
        visibleItems.push({ item: items[i]!, index: i });
      }
    } else {
      visibleItems = items.map((item, i) => ({ item, index: i }));
    }

    for (let i = 0; i < visibleItems.length; i++) {
      const { item, index } = visibleItems[i]!;

      // Add separator (not before first item)
      if (i > 0) {
        container.appendChild(renderSeparator(opts.separator, opts.size));
      }

      // Overflow indicator
      if (index === overflowIndex) {
        const overflowEl = document.createElement("span");
        overflowEl.className = "bc-overflow";
        overflowEl.textContent = opts.overflowLabel;
        overflowEl.style.cssText = `
          cursor:pointer;color:#9ca3af;padding:2px 4px;border-radius:4px;
          transition:color 0.15s;background:transparent;
          font-size:${fontSizeMap[opts.size]}px;
        `;
        overflowEl.addEventListener("mouseenter", () => { overflowEl.style.color = "#374151"; });
        overflowEl.addEventListener("mouseleave", () => { overflowEl.style.color = "#9ca3af"; });

        // Tooltip: show all hidden items on hover
        const hiddenItems = items.slice(1, items.length - Math.max(1, opts.maxItems - 2));
        if (hiddenItems.length > 0) {
          overflowEl.title = hiddenItems.map((it) => it.label).join(" > ");
        }
        container.appendChild(overflowEl);

        // Add separator after overflow
        container.appendChild(renderSeparator(opts.separator, opts.size));
        continue;
      }

      // Item element
      const isLast = index === items.length - 1;
      const itemEl = document.createElement(item.href && !isLast ? "a" : "span");
      itemEl.className = `bc-item ${isLast ? "bc-current" : ""}`;

      if (itemEl.tagName === "A") {
        (itemEl as HTMLAnchorElement).href = item.href!;
      }

      itemEl.style.cssText = `
        display:inline-flex;align-items:center;gap:3px;color:${isLast ? "#111827" : "#6b7280"};
        text-decoration:none;cursor:${item.disabled ? "not-allowed" : isLast ? "default" : "pointer"};
        transition:color 0.15s;white-space:nowrap;
        ${item.disabled ? "opacity:0.5;" : ""}
        padding:2px 4px;border-radius:4px;
      `;
      itemEl.setAttribute("aria-current", String(isLast));

      if (item.tooltip) itemEl.title = item.tooltip;

      // Icon
      if ((item.icon || opts.showIcons) && !isLast) {
        const iconEl = document.createElement("span");
        iconEl.textContent = item.icon ?? "";
        iconEl.style.cssText = `font-size:${iconSizeMap[opts.size]}px;flex-shrink:0;display:flex;align-items:center;`;
        itemEl.appendChild(iconEl);
      }

      // Label
      const labelEl = document.createElement("span");
      labelEl.className = "bc-label";
      labelEl.textContent = item.label;
      labelEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;max-width:200px;";
      itemEl.appendChild(labelEl);

      // Events
      if (!item.disabled && !isLast) {
        itemEl.addEventListener("click", (e) => {
          e.preventDefault();
          if (item.onClick) {
            item.onClick();
          }
          opts.onItemClick?.(item, index);
        });
        itemEl.addEventListener("mouseenter", () => {
          itemEl.style.color = "#4338ca";
          itemEl.style.background = "#eef2ff";
        });
        itemEl.addEventListener("mouseleave", () => {
          itemEl.style.color = "#6b7280";
          itemEl.style.background = "transparent";
        });
      }

      container.appendChild(itemEl);
    }
  }

  // Initial render
  render();

  const instance: BreadcrumbInstance = {
    element: container,

    getItems() { return [...items]; },

    setItems(newItems: BreadcrumbItem[]) {
      items = newItems;
      render();
    },

    addItem(newItem: BreadcrumbItem) {
      items.push(newItem);
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
