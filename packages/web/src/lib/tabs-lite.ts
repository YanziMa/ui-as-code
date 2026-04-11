/**
 * Lightweight Tabs: Tab navigation with 4 variants (line/pill/enclosed/underline),
 * horizontal/vertical orientation, animated indicator, lazy content loading,
 * closable tabs, badges, and keyboard navigation.
 */

// --- Types ---

export type TabsVariant = "line" | "pill" | "enclosed" | "underline";
export type TabsDirection = "horizontal" | "vertical";

export interface TabItem {
  /** Unique key */
  key: string;
  /** Label text */
  label: string;
  /** Icon (emoji or HTML) */
  icon?: string | HTMLElement;
  /** Disabled? */
  disabled?: boolean;
  /** Badge count text */
  badge?: string | number;
  /** Content (lazy-loaded) */
  content?: string | HTMLElement;
  /** Closable? */
  closable?: boolean;
}

export interface TabsOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Tab items */
  tabs: TabItem[];
  /** Active tab key */
  activeKey?: string;
  /** Visual variant */
  variant?: TabsVariant;
  /** Direction */
  direction?: TabsDirection;
  /** Show tab icons? */
  showIcons?: boolean;
  /** Animated indicator? */
  animated?: boolean;
  /** Callback on tab change */
  onChange?: (key: string) => void;
  /** Callback on tab close */
  onClose?: (key: string) => void;
  /** Custom CSS class */
  className?: string;
}

export interface TabsInstance {
  element: HTMLElement;
  getActiveKey: () => string | null;
  setActiveKey: (key: string) => void;
  getTabs: () => TabItem[];
  setTabs: (tabs: TabItem[]) => void;
  addTab: (tab: TabItem) => void;
  removeTab: (key: string) => void;
  destroy: () => void;
}

// --- Config ---

const VARIANT_STYLES: Record<TabsVariant, {
  bg: string; activeBg: string; color: string; activeColor: string;
  border: string; indicatorBg: string; borderRadius: number;
}> = {
  line:      { bg: "#f3f4f6", activeBg: "#fff", color: "#6b7280", activeColor: "#111827", border: "#e5e7eb", indicatorBg: "#4f46e5", borderRadius: 0 },
  pill:     { bg: "#f3f4f6", activeBg: "#4f46e5", color: "#6b7280", activeColor: "#fff", border: "transparent", indicatorBg: "#fff", borderRadius: 9999 },
  enclosed: { bg: "#f3f4f6", activeBg: "#fff", color: "#6b7280", activeColor: "#111827", border: "#d1d5db", indicatorBg: "#4f46e5", borderRadius: 8 },
  underline: { bg: "transparent", activeBg: "transparent", color: "#6b7280", activeColor: "#11182727", border: "transparent", indicatorBg: "#4f46e5", borderRadius: 0 },
};

// --- Main Factory ---

