/**
 * Sidebar Navigation: Collapsible sidebar with menu items, icons, badges, active state,
 * nested submenus, responsive collapse, keyboard navigation, scrollable area,
 * and persistence.
 */

// --- Types ---

export interface SidebarItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Navigation href */
  href?: string;
  /** Badge text or count */
  badge?: string | number;
  /** Badge color variant */
  badgeVariant?: "default" | "primary" | "success" | "warning" | "error";
  /** Disabled state */
  disabled?: boolean;
  /** Hidden state */
  hidden?: boolean;
  /** Submenu items */
  children?: SidebarItem[];
  /** Default expanded? (for items with children) */
  defaultExpanded?: boolean;
  /** Custom data */
  data?: unknown;
}

export interface SidebarGroup {
  /** Group ID */
  id: string;
  /** Group label (shown as header) */
  label?: string;
  /** Items in this group */
  items: SidebarItem[];
  /** Collapsible group? */
  collapsible?: boolean;
  /** Default collapsed? */
  defaultCollapsed?: boolean;
}

export interface SidebarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Width when open (px) */
  width?: number;
  /** Width when collapsed (px) - icon-only mode */
  collapsedWidth?: number;
  /** Initially collapsed? */
  collapsed?: boolean;
  /** Groups of items */
  groups: SidebarGroup[];
  /** Active item ID */
  activeId?: string;
  /** Show icons? */
  showIcons?: boolean;
  /** Show badges? */
  showBadges?: true;
  /** Show tooltips on collapse? */
  showTooltips?: boolean;
  /** Collapsible by user toggle? */
  collapsible?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Callback on item click */
  onItemClick?: (item: SidebarItem) => void;
  /** Callback on collapse/expand */
  onToggle?: (collapsed: boolean) => void;
  /** Persist state in localStorage? */
  persistKey?: string;
  /** Custom CSS class */
  className?: string;
  /** Header content (HTML string or element) */
  header?: string | HTMLElement;
  /** Footer content (HTML string or element) */
  footer?: string | HTMLElement;
}

export interface SidebarInstance {
  element: HTMLElement;
  isCollapsed: () => boolean;
  setActive: (id: string) => void;
  toggleCollapse: () => void;
  setCollapsed: (collapsed: boolean) => void;
  expandItem: (id: string) => void;
  collapseItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<SidebarItem>) => void;
  updateGroups: (groups: SidebarGroup[]) => void;
  destroy: () => void;
}

// --- Helpers ---

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  default:  { bg: "#f3f4f6", color: "#6b7280" },
  primary:  { bg: "#eef2ff", color: "#4338ca" },
  success:  { bg: "#f0fdf4", color: "#16a34a" },
  warning:  { bg: "#fffbeb", color: "#d97706" },
  error:    { bg: "#fef2f2", color: "#dc2626" },
};

function resolveElement(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector(el) : el;
}

// --- Main Class ---

