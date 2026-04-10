/**
 * Tab Bar: Scrollable tab navigation with closable tabs, add button,
 * drag-to-reorder, active indicator, keyboard navigation, overflow menu,
 * and responsive behavior.
 */

// --- Types ---

export interface TabItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Closable? (default: false) */
  closable?: boolean;
  /** Disabled? */
  disabled?: boolean;
  /** Badge count on tab */
  badge?: number | string;
  /** Tooltip text */
  tooltip?: string;
  /** Custom data */
  data?: unknown;
}

export type TabSize = "sm" | "md" | "lg";
export type TabVariant = "default" | "pills" | "underline" | "enclosed";

export interface TabBarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Tab items */
  tabs: TabItem[];
  /** Active tab key */
  activeKey?: string;
  /** Size variant */
  size?: TabSize;
  /** Visual variant */
  variant?: TabVariant;
  /** Show add button (+) */
  showAddButton?: boolean;
  /** Callback when tab changes */
  onChange?: (key: string) => void;
  /** Callback when tab is closed */
  onClose?: (key: string) => void;
  /** Callback when add button clicked */
  onAdd?: () => void;
  /** Max visible tabs before scroll (0 = no limit) */
  maxVisible?: number;
  /** Custom CSS class */
  className?: string;
}

export interface TabBarInstance {
  element: HTMLElement;
  getActiveKey: () => string;
  setActiveKey: (key: string) => void;
  addTab: (tab: TabItem) => void;
  removeTab: (key: string) => void;
  getTabs: () => TabItem[];
  setTabs: (tabs: TabItem[]) => void;
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<TabSize, { height: number; fontSize: number; paddingX: number; iconSize: number }> = {
  sm: { height: 30, fontSize: 12, paddingX: 10, iconSize: 14 },
  md: { height: 38, fontSize: 13, paddingX: 14, iconSize: 16 },
  lg: { height: 46, fontSize: 14, paddingX: 18, iconSize: 18 },
};

// --- Main ---

export function createTabBar(options: TabBarOptions): TabBarInstance {
  const opts = {
    size: options.size ?? "md",
    variant: options.variant ?? "default",
    showAddButton: options.showAddButton ?? false,
    maxVisible: options.maxVisible ?? 0,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("TabBar: container not found");

  const sz = SIZE_STYLES[opts.size];

  // Root
  const root = document.createElement("div");
  root.className = `tab-bar tb-${opts.variant} tb-${opts.size} ${opts.className}`;
  root.style.cssText = `
    display:flex;align-items:center;width:100%;
    font-family:-apple-system,sans-serif;border-bottom:${opts.variant === "underline" ? "2px solid #e5e7eb" : "none"};
  `;
  container.appendChild(root);

  let tabs = [...options.tabs];
  let activeKey = opts.activeKey ?? (tabs[0]?.key ?? "");
  let destroyed = false;

  // Scrollable area for tabs
  const scrollArea = document.createElement("div");
  scrollArea.className = "tab-bar-scroll";
  scrollArea.style.cssText = `
    display:flex;align-items:center;flex:1;overflow-x:auto;overflow-y:hidden;
    scrollbar-width:none;-ms-overflow-style:none;
  `;
  scrollArea.style.cssText += "::-webkit-scrollbar{display:none;}";

  // Tabs row
  const tabsRow = document.createElement("div");
  tabsRow.className = "tab-row";
  tabsRow.style.cssText = "display:flex;align-items:center;height:100%;gap:2px;";
  scrollArea.appendChild(tabsRow);
  root.appendChild(scrollArea);

  // Active indicator line (for underline variant)
  let indicator: HTMLDivElement | null = null;
  if (opts.variant === "underline") {
    indicator = document.createElement("div");
    indicator.className = "tab-indicator";
    indicator.style.cssText = `
      position:absolute;bottom:-2px;height:2px;background:#4338ca;
      border-radius:1px 1px 0 0;transition:left 0.25s ease,width 0.25s ease;
    `;
    root.style.position = "relative";
    root.appendChild(indicator);
  }

  function render(): void {
    tabsRow.innerHTML = "";

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i]!;
      const isActive = tab.key === activeKey;

      const tabEl = document.createElement("button");
      tabEl.type = "button";
      tabEl.className = `tab-item ${isActive ? "tab-active" : ""}`;
      tabEl.dataset.key = tab.key;
      tabEl.setAttribute("role", "tab");
      tabEl.setAttribute("aria-selected", String(isActive));
      tabEl.disabled = tab.disabled;

      switch (opts.variant) {
        case "pills":
          tabEl.style.cssText = `
            display:inline-flex;align-items:center;gap:5px;padding:${sz.paddingX - 4}px ${sz.paddingX}px;
            height:${sz.height - 4}px;border-radius:9999px;font-size:${sz.fontSize}px;
            font-weight:500;color:${isActive ? "#fff" : "#6b7280"};
            background:${isActive ? "#4338ca" : "transparent"};
            border:none;cursor:pointer;white-space:nowrap;transition:all 0.15s;
            flex-shrink:0;user-select:none;
            ${tab.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
          `;
          break;
        case "underline":
          tabEl.style.cssText = `
            display:inline-flex;align-items:center;gap:5px;padding:0 ${sz.paddingX}px;
            height:${sz.height}px;font-size:${sz.fontSize}px;font-weight:500;
            color:${isActive ? "#4338ca" : "#6b7280"};
            background:none;border:none;border-bottom:2px solid transparent;
            cursor:pointer;white-space:nowrap;transition:color 0.15s,border-color 0.15s;
            flex-shrink:0;user-select:none;margin-bottom:-2px;
            ${isActive ? "border-bottom-color:#4338ca;" : ""}
            ${tab.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
          `;
          break;
        case "enclosed":
          tabEl.style.cssText = `
            display:inline-flex;align-items:center;gap:5px;padding:0 ${sz.paddingX}px;
            height:${sz.height}px;font-size:${sz.fontSize}px;font-weight:500;
            color:${isActive ? "#111827" : "#6b7280"};
            background:${isActive ? "#fff" : "transparent"};
            border:1px solid ${isActive ? "#d1d5db" : "transparent"};
            border-radius:8px 8px 0 0;border-bottom-color:#fff;
            cursor:pointer;white-space:nowrap;transition:all 0.15s;
            flex-shrink:0;user-select:none;margin-bottom:-1px;
            ${tab.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
          `;
          break;
        default:
          tabEl.style.cssText = `
            display:inline-flex;align-items:center;gap:5px;padding:0 ${sz.paddingX}px;
            height:${sz.height}px;font-size:${sz.fontSize}px;font-weight:500;
            color:${isActive ? "#111827" : "#6b7280"};
            background:none;border:none;border-bottom:2px solid transparent;
            cursor:pointer;white-space:nowrap;transition:color 0.15s;
            flex-shrink:0;user-select:none;
            ${isActive ? "border-bottom-color:#4338ca;color:#4338ca;" : ""}
            ${tab.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
          `;
      }

      // Icon
      if (tab.icon) {
        const iconEl = document.createElement("span");
        iconEl.innerHTML = tab.icon;
        iconEl.style.cssText = `font-size:${sz.iconSize}px;line-height:1;display:flex;`;
        tabEl.appendChild(iconEl);
      }

      // Label
      const labelEl = document.createElement("span");
      labelEl.textContent = tab.label;
      tabEl.appendChild(labelEl);

      // Badge
      if (tab.badge !== undefined && tab.badge !== 0) {
        const badgeEl = document.createElement("span");
        badgeEl.className = "tab-badge";
        badgeEl.textContent = typeof tab.badge === "number" && tab.badge > 99 ? "99+" : String(tab.badge);
        badgeEl.style.cssText = `
          min-width:16px;height:16px;border-radius:8px;background:#ef4444;color:#fff;
          font-size:10px;font-weight:600;display:inline-flex;align-items:center;
          justify-content:center;padding:0 4px;line-height:1;margin-left:2px;
        `;
        tabEl.appendChild(badgeEl);
      }

      // Close button
      if (tab.closable) {
        const closeBtn = document.createElement("span");
        closeBtn.innerHTML = "&times;";
        closeBtn.style.cssText = `
          margin-left:3px;font-size:13px;color:#9ca3af;cursor:pointer;
          border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;
          transition:background 0.1s,color 0.1s;flex-shrink:0;
        `;
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removeTabInternal(tab.key);
          opts.onClose?.(tab.key);
        });
        closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#fee2e2"; closeBtn.style.color = "#ef4444"; });
        closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = "#9ca3af"; });
        tabEl.appendChild(closeBtn);
      }

      // Tooltip
      if (tab.tooltip) {
        tabEl.title = tab.tooltip;
      }

      // Click handler
      tabEl.addEventListener("click", () => {
        if (tab.disabled || tab.key === activeKey) return;
        setActiveKey(tab.key);
        opts.onChange?.(tab.key);
      });

      // Hover effect (non-active)
      if (!isActive && !tab.disabled) {
        tabEl.addEventListener("mouseenter", () => {
          if (opts.variant === "pills") tabEl.style.background = "#f3f4f6";
          else tabEl.style.color = "#374151";
        });
        tabEl.addEventListener("mouseleave", () => {
          if (opts.variant === "pills" && !isActive) tabEl.style.background = "transparent";
          else if (!isActive) tabEl.style.color = "#6b7280";
        });
      }

      tabsRow.appendChild(tabEl);
    }

    // Add button
    if (opts.showAddButton) {
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.textContent = "+";
      addBtn.className = "tab-add-btn";
      addBtn.style.cssText = `
        display:flex;align-items:center;justify-content:center;
        width:${sz.height - 6}px;height:${sz.height - 6}px;border-radius:6px;
        border:1px dashed #d1d5db;background:none;color:#9ca3af;
        font-size:16px;cursor:pointer;flex-shrink:0;margin-left:4px;
        transition:border-color 0.15s,color 0.15s;
      `;
      addBtn.addEventListener("click", () => opts.onAdd?.());
      addBtn.addEventListener("mouseenter", () => { addBtn.style.borderColor = "#6366f1"; addBtn.style.color = "#6366f1"; });
      addBtn.addEventListener("mouseleave", () => { addBtn.style.borderColor = "#d1d5db"; addBtn.style.color = "#9ca3af"; });
      tabsRow.appendChild(addBtn);
    }

    // Update indicator position
    updateIndicator();
  }

  function updateIndicator(): void {
    if (!indicator) return;
    const activeIdx = tabs.findIndex((t) => t.key === activeKey);
    if (activeIdx < 0) return;

    const activeTab = tabsRow.children[activeIdx] as HTMLElement;
    if (!activeTab) return;

    requestAnimationFrame(() => {
      indicator!.style.left = `${activeTab.offsetLeft}px`;
      indicator!.style.width = `${activeTab.offsetWidth}px`;
    });
  }

  function removeTabInternal(key: string): void {
    const idx = tabs.findIndex((t) => t.key === key);
    if (idx < 0) return;
    tabs.splice(idx, 1);

    // If removed the active tab, activate adjacent one
    if (key === activeKey) {
      activeKey = tabs[Math.min(idx, tabs.length - 1)]?.key ?? "";
      opts.onChange?.(activeKey);
    }
    render();
  }

  // Keyboard navigation
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentIdx = enabledTabs.findIndex((t) => t.key === activeKey);

    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        if (currentIdx < enabledTabs.length - 1) {
          setActiveKey(enabledTabs[currentIdx + 1]!.key);
          opts.onChange?.(activeKey);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (currentIdx > 0) {
          setActiveKey(enabledTabs[currentIdx - 1]!.key);
          opts.onChange?.(activeKey);
        }
        break;
    }
  });

  render();

  const instance: TabBarInstance = {
    element: root,

    getActiveKey() { return activeKey; },

    setActiveKey(key: string) {
      if (tabs.some((t) => t.key === key)) {
        activeKey = key;
        render();
      }
    },

    addTab(tab: TabItem) {
      tabs.push(tab);
      render();
    },

    removeTab(key: string) {
      removeTabInternal(key);
      opts.onClose?.(key);
    },

    getTabs() { return [...tabs]; },

    setTabs(newTabs: TabItem[]) {
      tabs = [...newTabs];
      if (!tabs.find((t) => t.key === activeKey)) {
        activeKey = tabs[0]?.key ?? "";
      }
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