export function createTabs(options: TabsOptions): TabsInstance {
  const opts = {
    activeKey: options.activeKey ?? options.tabs[0]?.key,
    variant: options.variant ?? "line",
    direction: options.direction ?? "horizontal",
    showIcons: options.showIcons ?? true,
    animated: options.animated ?? true,
    className: options.className ?? "",
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Tabs: container not found");

  let tabs = [...options.tabs];
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `tabs tabs-${opts.variant} ${opts.direction} ${opts.className}`;
  root.style.cssText = `
    font-family:-apple-system,sans-serif;color:#374151;
    ${opts.direction === "vertical"
      ? "display:flex;"
      : ""}
  `;
  container.appendChild(root);

  // Tab list
  const tabList = document.createElement("div");
  tabList.className = "tab-list";
  tabList.setAttribute("role": "tablist");
  tabList.style.cssText = opts.direction === "vertical"
    ? "display:flex;flex-direction:column;"
    : "display:flex;border-bottom:${opts.variant === "underline" ? "2px solid #e5e7eb" : ""};gap:0;";
  root.appendChild(tabList);

  // Indicator (animated underline/pill)
  const indicator = document.createElement("div");
  indicator.className = "tab-indicator";
  indicator.style.cssText = `
    position:absolute;height:${opts.variant === "underline" ? "2px" : "100%"};
    background:${VARIANT_STYLES[opts.variant].indicatorBg};
    border-radius:${VARIANT_STYLES[opts.variant].borderRadius}px;
    transition:transform 0.25s ease,width 0.25s ease;
    z-index:1;
  `;
  if (opts.variant !== "underline") {
    tabList.style.position = "relative";
    tabList.appendChild(indicator);
  }

  // Panel area
  const panel = document.createElement("div");
  panel.className = "tab-panel";
  panel.style.cssText = "padding:16px 0;font-size:14px;color:#374151;";
  root.appendChild(panel);

  let panelContent: Map<string, HTMLElement> = new Map();

  function render(): void {
    tabList.innerHTML = "";
    if (opts.variant !== "underline") tabList.appendChild(indicator);

    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i]!;
      const isActive = tab.key === opts.activeKey;
      const vs = VARIANT_STYLES[opts.variant];

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "tab-btn";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(isActive));
      btn.dataset.key = tab.key;
      if (tab.disabled) btn.disabled = true;

      btn.style.cssText = `
        display:inline-flex;align-items:center;gap:6px;padding:10px 16px;
        position:relative;background:${isActive ? vs.activeBg : vs.bg};
        color:${isActive ? vs.activeColor : vs.color};
        border:none;border-radius:${vs.borderRadius}px;
        font-size:13px;font-weight:500;cursor:pointer;
        font-family:inherit;line-height:1.4;white-space:nowrap;
        transition:background 0.2s,color 0.2s;
        ${tab.disabled ? "opacity:0.4;cursor:not-allowed;" : ""}
        ${opts.direction === "vertical" ? "width:100%;text-align:left;" : ""}
      `;

      // Icon
      if (opts.showIcons && tab.icon) {
        const iconEl = document.createElement("span");
        iconEl.style.cssText = "display:flex;align-items:center;flex-shrink:0;";
        if (typeof tab.icon === "string") {
          iconEl.textContent = tab.icon;
          iconEl.style.fontSize = "14px";
        } else {
          iconEl.appendChild(tab.icon);
        }
        btn.insertBefore(iconEl, btn.firstChild);
      }

      // Label
      const labelEl = document.createElement("span");
      labelEl.textContent = tab.label;
      btn.appendChild(labelEl);

      // Badge
      if (tab.badge != null) {
        const badgeEl = document.createElement("span");
        badgeEl.textContent = String(tab.badge);
        badgeEl.style.cssText = `
          display:inline-flex;align-items:center;justify-content:center;
          min-width:18px;height:18px;border-radius:9px;
          background:#ef4444;color:#fff;font-size:10px;font-weight:600;
          padding:0 6px;margin-left:4px;
        `;
        btn.appendChild(badgeEl);
      }

      // Close button for closable tabs
      if (tab.closable) {
        const closeBtn = document.createElement("span");
        closeBtn.innerHTML = "&times;";
        closeBtn.style.cssText = `
          margin-left:6px;cursor:pointer;font-size:12px;color:#9ca3af;
          padding:2px;display:flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;
        `;
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removeTab(tab.key);
          opts.onClose?.(tab.key);
        });
        btn.appendChild(closeBtn);
      }

      btn.addEventListener("click", () => {
        if (tab.disabled || destroyed) return;
        instance.setActiveKey(tab.key);
      });

      tabList.appendChild(btn);
    }

    // Position indicator
    if (opts.variant !== "underline") {
      updateIndicator();
    }

    // Render active panel
    renderPanel();
  }

  function updateIndicator(): void {
    const activeBtn = tabList.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!activeBtn) return;

    if (opts.variant === "underline") {
      indicator.style.width = `${activeBtn.offsetWidth}px`;
      indicator.style.left = `${activeBtn.offsetLeft}px`;
    } else {
      indicator.style.width = `${activeBtn.offsetWidth}px`;
      indicator.style.left = `${activeBtn.offsetLeft}px`;
    }
  }

  function renderPanel(): void {
    panel.innerHTML = "";

    const activeTab = tabs.find((t) => t.key === opts.activeKey);
    if (!activeTab) return;

    if (activeTab.content) {
      if (typeof activeTab.content === "string") {
        panel.innerHTML = activeTab.content;
      } else {
        panel.appendChild(activeTab.content);
      }
      panelContent.set(opts.activeKey!, panel);
    } else {
      // No content - show empty or placeholder
      const placeholder = document.createElement("div");
      placeholder.textContent = `Content for "${activeTab.label}"`;
      placeholder.style.cssText = "color:#9ca3af;text-align:center;padding:40px 0;";
      panel.appendChild(placeholder);
    }
  }

  function removeTab(key: string): void {
    tabs = tabs.filter((t) => t.key !== key);
    if (opts.activeKey === key && tabs.length > 0) {
      opts.activeKey = tabs[0]?.key;
    }
    render();
    opts.onChange?.(opts.activeKey!);
  }

  render();

  const instance: TabsInstance = {
    element: root,

    getActiveKey() { return opts.activeKey; },

    setActiveKey(key: string) {
      if (key === opts.activeKey || destroyed) return;
      opts.activeKey = key;
      render();
      opts.onChange?.(key);
    },

    getTabs() { return [...tabs]; },

    setTabs(newTabs: TabItem[]) {
      tabs = newTabs;
      if (!tabs.find((t) => t.key === opts.activeKey)) {
        opts.activeKey = newTabs[0]?.key;
      }
      panelContent.clear();
      render();
    },

    addTab(newTab: TabItem) {
      tabs.push(newTab);
      render();
    },

    removeTab(key: string) { removeTab(key); },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
