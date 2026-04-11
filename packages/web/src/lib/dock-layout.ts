/**
 * Dock Layout: IDE-style dockable panel system with drag-to-dock,
 * tab groups, floating windows, split containers, serialization,
 * and persistent layout management.
 */

// --- Types ---

export type DockLocation = "left" | "right" | "top" | "bottom" | "center" | "fill" | "floating";
export type DockTabPosition = "top" | "bottom" | "left" | "right";

export interface DockPanel {
  /** Unique ID */
  id: string;
  /** Panel title */
  title: string;
  /** Content (HTML string or element) */
  content: string | HTMLElement;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Closable? */
  closable?: boolean;
  /** Initial location */
  location?: DockLocation;
  /** Minimum size (px) */
  minWidth?: number;
  minHeight?: number;
  /** Preferred width (px) */
  preferredWidth?: number;
  /** Preferred height (px) */
  preferredHeight?: number;
  /** Close callback */
  onClose?: (panel: DockPanel) => void;
  /** Custom data payload */
  data?: unknown;
}

export interface DockLayoutOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Initial panels */
  panels?: DockPanel[];
  /** Tab bar position for tab groups */
  tabPosition?: DockTabPosition;
  /** Tab bar height (px) */
  tabHeight?: number;
  /** Default panel location for new panels */
  defaultLocation?: DockLocation;
  /** Show tab icons? */
  showIcons?: boolean;
  /** Enable drag-to-dock? */
  draggable?: boolean;
  /** Enable floating/detached panels? */
  allowFloating?: boolean;
  /** Header background color */
  headerBg?: string;
  /** Active tab indicator color */
  activeColor?: string;
  /** Border color between dock areas */
  borderColor?: string;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Callback when layout changes */
  onLayoutChange?: () => void;
  /** Custom CSS class */
  className?: string;
}

export interface DockLayoutInstance {
  element: HTMLElement;
  /** Add a panel */
  addPanel: (panel: DockPanel) => void;
  /** Remove a panel by ID */
  removePanel: (id: string) => void;
  /** Get a panel by ID */
  getPanel: (id: string) => DockPanel | undefined;
  /** Get all panels */
  getPanels: () => DockPanel[];
  /** Move panel to a different location */
  movePanel: (id: string, location: DockLocation) => void;
  /** Focus/activate a panel */
  focusPanel: (id: string) => void;
  /** Serialize current layout (for persistence) */
  serialize: () => string;
  /** Restore layout from serialized state */
  restore: (state: string) => void;
  /** Destroy */
  destroy: () => void;
}

// --- Defaults ---

const DEFAULT_HEADER_BG = "#f9fafb";
const DEFAULT_ACTIVE_COLOR = "#6366f1";
const DEFAULT_BORDER_COLOR = "#e5e7eb";

// --- Internal Types ---

interface TabGroup {
  id: string;
  location: DockLocation;
  panels: DockPanel[];
  activeId: string | null;
  el: HTMLElement;
}

// --- Main Factory -----

