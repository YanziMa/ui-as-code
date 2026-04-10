/**
 * Dropdown Menu: Contextual menu with keyboard navigation, submenus, icons, dividers,
 * checkbox items, grouped sections, disabled states, and accessibility.
 */

// --- Types ---

export type MenuItemType =
  | "normal"
  | "checkbox"
  | "radio"
  | "separator"
  | "header"
  | "danger"
  | "custom";

export interface MenuItem {
  /** Unique ID */
  id: string;
  /** Display label */
  label: string;
  /** Item type */
  type?: MenuItemType;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Shortcut text (e.g., "Ctrl+S") */
  shortcut?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Hidden state */
  hidden?: boolean;
  /** For checkbox/radio: checked state */
  checked?: boolean;
  /** For radio: group name */
  radioGroup?: string;
  /** Submenu items */
  children?: MenuItem[];
  /** Description/subtitle */
  description?: string;
  /** Danger variant (red text) */
  danger?: boolean;
  /** Click handler */
  onClick?: (item: MenuItem) => void;
  /** Custom renderer */
  render?: (item: MenuItem, el: HTMLElement) => void;
}

export interface DropdownMenuOptions {
  /** Trigger element or selector */
  trigger: HTMLElement | string;
  /** Menu items */
  items: MenuItem[];
  /** Open on click? (default: true) */
  openOnClick?: boolean;
  /** Open on right-click/context menu? */
  openOnContextMenu?: boolean;
  /** Placement relative to trigger */
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end" | "auto";
  /** Offset from trigger (px) */
  offset?: number;
  /** Z-index */
  zIndex?: number;
  /** Menu width (px or 'auto') */
  width?: number | "trigger";
  /** Max height with scroll */
  maxHeight?: number;
  /** Close on item click */
  closeOnSelect?: boolean;
  /** Close on outside click */
  closeOnClickOutside?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Custom CSS class */
  className?: string;
  /** Callback when menu opens */
  onOpen?: () => void;
  /** Callback when menu closes */
  onClose?: () => void;
  /** Disabled state */
  disabled?: boolean;
}

export interface DropdownMenuInstance {
  menuEl: HTMLDivElement;
  isOpen: () => boolean;
  open: (x?: number, y?: number) => void;
  close: () => void;
  toggle: () => void;
  setItems: (items: MenuItem[]) => void;
  updateItem: (id: string, updates: Partial<MenuItem>) => void;
  destroy: () => void;
}

// --- Helpers ---

function resolveElement(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector(el) : el;
}

// --- Main Class ---

