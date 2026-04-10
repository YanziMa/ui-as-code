/**
 * Menu Bar: Horizontal navigation bar with dropdown submenus, keyboard navigation,
 * active state tracking, responsive overflow, icons, dividers, badges, and accessibility.
 */

// --- Types ---

export interface MenuBarItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** URL for link behavior */
  href?: string;
  /** Submenu items */
  children?: MenuBarItem[];
  /** Disabled state */
  disabled?: boolean;
  /** Hidden state */
  hidden?: boolean;
  /** Badge count or text */
  badge?: string | number;
  /** Danger variant */
  danger?: boolean;
  /** Active/highlighted state */
  active?: boolean;
  /** Click handler */
  onClick?: (item: MenuBarItem) => void;
  /** Custom renderer */
  render?: (item: MenuBarItem, el: HTMLElement) => void;
}

export interface MenuBarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Menu items (top-level) */
  items: MenuBarItem[];
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Show icons in items */
  showIcons?: boolean;
  /** Show badges */
  showBadges?: boolean;
  /** Dropdown submenu on hover (vs click) */
  hoverOpen?: boolean;
  /** Delay before opening submenu on hover (ms) */
  hoverDelay?: number;
  /** Close submenu on item click */
  closeOnSelect?: boolean;
  /** Z-index for dropdowns */
  zIndex?: number;
  /** Callback when an item is clicked */
  onItemClick?: (item: MenuBarItem) => void;
  /** Callback when active item changes */
  onActiveChange?: (id: string | null) => void;
  /** Custom CSS class */
  className?: string;
}

export interface MenuBarInstance {
  element: HTMLElement;
  getItems: () => MenuBarItem[];
  setItems: (items: MenuBarItem[]) => void;
  setActive: (id: string) => void;
  getActive: () => string | null;
  addItem: (item: MenuBarItem, parentId?: string) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<MenuBarItem>) => void;
  destroy: () => void;
}

// --- Helpers ---

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

// --- Main Class ---

