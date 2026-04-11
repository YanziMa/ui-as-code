/**
 * Sidebar Utilities: Collapsible navigation sidebar with sections,
 * active state tracking, badges, icons, keyboard navigation,
 * responsive behavior, nested items, and persistent state.
 */

// --- Types ---

export type SidebarPosition = "left" | "right";
export type SidebarVariant = "default" | "bordered" | "floating" | "glass";
export type SidebarCollapseMode = "none" | "icon-only" | "full";

export interface SidebarItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon (HTML string or element) */
  icon?: string | HTMLElement;
  /** Navigation href */
  href?: string;
  /** Badge text or count */
  badge?: string | number;
  /** Badge color variant */
  badgeColor?: "default" | "primary" | "success" | "warning" | "error";
  /** Disabled state */
  disabled?: boolean;
  /** Is this item currently active? */
  active?: boolean;
  /** Nested sub-items */
  children?: SidebarItem[];
  /** Default expanded for groups */
  defaultExpanded?: boolean;
  /** Custom data */
  data?: Record<string, unknown>;
  /** Click handler */
  onClick?: (item: SidebarItem, event: Event) => void;
}

export interface SidebarSection {
  /** Section ID */
  id: string;
  /** Section title */
  title?: string;
  /** Items in this section */
  items: SidebarItem[];
  /** Default collapsed? */
  collapsed?: boolean;
  /** Collapsible by user */
  collapsible?: boolean;
}

export interface SidebarOptions {
  /** Position on screen */
  position?: SidebarPosition;
  /** Visual variant */
  variant?: SidebarVariant;
  /** Width in px. Default 260 */
  width?: number;
  /** Width when collapsed to icons only. Default 64 */
  collapsedWidth?: number;
  /** Initial collapse mode */
  collapseMode?: SidebarCollapseMode;
  /** Allow user toggle collapse */
  collapsible?: boolean;
  /** Show section headers */
  showSectionHeaders?: boolean;
  /** Show icons always (even when not collapsed) */
  showIcons?: boolean;
  /** Show badges */
  showBadges?: boolean;
  /** Active item ID */
  activeId?: string;
  /** Custom class name */
  className?: string;
  /** Z-index */
  zIndex?: number;
  /** Fixed positioning */
  fixed?: boolean;
  /** Top offset when fixed */
  topOffset?: number;
  /** Bottom offset when fixed */
  bottomOffset?: number;
  /** Header content (HTMLElement or HTML string) */
  header?: HTMLElement | string;
  /** Footer content (HTMLElement or HTML string) */
  footer?: HTMLElement | string;
  /** Called when item is clicked */
  onItemClick?: (item: SidebarItem, event: Event) => void;
  /** Called when section is toggled */
  onSectionToggle?: (sectionId: string, collapsed: boolean) => void;
  /** Called when sidebar collapses/expands */
  onCollapseChange?: (mode: SidebarCollapseMode) => void;
  /** Persist collapse state to localStorage? */
  persistState?: boolean;
  /** Storage key for persistence */
  storageKey?: string;
}

export interface SidebarInstance {
  /** The sidebar root element */
  el: HTMLElement;
  /** Set items (replaces all) */
  setItems: (sections: SidebarSection[]) => void;
  /** Get current items */
  getItems: () => SidebarSection[];
  /** Set active item by ID */
  setActive: (id: string) => void;
  /** Get active item ID */
  getActive: () => string | null;
  /** Collapse or expand */
  setCollapseMode: (mode: SidebarCollapseMode) => void;
  /** Get current collapse mode */
  getCollapseMode: () => SidebarCollapseMode;
  /** Toggle collapse */
  toggleCollapse: () => void;
  /** Expand a section */
  expandSection: (sectionId: string) => void;
  /** Collapse a section */
  collapseSection: (sectionId: string) => void;
  /** Update an item's properties */
  updateItem: (itemId: string, props: Partial<SidebarItem>) => void;
  /** Set badge on an item */
  setBadge: (itemId: string, badge: string | number | undefined, color?: string) => void;
  /** Mount into container */
  mount: (container: HTMLElement) => void;
  /** Unmount from DOM */
  unmount: () => void;
  /** Destroy completely */
  destroy: () => void;
}

