/**
 * Tabs Navigation Component: Tab bar with horizontal/vertical layouts,
 * closable tabs, disabled state, badge counts, keyboard navigation,
 * animated indicator, overflow scroll, and accessibility.
 */

// --- Types ---

export type TabVariant = "default" | "pills" | "underline" | "enclosed";
export type TabSize = "sm" | "md" | "lg";

export interface TabItem {
  /** Tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Whether this tab is disabled */
  disabled?: boolean;
  /** Badge count */
  badge?: number | string;
  /** Whether this tab can be closed */
  closable?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Custom data */
  data?: unknown;
}

export interface TabsNavOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Tab items */
  items: TabItem[];
  /** Active tab id */
  activeId?: string;
  /** Visual variant */
  variant?: TabVariant;
  /** Size variant */
  size?: TabSize;
  /** Orientation */
  orientation?: "horizontal" | "vertical";
  /** Show close button on closable tabs */
  showCloseButton?: boolean;
  /** Allow adding new tabs (+ button) */
  allowAdd?: boolean;
  /** Max visible tabs before scroll (0 = no limit) */
  maxVisible?: number;
  /** Callback on tab change */
  onTabChange?: (tabId: string, index: number) => void;
  /** Callback on tab close */
  onTabClose?: (tabId: string, index: number) => void;
  /** Callback on add tab click */
  onTabAdd?: () => void;
  /** Callback before tab change (return false to prevent) */
  beforeChange?: (fromId: string, toId: string) => boolean | Promise<boolean>;
  /** Custom CSS class */
  className?: string;
}

export interface TabsNavInstance {
  element: HTMLElement;
  getItems: () => TabItem[];
  getActiveId: () => string;
  setActiveId: (id: string) => Promise<boolean>;
  addItem: (item: TabItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<TabItem>) => void;
  setBadge: (id: string, count: number | string) => void;
  destroy: () => void;
}

// --- Main Class ---