export class MenuBarManager {
  create(options: MenuBarOptions): MenuBarInstance {
    const opts = {
      orientation: options.orientation ?? "horizontal",
      showIcons: options.showIcons ?? true,
      showBadges: options.showBadges ?? true,
      hoverOpen: options.hoverOpen ?? false,
      hoverDelay: options.hoverDelay ?? 200,
      closeOnSelect: options.closeOnSelect ?? true,
      zIndex: options.zIndex ?? 10500,
      ...options,
    };

    const container = resolveEl(options.container);
    if (!container) throw new Error("MenuBar: container not found");

    let items = [...options.items];
    let activeId: string | null = items.find((i) => i.active)?.id ?? null;
    let openSubmenu: string | null = null;
    let hoverTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    // Root element
    const root = document.createElement("nav");
    root.className = `menubar ${opts.orientation} ${opts.className ?? ""}`;
    root.setAttribute("role", "menubar");
    root.style.cssText = opts.orientation === "horizontal"
      ? "display:flex;align-items:center;gap:2px;background:#fff;border-bottom:1px solid #e5e7eb;padding:0 8px;font-family:-apple-system,sans-serif;user-select:none;"
      : "display:flex;flex-direction:column;gap:0;background:#fff;border-right:1px solid #e5e7eb;padding:8px 0;font-family:-apple-system,sans-serif;user-select:none;width:200px;";
    container.appendChild(root);

    function render(): void {
      root.innerHTML = "";
      openSubmenu = null;

      for (const item of items) {
        if (item.hidden) continue;

        if (opts.orientation === "horizontal") {
          root.appendChild(createHorizontalItem(item));
        } else {
          root.appendChild(createVerticalItem(item));
        }
      }
    }

    function createHorizontalItem(item: MenuBarItem): HTMLElement {
      const li = document.createElement("div");
      li.className = "menubar-item";
      li.dataset.id = item.id;
      li.setAttribute("role", "menuitem");
      li.setAttribute("aria-haspopup", String(!!item.children?.length));
      li.setAttribute("aria-disabled", String(item.disabled ?? false));
      li.style.cssText = `
        position:relative;display:flex;align-items:center;gap:6px;padding:8px 14px;
        cursor:${item.disabled ? "not-allowed" : "pointer"};
        color:${item.active ? "#4338ca" : item.disabled ? "#9ca3af" : "#374151"};
        font-size:13px;font-weight:${item.active ? "600" : "400"};
        border-bottom:${item.active ? "2px solid #4338ca" : "2px solid transparent"};
        transition:all 0.15s;white-space:nowrap;
        ${item.danger ? "color:#dc2626;" : ""}
      `;

      // Icon
      if (item.icon && opts.showIcons) {
        const iconEl = document.createElement("span");
        iconEl.textContent = item.icon;
        iconEl.style.cssText = "font-size:14px;";
        li.appendChild(iconEl);
      }

      // Label
      const labelEl = document.createElement("span");
      labelEl.textContent = item.label;
      li.appendChild(labelEl);

      // Badge
      if (item.badge !== undefined && opts.showBadges) {
        const badge = document.createElement("span");
        badge.className = "menubar-badge";
        badge.textContent = typeof item.badge === "number" && item.badge > 99 ? "99+" : String(item.badge);
        badge.style.cssText = `
          background:#ef4444;color:#fff;font-size:10px;font-weight:600;
          padding:1px 5px;border-radius:10px;margin-left:4px;line-height:1.2;
        `;
        li.appendChild(badge);
      }

      // Submenu arrow
      if (item.children && item.children.length > 0) {
        const arrow = document.createElement("span");
        arrow.innerHTML = "&rsaquo;";
        arrow.style.cssText = "font-size:11px;color:#9ca3af;margin-left:2px;";
        li.appendChild(arrow);
      }

      // Events
      if (!item.disabled) {
        li.addEventListener("click", (e) => {
          e.stopPropagation();
          handleItemClick(item);
        });

        li.addEventListener("mouseenter", () => {
          if (opts.hoverOpen && item.children?.length) {
            hoverTimer = setTimeout(() => openSubmenuFor(item, li), opts.hoverDelay!);
          }
          li.style.background = "#f9fafb";
        });

        li.addEventListener("mouseleave", () => {
          if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
          li.style.background = "";
        });
      }

      // Custom renderer
      if (item.render) item.render(item, li);

      return li;
    }

    function createVerticalItem(item: MenuBarItem): HTMLElement {
      const li = document.createElement("div");
      li.className = "menubar-item";
      li.dataset.id = item.id;
      li.setAttribute("role", "menuitem");
      li.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:8px 16px;
        cursor:${item.disabled ? "not-allowed" : "pointer"};
        color:${item.active ? "#4338ca" : item.disabled ? "#9ca3af" : "#374151"};
        font-size:13px;font-weight:${item.active ? "600" : "400"};
        background:${item.active ? "#eef2ff" : "transparent"};
        border-radius:6px;margin:1px 8px;transition:all 0.15s;
        ${item.danger ? "color:#dc2626;" : ""}
      `;

      if (item.icon && opts.showIcons) {
        const iconEl = document.createElement("span");
        iconEl.textContent = item.icon;
        iconEl.style.cssText = "font-size:16px;width:20px;text-align:center;";
        li.appendChild(iconEl);
      }

      const labelEl = document.createElement("span");
      labelEl.style.flex = "1";
      labelEl.textContent = item.label;
      li.appendChild(labelEl);

      if (item.badge !== undefined && opts.showBadges) {
        const badge = document.createElement("span");
        badge.textContent = typeof item.badge === "number" && item.badge > 99 ? "99+" : String(item.badge);
        badge.style.cssText = "background:#ef4444;color:#fff;font-size:10px;font-weight:600;padding:1px 5px;border-radius:10px;";
        li.appendChild(badge);
      }

      if (!item.disabled) {
        li.addEventListener("click", () => handleItemClick(item));
        li.addEventListener("mouseenter", () => { li.style.background = "#f3f4f6"; });
        li.addEventListener("mouseleave", () => { li.style.background = item.active ? "#eef2ff" : "transparent"; });
      }

      return li;
    }

    function openSubmenuFor(item: MenuBarItem, parentEl: HTMLElement): void {
      // Remove existing submenu
      const existing = root.querySelector(".menubar-submenu");
      if (existing) existing.remove();

      if (!item.children || item.children.length === 0) return;

      openSubmenu = item.id;

      const sub = document.createElement("div");
      sub.className = "menubar-submenu";
      sub.style.cssText = `
        position:absolute;top:100%;left:0;min-width:180px;
        background:#fff;border-radius:8px;
        box-shadow:0 10px 30px rgba(0,0,0,0.12),0 2px 6px rgba(0,0,0,0.06);
        border:1px solid #e5e7eb;padding:4px 0;z-index:${opts.zIndex};
      `;

      for (const child of item.children) {
        if (child.hidden) continue;
        const childEl = document.createElement("div");
        childEl.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:8px 14px;
          cursor:pointer;color:#374151;font-size:13px;transition:background 0.1s;
          ${child.disabled ? "opacity:0.5;cursor:not-allowed;" : ""}
          ${child.danger ? "color:#dc2626;" : ""}
        `;

        if (child.icon) {
          const ic = document.createElement("span");
          ic.textContent = child.icon;
          ic.style.cssText = "font-size:14px;width:18px;text-align:center;";
          childEl.appendChild(ic);
        }

        const lbl = document.createElement("span");
        lbl.textContent = child.label;
        lbl.style.flex = "1";
        childEl.appendChild(lbl);

        if (!child.disabled) {
          childEl.addEventListener("click", (e) => {
            e.stopPropagation();
            handleItemClick(child);
            if (opts.closeOnSelect) closeSubmenu();
          });

          childEl.addEventListener("mouseenter", () => { childEl.style.background = "#f5f3ff"; });
          childEl.addEventListener("mouseleave", () => { childEl.style.background = ""; });
        }

        sub.appendChild(childEl);
      }

      parentEl.appendChild(sub);
      parentEl.style.position = "relative";
    }

