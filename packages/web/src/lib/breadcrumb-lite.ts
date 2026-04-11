/**
 * Lightweight Breadcrumb: Navigation trail with configurable separator, max-item truncation
 * with ellipsis dropdown, icons per item, size variants, and click handlers.
 */

// --- Types ---

export type BreadcrumbSize = "sm" | "md" | "lg";
export type BreadcrumbItemData = {
  label: string;
  href?: string;
  icon?: string | HTMLElement;
  disabled?: boolean;
};

export interface BreadcrumbOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Breadcrumb items */
  items: BreadcrumbItemData[];
  /** Separator (default: "/") */
  separator?: string | HTMLElement;
  /** Max visible items before truncating (0 = no limit) */
  maxItems?: number;
  /** Size variant */
  size?: BreadcrumbSize;
  /** Truncation label (default: "...") */
  truncationLabel?: string;
  /** Callback on item click */
  onClick?: (item: BreadcrumbItemData, index: number) => void;
  /** Custom CSS class */
  className?: string;
}

export interface BreadcrumbInstance {
  element: HTMLElement;
  getItems: () => BreadcrumbItemData[];
  setItems: (items: BreadcrumbItemData[]) => void;
  push: (item: BreadcrumbItemData) => void;
  pop: () => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<BreadcrumbSize, { fontSize: number; height: number; padding: string; iconSize: number }> = {
  sm: { fontSize: 12, height: 24, padding: "0 8px", iconSize: 14 },
  md: { fontSize: 13, height: 28, padding: "0 12px", iconSize: 16 },
  lg: { fontSize: 14, height: 32, padding: "0 16px", iconSize: 18 },
};

// --- Main Factory ---

export function createBreadcrumb(options: BreadcrumbOptions): BreadcrumbInstance {
  const opts = {
    separator: options.separator ?? "/",
    maxItems: options.maxItems ?? 0,
    truncationLabel: options.truncationLabel ?? "\u2026",
    size: options.size ?? "md",
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Breadcrumb: container not found");

  let items = [...options.items];
  let destroyed = false;

  const sz = SIZE_STYLES[opts.size];

  // Root
  const root = document.createElement("nav");
  root.className = `breadcrumb ${opts.className}`;
  root.setAttribute("aria-label", "Breadcrumb");
  root.style.cssText = `
    display:flex;align-items:center;flex-wrap:wrap;gap:4px;
    font-family:-apple-system,sans-serif;font-size:${sz.fontSize}px;color:#6b7280;
    line-height:${sz.height}px;padding:${sz.padding};
  `;
  container.appendChild(root);

  function render(): void {
    root.innerHTML = "";

    let displayItems = [...items];

    // Truncate if needed
    if (opts.maxItems > 0 && displayItems.length > opts.maxItems) {
      const keepFirst = Math.ceil(opts.maxItems / 2);
      const keepLast = opts.maxItems - keepFirst - 1;

      const truncated = [
        ...displayItems.slice(0, keepFirst),
        { label: opts.truncationLabel, href: undefined } as BreadcrumbItemData,
        ...displayItems.slice(-keepLast),
      ];
      displayItems = truncated;
    }

    for (let i = 0; i < displayItems.length; i++) {
      const item = displayItems[i]!;
      const isLast = i === displayItems.length - 1;
      const isTruncated = item.label === opts.truncationLabel && item.href === undefined;

      // Separator
      if (i > 0) {
        const sep = document.createElement("span");
        sep.className = "bc-sep";
        sep.setAttribute("aria-hidden", "true");
        sep.style.cssText = "flex-shrink:0;margin:0 6px;color:#d1d5db;";
        if (typeof opts.separator === "string") {
          sep.textContent = opts.separator;
        } else {
          sep.innerHTML = "";
          sep.appendChild(opts.separator as HTMLElement);
        }
        root.appendChild(sep);
      }

      // Item
      if (isTruncated) {
        const el = document.createElement("span");
        el.className = "bc-item bc-truncate";
        el.textContent = item.label;
        el.style.cssText = `
          cursor:pointer;font-weight:500;color:#374151;
          padding:2px 8px;border-radius:4px;background:#f3f4f6;
          transition:background 0.15s;
        `;
        el.addEventListener("mouseenter", () => { el.style.background = "#e5e7eb"; });
        el.addEventListener("mouseleave", () => { el.style.background = "#f3f4f6"; });
        el.addEventListener("click", () => {
          // Show all items on click
          opts.maxItems = 0;
          render();
        });
        root.appendChild(el);
      } else if (item.href) {
        const link = document.createElement("a");
        link.href = item.href;
        link.className = "bc-item bc-link";
        link.style.cssText = `
          display:inline-flex;align-items:center;gap:4px;text-decoration:none;
          color:${item.disabled ? "#d1d5db" : "#6b7280"};
          transition:color 0.15s;line-height:1;
          ${item.disabled ? "pointer-events:none;" : ""}
        `;

        // Icon
        if (item.icon) {
          const iconEl = createIcon(item.icon, sz.iconSize);
          link.appendChild(iconEl);
        }

        const label = document.createElement("span");
        label.textContent = item.label;
        label.style.cssText = `${!isLast ? "max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" : ""}`;
        link.appendChild(label);

        link.addEventListener("click", (e) => {
          e.preventDefault();
          if (!item.disabled) opts.onClick?.(item, items.indexOf(item));
        });

        link.addEventListener("mouseenter", () => {
          if (!item.disabled) link.style.color = "#4f46e5";
        });
        link.addEventListener("mouseleave", () => {
          link.style.color = "#6b7280";
        });

        root.appendChild(link);
      } else {
        const span = document.createElement("span");
        span.className = "bc-item bc-static";
        span.style.cssText = `
          display:inline-flex;align-items:center;gap:4px;
          color:${item.disabled ? "#d1d5db" : isLast ? "#111827" : "#6b7280"};
          ${item.disabled ? "cursor:not-allowed;" : ""}
          font-weight:${isLast ? "600" : "400"};line-height:1;
        `;

        if (item.icon) {
          const iconEl = createIcon(item.icon, sz.iconSize);
          span.appendChild(iconEl);
        }

        span.textContent = item.label;
        root.appendChild(span);
      }
    }
  }

  function createIcon(icon: string | HTMLElement, size: number): HTMLElement {
    const el = document.createElement("span");
    el.style.cssText = "display:flex;align-items:center;flex-shrink:0;";
    if (typeof icon === "string") {
      el.textContent = icon;
      el.style.fontSize = `${size}px`;
    } else {
      el.appendChild(icon);
    }
    return el;
  }

  render();

  const instance: BreadcrumbInstance = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: BreadcrumbItemData[]) {
      items = newItems;
      render();
    },

    push(item: BreadcrumbItemData) {
      items.push(item);
      render();
    },

    pop() {
      items.pop();
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
