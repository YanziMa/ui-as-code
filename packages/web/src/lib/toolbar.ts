/**
 * Toolbar: Flexible action bar with button groups, dividers, search input,
 * overflow menu, alignment options, size variants, and responsive behavior.
 */

// --- Types ---

export type ToolbarAlignment = "start" | "center" | "end" | "space-between" | "space-around" | "space-evenly";
export type ToolbarSize = "sm" | "md" | "lg";

export interface ToolbarItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label?: string;
  /** Icon (emoji or SVG) */
  icon?: string;
  /** Type */
  type?: "button" | "divider" | "spacer" | "search" | "custom" | "dropdown";
  /** Button variant */
  variant?: "default" | "primary" | "ghost" | "danger";
  /** Disabled state */
  disabled?: boolean;
  /** Hidden state */
  hidden?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Active/toggle state (for toggle buttons) */
  active?: boolean;
  /** Dropdown items (for type="dropdown") */
  dropdownItems?: { id: string; label: string; icon?: string; onClick?: () => void }[];
  /** Click handler */
  onClick?: () => void;
  /** Custom element renderer */
  render?: (container: HTMLElement) => HTMLElement;
}

export interface ToolbarOptions {
  /** Container element or selector */
  container: HTMLElement | string;
  /** Toolbar items */
  items: ToolbarItem[];
  /** Alignment of content */
  align?: ToolbarAlignment;
  /** Size variant */
  size?: ToolbarSize;
  /** Show border? */
  bordered?: boolean;
  /** Background color */
  background?: string;
  /** Rounded corners? */
  rounded?: boolean;
  /** Sticky positioning? */
  sticky?: boolean | "top" | "bottom";
  /** Z-index (useful when sticky) */
  zIndex?: number;
  /** Compact mode (icons only) */
  compact?: boolean;
  /** Overflow into "more" menu when space is limited */
  overflowMenu?: boolean;
  /** Callback when item clicked */
  onItemClick?: (item: ToolbarItem) => void;
  /** Custom CSS class */
  className?: string;
}

export interface ToolbarInstance {
  element: HTMLElement;
  getItems: () => ToolbarItem[];
  setItems: (items: ToolbarItem[]) => void;
  addItem: (item: ToolbarItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<ToolbarItem>) => void;
  setCompact: (compact: boolean) => void;
  destroy: () => void;
}

// --- Config ---

const SIZE_STYLES: Record<ToolbarSize, { padding: string; fontSize: string; iconSize: string; gap: string }> = {
  sm:   { padding: "4px 8px", fontSize: "12px", iconSize: "14px", gap: "2px" },
  md:   { padding: "6px 12px", fontSize: "13px", iconSize: "16px", gap: "4px" },
  lg:   { padding: "8px 16px", fontSize: "14px", iconSize: "18px", gap: "6px" },
};

const VARIANT_STYLES: Record<string, { bg: string; color: string; hoverBg: string }> = {
  default: { bg: "transparent", color: "#374151", hoverBg: "#f3f4f6" },
  primary: { bg: "#4338ca", color: "#fff", hoverBg: "#3730a3" },
  ghost:   { bg: "transparent", color: "#6b7280", hoverBg: "#f9fafb" },
  danger:  { bg: "transparent", color: "#dc2626", hoverBg: "#fef2f2" },
};

// --- Main Factory ---

