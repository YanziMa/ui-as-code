/**
 * Tab Utilities: Accessible tab panel system with keyboard navigation,
 * ARIA tabs pattern, lazy panel loading, vertical/horizontal orientation,
 * tab activation modes, and dynamic tab management.
 */

// --- Types ---

export type TabOrientation = "horizontal" | "vertical";
export type TabActivation = "auto" | "manual"; // auto = focus activates; manual = Enter/Space activates

export interface TabItem {
  /** Unique key */
  id: string;
  /** Tab label */
  label: string;
  /** Optional icon (HTML string or element) */
  icon?: string | HTMLElement;
  /** Panel content (HTMLElement or HTML string) */
  content: HTMLElement | string;
  /** Disabled state */
  disabled?: boolean;
  /** Initially active */
  defaultActive?: boolean;
  /** Lazy load panel on first activation */
  lazy?: boolean;
  /** Close button for closable tabs */
  closable?: boolean;
  /** Custom data */
  data?: unknown;
  /** Badge text/number */
  badge?: string | number;
}

export interface TabOptions {
  /** Tab items */
  items: TabItem[];
  /** Orientation. Default "horizontal" */
  orientation?: TabOrientation;
  /** Activation mode. Default "auto" */
  activation?: TabActivation;
  /** Initial active tab id (overrides defaultActive) */
  defaultActiveId?: string;
  /** Animation duration in ms for panel transitions. Default 200 */
  animationDuration?: number;
  /** Show bottom border indicator on active tab. Default true */
  showIndicator?: boolean;
  /** Custom class name */
  className?: string;
  /** Container element */
  container?: HTMLElement;
  /** Called when active tab changes */
  onChange?: (id: string, item: TabItem) => void;
  /** Called before tab switch (return false to prevent) */
  beforeChange?: (fromId: string, toId: string) => boolean | Promise<boolean>;
  /** Called when a tab is closed (closable tabs only) */
  onClose?: (id: string, item: TabItem) => void;
}

