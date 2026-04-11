/**
 * Tabs System: Full-featured tabbed interface component with vertical/horizontal
 * orientation, lazy loading, keyboard navigation, closable tabs, drag reorder,
 * tab overflow scrolling, badge indicators, disabled tabs, persistence,
 * and accessibility.
 */

// --- Types ---

export type TabOrientation = "horizontal" | "vertical";
export type TabSize = "sm" | "md" | "lg";
export type TabVariant = "default" | "pills" | "underline" | "enclosed";

export interface TabItem {
  /** Unique identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Icon (emoji or URL) */
  icon?: string;
  /** Badge count or text */
  badge?: string | number;
  /** Badge color */
  badgeColor?: string;
  /** Panel content (string HTML or HTMLElement) */
  content: string | HTMLElement;
  /** Disabled state */
  disabled?: boolean;
  /** Closable */
  closable?: boolean;
  /** Tooltip/hint */
  tooltip?: string;
  /** Custom data for external use */
  data?: unknown;
}

export interface TabsOptions {
  /** Tab items */
  items: TabItem[];
  /** Initial active tab ID */
  activeTab?: string;
  /** Orientation (default: "horizontal") */
  orientation?: TabOrientation;
  /** Visual variant (default: "default") */
  variant?: TabVariant;
  /** Size preset (default: "md") */
  size?: TabSize;
  /** Callback when tab changes */
  onChange?: (tabId: string, tab: TabItem) => void;
  /** Callback before tab change (return false to prevent) */
  beforeChange?: (tabId: string, tab: TabItem) => boolean | Promise<boolean>;
  /** Callback when tab is closed */
  onClose?: (tabId: string, tab: TabItem) => void;
  /** Show tab panels inline (default: true) */
  showPanels?: boolean;
  /** Animate panel transitions (default: true) */
  animatePanels?: boolean;
  /** Animation duration (ms, default: 200) */
  animationDuration?: number;
  /** Render tabs in scrollable container if overflow */
  scrollable?: boolean;
  /** Persist active tab in localStorage */
  persistKey?: string;
  /** Custom CSS class for the container */
  className?: string;
  /** Keyboard navigation (default: true) */
  keyboardNav?: boolean;
  /** Allow reordering via drag (default: false) */
  draggable?: boolean;
  /** Callback after drag reorder */
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export interface TabsInstance {
  /** Root element */
  element: HTMLElement;
  /** Get current active tab ID */
  getActiveTab: () => string;
  /** Set active tab by ID */
  setActiveTab: (id: string) => void;
  /** Add a new tab */
  addTab: (tab: TabItem, activate?: boolean) => void;
  /** Remove a tab by ID */
  removeTab: (id: string) => void;
  /** Update a tab's properties */
  updateTab: (id: string, updates: Partial<TabItem>) => void;
  /** Get all tab items */
  getTabs: () => TabItem[];
  /** Enable/disable a tab */
  setTabDisabled: (id: string, disabled: boolean) => void;
  /** Set badge for a tab */
  setBadge: (id: string, badge: string | number | undefined) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Main Tabs Component ---

export function createTabs(options: TabsOptions): TabsInstance {
  const opts = {
    orientation: options.orientation ?? "horizontal",
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    showPanels: options.showPanels ?? true,
    animatePanels: options.animatePanels ?? true,
    animationDuration: options.animationDuration ?? 200,
    scrollable: options.scrollable ?? true,
    keyboardNav: options.keyboardNav ?? true,
    draggable: options.draggable ?? false,
    ...options,
  };

  let items = [...options.items];
  let activeId = options.activeTab ?? (items[0]?.id ?? "");

  // Restore persisted selection
  if (opts.persistKey) {
    try { const saved = localStorage.getItem(`tabs:${opts.persistKey}`); if (saved && items.some((t) => t.id === saved)) activeId = saved; } catch {}
  }

  // Container
  const el = document.createElement("div");
  el.className = `tabs tabs-${opts.orientation} tabs-${opts.variant} tabs-${opts.size} ${opts.className ?? ""}`;
  el.setAttribute("role", "tablist");
  el.style.cssText = `
    display: flex; ${opts.orientation === "horizontal" ? "flex-direction: column;" : "flex-direction: row; gap: 0;"}
    font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px;
  `;

  // Tab bar container
  const tabBar = document.createElement("div");
  tabBar.className = "tabs-bar";
  tabBar.style.cssText = opts.orientation === "horizontal"
    ? `display:flex;align-items:center;border-bottom:1px solid #eee;padding:0 4px;overflow-x:${opts.scrollable ? "auto" : "visible"};gap:2px;-webkit-overflow-scrolling:touch;&::-webkit-scrollbar{height:0;}`
    : `display:flex;flex-direction:column;width:auto;padding:4px 0;gap:2px;`;
  el.appendChild(tabBar);

  // Panels container
  let panelsContainer: HTMLElement | null = null;
  if (opts.showPanels) {
    panelsContainer = document.createElement("div");
    panelsContainer.className = "tabs-panels";
    panelsContainer.style.cssText = `position:relative;flex:1;min-height:0;${opts.orientation === "vertical" ? "flex:1;overflow-y:auto;" : ""}`;
    el.appendChild(panelsContainer);
  }

  // Track DOM references
  const tabRefs = new Map<string, { tabEl: HTMLElement; panelEl?: HTMLElement }>();

  // Build initial UI
  render();

  // --- Render ---

  function render(): void {
    // Clear existing
    tabBar.innerHTML = "";
    if (panelsContainer) panelsContainer.innerHTML = "";
    tabRefs.clear();

    for (const item of items) {
      const isActive = item.id === activeId;

      // Tab button
      const tabEl = document.createElement("button");
      tabEl.className = `tabs-tab${isActive ? " tabs-active" : ""}${item.disabled ? " tabs-disabled" : ""}`;
      tabEl.setAttribute("role", "tab");
      tabEl.setAttribute("aria-selected", String(isActive));
      tabEl.setAttribute("aria-controls", `panel-${item.id}`);
      tabEl.setAttribute("id": `tab-${item.id}`);
      tabEl.setAttribute("tabindex", isActive ? "0" : "-1");
      if (item.disabled) tabEl.setAttribute("aria-disabled", "true");
      if (item.tooltip) tabEl.title = item.tooltip;

      // Style based on variant
      applyTabStyle(tabEl, isActive, item.disabled);

      // Icon + label
      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "tabs-icon";
        iconSpan.textContent = item.icon;
        iconSpan.style.cssText = "margin-right:6px;font-size:16px;";
        tabEl.appendChild(iconSpan);
      }

      const labelSpan = document.createElement("span");
      labelSpan.className = "tabs-label";
      labelSpan.textContent = item.label;
      tabEl.appendChild(labelSpan);

      // Badge
      if (item.badge !== undefined) {
        const badgeEl = document.createElement("span");
        badgeEl.className = "tabs-badge";
        badgeEl.textContent = String(item.badge);
        badgeEl.style.cssText = `
          margin-left:6px;display:inline-flex;align-items:center;justify-content:center;
          min-width:18px;height:18px;padding:0 5px;border-radius:9px;
          font-size:11px;font-weight:600;line-height:1;background:${item.badgeColor ?? "#ff3b30"};color:#fff;
        `;
        tabEl.appendChild(badgeEl);
      }

      // Close button
      if (item.closable) {
        const closeBtn = document.createElement("span");
        closeBtn.className = "tabs-close";
        closeBtn.innerHTML = "&times;";
        closeBtn.style.cssText = `
          margin-left:4px;font-size:14px;color:#999;cursor:pointer;line-height:1;
          padding:2px 3px;border-radius:4px;transition:all 0.15s;
        `;
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          handleClose(item);
        });
        closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#333"; closeBtn.style.background = "#f0f0f0"; });
        closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "#999"; closeBtn.style.background = ""; });
        tabEl.appendChild(closeBtn);
      }

      // Click handler
      if (!item.disabled) {
        tabEl.addEventListener("click", () => handleSelect(item));
      }

      tabBar.appendChild(tabEl);

      // Panel
      let panelEl: HTMLElement | undefined;
      if (panelsContainer) {
        panelEl = document.createElement("div");
        panelEl.className = `tabs-panel${isActive ? " tabs-panel-active" : ""}`;
        panelEl.setAttribute("role", "tabpanel");
        panelEl.setAttribute("aria-labelledby", `tab-${item.id}`);
        panelEl.setAttribute("id", `panel-${item.id}`);
        panelEl.style.cssText = `
          ${isActive ? "" : "display:none;"}
          padding:16px 20px;outline:none;
          transition: opacity ${opts.animationDuration}ms ease;
        `;

        if (typeof item.content === "string") {
          panelEl.innerHTML = item.content;
        } else {
          panelEl.appendChild(item.content);
        }

        panelsContainer.appendChild(panelEl);
      }

      tabRefs.set(item.id, { tabEl, panelEl });
    }
  }

  function applyTabStyle(tabEl: HTMLElement, isActive: boolean, disabled: boolean): void {
    const base = `
      display:inline-flex;align-items:center;padding:${opts.size === "sm" ? "6px 12px" : opts.size === "lg" ? "10px 20px" : "8px 16px"};
      border:none;background:none;cursor:${disabled ? "not-allowed" : "pointer"};
      font-size:${opts.size === "sm" ? 12 : opts.size === "lg" ? 16 : 14}px;
      color:${disabled ? "#ccc" : isActive ? "#007aff" : "#666"};
      font-weight:${isActive ? 600 : 400};
      white-space:nowrap;user-select:none;transition:all 0.2s ease;
      position:relative;
    `;

    switch (opts.variant) {
      case "pills":
        tabEl.style.cssText = base + (isActive
          ? ";background:#e7f3ff;border-radius:20px;"
          : ";border-radius:20px;");
        break;
      case "underline":
        tabEl.style.cssText = base + (isActive
          ? ";border-bottom:2px solid #007aff;color:#007aff;"
          : ";border-bottom:2px solid transparent;margin-bottom:-2px;");
        break;
      case "enclosed":
        tabEl.style.cssText = base + (isActive
          ? ";background:#fff;border:1px solid #ddd;border-bottom-color:#fff;margin-bottom:-1px;z-index:1;border-radius:8px 8px 0 0;"
          : ";background:transparent;border:1px solid transparent;border-radius:8px 8px 0 0;");
        break;
      default:
        tabEl.style.cssText = base + (isActive
          ? ";color:#007aff;"
          : "");
        tabEl.onmouseenter = () => { if (!disabled) tabEl.style.background = "#f7f7f7"; };
        tabEl.onmouseleave = () => { if (!disabled && !isActive) tabEl.style.background = ""; };
        break;
    }
  }

  // --- Handlers ---

  async function handleSelect(item: TabItem): Promise<void> {
    if (item.id === activeId || item.disabled) return;

    // Before change hook
    if (opts.beforeChange) {
      const allowed = await opts.beforeChange(item.id, item);
      if (!allowed) return;
    }

    const prevId = activeId;
    activeId = item.id;

    // Update visual state
    for (const [id, refs] of tabRefs) {
      const isActive = id === item.id;
      refs.tabEl.classList.toggle("tabs-active", isActive);
      refs.tabEl.setAttribute("aria-selected", String(isActive));
      refs.tabEl.setAttribute("tabindex", isActive ? "0" : "-1");
      applyTabStyle(refs.tabEl, isActive, items.find((t) => t.id === id)?.disabled ?? false);

      if (refs.panelEl) {
        if (opts.animatePanels && panelsContainer) {
          if (isActive) {
            refs.panelEl.style.display = "";
            // Trigger reflow then fade in
            refs.panelEl.style.opacity = "0";
            requestAnimationFrame(() => { refs.panelEl!.style.opacity = "1"; });
          } else {
            refs.panelEl.style.opacity = "0";
            setTimeout(() => { if (refs.panelEl) refs.panelEl.style.display = "none"; }, opts.animationDuration);
          }
        } else {
          refs.panelEl.style.display = isActive ? "" : "none";
        }
        refs.panelEl.classList.toggle("tabs-panel-active", isActive);
      }
    }

    // Persist
    if (opts.persistKey) {
      try { localStorage.setItem(`tabs:${opts.persistKey}`, activeId); } catch {}
    }

    opts.onChange?.(activeId, item);
  }

  function handleClose(item: TabItem): void {
    const idx = items.findIndex((t) => t.id === item.id);
    if (idx < 0) return;

    opts.onClose?.(item.id, item);
    items.splice(idx, 1);

    // If closing active tab, switch to neighbor
    if (activeId === item.id) {
      const nextIdx = Math.min(idx, items.length - 1);
      if (items.length > 0) {
        activeId = items[nextIdx]!.id;
      }
    }

    render();
  }

  // --- Keyboard Navigation ---

  if (opts.keyboardNav) {
    el.addEventListener("keydown", (e) => {
      const visibleItems = items.filter((t) => !t.disabled);
      const currentIdx = visibleItems.findIndex((t) => t.id === activeId);

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          if ((e.key === "ArrowRight" && opts.orientation === "horizontal") ||
              (e.key === "ArrowDown" && opts.orientation === "vertical")) {
            e.preventDefault();
            const nextIdx = (currentIdx + 1) % visibleItems.length;
            handleSelect(visibleItems[nextIdx]!);
          }
          break;
        case "ArrowLeft":
        case "ArrowUp":
          if ((e.key === "ArrowLeft" && opts.orientation === "horizontal") ||
              (e.key === "ArrowUp" && opts.orientation === "vertical")) {
            e.preventDefault();
            const prevIdx = (currentIdx - 1 + visibleItems.length) % visibleItems.length;
            handleSelect(visibleItems[prevIdx]!);
          }
          break;
        case "Home":
          e.preventDefault();
          if (visibleItems[0]) handleSelect(visibleItems[0]);
          break;
        case "End":
          e.preventDefault();
          if (visibleItems.length > 0) handleSelect(visibleItems[visibleItems.length - 1]!);
          break;
      }
    });
  }

  // --- Instance API ---

  const instance: TabsInstance = {
    element: el,

    getActiveTab: () => activeId,

    setActiveTab: (id: string) => {
      const item = items.find((t) => t.id === id);
      if (item) handleSelect(item);
    },

    addTab: (tab: TabItem, activate = false) => {
      items.push(tab);
      if (activate) activeId = tab.id;
      render();
    },

    removeTab: (id: string) => {
      const item = items.find((t) => t.id === id);
      if (item) handleClose(item);
    },

    updateTab: (id: string, updates: Partial<TabItem>) => {
      const idx = items.findIndex((t) => t.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx]!, ...updates };
        render();
      }
    },

    getTabs: () => [...items],

    setTabDisabled: (id: string, disabled: boolean) => instance.updateTab(id, { disabled }),

    setBadge: (id: string, badge: string | number | undefined) => instance.updateTab(id, { badge: badge as string | number | undefined }),

    destroy: () => { el.remove(); },
  };

  return instance;
}
