/**
 * Dropdown Menu: Contextual menu with keyboard navigation, item grouping,
 * checkboxes/radio items, submenus, separators, disabled states,
 * icons, shortcuts, and accessibility (ARIA menu pattern).
 */

// --- Types ---

export type DropdownPlacement = "bottom-start" | "bottom" | "bottom-end" | "top-start" | "top" | "top-end" | "right-start" | "left-start";

export interface DropdownItem {
  /** Unique key */
  key: string;
  /** Label text */
  label: string;
  /** Icon (emoji or SVG string) */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Destructive/danger style */
  danger?: boolean;
  /** Keyboard shortcut hint (e.g., "⌘S") */
  shortcut?: string;
  /** Checkbox mode: checked state */
  checked?: boolean;
  /** Radio group name (for radio items) */
  radioGroup?: string;
  /** Submenu items */
  children?: DropdownItem[];
  /** Custom CSS class */
  className?: string;
  /** Description/subtitle text */
  description?: string;
}

export interface DropdownSeparator {
  type: "separator";
}

export interface DropdownGroup {
  type: "group";
  label?: string;
  items: DropdownItem[];
}

export type DropdownEntry = DropdownItem | DropdownSeparator | DropdownGroup;

export interface DropdownOptions {
  /** Trigger/anchor element or selector */
  trigger: HTMLElement | string;
  /** Menu entries */
  items: DropdownEntry[];
  /** Placement preference */
  placement?: DropdownPlacement;
  /** Offset from anchor (px) */
  offset?: number;
  /** Width of menu (px or 'anchor') */
  width?: number | "anchor";
  /** Z-index */
  zIndex?: number;
  /** Close on item click? */
  closeOnSelect?: boolean;
  /** Show on hover instead of click? */
  hoverTrigger?: boolean;
  /** Hover delay in ms */
  hoverDelay?: number;
  /** Animation duration (ms) */
  animationDuration?: number;
  /** Max height with scroll (px) */
  maxHeight?: number;
  /** Callback when an item is selected */
  onSelect?: (item: DropdownItem) => void;
  /** Callback before select (return false to prevent) */
  beforeSelect?: (item: DropdownItem) => boolean | void;
  /** Callback on open */
  onOpen?: () => void;
  /** Callback on close */
  onClose?: () => void;
  /** Custom CSS class for the menu container */
  className?: string;
  /** Portal target (default: document.body) */
  portal?: HTMLElement;
}

export interface DropdownInstance {
  element: HTMLDivElement;
  isOpen: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  updateItems: (items: DropdownEntry[]) => void;
  destroy: () => void;
}

// --- Helpers ---

function resolveEl(el: HTMLElement | string): HTMLElement | null {
  return typeof el === "string" ? document.querySelector<HTMLElement>(el) : el;
}

// --- Main Factory ---

