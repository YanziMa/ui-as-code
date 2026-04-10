/**
 * Context Menu Manager: Right-click context menu system with nested submenus,
 * keyboard navigation (arrow keys, Enter, Escape), icons, separators, disabled items,
 * checkable/radio items, dynamic item lists, positioning with auto-flip, and
 * accessibility (ARIA menu pattern).
 */

// --- Types ---

export type ContextMenuItemId = string;

export interface ContextMenuItem {
  id: ContextMenuItemId;
  label: string;
  /** Icon (emoji, URL, or SVG string) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Hidden (not rendered) */
  hidden?: boolean;
  /** Keyboard shortcut hint */
  shortcut?: string;
  /** Type of item */
  type?: "normal" | "separator" | "submenu" | "checkbox" | "radio";
  /** Checked state (for checkbox/radio) */
  checked?: boolean;
  /** Radio group name */
  radioGroup?: string;
  /** Submenu items */
  items?: ContextMenuItem[];
  /** Action handler */
  action?: (item: ContextMenuItem, context: MenuContext) => void | Promise<void>;
  /** Danger/destructive action styling */
  danger?: boolean;
  /** Custom data passed to action handler */
  data?: unknown;
}

export interface MenuContext {
  /** X position where menu was triggered */
  x: number;
  /** Y position where menu was triggered */
  y: number;
  /** Element that was right-clicked (if any) */
  target?: HTMLElement;
  /** Custom context data */
  data?: Record<string, unknown>;
}

export interface ContextMenuOptions {
  /** Menu items */
  items: ContextMenuItem[];
  /** Called before showing — return items dynamically */
  onOpen?: (context: MenuContext) => ContextMenuItem[] | Promise<ContextMenuItem[]>;
  /** Called after menu closes */
  onClose?: () => void;
  /** Custom CSS class for container */
  className?: string;
  /** Z-index (default: 1100) */
  zIndex?: number;
  /** Min width in px (default: 180) */
  minWidth?: number;
  /** Max height before scrolling (default: 400) */
  maxHeight?: number;
  /** Show icons column even if no icons */
  alwaysShowIcons?: boolean;
  /** Portal target (default: document.body) */
  portalTarget?: HTMLElement;
}

export interface ContextMenuInstance {
  id: string;
  element: HTMLElement;
  isOpen: boolean;
  show(x: number, y: number, target?: HTMLElement): void;
  close(): void;
  updateItems(items: ContextMenuItem[]): void;
  destroy(): void;
}

// --- Internal Types ---

interface ActiveMenu {
  instance: ContextMenuInstance;
  options: ContextMenuOptions;
  context: MenuContext;
  activeIndex: number;
  openSubmenu: ContextMenuInstance | null;
  cleanupFns: Array<() => void>;
}

let menuIdCounter = 0;

// --- Context Menu Manager ---

export class ContextMenuManager {
  private menus = new Map<string, ActiveMenu>();
  private destroyed = false;

