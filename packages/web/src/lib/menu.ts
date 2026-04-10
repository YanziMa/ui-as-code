/**
 * Navigation Menu: Horizontal/vertical navigation menu with submenus,
 * active state, icons, badges, keyboard navigation, responsive collapse,
 * scrollable overflow, and accessibility.
 */

// --- Types ---

export type MenuMode = "horizontal" | "vertical";
export type MenuVariant = "default" | "bordered" | "pill" | "text";

export interface MenuItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Navigation href */
  href?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Active/selected state */
  active?: boolean;
  /** Badge text/count */
  badge?: string | number;
  /** Badge color variant */
  badgeColor?: "default" | "primary" | "success" | "warning" | "error";
  /** Submenu items */
  children?: MenuItem[];
  /** Target for links (_blank etc.) */
  target?: string;
  /** Custom data */
  data?: unknown;
}

export interface MenuOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Menu items (flat for horizontal, can have children for vertical) */
  items: MenuItem[];
  /** Mode: horizontal or vertical */
  mode?: MenuMode;
  /** Visual variant */
  variant?: MenuVariant;
  /** Currently active key */
  defaultActiveKey?: string;
  /** Callback on item click */
  onSelect?: (item: MenuItem) => void;
  /** Callback before select (return false to prevent) */
  beforeSelect?: (item: MenuItem) => boolean | void;
  /** Show icons? */
  showIcons?: boolean;
  /** Show badges? */
  showBadges?: true;
  /** Collapsed state (for vertical mode) */
  collapsed?: boolean;
  /** Max height with scroll (for vertical, px) */
  maxHeight?: number;
  /** Submenu expand mode: 'click' or 'hover' (default: click) */
  submenuTrigger?: "click" | "hover";
  /** Custom CSS class */
  className?: string;
  /** Inline style override */
  style?: string;
}

export interface MenuInstance {
  element: HTMLElement;
  /** Get current active key */
  getActiveKey: () => string;
  /** Set active key programmatically */
  setActiveKey: (key: string) => void;
  /** Get all items */
  getItems: () => MenuItem[];
  /** Update items dynamically */
  setItems: (items: MenuItem[]) => void;
  /** Update a single item */
  updateItem: (key: string, updates: Partial<MenuItem>) => void;
  /** Collapse/expand (vertical mode) */
  setCollapsed: (collapsed: boolean) => void;
  /** Destroy cleanup */
  destroy: () => void;
}

// --- Badge Colors ---

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  default:  { bg: "#f3f4f6", color: "#6b7280" },
  primary:  { bg: "#eef2ff", color: "#4338ca" },
  success:  { bg: "#f0fdf4", color: "#16a34a" },
  warning:  { bg: "#fffbeb", color: "#d97706" },
  error:    { bg: "#fef2f2", color: "#dc2626" },
};

// --- Main ---

