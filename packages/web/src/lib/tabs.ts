/**
 * Tabs System: Animated tab indicator, vertical/horizontal orientation,
 * scrollable tabs, lazy content loading, keyboard navigation,
 * disabled tabs, closable tabs, and accessibility.
 */

// --- Types ---

export type TabOrientation = "horizontal" | "vertical";
export type TabVariant = "line" | "pill" | "enclosed" | "underline";

export interface TabItem {
  /** Unique key */
  key: string;
  /** Label text or HTML element */
  label: string | HTMLElement;
  /** Optional icon (emoji, URL, SVG string) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Content (string, HTML element, or render function) */
  content?: string | HTMLElement;
  /** Lazy load content? */
  lazy?: boolean;
  /** Closable */
  closable?: string; // tooltip for close button
  /** Badge count */
  badge?: number | string;
  /** Custom CSS class */
  className?: string;
}

export interface TabsOptions {
  /** Tab items */
  items: TabItem[];
  /** Initially active tab key */
  defaultActiveKey?: string;
  /** Orientation */
  orientation?: TabOrientation;
  /** Visual variant */
  variant?: TabVariant;
  /** Callback on tab change */
  onChange?: (key: string, item: TabItem) => void;
  /** Callback before tab change (return false to prevent) */
  beforeChange?: (key: string) => boolean | void;
  /** Show tab content area */
  showContent?: boolean;
  /** Animate indicator transition */
  animated?: boolean;
  /** Animation duration in ms (default: 250) */
  animationDuration?: number;
  /** Size: 'sm', 'md', 'lg' */
  size?: "sm" | "md" | "lg";
  /** Center tabs */
  centered?: boolean;
  /** Scrollable when overflow */
  scrollable?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Parent element */
  parent?: HTMLElement;
}