  /**
   * Create a context menu bound to a target element.
   */
  create(options: ContextMenuOptions): ContextMenuInstance {
    if (this.destroyed) throw new Error("ContextMenuManager is destroyed");

    const id = `ctx_${++menuIdCounter}_${Date.now().toString(36)}`;
    const portal = options.portalTarget ?? document.body;

    // Create menu element
    const el = document.createElement("div");
    el.className = `ctx-menu ${options.className ?? ""}`;
    el.setAttribute("role", "menu");
    el.setAttribute("aria-label", "Context menu");
    el.style.cssText = `
      position: fixed; z-index: ${options.zIndex ?? 1100};
      min-width: ${options.minWidth ?? 180}px; max-height: ${options.maxHeight ?? 400}px;
      overflow-y: auto; padding: 4px 0;
      background: #fff; border-radius: 8px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1);
      border: 1px solid rgba(0,0,0,0.08); opacity: 0;
      transform: scale(0.95); transition: opacity 0.12s ease, transform 0.12s ease;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px;
    `;

    portal.appendChild(el);

    const cleanupFns: Array<() => void> = [];

    const instance: ContextMenuInstance = {
      id,
      element: el,
      isOpen: false,

      show(x: number, y: number, target?: HTMLElement) {
        const entry = this.menus.get(id);
        if (!entry) return;

        const context: MenuContext = { x, y, target };
        entry.context = context;

        // Allow dynamic items
        const itemsPromise = options.onOpen
          ? Promise.resolve(options.onOpen(context))
          : Promise.resolve(options.items);

        itemsPromise.then((items) => {
          this.renderMenu(el, items, entry!);
          this.positionMenu(el, x, y);
          el.style.opacity = "1";
          el.style.transform = "scale(1)";
          instance.isOpen = true;

          // Focus first item
          const firstItem = el.querySelector("[role='menuitem']:not([aria-disabled='true'])") as HTMLElement | null;
          firstItem?.focus();
          entry.activeIndex = 0;
        });
      }.bind(this),

      close() {
        const entry = this.menus.get(id);
        if (!entry || !instance.isOpen) return;

        // Close any open submenu
        if (entry.openSubmenu) {
          entry.openSubmenu.close();
          entry.openSubmenu = null;
        }

        el.style.opacity = "0";
        el.style.transform = "scale(0.95)";

        setTimeout(() => { el.innerHTML = ""; }, 120);
        instance.isOpen = false;
        options.onClose?.();
      },

      updateItems(items: ContextMenuItem[]) {
        const entry = this.menus.get(id);
        if (entry) this.renderMenu(el, items, entry);
      },

      destroy() {
        const entry = this.menus.get(id);
        if (entry) {
          for (const fn of entry.cleanupFns) fn();
          if (entry.openSubmenu) entry.openSubmenu.destroy();
          this.menus.delete(id);
        }
        el.remove();
      },
    };

    const entry: ActiveMenu = { instance, options, context: { x: 0, y: 0 }, activeIndex: -1, openSubmenu: null, cleanupFns };
    this.menus.set(id, entry);

    // Global close handlers
    const closeOnOutside = (e: MouseEvent) => {
      if (instance.isOpen && !el.contains(e.target as Node)) instance.close();
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (instance.isOpen && e.key === "Escape") { e.preventDefault(); instance.close(); }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    cleanupFns.push(
      () => document.removeEventListener("mousedown", closeOnOutside),
      () => document.removeEventListener("keydown", closeOnEscape),
    );

    return instance;
  }

  /**
   * Convenience: attach a context menu to an element via right-click.
   */
  attach(target: HTMLElement, options: ContextMenuOptions): () => void {
    const menu = this.create(options);

    const handler = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      menu.show(e.clientX, e.clientY, target);
    };

    target.addEventListener("contextmenu", handler);

    return () => {
      target.removeEventListener("contextmenu", handler);
      menu.destroy();
    };
  }

  /** Get all open menus */
  getOpenMenus(): ContextMenuInstance[] {
    return Array.from(this.menus.values()).filter((m) => m.instance.isOpen).map((m) => m.instance);
  }

  /** Close all open menus */
  closeAll(): void {
    for (const [, entry] of this.menus) {
      if (entry.instance.isOpen) entry.instance.close();
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const [, entry] of this.menus) entry.instance.destroy();
    this.menus.clear();
  }

  // --- Internal ---

  private renderMenu(el: HTMLElement, items: ContextMenuItem[], entry: ActiveMenu): void {
    el.innerHTML = "";
    const hasIcons = options.alwaysShowIcons || items.some((item) => item.icon && item.type !== "separator");

    for (const item of items) {
      if (item.hidden) continue;

      if (item.type === "separator") {
        const sep = document.createElement("div");
        sep.className = "ctx-separator";
        sep.setAttribute("role", "separator");
        sep.style.cssText = "height: 1px; margin: 4px 8px; background: #eee;";
        el.appendChild(sep);
        continue;
      }

      const li = document.createElement("div");
      li.setAttribute("role", "menuitem");
      li.setAttribute("tabindex", "-1");
      li.setAttribute("data-item-id", item.id);
      if (item.disabled) li.setAttribute("aria-disabled", "true");
      if (item.checked !== undefined) li.setAttribute("aria-checked", String(item.checked));
      if (item.type === "submenu" || item.items) li.setAttribute("aria-haspopup", "true");
      if (item.danger) li.classList.add("ctx-danger");

      li.style.cssText = `
        display: flex; align-items: center; gap: 8px;
        padding: 6px 12px; cursor: ${item.disabled ? "not-allowed" : "pointer"};
        color: ${item.disabled ? "#aaa" : item.danger ? "#dc2626" : "#333"};
        transition: background 0.1s; user-select: none;
        ${hasIcons ? "" : ""}
      `;

      // Icon
      if (hasIcons) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "ctx-icon";
        iconSpan.style.cssText = `width: 20px; text-align: center; flex-shrink: 0; font-size: 14px;`;
        iconSpan.textContent = item.icon ?? (item.type === "checkbox" ? (item.checked ? "✓" : "") :
          item.type === "radio" ? (item.checked ? "●" : "○") : "");
        li.appendChild(iconSpan);
      }

      // Label
      const labelSpan = document.createElement("span");
      labelSpan.className = "ctx-label";
      labelSpan.style.cssText = "flex: 1; white-space: nowrap;";
      labelSpan.textContent = item.label;
      li.appendChild(labelSpan);

      // Shortcut hint
      if (item.shortcut) {
        const shortcutSpan = document.createElement("span");
        shortcutSpan.className = "ctx-shortcut";
        shortcutSpan.style.cssText = "color: #999; font-size: 11px; margin-left: auto;";
        shortcutSpan.textContent = item.shortcut;
        li.appendChild(shortcutSpan);
      }

      // Submenu arrow
      if ((item.type === "submenu" || item.items) && item.items && item.items.length > 0) {
        const arrow = document.createElement("span");
        arrow.textContent = "▸";
        arrow.style.cssText = "color: #999; font-size: 10px;";
        li.appendChild(arrow);
      }

      // Hover highlight
      li.addEventListener("mouseenter", () => {
        if (item.disabled) return;
        this.highlightItem(el, li);
        entry.activeIndex = Array.from(el.children).indexOf(li);

        // Handle submenu
        if ((item.type === "submenu" || item.items) && item.items && item.items.length > 0) {
          this.showSubmenu(li, item.items!, entry);
        } else {
          this.hideSubmenu(entry);
        }
      });

      // Click handler
      li.addEventListener("click", () => {
        if (item.disabled) return;

        if (item.type === "checkbox") {
          item.checked = !item.checked;
          this.renderMenu(el, items, entry);
        }

        if (item.action) {
          item.action(item, entry.context);
        }

        // Close unless it's a submenu parent
        if (!(item.type === "submenu" || item.items)) {
          entry.instance.close();
        }
      });

      // Keyboard navigation within the menu
      li.addEventListener("keydown", (e) => this.handleItemKeydown(e, li, items, entry));

      el.appendChild(li);
    }