export interface TabInstance {
  /** Root element */
  el: HTMLElement;
  /** Activate a tab by id */
  activate: (id: string) => void;
  /** Get currently active tab id */
  getActiveId: () => string;
  /** Get all tab ids */
  getTabIds: () => string[];
  /** Add a new tab dynamically */
  addTab: (item: TabItem, index?: number) => void;
  /** Remove a tab by id */
  removeTab: (id: string) => void;
  /** Enable/disable a tab */
  setDisabled: (id: string, disabled: boolean) => void;
  /** Update tab label */
  setLabel: (id: string, label: string) => void;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Core Factory ---

/**
 * Create an accessible tab component following WAI-ARIA Tabs pattern.
 *
 * @example
 * ```ts
 * const tabs = createTabs({
 *   items: [
 *     { id: "tab1", label: "Overview", content: "<p>Overview content</p>" },
 *     { id: "tab2", label: "Settings", content: settingsEl },
 *   ],
 *   onChange: (id) => console.log("Active:", id),
 * });
 * ```
 */
export function createTabs(options: TabOptions): TabInstance {
  const {
    items,
    orientation = "horizontal",
    activation = "auto",
    animationDuration = 200,
    showIndicator = true,
    className,
    container,
    onChange,
    beforeChange,
    onClose,
  } = options;

  let _items = [...items];
  let _activeId: string = options.defaultActiveId ??
    _items.find((i) => i.defaultActive)?.id ??
    _items[0]?.id ?? "";
  let cleanupFns: Array<() => void> = [];

  // Root
  const root = document.createElement("div");
  root.className = `tabs ${orientation} ${className ?? ""}`.trim();
  root.setAttribute("role", "tablist");
  root.setAttribute(
    "aria-orientation",
    orientation === "vertical" ? "vertical" : "horizontal",
  );

  // Render
  _render();

  (container ?? document.body).appendChild(root);

  // --- Methods ---

  async function activate(id: string): Promise<void> {
    const item = _items.find((i) => i.id === id);
    if (!item || item.disabled || id === _activeId) return;

    if (beforeChange) {
      const canProceed = await beforeChange(_activeId, id);
      if (!canProceed) return;
    }

    const prevId = _activeId;
    _activeId = id;

    _updateVisuals(prevId, id);
    onChange?.(id, item);
  }

  function getActiveId(): string { return _activeId; }
  function getTabIds(): string[] { return _items.map((i) => i.id); }

  function addTab(item: TabItem, index?: number): void {
    if (index !== undefined && index >= 0 && index <= _items.length) {
      _items.splice(index, 0, item);
    } else {
      _items.push(item);
    }
    _render();
  }

  function removeTab(id: string): void {
    const idx = _items.findIndex((i) => i.id === id);
    if (idx < 0) return;

    _items.splice(idx, 1);

    // If removed the active tab, activate adjacent one
    if (_activeId === id) {
      _activeId = _items[Math.min(idx, _items.length - 1)]?.id ?? "";
    }

    _render();
  }

  function setDisabled(id: string, disabled: boolean): void {
    const item = _items.find((i) => i.id === id);
    if (item) item.disabled = disabled;
    _render();
  }

  function setLabel(id: string, label: string): void {
    const item = _items.find((i) => i.id === id);
    if (item) item.label = label;
    _render();
  }

  function destroy(): void {
    _removeListeners();
    root.remove();
  }

  // --- Internal ---

  function _updateVisuals(prevId: string, newId: string): void {
    // Deactivate previous tab
    const prevTab = root.querySelector(`[data-tab-id="${prevId}"]`) as HTMLElement;
    const prevPanel = root.querySelector(`[data-panel-id="${prevId}"]`) as HTMLElement;

    if (prevTab) {
      prevTab.setAttribute("aria-selected", "false");
      prevTab.setAttribute("tabIndex", "-1");
      if (showIndicator) {
        const ind = prevTab.querySelector(".tab-indicator") as HTMLElement;
        if (ind) ind.style.display = "none";
      }
    }
    if (prevPanel) {
      prevPanel.style.opacity = "0";
      setTimeout(() => { prevPanel.style.display = "none"; }, animationDuration);
    }

    // Activate new tab
    const newTab = root.querySelector(`[data-tab-id="${newId}"]`) as HTMLElement;
    const newPanel = root.querySelector(`[data-panel-id="${newId}"]`) as HTMLElement;

    if (newTab) {
      newTab.setAttribute("aria-selected", "true");
      newTab.setAttribute("tabIndex", "0");
      if (showIndicator) {
        const ind = newTab.querySelector(".tab-indicator") as HTMLElement;
        if (ind) ind.style.display = "";
      }
    }

    if (newPanel) {
      // Lazy loading
      const item = _items.find((i) => i.id === newId);
      if (item?.lazy && newPanel.children.length === 0) {
        if (typeof item.content === "string") newPanel.innerHTML = item.content;
        else newPanel.appendChild(item.content.cloneNode(true));
      }

      newPanel.style.display = "";
      requestAnimationFrame(() => {
        newPanel.style.opacity = "1";
      });
    }
  }

  function _render(): void {
    root.innerHTML = "";

    const isVertical = orientation === "vertical";

    // Tab bar
    const tabBar = document.createElement("div");
    tabBar.className = "tab-bar";
    tabBar.setAttribute("role", "presentation");
    tabBar.style.cssText =
      `display:flex;${isVertical ? "flex-direction:column;" : "flex-direction:row;"}` +
      "gap:0;border-bottom:" + (isVertical ? "none" : "1px solid #e5e7eb;") +
      "background:#fff;padding:0;";

    // Panels container
    const panelsContainer = document.createElement("div");
    panelsContainer.className = "tab-panels";
    panelsContainer.style.cssText =
      isVertical ? "display:flex;flex-direction:row;" : "";

    _items.forEach((item) => {
      // --- Tab button ---
      const tab = document.createElement("button");
      tab.className = `tab ${item.disabled ? "disabled" : ""}`;
      tab.dataset.tabId = item.id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(item.id === _activeId));
      tab.setAttribute("aria-controls", `panel-${item.id}`);
      tab.setAttribute("tabIndex", item.id === _activeId ? "0" : "-1");
      tab.type = "button";
      if (item.disabled) tab.setAttribute("aria-disabled", "true");

      tab.style.cssText =
        `display:flex;align-items:center;gap:6px;padding:${isVertical ? "12px 16px" : "10px 16px"};` +
        "border:none;background:none;cursor:pointer;font-size:14px;font-weight:500;" +
        "color:#6b7280;white-space:nowrap;position:relative;transition:color 0.15s;" +
        (isVertical ? "border-right:2px solid transparent;text-align:left;" : "") +
        (item.disabled ? "opacity:0.5;cursor:not-allowed;" : "") +
        (item.id === _activeId
          ? `color:#111827;${isVertical ? "border-right-color:#3b82f6;" : ""}`
          : "");

      // Icon
      if (item.icon) {
        const iconEl = document.createElement("span");
        iconEl.className = "tab-icon";
        iconEl.innerHTML = typeof item.icon === "string" ? item.icon : "";
        tab.appendChild(iconEl);
      }

      // Label
      const labelSpan = document.createElement("span");
      labelSpan.className = "tab-label";
      labelSpan.textContent = item.label;
      tab.appendChild(labelSpan);

      // Badge
      if (item.badge !== undefined) {
        const badge = document.createElement("span");
        badge.className = "tab-badge";
        badge.textContent = String(item.badge);
        Object.assign(badge.style, {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: "18px",
          height: "18px",
          padding: "0 5px",
          borderRadius: "9px",
          background: "#ef4444",
          color: "#fff",
          fontSize: "11px",
          fontWeight: "600",
          lineHeight: "18px",
        });
        tab.appendChild(badge);
      }

      // Active indicator (bottom border or right border)
      if (showIndicator) {
        const indicator = document.createElement("span");
        indicator.className = "tab-indicator";
        Object.assign(indicator.style, {
          position: "absolute",
          left: "0",
          right: "0",
          ...(isVertical
            ? { bottom: "0", top: "0", width: "2px", right: "auto", background: "#3b82f6", display: item.id === _activeId ? "" : "none" }
            : { bottom: "0", height: "2px", background: "#3b82f6", display: item.id === _activeId ? "" : "none" }),
        });
        tab.appendChild(indicator);
      }

      // Close button (for closable tabs)
      if (item.closable) {
        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "tab-close";
        closeBtn.innerHTML = "&times;";
        closeBtn.setAttribute("aria-label", `Close ${item.label}`);
        closeBtn.style.cssText =
          "background:none;border:none;cursor:pointer;color:#9ca3af;" +
          "font-size:14px;padding:0 4px;margin-left:4px;display:flex;" +
          "align-items:center;line-height:1;";
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          onClose?.(item.id, item);
          removeTab(item.id);
        });
        tab.appendChild(closeBtn);
      }

      // Click handler
      tab.addEventListener("click", () => { if (!item.disabled) activate(item.id); });

      // Hover effect
      if (!item.disabled) {
        tab.addEventListener("mouseenter", () => { tab.style.color = "#374151"; });
        tab.addEventListener("mouseleave", () => {
          tab.style.color = item.id === _activeId ? "#111827" : "#6b7280";
        });
      }

      tabBar.appendChild(tab);

      // --- Panel ---
      const panel = document.createElement("div");
      panel.className = "tab-panel";
      panel.dataset.panelId = item.id;
      panel.id = `panel-${item.id}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `tab-${item.id}`);
      panel.style.cssText =
        `padding:16px;opacity:${item.id === _activeId ? "1" : "0"};` +
        `transition:opacity ${animationDuration}ms ease;` +
        (item.id !== _activeId ? "display:none;" : "") +
        (isVertical ? "flex:1;overflow-y:auto;" : "");

      if (!item.lazy || item.id === _activeId) {
        if (typeof item.content === "string") panel.innerHTML = item.content;
        else panel.appendChild(item.content.cloneNode(true));
      }

      panelsContainer.appendChild(panel);
    });

    root.appendChild(tabBar);
    root.appendChild(panelsContainer);

    _setupKeyboardNav();
  }

  function _setupKeyboardNav(): void {
    const handler = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      if (!target.closest(".tabs")) return;
      if (!target.getAttribute("role")?.includes("tab")) return;

      const tabs = Array.from(root.querySelectorAll<HTMLElement>(
        '.tab[role="tab"]:not([aria-disabled="true"])',
      ));
      const currentIndex = tabs.indexOf(target);
      if (currentIndex < 0) return;

      let nextIndex: number | null = null;

      switch (e.key) {
        case orientation === "horizontal" ? "ArrowRight" : "ArrowDown":
          e.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case orientation === "horizontal" ? "ArrowLeft" : "ArrowUp":
          e.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        case "Enter":
        case " ":
          if (activation === "manual") {
            e.preventDefault();
            const id = target.dataset.tabId;
            if (id) activate(id);
          }
          return; // Don't prevent default for auto mode — browser handles focus
        default:
          return;
      }

      if (nextIndex !== null) {
        tabs[nextIndex]!.focus();
        if (activation === "auto") {
          const id = tabs[nextIndex]!.dataset.tabId;
          if (id) activate(id);
        }
      }
    };

    root.addEventListener("keydown", handler);
    cleanupFns.push(() => root.removeEventListener("keydown", handler));
  }

  function _removeListeners(): void {
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  return { el: root, activate, getActiveId, getTabIds, addTab, removeTab, setDisabled, setLabel, destroy };
}