export class SidebarManager {
  create(options: SidebarOptions): SidebarInstance {
    const opts = {
      width: options.width ?? 260,
      collapsedWidth: options.collapsedWidth ?? 64,
      collapsed: options.collapsed ?? false,
      showIcons: options.showIcons ?? true,
      showBadges: options.showBadges ?? true,
      showTooltips: options.showTooltips ?? true,
      collapsible: options.collapsible ?? true,
      animationDuration: options.animationDuration ?? 250,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("Sidebar: container element not found");

    // Load persisted state
    if (opts.persistKey) {
      try {
        const saved = localStorage.getItem(opts.persistKey);
        if (saved !== null) opts.collapsed = saved === "true";
      } catch { /* ignore */ }
    }

    let isCollapsed = opts.collapsed;
    let activeId = options.activeId ?? null;
    let expandedItems = new Set<string>();
    let destroyed = false;

    // Collect initial expanded state
    for (const group of options.groups) {
      for (const item of group.items) {
        if (item.defaultExpanded && item.children?.length) {
          expandedItems.add(item.id);
        }
      }
    }

    container.className = `sidebar ${opts.className ?? ""}`;
    container.style.cssText = `
      position:relative;display:flex;flex-direction:column;height:100%;
      width:${isCollapsed ? opts.collapsedWidth : opts.width}px;
      background:#fff;border-right:1px solid #e5e7eb;
      transition:width ${opts.animationDuration}ms ease;
      overflow:hidden;flex-shrink:0;
    `;

    // Scrollable content area
    const scrollArea = document.createElement("div");
    scrollArea.className = "sidebar-scroll";
    scrollArea.style.cssText = "flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 0;";
    container.appendChild(scrollArea);

    // Header
    if (options.header) {
      const headerEl = document.createElement("div");
      headerEl.className = "sidebar-header";
      headerEl.style.cssText = `
        padding:12px 16px;display:flex;align-items:center;gap:10px;
        border-bottom:1px solid #f3f4f6;min-height:52px;flex-shrink:0;
      `;
      if (typeof options.header === "string") {
        headerEl.innerHTML = options.header;
      } else {
        headerEl.appendChild(options.header);
      }
      container.insertBefore(headerEl, scrollArea);
    }

    // Collapse toggle button
    let toggleBtn: HTMLButtonElement | null = null;
    if (opts.collapsible) {
      toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.innerHTML = isCollapsed ? "\u203A" : "\u2039"; // chevron right / left
      toggleBtn.title = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
      toggleBtn.style.cssText = `
        position:absolute;top:12px;${isCollapsed ? "right:8px;" : `right:-12px;`}
        width:24px;height:24px;border-radius:50%;background:#fff;
        border:1px solid #d1d5db;cursor:pointer;font-size:14px;
        display:flex;align-items:center;justify-content:center;z-index:5;
        box-shadow:0 1px 3px rgba(0,0,0,0.08);transition:transform ${opts.animationDuration}ms ease;
      `;
      toggleBtn.addEventListener("click", () => instance.toggleCollapse());
      container.appendChild(toggleBtn);
    }

    // Footer
    if (options.footer) {
      const footerEl = document.createElement("div");
      footerEl.className = "sidebar-footer";
      footerEl.style.cssText = `
        padding:12px 16px;border-top:1px solid #f3f4f6;flex-shrink:0;
      `;
      if (typeof options.footer === "string") {
        footerEl.innerHTML = options.footer;
      } else {
        footerEl.appendChild(options.footer);
      }
      container.appendChild(footerEl);
    }

    function render(): void {
      scrollArea.innerHTML = "";

      for (const group of options.groups) {
        // Group header
        if (group.label && !isCollapsed) {
          const groupHeader = document.createElement("div");
          groupHeader.className = "sidebar-group-header";
          groupHeader.style.cssText = `
            padding:8px 16px 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;
            letter-spacing:0.05em;font-weight:600;white-space:nowrap;overflow:hidden;
            transition:opacity ${opts.animationDuration}ms ease;
          `;
          groupHeader.textContent = group.label;
          scrollArea.appendChild(groupHeader);
        }

        // Group items
        for (const item of group.items) {
          if (item.hidden) continue;
          const itemEl = createSidebarItem(item, group);
          scrollArea.appendChild(itemEl);
        }
      }
    }

    function createSidebarItem(item: SidebarItem, group: SidebarGroup): HTMLElement {
      const hasChildren = item.children && item.children.length > 0;
      const isActive = item.id === activeId;
      const isExpanded = expandedItems.has(item.id);

      const li = document.createElement("div");
      li.dataset.id = item.id;
      li.style.cssText = `
        position:relative;margin:1px 4px;border-radius:6px;
        cursor:${item.disabled ? "not-allowed" : "pointer"};
        overflow:hidden;transition:background 0.15s;
      `;

      // Item row
      const row = document.createElement("div");
      row.className = "sidebar-item-row";
      row.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:${isCollapsed ? "8px" : "8px 12px"}
        height:${isCollapsed ? "40px" : "40px"};position:relative;
        white-space:nowrap;overflow:hidden;
        ${isActive ? "background:#eef2ff;" : ""}
        ${item.disabled ? "opacity:0.45;" : ""}
        transition:all 0.15s;
      `;

      // Icon
      if (opts.showIcons && item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "sidebar-icon";
        iconSpan.style.cssText = `
          flex-shrink:0;width:20px;text-align:center;font-size:16px;
          ${isActive ? "" : ""}
        `;
        iconSpan.textContent = item.icon;
        row.appendChild(iconSpan);
      }

      // Label
      if (!isCollapsed) {
        const labelSpan = document.createElement("span");
        labelSpan.className = "sidebar-label";
        labelSpan.style.cssText = `
          flex:1;font-size:13px;font-weight:${isActive ? "600" : "400"};color:${isActive ? "#4338ca" : "#374151"};
          overflow:hidden;text-overflow:ellipsis;
        `;
        labelSpan.textContent = item.label;

        // Tooltip wrapper for truncated labels
        if (labelSpan.scrollWidth > labelSpan.clientWidth || !isCollapsed) {
          labelSpan.title = item.label;
        }
        row.appendChild(labelSpan);
      }

      // Expand/collapse arrow for parent items
      if (hasChildren && !isCollapsed) {
        const arrow = document.createElement("span");
        arrow.className = "sidebar-arrow";
        arrow.style.cssText = `
          font-size:10px;transition:transform 0.2s ease;
          transform:rotate(${isExpanded ? "90deg" : "0"});
        `;
        arrow.textContent = "\u203A";
        row.appendChild(arrow);
      }

      // Badge
      if (opts.showBadges && item.badge !== undefined && !isCollapsed) {
        const badgeColor = BADGE_COLORS[item.badgeVariant ?? "default"]!;
        const badge = document.createElement("span");
        badge.className = "sidebar-badge";
        badge.style.cssText = `
          padding:1px 7px;border-radius:10px;font-size:11px;font-weight:500;
          background:${badgeColor.bg};color:${badgeColor.color};flex-shrink:0;line-height:1.4;
        `;
        badge.textContent = String(item.badge);
        row.appendChild(badge);
      }

      li.appendChild(row);

      // Children (submenu)
      if (hasChildren) {
        const childContainer = document.createElement("div");
        childContainer.className = "sidebar-children";
        childContainer.style.cssText = `
          overflow:hidden;transition:max-height ${opts.animationDuration}ms ease;
          max-height:${isExpanded ? "500px" : "0"};
        `;

        for (const child of item.children!) {
          if (child.hidden) continue;
          const childEl = createSidebarItem(child, group);
          childEl.style.marginLeft = "20px";
          childContainer.appendChild(childEl);
        }

        li.appendChild(childContainer);
      }

      // Click handler
      if (!item.disabled) {
        row.addEventListener("click", () => {
          if (hasChildren) {
            if (expandedItems.has(item.id)) {
              expandedItems.delete(item.id);
            } else {
              expandedItems.add(item.id);
            }
            render();
          }
          activeId = item.id;
          opts.onItemClick?.(item);
          render();
        });
      }

      // Hover tooltip in collapsed mode
      if (isCollapsed && opts.showTooltips) {
        li.title = item.label + (item.badge !== undefined ? ` (${item.badge})` : "");
      }

      return li;
    }

    const instance: SidebarInstance = {
      element: container,

      isCollapsed() { return isCollapsed; },

      setActive(id: string) {
        activeId = id;
        render();
      },

      toggleCollapse() {
        isCollapsed = !isCollapsed;
        container.style.width = `${isCollapsed ? opts.collapsedWidth : opts.width}px`;
        if (toggleBtn) {
          toggleBtn.innerHTML = isCollapsed ? "\u203A" : "\u2039";
          toggleBtn.title = isCollapsed ? "Expand sidebar" : "Collapse sidebar";
          toggleBtn.style.right = isCollapsed ? "8px" : "-12px";
        }
        render();
        opts.onToggle?.(isCollapsed);

        if (opts.persistKey) {
          try { localStorage.setItem(opts.persistKey, String(isCollapsed)); } catch { /* ignore */ }
        },
      },

      setCollapsed(collapsed: boolean) {
        if (collapsed !== isCollapsed) instance.toggleCollapse();
      },

      expandItem(id: string) {
        expandedItems.add(id);
        render();
      },

      collapseItem(id: string) {
        expandedItems.delete(id);
        render();
      },

      updateItem(id: string, updates: Partial<SidebarItem>) {
        for (const group of options.groups) {
          const findAndUpdate = (items: SidebarItem[]): boolean => {
            for (let i = 0; i < items.length; i++) {
              if (items[i]!.id === id) {
                items[i] = { ...items[i]!, ...updates };
                return true;
              }
              if (items[i]!.children && findAndUpdate(items[i]!.children!)) return true;
            }
            return false;
          };
          findAndUpdate(group.items);
        }
        render();
      },

      updateGroups(groups: SidebarGroup[]) {
        options.groups = groups;
        render();
      },

      destroy() {
        destroyed = true;
        container.innerHTML = "";
        container.style.cssText = "";
      },
    };

    // Initial render
    render();

    return instance;
  }
}

/** Convenience: create a sidebar */
export function createSidebar(options: SidebarOptions): SidebarInstance {
  return new SidebarManager().create(options);
}
