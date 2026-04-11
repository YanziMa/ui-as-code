/**
 * Tab Bar Utilities: Bottom/top navigation tab bars, segmented controls,
 * pill-style tabs, scrollable tab bars, badge indicators, and mobile-style
 * tab navigation.
 */

// --- Types ---

export type TabBarPosition = "top" | "bottom";
export type TabBarStyle = "line" | "pill" | "segment" | "underline" | "filled";
export type TabBarSize = "sm" | "md" | "lg";

export interface TabBarItem {
  /** Unique key */
  id: string;
  /** Label text */
  label: string;
  /** Icon HTML string */
  icon?: string;
  /** Badge count or text */
  badge?: string | number;
  /** Disabled state */
  disabled?: boolean;
  /** Active indicator dot (for bottom nav) */
  activeDot?: boolean;
}

export interface TabBarOptions {
  /** Tab items */
  items: TabBarItem[];
  /** Position (top or bottom) */
  position?: TabBarPosition;
  /** Visual style */
  style?: TabBarStyle;
  /** Size variant */
  size?: TabBarSize;
  /** Initially active tab id */
  defaultActiveId?: string;
  /** Fixed/sticky positioning */
  fixed?: boolean;
  /** Scrollable when items overflow? */
  scrollable?: boolean;
  /** Show active indicator */
  showIndicator?: boolean;
  /** Container element */
  container?: HTMLElement;
  /** Called on tab change */
  onChange?: (id: string, item: TabBarItem, index: number) => void;
  /** Custom class name */
  className?: string;
}