export function createDropdown(options: DropdownOptions): DropdownInstance {
  const opts = {
    placement: options.placement ?? "bottom-start",
    offset: options.offset ?? 4,
    width: options.width ?? 200,
    zIndex: options.zIndex ?? 10600,
    closeOnSelect: options.closeOnSelect ?? true,
    hoverTrigger: options.hoverTrigger ?? false,
    hoverDelay: options.hoverDelay ?? 150,
    animationDuration: options.animationDuration ?? 120,
    maxHeight: options.maxHeight ?? 0,
    className: options.className ?? "",
    portal: options.portal ?? document.body,
    ...options,
  };

  const triggerEl = resolveEl(options.trigger);
  if (!triggerEl) throw new Error("Dropdown: trigger element not found");

  let isOpen = false;
  let destroyed = false;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let activeIndex = -1;
  let currentItems = [...options.items];

  // Create menu container
  const menu = document.createElement("div");
  menu.className = `dropdown-menu ${opts.className}`;
  menu.setAttribute("role", "menu");
  menu.style.cssText = `
    position:absolute;display:none;z-index:${opts.zIndex};
    min-width:${typeof opts.width === "number" ? `${opts.width}px` : opts.width === "anchor" ? "auto" : "180px"};
    background:#fff;border-radius:8px;
    box-shadow:0 10px 40px rgba(0,0,0,0.15),0 2px 6px rgba(0,0,0,0.06);
    border:1px solid #e5e7eb;padding:4px;font-size:13px;
    font-family:-apple-system,sans-serif;color:#374151;
    opacity:0;transform:scale(0.96) translateY(-4px);
    transition:opacity ${opts.animationDuration}ms ease,
      transform ${opts.animationDuration}ms ease;
    ${opts.maxHeight ? `max-height:${opts.maxHeight}px;overflow-y:auto;` : ""}
  `;
  opts.portal.appendChild(menu);

  // Build menu content
  function buildMenu(): void {
    menu.innerHTML = "";
    activeIndex = -1;

    let flatItems: { el: HTMLElement; item: DropdownItem; index: number }[] = [];

    function renderItem(entry: DropdownEntry, depth = 0): void {
      if (entry.type === "separator") {
        const sep = document.createElement("div");
        sep.className = "dd-separator";
        sep.style.cssText = "height:1px;background:#f0f0f0;margin:4px 8px;";
        sep.setAttribute("role", "separator");
        menu.appendChild(sep);
        return;
      }

      if (entry.type === "group") {
        if (entry.label) {
          const groupLabel = document.createElement("div");
          groupLabel.className = "dd-group-label";
          groupLabel.style.cssText = `
            padding:6px 12px 4px;font-size:11px;font-weight:600;
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

      const item = entry as DropdownItem;
      const itemEl = document.createElement("div");
      itemEl.className = `dd-item ${item.danger ? "dd-danger" : ""} ${item.className ?? ""}`;
      itemEl.setAttribute("role", "menuitem");
      itemEl.setAttribute("tabindex", "-1");
      itemEl.dataset.key = item.key;
      if (item.disabled) itemEl.setAttribute("aria-disabled", "true");

      const idx = flatItems.length;
      flatItems.push({ el: itemEl, item, index: idx });

      itemEl.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:8px 10px;
        cursor:${item.disabled ? "not-allowed" : "pointer"};
        border-radius:4px;transition:background 0.1s;
        color:${item.disabled ? "#d1d5db" : item.danger ? "#dc2626" : "#374151"};
        white-space:nowrap;position:relative;
        ${depth > 0 ? `padding-left:${12 + depth * 16}px;` : ""}
      `;

      // Icon
      if (item.icon) {
        const iconSpan = document.createElement("span");
        iconSpan.className = "dd-icon";
        iconSpan.style.cssText = `flex-shrink:0;width:18px;text-align:center;font-size:14px;`;
        iconSpan.textContent = item.icon;
        itemEl.appendChild(iconSpan);
      } else if (item.checked !== undefined || item.radioGroup) {
        // Checkbox / Radio indicator
        const checkIcon = document.createElement("span");
        checkIcon.className = "dd-check";
        checkIcon.style.cssText = `flex-shrink:0;width:18px;text-align:center;font-size:13px;`;
        checkIcon.textContent = item.checked ? "\u2713" : item.radioGroup ? "\u25CB" : "";
        itemEl.appendChild(checkIcon);
      } else {
        // Spacer for alignment
        const spacer = document.createElement("span");
        spacer.style.cssText = "flex-shrink:0;width:18px;";
        itemEl.appendChild(spacer);
      }

      // Label + description
      const labelArea = document.createElement("span");
      labelArea.style.cssText = "flex:1;min-width:0;display:flex;flex-direction:column;";
      const labelText = document.createElement("span");
      labelText.className = "dd-label";
      labelText.textContent = item.label;
      labelArea.appendChild(labelText);

      if (item.description) {
        const descText = document.createElement("span");
        descText.className = "dd-description";
        descText.style.cssText = "font-size:11px;color:#9ca3af;";
        descText.textContent = item.description;
        labelArea.appendChild(descText);
      }
      itemEl.appendChild(labelArea);

      // Shortcut
      if (item.shortcut) {
        const shortcutEl = document.createElement("span");
        shortcutEl.className = "dd-shortcut";
        shortcutEl.style.cssText = `
          flex-shrink:0;font-size:11px;color:#9ca3af;margin-left:8px;
          font-family:'SF Mono',monospace;
        `;
        shortcutEl.textContent = item.shortcut;
        itemEl.appendChild(shortcutEl);
      }

      // Submenu arrow
      if (item.children?.length) {
        const arrow = document.createElement("span");
        arrow.className = "dd-submenu-arrow";
        arrow.style.cssText = "flex-shrink:0;font-size:10px;color:#9ca3af;";
        arrow.innerHTML = "&#9654;";
        itemEl.appendChild(arrow);
      }

      // Events
      if (!item.disabled) {
        itemEl.addEventListener("mouseenter", () => {
          setActive(idx);
        });
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
    const flat = (menu as any)._flatItems as Array<{ el: HTMLElement; item: DropdownItem; index: number }> | undefined;
    if (!flat) return;

    // Clear previous
    if (activeIndex >= 0 && flat[activeIndex]) {
      flat[activeIndex]!.el.style.background = "";
    }

    activeIndex = idx;
    if (idx >= 0 && flat[idx]) {
      flat[idx]!.el.style.background = "#f3f4f6";
      flat[idx]!.el.scrollIntoView({ block: "nearest" });
    }
  }

  function handleSelect(item: DropdownItem): void {
    if (opts.beforeSelect?.(item) === false) return;

    // Toggle checkbox
    if (item.checked !== undefined) {
      item.checked = !item.checked;
      buildMenu();
    }

    opts.onSelect?.(item);
    if (opts.closeOnSelect) close();
  }

  // Positioning
  function position(): void {
    const triggerRect = triggerEl.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const gap = opts.offset;

    let x: number, y: number;

    switch (opts.placement) {
      case "bottom-start":
        x = triggerRect.left;
        y = triggerRect.bottom + gap;
        break;
      case "bottom":
        x = triggerRect.left + (triggerRect.width - menuRect.width) / 2;
        y = triggerRect.bottom + gap;
        break;
      case "bottom-end":
        x = triggerRect.right - menuRect.width;
        y = triggerRect.bottom + gap;
        break;
      case "top-start":
        x = triggerRect.left;
        y = triggerRect.top - menuRect.height - gap;
        break;
      case "top":
        x = triggerRect.left + (triggerRect.width - menuRect.width) / 2;
        y = triggerRect.top - menuRect.height - gap;
        break;
      case "top-end":
        x = triggerRect.right - menuRect.width;
        y = triggerRect.top - menuRect.height - gap;
        break;
      case "right-start":
        x = triggerRect.right + gap;
        y = triggerRect.top;
        break;
      case "left-start":
        x = triggerRect.left - menuRect.width - gap;
        y = triggerRect.top;
        break;
      default:
        x = triggerRect.left;
        y = triggerRect.bottom + gap;
    }

    // Clamp to viewport
    const margin = 4;
    x = Math.max(margin, Math.min(x, window.innerWidth - menuRect.width - margin));
    y = Math.max(margin, Math.min(y, window.innerHeight - menuRect.height - margin));

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    if (typeof opts.width === "number") {
      menu.style.width = `${opts.width}px`;
    } else if (opts.width === "anchor") {
      menu.style.width = `${triggerRect.width}px`;
    }
  }

  // Open/close
  function doOpen(): void {
    if (isOpen || destroyed) return;
    isOpen = true;
    buildMenu();
    menu.style.display = "block";
    void menu.offsetHeight; // force reflow
    menu.style.opacity = "1";
    menu.style.transform = "scale(1) translateY(0)";
    position();
    opts.onOpen?.();

    // Close other dropdowns on same page
    document.dispatchEvent(new CustomEvent("dropdown-open", { detail: instance }));
  }

  function doClose(): void {
    if (!isOpen) return;
    isOpen = false;
    menu.style.opacity = "0";
    menu.style.transform = "scale(0.96) translateY(-4px)";
    setTimeout(() => {
      if (!isOpen) menu.style.display = "none";
    }, opts.animationDuration);
    opts.onClose?.();
  }

  function open(): void {
    clearTimeout(closeTimer!);
    closeTimer = null;
    if (opts.hoverDelay > 0 && opts.hoverTrigger) {
      openTimer = setTimeout(doOpen, opts.hoverDelay);
    } else {
      doOpen();
    }
  }

  function close(): void {
    clearTimeout(openTimer!);
    openTimer = null;
    if (opts.hoverDelay > 0 && opts.hoverTrigger) {
      closeTimer = setTimeout(doClose, opts.hoverDelay);
    } else {
      doClose();
    }
  }

  function toggle(): void {
    isOpen ? close() : open();
  }

  // Bind triggers
  if (opts.hoverTrigger) {
    triggerEl.addEventListener("mouseenter", open);
    triggerEl.addEventListener("mouseleave", close);
    menu.addEventListener("mouseenter", () => { clearTimeout(closeTimer!); });
    menu.addEventListener("mouseleave", close);
  } else {
    triggerEl.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
  }

  // Close on outside click
  document.addEventListener("mousedown", (e: MouseEvent) => {
    if (
      isOpen &&
      !menu.contains(e.target as Node) &&
      !triggerEl.contains(e.target as Node)
    ) {
      close();
    }
  });

  // Close on escape
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      close();
    }
  });

  // Keyboard navigation within menu
  menu.addEventListener("keydown", (e: KeyboardEvent) => {
    const flat = (menu as any)._flatItems as Array<{ el: HTMLElement; item: DropdownItem; index: number }> | undefined;
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
  window.addEventListener("scroll", () => { if (isOpen) position(); }, true);
  window.addEventListener("resize", () => { if (isOpen) position(); });

  const instance: DropdownInstance = {
    element: menu,

    isOpen() { return isOpen; },

    open,

    close,

    toggle,

    updateItems(items: DropdownEntry[]) {
      currentItems = items;
      if (isOpen) buildMenu();
    },

    destroy() {
      destroyed = true;
      clearTimeout(openTimer!);
      clearTimeout(closeTimer!);
      menu.remove();
    },
  };

  return instance;
}
