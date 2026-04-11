/**
 * Action Bar: Toolbar/action bar component with grouped buttons, dropdown menus,
 * separators, search input, overflow menu, keyboard shortcuts,
 * toggle states, badges, loading states, and responsive overflow.
 */

// --- Types ---

export type ActionType = "button" | "toggle" | "dropdown" | "separator" | "search" | "custom" | "spacer" | "label";

export interface ActionBarAction {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Action type */
  type?: ActionType;
  /** Icon (emoji, SVG string, or HTML) */
  icon?: string | HTMLElement;
  /** Tooltip text */
  tooltip?: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Click/toggle callback */
  action?: () => void;
  /** Items for dropdown type */
  items?: { id: string; label: string; action?: () => void; icon?: string }[];
  /** Is this a toggle that's currently active? */
  active?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Hidden state */
  hidden?: boolean;
  /** Badge count */
  badge?: number | string;
  /** Loading state (shows spinner) */
  loading?: boolean;
  /** Danger/destructive styling */
  danger?: boolean;
  /** Primary/prominent button */
  primary?: boolean;
  /** Group this action belongs to (actions in same group are visually grouped) */
  group?: string;
  /** Custom HTML element for 'custom' type */
  customElement?: HTMLElement;
  /** Search placeholder text (for search type) */
  placeholder?: string;
  /** Search value change handler */
  onSearch?: (value: string) => void;
  /** Custom data payload */
  data?: unknown;
}

export type ActionBarVariant = "default" | "filled" | "outline" | "minimal";
export type ActionBarSize = "sm" | "md" | "lg";
type ActionBarAlignment = "left" | "center" | "right" | "space-between";

export interface ActionBarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Actions to display */
  actions: ActionBarAction[];
  /** Visual variant */
  variant?: ActionBarVariant;
  /** Size variant */
  size?: ActionBarSize;
  /** Alignment of actions within bar */
  align?: ActionBarAlignment;
  /** Show shortcut hints? */
  showShortcuts?: boolean;
  /** Show tooltips? */
  showTooltips?: boolean;
  /** Overflow behavior ("menu" = put extras in overflow menu, "wrap" = wrap to next line) */
  overflow?: "menu" | "wrap" | "scroll" | "hide";
  /** Overflow menu label */
  overflowLabel?: string;
  /** Compact mode (icons only, no labels)? */
  compact?: boolean;
  /** Fixed height (px) */
  height?: number;
  /** Sticky positioning? */
  sticky?: boolean;
  /** Top offset when sticky (px) */
  stickyTop?: number;
  /** Z-index */
  zIndex?: number;
  /** Custom CSS class */
  className?: string;
}

export interface ActionBarInstance {
  element: HTMLElement;
  /** Update all actions */
  setActions: (actions: ActionBarAction[]) => void;
  /** Update a single action by ID */
  updateAction: (id: string, updates: Partial<ActionBarAction>) => void;
  /** Set action active/inactive (for toggles) */
  setActive: (id: string, active: boolean) => void;
  /** Set action disabled/enabled */
  setDisabled: (id: string, disabled: boolean) => void;
  /** Set action loading state */
  setLoading: (id: string, loading: boolean) => void;
  /** Set badge count */
  setBadge: (id: string, badge: number | string | null) => void;
  /** Show/hide an action */
  setVisible: (id: string, visible: boolean) => void;
  /** Focus search input (if present) */
  focusSearch: () => void;
  /** Destroy */
  destroy: () => void;
}

// --- Size Config ---

const SIZE_STYLES: Record<ActionBarSize, {
  height: number; fontSize: number; padding: string; iconSize: number; gap: number;
}> = {
  sm: { height: 32, fontSize: 12, padding: "4px 8px", iconSize: 14, gap: 2 },
  md: { height: 40, fontSize: 13, padding: "6px 12px", iconSize: 16, gap: 4 },
  lg: { height: 48, fontSize: 14, padding: "8px 16px", iconSize: 18, gap: 6 },
};