// --- Constants ---

const BADGE_COLORS: Record<string, { bg: string; color: string }> = {
  "default": { bg: "#f3f4f6", color: "#6b7280" },
  "primary": { bg: "#dbeafe", color: "#2563eb" },
  "success": { bg: "#d1fae5", color: "#059669" },
  "warning": { bg: "#fef3c7", color: "#d97706" },
  "error": { bg: "#fee2e2", color: "#dc2626" },
};

// --- Core Factory ---

/**
 * Create a collapsible navigation sidebar.
 *
 * @example
 * ```ts
 * const sidebar = createSidebar({
 *   position: "left",
 *   width: 280,
 *   collapsible: true,
 *   activeId: "dashboard",
 *   items: [
 *     {
 *       id: "dashboard", label: "Dashboard", icon: "&#127968;",
 *       items: [{ id: "overview", label: "Overview" }, { id: "analytics", label: "Analytics" }],
 *     },
 *     { id: "settings", label: "Settings", icon: "&#9881;" },
 *   ],
 * });
 * sidebar.mount(document.body);
 * ```
 */
export function createSidebar(options: SidebarOptions): SidebarInstance {
  const {
    position = "left",
    variant = "default",
    width = 260,
    collapsedWidth = 64,
    collapseMode: initialCollapseMode = "none",
    collapsible = false,
    showSectionHeaders = true,
    showIcons = true,
    showBadges = true,
    activeId,
    className,
    zIndex = 100,
    fixed = false,
    topOffset = 0,
    bottomOffset = 0,
    header,
    footer,
    onItemClick,
    onSectionToggle,
    onCollapseChange,
    persistState = false,
    storageKey = "sidebar-state",
  } = options;

  let _sections: SidebarSection[] = [];
  let _activeId: string | null = activeId ?? null;
  let _collapseMode: SidebarCollapseMode = initialCollapseMode;
  let _mounted = false;
  let cleanupFns: Array<() => void> = [];

  // Load persisted state
  if (persistState) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.collapseMode) _collapseMode = parsed.collapseMode;
        if (parsed.activeId) _activeId = parsed.activeId;
      }
    } catch {}
  }

  // Root element
  const root = document.createElement("nav");
  root.className = `sidebar sidebar-${position} sidebar-${variant} ${className ?? ""}`.trim();
  root.setAttribute("role", "navigation");
  root.setAttribute("aria-label", "Sidebar navigation");

  const isCollapsed = () => _collapseMode === "icon-only";

  Object.assign(root.style, {
    display: "flex",
    flexDirection: "column",
    width: `${width}px`,
    height: fixed ? `calc(100vh - ${topOffset}px - ${bottomOffset}px)` : "100%",
    backgroundColor: variant === "glass" ? "rgba(255,255,255,0.8)" : "#fff",
    backdropFilter: variant === "glass" ? "blur(12px)" : "none",
    borderRight: position === "right" ? "none" : (variant === "bordered" || variant === "default" ? "1px solid #e5e7eb" : "none"),
    borderLeft: position === "left" ? "none" : (variant === "bordered" || variant === "default" ? "1px solid #e5e7eb" : "none"),
    boxShadow: variant === "floating" ? "0 4px 24px rgba(0,0,0,0.08)" : "none",
    transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    overflow: "hidden",
    flexShrink: 0,
    ...(fixed ? {
      position: "fixed",
      [position]: "0",
      top: `${topOffset}px`,
      bottom: `${bottomOffset}px`,
      zIndex: String(zIndex),
    } : {}),
  });

  // Inner scrollable area
  const inner = document.createElement("div");
  inner.className = "sidebar-inner";
  inner.style.cssText =
    "display:flex;flex-direction:column;height:100%;overflow:hidden;" +
    (isCollapsed() ? "align-items:center;" : "");

  // Header
  let headerEl: HTMLElement | null = null;
  if (header) {
    headerEl = document.createElement("div");
    headerEl.className = "sidebar-header";
    headerEl.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;" +
      "padding:16px;border-bottom:1px solid #f3f4f6;flex-shrink:0;min-height:56px;";
    if (typeof header === "string") {
      headerEl.innerHTML = header;
    } else {
      headerEl.appendChild(header);
    }

    // Collapse toggle button
    if (collapsible) {
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "sidebar-collapse-btn";
      toggleBtn.setAttribute("aria-label", "Toggle sidebar");
      toggleBtn.innerHTML = isCollapsed() ? "&#9654;" : "&#9664;";
      toggleBtn.style.cssText =
        "border:none;background:none;cursor:pointer;padding:4px;border-radius:4px;" +
        "font-size:14px;color:#6b7280;display:flex;align-items:center;" +
        "justify-content:center;width:28px;height:28px;transition:background 0.12s;";
      toggleBtn.addEventListener("mouseenter", () => { toggleBtn.style.background = "#f3f4f6"; });
      toggleBtn.addEventListener("mouseleave", () => { toggleBtn.style.background = ""; });
      toggleBtn.addEventListener("click", toggleCollapse);
      headerEl.appendChild(toggleBtn);
    }

    inner.appendChild(headerEl);
  }

  // Content area (scrollable)
  const contentArea = document.createElement("div");
  contentArea.className = "sidebar-content";
  contentArea.style.cssText =
    "flex:1;overflow-y:auto;overflow-x:hidden;padding:8px 0;" +
    (isCollapsed() ? "display:flex;flex-direction:column;align-items:center;gap:4px;" : "");
  inner.appendChild(contentArea);

  // Footer
  if (footer) {
    const footerEl = document.createElement("div");
    footerEl.className = "sidebar-footer";
    footerEl.style.cssText =
      "padding:12px 16px;border-top:1px solid #f3f4f6;flex-shrink:0;";
    if (typeof footer === "string") {
      footerEl.innerHTML = footer;
    } else {
      footerEl.appendChild(footer);
    }
    inner.appendChild(footerEl);
  }

  root.appendChild(inner);

  // --- Render ---

  function render(): void {
    contentArea.innerHTML = "";

    _sections.forEach((section) => {
      // Section header
      if (showSectionHeaders && section.title && !isCollapsed()) {
        const secHeader = document.createElement("div");
        secHeader.className = "sidebar-section-header";
        secHeader.style.cssText =
          "display:flex;align-items:center;justify-content:space-between;" +
          "padding:12px 16px 6px;font-size:11px;font-weight:600;text-transform:uppercase;" +
          "letter-spacing:0.05em;color:#9ca3af;";

        const titleSpan = document.createElement("span");
        titleSpan.textContent = section.title;
        secHeader.appendChild(titleSpan);

        if (section.collapsible !== false) {
          const arrow = document.createElement("span");
          arrow.className = "sidebar-section-arrow";
          arrow.innerHTML = section.collapsed ? "&#9654;" : "&#9660;";
          arrow.style.cssText = "font-size:10px;color:#9ca3af;cursor:pointer;transition:transform 0.15s;";
          arrow.style.transform = section.collapsed ? "" : "rotate(0deg)";
          arrow.addEventListener("click", () => {
            section.collapsed = !section.collapsed;
            render();
            onSectionToggle?.(section.id, !!section.collapsed);
          });
          secHeader.appendChild(arrow);
        }

        contentArea.appendChild(secHeader);
      }

      // Items container
      if (!section.collapsed) {
        const itemsContainer = document.createElement("div");
        itemsContainer.className = "sidebar-items";
        itemsContainer.setAttribute("role", "menu");

        section.items.forEach((item) => {
          const itemEl = createItemElement(item, 0);
          itemsContainer.appendChild(itemEl);
        });

        contentArea.appendChild(itemsContainer);
      }
    });

    // Apply collapsed width
    root.style.width = isCollapsed() ? `${collapsedWidth}px` : `${width}px`;
    inner.style.alignItems = isCollapsed() ? "center" : "";
    contentArea.style.display = isCollapsed() ? "flex" : "";
    contentArea.style.flexDirection = isCollapsed() ? "column" : "";
    contentArea.style.alignItems = isCollapsed() ? "center" : "";
    contentArea.style.gap = isCollapsed() ? "4px" : "";

    // Update toggle button direction
    if (collapsible && headerEl) {
      const btn = headerEl.querySelector(".sidebar-collapse-btn") as HTMLElement;
      if (btn) btn.innerHTML = isCollapsed() ? "&#9654;" : "&#9660;";
    }
  }

  function createItemElement(item: SidebarItem, depth: number): HTMLElement {
    const li = document.createElement("div");
    li.className = `sidebar-item${item.active || item.id === _activeId ? " active" : ""}${item.disabled ? " disabled" : ""}`;
    li.setAttribute("role", "menuitem");
    li.dataset.itemId = item.id;

    const isIconOnly = isCollapsed();
    const paddingLeft = 12 + depth * 16;

    li.style.cssText =
      `display:flex;align-items:center;gap:${isIconOnly ? "0" : "10px"};` +
      `padding:${isIconOnly ? "10px" : "8px ${paddingLeft}px"};` +
      "margin:1px 4px;border-radius:8px;cursor:pointer;font-size:13px;color:#374151;" +
      "transition:background 0.12s,color 0.12s;position:relative;white-space:nowrap;" +
      "text-decoration:none;border:none;background:none;width:100%;box-sizing:border-box;" +
      (item.disabled ? "opacity:0.45;pointer-events:none;cursor:not-allowed;" : "") +
      (item.id === _activeId ? "background:#eff6ff;color:#2563eb;font-weight:500;" : "");

    // Hover effect (not for disabled)
    if (!item.disabled) {
      li.addEventListener("mouseenter", () => {
        if (item.id !== _activeId) li.style.background = "#f3f4f6";
      });
      li.addEventListener("mouseleave", () => {
        if (item.id !== _activeId) li.style.background = "";
      });
    }

    // Icon
    if ((showIcons || isIconOnly) && item.icon) {
      const iconEl = document.createElement("span");
      iconEl.className = "sidebar-item-icon";
      iconEl.innerHTML = typeof item.icon === "string" ? item.icon : "";
      iconEl.style.cssText =
        `display:flex;align-items:center;justify-content:center;flex-shrink:0;` +
        `width:${isIconOnly ? "32px" : "20px"};height:${isIconOnly ? "32px" : "20px"};` +
        `font-size:${isIconOnly ? "18px" : "14px"};`;
      li.appendChild(iconEl);
    }

    // Label (hidden when icon-only)
    if (!isIconOnly) {
      const labelEl = document.createElement("span");
      labelEl.className = "sidebar-item-label";
      labelEl.textContent = item.label;
      labelEl.style.flex = "1";
      labelEl.style.minWidth = "0";
      labelEl.style.overflow = "hidden";
      labelEl.style.textOverflow = "ellipsis";
      li.appendChild(labelEl);

      // Badge
      if (showBadges && item.badge !== undefined && item.badge !== "") {
        const badgeEl = document.createElement("span");
        badgeEl.className = "sidebar-item-badge";
        const bc = BADGE_COLORS[item.badgeColor ?? "default"];
        badgeEl.textContent = String(item.badge);
        badgeEl.style.cssText =
          `display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;` +
          `padding:0 6px;border-radius:9px;font-size:11px;font-weight:600;` +
          `background:${bc.bg};color:${bc.color};flex-shrink:0;margin-left:auto;`;
        li.appendChild(badgeEl);
      }
    }

    // Nested children indicator / expand button
    if (item.children && item.children.length > 0 && !isIconOnly) {
      const expandArrow = document.createElement("span");
      expandArrow.className = "sidebar-item-expand";
      expandArrow.innerHTML = item.defaultExpanded !== false ? "&#9660;" : "&#9654;";
      expandArrow.style.cssText =
        "font-size:10px;color:#9ca3af;transition:transform 0.15s;flex-shrink:0;margin-left:4px;";
      if (item.defaultExpanded === false) expandArrow.style.transform = "rotate(-90deg)";
      li.appendChild(expandArrow);

      // Children container
      const childContainer = document.createElement("div");
      childContainer.className = "sidebar-item-children";
      childContainer.style.display = item.defaultExpanded === false ? "none" : "";
      childContainer.style.paddingLeft = "12px";

      item.children.forEach((child) => {
        const childEl = createItemElement(child, depth + 1);
        childContainer.appendChild(childEl);
      });

      // Toggle children visibility
      li.addEventListener("click", (e) => {
        e.stopPropagation();
        const expanded = childContainer.style.display !== "none";
        childContainer.style.display = expanded ? "none" : "";
        expandArrow.innerHTML = expanded ? "&#9654;" : "&#9660;";
        expandArrow.style.transform = expanded ? "rotate(-90deg)" : "";
      });
      li.after(childContainer);
    }

    // Click handler
    li.addEventListener("click", (e) => {
      if (item.disabled) return;
      e.stopPropagation();

      // Update active state
      _activeId = item.id;
      render();
      saveState();

      // Navigate if href
      if (item.href) {
        window.location.href = item.href;
      }

      onItemClick?.(item, e);
    });

    return li;
  }

  // --- Public API ---

  function setItems(sections: SidebarSection[]): void {
    _sections = sections;
    if (_mounted) render();
  }

  function getItems(): SidebarSection[] { return _sections; }

  function setActive(id: string): void {
    _activeId = id;
    if (_mounted) render();
    saveState();
  }

  function getActive(): string | null { return _activeId; }

  function setCollapseMode(mode: SidebarCollapseMode): void {
    _collapseMode = mode;
    if (_mounted) render();
    saveState();
    onCollapseChange?.(mode);
  }

  function getCollapseMode(): SidebarCollapseMode { return _collapseMode; }

  function toggleCollapse(): void {
    setCollapseMode(isCollapsed() ? "none" : "icon-only");
  }

  function expandSection(sectionId: string): void {
    const sec = _sections.find((s) => s.id === sectionId);
    if (sec) { sec.collapsed = false; if (_mounted) render(); }
  }

  function collapseSection(sectionId: string): void {
    const sec = _sections.find((s) => s.id === sectionId);
    if (sec) { sec.collapsed = true; if (_mounted) render(); }
  }

  function updateItem(itemId: string, props: Partial<SidebarItem>): void {
    for (const sec of _sections) {
      const item = sec.items.find((i) => i.id === itemId);
      if (item) { Object.assign(item, props); if (_mounted) render(); return; }
      // Check nested
      for (const parent of sec.items) {
        if (parent.children) {
          const child = parent.children.find((c) => c.id === itemId);
          if (child) { Object.assign(child, props); if (_mounted) render(); return; }
        }
      }
    }
  }

  function setBadge(itemId: string, badge: string | number | undefined, color?: string): void {
    updateItem(itemId, { badge: badge as string | number, ...(color ? { badgeColor: color as any } : {}) });
  }

  function mount(container: HTMLElement): void {
    if (_mounted) return;
    _mounted = true;
    container.appendChild(root);
    render();
  }

  function unmount(): void {
    if (!_mounted) return;
    _mounted = false;
    root.remove();
  }

  function destroy(): void {
    unmount();
    for (const fn of cleanupFns) fn();
    cleanupFns = [];
  }

  function saveState(): void {
    if (!persistState) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ collapseMode: _collapseMode, activeId: _activeId }));
    } catch {}
  }

  return {
    el: root,
    setItems,
    getItems,
    setActive,
    getActive,
    setCollapseMode,
    getCollapseMode,
    toggleCollapse,
    expandSection,
    collapseSection,
    updateItem,
    setBadge,
    mount,
    unmount,
    destroy,
  };
}