export class DropdownMenuManager {
  create(options: DropdownMenuOptions): DropdownMenuInstance {
    const opts = {
      openOnClick: options.openOnClick ?? true,
      openOnContextMenu: options.openOnContextMenu ?? false,
      placement: options.placement ?? "bottom-start",
      offset: options.offset ?? 4,
      zIndex: options.zIndex ?? 10500,
      width: options.width ?? 200,
      maxHeight: options.maxHeight ?? 300,
      closeOnSelect: options.closeOnSelect ?? true,
      closeOnClickOutside: options.closeOnClickOutside ?? true,
      animationDuration: options.animationDuration ?? 120,
      disabled: options.disabled ?? false,
      ...options,
    };

    const triggerEl = resolveElement(options.trigger);
    if (!triggerEl) throw new Error("DropdownMenu: trigger element not found");

    let items = [...options.items];
    let isOpen = false;
    let destroyed = false;
    let activeIndex = -1;
    let submenuOpen: string | null = null;

    // Create menu element
    const menuEl = document.createElement("div");
    menuEl.className = `dropdown-menu ${opts.className ?? ""}`;
    menuEl.setAttribute("role", "menu");
    menuEl.style.cssText = `
      position:absolute;display:none;z-index:${opts.zIndex};
      background:#fff;border-radius:8px;
      box-shadow:0 10px 40px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.06);
      border:1px solid #e5e7eb;padding:4px 0;min-width:160px;
      font-size:13px;font-family:-apple-system,sans-serif;
      opacity:0;transform:scaleY(0.95);transform-origin:top center;
      transition:opacity ${opts.animationDuration}ms ease,
                 transform ${opts.animationDuration}ms ease;
      overflow-y:auto;max-height:${opts.maxHeight}px;
    `;
    document.body.appendChild(menuEl);

    function renderMenu(): void {
      menuEl.innerHTML = "";
      activeIndex = -1;

      let visibleIdx = 0;
      for (const item of items) {
        if (item.hidden) continue;

        if (item.type === "separator") {
          const sep = document.createElement("div");
          sep.className = "dropdown-separator";
          sep.style.cssText = "height:1px;background:#f0f0f0;margin:4px 10px;";
          menuEl.appendChild(sep);
          continue;
        }

        if (item.type === "header") {
          const header = document.createElement("div");
          header.className = "dropdown-header";
          header.setAttribute("role", "presentation");
          header.style.cssText = `
            padding:6px 14px 2px;font-size:11px;color:#888;text-transform:uppercase;
            letter-spacing:0.04em;font-weight:600;
          `;
          header.textContent = item.label;
          menuEl.appendChild(header);
          continue;
        }

        const li = document.createElement("div");
        li.className = "dropdown-item";
        li.dataset.id = item.id;
        li.dataset.index = String(visibleIdx);
        li.setAttribute("role", item.type === "checkbox" || item.type === "radio"
          ? "menuitemcheckbox" : "menuitem");
        li.setAttribute("tabindex", "-1");
        li.setAttribute("aria-checked", String(item.checked ?? false));
        li.setAttribute("aria-disabled", String(item.disabled ?? false));

        const isDanger = item.danger || item.type === "danger";
        li.style.cssText = `
          display:flex;align-items:center;gap:8px;padding:8px 14px;
          cursor:${item.disabled ? "not-allowed" : "pointer"};
          color:${isDanger ? "#dc2626" : item.disabled ? "#9ca3af" : "#374151"};
          transition:background 0.1s;position:relative;
          white-space:nowrap;
        `;

        // Checkbox/radio indicator
        if (item.type === "checkbox" || item.type === "radio") {
          const indicator = document.createElement("span");
          indicator.style.cssText = `
            width:16px;height:16px;border-radius:${item.type === "radio" ? "50%" : "3px"};
            border:2px solid #d1d5db;display:flex;align-items:center;justify-content:center;
            flex-shrink:0;transition:all 0.15s;
            ${item.checked ? `background:#4338ca;border-color:#4338ca;` : ""}
          `;
          if (item.checked) {
            indicator.innerHTML = item.type === "radio"
              ? '<svg width="6" height="6" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="#fff"/></svg>'
              : '<svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
          }
          li.appendChild(indicator);
        }

        // Icon
        if (item.icon) {
          const iconSpan = document.createElement("span");
          iconSpan.textContent = item.icon;
          iconSpan.style.cssText = "font-size:14px;width:18px;text-align:center;flex-shrink:0;";
          li.appendChild(iconSpan);
        }

        // Label
        const labelSpan = document.createElement("span");
        labelSpan.style.cssText = "flex:1;";
        labelSpan.textContent = item.label;
        li.appendChild(labelSpan);

        // Description
        if (item.description) {
          const descSpan = document.createElement("span");
          descSpan.style.cssText = "font-size:11px;color:#9ca3af;margin-left:auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;";
          descSpan.textContent = item.description;
          li.appendChild(descSpan);
        }

        // Shortcut
        if (item.shortcut) {
          const shortcutSpan = document.createElement("span");
          shortcutSpan.style.cssText = `
            font-size:11px;color:#9ca3af;margin-left:auto;padding:0 6px;
            background:#f3f4f6;border-radius:3px;
          `;
          shortcutSpan.textContent = item.shortcut;
          li.appendChild(shortcutSubmenuArrow(li, item);
        }

        // Submenu arrow
        if (item.children && item.children.length > 0) {
          appendSubmenuArrow(li, item);
        }

        // Events
        if (!item.disabled) {
          li.addEventListener("mouseenter", () => {
            activeIndex = visibleIdx;
            highlightItem();
            if (item.children?.length) openSubmenu(item.id, li);
            else closeSubmenu();
          });

          li.addEventListener("click", () => {
            handleItemClick(item);
          });
        }

        // Hover effect
        li.addEventListener("mouseenter", () => {
          if (!item.disabled) li.style.background = "#f5f3ff";
        });
        li.addEventListener("mouseleave", () => {
          li.style.background = "";
        });

        // Custom renderer
        if (item.render) {
          item.render(item, li);
        }

        menuEl.appendChild(li);
        visibleIdx++;
      }
    }

    function appendSubmenuArrow(el: HTMLElement, item: MenuItem): void {
      const arrow = document.createElement("span");
      arrow.innerHTML = "\u203A";
      arrow.style.cssText = "margin-left:auto;color:#9ca3af;";
      el.appendChild(arrow);
    }

    function openSubmenu(itemId: string, parentLi: HTMLElement): void {
      submenuOpen = itemId;
      const item = items.find((i) => i.id === itemId);
      if (!item?.children) return;

      // Remove existing submenu
      const existing = menuEl.querySelector(".dropdown-submenu");
      if (existing) existing.remove();

      const subMenu = document.createElement("div");
      subMenu.className = "dropdown-submenu";
      subMenu.style.cssText = `
        position:absolute;left:100%;top:-4px;min-width:160px;
        background:#fff;border-radius:8px;
        box-shadow:0 10px 40px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.06);
        border:1px solid #e5e7eb;padding:4px 0;z-index:1;
      `;

      for (const child of item.children) {
        if (child.hidden) continue;
        const childEl = createMenuItem(child);
        childEl.addEventListener("click", () => handleItemClick(child));
        subMenu.appendChild(childEl);
      }

      parentLi.appendChild(subMenu);
    }

    function closeSubmenu(): void {
      submenuOpen = null;
      const existing = menuEl.querySelector(".dropdown-submenu");
      if (existing) existing.remove();
    }

    function createMenuItem(item: MenuItem): HTMLElement {
      const el = document.createElement("div");
      el.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:8px 14px;
        cursor:pointer;color:#374151;transition:background 0.1s;
        white-space:nowrap;
      `;
      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.textContent = item.icon;
        iconSpan.style.cssText = "font-size:14px;width:18px;text-align:center;";
        el.appendChild(iconSpan);
      }
      const label = document.createElement("span");
      label.textContent = item.label;
      label.style.flex = "1";
      el.appendChild(label);

      el.addEventListener("mouseenter", () => { el.style.background = "#f5f3ff"; });
      el.addEventListener("mouseleave", () => { el.style.background = ""; });

      return el;
    }

    function highlightItem(): void {
      const items = menuEl.querySelectorAll("[data-index]");
      items.forEach((item) => {
        (item as HTMLElement).style.background =
          item.dataset.index === String(activeIndex) ? "#ede9fe" : "";
      });
    }

    function handleItemClick(item: MenuItem): void {
      // Toggle checkbox/radio
      if (item.type === "checkbox") {
        item.checked = !item.checked;
        renderMenu();
      } else if (item.type === "radio" && item.radioGroup) {
        // Uncheck others in same group
        for (const other of items) {
          if (other.radioGroup === item.radioGroup) other.checked = false;
        }
        item.checked = true;
        renderMenu();
      }

      item.onClick?.(item);
      if (opts.closeOnSelect) close();
    }

    function positionMenu(x?: number, y?: number): void {
      const rect = triggerEl!.getBoundingClientRect();

      if (x !== undefined && y !== undefined) {
        // Absolute positioning (for context menu)
        menuEl.style.left = `${x}px`;
        menuEl.style.top = `${y}px`;
      } else {
        // Relative to trigger
        const w = opts.width === "trigger" ? rect.width : typeof opts.width === "number" ? opts.width : 200;

        switch (opts.placement) {
          case "bottom-start":
            menuEl.style.left = `${rect.left}px`;
            menuEl.style.top = `${rect.bottom + opts.offset}px`;
            break;
          case "bottom-end":
            menuEl.style.left = `${rect.right - w}px`;
            menuEl.style.top = `${rect.bottom + opts.offset}px`;
            break;
          case "top-start":
            menuEl.style.left = `${rect.left}px`;
            menuEl.style.top = `${rect.top - menuEl.offsetHeight - opts.offset}px`;
            break;
          case "top-end":
            menuEl.style.left = `${rect.right - w}px`;
            menuEl.style.top = `${rect.top - menuEl.offsetHeight - opts.offset}px`;
            break;
          default: // auto
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            if (spaceBelow >= menuEl.offsetHeight || spaceBelow >= spaceAbove) {
              menuEl.style.left = `${rect.left}px`;
              menuEl.style.top = `${rect.bottom + opts.offset}px`;
            } else {
              menuEl.style.left = `${rect.left}px`;
              menuEl.style.top = `${rect.top - menuEl.offsetHeight - opts.offset}px`;
            }
        }

        if (typeof opts.width === "number") {
          menuEl.style.width = `${opts.width}px`;
        } else if (opts.width === "trigger") {
          menuEl.style.width = `${rect.width}px`;
        }
      }

      // Keep in viewport
      const menuRect = menuEl.getBoundingClientRect();
      if (menuRect.right > window.innerWidth - 4) {
        menuEl.style.left = `${window.innerWidth - menuRect.width - 4}px`;
      }
      if (menuRect.bottom > window.innerHeight - 4) {
        menuEl.style.top = `${window.innerHeight - menuRect.height - 4}px`;
      }
    }

    function doOpen(x?: number, y?: number): void {
      if (isOpen || opts.disabled) return;
      isOpen = true;
      renderMenu();
      menuEl.style.display = "block";
      void menuEl.offsetHeight; // force reflow
      menuEl.style.opacity = "1";
      menuEl.style.transform = "scaleY(1)";
      positionMenu(x, y);
      opts.onOpen?.();
    }

    function doClose(): void {
      if (!isOpen) return;
      isOpen = false;
      closeSubmenu();
      menuEl.style.opacity = "0";
      menuEl.style.transform = "scaleY(0.95)";
      setTimeout(() => {
        if (!isOpen) menuEl.style.display = "none";
      }, opts.animationDuration);
      opts.onClose?.();
    }

    // Event bindings
    if (opts.openOnClick) {
      triggerEl.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });
    }

    if (opts.openOnContextMenu) {
      triggerEl.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        doOpen(e.clientX, e.clientY);
      });
    }

    // Keyboard navigation within menu
    menuEl.addEventListener("keydown", (e: KeyboardEvent) => {
      const visibleItems = Array.from(menuEl.querySelectorAll<HTMLElement>("[data-index]"));
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          activeIndex = Math.min(activeIndex + 1, visibleItems.length - 1);
          highlightItem();
          visibleItems[activeIndex]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          activeIndex = Math.max(activeIndex - 1, 0);
          highlightItem();
          visibleItems[activeIndex]?.focus();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (activeIndex >= 0) {
            const id = visibleItems[activeIndex]?.dataset.id;
            const item = items.find((i) => i.id === id);
            if (item) handleItemClick(item);
          }
          break;
        case "Escape":
          e.preventDefault();
          doClose();
          triggerEl.focus();
          break;
        case "ArrowRight":
          if (submenuOpen) break;
          e.preventDefault();
          // Try to open submenu of current item
          if (activeIndex >= 0) {
            const id = visibleItems[activeIndex]?.dataset.id;
            const item = items.find((i) => i.id === id);
            if (item?.children?.length) {
              const parentLi = visibleItems[activeIndex];
              openSubmenu(item.id, parentLi!);
            }
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          closeSubmenu();
          break;
      }
    });

    // Close on outside click
    if (opts.closeOnClickOutside) {
      document.addEventListener("mousedown", (e: MouseEvent) => {
        if (isOpen && !menuEl.contains(e.target as Node) && !triggerEl.contains(e.target as Node)) {
          doClose();
        }
      });
    }

    const instance: DropdownMenuInstance = {
      menuEl,

      isOpen() { return isOpen; },

      open: doOpen,

      close: doClose,

      toggle() { isOpen ? doClose() : doOpen(); },

      setItems(newItems: MenuItem[]) {
        items = [...newItems];
        if (isOpen) renderMenu();
      },

      updateItem(id: string, updates: Partial<MenuItem>) {
        const idx = items.findIndex((i) => i.id === id);
        if (idx >= 0) {
          items[idx] = { ...items[idx]!, ...updates };
          if (isOpen) renderMenu();
        }
      },

      destroy() {
        destroyed = true;
        menuEl.remove();
        triggerEl.removeEventListener("click", () => {});
        triggerEl.removeEventListener("contextmenu", () => {});
      },
    };

    return instance;
  }
}

/** Convenience: create a dropdown menu */
export function createDropdownMenu(options: DropdownMenuOptions): DropdownMenuInstance {
  return new DropdownMenuManager().create(options);
}