// --- Main Factory ---

export function createActionBar(options: ActionBarOptions): ActionBarInstance {
  const opts = {
    variant: options.variant ?? "default",
    size: options.size ?? "md",
    align: options.align ?? "left",
    showShortcuts: options.showShortcuts ?? false,
    showTooltips: options.showTooltips ?? true,
    overflow: options.overflow ?? "hide",
    overflowLabel: options.overflowLabel ?? "\u22EE More",
    compact: options.compact ?? false,
    height: options.height,
    sticky: options.sticky ?? false,
    stickyTop: options.stickyTop ?? 0,
    zIndex: options.zIndex ?? 100,
    className: options.className ?? "",
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("ActionBar: container not found");

  let actions = [...options.actions];
  let destroyed = false;

  const ss = SIZE_STYLES[opts.size];

  // Root element
  const root = document.createElement("div");
  root.className = `action-bar ab-${opts.variant} ab-${opts.size} ${opts.className}`;
  root.style.cssText = `
    display:flex;align-items:center;gap:${ss.gap}px;
    ${opts.align === "center" ? "justify-content:center;" : ""}
    ${opts.align === "right" ? "justify-content:flex-end;" : ""}
    ${opts.align === "space-between" ? "justify-content:space-between;" : ""}
    ${opts.height ? `height:${opts.height}px;` : `min-height:${ss.height}px;`}
    padding:0 8px;font-family:-apple-system,sans-serif;
    ${opts.variant === "filled" ? "background:#f3f4f6;" : ""}
    ${opts.variant === "outline" ? "border-bottom:1px solid #e5e7eb;" : ""}
    ${opts.sticky ? `position:sticky;top:${opts.stickyTop}px;z-index:${opts.zIndex};` : ""}
    flex-wrap:${opts.overflow === "wrap" ? "wrap" : "nowrap"};
    overflow-x:${opts.overflow === "scroll" ? "auto" : "hidden"};
  `;
  container.appendChild(root);

  // Tooltip element
  let tooltipEl: HTMLElement | null = null;

  function getTooltip(): HTMLElement {
    if (!tooltipEl) {
      tooltipEl =.createElement("div");
      tooltipEl.style.cssText = `
        position:absolute;z-index:9999;padding:4px 10px;border-radius:5px;
        background:#1f2937;color:#fff;font-size:11px;pointer-events:none;
        white-space:nowrap;opacity:0;transition:opacity 0.12s;
        transform:translate(-50%, -100%);margin-top:-6px;
      `;
      // Append to body for proper positioning
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  // --- Rendering ---

  function render(): void {
    root.innerHTML = "";

    // Group actions
    const groups = new Map<string, ActionBarAction[]>();
    let visibleCount = 0;

    for (const act of actions) {
      if (act.hidden) continue;
      visibleCount++;
      const g = act.group ?? "__default__";
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(act);
    }

    let groupIdx = 0;
    for (const [groupId, groupActions] of groups) {
      // Group wrapper (visual grouping with rounded borders)
      if (groupId !== "__default__" && groupActions.length > 1) {
        const groupWrap = document.createElement("div");
        groupWrap.className = "ab-group";
        groupWrap.style.cssText = `
          display:inline-flex;align-items:center;
          border:1px solid ${opts.variant === "filled" ? "#d1d5db" : "transparent"};
          border-radius:8px;overflow:hidden;
          ${opts.variant === "filled" ? "" : "margin:0 2px;"}
        `;

        for (const act of groupActions) {
          groupWrap.appendChild(createActionElement(act));
        }
        root.appendChild(groupWrap);
      } else {
        for (const act of groupActions) {
          root.appendChild(createActionElement(act));
        }
      }

      // Separator between groups
      if (groupIdx < groups.size - 1) {
        const sep = document.createElement("div");
        sep.className = "ab-separator";
        sep.style.cssText = `width:1px;height:${ss.height - 12}px;background:#e5e7eb;margin:0 4px;flex-shrink:0;`;
        root.appendChild(sep);
      }
      groupIdx++;
    }

    // Overflow menu
    if (opts.overflow === "menu") {
      // Count visible vs rendered (simplified: always show overflow trigger)
      const overflowBtn = createElement("button");
      overflowBtn.type = "button";
      overflowBtn.className = "ab-overflow";
      overflowBtn.textContent = opts.overflowLabel;
      overflowBtn.style.cssText = `
        display:flex;align-items:center;gap:4px;
        padding:${ss.padding};border-radius:6px;
        border:1px solid transparent;background:none;
        cursor:pointer;font-size:${ss.fontSize}px;color:#6b7280;
        white-space:nowrap;flex-shrink:0;
      `;
      overflowBtn.addEventListener("mouseenter", () => { overflowBtn.style.background = "#f3f4f6"; });
      overflowBtn.addEventListener("mouseleave", () => { overflowBtn.style.background = ""; });
      root.appendChild(overflowBtn);
    }
  }

  function createActionElement(act: ActionBarAction): HTMLElement {
    // Separator
    if (act.type === "separator") {
      const sep = document.createElement("div");
      sep.style.cssText = `width:1px;height:${ss.height - 12}px;background:#e5e7eb;flex-shrink:0;`;
      return sep;
    }

    // Spacer
    if (act.type === "spacer") {
      const spacer = document.createElement("div");
      spacer.style.cssText = "flex:1;";
      return spacer;
    }

    // Label
    if (act.type === "label") {
      const lbl = document.createElement("span");
      lbl.className = "ab-label";
      lbl.style.cssText = `
        font-size:${ss.fontSize}px;color:#9ca3af;font-weight:500;
        padding:0 8px;white-space:nowrap;text-transform:uppercase;letter-spacing:0.04em;
      `;
      lbl.textContent = act.label;
      return lbl;
    }

    // Custom element
    if (act.type === "custom" && act.customElement) {
      return act.customElement.cloneNode(true) as HTMLElement;
    }

    // Search input
    if (act.type === "search") {
      const wrap = document.createElement("div");
      wrap.style.cssText = `
        display:flex;align-items:center;gap:4px;
        background:${opts.variant === "filled" ? "#fff" : "#f3f4f6"};
        border:1px solid #d1d5db;border-radius:6px;
        padding:0 8px;height:${ss.height - 8}px;
      `;

      const searchIcon = document.createElement("span");
      searchIcon.innerHTML = `\u{1F50D}`;
      searchIcon.style.cssText = `font-size:${ss.iconSize}px;opacity:0.5;`;
      wrap.appendChild(searchIcon);

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = act.placeholder ?? "Search...";
      input.style.cssText = `
        border:none;background:none;outline:none;font-size:${ss.fontSize}px;
        color:#374151;width:120px;
      `;
      input.addEventListener("input", () => { act.onSearch?.(input.value); });
      wrap.appendChild(input);

      return wrap;
    }

    // Button / Toggle / Dropdown
    const isToggle = act.type === "toggle";
    const isDropdown = act.type === "dropdown";
    const isActive = isToggle && act.active;
    const isPrimary = act.primary;
    const isDanger = act.danger;
    const isDisabled = act.disabled;
    const isLoading = act.loading;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `ab-action ${isToggle ? "ab-toggle" : ""} ${isDropdown ? "ab-dropdown" : ""}`;
    btn.dataset.actionId = act.id;
    btn.disabled = isDisabled;
    btn.style.cssText = `
      display:inline-flex;align-items:center;gap:5px;
      padding:${ss.padding};border-radius:6px;
      border:1px solid ${
        isPrimary ? opts.variant === "outline" ? "#6366f1" : "transparent" :
        opts.variant === "outline" ? "#d1d5db" : "transparent"
      };
      cursor:${isDisabled ? "not-allowed" : "pointer"};
      font-size:${ss.fontSize}px;font-weight:500;
      white-space:nowrap;flex-shrink:0;
      transition:all 0.15s;position:relative;
      ${isDisabled ? "opacity:0.45;" : ""}
      ${isPrimary ? `background:#6366f1;color:#fff;` :
        isDanger ? `color:#dc2626;` :
        isActive ? `background:#eef2ff;color:#4338ca;` :
        `color:#374151;background:none;`}
      ${isLoading ? "opacity:0.7;" : ""}
    `;

    // Icon
    if (act.icon && !opts.compact) {
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = typeof act.icon === "string" ? act.icon : "";
      iconSpan.style.cssText = `font-size:${ss.iconSize}px;line-height:1;display:flex;`;
      btn.appendChild(iconSpan);
    } else if (act.icon && opts.compact) {
      // Compact: only icon
      const iconSpan = document.createElement("span");
      iconSpan.innerHTML = typeof act.icon === "string" ? act.icon : "";
      iconSpan.style.cssText = `font-size:${ss.iconSize}px;line-height:1;display:flex;`;
      btn.innerHTML = "";
      btn.appendChild(iconSpan);
    }

    // Label (not in compact mode unless no icon)
    if (!opts.compact || !act.icon) {
      const label = document.createElement("span");
      label.textContent = act.label;
      btn.appendChild(label);
    }

    // Shortcut hint
    if (opts.showShortcuts && act.shortcut) {
      const kbd = document.createElement("kbd");
      kbd.textContent = act.shortcut;
      kbd.style.cssText = `
        font-size:10px;color:#9ca3af;background:#f3f4f6;
        padding:1px 5px;border-radius:3px;border:1px solid #e5e7eb;
        margin-left:2px;
      `;
      btn.appendChild(kbd);
    }

    // Badge
    if (act.badge !== undefined && act.badge !== null) {
      const badge = document.createElement("span");
      badge.className = "ab-badge";
      badge.style.cssText = `
        position:absolute;top:-4px;right:-4px;
        min-width:16px;height:16px;border-radius:8px;
        background:#ef4444;color:#fff;font-size:10px;font-weight:700;
        display:flex;align-items:center;justify-content:center;
        padding:0 4px;line-height:1;
      `;
      badge.textContent = String(act.badge);
      btn.appendChild(badge);
    }

    // Loading spinner
    if (isLoading) {
      const spinner = document.createElement("span");
      spinner.innerHTML = `<svg width="${ss.iconSize}" height="${ss.iconSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"><animateTransform attributeName="transform" type="rotate" dur="1s" from="0 12 12" to="360 12 12" repeatCount="indefinite"/></circle></svg>`;
      spinner.style.cssText = `animation:spin 1s linear infinite;`;
      btn.appendChild(spinner);
    }

    // Dropdown arrow
    if (isDropdown) {
      const arrow = document.createElement("span");
      arrow.innerHTML = "\u25BE";
      arrow.style.cssText = "font-size:10px;margin-left:2px;";
      btn.appendChild(arrow);
    }

    // Events
    if (!isDisabled && !isLoading) {
      btn.addEventListener("click", () => {
        if (isDropdown && act.items) {
          showDropdownMenu(btn, act.items);
        } else {
          if (isToggle) {
            act.active = !act.active;
            render();
          }
          act.action?.();
        }
      });

      // Hover effects
      btn.addEventListener("mouseenter", () => {
        if (isPrimary) btn.style.background = "#4f46e5";
        else if (isDanger) btn.style.background = "#fef2f2";
        else btn.style.background = "#f3f4f6";
      });
      btn.addEventListener("mouseleave", () => {
        if (isPrimary) btn.style.background = "#6366f1";
        else if (isDanger) btn.style.background = "";
        else if (isActive) btn.style.background = "#eef2ff";
        else btn.style.background = "";
      });

      // Tooltip
      if (opts.showTooltips && act.tooltip) {
        btn.addEventListener("mouseenter", (e) => {
          const tt = getTooltip();
          tt.textContent = act.tooltip!;
          const rect = btn.getBoundingClientRect();
          tt.style.left = `${rect.left + rect.width / 2}px`;
          tt.style.top = `${rect.top}px`;
          tt.style.opacity = "1";
        });
        btn.addEventListener("mouseleave", () => {
          if (tooltipEl) tooltipEl.style.opacity = "0";
        });
      }
    }

    return btn;
  }

  function showDropdownMenu(trigger: HTMLElement, items: { id: string; label: string; action?: () => void; icon?: string }[]): void {
    // Simple dropdown implementation
    const menu = document.createElement("div");
    menu.className = "ab-dropdown-menu";
    menu.style.cssText = `
      position:absolute;z-index:1000;min-width:160px;
      background:#fff;border:1px solid #e5e7eb;border-radius:8px;
      box-shadow:0 8px 24px rgba(0,0,0,0.12);padding:4px;
      font-family:-apple-system,sans-serif;
    `;

    const rect = trigger.getBoundingClientRect();
    menu.style.left = `${rect.left}px`;
    menu.style.top = `${rect.bottom + 4}px`;

    for (const item of items) {
      const mi = document.createElement("button");
      mi.type = "button";
      mi.style.cssText = `
        display:flex;align-items:center;gap:8px;width:100%;
        padding:7px 12px;border:none;background:none;
        border-radius:5px;cursor:pointer;font-size:13px;color:#374151;
        text-align:left;
      `;
      if (item.icon) {
        const ic = document.createElement("span");
        ic.innerHTML = item.icon;
        mi.appendChild(ic);
      }
      const lbl = document.createElement("span");
      lbl.textContent = item.label;
      mi.appendChild(lbl);

      mi.addEventListener("mouseenter", () => { mi.style.background = "#f3f4f6"; });
      mi.addEventListener("mouseleave", () => { mi.style.background = ""; });
      mi.addEventListener("click", () => {
        menu.remove(); item.action?.();
      });
      menu.appendChild(mi);
    }

    document.body.appendChild(menu);

    // Click outside to close
    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node) && e.target !== trigger) {
        menu.remove(); document.removeEventListener("mousedown", closeHandler);
      }
    };
    setTimeout(() => document.addEventListener("mousedown", closeHandler), 0);
  }

  // Helper to create elements
  function createElement(tag: string): HTMLElement {
    return document.createElement(tag);
  }

  // Initial render
  render();

  // --- Instance ---

  const instance: ActionBarInstance = {
    element: root,

    setActions(newActions: ActionBarAction[]) {
      actions = [...newActions];
      render();
    },

    updateAction(id: string, updates: Partial<ActionBarAction>) {
      const idx = actions.findIndex(a => a.id === id);
      if (idx >= 0) { actions[idx] = { ...actions[idx]!, ...updates }; render(); }
    },

    setActive(id: string, active: boolean) {
      const idx = actions.findIndex(a => a.id === id);
      if (idx >= 0) { actions[idx]!.active = active; render(); }
    },

    setDisabled(id: string, disabled: boolean) {
      const idx = actions.findIndex(a => a.id === id);
      if (idx >= 0) { actions[idx]!.disabled = disabled; render(); }
    },

    setLoading(id: string, loading: boolean) {
      const idx = actions.findIndex(a => a.id === id);
      if (idx >= 0) { actions[idx]!.loading = loading; render(); }
    },

    setBadge(id: string, badge: number | string | null) {
      const idx = actions.findIndex(a => a.id === id);
      if (idx >= 0) { actions[idx]!.badge = badge; render(); }
    },

    setVisible(id: string, visible: boolean) {
      const idx = actions.findIndex(a => a.id === id);
      if (idx >= 0) { actions[idx]!.hidden = !visible; render(); }
    },

    focusSearch() {
      const searchInput = root.querySelector<HTMLInputElement>('.ab-action[data-type="search"] input, input[type="text"]');
      if (searchInput) searchInput.focus();
    },

    destroy() {
      destroyed = true;
      if (tooltipEl) { tooltipEl.remove(); tooltipEl = null; }
      root.remove();
      container.innerHTML = "";
    },
  };

  return instance;
}