export function createToolbar(options: ToolbarOptions): ToolbarInstance {
  const opts = {
    align: options.align ?? "start",
    size: options.size ?? "md",
    bordered: options.bordered ?? true,
    background: options.background ?? "#fff",
    rounded: options.rounded ?? false,
    sticky: options.sticky ?? false,
    zIndex: options.zIndex ?? 100,
    compact: options.compact ?? false,
    overflowMenu: options.overflowMenu ?? false,
    ...options,
  };

  const container = typeof options.container === "string"
    ? document.querySelector<HTMLElement>(options.container)!
    : options.container;

  if (!container) throw new Error("Toolbar: container not found");

  let items = [...options.items];
  let destroyed = false;

  // Root
  const root = document.createElement("div");
  root.className = `toolbar ${opts.className ?? ""}`;
  const sz = SIZE_STYLES[opts.size];

  let positionStyle = "";
  if (opts.sticky === true || opts.sticky === "top") positionStyle = `position:sticky;top:0;z-index:${opts.zIndex};`;
  else if (opts.sticky === "bottom") positionStyle = `position:sticky;bottom:0;z-index:${opts.zIndex};`;

  root.style.cssText = `
    display:flex;align-items:center;${getAlignStyle(opts.align)}gap:${sz.gap};
    background:${opts.background};
    padding:${sz.padding};
    font-size:${sz.fontSize};
    font-family:-apple-system,sans-serif;color:#374151;
    ${opts.bordered ? `border-bottom:1px solid #e5e7eb;` : ""}
    ${opts.rounded ? "border-radius:8px;" : ""}
    ${positionStyle}
    flex-shrink:0;overflow-x:auto;
  `;
  container.appendChild(root);

  function getAlignStyle(align: ToolbarAlignment): string {
    switch (align) {
      case "center": return "justify-content:center;";
      case "end": return "justify-content:flex-end;";
      case "space-between": return "justify-content:space-between;";
      case "space-around": return "justify-content:space-around;";
      case "space-evenly": return "justify-content:space-evenly;";
      default: return "";
    }
  }

  function render(): void {
    // Preserve custom elements
    const customEls = new Map<string, HTMLElement>();
    root.querySelectorAll("[data-toolbar-custom]").forEach((el) => {
      customEls.set(el.dataset.toolbarCustom!, el as HTMLElement);
    });

    root.innerHTML = "";

    for (const item of items) {
      if (item.hidden) continue;

      switch (item.type) {
        case "divider":
          root.appendChild(createDivider());
          break;
        case "spacer":
          const spacer = document.createElement("div");
          spacer.style.cssText = "flex:1;";
          root.appendChild(spacer);
          break;
        case "search":
          root.appendChild(createSearchInput(item));
          break;
        case "dropdown":
          root.appendChild(createDropdownButton(item));
          break;
        case "custom":
          if (item.render && customEls.has(item.id)) {
            root.appendChild(customEls.get(item.id)!);
          } else if (item.render) {
            const el = item.render(root);
            el.dataset.toolbarCustom = item.id;
            root.appendChild(el);
          }
          break;
        default:
          root.appendChild(createButton(item));
          break;
      }
    }
  }

  function createDivider(): HTMLElement {
    const div = document.createElement("div");
    div.className = "toolbar-divider";
    div.style.cssText = `width:1px;height:${sz.iconSize};background:#e5e7eb;flex-shrink:0;`;
    return div;
  }

  function createSearchInput(item: ToolbarItem): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display:flex;align-items:center;position:relative;";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = item.label ?? "Search...";
    input.spellcheck = false;
    input.style.cssText = `
      border:1px solid #d1d5db;border-radius:6px;padding:3px 10px 3px ${sz.iconSize === "14px" ? "28" : sz.iconSize === "16px" ? "32"}px;
      font-size:${sz.fontSize};color:#374151;outline:none;width:180px;
      transition:border-color 0.15s;background:#fff;font-family:inherit;
    `;
    input.addEventListener("focus", () => { input.style.borderColor = "#6366f1"; });
    input.addEventListener("blur", () => { input.style.borderColor = "#d1d5db"; });

    wrapper.appendChild(input);

    // Search icon
    const icon = document.createElement("span");
    icon.textContent = "\u{1F50D}";
    icon.style.cssText = `position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:${sz.fontSize};color:#9ca3af;pointer-events:none;`;
    wrapper.appendChild(icon);

    return wrapper;
  }

  function createDropdownButton(item: ToolbarItem): HTMLElement {
    const btn = createBaseButton(item);
    const arrow = document.createElement("span");
    arrow.innerHTML = "&rsaquo;";
    arrow.style.cssText = "margin-left:2px;font-size:11px;transition:transform 0.15s;";
    btn.appendChild(arrow);

    // Dropdown panel
    let isOpen = false;
    const panel = document.createElement("div");
    panel.style.cssText = `
      display:none;position:absolute;top:100%;left:0;margin-top:4px;
      min-width:150px;background:#fff;border-radius:8px;
      box-shadow:0 8px 24px rgba(0,0,0,0.12);border:1px solid #e5e7eb;
      padding:4px 0;z-index:${opts.zIndex + 10};
    `;
    btn.style.position = "relative";
    btn.appendChild(panel);

    if (item.dropdownItems) {
      for (const di of item.dropdownItems) {
        const diEl = document.createElement("div");
        diEl.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 12px;cursor:pointer;font-size:13px;color:#374151;transition:background 0.1s;";
        if (di.icon) {
          const ic = document.createElement("span");
          ic.textContent = di.icon;
          ic.style.cssText = "font-size:14px;";
          diEl.appendChild(ic);
        }
        const lbl = document.createElement("span");
        lbl.textContent = di.label;
        diEl.appendChild(lbl);
        diEl.addEventListener("click", (e) => { e.stopPropagation(); di.onClick?.(); togglePanel(); });
        diEl.addEventListener("mouseenter", () => { diEl.style.background = "#f5f3ff"; });
        diEl.addEventListener("mouseleave", () => { diEl.style.background = ""; });
        panel.appendChild(diEl);
      }
    }

    function togglePanel() {
      isOpen = !isOpen;
      panel.style.display = isOpen ? "block" : "none";
      arrow.style.transform = isOpen ? "rotate(90deg)" : "";
    }

    btn.addEventListener("click", (e) => { e.stopPropagation(); togglePanel(); });

    // Close on outside click
    document.addEventListener("mousedown", (e: MouseEvent) => {
      if (isOpen && !btn.contains(e.target as Node)) { isOpen = false; panel.style.display = "none"; arrow.style.transform = ""; }
    });

    return btn;
  }

  function createBaseButton(item: ToolbarItem): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.id = item.id;
    const variant = item.variant ?? "default";
    const vStyle = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;

    btn.style.cssText = `
      display:inline-flex;align-items:center;gap:4px;
      padding:${sz.padding};border:none;border-radius:6px;
      background:${item.active ? "#eef2ff" : vStyle.bg};
      color:${item.active ? "#4338ca" : vStyle.color};
      cursor:${item.disabled ? "not-allowed" : "pointer"};
      font-size:${sz.fontSize};font-weight:500;font-family:inherit;
      transition:all 0.15s;white-space:nowrap;flex-shrink:0;
      ${item.disabled ? "opacity:0.45;" : ""}
    `;

    // Icon
    if (item.icon) {
      const iconEl = document.createElement("span");
      iconEl.textContent = item.icon;
      iconEl.style.cssText = `font-size:${sz.iconSize};line-height:1;`;
      btn.appendChild(iconEl);
    }

    // Label
    if (item.label && !opts.compact) {
      const labelEl = document.createElement("span");
      labelEl.textContent = item.label;
      btn.appendChild(labelEl);
    }

    // Tooltip
    if (item.tooltip) {
      btn.title = item.tooltip;
    }

    // Events
    if (!item.disabled) {
      btn.addEventListener("click", () => {
        item.onClick?.();
        opts.onItemClick?.(item);
      });

      btn.addEventListener("mouseenter", () => {
        if (!item.active) btn.style.background = vStyle.hoverBg;
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = item.active ? "#eef2ff" : vStyle.bg;
      });
    }

    return btn;
  }

  function createButton(item: ToolbarItem): HTMLElement {
    return createBaseButton(item);
  }

  // Initial render
  render();

  const instance: ToolbarInstance = {
    element: root,

    getItems() { return [...items]; },

    setItems(newItems: ToolbarItem[]) {
      items = [...newItems];
      render();
    },

    addItem(newItem: ToolbarItem) {
      items.push(newItem);
      render();
    },

    removeItem(id: string) {
      items = items.filter((i) => i.id !== id);
      render();
    },

    updateItem(id: string, updates: Partial<ToolbarItem>) {
      const idx = items.findIndex((i) => i.id === id);
      if (idx >= 0) {
        items[idx] = { ...items[idx]!, ...updates };
        render();
      }
    },

    setCompact(compact: boolean) {
      opts.compact = compact;
      render();
    },

    destroy() {
      destroyed = true;
      root.remove();
    },
  };

  return instance;
}
