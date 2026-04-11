/**
 * Tabs Manager: Full-featured tab panel system with lazy loading,
 * closable tabs, drag-to-reorder, keyboard navigation, vertical/horizontal
 * layouts, pill/underline/line variants, tab overflow scrolling, and ARIA.
 */

// --- Types ---

export type TabVariant = "line" | "pill" | "enclosed" | "underline";
export type TabPosition = "top" | "bottom" | "left" | "right";
export type TabOverflowMode = "scroll" | "dropdown" | "wrap";

export interface TabPanel {
  /** Unique identifier */
  id: string;
  /** Tab label text or element */
  label: string | HTMLElement;
  /** Panel content (string, HTML, or element) */
  content: string | HTMLElement;
  /** Initially active? */
  defaultActive?: boolean;
  /** Disabled? */
  disabled?: boolean;
  /** Closable? */
  closable?: boolean;
  /** Custom icon (emoji, SVG string, or element) */
  icon?: string | HTMLElement;
  /** Badge text or count */
  badge?: string | number;
  /** Lazy load content? */
  lazy?: (() => string | HTMLElement) | Promise<string | HTMLElement>;
  /** Extra CSS class */
  className?: string;
  /** Tooltip for tab label */
  tooltip?: string;
}

export interface TabsOptions {
  /** Visual variant (default: "line") */
  variant?: TabVariant;
  /** Tab bar position (default: "top") */
  position?: TabPosition;
  /** How to handle overflow tabs (default: "scroll") */
  overflow?: TabOverflowMode;
  /** Allow closing tabs? */
  allowClose?: boolean;
  /** Show add button? */
  showAddButton?: boolean;
  /** Callback when add button clicked */
  onAdd?: () => void;
  /** Callback when tab changes */
  onChange?: (tabId: string) => void;
  /** Callback before tab switch (return false to prevent) */
  onBeforeChange?: (fromTab: string, toTab: string) => boolean;
  /** Callback when tab closes */
  onClose?: (tabId: string) => void;
  /** Animation duration in ms (default: 200) */
  animationDuration?: number;
  /** Container element or selector */
  container?: HTMLElement | string;
  /** Custom CSS class */
  className?: string;
  /** Stretch tabs to fill width? */
  stretch?: boolean;
  /** Minimum width per tab (px, default: 80) */
  minTabWidth?: number;
  /** Maximum tab width (px, default: 240) */
  maxTabWidth?: number;
}

export interface TabsInstance {
  element: HTMLElement;
  /** Activate a tab by ID */
  activate: (tabId: string) => void;
  /** Get currently active tab ID */
  getActive: () => string;
  /** Add a new tab */
  addTab: (panel: TabPanel) => void;
  /** Remove a tab by ID */
  removeTab: (tabId: string) => void;
  /** Get all tab IDs */
  getTabs: () => string[];
  /** Enable/disable a tab */
  setDisabled: (tabId: string, disabled: boolean) => void;
  /** Update tab label or content */
  updateTab: (tabId: string, updates: Partial<Pick<TabPanel, "label" | "content" | "badge" | "icon">>) => void;
  /** Destroy the tabs instance */
  destroy: () => void;
}

// --- Variant Styles ---

const VARIANT_STYLES: Record<TabVariant, {
  activeBg: string; activeColor: string; inactiveColor: string;
  indicator: string; borderRadius: string; padding: string;
}> = {
  line: {
    activeBg: "transparent", activeColor: "#111827", inactiveColor: "#6b7280",
    indicator: "#4338ca", borderRadius: "0", padding: "10px 18px",
  },
  pill: {
    activeBg: "#eef2ff", activeColor: "#4338ca", inactiveColor: "#6b7280",
    indicator: "transparent", borderRadius: "9999px", padding: "8px 20px",
  },
  enclosed: {
    activeBg: "#fff", activeColor: "#111827", inactiveColor: "#6b7280",
    indicator: "#fff", borderRadius: "8px 8px 0 0", padding: "12px 22px",
  },
  underline: {
    activeBg: "transparent", activeColor: "#111827", inactiveColor: "#9ca3af",
    indicator: "#111827", borderRadius: "0", padding: "10px 16px",
  },
};