export interface TabBarInstance {
  /** Root element */
  el: HTMLElement;
  /** Get active tab ID */
  getActiveId: () => string;
  /** Set active tab by ID */
  setActiveId: (id: string) => void;
  /** Get active index */
  getActiveIndex: () => number;
  /** Update items dynamically */
  setItems: (items: TabBarItem[]) => void;
  /** Update badge for a tab */
  setBadge: (id: string, badge: string | number | undefined) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_CONFIG: Record<TabBarSize, {
  height: string; fontSize: string; iconSize: string; padding: string; gap: string;
}> = {
  sm: { height: "36px", fontSize: "11px", iconSize: "16px", padding: "4px 10px", gap: "4px" },
  md: { height: "48px", fontSize: "12px", iconSize: "20px", padding: "6px 14px", gap: "6px" },
  lg: { height: "56px", fontSize: "14px", iconSize: "24px", padding: "8px 18px", gap: "8px" },
};

// --- Core Factory ---

/**
 * Create a tab bar (navigation bar with tabs).
 *
 * @example
 * ```ts
 * const tabBar = createTabBar({
 *   position: "bottom",
 *   style: "line",
 *   items: [
 *     { id: "home", label: "Home", icon: "&#127968;" },
 *     { id: "search", label: "Search", icon: "&#128269;" },
 *     { id: "profile", label: "Profile", icon: "&#128100;", badge: 3 },
 *   ],
 *   onChange: (id) => console.log("Tab:", id),
 * });
 * ```
 */
export function createTabBar(options: TabBarOptions): TabBarInstance {
  const {
    items,
    position = "top",
    style = "line",
    size = "md",
    defaultActiveId,
    fixed = false,
    scrollable = true,
    showIndicator = true,
    container,
    onChange,
    className,
  } = options;

  let _activeId = defaultActiveId ?? (items[0]?.id ?? "");
  let _items = [...items];

  const sc = SIZE_CONFIG[size];
  const isBottom = position === "bottom";

  // Root
  const root = document.createElement("nav");
  root.className = `tab-bar ${position} ${style} ${size} ${className ?? ""}`.trim();
  root.setAttribute("role", "tablist");

  let baseStyles =
    `display:flex;${scrollable ? "overflow-x:auto;overflow-y:hidden;" : ""}` +
    `${isBottom ? "justify-content:space-around;" : ""}` +
    `background:#fff;border-${isBottom ? "top" : "bottom"}:1px solid #e5e7eb;` +
    `min-height:${sc.height};-webkit-overflow-scrolling:touch;` +
    "scrollbar-width:none;" + // Hide scrollbar Firefox
    "&::-webkit-scrollbar{display:none;}"; // Hide scrollbar WebKit

  if (fixed) {
    baseStyles +=
      `position:${isBottom ? "fixed" : "sticky"};${isBottom ? "bottom:0;left:0;right:0;z-index:100;" : "top:0;left:0;right:0;z-index:100;"}`;
  }

  root.style.cssText = baseStyles;

  // Track for indicator line/pill
  const track = document.createElement("div");
  track.className = "tab-bar-track";
  track.style.cssText =
    "display:flex;position:relative;height:100%;align-items:center;" +
    (isBottom ? "width:100%;flex-direction:row;" : "");

  root.appendChild(track);

  // Active indicator element
  let indicatorEl: HTMLElement | null = null;
  if (showIndicator && (style === "line" || style === "underline")) {
    indicatorEl = document.createElement("div");
    indicatorEl.className = "tab-indicator";
    indicatorEl.style.cssText =
      "position:absolute;bottom:0;height:2px;background:#3b82f6;" +
      "border-radius:1px;transition:left 0.25s ease,width 0.25s ease;";
    track.appendChild(indicatorEl);
  }

  // Render items
  function _render(): void {
    track.innerHTML = "";
    if (indicatorEl && (style === "line" || style === "underline")) {
      track.appendChild(indicatorEl!);
    }

    _items.forEach((item, idx) => {
      const isActive = item.id === _activeId;
      const isDisabled = item.disabled ?? false;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `tab-bar-item ${isActive ? "active" : ""}`;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(isActive));
      btn.dataset.tabId = item.id;
      if (isDisabled) btn.disabled = true;

      // Base button styles
      let btnStyles =
        `display:flex;flex-direction:${isBottom ? "column" : "row"};` +
        `align-items:center;justify-content:center;gap:${sc.gap};` +
        `padding:${sc.padding};font-size:${sc.fontSize};font-weight:${isActive ? "600" : "500"};` +
        "color:" + (isActive ? "#111827" : "#9ca3af") + ";" +
        "background:none;border:none;cursor:pointer;white-space:nowrap;" +
        "transition:all 0.2s ease;position:relative;user-select:none;" +
        "flex-shrink:0;" +
        (isDisabled ? "opacity:0.4;cursor:not-allowed;" : "") +
        (isBottom ? "min-width:0;flex:1;padding-top:4px;padding-bottom:4px;" : "");

      // Style-specific overrides
      switch (style) {
        case "pill":
          btnStyles +=
            `border-radius:9999px;${isActive ? "background:#eff6ff;color:#3b82f6;" : ""}`;
          break;
        case "segment":
          btnStyles +=
            "border-radius:8px;" +
            (idx === 0 ? "border-top-left-radius:12px;border-bottom-left-radius:12px;" : "") +
            (idx === _items.length - 1 ? "border-top-right-radius:12px;border-bottom-right-radius:12px;" : "") +
            (isActive ? "background:#f3f4f6;color:#111827;box-shadow:inset 0 1px 2px rgba(0,0,0,0.05);" : "");
          break;
        case "filled":
          btnStyles += isActive
            ? "background:#3b82f6;color:#fff;"
            : "";
          break;
        case "underline":
          btnStyles += isActive
            ? `color:#3b82f6;&::after{content:'';position:absolute;bottom:-1px;left:16px;right:16px;height:2px;background:#3b82f6;border-radius:1px;}`
            : "";
          break;
      }

      btn.style.cssText = btnStyles;

      // Icon
      if (item.icon) {
        const iconEl = document.createElement("span");
        iconEl.className = "tab-icon";
        iconEl.innerHTML = item.icon;
        iconEl.style.cssText =
          `display:inline-flex;align-items:center;font-size:${sc.iconSize};line-height:1;`;
        btn.appendChild(iconEl);
      }

      // Label
      const labelEl = document.createElement("span");
      labelEl.className = "tab-label";
      labelEl.textContent = item.label;
      btn.appendChild(labelEl);

      // Badge
      if (item.badge !== undefined) {
        const badgeEl = document.createElement("span");
        badgeEl.className = "tab-badge";
        badgeEl.textContent = typeof item.badge === "number" && item.badge > 99 ? "99+" : String(item.badge);
        badgeEl.style.cssText =
          `position:absolute;${isBottom ? "top:2px;right:50%;transform:translateX(50%);" : "top:2px;right:2px;"}` +
          "min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;" +
          "background:#ef4444;color:#fff;font-size:10px;font-weight:700;line-height:1;" +
          "border-radius:8px;padding:0 4px;font-variant-numeric:tabular-nums;";
        btn.appendChild(badgeEl);
      }

      // Active dot (for bottom nav)
      if (isBottom && item.activeDot && isActive) {
        const dot = document.createElement("span");
        dot.className = "tab-active-dot";
        dot.style.cssText =
          "width:4px;height:4px;border-radius:50%;background:#3b82f6;margin-top:2px;";
        btn.appendChild(dot);
      }

      // Click handler
      btn.addEventListener("click", () => {
        if (isDisabled) return;
        setActiveId(item.id);
      });

      // Hover effect
      if (!isDisabled && !isActive) {
        btn.addEventListener("mouseenter", () => { btn.style.color = "#374151"; });
        btn.addEventListener("mouseleave", () => { btn.style.color = "#9ca3af"; });
      }

      track.appendChild(btn);
    });

    // Update indicator position
    _updateIndicator();
  }

  function _updateIndicator(): void {
    if (!indicatorEl) return;
    const activeBtn = track.querySelector(`[data-tab-id="${_activeId}"]`) as HTMLElement;
    if (!activeBtn) return;

    indicatorEl.style.left = activeBtn.offsetLeft + "px";
    indicatorEl.style.width = activeBtn.offsetWidth + "px";
  }

  function setActiveId(id: string): void {
    if (id === _activeId) return;
    const item = _items.find((i) => i.id === id);
    if (!item || item.disabled) return;

    const prevId = _activeId;
    _activeId = id;

    // Re-render to update visuals
    _render();

    onChange?.(id, item, _items.findIndex((i) => i.id === id));
  }

  function getActiveId(): string { return _activeId; }
  function getActiveIndex(): number { return _items.findIndex((i) => i.id === _activeId); }

  function setItems(newItems: TabBarItem[]): void {
    _items = newItems;
    if (!_items.find((i) => i.id === _activeId)) {
      _activeId = _items[0]?.id ?? "";
    }
    _render();
  }

  function setBadge(id: string, badge: string | number | undefined): void {
    const item = _items.find((i) => i.id === id);
    if (item) item.badge = badge;
    _render();
  }

  function destroy(): void { root.remove(); }

  _render();

  (container ?? document.body).appendChild(root);

  return { el: root, getActiveId, setActiveId, getActiveIndex, setItems, setBadge, destroy };
}
