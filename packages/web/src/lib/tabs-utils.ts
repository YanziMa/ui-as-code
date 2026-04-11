/**
 * Tabs Utilities: Accessible tab panel with keyboard navigation, ARIA
 * attributes, vertical/horizontal orientation, animated transitions,
 * lazy loading, and programmatic control.
 */

// --- Types ---

export type TabOrientation = "horizontal" | "vertical";
export type TabActivation = "auto" | "manual";

export interface TabItem {
  /** Unique key */
  id: string;
  /** Tab label */
  label: string;
  /** Optional icon (HTML string) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Panel content (HTMLElement or HTML string) */
  content: HTMLElement | string;
  /** Lazy load content (only render when activated) */
  lazy?: boolean;
  /** Badge/count */
  badge?: string | number;
}

export interface TabsOptions {
  /** Tab items */
  items: TabItem[];
  /** Orientation */
  orientation?: TabOrientation;
  /** Activation mode (auto on focus, or manual on click/Enter) */
  activation?: TabActivation;
  /** Initially active tab index */
  defaultIndex?: number;
  /** Animation duration for panel transitions (ms) */
  animationDuration?: number;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when tab changes */
  onChange?: (index: number, tab: TabItem) => void;
  /** Called before tab change (return false to prevent) */
  beforeChange?: (fromIndex: number, toIndex: number) => boolean | Promise<boolean>;
  /** Render custom tab label */
  renderTabLabel?: (tab: TabItem, isActive: boolean) => HTMLElement;
  /** Render custom panel content wrapper */
  renderPanel?: (content: HTMLElement, tab: TabItem) => HTMLElement;
}