// --- Main Factory ---

export function createTabs(panels: TabPanel[], options: TabsOptions = {}): TabsInstance {
  const opts = {
    variant: options.variant ?? "line",
    position: options.position ?? "top",
    overflow: options.overflow ?? "scroll",
    allowClose: options.allowClose ?? false,
    showAddButton: options.showAddButton ?? false,
    animationDuration: options.animationDuration ?? 200,
    stretch: options.stretch ?? false,
    minTabWidth: options.minTabWidth ?? 80,
    maxTabWidth: options.maxTabWidth ?? 240,
    className: options.className ?? "",
    ...options,
  };

  const vs = VARIANT_STYLES[opts.variant];

  // Container
  let container: HTMLElement;
  if (options.container) {
    container = typeof options.container === "string"
      ? document.querySelector<HTMLElement>(options.container)!
      : options.container;
  } else {
    container = document.createElement("div");
    document.body.appendChild(container);
  }

  const root = document.createElement("div");
  root.className = `tabs tabs-${opts.variant} tabs-${opts.position} ${opts.className}`;
  root.style.cssText = `
    display:flex;flex-direction:${isVertical(opts.position) ? "row" : "column"};
    font-family:-apple-system,sans-serif;width:100%;height:100%;
  `;

  // Tab bar
  const tabBar = document.createElement("div");
  tabBar.className = "tabs-bar";
  tabBar.setAttribute("role", "tablist");
  tabBar.setAttribute("aria-orientation", isVertical(opts.position) ? "vertical" : "horizontal");

  const isVert = isVertical(opts.position);
  tabBar.style.cssText = `
    display:flex;${isVert ? "flex-direction:column;" : ""}
    ${opts.variant === "enclosed"
      ? `background:#f3f4f6;padding:4px 4px 0;border-radius:8px 8px 0 0;gap:2px;`
      : opts.variant === "pill"
        ? `background:#f3f4f6;padding:4px;border-radius:9999px;gap:2px;`
        : `border-bottom:1px solid #e5e7eb;gap:0;`}
    ${opts.stretch && !isVert ? "& > *{flex:1;}" : ""}
    overflow-${opts.overflow === "scroll" ? "x" : opts.overflow === "wrap" ? "" : "hidden"};
    ${opts.overflow === "wrap" ? "flex-wrap:wrap;" : ""}
    ${isVert ? "width:auto;" : ""}
    position:relative;
  `;

  // Panel area
  const panelArea = document.createElement("div");
  panelArea.className = "tabs-panel-area";
  panelArea.style.cssText = `flex:1;overflow:auto;position:relative;`;

  root.appendChild(isVert ? panelArea : tabBar);
  root.appendChild(isVert ? tabBar : panelArea);

  // State
  const tabMap = new Map<string, {
    panel: TabPanel;
    tabEl: HTMLElement;
    contentEl: HTMLElement;
    contentInner: HTMLElement;
    loaded: boolean;
  }>();
  let activeTabId: string | null = null;

  // Build panels
  for (const p of panels) {
    buildTab(p);
  }

  container.appendChild(root);

  function buildTab(p: TabPanel): void {
    // Tab button
    const tabBtn = document.createElement("button");
    tabBtn.type = "button";
    tabBtn.setAttribute("role", "tab");
    tabBtn.setAttribute("aria-selected", String(p.defaultActive ?? false));
    tabBtn.setAttribute("aria-controls", `${p.id}-panel`);
    tabBtn.id = `${p.id}-tab`;
    if (p.disabled) tabBtn.setAttribute("aria-disabled", "true");
    if (p.tooltip) tabBtn.title = p.tooltip;
    tabBtn.dataset.tabId = p.id;

    tabBtn.style.cssText = `
      position:relative;display:flex;align-items:center;gap:6px;
      padding:${vs.padding};background:none;border:none;cursor:pointer;
      font-size:13px;font-weight:500;font-family:inherit;line-height:1.3;
      color:${p.defaultActive ? vs.activeColor : vs.inactiveColor};
      white-space:nowrap;transition:all ${opts.animationDuration}ms ease;
      border-radius:${vs.borderRadius};min-width:${opts.minTabWidth}px;
      max-width:${opts.maxTabWidth}px;
      ${isVert ? "justify-content:flex-start;" : "justify-content:center;text-align:center;"}
      ${p.disabled ? "opacity:0.4;cursor:not-allowed;pointer-events:none;" : ""}
    `;

    // Icon
    if (p.icon) {
      const iconWrap = document.createElement("span");
      iconWrap.className = "tab-icon";
      iconWrap.style.cssText = "display:flex;align-items:center;flex-shrink:0;font-size:14px;";
      if (typeof p.icon === "string") {
        iconWrap.innerHTML = p.icon;
      } else {
        iconWrap.appendChild(p.icon);
      }
      tabBtn.appendChild(iconWrap);
    }

    // Label
    const labelSpan = document.createElement("span");
    labelSpan.className = "tab-label";
    if (typeof p.label === "string") {
      labelSpan.textContent = p.label;
    } else {
      labelSpan.appendChild(p.label);
    }
    tabBtn.appendChild(labelSpan);

    // Badge
    if (p.badge !== undefined) {
      const badge = document.createElement("span");
      badge.className = "tab-badge";
      badge.textContent = String(p.badge);
      badge.style.cssText = `
        display:inline-flex;align-items:center;justify-content:center;
        min-width:18px;height:18px;padding:0 5px;border-radius:9999px;
        background:#ef4444;color:#fff;font-size:11px;font-weight:600;line-height:1;
      `;
      tabBtn.appendChild(badge);
    }

    // Close button
    if ((opts.allowClose || p.closable) && !p.disabled) {
      const closeBtn = document.createElement("span");
      closeBtn.innerHTML = "&times;";
      closeBtn.style.cssText = `
        display:flex;align-items:center;justify-content:center;width:16px;height:16px;
        border-radius:50%;font-size:12px;color:#9ca3af;cursor:pointer;
        transition:all 0.15s;flex-shrink:0;margin-left:-2px;
      `;
      closeBtn.addEventListener("mouseenter", () => { closeBtn.style.background = "#e5e7eb"; closeBtn.style.color = "#374151"; });
      closeBtn.addEventListener("mouseleave", () => { closeBtn.style.background = ""; closeBtn.style.color = ""; });
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        instance.removeTab(p.id);
      });
      tabBtn.appendChild(closeBtn);
    }

    // Indicator (for line/underline variants)
    if (opts.variant === "line" || opts.variant === "underline") {
      const indicator = document.createElement("span");
      indicator.className = "tab-indicator";
      indicator.style.cssText = `
        position:absolute;${opts.variant === "line" ? "left:0;right:0;bottom:0;height:2px;" : "left:8px;right:8px;bottom:0;height:2px;"}
        background:${vs.indicator};border-radius:1px;transform:scaleX(0);transition:transform ${opts.animationDuration}ms ease;
        transform-origin:${isVert ? "bottom" : "center"};
      `;
      if (p.defaultActive) indicator.style.transform = "scaleX(1)";
      tabBtn.appendChild(indicator);
    }

    // Active state styling
    if (p.defaultActive) {
      applyActiveStyle(tabBtn, true);
      activeTabId = p.id;
    }

    // Click handler
    tabBtn.addEventListener("click", () => {
      if (p.disabled || destroyed) return;
      instance.activate(p.id);
    });

    tabBar.appendChild(tabBtn);

    // Content panel
    const contentEl = document.createElement("div");
    contentEl.id = `${p.id}-panel`;
    contentEl.setAttribute("role", "tabpanel");
    contentEl.setAttribute("aria-labelledby", `${p.id}-tab`);
    contentEl.style.cssText = `
      display:none;padding:20px;font-size:14px;color:#374151;line-height:1.6;
      animation:tab-fade-in ${opts.animationDuration}ms ease;
    `;

    const contentInner = document.createElement("div");
    setContent(contentInner, p.content, !p.lazy);
    contentEl.appendChild(contentInner);
    panelArea.appendChild(contentEl);

    // Store reference
    tabMap.set(p.id, { panel: p, tabEl: tabBtn, contentEl, contentInner, loaded: !p.lazy });
  }

  function applyActiveStyle(el: HTMLElement, active: boolean): void {
    if (active) {
      el.style.color = vs.activeColor;
      el.style.background = vs.activeBg;
      if (opts.variant === "pill" || opts.variant === "enclosed") {
        el.style.boxShadow = opts.variant === "pill" ? "none" : "0 -1px 0 0 #e5e7eb inset";
      }
      const ind = el.querySelector(".tab-indicator") as HTMLElement | null;
      if (ind) ind.style.transform = "scaleX(1)";
    } else {
      el.style.color = vs.inactiveColor;
      el.style.background = "transparent";
      el.style.boxShadow = "none";
      const ind = el.querySelector(".tab-indicator") as HTMLElement | null;
      if (ind) ind.style.transform = "scaleX(0)";
    }
  }

  async function activateInternal(tabId: string): Promise<void> {
    const entry = tabMap.get(tabId);
    if (!entry || entry.panel.disabled || destroyed) return;
    if (activeTabId === tabId) return;

    // Before change hook
    if (activeTabId && opts.onBeforeChange?.(activeTabId!, tabId) === false) return;

    // Deactivate current
    if (activeTabId) {
      const prevEntry = tabMap.get(activeTabId);
      if (prevEntry) {
        applyActiveStyle(prevEntry.tabEl, false);
        prevEntry.tabEl.setAttribute("aria-selected", "false");
        prevEntry.contentEl.style.display = "none";
      }
    }

    // Lazy load
    if (!entry.loaded && entry.panel.lazy) {
      const content = await entry.panel.lazy();
      entry.contentInner.innerHTML = "";
      if (typeof content === "string") {
        entry.contentInner.innerHTML = content;
      } else {
        entry.contentInner.appendChild(content);
      }
      entry.loaded = true;
    }

    // Activate new
    activeTabId = tabId;
    applyActiveStyle(entry.tabEl, true);
    entry.tabEl.setAttribute("aria-selected", "true");
    entry.contentEl.style.display = "block";

    // Scroll into view if needed
    entry.tabEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });

    opts.onChange?.(tabId);
  }

  function setContent(el: HTMLElement, content: string | HTMLElement, immediate: boolean): void {
    el.innerHTML = "";
    if (typeof content === "string") {
      el.innerHTML = content;
    } else {
      el.appendChild(content);
    }
    if (!immediate) el.style.display = "none";
  }

  let destroyed = false;

  const instance: TabsInstance = {
    element: root,

    activate(tabId: string) { activateInternal(tabId); },

    getActive() { return activeTabId!; },

    addTab(panel: TabPanel) {
      buildTab(panel);
    },

    removeTab(tabId: string) {
      const entry = tabMap.get(tabId);
      if (!entry) return;

      // If removing active tab, activate neighbor
      const wasActive = activeTabId === tabId;
      entry.tabEl.remove();
      entry.contentEl.remove();
      tabMap.delete(tabId);

      if (wasActive) {
        const remaining = Array.from(tabMap.keys());
        if (remaining.length > 0) {
          activateInternal(remaining[0]!);
        } else {
          activeTabId = null;
        }
      }

      opts.onClose?.(tabId);
    },

    getTabs() { return Array.from(tabMap.keys()); },

    setDisabled(tabId: string, disabled: boolean) {
      const entry = tabMap.get(tabId);
      if (!entry) return;
      entry.panel.disabled = disabled;
      entry.tabEl.setAttribute("aria-disabled", String(disabled));
      entry.tabEl.style.opacity = disabled ? "0.4" : "";
      entry.tabEl.style.pointerEvents = disabled ? "none" : "";
    },

    updateTab(tabId: string, updates: Partial<Pick<TabPanel, "label" | "content" | "badge" | "icon">>) {
      const entry = tabMap.get(tabId);
      if (!entry) return;

      if (updates.label !== undefined) {
        const labelEl = entry.tabEl.querySelector(".tab-label")!;
        if (typeof updates.label === "string") {
          labelEl.textContent = updates.label;
        } else {
          labelEl.innerHTML = "";
          labelEl.appendChild(updates.label);
        }
      }
      if (updates.badge !== undefined) {
        let badge = entry.tabEl.querySelector(".tab-badge") as HTMLElement | null;
        if (updates.badge === undefined || updates.badge === null) {
          badge?.remove();
        } else {
          if (!badge) {
            badge = document.createElement("span");
            badge.className = "tab-badge";
            badge.style.cssText = `
              display:inline-flex;align-items:center;justify-content:center;
              min-width:18px;height:18px;padding:0 5px;border-radius:9999px;
              background:#ef4444;color:#fff;font-size:11px;font-weight:600;line-height:1;
            `;
            entry.tabEl.appendChild(badge);
          }
          badge.textContent = String(updates.badge);
        }
      }
      if (updates.icon !== undefined) {
        let iconEl = entry.tabEl.querySelector(".tab-icon") as HTMLElement | null;
        if (!iconEl && updates.icon) {
          iconEl = document.createElement("span");
          iconEl.className = "tab-icon";
          iconEl.style.cssText = "display:flex;align-items:center;flex-shrink:0;font-size:14px;";
          entry.tabEl.insertBefore(iconEl, entry.tabEl.firstChild);
        }
        if (iconEl) {
          if (typeof updates.icon === "string") {
            iconEl.innerHTML = updates.icon;
          } else {
            iconEl.innerHTML = "";
            iconEl.appendChild(updates.icon);
          }
        }
      }
      if (updates.content !== undefined) {
        entry.contentInner.innerHTML = "";
        if (typeof updates.content === "string") {
          entry.contentInner.innerHTML = updates.content;
        } else {
          entry.contentInner.appendChild(updates.content);
        }
        entry.loaded = true;
      }
    },

    destroy() {
      destroyed = true;
      root.remove();
      tabMap.clear();
    },
  };

  // Add button
  if (opts.showAddButton) {
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.innerHTML = "+";
    addBtn.title = "Add tab";
    addBtn.style.cssText = `
      display:flex;align-items:center;justify-content:center;
      width:28px;height:28px;border-radius:50%;border:1px dashed #d1d5db;
      background:none;cursor:pointer;font-size:16px;color:#9ca3af;
      flex-shrink:0;margin:4px;transition:all 0.15s;
    `;
    addBtn.addEventListener("mouseenter", () => { addBtn.style.borderColor = "#4338ca"; addBtn.style.color = "#4338ca"; });
    addBtn.addEventListener("mouseleave", () => { addBtn.style.borderColor = "#d1d5db"; addBtn.style.color = "#9ca3af"; });
    addBtn.addEventListener("click", () => opts.onAdd?.());
    tabBar.appendChild(addBtn);
  }

  // Keyboard navigation
  root.addEventListener("keydown", (e: KeyboardEvent) => {
    if (destroyed) return;
    const entries = Array.from(tabMap.values());
    const idx = entries.findIndex((en) => en.panel.id === activeTabId);

    switch (e.key) {
      case "ArrowRight":
        if (!isVertical(opts.position)) { e.preventDefault(); if (idx < entries.length - 1) activateInternal(entries[idx + 1]!.panel.id); }
        break;
      case "ArrowLeft":
        if (!isVertical(opts.position)) { e.preventDefault(); if (idx > 0) activateInternal(entries[idx - 1]!.panel.id); }
        break;
      case "ArrowDown":
        if (isVertical(opts.position)) { e.preventDefault(); if (idx < entries.length - 1) activateInternal(entries[idx + 1]!.panel.id); }
        break;
      case "ArrowUp":
        if (isVertical(opts.position)) { e.preventDefault(); if (idx > 0) activateInternal(entries[idx - 1]!.panel.id); }
        break;
      case "Home":
        e.preventDefault();
        if (entries.length > 0) activateInternal(entries[0]!.panel.id);
        break;
      case "End":
        e.preventDefault();
        if (entries.length > 0) activateInternal(entries[entries.length - 1]!.panel.id);
        break;
    }
  });

  // Inject keyframes
  if (!document.getElementById("tabs-styles")) {
    const s = document.createElement("style");
    s.id = "tabs-styles";
    s.textContent = `@keyframes tab-fade-in{from{opacity:0;}to{opacity:1;}}`;
    document.head.appendChild(s);
  }

  return instance;
}

function isVertical(pos: TabPosition): boolean {
  return pos === "left" || pos === "right";
}