    var options = entry.options; // capture for closure
  }

  private highlightItem(menuEl: HTMLElement, itemEl: HTMLElement): void {
    // Remove highlight from all items
    for (const child of menuEl.children) {
      (child as HTMLElement).style.background = "";
    }
    itemEl.style.background = "rgba(0,0,0,0.05)";
    (itemEl as HTMLElement).focus({ preventScroll: true });
  }

  private handleItemKeydown(e: KeyboardEvent, itemEl: HTMLElement, items: ContextMenuItem[], entry: ActiveMenu): void {
    const menuEl = entry.instance.element;
    const visibleItems = Array.from(menuEl.querySelectorAll("[role='menuitem']")) as HTMLElement[];
    const currentIdx = visibleItems.indexOf(itemEl);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (currentIdx < visibleItems.length - 1) this.highlightItem(menuEl, visibleItems[currentIdx + 1]!);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (currentIdx > 0) this.highlightItem(menuEl, visibleItems[currentIdx - 1]!);
        break;
      case "ArrowRight": {
        e.preventDefault();
        const itemData = items.find((it) => it.id === itemEl.dataset.itemId);
        if ((itemData?.type === "submenu" || itemData?.items) && itemData.items) {
          this.showSubmenu(itemEl, itemData.items, entry);
        }
        break;
      }
      case "ArrowLeft":
        e.preventDefault();
        this.hideSubmenu(entry);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        (itemEl as HTMLElement).click();
        break;
      case "Escape":
        e.preventDefault();
        entry.instance.close();
        break;
    }
  }

  private showSubmenu(parentItem: HTMLElement, subItems: ContextMenuItem[], entry: ActiveMenu): void {
    // Hide existing submenu
    this.hideSubmenu(entry);

    const rect = parentItem.getBoundingClientRect();
    const subMenu = this.create({
      items: subItems,
      zIndex: (entry.options.zIndex ?? 1100) + 1,
      minWidth: entry.options.minWidth,
    });

    subMenu.show(rect.right, rect.top);
    entry.openSubmenu = subMenu;
  }

  private hideSubmenu(entry: ActiveMenu): void {
    if (entry.openSubmenu) {
      entry.openSubmenu.close();
      entry.openSubmenu.destroy();
      entry.openSubmenu = null;
    }
  }

  private positionMenu(el: HTMLElement, x: number, y: number): void {
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Flip horizontally if off screen
    let posX = x;
    if (x + rect.width > vw - 8) posX = vw - rect.width - 8;

    // Flip vertically if off screen
    let posY = y;
    if (y + rect.height > vh - 8) posY = vh - rect.height - 8;

    el.style.left = `${Math.max(8, posX)}px`;
    el.style.top = `${Math.max(8, posY)}px`;
  }
}