export function createMenu(options: MenuOptions): MenuInstance {
  const opts = {
    mode: options.mode ?? "horizontal",
    variant: options.variant ?? "default",
    showIcons: options.showIcons ?? true,
    showBadges: options.showBadges ?? true,
    collapsed: options.collapsed ?? false,
    submenuTrigger: options.submenuTrigger ?? "click",
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Menu: container not found");

  let items = [...options.items];
  let activeKey = opts.defaultActiveKey ?? (items[0]?.key ?? "");
  let expandedKeys = new Set<string>();
  let destroyed = false;

  // Root element
  const root = document.createElement("nav");
  root.className = `nav-menu nav-${opts.mode} nav-${opts.variant} ${opts.className}`;
  root.setAttribute("role", opts.mode === "vertical" ? "menubar" : "menubar");
  root.style.cssText = buildRootStyle();

  function buildRootStyle(): string {
    const base = `
      font-family:-apple-system,sans-serif;font-size:14px;color:#374151;
      ${opts.style ?? ""}
    `;

    if (opts.mode === "horizontal") {
      return `${base}display:flex;align-items:center;gap:2px;padding:0 8px;`;
    } else {
      return `${base}display:flex;flex-direction:column;gap:1px;padding:4px;${opts.maxHeight ? `max-height:${opts.maxHeight}px;overflow-y:auto;overflow-x:hidden;` : ""}`;
    }
  }

  function render(): void {
    if (destroyed) return;
    root.innerHTML = "";

    if (opts.mode === "horizontal") {
      renderHorizontal();
    } else {
      renderVertical();
    }
  }

  function renderHorizontal(): void {
    for (const item of items) {
      if (item.children?.length) {
        // Has submenu - render as dropdown trigger
        const wrapper = document.createElement("div");
        wrapper.className = "nav-item-wrapper";
        wrapper.style.cssText = "position:relative;";
        wrapper.appendChild(createItemEl(item, 0));

        // Submenu panel
        const subPanel = document.createElement("div");
        subPanel.className = "nav-submenu";
        subPanel.setAttribute("role", "menu");
        subPanel.style.cssText = `
          position:absolute;top:100%;left:0;min-width:200px;display:none;
          background:#fff;border:1px solid #e5e7eb;border-radius:8px;
          box-shadow:0 10px 30px rgba(0,0,0,0.12);padding:4px;z-index:100;
        `;

        for (const child of item.children) {
          const childEl = createItemEl(child!, 1);
          childEl.style.borderRadius = "4px";
          subPanel.appendChild(childEl);
        }

        wrapper.appendChild(subPanel);

        // Hover/click to show
        const showSub = () => { subPanel.style.display = "block"; };
        const hideSub = () => { subPanel.style.display = "none"; };

        if (opts.submenuTrigger === "hover") {
          wrapper.addEventListener("mouseenter", showSub);
          wrapper.addEventListener("mouseleave", hideSub);
        } else {
          wrapper.addEventListener("click", () => {
            if (subPanel.style.display === "block") hideSub();
            else showSub();
          });
        }

        root.appendChild(wrapper);
      } else {
        root.appendChild(createItemEl(item, 0));
      }
    }
  }

  function renderVertical(): void {
    for (const item of items) {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedKeys.has(item.key);

      const row = document.createElement("div");
      row.className = "nav-row";

      const itemEl = createItemEl(item, 0);

      if (hasChildren) {
        // Expand arrow
        const arrow = document.createElement("span");
        arrow.className = "nav-arrow";
        arrow.innerHTML = "&#9654;";
        arrow.style.cssText = `
          font-size:9px;margin-left:auto;transition:transform 0.2s ease;
          flex-shrink:0;color:#9ca3af;
          transform:rotate(${isExpanded ? "90deg" : "0"});
        `;
        itemEl.appendChild(arrow);

        // Click to toggle
        itemEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (isExpanded) expandedKeys.delete(item.key);
          else expandedKeys.add(item.key);
          render();
        });
      }

      row.appendChild(itemEl);

      // Children
      if (hasChildren) {
        const childContainer = document.createElement("div");
        childContainer.className = "nav-children";
        childContainer.style.cssText = `
          display:${isExpanded || !opts.collapsed ? "block" : "none"};
          padding-left:16px;${isExpanded ? "" : "overflow:hidden;"}
        `;

        for (const child of item.children!) {
          const childEl = createItemEl(child!, 1);
          childEl.style.paddingLeft = "12px";
          childContainer.appendChild(childEl);
        }

        row.appendChild(childContainer);
      }

      root.appendChild(row);
    }
  }

  function createItemEl(item: MenuItem, depth: number): HTMLElement {
    const isActive = item.key === activeKey;
    const isHorizontal = opts.mode === "horizontal";

    const el = document.createElement(item.href ? "a" : "button");
    el.className = `nav-item ${isActive ? "nav-active" : ""}`;
    el.dataset.key = item.key;

    if (item.href) {
      (el as HTMLAnchorElement).href = item.href;
      if (item.target) (el as HTMLAnchorElement).target = item.target;
    } else {
      (el as HTMLButtonElement).type = "button";
    }

    el.setAttribute("role", "menuitem");
    if (item.disabled) el.setAttribute("aria-disabled", "true");

    // Style based on variant
    switch (opts.variant) {
      case "pill":
        el.style.cssText = `
          display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;
          font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;
          cursor:${item.disabled ? "not-allowed" : "pointer"};
          transition:all 0.15s;border:none;background:none;font-family:inherit;
          ${isActive ? "background:#4f46e5;color:#fff;" : "color:#374151;"}
          ${item.disabled ? "opacity:0.45;" : ""}
        `;
        break;
      case "text":
        el.style.cssText = `
          display:inline-flex;align-items:center;gap:4px;padding:6px 10px;
          font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;
          cursor:${item.disabled ? "not-allowed" : "pointer"};border:none;background:none;
          font-family:inherit;transition:color 0.15s;
          color:${isActive ? "#4f46e5" : "#374151"};
          border-bottom:2px solid ${isActive ? "#4f46e5" : "transparent"};
          ${item.disabled ? "opacity:0.45;" : ""}
        `;
        break;
      case "bordered":
        el.style.cssText = `
          display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
          font-size:13px;font-weight:500;text-decoration:none;white-space:nowrap;
          cursor:${item.disabled ? "not-allowed" : "pointer"};border:none;background:none;
          font-family:inherit;transition:all 0.15s;border-radius:4px;
          color:${isActive ? "#4f46e5" : "#374151"};
          border-bottom:2px solid ${isActive ? "#4f46e5" : "transparent"};
          ${item.disabled ? "opacity:0.45;" : ""}
        `;
        break;
      default:
        el.style.cssText = `
          display:flex;align-items:center;gap:6px;padding:${isHorizontal ? "8px 14px" : "8px 12px"};
          font-size:13px;font-weight:${isActive ? "600" : "400"};
          text-decoration:none;white-space:nowrap;cursor:${item.disabled ? "not-allowed" : "pointer"};
          transition:background 0.15s,color 0.15s;border-radius:${isHorizontal ? "6px" : "4px"};
          border:none;background:none;font-family:inherit;
          color:${isActive ? "#4f46e5" : "#374151"};
          ${isActive && isHorizontal ? "background:#eef2ff;" : ""}
          ${item.disabled ? "opacity:0.45;" : ""}
        `;
    }

    // Icon
    if (opts.showIcons && item.icon) {
      const iconSpan = document.createElement("span");
      iconSpan.className = "nav-icon";
      iconSpan.textContent = item.icon;
      iconSpan.style.cssText = "flex-shrink:0;font-size:15px;display:flex;align-items:center;";
      el.appendChild(iconSpan);
    }

    // Label
    const labelSpan = document.createElement("span");
    labelSpan.className = "nav-label";
    labelSpan.textContent = item.label;
    if (!isHorizontal && opts.collapsed) {
      labelSpan.title = item.label;
    }
    el.appendChild(labelSpan);

    // Badge
    if (opts.showBadges && item.badge !== undefined) {
      const badgeColor = BADGE_COLORS[item.badgeColor ?? "default"]!;
      const badge = document.createElement("span");
      badge.className = "nav-badge";
      badge.style.cssText = `
        padding:1px 7px;border-radius:10px;font-size:11px;font-weight:500;
        background:${badgeColor.bg};color:${badgeColor.color};line-height:1.4;
        flex-shrink:0;
      `;
      badge.textContent = typeof item.badge === "number" && item.badge > 99 ? "99+" : String(item.badge);
      el.appendChild(badge);
    }

    // Events
    if (!item.disabled && !item.children?.length) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (opts.beforeSelect?.(item) === false) return;
        activeKey = item.key;
        opts.onSelect?.(item);
        render();
      });

      el.addEventListener("mouseenter", () => {
        if (!isActive && !item.disabled) {
          el.style.background = opts.variant === "pill" ? "#f3f4f6" : isHorizontal ? "#f9fafb" : "#f3f4f6";
        }
      });

      el.addEventListener("mouseleave", () => {
        if (!isActive) {
          el.style.background = "";
        }
      });
    }

    return el;
  }

  // Initial render
  render();

  return {
    element: root,

    getActiveKey() { return activeKey; },

    setActiveKey(key: string) {
      activeKey = key;
      render();
    },

    getItems() { return [...items]; },

    setItems(newItems: MenuItem[]) {
      items = newItems;
      render();
    },

    updateItem(key: string, updates: Partial<MenuItem>) {
      function findAndUpdate(list: MenuItem[]): boolean {
        for (let i = 0; i < list.length; i++) {
          if (list[i]!.key === key) {
            list[i] = { ...list[i]!, ...updates };
            return true;
          }
          if (list[i]!.children && findAndUpdate(list[i]!.children!)) return true;
        }
        return false;
      }
      findAndUpdate(items);
      render();
    },

    setCollapsed(collapsed: boolean) {
      opts.collapsed = collapsed;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };
}
