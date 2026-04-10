/**
 * Context Menu: Right-click context menu with nested submenus, icons,
 * keyboard navigation, separators, disabled items, checkboxes,
 * dynamic items, positioning (auto-flip), and accessibility.
 */

// --- Types ---

export interface ContextMenuItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Icon (emoji, URL, or SVG string) */
  icon?: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Action callback */
  action?: () => void | Promise<void>;
  /** Disabled state */
  disabled?: boolean;
  /** Danger/destructive style */
  danger?: boolean;
  /** Hidden (not rendered) */
  hidden?: boolean;
  /** Checkbox state (if present, item is toggleable) */
  checked?: boolean;
  /** Submenu items */
  children?: ContextMenuItem[];
  /** Separator before this item */
  separatorBefore?: boolean;
  /** Separator after this item */
  separatorAfter?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Tooltip/hint text */
  tooltip?: string;
}

export type ContextMenuPosition = { x: number; y: number } | "center";

export interface ContextMenuOptions {
  /** Menu items */
  items: ContextMenuItem[];
  /** Position to show at */
  position?: ContextMenuPosition;
  /** Parent element for z-index context (default: document.body) */
  parent?: HTMLElement;
  /** Min width (default: 180px) */
  minWidth?: number | string;
  /** Max width (default: 320px) */
  maxWidth?: number | string;
  /** Z-index (default: 10000) */
  zIndex?: number;
  /** Animation duration (ms, default: 120) */
  animationDuration?: number;
  /** Close on item click (default: true) */
  closeOnClick?: boolean;
  /** Show icons column even if no icons (default: false) */
  alwaysShowIconColumn?: boolean;
  /** Callback when menu closes */
  onClose?: () => void;
  /** Callback before showing (return false to prevent) */
  onBeforeShow?: (position: { x: number; y: number }) => boolean | void;
  /** Custom render function for each item */
  renderItem?: (item: ContextMenuItem, isSelected: boolean) => HTMLElement;
}

export interface ContextMenuInstance {
  /** Current DOM element */
  element: HTMLDivElement;
  /** Show the menu */
  show: (position?: ContextMenuPosition) => void;
  /** Hide the menu */
  hide: () => void;
  /** Update items dynamically */
  setItems: (items: ContextMenuItem[]) => void;
  /** Check if visible */
  isVisible: () => boolean;
  /** Get current selected index */
  getSelectedIndex: () => number;
  /** Destroy and cleanup */
  destroy: () => void;
}

// --- Context Menu Manager ---

export class ContextMenuManager {
  private activeMenu: ContextMenuInstance | null = null;

  /** Create and show a context menu */
  show(options: ContextMenuOptions): ContextMenuInstance {
    // Hide any existing menu
    this.hideAll();

    const instance = this.createMenu(options);
    instance.show(options.position);
    this.activeMenu = instance;
    return instance;
  }

  /** Create a menu without showing it */
  create(options: ContextMenuOptions): ContextMenuInstance {
    return this.createMenu(options);
  }

  /** Hide all open menus */
  hideAll(): void {
    if (this.activeMenu) {
      this.activeMenu.hide();
      this.activeMenu = null;
    }
  }

  /** Check if a menu is currently shown */
  isActive(): boolean { return this.activeMenu !== null && this.activeMenu.isVisible(); }