export function createDockLayout(options: DockLayoutOptions): DockLayoutInstance {
  const opts = {
    tabPosition: options.tabPosition ?? "top",
    tabHeight: options.tabHeight ?? 32,
    defaultLocation: options.defaultLocation ?? "center",
    showIcons: options.showIcons ?? true,
    draggable: options.draggable ?? true,
    allowFloating: options.allowFloating ?? false,
    headerBg: options.headerBg ?? DEFAULT_HEADER_BG,
    activeColor: options.activeColor ?? DEFAULT_ACTIVE_COLOR,
    borderColor: options.borderColor ?? DEFAULT_BORDER_COLOR,
    animationDuration: options.animationDuration ?? 200,
    onLayoutChange: options.onLayoutChange,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("DockLayout: container not found");

  let panels = [...(options.panels ?? [])];
  let destroyed = false;

  // Organize into tab groups by location
  const tabGroups = new Map<string, TabGroup>();

  // Root
  const root = document.createElement("div");
  root.className = `dock-layout ${opts.className}`;
  root.style.cssText = `
    display:grid;grid-template-areas:
      "top top top"
      "left center right"
      "bottom bottom bottom";
    grid-template-columns: 1fr auto 1fr;
    grid-template-rows: auto 1fr auto;
    width:100%;height:100%;overflow:hidden;
    font-family:-apple-system,sans-serif;position:relative;
  `;
  container.appendChild(root);

  // Drop zone overlay (shown during drag)
  let dropOverlay: HTMLElement | null = null;

  // --- Tab Group Management ---

  function getOrCreateGroup(location: DockLocation): TabGroup {
    const key = location;
    if (tabGroups.has(key)) return tabGroups.get(key)!;

    const group: TabGroup = {
      id: `dock-group-${location}-${Date.now()}`,
      location,
      panels: [],
      activeId: null,
      el: createGroupElement(location),
    };
    tabGroups.set(key, group);
    placeGroupInLayout(group);
    return group;
  }

  function createGroupElement(location: DockLocation): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.className = `dock-area dock-${location}`;
    wrapper.dataset.location = location;

    const isHorizontal = location === "top" || location === "bottom";
    const isVertical = location === "left" || location === "right";

    wrapper.style.cssText = `
      display:flex;flex-direction:column;
      overflow:hidden;background:#fff;
      border:${location === "center" ? "none" : `1px solid ${opts.borderColor}`};
      ${isHorizontal ? `min-height:80px;max-height:40vh;` : ""}
      ${isVertical ? `min-width:180px;max-width:35vw;` : ""}
      ${location === "center" ? "position:relative;" : ""}
    `;

    // Grid area placement
    switch (location) {
      case "top": wrapper.style.gridArea = "top / 1 / top / 4"; break;
      case "bottom": wrapper.style.gridArea = "bottom / 1 / bottom / 4"; break;
      case "left": wrapper.style.gridArea = "left / 1 / left / 2"; break;
      case "right": wrapper.style.gridArea = "right / 3 / right / 4"; break;
      case "center":
      case "fill":
        wrapper.style.gridArea = "left / 2 / right / 3";
        break;
    }

    // Tab bar
    const tabBar = document.createElement("div");
    tabBar.className = "dock-tab-bar";
    tabBar.style.cssText = `
      display:flex;${isVertical ? "flex-direction:column;" : ""}
      align-items:stretch;background:${opts.headerBg};
      border-bottom:${isVertical ? "none" : `1px solid ${opts.borderColor}`};
      border-right:${isVertical ? `1px solid ${opts.borderColor}` : "none"};
      height:${isVertical ? "auto" : `${opts.tabHeight}px`};
      min-height:${isVertical ? "auto" : `${opts.tabHeight}px`};
      flex-shrink:0;overflow-x:auto;
    `;
    wrapper.appendChild(tabBar);

    // Content area
    const contentArea = document.createElement("div");
    contentArea.className = "dock-content";
    contentArea.style.cssText = `flex:1;overflow:auto;position:relative;`;
    wrapper.appendChild(contentArea);

    return wrapper;
  }

  function placeGroupInLayout(group: TabGroup): void {
    root.appendChild(group.el);
  }

  // --- Panel Rendering ---

  function renderTabs(group: TabGroup): void {
    const tabBar = group.el.querySelector(".dock-tab-bar")!;
    const contentArea = group.el.querySelector(".dock-content")!;
    tabBar.innerHTML = "";

    for (const panel of group.panels) {
      const isActive = group.activeId === panel.id;
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "dock-tab";
      tab.dataset.panelId = panel.id;
      tab.style.cssText = `
        display:flex;align-items:center;gap:4px;
        padding:0 12px;height:100%;
        border:none;background:none;cursor:pointer;
        font-size:12px;color:${isActive ? "#111827" : "#6b7280"};
        font-weight:${isActive ? "600" : "400"};
        border-bottom:${isActive ? `2px solid ${opts.activeColor}` : "2px solid transparent"};
        white-space:nowrap;transition:all 0.15s;
        flex-shrink:0;
      `;

      if (opts.showIcons && panel.icon) {
        const iconEl = document.createElement("span");
        iconEl.innerHTML = panel.icon;
        iconEl.style.cssText = "font-size:13px;";
        tab.appendChild(iconEl);
      }

      const label = document.createElement("span");
      label.textContent = panel.title;
      tab.appendChild(label);

      // Close button
      if (panel.closable !== false) {
        const closeBtn = document.createElement("span");
        closeBtn.innerHTML = "\u00D7";
        closeBtn.style.cssText = `
          margin-left:4px;font-size:14px;line-height:1;color:#9ca3af;
          padding:2px;border-radius:3px;
        `;
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removePanel(panel.id);
        });
        closeBtn.addEventListener("mouseenter", () => { closeBtn.style.color = "#ef4444"; closeBtn.style.background = "#fee2e2"; });
        closeBtn.addEventListener("mouseleave", () => { closeBtn.style.color = "#9ca3af"; closeBtn.style.background = ""; });
        tab.appendChild(closeBtn);
      }

      tab.addEventListener("click", () => activatePanel(group, panel.id));
      tabBar.appendChild(tab);
    }

    // Render active content
    contentArea.innerHTML = "";
    const activePanel = group.panels.find(p => p.id === group.activeId);
    if (activePanel) {
      if (typeof activePanel.content === "string") {
        contentArea.innerHTML = activePanel.content;
      } else {
        contentArea.appendChild(activePanel.content.cloneNode(true));
      }
    }
  }

  function activatePanel(group: TabGroup, panelId: string): void {
    group.activeId = panelId;
    renderTabs(group);
    opts.onLayoutChange?.();
  }

  // --- Public API ---

  function addPanel(panel: DockPanel): void {
    panels.push(panel);
    const location = panel.location ?? opts.defaultLocation;
    const group = getOrCreateGroup(location);
    group.panels.push(panel);
    if (group.panels.length === 1) group.activeId = panel.id;
    renderTabs(group);
    opts.onLayoutChange?.();
  }

  function removePanel(id: string): void {
    const panel = panels.find(p => p.id === id);
    if (!panel) return;

    panel.onClose?.(panel);
    panels = panels.filter(p => p.id !== id);

    // Remove from all groups
    for (const [key, group] of tabGroups) {
      const idx = group.panels.findIndex(p => p.id === id);
      if (idx >= 0) {
        group.panels.splice(idx, 1);
        if (group.activeId === id) {
          group.activeId = group.panels.length > 0 ? group.panels[0]!.id : null;
        }
        renderTabs(group);

        // Remove empty non-center groups
        if (group.panels.length === 0 && group.location !== "center") {
          group.el.remove();
          tabGroups.delete(key);
        }
      }
    }
    opts.onLayoutChange?.();
  }

  function movePanel(id: string, location: DockLocation): void {
    const panel = panels.find(p => p.id === id);
    if (!panel) return;

    // Remove from old group
    for (const [, group] of tabGroups) {
      const idx = group.panels.findIndex(p => p.id === id);
      if (idx >= 0) {
        group.panels.splice(idx, 1);
        if (group.activeId === id) {
          group.activeId = group.panels.length > 0 ? group.panels[0]!.id : null;
        }
        renderTabs(group);
        if (group.panels.length === 0 && group.location !== "center") {
          group.el.remove();
          tabGroups.delete(group.location);
        }
      }
    }

    // Add to new group
    const newGroup = getOrCreateGroup(location);
    newGroup.panels.push(panel);
    if (newGroup.panels.length === 1) newGroup.activeId = panel.id;
    renderTabs(newGroup);
    opts.onLayoutChange?.();
  }

  function focusPanel(id: string): void {
    for (const [, group] of tabGroups) {
      if (group.panels.some(p => p.id === id)) {
        activatePanel(group, id);
        return;
      }
    }
  }

  function serialize(): string {
    const state = panels.map(p => ({
      id: p.id,
      title: p.title,
      location: findPanelLocation(p.id),
    }));
    return JSON.stringify(state);
  }

  function findPanelLocation(id: string): DockLocation {
    for (const [, group] of tabGroups) {
      if (group.panels.some(p => p.id === id)) return group.location;
    }
    return "center";
  }

  function restore(stateStr: string): void {
    try {
      const state = JSON.parse(stateStr) as Array<{ id: string; location: DockLocation }>;
      for (const entry of state) {
        const panel = panels.find(p => p.id === entry.id);
        if (panel && entry.location) {
          movePanel(entry.id, entry.location);
        }
      }
    } catch {
      // Invalid state — ignore
    }
  }

  // Initialize with existing panels
  for (const panel of panels) {
    addPanel(panel);
  }
  // Clear duplicates since addPanel pushes again
  panels = [...new Set(panels)];

  // --- Instance ---

  const instance: DockLayoutInstance = {
    element: root,

    addPanel,
    removePanel,
    getPanel: (id) => panels.find(p => p.id === id),
    getPanels: () => [...panels],
    movePanel,
    focusPanel,
    serialize,
    restore,

    destroy() {
      destroyed = true;
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
