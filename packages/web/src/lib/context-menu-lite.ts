/**
 * Lightweight Context Menu: Right-click triggered menu with keyboard navigation,
 * item grouping, separators, icons, shortcuts, disabled/danger states,
 * checkbox/radio items, submenus, viewport-aware positioning, and accessibility.
 */

// --- Types ---

export type ContextMenuPlacement = "auto" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface ContextMenuItem {
  /** Unique key */
  key: string;
  /** Label text */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Destructive/danger style (red) */
  danger?: boolean;
  /** Keyboard shortcut hint (e.g., "⌘C") */
  shortcut?: string;
  /** Checkbox mode: checked state */
  checked?: boolean;
  /** Radio group name */
  radioGroup?: string;
  /** Submenu children */
  children?: ContextMenuItem[];
  /** Custom CSS class */
  className?: string;
  /** Description/subtitle text */
  description?: string;
}

export interface ContextMenuSeparator {
  type: "separator";
}

export interface ContextMenuGroup {
  type: "group";
  label?: string;
  items: ContextMenuItem[];
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator | ContextMenuGroup;

export interface ContextMenuOptions {
  /** Items to display in the menu */
  items: ContextMenuEntry[];
  /** Preferred placement relative to click position */
  placement?: ContextMenuPlacement;
  /** Offset from cursor (px) */
  offset?: number;
  /** Width of menu (px) */
  width?: number;
  /** Z-index */
  zIndex?: number;
  /** Max height with scroll (px) */
  maxHeight?: number;
  /** Close on item select? */
  closeOnSelect?: boolean;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Callback when an item is selected */
  onSelect?: (item: ContextMenuItem) => void;
  /** Callback before select (return false to prevent) */
  beforeSelect?: (item: ContextMenuItem) => boolean | void;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Custom CSS class for the menu container */
  className?: string;
}

export interface ContextMenuInstance {
  element: HTMLDivElement;
  isOpen: () => boolean;
  show: (x: number, y: number) => void;
  close: () => void;
  updateItems: (items: ContextMenuEntry[]) => void;
  destroy: () => void;
}

// --- Main Factory ---

export function createContextMenu(options: ContextMenuOptions): ContextMenuInstance {
  const opts = {
    placement: options.placement ?? "auto",
    offset: options.offset ?? 4,
    width: options.width ?? 220,
    zIndex: options.zIndex ?? 10700,
    closeOnSelect: options.closeOnSelect ?? true,
    animationDuration: options.animationDuration ?? 100,
    maxHeight: options.maxHeight ?? 0,
    className: options.className ?? "",
    ...options,
  };

  let isOpen = false;
  let destroyed = false;
  let activeIndex = -1;
  let currentItems = [...options.items];

  // Create menu container
  const menu = document.createElement("div");
  menu.className = `context-menu ${opts.className}`;
  menu.setAttribute("role", "menu");
  menu.style.cssText = `
    position:fixed;display:none;z-index:${opts.zIndex};
    min-width:${opts.width}px;max-width:320px;
    background:#fff;border-radius:8px;
    box-shadow:0 12px 48px rgba(0,0,0,0.18),0 2px 8px rgba(0,0,0,0.06);
    border:1px solid #e5e7eb;padding:4px;font-size:13px;
    font-family:-apple-system,sans-serif;color:#374151;
    opacity:0;transform:scale(0.95);
    transition:opacity ${opts.animationDuration}ms ease,
      transform ${opts.animationDuration}ms ease;
    ${opts.maxHeight ? `max-height:${opts.maxHeight}px;overflow-y:auto;` : ""}
  `;
  document.body.appendChild(menu);

  // --- Build Menu Content ---

  function buildMenu(): void {
    menu.innerHTML = "";
    activeIndex = -1;

    let flatItems: { el: HTMLElement; item: ContextMenuItem; index: number }[] = [];

    function renderItem(entry: ContextMenuEntry, depth = 0): void {
      if (entry.type === "separator") {
        const sep = document.createElement("div");
        sep.className = "cm-separator";
        sep.style.cssText = "height:1px;background:#e5e7eb;margin:4px 10px;";
        sep.setAttribute("role", "separator");
        menu.appendChild(sep);
        return;
      }

      if (entry.type === "group") {
        if (entry.label) {
          const groupLabel = document.createElement("div");
          groupLabel.className = "cm-group-label";
          groupLabel.style.cssText = `
            padding:6px 14px 3px;font-size:11px;font-weight:600;
            color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;
          `;
          groupLabel.textContent = entry.label;
          menu.appendChild(groupLabel);
        }
        for (const item of entry.items) {
          renderItem(item, depth);
        }
        return;
      }

      const item = entry as ContextMenuItem;
      const itemEl = document.createElement("div");
      itemEl.className = `cm-item ${item.danger ? "cm-danger" : ""} ${item.className ?? ""}`;
      itemEl.setAttribute("role", "menuitem");
      itemEl.setAttribute("tabindex", "-1");
      itemEl.dataset.key = item.key;
      if (item.disabled) itemEl.setAttribute("aria-disabled", "true");

      const idx = flatItems.length;
      flatItems.push({ el: itemEl, item, index: idx });

      itemEl.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:7px 12px;
        cursor:${item.disabled ? "not-allowed" : "pointer"};
        border-radius:4px;transition:background 0.1s;
        color:${item.disabled ? "#d1d5db" : item.danger ? "#dc2626" : "#374151"};
        white-space:nowrap;position:relative;
        ${depth > 0 ? `padding-left:${16 + depth * 18}px;` : ""}
      `;

      // Icon slot
      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "cm-icon";
        iconSpan.style.cssText = `flex-shrink:0;width:18px;text-align:center;font-size:14px;`;
        iconSpan.textContent = item.icon;
        itemEl.appendChild(iconSpan);
      } else if (item.checked !== undefined || item.radioGroup) {
        const checkIcon = document.createElement("span");
        checkIcon.className = "cm-check";
        checkIcon.style.cssText = `flex-shrink:0;width:18px;text-align:center;font-size:13px;`;
        checkIcon.textContent = item.checked ? "\u2713" : item.radioGroup ? "\u25CB" : "";
        itemEl.appendChild(checkIcon);
      } else {
        const spacer = document.createElement("span");
        spacer.style.cssText = "flex-shrink:0;width:18px;";
        itemEl.appendChild(spacer);
      }

      // Label + description
      const labelArea = document.createElement("span");
      labelArea.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;";
      const labelText = document.createElement("span");
      labelText.className = "cm-label";
      labelText.textContent = item.label;
      labelArea.appendChild(labelText);

      if (item.description) {
        const descText = document.createElement("span");
        descText.className = "cm-description";
        descText.style.cssText = "font-size:11px;color:#9ca3af;margin-top:1px;";
        descText.textContent = item.description;
        labelArea.appendChild(descText);
      }
      itemEl.appendChild(labelArea);

      // Shortcut hint
      if (item.shortcut) {
        const shortcutEl = document.createElement("span");
        shortcutEl.className = "cm-shortcut";
        shortcutEl.style.cssText = `
          flex-shrink:0;font-size:11px;color:#9ca3af;margin-left:8px;
          font-family:'SF Mono',Consolas,monospace;
        `;
        shortcutEl.textContent = item.shortcut;
        itemEl.appendChild(shortcutEl);
      }

      // Submenu arrow
      if (item.children?.length) {
        const arrow = document.createElement("span");
        arrow.className = "cm-submenu-arrow";
        arrow.style.cssText = "flex-shrink:0;font-size:10px;color:#9ca3af;margin-right:-2px;";
        arrow.innerHTML = "&#9654;";
        itemEl.appendChild(arrow);
      }

      // Events
      if (!item.disabled) {
        itemEl.addEventListener("mouseenter", () => setActive(idx));
        itemEl.addEventListener("click", () => handleSelect(item));
      }

      menu.appendChild(itemEl);

      // Render submenu children inline
      if (item.children?.length) {
        for (const child of item.children) {
          renderItem(child, depth + 1);
        }
      }
    }

    for (const entry of currentItems) {
      renderItem(entry);
    }

    // Store flat reference for keyboard nav
    (menu as any)._flatItems = flatItems;
  }

  function setActive(idx: number): void {
    const flat = (menu as any)._flatItems as Array<{ el: HTMLElement; item: ContextMenuItem; index: number }> | undefined;
    if (!flat) return;

    if (activeIndex >= 0 && flat[activeIndex]) {
      flat[activeIndex]!.el.style.background = "";
    }

    activeIndex = idx;
    if (idx >= 0 && flat[idx]) {
      flat[idx]!.el.style.background = "#f3f4f6";
      flat[idx]!.el.scrollIntoView({ block: "nearest" });
    }
  }

  function handleSelect(item: ContextMenuItem): void {
    if (opts.beforeSelect?.(item) === false) return;

    // Toggle checkbox
    if (item.checked !== undefined) {
      item.checked = !item.checked;
      buildMenu();
    }

    opts.onSelect?.(item);
    if (opts.closeOnSelect) doClose();
  }

  // --- Positioning ---

  function position(x: number, y: number): void {
    const menuRect = menu.getBoundingClientRect();
    const gap = opts.offset;

    let posX: number, posY: number;

    switch (opts.placement) {
      case "top-left":
        posX = x - menuRect.width - gap;
        posY = y - menuRect.height - gap;
        break;
      case "top-right":
        posX = x + gap;
        posY = y - menuRect.height - gap;
        break;
      case "bottom-left":
        posX = x - menuRect.width - gap;
        posY = y + gap;
        break;
      case "bottom-right":
        posX = x + gap;
        posY = y + gap;
        break;
      case "auto":
      default:
        // Default: show to the right and below cursor
        posX = x + gap;
        posY = y + gap;
        break;
    }

    // Auto-flip if overflowing viewport
    const margin = 4;
    if (posX + menuRect.width > window.innerWidth - margin) {
      posX = x - menuRect.width - gap;
    }
    if (posY + menuRect.height > window.innerHeight - margin) {
      posY = y - menuRect.height - gap;
    }
    posX = Math.max(margin, posX);
    posY = Math.max(margin, posY);

    menu.style.left = `${posX}px`;
    menu.style.top = `${posY}px`;
  }

  // --- Open / Close ---

  function doOpen(x: number, y: number): void {
    if (isOpen || destroyed) return;
    isOpen = true;
    buildMenu();
    menu.style.display = "block";
    void menu.offsetHeight; // force reflow
    menu.style.opacity = "1";
    menu.style.transform = "scale(1)";
    position(x, y);
    opts.onOpen?.();
  }

  function doClose(): void {
    if (!isOpen) return;
    isOpen = false;
    menu.style.opacity = "0";
    menu.style.transform = "scale(0.95)";
    setTimeout(() => {
      if (!isOpen) menu.style.display = "none";
    }, opts.animationDuration);
    opts.onClose?.();
  }

  function show(x: number, y: number): void {
    doOpen(x, y);
  }

  function close(): void {
    doClose();
  }

  // --- Global Event Listeners ---

  // Close on outside click / right-click elsewhere
  document.addEventListener("mousedown", (e: MouseEvent) => {
    if (
      isOpen &&
      !menu.contains(e.target as Node)
    ) {
      doClose();
    }
  });

  // Prevent browser default context menu when our menu is open
  document.addEventListener("contextmenu", (e: MouseEvent) => {
    if (isOpen) {
      e.preventDefault();
      doClose();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      doClose();
    }
  });

  // Keyboard navigation within menu
  menu.addEventListener("keydown", (e: KeyboardEvent) => {
    const flat = (menu as any)._flatItems as Array<{ el: HTMLElement; item: ContextMenuItem; index: number }> | undefined;
    if (!flat || flat.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((activeIndex + 1) % flat.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((activeIndex - 1 + flat.length) % flat.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex >= 0 && flat[activeIndex]) {
          handleSelect(flat[activeIndex]!.item);
        }
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(flat.length - 1);
        break;
    }
  });

  // Reposition on scroll/resize
  let lastPos = { x: 0, y: 0 };
  window.addEventListener("scroll", () => { if (isOpen) position(lastPos.x, lastPos.y); }, true);
  window.addEventListener("resize", () => { if (isOpen) position(lastPos.x, lastPos.y); });

  // Override show to remember last position for repositioning
  const originalShow = show;
  show = (x: number, y: number) => {
    lastPos = { x, y };
    originalShow(x, y);
  };

  // --- Instance ---

  const instance: ContextMenuInstance = {
    element: menu,

    isOpen() { return isOpen; },

    show,

    close,

    updateItems(items: ContextMenuEntry[]) {
      currentItems = items;
      if (isOpen) buildMenu();
    },

    destroy() {
      destroyed = true;
      menu.remove();
    },
  };

  return instance;
}

// --- Quick Helpers ---

/** Attach a context menu to an element via right-click */
export function attachContextMenu(
  target: HTMLElement | string,
  items: ContextMenuEntry[],
  options?: Omit<ContextMenuOptions, "items">,
): ContextMenuInstance {
  const el = typeof target === "string"
    ? document.querySelector<HTMLElement>(target)!
    : target;

  const ctxMenu = createContextMenu({ ...options, items: [...items] });

  el.addEventListener("contextmenu", (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctxMenu.show(e.clientX, e.clientY);
  });

  return ctxMenu;
}