export interface TabsInstance {
  /** The root tabs element */
  el: HTMLElement;
  /** Get current active index */
  getActiveIndex: () => number;
  /** Set active tab by index */
  setActiveIndex: (index: number) => void;
  /** Set active tab by id */
  setActiveTab: (id: string) => void;
  /** Get current active tab item */
  getActiveTab: () => TabItem | null;
  /** Get all tab items */
  getItems: () => TabItem[];
  /** Update items dynamically */
  setItems: (items: TabItem[]) => void;
  /** Enable a disabled tab */
  enableTab: (index: number) => void;
  /** Disable a tab */
  disableTab: (index: number) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create an accessible tabs component.
 *
 * @example
 * ```ts
 * const tabs = createTabs({
 *   items: [
 *     { id: "tab1", label: "Overview", content: overviewEl },
 *     { id: "tab2", label: "Settings", content: settingsEl },
 *   ],
 *   onChange: (idx) => console.log("Switched to", idx),
 * });
 * ```
 */
export function createTabs(options: TabsOptions): TabsInstance {
  const {
    items,
    orientation = "horizontal",
    activation = "auto",
    defaultIndex = 0,
    animationDuration = 200,
    className,
    container,
    onChange,
    beforeChange,
    renderTabLabel,
    renderPanel,
  } = options;

  let _activeIndex = Math.min(defaultIndex, items.length - 1);
  let _items = [...items];
  let cleanupFns: Array<() => void> = [];

  // Root
  const root = document.createElement("div");
  root.className = `tabs ${orientation} ${className ?? ""}`.trim();
  root.style.cssText =
    "display:flex;flex-direction:" +
    (orientation === "vertical" ? "row" : "column") + ";";

  // Tab list (header)
  const tabList = document.createElement("div");
  tabList.className = "tab-list";
  tabList.setAttribute("role", "tablist");
  tabList.setAttribute("aria-orientation", orientation);
  tabList.style.cssText =
    orientation === "horizontal"
      ? "display:flex;border-bottom:1px solid #e5e7eb;gap:0;"
      : "display:flex;flex-direction:column;border-right:1px solid #e5e7eb;gap:0;width:auto;";

  // Panels container
  const panelsContainer = document.createElement("div");
  panelsContainer.className = "tab-panels";
  panelsContainer.style.cssText = "flex:1;position:relative;overflow:hidden;";

  root.appendChild(tabList);
  root.appendChild(panelsContainer);

  // Render
  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  function getActiveIndex(): number { return _activeIndex; }

  async function setActiveIndex(index: number): Promise<void> {
    if (index < 0 || index >= _items.length || index === _activeIndex) return;
    if (_items[index]!.disabled) return;

    if (beforeChange) {
      const canChange = await beforeChange(_activeIndex, index);
      if (!canChange) return;
    }

    const prevIndex = _activeIndex;
    _activeIndex = index;

    _updateVisuals(prevIndex, index);
    onChange?.(index, _items[index]!);
  }

  function setActiveTab(id: string): void {
    const idx = _items.findIndex((t) => t.id === id);
    if (idx >= 0) setActiveIndex(idx);
  }

  function getActiveTab(): TabItem | null {
    return _items[_activeIndex] ?? null;
  }

  function getItems(): TabItem[] { return [..._items]; }

  function setItems(newItems: TabItem[]): void {
    _items = newItems;
    _activeIndex = Math.min(_activeIndex, _items.length - 1);
    _render();
  }

  function enableTab(index: number): void {
    if (index >= 0 && index < _items.length) {
      _items[index]!.disabled = false;
      _updateTabDisabled(index, false);
    }
  }

  function disableTab(index: number): void {
    if (index >= 0 && index < _items.length) {
      _items[index]!.disabled = true;
      _updateTabDisabled(index, true);
    }
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Render ---

  function _render(): void {
    tabList.innerHTML = "";
    panelsContainer.innerHTML = "";

    _items.forEach((tab, idx) => {
      // Tab button
      const tabBtn = document.createElement("button");
      tabBtn.className = "tab-trigger";
      tabBtn.setAttribute("role", "tab");
      tabBtn.setAttribute("id", `tab-${tab.id}`);
      tabBtn.setAttribute("aria-selected", String(idx === _activeIndex));
      tabBtn.setAttribute("aria-controls", `panel-${tab.id}`);
      tabBtn.setAttribute("tabIndex", idx === _activeIndex ? "0" : "-1");
      if (tab.disabled) { tabBtn.setAttribute("disabled", ""); tabBtn.setAttribute("aria-disabled", "true"); }

      if (renderTabLabel) {
        const customLabel = renderTabLabel(tab, idx === _activeIndex);
        tabBtn.appendChild(customLabel);
      } else {
        // Default rendering
        if (tab.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.className = "tab-icon";
          iconSpan.innerHTML = tab.icon;
          tabBtn.appendChild(iconSpan);
        }

        const labelSpan = document.createElement("span");
        labelSpan.className = "tab-label";
        labelSpan.textContent = tab.label;
        tabBtn.appendChild(labelSpan);

        if (tab.badge !== undefined) {
          const badge = document.createElement("span");
          badge.className = "tab-badge";
          badge.textContent = String(tab.badge);
          badge.style.cssText =
            "background:#3b82f6;color:#fff;font-size:11px;padding:1px 6px;" +
            "border-radius:10px;margin-left:6px;line-height:1;";
          tabBtn.appendChild(badge);
        }
      }

      // Default styles
      tabBtn.style.cssText =
        "display:flex;align-items:center;gap:6px;padding:8px 16px;" +
        "border:none;background:none;cursor:pointer;font-size:14px;color:#6b7280;" +
        "white-space:nowrap;position:relative;transition:color 0.15s,border-color 0.15s;" +
        (idx === _activeIndex
          ? "color:#111827;font-weight:500;" +
            (orientation === "horizontal"
              ? "border-bottom:2px solid #3b82f6;margin-bottom:-1px;"
              : "border-right:2px solid #3b82f6;margin-right:-1px;background:#f9fafb;")
          : "") +
        (tab.disabled ? "opacity:0.5;cursor:not-allowed;" : "");

      // Hover effect for non-disabled, non-active tabs
      if (!tab.disabled && idx !== _activeIndex) {
        tabBtn.addEventListener("mouseenter", () => { tabBtn.style.color = "#374151"; });
        tabBtn.addEventListener("mouseleave", () => { tabBtn.style.color = "#6b7280"; });
      }

      tabBtn.addEventListener("click", () => { setActiveIndex(idx); });

      tabList.appendChild(tabBtn);

      // Panel
      const panel = document.createElement("div");
      panel.className = "tab-panel";
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("id", `panel-${tab.id}`);
      panel.setAttribute("aria-labelledby", `tab-${tab.id}`);
      panel.style.cssText =
        `position:absolute;inset:0;${idx === _activeIndex ? "" : "display:none;"}` +
        "padding:16px;overflow:auto;animation:fadeIn 0.2s ease;";

      if (!tab.lazy || idx === _activeIndex) {
        if (typeof tab.content === "string") {
          panel.innerHTML = tab.content;
        } else {
          panel.appendChild(tab.content.cloneNode(true));
        }
      }

      if (renderPanel && typeof tab.content !== "string") {
        const wrapped = renderPanel(panel, tab);
        panelsContainer.appendChild(wrapped);
      } else {
        panelsContainer.appendChild(panel);
      }
    });

    _setupKeyboardNav();
  }

  function _updateVisuals(fromIdx: number, toIdx: number): void {
    // Update tab buttons
    const allTabs = tabList.querySelectorAll<HTMLElement>('[role="tab"]');
    allTabs.forEach((tab, i) => {
      const isFrom = i === fromIdx;
      const isTo = i === toIdx;

      tab.setAttribute("aria-selected", String(isTo));
      tab.setAttribute("tabIndex", isTo ? "0" : "-1");

      if (isTo) {
        tab.style.color = "#111827";
        tab.style.fontWeight = "500";
        if (orientation === "horizontal") {
          tab.style.borderBottom = "2px solid #3b82f6";
          tab.style.marginBottom = "-1px";
        } else {
          tab.style.borderRight = "2px solid #3b82f6";
          tab.style.marginRight = "-1px";
          tab.style.background = "#f9fafb";
        }
        tab.focus();
      } else if (isFrom) {
        tab.style.color = "#6b7280";
        tab.style.fontWeight = "";
        tab.style.borderBottom = "";
        tab.style.marginBottom = "";
        tab.style.borderRight = "";
        tab.style.marginRight = "";
        tab.style.background = "";
      }
    });

    // Update panels
    const allPanels = panelsContainer.querySelectorAll<HTMLElement>('[role="tabpanel"]');
    allPanels.forEach((panel, i) => {
      if (i === toIdx) {
        // Lazy load
        const tab = _items[i];
        if (tab?.lazy && panel.children.length === 0) {
          if (typeof tab!.content === "string") {
            panel.innerHTML = tab!.content;
          } else {
            panel.appendChild(tab!.content.cloneNode(true));
          }
        }
        panel.style.display = "";
      } else if (i === fromIdx) {
        panel.style.display = "none";
      }
    });
  }

  function _updateTabDisabled(index: number, disabled: boolean): void {
    const tab = tabList.querySelectorAll<HTMLElement>('[role="tab"]')[index];
    if (!tab) return;
    if (disabled) {
      tab.setAttribute("disabled", "");
      tab.setAttribute("aria-disabled", "true");
      tab.style.opacity = "0.5";
      tab.style.cursor = "not-allowed";
    } else {
      tab.removeAttribute("disabled");
      tab.removeAttribute("aria-disabled");
      tab.style.opacity = "";
      tab.style.cursor = "";
    }
  }

  function _setupKeyboardNav(): void {
    const handler = (e: KeyboardEvent): void => {
      const focusedTab = document.activeElement;
      if (!focusedTab?.getAttribute("role")) return;
      if ((focusedTab as HTMLElement).closest(".tabs") !== root) return;

      const tabs = Array.from(tabList.querySelectorAll<HTMLElement>('[role="tab"]:not([disabled])'));
      const currentIndex = tabs.indexOf(focusedTab as HTMLElement);
      if (currentIndex < 0) return;

      let nextIndex: number;

      switch (e.key) {
        case orientation === "horizontal" ? "ArrowRight" : "ArrowDown":
          e.preventDefault();
          nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          break;
        case orientation === "horizontal" ? "ArrowLeft" : "ArrowUp":
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      tabs[nextIndex]?.focus();
      if (activation === "auto") {
        const targetIdx = _items.findIndex((t) => t.id === tabs[nextIndex]?.id);
        if (targetIdx >= 0) setActiveIndex(targetIdx);
      }
    };

    tabList.addEventListener("keydown", handler);
    cleanupFns.push(() => tabList.removeEventListener("keydown", handler));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: root, getActiveIndex, setActiveIndex, setActiveTab, getActiveTab, getItems, setItems, enableTab, disableTab, destroy };
}