export interface TabsInstance {
  /** Root DOM element */
  element: HTMLDivElement;
  /** Tab bar element */
  tabBar: HTMLDivElement;
  /** Content panel element */
  contentPanel: HTMLDivElement | null;
  /** Activate a tab by key */
  setActiveKey: (key: string) => void;
  /** Get current active key */
  getActiveKey: () => string;
  /** Add a tab dynamically */
  addTab: (item: TabItem, index?: number) => void;
  /** Remove a tab by key */
  removeTab: (key: string) => void;
  /** Update a tab's properties */
  updateTab: (key: string, updates: Partial<TabItem>) => void;
  /** Enable/disable a tab */
  setDisabled: (key: string, disabled: boolean) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Variant Styles ---

const VARIANT_STYLES: Record<TabVariant, { activeBg: string; activeColor: string; inactiveColor: string; indicator: string }> = {
  line:      { activeBg: "transparent",   activeColor: "#007aff", inactiveColor: "#666", indicator: "2px solid #007aff" },
  pill:      { activeBg: "#007aff",       activeColor: "#fff",     inactiveColor: "#666", indicator: "none" },
  enclosed:  { activeBg: "#fff",           activeColor: "#333",     inactiveColor: "#888", indicator: "1px solid #e0e0e0" },
  underline: { activeBg: "transparent",    activeColor: "#333",     inactiveColor: "#999", indicator: "2px solid #333" },
};

const SIZE_STYLES: Record<"sm" | "md" | "lg", { fontSize: number; paddingX: number; paddingY: number; height: number }> = {
  sm: { fontSize: 12, paddingX: 10, paddingY: 5, height: 32 },
  md: { fontSize: 13, paddingX: 14, paddingY: 7, height: 40 },
  lg: { fontSize: 15, paddingX: 18, paddingY: 9, height: 48 },
};

// --- Main Class ---

export class TabsManager {
  create(options: TabsOptions): TabsInstance {
    const opts = {
      orientation: options.orientation ?? "horizontal",
      variant: options.variant ?? "line",
      showContent: options.showContent ?? true,
      animated: options.animated ?? true,
      animationDuration: options.animationDuration ?? 250,
      size: options.size ?? "md",
      centered: options.centered ?? false,
      scrollable: options.scrollable ?? true,
      parent: options.parent ?? document.body,
      ...options,
    };

    const items = [...options.items];
    let activeKey = opts.defaultActiveKey ?? (items[0]?.key ?? "");
    let destroyed = false;

    // Root container
    const root = document.createElement("div");
    root.className = `tabs tabs-${opts.orientation} tabs-${opts.variant} ${options.className ?? ""}`;
    root.setAttribute("role", "tablist");
    root.setAttribute("aria-orientation", opts.orientation);

    // Tab bar
    const tabBar = document.createElement("div");
    tabBar.className = "tabs-bar";
    tabBar.style.cssText = `
      display:flex;${opts.orientation === "vertical" ? "flex-direction:column;" : ""}
      ${opts.centered && opts.orientation === "horizontal" ? "justify-content:center;" : ""}
      gap:${opts.variant === "pill" ? "4px" : "0"};
      position:relative;
      ${opts.scrollable ? "overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;" : ""}
      ${opts.variant === "enclosed" ? "border-bottom:1px solid #e8e8e8;padding:0 2px;" : ""}
    `;
    root.appendChild(tabBar);

    // Indicator element (for line/underline variants)
    let indicator: HTMLDivElement | null = null;
    if (opts.variant === "line" || opts.variant === "underline") {
      indicator = document.createElement("div");
      indicator.className = "tabs-indicator";
      indicator.style.cssText = `
        position:absolute;height:2px;background:#007aff;border-radius:1px;
        transition:${opts.animated ? `all ${opts.animationDuration}ms ease` : "none"};
        bottom:0;left:0;
      `;
      tabBar.appendChild(indicator);
    }

    // Content panel
    let contentPanel: HTMLDivElement | null = null;
    if (opts.showContent) {
      contentPanel = document.createElement("div");
      contentPanel.className = "tabs-content";
      contentPanel.style.cssText = `
        padding:16px 0;font-size:14px;color:#333;line-height:1.6;
      `;
      root.appendChild(contentPanel);
    }

    // Build tabs
    function buildTabs(): void {
      // Clear existing tab buttons (keep indicator)
      Array.from(tabBar.children).forEach((child) => {
        if (child !== indicator) child.remove();
      });

      items.forEach((item, index) => {
        const tabEl = createTabElement(item, index);
        tabBar.insertBefore(tabEl, indicator);
      });

      updateIndicator();
      renderContent();
    }

    function createTabElement(item: TabItem, _index: number): HTMLElement {
      const sz = SIZE_STYLES[opts.size];
      const vs = VARIANT_STYLES[opts.variant];
      const isActive = item.key === activeKey;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(isActive));
      btn.setAttribute("aria-disabled", String(item.disabled ?? false));
      btn.setAttribute("tabindex", isActive ? "0" : "-1");
      btn.dataset.key = item.key;

      btn.style.cssText = `
        display:inline-flex;align-items:center;gap:6px;
        padding:${sz.paddingY}px ${sz.paddingX}px;
        font-size:${sz.fontSize}px;font-weight:${isActive ? 600 : 400};
        color:${isActive ? vs.activeColor : vs.inactiveColor};
        background:${isActive ? vs.activeBg : "transparent"};
        border:none;cursor:${item.disabled ? "not-allowed" : "pointer"};
        white-space:nowrap;transition:color 0.2s ease, background 0.2s ease;
        flex-shrink:0;position:relative;
        user-select:none;font-family:-apple-system,sans-serif;
        ${opts.variant === "pill"
          ? `border-radius:${sz.height / 2}px;`
          : opts.variant === "enclosed"
            ? `border-radius:6px 6px 0 0;margin-bottom:-1px;z-index:1;`
            : ""}
        ${item.disabled ? "opacity:0.45;" : ""}
        ${item.className ?? ""}
      `;

      // Icon
      if (item.icon) {
        const iconEl = document.createElement("span");
        iconEl.textContent = item.icon;
        iconEl.style.fontSize = `${sz.fontSize + 3}px`;
        btn.appendChild(iconEl);
      }

      // Label
      if (typeof item.label === "string") {
        const labelEl = document.createElement("span");
        labelEl.textContent = item.label;
        btn.appendChild(labelEl);
      } else {
        btn.appendChild(item.label);
      }

      // Badge
      if (item.badge !== undefined) {
        const badge = document.createElement("span");
        badge.textContent = typeof item.badge === "number" && item.badge > 99 ? "99+" : String(item.badge);
        badge.style.cssText = `
          display:inline-flex;align-items:center;justify-content:center;
          min-width:16px;height:16px;padding:0 4px;
          font-size:10px;font-weight:600;border-radius:8px;
          background:#ef4444;color:#fff;margin-left:2px;
        `;
        btn.appendChild(badge);
      }

      // Close button
      if (item.closable) {
        const closeBtn = document.createElement("span");
        closeBtn.innerHTML = "&times;";
        closeBtn.title = item.closable;
        closeBtn.style.cssText = `
          margin-left:2px;font-size:12px;color:#999;cursor:pointer;
          padding:2px;border-radius:3px;display:flex;align-items:center;
        `;
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          instance.removeTab(item.key);
        });
        closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#ef4444"; });
        closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "#999"; });
        btn.appendChild(closeBtn);
      }

      // Click handler
      if (!item.disabled) {
        btn.addEventListener("click", () => switchTo(item.key));
      }

      return btn;
    }

    function switchTo(key: string): void {
      if (key === activeKey) return;
      const item = items.find((i) => i.key === key);
      if (!item?.disabled) {
        if (opts.beforeChange?.(key) === false) return;
        activeKey = key;
        buildTabs();
        opts.onChange?.(key, item!);
      }
    }

    function updateIndicator(): void {
      if (!indicator) return;
      const activeBtn = tabBar.querySelector<HTMLElement>(`[data-key="${activeKey}"]`);
      if (!activeBtn) return;

      const rect = activeBtn.getBoundingClientRect();
      const barRect = tabBar.getBoundingClientRect();

      indicator.style.width = `${rect.width}px`;
      indicator.style.left = `${rect.left - barRect.left}px`;

      if (opts.orientation === "vertical") {
        indicator.style.width = "100%";
        indicator.style.height = `${rect.height}px`;
        indicator.style.left = "0";
        indicator.style.top = `${rect.top - barRect.top}px`;
      }
    }

    function renderContent(): void {
      if (!contentPanel) return;
      const item = items.find((i) => i.key === activeKey);
      if (!item?.content) {
        contentPanel.innerHTML = "";
        return;
      }

      contentPanel.innerHTML = "";
      if (typeof item.content === "string") {
        contentPanel.innerHTML = item.content;
      } else {
        contentPanel.appendChild(item.content);
      }
    }

    // Keyboard navigation
    const keyHandler = (e: KeyboardEvent) => {
      if (destroyed) return;
      const enabledItems = items.filter((i) => !i.disabled);
      const idx = enabledItems.findIndex((i) => i.key === activeKey);

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown": {
          if (opts.orientation === "vertical" && e.key === "ArrowRight") break;
          if (opts.orientation === "horizontal" && e.key === "ArrowDown") break;
          e.preventDefault();
          const nextIdx = (idx + 1) % enabledItems.length;
          switchTo(enabledItems[nextIdx]!.key);
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          if (opts.orientation === "vertical" && e.key === "ArrowLeft") break;
          if (opts.orientation === "horizontal" && e.key === "ArrowUp") break;
          e.preventDefault();
          const prevIdx = (idx - 1 + enabledItems.length) % enabledItems.length;
          switchTo(enabledItems[prevIdx]!.key);
          break;
        }
        case "Home":
          e.preventDefault();
          if (enabledItems[0]) switchTo(enabledItems[0].key);
          break;
        case "End":
          e.preventDefault();
          if (enabledItems.length > 0) switchTo(enabledItems[enabledItems.length - 1]!.key);
          break;
      }
    };

    tabBar.addEventListener("keydown", keyHandler);

    // Initial build
    opts.parent.appendChild(root);
    buildTabs();

    // Instance
    const instance: TabsInstance = {
      element: root,
      tabBar,
      contentPanel,

      setActiveKey(key: string) { switchTo(key); },

      getActiveKey() { return activeKey; },

      addTab(newItem, index) {
        if (index !== undefined) items.splice(index, 0, newItem);
        else items.push(newItem);
        buildTabs();
      },

      removeTab(key) {
        const idx = items.findIndex((i) => i.key === key);
        if (idx < 0) return;
        items.splice(idx, 1);
        if (activeKey === key) {
          activeKey = items[Math.max(0, idx - 1)]?.key ?? "";
        }
        buildTabs();
      },

      updateTab(key, updates) {
        const item = items.find((i) => i.key === key);
        if (item) Object.assign(item, updates);
        buildTabs();
      },

      setDisabled(key, disabled) {
        this.updateTab(key, { disabled });
      },

      destroy() {
        destroyed = true;
        tabBar.removeEventListener("keydown", keyHandler);
        root.remove();
      },
    };

    return instance;
  }
}

/** Convenience: create tabs */
export function createTabs(options: TabsOptions): TabsInstance {
  return new TabsManager().create(options);
}