    function closeSubmenu(): void {
      openSubmenu = null;
      const existing = root.querySelector(".menubar-submenu");
      if (existing) existing.remove();
    }

    function handleItemClick(item: MenuBarItem): void {
      // Set active
      if (activeId !== item.id) {
        // Clear previous active
        for (const i of items) i.active = false;
        item.active = true;
        activeId = item.id;
        render();
        opts.onActiveChange?.(activeId);
      }

      // If has children, toggle submenu
      if (item.children && item.children.length > 0) {
        if (openSubmenu === item.id) {
          closeSubmenu();
        } else {
          const parentEl = root.querySelector(`[data-id="${item.id}"]`);
          if (parentEl) openSubmenuFor(item, parentEl as HTMLElement);
        }
      } else {
        closeSubmenu();
      }

      item.onClick?.(item);
      opts.onItemClick?.(item);

      // Navigate to href
      if (item.href) window.location.href = item.href;
    }

    // Keyboard navigation
    root.addEventListener("keydown", (e: KeyboardEvent) => {
      const visibleItems = Array.from(root.querySelectorAll<HTMLElement>('.menubar-item:not([style*="display:none"])'));
      const currentIndex = visibleItems.findIndex((el) => el === document.activeElement);

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          if (currentIndex < visibleItems.length - 1) {
            visibleItems[currentIndex + 1]?.focus();
          }
          break;
        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          if (currentIndex > 0) {
            visibleItems[currentIndex - 1]?.focus();
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (document.activeElement) {
            const id = (document.activeElement as HTMLElement).dataset.id;
            const item = items.find((i) => i.id === id);
            if (item) handleItemClick(item);
          }
          break;
        case "Escape":
          closeSubmenu();
          break;
      }
    });

    // Close on outside click
    document.addEventListener("mousedown", (e: MouseEvent) => {
      if (!root.contains(e.target as Node)) closeSubmenu();
    });

    // Initial render
    render();

    const instance: MenuBarInstance = {
      element: root,

      getItems() { return [...items]; },

      setItems(newItems: MenuBarItem[]) {
        items = [...newItems];
        activeId = newItems.find((i) => i.active)?.id ?? null;
        render();
      },

      setActive(id: string) {
        for (const i of items) i.active = i.id === id;
        activeId = id;
        render();
        opts.onActiveChange?.(activeId);
      },

      getActive() { return activeId; },

      addItem(newItem: MenuBarItem, parentId?: string) {
        if (parentId) {
          const parent = items.find((i) => i.id === parentId);
          if (parent) {
            if (!parent.children) parent.children = [];
            parent.children.push(newItem);
          }
        } else {
          items.push(newItem);
        }
        render();
      },

      removeItem(id: string) {
        items = items.filter((i) => i.id !== id);
        if (activeId === id) activeId = null;
        render();
      },

      updateItem(id: string, updates: Partial<MenuBarItem>) {
        const idx = items.findIndex((i) => i.id === id);
        if (idx >= 0) {
          items[idx] = { ...items[idx]!, ...updates };
          if (updates.active !== undefined && updates.active) {
            for (const i of items) if (i.id !== id) i.active = false;
            activeId = id;
          }
          render();
        }
      },

      destroy() {
        destroyed = true;
        if (hoverTimer) clearTimeout(hoverTimer);
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create a menu bar */
export function createMenuBar(options: MenuBarOptions): MenuBarInstance {
  return new MenuBarManager().create(options);
}