export class TabsNavManager {
  create(options: TabsNavOptions): TabsNavInstance {
    const opts = {
      activeId: options.activeId ?? (options.items[0]?.id ?? ""),
      variant: options.variant ?? "underline",
      size: options.size ?? "md",
      orientation: options.orientation ?? "horizontal",
      showCloseButton: options.showCloseButton ?? true,
      allowAdd: options.allowAdd ?? false,
      maxVisible: options.maxVisible ?? 0,
      ...options,
    };

    const container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;

    if (!container) throw new Error("TabsNav: container element not found");

    container.className = `tabs-nav tabs-${opts.variant} tabs-${opts.size} ${opts.className ?? ""}`;

    const sizeMap: Record<TabSize, { height: number; fontSize: number; paddingX: number; gap: number }> = {
      sm: { height: 28, fontSize: 12, paddingX: 12, gap: 4 },
      md: { height: 36, fontSize: 13, paddingX: 16, gap: 6 },
      lg: { height: 44, fontSize: 14, paddingX: 20, gap: 8 },
    };
    const sz = sizeMap[opts.size];

    // State
    let activeId = opts.activeId;
    let items = [...options.items];
    let destroyed = false;

    function render(): void {
      container.innerHTML = "";

      const isHorizontal = opts.orientation === "horizontal";
      const isVertical = !isHorizontal;

      // Outer wrapper
      const wrapper = document.createElement("div");
      wrapper.className = "tabs-wrapper";
      wrapper.style.cssText = `
        display:flex;${isHorizontal ? "flex-direction:row;" : "flex-direction:column;"}
        ${isHorizontal ? "overflow-x:auto;overflow-y:hidden;" : "overflow-y:auto;overflow-x:hidden;"}
        position:relative;width:100%;
        ${isVertical ? `max-height:${(sz.height + sz.gap) * (opts.maxVisible || items.length) + sz.gap}px;` : ""}
      `;

      // Scrollable area for tabs
      const tabsContainer = document.createElement("div");
      tabsContainer.className = "tabs-list";
      tabsContainer.setAttribute("role", "tablist");
      tabsContainer.setAttribute("aria-orientation", opts.orientation);
      tabsContainer.style.cssText = `
        display:flex;${isHorizontal ? "flex-direction:row;" : "flex-direction:column;"}
        ${isHorizontal ? "" : "width:100%;"}
        gap:${sz.gap}px;
      `;

      // Render each tab
      items.forEach((item, index) => {
        const tabEl = createTabElement(item, index);
        tabsContainer.appendChild(tabEl);
      });

      // Add button
      if (opts.allowAdd) {
        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "tabs-add-btn";
        addBtn.textContent = "+";
        addBtn.title = "Add tab";
        addBtn.style.cssText = `
          display:flex;align-items:center;justify-content:center;
          min-width:${sz.height}px;height:${sz.height}px;
          border:1px dashed #d1d5db;border-radius:${getBorderRadius()};
          background:transparent;color:#9ca3af;font-size:${sz.fontSize + 4}px;
          cursor:pointer;transition:all 0.15s;flex-shrink:0;
        `;
        addBtn.addEventListener("click", () => opts.onTabAdd?.());
        addBtn.addEventListener("mouseenter", () => {
          addBtn.style.borderColor = "#6366f1";
          addBtn.style.color = "#6366f1";
        });
        addBtn.addEventListener("mouseleave", () => {
          addBtn.style.borderColor = "#d1d5db";
          addBtn.style.color = "#9ca3af";
        });
        tabsContainer.appendChild(addBtn);
      }

      wrapper.appendChild(tabsContainer);

      // Animated indicator line (for underline/enclosed variants)
      if (opts.variant === "underline" || opts.variant === "enclosed") {
        const indicator = document.createElement("div");
        indicator.className = "tabs-indicator";
        indicator.style.cssText = `
          position:absolute;${isHorizontal ? "bottom:0;left:0;" : "right:0;top:0;"}
          ${isHorizontal ? "height:2px;" : "width:2px;"}
          background:#4338ca;border-radius:1px;
          transition:all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          z-index:10;
        `;
        wrapper.appendChild(indicator);

        // Position indicator after render
        requestAnimationFrame(() => updateIndicatorPosition(indicator, wrapper));
      }

      container.appendChild(wrapper);
    }

    function createTabElement(item: TabItem, index: number): HTMLElement {
      const isActive = item.id === activeId;
      const isDisabled = item.disabled ?? false;

      const tabEl = document.createElement("button");
      tabEl.type = "button";
      tabEl.className = `tabs-tab ${isActive ? "active" : ""}`;
      tabEl.dataset.tabId = item.id;
      tabEl.setAttribute("role", "tab");
      tabEl.setAttribute("aria-selected", String(isActive));
      if (isDisabled) tabEl.setAttribute("aria-disabled", "true");
      if (item.tooltip) tabEl.title = item.tooltip;

      const style = getTabStyle(isActive, isDisabled);
      tabEl.style.cssText = `
        display:inline-flex;align-items:center;gap:4px;
        ${isHorizontalStyle()}
        font-size:${sz.fontSize}px;font-weight:${isActive ? "600" : "400"};
        color:${style.color};background:${style.background};
        border:${style.border};border-radius:${getBorderRadius()};
        cursor:${isDisabled ? "not-allowed" : "pointer"};
        white-space:nowrap;user-select:none;position:relative;
        transition:all 0.2s ease;flex-shrink:0;
      `;

      // Icon
      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "tabs-icon";
        iconSpan.style.cssText = "flex-shrink:0;line-height:1;";
        iconSpan.textContent = item.icon;
        tabEl.appendChild(iconSpan);
      }

      // Label
      const labelSpan = document.createElement("span");
      labelSpan.className = "tabs-label";
      labelSpan.textContent = item.label;
      tabEl.appendChild(labelSpan);

      // Badge
      if (item.badge !== undefined && item.badge !== null && item.badge !== "") {
        const badge = document.createElement("span");
        badge.className = "tabs-badge";
        const badgeVal = typeof item.badge === "number" ? item.badge > 99 ? "99+" : String(item.badge) : item.badge;
        badge.textContent = badgeVal;
        badge.style.cssText = `
          display:inline-flex;align-items:center;justify-content:center;
          min-width:16px;height:16px;padding:0 4px;
          font-size:10px;font-weight:600;line-height:1;
          background:${isActive ? "#fff" : "#ef4444"};color:${isActive ? "#4338ca" : "#fff"};
          border-radius:8px;margin-left:2px;
        `;
        tabEl.appendChild(badge);
      }

      // Close button
      if (item.closable && opts.showCloseButton) {
        const closeBtn = document.createElement("span");
        closeBtn.className = "tabs-close";
        closeBtn.innerHTML = "&times;";
        closeBtn.style.cssText = `
          margin-left:4px;font-size:14px;line-height:1;color:inherit;opacity:0.5;
          cursor:pointer;padding:0 2px;border-radius:2px;flex-shrink:0;
        `;
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          opts.onTabClose?.(item.id, index);
        });
        closeBtn.addEventListener("mouseenter", () => { closeBtn.style.opacity = "1"; closeBtn.style.background = "rgba(0,0,0,0.1)"; });
        closeBtn.addEventListener("mouseleave", () => { closeBtn.style.opacity = "0.5"; closeBtn.style.background = ""; });
        tabEl.appendChild(closeBtn);
      }

      // Click handler
      if (!isDisabled) {
        tabEl.addEventListener("click", async () => {
          await setActiveId(item.id);
        });

        // Hover effect
        tabEl.addEventListener("mouseenter", () => {
          if (!isActive) {
            applyHoverStyle(tabEl);
          }
        });
        tabEl.addEventListener("mouseleave", () => {
          if (!isActive) {
            tabEl.style.color = style.color;
            tabEl.style.background = style.background;
          }
        });
      }

      return tabEl;
    }

    function isHorizontalStyle(): string {
      const isH = opts.orientation === "horizontal";
      return `height:${sz.height}px;padding:0 ${sz.paddingX}px;`;
    }

    function getBorderRadius(): string {
      switch (opts.variant) {
        case "pills": return "9999px";
        case "enclosed": return `${sz.height / 2}px ${sz.height / 2}px 0 0`;
        case "underline": return "0";
        default: return "6px";
      }
    }

    function getTabStyle(isActive: boolean, isDisabled: boolean): {
      color: string; background: string; border: string;
    } {
      if (isDisabled) {
        return { color: "#d1d5db", background: "transparent", border: "none" };
      }

      switch (opts.variant) {
        case "pills":
          return isActive
            ? { color: "#fff", background: "#4338ca", border: "none" }
            : { color: "#374151", background: "transparent", border: "none" };
        case "underline":
          return isActive
            ? { color: "#4338ca", background: "transparent", border: "none" }
            : { color: "#6b7280", background: "transparent", border: "none" };
        case "enclosed":
          return isActive
            ? { color: "#4338ca", background: "#f5f3ff", border: "1px solid #c7d2fe" }
            : { color: "#6b7280", background: "transparent", border: "1px solid transparent" };
        default:
          return isActive
            ? { color: "#4338ca", background: "#eef2ff", border: "1px solid #c7d2fe" }
            : { color: "#6b7280", background: "transparent", border: "1px solid transparent" };
      }
    }

    function applyHoverStyle(el: HTMLElement): void {
      switch (opts.variant) {
        case "pills":
          el.style.background = "#f5f3ff";
          el.style.color = "#4338ca";
          break;
        case "underline":
          el.style.color = "#4338ca";
          break;
        case "enclosed":
          el.style.background = "#faf5ff";
          el.style.border = "1px solid #ddd6fe";
          break;
        default:
          el.style.background = "#f9fafb";
          el.style.border = "1px solid #e5e7eb";
          break;
      }
    }

    function updateIndicatorPosition(indicator: HTMLElement, wrapper: HTMLElement): void {
      const activeTab = wrapper.querySelector<HTMLElement>(".tabs-tab.active");
      if (!activeTab) return;

      if (opts.orientation === "horizontal") {
        indicator.style.left = `${activeTab.offsetLeft}px`;
        indicator.style.width = `${activeTab.offsetWidth}px`;
      } else {
        indicator.style.top = `${activeTab.offsetTop}px`;
        indicator.style.height = `${activeTab.offsetHeight}px`;
      }
    }

    async function setActiveId(id: string): Promise<boolean> {
      const item = items.find(t => t.id === id);
      if (!item || item.disabled) return false;
      if (id === activeId) return true;

      // beforeChange hook
      if (opts.beforeChange) {
        const allowed = await opts.beforeChange(activeId, id);
        if (!allowed) return false;
      }

      activeId = id;
      render();
      const index = items.findIndex(t => t.id === id);
      opts.onTabChange?.(id, index >= 0 ? index : 0);
      return true;
    }

    // Keyboard navigation
    container.addEventListener("keydown", (e: KeyboardEvent) => {
      const focusedIndex = items.findIndex(t => t.id === activeId);
      if (focusedIndex < 0) return;

      let newIndex = -1;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        newIndex = (focusedIndex + 1) % items.length;
        while (newIndex < items.length && items[newIndex]?.disabled) {
          newIndex = (newIndex + 1) % items.length;
          if (newIndex === focusedIndex) break;
        }
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        newIndex = (focusedIndex - 1 + items.length) % items.length;
        while (newIndex >= 0 && items[newIndex]?.disabled) {
          newIndex = (newIndex - 1 + items.length) % items.length;
          if (newIndex === focusedIndex) break;
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        newIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        newIndex = items.length - 1;
      }

      if (newIndex >= 0 && newIndex < items.length && !items[newIndex]?.disabled) {
        setActiveId(items[newIndex]!.id);
      }
    });

    // Initial render
    render();

    const instance: TabsNavInstance = {
      element: container,

      getItems() { return [...items]; },

      getActiveId() { return activeId; },

      setActiveId,

      addItem(item: TabItem) {
        items.push(item);
        render();
      },

      removeItem(id: string) {
        const idx = items.findIndex(t => t.id === id);
        if (idx >= 0) {
          items.splice(idx, 1);
          if (activeId === id) {
            activeId = items[Math.min(idx, items.length - 1)]?.id ?? "";
          }
          render();
        }
      },

      updateItem(id: string, updates: Partial<TabItem>) {
        const idx = items.findIndex(t => t.id === id);
        if (idx >= 0) {
          items[idx] = { ...items[idx]!, ...updates };
          render();
        }
      },

      setBadge(id: string, count: number | string) {
        const idx = items.findIndex(t => t.id === id);
        if (idx >= 0) {
          items[idx]!.badge = count;
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

/** Convenience: create a tabs navigation */
export function createTabsNav(options: TabsNavOptions): TabsNavInstance {
  return new TabsNavManager().create(options);
}