  private createMenu(options: ContextMenuOptions): ContextMenuInstance {
    const parent = options.parent ?? document.body;
    const zIndex = options.zIndex ?? 10000;
    const animDuration = options.animationDuration ?? 120;

    // Container
    const el = document.createElement("div");
    el.className = "ctx-menu";
    el.setAttribute("role", "menu");
    el.style.cssText = `
      position: fixed; z-index: ${zIndex}; min-width: ${options.minWidth ?? 180}px;
      max-width: ${options.maxWidth ?? 320px}; padding: 4px 0;
      background: #fff; border-radius: 10px; box-shadow: 0 8px 40px rgba(0,0,0,0.18), 0 0 1px rgba(0,0,0,0.08);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px;
      opacity: 0; pointer-events: none; transform: scale(0.96);
      transition: opacity ${animDuration}ms ease, transform ${animDuration}ms ease;
      outline: none;
    `;

    parent.appendChild(el);

    let visible = false;
    let selectedIndex = -1;
    let currentItems = [...options.items];
    let submenus = new Map<string, HTMLDivElement>();
    let hideTimer: ReturnType<typeof setTimeout> | null = null;

    const flatItems = (): ContextMenuItem[] =>
      currentItems.filter((i) => !i.hidden);

    const buildMenu = () => {
      el.innerHTML = "";
      submenus.clear();

      const items = flatItems();
      if (items.length === 0) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i]!;

        // Separator
        if (item.separatorBefore) {
          const sep = document.createElement("div");
          sep.className = "ctx-sep";
          sep.style.cssText = "height:1px;background:#f0f0f0;margin:4px 12px;";
          el.appendChild(sep);
        }

        const menuItem = document.createElement("div");
        menuItem.className = `ctx-item${item.disabled ? " ctx-disabled" : ""}${item.danger ? " ctx-danger" : ""}`;
        menuItem.setAttribute("role", item.children ? "menuitemradio" : "menuitem");
        menuItem.dataset.id = item.id;
        menuItem.tabIndex = -1;
        menuItem.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;
          white-space:nowrap;color:${item.danger ? "#dc2626" : "#333"};
          transition:background 0.1s;user-select:none;
        `;

        // Icon column
        const hasIcon = item.icon || options.alwaysShowIconColumn || item.checked !== undefined;
        if (hasIcon) {
          const iconEl = document.createElement("span");
          iconEl.className = "ctx-icon";
          iconEl.style.cssText = "width:20px;text-align:center;font-size:15px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center";
          if (item.checked !== undefined) {
            iconEl.innerHTML = item.checked ? "&#9745;" : "&#9744;";
            iconEl.style.fontSize = "14px";
            iconEl.style.color = "#007aff";
          } else {
            iconEl.textContent = item.icon ?? "";
          }
          menuItem.appendChild(iconEl);
        }

        // Label
        const labelEl = document.createElement("span");
        labelEl.className = "ctx-label";
        labelEl.textContent = item.label;
        labelEl.style.cssText = "flex:1;overflow:hidden;text-overflow:ellipsis";
        menuItem.appendChild(labelEl);

        // Shortcut hint
        if (item.shortcut) {
          const shortcutEl = document.createElement("span");
          shortcutEl.className = "ctx-shortcut";
          shortcutEl.textContent = item.shortcut;
          shortcutEl.style.cssText = "color:#aaa;font-size:11px;margin-left:16px;font-family:monospace";
          menuItem.appendChild(shortcut);
        }

        // Submenu arrow
        if (item.children?.length) {
          const arrow = document.createElement("span");
          arrow.innerHTML = "&rsaquo;";
          arrow.style.cssText = "color:#999;margin-left:8px;font-size:12px";
          menuItem.appendChild(arrow);

          // Submenu container
          const subMenu = document.createElement("div");
          subMenu.className = "ctx-submenu";
          subMenu.style.cssText = `
            position:absolute;left:100%;top:-4px;display:none;padding:4px 0;
            background:#fff;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.15);
            min-width:160px;opacity:0;pointer-events:none;transform:scaleX(0.9);transform-origin:left center;
            transition:opacity 120ms ease,transform 120ms ease;
          `;
          for (const child of item.children) {
            if (!child.hidden) {
              const childItem = this.buildSubmenuItem(child, () => {
                instance.hide();
                child.action?.();
              });
              subMenu.appendChild(childItem);
            }
          }
          menuItem.appendChild(subMenu);
          submenus.set(item.id, subMenu);

          // Hover to show submenu
          menuItem.addEventListener("mouseenter", () => {
            if (item.disabled) return;
            selectedIndex = i;
            highlightSelected();
            // Hide other submenus
            for (const [, sm] of submenus) { sm.style.display = "none"; }
            subMenu.style.display = "block";
            requestAnimationFrame(() => {
              subMenu.style.opacity = "1"; subMenu.style.pointerEvents = "auto"; subMenu.style.transform = "scaleX(1)";
            });
          });
        }

        // Events
        if (!item.disabled && !item.children?.length) {
          menuItem.addEventListener("click", () => {
            if (item.checked !== undefined) {
              item.checked = !item.checked;
              buildMenu();
            }
            if (options.closeOnClick !== false) instance.hide();
            item.action?.();
          });

          menuItem.addEventListener("mouseenter", () => {
            // Hide any open submenu
            for (const [, sm] of submenus) { sm.style.display = "none"; }
            selectedIndex = i;
            highlightSelected();
          });
        }

        el.appendChild(menuItem);

        // Separator after
        if (item.separatorAfter) {
          const sep = document.createElement("div");
          sep.className = "ctx-sep";
          sep.style.cssText = "height:1px;background:#f0f0f0;margin:4px 12px;";
          el.appendChild(sep);
        }
      }
    };

    const highlightSelected = () => {
      const items = el.querySelectorAll(".ctx-item:not(.ctx-disabled)");
      items.forEach((item, idx) => {
        item.classList.toggle("ctx-selected", idx === selectedIndex);
      });
    };

    const selectNext = () => {
      const items = Array.from(el.querySelectorAll(".ctx-item:not(.ctx-disabled)"));
      if (items.length === 0) return;
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      highlightSelected();
      (items[selectedIndex] as HTMLElement)?.scrollIntoView({ block: "nearest" });
    };

    const selectPrev = () => {
      const items = Array.from(el.querySelectorAll(".ctx-item:not(.ctx-disabled)"));
      if (items.length === 0) return;
      selectedIndex = Math.max(selectedIndex - 1, 0);
      highlightSelected();
      (items[selectedIndex] as HTMLElement)?.scrollIntoView({ block: "nearest" });
    };

    const selectCurrent = () => {
      const items = Array.from(el.querySelectorAll(".ctx-item:not(.ctx-disabled)"));
      const selected = items[selectedIndex] as HTMLElement | undefined;
      if (selected) selected.click();
    };

    // Keyboard handler
    const keyHandler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown": e.preventDefault(); selectNext(); break;
        case "ArrowUp": e.preventDefault(); selectPrev(); break;
        case "Enter": case " ": e.preventDefault(); selectCurrent(); break;
        case "Escape": e.preventDefault(); instance.hide(); break;
      }
    };

    // Click outside to close
    const clickOutsideHandler = (e: MouseEvent) => {
      if (visible && !el.contains(e.target as Node)) instance.hide();
    };

    const instance: ContextMenuInstance = {
      element: el,

      show: (pos) => {
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

        let position = pos ?? options.position ?? { x: 0, y: 0 };
        if (position === "center") {
          position = {
            x: window.innerWidth / 2 - 150,
            y: window.innerHeight / 2 - 100,
          };
        }

        if (options.onBeforeShow?.(position) === false) return;

        currentItems = [...options.items];
        selectedIndex = -1;
        buildMenu();

        // Position
        const x = typeof position === "object" ? position.x : 0;
        const y = typeof position === "object" ? position.y : 0;

        // Auto-flip if off screen
        const rect = el.getBoundingClientRect();
        let finalX = x;
        let finalY = y;

        if (x + rect.width > window.innerWidth - 8) {
          finalX = window.innerWidth - rect.width - 8;
        }
        if (y + rect.height > window.innerHeight - 8) {
          finalY = window.innerHeight - rect.height - 8;
        }
        if (finalX < 8) finalX = 8;
        if (finalY < 8) finalY = 8;

        el.style.left = `${finalX}px`;
        el.style.top = `${finalY}px`;

        // Animate in
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.pointerEvents = "auto";
          el.style.transform = "scale(1)";
        });

        visible = true;
        el.focus();
        document.addEventListener("keydown", keyHandler);
        document.addEventListener("mousedown", clickOutsideHandler);
      },

      hide: () => {
        if (!visible) return;
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.transform = "scale(0.96)";

        hideTimer = setTimeout(() => {
          el.style.display = "none";
        }, animDuration);

        visible = false;
        document.removeEventListener("keydown", keyHandler);
        document.removeEventListener("mousedown", clickOutsideHandler);
        options.onClose?.();
      },

      setItems: (items) => {
        currentItems = items;
        if (visible) buildMenu();
      },

      isVisible: () => visible,

      getSelectedIndex: () => selectedIndex,

      destroy: () => {
        instance.hide();
        if (hideTimer) clearTimeout(hideTimer);
        el.remove();
      },
    };

    return instance;
  }

  private buildSubmenuItem(item: ContextMenuItem, onClick: () => void): HTMLElement {
    const el = document.createElement("div");
    el.className = `ctx-item${item.disabled ? " ctx-disabled" : ""}${item.danger ? " ctx-danger" : ""}`;
    el.style.cssText = `
      display:flex;align-items:center;gap:8px;padding:7px 16px;cursor:pointer;
      white-space:nowrap;color:${item.danger ? "#dc2626" : "#333"};font-size:13px;
      transition:background 0.1s;
    `;
    if (item.icon) {
      const icon = document.createElement("span");
      icon.textContent = item.icon;
      icon.style.cssText = "width:20px;text-align:center;font-size:15px;flex-shrink:0";
      el.appendChild(icon);
    }
    const label = document.createElement("span");
    label.textContent = item.label;
    label.style.flex = "1";
    el.appendChild(label);
    if (!item.disabled) el.addEventListener("click", onClick);
    el.addEventListener("mouseenter", () => { el.style.background = "#f0f4ff"; });
    el.addEventListener("mouseleave", () => { el.style.background = ""; });
    return el;
  }
}
